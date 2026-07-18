import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcrypt-ts";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { registerSchema } from "@/lib/validations/auth";
import { sendVerificationEmail } from "@/lib/email/send-verification-email";
import { getSettings } from "@/lib/settings/get-settings";
import { checkRateLimit } from "@/lib/rate-limit/check-rate-limit";
import { clientIp } from "@/lib/rate-limit/client-ip";
import { RATE_LIMITS } from "@/lib/rate-limit/limits";

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

  // Rate-limit signups per client IP (ADR 0020) -- blunts mass account
  // creation and the email-enumeration probing that #8 leaves as an accepted
  // UX tradeoff (docs/future-work.md). Skipped when there's no real forwarded
  // IP (local dev / e2e / CI).
  const ip = clientIp(request.headers);
  if (ip) {
    const gate = await checkRateLimit(`register:${ip}`, RATE_LIMITS.register.limit, RATE_LIMITS.register.windowMs);
    if (!gate.allowed) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }
  }

  // Admin Settings (024)/FR-009: rejects a brand-new Credentials sign-up
  // when Open Signups is off -- existing logins are wholly unaffected
  // (this route is sign-up only; a Credentials login goes through
  // auth.ts's own authorize(), never here). Google OAuth's own new-
  // account creation is NOT gated by this toggle -- @auth/drizzle-
  // adapter's createUser runs before any app callback can intervene
  // without leaving a stray row, which would need its own cleanup
  // infrastructure beyond this feature's bounded scope.
  const settings = await getSettings();
  if (!settings.openSignups) {
    return NextResponse.json(
      { error: "New sign-ups are temporarily closed. Please check back soon." },
      { status: 403 },
    );
  }

  const { handle, email, password } = parsed.data;

  const [existing] = await db
    .select({ email: users.email, handle: users.handle })
    .from(users)
    .where(or(eq(users.email, email), eq(users.handle, handle)));

  if (existing) {
    // This deliberately reveals whether the EMAIL is already registered --
    // an accepted enumeration tradeoff (standard signup UX; handles are
    // public identity anyway, ADR 0006), documented in docs/future-work.md.
    // The per-IP rate limit above blunts scripted mass enumeration.
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
      .values({ handle, email, passwordHash, privacyDiscoverable: settings.discoverableByDefault })
      .returning({ id: users.id, email: users.email, name: users.name });
  } catch (err) {
    // Belt-and-suspenders against a race between the SELECT above and this
    // INSERT -- the unique constraints on email/handle are the real guard.
    // Drizzle wraps the raw postgres.js error in a `DrizzleQueryError`,
    // whose own `code` is undefined -- the real code lives at
    // `err.cause.code` (fixed 2026-07-13, News feed/013's session,
    // after finding the identical bug in toggle-like.ts).
    const code =
      err && typeof err === "object"
        ? ((err as { code?: unknown }).code ?? (err as { cause?: { code?: unknown } }).cause?.code)
        : undefined;
    if (code === "23505") {
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
