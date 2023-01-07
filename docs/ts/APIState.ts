import { MeterState } from './MeterState'
import { Command } from './Command'
import { State } from './constants'
import { NotificationData } from './NotificationData'
import log = require('loglevel')

// Current state of the bluetooth
export class BTApiState {
  state: string = State.NOT_CONNECTED
  prev_state: string = State.NOT_CONNECTED
  state_cpt: number = 0
  started: boolean = false
  stopRequest: boolean = false
  lastMeasure: NotificationData = new NotificationData()
  meter: MeterState = new MeterState()
  command: Command = null
  response: ArrayBuffer = null

  btDevice: BluetoothDevice = null
  btGATTServer: BluetoothRemoteGATTServer = null

  btIOTService: BluetoothRemoteGATTService = null
  charRead: BluetoothRemoteGATTCharacteristic = null
  charWrite: BluetoothRemoteGATTCharacteristic = null

  btDeviceInfoService: BluetoothRemoteGATTService = null
  charHWRev: BluetoothRemoteGATTCharacteristic = null
  charFirmware: BluetoothRemoteGATTCharacteristic = null

  btBatteryService: BluetoothRemoteGATTService = null
  charBattery: BluetoothRemoteGATTCharacteristic = null

  stats: { requests: number, responses: number, modbus_errors: number, 'GATT disconnects': number, exceptions: number, subcribes: number, commands: number, responseTime: number, lastResponseTime: string, last_connect: string }
  options: { forceDeviceSelection: boolean }

  constructor () {
    // general statistics for debugging
    this.stats = {
      requests: 0,
      responses: 0,
      modbus_errors: 0,
      'GATT disconnects': 0,
      exceptions: 0,
      subcribes: 0,
      commands: 0,
      responseTime: 0.0,
      lastResponseTime: '? ms',
      last_connect: new Date(2020, 1, 1).toISOString()
    }

    this.options = {
      forceDeviceSelection: true
    }
  }

  async reset (onDisconnectEvent: EventListenerOrEventListenerObject | null = null): Promise<void> {
    if (this.charRead != null) {
      try {
        if (this.btDevice?.gatt?.connected) {
          await this.charRead.stopNotifications()
        }
      } catch (error) { }
    }

    if (this.btDevice != null) {
      try {
        if (this.btDevice?.gatt?.connected) {
          log.warn('* Calling disconnect on btdevice')
          // Avoid the event firing which may lead to auto-reconnect
          this.btDevice.removeEventListener('gattserverdisconnected', onDisconnectEvent)
          this.btDevice.gatt.disconnect()
        }
      } catch (error) { }
    }

    this.btGATTServer = null
    this.charBattery = null
    this.charFirmware = null
    this.charRead = null
    this.charHWRev = null
    this.charWrite = null
  }
}
