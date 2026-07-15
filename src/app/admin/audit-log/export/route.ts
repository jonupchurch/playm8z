import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { searchAuditLogSchema } from "@/lib/validations/audit-log";
import { exportAuditLogCsv } from "@/lib/admin/export-audit-log-csv";

// FR-005: a real GET download link (audit-log-list.tsx's "Export CSV"
// button is a plain <a>, this project's established preference for
// real links over client-side blob juggling) re-validating the exact
// same searchParams boundary as the page itself before re-running the
// identical filter, unpaginated.
export async function GET(request: Request) {
  await requireRole("moderator");

  const url = new URL(request.url);
  const filters = searchAuditLogSchema.parse(Object.fromEntries(url.searchParams));
  const csv = await exportAuditLogCsv(filters);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="audit-log.csv"',
    },
  });
}
