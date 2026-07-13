export function Wordmark({ className = "text-2xl" }: { className?: string }) {
  return (
    <span className={`font-sans font-bold tracking-tight text-text ${className}`}>
      playm
      <span className="bg-[linear-gradient(120deg,var(--color-accent),var(--color-pop))] bg-clip-text text-transparent">
        8
      </span>
      z
    </span>
  );
}
