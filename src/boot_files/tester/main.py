import test
import secrets
import ota_update
import machine

def download_and_install_update_if_available():
    o = ota_update.OTAUpdater('https://github.com/PBrunot/IOTestingBoard', github_src_dir='src', main_dir='test', headers={'Authorization': 'token {}'.format(secrets.GITHUB_TOKEN)})
    if o.install_update_if_available_after_boot(secrets.WIFI_SSID, secrets.WIFI_PASSWORD):
        machine.reset()
    if o.check_for_update_to_install_during_next_reboot():
        machine.reset()
        
def start():
    try:
        os.remove("test_results.txt")
    except:
        pass
    asyncio.run(test.main())

def boot():
    try:
        download_and_install_update_if_available()
    except Exception as e:
        print('OTA Updater', repr(e))
    
    start()

boot()