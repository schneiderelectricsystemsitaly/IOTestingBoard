from .constants import R_OPEN, R_MAX


class Command:
    invalid = 0
    bypass = 1
    generate_r = 2
    measure_with_load = 3
    test_mode = 4

    def __init__(self, ctype, setpoint):
        self.ctype = ctype
        self.setpoint = setpoint

    def __str__(self):
        c_desc = 'invalid'
        if self.ctype == Command.bypass:
            c_desc = 'bypass'
        elif self.ctype == Command.generate_r:
            c_desc = 'resistor'
        elif self.ctype == Command.measure_with_load:
            c_desc = 'voltmeter with load'
        elif self.ctype == Command.test_mode:
            c_desc = 'test'

        if self.setpoint == R_MAX:
            setpoint_desc = "R_MAX Ω"
        elif self.setpoint == R_OPEN:
            setpoint_desc = "OPEN"
        else:
            setpoint_desc = f'{self.setpoint} Ω'

        return f'Command type:{c_desc}, setpoint: {setpoint_desc}'

    def __eq__(self, other):
        if not isinstance(other, self.__class__):
            return False
        return self.ctype == other.ctype and self.setpoint == other.setpoint
