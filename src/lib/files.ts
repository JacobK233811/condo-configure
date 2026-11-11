/** Reads an image file and downsizes it to a JPEG data URL small enough for localStorage. */
export async function imageFileToDataUrl(file: File, max = 480): Promise<string> {
  const src = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
  const img = await loadImage(src);
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k);
  c.height = Math.round(img.naturalHeight * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.8);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function toDataUrl(href: string) {
  if (href.startsWith('data:')) return href;
  const blob = await (await fetch(href)).blob();
  return new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.readAsDataURL(blob);
  });
}

export function download(name: string, blob: Blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Renders the plan SVG to a PNG at `pxPerInch` and downloads it. */
export async function exportSvgPng(svg: SVGSVGElement, name: string, pxPerInch = 4) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('[data-export-ignore]').forEach((n) => n.remove());
  const vb = (svg.dataset.exportViewbox ?? '').split(' ').map(Number);
  clone.setAttribute('viewBox', vb.join(' '));
  clone.setAttribute('width', String(Math.round(vb[2] * pxPerInch)));
  clone.setAttribute('height', String(Math.round(vb[3] * pxPerInch)));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  await Promise.all(
    Array.from(clone.querySelectorAll('image')).map(async (im) => {
      const href = im.getAttribute('href');
      if (href) im.setAttribute('href', await toDataUrl(href));
    }),
  );
  const xml = new XMLSerializer().serializeToString(clone);
  const img = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml));
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0);
  const blob = await new Promise<Blob>((resolve) => c.toBlob((b) => resolve(b!), 'image/png'));
  download(name, blob);
}

/** Resolves bundled asset paths (e.g. `furniture/bed.jpg`) against the app's base URL. */
export function assetUrl(src: string) {
  if (/^(data:|blob:|https?:|\/)/.test(src)) return src;
  return import.meta.env.BASE_URL + src;
}
