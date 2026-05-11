const pool    = require('../config/database');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// =============================================
// GET /api/export/excel
// =============================================
async function exportExcel(req, res) {
  try {
    const { ids } = req.query;
    let query = 'SELECT * FROM books';
    let params = [];
    if (ids) {
      query += ' WHERE id = ANY($1)';
      params = [ids.split(',')];
    }
    query += ' ORDER BY created_at ASC';

    // Ambil data buku
    const booksRes = await pool.query(query, params);
    // Ambil column styles untuk styling
    const colRes = await pool.query(
      'SELECT * FROM column_styles WHERE is_visible = true ORDER BY order_no ASC'
    );

    const workbook  = new ExcelJS.Workbook();
    workbook.creator = 'Sistem Buku Induk';
    const sheet = workbook.addWorksheet('Buku Induk', {
      pageSetup: { paperSize: 9, orientation: 'landscape' }
    });

    // Header row berdasarkan column_styles
    const columns = colRes.rows;
    const headerRow = sheet.addRow(columns.map(c => c.label));

    // Style header
    columns.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: (col.bg_color || '#4A90D9').replace('#', 'FF') }
      };
      cell.font  = { bold: true, color: { argb: (col.text_color || '#FFFFFF').replace('#', 'FF') } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: {style:'thin'}, left: {style:'thin'},
        bottom: {style:'thin'}, right: {style:'thin'}
      };
    });
    headerRow.height = 28;

    // Set lebar kolom
    sheet.columns = columns.map(c => ({
      key: c.field_name,
      width: Math.round((c.width || 150) / 7)
    }));

    // Data rows
    const fieldMap = {
      no: null, nomor_induk: 'nomor_induk', judul: 'judul',
      pengarang: 'pengarang', penanggung_jawab: 'penanggung_jawab',
      penerbit: 'penerbit', tahun_terbit: 'tahun_terbit',
      kota_terbit: 'kota_terbit', edisi_cetakan: 'edisi_cetakan',
      isbn: 'isbn', fisik: 'fisik', klasifikasi: 'klasifikasi',
      subjek: 'subjek', call_number: 'call_number',
      tanggal_olah: 'tanggal_olah', tanggal_entri: 'tanggal_entri',
      sumber_perolehan: 'sumber_perolehan', jumlah_eksemplar: 'jumlah_eksemplar'
    };

    booksRes.rows.forEach((book, rowIdx) => {
      const rowData = columns.map(col => {
        if (col.field_name === 'no') return rowIdx + 1;
        if (col.field_name === 'tanggal_olah' || col.field_name === 'tanggal_entri') {
          const d = book[col.field_name];
          return d ? new Date(d).toLocaleDateString('id-ID') : '';
        }
        let val = book[fieldMap[col.field_name] || col.field_name] || '';
        // Ubah newline jadi spasi agar menyamping (horizontal)
        if (col.field_name === 'call_number' && typeof val === 'string') {
          val = val.replace(/\n/g, ' ');
        }
        return val;
      });
      const row = sheet.addRow(rowData);
      row.eachCell((cell, i) => {
        const col = columns[i - 1];
        cell.border = {
          top: {style:'thin'}, left: {style:'thin'},
          bottom: {style:'thin'}, right: {style:'thin'}
        };
        // Call number jangan wrap dan tampil horizontal
        const isCallNumber = col.field_name === 'call_number';
        cell.alignment = { 
          vertical: 'middle', 
          wrapText: isCallNumber ? false : true,
          horizontal: 'left'
        };
      });
      row.height = 20;
    });

    // Freeze pane
    const frozenCount = columns.filter(c => c.is_frozen).length;
    if (frozenCount > 0) {
      sheet.views = [{ state: 'frozen', xSplit: frozenCount, ySplit: 1 }];
    } else {
      sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=buku_induk_${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// =============================================
// GET /api/export/pdf
// =============================================
async function exportPDF(req, res) {
  try {
    const { ids } = req.query;
    let query = 'SELECT * FROM books';
    let params = [];
    if (ids) {
      query += ' WHERE id = ANY($1)';
      params = [ids.split(',')];
    }
    query += ' ORDER BY created_at ASC LIMIT 1000';

    const booksRes = await pool.query(query, params);

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=buku_induk_${Date.now()}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(14).font('Helvetica-Bold')
       .text('BUKU INDUK PERPUSTAKAAN', { align: 'center' });
    doc.fontSize(9).font('Helvetica')
       .text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, { align: 'center' });
    doc.moveDown(0.5);

    // Kolom
    const cols = [
      { label: 'No',          w: 25  },
      { label: 'No. Induk',   w: 90  },
      { label: 'Judul',       w: 200 },
      { label: 'Pengarang',   w: 110 },
      { label: 'Penerbit',    w: 100 },
      { label: 'Tahun',       w: 40  },
      { label: 'ISBN',        w: 90  },
      { label: 'Klasifikasi', w: 60  },
      { label: 'Sumber',      w: 70  },
    ];

    const startX   = 30;
    let   y        = doc.y;
    const rowH     = 18;
    const headerH  = 20;

    // Header tabel
    doc.rect(startX, y, cols.reduce((s,c)=>s+c.w,0), headerH).fill('#1D4ED8');
    let x = startX;
    doc.fillColor('white').fontSize(7).font('Helvetica-Bold');
    cols.forEach(col => {
      doc.text(col.label, x + 2, y + 4, { width: col.w - 4, align: 'center' });
      x += col.w;
    });
    y += headerH;

    // Data rows
    doc.font('Helvetica').fontSize(6.5);
    booksRes.rows.forEach((book, idx) => {
      if (y + rowH > doc.page.height - 40) {
        doc.addPage({ margin: 30, size: 'A4', layout: 'landscape' });
        y = 30;
      }

      const bg = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
      doc.rect(startX, y, cols.reduce((s,c)=>s+c.w,0), rowH).fill(bg);

      const rowData = [
        idx + 1,
        book.nomor_induk || '',
        book.judul || '',
        book.pengarang || '',
        book.penerbit || '',
        book.tahun_terbit || '',
        book.isbn || '',
        book.klasifikasi || '',
        book.sumber_perolehan || '',
      ];

      x = startX;
      doc.fillColor('#111827');
      rowData.forEach((val, i) => {
        doc.text(String(val), x + 2, y + 3, { width: cols[i].w - 4, ellipsis: true, lineBreak: false });
        x += cols[i].w;
      });

      // Border bottom
      doc.moveTo(startX, y + rowH).lineTo(startX + cols.reduce((s,c)=>s+c.w,0), y + rowH)
         .strokeColor('#E5E7EB').lineWidth(0.5).stroke();
      y += rowH;
    });

    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { exportExcel, exportPDF };
