const express = require('express');
const router  = express.Router();
const {
  getColumns, updateColumnStyle, updateColumnOrder,
  addCustomColumn, deleteCustomColumn
} = require('../controllers/columnController');

router.get('/',                       getColumns);
router.put('/order',                  updateColumnOrder);
router.put('/:field_name',            updateColumnStyle);
router.post('/custom',                addCustomColumn);
router.delete('/custom/:field_name',  deleteCustomColumn);

module.exports = router;
