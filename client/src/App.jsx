import { useEffect } from 'react';
import Hero from './components/Hero.jsx';
import About from './components/About.jsx';
import PollForm from './components/PollForm.jsx';
import Footer from './components/Footer.jsx';
import DotNav from './components/DotNav.jsx';

export default function App() {
  // Scroll reveal: elements with .reveal fade in when they enter the screen
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { threshold: 0.15 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <DotNav />
      <Hero />
      <main>
        <About />
        <PollForm />
      </main>
      <Footer />
    </>
  );
}
