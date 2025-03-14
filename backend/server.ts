import express from "express";
import { createTree } from "../utils/tree";
import { ethers } from "ethers";
import { generateCommitment } from "../utils/utils";
import { deposit, withdraw } from "../utils/server_utils";
import { PrivateWithdrawGroth16 } from "@zkit";
import { pedersenHash, bigIntToBuffer, bigIntToHex } from "../utils/utils";
import { ETHTornado, ETHTornado__factory } from "../typechain-types";
import MerkleTree from "fixed-merkle-tree";

// import { zkit } from "hardhat";
// import hre from "hardhat";
// import { run } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";

async function getHRE(): Promise<HardhatRuntimeEnvironment> {
  process.env.HARDHAT_NETWORK = "localhost"; 
  const hre = require("hardhat");
  return hre;  
}

const app = express();
const PORT = 3000;

app.use(express.json());
// Initialize the Merkle tree
let tree: MerkleTree;

// Initialize provider and contract
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const tornadoAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; // Replace with the actual deployed contract address
const tornado = ETHTornado__factory.connect(tornadoAddress, provider);

async function initializeTree() {
  tree = await createTree();
  console.log("Merkle tree initialized");
}

// Listen for Deposit and Withdrawal events
const depositListener = (event: any) => {
    try {
        const _commitment = event.args[0];  // string (hash)
        const leafIndex = event.args[1];   // BigInt
        const timestamp = event.args[2];   // BigInt
    
        console.log(`Deposit event: commitment=${_commitment}, leafIndex=${leafIndex.toString()}, timestamp=${timestamp.toString()}`);
    
        // Insert the commitment into the Merkle tree
        tree.insert(_commitment);
      } catch (error) {
        console.error("Error handling deposit event:", error);
      }

}

const withdrawalListener = (event: any) => {
    console.log("Withdrawal Event Args:", event.args[0]);
}

tornado.on(tornado.filters.Deposit(), depositListener);
tornado.on(tornado.filters.Withdrawal(), withdrawalListener);

// Endpoint to get Merkle root and path
app.get("/merkle-info/:commitment", (req, res) => {
  const commitment = req.params.commitment;
  console.log("Commitment:", commitment);
  const leafIndex = tree.indexOf(commitment);
  if (leafIndex === -1) {
    res.status(404).json({ error: "Commitment not found in the tree" });
    return;
  }
  const { pathElements, pathIndices } = tree.path(leafIndex);
  const root = tree.root;
  res.status(200).json({ root, pathElements, pathIndices });
  return;
});

// Endpoint to deposit
app.post("/deposit", async (req, res) => {
  try {
    const { nullifier, secret, commitment } = await generateCommitment();
    console.log("Body:", req.body);
    const {userAddress} = req.body;
    console.log("User address:", userAddress);

    // Initialize Hardhat runtime environment
    const hre = await getHRE();

    console.log("Using contract at address:", tornado.target);

    await deposit(
      tornado, 
      nullifier, 
      secret, 
      commitment, 
      userAddress, 
      hre
    );

    
    const response = {
      nullifier: bigIntToHex(nullifier),
      secret: bigIntToHex(secret),
      commitment: bigIntToHex(commitment),
    };

    res.status(200).json({ message: "Deposit successful", response });

  } catch (error) {
    console.error("Error during deposit:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint to withdraw
app.post("/withdraw", async (req, res) => {
  try {
    const { nullifier, secret, root, pathIndices, pathElements, userAddress } = req.body;

    // Generating recipient
    const recipient = userAddress;

    // Initialize Hardhat runtime environment
    const hre = await getHRE();

    // Create circuit representation
    // const circuit = await hre.zkit.getCircuit("Withdraw");
    const circuit = await hre.run("zkit:getCircuit", { name: "Withdraw" });
    // Create inputs
    const input: PrivateWithdrawGroth16 = {
      root,
      nullifierHash: await pedersenHash(bigIntToBuffer(nullifier, 31)),
      nullifier,
      secret,
      pathElements/*: pathElements.map((el) => BigInt(el))*/,
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
      recipient,
      hre
    );

    res.status(200).json({ message: "Withdraw successful" });
  } catch (error) {
    console.error("Error during withdraw:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server
app.listen(PORT, async () => {
  console.log("Provider block number:", await provider.getBlockNumber());
  await initializeTree();
  console.log(`Server running on port ${PORT}`);
});