import gc
import time
import secrets
import ota_update
import machine
import network
import uasyncio as asyncio
import settings.boardsettings as boardsettings


def download_and_install_update_if_available():
    sta_if = network.WLAN(network.STA_IF)
    settings = boardsettings.get_settings()
    if settings[boardsettings.Settings.WIFI]: # if wifi is enabled
        if not sta_if.isconnected():
            print('connecting to network...')
            sta_if.active(True)
            sta_if.connect(settings[boardsettings.Settings.WIFI_NETWORK], settings[
                boardsettings.Settings.WIFI_PASSWORD])
            cpt = 0
            while not sta_if.isconnected() and cpt < 10:
                time.sleep(1)
                cpt += 1

        if sta_if.isconnected():
            print('network config:', sta_if.ifconfig())
            o = ota_update.OTAUpdater('https://github.com/PBrunot/IOTestingBoard', github_src_dir='src',
                                      main_dir='IOTester',
                                      headers={'Authorization': 'token {}'.format(secrets.GITHUB_TOKEN)})
            if o.install_update_if_available():
                machine.reset()
            else:
                del o
                gc.collect()
        print('Update check complete')
    else:
        print('Wifi OTA update disabled')

def start():
    import IOTester
    asyncio.run(IOTester.fathw.main())


def boot():
    try:
        download_and_install_update_if_available()
    except Exception as e:
        print('OTA Updater', repr(e))
        #raise e

    start()


boot()
