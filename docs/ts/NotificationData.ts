// Must match with __get_notification_data in boardbt.py firmware code.
export class NotificationData {
    WiFi: number=0
    Relay: number=0
    Bluetooth: number=0
    Frequency: number=0
    Verbose: boolean=false
    Test: boolean=false
    V_with_load: boolean=false
    LastResult: boolean=false
    Actual_R: number=0
    Setpoint_R: number=0
    Memfree: number=0
    Errors: number=0
    Battery: number=0
    constructor() {

    }
    static parse (buf:ArrayBuffer) {
        var output:NotificationData = new NotificationData()

        var dv:DataView=new DataView(buf)
        var status1:number = dv.getUint8(1)
        var status2:number = dv.getUint8(0)
        output.WiFi = (status1 >> 6) & 3
        output.Relay = (status1 >> 4) & 3
        output.Bluetooth = (status1 >> 1) & 7
        output.Frequency = (status2 >> 5) & 3
        output.Verbose = (status2 & 8) !=0
        output.Test = (status2 & 4) != 0
        output.V_with_load = (status2 & 2) != 0
        output.LastResult = (status2 & 1) != 0
        output.Actual_R = dv.getUint16(2)
        output.Setpoint_R = dv.getUint16(4)
        output.Memfree = dv.getUint32(6)
        output.Errors = dv.getUint8(10)
        output.Battery = dv.getUint8(11)
        return output
    }
}