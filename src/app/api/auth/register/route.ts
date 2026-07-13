import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcrypt-ts";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { registerSchema } from "@/lib/validations/auth";
import { sendVerificationEmail } from "@/lib/email/send-verification-email";

const VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24h

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "Invalid input.", field: issue?.path[0] },
      { status: 400 },
    );
  }

  const { handle, email, password } = parsed.data;

  const [existing] = await db
    .select({ email: users.email, handle: users.handle })
    .from(users)
    .where(or(eq(users.email, email), eq(users.handle, handle)));

  if (existing) {
    const field = existing.email === email ? "email" : "handle";
    return NextResponse.json(
      {
        error:
          field === "email"
            ? "That email is already registered."
            : "That handle is already taken.",
        field,
      },
      { status: 409 },
    );
  }

  const passwordHash = await hash(password, 10);

  let user;
  try {
    [user] = await db
      .insert(users)
      .values({ handle, email, passwordHash })
      .returning({ id: users.id, email: users.email, name: users.name });
  } catch (err) {
    // Belt-and-suspenders against a race between the SELECT above and this
    // INSERT -- the unique constraints on email/handle are the real guard.
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      return NextResponse.json(
        { error: "That email or handle is already taken." },
        { status: 409 },
      );
    }
    throw err;
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
  await db.insert(verificationTokens).values({ identifier: email, token, expires });

  await sendVerificationEmail({ email: user.email, name: user.name }, token);

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
