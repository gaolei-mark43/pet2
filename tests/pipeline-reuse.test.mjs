import test from 'node:test';
import assert from 'node:assert/strict';
import { copyPipelineData, pipelineEditorInitialState, pipelineFromTemplate, templateFromPipeline } from '../src/pipelineReuseModel.js';

const source = {
  id: 'source', name: 'source', label: 'release', priority: '2', cleanup: true,
  repoTrigger: true, repoTypes: ['push'], days: ['周一'], scheduleTime: '09:00', upstream: true,
  stageList: [{ id: '1-1', name: '构建', steps: [{ id: 'shell', plugin: 'Shell命令行', config: { form: { PARAMETERS: 'make' } } }] }],
  params: [{ name: 'TARGET', type: '字符串', defaultValue: 'qa' }],
  pipelineScript: 'pipeline { stages {} }',
};

test('copy preserves stages, plugin configuration, parameters and selected basic settings without sharing references', () => {
  const copied = copyPipelineData(source, 'source-copy', { keepLabel: true, keepBasic: true });
  assert.equal(copied.name, 'source-copy');
  assert.equal(copied.id, undefined);
  assert.deepEqual(copied.stageList, source.stageList);
  assert.deepEqual(copied.params, source.params);
  assert.equal(copied.repoTrigger, true);
  copied.stageList[0].steps[0].config.form.PARAMETERS = 'changed';
  assert.equal(source.stageList[0].steps[0].config.form.PARAMETERS, 'make');
});

test('custom template round trip restores exact stage and parameter configuration', () => {
  const template = templateFromPipeline(source, { name: 'build-template', scopes: ['公共'], description: '', keepLabel: true, keepBasic: true });
  const created = pipelineFromTemplate({ name: 'from-template' }, template.name, template);
  assert.equal(created.stages, 1);
  assert.deepEqual(created.stageList, source.stageList);
  assert.deepEqual(created.params, source.params);
  assert.deepEqual(created.parameters, source.params);
  assert.equal(created.label, 'release');
  assert.equal(created.priority, '2');
  assert.equal(created.cleanup, true);
  assert.equal(created.repoTrigger, true);
  assert.equal(created.pipelineScript, source.pipelineScript);
});

test('template retention switches remove label and basic settings without removing stages or parameters', () => {
  const template = templateFromPipeline(source, { name: 'steps-only', scopes: ['公共'], description: '', keepLabel: false, keepBasic: false });
  const created = pipelineFromTemplate({ name: 'from-steps-only', label: 'new', priority: '5' }, template.name, template);
  assert.equal(template.label, '');
  assert.equal(template.basic, null);
  assert.equal(created.label, 'new');
  assert.equal(created.priority, '5');
  assert.deepEqual(created.stageList, source.stageList);
  assert.deepEqual(created.params, source.params);
});

test('blank template creates an actually empty graph', () => {
  const created = pipelineFromTemplate({ name: 'blank' }, '新空白模板');
  assert.equal(created.stages, 0);
  assert.deepEqual(created.stageList, []);
  assert.deepEqual(created.params, []);
});

test('newly created pipeline settings survive the first editor open before any editor-local save exists', () => {
  const selected = {
    name: 'created-flow', description: 'created in the two-step wizard', label: 'qa',
    priority: '2', cleanup: true, repoTrigger: true, repoTypes: ['Gitlab仓库源触发'],
    days: ['周一'], scheduleTime: '09:00', upstream: true,
  };
  const initial = pipelineEditorInitialState({}, selected);
  assert.deepEqual(initial, selected);

  const editorSaved = { label: 'release', cleanup: false };
  const reopened = pipelineEditorInitialState(editorSaved, selected);
  assert.equal(reopened.label, 'release');
  assert.equal(reopened.cleanup, false);
  assert.equal(reopened.priority, '2');
  assert.equal(reopened.description, selected.description);
});
