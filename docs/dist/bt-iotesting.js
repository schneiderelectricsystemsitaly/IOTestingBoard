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
        this.btDeviceInfoService = null;
        this.charHWRev = null;
        this.charFirmware = null;
        this.btBatteryService = null;
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
        this.charHWRev = null;
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
        this.btState.lastMeasure = IOTestingBoard_1.IOTestingBoard.parseNotification(answer);
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
            let response;
            const command = this.btState.command;
            if (command == null) {
                return;
            }
            this.btState.state = constants_1.State.BUSY;
            this.btState.stats.commands++;
            log.info('\t\tExecuting command :' + command);
            const packet_clear = IOTestingBoard_1.IOTestingBoard.getPacket(Command_1.Command.CreateNoSP(constants_1.CommandType.COMMAND_CLEAR_FLAGS));
            const packet = IOTestingBoard_1.IOTestingBoard.getPacket(command);
            const packets = [packet_clear, packet];
            for (const msg of packets) {
                const currentCpt = this.btState.lastMeasure != null ? this.btState.lastMeasure.CommandCpt : -1;
                do {
                    response = await this.SendAndResponse(msg);
                } while (currentCpt == this.btState.lastMeasure?.CommandCpt);
                // Board is incrementing the counter every time it processes one command
            }
            // Last error flag
            command.error = this.btState.lastMeasure?.Error;
            // Caller expects a valid property in GetState() once command is executed.
            log.debug('\t\tRefreshing current state');
            await this.refresh();
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
            this.btState.meter.hw_rev = await this.iot.getHardwareRevision();
            log.info('\t\tSerial number:' + this.btState.meter.hw_rev);
            this.btState.meter.firmware = await this.iot.getFirmware();
            log.info('\t\tSerial number:' + this.btState.meter.firmware);
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
            this.btState.response = value.buffer.slice(0);
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
            this.btState.btDeviceInfoService = await this.btState.btGATTServer.getPrimaryService('device_information');
            this.btState.charFirmware = await this.btState.btDeviceInfoService.getCharacteristic(0x2A26);
            this.btState.charHWRev = await this.btState.btDeviceInfoService.getCharacteristic(0x2a27);
            this.btState.btBatteryService = await this.btState.btGATTServer.getPrimaryService('battery_service');
            this.btState.charBattery = await this.btState.btBatteryService.getCharacteristic(0x2A19);
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
            if (this.btState.response) {
                this.btState.lastMeasure = IOTestingBoard_1.IOTestingBoard.parseNotification(this.btState.response);
                this.btState.response = null;
            }
            if (this.btState.lastMeasure != null) {
                this.btState.meter.actual = this.btState.lastMeasure.Actual_R;
                this.btState.meter.setpoint = this.btState.lastMeasure.Setpoint_R;
                // Read randomly once every 20 loops
                if (Math.random() > 0.95) {
                    this.btState.meter.battery = await this.iot.getBatteryLevel();
                }
                if (this.btState.lastMeasure.Test) {
                    this.btState.meter.mode = constants_1.BoardMode.MODE_TEST;
                }
                else if (this.btState.lastMeasure.Relay == constants_1.RelayPosition.POS_METER) {
                    this.btState.meter.mode = constants_1.BoardMode.MODE_METER;
                }
                else if (this.btState.lastMeasure.Relay == constants_1.RelayPosition.POS_RESISTOR) {
                    if (this.btState.lastMeasure.V_with_load) {
                        this.btState.meter.mode = constants_1.BoardMode.MODE_V_WITH_LOAD;
                    }
                    else {
                        this.btState.meter.mode = constants_1.BoardMode.MODE_RESISTOR;
                    }
                }
                else {
                    this.btState.meter.mode = constants_1.BoardMode.MODE_UNDEFINED;
                }
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

},{"./APIState":1,"./Command":2,"./IOTestingBoard":5,"./constants":8,"./utils":11,"loglevel":12}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IOTestingBoard = void 0;
const log = require("loglevel");
const constants_1 = require("./constants");
const NotificationData_1 = require("./NotificationData");
class IOTestingBoard {
    constructor(fnSendAndResponse, btApi) {
        this.SendAndResponse = fnSendAndResponse;
        this.btState = btApi;
    }
    uintToString(dv) {
        const uint8arr = [];
        for (let i = 0; i < dv.byteLength; i++) {
            uint8arr.push(dv.getUint8(i));
        }
        const encodedString = String.fromCharCode.apply(null, uint8arr);
        const decodedString = decodeURIComponent(encodedString);
        return decodedString;
    }
    /**
       * Gets the meter serial number
       * @returns {string}
       */
    async getHardwareRevision() {
        log.debug('\t\tReading HW rev');
        const dv = await this.btState.charHWRev.readValue();
        return this.uintToString(dv);
    }
    /**
       * Gets the meter serial number
       * @returns {string}
       */
    async getFirmware() {
        log.debug('\t\tReading firmware version');
        const dv = await this.btState.charFirmware.readValue();
        return this.uintToString(dv);
    }
    /**
       * Gets the battery level indication
       * @returns {number} percentage (%)
       */
    async getBatteryLevel() {
        log.debug('\t\tReading battery voltage');
        const dv = await this.btState.charBattery.readValue();
        return dv.getUint8(0);
    }
    static parseNotification(buf) {
        if (buf.byteLength < 11) {
            return null;
        }
        const output = new NotificationData_1.NotificationData();
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
        log.debug('Decoded notification', output);
        return output;
    }
    static getPacket(command) {
        let buf;
        let dv;
        switch (command.type) {
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
            case constants_1.CommandType.COMMAND_CLEAR_FLAGS:
                // No parameter
                buf = new ArrayBuffer(1);
                dv = new DataView(buf);
                dv.setUint8(0, command.type);
                return buf;
            case constants_1.CommandType.COMMAND_CONFIGURE_METER_COMM:
                buf = new ArrayBuffer(1 + 5);
                dv = new DataView(buf);
                dv.setUint8(0, command.type);
                dv.setUint8(1, command.setpoint);
                dv.setUint8(2, command.setpoint2);
                dv.setUint8(3, command.setpoint3);
                dv.setUint16(4, command.setpoint4, true);
                return buf;
            case constants_1.CommandType.COMMAND_SET_CPU:
            case constants_1.CommandType.COMMAND_SET_INITIAL_COMMAND_SETPOINT:
            case constants_1.CommandType.COMMAND_SET_INITIAL_COMMAND_TYPE:
                // One Uint8 parameter
                buf = new ArrayBuffer(2);
                dv = new DataView(buf);
                dv.setUint8(0, command.type);
                dv.setUint8(1, command.setpoint);
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
                dv.setUint8(0, command.type);
                dv.setUint8(1, command.setpoint ? 1 : 0);
                return buf;
            case constants_1.CommandType.COMMAND_MODE_RESISTORS:
            case constants_1.CommandType.COMMAND_MODE_V_LOAD:
            case constants_1.CommandType.COMMAND_SET_DEEPSLEEP_MIN:
                // One Uint16 R parameter
                buf = new ArrayBuffer(3);
                dv = new DataView(buf);
                dv.setUint8(0, command.type);
                dv.setUint16(1, command.setpoint, true);
                return buf;
            case constants_1.CommandType.COMMAND_SET_BLUETOOTH_NAME:
            case constants_1.CommandType.COMMAND_SET_WIFI_NETWORK:
            case constants_1.CommandType.COMMAND_SET_WIFI_PASSWORD:
                // One UTF8 string parameter
                const utf8Encode = new TextEncoder();
                const bytes_utf8 = utf8Encode.encode(command.setpoint);
                buf = new ArrayBuffer(1 + bytes_utf8.length);
                dv = new DataView(buf);
                dv.setUint8(0, command.type);
                var byte_num = 1;
                for (const byte_v of bytes_utf8) {
                    dv.setUint8(byte_num, byte_v);
                    byte_num++;
                }
                return buf;
            default:
                throw new Error('Invalid command' + command);
        }
    }
}
exports.IOTestingBoard = IOTestingBoard;

},{"./NotificationData":7,"./constants":8,"loglevel":12}],6:[function(require,module,exports){
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
        this.hw_rev = '???'; // Serial number
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
}
exports.NotificationData = NotificationData;

},{}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlueToothIOTUUID = exports.MAX_U_GEN = exports.ResultCode = exports.State = exports.RelayPosition = exports.BoardMode = exports.CommandType = void 0;
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
exports.RelayPosition = {
    POS_UNKNOWN: 0,
    POS_METER: 1,
    POS_RESISTOR: 2
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
exports.BoardMode = exports.State = exports.setLevel = exports.CommandType = exports.Command = exports.driver = exports.SimpleExecuteJSON = exports.ExecuteJSON = exports.GetStateJSON = exports.GetState = exports.SimpleExecute = exports.Execute = exports.Pair = exports.Stop = void 0;
const constants_1 = require("./constants");
Object.defineProperty(exports, "State", { enumerable: true, get: function () { return constants_1.State; } });
Object.defineProperty(exports, "CommandType", { enumerable: true, get: function () { return constants_1.CommandType; } });
Object.defineProperty(exports, "BoardMode", { enumerable: true, get: function () { return constants_1.BoardMode; } });
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
        deviceSerial: '',
        deviceHwRev: exports.driver.btState.meter?.hw_rev,
        deviceMode: exports.driver.btState.meter?.mode,
        status: exports.driver.btState.state,
        batteryLevel: exports.driver.btState.meter?.battery,
        firmware: exports.driver.btState.meter?.firmware,
        ready,
        initializing,
        stats: exports.driver.btState.stats
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9BUElTdGF0ZS5qcyIsImpzL0NvbW1hbmQuanMiLCJqcy9Db21tYW5kUmVzdWx0LmpzIiwianMvRHJpdmVyLmpzIiwianMvSU9UZXN0aW5nQm9hcmQuanMiLCJqcy9NZXRlclN0YXRlLmpzIiwianMvTm90aWZpY2F0aW9uRGF0YS5qcyIsImpzL2NvbnN0YW50cy5qcyIsImpzL21ldGVyQXBpLmpzIiwianMvbWV0ZXJQdWJsaWNBUEkuanMiLCJqcy91dGlscy5qcyIsIm5vZGVfbW9kdWxlcy9sb2dsZXZlbC9saWIvbG9nbGV2ZWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOU5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5CVEFwaVN0YXRlID0gdm9pZCAwO1xyXG5jb25zdCBNZXRlclN0YXRlXzEgPSByZXF1aXJlKFwiLi9NZXRlclN0YXRlXCIpO1xyXG5jb25zdCBjb25zdGFudHNfMSA9IHJlcXVpcmUoXCIuL2NvbnN0YW50c1wiKTtcclxuY29uc3QgTm90aWZpY2F0aW9uRGF0YV8xID0gcmVxdWlyZShcIi4vTm90aWZpY2F0aW9uRGF0YVwiKTtcclxuY29uc3QgbG9nID0gcmVxdWlyZShcImxvZ2xldmVsXCIpO1xyXG4vLyBDdXJyZW50IHN0YXRlIG9mIHRoZSBibHVldG9vdGhcclxuY2xhc3MgQlRBcGlTdGF0ZSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuTk9UX0NPTk5FQ1RFRDtcclxuICAgICAgICB0aGlzLnByZXZfc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5OT1RfQ09OTkVDVEVEO1xyXG4gICAgICAgIHRoaXMuc3RhdGVfY3B0ID0gMDtcclxuICAgICAgICB0aGlzLnN0YXJ0ZWQgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLnN0b3BSZXF1ZXN0ID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5sYXN0TWVhc3VyZSA9IG5ldyBOb3RpZmljYXRpb25EYXRhXzEuTm90aWZpY2F0aW9uRGF0YSgpO1xyXG4gICAgICAgIHRoaXMubWV0ZXIgPSBuZXcgTWV0ZXJTdGF0ZV8xLk1ldGVyU3RhdGUoKTtcclxuICAgICAgICB0aGlzLmNvbW1hbmQgPSBudWxsO1xyXG4gICAgICAgIHRoaXMucmVzcG9uc2UgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuYnREZXZpY2UgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuYnRHQVRUU2VydmVyID0gbnVsbDtcclxuICAgICAgICB0aGlzLmJ0SU9UU2VydmljZSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5jaGFyUmVhZCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5jaGFyV3JpdGUgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuYnREZXZpY2VJbmZvU2VydmljZSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5jaGFySFdSZXYgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuY2hhckZpcm13YXJlID0gbnVsbDtcclxuICAgICAgICB0aGlzLmJ0QmF0dGVyeVNlcnZpY2UgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuY2hhckJhdHRlcnkgPSBudWxsO1xyXG4gICAgICAgIC8vIGdlbmVyYWwgc3RhdGlzdGljcyBmb3IgZGVidWdnaW5nXHJcbiAgICAgICAgdGhpcy5zdGF0cyA9IHtcclxuICAgICAgICAgICAgcmVxdWVzdHM6IDAsXHJcbiAgICAgICAgICAgIHJlc3BvbnNlczogMCxcclxuICAgICAgICAgICAgbW9kYnVzX2Vycm9yczogMCxcclxuICAgICAgICAgICAgJ0dBVFQgZGlzY29ubmVjdHMnOiAwLFxyXG4gICAgICAgICAgICBleGNlcHRpb25zOiAwLFxyXG4gICAgICAgICAgICBzdWJjcmliZXM6IDAsXHJcbiAgICAgICAgICAgIGNvbW1hbmRzOiAwLFxyXG4gICAgICAgICAgICByZXNwb25zZVRpbWU6IDAuMCxcclxuICAgICAgICAgICAgbGFzdFJlc3BvbnNlVGltZTogJz8gbXMnLFxyXG4gICAgICAgICAgICBsYXN0X2Nvbm5lY3Q6IG5ldyBEYXRlKDIwMjAsIDEsIDEpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMub3B0aW9ucyA9IHtcclxuICAgICAgICAgICAgZm9yY2VEZXZpY2VTZWxlY3Rpb246IHRydWVcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG4gICAgYXN5bmMgcmVzZXQob25EaXNjb25uZWN0RXZlbnQgPSBudWxsKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY2hhclJlYWQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYnREZXZpY2U/LmdhdHQ/LmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuY2hhclJlYWQuc3RvcE5vdGlmaWNhdGlvbnMoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHsgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5idERldmljZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5idERldmljZT8uZ2F0dD8uY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9nLndhcm4oJyogQ2FsbGluZyBkaXNjb25uZWN0IG9uIGJ0ZGV2aWNlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQXZvaWQgdGhlIGV2ZW50IGZpcmluZyB3aGljaCBtYXkgbGVhZCB0byBhdXRvLXJlY29ubmVjdFxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnREZXZpY2UucmVtb3ZlRXZlbnRMaXN0ZW5lcignZ2F0dHNlcnZlcmRpc2Nvbm5lY3RlZCcsIG9uRGlzY29ubmVjdEV2ZW50KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ0RGV2aWNlLmdhdHQuZGlzY29ubmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhdGNoIChlcnJvcikgeyB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuYnRHQVRUU2VydmVyID0gbnVsbDtcclxuICAgICAgICB0aGlzLmNoYXJCYXR0ZXJ5ID0gbnVsbDtcclxuICAgICAgICB0aGlzLmNoYXJGaXJtd2FyZSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5jaGFyUmVhZCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5jaGFySFdSZXYgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuY2hhcldyaXRlID0gbnVsbDtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLkJUQXBpU3RhdGUgPSBCVEFwaVN0YXRlO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1BUElTdGF0ZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLkNvbW1hbmQgPSB2b2lkIDA7XHJcbmNvbnN0IGNvbnN0YW50c18xID0gcmVxdWlyZShcIi4vY29uc3RhbnRzXCIpO1xyXG4vKipcclxuICogQ29tbWFuZCB0byB0aGUgbWV0ZXIsIG1heSBpbmNsdWRlIHNldHBvaW50XHJcbiAqICovXHJcbmNsYXNzIENvbW1hbmQge1xyXG4gICAgLyoqXHJcbiAgICAgICAqIENyZWF0ZXMgYSBuZXcgY29tbWFuZFxyXG4gICAgICAgKiBAcGFyYW0ge0NvbW1hbmRUeXBlfSBjdHlwZVxyXG4gICAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKGN0eXBlKSB7XHJcbiAgICAgICAgdGhpcy50eXBlID0gcGFyc2VJbnQoY3R5cGUpO1xyXG4gICAgICAgIHRoaXMuc2V0cG9pbnQgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuc2V0cG9pbnQgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuc2V0cG9pbnQzID0gbnVsbDtcclxuICAgICAgICB0aGlzLnNldHBvaW50NCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5lcnJvciA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMucGVuZGluZyA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5yZXF1ZXN0ID0gbnVsbDtcclxuICAgICAgICB0aGlzLnJlc3BvbnNlID0gbnVsbDtcclxuICAgIH1cclxuICAgIHN0YXRpYyBDcmVhdGVOb1NQKGN0eXBlKSB7XHJcbiAgICAgICAgY29uc3QgY21kID0gbmV3IENvbW1hbmQoY3R5cGUpO1xyXG4gICAgICAgIHJldHVybiBjbWQ7XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgQ3JlYXRlT25lU1AoY3R5cGUsIHNldHBvaW50KSB7XHJcbiAgICAgICAgY29uc3QgY21kID0gbmV3IENvbW1hbmQoY3R5cGUpO1xyXG4gICAgICAgIGNtZC5zZXRwb2ludCA9IHNldHBvaW50O1xyXG4gICAgICAgIHJldHVybiBjbWQ7XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgQ3JlYXRlRm91clNQKGN0eXBlLCBzZXQxLCBzZXQyLCBzZXQzLCBzZXQ0KSB7XHJcbiAgICAgICAgY29uc3QgY21kID0gbmV3IENvbW1hbmQoY3R5cGUpO1xyXG4gICAgICAgIGNtZC5zZXRwb2ludCA9IHNldDE7XHJcbiAgICAgICAgY21kLnNldHBvaW50MiA9IHNldDI7XHJcbiAgICAgICAgY21kLnNldHBvaW50MyA9IHNldDM7XHJcbiAgICAgICAgY21kLnNldHBvaW50NCA9IHNldDQ7XHJcbiAgICAgICAgcmV0dXJuIGNtZDtcclxuICAgIH1cclxuICAgIHRvU3RyaW5nKCkge1xyXG4gICAgICAgIHJldHVybiAnVHlwZTogJyArIHRoaXMudHlwZSArICcsIHNldHBvaW50OicgKyB0aGlzLnNldHBvaW50ICsgJywgc2V0cG9pbnQyOiAnICsgdGhpcy5zZXRwb2ludDIgKyAnLCBwZW5kaW5nOicgKyB0aGlzLnBlbmRpbmcgKyAnLCBlcnJvcjonICsgdGhpcy5lcnJvcjtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBHZXRzIHRoZSBkZWZhdWx0IHNldHBvaW50IGZvciB0aGlzIGNvbW1hbmQgdHlwZVxyXG4gICAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBzZXRwb2ludChzKSBleHBlY3RlZFxyXG4gICAgICAgKi9cclxuICAgIGRlZmF1bHRTZXRwb2ludCgpIHtcclxuICAgICAgICBzd2l0Y2ggKHRoaXMudHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfRU5BQkxFX1dJRkk6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9ESVNBQkxFX1dJRkk6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9FTkFCTEVfV0VCUkVQTDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0RJU0FCTEVfV0VCUkVQTDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0JSRUFLOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfTU9ERV9NRVRFUjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX01PREVfUkVTSVNUT1JTOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgJ1Jlc2lzdGFuY2UgKG9obXMpJzogMHhGRkZGIH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9NT0RFX1ZfTE9BRDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7ICdMb2FkIChvaG1zKSc6IDU1MCB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfUkVCT09UOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfUlVOX1RFU1Q6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9MSUdIVF9TTEVFUDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0RFRVBfU0xFRVA6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9NRVRFUl9DT01NQU5EUzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IEVuYWJsZTogdHJ1ZSB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0lOSVRJQUxfTUVURVJfQ09NTTpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IEVuYWJsZTogdHJ1ZSB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX1dJRklfTkVUV09SSzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IFNTSUQ6ICcnIH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfV0lGSV9QQVNTV09SRDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IFBhc3N3b3JkOiAnJyB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0lOSVRJQUxfQkxVRVRPT1RIOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgRW5hYmxlOiB0cnVlIH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfSU5JVElBTF9XSUZJOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgRW5hYmxlOiB0cnVlIH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfREVFUFNMRUVQX01JTjpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7ICdEZWxheSAobWluKSc6IDE1IH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfVkVSQk9TRTpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IEVuYWJsZTogdHJ1ZSB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0lOSVRJQUxfQ09NTUFORF9UWVBFOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgJ0NvbW1hbmQgdHlwZSgxLzIvMyknOiAxIH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfSU5JVElBTF9DT01NQU5EX1NFVFBPSU5UOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgJ1NldHBvaW50IChvaG1zKSc6IDB4RkZGRiB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfUl9URVNUOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0NQVTpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7ICdGcmVxdWVuY3kgKE1IejogMS0+ODAsIDItPjE2MCwgMy0+MjQwKSc6IDEgfTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9PVEE6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBFbmFibGU6IHRydWUgfTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0NPTkZJR1VSRV9NRVRFUl9DT01NOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgSW5kZXg6IDAsICdWb2x0YWdlIChWKSc6IDgsICdDb21tYW5kIHR5cGUgKDEvMi8zKSc6IDIsICdTZXRwb2ludCAob2htcyknOiAxMTAwIH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfQkxVRVRPT1RIX05BTUU6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyAnRGV2aWNlIG5hbWUnOiAnSU9UZXN0aW5nIGJvYXJkJyB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfUkVGUkVTSDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5Db21tYW5kID0gQ29tbWFuZDtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Q29tbWFuZC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLkNvbW1hbmRSZXN1bHQgPSB2b2lkIDA7XHJcbmNsYXNzIENvbW1hbmRSZXN1bHQge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy52YWx1ZSA9IDAuMDtcclxuICAgICAgICB0aGlzLnN1Y2Nlc3MgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLm1lc3NhZ2UgPSAnJztcclxuICAgICAgICB0aGlzLnVuaXQgPSAnJztcclxuICAgICAgICB0aGlzLnNlY29uZGFyeV92YWx1ZSA9IDAuMDtcclxuICAgICAgICB0aGlzLnNlY29uZGFyeV91bml0ID0gJyc7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5Db21tYW5kUmVzdWx0ID0gQ29tbWFuZFJlc3VsdDtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Q29tbWFuZFJlc3VsdC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuLy8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ3ZWItYmx1ZXRvb3RoXCIgLz5cclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLkRyaXZlciA9IHZvaWQgMDtcclxuLyoqXHJcbiAqICBCbHVldG9vdGggaGFuZGxpbmcgbW9kdWxlLCBpbmNsdWRpbmcgbWFpbiBzdGF0ZSBtYWNoaW5lIGxvb3AuXHJcbiAqICBUaGlzIG1vZHVsZSBpbnRlcmFjdHMgd2l0aCBicm93c2VyIGZvciBibHVldG9vdGggY29tdW5pY2F0aW9ucyBhbmQgcGFpcmluZywgYW5kIHdpdGggU2VuZWNhTVNDIG9iamVjdC5cclxuICovXHJcbmNvbnN0IEFQSVN0YXRlXzEgPSByZXF1aXJlKFwiLi9BUElTdGF0ZVwiKTtcclxuY29uc3QgY29uc3RhbnRzXzEgPSByZXF1aXJlKFwiLi9jb25zdGFudHNcIik7XHJcbmNvbnN0IElPVGVzdGluZ0JvYXJkXzEgPSByZXF1aXJlKFwiLi9JT1Rlc3RpbmdCb2FyZFwiKTtcclxuY29uc3QgQ29tbWFuZF8xID0gcmVxdWlyZShcIi4vQ29tbWFuZFwiKTtcclxuY29uc3QgdXRpbHNfMSA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpO1xyXG5jb25zdCBsb2cgPSByZXF1aXJlKFwibG9nbGV2ZWxcIik7XHJcbmNsYXNzIERyaXZlciB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLmxvZ2dpbmcgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLnNpbXVsYXRpb24gPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmJ0U3RhdGUgPSBuZXcgQVBJU3RhdGVfMS5CVEFwaVN0YXRlKCk7XHJcbiAgICAgICAgdGhpcy5pb3QgPSBuZXcgSU9UZXN0aW5nQm9hcmRfMS5JT1Rlc3RpbmdCb2FyZCh0aGlzLlNlbmRBbmRSZXNwb25zZSwgdGhpcy5idFN0YXRlKTtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBTZW5kIHRoZSBtZXNzYWdlIHVzaW5nIEJsdWV0b290aCBhbmQgd2FpdCBmb3IgYW4gYW5zd2VyXHJcbiAgICAgICAqL1xyXG4gICAgYXN5bmMgU2VuZEFuZFJlc3BvbnNlKGNvbW1hbmQpIHtcclxuICAgICAgICBpZiAoY29tbWFuZCA9PSBudWxsIHx8IHRoaXMuYnRTdGF0ZS5jaGFyV3JpdGUgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICAgICAgbG9nLmRlYnVnKCc+PiAnICsgKDAsIHV0aWxzXzEuYnVmMmhleCkoY29tbWFuZCkpO1xyXG4gICAgICAgIHRoaXMuYnRTdGF0ZS5yZXNwb25zZSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLnJlcXVlc3RzKys7XHJcbiAgICAgICAgY29uc3Qgc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5idFN0YXRlLmNoYXJXcml0ZS53cml0ZVZhbHVlV2l0aG91dFJlc3BvbnNlKGNvbW1hbmQpO1xyXG4gICAgICAgIHdoaWxlICh0aGlzLmJ0U3RhdGUuc3RhdGUgPT0gY29uc3RhbnRzXzEuU3RhdGUuTUVURVJfSU5JVElBTElaSU5HIHx8XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9PSBjb25zdGFudHNfMS5TdGF0ZS5CVVNZKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmJ0U3RhdGUucmVzcG9uc2UgIT0gbnVsbClcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMzUpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgZW5kVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgICAgIGNvbnN0IGFuc3dlciA9IHRoaXMuYnRTdGF0ZS5yZXNwb25zZT8uc2xpY2UoMCk7XHJcbiAgICAgICAgdGhpcy5idFN0YXRlLmxhc3RNZWFzdXJlID0gSU9UZXN0aW5nQm9hcmRfMS5JT1Rlc3RpbmdCb2FyZC5wYXJzZU5vdGlmaWNhdGlvbihhbnN3ZXIpO1xyXG4gICAgICAgIHRoaXMuYnRTdGF0ZS5yZXNwb25zZSA9IG51bGw7XHJcbiAgICAgICAgLy8gTG9nIHRoZSBwYWNrZXRzXHJcbiAgICAgICAgaWYgKHRoaXMubG9nZ2luZykge1xyXG4gICAgICAgICAgICBjb25zdCBwYWNrZXQgPSB7IHJlcXVlc3Q6ICgwLCB1dGlsc18xLmJ1ZjJoZXgpKGNvbW1hbmQpLCBhbnN3ZXI6ICgwLCB1dGlsc18xLmJ1ZjJoZXgpKGFuc3dlcikgfTtcclxuICAgICAgICAgICAgY29uc3Qgc3RvcmFnZV92YWx1ZSA9IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnSU9UZXN0aW5nVHJhY2UnKTtcclxuICAgICAgICAgICAgbGV0IHBhY2tldHMgPSBbXTtcclxuICAgICAgICAgICAgaWYgKHN0b3JhZ2VfdmFsdWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgcGFja2V0cyA9IEpTT04ucGFyc2Uoc3RvcmFnZV92YWx1ZSk7IC8vIFJlc3RvcmUgdGhlIGpzb24gcGVyc2lzdGVkIG9iamVjdFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHBhY2tldHMucHVzaChKU09OLnN0cmluZ2lmeShwYWNrZXQpKTsgLy8gQWRkIHRoZSBuZXcgb2JqZWN0XHJcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnSU9UZXN0aW5nVHJhY2UnLCBKU09OLnN0cmluZ2lmeShwYWNrZXRzKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0cy5yZXNwb25zZVRpbWUgPSBNYXRoLnJvdW5kKCgxLjAgKiB0aGlzLmJ0U3RhdGUuc3RhdHMucmVzcG9uc2VUaW1lICogKHRoaXMuYnRTdGF0ZS5zdGF0cy5yZXNwb25zZXMgJSA1MDApICsgKGVuZFRpbWUgLSBzdGFydFRpbWUpKSAvICgodGhpcy5idFN0YXRlLnN0YXRzLnJlc3BvbnNlcyAlIDUwMCkgKyAxKSk7XHJcbiAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLmxhc3RSZXNwb25zZVRpbWUgPSBNYXRoLnJvdW5kKGVuZFRpbWUgLSBzdGFydFRpbWUpICsgJyBtcyc7XHJcbiAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLnJlc3BvbnNlcysrO1xyXG4gICAgICAgIHJldHVybiBhbnN3ZXI7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAgICogTWFpbiBsb29wIG9mIHRoZSBtZXRlciBoYW5kbGVyLlxyXG4gICAgICAgKiAqL1xyXG4gICAgYXN5bmMgc3RhdGVNYWNoaW5lKCkge1xyXG4gICAgICAgIGxldCBuZXh0QWN0aW9uO1xyXG4gICAgICAgIGNvbnN0IERFTEFZX01TID0gKHRoaXMuc2ltdWxhdGlvbiA/IDIwIDogNzUwKTsgLy8gVXBkYXRlIHRoZSBzdGF0dXMgZXZlcnkgWCBtcy5cclxuICAgICAgICBjb25zdCBUSU1FT1VUX01TID0gKHRoaXMuc2ltdWxhdGlvbiA/IDEwMDAgOiAzMDAwMCk7IC8vIEdpdmUgdXAgc29tZSBvcGVyYXRpb25zIGFmdGVyIFggbXMuXHJcbiAgICAgICAgdGhpcy5idFN0YXRlLnN0YXJ0ZWQgPSB0cnVlO1xyXG4gICAgICAgIGxvZy5kZWJ1ZygnQ3VycmVudCBzdGF0ZTonICsgdGhpcy5idFN0YXRlLnN0YXRlKTtcclxuICAgICAgICAvLyBDb25zZWN1dGl2ZSBzdGF0ZSBjb3VudGVkLiBDYW4gYmUgdXNlZCB0byB0aW1lb3V0LlxyXG4gICAgICAgIGlmICh0aGlzLmJ0U3RhdGUuc3RhdGUgPT0gdGhpcy5idFN0YXRlLnByZXZfc3RhdGUpIHtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlX2NwdCsrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlX2NwdCA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIFN0b3AgcmVxdWVzdCBmcm9tIEFQSVxyXG4gICAgICAgIGlmICh0aGlzLmJ0U3RhdGUuc3RvcFJlcXVlc3QpIHtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuU1RPUFBJTkc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxvZy5kZWJ1ZygnXFxTdGF0ZTonICsgdGhpcy5idFN0YXRlLnN0YXRlKTtcclxuICAgICAgICBzd2l0Y2ggKHRoaXMuYnRTdGF0ZS5zdGF0ZSkge1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLk5PVF9DT05ORUNURUQ6IC8vIGluaXRpYWwgc3RhdGUgb24gU3RhcnQoKVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc2ltdWxhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSB0aGlzLmZha2VQYWlyRGV2aWNlLmJpbmQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gdGhpcy5idFBhaXJEZXZpY2UuYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLkNPTk5FQ1RJTkc6IC8vIHdhaXRpbmcgZm9yIGNvbm5lY3Rpb24gdG8gY29tcGxldGVcclxuICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5TdGF0ZS5ERVZJQ0VfUEFJUkVEOiAvLyBjb25uZWN0aW9uIGNvbXBsZXRlLCBhY3F1aXJlIG1ldGVyIHN0YXRlXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zaW11bGF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMuZmFrZVN1YnNjcmliZS5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMuYnRTdWJzY3JpYmUuYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLlNVQlNDUklCSU5HOiAvLyB3YWl0aW5nIGZvciBCbHVldG9vdGggaW50ZXJmYWNlc1xyXG4gICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmJ0U3RhdGUuc3RhdGVfY3B0ID4gKFRJTUVPVVRfTVMgLyBERUxBWV9NUykpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUaW1lb3V0LCB0cnkgdG8gcmVzdWJzY3JpYmVcclxuICAgICAgICAgICAgICAgICAgICBsb2cud2FybignVGltZW91dCBpbiBTVUJTQ1JJQklORycpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkRFVklDRV9QQUlSRUQ7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlX2NwdCA9IDA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5TdGF0ZS5NRVRFUl9JTklUOiAvLyByZWFkeSB0byBjb21tdW5pY2F0ZSwgYWNxdWlyZSBtZXRlciBzdGF0dXNcclxuICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSB0aGlzLm1ldGVySW5pdC5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuTUVURVJfSU5JVElBTElaSU5HOiAvLyByZWFkaW5nIHRoZSBtZXRlciBzdGF0dXNcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmJ0U3RhdGUuc3RhdGVfY3B0ID4gKFRJTUVPVVRfTVMgLyBERUxBWV9NUykpIHtcclxuICAgICAgICAgICAgICAgICAgICBsb2cud2FybignVGltZW91dCBpbiBNRVRFUl9JTklUSUFMSVpJTkcnKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUaW1lb3V0LCB0cnkgdG8gcmVzdWJzY3JpYmVcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zaW11bGF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSB0aGlzLmZha2VTdWJzY3JpYmUuYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSB0aGlzLmJ0U3Vic2NyaWJlLmJpbmQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZV9jcHQgPSAwO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLklETEU6IC8vIHJlYWR5IHRvIHByb2Nlc3MgY29tbWFuZHMgZnJvbSBBUElcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmJ0U3RhdGUuY29tbWFuZCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMucHJvY2Vzc0NvbW1hbmQuYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSB0aGlzLnJlZnJlc2guYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLkVSUk9SOiAvLyBhbnl0aW1lIGFuIGVycm9yIGhhcHBlbnNcclxuICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSB0aGlzLmRpc2Nvbm5lY3QuYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLkJVU1k6IC8vIHdoaWxlIGEgY29tbWFuZCBpbiBnb2luZyBvblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYnRTdGF0ZS5zdGF0ZV9jcHQgPiAoVElNRU9VVF9NUyAvIERFTEFZX01TKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZy53YXJuKCdUaW1lb3V0IGluIEJVU1knKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUaW1lb3V0LCB0cnkgdG8gcmVzdWJzY3JpYmVcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zaW11bGF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSB0aGlzLmZha2VTdWJzY3JpYmUuYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSB0aGlzLmJ0U3Vic2NyaWJlLmJpbmQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZV9jcHQgPSAwO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLlNUT1BQSU5HOlxyXG4gICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMuZGlzY29ubmVjdC5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuU1RPUFBFRDogLy8gYWZ0ZXIgYSBkaXNjb25uZWN0b3Igb3IgU3RvcCgpIHJlcXVlc3QsIHN0b3BzIHRoZSBzdGF0ZSBtYWNoaW5lLlxyXG4gICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuYnRTdGF0ZS5wcmV2X3N0YXRlID0gdGhpcy5idFN0YXRlLnN0YXRlO1xyXG4gICAgICAgIGlmIChuZXh0QWN0aW9uICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBsb2cuZGVidWcoJ1xcdEV4ZWN1dGluZzonICsgbmV4dEFjdGlvbi5uYW1lKTtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IG5leHRBY3Rpb24oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgbG9nLmVycm9yKCdFeGNlcHRpb24gaW4gc3RhdGUgbWFjaGluZScsIGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLmJ0U3RhdGUuc3RhdGUgIT0gY29uc3RhbnRzXzEuU3RhdGUuU1RPUFBFRCkge1xyXG4gICAgICAgICAgICB2b2lkICgwLCB1dGlsc18xLnNsZWVwKShERUxBWV9NUykudGhlbihhc3luYyAoKSA9PiB7IGF3YWl0IHRoaXMuc3RhdGVNYWNoaW5lKCk7IH0pOyAvLyBSZWNoZWNrIHN0YXR1cyBpbiBERUxBWV9NUyBtc1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKCdcXHRUZXJtaW5hdGluZyBTdGF0ZSBtYWNoaW5lJyk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGFydGVkID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgICAqIENhbGxlZCBmcm9tIHN0YXRlIG1hY2hpbmUgdG8gZXhlY3V0ZSBhIHNpbmdsZSBjb21tYW5kIGZyb20gYnRTdGF0ZS5jb21tYW5kIHByb3BlcnR5XHJcbiAgICAgICAqICovXHJcbiAgICBhc3luYyBwcm9jZXNzQ29tbWFuZCgpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBsZXQgcmVzcG9uc2U7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbW1hbmQgPSB0aGlzLmJ0U3RhdGUuY29tbWFuZDtcclxuICAgICAgICAgICAgaWYgKGNvbW1hbmQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkJVU1k7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0cy5jb21tYW5kcysrO1xyXG4gICAgICAgICAgICBsb2cuaW5mbygnXFx0XFx0RXhlY3V0aW5nIGNvbW1hbmQgOicgKyBjb21tYW5kKTtcclxuICAgICAgICAgICAgY29uc3QgcGFja2V0X2NsZWFyID0gSU9UZXN0aW5nQm9hcmRfMS5JT1Rlc3RpbmdCb2FyZC5nZXRQYWNrZXQoQ29tbWFuZF8xLkNvbW1hbmQuQ3JlYXRlTm9TUChjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0NMRUFSX0ZMQUdTKSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHBhY2tldCA9IElPVGVzdGluZ0JvYXJkXzEuSU9UZXN0aW5nQm9hcmQuZ2V0UGFja2V0KGNvbW1hbmQpO1xyXG4gICAgICAgICAgICBjb25zdCBwYWNrZXRzID0gW3BhY2tldF9jbGVhciwgcGFja2V0XTtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBtc2cgb2YgcGFja2V0cykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudENwdCA9IHRoaXMuYnRTdGF0ZS5sYXN0TWVhc3VyZSAhPSBudWxsID8gdGhpcy5idFN0YXRlLmxhc3RNZWFzdXJlLkNvbW1hbmRDcHQgOiAtMTtcclxuICAgICAgICAgICAgICAgIGRvIHtcclxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZSA9IGF3YWl0IHRoaXMuU2VuZEFuZFJlc3BvbnNlKG1zZyk7XHJcbiAgICAgICAgICAgICAgICB9IHdoaWxlIChjdXJyZW50Q3B0ID09IHRoaXMuYnRTdGF0ZS5sYXN0TWVhc3VyZT8uQ29tbWFuZENwdCk7XHJcbiAgICAgICAgICAgICAgICAvLyBCb2FyZCBpcyBpbmNyZW1lbnRpbmcgdGhlIGNvdW50ZXIgZXZlcnkgdGltZSBpdCBwcm9jZXNzZXMgb25lIGNvbW1hbmRcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBMYXN0IGVycm9yIGZsYWdcclxuICAgICAgICAgICAgY29tbWFuZC5lcnJvciA9IHRoaXMuYnRTdGF0ZS5sYXN0TWVhc3VyZT8uRXJyb3I7XHJcbiAgICAgICAgICAgIC8vIENhbGxlciBleHBlY3RzIGEgdmFsaWQgcHJvcGVydHkgaW4gR2V0U3RhdGUoKSBvbmNlIGNvbW1hbmQgaXMgZXhlY3V0ZWQuXHJcbiAgICAgICAgICAgIGxvZy5kZWJ1ZygnXFx0XFx0UmVmcmVzaGluZyBjdXJyZW50IHN0YXRlJyk7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucmVmcmVzaCgpO1xyXG4gICAgICAgICAgICBjb21tYW5kLnBlbmRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLmNvbW1hbmQgPSBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5JRExFO1xyXG4gICAgICAgICAgICBsb2cuZGVidWcoJ1xcdFxcdENvbXBsZXRlZCBjb21tYW5kIGV4ZWN1dGVkJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgbG9nLmVycm9yKCcqKiBlcnJvciB3aGlsZSBleGVjdXRpbmcgY29tbWFuZDogJyArIGVycik7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLk1FVEVSX0lOSVQ7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0cy5leGNlcHRpb25zKys7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgICAqIEFjcXVpcmUgdGhlIGN1cnJlbnQgbW9kZSBhbmQgc2VyaWFsIG51bWJlciBvZiB0aGUgZGV2aWNlLlxyXG4gICAgICAgKiAqL1xyXG4gICAgYXN5bmMgbWV0ZXJJbml0KCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLk1FVEVSX0lOSVRJQUxJWklORztcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLm1ldGVyLmh3X3JldiA9IGF3YWl0IHRoaXMuaW90LmdldEhhcmR3YXJlUmV2aXNpb24oKTtcclxuICAgICAgICAgICAgbG9nLmluZm8oJ1xcdFxcdFNlcmlhbCBudW1iZXI6JyArIHRoaXMuYnRTdGF0ZS5tZXRlci5od19yZXYpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUubWV0ZXIuZmlybXdhcmUgPSBhd2FpdCB0aGlzLmlvdC5nZXRGaXJtd2FyZSgpO1xyXG4gICAgICAgICAgICBsb2cuaW5mbygnXFx0XFx0U2VyaWFsIG51bWJlcjonICsgdGhpcy5idFN0YXRlLm1ldGVyLmZpcm13YXJlKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLm1ldGVyLmJhdHRlcnkgPSBhd2FpdCB0aGlzLmlvdC5nZXRCYXR0ZXJ5TGV2ZWwoKTtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKCdcXHRcXHRCYXR0ZXJ5ICglKTonICsgdGhpcy5idFN0YXRlLm1ldGVyLmJhdHRlcnkpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5JRExFO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIGxvZy53YXJuKCdFcnJvciB3aGlsZSBpbml0aWFsaXppbmcgbWV0ZXIgOicgKyBlcnIpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuZXhjZXB0aW9ucysrO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5ERVZJQ0VfUEFJUkVEO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qXHJcbiAgICAgICogQ2xvc2UgdGhlIGJsdWV0b290aCBpbnRlcmZhY2UgKHVucGFpcilcclxuICAgICAgKiAqL1xyXG4gICAgYXN5bmMgZGlzY29ubmVjdCgpIHtcclxuICAgICAgICB0aGlzLmJ0U3RhdGUuY29tbWFuZCA9IG51bGw7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5idFN0YXRlLnJlc2V0KHRoaXMub25EaXNjb25uZWN0ZWQuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuU1RPUFBFRDtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBFdmVudCBjYWxsZWQgYnkgYnJvd3NlciBCVCBhcGkgd2hlbiB0aGUgZGV2aWNlIGRpc2Nvbm5lY3RcclxuICAgICAgICogKi9cclxuICAgIGFzeW5jIG9uRGlzY29ubmVjdGVkKCkge1xyXG4gICAgICAgIGxvZy53YXJuKCcqIEdBVFQgU2VydmVyIGRpc2Nvbm5lY3RlZCBldmVudCwgd2lsbCB0cnkgdG8gcmVjb25uZWN0IConKTtcclxuICAgICAgICBhd2FpdCB0aGlzLmJ0U3RhdGUucmVzZXQoKTtcclxuICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHNbJ0dBVFQgZGlzY29ubmVjdHMnXSsrO1xyXG4gICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkRFVklDRV9QQUlSRUQ7IC8vIFRyeSB0byBhdXRvLXJlY29ubmVjdCB0aGUgaW50ZXJmYWNlcyB3aXRob3V0IHBhaXJpbmdcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBKb2lucyB0aGUgYXJndW1lbnRzIGludG8gYSBzaW5nbGUgYnVmZmVyXHJcbiAgICAgICAqIEByZXR1cm5zIHtBcnJheUJ1ZmZlcn0gY29uY2F0ZW5hdGVkIGJ1ZmZlclxyXG4gICAgICAgKi9cclxuICAgIGFycmF5QnVmZmVyQ29uY2F0KGJ1ZmZlcjEsIGJ1ZmZlcjIpIHtcclxuICAgICAgICBsZXQgbGVuZ3RoID0gMDtcclxuICAgICAgICBsZXQgYnVmZmVyO1xyXG4gICAgICAgIGZvciAodmFyIGkgaW4gYXJndW1lbnRzKSB7XHJcbiAgICAgICAgICAgIGJ1ZmZlciA9IGFyZ3VtZW50c1tpXTtcclxuICAgICAgICAgICAgaWYgKGJ1ZmZlcikge1xyXG4gICAgICAgICAgICAgICAgbGVuZ3RoICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGpvaW5lZCA9IG5ldyBVaW50OEFycmF5KGxlbmd0aCk7XHJcbiAgICAgICAgbGV0IG9mZnNldCA9IDA7XHJcbiAgICAgICAgZm9yIChpIGluIGFyZ3VtZW50cykge1xyXG4gICAgICAgICAgICBidWZmZXIgPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgICAgIGpvaW5lZC5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyKSwgb2Zmc2V0KTtcclxuICAgICAgICAgICAgb2Zmc2V0ICs9IGJ1ZmZlci5ieXRlTGVuZ3RoO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gam9pbmVkLmJ1ZmZlcjtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBFdmVudCBjYWxsZWQgYnkgYmx1ZXRvb3RoIGNoYXJhY3RlcmlzdGljcyB3aGVuIHJlY2VpdmluZyBkYXRhXHJcbiAgICAgICAqIEBwYXJhbSB7YW55fSBldmVudFxyXG4gICAgICAgKi9cclxuICAgIGhhbmRsZU5vdGlmaWNhdGlvbnMoZXZlbnQpIHtcclxuICAgICAgICBjb25zdCB2YWx1ZSA9IGV2ZW50LnRhcmdldC52YWx1ZTtcclxuICAgICAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBsb2cuZGVidWcoJzw8ICcgKyAoMCwgdXRpbHNfMS5idWYyaGV4KSh2YWx1ZS5idWZmZXIpKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnJlc3BvbnNlID0gdmFsdWUuYnVmZmVyLnNsaWNlKDApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBUaGlzIGZ1bmN0aW9uIHdpbGwgc3VjY2VlZCBvbmx5IGlmIGNhbGxlZCBhcyBhIGNvbnNlcXVlbmNlIG9mIGEgdXNlci1nZXN0dXJlXHJcbiAgICAgICAqIEUuZy4gYnV0dG9uIGNsaWNrLiBUaGlzIGlzIGR1ZSB0byBCbHVlVG9vdGggQVBJIHNlY3VyaXR5IG1vZGVsLlxyXG4gICAgICAgKiAqL1xyXG4gICAgYXN5bmMgYnRQYWlyRGV2aWNlKCkge1xyXG4gICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkNPTk5FQ1RJTkc7XHJcbiAgICAgICAgY29uc3QgZm9yY2VTZWxlY3Rpb24gPSB0aGlzLmJ0U3RhdGUub3B0aW9ucy5mb3JjZURldmljZVNlbGVjdGlvbjtcclxuICAgICAgICBsb2cuZGVidWcoJ2J0UGFpckRldmljZSgnICsgZm9yY2VTZWxlY3Rpb24gKyAnKScpO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgKG5hdmlnYXRvci5ibHVldG9vdGg/LmdldEF2YWlsYWJpbGl0eSkgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJpbGl0eSA9IGF3YWl0IG5hdmlnYXRvci5ibHVldG9vdGguZ2V0QXZhaWxhYmlsaXR5KCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWF2YWlsYWJpbGl0eSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZy5lcnJvcignQmx1ZXRvb3RoIG5vdCBhdmFpbGFibGUgaW4gYnJvd3Nlci4nKTtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Jyb3dzZXIgZG9lcyBub3QgcHJvdmlkZSBibHVldG9vdGgnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgZGV2aWNlID0gbnVsbDtcclxuICAgICAgICAgICAgLy8gRG8gd2UgYWxyZWFkeSBoYXZlIHBlcm1pc3Npb24/XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgKG5hdmlnYXRvci5ibHVldG9vdGg/LmdldERldmljZXMpID09PSAnZnVuY3Rpb24nICYmXHJcbiAgICAgICAgICAgICAgICAhZm9yY2VTZWxlY3Rpb24pIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJsZURldmljZXMgPSBhd2FpdCBuYXZpZ2F0b3IuYmx1ZXRvb3RoLmdldERldmljZXMoKTtcclxuICAgICAgICAgICAgICAgIGF2YWlsYWJsZURldmljZXMuZm9yRWFjaChmdW5jdGlvbiAoZGV2LCBpbmRleCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZy5kZWJ1ZygnRm91bmQgYXV0aG9yaXplZCBkZXZpY2UgOicgKyBkZXYubmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZGV2aWNlID0gZGV2O1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBsb2cuZGVidWcoJ25hdmlnYXRvci5ibHVldG9vdGguZ2V0RGV2aWNlcygpPScgKyBkZXZpY2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIElmIG5vdCwgcmVxdWVzdCBmcm9tIHVzZXJcclxuICAgICAgICAgICAgaWYgKGRldmljZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBkZXZpY2UgPSBhd2FpdCBuYXZpZ2F0b3IuYmx1ZXRvb3RoXHJcbiAgICAgICAgICAgICAgICAgICAgLnJlcXVlc3REZXZpY2Uoe1xyXG4gICAgICAgICAgICAgICAgICAgIGFjY2VwdEFsbERldmljZXM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcnM6IFt7IHNlcnZpY2VzOiBbY29uc3RhbnRzXzEuQmx1ZVRvb3RoSU9UVVVJRC5TZXJ2aWNlVXVpZC50b0xvd2VyQ2FzZSgpXSB9XSxcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25hbFNlcnZpY2VzOiBbJ2JhdHRlcnlfc2VydmljZScsICdnZW5lcmljX2FjY2VzcycsICdkZXZpY2VfaW5mb3JtYXRpb24nLCBjb25zdGFudHNfMS5CbHVlVG9vdGhJT1RVVUlELlNlcnZpY2VVdWlkLnRvTG93ZXJDYXNlKCldXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuYnREZXZpY2UgPSBkZXZpY2U7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkRFVklDRV9QQUlSRUQ7XHJcbiAgICAgICAgICAgIGxvZy5pbmZvKCdCbHVldG9vdGggZGV2aWNlICcgKyBkZXZpY2UubmFtZSArICcgY29ubmVjdGVkLicpO1xyXG4gICAgICAgICAgICBhd2FpdCAoMCwgdXRpbHNfMS5zbGVlcCkoNTAwKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICBsb2cud2FybignKiogZXJyb3Igd2hpbGUgY29ubmVjdGluZzogJyArIGVyci5tZXNzYWdlKTtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5idFN0YXRlLnJlc2V0KHRoaXMub25EaXNjb25uZWN0ZWQuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkVSUk9SO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuZXhjZXB0aW9ucysrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGFzeW5jIGZha2VQYWlyRGV2aWNlKCkge1xyXG4gICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkNPTk5FQ1RJTkc7XHJcbiAgICAgICAgY29uc3QgZm9yY2VTZWxlY3Rpb24gPSB0aGlzLmJ0U3RhdGUub3B0aW9ucy5mb3JjZURldmljZVNlbGVjdGlvbjtcclxuICAgICAgICBsb2cuZGVidWcoJ2Zha2VQYWlyRGV2aWNlKCcgKyBmb3JjZVNlbGVjdGlvbiArICcpJyk7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgZGV2aWNlID0ge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ0Zha2VCVERldmljZScsXHJcbiAgICAgICAgICAgICAgICBnYXR0OiB7IGNvbm5lY3RlZDogdHJ1ZSwgZGV2aWNlOiBudWxsLCBjb25uZWN0OiBudWxsLCBkaXNjb25uZWN0OiBudWxsLCBnZXRQcmltYXJ5U2VydmljZTogbnVsbCwgZ2V0UHJpbWFyeVNlcnZpY2VzOiBudWxsIH0sXHJcbiAgICAgICAgICAgICAgICBpZDogJzEnLFxyXG4gICAgICAgICAgICAgICAgZm9yZ2V0OiBudWxsLFxyXG4gICAgICAgICAgICAgICAgd2F0Y2hBZHZlcnRpc2VtZW50czogbnVsbCxcclxuICAgICAgICAgICAgICAgIHdhdGNoaW5nQWR2ZXJ0aXNlbWVudHM6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBhZGRFdmVudExpc3RlbmVyOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcjogbnVsbCxcclxuICAgICAgICAgICAgICAgIGRpc3BhdGNoRXZlbnQ6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBvbmFkdmVydGlzZW1lbnRyZWNlaXZlZDogbnVsbCxcclxuICAgICAgICAgICAgICAgIG9uZ2F0dHNlcnZlcmRpc2Nvbm5lY3RlZDogbnVsbCxcclxuICAgICAgICAgICAgICAgIG9uY2hhcmFjdGVyaXN0aWN2YWx1ZWNoYW5nZWQ6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBvbnNlcnZpY2VhZGRlZDogbnVsbCxcclxuICAgICAgICAgICAgICAgIG9uc2VydmljZXJlbW92ZWQ6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBvbnNlcnZpY2VjaGFuZ2VkOiBudWxsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5idERldmljZSA9IGRldmljZTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuREVWSUNFX1BBSVJFRDtcclxuICAgICAgICAgICAgbG9nLmluZm8oJ0JsdWV0b290aCBkZXZpY2UgJyArIGRldmljZS5uYW1lICsgJyBjb25uZWN0ZWQuJyk7XHJcbiAgICAgICAgICAgIGF3YWl0ICgwLCB1dGlsc18xLnNsZWVwKSg1MCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgbG9nLndhcm4oJyoqIGVycm9yIHdoaWxlIGNvbm5lY3Rpbmc6ICcgKyBlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYnRTdGF0ZS5yZXNldCgpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuZXhjZXB0aW9ucysrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBPbmNlIHRoZSBkZXZpY2UgaXMgYXZhaWxhYmxlLCBpbml0aWFsaXplIHRoZSBzZXJ2aWNlIGFuZCB0aGUgMiBjaGFyYWN0ZXJpc3RpY3MgbmVlZGVkLlxyXG4gICAgICAgKiAqL1xyXG4gICAgYXN5bmMgYnRTdWJzY3JpYmUoKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuU1VCU0NSSUJJTkc7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0cy5zdWJjcmliZXMrKztcclxuICAgICAgICAgICAgY29uc3QgZGV2aWNlID0gdGhpcy5idFN0YXRlLmJ0RGV2aWNlO1xyXG4gICAgICAgICAgICBjb25zdCBnYXR0c2VydmVyID0gbnVsbDtcclxuICAgICAgICAgICAgaWYgKGRldmljZSAmJiBkZXZpY2UuZ2F0dCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFkZXZpY2UuZ2F0dC5jb25uZWN0ZWQgfHwgdGhpcy5idFN0YXRlLmJ0R0FUVFNlcnZlciA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9nLmRlYnVnKGBDb25uZWN0aW5nIHRvIEdBVFQgU2VydmVyIG9uICR7ZGV2aWNlLm5hbWV9Li4uYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZGV2aWNlLmFkZEV2ZW50TGlzdGVuZXIoJ2dhdHRzZXJ2ZXJkaXNjb25uZWN0ZWQnLCB0aGlzLm9uRGlzY29ubmVjdGVkLmJpbmQodGhpcykpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5idEdBVFRTZXJ2ZXIgPSBhd2FpdCBkZXZpY2UuZ2F0dC5jb25uZWN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9nLmRlYnVnKCc+IEZvdW5kIEdBVFQgc2VydmVyJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBsb2cuZGVidWcoJ0dBVFQgYWxyZWFkeSBjb25uZWN0ZWQnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuYnRTdGF0ZS5yZXNldCh0aGlzLm9uRGlzY29ubmVjdGVkLmJpbmQodGhpcykpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLmJ0RGV2aWNlID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLk5PVF9DT05ORUNURUQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuZXhjZXB0aW9ucysrO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5idElPVFNlcnZpY2UgPSBhd2FpdCB0aGlzLmJ0U3RhdGUuYnRHQVRUU2VydmVyLmdldFByaW1hcnlTZXJ2aWNlKGNvbnN0YW50c18xLkJsdWVUb290aElPVFVVSUQuU2VydmljZVV1aWQpO1xyXG4gICAgICAgICAgICBsb2cuZGVidWcoJz4gRm91bmQgSU9UZXN0aW5nIGJvYXJkIHNlcnZpY2UnKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLmNoYXJXcml0ZSA9IGF3YWl0IHRoaXMuYnRTdGF0ZS5idElPVFNlcnZpY2UuZ2V0Q2hhcmFjdGVyaXN0aWMoY29uc3RhbnRzXzEuQmx1ZVRvb3RoSU9UVVVJRC5Db21tYW5kQ2hhclV1aWQpO1xyXG4gICAgICAgICAgICBsb2cuZGVidWcoJz4gRm91bmQgY29tbWFuZCBjaGFyYWN0ZXJpc3RpYycpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuY2hhclJlYWQgPSBhd2FpdCB0aGlzLmJ0U3RhdGUuYnRJT1RTZXJ2aWNlLmdldENoYXJhY3RlcmlzdGljKGNvbnN0YW50c18xLkJsdWVUb290aElPVFVVSUQuU3RhdHVzQ2hhclV1aWQpO1xyXG4gICAgICAgICAgICBsb2cuZGVidWcoJz4gRm91bmQgbm90aWZpY2F0aW9ucyBjaGFyYWN0ZXJpc3RpYycpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuYnREZXZpY2VJbmZvU2VydmljZSA9IGF3YWl0IHRoaXMuYnRTdGF0ZS5idEdBVFRTZXJ2ZXIuZ2V0UHJpbWFyeVNlcnZpY2UoJ2RldmljZV9pbmZvcm1hdGlvbicpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuY2hhckZpcm13YXJlID0gYXdhaXQgdGhpcy5idFN0YXRlLmJ0RGV2aWNlSW5mb1NlcnZpY2UuZ2V0Q2hhcmFjdGVyaXN0aWMoMHgyQTI2KTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLmNoYXJIV1JldiA9IGF3YWl0IHRoaXMuYnRTdGF0ZS5idERldmljZUluZm9TZXJ2aWNlLmdldENoYXJhY3RlcmlzdGljKDB4MmEyNyk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5idEJhdHRlcnlTZXJ2aWNlID0gYXdhaXQgdGhpcy5idFN0YXRlLmJ0R0FUVFNlcnZlci5nZXRQcmltYXJ5U2VydmljZSgnYmF0dGVyeV9zZXJ2aWNlJyk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5jaGFyQmF0dGVyeSA9IGF3YWl0IHRoaXMuYnRTdGF0ZS5idEJhdHRlcnlTZXJ2aWNlLmdldENoYXJhY3RlcmlzdGljKDB4MkExOSk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5yZXNwb25zZSA9IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5jaGFyUmVhZC5hZGRFdmVudExpc3RlbmVyKCdjaGFyYWN0ZXJpc3RpY3ZhbHVlY2hhbmdlZCcsIHRoaXMuaGFuZGxlTm90aWZpY2F0aW9ucy5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5idFN0YXRlLmNoYXJSZWFkLnN0YXJ0Tm90aWZpY2F0aW9ucygpO1xyXG4gICAgICAgICAgICBsb2cuaW5mbygnPiBCbHVldG9vdGggaW50ZXJmYWNlcyByZWFkeS4nKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLmxhc3RfY29ubmVjdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcclxuICAgICAgICAgICAgYXdhaXQgKDAsIHV0aWxzXzEuc2xlZXApKDUwKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuTUVURVJfSU5JVDtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICBsb2cud2FybignKiogZXJyb3Igd2hpbGUgc3Vic2NyaWJpbmc6ICcgKyBlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYnRTdGF0ZS5yZXNldCgpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5ERVZJQ0VfUEFJUkVEO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuZXhjZXB0aW9ucysrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGFzeW5jIGZha2VTdWJzY3JpYmUoKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuU1VCU0NSSUJJTkc7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0cy5zdWJjcmliZXMrKztcclxuICAgICAgICAgICAgY29uc3QgZGV2aWNlID0gdGhpcy5idFN0YXRlLmJ0RGV2aWNlO1xyXG4gICAgICAgICAgICBpZiAoIWRldmljZT8uZ2F0dD8uY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICBsb2cuZGVidWcoYENvbm5lY3RpbmcgdG8gR0FUVCBTZXJ2ZXIgb24gJHtkZXZpY2U/Lm5hbWV9Li4uYCk7XHJcbiAgICAgICAgICAgICAgICBsb2cuZGVidWcoJz4gRm91bmQgR0FUVCBzZXJ2ZXInKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsb2cuZGVidWcoJz4gRm91bmQgU2VyaWFsIHNlcnZpY2UnKTtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKCc+IEZvdW5kIHdyaXRlIGNoYXJhY3RlcmlzdGljJyk7XHJcbiAgICAgICAgICAgIGxvZy5kZWJ1ZygnPiBGb3VuZCByZWFkIGNoYXJhY3RlcmlzdGljJyk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5yZXNwb25zZSA9IG51bGw7XHJcbiAgICAgICAgICAgIGxvZy5pbmZvKCc+IEJsdWV0b290aCBpbnRlcmZhY2VzIHJlYWR5LicpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMubGFzdF9jb25uZWN0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xyXG4gICAgICAgICAgICBhd2FpdCAoMCwgdXRpbHNfMS5zbGVlcCkoMTApO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5NRVRFUl9JTklUO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIGxvZy53YXJuKCcqKiBlcnJvciB3aGlsZSBzdWJzY3JpYmluZzogJyArIGVyci5tZXNzYWdlKTtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5idFN0YXRlLnJlc2V0KHRoaXMub25EaXNjb25uZWN0ZWQuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkRFVklDRV9QQUlSRUQ7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0cy5leGNlcHRpb25zKys7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgICAqIFdoZW4gaWRsZSwgdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWRcclxuICAgICAgICogKi9cclxuICAgIGFzeW5jIHJlZnJlc2goKSB7XHJcbiAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuQlVTWTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBsb2cuZGVidWcoJ1xcdFxcdEZpbmlzaGVkIHJlZnJlc2hpbmcgY3VycmVudCBzdGF0ZScpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5idFN0YXRlLnJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ0U3RhdGUubGFzdE1lYXN1cmUgPSBJT1Rlc3RpbmdCb2FyZF8xLklPVGVzdGluZ0JvYXJkLnBhcnNlTm90aWZpY2F0aW9uKHRoaXMuYnRTdGF0ZS5yZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ0U3RhdGUucmVzcG9uc2UgPSBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmJ0U3RhdGUubGFzdE1lYXN1cmUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLm1ldGVyLmFjdHVhbCA9IHRoaXMuYnRTdGF0ZS5sYXN0TWVhc3VyZS5BY3R1YWxfUjtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5tZXRlci5zZXRwb2ludCA9IHRoaXMuYnRTdGF0ZS5sYXN0TWVhc3VyZS5TZXRwb2ludF9SO1xyXG4gICAgICAgICAgICAgICAgLy8gUmVhZCByYW5kb21seSBvbmNlIGV2ZXJ5IDIwIGxvb3BzXHJcbiAgICAgICAgICAgICAgICBpZiAoTWF0aC5yYW5kb20oKSA+IDAuOTUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ0U3RhdGUubWV0ZXIuYmF0dGVyeSA9IGF3YWl0IHRoaXMuaW90LmdldEJhdHRlcnlMZXZlbCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYnRTdGF0ZS5sYXN0TWVhc3VyZS5UZXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLm1ldGVyLm1vZGUgPSBjb25zdGFudHNfMS5Cb2FyZE1vZGUuTU9ERV9URVNUO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5idFN0YXRlLmxhc3RNZWFzdXJlLlJlbGF5ID09IGNvbnN0YW50c18xLlJlbGF5UG9zaXRpb24uUE9TX01FVEVSKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLm1ldGVyLm1vZGUgPSBjb25zdGFudHNfMS5Cb2FyZE1vZGUuTU9ERV9NRVRFUjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuYnRTdGF0ZS5sYXN0TWVhc3VyZS5SZWxheSA9PSBjb25zdGFudHNfMS5SZWxheVBvc2l0aW9uLlBPU19SRVNJU1RPUikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmJ0U3RhdGUubGFzdE1lYXN1cmUuVl93aXRoX2xvYWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLm1ldGVyLm1vZGUgPSBjb25zdGFudHNfMS5Cb2FyZE1vZGUuTU9ERV9WX1dJVEhfTE9BRDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5tZXRlci5tb2RlID0gY29uc3RhbnRzXzEuQm9hcmRNb2RlLk1PREVfUkVTSVNUT1I7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLm1ldGVyLm1vZGUgPSBjb25zdGFudHNfMS5Cb2FyZE1vZGUuTU9ERV9VTkRFRklORUQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ0U3RhdGUubWV0ZXIuZnJlZV9ieXRlcyA9IHRoaXMuYnRTdGF0ZS5sYXN0TWVhc3VyZS5NZW1mcmVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLklETEU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgbG9nLndhcm4oJ0Vycm9yIHdoaWxlIHJlZnJlc2hpbmcgbWVhc3VyZScgKyBlcnIpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5ERVZJQ0VfUEFJUkVEO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuZXhjZXB0aW9ucysrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFNldFNpbXVsYXRpb24odmFsdWUpIHtcclxuICAgICAgICB0aGlzLnNpbXVsYXRpb24gPSB2YWx1ZTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLkRyaXZlciA9IERyaXZlcjtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9RHJpdmVyLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuSU9UZXN0aW5nQm9hcmQgPSB2b2lkIDA7XHJcbmNvbnN0IGxvZyA9IHJlcXVpcmUoXCJsb2dsZXZlbFwiKTtcclxuY29uc3QgY29uc3RhbnRzXzEgPSByZXF1aXJlKFwiLi9jb25zdGFudHNcIik7XHJcbmNvbnN0IE5vdGlmaWNhdGlvbkRhdGFfMSA9IHJlcXVpcmUoXCIuL05vdGlmaWNhdGlvbkRhdGFcIik7XHJcbmNsYXNzIElPVGVzdGluZ0JvYXJkIHtcclxuICAgIGNvbnN0cnVjdG9yKGZuU2VuZEFuZFJlc3BvbnNlLCBidEFwaSkge1xyXG4gICAgICAgIHRoaXMuU2VuZEFuZFJlc3BvbnNlID0gZm5TZW5kQW5kUmVzcG9uc2U7XHJcbiAgICAgICAgdGhpcy5idFN0YXRlID0gYnRBcGk7XHJcbiAgICB9XHJcbiAgICB1aW50VG9TdHJpbmcoZHYpIHtcclxuICAgICAgICBjb25zdCB1aW50OGFyciA9IFtdO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZHYuYnl0ZUxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHVpbnQ4YXJyLnB1c2goZHYuZ2V0VWludDgoaSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBlbmNvZGVkU3RyaW5nID0gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShudWxsLCB1aW50OGFycik7XHJcbiAgICAgICAgY29uc3QgZGVjb2RlZFN0cmluZyA9IGRlY29kZVVSSUNvbXBvbmVudChlbmNvZGVkU3RyaW5nKTtcclxuICAgICAgICByZXR1cm4gZGVjb2RlZFN0cmluZztcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBHZXRzIHRoZSBtZXRlciBzZXJpYWwgbnVtYmVyXHJcbiAgICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XHJcbiAgICAgICAqL1xyXG4gICAgYXN5bmMgZ2V0SGFyZHdhcmVSZXZpc2lvbigpIHtcclxuICAgICAgICBsb2cuZGVidWcoJ1xcdFxcdFJlYWRpbmcgSFcgcmV2Jyk7XHJcbiAgICAgICAgY29uc3QgZHYgPSBhd2FpdCB0aGlzLmJ0U3RhdGUuY2hhckhXUmV2LnJlYWRWYWx1ZSgpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnVpbnRUb1N0cmluZyhkdik7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAgICogR2V0cyB0aGUgbWV0ZXIgc2VyaWFsIG51bWJlclxyXG4gICAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxyXG4gICAgICAgKi9cclxuICAgIGFzeW5jIGdldEZpcm13YXJlKCkge1xyXG4gICAgICAgIGxvZy5kZWJ1ZygnXFx0XFx0UmVhZGluZyBmaXJtd2FyZSB2ZXJzaW9uJyk7XHJcbiAgICAgICAgY29uc3QgZHYgPSBhd2FpdCB0aGlzLmJ0U3RhdGUuY2hhckZpcm13YXJlLnJlYWRWYWx1ZSgpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnVpbnRUb1N0cmluZyhkdik7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAgICogR2V0cyB0aGUgYmF0dGVyeSBsZXZlbCBpbmRpY2F0aW9uXHJcbiAgICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IHBlcmNlbnRhZ2UgKCUpXHJcbiAgICAgICAqL1xyXG4gICAgYXN5bmMgZ2V0QmF0dGVyeUxldmVsKCkge1xyXG4gICAgICAgIGxvZy5kZWJ1ZygnXFx0XFx0UmVhZGluZyBiYXR0ZXJ5IHZvbHRhZ2UnKTtcclxuICAgICAgICBjb25zdCBkdiA9IGF3YWl0IHRoaXMuYnRTdGF0ZS5jaGFyQmF0dGVyeS5yZWFkVmFsdWUoKTtcclxuICAgICAgICByZXR1cm4gZHYuZ2V0VWludDgoMCk7XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgcGFyc2VOb3RpZmljYXRpb24oYnVmKSB7XHJcbiAgICAgICAgaWYgKGJ1Zi5ieXRlTGVuZ3RoIDwgMTEpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IG91dHB1dCA9IG5ldyBOb3RpZmljYXRpb25EYXRhXzEuTm90aWZpY2F0aW9uRGF0YSgpO1xyXG4gICAgICAgIGNvbnN0IGR2ID0gbmV3IERhdGFWaWV3KGJ1Zik7XHJcbiAgICAgICAgY29uc3Qgc3RhdHVzMSA9IGR2LmdldFVpbnQ4KDEpO1xyXG4gICAgICAgIGNvbnN0IHN0YXR1czIgPSBkdi5nZXRVaW50OCgwKTtcclxuICAgICAgICBvdXRwdXQuV2lGaSA9IChzdGF0dXMxID4+IDYpICYgMztcclxuICAgICAgICBvdXRwdXQuUmVsYXkgPSAoc3RhdHVzMSA+PiA0KSAmIDM7XHJcbiAgICAgICAgb3V0cHV0LkJsdWV0b290aCA9IChzdGF0dXMxID4+IDEpICYgNztcclxuICAgICAgICBvdXRwdXQuRXJyb3IgPSAoc3RhdHVzMiAmIDY0KSAhPSAwO1xyXG4gICAgICAgIG91dHB1dC5GcmVxdWVuY3kgPSAoc3RhdHVzMiA+PiA1KSAmIDM7XHJcbiAgICAgICAgb3V0cHV0LlZlcmJvc2UgPSAoc3RhdHVzMiAmIDgpICE9IDA7XHJcbiAgICAgICAgb3V0cHV0LlRlc3QgPSAoc3RhdHVzMiAmIDQpICE9IDA7XHJcbiAgICAgICAgb3V0cHV0LlZfd2l0aF9sb2FkID0gKHN0YXR1czIgJiAyKSAhPSAwO1xyXG4gICAgICAgIG91dHB1dC5MYXN0UmVzdWx0ID0gKHN0YXR1czIgJiAxKSAhPSAwO1xyXG4gICAgICAgIG91dHB1dC5BY3R1YWxfUiA9IGR2LmdldFVpbnQxNigyLCB0cnVlKTtcclxuICAgICAgICBvdXRwdXQuU2V0cG9pbnRfUiA9IGR2LmdldFVpbnQxNig0LCB0cnVlKTtcclxuICAgICAgICBvdXRwdXQuTWVtZnJlZSA9IGR2LmdldFVpbnQzMig2LCB0cnVlKTtcclxuICAgICAgICBvdXRwdXQuQ29tbWFuZENwdCA9IGR2LmdldFVpbnQ4KDEwKTtcclxuICAgICAgICBsb2cuZGVidWcoJ0RlY29kZWQgbm90aWZpY2F0aW9uJywgb3V0cHV0KTtcclxuICAgICAgICByZXR1cm4gb3V0cHV0O1xyXG4gICAgfVxyXG4gICAgc3RhdGljIGdldFBhY2tldChjb21tYW5kKSB7XHJcbiAgICAgICAgbGV0IGJ1ZjtcclxuICAgICAgICBsZXQgZHY7XHJcbiAgICAgICAgc3dpdGNoIChjb21tYW5kLnR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0JSRUFLOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfRElTQUJMRV9XRUJSRVBMOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfRElTQUJMRV9XSUZJOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfRU5BQkxFX1dFQlJFUEw6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9FTkFCTEVfV0lGSTpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0xJR0hUX1NMRUVQOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfTU9ERV9NRVRFUjpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1JFQk9PVDpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1JFRlJFU0g6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9SVU5fVEVTVDpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1JfVEVTVDpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0RFRVBfU0xFRVA6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9DTEVBUl9GTEFHUzpcclxuICAgICAgICAgICAgICAgIC8vIE5vIHBhcmFtZXRlclxyXG4gICAgICAgICAgICAgICAgYnVmID0gbmV3IEFycmF5QnVmZmVyKDEpO1xyXG4gICAgICAgICAgICAgICAgZHYgPSBuZXcgRGF0YVZpZXcoYnVmKTtcclxuICAgICAgICAgICAgICAgIGR2LnNldFVpbnQ4KDAsIGNvbW1hbmQudHlwZSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYnVmO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfQ09ORklHVVJFX01FVEVSX0NPTU06XHJcbiAgICAgICAgICAgICAgICBidWYgPSBuZXcgQXJyYXlCdWZmZXIoMSArIDUpO1xyXG4gICAgICAgICAgICAgICAgZHYgPSBuZXcgRGF0YVZpZXcoYnVmKTtcclxuICAgICAgICAgICAgICAgIGR2LnNldFVpbnQ4KDAsIGNvbW1hbmQudHlwZSk7XHJcbiAgICAgICAgICAgICAgICBkdi5zZXRVaW50OCgxLCBjb21tYW5kLnNldHBvaW50KTtcclxuICAgICAgICAgICAgICAgIGR2LnNldFVpbnQ4KDIsIGNvbW1hbmQuc2V0cG9pbnQyKTtcclxuICAgICAgICAgICAgICAgIGR2LnNldFVpbnQ4KDMsIGNvbW1hbmQuc2V0cG9pbnQzKTtcclxuICAgICAgICAgICAgICAgIGR2LnNldFVpbnQxNig0LCBjb21tYW5kLnNldHBvaW50NCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYnVmO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0NQVTpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9JTklUSUFMX0NPTU1BTkRfU0VUUE9JTlQ6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfSU5JVElBTF9DT01NQU5EX1RZUEU6XHJcbiAgICAgICAgICAgICAgICAvLyBPbmUgVWludDggcGFyYW1ldGVyXHJcbiAgICAgICAgICAgICAgICBidWYgPSBuZXcgQXJyYXlCdWZmZXIoMik7XHJcbiAgICAgICAgICAgICAgICBkdiA9IG5ldyBEYXRhVmlldyhidWYpO1xyXG4gICAgICAgICAgICAgICAgZHYuc2V0VWludDgoMCwgY29tbWFuZC50eXBlKTtcclxuICAgICAgICAgICAgICAgIGR2LnNldFVpbnQ4KDEsIGNvbW1hbmQuc2V0cG9pbnQpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ1ZjtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX01FVEVSX0NPTU1BTkRTOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0lOSVRJQUxfQkxVRVRPT1RIOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0lOSVRJQUxfTUVURVJfQ09NTTpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9PVEE6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfVkVSQk9TRTpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9JTklUSUFMX1dJRkk6XHJcbiAgICAgICAgICAgICAgICAvLyBPbmUgVWludDggcGFyYW1ldGVyIHdpdGggMSBvciAwIHZhbHVlXHJcbiAgICAgICAgICAgICAgICBidWYgPSBuZXcgQXJyYXlCdWZmZXIoMik7XHJcbiAgICAgICAgICAgICAgICBkdiA9IG5ldyBEYXRhVmlldyhidWYpO1xyXG4gICAgICAgICAgICAgICAgZHYuc2V0VWludDgoMCwgY29tbWFuZC50eXBlKTtcclxuICAgICAgICAgICAgICAgIGR2LnNldFVpbnQ4KDEsIGNvbW1hbmQuc2V0cG9pbnQgPyAxIDogMCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYnVmO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfTU9ERV9SRVNJU1RPUlM6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9NT0RFX1ZfTE9BRDpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9ERUVQU0xFRVBfTUlOOlxyXG4gICAgICAgICAgICAgICAgLy8gT25lIFVpbnQxNiBSIHBhcmFtZXRlclxyXG4gICAgICAgICAgICAgICAgYnVmID0gbmV3IEFycmF5QnVmZmVyKDMpO1xyXG4gICAgICAgICAgICAgICAgZHYgPSBuZXcgRGF0YVZpZXcoYnVmKTtcclxuICAgICAgICAgICAgICAgIGR2LnNldFVpbnQ4KDAsIGNvbW1hbmQudHlwZSk7XHJcbiAgICAgICAgICAgICAgICBkdi5zZXRVaW50MTYoMSwgY29tbWFuZC5zZXRwb2ludCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYnVmO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0JMVUVUT09USF9OQU1FOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX1dJRklfTkVUV09SSzpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9XSUZJX1BBU1NXT1JEOlxyXG4gICAgICAgICAgICAgICAgLy8gT25lIFVURjggc3RyaW5nIHBhcmFtZXRlclxyXG4gICAgICAgICAgICAgICAgY29uc3QgdXRmOEVuY29kZSA9IG5ldyBUZXh0RW5jb2RlcigpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYnl0ZXNfdXRmOCA9IHV0ZjhFbmNvZGUuZW5jb2RlKGNvbW1hbmQuc2V0cG9pbnQpO1xyXG4gICAgICAgICAgICAgICAgYnVmID0gbmV3IEFycmF5QnVmZmVyKDEgKyBieXRlc191dGY4Lmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICBkdiA9IG5ldyBEYXRhVmlldyhidWYpO1xyXG4gICAgICAgICAgICAgICAgZHYuc2V0VWludDgoMCwgY29tbWFuZC50eXBlKTtcclxuICAgICAgICAgICAgICAgIHZhciBieXRlX251bSA9IDE7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGJ5dGVfdiBvZiBieXRlc191dGY4KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZHYuc2V0VWludDgoYnl0ZV9udW0sIGJ5dGVfdik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnl0ZV9udW0rKztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBidWY7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29tbWFuZCcgKyBjb21tYW5kKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5JT1Rlc3RpbmdCb2FyZCA9IElPVGVzdGluZ0JvYXJkO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1JT1Rlc3RpbmdCb2FyZC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLk1ldGVyU3RhdGUgPSB2b2lkIDA7XHJcbmNvbnN0IGNvbnN0YW50c18xID0gcmVxdWlyZShcIi4vY29uc3RhbnRzXCIpO1xyXG4vKipcclxuICogQ3VycmVudCBzdGF0ZSBvZiB0aGUgbWV0ZXJcclxuICogKi9cclxuY2xhc3MgTWV0ZXJTdGF0ZSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLmZpcm13YXJlID0gJz8/Pyc7IC8vIEZpcm13YXJlIHZlcnNpb25cclxuICAgICAgICB0aGlzLmh3X3JldiA9ICc/Pz8nOyAvLyBTZXJpYWwgbnVtYmVyXHJcbiAgICAgICAgdGhpcy5tb2RlID0gY29uc3RhbnRzXzEuQm9hcmRNb2RlLk1PREVfVU5ERUZJTkVEO1xyXG4gICAgICAgIHRoaXMuc2V0cG9pbnQgPSAweEZGRkY7XHJcbiAgICAgICAgdGhpcy5hY3R1YWwgPSAweEZGRkY7XHJcbiAgICAgICAgdGhpcy5mcmVlX2J5dGVzID0gMDtcclxuICAgICAgICB0aGlzLmJhdHRlcnkgPSAwO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuTWV0ZXJTdGF0ZSA9IE1ldGVyU3RhdGU7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPU1ldGVyU3RhdGUuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5Ob3RpZmljYXRpb25EYXRhID0gdm9pZCAwO1xyXG4vLyBNdXN0IG1hdGNoIHdpdGggX19nZXRfbm90aWZpY2F0aW9uX2RhdGEgaW4gYm9hcmRidC5weSBmaXJtd2FyZSBjb2RlLlxyXG5jbGFzcyBOb3RpZmljYXRpb25EYXRhIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMuV2lGaSA9IDA7XHJcbiAgICAgICAgdGhpcy5SZWxheSA9IDA7XHJcbiAgICAgICAgdGhpcy5CbHVldG9vdGggPSAwO1xyXG4gICAgICAgIHRoaXMuRnJlcXVlbmN5ID0gMDtcclxuICAgICAgICB0aGlzLlZlcmJvc2UgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLlRlc3QgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLlZfd2l0aF9sb2FkID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5MYXN0UmVzdWx0ID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5BY3R1YWxfUiA9IDA7XHJcbiAgICAgICAgdGhpcy5TZXRwb2ludF9SID0gMDtcclxuICAgICAgICB0aGlzLk1lbWZyZWUgPSAwO1xyXG4gICAgICAgIHRoaXMuRXJyb3IgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLkNvbW1hbmRDcHQgPSAwO1xyXG4gICAgICAgIHRoaXMuVGltZXN0YW1wID0gbmV3IERhdGUoKTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLk5vdGlmaWNhdGlvbkRhdGEgPSBOb3RpZmljYXRpb25EYXRhO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1Ob3RpZmljYXRpb25EYXRhLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuQmx1ZVRvb3RoSU9UVVVJRCA9IGV4cG9ydHMuTUFYX1VfR0VOID0gZXhwb3J0cy5SZXN1bHRDb2RlID0gZXhwb3J0cy5TdGF0ZSA9IGV4cG9ydHMuUmVsYXlQb3NpdGlvbiA9IGV4cG9ydHMuQm9hcmRNb2RlID0gZXhwb3J0cy5Db21tYW5kVHlwZSA9IHZvaWQgMDtcclxuLyoqXHJcbiAqIENvbW1hbmRzIHJlY29nbml6ZWQgYnkgSU9UZXN0aW5nIEJvYXJkIG1vZHVsZVxyXG4gKiAqL1xyXG5leHBvcnRzLkNvbW1hbmRUeXBlID0ge1xyXG4gICAgTk9ORV9VTktOT1dOOiAwLFxyXG4gICAgQ09NTUFORF9FTkFCTEVfV0lGSTogMHgwMSxcclxuICAgIENPTU1BTkRfRElTQUJMRV9XSUZJOiAweDAyLFxyXG4gICAgQ09NTUFORF9FTkFCTEVfV0VCUkVQTDogMHgwMyxcclxuICAgIENPTU1BTkRfRElTQUJMRV9XRUJSRVBMOiAweDA0LFxyXG4gICAgQ09NTUFORF9CUkVBSzogMHgwNSxcclxuICAgIENPTU1BTkRfTU9ERV9NRVRFUjogMHgwNixcclxuICAgIENPTU1BTkRfTU9ERV9SRVNJU1RPUlM6IDB4MDcsXHJcbiAgICBDT01NQU5EX01PREVfVl9MT0FEOiAweDA4LFxyXG4gICAgQ09NTUFORF9SRUJPT1Q6IDB4MDksXHJcbiAgICBDT01NQU5EX1JVTl9URVNUOiAweDBBLFxyXG4gICAgQ09NTUFORF9MSUdIVF9TTEVFUDogMHgwQixcclxuICAgIENPTU1BTkRfREVFUF9TTEVFUDogMHgwQyxcclxuICAgIENPTU1BTkRfTUVURVJfQ09NTUFORFM6IDB4MEQsXHJcbiAgICBDT01NQU5EX1NFVF9JTklUSUFMX01FVEVSX0NPTU06IDB4MEUsXHJcbiAgICBDT01NQU5EX1NFVF9XSUZJX05FVFdPUks6IDB4MEYsXHJcbiAgICBDT01NQU5EX1NFVF9XSUZJX1BBU1NXT1JEOiAweDEwLFxyXG4gICAgQ09NTUFORF9TRVRfSU5JVElBTF9CTFVFVE9PVEg6IDB4MTEsXHJcbiAgICBDT01NQU5EX1NFVF9JTklUSUFMX1dJRkk6IDB4MTIsXHJcbiAgICBDT01NQU5EX1NFVF9ERUVQU0xFRVBfTUlOOiAweDEzLFxyXG4gICAgQ09NTUFORF9TRVRfVkVSQk9TRTogMHgxNCxcclxuICAgIENPTU1BTkRfU0VUX0lOSVRJQUxfQ09NTUFORF9UWVBFOiAweDE1LFxyXG4gICAgQ09NTUFORF9TRVRfSU5JVElBTF9DT01NQU5EX1NFVFBPSU5UOiAweDE2LFxyXG4gICAgQ09NTUFORF9SX1RFU1Q6IDB4MTcsXHJcbiAgICBDT01NQU5EX1NFVF9DUFU6IDB4MTgsXHJcbiAgICBDT01NQU5EX1NFVF9PVEE6IDB4MTksXHJcbiAgICBDT01NQU5EX0NPTkZJR1VSRV9NRVRFUl9DT01NOiAweDIwLFxyXG4gICAgQ09NTUFORF9TRVRfQkxVRVRPT1RIX05BTUU6IDB4MjEsXHJcbiAgICBDT01NQU5EX1JFRlJFU0g6IDB4MjIsXHJcbiAgICBDT01NQU5EX0NMRUFSX0ZMQUdTOiAweDIzXHJcbn07XHJcbmV4cG9ydHMuQm9hcmRNb2RlID0ge1xyXG4gICAgTU9ERV9VTkRFRklORUQ6IDAsXHJcbiAgICBNT0RFX01FVEVSOiAxLFxyXG4gICAgTU9ERV9SRVNJU1RPUjogMixcclxuICAgIE1PREVfVl9XSVRIX0xPQUQ6IDMsXHJcbiAgICBNT0RFX1RFU1Q6IDRcclxufTtcclxuZXhwb3J0cy5SZWxheVBvc2l0aW9uID0ge1xyXG4gICAgUE9TX1VOS05PV046IDAsXHJcbiAgICBQT1NfTUVURVI6IDEsXHJcbiAgICBQT1NfUkVTSVNUT1I6IDJcclxufTtcclxuLypcclxuICogSW50ZXJuYWwgc3RhdGUgbWFjaGluZSBkZXNjcmlwdGlvbnNcclxuICovXHJcbmV4cG9ydHMuU3RhdGUgPSB7XHJcbiAgICBOT1RfQ09OTkVDVEVEOiAnTm90IGNvbm5lY3RlZCcsXHJcbiAgICBDT05ORUNUSU5HOiAnQmx1ZXRvb3RoIGRldmljZSBwYWlyaW5nLi4uJyxcclxuICAgIERFVklDRV9QQUlSRUQ6ICdEZXZpY2UgcGFpcmVkJyxcclxuICAgIFNVQlNDUklCSU5HOiAnQmx1ZXRvb3RoIGludGVyZmFjZXMgY29ubmVjdGluZy4uLicsXHJcbiAgICBJRExFOiAnSWRsZScsXHJcbiAgICBCVVNZOiAnQnVzeScsXHJcbiAgICBFUlJPUjogJ0Vycm9yJyxcclxuICAgIFNUT1BQSU5HOiAnQ2xvc2luZyBCVCBpbnRlcmZhY2VzLi4uJyxcclxuICAgIFNUT1BQRUQ6ICdTdG9wcGVkJyxcclxuICAgIE1FVEVSX0lOSVQ6ICdNZXRlciBjb25uZWN0ZWQnLFxyXG4gICAgTUVURVJfSU5JVElBTElaSU5HOiAnUmVhZGluZyBib2FyZCBzdGF0ZS4uLidcclxufTtcclxuZXhwb3J0cy5SZXN1bHRDb2RlID0ge1xyXG4gICAgRkFJTEVEX05PX1JFVFJZOiAxLFxyXG4gICAgRkFJTEVEX1NIT1VMRF9SRVRSWTogMixcclxuICAgIFNVQ0NFU1M6IDBcclxufTtcclxuZXhwb3J0cy5NQVhfVV9HRU4gPSAyNy4wOyAvLyBtYXhpbXVtIHZvbHRhZ2VcclxuLypcclxuICogQmx1ZXRvb3RoIGNvbnN0YW50c1xyXG4gKi9cclxuZXhwb3J0cy5CbHVlVG9vdGhJT1RVVUlEID0ge1xyXG4gICAgU2VydmljZVV1aWQ6ICcwMDAzY2RkNS0wMDAwLTEwMDAtODAwMC0wMDgwNWY5YjAxMzEnLFxyXG4gICAgU3RhdHVzQ2hhclV1aWQ6ICcwMDAzY2RkMy0wMDAwLTEwMDAtODAwMC0wMDgwNWY5YjAxMzEnLFxyXG4gICAgQ29tbWFuZENoYXJVdWlkOiAnMDAwM2NkZDQtMDAwMC0xMDAwLTgwMDAtMDA4MDVmOWIwMTMxJyAvLyBjb21tYW5kcyB0byB0aGUgYm9hcmRcclxufTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29uc3RhbnRzLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuQm9hcmRNb2RlID0gZXhwb3J0cy5TdGF0ZSA9IGV4cG9ydHMuc2V0TGV2ZWwgPSBleHBvcnRzLkNvbW1hbmRUeXBlID0gZXhwb3J0cy5Db21tYW5kID0gZXhwb3J0cy5kcml2ZXIgPSBleHBvcnRzLlNpbXBsZUV4ZWN1dGVKU09OID0gZXhwb3J0cy5FeGVjdXRlSlNPTiA9IGV4cG9ydHMuR2V0U3RhdGVKU09OID0gZXhwb3J0cy5HZXRTdGF0ZSA9IGV4cG9ydHMuU2ltcGxlRXhlY3V0ZSA9IGV4cG9ydHMuRXhlY3V0ZSA9IGV4cG9ydHMuUGFpciA9IGV4cG9ydHMuU3RvcCA9IHZvaWQgMDtcclxuY29uc3QgY29uc3RhbnRzXzEgPSByZXF1aXJlKFwiLi9jb25zdGFudHNcIik7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIlN0YXRlXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBjb25zdGFudHNfMS5TdGF0ZTsgfSB9KTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiQ29tbWFuZFR5cGVcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlOyB9IH0pO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJCb2FyZE1vZGVcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGNvbnN0YW50c18xLkJvYXJkTW9kZTsgfSB9KTtcclxuY29uc3QgQ29tbWFuZF8xID0gcmVxdWlyZShcIi4vQ29tbWFuZFwiKTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiQ29tbWFuZFwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gQ29tbWFuZF8xLkNvbW1hbmQ7IH0gfSk7XHJcbmNvbnN0IGxvZ2xldmVsXzEgPSByZXF1aXJlKFwibG9nbGV2ZWxcIik7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcInNldExldmVsXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBsb2dsZXZlbF8xLnNldExldmVsOyB9IH0pO1xyXG5jb25zdCBtZXRlclB1YmxpY0FQSV8xID0gcmVxdWlyZShcIi4vbWV0ZXJQdWJsaWNBUElcIik7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIlN0b3BcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIG1ldGVyUHVibGljQVBJXzEuU3RvcDsgfSB9KTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiUGFpclwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gbWV0ZXJQdWJsaWNBUElfMS5QYWlyOyB9IH0pO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJFeGVjdXRlXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBtZXRlclB1YmxpY0FQSV8xLkV4ZWN1dGU7IH0gfSk7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIlNpbXBsZUV4ZWN1dGVcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIG1ldGVyUHVibGljQVBJXzEuU2ltcGxlRXhlY3V0ZTsgfSB9KTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiR2V0U3RhdGVcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIG1ldGVyUHVibGljQVBJXzEuR2V0U3RhdGU7IH0gfSk7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIkdldFN0YXRlSlNPTlwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gbWV0ZXJQdWJsaWNBUElfMS5HZXRTdGF0ZUpTT047IH0gfSk7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIkV4ZWN1dGVKU09OXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBtZXRlclB1YmxpY0FQSV8xLkV4ZWN1dGVKU09OOyB9IH0pO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJTaW1wbGVFeGVjdXRlSlNPTlwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gbWV0ZXJQdWJsaWNBUElfMS5TaW1wbGVFeGVjdXRlSlNPTjsgfSB9KTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiZHJpdmVyXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBtZXRlclB1YmxpY0FQSV8xLmRyaXZlcjsgfSB9KTtcclxuLy8gRGVmaW5lcyBkZWZhdWx0IGxldmVsIG9uIHN0YXJ0dXBcclxuKDAsIGxvZ2xldmVsXzEuc2V0TGV2ZWwpKGxvZ2xldmVsXzEubGV2ZWxzLkVSUk9SLCB0cnVlKTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWV0ZXJBcGkuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbi8qXHJcbiAqIFRoaXMgZmlsZSBjb250YWlucyB0aGUgcHVibGljIEFQSSBvZiB0aGUgbWV0ZXIsIGkuZS4gdGhlIGZ1bmN0aW9ucyBkZXNpZ25lZFxyXG4gKiB0byBiZSBjYWxsZWQgZnJvbSB0aGlyZCBwYXJ0eSBjb2RlLlxyXG4gKiAxLSBQYWlyKCkgOiBib29sXHJcbiAqIDItIEV4ZWN1dGUoQ29tbWFuZCkgOiBib29sICsgSlNPTiB2ZXJzaW9uXHJcbiAqIDMtIFN0b3AoKSA6IGJvb2xcclxuICogNC0gR2V0U3RhdGUoKSA6IGFycmF5ICsgSlNPTiB2ZXJzaW9uXHJcbiAqIDUtIFNpbXBsZUV4ZWN1dGUoQ29tbWFuZCkgOiByZXR1cm5zIHRoZSB1cGRhdGVkIG1lYXN1cmVtZW50IG9yIG51bGxcclxuICovXHJcbnZhciBfX2ltcG9ydERlZmF1bHQgPSAodGhpcyAmJiB0aGlzLl9faW1wb3J0RGVmYXVsdCkgfHwgZnVuY3Rpb24gKG1vZCkge1xyXG4gICAgcmV0dXJuIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpID8gbW9kIDogeyBcImRlZmF1bHRcIjogbW9kIH07XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5TdG9wID0gZXhwb3J0cy5QYWlyID0gZXhwb3J0cy5FeGVjdXRlID0gZXhwb3J0cy5TaW1wbGVFeGVjdXRlID0gZXhwb3J0cy5TaW1wbGVFeGVjdXRlSlNPTiA9IGV4cG9ydHMuRXhlY3V0ZUpTT04gPSBleHBvcnRzLkdldFN0YXRlSlNPTiA9IGV4cG9ydHMuR2V0U3RhdGUgPSBleHBvcnRzLmRyaXZlciA9IHZvaWQgMDtcclxuY29uc3QgRHJpdmVyXzEgPSByZXF1aXJlKFwiLi9Ecml2ZXJcIik7XHJcbmNvbnN0IENvbW1hbmRSZXN1bHRfMSA9IHJlcXVpcmUoXCIuL0NvbW1hbmRSZXN1bHRcIik7XHJcbmNvbnN0IENvbW1hbmRfMSA9IHJlcXVpcmUoXCIuL0NvbW1hbmRcIik7XHJcbmNvbnN0IGNvbnN0YW50c18xID0gcmVxdWlyZShcIi4vY29uc3RhbnRzXCIpO1xyXG5jb25zdCB1dGlsc18xID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XHJcbmNvbnN0IGxvZ2xldmVsXzEgPSBfX2ltcG9ydERlZmF1bHQocmVxdWlyZShcImxvZ2xldmVsXCIpKTtcclxuLy8gVXNlZnVsIGluZm9ybWF0aW9uIGZvciBkZWJ1Z2dpbmcsIGV2ZW4gaWYgaXQgc2hvdWxkIG5vdCBiZSBleHBvc2VkXHJcbmV4cG9ydHMuZHJpdmVyID0gbmV3IERyaXZlcl8xLkRyaXZlcigpO1xyXG4vKipcclxuICogUmV0dXJucyBhIGNvcHkgb2YgdGhlIGN1cnJlbnQgc3RhdGVcclxuICogQHJldHVybnMge2FycmF5fSBzdGF0dXMgb2YgbWV0ZXJcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIEdldFN0YXRlKCkge1xyXG4gICAgbGV0IHJlYWR5ID0gZmFsc2U7XHJcbiAgICBsZXQgaW5pdGlhbGl6aW5nID0gZmFsc2U7XHJcbiAgICBzd2l0Y2ggKGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhdGUpIHtcclxuICAgICAgICAvLyBTdGF0ZXMgcmVxdWlyaW5nIHVzZXIgaW5wdXRcclxuICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLkVSUk9SOlxyXG4gICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuU1RPUFBFRDpcclxuICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLk5PVF9DT05ORUNURUQ6XHJcbiAgICAgICAgICAgIHJlYWR5ID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGluaXRpYWxpemluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLkJVU1k6XHJcbiAgICAgICAgY2FzZSBjb25zdGFudHNfMS5TdGF0ZS5JRExFOlxyXG4gICAgICAgICAgICByZWFkeSA9IHRydWU7XHJcbiAgICAgICAgICAgIGluaXRpYWxpemluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLkNPTk5FQ1RJTkc6XHJcbiAgICAgICAgY2FzZSBjb25zdGFudHNfMS5TdGF0ZS5ERVZJQ0VfUEFJUkVEOlxyXG4gICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuTUVURVJfSU5JVDpcclxuICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLk1FVEVSX0lOSVRJQUxJWklORzpcclxuICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLlNVQlNDUklCSU5HOlxyXG4gICAgICAgICAgICBpbml0aWFsaXppbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICByZWFkeSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICByZWFkeSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBpbml0aWFsaXppbmcgPSBmYWxzZTtcclxuICAgIH1cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgbGFzdFNldHBvaW50OiBleHBvcnRzLmRyaXZlci5idFN0YXRlLmxhc3RNZWFzdXJlLlNldHBvaW50X1IsXHJcbiAgICAgICAgbGFzdE1lYXN1cmU6IGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUubGFzdE1lYXN1cmUuQWN0dWFsX1IsXHJcbiAgICAgICAgZGV2aWNlTmFtZTogZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5idERldmljZSA/IGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuYnREZXZpY2UubmFtZSA6ICcnLFxyXG4gICAgICAgIGRldmljZVNlcmlhbDogJycsXHJcbiAgICAgICAgZGV2aWNlSHdSZXY6IGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUubWV0ZXI/Lmh3X3JldixcclxuICAgICAgICBkZXZpY2VNb2RlOiBleHBvcnRzLmRyaXZlci5idFN0YXRlLm1ldGVyPy5tb2RlLFxyXG4gICAgICAgIHN0YXR1czogZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGF0ZSxcclxuICAgICAgICBiYXR0ZXJ5TGV2ZWw6IGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUubWV0ZXI/LmJhdHRlcnksXHJcbiAgICAgICAgZmlybXdhcmU6IGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUubWV0ZXI/LmZpcm13YXJlLFxyXG4gICAgICAgIHJlYWR5LFxyXG4gICAgICAgIGluaXRpYWxpemluZyxcclxuICAgICAgICBzdGF0czogZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGF0c1xyXG4gICAgfTtcclxufVxyXG5leHBvcnRzLkdldFN0YXRlID0gR2V0U3RhdGU7XHJcbi8qKlxyXG4gKiBQcm92aWRlZCBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIEJsYXpvclxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBKU09OIHN0YXRlIG9iamVjdFxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gR2V0U3RhdGVKU09OKCkge1xyXG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGF3YWl0IEdldFN0YXRlKCkpO1xyXG59XHJcbmV4cG9ydHMuR2V0U3RhdGVKU09OID0gR2V0U3RhdGVKU09OO1xyXG4vKipcclxuICogRXhlY3V0ZSBjb21tYW5kIHdpdGggc2V0cG9pbnRzLCBKU09OIHZlcnNpb25cclxuICogQHBhcmFtIHtzdHJpbmd9IGpzb25Db21tYW5kIHRoZSBjb21tYW5kIHRvIGV4ZWN1dGVcclxuICogQHJldHVybnMge3N0cmluZ30gSlNPTiBjb21tYW5kIG9iamVjdFxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gRXhlY3V0ZUpTT04oanNvbkNvbW1hbmQpIHtcclxuICAgIGNvbnN0IGNvbW1hbmQgPSBKU09OLnBhcnNlKGpzb25Db21tYW5kKTtcclxuICAgIC8vIGRlc2VyaWFsaXplZCBvYmplY3QgaGFzIGxvc3QgaXRzIG1ldGhvZHMsIGxldCdzIHJlY3JlYXRlIGEgY29tcGxldGUgb25lLlxyXG4gICAgY29uc3QgY29tbWFuZDIgPSBDb21tYW5kXzEuQ29tbWFuZC5DcmVhdGVGb3VyU1AoY29tbWFuZC50eXBlLCBjb21tYW5kLnNldHBvaW50LCBjb21tYW5kLnNldHBvaW50MiwgY29tbWFuZC5zZXRwb2ludDMsIGNvbW1hbmQuc2V0cG9pbnQ0KTtcclxuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhd2FpdCBFeGVjdXRlKGNvbW1hbmQyKSk7XHJcbn1cclxuZXhwb3J0cy5FeGVjdXRlSlNPTiA9IEV4ZWN1dGVKU09OO1xyXG5hc3luYyBmdW5jdGlvbiBTaW1wbGVFeGVjdXRlSlNPTihqc29uQ29tbWFuZCkge1xyXG4gICAgY29uc3QgY29tbWFuZCA9IEpTT04ucGFyc2UoanNvbkNvbW1hbmQpO1xyXG4gICAgLy8gZGVzZXJpYWxpemVkIG9iamVjdCBoYXMgbG9zdCBpdHMgbWV0aG9kcywgbGV0J3MgcmVjcmVhdGUgYSBjb21wbGV0ZSBvbmUuXHJcbiAgICBjb25zdCBjb21tYW5kMiA9IENvbW1hbmRfMS5Db21tYW5kLkNyZWF0ZUZvdXJTUChjb21tYW5kLnR5cGUsIGNvbW1hbmQuc2V0cG9pbnQsIGNvbW1hbmQuc2V0cG9pbnQyLCBjb21tYW5kLnNldHBvaW50MywgY29tbWFuZC5zZXRwb2ludDQpO1xyXG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGF3YWl0IFNpbXBsZUV4ZWN1dGUoY29tbWFuZDIpKTtcclxufVxyXG5leHBvcnRzLlNpbXBsZUV4ZWN1dGVKU09OID0gU2ltcGxlRXhlY3V0ZUpTT047XHJcbi8qKlxyXG4gKiBFeGVjdXRlIGEgY29tbWFuZCBhbmQgcmV0dXJucyB0aGUgbWVhc3VyZW1lbnQgb3Igc2V0cG9pbnQgd2l0aCBlcnJvciBmbGFnIGFuZCBtZXNzYWdlXHJcbiAqIEBwYXJhbSB7Q29tbWFuZH0gY29tbWFuZFxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gU2ltcGxlRXhlY3V0ZShjb21tYW5kKSB7XHJcbiAgICBjb25zdCBTSU1QTEVfRVhFQ1VURV9USU1FT1VUX1MgPSA1O1xyXG4gICAgY29uc3QgY3IgPSBuZXcgQ29tbWFuZFJlc3VsdF8xLkNvbW1hbmRSZXN1bHQoKTtcclxuICAgIGxvZ2xldmVsXzEuZGVmYXVsdC5pbmZvKCdTaW1wbGVFeGVjdXRlIGNhbGxlZC4uLicpO1xyXG4gICAgaWYgKGNvbW1hbmQgPT09IG51bGwpIHtcclxuICAgICAgICBjci5zdWNjZXNzID0gZmFsc2U7XHJcbiAgICAgICAgY3IubWVzc2FnZSA9ICdJbnZhbGlkIGNvbW1hbmQnO1xyXG4gICAgICAgIHJldHVybiBjcjtcclxuICAgIH1cclxuICAgIC8vIFJlY3JlYXRlIHRoZSBvYmplY3QgYXMgaXQgbWF5IGhhdmUgbG9zdCBtZXRob2RzIGR1ZSB0byBKU09OXHJcbiAgICBjb21tYW5kID0gQ29tbWFuZF8xLkNvbW1hbmQuQ3JlYXRlRm91clNQKGNvbW1hbmQudHlwZSwgY29tbWFuZC5zZXRwb2ludCwgY29tbWFuZC5zZXRwb2ludDIsIGNvbW1hbmQuc2V0cG9pbnQzLCBjb21tYW5kLnNldHBvaW50NCk7XHJcbiAgICBjb21tYW5kLnBlbmRpbmcgPSB0cnVlOyAvLyBJbiBjYXNlIGNhbGxlciBkb2VzIG5vdCBzZXQgcGVuZGluZyBmbGFnXHJcbiAgICAvLyBGYWlsIGltbWVkaWF0ZWx5IGlmIG5vdCBwYWlyZWQuXHJcbiAgICBpZiAoIWV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhcnRlZCkge1xyXG4gICAgICAgIGNyLnN1Y2Nlc3MgPSBmYWxzZTtcclxuICAgICAgICBjci5tZXNzYWdlID0gJ0RldmljZSBpcyBub3QgcGFpcmVkJztcclxuICAgICAgICBsb2dsZXZlbF8xLmRlZmF1bHQud2Fybihjci5tZXNzYWdlKTtcclxuICAgICAgICByZXR1cm4gY3I7XHJcbiAgICB9XHJcbiAgICAvLyBBbm90aGVyIGNvbW1hbmQgbWF5IGJlIHBlbmRpbmcuXHJcbiAgICBpZiAoZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5jb21tYW5kICE9IG51bGwgJiYgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5jb21tYW5kLnBlbmRpbmcpIHtcclxuICAgICAgICBjci5zdWNjZXNzID0gZmFsc2U7XHJcbiAgICAgICAgY3IubWVzc2FnZSA9ICdBbm90aGVyIGNvbW1hbmQgaXMgcGVuZGluZyc7XHJcbiAgICAgICAgbG9nbGV2ZWxfMS5kZWZhdWx0Lndhcm4oY3IubWVzc2FnZSk7XHJcbiAgICAgICAgcmV0dXJuIGNyO1xyXG4gICAgfVxyXG4gICAgLy8gV2FpdCBmb3IgY29tcGxldGlvbiBvZiB0aGUgY29tbWFuZCwgb3IgaGFsdCBvZiB0aGUgc3RhdGUgbWFjaGluZVxyXG4gICAgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5jb21tYW5kID0gY29tbWFuZDtcclxuICAgIGlmIChjb21tYW5kICE9IG51bGwpIHtcclxuICAgICAgICBhd2FpdCAoMCwgdXRpbHNfMS53YWl0Rm9yVGltZW91dCkoKCkgPT4gIWNvbW1hbmQucGVuZGluZyB8fCBleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXRlID09IGNvbnN0YW50c18xLlN0YXRlLlNUT1BQRUQsIFNJTVBMRV9FWEVDVVRFX1RJTUVPVVRfUyk7XHJcbiAgICB9XHJcbiAgICAvLyBDaGVjayBpZiBlcnJvciBvciB0aW1lb3V0c1xyXG4gICAgaWYgKGNvbW1hbmQuZXJyb3IgfHwgY29tbWFuZC5wZW5kaW5nKSB7XHJcbiAgICAgICAgY3Iuc3VjY2VzcyA9IGZhbHNlO1xyXG4gICAgICAgIGNyLm1lc3NhZ2UgPSAnRXJyb3Igd2hpbGUgZXhlY3V0aW5nIHRoZSBjb21tYW5kLic7XHJcbiAgICAgICAgbG9nbGV2ZWxfMS5kZWZhdWx0Lndhcm4oY3IubWVzc2FnZSk7XHJcbiAgICAgICAgLy8gUmVzZXQgdGhlIGFjdGl2ZSBjb21tYW5kXHJcbiAgICAgICAgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5jb21tYW5kID0gbnVsbDtcclxuICAgICAgICByZXR1cm4gY3I7XHJcbiAgICB9XHJcbiAgICAvLyBTdGF0ZSBpcyB1cGRhdGVkIGJ5IGV4ZWN1dGUgY29tbWFuZCwgc28gd2UgY2FuIHVzZSBidFN0YXRlIHJpZ2h0IGF3YXlcclxuICAgIGNyLnZhbHVlID0gZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5sYXN0TWVhc3VyZS5TZXRwb2ludF9SO1xyXG4gICAgY3IudW5pdCA9ICdPaG1zJztcclxuICAgIGNyLnNlY29uZGFyeV92YWx1ZSA9IGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUubGFzdE1lYXN1cmUuQWN0dWFsX1I7XHJcbiAgICBjci5zZWNvbmRhcnlfdW5pdCA9ICdPaG1zJztcclxuICAgIGNyLnN1Y2Nlc3MgPSB0cnVlO1xyXG4gICAgY3IubWVzc2FnZSA9ICdDb21tYW5kIGV4ZWN1dGVkIHN1Y2Nlc3NmdWxseSc7XHJcbiAgICByZXR1cm4gY3I7XHJcbn1cclxuZXhwb3J0cy5TaW1wbGVFeGVjdXRlID0gU2ltcGxlRXhlY3V0ZTtcclxuLyoqXHJcbiAqIEV4dGVybmFsIGludGVyZmFjZSB0byByZXF1aXJlIGEgY29tbWFuZCB0byBiZSBleGVjdXRlZC5cclxuICogVGhlIGJsdWV0b290aCBkZXZpY2UgcGFpcmluZyB3aW5kb3cgd2lsbCBvcGVuIGlmIGRldmljZSBpcyBub3QgY29ubmVjdGVkLlxyXG4gKiBUaGlzIG1heSBmYWlsIGlmIGNhbGxlZCBvdXRzaWRlIGEgdXNlciBnZXN0dXJlLlxyXG4gKiBAcGFyYW0ge0NvbW1hbmR9IGNvbW1hbmRcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIEV4ZWN1dGUoY29tbWFuZCkge1xyXG4gICAgbG9nbGV2ZWxfMS5kZWZhdWx0LmluZm8oJ0V4ZWN1dGUgY2FsbGVkLi4uJyk7XHJcbiAgICBpZiAoY29tbWFuZCA9PSBudWxsKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICBjb21tYW5kID0gQ29tbWFuZF8xLkNvbW1hbmQuQ3JlYXRlRm91clNQKGNvbW1hbmQudHlwZSwgY29tbWFuZC5zZXRwb2ludCwgY29tbWFuZC5zZXRwb2ludDIsIGNvbW1hbmQuc2V0cG9pbnQzLCBjb21tYW5kLnNldHBvaW50NCk7XHJcbiAgICBjb21tYW5kLnBlbmRpbmcgPSB0cnVlO1xyXG4gICAgbGV0IGNwdCA9IDA7XHJcbiAgICB3aGlsZSAoZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5jb21tYW5kICE9IG51bGwgJiYgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5jb21tYW5kLnBlbmRpbmcgJiYgY3B0IDwgMzAwKSB7XHJcbiAgICAgICAgbG9nbGV2ZWxfMS5kZWZhdWx0LmRlYnVnKCdXYWl0aW5nIGZvciBjdXJyZW50IGNvbW1hbmQgdG8gY29tcGxldGUuLi4nKTtcclxuICAgICAgICBhd2FpdCAoMCwgdXRpbHNfMS5zbGVlcCkoMTAwKTtcclxuICAgICAgICBjcHQrKztcclxuICAgIH1cclxuICAgIGxvZ2xldmVsXzEuZGVmYXVsdC5pbmZvKCdTZXR0aW5nIG5ldyBjb21tYW5kIDonICsgY29tbWFuZCk7XHJcbiAgICBleHBvcnRzLmRyaXZlci5idFN0YXRlLmNvbW1hbmQgPSBjb21tYW5kO1xyXG4gICAgLy8gU3RhcnQgdGhlIHJlZ3VsYXIgc3RhdGUgbWFjaGluZVxyXG4gICAgaWYgKCFleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXJ0ZWQpIHtcclxuICAgICAgICBleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuTk9UX0NPTk5FQ1RFRDtcclxuICAgICAgICBhd2FpdCBleHBvcnRzLmRyaXZlci5zdGF0ZU1hY2hpbmUoKTtcclxuICAgIH1cclxuICAgIC8vIFdhaXQgZm9yIGNvbXBsZXRpb24gb2YgdGhlIGNvbW1hbmQsIG9yIGhhbHQgb2YgdGhlIHN0YXRlIG1hY2hpbmVcclxuICAgIGlmIChjb21tYW5kICE9IG51bGwpIHtcclxuICAgICAgICBhd2FpdCAoMCwgdXRpbHNfMS53YWl0Rm9yKSgoKSA9PiAhY29tbWFuZC5wZW5kaW5nIHx8IGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhdGUgPT0gY29uc3RhbnRzXzEuU3RhdGUuU1RPUFBFRCk7XHJcbiAgICB9XHJcbiAgICAvLyBSZXR1cm4gdGhlIGNvbW1hbmQgb2JqZWN0IHJlc3VsdFxyXG4gICAgcmV0dXJuIGNvbW1hbmQ7XHJcbn1cclxuZXhwb3J0cy5FeGVjdXRlID0gRXhlY3V0ZTtcclxuLyoqXHJcbiAqIE1VU1QgQkUgQ0FMTEVEIEZST00gQSBVU0VSIEdFU1RVUkUgRVZFTlQgSEFORExFUlxyXG4gICogQHJldHVybnMge2Jvb2xlYW59IHRydWUgaWYgbWV0ZXIgaXMgcmVhZHkgdG8gZXhlY3V0ZSBjb21tYW5kXHJcbiAqICovXHJcbmFzeW5jIGZ1bmN0aW9uIFBhaXIoZm9yY2VTZWxlY3Rpb24gPSBmYWxzZSkge1xyXG4gICAgbG9nbGV2ZWxfMS5kZWZhdWx0LmluZm8oJ1BhaXIoJyArIGZvcmNlU2VsZWN0aW9uICsgJykgY2FsbGVkLi4uJyk7XHJcbiAgICBleHBvcnRzLmRyaXZlci5idFN0YXRlLm9wdGlvbnMuZm9yY2VEZXZpY2VTZWxlY3Rpb24gPSBmb3JjZVNlbGVjdGlvbjtcclxuICAgIGlmICghZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGFydGVkKSB7XHJcbiAgICAgICAgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLk5PVF9DT05ORUNURUQ7XHJcbiAgICAgICAgYXdhaXQgZXhwb3J0cy5kcml2ZXIuc3RhdGVNYWNoaW5lKCk7IC8vIFN0YXJ0IGl0XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXRlID09IGNvbnN0YW50c18xLlN0YXRlLkVSUk9SKSB7XHJcbiAgICAgICAgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLk5PVF9DT05ORUNURUQ7IC8vIFRyeSB0byByZXN0YXJ0XHJcbiAgICB9XHJcbiAgICBhd2FpdCAoMCwgdXRpbHNfMS53YWl0Rm9yKSgoKSA9PiBleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXRlID09IGNvbnN0YW50c18xLlN0YXRlLklETEUgfHwgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGF0ZSA9PSBjb25zdGFudHNfMS5TdGF0ZS5TVE9QUEVEKTtcclxuICAgIGxvZ2xldmVsXzEuZGVmYXVsdC5pbmZvKCdQYWlyaW5nIGNvbXBsZXRlZCwgc3RhdGUgOicsIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhdGUpO1xyXG4gICAgcmV0dXJuIChleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXRlICE9IGNvbnN0YW50c18xLlN0YXRlLlNUT1BQRUQpO1xyXG59XHJcbmV4cG9ydHMuUGFpciA9IFBhaXI7XHJcbi8qKlxyXG4gKiBTdG9wcyB0aGUgc3RhdGUgbWFjaGluZSBhbmQgZGlzY29ubmVjdHMgYmx1ZXRvb3RoLlxyXG4gKiAqL1xyXG5hc3luYyBmdW5jdGlvbiBTdG9wKCkge1xyXG4gICAgbG9nbGV2ZWxfMS5kZWZhdWx0LmluZm8oJ1N0b3AgcmVxdWVzdCByZWNlaXZlZCcpO1xyXG4gICAgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdG9wUmVxdWVzdCA9IHRydWU7XHJcbiAgICBhd2FpdCAoMCwgdXRpbHNfMS5zbGVlcCkoMTAwKTtcclxuICAgIHdoaWxlIChleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXJ0ZWQgfHwgKGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhdGUgIT0gY29uc3RhbnRzXzEuU3RhdGUuU1RPUFBFRCAmJiBleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXRlICE9IGNvbnN0YW50c18xLlN0YXRlLk5PVF9DT05ORUNURUQpKSB7XHJcbiAgICAgICAgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdG9wUmVxdWVzdCA9IHRydWU7XHJcbiAgICAgICAgYXdhaXQgKDAsIHV0aWxzXzEuc2xlZXApKDEwMCk7XHJcbiAgICB9XHJcbiAgICBleHBvcnRzLmRyaXZlci5idFN0YXRlLmNvbW1hbmQgPSBudWxsO1xyXG4gICAgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdG9wUmVxdWVzdCA9IGZhbHNlO1xyXG4gICAgbG9nbGV2ZWxfMS5kZWZhdWx0Lndhcm4oJ1N0b3BwZWQgb24gcmVxdWVzdC4nKTtcclxuICAgIHJldHVybiB0cnVlO1xyXG59XHJcbmV4cG9ydHMuU3RvcCA9IFN0b3A7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1ldGVyUHVibGljQVBJLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuYnVmMmhleCA9IGV4cG9ydHMuUGFyc2UgPSBleHBvcnRzLndhaXRGb3JUaW1lb3V0ID0gZXhwb3J0cy53YWl0Rm9yID0gZXhwb3J0cy5zbGVlcCA9IHZvaWQgMDtcclxuY29uc3Qgc2xlZXAgPSBhc3luYyAobXMpID0+IGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCBtcykpO1xyXG5leHBvcnRzLnNsZWVwID0gc2xlZXA7XHJcbmNvbnN0IHdhaXRGb3IgPSBhc3luYyBmdW5jdGlvbiB3YWl0Rm9yKGYpIHtcclxuICAgIHdoaWxlICghZigpKVxyXG4gICAgICAgIGF3YWl0ICgwLCBleHBvcnRzLnNsZWVwKSgxMDAgKyBNYXRoLnJhbmRvbSgpICogMjUpO1xyXG4gICAgcmV0dXJuIGYoKTtcclxufTtcclxuZXhwb3J0cy53YWl0Rm9yID0gd2FpdEZvcjtcclxuY29uc3Qgd2FpdEZvclRpbWVvdXQgPSBhc3luYyBmdW5jdGlvbiB3YWl0Rm9yKGYsIHRpbWVvdXRTZWMpIHtcclxuICAgIGxldCB0b3RhbFRpbWVNcyA9IDA7XHJcbiAgICB3aGlsZSAoIWYoKSAmJiB0b3RhbFRpbWVNcyA8IHRpbWVvdXRTZWMgKiAxMDAwKSB7XHJcbiAgICAgICAgY29uc3QgZGVsYXlNcyA9IDEwMCArIE1hdGgucmFuZG9tKCkgKiAyNTtcclxuICAgICAgICB0b3RhbFRpbWVNcyArPSBkZWxheU1zO1xyXG4gICAgICAgIGF3YWl0ICgwLCBleHBvcnRzLnNsZWVwKShkZWxheU1zKTtcclxuICAgIH1cclxuICAgIHJldHVybiBmKCk7XHJcbn07XHJcbmV4cG9ydHMud2FpdEZvclRpbWVvdXQgPSB3YWl0Rm9yVGltZW91dDtcclxuLyoqXHJcbiAqIEhlbHBlciBmdW5jdGlvbiB0byBjb252ZXJ0IGEgdmFsdWUgaW50byBhbiBlbnVtIHZhbHVlXHJcblxyXG4gKi9cclxuZnVuY3Rpb24gUGFyc2UoZW51bXR5cGUsIGVudW12YWx1ZSkge1xyXG4gICAgZm9yIChjb25zdCBlbnVtTmFtZSBpbiBlbnVtdHlwZSkge1xyXG4gICAgICAgIGlmIChlbnVtdHlwZVtlbnVtTmFtZV0gPT0gZW51bXZhbHVlKSB7XHJcbiAgICAgICAgICAgIC8qIGpzaGludCAtVzA2MSAqL1xyXG4gICAgICAgICAgICByZXR1cm4gZXZhbChlbnVtdHlwZSArICcuJyArIGVudW1OYW1lKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbDtcclxufVxyXG5leHBvcnRzLlBhcnNlID0gUGFyc2U7XHJcbi8qKlxyXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gZHVtcCBhcnJheWJ1ZmZlciBhcyBoZXggc3RyaW5nXHJcbiAqL1xyXG5mdW5jdGlvbiBidWYyaGV4KGJ1ZmZlcikge1xyXG4gICAgcmV0dXJuIFsuLi5uZXcgVWludDhBcnJheShidWZmZXIpXVxyXG4gICAgICAgIC5tYXAoeCA9PiB4LnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpKVxyXG4gICAgICAgIC5qb2luKCcgJyk7XHJcbn1cclxuZXhwb3J0cy5idWYyaGV4ID0gYnVmMmhleDtcclxuZnVuY3Rpb24gaGV4MmJ1ZihpbnB1dCkge1xyXG4gICAgaWYgKHR5cGVvZiBpbnB1dCAhPT0gJ3N0cmluZycpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFeHBlY3RlZCBpbnB1dCB0byBiZSBhIHN0cmluZycpO1xyXG4gICAgfVxyXG4gICAgY29uc3QgaGV4c3RyID0gaW5wdXQucmVwbGFjZSgvXFxzKy9nLCAnJyk7XHJcbiAgICBpZiAoKGhleHN0ci5sZW5ndGggJSAyKSAhPT0gMCkge1xyXG4gICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdFeHBlY3RlZCBzdHJpbmcgdG8gYmUgYW4gZXZlbiBudW1iZXIgb2YgY2hhcmFjdGVycycpO1xyXG4gICAgfVxyXG4gICAgY29uc3QgdmlldyA9IG5ldyBVaW50OEFycmF5KGhleHN0ci5sZW5ndGggLyAyKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaGV4c3RyLmxlbmd0aDsgaSArPSAyKSB7XHJcbiAgICAgICAgdmlld1tpIC8gMl0gPSBwYXJzZUludChoZXhzdHIuc3Vic3RyaW5nKGksIGkgKyAyKSwgMTYpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHZpZXcuYnVmZmVyO1xyXG59XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXV0aWxzLmpzLm1hcCIsIi8qXG4qIGxvZ2xldmVsIC0gaHR0cHM6Ly9naXRodWIuY29tL3BpbXRlcnJ5L2xvZ2xldmVsXG4qXG4qIENvcHlyaWdodCAoYykgMjAxMyBUaW0gUGVycnlcbiogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuKi9cbihmdW5jdGlvbiAocm9vdCwgZGVmaW5pdGlvbikge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKGRlZmluaXRpb24pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBkZWZpbml0aW9uKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcm9vdC5sb2cgPSBkZWZpbml0aW9uKCk7XG4gICAgfVxufSh0aGlzLCBmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICAvLyBTbGlnaHRseSBkdWJpb3VzIHRyaWNrcyB0byBjdXQgZG93biBtaW5pbWl6ZWQgZmlsZSBzaXplXG4gICAgdmFyIG5vb3AgPSBmdW5jdGlvbigpIHt9O1xuICAgIHZhciB1bmRlZmluZWRUeXBlID0gXCJ1bmRlZmluZWRcIjtcbiAgICB2YXIgaXNJRSA9ICh0eXBlb2Ygd2luZG93ICE9PSB1bmRlZmluZWRUeXBlKSAmJiAodHlwZW9mIHdpbmRvdy5uYXZpZ2F0b3IgIT09IHVuZGVmaW5lZFR5cGUpICYmIChcbiAgICAgICAgL1RyaWRlbnRcXC98TVNJRSAvLnRlc3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpXG4gICAgKTtcblxuICAgIHZhciBsb2dNZXRob2RzID0gW1xuICAgICAgICBcInRyYWNlXCIsXG4gICAgICAgIFwiZGVidWdcIixcbiAgICAgICAgXCJpbmZvXCIsXG4gICAgICAgIFwid2FyblwiLFxuICAgICAgICBcImVycm9yXCJcbiAgICBdO1xuXG4gICAgLy8gQ3Jvc3MtYnJvd3NlciBiaW5kIGVxdWl2YWxlbnQgdGhhdCB3b3JrcyBhdCBsZWFzdCBiYWNrIHRvIElFNlxuICAgIGZ1bmN0aW9uIGJpbmRNZXRob2Qob2JqLCBtZXRob2ROYW1lKSB7XG4gICAgICAgIHZhciBtZXRob2QgPSBvYmpbbWV0aG9kTmFtZV07XG4gICAgICAgIGlmICh0eXBlb2YgbWV0aG9kLmJpbmQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJldHVybiBtZXRob2QuYmluZChvYmopO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQuY2FsbChtZXRob2QsIG9iaik7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgLy8gTWlzc2luZyBiaW5kIHNoaW0gb3IgSUU4ICsgTW9kZXJuaXpyLCBmYWxsYmFjayB0byB3cmFwcGluZ1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseS5hcHBseShtZXRob2QsIFtvYmosIGFyZ3VtZW50c10pO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUcmFjZSgpIGRvZXNuJ3QgcHJpbnQgdGhlIG1lc3NhZ2UgaW4gSUUsIHNvIGZvciB0aGF0IGNhc2Ugd2UgbmVlZCB0byB3cmFwIGl0XG4gICAgZnVuY3Rpb24gdHJhY2VGb3JJRSgpIHtcbiAgICAgICAgaWYgKGNvbnNvbGUubG9nKSB7XG4gICAgICAgICAgICBpZiAoY29uc29sZS5sb2cuYXBwbHkpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBJbiBvbGQgSUUsIG5hdGl2ZSBjb25zb2xlIG1ldGhvZHMgdGhlbXNlbHZlcyBkb24ndCBoYXZlIGFwcGx5KCkuXG4gICAgICAgICAgICAgICAgRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5LmFwcGx5KGNvbnNvbGUubG9nLCBbY29uc29sZSwgYXJndW1lbnRzXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbnNvbGUudHJhY2UpIGNvbnNvbGUudHJhY2UoKTtcbiAgICB9XG5cbiAgICAvLyBCdWlsZCB0aGUgYmVzdCBsb2dnaW5nIG1ldGhvZCBwb3NzaWJsZSBmb3IgdGhpcyBlbnZcbiAgICAvLyBXaGVyZXZlciBwb3NzaWJsZSB3ZSB3YW50IHRvIGJpbmQsIG5vdCB3cmFwLCB0byBwcmVzZXJ2ZSBzdGFjayB0cmFjZXNcbiAgICBmdW5jdGlvbiByZWFsTWV0aG9kKG1ldGhvZE5hbWUpIHtcbiAgICAgICAgaWYgKG1ldGhvZE5hbWUgPT09ICdkZWJ1ZycpIHtcbiAgICAgICAgICAgIG1ldGhvZE5hbWUgPSAnbG9nJztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY29uc29sZSA9PT0gdW5kZWZpbmVkVHlwZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBObyBtZXRob2QgcG9zc2libGUsIGZvciBub3cgLSBmaXhlZCBsYXRlciBieSBlbmFibGVMb2dnaW5nV2hlbkNvbnNvbGVBcnJpdmVzXG4gICAgICAgIH0gZWxzZSBpZiAobWV0aG9kTmFtZSA9PT0gJ3RyYWNlJyAmJiBpc0lFKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJhY2VGb3JJRTtcbiAgICAgICAgfSBlbHNlIGlmIChjb25zb2xlW21ldGhvZE5hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBiaW5kTWV0aG9kKGNvbnNvbGUsIG1ldGhvZE5hbWUpO1xuICAgICAgICB9IGVsc2UgaWYgKGNvbnNvbGUubG9nICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBiaW5kTWV0aG9kKGNvbnNvbGUsICdsb2cnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBub29wO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gVGhlc2UgcHJpdmF0ZSBmdW5jdGlvbnMgYWx3YXlzIG5lZWQgYHRoaXNgIHRvIGJlIHNldCBwcm9wZXJseVxuXG4gICAgZnVuY3Rpb24gcmVwbGFjZUxvZ2dpbmdNZXRob2RzKGxldmVsLCBsb2dnZXJOYW1lKSB7XG4gICAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbG9nTWV0aG9kcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG1ldGhvZE5hbWUgPSBsb2dNZXRob2RzW2ldO1xuICAgICAgICAgICAgdGhpc1ttZXRob2ROYW1lXSA9IChpIDwgbGV2ZWwpID9cbiAgICAgICAgICAgICAgICBub29wIDpcbiAgICAgICAgICAgICAgICB0aGlzLm1ldGhvZEZhY3RvcnkobWV0aG9kTmFtZSwgbGV2ZWwsIGxvZ2dlck5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGVmaW5lIGxvZy5sb2cgYXMgYW4gYWxpYXMgZm9yIGxvZy5kZWJ1Z1xuICAgICAgICB0aGlzLmxvZyA9IHRoaXMuZGVidWc7XG4gICAgfVxuXG4gICAgLy8gSW4gb2xkIElFIHZlcnNpb25zLCB0aGUgY29uc29sZSBpc24ndCBwcmVzZW50IHVudGlsIHlvdSBmaXJzdCBvcGVuIGl0LlxuICAgIC8vIFdlIGJ1aWxkIHJlYWxNZXRob2QoKSByZXBsYWNlbWVudHMgaGVyZSB0aGF0IHJlZ2VuZXJhdGUgbG9nZ2luZyBtZXRob2RzXG4gICAgZnVuY3Rpb24gZW5hYmxlTG9nZ2luZ1doZW5Db25zb2xlQXJyaXZlcyhtZXRob2ROYW1lLCBsZXZlbCwgbG9nZ2VyTmFtZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSB1bmRlZmluZWRUeXBlKSB7XG4gICAgICAgICAgICAgICAgcmVwbGFjZUxvZ2dpbmdNZXRob2RzLmNhbGwodGhpcywgbGV2ZWwsIGxvZ2dlck5hbWUpO1xuICAgICAgICAgICAgICAgIHRoaXNbbWV0aG9kTmFtZV0uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBCeSBkZWZhdWx0LCB3ZSB1c2UgY2xvc2VseSBib3VuZCByZWFsIG1ldGhvZHMgd2hlcmV2ZXIgcG9zc2libGUsIGFuZFxuICAgIC8vIG90aGVyd2lzZSB3ZSB3YWl0IGZvciBhIGNvbnNvbGUgdG8gYXBwZWFyLCBhbmQgdGhlbiB0cnkgYWdhaW4uXG4gICAgZnVuY3Rpb24gZGVmYXVsdE1ldGhvZEZhY3RvcnkobWV0aG9kTmFtZSwgbGV2ZWwsIGxvZ2dlck5hbWUpIHtcbiAgICAgICAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgICAgICAgcmV0dXJuIHJlYWxNZXRob2QobWV0aG9kTmFtZSkgfHxcbiAgICAgICAgICAgICAgIGVuYWJsZUxvZ2dpbmdXaGVuQ29uc29sZUFycml2ZXMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBMb2dnZXIobmFtZSwgZGVmYXVsdExldmVsLCBmYWN0b3J5KSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgY3VycmVudExldmVsO1xuICAgICAgZGVmYXVsdExldmVsID0gZGVmYXVsdExldmVsID09IG51bGwgPyBcIldBUk5cIiA6IGRlZmF1bHRMZXZlbDtcblxuICAgICAgdmFyIHN0b3JhZ2VLZXkgPSBcImxvZ2xldmVsXCI7XG4gICAgICBpZiAodHlwZW9mIG5hbWUgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgc3RvcmFnZUtleSArPSBcIjpcIiArIG5hbWU7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBuYW1lID09PSBcInN5bWJvbFwiKSB7XG4gICAgICAgIHN0b3JhZ2VLZXkgPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHBlcnNpc3RMZXZlbElmUG9zc2libGUobGV2ZWxOdW0pIHtcbiAgICAgICAgICB2YXIgbGV2ZWxOYW1lID0gKGxvZ01ldGhvZHNbbGV2ZWxOdW1dIHx8ICdzaWxlbnQnKS50b1VwcGVyQ2FzZSgpO1xuXG4gICAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09IHVuZGVmaW5lZFR5cGUgfHwgIXN0b3JhZ2VLZXkpIHJldHVybjtcblxuICAgICAgICAgIC8vIFVzZSBsb2NhbFN0b3JhZ2UgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZVtzdG9yYWdlS2V5XSA9IGxldmVsTmFtZTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cblxuICAgICAgICAgIC8vIFVzZSBzZXNzaW9uIGNvb2tpZSBhcyBmYWxsYmFja1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHdpbmRvdy5kb2N1bWVudC5jb29raWUgPVxuICAgICAgICAgICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChzdG9yYWdlS2V5KSArIFwiPVwiICsgbGV2ZWxOYW1lICsgXCI7XCI7XG4gICAgICAgICAgfSBjYXRjaCAoaWdub3JlKSB7fVxuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBnZXRQZXJzaXN0ZWRMZXZlbCgpIHtcbiAgICAgICAgICB2YXIgc3RvcmVkTGV2ZWw7XG5cbiAgICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gdW5kZWZpbmVkVHlwZSB8fCAhc3RvcmFnZUtleSkgcmV0dXJuO1xuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgc3RvcmVkTGV2ZWwgPSB3aW5kb3cubG9jYWxTdG9yYWdlW3N0b3JhZ2VLZXldO1xuICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cblxuICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIGNvb2tpZXMgaWYgbG9jYWwgc3RvcmFnZSBnaXZlcyB1cyBub3RoaW5nXG4gICAgICAgICAgaWYgKHR5cGVvZiBzdG9yZWRMZXZlbCA9PT0gdW5kZWZpbmVkVHlwZSkge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgdmFyIGNvb2tpZSA9IHdpbmRvdy5kb2N1bWVudC5jb29raWU7XG4gICAgICAgICAgICAgICAgICB2YXIgbG9jYXRpb24gPSBjb29raWUuaW5kZXhPZihcbiAgICAgICAgICAgICAgICAgICAgICBlbmNvZGVVUklDb21wb25lbnQoc3RvcmFnZUtleSkgKyBcIj1cIik7XG4gICAgICAgICAgICAgICAgICBpZiAobG9jYXRpb24gIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgc3RvcmVkTGV2ZWwgPSAvXihbXjtdKykvLmV4ZWMoY29va2llLnNsaWNlKGxvY2F0aW9uKSlbMV07XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBJZiB0aGUgc3RvcmVkIGxldmVsIGlzIG5vdCB2YWxpZCwgdHJlYXQgaXQgYXMgaWYgbm90aGluZyB3YXMgc3RvcmVkLlxuICAgICAgICAgIGlmIChzZWxmLmxldmVsc1tzdG9yZWRMZXZlbF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBzdG9yZWRMZXZlbCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gc3RvcmVkTGV2ZWw7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNsZWFyUGVyc2lzdGVkTGV2ZWwoKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09IHVuZGVmaW5lZFR5cGUgfHwgIXN0b3JhZ2VLZXkpIHJldHVybjtcblxuICAgICAgICAgIC8vIFVzZSBsb2NhbFN0b3JhZ2UgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHN0b3JhZ2VLZXkpO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfSBjYXRjaCAoaWdub3JlKSB7fVxuXG4gICAgICAgICAgLy8gVXNlIHNlc3Npb24gY29va2llIGFzIGZhbGxiYWNrXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgd2luZG93LmRvY3VtZW50LmNvb2tpZSA9XG4gICAgICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHN0b3JhZ2VLZXkpICsgXCI9OyBleHBpcmVzPVRodSwgMDEgSmFuIDE5NzAgMDA6MDA6MDAgVVRDXCI7XG4gICAgICAgICAgfSBjYXRjaCAoaWdub3JlKSB7fVxuICAgICAgfVxuXG4gICAgICAvKlxuICAgICAgICpcbiAgICAgICAqIFB1YmxpYyBsb2dnZXIgQVBJIC0gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9waW10ZXJyeS9sb2dsZXZlbCBmb3IgZGV0YWlsc1xuICAgICAgICpcbiAgICAgICAqL1xuXG4gICAgICBzZWxmLm5hbWUgPSBuYW1lO1xuXG4gICAgICBzZWxmLmxldmVscyA9IHsgXCJUUkFDRVwiOiAwLCBcIkRFQlVHXCI6IDEsIFwiSU5GT1wiOiAyLCBcIldBUk5cIjogMyxcbiAgICAgICAgICBcIkVSUk9SXCI6IDQsIFwiU0lMRU5UXCI6IDV9O1xuXG4gICAgICBzZWxmLm1ldGhvZEZhY3RvcnkgPSBmYWN0b3J5IHx8IGRlZmF1bHRNZXRob2RGYWN0b3J5O1xuXG4gICAgICBzZWxmLmdldExldmVsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiBjdXJyZW50TGV2ZWw7XG4gICAgICB9O1xuXG4gICAgICBzZWxmLnNldExldmVsID0gZnVuY3Rpb24gKGxldmVsLCBwZXJzaXN0KSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBsZXZlbCA9PT0gXCJzdHJpbmdcIiAmJiBzZWxmLmxldmVsc1tsZXZlbC50b1VwcGVyQ2FzZSgpXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIGxldmVsID0gc2VsZi5sZXZlbHNbbGV2ZWwudG9VcHBlckNhc2UoKV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgbGV2ZWwgPT09IFwibnVtYmVyXCIgJiYgbGV2ZWwgPj0gMCAmJiBsZXZlbCA8PSBzZWxmLmxldmVscy5TSUxFTlQpIHtcbiAgICAgICAgICAgICAgY3VycmVudExldmVsID0gbGV2ZWw7XG4gICAgICAgICAgICAgIGlmIChwZXJzaXN0ICE9PSBmYWxzZSkgeyAgLy8gZGVmYXVsdHMgdG8gdHJ1ZVxuICAgICAgICAgICAgICAgICAgcGVyc2lzdExldmVsSWZQb3NzaWJsZShsZXZlbCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVwbGFjZUxvZ2dpbmdNZXRob2RzLmNhbGwoc2VsZiwgbGV2ZWwsIG5hbWUpO1xuICAgICAgICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgPT09IHVuZGVmaW5lZFR5cGUgJiYgbGV2ZWwgPCBzZWxmLmxldmVscy5TSUxFTlQpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBcIk5vIGNvbnNvbGUgYXZhaWxhYmxlIGZvciBsb2dnaW5nXCI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBcImxvZy5zZXRMZXZlbCgpIGNhbGxlZCB3aXRoIGludmFsaWQgbGV2ZWw6IFwiICsgbGV2ZWw7XG4gICAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgc2VsZi5zZXREZWZhdWx0TGV2ZWwgPSBmdW5jdGlvbiAobGV2ZWwpIHtcbiAgICAgICAgICBkZWZhdWx0TGV2ZWwgPSBsZXZlbDtcbiAgICAgICAgICBpZiAoIWdldFBlcnNpc3RlZExldmVsKCkpIHtcbiAgICAgICAgICAgICAgc2VsZi5zZXRMZXZlbChsZXZlbCwgZmFsc2UpO1xuICAgICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHNlbGYucmVzZXRMZXZlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBzZWxmLnNldExldmVsKGRlZmF1bHRMZXZlbCwgZmFsc2UpO1xuICAgICAgICAgIGNsZWFyUGVyc2lzdGVkTGV2ZWwoKTtcbiAgICAgIH07XG5cbiAgICAgIHNlbGYuZW5hYmxlQWxsID0gZnVuY3Rpb24ocGVyc2lzdCkge1xuICAgICAgICAgIHNlbGYuc2V0TGV2ZWwoc2VsZi5sZXZlbHMuVFJBQ0UsIHBlcnNpc3QpO1xuICAgICAgfTtcblxuICAgICAgc2VsZi5kaXNhYmxlQWxsID0gZnVuY3Rpb24ocGVyc2lzdCkge1xuICAgICAgICAgIHNlbGYuc2V0TGV2ZWwoc2VsZi5sZXZlbHMuU0lMRU5ULCBwZXJzaXN0KTtcbiAgICAgIH07XG5cbiAgICAgIC8vIEluaXRpYWxpemUgd2l0aCB0aGUgcmlnaHQgbGV2ZWxcbiAgICAgIHZhciBpbml0aWFsTGV2ZWwgPSBnZXRQZXJzaXN0ZWRMZXZlbCgpO1xuICAgICAgaWYgKGluaXRpYWxMZXZlbCA9PSBudWxsKSB7XG4gICAgICAgICAgaW5pdGlhbExldmVsID0gZGVmYXVsdExldmVsO1xuICAgICAgfVxuICAgICAgc2VsZi5zZXRMZXZlbChpbml0aWFsTGV2ZWwsIGZhbHNlKTtcbiAgICB9XG5cbiAgICAvKlxuICAgICAqXG4gICAgICogVG9wLWxldmVsIEFQSVxuICAgICAqXG4gICAgICovXG5cbiAgICB2YXIgZGVmYXVsdExvZ2dlciA9IG5ldyBMb2dnZXIoKTtcblxuICAgIHZhciBfbG9nZ2Vyc0J5TmFtZSA9IHt9O1xuICAgIGRlZmF1bHRMb2dnZXIuZ2V0TG9nZ2VyID0gZnVuY3Rpb24gZ2V0TG9nZ2VyKG5hbWUpIHtcbiAgICAgICAgaWYgKCh0eXBlb2YgbmFtZSAhPT0gXCJzeW1ib2xcIiAmJiB0eXBlb2YgbmFtZSAhPT0gXCJzdHJpbmdcIikgfHwgbmFtZSA9PT0gXCJcIikge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJZb3UgbXVzdCBzdXBwbHkgYSBuYW1lIHdoZW4gY3JlYXRpbmcgYSBsb2dnZXIuXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGxvZ2dlciA9IF9sb2dnZXJzQnlOYW1lW25hbWVdO1xuICAgICAgICBpZiAoIWxvZ2dlcikge1xuICAgICAgICAgIGxvZ2dlciA9IF9sb2dnZXJzQnlOYW1lW25hbWVdID0gbmV3IExvZ2dlcihcbiAgICAgICAgICAgIG5hbWUsIGRlZmF1bHRMb2dnZXIuZ2V0TGV2ZWwoKSwgZGVmYXVsdExvZ2dlci5tZXRob2RGYWN0b3J5KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbG9nZ2VyO1xuICAgIH07XG5cbiAgICAvLyBHcmFiIHRoZSBjdXJyZW50IGdsb2JhbCBsb2cgdmFyaWFibGUgaW4gY2FzZSBvZiBvdmVyd3JpdGVcbiAgICB2YXIgX2xvZyA9ICh0eXBlb2Ygd2luZG93ICE9PSB1bmRlZmluZWRUeXBlKSA/IHdpbmRvdy5sb2cgOiB1bmRlZmluZWQ7XG4gICAgZGVmYXVsdExvZ2dlci5ub0NvbmZsaWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSB1bmRlZmluZWRUeXBlICYmXG4gICAgICAgICAgICAgICB3aW5kb3cubG9nID09PSBkZWZhdWx0TG9nZ2VyKSB7XG4gICAgICAgICAgICB3aW5kb3cubG9nID0gX2xvZztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBkZWZhdWx0TG9nZ2VyO1xuICAgIH07XG5cbiAgICBkZWZhdWx0TG9nZ2VyLmdldExvZ2dlcnMgPSBmdW5jdGlvbiBnZXRMb2dnZXJzKCkge1xuICAgICAgICByZXR1cm4gX2xvZ2dlcnNCeU5hbWU7XG4gICAgfTtcblxuICAgIC8vIEVTNiBkZWZhdWx0IGV4cG9ydCwgZm9yIGNvbXBhdGliaWxpdHlcbiAgICBkZWZhdWx0TG9nZ2VyWydkZWZhdWx0J10gPSBkZWZhdWx0TG9nZ2VyO1xuXG4gICAgcmV0dXJuIGRlZmF1bHRMb2dnZXI7XG59KSk7XG4iXX0=
