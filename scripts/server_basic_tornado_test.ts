import axios from 'axios';
import { ethers } from 'ethers';
import hre from 'hardhat';
import { zkit } from "hardhat";
import { PrivateWithdrawGroth16 } from '@zkit';
import { generateCommitment, bigIntToHex, pedersenHash, bigIntToBuffer } from '../utils/utils';
import { ETHTornado, ETHTornado__factory } from '../typechain-types';
import {deposit, withdraw} from '../utils/contract_utils';

const NUM_DEPOSITS = 3; // Number of deposits and withdraws to make

// Initialize provider and contract
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const tornadoAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const tornado : ETHTornado = ETHTornado__factory.connect(tornadoAddress, provider);

async function main() {
  try {
    // Get the signers
    const users = await hre.ethers.getSigners();
    let nullifiers = [];
    let secrets = [];
    let commitments = [];
  
    // Perform deposits
    for(let i = 0; i < NUM_DEPOSITS; i++) {
      const { nullifier, secret, commitment } = await generateCommitment();
      const {nullifierHex, secretHex, commitmentHex} = {
        nullifierHex: bigIntToHex(nullifier),
        secretHex: bigIntToHex(secret),
        commitmentHex: bigIntToHex(commitment)
      };

      //WIthout server API
      console.log(`Processing deposit ${i + 1} for user ${users[i + 1].address}`);
      await deposit(
        tornado,
        commitment,
        users[i + 1].address,
        hre
      );


      nullifiers.push(nullifierHex);
      secrets.push(secretHex);
      commitments.push(commitmentHex);
    }

    // Small time delay to allow the server to process the deposit
    await new Promise(resolve => setTimeout(resolve, 5000));

    const orderOfWithdraws = Array.from({ length: NUM_DEPOSITS }, (_, i) => i).sort(() => Math.random() - 0.5);

    // Get Merkle root and path
    for(let i = 0; i < NUM_DEPOSITS; i++) {
      let index = orderOfWithdraws[i];
      console.log(`Processing withdrawal for deposit ${index + 1}`);

      const merkleInfoResponse = await axios.get(`http://127.0.0.1:3000/merkle-info/${commitments[index]}`);
      // console.log('Merkle Info Response:', merkleInfoResponse.data);

      const { root, pathElements, pathIndices } = merkleInfoResponse.data;

      //WIthout server API
      console.log(`Processing withdrawal ${i + 1} for user ${users[index + 1 + NUM_DEPOSITS].address}`);
      // Generating recipient
      const recipient = users[index + 1 + NUM_DEPOSITS].address;

      // Create circuit representation
      const circuit = await zkit.getCircuit("Withdraw");

      // Create inputs
      const input: PrivateWithdrawGroth16 = {
        root,
        nullifierHash: await pedersenHash(bigIntToBuffer(BigInt(nullifiers[index]), 31)),
        nullifier: BigInt(nullifiers[index]),
        secret: BigInt(secrets[index]),
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
    }

  } catch (error) {
    console.error('Error in test script:', error);
  }
}

main();