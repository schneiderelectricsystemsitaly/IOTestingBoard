import gc

import ujson
from micropython import const

gc.collect()

__settings = None
_AES_KEY = const('IOTesting2023!!!')


class Settings:
    WIFI_ENABLED = 'WIFI'
    BLUETOOTH_ENABLED = 'BLUETOOTH'
    METER_COMMANDS_ENABLED = 'METER_COMMANDS'
    INITIAL_COMMAND_TYPE = 'INITIAL_COMMAND_TYPE'
    INITIAL_COMMAND_SETPOINT = 'INITIAL_SETPOINT'
    WIFI_NETWORK = 'WIFI_NETWORK'
    WIFI_PASSWORD = 'WIFI_PASSWORD'
    DEEPSLEEP_MIN = 'DEEPSLEEP_MIN'
    THRESHOLD = 'THRESHOLD'
    OTA = 'OTA'
    GITHUB_TOKEN = 'GITHUB_TOKEN'
    BLUETOOTH_NAME = 'BLUETOOTH_DEVICE'
    SERIAL = 'SERIAL'
    HW_REV = 'HW_REV'
    DEBUG_MODE = 'DEBUG_MODE'

    def __init__(self, filename='saved_settings.hex'):
        print('Loading', filename)

        self._db = {}
        self._filename = filename

        try:
            with open(filename, "r+b") as _f:
                fc = _f.read()
                _f.close()
            str_contents = Settings.decrypt(fc)
            self._db = ujson.loads(str_contents)
        except OSError as ose:
            print('Creating default settings file', ose)
            self.factory_defaults()
        except Exception as e:
            print('Error while loading', filename, repr(e))
            self.factory_defaults()

        # add new settings defaults after this point
        if Settings.OTA not in self._db:
            self.add_key(Settings.OTA, False)
        if Settings.GITHUB_TOKEN not in self._db:
            self.add_key(Settings.GITHUB_TOKEN, '')
        if Settings.BLUETOOTH_NAME not in self._db:
            self.add_key(Settings.BLUETOOTH_NAME, 'IOTesting')
        if Settings.SERIAL not in self._db:
            self.add_key(Settings.SERIAL, '1')
        if Settings.HW_REV not in self._db:
            self.add_key(Settings.HW_REV, '1.0')
        if Settings.HW_REV not in self._db:
            self.add_key(Settings.DEBUG_MODE, False)

    def save_changes(self):
        file_str = ujson.dumps(self._db)
        with open(self._filename, "wb") as _f:
            _f.write(Settings.encrypt(file_str))
            _f.close()
        gc.collect()

    def add_key(self, key, value):
        if (key in self._db and self._db[key] == value) or value is None:
            return
        self._db[key] = value
        self.save_changes()

    def get_value(self, key):
        if key in self._db:
            return self._db[key]
        return None

    def remove_key(self, key):
        if key in self._db:
            del self._db[key]
            self.save_changes()

    def add_v_threshold(self, idx, voltage, ctype, setpoint):
        if 0 <= idx < 16:
            key = Settings.THRESHOLD + str(idx)
            if voltage == 0:
                self.remove_key(key)
            else:
                self.add_key(key, (voltage, ctype, setpoint))

    def get_thresholds(self):
        output = []
        val = None
        for i in range(0, 16):
            val = self.get_value(Settings.THRESHOLD + str(i))
            if val is not None:
                output.append(val)
        return output

    def factory_defaults(self):
        self.add_key(Settings.WIFI_ENABLED, False)
        self.add_key(Settings.BLUETOOTH_ENABLED, True)
        self.add_key(Settings.METER_COMMANDS_ENABLED, True)
        self.add_key(Settings.INITIAL_COMMAND_TYPE, 1)  # bypass
        self.add_key(Settings.INITIAL_COMMAND_SETPOINT, 0xFFF)  # R_OPEN
        self.add_key(Settings.WIFI_NETWORK, '')
        self.add_key(Settings.WIFI_PASSWORD, '')
        self.add_key(Settings.DEEPSLEEP_MIN, 15)  # 15 minutes
        self.add_v_threshold(0, 3, 2, 1000)
        self.add_v_threshold(1, 4, 2, 4690)
        self.add_v_threshold(2, 5, 2, 7180)
        self.add_v_threshold(3, 6, 2, 11000)
        self.add_v_threshold(4, 7, 2, 0)
        self.add_v_threshold(5, 8, 2, 0xFFFF)
        self.add_v_threshold(6, 9, 3, 550)
        self.add_v_threshold(7, 12, 1, 0xFFFF)
        self.add_key(Settings.OTA, False)
        self.add_key(Settings.GITHUB_TOKEN, '')
        self.add_key(Settings.BLUETOOTH_NAME, 'IOTesting board')
        self.add_key(Settings.SERIAL, '1')

    def __getitem__(self, key):
        return self.get_value(key)

    def __setitem__(self, key, value):
        return self.add_key(key, value)

    @staticmethod
    def encrypt_file():
        import ucryptolib
        enc = ucryptolib.aes(_AES_KEY.encode('utf8'), 1)
        with open('saved_settings.hex', mode='rb') as f:
            data_bytes = f.read()
            f.close()

        # padding
        data_bytes = data_bytes + b'\x00' * ((16 - (len(data_bytes) % 16)) % 16)

        with open('saved_settings.tst', mode='wb') as f:
            f.write(enc.encrypt(data_bytes))
            f.close()

        del enc
        del ucryptolib

    @staticmethod
    def decrypt(data_bytes: bytes) -> str:
        from ucryptolib import aes
        enc = aes(_AES_KEY.encode('utf8'), 1)
        data_bytes = enc.decrypt(data_bytes)
        data_bytes = data_bytes.decode('utf8')
        data_bytes = data_bytes.rstrip('\0')
        del enc
        del aes
        return data_bytes

    @staticmethod
    def encrypt(text_str: str) -> bytes:
        from ucryptolib import aes
        enc = aes(_AES_KEY.encode('utf8'), 1)
        # padding
        data_bytes = text_str.encode('utf8')
        data_bytes = data_bytes + b'\x00' * ((16 - (len(data_bytes) % 16)) % 16)
        data_bytes = enc.encrypt(data_bytes)
        del enc
        del aes
        return data_bytes

    @staticmethod
    def decrypt_test():
        import ucryptolib
        enc = ucryptolib.aes(_AES_KEY.encode('utf8'), 1)
        with open('saved_settings.tst', mode='rb') as f:
            # read all lines at once
            data_bytes = f.read()
            f.close()

        data_bytes = enc.decrypt(data_bytes)
        data_bytes = data_bytes.decode('utf8')
        data_bytes = data_bytes.rstrip('\0')
        with open('saved_settings.hex2', mode='wt') as f:
            f.write(data_bytes)
            f.close()
        del enc
        del ucryptolib


def get_settings():
    global __settings
    if __settings is None:
        __settings = Settings()
        gc.collect()
    return __settings
