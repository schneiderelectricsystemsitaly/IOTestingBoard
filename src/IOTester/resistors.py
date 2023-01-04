import gc

from IOTester.boardcfg import BOARD

available_values = {}


# Vout = K . Vin
# Vin >---(r1)------(r2)---> GND
#                | Vout
#
def k_divider(r1, r2) -> float:
    assert (r1 + r2 != 0)
    return r2 / (r1 + r2)


def __parallel(subset, r_values) -> int:
    result = 0
    for bit in subset:
        result += 1.0 / (r_values[bit])
    return int(1.0 / result)


def compute_all_r() -> dict:
    global available_values
    r_values = BOARD['R_VALUES']
    output = {}
    for L in range(len(r_values) + 1):
        subset = []
        # to generate all subsets we use a bit mask b1,b2,...,bn where (bn ==1) implies (R_VALUES[n] is in the set)
        for i in range(1, 2 ** len(r_values) + 1):
            subset.clear()
            for bit in range(0, len(r_values)):
                if (i >> bit) & 1:
                    subset.append(bit)  # bit is set, we add to the array
            # subset contains now a subset of R_VALUES
            if len(subset) == 0:
                continue
            rval = __parallel(subset, r_values)
            if rval not in output:
                output[rval] = subset.copy()
            # favor longer combinations to improve maximum W and % precision
            elif len(subset) > len(output[rval]):
                output[rval] = subset.copy()
            if i % 32 == 0:
                gc.collect()
    print(f"{len(output)} resistors combinations saved.")
    available_values = output
    gc.collect()
    return output


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


def find_best_r_with_opt(desired_r) -> tuple:
    global available_values
    option1 = __find_best_r(desired_r - BOARD['OPTOCOUPLER_R'], available_values)
    option2 = __find_best_r(desired_r - BOARD['R_SERIES'] - BOARD['OPTOCOUPLER_R'], available_values)
    if abs(option1[0] - desired_r) < abs(option2[0] - desired_r + BOARD['R_SERIES']):
        return option1[0] + BOARD['OPTOCOUPLER_R'], option1[1], 0
    else:
        return option2[0] + BOARD['R_SERIES'] + BOARD['OPTOCOUPLER_R'], option2[1], 1
