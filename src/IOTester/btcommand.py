import time
import uasyncio as asyncio

from . import boardbtcfg
from .boardctl import execute, light_sleep, deep_sleep, r_test
from .boardstate import update_event_time, update_last_result, update_meter_commands, set_verbose
from .boardwifi import enable_wifi, disable_wifi, enable_webrepl, disable_webrepl
from .command import Command
from settings.boardsettings import get_settings, Settings

type_gen = type((lambda: (yield))())  # Generator type


# If a callback is passed, run it and return.
# If a coro is passed initiate it and return.
# coros are passed by name i.e. not using function call syntax.
def launch(func, tup_args):
    res = func(*tup_args)
    if isinstance(res, type_gen):
        loop = asyncio.get_event_loop()
        loop.create_task(res)


async def parse_command_packet(command):
    command_word = command[0]
    if command_word in [boardbtcfg.COMMAND_MODE_RESISTORS,
                        boardbtcfg.COMMAND_MODE_V_LOAD,
                        boardbtcfg.COMMAND_SET_DEEPSLEEP_MIN,
                        boardbtcfg.COMMAND_SET_INITIAL_COMMAND_SETPOINT]:
        if len(command) == 3:
            setpoint = int.from_bytes(command[1:3], "little")
            launch(__bt_command_execute, (command_word, setpoint))
        else:
            print('Invalid R/V_LOAD/INITIAL_COMMAND command')
    elif command_word in [boardbtcfg.COMMAND_SET_WIFI_NETWORK,
                          boardbtcfg.COMMAND_SET_WIFI_PASSWORD]:
        setpoint = command[1:].decode('utf8')
        launch(__bt_command_execute, (command_word, setpoint))
    elif command_word in [boardbtcfg.COMMAND_SET_INITIAL_METER_COMM,
                          boardbtcfg.COMMAND_SET_INITIAL_BLUETOOTH,
                          boardbtcfg.COMMAND_SET_INITIAL_WIFI,
                          boardbtcfg.COMMAND_SET_VERBOSE,
                          boardbtcfg.COMMAND_METER_COMMANDS,
                          boardbtcfg.COMMAND_SET_OTA]:
        if len(command) == 2:
            launch(__bt_command_execute, (command_word, command[1:] != b'\x00'))
        else:
            print('Invalid SET_INITIAL command', 'len', len(command))
    elif command_word in [boardbtcfg.COMMAND_SET_INITIAL_COMMAND_TYPE,
                          boardbtcfg.COMMAND_SET_CPU]:
        if len(command) == 2:
            launch(__bt_command_execute, (command_word, int.from_bytes(command[1:], "little")))
        else:
            print('Invalid SET_INITIAL_COMMAND_TYPE/COMMAND_SET_CPU command', 'len', len(command))
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


async def __bt_command_execute(command, setpoint):
    update_event_time()
    print(time.localtime(), 'BT received', command, setpoint)
    settings = get_settings()

    try:
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
        elif command == boardbtcfg.COMMAND_SET_CPU:
            from machine import freq
            if setpoint == 0:
                freq(80000000)
            elif setpoint == 1:
                freq(160000000)
            elif setpoint == 2:
                freq(240000000)
            else:
                print('Unrecognized frequency setting')
        elif command == boardbtcfg.COMMAND_SET_OTA:
            settings.add_key(Settings.OTA, setpoint)
            # Enable Wi-Fi at boot if OTA is enabled
            if setpoint:
                settings.add_key(Settings.WIFI, True)
            print('Saved OTA to ', setpoint)
        elif command == boardbtcfg.COMMAND_CONFIGURE_METER_COMM:
            settings.add_v_threshold(setpoint[0], setpoint[1], setpoint[2], setpoint[3])
            print('Applied v threshold', setpoint)
        else:
            print('Unrecognized BT command', command, setpoint)
            update_last_result(False, notify=True)
    except:
        print('Error during BT command execution')
        update_last_result(False, notify=True)
