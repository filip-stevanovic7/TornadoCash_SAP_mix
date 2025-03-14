import axios from 'axios';
import { ethers } from 'ethers';
import hre from 'hardhat';

async function main() {
  try {
    // Get the signers
    const [deployer, user1, user2] = await hre.ethers.getSigners();
  
    // Perform a deposit
    const depositResponse = await axios.post('http://127.0.0.1:3000/deposit', {
      userAddress: user1.address
    });

    console.log('Deposit Response:', depositResponse.data);

    const { nullifier, secret, commitment } = depositResponse.data.response;

    // Small time delay to allow the server to process the deposit
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get Merkle root and path
    const merkleInfoResponse = await axios.get(`http://127.0.0.1:3000/merkle-info/${commitment}`);
    console.log('Merkle Info Response:', merkleInfoResponse.data);

    const { root, pathElements, pathIndices } = merkleInfoResponse.data;

    // Perform a withdrawal
    const withdrawResponse = await axios.post('http://127.0.0.1:3000/withdraw', {
      nullifier,
      secret,
      root,
      pathElements,
      pathIndices,
      userAddress: user2.address
    });

    console.log('Withdraw Response:', withdrawResponse.data);

  } catch (error) {
    console.error('Error in test script:', error);
  }
}

main();