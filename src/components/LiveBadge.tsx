export function LiveBadge({ on, live }: { on?: boolean; live?: boolean }) {
  if (!(on || live)) return null;
  return <span className="text-[10px] font-medium bg-success/15 text-success px-2 py-0.5 rounded-full">EN VIVO</span>;
}
