import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@solarity/hardhat-zkit";
import "@solarity/chai-zkit";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  zkit: {
    compilerVersion: "2.2.0",
    circuitsDir: "circuits",
    compilationSettings: {
      artifactsDir: "zkit/artifacts",
      onlyFiles: [],
      skipFiles: [],
      c: false,
      json: false,
      optimization: "O1",
    },
    setupSettings: {
      contributionSettings: {
        provingSystem: "groth16", // or "plonk"
        contributions: 2,
      },
      onlyFiles: [],
      skipFiles: [],
      ptauDir: undefined,
      ptauDownload: true,
    },
    verifiersSettings: {
      verifiersDir: "contracts/verifiers",
      verifiersType: "sol", // or "vy"
    },
    typesDir: "generated-types/zkit",
    quiet: false,
  }
};

export default config;