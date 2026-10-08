/**
 * The slash-menu icon: three linked rows. A React component, never a
 * string; `currentColor` throughout so the menu's palette drives it.
 */
export function ReferenceListIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect x="3.5" y="4" width="4" height="4" rx="1" />
      <rect x="3.5" y="10" width="4" height="4" rx="1" />
      <rect x="3.5" y="16" width="4" height="4" rx="1" />
      <path d="M10.5 6h10M10.5 12h10M10.5 18h10" />
    </svg>
  );
}

export default ReferenceListIcon;
