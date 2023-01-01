import time

import uasyncio as asyncio

from test.boardtester import BoardTester
from test.powermonitor import PowerMonitor
from test.test import STOP_FLAG


class Logger:

    def __init__(self, tester: BoardTester, meter: PowerMonitor):
        self.tester = tester
        self.meter = meter

    async def loop(self):
        while not STOP_FLAG:
            print('** STATUS **')
            print('\tTests', self.tester.test_total, ', failures ', self.tester.test_failures, 'status',
                  self.tester.get_status_str())
            print('\tLast status from device', self.tester.status)
            print('\tPower monitor', self.meter.get_summary())
            await asyncio.sleep_ms(5000)
        print('Logger loop terminating')

    def save_results(self, ts, last_status):
        with open('test_results.txt', 'a') as f:
            print('-------------------------------------------------', file=f)
            print(time.localtime(), ts, file=f)
            print("Duration: [", ts.stats['duration'], "] ms, Total tests [", ts.stats['total'], ", Failures [",
                  ts.stats['failures'], "]", file=f)
            if last_status is not None:
                print("Device last status:", file=f)
                print("\t", last_status, file=f)
            if ts.pm is not None:
                print("Energy details:", file=f)
                print("\t", ts.pm.get_summary(), file=f)
            if len(ts.stats['failed_tc']) > 0:
                print("Failures details:", file=f)
                counts = {}
                for tc1 in ts.stats['failed_tc']:
                    for tc2 in ts.stats['failed_tc']:
                        if tc2 == tc1:
                            if tc1 not in counts:
                                counts[tc1] = 0
                            counts[tc1] += 1
                counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)
                for v in counts:
                    print('\t', v[0], 'failures #', v[1], file=f)
        print('Results saved to file')

