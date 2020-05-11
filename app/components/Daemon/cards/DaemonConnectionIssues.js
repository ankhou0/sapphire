import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Button, Card, CardText, CardTitle} from 'reactstrap';
import * as actions from '../../../actions';

const DaemonState = require('../../../reducers/state_managers/DaemonState');


class DaemonConnectionIssues extends Component {
  constructor(props) {
    super(props);

  }


  daemonInvalidHeader(){
    return
    (
      <div>
      <Card body inverse className="bg-gradient-orange standout mb-5">
        <CardTitle>{ this.props.lang.walletLocked }</CardTitle>
        <CardText>{ this.props.lang.walletLockedDescription }</CardText>
        <div className="d-flex justify-content-end">
        </div>
      </Card>
    </div>

    );
  }

  daemonRPCFailureDays(){
   return
      (
        <div>
        <Card body inverse className="bg-gradient-orange standout mb-5">
          <CardTitle>{ this.props.lang.walletLocked }</CardTitle>
          <CardText>{ this.props.lang.walletLockedDescription }</CardText>
          <div className="d-flex justify-content-end">
          </div>
        </Card>
      </div>

      );
  }

  content(){


  }

  statusTitle(){
    switch(this.props.daemon.DaemonOverallRunningState) {
      case DaemonState.DaemonRunningStates.RUNNING_NO_ERRORS:
        return this.props.lang.daemonHealthStatusTitleRunningNoErrors;
      case DaemonState.DaemonRunningStates.RUNNING_WITH_RPC_ERROR:
        return this.props.lang.daemonHealthStatusTitleRunningRPCErrors;
      case DaemonState.DaemonRunningStates.RUNNING_WITH_LOG_ERROR:
        return this.props.lang.daemonHealthStatusTitleRunningLogErrors;
      case DaemonState.DaemonRunningStates.NOT_RUNNING:
        return this.props.lang.daemonHealthStatusTitleNotRunning;
      default:
        return this.props.lang.daemonHealthStatusTitleUnknown;
    }
  }

  cardClassState(){
    switch(this.props.daemon.DaemonOverallRunningState) {
      case DaemonState.DaemonRunningStates.RUNNING_NO_ERRORS:
        return "bg-gradient-green";
      case DaemonState.DaemonRunningStates.RUNNING_WITH_RPC_ERROR:
        return "bg-gradient-red";
      case DaemonState.DaemonRunningStates.RUNNING_WITH_LOG_ERROR:
        return "bg-gradient-red";
      case DaemonState.DaemonRunningStates.NOT_RUNNING:
        return "bg-gradient-red";
      default:
        return "bg-gradient-orange";
    }
  }

  render() {
    //don't render if there are no issues
    if (this.props.daemon.DaemonOverallRunningState === DaemonState.DaemonRunningStates.RUNNING_NO_ERRORS) return null;
    var cardClassState = this.cardClassState();

    return (
      <div>
        <Card body inverse className={`${cardClassState} standout mb-5`}>
          <CardTitle><b>Daemon Health Status Report:</b> {this.statusTitle()}</CardTitle>
          <CardText>{this.content()}</CardText>
        </Card>
      </div>
    );
  }
}

const mapStateToProps = state => {
  return {
    lang: state.startup.lang,
    wallet: state.application.wallet,
    staking: state.chains.isStaking,
    daemon: state.daemonState
  };
};


export default connect(mapStateToProps, actions, null, {pure:  false })(DaemonConnectionIssues);
