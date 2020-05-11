import React, {Component} from 'react';
import {connect} from 'react-redux';
import {NavLink} from 'react-router-dom';
import { Progress } from 'reactstrap';
import {InformationOutlineIcon} from 'mdi-react';

import Dot from '../../Others/Dot';
import * as actions from '../../../actions';
const tools = require('./../../../utils/tools');


class SyncingCard extends Component {
  constructor(props) {
    super(props);

  }



  render() {

    const progressBar = this.props.paymentChainSync;
    const daysLeft = this.props.initialBlockSyncDaysLeft;
    const estMinsToComplete = this.props.initialBlockSyncMinutesToComplete;
    const estMinsToCompleteStringified = tools.convertMinutesToDays(this.props.lang, this.props.initialBlockSyncMinutesToComplete);


    return (
        <div className="text-center pl-1 pr-1">
          <NavLink to="/coin/network" style={{ fontSize: '13px' }}  data-tip="View network stats">{`${this.props.lang.syncing} ${progressBar}%`}</NavLink>
            <Progress animated striped value={progressBar} color={this.props.blockChainConnected ? 'success'  : 'danger'} className="mt-2 mb-2" style={{borderRadius: 6, height: 6, width: `80%`, margin:`0 10%`}} />
            { this.props.initialDownload && (
              <div className="menu mt-1 mb-1 text-center">
              { daysLeft != -1  && (
                    <div>
                      <div style={{ fontSize: '10px' }}>{`${daysLeft} ${this.props.lang.daysbehindchain}`}</div>
                      { estMinsToComplete == -1 &&
                        (
                          <div className="text-warning"  style={{ fontSize: '10px' }}>{`${this.props.lang.calculatingesttocompletesync}`}</div>
                        )
                      }
                      { estMinsToComplete != -1 &&
                        (
                          <div className="text-warning"  style={{ fontSize: '10px' }}>{`${estMinsToCompleteStringified} ${this.props.lang.esttocompletesync}`}</div>
                        )
                      }
                    </div>
                  )
                }
              { daysLeft == -1  && (
                <div className="text-warning" style={{ fontSize: '10px' }}>{`${this.props.lang.calculatingdaysbehindchain}`}</div>
              ) }
            </div>
            )}
            <div style={{ fontSize: '13px' }}>{`${this.props.lang.activeConnections}: ${this.props.connections}`}</div>
            <div className="menu mt-0 mb-2 text-center">
              <Dot size={10} color={this.props.blockChainConnected ? 'success' : 'danger'} />
              { this.props.blockChainConnected && (<small className="text-success">
                { this.props.lang.blockchainConnected}
              </small>) }
              { !this.props.blockChainConnected && (<small className="text-danger">
                { this.props.lang.blockchainDisconnected }
              </small>) }
          </div>
      </div>
    );
  }


}

/*


*/

const mapStateToProps = state => {
  return {
    lang: state.startup.lang,
    connections: state.chains.connections,
    paymentChainSync: state.chains.paymentChainSync,
    daemonRunning: state.application.daemonRunning,
    wallet: state.application.wallet,
    initialDownload: state.chains.initialDownload,
    blockChainConnected: state.application.blockChainConnected,
    initialBlockSyncMinutesToComplete: state.chains.syncMinutesToComplete,
    initialBlockSyncAverageDays: state.chains.syncAverageDays,
    initialBlockSyncDaysLeft: state.chains.syncDaysLeft
  };
};

export default connect(mapStateToProps, actions, null, { withRef: true })(SyncingCard);
