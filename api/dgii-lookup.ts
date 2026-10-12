export default async function handler(req: any, res: any) {
  const url = new URL(req.url || '', `http://${req.headers?.host || 'localhost'}`);
  const rnc = (url.searchParams.get('rnc') || req.query?.rnc || '').replace(/\D/g, '');

  if (!rnc || (rnc.length !== 9 && rnc.length !== 11)) {
    res.statusCode = 400;
    res.setHeader?.('Content-Type', 'application/json');
    res.end?.(JSON.stringify({ success: false, error: 'RNC o Cédula inválida' }));
    return;
  }

  try {
    // 1. Si es Cédula (11 dígitos), consultar primero la API oficial de identidad (OGTIC / Digital.gob.do)
    if (rnc.length === 11) {
      try {
        const cedRes = await fetch(`https://api.digital.gob.do/v3/cedulas/${rnc}`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
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
              res.setHeader?.('Content-Type', 'application/json');
              res.end?.(JSON.stringify({
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
        console.warn('[dgii-lookup api] Error consultando api.digital.gob.do:', e);
      }
    }

    const dgiiUrl = 'https://dgii.gov.do/app/WebApps/ConsultasWeb2/ConsultasWeb/consultas/rnc.aspx';
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

    const getRes = await fetch(dgiiUrl, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
      }
    });
    const html = await getRes.text();
    
    const rawCookies = typeof (getRes.headers as any).getSetCookie === 'function' 
      ? (getRes.headers as any).getSetCookie() 
      : [getRes.headers.get('set-cookie') || ''];
    const cookieHeader = rawCookies.map((c: string) => c.split(';')[0]).filter(Boolean).join('; ');

    const vsMatch = html.match(/name="__VIEWSTATE" id="__VIEWSTATE" value="([^"]+)"/);
    const vsgMatch = html.match(/name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="([^"]+)"/);
    const evMatch = html.match(/name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="([^"]+)"/);

    if (!vsMatch) {
      res.statusCode = 502;
      res.setHeader?.('Content-Type', 'application/json');
      res.end?.(JSON.stringify({ success: false, error: 'Portal DGII no disponible' }));
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
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': userAgent,
        'X-MicrosoftAjax': 'Delta=true',
        'Cookie': cookieHeader,
        'Referer': dgiiUrl,
        'Origin': 'https://dgii.gov.do'
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
    const formattedRnc = data['Cédula/RNC'] || formattedInput;

    res.setHeader?.('Content-Type', 'application/json');
    if (name) {
      res.statusCode = 200;
      res.end?.(JSON.stringify({
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
      res.end?.(JSON.stringify({
        success: false,
        rnc,
        name: '',
        status: 'NO_REGISTRADO',
        error: 'RNC o Cédula no registrada en la DGII.'
      }));
    }
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader?.('Content-Type', 'application/json');
    res.end?.(JSON.stringify({ success: false, error: err.message }));
  }
}
