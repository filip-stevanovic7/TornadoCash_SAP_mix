// import { deployContracts } from "./deploy_contracts";
import { deposit } from "./deposit";
import { withdraw } from "./withdraw";
import { generateCommitment, pedersenHash, bigIntToBuffer } from "../utils/utils";
import { createTree } from "../utils/tree";
import { PrivateWithdrawGroth16 } from "@zkit";
import { zkit } from "hardhat";
import hre from "hardhat";
import { ETHTornado__factory } from "../typechain-types";

async function main() {
    try {
        // Get the signers
        const [deployer, user1, user2] = await hre.ethers.getSigners();

        // Deploy the ETHTornado contract
        // const tornado = await deployContracts(deployer.address);
        // Connect to the existing ETHTornado contract
        const tornadoAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
        const tornado = ETHTornado__factory.connect(tornadoAddress, deployer);

        // Listen for Deposit and Withdrawal events
        const depositListener = (event: any) => {
            const _commitment = event.args[0];  // string (hash)
            const leafIndex = event.args[1];   // BigInt
            const timestamp = event.args[2];   // BigInt
        
            console.log(`Deposit event: commitment=${_commitment}, leafIndex=${leafIndex.toString()}, timestamp=${timestamp.toString()}`);
        }

        const withdrawalListener = (event: any) => {
            console.log("Withdrawal Event Args:", event.args[0]);
        }

        tornado.on(tornado.filters.Deposit(), depositListener);
        tornado.on(tornado.filters.Withdrawal(), withdrawalListener);

        // Simulate a deposit
        const { nullifier, secret, commitment } = await generateCommitment();
        await deposit(tornado, nullifier, secret, commitment, user1.address);


        // Creating tree off-chain
        const tree = await createTree();
        tree.insert(commitment.toString());

        const { pathElements, pathIndices } = tree.path(
            tree.indexOf(commitment.toString())
        );

        // Generating recipient
        // const recipient = hre.ethers.Wallet.createRandom().address;
        const recipient = user2.address;

        // Create circuit representation
        const circuit = await zkit.getCircuit("Withdraw");
        // Create inputs
        const input: PrivateWithdrawGroth16 = {
            root: BigInt(tree.root),
            nullifierHash: await pedersenHash(bigIntToBuffer(nullifier, 31)),
            nullifier,
            secret,
            pathElements: pathElements.map((el) => BigInt(el)),
            pathIndices,
            recipient: BigInt(recipient),
        };
        // Generate proof
        const proof = await circuit.generateProof(input);

        // Withdraw
        await withdraw(
            tornado,
            circuit,
            proof,
            recipient
        );

        // Sleep for a couple of seconds to ensure all event listeners have been captured
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Remove event listeners
        tornado.off(tornado.filters.Deposit(), depositListener);
        tornado.off(tornado.filters.Withdrawal(), withdrawalListener);

        console.log("All operations completed successfully.");

    } catch (error) {
        console.error("Error deploying and testing ETHTornado:", error);
        process.exit(1);
    }
}

main();