import Link from "next/link";
import { PawMark } from "@/components/brand/paw-mark";
import { Wordmark } from "@/components/brand/wordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-[radial-gradient(circle_at_50%_-10%,rgba(255,107,26,0.14),transparent_55%)] px-5 pb-16 pt-10">
      <header className="mb-7">
        <Link href="/" className="flex items-center gap-3">
          <PawMark size={36} />
          <Wordmark />
        </Link>
      </header>
      <main className="flex w-full flex-1 flex-col items-center">{children}</main>
    </div>
  );
}
