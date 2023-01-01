import time
import secrets
import ota_update
import machine
import network
import uasyncio as asyncio


def download_and_install_update_if_available():
    sta_if = network.WLAN(network.STA_IF)
    if not sta_if.isconnected():
        print('connecting to network...')
        sta_if.active(True)
        sta_if.connect(secrets.WIFI_SSID, secrets.WIFI_PASSWORD)
        cpt = 0
        while not sta_if.isconnected() and cpt < 10:
            time.sleep(1)
            cpt += 1

    if sta_if.isconnected():
        print('network config:', sta_if.ifconfig())
        o = ota_update.OTAUpdater('https://github.com/PBrunot/IOTestingBoard', github_src_dir='src',
                                  main_dir='IOTester', secrets_file='saved_settings.hex',
                                  headers={'Authorization': 'token {}'.format(secrets.GITHUB_TOKEN)})
        if o.install_update_if_available():
            machine.reset()
        else:
            del (o)
            gc.collect()
    print('Update check complete')


def start():
    import IOTester
    asyncio.run(IOTester.fathw.main())


def boot():
    try:
        download_and_install_update_if_available()
    except Exception as e:
        print('OTA Updater', repr(e))
        raise e

    start()


boot()
