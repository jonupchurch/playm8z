import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: { select: vi.fn() } }));

const { db } = await import("@/db");
const { getSettings, _resetSettingsCacheForTests } = await import("./get-settings");

const mockedSelect = db.select as unknown as ReturnType<typeof vi.fn>;

function mockRow(row: unknown) {
  mockedSelect.mockReturnValue({
    from: () => ({
      limit: () => Promise.resolve(row === undefined ? [] : [row]),
    }),
  });
}

describe("getSettings", () => {
  beforeEach(() => {
    _resetSettingsCacheForTests();
    mockedSelect.mockReset();
  });

  it("returns a valid row's values as-is", async () => {
    mockRow({ maintenanceMode: true, maintenanceMessage: "Back by 3am UTC" });
    const result = await getSettings();
    expect(result).toEqual({ maintenanceMode: true, maintenanceMessage: "Back by 3am UTC" });
  });

  it("treats a null message as the generic-fallback case", async () => {
    mockRow({ maintenanceMode: false, maintenanceMessage: null });
    const result = await getSettings();
    expect(result.maintenanceMessage).toBeNull();
  });

  it("falls back to safe defaults when the row fails Zod validation", async () => {
    mockRow({ maintenanceMode: "not-a-boolean", maintenanceMessage: null });
    const result = await getSettings();
    expect(result).toEqual({ maintenanceMode: false, maintenanceMessage: null });
  });

  it("falls back to safe defaults when no row exists at all", async () => {
    mockRow(undefined);
    const result = await getSettings();
    expect(result).toEqual({ maintenanceMode: false, maintenanceMessage: null });
  });

  it("caches the result -- a second call within the TTL doesn't hit the database again", async () => {
    mockRow({ maintenanceMode: true, maintenanceMessage: null });
    await getSettings();
    await getSettings();
    expect(mockedSelect).toHaveBeenCalledOnce();
  });
});
