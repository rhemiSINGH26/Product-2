export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-9 w-9 shrink-0">
        <div className="absolute inset-0 rotate-45 rounded-md gradient-primary glow" />
        <div className="absolute inset-[6px] rotate-45 rounded-sm bg-background" />
        <div className="absolute inset-0 grid place-items-center font-black text-sm">i</div>
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-tight">iTech</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Academy</div>
        </div>
      )}
    </div>
  );
}
