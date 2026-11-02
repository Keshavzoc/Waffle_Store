import { useState } from 'react';
import { flavors } from '../config/content.js';

const API = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? ''
  : (import.meta.env.VITE_API_URL || 'https://waffle-stall.onrender.com');
const empty = { name: '', email: '', interested: '', flavors: [], quantity: 1, suggestion: '' };
// Each answer gets its own id, so a double tap or a retry can never be counted twice
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SORRY = 'Sorry, we could not save your answer right now. Please try again in a moment.';

export default function PollForm() {
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState('idle'); // idle | sending | done
  const [error, setError] = useState('');
  const [subId, setSubId] = useState(makeId);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const toggleFlavor = (id) =>
    set('flavors', form.flavors.includes(id) ? form.flavors.filter((x) => x !== id) : [...form.flavors, id]);
  const changeQty = (d) => set('quantity', Math.max(1, Math.min(10, form.quantity + d)));
  const yes = form.interested === 'yes';

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Please enter your name.');
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Please enter a valid email address.');
    if (!form.interested) return setError('Please choose Yes or No.');
    if (yes && form.flavors.length === 0) return setError('Please pick at least one flavour.');

    setStatus('sending');
    const problem = await send({ ...form, id: subId });
    if (problem) { setStatus('idle'); return setError(problem); }
    setStatus('done');
  }

  // Tries up to 3 times (the server may be busy when many people vote at once)
  async function send(payload) {
    for (let i = 0; i < 3; i++) {
      try {
        const res = await fetch(`${API}/api/poll`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) return null;
        if (res.status === 400 || res.status === 409) { const b = await res.json().catch(() => null); return b?.error || SORRY; }
      } catch { /* network problem, try again */ }
      await wait(1200 * (i + 1));
    }
    return SORRY;
  }

  if (status === 'done')
    return (
      <section className="page page-vote" id="poll">
        <div className="wrap">
        <div className="card thanks">
          <h2>Thank you, {form.name.trim().split(' ')[0]}!</h2>
          <p>Your answer is saved. See you at the stall on 4 November.</p>
          <button className="btn ghost" onClick={() => { setForm(empty); setSubId(makeId()); setStatus('idle'); }}>Answer for a friend</button>
        </div>
        </div>
      </section>
    );

  return (
    <section className="page page-vote" id="poll">
      <div className="wrap">
      <h2>Vote now</h2>
      <p className="lead">It takes less than a minute.</p>
      <form className="card" onSubmit={submit} noValidate>
        <label className="field">
          <span>Your name</span>
          <input value={form.name} maxLength="60" onChange={(e) => set('name', e.target.value)} placeholder="Type your name" autoComplete="name" />
        </label>

        <label className="field">
          <span>Your email</span>
          <input type="email" value={form.email} maxLength="120" onChange={(e) => set('email', e.target.value)} placeholder="your.email@example.com" autoComplete="email" />
        </label>

        <fieldset className="field">
          <legend>Will you buy a waffle?</legend>
          <div className="choices">
            {[['yes', 'Yes, count me in'], ['no', 'No, not this time']].map(([v, label]) => (
              <label key={v} className={`choice ${form.interested === v ? 'on' : ''}`}>
                <input type="radio" name="interested" value={v} checked={form.interested === v} onChange={() => set('interested', v)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className={`expand ${yes ? 'open' : ''}`}>
          <div className="expand-inner">
            <fieldset className="field">
              <legend>Which flavour do you want?</legend>
              <div className="choices">
                {flavors.map((f) => (
                  <label key={f.id} className={`choice ${form.flavors.includes(f.id) ? 'on' : ''}`}>
                    <input type="checkbox" tabIndex={yes ? 0 : -1} checked={form.flavors.includes(f.id)} onChange={() => toggleFlavor(f.id)} />
                    {f.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="field">
              <span className="label">How many waffles?</span>
              <div className="stepper">
                <button type="button" tabIndex={yes ? 0 : -1} onClick={() => changeQty(-1)} aria-label="One less">−</button>
                <output aria-live="polite">{form.quantity}</output>
                <button type="button" tabIndex={yes ? 0 : -1} onClick={() => changeQty(1)} aria-label="One more">+</button>
              </div>
            </div>
          </div>
        </div>

        <label className="field">
          <span>Anything you would like us to add? (optional)</span>
          <textarea rows="3" maxLength="300" value={form.suggestion} onChange={(e) => set('suggestion', e.target.value)} placeholder="For example: strawberry topping, or a combo offer" />
        </label>

        <p className={`error ${error ? 'show' : ''}`} role="alert">{error}</p>
        <button className="btn" type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Saving…' : 'Save my answer'}
        </button>
      </form>
      </div>
    </section>
  );
}
