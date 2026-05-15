#!/usr/bin/env node
// Lightweight verification for electron/claude-jsonl.ts using the bundled
// fixture electron/__fixtures__/claude-sample.jsonl.
//
// Run: node scripts/verify-claude-jsonl.cjs
//
// Why this exists: the project has no jest/vitest installed, and we don't
// want to add a dev dependency just for one tiny parser. So we compile the
// electron TypeScript once (via the existing build:electron pipeline) and
// load dist-electron/claude-jsonl.js from Node directly.
//
// Output:
//   - One line per fixture entry showing parsed event type vs expected.
//   - Final summary "PASS 7/7" or "FAIL N mismatch(es)".
//   - Exit code 0 on PASS, 1 on FAIL.

'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const COMPILED = path.join(REPO_ROOT, 'dist-electron', 'claude-jsonl.js');
const FIXTURE = path.join(REPO_ROOT, 'electron', '__fixtures__', 'claude-sample.jsonl');

if (!fs.existsSync(COMPILED)) {
	console.log('[verify] dist-electron/claude-jsonl.js missing — compiling electron sources...');
	execSync('npx tsc -p electron/tsconfig.json', { cwd: REPO_ROOT, stdio: 'inherit' });
}

const { parseJsonlLine } = require(COMPILED);

const EXPECTATIONS = [
	{ desc: 'user_message',      expect: 'user_message' },
	{ desc: 'assistant_partial', expect: 'assistant_partial' },
	{ desc: 'assistant_partial', expect: 'assistant_partial' },
	{ desc: 'assistant_end_turn',expect: 'assistant_end_turn' },
	{ desc: 'invalid JSON',      expect: null },
	{ desc: 'assistant tool_use',expect: 'tool_use' },
	{ desc: 'user tool_result',  expect: 'tool_use' },
	{ desc: 'queue-operation',   expect: 'unknown' },
];

const lines = fs.readFileSync(FIXTURE, 'utf-8').split('\n').filter((l) => l.length > 0);

if (lines.length !== EXPECTATIONS.length) {
	console.error(`[verify] fixture has ${lines.length} lines, expected ${EXPECTATIONS.length}`);
	process.exit(1);
}

let pass = 0;
let fail = 0;
for (let i = 0; i < lines.length; i++) {
	const result = parseJsonlLine(lines[i]);
	const got = result === null ? null : result.type;
	const exp = EXPECTATIONS[i].expect;
	const ok = got === exp;
	console.log(
		`  [${i + 1}] ${EXPECTATIONS[i].desc.padEnd(24)} expect=${String(exp).padEnd(18)} got=${String(got).padEnd(18)} ${ok ? 'OK' : 'FAIL'}`
	);
	if (ok) pass++; else fail++;
}

console.log();
if (fail === 0) {
	console.log(`PASS ${pass}/${lines.length}`);
	process.exit(0);
} else {
	console.log(`FAIL ${fail} mismatch(es) out of ${lines.length}`);
	process.exit(1);
}
