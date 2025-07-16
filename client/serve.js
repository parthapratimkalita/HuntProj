// serve.js - Place this file in your project root (same level as package.json)
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import history from 'connect-history-api-fallback';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Middleware for SPA routing - this handles the 404 issue
app.use(history({
  // Exclude API routes from the fallback
  rewrites: [
    { from: /^\/api\/.*$/, to: function(context) {
      return context.parsedUrl.pathname;
    }}
  ],
  // Optional: Add logging to see what's being redirected
  verbose: true
}));

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
  console.log(`📁 Serving files from: ${path.join(__dirname, 'dist')}`);
  console.log(`🔄 SPA routing enabled - all routes will fallback to index.html`);
});

// Error handling
app.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`❌ Port ${port} is already in use. Try a different port:`);
    console.log(`   PORT=3001 npm run serve`);
  } else {
    console.error('❌ Server error:', err);
  }
});