import {createReadStream, existsSync, statSync} from 'node:fs';
import {createServer} from 'node:http';
import {extname, join, normalize, resolve} from 'node:path';

const port = Number(process.env.CATALOG_MOCK_PORT || 9090);
const root = resolve('catalog-local');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function send(res, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
    'Content-Type': contentType
  });
  res.end(body);
}

function resolveRequestPath(url) {
  const requestUrl = new URL(url, `http://localhost:${port}`);
  const pathname = requestUrl.pathname === '/' ? '/mock-catalog.html' : requestUrl.pathname;
  const filePath = normalize(join(root, pathname));

  if (!filePath.startsWith(root)) {
    return null;
  }

  return filePath;
}

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    send(res, 204, '');
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method not allowed');
    return;
  }

  const filePath = resolveRequestPath(req.url);
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    send(res, 404, 'Not found');
    return;
  }

  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
    'Content-Length': statSync(filePath).size,
    'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream'
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  console.log(`Catalog mock running at http://localhost:${port}`);
  console.log(`Fixture map URL: http://localhost:${port}/maps/kepler2.gl.json`);
});
