const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const outDir = path.resolve('test-data/resumes');
const data = [
  {name:'Li Hua', phone:'13800000001', email:'lihua@example.com', city:'Shanghai', school:'Fudan University', major:'Computer Science', degree:'Bachelor', grad:'2023-06', company:'ByteDance', role:'Frontend Engineer', period:'2023-07 to 2025-12', skills:['React','TypeScript','Node.js']},
  {name:'Wang Lei', phone:'13800000002', email:'wanglei@example.com', city:'Beijing', school:'Tsinghua University', major:'Software Engineering', degree:'Master', grad:'2022-06', company:'Tencent', role:'Backend Engineer', period:'2022-07 to 2025-12', skills:['Express','PostgreSQL','Redis']},
  {name:'Zhao Min', phone:'13800000003', email:'zhaomin@example.com', city:'Shenzhen', school:'Zhejiang University', major:'Information Systems', degree:'Bachelor', grad:'2021-06', company:'Meituan', role:'Full Stack Engineer', period:'2021-07 to 2025-12', skills:['React','Express','Docker']},
  {name:'Chen Yu', phone:'13800000004', email:'chenyu@example.com', city:'Guangzhou', school:'SJTU', major:'Data Science', degree:'Master', grad:'2020-06', company:'Alibaba', role:'Data Engineer', period:'2020-07 to 2025-12', skills:['Python','SQL','ETL']},
  {name:'Sun Qi', phone:'13800000005', email:'sunqi@example.com', city:'Hangzhou', school:'NJU', major:'Artificial Intelligence', degree:'Bachelor', grad:'2024-06', company:'Startup X', role:'AI Engineer', period:'2024-07 to 2025-12', skills:['LLM','Prompt','TypeScript']}
];
for (let i=0;i<data.length;i++){
  const c=data[i];
  const file=path.join(outDir, `resume-${i+1}.pdf`);
  const doc=new PDFDocument({margin:50});
  doc.pipe(fs.createWriteStream(file));
  doc.fontSize(18).text(`${c.name} Resume`);
  doc.moveDown();
  doc.fontSize(12).text(`Phone: ${c.phone}`);
  doc.text(`Email: ${c.email}`);
  doc.text(`City: ${c.city}`);
  doc.moveDown();
  doc.text('Education');
  doc.text(`${c.school} | ${c.major} | ${c.degree} | Graduation: ${c.grad}`);
  doc.moveDown();
  doc.text('Work Experience');
  doc.text(`${c.company} | ${c.role} | ${c.period}`);
  doc.text('Summary: Built enterprise applications and collaborated across teams.');
  doc.addPage();
  doc.text('Skills');
  doc.text(c.skills.join(', '));
  doc.moveDown();
  doc.text('Project Experience');
  doc.text('Project A | Tech Stack: React, TypeScript, PostgreSQL');
  doc.text('Responsibilities: Designed APIs and implemented features.');
  doc.text('Highlights: Improved performance and delivery quality.');
  doc.end();
}
console.log('Generated', data.length, 'PDF resumes at', outDir);
