import gc

from . import boardbtcfg
from .testcase import TestCase
from micropython import const


class TestSuite:
    # minimum free memory on testing board
    MIN_MEMORY_WIFI = const(20000)
    R_OPEN = const(0xFFFF)
    R_MAX = const(0xFFFE)
    MIN_LOAD = const(600)

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
    def shuffle(ls: list) -> list:
        last_index = len(ls) - 1
        import urandom as random
        while last_index > 0:
            rand_index = random.randint(0, last_index)
            ls[last_index], ls[rand_index] = ls[rand_index], ls[last_index]
            last_index -= 1
        gc.collect()
        return ls

    @staticmethod
    def add_base_tests(test_list, additional_delay_ms=0):

        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_METER),
                                  TestCase.chk_relay, 1, delay_ms=additional_delay_ms))

        for r in range(0, 12000, 250):
            if 0 < r < TestSuite.MIN_LOAD:
                r = TestSuite.MIN_LOAD

            test_list.append(
                TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_RESISTORS, r, 2), TestCase.chk_setpoint, r,
                         delay_ms=additional_delay_ms))

        test_list.append(
            TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_RESISTORS, TestSuite.R_OPEN, 2),
                     TestCase.chk_setpoint, TestSuite.R_OPEN, delay_ms=additional_delay_ms))
        test_list.append(
            TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_RESISTORS, TestSuite.R_MAX, 2),
                     TestCase.chk_setpoint, TestSuite.R_MAX, delay_ms=additional_delay_ms))

        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_METER),
                                  TestCase.chk_relay, 1, delay_ms=additional_delay_ms))

        for r in range(0, 12000, 250):
            if 0 < r < TestSuite.MIN_LOAD:
                r = TestSuite.MIN_LOAD

            test_list.append(
                TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_V_LOAD, r, 2),
                         TestCase.chk_setpoint, r, delay_ms=additional_delay_ms))
        test_list.append(
            TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_V_LOAD, TestSuite.R_OPEN, 2),
                     TestCase.chk_setpoint, TestSuite.R_OPEN, delay_ms=additional_delay_ms))
        test_list.append(
            TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_V_LOAD, TestSuite.R_MAX, 2),
                     TestCase.chk_setpoint, TestSuite.R_MAX, delay_ms=additional_delay_ms))

        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_METER),
                                  TestCase.chk_relay, 1, delay_ms=additional_delay_ms))

        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_VERBOSE, 1, 1), TestCase.chk_result))

        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_RUN_TEST),
                                  TestCase.chk_result, delay_ms=additional_delay_ms))
