const express = require('express');
const requireAuth = require('../middleware/require-auth');
const quizController = require('../controllers/quiz.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/:id/quiz', quizController.getQuiz);
router.post('/:id/answers', quizController.submitAnswer);

module.exports = router;