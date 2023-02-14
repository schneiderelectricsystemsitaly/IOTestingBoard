from machine import Pin, ADC
from micropython import const

from .abutton import Pushbutton

# HW REV 2.0 configuration

BOARD = {'KSET_CMD': Pin(32, Pin.OUT, drive=Pin.DRIVE_3, pull=Pin.PULL_DOWN),
         'KRESET_CMD': Pin(33, Pin.OUT, drive=Pin.DRIVE_3, pull=Pin.PULL_DOWN),
         'VMETER_EN': Pin(12, Pin.OUT, drive=Pin.DRIVE_1, pull=Pin.PULL_DOWN),
         'SERIESR_CMD': Pin(13, Pin.OUT, drive=Pin.DRIVE_1, pull=Pin.PULL_DOWN),  # Must be 1 to connect R network to GND
         'VSENSE': Pin(34, Pin.IN, pull=None),
         'SHORT': Pin(26, Pin.OUT, drive=Pin.DRIVE_2, pull=Pin.PULL_DOWN)}

# PINS CONFIGURATION
BOARD['VSENSE_ADC'] = ADC(BOARD['VSENSE'])
BOARD['VSENSE_ADC'].width(ADC.WIDTH_10BIT)
BOARD['VSENSE_ADC'].atten(ADC.ATTN_0DB)

BOARD['VBAT_ADC'] = ADC(Pin(35, Pin.IN, pull=None))
BOARD['VBAT_ADC'].width(ADC.WIDTH_10BIT)
BOARD['VBAT_ADC'].atten(ADC.ATTN_11DB)

BOARD['WAKE_SW'] = Pin(14, Pin.IN, pull=Pin.PULL_DOWN)
BOARD['PUSHBUTTON'] = Pushbutton(BOARD['WAKE_SW'], suppress=True)
BOARD['BUILTIN_LED'] = Pin(5, Pin.OUT, drive=Pin.DRIVE_0, pull=Pin.PULL_UP, hold=False)

from neopixel import NeoPixel

BOARD['NEOPIXEL'] = NeoPixel(Pin(25, Pin.OUT), 1)

# RESISTOR NETWORK CONFIGURATION
# Mapping to pins through optocouplers (DRIVE_1 required to drive the optocoupler LED)
BOARD['RESISTORS'] = (Pin(23, Pin.OUT, drive=Pin.DRIVE_1, pull=Pin.PULL_DOWN),
                      Pin(22, Pin.OUT, drive=Pin.DRIVE_1, pull=Pin.PULL_DOWN),
                      Pin(21, Pin.OUT, drive=Pin.DRIVE_1, pull=Pin.PULL_DOWN),
                      Pin(19, Pin.OUT, drive=Pin.DRIVE_1, pull=Pin.PULL_DOWN),
                      Pin(18, Pin.OUT, drive=Pin.DRIVE_1, pull=Pin.PULL_DOWN),
                      Pin(17, Pin.OUT, drive=Pin.DRIVE_1, pull=Pin.PULL_DOWN),
                      Pin(16, Pin.OUT, drive=Pin.DRIVE_1, pull=Pin.PULL_DOWN),
                      Pin(4, Pin.OUT, drive=Pin.DRIVE_1, pull=Pin.PULL_DOWN))

BOARD['OPTOCOUPLER_R'] = 2.5
BOARD['R_VALUES'] = const((100, 200, 300, 400, 1000, 2000, 3000, 4000))
BOARD['R_POWER'] = const((.5, .5, .5, .5, 0.25, 0.25, 0.25, 0.25))
BOARD['R_SERIES'] = const(500)  # Unlike HW REV1, this resistor is always in the network and can't be disabled. P = 1 W

# Resistor divider for Vsense
BOARD['R1'] = const(150000)
BOARD['R2'] = const(82000)
assert (len(BOARD['RESISTORS']) == len(BOARD['R_VALUES']))

last_rgb_value = (0, 0, 0)


def set_rgb(rgb: tuple) -> tuple:
    global last_rgb_value
    previous = last_rgb_value
    BOARD['NEOPIXEL'][0] = rgb
    BOARD['NEOPIXEL'].write()
    last_rgb_value = rgb
    return previous


# Set orange during startup
set_rgb((255, 94, 5))
