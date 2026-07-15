import type { ReportReason } from "@/lib/validations/notifications";
import type { AutoFlagReason } from "./auto-flag-rules";

export type Severity = "high" | "med" | "low";

// Shared across every moderation-queue feature (Admin Postings/017,
// Admin Forum/018) -- extracted from 017's own inline copy the moment
// a second real consumer (this feature) needed the identical mapping
// (research.md #2). The canonical `reports.reason` taxonomy (012):
// underage/harassment -> high, impersonation/inappropriate/spam -> med,
// other -> low (a catch-all with no inherent severity signal). Neither
// moderation wireframe's flavor-text reason labels ("Scam / phishing,"
// "Off-topic") correspond to a real taxonomy value -- this feature
// never stores or displays those exact strings.
const REPORT_REASON_SEVERITY: Record<ReportReason, Severity> = {
  harassment: "high",
  underage: "high",
  spam: "med",
  inappropriate: "med",
  impersonation: "med",
  other: "low",
};

// Canonical display labels for reason chips -- never the raw free-text
// a reporter entered, and never a wireframe's non-canonical flavor text.
export const REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam",
  harassment: "Harassment",
  inappropriate: "Inappropriate",
  underage: "Underage & safety",
  impersonation: "Impersonation",
  other: "Other",
};

export function reasonLabel(reason: string): string {
  return REASON_LABELS[reason as ReportReason] ?? "Other";
}

const AUTO_FLAG_SEVERITY: Record<AutoFlagReason, Severity> = {
  phishing_or_scam: "high",
  boosting_service: "high",
  new_account_first_post: "low",
};

const SEVERITY_RANK: Record<Severity, number> = { low: 0, med: 1, high: 2 };

export function reportReasonSeverity(reason: string): Severity {
  return REPORT_REASON_SEVERITY[reason as ReportReason] ?? "low";
}

// The worse of every open report's reason-implied severity and the
// auto-flag reason's own fixed severity -- never a separately stored
// value.
export function computeSeverity(reportReasons: string[], autoFlagReason: string | null): Severity {
  const severities: Severity[] = reportReasons.map(reportReasonSeverity);
  if (autoFlagReason) {
    severities.push(AUTO_FLAG_SEVERITY[autoFlagReason as AutoFlagReason] ?? "low");
  }
  return severities.reduce<Severity>((worst, current) => (SEVERITY_RANK[current] > SEVERITY_RANK[worst] ? current : worst), "low");
}

// Shared display helpers -- every moderation queue's own cards/drawer
// need the exact same severity styling.
export function severityBadgeClass(severity: Severity): string {
  if (severity === "high") return "text-pop-text bg-[rgba(255,59,107,0.13)] border-[rgba(255,59,107,0.45)]";
  if (severity === "med") return "text-[#e6c74e] bg-[rgba(230,199,78,0.12)] border-[rgba(230,199,78,0.4)]";
  return "text-[#8fbfe0] bg-[rgba(53,208,224,0.1)] border-[rgba(53,208,224,0.35)]";
}

export function severityLabel(severity: Severity): string {
  if (severity === "high") return "High priority";
  if (severity === "med") return "Medium";
  return "Low / routine";
}
