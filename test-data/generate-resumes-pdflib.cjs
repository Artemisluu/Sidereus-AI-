const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const outDir = path.resolve('test-data/resumes');
const rows = [
  ['Li Hua','13800000001','lihua@example.com','Shanghai'],
  ['Wang Lei','13800000002','wanglei@example.com','Beijing'],
  ['Zhao Min','13800000003','zhaomin@example.com','Shenzhen'],
  ['Chen Yu','13800000004','chenyu@example.com','Guangzhou'],
  ['Sun Qi','13800000005','sunqi@example.com','Hangzhou']
];
(async () => {
  for (let i = 0; i < rows.length; i++) {
    const [name, phone, email, city] = rows[i];
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const p1 = doc.addPage([595, 842]);
    p1.drawText(`${name} Resume`, { x: 50, y: 790, size: 20, font, color: rgb(0,0,0) });
    p1.drawText(`Phone: ${phone}`, { x: 50, y: 760, size: 12, font });
    p1.drawText(`Email: ${email}`, { x: 50, y: 742, size: 12, font });
    p1.drawText(`City: ${city}`, { x: 50, y: 724, size: 12, font });
    p1.drawText(`Education: University A, Computer Science, Bachelor, 2023`, { x: 50, y: 700, size: 12, font });
    p1.drawText(`Work: Company X, Fullstack Engineer, 2023-2025`, { x: 50, y: 682, size: 12, font });
    const p2 = doc.addPage([595, 842]);
    p2.drawText('Skills: TypeScript, React, Express, PostgreSQL', { x: 50, y: 790, size: 12, font });
    p2.drawText('Project: Recruitment Platform, role: lead developer', { x: 50, y: 770, size: 12, font });
    const bytes = await doc.save({ useObjectStreams: false, addDefaultPage: false });
    fs.writeFileSync(path.join(outDir, `resume-${i + 1}.pdf`), bytes);
  }
  console.log('Regenerated 5 PDFs (no object streams)');
})();
