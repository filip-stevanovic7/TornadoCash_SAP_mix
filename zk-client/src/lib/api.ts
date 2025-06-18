import axios from 'axios';

export async function getMerkleInfo(commitment: string) {
  const res = await axios.get(`http://localhost:3000/merkle-info/${commitment}`);
  return res.data;
}
