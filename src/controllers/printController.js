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
    const cardsHtml = pageBooks.map(book => `
      <div class="book-card">
        <div class="header-section">
          <table class="header-table">
            <tr><td class="label">No. Klass</td><td class="sep">:</td><td class="val truncate">${book.klasifikasi || ''}</td></tr>
            <tr><td class="label">Pengarang</td><td class="sep">:</td><td class="val truncate">${book.pengarang || ''}</td></tr>
            <tr><td class="label">Judul</td><td class="sep">:</td><td class="val truncate">${book.judul || ''}</td></tr>
            <tr><td class="label">No. Induk</td><td class="sep">:</td><td class="val truncate"><strong>${book.nomor_induk || ''}</strong></td></tr>
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
    `).join('');
    
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
    const { ids, paper = 'a4' } = req.query;
    
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

    const html = generateLabelHTML(books, paper);
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating label page');
  }
}

function generateLabelHTML(books, paper) {
  const paperClass = paper === 'f4' ? 'paper-f4' : 'paper-a4';
  const labelsPerPage = 8; // 2 across x 4 down
  
  let pagesHtml = '';
  for (let i = 0; i < books.length; i += labelsPerPage) {
    const pageBooks = books.slice(i, i + labelsPerPage);
    const labelsHtml = pageBooks.map(book => {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(book.nomor_induk)}`;
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
                <tr><td class="lbl">No. Reg.</td><td class="sep">:</td><td class="val">${book.nomor_induk}</td></tr>
                <tr><td class="lbl">No. Kelas</td><td class="sep">:</td><td class="val">${book.klasifikasi || ''}</td></tr>
                <tr><td class="lbl">Pengarang</td><td class="sep">:</td><td class="val truncate">${book.pengarang || ''}</td></tr>
                <tr><td class="lbl">Sumber</td><td class="sep">:</td><td class="val">${book.sumber_perolehan || ''}</td></tr>
                <tr><td class="lbl">Subjek</td><td class="sep">:</td><td class="val truncate">${book.subjek || ''}</td></tr>
              </table>
            </div>
            <div class="qr-section">
              <img src="${qrUrl}" alt="QR">
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

        .label-body { display: flex; flex: 1; align-items: center; position: relative; }
        .data-section { flex: 1; }
        .qr-section { width: 25mm; height: 25mm; flex-shrink: 0; }
        .qr-section img { width: 100%; height: 100%; }

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
    </body>
    </html>
  `;
}

module.exports = { renderBookCards, renderBookLabels };
