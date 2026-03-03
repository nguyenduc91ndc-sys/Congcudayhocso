// Word (.docx) export utility using HTML-to-DOCX method
// No external packages needed - uses Blob with MS Word-compatible HTML

import { Section, TopicInfo, ReportType, REPORT_TYPES } from './skknTypes';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Detect and convert markdown-style tables to HTML tables
function convertTablesToHtml(text: string): string {
  const lines = text.split('\n');
  let result = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Detect table: line contains | and next line(s) also contain |
    if (line.includes('|') && line.split('|').length >= 3) {
      // Check if this is part of a table block
      let tableLines: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].trim().includes('|') && lines[j].trim().split('|').length >= 3) {
        const tl = lines[j].trim();
        // Skip separator lines (--- | --- | ---)
        if (!/^[\s|:-]+$/.test(tl)) {
          tableLines.push(tl);
        }
        j++;
      }

      if (tableLines.length >= 2) {
        // Build HTML table
        result += '<table style="border-collapse:collapse; width:100%; margin:12pt 0;">';

        tableLines.forEach((tl, idx) => {
          const cells = tl.split('|')
            .map(c => c.trim())
            .filter(c => c.length > 0);

          const tag = idx === 0 ? 'th' : 'td';
          const bgStyle = idx === 0 ? 'background-color:#e8eaf6; font-weight:bold;' : (idx % 2 === 0 ? 'background-color:#f5f5f5;' : '');

          result += '<tr>';
          cells.forEach(cell => {
            result += `<${tag} style="border:1px solid #000; padding:6pt 10pt; font-size:13pt; ${bgStyle} text-align:center;">${escapeHtml(cell)}</${tag}>`;
          });
          result += '</tr>';
        });

        result += '</table>';
        i = j;
        continue;
      }
    }

    // Check for table title (Bảng X: ...)
    if (/^Bảng\s*\d/i.test(line)) {
      result += `<p style="font-size:13pt; font-weight:bold; font-style:italic; text-align:center; margin:12pt 0 6pt;">${escapeHtml(line)}</p>`;
      i++;
      continue;
    }

    // Regular paragraph
    if (line) {
      result += `<p style="font-size:13pt; text-indent:36pt; text-align:justify; line-height:1.5;">${escapeHtml(line)}</p>`;
    }
    i++;
  }

  return result;
}

/**
 * Generate the full HTML preview of the report.
 * Used by both the preview modal and the Word export.
 */
export function generatePreviewHtml(
  sections: Section[],
  topicInfo: TopicInfo,
  reportType: ReportType,
  chartImages?: Record<string, string[]>
): string {
  const reportLabel = REPORT_TYPES[reportType].label.toUpperCase();

  // Build HTML content with Word-compatible styles
  let bodyHtml = '';

  // Cover page
  bodyHtml += `
    <div style="text-align:center; margin-top:100pt;">
      <p style="font-size:14pt; text-transform:uppercase;">${escapeHtml(topicInfo.department)}</p>
      <p style="font-size:14pt; text-transform:uppercase; font-weight:bold;">${escapeHtml(topicInfo.school)}</p>
      <br/><br/><br/>
      <p style="font-size:16pt; font-weight:bold; text-transform:uppercase;">${escapeHtml(reportLabel)}</p>
      <br/>
      <p style="font-size:15pt; font-weight:bold; color:#1a237e;">ĐỀ TÀI: ${escapeHtml(topicInfo.title)}</p>
      <br/><br/><br/><br/>
      <p style="font-size:13pt;">Tác giả: <b>${escapeHtml(topicInfo.author)}</b></p>
      <p style="font-size:13pt;">Đơn vị: ${escapeHtml(topicInfo.school)}</p>
      <p style="font-size:13pt;">Năm học: ${escapeHtml(topicInfo.year)}</p>
    </div>
    <br clear="all" style="page-break-before:always"/>
  `;

  // Table of contents
  bodyHtml += `
    <p style="font-size:14pt; font-weight:bold; text-align:center; text-transform:uppercase;">MỤC LỤC</p>
    <br/>
  `;

  const renderTocSections = (secs: Section[], depth: number = 0) => {
    for (const sec of secs) {
      const indent = depth * 24;
      const isBold = depth === 0;
      bodyHtml += `<p style="margin-left:${indent}pt; font-size:13pt; ${isBold ? 'font-weight:bold;' : ''}">${escapeHtml(sec.title)}</p>`;
      if (sec.subsections) {
        renderTocSections(sec.subsections, depth + 1);
      }
    }
  };
  renderTocSections(sections);

  bodyHtml += `<br clear="all" style="page-break-before:always"/>`;

  // Strip duplicate title from content beginning
  // AI often starts content with the section title (bold, numbered, etc.)
  const stripDuplicateTitle = (content: string, title: string): string => {
    const lines = content.split('\n');
    if (lines.length === 0) return content;

    // Normalize title for comparison: remove numbering, markdown bold, extra spaces
    const normalizeText = (t: string) => t
      .replace(/^[\d.]+\s*/, '')        // Remove leading numbers like "1. " or "1.1. "
      .replace(/^\*\*|\*\*$/g, '')      // Remove markdown bold **
      .replace(/^#+\s*/, '')            // Remove markdown headings #
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    const normalizedTitle = normalizeText(title);
    if (!normalizedTitle) return content;

    // Check first few lines for title duplication
    let linesToSkip = 0;
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i].trim();
      if (!line) { linesToSkip++; continue; }

      const normalizedLine = normalizeText(line);
      // Check if line matches or contains the title
      if (normalizedLine === normalizedTitle ||
        normalizedTitle.includes(normalizedLine) ||
        normalizedLine.includes(normalizedTitle)) {
        linesToSkip = i + 1;
        // Also skip empty line right after title
        if (linesToSkip < lines.length && !lines[linesToSkip].trim()) {
          linesToSkip++;
        }
        break;
      }
      // If first non-empty line doesn't match, stop checking
      break;
    }

    return linesToSkip > 0 ? lines.slice(linesToSkip).join('\n') : content;
  };

  // Content sections
  const renderContentSections = (secs: Section[], depth: number = 0) => {
    for (const sec of secs) {
      if (sec.subsections && sec.subsections.length > 0) {
        // Parent section - heading
        bodyHtml += `<p style="font-size:14pt; font-weight:bold; text-transform:uppercase; margin-top:18pt; margin-bottom:6pt;">${escapeHtml(sec.title)}</p>`;
        // If parent also has content, render it (without duplicate title)
        if (sec.content && sec.content.trim()) {
          const cleanContent = stripDuplicateTitle(sec.content, sec.title);
          if (cleanContent.trim()) {
            bodyHtml += convertTablesToHtml(cleanContent);
          }
        }
        renderContentSections(sec.subsections, depth + 1);
      } else {
        // Leaf section with content
        const headingSize = depth === 0 ? '14pt' : '13pt';
        bodyHtml += `<p style="font-size:${headingSize}; font-weight:bold; margin-top:12pt; margin-bottom:6pt;">${escapeHtml(sec.title)}</p>`;
        if (sec.content && sec.content.trim()) {
          // Strip duplicate title from AI-generated content, then convert
          const cleanContent = stripDuplicateTitle(sec.content, sec.title);
          bodyHtml += convertTablesToHtml(cleanContent);
        }
        // Embed chart images for this section
        if (chartImages && chartImages[sec.id]) {
          for (const imgSrc of chartImages[sec.id]) {
            bodyHtml += `<p style="text-align:center; margin:18pt 0;"><img src="${imgSrc}" style="max-width:100%; height:auto;" /></p>`;
          }
        }
      }
    }
  };
  renderContentSections(sections);

  // Full HTML document
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(topicInfo.title)}</title>
  <style>
    @page {
      size: A4;
      margin: 2cm 2cm 2cm 3cm;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 13pt;
      line-height: 1.5;
      color: #000000;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    p {
      margin: 0 0 6pt 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    td, th {
      border: 1px solid #000;
      padding: 4pt 8pt;
      font-size: 13pt;
    }
    th {
      background-color: #e8eaf6;
      font-weight: bold;
    }
    @media print {
      body { max-width: none; padding: 0; }
    }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

export function exportToWord(
  sections: Section[],
  topicInfo: TopicInfo,
  reportType: ReportType,
  chartImages?: Record<string, string[]>
) {
  // Generate the HTML, then add Word-specific XML headers for download
  const previewHtml = generatePreviewHtml(sections, topicInfo, reportType, chartImages);

  // Wrap with Word-compatible headers
  const wordHtml = previewHtml
    .replace('<html>', `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">`)
    .replace('</head>', `<!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
</head>`);

  // Create Blob and download
  const blob = new Blob(['\ufeff' + wordHtml], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${topicInfo.title || 'SKKN'}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
