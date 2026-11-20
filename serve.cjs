const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname);
const port = Number(process.env.PORT || 5500);
const aliases = {
  '/dist/': '/index.html',
  '/dist/index.html': '/index.html',
  '/dist/Login.html': '/index.html',
  '/Login.html': '/index.html',
  '/dist/pdf-ui.js': '/app.js',
  '/dist/pdf-ui.css': '/style.css',
  '/dist/firebase-config.js': '/firebase/config.js',
  '/dist/firebase-service.js': '/firebase/auth.js',
  '/dist/firestore-service.js': '/firebase/store.js',
};
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

http.createServer((request, response) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Invalid URL');
    return;
  }
  urlPath = aliases[urlPath] || urlPath;
  if (urlPath.startsWith('/dist/images/')) urlPath = urlPath.slice(5);
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.resolve(root, '.' + urlPath);
  const publicPath = ['/index.html', '/app.js', '/style.css'].includes(urlPath)
    || urlPath.startsWith('/images/') || urlPath.startsWith('/firebase/');
  if (!publicPath || !filePath.startsWith(root + path.sep)) {
    response.writeHead(404).end('Not found');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(content);
  });
}).listen(port, '127.0.0.1', () => console.log(`FitLab: http://localhost:${port}/`));
