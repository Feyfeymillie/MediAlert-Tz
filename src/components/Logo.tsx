import { useId } from "react";

/** MediAlert mark: a heart with a pulse line and an amber alert dot. */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="MediAlert logo">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#19b3a6" />
          <stop offset="1" stopColor="#0a5f6b" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${id})`} />
      <path
        d="M32 51C16 40 10 30 10 23c0-6 4.600-10 10-10 4.800 0 9 2.800 12 7.500C35 15.800 39.200 13 44 13c5.400 0 10 4 10 10 0 7-6 17-22 28z"
        fill="#fff"
      />
      <path
        d="M13 31h10l4-9 7 17 4-8h13"
        fill="none"
        stroke="#0e8a88"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="51" cy="13" r="7" fill="#f6b95c" stroke="#0a5f6b" strokeWidth="2.5" />
    </svg>
  );
}

/** Logo mark + wordmark, used in the site header. */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark className="size-8 drop-shadow-sm" />
      <span className="text-lg font-bold tracking-tight">
        Medi<span className="text-primary">Alert</span>
      </span>
    </span>
  );
}
