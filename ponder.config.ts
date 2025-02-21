import { createConfig } from "ponder";
import { http } from "viem";

import { ETHRegistryAbi } from "./abis/ETHRegistryAbi";

export default createConfig({
  networks: {
    sepolia: {
      chainId: 11155111,
      transport: http(process.env.PONDER_RPC_URL_11155111),
    },
  },
  contracts: {
    EthRegistry: {
      abi: ETHRegistryAbi,
      address: "0xFd8562F0B884b5f8d137ff50D25fc26b34868172",
      network: "sepolia",
      startBlock: 7699319,
    },
  },
});
