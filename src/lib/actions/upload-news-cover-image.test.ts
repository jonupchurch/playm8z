import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

// research.md #5: @vercel/blob is mocked so no real network write ever
// happens in tests.
vi.mock("@vercel/blob", () => ({ put: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

const { put } = await import("@vercel/blob");
const { auth } = await import("@/auth");
const { uploadNewsCoverImage } = await import("./upload-news-cover-image");
const mockedPut = put as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}

function fakeImageFile(sizeBytes: number, type = "image/jpeg", name = "cover.jpg"): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

const runId = crypto.randomUUID().slice(0, 8);
const moderatorEmail = `upload-cover-mod-${runId}@example.com`;
const plainEmail = `upload-cover-plain-${runId}@example.com`;

afterAll(async () => {
  await db.delete(users).where(eq(users.email, moderatorEmail));
  await db.delete(users).where(eq(users.email, plainEmail));
});

afterEach(() => {
  mockedAuth.mockReset();
  mockedPut.mockReset();
});

describe("uploadNewsCoverImage", () => {
  it("rejects a plain user session before any Blob call is made", async () => {
    await db.insert(users).values({ email: plainEmail, handle: `uploadcoverplain${runId}` });
    mockedAuth.mockResolvedValue(fakeSession(plainEmail));

    const formData = new FormData();
    formData.set("file", fakeImageFile(1024));
    await expect(uploadNewsCoverImage(formData)).rejects.toThrow();
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it("rejects a non-image file type before any Blob call is made", async () => {
    await db.insert(users).values({ email: moderatorEmail, handle: `uploadcovermod${runId}`, role: "moderator" });
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));

    const formData = new FormData();
    formData.set("file", fakeImageFile(1024, "text/plain", "notes.txt"));
    const result = await uploadNewsCoverImage(formData);
    expect(result.success).toBe(false);
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it("rejects an oversized file before any Blob call is made", async () => {
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));

    const formData = new FormData();
    formData.set("file", fakeImageFile(6 * 1024 * 1024));
    const result = await uploadNewsCoverImage(formData);
    expect(result.success).toBe(false);
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it("uploads a valid image with public access and returns its URL", async () => {
    mockedAuth.mockResolvedValue(fakeSession(moderatorEmail));
    mockedPut.mockResolvedValue({ url: "https://example.public.blob.vercel-storage.com/cover-abc123.jpg" });

    const formData = new FormData();
    formData.set("file", fakeImageFile(1024));
    const result = await uploadNewsCoverImage(formData);

    expect(result).toEqual({ success: true, url: "https://example.public.blob.vercel-storage.com/cover-abc123.jpg" });
    expect(mockedPut).toHaveBeenCalledWith(
      expect.stringContaining("cover.jpg"),
      expect.anything(),
      expect.objectContaining({ access: "public" }),
    );
  });
});
