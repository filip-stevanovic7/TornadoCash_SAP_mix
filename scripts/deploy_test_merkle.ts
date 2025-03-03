import {
    MerkleTree,
    MerkleTree__factory,
  } from "../typechain-types";
  import { mimcSpongecontract } from "circomlibjs";
  import hre from "hardhat";
  import { logger } from "../utils/logger";
  
  async function deployMerkle(): Promise<MerkleTree> {
    logger.startBlock("STARTING DEPLOY MERKLE TREE");
  
    const signers = await hre.ethers.getSigners();
    logger.deployAccount(signers[0].address);
    
    const initialZeroValue = "0x061659997d83ee1ac9d74a417b37643cc0a1f4e35c4056d8ffa186673960ae26";
    const LEVELS = 20;
    const SEED = "mimcsponge";
    const ROUNDS = 220;
  
    // Deploy MiMC Hasher
    logger.deploymentStart("MiMC Hasher");
    const mimcAbi = [
      "function MiMCSponge(uint256 in_xL, uint256 in_xR, uint256 k) external pure returns (uint256 xL, uint256 xR)",
    ];
    const MimcFactory = new hre.ethers.ContractFactory(
      mimcAbi,
      mimcSpongecontract.createCode(SEED, ROUNDS),
      signers[0]
    );
    const mimcHasher = await MimcFactory.deploy();
    await mimcHasher.waitForDeployment();
    logger.deploymentSuccess("MiMC Hasher", await mimcHasher.getAddress());
  
    // Deploy MerkleTree
    logger.deploymentStart("Merkle");
    const merkleFactory: MerkleTree__factory =
      await hre.ethers.getContractFactory("MerkleTree");
    const merkleTree: MerkleTree = await merkleFactory.deploy(
        LEVELS,
        await mimcHasher.getAddress(),
        initialZeroValue
    );
    await merkleTree.waitForDeployment();
    logger.deploymentSuccess("Merkle", await merkleTree.getAddress());
  
    return merkleTree;
  }
  
  async function main() {
    try {
      // Deploy the MerkleTree contract
      const merkleTree = await deployMerkle();
  
      // Retrieve the zero values
      const zeroValues = await merkleTree.getZeroValues();
  
      // Print the zero values
      console.log("Zero values:");
      zeroValues.forEach((value: string, index: number) => {
        console.log(`Level ${index}: ${value}`);
      });
    } catch (error) {
      console.error("Error deploying and testing MerkleTree:", error);
      process.exit(1);
    }
  }
  
  main();