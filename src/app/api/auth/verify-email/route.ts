import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const email = request.nextUrl.searchParams.get("email");

  if (!token || !email) {
    return NextResponse.redirect(new URL("/verify-email?status=invalid", request.url));
  }

  const [record] = await db
    .select()
    .from(verificationTokens)
    .where(and(eq(verificationTokens.identifier, email), eq(verificationTokens.token, token)));

  if (!record || record.expires < new Date()) {
    if (record) {
      await db
        .delete(verificationTokens)
        .where(and(eq(verificationTokens.identifier, email), eq(verificationTokens.token, token)));
    }
    return NextResponse.redirect(new URL("/verify-email?status=expired", request.url));
  }

  await db.update(users).set({ emailVerified: new Date() }).where(eq(users.email, email));
  await db
    .delete(verificationTokens)
    .where(and(eq(verificationTokens.identifier, email), eq(verificationTokens.token, token)));

  return NextResponse.redirect(new URL("/verify-email?status=success", request.url));
}
