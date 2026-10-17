# Arkiv schema

All entities belong to the `crops_drop` project on the Arkiv **Tiramisu** testnet.

## Entity type: `drop`

A single encrypted message.

| Field | Value |
| --- | --- |
| `payload` | AES-256-GCM ciphertext as raw bytes: `iv (12 bytes) ‖ ciphertext ‖ tag (16 bytes)` |
| `contentType` | `application/octet-stream` |
| `expires` | `ExpirationTime.fromHours(n)`, `n` in `{1, 6, 24, 168, 720}` (the UI) - any whole number of hours from the CLI |
| `creator` | the wallet that created the entity (immutable, `$creator`) |
| `owner` | same as creator; never transferred |

### Attributes

| Name | Type | Always set | Meaning |
| --- | --- | --- | --- |
| `project` | `str` | yes | Always `"crops_drop"`. Scopes every query to this app. |
| `type` | `str` | yes | Always `"drop"`. Distinguishes entity kinds if the project grows. |
| `created_at` | `u64` | yes | `Date.now()` in milliseconds. Numeric so it can be range-filtered and sorted. |

The plaintext is never stored, not even hashed. Attributes hold only non-sensitive routing data, so they are
safe to index. The decryption key is never written to Arkiv.

## Expiration

Every entity type carries an expiry - there is no permanent data in this app:

| Type | Expiration |
| --- | --- |
| `drop` | `ExpirationTime.fromHours(n)`, chosen per drop (1 hour to 30 days) |

Expiration is the whole point: a private message should not outlive its usefulness. Because the key is not
stored anywhere central, an expired drop leaves nothing behind to leak.

## Queries the app runs

**Read one drop** (browser app and CLI). A direct key lookup, no filter needed:

```ts
const entity = await publicClient.getEntity(entityKey);
// entity.creator, entity.expiresAt, entity.payload (ciphertext)
```

**List recent drops** (optional discovery view). Everything is scoped by the `project` attribute so the
query only ever returns this app's entities:

```ts
const page = await publicClient
  .select({ key: true, attributes: { created_at: true } })
  .where(eq("project", str("crops_drop")), eq("type", str("drop")))
  .limit(200)
  .fetch();

// The node has no server-side ordering, so we sort newest-first on the client.
const newestFirst = [...page.entities].sort(
  (a, b) => Number(b.attributes.created_at.value - a.attributes.created_at.value),
);
```

Note: only the ciphertext is public. Reading an entity never reveals the message, because the decryption key
travels in the URL fragment and never reaches Arkiv or any server.
