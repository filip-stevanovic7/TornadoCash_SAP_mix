// src/lib/contract/tornado.ts
import { ethers } from 'ethers';
import { ETHTornado__factory } from '$typechain-types/factories';


export async function connectWallet() {
  if (!window.ethereum) throw new Error("No wallet found");

  await window.ethereum.request({ method: 'eth_requestAccounts' });
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  return { provider, signer };
}

export function getTornadoContract(signerOrProvider: ethers.Provider | ethers.Signer) {
  const tornadoAddress = '0xYourContractAddressHere';
  return ETHTornado__factory.connect(tornadoAddress, signerOrProvider);
}
