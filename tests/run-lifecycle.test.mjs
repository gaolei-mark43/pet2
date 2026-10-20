import test from 'node:test';
import assert from 'node:assert/strict';
import { petApi } from '../src/mockPetApi.js';

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key),
};

test('queued stop survives stale start and finish; retry preserves parameters', async () => {
  petApi.reset();
  const run = await petApi.runPipeline('pipe1', { TARGET: 'qa' });
  assert.equal(run.status, '队列中');
  await petApi.stopRun(run.id);
  assert.equal((await petApi.startRun(run.id)).status, '已终止');
  assert.equal((await petApi.finishRun(run.id)).status, '已终止');
  const retry = await petApi.retryRun(run.id);
  assert.deepEqual(retry.parameters, { TARGET: 'qa' });
  await petApi.startRun(retry.id);
  let db = await petApi.snapshot();
  assert.equal(db.pipelines.find(p => p.id === 'pipe1').lastStatus, '运行中');
  assert.equal(db.runs.find(r => r.id === retry.id).status, '运行中');
  await petApi.finishRun(retry.id);
  db = await petApi.snapshot();
  const count = db.notifications.length;
  await petApi.finishRun(retry.id);
  assert.equal((await petApi.snapshot()).notifications.length, count);
});

test('a new platform build keeps the same trigger source in run history and list hydration', async () => {
  petApi.reset();
  const run = await petApi.runPipeline('pipe1');
  assert.equal(run.trigger, '由demo-admin从平台触发');
  const latest = (await petApi.snapshot()).runs.find(item => item.id === run.id);
  assert.equal(`#${latest.number} ${latest.trigger}`, `#${run.number} 由demo-admin从平台触发`);
});

test('older completion does not overwrite latest build; deleted pipeline history remains usable', async () => {
  petApi.reset();
  const older = await petApi.runPipeline('pipe1');
  const newer = await petApi.runPipeline('pipe1');
  await petApi.startRun(newer.id);
  await petApi.finishRun(older.id);
  assert.equal((await petApi.snapshot()).pipelines.find(p => p.id === 'pipe1').lastStatus, '运行中');
  await petApi.remove('pipelines', 'pipe1');
  assert.equal((await petApi.finishRun(newer.id)).status, '成功');
});

test('run advances through persisted stage states and incremental logs', async () => {
  petApi.reset();
  await petApi.update('pipelines', 'pipe1', {
    stageList: [
      { id: 'checkout', name: '代码检出', steps: [{ id: 'git', plugin: 'Gitlab代码检出' }] },
      { id: 'build', name: '构建', steps: [{ id: 'shell', plugin: 'Shell命令行' }] },
    ],
  });
  const queued = await petApi.runPipeline('pipe1');
  assert.ok(queued.stageStates.length > 1);
  assert.ok(queued.stageStates.every(stage => stage.status === '等待中'));
  await petApi.update('pipelines', 'pipe1', {
    stageList: [{ id: 'changed', name: '后续编辑', steps: [] }],
  });
  assert.deepEqual(queued.stageSnapshot.map(stage => stage.name), ['代码检出', '构建']);
  let run = await petApi.startRun(queued.id);
  assert.equal(run.stageStates[0].status, '运行中');
  assert.match(run.logs.join('\n'), /开始执行/);
  while (run.status === '运行中') run = await petApi.advanceRun(run.id);
  assert.equal(run.status, '成功');
  assert.ok(run.stageStates.every(stage => stage.status === '成功'));
  assert.match(run.logs.join('\n'), /所有阶段执行完成/);
});

test('a run freezes the saved plugin configuration and pipeline script even when started from outside the editor', async () => {
  petApi.reset();
  const configuredStage = {
    id: 'test', name: '测试', steps: [{
      id: 'bat', plugin: 'Bat命令行', config: {
        form: { PARAMETERS: 'call prepare.bat\nrun-tests.bat --suite smoke' },
        definition: { command: '${PARAMETERS}', version: '0.0.3' },
      },
    }],
  };
  const savedScript = "pipeline { stages { stage('测试') { steps { bat '''call prepare.bat\nrun-tests.bat --suite smoke''' } } } }";
  await petApi.update('pipelines', 'pipe1', { stageList: [configuredStage], pipelineScript: savedScript });
  const run = await petApi.runPipeline('pipe1');
  await petApi.update('pipelines', 'pipe1', {
    stageList: [{ id: 'changed', name: '后续编辑', steps: [] }],
    pipelineScript: 'pipeline { stages { } }',
  });
  assert.equal(run.pipelineScript, savedScript);
  assert.equal(run.stageSnapshot[0].steps[0].config.form.PARAMETERS, 'call prepare.bat\nrun-tests.bat --suite smoke');
  const persisted = (await petApi.snapshot()).runs.find(item => item.id === run.id);
  assert.equal(persisted.pipelineScript, savedScript);
  assert.equal(persisted.stageSnapshot[0].steps[0].config.definition.version, '0.0.3');
});

test('historical runs freeze parameter definitions so later type edits cannot expose old sensitive values', async () => {
  petApi.reset();
  const definitions = [
    { id: 1, name: 'PERSONAL_TOKEN', type: '个人Token', allowEmpty: false },
    { id: 2, name: 'TARGET', type: '字符串', defaultValue: 'qa', allowEmpty: false },
  ];
  await petApi.update('pipelines', 'pipe1', { params: definitions });
  const run = await petApi.runPipeline('pipe1', { PERSONAL_TOKEN: 'synthetic-token', TARGET: 'qa' });
  await petApi.update('pipelines', 'pipe1', { params: definitions.map(item => ({ ...item, type: '字符串' })) });
  assert.deepEqual(run.parameterDefinitions, definitions);
  const persisted = (await petApi.snapshot()).runs.find(item => item.id === run.id);
  assert.equal(persisted.parameterDefinitions[0].type, '个人Token');
});

test('scheduled run continues without an open monitor page', async () => {
  petApi.reset();
  await petApi.update('pipelines', 'pipe1', {
    stageList: [{ id: 'build', name: '构建', steps: [{ id: 'shell', plugin: 'Shell命令行' }] }],
  });
  const run = await petApi.runPipeline('pipe1');
  petApi.scheduleRun(run.id);
  await new Promise(resolve => setTimeout(resolve, 2400));
  const finished = (await petApi.snapshot()).runs.find(item => item.id === run.id);
  assert.equal(finished.status, '成功');
  assert.equal(finished.stageStates[0].status, '成功');
});

test('active runs resume after their in-memory scheduler is lost during a page reload', async () => {
  petApi.reset();
  await petApi.update('pipelines', 'pipe1', {
    stageList: [{ id: 'build', name: '构建', steps: [{ id: 'shell', plugin: 'Shell命令行' }] }],
  });
  const queued = await petApi.runPipeline('pipe1');
  petApi.cancelRunSchedule(queued.id);
  assert.deepEqual(petApi.resumeActiveRuns(), [queued.id]);
  await new Promise(resolve => setTimeout(resolve, 2400));
  const finished = (await petApi.snapshot()).runs.find(item => item.id === queued.id);
  assert.equal(finished.status, '成功');
  assert.equal(finished.stageStates[0].status, '成功');
});

test('successful artifact plugins do not fabricate an unobserved fixed artifact record', async () => {
  petApi.reset();
  await petApi.update('pipelines', 'pipe1', {
    stageList: [{ id: 'archive', name: '归档', steps: [{ id: 'artifact', plugin: '收集构建产物' }] }],
  });
  let run = await petApi.runPipeline('pipe1');
  run = await petApi.startRun(run.id);
  while (run.status === '运行中') run = await petApi.advanceRun(run.id);
  assert.equal(run.status, '成功');
  assert.equal((await petApi.snapshot()).artifacts.some(item => item.pipeline === `pipeline-demo #${run.number}`), false);
});

test('stopping a scheduled run freezes stage states and retry records its source', async () => {
  petApi.reset();
  await petApi.update('pipelines', 'pipe1', {
    stageList: [
      { id: 'checkout', name: '代码检出', steps: [{ id: 'git', plugin: 'Gitlab代码检出' }] },
      { id: 'build', name: '构建', steps: [{ id: 'shell', plugin: 'Shell命令行' }] },
    ],
  });
  const run = await petApi.runPipeline('pipe1', { TARGET: 'qa' });
  petApi.scheduleRun(run.id);
  await new Promise(resolve => setTimeout(resolve, 1100));
  const stopped = await petApi.stopRun(run.id);
  const frozenStates = structuredClone(stopped.stageStates);
  await new Promise(resolve => setTimeout(resolve, 1300));
  const afterWait = (await petApi.snapshot()).runs.find(item => item.id === run.id);
  assert.equal(afterWait.status, '已终止');
  assert.deepEqual(afterWait.stageStates, frozenStates);

  const retry = await petApi.retryRun(run.id);
  assert.equal(retry.trigger, `重新构建 #${run.number}`);
  assert.equal(retry.retryOf, run.number);
  assert.deepEqual(retry.parameters, { TARGET: 'qa' });
});

test('restart from a stage skips earlier stages without leaking control data into build parameters', async () => {
  petApi.reset();
  await petApi.update('pipelines', 'pipe1', {
    stageList: [
      { id: 'checkout', name: '代码检出', steps: [] },
      { id: 'build', name: '构建', steps: [] },
      { id: 'test', name: '测试', steps: [] },
    ],
  });
  const previous = await petApi.runPipeline('pipe1', { TARGET: 'qa' });
  await petApi.stopRun(previous.id);
  let retry = await petApi.retryRun(previous.id, { TARGET: 'qa', __restartFrom: '构建' });
  assert.deepEqual(retry.parameters, { TARGET: 'qa' });
  assert.equal(retry.retryFromStage, '构建');
  assert.deepEqual(retry.stageStates.map(stage => stage.status), ['已跳过', '等待中', '等待中']);
  retry = await petApi.startRun(retry.id);
  assert.deepEqual(retry.stageStates.map(stage => stage.status), ['已跳过', '运行中', '等待中']);
  while (retry.status === '运行中') retry = await petApi.advanceRun(retry.id);
  assert.equal(retry.status, '成功');
  assert.deepEqual(retry.stageStates.map(stage => stage.status), ['已跳过', '成功', '成功']);
});

test('run snapshots the configured build node and workspace independently of later edits', async () => {
  petApi.reset();
  await petApi.update('pipelines', 'pipe1', { buildNode: 'pet-linux', workspace: 'shared/ws' });
  const run = await petApi.runPipeline('pipe1');
  await petApi.update('pipelines', 'pipe1', { buildNode: 'pet-windows', workspace: 'other/ws' });
  assert.deepEqual(run.pipelineSnapshot.buildNode, 'pet-linux');
  assert.deepEqual(run.pipelineSnapshot.workspace, 'shared/ws');
  const persisted = (await petApi.snapshot()).runs.find(item => item.id === run.id);
  assert.equal(persisted.pipelineSnapshot.buildNode, 'pet-linux');
  assert.equal(persisted.pipelineSnapshot.workspace, 'shared/ws');
});

test('disabled and false-condition stages are skipped while stage execution options remain auditable', async () => {
  petApi.reset();
  await petApi.update('pipelines', 'pipe1', {
    stageList: [
      { id: 'disabled', name: '禁用阶段', disabled: true, steps: [] },
      { id: 'conditional', name: '条件阶段', conditionEnabled: true, condition: "${TARGET} == 'prod'", steps: [] },
      { id: 'build', name: '构建', useNode: true, nodes: ['pet-linux'], workspace: 'shared/build', retryEnabled: true, retries: 3, timeoutEnabled: true, timeout: 15, steps: [] },
    ],
  });
  let run = await petApi.runPipeline('pipe1', { TARGET: 'qa' });
  assert.deepEqual(run.stageStates.map(stage => stage.status), ['已禁用', '已跳过', '等待中']);
  assert.deepEqual({ ...run.stageStates[2], stepStates: undefined }, {
    id: 'build', name: '构建', status: '等待中', buildNodes: ['pet-linux'], workspace: 'shared/build', retry: 3, attempt: 0, timeoutMinutes: 15, stepStates: undefined,
  });
  assert.match(run.logs.join('\n'), /条件不满足，已跳过/);
  run = await petApi.startRun(run.id);
  assert.deepEqual(run.stageStates.map(stage => stage.status), ['已禁用', '已跳过', '运行中']);
  run = await petApi.advanceRun(run.id);
  assert.equal(run.status, '成功');
  assert.deepEqual(run.stageStates.map(stage => stage.status), ['已禁用', '已跳过', '成功']);
});

test('steps execute in card order and post steps run after terminal status including stop', async () => {
  petApi.reset();
  await petApi.update('pipelines', 'pipe1', {
    stageList: [{ id: 'build', name: '构建', steps: [
      { id: 'checkout', plugin: 'Gitlab代码检出' },
      { id: 'shell', plugin: 'Shell命令行' },
      { id: 'cleanup', plugin: '清理工作空间', config: { form: { POST_STEP: true } } },
    ] }],
  });
  let run = await petApi.runPipeline('pipe1');
  assert.deepEqual(run.stageStates[0].stepStates.map(step => step.plugin), ['Gitlab代码检出', 'Shell命令行']);
  run = await petApi.startRun(run.id);
  assert.deepEqual(run.stageStates[0].stepStates.map(step => step.status), ['运行中', '等待中']);
  run = await petApi.advanceRun(run.id);
  assert.deepEqual(run.stageStates[0].stepStates.map(step => step.status), ['成功', '运行中']);
  run = await petApi.advanceRun(run.id);
  assert.equal(run.status, '成功');
  assert.match(run.logs.join('\n'), /\[Step\] Gitlab代码检出 开始[\s\S]*\[Step\] Gitlab代码检出 成功[\s\S]*\[Step\] Shell命令行 开始[\s\S]*\[Post\] 清理工作空间 开始[\s\S]*\[Pipeline\] 成功/);

  const stopped = await petApi.runPipeline('pipe1');
  const terminal = await petApi.stopRun(stopped.id);
  assert.match(terminal.logs.join('\n'), /\[Post\] 清理工作空间 成功[\s\S]*\[Pipeline\] 已终止/);
});

test('explicit non-zero shell exit retries the stage then fails the pipeline and still runs post steps', async () => {
  petApi.reset();
  await petApi.update('pipelines', 'pipe1', {
    stageList: [
      { id: 'build', name: '构建', retryEnabled: true, retries: 2, steps: [
        { id: 'shell', plugin: 'Shell命令行', config: { form: { PARAMETERS: 'echo build; exit 1', FAILURE: '终止流水线' } } },
        { id: 'never', plugin: 'Bat命令行', config: { form: { PARAMETERS: 'echo never' } } },
        { id: 'post', plugin: '清理工作空间', config: { form: { POST_STEP: true } } },
      ] },
      { id: 'deploy', name: '部署', steps: [{ id: 'deploy-step', plugin: 'Shell命令行', config: { form: { PARAMETERS: 'echo deploy' } } }] },
    ],
  });
  let run = await petApi.runPipeline('pipe1');
  run = await petApi.startRun(run.id);
  while (run.status === '运行中') run = await petApi.advanceRun(run.id);
  assert.equal(run.status, '失败');
  assert.equal(run.stageStates[0].attempt, 3);
  assert.equal(run.stageStates[0].stepStates[1].status, '未执行');
  assert.equal(run.stageStates[1].status, '未执行');
  assert.match(run.logs.join('\n'), /准备重试 1\/2[\s\S]*准备重试 2\/2[\s\S]*\[Post\] 清理工作空间 成功[\s\S]*\[Pipeline\] 失败/);
});

test('continue-on-failure marks the failed step as ignored and executes following steps', async () => {
  petApi.reset();
  await petApi.update('pipelines', 'pipe1', {
    stageList: [{ id: 'build', name: '构建', steps: [
      { id: 'shell', plugin: 'Shell命令行', config: { form: { PARAMETERS: 'false', FAILURE: '继续执行' } } },
      { id: 'next', plugin: 'Shell命令行', config: { form: { PARAMETERS: 'echo next' } } },
    ] }],
  });
  let run = await petApi.runPipeline('pipe1');
  run = await petApi.startRun(run.id);
  while (run.status === '运行中') run = await petApi.advanceRun(run.id);
  assert.equal(run.status, '成功');
  assert.deepEqual(run.stageStates[0].stepStates.map(step => step.status), ['失败(已忽略)', '成功']);
  assert.match(run.logs.join('\n'), /已按配置继续执行[\s\S]*\[Step\] Shell命令行 开始/);
});

test('plugin outputs are persisted and resolve in a downstream command', async () => {
  petApi.reset();
  await petApi.update('pipelines', 'pipe1', {
    stageList: [{ id: 'quality', name: '质量', steps: [
      { id: 'scan', plugin: '质量扫描', config: { definition: { command: 'scan', outputs: [{ name: 'REPORT', valueTemplate: 'reports/result.xml' }] }, form: {} } },
      { id: 'upload', plugin: '报告上传', config: { definition: { command: 'upload ${REPORT}' }, form: {} } },
    ] }],
  });
  let run = await petApi.runPipeline('pipe1');
  run = await petApi.startRun(run.id);
  while (run.status === '运行中') run = await petApi.advanceRun(run.id);
  assert.equal(run.outputContext.REPORT, 'reports/result.xml');
  assert.equal(run.outputContext['质量扫描.REPORT'], 'reports/result.xml');
  assert.match(run.logs.join('\n'), /\[Output\] REPORT=reports\/result.xml[\s\S]*\[Command\] sh 'upload reports\/result.xml'/);
});
