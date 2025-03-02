import { writeFileSync } from "fs";
import { bigIntToHex, hexToBigint, mimcHasher } from "../utils/utils";
import { buildMimcSponge } from "circomlibjs";
import { keccak256 } from "ethereumjs-util";

// Number of levels to precompute
const LEVELS = 32;

async function main() {
  // Initialize MiMC hasher
  const mimc = await mimcHasher();

  const mimcBuilder = await buildMimcSponge();
  const FIELD_SIZE = BigInt(mimcBuilder.F.p);

  const SEED_WORD = "Nikola Jokic";

  // Initialize zero values array
  const zeroValues: string[] = [];

  console.log("Generating zero values...");

  //intiial zero value
  const keccakHash = keccak256(Buffer.from(SEED_WORD));
  let numberInt = hexToBigint(keccakHash.toString("hex")) % FIELD_SIZE;
  console.log("number", numberInt);
  let number = numberInt.toString();

  zeroValues.push(bigIntToHex(numberInt));

  // Generate zero values
  for (let i = 1; i < LEVELS; i++) {
    const hash = mimc(number, number);
    const hashHex = bigIntToHex(BigInt(hash));
    zeroValues.push(hashHex);
    number = hash;
  }

  // Prepare the output JSON
  const output = {
    field_size: FIELD_SIZE.toString(),
    keccak_seed: SEED_WORD,
    zero_values: zeroValues,
  };

  // Write zero values to file
  writeFileSync("zero_values.json", JSON.stringify(output, null, 2));

  console.log("Zero values generated and saved to zero_values.json");
}

main().catch(console.error);