const express = require('express');
const router  = express.Router();
const { renderBookCards, renderBookLabels } = require('../controllers/printController');

router.get('/book-cards', renderBookCards);
router.get('/book-labels', renderBookLabels);

module.exports = router;
