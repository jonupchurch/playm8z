"use server";

import { requireAuth } from "@/lib/auth/require-auth";
import { searchCandidateUsers, type UserCandidate } from "@/lib/users/search-users";
import { candidateSearchSchema } from "@/lib/validations/blocking";

// Searching for a candidate isn't itself a block/unblock write action,
// so this only needs an authenticated session (requireAuth()), not
// Auth & Onboarding's stricter email-verification gate.
export async function searchBlockCandidates(query: string): Promise<UserCandidate[]> {
  const user = await requireAuth();
  const parsed = candidateSearchSchema.safeParse({ q: query });
  const q = parsed.success ? parsed.data.q : "";
  return searchCandidateUsers(q, user.id);
}
