// The two-pawn logo mark (resources/design/Brand Identity - playm8z.dc.html,
// Turn 4 LOCKED). Built from a circle (head) + a clip-path trapezoid
// (body), matching guidelines.md §4.1.
export function PawMark({ size = 36 }: { size?: number }) {
  const height = Math.round(size * 0.92);

  return (
    <div style={{ width: size, height }} className="relative shrink-0" aria-hidden="true">
      <div className="absolute bottom-0 left-0 flex flex-col items-center justify-end">
        <span
          style={{
            width: size * 0.28,
            height: size * 0.28,
            marginBottom: -1,
            background: "linear-gradient(150deg,#ff6b1a,#ff3b6b)",
          }}
          className="rounded-full"
        />
        <span
          style={{
            width: size * 0.56,
            height: size * 0.44,
            background: "linear-gradient(150deg,#ff6b1a,#ff3b6b)",
            clipPath: "polygon(32% 0,68% 0,100% 100%,0 100%)",
          }}
        />
      </div>
      <div className="absolute bottom-0 right-0 flex flex-col items-center justify-end">
        <span
          style={{
            width: size * 0.31,
            height: size * 0.31,
            marginBottom: -1,
            background: "linear-gradient(150deg,#ffb000,#ff6b1a)",
          }}
          className="rounded-full"
        />
        <span
          style={{
            width: size * 0.61,
            height: size * 0.47,
            background: "linear-gradient(150deg,#ffb000,#ff6b1a)",
            clipPath: "polygon(32% 0,68% 0,100% 100%,0 100%)",
          }}
        />
      </div>
    </div>
  );
}
