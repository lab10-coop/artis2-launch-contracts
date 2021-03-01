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

Notes
In order to make sure that old tokens are accepted by the Launcher contract only if the swap is successful (swapping period not over, enough new tokens to hand out), the oldToken contract needs to enforce successful execution of the ERC677 hook not just for `transferAndCall()`, but also for `transfer()`.
To facilitate this, the Launcher contract implements [ERC165](https://eips.ethereum.org/EIPS/eip-165) with the `IERC677Receiver` interface published.
The same mechanism can be used to later attach the new xATS token to a tokenbridge mediator. For all transfer methods (except the ERC777 specific ones which have their own callback mechanism) it checks if the receiver advertised an implementation of `IERC677Receiver` via ERC165 and if so enforces successful execution.
The tokenbridge mediator contracts don't implement ERC165 yet, but that can be added easily.
