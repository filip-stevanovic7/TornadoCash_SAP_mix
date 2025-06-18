// src/types/ethereum.d.ts

export {};

declare global {
  interface Window {
    ethereum?: import('ethers').Eip1193Provider;
  }
}
