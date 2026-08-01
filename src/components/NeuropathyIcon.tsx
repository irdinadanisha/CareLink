export function NeuropathyIcon({
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
      aria-label="Hand with nerve pain"
    >
      <path d="M15.2 26.2 10.7 18c-.9-1.7-.6-3.5.8-4.2 1.3-.7 2.8-.1 3.8 1.4l3.2 5.1-3.7-11c-.6-1.9.2-3.6 1.8-4 1.5-.4 2.9.6 3.5 2.4l3.3 9.5-.9-12.1c-.1-2 .9-3.4 2.6-3.5 1.6-.1 2.8 1.2 3 3.1l1 11.4 1.2-9.3c.2-1.9 1.5-3 3.1-2.8 1.6.2 2.5 1.6 2.3 3.5l-1.1 12.1 3.4-4.9c1.1-1.5 2.8-1.8 4-.9 1.2.9 1.4 2.7.4 4.2l-5.7 8.5c-2.3 3.5-3.6 7.6-3.6 11.8v5.2H20.5v-5.1c0-4.4-1.9-8.3-5.3-12.2Z" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m24.6 19.5-2.5 7h4.1l-2.5 7.1 7.4-10h-4.3l2-4.1h-4.2Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      <path d="m40.5 9.6 3.2-2M42.1 14.1l3.8-.4M40.4 31.1l3.3 2M42 26.6l3.8.4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
