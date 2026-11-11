import { assetUrl } from '../lib/files';
import { itemDepth, localPath } from '../lib/geometry';
import type { Item } from '../lib/types';

/** Photo if there is one, otherwise the piece's to-scale outline in its colour. */
export function Thumb({ item, size = 64 }: { item: Item; size?: number }) {
  if (item.image) {
    return <img className="thumb" src={assetUrl(item.image)} alt="" style={{ width: size, height: size }} draggable={false} />;
  }
  const d = itemDepth(item);
  const m = Math.max(item.width, d) * 1.15;
  return (
    <svg className="thumb" width={size} height={size} viewBox={`${-m / 2} ${-m / 2} ${m} ${m}`}>
      <path d={localPath(item)} fill={item.color} stroke="rgba(0,0,0,.35)" strokeWidth={m / 60} />
    </svg>
  );
}
