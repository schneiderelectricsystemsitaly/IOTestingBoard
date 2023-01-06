# bt-seneca-msc project

A pure Javascript API for the Seneca Multi Smart Calibrator device, using web bluetooth.

This package has only one logger package as dependency, it implements modbus RTU FC3/FC16 functions. The reason is that most modbus implementations I found are requiring Node.js environment, whereas my goal was to run in a pure browser environment.
This oackage has been tested with a Seneca MSC device with firmware 1.0.44 ; testing was performed on PC/Windows with Chrome and Edge and Android Samsung S10 phone.
The distribution versions are CommonJS (browserified with a standalone MSC object) ; examples below.
This package can probably be adapted from Bluetooth to serial comm with little effort, but at the time I don't need it.

* A sample application is available here: :point_right: https://pbrunot.github.io/bt-seneca-msc/ :point_left:

## Requirements and limitations

* A recent browser supporting bluetooth
* A Seneca Multi Smart Calibrator device (see https://www.seneca.it/msc/ )
* MSC features status:

| Measurements | Implementation | Data returned |
| --- | --- | --- |
| V, mV readings                | Done and tested           | Only Instantaneous, min, max values (no avg) |
| mA active/passive readings    | Done and tested           | Only Instantaneous, min, max values (no avg) |
| RTD readings                  | Done and tested 2W        | Instantaneous RTD °C and Ohms values |
| Thermocouples 2W/3W/4W read   | Done :grey_exclamation: *not tested*  | Instantaneous °C value |
| Frequency reading             | Done and tested           | Frequency of leading and falling edges |
| Pulse count reading           | Done and tested 0-10kHz   | Counts of leading and falling edges |
| Frequency reading             | Done and tested           | Tested with square wave 0-10 kHz |
| Load cell                     | Done :grey_exclamation: *not tested* | Imbalance mV/V |

| Generation | Implementation | Setpoint |
| --- | --- | --- |
| V, mV                         | Done and tested           | 1 Setpoint (mV/V) |
| mA active/passive             | Done *basic testing*      | 1 Setpoint (mA) |
| RTD 2W                        | Done :grey_exclamation: *not tested*  | 1 Setpoint RTD °C |
| Thermocouples                 | Done :grey_exclamation: *not tested* | 1 Setpoint °C value *no Cold junction* |
| Frequency (square waves)      | Done and tested 0-10kHz   | 2 Setpoints: LE and FE f (Hz) |
| Pulses count generation       | Done and tested 1 kHz     | 2 Setpoints: LE and FE f (Hz) |
| Load cell                     | Done :grey_exclamation: *not tested* | 1 Setpoint : Imbalance mV/V |

| Others features | Status |
| --- | --- |
| Ramps editing          | Not implemented, not planned |
| Ramps application      | Not implemented, not planned |
| Data logging start/stop| Not implemented, not planned |
| Logged data retrieval  | Not implemented, not planned |
| Clock read/sync        | Not implemented |
| Firmware version read  | Not implemented |
| Battery level          | Read once, after pairing |
| Conversion of mV/V to kg | Calculation not implemented |
| Automatic switch off delay | Not implemented |

| Settings of measures/generation modes| Implementation | Notes |
| --- | --- | --- |
| Low level for pulse/square wave generation | CommandType.SET_Ulow | Voltage 0-27 V (tested)
| High level for pulse/square wave generation | CommandType.SET_Uhigh | Voltage 0-27 V (tested)
| Minimum pulse width in microsec | CommandType.SET_Sensitivity_uS | Unknown range 1-??? uS *not tested* same threshold for LE/FE
| Tension threshold for frequency/pulse measurement | CommandType.SET_UThreshold_F | Voltage 0-27 V *not tested* 
| Setting of cold junction compensation | CommandType.SET_ColdJunction |Implemented  *not tested* |

## How to build

* Install Node.js 
* Checkout the repository
* Run from your command line:

```bash
    npm install
    npm run dist
    npm run dev
```

## How to use in your application

* For Node.js applications :

```bash
npm install bt-seneca-msc
```

* For ASPNET.core :

```powershell
libman install bt-seneca-msc --provider jsdelivr
```

## External API

There are 5 operations available:

```js
await MSC.Pair(true/false); // bool - Pair to bluetooth (if True force user pickup)
await MSC.Stop(); // bool - Disconnect the bluetooth and stops the polling
await MSC.Execute(MSC.Command object); // Execute command. If the device is not paired, an attempt will be made. Command is returned with updated properties.
await MSC.GetState(); // Returns an array with the current state
await MSC.SimpleExecute(MSC.Command object); // Execute the command and results the value
```

* JSON versions are available for ASPNET.core interop

```js
await MSC.SimpleExecuteJSON(jsonCommand); // Expects a json string (Command) and returns a json string (simple result)
await MSC.ExecuteJSON(jsonCommand); // Expects a json string (Command) and returns a json string (update Command object)
await MSC.GetStateJSON(); // returns a json string with the same properties as GetState()
```


### Connecting to the meter

* Call MSC.Pair(true) while handling a user gesture in the browser (i.e. button-click)

```js
 var result = await MSC.Pair(true); // true when connection has been established
```

* A dialog will be shown to the user of devices with bluetooth name beginning with MSC
* After pairing, the required bluetooth interfaces for Modbus RTU read and write will be established.
* In case of communication errors after pairing, attempts will be made to reestablish bluetooth interfaces automatically.

### Getting the current state of the meter

* Behind the API, there is a state machine running every 750 ms. 
* If there is no command pending from API, read requests will be done to refresh the state at this frequency.
* When the meter is measuring, measurement and error flag are refreshed at this rate (see: btState.lastMeasure). 
* When the meter is generating, setpoint and error flag is read (see: btState.lastSetpoint).

```js

var mstate = await MSC.GetState();
mstate.ready          // The meter is ready to execute commands
mstate.initializing   // The meter is initializing bluetooth
mstate.status         // State machine internal status (Ready,Busy,Pairing,...)

mstate.lastSetpoint   // Last executed generation data. An array.
mstate.lastMeasure    // Last measurement. An array.

mstate.deviceName     // Name of the bluetooth device paired
mstate.deviceSerial   // Serial number of the MSC device
mstate.deviceMode     // Current mode of the MSC device (see CommandType values)
mstate.stats          // Generic statistics, useful for debugging only.
mstate.batteryLevel   // Internal battery level in Volts
```

* Internal states reference

The state property returned by GetState() can have the following values (see MSC.State enum)

| Constant | Value | Meaning | Next |
| --- | --- | --- | --- |
 NOT_CONNECTED     | 'Not connected'                     | Initial state (before Pair())        | CONNECTING
 CONNECTING        | 'Bluetooth device pairing...'       | Waiting for pairing to complete      | DEVICE_PAIRED
 DEVICE_PAIRED     | 'Device paired'                     | Pairing completed, no BT interface   | SUBSCRIBING
 SUBSCRIBING       | 'Bluetooth interfaces connecting...'| Waiting for BT interfaces            | METER_INIT
 IDLE | 'Idle' | Ready to execute commands            | BUSY
 BUSY              | 'Busy'                              | Executing command or refreshing data | IDLE,ERROR
 ERROR             | 'Error'                             | An exception has occured (BT or data)| METER_INIT
 STOPPING          | 'Closing BT interfaces...'          | Processing Stop request from UI      | STOPPED
 STOPPED           | 'Stopped'                           | Everything has stopped               | -
 METER_INIT        | 'Meter connected'                   | State after SUBSCRIBING              | METER_INITIALIZING
 METER_INITIALIZING| 'Reading meter state...'            | State after METER_INIT (reading data)| IDLE

### Sending commands to the meter

The MSC device supports readings and generations. Each function corresponds to a CommandType enum value.
Generations require one or more setpoint, depending on the specific function.

* Command class is a required parameter to send a command to the meter

```js
// Use the static methods CreateNo/One/TwoSP to initialize a command object
var comm_meas = MSC.Command.CreateNoSP(<CommandType enum value>)
var comm_gen = MSC.Command.CreateOneSP(<CommandType enum value>, setpoint)
var comm_cgen = MSC.Command.CreateTwoSP(<CommandType enum value>, set1, set2)
// The following properties are available
comm.error // true if the Execute method has failed 
comm.type  // type of the command
comm.setpoint  // copy of setpoint 1 or null
comm.setpoint2  // copy of setpoint 2 or null
comm.defaultSetpoint() // see below
```

* In all cases, will try to re-execute the command if communication breaks during execution.
* The API will put the device in OFF state before writing setpoints (for safety), then apply the new mode settings after a slight delay.
* For specific functions (mV/V/mA/Pulses), a statistics reset command will be sent to the meter 1s after mode change.


#### Sending commands to the meter (simple version)

SimpleExecute will send the command and update the state. 
* It will fail if a command is already pending, the meter is not paired, or the command execution fails for whatever reason. 
* A message property is available for diagnostics.
* It will not attempt to pair the device if not already paired and fail fast.

```js
// Use the static methods CreateNo/One/TwoSP to initialize a command object
var comm_meas = MSC.Command.CreateNoSP(CommandType.V);
var result = await MSC.SimpleExecute(command);
if (!result.error)
{
    console.log("The command was executed and the returned value is " + result.value);
}
```

#### Sending commands to the meter (complex version)

Execute method will wait for the previous comand to complete, queue the new command, and return an updated Command object. You will need to call GetState to have the results of the command.

* Read example

```js
var state = await MSC.GetState();
if (state.ready) { // Check that the meter is ready
    var command = MSC.Command.CreateNoSP(MSC.CommandType.mV); // Read mV function
    var result = await MSC.Execute(command);
    if (result.error) { // Check the error property of returned Command
        // Something happened with command execution (device off, comm error...)
    }
    var measure = await MSC.GetState().lastMeasure; // This property will update approx. every second
    if (measure.error) { // Meter is signalling an error with the measurement. E.g. overcurrent.
        // Measure is not valid ; should retry 
    }
    else {
        console.log(measure); // Print the measurements
        // Note that the raw value will always be measure[0]
    }
}
else {
    if (state.initializing) {
        // Wait some more, the meter is connecting
    } else {
        // Not connected, ask the user to pair again
    }
}
```

* Generation example 

```js
var state = await MSC.GetState();
if (state.ready) {
    var command = MSC.Command.CreateOneSP(MSC.CommandType.GEN_V, 5.2); // Generate 5.2 V
    var result = await MSC.Execute(command);
    if (result.error) { // Check the error property of returned Command
        // Something happened with command execution (device off, comm error...)
    }
    var sp = MSC.GetState().lastSetpoint;
    if (sp.error) {
        // Generation has error (e.g. short circuit, wrong connections...) 
    }
    else {
        console.log(sp); // Print the setpoint
    }
}
else {
    if (state.initializing) {
        // Wait some more
    } else {
        // Not connected, ask the user to pair again
    }
}
```

* Generating 100 pulses of 50 ms each, with low = 0 V and high = 5 V

```js
// Assuming meter.ready

var command1 = MSC.Command.CreateOneSP(MSC.CommandType.SET_Ulow, 0.0); 
var result1 = await MSC.Execute(command1);
if (result1.error) { // Check the error property of returned Command
    // Something happened with command execution (device off, comm error...)
}
var command2 = MSC.Command.CreateOneSP(MSC.CommandType.SET_Uhigh, 5.0); 
var result2 = await MSC.Execute(command2);
if (result2.error) { // Check the error property of returned Command
    // Something happened with command execution (device off, comm error...)
}
var command3 = MSC.Command.CreateTwoSP(MSC.CommandType.GEN_PulseTrain, 100, 1000/50); 
var result3 = await MSC.Execute(command3);
if (result3.error) { // Check the error property of returned Command
    // Something happened with command execution (device off, comm error...)
} else {
    // MSC is now generating the pulses
}
```
* After a command execution the state is up-to-date (garantee)
* If the state machine is stopped, an attempt will be made to start the machine. This may require to Pair the device and it will fail if Execute is not called from a user-gesture handling function in the browser.
* To get the expected setpoints for a specific command type, use Command.defaultSetpoint(). This is used in the demo page in order to present to the user the right input boxes with meaningful descriptions.

```js
// Create a temporary command
const command = new MSC.Command(ctype);
// Get the default setpoint for this command type
const setpoints = command.defaultSetpoint();
// Inspect setpoints array to get information about units, setpoint required...
const howmany = Object.keys(setpoints).length;
```

### :alarm_clock: Response times observed

| Operation | Typical time observed | Notes
| --- | --- | --- |
| Pair the device | 20-40s | It takes several tries to establish bluetooth characteristics
| Execute generation | 2-3s | From command to device output
| Execute measurement | 2-3s | From command to device reading
| Refresh measurement | 1s | To get updated min/max/current values and error flag
| Refresh generation stats | 1s | To get updated generation setpoint and error flag
| Modbus roundtrip | approx 150ms | From command to answer

## Branches & development info

* Pushes to main will trigger GitHub actions for CI and NPM package update. If the package.json has a new version respect to NPM repository, it will be published automatically. Also, pushes to main branch update the Github pages with the sample application.
* Most development shall happen in development branch, then PR to main once ready.
* Testing is peculiar due to bluetooth interface and real device requirements.
* To workaround this issue, I captured traces of modbus RTU packets in hex format (see docs/captured traces.txt), and added a simulation flag into the bluetooth module. When this simulation flag is set, the device modbus RTU answers will be either forged on the fly (e.g. state inquiry), taken from the registered "real trace", or taken from default FC 03 / FC 10 modbus answer. In this way, the code testing coverage remains pretty decent without a real device.

```bash
npm test
```

* The CommonJS files can be generated in two ways, minified ("dist") or normal ("dev") :

```bash
npm run dev
npm run dist 
```
