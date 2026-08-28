import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

function dgiiLookupPlugin(): Plugin {
  return {
    name: 'dgii-lookup-plugin',
    configureServer(server) {
      server.middlewares.use('/api/dgii-lookup', async (req, res) => {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const rnc = (url.searchParams.get('rnc') || '').replace(/\D/g, '');

        if (!rnc || (rnc.length !== 9 && rnc.length !== 11)) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: 'RNC o Cédula inválida' }));
          return;
        }

        try {
          const dgiiUrl = 'https://dgii.gov.do/app/WebApps/ConsultasWeb2/ConsultasWeb/consultas/rnc.aspx';
          const getRes = await fetch(dgiiUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
            }
          });
          const html = await getRes.text();
          const cookies = getRes.headers.get('set-cookie');

          const vsMatch = html.match(/name="__VIEWSTATE" id="__VIEWSTATE" value="([^"]+)"/);
          const vsgMatch = html.match(/name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="([^"]+)"/);
          const evMatch = html.match(/name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="([^"]+)"/);

          if (!vsMatch) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Portal DGII no disponible' }));
            return;
          }

          const params = new URLSearchParams();
          params.append('__EVENTTARGET', '');
          params.append('__EVENTARGUMENT', '');
          params.append('__VIEWSTATE', vsMatch[1]);
          if (vsgMatch) params.append('__VIEWSTATEGENERATOR', vsgMatch[1]);
          if (evMatch) params.append('__EVENTVALIDATION', evMatch[1]);
          params.append('ctl00$cphMain$txtRNCCedula', rnc);
          params.append('ctl00$cphMain$btnBuscarPorRNC', 'Buscar');

          const postRes = await fetch(dgiiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Cookie': cookies || '',
              'Referer': dgiiUrl
            },
            body: params.toString()
          });

          const postHtml = await postRes.text();

          const decodeEntities = (str: string) => {
            if (!str) return '';
            return str
              .replace(/&#233;/g, 'é').replace(/&#243;/g, 'ó').replace(/&#225;/g, 'á')
              .replace(/&#237;/g, 'í').replace(/&#250;/g, 'ú').replace(/&#209;/g, 'Ñ')
              .replace(/&#241;/g, 'ñ').replace(/&nbsp;/g, ' ').replace(/&#211;/g, 'Ó')
              .replace(/&#193;/g, 'Á').replace(/&#201;/g, 'É').replace(/&#205;/g, 'Í')
              .replace(/&#218;/g, 'Ú').trim();
          };

          const rows = postHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
          const data: Record<string, string> = {};

          for (const row of rows) {
            const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
            if (cells.length >= 2 && cells[0] && cells[1]) {
              const label = decodeEntities(cells[0].replace(/<[^>]+>/g, '').trim());
              const val = decodeEntities(cells[1].replace(/<[^>]+>/g, '').trim());
              if (label && val) {
                data[label] = val;
              }
            }
          }

          const name = data['Nombre/Razón Social'] || data['Razón Social'] || data['Nombre'] || '';
          const status = (data['Estado'] || 'ACTIVO').toUpperCase();
          const commercialName = data['Nombre Comercial'] || '';
          const activity = data['Actividad Economica'] || '';
          const formattedRnc = data['Cédula/RNC'] || rnc;

          res.setHeader('Content-Type', 'application/json');
          if (name) {
            res.statusCode = 200;
            res.end(JSON.stringify({
              success: true,
              rnc: formattedRnc,
              name: name.toUpperCase(),
              commercialName: commercialName !== '&nbsp;' && commercialName ? commercialName : undefined,
              status: status === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO',
              type: rnc.length === 11 ? 'Físico' : 'Jurídico',
              activity: activity || undefined
            }));
          } else {
            res.statusCode = 404;
            res.end(JSON.stringify({
              success: false,
              rnc,
              name: '',
              status: 'NO_REGISTRADO',
              error: 'RNC o Cédula no registrada en la DGII.'
            }));
          }
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dgiiLookupPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Brianna Heavy Equipment',
        short_name: 'Brianna POS',
        description: 'Gestión Integral para Brianna Heavy Equipment',
        theme_color: '#C1121F',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }
            if (id.includes('framer-motion') || id.includes('@headlessui') || id.includes('@heroicons')) {
              return 'ui-vendor';
            }
            if (id.includes('recharts')) {
              return 'chart-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            return 'vendor';
          }
        },
      },
    },
  },
});
