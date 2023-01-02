from . import boardbtcfg
from .testcase import TestCase
from .testsuite import TestSuite


class TestSuiteReboot(TestSuite):
    def get_testcases(self):
        test_list = []
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_DEEPSLEEP_MIN, 15, 2), TestCase.chk_result, True,
                                  delay_ms=500))  # deepsleep 15 minutes
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_INITIAL_COMMAND_TYPE, 1, 1), TestCase.chk_result, True,
                                  delay_ms=500))  # set bypass
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_INITIAL_COMMAND_SETPOINT, 0xFFFF, 2), TestCase.chk_result, True,
                                  delay_ms=500))  # set open setpoint
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_METER_COMMANDS, 1, 1), TestCase.chk_result, True,
                                  delay_ms=500))  # enable commands from meter in Rsetpoint mode

        # test configuration of thresholds
        commands = [(0, 8, 2, 1000), (0, 0, 0, 0), (0, 8, 2, 1100)]
        for comm in commands:
            idx = comm[0]
            volt = comm[1]
            ctype = comm[2]
            setpoint = comm[3]

            arr = int(boardbtcfg.COMMAND_CONFIGURE_METER_COMM).to_bytes(1, 'little')
            arr += idx.to_bytes(1, 'little')
            arr += volt.to_bytes(1, 'little')
            arr += ctype.to_bytes(1, 'little')
            arr += setpoint.to_bytes(2, 'little')

            test_list.append(TestCase(arr, TestCase.chk_result, True, delay_ms=500))

        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_REBOOT), delay_ms=20000))

        return test_list


class TestSuiteNoWifi80(TestSuite):

    def get_testcases(self):
        test_list = []
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_DISABLE_WIFI), TestCase.chk_wifi, 1, 30000))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_DISABLE_WEBREPL)))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_INITIAL_WIFI, 0, 1)))
        self.add_base_tests(test_list)

        return test_list


class TestSuiteNoWifiCpu240(TestSuite):

    def get_testcases(self):
        test_list = []
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_DISABLE_WIFI), TestCase.chk_wifi, 1, 30000))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_DISABLE_WEBREPL)))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_INITIAL_WIFI, 0, 1)))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_CPU, 2, 1)))

        self.add_base_tests(test_list)

        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_CPU, 0, 1)))
        return test_list


class TestSuiteNoWifiCpu160(TestSuite):

    def get_testcases(self):
        test_list = []
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_DISABLE_WIFI), TestCase.chk_wifi, 1, 30000))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_DISABLE_WEBREPL)))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_INITIAL_WIFI, 0, 1)))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_CPU, 1, 1)))

        self.add_base_tests(test_list)

        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_CPU, 0, 1)))
        return test_list


class TestSuiteWifi(TestSuite):

    def get_testcases(self):
        test_list = []
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_ENABLE_WIFI), TestCase.chk_wifi, 2, 30000))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_DISABLE_WEBREPL)))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_INITIAL_WIFI, 1, 1)))
        self.add_base_tests(test_list)

        return test_list


class TestSuiteWifiREPL(TestSuite):

    def get_testcases(self):
        test_list = []
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_ENABLE_WIFI), TestCase.chk_wifi, 2, 30000))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_ENABLE_WEBREPL), TestCase.chk_wifi, 2, 30000))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_INITIAL_WIFI, 1, 1)))

        self.add_base_tests(test_list)

        return test_list


class TestSuiteBTCommands(TestSuite):

    def get_testcases(self):
        test_list = []
        values = ((0, '80 MHz'), (1, '160 MHz'), (2, '240 MHz'))
        for kv in values:
            test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_CPU, kv[0], 1), TestCase.chk_freq, kv[1], delay_ms = 1000))

        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_R_TEST, 1, 1), delay_ms=5000))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_R_TEST, 0, 1), delay_ms=5000))

        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_OTA, 1, 1), delay_ms=1000))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_OTA, 0, 1), delay_ms=1000))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_INITIAL_BLUETOOTH, 1, 1)))

        return test_list
