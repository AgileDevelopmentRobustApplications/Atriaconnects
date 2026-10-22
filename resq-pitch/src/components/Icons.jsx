const p = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

export const GridIcon = () => (<svg {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg>)
export const NotesIcon = () => (<svg {...p}><path d="M5 4.5h14v15H5z" /><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" /></svg>)
export const MotionIcon = () => (<svg {...p}><path d="M3 12h4l2.5-6 4 12 2.5-6H21" /></svg>)
export const ExpandIcon = () => (<svg {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>)
export const CollapseIcon = () => (<svg {...p}><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></svg>)
export const CloseIcon = () => (<svg {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>)
