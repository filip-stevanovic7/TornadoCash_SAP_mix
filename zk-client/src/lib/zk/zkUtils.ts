// src/lib/zk/zkUtils.ts
import { buildWitnessCalculator } from './witnessCalculator';

export async function generateProof(input: Record<string, any>): Promise<{
  proof: any;
  publicSignals: string[];
}> {
  const wasmResp = await fetch('/circuits/Withdraw/Withdraw.wasm');
  const zkeyResp = await fetch('/circuits/Withdraw/Withdraw_final.zkey');

  if (!wasmResp.ok || !zkeyResp.ok) {
    throw new Error('Failed to load wasm or zkey files');
  }

  const wasmBuffer = await wasmResp.arrayBuffer();
  const zkeyBuffer = await zkeyResp.arrayBuffer();

  const wc = await buildWitnessCalculator(new Uint8Array(wasmBuffer));
  const witnessBuffer = await wc.calculateWTNSBin(input, 0);

  // Use snarkjs from global window object
  const snarkjs = window.snarkjs;
  if (!snarkjs || !snarkjs.groth16) {
    throw new Error('snarkjs not found on window. Did you include snarkjs.min.js in your layout?');
  }

  const { proof, publicSignals } = await snarkjs.groth16.prove(
    zkeyBuffer,
    witnessBuffer
  );

  return { proof, publicSignals };
}
