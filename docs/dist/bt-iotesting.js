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
    async reset(onDisconnectEvent = null) {
        if (this.charRead != null) {
            try {
                if (this.btDevice?.gatt?.connected) {
                    await this.charRead.stopNotifications();
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
        const cmd = new Command(ctype);
        return cmd;
    }
    static CreateOneSP(ctype, setpoint) {
        const cmd = new Command(ctype);
        cmd.setpoint = setpoint;
        return cmd;
    }
    static CreateFourSP(ctype, set1, set2, set3, set4) {
        const cmd = new Command(ctype);
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
        let buf;
        let dv;
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
                dv.setUint16(4, this.setpoint4, true);
                return buf;
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
            case constants_1.CommandType.COMMAND_SET_INITIAL_WIFI:
                // One Uint8 parameter with 1 or 0 value
                buf = new ArrayBuffer(2);
                dv = new DataView(buf);
                dv.setUint8(0, this.type);
                dv.setUint8(1, this.setpoint ? 1 : 0);
                return buf;
            case constants_1.CommandType.COMMAND_MODE_RESISTORS:
            case constants_1.CommandType.COMMAND_MODE_V_LOAD:
            case constants_1.CommandType.COMMAND_SET_DEEPSLEEP_MIN:
                // One Uint16 R parameter
                buf = new ArrayBuffer(3);
                dv = new DataView(buf);
                dv.setUint8(0, this.type);
                dv.setUint16(1, this.setpoint, true);
                return buf;
            case constants_1.CommandType.COMMAND_SET_BLUETOOTH_NAME:
            case constants_1.CommandType.COMMAND_SET_WIFI_NETWORK:
            case constants_1.CommandType.COMMAND_SET_WIFI_PASSWORD:
                // One UTF8 string parameter
                const utf8Encode = new TextEncoder();
                const bytes_utf8 = utf8Encode.encode(this.setpoint);
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
const Command_1 = require("./Command");
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
            void (0, utils_1.sleep)(DELAY_MS).then(async () => { await this.stateMachine(); }); // Recheck status in DELAY_MS ms
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
            let packet, response;
            if (command == null) {
                return;
            }
            this.btState.state = constants_1.State.BUSY;
            this.btState.stats.commands++;
            log.info('\t\tExecuting command :' + command);
            const packet_clear = Command_1.Command.CreateNoSP(constants_1.CommandType.COMMAND_CLEAR_FLAGS);
            packet = command.getPacket();
            const packets = [packet_clear, packet];
            for (const msg of packets) {
                const currentCpt = this.btState.lastMeasure != null ? this.btState.lastMeasure.CommandCpt : -1;
                do {
                    response = await this.SendAndResponse(packet);
                } while (currentCpt != this.btState.lastMeasure?.CommandCpt);
            }
            // Caller expects a valid property in GetState() once command is executed.
            log.debug('\t\tRefreshing current state');
            await this.refresh();
            command.error = this.btState.lastMeasure?.Error;
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
        await this.btState.reset(this.onDisconnected.bind(this));
        this.btState.state = constants_1.State.STOPPED;
    }
    /**
       * Event called by browser BT api when the device disconnect
       * */
    async onDisconnected() {
        log.warn('* GATT Server disconnected event, will try to reconnect *');
        await this.btState.reset();
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
            await this.btState.reset(this.onDisconnected.bind(this));
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
            await this.btState.reset();
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
            const gattserver = null;
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
                await this.btState.reset(this.onDisconnected.bind(this));
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
            await this.btState.charRead.startNotifications();
            log.info('> Bluetooth interfaces ready.');
            this.btState.stats.last_connect = new Date().toISOString();
            await (0, utils_1.sleep)(50);
            this.btState.state = constants_1.State.METER_INIT;
        }
        catch (err) {
            log.warn('** error while subscribing: ' + err.message);
            await this.btState.reset();
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
            await this.btState.reset(this.onDisconnected.bind(this));
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
            if (this.btState.lastMeasure != null) {
                this.btState.meter.actual = this.btState.lastMeasure.Actual_R;
                this.btState.meter.setpoint = this.btState.lastMeasure.Setpoint_R;
                this.btState.meter.battery = await this.iot.getBatteryLevel();
                this.btState.meter.mode = (this.btState.lastMeasure.Relay == 1 ? 1 : (this.btState.lastMeasure.V_with_load ? 3 : 2));
                this.btState.meter.free_bytes = this.btState.lastMeasure.Memfree;
            }
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

},{"./APIState":1,"./Command":2,"./IOTestingBoard":5,"./NotificationData":7,"./constants":8,"./utils":11,"loglevel":12}],5:[function(require,module,exports){
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
        /* const dv: DataView = await this.btState.charSerial.readValue()
        return this.uintToString(dv) */
        return '???';
    }
    /**
       * Gets the battery level indication
       * @returns {number} percentage (%)
       */
    async getBatteryLevel() {
        log.debug('\t\tReading battery voltage');
        /* const dv: DataView = await this.btState.charBattery.readValue()
        return dv.getUint8(0) */
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
        this.Error = false;
        this.CommandCpt = 0;
        this.Timestamp = new Date();
    }
    static parse(buf) {
        const output = new NotificationData();
        const dv = new DataView(buf);
        const status1 = dv.getUint8(1);
        const status2 = dv.getUint8(0);
        output.WiFi = (status1 >> 6) & 3;
        output.Relay = (status1 >> 4) & 3;
        output.Bluetooth = (status1 >> 1) & 7;
        output.Error = (status2 & 64) != 0;
        output.Frequency = (status2 >> 5) & 3;
        output.Verbose = (status2 & 8) != 0;
        output.Test = (status2 & 4) != 0;
        output.V_with_load = (status2 & 2) != 0;
        output.LastResult = (status2 & 1) != 0;
        output.Actual_R = dv.getUint16(2, true);
        output.Setpoint_R = dv.getUint16(4, true);
        output.Memfree = dv.getUint32(6, true);
        output.CommandCpt = dv.getUint8(10);
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
    COMMAND_REFRESH: 0x22,
    COMMAND_CLEAR_FLAGS: 0x23
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
Object.defineProperty(exports, "BlueToothIOTUUID", { enumerable: true, get: function () { return constants_1.BlueToothIOTUUID; } });
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
    // Recreate the object as it may have lost methods due to JSON
    command = Command_1.Command.CreateFourSP(command.type, command.setpoint, command.setpoint2, command.setpoint3, command.setpoint4);
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
    exports.driver.btState.command = command;
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
    cr.unit = 'Ohms';
    cr.secondary_value = exports.driver.btState.lastMeasure.Actual_R;
    cr.secondary_unit = 'Ohms';
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
    command = Command_1.Command.CreateFourSP(command.type, command.setpoint, command.setpoint2, command.setpoint3, command.setpoint4);
    command.pending = true;
    let cpt = 0;
    while (exports.driver.btState.command != null && exports.driver.btState.command.pending && cpt < 300) {
        loglevel_1.default.debug('Waiting for current command to complete...');
        await (0, utils_1.sleep)(100);
        cpt++;
    }
    loglevel_1.default.info('Setting new command :' + command);
    exports.driver.btState.command = command;
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
        await exports.driver.stateMachine(); // Start it
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9BUElTdGF0ZS5qcyIsImpzL0NvbW1hbmQuanMiLCJqcy9Db21tYW5kUmVzdWx0LmpzIiwianMvRHJpdmVyLmpzIiwianMvSU9UZXN0aW5nQm9hcmQuanMiLCJqcy9NZXRlclN0YXRlLmpzIiwianMvTm90aWZpY2F0aW9uRGF0YS5qcyIsImpzL2NvbnN0YW50cy5qcyIsImpzL21ldGVyQXBpLmpzIiwianMvbWV0ZXJQdWJsaWNBUEkuanMiLCJqcy91dGlscy5qcyIsIm5vZGVfbW9kdWxlcy9sb2dsZXZlbC9saWIvbG9nbGV2ZWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLkJUQXBpU3RhdGUgPSB2b2lkIDA7XHJcbmNvbnN0IE1ldGVyU3RhdGVfMSA9IHJlcXVpcmUoXCIuL01ldGVyU3RhdGVcIik7XHJcbmNvbnN0IGNvbnN0YW50c18xID0gcmVxdWlyZShcIi4vY29uc3RhbnRzXCIpO1xyXG5jb25zdCBOb3RpZmljYXRpb25EYXRhXzEgPSByZXF1aXJlKFwiLi9Ob3RpZmljYXRpb25EYXRhXCIpO1xyXG5jb25zdCBsb2cgPSByZXF1aXJlKFwibG9nbGV2ZWxcIik7XHJcbi8vIEN1cnJlbnQgc3RhdGUgb2YgdGhlIGJsdWV0b290aFxyXG5jbGFzcyBCVEFwaVN0YXRlIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5OT1RfQ09OTkVDVEVEO1xyXG4gICAgICAgIHRoaXMucHJldl9zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLk5PVF9DT05ORUNURUQ7XHJcbiAgICAgICAgdGhpcy5zdGF0ZV9jcHQgPSAwO1xyXG4gICAgICAgIHRoaXMuc3RhcnRlZCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuc3RvcFJlcXVlc3QgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmxhc3RNZWFzdXJlID0gbmV3IE5vdGlmaWNhdGlvbkRhdGFfMS5Ob3RpZmljYXRpb25EYXRhKCk7XHJcbiAgICAgICAgdGhpcy5tZXRlciA9IG5ldyBNZXRlclN0YXRlXzEuTWV0ZXJTdGF0ZSgpO1xyXG4gICAgICAgIHRoaXMuY29tbWFuZCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5yZXNwb25zZSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5idERldmljZSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5idEdBVFRTZXJ2ZXIgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuYnRJT1RTZXJ2aWNlID0gbnVsbDtcclxuICAgICAgICB0aGlzLmNoYXJSZWFkID0gbnVsbDtcclxuICAgICAgICB0aGlzLmNoYXJXcml0ZSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5jaGFyU2VyaWFsID0gbnVsbDtcclxuICAgICAgICB0aGlzLmNoYXJGaXJtd2FyZSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5jaGFyQmF0dGVyeSA9IG51bGw7XHJcbiAgICAgICAgLy8gZ2VuZXJhbCBzdGF0aXN0aWNzIGZvciBkZWJ1Z2dpbmdcclxuICAgICAgICB0aGlzLnN0YXRzID0ge1xyXG4gICAgICAgICAgICByZXF1ZXN0czogMCxcclxuICAgICAgICAgICAgcmVzcG9uc2VzOiAwLFxyXG4gICAgICAgICAgICBtb2RidXNfZXJyb3JzOiAwLFxyXG4gICAgICAgICAgICAnR0FUVCBkaXNjb25uZWN0cyc6IDAsXHJcbiAgICAgICAgICAgIGV4Y2VwdGlvbnM6IDAsXHJcbiAgICAgICAgICAgIHN1YmNyaWJlczogMCxcclxuICAgICAgICAgICAgY29tbWFuZHM6IDAsXHJcbiAgICAgICAgICAgIHJlc3BvbnNlVGltZTogMC4wLFxyXG4gICAgICAgICAgICBsYXN0UmVzcG9uc2VUaW1lOiAnPyBtcycsXHJcbiAgICAgICAgICAgIGxhc3RfY29ubmVjdDogbmV3IERhdGUoMjAyMCwgMSwgMSkudG9JU09TdHJpbmcoKVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5vcHRpb25zID0ge1xyXG4gICAgICAgICAgICBmb3JjZURldmljZVNlbGVjdGlvbjogdHJ1ZVxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbiAgICBhc3luYyByZXNldChvbkRpc2Nvbm5lY3RFdmVudCA9IG51bGwpIHtcclxuICAgICAgICBpZiAodGhpcy5jaGFyUmVhZCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5idERldmljZT8uZ2F0dD8uY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5jaGFyUmVhZC5zdG9wTm90aWZpY2F0aW9ucygpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhdGNoIChlcnJvcikgeyB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLmJ0RGV2aWNlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmJ0RGV2aWNlPy5nYXR0Py5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBsb2cud2FybignKiBDYWxsaW5nIGRpc2Nvbm5lY3Qgb24gYnRkZXZpY2UnKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBBdm9pZCB0aGUgZXZlbnQgZmlyaW5nIHdoaWNoIG1heSBsZWFkIHRvIGF1dG8tcmVjb25uZWN0XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idERldmljZS5yZW1vdmVFdmVudExpc3RlbmVyKCdnYXR0c2VydmVyZGlzY29ubmVjdGVkJywgb25EaXNjb25uZWN0RXZlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnREZXZpY2UuZ2F0dC5kaXNjb25uZWN0KCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2F0Y2ggKGVycm9yKSB7IH1cclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5idEdBVFRTZXJ2ZXIgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuY2hhckJhdHRlcnkgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuY2hhckZpcm13YXJlID0gbnVsbDtcclxuICAgICAgICB0aGlzLmNoYXJSZWFkID0gbnVsbDtcclxuICAgICAgICB0aGlzLmNoYXJTZXJpYWwgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuY2hhcldyaXRlID0gbnVsbDtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLkJUQXBpU3RhdGUgPSBCVEFwaVN0YXRlO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1BUElTdGF0ZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLkNvbW1hbmQgPSB2b2lkIDA7XHJcbmNvbnN0IGNvbnN0YW50c18xID0gcmVxdWlyZShcIi4vY29uc3RhbnRzXCIpO1xyXG4vKipcclxuICogQ29tbWFuZCB0byB0aGUgbWV0ZXIsIG1heSBpbmNsdWRlIHNldHBvaW50XHJcbiAqICovXHJcbmNsYXNzIENvbW1hbmQge1xyXG4gICAgLyoqXHJcbiAgICAgICAqIENyZWF0ZXMgYSBuZXcgY29tbWFuZFxyXG4gICAgICAgKiBAcGFyYW0ge0NvbW1hbmRUeXBlfSBjdHlwZVxyXG4gICAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKGN0eXBlKSB7XHJcbiAgICAgICAgdGhpcy50eXBlID0gcGFyc2VJbnQoY3R5cGUpO1xyXG4gICAgICAgIHRoaXMuc2V0cG9pbnQgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuc2V0cG9pbnQgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuc2V0cG9pbnQzID0gbnVsbDtcclxuICAgICAgICB0aGlzLnNldHBvaW50NCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5lcnJvciA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMucGVuZGluZyA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5yZXF1ZXN0ID0gbnVsbDtcclxuICAgICAgICB0aGlzLnJlc3BvbnNlID0gbnVsbDtcclxuICAgIH1cclxuICAgIHN0YXRpYyBDcmVhdGVOb1NQKGN0eXBlKSB7XHJcbiAgICAgICAgY29uc3QgY21kID0gbmV3IENvbW1hbmQoY3R5cGUpO1xyXG4gICAgICAgIHJldHVybiBjbWQ7XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgQ3JlYXRlT25lU1AoY3R5cGUsIHNldHBvaW50KSB7XHJcbiAgICAgICAgY29uc3QgY21kID0gbmV3IENvbW1hbmQoY3R5cGUpO1xyXG4gICAgICAgIGNtZC5zZXRwb2ludCA9IHNldHBvaW50O1xyXG4gICAgICAgIHJldHVybiBjbWQ7XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgQ3JlYXRlRm91clNQKGN0eXBlLCBzZXQxLCBzZXQyLCBzZXQzLCBzZXQ0KSB7XHJcbiAgICAgICAgY29uc3QgY21kID0gbmV3IENvbW1hbmQoY3R5cGUpO1xyXG4gICAgICAgIGNtZC5zZXRwb2ludCA9IHNldDE7XHJcbiAgICAgICAgY21kLnNldHBvaW50MiA9IHNldDI7XHJcbiAgICAgICAgY21kLnNldHBvaW50MyA9IHNldDM7XHJcbiAgICAgICAgY21kLnNldHBvaW50NCA9IHNldDQ7XHJcbiAgICAgICAgcmV0dXJuIGNtZDtcclxuICAgIH1cclxuICAgIHRvU3RyaW5nKCkge1xyXG4gICAgICAgIHJldHVybiAnVHlwZTogJyArIHRoaXMudHlwZSArICcsIHNldHBvaW50OicgKyB0aGlzLnNldHBvaW50ICsgJywgc2V0cG9pbnQyOiAnICsgdGhpcy5zZXRwb2ludDIgKyAnLCBwZW5kaW5nOicgKyB0aGlzLnBlbmRpbmcgKyAnLCBlcnJvcjonICsgdGhpcy5lcnJvcjtcclxuICAgIH1cclxuICAgIGdldFBhY2tldCgpIHtcclxuICAgICAgICBsZXQgYnVmO1xyXG4gICAgICAgIGxldCBkdjtcclxuICAgICAgICBzd2l0Y2ggKHRoaXMudHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfQlJFQUs6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9ESVNBQkxFX1dFQlJFUEw6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9ESVNBQkxFX1dJRkk6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9FTkFCTEVfV0VCUkVQTDpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0VOQUJMRV9XSUZJOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfTElHSFRfU0xFRVA6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9NT0RFX01FVEVSOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfUkVCT09UOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfUkVGUkVTSDpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1JVTl9URVNUOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfUl9URVNUOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfREVFUF9TTEVFUDpcclxuICAgICAgICAgICAgICAgIC8vIE5vIHBhcmFtZXRlclxyXG4gICAgICAgICAgICAgICAgYnVmID0gbmV3IEFycmF5QnVmZmVyKDEpO1xyXG4gICAgICAgICAgICAgICAgZHYgPSBuZXcgRGF0YVZpZXcoYnVmKTtcclxuICAgICAgICAgICAgICAgIGR2LnNldFVpbnQ4KDAsIHRoaXMudHlwZSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYnVmO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfQ09ORklHVVJFX01FVEVSX0NPTU06XHJcbiAgICAgICAgICAgICAgICBidWYgPSBuZXcgQXJyYXlCdWZmZXIoMSArIDUpO1xyXG4gICAgICAgICAgICAgICAgZHYgPSBuZXcgRGF0YVZpZXcoYnVmKTtcclxuICAgICAgICAgICAgICAgIGR2LnNldFVpbnQ4KDAsIHRoaXMudHlwZSk7XHJcbiAgICAgICAgICAgICAgICBkdi5zZXRVaW50OCgxLCB0aGlzLnNldHBvaW50KTtcclxuICAgICAgICAgICAgICAgIGR2LnNldFVpbnQ4KDIsIHRoaXMuc2V0cG9pbnQyKTtcclxuICAgICAgICAgICAgICAgIGR2LnNldFVpbnQ4KDMsIHRoaXMuc2V0cG9pbnQzKTtcclxuICAgICAgICAgICAgICAgIGR2LnNldFVpbnQxNig0LCB0aGlzLnNldHBvaW50NCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYnVmO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0NQVTpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9JTklUSUFMX0NPTU1BTkRfU0VUUE9JTlQ6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfSU5JVElBTF9DT01NQU5EX1RZUEU6XHJcbiAgICAgICAgICAgICAgICAvLyBPbmUgVWludDggcGFyYW1ldGVyXHJcbiAgICAgICAgICAgICAgICBidWYgPSBuZXcgQXJyYXlCdWZmZXIoMik7XHJcbiAgICAgICAgICAgICAgICBkdiA9IG5ldyBEYXRhVmlldyhidWYpO1xyXG4gICAgICAgICAgICAgICAgZHYuc2V0VWludDgoMCwgdGhpcy50eXBlKTtcclxuICAgICAgICAgICAgICAgIGR2LnNldFVpbnQ4KDEsIHRoaXMuc2V0cG9pbnQpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ1ZjtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX01FVEVSX0NPTU1BTkRTOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0lOSVRJQUxfQkxVRVRPT1RIOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0lOSVRJQUxfTUVURVJfQ09NTTpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9PVEE6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfVkVSQk9TRTpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9JTklUSUFMX1dJRkk6XHJcbiAgICAgICAgICAgICAgICAvLyBPbmUgVWludDggcGFyYW1ldGVyIHdpdGggMSBvciAwIHZhbHVlXHJcbiAgICAgICAgICAgICAgICBidWYgPSBuZXcgQXJyYXlCdWZmZXIoMik7XHJcbiAgICAgICAgICAgICAgICBkdiA9IG5ldyBEYXRhVmlldyhidWYpO1xyXG4gICAgICAgICAgICAgICAgZHYuc2V0VWludDgoMCwgdGhpcy50eXBlKTtcclxuICAgICAgICAgICAgICAgIGR2LnNldFVpbnQ4KDEsIHRoaXMuc2V0cG9pbnQgPyAxIDogMCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYnVmO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfTU9ERV9SRVNJU1RPUlM6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9NT0RFX1ZfTE9BRDpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9ERUVQU0xFRVBfTUlOOlxyXG4gICAgICAgICAgICAgICAgLy8gT25lIFVpbnQxNiBSIHBhcmFtZXRlclxyXG4gICAgICAgICAgICAgICAgYnVmID0gbmV3IEFycmF5QnVmZmVyKDMpO1xyXG4gICAgICAgICAgICAgICAgZHYgPSBuZXcgRGF0YVZpZXcoYnVmKTtcclxuICAgICAgICAgICAgICAgIGR2LnNldFVpbnQ4KDAsIHRoaXMudHlwZSk7XHJcbiAgICAgICAgICAgICAgICBkdi5zZXRVaW50MTYoMSwgdGhpcy5zZXRwb2ludCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYnVmO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0JMVUVUT09USF9OQU1FOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX1dJRklfTkVUV09SSzpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9XSUZJX1BBU1NXT1JEOlxyXG4gICAgICAgICAgICAgICAgLy8gT25lIFVURjggc3RyaW5nIHBhcmFtZXRlclxyXG4gICAgICAgICAgICAgICAgY29uc3QgdXRmOEVuY29kZSA9IG5ldyBUZXh0RW5jb2RlcigpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYnl0ZXNfdXRmOCA9IHV0ZjhFbmNvZGUuZW5jb2RlKHRoaXMuc2V0cG9pbnQpO1xyXG4gICAgICAgICAgICAgICAgYnVmID0gbmV3IEFycmF5QnVmZmVyKDEgKyBieXRlc191dGY4Lmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICBkdiA9IG5ldyBEYXRhVmlldyhidWYpO1xyXG4gICAgICAgICAgICAgICAgZHYuc2V0VWludDgoMCwgdGhpcy50eXBlKTtcclxuICAgICAgICAgICAgICAgIHZhciBieXRlX251bSA9IDE7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGJ5dGVfdiBvZiBieXRlc191dGY4KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZHYuc2V0VWludDgoYnl0ZV9udW0sIGJ5dGVfdik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnl0ZV9udW0rKztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBidWY7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29tbWFuZCcgKyB0aGlzKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAgICogR2V0cyB0aGUgZGVmYXVsdCBzZXRwb2ludCBmb3IgdGhpcyBjb21tYW5kIHR5cGVcclxuICAgICAgICogQHJldHVybnMge09iamVjdH0gc2V0cG9pbnQocykgZXhwZWN0ZWRcclxuICAgICAgICovXHJcbiAgICBkZWZhdWx0U2V0cG9pbnQoKSB7XHJcbiAgICAgICAgc3dpdGNoICh0aGlzLnR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0VOQUJMRV9XSUZJOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfRElTQUJMRV9XSUZJOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfRU5BQkxFX1dFQlJFUEw6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9ESVNBQkxFX1dFQlJFUEw6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9CUkVBSzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX01PREVfTUVURVI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9NT0RFX1JFU0lTVE9SUzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7ICdSZXNpc3RhbmNlIChvaG1zKSc6IDB4RkZGRiB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfTU9ERV9WX0xPQUQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyAnTG9hZCAob2htcyknOiA1NTAgfTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1JFQk9PVDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1JVTl9URVNUOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfTElHSFRfU0xFRVA6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9ERUVQX1NMRUVQOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfTUVURVJfQ09NTUFORFM6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBFbmFibGU6IHRydWUgfTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9JTklUSUFMX01FVEVSX0NPTU06XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBFbmFibGU6IHRydWUgfTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9XSUZJX05FVFdPUks6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBTU0lEOiAnJyB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX1dJRklfUEFTU1dPUkQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBQYXNzd29yZDogJycgfTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9JTklUSUFMX0JMVUVUT09USDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IEVuYWJsZTogdHJ1ZSB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0lOSVRJQUxfV0lGSTpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IEVuYWJsZTogdHJ1ZSB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0RFRVBTTEVFUF9NSU46XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyAnRGVsYXkgKG1pbiknOiAxNSB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX1ZFUkJPU0U6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBFbmFibGU6IHRydWUgfTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9JTklUSUFMX0NPTU1BTkRfVFlQRTpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7ICdDb21tYW5kIHR5cGUoMS8yLzMpJzogMSB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0lOSVRJQUxfQ09NTUFORF9TRVRQT0lOVDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7ICdTZXRwb2ludCAob2htcyknOiAweEZGRkYgfTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1JfVEVTVDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9DUFU6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyAnRnJlcXVlbmN5IChNSHo6IDEtPjgwLCAyLT4xNjAsIDMtPjI0MCknOiAxIH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfT1RBOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgRW5hYmxlOiB0cnVlIH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9DT05GSUdVUkVfTUVURVJfQ09NTTpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IEluZGV4OiAwLCAnVm9sdGFnZSAoViknOiA4LCAnQ29tbWFuZCB0eXBlICgxLzIvMyknOiAyLCAnU2V0cG9pbnQgKG9obXMpJzogMTEwMCB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0JMVUVUT09USF9OQU1FOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgJ0RldmljZSBuYW1lJzogJ0lPVGVzdGluZyBib2FyZCcgfTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1JFRlJFU0g6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuQ29tbWFuZCA9IENvbW1hbmQ7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPUNvbW1hbmQuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5Db21tYW5kUmVzdWx0ID0gdm9pZCAwO1xyXG5jbGFzcyBDb21tYW5kUmVzdWx0IHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMudmFsdWUgPSAwLjA7XHJcbiAgICAgICAgdGhpcy5zdWNjZXNzID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gJyc7XHJcbiAgICAgICAgdGhpcy51bml0ID0gJyc7XHJcbiAgICAgICAgdGhpcy5zZWNvbmRhcnlfdmFsdWUgPSAwLjA7XHJcbiAgICAgICAgdGhpcy5zZWNvbmRhcnlfdW5pdCA9ICcnO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuQ29tbWFuZFJlc3VsdCA9IENvbW1hbmRSZXN1bHQ7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPUNvbW1hbmRSZXN1bHQuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbi8vLyA8cmVmZXJlbmNlIHR5cGVzPVwid2ViLWJsdWV0b290aFwiIC8+XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5Ecml2ZXIgPSB2b2lkIDA7XHJcbi8qKlxyXG4gKiAgQmx1ZXRvb3RoIGhhbmRsaW5nIG1vZHVsZSwgaW5jbHVkaW5nIG1haW4gc3RhdGUgbWFjaGluZSBsb29wLlxyXG4gKiAgVGhpcyBtb2R1bGUgaW50ZXJhY3RzIHdpdGggYnJvd3NlciBmb3IgYmx1ZXRvb3RoIGNvbXVuaWNhdGlvbnMgYW5kIHBhaXJpbmcsIGFuZCB3aXRoIFNlbmVjYU1TQyBvYmplY3QuXHJcbiAqL1xyXG5jb25zdCBBUElTdGF0ZV8xID0gcmVxdWlyZShcIi4vQVBJU3RhdGVcIik7XHJcbmNvbnN0IGNvbnN0YW50c18xID0gcmVxdWlyZShcIi4vY29uc3RhbnRzXCIpO1xyXG5jb25zdCBJT1Rlc3RpbmdCb2FyZF8xID0gcmVxdWlyZShcIi4vSU9UZXN0aW5nQm9hcmRcIik7XHJcbmNvbnN0IENvbW1hbmRfMSA9IHJlcXVpcmUoXCIuL0NvbW1hbmRcIik7XHJcbmNvbnN0IHV0aWxzXzEgPSByZXF1aXJlKFwiLi91dGlsc1wiKTtcclxuY29uc3QgbG9nID0gcmVxdWlyZShcImxvZ2xldmVsXCIpO1xyXG5jb25zdCBOb3RpZmljYXRpb25EYXRhXzEgPSByZXF1aXJlKFwiLi9Ob3RpZmljYXRpb25EYXRhXCIpO1xyXG5jbGFzcyBEcml2ZXIge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5sb2dnaW5nID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5zaW11bGF0aW9uID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5idFN0YXRlID0gbmV3IEFQSVN0YXRlXzEuQlRBcGlTdGF0ZSgpO1xyXG4gICAgICAgIHRoaXMuaW90ID0gbmV3IElPVGVzdGluZ0JvYXJkXzEuSU9UZXN0aW5nQm9hcmQodGhpcy5TZW5kQW5kUmVzcG9uc2UsIHRoaXMuYnRTdGF0ZSk7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAgICogU2VuZCB0aGUgbWVzc2FnZSB1c2luZyBCbHVldG9vdGggYW5kIHdhaXQgZm9yIGFuIGFuc3dlclxyXG4gICAgICAgKi9cclxuICAgIGFzeW5jIFNlbmRBbmRSZXNwb25zZShjb21tYW5kKSB7XHJcbiAgICAgICAgaWYgKGNvbW1hbmQgPT0gbnVsbCB8fCB0aGlzLmJ0U3RhdGUuY2hhcldyaXRlID09IG51bGwpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxvZy5kZWJ1ZygnPj4gJyArICgwLCB1dGlsc18xLmJ1ZjJoZXgpKGNvbW1hbmQpKTtcclxuICAgICAgICB0aGlzLmJ0U3RhdGUucmVzcG9uc2UgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0cy5yZXF1ZXN0cysrO1xyXG4gICAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgICAgIGF3YWl0IHRoaXMuYnRTdGF0ZS5jaGFyV3JpdGUud3JpdGVWYWx1ZVdpdGhvdXRSZXNwb25zZShjb21tYW5kKTtcclxuICAgICAgICB3aGlsZSAodGhpcy5idFN0YXRlLnN0YXRlID09IGNvbnN0YW50c18xLlN0YXRlLk1FVEVSX0lOSVRJQUxJWklORyB8fFxyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPT0gY29uc3RhbnRzXzEuU3RhdGUuQlVTWSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5idFN0YXRlLnJlc3BvbnNlICE9IG51bGwpXHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDM1KSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGVuZFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgICBjb25zdCBhbnN3ZXIgPSB0aGlzLmJ0U3RhdGUucmVzcG9uc2U/LnNsaWNlKDApO1xyXG4gICAgICAgIHRoaXMuYnRTdGF0ZS5yZXNwb25zZSA9IG51bGw7XHJcbiAgICAgICAgLy8gTG9nIHRoZSBwYWNrZXRzXHJcbiAgICAgICAgaWYgKHRoaXMubG9nZ2luZykge1xyXG4gICAgICAgICAgICBjb25zdCBwYWNrZXQgPSB7IHJlcXVlc3Q6ICgwLCB1dGlsc18xLmJ1ZjJoZXgpKGNvbW1hbmQpLCBhbnN3ZXI6ICgwLCB1dGlsc18xLmJ1ZjJoZXgpKGFuc3dlcikgfTtcclxuICAgICAgICAgICAgY29uc3Qgc3RvcmFnZV92YWx1ZSA9IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnSU9UZXN0aW5nVHJhY2UnKTtcclxuICAgICAgICAgICAgbGV0IHBhY2tldHMgPSBbXTtcclxuICAgICAgICAgICAgaWYgKHN0b3JhZ2VfdmFsdWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgcGFja2V0cyA9IEpTT04ucGFyc2Uoc3RvcmFnZV92YWx1ZSk7IC8vIFJlc3RvcmUgdGhlIGpzb24gcGVyc2lzdGVkIG9iamVjdFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHBhY2tldHMucHVzaChKU09OLnN0cmluZ2lmeShwYWNrZXQpKTsgLy8gQWRkIHRoZSBuZXcgb2JqZWN0XHJcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnSU9UZXN0aW5nVHJhY2UnLCBKU09OLnN0cmluZ2lmeShwYWNrZXRzKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0cy5yZXNwb25zZVRpbWUgPSBNYXRoLnJvdW5kKCgxLjAgKiB0aGlzLmJ0U3RhdGUuc3RhdHMucmVzcG9uc2VUaW1lICogKHRoaXMuYnRTdGF0ZS5zdGF0cy5yZXNwb25zZXMgJSA1MDApICsgKGVuZFRpbWUgLSBzdGFydFRpbWUpKSAvICgodGhpcy5idFN0YXRlLnN0YXRzLnJlc3BvbnNlcyAlIDUwMCkgKyAxKSk7XHJcbiAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLmxhc3RSZXNwb25zZVRpbWUgPSBNYXRoLnJvdW5kKGVuZFRpbWUgLSBzdGFydFRpbWUpICsgJyBtcyc7XHJcbiAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLnJlc3BvbnNlcysrO1xyXG4gICAgICAgIHJldHVybiBhbnN3ZXI7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAgICogTWFpbiBsb29wIG9mIHRoZSBtZXRlciBoYW5kbGVyLlxyXG4gICAgICAgKiAqL1xyXG4gICAgYXN5bmMgc3RhdGVNYWNoaW5lKCkge1xyXG4gICAgICAgIGxldCBuZXh0QWN0aW9uO1xyXG4gICAgICAgIGNvbnN0IERFTEFZX01TID0gKHRoaXMuc2ltdWxhdGlvbiA/IDIwIDogNzUwKTsgLy8gVXBkYXRlIHRoZSBzdGF0dXMgZXZlcnkgWCBtcy5cclxuICAgICAgICBjb25zdCBUSU1FT1VUX01TID0gKHRoaXMuc2ltdWxhdGlvbiA/IDEwMDAgOiAzMDAwMCk7IC8vIEdpdmUgdXAgc29tZSBvcGVyYXRpb25zIGFmdGVyIFggbXMuXHJcbiAgICAgICAgdGhpcy5idFN0YXRlLnN0YXJ0ZWQgPSB0cnVlO1xyXG4gICAgICAgIGxvZy5kZWJ1ZygnQ3VycmVudCBzdGF0ZTonICsgdGhpcy5idFN0YXRlLnN0YXRlKTtcclxuICAgICAgICAvLyBDb25zZWN1dGl2ZSBzdGF0ZSBjb3VudGVkLiBDYW4gYmUgdXNlZCB0byB0aW1lb3V0LlxyXG4gICAgICAgIGlmICh0aGlzLmJ0U3RhdGUuc3RhdGUgPT0gdGhpcy5idFN0YXRlLnByZXZfc3RhdGUpIHtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlX2NwdCsrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlX2NwdCA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIFN0b3AgcmVxdWVzdCBmcm9tIEFQSVxyXG4gICAgICAgIGlmICh0aGlzLmJ0U3RhdGUuc3RvcFJlcXVlc3QpIHtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuU1RPUFBJTkc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxvZy5kZWJ1ZygnXFxTdGF0ZTonICsgdGhpcy5idFN0YXRlLnN0YXRlKTtcclxuICAgICAgICBzd2l0Y2ggKHRoaXMuYnRTdGF0ZS5zdGF0ZSkge1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLk5PVF9DT05ORUNURUQ6IC8vIGluaXRpYWwgc3RhdGUgb24gU3RhcnQoKVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc2ltdWxhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSB0aGlzLmZha2VQYWlyRGV2aWNlLmJpbmQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gdGhpcy5idFBhaXJEZXZpY2UuYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLkNPTk5FQ1RJTkc6IC8vIHdhaXRpbmcgZm9yIGNvbm5lY3Rpb24gdG8gY29tcGxldGVcclxuICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5TdGF0ZS5ERVZJQ0VfUEFJUkVEOiAvLyBjb25uZWN0aW9uIGNvbXBsZXRlLCBhY3F1aXJlIG1ldGVyIHN0YXRlXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zaW11bGF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMuZmFrZVN1YnNjcmliZS5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMuYnRTdWJzY3JpYmUuYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLlNVQlNDUklCSU5HOiAvLyB3YWl0aW5nIGZvciBCbHVldG9vdGggaW50ZXJmYWNlc1xyXG4gICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmJ0U3RhdGUuc3RhdGVfY3B0ID4gKFRJTUVPVVRfTVMgLyBERUxBWV9NUykpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUaW1lb3V0LCB0cnkgdG8gcmVzdWJzY3JpYmVcclxuICAgICAgICAgICAgICAgICAgICBsb2cud2FybignVGltZW91dCBpbiBTVUJTQ1JJQklORycpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkRFVklDRV9QQUlSRUQ7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlX2NwdCA9IDA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5TdGF0ZS5NRVRFUl9JTklUOiAvLyByZWFkeSB0byBjb21tdW5pY2F0ZSwgYWNxdWlyZSBtZXRlciBzdGF0dXNcclxuICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSB0aGlzLm1ldGVySW5pdC5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuTUVURVJfSU5JVElBTElaSU5HOiAvLyByZWFkaW5nIHRoZSBtZXRlciBzdGF0dXNcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmJ0U3RhdGUuc3RhdGVfY3B0ID4gKFRJTUVPVVRfTVMgLyBERUxBWV9NUykpIHtcclxuICAgICAgICAgICAgICAgICAgICBsb2cud2FybignVGltZW91dCBpbiBNRVRFUl9JTklUSUFMSVpJTkcnKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUaW1lb3V0LCB0cnkgdG8gcmVzdWJzY3JpYmVcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zaW11bGF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSB0aGlzLmZha2VTdWJzY3JpYmUuYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSB0aGlzLmJ0U3Vic2NyaWJlLmJpbmQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZV9jcHQgPSAwO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLklETEU6IC8vIHJlYWR5IHRvIHByb2Nlc3MgY29tbWFuZHMgZnJvbSBBUElcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmJ0U3RhdGUuY29tbWFuZCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMucHJvY2Vzc0NvbW1hbmQuYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSB0aGlzLnJlZnJlc2guYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLkVSUk9SOiAvLyBhbnl0aW1lIGFuIGVycm9yIGhhcHBlbnNcclxuICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSB0aGlzLmRpc2Nvbm5lY3QuYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLkJVU1k6IC8vIHdoaWxlIGEgY29tbWFuZCBpbiBnb2luZyBvblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYnRTdGF0ZS5zdGF0ZV9jcHQgPiAoVElNRU9VVF9NUyAvIERFTEFZX01TKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZy53YXJuKCdUaW1lb3V0IGluIEJVU1knKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUaW1lb3V0LCB0cnkgdG8gcmVzdWJzY3JpYmVcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zaW11bGF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSB0aGlzLmZha2VTdWJzY3JpYmUuYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSB0aGlzLmJ0U3Vic2NyaWJlLmJpbmQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZV9jcHQgPSAwO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLlNUT1BQSU5HOlxyXG4gICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMuZGlzY29ubmVjdC5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuU1RPUFBFRDogLy8gYWZ0ZXIgYSBkaXNjb25uZWN0b3Igb3IgU3RvcCgpIHJlcXVlc3QsIHN0b3BzIHRoZSBzdGF0ZSBtYWNoaW5lLlxyXG4gICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuYnRTdGF0ZS5wcmV2X3N0YXRlID0gdGhpcy5idFN0YXRlLnN0YXRlO1xyXG4gICAgICAgIGlmIChuZXh0QWN0aW9uICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBsb2cuZGVidWcoJ1xcdEV4ZWN1dGluZzonICsgbmV4dEFjdGlvbi5uYW1lKTtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IG5leHRBY3Rpb24oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgbG9nLmVycm9yKCdFeGNlcHRpb24gaW4gc3RhdGUgbWFjaGluZScsIGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLmJ0U3RhdGUuc3RhdGUgIT0gY29uc3RhbnRzXzEuU3RhdGUuU1RPUFBFRCkge1xyXG4gICAgICAgICAgICB2b2lkICgwLCB1dGlsc18xLnNsZWVwKShERUxBWV9NUykudGhlbihhc3luYyAoKSA9PiB7IGF3YWl0IHRoaXMuc3RhdGVNYWNoaW5lKCk7IH0pOyAvLyBSZWNoZWNrIHN0YXR1cyBpbiBERUxBWV9NUyBtc1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKCdcXHRUZXJtaW5hdGluZyBTdGF0ZSBtYWNoaW5lJyk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGFydGVkID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgICAqIENhbGxlZCBmcm9tIHN0YXRlIG1hY2hpbmUgdG8gZXhlY3V0ZSBhIHNpbmdsZSBjb21tYW5kIGZyb20gYnRTdGF0ZS5jb21tYW5kIHByb3BlcnR5XHJcbiAgICAgICAqICovXHJcbiAgICBhc3luYyBwcm9jZXNzQ29tbWFuZCgpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjb21tYW5kID0gdGhpcy5idFN0YXRlLmNvbW1hbmQ7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGNvbnN0YW50c18xLlJlc3VsdENvZGUuU1VDQ0VTUztcclxuICAgICAgICAgICAgbGV0IHBhY2tldCwgcmVzcG9uc2U7XHJcbiAgICAgICAgICAgIGlmIChjb21tYW5kID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5CVVNZO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuY29tbWFuZHMrKztcclxuICAgICAgICAgICAgbG9nLmluZm8oJ1xcdFxcdEV4ZWN1dGluZyBjb21tYW5kIDonICsgY29tbWFuZCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHBhY2tldF9jbGVhciA9IENvbW1hbmRfMS5Db21tYW5kLkNyZWF0ZU5vU1AoY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9DTEVBUl9GTEFHUyk7XHJcbiAgICAgICAgICAgIHBhY2tldCA9IGNvbW1hbmQuZ2V0UGFja2V0KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHBhY2tldHMgPSBbcGFja2V0X2NsZWFyLCBwYWNrZXRdO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IG1zZyBvZiBwYWNrZXRzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50Q3B0ID0gdGhpcy5idFN0YXRlLmxhc3RNZWFzdXJlICE9IG51bGwgPyB0aGlzLmJ0U3RhdGUubGFzdE1lYXN1cmUuQ29tbWFuZENwdCA6IC0xO1xyXG4gICAgICAgICAgICAgICAgZG8ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlID0gYXdhaXQgdGhpcy5TZW5kQW5kUmVzcG9uc2UocGFja2V0KTtcclxuICAgICAgICAgICAgICAgIH0gd2hpbGUgKGN1cnJlbnRDcHQgIT0gdGhpcy5idFN0YXRlLmxhc3RNZWFzdXJlPy5Db21tYW5kQ3B0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBDYWxsZXIgZXhwZWN0cyBhIHZhbGlkIHByb3BlcnR5IGluIEdldFN0YXRlKCkgb25jZSBjb21tYW5kIGlzIGV4ZWN1dGVkLlxyXG4gICAgICAgICAgICBsb2cuZGVidWcoJ1xcdFxcdFJlZnJlc2hpbmcgY3VycmVudCBzdGF0ZScpO1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJlZnJlc2goKTtcclxuICAgICAgICAgICAgY29tbWFuZC5lcnJvciA9IHRoaXMuYnRTdGF0ZS5sYXN0TWVhc3VyZT8uRXJyb3I7XHJcbiAgICAgICAgICAgIGNvbW1hbmQucGVuZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuY29tbWFuZCA9IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLklETEU7XHJcbiAgICAgICAgICAgIGxvZy5kZWJ1ZygnXFx0XFx0Q29tcGxldGVkIGNvbW1hbmQgZXhlY3V0ZWQnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICBsb2cuZXJyb3IoJyoqIGVycm9yIHdoaWxlIGV4ZWN1dGluZyBjb21tYW5kOiAnICsgZXJyKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuTUVURVJfSU5JVDtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLmV4Y2VwdGlvbnMrKztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAgICogQWNxdWlyZSB0aGUgY3VycmVudCBtb2RlIGFuZCBzZXJpYWwgbnVtYmVyIG9mIHRoZSBkZXZpY2UuXHJcbiAgICAgICAqICovXHJcbiAgICBhc3luYyBtZXRlckluaXQoKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuTUVURVJfSU5JVElBTElaSU5HO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUubWV0ZXIuc2VyaWFsID0gYXdhaXQgdGhpcy5pb3QuZ2V0U2VyaWFsTnVtYmVyKCk7XHJcbiAgICAgICAgICAgIGxvZy5pbmZvKCdcXHRcXHRTZXJpYWwgbnVtYmVyOicgKyB0aGlzLmJ0U3RhdGUubWV0ZXIuc2VyaWFsKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLm1ldGVyLmJhdHRlcnkgPSBhd2FpdCB0aGlzLmlvdC5nZXRCYXR0ZXJ5TGV2ZWwoKTtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKCdcXHRcXHRCYXR0ZXJ5ICglKTonICsgdGhpcy5idFN0YXRlLm1ldGVyLmJhdHRlcnkpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5JRExFO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIGxvZy53YXJuKCdFcnJvciB3aGlsZSBpbml0aWFsaXppbmcgbWV0ZXIgOicgKyBlcnIpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuZXhjZXB0aW9ucysrO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5ERVZJQ0VfUEFJUkVEO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qXHJcbiAgICAgICogQ2xvc2UgdGhlIGJsdWV0b290aCBpbnRlcmZhY2UgKHVucGFpcilcclxuICAgICAgKiAqL1xyXG4gICAgYXN5bmMgZGlzY29ubmVjdCgpIHtcclxuICAgICAgICB0aGlzLmJ0U3RhdGUuY29tbWFuZCA9IG51bGw7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5idFN0YXRlLnJlc2V0KHRoaXMub25EaXNjb25uZWN0ZWQuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuU1RPUFBFRDtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBFdmVudCBjYWxsZWQgYnkgYnJvd3NlciBCVCBhcGkgd2hlbiB0aGUgZGV2aWNlIGRpc2Nvbm5lY3RcclxuICAgICAgICogKi9cclxuICAgIGFzeW5jIG9uRGlzY29ubmVjdGVkKCkge1xyXG4gICAgICAgIGxvZy53YXJuKCcqIEdBVFQgU2VydmVyIGRpc2Nvbm5lY3RlZCBldmVudCwgd2lsbCB0cnkgdG8gcmVjb25uZWN0IConKTtcclxuICAgICAgICBhd2FpdCB0aGlzLmJ0U3RhdGUucmVzZXQoKTtcclxuICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHNbJ0dBVFQgZGlzY29ubmVjdHMnXSsrO1xyXG4gICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkRFVklDRV9QQUlSRUQ7IC8vIFRyeSB0byBhdXRvLXJlY29ubmVjdCB0aGUgaW50ZXJmYWNlcyB3aXRob3V0IHBhaXJpbmdcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBKb2lucyB0aGUgYXJndW1lbnRzIGludG8gYSBzaW5nbGUgYnVmZmVyXHJcbiAgICAgICAqIEByZXR1cm5zIHtBcnJheUJ1ZmZlcn0gY29uY2F0ZW5hdGVkIGJ1ZmZlclxyXG4gICAgICAgKi9cclxuICAgIGFycmF5QnVmZmVyQ29uY2F0KGJ1ZmZlcjEsIGJ1ZmZlcjIpIHtcclxuICAgICAgICBsZXQgbGVuZ3RoID0gMDtcclxuICAgICAgICBsZXQgYnVmZmVyO1xyXG4gICAgICAgIGZvciAodmFyIGkgaW4gYXJndW1lbnRzKSB7XHJcbiAgICAgICAgICAgIGJ1ZmZlciA9IGFyZ3VtZW50c1tpXTtcclxuICAgICAgICAgICAgaWYgKGJ1ZmZlcikge1xyXG4gICAgICAgICAgICAgICAgbGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGpvaW5lZCA9IG5ldyBVaW50OEFycmF5KGxlbmd0aCk7XHJcbiAgICAgICAgbGV0IG9mZnNldCA9IDA7XHJcbiAgICAgICAgZm9yIChpIGluIGFyZ3VtZW50cykge1xyXG4gICAgICAgICAgICBidWZmZXIgPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgICAgIGpvaW5lZC5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyKSwgb2Zmc2V0KTtcclxuICAgICAgICAgICAgb2Zmc2V0ICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gam9pbmVkLmJ1ZmZlcjtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBFdmVudCBjYWxsZWQgYnkgYmx1ZXRvb3RoIGNoYXJhY3RlcmlzdGljcyB3aGVuIHJlY2VpdmluZyBkYXRhXHJcbiAgICAgICAqIEBwYXJhbSB7YW55fSBldmVudFxyXG4gICAgICAgKi9cclxuICAgIGhhbmRsZU5vdGlmaWNhdGlvbnMoZXZlbnQpIHtcclxuICAgICAgICBjb25zdCB2YWx1ZSA9IGV2ZW50LnRhcmdldC52YWx1ZTtcclxuICAgICAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBsb2cuZGVidWcoJzw8ICcgKyAoMCwgdXRpbHNfMS5idWYyaGV4KSh2YWx1ZS5idWZmZXIpKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYnRTdGF0ZS5yZXNwb25zZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ0U3RhdGUucmVzcG9uc2UgPSB0aGlzLmFycmF5QnVmZmVyQ29uY2F0KHRoaXMuYnRTdGF0ZS5yZXNwb25zZSwgdmFsdWUuYnVmZmVyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5yZXNwb25zZSA9IHZhbHVlLmJ1ZmZlci5zbGljZSgwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUubGFzdE1lYXN1cmUgPSBOb3RpZmljYXRpb25EYXRhXzEuTm90aWZpY2F0aW9uRGF0YS5wYXJzZSh0aGlzLmJ0U3RhdGUucmVzcG9uc2UpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBUaGlzIGZ1bmN0aW9uIHdpbGwgc3VjY2VlZCBvbmx5IGlmIGNhbGxlZCBhcyBhIGNvbnNlcXVlbmNlIG9mIGEgdXNlci1nZXN0dXJlXHJcbiAgICAgICAqIEUuZy4gYnV0dG9uIGNsaWNrLiBUaGlzIGlzIGR1ZSB0byBCbHVlVG9vdGggQVBJIHNlY3VyaXR5IG1vZGVsLlxyXG4gICAgICAgKiAqL1xyXG4gICAgYXN5bmMgYnRQYWlyRGV2aWNlKCkge1xyXG4gICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkNPTk5FQ1RJTkc7XHJcbiAgICAgICAgY29uc3QgZm9yY2VTZWxlY3Rpb24gPSB0aGlzLmJ0U3RhdGUub3B0aW9ucy5mb3JjZURldmljZVNlbGVjdGlvbjtcclxuICAgICAgICBsb2cuZGVidWcoJ2J0UGFpckRldmljZSgnICsgZm9yY2VTZWxlY3Rpb24gKyAnKScpO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgKG5hdmlnYXRvci5ibHVldG9vdGg/LmdldEF2YWlsYWJpbGl0eSkgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJpbGl0eSA9IGF3YWl0IG5hdmlnYXRvci5ibHVldG9vdGguZ2V0QXZhaWxhYmlsaXR5KCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWF2YWlsYWJpbGl0eSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZy5lcnJvcignQmx1ZXRvb3RoIG5vdCBhdmFpbGFibGUgaW4gYnJvd3Nlci4nKTtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Jyb3dzZXIgZG9lcyBub3QgcHJvdmlkZSBibHVldG9vdGgnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgZGV2aWNlID0gbnVsbDtcclxuICAgICAgICAgICAgLy8gRG8gd2UgYWxyZWFkeSBoYXZlIHBlcm1pc3Npb24/XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgKG5hdmlnYXRvci5ibHVldG9vdGg/LmdldERldmljZXMpID09PSAnZnVuY3Rpb24nICYmXHJcbiAgICAgICAgICAgICAgICAhZm9yY2VTZWxlY3Rpb24pIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJsZURldmljZXMgPSBhd2FpdCBuYXZpZ2F0b3IuYmx1ZXRvb3RoLmdldERldmljZXMoKTtcclxuICAgICAgICAgICAgICAgIGF2YWlsYWJsZURldmljZXMuZm9yRWFjaChmdW5jdGlvbiAoZGV2LCBpbmRleCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZy5kZWJ1ZygnRm91bmQgYXV0aG9yaXplZCBkZXZpY2UgOicgKyBkZXYubmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZGV2aWNlID0gZGV2O1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBsb2cuZGVidWcoJ25hdmlnYXRvci5ibHVldG9vdGguZ2V0RGV2aWNlcygpPScgKyBkZXZpY2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIElmIG5vdCwgcmVxdWVzdCBmcm9tIHVzZXJcclxuICAgICAgICAgICAgaWYgKGRldmljZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBkZXZpY2UgPSBhd2FpdCBuYXZpZ2F0b3IuYmx1ZXRvb3RoXHJcbiAgICAgICAgICAgICAgICAgICAgLnJlcXVlc3REZXZpY2Uoe1xyXG4gICAgICAgICAgICAgICAgICAgIGFjY2VwdEFsbERldmljZXM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcnM6IFt7IHNlcnZpY2VzOiBbY29uc3RhbnRzXzEuQmx1ZVRvb3RoSU9UVVVJRC5TZXJ2aWNlVXVpZC50b0xvd2VyQ2FzZSgpXSB9XSxcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25hbFNlcnZpY2VzOiBbJ2JhdHRlcnlfc2VydmljZScsICdnZW5lcmljX2FjY2VzcycsICdkZXZpY2VfaW5mb3JtYXRpb24nLCBjb25zdGFudHNfMS5CbHVlVG9vdGhJT1RVVUlELlNlcnZpY2VVdWlkLnRvTG93ZXJDYXNlKCldXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuYnREZXZpY2UgPSBkZXZpY2U7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkRFVklDRV9QQUlSRUQ7XHJcbiAgICAgICAgICAgIGxvZy5pbmZvKCdCbHVldG9vdGggZGV2aWNlICcgKyBkZXZpY2UubmFtZSArICcgY29ubmVjdGVkLicpO1xyXG4gICAgICAgICAgICBhd2FpdCAoMCwgdXRpbHNfMS5zbGVlcCkoNTAwKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICBsb2cud2FybignKiogZXJyb3Igd2hpbGUgY29ubmVjdGluZzogJyArIGVyci5tZXNzYWdlKTtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5idFN0YXRlLnJlc2V0KHRoaXMub25EaXNjb25uZWN0ZWQuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkVSUk9SO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuZXhjZXB0aW9ucysrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGFzeW5jIGZha2VQYWlyRGV2aWNlKCkge1xyXG4gICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkNPTk5FQ1RJTkc7XHJcbiAgICAgICAgY29uc3QgZm9yY2VTZWxlY3Rpb24gPSB0aGlzLmJ0U3RhdGUub3B0aW9ucy5mb3JjZURldmljZVNlbGVjdGlvbjtcclxuICAgICAgICBsb2cuZGVidWcoJ2Zha2VQYWlyRGV2aWNlKCcgKyBmb3JjZVNlbGVjdGlvbiArICcpJyk7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgZGV2aWNlID0ge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ0Zha2VCVERldmljZScsXHJcbiAgICAgICAgICAgICAgICBnYXR0OiB7IGNvbm5lY3RlZDogdHJ1ZSwgZGV2aWNlOiBudWxsLCBjb25uZWN0OiBudWxsLCBkaXNjb25uZWN0OiBudWxsLCBnZXRQcmltYXJ5U2VydmljZTogbnVsbCwgZ2V0UHJpbWFyeVNlcnZpY2VzOiBudWxsIH0sXHJcbiAgICAgICAgICAgICAgICBpZDogJzEnLFxyXG4gICAgICAgICAgICAgICAgZm9yZ2V0OiBudWxsLFxyXG4gICAgICAgICAgICAgICAgd2F0Y2hBZHZlcnRpc2VtZW50czogbnVsbCxcclxuICAgICAgICAgICAgICAgIHdhdGNoaW5nQWR2ZXJ0aXNlbWVudHM6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBhZGRFdmVudExpc3RlbmVyOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcjogbnVsbCxcclxuICAgICAgICAgICAgICAgIGRpc3BhdGNoRXZlbnQ6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBvbmFkdmVydGlzZW1lbnRyZWNlaXZlZDogbnVsbCxcclxuICAgICAgICAgICAgICAgIG9uZ2F0dHNlcnZlcmRpc2Nvbm5lY3RlZDogbnVsbCxcclxuICAgICAgICAgICAgICAgIG9uY2hhcmFjdGVyaXN0aWN2YWx1ZWNoYW5nZWQ6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBvbnNlcnZpY2VhZGRlZDogbnVsbCxcclxuICAgICAgICAgICAgICAgIG9uc2VydmljZXJlbW92ZWQ6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBvbnNlcnZpY2VjaGFuZ2VkOiBudWxsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5idERldmljZSA9IGRldmljZTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuREVWSUNFX1BBSVJFRDtcclxuICAgICAgICAgICAgbG9nLmluZm8oJ0JsdWV0b290aCBkZXZpY2UgJyArIGRldmljZS5uYW1lICsgJyBjb25uZWN0ZWQuJyk7XHJcbiAgICAgICAgICAgIGF3YWl0ICgwLCB1dGlsc18xLnNsZWVwKSg1MCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgbG9nLndhcm4oJyoqIGVycm9yIHdoaWxlIGNvbm5lY3Rpbmc6ICcgKyBlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYnRTdGF0ZS5yZXNldCgpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuZXhjZXB0aW9ucysrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBPbmNlIHRoZSBkZXZpY2UgaXMgYXZhaWxhYmxlLCBpbml0aWFsaXplIHRoZSBzZXJ2aWNlIGFuZCB0aGUgMiBjaGFyYWN0ZXJpc3RpY3MgbmVlZGVkLlxyXG4gICAgICAgKiAqL1xyXG4gICAgYXN5bmMgYnRTdWJzY3JpYmUoKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuU1VCU0NSSUJJTkc7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0cy5zdWJjcmliZXMrKztcclxuICAgICAgICAgICAgY29uc3QgZGV2aWNlID0gdGhpcy5idFN0YXRlLmJ0RGV2aWNlO1xyXG4gICAgICAgICAgICBjb25zdCBnYXR0c2VydmVyID0gbnVsbDtcclxuICAgICAgICAgICAgaWYgKGRldmljZSAmJiBkZXZpY2UuZ2F0dCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFkZXZpY2UuZ2F0dC5jb25uZWN0ZWQgfHwgdGhpcy5idFN0YXRlLmJ0R0FUVFNlcnZlciA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9nLmRlYnVnKGBDb25uZWN0aW5nIHRvIEdBVFQgU2VydmVyIG9uICR7ZGV2aWNlLm5hbWV9Li4uYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZGV2aWNlLmFkZEV2ZW50TGlzdGVuZXIoJ2dhdHRzZXJ2ZXJkaXNjb25uZWN0ZWQnLCB0aGlzLm9uRGlzY29ubmVjdGVkLmJpbmQodGhpcykpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5idEdBVFRTZXJ2ZXIgPSBhd2FpdCBkZXZpY2UuZ2F0dC5jb25uZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9nLmRlYnVnKCc+IEZvdW5kIEdBVFQgc2VydmVyJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBsb2cuZGVidWcoJ0dBVFQgYWxyZWFkeSBjb25uZWN0ZWQnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuYnRTdGF0ZS5yZXNldCh0aGlzLm9uRGlzY29ubmVjdGVkLmJpbmQodGhpcykpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLmJ0RGV2aWNlID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLk5PVF9DT05ORUNURUQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuZXhjZXB0aW9ucysrO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5idElPVFNlcnZpY2UgPSBhd2FpdCB0aGlzLmJ0U3RhdGUuYnRHQVRUU2VydmVyLmdldFByaW1hcnlTZXJ2aWNlKGNvbnN0YW50c18xLkJsdWVUb290aElPVFVVSUQuU2VydmljZVV1aWQpO1xyXG4gICAgICAgICAgICBsb2cuZGVidWcoJz4gRm91bmQgSU9UZXN0aW5nIGJvYXJkIHNlcnZpY2UnKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLmNoYXJXcml0ZSA9IGF3YWl0IHRoaXMuYnRTdGF0ZS5idElPVFNlcnZpY2UuZ2V0Q2hhcmFjdGVyaXN0aWMoY29uc3RhbnRzXzEuQmx1ZVRvb3RoSU9UVVVJRC5Db21tYW5kQ2hhclV1aWQpO1xyXG4gICAgICAgICAgICBsb2cuZGVidWcoJz4gRm91bmQgY29tbWFuZCBjaGFyYWN0ZXJpc3RpYycpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuY2hhclJlYWQgPSBhd2FpdCB0aGlzLmJ0U3RhdGUuYnRJT1RTZXJ2aWNlLmdldENoYXJhY3RlcmlzdGljKGNvbnN0YW50c18xLkJsdWVUb290aElPVFVVSUQuU3RhdHVzQ2hhclV1aWQpO1xyXG4gICAgICAgICAgICBsb2cuZGVidWcoJz4gRm91bmQgbm90aWZpY2F0aW9ucyBjaGFyYWN0ZXJpc3RpYycpO1xyXG4gICAgICAgICAgICAvKlxyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuY2hhckJhdHRlcnkgPSBhd2FpdCB0aGlzLmJ0U3RhdGUuYnRJT1RTZXJ2aWNlLmdldENoYXJhY3RlcmlzdGljKCcwMDAzY2RkNi0wMDAwLTEwMDAtODAwMC0wMDgwNWY5YjM0ZmInKVxyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuY2hhckZpcm13YXJlID0gYXdhaXQgdGhpcy5idFN0YXRlLmJ0SU9UU2VydmljZS5nZXRDaGFyYWN0ZXJpc3RpYygnMDAwM2NkZDktMDAwMC0xMDAwLTgwMDAtMDA4MDVmOWIzNGZiJylcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLmNoYXJTZXJpYWwgPSBhd2FpdCB0aGlzLmJ0U3RhdGUuYnRJT1RTZXJ2aWNlLmdldENoYXJhY3RlcmlzdGljKCcwMDAzY2RkOC0wMDAwLTEwMDAtODAwMC0wMDgwNWY5YjM0ZmInKSAqL1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUucmVzcG9uc2UgPSBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuY2hhclJlYWQuYWRkRXZlbnRMaXN0ZW5lcignY2hhcmFjdGVyaXN0aWN2YWx1ZWNoYW5nZWQnLCB0aGlzLmhhbmRsZU5vdGlmaWNhdGlvbnMuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYnRTdGF0ZS5jaGFyUmVhZC5zdGFydE5vdGlmaWNhdGlvbnMoKTtcclxuICAgICAgICAgICAgbG9nLmluZm8oJz4gQmx1ZXRvb3RoIGludGVyZmFjZXMgcmVhZHkuJyk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0cy5sYXN0X2Nvbm5lY3QgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgICAgICAgIGF3YWl0ICgwLCB1dGlsc18xLnNsZWVwKSg1MCk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLk1FVEVSX0lOSVQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgbG9nLndhcm4oJyoqIGVycm9yIHdoaWxlIHN1YnNjcmliaW5nOiAnICsgZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmJ0U3RhdGUucmVzZXQoKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuREVWSUNFX1BBSVJFRDtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLmV4Y2VwdGlvbnMrKztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBhc3luYyBmYWtlU3Vic2NyaWJlKCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLlNVQlNDUklCSU5HO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuc3ViY3JpYmVzKys7XHJcbiAgICAgICAgICAgIGNvbnN0IGRldmljZSA9IHRoaXMuYnRTdGF0ZS5idERldmljZTtcclxuICAgICAgICAgICAgaWYgKCFkZXZpY2U/LmdhdHQ/LmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgbG9nLmRlYnVnKGBDb25uZWN0aW5nIHRvIEdBVFQgU2VydmVyIG9uICR7ZGV2aWNlPy5uYW1lfS4uLmApO1xyXG4gICAgICAgICAgICAgICAgbG9nLmRlYnVnKCc+IEZvdW5kIEdBVFQgc2VydmVyJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbG9nLmRlYnVnKCc+IEZvdW5kIFNlcmlhbCBzZXJ2aWNlJyk7XHJcbiAgICAgICAgICAgIGxvZy5kZWJ1ZygnPiBGb3VuZCB3cml0ZSBjaGFyYWN0ZXJpc3RpYycpO1xyXG4gICAgICAgICAgICBsb2cuZGVidWcoJz4gRm91bmQgcmVhZCBjaGFyYWN0ZXJpc3RpYycpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUucmVzcG9uc2UgPSBudWxsO1xyXG4gICAgICAgICAgICBsb2cuaW5mbygnPiBCbHVldG9vdGggaW50ZXJmYWNlcyByZWFkeS4nKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLmxhc3RfY29ubmVjdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcclxuICAgICAgICAgICAgYXdhaXQgKDAsIHV0aWxzXzEuc2xlZXApKDEwKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuTUVURVJfSU5JVDtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICBsb2cud2FybignKiogZXJyb3Igd2hpbGUgc3Vic2NyaWJpbmc6ICcgKyBlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYnRTdGF0ZS5yZXNldCh0aGlzLm9uRGlzY29ubmVjdGVkLmJpbmQodGhpcykpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5ERVZJQ0VfUEFJUkVEO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuZXhjZXB0aW9ucysrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBXaGVuIGlkbGUsIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkXHJcbiAgICAgICAqICovXHJcbiAgICBhc3luYyByZWZyZXNoKCkge1xyXG4gICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkJVU1k7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKCdcXHRcXHRGaW5pc2hlZCByZWZyZXNoaW5nIGN1cnJlbnQgc3RhdGUnKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYnRTdGF0ZS5sYXN0TWVhc3VyZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ0U3RhdGUubWV0ZXIuYWN0dWFsID0gdGhpcy5idFN0YXRlLmxhc3RNZWFzdXJlLkFjdHVhbF9SO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLm1ldGVyLnNldHBvaW50ID0gdGhpcy5idFN0YXRlLmxhc3RNZWFzdXJlLlNldHBvaW50X1I7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ0U3RhdGUubWV0ZXIuYmF0dGVyeSA9IGF3YWl0IHRoaXMuaW90LmdldEJhdHRlcnlMZXZlbCgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLm1ldGVyLm1vZGUgPSAodGhpcy5idFN0YXRlLmxhc3RNZWFzdXJlLlJlbGF5ID09IDEgPyAxIDogKHRoaXMuYnRTdGF0ZS5sYXN0TWVhc3VyZS5WX3dpdGhfbG9hZCA/IDMgOiAyKSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ0U3RhdGUubWV0ZXIuZnJlZV9ieXRlcyA9IHRoaXMuYnRTdGF0ZS5sYXN0TWVhc3VyZS5NZW1mcmVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLklETEU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgbG9nLndhcm4oJ0Vycm9yIHdoaWxlIHJlZnJlc2hpbmcgbWVhc3VyZScgKyBlcnIpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5ERVZJQ0VfUEFJUkVEO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuZXhjZXB0aW9ucysrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFNldFNpbXVsYXRpb24odmFsdWUpIHtcclxuICAgICAgICB0aGlzLnNpbXVsYXRpb24gPSB2YWx1ZTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLkRyaXZlciA9IERyaXZlcjtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9RHJpdmVyLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuSU9UZXN0aW5nQm9hcmQgPSB2b2lkIDA7XHJcbmNvbnN0IGxvZyA9IHJlcXVpcmUoXCJsb2dsZXZlbFwiKTtcclxuY2xhc3MgSU9UZXN0aW5nQm9hcmQge1xyXG4gICAgY29uc3RydWN0b3IoZm5TZW5kQW5kUmVzcG9uc2UsIGJ0QXBpKSB7XHJcbiAgICAgICAgdGhpcy5TZW5kQW5kUmVzcG9uc2UgPSBmblNlbmRBbmRSZXNwb25zZTtcclxuICAgICAgICB0aGlzLmJ0U3RhdGUgPSBidEFwaTtcclxuICAgIH1cclxuICAgIGFzeW5jIGV4ZWN1dGUoY21kKSB7XHJcbiAgICAgICAgaWYgKGNtZCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBwYWNrZXQgPSBjbWQuZ2V0UGFja2V0KCk7XHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuU2VuZEFuZFJlc3BvbnNlKHBhY2tldCk7XHJcbiAgICB9XHJcbiAgICB1aW50VG9TdHJpbmcodWludEFycmF5KSB7XHJcbiAgICAgICAgY29uc3QgZW5jb2RlZFN0cmluZyA9IFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkobnVsbCwgdWludEFycmF5KTtcclxuICAgICAgICBjb25zdCBkZWNvZGVkU3RyaW5nID0gZGVjb2RlVVJJQ29tcG9uZW50KGVuY29kZWRTdHJpbmcpO1xyXG4gICAgICAgIHJldHVybiBkZWNvZGVkU3RyaW5nO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgICAqIEdldHMgdGhlIG1ldGVyIHNlcmlhbCBudW1iZXJcclxuICAgICAgICogQHJldHVybnMge3N0cmluZ31cclxuICAgICAgICovXHJcbiAgICBhc3luYyBnZXRTZXJpYWxOdW1iZXIoKSB7XHJcbiAgICAgICAgbG9nLmRlYnVnKCdcXHRcXHRSZWFkaW5nIHNlcmlhbCBudW1iZXInKTtcclxuICAgICAgICAvKiBjb25zdCBkdjogRGF0YVZpZXcgPSBhd2FpdCB0aGlzLmJ0U3RhdGUuY2hhclNlcmlhbC5yZWFkVmFsdWUoKVxyXG4gICAgICAgIHJldHVybiB0aGlzLnVpbnRUb1N0cmluZyhkdikgKi9cclxuICAgICAgICByZXR1cm4gJz8/Pyc7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAgICogR2V0cyB0aGUgYmF0dGVyeSBsZXZlbCBpbmRpY2F0aW9uXHJcbiAgICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IHBlcmNlbnRhZ2UgKCUpXHJcbiAgICAgICAqL1xyXG4gICAgYXN5bmMgZ2V0QmF0dGVyeUxldmVsKCkge1xyXG4gICAgICAgIGxvZy5kZWJ1ZygnXFx0XFx0UmVhZGluZyBiYXR0ZXJ5IHZvbHRhZ2UnKTtcclxuICAgICAgICAvKiBjb25zdCBkdjogRGF0YVZpZXcgPSBhd2FpdCB0aGlzLmJ0U3RhdGUuY2hhckJhdHRlcnkucmVhZFZhbHVlKClcclxuICAgICAgICByZXR1cm4gZHYuZ2V0VWludDgoMCkgKi9cclxuICAgICAgICByZXR1cm4gMTAwO1xyXG4gICAgfVxyXG4gICAgcGFyc2VOb3RpZmljYXRpb24obm90aWZpY2F0aW9uKSB7XHJcbiAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuSU9UZXN0aW5nQm9hcmQgPSBJT1Rlc3RpbmdCb2FyZDtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9SU9UZXN0aW5nQm9hcmQuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5NZXRlclN0YXRlID0gdm9pZCAwO1xyXG5jb25zdCBjb25zdGFudHNfMSA9IHJlcXVpcmUoXCIuL2NvbnN0YW50c1wiKTtcclxuLyoqXHJcbiAqIEN1cnJlbnQgc3RhdGUgb2YgdGhlIG1ldGVyXHJcbiAqICovXHJcbmNsYXNzIE1ldGVyU3RhdGUge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5maXJtd2FyZSA9ICc/Pz8nOyAvLyBGaXJtd2FyZSB2ZXJzaW9uXHJcbiAgICAgICAgdGhpcy5zZXJpYWwgPSAnPz8/JzsgLy8gU2VyaWFsIG51bWJlclxyXG4gICAgICAgIHRoaXMubW9kZSA9IGNvbnN0YW50c18xLkJvYXJkTW9kZS5NT0RFX1VOREVGSU5FRDtcclxuICAgICAgICB0aGlzLnNldHBvaW50ID0gMHhGRkZGO1xyXG4gICAgICAgIHRoaXMuYWN0dWFsID0gMHhGRkZGO1xyXG4gICAgICAgIHRoaXMuZnJlZV9ieXRlcyA9IDA7XHJcbiAgICAgICAgdGhpcy5iYXR0ZXJ5ID0gMDtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLk1ldGVyU3RhdGUgPSBNZXRlclN0YXRlO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1NZXRlclN0YXRlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuTm90aWZpY2F0aW9uRGF0YSA9IHZvaWQgMDtcclxuLy8gTXVzdCBtYXRjaCB3aXRoIF9fZ2V0X25vdGlmaWNhdGlvbl9kYXRhIGluIGJvYXJkYnQucHkgZmlybXdhcmUgY29kZS5cclxuY2xhc3MgTm90aWZpY2F0aW9uRGF0YSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLldpRmkgPSAwO1xyXG4gICAgICAgIHRoaXMuUmVsYXkgPSAwO1xyXG4gICAgICAgIHRoaXMuQmx1ZXRvb3RoID0gMDtcclxuICAgICAgICB0aGlzLkZyZXF1ZW5jeSA9IDA7XHJcbiAgICAgICAgdGhpcy5WZXJib3NlID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5UZXN0ID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5WX3dpdGhfbG9hZCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuTGFzdFJlc3VsdCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuQWN0dWFsX1IgPSAwO1xyXG4gICAgICAgIHRoaXMuU2V0cG9pbnRfUiA9IDA7XHJcbiAgICAgICAgdGhpcy5NZW1mcmVlID0gMDtcclxuICAgICAgICB0aGlzLkVycm9yID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5Db21tYW5kQ3B0ID0gMDtcclxuICAgICAgICB0aGlzLlRpbWVzdGFtcCA9IG5ldyBEYXRlKCk7XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgcGFyc2UoYnVmKSB7XHJcbiAgICAgICAgY29uc3Qgb3V0cHV0ID0gbmV3IE5vdGlmaWNhdGlvbkRhdGEoKTtcclxuICAgICAgICBjb25zdCBkdiA9IG5ldyBEYXRhVmlldyhidWYpO1xyXG4gICAgICAgIGNvbnN0IHN0YXR1czEgPSBkdi5nZXRVaW50OCgxKTtcclxuICAgICAgICBjb25zdCBzdGF0dXMyID0gZHYuZ2V0VWludDgoMCk7XHJcbiAgICAgICAgb3V0cHV0LldpRmkgPSAoc3RhdHVzMSA+PiA2KSAmIDM7XHJcbiAgICAgICAgb3V0cHV0LlJlbGF5ID0gKHN0YXR1czEgPj4gNCkgJiAzO1xyXG4gICAgICAgIG91dHB1dC5CbHVldG9vdGggPSAoc3RhdHVzMSA+PiAxKSAmIDc7XHJcbiAgICAgICAgb3V0cHV0LkVycm9yID0gKHN0YXR1czIgJiA2NCkgIT0gMDtcclxuICAgICAgICBvdXRwdXQuRnJlcXVlbmN5ID0gKHN0YXR1czIgPj4gNSkgJiAzO1xyXG4gICAgICAgIG91dHB1dC5WZXJib3NlID0gKHN0YXR1czIgJiA4KSAhPSAwO1xyXG4gICAgICAgIG91dHB1dC5UZXN0ID0gKHN0YXR1czIgJiA0KSAhPSAwO1xyXG4gICAgICAgIG91dHB1dC5WX3dpdGhfbG9hZCA9IChzdGF0dXMyICYgMikgIT0gMDtcclxuICAgICAgICBvdXRwdXQuTGFzdFJlc3VsdCA9IChzdGF0dXMyICYgMSkgIT0gMDtcclxuICAgICAgICBvdXRwdXQuQWN0dWFsX1IgPSBkdi5nZXRVaW50MTYoMiwgdHJ1ZSk7XHJcbiAgICAgICAgb3V0cHV0LlNldHBvaW50X1IgPSBkdi5nZXRVaW50MTYoNCwgdHJ1ZSk7XHJcbiAgICAgICAgb3V0cHV0Lk1lbWZyZWUgPSBkdi5nZXRVaW50MzIoNiwgdHJ1ZSk7XHJcbiAgICAgICAgb3V0cHV0LkNvbW1hbmRDcHQgPSBkdi5nZXRVaW50OCgxMCk7XHJcbiAgICAgICAgcmV0dXJuIG91dHB1dDtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLk5vdGlmaWNhdGlvbkRhdGEgPSBOb3RpZmljYXRpb25EYXRhO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1Ob3RpZmljYXRpb25EYXRhLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuQmx1ZVRvb3RoSU9UVVVJRCA9IGV4cG9ydHMuTUFYX1VfR0VOID0gZXhwb3J0cy5SZXN1bHRDb2RlID0gZXhwb3J0cy5TdGF0ZSA9IGV4cG9ydHMuQm9hcmRNb2RlID0gZXhwb3J0cy5Db21tYW5kVHlwZSA9IHZvaWQgMDtcclxuLyoqXHJcbiAqIENvbW1hbmRzIHJlY29nbml6ZWQgYnkgSU9UZXN0aW5nIEJvYXJkIG1vZHVsZVxyXG4gKiAqL1xyXG5leHBvcnRzLkNvbW1hbmRUeXBlID0ge1xyXG4gICAgTk9ORV9VTktOT1dOOiAwLFxyXG4gICAgQ09NTUFORF9FTkFCTEVfV0lGSTogMHgwMSxcclxuICAgIENPTU1BTkRfRElTQUJMRV9XSUZJOiAweDAyLFxyXG4gICAgQ09NTUFORF9FTkFCTEVfV0VCUkVQTDogMHgwMyxcclxuICAgIENPTU1BTkRfRElTQUJMRV9XRUJSRVBMOiAweDA0LFxyXG4gICAgQ09NTUFORF9CUkVBSzogMHgwNSxcclxuICAgIENPTU1BTkRfTU9ERV9NRVRFUjogMHgwNixcclxuICAgIENPTU1BTkRfTU9ERV9SRVNJU1RPUlM6IDB4MDcsXHJcbiAgICBDT01NQU5EX01PREVfVl9MT0FEOiAweDA4LFxyXG4gICAgQ09NTUFORF9SRUJPT1Q6IDB4MDksXHJcbiAgICBDT01NQU5EX1JVTl9URVNUOiAweDBBLFxyXG4gICAgQ09NTUFORF9MSUdIVF9TTEVFUDogMHgwQixcclxuICAgIENPTU1BTkRfREVFUF9TTEVFUDogMHgwQyxcclxuICAgIENPTU1BTkRfTUVURVJfQ09NTUFORFM6IDB4MEQsXHJcbiAgICBDT01NQU5EX1NFVF9JTklUSUFMX01FVEVSX0NPTU06IDB4MEUsXHJcbiAgICBDT01NQU5EX1NFVF9XSUZJX05FVFdPUks6IDB4MEYsXHJcbiAgICBDT01NQU5EX1NFVF9XSUZJX1BBU1NXT1JEOiAweDEwLFxyXG4gICAgQ09NTUFORF9TRVRfSU5JVElBTF9CTFVFVE9PVEg6IDB4MTEsXHJcbiAgICBDT01NQU5EX1NFVF9JTklUSUFMX1dJRkk6IDB4MTIsXHJcbiAgICBDT01NQU5EX1NFVF9ERUVQU0xFRVBfTUlOOiAweDEzLFxyXG4gICAgQ09NTUFORF9TRVRfVkVSQk9TRTogMHgxNCxcclxuICAgIENPTU1BTkRfU0VUX0lOSVRJQUxfQ09NTUFORF9UWVBFOiAweDE1LFxyXG4gICAgQ09NTUFORF9TRVRfSU5JVElBTF9DT01NQU5EX1NFVFBPSU5UOiAweDE2LFxyXG4gICAgQ09NTUFORF9SX1RFU1Q6IDB4MTcsXHJcbiAgICBDT01NQU5EX1NFVF9DUFU6IDB4MTgsXHJcbiAgICBDT01NQU5EX1NFVF9PVEE6IDB4MTksXHJcbiAgICBDT01NQU5EX0NPTkZJR1VSRV9NRVRFUl9DT01NOiAweDIwLFxyXG4gICAgQ09NTUFORF9TRVRfQkxVRVRPT1RIX05BTUU6IDB4MjEsXHJcbiAgICBDT01NQU5EX1JFRlJFU0g6IDB4MjIsXHJcbiAgICBDT01NQU5EX0NMRUFSX0ZMQUdTOiAweDIzXHJcbn07XHJcbmV4cG9ydHMuQm9hcmRNb2RlID0ge1xyXG4gICAgTU9ERV9VTkRFRklORUQ6IDAsXHJcbiAgICBNT0RFX01FVEVSOiAxLFxyXG4gICAgTU9ERV9SRVNJU1RPUjogMixcclxuICAgIE1PREVfVl9XSVRIX0xPQUQ6IDMsXHJcbiAgICBNT0RFX1RFU1Q6IDRcclxufTtcclxuLypcclxuICogSW50ZXJuYWwgc3RhdGUgbWFjaGluZSBkZXNjcmlwdGlvbnNcclxuICovXHJcbmV4cG9ydHMuU3RhdGUgPSB7XHJcbiAgICBOT1RfQ09OTkVDVEVEOiAnTm90IGNvbm5lY3RlZCcsXHJcbiAgICBDT05ORUNUSU5HOiAnQmx1ZXRvb3RoIGRldmljZSBwYWlyaW5nLi4uJyxcclxuICAgIERFVklDRV9QQUlSRUQ6ICdEZXZpY2UgcGFpcmVkJyxcclxuICAgIFNVQlNDUklCSU5HOiAnQmx1ZXRvb3RoIGludGVyZmFjZXMgY29ubmVjdGluZy4uLicsXHJcbiAgICBJRExFOiAnSWRsZScsXHJcbiAgICBCVVNZOiAnQnVzeScsXHJcbiAgICBFUlJPUjogJ0Vycm9yJyxcclxuICAgIFNUT1BQSU5HOiAnQ2xvc2luZyBCVCBpbnRlcmZhY2VzLi4uJyxcclxuICAgIFNUT1BQRUQ6ICdTdG9wcGVkJyxcclxuICAgIE1FVEVSX0lOSVQ6ICdNZXRlciBjb25uZWN0ZWQnLFxyXG4gICAgTUVURVJfSU5JVElBTElaSU5HOiAnUmVhZGluZyBib2FyZCBzdGF0ZS4uLidcclxufTtcclxuZXhwb3J0cy5SZXN1bHRDb2RlID0ge1xyXG4gICAgRkFJTEVEX05PX1JFVFJZOiAxLFxyXG4gICAgRkFJTEVEX1NIT1VMRF9SRVRSWTogMixcclxuICAgIFNVQ0NFU1M6IDBcclxufTtcclxuZXhwb3J0cy5NQVhfVV9HRU4gPSAyNy4wOyAvLyBtYXhpbXVtIHZvbHRhZ2VcclxuLypcclxuICogQmx1ZXRvb3RoIGNvbnN0YW50c1xyXG4gKi9cclxuZXhwb3J0cy5CbHVlVG9vdGhJT1RVVUlEID0ge1xyXG4gICAgU2VydmljZVV1aWQ6ICcwMDAzY2RkNS0wMDAwLTEwMDAtODAwMC0wMDgwNWY5YjAxMzEnLFxyXG4gICAgU3RhdHVzQ2hhclV1aWQ6ICcwMDAzY2RkMy0wMDAwLTEwMDAtODAwMC0wMDgwNWY5YjAxMzEnLFxyXG4gICAgQ29tbWFuZENoYXJVdWlkOiAnMDAwM2NkZDQtMDAwMC0xMDAwLTgwMDAtMDA4MDVmOWIwMTMxJyAvLyBjb21tYW5kcyB0byB0aGUgYm9hcmRcclxufTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29uc3RhbnRzLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuQmx1ZVRvb3RoSU9UVVVJRCA9IGV4cG9ydHMuU3RhdGUgPSBleHBvcnRzLnNldExldmVsID0gZXhwb3J0cy5Db21tYW5kVHlwZSA9IGV4cG9ydHMuQ29tbWFuZCA9IGV4cG9ydHMuZHJpdmVyID0gZXhwb3J0cy5TaW1wbGVFeGVjdXRlSlNPTiA9IGV4cG9ydHMuRXhlY3V0ZUpTT04gPSBleHBvcnRzLkdldFN0YXRlSlNPTiA9IGV4cG9ydHMuR2V0U3RhdGUgPSBleHBvcnRzLlNpbXBsZUV4ZWN1dGUgPSBleHBvcnRzLkV4ZWN1dGUgPSBleHBvcnRzLlBhaXIgPSBleHBvcnRzLlN0b3AgPSB2b2lkIDA7XHJcbmNvbnN0IGNvbnN0YW50c18xID0gcmVxdWlyZShcIi4vY29uc3RhbnRzXCIpO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJTdGF0ZVwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gY29uc3RhbnRzXzEuU3RhdGU7IH0gfSk7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIkNvbW1hbmRUeXBlXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBjb25zdGFudHNfMS5Db21tYW5kVHlwZTsgfSB9KTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiQmx1ZVRvb3RoSU9UVVVJRFwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gY29uc3RhbnRzXzEuQmx1ZVRvb3RoSU9UVVVJRDsgfSB9KTtcclxuY29uc3QgQ29tbWFuZF8xID0gcmVxdWlyZShcIi4vQ29tbWFuZFwiKTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiQ29tbWFuZFwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gQ29tbWFuZF8xLkNvbW1hbmQ7IH0gfSk7XHJcbmNvbnN0IGxvZ2xldmVsXzEgPSByZXF1aXJlKFwibG9nbGV2ZWxcIik7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcInNldExldmVsXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBsb2dsZXZlbF8xLnNldExldmVsOyB9IH0pO1xyXG5jb25zdCBtZXRlclB1YmxpY0FQSV8xID0gcmVxdWlyZShcIi4vbWV0ZXJQdWJsaWNBUElcIik7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIlN0b3BcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIG1ldGVyUHVibGljQVBJXzEuU3RvcDsgfSB9KTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiUGFpclwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gbWV0ZXJQdWJsaWNBUElfMS5QYWlyOyB9IH0pO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJFeGVjdXRlXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBtZXRlclB1YmxpY0FQSV8xLkV4ZWN1dGU7IH0gfSk7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIlNpbXBsZUV4ZWN1dGVcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIG1ldGVyUHVibGljQVBJXzEuU2ltcGxlRXhlY3V0ZTsgfSB9KTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiR2V0U3RhdGVcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIG1ldGVyUHVibGljQVBJXzEuR2V0U3RhdGU7IH0gfSk7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIkdldFN0YXRlSlNPTlwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gbWV0ZXJQdWJsaWNBUElfMS5HZXRTdGF0ZUpTT047IH0gfSk7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIkV4ZWN1dGVKU09OXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBtZXRlclB1YmxpY0FQSV8xLkV4ZWN1dGVKU09OOyB9IH0pO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJTaW1wbGVFeGVjdXRlSlNPTlwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gbWV0ZXJQdWJsaWNBUElfMS5TaW1wbGVFeGVjdXRlSlNPTjsgfSB9KTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiZHJpdmVyXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBtZXRlclB1YmxpY0FQSV8xLmRyaXZlcjsgfSB9KTtcclxuLy8gRGVmaW5lcyBkZWZhdWx0IGxldmVsIG9uIHN0YXJ0dXBcclxuKDAsIGxvZ2xldmVsXzEuc2V0TGV2ZWwpKGxvZ2xldmVsXzEubGV2ZWxzLkVSUk9SLCB0cnVlKTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWV0ZXJBcGkuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbi8qXHJcbiAqIFRoaXMgZmlsZSBjb250YWlucyB0aGUgcHVibGljIEFQSSBvZiB0aGUgbWV0ZXIsIGkuZS4gdGhlIGZ1bmN0aW9ucyBkZXNpZ25lZFxyXG4gKiB0byBiZSBjYWxsZWQgZnJvbSB0aGlyZCBwYXJ0eSBjb2RlLlxyXG4gKiAxLSBQYWlyKCkgOiBib29sXHJcbiAqIDItIEV4ZWN1dGUoQ29tbWFuZCkgOiBib29sICsgSlNPTiB2ZXJzaW9uXHJcbiAqIDMtIFN0b3AoKSA6IGJvb2xcclxuICogNC0gR2V0U3RhdGUoKSA6IGFycmF5ICsgSlNPTiB2ZXJzaW9uXHJcbiAqIDUtIFNpbXBsZUV4ZWN1dGUoQ29tbWFuZCkgOiByZXR1cm5zIHRoZSB1cGRhdGVkIG1lYXN1cmVtZW50IG9yIG51bGxcclxuICovXHJcbnZhciBfX2ltcG9ydERlZmF1bHQgPSAodGhpcyAmJiB0aGlzLl9faW1wb3J0RGVmYXVsdCkgfHwgZnVuY3Rpb24gKG1vZCkge1xyXG4gICAgcmV0dXJuIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpID8gbW9kIDogeyBcImRlZmF1bHRcIjogbW9kIH07XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5TdG9wID0gZXhwb3J0cy5QYWlyID0gZXhwb3J0cy5FeGVjdXRlID0gZXhwb3J0cy5TaW1wbGVFeGVjdXRlID0gZXhwb3J0cy5TaW1wbGVFeGVjdXRlSlNPTiA9IGV4cG9ydHMuRXhlY3V0ZUpTT04gPSBleHBvcnRzLkdldFN0YXRlSlNPTiA9IGV4cG9ydHMuR2V0U3RhdGUgPSBleHBvcnRzLmRyaXZlciA9IHZvaWQgMDtcclxuY29uc3QgRHJpdmVyXzEgPSByZXF1aXJlKFwiLi9Ecml2ZXJcIik7XHJcbmNvbnN0IENvbW1hbmRSZXN1bHRfMSA9IHJlcXVpcmUoXCIuL0NvbW1hbmRSZXN1bHRcIik7XHJcbmNvbnN0IENvbW1hbmRfMSA9IHJlcXVpcmUoXCIuL0NvbW1hbmRcIik7XHJcbmNvbnN0IGNvbnN0YW50c18xID0gcmVxdWlyZShcIi4vY29uc3RhbnRzXCIpO1xyXG5jb25zdCB1dGlsc18xID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XHJcbmNvbnN0IGxvZ2xldmVsXzEgPSBfX2ltcG9ydERlZmF1bHQocmVxdWlyZShcImxvZ2xldmVsXCIpKTtcclxuLy8gVXNlZnVsIGluZm9ybWF0aW9uIGZvciBkZWJ1Z2dpbmcsIGV2ZW4gaWYgaXQgc2hvdWxkIG5vdCBiZSBleHBvc2VkXHJcbmV4cG9ydHMuZHJpdmVyID0gbmV3IERyaXZlcl8xLkRyaXZlcigpO1xyXG4vKipcclxuICogUmV0dXJucyBhIGNvcHkgb2YgdGhlIGN1cnJlbnQgc3RhdGVcclxuICogQHJldHVybnMge2FycmF5fSBzdGF0dXMgb2YgbWV0ZXJcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIEdldFN0YXRlKCkge1xyXG4gICAgbGV0IHJlYWR5ID0gZmFsc2U7XHJcbiAgICBsZXQgaW5pdGlhbGl6aW5nID0gZmFsc2U7XHJcbiAgICBzd2l0Y2ggKGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhdGUpIHtcclxuICAgICAgICAvLyBTdGF0ZXMgcmVxdWlyaW5nIHVzZXIgaW5wdXRcclxuICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLkVSUk9SOlxyXG4gICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuU1RPUFBFRDpcclxuICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLk5PVF9DT05ORUNURUQ6XHJcbiAgICAgICAgICAgIHJlYWR5ID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGluaXRpYWxpemluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLkJVU1k6XHJcbiAgICAgICAgY2FzZSBjb25zdGFudHNfMS5TdGF0ZS5JRExFOlxyXG4gICAgICAgICAgICByZWFkeSA9IHRydWU7XHJcbiAgICAgICAgICAgIGluaXRpYWxpemluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLkNPTk5FQ1RJTkc6XHJcbiAgICAgICAgY2FzZSBjb25zdGFudHNfMS5TdGF0ZS5ERVZJQ0VfUEFJUkVEOlxyXG4gICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuTUVURVJfSU5JVDpcclxuICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLk1FVEVSX0lOSVRJQUxJWklORzpcclxuICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLlNVQlNDUklCSU5HOlxyXG4gICAgICAgICAgICBpbml0aWFsaXppbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICByZWFkeSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICByZWFkeSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBpbml0aWFsaXppbmcgPSBmYWxzZTtcclxuICAgIH1cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgbGFzdFNldHBvaW50OiBleHBvcnRzLmRyaXZlci5idFN0YXRlLmxhc3RNZWFzdXJlLlNldHBvaW50X1IsXHJcbiAgICAgICAgbGFzdE1lYXN1cmU6IGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUubGFzdE1lYXN1cmUuQWN0dWFsX1IsXHJcbiAgICAgICAgZGV2aWNlTmFtZTogZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5idERldmljZSA/IGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuYnREZXZpY2UubmFtZSA6ICcnLFxyXG4gICAgICAgIGRldmljZVNlcmlhbDogZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5tZXRlcj8uc2VyaWFsLFxyXG4gICAgICAgIHN0YXRzOiBleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXRzLFxyXG4gICAgICAgIGRldmljZU1vZGU6IGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUubWV0ZXI/Lm1vZGUsXHJcbiAgICAgICAgc3RhdHVzOiBleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXRlLFxyXG4gICAgICAgIGJhdHRlcnlMZXZlbDogZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5tZXRlcj8uYmF0dGVyeSxcclxuICAgICAgICByZWFkeSxcclxuICAgICAgICBpbml0aWFsaXppbmdcclxuICAgIH07XHJcbn1cclxuZXhwb3J0cy5HZXRTdGF0ZSA9IEdldFN0YXRlO1xyXG4vKipcclxuICogUHJvdmlkZWQgZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBCbGF6b3JcclxuICogQHJldHVybnMge3N0cmluZ30gSlNPTiBzdGF0ZSBvYmplY3RcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIEdldFN0YXRlSlNPTigpIHtcclxuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhd2FpdCBHZXRTdGF0ZSgpKTtcclxufVxyXG5leHBvcnRzLkdldFN0YXRlSlNPTiA9IEdldFN0YXRlSlNPTjtcclxuLyoqXHJcbiAqIEV4ZWN1dGUgY29tbWFuZCB3aXRoIHNldHBvaW50cywgSlNPTiB2ZXJzaW9uXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBqc29uQ29tbWFuZCB0aGUgY29tbWFuZCB0byBleGVjdXRlXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEpTT04gY29tbWFuZCBvYmplY3RcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIEV4ZWN1dGVKU09OKGpzb25Db21tYW5kKSB7XHJcbiAgICBjb25zdCBjb21tYW5kID0gSlNPTi5wYXJzZShqc29uQ29tbWFuZCk7XHJcbiAgICAvLyBkZXNlcmlhbGl6ZWQgb2JqZWN0IGhhcyBsb3N0IGl0cyBtZXRob2RzLCBsZXQncyByZWNyZWF0ZSBhIGNvbXBsZXRlIG9uZS5cclxuICAgIGNvbnN0IGNvbW1hbmQyID0gQ29tbWFuZF8xLkNvbW1hbmQuQ3JlYXRlRm91clNQKGNvbW1hbmQudHlwZSwgY29tbWFuZC5zZXRwb2ludCwgY29tbWFuZC5zZXRwb2ludDIsIGNvbW1hbmQuc2V0cG9pbnQzLCBjb21tYW5kLnNldHBvaW50NCk7XHJcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXdhaXQgRXhlY3V0ZShjb21tYW5kMikpO1xyXG59XHJcbmV4cG9ydHMuRXhlY3V0ZUpTT04gPSBFeGVjdXRlSlNPTjtcclxuYXN5bmMgZnVuY3Rpb24gU2ltcGxlRXhlY3V0ZUpTT04oanNvbkNvbW1hbmQpIHtcclxuICAgIGNvbnN0IGNvbW1hbmQgPSBKU09OLnBhcnNlKGpzb25Db21tYW5kKTtcclxuICAgIC8vIGRlc2VyaWFsaXplZCBvYmplY3QgaGFzIGxvc3QgaXRzIG1ldGhvZHMsIGxldCdzIHJlY3JlYXRlIGEgY29tcGxldGUgb25lLlxyXG4gICAgY29uc3QgY29tbWFuZDIgPSBDb21tYW5kXzEuQ29tbWFuZC5DcmVhdGVGb3VyU1AoY29tbWFuZC50eXBlLCBjb21tYW5kLnNldHBvaW50LCBjb21tYW5kLnNldHBvaW50MiwgY29tbWFuZC5zZXRwb2ludDMsIGNvbW1hbmQuc2V0cG9pbnQ0KTtcclxuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhd2FpdCBTaW1wbGVFeGVjdXRlKGNvbW1hbmQyKSk7XHJcbn1cclxuZXhwb3J0cy5TaW1wbGVFeGVjdXRlSlNPTiA9IFNpbXBsZUV4ZWN1dGVKU09OO1xyXG4vKipcclxuICogRXhlY3V0ZSBhIGNvbW1hbmQgYW5kIHJldHVybnMgdGhlIG1lYXN1cmVtZW50IG9yIHNldHBvaW50IHdpdGggZXJyb3IgZmxhZyBhbmQgbWVzc2FnZVxyXG4gKiBAcGFyYW0ge0NvbW1hbmR9IGNvbW1hbmRcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIFNpbXBsZUV4ZWN1dGUoY29tbWFuZCkge1xyXG4gICAgY29uc3QgU0lNUExFX0VYRUNVVEVfVElNRU9VVF9TID0gNTtcclxuICAgIGNvbnN0IGNyID0gbmV3IENvbW1hbmRSZXN1bHRfMS5Db21tYW5kUmVzdWx0KCk7XHJcbiAgICBsb2dsZXZlbF8xLmRlZmF1bHQuaW5mbygnU2ltcGxlRXhlY3V0ZSBjYWxsZWQuLi4nKTtcclxuICAgIGlmIChjb21tYW5kID09PSBudWxsKSB7XHJcbiAgICAgICAgY3Iuc3VjY2VzcyA9IGZhbHNlO1xyXG4gICAgICAgIGNyLm1lc3NhZ2UgPSAnSW52YWxpZCBjb21tYW5kJztcclxuICAgICAgICByZXR1cm4gY3I7XHJcbiAgICB9XHJcbiAgICAvLyBSZWNyZWF0ZSB0aGUgb2JqZWN0IGFzIGl0IG1heSBoYXZlIGxvc3QgbWV0aG9kcyBkdWUgdG8gSlNPTlxyXG4gICAgY29tbWFuZCA9IENvbW1hbmRfMS5Db21tYW5kLkNyZWF0ZUZvdXJTUChjb21tYW5kLnR5cGUsIGNvbW1hbmQuc2V0cG9pbnQsIGNvbW1hbmQuc2V0cG9pbnQyLCBjb21tYW5kLnNldHBvaW50MywgY29tbWFuZC5zZXRwb2ludDQpO1xyXG4gICAgY29tbWFuZC5wZW5kaW5nID0gdHJ1ZTsgLy8gSW4gY2FzZSBjYWxsZXIgZG9lcyBub3Qgc2V0IHBlbmRpbmcgZmxhZ1xyXG4gICAgLy8gRmFpbCBpbW1lZGlhdGVseSBpZiBub3QgcGFpcmVkLlxyXG4gICAgaWYgKCFleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXJ0ZWQpIHtcclxuICAgICAgICBjci5zdWNjZXNzID0gZmFsc2U7XHJcbiAgICAgICAgY3IubWVzc2FnZSA9ICdEZXZpY2UgaXMgbm90IHBhaXJlZCc7XHJcbiAgICAgICAgbG9nbGV2ZWxfMS5kZWZhdWx0Lndhcm4oY3IubWVzc2FnZSk7XHJcbiAgICAgICAgcmV0dXJuIGNyO1xyXG4gICAgfVxyXG4gICAgLy8gQW5vdGhlciBjb21tYW5kIG1heSBiZSBwZW5kaW5nLlxyXG4gICAgaWYgKGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuY29tbWFuZCAhPSBudWxsICYmIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuY29tbWFuZC5wZW5kaW5nKSB7XHJcbiAgICAgICAgY3Iuc3VjY2VzcyA9IGZhbHNlO1xyXG4gICAgICAgIGNyLm1lc3NhZ2UgPSAnQW5vdGhlciBjb21tYW5kIGlzIHBlbmRpbmcnO1xyXG4gICAgICAgIGxvZ2xldmVsXzEuZGVmYXVsdC53YXJuKGNyLm1lc3NhZ2UpO1xyXG4gICAgICAgIHJldHVybiBjcjtcclxuICAgIH1cclxuICAgIC8vIFdhaXQgZm9yIGNvbXBsZXRpb24gb2YgdGhlIGNvbW1hbmQsIG9yIGhhbHQgb2YgdGhlIHN0YXRlIG1hY2hpbmVcclxuICAgIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuY29tbWFuZCA9IGNvbW1hbmQ7XHJcbiAgICBpZiAoY29tbWFuZCAhPSBudWxsKSB7XHJcbiAgICAgICAgYXdhaXQgKDAsIHV0aWxzXzEud2FpdEZvclRpbWVvdXQpKCgpID0+ICFjb21tYW5kLnBlbmRpbmcgfHwgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGF0ZSA9PSBjb25zdGFudHNfMS5TdGF0ZS5TVE9QUEVELCBTSU1QTEVfRVhFQ1VURV9USU1FT1VUX1MpO1xyXG4gICAgfVxyXG4gICAgLy8gQ2hlY2sgaWYgZXJyb3Igb3IgdGltZW91dHNcclxuICAgIGlmIChjb21tYW5kLmVycm9yIHx8IGNvbW1hbmQucGVuZGluZykge1xyXG4gICAgICAgIGNyLnN1Y2Nlc3MgPSBmYWxzZTtcclxuICAgICAgICBjci5tZXNzYWdlID0gJ0Vycm9yIHdoaWxlIGV4ZWN1dGluZyB0aGUgY29tbWFuZC4nO1xyXG4gICAgICAgIGxvZ2xldmVsXzEuZGVmYXVsdC53YXJuKGNyLm1lc3NhZ2UpO1xyXG4gICAgICAgIC8vIFJlc2V0IHRoZSBhY3RpdmUgY29tbWFuZFxyXG4gICAgICAgIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuY29tbWFuZCA9IG51bGw7XHJcbiAgICAgICAgcmV0dXJuIGNyO1xyXG4gICAgfVxyXG4gICAgLy8gU3RhdGUgaXMgdXBkYXRlZCBieSBleGVjdXRlIGNvbW1hbmQsIHNvIHdlIGNhbiB1c2UgYnRTdGF0ZSByaWdodCBhd2F5XHJcbiAgICBjci52YWx1ZSA9IGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUubGFzdE1lYXN1cmUuU2V0cG9pbnRfUjtcclxuICAgIGNyLnVuaXQgPSAnT2htcyc7XHJcbiAgICBjci5zZWNvbmRhcnlfdmFsdWUgPSBleHBvcnRzLmRyaXZlci5idFN0YXRlLmxhc3RNZWFzdXJlLkFjdHVhbF9SO1xyXG4gICAgY3Iuc2Vjb25kYXJ5X3VuaXQgPSAnT2htcyc7XHJcbiAgICBjci5zdWNjZXNzID0gdHJ1ZTtcclxuICAgIGNyLm1lc3NhZ2UgPSAnQ29tbWFuZCBleGVjdXRlZCBzdWNjZXNzZnVsbHknO1xyXG4gICAgcmV0dXJuIGNyO1xyXG59XHJcbmV4cG9ydHMuU2ltcGxlRXhlY3V0ZSA9IFNpbXBsZUV4ZWN1dGU7XHJcbi8qKlxyXG4gKiBFeHRlcm5hbCBpbnRlcmZhY2UgdG8gcmVxdWlyZSBhIGNvbW1hbmQgdG8gYmUgZXhlY3V0ZWQuXHJcbiAqIFRoZSBibHVldG9vdGggZGV2aWNlIHBhaXJpbmcgd2luZG93IHdpbGwgb3BlbiBpZiBkZXZpY2UgaXMgbm90IGNvbm5lY3RlZC5cclxuICogVGhpcyBtYXkgZmFpbCBpZiBjYWxsZWQgb3V0c2lkZSBhIHVzZXIgZ2VzdHVyZS5cclxuICogQHBhcmFtIHtDb21tYW5kfSBjb21tYW5kXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBFeGVjdXRlKGNvbW1hbmQpIHtcclxuICAgIGxvZ2xldmVsXzEuZGVmYXVsdC5pbmZvKCdFeGVjdXRlIGNhbGxlZC4uLicpO1xyXG4gICAgaWYgKGNvbW1hbmQgPT0gbnVsbCkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgY29tbWFuZCA9IENvbW1hbmRfMS5Db21tYW5kLkNyZWF0ZUZvdXJTUChjb21tYW5kLnR5cGUsIGNvbW1hbmQuc2V0cG9pbnQsIGNvbW1hbmQuc2V0cG9pbnQyLCBjb21tYW5kLnNldHBvaW50MywgY29tbWFuZC5zZXRwb2ludDQpO1xyXG4gICAgY29tbWFuZC5wZW5kaW5nID0gdHJ1ZTtcclxuICAgIGxldCBjcHQgPSAwO1xyXG4gICAgd2hpbGUgKGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuY29tbWFuZCAhPSBudWxsICYmIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuY29tbWFuZC5wZW5kaW5nICYmIGNwdCA8IDMwMCkge1xyXG4gICAgICAgIGxvZ2xldmVsXzEuZGVmYXVsdC5kZWJ1ZygnV2FpdGluZyBmb3IgY3VycmVudCBjb21tYW5kIHRvIGNvbXBsZXRlLi4uJyk7XHJcbiAgICAgICAgYXdhaXQgKDAsIHV0aWxzXzEuc2xlZXApKDEwMCk7XHJcbiAgICAgICAgY3B0Kys7XHJcbiAgICB9XHJcbiAgICBsb2dsZXZlbF8xLmRlZmF1bHQuaW5mbygnU2V0dGluZyBuZXcgY29tbWFuZCA6JyArIGNvbW1hbmQpO1xyXG4gICAgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5jb21tYW5kID0gY29tbWFuZDtcclxuICAgIC8vIFN0YXJ0IHRoZSByZWd1bGFyIHN0YXRlIG1hY2hpbmVcclxuICAgIGlmICghZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGFydGVkKSB7XHJcbiAgICAgICAgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLk5PVF9DT05ORUNURUQ7XHJcbiAgICAgICAgYXdhaXQgZXhwb3J0cy5kcml2ZXIuc3RhdGVNYWNoaW5lKCk7XHJcbiAgICB9XHJcbiAgICAvLyBXYWl0IGZvciBjb21wbGV0aW9uIG9mIHRoZSBjb21tYW5kLCBvciBoYWx0IG9mIHRoZSBzdGF0ZSBtYWNoaW5lXHJcbiAgICBpZiAoY29tbWFuZCAhPSBudWxsKSB7XHJcbiAgICAgICAgYXdhaXQgKDAsIHV0aWxzXzEud2FpdEZvcikoKCkgPT4gIWNvbW1hbmQucGVuZGluZyB8fCBleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXRlID09IGNvbnN0YW50c18xLlN0YXRlLlNUT1BQRUQpO1xyXG4gICAgfVxyXG4gICAgLy8gUmV0dXJuIHRoZSBjb21tYW5kIG9iamVjdCByZXN1bHRcclxuICAgIHJldHVybiBjb21tYW5kO1xyXG59XHJcbmV4cG9ydHMuRXhlY3V0ZSA9IEV4ZWN1dGU7XHJcbi8qKlxyXG4gKiBNVVNUIEJFIENBTExFRCBGUk9NIEEgVVNFUiBHRVNUVVJFIEVWRU5UIEhBTkRMRVJcclxuICAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmIG1ldGVyIGlzIHJlYWR5IHRvIGV4ZWN1dGUgY29tbWFuZFxyXG4gKiAqL1xyXG5hc3luYyBmdW5jdGlvbiBQYWlyKGZvcmNlU2VsZWN0aW9uID0gZmFsc2UpIHtcclxuICAgIGxvZ2xldmVsXzEuZGVmYXVsdC5pbmZvKCdQYWlyKCcgKyBmb3JjZVNlbGVjdGlvbiArICcpIGNhbGxlZC4uLicpO1xyXG4gICAgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5vcHRpb25zLmZvcmNlRGV2aWNlU2VsZWN0aW9uID0gZm9yY2VTZWxlY3Rpb247XHJcbiAgICBpZiAoIWV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhcnRlZCkge1xyXG4gICAgICAgIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5OT1RfQ09OTkVDVEVEO1xyXG4gICAgICAgIGF3YWl0IGV4cG9ydHMuZHJpdmVyLnN0YXRlTWFjaGluZSgpOyAvLyBTdGFydCBpdFxyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGF0ZSA9PSBjb25zdGFudHNfMS5TdGF0ZS5FUlJPUikge1xyXG4gICAgICAgIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5OT1RfQ09OTkVDVEVEOyAvLyBUcnkgdG8gcmVzdGFydFxyXG4gICAgfVxyXG4gICAgYXdhaXQgKDAsIHV0aWxzXzEud2FpdEZvcikoKCkgPT4gZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGF0ZSA9PSBjb25zdGFudHNfMS5TdGF0ZS5JRExFIHx8IGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhdGUgPT0gY29uc3RhbnRzXzEuU3RhdGUuU1RPUFBFRCk7XHJcbiAgICBsb2dsZXZlbF8xLmRlZmF1bHQuaW5mbygnUGFpcmluZyBjb21wbGV0ZWQsIHN0YXRlIDonLCBleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXRlKTtcclxuICAgIHJldHVybiAoZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGF0ZSAhPSBjb25zdGFudHNfMS5TdGF0ZS5TVE9QUEVEKTtcclxufVxyXG5leHBvcnRzLlBhaXIgPSBQYWlyO1xyXG4vKipcclxuICogU3RvcHMgdGhlIHN0YXRlIG1hY2hpbmUgYW5kIGRpc2Nvbm5lY3RzIGJsdWV0b290aC5cclxuICogKi9cclxuYXN5bmMgZnVuY3Rpb24gU3RvcCgpIHtcclxuICAgIGxvZ2xldmVsXzEuZGVmYXVsdC5pbmZvKCdTdG9wIHJlcXVlc3QgcmVjZWl2ZWQnKTtcclxuICAgIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RvcFJlcXVlc3QgPSB0cnVlO1xyXG4gICAgYXdhaXQgKDAsIHV0aWxzXzEuc2xlZXApKDEwMCk7XHJcbiAgICB3aGlsZSAoZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGFydGVkIHx8IChleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXRlICE9IGNvbnN0YW50c18xLlN0YXRlLlNUT1BQRUQgJiYgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGF0ZSAhPSBjb25zdGFudHNfMS5TdGF0ZS5OT1RfQ09OTkVDVEVEKSkge1xyXG4gICAgICAgIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RvcFJlcXVlc3QgPSB0cnVlO1xyXG4gICAgICAgIGF3YWl0ICgwLCB1dGlsc18xLnNsZWVwKSgxMDApO1xyXG4gICAgfVxyXG4gICAgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5jb21tYW5kID0gbnVsbDtcclxuICAgIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RvcFJlcXVlc3QgPSBmYWxzZTtcclxuICAgIGxvZ2xldmVsXzEuZGVmYXVsdC53YXJuKCdTdG9wcGVkIG9uIHJlcXVlc3QuJyk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxufVxyXG5leHBvcnRzLlN0b3AgPSBTdG9wO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1tZXRlclB1YmxpY0FQSS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLmJ1ZjJoZXggPSBleHBvcnRzLlBhcnNlID0gZXhwb3J0cy53YWl0Rm9yVGltZW91dCA9IGV4cG9ydHMud2FpdEZvciA9IGV4cG9ydHMuc2xlZXAgPSB2b2lkIDA7XHJcbmNvbnN0IHNsZWVwID0gYXN5bmMgKG1zKSA9PiBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgbXMpKTtcclxuZXhwb3J0cy5zbGVlcCA9IHNsZWVwO1xyXG5jb25zdCB3YWl0Rm9yID0gYXN5bmMgZnVuY3Rpb24gd2FpdEZvcihmKSB7XHJcbiAgICB3aGlsZSAoIWYoKSlcclxuICAgICAgICBhd2FpdCAoMCwgZXhwb3J0cy5zbGVlcCkoMTAwICsgTWF0aC5yYW5kb20oKSAqIDI1KTtcclxuICAgIHJldHVybiBmKCk7XHJcbn07XHJcbmV4cG9ydHMud2FpdEZvciA9IHdhaXRGb3I7XHJcbmNvbnN0IHdhaXRGb3JUaW1lb3V0ID0gYXN5bmMgZnVuY3Rpb24gd2FpdEZvcihmLCB0aW1lb3V0U2VjKSB7XHJcbiAgICBsZXQgdG90YWxUaW1lTXMgPSAwO1xyXG4gICAgd2hpbGUgKCFmKCkgJiYgdG90YWxUaW1lTXMgPCB0aW1lb3V0U2VjICogMTAwMCkge1xyXG4gICAgICAgIGNvbnN0IGRlbGF5TXMgPSAxMDAgKyBNYXRoLnJhbmRvbSgpICogMjU7XHJcbiAgICAgICAgdG90YWxUaW1lTXMgKz0gZGVsYXlNcztcclxuICAgICAgICBhd2FpdCAoMCwgZXhwb3J0cy5zbGVlcCkoZGVsYXlNcyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZigpO1xyXG59O1xyXG5leHBvcnRzLndhaXRGb3JUaW1lb3V0ID0gd2FpdEZvclRpbWVvdXQ7XHJcbi8qKlxyXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gY29udmVydCBhIHZhbHVlIGludG8gYW4gZW51bSB2YWx1ZVxyXG5cclxuICovXHJcbmZ1bmN0aW9uIFBhcnNlKGVudW10eXBlLCBlbnVtdmFsdWUpIHtcclxuICAgIGZvciAoY29uc3QgZW51bU5hbWUgaW4gZW51bXR5cGUpIHtcclxuICAgICAgICBpZiAoZW51bXR5cGVbZW51bU5hbWVdID09IGVudW12YWx1ZSkge1xyXG4gICAgICAgICAgICAvKiBqc2hpbnQgLVcwNjEgKi9cclxuICAgICAgICAgICAgcmV0dXJuIGV2YWwoZW51bXR5cGUgKyAnLicgKyBlbnVtTmFtZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGw7XHJcbn1cclxuZXhwb3J0cy5QYXJzZSA9IFBhcnNlO1xyXG4vKipcclxuICogSGVscGVyIGZ1bmN0aW9uIHRvIGR1bXAgYXJyYXlidWZmZXIgYXMgaGV4IHN0cmluZ1xyXG4gKi9cclxuZnVuY3Rpb24gYnVmMmhleChidWZmZXIpIHtcclxuICAgIHJldHVybiBbLi4ubmV3IFVpbnQ4QXJyYXkoYnVmZmVyKV1cclxuICAgICAgICAubWFwKHggPT4geC50b1N0cmluZygxNikucGFkU3RhcnQoMiwgJzAnKSlcclxuICAgICAgICAuam9pbignICcpO1xyXG59XHJcbmV4cG9ydHMuYnVmMmhleCA9IGJ1ZjJoZXg7XHJcbmZ1bmN0aW9uIGhleDJidWYoaW5wdXQpIHtcclxuICAgIGlmICh0eXBlb2YgaW5wdXQgIT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgaW5wdXQgdG8gYmUgYSBzdHJpbmcnKTtcclxuICAgIH1cclxuICAgIGNvbnN0IGhleHN0ciA9IGlucHV0LnJlcGxhY2UoL1xccysvZywgJycpO1xyXG4gICAgaWYgKChoZXhzdHIubGVuZ3RoICUgMikgIT09IDApIHtcclxuICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignRXhwZWN0ZWQgc3RyaW5nIHRvIGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGNoYXJhY3RlcnMnKTtcclxuICAgIH1cclxuICAgIGNvbnN0IHZpZXcgPSBuZXcgVWludDhBcnJheShoZXhzdHIubGVuZ3RoIC8gMik7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGhleHN0ci5sZW5ndGg7IGkgKz0gMikge1xyXG4gICAgICAgIHZpZXdbaSAvIDJdID0gcGFyc2VJbnQoaGV4c3RyLnN1YnN0cmluZyhpLCBpICsgMiksIDE2KTtcclxuICAgIH1cclxuICAgIHJldHVybiB2aWV3LmJ1ZmZlcjtcclxufVxyXG4vLyMgc291cmNlTWFwcGluZ1VSTD11dGlscy5qcy5tYXAiLCIvKlxuKiBsb2dsZXZlbCAtIGh0dHBzOi8vZ2l0aHViLmNvbS9waW10ZXJyeS9sb2dsZXZlbFxuKlxuKiBDb3B5cmlnaHQgKGMpIDIwMTMgVGltIFBlcnJ5XG4qIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiovXG4oZnVuY3Rpb24gKHJvb3QsIGRlZmluaXRpb24pIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShkZWZpbml0aW9uKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZGVmaW5pdGlvbigpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJvb3QubG9nID0gZGVmaW5pdGlvbigpO1xuICAgIH1cbn0odGhpcywgZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgLy8gU2xpZ2h0bHkgZHViaW91cyB0cmlja3MgdG8gY3V0IGRvd24gbWluaW1pemVkIGZpbGUgc2l6ZVxuICAgIHZhciBub29wID0gZnVuY3Rpb24oKSB7fTtcbiAgICB2YXIgdW5kZWZpbmVkVHlwZSA9IFwidW5kZWZpbmVkXCI7XG4gICAgdmFyIGlzSUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gdW5kZWZpbmVkVHlwZSkgJiYgKHR5cGVvZiB3aW5kb3cubmF2aWdhdG9yICE9PSB1bmRlZmluZWRUeXBlKSAmJiAoXG4gICAgICAgIC9UcmlkZW50XFwvfE1TSUUgLy50ZXN0KHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50KVxuICAgICk7XG5cbiAgICB2YXIgbG9nTWV0aG9kcyA9IFtcbiAgICAgICAgXCJ0cmFjZVwiLFxuICAgICAgICBcImRlYnVnXCIsXG4gICAgICAgIFwiaW5mb1wiLFxuICAgICAgICBcIndhcm5cIixcbiAgICAgICAgXCJlcnJvclwiXG4gICAgXTtcblxuICAgIC8vIENyb3NzLWJyb3dzZXIgYmluZCBlcXVpdmFsZW50IHRoYXQgd29ya3MgYXQgbGVhc3QgYmFjayB0byBJRTZcbiAgICBmdW5jdGlvbiBiaW5kTWV0aG9kKG9iaiwgbWV0aG9kTmFtZSkge1xuICAgICAgICB2YXIgbWV0aG9kID0gb2JqW21ldGhvZE5hbWVdO1xuICAgICAgICBpZiAodHlwZW9mIG1ldGhvZC5iaW5kID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICByZXR1cm4gbWV0aG9kLmJpbmQob2JqKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kLmNhbGwobWV0aG9kLCBvYmopO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIC8vIE1pc3NpbmcgYmluZCBzaGltIG9yIElFOCArIE1vZGVybml6ciwgZmFsbGJhY2sgdG8gd3JhcHBpbmdcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBGdW5jdGlvbi5wcm90b3R5cGUuYXBwbHkuYXBwbHkobWV0aG9kLCBbb2JqLCBhcmd1bWVudHNdKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gVHJhY2UoKSBkb2Vzbid0IHByaW50IHRoZSBtZXNzYWdlIGluIElFLCBzbyBmb3IgdGhhdCBjYXNlIHdlIG5lZWQgdG8gd3JhcCBpdFxuICAgIGZ1bmN0aW9uIHRyYWNlRm9ySUUoKSB7XG4gICAgICAgIGlmIChjb25zb2xlLmxvZykge1xuICAgICAgICAgICAgaWYgKGNvbnNvbGUubG9nLmFwcGx5KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSW4gb2xkIElFLCBuYXRpdmUgY29uc29sZSBtZXRob2RzIHRoZW1zZWx2ZXMgZG9uJ3QgaGF2ZSBhcHBseSgpLlxuICAgICAgICAgICAgICAgIEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseS5hcHBseShjb25zb2xlLmxvZywgW2NvbnNvbGUsIGFyZ3VtZW50c10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjb25zb2xlLnRyYWNlKSBjb25zb2xlLnRyYWNlKCk7XG4gICAgfVxuXG4gICAgLy8gQnVpbGQgdGhlIGJlc3QgbG9nZ2luZyBtZXRob2QgcG9zc2libGUgZm9yIHRoaXMgZW52XG4gICAgLy8gV2hlcmV2ZXIgcG9zc2libGUgd2Ugd2FudCB0byBiaW5kLCBub3Qgd3JhcCwgdG8gcHJlc2VydmUgc3RhY2sgdHJhY2VzXG4gICAgZnVuY3Rpb24gcmVhbE1ldGhvZChtZXRob2ROYW1lKSB7XG4gICAgICAgIGlmIChtZXRob2ROYW1lID09PSAnZGVidWcnKSB7XG4gICAgICAgICAgICBtZXRob2ROYW1lID0gJ2xvZyc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgPT09IHVuZGVmaW5lZFR5cGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gTm8gbWV0aG9kIHBvc3NpYmxlLCBmb3Igbm93IC0gZml4ZWQgbGF0ZXIgYnkgZW5hYmxlTG9nZ2luZ1doZW5Db25zb2xlQXJyaXZlc1xuICAgICAgICB9IGVsc2UgaWYgKG1ldGhvZE5hbWUgPT09ICd0cmFjZScgJiYgaXNJRSkge1xuICAgICAgICAgICAgcmV0dXJuIHRyYWNlRm9ySUU7XG4gICAgICAgIH0gZWxzZSBpZiAoY29uc29sZVttZXRob2ROYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gYmluZE1ldGhvZChjb25zb2xlLCBtZXRob2ROYW1lKTtcbiAgICAgICAgfSBlbHNlIGlmIChjb25zb2xlLmxvZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gYmluZE1ldGhvZChjb25zb2xlLCAnbG9nJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbm9vcDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoZXNlIHByaXZhdGUgZnVuY3Rpb25zIGFsd2F5cyBuZWVkIGB0aGlzYCB0byBiZSBzZXQgcHJvcGVybHlcblxuICAgIGZ1bmN0aW9uIHJlcGxhY2VMb2dnaW5nTWV0aG9kcyhsZXZlbCwgbG9nZ2VyTmFtZSkge1xuICAgICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxvZ01ldGhvZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBtZXRob2ROYW1lID0gbG9nTWV0aG9kc1tpXTtcbiAgICAgICAgICAgIHRoaXNbbWV0aG9kTmFtZV0gPSAoaSA8IGxldmVsKSA/XG4gICAgICAgICAgICAgICAgbm9vcCA6XG4gICAgICAgICAgICAgICAgdGhpcy5tZXRob2RGYWN0b3J5KG1ldGhvZE5hbWUsIGxldmVsLCBsb2dnZXJOYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERlZmluZSBsb2cubG9nIGFzIGFuIGFsaWFzIGZvciBsb2cuZGVidWdcbiAgICAgICAgdGhpcy5sb2cgPSB0aGlzLmRlYnVnO1xuICAgIH1cblxuICAgIC8vIEluIG9sZCBJRSB2ZXJzaW9ucywgdGhlIGNvbnNvbGUgaXNuJ3QgcHJlc2VudCB1bnRpbCB5b3UgZmlyc3Qgb3BlbiBpdC5cbiAgICAvLyBXZSBidWlsZCByZWFsTWV0aG9kKCkgcmVwbGFjZW1lbnRzIGhlcmUgdGhhdCByZWdlbmVyYXRlIGxvZ2dpbmcgbWV0aG9kc1xuICAgIGZ1bmN0aW9uIGVuYWJsZUxvZ2dpbmdXaGVuQ29uc29sZUFycml2ZXMobWV0aG9kTmFtZSwgbGV2ZWwsIGxvZ2dlck5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gdW5kZWZpbmVkVHlwZSkge1xuICAgICAgICAgICAgICAgIHJlcGxhY2VMb2dnaW5nTWV0aG9kcy5jYWxsKHRoaXMsIGxldmVsLCBsb2dnZXJOYW1lKTtcbiAgICAgICAgICAgICAgICB0aGlzW21ldGhvZE5hbWVdLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gQnkgZGVmYXVsdCwgd2UgdXNlIGNsb3NlbHkgYm91bmQgcmVhbCBtZXRob2RzIHdoZXJldmVyIHBvc3NpYmxlLCBhbmRcbiAgICAvLyBvdGhlcndpc2Ugd2Ugd2FpdCBmb3IgYSBjb25zb2xlIHRvIGFwcGVhciwgYW5kIHRoZW4gdHJ5IGFnYWluLlxuICAgIGZ1bmN0aW9uIGRlZmF1bHRNZXRob2RGYWN0b3J5KG1ldGhvZE5hbWUsIGxldmVsLCBsb2dnZXJOYW1lKSB7XG4gICAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICAgIHJldHVybiByZWFsTWV0aG9kKG1ldGhvZE5hbWUpIHx8XG4gICAgICAgICAgICAgICBlbmFibGVMb2dnaW5nV2hlbkNvbnNvbGVBcnJpdmVzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gTG9nZ2VyKG5hbWUsIGRlZmF1bHRMZXZlbCwgZmFjdG9yeSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIGN1cnJlbnRMZXZlbDtcbiAgICAgIGRlZmF1bHRMZXZlbCA9IGRlZmF1bHRMZXZlbCA9PSBudWxsID8gXCJXQVJOXCIgOiBkZWZhdWx0TGV2ZWw7XG5cbiAgICAgIHZhciBzdG9yYWdlS2V5ID0gXCJsb2dsZXZlbFwiO1xuICAgICAgaWYgKHR5cGVvZiBuYW1lID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIHN0b3JhZ2VLZXkgKz0gXCI6XCIgKyBuYW1lO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgbmFtZSA9PT0gXCJzeW1ib2xcIikge1xuICAgICAgICBzdG9yYWdlS2V5ID0gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBwZXJzaXN0TGV2ZWxJZlBvc3NpYmxlKGxldmVsTnVtKSB7XG4gICAgICAgICAgdmFyIGxldmVsTmFtZSA9IChsb2dNZXRob2RzW2xldmVsTnVtXSB8fCAnc2lsZW50JykudG9VcHBlckNhc2UoKTtcblxuICAgICAgICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSB1bmRlZmluZWRUeXBlIHx8ICFzdG9yYWdlS2V5KSByZXR1cm47XG5cbiAgICAgICAgICAvLyBVc2UgbG9jYWxTdG9yYWdlIGlmIGF2YWlsYWJsZVxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Vbc3RvcmFnZUtleV0gPSBsZXZlbE5hbWU7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9IGNhdGNoIChpZ25vcmUpIHt9XG5cbiAgICAgICAgICAvLyBVc2Ugc2Vzc2lvbiBjb29raWUgYXMgZmFsbGJhY2tcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICB3aW5kb3cuZG9jdW1lbnQuY29va2llID1cbiAgICAgICAgICAgICAgICBlbmNvZGVVUklDb21wb25lbnQoc3RvcmFnZUtleSkgKyBcIj1cIiArIGxldmVsTmFtZSArIFwiO1wiO1xuICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZ2V0UGVyc2lzdGVkTGV2ZWwoKSB7XG4gICAgICAgICAgdmFyIHN0b3JlZExldmVsO1xuXG4gICAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09IHVuZGVmaW5lZFR5cGUgfHwgIXN0b3JhZ2VLZXkpIHJldHVybjtcblxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHN0b3JlZExldmVsID0gd2luZG93LmxvY2FsU3RvcmFnZVtzdG9yYWdlS2V5XTtcbiAgICAgICAgICB9IGNhdGNoIChpZ25vcmUpIHt9XG5cbiAgICAgICAgICAvLyBGYWxsYmFjayB0byBjb29raWVzIGlmIGxvY2FsIHN0b3JhZ2UgZ2l2ZXMgdXMgbm90aGluZ1xuICAgICAgICAgIGlmICh0eXBlb2Ygc3RvcmVkTGV2ZWwgPT09IHVuZGVmaW5lZFR5cGUpIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgIHZhciBjb29raWUgPSB3aW5kb3cuZG9jdW1lbnQuY29va2llO1xuICAgICAgICAgICAgICAgICAgdmFyIGxvY2F0aW9uID0gY29va2llLmluZGV4T2YoXG4gICAgICAgICAgICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHN0b3JhZ2VLZXkpICsgXCI9XCIpO1xuICAgICAgICAgICAgICAgICAgaWYgKGxvY2F0aW9uICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgIHN0b3JlZExldmVsID0gL14oW147XSspLy5leGVjKGNvb2tpZS5zbGljZShsb2NhdGlvbikpWzFdO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGNhdGNoIChpZ25vcmUpIHt9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gSWYgdGhlIHN0b3JlZCBsZXZlbCBpcyBub3QgdmFsaWQsIHRyZWF0IGl0IGFzIGlmIG5vdGhpbmcgd2FzIHN0b3JlZC5cbiAgICAgICAgICBpZiAoc2VsZi5sZXZlbHNbc3RvcmVkTGV2ZWxdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgc3RvcmVkTGV2ZWwgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHN0b3JlZExldmVsO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBjbGVhclBlcnNpc3RlZExldmVsKCkge1xuICAgICAgICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSB1bmRlZmluZWRUeXBlIHx8ICFzdG9yYWdlS2V5KSByZXR1cm47XG5cbiAgICAgICAgICAvLyBVc2UgbG9jYWxTdG9yYWdlIGlmIGF2YWlsYWJsZVxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShzdG9yYWdlS2V5KTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cblxuICAgICAgICAgIC8vIFVzZSBzZXNzaW9uIGNvb2tpZSBhcyBmYWxsYmFja1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHdpbmRvdy5kb2N1bWVudC5jb29raWUgPVxuICAgICAgICAgICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChzdG9yYWdlS2V5KSArIFwiPTsgZXhwaXJlcz1UaHUsIDAxIEphbiAxOTcwIDAwOjAwOjAwIFVUQ1wiO1xuICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cbiAgICAgIH1cblxuICAgICAgLypcbiAgICAgICAqXG4gICAgICAgKiBQdWJsaWMgbG9nZ2VyIEFQSSAtIHNlZSBodHRwczovL2dpdGh1Yi5jb20vcGltdGVycnkvbG9nbGV2ZWwgZm9yIGRldGFpbHNcbiAgICAgICAqXG4gICAgICAgKi9cblxuICAgICAgc2VsZi5uYW1lID0gbmFtZTtcblxuICAgICAgc2VsZi5sZXZlbHMgPSB7IFwiVFJBQ0VcIjogMCwgXCJERUJVR1wiOiAxLCBcIklORk9cIjogMiwgXCJXQVJOXCI6IDMsXG4gICAgICAgICAgXCJFUlJPUlwiOiA0LCBcIlNJTEVOVFwiOiA1fTtcblxuICAgICAgc2VsZi5tZXRob2RGYWN0b3J5ID0gZmFjdG9yeSB8fCBkZWZhdWx0TWV0aG9kRmFjdG9yeTtcblxuICAgICAgc2VsZi5nZXRMZXZlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gY3VycmVudExldmVsO1xuICAgICAgfTtcblxuICAgICAgc2VsZi5zZXRMZXZlbCA9IGZ1bmN0aW9uIChsZXZlbCwgcGVyc2lzdCkge1xuICAgICAgICAgIGlmICh0eXBlb2YgbGV2ZWwgPT09IFwic3RyaW5nXCIgJiYgc2VsZi5sZXZlbHNbbGV2ZWwudG9VcHBlckNhc2UoKV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBsZXZlbCA9IHNlbGYubGV2ZWxzW2xldmVsLnRvVXBwZXJDYXNlKCldO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGxldmVsID09PSBcIm51bWJlclwiICYmIGxldmVsID49IDAgJiYgbGV2ZWwgPD0gc2VsZi5sZXZlbHMuU0lMRU5UKSB7XG4gICAgICAgICAgICAgIGN1cnJlbnRMZXZlbCA9IGxldmVsO1xuICAgICAgICAgICAgICBpZiAocGVyc2lzdCAhPT0gZmFsc2UpIHsgIC8vIGRlZmF1bHRzIHRvIHRydWVcbiAgICAgICAgICAgICAgICAgIHBlcnNpc3RMZXZlbElmUG9zc2libGUobGV2ZWwpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJlcGxhY2VMb2dnaW5nTWV0aG9kcy5jYWxsKHNlbGYsIGxldmVsLCBuYW1lKTtcbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlID09PSB1bmRlZmluZWRUeXBlICYmIGxldmVsIDwgc2VsZi5sZXZlbHMuU0lMRU5UKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gXCJObyBjb25zb2xlIGF2YWlsYWJsZSBmb3IgbG9nZ2luZ1wiO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3cgXCJsb2cuc2V0TGV2ZWwoKSBjYWxsZWQgd2l0aCBpbnZhbGlkIGxldmVsOiBcIiArIGxldmVsO1xuICAgICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHNlbGYuc2V0RGVmYXVsdExldmVsID0gZnVuY3Rpb24gKGxldmVsKSB7XG4gICAgICAgICAgZGVmYXVsdExldmVsID0gbGV2ZWw7XG4gICAgICAgICAgaWYgKCFnZXRQZXJzaXN0ZWRMZXZlbCgpKSB7XG4gICAgICAgICAgICAgIHNlbGYuc2V0TGV2ZWwobGV2ZWwsIGZhbHNlKTtcbiAgICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBzZWxmLnJlc2V0TGV2ZWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgc2VsZi5zZXRMZXZlbChkZWZhdWx0TGV2ZWwsIGZhbHNlKTtcbiAgICAgICAgICBjbGVhclBlcnNpc3RlZExldmVsKCk7XG4gICAgICB9O1xuXG4gICAgICBzZWxmLmVuYWJsZUFsbCA9IGZ1bmN0aW9uKHBlcnNpc3QpIHtcbiAgICAgICAgICBzZWxmLnNldExldmVsKHNlbGYubGV2ZWxzLlRSQUNFLCBwZXJzaXN0KTtcbiAgICAgIH07XG5cbiAgICAgIHNlbGYuZGlzYWJsZUFsbCA9IGZ1bmN0aW9uKHBlcnNpc3QpIHtcbiAgICAgICAgICBzZWxmLnNldExldmVsKHNlbGYubGV2ZWxzLlNJTEVOVCwgcGVyc2lzdCk7XG4gICAgICB9O1xuXG4gICAgICAvLyBJbml0aWFsaXplIHdpdGggdGhlIHJpZ2h0IGxldmVsXG4gICAgICB2YXIgaW5pdGlhbExldmVsID0gZ2V0UGVyc2lzdGVkTGV2ZWwoKTtcbiAgICAgIGlmIChpbml0aWFsTGV2ZWwgPT0gbnVsbCkge1xuICAgICAgICAgIGluaXRpYWxMZXZlbCA9IGRlZmF1bHRMZXZlbDtcbiAgICAgIH1cbiAgICAgIHNlbGYuc2V0TGV2ZWwoaW5pdGlhbExldmVsLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgLypcbiAgICAgKlxuICAgICAqIFRvcC1sZXZlbCBBUElcbiAgICAgKlxuICAgICAqL1xuXG4gICAgdmFyIGRlZmF1bHRMb2dnZXIgPSBuZXcgTG9nZ2VyKCk7XG5cbiAgICB2YXIgX2xvZ2dlcnNCeU5hbWUgPSB7fTtcbiAgICBkZWZhdWx0TG9nZ2VyLmdldExvZ2dlciA9IGZ1bmN0aW9uIGdldExvZ2dlcihuYW1lKSB7XG4gICAgICAgIGlmICgodHlwZW9mIG5hbWUgIT09IFwic3ltYm9sXCIgJiYgdHlwZW9mIG5hbWUgIT09IFwic3RyaW5nXCIpIHx8IG5hbWUgPT09IFwiXCIpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiWW91IG11c3Qgc3VwcGx5IGEgbmFtZSB3aGVuIGNyZWF0aW5nIGEgbG9nZ2VyLlwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBsb2dnZXIgPSBfbG9nZ2Vyc0J5TmFtZVtuYW1lXTtcbiAgICAgICAgaWYgKCFsb2dnZXIpIHtcbiAgICAgICAgICBsb2dnZXIgPSBfbG9nZ2Vyc0J5TmFtZVtuYW1lXSA9IG5ldyBMb2dnZXIoXG4gICAgICAgICAgICBuYW1lLCBkZWZhdWx0TG9nZ2VyLmdldExldmVsKCksIGRlZmF1bHRMb2dnZXIubWV0aG9kRmFjdG9yeSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxvZ2dlcjtcbiAgICB9O1xuXG4gICAgLy8gR3JhYiB0aGUgY3VycmVudCBnbG9iYWwgbG9nIHZhcmlhYmxlIGluIGNhc2Ugb2Ygb3ZlcndyaXRlXG4gICAgdmFyIF9sb2cgPSAodHlwZW9mIHdpbmRvdyAhPT0gdW5kZWZpbmVkVHlwZSkgPyB3aW5kb3cubG9nIDogdW5kZWZpbmVkO1xuICAgIGRlZmF1bHRMb2dnZXIubm9Db25mbGljdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gdW5kZWZpbmVkVHlwZSAmJlxuICAgICAgICAgICAgICAgd2luZG93LmxvZyA9PT0gZGVmYXVsdExvZ2dlcikge1xuICAgICAgICAgICAgd2luZG93LmxvZyA9IF9sb2c7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZGVmYXVsdExvZ2dlcjtcbiAgICB9O1xuXG4gICAgZGVmYXVsdExvZ2dlci5nZXRMb2dnZXJzID0gZnVuY3Rpb24gZ2V0TG9nZ2VycygpIHtcbiAgICAgICAgcmV0dXJuIF9sb2dnZXJzQnlOYW1lO1xuICAgIH07XG5cbiAgICAvLyBFUzYgZGVmYXVsdCBleHBvcnQsIGZvciBjb21wYXRpYmlsaXR5XG4gICAgZGVmYXVsdExvZ2dlclsnZGVmYXVsdCddID0gZGVmYXVsdExvZ2dlcjtcblxuICAgIHJldHVybiBkZWZhdWx0TG9nZ2VyO1xufSkpO1xuIl19
