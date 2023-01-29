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
        self.relay: int = RelayState.unknown
        self.bluetooth: int = BluetoothState.unknown
        self.wifi: int = WifiState.unknown
        self.setpoint_r: float = 0.0
        self.actual_r: float = 0.0
        self.meter_parallel: bool = False
        self.last_command_result: bool = True
        self.ip_config: tuple = ()
        self.last_event: int = time.ticks_ms()
        self.test_mode: bool = False
        self.meter_commands: bool = True
        self.error_cpt: int = 0
        self.command_cpt: int = 0
        self.VERBOSE: bool = False
        self.battery_percent: int = 0
        self.last_error_msg: str = ''
        self.bt_commands: int = 0
        self.short_relay: bool = False

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
               f'Short={self.short_relay}, ' + \
               f'setpoint_r={setpoint_desc}, actual_r={actual_desc}, last_result={self.last_command_result},' + \
               f'err count={self.error_cpt}/{self.command_cpt} Battery={self.battery_percent}% Bt# ={self.bt_commands}'

        if self.error_cpt > 0:
            desc += f' last err msg={self.last_error_msg}'

        return desc
