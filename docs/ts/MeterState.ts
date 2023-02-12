import { BoardMode } from './constants'

/**
 * Current state of the meter
 * */
export class MeterState {
  firmware: string
  hw_rev: string
  mode: number
  setpoint: number
  actual: number
  free_bytes: number
  battery: number
  ip_address: string
  constructor () {
    this.firmware = '???'
    this.hw_rev = '???'
    this.ip_address = '???'
    this.mode = BoardMode.MODE_UNDEFINED
    this.setpoint = -1
    this.actual = -1
    this.free_bytes = 0
    this.battery = 0
  }
}
