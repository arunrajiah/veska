/**
 * The Veska mark: a double chevron.
 *
 * Kept in one place so the auth screens, the shell and anything else that shows
 * branding cannot drift apart. It renders the glyph only — put it inside whatever
 * container (usually a rounded indigo square) the surface calls for.
 */
export function VeskaMark({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} role="img" aria-label="Veska">
      <path
        d="M30 30l18 18 18-18"
        fill="none"
        stroke="#fff"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M30 52l18 18 18-18"
        fill="none"
        stroke="#A5B4FC"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
