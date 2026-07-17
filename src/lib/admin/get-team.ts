import { desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { AssignableRole } from "@/lib/validations/admin-settings";

export type TeamMember = {
  id: string;
  handle: string;
  email: string;
  avatarColor: string | null;
  avatarImage: string | null;
  image: string | null;
  role: AssignableRole;
  createdAt: Date;
};

const ASSIGNABLE_ROLES: AssignableRole[] = ["viewer", "support", "moderator", "admin"];

// FR-007: every team member (role >= support, i.e. any of this
// feature's own admin-side values) with their current role -- a plain
// `user` never appears here.
export async function getTeam(): Promise<TeamMember[]> {
  const rows = await db
    .select({
      id: users.id,
      handle: users.handle,
      email: users.email,
      avatarColor: users.avatarColor,
      avatarImage: users.avatarImage,
      image: users.image,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(inArray(users.role, ASSIGNABLE_ROLES))
    .orderBy(desc(users.createdAt));

  return rows.map((row) => ({ ...row, handle: row.handle ?? "player", role: row.role as AssignableRole }));
}
