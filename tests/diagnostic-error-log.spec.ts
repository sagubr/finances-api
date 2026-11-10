import { toDiagnosticErrorLog } from "#/shared/observability/safe-error-log.js";
import { describe, expect, it } from "vitest";

describe("diagnostic error log", () => {
  it("keeps actionable worker diagnostics while redacting sensitive values", () => {
    const cause = new Error(
      "connect ECONNREFUSED redis://worker:secret@localhost:6379\nparams: person@example.com,token",
    );
    const error = new Error("Job failed for person@example.com", { cause });
    const diagnostic = toDiagnosticErrorLog(error);
    const serialized = JSON.stringify(diagnostic);

    expect(diagnostic.message).toBe("Job failed for [REDACTED_EMAIL]");
    expect(diagnostic.stack).toContain("Job failed for [REDACTED_EMAIL]");
    expect(diagnostic.cause?.message).toContain("ECONNREFUSED");
    expect(serialized).not.toContain("person@example.com");
    expect(serialized).not.toContain("worker:secret");
    expect(serialized).toContain("params: [REDACTED]");
  });
});
