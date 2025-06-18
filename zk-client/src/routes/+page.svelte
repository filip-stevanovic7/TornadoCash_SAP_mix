<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<script lang="ts">
  import { onMount } from 'svelte';
  import { getSigner, getTornadoContract } from '$lib/contract';
  import { getMerkleInfo } from '$lib/api';
  import { generateProof } from '$lib/zk';
  import { pedersenHash, bigIntToBuffer } from '../../../utils/utils';

  let signer;
  let address: string = "";
  let contract;
  let status = "";

  onMount(async () => {
    signer = await getSigner();
    address = await signer.getAddress();
    contract = await getTornadoContract(signer);
  });

  async function doDeposit(commitment: bigint) {
    status = "Depositing...";
    const tx = await contract.deposit(commitment, { value: ethers.parseEther("0.1") });
    await tx.wait();
    status = "Deposit complete.";
  }

  async function doWithdraw(nullifier: bigint, secret: bigint, commitment: string, recipient: string) {
    status = "Getting Merkle info...";
    const { root, pathElements, pathIndices } = await getMerkleInfo(commitment);

    const nullifierHash = await pedersenHash(bigIntToBuffer(nullifier, 31));

    const input = {
      root,
      nullifierHash,
      nullifier,
      secret,
      pathElements,
      pathIndices,
      recipient: BigInt(recipient)
    };

    status = "Generating proof...";
    const proof = await generateProof(input);

    status = "Sending withdraw...";
    const tx = await contract.withdraw(proof.proof, proof.publicInputs);
    await tx.wait();

    status = "Withdraw complete.";
  }
</script>

<h2>Welcome {address}</h2>
<p>{status}</p>

<!-- Add buttons and fields for commitment generation, deposit/withdraw -->
