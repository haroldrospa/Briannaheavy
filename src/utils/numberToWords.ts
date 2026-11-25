/**
 * Convierte un número numérico a su representación en letras en español (formato República Dominicana / Pesos).
 * Ejemplo: 15450.75 -> "QUINCE MIL CUATROCIENTOS CINCUENTA PESOS CON 75/100"
 */

const UNIDADES = [
  '',
  'UN',
  'DOS',
  'TRES',
  'CUATRO',
  'CINCO',
  'SEIS',
  'SIETE',
  'OCHO',
  'NUEVE',
  'DIEZ',
  'ONCE',
  'DOCE',
  'TRECE',
  'CATORCE',
  'QUINCE',
  'DIECISÉIS',
  'DIECISIETE',
  'DIECIOCHO',
  'DIECINUEVE',
  'VEINTE',
  'VEINTIUNO',
  'VEINTIDÓS',
  'VEINTITRÉS',
  'VEINTICUATRO',
  'VEINTICINCO',
  'VEINTISÉIS',
  'VEINTISIETE',
  'VEINTIOCHO',
  'VEINTINUEVE'
];

const DECENAS = [
  '',
  'DIEZ',
  'VEINTE',
  'TREINTA',
  'CUARENTA',
  'CINCUENTA',
  'SESENTA',
  'SETENTA',
  'OCHENTA',
  'NOVENTA'
];

const CENTENAS = [
  '',
  'CIENTO',
  'DOSCIENTOS',
  'TRESCIENTOS',
  'CUATROCIENTOS',
  'QUINIENTOS',
  'SEISCIENTOS',
  'SETECIENTOS',
  'OCHOCIENTOS',
  'NOVECIENTOS'
];

function convertirSeccion(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  const c = Math.floor(n / 100);
  const r = n % 100;

  let out = '';
  if (c > 0) {
    out += CENTENAS[c] + ' ';
  }

  if (r <= 29) {
    out += UNIDADES[r];
  } else {
    const d = Math.floor(r / 10);
    const u = r % 10;
    out += DECENAS[d];
    if (u > 0) {
      out += ' Y ' + UNIDADES[u];
    }
  }

  return out.trim();
}

export function numeroALetras(monto: number | string, moneda: string = 'PESOS'): string {
  const num = typeof monto === 'string' ? parseFloat(monto.replace(/,/g, '')) : monto;
  if (isNaN(num) || num === null || num === undefined) return '';
  if (num === 0) return `CERO ${moneda} CON 00/100`;

  const parteEntera = Math.floor(Math.abs(num));
  const parteDecimal = Math.round((Math.abs(num) - parteEntera) * 100);

  if (parteEntera === 0) {
    const decStr = parteDecimal.toString().padStart(2, '0');
    return `CERO ${moneda} CON ${decStr}/100`;
  }

  let letras = '';

  // Millones
  const millones = Math.floor(parteEntera / 1000000);
  const restoMillones = parteEntera % 1000000;

  if (millones > 0) {
    if (millones === 1) {
      letras += 'UN MILLÓN ';
    } else {
      letras += convertirSeccion(millones) + ' MILLONES ';
    }
  }

  // Miles
  const miles = Math.floor(restoMillones / 1000);
  const unidades = restoMillones % 1000;

  if (miles > 0) {
    if (miles === 1) {
      letras += 'MIL ';
    } else {
      letras += convertirSeccion(miles) + ' MIL ';
    }
  }

  // Cientos y decenas
  if (unidades > 0) {
    letras += convertirSeccion(unidades) + ' ';
  }

  const decStr = parteDecimal.toString().padStart(2, '0');
  const resultado = `${letras.trim()} ${moneda} CON ${decStr}/100`.replace(/\s+/g, ' ').trim();

  return resultado;
}
