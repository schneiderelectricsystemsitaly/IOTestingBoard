import time

import uasyncio as asyncio

from . import boardbtcfg
from .boardctl import execute, light_sleep, deep_sleep
from .boardsettings import get_settings, Settings
from .boardstate import update_event_time, update_last_result, update_meter_commands, set_verbose, clear_errors, \
    increment_bt_commands
from .boardwifi import enable_wifi, disable_wifi, enable_webrepl, disable_webrepl
from .command import Command

type_gen = type((lambda: (yield))())  # Generator type


# If a callback is passed, run it and return.
# If a coro is passed initiate it and return.
# coros are passed by name i.e. not using function call syntax.
def launch(func, tup_args):
    res = func(*tup_args)
    if isinstance(res, type_gen):
        loop = asyncio.get_event_loop()
        loop.create_task(res)


async def parse_command_packet(command) -> None:
    command_word = command[0]
    if command_word in (boardbtcfg.COMMAND_MODE_RESISTORS,
                        boardbtcfg.COMMAND_MODE_V_LOAD,
                        boardbtcfg.COMMAND_SET_DEEPSLEEP_MIN,
                        boardbtcfg.COMMAND_SET_INITIAL_COMMAND_SETPOINT):
        if len(command) == 3:
            setpoint = int.from_bytes(command[1:3], "little")
            launch(__bt_command_execute, (command_word, setpoint))
        else:
            print('Invalid R/V_LOAD/INITIAL_COMMAND command')
    elif command_word in (boardbtcfg.COMMAND_SET_WIFI_NETWORK,
                          boardbtcfg.COMMAND_SET_WIFI_PASSWORD,
                          boardbtcfg.COMMAND_SET_BLUETOOTH_NAME):
        setpoint = command[1:].decode('utf8')
        launch(__bt_command_execute, (command_word, setpoint))
    elif command_word in (boardbtcfg.COMMAND_SET_INITIAL_METER_COMM,
                          boardbtcfg.COMMAND_SET_INITIAL_BLUETOOTH,
                          boardbtcfg.COMMAND_SET_INITIAL_WIFI,
                          boardbtcfg.COMMAND_SET_VERBOSE,
                          boardbtcfg.COMMAND_METER_COMMANDS,
                          boardbtcfg.COMMAND_SET_OTA,
                          boardbtcfg.COMMAND_METER_COMMANDS):
        if len(command) == 2:
            launch(__bt_command_execute, (command_word, command[1:] != b'\x00'))
        else:
            print('Invalid SET_INITIAL command', 'len', len(command))
    elif command_word in (boardbtcfg.COMMAND_SET_INITIAL_COMMAND_TYPE,
                          boardbtcfg.COMMAND_SET_CPU):
        if len(command) == 2:
            launch(__bt_command_execute, (command_word, int.from_bytes(command[1:], "little")))
        else:
            print('Invalid SET_INITIAL_COMMAND_TYPE/COMMAND_SET_CPU command', 'len', len(command))
    elif command_word == boardbtcfg.COMMAND_CONFIGURE_METER_COMM:
        if len(command) == 6:
            idx = int.from_bytes(command[1:2], "little")
            voltage = int.from_bytes(command[2:3], "little")
            ctype = int.from_bytes(command[3:4], "little")
            setpoint = int.from_bytes(command[4:], "little")
            launch(__bt_command_execute, (command_word, (idx, voltage, ctype, setpoint)))
        else:
            print('Invalid COMMAND_CONFIGURE_METER_COMM command', 'len', len(command))
    elif command_word == boardbtcfg.COMMAND_REFRESH:
        from .boardbt import notify_change
        notify_change(True)
    else:
        launch(__bt_command_execute, (command_word, None))


async def __bt_command_execute(command, setpoint) -> None:
    update_event_time()
    print(time.localtime(), 'BT received', command, setpoint)
    settings = get_settings()
    success = False

    try:
        if command == boardbtcfg.COMMAND_ENABLE_WIFI:
            success = await enable_wifi()
        elif command == boardbtcfg.COMMAND_DISABLE_WIFI:
            success = await disable_wifi()
        elif command == boardbtcfg.COMMAND_ENABLE_WEBREPL:
            success = await enable_wifi()
            await enable_webrepl()
        elif command == boardbtcfg.COMMAND_DISABLE_WEBREPL:
            disable_webrepl()
            success = True
        elif command == boardbtcfg.COMMAND_BREAK:
            import sys
            sys.exit(0)
        elif command == boardbtcfg.COMMAND_MODE_METER:
            comm = Command(Command.bypass, 0xFFFF)
            success = await execute(comm)
        elif command == boardbtcfg.COMMAND_MODE_RESISTORS:
            comm = Command(Command.generate_r, setpoint)
            success = await execute(comm)
        elif command == boardbtcfg.COMMAND_MODE_V_LOAD:
            comm = Command(Command.measure_with_load, setpoint)
            success = await execute(comm)
        elif command == boardbtcfg.COMMAND_REBOOT:
            import machine
            machine.reset()
        elif command == boardbtcfg.COMMAND_RUN_TEST:
            comm = Command(Command.test_mode, 0)
            success = await execute(comm)
        elif command == boardbtcfg.COMMAND_LIGHT_SLEEP:
            await light_sleep(10000)
            success = True
        elif command == boardbtcfg.COMMAND_DEEP_SLEEP:
            await deep_sleep()
        elif command == boardbtcfg.COMMAND_METER_COMMANDS:
            update_meter_commands(True if setpoint else False)
            success = True
        elif command == boardbtcfg.COMMAND_SET_INITIAL_METER_COMM:
            settings.add_key(Settings.METER_COMMANDS_ENABLED, True if setpoint else False)
            print('Saved INITIAL METER COMMANDS to ', setpoint)
            success = True
        elif command == boardbtcfg.COMMAND_SET_WIFI_NETWORK:
            settings.add_key(Settings.WIFI_NETWORK, setpoint)
            print('Saved wifi network to ', setpoint)
            success = True
        elif command == boardbtcfg.COMMAND_SET_WIFI_PASSWORD:
            settings.add_key(Settings.WIFI_PASSWORD, setpoint)
            print('Saved wifi password to ', setpoint)
            success = True
        elif command == boardbtcfg.COMMAND_SET_INITIAL_BLUETOOTH:
            settings.add_key(Settings.BLUETOOTH_ENABLED, True if setpoint else False)
            print('Saved bluetooth to ', setpoint)
            success = True
        elif command == boardbtcfg.COMMAND_SET_INITIAL_WIFI:
            settings.add_key(Settings.WIFI_ENABLED, True if setpoint else False)
            print('Saved wifi to ', setpoint)
            success = True
        elif command == boardbtcfg.COMMAND_SET_DEEPSLEEP_MIN:
            settings.add_key(Settings.DEEPSLEEP_MIN, setpoint)
            print('Set deepsleep delay to ', setpoint)
            success = True
        elif command == boardbtcfg.COMMAND_SET_VERBOSE:
            set_verbose(True if setpoint else False)
            print('Saved VERBOSE to ', setpoint)
            success = True
        elif command == boardbtcfg.COMMAND_SET_INITIAL_COMMAND_TYPE:
            settings.add_key(Settings.INITIAL_COMMAND_TYPE, setpoint)
            print('Saved INITIAL COMMAND to ', setpoint)
            success = True
        elif command == boardbtcfg.COMMAND_SET_INITIAL_COMMAND_SETPOINT:
            settings.add_key(Settings.INITIAL_COMMAND_SETPOINT, setpoint)
            print('Saved INITIAL SETPOINT to ', setpoint)
            success = True
        elif command == boardbtcfg.COMMAND_R_TEST:
            # Command disabled due to potential electrical risk (low load)
            success = True
        elif command == boardbtcfg.COMMAND_SET_CPU:
            from machine import freq
            if setpoint == 0:
                freq(80000000)
                success = True
            elif setpoint == 1:
                freq(160000000)
                success = True
            elif setpoint == 2:
                freq(240000000)
                success = True
            else:
                print('Unrecognized frequency setting')
                success = False
        elif command == boardbtcfg.COMMAND_SET_OTA:
            settings.add_key(Settings.OTA, setpoint)
            # Enable Wi-Fi at boot if OTA is enabled
            if setpoint:
                settings.add_key(Settings.WIFI_ENABLED, True)
            print('Saved OTA to ', setpoint)
            success = True
        elif command == boardbtcfg.COMMAND_CONFIGURE_METER_COMM:
            settings.add_v_threshold(setpoint[0], setpoint[1], setpoint[2], setpoint[3])
            print('Applied v threshold', setpoint)
            success = True
        elif command == boardbtcfg.COMMAND_SET_BLUETOOTH_NAME:
            settings.add_key(Settings.BLUETOOTH_NAME, setpoint)
            print('Applied new bluetooth name', setpoint)
            success = True
        elif command == boardbtcfg.COMMAND_CLEAR_FLAGS:
            clear_errors()
            success = True
        elif command == boardbtcfg.COMMAND_DEBUG_MODE:
            settings.add_key(Settings.DEBUG_MODE, setpoint)
            if setpoint:
                settings.add_key(Settings.WIFI_ENABLED, True)
                settings.add_key(Settings.OTA, False)
            success = True
        else:
            print('Unrecognized BT command', command, setpoint)
            success = False
    except:
        print('Error during BT command execution')
        success = False

    increment_bt_commands()
    update_last_result(success, notify=True, msg=f'BT {command}')
