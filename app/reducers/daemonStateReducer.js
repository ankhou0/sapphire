import {SET_DAEMON_STATE} from '../actions/types';

const DaemonState = require('./state_managers/DaemonState');
const INITIAL_STATE = DaemonState.initialState;

export default(state = INITIAL_STATE, action) => {
  if (action.type == SET_DAEMON_STATE) {
    return action.payload;
  }
  return state;
};
