const { extractPptx } = require('pptx-content-extractor');

function extractSlideNumber(name) {
  const match = name.match(/slide(\d+)\.xml/);
  return match ? parseInt(match[1], 10) : null;
}

async function ingestPptx(filePath) {
  const result = await extractPptx(filePath);

  const slideMap = {};

  result.slides.forEach((entry) => {
    const slideNumber = extractSlideNumber(entry.name);
    if (!slideNumber) return;

    if (!slideMap[slideNumber]) {
      slideMap[slideNumber] = { text: '', mediaNames: [] };
    }

    const isRelsFile = entry.name.endsWith('.rels');

    if (!isRelsFile && entry.content) {
      const text = entry.content.map((item) => item.text.join(' ')).join(' ').trim();
      slideMap[slideNumber].text = text;
    }

    if (entry.mediaNames && entry.mediaNames.length > 0) {
      slideMap[slideNumber].mediaNames.push(...entry.mediaNames);
    }
  });

  const slides = Object.keys(slideMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map((slideNumber) => {
      const slide = slideMap[slideNumber];
      return {
        slideNumber,
        text: slide.text,
        hasImages: slide.mediaNames.length > 0,
        imageCount: slide.mediaNames.length,
        mediaNames: slide.mediaNames,
      };
    });

  const mediaByName = {};
  result.media.forEach((item) => {
    mediaByName[item.name] = item.content;
  });

  return { source: filePath, type: 'pptx', slides, media: mediaByName };
}

module.exports = { ingestPptx };