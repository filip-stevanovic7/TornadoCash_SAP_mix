import { bigIntToHex } from "../utils/utils";
import { Tornado } from "../typechain-types";
import { logger } from "../utils/logger";

async function deposit(
  tornado: Tornado,
  nullifier: bigint,
  secret: bigint,
  commitment: bigint,
  senderAddress: string,
  hre: any
) {
  logger.startBlock("STARTING DEPOSIT PROCESS");

  logger.separator();
  logger.info(`Nullifier:  ${nullifier.toString(16)}`);
  logger.info(`Secret:     ${secret.toString(16)}`);
  logger.info(`Commitment: ${commitment.toString(16)}`);
  logger.separator();

  const depositAmount = hre.ethers.parseEther("1");
  const commitmentBytes = hre.ethers.AbiCoder.defaultAbiCoder().encode(
    ["bytes32"],
    [bigIntToHex(commitment)]
  );

  logger.pending("\n🔄 Submitting deposit transaction...");

  try {
    // Get the signer
    const signer = await hre.ethers.getSigner(senderAddress);

    // Connect the contract instance to the signer
    const tornadoWithSigner = tornado.connect(signer);

    // Submit the deposit transaction
    logger.info(
      `💰 Sender balance before deposit: ${await hre.ethers.provider.getBalance(senderAddress)}`
    );
    await tornadoWithSigner.deposit(commitmentBytes, { value: depositAmount });
    logger.success(
      `🤑 Sender balance after deposit: ${await hre.ethers.provider.getBalance(senderAddress)}`
    );

    logger.endBlock("DEPOSIT SUCCESSFUL", true);
  } catch (e: any) {
    logger.endBlock("DEPOSIT FAILED", false);
    logger.error(e);
    process.exit(1);
  }
}

import { Withdraw } from "@zkit";
import { ProofWithdrawGroth16 } from "@zkit";

async function withdraw(
  tornado: Tornado,
  circuit: Withdraw,
  proof: ProofWithdrawGroth16,
  recipient: string,
  hre: any
) {
  logger.startBlock("STARTING WITHDRAW PROCESS");

  try {
    // Get the signer
    const signer = await hre.ethers.getSigner(recipient);
    // Connect the contract instance to the signer
    const tornadoWithSigner = tornado.connect(signer);
    logger.info(
      `💰 Recipient balance before withdrawal: ${await hre.ethers.provider.getBalance(recipient)}`
    );
    const calldata = await circuit.generateCalldata(proof);
    await tornadoWithSigner.withdraw(...calldata);
    logger.success(
      `🤑 Recipient balance after withdrawal: ${await hre.ethers.provider.getBalance(recipient)}`
    );
    logger.endBlock("WITHDRAW SUCCESSFULL");
    
  } catch (e: any) {
    logger.endBlock("DEPOSIT FAILED", false);
    logger.error(e);
    process.exit(1);
  }
}


export { deposit, withdraw };