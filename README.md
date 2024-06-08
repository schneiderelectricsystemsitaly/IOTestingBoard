# IOTestingBoard
* MicroPython project for smart boards extending the features of calibrators during automation projects IO testing phase.
* This repository includes both SW and HW information to make the following handheld tool:
![image](https://user-images.githubusercontent.com/6236243/211174052-dccd6331-ea85-4593-b69f-b58484b4cd02.png)

* During the I-O testing, an additional meter or generator will be required, therefore this board is designed to work together with a calibrator connected to the INPUT terminals. OUTPUT terminals are connected to electrical pannel. There are 3 different working modes:
* ![Modes (1)](https://user-images.githubusercontent.com/6236243/210256338-45ba53c8-014f-437a-9ad8-10c911cf99e3.png)

# Requirements

## Hardware requirements

* ESP32 board with Micropython 1.20, I used LOLIN D32 (see https://www.wemos.cc/
en/latest/d32/d32.html). Chip must have >= 4 MB Flash.
* PCB with other components for R generation (see below for hardware folder and BOM)
* 3.7V Li-Ion battery (7.4 Wh gives >20 hours autonomy), power consumption approx 300 mWh when active
* Hammond Manufacturing 1553C enclosure, 4 female 4mm banana plugs
![board assembly](https://user-images.githubusercontent.com/6236243/210255944-00ad9902-d084-4316-a0a8-11a4b11ba48b.png)

## Firmware requirements

* Micropython 1.20 (ESP32 standard firmware from https://micropython.org/download/esp32/ )

* aioble (can be installed to the lib folder of the flash memory using MPREMOTE tool)

```shell
mpremote connect COMx mip install aioble
```

* ota_update (forked from https://github.com/rdehuyss/micropython-ota-updater with bugfix for semantic versioning comparison bug)

* to setup a new board from scratch, restore a BIN image from fw_img, then proceed to OTA upgrade.

* Alternative setup, flash micropython on ESP32, connect board to WiFim then:

```python
import mip
mip.install("github:schneiderelectricsystemsitaly/IOTestingBoard/package.json")
```

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

| Threshold | Voltage (V) | Command | Notes                                                                     |
|---|---|---|---------------------------------------------------------------------------|
| 0 | 3 | Resistor, 1k | -                                                                         |
| 1 | 4 | Resistor, 4k69 | -                                                                         |
| 2 | 5 | Resistor, 7k18 | -                                                                         |
| 3 | 6 | Resistor, 11k | -                                                                         |
| 4 | 7 | Resistor, short | Actual value <40 ohms                                                     |
| 5 | 8 | Resistor, open | Actual value >50Mohms                                                     |
| 6 | 9 | Voltmeter + load 550 ohms | Generator will be shortly put in parallel with the load.                  |
| 7 | 12 | Bypass mode | User will need to press again the switch button, to allow other commands  |

* Up to 16 thresholds are supported, but the minimum voltage is 3V and the maximum voltage allowed is 20 V (ADC range limitation) 
* ADC resolution of ESP32 is poor and not linear, especially with low values ; readings are rounded to nearest integer voltage.
* Order of thresholds does not matter.
* The voltage sensing circuit uses a voltage divider, adding 158 kohms accross input terminals (when in resistors/V with load modes).
* When in voltmeter with load, the voltmeter used shall not generate tension >3V across 158kohms internal resistor, otherwise it will be interpreted as a command. In such voltmeter is needed, disable meter commands and use only bluetooth interface.

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

| Service UUID | Description | Characteristic (UUID) R/N/W attributes |
|---|---|---|
| 0003cdd5-0000-1000-8000-00805f9b0131 | Service for commands and status | *status* (0003cdd3-0000-1000-8000-00805f9b0131) N<br/> *commands* (0003cdd4-0000-1000-8000-00805f9b0131) W,N |
| battery_status | Battery status | *Battery level in %(0-100)* (0x2a19) R,N |
| device_information | General information about the device (FW, HW versions...) | *model number* (0x2a24) R <br/> *serial number* (0x2a25) R<br/> *firmware version* (0x2a26) R<br/> *hardware revision* (0x2a27) R<br/> *manufacturer name* (0x2a29) R|

R=Read, N=Notify, W=Write

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
| 2 | 5-6 | Frequency of the CPU | 0-80 MHz, 1-160 MHz, 2-240 MHz |
| 2 | 7 | Hardware error present | 0-none, 1-error |
| 3-4 | - | Actual Resistance in ohms | uint16 little indian, special value 65535 - Open (>30Mohms) |
| 5-6 | - | Setpoint Resistance in ohms | uint16 little indian, special value 65535 - Open (>30Mohms), 65534 - Maximum generable ohm value |
| 7-10 | - | Free memory in bytes | uint32 little indian. Should be >20.000 |
| 11 | - | Bluetooth commands counter | uint8. Incremented by each command received via Bluetooth |

Bytes and bits are counted starting from 1.
Hardware errors are failures from ESP32 to drive an output to the required value e.g. due to shorts.

* Notifications frequency
1. The status notification is sent *at least* every 5 seconds, or as board status changes (e.g. after button press or command execution)
2. The battery notification is sent every 30s
3. The device is enforcing a minimum delay of 50 milliseconds between notifications to avoid overloading its bluetooth chip.        

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
* The R value is generated by the means of 8 resistors and one optional serie resistor. The 8 resistors can be put in parallel in an arbitrary combinations, to generate more values.
* A minimum R value of 500 ohms is enforced by software to avoid high power flow in the circuit. This corresponds to approx. 1.1 W for a 24V DO module @ 50 mA.
* Short circuit is generable with a dedicated relay due to potential high currents (use R setpoint = 0).
* Based on required R setpoint, the ESP32 finds the closest matching R value from the possible combinations of parallel and serie resistor. The error of generation is dependent on how far are the closest feasible R value and the setpoint. Resistors are 1% tolerance on the board.
* The resistors values have been chosen to cover a reasonable range from 0 to 11 kohms. Distribution of obtainable values as follows:

![image](https://user-images.githubusercontent.com/6236243/212550348-4d5769c2-65e7-47a4-b253-f4d4112018e5.png)


* With the following resistors soldered on board (500, 1k, 2k2, 5k49, 7k49, 8k2, 11k, 22k) the following values can be obtained: *254, 257, 260, 262, 263, 265, 266, 269, 270, 272, 273, 275, 276, 279, 280, 282, 283, 286, 287, 289, 290, 293, 294, 297, 298, 301, 302, 305, 306, 309, 310, 311, 313, 314, 315, 318, 319, 323, 324, 327, 328, 329, 332, 334, 337, 339, 342, 344, 348, 349, 350, 354, 355, 359, 361, 365, 367, 371, 373, 377, 378, 379, 384, 386, 391, 392, 393, 398, 399, 405, 407, 412, 414, 420, 422, 428, 430, 435, 436, 438, 439, 444, 445, 447, 448, 453, 454, 456, 463, 466, 472, 473, 476, 483, 494* (software blocked), 505, 512, 524, 537, 546, 549, 550, 560, 563, 564, 574, 578, 579, 588, 589, 593, 594, 604, 605, 609, 611, 621, 622, 627, 639, 640, 645, 658, 659, 662, 664, 678, 683, 699, 705, 720, 723, 726, 728, 744, 751, 752, 770, 777, 779, 796, 798, 806, 807, 826, 827, 835, 838, 858, 860, 868, 893, 894, 904, 929, 932, 942, 970, 986, 1015, 1033, 1064, 1083, 1120, 1135, 1139, 1180, 1197, 1199, 1246, 1265, 1268, 1315, 1322, 1342, 1345, 1399, 1402, 1426, 1433, 1494, 1498, 1525, 1603, 1607, 1637, 1723, 1734, 1754, 1769, 1870, 1907, 2042, 2086, 2228, 2252, 2287, 2305, 2480, 2553, 2563, 2791, 2804, 2807, 2810, 2812, 2813, 2815, 2816, 2819, 2820, 2822, 2823, 2825, 2826, 2829, 2830, 2832, 2833, 2836, 2837, 2839, 2840, 2843, 2844, 2847, 2848, 2851, 2852, 2855, 2856, 2859, 2860, 2861, 2863, 2864, 2865, 2868, 2869, 2873, 2874, 2877, 2878, 2879, 2882, 2884, 2885, 2887, 2889, 2892, 2894, 2898, 2899, 2900, 2902, 2904, 2905, 2909, 2911, 2915, 2917, 2921, 2923, 2927, 2928, 2929, 2934, 2936, 2941, 2942, 2943, 2948, 2949, 2955, 2957, 2962, 2964, 2970, 2972, 2978, 2980, 2985, 2986, 2988, 2989, 2994, 2995, 2997, 2998, 3003, 3004, 3006, 3013, 3016, 3022, 3023, 3026, 3033, 3044, 3055, 3062, 3074, 3087, 3096, 3099, 3100, 3110, 3113, 3114, 3124, 3128, 3129, 3138, 3139, 3143, 3144, 3154, 3155, 3159, 3161, 3163, 3171, 3172, 3177, 3189, 3190, 3195, 3199, 3208, 3209, 3212, 3214, 3228, 3233, 3249, 3255, 3270, 3273, 3276, 3278, 3294, 3301, 3302, 3320, 3322, 3327, 3329, 3339, 3346, 3348, 3356, 3357, 3376, 3377, 3385, 3388, 3408, 3410, 3418, 3443, 3444, 3454, 3479, 3482, 3492, 3520, 3536, 3565, 3583, 3614, 3633, 3670, 3685, 3689, 3697, 3717, 3730, 3747, 3749, 3796, 3815, 3818, 3865, 3872, 3885, 3892, 3895, 3938, 3949, 3952, 3976, 3983, 4044, 4048, 4075, 4153, 4157, 4187, 4273, 4284, 4304, 4319, 4420, 4435, 4457, 4476, 4592, 4636, 4721, 4778, 4802, 4837, 4855, 5030, 5103, 5113, 5341, 5435, 5452, 5560, 5606, 5713, 5749, 5872, 5889, 5997, 6247, 6267, 6435, 6488, 6985, 7026, 7271, 7338, 7532, 8110, 8156, 8255, 8547, 9888, 10082, 10805, 11030, 13580, 21925, 24475

# TODO / IDEAS
* Document source code structure
* To test the main board I used a testing board with separate hardware, not documented, source under src\test
* Pogo pin to simplify contact with terminal boards
* Surface Mounted Components design instead of through hole assembly ?
* Auto-reset commands after a while ?
* Better input protection to handle 230 V ?
* Encryption on flash (not planned)
