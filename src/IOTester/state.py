import time

from .boardcfg import R_MAX, R_OPEN


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
