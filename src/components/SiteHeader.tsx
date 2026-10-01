import Link from "next/link";
import { BlackStar } from "./BlackStar";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background/85 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-brand group-hover:text-brand-dark transition-colors">
            <BlackStar className="h-6 w-6" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">
            Nkabom
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <a href="#shield" className="text-muted hover:text-ink transition-colors">
            Scam Shield
          </a>
          <a href="#more" className="text-muted hover:text-ink transition-colors hidden sm:inline">
            What&apos;s next
          </a>
          <a
            href="#shield"
            className="rounded-md bg-brand px-4 py-2 text-white font-medium hover:bg-brand-dark transition-colors"
          >
            Check a message
          </a>
        </nav>
      </div>
    </header>
  );
}
