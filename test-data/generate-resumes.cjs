const fs = require('node:fs');
const path = require('node:path');
const PDFDocument = require('pdfkit');

const outDir = path.resolve('test-data/resumes');

const candidates = [
  {
    name: 'Li Hua',
    phone: '13800000001',
    email: 'lihua@example.com',
    city: 'Shanghai',
    school: 'Fudan University',
    major: 'Computer Science',
    degree: 'Bachelor',
    grad: '2023-06',
    company: 'ByteDance',
    role: 'Frontend Engineer',
    period: '2023-07 to 2025-12',
    skills: ['React', 'TypeScript', 'Node.js', 'Vite', 'Playwright'],
  },
  {
    name: 'Wang Lei',
    phone: '13800000002',
    email: 'wanglei@example.com',
    city: 'Beijing',
    school: 'Tsinghua University',
    major: 'Software Engineering',
    degree: 'Master',
    grad: '2022-06',
    company: 'Tencent',
    role: 'Backend Engineer',
    period: '2022-07 to 2025-12',
    skills: ['Express', 'PostgreSQL', 'Redis', 'Kafka', 'OpenAPI'],
  },
  {
    name: 'Zhao Min',
    phone: '13800000003',
    email: 'zhaomin@example.com',
    city: 'Shenzhen',
    school: 'Zhejiang University',
    major: 'Information Systems',
    degree: 'Bachelor',
    grad: '2021-06',
    company: 'Meituan',
    role: 'Full Stack Engineer',
    period: '2021-07 to 2025-12',
    skills: ['React', 'Express', 'Docker', 'CI/CD', 'GraphQL'],
  },
  {
    name: 'Chen Yu',
    phone: '13800000004',
    email: 'chenyu@example.com',
    city: 'Guangzhou',
    school: 'SJTU',
    major: 'Data Science',
    degree: 'Master',
    grad: '2020-06',
    company: 'Alibaba',
    role: 'Data Engineer',
    period: '2020-07 to 2025-12',
    skills: ['Python', 'SQL', 'ETL', 'Airflow', 'Spark'],
  },
  {
    name: 'Sun Qi',
    phone: '13800000005',
    email: 'sunqi@example.com',
    city: 'Hangzhou',
    school: 'NJU',
    major: 'Artificial Intelligence',
    degree: 'Bachelor',
    grad: '2024-06',
    company: 'Startup X',
    role: 'AI Engineer',
    period: '2024-07 to 2025-12',
    skills: ['LLM', 'Prompt Engineering', 'TypeScript', 'RAG', 'FastAPI'],
  },
];

function buildLongSummary(candidate) {
  return [
    `${candidate.name} is a product-minded ${candidate.role} with hands-on delivery across recruitment, talent analytics, and workflow automation systems.`,
    `In ${candidate.company}, this candidate led cross-functional planning with designers, PMs, QA, and operations to convert ambiguous business goals into measurable technical milestones.`,
    `The work style emphasizes stable architecture, incremental release strategy, and pragmatic trade-offs between delivery speed and long-term maintainability.`,
    `Core strengths include API design, data modeling, observability, incident response, and mentoring junior engineers through code review and pairing.`,
    `Recent projects focused on resume ingestion pipelines, candidate scoring engines, and intelligent recommendation features that improved recruiter efficiency and reduced manual screening time.`,
    `This candidate regularly writes technical proposals, defines engineering standards, and collaborates with stakeholders to align technical implementation with compliance and privacy requirements.`,
    `Beyond implementation, ${candidate.name} documents postmortems, tracks service-level indicators, and continuously improves reliability through load testing, resilience drills, and cost optimization.`,
  ].join(' ');
}

function buildProjectDetails(candidate) {
  return [
    `Project One: Intelligent Resume Processing Platform. Tech stack: ${candidate.skills.join(', ')}.`,
    'Responsibilities: designed ingestion APIs, implemented parser orchestration, added retry policies, and built dashboards for processing latency and parsing quality.',
    'Outcome: increased successful parse rate, reduced duplicate candidate records, and cut average recruiter triage time by introducing structured resume metadata.',
    'Project Two: Candidate Matching and Recommendation Service.',
    'Responsibilities: built scoring pipelines, exposed REST and SSE interfaces, authored evaluation rubrics, and integrated model output validation to avoid malformed responses.',
    'Outcome: improved shortlisting precision, accelerated feedback loops with hiring managers, and provided transparent score breakdown for auditability and decision support.',
  ].join(' ');
}

function generateResumePdf(candidate, index) {
  return new Promise((resolve, reject) => {
    const file = path.join(outDir, `resume-${index + 1}.pdf`);
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(file);

    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);

    doc.pipe(stream);

    doc.fontSize(18).text(`${candidate.name} Resume`, { underline: true });
    doc.moveDown(0.6);
    doc.fontSize(11).text(`Phone: ${candidate.phone}`);
    doc.text(`Email: ${candidate.email}`);
    doc.text(`City: ${candidate.city}`);
    doc.moveDown(0.8);

    doc.fontSize(13).text('Education');
    doc.fontSize(11).text(
      `${candidate.school} | ${candidate.major} | ${candidate.degree} | Graduation: ${candidate.grad}`
    );
    doc.moveDown(0.8);

    doc.fontSize(13).text('Work Experience');
    doc.fontSize(11).text(`${candidate.company} | ${candidate.role} | ${candidate.period}`);
    doc.moveDown(0.4);
    doc.text(buildLongSummary(candidate), {
      align: 'left',
      lineGap: 2,
    });

    doc.addPage();
    doc.fontSize(13).text('Skills');
    doc.fontSize(11).text(candidate.skills.join(', '));
    doc.moveDown(0.8);

    doc.fontSize(13).text('Project Experience');
    doc.fontSize(11).text(buildProjectDetails(candidate), {
      align: 'left',
      lineGap: 2,
    });

    doc.moveDown(0.8);
    doc.fontSize(13).text('Achievements');
    doc.fontSize(11).text(
      'Delivered multiple production releases with strong quality signals, reduced rollback rate, and improved deployment confidence by strengthening release checklists and monitoring coverage. ' +
        'Contributed to hiring and onboarding by creating interview rubrics, technical onboarding docs, and practical training tasks for new team members.'
    );

    doc.end();
  });
}

async function main() {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (let i = 0; i < candidates.length; i += 1) {
    await generateResumePdf(candidates[i], i)
  }

  console.log(`Generated ${candidates.length} PDF resumes at ${outDir}`);
}

main().catch((error) => {
  console.error('Failed to generate resumes:', error);
  process.exit(1);
});
