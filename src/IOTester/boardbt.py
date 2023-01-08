import gc
import time

import aioble
import bluetooth
import uasyncio as asyncio
from machine import freq
from micropython import const

from . import boardbtcfg
from .boardctl import (get_battery_percent)
from .boardsettings import get_settings, Settings
from .boardstate import (get_state, update_bt_state, update_event_time, is_verbose, set_battery, set_notify_callback)
from .btcommand import parse_command_packet
from .state import BluetoothState

__task_adv = None
__task_status = None
__task_commands = None
__task_battery = None
__clients = []
__bt_stop_flag = False
__status_characteristic = None
__last_notification_ms = 0
_MAX_CLIENTS = const(3)
_MAX_STATUS_DELAY_MS = const(5000)  # Maximum period for Status BT notifications
_MIN_BLUETOOTH_DELAY_MS = const(49)  # Minimum period for all BT notifications


def notify_change(force=False) -> None:
    global __status_characteristic, __last_notification_ms
    # Skip if not BT active
    if get_state().bluetooth in [BluetoothState.enabled_with_client, BluetoothState.enabled]:
        t1 = asyncio.create_task(__notify_task(force))
        asyncio.gather(t1)


def __get_model_number() -> str:
    return boardbtcfg.DEVICE_INFORMATION_MODEL


def __get_serial_number() -> str:
    return get_settings().get_value(Settings.SERIAL)


def __get_hardware_revision() -> str:
    return get_settings().get_value(Settings.HW_REV)


def __sw_get_version(directory, version_file_name='.version') -> str:
    # see ota_updater.py
    from os import listdir
    if version_file_name in listdir(directory):
        with open(directory + '/' + version_file_name) as f:
            version = f.read()
            return version
    return '0.0'


def __get_firmware_revision() -> str:
    return __sw_get_version('IOTester')


def __get_manufacturer_name() -> str:
    return boardbtcfg.DEVICE_INFORMATION_MANUFACTURER


def __configure_device_info(service: aioble.Service) -> None:
    # model number
    chars = {bluetooth.UUID(0x2a24): __get_model_number,
             bluetooth.UUID(0x2a25): __get_serial_number,
             bluetooth.UUID(0x2a26): __get_firmware_revision,
             bluetooth.UUID(0x2a27): __get_hardware_revision,
             bluetooth.UUID(0x2a29): __get_manufacturer_name,
             }

    for kv in chars.items():
        char = aioble.Characteristic(service, kv[0], read=True, notify=False, capture=False)
        char.write(kv[1]())


async def __notify_task(force=False) -> bool:
    global __status_characteristic, __last_notification_ms
    try:
        # Check interface is initialized
        if __status_characteristic:
            since_last = time.ticks_ms() - __last_notification_ms
            while _MIN_BLUETOOTH_DELAY_MS > since_last > 0 and not force:
                await asyncio.sleep_ms(_MIN_BLUETOOTH_DELAY_MS - since_last)
                # Need to recheck because a 5s transmission may have happened during await period
                since_last = time.ticks_ms() - __last_notification_ms
            data = __get_notification_data()
            __status_characteristic.write(data, True)
            __last_notification_ms = time.ticks_ms()
        return True
    except (asyncio.core.TimeoutError, asyncio.core.CancelledError) as e:
        print('notify_change', repr(e))
        return False


async def enable_bt_with_retry():
    print('** Bluetooth enabling...', get_state().bluetooth)
    update_bt_state(BluetoothState.enabling)
    gc.collect()

    set_notify_callback(notify_change)

    while not get_state().bluetooth in [BluetoothState.disabling,
                                        BluetoothState.disabled,
                                        BluetoothState.enabled,
                                        BluetoothState.enabled_with_client]:
        if not await __enable_bt():
            update_bt_state(BluetoothState.failed)
            print('** Failed to enable BT, will retry...')
            await asyncio.sleep_ms(5000)


async def toggle_bluetooth() -> None:
    print("** Toggle bluetooth called")
    update_event_time()
    bt_state = get_state().bluetooth
    if (bt_state in [BluetoothState.disabled, BluetoothState.unknown,
                     BluetoothState.failed]):
        asyncio.create_task(enable_bt_with_retry())
    else:
        await disable_bt()


async def __client_task(connection) -> None:
    global __clients

    if not connection:
        __clients.remove(asyncio.current_task())
        return

    print(f"BT connection #{len(__clients)} task: from ", connection.device)
    update_bt_state(BluetoothState.enabled_with_client)
    try:
        await connection.disconnected(timeout_ms=None)
    except Exception as e:
        print(time.localtime(), f'client_task: {repr(e)}')
    print(time.localtime(), f"Disconnection of ", connection.device)

    __clients.remove(asyncio.current_task())
    if len(__clients) == 0:
        update_bt_state(BluetoothState.enabled)
    else:
        update_bt_state(BluetoothState.enabled_with_client)


async def __peripheral_task() -> None:
    global __bt_stop_flag, __clients
    update_bt_state(BluetoothState.enabled)

    # Get the device name from persisted file
    curr_settings = get_settings()
    device_name = curr_settings[Settings.BLUETOOTH_NAME]

    while not __bt_stop_flag:
        if is_verbose():
            print("BT advertising task starting...")

        if len(__clients) == 0:
            update_bt_state(BluetoothState.enabled)
        else:
            update_bt_state(BluetoothState.enabled_with_client)

        while len(__clients) <= _MAX_CLIENTS and not __bt_stop_flag:
            try:
                connection = await aioble.advertise(
                    boardbtcfg.ADV_INTERVAL_MS,
                    name=device_name,
                    services=[boardbtcfg.BOARD_SERVICE_UUID],
                    appearance=boardbtcfg.GENERIC_REMOTE_CONTROL,
                    timeout_ms=None)
                __clients.append(asyncio.create_task(__client_task(connection)))
                await asyncio.sleep_ms(200)
            except (asyncio.core.TimeoutError, asyncio.core.CancelledError) as e:
                print(time.localtime(), f"peripheral_task: error while connected to BT device: {repr(e)}")
                break
            except AttributeError as e:
                print(time.localtime(), f"peripheral_task: {repr(e)}")
                break

        if len(__clients) == _MAX_CLIENTS:
            print("Too many clients")
            await asyncio.sleep_ms(1000)
        else:
            await asyncio.sleep_ms(200)

    print('\tAdvertising task terminating')


async def disable_bt() -> None:
    global __bt_stop_flag, __task_adv, __task_status, __task_commands, __clients, __status_characteristic
    __bt_stop_flag = True
    update_bt_state(BluetoothState.disabling)
    aioble.stop()
    bluetooth.BLE().active(False)
    await asyncio.sleep_ms(20)

    for t in (__task_adv, __task_status, __task_commands):
        if t is not None:
            try:
                t.cancel()
            except Exception as e:
                print(f'Task {t} : {repr(e)}')
                pass

    await asyncio.sleep_ms(20)

    for t in __clients:
        try:
            t.cancel()
        except Exception as e:
            print(f'Task {t} : {repr(e)}')
            pass

    __task_adv = None
    __task_status = None
    __task_commands = None
    __clients = []
    __status_characteristic = None

    await asyncio.sleep_ms(100)
    print('** Bluetooth disabled')
    update_bt_state(BluetoothState.disabled)
    gc.collect()


async def __board_command_loop(board_command_char) -> None:
    global __bt_stop_flag
    if is_verbose():
        print('Board command task starting...')
    while not __bt_stop_flag:
        try:
            await board_command_char.written()
            command = board_command_char.read()
            # print(f'Received BT command {command}')

            if command is None or len(command) <= 0:
                continue

            await parse_command_packet(command)
        except (asyncio.core.TimeoutError, asyncio.core.CancelledError) as e:
            print(time.localtime(), 'board_command_loop', repr(e))
            pass
    print('\tBoard command task terminating.')


@micropython.native
def __get_notification_data() -> bytearray:
    gc.collect()
    # 0 - WIFI b7 b6 RELAY b5 b4 BLUETOOTH b3 b2 b1 UNUSED b0
    # 1 - ERROR FLAG b6 FREQ b5-b4 VERBOSE b3 TESTMODE b2 METER PARALLEL b1 LAST RESULT b0
    # 2 - R actual (2 bytes)
    # 4 - R setpoint (2 bytes)
    # 6 - free memory (4 bytes)
    # 10- error count (1 byte)
    # 11- battery level (1 byte)
    state = get_state()
    status_b1 = int(state.wifi) << 6 | int(state.relay) << 4 | int(state.bluetooth) << 1

    if freq() == 240000000:
        i_freq = 3
    elif freq() == 160000000:
        i_freq = 2
    elif freq() == 80000000:
        i_freq = 1
    else:
        i_freq = 0

    status_b2 = (0b1 if state.error_cpt > 0 else 0b0) << 6 | \
                int(i_freq) << 5 | \
                (0b1 if state.VERBOSE else 0b0) << 3 | \
                (0b1 if state.test_mode else 0b0) << 2 | \
                (0b1 if state.meter_parallel else 0b0) << 1 | \
                (0b1 if state.last_command_result else 0b0)
    values = bytearray([])
    values.extend(int(status_b1).to_bytes(1, "little"))
    values.extend(int(status_b2).to_bytes(1, "little"))
    values.extend(int(state.actual_r).to_bytes(2, "little"))
    values.extend(int(state.setpoint_r).to_bytes(2, "little"))
    values.extend(int(gc.mem_free()).to_bytes(4, "little"))
    values.extend(int(state.bt_commands % 256).to_bytes(1, "little"))
    return values


async def __board_status_loop(bsc) -> None:
    global __bt_stop_flag, __last_notification_ms
    if is_verbose():
        print('Board status task starting...')
    while not __bt_stop_flag:
        try:
            tick_ms = time.ticks_ms()
            delay_since = tick_ms - __last_notification_ms
            if delay_since > _MAX_STATUS_DELAY_MS:
                bsc.write(__get_notification_data(), True)
                __last_notification_ms = tick_ms
                await asyncio.sleep_ms(_MAX_STATUS_DELAY_MS)
            else:
                await asyncio.sleep_ms(_MAX_STATUS_DELAY_MS - (delay_since if delay_since > 0 else 0))
        except (asyncio.core.TimeoutError, asyncio.core.CancelledError) as e:
            print(time.localtime(), 'board_status_loop', repr(e))
            pass
    print('\tBoard status task terminating.')


async def __battery_loop(battery_char) -> None:
    global __bt_stop_flag, __last_notification_ms
    if is_verbose():
        print('Board battery task starting...')
    while not __bt_stop_flag:
        try:
            percent = await get_battery_percent()
            set_battery(percent)
            since_last = time.ticks_ms() - __last_notification_ms
            while _MIN_BLUETOOTH_DELAY_MS > since_last > 0:
                await asyncio.sleep_ms(_MIN_BLUETOOTH_DELAY_MS - since_last)
                # Need to recheck because a 5s transmission may have happened during await period
                since_last = time.ticks_ms() - __last_notification_ms
            battery_char.write(percent.to_bytes(1, "little"), True)
            __last_notification_ms = time.ticks_ms()
            await asyncio.sleep_ms(30000)
        except (asyncio.core.TimeoutError, asyncio.core.CancelledError) as e:
            print(time.localtime(), 'battery_loop', repr(e))
            pass
    print('\tBoard battery task terminating.')


async def __enable_bt() -> bool:
    global __bt_stop_flag, __task_adv, __task_status, __task_commands, __task_battery, __status_characteristic

    update_bt_state(BluetoothState.enabling)
    try:
        bluetooth.BLE().active(True)
    except Exception as e:
        print(time.localtime(), 'Cannot enable bluetooth', repr(e))
        return False

    await asyncio.sleep_ms(0)

    service1 = aioble.Service(boardbtcfg.BOARD_SERVICE_UUID)
    __status_characteristic = aioble.Characteristic(service1, boardbtcfg.BOARD_STATUS_UUID, read=False, notify=True,
                                                    capture=False)
    board_command_char = aioble.Characteristic(service1, boardbtcfg.BOARD_COMMAND_UUID, write_no_response=True,
                                               notify=False, capture=False)

    service2 = aioble.Service(boardbtcfg.BATTERY_SERVICE_UUID)
    battery_char = aioble.Characteristic(service2, boardbtcfg.BATTERY_CHAR_UUID, read=True, notify=True, capture=False)

    service3 = aioble.Service(boardbtcfg.DEVICE_INFORMATION_SERVICE_UUID)
    __configure_device_info(service3)

    aioble.register_services(service1, service2, service3)

    gc.collect()

    __bt_stop_flag = False

    __task_adv = asyncio.create_task(__peripheral_task())
    __task_status = asyncio.create_task(__board_status_loop(__status_characteristic))
    __task_commands = asyncio.create_task(__board_command_loop(board_command_char))
    __task_battery = asyncio.create_task(__battery_loop(battery_char))
    print('** Bluetooth enabled')
    await asyncio.sleep(0)
    return True
