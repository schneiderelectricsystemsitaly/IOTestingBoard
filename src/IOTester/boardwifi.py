import network
import uasyncio as asyncio
from machine import freq
from micropython import const

import IOTester.boardsettings as boardsettings
import IOTester.boardstate as boardstate


async def enable_webrepl():
    if boardstate.get_state().wifi != boardstate.WifiState.enabled:
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
    MAX_TRIES = const(30)
    sta_if = network.WLAN(network.STA_IF)
    freq(240000000)  # Wifi and REPL require more CPU
    if not sta_if.active():
        await asyncio.sleep_ms(1)
        sta_if.active(True)
    await asyncio.sleep_ms(250)

    settings = boardsettings.get_settings()
    if not sta_if.isconnected():
        sta_if.connect(settings[boardsettings.Settings.WIFI_NETWORK], settings[boardsettings.Settings.WIFI_PASSWORD])

    boardstate.update_wifi_state(boardstate.WifiState.enabling)
    cpt = 0
    while not sta_if.isconnected():
        await asyncio.sleep_ms(500)
        cpt += 1
        if cpt > MAX_TRIES:
            break
    if sta_if.isconnected():
        print('Wifi connected', sta_if.ifconfig())
        boardstate.update_wifi_state(boardstate.WifiState.enabled)
        return True
    else:
        print('Failure to connect wifi')
        sta_if.active(False)
        boardstate.update_wifi_state(boardstate.WifiState.disabled)
        return False


async def disable_wifi():
    print('** Disabling Wifi')
    cpt = 0
    while boardstate.get_state().wifi == boardstate.WifiState.enabling and cpt < 31:
        await asyncio.sleep_ms(500)
        cpt += 1
    sta_if = network.WLAN(network.STA_IF)
    sta_if.active(False)
    await asyncio.sleep_ms(100)
    boardstate.update_wifi_state(boardstate.WifiState.disabled)
    print('** Disabled Wifi ')
    freq(80000000)  # go back to low frequency
    return True


# callback from button
async def toggle_wifi():
    boardstate.update_event_time()
    wifi_state = boardstate.get_state().wifi
    if wifi_state in [boardstate.WifiState.disabled, boardstate.WifiState.unknown]:
        return await enable_wifi()
    elif wifi_state == boardstate.WifiState.enabled:
        return await disable_wifi()
    else:  # enabling
        print(f'Action already in progress (wifi_state:{wifi_state})')
    return False
