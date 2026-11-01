const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

// Carrega .env se existir
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

const { handler } = require('../netlify/functions/flandao');

const PORT = 8888;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:8888'}`);
  const pathname = parsedUrl.pathname;

  // Roteamento de Functions: /.netlify/functions/flandao
  if (pathname === '/.netlify/functions/flandao' || pathname === '/api/flandao') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const event = {
        httpMethod: req.method,
        headers: req.headers,
        body: body,
        clientContext: { ip: req.socket.remoteAddress }
      };

      try {
        const response = await handler(event, {});
        const headers = response.headers || {};
        res.writeHead(response.statusCode || 200, headers);
        res.end(response.body || '');
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ erro: 'Erro interno' }));
      }
    });
    return;
  }

  // Arquivos estáticos
  let relativePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(ROOT, decodeURIComponent(relativePath));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Acesso negado');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor local Netlify simulado rodando em: http://localhost:${PORT}`);
});
