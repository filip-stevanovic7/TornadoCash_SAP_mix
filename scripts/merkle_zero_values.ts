import { writeFileSync } from "fs";
import { mimcHasher } from "../utils/tree";
import { bigIntToHex } from "../utils/utils";

// Number of levels to precompute
const LEVELS = 32;

async function main() {
  // Initialize MiMC hasher
  const mimc = await mimcHasher();

  // Initialize zero values array
  const zeroValues: string[] = [];

  let prev = "0";
  // Generate zero values
  for (let i = 0; i < LEVELS; i++) {
    const hash = mimc(prev, prev);
    const hashHex = bigIntToHex(BigInt(hash));
    zeroValues.push(hashHex);
    prev = hash;
  }

  // Write zero values to file
  writeFileSync("zero_values.json", JSON.stringify(zeroValues, null, 2));

  console.log("Zero values generated and saved to zero_values.json");
}

main().catch(console.error);