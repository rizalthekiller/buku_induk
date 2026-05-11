
const pool = require('../config/database');

const BULAN_ROMAWI = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

async function generateNomorInduk(clientOrPool) {
  const settingsRes = await clientOrPool.query(
    `SELECT key, value FROM settings
     WHERE key IN ('nomor_induk_format','nomor_induk_unit','nomor_induk_padding','nomor_induk_counter')`
  );
  const s = {};
  settingsRes.rows.forEach(r => { s[r.key] = r.value; });

  const format  = s['nomor_induk_format']  || '{NO}/{UNIT}/{BULAN_ROMAWI}/{TAHUN}';
  const unit    = s['nomor_induk_unit']    || 'UPT-Lib-BP';
  const padding = parseInt(s['nomor_induk_padding']) || 5;

  // Increment counter
  const counterRes = await clientOrPool.query(
    "UPDATE settings SET value = (value::int + 1)::text WHERE key = 'nomor_induk_counter' RETURNING value"
  );
  const counter = parseInt(counterRes.rows[0].value);

  const now   = new Date();
  const tahun = now.getFullYear();
  const bulan = String(now.getMonth() + 1).padStart(2, '0');
  const bulanRomawi = BULAN_ROMAWI[now.getMonth()];
  const no    = String(counter).padStart(padding, '0');

  return format
    .replace('{NO}',           no)
    .replace('{UNIT}',         unit)
    .replace('{PREFIX}',       unit)
    .replace('{BULAN_ROMAWI}', bulanRomawi)
    .replace('{BULAN}',        bulan)
    .replace('{TAHUN}',        tahun);
}

function incrementFormattedNumber(str, offset) {
  if (!str) return '';
  const match = str.match(/\d+/);
  if (!match) return str;
  const originalNumberStr = match[0];
  const originalNumber = parseInt(originalNumberStr);
  const nextNumber = originalNumber + offset;
  const nextNumberStr = String(nextNumber).padStart(originalNumberStr.length, '0');
  return str.replace(originalNumberStr, nextNumberStr);
}

function generateCutter(pengarang) {
  if (!pengarang) return '';
  const clean = pengarang.trim().replace(/^(Muhammad|Mohammad|Moh\.|Dr\.|Prof\.|Ir\.|Drs\.)\s+/i, '');
  return clean.substring(0, 3).toUpperCase();
}

module.exports = { generateNomorInduk, incrementFormattedNumber, generateCutter };
