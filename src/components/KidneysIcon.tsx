import { Bean } from "lucide-react";

export function KidneysIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`kidneys-icon ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Kidneys"
    >
      <Bean aria-hidden="true" />
      <Bean aria-hidden="true" />
    </span>
  );
}
