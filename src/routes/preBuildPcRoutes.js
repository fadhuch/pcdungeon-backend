const express = require('express');
const router = express.Router();
const preBuildPcController = require('../controllers/preBuildPcController');

// Get all pre-built PCs
router.get('/', preBuildPcController.getPreBuildPcs);

// Get pre-built PC by ID
router.get('/:id', preBuildPcController.getPreBuildPc);

// Create new pre-built PC
router.post('/', preBuildPcController.createPreBuildPc);

// Update pre-built PC
router.put('/:id', preBuildPcController.updatePreBuildPc);

// Delete pre-built PC
router.delete('/:id', preBuildPcController.deletePreBuildPc);

// Get components for building pre-built PC
router.get('/build/components/:category', preBuildPcController.getComponentsForBuild);

module.exports = router;
