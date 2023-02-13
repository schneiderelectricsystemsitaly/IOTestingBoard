from micropython import const

# special values for resistor settings
# R_OPEN = open opto-couplers resistance >10 MΩ
# R_MAX = the maximum value closed circuit obtainable by resistor network
R_OPEN = const(0xFFFF)
R_MAX = const(0xFFFE)
