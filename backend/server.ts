import express from "express";
import { createTree } from "../utils/tree";
import { ethers } from "ethers";
import { ETHTornado, ETHTornado__factory } from "../typechain-types";
import MerkleTree from "fixed-merkle-tree";

const app = express();
const PORT = 3000;

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

// const withdrawalListener = (event: any) => {
//     console.log("Withdrawal Event Args:", event.args[0]);
// }

tornado.on(tornado.filters.Deposit(), depositListener);
// tornado.on(tornado.filters.Withdrawal(), withdrawalListener);

// Endpoint to get Merkle root and path
app.get("/merkle-info/:commitment", (req, res) => {
  const commitment = req.params.commitment;
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

// Start the server
app.listen(PORT, async () => {
  await initializeTree();
  console.log(`Server running on port ${PORT}`);
});