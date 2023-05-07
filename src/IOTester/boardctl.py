import gc

import machine
import uasyncio as asyncio
from micropython import const

from .boardsettings import Settings, get_settings
from .constants import R_OPEN

if get_settings().main_hw_ver() == 1:
    from .boardcfg import BOARD, set_rgb
else:
    from .boardcfgv2 import BOARD, set_rgb

from .boardstate import get_state, update_meter_commands, update_r_actual, update_testmode, update_v_parallel_state, \
    is_verbose, update_event_time, \
    update_last_result, update_r_setpoint, update_relay_state, update_short_relay_state
from .boardwifi import disable_wifi, enable_wifi
from .command import Command
from .resistors import find_best_r_with_opt, k_divider, MIN_LOAD
from .state import RelayState


async def execute(command) -> bool:
    update_event_time()
    final_result = False

    # flash briefly the RED LED when executing commands
    prev1 = set_rgb((220, 250, 0))

    if command.ctype == Command.invalid:
        print('Invalid command', command)
    elif command.ctype == Command.bypass:
        update_testmode(False)
        update_r_setpoint(R_OPEN)
        __optocouplers_off()
        await set_short_relay_pos(False)
        final_result = await set_relay_pos(False, False)
    elif command.ctype == Command.generate_r or command.ctype == Command.measure_with_load:
        # Enforce minimum R
        if 0 < command.setpoint < MIN_LOAD:
            print('Enforcing minimum load of', MIN_LOAD, ' for request of', command.setpoint)
            command.setpoint = MIN_LOAD

        update_testmode(False)
        update_r_setpoint(command.setpoint)
        __optocouplers_off()  # Before to switch, configure for open circuit

        # If setpoint is zero, setup short
        if not await set_short_relay_pos(command.setpoint == 0):
            final_result = False
        else:
            # Now setup main relay and optos
            if await set_relay_pos(True, False):
                __set_v_parallel(command.ctype == Command.measure_with_load)
                if command.setpoint != R_OPEN and command.setpoint != 0:  # Nothing to do if open/short circuit command
                    best_tuple = find_best_r_with_opt(command.setpoint, get_settings())
                    final_result = __configure_for_r(best_tuple)
                else:
                    final_result = True
            else:
                final_result = False
    elif command.ctype == Command.test_mode:
        __optocouplers_off()
        await set_short_relay_pos(False)
        update_testmode(True)
        final_result = True
    else:
        final_result = False

    print('Executed', command, 'result', final_result, 'state', get_state())

    # restore LED
    set_rgb(prev1)

    return final_result


def __configure_for_r(best_tuple) -> bool:
    if is_verbose():
        print(f"Configuring for R={best_tuple[0]}, Series R={best_tuple[2]}, Resistors = {best_tuple[1]:03b}")
    series_r = best_tuple[2] == 0

    # Enable higher value resistors first
    for i in reversed(range(0, len(BOARD['RESISTORS']))):
        is_set = (best_tuple[1] >> i) & 1
        if not __set_r(i, is_set):
            return False

    # Then set R series
    if not __set_rseries(series_r):
        return False

    update_r_actual(best_tuple[0])
    return True


def __set_digital_pin(pin_name, req_value) -> bool:
    if req_value:
        BOARD[pin_name].on()
    else:
        BOARD[pin_name].off()

    if BOARD[pin_name].value() ^ req_value:
        print(f'Failure to set', pin_name, req_value)
        update_last_result(False, False, f'Pin {pin_name} to {req_value}')
        return False

    if is_verbose():
        print(f"{pin_name} set to", "1" if req_value else "0")

    update_last_result(True)
    return True


def __set_rseries(req_value) -> bool:
    return __set_digital_pin('SERIESR_CMD', req_value)


def __set_v_parallel(req_value) -> bool:
    result = __set_digital_pin('VMETER_EN', req_value)
    if result:
        update_v_parallel_state(req_value)
    return result


def __set_r(idx, req_value) -> bool:
    assert (0 <= idx < len(BOARD['RESISTORS']))
    if req_value:
        BOARD['RESISTORS'][idx].on()
    else:
        BOARD['RESISTORS'][idx].off()

    # check that the value of the pin and the setpoint are equal
    if BOARD['RESISTORS'][idx].value() ^ req_value:
        print('Failure to set resistor', idx)
        update_last_result(False, False, f'Resistor {idx} to {req_value}')
        return False

    if is_verbose():
        print(f"Resistor {idx} is", "enabled" if req_value else "disabled")

    update_last_result(True)
    return True


async def set_relay_pos(is_set, force=False) -> bool:
    # See hongfa HFD2 datasheet, for latching status to be retained command must
    # be 5 times the nominal set time : 4.5 ms x 5 -> 22 ms
    RELAY_ACTION_TIME_MS = const(22)
    current_state = get_state().relay

    if is_set and current_state == RelayState.resistor and not force:
        if is_verbose():
            print('Skipping relay SET command, already in position')
        return True  # already in set position

    if not is_set and current_state == RelayState.meter and not force:
        if is_verbose():
            print('Skipping relay RESET command, already in position')
        return True  # already in reset position

    if is_set:
        __set_digital_pin('KRESET_CMD', False)
        await asyncio.sleep_ms(1)
        __set_digital_pin('KSET_CMD', True)
        await asyncio.sleep_ms(RELAY_ACTION_TIME_MS)
        if not BOARD['KSET_CMD'].value():
            print("*** Cannot drive SET command")
            update_last_result(False, True, f'Relay SET')
            return False
        __set_digital_pin('KSET_CMD', False)
        update_relay_state(RelayState.resistor)
    else:
        __set_digital_pin('KSET_CMD', False)
        await asyncio.sleep_ms(1)
        __set_digital_pin('KRESET_CMD', True)
        await asyncio.sleep_ms(RELAY_ACTION_TIME_MS)
        if not BOARD['KRESET_CMD'].value():
            print("*** Cannot drive RESET command")
            update_last_result(False, True, f'Relay RESET')
            return False
        __set_digital_pin('KRESET_CMD', False)
        update_relay_state(RelayState.meter)

    if is_verbose():
        if is_set:
            print("Relay in SET position")
        else:
            print("Relay in RESET position")

    update_last_result(True, True)
    return True


async def set_short_relay_pos(is_set) -> bool:
    SHORT_RELAY_ACTION_TIME_MS = const(5)

    if is_set:
        __set_digital_pin('SHORT', True)
        await asyncio.sleep_ms(SHORT_RELAY_ACTION_TIME_MS)
        if not BOARD['SHORT'].value():
            print("*** Cannot drive SHORT command to 1")
            update_last_result(False, True, f'Relay SHORT 1')
            return False
        update_r_actual(0)
    else:
        __set_digital_pin('SHORT', False)
        await asyncio.sleep_ms(SHORT_RELAY_ACTION_TIME_MS)
        if BOARD['SHORT'].value():
            print("*** Cannot drive SHORT command to 0")
            update_last_result(False, True, f'Relay SHORT 0')
            return False

    update_short_relay_state(is_set)

    if is_verbose():
        if is_set:
            print("Shorting Relay active")
        else:
            print("Shorting Relay inactive")

    update_last_result(True, True)

    return True


async def toggle_relay() -> bool:
    print("** Toggle relay called")
    update_event_time()
    update_testmode(False)
    if get_state().relay == RelayState.meter:
        comm = Command(Command.generate_r, R_OPEN)
        if not await execute(comm):
            print('Failure to SET relay')
            update_last_result(False, True, f'Relay SET')
            return False
    else:
        comm = Command(Command.bypass, R_OPEN)
        if not await execute(comm):
            print('Failure to RESET relay')
            update_last_result(False, True, f'Relay RESET')
            return False

    return True


# callback from button
async def toggle_vmeter_load() -> bool:
    print("** toggle_vmeter_load called")
    update_event_time()
    update_testmode(False)
    comm = Command(Command.measure_with_load, 1000)
    return await execute(comm)


async def board_hw_init() -> bool:
    from .boardbt import (enable_bt_with_retry, disable_bt)
    __print_wakeup_reason()
    print(f'Machine reset cause: {machine.reset_cause()}')

    # disable all outputs
    __set_digital_pin('KSET_CMD', False)
    __set_digital_pin('KRESET_CMD', False)

    BOARD['PUSHBUTTON'].release_func(toggle_relay)
    BOARD['PUSHBUTTON'].double_func(toggle_vmeter_load)

    # Configure deep-sleep wakeup on switch
    import esp32
    esp32.wake_on_ext0(pin=BOARD['WAKE_SW'], level=esp32.WAKEUP_ANY_HIGH)

    # Configuration
    defaults = get_settings()

    update_meter_commands(defaults[Settings.METER_COMMANDS_ENABLED])
    __optocouplers_off()
    # Set Relay in meter position
    await set_relay_pos(False, True)

    if defaults[Settings.WIFI_ENABLED]:
        gc.collect()
        await enable_wifi()
    else:
        await disable_wifi()

    if defaults[Settings.BLUETOOTH_ENABLED]:
        asyncio.create_task(enable_bt_with_retry())
        await asyncio.sleep_ms(1)
    else:
        await disable_bt()

    update_meter_commands(defaults[Settings.METER_COMMANDS_ENABLED])

    first_command = Command(defaults[Settings.INITIAL_COMMAND_TYPE],
                            defaults[Settings.INITIAL_COMMAND_SETPOINT])
    return await execute(first_command)


def __print_wakeup_reason() -> None:
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


async def get_vmeter() -> float:
    value = 0
    for i in range(0, 5):
        value += BOARD['VSENSE_ADC'].read_uv()
        await asyncio.sleep_ms(1)
    value = value / 5
    value = value / k_divider(BOARD['R1'], BOARD['R2']) / 1000000.0
    if get_state().VERBOSE:
        print('VSENSE=', value)
    # precision of ADC insufficient for decimal points anyway
    return round(value)


async def get_battery_percent() -> int:
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


async def get_vbat() -> float:
    value = 0
    NB_SAMPLES = const(10)
    for i in range(0, NB_SAMPLES):
        value += BOARD['VBAT_ADC'].read_uv()
        await asyncio.sleep_ms(1)
    value = value / NB_SAMPLES
    return round((value - 42000) * 2 / 1000000.0, 2)


async def light_sleep(delay) -> None:
    from .boardbt import enable_bt_with_retry, disable_bt
    import network
    sta_if = network.WLAN(network.STA_IF)
    print(f'Lightsleep for {delay} ms.')

    sta_if.active(False)
    await disable_bt()
    await asyncio.sleep_ms(100)

    machine.lightsleep(delay)

    print('Woke up from light sleep')
    update_event_time()

    import gc
    gc.collect()
    __print_wakeup_reason()
    defaults = get_settings()

    if defaults[Settings.WIFI_ENABLED]:
        gc.collect()
        await enable_wifi()
    else:
        await disable_wifi()

    if defaults[Settings.BLUETOOTH_ENABLED]:
        asyncio.create_task(enable_bt_with_retry())
        await asyncio.sleep_ms(0)
    else:
        await disable_bt()


def __optocouplers_off() -> None:
    # switch off optocouplers
    for i in range(0, len(BOARD['RESISTORS'])):
        __set_r(i, False)

    __set_rseries(False)
    __set_v_parallel(False)
    update_v_parallel_state(False)
    update_r_actual(R_OPEN)


async def deep_sleep() -> None:
    from .boardbt import disable_bt
    await disable_bt()
    await disable_wifi()

    import esp32
    # LED pins must be held low
    esp32.gpio_deep_sleep_hold(True)

    print('Relay to meter position')
    await set_relay_pos(False, True)

    __optocouplers_off()

    # Make sure shorting relay is off
    BOARD['SHORT'].off()

    set_rgb((0, 0, 0))

    BOARD['BUILTIN_LED'].on()  # inverted on board

    print('Outputs disabled')
    update_event_time()

    machine.deepsleep(2000000000)
