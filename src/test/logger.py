import gc
import time

import ssd1306
import uasyncio as asyncio
from machine import SoftI2C
from .test import STOP_FLAG


class Logger:

    def __init__(self, tester, meter, i2c: SoftI2C):
        self.tester = tester
        self.meter = meter

        # using default address 0x3C
        self.display = ssd1306.SSD1306_I2C(128, 64, i2c)
        self.display.fill(0)
        self.display.text('Starting...', 0, 0, 1)
        self.display.show()

    def message(self, str_out: str, line: int = 0):
        if line >= 1:  # skip line 1
            line += 1
        self.display.text(str_out, 0, line * 10, 1)
        self.display.show()

    def free(self, full=False):
        gc.collect()
        F = gc.mem_free()
        A = gc.mem_alloc()
        T = F + A
        P = '{0:.2f}%'.format(F / T * 100)
        if not full:
            return P
        else:
            return ('Total:{0} Free:{1} ({2})'.format(T, F, P))

    async def loop(self):
        while not STOP_FLAG:
            gc.collect()
            self.display.fill(0)

            if self.tester.bt_client.connection is None:
                str_status = 'Connecting'
            else:
                str_status = 'Running' if self.tester.running else 'Idle'

            str_status += ' ** ' + str(self.tester.test_failures)
            self.message(str_status, 0)
            self.message('Test:' + self.tester.running_desc, 1)
            percent = round(100 * self.tester.running_actual / self.tester.running_total) if self.tester.running_total > 0 else '-'
            self.message(f'{self.tester.running_actual}/{self.tester.running_total} ({percent} %)', 2)
            self.message('' if self.tester.running_tc is None else self.tester.running_tc.get_description(), 3)
            if self.tester.running_ts is not None:
                if self.tester.running_ts.pm is not None:
                    summary = self.tester.running_ts.pm.get_summary()
                    if "1h projected energy (mWh)" in summary:
                        self.message(f'{round(summary["1h projected energy (mWh)"])} mWh Imax={round(summary["Peak current (mA)"])}', 4)
            self.display.show()

            print('** STATUS **')
            print('\tTests', self.tester.test_total, ', failures ', self.tester.test_failures, 'status',
                  self.tester.get_status_str())
            print('\tLast status from device', self.tester.status)
            print('\tPower statistics', self.meter.get_summary())
            print('\tPower last values', self.meter.get_last_values())
            print('\tTesting board memory', self.free(True))
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
        gc.collect()
        print('Results saved to file')
