import { CommandType } from './constants'

/**
 * Command to the meter, may include setpoint
 * */
export class Command {
  type: number
  setpoint: any
  setpoint3: any
  setpoint4: any
  error: boolean
  pending: boolean
  request: ArrayBuffer | null
  response: ArrayBuffer | null
  setpoint2: any
  /**
     * Creates a new command
     * @param {CommandType} ctype
     */
  constructor (ctype: any) {
    this.type = parseInt(ctype)
    this.setpoint = null
    this.setpoint = null
    this.setpoint3 = null
    this.setpoint4 = null
    this.error = false
    this.pending = true
    this.request = null
    this.response = null
  }

  static CreateNoSP (ctype): Command {
    const cmd: Command = new Command(ctype)
    return cmd
  }

  static CreateOneSP (ctype, setpoint): Command {
    const cmd: Command = new Command(ctype)
    cmd.setpoint = setpoint
    return cmd
  }

  static CreateFourSP (ctype, set1, set2, set3, set4): Command {
    const cmd: Command = new Command(ctype)
    cmd.setpoint = set1
    cmd.setpoint2 = set2
    cmd.setpoint3 = set3
    cmd.setpoint4 = set4
    return cmd
  }

  toString (): string {
    return 'Type: ' + this.type + ', setpoint:' + this.setpoint + ', setpoint2: ' + this.setpoint2 + ', pending:' + this.pending + ', error:' + this.error
  }

  /**
     * Gets the default setpoint for this command type
     * @returns {Object} setpoint(s) expected
     */
  defaultSetpoint (): Object {
    switch (this.type) {
      case CommandType.COMMAND_ENABLE_WIFI:
        return {}
      case CommandType.COMMAND_DISABLE_WIFI:
        return {}
      case CommandType.COMMAND_ENABLE_WEBREPL:
        return {}
      case CommandType.COMMAND_DISABLE_WEBREPL:
        return {}
      case CommandType.COMMAND_BREAK:
        return {}
      case CommandType.COMMAND_MODE_METER:
        return {}
      case CommandType.COMMAND_MODE_RESISTORS:
        return { 'Resistance (ohms)': 0xFFFF }
      case CommandType.COMMAND_MODE_V_LOAD:
        return { 'Load (ohms)': 550 }
      case CommandType.COMMAND_REBOOT:
        return {}
      case CommandType.COMMAND_RUN_TEST:
        return {}
      case CommandType.COMMAND_LIGHT_SLEEP:
        return {}
      case CommandType.COMMAND_DEEP_SLEEP:
        return {}
      case CommandType.COMMAND_METER_COMMANDS:
        return { Enable: true }
      case CommandType.COMMAND_SET_INITIAL_METER_COMM:
        return { Enable: true }
      case CommandType.COMMAND_SET_WIFI_NETWORK:
        return { SSID: '' }
      case CommandType.COMMAND_SET_WIFI_PASSWORD:
        return { Password: '' }
      case CommandType.COMMAND_SET_INITIAL_BLUETOOTH:
        return { Enable: true }
      case CommandType.COMMAND_SET_INITIAL_WIFI:
        return { Enable: true }
      case CommandType.COMMAND_SET_DEEPSLEEP_MIN:
        return { 'Delay (min)': 15 }
      case CommandType.COMMAND_SET_VERBOSE:
        return { Enable: true }
      case CommandType.COMMAND_SET_INITIAL_COMMAND_TYPE:
        return { 'Command type(1/2/3)': 1 }
      case CommandType.COMMAND_SET_INITIAL_COMMAND_SETPOINT:
        return { 'Setpoint (ohms)': 0xFFFF }
      case CommandType.COMMAND_R_TEST:
        return {}
      case CommandType.COMMAND_SET_CPU:
        return { 'Frequency (MHz: 1->80, 2->160, 3->240)': 1 }
      case CommandType.COMMAND_SET_OTA:
        return { Enable: true }
      case CommandType.COMMAND_CONFIGURE_METER_COMM:
        return { Index: 0, 'Voltage (V)': 8, 'Command type (1/2/3)': 2, 'Setpoint (ohms)': 1100 }
      case CommandType.COMMAND_SET_BLUETOOTH_NAME:
        return { 'Device name': 'IOTesting board' }
      case CommandType.COMMAND_REFRESH:
        return {}
      default:
        return {}
    }
  }
}
