# This module shall be run on a different ESP32 board with bluetooth
# It will connect to the IOTesting board and run various commands to "stress test"
#

import machine
import neopixel
import uasyncio as asyncio
from machine import Pin
from micropython import const

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
from . import suites


async def main():
    global STOP_FLAG
    from micropython import mem_info

    print(mem_info())

    write_neopixel((40, 0, 0))

    i2c = machine.SoftI2C(Pin(10), Pin(8))
    pm = PowerMonitor(i2c)
    bt = BoardTester(BluetoothClient())
    log = Logger(bt, pm, i2c)
    test_suites = (suites.TestSuiteReboot('Reboot', 1, pm),
                   suites.TestSuiteRandom('Random commands', 1, pm),
                   suites.TestSuiteNoWifi80('NoWifi CPU 80 Mhz', 3, pm),
                   suites.TestSuiteWifiREPL('Wifi+REPL', 3, pm),
                   suites.TestSuiteBTCommands('Reboot', 1, pm),
                   suites.TestSuiteSlow('Slow testing', 2, pm))

    while True:
        STOP_FLAG = False

        t1 = asyncio.create_task(pm.monitor_loop())
        t2 = asyncio.create_task(bt.start(test_suites))
        t3 = asyncio.create_task(log.loop())

        await asyncio.gather(t1, t2, t3)


