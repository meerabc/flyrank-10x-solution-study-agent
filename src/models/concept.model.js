const db = require('../config/db');

function saveConcept({ materialId, sourceLocation, conceptText, confidence }) {
  const stmt = db.prepare(`
    INSERT INTO concepts (material_id, source_location, concept_text, confidence)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(materialId, sourceLocation, conceptText, confidence);
  return result.lastInsertRowid;
}

function getConceptsByMaterial(materialId) {
  return db.prepare('SELECT * FROM concepts WHERE material_id = ?').all(materialId);
}

module.exports = { saveConcept, getConceptsByMaterial };