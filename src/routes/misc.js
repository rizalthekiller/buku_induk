const express = require('express');
const router  = express.Router();
const { exportExcel, exportPDF } = require('../controllers/exportController');
const {
  getSettings, updateSettings, getTemplates,
  createTemplate, deleteTemplate, getStats, previewNomor,
  backupDatabase, syncCounter
} = require('../controllers/settingController');

router.get('/export/excel',     exportExcel);
router.get('/export/pdf',       exportPDF);
router.get('/backup',           backupDatabase);
router.get('/settings',         getSettings);
router.put('/settings',         updateSettings);
router.post('/settings/sync-counter', syncCounter);
router.get('/templates',        getTemplates);
router.post('/templates',       createTemplate);
router.delete('/templates/:id', deleteTemplate);
router.get('/stats',            getStats);
router.get('/nomor-preview',    previewNomor);

module.exports = router;
