const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { smartImport, analyzeImport } = require('../controllers/importController');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/excel', upload.single('file'), smartImport);
router.post('/analyze', upload.single('file'), analyzeImport);

module.exports = router;
