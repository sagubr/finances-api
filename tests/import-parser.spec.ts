import { ImportFileParser } from "#/modules/planning/infrastructure/file/import-file.parser.js";
import { describe, expect, it } from "vitest";

describe("import file parser", () => {
  const parser = new ImportFileParser();

  it("normalizes Portuguese CSV headers, money and dates", () => {
    const rows = parser.parse(
      Buffer.from(
        "data;descrição;valor;tipo;conta_id\n02/11/2026;Mercado;1.234,56;DESPESA;019a4c64-9a81-7000-8000-000000000003\n",
      ),
      "extrato.csv",
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      normalized: {
        description: "Mercado",
        amountCents: 123_456,
        occurredOn: "2026-11-02",
        competenceMonth: "2026-11",
        type: "EXPENSE",
      },
      errors: [],
    });
  });

  it("reports every missing required field without throwing", () => {
    const [row] = parser.parse(Buffer.from("descricao\n\nRegistro incompleto\n"), "extrato.csv");

    expect(row?.errors).toEqual(
      expect.arrayContaining([
        "AMOUNT_INVALID",
        "DATE_INVALID",
        "TYPE_INVALID",
        "ACCOUNT_REQUIRED",
      ]),
    );
  });

  it("rejects impossible dates and non-v7 public identifiers during preview", () => {
    const [row] = parser.parse(
      Buffer.from(
        "data;descricao;valor;tipo;conta_id\n31/02/2026;Inválido;10,00;DESPESA;019a4c64-9a81-4000-8000-000000000003\n",
      ),
      "extrato.csv",
    );

    expect(row?.errors).toEqual(expect.arrayContaining(["DATE_INVALID", "ACCOUNT_INVALID"]));
    expect(row?.normalized).not.toHaveProperty("occurredOn");
    expect(row?.normalized).not.toHaveProperty("accountId");
  });

  it("rejects XLSX archives whose declared expanded content exceeds the safe limit", () => {
    const centralDirectory = Buffer.alloc(46);
    centralDirectory.writeUInt32LE(0x02014b50, 0);
    centralDirectory.writeUInt32LE(51 * 1024 * 1024, 24);
    const endRecord = Buffer.alloc(22);
    endRecord.writeUInt32LE(0x06054b50, 0);
    endRecord.writeUInt16LE(1, 10);
    endRecord.writeUInt32LE(centralDirectory.length, 12);
    endRecord.writeUInt32LE(0, 16);

    expect(() => parser.parse(Buffer.concat([centralDirectory, endRecord]), "unsafe.xlsx")).toThrow(
      "expanded content",
    );
  });

  it("stops CSV parsing at the preview row boundary", () => {
    const rows = Array.from(
      { length: 20_100 },
      () => "02/11/2026;Mercado;10,00;DESPESA;019a4c64-9a81-7000-8000-000000000003",
    );

    expect(
      parser.parse(
        Buffer.from(`data;descricao;valor;tipo;conta_id\n${rows.join("\n")}`),
        "bounded.csv",
      ),
    ).toHaveLength(20_001);
  });
});
