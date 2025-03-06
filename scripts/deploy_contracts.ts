import {
  ETHTornado,
  ETHTornado__factory,
  WithdrawGroth16Verifier,
  WithdrawGroth16Verifier__factory,
} from "../typechain-types";
import { mimcSpongecontract } from "circomlibjs";
import hre from "hardhat";
import { logger } from "../utils/logger";

async function deployContracts(address: string): Promise<ETHTornado> {
  logger.startBlock("STARTING DEPLOY CONTRACTS");

  const signer = await hre.ethers.getSigner(address);
  logger.deployAccount(address);

  const DENOMINATION = hre.ethers.parseEther("1");
  const LEVELS = 20;
  const SEED = "mimcsponge";
  const ROUNDS = 220;
  const INITIAL_ZERO_VALUE = "0x061659997d83ee1ac9d74a417b37643cc0a1f4e35c4056d8ffa186673960ae26";

  // Deploy MiMC Hasher
  logger.deploymentStart("MiMC Hasher");
  const mimcAbi = [
    "function MiMCSponge(uint256 in_xL, uint256 in_xR, uint256 k) external pure returns (uint256 xL, uint256 xR)",
  ];
  const MimcFactory = new hre.ethers.ContractFactory(
    mimcAbi,
    mimcSpongecontract.createCode(SEED, ROUNDS),
    signer
  );
  const mimcHasher = await MimcFactory.deploy();
  await mimcHasher.waitForDeployment();
  logger.deploymentSuccess("MiMC Hasher", await mimcHasher.getAddress());

  // Deploy Verifier
  logger.deploymentStart("Verifier");
  const verifierFactory: WithdrawGroth16Verifier__factory =
    await hre.ethers.getContractFactory("WithdrawGroth16Verifier");
  const verifier: WithdrawGroth16Verifier = await verifierFactory.deploy();
  await verifier.waitForDeployment();
  logger.deploymentSuccess("Verifier", await verifier.getAddress());

  // Deploy Tornado
  logger.deploymentStart("Tornado");
  const tornadoFactory: ETHTornado__factory =
    await hre.ethers.getContractFactory("ETHTornado");
  const tornado: ETHTornado = await tornadoFactory.deploy(
    await verifier.getAddress(),
    await mimcHasher.getAddress(),
    DENOMINATION,
    LEVELS,
    INITIAL_ZERO_VALUE
  );
  await tornado.waitForDeployment();
  logger.deploymentSuccess("Tornado", await tornado.getAddress());

  logger.configuration(hre.ethers.formatEther(DENOMINATION), LEVELS);
  logger.endBlock("DEPLOY CONTRACTS DONE");

  return tornado;
}


async function main() {
  try {
      // Get the signers
      const [deployer] = await hre.ethers.getSigners();
      await deployContracts(deployer.address);
  
    } catch (error) {
      console.error("Error deploying and testing MerkleTree:", error);
      process.exit(1);
    }
}

main();

// export { deployContracts };
