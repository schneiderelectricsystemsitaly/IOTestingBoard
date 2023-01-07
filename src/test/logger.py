import time

import uasyncio as asyncio

from .test import STOP_FLAG


class Logger:

    def __init__(self, tester, meter):
        self.tester = tester
        self.meter = meter

    async def loop(self):
        while not STOP_FLAG:
            print('** STATUS **')
            print('\tTests', self.tester.test_total, ', failures ', self.tester.test_failures, 'status',
                  self.tester.get_status_str())
            print('\tLast status from device', self.tester.status)
            print('\tPower statistics', self.meter.get_summary())
            print('\tPower last values', self.meter.get_last_values())
            await asyncio.sleep_ms(3000)
        print('Logger loop terminating')

    @classmethod
    def save_results(cls, ts, last_status):
        with open('test_results.txt', 'a') as f:
            print(time.localtime(), '--------------------------------------------------------------------------------',
                  file=f)
            print('***', ts, '***', file=f)
            print("Duration: [", int(ts.stats['duration'] / 1000), "] s, Total tests [", ts.stats['total'],
                  "], Failures [",
                  ts.stats['failures'], "], Testing speed [",
                  round(ts.stats['total'] / (ts.stats['duration'] / 1000), 1), 'tests/s]', file=f)
            if len(ts.stats['failed_tc']) > 0:
                print("\tFailures details:", file=f)
                counts = {}
                for tc1 in ts.stats['failed_tc']:
                    for tc2 in ts.stats['failed_tc']:
                        if tc2 == tc1:
                            if tc1 not in counts:
                                counts[tc1] = 0
                            counts[tc1] += 1
                counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)
                for v in counts:
                    print('\t\t', v[0], 'failures #', v[1], file=f)
            if last_status is not None:
                print("\tDevice last status:", file=f)
                for key, value in last_status.items():
                    print("\t\t", key, ':', value, file=f)
            if ts.pm is not None:
                print("\tEnergy details:", file=f)
                summary = ts.pm.get_summary()
                print("\t\t1h projected Energy (mWh):", round(summary["1h projected energy (mWh)"]), file=f)
                print("\t\tEnergy measured (mWh):", round(summary["Energy (mWh)"], 1), '\tDuration (s):',
                      round(summary["Total duration (s)"], 1), file=f)
                print("\t\tPeak current (mA):", round(summary["Peak current (mA)"]), file=f)
            f.close()
        print('Results saved to file')
