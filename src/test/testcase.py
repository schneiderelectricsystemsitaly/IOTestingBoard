# Represents a single test to be run
class TestCase:

    def __init__(self, command_packet, check_function=None, expected_value=None, timeout_ms=6000, delay_ms=0):
        if type(command_packet) is int:
            self.command = command_packet.to_bytes(1, 'little')
        elif type(command_packet) is bytearray:
            self.command = command_packet
        elif type(command_packet) is bytes:
            self.command = command_packet
        else:
            raise Exception("Wrong type for command", command_packet, type(command_packet))

        self.fun_chk = check_function
        self.expected = expected_value
        self.timeout_ms = timeout_ms
        self.delay_ms = delay_ms

    def __str__(self):
        return f'Command {self.command} expected {str(self.fun_chk)}={self.expected} timeout {self.timeout_ms}'

    @classmethod
    def chk_setpoint(cls, status, expected_value):
        if status is None:
            return False
        if 'R setpoint' not in status:
            return False
        if 'Result' not in status:
            return False
        return abs(status['R setpoint'] - expected_value) < 1 and status['Result']

    @classmethod
    def chk_wifi(cls, status, expected_value):
        if status is None:
            return False
        if 'Wifi' not in status:
            return False
        if 'Result' not in status:
            return False
        return abs(status['Wifi'] - expected_value) < 1 and status['Result']

    @classmethod
    def chk_relay(cls, status, expected_value):
        if status is None:
            return False
        if 'Relay' not in status:
            return False
        if 'Result' not in status:
            return False
        return abs(status['Relay'] - expected_value) < 1 and status['Result']

    @classmethod
    def chk_delay(cls, status, expected_value):
        if status is None:
            return False
        if 'Result' not in status:
            return False
        return status['Result']

    @classmethod
    def chk_memory(cls, status, min_value):
        if status is None:
            return False
        if 'Mem' not in status:
            return False
        if 'Result' not in status:
            return False
        return status['Mem'] > min_value and status['Result']

    @classmethod
    def chk_result(cls, status, value):
        if status is None:
            return False
        if 'Result' not in status:
            return False
        return status['Result']

    @classmethod
    def chk_freq(cls, status, expected_value):
        if status is None:
            return False
        if 'Freq' not in status:
            return False
        if 'Result' not in status:
            return False
        return status['Freq'] == expected_value and status['Result']
