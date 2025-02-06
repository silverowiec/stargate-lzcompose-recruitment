import {HardhatUserConfig} from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import "hardhat-dependency-compiler";
import "hardhat-contract-sizer";
import * as dotenv from 'dotenv';
dotenv.config();



const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
        details: {yul: true},
      },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1336,
    },
    arbitrum: {
      url: `https://arb-sepolia.g.alchemy.com/v2/${process.env.alchemy_key}`,
      chainId: 421614,
      accounts: []
    },

    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.alchemy_key}`,
      chainId: 11155111,
      accounts: []
    },


  },
  gasReporter: {
    enabled: true,
    showMethodSig: true,
    showTimeSpent: true,
    gasPrice: 35,
  },

  etherscan: {
    apiKey: `${process.env.etherscan_key}`
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },

};

export default config;
