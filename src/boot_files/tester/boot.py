# This file is executed on every boot (including wake-boot from deepsleep)
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

def download_and_install_update_if_available():
    sta_if = network.WLAN(network.STA_IF)
    if True:
        if not sta_if.isconnected():
            print('connecting to network...')
            sta_if.active(True)
            sta_if.connect(secrets.WIFI_NETWORK, secrets.WIFI_PASSWORD)
            cpt = 0
            while not sta_if.isconnected() and cpt < 10:
                time.sleep(1)
                cpt += 1

        if sta_if.isconnected():
            print('network config:', sta_if.ifconfig())
            import ota_update
            o = ota_update.OTAUpdater('https://github.com/PBrunot/IOTestingBoard', github_src_dir='src',
                                      main_dir='test',
                                      headers={'Authorization': 'token {}'.format(secrets.GITHUB_TOKEN)})
            if o.install_update_if_available():
                machine.reset()
            else:
                del o
        print('Update check complete')
    else:
        print('Wifi OTA update disabled')
        
connect()
print(f'Machine wake reason: {wake_reason()}')
print(f'Machine reset cause: {reset_cause()}')
gc.collect()

print('Running OTA & main.py in 3s, Ctrl+C to stop now...')
cpt = 0
while cpt < 30:
    sleep_ms(100)
    cpt += 1
    
try:
    download_and_install_update_if_available()
except Exception as e:
    print('OTA Updater', repr(e))

del ota_update
del sys.modules['ota_update']
gc.collect()
