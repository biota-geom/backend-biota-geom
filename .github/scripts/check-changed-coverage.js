#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const THRESHOLD = 85;
const METRICS = ['statements', 'branches', 'functions', 'lines'];

const baseRef = process.env.BASE_REF;
if (!baseRef) {
  console.error('BASE_REF env var is required');
  process.exit(1);
}

execSync(`git fetch origin ${baseRef} --depth=1`, { stdio: 'inherit' });

const diffOutput = execSync(
  `git diff --name-only --diff-filter=ACMR origin/${baseRef}...HEAD -- src`,
)
  .toString()
  .trim();

const changedFiles = diffOutput
  ? diffOutput
      .split('\n')
      .filter((f) => f && f.endsWith('.ts') && !f.endsWith('.spec.ts'))
  : [];

if (changedFiles.length === 0) {
  console.log('No changed source files under src/ — skipping coverage check.');
  process.exit(0);
}

const summaryPath = path.join(
  process.cwd(),
  'coverage',
  'coverage-summary.json',
);
if (!fs.existsSync(summaryPath)) {
  console.error(
    `Coverage summary not found at ${summaryPath}. Did tests run with --coverage?`,
  );
  process.exit(1);
}

// Compiles `relFile` in isolation and checks whether it produces any JS
// beyond the boilerplate ("use strict", __esModule marker, sourcemap
// comment). A file that only exports `interface`/`type` declarations
// compiles to nothing but that boilerplate — Istanbul then has no statement
// to instrument, so it never appears in coverage-summary.json at all.
function fileEmitsRuntimeCode(relFile) {
  const source = fs.readFileSync(path.join(process.cwd(), relFile), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2023,
    },
    fileName: relFile,
  });

  const meaningfulLines = outputText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => line !== '"use strict";')
    .filter((line) => !line.startsWith('//#'))
    .filter(
      (line) =>
        line !==
        'Object.defineProperty(exports, "__esModule", { value: true });',
    );

  return meaningfulLines.length > 0;
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const failures = [];

for (const relFile of changedFiles) {
  const absFile = path.resolve(process.cwd(), relFile);
  const coverage = summary[absFile];

  // A changed file can be absent from the summary for two very different
  // reasons: (a) it was never required by any test — a real gap — or (b) it
  // has zero emittable JS (e.g. a file that only exports `interface`s), so
  // there is nothing for Istanbul to instrument in the first place. Case (b)
  // is common for TS-only type modules and must not be scored as 0%; we
  // detect it here since coverage-summary.json collapses both cases into
  // "no entry" and can't distinguish them on its own.
  if (!coverage) {
    if (fileEmitsRuntimeCode(relFile)) {
      failures.push(`${relFile}: not covered by any test (no coverage data)`);
    }
    continue;
  }

  for (const metric of METRICS) {
    const pct = coverage[metric].pct;
    if (pct < THRESHOLD) {
      failures.push(`${relFile}: ${metric} ${pct}% (< ${THRESHOLD}%)`);
    }
  }
}

if (failures.length > 0) {
  console.error(
    `Coverage check failed for ${changedFiles.length} changed file(s):\n`,
  );
  failures.forEach((line) => console.error(`  - ${line}`));
  process.exit(1);
}

console.log(
  `All ${changedFiles.length} changed file(s) meet the ${THRESHOLD}% coverage bar.`,
);
