import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

export const PROJECT = "crops_drop";
export const TYPE = "drop";

export function encrypt(plaintext) {
  const key = randomBytes(32);
  return encryptWithKey(plaintext, key);
}

export function encryptWithKey(plaintext, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(Buffer.from(plaintext, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, ct, tag]);
  return {
    keyB64url: Buffer.from(key).toString("base64url"),
    payload: new Uint8Array(payload),
  };
}

export function decrypt(payload, keyB64url) {
  const buf = Buffer.from(payload);
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(buf.length - 16);
  const ct = buf.subarray(12, buf.length - 16);
  const key = Buffer.from(keyB64url, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
