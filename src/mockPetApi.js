import { getStageSteps } from "./pipelineStepModel.js";
import { materializePluginOutputs, resolvePluginRuntimeValue } from "./pluginExecutionModel.js";
import { stepToPipeline } from "./pipelineCompiler.js";

const KEY = "pet-full-replica-v2";
const runSchedulers = new Map();

const seed = {
  users: [
    {
      id: "u1",
      name: "demo-admin",
      displayName: "高磊",
      email: "demo-admin@example.com",
      organization: "研发中心",
      roles: "平台管理员",
      status: "正常",
    },
    {
      id: "u2",
      name: "zhangsan",
      displayName: "张三",
      email: "zhangsan@example.com",
      organization: "软件部",
      roles: "开发人员",
      status: "正常",
    },
  ],
  organizations: [
    {
      id: "o1",
      name: "研发中心",
      parent: "无",
      owner: "demo-admin",
      members: 18,
      description: "平台研发与工具链建设",
    },
    {
      id: "o2",
      name: "软件部",
      parent: "研发中心",
      owner: "zhangsan",
      members: 8,
      description: "产品软件开发",
    },
  ],
  roles: [
    {
      id: "r1",
      name: "平台管理员",
      scope: "平台",
      users: 1,
      permissions: "全部权限",
    },
    {
      id: "r2",
      name: "开发人员",
      scope: "项目",
      users: 12,
      permissions: "代码、流水线、制品读取与执行",
    },
  ],
  credentials: [
    {
      id: "c1",
      name: "GitLab 服务账号",
      type: "用户名密码",
      username: "pet-bot",
      scope: "全局",
      status: "可用",
    },
    {
      id: "c2",
      name: "构建机 SSH",
      type: "SSH 私钥",
      username: "builder",
      scope: "研发中心",
      status: "可用",
    },
  ],
  integrations: [
    {
      id: "i1",
      name: "公司 GitLab",
      type: "GitLab",
      url: "https://gitlab.example.com",
      credential: "GitLab 服务账号",
      status: "连接正常",
    },
    {
      id: "i2",
      name: "Jenkins 构建引擎",
      type: "Jenkins",
      url: "https://jenkins.example.com",
      credential: "构建机 SSH",
      status: "连接正常",
    },
  ],
  nodes: [
    {
      id: "n1",
      name: "linux-build-01",
      labels: "linux,x86_64,tasking",
      executor: 4,
      status: "在线",
      workspace: "/data/pet",
    },
    {
      id: "n2",
      name: "windows-test-01",
      labels: "windows,test",
      executor: 2,
      status: "维护中",
      workspace: "D:\\pet",
    },
  ],
  tools: [
    {
      id: "t1",
      name: "Tasking 编译器",
      version: "6.3r1",
      platform: "Linux",
      path: "/opt/tasking",
      status: "已发布",
    },
    {
      id: "t2",
      name: "Python",
      version: "3.11",
      platform: "通用",
      path: "/usr/bin/python3",
      status: "已发布",
    },
  ],
  scripts: [
    {
      id: "sc1",
      name: "build.sh",
      type: "Shell",
      organization: "研发中心",
      description: "通用 Linux 构建入口",
      content: "#!/bin/bash\nset -e\necho building ${JOB_NAME}",
    },
    {
      id: "sc2",
      name: "quality.py",
      type: "Python",
      organization: "软件部",
      description: "质量扫描脚本",
      content: "print('quality scan')",
    },
  ],
  alerts: [
    {
      id: "al1",
      server: "linux-build-01",
      metric: "CPU利用率",
      threshold: 85,
      channel: "企业微信",
      recipients: "demo-admin",
      title: "${NODE_NAME} ${ALTER_TYPE} 告警",
      enabled: true,
    },
  ],
  projects: [
    {
      id: "p1",
      name: "PET 演示项目",
      projectSet: "产品研发",
      owner: "demo-admin",
      members: 6,
      status: "进行中",
      description: "持续集成能力演示",
    },
    {
      id: "p2",
      name: "车载控制器",
      projectSet: "产品研发",
      owner: "zhangsan",
      members: 12,
      status: "进行中",
      description: "控制器软件项目",
    },
  ],
  projectSets: [
    {
      id: "ps1",
      name: "产品研发",
      owner: "demo-admin",
      description: "产品项目集合",
    },
    {
      id: "ps2",
      name: "平台研发",
      owner: "demo-admin",
      description: "平台与工具链项目",
    },
    {
      id: "ps3",
      name: "测试中心",
      owner: "zhangsan",
      description: "测试自动化项目",
    },
  ],
  repositories: [
    {
      id: "repo1",
      name: "pet-demo",
      type: "GitLab",
      integration: "公司 GitLab",
      url: "group/pet-demo.git",
      branch: "main",
      status: "已同步",
    },
    {
      id: "repo2",
      name: "ecu-platform",
      type: "Repo",
      integration: "公司 GitLab",
      url: "platform/manifest.git",
      branch: "develop",
      status: "已同步",
    },
  ],
  sourceRevisions: [
    {
      id: "sr1",
      name: "release-baseline",
      repository: "ecu-platform",
      revision: "refs/tags/v2.3.0",
      description: "ECU 平台发布基线",
      updated: "2026-09-10 16:20",
    },
  ],
  plugins: [
    {
      id: "pl1",
      name: "GitLab 代码检出",
      category: "代码管理",
      version: "2.1.0",
      source: "系统",
      status: "已发布",
      command: "git clone ${REPOSITORY}",
    },
    {
      id: "pl2",
      name: "Tasking 编译",
      category: "构建",
      version: "1.4.2",
      source: "自定义",
      status: "已发布",
      command: "ctc -o ${OUTPUT} ${PROJECT}",
    },
    {
      id: "pl3",
      name: "上传制品",
      category: "制品",
      version: "2.0.0",
      source: "系统",
      status: "已发布",
      command: "pet artifact upload ${PATH}",
    },
    {
      id: "pl4",
      name: "邮件通知",
      category: "通知",
      version: "1.2.0",
      source: "系统",
      status: "已发布",
      command: "pet notify --template ${TEMPLATE}",
    },
  ],
  composites: [
    {
      id: "cp1",
      name: "标准单元测试",
      category: "测试",
      organization: "研发中心",
      editors: "demo-admin",
      version: "1.2.0",
      steps: 3,
      status: "已发布",
      description: "执行单元测试、解析报告并生成覆盖率",
    },
    {
      id: "cp2",
      name: "静态扫描与质量门禁",
      category: "质量",
      organization: "软件部",
      editors: "demo-admin,zhangsan",
      version: "0.3.0",
      steps: 2,
      status: "暂存",
      description: "扫描代码并校验质量门禁",
    },
  ],
  pipelines: [
    {
      id: "pipe1",
      name: "build-trigger",
      project: "PET 演示项目",
      repository: "pet-demo",
      branch: "main",
      trigger: "手动 / Push",
      stages: 5,
      enabled: true,
      lastStatus: "成功",
      lastBuild: "#85",
      updated: "2026-09-11 22:30",
    },
    {
      id: "pipe2",
      name: "nightly-test",
      project: "车载控制器",
      repository: "ecu-platform",
      branch: "develop",
      trigger: "定时",
      stages: 4,
      enabled: true,
      lastStatus: "失败",
      lastBuild: "#31",
      updated: "2026-09-11 02:12",
    },
  ],
  runs: [
    {
      id: "run84",
      pipelineId: "pipe1",
      pipeline: "build-trigger",
      number: 84,
      status: "失败",
      trigger: "由demo-admin从平台触发",
      user: "demo-admin",
      started: "2026-09-09 17:01:53",
      duration: "< 1s",
      progress: 100,
      parameters: {},
      stageSnapshot: [
        { id: "checkout", name: "checkout", steps: [{ id: "gitlab", plugin: "Gitlab代码检出" }, { id: "unit", plugin: "单元测试" }] },
        { id: "test", name: "test", steps: [{ id: "qac", plugin: "QAC Test" }] },
        { id: "test2", name: "test2", steps: [{ id: "matlab", plugin: "Matlab模型生成代码" }] },
        { id: "tasking", name: "Tasking", steps: [{ id: "tasking-build", plugin: "Tasking编译" }, { id: "bat", plugin: "Bat命令行" }] },
      ],
    },
    {
      id: "run85",
      pipelineId: "pipe1",
      pipeline: "build-trigger",
      number: 85,
      status: "成功",
      trigger: "由demo-admin从平台触发",
      user: "demo-admin",
      started: "2026-09-11 22:28",
      duration: "2分14秒",
      progress: 100,
    },
    {
      id: "run31",
      pipelineId: "pipe2",
      pipeline: "nightly-test",
      number: 31,
      status: "失败",
      trigger: "定时触发",
      user: "system",
      started: "2026-09-11 02:10",
      duration: "1分48秒",
      progress: 100,
    },
  ],
  artifacts: [
    {
      id: "a1",
      name: "pet-demo",
      repository: "release-packages",
      version: "1.0.85",
      file: "pet-demo.zip",
      size: "18.6 MB",
      pipeline: "build-trigger #85",
      created: "2026-09-11 22:30",
    },
  ],
  notifications: [
    {
      id: "msg1",
      level: "成功",
      title: "流水线 build-trigger #85 构建成功",
      time: "2分钟前",
    },
    {
      id: "msg2",
      level: "失败",
      title: "流水线 nightly-test #31 构建失败",
      time: "20小时前",
    },
  ],
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const evaluateStageCondition = (stage, parameters) => {
  if (!stage.conditionEnabled) return true;
  const expression = String(stage.condition || "").trim();
  if (!expression) return true;
  if (/^true$/i.test(expression)) return true;
  if (/^false$/i.test(expression)) return false;
  const match = expression.match(/^\$\{([A-Za-z0-9_]+)\}\s*(==|!=)\s*['"]([^'"]*)['"]$/);
  if (!match) return true;
  const [, key, operator, expected] = match;
  const equal = String(parameters[key] ?? "") === expected;
  return operator === "==" ? equal : !equal;
};

const initialStageState = (stage, parameters) => {
  const status = stage.disabled ? "已禁用" : evaluateStageCondition(stage, parameters) ? "等待中" : "已跳过";
  return {
    id: stage.id,
    name: stage.name,
    status,
    buildNodes: clone(stage.useNode ? stage.nodes || [] : []),
    workspace: stage.useNode ? stage.workspace || "" : "",
    retry: stage.retryEnabled ? Number(stage.retries) || 1 : 0,
    attempt: 0,
    timeoutMinutes: stage.timeoutEnabled ? Number(stage.timeout) || 60 : 0,
    stepStates: getStageSteps(stage)
      .filter((step) => !step.config?.form?.POST_STEP)
      .map((step) => {
        const script = String(step.config?.form?.PARAMETERS || "");
        return {
          id: step.id,
          plugin: step.plugin,
          status: status === "等待中" ? "等待中" : status,
          failurePolicy: step.config?.form?.FAILURE || "终止流水线",
          mockFailure: ["Shell命令行", "Bat命令行", "Groovy命令行"].includes(step.plugin)
            && /(^|[;&\n]\s*)(exit\s+(\/b\s+)?[1-9]\d*|false\b|throw\b)/im.test(script),
          command: stepToPipeline(step),
          outputs: clone(step.config?.definition?.outputs || []),
        };
      }),
  };
};

const startStage = (stage, logs, outputContext = {}) => {
  stage.status = "运行中";
  stage.attempt = Number(stage.attempt || 0) + 1;
  logs.push(`[Stage] ${stage.name} 开始${stage.attempt > 1 ? `（第 ${stage.attempt} 次尝试）` : ""}`);
  const firstStep = (stage.stepStates || []).find((step) => step.status === "等待中");
  if (firstStep) {
    firstStep.status = "运行中";
    logs.push(`[Step] ${firstStep.plugin} 开始`);
    if (firstStep.command) logs.push(`[Command] ${resolvePluginRuntimeValue(firstStep.command, outputContext)}`);
  }
};

const postStepNames = (run) => (run.stageSnapshot || [])
  .flatMap(getStageSteps)
  .filter((step) => step.config?.form?.POST_STEP)
  .map((step) => step.plugin);
const load = () => {
  try {
    const db = {
      ...clone(seed),
      ...JSON.parse(localStorage.getItem(KEY) || "{}"),
    };
    if (!(db.runs || []).some((item) => item.id === "run84")) {
      db.runs = [clone(seed.runs.find((item) => item.id === "run84")), ...(db.runs || [])];
    }
    [
      "users",
      "organizations",
      "roles",
      "credentials",
      "integrations",
      "nodes",
      "tools",
      "scripts",
      "projects",
      "projectSets",
      "repositories",
      "sourceRevisions",
      "plugins",
      "composites",
      "pipelines",
    ].forEach((entity) => {
      const seen = new Set();
      db[entity] = (db[entity] || []).filter((item) => {
        const key = String(item.name || item.id)
          .trim()
          .toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
    return db;
  } catch {
    return clone(seed);
  }
};
const save = (db) => localStorage.setItem(KEY, JSON.stringify(db));
const wait = (value) =>
  new Promise((resolve) => setTimeout(() => resolve(clone(value)), 180));

export const petApi = {
  async snapshot() {
    return wait(load());
  },
  async create(entity, value) {
    const db = load();
    value.id ||= `${entity}-${Date.now()}`;
    db[entity] = [value, ...(db[entity] || [])];
    save(db);
    return wait(value);
  },
  async update(entity, id, patch) {
    const db = load();
    let index = db[entity].findIndex((x) => x.id === id);
    if (index >= 0) db[entity][index] = { ...db[entity][index], ...patch };
    else {
      db[entity].unshift({ id, ...patch });
      index = 0;
    }
    save(db);
    return wait(db[entity][index]);
  },
  async remove(entity, id) {
    const db = load();
    db[entity] = db[entity].filter((x) => x.id !== id);
    save(db);
    return wait(true);
  },
  async testIntegration(id) {
    const db = load();
    const item = db.integrations.find((x) => x.id === id);
    if (item) {
      item.status = item.url && item.credential ? "连接正常" : "连接失败";
      item.lastTest = new Date().toLocaleString("zh-CN", { hour12: false });
      item.testMessage =
        item.status === "连接正常" ? "握手与鉴权成功" : "请补充服务地址和凭证";
    }
    save(db);
    return wait(item);
  },
  async toggleNode(id) {
    const db = load();
    const item = db.nodes.find((x) => x.id === id);
    if (item) item.status = item.status === "维护中" ? "在线" : "维护中";
    save(db);
    return wait(item);
  },
  async runPipeline(id, parameters = {}) {
    const db = load();
    const pipeline = db.pipelines.find((x) => x.id === id);
    if (!pipeline) throw new Error("流水线不存在，无法开始构建");
    if (pipeline.enabled === false)
      throw new Error("流水线已停用，无法开始构建");
    const number =
      Math.max(
        0,
        ...db.runs.filter((x) => x.pipelineId === id).map((x) => x.number),
      ) + 1;
    const run = {
      id: `run-${Date.now()}`,
      pipelineId: id,
      pipeline: pipeline.name,
      number,
      status: "队列中",
      trigger: "由demo-admin从平台触发",
      user: "demo-admin",
      started: new Date().toLocaleString("zh-CN", { hour12: false }),
      duration: "排队中",
      waitDuration: "< 1s",
      progress: 0,
      outputContext: {},
      parameters: clone(parameters),
      parameterDefinitions: clone(pipeline.params || pipeline.parameters || []),
      // A build must remain auditable even when the pipeline is edited later.
      stageSnapshot: clone(pipeline.stageList || []),
      pipelineScript: pipeline.pipelineScript || "",
      stageStates: (pipeline.stageList || []).map((stage) => initialStageState(stage, parameters)),
      logs: [
        "[Pipeline] 已进入构建队列",
        ...(pipeline.stageList || []).filter((stage) => stage.disabled).map((stage) => `[Stage] ${stage.name} 已禁用`),
        ...(pipeline.stageList || []).filter((stage) => !stage.disabled && !evaluateStageCondition(stage, parameters)).map((stage) => `[Stage] ${stage.name} 条件不满足，已跳过`),
      ],
      pipelineSnapshot: {
        label: pipeline.label || "",
        repository: pipeline.repository || "",
        branch: pipeline.branch || "",
        buildNode: pipeline.buildNode || "",
        workspace: pipeline.workspace || "",
      },
    };
    db.runs.unshift(run);
    pipeline.lastStatus = "队列中";
    pipeline.lastBuild = `#${number}`;
    pipeline.updated = run.started;
    save(db);
    return wait(run);
  },
  async startRun(id) {
    const db = load();
    const run = db.runs.find((item) => item.id === id);
    if (!run || run.status !== "队列中") return run ? wait(run) : null;
    const stageStates = run.stageStates || [];
    const firstRunnable = stageStates.find((stage) => stage.status === "等待中");
    const nextLogs = [...(run.logs || []), "[Pipeline] 开始执行"];
    if (firstRunnable) startStage(firstRunnable, nextLogs, run.outputContext || {});
    Object.assign(run, {
      status: "运行中",
      duration: "运行中",
      progress: stageStates.length ? 1 : 99,
      stageStates,
      logs: nextLogs,
    });
    const pipeline = db.pipelines.find((item) => item.id === run.pipelineId);
    if (pipeline?.lastBuild === `#${run.number}`) pipeline.lastStatus = run.status;
    save(db);
    return wait(run);
  },
  async advanceRun(id) {
    const db = load();
    const run = db.runs.find((item) => item.id === id);
    if (!run || run.status !== "运行中") return run ? wait(run) : null;
    const states = run.stageStates || [];
    const currentIndex = states.findIndex((stage) => stage.status === "运行中");
    if (currentIndex >= 0) {
      const currentStage = states[currentIndex];
      const runningStepIndex = (currentStage.stepStates || []).findIndex((step) => step.status === "运行中");
      if (runningStepIndex >= 0) {
        const runningStep = currentStage.stepStates[runningStepIndex];
        if (runningStep.mockFailure) {
          runningStep.status = "失败";
          run.logs = [...(run.logs || []), `[Step] ${runningStep.plugin} 失败（Mock 非零退出）`];
          if (runningStep.failurePolicy === "继续执行") {
            runningStep.status = "失败(已忽略)";
            run.logs.push(`[Step] ${runningStep.plugin} 已按配置继续执行`);
          } else if (currentStage.attempt <= currentStage.retry) {
            currentStage.stepStates = currentStage.stepStates.map((step) => ({ ...step, status: "等待中" }));
            run.logs.push(`[Stage] ${currentStage.name} 准备重试 ${currentStage.attempt}/${currentStage.retry}`);
            startStage(currentStage, run.logs);
            save(db);
            return wait(run);
          } else {
            currentStage.status = "失败";
            currentStage.stepStates = currentStage.stepStates.map((step) => ({
              ...step,
              status: step.status === "等待中" ? "未执行" : step.status,
            }));
            states.forEach((stage, index) => {
              if (index <= currentIndex || ["已禁用", "已跳过"].includes(stage.status)) return;
              stage.status = "未执行";
              stage.stepStates = (stage.stepStates || []).map((step) => ({ ...step, status: "未执行" }));
            });
            run.logs.push(`[Stage] ${currentStage.name} 失败，流水线终止`);
            save(db);
            return this.finishRun(id, false, { duration: `${Math.max(1, currentStage.attempt)}秒` });
          }
        }
        if (runningStep.status !== "失败(已忽略)") {
        runningStep.status = "成功";
        run.logs = [...(run.logs || []), `[Step] ${runningStep.plugin} 成功`];
        }
        const generatedOutputs = materializePluginOutputs(runningStep.plugin, runningStep.outputs, run.outputContext || {});
        if (Object.keys(generatedOutputs).length) {
          run.outputContext = { ...(run.outputContext || {}), ...generatedOutputs };
          Object.entries(generatedOutputs).filter(([key]) => !key.includes(".")).forEach(([key, value]) => run.logs.push(`[Output] ${key}=${value}`));
        }
        const nextStep = currentStage.stepStates.find((step, index) => index > runningStepIndex && step.status === "等待中");
        if (nextStep) {
          nextStep.status = "运行中";
          run.logs.push(`[Step] ${nextStep.plugin} 开始`);
          if (nextStep.command) run.logs.push(`[Command] ${resolvePluginRuntimeValue(nextStep.command, run.outputContext || {})}`);
          save(db);
          return wait(run);
        }
      }
      currentStage.status = "成功";
      run.logs = [...(run.logs || []), `[Stage] ${currentStage.name} 成功`];
    }
    const nextIndex = states.findIndex((stage, index) => index > currentIndex && stage.status === "等待中");
    if (states[nextIndex]) {
      startStage(states[nextIndex], run.logs, run.outputContext || {});
      run.progress = Math.max(1, Math.round((nextIndex / states.length) * 100));
      save(db);
      return wait(run);
    }
    run.progress = 99;
    run.logs.push("[Pipeline] 所有阶段执行完成");
    save(db);
    return this.finishRun(id, true, { duration: `${Math.max(1, states.length * 2)}秒` });
  },
  scheduleRun(id) {
    if (runSchedulers.has(id)) return;
    const tick = async () => {
      const current = load().runs.find((item) => item.id === id);
      if (!current || !["队列中", "运行中"].includes(current.status)) {
        clearInterval(runSchedulers.get(id));
        runSchedulers.delete(id);
        return;
      }
      if (current.status === "队列中") await this.startRun(id);
      else await this.advanceRun(id);
    };
    const timer = setInterval(tick, 1000);
    runSchedulers.set(id, timer);
    void tick();
  },
  resumeActiveRuns() {
    const ids = load().runs
      .filter((run) => ["队列中", "运行中"].includes(run.status))
      .map((run) => run.id);
    ids.forEach((id) => this.scheduleRun(id));
    return ids;
  },
  cancelRunSchedule(id) {
    const timer = runSchedulers.get(id);
    if (timer) clearInterval(timer);
    runSchedulers.delete(id);
  },
  async finishRun(id, success = true, options = {}) {
    const db = load();
    const run = db.runs.find((x) => x.id === id);
    if (!run) return null;
    // Terminal results are immutable: stale completion timers cannot undo a stop.
    if (!["队列中", "运行中"].includes(run.status)) return wait(run);
    run.status = options.status || (success ? "成功" : "失败");
    run.progress = 100;
    run.duration = options.duration || "18秒";
    run.stageStates = (run.stageStates || []).map((stage) => {
      const status = run.status === "成功"
        ? (["已跳过", "已禁用"].includes(stage.status) ? stage.status : "成功")
        : stage.status === "运行中" ? run.status : stage.status;
      return {
        ...stage,
        status,
        stepStates: (stage.stepStates || []).map((step) => ({
          ...step,
          status: run.status === "成功"
            ? (["已跳过", "已禁用", "失败(已忽略)"].includes(step.status) ? step.status : "成功")
            : step.status === "运行中" ? run.status : step.status,
        })),
      };
    });
    const postLogs = postStepNames(run).flatMap((plugin) => [`[Post] ${plugin} 开始`, `[Post] ${plugin} 成功`]);
    run.logs = [...(run.logs || []), ...postLogs, `[Pipeline] ${run.status}`];
    const pipeline = db.pipelines.find((x) => x.id === run.pipelineId);
    if (pipeline?.lastBuild === `#${run.number}`) pipeline.lastStatus = run.status;
    db.notifications.unshift({
      id: `m-${Date.now()}`,
      level: run.status,
      title: `流水线 ${run.pipeline} #${run.number} 构建${run.status}`,
      time: "刚刚",
    });
    save(db);
    return wait(run);
  },
  async stopRun(id) {
    this.cancelRunSchedule(id);
    return this.finishRun(id, false, {
      status: "已终止",
      duration: "人工终止",
    });
  },
  async retryRun(id, parameters) {
    const db = load();
    const previous = db.runs.find((x) => x.id === id);
    if (!previous) return null;
    const requested = clone(parameters || previous.parameters || {});
    const restartFrom = requested.__restartFrom;
    delete requested.__restartFrom;
    const next = await this.runPipeline(
      previous.pipelineId,
      requested,
    );
    const refreshed = load(),
      run = refreshed.runs.find((x) => x.id === next.id);
    run.retryOf = previous.number;
    run.trigger = `重新构建 #${previous.number}`;
    if (restartFrom) {
      const restartIndex = (run.stageStates || []).findIndex((stage) => stage.name === restartFrom || stage.id === restartFrom);
      if (restartIndex >= 0) {
        run.retryFromStage = run.stageStates[restartIndex].name;
        run.stageStates = run.stageStates.map((stage, index) => {
          const status = index < restartIndex
            ? "已跳过"
            : ["已禁用", "已跳过"].includes(stage.status) ? stage.status : "等待中";
          return {
            ...stage,
            status,
            stepStates: (stage.stepStates || []).map((step) => ({
              ...step,
              status: status === "等待中" ? "等待中" : status,
            })),
          };
        });
        run.logs = [...(run.logs || []), `[Pipeline] 从阶段 ${run.retryFromStage} 重新执行`, ...run.stageStates.filter((stage) => stage.status === "已跳过").map((stage) => `[Stage] ${stage.name} 已跳过`)];
      }
    }
    save(refreshed);
    return wait(run);
  },
  reset() {
    runSchedulers.forEach((timer) => clearInterval(timer));
    runSchedulers.clear();
    localStorage.removeItem(KEY);
  },
};
