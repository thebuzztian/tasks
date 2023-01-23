require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require('@openzeppelin/hardhat-upgrades');

const { PRIVATE_KEY_1, PRIVATE_KEY_2, PRIVATE_KEY_CODE_CHALLENGE, URL, POLYGON_API_TOKEN } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  //defaultNetwork: "hardhat",
  networks: {
    mumbai: {
      url: URL,
      accounts: [ PRIVATE_KEY_1, PRIVATE_KEY_2, PRIVATE_KEY_CODE_CHALLENGE ]
    },
    mumbai_code_challenge: {
      url: URL,
      accounts: [ PRIVATE_KEY_CODE_CHALLENGE ]
    }
  },
  etherscan: {
    apiKey: POLYGON_API_TOKEN,
  },
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
}
