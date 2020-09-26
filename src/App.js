import React, { useState, useEffect } from 'react';
import Fortmatic from 'fortmatic';
import Web3 from 'web3';
import { Button, Form, FormGroup, Input } from 'reactstrap';
import { cloneDeep, get, head, set } from 'lodash';

import logo from './logo.svg';
import './App.css';

const { REACT_APP_FORTMATIC_KEY } = process.env;
const RPC_METHOD = 'eth_signTypedData';

// Constructor
const fm = new Fortmatic(REACT_APP_FORTMATIC_KEY);
window.web3 = new Web3(fm.getProvider());
const { web3 } = window;

const AUTH_MESSAGE = 'Please sign this message to create or verify your signature for authentication.';

const App = () => {
  const initialInputs = {
    tweet: ""
  };
  const [ wallet, setWallet ] = useState(null);
  const [ inputs, setInputs ] = useState(cloneDeep(initialInputs));
  const [ message, setMessage ] = useState('');
  const [ loader, setLoader ] = useState(null);
  const [ userObj, setUserObj ] = useState(cloneDeep({}));
  const [ signatures, setSignatures ] = useState(cloneDeep({}));
  // console.log('DEBUG wallet: ', wallet);
  // console.log('DEBUG tweet: ', inputs.tweet);
  // console.log('DEBUG message: ', message);
  // console.log('DEBUG userObj: ', userObj);
  // console.log('DEBUG signatures: ', signatures);

  useEffect(
    () => {
      const checkLoginStatus = async () => {
        setLoader("Loading....");
        const isUserLoggedIn = await fm.user.isLoggedIn();
        if (isUserLoggedIn) {
          web3.eth.getAccounts()
            .then((accounts) => {
              const account = head(accounts);
              console.log('user already logged in with wallet: ', account);
              setWallet(account);
            });
          const user = await fm.user.getUser();
          setUserObj(cloneDeep(user));
        }
        setLoader(null);
      }
      checkLoginStatus();
    },
    []
  );

  const handleLogin = () => {
    fm.user.login().then(async (accounts) => {
      const account = head(accounts);
      setWallet(account);
      const user = await fm.user.getUser();
      console.log('user logged in! ', user);
      console.log('wallet found! ', account);
      setUserObj(cloneDeep(user));
    });
  };

  const handleLogout = () => {
    fm.user.logout().then((result => {
      console.log('user logged out! ', result);
    }));
    // clean app data
    setWallet(null);
    setInputs(cloneDeep(initialInputs));
    setMessage('');
    setUserObj(cloneDeep({}));
  };

  const handleInputs = (e) => {
    const { name, value } = get(e, "target", {});
    const newInputs = cloneDeep(inputs);
    set(newInputs, name, value);
    setInputs({
      ...inputs,
      ...newInputs
    });
  };

  const TYPE_DATA = [
    [
      { "type": "string",
        "name": "email",
        "value": get(userObj, 'email')
      },
      {
        "type": "string",
        "name": "userId",
        "value": get(userObj, 'userId')
      },
      {
        "type": "string",
        "name": "authorization message",
        "value": AUTH_MESSAGE
      }
    ],
    wallet
  ];

  const handleSignTypedData = () => {
    const method = RPC_METHOD;
    web3.currentProvider.sendAsync({
      id: 4,
      method,
      params: TYPE_DATA,
      from: wallet,
    }, (err, result) => {
      if (err) return console.error(err);
      if (result.error) return console.error(result.error);
      const signature = get(result, 'result', '');
      const userId = get(userObj, 'userId');
      const updatedSignatures = cloneDeep(signatures);
      console.log('signature saved! ', signature);
      set(updatedSignatures, userId, signature);
      setSignatures(updatedSignatures);
    });
  }

  const veryifyAndSend = () => {
    const method = RPC_METHOD;
    web3.currentProvider.sendAsync({
      id: 4,
      method,
      params: TYPE_DATA,
      from: wallet,
    }, (err, result) => {
      if (err) return console.error(err);
      if (result.error) return console.error(result.error);
      const signature = get(result, 'result', '');
      const userId = get(userObj, 'userId');
      const isValid = signature === get(signatures, userId);
      console.log('verification signature: ', signature);
      console.log('is it valid? ', isValid);
      // veryify signature before sending tweet
      let newMessage = "";
      if (isValid) {
        newMessage = (
          <div
            style={{ marginTop: "40px", padding: "40px", color: "#aaaaaa", fontSize: "18px", border: "solid 1px" }}
          >
            Signature verified! Sending tweet:
            <br />
            <br />
            <b>{inputs.tweet}</b>
          </div>
        );
      } else {
        newMessage = (
          <div
            style={{ margin: "40px", color: "#aaaaaa", fontSize: "18px", border: "solid 1px" }}
          >
            Signature verification failed!
          </div>
        );
      }
      setMessage(newMessage);
    });
  }

  const Login = (
    <Button
      onClick={handleLogin}
      style={{ width: "200px", height: "50px", fontSize: "20px", cursor: "pointer" }}
    >
      Login / Signup
    </Button>
  );

  const CreateSignature = (
    <>
      <Button
        onClick={handleSignTypedData}
        style={{ width: "200px", height: "50px", fontSize: "20px", cursor: "pointer" }}
      >
        Verify Signature
      </Button>
    </>
  );

  const SendTweet = (
    <>
      <Form>
        <FormGroup>
          <Input
            type="textarea"
            name="tweet"
            id="tweet"
            minLength={1}
            maxLength={140}
            value={inputs.tweet}
            placeholder="Maximum 140 characters"
            size="100"
            onChange={handleInputs}
            style={{ fontSize: "16px", width: "400px", height: "100px", margin: "50px" }}
          />
        </FormGroup>
        <Button
          onClick={veryifyAndSend}
          style={{ width: "200px", height: "50px", fontSize: "20px", cursor: "pointer" }}
        >
          Verify and Send
        </Button>
        { message }
      </Form>
    </>
  );

  let Content = Login;
  if (wallet) {
    const userId = get(userObj, 'userId');
    const signature = get(signatures, userId);
    if (signature) {
      Content = SendTweet;
    } else {
      Content = CreateSignature;
    }
  }

  const Loader = (
    <div style={{ color: "#aaaaaa", fontSize: "14px" }}>
      { loader }
    </div>
  );
	

  return (
    <div className="App">
      <header className="App-header">
	<h5> Sign Digitally on "Social Media Post" with Ethereum </h5>
        <img src={logo} className="App-logo" alt="logo" width="400px"/>
        { loader ? Loader : Content }
        { wallet && (
          <div
            style={{ margin: "40px", color: "#aaaaaa", fontSize: "20px", cursor: "pointer" }}
            onClick={handleLogout}
          >
            Logout
          </div>
        )}

        <div style = {{margin: "100px"}}>
                By Devesh & Ankur - Turing
        </div>
      </header>
    </div>
  );
}

export default App;
