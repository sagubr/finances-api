export interface IContentCipher {
  encrypt(plaintext: string): string;
  decrypt(payload: string): string;
}
