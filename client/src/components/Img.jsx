import { useState } from 'react';

// Shows the photo; if the link ever breaks, shows a coloured fallback instead of a broken icon.
export default function Img({ src, alt, color = '#4a2c1d', className = '' }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={`img-fallback ${className}`} style={{ background: color }} role="img" aria-label={alt}>🧇</div>;
  return <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}
