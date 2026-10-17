# Friction report: building Drop on Arkiv

Versions used: `@arkiv-network/sdk` 0.8.1, `viem` 2.x, Node 24, Arkiv Tiramisu testnet (chain id 7738577).
Each item: what I expected, what actually happened, and how to reproduce.

## 1. Import path for attribute constructors differs between the docs and the agent guide

**Expected:** one obvious place to import `str`, `u64`, `i32`.

**Actual:** the querying/mutating docs import them from a subpath (`import { str, u64 } from "@arkiv-network/sdk/attr"`),
while the challenge's own `AGENTS.md` shows the package root (`import { i32, str } from "@arkiv-network/sdk"`).
Both work, but it is not obvious which is canonical.

**Reproduce:**
```js
import * as root from "@arkiv-network/sdk";
import { str } from "@arkiv-network/sdk/attr";
console.log(typeof root.str, typeof str); // "function function"
```
Suggestion: pick one and use it everywhere in the docs.

## 2. Browser usage needs a specific esm.sh query string

**Expected:** the browser CDN snippet to work with a plain `esm.sh/@arkiv-network/sdk` import.

**Actual:** the working form needs `?target=es2022&bundle-deps`, and the SDK's viem peer has to be imported
from the same host, otherwise the subpath modules (`/chains`, `/attr`, `/query`) fail to resolve their imports.

**Reproduce:** drop `?target=es2022&bundle-deps` from the imports on the Installation page and load the page;
the modules error at import time.

## 3. No server-side ordering means a client-side sort for "newest first"

**Expected:** a way to ask for entities ordered by an attribute.

**Actual:** the node returns newest-first by creation and supports no other order. Any attribute sort
(here, `created_at`) has to happen in the client. This is documented, but it is easy to miss and `limit()`
runs before your sort, so "top n by attribute" needs a different query shape.

**Reproduce:** `select({...}).where(eq("project", str("crops_drop"))).limit(200).fetch()` and try to get an
oldest-first page without sorting in JS.

## 4. `str` attributes are capped at 128 bytes and just sit there

**Expected:** could store a short message as a queryable `str` attribute.

**Actual:** 128-byte limit plus no control characters means free-form text has to go in the payload. That is
the right design (attributes are indexed cells), but it takes a moment to internalise; the mental model is
"attributes = filterable index, payload = the data".

**Reproduce:** `createEntity({ attributes: { body: str("x".repeat(200)) }, ... })` fails on the length rule.

## 5. Expiration is friendly but silent

**Expected:** a note when an entity expires.

**Actual:** from the expiry block on, the entity is simply gone: `getEntity()` throws `NoEntityFoundError`,
queries no longer return it, there is no event and no grace period. For a user-facing app the not-found and
expired cases are indistinguishable, so the UI has to phrase the error as "wrong key, expired, or never existed".

**Reproduce:** create a drop with `ExpirationTime.fromSeconds(...)` far in the past is rejected; instead create
one with the shortest lifetime, wait for the block to pass, then `getEntity()` the key and catch `NoEntityFoundError`.

## What was smooth

- `createEntity` / `getEntity` round-trip is a couple of lines each; the ciphertext (a `Uint8Array`) stores and
  returns byte-for-byte.
- The `project` attribute pattern (tag every entity, filter every query on it) makes a shared database feel
  like a private one with almost no effort.
- `$creator` being immutable is exactly what a privacy app wants for showing provenance without trusting a host.
