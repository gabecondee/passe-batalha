import { useState } from 'react';
import { User } from 'lucide-react';

export function RankingAvatar({ src, name }: { src?: string | null; name: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return src && src !== failedSrc ? (
    <img key={src} src={src} alt={name} loading="lazy" decoding="async"
      className="h-full w-full object-cover" onError={() => setFailedSrc(src)} />
  ) : (
    <div role="img" aria-label={`Foto indisponível de ${name}`} className="flex h-full w-full items-center justify-center bg-secondary/60">
      <User className="h-5 w-5 text-muted-foreground" />
    </div>
  );
}
