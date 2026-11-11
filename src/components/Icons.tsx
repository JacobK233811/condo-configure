import type { ReactNode, SVGProps } from 'react';

function Icon({ children, size = 18, ...rest }: { children: ReactNode; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...rest}>
      {children}
    </svg>
  );
}

type P = { size?: number };
export const IconPlus = (p: P) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const IconUndo = (p: P) => <Icon {...p}><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></Icon>;
export const IconRedo = (p: P) => <Icon {...p}><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></Icon>;
export const IconRotateCw = (p: P) => <Icon {...p}><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></Icon>;
export const IconRotateCcw = (p: P) => <Icon {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></Icon>;
export const IconCopy = (p: P) => <Icon {...p}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></Icon>;
export const IconTrash = (p: P) => <Icon {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></Icon>;
export const IconPointer = (p: P) => <Icon {...p}><path d="m4 4 7 17 2.5-7.5L21 11z" /></Icon>;
export const IconRuler = (p: P) => <Icon {...p}><path d="M3 17 17 3l4 4L7 21z" /><path d="m7 13 2 2M10 10l2 2M13 7l2 2" /></Icon>;
export const IconZoomIn = (p: P) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M11 8v6M8 11h6" /></Icon>;
export const IconZoomOut = (p: P) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M8 11h6" /></Icon>;
export const IconFit = (p: P) => <Icon {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></Icon>;
export const IconDownload = (p: P) => <Icon {...p}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></Icon>;
export const IconImage = (p: P) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m21 16-5-5-9 8" /></Icon>;
export const IconCheck = (p: P) => <Icon {...p}><path d="m5 12 5 5 9-10" /></Icon>;
export const IconX = (p: P) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>;
export const IconEdit = (p: P) => <Icon {...p}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m14 6 4 4" /></Icon>;
export const IconLayers = (p: P) => <Icon {...p}><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></Icon>;
export const IconChevronDown = (p: P) => <Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>;
export const IconSearch = (p: P) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>;
export const IconReturn = (p: P) => <Icon {...p}><path d="M9 10 4 15l5 5" /><path d="M20 4v7a4 4 0 0 1-4 4H4" /></Icon>;
export const IconMenu = (p: P) => <Icon {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>;
