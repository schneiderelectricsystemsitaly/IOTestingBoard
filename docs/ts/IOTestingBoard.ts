/**
 *  This module contains the IOTestingBoard object, which provides the main operations for bluetooth module.
 *  It uses the modbus helper functions from senecaModbus / modbusRtu to interact with the meter with SendAndResponse function
 */
import { Command } from './Command'
import { BTApiState } from './APIState'
import log = require('loglevel')

export class IOTestingBoard {
  SendAndResponse: (command: ArrayBuffer) => Promise<ArrayBuffer>
  btState: BTApiState

  constructor (fnSendAndResponse: (command: ArrayBuffer) => Promise<ArrayBuffer>, btApi: BTApiState) {
    this.SendAndResponse = fnSendAndResponse
    this.btState = btApi
  }

  async execute (cmd: Command): Promise<ArrayBuffer | null> {
    if (cmd == null) { return null }

    const packet = cmd.getPacket()
    return await this.SendAndResponse(packet)
  }

  uintToString (uintArray) {
    const encodedString = String.fromCharCode.apply(null, uintArray)
    const decodedString = decodeURIComponent(encodedString)
    return decodedString
  }

  /**
     * Gets the meter serial number
     * @returns {string}
     */
  async getSerialNumber (): Promise<string> {
    log.debug('\t\tReading serial number')
    /*const dv: DataView = await this.btState.charSerial.readValue()
    return this.uintToString(dv)*/
    return "???"
  }

  /**
     * Gets the battery level indication
     * @returns {number} percentage (%)
     */
  async getBatteryLevel (): Promise<number> {
    log.debug('\t\tReading battery voltage')
    /*const dv: DataView = await this.btState.charBattery.readValue()
    return dv.getUint8(0)*/
    return 100
  }

  parseNotification (notification: ArrayBuffer) {
    return {}
  }
}
