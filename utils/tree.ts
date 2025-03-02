import MerkleTree from "fixed-merkle-tree";
import { hexToBigint, mimcHasher } from "./utils";

const LEVELS = 20; // Whitepaper parameter

const tree = new MerkleTree(20);

// from precomputed zero values with script merkle_zero_values.ts
// stored in a json file after running the script
const INITIAL_ZERO_VALUE = hexToBigint(
  "0x061659997d83ee1ac9d74a417b37643cc0a1f4e35c4056d8ffa186673960ae26"
)

async function createTree(levels = LEVELS): Promise<MerkleTree> {
  const hasher = await mimcHasher();
  return new MerkleTree(levels, [], {
    hashFunction: hasher,
    zeroElement: INITIAL_ZERO_VALUE.toString(),
  });
}

export { createTree };
