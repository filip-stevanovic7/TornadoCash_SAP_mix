import axios from 'axios';
import { ethers } from 'ethers';
import hre from 'hardhat';

const NUM_DEPOSITS = 5; // Number of deposits and withdraws to make

async function main() {
  try {
    // Get the signers
    const users = await hre.ethers.getSigners();
    let nullifiers = [];
    let secrets = [];
    let commitments = [];
  
    // Perform deposits
    for(let i = 0; i < NUM_DEPOSITS; i++) {
      const depositResponse = await axios.post('http://127.0.0.1:3000/deposit', {
        userAddress: users[i + 1].address
      });

      console.log('Deposit Response:', depositResponse.data);

      const { nullifier, secret, commitment } = depositResponse.data.response;
      nullifiers.push(nullifier);
      secrets.push(secret);
      commitments.push(commitment);
    }

    // Small time delay to allow the server to process the deposit
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get Merkle root and path
    for(let i = 0; i < NUM_DEPOSITS; i++) {
      const merkleInfoResponse = await axios.get(`http://127.0.0.1:3000/merkle-info/${commitments[i]}`);
      console.log('Merkle Info Response:', merkleInfoResponse.data);

      const { root, pathElements, pathIndices } = merkleInfoResponse.data;

      // Perform a withdrawal
      const withdrawResponse = await axios.post('http://127.0.0.1:3000/withdraw', {
        nullifier: nullifiers[i],
        secret: secrets[i],
        root,
        pathElements,
        pathIndices,
        userAddress: users[i + 1 + NUM_DEPOSITS].address
      });

      console.log('Withdraw Response:', withdrawResponse.data);
    }

  } catch (error) {
    console.error('Error in test script:', error);
  }
}

main();