const Launcher = artifacts.require("Artis2Launch");
const XATSToken = artifacts.require("XATSToken");
const ERC677TokenMock = artifacts.require("ERC677TokenMock");
const { parseColonArgs } = require("./utils");
const { singletons } = require("@openzeppelin/test-helpers");

/*
* Deploys the new xATS token, the launcher contract with both tokens configured and funds the launcher contract.
* Expects the address of the old token as argument. If omitted, a mock token will be deployed.
*
* Usage: npx truffle exec scripts/deploy.js [: <OLD_TOKEN_ADDRESS>] --network=<network>
*/
module.exports = async function(
    callback,
    argv,
    { isTruffle, web3Provider, from } = {}
) {
    try {
        this.web3 = web3Provider ? new Web3(web3Provider) : web3;
        if (!this.web3) throw new Error("No web3 is available");

        if (!from) {
            const accounts = await this.web3.eth.getAccounts();
            from = accounts[0];
        }
        console.log(`deployer: ${from}`);

        let args;
        let oldTokenAddr;
        try {
            args = parseColonArgs(argv || process.argv);
            if (args.length === 0) throw new Error();
        } catch(e) {
            console.log("!!! no argument given: old token address");
        }
        // if an argument was given, we expect it to be valid...
        if (args && args.length > 0) {
            const maybeOldTokenAddr = args.pop();
            if(!web3.utils.isAddress(maybeOldTokenAddr)) {
                throw new Error(`!!! not a valid address: ${maybeOldTokenAddr}`);
            }
            if (!((await web3.eth.getCode(maybeOldTokenAddr)).length > '0x0'.length)) {
                throw new Error(`!!! not a contract: ${maybeOldTokenAddr}`);
            }
            oldTokenAddr = maybeOldTokenAddr;
        }

        const initialSupply = web3.utils.toWei(String(300_000_000));

        // ... else we deploy a mock
        if(! oldTokenAddr) {
            console.log("!!! deploying old token dummy");
            oldTokenC = await ERC677TokenMock.new(initialSupply);
            oldTokenAddr = oldTokenC.address;
        }

        console.log("address of old token:", oldTokenAddr);

        // make sure ERC1820 is deployed (needed for ERC777)
        const erc1820Deployed = (await web3.eth.getCode("0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24")).length > 2;
        if (!erc1820Deployed) {
            console.log(`deploying ERC1820...`);
            await singletons.ERC1820Registry(from);
        }

        console.log(`deploying new xATS token with total supply ${web3.utils.fromWei(initialSupply)}...`);
        // deploy new xATS token
        const xATSTokenC = await XATSToken.new(initialSupply);
        console.log(`deployed new xATS to ${xATSTokenC.address}`);

        const launchC = await Launcher.new(oldTokenAddr, xATSTokenC.address);
        console.log(`deployed launcher to ${launchC.address}`);

        const launchContractDepositAmount = web3.utils.toWei(String(65_000_000));
        console.log(`funding the launcher with ${web3.utils.fromWei(launchContractDepositAmount)} xATS ...`);
        await xATSTokenC.transfer(launchC.address, launchContractDepositAmount);

        callback();
    } catch (err) {
        callback(err);
    }
};
