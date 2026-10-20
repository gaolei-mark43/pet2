import test from 'node:test';
import assert from 'node:assert/strict';
import { graphGroups, insertParallelStage, insertSerialStage, normalizeGraphStages, removeGraphStage } from '../src/pipelineGraphModel.js';

const initial = [
  { id: '1-1', groupKey: 'checkout', name: '代码检出' },
  { id: '2-1', groupKey: 'test', name: 'Linux测试' },
  { id: '2-2', groupKey: 'test', parallelOf: '2-1', name: 'Windows测试' },
  { id: '3-1', groupKey: 'build', name: '构建' },
];

test('normalization preserves parallel lanes and PET stage numbering', () => {
  const normalized = normalizeGraphStages(initial);
  assert.deepEqual(normalized.map(stage => stage.id), ['1-1', '2-1', '2-2', '3-1']);
  assert.equal(normalized[2].parallelOf, '2-1');
  assert.deepEqual(graphGroups(normalized).map(group => group.items.length), [1, 2, 1]);
});

test('serial plus inserts before the selected group and renumbers following groups', () => {
  const next = insertSerialStage(initial, 1, { id: 'draft', groupKey: 'scan', name: '扫描' });
  assert.deepEqual(next.map(stage => `${stage.id}:${stage.name}`), [
    '1-1:代码检出', '2-1:扫描', '3-1:Linux测试', '3-2:Windows测试', '4-1:构建',
  ]);
  assert.equal(next[3].parallelOf, '3-1');
});

test('parallel action appends a lane to its group and stage deletion repairs numbering', () => {
  const withLane = insertParallelStage(initial, 'test', { id: 'draft', name: '兼容性测试' });
  assert.deepEqual(withLane.slice(1, 4).map(stage => stage.id), ['2-1', '2-2', '2-3']);
  assert.ok(withLane.slice(2, 4).every(stage => stage.parallelOf === '2-1'));
  const removed = removeGraphStage(withLane, '2-1');
  assert.deepEqual(removed.map(stage => `${stage.id}:${stage.name}`), [
    '1-1:代码检出', '2-1:Windows测试', '2-2:兼容性测试', '3-1:构建',
  ]);
  assert.equal(removed[1].parallelOf, null);
  assert.equal(removed[2].parallelOf, '2-1');
});
