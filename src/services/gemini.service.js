const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

const EXTRACTION_PROMPT = `You are analyzing one slide or page from study material.
Identify the core teachable concept, ignoring filler like slide numbers, headers,
or decorative elements. Course administration details do not count as a teachable
concept, examples of this include title slides, instructor names, course codes,
institution names, agendas, or section divider slides with no real content. If
the slide is administrative or has no real teachable concept, respond with
"insufficient content" rather than describing the administrative details. If
there is not enough content to identify a real concept, say so honestly instead
of guessing. Be specific: if the slide shows a rule, formula, or transformation,
state what it actually says completely, do not just describe that a rule exists
without giving its content. Respond in this exact format:

CONCEPT: <the core concept, specific and complete, in one or two sentences, or "insufficient content">
CONFIDENCE: <high, medium, or low>`;

const QUESTION_PROMPT = `Given this concept from study material, write one quiz question
that tests real understanding, not just recall of exact wording. Mix it up between
recall style and applied style depending on what fits the concept. Respond in this
exact format:

QUESTION: <the question>
ANSWER: <the correct answer, concise>
TYPE: <recall or applied>`;

function base64ToImagePart(dataUrl) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);

  if (!match) {
    return { inlineData: { data: dataUrl, mimeType: 'image/png' } };
  }

  return { inlineData: { data: match[2], mimeType: match[1] } };
}

async function extractConcept({ text, images = [] }) {
  const parts = [{ text: `${EXTRACTION_PROMPT}\n\nSlide text: "${text || '(no text on this slide)'}"` }];

  images.forEach((base64Data) => {
    parts.push(base64ToImagePart(base64Data));
  });

  const result = await model.generateContent(parts);
  const responseText = result.response.text();

  const conceptMatch = responseText.match(/CONCEPT:\s*(.+)/);
  const confidenceMatch = responseText.match(/CONFIDENCE:\s*(\w+)/i);

  return {
    concept: conceptMatch ? conceptMatch[1].trim() : responseText.trim(),
    confidence: confidenceMatch ? confidenceMatch[1].toLowerCase() : 'unknown',
  };
}

async function generateQuestion({ concept }) {
  const prompt = `${QUESTION_PROMPT}\n\nConcept: "${concept}"`;
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  const questionMatch = responseText.match(/QUESTION:\s*(.+)/);
  const answerMatch = responseText.match(/ANSWER:\s*(.+)/);
  const typeMatch = responseText.match(/TYPE:\s*(\w+)/i);

  return {
    question: questionMatch ? questionMatch[1].trim() : null,
    answer: answerMatch ? answerMatch[1].trim() : null,
    type: typeMatch ? typeMatch[1].toLowerCase() : 'recall',
  };
}

module.exports = { extractConcept, generateQuestion };