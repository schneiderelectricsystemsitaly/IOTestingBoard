from machine import Pin, ADC, DAC
from micropython import const
from .abutton import Pushbutton

BOARD = {'KSET_CMD': Pin(32, Pin.OUT, drive=Pin.DRIVE_2, pull=Pin.PULL_DOWN),
         'KRESET_CMD': Pin(33, Pin.OUT, drive=Pin.DRIVE_2, pull=Pin.PULL_DOWN),
         'VMETER_EN': Pin(17, Pin.OUT, drive=Pin.DRIVE_1),
         'SERIESR_CMD': Pin(18, Pin.OUT, drive=Pin.DRIVE_1),
         'VSENSE': Pin(34, Pin.IN, pull=None)}

# PINS CONFIGURATION
BOARD['VSENSE_ADC'] = ADC(BOARD['VSENSE'])
BOARD['VSENSE_ADC'].width(ADC.WIDTH_10BIT)
BOARD['VSENSE_ADC'].atten(ADC.ATTN_0DB)

BOARD['VBAT_ADC'] = ADC(Pin(35, Pin.IN, pull=None))
BOARD['VBAT_ADC'].width(ADC.WIDTH_10BIT)
BOARD['VBAT_ADC'].atten(ADC.ATTN_11DB)

BOARD['WAKE_SW'] = Pin(14, Pin.IN, pull=Pin.PULL_DOWN)
BOARD['PUSHBUTTON'] = Pushbutton(BOARD['WAKE_SW'], suppress=True)
BOARD['BUILTIN_LED'] = Pin(5, Pin.OUT, drive=Pin.DRIVE_0)
BOARD['RED_LED'] = Pin(25, pull=Pin.PULL_DOWN, hold=True)
BOARD['GREEN_LED'] = Pin(26, pull=Pin.PULL_DOWN, hold=True)
BOARD['RED_LED_DAC'] = DAC(BOARD['RED_LED'], bits=8, buffering=False, hold=False)
BOARD['GREEN_LED_DAC'] = DAC(BOARD['GREEN_LED'], bits=8, buffering=False, hold=False)

# RESISTOR NETWORK CONFIGURATION
# Mapping to pins through optocouplers (DRIVE_1 required to drive the optocoupler LED)
BOARD['RESISTORS'] = (Pin(19, Pin.OUT, drive=Pin.DRIVE_1),
                      Pin(21, Pin.OUT, drive=Pin.DRIVE_1),
                      Pin(22, Pin.OUT, drive=Pin.DRIVE_1),
                      Pin(23, Pin.OUT, drive=Pin.DRIVE_1),
                      Pin(4, Pin.OUT, drive=Pin.DRIVE_1),
                      Pin(16, Pin.OUT, drive=Pin.DRIVE_1),
                      Pin(13, Pin.OUT, drive=Pin.DRIVE_1),
                      Pin(12, Pin.OUT, drive=Pin.DRIVE_1))
BOARD['OPTOCOUPLER_R'] = 33
BOARD['R_VALUES'] = const((0.9, 221.4, 1033.9, 2222, 5550, 7502, 8225, 11027))
BOARD['R_SERIES'] = const(2550 - 33)

# Resistor divider for Vsense 
BOARD['R1'] = 148000
BOARD['R2'] = 8200
assert (len(BOARD['RESISTORS']) == len(BOARD['R_VALUES']))

# Set orange during startup
BOARD['RED_LED_DAC'].write(160)
BOARD['GREEN_LED_DAC'].write(190)

# special values for resistor settings
# R_OPEN = open opto-couplers resistance >10 MΩ
# R_MAX = the maximum value closed circuit obtainable by resistor network
R_OPEN = const(0xFFFF)
R_MAX = const(0xFFFE)
