import { gte } from "drizzle-orm";
import { db } from "@/db";
import { postings, users } from "@/db/schema";
import { countDistinctUsersOnDay, countOnDay, getActiveUserRowsSince, last7Days } from "./activity-data";

export type ActivityMetric = "signups" | "active" | "postings";

export type ActivityDay = {
  date: string;
  label: string;
  signups: number;
  active: number;
  postings: number;
};

// FR-003: one row per day for the last 7 days, all three metrics
// computed at once -- the client-side metric switcher (plan.md's
// Constraints: a UI-only concern, not a trust boundary) just picks
// which field to plot.
export async function getActivityChart(): Promise<ActivityDay[]> {
  const days = last7Days();
  const since = days[0];

  const [signupRows, postingRows, activityRows] = await Promise.all([
    db.select({ createdAt: users.createdAt }).from(users).where(gte(users.createdAt, since)),
    db.select({ createdAt: postings.createdAt }).from(postings).where(gte(postings.createdAt, since)),
    getActiveUserRowsSince(since),
  ]);

  return days.map((day) => ({
    date: day.toISOString().slice(0, 10),
    label: day.toLocaleDateString(undefined, { weekday: "short" }),
    signups: countOnDay(signupRows, day),
    postings: countOnDay(postingRows, day),
    active: countDistinctUsersOnDay(activityRows, day),
  }));
}
