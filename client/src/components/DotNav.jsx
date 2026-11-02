import { useEffect, useState } from 'react';

const pages = [['top', 'Home'], ['about', 'About'], ['poll', 'Vote']];

// Small dots on the right side: shows which page you are on and jumps to another page
export default function DotNav() {
  const [active, setActive] = useState('top');
  useEffect(() => {
    const io = new IntersectionObserver(
      (list) => list.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -45% 0px' }
    );
    pages.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  return (
    <nav className="dots" aria-label="Pages">
      {pages.map(([id, label]) => (
        <a key={id} href={`#${id}`} className={active === id ? 'on' : ''} aria-label={label} title={label} />
      ))}
    </nav>
  );
}
