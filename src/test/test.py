# This module shall be run on a different ESP32 board with bluetooth
# It will connect to the IOTesting board and run various commands to "stress test"
#
import time
import machine
import neopixel
import uasyncio as asyncio
from machine import Pin
from micropython import const
from ntptime import settime

STOP_FLAG = False
NEOPIXEL = neopixel.NeoPixel(machine.Pin(7), 1)
DELAY_BETWEEN_COMMANDS = const(100)

print('Test module starting...')


def write_neopixel(rgb: tuple, idx=0):
    global NEOPIXEL
    NEOPIXEL[idx] = rgb
    NEOPIXEL.write()


def read_neopixel(idx=0):
    global NEOPIXEL
    return NEOPIXEL[idx]


from .bluetoothclient import BluetoothClient
from .boardtester import BoardTester
from .logger import Logger
from .powermonitor import PowerMonitor
from .suites import TestSuiteReboot, TestSuiteNoWifi80, TestSuiteNoWifiCpu160, TestSuiteNoWifiCpu240, TestSuiteWifi, TestSuiteWifiREPL, TestSuiteBTCommands


async def main():
    global STOP_FLAG
    from micropython import mem_info

    print(mem_info())

    write_neopixel((40, 0, 0))

    try:
        settime()
    except Exception as ex:
        print('Could not set time from NTP servers', repr(ex))

    pm = PowerMonitor(Pin(10), Pin(8))
    bt = BoardTester(BluetoothClient())
    log = Logger(bt, pm)
    test_suites = [TestSuiteReboot('Reboot', 1, pm),
                   TestSuiteBTCommands('BT Commands', 1),
                   TestSuiteNoWifi80('NoWifi CPU 80 Mhz', 10, pm),
                   TestSuiteNoWifiCpu160('NoWifi CPU 160 Mhz', 10, pm),
                   TestSuiteNoWifiCpu240('NoWifi CPU 240 Mhz', 10, pm),
                   TestSuiteReboot('Reboot', 1, pm),
                   TestSuiteWifi('Wifi', 10, pm),
                   TestSuiteWifiREPL('Wifi+REPL', 10, pm)]

    while True:
        STOP_FLAG = False

        try:
            t1 = asyncio.create_task(pm.monitor_loop())
            t2 = asyncio.create_task(bt.start(test_suites))
            t3 = asyncio.create_task(log.loop())

            await asyncio.gather(t1, t2, t3)
        except Exception as e:
            print(time.localtime(), 'main', repr(e))
            write_neopixel((64, 0, 0))
            STOP_FLAG = True
            await asyncio.sleep_ms(500)

