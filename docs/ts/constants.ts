/**
 * Commands recognized by IOTesting Board module
 * */
export const CommandType = {
  NONE_UNKNOWN: 0,
  COMMAND_ENABLE_WIFI: 0x01,
  COMMAND_DISABLE_WIFI: 0x02,
  COMMAND_ENABLE_WEBREPL: 0x03,
  COMMAND_DISABLE_WEBREPL: 0x04,
  COMMAND_BREAK: 0x05,
  COMMAND_MODE_METER: 0x06,
  COMMAND_MODE_RESISTORS: 0x07,
  COMMAND_MODE_V_LOAD: 0x08,
  COMMAND_REBOOT: 0x09,
  COMMAND_RUN_TEST: 0x0A,
  COMMAND_LIGHT_SLEEP: 0x0B,
  COMMAND_DEEP_SLEEP: 0x0C,
  COMMAND_METER_COMMANDS: 0x0D,
  COMMAND_SET_INITIAL_METER_COMM: 0x0E,
  COMMAND_SET_WIFI_NETWORK: 0x0F,
  COMMAND_SET_WIFI_PASSWORD: 0x10,
  COMMAND_SET_INITIAL_BLUETOOTH: 0x11,
  COMMAND_SET_INITIAL_WIFI: 0x12,
  COMMAND_SET_DEEPSLEEP_MIN: 0x13,
  COMMAND_SET_VERBOSE: 0x14,
  COMMAND_SET_INITIAL_COMMAND_TYPE: 0x15,
  COMMAND_SET_INITIAL_COMMAND_SETPOINT: 0x16,
  COMMAND_R_TEST: 0x17,
  COMMAND_SET_CPU: 0x18,
  COMMAND_SET_OTA: 0x19,
  COMMAND_CONFIGURE_METER_COMM: 0x20,
  COMMAND_SET_BLUETOOTH_NAME: 0x21,
  COMMAND_REFRESH: 0x22
}

export const BoardMode = {
  MODE_UNDEFINED: 0,
  MODE_METER: 1,
  MODE_RESISTOR: 2,
  MODE_V_WITH_LOAD: 3,
  MODE_TEST: 4
}

/*
 * Internal state machine descriptions
 */
export const State = {
  NOT_CONNECTED: 'Not connected',
  CONNECTING: 'Bluetooth device pairing...',
  DEVICE_PAIRED: 'Device paired',
  SUBSCRIBING: 'Bluetooth interfaces connecting...',
  IDLE: 'Idle',
  BUSY: 'Busy',
  ERROR: 'Error',
  STOPPING: 'Closing BT interfaces...',
  STOPPED: 'Stopped',
  METER_INIT: 'Meter connected',
  METER_INITIALIZING: 'Reading board state...'
}

export const ResultCode = {
  FAILED_NO_RETRY: 1,
  FAILED_SHOULD_RETRY: 2,
  SUCCESS: 0
}

export const MAX_U_GEN = 27.0 // maximum voltage

/*
 * Bluetooth constants
 */
export const BlueToothIOTUUID = {
  ServiceUuid: '0003cdd5-0000-1000-8000-00805f9b0131', // bluetooth for IOTesting board
  StatusCharUuid: '0003cdd3-0000-1000-8000-00805f9b0131', // status, broadcasted every 5s max
  CommandCharUuid: '0003cdd4-0000-1000-8000-00805f9b0131' // commands to the board
}
