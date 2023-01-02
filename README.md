# IOTestingBoard
Python project for smart boards extending the features of calibrators during automation projects IO testing phase.

# Requirements
## Hardware
* ESP32 board with Micropython 1.19 (I used LOLIN D32 https://www.wemos.cc/en/latest/d32/d32.html)
* PCB with other components for R generation (see hardware folder and BOM)
## Software
* Micropython 1.19
* uasyncio
* aioble (bluetooth low energy)
## IDE
* Pycharms with Micropython plugin
* pip install micropython-esp32-stubs
* Thonny IDE is also helpful for file management

# Usage
## Bluetooth interface
* The following commands are exposed through bluetooth 

| Command description | Command byte | Arguments | Notes |
|---|---|---|---|
| COMMAND_ENABLE_WIFI | 1 | None | Activates the wifi interface, sets CPU to 160 MHz |
| COMMAND_DISABLE_WIFI | 2 | None | Disables the wifi interface, sets CPU back to 80 Mhz |
| COMMAND_ENABLE_WEBREPL | 3 | None | Starts WEB REPL daemon, sets CPU to 240 MHz Wifi will be enabled automatically if not running. |
| COMMAND_DISABLE_WEBREPL | 4 | None | Disables the WEB REPL daemon |
| COMMAND_BREAK | 5 | None | Interrupts the main program |
| COMMAND_MODE_METER | 6 | None | Bypass mode, input terminals are connected to output terminals |
| COMMAND_MODE_RESISTORS | 7 | uint16 LE, R value | The required R value is generated accross output terminals Input terminals are isolated |
| COMMAND_MODE_V_LOAD | 8 | uint16 LE, R value | The required R value is generated accroos output terminals. Input terminals are paralled to output terminals. |
| COMMAND_REBOOT | 9 | None | Resets the ESP32 processor |
| COMMAND_RUN_TEST | 0xA | None | Iterates through R values from 0 to 11000 ohms every .5s in alternative modes (resistors , v_load) |
| COMMAND_LIGHT_SLEEP | 0xB | None | Puts the ESP32 into light-sleep mode. Wake-up by timer (duration configured in COMMAND_SET_DEEPSLEEP_MIN) or key press |
| COMMAND_DEEP_SLEEP | 0xC | None | Puts the ESP32 into deep-sleep mode. Wake-up by key-press only. |
| COMMAND_METER_COMMANDS | 0xD | uint8, 0/1 | Allows the board to take commands from a voltage level in input. Thresholds set by COMMAND_CONFIGURE_METER_COMM. Not persisted |
| COMMAND_SET_INITIAL_METER_COMM | 0xE | uint8, 0/1 | Defines the status of meter commands after boot (persisted) |
| COMMAND_SET_WIFI_NETWORK | 0xF | utf8 string | Sets the SSID for Wi-Fi network to connect (persisted) |
| COMMAND_SET_WIFI_PASSWORD | 0x10 | utf8 string | Sets the Password for Wi-Fi network to connect (persisted) |
| COMMAND_SET_INITIAL_BLUETOOTH | 0x11 | uint8, 0/1  | Defines if the board shall enable bluetooth at boot time (persisted) |
| COMMAND_SET_INITIAL_WIFI | 0x12 | uint8, 0/1  | Defines if the board shall enable Wi-Fi at boot time (persisted) |
| COMMAND_SET_DEEPSLEEP_MIN | 0x13 | uint8, 0-255 | Defines the auto-power off delay in minutes (persisted, default 15) |
| COMMAND_SET_VERBOSE | 0x14 | uint8, 0/1 | Sets the logging level on the UART/USB internal port |
| COMMAND_SET_INITIAL_COMMAND_TYPE | 0x15 | uint8, see command types | Defines the initial command after boot (persisted) |
| COMMAND_SET_INITIAL_COMMAND_SETPOINT | 0x16 | uint16 LE, R value | Defines the initial command setpoint after boot (persisted) |
| COMMAND_R_TEST | 0x17 | None | For internal testing only, generates R values |
| COMMAND_SET_CPU | 0x18 | uint8, 0/1/2 | Sets the frequency of the CPU to 0:80MHz, 1:160MHz, 2:240MHz |
| COMMAND_SET_OTA | 0x19 | uint8, 0/1 | Allows over-the-air update from github repository (persisted). COMMAND_SET_INITIAL_WIFI must be enabled too. |
| COMMAND_CONFIGURE_METER_COMM | 0x19 | uint8: 0-15 index, uint8: 0-24 voltage, uint8: command type, uint16 LE: R value | Sets the threshold #idx: if Volts value is read and METER_COMMANDS are enabled, executes command with the setpoint |

## Commands by generator
* When the board is RESISTORS mode AND commands by meter are enabled (see COMMAND_METER_COMMANDS, COMMAND_SET_INITIAL_METER_COMM), it will interpret voltage accross input terminals as commands. The default values for the thresholds are as follows:

| Threshold | Voltage (V) | Command | Notes |
|---|---|---|---|
| 0 | 8 | Resistor, 1k1 |
| 0 | 10 | Resistor, 4k69 |
| 0 | 12 | Resistor, 7k18 |
| 0 | 14 | Resistor, 11k |
| 0 | 16 | Resistor, short | Actual value <40 ohms
| 0 | 18 | Resistor, open | Actual value >50Mohms
| 0 | 20 | Voltmeter with load of 550 | User will need to press back the switch button to allow other commands
| 0 | 22 | Bypass mode | User will need to press back the switch button to allow other commands

## Manual switching

# Special
## OTA support
* Device will download latest release from this repository if Wi-Fi and OTA flags are enabled. Updates are applied during boot only.

# TODO
## Planned
* Pogo pin to simplify contact with terminal boards
## Not planned
* Encryption on flash
