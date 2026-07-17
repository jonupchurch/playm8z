import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

vi.mock("@vercel/blob", () => ({ put: vi.fn(), del: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

const { put, del } = await import("@vercel/blob");
const { auth } = await import("@/auth");
const { uploadAvatar, removeAvatar } = await import("./update-avatar");
const mockedPut = put as unknown as ReturnType<typeof vi.fn>;
const mockedDel = del as unknown as ReturnType<typeof vi.fn>;
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

function fakeSession(email: string) {
  return { user: { email }, expires: new Date(Date.now() + 60_000).toISOString() };
}
function fakeImageFile(sizeBytes: number, type = "image/jpeg", name = "me.jpg"): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}
function form(file: unknown): FormData {
  const fd = new FormData();
  if (file !== undefined) fd.set("file", file as File);
  return fd;
}

const runId = crypto.randomUUID().slice(0, 8);
const email = `avatar-${runId}@example.com`;
let userId: string;

beforeEach(async () => {
  vi.clearAllMocks();
  mockedAuth.mockResolvedValue(fakeSession(email));
  mockedPut.mockResolvedValue({ url: "https://blob.example/avatars/new-abc.jpg" });
  mockedDel.mockResolvedValue(undefined);
  const [u] = await db
    .insert(users)
    .values({ email, handle: `avatar${runId}`, image: "https://g.example/google.jpg" })
    .onConflictDoUpdate({ target: users.email, set: { avatarImage: null } })
    .returning({ id: users.id });
  userId = u.id;
});

afterEach(async () => {
  await db.update(users).set({ avatarImage: null }).where(eq(users.id, userId));
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, userId));
});

async function readAvatarImage() {
  const [row] = await db.select({ avatarImage: users.avatarImage }).from(users).where(eq(users.id, userId));
  return row.avatarImage;
}

describe("uploadAvatar", () => {
  it("stores the uploaded URL in avatarImage on success", async () => {
    const result = await uploadAvatar(form(fakeImageFile(1024)));
    expect(result).toEqual({ success: true, url: "https://blob.example/avatars/new-abc.jpg" });
    expect(await readAvatarImage()).toBe("https://blob.example/avatars/new-abc.jpg");
  });

  it("NEVER writes users.image -- the Google photo must survive an upload (FR-006)", async () => {
    await uploadAvatar(form(fakeImageFile(1024)));
    const [row] = await db.select({ image: users.image }).from(users).where(eq(users.id, userId));
    expect(row.image).toBe("https://g.example/google.jpg");
  });

  it("rejects a non-image type without changing the avatar", async () => {
    const result = await uploadAvatar(form(new File(["x"], "virus.exe", { type: "application/octet-stream" })));
    expect(result.success).toBe(false);
    expect(mockedPut).not.toHaveBeenCalled();
    expect(await readAvatarImage()).toBeNull();
  });

  it("rejects an oversize image without changing the avatar", async () => {
    const result = await uploadAvatar(form(fakeImageFile(6 * 1024 * 1024)));
    expect(result.success).toBe(false);
    expect(mockedPut).not.toHaveBeenCalled();
    expect(await readAvatarImage()).toBeNull();
  });

  it("rejects a missing file", async () => {
    const result = await uploadAvatar(form(undefined));
    expect(result.success).toBe(false);
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it("deletes the PRIOR blob when replacing an existing upload (FR-012)", async () => {
    await db
      .update(users)
      .set({ avatarImage: "https://blob.example/avatars/old-xyz.jpg" })
      .where(eq(users.id, userId));

    await uploadAvatar(form(fakeImageFile(1024)));

    expect(mockedDel).toHaveBeenCalledWith("https://blob.example/avatars/old-xyz.jpg");
    expect(await readAvatarImage()).toBe("https://blob.example/avatars/new-abc.jpg");
  });

  it("does NOT call del on a first upload (no prior blob)", async () => {
    await uploadAvatar(form(fakeImageFile(1024)));
    expect(mockedDel).not.toHaveBeenCalled();
  });

  it("still succeeds if deleting the old blob fails -- the DB is already updated", async () => {
    await db
      .update(users)
      .set({ avatarImage: "https://blob.example/avatars/old-xyz.jpg" })
      .where(eq(users.id, userId));
    mockedDel.mockRejectedValue(new Error("blob gone"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await uploadAvatar(form(fakeImageFile(1024)));
    expect(result.success).toBe(true);
    expect(await readAvatarImage()).toBe("https://blob.example/avatars/new-abc.jpg");
  });

  it("refuses when not authenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    await expect(uploadAvatar(form(fakeImageFile(1024)))).rejects.toThrow();
    expect(mockedPut).not.toHaveBeenCalled();
  });
});

describe("removeAvatar", () => {
  it("clears avatarImage and deletes its blob (FR-011/012)", async () => {
    await db
      .update(users)
      .set({ avatarImage: "https://blob.example/avatars/mine.jpg" })
      .where(eq(users.id, userId));

    const result = await removeAvatar();
    expect(result.success).toBe(true);
    expect(mockedDel).toHaveBeenCalledWith("https://blob.example/avatars/mine.jpg");
    expect(await readAvatarImage()).toBeNull();
  });

  it("never touches the Google photo -- removing an upload reveals it (FR-006)", async () => {
    await db
      .update(users)
      .set({ avatarImage: "https://blob.example/avatars/mine.jpg" })
      .where(eq(users.id, userId));

    await removeAvatar();
    const [row] = await db.select({ image: users.image }).from(users).where(eq(users.id, userId));
    expect(row.image).toBe("https://g.example/google.jpg");
  });

  it("is a no-op (not an error) when there is no uploaded avatar", async () => {
    const result = await removeAvatar();
    expect(result.success).toBe(true);
    expect(mockedDel).not.toHaveBeenCalled();
  });

  it("refuses when not authenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    await expect(removeAvatar()).rejects.toThrow();
  });
});
