export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 120 40" className="h-10 w-24" aria-hidden="true">
        <path
          d="M2 36 Q35 2 60 18 T118 34 Q70 24 2 36Z"
          className={light ? "fill-primary-foreground" : "fill-primary"}
        />
        <path d="M20 38 Q60 22 110 36 Q60 30 20 38Z" className="fill-accent" />
      </svg>
      <div className={`leading-none ${light ? "text-primary-foreground" : "text-primary"}`}>
        <div className="font-display text-2xl font-extrabold italic tracking-tight">DEL VALLE</div>
        <div className="text-[10px] font-semibold italic tracking-[0.4em]">RENT A CAR</div>
      </div>
    </div>
  );
}
