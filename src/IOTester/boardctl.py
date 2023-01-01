import gc

import machine
import uasyncio as asyncio
from micropython import const

import settings.boardsettings as boardsettings
import IOTester.boardstate as boardstate
import IOTester.boardwifi as boardwifi
import IOTester.resistors as resistors
import IOTester.state
from .boardcfg import BOARD
from .command import Command

# special values for resistor settings
# R_OPEN = open opto-couplers resistance >10 MΩ
# R_MAX = the maximum value closed circuit obtainable by resistor network
R_OPEN = const(0xFFFF)
R_MAX = const(0xFFFE)

last_red_value = 0
last_green_value = 0


def set_red_led(value):
    global last_red_value
    previous = last_red_value
    BOARD['RED_LED_DAC'].write(value)
    last_red_value = value
    return previous


def set_green_led(value):
    global last_green_value
    previous = last_green_value
    BOARD['GREEN_LED_DAC'].write(value)
    last_green_value = value
    return previous


async def r_test():
    boardstate.update_event_time()
    boardstate.update_testmode(False)
    boardstate.update_r_setpoint(R_MAX)
    __optocouplers_off()
    await set_relay_pos(True)

    NB_TESTS = const(3)
    cpt = 1
    while cpt <= NB_TESTS:
        print('Executing test #', cpt, 'ouf of', NB_TESTS)
        series = cpt % 2 == 0
        __set_rseries(not series)
        for i in range(0, len(BOARD['RESISTORS'])):
            # best_tuple = resistors.find_best_r_with_opt(BOARD['R_VALUES'][i], resistors.available_values, BOARD['R_SERIES'])
            # __set_v_parallel(False)
            # final_result = __configure_for_r(best_tuple)
            # print(BOARD['R_VALUES'][i], best_tuple)
            for j in range(0, len(BOARD['RESISTORS'])):
                __set_r(j, i == j)
            print('Resistor', i, ' is now ON, expected',
                  BOARD['R_VALUES'][i] + BOARD['OPTOCOUPLER_R'] + (BOARD['R_SERIES'] if series else 0))
            # read_val = float(input("Actual reading"))
            # BOARD['R_VALUES'][i]=read_val - BOARD['OPTOCOUPLER_R']
            # print('New value', BOARD['R_VALUES'][i])
            await asyncio.sleep_ms(5000)
        cpt += 1


# micropython.native
async def execute(command):
    boardstate.update_event_time()
    final_result = False

    # flash briefly the RED LED when executing commands
    prev1 = set_red_led(220)
    prev2 = set_green_led(250)

    if command.ctype == Command.invalid:
        print('Invalid command', command)
    elif command.ctype == Command.bypass:
        boardstate.update_testmode(False)
        boardstate.update_r_setpoint(R_MAX)
        __optocouplers_off()
        final_result = await set_relay_pos(False, False)
    elif command.ctype == Command.generate_r or command.ctype == Command.measure_with_load:
        boardstate.update_testmode(False)
        boardstate.update_r_setpoint(command.setpoint)
        __optocouplers_off()  # Before to switch, configure for open circuit
        if await set_relay_pos(True, False):
            if command.setpoint != R_OPEN:  # Nothing to do if open circuit command
                best_tuple = resistors.find_best_r_with_opt(command.setpoint, resistors.available_values,
                                                            BOARD['R_SERIES'])
                __set_v_parallel(command.ctype == Command.measure_with_load)
                final_result = __configure_for_r(best_tuple)
            else:
                final_result = True
        else:
            final_result = False
    elif command.ctype == Command.test_mode:
        __optocouplers_off()
        boardstate.update_testmode(True)
        final_result = True
    else:
        final_result = False

    print('Executed', command, 'result', final_result, 'state', boardstate.get_state())

    # restore LED
    set_red_led(prev1)
    set_green_led(prev2)

    return final_result


# micropython.native
def __configure_for_r(best_tuple):
    if boardstate.is_verbose():
        print(f"Configuring for R={best_tuple[0]}, Series R={best_tuple[2]}, Resistors = {best_tuple[1]}")
    series_r = best_tuple[2] == 0

    if not __set_rseries(series_r):
        return False

    for i in range(0, len(BOARD['RESISTORS'])):
        if not __set_r(i, i in best_tuple[1]):
            return False

    boardstate.update_r_actual(best_tuple[0])
    return True


# micropython.native
def __set_digital_pin(pin_name, req_value):
    if req_value:
        BOARD[pin_name].on()
    else:
        BOARD[pin_name].off()

    if BOARD[pin_name].value() ^ req_value:
        print(f'Failure to set', pin_name, req_value)
        boardstate.update_last_result(False, False, f'Pin {pin_name} to {req_value}')
        return False

    if boardstate.is_verbose():
        print(f"{pin_name} set to", "1" if req_value else "0")

    boardstate.update_last_result(True)
    return True


def __set_rseries(req_value):
    return __set_digital_pin('SERIESR_CMD', req_value)


def __set_v_parallel(req_value):
    result = __set_digital_pin('VMETER_EN', req_value)
    if result:
        boardstate.update_v_parallel_state(req_value)
    return result


# micropython.native
def __set_r(idx, req_value):
    assert (0 <= idx < len(BOARD['RESISTORS']))
    if req_value:
        BOARD['RESISTORS'][idx].on()
    else:
        BOARD['RESISTORS'][idx].off()

    # check that the value of the pin and the setpoint are equal
    if BOARD['RESISTORS'][idx].value() ^ req_value:
        print('Failure to set resistor', idx)
        boardstate.update_last_result(False, False, f'Resistor {idx} to {req_value}')
        return False

    if boardstate.is_verbose():
        print(f"Resistor {idx} is", "enabled" if req_value else "disabled")

    boardstate.update_last_result(True)
    return True


async def set_relay_pos(is_set, force=False):
    RELAY_ACTION_TIME_MS = const(5)
    current_state = boardstate.get_state().relay

    if is_set and current_state == IOTester.state.RelayState.resistor and not force:
        if boardstate.is_verbose():
            print('Skipping relay SET command, already in position')
        return True  # already in set position

    if not is_set and current_state == IOTester.state.RelayState.meter and not force:
        if boardstate.is_verbose():
            print('Skipping relay RESET command, already in position')
        return True  # already in reset position

    if is_set:
        __set_digital_pin('KRESET_CMD', False)
        __set_digital_pin('KSET_CMD', True)
        await asyncio.sleep_ms(RELAY_ACTION_TIME_MS)
        if not BOARD['KSET_CMD'].value():
            print("*** Cannot drive SET command")
            boardstate.update_last_result(False, True, f'Relay SET')
            return False
        __set_digital_pin('KSET_CMD', False)
        boardstate.update_relay_state(IOTester.state.RelayState.resistor)
    else:
        __set_digital_pin('KSET_CMD', False)
        __set_digital_pin('KRESET_CMD', True)
        await asyncio.sleep_ms(RELAY_ACTION_TIME_MS)
        if not BOARD['KRESET_CMD'].value():
            print("*** Cannot drive RESET command")
            boardstate.update_last_result(False, True, f'Relay RESET')
            return False
        __set_digital_pin('KRESET_CMD', False)
        boardstate.update_relay_state(IOTester.state.RelayState.meter)

    if boardstate.is_verbose():
        if is_set:
            print("Relay in SET position")
        else:
            print("Relay in RESET position")

    boardstate.update_last_result(True, True)
    return True


# micropython.native
async def toggle_relay():
    print("** Toggle relay called")
    boardstate.update_event_time()
    boardstate.update_testmode(False)
    if boardstate.get_state().relay == IOTester.state.RelayState.meter:
        comm = Command(Command.generate_r, R_OPEN)
        if not await execute(comm):
            print('Failure to SET relay')
            boardstate.update_last_result(False, True, f'Relay SET')
            return False
    else:
        comm = Command(Command.bypass, R_OPEN)
        if not await execute(comm):
            print('Failure to RESET relay')
            boardstate.update_last_result(False, True, f'Relay RESET')
            return False

    return True


# callback from button
async def toggle_vmeter_load():
    print("** toggle_vmeter_load called")
    boardstate.update_event_time()
    boardstate.update_testmode(False)
    comm = Command(Command.measure_with_load, 500)
    return await execute(comm)


async def board_hw_init():
    from .boardbt import (toggle_bluetooth, enable_bt_with_retry, disable_bt)
    __print_wakeup_reason()
    print(f'Machine reset cause: {machine.reset_cause()}')

    # disable all outputs
    __set_digital_pin('KSET_CMD', False)
    __set_digital_pin('KRESET_CMD', False)

    BOARD['PUSHBUTTON'].long_func(toggle_vmeter_load)
    BOARD['PUSHBUTTON'].release_func(toggle_relay)
    BOARD['PUSHBUTTON'].double_func(toggle_bluetooth)

    # Configure deep-sleep wakeup on switch
    import esp32
    esp32.wake_on_ext0(pin=BOARD['WAKE_SW'], level=esp32.WAKEUP_ANY_HIGH)

    # Configuration
    defaults = boardsettings.get_settings()

    boardstate.update_meter_commands(defaults[boardsettings.Settings.METER_COMMANDS])
    __optocouplers_off()
    # Set Relay in meter position
    await set_relay_pos(False, True)

    if defaults[boardsettings.Settings.WIFI]:
        gc.collect()
        await boardwifi.enable_wifi()
    else:
        await boardwifi.disable_wifi()

    if defaults[boardsettings.Settings.BLUETOOTH]:
        asyncio.create_task(enable_bt_with_retry())
    else:
        await disable_bt()

    first_command = Command(defaults[boardsettings.Settings.INITIAL_COMMAND_TYPE],
                            defaults[boardsettings.Settings.INITIAL_COMMAND_SETPOINT])
    return await execute(first_command)


def __print_wakeup_reason():
    wakeup_reason = machine.wake_reason()

    if wakeup_reason == machine.EXT0_WAKE:
        print('Wakeup caused by external signal using RTC_IO')

    elif wakeup_reason == machine.EXT1_WAKE:
        print('Wakeup caused by external signal using RTC_CNTL')

    elif wakeup_reason == machine.TIMER_WAKE:
        print('Wakeup caused by timer')

    elif wakeup_reason == machine.TOUCHPAD_WAKE:
        print('Wakeup caused by touchpad')

    elif wakeup_reason == machine.ULP_WAKE:
        print('Wakeup caused by ULP program')

    else:
        print(f'Wakeup was not caused by deep sleep: {wakeup_reason}')


def get_vmeter():
    import time
    value = 0
    for i in range(0, 5):
        value += BOARD['VSENSE_ADC'].read_uv()
        time.sleep_ms(1)
    value = value / 5
    # precision of ADC insufficient for decimal points anyway
    return round((value - 42000) / resistors.k_divider(BOARD['R1'], BOARD['R2']) / 1000000.0)


async def get_battery_percent():
    bat_v = await get_vbat()
    # %0-100 to V map for LiPo battery
    scale = [(100, 4.2), (95, 4.15), (90, 4.11), (85, 4.08), (80, 4.02),
             (75, 3.98), (70, 3.95), (65, 3.91), (60, 3.87), (55, 3.85),
             (50, 3.84), (45, 3.82), (40, 3.8), (35, 3.79), (30, 3.77),
             (25, 3.75), (20, 3.73), (15, 3.71), (10, 3.69), (5, 3.6),
             (0, 3.27)]
    for p in scale:
        if bat_v >= p[1]:
            return int(p[0])
    return 0


async def get_vbat():
    value = 0
    NB_SAMPLES = const(10)
    for i in range(0, NB_SAMPLES):
        value += BOARD['VBAT_ADC'].read_uv()
        await asyncio.sleep_ms(1)
    value = value / NB_SAMPLES
    return round((value - 42000) * 2 / 1000000.0, 2)


async def light_sleep(delay):
    from .boardbt import enable_bt_with_retry, disable_bt
    import network
    sta_if = network.WLAN(network.STA_IF)
    print(f'Lightsleep for {delay} ms.')

    sta_if.active(False)
    await disable_bt()
    await asyncio.sleep_ms(100)

    machine.lightsleep(delay)

    print('Woke up from light sleep')
    boardstate.update_event_time()

    import gc
    gc.collect()
    __print_wakeup_reason()
    defaults = boardsettings.get_settings()

    if defaults[boardsettings.Settings.WIFI]:
        gc.collect()
        await boardwifi.enable_wifi()
    else:
        await boardwifi.disable_wifi()

    if defaults[boardsettings.Settings.BLUETOOTH]:
        asyncio.create_task(enable_bt_with_retry())
        await asyncio.sleep_ms(0)
    else:
        await disable_bt()


# micropython.native
def __optocouplers_off():
    # switch off optocouplers
    for i in range(0, len(BOARD['RESISTORS'])):
        __set_r(i, False)

    __set_rseries(False)
    __set_v_parallel(False)
    boardstate.update_v_parallel_state(False)
    boardstate.update_r_actual(R_OPEN)


async def deep_sleep():
    from .boardbt import disable_bt
    await disable_bt()
    await boardwifi.disable_wifi()

    import esp32
    # LED pins must be held low
    esp32.gpio_deep_sleep_hold(True)

    print('Relay to meter position')
    await set_relay_pos(False, True)

    __optocouplers_off()

    set_red_led(0)
    set_green_led(0)

    BOARD['BUILTIN_LED'].on()  # inverted on board

    print('Outputs disabled')
    boardstate.update_event_time()

    machine.deepsleep(2000000000)
