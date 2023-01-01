import time

import machine

from .state import BluetoothState, WifiState, BoardState

__state = BoardState()
__fun_notify = lambda *args, **kwargs: None


def set_battery(percent):
    __state.battery_percent = percent
    return get_state()


def update_meter_commands(allowed):
    if __state.meter_commands != allowed:
        __fun_notify()
    __state.meter_commands = allowed
    return __state


def update_event_time():
    __state.last_event = time.ticks_ms()


def update_testmode(test_mode):
    if __state.test_mode != test_mode:
        __fun_notify()

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

    __fun_notify()
    return get_state()


def update_relay_state(new_relay):
    if __state.relay != new_relay:
        __fun_notify()
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
        __fun_notify()
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


def set_notify_callback(fun):
    global __fun_notify
    __fun_notify = fun
