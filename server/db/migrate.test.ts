import { describe, it, expect, mock, beforeEach } from "bun:test";
process.env.DATABASE_URL = "postgres://test";

const mockSql = mock(async () => []) as any;
mockSql.file = mock(async () => {});
mockSql.begin = mock(async (cb: any) => {
  const tx = mock(async () => []) as any;
  tx.file = mockSql.file;
  await cb(tx);
});

mock.module("./connection", () => ({
  sql: mockSql,
}));

import { runMigrations } from "./migrate";

describe("Migration Runner", () => {
  beforeEach(() => {
    mockSql.mockClear();
    mockSql.file.mockClear();
    mockSql.begin.mockClear();
  });

  it("should handle errors gracefully", async () => {
    mockSql.mockImplementationOnce(async () => {
      throw new Error("DB Connection Error");
    });

    const result = await runMigrations();
    expect(result).toBe(false);
  });
});
