import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handleSchema } from "@/lib/validations/auth";

export async function GET(request: NextRequest) {
  const handle = request.nextUrl.searchParams.get("handle") ?? "";

  const parsed = handleSchema.safeParse(handle);
  if (!parsed.success) {
    return NextResponse.json({
      available: false,
      reason:
        "Handle must start with a letter and contain only letters and numbers (max 24 characters).",
    });
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.handle, parsed.data));

  return NextResponse.json({ available: !existing });
}
