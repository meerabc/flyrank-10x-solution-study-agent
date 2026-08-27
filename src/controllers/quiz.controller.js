const materialModel = require('../models/material.model');
const questionModel = require('../models/question.model');

function getQuiz(req, res) {
  const material = materialModel.getMaterialById(req.params.id, req.userId);
  if (!material) {
    return res.status(404).json({ error: 'Material not found' });
  }

  if (material.status !== 'done') {
    return res.status(409).json({ error: `Material is not ready, status: ${material.status}` });
  }

  const count = parseInt(req.query.count, 10) || 5;
  const weakConcepts = questionModel.getWeakConcepts(material.id, req.userId, count);

  const questions = weakConcepts
    .map((weak) => {
      const materialQuestions = questionModel.getQuestionsForMaterial(material.id);
      const q = materialQuestions.find((mq) => mq.concept_id === weak.concept_id);
      if (!q) return null;
      return { questionId: q.id, conceptId: q.concept_id, questionText: q.question_text, questionType: q.question_type };
    })
    .filter(Boolean);

  res.json({ materialId: material.id, questions });
}

function submitAnswer(req, res) {
  const { questionId, wasCorrect } = req.body;

  if (typeof questionId !== 'number' || typeof wasCorrect !== 'boolean') {
    return res.status(400).json({ error: 'questionId (number) and wasCorrect (boolean) are required' });
  }

  const materialQuestions = questionModel.getQuestionsForMaterial(req.params.id);
  const question = materialQuestions.find((q) => q.id === questionId);

  if (!question) {
    return res.status(404).json({ error: 'Question not found for this material' });
  }

  questionModel.logAnswer({
    questionId,
    conceptId: question.concept_id,
    userId: req.userId,
    wasCorrect,
  });

  res.status(201).json({ recorded: true });
}

module.exports = { getQuiz, submitAnswer };