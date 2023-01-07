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
        this.btBatteryService = null;
        this.btDeviceInfoService = null;
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
            command.error = !this.btState.lastMeasure.LastResult;
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
        const status1 = dv.getUint8(0);
        const status2 = dv.getUint8(1);
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9BUElTdGF0ZS5qcyIsImpzL0NvbW1hbmQuanMiLCJqcy9Db21tYW5kUmVzdWx0LmpzIiwianMvRHJpdmVyLmpzIiwianMvSU9UZXN0aW5nQm9hcmQuanMiLCJqcy9NZXRlclN0YXRlLmpzIiwianMvTm90aWZpY2F0aW9uRGF0YS5qcyIsImpzL2NvbnN0YW50cy5qcyIsImpzL21ldGVyQXBpLmpzIiwianMvbWV0ZXJQdWJsaWNBUEkuanMiLCJqcy91dGlscy5qcyIsIm5vZGVfbW9kdWxlcy9sb2dsZXZlbC9saWIvbG9nbGV2ZWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuQlRBcGlTdGF0ZSA9IHZvaWQgMDtcclxuY29uc3QgTWV0ZXJTdGF0ZV8xID0gcmVxdWlyZShcIi4vTWV0ZXJTdGF0ZVwiKTtcclxuY29uc3QgY29uc3RhbnRzXzEgPSByZXF1aXJlKFwiLi9jb25zdGFudHNcIik7XHJcbmNvbnN0IE5vdGlmaWNhdGlvbkRhdGFfMSA9IHJlcXVpcmUoXCIuL05vdGlmaWNhdGlvbkRhdGFcIik7XHJcbmNvbnN0IGxvZyA9IHJlcXVpcmUoXCJsb2dsZXZlbFwiKTtcclxuLy8gQ3VycmVudCBzdGF0ZSBvZiB0aGUgYmx1ZXRvb3RoXHJcbmNsYXNzIEJUQXBpU3RhdGUge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLk5PVF9DT05ORUNURUQ7XHJcbiAgICAgICAgdGhpcy5wcmV2X3N0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuTk9UX0NPTk5FQ1RFRDtcclxuICAgICAgICB0aGlzLnN0YXRlX2NwdCA9IDA7XHJcbiAgICAgICAgdGhpcy5zdGFydGVkID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5zdG9wUmVxdWVzdCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMubGFzdE1lYXN1cmUgPSBuZXcgTm90aWZpY2F0aW9uRGF0YV8xLk5vdGlmaWNhdGlvbkRhdGEoKTtcclxuICAgICAgICB0aGlzLm1ldGVyID0gbmV3IE1ldGVyU3RhdGVfMS5NZXRlclN0YXRlKCk7XHJcbiAgICAgICAgdGhpcy5jb21tYW5kID0gbnVsbDtcclxuICAgICAgICB0aGlzLnJlc3BvbnNlID0gbnVsbDtcclxuICAgICAgICB0aGlzLmJ0RGV2aWNlID0gbnVsbDtcclxuICAgICAgICB0aGlzLmJ0R0FUVFNlcnZlciA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5idElPVFNlcnZpY2UgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuY2hhclJlYWQgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuY2hhcldyaXRlID0gbnVsbDtcclxuICAgICAgICB0aGlzLmJ0RGV2aWNlSW5mb1NlcnZpY2UgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuY2hhckhXUmV2ID0gbnVsbDtcclxuICAgICAgICB0aGlzLmNoYXJGaXJtd2FyZSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5idEJhdHRlcnlTZXJ2aWNlID0gbnVsbDtcclxuICAgICAgICB0aGlzLmNoYXJCYXR0ZXJ5ID0gbnVsbDtcclxuICAgICAgICAvLyBnZW5lcmFsIHN0YXRpc3RpY3MgZm9yIGRlYnVnZ2luZ1xyXG4gICAgICAgIHRoaXMuc3RhdHMgPSB7XHJcbiAgICAgICAgICAgIHJlcXVlc3RzOiAwLFxyXG4gICAgICAgICAgICByZXNwb25zZXM6IDAsXHJcbiAgICAgICAgICAgIG1vZGJ1c19lcnJvcnM6IDAsXHJcbiAgICAgICAgICAgICdHQVRUIGRpc2Nvbm5lY3RzJzogMCxcclxuICAgICAgICAgICAgZXhjZXB0aW9uczogMCxcclxuICAgICAgICAgICAgc3ViY3JpYmVzOiAwLFxyXG4gICAgICAgICAgICBjb21tYW5kczogMCxcclxuICAgICAgICAgICAgcmVzcG9uc2VUaW1lOiAwLjAsXHJcbiAgICAgICAgICAgIGxhc3RSZXNwb25zZVRpbWU6ICc/IG1zJyxcclxuICAgICAgICAgICAgbGFzdF9jb25uZWN0OiBuZXcgRGF0ZSgyMDIwLCAxLCAxKS50b0lTT1N0cmluZygpXHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLm9wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgIGZvcmNlRGV2aWNlU2VsZWN0aW9uOiB0cnVlXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuICAgIGFzeW5jIHJlc2V0KG9uRGlzY29ubmVjdEV2ZW50ID0gbnVsbCkge1xyXG4gICAgICAgIGlmICh0aGlzLmNoYXJSZWFkICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmJ0RGV2aWNlPy5nYXR0Py5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmNoYXJSZWFkLnN0b3BOb3RpZmljYXRpb25zKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2F0Y2ggKGVycm9yKSB7IH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuYnREZXZpY2UgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYnREZXZpY2U/LmdhdHQ/LmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZy53YXJuKCcqIENhbGxpbmcgZGlzY29ubmVjdCBvbiBidGRldmljZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEF2b2lkIHRoZSBldmVudCBmaXJpbmcgd2hpY2ggbWF5IGxlYWQgdG8gYXV0by1yZWNvbm5lY3RcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ0RGV2aWNlLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2dhdHRzZXJ2ZXJkaXNjb25uZWN0ZWQnLCBvbkRpc2Nvbm5lY3RFdmVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idERldmljZS5nYXR0LmRpc2Nvbm5lY3QoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaCAoZXJyb3IpIHsgfVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmJ0QmF0dGVyeVNlcnZpY2UgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuYnREZXZpY2VJbmZvU2VydmljZSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5idEdBVFRTZXJ2ZXIgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuY2hhckJhdHRlcnkgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuY2hhckZpcm13YXJlID0gbnVsbDtcclxuICAgICAgICB0aGlzLmNoYXJSZWFkID0gbnVsbDtcclxuICAgICAgICB0aGlzLmNoYXJIV1JldiA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5jaGFyV3JpdGUgPSBudWxsO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuQlRBcGlTdGF0ZSA9IEJUQXBpU3RhdGU7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPUFQSVN0YXRlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuQ29tbWFuZCA9IHZvaWQgMDtcclxuY29uc3QgY29uc3RhbnRzXzEgPSByZXF1aXJlKFwiLi9jb25zdGFudHNcIik7XHJcbi8qKlxyXG4gKiBDb21tYW5kIHRvIHRoZSBtZXRlciwgbWF5IGluY2x1ZGUgc2V0cG9pbnRcclxuICogKi9cclxuY2xhc3MgQ29tbWFuZCB7XHJcbiAgICAvKipcclxuICAgICAgICogQ3JlYXRlcyBhIG5ldyBjb21tYW5kXHJcbiAgICAgICAqIEBwYXJhbSB7Q29tbWFuZFR5cGV9IGN0eXBlXHJcbiAgICAgICAqL1xyXG4gICAgY29uc3RydWN0b3IoY3R5cGUpIHtcclxuICAgICAgICB0aGlzLnR5cGUgPSBwYXJzZUludChjdHlwZSk7XHJcbiAgICAgICAgdGhpcy5zZXRwb2ludCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5zZXRwb2ludCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5zZXRwb2ludDMgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuc2V0cG9pbnQ0ID0gbnVsbDtcclxuICAgICAgICB0aGlzLmVycm9yID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5wZW5kaW5nID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLnJlcXVlc3QgPSBudWxsO1xyXG4gICAgICAgIHRoaXMucmVzcG9uc2UgPSBudWxsO1xyXG4gICAgfVxyXG4gICAgc3RhdGljIENyZWF0ZU5vU1AoY3R5cGUpIHtcclxuICAgICAgICBjb25zdCBjbWQgPSBuZXcgQ29tbWFuZChjdHlwZSk7XHJcbiAgICAgICAgcmV0dXJuIGNtZDtcclxuICAgIH1cclxuICAgIHN0YXRpYyBDcmVhdGVPbmVTUChjdHlwZSwgc2V0cG9pbnQpIHtcclxuICAgICAgICBjb25zdCBjbWQgPSBuZXcgQ29tbWFuZChjdHlwZSk7XHJcbiAgICAgICAgY21kLnNldHBvaW50ID0gc2V0cG9pbnQ7XHJcbiAgICAgICAgcmV0dXJuIGNtZDtcclxuICAgIH1cclxuICAgIHN0YXRpYyBDcmVhdGVGb3VyU1AoY3R5cGUsIHNldDEsIHNldDIsIHNldDMsIHNldDQpIHtcclxuICAgICAgICBjb25zdCBjbWQgPSBuZXcgQ29tbWFuZChjdHlwZSk7XHJcbiAgICAgICAgY21kLnNldHBvaW50ID0gc2V0MTtcclxuICAgICAgICBjbWQuc2V0cG9pbnQyID0gc2V0MjtcclxuICAgICAgICBjbWQuc2V0cG9pbnQzID0gc2V0MztcclxuICAgICAgICBjbWQuc2V0cG9pbnQ0ID0gc2V0NDtcclxuICAgICAgICByZXR1cm4gY21kO1xyXG4gICAgfVxyXG4gICAgdG9TdHJpbmcoKSB7XHJcbiAgICAgICAgcmV0dXJuICdUeXBlOiAnICsgdGhpcy50eXBlICsgJywgc2V0cG9pbnQ6JyArIHRoaXMuc2V0cG9pbnQgKyAnLCBzZXRwb2ludDI6ICcgKyB0aGlzLnNldHBvaW50MiArICcsIHBlbmRpbmc6JyArIHRoaXMucGVuZGluZyArICcsIGVycm9yOicgKyB0aGlzLmVycm9yO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgICAqIEdldHMgdGhlIGRlZmF1bHQgc2V0cG9pbnQgZm9yIHRoaXMgY29tbWFuZCB0eXBlXHJcbiAgICAgICAqIEByZXR1cm5zIHtPYmplY3R9IHNldHBvaW50KHMpIGV4cGVjdGVkXHJcbiAgICAgICAqL1xyXG4gICAgZGVmYXVsdFNldHBvaW50KCkge1xyXG4gICAgICAgIHN3aXRjaCAodGhpcy50eXBlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9FTkFCTEVfV0lGSTpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0RJU0FCTEVfV0lGSTpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0VOQUJMRV9XRUJSRVBMOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfRElTQUJMRV9XRUJSRVBMOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfQlJFQUs6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9NT0RFX01FVEVSOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfTU9ERV9SRVNJU1RPUlM6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyAnUmVzaXN0YW5jZSAob2htcyknOiAweEZGRkYgfTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX01PREVfVl9MT0FEOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgJ0xvYWQgKG9obXMpJzogNTUwIH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9SRUJPT1Q6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9SVU5fVEVTVDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0xJR0hUX1NMRUVQOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfREVFUF9TTEVFUDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7fTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX01FVEVSX0NPTU1BTkRTOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgRW5hYmxlOiB0cnVlIH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfSU5JVElBTF9NRVRFUl9DT01NOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgRW5hYmxlOiB0cnVlIH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfV0lGSV9ORVRXT1JLOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgU1NJRDogJycgfTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9XSUZJX1BBU1NXT1JEOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgUGFzc3dvcmQ6ICcnIH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfSU5JVElBTF9CTFVFVE9PVEg6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBFbmFibGU6IHRydWUgfTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9JTklUSUFMX1dJRkk6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBFbmFibGU6IHRydWUgfTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9ERUVQU0xFRVBfTUlOOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgJ0RlbGF5IChtaW4pJzogMTUgfTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9WRVJCT1NFOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgRW5hYmxlOiB0cnVlIH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfSU5JVElBTF9DT01NQU5EX1RZUEU6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyAnQ29tbWFuZCB0eXBlKDEvMi8zKSc6IDEgfTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9JTklUSUFMX0NPTU1BTkRfU0VUUE9JTlQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyAnU2V0cG9pbnQgKG9obXMpJzogMHhGRkZGIH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9SX1RFU1Q6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge307XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfQ1BVOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgJ0ZyZXF1ZW5jeSAoTUh6OiAxLT44MCwgMi0+MTYwLCAzLT4yNDApJzogMSB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX09UQTpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IEVuYWJsZTogdHJ1ZSB9O1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfQ09ORklHVVJFX01FVEVSX0NPTU06XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBJbmRleDogMCwgJ1ZvbHRhZ2UgKFYpJzogOCwgJ0NvbW1hbmQgdHlwZSAoMS8yLzMpJzogMiwgJ1NldHBvaW50IChvaG1zKSc6IDExMDAgfTtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9CTFVFVE9PVEhfTkFNRTpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7ICdEZXZpY2UgbmFtZSc6ICdJT1Rlc3RpbmcgYm9hcmQnIH07XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9SRUZSRVNIOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHt9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5leHBvcnRzLkNvbW1hbmQgPSBDb21tYW5kO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1Db21tYW5kLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuQ29tbWFuZFJlc3VsdCA9IHZvaWQgMDtcclxuY2xhc3MgQ29tbWFuZFJlc3VsdCB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLnZhbHVlID0gMC4wO1xyXG4gICAgICAgIHRoaXMuc3VjY2VzcyA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMubWVzc2FnZSA9ICcnO1xyXG4gICAgICAgIHRoaXMudW5pdCA9ICcnO1xyXG4gICAgICAgIHRoaXMuc2Vjb25kYXJ5X3ZhbHVlID0gMC4wO1xyXG4gICAgICAgIHRoaXMuc2Vjb25kYXJ5X3VuaXQgPSAnJztcclxuICAgIH1cclxufVxyXG5leHBvcnRzLkNvbW1hbmRSZXN1bHQgPSBDb21tYW5kUmVzdWx0O1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1Db21tYW5kUmVzdWx0LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cIndlYi1ibHVldG9vdGhcIiAvPlxyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuRHJpdmVyID0gdm9pZCAwO1xyXG4vKipcclxuICogIEJsdWV0b290aCBoYW5kbGluZyBtb2R1bGUsIGluY2x1ZGluZyBtYWluIHN0YXRlIG1hY2hpbmUgbG9vcC5cclxuICogIFRoaXMgbW9kdWxlIGludGVyYWN0cyB3aXRoIGJyb3dzZXIgZm9yIGJsdWV0b290aCBjb211bmljYXRpb25zIGFuZCBwYWlyaW5nLCBhbmQgd2l0aCBTZW5lY2FNU0Mgb2JqZWN0LlxyXG4gKi9cclxuY29uc3QgQVBJU3RhdGVfMSA9IHJlcXVpcmUoXCIuL0FQSVN0YXRlXCIpO1xyXG5jb25zdCBjb25zdGFudHNfMSA9IHJlcXVpcmUoXCIuL2NvbnN0YW50c1wiKTtcclxuY29uc3QgSU9UZXN0aW5nQm9hcmRfMSA9IHJlcXVpcmUoXCIuL0lPVGVzdGluZ0JvYXJkXCIpO1xyXG5jb25zdCBDb21tYW5kXzEgPSByZXF1aXJlKFwiLi9Db21tYW5kXCIpO1xyXG5jb25zdCB1dGlsc18xID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XHJcbmNvbnN0IGxvZyA9IHJlcXVpcmUoXCJsb2dsZXZlbFwiKTtcclxuY2xhc3MgRHJpdmVyIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMubG9nZ2luZyA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuc2ltdWxhdGlvbiA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuYnRTdGF0ZSA9IG5ldyBBUElTdGF0ZV8xLkJUQXBpU3RhdGUoKTtcclxuICAgICAgICB0aGlzLmlvdCA9IG5ldyBJT1Rlc3RpbmdCb2FyZF8xLklPVGVzdGluZ0JvYXJkKHRoaXMuU2VuZEFuZFJlc3BvbnNlLCB0aGlzLmJ0U3RhdGUpO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgICAqIFNlbmQgdGhlIG1lc3NhZ2UgdXNpbmcgQmx1ZXRvb3RoIGFuZCB3YWl0IGZvciBhbiBhbnN3ZXJcclxuICAgICAgICovXHJcbiAgICBhc3luYyBTZW5kQW5kUmVzcG9uc2UoY29tbWFuZCkge1xyXG4gICAgICAgIGlmIChjb21tYW5kID09IG51bGwgfHwgdGhpcy5idFN0YXRlLmNoYXJXcml0ZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsb2cuZGVidWcoJz4+ICcgKyAoMCwgdXRpbHNfMS5idWYyaGV4KShjb21tYW5kKSk7XHJcbiAgICAgICAgdGhpcy5idFN0YXRlLnJlc3BvbnNlID0gbnVsbDtcclxuICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMucmVxdWVzdHMrKztcclxuICAgICAgICBjb25zdCBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgICBhd2FpdCB0aGlzLmJ0U3RhdGUuY2hhcldyaXRlLndyaXRlVmFsdWVXaXRob3V0UmVzcG9uc2UoY29tbWFuZCk7XHJcbiAgICAgICAgd2hpbGUgKHRoaXMuYnRTdGF0ZS5zdGF0ZSA9PSBjb25zdGFudHNfMS5TdGF0ZS5NRVRFUl9JTklUSUFMSVpJTkcgfHxcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID09IGNvbnN0YW50c18xLlN0YXRlLkJVU1kpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYnRTdGF0ZS5yZXNwb25zZSAhPSBudWxsKVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAzNSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBlbmRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgICAgY29uc3QgYW5zd2VyID0gdGhpcy5idFN0YXRlLnJlc3BvbnNlPy5zbGljZSgwKTtcclxuICAgICAgICB0aGlzLmJ0U3RhdGUubGFzdE1lYXN1cmUgPSBJT1Rlc3RpbmdCb2FyZF8xLklPVGVzdGluZ0JvYXJkLnBhcnNlTm90aWZpY2F0aW9uKGFuc3dlcik7XHJcbiAgICAgICAgdGhpcy5idFN0YXRlLnJlc3BvbnNlID0gbnVsbDtcclxuICAgICAgICAvLyBMb2cgdGhlIHBhY2tldHNcclxuICAgICAgICBpZiAodGhpcy5sb2dnaW5nKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHBhY2tldCA9IHsgcmVxdWVzdDogKDAsIHV0aWxzXzEuYnVmMmhleCkoY29tbWFuZCksIGFuc3dlcjogKDAsIHV0aWxzXzEuYnVmMmhleCkoYW5zd2VyKSB9O1xyXG4gICAgICAgICAgICBjb25zdCBzdG9yYWdlX3ZhbHVlID0gd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdJT1Rlc3RpbmdUcmFjZScpO1xyXG4gICAgICAgICAgICBsZXQgcGFja2V0cyA9IFtdO1xyXG4gICAgICAgICAgICBpZiAoc3RvcmFnZV92YWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBwYWNrZXRzID0gSlNPTi5wYXJzZShzdG9yYWdlX3ZhbHVlKTsgLy8gUmVzdG9yZSB0aGUganNvbiBwZXJzaXN0ZWQgb2JqZWN0XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcGFja2V0cy5wdXNoKEpTT04uc3RyaW5naWZ5KHBhY2tldCkpOyAvLyBBZGQgdGhlIG5ldyBvYmplY3RcclxuICAgICAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdJT1Rlc3RpbmdUcmFjZScsIEpTT04uc3RyaW5naWZ5KHBhY2tldHMpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLnJlc3BvbnNlVGltZSA9IE1hdGgucm91bmQoKDEuMCAqIHRoaXMuYnRTdGF0ZS5zdGF0cy5yZXNwb25zZVRpbWUgKiAodGhpcy5idFN0YXRlLnN0YXRzLnJlc3BvbnNlcyAlIDUwMCkgKyAoZW5kVGltZSAtIHN0YXJ0VGltZSkpIC8gKCh0aGlzLmJ0U3RhdGUuc3RhdHMucmVzcG9uc2VzICUgNTAwKSArIDEpKTtcclxuICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMubGFzdFJlc3BvbnNlVGltZSA9IE1hdGgucm91bmQoZW5kVGltZSAtIHN0YXJ0VGltZSkgKyAnIG1zJztcclxuICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMucmVzcG9uc2VzKys7XHJcbiAgICAgICAgcmV0dXJuIGFuc3dlcjtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBNYWluIGxvb3Agb2YgdGhlIG1ldGVyIGhhbmRsZXIuXHJcbiAgICAgICAqICovXHJcbiAgICBhc3luYyBzdGF0ZU1hY2hpbmUoKSB7XHJcbiAgICAgICAgbGV0IG5leHRBY3Rpb247XHJcbiAgICAgICAgY29uc3QgREVMQVlfTVMgPSAodGhpcy5zaW11bGF0aW9uID8gMjAgOiA3NTApOyAvLyBVcGRhdGUgdGhlIHN0YXR1cyBldmVyeSBYIG1zLlxyXG4gICAgICAgIGNvbnN0IFRJTUVPVVRfTVMgPSAodGhpcy5zaW11bGF0aW9uID8gMTAwMCA6IDMwMDAwKTsgLy8gR2l2ZSB1cCBzb21lIG9wZXJhdGlvbnMgYWZ0ZXIgWCBtcy5cclxuICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhcnRlZCA9IHRydWU7XHJcbiAgICAgICAgbG9nLmRlYnVnKCdDdXJyZW50IHN0YXRlOicgKyB0aGlzLmJ0U3RhdGUuc3RhdGUpO1xyXG4gICAgICAgIC8vIENvbnNlY3V0aXZlIHN0YXRlIGNvdW50ZWQuIENhbiBiZSB1c2VkIHRvIHRpbWVvdXQuXHJcbiAgICAgICAgaWYgKHRoaXMuYnRTdGF0ZS5zdGF0ZSA9PSB0aGlzLmJ0U3RhdGUucHJldl9zdGF0ZSkge1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGVfY3B0Kys7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGVfY3B0ID0gMDtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gU3RvcCByZXF1ZXN0IGZyb20gQVBJXHJcbiAgICAgICAgaWYgKHRoaXMuYnRTdGF0ZS5zdG9wUmVxdWVzdCkge1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5TVE9QUElORztcclxuICAgICAgICB9XHJcbiAgICAgICAgbG9nLmRlYnVnKCdcXFN0YXRlOicgKyB0aGlzLmJ0U3RhdGUuc3RhdGUpO1xyXG4gICAgICAgIHN3aXRjaCAodGhpcy5idFN0YXRlLnN0YXRlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuTk9UX0NPTk5FQ1RFRDogLy8gaW5pdGlhbCBzdGF0ZSBvbiBTdGFydCgpXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zaW11bGF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMuZmFrZVBhaXJEZXZpY2UuYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIG5leHRBY3Rpb24gPSB0aGlzLmJ0UGFpckRldmljZS5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuQ09OTkVDVElORzogLy8gd2FpdGluZyBmb3IgY29ubmVjdGlvbiB0byBjb21wbGV0ZVxyXG4gICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLkRFVklDRV9QQUlSRUQ6IC8vIGNvbm5lY3Rpb24gY29tcGxldGUsIGFjcXVpcmUgbWV0ZXIgc3RhdGVcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNpbXVsYXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gdGhpcy5mYWtlU3Vic2NyaWJlLmJpbmQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gdGhpcy5idFN1YnNjcmliZS5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuU1VCU0NSSUJJTkc6IC8vIHdhaXRpbmcgZm9yIEJsdWV0b290aCBpbnRlcmZhY2VzXHJcbiAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYnRTdGF0ZS5zdGF0ZV9jcHQgPiAoVElNRU9VVF9NUyAvIERFTEFZX01TKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRpbWVvdXQsIHRyeSB0byByZXN1YnNjcmliZVxyXG4gICAgICAgICAgICAgICAgICAgIGxvZy53YXJuKCdUaW1lb3V0IGluIFNVQlNDUklCSU5HJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuREVWSUNFX1BBSVJFRDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGVfY3B0ID0gMDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLk1FVEVSX0lOSVQ6IC8vIHJlYWR5IHRvIGNvbW11bmljYXRlLCBhY3F1aXJlIG1ldGVyIHN0YXR1c1xyXG4gICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMubWV0ZXJJbml0LmJpbmQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5TdGF0ZS5NRVRFUl9JTklUSUFMSVpJTkc6IC8vIHJlYWRpbmcgdGhlIG1ldGVyIHN0YXR1c1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYnRTdGF0ZS5zdGF0ZV9jcHQgPiAoVElNRU9VVF9NUyAvIERFTEFZX01TKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZy53YXJuKCdUaW1lb3V0IGluIE1FVEVSX0lOSVRJQUxJWklORycpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRpbWVvdXQsIHRyeSB0byByZXN1YnNjcmliZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnNpbXVsYXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMuZmFrZVN1YnNjcmliZS5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMuYnRTdWJzY3JpYmUuYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlX2NwdCA9IDA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuSURMRTogLy8gcmVhZHkgdG8gcHJvY2VzcyBjb21tYW5kcyBmcm9tIEFQSVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYnRTdGF0ZS5jb21tYW5kICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gdGhpcy5wcm9jZXNzQ29tbWFuZC5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMucmVmcmVzaC5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuRVJST1I6IC8vIGFueXRpbWUgYW4gZXJyb3IgaGFwcGVuc1xyXG4gICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMuZGlzY29ubmVjdC5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuQlVTWTogLy8gd2hpbGUgYSBjb21tYW5kIGluIGdvaW5nIG9uXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5idFN0YXRlLnN0YXRlX2NwdCA+IChUSU1FT1VUX01TIC8gREVMQVlfTVMpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9nLndhcm4oJ1RpbWVvdXQgaW4gQlVTWScpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRpbWVvdXQsIHRyeSB0byByZXN1YnNjcmliZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnNpbXVsYXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMuZmFrZVN1YnNjcmliZS5iaW5kKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dEFjdGlvbiA9IHRoaXMuYnRTdWJzY3JpYmUuYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlX2NwdCA9IDA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuU1RPUFBJTkc6XHJcbiAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gdGhpcy5kaXNjb25uZWN0LmJpbmQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5TdGF0ZS5TVE9QUEVEOiAvLyBhZnRlciBhIGRpc2Nvbm5lY3RvciBvciBTdG9wKCkgcmVxdWVzdCwgc3RvcHMgdGhlIHN0YXRlIG1hY2hpbmUuXHJcbiAgICAgICAgICAgICAgICBuZXh0QWN0aW9uID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5idFN0YXRlLnByZXZfc3RhdGUgPSB0aGlzLmJ0U3RhdGUuc3RhdGU7XHJcbiAgICAgICAgaWYgKG5leHRBY3Rpb24gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGxvZy5kZWJ1ZygnXFx0RXhlY3V0aW5nOicgKyBuZXh0QWN0aW9uLm5hbWUpO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgbmV4dEFjdGlvbigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICBsb2cuZXJyb3IoJ0V4Y2VwdGlvbiBpbiBzdGF0ZSBtYWNoaW5lJywgZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuYnRTdGF0ZS5zdGF0ZSAhPSBjb25zdGFudHNfMS5TdGF0ZS5TVE9QUEVEKSB7XHJcbiAgICAgICAgICAgIHZvaWQgKDAsIHV0aWxzXzEuc2xlZXApKERFTEFZX01TKS50aGVuKGFzeW5jICgpID0+IHsgYXdhaXQgdGhpcy5zdGF0ZU1hY2hpbmUoKTsgfSk7IC8vIFJlY2hlY2sgc3RhdHVzIGluIERFTEFZX01TIG1zXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBsb2cuZGVidWcoJ1xcdFRlcm1pbmF0aW5nIFN0YXRlIG1hY2hpbmUnKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXJ0ZWQgPSBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAgICogQ2FsbGVkIGZyb20gc3RhdGUgbWFjaGluZSB0byBleGVjdXRlIGEgc2luZ2xlIGNvbW1hbmQgZnJvbSBidFN0YXRlLmNvbW1hbmQgcHJvcGVydHlcclxuICAgICAgICogKi9cclxuICAgIGFzeW5jIHByb2Nlc3NDb21tYW5kKCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGxldCByZXNwb25zZTtcclxuICAgICAgICAgICAgY29uc3QgY29tbWFuZCA9IHRoaXMuYnRTdGF0ZS5jb21tYW5kO1xyXG4gICAgICAgICAgICBpZiAoY29tbWFuZCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuQlVTWTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLmNvbW1hbmRzKys7XHJcbiAgICAgICAgICAgIGxvZy5pbmZvKCdcXHRcXHRFeGVjdXRpbmcgY29tbWFuZCA6JyArIGNvbW1hbmQpO1xyXG4gICAgICAgICAgICBjb25zdCBwYWNrZXRfY2xlYXIgPSBJT1Rlc3RpbmdCb2FyZF8xLklPVGVzdGluZ0JvYXJkLmdldFBhY2tldChDb21tYW5kXzEuQ29tbWFuZC5DcmVhdGVOb1NQKGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfQ0xFQVJfRkxBR1MpKTtcclxuICAgICAgICAgICAgY29uc3QgcGFja2V0ID0gSU9UZXN0aW5nQm9hcmRfMS5JT1Rlc3RpbmdCb2FyZC5nZXRQYWNrZXQoY29tbWFuZCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHBhY2tldHMgPSBbcGFja2V0X2NsZWFyLCBwYWNrZXRdO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IG1zZyBvZiBwYWNrZXRzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50Q3B0ID0gdGhpcy5idFN0YXRlLmxhc3RNZWFzdXJlICE9IG51bGwgPyB0aGlzLmJ0U3RhdGUubGFzdE1lYXN1cmUuQ29tbWFuZENwdCA6IC0xO1xyXG4gICAgICAgICAgICAgICAgZG8ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlID0gYXdhaXQgdGhpcy5TZW5kQW5kUmVzcG9uc2UobXNnKTtcclxuICAgICAgICAgICAgICAgIH0gd2hpbGUgKGN1cnJlbnRDcHQgPT0gdGhpcy5idFN0YXRlLmxhc3RNZWFzdXJlPy5Db21tYW5kQ3B0KTtcclxuICAgICAgICAgICAgICAgIC8vIEJvYXJkIGlzIGluY3JlbWVudGluZyB0aGUgY291bnRlciBldmVyeSB0aW1lIGl0IHByb2Nlc3NlcyBvbmUgY29tbWFuZFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIExhc3QgZXJyb3IgZmxhZ1xyXG4gICAgICAgICAgICBjb21tYW5kLmVycm9yID0gIXRoaXMuYnRTdGF0ZS5sYXN0TWVhc3VyZS5MYXN0UmVzdWx0O1xyXG4gICAgICAgICAgICAvLyBDYWxsZXIgZXhwZWN0cyBhIHZhbGlkIHByb3BlcnR5IGluIEdldFN0YXRlKCkgb25jZSBjb21tYW5kIGlzIGV4ZWN1dGVkLlxyXG4gICAgICAgICAgICBsb2cuZGVidWcoJ1xcdFxcdFJlZnJlc2hpbmcgY3VycmVudCBzdGF0ZScpO1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJlZnJlc2goKTtcclxuICAgICAgICAgICAgY29tbWFuZC5wZW5kaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5jb21tYW5kID0gbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuSURMRTtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKCdcXHRcXHRDb21wbGV0ZWQgY29tbWFuZCBleGVjdXRlZCcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIGxvZy5lcnJvcignKiogZXJyb3Igd2hpbGUgZXhlY3V0aW5nIGNvbW1hbmQ6ICcgKyBlcnIpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5NRVRFUl9JTklUO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuZXhjZXB0aW9ucysrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBBY3F1aXJlIHRoZSBjdXJyZW50IG1vZGUgYW5kIHNlcmlhbCBudW1iZXIgb2YgdGhlIGRldmljZS5cclxuICAgICAgICogKi9cclxuICAgIGFzeW5jIG1ldGVySW5pdCgpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5NRVRFUl9JTklUSUFMSVpJTkc7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5tZXRlci5od19yZXYgPSBhd2FpdCB0aGlzLmlvdC5nZXRIYXJkd2FyZVJldmlzaW9uKCk7XHJcbiAgICAgICAgICAgIGxvZy5pbmZvKCdcXHRcXHRTZXJpYWwgbnVtYmVyOicgKyB0aGlzLmJ0U3RhdGUubWV0ZXIuaHdfcmV2KTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLm1ldGVyLmZpcm13YXJlID0gYXdhaXQgdGhpcy5pb3QuZ2V0RmlybXdhcmUoKTtcclxuICAgICAgICAgICAgbG9nLmluZm8oJ1xcdFxcdFNlcmlhbCBudW1iZXI6JyArIHRoaXMuYnRTdGF0ZS5tZXRlci5maXJtd2FyZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5tZXRlci5iYXR0ZXJ5ID0gYXdhaXQgdGhpcy5pb3QuZ2V0QmF0dGVyeUxldmVsKCk7XHJcbiAgICAgICAgICAgIGxvZy5kZWJ1ZygnXFx0XFx0QmF0dGVyeSAoJSk6JyArIHRoaXMuYnRTdGF0ZS5tZXRlci5iYXR0ZXJ5KTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuSURMRTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICBsb2cud2FybignRXJyb3Igd2hpbGUgaW5pdGlhbGl6aW5nIG1ldGVyIDonICsgZXJyKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLmV4Y2VwdGlvbnMrKztcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuREVWSUNFX1BBSVJFRDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKlxyXG4gICAgICAqIENsb3NlIHRoZSBibHVldG9vdGggaW50ZXJmYWNlICh1bnBhaXIpXHJcbiAgICAgICogKi9cclxuICAgIGFzeW5jIGRpc2Nvbm5lY3QoKSB7XHJcbiAgICAgICAgdGhpcy5idFN0YXRlLmNvbW1hbmQgPSBudWxsO1xyXG4gICAgICAgIGF3YWl0IHRoaXMuYnRTdGF0ZS5yZXNldCh0aGlzLm9uRGlzY29ubmVjdGVkLmJpbmQodGhpcykpO1xyXG4gICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLlNUT1BQRUQ7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAgICogRXZlbnQgY2FsbGVkIGJ5IGJyb3dzZXIgQlQgYXBpIHdoZW4gdGhlIGRldmljZSBkaXNjb25uZWN0XHJcbiAgICAgICAqICovXHJcbiAgICBhc3luYyBvbkRpc2Nvbm5lY3RlZCgpIHtcclxuICAgICAgICBsb2cud2FybignKiBHQVRUIFNlcnZlciBkaXNjb25uZWN0ZWQgZXZlbnQsIHdpbGwgdHJ5IHRvIHJlY29ubmVjdCAqJyk7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5idFN0YXRlLnJlc2V0KCk7XHJcbiAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzWydHQVRUIGRpc2Nvbm5lY3RzJ10rKztcclxuICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5ERVZJQ0VfUEFJUkVEOyAvLyBUcnkgdG8gYXV0by1yZWNvbm5lY3QgdGhlIGludGVyZmFjZXMgd2l0aG91dCBwYWlyaW5nXHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAgICogSm9pbnMgdGhlIGFyZ3VtZW50cyBpbnRvIGEgc2luZ2xlIGJ1ZmZlclxyXG4gICAgICAgKiBAcmV0dXJucyB7QXJyYXlCdWZmZXJ9IGNvbmNhdGVuYXRlZCBidWZmZXJcclxuICAgICAgICovXHJcbiAgICBhcnJheUJ1ZmZlckNvbmNhdChidWZmZXIxLCBidWZmZXIyKSB7XHJcbiAgICAgICAgbGV0IGxlbmd0aCA9IDA7XHJcbiAgICAgICAgbGV0IGJ1ZmZlcjtcclxuICAgICAgICBmb3IgKHZhciBpIGluIGFyZ3VtZW50cykge1xyXG4gICAgICAgICAgICBidWZmZXIgPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgICAgIGlmIChidWZmZXIpIHtcclxuICAgICAgICAgICAgICAgIGxlbmd0aCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBqb2luZWQgPSBuZXcgVWludDhBcnJheShsZW5ndGgpO1xyXG4gICAgICAgIGxldCBvZmZzZXQgPSAwO1xyXG4gICAgICAgIGZvciAoaSBpbiBhcmd1bWVudHMpIHtcclxuICAgICAgICAgICAgYnVmZmVyID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgICAgICBqb2luZWQuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZmZlciksIG9mZnNldCk7XHJcbiAgICAgICAgICAgIG9mZnNldCArPSBidWZmZXIuYnl0ZUxlbmd0aDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGpvaW5lZC5idWZmZXI7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAgICogRXZlbnQgY2FsbGVkIGJ5IGJsdWV0b290aCBjaGFyYWN0ZXJpc3RpY3Mgd2hlbiByZWNlaXZpbmcgZGF0YVxyXG4gICAgICAgKiBAcGFyYW0ge2FueX0gZXZlbnRcclxuICAgICAgICovXHJcbiAgICBoYW5kbGVOb3RpZmljYXRpb25zKGV2ZW50KSB7XHJcbiAgICAgICAgY29uc3QgdmFsdWUgPSBldmVudC50YXJnZXQudmFsdWU7XHJcbiAgICAgICAgaWYgKHZhbHVlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKCc8PCAnICsgKDAsIHV0aWxzXzEuYnVmMmhleCkodmFsdWUuYnVmZmVyKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5yZXNwb25zZSA9IHZhbHVlLmJ1ZmZlci5zbGljZSgwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAgICogVGhpcyBmdW5jdGlvbiB3aWxsIHN1Y2NlZWQgb25seSBpZiBjYWxsZWQgYXMgYSBjb25zZXF1ZW5jZSBvZiBhIHVzZXItZ2VzdHVyZVxyXG4gICAgICAgKiBFLmcuIGJ1dHRvbiBjbGljay4gVGhpcyBpcyBkdWUgdG8gQmx1ZVRvb3RoIEFQSSBzZWN1cml0eSBtb2RlbC5cclxuICAgICAgICogKi9cclxuICAgIGFzeW5jIGJ0UGFpckRldmljZSgpIHtcclxuICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5DT05ORUNUSU5HO1xyXG4gICAgICAgIGNvbnN0IGZvcmNlU2VsZWN0aW9uID0gdGhpcy5idFN0YXRlLm9wdGlvbnMuZm9yY2VEZXZpY2VTZWxlY3Rpb247XHJcbiAgICAgICAgbG9nLmRlYnVnKCdidFBhaXJEZXZpY2UoJyArIGZvcmNlU2VsZWN0aW9uICsgJyknKTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIChuYXZpZ2F0b3IuYmx1ZXRvb3RoPy5nZXRBdmFpbGFiaWxpdHkpID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhdmFpbGFiaWxpdHkgPSBhd2FpdCBuYXZpZ2F0b3IuYmx1ZXRvb3RoLmdldEF2YWlsYWJpbGl0eSgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFhdmFpbGFiaWxpdHkpIHtcclxuICAgICAgICAgICAgICAgICAgICBsb2cuZXJyb3IoJ0JsdWV0b290aCBub3QgYXZhaWxhYmxlIGluIGJyb3dzZXIuJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdCcm93c2VyIGRvZXMgbm90IHByb3ZpZGUgYmx1ZXRvb3RoJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbGV0IGRldmljZSA9IG51bGw7XHJcbiAgICAgICAgICAgIC8vIERvIHdlIGFscmVhZHkgaGF2ZSBwZXJtaXNzaW9uP1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIChuYXZpZ2F0b3IuYmx1ZXRvb3RoPy5nZXREZXZpY2VzKSA9PT0gJ2Z1bmN0aW9uJyAmJlxyXG4gICAgICAgICAgICAgICAgIWZvcmNlU2VsZWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhdmFpbGFibGVEZXZpY2VzID0gYXdhaXQgbmF2aWdhdG9yLmJsdWV0b290aC5nZXREZXZpY2VzKCk7XHJcbiAgICAgICAgICAgICAgICBhdmFpbGFibGVEZXZpY2VzLmZvckVhY2goZnVuY3Rpb24gKGRldiwgaW5kZXgpIHtcclxuICAgICAgICAgICAgICAgICAgICBsb2cuZGVidWcoJ0ZvdW5kIGF1dGhvcml6ZWQgZGV2aWNlIDonICsgZGV2Lm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGRldmljZSA9IGRldjtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgbG9nLmRlYnVnKCduYXZpZ2F0b3IuYmx1ZXRvb3RoLmdldERldmljZXMoKT0nICsgZGV2aWNlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBJZiBub3QsIHJlcXVlc3QgZnJvbSB1c2VyXHJcbiAgICAgICAgICAgIGlmIChkZXZpY2UgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgZGV2aWNlID0gYXdhaXQgbmF2aWdhdG9yLmJsdWV0b290aFxyXG4gICAgICAgICAgICAgICAgICAgIC5yZXF1ZXN0RGV2aWNlKHtcclxuICAgICAgICAgICAgICAgICAgICBhY2NlcHRBbGxEZXZpY2VzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJzOiBbeyBzZXJ2aWNlczogW2NvbnN0YW50c18xLkJsdWVUb290aElPVFVVSUQuU2VydmljZVV1aWQudG9Mb3dlckNhc2UoKV0gfV0sXHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9uYWxTZXJ2aWNlczogWydiYXR0ZXJ5X3NlcnZpY2UnLCAnZ2VuZXJpY19hY2Nlc3MnLCAnZGV2aWNlX2luZm9ybWF0aW9uJywgY29uc3RhbnRzXzEuQmx1ZVRvb3RoSU9UVVVJRC5TZXJ2aWNlVXVpZC50b0xvd2VyQ2FzZSgpXVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLmJ0RGV2aWNlID0gZGV2aWNlO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5ERVZJQ0VfUEFJUkVEO1xyXG4gICAgICAgICAgICBsb2cuaW5mbygnQmx1ZXRvb3RoIGRldmljZSAnICsgZGV2aWNlLm5hbWUgKyAnIGNvbm5lY3RlZC4nKTtcclxuICAgICAgICAgICAgYXdhaXQgKDAsIHV0aWxzXzEuc2xlZXApKDUwMCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgbG9nLndhcm4oJyoqIGVycm9yIHdoaWxlIGNvbm5lY3Rpbmc6ICcgKyBlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYnRTdGF0ZS5yZXNldCh0aGlzLm9uRGlzY29ubmVjdGVkLmJpbmQodGhpcykpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5FUlJPUjtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLmV4Y2VwdGlvbnMrKztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBhc3luYyBmYWtlUGFpckRldmljZSgpIHtcclxuICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5DT05ORUNUSU5HO1xyXG4gICAgICAgIGNvbnN0IGZvcmNlU2VsZWN0aW9uID0gdGhpcy5idFN0YXRlLm9wdGlvbnMuZm9yY2VEZXZpY2VTZWxlY3Rpb247XHJcbiAgICAgICAgbG9nLmRlYnVnKCdmYWtlUGFpckRldmljZSgnICsgZm9yY2VTZWxlY3Rpb24gKyAnKScpO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRldmljZSA9IHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdGYWtlQlREZXZpY2UnLFxyXG4gICAgICAgICAgICAgICAgZ2F0dDogeyBjb25uZWN0ZWQ6IHRydWUsIGRldmljZTogbnVsbCwgY29ubmVjdDogbnVsbCwgZGlzY29ubmVjdDogbnVsbCwgZ2V0UHJpbWFyeVNlcnZpY2U6IG51bGwsIGdldFByaW1hcnlTZXJ2aWNlczogbnVsbCB9LFxyXG4gICAgICAgICAgICAgICAgaWQ6ICcxJyxcclxuICAgICAgICAgICAgICAgIGZvcmdldDogbnVsbCxcclxuICAgICAgICAgICAgICAgIHdhdGNoQWR2ZXJ0aXNlbWVudHM6IG51bGwsXHJcbiAgICAgICAgICAgICAgICB3YXRjaGluZ0FkdmVydGlzZW1lbnRzOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgYWRkRXZlbnRMaXN0ZW5lcjogbnVsbCxcclxuICAgICAgICAgICAgICAgIHJlbW92ZUV2ZW50TGlzdGVuZXI6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBkaXNwYXRjaEV2ZW50OiBudWxsLFxyXG4gICAgICAgICAgICAgICAgb25hZHZlcnRpc2VtZW50cmVjZWl2ZWQ6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBvbmdhdHRzZXJ2ZXJkaXNjb25uZWN0ZWQ6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBvbmNoYXJhY3RlcmlzdGljdmFsdWVjaGFuZ2VkOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgb25zZXJ2aWNlYWRkZWQ6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBvbnNlcnZpY2VyZW1vdmVkOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgb25zZXJ2aWNlY2hhbmdlZDogbnVsbFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuYnREZXZpY2UgPSBkZXZpY2U7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkRFVklDRV9QQUlSRUQ7XHJcbiAgICAgICAgICAgIGxvZy5pbmZvKCdCbHVldG9vdGggZGV2aWNlICcgKyBkZXZpY2UubmFtZSArICcgY29ubmVjdGVkLicpO1xyXG4gICAgICAgICAgICBhd2FpdCAoMCwgdXRpbHNfMS5zbGVlcCkoNTApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIGxvZy53YXJuKCcqKiBlcnJvciB3aGlsZSBjb25uZWN0aW5nOiAnICsgZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmJ0U3RhdGUucmVzZXQoKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLmV4Y2VwdGlvbnMrKztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAgICogT25jZSB0aGUgZGV2aWNlIGlzIGF2YWlsYWJsZSwgaW5pdGlhbGl6ZSB0aGUgc2VydmljZSBhbmQgdGhlIDIgY2hhcmFjdGVyaXN0aWNzIG5lZWRlZC5cclxuICAgICAgICogKi9cclxuICAgIGFzeW5jIGJ0U3Vic2NyaWJlKCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLlNVQlNDUklCSU5HO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuc3ViY3JpYmVzKys7XHJcbiAgICAgICAgICAgIGNvbnN0IGRldmljZSA9IHRoaXMuYnRTdGF0ZS5idERldmljZTtcclxuICAgICAgICAgICAgY29uc3QgZ2F0dHNlcnZlciA9IG51bGw7XHJcbiAgICAgICAgICAgIGlmIChkZXZpY2UgJiYgZGV2aWNlLmdhdHQpIHtcclxuICAgICAgICAgICAgICAgIGlmICghZGV2aWNlLmdhdHQuY29ubmVjdGVkIHx8IHRoaXMuYnRTdGF0ZS5idEdBVFRTZXJ2ZXIgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZy5kZWJ1ZyhgQ29ubmVjdGluZyB0byBHQVRUIFNlcnZlciBvbiAke2RldmljZS5uYW1lfS4uLmApO1xyXG4gICAgICAgICAgICAgICAgICAgIGRldmljZS5hZGRFdmVudExpc3RlbmVyKCdnYXR0c2VydmVyZGlzY29ubmVjdGVkJywgdGhpcy5vbkRpc2Nvbm5lY3RlZC5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ0U3RhdGUuYnRHQVRUU2VydmVyID0gYXdhaXQgZGV2aWNlLmdhdHQuY29ubmVjdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvZy5kZWJ1ZygnPiBGb3VuZCBHQVRUIHNlcnZlcicpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbG9nLmRlYnVnKCdHQVRUIGFscmVhZHkgY29ubmVjdGVkJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmJ0U3RhdGUucmVzZXQodGhpcy5vbkRpc2Nvbm5lY3RlZC5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5idERldmljZSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5OT1RfQ09OTkVDVEVEO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLmV4Y2VwdGlvbnMrKztcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuYnRJT1RTZXJ2aWNlID0gYXdhaXQgdGhpcy5idFN0YXRlLmJ0R0FUVFNlcnZlci5nZXRQcmltYXJ5U2VydmljZShjb25zdGFudHNfMS5CbHVlVG9vdGhJT1RVVUlELlNlcnZpY2VVdWlkKTtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKCc+IEZvdW5kIElPVGVzdGluZyBib2FyZCBzZXJ2aWNlJyk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5jaGFyV3JpdGUgPSBhd2FpdCB0aGlzLmJ0U3RhdGUuYnRJT1RTZXJ2aWNlLmdldENoYXJhY3RlcmlzdGljKGNvbnN0YW50c18xLkJsdWVUb290aElPVFVVSUQuQ29tbWFuZENoYXJVdWlkKTtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKCc+IEZvdW5kIGNvbW1hbmQgY2hhcmFjdGVyaXN0aWMnKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLmNoYXJSZWFkID0gYXdhaXQgdGhpcy5idFN0YXRlLmJ0SU9UU2VydmljZS5nZXRDaGFyYWN0ZXJpc3RpYyhjb25zdGFudHNfMS5CbHVlVG9vdGhJT1RVVUlELlN0YXR1c0NoYXJVdWlkKTtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKCc+IEZvdW5kIG5vdGlmaWNhdGlvbnMgY2hhcmFjdGVyaXN0aWMnKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLmJ0RGV2aWNlSW5mb1NlcnZpY2UgPSBhd2FpdCB0aGlzLmJ0U3RhdGUuYnRHQVRUU2VydmVyLmdldFByaW1hcnlTZXJ2aWNlKCdkZXZpY2VfaW5mb3JtYXRpb24nKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLmNoYXJGaXJtd2FyZSA9IGF3YWl0IHRoaXMuYnRTdGF0ZS5idERldmljZUluZm9TZXJ2aWNlLmdldENoYXJhY3RlcmlzdGljKDB4MkEyNik7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5jaGFySFdSZXYgPSBhd2FpdCB0aGlzLmJ0U3RhdGUuYnREZXZpY2VJbmZvU2VydmljZS5nZXRDaGFyYWN0ZXJpc3RpYygweDJhMjcpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuYnRCYXR0ZXJ5U2VydmljZSA9IGF3YWl0IHRoaXMuYnRTdGF0ZS5idEdBVFRTZXJ2ZXIuZ2V0UHJpbWFyeVNlcnZpY2UoJ2JhdHRlcnlfc2VydmljZScpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuY2hhckJhdHRlcnkgPSBhd2FpdCB0aGlzLmJ0U3RhdGUuYnRCYXR0ZXJ5U2VydmljZS5nZXRDaGFyYWN0ZXJpc3RpYygweDJBMTkpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUucmVzcG9uc2UgPSBudWxsO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuY2hhclJlYWQuYWRkRXZlbnRMaXN0ZW5lcignY2hhcmFjdGVyaXN0aWN2YWx1ZWNoYW5nZWQnLCB0aGlzLmhhbmRsZU5vdGlmaWNhdGlvbnMuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYnRTdGF0ZS5jaGFyUmVhZC5zdGFydE5vdGlmaWNhdGlvbnMoKTtcclxuICAgICAgICAgICAgbG9nLmluZm8oJz4gQmx1ZXRvb3RoIGludGVyZmFjZXMgcmVhZHkuJyk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0cy5sYXN0X2Nvbm5lY3QgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgICAgICAgIGF3YWl0ICgwLCB1dGlsc18xLnNsZWVwKSg1MCk7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLk1FVEVSX0lOSVQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgbG9nLndhcm4oJyoqIGVycm9yIHdoaWxlIHN1YnNjcmliaW5nOiAnICsgZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmJ0U3RhdGUucmVzZXQoKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuREVWSUNFX1BBSVJFRDtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLmV4Y2VwdGlvbnMrKztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBhc3luYyBmYWtlU3Vic2NyaWJlKCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLlNVQlNDUklCSU5HO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuc3ViY3JpYmVzKys7XHJcbiAgICAgICAgICAgIGNvbnN0IGRldmljZSA9IHRoaXMuYnRTdGF0ZS5idERldmljZTtcclxuICAgICAgICAgICAgaWYgKCFkZXZpY2U/LmdhdHQ/LmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgbG9nLmRlYnVnKGBDb25uZWN0aW5nIHRvIEdBVFQgU2VydmVyIG9uICR7ZGV2aWNlPy5uYW1lfS4uLmApO1xyXG4gICAgICAgICAgICAgICAgbG9nLmRlYnVnKCc+IEZvdW5kIEdBVFQgc2VydmVyJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbG9nLmRlYnVnKCc+IEZvdW5kIFNlcmlhbCBzZXJ2aWNlJyk7XHJcbiAgICAgICAgICAgIGxvZy5kZWJ1ZygnPiBGb3VuZCB3cml0ZSBjaGFyYWN0ZXJpc3RpYycpO1xyXG4gICAgICAgICAgICBsb2cuZGVidWcoJz4gRm91bmQgcmVhZCBjaGFyYWN0ZXJpc3RpYycpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUucmVzcG9uc2UgPSBudWxsO1xyXG4gICAgICAgICAgICBsb2cuaW5mbygnPiBCbHVldG9vdGggaW50ZXJmYWNlcyByZWFkeS4nKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLmxhc3RfY29ubmVjdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcclxuICAgICAgICAgICAgYXdhaXQgKDAsIHV0aWxzXzEuc2xlZXApKDEwKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuTUVURVJfSU5JVDtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICBsb2cud2FybignKiogZXJyb3Igd2hpbGUgc3Vic2NyaWJpbmc6ICcgKyBlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYnRTdGF0ZS5yZXNldCh0aGlzLm9uRGlzY29ubmVjdGVkLmJpbmQodGhpcykpO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5ERVZJQ0VfUEFJUkVEO1xyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdHMuZXhjZXB0aW9ucysrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICAgKiBXaGVuIGlkbGUsIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkXHJcbiAgICAgICAqICovXHJcbiAgICBhc3luYyByZWZyZXNoKCkge1xyXG4gICAgICAgIHRoaXMuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLkJVU1k7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgbG9nLmRlYnVnKCdcXHRcXHRGaW5pc2hlZCByZWZyZXNoaW5nIGN1cnJlbnQgc3RhdGUnKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYnRTdGF0ZS5yZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLmxhc3RNZWFzdXJlID0gSU9UZXN0aW5nQm9hcmRfMS5JT1Rlc3RpbmdCb2FyZC5wYXJzZU5vdGlmaWNhdGlvbih0aGlzLmJ0U3RhdGUucmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLnJlc3BvbnNlID0gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5idFN0YXRlLmxhc3RNZWFzdXJlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5tZXRlci5hY3R1YWwgPSB0aGlzLmJ0U3RhdGUubGFzdE1lYXN1cmUuQWN0dWFsX1I7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ0U3RhdGUubWV0ZXIuc2V0cG9pbnQgPSB0aGlzLmJ0U3RhdGUubGFzdE1lYXN1cmUuU2V0cG9pbnRfUjtcclxuICAgICAgICAgICAgICAgIC8vIFJlYWQgcmFuZG9tbHkgb25jZSBldmVyeSAyMCBsb29wc1xyXG4gICAgICAgICAgICAgICAgaWYgKE1hdGgucmFuZG9tKCkgPiAwLjk1KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLm1ldGVyLmJhdHRlcnkgPSBhd2FpdCB0aGlzLmlvdC5nZXRCYXR0ZXJ5TGV2ZWwoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmJ0U3RhdGUubGFzdE1lYXN1cmUuVGVzdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5tZXRlci5tb2RlID0gY29uc3RhbnRzXzEuQm9hcmRNb2RlLk1PREVfVEVTVDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuYnRTdGF0ZS5sYXN0TWVhc3VyZS5SZWxheSA9PSBjb25zdGFudHNfMS5SZWxheVBvc2l0aW9uLlBPU19NRVRFUikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5tZXRlci5tb2RlID0gY29uc3RhbnRzXzEuQm9hcmRNb2RlLk1PREVfTUVURVI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0aGlzLmJ0U3RhdGUubGFzdE1lYXN1cmUuUmVsYXkgPT0gY29uc3RhbnRzXzEuUmVsYXlQb3NpdGlvbi5QT1NfUkVTSVNUT1IpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5idFN0YXRlLmxhc3RNZWFzdXJlLlZfd2l0aF9sb2FkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5tZXRlci5tb2RlID0gY29uc3RhbnRzXzEuQm9hcmRNb2RlLk1PREVfVl9XSVRIX0xPQUQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJ0U3RhdGUubWV0ZXIubW9kZSA9IGNvbnN0YW50c18xLkJvYXJkTW9kZS5NT0RFX1JFU0lTVE9SO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnRTdGF0ZS5tZXRlci5tb2RlID0gY29uc3RhbnRzXzEuQm9hcmRNb2RlLk1PREVfVU5ERUZJTkVEO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5idFN0YXRlLm1ldGVyLmZyZWVfYnl0ZXMgPSB0aGlzLmJ0U3RhdGUubGFzdE1lYXN1cmUuTWVtZnJlZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5JRExFO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIGxvZy53YXJuKCdFcnJvciB3aGlsZSByZWZyZXNoaW5nIG1lYXN1cmUnICsgZXJyKTtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRlID0gY29uc3RhbnRzXzEuU3RhdGUuREVWSUNFX1BBSVJFRDtcclxuICAgICAgICAgICAgdGhpcy5idFN0YXRlLnN0YXRzLmV4Y2VwdGlvbnMrKztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBTZXRTaW11bGF0aW9uKHZhbHVlKSB7XHJcbiAgICAgICAgdGhpcy5zaW11bGF0aW9uID0gdmFsdWU7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5Ecml2ZXIgPSBEcml2ZXI7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPURyaXZlci5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLklPVGVzdGluZ0JvYXJkID0gdm9pZCAwO1xyXG5jb25zdCBsb2cgPSByZXF1aXJlKFwibG9nbGV2ZWxcIik7XHJcbmNvbnN0IGNvbnN0YW50c18xID0gcmVxdWlyZShcIi4vY29uc3RhbnRzXCIpO1xyXG5jb25zdCBOb3RpZmljYXRpb25EYXRhXzEgPSByZXF1aXJlKFwiLi9Ob3RpZmljYXRpb25EYXRhXCIpO1xyXG5jbGFzcyBJT1Rlc3RpbmdCb2FyZCB7XHJcbiAgICBjb25zdHJ1Y3RvcihmblNlbmRBbmRSZXNwb25zZSwgYnRBcGkpIHtcclxuICAgICAgICB0aGlzLlNlbmRBbmRSZXNwb25zZSA9IGZuU2VuZEFuZFJlc3BvbnNlO1xyXG4gICAgICAgIHRoaXMuYnRTdGF0ZSA9IGJ0QXBpO1xyXG4gICAgfVxyXG4gICAgdWludFRvU3RyaW5nKGR2KSB7XHJcbiAgICAgICAgY29uc3QgdWludDhhcnIgPSBbXTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGR2LmJ5dGVMZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB1aW50OGFyci5wdXNoKGR2LmdldFVpbnQ4KGkpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgZW5jb2RlZFN0cmluZyA9IFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkobnVsbCwgdWludDhhcnIpO1xyXG4gICAgICAgIGNvbnN0IGRlY29kZWRTdHJpbmcgPSBkZWNvZGVVUklDb21wb25lbnQoZW5jb2RlZFN0cmluZyk7XHJcbiAgICAgICAgcmV0dXJuIGRlY29kZWRTdHJpbmc7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAgICogR2V0cyB0aGUgbWV0ZXIgc2VyaWFsIG51bWJlclxyXG4gICAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxyXG4gICAgICAgKi9cclxuICAgIGFzeW5jIGdldEhhcmR3YXJlUmV2aXNpb24oKSB7XHJcbiAgICAgICAgbG9nLmRlYnVnKCdcXHRcXHRSZWFkaW5nIEhXIHJldicpO1xyXG4gICAgICAgIGNvbnN0IGR2ID0gYXdhaXQgdGhpcy5idFN0YXRlLmNoYXJIV1Jldi5yZWFkVmFsdWUoKTtcclxuICAgICAgICByZXR1cm4gdGhpcy51aW50VG9TdHJpbmcoZHYpO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgICAqIEdldHMgdGhlIG1ldGVyIHNlcmlhbCBudW1iZXJcclxuICAgICAgICogQHJldHVybnMge3N0cmluZ31cclxuICAgICAgICovXHJcbiAgICBhc3luYyBnZXRGaXJtd2FyZSgpIHtcclxuICAgICAgICBsb2cuZGVidWcoJ1xcdFxcdFJlYWRpbmcgZmlybXdhcmUgdmVyc2lvbicpO1xyXG4gICAgICAgIGNvbnN0IGR2ID0gYXdhaXQgdGhpcy5idFN0YXRlLmNoYXJGaXJtd2FyZS5yZWFkVmFsdWUoKTtcclxuICAgICAgICByZXR1cm4gdGhpcy51aW50VG9TdHJpbmcoZHYpO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgICAqIEdldHMgdGhlIGJhdHRlcnkgbGV2ZWwgaW5kaWNhdGlvblxyXG4gICAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBwZXJjZW50YWdlICglKVxyXG4gICAgICAgKi9cclxuICAgIGFzeW5jIGdldEJhdHRlcnlMZXZlbCgpIHtcclxuICAgICAgICBsb2cuZGVidWcoJ1xcdFxcdFJlYWRpbmcgYmF0dGVyeSB2b2x0YWdlJyk7XHJcbiAgICAgICAgY29uc3QgZHYgPSBhd2FpdCB0aGlzLmJ0U3RhdGUuY2hhckJhdHRlcnkucmVhZFZhbHVlKCk7XHJcbiAgICAgICAgcmV0dXJuIGR2LmdldFVpbnQ4KDApO1xyXG4gICAgfVxyXG4gICAgc3RhdGljIHBhcnNlTm90aWZpY2F0aW9uKGJ1Zikge1xyXG4gICAgICAgIGlmIChidWYuYnl0ZUxlbmd0aCA8IDExKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBvdXRwdXQgPSBuZXcgTm90aWZpY2F0aW9uRGF0YV8xLk5vdGlmaWNhdGlvbkRhdGEoKTtcclxuICAgICAgICBjb25zdCBkdiA9IG5ldyBEYXRhVmlldyhidWYpO1xyXG4gICAgICAgIGNvbnN0IHN0YXR1czEgPSBkdi5nZXRVaW50OCgwKTtcclxuICAgICAgICBjb25zdCBzdGF0dXMyID0gZHYuZ2V0VWludDgoMSk7XHJcbiAgICAgICAgb3V0cHV0LldpRmkgPSAoc3RhdHVzMSA+PiA2KSAmIDM7XHJcbiAgICAgICAgb3V0cHV0LlJlbGF5ID0gKHN0YXR1czEgPj4gNCkgJiAzO1xyXG4gICAgICAgIG91dHB1dC5CbHVldG9vdGggPSAoc3RhdHVzMSA+PiAxKSAmIDc7XHJcbiAgICAgICAgb3V0cHV0LkVycm9yID0gKHN0YXR1czIgJiA2NCkgIT0gMDtcclxuICAgICAgICBvdXRwdXQuRnJlcXVlbmN5ID0gKHN0YXR1czIgPj4gNSkgJiAzO1xyXG4gICAgICAgIG91dHB1dC5WZXJib3NlID0gKHN0YXR1czIgJiA4KSAhPSAwO1xyXG4gICAgICAgIG91dHB1dC5UZXN0ID0gKHN0YXR1czIgJiA0KSAhPSAwO1xyXG4gICAgICAgIG91dHB1dC5WX3dpdGhfbG9hZCA9IChzdGF0dXMyICYgMikgIT0gMDtcclxuICAgICAgICBvdXRwdXQuTGFzdFJlc3VsdCA9IChzdGF0dXMyICYgMSkgIT0gMDtcclxuICAgICAgICBvdXRwdXQuQWN0dWFsX1IgPSBkdi5nZXRVaW50MTYoMiwgdHJ1ZSk7XHJcbiAgICAgICAgb3V0cHV0LlNldHBvaW50X1IgPSBkdi5nZXRVaW50MTYoNCwgdHJ1ZSk7XHJcbiAgICAgICAgb3V0cHV0Lk1lbWZyZWUgPSBkdi5nZXRVaW50MzIoNiwgdHJ1ZSk7XHJcbiAgICAgICAgb3V0cHV0LkNvbW1hbmRDcHQgPSBkdi5nZXRVaW50OCgxMCk7XHJcbiAgICAgICAgbG9nLmRlYnVnKCdEZWNvZGVkIG5vdGlmaWNhdGlvbicsIG91dHB1dCk7XHJcbiAgICAgICAgcmV0dXJuIG91dHB1dDtcclxuICAgIH1cclxuICAgIHN0YXRpYyBnZXRQYWNrZXQoY29tbWFuZCkge1xyXG4gICAgICAgIGxldCBidWY7XHJcbiAgICAgICAgbGV0IGR2O1xyXG4gICAgICAgIHN3aXRjaCAoY29tbWFuZC50eXBlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9CUkVBSzpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0RJU0FCTEVfV0VCUkVQTDpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0RJU0FCTEVfV0lGSTpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0VOQUJMRV9XRUJSRVBMOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfRU5BQkxFX1dJRkk6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9MSUdIVF9TTEVFUDpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX01PREVfTUVURVI6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9SRUJPT1Q6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9SRUZSRVNIOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfUlVOX1RFU1Q6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9SX1RFU1Q6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9ERUVQX1NMRUVQOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfQ0xFQVJfRkxBR1M6XHJcbiAgICAgICAgICAgICAgICAvLyBObyBwYXJhbWV0ZXJcclxuICAgICAgICAgICAgICAgIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcigxKTtcclxuICAgICAgICAgICAgICAgIGR2ID0gbmV3IERhdGFWaWV3KGJ1Zik7XHJcbiAgICAgICAgICAgICAgICBkdi5zZXRVaW50OCgwLCBjb21tYW5kLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ1ZjtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX0NPTkZJR1VSRV9NRVRFUl9DT01NOlxyXG4gICAgICAgICAgICAgICAgYnVmID0gbmV3IEFycmF5QnVmZmVyKDEgKyA1KTtcclxuICAgICAgICAgICAgICAgIGR2ID0gbmV3IERhdGFWaWV3KGJ1Zik7XHJcbiAgICAgICAgICAgICAgICBkdi5zZXRVaW50OCgwLCBjb21tYW5kLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgZHYuc2V0VWludDgoMSwgY29tbWFuZC5zZXRwb2ludCk7XHJcbiAgICAgICAgICAgICAgICBkdi5zZXRVaW50OCgyLCBjb21tYW5kLnNldHBvaW50Mik7XHJcbiAgICAgICAgICAgICAgICBkdi5zZXRVaW50OCgzLCBjb21tYW5kLnNldHBvaW50Myk7XHJcbiAgICAgICAgICAgICAgICBkdi5zZXRVaW50MTYoNCwgY29tbWFuZC5zZXRwb2ludDQsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ1ZjtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9DUFU6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfSU5JVElBTF9DT01NQU5EX1NFVFBPSU5UOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX0lOSVRJQUxfQ09NTUFORF9UWVBFOlxyXG4gICAgICAgICAgICAgICAgLy8gT25lIFVpbnQ4IHBhcmFtZXRlclxyXG4gICAgICAgICAgICAgICAgYnVmID0gbmV3IEFycmF5QnVmZmVyKDIpO1xyXG4gICAgICAgICAgICAgICAgZHYgPSBuZXcgRGF0YVZpZXcoYnVmKTtcclxuICAgICAgICAgICAgICAgIGR2LnNldFVpbnQ4KDAsIGNvbW1hbmQudHlwZSk7XHJcbiAgICAgICAgICAgICAgICBkdi5zZXRVaW50OCgxLCBjb21tYW5kLnNldHBvaW50KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBidWY7XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9NRVRFUl9DT01NQU5EUzpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9JTklUSUFMX0JMVUVUT09USDpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9JTklUSUFMX01FVEVSX0NPTU06XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfT1RBOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfU0VUX1ZFUkJPU0U6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfSU5JVElBTF9XSUZJOlxyXG4gICAgICAgICAgICAgICAgLy8gT25lIFVpbnQ4IHBhcmFtZXRlciB3aXRoIDEgb3IgMCB2YWx1ZVxyXG4gICAgICAgICAgICAgICAgYnVmID0gbmV3IEFycmF5QnVmZmVyKDIpO1xyXG4gICAgICAgICAgICAgICAgZHYgPSBuZXcgRGF0YVZpZXcoYnVmKTtcclxuICAgICAgICAgICAgICAgIGR2LnNldFVpbnQ4KDAsIGNvbW1hbmQudHlwZSk7XHJcbiAgICAgICAgICAgICAgICBkdi5zZXRVaW50OCgxLCBjb21tYW5kLnNldHBvaW50ID8gMSA6IDApO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ1ZjtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX01PREVfUkVTSVNUT1JTOlxyXG4gICAgICAgICAgICBjYXNlIGNvbnN0YW50c18xLkNvbW1hbmRUeXBlLkNPTU1BTkRfTU9ERV9WX0xPQUQ6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfREVFUFNMRUVQX01JTjpcclxuICAgICAgICAgICAgICAgIC8vIE9uZSBVaW50MTYgUiBwYXJhbWV0ZXJcclxuICAgICAgICAgICAgICAgIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcigzKTtcclxuICAgICAgICAgICAgICAgIGR2ID0gbmV3IERhdGFWaWV3KGJ1Zik7XHJcbiAgICAgICAgICAgICAgICBkdi5zZXRVaW50OCgwLCBjb21tYW5kLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgZHYuc2V0VWludDE2KDEsIGNvbW1hbmQuc2V0cG9pbnQsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ1ZjtcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9CTFVFVE9PVEhfTkFNRTpcclxuICAgICAgICAgICAgY2FzZSBjb25zdGFudHNfMS5Db21tYW5kVHlwZS5DT01NQU5EX1NFVF9XSUZJX05FVFdPUks6XHJcbiAgICAgICAgICAgIGNhc2UgY29uc3RhbnRzXzEuQ29tbWFuZFR5cGUuQ09NTUFORF9TRVRfV0lGSV9QQVNTV09SRDpcclxuICAgICAgICAgICAgICAgIC8vIE9uZSBVVEY4IHN0cmluZyBwYXJhbWV0ZXJcclxuICAgICAgICAgICAgICAgIGNvbnN0IHV0ZjhFbmNvZGUgPSBuZXcgVGV4dEVuY29kZXIoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGJ5dGVzX3V0ZjggPSB1dGY4RW5jb2RlLmVuY29kZShjb21tYW5kLnNldHBvaW50KTtcclxuICAgICAgICAgICAgICAgIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcigxICsgYnl0ZXNfdXRmOC5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgZHYgPSBuZXcgRGF0YVZpZXcoYnVmKTtcclxuICAgICAgICAgICAgICAgIGR2LnNldFVpbnQ4KDAsIGNvbW1hbmQudHlwZSk7XHJcbiAgICAgICAgICAgICAgICB2YXIgYnl0ZV9udW0gPSAxO1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBieXRlX3Ygb2YgYnl0ZXNfdXRmOCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGR2LnNldFVpbnQ4KGJ5dGVfbnVtLCBieXRlX3YpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJ5dGVfbnVtKys7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYnVmO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvbW1hbmQnICsgY29tbWFuZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuSU9UZXN0aW5nQm9hcmQgPSBJT1Rlc3RpbmdCb2FyZDtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9SU9UZXN0aW5nQm9hcmQuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZXhwb3J0cy5NZXRlclN0YXRlID0gdm9pZCAwO1xyXG5jb25zdCBjb25zdGFudHNfMSA9IHJlcXVpcmUoXCIuL2NvbnN0YW50c1wiKTtcclxuLyoqXHJcbiAqIEN1cnJlbnQgc3RhdGUgb2YgdGhlIG1ldGVyXHJcbiAqICovXHJcbmNsYXNzIE1ldGVyU3RhdGUge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgdGhpcy5maXJtd2FyZSA9ICc/Pz8nOyAvLyBGaXJtd2FyZSB2ZXJzaW9uXHJcbiAgICAgICAgdGhpcy5od19yZXYgPSAnPz8/JzsgLy8gU2VyaWFsIG51bWJlclxyXG4gICAgICAgIHRoaXMubW9kZSA9IGNvbnN0YW50c18xLkJvYXJkTW9kZS5NT0RFX1VOREVGSU5FRDtcclxuICAgICAgICB0aGlzLnNldHBvaW50ID0gMHhGRkZGO1xyXG4gICAgICAgIHRoaXMuYWN0dWFsID0gMHhGRkZGO1xyXG4gICAgICAgIHRoaXMuZnJlZV9ieXRlcyA9IDA7XHJcbiAgICAgICAgdGhpcy5iYXR0ZXJ5ID0gMDtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLk1ldGVyU3RhdGUgPSBNZXRlclN0YXRlO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1NZXRlclN0YXRlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuTm90aWZpY2F0aW9uRGF0YSA9IHZvaWQgMDtcclxuLy8gTXVzdCBtYXRjaCB3aXRoIF9fZ2V0X25vdGlmaWNhdGlvbl9kYXRhIGluIGJvYXJkYnQucHkgZmlybXdhcmUgY29kZS5cclxuY2xhc3MgTm90aWZpY2F0aW9uRGF0YSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLldpRmkgPSAwO1xyXG4gICAgICAgIHRoaXMuUmVsYXkgPSAwO1xyXG4gICAgICAgIHRoaXMuQmx1ZXRvb3RoID0gMDtcclxuICAgICAgICB0aGlzLkZyZXF1ZW5jeSA9IDA7XHJcbiAgICAgICAgdGhpcy5WZXJib3NlID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5UZXN0ID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5WX3dpdGhfbG9hZCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuTGFzdFJlc3VsdCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuQWN0dWFsX1IgPSAwO1xyXG4gICAgICAgIHRoaXMuU2V0cG9pbnRfUiA9IDA7XHJcbiAgICAgICAgdGhpcy5NZW1mcmVlID0gMDtcclxuICAgICAgICB0aGlzLkVycm9yID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5Db21tYW5kQ3B0ID0gMDtcclxuICAgICAgICB0aGlzLlRpbWVzdGFtcCA9IG5ldyBEYXRlKCk7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5Ob3RpZmljYXRpb25EYXRhID0gTm90aWZpY2F0aW9uRGF0YTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Tm90aWZpY2F0aW9uRGF0YS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLkJsdWVUb290aElPVFVVSUQgPSBleHBvcnRzLk1BWF9VX0dFTiA9IGV4cG9ydHMuUmVzdWx0Q29kZSA9IGV4cG9ydHMuU3RhdGUgPSBleHBvcnRzLlJlbGF5UG9zaXRpb24gPSBleHBvcnRzLkJvYXJkTW9kZSA9IGV4cG9ydHMuQ29tbWFuZFR5cGUgPSB2b2lkIDA7XHJcbi8qKlxyXG4gKiBDb21tYW5kcyByZWNvZ25pemVkIGJ5IElPVGVzdGluZyBCb2FyZCBtb2R1bGVcclxuICogKi9cclxuZXhwb3J0cy5Db21tYW5kVHlwZSA9IHtcclxuICAgIE5PTkVfVU5LTk9XTjogMCxcclxuICAgIENPTU1BTkRfRU5BQkxFX1dJRkk6IDB4MDEsXHJcbiAgICBDT01NQU5EX0RJU0FCTEVfV0lGSTogMHgwMixcclxuICAgIENPTU1BTkRfRU5BQkxFX1dFQlJFUEw6IDB4MDMsXHJcbiAgICBDT01NQU5EX0RJU0FCTEVfV0VCUkVQTDogMHgwNCxcclxuICAgIENPTU1BTkRfQlJFQUs6IDB4MDUsXHJcbiAgICBDT01NQU5EX01PREVfTUVURVI6IDB4MDYsXHJcbiAgICBDT01NQU5EX01PREVfUkVTSVNUT1JTOiAweDA3LFxyXG4gICAgQ09NTUFORF9NT0RFX1ZfTE9BRDogMHgwOCxcclxuICAgIENPTU1BTkRfUkVCT09UOiAweDA5LFxyXG4gICAgQ09NTUFORF9SVU5fVEVTVDogMHgwQSxcclxuICAgIENPTU1BTkRfTElHSFRfU0xFRVA6IDB4MEIsXHJcbiAgICBDT01NQU5EX0RFRVBfU0xFRVA6IDB4MEMsXHJcbiAgICBDT01NQU5EX01FVEVSX0NPTU1BTkRTOiAweDBELFxyXG4gICAgQ09NTUFORF9TRVRfSU5JVElBTF9NRVRFUl9DT01NOiAweDBFLFxyXG4gICAgQ09NTUFORF9TRVRfV0lGSV9ORVRXT1JLOiAweDBGLFxyXG4gICAgQ09NTUFORF9TRVRfV0lGSV9QQVNTV09SRDogMHgxMCxcclxuICAgIENPTU1BTkRfU0VUX0lOSVRJQUxfQkxVRVRPT1RIOiAweDExLFxyXG4gICAgQ09NTUFORF9TRVRfSU5JVElBTF9XSUZJOiAweDEyLFxyXG4gICAgQ09NTUFORF9TRVRfREVFUFNMRUVQX01JTjogMHgxMyxcclxuICAgIENPTU1BTkRfU0VUX1ZFUkJPU0U6IDB4MTQsXHJcbiAgICBDT01NQU5EX1NFVF9JTklUSUFMX0NPTU1BTkRfVFlQRTogMHgxNSxcclxuICAgIENPTU1BTkRfU0VUX0lOSVRJQUxfQ09NTUFORF9TRVRQT0lOVDogMHgxNixcclxuICAgIENPTU1BTkRfUl9URVNUOiAweDE3LFxyXG4gICAgQ09NTUFORF9TRVRfQ1BVOiAweDE4LFxyXG4gICAgQ09NTUFORF9TRVRfT1RBOiAweDE5LFxyXG4gICAgQ09NTUFORF9DT05GSUdVUkVfTUVURVJfQ09NTTogMHgyMCxcclxuICAgIENPTU1BTkRfU0VUX0JMVUVUT09USF9OQU1FOiAweDIxLFxyXG4gICAgQ09NTUFORF9SRUZSRVNIOiAweDIyLFxyXG4gICAgQ09NTUFORF9DTEVBUl9GTEFHUzogMHgyM1xyXG59O1xyXG5leHBvcnRzLkJvYXJkTW9kZSA9IHtcclxuICAgIE1PREVfVU5ERUZJTkVEOiAwLFxyXG4gICAgTU9ERV9NRVRFUjogMSxcclxuICAgIE1PREVfUkVTSVNUT1I6IDIsXHJcbiAgICBNT0RFX1ZfV0lUSF9MT0FEOiAzLFxyXG4gICAgTU9ERV9URVNUOiA0XHJcbn07XHJcbmV4cG9ydHMuUmVsYXlQb3NpdGlvbiA9IHtcclxuICAgIFBPU19VTktOT1dOOiAwLFxyXG4gICAgUE9TX01FVEVSOiAxLFxyXG4gICAgUE9TX1JFU0lTVE9SOiAyXHJcbn07XHJcbi8qXHJcbiAqIEludGVybmFsIHN0YXRlIG1hY2hpbmUgZGVzY3JpcHRpb25zXHJcbiAqL1xyXG5leHBvcnRzLlN0YXRlID0ge1xyXG4gICAgTk9UX0NPTk5FQ1RFRDogJ05vdCBjb25uZWN0ZWQnLFxyXG4gICAgQ09OTkVDVElORzogJ0JsdWV0b290aCBkZXZpY2UgcGFpcmluZy4uLicsXHJcbiAgICBERVZJQ0VfUEFJUkVEOiAnRGV2aWNlIHBhaXJlZCcsXHJcbiAgICBTVUJTQ1JJQklORzogJ0JsdWV0b290aCBpbnRlcmZhY2VzIGNvbm5lY3RpbmcuLi4nLFxyXG4gICAgSURMRTogJ0lkbGUnLFxyXG4gICAgQlVTWTogJ0J1c3knLFxyXG4gICAgRVJST1I6ICdFcnJvcicsXHJcbiAgICBTVE9QUElORzogJ0Nsb3NpbmcgQlQgaW50ZXJmYWNlcy4uLicsXHJcbiAgICBTVE9QUEVEOiAnU3RvcHBlZCcsXHJcbiAgICBNRVRFUl9JTklUOiAnTWV0ZXIgY29ubmVjdGVkJyxcclxuICAgIE1FVEVSX0lOSVRJQUxJWklORzogJ1JlYWRpbmcgYm9hcmQgc3RhdGUuLi4nXHJcbn07XHJcbmV4cG9ydHMuUmVzdWx0Q29kZSA9IHtcclxuICAgIEZBSUxFRF9OT19SRVRSWTogMSxcclxuICAgIEZBSUxFRF9TSE9VTERfUkVUUlk6IDIsXHJcbiAgICBTVUNDRVNTOiAwXHJcbn07XHJcbmV4cG9ydHMuTUFYX1VfR0VOID0gMjcuMDsgLy8gbWF4aW11bSB2b2x0YWdlXHJcbi8qXHJcbiAqIEJsdWV0b290aCBjb25zdGFudHNcclxuICovXHJcbmV4cG9ydHMuQmx1ZVRvb3RoSU9UVVVJRCA9IHtcclxuICAgIFNlcnZpY2VVdWlkOiAnMDAwM2NkZDUtMDAwMC0xMDAwLTgwMDAtMDA4MDVmOWIwMTMxJyxcclxuICAgIFN0YXR1c0NoYXJVdWlkOiAnMDAwM2NkZDMtMDAwMC0xMDAwLTgwMDAtMDA4MDVmOWIwMTMxJyxcclxuICAgIENvbW1hbmRDaGFyVXVpZDogJzAwMDNjZGQ0LTAwMDAtMTAwMC04MDAwLTAwODA1ZjliMDEzMScgLy8gY29tbWFuZHMgdG8gdGhlIGJvYXJkXHJcbn07XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNvbnN0YW50cy5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLkJvYXJkTW9kZSA9IGV4cG9ydHMuU3RhdGUgPSBleHBvcnRzLnNldExldmVsID0gZXhwb3J0cy5Db21tYW5kVHlwZSA9IGV4cG9ydHMuQ29tbWFuZCA9IGV4cG9ydHMuZHJpdmVyID0gZXhwb3J0cy5TaW1wbGVFeGVjdXRlSlNPTiA9IGV4cG9ydHMuRXhlY3V0ZUpTT04gPSBleHBvcnRzLkdldFN0YXRlSlNPTiA9IGV4cG9ydHMuR2V0U3RhdGUgPSBleHBvcnRzLlNpbXBsZUV4ZWN1dGUgPSBleHBvcnRzLkV4ZWN1dGUgPSBleHBvcnRzLlBhaXIgPSBleHBvcnRzLlN0b3AgPSB2b2lkIDA7XHJcbmNvbnN0IGNvbnN0YW50c18xID0gcmVxdWlyZShcIi4vY29uc3RhbnRzXCIpO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJTdGF0ZVwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gY29uc3RhbnRzXzEuU3RhdGU7IH0gfSk7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIkNvbW1hbmRUeXBlXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBjb25zdGFudHNfMS5Db21tYW5kVHlwZTsgfSB9KTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiQm9hcmRNb2RlXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBjb25zdGFudHNfMS5Cb2FyZE1vZGU7IH0gfSk7XHJcbmNvbnN0IENvbW1hbmRfMSA9IHJlcXVpcmUoXCIuL0NvbW1hbmRcIik7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIkNvbW1hbmRcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIENvbW1hbmRfMS5Db21tYW5kOyB9IH0pO1xyXG5jb25zdCBsb2dsZXZlbF8xID0gcmVxdWlyZShcImxvZ2xldmVsXCIpO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJzZXRMZXZlbFwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gbG9nbGV2ZWxfMS5zZXRMZXZlbDsgfSB9KTtcclxuY29uc3QgbWV0ZXJQdWJsaWNBUElfMSA9IHJlcXVpcmUoXCIuL21ldGVyUHVibGljQVBJXCIpO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJTdG9wXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBtZXRlclB1YmxpY0FQSV8xLlN0b3A7IH0gfSk7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIlBhaXJcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIG1ldGVyUHVibGljQVBJXzEuUGFpcjsgfSB9KTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiRXhlY3V0ZVwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gbWV0ZXJQdWJsaWNBUElfMS5FeGVjdXRlOyB9IH0pO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJTaW1wbGVFeGVjdXRlXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBtZXRlclB1YmxpY0FQSV8xLlNpbXBsZUV4ZWN1dGU7IH0gfSk7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIkdldFN0YXRlXCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBtZXRlclB1YmxpY0FQSV8xLkdldFN0YXRlOyB9IH0pO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJHZXRTdGF0ZUpTT05cIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIG1ldGVyUHVibGljQVBJXzEuR2V0U3RhdGVKU09OOyB9IH0pO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJFeGVjdXRlSlNPTlwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gbWV0ZXJQdWJsaWNBUElfMS5FeGVjdXRlSlNPTjsgfSB9KTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiU2ltcGxlRXhlY3V0ZUpTT05cIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIG1ldGVyUHVibGljQVBJXzEuU2ltcGxlRXhlY3V0ZUpTT047IH0gfSk7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcImRyaXZlclwiLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gbWV0ZXJQdWJsaWNBUElfMS5kcml2ZXI7IH0gfSk7XHJcbi8vIERlZmluZXMgZGVmYXVsdCBsZXZlbCBvbiBzdGFydHVwXHJcbigwLCBsb2dsZXZlbF8xLnNldExldmVsKShsb2dsZXZlbF8xLmxldmVscy5FUlJPUiwgdHJ1ZSk7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1ldGVyQXBpLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG4vKlxyXG4gKiBUaGlzIGZpbGUgY29udGFpbnMgdGhlIHB1YmxpYyBBUEkgb2YgdGhlIG1ldGVyLCBpLmUuIHRoZSBmdW5jdGlvbnMgZGVzaWduZWRcclxuICogdG8gYmUgY2FsbGVkIGZyb20gdGhpcmQgcGFydHkgY29kZS5cclxuICogMS0gUGFpcigpIDogYm9vbFxyXG4gKiAyLSBFeGVjdXRlKENvbW1hbmQpIDogYm9vbCArIEpTT04gdmVyc2lvblxyXG4gKiAzLSBTdG9wKCkgOiBib29sXHJcbiAqIDQtIEdldFN0YXRlKCkgOiBhcnJheSArIEpTT04gdmVyc2lvblxyXG4gKiA1LSBTaW1wbGVFeGVjdXRlKENvbW1hbmQpIDogcmV0dXJucyB0aGUgdXBkYXRlZCBtZWFzdXJlbWVudCBvciBudWxsXHJcbiAqL1xyXG52YXIgX19pbXBvcnREZWZhdWx0ID0gKHRoaXMgJiYgdGhpcy5fX2ltcG9ydERlZmF1bHQpIHx8IGZ1bmN0aW9uIChtb2QpIHtcclxuICAgIHJldHVybiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSA/IG1vZCA6IHsgXCJkZWZhdWx0XCI6IG1vZCB9O1xyXG59O1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmV4cG9ydHMuU3RvcCA9IGV4cG9ydHMuUGFpciA9IGV4cG9ydHMuRXhlY3V0ZSA9IGV4cG9ydHMuU2ltcGxlRXhlY3V0ZSA9IGV4cG9ydHMuU2ltcGxlRXhlY3V0ZUpTT04gPSBleHBvcnRzLkV4ZWN1dGVKU09OID0gZXhwb3J0cy5HZXRTdGF0ZUpTT04gPSBleHBvcnRzLkdldFN0YXRlID0gZXhwb3J0cy5kcml2ZXIgPSB2b2lkIDA7XHJcbmNvbnN0IERyaXZlcl8xID0gcmVxdWlyZShcIi4vRHJpdmVyXCIpO1xyXG5jb25zdCBDb21tYW5kUmVzdWx0XzEgPSByZXF1aXJlKFwiLi9Db21tYW5kUmVzdWx0XCIpO1xyXG5jb25zdCBDb21tYW5kXzEgPSByZXF1aXJlKFwiLi9Db21tYW5kXCIpO1xyXG5jb25zdCBjb25zdGFudHNfMSA9IHJlcXVpcmUoXCIuL2NvbnN0YW50c1wiKTtcclxuY29uc3QgdXRpbHNfMSA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpO1xyXG5jb25zdCBsb2dsZXZlbF8xID0gX19pbXBvcnREZWZhdWx0KHJlcXVpcmUoXCJsb2dsZXZlbFwiKSk7XHJcbi8vIFVzZWZ1bCBpbmZvcm1hdGlvbiBmb3IgZGVidWdnaW5nLCBldmVuIGlmIGl0IHNob3VsZCBub3QgYmUgZXhwb3NlZFxyXG5leHBvcnRzLmRyaXZlciA9IG5ldyBEcml2ZXJfMS5Ecml2ZXIoKTtcclxuLyoqXHJcbiAqIFJldHVybnMgYSBjb3B5IG9mIHRoZSBjdXJyZW50IHN0YXRlXHJcbiAqIEByZXR1cm5zIHthcnJheX0gc3RhdHVzIG9mIG1ldGVyXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBHZXRTdGF0ZSgpIHtcclxuICAgIGxldCByZWFkeSA9IGZhbHNlO1xyXG4gICAgbGV0IGluaXRpYWxpemluZyA9IGZhbHNlO1xyXG4gICAgc3dpdGNoIChleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXRlKSB7XHJcbiAgICAgICAgLy8gU3RhdGVzIHJlcXVpcmluZyB1c2VyIGlucHV0XHJcbiAgICAgICAgY2FzZSBjb25zdGFudHNfMS5TdGF0ZS5FUlJPUjpcclxuICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLlNUT1BQRUQ6XHJcbiAgICAgICAgY2FzZSBjb25zdGFudHNfMS5TdGF0ZS5OT1RfQ09OTkVDVEVEOlxyXG4gICAgICAgICAgICByZWFkeSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBpbml0aWFsaXppbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBjb25zdGFudHNfMS5TdGF0ZS5CVVNZOlxyXG4gICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuSURMRTpcclxuICAgICAgICAgICAgcmVhZHkgPSB0cnVlO1xyXG4gICAgICAgICAgICBpbml0aWFsaXppbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBjb25zdGFudHNfMS5TdGF0ZS5DT05ORUNUSU5HOlxyXG4gICAgICAgIGNhc2UgY29uc3RhbnRzXzEuU3RhdGUuREVWSUNFX1BBSVJFRDpcclxuICAgICAgICBjYXNlIGNvbnN0YW50c18xLlN0YXRlLk1FVEVSX0lOSVQ6XHJcbiAgICAgICAgY2FzZSBjb25zdGFudHNfMS5TdGF0ZS5NRVRFUl9JTklUSUFMSVpJTkc6XHJcbiAgICAgICAgY2FzZSBjb25zdGFudHNfMS5TdGF0ZS5TVUJTQ1JJQklORzpcclxuICAgICAgICAgICAgaW5pdGlhbGl6aW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgcmVhZHkgPSBmYWxzZTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgcmVhZHkgPSBmYWxzZTtcclxuICAgICAgICAgICAgaW5pdGlhbGl6aW5nID0gZmFsc2U7XHJcbiAgICB9XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGxhc3RTZXRwb2ludDogZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5sYXN0TWVhc3VyZS5TZXRwb2ludF9SLFxyXG4gICAgICAgIGxhc3RNZWFzdXJlOiBleHBvcnRzLmRyaXZlci5idFN0YXRlLmxhc3RNZWFzdXJlLkFjdHVhbF9SLFxyXG4gICAgICAgIGRldmljZU5hbWU6IGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuYnREZXZpY2UgPyBleHBvcnRzLmRyaXZlci5idFN0YXRlLmJ0RGV2aWNlLm5hbWUgOiAnJyxcclxuICAgICAgICBkZXZpY2VTZXJpYWw6ICcnLFxyXG4gICAgICAgIGRldmljZUh3UmV2OiBleHBvcnRzLmRyaXZlci5idFN0YXRlLm1ldGVyPy5od19yZXYsXHJcbiAgICAgICAgZGV2aWNlTW9kZTogZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5tZXRlcj8ubW9kZSxcclxuICAgICAgICBzdGF0dXM6IGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhdGUsXHJcbiAgICAgICAgYmF0dGVyeUxldmVsOiBleHBvcnRzLmRyaXZlci5idFN0YXRlLm1ldGVyPy5iYXR0ZXJ5LFxyXG4gICAgICAgIGZpcm13YXJlOiBleHBvcnRzLmRyaXZlci5idFN0YXRlLm1ldGVyPy5maXJtd2FyZSxcclxuICAgICAgICByZWFkeSxcclxuICAgICAgICBpbml0aWFsaXppbmcsXHJcbiAgICAgICAgc3RhdHM6IGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhdHNcclxuICAgIH07XHJcbn1cclxuZXhwb3J0cy5HZXRTdGF0ZSA9IEdldFN0YXRlO1xyXG4vKipcclxuICogUHJvdmlkZWQgZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBCbGF6b3JcclxuICogQHJldHVybnMge3N0cmluZ30gSlNPTiBzdGF0ZSBvYmplY3RcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIEdldFN0YXRlSlNPTigpIHtcclxuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhd2FpdCBHZXRTdGF0ZSgpKTtcclxufVxyXG5leHBvcnRzLkdldFN0YXRlSlNPTiA9IEdldFN0YXRlSlNPTjtcclxuLyoqXHJcbiAqIEV4ZWN1dGUgY29tbWFuZCB3aXRoIHNldHBvaW50cywgSlNPTiB2ZXJzaW9uXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBqc29uQ29tbWFuZCB0aGUgY29tbWFuZCB0byBleGVjdXRlXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEpTT04gY29tbWFuZCBvYmplY3RcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIEV4ZWN1dGVKU09OKGpzb25Db21tYW5kKSB7XHJcbiAgICBjb25zdCBjb21tYW5kID0gSlNPTi5wYXJzZShqc29uQ29tbWFuZCk7XHJcbiAgICAvLyBkZXNlcmlhbGl6ZWQgb2JqZWN0IGhhcyBsb3N0IGl0cyBtZXRob2RzLCBsZXQncyByZWNyZWF0ZSBhIGNvbXBsZXRlIG9uZS5cclxuICAgIGNvbnN0IGNvbW1hbmQyID0gQ29tbWFuZF8xLkNvbW1hbmQuQ3JlYXRlRm91clNQKGNvbW1hbmQudHlwZSwgY29tbWFuZC5zZXRwb2ludCwgY29tbWFuZC5zZXRwb2ludDIsIGNvbW1hbmQuc2V0cG9pbnQzLCBjb21tYW5kLnNldHBvaW50NCk7XHJcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXdhaXQgRXhlY3V0ZShjb21tYW5kMikpO1xyXG59XHJcbmV4cG9ydHMuRXhlY3V0ZUpTT04gPSBFeGVjdXRlSlNPTjtcclxuYXN5bmMgZnVuY3Rpb24gU2ltcGxlRXhlY3V0ZUpTT04oanNvbkNvbW1hbmQpIHtcclxuICAgIGNvbnN0IGNvbW1hbmQgPSBKU09OLnBhcnNlKGpzb25Db21tYW5kKTtcclxuICAgIC8vIGRlc2VyaWFsaXplZCBvYmplY3QgaGFzIGxvc3QgaXRzIG1ldGhvZHMsIGxldCdzIHJlY3JlYXRlIGEgY29tcGxldGUgb25lLlxyXG4gICAgY29uc3QgY29tbWFuZDIgPSBDb21tYW5kXzEuQ29tbWFuZC5DcmVhdGVGb3VyU1AoY29tbWFuZC50eXBlLCBjb21tYW5kLnNldHBvaW50LCBjb21tYW5kLnNldHBvaW50MiwgY29tbWFuZC5zZXRwb2ludDMsIGNvbW1hbmQuc2V0cG9pbnQ0KTtcclxuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhd2FpdCBTaW1wbGVFeGVjdXRlKGNvbW1hbmQyKSk7XHJcbn1cclxuZXhwb3J0cy5TaW1wbGVFeGVjdXRlSlNPTiA9IFNpbXBsZUV4ZWN1dGVKU09OO1xyXG4vKipcclxuICogRXhlY3V0ZSBhIGNvbW1hbmQgYW5kIHJldHVybnMgdGhlIG1lYXN1cmVtZW50IG9yIHNldHBvaW50IHdpdGggZXJyb3IgZmxhZyBhbmQgbWVzc2FnZVxyXG4gKiBAcGFyYW0ge0NvbW1hbmR9IGNvbW1hbmRcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIFNpbXBsZUV4ZWN1dGUoY29tbWFuZCkge1xyXG4gICAgY29uc3QgU0lNUExFX0VYRUNVVEVfVElNRU9VVF9TID0gNTtcclxuICAgIGNvbnN0IGNyID0gbmV3IENvbW1hbmRSZXN1bHRfMS5Db21tYW5kUmVzdWx0KCk7XHJcbiAgICBsb2dsZXZlbF8xLmRlZmF1bHQuaW5mbygnU2ltcGxlRXhlY3V0ZSBjYWxsZWQuLi4nKTtcclxuICAgIGlmIChjb21tYW5kID09PSBudWxsKSB7XHJcbiAgICAgICAgY3Iuc3VjY2VzcyA9IGZhbHNlO1xyXG4gICAgICAgIGNyLm1lc3NhZ2UgPSAnSW52YWxpZCBjb21tYW5kJztcclxuICAgICAgICByZXR1cm4gY3I7XHJcbiAgICB9XHJcbiAgICAvLyBSZWNyZWF0ZSB0aGUgb2JqZWN0IGFzIGl0IG1heSBoYXZlIGxvc3QgbWV0aG9kcyBkdWUgdG8gSlNPTlxyXG4gICAgY29tbWFuZCA9IENvbW1hbmRfMS5Db21tYW5kLkNyZWF0ZUZvdXJTUChjb21tYW5kLnR5cGUsIGNvbW1hbmQuc2V0cG9pbnQsIGNvbW1hbmQuc2V0cG9pbnQyLCBjb21tYW5kLnNldHBvaW50MywgY29tbWFuZC5zZXRwb2ludDQpO1xyXG4gICAgY29tbWFuZC5wZW5kaW5nID0gdHJ1ZTsgLy8gSW4gY2FzZSBjYWxsZXIgZG9lcyBub3Qgc2V0IHBlbmRpbmcgZmxhZ1xyXG4gICAgLy8gRmFpbCBpbW1lZGlhdGVseSBpZiBub3QgcGFpcmVkLlxyXG4gICAgaWYgKCFleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXJ0ZWQpIHtcclxuICAgICAgICBjci5zdWNjZXNzID0gZmFsc2U7XHJcbiAgICAgICAgY3IubWVzc2FnZSA9ICdEZXZpY2UgaXMgbm90IHBhaXJlZCc7XHJcbiAgICAgICAgbG9nbGV2ZWxfMS5kZWZhdWx0Lndhcm4oY3IubWVzc2FnZSk7XHJcbiAgICAgICAgcmV0dXJuIGNyO1xyXG4gICAgfVxyXG4gICAgLy8gQW5vdGhlciBjb21tYW5kIG1heSBiZSBwZW5kaW5nLlxyXG4gICAgaWYgKGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuY29tbWFuZCAhPSBudWxsICYmIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuY29tbWFuZC5wZW5kaW5nKSB7XHJcbiAgICAgICAgY3Iuc3VjY2VzcyA9IGZhbHNlO1xyXG4gICAgICAgIGNyLm1lc3NhZ2UgPSAnQW5vdGhlciBjb21tYW5kIGlzIHBlbmRpbmcnO1xyXG4gICAgICAgIGxvZ2xldmVsXzEuZGVmYXVsdC53YXJuKGNyLm1lc3NhZ2UpO1xyXG4gICAgICAgIHJldHVybiBjcjtcclxuICAgIH1cclxuICAgIC8vIFdhaXQgZm9yIGNvbXBsZXRpb24gb2YgdGhlIGNvbW1hbmQsIG9yIGhhbHQgb2YgdGhlIHN0YXRlIG1hY2hpbmVcclxuICAgIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuY29tbWFuZCA9IGNvbW1hbmQ7XHJcbiAgICBpZiAoY29tbWFuZCAhPSBudWxsKSB7XHJcbiAgICAgICAgYXdhaXQgKDAsIHV0aWxzXzEud2FpdEZvclRpbWVvdXQpKCgpID0+ICFjb21tYW5kLnBlbmRpbmcgfHwgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGF0ZSA9PSBjb25zdGFudHNfMS5TdGF0ZS5TVE9QUEVELCBTSU1QTEVfRVhFQ1VURV9USU1FT1VUX1MpO1xyXG4gICAgfVxyXG4gICAgLy8gQ2hlY2sgaWYgZXJyb3Igb3IgdGltZW91dHNcclxuICAgIGlmIChjb21tYW5kLmVycm9yIHx8IGNvbW1hbmQucGVuZGluZykge1xyXG4gICAgICAgIGNyLnN1Y2Nlc3MgPSBmYWxzZTtcclxuICAgICAgICBjci5tZXNzYWdlID0gJ0Vycm9yIHdoaWxlIGV4ZWN1dGluZyB0aGUgY29tbWFuZC4nO1xyXG4gICAgICAgIGxvZ2xldmVsXzEuZGVmYXVsdC53YXJuKGNyLm1lc3NhZ2UpO1xyXG4gICAgICAgIC8vIFJlc2V0IHRoZSBhY3RpdmUgY29tbWFuZFxyXG4gICAgICAgIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuY29tbWFuZCA9IG51bGw7XHJcbiAgICAgICAgcmV0dXJuIGNyO1xyXG4gICAgfVxyXG4gICAgLy8gU3RhdGUgaXMgdXBkYXRlZCBieSBleGVjdXRlIGNvbW1hbmQsIHNvIHdlIGNhbiB1c2UgYnRTdGF0ZSByaWdodCBhd2F5XHJcbiAgICBjci52YWx1ZSA9IGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUubGFzdE1lYXN1cmUuU2V0cG9pbnRfUjtcclxuICAgIGNyLnVuaXQgPSAnT2htcyc7XHJcbiAgICBjci5zZWNvbmRhcnlfdmFsdWUgPSBleHBvcnRzLmRyaXZlci5idFN0YXRlLmxhc3RNZWFzdXJlLkFjdHVhbF9SO1xyXG4gICAgY3Iuc2Vjb25kYXJ5X3VuaXQgPSAnT2htcyc7XHJcbiAgICBjci5zdWNjZXNzID0gdHJ1ZTtcclxuICAgIGNyLm1lc3NhZ2UgPSAnQ29tbWFuZCBleGVjdXRlZCBzdWNjZXNzZnVsbHknO1xyXG4gICAgcmV0dXJuIGNyO1xyXG59XHJcbmV4cG9ydHMuU2ltcGxlRXhlY3V0ZSA9IFNpbXBsZUV4ZWN1dGU7XHJcbi8qKlxyXG4gKiBFeHRlcm5hbCBpbnRlcmZhY2UgdG8gcmVxdWlyZSBhIGNvbW1hbmQgdG8gYmUgZXhlY3V0ZWQuXHJcbiAqIFRoZSBibHVldG9vdGggZGV2aWNlIHBhaXJpbmcgd2luZG93IHdpbGwgb3BlbiBpZiBkZXZpY2UgaXMgbm90IGNvbm5lY3RlZC5cclxuICogVGhpcyBtYXkgZmFpbCBpZiBjYWxsZWQgb3V0c2lkZSBhIHVzZXIgZ2VzdHVyZS5cclxuICogQHBhcmFtIHtDb21tYW5kfSBjb21tYW5kXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBFeGVjdXRlKGNvbW1hbmQpIHtcclxuICAgIGxvZ2xldmVsXzEuZGVmYXVsdC5pbmZvKCdFeGVjdXRlIGNhbGxlZC4uLicpO1xyXG4gICAgaWYgKGNvbW1hbmQgPT0gbnVsbCkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgY29tbWFuZCA9IENvbW1hbmRfMS5Db21tYW5kLkNyZWF0ZUZvdXJTUChjb21tYW5kLnR5cGUsIGNvbW1hbmQuc2V0cG9pbnQsIGNvbW1hbmQuc2V0cG9pbnQyLCBjb21tYW5kLnNldHBvaW50MywgY29tbWFuZC5zZXRwb2ludDQpO1xyXG4gICAgY29tbWFuZC5wZW5kaW5nID0gdHJ1ZTtcclxuICAgIGxldCBjcHQgPSAwO1xyXG4gICAgd2hpbGUgKGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuY29tbWFuZCAhPSBudWxsICYmIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuY29tbWFuZC5wZW5kaW5nICYmIGNwdCA8IDMwMCkge1xyXG4gICAgICAgIGxvZ2xldmVsXzEuZGVmYXVsdC5kZWJ1ZygnV2FpdGluZyBmb3IgY3VycmVudCBjb21tYW5kIHRvIGNvbXBsZXRlLi4uJyk7XHJcbiAgICAgICAgYXdhaXQgKDAsIHV0aWxzXzEuc2xlZXApKDEwMCk7XHJcbiAgICAgICAgY3B0Kys7XHJcbiAgICB9XHJcbiAgICBsb2dsZXZlbF8xLmRlZmF1bHQuaW5mbygnU2V0dGluZyBuZXcgY29tbWFuZCA6JyArIGNvbW1hbmQpO1xyXG4gICAgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5jb21tYW5kID0gY29tbWFuZDtcclxuICAgIC8vIFN0YXJ0IHRoZSByZWd1bGFyIHN0YXRlIG1hY2hpbmVcclxuICAgIGlmICghZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGFydGVkKSB7XHJcbiAgICAgICAgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGF0ZSA9IGNvbnN0YW50c18xLlN0YXRlLk5PVF9DT05ORUNURUQ7XHJcbiAgICAgICAgYXdhaXQgZXhwb3J0cy5kcml2ZXIuc3RhdGVNYWNoaW5lKCk7XHJcbiAgICB9XHJcbiAgICAvLyBXYWl0IGZvciBjb21wbGV0aW9uIG9mIHRoZSBjb21tYW5kLCBvciBoYWx0IG9mIHRoZSBzdGF0ZSBtYWNoaW5lXHJcbiAgICBpZiAoY29tbWFuZCAhPSBudWxsKSB7XHJcbiAgICAgICAgYXdhaXQgKDAsIHV0aWxzXzEud2FpdEZvcikoKCkgPT4gIWNvbW1hbmQucGVuZGluZyB8fCBleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXRlID09IGNvbnN0YW50c18xLlN0YXRlLlNUT1BQRUQpO1xyXG4gICAgfVxyXG4gICAgLy8gUmV0dXJuIHRoZSBjb21tYW5kIG9iamVjdCByZXN1bHRcclxuICAgIHJldHVybiBjb21tYW5kO1xyXG59XHJcbmV4cG9ydHMuRXhlY3V0ZSA9IEV4ZWN1dGU7XHJcbi8qKlxyXG4gKiBNVVNUIEJFIENBTExFRCBGUk9NIEEgVVNFUiBHRVNUVVJFIEVWRU5UIEhBTkRMRVJcclxuICAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmIG1ldGVyIGlzIHJlYWR5IHRvIGV4ZWN1dGUgY29tbWFuZFxyXG4gKiAqL1xyXG5hc3luYyBmdW5jdGlvbiBQYWlyKGZvcmNlU2VsZWN0aW9uID0gZmFsc2UpIHtcclxuICAgIGxvZ2xldmVsXzEuZGVmYXVsdC5pbmZvKCdQYWlyKCcgKyBmb3JjZVNlbGVjdGlvbiArICcpIGNhbGxlZC4uLicpO1xyXG4gICAgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5vcHRpb25zLmZvcmNlRGV2aWNlU2VsZWN0aW9uID0gZm9yY2VTZWxlY3Rpb247XHJcbiAgICBpZiAoIWV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhcnRlZCkge1xyXG4gICAgICAgIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5OT1RfQ09OTkVDVEVEO1xyXG4gICAgICAgIGF3YWl0IGV4cG9ydHMuZHJpdmVyLnN0YXRlTWFjaGluZSgpOyAvLyBTdGFydCBpdFxyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGF0ZSA9PSBjb25zdGFudHNfMS5TdGF0ZS5FUlJPUikge1xyXG4gICAgICAgIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhdGUgPSBjb25zdGFudHNfMS5TdGF0ZS5OT1RfQ09OTkVDVEVEOyAvLyBUcnkgdG8gcmVzdGFydFxyXG4gICAgfVxyXG4gICAgYXdhaXQgKDAsIHV0aWxzXzEud2FpdEZvcikoKCkgPT4gZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGF0ZSA9PSBjb25zdGFudHNfMS5TdGF0ZS5JRExFIHx8IGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RhdGUgPT0gY29uc3RhbnRzXzEuU3RhdGUuU1RPUFBFRCk7XHJcbiAgICBsb2dsZXZlbF8xLmRlZmF1bHQuaW5mbygnUGFpcmluZyBjb21wbGV0ZWQsIHN0YXRlIDonLCBleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXRlKTtcclxuICAgIHJldHVybiAoZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGF0ZSAhPSBjb25zdGFudHNfMS5TdGF0ZS5TVE9QUEVEKTtcclxufVxyXG5leHBvcnRzLlBhaXIgPSBQYWlyO1xyXG4vKipcclxuICogU3RvcHMgdGhlIHN0YXRlIG1hY2hpbmUgYW5kIGRpc2Nvbm5lY3RzIGJsdWV0b290aC5cclxuICogKi9cclxuYXN5bmMgZnVuY3Rpb24gU3RvcCgpIHtcclxuICAgIGxvZ2xldmVsXzEuZGVmYXVsdC5pbmZvKCdTdG9wIHJlcXVlc3QgcmVjZWl2ZWQnKTtcclxuICAgIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RvcFJlcXVlc3QgPSB0cnVlO1xyXG4gICAgYXdhaXQgKDAsIHV0aWxzXzEuc2xlZXApKDEwMCk7XHJcbiAgICB3aGlsZSAoZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGFydGVkIHx8IChleHBvcnRzLmRyaXZlci5idFN0YXRlLnN0YXRlICE9IGNvbnN0YW50c18xLlN0YXRlLlNUT1BQRUQgJiYgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5zdGF0ZSAhPSBjb25zdGFudHNfMS5TdGF0ZS5OT1RfQ09OTkVDVEVEKSkge1xyXG4gICAgICAgIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RvcFJlcXVlc3QgPSB0cnVlO1xyXG4gICAgICAgIGF3YWl0ICgwLCB1dGlsc18xLnNsZWVwKSgxMDApO1xyXG4gICAgfVxyXG4gICAgZXhwb3J0cy5kcml2ZXIuYnRTdGF0ZS5jb21tYW5kID0gbnVsbDtcclxuICAgIGV4cG9ydHMuZHJpdmVyLmJ0U3RhdGUuc3RvcFJlcXVlc3QgPSBmYWxzZTtcclxuICAgIGxvZ2xldmVsXzEuZGVmYXVsdC53YXJuKCdTdG9wcGVkIG9uIHJlcXVlc3QuJyk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxufVxyXG5leHBvcnRzLlN0b3AgPSBTdG9wO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1tZXRlclB1YmxpY0FQSS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5leHBvcnRzLmJ1ZjJoZXggPSBleHBvcnRzLlBhcnNlID0gZXhwb3J0cy53YWl0Rm9yVGltZW91dCA9IGV4cG9ydHMud2FpdEZvciA9IGV4cG9ydHMuc2xlZXAgPSB2b2lkIDA7XHJcbmNvbnN0IHNsZWVwID0gYXN5bmMgKG1zKSA9PiBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgbXMpKTtcclxuZXhwb3J0cy5zbGVlcCA9IHNsZWVwO1xyXG5jb25zdCB3YWl0Rm9yID0gYXN5bmMgZnVuY3Rpb24gd2FpdEZvcihmKSB7XHJcbiAgICB3aGlsZSAoIWYoKSlcclxuICAgICAgICBhd2FpdCAoMCwgZXhwb3J0cy5zbGVlcCkoMTAwICsgTWF0aC5yYW5kb20oKSAqIDI1KTtcclxuICAgIHJldHVybiBmKCk7XHJcbn07XHJcbmV4cG9ydHMud2FpdEZvciA9IHdhaXRGb3I7XHJcbmNvbnN0IHdhaXRGb3JUaW1lb3V0ID0gYXN5bmMgZnVuY3Rpb24gd2FpdEZvcihmLCB0aW1lb3V0U2VjKSB7XHJcbiAgICBsZXQgdG90YWxUaW1lTXMgPSAwO1xyXG4gICAgd2hpbGUgKCFmKCkgJiYgdG90YWxUaW1lTXMgPCB0aW1lb3V0U2VjICogMTAwMCkge1xyXG4gICAgICAgIGNvbnN0IGRlbGF5TXMgPSAxMDAgKyBNYXRoLnJhbmRvbSgpICogMjU7XHJcbiAgICAgICAgdG90YWxUaW1lTXMgKz0gZGVsYXlNcztcclxuICAgICAgICBhd2FpdCAoMCwgZXhwb3J0cy5zbGVlcCkoZGVsYXlNcyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZigpO1xyXG59O1xyXG5leHBvcnRzLndhaXRGb3JUaW1lb3V0ID0gd2FpdEZvclRpbWVvdXQ7XHJcbi8qKlxyXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gY29udmVydCBhIHZhbHVlIGludG8gYW4gZW51bSB2YWx1ZVxyXG5cclxuICovXHJcbmZ1bmN0aW9uIFBhcnNlKGVudW10eXBlLCBlbnVtdmFsdWUpIHtcclxuICAgIGZvciAoY29uc3QgZW51bU5hbWUgaW4gZW51bXR5cGUpIHtcclxuICAgICAgICBpZiAoZW51bXR5cGVbZW51bU5hbWVdID09IGVudW12YWx1ZSkge1xyXG4gICAgICAgICAgICAvKiBqc2hpbnQgLVcwNjEgKi9cclxuICAgICAgICAgICAgcmV0dXJuIGV2YWwoZW51bXR5cGUgKyAnLicgKyBlbnVtTmFtZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGw7XHJcbn1cclxuZXhwb3J0cy5QYXJzZSA9IFBhcnNlO1xyXG4vKipcclxuICogSGVscGVyIGZ1bmN0aW9uIHRvIGR1bXAgYXJyYXlidWZmZXIgYXMgaGV4IHN0cmluZ1xyXG4gKi9cclxuZnVuY3Rpb24gYnVmMmhleChidWZmZXIpIHtcclxuICAgIHJldHVybiBbLi4ubmV3IFVpbnQ4QXJyYXkoYnVmZmVyKV1cclxuICAgICAgICAubWFwKHggPT4geC50b1N0cmluZygxNikucGFkU3RhcnQoMiwgJzAnKSlcclxuICAgICAgICAuam9pbignICcpO1xyXG59XHJcbmV4cG9ydHMuYnVmMmhleCA9IGJ1ZjJoZXg7XHJcbmZ1bmN0aW9uIGhleDJidWYoaW5wdXQpIHtcclxuICAgIGlmICh0eXBlb2YgaW5wdXQgIT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgaW5wdXQgdG8gYmUgYSBzdHJpbmcnKTtcclxuICAgIH1cclxuICAgIGNvbnN0IGhleHN0ciA9IGlucHV0LnJlcGxhY2UoL1xccysvZywgJycpO1xyXG4gICAgaWYgKChoZXhzdHIubGVuZ3RoICUgMikgIT09IDApIHtcclxuICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignRXhwZWN0ZWQgc3RyaW5nIHRvIGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGNoYXJhY3RlcnMnKTtcclxuICAgIH1cclxuICAgIGNvbnN0IHZpZXcgPSBuZXcgVWludDhBcnJheShoZXhzdHIubGVuZ3RoIC8gMik7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGhleHN0ci5sZW5ndGg7IGkgKz0gMikge1xyXG4gICAgICAgIHZpZXdbaSAvIDJdID0gcGFyc2VJbnQoaGV4c3RyLnN1YnN0cmluZyhpLCBpICsgMiksIDE2KTtcclxuICAgIH1cclxuICAgIHJldHVybiB2aWV3LmJ1ZmZlcjtcclxufVxyXG4vLyMgc291cmNlTWFwcGluZ1VSTD11dGlscy5qcy5tYXAiLCIvKlxuKiBsb2dsZXZlbCAtIGh0dHBzOi8vZ2l0aHViLmNvbS9waW10ZXJyeS9sb2dsZXZlbFxuKlxuKiBDb3B5cmlnaHQgKGMpIDIwMTMgVGltIFBlcnJ5XG4qIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiovXG4oZnVuY3Rpb24gKHJvb3QsIGRlZmluaXRpb24pIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShkZWZpbml0aW9uKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZGVmaW5pdGlvbigpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJvb3QubG9nID0gZGVmaW5pdGlvbigpO1xuICAgIH1cbn0odGhpcywgZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgLy8gU2xpZ2h0bHkgZHViaW91cyB0cmlja3MgdG8gY3V0IGRvd24gbWluaW1pemVkIGZpbGUgc2l6ZVxuICAgIHZhciBub29wID0gZnVuY3Rpb24oKSB7fTtcbiAgICB2YXIgdW5kZWZpbmVkVHlwZSA9IFwidW5kZWZpbmVkXCI7XG4gICAgdmFyIGlzSUUgPSAodHlwZW9mIHdpbmRvdyAhPT0gdW5kZWZpbmVkVHlwZSkgJiYgKHR5cGVvZiB3aW5kb3cubmF2aWdhdG9yICE9PSB1bmRlZmluZWRUeXBlKSAmJiAoXG4gICAgICAgIC9UcmlkZW50XFwvfE1TSUUgLy50ZXN0KHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50KVxuICAgICk7XG5cbiAgICB2YXIgbG9nTWV0aG9kcyA9IFtcbiAgICAgICAgXCJ0cmFjZVwiLFxuICAgICAgICBcImRlYnVnXCIsXG4gICAgICAgIFwiaW5mb1wiLFxuICAgICAgICBcIndhcm5cIixcbiAgICAgICAgXCJlcnJvclwiXG4gICAgXTtcblxuICAgIC8vIENyb3NzLWJyb3dzZXIgYmluZCBlcXVpdmFsZW50IHRoYXQgd29ya3MgYXQgbGVhc3QgYmFjayB0byBJRTZcbiAgICBmdW5jdGlvbiBiaW5kTWV0aG9kKG9iaiwgbWV0aG9kTmFtZSkge1xuICAgICAgICB2YXIgbWV0aG9kID0gb2JqW21ldGhvZE5hbWVdO1xuICAgICAgICBpZiAodHlwZW9mIG1ldGhvZC5iaW5kID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICByZXR1cm4gbWV0aG9kLmJpbmQob2JqKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kLmNhbGwobWV0aG9kLCBvYmopO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIC8vIE1pc3NpbmcgYmluZCBzaGltIG9yIElFOCArIE1vZGVybml6ciwgZmFsbGJhY2sgdG8gd3JhcHBpbmdcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBGdW5jdGlvbi5wcm90b3R5cGUuYXBwbHkuYXBwbHkobWV0aG9kLCBbb2JqLCBhcmd1bWVudHNdKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gVHJhY2UoKSBkb2Vzbid0IHByaW50IHRoZSBtZXNzYWdlIGluIElFLCBzbyBmb3IgdGhhdCBjYXNlIHdlIG5lZWQgdG8gd3JhcCBpdFxuICAgIGZ1bmN0aW9uIHRyYWNlRm9ySUUoKSB7XG4gICAgICAgIGlmIChjb25zb2xlLmxvZykge1xuICAgICAgICAgICAgaWYgKGNvbnNvbGUubG9nLmFwcGx5KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSW4gb2xkIElFLCBuYXRpdmUgY29uc29sZSBtZXRob2RzIHRoZW1zZWx2ZXMgZG9uJ3QgaGF2ZSBhcHBseSgpLlxuICAgICAgICAgICAgICAgIEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseS5hcHBseShjb25zb2xlLmxvZywgW2NvbnNvbGUsIGFyZ3VtZW50c10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjb25zb2xlLnRyYWNlKSBjb25zb2xlLnRyYWNlKCk7XG4gICAgfVxuXG4gICAgLy8gQnVpbGQgdGhlIGJlc3QgbG9nZ2luZyBtZXRob2QgcG9zc2libGUgZm9yIHRoaXMgZW52XG4gICAgLy8gV2hlcmV2ZXIgcG9zc2libGUgd2Ugd2FudCB0byBiaW5kLCBub3Qgd3JhcCwgdG8gcHJlc2VydmUgc3RhY2sgdHJhY2VzXG4gICAgZnVuY3Rpb24gcmVhbE1ldGhvZChtZXRob2ROYW1lKSB7XG4gICAgICAgIGlmIChtZXRob2ROYW1lID09PSAnZGVidWcnKSB7XG4gICAgICAgICAgICBtZXRob2ROYW1lID0gJ2xvZyc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgPT09IHVuZGVmaW5lZFR5cGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gTm8gbWV0aG9kIHBvc3NpYmxlLCBmb3Igbm93IC0gZml4ZWQgbGF0ZXIgYnkgZW5hYmxlTG9nZ2luZ1doZW5Db25zb2xlQXJyaXZlc1xuICAgICAgICB9IGVsc2UgaWYgKG1ldGhvZE5hbWUgPT09ICd0cmFjZScgJiYgaXNJRSkge1xuICAgICAgICAgICAgcmV0dXJuIHRyYWNlRm9ySUU7XG4gICAgICAgIH0gZWxzZSBpZiAoY29uc29sZVttZXRob2ROYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gYmluZE1ldGhvZChjb25zb2xlLCBtZXRob2ROYW1lKTtcbiAgICAgICAgfSBlbHNlIGlmIChjb25zb2xlLmxvZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gYmluZE1ldGhvZChjb25zb2xlLCAnbG9nJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbm9vcDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoZXNlIHByaXZhdGUgZnVuY3Rpb25zIGFsd2F5cyBuZWVkIGB0aGlzYCB0byBiZSBzZXQgcHJvcGVybHlcblxuICAgIGZ1bmN0aW9uIHJlcGxhY2VMb2dnaW5nTWV0aG9kcyhsZXZlbCwgbG9nZ2VyTmFtZSkge1xuICAgICAgICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSAqL1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxvZ01ldGhvZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBtZXRob2ROYW1lID0gbG9nTWV0aG9kc1tpXTtcbiAgICAgICAgICAgIHRoaXNbbWV0aG9kTmFtZV0gPSAoaSA8IGxldmVsKSA/XG4gICAgICAgICAgICAgICAgbm9vcCA6XG4gICAgICAgICAgICAgICAgdGhpcy5tZXRob2RGYWN0b3J5KG1ldGhvZE5hbWUsIGxldmVsLCBsb2dnZXJOYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERlZmluZSBsb2cubG9nIGFzIGFuIGFsaWFzIGZvciBsb2cuZGVidWdcbiAgICAgICAgdGhpcy5sb2cgPSB0aGlzLmRlYnVnO1xuICAgIH1cblxuICAgIC8vIEluIG9sZCBJRSB2ZXJzaW9ucywgdGhlIGNvbnNvbGUgaXNuJ3QgcHJlc2VudCB1bnRpbCB5b3UgZmlyc3Qgb3BlbiBpdC5cbiAgICAvLyBXZSBidWlsZCByZWFsTWV0aG9kKCkgcmVwbGFjZW1lbnRzIGhlcmUgdGhhdCByZWdlbmVyYXRlIGxvZ2dpbmcgbWV0aG9kc1xuICAgIGZ1bmN0aW9uIGVuYWJsZUxvZ2dpbmdXaGVuQ29uc29sZUFycml2ZXMobWV0aG9kTmFtZSwgbGV2ZWwsIGxvZ2dlck5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gdW5kZWZpbmVkVHlwZSkge1xuICAgICAgICAgICAgICAgIHJlcGxhY2VMb2dnaW5nTWV0aG9kcy5jYWxsKHRoaXMsIGxldmVsLCBsb2dnZXJOYW1lKTtcbiAgICAgICAgICAgICAgICB0aGlzW21ldGhvZE5hbWVdLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gQnkgZGVmYXVsdCwgd2UgdXNlIGNsb3NlbHkgYm91bmQgcmVhbCBtZXRob2RzIHdoZXJldmVyIHBvc3NpYmxlLCBhbmRcbiAgICAvLyBvdGhlcndpc2Ugd2Ugd2FpdCBmb3IgYSBjb25zb2xlIHRvIGFwcGVhciwgYW5kIHRoZW4gdHJ5IGFnYWluLlxuICAgIGZ1bmN0aW9uIGRlZmF1bHRNZXRob2RGYWN0b3J5KG1ldGhvZE5hbWUsIGxldmVsLCBsb2dnZXJOYW1lKSB7XG4gICAgICAgIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gICAgICAgIHJldHVybiByZWFsTWV0aG9kKG1ldGhvZE5hbWUpIHx8XG4gICAgICAgICAgICAgICBlbmFibGVMb2dnaW5nV2hlbkNvbnNvbGVBcnJpdmVzLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gTG9nZ2VyKG5hbWUsIGRlZmF1bHRMZXZlbCwgZmFjdG9yeSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIGN1cnJlbnRMZXZlbDtcbiAgICAgIGRlZmF1bHRMZXZlbCA9IGRlZmF1bHRMZXZlbCA9PSBudWxsID8gXCJXQVJOXCIgOiBkZWZhdWx0TGV2ZWw7XG5cbiAgICAgIHZhciBzdG9yYWdlS2V5ID0gXCJsb2dsZXZlbFwiO1xuICAgICAgaWYgKHR5cGVvZiBuYW1lID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIHN0b3JhZ2VLZXkgKz0gXCI6XCIgKyBuYW1lO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgbmFtZSA9PT0gXCJzeW1ib2xcIikge1xuICAgICAgICBzdG9yYWdlS2V5ID0gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBwZXJzaXN0TGV2ZWxJZlBvc3NpYmxlKGxldmVsTnVtKSB7XG4gICAgICAgICAgdmFyIGxldmVsTmFtZSA9IChsb2dNZXRob2RzW2xldmVsTnVtXSB8fCAnc2lsZW50JykudG9VcHBlckNhc2UoKTtcblxuICAgICAgICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSB1bmRlZmluZWRUeXBlIHx8ICFzdG9yYWdlS2V5KSByZXR1cm47XG5cbiAgICAgICAgICAvLyBVc2UgbG9jYWxTdG9yYWdlIGlmIGF2YWlsYWJsZVxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Vbc3RvcmFnZUtleV0gPSBsZXZlbE5hbWU7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9IGNhdGNoIChpZ25vcmUpIHt9XG5cbiAgICAgICAgICAvLyBVc2Ugc2Vzc2lvbiBjb29raWUgYXMgZmFsbGJhY2tcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICB3aW5kb3cuZG9jdW1lbnQuY29va2llID1cbiAgICAgICAgICAgICAgICBlbmNvZGVVUklDb21wb25lbnQoc3RvcmFnZUtleSkgKyBcIj1cIiArIGxldmVsTmFtZSArIFwiO1wiO1xuICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZ2V0UGVyc2lzdGVkTGV2ZWwoKSB7XG4gICAgICAgICAgdmFyIHN0b3JlZExldmVsO1xuXG4gICAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09IHVuZGVmaW5lZFR5cGUgfHwgIXN0b3JhZ2VLZXkpIHJldHVybjtcblxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHN0b3JlZExldmVsID0gd2luZG93LmxvY2FsU3RvcmFnZVtzdG9yYWdlS2V5XTtcbiAgICAgICAgICB9IGNhdGNoIChpZ25vcmUpIHt9XG5cbiAgICAgICAgICAvLyBGYWxsYmFjayB0byBjb29raWVzIGlmIGxvY2FsIHN0b3JhZ2UgZ2l2ZXMgdXMgbm90aGluZ1xuICAgICAgICAgIGlmICh0eXBlb2Ygc3RvcmVkTGV2ZWwgPT09IHVuZGVmaW5lZFR5cGUpIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgIHZhciBjb29raWUgPSB3aW5kb3cuZG9jdW1lbnQuY29va2llO1xuICAgICAgICAgICAgICAgICAgdmFyIGxvY2F0aW9uID0gY29va2llLmluZGV4T2YoXG4gICAgICAgICAgICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHN0b3JhZ2VLZXkpICsgXCI9XCIpO1xuICAgICAgICAgICAgICAgICAgaWYgKGxvY2F0aW9uICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgIHN0b3JlZExldmVsID0gL14oW147XSspLy5leGVjKGNvb2tpZS5zbGljZShsb2NhdGlvbikpWzFdO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGNhdGNoIChpZ25vcmUpIHt9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gSWYgdGhlIHN0b3JlZCBsZXZlbCBpcyBub3QgdmFsaWQsIHRyZWF0IGl0IGFzIGlmIG5vdGhpbmcgd2FzIHN0b3JlZC5cbiAgICAgICAgICBpZiAoc2VsZi5sZXZlbHNbc3RvcmVkTGV2ZWxdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgc3RvcmVkTGV2ZWwgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHN0b3JlZExldmVsO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiBjbGVhclBlcnNpc3RlZExldmVsKCkge1xuICAgICAgICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSB1bmRlZmluZWRUeXBlIHx8ICFzdG9yYWdlS2V5KSByZXR1cm47XG5cbiAgICAgICAgICAvLyBVc2UgbG9jYWxTdG9yYWdlIGlmIGF2YWlsYWJsZVxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShzdG9yYWdlS2V5KTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cblxuICAgICAgICAgIC8vIFVzZSBzZXNzaW9uIGNvb2tpZSBhcyBmYWxsYmFja1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHdpbmRvdy5kb2N1bWVudC5jb29raWUgPVxuICAgICAgICAgICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChzdG9yYWdlS2V5KSArIFwiPTsgZXhwaXJlcz1UaHUsIDAxIEphbiAxOTcwIDAwOjAwOjAwIFVUQ1wiO1xuICAgICAgICAgIH0gY2F0Y2ggKGlnbm9yZSkge31cbiAgICAgIH1cblxuICAgICAgLypcbiAgICAgICAqXG4gICAgICAgKiBQdWJsaWMgbG9nZ2VyIEFQSSAtIHNlZSBodHRwczovL2dpdGh1Yi5jb20vcGltdGVycnkvbG9nbGV2ZWwgZm9yIGRldGFpbHNcbiAgICAgICAqXG4gICAgICAgKi9cblxuICAgICAgc2VsZi5uYW1lID0gbmFtZTtcblxuICAgICAgc2VsZi5sZXZlbHMgPSB7IFwiVFJBQ0VcIjogMCwgXCJERUJVR1wiOiAxLCBcIklORk9cIjogMiwgXCJXQVJOXCI6IDMsXG4gICAgICAgICAgXCJFUlJPUlwiOiA0LCBcIlNJTEVOVFwiOiA1fTtcblxuICAgICAgc2VsZi5tZXRob2RGYWN0b3J5ID0gZmFjdG9yeSB8fCBkZWZhdWx0TWV0aG9kRmFjdG9yeTtcblxuICAgICAgc2VsZi5nZXRMZXZlbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gY3VycmVudExldmVsO1xuICAgICAgfTtcblxuICAgICAgc2VsZi5zZXRMZXZlbCA9IGZ1bmN0aW9uIChsZXZlbCwgcGVyc2lzdCkge1xuICAgICAgICAgIGlmICh0eXBlb2YgbGV2ZWwgPT09IFwic3RyaW5nXCIgJiYgc2VsZi5sZXZlbHNbbGV2ZWwudG9VcHBlckNhc2UoKV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBsZXZlbCA9IHNlbGYubGV2ZWxzW2xldmVsLnRvVXBwZXJDYXNlKCldO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIGxldmVsID09PSBcIm51bWJlclwiICYmIGxldmVsID49IDAgJiYgbGV2ZWwgPD0gc2VsZi5sZXZlbHMuU0lMRU5UKSB7XG4gICAgICAgICAgICAgIGN1cnJlbnRMZXZlbCA9IGxldmVsO1xuICAgICAgICAgICAgICBpZiAocGVyc2lzdCAhPT0gZmFsc2UpIHsgIC8vIGRlZmF1bHRzIHRvIHRydWVcbiAgICAgICAgICAgICAgICAgIHBlcnNpc3RMZXZlbElmUG9zc2libGUobGV2ZWwpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJlcGxhY2VMb2dnaW5nTWV0aG9kcy5jYWxsKHNlbGYsIGxldmVsLCBuYW1lKTtcbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlID09PSB1bmRlZmluZWRUeXBlICYmIGxldmVsIDwgc2VsZi5sZXZlbHMuU0lMRU5UKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gXCJObyBjb25zb2xlIGF2YWlsYWJsZSBmb3IgbG9nZ2luZ1wiO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3cgXCJsb2cuc2V0TGV2ZWwoKSBjYWxsZWQgd2l0aCBpbnZhbGlkIGxldmVsOiBcIiArIGxldmVsO1xuICAgICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHNlbGYuc2V0RGVmYXVsdExldmVsID0gZnVuY3Rpb24gKGxldmVsKSB7XG4gICAgICAgICAgZGVmYXVsdExldmVsID0gbGV2ZWw7XG4gICAgICAgICAgaWYgKCFnZXRQZXJzaXN0ZWRMZXZlbCgpKSB7XG4gICAgICAgICAgICAgIHNlbGYuc2V0TGV2ZWwobGV2ZWwsIGZhbHNlKTtcbiAgICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBzZWxmLnJlc2V0TGV2ZWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgc2VsZi5zZXRMZXZlbChkZWZhdWx0TGV2ZWwsIGZhbHNlKTtcbiAgICAgICAgICBjbGVhclBlcnNpc3RlZExldmVsKCk7XG4gICAgICB9O1xuXG4gICAgICBzZWxmLmVuYWJsZUFsbCA9IGZ1bmN0aW9uKHBlcnNpc3QpIHtcbiAgICAgICAgICBzZWxmLnNldExldmVsKHNlbGYubGV2ZWxzLlRSQUNFLCBwZXJzaXN0KTtcbiAgICAgIH07XG5cbiAgICAgIHNlbGYuZGlzYWJsZUFsbCA9IGZ1bmN0aW9uKHBlcnNpc3QpIHtcbiAgICAgICAgICBzZWxmLnNldExldmVsKHNlbGYubGV2ZWxzLlNJTEVOVCwgcGVyc2lzdCk7XG4gICAgICB9O1xuXG4gICAgICAvLyBJbml0aWFsaXplIHdpdGggdGhlIHJpZ2h0IGxldmVsXG4gICAgICB2YXIgaW5pdGlhbExldmVsID0gZ2V0UGVyc2lzdGVkTGV2ZWwoKTtcbiAgICAgIGlmIChpbml0aWFsTGV2ZWwgPT0gbnVsbCkge1xuICAgICAgICAgIGluaXRpYWxMZXZlbCA9IGRlZmF1bHRMZXZlbDtcbiAgICAgIH1cbiAgICAgIHNlbGYuc2V0TGV2ZWwoaW5pdGlhbExldmVsLCBmYWxzZSk7XG4gICAgfVxuXG4gICAgLypcbiAgICAgKlxuICAgICAqIFRvcC1sZXZlbCBBUElcbiAgICAgKlxuICAgICAqL1xuXG4gICAgdmFyIGRlZmF1bHRMb2dnZXIgPSBuZXcgTG9nZ2VyKCk7XG5cbiAgICB2YXIgX2xvZ2dlcnNCeU5hbWUgPSB7fTtcbiAgICBkZWZhdWx0TG9nZ2VyLmdldExvZ2dlciA9IGZ1bmN0aW9uIGdldExvZ2dlcihuYW1lKSB7XG4gICAgICAgIGlmICgodHlwZW9mIG5hbWUgIT09IFwic3ltYm9sXCIgJiYgdHlwZW9mIG5hbWUgIT09IFwic3RyaW5nXCIpIHx8IG5hbWUgPT09IFwiXCIpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiWW91IG11c3Qgc3VwcGx5IGEgbmFtZSB3aGVuIGNyZWF0aW5nIGEgbG9nZ2VyLlwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBsb2dnZXIgPSBfbG9nZ2Vyc0J5TmFtZVtuYW1lXTtcbiAgICAgICAgaWYgKCFsb2dnZXIpIHtcbiAgICAgICAgICBsb2dnZXIgPSBfbG9nZ2Vyc0J5TmFtZVtuYW1lXSA9IG5ldyBMb2dnZXIoXG4gICAgICAgICAgICBuYW1lLCBkZWZhdWx0TG9nZ2VyLmdldExldmVsKCksIGRlZmF1bHRMb2dnZXIubWV0aG9kRmFjdG9yeSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxvZ2dlcjtcbiAgICB9O1xuXG4gICAgLy8gR3JhYiB0aGUgY3VycmVudCBnbG9iYWwgbG9nIHZhcmlhYmxlIGluIGNhc2Ugb2Ygb3ZlcndyaXRlXG4gICAgdmFyIF9sb2cgPSAodHlwZW9mIHdpbmRvdyAhPT0gdW5kZWZpbmVkVHlwZSkgPyB3aW5kb3cubG9nIDogdW5kZWZpbmVkO1xuICAgIGRlZmF1bHRMb2dnZXIubm9Db25mbGljdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gdW5kZWZpbmVkVHlwZSAmJlxuICAgICAgICAgICAgICAgd2luZG93LmxvZyA9PT0gZGVmYXVsdExvZ2dlcikge1xuICAgICAgICAgICAgd2luZG93LmxvZyA9IF9sb2c7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZGVmYXVsdExvZ2dlcjtcbiAgICB9O1xuXG4gICAgZGVmYXVsdExvZ2dlci5nZXRMb2dnZXJzID0gZnVuY3Rpb24gZ2V0TG9nZ2VycygpIHtcbiAgICAgICAgcmV0dXJuIF9sb2dnZXJzQnlOYW1lO1xuICAgIH07XG5cbiAgICAvLyBFUzYgZGVmYXVsdCBleHBvcnQsIGZvciBjb21wYXRpYmlsaXR5XG4gICAgZGVmYXVsdExvZ2dlclsnZGVmYXVsdCddID0gZGVmYXVsdExvZ2dlcjtcblxuICAgIHJldHVybiBkZWZhdWx0TG9nZ2VyO1xufSkpO1xuIl19
