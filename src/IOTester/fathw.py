import gc
import time

import uasyncio as asyncio
from machine import freq
from micropython import const

import IOTester.boardctl
import IOTester.boardstate
import IOTester.resistors
from .boardcfg import BOARD
from .boardctl import Command

print("Starting IOTesting fathw module...")


# FUNCTIONS
def __is_client_connected():
    return boardstate.get_state().bluetooth == boardstate.BluetoothState.enabled_with_client or \
        boardstate.get_state().wifi == boardstate.WifiState.enabled


async def __animate_leds():
    error = False
    cpt = 0
    current_state = boardstate.get_state()
    meter_pattern = [0]  # don't blink
    parallel_pattern = [0, 0, 0, 185, 0, 185, 0, 0, 0]  # 2 fast blinks
    resistor_pattern = [0, 0, 0, 185, 185, 185, 0, 0, 0]  # 1 slow blink
    error_pattern = [190, 190, 0, 0]

    while True:
        if boardstate.is_verbose():
            pass  # print(f'animate_leds()\t{current_state}')

        green_val = 0
        if current_state.relay == boardstate.RelayState.meter:
            green_val = meter_pattern[cpt % len(meter_pattern)]
        elif current_state.relay == boardstate.RelayState.resistor:
            if current_state.meter_parallel:
                green_val = parallel_pattern[cpt % len(parallel_pattern)]
            else:
                green_val = resistor_pattern[cpt % len(resistor_pattern)]
        else:
            error = True

        error |= not current_state.last_command_result

        if error:
            red_val = error_pattern[cpt % len(error_pattern)]
        else:
            red_val = 0

        # blink orange when in test mode
        if green_val > 0 and red_val == 0 and current_state.test_mode and False:
            red_val = 155

        boardctl.set_green_led(green_val)
        boardctl.set_red_led(red_val)

        network_active = current_state.bluetooth == boardstate.BluetoothState.enabled_with_client or \
                         current_state.wifi == boardstate.WifiState.enabled
        BOARD['BUILTIN_LED'].value((cpt % 2 == 0) if network_active else True)  # led state is inverted on board

        await asyncio.sleep_ms(250)
        cpt += 1
        if cpt % 200 == 0:
            boardstate.runtime_memory_info()
            print(boardstate.get_state())


async def __meter_commands_check():
    METER_CHECK_LOOP_SLEEP_MS = const(500)
    
    while True:
        state = boardstate.get_state()
        # execute only if in correct mode with enabled meter commands
        if state.meter_commands and not state.meter_parallel and state.relay == boardstate.RelayState.resistor: 
            voltage = boardctl.get_vmeter()
            if voltage > 1:
                commands = boardsettings.get_thresholds()
                for val in commands:
                    if voltage == commands[0]:
                        comm = Command(commands[1], commands[2])
                        await boardctl.execute(comm)
        await asyncio.sleep_ms(METER_CHECK_LOOP_SLEEP_MS)


async def __sleep_check():
    from boardsettings import Settings
    CHECK_LOOP_SLEEP_MS = const(2000)
    IDLE_LIGHT_THRESHOLD_MS = const(60 * 1000)
    LIGHT_DURATION_MS = const(5000)

    while True:
        current_state = boardstate.get_state()
        settings = boardctl.get_defaults()
        idle_delay_ms = settings[Settings.DEEPSLEEP_MIN] * 60 * 1000

        if 0 < idle_delay_ms <= time.ticks_ms() - current_state.last_event:
            print(f'Going into deepsleep after {idle_delay_ms / 1000}s of last event.')
            current_state.last_event = time.ticks_ms()
            await boardctl.deep_sleep()
        if not __is_client_connected() and False:
            if time.ticks_ms() - current_state.last_event >= IDLE_LIGHT_THRESHOLD_MS:
                current_state.last_event = time.ticks_ms()
                await boardctl.light_sleep(LIGHT_DURATION_MS)
        await asyncio.sleep_ms(CHECK_LOOP_SLEEP_MS)


async def __test_loop():
    test_cycle = list(range(0, 12000, 250))
    test_cycle.append(boardctl.R_MAX)
    test_cycle.append(boardctl.R_OPEN)
    cpt = 0
    LOOP_SLEEP_MS = 5000
    ctype = Command.generate_r
    while True:
        current_state = boardstate.get_state()
        if current_state.test_mode:
            chosen_r = test_cycle[cpt % len(test_cycle)]
            command = Command(ctype, chosen_r)

            # toggle between resistor and load modes every cycle
            if cpt % len(test_cycle) == len(test_cycle) - 1:
                ctype = Command.measure_with_load if ctype == Command.generate_r else Command.generate_r

            result = await boardctl.execute(command)

            boardstate.update_testmode(True)
            boardstate.update_last_result(result, True)

            if result and boardstate.get_state().setpoint_r != command.setpoint:
                print('Different setpoints', boardstate.get_state().setpoint_r, command.setpoint)
                boardstate.update_last_result(result, True, f'Setpoints are different')
            cpt += 1

        if boardstate.is_verbose():
            vbat = await boardctl.get_vbat()
            perc_bat = await boardctl.get_battery_percent()
            print(current_state, f"Vsense={boardctl.get_vmeter()} V", f"Vbat={vbat:.2f} V ({perc_bat} %)")

        await asyncio.sleep_ms(LOOP_SLEEP_MS)


async def main():
    gc.collect()

    # precompute possible R values
    resistors.compute_all_r()

    await boardctl.board_hw_init()

    # lower CPU to 80 MHz to reduce power consumption
    freq(80000000)

    t1 = asyncio.create_task(__animate_leds())
    t2 = asyncio.create_task(__test_loop())
    t3 = asyncio.create_task(__sleep_check())
    t4 = asyncio.create_task(__meter_commands_check())

    print('Ready...')
    await asyncio.gather(t1, t2, t3, t4)


asyncio.run(main())
