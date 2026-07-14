import type { ReportReason } from "@/lib/validations/notifications";
import type { AutoFlagReason } from "@/lib/postings/auto-flag";

export type Severity = "high" | "med" | "low";

// research.md #1: the exact reason-keyword mapping already established
// for report-reason chips (the source wireframe's own reasonSev()) --
// scam/harassment/underage/safety -> high, spam/inappropriate -> med,
// else low. Our real reportReasonEnum has no distinct "scam" value;
// impersonation (the closest trust/safety concern to "scam") is
// treated as med, matching the wireframe's own catchall for anything
// not explicitly named high.
const REPORT_REASON_SEVERITY: Record<ReportReason, Severity> = {
  harassment: "high",
  underage: "high",
  spam: "med",
  inappropriate: "med",
  impersonation: "med",
  other: "low",
};

const AUTO_FLAG_SEVERITY: Record<AutoFlagReason, Severity> = {
  phishing_or_scam: "high",
  boosting_service: "high",
  new_account_first_post: "low",
};

const SEVERITY_RANK: Record<Severity, number> = { low: 0, med: 1, high: 2 };

export function reportReasonSeverity(reason: string): Severity {
  return REPORT_REASON_SEVERITY[reason as ReportReason] ?? "low";
}

// FR-005/SC-002: the worse of every open report's reason-implied
// severity and the auto-flag reason's own fixed severity -- never a
// separately stored value.
export function computeSeverity(reportReasons: string[], autoFlagReason: string | null): Severity {
  const severities: Severity[] = reportReasons.map(reportReasonSeverity);
  if (autoFlagReason) {
    severities.push(AUTO_FLAG_SEVERITY[autoFlagReason as AutoFlagReason] ?? "low");
  }
  return severities.reduce<Severity>((worst, current) => (SEVERITY_RANK[current] > SEVERITY_RANK[worst] ? current : worst), "low");
}

// Shared display helpers -- both posting-queue.tsx's cards and
// posting-review-drawer.tsx's own badge need the exact same severity
// styling, so they're defined once here rather than risking drift
// between two per-component copies (unlike e.g. avatarGradient, which
// this codebase does duplicate per component, this is the same
// feature's own two views of the identical value).
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
