import type { ReactNode } from "react";

export type IconName =
  | "plus"
  | "trash"
  | "move"
  | "rotate"
  | "modifier"
  | "ruler"
  | "layers"
  | "carry"
  | "package"
  | "download"
  | "upload"
  | "lock"
  | "globe"
  | "menu"
  | "close"
  | "panels";

const PATHS: Record<IconName, ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M4 7h16M10 4h4M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  move: <path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />,
  rotate: <path d="M20 12a8 8 0 1 1-2.34-5.66M20 3.5v4h-4" />,
  modifier: <path d="M12 2l10 10-10 10L2 12z" />,
  ruler: <path d="M4 14l6 6L20 10l-6-6zM8 12l1.6 1.6M11 9l1.6 1.6M14 6l1.6 1.6" />,
  layers: <path d="M12 3l9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5" />,
  carry: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  package: <path d="M12 2l9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10" />,
  download: <path d="M12 3v12M7 10l5 5 5-5M4 20h16" />,
  upload: <path d="M12 21V9M7 14l5-5 5 5M4 4h16" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  panels: (
    <>
      <rect x="4" y="4" width="7" height="16" rx="1" />
      <rect x="14" y="4" width="6" height="9" rx="1" />
    </>
  ),
};

export function Icon({ name, size = 15 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
