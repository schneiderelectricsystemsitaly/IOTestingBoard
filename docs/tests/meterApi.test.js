const MeterState = require('../classes/MeterState');
const MSC = require('../meterApi');
var CommandType = MSC.CommandType;

describe('Basic API tests, without simulation', () => {
    test('API functions exists', () => {
        expect(MSC.Pair).not.toBeNull();
        expect(MSC.Execute).not.toBeNull();
        expect(MSC.Stop).not.toBeNull();
        expect(MSC.GetState).not.toBeNull();
        expect(MSC.SimpleExecute).not.toBeNull();
    })

    test('JSON API functions exists', () => {
        expect(MSC.ExecuteJSON).not.toBeNull();
        expect(MSC.GetStateJSON).not.toBeNull();
        expect(MSC.SimpleExecuteJSON).not.toBeNull();
    })
    
    test('API exports exists', () => {
        expect(MSC.Command).not.toBeNull();
        expect(MSC.CommandType).not.toBeNull();
        expect(MSC.log).not.toBeNull();
    })
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
        
    test('Pair fails (not in browser)', async () => {
        const result = await MSC.Pair(false);
        // Will fail without navigator object
        expect(result).toBeFalsy();

        const data = await MSC.GetState();
        expect(data.status).toBe(MSC.State.STOPPED);
        expect(data.ready).toBeFalsy();
        expect(data.initializing).toBeFalsy();

        const result2 = await MSC.Pair(true);
        // Will fail without navigator object
        expect(result2).toBeFalsy();

        const data2 = await MSC.GetState();
        expect(data2.status).toBe(MSC.State.STOPPED);
        expect(data2.ready).toBeFalsy();
        expect(data2.initializing).toBeFalsy();
    })
    
    test('Measurement execution fails', async () => {
        const command = MSC.Command.CreateNoSP(MSC.CommandType.V);
        const result = await MSC.Execute(command);
        expect(result).not.toBeNull();
        expect(result.setpoint).toBe(null);
        expect(result.setpoint2).toBe(null);
        // Will stay pending since the state machine is not running
        expect(result.pending).toBeTruthy();
    })
    
    test('Generation execution fails', async () => {
        const command = MSC.Command.CreateOneSP(MSC.CommandType.GEN_V, 1.23);
        expect(command.setpoint).toBe(1.23);
        expect(command.setpoint2).toBe(null);
        try
        {
            const result = await MSC.Execute(command);
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
            const command = MSC.Command.CreateNoSP(CommandType[ctype]);
            const info = command.defaultSetpoint();
            expect(info).not.toBeNull();
            const test = command.isGeneration() || command.isMeasurement() || command.isSetting() || !command.isValid();
            expect(test).toBeTruthy();
        }
        var comm = MSC.Command.CreateOneSP(MSC.CommandType.GEN_V, 1);
        expect(comm.isGeneration()).toBeTruthy();
        expect(comm.setpoint).toBe(1.0);
        comm = MSC.Command.CreateNoSP(MSC.CommandType.mA_passive);
        expect(comm.isMeasurement()).toBeTruthy();
        expect(comm.setpoint).toBe(null);
        expect(comm.setpoint2).toBe(null);
        comm = MSC.Command.CreateOneSP(MSC.CommandType.SET_Ulow, 0);
        expect(comm.isSetting()).toBeTruthy();
        expect(comm.setpoint).toBe(0);
        expect(comm.setpoint2).toBe(null);
    })

    test('Non-null refreshed properties of GetState', async () => {
        const data = await MSC.GetState();
        expect(data.lastMeasure).not.toBeNull();
        expect(data.lastSetpoint).not.toBeNull();
        expect(typeof data.lastMeasure).toBe('object');
        expect(typeof data.lastSetpoint).toBe('object');
    })

    test('JSON Execute works', async () => {
        var comm = MSC.Command.CreateOneSP(MSC.CommandType.GEN_V, 5.0);
        var result = JSON.parse(await MSC.ExecuteJSON(JSON.stringify(comm)));
        expect(result).toHaveProperty('error');
        expect(result).toHaveProperty('pending');
        expect(result).toHaveProperty('setpoint');
        expect(result.pending).toBeTruthy();
        expect(result.setpoint).toBe(5.0);
        expect(result.setpoint2).toBe(null);

        comm = MSC.Command.CreateTwoSP(MSC.CommandType.GEN_PulseTrain, 5, 10);
        result = JSON.parse(await MSC.ExecuteJSON(JSON.stringify(comm)));

        expect(result).toHaveProperty('error');
        expect(result).toHaveProperty('pending');
        expect(result).toHaveProperty('setpoint');
        expect(result.pending).toBeTruthy();
        expect(result.setpoint).toBe(5);
        expect(result.setpoint2).toBe(10);
        
    })
    
    test('SimpleExecute returns the right properties', async () => {
        var comm = MSC.Command.CreateOneSP(MSC.CommandType.GEN_V, 5.0);
        let result = await MSC.SimpleExecute(comm);
        expect(result).not.toBeNull();
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('value');
        expect(result).toHaveProperty('unit');
        expect(result.success).toBeFalsy();
        expect(result.message).not.toBeNull();
    })

    test('SimpleExecuteJSON returns the right properties', async () => {
        var comm = MSC.Command.CreateOneSP(MSC.CommandType.GEN_V, 5.0);
        let result = JSON.parse(await MSC.SimpleExecuteJSON(JSON.stringify(comm)));
        expect(result).not.toBeNull();
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('value');
        expect(result).toHaveProperty('unit');
        expect(result.success).toBeFalsy();
        expect(result.message).not.toBeNull();
    })

    test('SimpleExecuteJSON returns the right properties', async () => {
        var comm = MSC.Command.CreateOneSP(MSC.CommandType.Cu100_2W, 5.0);
        let result = JSON.parse(await MSC.SimpleExecuteJSON(JSON.stringify(comm)));
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

