import { State, CommandType, BoardMode } from './constants'
import { Command } from './Command'
import { setLevel, levels } from 'loglevel'
import { Stop, Pair, SimpleExecute, GetState, GetStateJSON, SimpleExecuteJSON, driver } from './meterApiImpl'
import { CommandResult } from './CommandResult'

// Defines default level on startup
setLevel(levels.ERROR, true)

export { Stop, Pair, SimpleExecute, GetState, GetStateJSON, SimpleExecuteJSON, driver, Command, CommandType, CommandResult, setLevel, State, BoardMode }
