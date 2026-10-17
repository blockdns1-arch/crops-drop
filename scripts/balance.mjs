import { createPublicClient } from "@arkiv-network/sdk";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { http } from "viem";

const address = process.argv[2];
if (!address) {
  console.error("Usage: node scripts/balance.mjs <address>");
  process.exit(1);
}

const publicClient = createPublicClient({ chain: tiramisu, transport: http() });
const balance = await publicClient.getBalance({ address });
console.log(address, balance.toString(), "wei GLM");
