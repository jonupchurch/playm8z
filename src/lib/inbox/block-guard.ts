import { hasActiveBlockBetween } from "@/lib/inbox/search-contacts";

// A refused-interaction result, shaped like every guarded action's failure branch
// ({ success: false; error }). `null` means "no active block -- proceed".
type Refusal = { success: false; error: string };

// 045 (ADR 0017): the shared, fail-closed block gate for user-to-user interaction
// write paths (apply / ask / invite). Symmetric -- hasActiveBlockBetween checks a
// block in either direction. Fail-closed: if the block lookup itself errors, the
// interaction is refused with a graceful generic message, never allowed and never an
// unhandled 500. Returns the caller's neutral per-path message on an actual block,
// or null when clear. (accept-request gates inline instead, because it throws to roll
// back its transaction rather than returning a result.)
export async function refuseIfBlocked(
  userIdA: string,
  userIdB: string,
  blockedMessage: string,
): Promise<Refusal | null> {
  let blocked: boolean;
  try {
    blocked = await hasActiveBlockBetween(userIdA, userIdB);
  } catch {
    return { success: false, error: "Something went wrong. Please try again." };
  }
  return blocked ? { success: false, error: blockedMessage } : null;
}
