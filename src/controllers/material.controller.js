const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const materialModel = require('../models/material.model');
const conceptModel = require('../models/concept.model');
const questionModel = require('../models/question.model');
const { ingestPdf } = require('../services/ingest-pdf.service');
const { ingestPptx } = require('../services/ingest-pptx.service');
const { extractConcept, generateQuestion } = require('../services/gemini.service');

function hashFile(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function findMediaContent(mediaMap, fileName) {
  const key = Object.keys(mediaMap).find((k) => k.endsWith(fileName));
  return key ? mediaMap[key] : null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processFile(materialId, filePath, fileType) {
  let units = [];

  if (fileType === 'pdf') {
    const result = await ingestPdf(filePath);
    units = result.pages.map((p) => ({ location: `page ${p.pageNumber}`, text: p.text, images: [] }));
  } else if (fileType === 'pptx') {
    const result = await ingestPptx(filePath);
    units = result.slides.map((s) => ({
      location: `slide ${s.slideNumber}`,
      text: s.text,
      images: s.mediaNames.map((name) => findMediaContent(result.media, name)).filter(Boolean),
    }));
  }

  for (const unit of units) {
    if (!unit.text && unit.images.length === 0) continue;

    const extraction = await extractConcept({ text: unit.text, images: unit.images });
    if (extraction.concept.toLowerCase().includes('insufficient content')) continue;

    const conceptId = conceptModel.saveConcept({
      materialId,
      sourceLocation: unit.location,
      conceptText: extraction.concept,
      confidence: extraction.confidence,
    });

    await delay(8000);

    const q = await generateQuestion({ concept: extraction.concept });
    if (q.question && q.answer) {
      questionModel.saveQuestion({
        conceptId,
        questionText: q.question,
        answerText: q.answer,
        questionType: q.type,
      });
    }

    await delay(500);
  }

  materialModel.updateStatus(materialId, 'done');
}

async function upload(req, res) {
  if (!req.body.fileData || !req.body.fileName) {
    return res.status(400).json({ error: 'fileData and fileName are required' });
  }

  const fileName = req.body.fileName;
  const ext = path.extname(fileName).toLowerCase().replace('.', '');
  if (ext !== 'pdf' && ext !== 'pptx') {
    return res.status(400).json({ error: 'Only pdf and pptx files are supported' });
  }

  const buffer = Buffer.from(req.body.fileData, 'base64');
  const fileHash = hashFile(buffer);

  const cached = materialModel.findByHash(req.userId, fileHash);
  if (cached && cached.status === 'done') {
    return res.status(200).json({
      materialId: cached.id,
      status: cached.status,
      cached: true,
      message: 'This exact file was already processed, returning existing results',
    });
  }

  const materialId = materialModel.createMaterial({
    userId: req.userId,
    fileName,
    fileHash,
    fileType: ext,
  });

  const tempPath = path.join(__dirname, '..', '..', 'data', `upload-${materialId}.${ext}`);
  fs.writeFileSync(tempPath, buffer);

  materialModel.updateStatus(materialId, 'processing');

  try {
    await processFile(materialId, tempPath, ext);
  } catch (err) {
    materialModel.updateStatus(materialId, 'failed');
    return res.status(500).json({ error: 'Processing failed', details: err.message });
  } finally {
    fs.unlinkSync(tempPath);
  }

  res.status(201).json({ materialId, status: 'done', cached: false });
}

function getStatus(req, res) {
  const material = materialModel.getMaterialById(req.params.id, req.userId);
  if (!material) {
    return res.status(404).json({ error: 'Material not found' });
  }
  res.json({ materialId: material.id, status: material.status, fileName: material.file_name });
}

module.exports = { upload, getStatus };