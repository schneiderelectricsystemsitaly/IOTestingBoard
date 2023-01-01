# Test module
# Requires a separate micropython board with bluetooth support
#
# For power measurement:
# - INA219 chip is required, I2C wired to pin 10 (SDA) and 8 (ADC) of testing board
# - INA219 shall be inserted in series with Vcc line to IOTesting board
# - INA219 needs common ground between test board and IOTesting board
#
# Tests to be run can be created in:
# - suites.py (test suites definitions)
# - test.py (list of test suites to be run)
#
# Test.py will run the tests, retrying 3 times in case of bluetooth disconnections.
# Output is a text file generated on the flash memory of the testing device with the following contents:
#
#   (2023, 1, 1, 11, 55, 46, 6, 1) Testsuite [NoWifi CPU default] #iterations [10]
#   Duration: [ 489099 ] ms, Total tests [ 570 , Failures [ 0 ]
#   Device last status:
# 	    {'Test mode': True, 'Bluetooth': 3, 'Wifi': 1, 'Relay': 2, 'R act': 6241, 'Board err': 0, 'Parallel': False, 'Freq': '80 MHz', 'Mem': 47680,
# 	    'Verbose': True, 'Result': True, 'R setpoint': 6250, 'Battery': 100, 'BT test err': 0}
#   Energy details:
# 	    {'1h projected energy (mWh)': 278.9403, 'Timestamp': 674340143, 'Energy (mWh)': 37.88997, 'Total duration (s)': 489.0075,
# 	    'Peak current (mA)': 128.5854, 'Start timestamp': 185332190}
#
# Requirements from micropython-lib
# - aioble
# - uasyncio
# - logging
from .test import main
