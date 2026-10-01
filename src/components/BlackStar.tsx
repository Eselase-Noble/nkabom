// Five-pointed black star — Ghana's emblem — used as the Nkabom mark.
export function BlackStar({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 2l2.47 6.9 7.33.2-5.86 4.42 2.1 7.03L12 16.6 5.86 20.55l2.1-7.03L2.1 9.1l7.33-.2L12 2z" />
    </svg>
  );
}
