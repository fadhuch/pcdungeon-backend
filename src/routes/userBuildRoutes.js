const express = require('express');
const router = express.Router();
const userBuildController = require('../controllers/userBuildController');

router.get('/', userBuildController.getUserBuilds);
router.get('/:id', userBuildController.getUserBuild);
router.post('/', userBuildController.createUserBuild);
router.put('/:id', userBuildController.updateUserBuild);
router.delete('/:id', userBuildController.deleteUserBuild);

module.exports = router;
