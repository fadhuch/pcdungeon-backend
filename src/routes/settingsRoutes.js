const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

router.get('/', settingsController.getSettings);
router.get('/:key', settingsController.getSetting);
router.put('/:key', settingsController.updateSetting);
router.post('/bulk', settingsController.updateMultipleSettings);

module.exports = router;
