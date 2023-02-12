/// <reference types="web-bluetooth" />

/**
 *  Bluetooth handling module, including main state machine loop.
 *  This module interacts with browser for bluetooth comunications and pairing, and with SenecaMSC object.
 */

import { BTApiState } from './APIState'
import { State, BlueToothIOTUUID, ResultCode, CommandType, BoardMode, RelayPosition } from './constants'
import { IOTestingBoard } from './IOTestingBoard'
import { Command } from './Command'
import { buf2hex, sleep as sleep_ms } from './utils'
import log = require('loglevel')
import { NotificationData } from './NotificationData'

export class Driver {
  btState: BTApiState
  iot: IOTestingBoard
  logging: boolean = false
  simulation: boolean = false

  constructor () {
    this.btState = new BTApiState()
    this.iot = new IOTestingBoard(this.SendAndResponse, this.btState)
  }

  /**
     * Send the message using Bluetooth and wait for an answer
     */
  async SendAndResponse (command: ArrayBuffer): Promise<ArrayBuffer | null> {
    if (command == null || this.btState.charWrite == null) { return null }

    log.debug('>> ' + buf2hex(command))

    this.btState.response = null
    this.btState.stats.requests++

    const startTime = new Date().getTime()

    await this.btState.charWrite.writeValueWithoutResponse(command)
    while (this.btState.state == State.METER_INITIALIZING ||
            this.btState.state == State.BUSY) {
      if (this.btState.response != null) break
      await new Promise(resolve => setTimeout(resolve, 35))
    }

    const endTime = new Date().getTime()
    const answer = this.btState.response?.slice(0)

    this.btState.lastMeasure = IOTestingBoard.parseNotification(answer)
    this.btState.response = null

    // Log the packets
    if (this.logging) {
      const packet = { request: buf2hex(command), answer: buf2hex(answer) }
      const storage_value = window.localStorage.getItem('IOTestingTrace')
      let packets = []
      if (storage_value != null) {
        packets = JSON.parse(storage_value) // Restore the json persisted object
      }
      packets.push(JSON.stringify(packet)) // Add the new object
      window.localStorage.setItem('IOTestingTrace', JSON.stringify(packets))
    }

    this.btState.stats.responseTime = Math.round((1.0 * this.btState.stats.responseTime * (this.btState.stats.responses % 500) + (endTime - startTime)) / ((this.btState.stats.responses % 500) + 1))
    this.btState.stats.lastResponseTime = Math.round(endTime - startTime) + ' ms'
    this.btState.stats.responses++
    return answer
  }

  /**
     * Main loop of the meter handler.
     * */
  async stateMachine () {
    let nextAction
    const DELAY_MS = (this.simulation ? 20 : 750) // Update the status every X ms.
    const TIMEOUT_MS = (this.simulation ? 1000 : 30000) // Give up some operations after X ms.
    this.btState.started = true

    log.debug('Current state:' + this.btState.state)

    // Consecutive state counted. Can be used to timeout.
    if (this.btState.state == this.btState.prev_state) {
      this.btState.state_cpt++
    } else {
      this.btState.state_cpt = 0
    }

    // Stop request from API
    if (this.btState.stopRequest) {
      this.btState.state = State.STOPPING
    }

    log.debug('\State:' + this.btState.state)
    switch (this.btState.state) {
      case State.NOT_CONNECTED: // initial state on Start()
        if (this.simulation) {
          nextAction = this.fakePairDevice.bind(this)
        } else {
          nextAction = this.btPairDevice.bind(this)
        }
        break
      case State.CONNECTING: // waiting for connection to complete
        nextAction = undefined
        break
      case State.DEVICE_PAIRED: // connection complete, acquire meter state
        if (this.simulation) {
          nextAction = this.fakeSubscribe.bind(this)
        } else {
          nextAction = this.btSubscribe.bind(this)
        }
        break
      case State.SUBSCRIBING: // waiting for Bluetooth interfaces
        nextAction = undefined
        if (this.btState.state_cpt > (TIMEOUT_MS / DELAY_MS)) {
          // Timeout, try to resubscribe
          log.warn('Timeout in SUBSCRIBING')
          this.btState.state = State.DEVICE_PAIRED
          this.btState.state_cpt = 0
        }
        break
      case State.METER_INIT: // ready to communicate, acquire meter status
        nextAction = this.meterInit.bind(this)
        break
      case State.METER_INITIALIZING: // reading the meter status
        if (this.btState.state_cpt > (TIMEOUT_MS / DELAY_MS)) {
          log.warn('Timeout in METER_INITIALIZING')
          // Timeout, try to resubscribe
          if (this.simulation) {
            nextAction = this.fakeSubscribe.bind(this)
          } else {
            nextAction = this.btSubscribe.bind(this)
          }
          this.btState.state_cpt = 0
        }
        nextAction = undefined
        break
      case State.IDLE: // ready to process commands from API
        if (this.btState.command != null) { nextAction = this.processCommand.bind(this) } else {
          nextAction = this.refresh.bind(this)
        }
        break
      case State.ERROR: // anytime an error happens
        nextAction = this.disconnect.bind(this)
        break
      case State.BUSY: // while a command in going on
        if (this.btState.state_cpt > (TIMEOUT_MS / DELAY_MS)) {
          log.warn('Timeout in BUSY')
          // Timeout, try to resubscribe
          if (this.simulation) {
            nextAction = this.fakeSubscribe.bind(this)
          } else {
            nextAction = this.btSubscribe.bind(this)
          }
          this.btState.state_cpt = 0
        }
        nextAction = undefined
        break
      case State.STOPPING:
        nextAction = this.disconnect.bind(this)
        break
      case State.STOPPED: // after a disconnector or Stop() request, stops the state machine.
        nextAction = undefined
        break
      default:
        break
    }

    this.btState.prev_state = this.btState.state

    if (nextAction != undefined) {
      log.debug('\tExecuting:' + nextAction.name)
      try {
        await nextAction()
      } catch (e) {
        log.error('Exception in state machine', e)
      }
    }
    if (this.btState.state != State.STOPPED) {
      void sleep_ms(DELAY_MS).then(async () => { await this.stateMachine() }) // Recheck status in DELAY_MS ms
    } else {
      log.debug('\tTerminating State machine')
      this.btState.started = false
    }
  }

  /**
     * Called from state machine to execute a single command from btState.command property
     * */
  async processCommand () {
    try {
      let response
      const command = this.btState.command

      if (command == null) {
        return
      }
      this.btState.state = State.BUSY
      this.btState.stats.commands++

      log.info('\t\tExecuting command :' + command)

      const packet_clear = IOTestingBoard.getPacket(Command.CreateNoSP(CommandType.COMMAND_CLEAR_FLAGS))
      const packet = IOTestingBoard.getPacket(command)
      const packets: ArrayBuffer[] = [packet_clear, packet]

      for (const msg of packets) {
        const currentCpt = this.btState.lastMeasure != null ? this.btState.lastMeasure.CommandCpt : -1
        do {
          response = await this.SendAndResponse(msg)
        }
        while (currentCpt == this.btState.lastMeasure?.CommandCpt)
        // Board is incrementing the counter every time it processes one command
      }

      // Last error flag
      command.error = !this.btState.lastMeasure.LastResult

      // Caller expects a valid property in GetState() once command is executed.
      log.debug('\t\tRefreshing current state')
      await this.refresh()

      command.pending = false
      this.btState.command = null

      this.btState.state = State.IDLE
      log.debug('\t\tCompleted command executed')
    } catch (err) {
      log.error('** error while executing command: ' + err)
      this.btState.state = State.METER_INIT
      this.btState.stats.exceptions++
    }
  }

  /**
     * Acquire the current mode and serial number of the device.
     * */
  async meterInit () {
    try {
      this.btState.state = State.METER_INITIALIZING
      this.btState.meter.hw_rev = await this.iot.getHardwareRevision()
      log.info('\t\tSerial number:' + this.btState.meter.hw_rev)
      this.btState.meter.firmware = await this.iot.getFirmware()
      log.info('\t\tSerial number:' + this.btState.meter.firmware)

      this.btState.meter.battery = await this.iot.getBatteryLevel()
      log.debug('\t\tBattery (%):' + this.btState.meter.battery)

      this.btState.state = State.IDLE
    } catch (err) {
      log.warn('Error while initializing meter :' + err)
      this.btState.stats.exceptions++
      this.btState.state = State.DEVICE_PAIRED
    }
  }

  /*
    * Close the bluetooth interface (unpair)
    * */
  async disconnect () {
    this.btState.command = null
    await this.btState.reset(this.onDisconnected.bind(this))
    this.btState.state = State.STOPPED
  }

  /**
     * Event called by browser BT api when the device disconnect
     * */
  async onDisconnected () {
    log.warn('* GATT Server disconnected event, will try to reconnect *')
    await this.btState.reset()
    this.btState.stats['GATT disconnects']++
    this.btState.state = State.DEVICE_PAIRED // Try to auto-reconnect the interfaces without pairing
  }

  /**
     * Joins the arguments into a single buffer
     * @returns {ArrayBuffer} concatenated buffer
     */
  arrayBufferConcat (buffer1: ArrayBuffer, buffer2: Buffer): ArrayBuffer {
    let length = 0
    let buffer: Buffer

    for (var i in arguments) {
      buffer = arguments[i]
      if (buffer) { length += buffer.byteLength }
    }

    const joined = new Uint8Array(length)
    let offset = 0

    for (i in arguments) {
      buffer = arguments[i]
      joined.set(new Uint8Array(buffer), offset)
      offset += buffer.byteLength
    }

    return joined.buffer
  }

  /**
     * Event called by bluetooth characteristics when receiving data
     * @param {any} event
     */
  handleNotifications (event: any) {
    const value = event.target.value
    if (value != null) {
      log.debug('<< ' + buf2hex(value.buffer))
      this.btState.response = value.buffer.slice(0)
    }
  }

  /**
     * This function will succeed only if called as a consequence of a user-gesture
     * E.g. button click. This is due to BlueTooth API security model.
     * */
  async btPairDevice () {
    this.btState.state = State.CONNECTING
    const forceSelection = this.btState.options.forceDeviceSelection
    log.debug('btPairDevice(' + forceSelection + ')')
    try {
      if (typeof (navigator.bluetooth?.getAvailability) === 'function') {
        const availability = await navigator.bluetooth.getAvailability()
        if (!availability) {
          log.error('Bluetooth not available in browser.')
          throw new Error('Browser does not provide bluetooth')
        }
      }
      let device: BluetoothDevice | null = null

      // Do we already have permission?
      if (typeof (navigator.bluetooth?.getDevices) === 'function' &&
                !forceSelection) {
        const availableDevices = await navigator.bluetooth.getDevices()
        availableDevices.forEach(function (dev, index) {
          log.debug('Found authorized device :' + dev.name)
          device = dev
        })
        log.debug('navigator.bluetooth.getDevices()=' + device)
      }
      // If not, request from user
      if (device == null) {
        device = await navigator.bluetooth
          .requestDevice({
            acceptAllDevices: false,
            filters: [{ services: [BlueToothIOTUUID.ServiceUuid.toLowerCase()] }],
            optionalServices: ['battery_service', 'generic_access', 'device_information', BlueToothIOTUUID.ServiceUuid.toLowerCase()]
          })
      }
      this.btState.btDevice = device
      this.btState.state = State.DEVICE_PAIRED
      log.info('Bluetooth device ' + device.name + ' connected.')
      await sleep_ms(500)
    } catch (err) {
      log.warn('** error while connecting: ' + err.message)
      await this.btState.reset(this.onDisconnected.bind(this))
      this.btState.state = State.ERROR
      this.btState.stats.exceptions++
    }
  }

  async fakePairDevice () {
    this.btState.state = State.CONNECTING
    const forceSelection = this.btState.options.forceDeviceSelection
    log.debug('fakePairDevice(' + forceSelection + ')')
    try {
      const device = {
        name: 'FakeBTDevice',
        gatt: { connected: true, device: null, connect: null, disconnect: null, getPrimaryService: null, getPrimaryServices: null },
        id: '1',
        forget: null,
        watchAdvertisements: null,
        watchingAdvertisements: null,
        addEventListener: null,
        removeEventListener: null,
        dispatchEvent: null,
        onadvertisementreceived: null,
        ongattserverdisconnected: null,
        oncharacteristicvaluechanged: null,
        onserviceadded: null,
        onserviceremoved: null,
        onservicechanged: null
      }
      this.btState.btDevice = device
      this.btState.state = State.DEVICE_PAIRED
      log.info('Bluetooth device ' + device.name + ' connected.')
      await sleep_ms(50)
    } catch (err) {
      log.warn('** error while connecting: ' + err.message)
      await this.btState.reset()
      this.btState.stats.exceptions++
    }
  }

  /**
     * Once the device is available, initialize the service and the 2 characteristics needed.
     * */
  async btSubscribe () {
    try {
      this.btState.state = State.SUBSCRIBING
      this.btState.stats.subcribes++
      const device = this.btState.btDevice
      const gattserver: BluetoothRemoteGATTServer | null = null

      if (device && device.gatt) {
        if (!device.gatt.connected || this.btState.btGATTServer == null) {
          log.debug(`Connecting to GATT Server on ${device.name}...`)
          device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this))
          this.btState.btGATTServer = await device.gatt.connect()
          log.debug('> Found GATT server')
        } else {
          log.debug('GATT already connected')
        }
      } else {
        await this.btState.reset(this.onDisconnected.bind(this))
        this.btState.btDevice = null
        this.btState.state = State.NOT_CONNECTED
        this.btState.stats.exceptions++
        return
      }

      this.btState.btIOTService = await this.btState.btGATTServer.getPrimaryService(BlueToothIOTUUID.ServiceUuid)
      log.debug('> Found IOTesting board service')

      this.btState.charWrite = await this.btState.btIOTService.getCharacteristic(BlueToothIOTUUID.CommandCharUuid)
      log.debug('> Found command characteristic')

      this.btState.charRead = await this.btState.btIOTService.getCharacteristic(BlueToothIOTUUID.StatusCharUuid)
      log.debug('> Found notifications characteristic')

      this.btState.btDeviceInfoService = await this.btState.btGATTServer.getPrimaryService('device_information')
      log.debug('> Found device information service')
      this.btState.charFirmware = await this.btState.btDeviceInfoService.getCharacteristic(0x2A26)
      this.btState.charHWRev = await this.btState.btDeviceInfoService.getCharacteristic(0x2a27)

      this.btState.btBatteryService = await this.btState.btGATTServer.getPrimaryService('battery_service')
      log.debug('> Found battery service')
      this.btState.charBattery = await this.btState.btBatteryService.getCharacteristic(0x2A19)

      this.btState.response = null
      this.btState.charRead.addEventListener('characteristicvaluechanged', this.handleNotifications.bind(this))
      log.debug('> Starting notifications...')
      await this.btState.charRead.startNotifications()

      log.info('> Bluetooth interfaces ready.')

      this.btState.stats.last_connect = new Date().toISOString()
      await sleep_ms(50)
      this.btState.state = State.METER_INIT
    } catch (err) {
      log.warn('** error while subscribing: ' + err.message)
      await this.btState.reset()
      this.btState.state = State.DEVICE_PAIRED
      this.btState.stats.exceptions++
    }
  }

  async fakeSubscribe () {
    try {
      this.btState.state = State.SUBSCRIBING
      this.btState.stats.subcribes++
      const device = this.btState.btDevice

      if (!device?.gatt?.connected) {
        log.debug(`Connecting to GATT Server on ${device?.name}...`)
        log.debug('> Found GATT server')
      }

      log.debug('> Found Serial service')
      log.debug('> Found write characteristic')
      log.debug('> Found read characteristic')
      this.btState.response = null
      log.info('> Bluetooth interfaces ready.')
      this.btState.stats.last_connect = new Date().toISOString()
      await sleep_ms(10)
      this.btState.state = State.METER_INIT
    } catch (err) {
      log.warn('** error while subscribing: ' + err.message)
      await this.btState.reset(this.onDisconnected.bind(this))
      this.btState.state = State.DEVICE_PAIRED
      this.btState.stats.exceptions++
    }
  }

  /**
     * When idle, this function is called
     * */
  async refresh () {
    this.btState.state = State.BUSY
    try {
      log.debug('\t\tFinished refreshing current state')
      if (this.btState.response) {
        this.btState.lastMeasure = IOTestingBoard.parseNotification(this.btState.response)
        this.btState.response = null
      }
      if (this.btState.lastMeasure != null) {
        this.btState.meter.actual = this.btState.lastMeasure.Actual_R
        this.btState.meter.setpoint = this.btState.lastMeasure.Setpoint_R
        // Read randomly once every 20 loops
        if (Math.random() > 0.95) { this.btState.meter.battery = await this.iot.getBatteryLevel() }
        if (this.btState.lastMeasure.Test) {
          this.btState.meter.mode = BoardMode.MODE_TEST
        } else if (this.btState.lastMeasure.Relay == RelayPosition.POS_METER) {
          this.btState.meter.mode = BoardMode.MODE_METER
        } else if (this.btState.lastMeasure.Relay == RelayPosition.POS_RESISTOR) {
          if (this.btState.lastMeasure.V_with_load) {
            this.btState.meter.mode = BoardMode.MODE_V_WITH_LOAD
          } else {
            this.btState.meter.mode = BoardMode.MODE_RESISTOR
          }
        } else {
          this.btState.meter.mode = BoardMode.MODE_UNDEFINED
        }
        this.btState.meter.free_bytes = this.btState.lastMeasure.Memfree
      }
      this.btState.state = State.IDLE
    } catch (err) {
      log.warn('Error while refreshing measure' + err)
      this.btState.state = State.DEVICE_PAIRED
      this.btState.stats.exceptions++
    }
  }

  SetSimulation (value) {
    this.simulation = value
  }
}
