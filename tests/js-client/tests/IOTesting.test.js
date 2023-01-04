const IOTesting = require('../iotesting');

describe('Basic API tests, without simulation', () => {
    test('API functions exists', () => {
        expect(IOTesting.Start).not.toBeNull();
        expect(IOTesting.Stop).not.toBeNull();
        expect(IOTesting.btState).not.toBeNull();
        expect(IOTesting.State).not.toBeNull();
        expect(IOTesting.SetLogLevel).not.toBeNull();
    })
    test('btState has the right properties', async () => {
        let data = IOTesting.btState;
        expect(data).not.toBeNull();
        expect(data).toHaveProperty('state');
        expect(data).toHaveProperty('prev_state');
        expect(data).toHaveProperty('started');
        expect(data).toHaveProperty('stopRequest');
        expect(data).toHaveProperty('response');
        expect(data).toHaveProperty('responseTimeStamp');
        expect(data).toHaveProperty('parsedResponse');
        expect(data).toHaveProperty('formattedResponse');
        expect(data).toHaveProperty('charRead');
        expect(data).toHaveProperty('btService');
        expect(data).toHaveProperty('btDevice');
        expect(data).toHaveProperty('stats');
    })
})

