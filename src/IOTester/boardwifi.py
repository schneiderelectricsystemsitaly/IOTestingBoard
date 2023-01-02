import network
import uasyncio as asyncio
from machine import freq
from micropython import const

from settings.boardsettings import (get_settings, Settings)
from .boardstate import (get_state, update_wifi_state, update_event_time)
from .state import WifiState


async def enable_webrepl():
    if get_state().wifi != WifiState.enabled:
        await enable_wifi()
    freq(240000000)  # Wifi and REPL require more CPU
    import webrepl
    webrepl.start()
    print('Enabled WEBREPL')


def disable_webrepl():
    import webrepl
    webrepl.stop()
    print('Disabled WEBREPL')


async def enable_wifi():
    print(f'** Enabling Wifi')
    sta_if = network.WLAN(network.STA_IF)
    freq(160000000)  # Wifi and REPL require more CPU
    if not sta_if.active():
        await asyncio.sleep_ms(1)
        sta_if.active(True)
        await asyncio.sleep_ms(250)

    settings = get_settings()
    if not sta_if.isconnected():
        sta_if.connect(settings[Settings.WIFI_NETWORK], settings[Settings.WIFI_PASSWORD])

    update_wifi_state(WifiState.enabling)

    MAX_TRIES = const(30)
    cpt = 0
    while not sta_if.isconnected():
        await asyncio.sleep_ms(500)
        cpt += 1
        if cpt > MAX_TRIES:
            break

    if sta_if.isconnected():
        print('Wifi connected', sta_if.ifconfig())
        update_wifi_state(WifiState.enabled)
        return True
    else:
        print('Failure to connect wifi')
        sta_if.active(False)
        update_wifi_state(WifiState.disabled)
        return False


async def disable_wifi():
    print('** Disabling Wifi')
    cpt = 0
    while get_state().wifi == WifiState.enabling and cpt < 31:
        await asyncio.sleep_ms(500)
        cpt += 1
    sta_if = network.WLAN(network.STA_IF)
    sta_if.active(False)
    await asyncio.sleep_ms(100)
    update_wifi_state(WifiState.disabled)
    print('** Disabled Wifi ')
    freq(80000000)  # go back to low frequency
    return True


# callback from button
async def toggle_wifi():
    update_event_time()
    wifi_state = get_state().wifi
    if wifi_state in [WifiState.disabled, WifiState.unknown]:
        return await enable_wifi()
    elif wifi_state == WifiState.enabled:
        return await disable_wifi()
    else:  # enabling
        print(f'Action already in progress (wifi_state:{wifi_state})')
    return False

