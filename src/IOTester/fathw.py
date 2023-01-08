import gc
import time

import uasyncio as asyncio
from micropython import const

import IOTester.state
from .boardcfg import BOARD, R_OPEN, R_MAX
from .boardctl import (set_green_led, set_red_led, get_vmeter, execute, deep_sleep,
                       light_sleep, board_hw_init)
from .boardsettings import get_settings, Settings
from .boardstate import get_state, runtime_memory_info, update_testmode, update_last_result
from .command import Command
from .resistors import compute_all_r
from .state import WifiState, BluetoothState


# FUNCTIONS
def __is_client_connected() -> bool:
    return get_state().bluetooth == BluetoothState.enabled_with_client or \
        get_state().wifi == WifiState.enabled


# micropython.native
async def __animate_leds() -> None:
    error = False
    cpt = 0
    current_state = get_state()
    meter_pattern = [0]  # don't blink
    _parallel_pattern = const((0, 0, 0, 185, 0, 185, 0, 0, 0))  # 2 fast blinks
    _resistor_pattern = const((0, 0, 0, 185, 185, 185, 0, 0, 0))  # 1 slow blink
    _error_pattern = const((190, 190, 0, 0))

    while True:
        green_val = 0
        if current_state.relay == IOTester.state.RelayState.meter:
            green_val = meter_pattern[cpt % len(meter_pattern)]
        elif current_state.relay == IOTester.state.RelayState.resistor:
            if current_state.meter_parallel:
                green_val = _parallel_pattern[cpt % len(_parallel_pattern)]
            else:
                green_val = _resistor_pattern[cpt % len(_resistor_pattern)]
        else:
            error = True

        error |= not current_state.last_command_result

        if error:
            red_val = _error_pattern[cpt % len(_error_pattern)]
        else:
            red_val = 0

        # blink orange when in test mode
        if green_val > 0 and red_val == 0 and current_state.test_mode and False:
            red_val = 155

        set_green_led(green_val)
        set_red_led(red_val)

        network_active = current_state.bluetooth == IOTester.state.BluetoothState.enabled_with_client or \
                         current_state.wifi == IOTester.state.WifiState.enabled
        BOARD['BUILTIN_LED'].value((cpt % 2 == 0) if network_active else True)  # led state is inverted on board

        await asyncio.sleep_ms(250)
        cpt += 1
        if cpt % 200 == 0:
            runtime_memory_info()
            print(get_state())


# micropython.native
async def __meter_commands_check() -> None:
    _METER_CHECK_LOOP_SLEEP_MS = const(500)

    while True:
        state = get_state()
        # execute only if in correct mode with enabled meter commands
        if state.meter_commands and not state.meter_parallel and state.relay == IOTester.state.RelayState.resistor:
            voltage = await get_vmeter()
            if voltage > 1:
                commands = get_settings().get_thresholds()
                for val in commands:
                    if voltage == commands[0]:
                        comm = Command(commands[1], commands[2])
                        await execute(comm)
        await asyncio.sleep_ms(_METER_CHECK_LOOP_SLEEP_MS)


# micropython.native
async def __sleep_check() -> None:
    _CHECK_LOOP_SLEEP_MS = const(2000)
    _IDLE_LIGHT_THRESHOLD_MS = const(60 * 1000)
    _LIGHT_DURATION_MS = const(5000)

    while True:
        current_state = get_state()
        settings = get_settings()
        idle_delay_ms = settings[Settings.DEEPSLEEP_MIN] * 60 * 1000

        if 0 < idle_delay_ms <= time.ticks_ms() - current_state.last_event:
            print(f'Going into deepsleep after {idle_delay_ms / 1000}s of last event.')
            current_state.last_event = time.ticks_ms()
            await deep_sleep()
        if not __is_client_connected() and False:
            if time.ticks_ms() - current_state.last_event >= _IDLE_LIGHT_THRESHOLD_MS:
                current_state.last_event = time.ticks_ms()
                await light_sleep(_LIGHT_DURATION_MS)
        await asyncio.sleep_ms(_CHECK_LOOP_SLEEP_MS)


async def __test_loop() -> None:
    test_cycle = list(range(0, 12000, 250))
    test_cycle.append(R_MAX)
    test_cycle.append(R_OPEN)
    cpt = 0
    _LOOP_SLEEP_MS = const(4000)
    ctype = Command.generate_r
    while True:
        current_state = get_state()
        if current_state.test_mode:
            chosen_r = test_cycle[cpt % len(test_cycle)]
            command = Command(ctype, chosen_r)

            # toggle between resistor and load modes every cycle
            if cpt % len(test_cycle) == len(test_cycle) - 1:
                ctype = Command.measure_with_load if ctype == Command.generate_r else Command.generate_r

            result = await execute(command)
            # execute resets test mode
            update_testmode(True, False)

            if result and get_state().setpoint_r != command.setpoint:
                print('Different setpoints', get_state().setpoint_r, command.setpoint)
                update_last_result(False, True, 'Setpoints are different')
            else:
                update_last_result(result, True, 'Test')
            cpt += 1

        await asyncio.sleep_ms(_LOOP_SLEEP_MS)


async def main() -> None:
    print("Starting IOTesting  module...")

    gc.collect()

    # precompute possible R values
    compute_all_r()

    await board_hw_init()

    t1 = asyncio.create_task(__animate_leds())
    t2 = asyncio.create_task(__test_loop())
    t3 = asyncio.create_task(__sleep_check())
    t4 = asyncio.create_task(__meter_commands_check())

    print('Ready...')
    await asyncio.gather(t1, t2, t3, t4)
