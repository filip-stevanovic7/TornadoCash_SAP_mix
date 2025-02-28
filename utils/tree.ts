import MerkleTree from "fixed-merkle-tree";
import { buildMimcSponge } from "circomlibjs";
import { HashFunction, Element } from "fixed-merkle-tree";
import { hexToBigint } from "./utils";

const LEVELS = 20; // Whitepaper parameter

const tree = new MerkleTree(20);

// from precomputed zero values with script merkle_zero_values.ts
// stored in a json file after running the script
const INITIAL_ZERO_VALUE = hexToBigint(
  "0x2d9fea8398a61ea1997e7d748364c0fdb49412c4dbabc1578375ade642e85581"
)

async function mimcHasher(): Promise<HashFunction<Element>> {
  const mimc = await buildMimcSponge();

  const hasher: HashFunction<Element> = (
    left: Element,
    right: Element
  ): string => {
    return mimc.F.toString(mimc.multiHash([left, right]));
  };

  return hasher;
}

async function createTree(levels = LEVELS): Promise<MerkleTree> {
  const hasher = await mimcHasher();
  return new MerkleTree(levels, [], {
    hashFunction: hasher,
    zeroElement: INITIAL_ZERO_VALUE.toString(),
  });
}

export { createTree, mimcHasher };
