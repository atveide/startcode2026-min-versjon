const paths = {
  bookmark: <path d="M6 3h12v18l-6-4-6 4V3Z" />,
  down: <path d="M12 4v16m-6-6 6 6 6-6" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  menu: <path d="M5 6h14M5 12h14M5 18h14" />,
  feed: (
    <>
      <rect x="5" y="3" width="16" height="17" rx="2" />
      <path d="M5 7H2v12a2 2 0 0 0 2 2h14M9 7h8M9 11h3v4H9zm6 0h2m-2 4h2M9 18h8" />
    </>
  ),
  arrow: <path d="m9 5 7 7-7 7" />,
  back: <path d="m15 5-7 7 7 7" />,
  check: <path d="m5 12 4 4 10-10" />,
  share: <path d="M12 16V3m-5 5 5-5 5 5M5 14v7h14v-7" />,
  send: <path d="m12 3 9 18-9-4-9 4 9-18Zm0 0v14" />,
  external: <path d="M14 3h7v7m0-7L10 14M10 5H4v15h15v-6" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10v1" />
    </>
  ),
  bulb: <path d="M9 18h6m-5 3h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3Z" />,
  book: <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15ZM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />,
  spark: <path d="M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6" />,
  flag: <path d="M5 21V4m0 0h11l-2 4 2 4H5" />,
  refresh: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />,
};

export type IconName = keyof typeof paths;

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
