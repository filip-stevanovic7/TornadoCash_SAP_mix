import express from "express";
import { createTree } from "../utils/tree";
import { ETHTornado, ETHTornado__factory } from "../typechain-types";
import MerkleTree from "fixed-merkle-tree";
import { ethers } from "ethers";
// import hre from "hardhat";
// import { run } from "hardhat";
// import { HardhatRuntimeEnvironment } from "hardhat/types";

// async function getHRE(): Promise<HardhatRuntimeEnvironment> {
//   process.env.HARDHAT_NETWORK = "localhost"; 
//   const hre = require("hardhat");
//   return hre;  
// }

const app = express();
const PORT = 3000;

app.use(express.json());
// Initialize the Merkle tree
let tree: MerkleTree;

// Initialize provider and contract
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const tornadoAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const tornado : ETHTornado = ETHTornado__factory.connect(tornadoAddress, provider);

async function initializeTree() {
  tree = await createTree();
  console.log("Merkle tree initialized");
}

const eventQueue: any[] = [];
let isProcessing = false;

const processEventQueue = async () => {
  if (isProcessing || eventQueue.length === 0) return;

  isProcessing = true;
  const event = eventQueue.shift(); // Get the first event in the queue

  try {
    const _commitment = event.args[0];
    const leafIndex = event.args[1];
    const timestamp = event.args[2];

    console.log(`Processing deposit event: commitment=${_commitment}, leafIndex=${leafIndex.toString()}, timestamp=${timestamp.toString()}`);

    // Insert the commitment into the Merkle tree
    tree.insert(_commitment);
    console.log(`Commitment inserted into Merkle tree: ${_commitment}`);
  } catch (error) {
    console.error("Error processing deposit event:", error);
  } finally {
    isProcessing = false;
    processEventQueue(); // Process the next event
  }
};

let lastProcessedLeafIndex = -1;

const depositListener = (event: any) => {
  // Check if the event is already processed
  if (event.args[1] <= lastProcessedLeafIndex) {
    console.log(`Skipping already processed event with leaf index: ${event.args[1]}`);
    return;
  }
  console.log("Deposit Event");
  eventQueue.push(event); // Add the event to the queue
  processEventQueue(); // Start processing the queue
};

const withdrawalListener = (event: any) => {
    console.log("Withdrawal Event Args:", event.args[0]);
}

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

// Start the server
app.listen(PORT, async () => {
  console.log("Provider block number:", await provider.getBlockNumber());

  await initializeTree();

  // 1. Remove old event listeners
  tornado.removeAllListeners();

  // 2. Rebuild tree from past events
  const latestBlock = await provider.getBlockNumber();
  console.log("Rebuilding Merkle tree from past deposit events...");
  const pastEvents = await tornado.queryFilter(tornado.filters.Deposit(), 0, latestBlock);

  pastEvents.sort((a, b) => {
    // Sort by leaf index (args[1]) in ascending order
    if (!a.args || !b.args) {
      console.error("Event args are missing:", a, b);
      return 0; // Default to no sorting if args are missing
    }
    // Convert BigInt to Number for comparison
    return Number(a.args[1]) - Number(b.args[1]);
  });

  for (const event of pastEvents) {
    const _commitment = event.args[0];
    console.log(`Processing past deposit event: commitment=${_commitment}, leafIndex=${event.args[1].toString()}, timestamp=${event.args[2].toString()}`);
    lastProcessedLeafIndex = Number(event.args[1]);
    if (_commitment) {
      tree.insert(_commitment);
      console.log(`Inserted past commitment: ${_commitment}`);
    }
  }

  // 3. Register fresh event listeners
  console.log("Attaching listeners after past event replay");
  tornado.on(tornado.filters.Deposit(), depositListener);
  tornado.on(tornado.filters.Withdrawal(), withdrawalListener);
  console.log(`Server running on port ${PORT}`);

  
});
