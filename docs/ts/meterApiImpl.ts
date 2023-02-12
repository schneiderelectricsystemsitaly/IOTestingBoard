/*
 * This file contains the public API of the meter, i.e. the functions designed
 * to be called from third party code.
 * 1- Pair() : bool
 * 2- Execute(Command) : bool + JSON version
 * 3- Stop() : bool
 * 4- GetState() : array + JSON version
 * 5- SimpleExecute(Command) : returns the updated measurement or null
 */

import { Driver } from './Driver'
import { CommandResult } from './CommandResult'
import { Command } from './Command'
import { State } from './constants'
import { sleep, waitFor, waitForTimeout } from './utils'
import log from 'loglevel'

// Useful information for debugging, even if it should not be exposed
export const driver = new Driver()

/**
 * Returns a copy of the current state
 * @returns {array} status of meter
 */
export async function GetState (): Promise<any> {
  let ready = false
  let initializing = false
  switch (driver.btState.state) {
    // States requiring user input
    case State.ERROR:
    case State.STOPPED:
    case State.NOT_CONNECTED:
      ready = false
      initializing = false
      break
    case State.BUSY:
    case State.IDLE:
      ready = true
      initializing = false
      break
    case State.CONNECTING:
    case State.DEVICE_PAIRED:
    case State.METER_INIT:
    case State.METER_INITIALIZING:
    case State.SUBSCRIBING:
      initializing = true
      ready = false
      break
    default:
      ready = false
      initializing = false
  }
  return {
    lastSetpoint: { Value: driver.btState.lastMeasure.Setpoint_R, Units: 'Ohms', Timestamp: driver.btState.lastMeasure?.Timestamp },
    lastMeasure: { Value: driver.btState.lastMeasure.Actual_R, Units: 'Ohms', Timestamp: driver.btState.lastMeasure?.Timestamp },
    deviceName: driver.btState.btDevice ? driver.btState.btDevice.name : '',
    deviceSerial: '',
    deviceHwRev: driver.btState.meter?.hw_rev,
    deviceMode: driver.btState.meter?.mode,
    status: driver.btState.state,
    batteryLevel: driver.btState.meter?.battery,
    firmware: driver.btState.meter?.firmware,
    notification: driver.btState.lastMeasure,
    ip_address: driver.btState.meter?.ip_address,
    ready,
    initializing,
    stats: driver.btState.stats
  }
}

/**
 * Provided for compatibility with Blazor
 * @returns {string} JSON state object
 */
export async function GetStateJSON (): Promise<string> {
  return JSON.stringify(await GetState())
}

export async function SimpleExecuteJSON (jsonCommand: string): Promise<string> {
  const command = JSON.parse(jsonCommand)
  return JSON.stringify(await SimpleExecute(command))
}

/**
 * Execute a command and returns the measurement or setpoint with error flag and message
 * @param {Command} command
 */
export async function SimpleExecute (command: Command): Promise<CommandResult> {
  const SIMPLE_EXECUTE_TIMEOUT_S = 5
  const cr = new CommandResult()

  log.info('SimpleExecute called...')

  if (command === null) {
    cr.success = false
    cr.message = 'Invalid command'
    return cr
  }
  // Recreate the object as it may have lost methods due to JSON
  command = Command.CreateFourSP(command.type, command.setpoint, command.setpoint2, command.setpoint3, command.setpoint4)
  command.pending = true // In case caller does not set pending flag

  // Fail immediately if not paired.
  if (!driver.btState.started) {
    cr.success = false
    cr.message = 'Device is not paired'
    log.warn(cr.message)
    return cr
  }

  // Another command may be pending.
  if (driver.btState.command != null && driver.btState.command.pending) {
    cr.success = false
    cr.message = 'Another command is pending'
    log.warn(cr.message)
    return cr
  }

  // Wait for completion of the command, or halt of the state machine
  driver.btState.command = command
  if (command != null) {
    await waitForTimeout(() => !command.pending || driver.btState.state == State.STOPPED, SIMPLE_EXECUTE_TIMEOUT_S)
  }

  // Check if error or timeouts
  if (command.error || command.pending) {
    cr.success = false
    cr.message = 'Error while executing the command.'
    log.warn(cr.message)

    // Reset the active command
    driver.btState.command = null
    return cr
  }

  // State is updated by execute command, so we can use btState right away
  cr.value = driver.btState.lastMeasure.Setpoint_R
  if (cr.value == 0xFFFF) { cr.value = Infinity }

  cr.unit = 'Ohms'
  cr.secondary_value = driver.btState.lastMeasure.Actual_R
  if (cr.secondary_value == 0xFFFF) { cr.secondary_value = Infinity }

  cr.secondary_unit = 'Ohms'
  cr.success = true
  cr.message = 'Command executed successfully'
  return cr
}

/**
 * MUST BE CALLED FROM A USER GESTURE EVENT HANDLER
  * @returns {boolean} true if meter is ready to execute command
 * */
export async function Pair (forceSelection: boolean = false): Promise<boolean> {
  log.info('Pair(' + forceSelection + ') called...')

  driver.btState.options.forceDeviceSelection = forceSelection

  if (!driver.btState.started) {
    driver.btState.state = State.NOT_CONNECTED
    await driver.stateMachine() // Start it
  } else if (driver.btState.state == State.ERROR) {
    driver.btState.state = State.NOT_CONNECTED // Try to restart
  }
  await waitFor(() => driver.btState.state == State.IDLE || driver.btState.state == State.STOPPED)
  log.info('Pairing completed, state :', driver.btState.state)
  return (driver.btState.state != State.STOPPED)
}

/**
 * Stops the state machine and disconnects bluetooth.
 * */
export async function Stop (): Promise<boolean> {
  log.info('Stop request received')

  driver.btState.stopRequest = true
  await sleep(100)

  while (driver.btState.started || (driver.btState.state != State.STOPPED && driver.btState.state != State.NOT_CONNECTED)) {
    driver.btState.stopRequest = true
    await sleep(100)
  }
  driver.btState.command = null
  driver.btState.stopRequest = false
  log.warn('Stopped on request.')
  return true
}
