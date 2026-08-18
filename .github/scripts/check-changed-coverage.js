#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

const summaryPath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
if (!fs.existsSync(summaryPath)) {
  console.error(`Coverage summary not found at ${summaryPath}. Did tests run with --coverage?`);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const failures = [];

for (const relFile of changedFiles) {
  const absFile = path.resolve(process.cwd(), relFile);
  const coverage = summary[absFile];

  for (const metric of METRICS) {
    const pct = coverage ? coverage[metric].pct : 0;
    if (pct < THRESHOLD) {
      failures.push(`${relFile}: ${metric} ${pct}% (< ${THRESHOLD}%)`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Coverage check failed for ${changedFiles.length} changed file(s):\n`);
  failures.forEach((line) => console.error(`  - ${line}`));
  process.exit(1);
}

console.log(`All ${changedFiles.length} changed file(s) meet the ${THRESHOLD}% coverage bar.`);
