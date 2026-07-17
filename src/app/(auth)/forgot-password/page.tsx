import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
};

// 033/FR-001. The login form has linked here since 001 shipped
// (auth-form.tsx's "Forgot password?"), and until now this route did not
// exist -- a live 404 in production, deliberately, because 001/FR-015
// required the entry point while scoping the flow behind it to a separate
// feature. This is that feature; this file is what closes it.
export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
