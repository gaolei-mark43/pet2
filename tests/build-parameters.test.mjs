import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTimestamp, initialBuildParameters, parameterChoices, validateBuildParameters } from '../src/buildParameterModel.js';

const definitions = [
  { name: 'TARGET', type: '字符串', defaultValue: 'qa', allowEmpty: false },
  { name: 'MODULES', type: '多选', options: 'core\nui\napi', defaultValue: 'core,ui', allowEmpty: false },
  { name: 'NOTE', type: '字符串', defaultValue: '', allowEmpty: true },
];

test('build parameter initialization normalizes multi-select defaults and explicit overrides', () => {
  assert.deepEqual(parameterChoices(definitions[1]), ['core', 'ui', 'api']);
  assert.deepEqual(initialBuildParameters(definitions), { TARGET: 'qa', MODULES: ['core', 'ui'], NOTE: '' });
  assert.deepEqual(initialBuildParameters(definitions, { TARGET: 'prod', MODULES: ['api'] }), { TARGET: 'prod', MODULES: ['api'], NOTE: '' });
});

test('required validation treats empty arrays as empty while allowing declared optional values', () => {
  assert.equal(validateBuildParameters(definitions, { TARGET: 'qa', MODULES: [], NOTE: '' }), '参数 MODULES 不允许为空');
  assert.equal(validateBuildParameters(definitions, { TARGET: 'qa', MODULES: ['core'], NOTE: '' }), '');
});

test('timestamp, credential and scripted parameters derive values from their saved definitions', () => {
  const now = new Date(2026, 8, 16, 9, 7, 5);
  assert.equal(formatTimestamp('yyyyMMdd-HHmmss', now), '20260916-090705');
  const special = [
    { name: 'STAMP', type: '时间戳', timestampFormat: 'yyyyMMdd-HHmmss' },
    { name: 'CREDENTIAL', type: '凭证', credentialType: 'Token', defaultValue: 'mock-Token' },
    { name: 'BRANCH', type: '脚本式参数', defaultValue: 'main', script: "return ['main', 'develop', 'release']" },
    { name: 'PERSONAL_TOKEN', type: '个人Token', defaultValue: '' },
  ];
  assert.deepEqual(initialBuildParameters(special, {}, now), {
    STAMP: '20260916-090705', CREDENTIAL: 'mock-Token', BRANCH: 'main', PERSONAL_TOKEN: '',
  });
  assert.deepEqual(parameterChoices(special[1]), ['mock-Token']);
  assert.deepEqual(parameterChoices(special[2]), ['main', 'develop', 'release']);
});
