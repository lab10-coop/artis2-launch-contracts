## About

This repository contains contracts for the ARTIS 2.0 launch.
Tested with nodejs v12.x.

Prepare for deployment:
```
npm ci
npm run build
```

Test:
```
npm run test
```

Deploy:
```
npx truffle exec scripts/deploy.js [: <OLD_TOKEN_ADDRESS>] --network <network>
```
does the following:
* if no OLD_TOKEN_ADDRESS is given: deploys a mock ERC20+ERC677 contract representing xATS_tmp
* deploys an instance of XATSToken (new xATS) with an initial supply of 300 000 000
* deploys an instance of _Artis2Launch_ with the 2 token contract addresses as constructor arguments. _old token_ is the token to be sent to the contract, _new token_ is the token which will be sent back from the contract in return
* funds the Artis2Launch contract with 50 000 000 (new) xATS tokens

`XATSToken` is an ERC777 token based on the [OpenZeppelin implementation](https://docs.openzeppelin.com/contracts/3.x/erc777).
It additionally implements the [ERC677 interface](https://github.com/ethereum/EIPs/issues/677) in order to be compatible with [TokenBridge](https://docs.tokenbridge.net/). This is important because the xATS token will later be bridged to the new ARTIS 2.0 chain.

Note:
The `transfer()` method of xATS_old does try to invoke the ERC677 callback and can thus in principe be used for the swap.
This is however not safe. Specifically the sender may not receive new xATS if the transaction gas limit wasn't set high enough for the ERC677 callback to succeed.
In order to be safe, the swap should thus be done by using `transferAndCall()`.
