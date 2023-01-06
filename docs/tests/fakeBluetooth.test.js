const MeterState = require('../classes/MeterState');
const MSC = require('../meterApi');
const bluetooth = require('../bluetooth');
var log = require('loglevel');

/*
// This prevents jest from adding verbose headers to the logs when the --verbose is set
if (global.console.constructor.name === 'CustomConsole') {
    // you can also override the global.console with another CustomConsole of yours, like https://stackoverflow.com/a/57443150
    global.console = require('console');
}
log.info = console.info;
log.debug = console.debug;
log.trace = console.trace;
log.error = console.error;
log.warn = console.warn;
*/
var CommandType = MSC.CommandType;
bluetooth.SetSimulation(true);

describe('Simulated device basic testing', () => {
    test('GetState returns the right properties', async () => {
        let data = await MSC.GetState();
        expect(data).not.toBeNull();
        expect(data).toHaveProperty('status');
        expect(data).toHaveProperty('lastSetpoint');
        expect(data).toHaveProperty('lastMeasure');
        expect(data).toHaveProperty('deviceName');
        expect(data).toHaveProperty('deviceSerial');
        expect(data).toHaveProperty('deviceMode');
        expect(data).toHaveProperty('stats');
        expect(data).toHaveProperty('ready');
        expect(data).toHaveProperty('initializing');
        expect(data).toHaveProperty('batteryLevel');

        let datajson = await MSC.GetStateJSON();
        data = JSON.parse(datajson);
        expect(data).not.toBeNull();
        expect(data).toHaveProperty('status');
        expect(data).toHaveProperty('lastSetpoint');
        expect(data).toHaveProperty('lastMeasure');
        expect(data).toHaveProperty('deviceName');
        expect(data).toHaveProperty('deviceSerial');
        expect(data).toHaveProperty('deviceMode');
        expect(data).toHaveProperty('stats');
        expect(data).toHaveProperty('ready');
        expect(data).toHaveProperty('initializing');
        expect(data).toHaveProperty('batteryLevel');
    })

    test('Initial state is not connected', async () => {
        const data = await MSC.GetState();
        expect(data.status).toBe(MSC.State.NOT_CONNECTED);
        expect(data.ready).toBeFalsy();
        expect(data.initializing).toBeFalsy();
    })

    test('Stops succeeds', async () => {
        const result = await MSC.Stop();
        expect(result).toBeTruthy();

        const data = await MSC.GetState();
        expect(data.status).toBe(MSC.State.NOT_CONNECTED);
        expect(data.ready).toBeFalsy();
        expect(data.initializing).toBeFalsy();
    })
        
    test('Pair succeeds', async () => {
        const result = await MSC.Pair(false);
        // Will fail without navigator object
        expect(result).toBeTruthy();

        const data = await MSC.GetState();
        expect(data.status).not.toBe(MSC.State.STOPPED);
        expect(data.ready).toBeTruthy();
        expect(data.initializing).toBeFalsy();

        const result2 = await MSC.Pair(true);
        // Will fail without navigator object
        expect(result2).toBeTruthy();

        const data2 = await MSC.GetState();
        expect(data2.status).not.toBe(MSC.State.STOPPED);
        expect(data2.ready).toBeTruthy();
        expect(data2.initializing).toBeFalsy();
    })
    
    test('Measurement execution succeeds', async () => {
        const command = MSC.Command.CreateNoSP(MSC.CommandType.V);
        const result = await MSC.Execute(command);
        expect(result).not.toBeNull();
        expect(result.pending).toBeFalsy();
        expect(result.error).toBeFalsy();
    })
    
    test('Generation execution succeeds', async () => {
        const command = MSC.Command.CreateOneSP(MSC.CommandType.GEN_V, 1.23);
        expect(command.setpoint).toBe(1.23);
        expect(command.setpoint2).toBe(null);
        try
        {
            const result = await MSC.Execute(command);
            expect(result).not.toBeNull();
            expect(result.pending).toBeFalsy();
            expect(result.error).toBeFalsy();
        }
        catch(e)
        {
          // Will throw without Pair   
        }
    })   

    test('Non-null refreshed properties of GetState', async () => {
        const data = await MSC.GetState();
        expect(data.lastMeasure).not.toBeNull();
        expect(data.lastSetpoint).not.toBeNull();
        expect(typeof data.lastMeasure).toBe('object');
        expect(typeof data.lastSetpoint).toBe('object');
    })

    test('JSON Execute works with Command returned', async () => {
        var comm = MSC.Command.CreateOneSP(MSC.CommandType.GEN_V, 5.0);
        var result = JSON.parse(await MSC.ExecuteJSON(JSON.stringify(comm)));
        expect(result).toHaveProperty('error');
        expect(result).toHaveProperty('pending');
        expect(result).toHaveProperty('setpoint');
        expect(result.pending).toBeFalsy();
        expect(result.error).toBeFalsy();
        expect(result.setpoint).toBe(5.0);
        expect(result.setpoint2).toBe(null);

        comm = MSC.Command.CreateTwoSP(MSC.CommandType.GEN_PulseTrain, 5, 10);
        result = JSON.parse(await MSC.ExecuteJSON(JSON.stringify(comm)));

        expect(result).toHaveProperty('error');
        expect(result).toHaveProperty('pending');
        expect(result).toHaveProperty('setpoint');
        expect(result.pending).toBeFalsy();
        expect(result.error).toBeFalsy();
        expect(result.setpoint).toBe(5);
        expect(result.setpoint2).toBe(10);        
    })
    
    test('SimpleExecute returns the right properties in CommandResult', async () => {
        var comm = MSC.Command.CreateOneSP(MSC.CommandType.GEN_V, 5.0);
        let result = await MSC.SimpleExecute(comm);
        expect(result).not.toBeNull();
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('value');
        expect(result).toHaveProperty('unit');
        expect(result.success).toBeTruthy();
        expect(result.message).not.toBeNull();
    })

    test('SimpleExecuteJSON returns the right properties in CommandResult', async () => {
        var comm = MSC.Command.CreateOneSP(MSC.CommandType.GEN_V, 5.0);
        let result = JSON.parse(await MSC.SimpleExecuteJSON(JSON.stringify(comm)));
        expect(result).not.toBeNull();
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('value');
        expect(result).toHaveProperty('unit');
        expect(result.success).toBeTruthy();
        expect(result.message).not.toBeNull();
    })
    
    test('MeterState tests', async () => {
        var state = new MeterState();
        state.mode = MSC.CommandType.Cu50_2W;
        expect(state.isMeasurement()).toBeTruthy();
        expect(state.isGeneration()).toBeFalsy();
        state.mode = MSC.CommandType.GEN_Cu100_2W
        expect(state.isMeasurement()).toBeFalsy();
        expect(state.isGeneration()).toBeTruthy();
    })
})

