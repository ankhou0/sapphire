import * as tools from '../../utils/tools';
const Queue = require('../../utils/queue');

const DaemonRunningStates = {
      UNKNOWN : 0,
      RUNNING_NO_ERRORS: 1,
      RUNNING_WITH_RPC_ERROR: 2,
      RUNNING_WITH_LOG_ERROR: 3,
      NOT_RUNNING: 4,
  };

const DaemonChainErrors = {
        BAD_PREV_BLOCK : 0
  };

const ECC_BLOCK_ONE_EPOCH = 1394168460000; //epoch timestamp * 1000 to match JS Date.now() returning epoch milliseconds

const updateTipPattern = /date=([0-9]+)\-([0-9]+)\-([0-9]+) ([0-9]+):([0-9]+):([0-9]+)/g;

const DaemonSyncMode = {
        NOT_SYNCING: 0,
        INITIAL_BLOCK_DOWNLOAD: 1,
        SYNCING: 2,
        ERROR: 3
  };

const DaemonProcessHealth = {
      UNKNOWN : 0,
      HEALTHY : 1,
      FAILING : 2
  };

const StateUpdateActions = {
      HEARTBEAT : 0,
      RPC_UPDATE : 1,
      LOG_UPDATE : 2,
      VERSION_UPDATE: 3
  };

const StatePayloadTypes = {
      LOG_MESSAGE_BATCH : 0,
      GET_BLOCK_SUCCESS : 1,
      GET_BLOCK_FAILURE : 2
  };

const MAX_ERROR_COUNT = 5;
const HEARTBEAT_INTERVAL = 5 * 60 * 1000; //5 mins in ms

const captureErrorStrings = [
        'Corrupted block database detected',
        'Aborted block database rebuild. Exiting.',
        'initError: Cannot obtain a lock on data directory ',
        'ERROR: VerifyDB():',
        'Internal Server Error'
      ];

const captureLoadingStrings = [
        'Block Import: already had block',
        'init message',
        'Still rescanning'
      ];

const captureSuccessStrings = [
    'UpdateTip:'
      ];

const initialState =
    {
      //DAEMON
      lastRPCErrorTime : 0,
      lastRPCSuccessTime : 0,
      lastRPCTime : 0,
      lastLogErrorTime : 0,
      lastLogSuccessTime : 0,
      lastLogTime : 0,
      RPCState : DaemonProcessHealth.UNKNOWN,
      LogState : DaemonProcessHealth.UNKNOWN,
      DaemonOverallRunningState : DaemonRunningStates.UNKNOWN,
      DaemonSyncState : DaemonSyncMode.NOT_SYNCING,

      //DAEMON
      daemonVersion : "0.0.0.0",
      //LOG ANALYSIS DATA
      currentBlockEpochTime : 0,
      LogSyncPercent : 0,
      LogSyncMinsToComplete : 0,
      LogSyncAverageDaysPerMin : 0,
      lastUpdateTipTime : 0,
      lastPeerConnectionTime : 0,
      badBlockReceived : 0,


      //RPC RETURN DATA
      blocks : 0,
      headers : 0,
      RPCSyncPercent : 0,
      sizeOnDisk : 0,
      initialBlockMode: false,

      //STATE LOGIC
      DaysSyncedPerMinAverageQueue : new Queue(),
      DaysTillHeadOfChain : 0,
      DaysBetweenGenesisAndNow: 0
    };

class DaemonState {

  static get DaemonRunningStates() {
    return DaemonRunningStates;
  }

  static get DaemonChainErrors() {
    return DaemonChainErrors;
  }

  static get DaemonSyncMode() {
    return DaemonSyncMode;
  }

  static get DaemonProcessHealth() {
    return DaemonProcessHealth;
  }

  static get StateUpdateActions() {
    return StateUpdateActions;
  }

  static get StatePayloadTypes() {
    return StatePayloadTypes;
  }

  static get captureErrorStrings() {
    return captureErrorStrings;
  }

  static get captureLoadingStrings() {
    return captureLoadingStrings;
  }

  static get initialState() {
    return initialState;
  }


  static handleDaemonStateChange(state, action, payload_type, payload){
      switch(action){
        case StateUpdateActions.HEARTBEAT:
            state = this.heartbeat(state);
            break;
        case StateUpdateActions.RPC_UPDATE:
            state = this.handleDaemonRPC(state, payload_type, payload);
            break;
        case StateUpdateActions.LOG_UPDATE:
            state = this.handleDaemonLogMessages(state, payload_type, payload);
            break;
        case StateUpdateActions.VERSION_UPDATE:
            state = this.handleStateUpdate(state, payload);
            break;
      }
      state = this.computeOverallHealth(state);
      return state;
  }

  static handleStateUpdate(state, payload){
    //need to strip off the v from the start
    console.log("payload " + payload);
    state.daemonVersion = payload.replace("v", "");
    console.log(state);
    return state;
  }

  static handleDaemonLogMessages(state, payload_type, payload) {
    if(payload_type === StatePayloadTypes.LOG_MESSAGE_BATCH){
        var messagesAsArray = payload.store; //payload is a Queue
        var stack = messagesAsArray.reverse(); //bring the last in message to the front, inverse order of the queue
        for(var i = 0; i < stack.length; i++){
            var message = stack[i];
            if (captureErrorStrings.some((v) => { return message.indexOf(v) > -1; })) {
              state = this.handleDaemonErrorLogMessages(state, message);
              break;
            }
            if (captureLoadingStrings.some((v) => { return message.indexOf(v) > -1; }) || captureSuccessStrings.some((v) => { return message.indexOf(v) > -1; })) {
              state = this.handleDaemonSuccessLogMessages(state, message);
              break;
            }
            console.log("Did not process: " + message);
        }
       return state;
    }else {
      //unsupported currently, all messages will come in batch.
      return state;
    }
  }

  static handleDaemonErrorLogMessages(state, message) {
    console.log("Handing Daemon Log Error");
    state = this.updateLogState(state, true);
    //do we want to build in specific notifications based on error types?... explore options with invalid block header
    return state;
  }

  static handleDaemonSuccessLogMessages(state, message) {
    console.log("Handing Daemon Log Success");
    state = this.updateLogState(state, false);

    //what more could we derive from a successful log? peer counts?
    if (message.includes('UpdateTip:')){
      state = this.updateTip(state, message);
    }

    return state;
  }


  static handleDaemonRPC(state, payload_type, payload){
    var success_states = [StatePayloadTypes.GET_BLOCK_SUCCESS]; //expand in the future
    var failure_states = [StatePayloadTypes.GET_BLOCK_FAILURE];

    if(success_states.includes(payload_type) ){
      state = this.handleDaemonRPCSuccessMessages(state, payload);
      state = this.updateRPCState(state, false);

    }
    if(failure_states.includes(payload_type) ){
      state = this.handleDaemonRPCErrorMessages(state, payload);
      state = this.updateRPCState(state, true);
    }
    return state;
  }

  static handleDaemonRPCSuccessMessages(state, payload){
     state.blocks = payload.blocks === undefined ? state.blocks : payload.blocks;
     state.headers = payload.headers === undefined ? state.headers : payload.headers;
     state.initialBlockMode = payload.initialblockdownload === undefined ? state.initialBlockMode : payload.initialblockdownload ;
     state.sizeOnDisk = payload.size_on_disk === undefined ? state.sizeOnDisk : payload.size_on_disk;
     state = this.calcPercentage(state);
     return state;
  }


  static handleDaemonRPCErrorMessages(state, err){
    //in the future we could looking into err.message / err.body and update state accordingly to track types of errors?
    //for now, return the current state.
    return state;
  }

  static calcPercentage(state){

    var blocksPercent = (((state.blocks * 100) / state.headers) * 100) / 100;
    var blockSyncPercent = (state.blocks === 0 || state.headers === 0 ? 0 : blocksPercent);
    state.RPCSyncPercent = blockSyncPercent.toFixed(2);

    //calc percentage along the path from genesis block 1, to now.
    var epochPercent = ((state.DaysBetweenGenesisAndNow - state.DaysTillHeadOfChain) / state.DaysBetweenGenesisAndNow) * 100;
    state.LogSyncPercent = (epochPercent === undefined  || isNaN(epochPercent)) ? 0 : epochPercent.toFixed(2);

    return state;
  }

  static updateRPCState(state, failing){
    var dtNow = Date.now();
    state.lastRPCTime = dtNow;
    if(failing && state.RPCState != DaemonProcessHealth.FAILING){
      state.RPCState = DaemonProcessHealth.FAILING;
      state.lastRPCErrorTime = dtNow;
    }else if(!failing && state.RPCState != DaemonProcessHealth.HEALTHY){
      state.RPCState = DaemonProcessHealth.HEALTHY;
      state.lastRPCSuccessTime = dtNow;
    }
    return state;
  }

  static updateLogState(state, failing){
    var dtNow = Date.now();
    state.lastLogTime = dtNow;
    if(failing && state.LogState != DaemonProcessHealth.FAILING){
      state.LogState = DaemonProcessHealth.FAILING;
      state.lastLogErrorTime = dtNow;
    }else if(!failing && state.LogState != DaemonProcessHealth.HEALTHY){
      state.LogState = DaemonProcessHealth.HEALTHY;
      state.lastLogSuccessTime = dtNow;
    }
    return state;
  }

  static heartbeat(state) {
      var dtNow = Date.now();
      if((dtNow - state.lastLogTime) >= HEARTBEAT_INTERVAL) {
        console.log("Daemon log heartbeat check failed. Setting health to FAILED.");
        state.LogState = DaemonProcessHealth.FAILING;
      }
      if((dtNow - state.lastRPCTime) >= HEARTBEAT_INTERVAL) {
        console.log("Daemon RPC heartbeat check failed. Setting health to FAILED.");
        state.RPCState = DaemonProcessHealth.FAILING;
      }
      return state;
  }


  static computeOverallHealth(state){
      if ((state.RPCState == DaemonProcessHealth.FAILING || state.RPCState == DaemonProcessHealth.UNKNOWN) && (state.LogState == DaemonProcessHealth.FAILING || state.LogState == DaemonProcessHealth.UNKNOWN)){
        state.DaemonOverallRunningState = DaemonRunningStates.NOT_RUNNING;
      }else if((state.RPCState == DaemonProcessHealth.FAILING || state.RPCState == DaemonProcessHealth.UNKNOWN) && state.LogState == DaemonProcessHealth.HEALTHY){
        console.log("running with rpc error");
        state.DaemonOverallRunningState = DaemonRunningStates.RUNNING_WITH_RPC_ERROR;
      }else if(state.RPCState == DaemonProcessHealth.HEALTHY && (state.LogState == DaemonProcessHealth.FAILING || state.LogState == DaemonProcessHealth.UNKNOWN)){
        console.log("running with log error");
        state.DaemonOverallRunningState = DaemonRunningStates.RUNNING_WITH_LOG_ERROR;
      }else if(state.RPCState == DaemonProcessHealth.HEALTHY && state.LogState == DaemonProcessHealth.HEALTHY){
        state.DaemonOverallRunningState = DaemonRunningStates.RUNNING_NO_ERRORS;
      }else{
        state.DaemonOverallRunningState = DaemonRunningStates.UNKNOWN;
      }
      console.log(state);
      return state;
  }

  static daemonSyncStatus(state, sync_type) {
    if(!state.initialBlockMode && sync_type == DaemonSyncMode.SYNCING) {
      state.DaemonSyncState = DaemonSyncMode.SYNCING;
    }
    else if(sync_type == DaemonSyncMode.ERROR){
      state.DaemonSyncMode = DaemonSyncMode.ERROR;
    }
    else if(state.initialBlockMode) {
      state.DaemonSyncState = DaemonSyncMode.INITIAL_BLOCK_DOWNLOAD;
    }
    return state;
  }


  static updateTip(state, updateTipMessage) {
    var dtNow = Date.now();
    state.lastUpdateTipTime = dtNow;
    var updateTipDate = tools.searchString(updateTipMessage, updateTipPattern);
    if (updateTipDate.length > 0) {
      if (updateTipDate[0].length > 0){
         state = this.daemonSyncStatus(state, DaemonSyncMode.SYNCING);
         var dtUpdateTip = Date.UTC(updateTipDate[0][1], updateTipDate[0][2]-1, updateTipDate[0][3], updateTipDate[0][4], updateTipDate[0][5], updateTipDate[0][6]);
         state.currentBlockEpochTime = dtUpdateTip;
         var diffTime = Math.abs(dtNow - dtUpdateTip);
         var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
         if(state.DaysTillHeadOfChain === 0){
          state.DaysTillHeadOfChain = diffDays;
         }else{
           state.DaysSyncedPerMinAverageQueue.enqueue(Math.abs(state.DaysTillHeadOfChain - diffDays));
           state.DaysTillHeadOfChain = diffDays;
         }
         var totalTimeSinceGenesis = Math.abs(dtNow - ECC_BLOCK_ONE_EPOCH);
         var totalDaysSinceGenesis = Math.ceil(totalTimeSinceGenesis / (1000 * 60 * 60 * 24));
         state.DaysBetweenGenesisAndNow = totalDaysSinceGenesis;
         //given we have an updateTip, let's try calculate a percentage of progress
         state = this.calcPercentage(state);
         //smooth the average out over time
         if(state.DaysSyncedPerMinAverageQueue.size() >= 5){
            var queueCopy = state.DaysSyncedPerMinAverageQueue.clone();
            var average = 0;
            var count = queueCopy.size();
            state.DaysSyncedPerMinAverageQueue = new Queue();
            /*while(queueCopy.size() > 0){
              var val = queueCopy.dequeue();
              if (val !== null){
                average += val;
              }
            }*/
            average = tools.median(queueCopy.store);
            state.LogSyncAverageDaysPerMin = average;

            //as this calculation is performed every minute, then this is an average mins till we reach 0 days till head
            state.LogSyncMinsToComplete = Math.floor(state.DaysTillHeadOfChain / average);
         }
      }else{
        console.log("invalid format of updateTipDate: " + updateTipDate[0]);
      }
    } else{
      console.log("error with finding date line in updateTip message.")
    }
    return state;
  }

}

module.exports = DaemonState;

