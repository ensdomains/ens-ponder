import { createConfig } from "ponder";
import { http } from "viem";

import { ETHRegistryAbi } from "./abis/ETHRegistryAbi";
import { RegistryDatastoreAbi } from "./abis/RegistryDatastoreAbi";
import { RootRegistryAbi } from "./abis/RootRegistryAbi";
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
    RegistryDatastore: {
      abi: RegistryDatastoreAbi,
      address: "0x73308B430b61958e3d8C4a6db08153372d5eb125",
      network: "sepolia",
      startBlock: 7699319,
    },
    RootRegistry: {
      abi: RootRegistryAbi,
      address: "0xc44D7201065190B290Aaaf6efaDFD49d530547A3",
      network: "sepolia",
      startBlock: 7699319,
    },
  },
});
