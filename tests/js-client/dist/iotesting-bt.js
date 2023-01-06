(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.IOTestingBT = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

const log = require("loglevel");
const BT = require("./webbluetooth");
const utils = require("./utils");
const State = BT.State;
const btState = BT.btState;

async function Start() {
    log.info("Start called...");

    if (!btState.started) {
        btState.state = State.NOT_CONNECTED;
        BT.stateMachine(); // Start it
    }
    else if (btState.state == State.ERROR) {
        btState.state = State.NOT_CONNECTED; // Try to restart
    }
    await utils.waitFor(() => btState.state == State.IDLE || btState.state == State.STOPPED);
    log.info("Pairing completed, state :", btState.state);
    return (btState.state != State.STOPPED);
}

async function Stop() {
    log.info("Stop request received");

    btState.stopRequest = true;
    await utils.sleep(100);

    while(btState.started || (btState.state != State.STOPPED && btState.state != State.NOT_CONNECTED))
    {
        btState.stopRequest = true;    
        await utils.sleep(100);
    }
    btState.command = null;
    btState.stopRequest = false;
    log.warn("Stopped on request.");
    return true;
}

function SetLogLevel(level) {
    log.setLevel(level, false);
}

exports.Start = Start;
exports.Stop = Stop;
exports.SetLogLevel = SetLogLevel;
exports.btState = BT.btState;
exports.State = BT.State;
exports.SetPacketLog = BT.SetPacketLog;
},{"./utils":3,"./webbluetooth":4,"loglevel":2}],2:[function(require,module,exports){
/*
* loglevel - https://github.com/pimterry/loglevel
*
* Copyright (c) 2013 Tim Perry
* Licensed under the MIT license.
*/
(function (root, definition) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        define(definition);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = definition();
    } else {
        root.log = definition();
    }
}(this, function () {
    "use strict";

    // Slightly dubious tricks to cut down minimized file size
    var noop = function() {};
    var undefinedType = "undefined";
    var isIE = (typeof window !== undefinedType) && (typeof window.navigator !== undefinedType) && (
        /Trident\/|MSIE /.test(window.navigator.userAgent)
    );

    var logMethods = [
        "trace",
        "debug",
        "info",
        "warn",
        "error"
    ];

    // Cross-browser bind equivalent that works at least back to IE6
    function bindMethod(obj, methodName) {
        var method = obj[methodName];
        if (typeof method.bind === 'function') {
            return method.bind(obj);
        } else {
            try {
                return Function.prototype.bind.call(method, obj);
            } catch (e) {
                // Missing bind shim or IE8 + Modernizr, fallback to wrapping
                return function() {
                    return Function.prototype.apply.apply(method, [obj, arguments]);
                };
            }
        }
    }

    // Trace() doesn't print the message in IE, so for that case we need to wrap it
    function traceForIE() {
        if (console.log) {
            if (console.log.apply) {
                console.log.apply(console, arguments);
            } else {
                // In old IE, native console methods themselves don't have apply().
                Function.prototype.apply.apply(console.log, [console, arguments]);
            }
        }
        if (console.trace) console.trace();
    }

    // Build the best logging method possible for this env
    // Wherever possible we want to bind, not wrap, to preserve stack traces
    function realMethod(methodName) {
        if (methodName === 'debug') {
            methodName = 'log';
        }

        if (typeof console === undefinedType) {
            return false; // No method possible, for now - fixed later by enableLoggingWhenConsoleArrives
        } else if (methodName === 'trace' && isIE) {
            return traceForIE;
        } else if (console[methodName] !== undefined) {
            return bindMethod(console, methodName);
        } else if (console.log !== undefined) {
            return bindMethod(console, 'log');
        } else {
            return noop;
        }
    }

    // These private functions always need `this` to be set properly

    function replaceLoggingMethods(level, loggerName) {
        /*jshint validthis:true */
        for (var i = 0; i < logMethods.length; i++) {
            var methodName = logMethods[i];
            this[methodName] = (i < level) ?
                noop :
                this.methodFactory(methodName, level, loggerName);
        }

        // Define log.log as an alias for log.debug
        this.log = this.debug;
    }

    // In old IE versions, the console isn't present until you first open it.
    // We build realMethod() replacements here that regenerate logging methods
    function enableLoggingWhenConsoleArrives(methodName, level, loggerName) {
        return function () {
            if (typeof console !== undefinedType) {
                replaceLoggingMethods.call(this, level, loggerName);
                this[methodName].apply(this, arguments);
            }
        };
    }

    // By default, we use closely bound real methods wherever possible, and
    // otherwise we wait for a console to appear, and then try again.
    function defaultMethodFactory(methodName, level, loggerName) {
        /*jshint validthis:true */
        return realMethod(methodName) ||
               enableLoggingWhenConsoleArrives.apply(this, arguments);
    }

    function Logger(name, defaultLevel, factory) {
      var self = this;
      var currentLevel;
      defaultLevel = defaultLevel == null ? "WARN" : defaultLevel;

      var storageKey = "loglevel";
      if (typeof name === "string") {
        storageKey += ":" + name;
      } else if (typeof name === "symbol") {
        storageKey = undefined;
      }

      function persistLevelIfPossible(levelNum) {
          var levelName = (logMethods[levelNum] || 'silent').toUpperCase();

          if (typeof window === undefinedType || !storageKey) return;

          // Use localStorage if available
          try {
              window.localStorage[storageKey] = levelName;
              return;
          } catch (ignore) {}

          // Use session cookie as fallback
          try {
              window.document.cookie =
                encodeURIComponent(storageKey) + "=" + levelName + ";";
          } catch (ignore) {}
      }

      function getPersistedLevel() {
          var storedLevel;

          if (typeof window === undefinedType || !storageKey) return;

          try {
              storedLevel = window.localStorage[storageKey];
          } catch (ignore) {}

          // Fallback to cookies if local storage gives us nothing
          if (typeof storedLevel === undefinedType) {
              try {
                  var cookie = window.document.cookie;
                  var location = cookie.indexOf(
                      encodeURIComponent(storageKey) + "=");
                  if (location !== -1) {
                      storedLevel = /^([^;]+)/.exec(cookie.slice(location))[1];
                  }
              } catch (ignore) {}
          }

          // If the stored level is not valid, treat it as if nothing was stored.
          if (self.levels[storedLevel] === undefined) {
              storedLevel = undefined;
          }

          return storedLevel;
      }

      function clearPersistedLevel() {
          if (typeof window === undefinedType || !storageKey) return;

          // Use localStorage if available
          try {
              window.localStorage.removeItem(storageKey);
              return;
          } catch (ignore) {}

          // Use session cookie as fallback
          try {
              window.document.cookie =
                encodeURIComponent(storageKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
          } catch (ignore) {}
      }

      /*
       *
       * Public logger API - see https://github.com/pimterry/loglevel for details
       *
       */

      self.name = name;

      self.levels = { "TRACE": 0, "DEBUG": 1, "INFO": 2, "WARN": 3,
          "ERROR": 4, "SILENT": 5};

      self.methodFactory = factory || defaultMethodFactory;

      self.getLevel = function () {
          return currentLevel;
      };

      self.setLevel = function (level, persist) {
          if (typeof level === "string" && self.levels[level.toUpperCase()] !== undefined) {
              level = self.levels[level.toUpperCase()];
          }
          if (typeof level === "number" && level >= 0 && level <= self.levels.SILENT) {
              currentLevel = level;
              if (persist !== false) {  // defaults to true
                  persistLevelIfPossible(level);
              }
              replaceLoggingMethods.call(self, level, name);
              if (typeof console === undefinedType && level < self.levels.SILENT) {
                  return "No console available for logging";
              }
          } else {
              throw "log.setLevel() called with invalid level: " + level;
          }
      };

      self.setDefaultLevel = function (level) {
          defaultLevel = level;
          if (!getPersistedLevel()) {
              self.setLevel(level, false);
          }
      };

      self.resetLevel = function () {
          self.setLevel(defaultLevel, false);
          clearPersistedLevel();
      };

      self.enableAll = function(persist) {
          self.setLevel(self.levels.TRACE, persist);
      };

      self.disableAll = function(persist) {
          self.setLevel(self.levels.SILENT, persist);
      };

      // Initialize with the right level
      var initialLevel = getPersistedLevel();
      if (initialLevel == null) {
          initialLevel = defaultLevel;
      }
      self.setLevel(initialLevel, false);
    }

    /*
     *
     * Top-level API
     *
     */

    var defaultLogger = new Logger();

    var _loggersByName = {};
    defaultLogger.getLogger = function getLogger(name) {
        if ((typeof name !== "symbol" && typeof name !== "string") || name === "") {
          throw new TypeError("You must supply a name when creating a logger.");
        }

        var logger = _loggersByName[name];
        if (!logger) {
          logger = _loggersByName[name] = new Logger(
            name, defaultLogger.getLevel(), defaultLogger.methodFactory);
        }
        return logger;
    };

    // Grab the current global log variable in case of overwrite
    var _log = (typeof window !== undefinedType) ? window.log : undefined;
    defaultLogger.noConflict = function() {
        if (typeof window !== undefinedType &&
               window.log === defaultLogger) {
            window.log = _log;
        }

        return defaultLogger;
    };

    defaultLogger.getLoggers = function getLoggers() {
        return _loggersByName;
    };

    // ES6 default export, for compatibility
    defaultLogger['default'] = defaultLogger;

    return defaultLogger;
}));

},{}],3:[function(require,module,exports){
'use strict';

let sleep = ms => new Promise(r => setTimeout(r, ms));
let waitFor = async function waitFor(f) {
    while (!f()) await sleep(100 + Math.random() * 25);
    return f();
};

let waitForTimeout = async function waitFor(f, timeoutSec) {
    var totalTimeMs = 0;
    while (!f() && totalTimeMs < timeoutSec * 1000) {
        var delayMs = 100 + Math.random() * 25;
        totalTimeMs += delayMs;
        await sleep(delayMs);
    }
    return f();
};

/**
 * Helper function to convert a value into an enum value
 * 
 * @param {type} enumtype
 * @param {number} enumvalue
 */
 function Parse(enumtype, enumvalue) {
    for (var enumName in enumtype) {
        if (enumtype[enumName] == enumvalue) {
            /*jshint -W061 */
            return eval([enumtype + "." + enumName]);
        }
    }
    return null;
}

/**
 * Helper function to dump arraybuffer as hex string
 * @param {ArrayBuffer} buffer
 */
 function buf2hex(buffer) { // buffer is an ArrayBuffer
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join(' ');
}

function hex2buf (input) {
    if (typeof input !== 'string') {
        throw new TypeError('Expected input to be a string')
    }
    var hexstr = input.replace(/\s+/g, '');
    if ((hexstr.length % 2) !== 0) {
        throw new RangeError('Expected string to be an even number of characters')
    }

    const view = new Uint8Array(hexstr.length / 2)

    for (let i = 0; i < hexstr.length; i += 2) {
        view[i / 2] = parseInt(hexstr.substring(i, i + 2), 16)
    }

    return view.buffer
}

module.exports = { sleep, waitFor, waitForTimeout, Parse, buf2hex, hex2buf };
},{}],4:[function(require,module,exports){
'use strict';

/**
 *  Bluetooth handling module, including main state machine loop.
 *  This module interacts with browser for bluetooth comunications and pairing, and with SenecaMSC object.
 */

const log = require('loglevel');
const utils = require('./utils');

var simulation = false;
var logging = false;

/*
 * Bluetooth constants
 */
const BlueTooth = {
    ServiceUuid: '0003cdd5-0000-1000-8000-00805f9b0131', // bluetooth service
    NotificationsUuid: '0003cdd3-0000-1000-8000-00805f9b0131',
    CommandsUuid: '0003cdd4-0000-1000-8000-00805f9b0131',
};

/*
 * Internal state machine descriptions
 */
const State = {
    NOT_CONNECTED: 'Not connected',
    CONNECTING: 'Bluetooth device pairing...',
    DEVICE_PAIRED: 'Device paired',
    SUBSCRIBING: 'Bluetooth interfaces connecting...',
    IDLE: 'Idle',
    BUSY: 'Busy',
    ERROR: 'Error',
    STOPPING: 'Closing BT interfaces...',
    STOPPED: 'Stopped',
    METER_INIT: 'Meter connected',
    METER_INITIALIZING: 'Reading meter state...'
};

class APIState {
    constructor() {
        this.state = State.NOT_CONNECTED;
        this.prev_state = State.NOT_CONNECTED;
        this.state_cpt = 0;

        this.started = false; // State machine status
        this.stopRequest = false; // To request disconnect


        // last notification
        this.response = null;
        this.responseTimeStamp = new Date();
        this.parsedResponse = null;
        this.formattedResponse = '';

        // bluetooth properties
        this.charRead = null;
        this.btService = null;
        this.btDevice = null;

        // general statistics for debugging
        this.stats = {
            "requests": 0,
            "responses": 0,
            "modbus_errors": 0,
            "GATT disconnects": 0,
            "exceptions": 0,
            "subcribes": 0,
            "commands": 0,
            "responseTime": 0.0,
            "lastResponseTime": 0.0,
            "last_connect": new Date(2020, 1, 1).toISOString()
        };

        this.options = {
            "forceDeviceSelection": true
        }
    }
}

let btState = new APIState();

/**
 * Main loop of the meter handler.
 * */
async function stateMachine() {
    var nextAction;
    var DELAY_MS = (simulation ? 20 : 450); // Update the status every X ms.
    var TIMEOUT_MS = (simulation ? 1000 : 30000); // Give up some operations after X ms.
    btState.started = true;

    log.debug("Current state:" + btState.state);

    // Consecutive state counted. Can be used to timeout.
    if (btState.state == btState.prev_state) {
        btState.state_cpt++;
    } else {
        btState.state_cpt = 0;
    }

    // Stop request from API
    if (btState.stopRequest) {
        btState.state = State.STOPPING;
    }

    log.debug("\State:" + btState.state);
    switch (btState.state) {
        case State.NOT_CONNECTED: // initial state on Start()
            if (simulation) {
                nextAction = fakePairDevice;
            } else {
                nextAction = btPairDevice;
            }
            break;
        case State.CONNECTING: // waiting for connection to complete
            nextAction = undefined;
            break;
        case State.DEVICE_PAIRED: // connection complete, acquire meter state
            if (simulation) {
                nextAction = fakeSubscribe;
            } else {
                nextAction = btSubscribe;
            }
            break;
        case State.SUBSCRIBING: // waiting for Bluetooth interfaces
            nextAction = undefined;
            if (btState.state_cpt > (TIMEOUT_MS / DELAY_MS)) {
                // Timeout, try to resubscribe
                log.warn("Timeout in SUBSCRIBING");
                btState.state = State.DEVICE_PAIRED;
                btState.state_cpt = 0;
            }
            break;
        case State.METER_INIT: // ready to communicate, acquire meter status
            nextAction = meterInit;
            break;
        case State.METER_INITIALIZING: // reading the meter status
            if (btState.state_cpt > (TIMEOUT_MS / DELAY_MS)) {
                log.warn("Timeout in METER_INITIALIZING");
                // Timeout, try to resubscribe
                if (simulation) {
                    nextAction = fakeSubscribe;
                } else {
                    nextAction = btSubscribe;
                }
                btState.state_cpt = 0;
            }
            nextAction = undefined;
            break;
        case State.IDLE: // ready to process commands from API
            if (btState.command != null)
                nextAction = processCommand;
            else {
                nextAction = refresh;
            }
            break;
        case State.ERROR: // anytime an error happens
            nextAction = disconnect;
            break;
        case State.BUSY: // while a command in going on
            if (btState.state_cpt > (TIMEOUT_MS / DELAY_MS)) {
                log.warn("Timeout in BUSY");
                // Timeout, try to resubscribe
                if (simulation) {
                    nextAction = fakeSubscribe;
                } else {
                    nextAction = btSubscribe;
                }
                btState.state_cpt = 0;
            }
            nextAction = undefined;
            break;
        case State.STOPPING:
            nextAction = disconnect;
            break;
        case State.STOPPED: // after a disconnector or Stop() request, stops the state machine.
            nextAction = undefined;
            break;
        default:
            break;
    }

    btState.prev_state = btState.state;

    if (nextAction != undefined) {
        log.debug("\tExecuting:" + nextAction.name);
        try {
            await nextAction();
        }
        catch (e) {
            log.error("Exception in state machine", e);
        }
    }
    if (btState.state != State.STOPPED) {
        utils.sleep(DELAY_MS).then(() => stateMachine()); // Recheck status in DELAY_MS ms
    }
    else {
        log.debug("\tTerminating State machine");
        btState.started = false;
    }
}

/**
 * Called from state machine to execute a single command from btState.command property
 * */
async function processCommand() {
    try {
        command.error = false;
        command.pending = false;
        btState.command = null;

        btState.state = State.IDLE;
        log.debug("\t\tCompleted command executed");
    }
    catch (err) {
        log.error("** error while executing command: " + err);
        btState.state = State.METER_INIT;
        btState.stats["exceptions"]++;
        if (err instanceof modbus.ModbusError)
            btState.stats["modbus_errors"]++;
        return;
    }
}


/**
 * Acquire the current mode and serial number of the device.
 * */
async function meterInit() {
    btState.state = State.IDLE;
}

/*
 * Close the bluetooth interface (unpair)
 * */
async function disconnect() {
    btState.command = null;
    try {
        if (btState.btDevice != null) {
            if (btState.btDevice?.gatt?.connected) {
                log.warn("* Calling disconnect on btdevice");
                // Avoid the event firing which may lead to auto-reconnect
                btState.btDevice.removeEventListener('gattserverdisconnected', onDisconnected);
                btState.btDevice.gatt.disconnect();
            }
        }
        btState.btService = null;
    }
    catch { }
    btState.state = State.STOPPED;
}

/**
 * Event called by browser BT api when the device disconnect
 * */
async function onDisconnected() {
    log.warn("* GATT Server disconnected event, will try to reconnect *");
    btState.btService = null;
    btState.stats["GATT disconnects"]++;
    btState.state = State.DEVICE_PAIRED; // Try to auto-reconnect the interfaces without pairing
}

/**
 * Joins the arguments into a single buffer
 * @returns {Buffer} concatenated buffer
 */
function arrayBufferConcat() {
    var length = 0;
    var buffer = null;

    for (var i in arguments) {
        buffer = arguments[i];
        length += buffer.byteLength;
    }

    var joined = new Uint8Array(length);
    var offset = 0;

    for (i in arguments) {
        buffer = arguments[i];
        joined.set(new Uint8Array(buffer), offset);
        offset += buffer.byteLength;
    }

    return joined.buffer;
}

var lastTimeStamp = 0;
/**
 * Event called by bluetooth characteristics when receiving data
 * @param {any} event
 */
function handleNotifications(event) {
    var delay = 0;
    let value = event.target.value;
    if (value != null) {
        log.debug('<< ' + utils.buf2hex(value.buffer));
        if (btState.response != null) {
            btState.response = arrayBufferConcat(btState.response, value.buffer);
        } else {
            btState.response = value.buffer.slice();
        }
        // Keep the event original timestamp !!
        btState.responseTimeStamp = new Date(event.timeStamp);
        if (lastTimeStamp > 0) {
            delay = event.timeStamp - lastTimeStamp; // ms between notifications
        } else {
            delay = 0;
        }
        lastTimeStamp = event.timeStamp;

        parseResponse(btState.response, btState.responseTimeStamp);

        // Log the packets
        if (logging) {
            var packet = { 'notification': utils.buf2hex(btState.response), 'parsed': btState.parsedResponse };
            var packets = window.localStorage.getItem("IOTestingTrace");
            if (packets == null) {
                packets = []; // initialize array
            }
            else {
                packets = JSON.parse(packets); // Restore the json persisted object
            }
            packets.push(packet); // Add the new object
            window.localStorage.setItem("IOTestingTrace", JSON.stringify(packets));
        }
        
        if (delay > 0) {
            btState.stats["lastResponseTime"] = delay;
            btState.stats["responseTime"] = (btState.stats["responseTime"] * (btState.stats["responses"]-1.0) + delay) / btState.stats["responses"];
        }
        btState.stats["responses"]++;

        btState.response = null;
    }
}


function parseResponse(buffer, timestamp) {
    let value = new DataView(buffer);
    var measurement = NaN;
    if (buffer == null || buffer.length < 12)
        return

    var wifi_state = (value.getUint8(0) >> 6) & 3
    var relay_position = (value.getUint8(0) >> 4) & 3
    var bluetooth_state = (value.getUint8(0) >> 1) & 7
    var freq = (value.getUint8(1) >> 5) & 3

    switch(freq) {
        case 1:
            freq = "80 MHz"
            break;
        case 2:
            freq = "160 MHz"
            break;
        case 3:
            freq = "240 MHz"
            break;
        default:
            freq = "? {freq}"
            break;
    }

    var verbose = (value.getUint8(1) & 8) != 0
    var test_mode = (value.getUint8(1) & 4) != 0
    var meter_parallel = (value.getUint8(1) & 2) != 0
    var command_result = (value.getUint8(1) & 1) != 0
    var actual_r = value.getUint16(2, true)
    var setpoint_r = value.getUint16(4, true)
    var mem_free = value.getUint32(6, true)
    var err_board = value.getUint8(10)
    var battery = value.getUint8(11)
    var retval = {'Wifi': wifi_state, 'Bluetooth': bluetooth_state, 'Relay': relay_position, 'Parallel': meter_parallel,
            'Result': command_result, 'R act': actual_r, 'R setpoint': setpoint_r, 'Mem': mem_free,
            'Board err': err_board, 'Battery': battery, 'BT test err': 0,
            'Verbose': verbose, 'Test mode': test_mode, 'Freq': freq}

    btState.formattedResponse = retval;
}


/**
 * This function will succeed only if called as a consequence of a user-gesture
 * E.g. button click. This is due to BlueTooth API security model.
 * */
async function btPairDevice() {
    btState.state = State.CONNECTING;
    var forceSelection = true;
    log.debug("btPairDevice(" + forceSelection + ")");
    try {
        if (typeof (navigator.bluetooth?.getAvailability) == 'function') {
            const availability = await navigator.bluetooth.getAvailability();
            if (!availability) {
                log.error("Bluetooth not available in browser.");
                throw new Error("Browser does not provide bluetooth");
            }
        }
        var device = null;

        // If not, request from user
        if (device == null) {
            device = await navigator.bluetooth
                .requestDevice({
                    acceptAllDevices: false,
                    filters: [{services: [BlueTooth.ServiceUuid]}]
                });
        }
        btState.btDevice = device;
        btState.state = State.DEVICE_PAIRED;
        log.info("Bluetooth device " + device.name + " connected.");
        await utils.sleep(500);
    }
    catch (err) {
        log.warn("** error while connecting: " + err.message);
        btState.btService = null;
        if (btState.charRead != null) {
            try {
                btState.charRead.stopNotifications();
            } catch (error) { }
        }
        btState.charRead = null;
        btState.state = State.ERROR;
        btState.stats["exceptions"]++;
    }
}

async function fakePairDevice() {
    btState.state = State.CONNECTING;
    var forceSelection = true;
    log.debug("fakePairDevice(" + forceSelection + ")");
    try {
        var device = { name: "FakeBTDevice", gatt: { connected: true } };
        btState.btDevice = device;
        btState.state = State.DEVICE_PAIRED;
        log.info("Bluetooth device " + device.name + " connected.");
        await utils.sleep(50);
    }
    catch (err) {
        log.warn("** error while connecting: " + err.message);
        btState.btService = null;
        btState.charRead = null;
        btState.state = State.ERROR;
        btState.stats["exceptions"]++;
    }
}

/**
 * Once the device is available, initialize the service and the 2 characteristics needed.
 * */
async function btSubscribe() {
    try {
        btState.state = State.SUBSCRIBING;
        btState.stats["subcribes"]++;
        let device = btState.btDevice;
        let server = null;

        if (!device?.gatt?.connected) {
            log.debug(`Connecting to GATT Server on ${device.name}...`);
            device.addEventListener('gattserverdisconnected', onDisconnected);
            try {
                if (btState.btService?.connected) {
                    btState.btService.disconnect();
                    btState.btService = null;
                    await utils.sleep(100);
                }
            } catch (err) { }

            server = await device.gatt.connect();
            log.debug('> Found GATT server');
        }
        else {
            log.debug('GATT already connected');
            server = device.gatt;
        }

        btState.btService = await server.getPrimaryService(BlueTooth.ServiceUuid);
        if (btState.btService == null)
            throw new Error("GATT Service request failed");
        log.debug('> Found IOTesting board service');
        btState.charRead = await btState.btService.getCharacteristic(BlueTooth.NotificationsUuid);
        log.debug('> Found notifications characteristic');
        btState.response = null;
        btState.charRead.addEventListener('characteristicvaluechanged', handleNotifications);
        btState.charRead.startNotifications();
        log.info('> Bluetooth interfaces ready.');
        btState.stats["last_connect"] = new Date().toISOString();
        await utils.sleep(50);
        btState.state = State.METER_INIT;
    }
    catch (err) {
        log.warn("** error while subscribing: " + err.message);
        if (btState.charRead != null) {
            try {
                if (btState.btDevice?.gatt?.connected) {
                    btState.charRead.stopNotifications();
                }
                btState.btDevice?.gatt.disconnect();
            } catch (error) { }
        }
        btState.charRead = null;
        btState.state = State.DEVICE_PAIRED;
        btState.stats["exceptions"]++;
    }
}

async function fakeSubscribe() {
    try {
        btState.state = State.SUBSCRIBING;
        btState.stats["subcribes"]++;
        let device = btState.btDevice;
        let server = null;

        if (!device?.gatt?.connected) {
            log.debug(`Connecting to GATT Server on ${device.name}...`);
            device['gatt']['connected'] = true;
            log.debug('> Found GATT server');
        }
        else {
            log.debug('GATT already connected');
            server = device.gatt;
        }

        btState.btService = {};
        log.debug('> Found Serial service');
        btState.charRead = {};
        log.debug('> Found read characteristic');
        btState.response = null;
        log.info('> Bluetooth interfaces ready.');
        btState.stats["last_connect"] = new Date().toISOString();
        await utils.sleep(10);
        btState.state = State.METER_INIT;
    }
    catch (err) {
        log.warn("** error while subscribing: " + err.message);
        btState.charRead = null;
        btState.state = State.DEVICE_PAIRED;
        btState.stats["exceptions"]++;
    }
}


/**
 * When idle, this function is called
 * */
async function refresh() {
    btState.state = State.BUSY;
    // Do something
    btState.state = State.IDLE;
}

function SetSimulation(value) {
    simulation = value;
}

/**
 * Enables or disable writing the notifications into a local storage file
 * @param {boolean} value 
 */
function SetPacketLog(value) {
    logging = value;
}
module.exports = { stateMachine, SetSimulation, btState, State, SetPacketLog };
},{"./utils":3,"loglevel":2}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpb3Rlc3RpbmcuanMiLCJub2RlX21vZHVsZXMvbG9nbGV2ZWwvbGliL2xvZ2xldmVsLmpzIiwidXRpbHMuanMiLCJ3ZWJibHVldG9vdGguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuY29uc3QgbG9nID0gcmVxdWlyZShcImxvZ2xldmVsXCIpO1xyXG5jb25zdCBCVCA9IHJlcXVpcmUoXCIuL3dlYmJsdWV0b290aFwiKTtcclxuY29uc3QgdXRpbHMgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcclxuY29uc3QgU3RhdGUgPSBCVC5TdGF0ZTtcclxuY29uc3QgYnRTdGF0ZSA9IEJULmJ0U3RhdGU7XHJcblxyXG5hc3luYyBmdW5jdGlvbiBTdGFydCgpIHtcclxuICAgIGxvZy5pbmZvKFwiU3RhcnQgY2FsbGVkLi4uXCIpO1xyXG5cclxuICAgIGlmICghYnRTdGF0ZS5zdGFydGVkKSB7XHJcbiAgICAgICAgYnRTdGF0ZS5zdGF0ZSA9IFN0YXRlLk5PVF9DT05ORUNURUQ7XHJcbiAgICAgICAgQlQuc3RhdGVNYWNoaW5lKCk7IC8vIFN0YXJ0IGl0XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChidFN0YXRlLnN0YXRlID09IFN0YXRlLkVSUk9SKSB7XHJcbiAgICAgICAgYnRTdGF0ZS5zdGF0ZSA9IFN0YXRlLk5PVF9DT05ORUNURUQ7IC8vIFRyeSB0byByZXN0YXJ0XHJcbiAgICB9XHJcbiAgICBhd2FpdCB1dGlscy53YWl0Rm9yKCgpID0+IGJ0U3RhdGUuc3RhdGUgPT0gU3RhdGUuSURMRSB8fCBidFN0YXRlLnN0YXRlID09IFN0YXRlLlNUT1BQRUQpO1xyXG4gICAgbG9nLmluZm8oXCJQYWlyaW5nIGNvbXBsZXRlZCwgc3RhdGUgOlwiLCBidFN0YXRlLnN0YXRlKTtcclxuICAgIHJldHVybiAoYnRTdGF0ZS5zdGF0ZSAhPSBTdGF0ZS5TVE9QUEVEKTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gU3RvcCgpIHtcclxuICAgIGxvZy5pbmZvKFwiU3RvcCByZXF1ZXN0IHJlY2VpdmVkXCIpO1xyXG5cclxuICAgIGJ0U3RhdGUuc3RvcFJlcXVlc3QgPSB0cnVlO1xyXG4gICAgYXdhaXQgdXRpbHMuc2xlZXAoMTAwKTtcclxuXHJcbiAgICB3aGlsZShidFN0YXRlLnN0YXJ0ZWQgfHwgKGJ0U3RhdGUuc3RhdGUgIT0gU3RhdGUuU1RPUFBFRCAmJiBidFN0YXRlLnN0YXRlICE9IFN0YXRlLk5PVF9DT05ORUNURUQpKVxyXG4gICAge1xyXG4gICAgICAgIGJ0U3RhdGUuc3RvcFJlcXVlc3QgPSB0cnVlOyAgICBcclxuICAgICAgICBhd2FpdCB1dGlscy5zbGVlcCgxMDApO1xyXG4gICAgfVxyXG4gICAgYnRTdGF0ZS5jb21tYW5kID0gbnVsbDtcclxuICAgIGJ0U3RhdGUuc3RvcFJlcXVlc3QgPSBmYWxzZTtcclxuICAgIGxvZy53YXJuKFwiU3RvcHBlZCBvbiByZXF1ZXN0LlwiKTtcclxuICAgIHJldHVybiB0cnVlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBTZXRMb2dMZXZlbChsZXZlbCkge1xyXG4gICAgbG9nLnNldExldmVsKGxldmVsLCBmYWxzZSk7XHJcbn1cclxuXHJcbmV4cG9ydHMuU3RhcnQgPSBTdGFydDtcclxuZXhwb3J0cy5TdG9wID0gU3RvcDtcclxuZXhwb3J0cy5TZXRMb2dMZXZlbCA9IFNldExvZ0xldmVsO1xyXG5leHBvcnRzLmJ0U3RhdGUgPSBCVC5idFN0YXRlO1xyXG5leHBvcnRzLlN0YXRlID0gQlQuU3RhdGU7XHJcbmV4cG9ydHMuU2V0UGFja2V0TG9nID0gQlQuU2V0UGFja2V0TG9nOyIsIi8qXG4qIGxvZ2xldmVsIC0gaHR0cHM6Ly9naXRodWIuY29tL3BpbXRlcnJ5L2xvZ2xldmVsXG4qXG4qIENvcHlyaWdodCAoYykgMjAxMyBUaW0gUGVycnlcbiogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuKi9cbihmdW5jdGlvbiAocm9vdCwgZGVmaW5pdGlvbikge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKGRlZmluaXRpb24pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBkZWZpbml0aW9uKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcm9vdC5sb2cgPSBkZWZpbml0aW9uKCk7XG4gICAgfVxufSh0aGlzLCBmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICAvLyBTbGlnaHRseSBkdWJpb3VzIHRyaWNrcyB0byBjdXQgZG93biBtaW5pbWl6ZWQgZmlsZSBzaXplXG4gICAgdmFyIG5vb3AgPSBmdW5jdGlvbigpIHt9O1xuICAgIHZhciB1bmRlZmluZWRUeXBlID0gXCJ1bmRlZmluZWRcIjtcbiAgICB2YXIgaXNJRSA9ICh0eXBlb2Ygd2luZG93ICE9PSB1bmRlZmluZWRUeXBlKSAmJiAodHlwZW9mIHdpbmRvdy5uYXZpZ2F0b3IgIT09IHVuZGVmaW5lZFR5cGUpICYmIChcbiAgICAgICAgL1RyaWRlbnRcXC98TVNJRSAvLnRlc3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpXG4gICAgKTtcblxuICAgIHZhciBsb2dNZXRob2RzID0gW1xuICAgICAgICBcInRyYWNlXCIsXG4gICAgICAgIFwiZGVidWdcIixcbiAgICAgICAgXCJpbmZvXCIsXG4gICAgICAgIFwid2FyblwiLFxuICAgICAgICBcImVycm9yXCJcbiAgICBdO1xuXG4gICAgLy8gQ3Jvc3MtYnJvd3NlciBiaW5kIGVxdWl2YWxlbnQgdGhhdCB3b3JrcyBhdCBsZWFzdCBiYWNrIHRvIElFNlxuICAgIGZ1bmN0aW9uIGJpbmRNZXRob2Qob2JqLCBtZXRob2ROYW1lKSB7XG4gICAgICAgIHZhciBtZXRob2QgPSBvYmpbbWV0aG9kTmFtZV07XG4gICAgICAgIGlmICh0eXBlb2YgbWV0aG9kLmJpbmQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJldHVybiBtZXRob2QuYmluZChvYmopO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQuY2FsbChtZXRob2QsIG9iaik7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgLy8gTWlzc2luZyBiaW5kIHNoaW0gb3IgSUU4ICsgTW9kZXJuaXpyLCBmYWxsYmFjayB0byB3cmFwcGluZ1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseS5hcHBseShtZXRob2QsIFtvYmosIGFyZ3VtZW50c10pO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUcmFjZSgpIGRvZXNuJ3QgcHJpbnQgdGhlIG1lc3NhZ2UgaW4gSUUsIHNvIGZvciB0aGF0IGNhc2Ugd2UgbmVlZCB0byB3cmFwIGl0XG4gICAgZnVuY3Rpb24gdHJhY2VGb3JJRSgpIHtcbiAgICAgICAgaWYgKGNvbnNvbGUubG9nKSB7XG4gICAgICAgICAgICBpZiAoY29uc29sZS5sb2cuYXBwbHkpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBJbiBvbGQgSUUsIG5hdGl2ZSBjb25zb2xlIG1ldGhvZHMgdGhlbXNlbHZlcyBkb24ndCBoYXZlIGFwcGx5KCkuXG4gICAgICAgICAgICAgICAgRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5LmFwcGx5KGNvbnNvbGUubG9nLCBbY29uc29sZSwgYXJndW1lbnRzXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbnNvbGUudHJhY2UpIGNvbnNvbGUudHJhY2UoKTtcbiAgICB9XG5cbiAgICAvLyBCdWlsZCB0aGUgYmVzdCBsb2dnaW5nIG1ldGhvZCBwb3NzaWJsZSBmb3IgdGhpcyBlbnZcbiAgICAvLyBXaGVyZXZlciBwb3NzaWJsZSB3ZSB3YW50IHRvIGJpbmQsIG5vdCB3cmFwLCB0byBwcmVzZXJ2ZSBzdGFjayB0cmFjZXNcbiAgICBmdW5jdGlvbiByZWFsTWV0aG9kKG1ldGhvZE5hbWUpIHtcbiAgICAgICAgaWYgKG1ldGhvZE5hbWUgPT09ICdkZWJ1ZycpIHtcbiAgICAgICAgICAgIG1ldGhvZE5hbWUgPSAnbG9nJztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY29uc29sZSA9PT0gdW5kZWZpbmVkVHlwZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBObyBtZXRob2QgcG9zc2libGUsIGZvciBub3cgLSBmaXhlZCBsYXRlciBieSBlbmFibGVMb2dnaW5nV2hlbkNvbnNvbGVBcnJpdmVzXG4gICAgICAgIH0gZWxzZSBpZiAobWV0aG9kTmFtZSA9PT0gJ3RyYWNlJyAmJiBpc0lFKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJhY2VGb3JJRTtcbiAgICAgICAgfSBlbHNlIGlmIChjb25zb2xlW21ldGhvZE5hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBiaW5kTWV0aG9kKGNvbnNvbGUsIG1ldGhvZE5hbWUpO1xuICAgICAgICB9IGVsc2UgaWYgKGNvbnNvbGUubG9nICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBiaW5kTWV0aG9kKGNvbnNvbGUsICdsb2cnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBub29wO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gVGhlc2UgcHJpdmF0ZSBmdW5jdGlvbnMgYWx3YXlzIG5lZWQgYHRoaXNgIHRvIGJlIHNldCBwcm9wZXJseVxuXG4gICAgZnVuY3Rpb24gcmVwbGFjZUxvZ2dpbmdNZXRob2RzKGxldmVsLCBsb2dnZXJOYW1lKSB7XG4gICAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbG9nTWV0aG9kcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG1ldGhvZE5hbWUgPSBsb2dNZXRob2RzW2ldO1xuICAgICAgICAgICAgdGhpc1ttZXRob2ROYW1lXSA9IChpIDwgbGV2ZWwpID9cbiAgICAgICAgICAgICAgICBub29wIDpcbiAgICAgICAgICAgICAgICB0aGlzLm1ldGhvZEZhY3RvcnkobWV0aG9kTmFtZSwgbGV2ZWwsIGxvZ2dlck5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGVmaW5lIGxvZy5sb2cgYXMgYW4gYWxpYXMgZm9yIGxvZy5kZWJ1Z1xuICAgICAgICB0aGlzLmxvZyA9IHRoaXMuZGVidWc7XG4gICAgfVxuXG4gICAgLy8gSW4gb2xkIElFIHZlcnNpb25zLCB0aGUgY29uc29sZSBpc24ndCBwcmVzZW50IHVudGlsIHlvdSBmaXJzdCBvcGVuIGl0LlxuICAgIC8vIFdlIGJ1aWxkIHJlYWxNZXRob2QoKSByZXBsYWNlbWVudHMgaGVyZSB0aGF0IHJlZ2VuZXJhdGUgbG9nZ2luZyBtZXRob2RzXG4gICAgZnVuY3Rpb24gZW5hYmxlTG9nZ2luZ1doZW5Db25zb2xlQXJyaXZlcyhtZXRob2ROYW1lLCBsZXZlbCwgbG9nZ2VyTmFtZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSB1bmRlZmluZWRUeXBlKSB7XG4gICAgICAgICAgICAgICAgcmVwbGFjZUxvZ2dpbmdNZXRob2RzLmNhbGwodGhpcywgbGV2ZWwsIGxvZ2dlck5hbWUpO1xuICAgICAgICAgICAgICAgIHRoaXNbbWV0aG9kTmFtZV0uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBCeSBkZWZhdWx0LCB3ZSB1c2UgY2xvc2VseSBib3VuZCByZWFsIG1ldGhvZHMgd2hlcmV2ZXIgcG9zc2libGUsIGFuZFxuICAgIC8vIG90aGVyd2lzZSB3ZSB3YWl0IGZvciBhIGNvbnNvbGUgdG8gYXBwZWFyLCBhbmQgdGhlbiB0cnkgYWdhaW4uXG4gICAgZnVuY3Rpb24gZGVmYXVsdE1ldGhvZEZhY3RvcnkobWV0aG9kTmFtZSwgbGV2ZWwsIGxvZ2dlck5hbWUpIHtcbiAgICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgICAgcmV0dXJuIHJlYWxNZXRob2QobWV0aG9kTmFtZSkgfHxcbiAgICAgICAgICAgICAgIGVuYWJsZUxvZ2dpbmdXaGVuQ29uc29sZUFycml2ZXMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBMb2dnZXIobmFtZSwgZGVmYXVsdExldmVsLCBmYWN0b3J5KSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgY3VycmVudExldmVsO1xuICAgICAgZGVmYXVsdExldmVsID0gZGVmYXVsdExldmVsID09IG51bGwgPyBcIldBUk5cIiA6IGRlZmF1bHRMZXZlbDtcblxuICAgICAgdmFyIHN0b3JhZ2VLZXkgPSBcImxvZ2xldmVsXCI7XG4gICAgICBpZiAodHlwZW9mIG5hbWUgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgc3RvcmFnZUtleSArPSBcIjpcIiArIG5hbWU7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBuYW1lID09PSBcInN5bWJvbFwiKSB7XG4gICAgICAgIHN0b3JhZ2VLZXkgPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHBlcnNpc3RMZXZlbElmUG9zc2libGUobGV2ZWxOdW0pIHtcbiAgICAgICAgICB2YXIgbGV2ZWxOYW1lID0gKGxvZ01ldGhvZHNbbGV2ZWxOdW1dIHx8ICdzaWxlbnQnKS50b1VwcGVyQ2FzZSgpO1xuXG4gICAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09IHVuZGVmaW5lZFR5cGUgfHwgIXN0b3JhZ2VLZXkpIHJldHVybjtcblxuICAgICAgICAgIC8vIFVzZSBsb2NhbFN0b3JhZ2UgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZVtzdG9yYWdlS2V5XSA9IGxldmVsTmFtZTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cblxuICAgICAgICAgIC8vIFVzZSBzZXNzaW9uIGNvb2tpZSBhcyBmYWxsYmFja1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHdpbmRvdy5kb2N1bWVudC5jb29raWUgPVxuICAgICAgICAgICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChzdG9yYWdlS2V5KSArIFwiPVwiICsgbGV2ZWxOYW1lICsgXCI7XCI7XG4gICAgICAgICAgfSBjYXRjaCAoaWdub3JlKSB7fVxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBnZXRQZXJzaXN0ZWRMZXZlbCgpIHtcbiAgICAgICAgICB2YXIgc3RvcmVkTGV2ZWw7XG5cbiAgICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gdW5kZWZpbmVkVHlwZSB8fCAhc3RvcmFnZUtleSkgcmV0dXJuO1xuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgc3RvcmVkTGV2ZWwgPSB3aW5kb3cubG9jYWxTdG9yYWdlW3N0b3JhZ2VLZXldO1xuICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cblxuICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIGNvb2tpZXMgaWYgbG9jYWwgc3RvcmFnZSBnaXZlcyB1cyBub3RoaW5nXG4gICAgICAgICAgaWYgKHR5cGVvZiBzdG9yZWRMZXZlbCA9PT0gdW5kZWZpbmVkVHlwZSkge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgdmFyIGNvb2tpZSA9IHdpbmRvdy5kb2N1bWVudC5jb29raWU7XG4gICAgICAgICAgICAgICAgICB2YXIgbG9jYXRpb24gPSBjb29raWUuaW5kZXhPZihcbiAgICAgICAgICAgICAgICAgICAgICBlbmNvZGVVUklDb21wb25lbnQoc3RvcmFnZUtleSkgKyBcIj1cIik7XG4gICAgICAgICAgICAgICAgICBpZiAobG9jYXRpb24gIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgc3RvcmVkTGV2ZWwgPSAvXihbXjtdKykvLmV4ZWMoY29va2llLnNsaWNlKGxvY2F0aW9uKSlbMV07XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBJZiB0aGUgc3RvcmVkIGxldmVsIGlzIG5vdCB2YWxpZCwgdHJlYXQgaXQgYXMgaWYgbm90aGluZyB3YXMgc3RvcmVkLlxuICAgICAgICAgIGlmIChzZWxmLmxldmVsc1tzdG9yZWRMZXZlbF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBzdG9yZWRMZXZlbCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gc3RvcmVkTGV2ZWw7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNsZWFyUGVyc2lzdGVkTGV2ZWwoKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09IHVuZGVmaW5lZFR5cGUgfHwgIXN0b3JhZ2VLZXkpIHJldHVybjtcblxuICAgICAgICAgIC8vIFVzZSBsb2NhbFN0b3JhZ2UgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHN0b3JhZ2VLZXkpO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfSBjYXRjaCAoaWdub3JlKSB7fVxuXG4gICAgICAgICAgLy8gVXNlIHNlc3Npb24gY29va2llIGFzIGZhbGxiYWNrXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgd2luZG93LmRvY3VtZW50LmNvb2tpZSA9XG4gICAgICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHN0b3JhZ2VLZXkpICsgXCI9OyBleHBpcmVzPVRodSwgMDEgSmFuIDE5NzAgMDA6MDA6MDAgVVRDXCI7XG4gICAgICAgICAgfSBjYXRjaCAoaWdub3JlKSB7fVxuICAgICAgfVxuXG4gICAgICAvKlxuICAgICAgICpcbiAgICAgICAqIFB1YmxpYyBsb2dnZXIgQVBJIC0gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9waW10ZXJyeS9sb2dsZXZlbCBmb3IgZGV0YWlsc1xuICAgICAgICpcbiAgICAgICAqL1xuXG4gICAgICBzZWxmLm5hbWUgPSBuYW1lO1xuXG4gICAgICBzZWxmLmxldmVscyA9IHsgXCJUUkFDRVwiOiAwLCBcIkRFQlVHXCI6IDEsIFwiSU5GT1wiOiAyLCBcIldBUk5cIjogMyxcbiAgICAgICAgICBcIkVSUk9SXCI6IDQsIFwiU0lMRU5UXCI6IDV9O1xuXG4gICAgICBzZWxmLm1ldGhvZEZhY3RvcnkgPSBmYWN0b3J5IHx8IGRlZmF1bHRNZXRob2RGYWN0b3J5O1xuXG4gICAgICBzZWxmLmdldExldmVsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiBjdXJyZW50TGV2ZWw7XG4gICAgICB9O1xuXG4gICAgICBzZWxmLnNldExldmVsID0gZnVuY3Rpb24gKGxldmVsLCBwZXJzaXN0KSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBsZXZlbCA9PT0gXCJzdHJpbmdcIiAmJiBzZWxmLmxldmVsc1tsZXZlbC50b1VwcGVyQ2FzZSgpXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIGxldmVsID0gc2VsZi5sZXZlbHNbbGV2ZWwudG9VcHBlckNhc2UoKV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgbGV2ZWwgPT09IFwibnVtYmVyXCIgJiYgbGV2ZWwgPj0gMCAmJiBsZXZlbCA8PSBzZWxmLmxldmVscy5TSUxFTlQpIHtcbiAgICAgICAgICAgICAgY3VycmVudExldmVsID0gbGV2ZWw7XG4gICAgICAgICAgICAgIGlmIChwZXJzaXN0ICE9PSBmYWxzZSkgeyAgLy8gZGVmYXVsdHMgdG8gdHJ1ZVxuICAgICAgICAgICAgICAgICAgcGVyc2lzdExldmVsSWZQb3NzaWJsZShsZXZlbCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVwbGFjZUxvZ2dpbmdNZXRob2RzLmNhbGwoc2VsZiwgbGV2ZWwsIG5hbWUpO1xuICAgICAgICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgPT09IHVuZGVmaW5lZFR5cGUgJiYgbGV2ZWwgPCBzZWxmLmxldmVscy5TSUxFTlQpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBcIk5vIGNvbnNvbGUgYXZhaWxhYmxlIGZvciBsb2dnaW5nXCI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBcImxvZy5zZXRMZXZlbCgpIGNhbGxlZCB3aXRoIGludmFsaWQgbGV2ZWw6IFwiICsgbGV2ZWw7XG4gICAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgc2VsZi5zZXREZWZhdWx0TGV2ZWwgPSBmdW5jdGlvbiAobGV2ZWwpIHtcbiAgICAgICAgICBkZWZhdWx0TGV2ZWwgPSBsZXZlbDtcbiAgICAgICAgICBpZiAoIWdldFBlcnNpc3RlZExldmVsKCkpIHtcbiAgICAgICAgICAgICAgc2VsZi5zZXRMZXZlbChsZXZlbCwgZmFsc2UpO1xuICAgICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHNlbGYucmVzZXRMZXZlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBzZWxmLnNldExldmVsKGRlZmF1bHRMZXZlbCwgZmFsc2UpO1xuICAgICAgICAgIGNsZWFyUGVyc2lzdGVkTGV2ZWwoKTtcbiAgICAgIH07XG5cbiAgICAgIHNlbGYuZW5hYmxlQWxsID0gZnVuY3Rpb24ocGVyc2lzdCkge1xuICAgICAgICAgIHNlbGYuc2V0TGV2ZWwoc2VsZi5sZXZlbHMuVFJBQ0UsIHBlcnNpc3QpO1xuICAgICAgfTtcblxuICAgICAgc2VsZi5kaXNhYmxlQWxsID0gZnVuY3Rpb24ocGVyc2lzdCkge1xuICAgICAgICAgIHNlbGYuc2V0TGV2ZWwoc2VsZi5sZXZlbHMuU0lMRU5ULCBwZXJzaXN0KTtcbiAgICAgIH07XG5cbiAgICAgIC8vIEluaXRpYWxpemUgd2l0aCB0aGUgcmlnaHQgbGV2ZWxcbiAgICAgIHZhciBpbml0aWFsTGV2ZWwgPSBnZXRQZXJzaXN0ZWRMZXZlbCgpO1xuICAgICAgaWYgKGluaXRpYWxMZXZlbCA9PSBudWxsKSB7XG4gICAgICAgICAgaW5pdGlhbExldmVsID0gZGVmYXVsdExldmVsO1xuICAgICAgfVxuICAgICAgc2VsZi5zZXRMZXZlbChpbml0aWFsTGV2ZWwsIGZhbHNlKTtcbiAgICB9XG5cbiAgICAvKlxuICAgICAqXG4gICAgICogVG9wLWxldmVsIEFQSVxuICAgICAqXG4gICAgICovXG5cbiAgICB2YXIgZGVmYXVsdExvZ2dlciA9IG5ldyBMb2dnZXIoKTtcblxuICAgIHZhciBfbG9nZ2Vyc0J5TmFtZSA9IHt9O1xuICAgIGRlZmF1bHRMb2dnZXIuZ2V0TG9nZ2VyID0gZnVuY3Rpb24gZ2V0TG9nZ2VyKG5hbWUpIHtcbiAgICAgICAgaWYgKCh0eXBlb2YgbmFtZSAhPT0gXCJzeW1ib2xcIiAmJiB0eXBlb2YgbmFtZSAhPT0gXCJzdHJpbmdcIikgfHwgbmFtZSA9PT0gXCJcIikge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJZb3UgbXVzdCBzdXBwbHkgYSBuYW1lIHdoZW4gY3JlYXRpbmcgYSBsb2dnZXIuXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGxvZ2dlciA9IF9sb2dnZXJzQnlOYW1lW25hbWVdO1xuICAgICAgICBpZiAoIWxvZ2dlcikge1xuICAgICAgICAgIGxvZ2dlciA9IF9sb2dnZXJzQnlOYW1lW25hbWVdID0gbmV3IExvZ2dlcihcbiAgICAgICAgICAgIG5hbWUsIGRlZmF1bHRMb2dnZXIuZ2V0TGV2ZWwoKSwgZGVmYXVsdExvZ2dlci5tZXRob2RGYWN0b3J5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbG9nZ2VyO1xuICAgIH07XG5cbiAgICAvLyBHcmFiIHRoZSBjdXJyZW50IGdsb2JhbCBsb2cgdmFyaWFibGUgaW4gY2FzZSBvZiBvdmVyd3JpdGVcbiAgICB2YXIgX2xvZyA9ICh0eXBlb2Ygd2luZG93ICE9PSB1bmRlZmluZWRUeXBlKSA/IHdpbmRvdy5sb2cgOiB1bmRlZmluZWQ7XG4gICAgZGVmYXVsdExvZ2dlci5ub0NvbmZsaWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSB1bmRlZmluZWRUeXBlICYmXG4gICAgICAgICAgICAgICB3aW5kb3cubG9nID09PSBkZWZhdWx0TG9nZ2VyKSB7XG4gICAgICAgICAgICB3aW5kb3cubG9nID0gX2xvZztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBkZWZhdWx0TG9nZ2VyO1xuICAgIH07XG5cbiAgICBkZWZhdWx0TG9nZ2VyLmdldExvZ2dlcnMgPSBmdW5jdGlvbiBnZXRMb2dnZXJzKCkge1xuICAgICAgICByZXR1cm4gX2xvZ2dlcnNCeU5hbWU7XG4gICAgfTtcblxuICAgIC8vIEVTNiBkZWZhdWx0IGV4cG9ydCwgZm9yIGNvbXBhdGliaWxpdHlcbiAgICBkZWZhdWx0TG9nZ2VyWydkZWZhdWx0J10gPSBkZWZhdWx0TG9nZ2VyO1xuXG4gICAgcmV0dXJuIGRlZmF1bHRMb2dnZXI7XG59KSk7XG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG5sZXQgc2xlZXAgPSBtcyA9PiBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgbXMpKTtcclxubGV0IHdhaXRGb3IgPSBhc3luYyBmdW5jdGlvbiB3YWl0Rm9yKGYpIHtcclxuICAgIHdoaWxlICghZigpKSBhd2FpdCBzbGVlcCgxMDAgKyBNYXRoLnJhbmRvbSgpICogMjUpO1xyXG4gICAgcmV0dXJuIGYoKTtcclxufTtcclxuXHJcbmxldCB3YWl0Rm9yVGltZW91dCA9IGFzeW5jIGZ1bmN0aW9uIHdhaXRGb3IoZiwgdGltZW91dFNlYykge1xyXG4gICAgdmFyIHRvdGFsVGltZU1zID0gMDtcclxuICAgIHdoaWxlICghZigpICYmIHRvdGFsVGltZU1zIDwgdGltZW91dFNlYyAqIDEwMDApIHtcclxuICAgICAgICB2YXIgZGVsYXlNcyA9IDEwMCArIE1hdGgucmFuZG9tKCkgKiAyNTtcclxuICAgICAgICB0b3RhbFRpbWVNcyArPSBkZWxheU1zO1xyXG4gICAgICAgIGF3YWl0IHNsZWVwKGRlbGF5TXMpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGYoKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gY29udmVydCBhIHZhbHVlIGludG8gYW4gZW51bSB2YWx1ZVxyXG4gKiBcclxuICogQHBhcmFtIHt0eXBlfSBlbnVtdHlwZVxyXG4gKiBAcGFyYW0ge251bWJlcn0gZW51bXZhbHVlXHJcbiAqL1xyXG4gZnVuY3Rpb24gUGFyc2UoZW51bXR5cGUsIGVudW12YWx1ZSkge1xyXG4gICAgZm9yICh2YXIgZW51bU5hbWUgaW4gZW51bXR5cGUpIHtcclxuICAgICAgICBpZiAoZW51bXR5cGVbZW51bU5hbWVdID09IGVudW12YWx1ZSkge1xyXG4gICAgICAgICAgICAvKmpzaGludCAtVzA2MSAqL1xyXG4gICAgICAgICAgICByZXR1cm4gZXZhbChbZW51bXR5cGUgKyBcIi5cIiArIGVudW1OYW1lXSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGw7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gZHVtcCBhcnJheWJ1ZmZlciBhcyBoZXggc3RyaW5nXHJcbiAqIEBwYXJhbSB7QXJyYXlCdWZmZXJ9IGJ1ZmZlclxyXG4gKi9cclxuIGZ1bmN0aW9uIGJ1ZjJoZXgoYnVmZmVyKSB7IC8vIGJ1ZmZlciBpcyBhbiBBcnJheUJ1ZmZlclxyXG4gICAgcmV0dXJuIFsuLi5uZXcgVWludDhBcnJheShidWZmZXIpXVxyXG4gICAgICAgIC5tYXAoeCA9PiB4LnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpKVxyXG4gICAgICAgIC5qb2luKCcgJyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhleDJidWYgKGlucHV0KSB7XHJcbiAgICBpZiAodHlwZW9mIGlucHV0ICE9PSAnc3RyaW5nJykge1xyXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGlucHV0IHRvIGJlIGEgc3RyaW5nJylcclxuICAgIH1cclxuICAgIHZhciBoZXhzdHIgPSBpbnB1dC5yZXBsYWNlKC9cXHMrL2csICcnKTtcclxuICAgIGlmICgoaGV4c3RyLmxlbmd0aCAlIDIpICE9PSAwKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0V4cGVjdGVkIHN0cmluZyB0byBiZSBhbiBldmVuIG51bWJlciBvZiBjaGFyYWN0ZXJzJylcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoaGV4c3RyLmxlbmd0aCAvIDIpXHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBoZXhzdHIubGVuZ3RoOyBpICs9IDIpIHtcclxuICAgICAgICB2aWV3W2kgLyAyXSA9IHBhcnNlSW50KGhleHN0ci5zdWJzdHJpbmcoaSwgaSArIDIpLCAxNilcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlldy5idWZmZXJcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7IHNsZWVwLCB3YWl0Rm9yLCB3YWl0Rm9yVGltZW91dCwgUGFyc2UsIGJ1ZjJoZXgsIGhleDJidWYgfTsiLCIndXNlIHN0cmljdCc7XHJcblxyXG4vKipcclxuICogIEJsdWV0b290aCBoYW5kbGluZyBtb2R1bGUsIGluY2x1ZGluZyBtYWluIHN0YXRlIG1hY2hpbmUgbG9vcC5cclxuICogIFRoaXMgbW9kdWxlIGludGVyYWN0cyB3aXRoIGJyb3dzZXIgZm9yIGJsdWV0b290aCBjb211bmljYXRpb25zIGFuZCBwYWlyaW5nLCBhbmQgd2l0aCBTZW5lY2FNU0Mgb2JqZWN0LlxyXG4gKi9cclxuXHJcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZ2xldmVsJyk7XHJcbmNvbnN0IHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xyXG5cclxudmFyIHNpbXVsYXRpb24gPSBmYWxzZTtcclxudmFyIGxvZ2dpbmcgPSBmYWxzZTtcclxuXHJcbi8qXHJcbiAqIEJsdWV0b290aCBjb25zdGFudHNcclxuICovXHJcbmNvbnN0IEJsdWVUb290aCA9IHtcclxuICAgIFNlcnZpY2VVdWlkOiAnMDAwM2NkZDUtMDAwMC0xMDAwLTgwMDAtMDA4MDVmOWIwMTMxJywgLy8gYmx1ZXRvb3RoIHNlcnZpY2VcclxuICAgIE5vdGlmaWNhdGlvbnNVdWlkOiAnMDAwM2NkZDMtMDAwMC0xMDAwLTgwMDAtMDA4MDVmOWIwMTMxJyxcclxuICAgIENvbW1hbmRzVXVpZDogJzAwMDNjZGQ0LTAwMDAtMTAwMC04MDAwLTAwODA1ZjliMDEzMScsXHJcbn07XHJcblxyXG4vKlxyXG4gKiBJbnRlcm5hbCBzdGF0ZSBtYWNoaW5lIGRlc2NyaXB0aW9uc1xyXG4gKi9cclxuY29uc3QgU3RhdGUgPSB7XHJcbiAgICBOT1RfQ09OTkVDVEVEOiAnTm90IGNvbm5lY3RlZCcsXHJcbiAgICBDT05ORUNUSU5HOiAnQmx1ZXRvb3RoIGRldmljZSBwYWlyaW5nLi4uJyxcclxuICAgIERFVklDRV9QQUlSRUQ6ICdEZXZpY2UgcGFpcmVkJyxcclxuICAgIFNVQlNDUklCSU5HOiAnQmx1ZXRvb3RoIGludGVyZmFjZXMgY29ubmVjdGluZy4uLicsXHJcbiAgICBJRExFOiAnSWRsZScsXHJcbiAgICBCVVNZOiAnQnVzeScsXHJcbiAgICBFUlJPUjogJ0Vycm9yJyxcclxuICAgIFNUT1BQSU5HOiAnQ2xvc2luZyBCVCBpbnRlcmZhY2VzLi4uJyxcclxuICAgIFNUT1BQRUQ6ICdTdG9wcGVkJyxcclxuICAgIE1FVEVSX0lOSVQ6ICdNZXRlciBjb25uZWN0ZWQnLFxyXG4gICAgTUVURVJfSU5JVElBTElaSU5HOiAnUmVhZGluZyBtZXRlciBzdGF0ZS4uLidcclxufTtcclxuXHJcbmNsYXNzIEFQSVN0YXRlIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBTdGF0ZS5OT1RfQ09OTkVDVEVEO1xyXG4gICAgICAgIHRoaXMucHJldl9zdGF0ZSA9IFN0YXRlLk5PVF9DT05ORUNURUQ7XHJcbiAgICAgICAgdGhpcy5zdGF0ZV9jcHQgPSAwO1xyXG5cclxuICAgICAgICB0aGlzLnN0YXJ0ZWQgPSBmYWxzZTsgLy8gU3RhdGUgbWFjaGluZSBzdGF0dXNcclxuICAgICAgICB0aGlzLnN0b3BSZXF1ZXN0ID0gZmFsc2U7IC8vIFRvIHJlcXVlc3QgZGlzY29ubmVjdFxyXG5cclxuXHJcbiAgICAgICAgLy8gbGFzdCBub3RpZmljYXRpb25cclxuICAgICAgICB0aGlzLnJlc3BvbnNlID0gbnVsbDtcclxuICAgICAgICB0aGlzLnJlc3BvbnNlVGltZVN0YW1wID0gbmV3IERhdGUoKTtcclxuICAgICAgICB0aGlzLnBhcnNlZFJlc3BvbnNlID0gbnVsbDtcclxuICAgICAgICB0aGlzLmZvcm1hdHRlZFJlc3BvbnNlID0gJyc7XHJcblxyXG4gICAgICAgIC8vIGJsdWV0b290aCBwcm9wZXJ0aWVzXHJcbiAgICAgICAgdGhpcy5jaGFyUmVhZCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5idFNlcnZpY2UgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuYnREZXZpY2UgPSBudWxsO1xyXG5cclxuICAgICAgICAvLyBnZW5lcmFsIHN0YXRpc3RpY3MgZm9yIGRlYnVnZ2luZ1xyXG4gICAgICAgIHRoaXMuc3RhdHMgPSB7XHJcbiAgICAgICAgICAgIFwicmVxdWVzdHNcIjogMCxcclxuICAgICAgICAgICAgXCJyZXNwb25zZXNcIjogMCxcclxuICAgICAgICAgICAgXCJtb2RidXNfZXJyb3JzXCI6IDAsXHJcbiAgICAgICAgICAgIFwiR0FUVCBkaXNjb25uZWN0c1wiOiAwLFxyXG4gICAgICAgICAgICBcImV4Y2VwdGlvbnNcIjogMCxcclxuICAgICAgICAgICAgXCJzdWJjcmliZXNcIjogMCxcclxuICAgICAgICAgICAgXCJjb21tYW5kc1wiOiAwLFxyXG4gICAgICAgICAgICBcInJlc3BvbnNlVGltZVwiOiAwLjAsXHJcbiAgICAgICAgICAgIFwibGFzdFJlc3BvbnNlVGltZVwiOiAwLjAsXHJcbiAgICAgICAgICAgIFwibGFzdF9jb25uZWN0XCI6IG5ldyBEYXRlKDIwMjAsIDEsIDEpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLm9wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgIFwiZm9yY2VEZXZpY2VTZWxlY3Rpb25cIjogdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxubGV0IGJ0U3RhdGUgPSBuZXcgQVBJU3RhdGUoKTtcclxuXHJcbi8qKlxyXG4gKiBNYWluIGxvb3Agb2YgdGhlIG1ldGVyIGhhbmRsZXIuXHJcbiAqICovXHJcbmFzeW5jIGZ1bmN0aW9uIHN0YXRlTWFjaGluZSgpIHtcclxuICAgIHZhciBuZXh0QWN0aW9uO1xyXG4gICAgdmFyIERFTEFZX01TID0gKHNpbXVsYXRpb24gPyAyMCA6IDQ1MCk7IC8vIFVwZGF0ZSB0aGUgc3RhdHVzIGV2ZXJ5IFggbXMuXHJcbiAgICB2YXIgVElNRU9VVF9NUyA9IChzaW11bGF0aW9uID8gMTAwMCA6IDMwMDAwKTsgLy8gR2l2ZSB1cCBzb21lIG9wZXJhdGlvbnMgYWZ0ZXIgWCBtcy5cclxuICAgIGJ0U3RhdGUuc3RhcnRlZCA9IHRydWU7XHJcblxyXG4gICAgbG9nLmRlYnVnKFwiQ3VycmVudCBzdGF0ZTpcIiArIGJ0U3RhdGUuc3RhdGUpO1xyXG5cclxuICAgIC8vIENvbnNlY3V0aXZlIHN0YXRlIGNvdW50ZWQuIENhbiBiZSB1c2VkIHRvIHRpbWVvdXQuXHJcbiAgICBpZiAoYnRTdGF0ZS5zdGF0ZSA9PSBidFN0YXRlLnByZXZfc3RhdGUpIHtcclxuICAgICAgICBidFN0YXRlLnN0YXRlX2NwdCsrO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBidFN0YXRlLnN0YXRlX2NwdCA9IDA7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU3RvcCByZXF1ZXN0IGZyb20gQVBJXHJcbiAgICBpZiAoYnRTdGF0ZS5zdG9wUmVxdWVzdCkge1xyXG4gICAgICAgIGJ0U3RhdGUuc3RhdGUgPSBTdGF0ZS5TVE9QUElORztcclxuICAgIH1cclxuXHJcbiAgICBsb2cuZGVidWcoXCJcXFN0YXRlOlwiICsgYnRTdGF0ZS5zdGF0ZSk7XHJcbiAgICBzd2l0Y2ggKGJ0U3RhdGUuc3RhdGUpIHtcclxuICAgICAgICBjYXNlIFN0YXRlLk5PVF9DT05ORUNURUQ6IC8vIGluaXRpYWwgc3RhdGUgb24gU3RhcnQoKVxyXG4gICAgICAgICAgICBpZiAoc2ltdWxhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IGZha2VQYWlyRGV2aWNlO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IGJ0UGFpckRldmljZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFN0YXRlLkNPTk5FQ1RJTkc6IC8vIHdhaXRpbmcgZm9yIGNvbm5lY3Rpb24gdG8gY29tcGxldGVcclxuICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBTdGF0ZS5ERVZJQ0VfUEFJUkVEOiAvLyBjb25uZWN0aW9uIGNvbXBsZXRlLCBhY3F1aXJlIG1ldGVyIHN0YXRlXHJcbiAgICAgICAgICAgIGlmIChzaW11bGF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gZmFrZVN1YnNjcmliZTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSBidFN1YnNjcmliZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFN0YXRlLlNVQlNDUklCSU5HOiAvLyB3YWl0aW5nIGZvciBCbHVldG9vdGggaW50ZXJmYWNlc1xyXG4gICAgICAgICAgICBuZXh0QWN0aW9uID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICBpZiAoYnRTdGF0ZS5zdGF0ZV9jcHQgPiAoVElNRU9VVF9NUyAvIERFTEFZX01TKSkge1xyXG4gICAgICAgICAgICAgICAgLy8gVGltZW91dCwgdHJ5IHRvIHJlc3Vic2NyaWJlXHJcbiAgICAgICAgICAgICAgICBsb2cud2FybihcIlRpbWVvdXQgaW4gU1VCU0NSSUJJTkdcIik7XHJcbiAgICAgICAgICAgICAgICBidFN0YXRlLnN0YXRlID0gU3RhdGUuREVWSUNFX1BBSVJFRDtcclxuICAgICAgICAgICAgICAgIGJ0U3RhdGUuc3RhdGVfY3B0ID0gMDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFN0YXRlLk1FVEVSX0lOSVQ6IC8vIHJlYWR5IHRvIGNvbW11bmljYXRlLCBhY3F1aXJlIG1ldGVyIHN0YXR1c1xyXG4gICAgICAgICAgICBuZXh0QWN0aW9uID0gbWV0ZXJJbml0O1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFN0YXRlLk1FVEVSX0lOSVRJQUxJWklORzogLy8gcmVhZGluZyB0aGUgbWV0ZXIgc3RhdHVzXHJcbiAgICAgICAgICAgIGlmIChidFN0YXRlLnN0YXRlX2NwdCA+IChUSU1FT1VUX01TIC8gREVMQVlfTVMpKSB7XHJcbiAgICAgICAgICAgICAgICBsb2cud2FybihcIlRpbWVvdXQgaW4gTUVURVJfSU5JVElBTElaSU5HXCIpO1xyXG4gICAgICAgICAgICAgICAgLy8gVGltZW91dCwgdHJ5IHRvIHJlc3Vic2NyaWJlXHJcbiAgICAgICAgICAgICAgICBpZiAoc2ltdWxhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSBmYWtlU3Vic2NyaWJlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gYnRTdWJzY3JpYmU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBidFN0YXRlLnN0YXRlX2NwdCA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBTdGF0ZS5JRExFOiAvLyByZWFkeSB0byBwcm9jZXNzIGNvbW1hbmRzIGZyb20gQVBJXHJcbiAgICAgICAgICAgIGlmIChidFN0YXRlLmNvbW1hbmQgIT0gbnVsbClcclxuICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSBwcm9jZXNzQ29tbWFuZDtcclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gcmVmcmVzaDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFN0YXRlLkVSUk9SOiAvLyBhbnl0aW1lIGFuIGVycm9yIGhhcHBlbnNcclxuICAgICAgICAgICAgbmV4dEFjdGlvbiA9IGRpc2Nvbm5lY3Q7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgU3RhdGUuQlVTWTogLy8gd2hpbGUgYSBjb21tYW5kIGluIGdvaW5nIG9uXHJcbiAgICAgICAgICAgIGlmIChidFN0YXRlLnN0YXRlX2NwdCA+IChUSU1FT1VUX01TIC8gREVMQVlfTVMpKSB7XHJcbiAgICAgICAgICAgICAgICBsb2cud2FybihcIlRpbWVvdXQgaW4gQlVTWVwiKTtcclxuICAgICAgICAgICAgICAgIC8vIFRpbWVvdXQsIHRyeSB0byByZXN1YnNjcmliZVxyXG4gICAgICAgICAgICAgICAgaWYgKHNpbXVsYXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gZmFrZVN1YnNjcmliZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IGJ0U3Vic2NyaWJlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnRTdGF0ZS5zdGF0ZV9jcHQgPSAwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG5leHRBY3Rpb24gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgU3RhdGUuU1RPUFBJTkc6XHJcbiAgICAgICAgICAgIG5leHRBY3Rpb24gPSBkaXNjb25uZWN0O1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFN0YXRlLlNUT1BQRUQ6IC8vIGFmdGVyIGEgZGlzY29ubmVjdG9yIG9yIFN0b3AoKSByZXF1ZXN0LCBzdG9wcyB0aGUgc3RhdGUgbWFjaGluZS5cclxuICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcblxyXG4gICAgYnRTdGF0ZS5wcmV2X3N0YXRlID0gYnRTdGF0ZS5zdGF0ZTtcclxuXHJcbiAgICBpZiAobmV4dEFjdGlvbiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICBsb2cuZGVidWcoXCJcXHRFeGVjdXRpbmc6XCIgKyBuZXh0QWN0aW9uLm5hbWUpO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IG5leHRBY3Rpb24oKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgbG9nLmVycm9yKFwiRXhjZXB0aW9uIGluIHN0YXRlIG1hY2hpbmVcIiwgZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKGJ0U3RhdGUuc3RhdGUgIT0gU3RhdGUuU1RPUFBFRCkge1xyXG4gICAgICAgIHV0aWxzLnNsZWVwKERFTEFZX01TKS50aGVuKCgpID0+IHN0YXRlTWFjaGluZSgpKTsgLy8gUmVjaGVjayBzdGF0dXMgaW4gREVMQVlfTVMgbXNcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIGxvZy5kZWJ1ZyhcIlxcdFRlcm1pbmF0aW5nIFN0YXRlIG1hY2hpbmVcIik7XHJcbiAgICAgICAgYnRTdGF0ZS5zdGFydGVkID0gZmFsc2U7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDYWxsZWQgZnJvbSBzdGF0ZSBtYWNoaW5lIHRvIGV4ZWN1dGUgYSBzaW5nbGUgY29tbWFuZCBmcm9tIGJ0U3RhdGUuY29tbWFuZCBwcm9wZXJ0eVxyXG4gKiAqL1xyXG5hc3luYyBmdW5jdGlvbiBwcm9jZXNzQ29tbWFuZCgpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgY29tbWFuZC5lcnJvciA9IGZhbHNlO1xyXG4gICAgICAgIGNvbW1hbmQucGVuZGluZyA9IGZhbHNlO1xyXG4gICAgICAgIGJ0U3RhdGUuY29tbWFuZCA9IG51bGw7XHJcblxyXG4gICAgICAgIGJ0U3RhdGUuc3RhdGUgPSBTdGF0ZS5JRExFO1xyXG4gICAgICAgIGxvZy5kZWJ1ZyhcIlxcdFxcdENvbXBsZXRlZCBjb21tYW5kIGV4ZWN1dGVkXCIpO1xyXG4gICAgfVxyXG4gICAgY2F0Y2ggKGVycikge1xyXG4gICAgICAgIGxvZy5lcnJvcihcIioqIGVycm9yIHdoaWxlIGV4ZWN1dGluZyBjb21tYW5kOiBcIiArIGVycik7XHJcbiAgICAgICAgYnRTdGF0ZS5zdGF0ZSA9IFN0YXRlLk1FVEVSX0lOSVQ7XHJcbiAgICAgICAgYnRTdGF0ZS5zdGF0c1tcImV4Y2VwdGlvbnNcIl0rKztcclxuICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgbW9kYnVzLk1vZGJ1c0Vycm9yKVxyXG4gICAgICAgICAgICBidFN0YXRlLnN0YXRzW1wibW9kYnVzX2Vycm9yc1wiXSsrO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiBBY3F1aXJlIHRoZSBjdXJyZW50IG1vZGUgYW5kIHNlcmlhbCBudW1iZXIgb2YgdGhlIGRldmljZS5cclxuICogKi9cclxuYXN5bmMgZnVuY3Rpb24gbWV0ZXJJbml0KCkge1xyXG4gICAgYnRTdGF0ZS5zdGF0ZSA9IFN0YXRlLklETEU7XHJcbn1cclxuXHJcbi8qXHJcbiAqIENsb3NlIHRoZSBibHVldG9vdGggaW50ZXJmYWNlICh1bnBhaXIpXHJcbiAqICovXHJcbmFzeW5jIGZ1bmN0aW9uIGRpc2Nvbm5lY3QoKSB7XHJcbiAgICBidFN0YXRlLmNvbW1hbmQgPSBudWxsO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBpZiAoYnRTdGF0ZS5idERldmljZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGlmIChidFN0YXRlLmJ0RGV2aWNlPy5nYXR0Py5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgIGxvZy53YXJuKFwiKiBDYWxsaW5nIGRpc2Nvbm5lY3Qgb24gYnRkZXZpY2VcIik7XHJcbiAgICAgICAgICAgICAgICAvLyBBdm9pZCB0aGUgZXZlbnQgZmlyaW5nIHdoaWNoIG1heSBsZWFkIHRvIGF1dG8tcmVjb25uZWN0XHJcbiAgICAgICAgICAgICAgICBidFN0YXRlLmJ0RGV2aWNlLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2dhdHRzZXJ2ZXJkaXNjb25uZWN0ZWQnLCBvbkRpc2Nvbm5lY3RlZCk7XHJcbiAgICAgICAgICAgICAgICBidFN0YXRlLmJ0RGV2aWNlLmdhdHQuZGlzY29ubmVjdCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJ0U3RhdGUuYnRTZXJ2aWNlID0gbnVsbDtcclxuICAgIH1cclxuICAgIGNhdGNoIHsgfVxyXG4gICAgYnRTdGF0ZS5zdGF0ZSA9IFN0YXRlLlNUT1BQRUQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFdmVudCBjYWxsZWQgYnkgYnJvd3NlciBCVCBhcGkgd2hlbiB0aGUgZGV2aWNlIGRpc2Nvbm5lY3RcclxuICogKi9cclxuYXN5bmMgZnVuY3Rpb24gb25EaXNjb25uZWN0ZWQoKSB7XHJcbiAgICBsb2cud2FybihcIiogR0FUVCBTZXJ2ZXIgZGlzY29ubmVjdGVkIGV2ZW50LCB3aWxsIHRyeSB0byByZWNvbm5lY3QgKlwiKTtcclxuICAgIGJ0U3RhdGUuYnRTZXJ2aWNlID0gbnVsbDtcclxuICAgIGJ0U3RhdGUuc3RhdHNbXCJHQVRUIGRpc2Nvbm5lY3RzXCJdKys7XHJcbiAgICBidFN0YXRlLnN0YXRlID0gU3RhdGUuREVWSUNFX1BBSVJFRDsgLy8gVHJ5IHRvIGF1dG8tcmVjb25uZWN0IHRoZSBpbnRlcmZhY2VzIHdpdGhvdXQgcGFpcmluZ1xyXG59XHJcblxyXG4vKipcclxuICogSm9pbnMgdGhlIGFyZ3VtZW50cyBpbnRvIGEgc2luZ2xlIGJ1ZmZlclxyXG4gKiBAcmV0dXJucyB7QnVmZmVyfSBjb25jYXRlbmF0ZWQgYnVmZmVyXHJcbiAqL1xyXG5mdW5jdGlvbiBhcnJheUJ1ZmZlckNvbmNhdCgpIHtcclxuICAgIHZhciBsZW5ndGggPSAwO1xyXG4gICAgdmFyIGJ1ZmZlciA9IG51bGw7XHJcblxyXG4gICAgZm9yICh2YXIgaSBpbiBhcmd1bWVudHMpIHtcclxuICAgICAgICBidWZmZXIgPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgbGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBqb2luZWQgPSBuZXcgVWludDhBcnJheShsZW5ndGgpO1xyXG4gICAgdmFyIG9mZnNldCA9IDA7XHJcblxyXG4gICAgZm9yIChpIGluIGFyZ3VtZW50cykge1xyXG4gICAgICAgIGJ1ZmZlciA9IGFyZ3VtZW50c1tpXTtcclxuICAgICAgICBqb2luZWQuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZmZlciksIG9mZnNldCk7XHJcbiAgICAgICAgb2Zmc2V0ICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBqb2luZWQuYnVmZmVyO1xyXG59XHJcblxyXG52YXIgbGFzdFRpbWVTdGFtcCA9IDA7XHJcbi8qKlxyXG4gKiBFdmVudCBjYWxsZWQgYnkgYmx1ZXRvb3RoIGNoYXJhY3RlcmlzdGljcyB3aGVuIHJlY2VpdmluZyBkYXRhXHJcbiAqIEBwYXJhbSB7YW55fSBldmVudFxyXG4gKi9cclxuZnVuY3Rpb24gaGFuZGxlTm90aWZpY2F0aW9ucyhldmVudCkge1xyXG4gICAgdmFyIGRlbGF5ID0gMDtcclxuICAgIGxldCB2YWx1ZSA9IGV2ZW50LnRhcmdldC52YWx1ZTtcclxuICAgIGlmICh2YWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgICAgbG9nLmRlYnVnKCc8PCAnICsgdXRpbHMuYnVmMmhleCh2YWx1ZS5idWZmZXIpKTtcclxuICAgICAgICBpZiAoYnRTdGF0ZS5yZXNwb25zZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGJ0U3RhdGUucmVzcG9uc2UgPSBhcnJheUJ1ZmZlckNvbmNhdChidFN0YXRlLnJlc3BvbnNlLCB2YWx1ZS5idWZmZXIpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGJ0U3RhdGUucmVzcG9uc2UgPSB2YWx1ZS5idWZmZXIuc2xpY2UoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gS2VlcCB0aGUgZXZlbnQgb3JpZ2luYWwgdGltZXN0YW1wICEhXHJcbiAgICAgICAgYnRTdGF0ZS5yZXNwb25zZVRpbWVTdGFtcCA9IG5ldyBEYXRlKGV2ZW50LnRpbWVTdGFtcCk7XHJcbiAgICAgICAgaWYgKGxhc3RUaW1lU3RhbXAgPiAwKSB7XHJcbiAgICAgICAgICAgIGRlbGF5ID0gZXZlbnQudGltZVN0YW1wIC0gbGFzdFRpbWVTdGFtcDsgLy8gbXMgYmV0d2VlbiBub3RpZmljYXRpb25zXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZGVsYXkgPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsYXN0VGltZVN0YW1wID0gZXZlbnQudGltZVN0YW1wO1xyXG5cclxuICAgICAgICBwYXJzZVJlc3BvbnNlKGJ0U3RhdGUucmVzcG9uc2UsIGJ0U3RhdGUucmVzcG9uc2VUaW1lU3RhbXApO1xyXG5cclxuICAgICAgICAvLyBMb2cgdGhlIHBhY2tldHNcclxuICAgICAgICBpZiAobG9nZ2luZykge1xyXG4gICAgICAgICAgICB2YXIgcGFja2V0ID0geyAnbm90aWZpY2F0aW9uJzogdXRpbHMuYnVmMmhleChidFN0YXRlLnJlc3BvbnNlKSwgJ3BhcnNlZCc6IGJ0U3RhdGUucGFyc2VkUmVzcG9uc2UgfTtcclxuICAgICAgICAgICAgdmFyIHBhY2tldHMgPSB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJJT1Rlc3RpbmdUcmFjZVwiKTtcclxuICAgICAgICAgICAgaWYgKHBhY2tldHMgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgcGFja2V0cyA9IFtdOyAvLyBpbml0aWFsaXplIGFycmF5XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBwYWNrZXRzID0gSlNPTi5wYXJzZShwYWNrZXRzKTsgLy8gUmVzdG9yZSB0aGUganNvbiBwZXJzaXN0ZWQgb2JqZWN0XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcGFja2V0cy5wdXNoKHBhY2tldCk7IC8vIEFkZCB0aGUgbmV3IG9iamVjdFxyXG4gICAgICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJJT1Rlc3RpbmdUcmFjZVwiLCBKU09OLnN0cmluZ2lmeShwYWNrZXRzKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChkZWxheSA+IDApIHtcclxuICAgICAgICAgICAgYnRTdGF0ZS5zdGF0c1tcImxhc3RSZXNwb25zZVRpbWVcIl0gPSBkZWxheTtcclxuICAgICAgICAgICAgYnRTdGF0ZS5zdGF0c1tcInJlc3BvbnNlVGltZVwiXSA9IChidFN0YXRlLnN0YXRzW1wicmVzcG9uc2VUaW1lXCJdICogKGJ0U3RhdGUuc3RhdHNbXCJyZXNwb25zZXNcIl0tMS4wKSArIGRlbGF5KSAvIGJ0U3RhdGUuc3RhdHNbXCJyZXNwb25zZXNcIl07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJ0U3RhdGUuc3RhdHNbXCJyZXNwb25zZXNcIl0rKztcclxuXHJcbiAgICAgICAgYnRTdGF0ZS5yZXNwb25zZSA9IG51bGw7XHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBwYXJzZVJlc3BvbnNlKGJ1ZmZlciwgdGltZXN0YW1wKSB7XHJcbiAgICBsZXQgdmFsdWUgPSBuZXcgRGF0YVZpZXcoYnVmZmVyKTtcclxuICAgIHZhciBtZWFzdXJlbWVudCA9IE5hTjtcclxuICAgIGlmIChidWZmZXIgPT0gbnVsbCB8fCBidWZmZXIubGVuZ3RoIDwgMTIpXHJcbiAgICAgICAgcmV0dXJuXHJcblxyXG4gICAgdmFyIHdpZmlfc3RhdGUgPSAodmFsdWUuZ2V0VWludDgoMCkgPj4gNikgJiAzXHJcbiAgICB2YXIgcmVsYXlfcG9zaXRpb24gPSAodmFsdWUuZ2V0VWludDgoMCkgPj4gNCkgJiAzXHJcbiAgICB2YXIgYmx1ZXRvb3RoX3N0YXRlID0gKHZhbHVlLmdldFVpbnQ4KDApID4+IDEpICYgN1xyXG4gICAgdmFyIGZyZXEgPSAodmFsdWUuZ2V0VWludDgoMSkgPj4gNSkgJiAzXHJcblxyXG4gICAgc3dpdGNoKGZyZXEpIHtcclxuICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgIGZyZXEgPSBcIjgwIE1IelwiXHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgZnJlcSA9IFwiMTYwIE1IelwiXHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgZnJlcSA9IFwiMjQwIE1IelwiXHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgIGZyZXEgPSBcIj8ge2ZyZXF9XCJcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHZlcmJvc2UgPSAodmFsdWUuZ2V0VWludDgoMSkgJiA4KSAhPSAwXHJcbiAgICB2YXIgdGVzdF9tb2RlID0gKHZhbHVlLmdldFVpbnQ4KDEpICYgNCkgIT0gMFxyXG4gICAgdmFyIG1ldGVyX3BhcmFsbGVsID0gKHZhbHVlLmdldFVpbnQ4KDEpICYgMikgIT0gMFxyXG4gICAgdmFyIGNvbW1hbmRfcmVzdWx0ID0gKHZhbHVlLmdldFVpbnQ4KDEpICYgMSkgIT0gMFxyXG4gICAgdmFyIGFjdHVhbF9yID0gdmFsdWUuZ2V0VWludDE2KDIsIHRydWUpXHJcbiAgICB2YXIgc2V0cG9pbnRfciA9IHZhbHVlLmdldFVpbnQxNig0LCB0cnVlKVxyXG4gICAgdmFyIG1lbV9mcmVlID0gdmFsdWUuZ2V0VWludDMyKDYsIHRydWUpXHJcbiAgICB2YXIgZXJyX2JvYXJkID0gdmFsdWUuZ2V0VWludDgoMTApXHJcbiAgICB2YXIgYmF0dGVyeSA9IHZhbHVlLmdldFVpbnQ4KDExKVxyXG4gICAgdmFyIHJldHZhbCA9IHsnV2lmaSc6IHdpZmlfc3RhdGUsICdCbHVldG9vdGgnOiBibHVldG9vdGhfc3RhdGUsICdSZWxheSc6IHJlbGF5X3Bvc2l0aW9uLCAnUGFyYWxsZWwnOiBtZXRlcl9wYXJhbGxlbCxcclxuICAgICAgICAgICAgJ1Jlc3VsdCc6IGNvbW1hbmRfcmVzdWx0LCAnUiBhY3QnOiBhY3R1YWxfciwgJ1Igc2V0cG9pbnQnOiBzZXRwb2ludF9yLCAnTWVtJzogbWVtX2ZyZWUsXHJcbiAgICAgICAgICAgICdCb2FyZCBlcnInOiBlcnJfYm9hcmQsICdCYXR0ZXJ5JzogYmF0dGVyeSwgJ0JUIHRlc3QgZXJyJzogMCxcclxuICAgICAgICAgICAgJ1ZlcmJvc2UnOiB2ZXJib3NlLCAnVGVzdCBtb2RlJzogdGVzdF9tb2RlLCAnRnJlcSc6IGZyZXF9XHJcblxyXG4gICAgYnRTdGF0ZS5mb3JtYXR0ZWRSZXNwb25zZSA9IHJldHZhbDtcclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiBUaGlzIGZ1bmN0aW9uIHdpbGwgc3VjY2VlZCBvbmx5IGlmIGNhbGxlZCBhcyBhIGNvbnNlcXVlbmNlIG9mIGEgdXNlci1nZXN0dXJlXHJcbiAqIEUuZy4gYnV0dG9uIGNsaWNrLiBUaGlzIGlzIGR1ZSB0byBCbHVlVG9vdGggQVBJIHNlY3VyaXR5IG1vZGVsLlxyXG4gKiAqL1xyXG5hc3luYyBmdW5jdGlvbiBidFBhaXJEZXZpY2UoKSB7XHJcbiAgICBidFN0YXRlLnN0YXRlID0gU3RhdGUuQ09OTkVDVElORztcclxuICAgIHZhciBmb3JjZVNlbGVjdGlvbiA9IHRydWU7XHJcbiAgICBsb2cuZGVidWcoXCJidFBhaXJEZXZpY2UoXCIgKyBmb3JjZVNlbGVjdGlvbiArIFwiKVwiKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiAobmF2aWdhdG9yLmJsdWV0b290aD8uZ2V0QXZhaWxhYmlsaXR5KSA9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJpbGl0eSA9IGF3YWl0IG5hdmlnYXRvci5ibHVldG9vdGguZ2V0QXZhaWxhYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIGlmICghYXZhaWxhYmlsaXR5KSB7XHJcbiAgICAgICAgICAgICAgICBsb2cuZXJyb3IoXCJCbHVldG9vdGggbm90IGF2YWlsYWJsZSBpbiBicm93c2VyLlwiKTtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkJyb3dzZXIgZG9lcyBub3QgcHJvdmlkZSBibHVldG9vdGhcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGRldmljZSA9IG51bGw7XHJcblxyXG4gICAgICAgIC8vIElmIG5vdCwgcmVxdWVzdCBmcm9tIHVzZXJcclxuICAgICAgICBpZiAoZGV2aWNlID09IG51bGwpIHtcclxuICAgICAgICAgICAgZGV2aWNlID0gYXdhaXQgbmF2aWdhdG9yLmJsdWV0b290aFxyXG4gICAgICAgICAgICAgICAgLnJlcXVlc3REZXZpY2Uoe1xyXG4gICAgICAgICAgICAgICAgICAgIGFjY2VwdEFsbERldmljZXM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcnM6IFt7c2VydmljZXM6IFtCbHVlVG9vdGguU2VydmljZVV1aWRdfV1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBidFN0YXRlLmJ0RGV2aWNlID0gZGV2aWNlO1xyXG4gICAgICAgIGJ0U3RhdGUuc3RhdGUgPSBTdGF0ZS5ERVZJQ0VfUEFJUkVEO1xyXG4gICAgICAgIGxvZy5pbmZvKFwiQmx1ZXRvb3RoIGRldmljZSBcIiArIGRldmljZS5uYW1lICsgXCIgY29ubmVjdGVkLlwiKTtcclxuICAgICAgICBhd2FpdCB1dGlscy5zbGVlcCg1MDApO1xyXG4gICAgfVxyXG4gICAgY2F0Y2ggKGVycikge1xyXG4gICAgICAgIGxvZy53YXJuKFwiKiogZXJyb3Igd2hpbGUgY29ubmVjdGluZzogXCIgKyBlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgYnRTdGF0ZS5idFNlcnZpY2UgPSBudWxsO1xyXG4gICAgICAgIGlmIChidFN0YXRlLmNoYXJSZWFkICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGJ0U3RhdGUuY2hhclJlYWQuc3RvcE5vdGlmaWNhdGlvbnMoKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHsgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBidFN0YXRlLmNoYXJSZWFkID0gbnVsbDtcclxuICAgICAgICBidFN0YXRlLnN0YXRlID0gU3RhdGUuRVJST1I7XHJcbiAgICAgICAgYnRTdGF0ZS5zdGF0c1tcImV4Y2VwdGlvbnNcIl0rKztcclxuICAgIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gZmFrZVBhaXJEZXZpY2UoKSB7XHJcbiAgICBidFN0YXRlLnN0YXRlID0gU3RhdGUuQ09OTkVDVElORztcclxuICAgIHZhciBmb3JjZVNlbGVjdGlvbiA9IHRydWU7XHJcbiAgICBsb2cuZGVidWcoXCJmYWtlUGFpckRldmljZShcIiArIGZvcmNlU2VsZWN0aW9uICsgXCIpXCIpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICB2YXIgZGV2aWNlID0geyBuYW1lOiBcIkZha2VCVERldmljZVwiLCBnYXR0OiB7IGNvbm5lY3RlZDogdHJ1ZSB9IH07XHJcbiAgICAgICAgYnRTdGF0ZS5idERldmljZSA9IGRldmljZTtcclxuICAgICAgICBidFN0YXRlLnN0YXRlID0gU3RhdGUuREVWSUNFX1BBSVJFRDtcclxuICAgICAgICBsb2cuaW5mbyhcIkJsdWV0b290aCBkZXZpY2UgXCIgKyBkZXZpY2UubmFtZSArIFwiIGNvbm5lY3RlZC5cIik7XHJcbiAgICAgICAgYXdhaXQgdXRpbHMuc2xlZXAoNTApO1xyXG4gICAgfVxyXG4gICAgY2F0Y2ggKGVycikge1xyXG4gICAgICAgIGxvZy53YXJuKFwiKiogZXJyb3Igd2hpbGUgY29ubmVjdGluZzogXCIgKyBlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgYnRTdGF0ZS5idFNlcnZpY2UgPSBudWxsO1xyXG4gICAgICAgIGJ0U3RhdGUuY2hhclJlYWQgPSBudWxsO1xyXG4gICAgICAgIGJ0U3RhdGUuc3RhdGUgPSBTdGF0ZS5FUlJPUjtcclxuICAgICAgICBidFN0YXRlLnN0YXRzW1wiZXhjZXB0aW9uc1wiXSsrO1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogT25jZSB0aGUgZGV2aWNlIGlzIGF2YWlsYWJsZSwgaW5pdGlhbGl6ZSB0aGUgc2VydmljZSBhbmQgdGhlIDIgY2hhcmFjdGVyaXN0aWNzIG5lZWRlZC5cclxuICogKi9cclxuYXN5bmMgZnVuY3Rpb24gYnRTdWJzY3JpYmUoKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGJ0U3RhdGUuc3RhdGUgPSBTdGF0ZS5TVUJTQ1JJQklORztcclxuICAgICAgICBidFN0YXRlLnN0YXRzW1wic3ViY3JpYmVzXCJdKys7XHJcbiAgICAgICAgbGV0IGRldmljZSA9IGJ0U3RhdGUuYnREZXZpY2U7XHJcbiAgICAgICAgbGV0IHNlcnZlciA9IG51bGw7XHJcblxyXG4gICAgICAgIGlmICghZGV2aWNlPy5nYXR0Py5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKGBDb25uZWN0aW5nIHRvIEdBVFQgU2VydmVyIG9uICR7ZGV2aWNlLm5hbWV9Li4uYCk7XHJcbiAgICAgICAgICAgIGRldmljZS5hZGRFdmVudExpc3RlbmVyKCdnYXR0c2VydmVyZGlzY29ubmVjdGVkJywgb25EaXNjb25uZWN0ZWQpO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGJ0U3RhdGUuYnRTZXJ2aWNlPy5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBidFN0YXRlLmJ0U2VydmljZS5kaXNjb25uZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnRTdGF0ZS5idFNlcnZpY2UgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHV0aWxzLnNsZWVwKDEwMCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycikgeyB9XHJcblxyXG4gICAgICAgICAgICBzZXJ2ZXIgPSBhd2FpdCBkZXZpY2UuZ2F0dC5jb25uZWN0KCk7XHJcbiAgICAgICAgICAgIGxvZy5kZWJ1ZygnPiBGb3VuZCBHQVRUIHNlcnZlcicpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKCdHQVRUIGFscmVhZHkgY29ubmVjdGVkJyk7XHJcbiAgICAgICAgICAgIHNlcnZlciA9IGRldmljZS5nYXR0O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYnRTdGF0ZS5idFNlcnZpY2UgPSBhd2FpdCBzZXJ2ZXIuZ2V0UHJpbWFyeVNlcnZpY2UoQmx1ZVRvb3RoLlNlcnZpY2VVdWlkKTtcclxuICAgICAgICBpZiAoYnRTdGF0ZS5idFNlcnZpY2UgPT0gbnVsbClcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR0FUVCBTZXJ2aWNlIHJlcXVlc3QgZmFpbGVkXCIpO1xyXG4gICAgICAgIGxvZy5kZWJ1ZygnPiBGb3VuZCBJT1Rlc3RpbmcgYm9hcmQgc2VydmljZScpO1xyXG4gICAgICAgIGJ0U3RhdGUuY2hhclJlYWQgPSBhd2FpdCBidFN0YXRlLmJ0U2VydmljZS5nZXRDaGFyYWN0ZXJpc3RpYyhCbHVlVG9vdGguTm90aWZpY2F0aW9uc1V1aWQpO1xyXG4gICAgICAgIGxvZy5kZWJ1ZygnPiBGb3VuZCBub3RpZmljYXRpb25zIGNoYXJhY3RlcmlzdGljJyk7XHJcbiAgICAgICAgYnRTdGF0ZS5yZXNwb25zZSA9IG51bGw7XHJcbiAgICAgICAgYnRTdGF0ZS5jaGFyUmVhZC5hZGRFdmVudExpc3RlbmVyKCdjaGFyYWN0ZXJpc3RpY3ZhbHVlY2hhbmdlZCcsIGhhbmRsZU5vdGlmaWNhdGlvbnMpO1xyXG4gICAgICAgIGJ0U3RhdGUuY2hhclJlYWQuc3RhcnROb3RpZmljYXRpb25zKCk7XHJcbiAgICAgICAgbG9nLmluZm8oJz4gQmx1ZXRvb3RoIGludGVyZmFjZXMgcmVhZHkuJyk7XHJcbiAgICAgICAgYnRTdGF0ZS5zdGF0c1tcImxhc3RfY29ubmVjdFwiXSA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcclxuICAgICAgICBhd2FpdCB1dGlscy5zbGVlcCg1MCk7XHJcbiAgICAgICAgYnRTdGF0ZS5zdGF0ZSA9IFN0YXRlLk1FVEVSX0lOSVQ7XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgbG9nLndhcm4oXCIqKiBlcnJvciB3aGlsZSBzdWJzY3JpYmluZzogXCIgKyBlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgaWYgKGJ0U3RhdGUuY2hhclJlYWQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGJ0U3RhdGUuYnREZXZpY2U/LmdhdHQ/LmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGJ0U3RhdGUuY2hhclJlYWQuc3RvcE5vdGlmaWNhdGlvbnMoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJ0U3RhdGUuYnREZXZpY2U/LmdhdHQuZGlzY29ubmVjdCgpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikgeyB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJ0U3RhdGUuY2hhclJlYWQgPSBudWxsO1xyXG4gICAgICAgIGJ0U3RhdGUuc3RhdGUgPSBTdGF0ZS5ERVZJQ0VfUEFJUkVEO1xyXG4gICAgICAgIGJ0U3RhdGUuc3RhdHNbXCJleGNlcHRpb25zXCJdKys7XHJcbiAgICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGZha2VTdWJzY3JpYmUoKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIGJ0U3RhdGUuc3RhdGUgPSBTdGF0ZS5TVUJTQ1JJQklORztcclxuICAgICAgICBidFN0YXRlLnN0YXRzW1wic3ViY3JpYmVzXCJdKys7XHJcbiAgICAgICAgbGV0IGRldmljZSA9IGJ0U3RhdGUuYnREZXZpY2U7XHJcbiAgICAgICAgbGV0IHNlcnZlciA9IG51bGw7XHJcblxyXG4gICAgICAgIGlmICghZGV2aWNlPy5nYXR0Py5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKGBDb25uZWN0aW5nIHRvIEdBVFQgU2VydmVyIG9uICR7ZGV2aWNlLm5hbWV9Li4uYCk7XHJcbiAgICAgICAgICAgIGRldmljZVsnZ2F0dCddWydjb25uZWN0ZWQnXSA9IHRydWU7XHJcbiAgICAgICAgICAgIGxvZy5kZWJ1ZygnPiBGb3VuZCBHQVRUIHNlcnZlcicpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKCdHQVRUIGFscmVhZHkgY29ubmVjdGVkJyk7XHJcbiAgICAgICAgICAgIHNlcnZlciA9IGRldmljZS5nYXR0O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYnRTdGF0ZS5idFNlcnZpY2UgPSB7fTtcclxuICAgICAgICBsb2cuZGVidWcoJz4gRm91bmQgU2VyaWFsIHNlcnZpY2UnKTtcclxuICAgICAgICBidFN0YXRlLmNoYXJSZWFkID0ge307XHJcbiAgICAgICAgbG9nLmRlYnVnKCc+IEZvdW5kIHJlYWQgY2hhcmFjdGVyaXN0aWMnKTtcclxuICAgICAgICBidFN0YXRlLnJlc3BvbnNlID0gbnVsbDtcclxuICAgICAgICBsb2cuaW5mbygnPiBCbHVldG9vdGggaW50ZXJmYWNlcyByZWFkeS4nKTtcclxuICAgICAgICBidFN0YXRlLnN0YXRzW1wibGFzdF9jb25uZWN0XCJdID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xyXG4gICAgICAgIGF3YWl0IHV0aWxzLnNsZWVwKDEwKTtcclxuICAgICAgICBidFN0YXRlLnN0YXRlID0gU3RhdGUuTUVURVJfSU5JVDtcclxuICAgIH1cclxuICAgIGNhdGNoIChlcnIpIHtcclxuICAgICAgICBsb2cud2FybihcIioqIGVycm9yIHdoaWxlIHN1YnNjcmliaW5nOiBcIiArIGVyci5tZXNzYWdlKTtcclxuICAgICAgICBidFN0YXRlLmNoYXJSZWFkID0gbnVsbDtcclxuICAgICAgICBidFN0YXRlLnN0YXRlID0gU3RhdGUuREVWSUNFX1BBSVJFRDtcclxuICAgICAgICBidFN0YXRlLnN0YXRzW1wiZXhjZXB0aW9uc1wiXSsrO1xyXG4gICAgfVxyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIFdoZW4gaWRsZSwgdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWRcclxuICogKi9cclxuYXN5bmMgZnVuY3Rpb24gcmVmcmVzaCgpIHtcclxuICAgIGJ0U3RhdGUuc3RhdGUgPSBTdGF0ZS5CVVNZO1xyXG4gICAgLy8gRG8gc29tZXRoaW5nXHJcbiAgICBidFN0YXRlLnN0YXRlID0gU3RhdGUuSURMRTtcclxufVxyXG5cclxuZnVuY3Rpb24gU2V0U2ltdWxhdGlvbih2YWx1ZSkge1xyXG4gICAgc2ltdWxhdGlvbiA9IHZhbHVlO1xyXG59XHJcblxyXG4vKipcclxuICogRW5hYmxlcyBvciBkaXNhYmxlIHdyaXRpbmcgdGhlIG5vdGlmaWNhdGlvbnMgaW50byBhIGxvY2FsIHN0b3JhZ2UgZmlsZVxyXG4gKiBAcGFyYW0ge2Jvb2xlYW59IHZhbHVlIFxyXG4gKi9cclxuZnVuY3Rpb24gU2V0UGFja2V0TG9nKHZhbHVlKSB7XHJcbiAgICBsb2dnaW5nID0gdmFsdWU7XHJcbn1cclxubW9kdWxlLmV4cG9ydHMgPSB7IHN0YXRlTWFjaGluZSwgU2V0U2ltdWxhdGlvbiwgYnRTdGF0ZSwgU3RhdGUsIFNldFBhY2tldExvZyB9OyJdfQ==
