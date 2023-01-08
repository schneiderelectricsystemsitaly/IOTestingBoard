# IOTestingBoard
* MicroPython project for smart boards extending the features of calibrators during automation projects IO testing phase.
* This repository includes both SW and HW information to make the following handheld tool:
![image](https://user-images.githubusercontent.com/6236243/211174052-dccd6331-ea85-4593-b69f-b58484b4cd02.png)

* During the I-O testing, an additional meter or generator will be required, therefore this board is designed to work together with a calibrator connected to the INPUT terminals. OUTPUT terminals are connected to electrical pannel. There are 3 different working modes:
* ![Modes (1)](https://user-images.githubusercontent.com/6236243/210256338-45ba53c8-014f-437a-9ad8-10c911cf99e3.png)

# Requirements

## Hardware requirements
* ESP32 board with Micropython 1.19, I used LOLIN D32 (see https://www.wemos.cc/en/latest/d32/d32.html)
* PCB with other components for R generation (see below for hardware folder and BOM)
* 3.7V Li-Ion battery (7.4 Wh gives >20 hours autonomy), power consumption approx 300 mWh when active
* Hammond Manufacturing 1553C enclosure, 4 female 4mm banana plugs
![board assembly](https://user-images.githubusercontent.com/6236243/210255944-00ad9902-d084-4316-a0a8-11a4b11ba48b.png)

## Firmware requirements
* Micropython 1.19 (used v1.19.1 for ESP32 standard firmware from https://micropython.org/download/esp32/ )
* uasyncio v3, from REPL:

```shell
upip.install('micropython-uasyncio')
```

* aioble (copied manually from micropython-lib / bluetooth)
* ota_update (forked from https://github.com/rdehuyss/micropython-ota-updater with bugfix for semantic versioning comparison bug)

## Development environment
* Python 3.8
* Pycharms Community Edition (https://www.jetbrains.com/pycharm/ )
* Micropython plugin for PyCharms, add the latest stubs from Micropython 1.19 on ESP32 as follows:

```shell
pip install micropython-esp32-stubs
```
** See also https://themachineshop.uk/getting-started-with-the-pi-pico-and-pycharm/

* Thonny IDE is also helpful for file management ( https://thonny.org/ )
* Ampy installed for batch file copy from command line

```shell
pip install adafruit-ampy
```
* Espressif esptool for firmware download to the board

```shell
pip install esptool
```

# Usage
## Demo page
* A WebBluetooth-based javascript client is available here: https://pbrunot.github.io/IOTestingBoard/iotesting.html
* This page implements most of the commands available below.
* I found that the Bluetooth in browsers is sometimes very buggy (random GATT errors), depending on the Windows machine or Bluetooth driver version. It is usually very stable on Android with Chrome, on Windows your mileage may vary. It has not been tested with other platforms.

## Bluetooth interface 📶
* The following commands are exposed through bluetooth 

| Command description | Command byte | Arguments | Notes |
|---|---|---|---|
| ENABLE_WIFI | 1 | None | Activates the wifi interface, sets CPU to 160 MHz |
| DISABLE_WIFI | 2 | None | Disables the wifi interface, sets CPU back to 80 Mhz |
| ENABLE_WEBREPL | 3 | None | Starts WEB REPL daemon, sets CPU to 240 MHz Wifi will be enabled automatically if not running. |
| DISABLE_WEBREPL | 4 | None | Disables the WEB REPL daemon |
| BREAK | 5 | None | Interrupts the main program |
| MODE_METER | 6 | None | Bypass mode, input terminals are connected to output terminals |
| MODE_RESISTORS | 7 | uint16 LE, R value | The required R value is generated accross output terminals Input terminals are isolated |
| MODE_V_LOAD | 8 | uint16 LE, R value | The required R value is generated accroos output terminals. Input terminals are paralled to output terminals. |
| REBOOT | 9 | None | Resets the ESP32 processor |
| RUN_TEST | 0xA | None | Iterates through R values from 0 to 11000 ohms every .5s in alternative modes (resistors , v_load) |
| LIGHT_SLEEP | 0xB | None | Puts the ESP32 into light-sleep mode. Wake-up by timer (duration configured in SET_DEEPSLEEP_MIN) or key press |
| DEEP_SLEEP | 0xC | None | Puts the ESP32 into deep-sleep mode. Wake-up by key-press only. |
| METER_COMMANDS | 0xD | uint8, 0/1 | Allows the board to take commands from a voltage level in input. Thresholds set by CONFIGURE_METER_COMM. Not persisted |
| SET_INITIAL_METER_COMM | 0xE | uint8, 0/1 | Defines the status of meter commands after boot (persisted) |
| SET_WIFI_NETWORK | 0xF | utf8 string | Sets the SSID for Wi-Fi network to connect (persisted) |
| SET_WIFI_PASSWORD | 0x10 | utf8 string | Sets the Password for Wi-Fi network to connect (persisted) |
| SET_INITIAL_BLUETOOTH | 0x11 | uint8, 0/1  | Defines if the board shall enable bluetooth at boot time (persisted) |
| SET_INITIAL_WIFI | 0x12 | uint8, 0/1  | Defines if the board shall enable Wi-Fi at boot time (persisted) |
| SET_DEEPSLEEP_MIN | 0x13 | uint8, 0-255 | Defines the auto-power off delay in minutes (persisted, default 15) |
| SET_VERBOSE | 0x14 | uint8, 0/1 | Sets the logging level on the UART/USB internal port |
| SET_INITIAL_TYPE | 0x15 | uint8, see command types | Defines the initial command after boot (persisted) |
| SET_INITIAL_SETPOINT | 0x16 | uint16 LE, R value | Defines the initial command setpoint after boot (persisted) |
| R_TEST | 0x17 | None | For internal testing only, generates R values |
| SET_CPU | 0x18 | uint8, 0/1/2 | Sets the frequency of the CPU to 0:80MHz, 1:160MHz, 2:240MHz with immediate effect |
| SET_OTA | 0x19 | uint8, 0/1 | Allows over-the-air update from github repository (persisted). SET_INITIAL_WIFI must be enabled too. |
| CONFIGURE_METER_COMM | 0x20 | * uint8: 0-15 index<br/>* uint8: 0-24 voltage<br/>* uint8: command type<br/>* uint16 LE: R value | Sets the threshold #idx: if Volts value is read and METER_COMMANDS are enabled, executes command with the setpoint |
| BLUETOOTH_NAME | 0x21 | utf8 string | Sets the bluetooth broadcast name (persisted). Requires reboot. |
| REFRESH | 0x22 | None | Requests immediate notification packet |
| CLEAR_FLAGS | 0x23 | None | Resets the error flags. |

## Commands by generator
* When the board is RESISTORS mode AND commands by meter are enabled (see COMMAND_METER_COMMANDS, COMMAND_SET_INITIAL_METER_COMM), it will interpret voltage accross input terminals as commands.
* The default values for the thresholds are as follows:

| Threshold | Voltage (V) | Command | Notes |
|---|---|---|---|
| 0 | 8 | Resistor, 1k | -
| 1 | 10 | Resistor, 4k69 | -
| 2 | 12 | Resistor, 7k18 | -
| 3 | 14 | Resistor, 11k | -
| 4 | 16 | Resistor, short | Actual value <40 ohms
| 5 | 18 | Resistor, open | Actual value >50Mohms
| 6 | 20 | Voltmeter with load of 550 | User will need to press back the switch button to allow other commands
| 7 | 22 | Bypass mode | User will need to press back the switch button to allow other commands

* Up to 16 thresholds are supported, but the minimum voltage is 3V and the maximum voltage allowed is 27 V. 
* ADC resolution of ESP32 is poor and not linear, especially with low values ; readings are rounded to nearest integer voltage.
* Order of thresholds does not matter.
* This sense circuit uses a voltage divider circuit, adding 158 kohms accross input terminals (when in resistors/V with load modes).

## Command types
* The following command types uint8 are recognized

| Command type | Description |
|---|---|
| 1 | bypass mode (input terminals directly connected to output terminals) |
| 2 | resistor mode (input terminals isolated, R value accross output terminals) |
| 3 | V with load (input terminals paralled to R value accross output terminals) |
| 4 | test mode (alternates resistor and V with load modes, with stepped R values) |

## Manual switching
* User can switch betweem modes by pressing a button above the "METER" engraving on the front pannel
* Short press : switch to bypass mode if in (resistors, V with load) mode or to resistors modes if in bypass mode
* Long press : switch to bypass mode if in (resistors, V with load) mode or to V with load modes if in bypass mode

## Notifications details
* If bluetooth is active, three services are exposed

| Service UUID | Description | Characteristics exposed |
|---|---|---|
| 0003cdd5-0000-1000-8000-00805f9b0131 | Service for commands and status | *status* (0003cdd3-0000-1000-8000-00805f9b0131)<br/> *commands* (0003cdd4-0000-1000-8000-00805f9b0131) |
| battery_status | Battery status | Battery level in % (0x2a19) |
| device_info | General information about the device (FW, HW versions...) | *model number* (0x2a24) <br/> *serial number* (0x2a25) <br/> *firmware version* (0x2a26) <br/> *hardware revision* (0x2a27) <br/> *manufacturer name* (0x2a29) |

* The notification by status characteristics are 11 bytes as follows:

| Byte # | Bits | Description | Format |
|---|---|---|---|
| 1 | 2-4 | Bluetooth status | 0-unknown, 1-disabled, 2-enabled, 3-enabled with active clients, 4- enabling, 5- disabling |
| 1 | 5-6 | Wifi state | 0-unknown, 1-disabled, 2-enabled, 3-enabling |
| 1 | 7-8 | Relay position | 0-unknown, 1-bypass, 2-resistors (or V with load depending on byte 2.2) |
| 2 | 1 | Last command result | 0- error, 1- success |
| 2 | 2 | Voltmeter with load configuration | 0- not active, 1- active |
| 2 | 3 | Test mode active | 0-not active, 1- active |
| 2 | 4 | VERBOSE active (Serial UART) | 0-not active, 1- active |
! 2 | 5-6 | Frequency of the CPU | 0-80 MHz, 1-160 MHz, 2-240 MHz |
| 2 | 7 | Hardware error present | 0-none, 1-error |
| 3-4 | - | Actual Resistance in ohms | uint16 little indian, special value 65535 - Open (>30Mohms) |
| 5-6 | - | Setpoint Resistance in ohms | uint16 little indian, special value 65535 - Open (>30Mohms), 65534 - Maximum generable ohm value |
| 7-10 | - | Free memory in bytes | uint32 little indian. Should be >20.000 |
| 11 | - | Bluetooth commands counter | uint8. Incremented by each command received via Bluetooth |

Bytes and bits are counted starting from 1.
Hardware errors are failures from ESP32 to drive an output to the required value e.g. due to shorts.

# Special
## OTA support
* Device will download latest release from this repository if Wi-Fi and OTA flags are enabled. Updates are applied during boot only.

# Board documentation
## Project
* Detailed schematics, BOM and Gerber files available under hardware project
* The central part is a microcontroller (ESP32) which governs a bi-stable 2PDT relay for mode selection and optocouplers for resistors insertion across output terminals. The ESP32 is used on a board which provides LiPo battery charging and monitoring. ESP32 is a SoC with on-board Wi-Fi and Bluetooth Low Energy and was chosen for these interfaces and wide spread support in embedded software development environments.
* Built prototype schematics
![image](https://user-images.githubusercontent.com/6236243/210256914-f06c1552-8281-4c98-953b-4c414ac4f003.png)


## Resistors generation
* The R value is generated by the means of 7 resistors and one optional serie resistor.
* The 7 resistors can be put in parallel in an arbitrary combinations, to generate more values.
* Based on required R setpoint, the ESP32 finds the closest matching R value from the possible combinations of parallel and serie resistor. The error of generation is dependent on how far are the closest feasible R value and the setpoint. Resistors are 1% tolerance on the board.
* The resistors values have been chosen to cover a reasonable range from 0 to 11 kohms.
![image](https://user-images.githubusercontent.com/6236243/210255596-882d2aab-c2c9-45ee-8964-70c46afd3d21.png)
* With the following resistors soldered on board: 0, 220, 1k, 2k22, 5k55, 7k5, 8k22, 11k, r_series = 2k55 and r_opto=33 (typ.), the list of generable R values is : 33, 187, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 201, 202, 203, 204, 205, 206, 207, 208, 209, 211, 212, 215, 218, 219, 221, 222, 223, 224, 225, 226, 227, 229, 230, 231, 234, 236, 238, 240, 241, 242, 243, 244, 245, 248, 250, 254, 547, 572, 582, 585, 600, 610, 614, 625, 631, 642, 646, 659, 677, 682, 696, 702, 738, 746, 762, 768, 794, 813, 821, 840, 851, 872, 880, 904, 941, 951, 978, 1057, 1066, 1162, 1203, 1219, 1289, 1342, 1363, 1420, 1451, 1516, 1542, 1619, 1747, 1782, 1882, 1935, 2255, 2331, 2507, 2550, 2581, 2704, 2707, 2708, 2709, 2710, 2711, 2712, 2713, 2714, 2715, 2716, 2718, 2719, 2720, 2721, 2722, 2723, 2724, 2725, 2726, 2728, 2729, 2732, 2735, 2736, 2738, 2739, 2740, 2741, 2742, 2743, 2744, 2746, 2747, 2748, 2751, 2753, 2755, 2757, 2758, 2759, 2760, 2761, 2762, 2765, 2767, 2771, 2926, 3064, 3089, 3099, 3102, 3117, 3127, 3131, 3142, 3148, 3159, 3163, 3176, 3194, 3199, 3213, 3219, 3223, 3255, 3263, 3279, 3285, 3311, 3330, 3338, 3346, 3357, 3368, 3389, 3397, 3421, 3458, 3468, 3495, 3574, 3583, 3679, 3720, 3724, 3736, 3806, 3859, 3880, 3937, 3956, 3968, 4033, 4059, 4136, 4264, 4299, 4399, 4452, 4497, 4744, 4772, 4848, 5024, 5098, 5443, 5583, 5740, 5863, 6241, 6473, 7014, 7261, 7535, 8100, 8258, 10052, 10775, 11060, 13577

# TODO
## Planned
* Pogo pin to simplify contact with terminal boards
* Surface Mounted Components design instead of through hole assembly
## Not planned
* Encryption on flash
