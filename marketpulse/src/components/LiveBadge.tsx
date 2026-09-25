export function LiveBadge({ on }: { on?: boolean }) {
  if (!on) return null;
  return <span className="text-[10px] font-medium bg-success/15 text-success px-2 py-0.5 rounded-full">EN VIVO</span>;
}
