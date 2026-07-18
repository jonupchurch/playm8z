// The single display fallback for a user who has no handle yet. A brief window
// exists between the Auth.js adapter creating a Google account row and onboarding
// Step 1 setting the handle (see the `users.handle` schema note), so reads that
// render a handle guard with this. One constant so a copy/i18n change is one edit,
// not the ~60 `?? "player"` sites this replaced.
export const FALLBACK_HANDLE = "player";
