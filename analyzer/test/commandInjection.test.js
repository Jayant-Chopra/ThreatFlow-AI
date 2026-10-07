const assert = require('node:assert/strict');
const test = require('node:test');

const { parseSource } = require('../parser');
const { buildProgramModel } = require('../model/programModel');
const { analyzeTaint } = require('../taint/taintAnalyzer');
const { evaluateCommandInjection } = require('../rules/commandInjection');

function evaluate(source) {
  const model = buildProgramModel([parseSource('controllers/commands.js', source)]);
  return { findings: evaluateCommandInjection(model, analyzeTaint(model)), model };
}

test('reports direct HTTP input passed to exec', () => {
  const { findings } = evaluate('exec(req.query.command);');
  assert.deepEqual(findings, [{
    id: 'finding_001',
    type: 'COMMAND_INJECTION',
    severity: 'HIGH',
    title: 'Potential Command Injection',
    file: 'controllers/commands.js',
    line: 1,
    source: 'req.query.command',
    sink: 'exec',
    route: null,
    evidence: 'Tainted HTTP input reaches exec through a tainted command argument.'
  }]);
});

test('reports a tainted variable passed to exec', () => {
  const { findings } = evaluate('const command = req.query.command; exec(command);');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].sink, 'exec');
  assert.equal(findings[0].source, 'req.query.command');
  assert.equal(findings[0].line, 1);
});

test('reports concatenated commands', () => {
  const { findings } = evaluate("const host = req.query.host; exec('ping ' + host);");
  assert.equal(findings.length, 1);
  assert.match(findings[0].evidence, /string concatenation/);
});

test('reports template-literal commands', () => {
  const { findings } = evaluate('const host = req.query.host; exec(`ping ${host}`);');
  assert.equal(findings.length, 1);
  assert.match(findings[0].evidence, /template literal command/);
});

test('reports execSync command injection', () => {
  const { findings } = evaluate('const command = req.body.command; execSync(command);');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].sink, 'execSync');
  assert.equal(findings[0].source, 'req.body.command');
});

test('reports a tainted spawn command but not separately passed argument arrays', () => {
  const vulnerable = evaluate("const command = req.params.command; spawn(command, ['--version']);");
  const conservative = evaluate("const host = req.params.host; spawn('ping', [host]);");
  assert.equal(vulnerable.findings.length, 1);
  assert.equal(vulnerable.findings[0].sink, 'spawn');
  assert.deepEqual(conservative.findings, []);
});

test('does not report constant commands or unrelated variables', () => {
  assert.deepEqual(evaluate("exec('whoami');").findings, []);
  assert.deepEqual(evaluate("const command = 'whoami'; exec(command);").findings, []);
});

test('does not report database sinks and does not crash on object or array arguments', () => {
  const { findings } = evaluate("const id = req.query.id; db.query(id); exec('echo', { shell: false }, [id]);");
  assert.deepEqual(findings, []);
});

test('does not duplicate findings for a cyclic command path and uses unique IDs', () => {
  const { findings } = evaluate("let command = req.query.command; let alias = command; command = alias; exec(command); exec('echo ' + req.body.value);");
  assert.deepEqual(findings.map((finding) => finding.id), ['finding_001', 'finding_002']);
  assert.equal(new Set(findings.map((finding) => finding.id)).size, findings.length);
});
