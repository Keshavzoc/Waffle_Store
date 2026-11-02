import { event, heroImage } from '../config/content.js';
import Img from './Img.jsx';

export default function Hero() {
  return (
    <header className="hero" id="top">
      <span className="decor d1" aria-hidden="true">🎃</span>
      <span className="decor d2" aria-hidden="true">🪔</span>
      <span className="decor d3" aria-hidden="true">✨</span>
      <span className="decor d4" aria-hidden="true">🧇</span>
      <div className="brand">
        <img src="/logo.png" alt="IET Bhaddal logo" width="64" height="64" />
        <span>{event.college}</span>
      </div>
      <div className="hero-text">
        <p className="hero-kicker">{event.festival}</p>
        <h1>Would you eat a fresh waffle on {event.date}?</h1>
        <p className="hero-sub">
          We are opening a waffle stall at the fest. Tell us what you would like, so we can make enough for everyone.
        </p>
        <ul className="chips">
          <li>📅 {event.date}</li>
          <li>🕙 {event.time}</li>
          <li>📍 {event.college}</li>
        </ul>
        <a className="btn" href="#poll">Vote now</a>
      </div>
      <figure className="hero-card">
        <Img className="hero-photo" src={heroImage} alt="Waffle topped with chocolate" color="#a4161a" />
      </figure>
      <a className="scroll-cue" href="#about" aria-label="Go to the next page">Scroll <span>↓</span></a>
    </header>
  );
}
