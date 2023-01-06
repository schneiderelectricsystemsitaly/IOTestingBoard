import { BoardMode } from './constants'

/**
 * Current state of the meter
 * */
export class MeterState {
  firmware: string
  serial: string
  mode: number
  setpoint: number
  actual: number
  free_bytes: number
  battery: number
  constructor () {
    this.firmware = '???' // Firmware version
    this.serial = '???' // Serial number
    this.mode = BoardMode.MODE_UNDEFINED
    this.setpoint = 0xFFFF
    this.actual = 0xFFFF
    this.free_bytes = 0
    this.battery = 0
  }
}
