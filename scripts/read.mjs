import { createPublicClient } from "@arkiv-network/sdk";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { http } from "viem";
import { decrypt } from "./lib.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : undefined;
};

const entityKey = flag("e");
const key = flag("k");

if (!entityKey || !key) {
  console.error("Usage: node scripts/read.mjs --e <entityKey> --k <key>");
  process.exit(1);
}

const publicClient = createPublicClient({ chain: tiramisu, transport: http() });
const entity = await publicClient.getEntity(entityKey);

console.log("Entity");
console.log("  creator:  ", entity.creator);
console.log("  owner:    ", entity.owner);
console.log("  createdAt:", entity.createdAt.toString());
console.log("  expiresAt:", entity.expiresAt.toString());
console.log("");

try {
  console.log("Decrypted message:");
  console.log("  " + decrypt(entity.payload, key));
} catch {
  console.error("Could not decrypt: wrong key, or the data is corrupted.");
  process.exit(1);
}
