'use strict';

// ── State ─────────────────────────────────────
const state = {
  currentPage: 'dashboard',
  books: [], meta: {}, columns: [], customColumns: [], templates: [],
  sortBy: 'nomor_induk', sortDir: 'asc',
  search: '', page: 1, limit: 50,
  editingCell: null, dragSrc: null,
  selectedIds: new Set(),
  currentImportFile: null,
};

// ── DOM helpers ───────────────────────────────
const $ = id => document.getElementById(id);
const show = el => el && el.classList.remove('hidden');
const hide = el => el && el.classList.add('hidden');

// ── Toast ─────────────────────────────────────
function toast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type==='success'?'✅':type==='error'?'❌':'ℹ️'}</span><span>${msg}</span>`;
  $('toast-container').appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── API fetch ─────────────────────────────────
async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  
  if (res.status === 401) {
    window.location.href = '/login.html';
    return { success: false, message: 'Unauthorized' };
  }
  
  return res.json();
}

// ── Clock ─────────────────────────────────────
function startClock() {
  const el = $('topbar-time');
  const tick = () => { el.textContent = new Date().toLocaleString('id-ID',{weekday:'short',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); };
  tick(); setInterval(tick, 1000);
}

// ── Navigation ────────────────────────────────
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pg = $(`page-${page}`); if (pg) show(pg);
  const nav = $(`nav-${page}`); if (nav) nav.classList.add('active');
  const titles = { 
    dashboard: 'Dashboard', 
    'buku-induk': 'Buku Induk', 
    kolom: 'Kustomisasi Kolom', 
    template: 'Template', 
    user: 'Manajemen User',
    pengaturan: 'Pengaturan' 
  };
  $('page-title').textContent = titles[page] || page;
  state.currentPage = page;
  if (page === 'dashboard')  loadDashboard();
  if (page === 'buku-induk') loadBooks();
  if (page === 'kolom')      loadColumns();
  if (page === 'template')   loadTemplates();
  if (page === 'user')       loadUsers();
  if (page === 'pengaturan') loadSettings();
}

// ── Dashboard ─────────────────────────────────
async function loadDashboard() {
  const r = await api('/stats');
  if (!r.success) return;
  const d = r.data;
  $('stat-judul').textContent     = d.total_judul.toLocaleString('id-ID');
  $('stat-eksemplar').textContent = d.total_eksemplar.toLocaleString('id-ID');
  $('stat-tahun').textContent     = d.per_tahun[0]?.tahun_terbit || '—';
  $('stat-baru').textContent      = '—';
  renderBarChart(d.per_tahun);
}

function renderBarChart(rows) {
  const el = $('chart-tahun');
  if (!rows || !rows.length) { el.innerHTML = '<p style="color:var(--text2);text-align:center;padding:20px">Belum ada data</p>'; return; }
  const max = Math.max(...rows.map(r => parseInt(r.jumlah)));
  el.innerHTML = rows.slice(0,8).map(r => `
    <div class="bar-item">
      <span class="bar-label">${r.tahun_terbit}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round((parseInt(r.jumlah)/max)*100)}%">${r.jumlah}</div></div>
    </div>`).join('');
}

// ── Load Books ────────────────────────────────
async function loadBooks() {
  show($('table-loading')); hide($('spreadsheet-container'));
  const r = await api(`/books?page=${state.page}&limit=${state.limit}&search=${encodeURIComponent(state.search)}&sort_by=${state.sortBy}&sort_dir=${state.sortDir}`);
  hide($('table-loading'));
  if (!r.success) { toast('Gagal memuat data buku','error'); return; }
  state.books = r.data; state.meta = r.meta;
  show($('spreadsheet-container'));
  if (!state.columns.length) await fetchColumns();
  renderTable(); renderPagination();
}

async function fetchColumns() {
  const r = await api('/columns');
  if (r.success) { state.columns = r.data.builtin.filter(c=>c.is_visible); state.customColumns = r.data.custom; }
}

// ── Render Table ──────────────────────────────
function renderTable() {
  const selectAllChecked = state.books.length > 0 && state.books.every(b => state.selectedIds.has(b.id));
  
  // Kolom Pilihan & Aksi selalu di awal dan sticky
  const selectCol = { field_name:'_select', label:'<input type="checkbox" id="check-all" ' + (selectAllChecked?'checked':'') + '>', bg_color:'#0F172A', text_color:'#FFFFFF', width:40, is_frozen:true };
  const actionCol = { field_name:'_actions', label:'Aksi', bg_color:'#0F172A', text_color:'#FFFFFF', width:80, is_frozen:true };
  
  const allCols = [
    selectCol,
    actionCol,
    ...state.columns,
    ...state.customColumns,
  ];

  // Hitung posisi left untuk setiap frozen kolom
  let frozenLeft = 0;
  const frozenOffsets = {};
  allCols.forEach(col => {
    if (col.is_frozen) { frozenOffsets[col.field_name] = frozenLeft; frozenLeft += (col.width||120); }
  });

  const thead = $('spreadsheet-head');
  thead.innerHTML = '<tr>' + allCols.map(col => {
    const frozen = col.is_frozen;
    const leftPx = frozen ? `left:${frozenOffsets[col.field_name]}px;` : '';
    const style = `background:${col.bg_color||'#374151'};color:${col.text_color||'#fff'};min-width:${col.width||120}px;max-width:${col.width||120}px;${leftPx}`;
    const isSorted = state.sortBy === col.field_name;
    const sc = isSorted ? (state.sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc') : '';
    const arrow = isSorted ? (state.sortDir === 'asc' ? ' 🔼' : ' 🔽') : '';
    const title = col.field_name === '_select' ? 'Pilih Semua' : col.label;
    
    return `<th style="${style}" class="${frozen?'frozen':''} ${sc}" data-field="${col.field_name}" title="${title}">
              ${col.label}${arrow}
            </th>`;
  }).join('') + '</tr>';

  thead.querySelectorAll('th[data-field]').forEach(th => {
    const f = th.dataset.field;
    if (f === '_select') {
      const chk = th.querySelector('#check-all');
      if (chk) chk.addEventListener('click', e => {
        e.stopPropagation();
        state.books.forEach(b => {
          if (chk.checked) state.selectedIds.add(b.id);
          else state.selectedIds.delete(b.id);
        });
        renderTable();
        updateSelectedCounter();
      });
    } else {
      th.addEventListener('click', () => {
        if (f==='_actions'||f==='no') return;
        if (state.sortBy===f) state.sortDir = state.sortDir==='asc'?'desc':'asc';
        else { state.sortBy=f; state.sortDir='asc'; }
        loadBooks();
      });
    }
  });

  const tbody = $('spreadsheet-body');
  if (!state.books.length) {
    tbody.innerHTML = `<tr><td colspan="${allCols.length}" style="text-align:center;padding:40px;color:var(--text2)">📭 Belum ada data buku</td></tr>`;
    return;
  }
  const offset = (state.page-1)*state.limit;
  tbody.innerHTML = state.books.map((book, idx) => {
    return '<tr data-id="'+book.id+'">' + allCols.map(col => {
      const frozen = col.is_frozen;
      const leftPx = frozen ? `left:${frozenOffsets[col.field_name]}px;` : '';
      const ss = frozen ? `position:sticky;${leftPx}background:var(--bg2);z-index:5;box-shadow:2px 0 4px rgba(0,0,0,.2);` : '';

      if (col.field_name === '_select') {
        return `<td class="frozen text-center" style="${ss}">
                  <input type="checkbox" class="row-check" data-id="${book.id}" ${state.selectedIds.has(book.id)?'checked':''}>
                </td>`;
      }
      if (col.field_name==='_actions') {
        return `<td class="cell-actions" style="${ss}">
          <button class="btn-cell btn-edit"   data-id="${book.id}" title="Edit buku">✏️</button>
          <button class="btn-cell btn-delete" data-id="${book.id}" title="Hapus buku">🗑️</button>
        </td>`;
      }
      if (col.field_name==='no') return `<td style="${ss}">${offset+idx+1}</td>`;
      let val = book[col.field_name]??'';
      if (col.field_name === 'nomor_induk') {
        const parts = String(val).split('/');
        parts[0] = parts[0].replace(/^0+/, '') || '0';
        val = parts.join('/');
      }
      if (col.field_name==='tanggal_olah'||col.field_name==='tanggal_entri') val = val?new Date(val).toLocaleDateString('id-ID'):'';
      return `<td data-id="${book.id}" data-field="${col.field_name}" class="editable-cell" style="${ss}" title="${val}">${val}</td>`;
    }).join('')+'</tr>';
  }).join('');

  tbody.querySelectorAll('.editable-cell').forEach(td => td.addEventListener('dblclick', () => startInlineEdit(td)));
  tbody.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', () => openEditModal(btn.dataset.id)));
  tbody.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', () => deleteBook(btn.dataset.id)));
  
  tbody.querySelectorAll('.row-check').forEach(chk => {
    chk.addEventListener('change', () => {
      const id = chk.dataset.id;
      if (chk.checked) state.selectedIds.add(id);
      else state.selectedIds.delete(id);
      
      const allRowsChecked = [...tbody.querySelectorAll('.row-check')].every(c => c.checked);
      const headCheck = $('check-all');
      if (headCheck) headCheck.checked = allRowsChecked;
      
      updateSelectedCounter();
    });
  });
}

function updateSelectedCounter() {
  const count = state.selectedIds.size;
  const el = $('selected-count-label');
  if (el) el.textContent = count > 0 ? `(${count} terpilih)` : '';
  
  const btnHapus = $('btn-hapus-terpilih');
  const btnAi    = $('btn-ai-terpilih');
  const btnBatal = $('btn-batal-pilih');
  
  if (btnHapus) btnHapus.style.display = count > 0 ? 'inline-flex' : 'none';
  if (btnAi)    btnAi.style.display    = count > 0 ? 'inline-flex' : 'none';
  if (btnBatal) btnBatal.style.display = count > 0 ? 'inline-flex' : 'none';
}

function clearSelection() {
  state.selectedIds.clear();
  const headCheck = $('check-all');
  if (headCheck) headCheck.checked = false;
  renderTable();
  updateSelectedCounter();
}


// ── Inline Edit ───────────────────────────────
function startInlineEdit(td) {
  if (state.editingCell) cancelEdit(state.editingCell.td);
  const orig = td.textContent;
  state.editingCell = { td, orig };
  td.classList.add('editing');
  td.innerHTML = `<input value="${orig}" />`;
  const inp = td.querySelector('input');
  inp.focus(); inp.select();
  inp.addEventListener('blur', () => commitEdit(td));
  inp.addEventListener('keydown', e => { if(e.key==='Enter') inp.blur(); if(e.key==='Escape') cancelEdit(td); });
}
function cancelEdit(td) {
  if (!state.editingCell) return;
  td.classList.remove('editing'); td.textContent = state.editingCell.orig; state.editingCell = null;
}
async function commitEdit(td) {
  const inp = td.querySelector('input'); if (!inp) return;
  const val = inp.value;
  const id = td.closest('tr').dataset.id;
  const field = td.dataset.field;
  td.classList.remove('editing'); td.textContent = val; state.editingCell = null;
  const r = await api(`/books/${id}/cell`, { method:'PATCH', body:{field,value:val} });
  if (r.success) toast('Cell diperbarui','success'); else { toast('Gagal: '+r.message,'error'); loadBooks(); }
}

// ── Pagination ────────────────────────────────
function renderPagination() {
  const { total, page, limit, total_pages } = state.meta;
  const start=(page-1)*limit+1; const end=Math.min(page*limit,total);
  $('pagination-info').textContent = `Menampilkan ${start}–${end} dari ${total} buku`;
  const ctrl = $('pagination-controls'); ctrl.innerHTML = '';
  const addBtn = (label, pg, disabled, active) => {
    const b = document.createElement('button');
    b.className = 'page-btn'+(active?' active':''); b.textContent=label; b.disabled=disabled;
    b.addEventListener('click', () => { state.page=pg; loadBooks(); }); ctrl.appendChild(b);
  };
  addBtn('«',1,page===1); addBtn('‹',page-1,page===1);
  for (let p=Math.max(1,page-2);p<=Math.min(total_pages,page+2);p++) addBtn(p,p,false,p===page);
  addBtn('›',page+1,page===total_pages); addBtn('»',total_pages,page===total_pages);
}

// ── Delete & Export ───────────────────────────
async function deleteBook(id) {
  if (!confirm('Hapus buku ini?')) return;
  const r = await api(`/books/${id}`, { method:'DELETE' });
  if (r.success) { toast('Buku dihapus','success'); loadBooks(); } else toast(r.message,'error');
}

async function bulkDeleteBooks() {
  const count = state.selectedIds.size;
  if (count === 0) return;
  if (!confirm(`Hapus ${count} buku yang terpilih? Tindakan ini tidak dapat dibatalkan.`)) return;
  
  const ids = Array.from(state.selectedIds);
  const r = await api('/books/bulk-delete', { method:'POST', body: { ids } });
  
  if (r.success) {
    toast(r.message, 'success');
    state.selectedIds.clear();
    updateSelectedCounter();
    loadBooks();
  } else {
    toast(r.message, 'error');
  }
}

async function bulkAiEnrich() {
  if (!state.selectedIds.size) return;
  const count = state.selectedIds.size;
  if (!confirm(`Lengkapi metadata ${count} buku menggunakan AI?`)) return;

  const btn = $('btn-ai-terpilih');
  const oldText = btn.textContent;
  btn.disabled = true; btn.textContent = '⏳ Memproses...';
  
  try {
    const r = await api('/books/bulk-ai-enrich', {
      method: 'POST',
      body: { ids: Array.from(state.selectedIds) }
    });

    if (r.success) {
      toast(`Selesai! Berhasil melengkapi ${r.data.success} buku.`, 'success');
      state.selectedIds.clear();
      updateSelectedCounter();
      loadBooks();
    } else {
      toast(r.message, 'error');
    }
  } catch (err) {
    toast('Gagal memproses AI secara massal', 'error');
  } finally {
    btn.disabled = false; btn.textContent = oldText;
  }
}

function doExportExcel() { 
  const ids = Array.from(state.selectedIds).join(',');
  window.location = '/api/export/excel' + (ids ? `?ids=${ids}` : ''); 
}
function doExportPDF()   { 
  const ids = Array.from(state.selectedIds).join(',');
  window.location = '/api/export/pdf' + (ids ? `?ids=${ids}` : ''); 
}

// ── AI Assist ────────────────────────────────
async function aiAssistEnrich() {
  const title = $('f-judul').value.trim();
  if (!title) { toast('Isi judul buku terlebih dahulu', 'info'); return; }
  const isbn  = $('f-isbn').value.trim();
  
  const btn = $('btn-ai-assist');
  const originalText = btn.textContent;
  btn.textContent = '⏳...'; btn.disabled = true;

  try {
    let url = `/books/ai-enrich?title=${encodeURIComponent(title)}`;
    if (isbn) url += `&isbn=${encodeURIComponent(isbn)}`;
    
    const r = await api(url);
    if (r.success) {
      const data = r.data;
      // Isi data jika field masih kosong
      if (!$('f-pengarang').value) $('f-pengarang').value = data.pengarang || '';
      if (!$('f-pj').value)        $('f-pj').value        = data.penanggung_jawab || '';
      if (!$('f-penerbit').value)  $('f-penerbit').value  = data.penerbit || '';
      if (!$('f-tahun').value)     $('f-tahun').value     = data.tahun_terbit || '';
      if (!$('f-kota').value)      $('f-kota').value      = data.kota_terbit || '';
      if (!$('f-edisi').value)     $('f-edisi').value     = data.edisi_cetakan || '';
      if (!$('f-isbn').value)      $('f-isbn').value      = data.isbn || '';
      if (!$('f-fisik').value)     $('f-fisik').value     = data.fisik || '';
      if (!$('f-subjek').value)    $('f-subjek').value    = data.subjek || '';
      if (!$('f-klasifikasi').value || $('f-klasifikasi').value === '000') {
        $('f-klasifikasi').value = data.klasifikasi || '';
      }
      if (data.klasifikasi) {
        $('ddc-hint').textContent = `✨ AI menyarankan DDC ${data.klasifikasi}`;
        $('ddc-hint').style.color = 'var(--primary)';
      }

      // Generate cutter & call number otomatis dari data AI
      updateCutterPreview();
      generateCallNumber();
      toast('Data buku berhasil dilengkapi oleh AI', 'success');
    } else {
      toast(r.message || 'AI gagal memberikan saran', 'error');
    }
  } catch (err) {
    toast('Gagal menghubungi AI Assistant', 'error');
  } finally {
    btn.textContent = originalText; btn.disabled = false;
  }
}


/* ─────────────────────────────────────────────── */

// ── Auto Suggest DDC ──────────────────────────
async function suggestDDCFromSubject() {
  const subject = $('f-subjek').value.trim();
  if (!subject) { toast('Isi subjek terlebih dahulu', 'info'); return; }

  const btn = $('btn-suggest-ddc');
  btn.textContent = '⏳'; btn.disabled = true;

  try {
    const r = await api(`/books/suggest-ddc?subject=${encodeURIComponent(subject)}`);
    if (!r.success || !r.data.length) {
      toast('Tidak ada saran DDC untuk subjek tersebut', 'info');
      return;
    }
    renderDDCDropdown(r.data);
  } catch {
    toast('Gagal menghubungi server', 'error');
  } finally {
    btn.textContent = '✨ DDC'; btn.disabled = false;
  }
}

function renderDDCDropdown(results) {
  const dd = $('ddc-dropdown');
  const hint = $('ddc-hint');
  dd.innerHTML = results.map((r, i) => `
    <div class="ddc-item ${i===0?'best-match':''}" data-ddc="${r.ddc}">
      <span class="ddc-badge">${r.ddc}</span>
      <span style="font-size:12px;color:var(--text2)">${i===0?'⭐ Terbaik':''}</span>
      <span class="ddc-score">skor: ${r.score}</span>
    </div>`).join('');
  show(dd);

  dd.querySelectorAll('.ddc-item').forEach(item => {
    item.addEventListener('click', () => {
      const ddc = item.dataset.ddc;
      $('f-klasifikasi').value = ddc;
      hint.textContent = `✅ DDC ${ddc} dipilih`;
      hide(dd);
      // Auto generate call number jika ada pengarang & judul
      if ($('f-pengarang').value || $('f-judul').value) generateCallNumber();
    });
  });

  // Klik di luar tutup dropdown
  setTimeout(() => {
    document.addEventListener('click', function closeDD(e) {
      if (!dd.contains(e.target) && e.target.id !== 'btn-suggest-ddc') {
        hide(dd);
        document.removeEventListener('click', closeDD);
      }
    });
  }, 100);
}


function openAddModal() {
  $('modal-buku-title').textContent = 'Tambah Buku Baru';
  $('form-buku').reset();
  $('f-id').value = '';
  $('f-nomor-induk').value = '';
  $('f-tgl-olah').value = new Date().toISOString().slice(0, 10);
  $('cutter-preview').textContent = '—';
  $('nomor-induk-badge').textContent = '⚡ Auto-generate';
  $('nomor-induk-badge').className = 'badge-auto';
  renderCustomFields({});
  switchTab('metadata');
  show($('modal-buku'));
}

function renderCustomFields(data = {}) {
  const container = $('custom-fields-container');
  if (!container) return;
  if (!state.customColumns || !state.customColumns.length) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = `
    <h4 style="margin: 15px 0 10px; font-size: 13px; color: var(--primary);">Data Tambahan</h4>
    <div class="form-grid">
      ${state.customColumns.map(col => {
        const val = data[col.field_name] || '';
        return `
          <div class="form-group">
            <label>${col.label}</label>
            <input type="text" class="f-custom" data-field="${col.field_name}" value="${val}" placeholder="Masukan ${col.label}..." />
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function openEditModal(id) {
  const r = await api(`/books/${id}`);
  if (!r.success) { toast('Gagal memuat data buku', 'error'); return; }
  const b = r.data;
  $('modal-buku-title').textContent = 'Edit Buku';
  $('f-id').value            = b.id;
  $('f-nomor-induk').value   = b.nomor_induk || '';
  
  const badge = $('nomor-induk-badge');
  if (b.nomor_induk) { badge.textContent = '✏️ Manual'; badge.className = 'badge-manual'; }
  else { badge.textContent = '⚡ Auto-generate'; badge.className = 'badge-auto'; }
  
  $('f-judul').value         = b.judul || '';
  $('f-pengarang').value     = b.pengarang || '';
  $('f-pj').value            = b.penanggung_jawab || '';
  $('f-penerbit').value      = b.penerbit || '';
  $('f-kota').value          = b.kota_terbit || '';
  $('f-tahun').value         = b.tahun_terbit || '';
  $('f-edisi').value         = b.edisi_cetakan || '';
  $('f-isbn').value          = b.isbn || '';
  $('f-fisik').value         = b.fisik || '';
  $('f-sumber').value        = b.sumber_perolehan || '';
  $('f-tgl-olah').value      = b.tanggal_olah ? b.tanggal_olah.slice(0,10) : '';
  $('f-klasifikasi').value   = b.klasifikasi || '';
  $('f-subjek').value        = b.subjek || '';
  $('f-call-number').value   = b.call_number || '';
  $('f-eks').value           = b.jumlah_eksemplar || 1;
  
  renderCustomFields(b.custom_data || {});
  
  updateCutterPreview();
  switchTab('metadata');
  show($('modal-buku'));
}

function closeModalBuku() { hide($('modal-buku')); }

async function submitBuku(e) {
  e.preventDefault();
  const id = $('f-id').value;
  const nomorInduk = $('f-nomor-induk').value.trim();
  const body = {
    nomor_induk:      nomorInduk || undefined,
    judul:            $('f-judul').value.trim(),
    pengarang:        $('f-pengarang').value.trim(),
    penanggung_jawab: $('f-pj').value.trim(),
    penerbit:         $('f-penerbit').value.trim(),
    kota_terbit:      $('f-kota').value.trim(),
    tahun_terbit:     $('f-tahun').value.trim(),
    edisi_cetakan:    $('f-edisi').value.trim(),
    isbn:             $('f-isbn').value.trim(),
    fisik:            $('f-fisik').value.trim(),
    sumber_perolehan: $('f-sumber').value,
    tanggal_olah:     $('f-tgl-olah').value || null,
    klasifikasi:      $('f-klasifikasi').value.trim(),
    subjek:           $('f-subjek').value.trim(),
    call_number:      $('f-call-number').value.trim(),
    jumlah_eksemplar: parseInt($('f-eks').value) || 1,
    custom_data:      {},
  };
  
  // Ambil data custom
  document.querySelectorAll('.f-custom').forEach(inp => {
    body.custom_data[inp.dataset.field] = inp.value.trim();
  });
  const btn = $('btn-save-buku');
  btn.disabled = true; btn.textContent = '⏳ Menyimpan...';
  try {
    const r = id
      ? await api(`/books/${id}`, { method: 'PUT', body })
      : await api('/books', { method: 'POST', body });
    if (r.success) {
      toast(r.message || 'Tersimpan', 'success');
      closeModalBuku();
      if (state.currentPage === 'buku-induk') loadBooks();
      if (state.currentPage === 'dashboard') loadDashboard();
    } else {
      toast(r.message || 'Gagal menyimpan', 'error');
    }
  } finally {
    btn.disabled = false; btn.textContent = '💾 Simpan Buku';
  }
}

// ── Auto Cutter & Call Number ─────────────────
function updateCutterPreview() {
  const name = $('f-pengarang').value;
  if (!name) { $('cutter-preview').textContent = '—'; return; }
  fetch('/api/books/auto-cutter?name=' + encodeURIComponent(name))
    .then(r => r.json())
    .then(r => { if (r.success) $('cutter-preview').textContent = r.cutter; });
}

function generateCallNumber() {
  const klas   = $('f-klasifikasi').value.trim() || '000';
  const author  = $('f-pengarang').value.trim();
  const judul   = $('f-judul').value.trim();
  const cutter  = author ? author.replace(/^(Muhammad|Mohammad|Moh\.|Dr\.|Prof\.|Ir\.|Drs\.)\s+/i,'').substring(0,3).toUpperCase() : 'XXX';
  const judulKd = judul ? judul.charAt(0).toLowerCase() : 'x';
  $('f-call-number').value = `${klas}\n${cutter}\n${judulKd}`;
}

// ── Tab switching ─────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(t => {
    t.classList.toggle('hidden', t.id !== 'tab-' + name);
  });
}

// ── Load Columns ──────────────────────────────
async function loadColumns() {
  const r = await api('/columns');
  if (!r.success) return;
  state.columns       = r.data.builtin;
  state.customColumns = r.data.custom;
  renderColumnList();
}

function renderColumnList() {
  const el = $('column-list');
  const all = [
    ...state.columns.map(c => ({ ...c, isCustom: false })),
    ...state.customColumns.map(c => ({ ...c, isCustom: true }))
  ].sort((a, b) => a.order_no - b.order_no);

  el.innerHTML = all.map(col => `
    <div class="column-item" draggable="true" data-field="${col.field_name}" data-custom="${col.isCustom}">
      <span class="col-handle">⠿</span>
      <div class="col-swatch" style="background:${col.bg_color||'#4A90D9'}" title="Klik ubah warna"
           onclick="changeColColor('${col.field_name}','${col.isCustom}',this)"></div>
      <div class="col-info">
        <div class="col-name">${col.label}</div>
        <div class="col-field">${col.field_name}</div>
      </div>
      <div class="col-controls">
        ${col.is_frozen ? '<span class="col-badge frozen">Freeze</span>' : ''}
        ${col.isCustom  ? '<span class="col-badge custom">Custom</span>' : ''}
        <label class="toggle-switch" title="${col.is_visible ? 'Sembunyikan' : 'Tampilkan'}">
          <input type="checkbox" ${col.is_visible ? 'checked' : ''} onchange="toggleColVisible('${col.field_name}','${col.isCustom}',this.checked)" />
          <span class="toggle-slider"></span>
        </label>
        <button class="btn-icon" onclick="toggleFreeze('${col.field_name}','${col.isCustom}')" title="Toggle Freeze" style="font-size:14px">${col.is_frozen ? '🔓' : '🔒'}</button>
        ${col.isCustom ? `<button class="btn-icon" onclick="deleteCustomCol('${col.field_name}')" title="Hapus" style="font-size:14px;color:var(--danger)">🗑️</button>` : ''}
      </div>
    </div>`).join('');

  // Drag & drop reorder
  el.querySelectorAll('.column-item').forEach(item => {
    item.addEventListener('dragstart', () => { state.dragSrc = item; item.classList.add('dragging'); });
    item.addEventListener('dragend',   () => item.classList.remove('dragging'));
    item.addEventListener('dragover',  e => e.preventDefault());
    item.addEventListener('drop', async () => {
      if (!state.dragSrc || state.dragSrc === item) return;
      el.insertBefore(state.dragSrc, item);
      const orders = [...el.querySelectorAll('.column-item')].map((el, i) => ({
        field_name: el.dataset.field, order_no: i + 1
      }));
      await api('/columns/order', { method: 'PUT', body: { orders } });
      toast('Urutan kolom disimpan', 'success');
    });
  });
}

async function toggleColVisible(field, isCustom, visible) {
  const endpoint = isCustom === 'true' ? `/columns/custom/${field}` : `/columns/${field}`;
  await api(endpoint, { method: isCustom === 'true' ? 'PUT' : 'PUT', body: { is_visible: visible } });
  await loadColumns();
  state.columns = []; // force re-fetch saat buka tabel
}

async function toggleFreeze(field, isCustom) {
  const col = [...state.columns, ...state.customColumns].find(c => c.field_name === field);
  if (!col) return;
  const endpoint = isCustom === 'true' ? `/columns/custom/${field}` : `/columns/${field}`;
  await api(endpoint, { method: 'PUT', body: { is_frozen: !col.is_frozen } });
  toast(!col.is_frozen ? 'Kolom di-freeze' : 'Kolom di-unfreeze', 'success');
  loadColumns(); state.columns = [];
}

function changeColColor(field, isCustom, swatchEl) {
  const inp = document.createElement('input'); inp.type = 'color';
  inp.value = swatchEl.style.background || '#4A90D9';
  inp.addEventListener('change', async () => {
    const endpoint = isCustom === 'true' ? `/columns/custom/${field}` : `/columns/${field}`;
    await api(endpoint, { method: 'PUT', body: { bg_color: inp.value } });
    swatchEl.style.background = inp.value;
    toast('Warna kolom diperbarui', 'success');
    state.columns = [];
  });
  inp.click();
}

async function deleteCustomCol(field) {
  if (!confirm(`Hapus kolom "${field}"?`)) return;
  const r = await api(`/columns/custom/${field}`, { method: 'DELETE' });
  if (r.success) { toast('Kolom dihapus', 'success'); loadColumns(); }
}

async function submitKolom(e) {
  e.preventDefault();
  const body = {
    field_name: $('kol-field').value.trim(),
    label:      $('kol-label').value.trim(),
    data_type:  $('kol-type').value,
    width:      parseInt($('kol-width').value),
    bg_color:   $('kol-bg').value,
    text_color: $('kol-fg').value,
  };
  const r = await api('/columns/custom', { method: 'POST', body });
  if (r.success) {
    toast('Kolom custom ditambahkan', 'success');
    hide($('modal-kolom'));
    loadColumns();
  } else toast(r.message, 'error');
}

// ── Templates ─────────────────────────────────
async function loadTemplates() {
  const r = await api('/templates');
  if (!r.success) return;
  state.templates = r.data;
  const icons = ['📚','📖','📗','📘','📙'];
  $('template-list').innerHTML = r.data.map((t, i) => `
    <div class="template-card">
      <div class="template-icon">${icons[i % icons.length]}</div>
      <div class="template-name">${t.nama}</div>
      <div class="template-desc">${t.deskripsi || '—'}</div>
      <div class="template-actions">
        <button class="btn btn-outline" style="font-size:12px" onclick="applyTemplate('${t.id}')">Terapkan</button>
        <button class="btn btn-danger"  style="font-size:12px" onclick="deleteTemplate('${t.id}')">Hapus</button>
      </div>
    </div>`).join('');
}

async function applyTemplate(id) {
  const t = state.templates.find(x => x.id == id);
  if (!t) return;
  
  const prefix = t.config?.prefix;
  if (prefix) {
    await api('/settings', { method: 'PUT', body: { nomor_induk_unit: prefix } });
    toast(`Template "${t.nama}" diterapkan. Kode unit diubah menjadi: ${prefix}`, 'success');
    if (state.currentPage === 'pengaturan') loadSettings();
    updateFormatPreview(); // Refresh preview in settings if visible
  } else {
    toast('Template tidak memiliki konfigurasi prefix', 'info');
  }
}

async function deleteTemplate(id) {
  if (!confirm('Hapus template ini?')) return;
  const r = await api(`/templates/${id}`, { method: 'DELETE' });
  if (r.success) { toast('Template dihapus', 'success'); loadTemplates(); }
}

async function submitTemplate(e) {
  e.preventDefault();
  const body = {
    nama: $('tpl-nama').value.trim(),
    deskripsi: $('tpl-desc').value.trim(),
    config: { prefix: $('tpl-prefix').value.trim() }
  };
  const r = await api('/templates', { method: 'POST', body });
  if (r.success) { toast('Template ditambahkan', 'success'); hide($('modal-template')); loadTemplates(); }
  else toast(r.message, 'error');
}

// ── Settings ──────────────────────────────────
async function loadSettings() {
  const r = await api('/settings');
  if (!r.success) return;
  const d = r.data;
  $('s-format').value      = d.nomor_induk_format || '{NO}/{UNIT}/{BULAN_ROMAWI}/{TAHUN}';
  $('s-unit').value        = d.nomor_induk_unit   || 'UPT-Lib-BP';
  $('s-padding').value     = d.nomor_induk_padding || '5';
  $('s-counter').value      = d.nomor_induk_counter || '0';
  $('s-appname').value     = d.app_name || '';
  $('s-institution').value = d.app_institution || '';
  updateFormatPreview();
}

async function updateFormatPreview() {
  const fmt     = $('s-format').value;
  const unit    = $('s-unit').value;
  const padding = $('s-padding').value;
  const counter = $('s-counter').value;
  const el = $('format-preview');
  if (!el) return;

  const r = await api(`/nomor-preview?format=${encodeURIComponent(fmt)}&unit=${encodeURIComponent(unit)}&padding=${padding}&counter=${counter}`);
  if (r.success) el.textContent = r.preview;
}

async function submitSettings(e) {
  e.preventDefault();
  const body = {
    nomor_induk_format:  $('s-format').value,
    nomor_induk_unit:    $('s-unit').value,
    nomor_induk_padding: $('s-padding').value,
    app_name:            $('s-appname').value,
    app_institution:     $('s-institution').value,
  };
  const r = await api('/settings', { method: 'PUT', body });
  if (r.success) { toast('Pengaturan disimpan', 'success'); updateFormatPreview(); }
  else toast(r.message, 'error');
}

// Insert variabel ke input format
function insertVar(v) {
  const inp = $('s-format');
  const pos = inp.selectionStart;
  const val = inp.value;
  inp.value = val.slice(0,pos) + v + val.slice(inp.selectionEnd);
  inp.setSelectionRange(pos+v.length, pos+v.length);
  inp.focus();
  updateFormatPreview();
}

// ── User Management ───────────────────────────
async function loadUsers() {
  const tbody = $('user-table-body');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px">Memuat data...</td></tr>';
  
  const r = await api('/users');
  if (!r.success) { toast('Gagal memuat user', 'error'); return; }
  
  if (r.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px">Belum ada user</td></tr>';
    return;
  }
  
  tbody.innerHTML = r.data.map((u, i) => `
    <tr>
      <td class="text-center">${i + 1}</td>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${new Date(u.createdAt).toLocaleString('id-ID')}</td>
      <td class="text-center">
        <button class="btn-cell btn-edit" onclick="openEditUserModal('${u.id}')" title="Edit user">✏️</button>
        <button class="btn-cell btn-delete" onclick="deleteUser('${u.id}')" title="Hapus user">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function openAddUserModal() {
  $('modal-user-title').textContent = 'Tambah User Baru';
  $('form-user').reset();
  $('usr-id').value = '';
  $('usr-password').required = true;
  show($('modal-user'));
}

async function openEditUserModal(id) {
  const r = await api(`/users/${id}`);
  if (!r.success) { toast('Gagal memuat data user', 'error'); return; }
  const u = r.data;
  
  $('modal-user-title').textContent = 'Edit User';
  $('usr-id').value = u.id;
  $('usr-name').value = u.name;
  $('usr-email').value = u.email;
  $('usr-password').value = '';
  $('usr-password').required = false; // password optional saat edit
  show($('modal-user'));
}

async function submitUser(e) {
  e.preventDefault();
  const id = $('usr-id').value;
  const body = {
    name:     $('usr-name').value.trim(),
    email:    $('usr-email').value.trim(),
    password: $('usr-password').value.trim() || undefined,
  };
  
  const btn = $('btn-save-user');
  btn.disabled = true; btn.textContent = '⏳ Menyimpan...';
  
  try {
    const r = id 
      ? await api(`/users/${id}`, { method: 'PUT', body })
      : await api('/users', { method: 'POST', body });
      
    if (r.success) {
      toast(id ? 'User diperbarui' : 'User berhasil ditambahkan', 'success');
      hide($('modal-user'));
      loadUsers();
    } else {
      toast(r.message || 'Gagal menyimpan user', 'error');
    }
  } finally {
    btn.disabled = false; btn.textContent = '✅ Simpan User';
  }
}

async function deleteUser(id) {
  if (!confirm('Hapus user ini?')) return;
  const r = await api(`/users/${id}`, { method: 'DELETE' });
  if (r.success) {
    toast('User dihapus', 'success');
    loadUsers();
  } else {
    toast(r.message, 'error');
  }
}

// ── Event Bindings ────────────────────────────
function bindEvents() {
  // Sidebar toggle
  $('btn-toggle-sidebar').addEventListener('click', () =>
    $('sidebar').classList.toggle('collapsed'));

  // Nav
  document.querySelectorAll('.nav-item').forEach(n =>
    n.addEventListener('click', e => { e.preventDefault(); navigateTo(n.dataset.page); }));

  // Refresh
  $('btn-refresh').addEventListener('click', () => {
    if (state.currentPage === 'buku-induk') loadBooks();
    else if (state.currentPage === 'dashboard') loadDashboard();
  });

  // User CRUD
  $('btn-tambah-user')?.addEventListener('click', openAddUserModal);
  $('modal-user-close')?.addEventListener('click', () => hide($('modal-user')));
  $('modal-user-cancel')?.addEventListener('click', () => hide($('modal-user')));
  $('form-user')?.addEventListener('submit', submitUser);
  $('modal-user')?.addEventListener('click', e => { if (e.target === $('modal-user')) hide($('modal-user')); });

  // Buku CRUD
  $('btn-tambah-buku').addEventListener('click', openAddModal);
  $('modal-buku-close').addEventListener('click', closeModalBuku);
  $('modal-buku-cancel').addEventListener('click', closeModalBuku);
  $('form-buku').addEventListener('submit', submitBuku);
  $('modal-buku').addEventListener('click', e => { if (e.target === $('modal-buku')) closeModalBuku(); });

  // Pengarang → cutter
  $('f-pengarang').addEventListener('input', updateCutterPreview);
  $('btn-cutter').addEventListener('click', updateCutterPreview);
  $('btn-gen-call').addEventListener('click', generateCallNumber);
  $('btn-suggest-ddc').addEventListener('click', suggestDDCFromSubject);
  $('btn-ai-assist').addEventListener('click', aiAssistEnrich);

  // Badge nomor induk: kuning=auto, biru=manual
  $('f-nomor-induk').addEventListener('input', e => {
    const badge = $('nomor-induk-badge');
    if (e.target.value.trim()) {
      badge.textContent = '✏️ Manual'; badge.className = 'badge-manual';
    } else {
      badge.textContent = '⚡ Auto-generate'; badge.className = 'badge-auto';
    }
  });

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  // Search
  let searchTimer;
  $('input-search').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.search = e.target.value; state.page = 1; loadBooks(); }, 400);
  });


  // Limit
  $('select-limit').addEventListener('change', e => { state.limit = parseInt(e.target.value); state.page = 1; loadBooks(); });

  // Import Excel (2-Step)
  $('btn-import-excel').addEventListener('click', () => $('input-import-file').click());
  $('input-import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    state.currentImportFile = file;
    
    const formData = new FormData();
    formData.append('file', file);
    
    toast('Menganalisis file...', 'info');
    try {
      const res = await fetch('/api/import/analyze', { method: 'POST', body: formData });
      const r = await res.json();
      if (r.success) {
        showImportPreview(r.data);
      } else {
        toast(r.message, 'error');
      }
    } catch (err) {
      toast('Gagal menganalisis file', 'error');
    } finally {
      e.target.value = '';
    }
  });

  function showImportPreview(data) {
    $('import-filename').textContent = data.fileName;
    $('import-rows').textContent = data.totalRows;
    
    // Render Mappings
    const mappingList = $('import-mapping-list');
    mappingList.innerHTML = data.mappings.map(m => `
      <div class="mapping-item">
        <span class="m-header">${m.header}</span>
        <span class="m-arrow">➔</span>
        <span class="m-target">${m.target}</span>
      </div>
    `).join('');
    
    // Render Samples
    const head = $('import-sample-head');
    const body = $('import-sample-body');
    const cols = data.mappings.map(m => m.target);
    
    head.innerHTML = '<tr>' + data.mappings.map(m => `<th>${m.target}</th>`).join('') + '</tr>';
    body.innerHTML = data.samples.map(row => {
      return '<tr>' + cols.map(c => `<td>${row[c] || ''}</td>`).join('') + '</tr>';
    }).join('');
    
    show($('modal-import-preview'));
  }

  $('modal-import-preview-close').addEventListener('click', () => hide($('modal-import-preview')));
  $('modal-import-preview-cancel').addEventListener('click', () => hide($('modal-import-preview')));
  
  $('btn-confirm-import').addEventListener('click', async () => {
    if (!state.currentImportFile) return;
    
    const btn = $('btn-confirm-import');
    btn.disabled = true; btn.textContent = '⏳ Mengimpor...';
    
    const formData = new FormData();
    formData.append('file', state.currentImportFile);
    
    try {
      const res = await fetch('/api/import/excel', { method: 'POST', body: formData });
      const r = await res.json();
      if (r.success) {
        toast(r.message, 'success');
        hide($('modal-import-preview'));
        loadBooks(); loadDashboard();
      } else {
        toast(r.message, 'error');
      }
    } catch (err) {
      toast('Gagal mengimpor data', 'error');
    } finally {
      btn.disabled = false; btn.textContent = '🚀 Mulai Import Sekarang';
      state.currentImportFile = null;
    }
  });

  // Export & Print
  $('btn-hapus-terpilih').addEventListener('click', bulkDeleteBooks);
  $('btn-ai-terpilih').addEventListener('click', bulkAiEnrich);
  $('btn-batal-pilih').addEventListener('click', clearSelection);
  $('btn-export-excel').addEventListener('click', doExportExcel);
  $('btn-export-pdf').addEventListener('click', doExportPDF);
  $('btn-cetak-kartu').addEventListener('click', () => show($('modal-cetak-kartu')));
  $('modal-cetak-kartu-close').addEventListener('click', () => hide($('modal-cetak-kartu')));
  $('modal-cetak-kartu-cancel').addEventListener('click', () => hide($('modal-cetak-kartu')));
  $('btn-do-cetak-kartu').addEventListener('click', () => {
    const paper = $('sel-paper-size').value;
    const ids = Array.from(state.selectedIds).join(',');
    
    let url = `/api/print/book-cards?paper=${paper}`;
    if (ids) url += `&ids=${ids}`;
    
    window.open(url, '_blank');
    hide($('modal-cetak-kartu'));
  });

  // Label modal
  $('btn-cetak-label').addEventListener('click', () => {
    if (state.selectedIds.size === 0) { toast('Pilih buku yang ingin dicetak labelnya', 'info'); return; }
    show($('modal-cetak-label'));
  });
  $('modal-cetak-label-close').addEventListener('click', () => hide($('modal-cetak-label')));
  $('modal-cetak-label-cancel').addEventListener('click', () => hide($('modal-cetak-label')));
  $('btn-do-cetak-label').addEventListener('click', () => {
    const paper = $('sel-label-paper-size').value;
    const codeType = $('sel-label-code-type').value;
    const ids = Array.from(state.selectedIds).join(',');
    window.open(`/api/print/book-labels?paper=${paper}&code_type=${codeType}&ids=${ids}`, '_blank');
    hide($('modal-cetak-label'));
  });

  // Spine labels (Nomor Punggung)
  $('btn-cetak-punggung').addEventListener('click', () => {
    if (state.selectedIds.size === 0) { toast('Pilih buku yang ingin dicetak nomor punggungnya', 'info'); return; }
    show($('modal-cetak-punggung'));
  });
  $('modal-cetak-punggung-close').addEventListener('click', () => hide($('modal-cetak-punggung')));
  $('modal-cetak-punggung-cancel').addEventListener('click', () => hide($('modal-cetak-punggung')));
  $('btn-do-cetak-punggung').addEventListener('click', () => {
    const paper = $('sel-spine-paper-size').value;
    const ids = Array.from(state.selectedIds).join(',');
    window.open(`/api/print/book-spines?paper=${paper}&ids=${ids}`, '_blank');
    hide($('modal-cetak-punggung'));
  });


  // Kolom modal
  $('btn-tambah-kolom-custom').addEventListener('click', () => { $('form-kolom').reset(); show($('modal-kolom')); });
  $('modal-kolom-close').addEventListener('click',  () => hide($('modal-kolom')));
  $('modal-kolom-cancel').addEventListener('click', () => hide($('modal-kolom')));
  $('form-kolom').addEventListener('submit', submitKolom);

  // Template modal
  $('btn-tambah-template').addEventListener('click', () => { $('form-template').reset(); show($('modal-template')); });
  $('modal-template-close').addEventListener('click',  () => hide($('modal-template')));
  $('modal-template-cancel').addEventListener('click', () => hide($('modal-template')));
  $('form-template').addEventListener('submit', submitTemplate);

  // Settings
  $('form-settings').addEventListener('submit', submitSettings);
  ['s-format','s-unit','s-padding','s-counter'].forEach(id => {
    const el = $(id); if (el) el.addEventListener('input', updateFormatPreview);
  });
  $('btn-sync-counter')?.addEventListener('click', async () => {
    const btn = $('btn-sync-counter');
    const oldHtml = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '⏳...';
    try {
      const r = await api('/settings/sync-counter', { method: 'POST' });
      if (r.success) {
        toast(r.message, 'success');
        loadSettings(); // Reload semua settings untuk update input counter
      } else toast(r.message, 'error');
    } finally {
      btn.disabled = false; btn.innerHTML = oldHtml;
    }
  });
  $('btn-backup-db').addEventListener('click', () => {
    toast('Memulai download backup database...', 'info');
    window.location = '/api/backup';
  });
  $('btn-reset-counter').addEventListener('click', async () => {
    if (!confirm('Reset counter nomor induk ke 0?')) return;
    await api('/settings', { method: 'PUT', body: { nomor_induk_counter: '0' } });
    toast('Counter direset ke 0', 'success');
    updateFormatPreview();
  });

  // Keyboard shortcut Escape tutup modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      hide($('modal-buku'));
      hide($('modal-kolom'));
      hide($('modal-template'));
      hide($('modal-cetak-kartu'));
      hide($('modal-cetak-label'));
    }
  });
}

// ── Init ──────────────────────────────────────
function init() {
  startClock();
  bindEvents();
  navigateTo('dashboard');
}

document.addEventListener('DOMContentLoaded', init);
