// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IHasher {
    function MiMCSponge(
        uint256 in_xL,
        uint256 in_xR,
        uint256 k
    ) external pure returns (uint256 xL, uint256 xR);
}

contract MerkleTree {
    uint256 public constant FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

    uint32 public levels;
    uint32 public constant MAX_LEVELS = 32;
    IHasher public immutable hasher;
    
    mapping(uint32 => bytes32) public filledSubtrees;
    mapping(uint32 => bytes32) public roots;
    bytes32[MAX_LEVELS] public zeros;
    uint32 public nextIndex = 0;
    uint32 public rootIndex = 0;
    uint32 public constant ROOT_HISTORY = 30;

    /**
    * @dev Initializes the Merkle tree with the number of levels and the hasher, also precomputes the zero values
    * @param _levels The number of levels in the Merkle tree
    * @param _hasher The MiMC hash contract
    * @param initialZeroValue The initial zero value for the Merkle tree
     */
    constructor(uint32 _levels, IHasher _hasher, bytes32 initialZeroValue) {
        require(_levels > 0, "_levels should be greater than zero");
        require(_levels < 32, "_levels should be less than 32");
        levels = _levels;
        hasher = _hasher;

        // Initialize zero values dynamically
        zeros[0] = initialZeroValue;
        for (uint32 i = 1; i < MAX_LEVELS; i++) {
            zeros[i] = hashLeftRight(hasher, zeros[i - 1], zeros[i - 1]);
        }

        for (uint32 i = 0; i < _levels; i++) {
            filledSubtrees[i] = zeros[i];
        }

        roots[0] = zeros[_levels - 1];
    }

    /**
    * @dev Inserts a leaf into the Merkle tree
    * @param leaf The leaf to insert
     */
    function insert(bytes32 leaf) internal {
        require(nextIndex < 2**levels, "Merkle tree is full");

        uint32 index = nextIndex;
        bytes32 currentHash = leaf;

        for (uint32 i = 0; i < levels; i++) {
            if (index % 2 == 0) {
                filledSubtrees[i] = currentHash;
                currentHash = hashLeftRight(hasher, currentHash, zeros[i]);
            } else {
                currentHash = hashLeftRight(hasher, filledSubtrees[i], currentHash);
            }
            index /= 2;
        }

        uint32 newRootIndex = (rootIndex + 1) % ROOT_HISTORY;
        roots[newRootIndex] = currentHash;
        rootIndex = newRootIndex;
        nextIndex++;
    }

    /**
    * @dev Checks if a root is a root known in recent history
    * @param _root The root to check
    */
    function isKnownRoot(bytes32 _root) public view returns (bool) {
        uint32 index = rootIndex;
        for (uint32 i = 0; i < ROOT_HISTORY; i++) {
            if (roots[index] == _root) {
                return true;
            }
            index = (index + ROOT_HISTORY - 1) % ROOT_HISTORY;
        }
        return false;
    }

    /**
    * @dev Returns the last root
    */
    function getLastRoot() public view returns (bytes32) {
        return roots[rootIndex];
    }

    /**
     * @dev Hash 2 tree leaves, returns MiMC(_left, _right)
     */
    function hashLeftRight(
        IHasher _hasher,
        bytes32 _left,
        bytes32 _right
    ) private pure returns (bytes32) {
        require(
            uint256(_left) < FIELD_SIZE,
            "_left should be inside the field"
        );
        require(
            uint256(_right) < FIELD_SIZE,
            "_right should be inside the field"
        );
        uint256 R = uint256(_left);
        uint256 C = 0;
        (R, C) = _hasher.MiMCSponge(R, C, 0);
        R = addmod(R, uint256(_right), FIELD_SIZE);
        (R, C) = _hasher.MiMCSponge(R, C, 0);
        return bytes32(R);
    }

    /**
     * @dev Returns the zero values
     * just for debugging purposes
     */
    function getZeroValues() external view returns (bytes32[MAX_LEVELS] memory) {
        return zeros;
    }
}
