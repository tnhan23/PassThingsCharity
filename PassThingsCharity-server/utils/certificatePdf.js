function toPdfText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (letter) => letter === 'đ' ? 'd' : 'D')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/([\\()])/g, '\\$1');
}

function createCertificatePdf({ recipientName, title, content, issueDate, milestonePoints }) {
  const lines = [
    'PASSTHINGSCHARITY',
    'CERTIFICATE OF CONTRIBUTION',
    '',
    `Presented to: ${recipientName}`,
    title,
    content,
    milestonePoints ? `Milestone reached: ${milestonePoints} points` : '',
    `Issued: ${new Date(issueDate).toISOString().slice(0, 10)}`,
  ].filter(Boolean);

  const textCommands = lines
    .map((line, index) => `BT /F1 ${index === 0 ? 18 : 12} Tf 72 ${740 - index * 36} Td (${toPdfText(line)}) Tj ET`)
    .join('\n');
  const stream = `${textCommands}\n`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}endstream`,
  ];

  let document = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(document, 'ascii'));
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(document, 'ascii');
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    document += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(document, 'ascii');
}

module.exports = { createCertificatePdf };
