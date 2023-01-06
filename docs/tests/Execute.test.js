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

jest.setTimeout(60 * 1000);

describe('Executing commands with simulated device', () => {
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
    
    test('JSON Execute works with Command returned', async () => {
        // Now loop through all possible commands
        for(ctype in MSC.CommandType) 
        {
            var comm = MSC.Command.CreateTwoSP(MSC.CommandType[ctype], 5.0, 1.2);
            if (comm.isGeneration() || comm.isMeasurement())
            {
                if (comm.type == MSC.CommandType.GEN_Frequency)
                    continue; // Missing trace

                let result = JSON.parse(await MSC.ExecuteJSON(JSON.stringify(comm)));

                expect(result).toHaveProperty('error');
                expect(result).toHaveProperty('pending');
                expect(result).toHaveProperty('setpoint');
                expect(result.pending).toBeFalsy();
                expect(result.error).toBeFalsy();
                if (comm.isGeneration())
                {
                    expect(result.setpoint).toBe(5);
                    expect(result.setpoint2).toBe(1.2);
                }
            }
        }
    })
    
  
    test('SimpleExecuteJSON test will all commands', async () => { 
        for(ctype in MSC.CommandType) 
        {
            var comm = MSC.Command.CreateOneSP(MSC.CommandType[ctype], 5.0);
            if (comm.isGeneration() || comm.isMeasurement())
            {
                if (comm.type == MSC.CommandType.GEN_Frequency)
                    continue; // Missing trace

                let result = JSON.parse(await MSC.SimpleExecuteJSON(JSON.stringify(comm)));
                expect(result).not.toBeNull();
                expect(result).toHaveProperty('success');
                expect(result).toHaveProperty('message');
                expect(result).toHaveProperty('value');
                expect(result).toHaveProperty('unit');
                if (comm.isGeneration())
                {
                    expect(result).toHaveProperty('secondary_unit');
                    expect(result).toHaveProperty('secondary_value');
                }
                expect(result.success).toBeTruthy();
                expect(result.message).not.toBeNull();
            }
        }
    })
})

