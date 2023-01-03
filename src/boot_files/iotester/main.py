import gc
import time
import machine
import network
gc.collect()

def download_and_install_update_if_available():
    from settings.boardsettings import get_settings, Settings
    gc.collect()

    sta_if = network.WLAN(network.STA_IF)
    settings = get_settings()
    if settings[Settings.OTA] and settings[Settings.WIFI_ENABLED]: # if wifi is enabled
        if not sta_if.isconnected():
            print('connecting to network...')
            sta_if.active(True)
            sta_if.connect(settings[Settings.WIFI_NETWORK], settings[Settings.WIFI_PASSWORD])
            cpt = 0
            while not sta_if.isconnected() and cpt < 10:
                time.sleep(1)
                cpt += 1

        if sta_if.isconnected():
            import ota_update
            gc.collect()
            print('network config:', sta_if.ifconfig())
            o = ota_update.OTAUpdater('https://github.com/PBrunot/IOTestingBoard', github_src_dir='src',
                                      main_dir='IOTester', github_src_main_dir='IOTester-mpy',
                                      headers={'Authorization': 'token {}'.format(settings[Settings.GITHUB_TOKEN])})
            if o.install_update_if_available():
                machine.reset()
            else:
                del o
                del ota_update
                gc.collect()
        print('Update check complete')
    else:
        print('Wifi OTA update disabled')

def start():
    import uasyncio as asyncio
    import IOTester
    gc.collect()
    from micropython import mem_info
    mem_info()
    asyncio.run(IOTester.fathw.main())


def boot():
    try:
        download_and_install_update_if_available()
    except Exception as e:
        print('OTA Updater', repr(e))
        #raise e

    start()


boot()

