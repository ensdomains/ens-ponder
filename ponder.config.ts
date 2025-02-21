import { createConfig } from "ponder";
import { http } from "viem";

import { UnverifiedContractAbi } from "./abis/UnverifiedContractAbi";

export default createConfig({
  networks: {
    sepolia: {
      chainId: 11155111,
      transport: http(process.env.PONDER_RPC_URL_11155111),
    },
  },
  contracts: {
    UnverifiedContract: {
      abi: UnverifiedContractAbi,
      address: "0xdbbc2c0fe2a1d0fb4056b35a22e543beb715e7fc",
      network: "sepolia",
    },
  },
});
