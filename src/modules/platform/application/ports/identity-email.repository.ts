import type { IdentityEmailPurpose } from "../identity-email.service.js";

export type PendingIdentityEmail = Readonly<{
  email: string;
  displayName: string;
  purpose: IdentityEmailPurpose;
  tokenCiphertext: string;
}>;

export interface IIdentityEmailRepository {
  findPendingByTokenId(tokenId: string): Promise<PendingIdentityEmail | null>;
}
