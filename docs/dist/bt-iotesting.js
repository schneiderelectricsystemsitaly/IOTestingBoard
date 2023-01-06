(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.IOTestingBT = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BTApiState = void 0;
const MeterState_1 = require("./MeterState");
const constants_1 = require("./constants");
const NotificationData_1 = require("./NotificationData");
const log = require("loglevel");
// Current state of the bluetooth
class BTApiState {
    constructor() {
        this.state = constants_1.State.NOT_CONNECTED;
        this.prev_state = constants_1.State.NOT_CONNECTED;
        this.state_cpt = 0;
        this.started = false;
        this.stopRequest = false;
        this.lastMeasure = new NotificationData_1.NotificationData();
        this.meter = new MeterState_1.MeterState();
        this.command = null;
        this.response = null;
        this.btDevice = null;
        this.btGATTServer = null;
        this.btIOTService = null;
        this.charRead = null;
        this.charWrite = null;
        this.charSerial = null;
        this.charFirmware = null;
        this.charBattery = null;
        // general statistics for debugging
        this.stats = {
            requests: 0,
            responses: 0,
            modbus_errors: 0,
            'GATT disconnects': 0,
            exceptions: 0,
            subcribes: 0,
            commands: 0,
            responseTime: 0.0,
            lastResponseTime: '? ms',
            last_connect: new Date(2020, 1, 1).toISOString()
        };
        this.options = {
            forceDeviceSelection: true
        };
    }
    reset(onDisconnectEvent = null) {
        if (this.charRead != null) {
            try {
                if (this.btDevice?.gatt?.connected) {
                    this.charRead.stopNotifications();
                }
            }
            catch (error) { }
        }
        if (this.btDevice != null) {
            try {
                if (this.btDevice?.gatt?.connected) {
                    log.warn('* Calling disconnect on btdevice');
                    // Avoid the event firing which may lead to auto-reconnect
                    this.btDevice.removeEventListener('gattserverdisconnected', onDisconnectEvent);
                    this.btDevice.gatt.disconnect();
                }
            }
            catch (error) { }
        }
        this.btGATTServer = null;
        this.charBattery = null;
        this.charFirmware = null;
        this.charRead = null;
        this.charSerial = null;
        this.charWrite = null;
    }
}
exports.BTApiState = BTApiState;

},{"./MeterState":6,"./NotificationData":7,"./constants":8,"loglevel":12}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command = void 0;
const constants_1 = require("./constants");
/**
 * Command to the meter, may include setpoint
 * */
class Command {
    /**
       * Creates a new command
       * @param {CommandType} ctype
       */
    constructor(ctype) {
        this.type = parseInt(ctype);
        this.setpoint = null;
        this.setpoint = null;
        this.setpoint3 = null;
        this.setpoint4 = null;
        this.error = false;
        this.pending = true;
        this.request = null;
        this.response = null;
    }
    static CreateNoSP(ctype) {
        let cmd = new Command(ctype);
        return cmd;
    }
    static CreateOneSP(ctype, setpoint) {
        let cmd = new Command(ctype);
        cmd.setpoint = setpoint;
        return cmd;
    }
    static CreateFourSP(ctype, set1, set2, set3, set4) {
        let cmd = new Command(ctype);
        cmd.setpoint = set1;
        cmd.setpoint2 = set2;
        cmd.setpoint3 = set3;
        cmd.setpoint4 = set4;
        return cmd;
    }
    toString() {
        return 'Type: ' + this.type + ', setpoint:' + this.setpoint + ', setpoint2: ' + this.setpoint2 + ', pending:' + this.pending + ', error:' + this.error;
    }
    getPacket() {
        var buf;
        var dv;
        switch (this.type) {
            case constants_1.CommandType.COMMAND_BREAK:
            case constants_1.CommandType.COMMAND_DISABLE_WEBREPL:
            case constants_1.CommandType.COMMAND_DISABLE_WIFI:
            case constants_1.CommandType.COMMAND_ENABLE_WEBREPL:
            case constants_1.CommandType.COMMAND_ENABLE_WIFI:
            case constants_1.CommandType.COMMAND_LIGHT_SLEEP:
            case constants_1.CommandType.COMMAND_MODE_METER:
            case constants_1.CommandType.COMMAND_REBOOT:
            case constants_1.CommandType.COMMAND_REFRESH:
            case constants_1.CommandType.COMMAND_RUN_TEST:
            case constants_1.CommandType.COMMAND_R_TEST:
            case constants_1.CommandType.COMMAND_DEEP_SLEEP:
                // No parameter
                buf = new ArrayBuffer(1);
                dv = new DataView(buf);
                dv.setUint8(0, this.type);
                return buf;
            case constants_1.CommandType.COMMAND_CONFIGURE_METER_COMM:
                buf = new ArrayBuffer(1 + 5);
                dv = new DataView(buf);
                dv.setUint8(0, this.type);
                dv.setUint8(1, this.setpoint);
                dv.setUint8(2, this.setpoint2);
                dv.setUint8(3, this.setpoint3);
                dv.setUint16(4, this.setpoint4);
                return buf;
            case constants_1.CommandType.COMMAND_SET_DEEPSLEEP_MIN:
            case constants_1.CommandType.COMMAND_SET_CPU:
            case constants_1.CommandType.COMMAND_SET_INITIAL_COMMAND_SETPOINT:
            case constants_1.CommandType.COMMAND_SET_INITIAL_COMMAND_TYPE:
                // One Uint8 parameter
                buf = new ArrayBuffer(2);
                dv = new DataView(buf);
                dv.setUint8(0, this.type);
                dv.setUint8(1, this.setpoint);
                return buf;
            case constants_1.CommandType.COMMAND_METER_COMMANDS:
            case constants_1.CommandType.COMMAND_SET_INITIAL_BLUETOOTH:
            case constants_1.CommandType.COMMAND_SET_INITIAL_METER_COMM:
            case constants_1.CommandType.COMMAND_SET_OTA:
            case constants_1.CommandType.COMMAND_SET_VERBOSE:
                // One Uint8 parameter with 1 or 0 value
                buf = new ArrayBuffer(2);
                dv = new DataView(buf);
                dv.setUint8(0, this.type);
                dv.setUint8(1, this.setpoint ? 1 : 0);
                return buf;
            case constants_1.CommandType.COMMAND_MODE_RESISTORS:
            case constants_1.CommandType.COMMAND_MODE_V_LOAD:
                // One Uint16 R parameter
                buf = new ArrayBuffer(3);
                dv = new DataView(buf);
                dv.setUint8(0, this.type);
                dv.setUint16(1, this.setpoint);
                return buf;
            case constants_1.CommandType.COMMAND_SET_BLUETOOTH_NAME:
            case constants_1.CommandType.COMMAND_SET_WIFI_NETWORK:
            case constants_1.CommandType.COMMAND_SET_WIFI_PASSWORD:
                // One UTF8 string parameter
                let utf8Encode = new TextEncoder();
                let bytes_utf8 = utf8Encode.encode(this.setpoint);
                buf = new ArrayBuffer(1 + bytes_utf8.length);
                dv = new DataView(buf);
                dv.setUint8(0, this.type);
                var byte_num = 1;
                for (const byte_v of bytes_utf8) {
                    dv.setUint8(byte_num, byte_v);
                    byte_num++;
                }
                return buf;
            default:
                throw new Error('Invalid command' + this);
        }
    }
    /**
       * Gets the default setpoint for this command type
       * @returns {Object} setpoint(s) expected
       */
    defaultSetpoint() {
        switch (this.type) {
            case constants_1.CommandType.COMMAND_ENABLE_WIFI:
                return {};
            case constants_1.CommandType.COMMAND_DISABLE_WIFI:
                return {};
            case constants_1.CommandType.COMMAND_ENABLE_WEBREPL:
                return {};
            case constants_1.CommandType.COMMAND_DISABLE_WEBREPL:
                return {};
            case constants_1.CommandType.COMMAND_BREAK:
                return {};
            case constants_1.CommandType.COMMAND_MODE_METER:
                return {};
            case constants_1.CommandType.COMMAND_MODE_RESISTORS:
                return { 'Resistance (ohms)': 0xFFFF };
            case constants_1.CommandType.COMMAND_MODE_V_LOAD:
                return { 'Load (ohms)': 550 };
            case constants_1.CommandType.COMMAND_REBOOT:
                return {};
            case constants_1.CommandType.COMMAND_RUN_TEST:
                return {};
            case constants_1.CommandType.COMMAND_LIGHT_SLEEP:
                return {};
            case constants_1.CommandType.COMMAND_DEEP_SLEEP:
                return {};
            case constants_1.CommandType.COMMAND_METER_COMMANDS:
                return { Enable: true };
            case constants_1.CommandType.COMMAND_SET_INITIAL_METER_COMM:
                return { Enable: true };
            case constants_1.CommandType.COMMAND_SET_WIFI_NETWORK:
                return { SSID: '' };
            case constants_1.CommandType.COMMAND_SET_WIFI_PASSWORD:
                return { Password: '' };
            case constants_1.CommandType.COMMAND_SET_INITIAL_BLUETOOTH:
                return { Enable: true };
            case constants_1.CommandType.COMMAND_SET_INITIAL_WIFI:
                return { Enable: true };
            case constants_1.CommandType.COMMAND_SET_DEEPSLEEP_MIN:
                return { 'Delay (min)': 15 };
            case constants_1.CommandType.COMMAND_SET_VERBOSE:
                return { Enable: true };
            case constants_1.CommandType.COMMAND_SET_INITIAL_COMMAND_TYPE:
                return { 'Command type(1/2/3)': 1 };
            case constants_1.CommandType.COMMAND_SET_INITIAL_COMMAND_SETPOINT:
                return { 'Setpoint (ohms)': 0xFFFF };
            case constants_1.CommandType.COMMAND_R_TEST:
                return {};
            case constants_1.CommandType.COMMAND_SET_CPU:
                return { 'Frequency (MHz: 1->80, 2->160, 3->240)': 1 };
            case constants_1.CommandType.COMMAND_SET_OTA:
                return { Enable: true };
            case constants_1.CommandType.COMMAND_CONFIGURE_METER_COMM:
                return { Index: 0, 'Voltage (V)': 8, 'Command type (1/2/3)': 2, 'Setpoint (ohms)': 1100 };
            case constants_1.CommandType.COMMAND_SET_BLUETOOTH_NAME:
                return { 'Device name': 'IOTesting board' };
            case constants_1.CommandType.COMMAND_REFRESH:
                return {};
            default:
                return {};
        }
    }
}
exports.Command = Command;

},{"./constants":8}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandResult = void 0;
class CommandResult {
    constructor() {
        this.value = 0.0;
        this.success = false;
        this.message = '';
        this.unit = '';
        this.secondary_value = 0.0;
        this.secondary_unit = '';
    }
}
exports.CommandResult = CommandResult;

},{}],4:[function(require,module,exports){
"use strict";
/// <reference types="web-bluetooth" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.Driver = void 0;
/**
 *  Bluetooth handling module, including main state machine loop.
 *  This module interacts with browser for bluetooth comunications and pairing, and with SenecaMSC object.
 */
const APIState_1 = require("./APIState");
const constants_1 = require("./constants");
const IOTestingBoard_1 = require("./IOTestingBoard");
const utils_1 = require("./utils");
const log = require("loglevel");
const NotificationData_1 = require("./NotificationData");
class Driver {
    constructor() {
        this.logging = false;
        this.simulation = false;
        this.btState = new APIState_1.BTApiState();
        this.iot = new IOTestingBoard_1.IOTestingBoard(this.SendAndResponse, this.btState);
    }
    /**
       * Send the message using Bluetooth and wait for an answer
       */
    async SendAndResponse(command) {
        if (command == null || this.btState.charWrite == null) {
            return null;
        }
        log.debug('>> ' + (0, utils_1.buf2hex)(command));
        this.btState.response = null;
        this.btState.stats.requests++;
        const startTime = new Date().getTime();
        await this.btState.charWrite.writeValueWithoutResponse(command);
        while (this.btState.state == constants_1.State.METER_INITIALIZING ||
            this.btState.state == constants_1.State.BUSY) {
            if (this.btState.response != null)
                break;
            await new Promise(resolve => setTimeout(resolve, 35));
        }
        const endTime = new Date().getTime();
        const answer = this.btState.response?.slice(0);
        this.btState.response = null;
        // Log the packets
        if (this.logging) {
            const packet = { request: (0, utils_1.buf2hex)(command), answer: (0, utils_1.buf2hex)(answer) };
            const storage_value = window.localStorage.getItem('IOTestingTrace');
            let packets = [];
            if (storage_value != null) {
                packets = JSON.parse(storage_value); // Restore the json persisted object
            }
            packets.push(JSON.stringify(packet)); // Add the new object
            window.localStorage.setItem('IOTestingTrace', JSON.stringify(packets));
        }
        this.btState.stats.responseTime = Math.round((1.0 * this.btState.stats.responseTime * (this.btState.stats.responses % 500) + (endTime - startTime)) / ((this.btState.stats.responses % 500) + 1));
        this.btState.stats.lastResponseTime = Math.round(endTime - startTime) + ' ms';
        this.btState.stats.responses++;
        return answer;
    }
    /**
       * Main loop of the meter handler.
       * */
    async stateMachine() {
        let nextAction;
        const DELAY_MS = (this.simulation ? 20 : 750); // Update the status every X ms.
        const TIMEOUT_MS = (this.simulation ? 1000 : 30000); // Give up some operations after X ms.
        this.btState.started = true;
        log.debug('Current state:' + this.btState.state);
        // Consecutive state counted. Can be used to timeout.
        if (this.btState.state == this.btState.prev_state) {
            this.btState.state_cpt++;
        }
        else {
            this.btState.state_cpt = 0;
        }
        // Stop request from API
        if (this.btState.stopRequest) {
            this.btState.state = constants_1.State.STOPPING;
        }
        log.debug('\State:' + this.btState.state);
        switch (this.btState.state) {
            case constants_1.State.NOT_CONNECTED: // initial state on Start()
                if (this.simulation) {
                    nextAction = this.fakePairDevice.bind(this);
                }
                else {
                    nextAction = this.btPairDevice.bind(this);
                }
                break;
            case constants_1.State.CONNECTING: // waiting for connection to complete
                nextAction = undefined;
                break;
            case constants_1.State.DEVICE_PAIRED: // connection complete, acquire meter state
                if (this.simulation) {
                    nextAction = this.fakeSubscribe.bind(this);
                }
                else {
                    nextAction = this.btSubscribe.bind(this);
                }
                break;
            case constants_1.State.SUBSCRIBING: // waiting for Bluetooth interfaces
                nextAction = undefined;
                if (this.btState.state_cpt > (TIMEOUT_MS / DELAY_MS)) {
                    // Timeout, try to resubscribe
                    log.warn('Timeout in SUBSCRIBING');
                    this.btState.state = constants_1.State.DEVICE_PAIRED;
                    this.btState.state_cpt = 0;
                }
                break;
            case constants_1.State.METER_INIT: // ready to communicate, acquire meter status
                nextAction = this.meterInit.bind(this);
                break;
            case constants_1.State.METER_INITIALIZING: // reading the meter status
                if (this.btState.state_cpt > (TIMEOUT_MS / DELAY_MS)) {
                    log.warn('Timeout in METER_INITIALIZING');
                    // Timeout, try to resubscribe
                    if (this.simulation) {
                        nextAction = this.fakeSubscribe.bind(this);
                    }
                    else {
                        nextAction = this.btSubscribe.bind(this);
                    }
                    this.btState.state_cpt = 0;
                }
                nextAction = undefined;
                break;
            case constants_1.State.IDLE: // ready to process commands from API
                if (this.btState.command != null) {
                    nextAction = this.processCommand.bind(this);
                }
                else {
                    nextAction = this.refresh.bind(this);
                }
                break;
            case constants_1.State.ERROR: // anytime an error happens
                nextAction = this.disconnect.bind(this);
                break;
            case constants_1.State.BUSY: // while a command in going on
                if (this.btState.state_cpt > (TIMEOUT_MS / DELAY_MS)) {
                    log.warn('Timeout in BUSY');
                    // Timeout, try to resubscribe
                    if (this.simulation) {
                        nextAction = this.fakeSubscribe.bind(this);
                    }
                    else {
                        nextAction = this.btSubscribe.bind(this);
                    }
                    this.btState.state_cpt = 0;
                }
                nextAction = undefined;
                break;
            case constants_1.State.STOPPING:
                nextAction = this.disconnect.bind(this);
                break;
            case constants_1.State.STOPPED: // after a disconnector or Stop() request, stops the state machine.
                nextAction = undefined;
                break;
            default:
                break;
        }
        this.btState.prev_state = this.btState.state;
        if (nextAction != undefined) {
            log.debug('\tExecuting:' + nextAction.name);
            try {
                await nextAction();
            }
            catch (e) {
                log.error('Exception in state machine', e);
            }
        }
        if (this.btState.state != constants_1.State.STOPPED) {
            (0, utils_1.sleep)(DELAY_MS).then(async () => { await this.stateMachine(); }); // Recheck status in DELAY_MS ms
        }
        else {
            log.debug('\tTerminating State machine');
            this.btState.started = false;
        }
    }
    /**
       * Called from state machine to execute a single command from btState.command property
       * */
    async processCommand() {
        try {
            const command = this.btState.command;
            const result = constants_1.ResultCode.SUCCESS;
            let packet, response, startGen;
            if (command == null) {
                return;
            }
            this.btState.state = constants_1.State.BUSY;
            this.btState.stats.commands++;
            log.info('\t\tExecuting command :' + command);
            packet = command.getPacket();
            response = await this.SendAndResponse(packet);
            // Caller expects a valid property in GetState() once command is executed.
            log.debug('\t\tRefreshing current state');
            await this.refresh();
            command.error = false;
            command.pending = false;
            this.btState.command = null;
            this.btState.state = constants_1.State.IDLE;
            log.debug('\t\tCompleted command executed');
        }
        catch (err) {
            log.error('** error while executing command: ' + err);
            this.btState.state = constants_1.State.METER_INIT;
            this.btState.stats.exceptions++;
        }
    }
    /**
       * Acquire the current mode and serial number of the device.
       * */
    async meterInit() {
        try {
            this.btState.state = constants_1.State.METER_INITIALIZING;
            this.btState.meter.serial = await this.iot.getSerialNumber();
            log.info('\t\tSerial number:' + this.btState.meter.serial);
            this.btState.meter.battery = await this.iot.getBatteryLevel();
            log.debug('\t\tBattery (%):' + this.btState.meter.battery);
            this.btState.state = constants_1.State.IDLE;
        }
        catch (err) {
            log.warn('Error while initializing meter :' + err);
            this.btState.stats.exceptions++;
            this.btState.state = constants_1.State.DEVICE_PAIRED;
        }
    }
    /*
      * Close the bluetooth interface (unpair)
      * */
    async disconnect() {
        this.btState.command = null;
        this.btState.reset(this.onDisconnected.bind(this));
        this.btState.state = constants_1.State.STOPPED;
    }
    /**
       * Event called by browser BT api when the device disconnect
       * */
    async onDisconnected() {
        log.warn('* GATT Server disconnected event, will try to reconnect *');
        this.btState.reset();
        this.btState.stats['GATT disconnects']++;
        this.btState.state = constants_1.State.DEVICE_PAIRED; // Try to auto-reconnect the interfaces without pairing
    }
    /**
       * Joins the arguments into a single buffer
       * @returns {ArrayBuffer} concatenated buffer
       */
    arrayBufferConcat(buffer1, buffer2) {
        let length = 0;
        let buffer;
        for (var i in arguments) {
            buffer = arguments[i];
            if (buffer) {
                length += buffer.byteLength;
            }
        }
        const joined = new Uint8Array(length);
        let offset = 0;
        for (i in arguments) {
            buffer = arguments[i];
            joined.set(new Uint8Array(buffer), offset);
            offset += buffer.byteLength;
        }
        return joined.buffer;
    }
    /**
       * Event called by bluetooth characteristics when receiving data
       * @param {any} event
       */
    handleNotifications(event) {
        const value = event.target.value;
        if (value != null) {
            log.debug('<< ' + (0, utils_1.buf2hex)(value.buffer));
            if (this.btState.response != null) {
                this.btState.response = this.arrayBufferConcat(this.btState.response, value.buffer);
            }
            else {
                this.btState.response = value.buffer.slice(0);
            }
            this.btState.lastMeasure = NotificationData_1.NotificationData.parse(this.btState.response);
        }
    }
    /**
       * This function will succeed only if called as a consequence of a user-gesture
       * E.g. button click. This is due to BlueTooth API security model.
       * */
    async btPairDevice() {
        this.btState.state = constants_1.State.CONNECTING;
        const forceSelection = this.btState.options.forceDeviceSelection;
        log.debug('btPairDevice(' + forceSelection + ')');
        try {
            if (typeof (navigator.bluetooth?.getAvailability) === 'function') {
                const availability = await navigator.bluetooth.getAvailability();
                if (!availability) {
                    log.error('Bluetooth not available in browser.');
                    throw new Error('Browser does not provide bluetooth');
                }
            }
            let device = null;
            // Do we already have permission?
            if (typeof (navigator.bluetooth?.getDevices) === 'function' &&
                !forceSelection) {
                const availableDevices = await navigator.bluetooth.getDevices();
                availableDevices.forEach(function (dev, index) {
                    log.debug('Found authorized device :' + dev.name);
                    device = dev;
                });
                log.debug('navigator.bluetooth.getDevices()=' + device);
            }
            // If not, request from user
            if (device == null) {
                device = await navigator.bluetooth
                    .requestDevice({
                    acceptAllDevices: false,
                    filters: [{ services: [constants_1.BlueToothIOTUUID.ServiceUuid.toLowerCase()] }],
                    optionalServices: ['battery_service', 'generic_access', 'device_information', constants_1.BlueToothIOTUUID.ServiceUuid.toLowerCase()]
                });
            }
            this.btState.btDevice = device;
            this.btState.state = constants_1.State.DEVICE_PAIRED;
            log.info('Bluetooth device ' + device.name + ' connected.');
            await (0, utils_1.sleep)(500);
        }
        catch (err) {
            log.warn('** error while connecting: ' + err.message);
            this.btState.reset(this.onDisconnected.bind(this));
            this.btState.state = constants_1.State.ERROR;
            this.btState.stats.exceptions++;
        }
    }
    async fakePairDevice() {
        this.btState.state = constants_1.State.CONNECTING;
        const forceSelection = this.btState.options.forceDeviceSelection;
        log.debug('fakePairDevice(' + forceSelection + ')');
        try {
            const device = {
                name: 'FakeBTDevice',
                gatt: { connected: true, device: null, connect: null, disconnect: null, getPrimaryService: null, getPrimaryServices: null },
                id: '1',
                forget: null,
                watchAdvertisements: null,
                watchingAdvertisements: null,
                addEventListener: null,
                removeEventListener: null,
                dispatchEvent: null,
                onadvertisementreceived: null,
                ongattserverdisconnected: null,
                oncharacteristicvaluechanged: null,
                onserviceadded: null,
                onserviceremoved: null,
                onservicechanged: null
            };
            this.btState.btDevice = device;
            this.btState.state = constants_1.State.DEVICE_PAIRED;
            log.info('Bluetooth device ' + device.name + ' connected.');
            await (0, utils_1.sleep)(50);
        }
        catch (err) {
            log.warn('** error while connecting: ' + err.message);
            this.btState.reset();
            this.btState.stats.exceptions++;
        }
    }
    /**
       * Once the device is available, initialize the service and the 2 characteristics needed.
       * */
    async btSubscribe() {
        try {
            this.btState.state = constants_1.State.SUBSCRIBING;
            this.btState.stats.subcribes++;
            const device = this.btState.btDevice;
            let gattserver = null;
            if (device && device.gatt) {
                if (!device.gatt.connected || this.btState.btGATTServer == null) {
                    log.debug(`Connecting to GATT Server on ${device.name}...`);
                    device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));
                    this.btState.btGATTServer = await device.gatt.connect();
                    log.debug('> Found GATT server');
                }
                else {
                    log.debug('GATT already connected');
                }
            }
            else {
                this.btState.reset(this.onDisconnected.bind(this));
                this.btState.btDevice = null;
                this.btState.state = constants_1.State.NOT_CONNECTED;
                this.btState.stats.exceptions++;
                return;
            }
            this.btState.btIOTService = await this.btState.btGATTServer.getPrimaryService(constants_1.BlueToothIOTUUID.ServiceUuid);
            log.debug('> Found IOTesting board service');
            this.btState.charWrite = await this.btState.btIOTService.getCharacteristic(constants_1.BlueToothIOTUUID.CommandCharUuid);
            log.debug('> Found command characteristic');
            this.btState.charRead = await this.btState.btIOTService.getCharacteristic(constants_1.BlueToothIOTUUID.StatusCharUuid);
            log.debug('> Found notifications characteristic');
            /*
            this.btState.charBattery = await this.btState.btIOTService.getCharacteristic('0003cdd6-0000-1000-8000-00805f9b34fb')
            this.btState.charFirmware = await this.btState.btIOTService.getCharacteristic('0003cdd9-0000-1000-8000-00805f9b34fb')
            this.btState.charSerial = await this.btState.btIOTService.getCharacteristic('0003cdd8-0000-1000-8000-00805f9b34fb') */
            this.btState.response = null;
            this.btState.charRead.addEventListener('characteristicvaluechanged', this.handleNotifications.bind(this));
            this.btState.charRead.startNotifications();
            log.info('> Bluetooth interfaces ready.');
            this.btState.stats.last_connect = new Date().toISOString();
            await (0, utils_1.sleep)(50);
            this.btState.state = constants_1.State.METER_INIT;
        }
        catch (err) {
            log.warn('** error while subscribing: ' + err.message);
            this.btState.reset();
            this.btState.state = constants_1.State.DEVICE_PAIRED;
            this.btState.stats.exceptions++;
        }
    }
    async fakeSubscribe() {
        try {
            this.btState.state = constants_1.State.SUBSCRIBING;
            this.btState.stats.subcribes++;
            const device = this.btState.btDevice;
            if (!device?.gatt?.connected) {
                log.debug(`Connecting to GATT Server on ${device?.name}...`);
                log.debug('> Found GATT server');
            }
            log.debug('> Found Serial service');
            log.debug('> Found write characteristic');
            log.debug('> Found read characteristic');
            this.btState.response = null;
            log.info('> Bluetooth interfaces ready.');
            this.btState.stats.last_connect = new Date().toISOString();
            await (0, utils_1.sleep)(10);
            this.btState.state = constants_1.State.METER_INIT;
        }
        catch (err) {
            log.warn('** error while subscribing: ' + err.message);
            this.btState.reset(this.onDisconnected.bind(this));
            this.btState.state = constants_1.State.DEVICE_PAIRED;
            this.btState.stats.exceptions++;
        }
    }
    /**
       * When idle, this function is called
       * */
    async refresh() {
        this.btState.state = constants_1.State.BUSY;
        try {
            log.debug('\t\tFinished refreshing current state');
            this.btState.state = constants_1.State.IDLE;
        }
        catch (err) {
            log.warn('Error while refreshing measure' + err);
            this.btState.state = constants_1.State.DEVICE_PAIRED;
            this.btState.stats.exceptions++;
        }
    }
    SetSimulation(value) {
        this.simulation = value;
    }
}
exports.Driver = Driver;

},{"./APIState":1,"./IOTestingBoard":5,"./NotificationData":7,"./constants":8,"./utils":11,"loglevel":12}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IOTestingBoard = void 0;
const log = require("loglevel");
class IOTestingBoard {
    constructor(fnSendAndResponse, btApi) {
        this.SendAndResponse = fnSendAndResponse;
        this.btState = btApi;
    }
    async execute(cmd) {
        if (cmd == null) {
            return null;
        }
        const packet = cmd.getPacket();
        return await this.SendAndResponse(packet);
    }
    uintToString(uintArray) {
        const encodedString = String.fromCharCode.apply(null, uintArray);
        const decodedString = decodeURIComponent(encodedString);
        return decodedString;
    }
    /**
       * Gets the meter serial number
       * @returns {string}
       */
    async getSerialNumber() {
        log.debug('\t\tReading serial number');
        /*const dv: DataView = await this.btState.charSerial.readValue()
        return this.uintToString(dv)*/
        return "???";
    }
    /**
       * Gets the battery level indication
       * @returns {number} percentage (%)
       */
    async getBatteryLevel() {
        log.debug('\t\tReading battery voltage');
        /*const dv: DataView = await this.btState.charBattery.readValue()
        return dv.getUint8(0)*/
        return 100;
    }
    parseNotification(notification) {
        return {};
    }
}
exports.IOTestingBoard = IOTestingBoard;

},{"loglevel":12}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeterState = void 0;
const constants_1 = require("./constants");
/**
 * Current state of the meter
 * */
class MeterState {
    constructor() {
        this.firmware = '???'; // Firmware version
        this.serial = '???'; // Serial number
        this.mode = constants_1.BoardMode.MODE_UNDEFINED;
        this.setpoint = 0xFFFF;
        this.actual = 0xFFFF;
        this.free_bytes = 0;
        this.battery = 0;
    }
}
exports.MeterState = MeterState;

},{"./constants":8}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationData = void 0;
// Must match with __get_notification_data in boardbt.py firmware code.
class NotificationData {
    constructor() {
        this.WiFi = 0;
        this.Relay = 0;
        this.Bluetooth = 0;
        this.Frequency = 0;
        this.Verbose = false;
        this.Test = false;
        this.V_with_load = false;
        this.LastResult = false;
        this.Actual_R = 0;
        this.Setpoint_R = 0;
        this.Memfree = 0;
        this.Errors = 0;
        this.Battery = 0;
        this.Timestamp = new Date();
    }
    static parse(buf) {
        var output = new NotificationData();
        var dv = new DataView(buf);
        var status1 = dv.getUint8(1);
        var status2 = dv.getUint8(0);
        output.WiFi = (status1 >> 6) & 3;
        output.Relay = (status1 >> 4) & 3;
        output.Bluetooth = (status1 >> 1) & 7;
        output.Frequency = (status2 >> 5) & 3;
        output.Verbose = (status2 & 8) != 0;
        output.Test = (status2 & 4) != 0;
        output.V_with_load = (status2 & 2) != 0;
        output.LastResult = (status2 & 1) != 0;
        output.Actual_R = dv.getUint16(2);
        output.Setpoint_R = dv.getUint16(4);
        output.Memfree = dv.getUint32(6);
        output.Errors = dv.getUint8(10);
        output.Battery = dv.getUint8(11);
        return output;
    }
}
exports.NotificationData = NotificationData;

},{}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlueToothIOTUUID = exports.MAX_U_GEN = exports.ResultCode = exports.State = exports.BoardMode = exports.CommandType = void 0;
/**
 * Commands recognized by IOTesting Board module
 * */
exports.CommandType = {
    NONE_UNKNOWN: 0,
    COMMAND_ENABLE_WIFI: 0x01,
    COMMAND_DISABLE_WIFI: 0x02,
    COMMAND_ENABLE_WEBREPL: 0x03,
    COMMAND_DISABLE_WEBREPL: 0x04,
    COMMAND_BREAK: 0x05,
    COMMAND_MODE_METER: 0x06,
    COMMAND_MODE_RESISTORS: 0x07,
    COMMAND_MODE_V_LOAD: 0x08,
    COMMAND_REBOOT: 0x09,
    COMMAND_RUN_TEST: 0x0A,
    COMMAND_LIGHT_SLEEP: 0x0B,
    COMMAND_DEEP_SLEEP: 0x0C,
    COMMAND_METER_COMMANDS: 0x0D,
    COMMAND_SET_INITIAL_METER_COMM: 0x0E,
    COMMAND_SET_WIFI_NETWORK: 0x0F,
    COMMAND_SET_WIFI_PASSWORD: 0x10,
    COMMAND_SET_INITIAL_BLUETOOTH: 0x11,
    COMMAND_SET_INITIAL_WIFI: 0x12,
    COMMAND_SET_DEEPSLEEP_MIN: 0x13,
    COMMAND_SET_VERBOSE: 0x14,
    COMMAND_SET_INITIAL_COMMAND_TYPE: 0x15,
    COMMAND_SET_INITIAL_COMMAND_SETPOINT: 0x16,
    COMMAND_R_TEST: 0x17,
    COMMAND_SET_CPU: 0x18,
    COMMAND_SET_OTA: 0x19,
    COMMAND_CONFIGURE_METER_COMM: 0x20,
    COMMAND_SET_BLUETOOTH_NAME: 0x21,
    COMMAND_REFRESH: 0x22
};
exports.BoardMode = {
    MODE_UNDEFINED: 0,
    MODE_METER: 1,
    MODE_RESISTOR: 2,
    MODE_V_WITH_LOAD: 3,
    MODE_TEST: 4
};
/*
 * Internal state machine descriptions
 */
exports.State = {
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
    METER_INITIALIZING: 'Reading board state...'
};
exports.ResultCode = {
    FAILED_NO_RETRY: 1,
    FAILED_SHOULD_RETRY: 2,
    SUCCESS: 0
};
exports.MAX_U_GEN = 27.0; // maximum voltage
/*
 * Bluetooth constants
 */
exports.BlueToothIOTUUID = {
    ServiceUuid: '0003cdd5-0000-1000-8000-00805f9b0131',
    StatusCharUuid: '0003cdd3-0000-1000-8000-00805f9b0131',
    CommandCharUuid: '0003cdd4-0000-1000-8000-00805f9b0131' // commands to the board
};

},{}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlueToothIOTUUID = exports.State = exports.setLevel = exports.CommandType = exports.Command = exports.driver = exports.SimpleExecuteJSON = exports.ExecuteJSON = exports.GetStateJSON = exports.GetState = exports.SimpleExecute = exports.Execute = exports.Pair = exports.Stop = void 0;
const constants_1 = require("./constants");
Object.defineProperty(exports, "State", { enumerable: true, get: function () { return constants_1.State; } });
Object.defineProperty(exports, "CommandType", { enumerable: true, get: function () { return constants_1.CommandType; } });
const Command_1 = require("./Command");
Object.defineProperty(exports, "Command", { enumerable: true, get: function () { return Command_1.Command; } });
const loglevel_1 = require("loglevel");
Object.defineProperty(exports, "setLevel", { enumerable: true, get: function () { return loglevel_1.setLevel; } });
const meterPublicAPI_1 = require("./meterPublicAPI");
Object.defineProperty(exports, "Stop", { enumerable: true, get: function () { return meterPublicAPI_1.Stop; } });
Object.defineProperty(exports, "Pair", { enumerable: true, get: function () { return meterPublicAPI_1.Pair; } });
Object.defineProperty(exports, "Execute", { enumerable: true, get: function () { return meterPublicAPI_1.Execute; } });
Object.defineProperty(exports, "SimpleExecute", { enumerable: true, get: function () { return meterPublicAPI_1.SimpleExecute; } });
Object.defineProperty(exports, "GetState", { enumerable: true, get: function () { return meterPublicAPI_1.GetState; } });
Object.defineProperty(exports, "GetStateJSON", { enumerable: true, get: function () { return meterPublicAPI_1.GetStateJSON; } });
Object.defineProperty(exports, "ExecuteJSON", { enumerable: true, get: function () { return meterPublicAPI_1.ExecuteJSON; } });
Object.defineProperty(exports, "SimpleExecuteJSON", { enumerable: true, get: function () { return meterPublicAPI_1.SimpleExecuteJSON; } });
Object.defineProperty(exports, "driver", { enumerable: true, get: function () { return meterPublicAPI_1.driver; } });
const constants_2 = require("./constants");
Object.defineProperty(exports, "BlueToothIOTUUID", { enumerable: true, get: function () { return constants_2.BlueToothIOTUUID; } });
// Defines default level on startup
(0, loglevel_1.setLevel)(loglevel_1.levels.ERROR, true);

},{"./Command":2,"./constants":8,"./meterPublicAPI":10,"loglevel":12}],10:[function(require,module,exports){
"use strict";
/*
 * This file contains the public API of the meter, i.e. the functions designed
 * to be called from third party code.
 * 1- Pair() : bool
 * 2- Execute(Command) : bool + JSON version
 * 3- Stop() : bool
 * 4- GetState() : array + JSON version
 * 5- SimpleExecute(Command) : returns the updated measurement or null
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stop = exports.Pair = exports.Execute = exports.SimpleExecute = exports.SimpleExecuteJSON = exports.ExecuteJSON = exports.GetStateJSON = exports.GetState = exports.driver = void 0;
const Driver_1 = require("./Driver");
const CommandResult_1 = require("./CommandResult");
const Command_1 = require("./Command");
const constants_1 = require("./constants");
const utils_1 = require("./utils");
const loglevel_1 = __importDefault(require("loglevel"));
// Useful information for debugging, even if it should not be exposed
exports.driver = new Driver_1.Driver();
/**
 * Returns a copy of the current state
 * @returns {array} status of meter
 */
async function GetState() {
    let ready = false;
    let initializing = false;
    switch (exports.driver.btState.state) {
        // States requiring user input
        case constants_1.State.ERROR:
        case constants_1.State.STOPPED:
        case constants_1.State.NOT_CONNECTED:
            ready = false;
            initializing = false;
            break;
        case constants_1.State.BUSY:
        case constants_1.State.IDLE:
            ready = true;
            initializing = false;
            break;
        case constants_1.State.CONNECTING:
        case constants_1.State.DEVICE_PAIRED:
        case constants_1.State.METER_INIT:
        case constants_1.State.METER_INITIALIZING:
        case constants_1.State.SUBSCRIBING:
            initializing = true;
            ready = false;
            break;
        default:
            ready = false;
            initializing = false;
    }
    return {
        lastSetpoint: exports.driver.btState.lastMeasure.Setpoint_R,
        lastMeasure: exports.driver.btState.lastMeasure.Actual_R,
        deviceName: exports.driver.btState.btDevice ? exports.driver.btState.btDevice.name : '',
        deviceSerial: exports.driver.btState.meter?.serial,
        stats: exports.driver.btState.stats,
        deviceMode: exports.driver.btState.meter?.mode,
        status: exports.driver.btState.state,
        batteryLevel: exports.driver.btState.meter?.battery,
        ready,
        initializing
    };
}
exports.GetState = GetState;
/**
 * Provided for compatibility with Blazor
 * @returns {string} JSON state object
 */
async function GetStateJSON() {
    return JSON.stringify(await GetState());
}
exports.GetStateJSON = GetStateJSON;
/**
 * Execute command with setpoints, JSON version
 * @param {string} jsonCommand the command to execute
 * @returns {string} JSON command object
 */
async function ExecuteJSON(jsonCommand) {
    const command = JSON.parse(jsonCommand);
    // deserialized object has lost its methods, let's recreate a complete one.
    const command2 = Command_1.Command.CreateFourSP(command.type, command.setpoint, command.setpoint2, command.setpoint3, command.setpoint4);
    return JSON.stringify(await Execute(command2));
}
exports.ExecuteJSON = ExecuteJSON;
async function SimpleExecuteJSON(jsonCommand) {
    const command = JSON.parse(jsonCommand);
    // deserialized object has lost its methods, let's recreate a complete one.
    const command2 = Command_1.Command.CreateFourSP(command.type, command.setpoint, command.setpoint2, command.setpoint3, command.setpoint4);
    return JSON.stringify(await SimpleExecute(command2));
}
exports.SimpleExecuteJSON = SimpleExecuteJSON;
/**
 * Execute a command and returns the measurement or setpoint with error flag and message
 * @param {Command} command
 */
async function SimpleExecute(command) {
    const SIMPLE_EXECUTE_TIMEOUT_S = 5;
    const cr = new CommandResult_1.CommandResult();
    loglevel_1.default.info('SimpleExecute called...');
    if (command === null) {
        cr.success = false;
        cr.message = 'Invalid command';
        return cr;
    }
    command.pending = true; // In case caller does not set pending flag
    // Fail immediately if not paired.
    if (!exports.driver.btState.started) {
        cr.success = false;
        cr.message = 'Device is not paired';
        loglevel_1.default.warn(cr.message);
        return cr;
    }
    // Another command may be pending.
    if (exports.driver.btState.command != null && exports.driver.btState.command.pending) {
        cr.success = false;
        cr.message = 'Another command is pending';
        loglevel_1.default.warn(cr.message);
        return cr;
    }
    // Wait for completion of the command, or halt of the state machine
    exports.driver.btState.command = Command_1.Command.CreateFourSP(command.type, command.setpoint, command.setpoint2, command.setpoint3, command.setpoint4);
    if (command != null) {
        await (0, utils_1.waitForTimeout)(() => !command.pending || exports.driver.btState.state == constants_1.State.STOPPED, SIMPLE_EXECUTE_TIMEOUT_S);
    }
    // Check if error or timeouts
    if (command.error || command.pending) {
        cr.success = false;
        cr.message = 'Error while executing the command.';
        loglevel_1.default.warn(cr.message);
        // Reset the active command
        exports.driver.btState.command = null;
        return cr;
    }
    // State is updated by execute command, so we can use btState right away
    cr.value = exports.driver.btState.lastMeasure.Setpoint_R;
    cr.unit = "Ohms";
    cr.secondary_value = exports.driver.btState.lastMeasure.Actual_R;
    cr.secondary_unit = "Ohms";
    cr.success = true;
    cr.message = 'Command executed successfully';
    return cr;
}
exports.SimpleExecute = SimpleExecute;
/**
 * External interface to require a command to be executed.
 * The bluetooth device pairing window will open if device is not connected.
 * This may fail if called outside a user gesture.
 * @param {Command} command
 */
async function Execute(command) {
    loglevel_1.default.info('Execute called...');
    if (command == null) {
        return null;
    }
    command.pending = true;
    let cpt = 0;
    while (exports.driver.btState.command != null && exports.driver.btState.command.pending && cpt < 300) {
        loglevel_1.default.debug('Waiting for current command to complete...');
        await (0, utils_1.sleep)(100);
        cpt++;
    }
    loglevel_1.default.info('Setting new command :' + command);
    exports.driver.btState.command = Command_1.Command.CreateFourSP(command.type, command.setpoint, command.setpoint2, command.setpoint3, command.setpoint4);
    // Start the regular state machine
    if (!exports.driver.btState.started) {
        exports.driver.btState.state = constants_1.State.NOT_CONNECTED;
        await exports.driver.stateMachine();
    }
    // Wait for completion of the command, or halt of the state machine
    if (command != null) {
        await (0, utils_1.waitFor)(() => !command.pending || exports.driver.btState.state == constants_1.State.STOPPED);
    }
    // Return the command object result
    return command;
}
exports.Execute = Execute;
/**
 * MUST BE CALLED FROM A USER GESTURE EVENT HANDLER
  * @returns {boolean} true if meter is ready to execute command
 * */
async function Pair(forceSelection = false) {
    loglevel_1.default.info('Pair(' + forceSelection + ') called...');
    exports.driver.btState.options.forceDeviceSelection = forceSelection;
    if (!exports.driver.btState.started) {
        exports.driver.btState.state = constants_1.State.NOT_CONNECTED;
        exports.driver.stateMachine(); // Start it
    }
    else if (exports.driver.btState.state == constants_1.State.ERROR) {
        exports.driver.btState.state = constants_1.State.NOT_CONNECTED; // Try to restart
    }
    await (0, utils_1.waitFor)(() => exports.driver.btState.state == constants_1.State.IDLE || exports.driver.btState.state == constants_1.State.STOPPED);
    loglevel_1.default.info('Pairing completed, state :', exports.driver.btState.state);
    return (exports.driver.btState.state != constants_1.State.STOPPED);
}
exports.Pair = Pair;
/**
 * Stops the state machine and disconnects bluetooth.
 * */
async function Stop() {
    loglevel_1.default.info('Stop request received');
    exports.driver.btState.stopRequest = true;
    await (0, utils_1.sleep)(100);
    while (exports.driver.btState.started || (exports.driver.btState.state != constants_1.State.STOPPED && exports.driver.btState.state != constants_1.State.NOT_CONNECTED)) {
        exports.driver.btState.stopRequest = true;
        await (0, utils_1.sleep)(100);
    }
    exports.driver.btState.command = null;
    exports.driver.btState.stopRequest = false;
    loglevel_1.default.warn('Stopped on request.');
    return true;
}
exports.Stop = Stop;

},{"./Command":2,"./CommandResult":3,"./Driver":4,"./constants":8,"./utils":11,"loglevel":12}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buf2hex = exports.Parse = exports.waitForTimeout = exports.waitFor = exports.sleep = void 0;
const sleep = async (ms) => await new Promise(r => setTimeout(r, ms));
exports.sleep = sleep;
const waitFor = async function waitFor(f) {
    while (!f())
        await (0, exports.sleep)(100 + Math.random() * 25);
    return f();
};
exports.waitFor = waitFor;
const waitForTimeout = async function waitFor(f, timeoutSec) {
    let totalTimeMs = 0;
    while (!f() && totalTimeMs < timeoutSec * 1000) {
        const delayMs = 100 + Math.random() * 25;
        totalTimeMs += delayMs;
        await (0, exports.sleep)(delayMs);
    }
    return f();
};
exports.waitForTimeout = waitForTimeout;
/**
 * Helper function to convert a value into an enum value

 */
function Parse(enumtype, enumvalue) {
    for (const enumName in enumtype) {
        if (enumtype[enumName] == enumvalue) {
            /* jshint -W061 */
            return eval(enumtype + '.' + enumName);
        }
    }
    return null;
}
exports.Parse = Parse;
/**
 * Helper function to dump arraybuffer as hex string
 */
function buf2hex(buffer) {
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join(' ');
}
exports.buf2hex = buf2hex;
function hex2buf(input) {
    if (typeof input !== 'string') {
        throw new TypeError('Expected input to be a string');
    }
    const hexstr = input.replace(/\s+/g, '');
    if ((hexstr.length % 2) !== 0) {
        throw new RangeError('Expected string to be an even number of characters');
    }
    const view = new Uint8Array(hexstr.length / 2);
    for (let i = 0; i < hexstr.length; i += 2) {
        view[i / 2] = parseInt(hexstr.substring(i, i + 2), 16);
    }
    return view.buffer;
}

},{}],12:[function(require,module,exports){
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

},{}]},{},[9])(9)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9BUElTdGF0ZS5qcyIsImpzL0NvbW1hbmQuanMiLCJqcy9Db21tYW5kUmVzdWx0LmpzIiwianMvRHJpdmVyLmpzIiwianMvSU9UZXN0aW5nQm9hcmQuanMiLCJqcy9NZXRlclN0YXRlLmpzIiwianMvTm90aWZpY2F0aW9uRGF0YS5qcyIsImpzL2NvbnN0YW50cy5qcyIsImpzL21ldGVyQXBpLmpzIiwianMvbWV0ZXJQdWJsaWNBUEkuanMiLCJqcy91dGlscy5qcyIsIm5vZGVfbW9kdWxlcy9sb2dsZXZlbC9saWIvbG9nbGV2ZWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNWNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDek5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5CVEFwaVN0YXRlID0gdm9pZCAwO1xyXG5jb25zdCBNZXRlclN0YXRlXzEgPSByZXF1aXJlKFwiLi9NZXRlclN0YXRlXCIpO1xyXG5jb25zdCBjb25zdGFudHNfMSA9IHJlcXVpcmUoXCIuL2NvbnN0YW50c1wiKTtcclxuY29uc3QgTm90aWZpY2F0aW9uRGF0YV8xID0gcmVxdWlyZShcIi4vTm90aWZpY2F0aW9uRGF0YVwiKTtcclxuY29uc3QgbG9nID0gcmVxdWlyZShcImxvZ2xldmVsXCIpO1xyXG4vLyBDdXJyZW50IHN0YXRlIG9mIHRoZSBibHVldG9vdGhcclxuY2xhc3MgQlRBcGlTdGF0ZSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuTk9UX0NPTk5FQ1RFRDtcclxuICAgICAgICB0aGlzLnByZXZfc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5OT1RfQ09OTkVDVEVEO1xyXG4gICAgICAgIHRoaXMuc3RhdGVfY3B0ID0gMDtcclxuICAgICAgICB0aGlzLnN0YXJ0ZWQgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLnN0b3BSZXF1ZXN0ID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5sYXN0TWVhc3VyZSA9IG5ldyBOb3RpZmljYXRpb25EYXRhXzEuTm90aWZpY2F0aW9uRGF0YSgpO1xyXG4gICAgICAgIHRoaXMubWV0ZXIgPSBuZXcgTWV0ZXJTdGF0ZV8xLk1ldGVyU3RhdGUoKTtcclxuICAgICAgICB0aGlzLmNvbW1hbmQgPSBudWxsO1xyXG4gICAgICAgIHRoaXMucmVzcG9uc2UgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuYnREZXZpY2UgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuYnRHQVRUU2VydmVyID0gbnVsbDtcclxuICAgICAgICB0aGlzLmJ0SU9UU2VydmljZSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5jaGFyUmVhZCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5jaGFyV3JpdGUgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuY2hhclNlcmlhbCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5jaGFyRmlybXdhcmUgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuY2hhckJhdHRlcnkgPSBudWxsO1xyXG4gICAgICAgIC8vIGdlbmVyYWwgc3RhdGlzdGljcyBmb3IgZGVidWdnaW5nXHJcbiAgICAgICAgdGhpcy5zdGF0cyA9IHtcclxuICAgICAgICAgICAgcmVxdWVzdHM6IDAsXHJcbiAgICAgICAgICAgIHJlc3BvbnNlczogMCxcclxuICAgICAgICAgICAgbW9kYnVzX2Vycm9yczogMCxcclxuICAgICAgICAgICAgJ0dBVFQgZGlzY29ubmVjdHMnOiAwLFxyXG4gICAgICAgICAgICBleGNlcHRpb25zOiAwLFxyXG4gICAgICAgICAgICBzdWJjcmliZXM6IDAsXHJcbiAgICAgICAgICAgIGNvbW1hbmRzOiAwLFxyXG4gICAgICAgICAgICByZXNwb25zZVRpbWU6IDAuMCxcclxuICAgICAgICAgICAgbGFzdFJlc3BvbnNlVGltZTogJz8gbXMnLFxyXG4gICAgICAgICAgICBsYXN0X2Nvbm5lY3Q6IG5ldyBEYXRlKDIwMjAsIDEsIDEpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMub3B0aW9ucyA9IHtcclxuICAgICAgICAgICAgZm9yY2VEZXZpY2VTZWxlY3Rpb246IHRydWVcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG4gICAgcmVzZXQob25EaXNjb25uZWN0RXZlbnQgPSBudWxsKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY2hhclJlYWQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYnREZXZpY2U/LmdhdHQ/LmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2hhclJlYWQuc3RvcE5vdGlmaWNhdGlvbnMoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHsgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5idERldmljZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5idERldmljZT8uZ2F0dD8uY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9nLndhcm4oJyogQ2FsbGluZyBkaXNjb25uZWN0IG9uIGJ0ZGV2aWNlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQXZvaWQgdGhlIGV2ZW50IGZpcmluZyB3aGljaCBtYXkgbGVhZCB0byBhdXRvLXJlY29ubmVjdFxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnREZXZpY2UucmVtb3ZlRXZlbnRMaXN0ZW5lcignZ2F0dHNlcnZlcmRpc2Nvbm5lY3RlZCcsIG9uRGlzY29ubmVjdEV2ZW50KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ0RGV2aWNlLmdhdHQuZGlzY29ubmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhdGNoIChlcnJvcikgeyB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuYnRHQVRUU2VydmVyID0gbnVsbDtcclxuICAgICAgICB0aGlzLmNoYXJCYXR0ZXJ5ID0gbnVsbDtcclxuICAgICAgICB0aGlzLmNoYXJGaXJtd2FyZSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5jaGFyUmVhZCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5jaGFyU2VyaWFsID0gbnVsbDtcclxuICAgICAgICB0aGlzLmNoYXJXcml0ZSA9IG51bGw7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5CVEFwaVN0YXRlID0gQlRBcGlTdGF0ZTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9QVBJU3RhdGUuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5Db21tYW5kID0gdm9pZCAwO1xyXG5jb25zdCBjb25zdGFudHNfMSA9IHJlcXVpcmUoXCIuL2NvbnN0YW50c1wiKTtcclxuLyoqXHJcbiAqIENvbW1hbmQgdG8gdGhlIG1ldGVyLCBtYXkgaW5jbHVkZSBzZXRwb2ludFxyXG4gKiAqL1xyXG5jbGFzcyBDb21tYW5kIHtcclxuICAgIC8qKlxyXG4gICAgICAgKiBDcmVhdGVzIGEgbmV3IGNvbW1hbmRcclxuICAgICAgICogQHBhcmFtIHtDb21tYW5kVHlwZX0gY3R5cGVcclxuICAgICAgICovXHJcbiAgICBjb25zdHJ1Y3RvcihjdHlwZSkge1xyXG4gICAgICAgIHRoaXMudHlwZSA9IHBhcnNlSW50KGN0eXBlKTtcclxuICAgICAgICB0aGlzLnNldHBvaW50ID0gbnVsbDtcclxuICAgICAgICB0aGlzLnNldHBvaW50ID0gbnVsbDtcclxuICAgICAgICB0aGlzLnNldHBvaW50MyA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5zZXRwb2ludDQgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuZXJyb3IgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLnBlbmRpbmcgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMucmVxdWVzdCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5yZXNwb25zZSA9IG51bGw7XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgQ3JlYXRlTm9TUChjdHlwZSkge1xyXG4gICAgICAgIGxldCBjbWQgPSBuZXcgQ29tbWFuZChjdHlwZSk7XHJcbiAgICAgICAgcmV0dXJuIGNtZDtcclxuICAgIH1cclxuICAgIHN0YXRpYyBDcmVhdGVPbmVTUChjdHlwZSwgc2V0cG9pbnQpIHtcclxuICAgICAgICBsZXQgY21kID0gbmV3IENvbW1hbmQoY3R5cGUpO1xyXG4gICAgICAgIGNtZC5zZXRwb2ludCA9IHNldHBvaW50O1xyXG4gICAgICAgIHJldHVybiBjbWQ7XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgQ3JlYXRlRm91clNQKGN0eXBlLCBzZXQxLCBzZXQyLCBzZXQzLCBzZXQ0KSB7XHJcbiAgICAgICAgbGV0IGNtZCA9IG5ldyBDb21tYW5kKGN0eXBlKTtcclxuICAgICAgICBjbWQuc2V0cG9pbnQgPSBzZXQxO1xyXG4gICAgICAgIGNtZC5zZXRwb2ludDIgPSBzZXQyO1xyXG4gICAgICAgIGNtZC5zZXRwb2ludDMgPSBzZXQzO1xyXG4gICAgICAgIGNtZC5zZXRwb2ludDQgPSBzZXQ0O1xyXG4gICAgICAgIHJldHVybiBjbWQ7XHJcbiAgICB9XHJcbiAgICB0b1N0cmluZygpIHtcclxuICAgICAgICByZXR1cm4gJ1R5cGU6ICcgKyB0aGlzLnR5cGUgKyAnLCBzZXRwb2ludDonICsgdGhpcy5zZXRwb2ludCArICcsIHNldHBvaW50MjogJyArIHRoaXMuc2V0cG9pbnQyICsgJywgcGVuZGluZzonICsgdGhpcy5wZW5kaW5nICsgJywgZXJyb3I6JyArIHRoaXMuZXJyb3I7XHJcbiAgICB9XHJcbiAgICBnZXRQYWNrZXQoKSB7XHJcbiAgICAgICAgdmFyIGJ1ZjtcclxuICAgICAgICB2YXIgZHY7XHJcbiAgICAgICAgc3dpdGNoICh0aGlzLnR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0JSRUFLOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfRElTQUJMRV9XRUJSRVBMOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfRElTQUJMRV9XSUZJOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfRU5BQkxFX1dFQlJFUEw6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9FTkFCTEVfV0lGSTpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0xJR0hUX1NMRUVQOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfTU9ERV9NRVRFUjpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1JFQk9PVDpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1JFRlJFU0g6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9SVU5fVEVTVDpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1JfVEVTVDpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0RFRVBfU0xFRVA6XHJcbiAgICAgICAgICAgICAgICAvLyBObyBwYXJhbWV0ZXJcclxuICAgICAgICAgICAgICAgIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcigxKTtcclxuICAgICAgICAgICAgICAgIGR2ID0gbmV3IERhdGFWaWV3KGJ1Zik7XHJcbiAgICAgICAgICAgICAgICBkdi5zZXRVaW50OCgwLCB0aGlzLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ1ZjtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0NPTkZJR1VSRV9NRVRFUl9DT01NOlxyXG4gICAgICAgICAgICAgICAgYnVmID0gbmV3IEFycmF5QnVmZmVyKDEgKyA1KTtcclxuICAgICAgICAgICAgICAgIGR2ID0gbmV3IERhdGFWaWV3KGJ1Zik7XHJcbiAgICAgICAgICAgICAgICBkdi5zZXRVaW50OCgwLCB0aGlzLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgZHYuc2V0VWludDgoMSwgdGhpcy5zZXRwb2ludCk7XHJcbiAgICAgICAgICAgICAgICBkdi5zZXRVaW50OCgyLCB0aGlzLnNldHBvaW50Mik7XHJcbiAgICAgICAgICAgICAgICBkdi5zZXRVaW50OCgzLCB0aGlzLnNldHBvaW50Myk7XHJcbiAgICAgICAgICAgICAgICBkdi5zZXRVaW50MTYoNCwgdGhpcy5zZXRwb2ludDQpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ1ZjtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9ERUVQU0xFRVBfTUlOOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0NQVTpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9JTklUSUFMX0NPTU1BTkRfU0VUUE9JTlQ6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfSU5JVElBTF9DT01NQU5EX1RZUEU6XHJcbiAgICAgICAgICAgICAgICAvLyBPbmUgVWludDggcGFyYW1ldGVyXHJcbiAgICAgICAgICAgICAgICBidWYgPSBuZXcgQXJyYXlCdWZmZXIoMik7XHJcbiAgICAgICAgICAgICAgICBkdiA9IG5ldyBEYXRhVmlldyhidWYpO1xyXG4gICAgICAgICAgICAgICAgZHYuc2V0VWludDgoMCwgdGhpcy50eXBlKTtcclxuICAgICAgICAgICAgICAgIGR2LnNldFVpbnQ4KDEsIHRoaXMuc2V0cG9pbnQpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ1ZjtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX01FVEVSX0NPTU1BTkRTOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0lOSVRJQUxfQkxVRVRPT1RIOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0lOSVRJQUxfTUVURVJfQ09NTTpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9PVEE6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfVkVSQk9TRTpcclxuICAgICAgICAgICAgICAgIC8vIE9uZSBVaW50OCBwYXJhbWV0ZXIgd2l0aCAxIG9yIDAgdmFsdWVcclxuICAgICAgICAgICAgICAgIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcigyKTtcclxuICAgICAgICAgICAgICAgIGR2ID0gbmV3IERhdGFWaWV3KGJ1Zik7XHJcbiAgICAgICAgICAgICAgICBkdi5zZXRVaW50OCgwLCB0aGlzLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgZHYuc2V0VWludDgoMSwgdGhpcy5zZXRwb2ludCA/IDEgOiAwKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBidWY7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9NT0RFX1JFU0lTVE9SUzpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX01PREVfVl9MT0FEOlxyXG4gICAgICAgICAgICAgICAgLy8gT25lIFVpbnQxNiBSIHBhcmFtZXRlclxyXG4gICAgICAgICAgICAgICAgYnVmID0gbmV3IEFycmF5QnVmZmVyKDMpO1xyXG4gICAgICAgICAgICAgICAgZHYgPSBuZXcgRGF0YVZpZXcoYnVmKTtcclxuICAgICAgICAgICAgICAgIGR2LnNldFVpbnQ4KDAsIHRoaXMudHlwZSk7XHJcbiAgICAgICAgICAgICAgICBkdi5zZXRVaW50MTYoMSwgdGhpcy5zZXRwb2ludCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYnVmO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0JMVUVUT09USF9OQU1FOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX1dJRklfTkVUV09SSzpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9XSUZJX1BBU1NXT1JEOlxyXG4gICAgICAgICAgICAgICAgLy8gT25lIFVURjggc3RyaW5nIHBhcmFtZXRlclxyXG4gICAgICAgICAgICAgICAgbGV0IHV0ZjhFbmNvZGUgPSBuZXcgVGV4dEVuY29kZXIoKTtcclxuICAgICAgICAgICAgICAgIGxldCBieXRlc191dGY4ID0gdXRmOEVuY29kZS5lbmNvZGUodGhpcy5zZXRwb2ludCk7XHJcbiAgICAgICAgICAgICAgICBidWYgPSBuZXcgQXJyYXlCdWZmZXIoMSArIGJ5dGVzX3V0ZjgubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgIGR2ID0gbmV3IERhdGFWaWV3KGJ1Zik7XHJcbiAgICAgICAgICAgICAgICBkdi5zZXRVaW50OCgwLCB0aGlzLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgdmFyIGJ5dGVfbnVtID0gMTtcclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgYnl0ZV92IG9mIGJ5dGVzX3V0ZjgpIHtcclxuICAgICAgICAgICAgICAgICAgICBkdi5zZXRVaW50OChieXRlX251bSwgYnl0ZV92KTtcclxuICAgICAgICAgICAgICAgICAgICBieXRlX251bSsrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ1ZjtcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb21tYW5kJyArIHRoaXMpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBHZXRzIHRoZSBkZWZhdWx0IHNldHBvaW50IGZvciB0aGlzIGNvbW1hbmQgdHlwZVxyXG4gICAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBzZXRwb2ludChzKSBleHBlY3RlZFxyXG4gICAgICAgKi9cclxuICAgIGRlZmF1bHRTZXRwb2ludCgpIHtcclxuICAgICAgICBzd2l0Y2ggKHRoaXMudHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfRU5BQkxFX1dJRkk6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9ESVNBQkxFX1dJRkk6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9FTkFCTEVfV0VCUkVQTDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0RJU0FCTEVfV0VCUkVQTDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0JSRUFLOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfTU9ERV9NRVRFUjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX01PREVfUkVTSVNUT1JTOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgJ1Jlc2lzdGFuY2UgKG9obXMpJzogMHhGRkZGIH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9NT0RFX1ZfTE9BRDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7ICdMb2FkIChvaG1zKSc6IDU1MCB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfUkVCT09UOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfUlVOX1RFU1Q6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9MSUdIVF9TTEVFUDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0RFRVBfU0xFRVA6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9NRVRFUl9DT01NQU5EUzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IEVuYWJsZTogdHJ1ZSB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0lOSVRJQUxfTUVURVJfQ09NTTpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IEVuYWJsZTogdHJ1ZSB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX1dJRklfTkVUV09SSzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IFNTSUQ6ICcnIH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfV0lGSV9QQVNTV09SRDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IFBhc3N3b3JkOiAnJyB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0lOSVRJQUxfQkxVRVRPT1RIOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgRW5hYmxlOiB0cnVlIH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfSU5JVElBTF9XSUZJOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgRW5hYmxlOiB0cnVlIH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfREVFUFNMRUVQX01JTjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7ICdEZWxheSAobWluKSc6IDE1IH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfVkVSQk9TRTpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IEVuYWJsZTogdHJ1ZSB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0lOSVRJQUxfQ09NTUFORF9UWVBFOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgJ0NvbW1hbmQgdHlwZSgxLzIvMyknOiAxIH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfSU5JVElBTF9DT01NQU5EX1NFVFBPSU5UOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgJ1NldHBvaW50IChvaG1zKSc6IDB4RkZGRiB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfUl9URVNUOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0NQVTpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7ICdGcmVxdWVuY3kgKE1IejogMS0+ODAsIDItPjE2MCwgMy0+MjQwKSc6IDEgfTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9PVEE6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBFbmFibGU6IHRydWUgfTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0NPTkZJR1VSRV9NRVRFUl9DT01NOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgSW5kZXg6IDAsICdWb2x0YWdlIChWKSc6IDgsICdDb21tYW5kIHR5cGUgKDEvMi8zKSc6IDIsICdTZXRwb2ludCAob2htcyknOiAxMTAwIH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfQkxVRVRPT1RIX05BTUU6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyAnRGV2aWNlIG5hbWUnOiAnSU9UZXN0aW5nIGJvYXJkJyB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfUkVGUkVTSDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5Db21tYW5kID0gQ29tbWFuZDtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Q29tbWFuZC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLkNvbW1hbmRSZXN1bHQgPSB2b2lkIDA7XHJcbmNsYXNzIENvbW1hbmRSZXN1bHQge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy52YWx1ZSA9IDAuMDtcclxuICAgICAgICB0aGlzLnN1Y2Nlc3MgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLm1lc3NhZ2UgPSAnJztcclxuICAgICAgICB0aGlzLnVuaXQgPSAnJztcclxuICAgICAgICB0aGlzLnNlY29uZGFyeV92YWx1ZSA9IDAuMDtcclxuICAgICAgICB0aGlzLnNlY29uZGFyeV91bml0ID0gJyc7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5Db21tYW5kUmVzdWx0ID0gQ29tbWFuZFJlc3VsdDtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Q29tbWFuZFJlc3VsdC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ3ZWItYmx1ZXRvb3RoXCIgLz5cclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLkRyaXZlciA9IHZvaWQgMDtcclxuLyoqXHJcbiAqICBCbHVldG9vdGggaGFuZGxpbmcgbW9kdWxlLCBpbmNsdWRpbmcgbWFpbiBzdGF0ZSBtYWNoaW5lIGxvb3AuXHJcbiAqICBUaGlzIG1vZHVsZSBpbnRlcmFjdHMgd2l0aCBicm93c2VyIGZvciBibHVldG9vdGggY29tdW5pY2F0aW9ucyBhbmQgcGFpcmluZywgYW5kIHdpdGggU2VuZWNhTVNDIG9iamVjdC5cclxuICovXHJcbmNvbnN0IEFQSVN0YXRlXzEgPSByZXF1aXJlKFwiLi9BUElTdGF0ZVwiKTtcclxuY29uc3QgY29uc3RhbnRzXzEgPSByZXF1aXJlKFwiLi9jb25zdGFudHNcIik7XHJcbmNvbnN0IElPVGVzdGluZ0JvYXJkXzEgPSByZXF1aXJlKFwiLi9JT1Rlc3RpbmdCb2FyZFwiKTtcclxuY29uc3QgdXRpbHNfMSA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpO1xyXG5jb25zdCBsb2cgPSByZXF1aXJlKFwibG9nbGV2ZWxcIik7XHJcbmNvbnN0IE5vdGlmaWNhdGlvbkRhdGFfMSA9IHJlcXVpcmUoXCIuL05vdGlmaWNhdGlvbkRhdGFcIik7XHJcbmNsYXNzIERyaXZlciB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLmxvZ2dpbmcgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLnNpbXVsYXRpb24gPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmJ0U3RhdGUgPSBuZXcgQVBJU3RhdGVfMS5CVEFwaVN0YXRlKCk7XHJcbiAgICAgICAgdGhpcy5pb3QgPSBuZXcgSU9UZXN0aW5nQm9hcmRfMS5JT1Rlc3RpbmdCb2FyZCh0aGlzLlNlbmRBbmRSZXNwb25zZSwgdGhpcy5idFN0YXRlKTtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBTZW5kIHRoZSBtZXNzYWdlIHVzaW5nIEJsdWV0b290aCBhbmQgd2FpdCBmb3IgYW4gYW5zd2VyXHJcbiAgICAgICAqL1xyXG4gICAgYXN5bmMgU2VuZEFuZFJlc3BvbnNlKGNvbW1hbmQpIHtcclxuICAgICAgICBpZiAoY29tbWFuZCA9PSBudWxsIHx8IHRoaXMuYnRTdGF0ZS5jaGFyV3JpdGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICAgICAgbG9nLmRlYnVnKCc+PiAnICsgKDAsIHV0aWxzXzEuYnVmMmhleCkoY29tbWFuZCkpO1xyXG4gICAgICAgIHRoaXMuYnRTdGF0ZS5yZXNwb25zZSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLnJlcXVlc3RzKys7XHJcbiAgICAgICAgY29uc3Qgc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5idFN0YXRlLmNoYXJXcml0ZS53cml0ZVZhbHVlV2l0aG91dFJlc3BvbnNlKGNvbW1hbmQpO1xyXG4gICAgICAgIHdoaWxlICh0aGlzLmJ0U3RhdGUuc3RhdGUgPT0gY29uc3RhbnRzXzEuU3RhdGUuTUVURVJfSU5JVElBTElaSU5HIHx8XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9PSBjb25zdGFudHNfMS5TdGF0ZS5CVVNZKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmJ0U3RhdGUucmVzcG9uc2UgIT0gbnVsbClcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMzUpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgZW5kVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgICAgIGNvbnN0IGFuc3dlciA9IHRoaXMuYnRTdGF0ZS5yZXNwb25zZT8uc2xpY2UoMCk7XHJcbiAgICAgICAgdGhpcy5idFN0YXRlLnJlc3BvbnNlID0gbnVsbDtcclxuICAgICAgICAvLyBMb2cgdGhlIHBhY2tldHNcclxuICAgICAgICBpZiAodGhpcy5sb2dnaW5nKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHBhY2tldCA9IHsgcmVxdWVzdDogKDAsIHV0aWxzXzEuYnVmMmhleCkoY29tbWFuZCksIGFuc3dlcjogKDAsIHV0aWxzXzEuYnVmMmhleCkoYW5zd2VyKSB9O1xyXG4gICAgICAgICAgICBjb25zdCBzdG9yYWdlX3ZhbHVlID0gd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdJT1Rlc3RpbmdUcmFjZScpO1xyXG4gICAgICAgICAgICBsZXQgcGFja2V0cyA9IFtdO1xyXG4gICAgICAgICAgICBpZiAoc3RvcmFnZV92YWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBwYWNrZXRzID0gSlNPTi5wYXJzZShzdG9yYWdlX3ZhbHVlKTsgLy8gUmVzdG9yZSB0aGUganNvbiBwZXJzaXN0ZWQgb2JqZWN0XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcGFja2V0cy5wdXNoKEpTT04uc3RyaW5naWZ5KHBhY2tldCkpOyAvLyBBZGQgdGhlIG5ldyBvYmplY3RcclxuICAgICAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdJT1Rlc3RpbmdUcmFjZScsIEpTT04uc3RyaW5naWZ5KHBhY2tldHMpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLnJlc3BvbnNlVGltZSA9IE1hdGgucm91bmQoKDEuMCAqIHRoaXMuYnRTdGF0ZS5zdGF0cy5yZXNwb25zZVRpbWUgKiAodGhpcy5idFN0YXRlLnN0YXRzLnJlc3BvbnNlcyAlIDUwMCkgKyAoZW5kVGltZSAtIHN0YXJ0VGltZSkpIC8gKCh0aGlzLmJ0U3RhdGUuc3RhdHMucmVzcG9uc2VzICUgNTAwKSArIDEpKTtcclxuICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMubGFzdFJlc3BvbnNlVGltZSA9IE1hdGgucm91bmQoZW5kVGltZSAtIHN0YXJ0VGltZSkgKyAnIG1zJztcclxuICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMucmVzcG9uc2VzKys7XHJcbiAgICAgICAgcmV0dXJuIGFuc3dlcjtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBNYWluIGxvb3Agb2YgdGhlIG1ldGVyIGhhbmRsZXIuXHJcbiAgICAgICAqICovXHJcbiAgICBhc3luYyBzdGF0ZU1hY2hpbmUoKSB7XHJcbiAgICAgICAgbGV0IG5leHRBY3Rpb247XHJcbiAgICAgICAgY29uc3QgREVMQVlfTVMgPSAodGhpcy5zaW11bGF0aW9uID8gMjAgOiA3NTApOyAvLyBVcGRhdGUgdGhlIHN0YXR1cyBldmVyeSBYIG1zLlxyXG4gICAgICAgIGNvbnN0IFRJTUVPVVRfTVMgPSAodGhpcy5zaW11bGF0aW9uID8gMTAwMCA6IDMwMDAwKTsgLy8gR2l2ZSB1cCBzb21lIG9wZXJhdGlvbnMgYWZ0ZXIgWCBtcy5cclxuICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhcnRlZCA9IHRydWU7XHJcbiAgICAgICAgbG9nLmRlYnVnKCdDdXJyZW50IHN0YXRlOicgKyB0aGlzLmJ0U3RhdGUuc3RhdGUpO1xyXG4gICAgICAgIC8vIENvbnNlY3V0aXZlIHN0YXRlIGNvdW50ZWQuIENhbiBiZSB1c2VkIHRvIHRpbWVvdXQuXHJcbiAgICAgICAgaWYgKHRoaXMuYnRTdGF0ZS5zdGF0ZSA9PSB0aGlzLmJ0U3RhdGUucHJldl9zdGF0ZSkge1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGVfY3B0Kys7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGVfY3B0ID0gMDtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gU3RvcCByZXF1ZXN0IGZyb20gQVBJXHJcbiAgICAgICAgaWYgKHRoaXMuYnRTdGF0ZS5zdG9wUmVxdWVzdCkge1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5TVE9QUElORztcclxuICAgICAgICB9XHJcbiAgICAgICAgbG9nLmRlYnVnKCdcXFN0YXRlOicgKyB0aGlzLmJ0U3RhdGUuc3RhdGUpO1xyXG4gICAgICAgIHN3aXRjaCAodGhpcy5idFN0YXRlLnN0YXRlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuTk9UX0NPTk5FQ1RFRDogLy8gaW5pdGlhbCBzdGF0ZSBvbiBTdGFydCgpXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zaW11bGF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMuZmFrZVBhaXJEZXZpY2UuYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSB0aGlzLmJ0UGFpckRldmljZS5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuQ09OTkVDVElORzogLy8gd2FpdGluZyBmb3IgY29ubmVjdGlvbiB0byBjb21wbGV0ZVxyXG4gICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLkRFVklDRV9QQUlSRUQ6IC8vIGNvbm5lY3Rpb24gY29tcGxldGUsIGFjcXVpcmUgbWV0ZXIgc3RhdGVcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNpbXVsYXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gdGhpcy5mYWtlU3Vic2NyaWJlLmJpbmQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gdGhpcy5idFN1YnNjcmliZS5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuU1VCU0NSSUJJTkc6IC8vIHdhaXRpbmcgZm9yIEJsdWV0b290aCBpbnRlcmZhY2VzXHJcbiAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYnRTdGF0ZS5zdGF0ZV9jcHQgPiAoVElNRU9VVF9NUyAvIERFTEFZX01TKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRpbWVvdXQsIHRyeSB0byByZXN1YnNjcmliZVxyXG4gICAgICAgICAgICAgICAgICAgIGxvZy53YXJuKCdUaW1lb3V0IGluIFNVQlNDUklCSU5HJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuREVWSUNFX1BBSVJFRDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGVfY3B0ID0gMDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLk1FVEVSX0lOSVQ6IC8vIHJlYWR5IHRvIGNvbW11bmljYXRlLCBhY3F1aXJlIG1ldGVyIHN0YXR1c1xyXG4gICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMubWV0ZXJJbml0LmJpbmQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5TdGF0ZS5NRVRFUl9JTklUSUFMSVpJTkc6IC8vIHJlYWRpbmcgdGhlIG1ldGVyIHN0YXR1c1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYnRTdGF0ZS5zdGF0ZV9jcHQgPiAoVElNRU9VVF9NUyAvIERFTEFZX01TKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZy53YXJuKCdUaW1lb3V0IGluIE1FVEVSX0lOSVRJQUxJWklORycpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRpbWVvdXQsIHRyeSB0byByZXN1YnNjcmliZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnNpbXVsYXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMuZmFrZVN1YnNjcmliZS5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMuYnRTdWJzY3JpYmUuYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlX2NwdCA9IDA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuSURMRTogLy8gcmVhZHkgdG8gcHJvY2VzcyBjb21tYW5kcyBmcm9tIEFQSVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYnRTdGF0ZS5jb21tYW5kICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gdGhpcy5wcm9jZXNzQ29tbWFuZC5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMucmVmcmVzaC5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuRVJST1I6IC8vIGFueXRpbWUgYW4gZXJyb3IgaGFwcGVuc1xyXG4gICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMuZGlzY29ubmVjdC5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuQlVTWTogLy8gd2hpbGUgYSBjb21tYW5kIGluIGdvaW5nIG9uXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5idFN0YXRlLnN0YXRlX2NwdCA+IChUSU1FT1VUX01TIC8gREVMQVlfTVMpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9nLndhcm4oJ1RpbWVvdXQgaW4gQlVTWScpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRpbWVvdXQsIHRyeSB0byByZXN1YnNjcmliZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnNpbXVsYXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMuZmFrZVN1YnNjcmliZS5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMuYnRTdWJzY3JpYmUuYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlX2NwdCA9IDA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuU1RPUFBJTkc6XHJcbiAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gdGhpcy5kaXNjb25uZWN0LmJpbmQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5TdGF0ZS5TVE9QUEVEOiAvLyBhZnRlciBhIGRpc2Nvbm5lY3RvciBvciBTdG9wKCkgcmVxdWVzdCwgc3RvcHMgdGhlIHN0YXRlIG1hY2hpbmUuXHJcbiAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5idFN0YXRlLnByZXZfc3RhdGUgPSB0aGlzLmJ0U3RhdGUuc3RhdGU7XHJcbiAgICAgICAgaWYgKG5leHRBY3Rpb24gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGxvZy5kZWJ1ZygnXFx0RXhlY3V0aW5nOicgKyBuZXh0QWN0aW9uLm5hbWUpO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgbmV4dEFjdGlvbigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICBsb2cuZXJyb3IoJ0V4Y2VwdGlvbiBpbiBzdGF0ZSBtYWNoaW5lJywgZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuYnRTdGF0ZS5zdGF0ZSAhPSBjb25zdGFudHNfMS5TdGF0ZS5TVE9QUEVEKSB7XHJcbiAgICAgICAgICAgICgwLCB1dGlsc18xLnNsZWVwKShERUxBWV9NUykudGhlbihhc3luYyAoKSA9PiB7IGF3YWl0IHRoaXMuc3RhdGVNYWNoaW5lKCk7IH0pOyAvLyBSZWNoZWNrIHN0YXR1cyBpbiBERUxBWV9NUyBtc1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKCdcXHRUZXJtaW5hdGluZyBTdGF0ZSBtYWNoaW5lJyk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGFydGVkID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgICAqIENhbGxlZCBmcm9tIHN0YXRlIG1hY2hpbmUgdG8gZXhlY3V0ZSBhIHNpbmdsZSBjb21tYW5kIGZyb20gYnRTdGF0ZS5jb21tYW5kIHByb3BlcnR5XHJcbiAgICAgICAqICovXHJcbiAgICBhc3luYyBwcm9jZXNzQ29tbWFuZCgpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjb21tYW5kID0gdGhpcy5idFN0YXRlLmNvbW1hbmQ7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGNvbnN0YW50c18xLlJlc3VsdENvZGUuU1VDQ0VTUztcclxuICAgICAgICAgICAgbGV0IHBhY2tldCwgcmVzcG9uc2UsIHN0YXJ0R2VuO1xyXG4gICAgICAgICAgICBpZiAoY29tbWFuZCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuQlVTWTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLmNvbW1hbmRzKys7XHJcbiAgICAgICAgICAgIGxvZy5pbmZvKCdcXHRcXHRFeGVjdXRpbmcgY29tbWFuZCA6JyArIGNvbW1hbmQpO1xyXG4gICAgICAgICAgICBwYWNrZXQgPSBjb21tYW5kLmdldFBhY2tldCgpO1xyXG4gICAgICAgICAgICByZXNwb25zZSA9IGF3YWl0IHRoaXMuU2VuZEFuZFJlc3BvbnNlKHBhY2tldCk7XHJcbiAgICAgICAgICAgIC8vIENhbGxlciBleHBlY3RzIGEgdmFsaWQgcHJvcGVydHkgaW4gR2V0U3RhdGUoKSBvbmNlIGNvbW1hbmQgaXMgZXhlY3V0ZWQuXHJcbiAgICAgICAgICAgIGxvZy5kZWJ1ZygnXFx0XFx0UmVmcmVzaGluZyBjdXJyZW50IHN0YXRlJyk7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucmVmcmVzaCgpO1xyXG4gICAgICAgICAgICBjb21tYW5kLmVycm9yID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGNvbW1hbmQucGVuZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuY29tbWFuZCA9IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLklETEU7XHJcbiAgICAgICAgICAgIGxvZy5kZWJ1ZygnXFx0XFx0Q29tcGxldGVkIGNvbW1hbmQgZXhlY3V0ZWQnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICBsb2cuZXJyb3IoJyoqIGVycm9yIHdoaWxlIGV4ZWN1dGluZyBjb21tYW5kOiAnICsgZXJyKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuTUVURVJfSU5JVDtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLmV4Y2VwdGlvbnMrKztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAgICogQWNxdWlyZSB0aGUgY3VycmVudCBtb2RlIGFuZCBzZXJpYWwgbnVtYmVyIG9mIHRoZSBkZXZpY2UuXHJcbiAgICAgICAqICovXHJcbiAgICBhc3luYyBtZXRlckluaXQoKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuTUVURVJfSU5JVElBTElaSU5HO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUubWV0ZXIuc2VyaWFsID0gYXdhaXQgdGhpcy5pb3QuZ2V0U2VyaWFsTnVtYmVyKCk7XHJcbiAgICAgICAgICAgIGxvZy5pbmZvKCdcXHRcXHRTZXJpYWwgbnVtYmVyOicgKyB0aGlzLmJ0U3RhdGUubWV0ZXIuc2VyaWFsKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLm1ldGVyLmJhdHRlcnkgPSBhd2FpdCB0aGlzLmlvdC5nZXRCYXR0ZXJ5TGV2ZWwoKTtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKCdcXHRcXHRCYXR0ZXJ5ICglKTonICsgdGhpcy5idFN0YXRlLm1ldGVyLmJhdHRlcnkpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5JRExFO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIGxvZy53YXJuKCdFcnJvciB3aGlsZSBpbml0aWFsaXppbmcgbWV0ZXIgOicgKyBlcnIpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuZXhjZXB0aW9ucysrO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5ERVZJQ0VfUEFJUkVEO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qXHJcbiAgICAgICogQ2xvc2UgdGhlIGJsdWV0b290aCBpbnRlcmZhY2UgKHVucGFpcilcclxuICAgICAgKiAqL1xyXG4gICAgYXN5bmMgZGlzY29ubmVjdCgpIHtcclxuICAgICAgICB0aGlzLmJ0U3RhdGUuY29tbWFuZCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5idFN0YXRlLnJlc2V0KHRoaXMub25EaXNjb25uZWN0ZWQuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuU1RPUFBFRDtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBFdmVudCBjYWxsZWQgYnkgYnJvd3NlciBCVCBhcGkgd2hlbiB0aGUgZGV2aWNlIGRpc2Nvbm5lY3RcclxuICAgICAgICogKi9cclxuICAgIGFzeW5jIG9uRGlzY29ubmVjdGVkKCkge1xyXG4gICAgICAgIGxvZy53YXJuKCcqIEdBVFQgU2VydmVyIGRpc2Nvbm5lY3RlZCBldmVudCwgd2lsbCB0cnkgdG8gcmVjb25uZWN0IConKTtcclxuICAgICAgICB0aGlzLmJ0U3RhdGUucmVzZXQoKTtcclxuICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHNbJ0dBVFQgZGlzY29ubmVjdHMnXSsrO1xyXG4gICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkRFVklDRV9QQUlSRUQ7IC8vIFRyeSB0byBhdXRvLXJlY29ubmVjdCB0aGUgaW50ZXJmYWNlcyB3aXRob3V0IHBhaXJpbmdcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBKb2lucyB0aGUgYXJndW1lbnRzIGludG8gYSBzaW5nbGUgYnVmZmVyXHJcbiAgICAgICAqIEByZXR1cm5zIHtBcnJheUJ1ZmZlcn0gY29uY2F0ZW5hdGVkIGJ1ZmZlclxyXG4gICAgICAgKi9cclxuICAgIGFycmF5QnVmZmVyQ29uY2F0KGJ1ZmZlcjEsIGJ1ZmZlcjIpIHtcclxuICAgICAgICBsZXQgbGVuZ3RoID0gMDtcclxuICAgICAgICBsZXQgYnVmZmVyO1xyXG4gICAgICAgIGZvciAodmFyIGkgaW4gYXJndW1lbnRzKSB7XHJcbiAgICAgICAgICAgIGJ1ZmZlciA9IGFyZ3VtZW50c1tpXTtcclxuICAgICAgICAgICAgaWYgKGJ1ZmZlcikge1xyXG4gICAgICAgICAgICAgICAgbGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGpvaW5lZCA9IG5ldyBVaW50OEFycmF5KGxlbmd0aCk7XHJcbiAgICAgICAgbGV0IG9mZnNldCA9IDA7XHJcbiAgICAgICAgZm9yIChpIGluIGFyZ3VtZW50cykge1xyXG4gICAgICAgICAgICBidWZmZXIgPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgICAgIGpvaW5lZC5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyKSwgb2Zmc2V0KTtcclxuICAgICAgICAgICAgb2Zmc2V0ICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gam9pbmVkLmJ1ZmZlcjtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBFdmVudCBjYWxsZWQgYnkgYmx1ZXRvb3RoIGNoYXJhY3RlcmlzdGljcyB3aGVuIHJlY2VpdmluZyBkYXRhXHJcbiAgICAgICAqIEBwYXJhbSB7YW55fSBldmVudFxyXG4gICAgICAgKi9cclxuICAgIGhhbmRsZU5vdGlmaWNhdGlvbnMoZXZlbnQpIHtcclxuICAgICAgICBjb25zdCB2YWx1ZSA9IGV2ZW50LnRhcmdldC52YWx1ZTtcclxuICAgICAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBsb2cuZGVidWcoJzw8ICcgKyAoMCwgdXRpbHNfMS5idWYyaGV4KSh2YWx1ZS5idWZmZXIpKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYnRTdGF0ZS5yZXNwb25zZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ0U3RhdGUucmVzcG9uc2UgPSB0aGlzLmFycmF5QnVmZmVyQ29uY2F0KHRoaXMuYnRTdGF0ZS5yZXNwb25zZSwgdmFsdWUuYnVmZmVyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5yZXNwb25zZSA9IHZhbHVlLmJ1ZmZlci5zbGljZSgwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUubGFzdE1lYXN1cmUgPSBOb3RpZmljYXRpb25EYXRhXzEuTm90aWZpY2F0aW9uRGF0YS5wYXJzZSh0aGlzLmJ0U3RhdGUucmVzcG9uc2UpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBUaGlzIGZ1bmN0aW9uIHdpbGwgc3VjY2VlZCBvbmx5IGlmIGNhbGxlZCBhcyBhIGNvbnNlcXVlbmNlIG9mIGEgdXNlci1nZXN0dXJlXHJcbiAgICAgICAqIEUuZy4gYnV0dG9uIGNsaWNrLiBUaGlzIGlzIGR1ZSB0byBCbHVlVG9vdGggQVBJIHNlY3VyaXR5IG1vZGVsLlxyXG4gICAgICAgKiAqL1xyXG4gICAgYXN5bmMgYnRQYWlyRGV2aWNlKCkge1xyXG4gICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkNPTk5FQ1RJTkc7XHJcbiAgICAgICAgY29uc3QgZm9yY2VTZWxlY3Rpb24gPSB0aGlzLmJ0U3RhdGUub3B0aW9ucy5mb3JjZURldmljZVNlbGVjdGlvbjtcclxuICAgICAgICBsb2cuZGVidWcoJ2J0UGFpckRldmljZSgnICsgZm9yY2VTZWxlY3Rpb24gKyAnKScpO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgKG5hdmlnYXRvci5ibHVldG9vdGg/LmdldEF2YWlsYWJpbGl0eSkgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJpbGl0eSA9IGF3YWl0IG5hdmlnYXRvci5ibHVldG9vdGguZ2V0QXZhaWxhYmlsaXR5KCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWF2YWlsYWJpbGl0eSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZy5lcnJvcignQmx1ZXRvb3RoIG5vdCBhdmFpbGFibGUgaW4gYnJvd3Nlci4nKTtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Jyb3dzZXIgZG9lcyBub3QgcHJvdmlkZSBibHVldG9vdGgnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgZGV2aWNlID0gbnVsbDtcclxuICAgICAgICAgICAgLy8gRG8gd2UgYWxyZWFkeSBoYXZlIHBlcm1pc3Npb24/XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgKG5hdmlnYXRvci5ibHVldG9vdGg/LmdldERldmljZXMpID09PSAnZnVuY3Rpb24nICYmXHJcbiAgICAgICAgICAgICAgICAhZm9yY2VTZWxlY3Rpb24pIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJsZURldmljZXMgPSBhd2FpdCBuYXZpZ2F0b3IuYmx1ZXRvb3RoLmdldERldmljZXMoKTtcclxuICAgICAgICAgICAgICAgIGF2YWlsYWJsZURldmljZXMuZm9yRWFjaChmdW5jdGlvbiAoZGV2LCBpbmRleCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZy5kZWJ1ZygnRm91bmQgYXV0aG9yaXplZCBkZXZpY2UgOicgKyBkZXYubmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZGV2aWNlID0gZGV2O1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBsb2cuZGVidWcoJ25hdmlnYXRvci5ibHVldG9vdGguZ2V0RGV2aWNlcygpPScgKyBkZXZpY2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIElmIG5vdCwgcmVxdWVzdCBmcm9tIHVzZXJcclxuICAgICAgICAgICAgaWYgKGRldmljZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBkZXZpY2UgPSBhd2FpdCBuYXZpZ2F0b3IuYmx1ZXRvb3RoXHJcbiAgICAgICAgICAgICAgICAgICAgLnJlcXVlc3REZXZpY2Uoe1xyXG4gICAgICAgICAgICAgICAgICAgIGFjY2VwdEFsbERldmljZXM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcnM6IFt7IHNlcnZpY2VzOiBbY29uc3RhbnRzXzEuQmx1ZVRvb3RoSU9UVVVJRC5TZXJ2aWNlVXVpZC50b0xvd2VyQ2FzZSgpXSB9XSxcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25hbFNlcnZpY2VzOiBbJ2JhdHRlcnlfc2VydmljZScsICdnZW5lcmljX2FjY2VzcycsICdkZXZpY2VfaW5mb3JtYXRpb24nLCBjb25zdGFudHNfMS5CbHVlVG9vdGhJT1RVVUlELlNlcnZpY2VVdWlkLnRvTG93ZXJDYXNlKCldXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuYnREZXZpY2UgPSBkZXZpY2U7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkRFVklDRV9QQUlSRUQ7XHJcbiAgICAgICAgICAgIGxvZy5pbmZvKCdCbHVldG9vdGggZGV2aWNlICcgKyBkZXZpY2UubmFtZSArICcgY29ubmVjdGVkLicpO1xyXG4gICAgICAgICAgICBhd2FpdCAoMCwgdXRpbHNfMS5zbGVlcCkoNTAwKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICBsb2cud2FybignKiogZXJyb3Igd2hpbGUgY29ubmVjdGluZzogJyArIGVyci5tZXNzYWdlKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnJlc2V0KHRoaXMub25EaXNjb25uZWN0ZWQuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkVSUk9SO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuZXhjZXB0aW9ucysrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGFzeW5jIGZha2VQYWlyRGV2aWNlKCkge1xyXG4gICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkNPTk5FQ1RJTkc7XHJcbiAgICAgICAgY29uc3QgZm9yY2VTZWxlY3Rpb24gPSB0aGlzLmJ0U3RhdGUub3B0aW9ucy5mb3JjZURldmljZVNlbGVjdGlvbjtcclxuICAgICAgICBsb2cuZGVidWcoJ2Zha2VQYWlyRGV2aWNlKCcgKyBmb3JjZVNlbGVjdGlvbiArICcpJyk7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgZGV2aWNlID0ge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ0Zha2VCVERldmljZScsXHJcbiAgICAgICAgICAgICAgICBnYXR0OiB7IGNvbm5lY3RlZDogdHJ1ZSwgZGV2aWNlOiBudWxsLCBjb25uZWN0OiBudWxsLCBkaXNjb25uZWN0OiBudWxsLCBnZXRQcmltYXJ5U2VydmljZTogbnVsbCwgZ2V0UHJpbWFyeVNlcnZpY2VzOiBudWxsIH0sXHJcbiAgICAgICAgICAgICAgICBpZDogJzEnLFxyXG4gICAgICAgICAgICAgICAgZm9yZ2V0OiBudWxsLFxyXG4gICAgICAgICAgICAgICAgd2F0Y2hBZHZlcnRpc2VtZW50czogbnVsbCxcclxuICAgICAgICAgICAgICAgIHdhdGNoaW5nQWR2ZXJ0aXNlbWVudHM6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBhZGRFdmVudExpc3RlbmVyOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcjogbnVsbCxcclxuICAgICAgICAgICAgICAgIGRpc3BhdGNoRXZlbnQ6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBvbmFkdmVydGlzZW1lbnRyZWNlaXZlZDogbnVsbCxcclxuICAgICAgICAgICAgICAgIG9uZ2F0dHNlcnZlcmRpc2Nvbm5lY3RlZDogbnVsbCxcclxuICAgICAgICAgICAgICAgIG9uY2hhcmFjdGVyaXN0aWN2YWx1ZWNoYW5nZWQ6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBvbnNlcnZpY2VhZGRlZDogbnVsbCxcclxuICAgICAgICAgICAgICAgIG9uc2VydmljZXJlbW92ZWQ6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBvbnNlcnZpY2VjaGFuZ2VkOiBudWxsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5idERldmljZSA9IGRldmljZTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuREVWSUNFX1BBSVJFRDtcclxuICAgICAgICAgICAgbG9nLmluZm8oJ0JsdWV0b290aCBkZXZpY2UgJyArIGRldmljZS5uYW1lICsgJyBjb25uZWN0ZWQuJyk7XHJcbiAgICAgICAgICAgIGF3YWl0ICgwLCB1dGlsc18xLnNsZWVwKSg1MCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgbG9nLndhcm4oJyoqIGVycm9yIHdoaWxlIGNvbm5lY3Rpbmc6ICcgKyBlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5yZXNldCgpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuZXhjZXB0aW9ucysrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBPbmNlIHRoZSBkZXZpY2UgaXMgYXZhaWxhYmxlLCBpbml0aWFsaXplIHRoZSBzZXJ2aWNlIGFuZCB0aGUgMiBjaGFyYWN0ZXJpc3RpY3MgbmVlZGVkLlxyXG4gICAgICAgKiAqL1xyXG4gICAgYXN5bmMgYnRTdWJzY3JpYmUoKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuU1VCU0NSSUJJTkc7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0cy5zdWJjcmliZXMrKztcclxuICAgICAgICAgICAgY29uc3QgZGV2aWNlID0gdGhpcy5idFN0YXRlLmJ0RGV2aWNlO1xyXG4gICAgICAgICAgICBsZXQgZ2F0dHNlcnZlciA9IG51bGw7XHJcbiAgICAgICAgICAgIGlmIChkZXZpY2UgJiYgZGV2aWNlLmdhdHQpIHtcclxuICAgICAgICAgICAgICAgIGlmICghZGV2aWNlLmdhdHQuY29ubmVjdGVkIHx8IHRoaXMuYnRTdGF0ZS5idEdBVFRTZXJ2ZXIgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZy5kZWJ1ZyhgQ29ubmVjdGluZyB0byBHQVRUIFNlcnZlciBvbiAke2RldmljZS5uYW1lfS4uLmApO1xyXG4gICAgICAgICAgICAgICAgICAgIGRldmljZS5hZGRFdmVudExpc3RlbmVyKCdnYXR0c2VydmVyZGlzY29ubmVjdGVkJywgdGhpcy5vbkRpc2Nvbm5lY3RlZC5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ0U3RhdGUuYnRHQVRUU2VydmVyID0gYXdhaXQgZGV2aWNlLmdhdHQuY29ubmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZy5kZWJ1ZygnPiBGb3VuZCBHQVRUIHNlcnZlcicpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9nLmRlYnVnKCdHQVRUIGFscmVhZHkgY29ubmVjdGVkJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ0U3RhdGUucmVzZXQodGhpcy5vbkRpc2Nvbm5lY3RlZC5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5idERldmljZSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5OT1RfQ09OTkVDVEVEO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLmV4Y2VwdGlvbnMrKztcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuYnRJT1RTZXJ2aWNlID0gYXdhaXQgdGhpcy5idFN0YXRlLmJ0R0FUVFNlcnZlci5nZXRQcmltYXJ5U2VydmljZShjb25zdGFudHNfMS5CbHVlVG9vdGhJT1RVVUlELlNlcnZpY2VVdWlkKTtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKCc+IEZvdW5kIElPVGVzdGluZyBib2FyZCBzZXJ2aWNlJyk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5jaGFyV3JpdGUgPSBhd2FpdCB0aGlzLmJ0U3RhdGUuYnRJT1RTZXJ2aWNlLmdldENoYXJhY3RlcmlzdGljKGNvbnN0YW50c18xLkJsdWVUb290aElPVFVVSUQuQ29tbWFuZENoYXJVdWlkKTtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKCc+IEZvdW5kIGNvbW1hbmQgY2hhcmFjdGVyaXN0aWMnKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLmNoYXJSZWFkID0gYXdhaXQgdGhpcy5idFN0YXRlLmJ0SU9UU2VydmljZS5nZXRDaGFyYWN0ZXJpc3RpYyhjb25zdGFudHNfMS5CbHVlVG9vdGhJT1RVVUlELlN0YXR1c0NoYXJVdWlkKTtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKCc+IEZvdW5kIG5vdGlmaWNhdGlvbnMgY2hhcmFjdGVyaXN0aWMnKTtcclxuICAgICAgICAgICAgLypcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLmNoYXJCYXR0ZXJ5ID0gYXdhaXQgdGhpcy5idFN0YXRlLmJ0SU9UU2VydmljZS5nZXRDaGFyYWN0ZXJpc3RpYygnMDAwM2NkZDYtMDAwMC0xMDAwLTgwMDAtMDA4MDVmOWIzNGZiJylcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLmNoYXJGaXJtd2FyZSA9IGF3YWl0IHRoaXMuYnRTdGF0ZS5idElPVFNlcnZpY2UuZ2V0Q2hhcmFjdGVyaXN0aWMoJzAwMDNjZGQ5LTAwMDAtMTAwMC04MDAwLTAwODA1ZjliMzRmYicpXHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5jaGFyU2VyaWFsID0gYXdhaXQgdGhpcy5idFN0YXRlLmJ0SU9UU2VydmljZS5nZXRDaGFyYWN0ZXJpc3RpYygnMDAwM2NkZDgtMDAwMC0xMDAwLTgwMDAtMDA4MDVmOWIzNGZiJykgKi9cclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnJlc3BvbnNlID0gbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLmNoYXJSZWFkLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYXJhY3RlcmlzdGljdmFsdWVjaGFuZ2VkJywgdGhpcy5oYW5kbGVOb3RpZmljYXRpb25zLmJpbmQodGhpcykpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuY2hhclJlYWQuc3RhcnROb3RpZmljYXRpb25zKCk7XHJcbiAgICAgICAgICAgIGxvZy5pbmZvKCc+IEJsdWV0b290aCBpbnRlcmZhY2VzIHJlYWR5LicpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMubGFzdF9jb25uZWN0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xyXG4gICAgICAgICAgICBhd2FpdCAoMCwgdXRpbHNfMS5zbGVlcCkoNTApO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5NRVRFUl9JTklUO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIGxvZy53YXJuKCcqKiBlcnJvciB3aGlsZSBzdWJzY3JpYmluZzogJyArIGVyci5tZXNzYWdlKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnJlc2V0KCk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkRFVklDRV9QQUlSRUQ7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0cy5leGNlcHRpb25zKys7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgYXN5bmMgZmFrZVN1YnNjcmliZSgpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5TVUJTQ1JJQklORztcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLnN1YmNyaWJlcysrO1xyXG4gICAgICAgICAgICBjb25zdCBkZXZpY2UgPSB0aGlzLmJ0U3RhdGUuYnREZXZpY2U7XHJcbiAgICAgICAgICAgIGlmICghZGV2aWNlPy5nYXR0Py5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgIGxvZy5kZWJ1ZyhgQ29ubmVjdGluZyB0byBHQVRUIFNlcnZlciBvbiAke2RldmljZT8ubmFtZX0uLi5gKTtcclxuICAgICAgICAgICAgICAgIGxvZy5kZWJ1ZygnPiBGb3VuZCBHQVRUIHNlcnZlcicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxvZy5kZWJ1ZygnPiBGb3VuZCBTZXJpYWwgc2VydmljZScpO1xyXG4gICAgICAgICAgICBsb2cuZGVidWcoJz4gRm91bmQgd3JpdGUgY2hhcmFjdGVyaXN0aWMnKTtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKCc+IEZvdW5kIHJlYWQgY2hhcmFjdGVyaXN0aWMnKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnJlc3BvbnNlID0gbnVsbDtcclxuICAgICAgICAgICAgbG9nLmluZm8oJz4gQmx1ZXRvb3RoIGludGVyZmFjZXMgcmVhZHkuJyk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0cy5sYXN0X2Nvbm5lY3QgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgICAgICAgIGF3YWl0ICgwLCB1dGlsc18xLnNsZWVwKSgxMCk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLk1FVEVSX0lOSVQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgbG9nLndhcm4oJyoqIGVycm9yIHdoaWxlIHN1YnNjcmliaW5nOiAnICsgZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUucmVzZXQodGhpcy5vbkRpc2Nvbm5lY3RlZC5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuREVWSUNFX1BBSVJFRDtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLmV4Y2VwdGlvbnMrKztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAgICogV2hlbiBpZGxlLCB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZFxyXG4gICAgICAgKiAqL1xyXG4gICAgYXN5bmMgcmVmcmVzaCgpIHtcclxuICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5CVVNZO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGxvZy5kZWJ1ZygnXFx0XFx0RmluaXNoZWQgcmVmcmVzaGluZyBjdXJyZW50IHN0YXRlJyk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLklETEU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgbG9nLndhcm4oJ0Vycm9yIHdoaWxlIHJlZnJlc2hpbmcgbWVhc3VyZScgKyBlcnIpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5ERVZJQ0VfUEFJUkVEO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuZXhjZXB0aW9ucysrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFNldFNpbXVsYXRpb24odmFsdWUpIHtcclxuICAgICAgICB0aGlzLnNpbXVsYXRpb24gPSB2YWx1ZTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLkRyaXZlciA9IERyaXZlcjtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9RHJpdmVyLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuSU9UZXN0aW5nQm9hcmQgPSB2b2lkIDA7XHJcbmNvbnN0IGxvZyA9IHJlcXVpcmUoXCJsb2dsZXZlbFwiKTtcclxuY2xhc3MgSU9UZXN0aW5nQm9hcmQge1xyXG4gICAgY29uc3RydWN0b3IoZm5TZW5kQW5kUmVzcG9uc2UsIGJ0QXBpKSB7XHJcbiAgICAgICAgdGhpcy5TZW5kQW5kUmVzcG9uc2UgPSBmblNlbmRBbmRSZXNwb25zZTtcclxuICAgICAgICB0aGlzLmJ0U3RhdGUgPSBidEFwaTtcclxuICAgIH1cclxuICAgIGFzeW5jIGV4ZWN1dGUoY21kKSB7XHJcbiAgICAgICAgaWYgKGNtZCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBwYWNrZXQgPSBjbWQuZ2V0UGFja2V0KCk7XHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuU2VuZEFuZFJlc3BvbnNlKHBhY2tldCk7XHJcbiAgICB9XHJcbiAgICB1aW50VG9TdHJpbmcodWludEFycmF5KSB7XHJcbiAgICAgICAgY29uc3QgZW5jb2RlZFN0cmluZyA9IFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkobnVsbCwgdWludEFycmF5KTtcclxuICAgICAgICBjb25zdCBkZWNvZGVkU3RyaW5nID0gZGVjb2RlVVJJQ29tcG9uZW50KGVuY29kZWRTdHJpbmcpO1xyXG4gICAgICAgIHJldHVybiBkZWNvZGVkU3RyaW5nO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgICAqIEdldHMgdGhlIG1ldGVyIHNlcmlhbCBudW1iZXJcclxuICAgICAgICogQHJldHVybnMge3N0cmluZ31cclxuICAgICAgICovXHJcbiAgICBhc3luYyBnZXRTZXJpYWxOdW1iZXIoKSB7XHJcbiAgICAgICAgbG9nLmRlYnVnKCdcXHRcXHRSZWFkaW5nIHNlcmlhbCBudW1iZXInKTtcclxuICAgICAgICAvKmNvbnN0IGR2OiBEYXRhVmlldyA9IGF3YWl0IHRoaXMuYnRTdGF0ZS5jaGFyU2VyaWFsLnJlYWRWYWx1ZSgpXHJcbiAgICAgICAgcmV0dXJuIHRoaXMudWludFRvU3RyaW5nKGR2KSovXHJcbiAgICAgICAgcmV0dXJuIFwiPz8/XCI7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAgICogR2V0cyB0aGUgYmF0dGVyeSBsZXZlbCBpbmRpY2F0aW9uXHJcbiAgICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IHBlcmNlbnRhZ2UgKCUpXHJcbiAgICAgICAqL1xyXG4gICAgYXN5bmMgZ2V0QmF0dGVyeUxldmVsKCkge1xyXG4gICAgICAgIGxvZy5kZWJ1ZygnXFx0XFx0UmVhZGluZyBiYXR0ZXJ5IHZvbHRhZ2UnKTtcclxuICAgICAgICAvKmNvbnN0IGR2OiBEYXRhVmlldyA9IGF3YWl0IHRoaXMuYnRTdGF0ZS5jaGFyQmF0dGVyeS5yZWFkVmFsdWUoKVxyXG4gICAgICAgIHJldHVybiBkdi5nZXRVaW50OCgwKSovXHJcbiAgICAgICAgcmV0dXJuIDEwMDtcclxuICAgIH1cclxuICAgIHBhcnNlTm90aWZpY2F0aW9uKG5vdGlmaWNhdGlvbikge1xyXG4gICAgICAgIHJldHVybiB7fTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLklPVGVzdGluZ0JvYXJkID0gSU9UZXN0aW5nQm9hcmQ7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPUlPVGVzdGluZ0JvYXJkLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuTWV0ZXJTdGF0ZSA9IHZvaWQgMDtcclxuY29uc3QgY29uc3RhbnRzXzEgPSByZXF1aXJlKFwiLi9jb25zdGFudHNcIik7XHJcbi8qKlxyXG4gKiBDdXJyZW50IHN0YXRlIG9mIHRoZSBtZXRlclxyXG4gKiAqL1xyXG5jbGFzcyBNZXRlclN0YXRlIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMuZmlybXdhcmUgPSAnPz8/JzsgLy8gRmlybXdhcmUgdmVyc2lvblxyXG4gICAgICAgIHRoaXMuc2VyaWFsID0gJz8/Pyc7IC8vIFNlcmlhbCBudW1iZXJcclxuICAgICAgICB0aGlzLm1vZGUgPSBjb25zdGFudHNfMS5Cb2FyZE1vZGUuTU9ERV9VTkRFRklORUQ7XHJcbiAgICAgICAgdGhpcy5zZXRwb2ludCA9IDB4RkZGRjtcclxuICAgICAgICB0aGlzLmFjdHVhbCA9IDB4RkZGRjtcclxuICAgICAgICB0aGlzLmZyZWVfYnl0ZXMgPSAwO1xyXG4gICAgICAgIHRoaXMuYmF0dGVyeSA9IDA7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5NZXRlclN0YXRlID0gTWV0ZXJTdGF0ZTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9TWV0ZXJTdGF0ZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLk5vdGlmaWNhdGlvbkRhdGEgPSB2b2lkIDA7XHJcbi8vIE11c3QgbWF0Y2ggd2l0aCBfX2dldF9ub3RpZmljYXRpb25fZGF0YSBpbiBib2FyZGJ0LnB5IGZpcm13YXJlIGNvZGUuXHJcbmNsYXNzIE5vdGlmaWNhdGlvbkRhdGEge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5XaUZpID0gMDtcclxuICAgICAgICB0aGlzLlJlbGF5ID0gMDtcclxuICAgICAgICB0aGlzLkJsdWV0b290aCA9IDA7XHJcbiAgICAgICAgdGhpcy5GcmVxdWVuY3kgPSAwO1xyXG4gICAgICAgIHRoaXMuVmVyYm9zZSA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuVGVzdCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuVl93aXRoX2xvYWQgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLkxhc3RSZXN1bHQgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLkFjdHVhbF9SID0gMDtcclxuICAgICAgICB0aGlzLlNldHBvaW50X1IgPSAwO1xyXG4gICAgICAgIHRoaXMuTWVtZnJlZSA9IDA7XHJcbiAgICAgICAgdGhpcy5FcnJvcnMgPSAwO1xyXG4gICAgICAgIHRoaXMuQmF0dGVyeSA9IDA7XHJcbiAgICAgICAgdGhpcy5UaW1lc3RhbXAgPSBuZXcgRGF0ZSgpO1xyXG4gICAgfVxyXG4gICAgc3RhdGljIHBhcnNlKGJ1Zikge1xyXG4gICAgICAgIHZhciBvdXRwdXQgPSBuZXcgTm90aWZpY2F0aW9uRGF0YSgpO1xyXG4gICAgICAgIHZhciBkdiA9IG5ldyBEYXRhVmlldyhidWYpO1xyXG4gICAgICAgIHZhciBzdGF0dXMxID0gZHYuZ2V0VWludDgoMSk7XHJcbiAgICAgICAgdmFyIHN0YXR1czIgPSBkdi5nZXRVaW50OCgwKTtcclxuICAgICAgICBvdXRwdXQuV2lGaSA9IChzdGF0dXMxID4+IDYpICYgMztcclxuICAgICAgICBvdXRwdXQuUmVsYXkgPSAoc3RhdHVzMSA+PiA0KSAmIDM7XHJcbiAgICAgICAgb3V0cHV0LkJsdWV0b290aCA9IChzdGF0dXMxID4+IDEpICYgNztcclxuICAgICAgICBvdXRwdXQuRnJlcXVlbmN5ID0gKHN0YXR1czIgPj4gNSkgJiAzO1xyXG4gICAgICAgIG91dHB1dC5WZXJib3NlID0gKHN0YXR1czIgJiA4KSAhPSAwO1xyXG4gICAgICAgIG91dHB1dC5UZXN0ID0gKHN0YXR1czIgJiA0KSAhPSAwO1xyXG4gICAgICAgIG91dHB1dC5WX3dpdGhfbG9hZCA9IChzdGF0dXMyICYgMikgIT0gMDtcclxuICAgICAgICBvdXRwdXQuTGFzdFJlc3VsdCA9IChzdGF0dXMyICYgMSkgIT0gMDtcclxuICAgICAgICBvdXRwdXQuQWN0dWFsX1IgPSBkdi5nZXRVaW50MTYoMik7XHJcbiAgICAgICAgb3V0cHV0LlNldHBvaW50X1IgPSBkdi5nZXRVaW50MTYoNCk7XHJcbiAgICAgICAgb3V0cHV0Lk1lbWZyZWUgPSBkdi5nZXRVaW50MzIoNik7XHJcbiAgICAgICAgb3V0cHV0LkVycm9ycyA9IGR2LmdldFVpbnQ4KDEwKTtcclxuICAgICAgICBvdXRwdXQuQmF0dGVyeSA9IGR2LmdldFVpbnQ4KDExKTtcclxuICAgICAgICByZXR1cm4gb3V0cHV0O1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuTm90aWZpY2F0aW9uRGF0YSA9IE5vdGlmaWNhdGlvbkRhdGE7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPU5vdGlmaWNhdGlvbkRhdGEuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5CbHVlVG9vdGhJT1RVVUlEID0gZXhwb3J0cy5NQVhfVV9HRU4gPSBleHBvcnRzLlJlc3VsdENvZGUgPSBleHBvcnRzLlN0YXRlID0gZXhwb3J0cy5Cb2FyZE1vZGUgPSBleHBvcnRzLkNvbW1hbmRUeXBlID0gdm9pZCAwO1xyXG4vKipcclxuICogQ29tbWFuZHMgcmVjb2duaXplZCBieSBJT1Rlc3RpbmcgQm9hcmQgbW9kdWxlXHJcbiAqICovXHJcbmV4cG9ydHMuQ29tbWFuZFR5cGUgPSB7XHJcbiAgICBOT05FX1VOS05PV046IDAsXHJcbiAgICBDT01NQU5EX0VOQUJMRV9XSUZJOiAweDAxLFxyXG4gICAgQ09NTUFORF9ESVNBQkxFX1dJRkk6IDB4MDIsXHJcbiAgICBDT01NQU5EX0VOQUJMRV9XRUJSRVBMOiAweDAzLFxyXG4gICAgQ09NTUFORF9ESVNBQkxFX1dFQlJFUEw6IDB4MDQsXHJcbiAgICBDT01NQU5EX0JSRUFLOiAweDA1LFxyXG4gICAgQ09NTUFORF9NT0RFX01FVEVSOiAweDA2LFxyXG4gICAgQ09NTUFORF9NT0RFX1JFU0lTVE9SUzogMHgwNyxcclxuICAgIENPTU1BTkRfTU9ERV9WX0xPQUQ6IDB4MDgsXHJcbiAgICBDT01NQU5EX1JFQk9PVDogMHgwOSxcclxuICAgIENPTU1BTkRfUlVOX1RFU1Q6IDB4MEEsXHJcbiAgICBDT01NQU5EX0xJR0hUX1NMRUVQOiAweDBCLFxyXG4gICAgQ09NTUFORF9ERUVQX1NMRUVQOiAweDBDLFxyXG4gICAgQ09NTUFORF9NRVRFUl9DT01NQU5EUzogMHgwRCxcclxuICAgIENPTU1BTkRfU0VUX0lOSVRJQUxfTUVURVJfQ09NTTogMHgwRSxcclxuICAgIENPTU1BTkRfU0VUX1dJRklfTkVUV09SSzogMHgwRixcclxuICAgIENPTU1BTkRfU0VUX1dJRklfUEFTU1dPUkQ6IDB4MTAsXHJcbiAgICBDT01NQU5EX1NFVF9JTklUSUFMX0JMVUVUT09USDogMHgxMSxcclxuICAgIENPTU1BTkRfU0VUX0lOSVRJQUxfV0lGSTogMHgxMixcclxuICAgIENPTU1BTkRfU0VUX0RFRVBTTEVFUF9NSU46IDB4MTMsXHJcbiAgICBDT01NQU5EX1NFVF9WRVJCT1NFOiAweDE0LFxyXG4gICAgQ09NTUFORF9TRVRfSU5JVElBTF9DT01NQU5EX1RZUEU6IDB4MTUsXHJcbiAgICBDT01NQU5EX1NFVF9JTklUSUFMX0NPTU1BTkRfU0VUUE9JTlQ6IDB4MTYsXHJcbiAgICBDT01NQU5EX1JfVEVTVDogMHgxNyxcclxuICAgIENPTU1BTkRfU0VUX0NQVTogMHgxOCxcclxuICAgIENPTU1BTkRfU0VUX09UQTogMHgxOSxcclxuICAgIENPTU1BTkRfQ09ORklHVVJFX01FVEVSX0NPTU06IDB4MjAsXHJcbiAgICBDT01NQU5EX1NFVF9CTFVFVE9PVEhfTkFNRTogMHgyMSxcclxuICAgIENPTU1BTkRfUkVGUkVTSDogMHgyMlxyXG59O1xyXG5leHBvcnRzLkJvYXJkTW9kZSA9IHtcclxuICAgIE1PREVfVU5ERUZJTkVEOiAwLFxyXG4gICAgTU9ERV9NRVRFUjogMSxcclxuICAgIE1PREVfUkVTSVNUT1I6IDIsXHJcbiAgICBNT0RFX1ZfV0lUSF9MT0FEOiAzLFxyXG4gICAgTU9ERV9URVNUOiA0XHJcbn07XHJcbi8qXHJcbiAqIEludGVybmFsIHN0YXRlIG1hY2hpbmUgZGVzY3JpcHRpb25zXHJcbiAqL1xyXG5leHBvcnRzLlN0YXRlID0ge1xyXG4gICAgTk9UX0NPTk5FQ1RFRDogJ05vdCBjb25uZWN0ZWQnLFxyXG4gICAgQ09OTkVDVElORzogJ0JsdWV0b290aCBkZXZpY2UgcGFpcmluZy4uLicsXHJcbiAgICBERVZJQ0VfUEFJUkVEOiAnRGV2aWNlIHBhaXJlZCcsXHJcbiAgICBTVUJTQ1JJQklORzogJ0JsdWV0b290aCBpbnRlcmZhY2VzIGNvbm5lY3RpbmcuLi4nLFxyXG4gICAgSURMRTogJ0lkbGUnLFxyXG4gICAgQlVTWTogJ0J1c3knLFxyXG4gICAgRVJST1I6ICdFcnJvcicsXHJcbiAgICBTVE9QUElORzogJ0Nsb3NpbmcgQlQgaW50ZXJmYWNlcy4uLicsXHJcbiAgICBTVE9QUEVEOiAnU3RvcHBlZCcsXHJcbiAgICBNRVRFUl9JTklUOiAnTWV0ZXIgY29ubmVjdGVkJyxcclxuICAgIE1FVEVSX0lOSVRJQUxJWklORzogJ1JlYWRpbmcgYm9hcmQgc3RhdGUuLi4nXHJcbn07XHJcbmV4cG9ydHMuUmVzdWx0Q29kZSA9IHtcclxuICAgIEZBSUxFRF9OT19SRVRSWTogMSxcclxuICAgIEZBSUxFRF9TSE9VTERfUkVUUlk6IDIsXHJcbiAgICBTVUNDRVNTOiAwXHJcbn07XHJcbmV4cG9ydHMuTUFYX1VfR0VOID0gMjcuMDsgLy8gbWF4aW11bSB2b2x0YWdlXHJcbi8qXHJcbiAqIEJsdWV0b290aCBjb25zdGFudHNcclxuICovXHJcbmV4cG9ydHMuQmx1ZVRvb3RoSU9UVVVJRCA9IHtcclxuICAgIFNlcnZpY2VVdWlkOiAnMDAwM2NkZDUtMDAwMC0xMDAwLTgwMDAtMDA4MDVmOWIwMTMxJyxcclxuICAgIFN0YXR1c0NoYXJVdWlkOiAnMDAwM2NkZDMtMDAwMC0xMDAwLTgwMDAtMDA4MDVmOWIwMTMxJyxcclxuICAgIENvbW1hbmRDaGFyVXVpZDogJzAwMDNjZGQ0LTAwMDAtMTAwMC04MDAwLTAwODA1ZjliMDEzMScgLy8gY29tbWFuZHMgdG8gdGhlIGJvYXJkXHJcbn07XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNvbnN0YW50cy5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLkJsdWVUb290aElPVFVVSUQgPSBleHBvcnRzLlN0YXRlID0gZXhwb3J0cy5zZXRMZXZlbCA9IGV4cG9ydHMuQ29tbWFuZFR5cGUgPSBleHBvcnRzLkNvbW1hbmQgPSBleHBvcnRzLmRyaXZlciA9IGV4cG9ydHMuU2ltcGxlRXhlY3V0ZUpTT04gPSBleHBvcnRzLkV4ZWN1dGVKU09OID0gZXhwb3J0cy5HZXRTdGF0ZUpTT04gPSBleHBvcnRzLkdldFN0YXRlID0gZXhwb3J0cy5TaW1wbGVFeGVjdXRlID0gZXhwb3J0cy5FeGVjdXRlID0gZXhwb3J0cy5QYWlyID0gZXhwb3J0cy5TdG9wID0gdm9pZCAwO1xyXG5jb25zdCBjb25zdGFudHNfMSA9IHJlcXVpcmUoXCIuL2NvbnN0YW50c1wiKTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiU3RhdGVcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGNvbnN0YW50c18xLlN0YXRlOyB9IH0pO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJDb21tYW5kVHlwZVwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gY29uc3RhbnRzXzEuQ29tbWFuZFR5cGU7IH0gfSk7XHJcbmNvbnN0IENvbW1hbmRfMSA9IHJlcXVpcmUoXCIuL0NvbW1hbmRcIik7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIkNvbW1hbmRcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIENvbW1hbmRfMS5Db21tYW5kOyB9IH0pO1xyXG5jb25zdCBsb2dsZXZlbF8xID0gcmVxdWlyZShcImxvZ2xldmVsXCIpO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJzZXRMZXZlbFwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gbG9nbGV2ZWxfMS5zZXRMZXZlbDsgfSB9KTtcclxuY29uc3QgbWV0ZXJQdWJsaWNBUElfMSA9IHJlcXVpcmUoXCIuL21ldGVyUHVibGljQVBJXCIpO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJTdG9wXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBtZXRlclB1YmxpY0FQSV8xLlN0b3A7IH0gfSk7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIlBhaXJcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIG1ldGVyUHVibGljQVBJXzEuUGFpcjsgfSB9KTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiRXhlY3V0ZVwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gbWV0ZXJQdWJsaWNBUElfMS5FeGVjdXRlOyB9IH0pO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJTaW1wbGVFeGVjdXRlXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBtZXRlclB1YmxpY0FQSV8xLlNpbXBsZUV4ZWN1dGU7IH0gfSk7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIkdldFN0YXRlXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBtZXRlclB1YmxpY0FQSV8xLkdldFN0YXRlOyB9IH0pO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJHZXRTdGF0ZUpTT05cIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIG1ldGVyUHVibGljQVBJXzEuR2V0U3RhdGVKU09OOyB9IH0pO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJFeGVjdXRlSlNPTlwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gbWV0ZXJQdWJsaWNBUElfMS5FeGVjdXRlSlNPTjsgfSB9KTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiU2ltcGxlRXhlY3V0ZUpTT05cIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIG1ldGVyUHVibGljQVBJXzEuU2ltcGxlRXhlY3V0ZUpTT047IH0gfSk7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcImRyaXZlclwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gbWV0ZXJQdWJsaWNBUElfMS5kcml2ZXI7IH0gfSk7XHJcbmNvbnN0IGNvbnN0YW50c18yID0gcmVxdWlyZShcIi4vY29uc3RhbnRzXCIpO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJCbHVlVG9vdGhJT1RVVUlEXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBjb25zdGFudHNfMi5CbHVlVG9vdGhJT1RVVUlEOyB9IH0pO1xyXG4vLyBEZWZpbmVzIGRlZmF1bHQgbGV2ZWwgb24gc3RhcnR1cFxyXG4oMCwgbG9nbGV2ZWxfMS5zZXRMZXZlbCkobG9nbGV2ZWxfMS5sZXZlbHMuRVJST1IsIHRydWUpO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1tZXRlckFwaS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuLypcclxuICogVGhpcyBmaWxlIGNvbnRhaW5zIHRoZSBwdWJsaWMgQVBJIG9mIHRoZSBtZXRlciwgaS5lLiB0aGUgZnVuY3Rpb25zIGRlc2lnbmVkXHJcbiAqIHRvIGJlIGNhbGxlZCBmcm9tIHRoaXJkIHBhcnR5IGNvZGUuXHJcbiAqIDEtIFBhaXIoKSA6IGJvb2xcclxuICogMi0gRXhlY3V0ZShDb21tYW5kKSA6IGJvb2wgKyBKU09OIHZlcnNpb25cclxuICogMy0gU3RvcCgpIDogYm9vbFxyXG4gKiA0LSBHZXRTdGF0ZSgpIDogYXJyYXkgKyBKU09OIHZlcnNpb25cclxuICogNS0gU2ltcGxlRXhlY3V0ZShDb21tYW5kKSA6IHJldHVybnMgdGhlIHVwZGF0ZWQgbWVhc3VyZW1lbnQgb3IgbnVsbFxyXG4gKi9cclxudmFyIF9faW1wb3J0RGVmYXVsdCA9ICh0aGlzICYmIHRoaXMuX19pbXBvcnREZWZhdWx0KSB8fCBmdW5jdGlvbiAobW9kKSB7XHJcbiAgICByZXR1cm4gKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgPyBtb2QgOiB7IFwiZGVmYXVsdFwiOiBtb2QgfTtcclxufTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLlN0b3AgPSBleHBvcnRzLlBhaXIgPSBleHBvcnRzLkV4ZWN1dGUgPSBleHBvcnRzLlNpbXBsZUV4ZWN1dGUgPSBleHBvcnRzLlNpbXBsZUV4ZWN1dGVKU09OID0gZXhwb3J0cy5FeGVjdXRlSlNPTiA9IGV4cG9ydHMuR2V0U3RhdGVKU09OID0gZXhwb3J0cy5HZXRTdGF0ZSA9IGV4cG9ydHMuZHJpdmVyID0gdm9pZCAwO1xyXG5jb25zdCBEcml2ZXJfMSA9IHJlcXVpcmUoXCIuL0RyaXZlclwiKTtcclxuY29uc3QgQ29tbWFuZFJlc3VsdF8xID0gcmVxdWlyZShcIi4vQ29tbWFuZFJlc3VsdFwiKTtcclxuY29uc3QgQ29tbWFuZF8xID0gcmVxdWlyZShcIi4vQ29tbWFuZFwiKTtcclxuY29uc3QgY29uc3RhbnRzXzEgPSByZXF1aXJlKFwiLi9jb25zdGFudHNcIik7XHJcbmNvbnN0IHV0aWxzXzEgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcclxuY29uc3QgbG9nbGV2ZWxfMSA9IF9faW1wb3J0RGVmYXVsdChyZXF1aXJlKFwibG9nbGV2ZWxcIikpO1xyXG4vLyBVc2VmdWwgaW5mb3JtYXRpb24gZm9yIGRlYnVnZ2luZywgZXZlbiBpZiBpdCBzaG91bGQgbm90IGJlIGV4cG9zZWRcclxuZXhwb3J0cy5kcml2ZXIgPSBuZXcgRHJpdmVyXzEuRHJpdmVyKCk7XHJcbi8qKlxyXG4gKiBSZXR1cm5zIGEgY29weSBvZiB0aGUgY3VycmVudCBzdGF0ZVxyXG4gKiBAcmV0dXJucyB7YXJyYXl9IHN0YXR1cyBvZiBtZXRlclxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gR2V0U3RhdGUoKSB7XHJcbiAgICBsZXQgcmVhZHkgPSBmYWxzZTtcclxuICAgIGxldCBpbml0aWFsaXppbmcgPSBmYWxzZTtcclxuICAgIHN3aXRjaCAoZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGF0ZSkge1xyXG4gICAgICAgIC8vIFN0YXRlcyByZXF1aXJpbmcgdXNlciBpbnB1dFxyXG4gICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuRVJST1I6XHJcbiAgICAgICAgY2FzZSBjb25zdGFudHNfMS5TdGF0ZS5TVE9QUEVEOlxyXG4gICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuTk9UX0NPTk5FQ1RFRDpcclxuICAgICAgICAgICAgcmVhZHkgPSBmYWxzZTtcclxuICAgICAgICAgICAgaW5pdGlhbGl6aW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuQlVTWTpcclxuICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLklETEU6XHJcbiAgICAgICAgICAgIHJlYWR5ID0gdHJ1ZTtcclxuICAgICAgICAgICAgaW5pdGlhbGl6aW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuQ09OTkVDVElORzpcclxuICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLkRFVklDRV9QQUlSRUQ6XHJcbiAgICAgICAgY2FzZSBjb25zdGFudHNfMS5TdGF0ZS5NRVRFUl9JTklUOlxyXG4gICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuTUVURVJfSU5JVElBTElaSU5HOlxyXG4gICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuU1VCU0NSSUJJTkc6XHJcbiAgICAgICAgICAgIGluaXRpYWxpemluZyA9IHRydWU7XHJcbiAgICAgICAgICAgIHJlYWR5ID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgIHJlYWR5ID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGluaXRpYWxpemluZyA9IGZhbHNlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBsYXN0U2V0cG9pbnQ6IGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUubGFzdE1lYXN1cmUuU2V0cG9pbnRfUixcclxuICAgICAgICBsYXN0TWVhc3VyZTogZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5sYXN0TWVhc3VyZS5BY3R1YWxfUixcclxuICAgICAgICBkZXZpY2VOYW1lOiBleHBvcnRzLmRyaXZlci5idFN0YXRlLmJ0RGV2aWNlID8gZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5idERldmljZS5uYW1lIDogJycsXHJcbiAgICAgICAgZGV2aWNlU2VyaWFsOiBleHBvcnRzLmRyaXZlci5idFN0YXRlLm1ldGVyPy5zZXJpYWwsXHJcbiAgICAgICAgc3RhdHM6IGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhdHMsXHJcbiAgICAgICAgZGV2aWNlTW9kZTogZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5tZXRlcj8ubW9kZSxcclxuICAgICAgICBzdGF0dXM6IGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhdGUsXHJcbiAgICAgICAgYmF0dGVyeUxldmVsOiBleHBvcnRzLmRyaXZlci5idFN0YXRlLm1ldGVyPy5iYXR0ZXJ5LFxyXG4gICAgICAgIHJlYWR5LFxyXG4gICAgICAgIGluaXRpYWxpemluZ1xyXG4gICAgfTtcclxufVxyXG5leHBvcnRzLkdldFN0YXRlID0gR2V0U3RhdGU7XHJcbi8qKlxyXG4gKiBQcm92aWRlZCBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIEJsYXpvclxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBKU09OIHN0YXRlIG9iamVjdFxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gR2V0U3RhdGVKU09OKCkge1xyXG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGF3YWl0IEdldFN0YXRlKCkpO1xyXG59XHJcbmV4cG9ydHMuR2V0U3RhdGVKU09OID0gR2V0U3RhdGVKU09OO1xyXG4vKipcclxuICogRXhlY3V0ZSBjb21tYW5kIHdpdGggc2V0cG9pbnRzLCBKU09OIHZlcnNpb25cclxuICogQHBhcmFtIHtzdHJpbmd9IGpzb25Db21tYW5kIHRoZSBjb21tYW5kIHRvIGV4ZWN1dGVcclxuICogQHJldHVybnMge3N0cmluZ30gSlNPTiBjb21tYW5kIG9iamVjdFxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gRXhlY3V0ZUpTT04oanNvbkNvbW1hbmQpIHtcclxuICAgIGNvbnN0IGNvbW1hbmQgPSBKU09OLnBhcnNlKGpzb25Db21tYW5kKTtcclxuICAgIC8vIGRlc2VyaWFsaXplZCBvYmplY3QgaGFzIGxvc3QgaXRzIG1ldGhvZHMsIGxldCdzIHJlY3JlYXRlIGEgY29tcGxldGUgb25lLlxyXG4gICAgY29uc3QgY29tbWFuZDIgPSBDb21tYW5kXzEuQ29tbWFuZC5DcmVhdGVGb3VyU1AoY29tbWFuZC50eXBlLCBjb21tYW5kLnNldHBvaW50LCBjb21tYW5kLnNldHBvaW50MiwgY29tbWFuZC5zZXRwb2ludDMsIGNvbW1hbmQuc2V0cG9pbnQ0KTtcclxuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhd2FpdCBFeGVjdXRlKGNvbW1hbmQyKSk7XHJcbn1cclxuZXhwb3J0cy5FeGVjdXRlSlNPTiA9IEV4ZWN1dGVKU09OO1xyXG5hc3luYyBmdW5jdGlvbiBTaW1wbGVFeGVjdXRlSlNPTihqc29uQ29tbWFuZCkge1xyXG4gICAgY29uc3QgY29tbWFuZCA9IEpTT04ucGFyc2UoanNvbkNvbW1hbmQpO1xyXG4gICAgLy8gZGVzZXJpYWxpemVkIG9iamVjdCBoYXMgbG9zdCBpdHMgbWV0aG9kcywgbGV0J3MgcmVjcmVhdGUgYSBjb21wbGV0ZSBvbmUuXHJcbiAgICBjb25zdCBjb21tYW5kMiA9IENvbW1hbmRfMS5Db21tYW5kLkNyZWF0ZUZvdXJTUChjb21tYW5kLnR5cGUsIGNvbW1hbmQuc2V0cG9pbnQsIGNvbW1hbmQuc2V0cG9pbnQyLCBjb21tYW5kLnNldHBvaW50MywgY29tbWFuZC5zZXRwb2ludDQpO1xyXG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGF3YWl0IFNpbXBsZUV4ZWN1dGUoY29tbWFuZDIpKTtcclxufVxyXG5leHBvcnRzLlNpbXBsZUV4ZWN1dGVKU09OID0gU2ltcGxlRXhlY3V0ZUpTT047XHJcbi8qKlxyXG4gKiBFeGVjdXRlIGEgY29tbWFuZCBhbmQgcmV0dXJucyB0aGUgbWVhc3VyZW1lbnQgb3Igc2V0cG9pbnQgd2l0aCBlcnJvciBmbGFnIGFuZCBtZXNzYWdlXHJcbiAqIEBwYXJhbSB7Q29tbWFuZH0gY29tbWFuZFxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gU2ltcGxlRXhlY3V0ZShjb21tYW5kKSB7XHJcbiAgICBjb25zdCBTSU1QTEVfRVhFQ1VURV9USU1FT1VUX1MgPSA1O1xyXG4gICAgY29uc3QgY3IgPSBuZXcgQ29tbWFuZFJlc3VsdF8xLkNvbW1hbmRSZXN1bHQoKTtcclxuICAgIGxvZ2xldmVsXzEuZGVmYXVsdC5pbmZvKCdTaW1wbGVFeGVjdXRlIGNhbGxlZC4uLicpO1xyXG4gICAgaWYgKGNvbW1hbmQgPT09IG51bGwpIHtcclxuICAgICAgICBjci5zdWNjZXNzID0gZmFsc2U7XHJcbiAgICAgICAgY3IubWVzc2FnZSA9ICdJbnZhbGlkIGNvbW1hbmQnO1xyXG4gICAgICAgIHJldHVybiBjcjtcclxuICAgIH1cclxuICAgIGNvbW1hbmQucGVuZGluZyA9IHRydWU7IC8vIEluIGNhc2UgY2FsbGVyIGRvZXMgbm90IHNldCBwZW5kaW5nIGZsYWdcclxuICAgIC8vIEZhaWwgaW1tZWRpYXRlbHkgaWYgbm90IHBhaXJlZC5cclxuICAgIGlmICghZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGFydGVkKSB7XHJcbiAgICAgICAgY3Iuc3VjY2VzcyA9IGZhbHNlO1xyXG4gICAgICAgIGNyLm1lc3NhZ2UgPSAnRGV2aWNlIGlzIG5vdCBwYWlyZWQnO1xyXG4gICAgICAgIGxvZ2xldmVsXzEuZGVmYXVsdC53YXJuKGNyLm1lc3NhZ2UpO1xyXG4gICAgICAgIHJldHVybiBjcjtcclxuICAgIH1cclxuICAgIC8vIEFub3RoZXIgY29tbWFuZCBtYXkgYmUgcGVuZGluZy5cclxuICAgIGlmIChleHBvcnRzLmRyaXZlci5idFN0YXRlLmNvbW1hbmQgIT0gbnVsbCAmJiBleHBvcnRzLmRyaXZlci5idFN0YXRlLmNvbW1hbmQucGVuZGluZykge1xyXG4gICAgICAgIGNyLnN1Y2Nlc3MgPSBmYWxzZTtcclxuICAgICAgICBjci5tZXNzYWdlID0gJ0Fub3RoZXIgY29tbWFuZCBpcyBwZW5kaW5nJztcclxuICAgICAgICBsb2dsZXZlbF8xLmRlZmF1bHQud2Fybihjci5tZXNzYWdlKTtcclxuICAgICAgICByZXR1cm4gY3I7XHJcbiAgICB9XHJcbiAgICAvLyBXYWl0IGZvciBjb21wbGV0aW9uIG9mIHRoZSBjb21tYW5kLCBvciBoYWx0IG9mIHRoZSBzdGF0ZSBtYWNoaW5lXHJcbiAgICBleHBvcnRzLmRyaXZlci5idFN0YXRlLmNvbW1hbmQgPSBDb21tYW5kXzEuQ29tbWFuZC5DcmVhdGVGb3VyU1AoY29tbWFuZC50eXBlLCBjb21tYW5kLnNldHBvaW50LCBjb21tYW5kLnNldHBvaW50MiwgY29tbWFuZC5zZXRwb2ludDMsIGNvbW1hbmQuc2V0cG9pbnQ0KTtcclxuICAgIGlmIChjb21tYW5kICE9IG51bGwpIHtcclxuICAgICAgICBhd2FpdCAoMCwgdXRpbHNfMS53YWl0Rm9yVGltZW91dCkoKCkgPT4gIWNvbW1hbmQucGVuZGluZyB8fCBleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXRlID09IGNvbnN0YW50c18xLlN0YXRlLlNUT1BQRUQsIFNJTVBMRV9FWEVDVVRFX1RJTUVPVVRfUyk7XHJcbiAgICB9XHJcbiAgICAvLyBDaGVjayBpZiBlcnJvciBvciB0aW1lb3V0c1xyXG4gICAgaWYgKGNvbW1hbmQuZXJyb3IgfHwgY29tbWFuZC5wZW5kaW5nKSB7XHJcbiAgICAgICAgY3Iuc3VjY2VzcyA9IGZhbHNlO1xyXG4gICAgICAgIGNyLm1lc3NhZ2UgPSAnRXJyb3Igd2hpbGUgZXhlY3V0aW5nIHRoZSBjb21tYW5kLic7XHJcbiAgICAgICAgbG9nbGV2ZWxfMS5kZWZhdWx0Lndhcm4oY3IubWVzc2FnZSk7XHJcbiAgICAgICAgLy8gUmVzZXQgdGhlIGFjdGl2ZSBjb21tYW5kXHJcbiAgICAgICAgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5jb21tYW5kID0gbnVsbDtcclxuICAgICAgICByZXR1cm4gY3I7XHJcbiAgICB9XHJcbiAgICAvLyBTdGF0ZSBpcyB1cGRhdGVkIGJ5IGV4ZWN1dGUgY29tbWFuZCwgc28gd2UgY2FuIHVzZSBidFN0YXRlIHJpZ2h0IGF3YXlcclxuICAgIGNyLnZhbHVlID0gZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5sYXN0TWVhc3VyZS5TZXRwb2ludF9SO1xyXG4gICAgY3IudW5pdCA9IFwiT2htc1wiO1xyXG4gICAgY3Iuc2Vjb25kYXJ5X3ZhbHVlID0gZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5sYXN0TWVhc3VyZS5BY3R1YWxfUjtcclxuICAgIGNyLnNlY29uZGFyeV91bml0ID0gXCJPaG1zXCI7XHJcbiAgICBjci5zdWNjZXNzID0gdHJ1ZTtcclxuICAgIGNyLm1lc3NhZ2UgPSAnQ29tbWFuZCBleGVjdXRlZCBzdWNjZXNzZnVsbHknO1xyXG4gICAgcmV0dXJuIGNyO1xyXG59XHJcbmV4cG9ydHMuU2ltcGxlRXhlY3V0ZSA9IFNpbXBsZUV4ZWN1dGU7XHJcbi8qKlxyXG4gKiBFeHRlcm5hbCBpbnRlcmZhY2UgdG8gcmVxdWlyZSBhIGNvbW1hbmQgdG8gYmUgZXhlY3V0ZWQuXHJcbiAqIFRoZSBibHVldG9vdGggZGV2aWNlIHBhaXJpbmcgd2luZG93IHdpbGwgb3BlbiBpZiBkZXZpY2UgaXMgbm90IGNvbm5lY3RlZC5cclxuICogVGhpcyBtYXkgZmFpbCBpZiBjYWxsZWQgb3V0c2lkZSBhIHVzZXIgZ2VzdHVyZS5cclxuICogQHBhcmFtIHtDb21tYW5kfSBjb21tYW5kXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBFeGVjdXRlKGNvbW1hbmQpIHtcclxuICAgIGxvZ2xldmVsXzEuZGVmYXVsdC5pbmZvKCdFeGVjdXRlIGNhbGxlZC4uLicpO1xyXG4gICAgaWYgKGNvbW1hbmQgPT0gbnVsbCkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgY29tbWFuZC5wZW5kaW5nID0gdHJ1ZTtcclxuICAgIGxldCBjcHQgPSAwO1xyXG4gICAgd2hpbGUgKGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuY29tbWFuZCAhPSBudWxsICYmIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuY29tbWFuZC5wZW5kaW5nICYmIGNwdCA8IDMwMCkge1xyXG4gICAgICAgIGxvZ2xldmVsXzEuZGVmYXVsdC5kZWJ1ZygnV2FpdGluZyBmb3IgY3VycmVudCBjb21tYW5kIHRvIGNvbXBsZXRlLi4uJyk7XHJcbiAgICAgICAgYXdhaXQgKDAsIHV0aWxzXzEuc2xlZXApKDEwMCk7XHJcbiAgICAgICAgY3B0Kys7XHJcbiAgICB9XHJcbiAgICBsb2dsZXZlbF8xLmRlZmF1bHQuaW5mbygnU2V0dGluZyBuZXcgY29tbWFuZCA6JyArIGNvbW1hbmQpO1xyXG4gICAgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5jb21tYW5kID0gQ29tbWFuZF8xLkNvbW1hbmQuQ3JlYXRlRm91clNQKGNvbW1hbmQudHlwZSwgY29tbWFuZC5zZXRwb2ludCwgY29tbWFuZC5zZXRwb2ludDIsIGNvbW1hbmQuc2V0cG9pbnQzLCBjb21tYW5kLnNldHBvaW50NCk7XHJcbiAgICAvLyBTdGFydCB0aGUgcmVndWxhciBzdGF0ZSBtYWNoaW5lXHJcbiAgICBpZiAoIWV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhcnRlZCkge1xyXG4gICAgICAgIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5OT1RfQ09OTkVDVEVEO1xyXG4gICAgICAgIGF3YWl0IGV4cG9ydHMuZHJpdmVyLnN0YXRlTWFjaGluZSgpO1xyXG4gICAgfVxyXG4gICAgLy8gV2FpdCBmb3IgY29tcGxldGlvbiBvZiB0aGUgY29tbWFuZCwgb3IgaGFsdCBvZiB0aGUgc3RhdGUgbWFjaGluZVxyXG4gICAgaWYgKGNvbW1hbmQgIT0gbnVsbCkge1xyXG4gICAgICAgIGF3YWl0ICgwLCB1dGlsc18xLndhaXRGb3IpKCgpID0+ICFjb21tYW5kLnBlbmRpbmcgfHwgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGF0ZSA9PSBjb25zdGFudHNfMS5TdGF0ZS5TVE9QUEVEKTtcclxuICAgIH1cclxuICAgIC8vIFJldHVybiB0aGUgY29tbWFuZCBvYmplY3QgcmVzdWx0XHJcbiAgICByZXR1cm4gY29tbWFuZDtcclxufVxyXG5leHBvcnRzLkV4ZWN1dGUgPSBFeGVjdXRlO1xyXG4vKipcclxuICogTVVTVCBCRSBDQUxMRUQgRlJPTSBBIFVTRVIgR0VTVFVSRSBFVkVOVCBIQU5ETEVSXHJcbiAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiBtZXRlciBpcyByZWFkeSB0byBleGVjdXRlIGNvbW1hbmRcclxuICogKi9cclxuYXN5bmMgZnVuY3Rpb24gUGFpcihmb3JjZVNlbGVjdGlvbiA9IGZhbHNlKSB7XHJcbiAgICBsb2dsZXZlbF8xLmRlZmF1bHQuaW5mbygnUGFpcignICsgZm9yY2VTZWxlY3Rpb24gKyAnKSBjYWxsZWQuLi4nKTtcclxuICAgIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUub3B0aW9ucy5mb3JjZURldmljZVNlbGVjdGlvbiA9IGZvcmNlU2VsZWN0aW9uO1xyXG4gICAgaWYgKCFleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXJ0ZWQpIHtcclxuICAgICAgICBleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuTk9UX0NPTk5FQ1RFRDtcclxuICAgICAgICBleHBvcnRzLmRyaXZlci5zdGF0ZU1hY2hpbmUoKTsgLy8gU3RhcnQgaXRcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhdGUgPT0gY29uc3RhbnRzXzEuU3RhdGUuRVJST1IpIHtcclxuICAgICAgICBleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuTk9UX0NPTk5FQ1RFRDsgLy8gVHJ5IHRvIHJlc3RhcnRcclxuICAgIH1cclxuICAgIGF3YWl0ICgwLCB1dGlsc18xLndhaXRGb3IpKCgpID0+IGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhdGUgPT0gY29uc3RhbnRzXzEuU3RhdGUuSURMRSB8fCBleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXRlID09IGNvbnN0YW50c18xLlN0YXRlLlNUT1BQRUQpO1xyXG4gICAgbG9nbGV2ZWxfMS5kZWZhdWx0LmluZm8oJ1BhaXJpbmcgY29tcGxldGVkLCBzdGF0ZSA6JywgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGF0ZSk7XHJcbiAgICByZXR1cm4gKGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhdGUgIT0gY29uc3RhbnRzXzEuU3RhdGUuU1RPUFBFRCk7XHJcbn1cclxuZXhwb3J0cy5QYWlyID0gUGFpcjtcclxuLyoqXHJcbiAqIFN0b3BzIHRoZSBzdGF0ZSBtYWNoaW5lIGFuZCBkaXNjb25uZWN0cyBibHVldG9vdGguXHJcbiAqICovXHJcbmFzeW5jIGZ1bmN0aW9uIFN0b3AoKSB7XHJcbiAgICBsb2dsZXZlbF8xLmRlZmF1bHQuaW5mbygnU3RvcCByZXF1ZXN0IHJlY2VpdmVkJyk7XHJcbiAgICBleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0b3BSZXF1ZXN0ID0gdHJ1ZTtcclxuICAgIGF3YWl0ICgwLCB1dGlsc18xLnNsZWVwKSgxMDApO1xyXG4gICAgd2hpbGUgKGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhcnRlZCB8fCAoZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGF0ZSAhPSBjb25zdGFudHNfMS5TdGF0ZS5TVE9QUEVEICYmIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhdGUgIT0gY29uc3RhbnRzXzEuU3RhdGUuTk9UX0NPTk5FQ1RFRCkpIHtcclxuICAgICAgICBleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0b3BSZXF1ZXN0ID0gdHJ1ZTtcclxuICAgICAgICBhd2FpdCAoMCwgdXRpbHNfMS5zbGVlcCkoMTAwKTtcclxuICAgIH1cclxuICAgIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuY29tbWFuZCA9IG51bGw7XHJcbiAgICBleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0b3BSZXF1ZXN0ID0gZmFsc2U7XHJcbiAgICBsb2dsZXZlbF8xLmRlZmF1bHQud2FybignU3RvcHBlZCBvbiByZXF1ZXN0LicpO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbn1cclxuZXhwb3J0cy5TdG9wID0gU3RvcDtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWV0ZXJQdWJsaWNBUEkuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5idWYyaGV4ID0gZXhwb3J0cy5QYXJzZSA9IGV4cG9ydHMud2FpdEZvclRpbWVvdXQgPSBleHBvcnRzLndhaXRGb3IgPSBleHBvcnRzLnNsZWVwID0gdm9pZCAwO1xyXG5jb25zdCBzbGVlcCA9IGFzeW5jIChtcykgPT4gYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIG1zKSk7XHJcbmV4cG9ydHMuc2xlZXAgPSBzbGVlcDtcclxuY29uc3Qgd2FpdEZvciA9IGFzeW5jIGZ1bmN0aW9uIHdhaXRGb3IoZikge1xyXG4gICAgd2hpbGUgKCFmKCkpXHJcbiAgICAgICAgYXdhaXQgKDAsIGV4cG9ydHMuc2xlZXApKDEwMCArIE1hdGgucmFuZG9tKCkgKiAyNSk7XHJcbiAgICByZXR1cm4gZigpO1xyXG59O1xyXG5leHBvcnRzLndhaXRGb3IgPSB3YWl0Rm9yO1xyXG5jb25zdCB3YWl0Rm9yVGltZW91dCA9IGFzeW5jIGZ1bmN0aW9uIHdhaXRGb3IoZiwgdGltZW91dFNlYykge1xyXG4gICAgbGV0IHRvdGFsVGltZU1zID0gMDtcclxuICAgIHdoaWxlICghZigpICYmIHRvdGFsVGltZU1zIDwgdGltZW91dFNlYyAqIDEwMDApIHtcclxuICAgICAgICBjb25zdCBkZWxheU1zID0gMTAwICsgTWF0aC5yYW5kb20oKSAqIDI1O1xyXG4gICAgICAgIHRvdGFsVGltZU1zICs9IGRlbGF5TXM7XHJcbiAgICAgICAgYXdhaXQgKDAsIGV4cG9ydHMuc2xlZXApKGRlbGF5TXMpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGYoKTtcclxufTtcclxuZXhwb3J0cy53YWl0Rm9yVGltZW91dCA9IHdhaXRGb3JUaW1lb3V0O1xyXG4vKipcclxuICogSGVscGVyIGZ1bmN0aW9uIHRvIGNvbnZlcnQgYSB2YWx1ZSBpbnRvIGFuIGVudW0gdmFsdWVcclxuXHJcbiAqL1xyXG5mdW5jdGlvbiBQYXJzZShlbnVtdHlwZSwgZW51bXZhbHVlKSB7XHJcbiAgICBmb3IgKGNvbnN0IGVudW1OYW1lIGluIGVudW10eXBlKSB7XHJcbiAgICAgICAgaWYgKGVudW10eXBlW2VudW1OYW1lXSA9PSBlbnVtdmFsdWUpIHtcclxuICAgICAgICAgICAgLyoganNoaW50IC1XMDYxICovXHJcbiAgICAgICAgICAgIHJldHVybiBldmFsKGVudW10eXBlICsgJy4nICsgZW51bU5hbWUpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBudWxsO1xyXG59XHJcbmV4cG9ydHMuUGFyc2UgPSBQYXJzZTtcclxuLyoqXHJcbiAqIEhlbHBlciBmdW5jdGlvbiB0byBkdW1wIGFycmF5YnVmZmVyIGFzIGhleCBzdHJpbmdcclxuICovXHJcbmZ1bmN0aW9uIGJ1ZjJoZXgoYnVmZmVyKSB7XHJcbiAgICByZXR1cm4gWy4uLm5ldyBVaW50OEFycmF5KGJ1ZmZlcildXHJcbiAgICAgICAgLm1hcCh4ID0+IHgudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsICcwJykpXHJcbiAgICAgICAgLmpvaW4oJyAnKTtcclxufVxyXG5leHBvcnRzLmJ1ZjJoZXggPSBidWYyaGV4O1xyXG5mdW5jdGlvbiBoZXgyYnVmKGlucHV0KSB7XHJcbiAgICBpZiAodHlwZW9mIGlucHV0ICE9PSAnc3RyaW5nJykge1xyXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGlucHV0IHRvIGJlIGEgc3RyaW5nJyk7XHJcbiAgICB9XHJcbiAgICBjb25zdCBoZXhzdHIgPSBpbnB1dC5yZXBsYWNlKC9cXHMrL2csICcnKTtcclxuICAgIGlmICgoaGV4c3RyLmxlbmd0aCAlIDIpICE9PSAwKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0V4cGVjdGVkIHN0cmluZyB0byBiZSBhbiBldmVuIG51bWJlciBvZiBjaGFyYWN0ZXJzJyk7XHJcbiAgICB9XHJcbiAgICBjb25zdCB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoaGV4c3RyLmxlbmd0aCAvIDIpO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBoZXhzdHIubGVuZ3RoOyBpICs9IDIpIHtcclxuICAgICAgICB2aWV3W2kgLyAyXSA9IHBhcnNlSW50KGhleHN0ci5zdWJzdHJpbmcoaSwgaSArIDIpLCAxNik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdmlldy5idWZmZXI7XHJcbn1cclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dXRpbHMuanMubWFwIiwiLypcbiogbG9nbGV2ZWwgLSBodHRwczovL2dpdGh1Yi5jb20vcGltdGVycnkvbG9nbGV2ZWxcbipcbiogQ29weXJpZ2h0IChjKSAyMDEzIFRpbSBQZXJyeVxuKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG4qL1xuKGZ1bmN0aW9uIChyb290LCBkZWZpbml0aW9uKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoZGVmaW5pdGlvbik7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGRlZmluaXRpb24oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByb290LmxvZyA9IGRlZmluaXRpb24oKTtcbiAgICB9XG59KHRoaXMsIGZ1bmN0aW9uICgpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIC8vIFNsaWdodGx5IGR1YmlvdXMgdHJpY2tzIHRvIGN1dCBkb3duIG1pbmltaXplZCBmaWxlIHNpemVcbiAgICB2YXIgbm9vcCA9IGZ1bmN0aW9uKCkge307XG4gICAgdmFyIHVuZGVmaW5lZFR5cGUgPSBcInVuZGVmaW5lZFwiO1xuICAgIHZhciBpc0lFID0gKHR5cGVvZiB3aW5kb3cgIT09IHVuZGVmaW5lZFR5cGUpICYmICh0eXBlb2Ygd2luZG93Lm5hdmlnYXRvciAhPT0gdW5kZWZpbmVkVHlwZSkgJiYgKFxuICAgICAgICAvVHJpZGVudFxcL3xNU0lFIC8udGVzdCh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudClcbiAgICApO1xuXG4gICAgdmFyIGxvZ01ldGhvZHMgPSBbXG4gICAgICAgIFwidHJhY2VcIixcbiAgICAgICAgXCJkZWJ1Z1wiLFxuICAgICAgICBcImluZm9cIixcbiAgICAgICAgXCJ3YXJuXCIsXG4gICAgICAgIFwiZXJyb3JcIlxuICAgIF07XG5cbiAgICAvLyBDcm9zcy1icm93c2VyIGJpbmQgZXF1aXZhbGVudCB0aGF0IHdvcmtzIGF0IGxlYXN0IGJhY2sgdG8gSUU2XG4gICAgZnVuY3Rpb24gYmluZE1ldGhvZChvYmosIG1ldGhvZE5hbWUpIHtcbiAgICAgICAgdmFyIG1ldGhvZCA9IG9ialttZXRob2ROYW1lXTtcbiAgICAgICAgaWYgKHR5cGVvZiBtZXRob2QuYmluZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcmV0dXJuIG1ldGhvZC5iaW5kKG9iaik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJldHVybiBGdW5jdGlvbi5wcm90b3R5cGUuYmluZC5jYWxsKG1ldGhvZCwgb2JqKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAvLyBNaXNzaW5nIGJpbmQgc2hpbSBvciBJRTggKyBNb2Rlcm5penIsIGZhbGxiYWNrIHRvIHdyYXBwaW5nXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5LmFwcGx5KG1ldGhvZCwgW29iaiwgYXJndW1lbnRzXSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRyYWNlKCkgZG9lc24ndCBwcmludCB0aGUgbWVzc2FnZSBpbiBJRSwgc28gZm9yIHRoYXQgY2FzZSB3ZSBuZWVkIHRvIHdyYXAgaXRcbiAgICBmdW5jdGlvbiB0cmFjZUZvcklFKCkge1xuICAgICAgICBpZiAoY29uc29sZS5sb2cpIHtcbiAgICAgICAgICAgIGlmIChjb25zb2xlLmxvZy5hcHBseSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEluIG9sZCBJRSwgbmF0aXZlIGNvbnNvbGUgbWV0aG9kcyB0aGVtc2VsdmVzIGRvbid0IGhhdmUgYXBwbHkoKS5cbiAgICAgICAgICAgICAgICBGdW5jdGlvbi5wcm90b3R5cGUuYXBwbHkuYXBwbHkoY29uc29sZS5sb2csIFtjb25zb2xlLCBhcmd1bWVudHNdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY29uc29sZS50cmFjZSkgY29uc29sZS50cmFjZSgpO1xuICAgIH1cblxuICAgIC8vIEJ1aWxkIHRoZSBiZXN0IGxvZ2dpbmcgbWV0aG9kIHBvc3NpYmxlIGZvciB0aGlzIGVudlxuICAgIC8vIFdoZXJldmVyIHBvc3NpYmxlIHdlIHdhbnQgdG8gYmluZCwgbm90IHdyYXAsIHRvIHByZXNlcnZlIHN0YWNrIHRyYWNlc1xuICAgIGZ1bmN0aW9uIHJlYWxNZXRob2QobWV0aG9kTmFtZSkge1xuICAgICAgICBpZiAobWV0aG9kTmFtZSA9PT0gJ2RlYnVnJykge1xuICAgICAgICAgICAgbWV0aG9kTmFtZSA9ICdsb2cnO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlID09PSB1bmRlZmluZWRUeXBlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIE5vIG1ldGhvZCBwb3NzaWJsZSwgZm9yIG5vdyAtIGZpeGVkIGxhdGVyIGJ5IGVuYWJsZUxvZ2dpbmdXaGVuQ29uc29sZUFycml2ZXNcbiAgICAgICAgfSBlbHNlIGlmIChtZXRob2ROYW1lID09PSAndHJhY2UnICYmIGlzSUUpIHtcbiAgICAgICAgICAgIHJldHVybiB0cmFjZUZvcklFO1xuICAgICAgICB9IGVsc2UgaWYgKGNvbnNvbGVbbWV0aG9kTmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIGJpbmRNZXRob2QoY29uc29sZSwgbWV0aG9kTmFtZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoY29uc29sZS5sb2cgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIGJpbmRNZXRob2QoY29uc29sZSwgJ2xvZycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG5vb3A7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUaGVzZSBwcml2YXRlIGZ1bmN0aW9ucyBhbHdheXMgbmVlZCBgdGhpc2AgdG8gYmUgc2V0IHByb3Blcmx5XG5cbiAgICBmdW5jdGlvbiByZXBsYWNlTG9nZ2luZ01ldGhvZHMobGV2ZWwsIGxvZ2dlck5hbWUpIHtcbiAgICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsb2dNZXRob2RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgbWV0aG9kTmFtZSA9IGxvZ01ldGhvZHNbaV07XG4gICAgICAgICAgICB0aGlzW21ldGhvZE5hbWVdID0gKGkgPCBsZXZlbCkgP1xuICAgICAgICAgICAgICAgIG5vb3AgOlxuICAgICAgICAgICAgICAgIHRoaXMubWV0aG9kRmFjdG9yeShtZXRob2ROYW1lLCBsZXZlbCwgbG9nZ2VyTmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZWZpbmUgbG9nLmxvZyBhcyBhbiBhbGlhcyBmb3IgbG9nLmRlYnVnXG4gICAgICAgIHRoaXMubG9nID0gdGhpcy5kZWJ1ZztcbiAgICB9XG5cbiAgICAvLyBJbiBvbGQgSUUgdmVyc2lvbnMsIHRoZSBjb25zb2xlIGlzbid0IHByZXNlbnQgdW50aWwgeW91IGZpcnN0IG9wZW4gaXQuXG4gICAgLy8gV2UgYnVpbGQgcmVhbE1ldGhvZCgpIHJlcGxhY2VtZW50cyBoZXJlIHRoYXQgcmVnZW5lcmF0ZSBsb2dnaW5nIG1ldGhvZHNcbiAgICBmdW5jdGlvbiBlbmFibGVMb2dnaW5nV2hlbkNvbnNvbGVBcnJpdmVzKG1ldGhvZE5hbWUsIGxldmVsLCBsb2dnZXJOYW1lKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09IHVuZGVmaW5lZFR5cGUpIHtcbiAgICAgICAgICAgICAgICByZXBsYWNlTG9nZ2luZ01ldGhvZHMuY2FsbCh0aGlzLCBsZXZlbCwgbG9nZ2VyTmFtZSk7XG4gICAgICAgICAgICAgICAgdGhpc1ttZXRob2ROYW1lXS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIEJ5IGRlZmF1bHQsIHdlIHVzZSBjbG9zZWx5IGJvdW5kIHJlYWwgbWV0aG9kcyB3aGVyZXZlciBwb3NzaWJsZSwgYW5kXG4gICAgLy8gb3RoZXJ3aXNlIHdlIHdhaXQgZm9yIGEgY29uc29sZSB0byBhcHBlYXIsIGFuZCB0aGVuIHRyeSBhZ2Fpbi5cbiAgICBmdW5jdGlvbiBkZWZhdWx0TWV0aG9kRmFjdG9yeShtZXRob2ROYW1lLCBsZXZlbCwgbG9nZ2VyTmFtZSkge1xuICAgICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgICByZXR1cm4gcmVhbE1ldGhvZChtZXRob2ROYW1lKSB8fFxuICAgICAgICAgICAgICAgZW5hYmxlTG9nZ2luZ1doZW5Db25zb2xlQXJyaXZlcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIExvZ2dlcihuYW1lLCBkZWZhdWx0TGV2ZWwsIGZhY3RvcnkpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBjdXJyZW50TGV2ZWw7XG4gICAgICBkZWZhdWx0TGV2ZWwgPSBkZWZhdWx0TGV2ZWwgPT0gbnVsbCA/IFwiV0FSTlwiIDogZGVmYXVsdExldmVsO1xuXG4gICAgICB2YXIgc3RvcmFnZUtleSA9IFwibG9nbGV2ZWxcIjtcbiAgICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICBzdG9yYWdlS2V5ICs9IFwiOlwiICsgbmFtZTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG5hbWUgPT09IFwic3ltYm9sXCIpIHtcbiAgICAgICAgc3RvcmFnZUtleSA9IHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gcGVyc2lzdExldmVsSWZQb3NzaWJsZShsZXZlbE51bSkge1xuICAgICAgICAgIHZhciBsZXZlbE5hbWUgPSAobG9nTWV0aG9kc1tsZXZlbE51bV0gfHwgJ3NpbGVudCcpLnRvVXBwZXJDYXNlKCk7XG5cbiAgICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gdW5kZWZpbmVkVHlwZSB8fCAhc3RvcmFnZUtleSkgcmV0dXJuO1xuXG4gICAgICAgICAgLy8gVXNlIGxvY2FsU3RvcmFnZSBpZiBhdmFpbGFibGVcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlW3N0b3JhZ2VLZXldID0gbGV2ZWxOYW1lO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfSBjYXRjaCAoaWdub3JlKSB7fVxuXG4gICAgICAgICAgLy8gVXNlIHNlc3Npb24gY29va2llIGFzIGZhbGxiYWNrXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgd2luZG93LmRvY3VtZW50LmNvb2tpZSA9XG4gICAgICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHN0b3JhZ2VLZXkpICsgXCI9XCIgKyBsZXZlbE5hbWUgKyBcIjtcIjtcbiAgICAgICAgICB9IGNhdGNoIChpZ25vcmUpIHt9XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGdldFBlcnNpc3RlZExldmVsKCkge1xuICAgICAgICAgIHZhciBzdG9yZWRMZXZlbDtcblxuICAgICAgICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSB1bmRlZmluZWRUeXBlIHx8ICFzdG9yYWdlS2V5KSByZXR1cm47XG5cbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBzdG9yZWRMZXZlbCA9IHdpbmRvdy5sb2NhbFN0b3JhZ2Vbc3RvcmFnZUtleV07XG4gICAgICAgICAgfSBjYXRjaCAoaWdub3JlKSB7fVxuXG4gICAgICAgICAgLy8gRmFsbGJhY2sgdG8gY29va2llcyBpZiBsb2NhbCBzdG9yYWdlIGdpdmVzIHVzIG5vdGhpbmdcbiAgICAgICAgICBpZiAodHlwZW9mIHN0b3JlZExldmVsID09PSB1bmRlZmluZWRUeXBlKSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICB2YXIgY29va2llID0gd2luZG93LmRvY3VtZW50LmNvb2tpZTtcbiAgICAgICAgICAgICAgICAgIHZhciBsb2NhdGlvbiA9IGNvb2tpZS5pbmRleE9mKFxuICAgICAgICAgICAgICAgICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChzdG9yYWdlS2V5KSArIFwiPVwiKTtcbiAgICAgICAgICAgICAgICAgIGlmIChsb2NhdGlvbiAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICBzdG9yZWRMZXZlbCA9IC9eKFteO10rKS8uZXhlYyhjb29raWUuc2xpY2UobG9jYXRpb24pKVsxXTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBjYXRjaCAoaWdub3JlKSB7fVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIElmIHRoZSBzdG9yZWQgbGV2ZWwgaXMgbm90IHZhbGlkLCB0cmVhdCBpdCBhcyBpZiBub3RoaW5nIHdhcyBzdG9yZWQuXG4gICAgICAgICAgaWYgKHNlbGYubGV2ZWxzW3N0b3JlZExldmVsXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIHN0b3JlZExldmVsID0gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBzdG9yZWRMZXZlbDtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gY2xlYXJQZXJzaXN0ZWRMZXZlbCgpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gdW5kZWZpbmVkVHlwZSB8fCAhc3RvcmFnZUtleSkgcmV0dXJuO1xuXG4gICAgICAgICAgLy8gVXNlIGxvY2FsU3RvcmFnZSBpZiBhdmFpbGFibGVcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oc3RvcmFnZUtleSk7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9IGNhdGNoIChpZ25vcmUpIHt9XG5cbiAgICAgICAgICAvLyBVc2Ugc2Vzc2lvbiBjb29raWUgYXMgZmFsbGJhY2tcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICB3aW5kb3cuZG9jdW1lbnQuY29va2llID1cbiAgICAgICAgICAgICAgICBlbmNvZGVVUklDb21wb25lbnQoc3RvcmFnZUtleSkgKyBcIj07IGV4cGlyZXM9VGh1LCAwMSBKYW4gMTk3MCAwMDowMDowMCBVVENcIjtcbiAgICAgICAgICB9IGNhdGNoIChpZ25vcmUpIHt9XG4gICAgICB9XG5cbiAgICAgIC8qXG4gICAgICAgKlxuICAgICAgICogUHVibGljIGxvZ2dlciBBUEkgLSBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3BpbXRlcnJ5L2xvZ2xldmVsIGZvciBkZXRhaWxzXG4gICAgICAgKlxuICAgICAgICovXG5cbiAgICAgIHNlbGYubmFtZSA9IG5hbWU7XG5cbiAgICAgIHNlbGYubGV2ZWxzID0geyBcIlRSQUNFXCI6IDAsIFwiREVCVUdcIjogMSwgXCJJTkZPXCI6IDIsIFwiV0FSTlwiOiAzLFxuICAgICAgICAgIFwiRVJST1JcIjogNCwgXCJTSUxFTlRcIjogNX07XG5cbiAgICAgIHNlbGYubWV0aG9kRmFjdG9yeSA9IGZhY3RvcnkgfHwgZGVmYXVsdE1ldGhvZEZhY3Rvcnk7XG5cbiAgICAgIHNlbGYuZ2V0TGV2ZWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIGN1cnJlbnRMZXZlbDtcbiAgICAgIH07XG5cbiAgICAgIHNlbGYuc2V0TGV2ZWwgPSBmdW5jdGlvbiAobGV2ZWwsIHBlcnNpc3QpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGxldmVsID09PSBcInN0cmluZ1wiICYmIHNlbGYubGV2ZWxzW2xldmVsLnRvVXBwZXJDYXNlKCldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgbGV2ZWwgPSBzZWxmLmxldmVsc1tsZXZlbC50b1VwcGVyQ2FzZSgpXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiBsZXZlbCA9PT0gXCJudW1iZXJcIiAmJiBsZXZlbCA+PSAwICYmIGxldmVsIDw9IHNlbGYubGV2ZWxzLlNJTEVOVCkge1xuICAgICAgICAgICAgICBjdXJyZW50TGV2ZWwgPSBsZXZlbDtcbiAgICAgICAgICAgICAgaWYgKHBlcnNpc3QgIT09IGZhbHNlKSB7ICAvLyBkZWZhdWx0cyB0byB0cnVlXG4gICAgICAgICAgICAgICAgICBwZXJzaXN0TGV2ZWxJZlBvc3NpYmxlKGxldmVsKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXBsYWNlTG9nZ2luZ01ldGhvZHMuY2FsbChzZWxmLCBsZXZlbCwgbmFtZSk7XG4gICAgICAgICAgICAgIGlmICh0eXBlb2YgY29uc29sZSA9PT0gdW5kZWZpbmVkVHlwZSAmJiBsZXZlbCA8IHNlbGYubGV2ZWxzLlNJTEVOVCkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiTm8gY29uc29sZSBhdmFpbGFibGUgZm9yIGxvZ2dpbmdcIjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93IFwibG9nLnNldExldmVsKCkgY2FsbGVkIHdpdGggaW52YWxpZCBsZXZlbDogXCIgKyBsZXZlbDtcbiAgICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBzZWxmLnNldERlZmF1bHRMZXZlbCA9IGZ1bmN0aW9uIChsZXZlbCkge1xuICAgICAgICAgIGRlZmF1bHRMZXZlbCA9IGxldmVsO1xuICAgICAgICAgIGlmICghZ2V0UGVyc2lzdGVkTGV2ZWwoKSkge1xuICAgICAgICAgICAgICBzZWxmLnNldExldmVsKGxldmVsLCBmYWxzZSk7XG4gICAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgc2VsZi5yZXNldExldmVsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHNlbGYuc2V0TGV2ZWwoZGVmYXVsdExldmVsLCBmYWxzZSk7XG4gICAgICAgICAgY2xlYXJQZXJzaXN0ZWRMZXZlbCgpO1xuICAgICAgfTtcblxuICAgICAgc2VsZi5lbmFibGVBbGwgPSBmdW5jdGlvbihwZXJzaXN0KSB7XG4gICAgICAgICAgc2VsZi5zZXRMZXZlbChzZWxmLmxldmVscy5UUkFDRSwgcGVyc2lzdCk7XG4gICAgICB9O1xuXG4gICAgICBzZWxmLmRpc2FibGVBbGwgPSBmdW5jdGlvbihwZXJzaXN0KSB7XG4gICAgICAgICAgc2VsZi5zZXRMZXZlbChzZWxmLmxldmVscy5TSUxFTlQsIHBlcnNpc3QpO1xuICAgICAgfTtcblxuICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIHRoZSByaWdodCBsZXZlbFxuICAgICAgdmFyIGluaXRpYWxMZXZlbCA9IGdldFBlcnNpc3RlZExldmVsKCk7XG4gICAgICBpZiAoaW5pdGlhbExldmVsID09IG51bGwpIHtcbiAgICAgICAgICBpbml0aWFsTGV2ZWwgPSBkZWZhdWx0TGV2ZWw7XG4gICAgICB9XG4gICAgICBzZWxmLnNldExldmVsKGluaXRpYWxMZXZlbCwgZmFsc2UpO1xuICAgIH1cblxuICAgIC8qXG4gICAgICpcbiAgICAgKiBUb3AtbGV2ZWwgQVBJXG4gICAgICpcbiAgICAgKi9cblxuICAgIHZhciBkZWZhdWx0TG9nZ2VyID0gbmV3IExvZ2dlcigpO1xuXG4gICAgdmFyIF9sb2dnZXJzQnlOYW1lID0ge307XG4gICAgZGVmYXVsdExvZ2dlci5nZXRMb2dnZXIgPSBmdW5jdGlvbiBnZXRMb2dnZXIobmFtZSkge1xuICAgICAgICBpZiAoKHR5cGVvZiBuYW1lICE9PSBcInN5bWJvbFwiICYmIHR5cGVvZiBuYW1lICE9PSBcInN0cmluZ1wiKSB8fCBuYW1lID09PSBcIlwiKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIllvdSBtdXN0IHN1cHBseSBhIG5hbWUgd2hlbiBjcmVhdGluZyBhIGxvZ2dlci5cIik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbG9nZ2VyID0gX2xvZ2dlcnNCeU5hbWVbbmFtZV07XG4gICAgICAgIGlmICghbG9nZ2VyKSB7XG4gICAgICAgICAgbG9nZ2VyID0gX2xvZ2dlcnNCeU5hbWVbbmFtZV0gPSBuZXcgTG9nZ2VyKFxuICAgICAgICAgICAgbmFtZSwgZGVmYXVsdExvZ2dlci5nZXRMZXZlbCgpLCBkZWZhdWx0TG9nZ2VyLm1ldGhvZEZhY3RvcnkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsb2dnZXI7XG4gICAgfTtcblxuICAgIC8vIEdyYWIgdGhlIGN1cnJlbnQgZ2xvYmFsIGxvZyB2YXJpYWJsZSBpbiBjYXNlIG9mIG92ZXJ3cml0ZVxuICAgIHZhciBfbG9nID0gKHR5cGVvZiB3aW5kb3cgIT09IHVuZGVmaW5lZFR5cGUpID8gd2luZG93LmxvZyA6IHVuZGVmaW5lZDtcbiAgICBkZWZhdWx0TG9nZ2VyLm5vQ29uZmxpY3QgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09IHVuZGVmaW5lZFR5cGUgJiZcbiAgICAgICAgICAgICAgIHdpbmRvdy5sb2cgPT09IGRlZmF1bHRMb2dnZXIpIHtcbiAgICAgICAgICAgIHdpbmRvdy5sb2cgPSBfbG9nO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGRlZmF1bHRMb2dnZXI7XG4gICAgfTtcblxuICAgIGRlZmF1bHRMb2dnZXIuZ2V0TG9nZ2VycyA9IGZ1bmN0aW9uIGdldExvZ2dlcnMoKSB7XG4gICAgICAgIHJldHVybiBfbG9nZ2Vyc0J5TmFtZTtcbiAgICB9O1xuXG4gICAgLy8gRVM2IGRlZmF1bHQgZXhwb3J0LCBmb3IgY29tcGF0aWJpbGl0eVxuICAgIGRlZmF1bHRMb2dnZXJbJ2RlZmF1bHQnXSA9IGRlZmF1bHRMb2dnZXI7XG5cbiAgICByZXR1cm4gZGVmYXVsdExvZ2dlcjtcbn0pKTtcbiJdfQ==
