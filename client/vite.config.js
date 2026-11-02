import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, /api calls are passed to the Express server on port 5000.
// host: true lets phones on the same Wi-Fi open the page too.
export default defineConfig({
  plugins: [react()],
  server: { host: true, proxy: { '/api': 'http://127.0.0.1:5000' } },
});
