Automated Tester board for the IOTesting board

# Summary
* This board runs a loop of test suites, each one defining test cases with verification criteria. While the test suite is in execution, power consumption is measured by dedicated chip.
* The board talks through bluetooth low energy to the IOTesting board
* After each test suite complete, a report is appended to test_results.txt file on the flash memory
* Test reports contains duration, tests failed, total tests, and power consumption statistics.
* Test report file shall be deleted after a while, it will fill the flash memory in approx 24 hours.

# Requirements

## Hardware
* I used a LOLIN C3 mini with standard firmware from Micropython (ESP32C3, not the LOLIN version)
* INA219 chip with I2C interface (this chip measures both current and voltage allowing power measurements)
* The device under test is powered by USB plug sourced through the INA219 measuring chip.

## Software
* Same requirements as IOTesterboard board (Micropython 1.19.1)

## Schematics
* Not available but straightforward. See breadboard below.

# Results

* Bluetooth stability testing
* Power consumption in various modes (see test results), for one hour period:

## Barebones testing with release 0.0.70

- 215 mWh for D32 board alone @80 Mhz
- 300 mWh for D32 board alone @240 MHz 

## Full assembled PCB testing with release 0.0.70

- 275 mWh @ 80 Mhz running fast tests, no Wi-Fi. Slow testing (1 signal per minute approx) gives the same consumption so added bluetooth traffic impact is negligible.
- 359 mWh @ 240 MHz running tests, no Wi-Fi
- 400 mWh @ 240 MHz running tests, with Wi-Fi

## Autonomy with LiIon 7.4 Wh battery

- Expected >28 hours with standard settings.


