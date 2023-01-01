import time

import machine

from .boardctl import (R_OPEN, R_MAX, notify_change)


class BluetoothState:
    unknown = 0
    disabled = 1
    enabled = 2
    enabled_with_client = 3
    enabling = 4
    disabling = 5
    failed = 6


class WifiState:
    unknown = 0
    disabled = 1
    enabled = 2
    enabling = 3


class RelayState:
    unknown = 0
    meter = 1
    resistor = 2


class BoardState:
    def __init__(self):
        self.relay = RelayState.unknown
        self.bluetooth = BluetoothState.unknown
        self.wifi = WifiState.unknown
        self.setpoint_r = 0.0
        self.actual_r = 0.0
        self.meter_parallel = False
        self.last_command_result = True
        self.ip_config = ()
        self.last_event = time.ticks_ms()
        self.test_mode = False
        self.meter_commands = True
        self.error_cpt = 0
        self.command_cpt = 0
        self.VERBOSE = False
        self.battery_percent = 0
        self.last_error = ''

    def __str__(self):
        if self.setpoint_r == R_OPEN:
            setpoint_desc = 'OPEN (∞)'
        elif self.setpoint_r == R_MAX:
            setpoint_desc = f'R_MAX Ω'
        else:
            setpoint_desc = f'{self.setpoint_r} Ω'

        if self.actual_r == R_OPEN:
            actual_desc = 'OPEN (∞)'
        else:
            actual_desc = f'{self.actual_r} Ω'

        desc = f'Relay={self.relay}, Bluetooth={self.bluetooth}, Wifi={self.wifi} (IP:{self.ip_config}),' + \
               f'setpoint_r={setpoint_desc}, actual_r={actual_desc}, last_result={self.last_command_result},' + \
               f'err count={self.error_cpt}/{self.command_cpt} Battery={self.battery_percent}%'

        if self.error_cpt > 0:
            desc += f' last err msg={self.last_error}'

        return desc


__state = BoardState()


def set_battery(percent):
    __state.battery_percent = percent
    return get_state()


def update_meter_commands(allowed):
    if __state.meter_commands != allowed:
        notify_change()
    __state.meter_commands = allowed
    return __state


def update_event_time():
    __state.last_event = time.ticks_ms()


def update_testmode(test_mode):
    if __state.test_mode != test_mode:
        notify_change()

    __state.test_mode = test_mode
    return get_state()


def update_bt_state(new_state):
    __state.bluetooth = new_state
    if new_state == BluetoothState.failed:
        update_last_result(False, False, 'BT interface failure')
    return get_state()


def update_wifi_state(new_state):
    __state.wifi = new_state

    if new_state == WifiState.enabled:
        import network
        sta_if = network.WLAN(network.STA_IF)
        __state.ip_config = sta_if.ifconfig()
    else:
        __state.ip_config = ()

    notify_change()
    return get_state()


def update_relay_state(new_relay):
    if __state.relay != new_relay:
        notify_change()
    __state.relay = new_relay
    __state.last_event = time.ticks_ms()
    return get_state()


def update_v_parallel_state(b_value):
    __state.meter_parallel = b_value
    return get_state()


def update_r_actual(new_r):
    __state.actual_r = new_r
    return get_state()


def update_r_setpoint(new_r):
    __state.setpoint_r = new_r
    __state.last_event = time.ticks_ms()
    return get_state()


def update_last_result(b_value, notify=False, msg=''):
    __state.last_command_result = b_value
    __state.last_event = time.ticks_ms()
    if not b_value:
        __state.error_cpt += 1
        print('*** ERROR ***', msg)
        __state.last_error = msg
    __state.command_cpt += 1
    if notify:
        notify_change()
    return get_state()


def get_state():
    return __state


def runtime_memory_info():
    import gc
    import micropython
    gc.collect()
    print('-----------------------------')
    micropython.mem_info()
    print('-----------------------------')
    print('Free: {} Allocated: {}'.format(gc.mem_free(), gc.mem_alloc()))
    print('CPU Frequency', machine.freq())
    print('-----------------------------')


def set_verbose(new_value):
    __state.VERBOSE = new_value


def is_verbose():
    return __state.VERBOSE
