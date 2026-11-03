import type { IContentCipher } from "#/shared/application/ports/content-cipher.js";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export class AesGcmContentCipher implements IContentCipher {
  private readonly key: Buffer;

  constructor(secret: string) {
    this.key = createHash("sha256").update(secret).digest();
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return [
      "v1",
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(".");
  }

  decrypt(payload: string): string {
    const [version, encodedIv, encodedTag, encodedCiphertext, extra] = payload.split(".");
    if (version !== "v1" || !encodedIv || !encodedTag || !encodedCiphertext || extra)
      throw new Error("Encrypted content has an invalid envelope.");
    const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(encodedIv, "base64url"));
    decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encodedCiphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }
}
