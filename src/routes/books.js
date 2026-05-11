const express = require('express');
const router  = express.Router();
const {
  getBooks, getBookById, createBook, updateBook,
  deleteBook, bulkDeleteBooks, updateCell, 
  autoCutter, suggestDDCHandler, aiEnrichHandler
} = require('../controllers/bookController');

router.get('/',              getBooks);
router.get('/auto-cutter',   autoCutter);
router.get('/suggest-ddc',   suggestDDCHandler);
router.get('/ai-enrich',     aiEnrichHandler);
router.get('/:id',           getBookById);
router.post('/',             createBook);
router.post('/bulk-delete',    bulkDeleteBooks);
router.post('/bulk-ai-enrich',  require('../controllers/bookController').bulkAiEnrichHandler);
router.put('/:id',           updateBook);
router.delete('/:id',        deleteBook);
router.patch('/:id/cell',    updateCell);

module.exports = router;
