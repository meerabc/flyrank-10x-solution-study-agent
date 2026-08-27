const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function ingestPdf(filePath) {
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buffer });

  let pages = [];
  try {
    const result = await parser.getText();
    pages = result.pages
      .map((page) => ({ pageNumber: page.num, text: page.text.trim() }))
      .filter((page) => page.text.length > 0);
  } finally {
    await parser.destroy();
  }

  return { source: filePath, type: 'pdf', pages };
}

module.exports = { ingestPdf };