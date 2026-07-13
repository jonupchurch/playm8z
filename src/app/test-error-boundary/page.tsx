// Deliberately throws -- e2e test infrastructure exercising the
// error.tsx/global-error.tsx boundary (US2). Not linked from anywhere
// in the product. Forced dynamic so the throw happens at request time,
// not at build time (a statically-prerenderable throwing page fails
// `next build` outright, since prerendering executes the page then).
export const dynamic = "force-dynamic";

export default function TestErrorBoundaryPage() {
  throw new Error("Intentional test error for e2e coverage of error.tsx");
}
