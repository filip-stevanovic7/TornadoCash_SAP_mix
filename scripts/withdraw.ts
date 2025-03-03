import { Tornado } from "../typechain-types";
import { logger } from "../utils/logger";
import { Withdraw } from "@zkit";
import { ProofWithdrawGroth16 } from "@zkit";
import hre from "hardhat";

async function withdraw(
  tornado: Tornado,
  circuit: Withdraw,
  proof: ProofWithdrawGroth16,
  recipient: string
) {
  logger.startBlock("STARTING WITHDRAW PROCESS");
  logger.info(
    `💰 Recipient balance before withdrawal: ${await hre.ethers.provider.getBalance(recipient)}`
  );
  const calldata = await circuit.generateCalldata(proof);
  await tornado.withdraw(...calldata);
  logger.success(
    `🤑 Recipient balance after withdrawal: ${await hre.ethers.provider.getBalance(recipient)}`
  );
  logger.endBlock("WITHDRAW SUCCESSFULL");
}

export { withdraw };
