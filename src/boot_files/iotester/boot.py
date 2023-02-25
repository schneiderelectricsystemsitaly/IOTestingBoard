# This file is executed on every boot (including wake-boot from deepsleep)
# import esp
# esp.osdebug(None)
from machine import wake_reason, reset_cause, freq
from time import sleep_ms

gc.collect()
from micropython import mem_info

freq(160000000)

print(f'Machine wake reason: {wake_reason()}')
print(f'Machine reset cause: {reset_cause()}')
gc.collect()
print('--------------------------------')
mem_info()
print('Free: {} allocated: {}'.format(gc.mem_free(), gc.mem_alloc()))
print('--------------------------------')

print('Running OTA & main.py in 2s, Ctrl+C to stop now...')
cpt = 0
while cpt < 20:
    sleep_ms(100)
    cpt += 1
del cpt
