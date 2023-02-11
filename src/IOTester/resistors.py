import gc

from .boardcfg import BOARD
from .boardsettings import Settings

available_values = {}
MIN_LOAD = 600


# Vout = K . Vin
# Vin >---(r1)------(r2)---> GND
#                | Vout
#
def k_divider(r1, r2) -> float:
    assert (r1 + r2 != 0)
    return r2 / (r1 + r2)


def __parallel(bitmask, r_values) -> int:
    result = 0
    if bitmask == 0:
        return 0

    for bit in range(0, len(r_values)):
        if (bitmask >> bit) & 1:
            result += 1.0 / (r_values[bit])
    return int(1.0 / result)


def __num_bits_set(bitmask) -> int:
    result = 0
    for bit in range(0, len(BOARD['R_VALUES'])):
        if (bitmask >> bit) & 1:
            result += 1
    return result


def compute_all_r(settings: Settings) -> dict:
    if settings.main_hw_ver() == 1:
        global available_values, MIN_LOAD
        r_values = BOARD['R_VALUES']
        output = {}
        # to generate all subsets we use a bit mask b1,b2,...,bn where (bn ==1) implies (R_VALUES[n] is in the set)
        for bitmask in range(1, 2 ** len(r_values)):
            rval = __parallel(bitmask, r_values)
            if rval not in output:
                output[rval] = bitmask
            # favor longer combinations to improve maximum W and % precision
            elif __num_bits_set(bitmask) > __num_bits_set(output[rval]):
                output[rval] = bitmask
        available_values = output
        gc.collect()
        MIN_LOAD = __min_allowed_r(available_values, 27)
        print(f"{len(output)} resistors combinations, minimum allowed R @ 27V = {MIN_LOAD}")
        return output
    else:
        MIN_LOAD = 500  # TODO BOARD constant
        pass


# micropython.native
def __find_best_r(desired_r, av_values) -> tuple:
    if len(av_values) == 0:
        raise Exception('Call compute_all_r first')

    best = 999999
    best_gap = abs(desired_r - best)
    for idx in av_values.keys():
        gap = abs(desired_r - idx)
        if gap < best_gap:
            best_gap = gap
            best = idx
    return best, av_values[best], 0


def find_best_r_with_opt(desired_r: float, settings: Settings) -> tuple:
    if settings.main_hw_ver() == 1:
        global available_values
        option1 = __find_best_r(desired_r - BOARD['OPTOCOUPLER_R'], available_values)
        option2 = __find_best_r(desired_r - BOARD['R_SERIES'] - BOARD['OPTOCOUPLER_R'], available_values)
        if abs(option1[0] - desired_r) < abs(option2[0] - desired_r + BOARD['R_SERIES']):
            return option1[0] + BOARD['OPTOCOUPLER_R'], option1[1], 0
        else:
            return option2[0] + BOARD['R_SERIES'] + BOARD['OPTOCOUPLER_R'], option2[1], 1
    else:
        return __decade_configuration(desired_r, 500)  # TODO BOARD constant


def __decade_configuration(desired_r: int, series_r: int) -> tuple:
    r_val = sorted(BOARD['R_VALUES'], reverse=True)
    setpoint = desired_r - series_r
    selected = []

    # Cashier algorithm
    for r in r_val:
        if r >= setpoint:
            setpoint -= r
            selected.append(r)
        if setpoint <= 0:
            break

    # If remaining error is more than half the smallest resistor, add it
    # We want to be as close as possible to the desired value, even if we exceed it.
    if desired_r - setpoint - series_r > r_val[-1] / 2:
        setpoint -= r_val[-1]
        selected.append(r_val[-1])

    # Translate selected R values into a bitmask value for optocouplers setting
    result = 0
    for idx in range(0, len(BOARD['R_VALUES'])):
        if BOARD['R_VALUES'][idx] in selected:
            result += 1 << idx
    return (desired_r - setpoint - series_r), result, 0


def __print_configurations(av_values: dict, u_max: int = 24):
    str_out = f'|R value\t|Resistors\t|Power @{u_max}V mW\t|Imax (mA)\t|P opto (mW)\t|\n'
    print(str_out)
    for r in sorted(av_values.keys()):
        str_out = f'|{r}\t|'
        tot_power = 0
        for idx in range(0, len(BOARD['R_VALUES'])):
            if (av_values[r] >> idx) & 1 == 1:
                power = u_max ** 2 / BOARD['R_VALUES'][idx] * 1000
                str_out += str(BOARD['R_VALUES'][idx])
                if power > (BOARD['R_POWER'][idx] * 1000):
                    str_out += '*'
                str_out += '\t'
                tot_power += power
        str_out += "|" + str(int(tot_power)) + '\t|'
        current = u_max / r
        p_opto = 30 * current * current * 1000
        str_out += str(int(current * 1000)) + "\t|" + str(int(p_opto))
        if p_opto > 300:
            str_out += "*"
        str_out += '\t|\n'
        print(str_out)


def __min_allowed_r(av_values: dict, u_max: int = 24) -> int:
    min_r = 0xFFFF
    for r in sorted(av_values.keys()):
        allowed = True
        for idx in range(0, len(BOARD['R_VALUES'])):
            if (av_values[r] >> idx) & 1 == 1:
                power = u_max ** 2 / BOARD['R_VALUES'][idx] * 1000  # P resistor = U^2 / R
                if power > (BOARD['R_POWER'][idx] * 1000):  # Check if above power rating
                    allowed = False
        current = u_max / r
        p_opto = 35 * current * current * 1000  # R max = 35 ohms, P = R.I^2
        if p_opto > 300:  # 300 mW max for TLP222A-2
            allowed = False
        if allowed and r < min_r:
            min_r = r
    return min_r + BOARD['OPTOCOUPLER_R']
