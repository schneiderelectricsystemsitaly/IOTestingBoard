import ujson
from micropython import const

import boardctl


class Settings:
    WIFI = 'WIFI'
    BLUETOOTH = 'BLUETOOTH'
    METER_COMMANDS = 'METER_COMMANDS'
    INITIAL_COMMAND_TYPE = 'INITIAL_COMMAND_TYPE'
    INITIAL_COMMAND_SETPOINT = 'INITIAL_SETPOINT'
    WIFI_NETWORK = 'WIFI_NETWORK'
    WIFI_PASSWORD = 'WIFI_PASSWORD'
    DEEPSLEEP_MIN = 'DEEPSLEEP_MIN'
    THRESHOLD = 'THRESHOLD'
    
    def __init__(self, filename='saved_settings.hex'):
        print('Loading', filename)

        self._db = {}
        self._filename = filename

        try:
            _f = open(filename, "r+b")
            self._db = ujson.load(_f)
            print('Loaded', self._db)
        except OSError:
            print('Creating default settings file')
            self.factory_defaults()
        except Exception as e:
            print('Error while loading', filename, repr(e))
            self.factory_defaults()

    def save_changes(self):

        _f = open(self._filename, "wb")
        ujson.dump(self._db, _f)
        _f.close()

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
        if 0<=idx<16:
            key = Settings.THRESHOLD + str(idx)
            if voltage == 0:
                self.remove_key(key)
            else:
                self.add_key(key, (voltage, ctype, setpoint))
    
    def get_thresholds(self):
        output = []
        for i in range(0,16):
            val = self.get_value(Settings.THRESHOLD + str(i))
            if val is not None:
                output.append(val)
        return val
    
    def factory_defaults(self):
        self.add_key(Settings.WIFI, False)
        self.add_key(Settings.BLUETOOTH, True)
        self.add_key(Settings.METER_COMMANDS, True)
        self.add_key(Settings.INITIAL_COMMAND_TYPE, 1) #bypass
        self.add_key(Settings.INITIAL_COMMAND_SETPOINT, 0xFFF) #R_OPEN
        self.add_key(Settings.WIFI_NETWORK, '')
        self.add_key(Settings.WIFI_PASSWORD, '')
        self.add_key(Settings.DEEPSLEEP_MIN, 15)  # 15 minutes
        self.add_v_threshold(0, 8, 2, 1100)
        self.add_v_threshold(1, 10, 2, 4690)
        self.add_v_threshold(2, 12, 2, 7180)
        self.add_v_threshold(3, 14, 2, 11000)
        self.add_v_threshold(4, 16, 2, 0)
        self.add_v_threshold(5, 18, 3, 550)
        self.add_v_threshold(6, 20, 1, 0xFFFF)
        
    def get_settings(self):
        return self._db.copy()


settings = Settings()
