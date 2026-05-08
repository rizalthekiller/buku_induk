/**
 * DDC Mapper - Dewey Decimal Classification
 * Keyword → DDC Number (berbasis DDC 23)
 * Mencakup subjek umum perpustakaan Indonesia:
 * Islam, Hukum, Ekonomi, Pendidikan, Teknologi, dll.
 */

const DDC_MAP = [
  // ─── 000 Ilmu Komputer & Informasi ─────────────────
  { ddc:'000',    keywords:['ilmu komputer','komputer','informatika','computer science','information'] },
  { ddc:'001.6',  keywords:['data','database','basis data','big data','data mining'] },
  { ddc:'004',    keywords:['pemrograman','programming','software','perangkat lunak','algoritma','algorithm'] },
  { ddc:'004.6',  keywords:['jaringan komputer','network','networking','internet','komunikasi data'] },
  { ddc:'005.1',  keywords:['pemrograman','programming','koding','coding','javascript','python','java','php','node','react'] },
  { ddc:'005.13', keywords:['bahasa pemrograman','programming language'] },
  { ddc:'005.3',  keywords:['sistem informasi','information system','manajemen informasi'] },
  { ddc:'005.4',  keywords:['sistem operasi','operating system','linux','windows','unix'] },
  { ddc:'005.5',  keywords:['microsoft','office','spreadsheet','word processing'] },
  { ddc:'005.7',  keywords:['database','mysql','postgresql','oracle','nosql','mongodb'] },
  { ddc:'006.3',  keywords:['kecerdasan buatan','artificial intelligence','machine learning','deep learning','neural network'] },
  { ddc:'006.7',  keywords:['multimedia','animasi','animation','game','web design'] },
  { ddc:'020',    keywords:['ilmu perpustakaan','library science','kepustakawanan','bibliografi'] },
  { ddc:'025',    keywords:['katalogisasi','cataloging','klasifikasi','pengolahan bahan pustaka','OPAC'] },

  // ─── 100 Filsafat & Psikologi ──────────────────────
  { ddc:'100',    keywords:['filsafat','philosophy','metafisika'] },
  { ddc:'121',    keywords:['epistemologi','teori pengetahuan','knowledge'] },
  { ddc:'150',    keywords:['psikologi','psychology','kejiwaan'] },
  { ddc:'152',    keywords:['emosi','perasaan','motivasi','emotion','feeling'] },
  { ddc:'153',    keywords:['kognitif','kognisi','belajar','learning','memory','ingatan'] },
  { ddc:'155',    keywords:['kepribadian','personality','psikologi sosial','developmental'] },
  { ddc:'158',    keywords:['psikologi terapan','konseling','counseling','bimbingan'] },
  { ddc:'170',    keywords:['etika','ethics','moral','akhlak'] },

  // ─── 200 Agama ─────────────────────────────────────
  { ddc:'200',    keywords:['agama','religion'] },
  { ddc:'210',    keywords:['teologi','theology','ketuhanan'] },
  { ddc:'220',    keywords:['alkitab','bible','injil','kristen'] },
  { ddc:'230',    keywords:['teologi kristen','kristologi'] },
  { ddc:'240',    keywords:['moralitas kristen'] },
  { ddc:'260',    keywords:['gereja','church'] },
  { ddc:'270',    keywords:['sejarah gereja'] },
  { ddc:'280',    keywords:['denominasi kristen','protestan','katolik'] },
  { ddc:'290',    keywords:['agama lain','hinduisme','budha','buddha','sikhisme'] },
  { ddc:'297',    keywords:['islam','muslim','agama islam','keislaman'] },
  { ddc:'297.1',  keywords:['al-quran','quran','alquran','tafsir','ulumul quran'] },
  { ddc:'297.12', keywords:['tafsir quran','tafsir al-quran','ilmu tafsir'] },
  { ddc:'297.124',keywords:['hadis','hadits','sunnah','ilmu hadis','ulumul hadis'] },
  { ddc:'297.2',  keywords:['aqidah','akidah','teologi islam','ilmu kalam','tauhid'] },
  { ddc:'297.3',  keywords:['ibadah','shalat','zakat','puasa','haji','fikih ibadah'] },
  { ddc:'297.4',  keywords:['tasawuf','sufisme','mistisisme islam','spiritualitas islam'] },
  { ddc:'297.5',  keywords:['akhlak islam','adab','moral islam','etika islam'] },
  { ddc:'297.6',  keywords:['pemikiran islam','filsafat islam','kalam'] },
  { ddc:'297.7',  keywords:['dakwah','penyiaran islam','tabligh'] },
  { ddc:'297.8',  keywords:['sekte islam','aliran islam','syiah','sunni','wahabi'] },
  { ddc:'297.9',  keywords:['sejarah islam','peradaban islam','tarikh','sirah'] },

  // ─── 300 Ilmu Sosial ───────────────────────────────
  { ddc:'300',    keywords:['ilmu sosial','social science','sosiologi','sociology'] },
  { ddc:'302',    keywords:['komunikasi','communication','media','sosial media'] },
  { ddc:'303',    keywords:['perubahan sosial','social change','modernisasi'] },
  { ddc:'305',    keywords:['kelompok sosial','gender','wanita','feminisme','anak'] },
  { ddc:'306',    keywords:['budaya','culture','kebudayaan','adat','tradisi','antropologi'] },
  { ddc:'320',    keywords:['ilmu politik','political science','pemerintahan','government'] },
  { ddc:'321',    keywords:['sistem pemerintahan','demokrasi','monarchy'] },
  { ddc:'323',    keywords:['hak asasi manusia','HAM','civil rights','kewarganegaraan'] },
  { ddc:'324',    keywords:['pemilu','election','partai politik','political party'] },
  { ddc:'327',    keywords:['hubungan internasional','international relations','diplomasi','geopolitik'] },
  { ddc:'330',    keywords:['ekonomi','economics','ilmu ekonomi'] },
  { ddc:'331',    keywords:['ketenagakerjaan','labor','tenaga kerja','buruh','upah'] },
  { ddc:'332',    keywords:['keuangan','finance','bank','perbankan','investasi','modal'] },
  { ddc:'332.1',  keywords:['bank','perbankan','banking','bank syariah','bank islam'] },
  { ddc:'332.6',  keywords:['investasi','saham','obligasi','pasar modal'] },
  { ddc:'333',    keywords:['ekonomi sumber daya','land economics','lingkungan hidup'] },
  { ddc:'334',    keywords:['koperasi','cooperative'] },
  { ddc:'335',    keywords:['sosialisme','kapitalisme','ideologi ekonomi'] },
  { ddc:'336',    keywords:['keuangan publik','pajak','tax','anggaran negara','APBN'] },
  { ddc:'337',    keywords:['perdagangan internasional','international trade','ekspor impor'] },
  { ddc:'338',    keywords:['produksi','production','industri','industry','UMKM'] },
  { ddc:'340',    keywords:['hukum','law','ilmu hukum'] },
  { ddc:'341',    keywords:['hukum internasional','international law','perjanjian internasional'] },
  { ddc:'342',    keywords:['hukum konstitusi','hukum tata negara','constitutional law','UUD'] },
  { ddc:'343',    keywords:['hukum militer','hukum pajak','hukum administrasi negara'] },
  { ddc:'344',    keywords:['hukum sosial','hukum ketenagakerjaan','hukum lingkungan'] },
  { ddc:'345',    keywords:['hukum pidana','criminal law','hukum kriminal','tindak pidana'] },
  { ddc:'346',    keywords:['hukum perdata','civil law','hukum privat','perdata'] },
  { ddc:'346.07', keywords:['hukum bisnis','hukum dagang','hukum perusahaan','corporate law'] },
  { ddc:'347',    keywords:['hukum acara perdata','civil procedure','pengadilan'] },
  { ddc:'348',    keywords:['perundang-undangan','legislation','undang-undang','regulasi'] },
  { ddc:'349',    keywords:['hukum lokal','hukum daerah','adat law','hukum adat'] },
  { ddc:'350',    keywords:['administrasi publik','public administration','pemerintah','birokrasi'] },
  { ddc:'352',    keywords:['pemerintah lokal','otonomi daerah','pemerintah daerah'] },
  { ddc:'355',    keywords:['militer','military','pertahanan','defense','angkatan'] },
  { ddc:'360',    keywords:['masalah sosial','social problems','kemiskinan','poverty','kesejahteraan'] },
  { ddc:'362',    keywords:['kesehatan masyarakat','public health','kesehatan','pelayanan kesehatan'] },
  { ddc:'363',    keywords:['keselamatan','safety','lingkungan','environment','polusi'] },
  { ddc:'370',    keywords:['pendidikan','education','pembelajaran','teaching','sekolah','school'] },
  { ddc:'371',    keywords:['manajemen sekolah','school management','kurikulum','guru','teacher'] },
  { ddc:'372',    keywords:['pendidikan dasar','primary education','sekolah dasar','SD'] },
  { ddc:'373',    keywords:['pendidikan menengah','secondary education','SMP','SMA'] },
  { ddc:'374',    keywords:['pendidikan orang dewasa','adult education','non formal'] },
  { ddc:'376',    keywords:['pendidikan wanita','pendidikan perempuan'] },
  { ddc:'377',    keywords:['pendidikan agama','religious education','pendidikan islam'] },
  { ddc:'378',    keywords:['pendidikan tinggi','higher education','universitas','university','perguruan tinggi'] },
  { ddc:'380',    keywords:['perdagangan','commerce','trade','bisnis','business'] },
  { ddc:'381',    keywords:['perdagangan domestik','retail','wholesale','pasar'] },
  { ddc:'382',    keywords:['ekspor','impor','bea cukai','customs'] },
  { ddc:'384',    keywords:['komunikasi','telekomunikasi','telepon','telegraph'] },
  { ddc:'385',    keywords:['kereta api','railway','transportasi rel'] },
  { ddc:'387',    keywords:['transportasi laut','shipping','pelayaran','kapal'] },
  { ddc:'388',    keywords:['transportasi darat','jalan raya','highway','road'] },
  { ddc:'390',    keywords:['adat istiadat','customs','tradisi','folklore','budaya lokal'] },

  // ─── 400 Bahasa ────────────────────────────────────
  { ddc:'400',    keywords:['bahasa','language','linguistik','linguistics'] },
  { ddc:'410',    keywords:['linguistik','linguistics','fonologi','morfologi','sintaksis'] },
  { ddc:'420',    keywords:['bahasa inggris','english language'] },
  { ddc:'421',    keywords:['grammar inggris','english grammar','tata bahasa inggris'] },
  { ddc:'428',    keywords:['pembelajaran bahasa inggris','english learning','TOEFL','IELTS'] },
  { ddc:'430',    keywords:['bahasa jerman','german'] },
  { ddc:'440',    keywords:['bahasa perancis','french'] },
  { ddc:'460',    keywords:['bahasa spanyol','spanish'] },
  { ddc:'491.46', keywords:['bahasa arab','arabic','bahasa arab','pembelajaran bahasa arab'] },
  { ddc:'499.221',keywords:['bahasa indonesia','indonesian language','tata bahasa indonesia'] },
  { ddc:'499.222',keywords:['bahasa jawa','bahasa sunda','bahasa daerah','bahasa melayu'] },

  // ─── 500 Sains ─────────────────────────────────────
  { ddc:'500',    keywords:['ilmu alam','natural science','sains','science'] },
  { ddc:'510',    keywords:['matematika','mathematics','math','kalkulus','aljabar','statistika'] },
  { ddc:'511',    keywords:['logika matematika','mathematical logic','kombinatorik'] },
  { ddc:'512',    keywords:['aljabar','algebra','matriks','matrix'] },
  { ddc:'515',    keywords:['kalkulus','calculus','analisis matematika'] },
  { ddc:'519',    keywords:['statistik','statistics','probabilitas','probability','analisis data'] },
  { ddc:'520',    keywords:['astronomi','astronomy','bintang','planet','tata surya'] },
  { ddc:'530',    keywords:['fisika','physics','mekanika','termodinamika','optik'] },
  { ddc:'540',    keywords:['kimia','chemistry','reaksi kimia','senyawa','molekul'] },
  { ddc:'550',    keywords:['ilmu bumi','earth science','geologi','geography','gempa'] },
  { ddc:'560',    keywords:['paleontologi','fosil','dinosaurus'] },
  { ddc:'570',    keywords:['biologi','biology','makhluk hidup','sel','genetika'] },
  { ddc:'576',    keywords:['genetika','genetics','DNA','RNA','evolusi','biologi molekuler'] },
  { ddc:'580',    keywords:['botani','botany','tanaman','tumbuhan','flora'] },
  { ddc:'590',    keywords:['zoologi','zoology','hewan','fauna','binatang'] },

  // ─── 600 Teknologi ─────────────────────────────────
  { ddc:'600',    keywords:['teknologi','technology'] },
  { ddc:'610',    keywords:['kedokteran','medicine','medis','kesehatan','medical','dokter'] },
  { ddc:'611',    keywords:['anatomi','anatomy','fisiologi','physiology'] },
  { ddc:'612',    keywords:['fisiologi manusia','human physiology','nutrisi','gizi'] },
  { ddc:'613',    keywords:['kesehatan personal','personal health','gizi','nutrition','higiene'] },
  { ddc:'614',    keywords:['epidemiologi','epidemic','wabah','covid','pandemi'] },
  { ddc:'615',    keywords:['farmasi','pharmacy','obat','medicine','farmakologi','drug'] },
  { ddc:'616',    keywords:['penyakit','disease','patologi','diagnosis'] },
  { ddc:'617',    keywords:['bedah','surgery','orthopedi','gigi','dentistry'] },
  { ddc:'618',    keywords:['kebidanan','midwifery','obstetri','ginekologi','pediatri','anak'] },
  { ddc:'619',    keywords:['kedokteran hewan','veterinary','peternakan'] },
  { ddc:'620',    keywords:['teknik','engineering','rekayasa'] },
  { ddc:'621',    keywords:['teknik mesin','mechanical engineering','mesin','mekanik'] },
  { ddc:'621.3',  keywords:['teknik elektro','electrical engineering','elektronik','electronic'] },
  { ddc:'621.39', keywords:['teknik komputer','computer engineering','hardware'] },
  { ddc:'622',    keywords:['pertambangan','mining','tambang','minerologi'] },
  { ddc:'624',    keywords:['teknik sipil','civil engineering','konstruksi','bangunan'] },
  { ddc:'625',    keywords:['teknik jalan','transportation engineering','jembatan'] },
  { ddc:'627',    keywords:['teknik hidraulik','irigasi','bendungan','water'] },
  { ddc:'628',    keywords:['teknik sanitasi','air bersih','pengolahan limbah','waste'] },
  { ddc:'629',    keywords:['teknik otomotif','automotive','pesawat','aerospace','robot','robotik'] },
  { ddc:'630',    keywords:['pertanian','agriculture','agrikultur','agronomi','tanaman pangan'] },
  { ddc:'631',    keywords:['ilmu tanah','soil science','pupuk','fertilizer','irigasi'] },
  { ddc:'632',    keywords:['hama','pest','penyakit tanaman','pestisida'] },
  { ddc:'633',    keywords:['tanaman pangan','food crops','padi','jagung','gandum'] },
  { ddc:'634',    keywords:['hortikultura','buah','sayuran','perkebunan'] },
  { ddc:'635',    keywords:['tanaman hias','garden','taman','landscape'] },
  { ddc:'636',    keywords:['peternakan','livestock','sapi','ayam','kambing','ternak'] },
  { ddc:'637',    keywords:['perikanan','fishery','ikan','akuakultur','budidaya ikan'] },
  { ddc:'638',    keywords:['lebah','honey','serangga bermanfaat'] },
  { ddc:'640',    keywords:['kesejahteraan rumah tangga','home economics','memasak','cooking'] },
  { ddc:'641',    keywords:['makanan','food','kuliner','resep','masakan','gizi'] },
  { ddc:'643',    keywords:['rumah','home','perumahan','interior'] },
  { ddc:'650',    keywords:['manajemen','management','bisnis','business administration'] },
  { ddc:'651',    keywords:['administrasi kantor','office management','sekretaris'] },
  { ddc:'657',    keywords:['akuntansi','accounting','pembukuan','auditing','keuangan perusahaan'] },
  { ddc:'658',    keywords:['manajemen perusahaan','corporate management','strategi bisnis','pemasaran','marketing','SDM','HRM'] },
  { ddc:'658.3',  keywords:['manajemen SDM','human resource management','HRM','MSDM','kepegawaian'] },
  { ddc:'658.4',  keywords:['manajemen strategis','strategic management','kepemimpinan','leadership'] },
  { ddc:'658.5',  keywords:['manajemen produksi','production management','operasi','supply chain'] },
  { ddc:'658.8',  keywords:['pemasaran','marketing','penjualan','sales','iklan','advertising'] },
  { ddc:'660',    keywords:['teknik kimia','chemical engineering','proses kimia'] },
  { ddc:'664',    keywords:['teknologi pangan','food technology','pengolahan makanan'] },
  { ddc:'670',    keywords:['manufaktur','manufacturing','produksi','pabrik'] },
  { ddc:'680',    keywords:['kerajinan','handicraft','kerajinan tangan'] },
  { ddc:'690',    keywords:['konstruksi','construction','bangunan','gedung','arsitektur'] },

  // ─── 700 Seni & Rekreasi ───────────────────────────
  { ddc:'700',    keywords:['seni','art','kesenian'] },
  { ddc:'710',    keywords:['perencanaan wilayah','urban planning','tata kota','landscape architecture'] },
  { ddc:'720',    keywords:['arsitektur','architecture','desain bangunan'] },
  { ddc:'730',    keywords:['patung','sculpture','keramik'] },
  { ddc:'740',    keywords:['desain grafis','graphic design','ilustrasi','drawing','menggambar'] },
  { ddc:'741',    keywords:['komik','manga','kartun','animasi 2D'] },
  { ddc:'745',    keywords:['desain','design','kerajinan seni'] },
  { ddc:'750',    keywords:['lukisan','painting','seni lukis'] },
  { ddc:'770',    keywords:['fotografi','photography','foto'] },
  { ddc:'780',    keywords:['musik','music','nyanyian','lagu','instrumen'] },
  { ddc:'790',    keywords:['rekreasi','recreation','olahraga','sport','permainan','game'] },
  { ddc:'796',    keywords:['olahraga','sport','atletik','sepak bola','basket','renang'] },

  // ─── 800 Sastra ────────────────────────────────────
  { ddc:'800',    keywords:['sastra','literature','kesusastraan'] },
  { ddc:'810',    keywords:['sastra amerika','american literature'] },
  { ddc:'820',    keywords:['sastra inggris','english literature'] },
  { ddc:'830',    keywords:['sastra jerman','german literature'] },
  { ddc:'899.221',keywords:['sastra indonesia','indonesian literature','novel indonesia','puisi indonesia','cerpen'] },
  { ddc:'899.222',keywords:['sastra jawa','sastra sunda','sastra daerah','wayang'] },

  // ─── 900 Sejarah & Geografi ────────────────────────
  { ddc:'900',    keywords:['sejarah','history','sejarah dunia'] },
  { ddc:'910',    keywords:['geografi','geography','peta','atlas','kartografi'] },
  { ddc:'920',    keywords:['biografi','biography','riwayat hidup','autobiografi'] },
  { ddc:'930',    keywords:['sejarah kuno','ancient history','arkeologi'] },
  { ddc:'940',    keywords:['sejarah eropa','european history'] },
  { ddc:'950',    keywords:['sejarah asia','asian history','sejarah cina','sejarah jepang'] },
  { ddc:'959.8',  keywords:['sejarah indonesia','indonesian history','sejarah nusantara','kemerdekaan','kolonial'] },
  { ddc:'960',    keywords:['sejarah afrika','african history'] },
  { ddc:'970',    keywords:['sejarah amerika','american history'] },
  { ddc:'980',    keywords:['sejarah amerika latin','latin american history'] },
  { ddc:'990',    keywords:['sejarah pasifik','oceania','history of specific areas'] },

  // ─── Hukum Islam / Fikih ───────────────────────────
  { ddc:'297.3',  keywords:['fikih','fiqh','fiqih','hukum islam','fiqh muamalah','muamalah','fikih muamalah'] },
  { ddc:'297.35', keywords:['fikih keluarga','hukum keluarga islam','perkawinan islam','nikah','talak','warisan islam'] },
  { ddc:'297.4',  keywords:['ushul fikih','ushul fiqh','metodologi hukum islam'] },

  // ─── Ekonomi Islam ─────────────────────────────────
  { ddc:'297.273',keywords:['ekonomi islam','ekonomi syariah','keuangan syariah','perbankan syariah','zakat','wakaf','infak'] },

  // ─── Manajemen Zakat Wakaf ─────────────────────────
  { ddc:'297.54', keywords:['zakat','infak','sedekah','wakaf','amil','lembaga zakat','BAZNAS'] },
];

/**
 * Suggest DDC berdasarkan subjek
 * @param {string} subject - Subjek buku
 * @returns {Array} - Array hasil [{ddc, label, score}]
 */
function suggestDDC(subject) {
  if (!subject || !subject.trim()) return [];

  const input = subject.toLowerCase()
    .replace(/[;,\/\\|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = input.split(' ').filter(w => w.length > 2);
  const scores = new Map();

  for (const entry of DDC_MAP) {
    let score = 0;
    for (const kw of entry.keywords) {
      const kwLower = kw.toLowerCase();
      if (input.includes(kwLower)) {
        // Full phrase match = higher score
        score += kwLower.includes(' ') ? 10 : 5;
      } else {
        // Partial word match
        for (const w of words) {
          if (kwLower.includes(w) && w.length > 3) score += 2;
          if (w.includes(kwLower.split(' ')[0]) && kwLower.split(' ')[0].length > 3) score += 1;
        }
      }
    }
    if (score > 0) {
      const existing = scores.get(entry.ddc);
      if (!existing || existing.score < score) {
        scores.set(entry.ddc, { ddc: entry.ddc, score });
      }
    }
  }

  // Sort by score desc, limit 5
  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(r => ({ ddc: r.ddc, score: r.score }));
}

module.exports = { suggestDDC };
