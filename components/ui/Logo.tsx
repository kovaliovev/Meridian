export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 182 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Meridian"
      className={className}
    >
      <defs>
        <filter id="logo-glow" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Glow halo behind the ring */}
      <circle
        cx="22" cy="22" r="14"
        stroke="#7c3aed"
        strokeWidth="7"
        opacity="0.45"
        filter="url(#logo-glow)"
      />

      {/* Main crisp ring */}
      <circle
        cx="22" cy="22" r="14"
        stroke="#c4b5fd"
        strokeWidth="1.5"
      />

      {/* Zenith node — top of ring, glowing dot */}
      <circle cx="22" cy="8" r="2.5" fill="#c4b5fd" filter="url(#logo-glow)" opacity="0.6" />
      <circle cx="22" cy="8" r="2" fill="#e4e0f5" />

      {/* Wordmark */}
      <text
        x="52"
        y="29"
        fontFamily="'JetBrains Mono', 'Courier New', monospace"
        fontSize="18"
        fontWeight="700"
        letterSpacing="3.5"
        fill="#e4e0f5"
      >
        MERIDIAN
      </text>
    </svg>
  )
}
