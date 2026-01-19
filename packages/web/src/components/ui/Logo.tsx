interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className = '' }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="50%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
        <linearGradient id="chartGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#C4B5FD" />
        </linearGradient>
      </defs>

      {/* Background circle */}
      <circle cx="16" cy="16" r="15" fill="url(#arcGradient)" />

      {/* Arc shape */}
      <path
        d="M8 20 Q16 6 24 20"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Analytics bars */}
      <rect x="10" y="18" width="3" height="6" rx="1" fill="url(#chartGradient)" />
      <rect x="14.5" y="15" width="3" height="9" rx="1" fill="url(#chartGradient)" />
      <rect x="19" y="12" width="3" height="12" rx="1" fill="url(#chartGradient)" />
    </svg>
  );
}
