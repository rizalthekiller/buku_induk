const pool = require('../config/database');

async function renderBookCards(req, res) {
  try {
    const { ids, paper = 'a4' } = req.query;
    
    // Kita join dengan tabel exemplars agar setiap copy punya kartu sendiri
    let query = `
      SELECT e.nomor_induk, b.judul, b.pengarang, b.klasifikasi
      FROM exemplars e
      JOIN books b ON e.book_id = b.id
    `;
    let params = [];

    if (ids) {
      const idList = ids.split(',');
      query += ' WHERE b.id = ANY($1)';
      params = [idList];
    }
    
    query += ' ORDER BY e.nomor_induk ASC';
    
    const result = await pool.query(query, params);
    const books = result.rows; // Sekarang ini adalah list eksemplar

    const html = generatePrintHTML(books, paper);
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating print page');
  }
}

function generatePrintHTML(books, paper) {
  const paperClass = paper === 'f4' ? 'paper-f4' : 'paper-a4';
  const cardsPerPage = 10; // 5 across x 2 down
  
  let pagesHtml = '';
  for (let i = 0; i < books.length; i += cardsPerPage) {
    const pageBooks = books.slice(i, i + cardsPerPage);
    const cardsHtml = pageBooks.map(book => {
      const parts = (book.nomor_induk || '').split('/');
      parts[0] = parts[0].replace(/^0+/, '') || '0';
      const displayNomor = parts.join('/');
      return `
      <div class="book-card">
        <div class="header-section">
          <table class="header-table">
            <tr><td class="label">No. Klass</td><td class="sep">:</td><td class="val truncate">${book.klasifikasi || ''}</td></tr>
            <tr><td class="label">Pengarang</td><td class="sep">:</td><td class="val truncate">${book.pengarang || ''}</td></tr>
            <tr><td class="label">Judul</td><td class="sep">:</td><td class="val truncate">${book.judul || ''}</td></tr>
            <tr><td class="label">No. Induk</td><td class="sep">:</td><td class="val truncate"><strong>${displayNomor}</strong></td></tr>
          </table>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th width="50%">NIM</th>
              <th width="50%">Kembali</th>
            </tr>
          </thead>
          <tbody>
            ${Array(8).fill('<tr><td>&nbsp;</td><td>&nbsp;</td></tr>').join('')}
          </tbody>
        </table>
      </div>
      `;
    }).join('');
    
    pagesHtml += `<div class="page ${paperClass}">${cardsHtml}</div>`;
  }

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Cetak Kartu Buku</title>
      <style>
        :root {
          /* Landscape A4: 297 x 210 | F4: 330 x 215 */
          --card-width: 58mm;
          --card-height: 100mm;
        }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #eee; font-family: 'Arial Narrow', Arial, sans-serif; }
        
        .page {
          background: white;
          margin: 10mm auto;
          padding: 5mm;
          display: grid;
          grid-template-columns: repeat(5, 1fr); /* 5 columns */
          grid-template-rows: repeat(2, 1fr);    /* 2 rows */
          gap: 1.5mm;
          page-break-after: always;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .paper-a4 { width: 297mm; height: 210mm; }
        .paper-f4 { width: 330mm; height: 215mm; }

        .book-card {
          border: 1px solid #000;
          height: 100mm;
          width: 100%;
          padding: 2mm;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .header-section {
          height: 24mm;
          overflow: hidden;
          margin-bottom: 1mm;
        }

        .header-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.5px;
          table-layout: fixed;
        }
        .header-table td { padding: 1px 1px; vertical-align: top; border: none !important; }
        .header-table .label { width: 16mm; font-weight: bold; }
        .header-table .sep { width: 2mm; }
        
        .truncate {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          border-top: 1.5px solid #000;
          flex: 1;
          table-layout: fixed;
        }
        .data-table th, .data-table td {
          border: 1px solid #000;
          font-size: 8.5px;
          height: 8.5mm;
          text-align: center;
          padding: 0;
          overflow: hidden;
        }
        .data-table thead th { height: 6mm; background: #fff; font-weight: bold; border-bottom: 1.5px solid #000; }

        @media print {
          @page { size: landscape; margin: 0; }
          body { background: none; }
          .page { margin: 0; box-shadow: none; padding: 4mm; }
          .no-print { display: none; }
        }

        .controls {
          position: fixed; top: 20px; right: 20px; background: #fff;
          padding: 15px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
          z-index: 1000; border: 1px solid #ddd;
        }
        .btn { padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; border: none; font-size: 14px; }
        .btn-print { background: #10b981; color: white; }
        .btn-close { background: #ef4444; color: white; margin-left: 8px; }
      </style>
    </head>
    <body>
      <div class="controls no-print">
        <div style="margin-bottom:10px; font-size:12px; color:#666;">
          Layout: <strong>10 Kartu per Halaman (5x2)</strong><br>
          Total Buku: <strong>${books.length}</strong>
        </div>
        <button class="btn btn-print" onclick="window.print()">🖨️ Cetak Sekarang</button>
        <button class="btn btn-close" onclick="window.close()">Tutup</button>
      </div>
      ${pagesHtml}
    </body>
    </html>
  `;
}





async function renderBookLabels(req, res) {
  try {
    const { ids, paper = 'a4', code_type = 'qr' } = req.query;
    
    let query = `
      SELECT e.nomor_induk, b.judul, b.pengarang, b.klasifikasi, b.subjek, b.sumber_perolehan
      FROM exemplars e
      JOIN books b ON e.book_id = b.id
    `;
    let params = [];
    if (ids) {
      const idList = ids.split(',');
      query += ' WHERE b.id = ANY($1)';
      params = [idList];
    }
    query += ' ORDER BY e.nomor_induk ASC';
    
    const result = await pool.query(query, params);
    const books = result.rows;

    const html = generateLabelHTML(books, paper, code_type);
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating label page');
  }
}

function generateLabelHTML(books, paper, codeType = 'qr') {
  const paperClass = paper === 'f4' ? 'paper-f4' : 'paper-a4';
  const labelsPerPage = 8; // 2 across x 4 down
  
  let pagesHtml = '';
  for (let i = 0; i < books.length; i += labelsPerPage) {
    const pageBooks = books.slice(i, i + labelsPerPage);
      const labelsHtml = pageBooks.map(book => {
        // Hilangkan leading zeros untuk data barcode/QR dan tampilan
        const fullNomor = book.nomor_induk || '';
        const parts = fullNomor.split('/');
        const numPart = parts[0].replace(/^0+/, '') || '0';
        
        const dataCode = numPart; // SLiMS hanya butuh angka induknya saja tanpa leading zero
        const displayNomor = [numPart, ...parts.slice(1)].join('/');
        
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(dataCode)}`;
        
        return `
          <div class="label-card">
            <div class="label-header">
              <div class="logo-box">
                <img src="/img/logo_uinsi.png" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3308/3308395.png'" alt="Logo">
              </div>
              <div class="title-box">
                <div class="inst">P E R P U S T A K A A N</div>
                <div class="name">UINSI SAMARINDA</div>
              </div>
            </div>
            <div class="label-body">
              <div class="data-section">
                <table class="data-table">
                  <tr><td class="lbl">No. Reg.</td><td class="sep">:</td><td class="val">${displayNomor}</td></tr>
                  <tr><td class="lbl">No. Kelas</td><td class="sep">:</td><td class="val">${book.klasifikasi || ''}</td></tr>
                  <tr><td class="lbl">Pengarang</td><td class="sep">:</td><td class="val truncate">${book.pengarang || ''}</td></tr>
                  <tr><td class="lbl">Sumber</td><td class="sep">:</td><td class="val">${book.sumber_perolehan || ''}</td></tr>
                  <tr><td class="lbl">Subjek</td><td class="sep">:</td><td class="val truncate">${book.subjek || ''}</td></tr>
                </table>
              </div>
            <div class="code-section">
              ${codeType === 'barcode' 
                ? `<svg class="barcode" data-value="${dataCode}"></svg>` 
                : `<img src="${qrUrl}" alt="QR">`
              }
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    pagesHtml += `<div class="page ${paperClass}">${labelsHtml}</div>`;
  }

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Cetak Label Buku</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #eee; font-family: Arial, sans-serif; }
        
        .page {
          background: white;
          margin: 10mm auto;
          padding: 10mm;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          grid-template-rows: repeat(4, 1fr);
          gap: 5mm;
          page-break-after: always;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .paper-a4 { width: 210mm; height: 297mm; }
        .paper-f4 { width: 215mm; height: 330mm; }

        .label-card {
          border: 1.5px solid #000;
          height: 100%;
          padding: 2mm 3mm;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .label-header {
          display: flex;
          align-items: center;
          border-bottom: 1.5px solid #000;
          padding-bottom: 1mm;
          margin-bottom: 2mm;
          height: 18mm;
          overflow: hidden;
        }
        .logo-box { width: 14mm; height: 14mm; margin-right: 2mm; flex-shrink: 0; }
        .logo-box img { width: 100%; height: 100%; object-fit: contain; }
        
        .title-box { flex: 1; text-align: center; font-family: 'Times New Roman', serif; display: flex; flex-direction: column; justify-content: center; }
        .title-box .inst { font-size: 16px; font-weight: bold; letter-spacing: 3px; white-space: nowrap; margin-bottom: 1px; }
        .title-box .name { font-size: 17px; font-weight: bold; white-space: nowrap; }

        .label-body { display: flex; flex: 1; align-items: center; position: relative; gap: 2mm; }
        .data-section { flex: 1; }
        .code-section { width: 28mm; display: flex; align-items: center; justify-content: center; }
        .code-section img { width: 25mm; height: 25mm; }
        .barcode { width: 100%; height: 25mm; }

        .data-table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; }
        .data-table td { padding: 1.5px 0; vertical-align: top; }
        .data-table .lbl { width: 22mm; white-space: nowrap; }
        .data-table .sep { width: 3mm; text-align: center; }
        .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        @media print {
          @page { size: portrait; margin: 0; }
          body { background: none; }
          .page { margin: 0; box-shadow: none; }
          .no-print { display: none; }
        }

        .controls {
          position: fixed; top: 20px; right: 20px; background: #fff;
          padding: 15px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
          z-index: 1000; border: 1px solid #ddd;
        }
        .btn { padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; border: none; font-size: 14px; }
        .btn-print { background: #10b981; color: white; }
        .btn-close { background: #ef4444; color: white; margin-left: 8px; }
      </style>
    </head>
    <body>
      <div class="controls no-print">
        <button class="btn btn-print" onclick="window.print()">🖨️ Cetak Sekarang</button>
        <button class="btn btn-close" onclick="window.close()">Tutup</button>
      </div>
      ${pagesHtml}
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          const barcodes = document.querySelectorAll('.barcode');
          barcodes.forEach(el => {
            JsBarcode(el, el.dataset.value, {
              format: "CODE128",
              width: 1.5,
              height: 50,
              displayValue: false,
              margin: 0
            });
          });
        });
      </script>
    </body>
    </html>
  `;
}

async function renderBookSpines(req, res) {
  try {
    const { ids, paper = 'a4' } = req.query;
    
    let query = `
      SELECT e.nomor_induk, b.judul, b.pengarang, b.klasifikasi, b.call_number
      FROM exemplars e
      JOIN books b ON e.book_id = b.id
    `;
    let params = [];
    if (ids) {
      const idList = ids.split(',');
      query += ' WHERE b.id = ANY($1)';
      params = [idList];
    }
    query += ' ORDER BY e.nomor_induk ASC';
    
    const result = await pool.query(query, params);
    const books = result.rows;

    const html = generateSpineHTML(books, paper);
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating spine labels page');
  }
}

function generateSpineHTML(books, paper) {
  const isF4 = paper === 'f4';
  const paperClass = isF4 ? 'paper-f4' : 'paper-a4';
  const cols = 5;
  const rows = isF4 ? 6 : 5;
  const labelsPerPage = cols * rows; // A4=25, F4=30
  
  let pagesHtml = '';
  for (let i = 0; i < books.length; i += labelsPerPage) {
    const pageBooks = books.slice(i, i + labelsPerPage);
    const labelsHtml = pageBooks.map(book => {
      // Parse call number lines
      const callLines = (book.call_number || '').split('\n').filter(l => l.trim());
      if (callLines.length === 0 && book.klasifikasi) {
        callLines.push(book.klasifikasi);
        // Tambah 3 huruf pertama pengarang sebagai cutter
        if (book.pengarang) {
          callLines.push(book.pengarang.substring(0, 3).toUpperCase());
        }
        // Tambah huruf pertama judul (lowercase)
        if (book.judul) {
          callLines.push(book.judul.charAt(0).toLowerCase());
        }
      }
      
      // Ambil nomor pendek dari nomor_induk (angka saja)
      const nomorFull = book.nomor_induk || '';
      const nomorShort = nomorFull.split('/')[0].replace(/^0+/, '') || nomorFull;
      
      return `
        <div class="spine-card">
          <div class="spine-header">
            <div class="logo-box">
              <img src="/img/logo_uinsi.png" onerror="this.style.display='none'" alt="Logo">
            </div>
            <div class="header-text">
              <div class="h-perpus">PERPUSTAKAAN</div>
              <div class="h-uinsi">UINSI SAMARINDA</div>
            </div>
          </div>
          <div class="spine-body">
            <div class="call-area">
              ${callLines.map(line => `<div class="call-line">${line}</div>`).join('')}
            </div>
            <div class="reg-number">${nomorShort}</div>
          </div>
        </div>
      `;
    }).join('');
    
    pagesHtml += `
      <div class="page ${paperClass}">
        ${labelsHtml}
      </div>`;
  }

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Cetak Nomor Punggung</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #ddd; font-family: Arial, Helvetica, sans-serif; }
        
        .page {
          background: white;
          margin: 8mm auto;
          display: grid;
          grid-template-columns: repeat(${cols}, 35mm);
          grid-template-rows: repeat(${rows}, 45mm);
          gap: 2mm;
          justify-content: center;
          align-content: center;
          page-break-after: always;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15);
          overflow: hidden;
        }
        .paper-a4 { width: 210mm; height: 297mm; padding: 10mm 8mm; }
        .paper-f4 { width: 215mm; height: 330mm; padding: 10mm 8mm; }

        /* ── Kartu Punggung ── */
        .spine-card {
          border: 1px solid #000;
          width: 35mm;
          height: 45mm;
          display: flex;
          flex-direction: column;
          background: #fff;
          overflow: hidden;
        }

        /* ── Header: Logo + Teks ── */
        .spine-header {
          display: flex;
          align-items: center;
          gap: 1mm;
          padding: 1.5mm 1.5mm 1mm 1.5mm;
          border-bottom: 1px solid #000;
          min-height: 11mm;
          max-height: 11mm;
        }

        .logo-box {
          width: 8mm;
          height: 8mm;
          flex-shrink: 0;
        }
        .logo-box img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .header-text {
          flex: 1;
          text-align: center;
          line-height: 1.15;
        }
        .h-perpus {
          font-size: 6.5pt;
          font-weight: bold;
          letter-spacing: 0.3px;
        }
        .h-uinsi {
          font-size: 6.5pt;
          font-weight: bold;
        }

        /* ── Body: Call Number + Nomor ── */
        .spine-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          padding: 1mm 1.5mm 1.5mm 1.5mm;
        }

        .call-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          gap: 0.3mm;
        }

        .call-line {
          font-size: 10pt;
          font-weight: bold;
          line-height: 1.25;
          color: #000;
        }

        .reg-number {
          position: absolute;
          bottom: 1mm;
          right: 1.5mm;
          font-size: 7pt;
          color: #000;
        }

        /* ── Print ── */
        @media print {
          @page { size: portrait; margin: 0; }
          body { background: none; }
          .page { margin: 0; box-shadow: none; }
          .no-print { display: none !important; }
        }

        /* ── Controls ── */
        .controls {
          position: fixed; top: 15px; right: 15px; background: #fff;
          padding: 12px 16px; border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.25);
          z-index: 1000; display: flex; align-items: center; gap: 8px;
        }
        .info-text { font-size: 12px; color: #555; margin-right: 8px; line-height: 1.3; }
        .info-text strong { color: #111; }
        .btn { padding: 8px 18px; border-radius: 6px; cursor: pointer; font-weight: 600; border: none; font-size: 13px; }
        .btn-print { background: #10b981; color: white; }
        .btn-close { background: #ef4444; color: white; }
      </style>
    </head>
    <body>
      <div class="controls no-print">
        <div class="info-text">
          Layout: <strong>${cols}×${rows} = ${labelsPerPage} label/halaman</strong><br>
          Total: <strong>${books.length} label</strong> · ${Math.ceil(books.length / labelsPerPage)} halaman
        </div>
        <button class="btn btn-print" onclick="window.print()">🖨️ Cetak</button>
        <button class="btn btn-close" onclick="window.close()">✕ Tutup</button>
      </div>
      ${pagesHtml}
    </body>
    </html>
  `;
}

module.exports = { renderBookCards, renderBookLabels, renderBookSpines };
