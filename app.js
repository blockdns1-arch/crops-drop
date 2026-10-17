import { createPublicClient, createWalletClient, ExpirationTime } from "https://esm.sh/@arkiv-network/sdk?target=es2022&bundle-deps";
import { tiramisu } from "https://esm.sh/@arkiv-network/sdk/chains?target=es2022&bundle-deps";
import { str, u64 } from "https://esm.sh/@arkiv-network/sdk/attr?target=es2022&bundle-deps";
import { http, custom } from "https://esm.sh/viem?target=es2022";

const PROJECT = "crops_drop";
const TYPE = "drop";
const CHAIN_ID = "0x" + (7738577).toString(16);

const publicClient = createPublicClient({ chain: tiramisu, transport: http() });
const $ = (id) => document.getElementById(id);

function b64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s) {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function encryptText(text) {
  const key = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ck = await crypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, ck, new TextEncoder().encode(text)),
  );
  const payload = new Uint8Array(iv.length + ct.length);
  payload.set(iv, 0);
  payload.set(ct, iv.length);
  return { keyB64url: b64url(key), payload };
}

async function decryptText(payload, keyB64url) {
  const buf = new Uint8Array(payload);
  const iv = buf.slice(0, 12);
  const ct = buf.slice(12);
  const ck = await crypto.subtle.importKey("raw", fromB64url(keyB64url), "AES-GCM", false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, ck, ct);
  return new TextDecoder().decode(pt);
}

async function connectWallet() {
  if (!window.ethereum) throw new Error("No EVM wallet found. Install MetaMask.");
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID }] });
  } catch (e) {
    if (e.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_ID,
            chainName: "Arkiv Tiramisu testnet",
            nativeCurrency: { name: "GLM", symbol: "GLM", decimals: 18 },
            rpcUrls: ["https://rpc.tiramisu.db-chain.testnet.arkiv.network"],
            blockExplorerUrls: ["https://tiramisu.explorer.arkiv.network"],
          },
        ],
      });
    } else {
      throw e;
    }
  }
  const [account] = await window.ethereum.request({ method: "eth_requestAccounts" });
  return account;
}

async function createDrop() {
  const status = $("createStatus");
  const message = $("message").value.trim();
  if (!message) return (status.textContent = "Write a message first.");
  const hours = Number($("hours").value);
  try {
    status.textContent = "Connecting wallet...";
    const account = await connectWallet();
    const walletClient = createWalletClient({ chain: tiramisu, transport: custom(window.ethereum), account });
    status.textContent = "Encrypting in your browser...";
    const { keyB64url, payload } = await encryptText(message);
    status.textContent = "Storing the encrypted drop on Arkiv...";
    const { entityKey } = await walletClient.createEntity({
      payload,
      contentType: "application/octet-stream",
      attributes: { project: str(PROJECT), type: str(TYPE), created_at: u64(Date.now()) },
      expires: ExpirationTime.fromHours(hours),
    });
    const link = `${location.origin}${location.pathname}#e=${entityKey}&k=${keyB64url}`;
    $("result").innerHTML =
      `<p>Share this link. The decryption key lives only in the part after <code>#</code>, which browsers never send to a server.</p>` +
      `<input id="shareLink" readonly value="${link}" />` +
      `<button id="copyBtn" class="ghost">Copy</button>` +
      `<p class="muted">entityKey: <code>${entityKey}</code></p>`;
    $("copyBtn").onclick = () => {
      $("shareLink").select();
      document.execCommand("copy");
      $("copyBtn").textContent = "Copied";
    };
    status.textContent = "Done.";
  } catch (e) {
    status.textContent = "Error: " + (e.shortMessage || e.message || String(e));
  }
}

async function readDrop() {
  const status = $("readStatus");
  const e = $("entityKey").value.trim();
  const k = $("keyField").value.trim();
  if (!e || !k) return (status.textContent = "Paste both the entity key and the key.");
  try {
    status.textContent = "Fetching from Arkiv...";
    const entity = await publicClient.getEntity(e);
    const text = await decryptText(entity.payload, k);
    $("readResult").innerHTML =
      `<p class="muted">Created by <code>${entity.creator}</code></p>` +
      `<p class="muted">Expires at block <code>${entity.expiresAt}</code></p>` +
      `<pre id="plain"></pre>`;
    $("plain").textContent = text;
    status.textContent = "Unlocked.";
  } catch (e) {
    status.textContent = "Could not unlock: wrong key, expired, or not found.";
  }
}

function showTab(name) {
  for (const t of ["create", "read"]) {
    $(t + "Tab").classList.toggle("active", t === name);
    $(t + "Panel").hidden = t !== name;
  }
}

$("createTab").onclick = () => showTab("create");
$("readTab").onclick = () => showTab("read");
$("createBtn").onclick = createDrop;
$("readBtn").onclick = readDrop;

const p = new URLSearchParams(location.hash.slice(1));
if (p.get("e") && p.get("k")) {
  $("entityKey").value = p.get("e");
  $("keyField").value = p.get("k");
  showTab("read");
  readDrop();
} else {
  showTab("create");
}
