from IOTester.boardctl import R_MAX, R_OPEN


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
        cdesc = 'invalid'
        if self.ctype == Command.bypass:
            cdesc = 'bypass'
        elif self.ctype == Command.generate_r:
            cdesc = 'resistor'
        elif self.ctype == Command.measure_with_load:
            cdesc = 'voltmeter with load'
        elif self.ctype == Command.test_mode:
            cdesc = 'test'

        if self.setpoint == R_MAX:
            setpoint_desc = "R_MAX Ω"
        elif self.setpoint == R_OPEN:
            setpoint_desc = "OPEN"
        else:
            setpoint_desc = f'{self.setpoint} Ω'

        return f'Command type:{cdesc}, setpoint: {setpoint_desc}'
