export function KidneysIcon({
  size = 22,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Kidneys with warning sign"
    >
      <path d="M17.8 10.5c-6.1-2.4-11.7 2.4-11.7 10.8 0 7 4.2 12.1 9.3 12.1 4.2 0 7.2-3.5 7.2-8.1 0-4.2-2.2-6.2-5.1-5.6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30.2 10.5c6.1-2.4 11.7 2.4 11.7 10.8 0 7-4.2 12.1-9.3 12.1-4.2 0-7.2-3.5-7.2-8.1 0-4.2 2.2-6.2 5.1-5.6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.6 19.8c4.2 1.5 6.4 5 6.4 10.2v8M30.4 19.8c-4.2 1.5-6.4 5-6.4 10.2" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M18.2 5.8 24 2.7l5.8 3.1v6.3c0 4.1-2.5 7.2-5.8 8.6-3.3-1.4-5.8-4.5-5.8-8.6V5.8Z" fill="var(--icon-warning-fill, white)" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M24 7.2v5.1M24 16h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
