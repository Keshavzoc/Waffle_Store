import { event } from '../config/content.js';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src="/logo.png" alt="IET Bhaddal logo" width="56" height="56" />
          <div>
          <h3>{event.college}</h3>
          <p>{event.festival}</p>
          </div>
        </div>
        <div>
          <p><strong>Date:</strong> {event.date}</p>
          <p><strong>Time:</strong> {event.time}</p>
        </div>
      </div>
    </footer>
  );
}
