// Run:  npm run check   -> sends one test row to your Google Sheet and tells you what happened
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { postRows } from './sheet.js';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });
const url = process.env.SHEETS_WEBHOOK_URL;
if (!url) { console.log('X  SHEETS_WEBHOOK_URL is empty. Open server/.env and paste your Web app link (it ends with /exec).'); process.exit(1); }
if (!url.endsWith('/exec')) console.log('!  Your link does not end with /exec. It should be the "Web app" link, not the editor link.');
const r = await postRows(url, [{ id: 'test-' + Date.now(), time: new Date().toISOString(), name: 'TEST - delete this row', interested: 'yes', flavors: ['red-velvet'], quantity: 1, suggestion: 'connection test' }]);
console.log(r.ok ? 'OK  A test row was added to your Google Sheet. Open the sheet to see it (you can delete that row).' : `X  ${r.reason}`);
process.exit(r.ok ? 0 : 1);
