#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function titleCase(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildProject() {
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch (e) {
    console.error('Build failed. Cannot generate README.');
    process.exit(1);
  }
}

function parseCategoriesFromRegister() {
  const srcPath = resolve(process.cwd(), 'src/tools/browser/register.ts');
  const content = readFileSync(srcPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const map = new Map(); // className -> Category

  for (const line of lines) {
    // Support multiple named imports per line: import { A, B } from './subdir/file.js'
    const m = line.match(/import\s*\{\s*([A-Za-z0-9_,\s]+)\s*\}\s*from\s*'\.\/(.+?)\/.+?';/);
    if (m) {
      const classNames = m[1]
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const subdir = m[2];
      const category = titleCase(subdir);
      for (const className of classNames) {
        map.set(className, category);
      }
    }
  }
  return map;
}

async function mapToolNameToCategory(classCategoryMap) {
  const distRegisterPath = resolve(process.cwd(), 'dist/tools/browser/register.js');
  const moduleUrl = pathToFileURL(distRegisterPath).href;
  const mod = await import(moduleUrl);
  const classes = mod.BROWSER_TOOL_CLASSES || [];
  const nameToCategory = new Map(); // toolName -> Category
  for (const cls of classes) {
    const category = classCategoryMap.get(cls.name);
    try {
      const meta = cls.getMetadata?.() || {};
      if (meta && meta.name && category) {
        nameToCategory.set(meta.name, category);
      }
    } catch {}
  }
  return nameToCategory;
}

function getToolsMetadata() {
  const indexPath = resolve(process.cwd(), 'dist/index.js');
  const cmd = `node ${indexPath} --print-tools-json`;
  const json = execSync(cmd, { encoding: 'utf8' });
  const metas = JSON.parse(json);
  // Shape to match existing downstream code expecting { cls, meta }
  return metas.map((meta) => ({ cls: { name: meta.name }, meta }));
}

function formatParams(inputSchema) {
  if (!inputSchema || !inputSchema.properties) return [];
  const req = new Set(Array.isArray(inputSchema.required) ? inputSchema.required : []);
  const props = inputSchema.properties;
  const keys = Object.keys(props);
  return keys.map(k => {
    const p = props[k] || {};
    const type = p.type || 'any';
    const desc = p.description || '';
    const required = req.has(k) ? 'required' : 'optional';
    return `- ${k} (${type}, ${required}): ${desc}`;
  });
}

function formatExamples(examples) {
  if (!examples || examples.length === 0) return '';
  const body = examples.map(ex => `- ${ex}`).join('\n');
  return `- Examples:\n${body}`;
}

function formatOutputs(outputs) {
  if (!outputs) return '';
  const list = Array.isArray(outputs) ? outputs : [outputs];
  const lines = [];
  lines.push('- Output Format:');
  let inSub = false;
  for (const raw of list) {
    const s = String(raw);
    const isBullet = /^\s*-\s+/.test(s);
    if (isBullet) {
      const text = s.replace(/^\s*-\s+/, '');
      lines.push(`${inSub ? '    -' : '  -'} ${text}`);
    } else {
      lines.push(`  - ${s}`);
      inSub = /:\s*$/.test(s);
    }
    if (!isBullet && !/:\s*$/.test(s)) {
      inSub = false;
    }
  }
  return lines.join('\n');
}

function formatExampleOutputs(exampleOutputs) {
  if (!exampleOutputs || exampleOutputs.length === 0) return '';
  const parts = [];
  for (const ex of exampleOutputs) {
    parts.push(`- Example Output (${ex.call}):`);
    parts.push('```');
    parts.push(ex.output);
    parts.push('```');
  }
  return parts.join('\n');
}

function generateCoreToolsSection(grouped) {
  const lines = [];
  lines.push('');
  for (const [category, tools] of grouped) {
    lines.push(`### ${category}`);
    lines.push('');
    for (const t of tools) {
      lines.push(`#### \`${t.meta.name}\``);
      if (t.meta.description) {
        lines.push(`${t.meta.description}`);
      }
      const params = formatParams(t.meta.inputSchema);
      if (params.length) {
        lines.push('');
        lines.push('- Parameters:');
        lines.push(params.map(p => `  ${p}`).join('\n'));
      }
      const outputs = formatOutputs(t.meta.outputs);
      if (outputs) {
        lines.push('');
        lines.push(outputs);
      }
      const examples = formatExamples(t.meta.examples);
      if (examples) {
        lines.push('');
        lines.push(examples);
      }
      const exampleOutputs = formatExampleOutputs(t.meta.exampleOutputs);
      if (exampleOutputs) {
        lines.push('');
        lines.push(exampleOutputs);
      }
      lines.push('');
    }
  }
  return lines.join('\n');
}

async function run() {
  buildProject();
  const classCategoryMap = parseCategoriesFromRegister();
  const toolNameCategoryMap = await mapToolNameToCategory(classCategoryMap);
  const items = await getToolsMetadata();

  // Group tools by category using className -> category map, fallback to meta.category
  const groupedMap = new Map();
  for (const { cls, meta } of items) {
    const toolName = meta.name;
    const category = toolNameCategoryMap.get(toolName) || meta.category || 'Other';
    if (!groupedMap.has(category)) groupedMap.set(category, []);
    groupedMap.get(category).push({ cls, meta });
  }

  // Sort categories with configurable preferred order and 'Other' last
  let preferred = ['Inspection', 'Navigation', 'Interaction', 'Content', 'Console', 'Evaluation', 'Network', 'Waiting', 'Lifecycle'];
  const orderFileCandidates = [
    resolve(process.cwd(), 'scripts/tool-order.json'),
    resolve(process.cwd(), 'tool-order.json'),
  ];
  for (const file of orderFileCandidates) {
    if (existsSync(file)) {
      try {
        const cfg = JSON.parse(readFileSync(file, 'utf8'));
        if (Array.isArray(cfg) && cfg.every(x => typeof x === 'string')) {
          preferred = cfg;
        }
      } catch {}
      break;
    }
  }
  const categories = Array.from(groupedMap.keys());
  categories.sort((a, b) => {
    const ia = preferred.includes(a) ? preferred.indexOf(a) : Number.POSITIVE_INFINITY;
    const ib = preferred.includes(b) ? preferred.indexOf(b) : Number.POSITIVE_INFINITY;
    if (ia !== ib) return ia - ib;
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });

  // Sort tools within each category by priority, then name
  for (const cat of categories) {
    const arr = groupedMap.get(cat);
    arr.sort((t1, t2) => {
      const p1 = typeof t1.meta.priority === 'number' ? t1.meta.priority : Number.MAX_SAFE_INTEGER;
      const p2 = typeof t2.meta.priority === 'number' ? t2.meta.priority : Number.MAX_SAFE_INTEGER;
      if (p1 !== p2) return p1 - p2;
      return String(t1.meta.name).localeCompare(String(t2.meta.name));
    });
  }

  const grouped = categories.map(cat => [cat, groupedMap.get(cat)]);
  const newSection = generateCoreToolsSection(grouped);

  // Replace Core Tools section in README.md
  const readmePath = resolve(process.cwd(), 'README.md');
  const readme = readFileSync(readmePath, 'utf8');
  const lines = readme.split(/\r?\n/);
  const startIdx = lines.findIndex(l => l.trim().startsWith('## Core Tools'));
  if (startIdx === -1) {
    console.error('Could not find "## Core Tools" section in README.md');
    process.exit(1);
  }
  let endIdx = lines.slice(startIdx + 1).findIndex(l => l.startsWith('## '));
  if (endIdx === -1) {
    endIdx = lines.length - (startIdx + 1);
  }
  endIdx = startIdx + 1 + endIdx;

  const updated = [
    ...lines.slice(0, startIdx + 1),
    newSection.trim(),
    ...lines.slice(endIdx)
  ].join('\n');

  writeFileSync(readmePath, updated, 'utf8');
  console.log('README.md Core Tools section updated.');

  // Also update CLAUDE.md Available Tools section if present
  const claudePath = resolve(process.cwd(), 'CLAUDE.md');
  try {
    const claude = readFileSync(claudePath, 'utf8');
    const cLines = claude.split(/\r?\n/);
    const cStart = cLines.findIndex(l => l.trim().startsWith('## Available Tools'));
    if (cStart !== -1) {
      let cEnd = cLines.slice(cStart + 1).findIndex(l => l.startsWith('## '));
      if (cEnd === -1) cEnd = cLines.length - (cStart + 1);
      cEnd = cStart + 1 + cEnd;

      const claudeSection = generateClaudeAvailableTools(grouped);
      const cUpdated = [
        ...cLines.slice(0, cStart + 1),
        claudeSection.trim(),
        ...cLines.slice(cEnd)
      ].join('\n');
      writeFileSync(claudePath, cUpdated, 'utf8');
      console.log('CLAUDE.md Available Tools section updated.');
    }
  } catch {}
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

function generateClaudeAvailableTools(grouped) {
  const lines = [];
  lines.push('');
  lines.push('**See `src/tools/common/registry.ts` for complete tool definitions and up-to-date descriptions.**');
  lines.push('');
  lines.push('### Tool Categories');
  lines.push('');
  for (const [category, tools] of grouped) {
    const names = tools.map(t => `\`${t.meta.name}\``).join(', ');
    lines.push(`**${category}** (${tools.length} tools):`);
    lines.push(`- ${names}`);
    lines.push('');
  }
  return lines.join('\n');
}
