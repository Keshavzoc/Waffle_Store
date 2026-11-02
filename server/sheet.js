// Sends a batch of answers to the Google Apps Script link and explains problems in plain words.
export async function postRows(url, rows) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ rows }),
      signal: AbortSignal.timeout(30000),
    });
    const text = (await r.text()).trim();
    if (r.ok && text === 'ok') return { ok: true };
    if (/accounts\.google\.com|Sign in/i.test(text))
      return { ok: false, reason: 'Google asked for a sign-in. In Apps Script choose Deploy > Manage deployments > Edit, set "Who has access" to "Anyone", and deploy a new version.' };
    if (r.status === 404 || /not found/i.test(text))
      return { ok: false, reason: 'The link was not found. SHEETS_WEBHOOK_URL must be the full Web app link that ends with /exec.' };
    return { ok: false, reason: `Google replied: ${text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 200)}` };
  } catch (err) {
    return { ok: false, reason: `Could not reach Google (${err.message}).` };
  }
}
