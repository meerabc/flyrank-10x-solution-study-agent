const db = require('../config/db');

function saveQuestion({ conceptId, questionText, answerText, questionType }) {
  const stmt = db.prepare(`
    INSERT INTO questions (concept_id, question_text, answer_text, question_type)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(conceptId, questionText, answerText, questionType);
  return result.lastInsertRowid;
}

function getQuestionsForMaterial(materialId) {
  return db.prepare(`
    SELECT q.* FROM questions q
    JOIN concepts c ON q.concept_id = c.id
    WHERE c.material_id = ?
  `).all(materialId);
}

function logAnswer({ questionId, conceptId, userId, wasCorrect }) {
  const stmt = db.prepare(`
    INSERT INTO answer_history (question_id, concept_id, user_id, was_correct)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(questionId, conceptId, userId, wasCorrect ? 1 : 0);
}

function getWeakConcepts(materialId, userId, limit = 5) {
  return db.prepare(`
    SELECT
      c.id as concept_id,
      c.concept_text,
      COUNT(ah.id) as total_attempts,
      SUM(CASE WHEN ah.was_correct = 0 THEN 1 ELSE 0 END) as wrong_count,
      CAST(SUM(CASE WHEN ah.was_correct = 0 THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(ah.id), 0) as wrong_ratio,
      MAX(CASE WHEN ah.was_correct = 0 THEN ah.answered_at ELSE NULL END) as last_wrong_at
    FROM concepts c
    LEFT JOIN answer_history ah ON ah.concept_id = c.id AND ah.user_id = ?
    WHERE c.material_id = ?
    GROUP BY c.id
    ORDER BY
      wrong_ratio DESC,
      CASE WHEN COUNT(ah.id) = 0 THEN 0 ELSE 1 END,
      last_wrong_at DESC
    LIMIT ?
  `).all(userId, materialId, limit);
}


module.exports = { saveQuestion, getQuestionsForMaterial, logAnswer, getWeakConcepts };