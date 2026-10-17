import { createWalletClient, ExpirationTime } from "@arkiv-network/sdk";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { str, u64 } from "@arkiv-network/sdk/attr";
import { http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { encrypt, PROJECT, TYPE } from "./lib.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : undefined;
};

const message = flag("message");
const hours = Number(flag("hours") ?? 24);

if (!message) {
  console.error('Usage: node --env-file=.env scripts/create.mjs --message "secret" [--hours 24]');
  process.exit(1);
}

const account = privateKeyToAccount(process.env.PRIVATE_KEY);
const walletClient = createWalletClient({
  chain: tiramisu,
  transport: http(),
  account,
});

const { keyB64url, payload } = encrypt(message);

const { entityKey, txHash, expiresAt } = await walletClient.createEntity({
  payload,
  contentType: "application/octet-stream",
  attributes: {
    project: str(PROJECT),
    type: str(TYPE),
    created_at: u64(Date.now()),
  },
  expires: ExpirationTime.fromHours(hours),
});

console.log("Entity created");
console.log("  entityKey:", entityKey);
console.log("  txHash:   ", txHash);
console.log("  expiresAt:", expiresAt.toString());
console.log("  creator:  ", account.address);
console.log("");
console.log("Share this link (key stays in the URL fragment, never sent to a server):");
console.log(`  #e=${entityKey}&k=${keyB64url}`);
