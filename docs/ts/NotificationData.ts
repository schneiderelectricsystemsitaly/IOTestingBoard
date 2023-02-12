import { noConflict } from 'loglevel'

// Must match with __get_notification_data in boardbt.py firmware code.
export class NotificationData {
  WiFi: number = 0
  Relay: number = 0
  Bluetooth: number = 0
  Frequency: number = 0
  Verbose: boolean = false
  Test: boolean = false
  V_with_load: boolean = false
  LastResult: boolean = false
  Actual_R: number = -1
  Setpoint_R: number = -1
  Memfree: number = 0
  Error: boolean = false
  CommandCpt: number = 0
  Timestamp: Date = new Date()
  constructor () {

  }
}
