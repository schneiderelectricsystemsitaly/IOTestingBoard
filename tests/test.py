# This module shall be run on a different ESP32 board with bluetooth
# It will connect to the IOTesting board and run various commands to "stress test"
#
import gc
import logging
import time

import aioble
import machine
import neopixel
import uasyncio as asyncio
from bluetooth import BLE
from ina219 import INA219
from machine import Pin, SoftI2C
from micropython import const
from ntptime import settime

import boardbtcfg

print('Test module starting...')

NEOPIXEL = neopixel.NeoPixel(machine.Pin(7), 1)
STOP_FLAG = False
DELAY_BETWEEN_COMMANDS = const(100)


def write_neopixel(rgb: tuple, idx=0):
    global NEOPIXEL
    NEOPIXEL[idx] = rgb
    NEOPIXEL.write()


def read_neopixel(idx=0):
    global NEOPIXEL
    return NEOPIXEL[idx]


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
        global STOP_FLAG
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
                self.summary["Total duration (s)"] += (latest["Timestamp"] - self.summary["Timestamp"])/1000000
                self.summary["Timestamp"] = latest["Timestamp"]
                self.summary["1h projected energy (mWh)"] = self.summary["Energy (mWh)"] / self.summary["Total duration (s)"] * 3600
            else:
                self.summary["Timestamp"] = latest["Timestamp"]
            
            if latest['Current (mA)'] > self.summary["Peak current (mA)"]:
                self.summary["Peak current (mA)"] = latest['Current (mA)']
                
    def reset(self):
        self.summary = {}
        
def write_log(msg: str):
    with open("log.txt", "a+") as file1:
        print(time.localtime(), file=file1)
        print(msg, file=file1)
        file1.close()
    print('Logged', msg)


class BluetoothClient:

    def __init__(self, required_service_uuid = boardbtcfg.MODBUS_SERVICE_UUID):
        self.service_uuid = required_service_uuid
        self.board_service = None
        self.status_char = None
        self.command_char = None
        self.connection = None
        self.bt_errors = 0
        self.running_tasks = []

    def __terminate_tasks(self):
        for task in self.running_tasks:
            if task is not None:
                try:
                    task.cancel()
                    task = None
                except:
                    pass
        self.running_tasks = []
        self.board_service = None
        self.board_service = None
        self.status_char = None
        self.command_char = None
        self.connection = None
        self.status_value = None
        self.task_status = None
        self.should_reinit = False
        gc.collect()

    async def status_loop(self):
        print('Status loop starting')
        cpt = 0
        while not STOP_FLAG and not self.should_reinit:
            try:
                self.status_value = await self.status_char.notified()
            except aioble.DeviceDisconnectedError as err:
                print('status_loop', 'disconnect error', repr(err))
                self.should_reinit = True
            except Exception as ex:
                print('status_loop', 'error', repr(ex))
                self.should_reinit = True
        print('Status loop terminating')
            
    async def connect(self):
    
        self.__terminate_tasks()
        BLE().active(True)
        device = None

        # Wait forever untile matching device is found
        while device is None:
            device = await self.__find_device()
            if not device:
                print(time.localtime(), "Tested device not found")
            else:
                # Now a device has been found
                try:
                    print(time.localtime(), "Connecting to", device)
                    self.connection = await device.connect(timeout_ms=5000)
                    await self.__gatt_register()
                    if self.task_status is not None:
                        self.task_status.cancel()
                        self.task_status = None
                    self.task_status = asyncio.create_task(self.status_loop())
                except asyncio.TimeoutError as te:
                    self.connection = None
                    device = None
                    print(time.localtime(), "connect", "Timeout during connection", repr(te))
                    self.bt_errors += 1
                except Exception as ex:
                    self.connection = None
                    device = None
                    BLE().active(False)
                    await asyncio.sleep_ms(100)
                    print('connect', repr(ex))
                    self.bt_errors += 1

            await asyncio.sleep_ms(100)
        return True

    async def __gatt_register(self):
        self.board_service = await self.connection.service(self.service_uuid)
        self.status_char = await self.board_service.characteristic(boardbtcfg.BOARD_STATUS_UUID)
        await self.status_char.subscribe()
        self.command_char = await self.board_service.characteristic(boardbtcfg.BOARD_COMMAND_UUID)

    async def __find_device(self):
        async with aioble.scan(5000, interval_us=100000, window_us=100000, active=True) as scanner:
            write_neopixel((0, 0, 64))
            async for result in scanner:
                if result.name() and self.service_uuid in result.services():
                    return result.device
        return None

    async def write_command(self, command: bytearray):
        TIMEOUT_MS = const(1000)
        prev = read_neopixel()

        # brief white flash when writing
        write_neopixel((200, 200, 200))
        
        try:
            await self.command_char.write(command, timeout_ms=TIMEOUT_MS)
            await asyncio.sleep_ms(0)
            return True
        except Exception as e:
            print('write_command', repr(e))
            raise Exception("Bluetooth error")
        finally:
            write_neopixel(prev)

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

    async def start(self, test_suites, logger):
        global STOP_FLAG
        while not STOP_FLAG:            
            if not await self.bt_client.connect():
                raise Exception("Cannot connect")
            t2 = asyncio.create_task(self.run_suites(test_suites, logger))
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

        print(time.localtime(), f'*** timeout waiting for {chk_value}')
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
        
    async def run_suites(self, test_suites, logger):
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
            logger.save_results(ts, self.status)
                
        self.running = False
        print('Completed all test suites')

class TestCase:
    
    def __init__(self, command_packet, check_function = None, expected_value = None, timeout_ms = 6000, delay_ms = 0):
        if type(command_packet) is int:
            self.command = command_packet.to_bytes(1, 'little')
        elif type(command_packet) is bytearray:
            self.command = command_packet
        elif type(command_packet) is bytes:
            self.command = command_packet
        else:
            raise Exception("Wrong type for command", command_packet, type(command_packet))
        
        self.fun_chk = check_function
        self.expected = expected_value
        self.timeout_ms = timeout_ms
        self.delay_ms = delay_ms
    
    def __str__(self):
        return f'Command {self.command} expected {self.expected} timeout {self.timeout_ms}'
    
    @classmethod
    def chk_setpoint(cls, status, expected_value):
        if status is None:
            return False
        if 'R setpoint' not in status:
            return False
        return abs(status['R setpoint'] - expected_value) < 1

    @classmethod
    def chk_wifi(cls, status, expected_value):
        if status is None:
            return False
        if 'Wifi' not in status:
            return False
        return abs(status['Wifi'] - expected_value) < 1
    
    @classmethod
    def chk_relay(cls, status, expected_value):
        if status is None:
            return False
        if 'Relay' not in status:
            return False
        return abs(status['Relay'] - expected_value) < 1
    
    @classmethod
    def chk_delay(cls, status, expected_value):
        if status is None:
            return False
        if 'Relay' not in status:
            return False
        return abs(status['Relay'] - expected_value) < 1

    @classmethod
    def chk_memory(cls, status, min_value):
        if status is None:
            return False
        if 'Mem' not in status:
            return False
        return status['Mem'] > min_value
    
class TestSuite:
    def __init__(self, description, nb_iter=1, pm=None):
        self.nb_iter = nb_iter
        self.pm = pm
        self.description = description
        self.stats = {}
        self.stats['total'] = 0
        self.stats['failures'] = 0
        self.stats['start'] = 0
        self.stats['failed_tc'] = []
        
    def __str__(self):
        return f'Testsuite [{self.description}] #iterations [{self.nb_iter}]'
    
    @classmethod
    def make_array(cls, command, setpoint=None, setpoint_bytes = 1):
        ret_val = int(command).to_bytes(1, 'little')
        if setpoint is not None:
            ret_val += setpoint.to_bytes(setpoint_bytes, 'little')
        return ret_val
   
    def add_base_tests(self, test_list):
        
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_METER), TestCase.chk_relay, 1))
        
        for r in range(0,11000,500):
            test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_RESISTORS, r, 2), TestCase.chk_setpoint, r))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_RESISTORS, 0xFFFF, 2), TestCase.chk_setpoint, 0xFFFF))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_RESISTORS, 0xFFFE, 2), TestCase.chk_setpoint, 0xFFFE))
        
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_METER), TestCase.chk_relay, 1))
        
        for r in range(0,11000,500):
            test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_V_LOAD, r, 2), TestCase.chk_setpoint, r))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_V_LOAD, 0xFFFF, 2), TestCase.chk_setpoint, 0xFFFF))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_V_LOAD, 0xFFFE, 2), TestCase.chk_setpoint, 0xFFFE))
        
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_MODE_METER), TestCase.chk_relay, 1))
        
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_VERBOSE, 1, 1)))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_RUN_TEST)))
        # Check free memory at the end of the test
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_VERBOSE, 0, 1), TestCase.chk_memory, 42000))

class TestSuiteReboot(TestSuite):
    def get_testcases(self):
        
        test_list = []
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_DEEPSLEEP_MIN, 15, 1), delay_ms = 500)) # deepsleep 15 minutes
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_INITIAL_COMMAND_TYPE, 1, 1), delay_ms = 500)) # set bypass
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_INITIAL_COMMAND_SETPOINT, 0xFFFF, 2), delay_ms = 500)) #set open setpoint
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_METER_COMMANDS, 1, 1), delay_ms = 500)) # enable commands from meter in Rsetpoint mode
        
        # test configuration of thresholds
        commands = [(0,8,2,1000), (0,0,0,0), (0,8,2,1100)]
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
        
            test_list.append(TestCase(arr, delay_ms = 500))
        
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_REBOOT), delay_ms = 25000)) 
        
        return test_list

class TestSuiteNoWifi(TestSuite):

    def get_testcases(self):
        test_list = []
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_DISABLE_WIFI), TestCase.chk_wifi, 1, 30000))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_DISABLE_WEBREPL)))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_INITIAL_WIFI, 0, 1)))
        self.add_base_tests(test_list)
        
        return test_list

class TestSuiteNoWifiCpuMax(TestSuite):
    
    def get_testcases(self):
        
        test_list = []
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_DISABLE_WIFI), TestCase.chk_wifi, 1, 30000))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_DISABLE_WEBREPL)))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_SET_INITIAL_WIFI, 0, 1)))
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_CPU_MAX)))
        
        self.add_base_tests(test_list)
        
        test_list.append(TestCase(TestSuite.make_array(boardbtcfg.COMMAND_CPU_MIN)))
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
    
class Logger:

    def __init__(self, tester: BoardTester, meter: PowerMonitor):
        self.tester = tester
        self.meter = meter

    async def loop(self):
        global STOP_FLAG
        while not STOP_FLAG:
            print('** STATUS **')
            print('\tTests', self.tester.test_total, ', failures ', self.tester.test_failures, 'status', self.tester.get_status_str())
            print('\tLast status from device', self.tester.status)
            print('\tPower monitor', self.meter.get_summary())
            await asyncio.sleep_ms(5000)
        print('Logger loop terminating')

    def save_results(self, ts, last_status):
        with open('test_results.txt', 'a') as f:
            print('-------------------------------------------------', file=f)
            print(time.localtime(), ts, file=f)
            print("Duration: [",ts.stats['duration'],"] ms, Total tests [",ts.stats['total'],", Failures [",ts.stats['failures'],"]", file=f)
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
                                counts[tc1]=0
                            counts[tc1] += 1
                counts = sorted(counts.items(), key=lambda x:x[1], reverse=True)
                for v in counts:
                    print('\t', v[0], 'failures #', v[1], file=f)
        print('Results saved to file')

async def main():
    global STOP_FLAG

    write_neopixel((40, 0, 0))

    try:
        settime()
    except Exception as ex:
        print('Could not set time from NTP servers', repr(ex))

    pm = PowerMonitor(Pin(10), Pin(8))
    bt = BoardTester(BluetoothClient())
    log = Logger(bt, pm)
    test_suites = [TestSuiteReboot('Reboot', 1, pm),
                   TestSuiteNoWifi('NoWifi CPU default', 2, pm),
                   TestSuiteNoWifiCpuMax('NoWifi CPU 240 Mhz', 2, pm),
                   TestSuiteReboot('Reboot', 1, pm),
                   TestSuiteWifi('Wifi', 2, pm),
                   TestSuiteWifiREPL('Wifi+REPL', 2, pm),
                   TestSuiteReboot('Reboot', 1, pm)]
    
    while True:
        STOP_FLAG = False

        try:
            t1 = asyncio.create_task(pm.monitor_loop())
            t2 = asyncio.create_task(bt.start(test_suites, log))
            t3 = asyncio.create_task(log.loop())

            await asyncio.gather(t1, t2, t3)
        except Exception as e:
            print(time.localtime(), 'main', repr(e))
            write_neopixel((64, 0, 0))
            STOP_FLAG = True
            await asyncio.sleep_ms(500)


try:
    asyncio.run(main())
finally:
    asyncio.new_event_loop()  # Clear retained state
