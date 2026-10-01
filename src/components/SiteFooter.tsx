import { BlackStar } from "./BlackStar";

export function SiteFooter() {
  return (
    <footer className="border-t border-border mt-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-muted">
        <div className="flex items-center gap-2">
          <span className="text-brand">
            <BlackStar className="h-5 w-5" />
          </span>
          <span className="font-display text-base font-bold text-ink">Nkabom</span>
          <span className="hidden sm:inline">Together against fraud.</span>
        </div>
        <p className="max-w-sm">
          Nkabom gives guidance, not a guarantee. Always verify before you pay or
          share your Mobile Money PIN.
        </p>
      </div>
    </footer>
  );
}
