import time

import uasyncio as asyncio

from .bluetoothclient import BluetoothClient
from .test import DELAY_BETWEEN_COMMANDS
from .testcase import TestCase
from .testsuite import TestSuite
from .test import STOP_FLAG
from .logger import Logger


class BoardTester:
    def __init__(self, bt_client: BluetoothClient):
        self.bt_client = bt_client
        self.test_total = 0
        self.test_failures = 0
        self.status = {}
        self.running = False

    def get_status_str(self):
        if self.bt_client.connection is None:
            return "Connecting..."
        elif self.running:
            return "Running"
        else:
            return "Connected, not running"

    async def start(self, test_suites):
        while not STOP_FLAG:
            if not await self.bt_client.connect():
                raise Exception("Cannot connect")
            t2 = asyncio.create_task(self.run_suites(test_suites))
            try:
                await asyncio.gather(t2)
            except Exception as e:
                print('start', repr(e))
            finally:
                self.running = False

    def parse_status(self, packet: bytearray):
        if packet is None or len(packet) < 12:
            return None
        wifi_state = (packet[0] >> 6) & 3
        relay_position = (packet[0] >> 4) & 3
        bluetooth_state = (packet[0] >> 1) & 7
        freq = (packet[1] >> 5) & 3

        if freq == 1:
            freq = "80 MHz"
        elif freq == 2:
            freq = "160 MHz"
        elif freq == 3:
            freq = "240 MHz"
        else:
            freq = f'? {freq}'

        verbose = (packet[1] & 8) != 0
        test_mode = (packet[1] & 4) != 0
        meter_parallel = (packet[1] & 2) != 0
        command_result = (packet[1] & 1) != 0
        actual_r = int.from_bytes(packet[2:4], "little")
        setpoint_r = int.from_bytes(packet[4:6], "little")
        mem_free = int.from_bytes(packet[6:10], "little")
        err_board = packet[10]
        battery = packet[11]
        retval = {'Wifi': wifi_state, 'Bluetooth': bluetooth_state, 'Relay': relay_position, 'Parallel': meter_parallel,
                  'Result': command_result, 'R act': actual_r, 'R setpoint': setpoint_r, 'Mem': mem_free,
                  'Board err': err_board, 'Battery': battery, 'BT test err': self.bt_client.bt_errors,
                  'Verbose': verbose, 'Test mode': test_mode, 'Freq': freq}
        return retval

    async def wait_for_confirmation(self, fun_chk, chk_value, timeout_ms=2000):
        cpt_wait = 0
        setpoint = 0

        while cpt_wait * 50 < timeout_ms:
            self.status = self.parse_status(self.bt_client.status_value)
            if fun_chk(self.status, chk_value):
                return True
            cpt_wait += 1
            await asyncio.sleep_ms(50)

        print(time.localtime(), f'*** timeout waiting for {str(fun_chk)} == {chk_value}')
        return False

    async def run_test(self, tc: TestCase, ts: TestSuite):
        MAX_RETRY = 3
        retry = 0
        while retry < MAX_RETRY:
            if self.bt_client.should_reinit:
                await self.bt_client.connect()
            if not await self.bt_client.write_command(tc.command):
                print('Failure to write', tc, 'retry', retry)
            else:
                if tc.fun_chk is not None:
                    if await self.wait_for_confirmation(tc.fun_chk, tc.expected, tc.timeout_ms):
                        self.test_total += 1
                        return True
                    else:
                        print('Failure to confirm', tc, 'retry', retry)
                else:
                    self.test_total += 1
                    return True
            retry += 1
            await asyncio.sleep_ms(50)

        self.test_failures += 1
        ts.stats['failed_tc'].append(tc)
        print('** TEST FAILURE', tc)
        return False

    async def run_suites(self, test_suites):
        if test_suites is None or len(test_suites) == 0:
            return
        self.running = True

        for ts in test_suites:
            print('Starting', ts)
            if ts.pm is not None:
                ts.pm.reset()
            ts.stats['start'] = time.ticks_ms()
            ts.stats['total'] = 0
            ts.stats['failures'] = 0
            for i in range(0, ts.nb_iter):
                for tc in ts.get_testcases():
                    if not await self.run_test(tc, ts):
                        ts.stats['failures'] += 1
                    ts.stats['total'] += 1
                    if tc.delay_ms > 0:
                        await asyncio.sleep_ms(tc.delay_ms)
                    else:
                        await asyncio.sleep_ms(DELAY_BETWEEN_COMMANDS)
            ts.stats['duration'] = time.ticks_ms() - ts.stats['start']
            print('Completed', ts)
            Logger.save_results(ts, self.status)

        self.running = False
        print('Completed all test suites')
