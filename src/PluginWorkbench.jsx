import React, { useMemo, useState } from "react";
import {
  ArrowDown,
  Braces,
  Check,
  ChevronRight,
  Database,
  GripVertical,
  Link2,
  Plus,
  Play,
  Save,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { petApi } from "./mockPetApi.js";
const initialControls = [
  {
    id: "repo",
    label: "代码仓库",
    key: "REPOSITORY",
    type: "下拉框",
    required: true,
    dataSource: "项目代码仓库",
    readonly: false,
  },
  {
    id: "branch",
    label: "分支",
    key: "BRANCH",
    type: "下拉框",
    required: true,
    dataSource: "仓库分支",
    readonly: false,
  },
  {
    id: "path",
    label: "检出目录",
    key: "CHECKOUT_DIR",
    type: "输入框",
    required: false,
    dataSource: "",
    readonly: false,
  },
];
export function PluginStudio({ item, composite, onClose, refresh }) {
  const entity = composite ? "composites" : "plugins",
    tabs = composite
      ? ["基础信息", "图形化编排", "参数绑定", "详细说明", "版本记录"]
      : [
          "基础信息",
          "扩展数据源",
          "控件设计",
          "插件编排",
          "插件执行",
          "绑定参数",
          "输出信息",
          "版本记录",
        ],
    [tab, setTab] = useState(tabs[0]),
    [status, setStatus] = useState(item.status),
    [version, setVersion] = useState(item.version || "0.1.0"),
    [sources, setSources] = useState(
      item.sources || [
        {
          id: "ds1",
          name: "项目代码仓库",
          method: "GET",
          url: "/api/projects/${PROJECT_ID}/repositories",
          label: "${name}",
          credential: "GitLab 服务账号",
          parsePath: "this.data",
          bindings: "id=this.id\nname=this.name",
          tested: true,
        },
        {
          id: "ds2",
          name: "仓库分支",
          method: "GET",
          url: "/api/repositories/${REPOSITORY}/branches",
          label: "${name}",
          credential: "GitLab 服务账号",
          parsePath: "this.data",
          bindings: "name=this.name",
          tested: true,
        },
      ],
    ),
    [selectedSourceId, setSelectedSourceId] = useState(
      (item.sources || [])[0]?.id || "ds1",
    ),
    [controls, setControls] = useState(item.controls || initialControls),
    [selectedControlId, setSelectedControlId] = useState(
      (item.controls || initialControls).at(-1)?.id || null,
    ),
    [dragControlId, setDragControlId] = useState(null),
    [dragStepIndex, setDragStepIndex] = useState(null),
    [previewOpen, setPreviewOpen] = useState(false),
    [steps, setSteps] = useState(
      item.workflowSteps ||
        (composite
          ? ["执行单元测试", "解析测试报告", "覆盖率分析"]
          : ["准备参数", "执行命令", "回传状态"]),
    ),
    [params, setParams] = useState(
      item.params || [
        {
          name: "BUILD_TYPE",
          type: "字符串",
          defaultValue: "release",
          required: true,
        },
      ],
    ),
    [outputs, setOutputs] = useState(
      item.outputs || [
        {
          name: "COMMIT_ID",
          source: "stdout.commit",
          description: "检出的提交号",
        },
      ],
    ),
    [versions, setVersions] = useState(
      item.versionHistory || [
        {
          version: item.version || "1.0.0",
          status: item.status,
          author: "demo-admin",
          time: "2026-09-11 18:20",
        },
      ],
    ),
    [command, setCommand] = useState(
      item.command ||
        `git clone --branch \${BRANCH} \${REPOSITORY} \${CHECKOUT_DIR}\ncd \${CHECKOUT_DIR}\ngit rev-parse HEAD`,
    ),
    [selectedVersion, setSelectedVersion] = useState(null),
    [upgradePrompt, setUpgradePrompt] = useState(null),
    [toast, setToast] = useState("");
  const [failurePolicy, setFailurePolicy] = useState(
      item.failurePolicy || "终止流水线",
    ),
    [retryOnFailure, setRetryOnFailure] = useState(
      item.retryOnFailure || false,
    ),
    [pluginName, setPluginName] = useState(item.name),
    [category, setCategory] = useState(item.category || "通用"),
    [organization, setOrganization] = useState(item.organization || "研发中心"),
    [description, setDescription] = useState(
      item.description || "流水线标准化能力",
    ),
    [repository, setRepository] = useState("pet-demo"),
    [branch, setBranch] = useState("main"),
    [debugging, setDebugging] = useState(false),
    [debugOutput, setDebugOutput] = useState("等待执行调试…"),
    [documentation, setDocumentation] = useState(
      `# ${item.name}\n\n适用于标准流水线流程，可在项目间共享。\n\n## 输入\n请配置仓库、分支和工作目录。\n\n## 输出\n执行完成后输出提交号和报告地址。`,
    );
  const note = (t) => {
      setToast(t);
      setTimeout(() => setToast(""), 1600);
    },
    updateSource = (id, patch) =>
      setSources(
        sources.map((source) =>
          source.id === id
            ? { ...source, ...patch, tested: patch.tested ?? false }
            : source,
        ),
      ),
    activeControl =
      controls.find((control) => control.id === selectedControlId) ||
      controls.at(-1),
    updateControl = (patch) =>
      setControls(
        controls.map((control) =>
          control.id === activeControl?.id ? { ...control, ...patch } : control,
        ),
      ),
    persist = async (next) => {
      if (!/^[\u4e00-\u9fa5A-Za-z0-9_-]{2,30}$/.test(pluginName)) {
        note("插件名称需为2-30位汉字、字母、数字、下划线或短横线");
        setTab("基础信息");
        return;
      }
      if (!/^\d+\.\d+\.\d+$/.test(version)) {
        note("插件版本必须符合 x.x.x 格式");
        setTab("基础信息");
        return;
      }
      if (description.length > 200) {
        note("插件描述不能超过200个字符");
        setTab("基础信息");
        return;
      }
      setStatus(next);
      const nextVersionRecord = {
        version,
        status: next,
        author: "demo-admin",
        time: new Date().toLocaleString("zh-CN", { hour12: false }),
      };
      const nextVersions = [
        nextVersionRecord,
        ...versions.filter((entry) => entry.version !== version),
      ];
      await petApi.update(entity, item.id, {
        status: next,
        version,
        steps: steps.length,
        workflowSteps: steps,
        command,
        controls,
        sources,
        params,
        outputs,
        failurePolicy,
        retryOnFailure,
        name: pluginName,
        category,
        organization,
        description,
        documentation,
        versionHistory: nextVersions,
      });
      await refresh();
      setVersions(nextVersions);
      note(next === "已发布" ? "插件发布成功" : "调试版本已暂存");
    };
  const findAffectedPipelines = async () => {
    const matchesPlugin = (name) =>
      String(name || "")
        .replace(/\s+/g, "")
        .toLowerCase() ===
      String(item.name || pluginName)
        .replace(/\s+/g, "")
        .toLowerCase();
    const db = await petApi.snapshot();
    return db.pipelines.filter((pipeline) =>
      (pipeline.stageList || []).some((stage) => {
        const steps = stage.steps?.length
          ? stage.steps
          : stage.plugin
            ? [{ plugin: stage.plugin, config: stage.pluginConfig }]
            : [];
        return steps.some((step) => matchesPlugin(step.plugin));
      }),
    );
  };
  const requestPublish = async () => {
    const affected = await findAffectedPipelines();
    if (affected.length && version !== item.version) {
      setUpgradePrompt({ affected, selected: affected.map((x) => x.id) });
      return;
    }
    await persist("已发布");
  };
  const publishAndUpgrade = async () => {
    const selected = new Set(upgradePrompt?.selected || []);
    const matchesPlugin = (name) =>
      String(name || "")
        .replace(/\s+/g, "")
        .toLowerCase() ===
      String(item.name || pluginName)
        .replace(/\s+/g, "")
        .toLowerCase();
    for (const pipeline of upgradePrompt?.affected || []) {
      if (!selected.has(pipeline.id)) continue;
      const stageList = (pipeline.stageList || []).map((stage) => {
        const updateStep = (step) =>
          matchesPlugin(step.plugin)
            ? {
                ...step,
                config: {
                  ...(step.config || {}),
                  definition: {
                    ...(step.config?.definition || {}),
                    version,
                  },
                },
              }
            : step;
        return stage.steps?.length
          ? { ...stage, steps: stage.steps.map(updateStep) }
          : matchesPlugin(stage.plugin)
            ? {
                ...stage,
                pluginConfig: {
                  ...(stage.pluginConfig || {}),
                  definition: {
                    ...(stage.pluginConfig?.definition || {}),
                    version,
                  },
                },
              }
            : stage;
      });
      await petApi.update("pipelines", pipeline.id, { stageList });
    }
    setUpgradePrompt(null);
    await persist("已发布");
    note(`插件已发布，已升级 ${selected.size} 条流水线`);
  };
  const Palette = () => (
    <aside className="plugin-palette">
      <h3>可用步骤</h3>
      {[
        "代码检出",
        "通用脚本",
        "执行测试",
        "报告解析",
        "上传制品",
        "消息通知",
      ].map((x) => (
        <button onClick={() => setSteps([...steps, x])} key={x}>
          <Plus size={14} />
          {x}
        </button>
      ))}
    </aside>
  );
  return (
    <div className="full-panel plugin-workbench">
      <header>
        <button onClick={onClose}>← 返回列表</button>
        <strong>{pluginName}</strong>
        <span className={`status s-${status}`}>{status}</span>
        <button onClick={() => persist("调试中")}>
          <Play size={15} />
          调试
        </button>
        <button onClick={() => persist("暂存")}>
          <Save size={15} />
          暂存
        </button>
        <button className="primary" onClick={requestPublish}>
          <Check size={15} />
          发布
        </button>
      </header>
      <div className="studio-tabs scroll-tabs">
        {tabs.map((x) => (
          <button
            className={tab === x ? "active" : ""}
            onClick={() => setTab(x)}
            key={x}
          >
            {x}
          </button>
        ))}
      </div>
      {tab === "基础信息" && (
        <div className="plugin-form">
          <h2>基础信息</h2>
          <label>
            插件名称
            <input
              maxLength={30}
              value={pluginName}
              onChange={(e) => setPluginName(e.target.value)}
            />
            <small>
              {pluginName.length}/30，仅支持汉字、字母、数字、下划线和短横线
            </small>
          </label>
          <label>
            插件唯一标识
            <input value={item.uniqueKey || `plugin-${item.id}`} readOnly />
          </label>
          <label>
            插件类型
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>代码管理</option>
              <option>构建</option>
              <option>测试</option>
              <option>发布</option>
              <option>通用</option>
              <option>Yocto</option>
            </select>
          </label>
          <label>
            版本号
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
          </label>
          <label>
            可用组织
            <input
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </label>
          <label>
            描述
            <textarea
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <small>{description.length}/200</small>
          </label>
        </div>
      )}
      {tab === "扩展数据源" && (
        <div className="split-editor">
          <aside>
            <h3>数据源</h3>
            {sources.map((s) => (
              <button
                className={selectedSourceId === s.id ? "active" : ""}
                onClick={() => setSelectedSourceId(s.id)}
                key={s.id}
              >
                <Database size={15} />
                <span>{s.name}</span>
                <ChevronRight size={14} />
              </button>
            ))}
            <button
              className="add-dashed"
              onClick={() => {
                const next = {
                  id: `ds${Date.now()}`,
                  name: "新数据源",
                  method: "GET",
                  url: "/api/mock",
                  label: "${name}",
                  credential: "",
                  parsePath: "this.data",
                  urlParams: "",
                  params: "",
                  headers: "",
                  bindings: "id=this.id\nname=this.name",
                  tested: false,
                };
                setSources([...sources, next]);
                setSelectedSourceId(next.id);
              }}
            >
              <Plus size={14} />
              新增数据源
            </button>
          </aside>
          <main>
            <h2>数据源配置</h2>
            {sources.map(
              (s, i) =>
                s.id === selectedSourceId && (
                  <section className="source-card" key={s.id}>
                    <header>
                      <input
                        value={s.name}
                        onChange={(e) =>
                          setSources(
                            sources.map((x, j) =>
                              j === i ? { ...x, name: e.target.value } : x,
                            ),
                          )
                        }
                      />
                      <button
                        onClick={() => {
                          const next = sources.filter((_, j) => j !== i);
                          setSources(next);
                          setSelectedSourceId(next[0]?.id || null);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </header>
                    <label>
                      请求方式
                      <select
                        value={s.method}
                        onChange={(e) =>
                          setSources(
                            sources.map((x, j) =>
                              j === i ? { ...x, method: e.target.value } : x,
                            ),
                          )
                        }
                      >
                        <option>GET</option>
                        <option>POST</option>
                      </select>
                    </label>
                    <label>
                      请求地址
                      <input
                        value={s.url}
                        onChange={(e) =>
                          setSources(
                            sources.map((x, j) =>
                              j === i ? { ...x, url: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      凭证
                      <select
                        value={s.credential || ""}
                        onChange={(e) =>
                          updateSource(s.id, { credential: e.target.value })
                        }
                      >
                        <option value="">不使用凭证</option>
                        <option>GitLab 服务账号</option>
                        <option>构建机 SSH</option>
                      </select>
                    </label>
                    <label>
                      解析路径
                      <input
                        value={s.parsePath || ""}
                        placeholder="例如 this.data"
                        onChange={(e) =>
                          updateSource(s.id, { parsePath: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      URL 参数
                      <textarea
                        value={s.urlParams || ""}
                        placeholder="key=value，每行一项"
                        onChange={(e) =>
                          updateSource(s.id, { urlParams: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Params 参数
                      <textarea
                        value={s.params || ""}
                        placeholder="key=value，每行一项"
                        onChange={(e) =>
                          updateSource(s.id, { params: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Header 参数
                      <textarea
                        value={s.headers || ""}
                        placeholder="Authorization=Bearer ..."
                        onChange={(e) =>
                          updateSource(s.id, { headers: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      绑定属性
                      <textarea
                        value={s.bindings || ""}
                        placeholder="name=this.name"
                        onChange={(e) =>
                          updateSource(s.id, { bindings: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      展示标签
                      <input
                        value={s.label}
                        onChange={(e) =>
                          setSources(
                            sources.map((x, j) =>
                              j === i ? { ...x, label: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <button
                      className={s.tested ? "primary" : ""}
                      onClick={() => {
                        if (
                          !s.name.trim() ||
                          !s.url.trim() ||
                          !s.bindings?.trim()
                        ) {
                          note("请填写名称、请求地址并至少绑定一个属性");
                          return;
                        }
                        updateSource(s.id, { tested: true });
                        note("数据源测试成功，返回 3 条记录");
                      }}
                    >
                      {s.tested ? "✓ 测试通过" : "测试数据源"}
                    </button>
                  </section>
                ),
            )}
            {!sources.length && <p>暂无数据源，请从左侧新增。</p>}
          </main>
        </div>
      )}
      {tab === "控件设计" && (
        <div className="control-designer">
          <aside>
            <h3>控件库</h3>
            {[
              "输入框",
              "文本域",
              "下拉框",
              "多选框",
              "开关",
              "代码编辑器",
              "文件选择",
            ].map((x) => (
              <button
                onClick={() => {
                  const next = {
                    id: `c${Date.now()}`,
                    label: x,
                    key: `PARAM_${controls.length + 1}`,
                    type: x,
                    required: false,
                    dataSource: "",
                    readonly: false,
                    placeholder: `请输入${x}`,
                    defaultValue: "",
                    maxLength: 100,
                    pattern: "",
                    errorMessage: "",
                  };
                  setControls([...controls, next]);
                  setSelectedControlId(next.id);
                }}
                key={x}
              >
                <Plus size={14} />
                {x}
              </button>
            ))}
          </aside>
          <main>
            <h2>
              流水线配置表单预览{" "}
              <button onClick={() => setPreviewOpen(true)}>打开预览</button>
            </h2>
            {controls.map((c, i) => (
              <div
                className={`control-row ${activeControl?.id === c.id ? "active" : ""}`}
                onClick={() => setSelectedControlId(c.id)}
                draggable
                onDragStart={() => setDragControlId(c.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (!dragControlId || dragControlId === c.id) return;
                  const from = controls.findIndex(
                    (item) => item.id === dragControlId,
                  );
                  const to = controls.findIndex((item) => item.id === c.id);
                  const next = [...controls];
                  const [moved] = next.splice(from, 1);
                  next.splice(to, 0, moved);
                  setControls(next);
                  setDragControlId(null);
                }}
                key={c.id}
              >
                <GripVertical />
                <label>
                  <span>
                    {c.label}
                    {c.required && <em>*</em>}
                  </span>
                  {c.type === "下拉框" ? (
                    <select>
                      <option>请选择{c.label}</option>
                    </select>
                  ) : (
                    <input
                      placeholder={c.placeholder || `请输入${c.label}`}
                      defaultValue={c.defaultValue || ""}
                      maxLength={c.maxLength || undefined}
                      readOnly={c.readonly}
                    />
                  )}
                </label>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    const next = controls.filter((_, j) => j !== i);
                    setControls(next);
                    if (activeControl?.id === c.id)
                      setSelectedControlId(next.at(-1)?.id || null);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </main>
          <section>
            <h3>控件属性</h3>
            {activeControl ? (
              <>
                <label>
                  标题
                  <input
                    value={activeControl.label}
                    onChange={(e) => updateControl({ label: e.target.value })}
                  />
                </label>
                <label>
                  参数 Key
                  <input
                    value={activeControl.key}
                    onChange={(e) =>
                      updateControl({
                        key: e.target.value
                          .replace(/[^A-Za-z0-9_]/g, "")
                          .toUpperCase(),
                      })
                    }
                  />
                </label>
                <label>
                  绑定数据源
                  <select
                    value={activeControl.dataSource}
                    onChange={(e) =>
                      updateControl({ dataSource: e.target.value })
                    }
                  >
                    <option value="">不绑定</option>
                    {sources.map((s) => (
                      <option key={s.id}>{s.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={activeControl.required}
                    onChange={(e) =>
                      updateControl({ required: e.target.checked })
                    }
                  />{" "}
                  必填
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={activeControl.readonly}
                    onChange={(e) =>
                      updateControl({ readonly: e.target.checked })
                    }
                  />{" "}
                  流水线配置时只读
                </label>
                <label>
                  提示信息
                  <input
                    value={activeControl.placeholder || ""}
                    maxLength={30}
                    onChange={(e) =>
                      updateControl({ placeholder: e.target.value })
                    }
                  />
                </label>
                <label>
                  默认值
                  <input
                    value={activeControl.defaultValue || ""}
                    onChange={(e) =>
                      updateControl({ defaultValue: e.target.value })
                    }
                  />
                </label>
                <label>
                  字符数限制
                  <input
                    type="number"
                    min="0"
                    value={activeControl.maxLength || ""}
                    onChange={(e) =>
                      updateControl({ maxLength: Number(e.target.value) || 0 })
                    }
                  />
                </label>
                <label>
                  正则表达式
                  <input
                    value={activeControl.pattern || ""}
                    placeholder="例如 ^[A-Za-z0-9_-]+$"
                    onChange={(e) => updateControl({ pattern: e.target.value })}
                  />
                </label>
                <label>
                  错误提醒
                  <input
                    value={activeControl.errorMessage || ""}
                    onChange={(e) =>
                      updateControl({ errorMessage: e.target.value })
                    }
                  />
                </label>
                <h4>数据源联动</h4>
                <p>
                  {activeControl.dataSource
                    ? `当前控件使用“${activeControl.dataSource}”，上游控件变化时重新请求。`
                    : "绑定数据源后可配置参数引用，例如 ${REPOSITORY.id}。"}
                </p>
              </>
            ) : (
              <p>请从左侧添加控件</p>
            )}
          </section>
        </div>
      )}
      {(tab === "插件编排" || tab === "图形化编排") && (
        <div className="studio-canvas">
          <Palette />
          <main>
            <span className="start">开始</span>
            {steps.map((x, i) => (
              <React.Fragment key={`${x}-${i}`}>
                <i>
                  <ArrowDown />
                </i>
                <div
                  draggable
                  onDragStart={() => setDragStepIndex(i)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (dragStepIndex == null || dragStepIndex === i) return;
                    const next = [...steps];
                    const [moved] = next.splice(dragStepIndex, 1);
                    next.splice(i, 0, moved);
                    setSteps(next);
                    setDragStepIndex(null);
                  }}
                >
                  <GripVertical size={14} />
                  <b>{i + 1}</b>
                  <span>{x}</span>
                  <button
                    onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                  >
                    <X size={14} />
                  </button>
                </div>
              </React.Fragment>
            ))}
            <i>
              <ArrowDown />
            </i>
            <span className="end">结束</span>
          </main>
          <section>
            <h3>步骤属性</h3>
            <label>
              步骤名称
              <input value={steps.at(-1) || ""} readOnly />
            </label>
            <label>
              失败策略
              <select
                value={failurePolicy}
                onChange={(e) => setFailurePolicy(e.target.value)}
              >
                <option>终止流水线</option>
                <option>继续执行</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={retryOnFailure}
                onChange={(e) => setRetryOnFailure(e.target.checked)}
              />{" "}
              失败时重试一次
            </label>
          </section>
        </div>
      )}
      {tab === "插件执行" && (
        <div className="command-editor">
          <section>
            <h2>命令编排</h2>
            <p>支持使用控件参数、流水线环境变量和数据源返回值。</p>
            <textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
            />
            <div className="variable-chips">
              {[...controls.map((x) => x.key), "WORKSPACE", "BUILD_NUMBER"].map(
                (x) => (
                  <button
                    onClick={() =>
                      setCommand(
                        `${command}${command.endsWith(" ") || !command ? "" : " "}\${${x}}`,
                      )
                    }
                    key={x}
                  >{`\${${x}}`}</button>
                ),
              )}
            </div>
          </section>
          <aside>
            <h3>调试执行</h3>
            <label>
              执行节点
              <select aria-label="执行节点">
                <option>linux-build-01</option>
              </select>
            </label>
            <label>
              REPOSITORY
              <input
                value={repository}
                onChange={(e) => setRepository(e.target.value)}
              />
            </label>
            <label>
              BRANCH
              <input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
            </label>
            <button
              className="primary"
              disabled={debugging}
              onClick={() => {
                setDebugging(true);
                setDebugOutput(
                  `$ 准备节点 linux-build-01\n$ REPOSITORY=${repository}\n$ BRANCH=${branch}\n正在执行…`,
                );
                setTimeout(() => {
                  setDebugging(false);
                  setDebugOutput(
                    `$ git clone --branch ${branch} ${repository}\nCloning into '${repository}'...\nHEAD 8f10ae2\nexit code: 0`,
                  );
                  note("调试执行成功，退出码 0");
                }, 650);
              }}
            >
              {debugging ? "执行中…" : "执行调试"}
            </button>
            <pre>{debugOutput}</pre>
          </aside>
        </div>
      )}
      {tab === "绑定参数" && (
        <DataTable
          title="构建参数"
          rows={params}
          setRows={setParams}
          columns={["name", "type", "defaultValue"]}
        />
      )}{" "}
      {tab === "输出信息" && (
        <DataTable
          title="输出变量"
          rows={outputs}
          setRows={setOutputs}
          columns={["name", "source", "description"]}
        />
      )}{" "}
      {tab === "参数绑定" && (
        <DataTable
          title="复合插件参数映射"
          rows={params}
          setRows={setParams}
          columns={["name", "type", "defaultValue"]}
        />
      )}{" "}
      {tab === "详细说明" && (
        <div className="plugin-form">
          <h2>详细说明</h2>
          <textarea
            className="doc-editor"
            value={documentation}
            onChange={(e) => setDocumentation(e.target.value)}
          />
        </div>
      )}
      {tab === "版本记录" && (
        <div className="version-page">
          <h2>版本记录</h2>
          <table>
            <thead>
              <tr>
                <th>版本</th>
                <th>状态</th>
                <th>创建人</th>
                <th>发布时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v, i) => (
                <tr key={`${v.version}-${i}`}>
                  <td>{v.version}</td>
                  <td>
                    <span className={`status s-${v.status}`}>{v.status}</span>
                  </td>
                  <td>{v.author}</td>
                  <td>{v.time}</td>
                  <td className="actions">
                    <button onClick={() => setSelectedVersion(v)}>查看</button>
                    <button
                      onClick={() => {
                        setVersion(v.version.replace(/\d+$/, (n) => +n + 1));
                        setStatus("调试中");
                        note("已创建新的调试版本");
                      }}
                    >
                      新建调试版本
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {previewOpen && (
        <div className="modal-overlay">
          <section className="parameter-modal plugin-preview">
            <header>
              <strong>{pluginName} · 配置预览</strong>
              <button
                aria-label="关闭预览"
                onClick={() => setPreviewOpen(false)}
              >
                <X />
              </button>
            </header>
            <div className="plugin-form">
              {controls.map((control) => (
                <label key={control.id}>
                  {control.label}
                  {control.required && <em>*</em>}
                  {control.type === "下拉框" ? (
                    <select disabled={control.readonly} defaultValue="">
                      <option value="">请选择{control.label}</option>
                      <option>示例选项</option>
                    </select>
                  ) : control.type === "文本域" ||
                    control.type === "代码编辑器" ? (
                    <textarea
                      required={control.required}
                      readOnly={control.readonly}
                      maxLength={control.maxLength || undefined}
                      defaultValue={control.defaultValue || ""}
                      placeholder={control.placeholder}
                    />
                  ) : (
                    <input
                      required={control.required}
                      readOnly={control.readonly}
                      maxLength={control.maxLength || undefined}
                      pattern={control.pattern || undefined}
                      defaultValue={control.defaultValue || ""}
                      placeholder={control.placeholder}
                    />
                  )}{" "}
                  {control.errorMessage && (
                    <small>{control.errorMessage}</small>
                  )}
                </label>
              ))}
            </div>
            <footer>
              <button className="primary" onClick={() => setPreviewOpen(false)}>
                关闭预览
              </button>
            </footer>
          </section>
        </div>
      )}
      {selectedVersion && (
        <div className="modal-overlay">
          <section className="parameter-modal">
            <header>
              <strong>版本 {selectedVersion.version}</strong>
              <button onClick={() => setSelectedVersion(null)}>
                <X />
              </button>
            </header>
            <div className="plugin-form">
              <label>
                版本状态
                <input value={selectedVersion.status} readOnly />
              </label>
              <label>
                发布人
                <input value={selectedVersion.author} readOnly />
              </label>
              <label>
                发布时间
                <input value={selectedVersion.time} readOnly />
              </label>
              <label>
                执行命令
                <textarea value={command} readOnly />
              </label>
            </div>
            <footer>
              <button
                className="primary"
                onClick={() => setSelectedVersion(null)}
              >
                关闭
              </button>
            </footer>
          </section>
        </div>
      )}
      {upgradePrompt && (
        <div className="modal-overlay">
          <section className="parameter-modal">
            <header>
              <strong>升级引用此插件的流水线</strong>
              <button
                aria-label="关闭升级提示"
                onClick={() => setUpgradePrompt(null)}
              >
                <X />
              </button>
            </header>
            <p>
              新版本 {version} 发布后，可将以下流水线中的“{item.name}
              ”自动升级。未勾选的流水线继续保留原版本。
            </p>
            <div className="plugin-form">
              {upgradePrompt.affected.map((pipeline) => (
                <label className="check-line" key={pipeline.id}>
                  <input
                    type="checkbox"
                    checked={upgradePrompt.selected.includes(pipeline.id)}
                    onChange={(event) =>
                      setUpgradePrompt((current) => ({
                        ...current,
                        selected: event.target.checked
                          ? [...current.selected, pipeline.id]
                          : current.selected.filter((id) => id !== pipeline.id),
                      }))
                    }
                  />
                  {pipeline.name}
                </label>
              ))}
            </div>
            <footer>
              <button onClick={() => setUpgradePrompt(null)}>取消</button>
              <button className="primary" onClick={publishAndUpgrade}>
                发布并升级所选流水线
              </button>
            </footer>
          </section>
        </div>
      )}
      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}

function DataTable({ title, rows, setRows, columns }) {
  return (
    <div className="data-table-page">
      <div className="domain-head">
        <div>
          <h2>{title}</h2>
          <p>定义插件在流水线配置及执行过程中的数据契约。</p>
        </div>
        <button
          className="primary"
          onClick={() =>
            setRows([
              ...rows,
              Object.fromEntries(
                columns.map((c, i) => [c, i ? "" : "NEW_PARAM"]),
              ),
            ])
          }
        >
          <Plus size={15} />
          新增
        </button>
      </div>
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c}>
                  <input
                    value={r[c] ?? ""}
                    onChange={(e) =>
                      setRows(
                        rows.map((x, j) =>
                          j === i ? { ...x, [c]: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </td>
              ))}
              <td>
                <button onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
