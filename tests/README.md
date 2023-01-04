Automated Tester board for the IOTesting board

# Requirements
## Hardware
* ESP32, I used a LOLIN D1 mini
* INA219 chip with I2C interface
## Software
* Same as IOTesterboard board

# Summary
* This board runs a loop of test suites, each one defining test cases with verification criteria. While the test suite is in execution, power consumption is measured by INA219 chip.
* The board talks through bluetooth low energy to the IOTesting board
* After each test suite complete, a report is appended to test_results.txt file on the flash memory
* Test reports contains duration, tests failed, total tests, and power consumption statistics.
