const HDWalletProvider = require("@truffle/hdwallet-provider");

const mnemonicOrPrivkey = process.env.MNEMONIC || process.env.PRIVKEY;

module.exports = {
    networks: {
        artis_tau1: {
            provider: () =>
                new HDWalletProvider(
                    mnemonicOrPrivkey,
                    "https://rpc.tau1.artis.network"
                ),
            network_id: 0x03c401,
            gas: 8e6,
            gasPrice: process.env.GAS_PRICE || 1e9, // default 1 gwei
            //confirmations: 6, // (default: 0)
            timeoutBlocks: 5 // (default: 50)
        },

        xdai: {
            provider: () =>
                new HDWalletProvider(
                    mnemonicOrPrivkey,
                    "https://rpc.xdaichain.com"
                ),
            network_id: 100,
            gas: 8e6,
            gasPrice: process.env.GAS_PRICE || 1e9, // default 1 gwei
            //confirmations: 6, // (default: 0)
            timeoutBlocks: 10 // (default: 50)
        },

        ganache: {
            host: "127.0.0.1",
            network_id: "*",
            port: 8545
        }
    },

    // Set default mocha options here, use special reporters etc.
    mocha: {
        // timeout: 100000
    },

    // Configure your compilers
    compilers: {
        solc: {
            version: "0.7.6", // Fetch exact version from solc-bin (default: truffle's version)
            settings: {
                // See the solidity docs for advice about optimization and evmVersion
                optimizer: {
                    enabled: true,
                    runs: 200
                }
                // evmVersion: "petersburg" use default
            }
        }
    }
};
