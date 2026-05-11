const express = require('express');
const router  = express.Router();
const { renderBookCards, renderBookLabels, renderBookSpines } = require('../controllers/printController');

router.get('/book-cards',  renderBookCards);
router.get('/book-labels', renderBookLabels);
router.get('/book-spines', renderBookSpines);

module.exports = router;
