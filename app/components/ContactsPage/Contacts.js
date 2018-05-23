import $ from 'jquery';
import React, { Component } from 'react';
import TransitionGroup from 'react-transition-group/TransitionGroup';
import { traduction } from '../../lang/lang';
const homedir = require('os').homedir();
import * as actions from '../../actions';
import { connect } from 'react-redux';
import AddressBook from '../SendTransactions/AddressBook';
import low from '../../utils/low';
import Input from '../Others/Input';
const Tools = require('../../utils/tools');


class Contacts extends Component {
  constructor(props) {
    super(props);
    this.addContact = this.addContact.bind(this);
    this.addNormalAddress = this.addNormalAddress.bind(this);
    this.resetFields = this.resetFields.bind(this);
    this.addingContact = false;
  }

  componentDidMount(){
    if(this.props.newContactName)
      TweenMax.set('#addressNamePlaceHolder', {autoAlpha: 0});
  }

  addContact(){
    if(this.props.newContactName === ""){
      Tools.highlightInput("#inputName, #inputAddressVal", 1000)
    }
    else{
      this.addNormalAddress();
    }
  }

  componentWillUnmount(){
    this.props.setAddingContact(false);
  }

  addressAlreadyExists(){
    TweenMax.fromTo('#addressExists', 0.2, {autoAlpha: 0, scale: 0.5}, {autoAlpha: 1, scale: 1});
    TweenMax.to('#addressExists', 0.2, {autoAlpha: 0, scale: 0.5, delay: 3});
  }

  addressAddedSuccessfuly(){
    TweenMax.fromTo('#addressAdded', 0.2, {autoAlpha: 0, scale: 0.5}, {autoAlpha: 1, scale: 1});
    TweenMax.to('#addressAdded', 0.2, {autoAlpha: 0, scale: 0.5, delay: 3});
  }

  addressInvalid(){
    TweenMax.fromTo('#addressInvalid', 0.2, {autoAlpha: 0, scale: 0.5}, {autoAlpha: 1, scale: 1});
    TweenMax.to('#addressInvalid', 0.2, {autoAlpha: 0, scale: 0.5, delay: 3});
  }

  async addNormalAddress() {
    let result;
    let code = "";
    let ans = false;
    let address = "";
    let name = "";
    this.addingContact = true;
    try{
      result = await Tools.searchForUsernameOrAddress(this.props.wallet, this.props.newContactName);
      console.log(result)
      if(result.ans && result.addresses.length === 1){
        name = result.addresses[0].Name;
        address = result.addresses[0].Address;
        code = result.addresses[0].Code;
        ans = true;
      }
      else if(result.ans && result.addresses.length > 1){
        this.props.setMultipleAnsAddresses(result.addresses);
      }
      else{
        address = result.addresses[0].address;
        ans = false;
      }
    }catch(err){
      console.log("err: ", err)
    }

    if (!result) {
      Tools.showTemporaryMessage('#addressInvalid');
      this.resetFields(false);
    }
    else{
      const tt = low.get('friends').find({ address: address }).value();
      if (tt) {
        this.addressAlreadyExists();
        this.resetFields();
      }
      else {
        this.props.setAddingContact(true, {name, address, code, ans});
        console.log(address)
        low.get('friends').push({ name, address, ans, code }).write();
        const friendList = low.get('friends').value();
        this.props.setContacts(friendList);
        //this is a temporary workaround because setContacts is not triggering a re-render of AddressBook.js
        this.props.setHoveredAddress(["a"]);
        this.resetFields();
        this.addressAddedSuccessfuly();
      }
    }
  }

  resetFields(){
    this.props.setNewContactName("");
    TweenMax.set('#addressNamePlaceHolder', {autoAlpha: 1});
  }

  render() {
    return (
      <div className="panel">
        <AddressBook sendPanel={false}/>
        <div style={{position: "relative", top: "60px"}}>
          <p id="addressExists" className="contactsMessage">{ this.props.lang.contactAlreadyExists }</p>
          <p id="addressAdded" className="contactsMessage">{ this.props.lang.contactAddedSuccessfully }</p>
          <p id="addressInvalid" className="contactsMessage">{ this.props.lang.invalidAddress }</p>
        </div>
        <div id="inputAddress" style={{width: "650px", margin: "0 auto", display:"flex", justifyContent: "space-between", marginTop:"100px"}}>
          <Input
            placeholder= { this.props.lang.ansNameOrAddress }
            placeholderId="addressNamePlaceHolder"
            value={this.props.newContactName}
            handleChange={this.props.setNewContactName}
            type="text"
            inputId="inputName"
            style={{width: "75%", paddingRight: "30px"}}
            autoFocus
            isLeft
          />
          <div onClick={this.addContact} className="buttonPrimary addContactButton">
          { this.props.lang.addContact }
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => {
  return{
    lang: state.startup.lang,
    newContactName: state.application.newContactName,
    wallet: state.application.wallet
  };
};

export default connect(mapStateToProps, actions)(Contacts);
