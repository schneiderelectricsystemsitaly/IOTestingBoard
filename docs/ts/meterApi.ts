import { State, CommandType, BlueToothIOTUUID } from './constants'
import { Command } from './Command'
import { setLevel, levels } from 'loglevel'
import { Stop, Pair, Execute, SimpleExecute, GetState, GetStateJSON, ExecuteJSON, SimpleExecuteJSON, driver } from './meterPublicAPI'

// Defines default level on startup
setLevel(levels.ERROR, true)

export { Stop, Pair, Execute, SimpleExecute, GetState, GetStateJSON, ExecuteJSON, SimpleExecuteJSON, driver, Command, CommandType, setLevel, State, BlueToothIOTUUID }
