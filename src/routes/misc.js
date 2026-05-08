const express = require('express');
const router  = express.Router();
const { exportExcel, exportPDF } = require('../controllers/exportController');
const {
  getSettings, updateSettings, getTemplates,
  createTemplate, deleteTemplate, getStats, previewNomor
} = require('../controllers/settingController');

router.get('/export/excel',     exportExcel);
router.get('/export/pdf',       exportPDF);
router.get('/settings',         getSettings);
router.put('/settings',         updateSettings);
router.get('/templates',        getTemplates);
router.post('/templates',       createTemplate);
router.delete('/templates/:id', deleteTemplate);
router.get('/stats',            getStats);
router.get('/nomor-preview',    previewNomor);

module.exports = router;
