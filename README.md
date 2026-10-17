# Drop

**Censorship-resistant, private, self-expiring messages on [Arkiv](https://arkiv.network), the Web3 database.**

Write a secret. It is encrypted **in your browser**, stored on Arkiv as a single entity, readable only
by whoever holds the link, and it deletes itself at expiry. There is no server in the middle: no account,
no database operator that can read the message, censor it, or be forced to hand it over.

- Track: **Privacy** (CROPS) - and it also serves censorship resistance.
- Network: Arkiv **Tiramisu** testnet (chain id `7738577`).
- Live app: **https://blockdns1-arch.github.io/crops-drop/**
- Demo drop already on Tiramisu:
  **[open a live drop](https://blockdns1-arch.github.io/crops-drop/#e=0x9ccec8c296038661446b043d9dcbc2492cc3bdd73f910ee5a1ac39d7374de33a&k=4yH6uLv_vZW03bc8I5y1wNqqR9rZ-XSsGxDTh7PfORg)**
  (entity `0x9ccec8c2...4de33a`, created by `0x953BaA88...E45323`, expires 24h after creation)

## Why Arkiv

A message that must survive takedown, stay unreadable to hosts, and clean itself up needs three things a
normal backend cannot give together:

| Requirement | Postgres / your own API | IPFS | Arkiv |
| --- | --- | --- | --- |
| No single operator can delete or be forced to reveal it | no | yes | yes |
| Queryable by indexed attributes | yes | no | yes |
| Built-in per-entity expiration | no | no | yes |
| Verifiable creator, independent of the host | no | no | yes (`$creator`, immutable) |

Arkiv is the only piece that is **queryable, time-scoped and wallet-owned at once**. The payload itself is
opaque ciphertext, so even the network never sees plaintext. We deliberately keep the decryption key **off**
Arkiv - it lives only in the URL fragment (`#k=...`), which browsers never send to a server.

## How it uses Arkiv

- `createEntity()` - stores the ciphertext with indexed attributes (`project`, `type`, `created_at`) and an
  expiry (`ExpirationTime.fromHours(n)`), so the drop deletes itself.
- `getEntity(key)` - reads the ciphertext back by entity key to decrypt it.
- **Entity Expiration** - every drop dies on its own; nothing to clean up and nothing to leak.
- **`$creator`** - the immutable creator address is shown when a drop is opened, so the reader can see which
  wallet published it.

Full schema and the exact queries are in [`/arkiv/schema.md`](arkiv/schema.md).

## Run it

Everything is reproducible with Node 18+.

```bash
git clone https://github.com/<you>/crops-drop && cd crops-drop
npm install

# 1. create a testnet wallet (writes .env, prints the address)
npm run new-wallet

# 2. fund that address with test GLM at https://hub.arkiv.network/faucet

# 3. write a drop (encrypts locally, stores ciphertext on Arkiv)
npm run post -- --message "meet at the usual place, 9pm" --hours 24
# -> prints entityKey, txHash and a share link

# 4. read it back
npm run read -- --e <entityKey> --k <key>
```

Open the app with any static server to use the browser UI:

```bash
npx serve .
# then open http://localhost:3000
```

## Reproduce the Arkiv usage (for judges)

1. `npm install && npm run new-wallet`, fund the address at the faucet.
2. `npm run post -- --message "judge test" --hours 1` - this creates one Arkiv entity and prints its key.
3. Look it up on the explorer: https://tiramisu.explorer.arkiv.network - search the `entityKey`.
4. `npm run read -- --e <entityKey> --k <key>` - prints the decrypted text, proving the round-trip.
5. For the browser flow: open the live app, connect MetaMask (it adds the Tiramisu network), create a drop,
   open the returned link in a new tab.

## Files

- `index.html`, `app.js`, `style.css` - the browser app (encryption via WebCrypto, Arkiv via the JS SDK).
- `scripts/` - the CLI (`create`, `read`) used to reproduce the Arkiv writes without a wallet UI.
- `arkiv/schema.md` - entity types, attributes, expiration and queries.
- `arkiv/friction.md` - feedback on building with Arkiv.

## Wallets that create Arkiv entities on Tiramisu

- `0x953BaA88c280df9e59C149BC5aB9B9ec64E45323` - the wallet used to create the drops shown in the live app
  and in the demo video (role: creates the published drops).
- Any wallet you create with `npm run new-wallet` - your own wallet, if you reproduce the steps below.

## License

MIT - see [LICENSE](LICENSE).
