# This file is executed on every boot (including wake-boot from deepsleep)
#import esp
#esp.osdebug(None)
import network
import os
import secrets
from machine import wake_reason, reset_cause
from micropython import mem_info
import gc
from time import sleep_ms
import uasyncio as asyncio

def connect():
    sta_if = network.WLAN(network.STA_IF)
    sta_if.active(True)
    sta_if.config(txpower=8.5)
    if not sta_if.isconnected():
        print('connecting to network...')
        sta_if.connect(secrets.WIFI_SSID, secrets.WIFI_PASSWORD) # Connect to an AP
        while not sta_if.isconnected():
            pass
    print('Connected :', sta_if.ifconfig())

    import webrepl
    webrepl.start()
    
connect()
print(f'Machine wake reason: {wake_reason()}')
print(f'Machine reset cause: {reset_cause()}')
gc.collect()
print('--------------------------------')
mem_info()
print('Free: {} allocated: {}'.format(gc.mem_free(), gc.mem_alloc()))
print('--------------------------------')

print('Running main.py in 3s, Ctrl+C to stop now...')
cpt = 0
while cpt < 30:
    sleep_ms(100)
    cpt += 1