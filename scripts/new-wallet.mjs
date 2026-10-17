import { writeFileSync, existsSync } from "node:fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const envPath = new URL("../.env", import.meta.url);

if (existsSync(envPath)) {
  console.error(".env already exists. Delete it first if you really want a new wallet.");
  process.exit(1);
}

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

writeFileSync(
  envPath,
  `# Tiramisu testnet wallet. NEVER commit this file.\nPRIVATE_KEY=${privateKey}\n`,
);

console.log("New Tiramisu testnet wallet created and saved to .env");
console.log("Address:", account.address);
console.log("Fund it with test GLM at https://hub.arkiv.network/faucet");
