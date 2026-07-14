import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// next/cache's revalidatePath/revalidateTag require a request-scoped
// Next.js server context that doesn't exist under Vitest -- mocked
// globally so any Server Action calling them (first used by Inbox/
// messaging's start-conversation/accept-request/decline-request) can
// be unit-tested without a real Next.js request in flight.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
