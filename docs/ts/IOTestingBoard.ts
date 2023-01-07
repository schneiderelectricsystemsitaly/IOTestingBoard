/**
 *  This module contains the IOTestingBoard object, which provides the main operations for bluetooth module.
 *  It uses the modbus helper functions from senecaModbus / modbusRtu to interact with the meter with SendAndResponse function
 */
import { Command } from './Command'
import { BTApiState } from './APIState'
import log = require('loglevel')
import { CommandType } from './constants'
import { NotificationData } from './NotificationData'

export class IOTestingBoard {
  SendAndResponse: (command: ArrayBuffer) => Promise<ArrayBuffer>
  btState: BTApiState

  constructor (fnSendAndResponse: (command: ArrayBuffer) => Promise<ArrayBuffer>, btApi: BTApiState) {
    this.SendAndResponse = fnSendAndResponse
    this.btState = btApi
  }

  uintToString (dv: DataView) {
    const uint8arr = []
    for (let i = 0; i < dv.byteLength; i++) {
      uint8arr.push(dv.getUint8(i))
    }
    const encodedString = String.fromCharCode.apply(null, uint8arr)
    const decodedString = decodeURIComponent(encodedString)
    return decodedString
  }

  /**
     * Gets the meter serial number
     * @returns {string}
     */
  async getHardwareRevision (): Promise<string> {
    log.debug('\t\tReading HW rev')
    const dv: DataView = await this.btState.charHWRev.readValue()
    return this.uintToString(dv)
  }

  /**
     * Gets the meter serial number
     * @returns {string}
     */
  async getFirmware (): Promise<string> {
    log.debug('\t\tReading firmware version')
    const dv: DataView = await this.btState.charFirmware.readValue()
    return this.uintToString(dv)
  }

  /**
     * Gets the battery level indication
     * @returns {number} percentage (%)
     */
  async getBatteryLevel (): Promise<number> {
    log.debug('\t\tReading battery voltage')
    const dv: DataView = await this.btState.charBattery.readValue()
    return dv.getUint8(0)
  }

  static parseNotification (buf: ArrayBuffer): NotificationData {
    if (buf.byteLength < 11) { return null }

    const output: NotificationData = new NotificationData()
    const dv: DataView = new DataView(buf)
    const status1: number = dv.getUint8(1)
    const status2: number = dv.getUint8(0)

    output.WiFi = (status1 >> 6) & 3
    output.Relay = (status1 >> 4) & 3
    output.Bluetooth = (status1 >> 1) & 7
    output.Error = (status2 & 64) != 0
    output.Frequency = (status2 >> 5) & 3
    output.Verbose = (status2 & 8) != 0
    output.Test = (status2 & 4) != 0
    output.V_with_load = (status2 & 2) != 0
    output.LastResult = (status2 & 1) != 0
    output.Actual_R = dv.getUint16(2, true)
    output.Setpoint_R = dv.getUint16(4, true)
    output.Memfree = dv.getUint32(6, true)
    output.CommandCpt = dv.getUint8(10)

    log.debug('Decoded notification', output)
    return output
  }

  static getPacket (command: Command): ArrayBuffer {
    let buf: ArrayBuffer
    let dv: DataView

    switch (command.type) {
      case CommandType.COMMAND_BREAK:
      case CommandType.COMMAND_DISABLE_WEBREPL:
      case CommandType.COMMAND_DISABLE_WIFI:
      case CommandType.COMMAND_ENABLE_WEBREPL:
      case CommandType.COMMAND_ENABLE_WIFI:
      case CommandType.COMMAND_LIGHT_SLEEP:
      case CommandType.COMMAND_MODE_METER:
      case CommandType.COMMAND_REBOOT:
      case CommandType.COMMAND_REFRESH:
      case CommandType.COMMAND_RUN_TEST:
      case CommandType.COMMAND_R_TEST:
      case CommandType.COMMAND_DEEP_SLEEP:
      case CommandType.COMMAND_CLEAR_FLAGS:
        // No parameter
        buf = new ArrayBuffer(1)
        dv = new DataView(buf)
        dv.setUint8(0, command.type)
        return buf
      case CommandType.COMMAND_CONFIGURE_METER_COMM:
        buf = new ArrayBuffer(1 + 5)
        dv = new DataView(buf)
        dv.setUint8(0, command.type)
        dv.setUint8(1, command.setpoint)
        dv.setUint8(2, command.setpoint2)
        dv.setUint8(3, command.setpoint3)
        dv.setUint16(4, command.setpoint4, true)
        return buf
      case CommandType.COMMAND_SET_CPU:
      case CommandType.COMMAND_SET_INITIAL_COMMAND_SETPOINT:
      case CommandType.COMMAND_SET_INITIAL_COMMAND_TYPE:
        // One Uint8 parameter
        buf = new ArrayBuffer(2)
        dv = new DataView(buf)
        dv.setUint8(0, command.type)
        dv.setUint8(1, command.setpoint)
        return buf
      case CommandType.COMMAND_METER_COMMANDS:
      case CommandType.COMMAND_SET_INITIAL_BLUETOOTH:
      case CommandType.COMMAND_SET_INITIAL_METER_COMM:
      case CommandType.COMMAND_SET_OTA:
      case CommandType.COMMAND_SET_VERBOSE:
      case CommandType.COMMAND_SET_INITIAL_WIFI:
        // One Uint8 parameter with 1 or 0 value
        buf = new ArrayBuffer(2)
        dv = new DataView(buf)
        dv.setUint8(0, command.type)
        dv.setUint8(1, command.setpoint ? 1 : 0)
        return buf
      case CommandType.COMMAND_MODE_RESISTORS:
      case CommandType.COMMAND_MODE_V_LOAD:
      case CommandType.COMMAND_SET_DEEPSLEEP_MIN:
        // One Uint16 R parameter
        buf = new ArrayBuffer(3)
        dv = new DataView(buf)
        dv.setUint8(0, command.type)
        dv.setUint16(1, command.setpoint, true)
        return buf
      case CommandType.COMMAND_SET_BLUETOOTH_NAME:
      case CommandType.COMMAND_SET_WIFI_NETWORK:
      case CommandType.COMMAND_SET_WIFI_PASSWORD:
        // One UTF8 string parameter
        const utf8Encode = new TextEncoder()
        const bytes_utf8 = utf8Encode.encode(command.setpoint)
        buf = new ArrayBuffer(1 + bytes_utf8.length)
        dv = new DataView(buf)
        dv.setUint8(0, command.type)
        var byte_num = 1
        for (const byte_v of bytes_utf8) {
          dv.setUint8(byte_num, byte_v)
          byte_num++
        }
        return buf
      default:
        throw new Error('Invalid command' + command)
    }
  }
}
