/** Parses lengths like `64`, `64"`, `5'4"`, `5' 4`, `5ft 4in`, `5.5'`, `160cm` into inches. */
export function parseLength(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/[”″]/g, '"').replace(/[’′]/g, "'");
  if (!s) return null;
  const cm = s.match(/^(\d+(?:\.\d+)?)\s*cm$/);
  if (cm) {
    const inches = round(parseFloat(cm[1]) / 2.54);
    return inches > 0 ? inches : null;
  }
  const ftIn = s.match(
    /^(?:(\d+(?:\.\d+)?)\s*(?:'|ft|feet|foot))?\s*(?:(\d+(?:\.\d+)?)\s*(?:"|in|inches|inch)?)?$/,
  );
  if (!ftIn || (ftIn[1] === undefined && ftIn[2] === undefined)) return null;
  const ft = ftIn[1] ? parseFloat(ftIn[1]) : 0;
  const inch = ftIn[2] ? parseFloat(ftIn[2]) : 0;
  const total = ft * 12 + inch;
  return total > 0 ? round(total) : null;
}

function round(n: number) {
  return Math.round(n * 4) / 4;
}

/** 64 -> 5' 4"   |   10 -> 10"   |   60 -> 5' 0" */
export function formatLength(inches: number): string {
  const r = Math.round(inches * 4) / 4;
  if (Math.abs(r) < 12) return `${trim(r)}"`;
  const sign = r < 0 ? '-' : '';
  const a = Math.abs(r);
  const ft = Math.floor(a / 12);
  const inch = a - ft * 12;
  return `${sign}${ft}' ${trim(inch)}"`;
}

/** 44 x 20 -> 44" × 20" (3' 8" × 1' 8") */
export function formatDims(w: number, d: number): string {
  return `${trim(w)}" × ${trim(d)}"`;
}

function trim(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}
