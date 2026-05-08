const express = require('express');
const router  = express.Router();
const {
  getBooks, getBookById, createBook, updateBook,
  deleteBook, updateCell, autoCutter, suggestDDCHandler
} = require('../controllers/bookController');

router.get('/',              getBooks);
router.get('/auto-cutter',   autoCutter);
router.get('/suggest-ddc',   suggestDDCHandler);
router.get('/:id',           getBookById);
router.post('/',             createBook);
router.put('/:id',           updateBook);
router.delete('/:id',        deleteBook);
router.patch('/:id/cell',    updateCell);

module.exports = router;
