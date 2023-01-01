import gc
import time

import aioble
import bluetooth
import uasyncio as asyncio
from machine import freq

import IOTester.boardbtcfg as boardbtcfg
from .boardctl import (execute, light_sleep, deep_sleep, r_test, get_battery_percent)
from settings.boardsettings import (get_settings, Settings)
from .boardstate import (get_state, update_bt_state, update_event_time, update_last_result,
                         update_meter_commands, set_verbose, is_verbose, set_battery, set_notify_callback)
from .boardwifi import (enable_wifi, disable_wifi, enable_webrepl, disable_webrepl)
from .command import Command
from .state import BluetoothState

__task_adv = None
__task_status = None
__task_commands = None
__task_battery = None
__clients = []

type_gen = type((lambda: (yield))())  # Generator type

__bt_stop_flag = False
__status_characteristic = None


def notify_change():
    global __status_characteristic
    # Skip if not BT active
    if get_state().bluetooth not in [BluetoothState.enabled_with_client, BluetoothState.enabled]:
        return True
    try:
        # Check interface is initialized
        if __status_characteristic:
            data = __get_notification_data()
            __status_characteristic.write(data, True)
        return True
    except (asyncio.core.TimeoutError, asyncio.core.CancelledError) as e:
        print('notify_change', repr(e))
        return False


# If a callback is passed, run it and return.
# If a coro is passed initiate it and return.
# coros are passed by name i.e. not using function call syntax.
def launch(func, tup_args):
    res = func(*tup_args)
    if isinstance(res, type_gen):
        loop = asyncio.get_event_loop()
        loop.create_task(res)


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


async def toggle_bluetooth():
    print("** Toggle bluetooth called")
    update_event_time()
    bt_state = get_state().bluetooth
    if (bt_state in [BluetoothState.disabled, BluetoothState.unknown,
                     BluetoothState.failed]):
        asyncio.create_task(enable_bt_with_retry())
    else:
        await disable_bt()


# micropython.native
async def __bt_command_execute(command, setpoint):
    update_event_time()
    print(time.localtime(), 'BT received', command, setpoint)
    settings = get_settings()

    if command == boardbtcfg.COMMAND_ENABLE_WIFI:
        return await enable_wifi()
    elif command == boardbtcfg.COMMAND_DISABLE_WIFI:
        return await disable_wifi()
    elif command == boardbtcfg.COMMAND_ENABLE_WEBREPL:
        await enable_webrepl()
    elif command == boardbtcfg.COMMAND_DISABLE_WEBREPL:
        disable_webrepl()
    elif command == boardbtcfg.COMMAND_BREAK:
        import sys
        sys.exit(0)
    elif command == boardbtcfg.COMMAND_MODE_METER:
        comm = Command(Command.bypass, 0xFFFF)
        result = await execute(comm)
        update_last_result(result, True, f'BT {comm}')
    elif command == boardbtcfg.COMMAND_MODE_RESISTORS:
        if setpoint is not None:
            comm = Command(Command.generate_r, setpoint)
            result = await execute(comm)
            update_last_result(result, True, f'BT {comm}')
    elif command == boardbtcfg.COMMAND_MODE_V_LOAD:
        if setpoint is not None:
            comm = Command(Command.measure_with_load, setpoint)
            result = await execute(comm)
            update_last_result(result, True, f'BT {comm}')
    elif command == boardbtcfg.COMMAND_REBOOT:
        import machine
        machine.reset()
    elif command == boardbtcfg.COMMAND_RUN_TEST:
        comm = Command(Command.test_mode, 0)
        result = await execute(comm)
        update_last_result(result, True, f'BT {comm}')
    elif command == boardbtcfg.COMMAND_LIGHT_SLEEP:
        await light_sleep(10000)
    elif command == boardbtcfg.COMMAND_DEEP_SLEEP:
        await deep_sleep()
    elif command == boardbtcfg.COMMAND_METER_COMMANDS:
        if setpoint is not None:
            update_meter_commands(True if setpoint else False)
    elif command == boardbtcfg.COMMAND_SET_INITIAL_METER_COMM:
        settings.add_key(Settings.METER_COMMANDS, True if setpoint else False)
        print('Saved INITIAL METER COMMANDS to ', setpoint)
    elif command == boardbtcfg.COMMAND_SET_WIFI_NETWORK:
        if setpoint is not None:
            settings.add_key(Settings.WIFI_NETWORK, setpoint)
            print('Saved wifi network to ', setpoint)
    elif command == boardbtcfg.COMMAND_SET_WIFI_PASSWORD:
        if setpoint is not None:
            settings.add_key(Settings.WIFI_PASSWORD, setpoint)
            print('Saved wifi password to ', setpoint)
    elif command == boardbtcfg.COMMAND_SET_INITIAL_BLUETOOTH:
        settings.add_key(Settings.BLUETOOTH, True if setpoint else False)
        print('Saved bluetooth to ', setpoint)
    elif command == boardbtcfg.COMMAND_SET_INITIAL_WIFI:
        settings.add_key(Settings.WIFI, True if setpoint else False)
        print('Saved wifi to ', setpoint)
    elif command == boardbtcfg.COMMAND_SET_DEEPSLEEP_MIN:
        if setpoint is not None:
            settings.add_key(Settings.DEEPSLEEP_MIN, setpoint)
            print('Set deepsleep delay to ', setpoint)
    elif command == boardbtcfg.COMMAND_SET_VERBOSE:
        set_verbose(True if setpoint else False)
        print('Saved VERBOSE to ', setpoint)
    elif command == boardbtcfg.COMMAND_SET_INITIAL_COMMAND_TYPE:
        settings.add_key(Settings.INITIAL_COMMAND_TYPE, setpoint)
        print('Saved INITIAL COMMAND to ', setpoint)
    elif command == boardbtcfg.COMMAND_SET_INITIAL_COMMAND_SETPOINT:
        settings.add_key(Settings.INITIAL_COMMAND_SETPOINT, setpoint)
        print('Saved INITIAL SETPOINT to ', setpoint)
    elif command == boardbtcfg.COMMAND_R_TEST:
        await r_test()
    elif command == boardbtcfg.COMMAND_CPU_MAX:
        from machine import freq
        freq(240000000)
    elif command == boardbtcfg.COMMAND_CPU_MIN:
        from machine import freq
        freq(80000000)
    elif command == boardbtcfg.COMMAND_CONFIGURE_METER_COMM:
        settings.add_v_threshold(setpoint[0], setpoint[1], setpoint[2], setpoint[3])
        print('Applied v threshold', setpoint)
    else:
        print('Unrecognized BT command', command, setpoint)


async def __client_task(connection):
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


async def __peripheral_task():
    global __bt_stop_flag, __clients
    update_bt_state(BluetoothState.enabled)
    while not __bt_stop_flag:
        if is_verbose():
            print("BT advertising task starting...")

        if len(__clients) == 0:
            update_bt_state(BluetoothState.enabled)
        else:
            update_bt_state(BluetoothState.enabled_with_client)

        while len(__clients) <= 3 and not __bt_stop_flag:
            try:
                connection = await aioble.advertise(
                    boardbtcfg.ADV_INTERVAL_MS,
                    name=boardbtcfg.DEVICE_NAME,
                    services=[boardbtcfg.MODBUS_SERVICE_UUID],
                    appearance=boardbtcfg.GENERIC_REMOTE_CONTROL,
                    timeout_ms=None)
                __clients.append(asyncio.create_task(__client_task(connection)))
                await asyncio.sleep_ms(100)
            except (asyncio.core.TimeoutError, asyncio.core.CancelledError) as e:
                print(time.localtime(), f"peripheral_task: error while connected to BT device: {repr(e)}")
                break
            except AttributeError as e:
                print(time.localtime(), f"peripheral_task: {repr(e)}")
                break

        if len(__clients) == 3:
            print("Too many clients")
            await asyncio.sleep_ms(1000)

        await asyncio.sleep_ms(100)

    print('\tAdvertising task terminating')


async def disable_bt():
    global __bt_stop_flag, __task_adv, __task_status, __task_commands, __clients, __status_characteristic
    import bluetooth
    __bt_stop_flag = True
    update_bt_state(BluetoothState.disabling)
    aioble.stop()
    bluetooth.BLE().active(False)
    await asyncio.sleep_ms(20)

    for t in [__task_adv, __task_status, __task_commands]:
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


async def __board_command_loop(board_command_char):
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

            command_word = command[0]

            if command_word in [boardbtcfg.COMMAND_MODE_RESISTORS,
                                boardbtcfg.COMMAND_MODE_V_LOAD,
                                boardbtcfg.COMMAND_SET_DEEPSLEEP_MIN,
                                boardbtcfg.COMMAND_SET_INITIAL_COMMAND_SETPOINT]:
                if len(command) == 3:
                    setpoint = int.from_bytes(command[1:3], "little")
                    launch(__bt_command_execute, (command_word, setpoint))
                else:
                    print('Invalid R/V_LOAD command')
            elif command_word in [boardbtcfg.COMMAND_SET_WIFI_NETWORK,
                                  boardbtcfg.COMMAND_SET_WIFI_PASSWORD]:
                setpoint = command[1:].decode('utf8')
                launch(__bt_command_execute, (command_word, setpoint))
            elif command_word in [boardbtcfg.COMMAND_SET_INITIAL_METER_COMM,
                                  boardbtcfg.COMMAND_SET_INITIAL_BLUETOOTH,
                                  boardbtcfg.COMMAND_SET_INITIAL_WIFI,
                                  boardbtcfg.COMMAND_SET_VERBOSE,
                                  boardbtcfg.COMMAND_METER_COMMANDS]:
                if len(command) == 2:
                    launch(__bt_command_execute, (command_word, command[1:] != b'\x00'))
                else:
                    print('Invalid SET_INITIAL command', 'len', len(command))
            elif command_word in [boardbtcfg.COMMAND_SET_INITIAL_COMMAND_TYPE]:
                if len(command) == 2:
                    launch(__bt_command_execute, (command_word, int.from_bytes(command[1:], "little")))
                else:
                    print('Invalid SET_INITIAL_COMMAND_TYPE command', 'len', len(command))
            elif command_word in [boardbtcfg.COMMAND_CONFIGURE_METER_COMM]:
                if len(command) == 6:
                    idx = int.from_bytes(command[1:2], "little")
                    voltage = int.from_bytes(command[2:3], "little")
                    ctype = int.from_bytes(command[3:4], "little")
                    setpoint = int.from_bytes(command[4:], "little")
                    launch(__bt_command_execute, (command_word, (idx, voltage, ctype, setpoint)))
                else:
                    print('Invalid COMMAND_CONFIGURE_METER_COMM command', 'len', len(command))
            else:
                launch(__bt_command_execute, (command_word, None))
        except (asyncio.core.TimeoutError, asyncio.core.CancelledError) as e:
            print(time.localtime(), 'board_command_loop', repr(e))
            pass
    print('\tBoard command task terminating.')


# micropython.native
def __get_notification_data():
    gc.collect()
    # 0 - WIFI b7 b6 RELAY b5 b4 BLUETOOTH b3 b2 b1 UNUSED b0
    # 1 - UNUSED b7-b2 METER PARALLEL b1 LAST RESULT b0
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

    status_b2 = int(i_freq) << 5 | \
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
    values.extend(int(state.error_cpt).to_bytes(1, "little"))
    values.extend(int(state.battery_percent).to_bytes(1, "little"))
    return values


async def __board_status_loop(bsc):
    global __bt_stop_flag
    if is_verbose():
        print('Board status task starting...')
    while not __bt_stop_flag:
        try:
            bsc.write(__get_notification_data(), True)
            await asyncio.sleep_ms(5000)
        except (asyncio.core.TimeoutError, asyncio.core.CancelledError) as e:
            print(time.localtime(), 'board_status_loop', repr(e))
            pass
    print('\tBoard status task terminating.')


async def __battery_loop(battery_char):
    global __bt_stop_flag
    if is_verbose():
        print('Board battery task starting...')
    while not __bt_stop_flag:
        try:
            percent = await get_battery_percent()
            set_battery(percent)
            battery_char.write(percent.to_bytes(1, "little"), True)
            await asyncio.sleep_ms(30000)
        except (asyncio.core.TimeoutError, asyncio.core.CancelledError) as e:
            print(time.localtime(), 'battery_loop', repr(e))
            pass
    print('\tBoard battery task terminating.')


async def __enable_bt():
    global __bt_stop_flag, __task_adv, __task_status, __task_commands, __task_battery, __status_characteristic

    update_bt_state(BluetoothState.enabling)
    try:
        bluetooth.BLE().active(True)
    except Exception as e:
        print(time.localtime(), 'Cannot enable bluetooth', repr(e))
        return False

    await asyncio.sleep_ms(0)

    service1 = aioble.Service(boardbtcfg.MODBUS_SERVICE_UUID)
    __status_characteristic = aioble.Characteristic(service1, boardbtcfg.BOARD_STATUS_UUID, read=True, notify=True,
                                                    capture=False)
    board_command_char = aioble.Characteristic(service1, boardbtcfg.BOARD_COMMAND_UUID, write_no_response=True,
                                               notify=False, capture=False)

    service2 = aioble.Service(boardbtcfg.BATTERY_SERVICE_UUID)
    battery_char = aioble.Characteristic(service2, boardbtcfg.BATTERY_CHAR_UUID, read=True, notify=True, capture=False)

    aioble.register_services(service1, service2)

    gc.collect()

    __bt_stop_flag = False

    __task_adv = asyncio.create_task(__peripheral_task())
    __task_status = asyncio.create_task(__board_status_loop(__status_characteristic))
    __task_commands = asyncio.create_task(__board_command_loop(board_command_char))
    __task_battery = asyncio.create_task(__battery_loop(battery_char))
    print('** Bluetooth enabled')
    await asyncio.sleep(0)
    return True
