export type PrivacyExportRecord = Readonly<{
  id: bigint;
  subjectRequestId: bigint;
}>;

export interface IPrivacyExportJobRepository {
  claim(publicId: string): Promise<PrivacyExportRecord | null>;
  collectSnapshot(): Promise<Readonly<Record<string, unknown>>>;
  markReady(
    item: PrivacyExportRecord,
    artifact: Readonly<{ storageKey: string; expiresAt: Date }>,
  ): Promise<void>;
}
