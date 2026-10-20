const KEY = "pet-pipeline-mock-v2";
const seed = {
  pipelines: [
    {
      id: "build-trigger",
      name: "build-trigger",
      description: "构建触发演示流水线",
      engine: "Jenkins / build-engine",
      enabled: true,
      tags: ["默认"],
      trigger: {
        manual: true,
        commit: true,
        commitBranches: "main|develop",
        merge: false,
        mergeBranches: "main",
        tag: false,
        schedule: false,
        weekdays: [1, 2, 3, 4, 5],
        times: ["02:00"],
      },
      cleanup: { enabled: true, days: 30, count: 50 },
      parameters: [
        {
          id: "branch",
          type: "字符串",
          name: "BRANCH",
          defaultValue: "main",
          required: true,
          allowEmpty: false,
        },
        {
          id: "buildType",
          type: "单选",
          name: "BUILD_TYPE",
          defaultValue: "release",
          options: "debug\nrelease",
          required: true,
          allowEmpty: false,
        },
      ],
      workspace: {
        mode: "节点",
        node: "linux-build-demo",
        shared: true,
        name: "pet-build-trigger",
      },
      stages: [
        {
          id: "checkout",
          name: "代码准备",
          parallel: false,
          node: "linux-build-demo",
          retry: 1,
          timeout: 30,
          steps: [
            {
              id: "clean",
              plugin: "清理工作空间",
              name: "清理工作空间",
              config: { path: "${WORKSPACE}" },
            },
            {
              id: "checkout-step",
              plugin: "代码拉取",
              name: "代码拉取",
              config: { repository: "frontend-demo", branch: "${BRANCH}" },
            },
          ],
        },
        {
          id: "build",
          name: "编译与发布",
          parallel: false,
          node: "linux-build-demo",
          retry: 1,
          timeout: 60,
          steps: [
            {
              id: "compile",
              plugin: "代码编译",
              name: "代码编译",
              config: {
                version: "Tasking 6.3",
                projectPath: "./project",
                output: "release/",
              },
            },
            {
              id: "artifact",
              plugin: "上传制品",
              name: "上传制品",
              config: {
                repository: "release-packages",
                version: "${BUILD_VERSION}",
                mode: "新建",
                path: "release/**",
              },
            },
            {
              id: "notify",
              plugin: "消息通知",
              name: "消息通知",
              config: { channel: "企业微信", template: "流水线执行结果通知" },
            },
          ],
        },
      ],
      updated: "2026-09-09 17:01:53",
      lastStatus: "失败",
      lastNo: 84,
    },
  ],
  runs: [
    {
      id: "run-84",
      pipelineId: "build-trigger",
      number: 84,
      status: "失败",
      trigger: "手动触发",
      start: "2026-09-09 17:01:53",
      duration: "< 1s",
      wait: "< 1s",
      user: "demo-admin",
      params: { BRANCH: "main", BUILD_TYPE: "release" },
    },
  ],
};
const clone = (x) => JSON.parse(JSON.stringify(x));
function read() {
  try {
    const db = JSON.parse(localStorage.getItem(KEY)) || clone(seed);
    db.templates = db.templates || [];
    return db;
  } catch {
    const db = clone(seed);
    db.templates = [];
    return db;
  }
}
function write(v) {
  localStorage.setItem(KEY, JSON.stringify(v));
  return clone(v);
}
const pause = (v) => new Promise((r) => setTimeout(() => r(clone(v)), 120));
export const pipelineApi = {
  async snapshot() {
    return pause(read());
  },
  async savePipeline(p) {
    const db = read(),
      i = db.pipelines.findIndex((x) => x.id === p.id);
    if (i < 0) db.pipelines.unshift(p);
    else db.pipelines[i] = p;
    write(db);
    return pause(p);
  },
  async deletePipeline(id) {
    const db = read();
    db.pipelines = db.pipelines.filter((x) => x.id !== id);
    write(db);
    return pause(true);
  },
  async copyPipeline(id) {
    const db = read(),
      src = db.pipelines.find((x) => x.id === id),
      copy = {
        ...clone(src),
        id: `${id}-copy-${Date.now()}`,
        name: `${src.name}-copy`,
        lastStatus: "未构建",
        lastNo: 0,
        updated: "刚刚",
      };
    db.pipelines.unshift(copy);
    write(db);
    return pause(copy);
  },
  async saveTemplate(id) {
    const db = read(),
      src = db.pipelines.find((x) => x.id === id),
      item = {
        id: `personal-${Date.now()}`,
        name: `${src.name} 模板`,
        desc: src.description || "个人流水线模板",
        tone: "blue",
        pipeline: clone(src),
      };
    db.templates.unshift(item);
    write(db);
    return pause(item);
  },
  async runPipeline(id, params) {
    const db = read(),
      p = db.pipelines.find((x) => x.id === id),
      number = (p.lastNo || 0) + 1,
      run = {
        id: `run-${Date.now()}`,
        pipelineId: id,
        number,
        status: "运行中",
        trigger: "手动触发",
        start: new Date().toLocaleString("zh-CN", { hour12: false }),
        duration: "运行中",
        wait: "< 1s",
        user: "本地演示用户",
        params,
      };
    p.lastNo = number;
    p.lastStatus = "运行中";
    p.updated = run.start;
    db.runs.unshift(run);
    write(db);
    return pause(run);
  },
  async completeRun(runId, status = "成功") {
    const db = read(),
      run = db.runs.find((x) => x.id === runId);
    if (run) {
      run.status = status;
      run.duration = "2分34秒";
      const p = db.pipelines.find((x) => x.id === run.pipelineId);
      if (p) p.lastStatus = status;
    }
    write(db);
    return pause(run);
  },
  reset() {
    localStorage.removeItem(KEY);
  },
};
