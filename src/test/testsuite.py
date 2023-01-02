import test.boardbtcfg as boardbtcfg
from test.testcase import TestCase
from micropython import const


class TestSuite:
    # minimum free memory on testing board
    MIN_MEMORY = const(25000)
    R_OPEN = const(0xFFFF)
    R_MAX = const(0xFFFE)

    def __init__(self, description, nb_iter=1, pm=None):
        self.nb_iter = nb_iter
        self.pm = pm
        self.description = description
        self.stats = {'total': 0, 'failures': 0, 'start': 0, 'failed_tc': []}

    def __str__(self):
        return f'Testsuite [{self.description}] #iterations [{self.nb_iter}]'

    @classmethod
    def make_array(cls, command, setpoint=None, setpoint_bytes=1):
        ret_val = int(command).to_bytes(1, 'little')
        if setpoint is not None:
            ret_val += setpoint.to_bytes(setpoint_bytes, 'little')
        return ret_val

    @staticmethod
    def add_base_tests(test_list):

        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_METER), TestCase.chk_relay, 1))

        for r in range(0, 11000, 500):
            test_list.append(
                TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_RESISTORS, r, 2), TestCase.chk_setpoint, r))
        test_list.append(
            TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_RESISTORS, TestSuite.R_OPEN, 2), TestCase.chk_setpoint, TestSuite.R_OPEN))
        test_list.append(
            TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_RESISTORS, TestSuite.R_MAX, 2), TestCase.chk_setpoint, TestSuite.R_MAX))

        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_METER), TestCase.chk_relay, 1))

        for r in range(0, 11000, 500):
            test_list.append(
                TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_V_LOAD, r, 2), TestCase.chk_setpoint, r))
        test_list.append(
            TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_V_LOAD, TestSuite.R_OPEN, 2), TestCase.chk_setpoint, TestSuite.R_OPEN))
        test_list.append(
            TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_V_LOAD, TestSuite.R_MAX, 2), TestCase.chk_setpoint, TestSuite.R_MAX))

        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_METER), TestCase.chk_relay, 1))

        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_VERBOSE, 1, 1), TestCase.chk_result))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_RUN_TEST), TestCase.chk_result, delay_ms=15000))
        # Check free memory at the end of the test
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_VERBOSE, 0, 1), TestCase.chk_memory, TestSuite.MIN_MEMORY))