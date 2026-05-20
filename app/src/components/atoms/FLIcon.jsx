const PATHS = {
  lock: (c) => <><rect x="4" y="9" width="12" height="9" stroke={c} strokeWidth="1.4" fill="none" /><path d="M6.5 9V6a3.5 3.5 0 1 1 7 0v3" stroke={c} strokeWidth="1.4" fill="none" /></>,
  clock: (c) => <><circle cx="10" cy="10" r="7" stroke={c} strokeWidth="1.4" fill="none" /><path d="M10 5.5V10l3 2" stroke={c} strokeWidth="1.4" fill="none" strokeLinecap="round" /></>,
  seal: (c) => <><circle cx="10" cy="10" r="6" stroke={c} strokeWidth="1.4" fill="none" /><path d="M10 7v6m-3-3h6" stroke={c} strokeWidth="1.4" /></>,
  mail: (c) => <><rect x="3" y="5" width="14" height="10" stroke={c} strokeWidth="1.4" fill="none" /><path d="M3 6l7 5 7-5" stroke={c} strokeWidth="1.4" fill="none" /></>,
  arrow: (c) => <path d="M5 10h10m-4-4l4 4-4 4" stroke={c} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  check: (c) => <path d="M4 10.5l3.5 3.5L16 6" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  x: (c) => <path d="M5 5l10 10M15 5L5 15" stroke={c} strokeWidth="1.4" strokeLinecap="round" />,
  plus: (c) => <path d="M10 4v12M4 10h12" stroke={c} strokeWidth="1.4" strokeLinecap="round" />,
  eye: (c) => <><path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z" stroke={c} strokeWidth="1.4" fill="none" /><circle cx="10" cy="10" r="2" stroke={c} strokeWidth="1.4" fill="none" /></>,
  person: (c) => <><circle cx="10" cy="7" r="3" stroke={c} strokeWidth="1.4" fill="none" /><path d="M3 17c1-3 4-5 7-5s6 2 7 5" stroke={c} strokeWidth="1.4" fill="none" /></>,
  warning: (c) => <path d="M10 3l8 14H2L10 3zM10 8v4m0 2v.5" stroke={c} strokeWidth="1.4" fill="none" strokeLinejoin="round" />,
  shield: (c) => <path d="M10 3l6 2v5c0 4-3 6-6 7-3-1-6-3-6-7V5l6-2z" stroke={c} strokeWidth="1.4" fill="none" strokeLinejoin="round" />,
  calendar: (c) => <><rect x="3" y="5" width="14" height="12" stroke={c} strokeWidth="1.4" fill="none" /><path d="M3 9h14M7 3v4M13 3v4" stroke={c} strokeWidth="1.4" /></>,
  refresh: (c) => <path d="M16 7a7 7 0 1 0 1 5M16 4v3h-3" stroke={c} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  dot: (c) => <circle cx="10" cy="10" r="3" fill={c} />,
}

export default function FLIcon({ name, size = 16, color = 'currentColor' }) {
  const render = PATHS[name]
  if (!render) return null
  return (
    <svg
      viewBox="0 0 20 20"
      style={{ width: size, height: size, color, flexShrink: 0 }}
    >
      {render(color)}
    </svg>
  )
}
