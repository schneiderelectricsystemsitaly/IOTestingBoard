import logging
import time

import uasyncio as asyncio
from machine import SoftI2C

from .ina219 import INA219
from .test import STOP_FLAG


class PowerMonitor:
    SHUNT_OHMS = 0.1

    def __init__(self, sda, sdc):
        i2c = SoftI2C(sda, sdc)
        if len(i2c.scan()) == 0:
            raise Exception("I2C INA219 not found")

        self.ina = INA219(PowerMonitor.SHUNT_OHMS, i2c, log_level=logging.INFO)
        self.ina.configure(voltage_range=INA219.RANGE_16V, bus_adc=INA219.ADC_128SAMP, shunt_adc=INA219.ADC_128SAMP, \
                           gain=INA219.GAIN_2_80MV)
        self.summary = {}
        self.last_values = {}

    async def monitor_loop(self):
        self.summary = {}
        while not STOP_FLAG:
            self.last_values = {"Bus Voltage (V)": self.ina.voltage(), "Current (mA)": self.ina.current(),
                                "Power (mW)": self.ina.power(), "Timestamp": time.ticks_us()}
            self.__update_summary(self.last_values)
            await asyncio.sleep_ms(80)

    def get_summary(self):
        return self.summary.copy()

    def get_last_values(self):
        return self.last_values.copy()

    def __update_summary(self, latest):
        if len(self.summary) == 0:
            self.summary["Timestamp"] = latest["Timestamp"]
            self.summary["Start timestamp"] = latest["Timestamp"]
            self.summary['Energy (mWh)'] = 0.0
            self.summary["Total duration (s)"] = 0.0
            self.summary["Peak current (mA)"] = 0.0
        else:
            delay_us = latest["Timestamp"] - self.summary["Timestamp"]
            if delay_us > 0:
                self.summary["Energy (mWh)"] += latest["Power (mW)"] * delay_us / 3600000000
                self.summary["Total duration (s)"] += (latest["Timestamp"] - self.summary["Timestamp"]) / 1000000
                self.summary["Timestamp"] = latest["Timestamp"]
                self.summary["1h projected energy (mWh)"] = self.summary["Energy (mWh)"] / self.summary[
                    "Total duration (s)"] * 3600
            else:
                self.summary["Timestamp"] = latest["Timestamp"]

            if latest['Current (mA)'] > self.summary["Peak current (mA)"]:
                self.summary["Peak current (mA)"] = latest['Current (mA)']

    def reset(self):
        self.summary = {}

