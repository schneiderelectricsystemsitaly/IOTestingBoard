# This file is executed on every boot (including wake-boot from deepsleep)
import gc
from time import sleep_ms, time

from machine import wake_reason, reset_cause, reset

import secrets

gc.collect()

import network


def connect():
    from ntptime import settime

    sta_if = network.WLAN(network.STA_IF)
    sta_if.active(True)
    sta_if.config(txpower=8.0)
    if not sta_if.isconnected():
        print('connecting to network...')
        sta_if.connect(secrets.WIFI_SSID, secrets.WIFI_PASSWORD)  # Connect to an AP
        while not sta_if.isconnected():
            pass
    print('Connected :', sta_if.ifconfig())

    try:
        settime()
    except Exception as ex:
        print('Could not set time from NTP servers', repr(ex))

    # import webrepl
    # webrepl.start()


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
            gc.collect()
            o = ota_update.OTAUpdater('https://github.com/PBrunot/IOTestingBoard', github_src_dir='src',
                                      main_dir='test', github_src_main_dir='test-mpy',
                                      headers={'Authorization': 'token {}'.format(secrets.GITHUB_TOKEN)})
            if o.install_update_if_available():
                reset()
            else:
                del o
                del ota_update
        print('Update check complete')
    else:
        print('Wifi OTA update disabled')


print(f'Machine wake reason: {wake_reason()}')
print(f'Machine reset cause: {reset_cause()}')
gc.collect()

print('Running OTA & main.py in 3s, Ctrl+C to stop now...')
cpt = 0
while cpt < 30:
    sleep_ms(100)
    cpt += 1
del cpt

try:
    connect()
    download_and_install_update_if_available()
except Exception as e:
    print('OTA Updater', repr(e))

del connect
del download_and_install_update_if_available

gc.collect()
