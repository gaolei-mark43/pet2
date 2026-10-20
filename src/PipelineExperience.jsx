import React, { useEffect, useMemo, useRef, useState } from "react";
import { graphGroups, insertParallelStage, insertSerialStage, normalizeGraphStages, removeGraphStage } from "./pipelineGraphModel.js";
import { getStageSteps, insertStageStep, removeStageStep, updateStageStep } from "./pipelineStepModel.js";
import { generatePipelineScript, parsePipelineStages, resolvePipelineVariables, validatePipelineScript } from "./pipelineCompiler.js";
import {
  copyPipelineData,
  pipelineEditorInitialState,
  templateFromPipeline,
} from "./pipelineReuseModel.js";
import { initialBuildParameters, parameterChoices, validateBuildParameters } from "./buildParameterModel.js";
import { runStatusClass, runStatusSymbol, stageRuntimeState, stepRuntimeStatus } from "./runPresentation.js";
import "./run-branch.css";
import { petApi } from "./mockPetApi.js";
import { observedPluginCatalog as basePlugins, mergePluginCatalog } from "./observedPluginCatalog.js";
import { PipelinePluginConfig as PluginConfig } from "./PipelinePluginConfig.jsx";
import { boundPipelineParameters } from "./pluginLifecycleModel.js";
import {
  ArrowLeft,
  Boxes,
  Check,
  ChevronDown,
  CircleHelp,
  Code2,
  Expand,
  GitBranch,
  Grid2X2,
  Info,
  Languages,
  Menu,
  Minus,
  PackageOpen,
  Pencil,
  Plus,
  Puzzle,
  Gauge,
  RefreshCcw,
  Repeat2,
  Save,
  Search,
  Settings2,
  SlidersHorizontal,
  UserRoundCog,
  X,
} from "lucide-react";

const stagesSeed = [
  { id: "1-1", name: "清理工作空间", plugin: "清理工作空间", steps: [{ id: "seed-clean", plugin: "清理工作空间", config: { form: {} } }] },
  { id: "2-1", name: "代码检出", plugin: "Gitlab代码检出", steps: [{ id: "seed-checkout", plugin: "Gitlab代码检出", config: { form: { REPOSITORY: "mock-project.git", BRANCH: "main" }, definition: { command: "git clone --branch ${BRANCH} ${REPOSITORY}" } } }] },
  { id: "3-1", name: "编译", plugin: "Tasking编译", steps: [{ id: "seed-build", plugin: "Tasking编译", config: { form: { PROJECT_PATH: "project.pjt", OUTPUT_DIR: "build" }, definition: { command: "ctc -g -O2 -o ${OUTPUT_DIR} ${PROJECT_PATH}" } } }] },
  { id: "4-1", name: "测试", plugin: "Bat命令行", steps: [{ id: "seed-test", plugin: "Bat命令行", config: { form: { PARAMETERS: "run-tests.bat" }, definition: { command: "${PARAMETERS}" } } }] },
  { id: "5-1", name: "报告上传", plugin: "上传CodeBeamer报告", steps: [{ id: "seed-report", plugin: "上传CodeBeamer报告", config: { form: { REPORT_PATH: "reports/test-results.xml" } } }] },
];

function RunStageCard({ stage, state, start = false, status = "等待中" }) {
  return (
    <div className={`official-run-stage branch-card ${start ? "branch-start" : ""} ${runStatusClass(status)}`} title={`${stage.name}：${status}`}>
      <strong>{runStatusSymbol(status)}</strong>
      <span>{stage.name}</span>
      {!start && getStageSteps(stage).map((step) => (
        <small key={step.id || step.plugin} className={`run-step-state ${runStatusClass(stepRuntimeStatus(state, step))}`} title={`${step.plugin}：${stepRuntimeStatus(state, step)}`} aria-label={`${step.plugin}，${stepRuntimeStatus(state, step)}`}>{step.plugin}</small>
      ))}
    </div>
  );
}

const downloadTextFile = (filename, content) => {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const readPipelineGlobalConfig = (storageKey) => {
  try {
    return JSON.parse(localStorage.getItem(`pet-pipeline-global:${storageKey}`)) || {};
  } catch {
    return {};
  }
};

const systemParams = [
  ["JOB_NAME", "当前流水线到名称"],
  ["BUILD_NUMBER", "当前流水线的构建编号"],
  ["BUILD_URL", "当前流水的构建地址"],
  ["BUILD_RESULT", "当前流水线的构建结果（以构建最终结果为准）"],
  ["TRIGGER_TYPE", "当前流水线的触发类型（Gitlab、Gerrit、Topic）"],
  [
    "APPLY_PATCH",
    "流水线触发时的提交号（仅通过gerrit触发可用，当topic触发时，可能存在多个提交号）",
  ],
  ["GERRIT_TOPIC", "流水线触发时的topic值（仅通过gerrit的topic触发时可用）"],
  ["CHANGE_REPO", "当前流水线触发时的仓库（仅仓库源触发可用）"],
  ["CHANGE_BRANCH", "当前流水线触发时的分支（仅仓库源触发可用）"],
  ["CHANGE_OWNER", "当前流水线触发时的提交人（仅仓库源触发可用）"],
  ["MANIFEST_XML", "Repo仓库触发时的manifest.xml名字（仅Repo触发可用）"],
  ["REPO_REMOTEURL", "当前流水线触发时的仓库远程地址（仅仓库源触发时可用）"],
  ["GERRIT_PATCHSET", "当前流水线触发时的PATCHSET（仅Gerrit仓库源触发时可用）"],
  [
    "GERRIT_PATCHSET_NUMBER",
    "当前流水线触发时的PATCHSET号（仅Gerrit仓库源触发时可用）",
  ],
  [
    "GERRIT_CHANGE_NUMBER",
    "当前流水线触发时的变更编号（仅Gerrit仓库源触发时可用）",
  ],
  ["TARGET_BRANCH", "merge quest触发时的目标分支（仅Gitlab Merge触发时可用）"],
  ["COMMIT_MSG", "流水线触发时的提交消息（gitlab为最后一笔提交的提交信息）"],
  ["GITLAB_REVISION_HASH", "流水线触发时的commit值（仅gitlab触发可用，为最后一笔提交号）"],
  ["GITLAB_COMMIT_IDS", "流水线触发时的所有commit值，以逗号分隔（仅gitlab触发可用）"],
];


function IconButton({ children, ...props }) {
  return (
    <button className="icon-button" {...props}>
      {children}
    </button>
  );
}

function Shell({ children }) {
  const go = (route) => {
    location.hash = route;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };
  return (
    <div className="pet-app">
      <aside className="global-sidebar">
        <div className="pet-brand">
          <b>PET</b>
          <Menu size={19} />
        </div>
        <nav>
          <button className="active" onClick={() => go("projects")}>
            <Grid2X2 />
            <span>项目管理</span>
          </button>
          <button onClick={() => go("repositories")}>
            <Boxes />
            <span>资源管理</span>
          </button>
          <button onClick={() => go("plugins")}>
            <SlidersHorizontal />
            <span>插件管理</span>
          </button>
          <button onClick={() => go("users")}>
            <UserRoundCog />
            <span>用户管理</span>
          </button>
        </nav>
      </aside>
      <section className="pet-workspace">
        <header className="global-header">
          <button
            className="project-name"
            onClick={() =>
              document.querySelector('[aria-label="切换项目"]')?.click()
            }
          >
            演示项目/buildTrigger <ChevronDown size={16} />
          </button>
          <nav>
            <button onClick={() => go("overview")}>项目概览</button>
            <button onClick={() => go("repositories")}>代码仓库</button>
            <button className="active" onClick={() => go("pipelines")}>
              流水线
            </button>
            <button onClick={() => go("artifacts")}>制品库</button>
            <button onClick={() => go("projects")}>项目设置</button>
          </nav>
          <div className="header-tools">
            <button
              onClick={() =>
                document.querySelector('[aria-label="全局搜索"]')?.click()
              }
            >
              <Search size={18} />
              全局搜索
            </button>
            <button
              onClick={() =>
                (document.documentElement.lang =
                  document.documentElement.lang === "en" ? "zh-CN" : "en")
              }
              aria-label="切换语言"
            >
              <Languages />
            </button>
            <button onClick={() => go("artifacts")} aria-label="打开制品库">
              <PackageOpen />
            </button>
            <a
              href="https://example.invalid/doc/docs/01-%E4%BA%A7%E5%93%81%E6%A6%82%E8%BF%B0.html"
              target="_blank"
              rel="noreferrer"
              aria-label="帮助文档"
            >
              <CircleHelp />
            </a>
            <i>3</i>
            <b>demo-admin</b>
          </div>
        </header>
        {children}
      </section>
    </div>
  );
}

function Toast({ show, children }) {
  return show ? (
    <div className="pet-toast">
      <Check size={16} />
      {children}
    </div>
  ) : null;
}

export default function PipelineExperience({ onDataChange, onClose }) {
  const selected = useMemo(() => {
    try {
      return (
        JSON.parse(sessionStorage.getItem("pet-selected-pipeline")) || {
          id: "demo",
          name: "222666",
        }
      );
    } catch {
      return { id: "demo", name: "222666" };
    }
  }, []);
  const storageKey = `pet-exact-pipeline-${selected.id}`;
  const saved = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || {};
    } catch {
      return {};
    }
  }, [storageKey]);
  const initial = useMemo(
    () => pipelineEditorInitialState(saved, selected),
    [saved, selected],
  );
  const [tab, setTab] = useState(() => {
    const requested = sessionStorage.getItem("pet-pipeline-initial-tab");
    sessionStorage.removeItem("pet-pipeline-initial-tab");
    return ["base", "graph", "script", "params"].includes(requested) ? requested : "base";
  });
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [priority, setPriority] = useState(initial.priority);
  const [cleanup, setCleanup] = useState(initial.cleanup);
  const [label, setLabel] = useState(initial.label);
  const [repoTrigger, setRepoTrigger] = useState(initial.repoTrigger);
  const [repoTypes, setRepoTypes] = useState(initial.repoTypes);
  const [days, setDays] = useState(initial.days);
  const [scheduleTime, setScheduleTime] = useState(initial.scheduleTime);
  const [upstream, setUpstream] = useState(initial.upstream);
  const [drawer, setDrawer] = useState(null);
  const [params, setParams] = useState(
    saved.params ?? selected.parameters ?? [],
  );
  const [stages, setStages] = useState(
    selected.stageList?.length
      ? selected.stageList
      : (saved.stages ??
          (selected.template === "新空白模板" ? [] : stagesSeed)),
  );
  const stagesRef = useRef(stages);
  stagesRef.current = stages;
  const [toast, setToast] = useState("");
  const [operation, setOperation] = useState(false);
  const [operationDialog, setOperationDialog] = useState(null);
  const [buildOpen, setBuildOpen] = useState(false);
  const [buildInitial, setBuildInitial] = useState({});
  const [building, setBuilding] = useState(false);
  const [activeRun, setActiveRun] = useState(null);
  const [runHistory, setRunHistory] = useState([]);
  const buildTimersRef = useRef([]);
  const [zoom, setZoom] = useState(1);
  const [pendingLeave, setPendingLeave] = useState(null);
  const generatedScript = useMemo(() => generatePipelineScript(name, stages), [name, stages]);
  const pipelineScript = generatedScript;
  const currentSignature = JSON.stringify({
    name,
    label,
    description,
    priority,
    cleanup,
    repoTrigger,
    repoTypes,
    days,
    scheduleTime,
    upstream,
    params,
    stages,
  });
  const savedSignatureRef = useRef(currentSignature);
  const savedStateRef = useRef({
    name,
    label,
    description,
    priority,
    cleanup,
    repoTrigger,
    repoTypes,
    days,
    scheduleTime,
    upstream,
    params,
    stages,
  });
  const isDirty = currentSignature !== savedSignatureRef.current;
  const notify = (text) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 1800);
  };
  useEffect(() => {
    if (!activeRun?.id || !["队列中", "运行中"].includes(activeRun.status)) return undefined;
    const runId = activeRun.id;
    petApi.scheduleRun(runId);
    const timer = window.setInterval(async () => {
      const next = (await petApi.snapshot()).runs.find((item) => item.id === runId);
      if (!next) return;
      setActiveRun((current) => current?.id === runId ? { ...current, ...next } : current);
      setRunHistory((current) => current.map((item) => item.id === runId ? { ...item, ...next } : item));
    }, 350);
    buildTimersRef.current = [timer];
    return () => window.clearInterval(timer);
  }, [activeRun?.id]);
  const save = async () => {
    if (!name.trim()) {
      notify("流水线名称不能为空");
      return false;
    }
    const globalConfig = readPipelineGlobalConfig(selected.id || selected.name);
    const config = {
      name,
      label,
      description,
      priority,
      cleanup,
      repoTrigger,
      repoTypes,
      days,
      scheduleTime,
      upstream,
      params,
      stages: stagesRef.current,
      pipelineScript,
      buildNode: (globalConfig.nodes || []).join(","),
      workspace: globalConfig.workspace || "",
    };
    localStorage.setItem(storageKey, JSON.stringify(config));
    await petApi.update("pipelines", selected.id, {
      ...config,
      stages: stagesRef.current.length,
      stageList: stagesRef.current,
      updated: "刚刚",
    });
    savedSignatureRef.current = JSON.stringify({
      name,
      label,
      description,
      priority,
      cleanup,
      repoTrigger,
      repoTypes,
      days,
      scheduleTime,
      upstream,
      params,
      stages: stagesRef.current,
    });
    savedStateRef.current = {
      name,
      label,
      description,
      priority,
      cleanup,
      repoTrigger,
      repoTypes,
      days,
      scheduleTime,
      upstream,
      params,
      stages: stagesRef.current,
    };
    notify("流水线配置已保存");
    return true;
  };
  const restoreSavedState = () => {
    const snapshot = savedStateRef.current;
    setName(snapshot.name);
    setLabel(snapshot.label);
    setDescription(snapshot.description);
    setPriority(snapshot.priority);
    setCleanup(snapshot.cleanup);
    setRepoTrigger(snapshot.repoTrigger);
    setRepoTypes(snapshot.repoTypes);
    setDays(snapshot.days);
    setScheduleTime(snapshot.scheduleTime);
    setUpstream(snapshot.upstream);
    setParams(snapshot.params);
    setStages(snapshot.stages);
  };
  const leaveToTab = (id) => {
    if (id === tab) return;
    if (isDirty) {
      setPendingLeave({ type: "tab", id });
      return;
    }
    setTab(id);
    setDrawer(null);
    setOperation(false);
  };
  const leaveEditor = () => {
    if (isDirty) {
      setPendingLeave({ type: "close" });
      return;
    }
    onClose?.();
  };
  const confirmLeave = () => {
    const action = pendingLeave;
    setPendingLeave(null);
    restoreSavedState();
    if (action?.type === "tab") {
      setTab(action.id);
      setDrawer(null);
      setOperation(false);
    } else if (action?.type === "close") onClose?.();
  };
  const openLastRun = async () => {
    const db = await petApi.snapshot();
    const history = db.runs
      .filter(
        (item) => item.pipelineId === selected.id || item.pipeline === selected.name || item.pipeline === name,
      )
      .sort((a, b) => Number(b.number || 0) - Number(a.number || 0));
    const latest = history[0];
    if (!latest) {
      notify("该流水线暂无构建记录");
      return;
    }
    setRunHistory(history);
    setActiveRun({ ...latest, progress: latest.progress ?? 100 });
  };
  const handleOpenLastRun = () => {
    void openLastRun();
  };
  const run = async (buildParameters = {}, retrySource = null) => {
    buildTimersRef.current.forEach((timer) => window.clearInterval(timer));
    buildTimersRef.current = [];
    setBuilding(true);
    try {
    const globalConfig = readPipelineGlobalConfig(selected.id || selected.name);
    await petApi.update("pipelines", selected.id, {
      name,
      label,
      enabled: true,
      params,
      stages: stagesRef.current.length,
      stageList: stagesRef.current,
      pipelineScript,
      buildNode: (globalConfig.nodes || []).join(","),
      workspace: globalConfig.workspace || "",
    });
    const r = retrySource
      ? await petApi.retryRun(retrySource.id, buildParameters)
      : await petApi.runPipeline(selected.id, buildParameters);
    const runtimeValues = {
      JOB_NAME: name,
      BUILD_NUMBER: r.number,
      BUILD_URL: `mock://pipelines/${selected.id}/builds/${r.number}`,
      ...Object.fromEntries(params.map((item) => [item.name, item.defaultValue ?? ""])),
      ...buildParameters,
    };
    const runtimeScript = resolvePipelineVariables(pipelineScript || generatedScript, runtimeValues);
    await petApi.update("runs", r.id, { pipelineScript: runtimeScript, parameters: buildParameters });
    await onDataChange?.();
    setBuildOpen(false);
    setBuilding(false);
    setActiveRun({ ...r, pipelineScript: runtimeScript, parameters: buildParameters, status: "队列中", progress: 0 });
    setRunHistory((current) => [{ ...r, pipelineScript: runtimeScript, parameters: buildParameters, status: "队列中", progress: 0 }, ...current.filter((item) => item.id !== r.id)]);
    petApi.scheduleRun(r.id);
    notify(`构建 #${r.number} 已进入队列`);
    } catch (error) {
      setBuilding(false);
      notify(error?.message || "构建创建失败");
    }
  };
  const stopActiveRun = async () => {
    if (!activeRun || activeRun.progress >= 100) return;
    buildTimersRef.current.forEach((timer) => window.clearInterval(timer));
    buildTimersRef.current = [];
    const stopped = await petApi.stopRun(activeRun.id);
    setActiveRun({ ...stopped, progress: 100 });
    setRunHistory((current) => current.map((item) => item.id === stopped.id ? { ...item, ...stopped, progress: 100 } : item));
    notify(`构建 #${activeRun.number} 已终止`);
  };
  const tabs = [
    ["base", Pencil, "基础配置"],
    ["graph", GitBranch, "图形化编辑"],
    ["script", Code2, "pipeline脚本"],
    ["params", Settings2, "构建参数"],
  ];
  if (activeRun) {
    return (
      <Shell>
        <Toast show={toast}>{toast}</Toast>
        <RunMonitor
          run={activeRun}
          name={name}
          stages={stages}
          parameterDefinitions={params}
          history={runHistory}
          notify={notify}
          onClose={() => { setActiveRun(null); void onDataChange?.(); }}
          onStop={stopActiveRun}
          onSelectRun={(nextRun) => setActiveRun({ ...nextRun, progress: nextRun.progress ?? 100 })}
          onRestart={(values) => run(values, activeRun)}
          onGoParams={() => {
            setActiveRun(null);
            setTab("params");
          }}
        />
      </Shell>
    );
  }
  return (
    <Shell>
      <Toast show={toast}>{toast}</Toast>
      <div className="pipeline-page">
        <header className="pipeline-subhead">
          <button className="pipeline-title" aria-label="返回流水线列表" onClick={leaveEditor}>
            <ArrowLeft size={19} />
            <strong>{name || "未命名流水线"}</strong>
          </button>
          <nav>
            {tabs.map(([id, Icon, label]) => (
              <button
                key={id}
                className={tab === id ? "active" : ""}
                onClick={() => leaveToTab(id)}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
          <div className="subhead-actions">
            {tab === "graph" && (
              <div className="operation-wrap">
                <button
                  className="blue"
                  onClick={() => setOperation(!operation)}
                >
                  操作 <ChevronDown size={15} />
                </button>
                {operation && (
                  <div className="operation-menu" role="menu">
                    <button
                      role="menuitem"
                      onClick={() => {
                        setOperation(false);
                        setOperationDialog("copy");
                      }}
                    >
                      复制流水线
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setOperation(false);
                        setOperationDialog("template");
                      }}
                    >
                      保存为模版
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setOperation(false);
                        if (params.length) {
                          setBuildInitial({});
                          setBuildOpen(true);
                        } else {
                          run({});
                        }
                      }}
                    >
                      立即构建
                    </button>
                  </div>
                )}
              </div>
            )}
            {tab !== "script" && (
              <button className="blue" onClick={save}>
                <Save size={16} />
                保存
              </button>
            )}
          </div>
        </header>
        {tab === "base" && (
          <BaseConfig
            {...{
              name,
              setName,
              label,
              setLabel,
              description,
              setDescription,
              priority,
              setPriority,
              cleanup,
              setCleanup,
              repoTrigger,
              setRepoTrigger,
              repoTypes,
              setRepoTypes,
              days,
              setDays,
              scheduleTime,
              setScheduleTime,
              upstream,
              setUpstream,
              save,
            }}
            template={selected.template}
          />
        )}
        {tab === "graph" && (
          <GraphView
            storageKey={selected.id || selected.name}
            zoom={zoom}
            setZoom={setZoom}
            setDrawer={setDrawer}
            notify={notify}
            onLastBuild={handleOpenLastRun}
            stages={stages}
            setStages={setStages}
          />
        )}
        {tab === "script" && (
          <ScriptView script={pipelineScript} />
        )}
        {tab === "params" && (
          <Parameters
            params={params}
            setParams={setParams}
            pipelineScript={pipelineScript}
            stages={stages}
            onAdd={() => setDrawer({ type: "parameter" })}
            onEdit={(index) => setDrawer({ type: "parameter", index, initialData: params[index] })}
          />
        )}
      </div>
      {drawer?.type === "plugin" && (
        <PluginConfig
          plugin={drawer.plugin}
          initialConfig={
            stages
              .flatMap(getStageSteps)
              .find((step) => step.id === drawer.step)?.config
          }
          onBack={() =>
            setDrawer({
              type: "catalog",
              stage: drawer.stage,
              insertAfter: drawer.insertAfter,
            })
          }
          onClose={() => setDrawer(null)}
          onSave={(config) => {
            setStages(
              stages.map((s) => {
                if (s.id !== drawer.stage) return s;
                if (drawer.isNew) {
                  return insertStageStep(s, {
                    id: drawer.step,
                    plugin: drawer.plugin,
                    config,
                  }, drawer.insertAfter);
                }
                return updateStageStep(s, drawer.step, config);
              }),
            );
            const automaticParameters = boundPipelineParameters(config.definition || {});
            if (automaticParameters.length) {
              setParams((current) => [
                ...current,
                ...automaticParameters.filter((candidate) => !current.some((item) => item.name === candidate.name)),
              ]);
            }
            setDrawer(null);
            notify(automaticParameters.length ? "插件配置已保存，绑定参数已同步到构建参数" : "插件配置已保存并参与脚本生成");
          }}
        />
      )}
      {drawer?.type === "catalog" && (
        <PluginCatalog
          allowComposite={
            !drawer.insertAfter &&
            getStageSteps(stages.find((stage) => stage.id === drawer.stage) || {}).length === 0
          }
          onClose={() => setDrawer(null)}
          onChoose={(plugin) => {
            setDrawer({
              type: "plugin",
              plugin,
              stage: drawer.stage,
              step: `step-${Date.now()}`,
              insertAfter: drawer.insertAfter,
              isNew: true,
            });
          }}
        />
      )}
      {drawer?.type === "parameter" && (
        <ParameterModal
          initialData={drawer.initialData}
          onClose={() => setDrawer(null)}
          onSave={(p) => {
            setParams(
              Number.isInteger(drawer.index)
                ? params.map((item, index) => (index === drawer.index ? p : item))
                : [...params, p],
            );
            setDrawer(null);
            notify(Number.isInteger(drawer.index) ? "构建参数已更新" : "构建参数已添加");
          }}
        />
      )}
      {operationDialog && (
        <PipelineOperationModal
          type={operationDialog}
          pipeline={{
            name,
            description,
            label,
            priority,
            cleanup,
            repoTrigger,
            repoTypes,
            days,
            scheduleTime,
            upstream,
            params,
            stageList: stages,
            repository: selected.repository,
            branch: selected.branch,
            pipelineScript,
          }}
          onClose={() => setOperationDialog(null)}
          onDone={async (message) => {
            setOperationDialog(null);
            await onDataChange?.();
            notify(message);
          }}
        />
      )}
      {buildOpen && (
        <BuildConfirmModal
          name={name}
          params={params}
          initialValues={buildInitial}
          building={building}
          onClose={() => setBuildOpen(false)}
          onGoParams={() => {
            setBuildOpen(false);
            setTab("params");
          }}
          onRun={run}
        />
      )}
      {pendingLeave && (
        <div className="modal-overlay">
          <section className="confirm-dialog unsaved-pipeline-dialog" role="dialog" aria-label="未保存编辑提示">
            <p>当前编辑未保存，确定离开？</p>
            <footer>
              <button onClick={() => setPendingLeave(null)}>取 消</button>
              <button className="blue" onClick={confirmLeave}>确 认</button>
            </footer>
          </section>
        </div>
      )}
    </Shell>
  );
}

export function RunMonitor({ run, name, stages, history = [], parameterDefinitions = [], notify, onClose, onRestart, onStop, onSelectRun, onGoParams }) {
  const [detailTab, setDetailTab] = useState("构建过程");
  const [detailOpen, setDetailOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logExpanded, setLogExpanded] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [restartMode, setRestartMode] = useState("fresh");
  const [stageRestartOpen, setStageRestartOpen] = useState(false);
  const [restartStage, setRestartStage] = useState(stages[0]?.name || "");
  const runStages = run.stageSnapshot?.length ? run.stageSnapshot : stages;
  const postSteps = runStages.flatMap(getStageSteps).filter((step) => step.config?.form?.POST_STEP);
  const configuredLog = runStages
    .map(
      (stage) =>
        `[Stage] ${stage.name}\n${getStageSteps(stage)
          .filter((step) => !step.config?.form?.POST_STEP)
          .map((step) => `[Step] ${step.plugin}`)
          .join("\n")}`,
    )
    .join("\n") + (postSteps.length ? `\n${postSteps.map((step) => `[Post/always] ${step.plugin}`).join("\n")}` : "");
  const log = run.logs?.length ? run.logs.join("\n") : configuredLog;
  const fullLog = `[PET] 构建 #${run.number} 由 demo-admin 从平台触发\n${log}`;
  const observedBranchShape = ["checkout", "test", "test2", "Tasking"].every((stageName) =>
    runStages.some((stage) => stage.name === stageName),
  );
  const failedRun = run.status === "失败" || run.status === "已终止";
  const detailTabs = ["构建过程", "构建参数", "测试报告", "构建产物", "工作空间"];
  const queuedRun = run.status === "队列中";
  const statusLabel = run.status === "失败" ? "构建失败" : run.status === "成功" ? "构建成功" : run.status;
  const stageState = (stage) => stageRuntimeState(run, stage);
  const stageStatus = (stage) => stageState(stage)?.status || "等待中";
  const effectiveParameterDefinitions = run.parameterDefinitions?.length ? run.parameterDefinitions : parameterDefinitions;
  const parameterType = (key) => effectiveParameterDefinitions.find((item) => item.name === key)?.type || "";
  const isSensitiveParameter = (key) => ["凭证", "个人Token"].includes(parameterType(key));
  const emptyRunPanel = () => <div className="official-run-empty"><PackageOpen /><span>暂无数据</span></div>;
  return (
    <div className="run-page-overlay">
      <section className="run-monitor-page">
        <header className="run-page-title">
          <button aria-label="返回流水线配置" onClick={onClose}><ArrowLeft /></button>
          <strong>{name}</strong>
        </header>
        <div className="official-run-summary">
          <div className={`official-run-state ${run.status === "成功" ? "success" : failedRun ? "failure" : ""}`}>
            <span>{run.status === "队列中" ? "◷" : run.status === "成功" ? "✓" : failedRun ? "×" : "◌"}</span>
            <b>{statusLabel}</b>
            <select aria-label="选择构建记录" value={run.id} onChange={(event) => onSelectRun?.(history.find((item) => item.id === event.target.value) || run)}>{(history.length ? history : [run]).map((item) => <option key={item.id} value={item.id}>#{item.number}</option>)}</select>
          </div>
          <div className="official-run-meta">
            <span>♙ 由demo-admin从平台触发</span>
            <span>仓库 {run.pipelineSnapshot?.repository || "-"}</span>
            <span>分支 {run.pipelineSnapshot?.branch || "-"}</span>
            <span>触发于 刚刚，构建时长 {run.duration}，等待时长 {run.waitDuration || "< 1s"}</span>
            <span>构建节点 {run.pipelineSnapshot?.buildNode || "-"}</span>
            <span>构建队列 {queuedRun ? "(1/1)" : "(0/0)"}</span>
            <button onClick={() => setDetailOpen(true)}>查看详情</button>
          </div>
          {run.progress >= 100 ? (
            <div className="official-rebuild-group" aria-label="构建重启操作">
              <button title="重启构建" aria-label="重启构建" onClick={() => { setRestartMode("fresh"); parameterDefinitions.length ? setRestartOpen(true) : onRestart({}); }}><RefreshCcw /></button>
              <button title="使用当前构建参数重启" aria-label="使用当前构建参数重启" onClick={() => { setRestartMode("current"); parameterDefinitions.length ? setRestartOpen(true) : onRestart(run.parameters || {}); }}><Repeat2 /></button>
              <button title="从指定阶段重启" aria-label="从指定阶段重启" onClick={() => setStageRestartOpen(true)}><Gauge /></button>
            </div>
          ) : (
            <button className="official-stop" onClick={() => setConfirmStop(true)}>⊖ 终止构建</button>
          )}
        </div>
        <nav className="official-run-tabs">
          {detailTabs.map((item) => (
            <button key={item} disabled={queuedRun && ["构建参数", "测试报告", "构建产物"].includes(item)} className={detailTab === item ? "active" : ""} onClick={() => setDetailTab(item)}>{item}</button>
          ))}
        </nav>
        {detailTab === "构建过程" && (
          <div className="official-build-canvas">
            <div className="official-log-actions"><button onClick={() => setLogsOpen(true)}>查看全部日志 ↗</button></div>
            {observedBranchShape ? (
              <div className={`official-branch-flow ${failedRun ? "failed" : ""}`}>
                <RunStageCard stage={{ name: "开始" }} start status={failedRun ? run.status : run.status === "队列中" ? "等待中" : "成功"} />
                <span className="flow-line line-start" />
                <RunStageCard stage={runStages.find((stage) => stage.name === "checkout")} state={stageState(runStages.find((stage) => stage.name === "checkout"))} status={stageStatus(runStages.find((stage) => stage.name === "checkout"))} />
                <span className="flow-split" />
                <div className="flow-parallel">
                  <RunStageCard stage={runStages.find((stage) => stage.name === "test")} state={stageState(runStages.find((stage) => stage.name === "test"))} status={stageStatus(runStages.find((stage) => stage.name === "test"))} />
                  <RunStageCard stage={runStages.find((stage) => stage.name === "test2")} state={stageState(runStages.find((stage) => stage.name === "test2"))} status={stageStatus(runStages.find((stage) => stage.name === "test2"))} />
                </div>
                <span className="flow-join" />
                <RunStageCard stage={runStages.find((stage) => stage.name === "Tasking")} state={stageState(runStages.find((stage) => stage.name === "Tasking"))} status={stageStatus(runStages.find((stage) => stage.name === "Tasking"))} />
              </div>
            ) : (
              <div className={`official-stage-flow ${failedRun ? "failed" : ""}`}>
                <div className="official-run-start"><b>{failedRun ? "×" : run.status === "队列中" ? "◌" : "✓"}</b>开始</div>
                {(runStages.length ? runStages : [{ name: "准备工作空间" }]).map((stage, index) => (
                  <React.Fragment key={stage.id || stage.name}>
                    <i />
                    <div className={`official-run-stage ${runStatusClass(stageStatus(stage))}`} title={`${stage.name}：${stageStatus(stage)}`}>
                      <strong>{runStatusSymbol(stageStatus(stage))}</strong><span>{stage.name}</span>
                      {getStageSteps(stage).map((step) => { const stepStatus = stepRuntimeStatus(stageState(stage), step); return <small key={step.id || step.plugin} className={`run-step-state ${runStatusClass(stepStatus)}`} title={`${step.plugin}：${stepStatus}`} aria-label={`${step.plugin}，${stepStatus}`}>{step.plugin}</small>; })}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        )}
        {detailTab === "构建参数" && <div className="run-parameter-readonly">{Object.keys(run.parameters || {}).length ? Object.entries(run.parameters).map(([key,value]) => <label key={key}><b>{key}：</b><input type={isSensitiveParameter(key) ? "password" : "text"} readOnly value={Array.isArray(value) ? value.join(",") : String(value ?? "")} onFocus={(e)=>{ if (!isSensitiveParameter(key)) e.currentTarget.select(); }}/></label>) : <p>暂无构建参数</p>}{Object.keys(run.outputContext || {}).filter(key=>!key.includes(".")).length > 0 && <><h3>插件输出</h3>{Object.entries(run.outputContext).filter(([key])=>!key.includes(".")).map(([key,value])=><label key={key}><b>{key}：</b><input readOnly value={String(value ?? "")}/></label>)}</>}</div>}
        {detailTab === "测试报告" && emptyRunPanel()}
        {detailTab === "构建产物" && emptyRunPanel()}
        {detailTab === "工作空间" && emptyRunPanel()}
        {restartOpen && (
          <BuildConfirmModal
            name={name}
            params={parameterDefinitions}
            initialValues={restartMode === "current" ? (run.parameters || {}) : Object.fromEntries(parameterDefinitions.map((item) => [item.name, item.defaultValue ?? ""]))}
            building={false}
            onClose={() => setRestartOpen(false)}
            onGoParams={() => {
              setRestartOpen(false);
              onGoParams?.();
            }}
            onRun={(values) => {
              setRestartOpen(false);
              onRestart(values);
            }}
          />
        )}
        {stageRestartOpen && (
          <div className="run-dialog-mask">
            <section className="run-dialog stage-restart-dialog" role="dialog" aria-label="从指定阶段重启">
              <header><strong>从指定阶段重启</strong><button aria-label="关闭从指定阶段重启" onClick={() => setStageRestartOpen(false)}>×</button></header>
              <div><label>选择阶段<select value={restartStage} onChange={(event) => setRestartStage(event.target.value)}>{runStages.map((stage) => <option key={stage.id || stage.name} value={stage.name}>{stage.name}</option>)}</select></label><p>所选阶段及其后续阶段将重新执行。</p></div>
              <footer><button onClick={() => setStageRestartOpen(false)}>取消</button><button className="blue" onClick={() => { setStageRestartOpen(false); notify(`已从 ${restartStage} 阶段重新构建`); onRestart({ ...(run.parameters || {}), __restartFrom: restartStage }); }}>确定</button></footer>
            </section>
          </div>
        )}
        {detailOpen && (
          <div className="run-dialog-mask">
            <section className="run-dialog run-detail-dialog" role="dialog" aria-label="构建详情">
              <header><strong>构建详情</strong><button aria-label="关闭构建详情" onClick={() => setDetailOpen(false)}>×</button></header>
              <dl>
                <dt>流水线名称</dt><dd>{name}</dd><dt>构建编号</dt><dd>#{run.number}</dd>
                <dt>构建状态</dt><dd>{run.status}</dd><dt>触发方式</dt><dd>由demo-admin从平台触发</dd>
                <dt>代码仓库</dt><dd>{run.pipelineSnapshot?.repository || "-"}</dd><dt>分支</dt><dd>{run.pipelineSnapshot?.branch || "-"}</dd>
                <dt>构建节点</dt><dd>{run.pipelineSnapshot?.buildNode || "-"}</dd><dt>构建时长</dt><dd>{run.duration}</dd>
                <dt>等待时长</dt><dd>{run.waitDuration || "< 1s"}</dd>
              </dl>
              <footer><button className="blue" onClick={() => setDetailOpen(false)}>确定</button></footer>
            </section>
          </div>
        )}
        {logsOpen && (
          <><button className="run-log-mask" aria-label="关闭全部日志" onClick={() => setLogsOpen(false)} /><aside className={`run-log-drawer ${logExpanded ? "expanded" : ""}`} role="dialog" aria-label="全部日志">
            <header><strong>{name}</strong><span>◷ {run.duration}</span><button aria-label="下载日志" onClick={() => downloadTextFile(`${name}-${run.number}.log`, fullLog)}>⇩</button><button aria-label={logExpanded ? "退出全屏日志" : "全屏日志"} onClick={() => setLogExpanded(!logExpanded)}>⛶</button></header>
            <pre>{fullLog}</pre>
          </aside></>
        )}
        {confirmStop && (
          <div className="run-dialog-mask">
            <section className="run-dialog run-stop-dialog" role="alertdialog" aria-label="终止构建">
              <header><strong>终止构建</strong><button aria-label="关闭终止构建" onClick={() => setConfirmStop(false)}>×</button></header>
              <div>确定终止当前构建 #{run.number} 吗？终止后无法恢复。</div>
              <footer><button onClick={() => setConfirmStop(false)}>取消</button><button className="danger" onClick={async () => {setConfirmStop(false); await onStop();}}>确定终止</button></footer>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}

function PipelineOperationModal({ type, pipeline, onClose, onDone }) {
  const isCopy = type === "copy";
  const [data, setData] = useState(
    isCopy
      ? {
          name: "",
          keepLabel: true,
          keepBasic: true,
        }
      : {
          name: "",
          scopes: [],
          description: "",
          keepLabel: true,
          keepBasic: true,
        },
  );
  const [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const patch = (key, value) => setData((x) => ({ ...x, [key]: value }));
  const confirm = async () => {
    const value = data.name.trim();
    if (!value) {
      setError(isCopy ? "请输入新流水线名称" : "请输入模板名称");
      return;
    }
    if (!isCopy && data.scopes.length === 0) {
      setError("请选择应用范围");
      return;
    }
    setSaving(true);
    if (isCopy) {
      await petApi.create("pipelines", copyPipelineData(pipeline, value, data));
      onDone("流水线副本已创建");
    } else {
      await petApi.create("templates", templateFromPipeline(pipeline, { ...data, name: value }));
      onDone("已保存为流水线模板");
    }
  };
  return (
    <div className="modal-overlay">
      <section className="parameter-modal operation-dialog">
        <header>
          <strong>{isCopy ? "复制流水线" : "保存模板"}</strong>
          <button aria-label="关闭操作弹窗" onClick={onClose}>
            <X />
          </button>
        </header>
        <div>
          <p className="operation-intro">以流水线 <b>{pipeline.name}</b> 的{isCopy ? "配置内容为基础，创建新的流水线" : "构建步骤保存为模板，以便在后续创建时直接使用"}</p>
          <label>
            <span>
              <em>*</em> {isCopy ? "流水线名称" : "模板名称"}：
            </span>
            <div className="counter-input">
              <input
                maxLength={isCopy ? 100 : 20}
                placeholder={isCopy ? "请输入流水线名称" : "请输入模板名称"}
                value={data.name}
                onChange={(e) => patch("name", e.target.value)}
              />
              <small>{data.name.length}/{isCopy ? 100 : 20}</small>
            </div>
          </label>
          {!isCopy && (
            <>
              <label>
                <span><em>*</em> 应用范围：</span>
                <div className="template-scope-options">{["公共", "演示组织"].map((scope) => <label key={scope}><input type="checkbox" checked={data.scopes.includes(scope)} onChange={(event) => patch("scopes", event.target.checked ? [...data.scopes, scope] : data.scopes.filter((item) => item !== scope))} />{scope}</label>)}</div>
              </label>
              <label>
                <span>模板描述：</span>
                <div className="counter-input textarea">
                  <textarea
                    maxLength={200}
                    placeholder="请输入模板描述"
                    value={data.description}
                    onChange={(e) => patch("description", e.target.value)}
                  />
                  <small>{data.description.length}/200</small>
                </div>
              </label>
            </>
          )}
          {[['keepLabel', '保留标签'], ['keepBasic', '保留基础配置']].map(([key, text]) => <label className="operation-check" key={key}><input type="checkbox" checked={data[key]} onChange={(event) => patch(key, event.target.checked)} />{text}</label>)}
          {error && <p className="error">{error}</p>}
        </div>
        <footer>
          <button className="blue" onClick={onClose}>取 消</button>
          <button className="blue" disabled={saving} onClick={confirm}>
            {saving ? "保存中..." : "确 认"}
          </button>
        </footer>
      </section>
    </div>
  );
}

export function BuildConfirmModal({
  name,
  params,
  initialValues = {},
  building,
  onClose,
  onGoParams,
  onRun,
}) {
  const initial = initialBuildParameters(params, initialValues);
  const [values, setValues] = useState(initial),
    [error, setError] = useState("");
  const setValue = (key, value) => setValues((x) => ({ ...x, [key]: value }));
  const choices = parameterChoices;
  const confirm = () => {
    const validationError = validateBuildParameters(params, values);
    if (validationError) {
      setError(validationError);
      return;
    }
    onRun(values);
  };
  const control = (p) => {
    if (p.type === "单选")
      return (
        <select
          value={values[p.name] || ""}
          onChange={(e) => setValue(p.name, e.target.value)}
        >
          <option value="">请选择</option>
          {choices(p).map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      );
    if (p.type === "多选")
      return (
        <div className="build-multi">
          {choices(p).map((x) => (
            <label key={x}>
              <input
                type="checkbox"
                checked={(values[p.name] || []).includes(x)}
                onChange={(e) =>
                  setValue(
                    p.name,
                    e.target.checked
                      ? [...(values[p.name] || []), x]
                      : (values[p.name] || []).filter((y) => y !== x),
                  )
                }
              />
              {x}
            </label>
          ))}
        </div>
      );
    if (p.type === "凭证")
      return (
        <select
          value={values[p.name] || ""}
          onChange={(e) => setValue(p.name, e.target.value)}
        >
          <option value="">请选择{p.credentialType || "凭证"}</option>
          {choices(p).map((value) => <option key={value}>{value}</option>)}
        </select>
      );
    if (p.type === "时间戳")
      return (
        <input
          readOnly
          value={values[p.name] || ""}
          title={`按 ${p.timestampFormat || "yyyyMMdd"} 自动生成`}
        />
      );
    if (p.type === "脚本式参数")
      return (
        <select
          value={values[p.name] || ""}
          onChange={(e) => setValue(p.name, e.target.value)}
        >
          <option value="">请选择脚本返回值</option>
          {choices(p).map((value) => <option key={value}>{value}</option>)}
        </select>
      );
    if (p.type === "个人Token")
      return (
        <input
          type="password"
          autoComplete="off"
          value={values[p.name] || ""}
          onInput={(e) => setValue(p.name, e.currentTarget.value)}
          placeholder="请输入个人Token"
        />
      );
    return (
      <input
        value={values[p.name] || ""}
        onInput={(e) => setValue(p.name, e.currentTarget.value)}
        placeholder={p.allowEmpty ? "允许为空" : "请输入参数"}
      />
    );
  };
  return (
    <div className="modal-overlay">
      <section className="parameter-modal build-confirm">
        <header>
          <strong>立即构建</strong>
          <button aria-label="关闭构建弹窗" onClick={onClose}>
            <X />
          </button>
        </header>
        <div>
          <p className="build-start-tip">启动参数 <button onClick={onGoParams}>前往参数默认值设置</button> <span>修改设置，可以修改参数名、参数类型等</span></p>
          {params.length ? (
            <div className="build-param-list">
              <div className="build-param-head"><b>变量名</b><b>变量值</b></div>
              {params.map((p) => (
                <label className="build-param-row" key={p.id}>
                  <span title={p.description || p.name}>
                    {p.name}
                    {!p.allowEmpty && <em>*</em>}
                  </span>
                  <div className="build-param-control">{control(p)}{typeof values[p.name] === "string" && <small>{String(values[p.name] || "").length}/500</small>}</div>
                </label>
              ))}
            </div>
          ) : (
            <div className="drawer-info">
              <Info />
              当前流水线没有自定义构建参数，将直接进入构建队列。
            </div>
          )}
          {error && <p className="error">{error}</p>}
        </div>
        <footer>
          <button onClick={onClose}>取消</button>
          <button className="blue" disabled={building} onClick={confirm}>
            {building ? "正在创建构建..." : "确定"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function BaseConfig(p) {
  const [section, setSection] = useState("基本信息");
  const toggleArray = (value, list, setList) =>
    setList(
      list.includes(value) ? list.filter((x) => x !== value) : [...list, value],
    );
  const dayOptions = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const toggleDay = (value) =>
    value === "全选"
      ? p.setDays(p.days.length === dayOptions.length ? [] : dayOptions)
      : toggleArray(value, p.days, p.setDays);
  return (
    <div className="base-layout">
      <aside>
        {["基本信息", "触发规则"].map((item) => (
          <button
            key={item}
            className={section === item ? "active" : ""}
            onClick={() => setSection(item)}
          >
            {item}
          </button>
        ))}
      </aside>
      <main>
        {section === "基本信息" && (
          <>
            <section className="form-section">
              <label>
                <span>
                  <em>*</em> 流水线名称：
                </span>
                <div className="counter-input">
                  <input
                    value={p.name}
                    maxLength={100}
                    onChange={(e) => p.setName(e.target.value)}
                  />
                  <small>{p.name.length}/100</small>
                </div>
              </label>
              <label>
                <span>
                  流水线标签 <CircleHelp size={14} />：
                </span>
                <input
                  value={p.label}
                  onChange={(e) => p.setLabel(e.target.value)}
                  placeholder="多个标签请用逗号分隔"
                />
              </label>
              <label>
                <span>
                  <em>*</em> 流水线优先级 <CircleHelp size={14} />：
                </span>
                <select
                  value={p.priority}
                  onChange={(e) => p.setPriority(e.target.value)}
                >
                  {[1, 2, 3, 4, 5].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={p.cleanup}
                  onChange={(e) => p.setCleanup(e.target.checked)}
                />{" "}
                定期清理历史构建 <CircleHelp size={14} />
              </label>
              <label>
                <span>流水线模板：</span>
                <input disabled value={p.template || "新空白模板"} readOnly />
              </label>
              <label>
                <span>流水线描述：</span>
                <div className="counter-input textarea">
                  <textarea
                    placeholder="请输入流水线描述"
                    value={p.description}
                    maxLength={300}
                    onChange={(e) => p.setDescription(e.target.value)}
                  />
                  <small>{p.description.length}/300</small>
                </div>
              </label>
            </section>
          </>
        )}
        {section === "触发规则" && (
          <>
            <section className="trigger-section">
              <div className="trigger-heading">
                仓库源触发 <CircleHelp size={14} />
                <button
                  className={`switch ${p.repoTrigger ? "on" : ""}`}
                  role="switch"
                  aria-label="仓库源触发"
                  aria-checked={p.repoTrigger}
                  onClick={() => p.setRepoTrigger(!p.repoTrigger)}
                >
                  <i />
                </button>
              </div>
              <div className="check-list">
                {[
                  "Gerrit仓库源触发",
                  "Gitlab仓库源触发",
                  "Repo仓库源触发",
                  "SVN仓库源触发",
                  "P4仓库源触发",
                ].map((x) => (
                  <label key={x}>
                    <input
                      type="checkbox"
                      disabled={!p.repoTrigger}
                      checked={p.repoTypes.includes(x)}
                      onChange={() =>
                        toggleArray(x, p.repoTypes, p.setRepoTypes)
                      }
                    />
                    {x}
                  </label>
                ))}
              </div>
              <h3>定时触发</h3>
              <div className="schedule">
                <b>日期选择：</b>
                <div>
                  {["全选", ...dayOptions].map((x) => (
                    <label key={x}>
                      <input
                        type="checkbox"
                        checked={
                          x === "全选"
                            ? p.days.length === dayOptions.length
                            : p.days.includes(x)
                        }
                        onChange={() => toggleDay(x)}
                      />
                      {x}
                    </label>
                  ))}
                </div>
                <b>触发时间：</b>
                <select
                  value={p.scheduleTime}
                  onChange={(e) => p.setScheduleTime(e.target.value)}
                >
                  <option value="">请选择每天触发的时间</option>
                  <option>02:00</option>
                  <option>09:00</option>
                </select>
              </div>
              <div className="pipeline-trigger">
                <span>
                  流水线触发 <CircleHelp size={14} />
                </span>
                <label>
                  <input
                    type="checkbox"
                    checked={p.upstream}
                    onChange={(e) => p.setUpstream(e.target.checked)}
                  />
                  由上游流水线触发
                </label>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function GraphView({
  storageKey,
  zoom,
  setZoom,
  setDrawer,
  notify,
  onLastBuild,
  stages,
  setStages,
}) {
  const [graphModal, setGraphModal] = useState(null);
  const groups = graphGroups(stages);
  const beginSerial = (groupIndex) =>
    setGraphModal({
      type: "stage",
      create: true,
      mode: "serial",
      groupIndex,
      stage: {
        id: `draft-${Date.now()}`,
        groupKey: `group-${Date.now()}`,
        name: "",
        plugin: "点击选择插件",
      },
    });
  const beginParallel = (groupKey) =>
    setGraphModal({
      type: "stage",
      create: true,
      mode: "parallel",
      groupKey,
      stage: {
        id: `draft-${Date.now()}`,
        groupKey,
        name: "",
        plugin: "点击选择插件",
      },
    });
  const commitStage = (value) => {
    if (graphModal.create) {
      if (graphModal.mode === "parallel") {
        setStages(insertParallelStage(stages, graphModal.groupKey, value));
      } else {
        setStages(insertSerialStage(stages, graphModal.groupIndex, value));
      }
    } else
      setStages(
        normalizeGraphStages(
          stages.map((s) => (s.id === value.id ? value : s)),
        ),
      );
    setGraphModal(null);
    notify(graphModal.create ? "阶段已添加，请继续添加步骤" : "阶段配置已更新");
  };
  const removeStage = (id) => {
    setStages(removeGraphStage(stages, id));
    notify("阶段已删除并重新编号");
  };
  return (
    <div className="graph-area">
      <div className="zoom-tools">
        <button
          aria-label="放大"
          onClick={() => setZoom(Math.min(1.25, zoom + 0.1))}
        >
          <Plus />
        </button>
        <button
          aria-label="缩小"
          onClick={() => setZoom(Math.max(0.7, zoom - 0.1))}
        >
          <Minus />
        </button>
      </div>
      <button className="last-build" onClick={onLastBuild}>
        查看最近一次构建
      </button>
      <div
        className="flow"
        style={{ transform: `scale(${zoom})`, transformOrigin: "left top" }}
      >
        <button
          className="start-node"
          onClick={() => setGraphModal({ type: "global" })}
        >
          <Settings2 />
          <span>开始</span>
        </button>
        {groups.map((group, groupIndex) => (
          <React.Fragment key={group.key}>
            <button
              className="between-plus"
              aria-label={`在第${groupIndex + 1}阶段前添加阶段`}
              onClick={() => beginSerial(groupIndex)}
            >
              <Plus />
            </button>
            <section
              className={`stage-group ${group.items.length > 1 ? "has-parallel" : ""}`}
              aria-label={`第${groupIndex + 1}阶段组`}
            >
              {group.items.map((s) => (
                <article className="stage-column" key={s.id}>
                  <header>
                    <b>{s.id}</b>
                    <button
                      className="stage-name-button"
                      onClick={() => setGraphModal({ type: "stage", stage: s })}
                    >
                      {s.name}
                    </button>
                    <IconButton
                      aria-label={`删除${s.name}`}
                      onClick={() => removeStage(s.id)}
                    >
                      <X />
                    </IconButton>
                  </header>
                  <div className="step-stack">
                    {getStageSteps(s).map((step, stepIndex) => (
                      <React.Fragment key={step.id}>
                        <div className="plugin-node">
                          <button
                            className="step-open"
                            onClick={() =>
                              setDrawer({
                                type: "plugin",
                                plugin: step.plugin,
                                stage: s.id,
                                step: step.id,
                              })
                            }
                          >
                            <span>{step.plugin}</span>
                          </button>
                          <button
                            className="step-remove"
                            aria-label={`删除步骤${step.plugin}`}
                            onClick={() =>
                              setStages(
                                stages.map((x) =>
                                  x.id === s.id
                                    ? removeStageStep(x, step.id)
                                    : x,
                                ),
                              )
                            }
                          >
                            <X />
                          </button>
                        </div>
                        <button
                          className="plugin-plus"
                          aria-label={`在${s.name}的第${stepIndex + 1}个步骤后添加插件`}
                          onClick={() =>
                            setDrawer({
                              type: "catalog",
                              stage: s.id,
                              insertAfter: step.id,
                            })
                          }
                        >
                          <Plus />
                        </button>
                      </React.Fragment>
                    ))}
                    {!getStageSteps(s).length && (
                      <button
                        className="plugin-plus empty-step-plus"
                        aria-label={`在${s.name}中添加第一个插件`}
                        onClick={() =>
                          setDrawer({ type: "catalog", stage: s.id })
                        }
                      >
                        <Plus />
                      </button>
                    )}
                  </div>
                </article>
              ))}
              <button
                className="parallel"
                aria-label={`为第${groupIndex + 1}阶段组添加并行阶段`}
                onClick={() => beginParallel(group.key)}
              >
                添加并行阶段
              </button>
            </section>
          </React.Fragment>
        ))}
        <button
          className="between-plus end"
          aria-label="添加末尾阶段"
          onClick={() => beginSerial(groups.length)}
        >
          <Plus />
        </button>
      </div>
      {graphModal?.type === "global" && (
        <GlobalPipelineModal
          storageKey={storageKey}
          onClose={() => setGraphModal(null)}
          onSave={(value) => {
            localStorage.setItem(`pet-pipeline-global:${storageKey}`, JSON.stringify(value));
            setGraphModal(null);
            notify("流水线全局配置已更新");
          }}
        />
      )}
      {graphModal?.type === "stage" && (
        <StageConfigModal
          stage={graphModal.stage}
          title={graphModal.create ? "新增阶段" : "编辑阶段"}
          onClose={() => setGraphModal(null)}
          onSave={commitStage}
        />
      )}
    </div>
  );
}

function ModalSwitch({ label, checked, onChange, children }) {
  return (
    <div className="observed-switch-row">
      <label>
        <span>{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          className={`switch ${checked ? "on" : ""}`}
          onClick={() => onChange(!checked)}
        >
          <i />
        </button>
      </label>
      {checked && children}
    </div>
  );
}

function GlobalPipelineModal({ storageKey, onClose, onSave }) {
  const saved = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(`pet-pipeline-global:${storageKey}`)) || {};
    } catch {
      return {};
    }
  }, [storageKey]);
  const [nodes, setNodes] = useState(saved.nodes || ["pet"]),
    [workspace, setWorkspace] = useState(saved.workspace || "");
  return (
    <div className="modal-overlay">
      <section className="observed-config-modal">
        <header>
          <strong>
            流水线全局配置 <CircleHelp size={15} />
          </strong>
          <button aria-label="关闭全局配置" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="observed-modal-body">
          <label>
            <span>
              构建节点 <CircleHelp size={14} />：
            </span>
            <div className="field-tip">
              <Info size={14} />
              输入或选择构建节点，下拉框内容为输入提示
            </div>
            <div className="tag-input">
              {nodes.map((n) => (
                <em key={n}>
                  {n}
                  <button
                    aria-label={`移除构建节点${n}`}
                    onClick={() => setNodes(nodes.filter((x) => x !== n))}
                  >
                    ×
                  </button>
                </em>
              ))}
              <input
                aria-label="构建节点"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    setNodes([...nodes, e.currentTarget.value.trim()]);
                    e.currentTarget.value = "";
                  }
                }}
              />
            </div>
          </label>
          <label>
            <span>
              共享工作空间 <CircleHelp size={14} />：
            </span>
            <div className="counter-input">
              <input
                maxLength={30}
                value={workspace}
                placeholder="请输入共享工作空间"
                onChange={(e) => setWorkspace(e.target.value)}
              />
              <small>{workspace.length}/30</small>
            </div>
          </label>
        </div>
        <footer>
          <button onClick={onClose}>取消</button>
          <button
            className="blue"
            onClick={() => onSave({ nodes, workspace })}
          >
            确定
          </button>
        </footer>
      </section>
    </div>
  );
}

function StageConfigModal({ stage, onClose, onSave, title = "编辑阶段" }) {
  const [nameError, setNameError] = useState("");
  const [conditionError, setConditionError] = useState("");
  const [data, setData] = useState({
    ...stage,
    disabled: !!stage.disabled,
    useNode: !!stage.useNode,
    retryEnabled: !!stage.retryEnabled,
    timeoutEnabled: !!stage.timeoutEnabled,
    gitlabNotify: !!stage.gitlabNotify,
    conditionEnabled: !!stage.conditionEnabled,
    retries: stage.retries || 2,
    timeout: stage.timeout ?? 60,
    gitlabStageName: stage.gitlabStageName || "",
    nodes: stage.nodes || (stage.node ? [stage.node] : ["pet"]),
    workspace: stage.workspace || "",
    condition: stage.condition || "",
  });
  const patch = (key, value) => setData((x) => ({ ...x, [key]: value }));
  return (
    <div className="modal-overlay">
      <section className="observed-config-modal stage-config-modal">
        <header>
          <strong>{title}</strong>
          <button aria-label="关闭阶段配置" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="observed-modal-body">
          <ModalSwitch
            label="禁用此节点"
            checked={data.disabled}
            onChange={(v) => patch("disabled", v)}
          />
          <label>
            <span>
              <em>*</em> 阶段名称
            </span>
            <div className="counter-input">
              <input
                maxLength={30}
                value={data.name}
                placeholder="请输入阶段名称"
                onChange={(e) => {
                  patch("name", e.target.value);
                  if (e.target.value.trim()) setNameError("");
                }}
              />
              <small>{data.name.length}/30</small>
            </div>
            {nameError && <span className="stage-field-error">{nameError}</span>}
          </label>
          <ModalSwitch
            label="配置构建节点"
            checked={data.useNode}
            onChange={(v) => patch("useNode", v)}
          >
            <div className="stage-node-fields">
              <label>
                <span>构建节点</span>
                <div className="field-tip">
                  <Info size={14} />
                  输入或选择构建节点，下拉框内容为输入提示
                </div>
                <div className="tag-input">
                  {data.nodes.map((node) => (
                    <em key={node}>
                      {node}
                      <button
                        aria-label={`移除构建节点${node}`}
                        onClick={() => patch("nodes", data.nodes.filter((item) => item !== node))}
                      >
                        ×
                      </button>
                    </em>
                  ))}
                  <input
                    aria-label="构建节点"
                    placeholder="请输入或选择构建节点"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && event.currentTarget.value.trim()) {
                        patch("nodes", [...data.nodes, event.currentTarget.value.trim()]);
                        event.currentTarget.value = "";
                      }
                    }}
                  />
                </div>
              </label>
              <label>
                <span>共享工作空间</span>
                <div className="counter-input">
                  <input
                    maxLength={30}
                    value={data.workspace}
                    placeholder="请输入共享工作空间"
                    onChange={(event) => patch("workspace", event.target.value)}
                  />
                  <small>{data.workspace.length}/30</small>
                </div>
              </label>
            </div>
          </ModalSwitch>
          <ModalSwitch
            label="失败重试次数"
            checked={data.retryEnabled}
            onChange={(v) => patch("retryEnabled", v)}
          >
            <div className="retry-radio-row" role="radiogroup" aria-label="失败重试次数">
              {[2, 3, 4, 5].map((value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="stage-retries"
                    checked={Number(data.retries) === value}
                    onChange={() => patch("retries", value)}
                  />
                  {value}
                </label>
              ))}
            </div>
          </ModalSwitch>
          <ModalSwitch
            label="阶段超时时间"
            checked={data.timeoutEnabled}
            onChange={(v) => patch("timeoutEnabled", v)}
          >
            <div className="inline-unit">
              <input
                type="number"
                min="0"
                value={data.timeout}
                onChange={(e) => patch("timeout", e.target.value)}
              />
              <span>(分钟)</span>
            </div>
          </ModalSwitch>
          <ModalSwitch
            label="GitLab结果通知"
            checked={data.gitlabNotify}
            onChange={(v) => patch("gitlabNotify", v)}
          >
            <label className="gitlab-stage-name">
              <span>阶段名称:</span>
              <input
                value={data.gitlabStageName}
                onChange={(event) => patch("gitlabStageName", event.target.value)}
              />
            </label>
          </ModalSwitch>
          <ModalSwitch
            label="条件判断"
            checked={data.conditionEnabled}
            onChange={(v) => patch("conditionEnabled", v)}
          >
            <label className="condition-expression">
              <span><em>*</em> 参数表达式 <CircleHelp size={14} /></span>
              <div className="counter-input textarea">
                <textarea
                  maxLength={200}
                  value={data.condition}
                  onChange={(event) => {
                    patch("condition", event.target.value);
                    if (event.target.value.trim()) setConditionError("");
                  }}
                />
                <small>{data.condition.length}/200</small>
              </div>
              {conditionError && <span className="stage-field-error">{conditionError}</span>}
            </label>
          </ModalSwitch>
        </div>
        <footer>
          <button onClick={onClose}>取 消</button>
          <button
            className="blue"
            onClick={() => {
              const invalidName = !data.name.trim();
              const invalidCondition = data.conditionEnabled && !data.condition.trim();
              setNameError(invalidName ? "阶段名称不能为空" : "");
              setConditionError(invalidCondition ? "参数表达式不能为空" : "");
              if (invalidName || invalidCondition) return;
              onSave(data);
            }}
          >
            确 认
          </button>
        </footer>
      </section>
    </div>
  );
}

function Drawer({ children, onClose, title, tabs }) {
  return (
    <div className="drawer-overlay">
      <aside className="drawer">
        <header>
          {tabs || (
            <>
              <ArrowLeft />
              <strong>{title}</strong>
            </>
          )}
          <Expand />
          <button aria-label="关闭抽屉" onClick={onClose}>
            <X />
          </button>
        </header>
        {children}
      </aside>
    </div>
  );
}

function PluginCatalog({ onClose, onChoose, allowComposite = true }) {
  const [mode, setMode] = useState("plugin"),
    [category, setCategory] = useState("全部"),
    [query, setQuery] = useState(""),
    [available, setAvailable] = useState(basePlugins);
  useEffect(() => {
    petApi
      .snapshot()
      .then((db) =>
        setAvailable(
          mergePluginCatalog(basePlugins, db.plugins, db.composites),
        ),
      );
  }, []);
  const shown = available.filter(
    (item) =>
      (mode === "composite"
        ? item[1] === "复合插件"
        : item[1] !== "复合插件") &&
      (category === "全部" || item[1] === category) &&
      item[0].toLowerCase().includes(query.toLowerCase()),
  );
  const changeMode = (value) => {
    setMode(value);
    setCategory("全部");
  };
  return (
    <Drawer
      onClose={onClose}
      tabs={
        <nav className="drawer-tabs">
          <button
            className={mode === "plugin" ? "active" : ""}
            onClick={() => changeMode("plugin")}
          >
            <Puzzle />
            选择插件
          </button>
          <button
            className={mode === "composite" ? "active" : ""}
            disabled={!allowComposite}
            onClick={() => changeMode("composite")}
          >
            <Boxes />
            选择复合插件
          </button>
        </nav>
      }
    >
      <div className="drawer-info">
        <Info />
        仅支持在单独的stage中选择复合插件，且使用别人复合插件时需先在插件管理-复合插件中将其添加至收藏
      </div>
      <div className="catalog-tools">
        <label>
          <input
            placeholder="请输入关键字"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Search />
        </label>
        <button
          onClick={() => {
            onClose();
            location.hash = "plugins";
            window.dispatchEvent(new HashChangeEvent("hashchange"));
          }}
        >
          <Puzzle />
          添加自定义插件 <CircleHelp />
        </button>
      </div>
      {mode === "plugin" && (
        <nav className="catalog-tabs">
          {["全部", "通用", "构建", "测试", "yocto"].map(
            (item) => (
              <button
                key={item}
                className={category === item ? "active" : ""}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ),
          )}
        </nav>
      )}
      <div className="plugin-list">
        {shown.map((item) => {
          return <button key={item[0]} onClick={() => onChoose(item[0])}>
            <span className="puzzle-icon">
              <Puzzle />
            </span>
            <div>
              <strong>
                {item[0]} <i>{item[1]}</i>
              </strong>
              {item[3] && <p>{item[3]}</p>}
            </div>
            <em className={item[2] === "系统" ? "system" : ""}>{item[2]}</em>
          </button>;
        })}
      </div>
      {!shown.length && (
        <div className="empty-params">
          <PackageOpen />
          暂无已发布的{mode === "composite" ? "复合插件" : "插件"}
        </div>
      )}
    </Drawer>
  );
}

function ScriptView({ script }) {
  const lines = script.split("\n");
  return (
    <div className="script-workbench">
      <div className="script-editor" aria-label="Pipeline脚本预览">
        <div className="script-lines" aria-hidden="true">{lines.map((_, index) => <span key={index}>{index + 1}</span>)}</div>
        <textarea
          spellCheck="false"
          value={script}
          readOnly
          aria-label="Pipeline脚本内容"
          onScroll={(event) => {
            const gutter = event.currentTarget.previousElementSibling;
            if (gutter) gutter.scrollTop = event.currentTarget.scrollTop;
          }}
        />
      </div>
    </div>
  );
}

function Parameters({ params, setParams, pipelineScript, stages, onAdd, onEdit }) {
  return (
    <div className="params-page">
      <section>
        <header>
          <h2>构建参数</h2>
          <button onClick={onAdd}>
            <Plus />
            添加构建参数
          </button>
        </header>
        <p>
          参数构建是一种动态配置和执行的功能，参数可以在流水线中使用
          {"${参数名称}"}进行引用，并在启动构建时进行参数检查
        </p>
        <table>
          <thead>
            <tr>
              <th>参数名称</th>
              <th>类别</th>
              <th>默认值</th>
              <th>操作</th>
              <th>允许为空</th>
            </tr>
          </thead>
          <tbody>
            {params.map((p, i) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.type}</td>
                <td>{p.defaultValue || "--"}</td>
                <td>
                  <button onClick={() => onEdit(i)}>编辑</button>
                  <button
                    onClick={() => setParams(params.filter((_, n) => n !== i))}
                  >
                    删除
                  </button>
                </td>
                <td>{p.allowEmpty ? "是" : "否"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!params.length && (
          <div className="empty-params">
            <PackageOpen />
            暂无数据
          </div>
        )}
      </section>
      <section>
        <header>
          <h2>系统参数</h2>
        </header>
        <p>
          系统构建参数中包含了流水线执行时的常用构建参数，可直接在流水线中使用
          {"${参数名称}"}的方式进行引用
          <br />
          <b>注意：不允许创建与系统参数同名的参数</b>
        </p>
        <table>
          <thead>
            <tr>
              <th>参数名称</th>
              <th>描述</th>
            </tr>
          </thead>
          <tbody>
            {systemParams.map((x) => (
              <tr key={x[0]}>
                <td>{x[0]}</td>
                <td>{x[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function ParameterModal({ initialData, onClose, onSave }) {
  const [data, setData] = useState(() => {
    const source = initialData || {};
    const legacyOptions = String(source.options || "").split("\n").filter(Boolean);
    return {
      name: "", type: "字符串", defaultValue: "", description: "", allowEmpty: false,
      fromFile: false,
      optionPairs: legacyOptions.length ? legacyOptions.map((value) => ({ name: value, value })) : [{ name: "", value: "" }],
      credentialType: "", timestampFormat: "yyyyMMdd", script: "", ...source,
    };
  });
  const [error, setError] = useState("");
  const update = (key, value) => { setData((current) => ({ ...current, [key]: value })); setError(""); };
  const confirm = () => {
    const key = data.name.trim();
    if (!key) return setError("请输入参数名称");
    if (!/^[A-Za-z0-9_]+$/.test(key)) return setError("参数名称只允许英文、数字和下划线");
    if (systemParams.some((item) => item[0] === key)) return setError("参数名称不能与系统参数同名");
    if (["单选", "多选"].includes(data.type) && !data.fromFile && !data.optionPairs.some((item) => item.name.trim() && item.value.trim())) return setError("请至少配置一个选项");
    if (data.type === "时间戳" && !data.timestampFormat.trim()) return setError("请输入默认格式");
    if (data.type === "凭证" && (!data.credentialType || !data.defaultValue)) return setError("请选择凭证类型和默认值");
    if (data.type === "脚本式参数" && !data.script.trim()) return setError("请输入Groovy脚本");
    onSave({ ...data, name: key, options: data.optionPairs.map((item) => item.value).filter(Boolean).join("\n"), allowEmpty: false, id: initialData?.id || Date.now() });
  };
  return (
    <div className="modal-overlay">
      <section className="parameter-modal observed-parameter-modal">
        <header><strong>{initialData ? "编辑构建参数" : "添加构建参数"}</strong><button aria-label="关闭参数弹窗" onClick={onClose}><X /></button></header>
        <div>
          <label><span><em>*</em> 参数名称：</span><div className="counter-input"><input maxLength={50} value={data.name} placeholder="请输入参数名称" onChange={(event) => update("name", event.target.value)} /><small>{data.name.length}/50</small></div></label>
          <label><span><em>*</em> 参数类型：</span><select value={data.type} onChange={(event) => update("type", event.target.value)}>{["字符串", "单选", "多选", "时间戳", "凭证", "脚本式参数", "个人Token"].map((item) => <option key={item}>{item}</option>)}</select></label>
          {["单选", "多选"].includes(data.type) && <div className="parameter-options-block">
            <label className="param-file-toggle"><input type="checkbox" checked={!!data.fromFile} onChange={(event) => update("fromFile", event.target.checked)} />从文件读取</label>
            {data.fromFile ? <label><span>可选项文件：</span><input aria-label="可选项文件" type="file" /></label> : <>
              <label><span>可选项：</span><div className="parameter-option-list">{data.optionPairs.map((item, index) => <div className="parameter-option-row" key={index}>
                <span className="counter-input"><input maxLength={200} placeholder="请输入可选项名" value={item.name} onChange={(event) => update("optionPairs", data.optionPairs.map((entry, itemIndex) => itemIndex === index ? { ...entry, name: event.target.value } : entry))} /><small>{item.name.length}/200</small></span>
                <span className="counter-input"><input maxLength={200} placeholder="请输入可选项值" value={item.value} onChange={(event) => update("optionPairs", data.optionPairs.map((entry, itemIndex) => itemIndex === index ? { ...entry, value: event.target.value } : entry))} /><small>{item.value.length}/200</small></span>
                <button aria-label="删除可选项" disabled={data.optionPairs.length === 1} onClick={() => update("optionPairs", data.optionPairs.filter((_, itemIndex) => itemIndex !== index))}>−</button>
              </div>)}</div></label>
              <button className="parameter-add-option" onClick={() => update("optionPairs", [...data.optionPairs, { name: "", value: "" }])}><Plus />添加可选项</button>
            </>}
          </div>}
          {data.type === "时间戳" && <label><span><em>*</em> 默认格式：</span><div className="counter-input"><input maxLength={30} placeholder="请输入默认格式" value={data.timestampFormat} onChange={(event) => update("timestampFormat", event.target.value)} /><small>{data.timestampFormat.length}/30</small></div></label>}
          {data.type === "凭证" && <>
            <label><span><em>*</em> 凭证类型：</span><select value={data.credentialType} onChange={(event) => update("credentialType", event.target.value)}><option value="">请选择凭证类型</option><option>账号密码</option><option>SSH私钥</option><option>Token</option></select></label>
            <label><span><em>*</em> 默认值：</span><select value={data.defaultValue} onChange={(event) => update("defaultValue", event.target.value)}><option value="">请选择默认值</option>{data.credentialType && <option value={`mock-${data.credentialType}`}>mock-{data.credentialType}</option>}</select></label>
          </>}
          {data.type === "脚本式参数" && <label><span><em>*</em> Groovy脚本：</span><textarea className="groovy-param" placeholder="请输入Groovy脚本" value={data.script} onChange={(event) => update("script", event.target.value)} /></label>}
          {["字符串", "脚本式参数"].includes(data.type) && <label><span>默认值：</span><div className="counter-input textarea"><textarea maxLength={2000} placeholder="请输入默认值" value={data.defaultValue} onChange={(event) => update("defaultValue", event.target.value)} /><small>{data.defaultValue.length}/2000</small></div></label>}
          {["单选", "多选"].includes(data.type) && <label><span>默认值：</span><select value={data.defaultValue} onChange={(event) => update("defaultValue", event.target.value)}><option value="">请选择默认值</option>{data.optionPairs.filter((item) => item.value).map((item, index) => <option key={`${item.value}-${index}`} value={item.value}>{item.name || item.value}</option>)}</select></label>}
          <label><span>描述：</span><div className="counter-input textarea"><textarea maxLength={700} placeholder="请输入参数描述，按回车换行" value={data.description} onChange={(event) => update("description", event.target.value)} /><small>{data.description.length}/700</small></div></label>
          {error && <p className="error">{error}</p>}
        </div>
        <footer><button onClick={onClose}>取 消</button><button className="blue" onClick={confirm}>确 定</button></footer>
      </section>
    </div>
  );
}
