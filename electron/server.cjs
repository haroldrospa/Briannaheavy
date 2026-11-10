const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

async function handleDgiiLookup(req, res) {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const rnc = (reqUrl.searchParams.get('rnc') || '').replace(/\D/g, '');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!rnc || (rnc.length !== 9 && rnc.length !== 11)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'RNC o Cédula inválida' }));
    return;
  }

  try {
    // 1. Cédula (11 dígitos): API OGTIC / Digital.gob.do
    if (rnc.length === 11) {
      try {
        const cedRes = await fetch(`https://api.digital.gob.do/v3/cedulas/${rnc}`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0 Safari/537.36'
          }
        });
        if (cedRes.ok) {
          const cedData = await cedRes.json();
          if (cedData && cedData.success && cedData.data) {
            const d = cedData.data;
            const fullName = [d.names, d.firstSurname, d.secondSurname]
              .filter(Boolean)
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim()
              .toUpperCase();
            if (fullName) {
              const formattedDoc = `${rnc.slice(0, 3)}-${rnc.slice(3, 10)}-${rnc.slice(10)}`;
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                rnc: formattedDoc,
                name: fullName,
                status: 'ACTIVO',
                type: 'Físico',
                activity: 'Persona Física'
              }));
              return;
            }
          }
        }
      } catch (e) {
        console.warn('[DGII Electron] Error api.digital.gob.do:', e.message);
      }
    }

    // 2. Consulta web DGII oficial
    const dgiiUrl = 'https://dgii.gov.do/app/WebApps/ConsultasWeb2/ConsultasWeb/consultas/rnc.aspx';
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0 Safari/537.36';

    const getRes = await fetch(dgiiUrl, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      }
    });
    const html = await getRes.text();

    const rawCookies = typeof getRes.headers.getSetCookie === 'function'
      ? getRes.headers.getSetCookie()
      : [getRes.headers.get('set-cookie') || ''];
    const cookieHeader = rawCookies.map((c) => (c || '').split(';')[0]).filter(Boolean).join('; ');

    const vsMatch = html.match(/name="__VIEWSTATE" id="__VIEWSTATE" value="([^"]+)"/);
    const vsgMatch = html.match(/name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="([^"]+)"/);
    const evMatch = html.match(/name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="([^"]+)"/);

    if (!vsMatch) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Portal DGII no disponible temporalmente' }));
      return;
    }

    const formattedInput = rnc.length === 11
      ? `${rnc.slice(0, 3)}-${rnc.slice(3, 10)}-${rnc.slice(10)}`
      : rnc;

    const params = new URLSearchParams();
    params.append('ctl00$smMain', 'ctl00$cphMain$upBusqueda|ctl00$cphMain$btnBuscarPorRNC');
    params.append('__EVENTTARGET', '');
    params.append('__EVENTARGUMENT', '');
    params.append('__VIEWSTATE', vsMatch[1]);
    if (vsgMatch) params.append('__VIEWSTATEGENERATOR', vsgMatch[1]);
    if (evMatch) params.append('__EVENTVALIDATION', evMatch[1]);
    params.append('ctl00$cphMain$txtRNCCedula', formattedInput);
    params.append('ctl00$cphMain$txtRazonSocial', '');
    params.append('ctl00$cphMain$hidActiveTab', rnc.length === 11 ? 'rnc' : '');
    params.append('__ASYNCPOST', 'true');
    params.append('ctl00$cphMain$btnBuscarPorRNC', 'BUSCAR');

    const postRes = await fetch(dgiiUrl, {
      method: 'POST',
      headers: {
        'User-Agent': userAgent,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-MicrosoftAjax': 'Delta=true',
        'Origin': 'https://dgii.gov.do',
        'Referer': dgiiUrl,
        'Cookie': cookieHeader
      },
      body: params.toString()
    });

    const responseText = await postRes.text();

    const findField = (id) => {
      const regex = new RegExp(`id="${id}"[^>]*>([^<]*)<`, 'i');
      const m = responseText.match(regex);
      return m ? m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim() : '';
    };

    const name = findField('cphMain_dvRNCContribuyentes_lblNombreComercial') ||
                 findField('cphMain_dvRNCContribuyentes_lblRazonSocial');
    const commercialName = findField('cphMain_dvRNCContribuyentes_lblNombreComercial');
    const status = findField('cphMain_dvRNCContribuyentes_lblEstado');
    const activity = findField('cphMain_dvRNCContribuyentes_lblActividadEconomica');

    if (name) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: true,
        rnc: formattedInput,
        name: name.toUpperCase(),
        commercialName: commercialName ? commercialName.toUpperCase() : undefined,
        status: (status || 'ACTIVO').toUpperCase(),
        type: rnc.length === 11 ? 'Físico' : 'Jurídico',
        activity: activity || undefined
      }));
      return;
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'RNC o Cédula no encontrada en DGII' }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: err.message || 'Error en consulta DGII' }));
  }
}

function startLocalServer(distDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        let pathname = decodeURIComponent(parsedUrl.pathname);

        // API DGII
        if (pathname === '/api/dgii-lookup') {
          await handleDgiiLookup(req, res);
          return;
        }

        // Static files inside distDir
        if (pathname === '/' || pathname === '') {
          pathname = '/index.html';
        }

        let filePath = path.join(distDir, pathname);

        // Security check: ensure path is within distDir
        if (!filePath.startsWith(distDir)) {
          res.statusCode = 403;
          res.end('Acceso denegado');
          return;
        }

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';
          res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
          });
          fs.createReadStream(filePath).pipe(res);
          return;
        }

        // SPA Fallback: Serve index.html for all other routes
        const indexPath = path.join(distDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache'
          });
          fs.createReadStream(indexPath).pipe(res);
          return;
        }

        res.statusCode = 404;
        res.end('Recurso no encontrado');
      } catch (err) {
        res.statusCode = 500;
        res.end('Error interno del servidor local');
      }
    });

    server.on('error', reject);

    // Listen on random available port on 127.0.0.1
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = address.port;
      resolve({ server, port, url: `http://127.0.0.1:${port}` });
    });
  });
}

module.exports = { startLocalServer };
