// Local-calendar-day helpers, deliberately DB-free so both client-safe modules
// (e.g. notifications/filter-notifications.ts) and DB-touching ones
// (admin/activity-data.ts) share ONE definition of "today"/"same day" instead of
// each reimplementing it. Uses the local calendar day, not a SQL date_trunc, matching
// this project's existing convention.

export function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
