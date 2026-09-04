export function Logo() {
  return (
    <div className="flex items-center gap-3 px-5 py-5">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl gradient-accent shadow-glow-primary">
        <img
          src="/logo.png"
          alt="SarvaVaidya"
          className="h-6 w-6 object-contain brightness-0 invert"
        />
        <div className="absolute inset-0 rounded-xl bg-white/10" />
      </div>
      <div className="flex flex-col">
        <span className="font-display text-[16px] font-bold tracking-tight text-foreground">
          SarvaVaidya
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary/70">
          Smart EMR
        </span>
      </div>
    </div>
  );
}
