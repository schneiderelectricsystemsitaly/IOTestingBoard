const MeterState = require('../js/MeterState');
const IOTBoard = require('../js/meterApi');
var CommandType = IOTBoard.CommandType;

describe('Basic API tests, without simulation', () => {
    test('API functions exists', () => {
        expect(IOTBoard.Pair).not.toBeNull();
        expect(IOTBoard.Stop).not.toBeNull();
        expect(IOTBoard.GetState).not.toBeNull();
        expect(IOTBoard.SimpleExecute).not.toBeNull();
    })

    test('JSON API functions exists', () => {
        expect(IOTBoard.GetStateJSON).not.toBeNull();
        expect(IOTBoard.SimpleExecuteJSON).not.toBeNull();
    })
    
    test('API exports exists', () => {
        expect(IOTBoard.Command).not.toBeNull();
        expect(IOTBoard.CommandType).not.toBeNull();
        expect(IOTBoard.CommandResult).not.toBeNull();
        expect(IOTBoard.log).not.toBeNull();
    })
    test('GetState returns the right properties', async () => {
        let data = await IOTBoard.GetState();
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

        let datajson = await IOTBoard.GetStateJSON();
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
        const data = await IOTBoard.GetState();
        expect(data.status).toBe(IOTBoard.State.NOT_CONNECTED);
        expect(data.ready).toBeFalsy();
        expect(data.initializing).toBeFalsy();
    })

    test('Stops succeeds', async () => {
        const result = await IOTBoard.Stop();
        expect(result).toBeTruthy();

        const data = await IOTBoard.GetState();
        expect(data.status).toBe(IOTBoard.State.NOT_CONNECTED);
        expect(data.ready).toBeFalsy();
        expect(data.initializing).toBeFalsy();
    })
        
    test('Pair fails (not in browser)', async () => {
        const result = await IOTBoard.Pair(false);
        // Will fail without navigator object
        expect(result).toBeFalsy();

        const data = await IOTBoard.GetState();
        expect(data.status).toBe(IOTBoard.State.STOPPED);
        expect(data.ready).toBeFalsy();
        expect(data.initializing).toBeFalsy();

        const result2 = await IOTBoard.Pair(true);
        // Will fail without navigator object
        expect(result2).toBeFalsy();

        const data2 = await IOTBoard.GetState();
        expect(data2.status).toBe(IOTBoard.State.STOPPED);
        expect(data2.ready).toBeFalsy();
        expect(data2.initializing).toBeFalsy();
    })
    
    test('Generation execution fails', async () => {
        const command = IOTBoard.Command.CreateOneSP(IOTBoard.CommandType.GEN_V, 1.23);
        expect(command.setpoint).toBe(1.23);
        expect(command.setpoint2).toBe(null);
        try
        {
            const result = await IOTBoard.Execute(command);
            expect(result).not.toBeNull();
            // Will stay pending since the state machine is not running
            expect(result.pending).toBeTruthy();
        }
        catch(e)
        {
          // Will throw without Pair   
        }
    })   

    test('Command.getDefaultSetpoint and Command properties', async () => {
        for(var ctype in CommandType) {
            const command = IOTBoard.Command.CreateNoSP(CommandType[ctype]);
            const info = command.defaultSetpoint();
            expect(info).not.toBeNull();
            const test = command.isGeneration() || command.isMeasurement() || command.isSetting() || !command.isValid();
            expect(test).toBeTruthy();
        }
        var comm = IOTBoard.Command.CreateOneSP(IOTBoard.CommandType.COMMAND_MODE_RESISTORS, 1000);
        expect(comm.isGeneration()).toBeTruthy();
        expect(comm.setpoint).toBe(1000.0);
        comm = IOTBoard.Command.CreateNoSP(IOTBoard.CommandType.COMMAND_MODE_METER);
        expect(comm.setpoint).toBe(null);
        expect(comm.setpoint2).toBe(null);
    })

    test('Non-null refreshed properties of GetState', async () => {
        const data = await IOTBoard.GetState();
        expect(data.lastMeasure).not.toBeNull();
        expect(data.lastSetpoint).not.toBeNull();
        expect(typeof data.lastMeasure).toBe('object');
        expect(typeof data.lastSetpoint).toBe('object');
    })
    
    test('SimpleExecute returns the right properties', async () => {
        var comm = IOTBoard.Command.CreateOneSP(IOTBoard.CommandType.GEN_V, 5.0);
        let result = await IOTBoard.SimpleExecute(comm);
        expect(result).not.toBeNull();
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('value');
        expect(result).toHaveProperty('unit');
        expect(result.success).toBeFalsy();
        expect(result.message).not.toBeNull();
    })

    test('SimpleExecuteJSON returns the right properties', async () => {
        var comm = IOTBoard.Command.CreateOneSP(IOTBoard.CommandType.GEN_V, 5.0);
        let result = JSON.parse(await IOTBoard.SimpleExecuteJSON(JSON.stringify(comm)));
        expect(result).not.toBeNull();
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('value');
        expect(result).toHaveProperty('unit');
        expect(result.success).toBeFalsy();
        expect(result.message).not.toBeNull();
    })

    test('SimpleExecuteJSON returns the right properties', async () => {
        var comm = IOTBoard.Command.CreateOneSP(IOTBoard.CommandType.Cu100_2W, 5.0);
        let result = JSON.parse(await IOTBoard.SimpleExecuteJSON(JSON.stringify(comm)));
        expect(result).not.toBeNull();
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('value');
        expect(result).toHaveProperty('secondary_unit');
        expect(result).toHaveProperty('secondary_value');
        expect(result).toHaveProperty('unit');
        expect(result.success).toBeFalsy();
        expect(result.message).not.toBeNull();
    })
})

