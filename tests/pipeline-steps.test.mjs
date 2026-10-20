import test from 'node:test';
import assert from 'node:assert/strict';
import { getStageSteps, insertStageStep, removeStageStep, updateStageStep } from '../src/pipelineStepModel.js';
import { generatePipelineScript, resolvePipelineVariables, validatePipelineScript } from '../src/pipelineCompiler.js';

test('step plus inserts immediately after its anchor and delete keeps the primary fields in sync', () => {
  const stage = { id: '1-1', name: '构建', steps: [
    { id: 'a', plugin: 'Shell命令行', config: { form: { PARAMETERS: 'echo one' }, definition: { command: '${PARAMETERS}' } } },
    { id: 'c', plugin: '清理工作空间' },
  ] };
  const inserted = insertStageStep(stage, { id: 'b', plugin: 'Bat命令行', config: { form: { PARAMETERS: 'build.bat' } } }, 'a');
  assert.deepEqual(getStageSteps(inserted).map(step => step.id), ['a', 'b', 'c']);
  assert.equal(inserted.plugin, 'Shell命令行');
  const removed = removeStageStep(inserted, 'a');
  assert.deepEqual(getStageSteps(removed).map(step => step.id), ['b', 'c']);
  assert.equal(removed.plugin, 'Bat命令行');
});

test('editing a step regenerates executable pipeline script and post steps move to always', () => {
  let stage = { id: '1-1', groupKey: 'build', name: '构建', steps: [
    { id: 'shell', plugin: 'Shell命令行', config: { form: { PARAMETERS: 'echo old' }, definition: { command: '${PARAMETERS}' } } },
    { id: 'cleanup', plugin: '清理工作空间', config: { form: { POST_STEP: true } } },
  ] };
  stage = updateStageStep(stage, 'shell', { form: { PARAMETERS: "echo 'new'" }, definition: { command: '${PARAMETERS}' } });
  const script = generatePipelineScript('demo', [stage]);
  assert.match(script, /sh 'echo \\'new\\''/);
  assert.match(script, /post \{\s+always \{\s+cleanWs\(\)/s);
  assert.equal(validatePipelineScript(script).length, 0);
});

test('runtime parameters resolve known variables and preserve unknown variables', () => {
  const resolved = resolvePipelineVariables('echo ${TARGET} ${UNKNOWN}', { TARGET: 'qa' });
  assert.equal(resolved, 'echo qa ${UNKNOWN}');
});

test('core workflow renders multiline shell, bat, test report and artifact collection as executable pipeline steps', () => {
  const stage = { id: '1-1', groupKey: 'verify', name: '验证与归档', steps: [
    { id: 'shell', plugin: 'Shell命令行', config: { form: { PARAMETERS: 'cmake .\nmake -j4' }, definition: { command: '${PARAMETERS}' } } },
    { id: 'bat', plugin: 'Bat命令行', config: { form: { PARAMETERS: 'call setup.bat\r\nctc -g -O2' }, definition: { command: '${PARAMETERS}' } } },
    { id: 'junit', plugin: '测试报告解析', config: { form: { REPORTS: 'reports/**/*.xml' }, definition: { command: "junit '${REPORTS}'" } } },
    { id: 'artifact', plugin: '收集构建产物', config: { form: { PATTERN: 'build/**/*', FINGERPRINT: true }, definition: { command: "archiveArtifacts artifacts: '${PATTERN}', fingerprint: ${FINGERPRINT}" } } },
  ] };
  const script = generatePipelineScript('core-workflow', [stage]);
  assert.match(script, /sh '''cmake \.\nmake -j4'''/);
  assert.match(script, /bat '''call setup\.bat\r\nctc -g -O2'''/);
  assert.match(script, /\n\s+junit 'reports\/\*\*\/\*\.xml'/);
  assert.match(script, /\n\s+archiveArtifacts artifacts: 'build\/\*\*\/\*', fingerprint: true/);
  assert.doesNotMatch(script, /sh 'junit/);
  assert.doesNotMatch(script, /sh 'archiveArtifacts/);
  assert.equal(validatePipelineScript(script).length, 0);
});
