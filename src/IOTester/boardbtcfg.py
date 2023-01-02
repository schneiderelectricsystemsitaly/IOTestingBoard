from bluetooth import UUID
from micropython import const

MODBUS_SERVICE_UUID = UUID('0003cdd5-0000-1000-8000-00805f9b0131')
BOARD_STATUS_UUID = UUID('0003cdd3-0000-1000-8000-00805f9b0131')
BOARD_COMMAND_UUID = UUID('0003cdd4-0000-1000-8000-00805f9b0131')

BATTERY_SERVICE_UUID = UUID(0x180F)
BATTERY_CHAR_UUID = UUID(0x2A19)

GENERIC_REMOTE_CONTROL = const(384)
DEVICE_NAME = "IOTesting board"
ADV_INTERVAL_MS = 300_000  # https://www.beaconzone.co.uk/ibeaconadvertisinginterval

COMMAND_ENABLE_WIFI = const(0x01)
COMMAND_DISABLE_WIFI = const(0x02)
COMMAND_ENABLE_WEBREPL = const(0x03)
COMMAND_DISABLE_WEBREPL = const(0x04)
COMMAND_BREAK = const(0x05)
COMMAND_MODE_METER = const(0x06)
COMMAND_MODE_RESISTORS = const(0x07)  # + Little-indian unsigned int (2 bytes length)
COMMAND_MODE_V_LOAD = const(0x08)  # + Little-indian unsigned int (2 bytes length)
COMMAND_REBOOT = const(0x09)
COMMAND_RUN_TEST = const(0x0A)
COMMAND_LIGHT_SLEEP = const(0x0B)
COMMAND_DEEP_SLEEP = const(0x0C)
COMMAND_METER_COMMANDS = const(0x0D)  # + 1 byte false(0) / true (!=0)
COMMAND_SET_INITIAL_METER_COMM = const(0x0E)  # + 1 byte false(0) / true (!=0)
COMMAND_SET_WIFI_NETWORK = const(0x0F)  # + UTF-8 string
COMMAND_SET_WIFI_PASSWORD = const(0x10)  # + UTF-8 string
COMMAND_SET_INITIAL_BLUETOOTH = const(0x11)  # + 1 byte false(0) / true (!=0)
COMMAND_SET_INITIAL_WIFI = const(0x12)  # + 1 byte false(0) / true (!=0)
COMMAND_SET_DEEPSLEEP_MIN = const(0x13)  # + minutes as Little-indian unsigned int (2 bytes length)
COMMAND_SET_VERBOSE = const(0x14)  # + 1 byte false(0) / true (!=0)
COMMAND_SET_INITIAL_COMMAND_TYPE = const(0x15)  # + 1 byte command type enum value
COMMAND_SET_INITIAL_COMMAND_SETPOINT = const(0x16)  # + 2 bytes little-indian unsigned int
COMMAND_R_TEST = const(0x17)
COMMAND_SET_CPU = const(0x18)  # + 1 byte (0-80 MHz 1-160 MHz 2- 240 MHz)
COMMAND_SET_OTA = const(0x19)  # + 1 byte false(0) / true (!=0)
# + 1 byte idx (0-16) + 1 byte Voltage (0-24V) + 1 byte command type + 2 bytes value (little indian unsigned)
COMMAND_CONFIGURE_METER_COMM = const(0x20)
