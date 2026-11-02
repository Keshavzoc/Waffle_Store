import { event, flavors } from '../config/content.js';
import Img from './Img.jsx';

export default function About() {
  return (
    <section className="page page-about" id="about">
      <div className="wrap reveal">
        <h2>About our stall</h2>
        <p className="lead">
          Come and try fresh, warm waffles at {event.stall.toLowerCase()}. We have two flavours. Tell us which one you like
          and how many you would eat, and we will have it ready for you. The stall opens at {event.time}.
        </p>
        <div className="flavors">
          {flavors.map((f, i) => (
            <article className="flavor reveal" style={{ '--glow': f.glow, '--glow-soft': f.glowSoft, '--d': `${i * 0.2}s` }} key={f.id}>
              <div className="flavor-photo"><Img src={f.image} alt={`${f.name} waffle`} color={f.color} /></div>
              <div className="flavor-body">
                <h3>{f.name}</h3>
                <p>{f.blurb}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
