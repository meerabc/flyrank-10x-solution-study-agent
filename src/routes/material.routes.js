const express = require('express');
const requireAuth = require('../middleware/require-auth');
const materialController = require('../controllers/material.controller');

const router = express.Router();

router.use(requireAuth);

router.post('/', materialController.upload);
router.get('/:id', materialController.getStatus);

module.exports = router;