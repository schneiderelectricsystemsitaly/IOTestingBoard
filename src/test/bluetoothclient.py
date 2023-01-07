import gc
import time

import aioble
import uasyncio as asyncio
from bluetooth import BLE
from micropython import const

from . import boardbtcfg
from .test import STOP_FLAG, write_neopixel, read_neopixel


class BluetoothClient:

    def __init__(self, required_service_uuid=boardbtcfg.MODBUS_SERVICE_UUID):
        self.service_uuid = required_service_uuid
        self.board_service = None
        self.status_char = None
        self.command_char = None
        self.connection = None
        self.bt_errors = 0
        self.should_reinit = False
        self.task_status = None
        self.status_value = None
        s
    def __terminate_tasks(self):
        self.board_service = None
        self.board_service = None
        self.status_char = None
        self.command_char = None
        self.connection = None
        self.status_value = None
        self.status_value = None
        if self.task_status is not None:
            self.task_status.cancel()

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
                self.bt_errors += 1
            except Exception as ex:
                print('status_loop', 'error', repr(ex))
                self.bt_errors += 1
                self.should_reinit = True
        print('Status loop terminating')

    async def connect(self):
        self.__terminate_tasks()
        BLE().active(True)
        device = None

        # Wait forever until matching device is found
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
        _TIMEOUT_MS = const(1000)
        prev = read_neopixel()

        # brief white flash when writing
        write_neopixel((200, 200, 200))

        try:
            await self.command_char.write(command, timeout_ms=_TIMEOUT_MS)
            return True
        except Exception as e:
            print('write_command', repr(e))
            raise Exception("Bluetooth error")
        finally:
            await asyncio.sleep_ms(5)
            write_neopixel(prev)
            await asyncio.sleep_ms(5)
