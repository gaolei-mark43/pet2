import React, { useState } from "react";
import { GitBranch, Plus, Search, X } from "lucide-react";
import { petApi } from "./mockPetApi.js";
import { pipelineFromTemplate } from "./pipelineReuseModel.js";

export function PipelineWizard({ db, onClose, onDone }) {
  const [step, setStep] = useState(1),
    [templateTab, setTemplateTab] = useState("系统模板"),
    [template, setTemplate] = useState("新空白模板"),
    [error, setError] = useState(""),
    [form, setForm] = useState({
      name: "",
      engine: "Jenkins 构建引擎",
      description: "",
      cleanup: true,
      cleanupMode: "all",
      cleanupDays: 30,
      cleanupBuilds: 100,
      priority: "5",
      label: "",
    });
  const templates = [
    "新空白模板",
    ...(db.templates || []).map((item) => item.name),
  ];
  const templateDefinition = (db.templates || []).find(
    (item) => item.name === template,
  );
  const valid = !!form.name.trim();
  const create = async () => {
    if (!valid) {
      setError("名称不能为空");
      return;
    }
    const created = await petApi.create("pipelines", pipelineFromTemplate(form, template, templateDefinition));
    onDone(created);
  };
  const visibleTemplates = templateTab === "系统模板"
    ? ["新空白模板"]
    : (db.templates || []).map((item) => item.name);
  const chooseTemplate = (name) => {
    const definition = (db.templates || []).find((item) => item.name === name);
    setTemplate(name);
    if (definition) {
      setForm((current) => ({
        ...current,
        ...(definition.keepBasic ? definition.basic || {} : {}),
        ...(definition.keepLabel ? { label: definition.label || "" } : {}),
      }));
    }
    setStep(2);
  };
  return (
    <div className="pipeline-create-page">
      <button className="create-back" onClick={step === 1 ? onClose : () => setStep(1)}>← {step === 1 ? "返回流水线管理" : "重新选择流水线模板"}</button>
      <div className="create-steps"><b className={step === 1 ? "active" : "done"}>{step === 1 ? "1" : "✓"}</b><i/><b className={step === 2 ? "active" : ""}>2</b></div>
      <header className="create-title"><strong><em>Step{step}</em> {step === 1 ? "选择流水线模板" : "流水线信息编辑"}</strong>{step === 1 && <span>选择一个模板来快速配置流水线，若没有合适的，可使用空白模板定制自己的流水线</span>}</header>
      {step === 1 ? (
        <main className="create-template-main">
          <nav><button className={templateTab === "系统模板" ? "active" : ""} onClick={() => setTemplateTab("系统模板")}>系统模板</button><button className={templateTab === "自定义模板" ? "active" : ""} onClick={() => setTemplateTab("自定义模板")}>自定义模板</button></nav>
          <div className="official-template-grid">
            {visibleTemplates.map((x) => <button key={x} onClick={() => chooseTemplate(x)}><div className="template-card-head"><GitBranch/><span><b>{x}</b><small>{x === "新空白模板" ? "空白模板" : "自定义流水线模板"}</small></span></div><div className="template-tags"><i>{x === "新空白模板" ? "gitcheckout" : "自定义模板"}</i></div></button>)}
            {!visibleTemplates.length && <div className="template-empty">暂无自定义模板</div>}
          </div>
        </main>
      ) : (
        <main className="create-form-main">
          <section className="create-form-fields">
            <label><span><em>*</em> 流水线名称：</span><div className="create-count"><input placeholder="请输入流水线名称" value={form.name} maxLength={100} onChange={(e)=>{setForm({...form,name:e.target.value});setError("");}}/><small>{form.name.length}/100</small></div></label>
            <label><span><em>*</em> 构建引擎：</span><input value="Jenkins-http://mock-jenkins.local" disabled/></label>
            <label><span>流水线标签 ⓘ：</span><input value={form.label} onChange={(e)=>setForm({...form,label:e.target.value})}/></label>
            <label><span><em>*</em> 流水线优先级 ⓘ：</span><select value={form.priority} onChange={(e)=>setForm({...form,priority:e.target.value})}>{[1,2,3,4,5].map(x=><option key={x}>{x}</option>)}</select></label>
            <label className="create-cleanup"><span/><div><label><input type="checkbox" checked={form.cleanup} onChange={(e)=>setForm({...form,cleanup:e.target.checked})}/> 定期清理历史构建 ⓘ</label>{form.cleanup && <><div className="cleanup-radios"><label><input type="radio" checked={form.cleanupMode === "all"} onChange={()=>setForm({...form,cleanupMode:"all"})}/> 清除所有构建数据 ⓘ</label><label><input type="radio" checked={form.cleanupMode === "results"} onChange={()=>setForm({...form,cleanupMode:"results"})}/> 只清除收集的结果文件</label></div><div className="cleanup-number">构建时间超过 <input type="number" value={form.cleanupDays} onChange={(e)=>setForm({...form,cleanupDays:e.target.value})}/> 天后自动清理</div><div className="cleanup-number">构建次数超过 <input type="number" value={form.cleanupBuilds} onChange={(e)=>setForm({...form,cleanupBuilds:e.target.value})}/> 次后自动清理</div></>}</div></label>
            {error && <p className="error">{error}</p>}
          </section>
          <aside className="create-template-summary"><h3>流水线模板</h3><div className="selected-template-card"><GitBranch/><span><b>{template}</b><small>{template === "新空白模板" ? "空白模板" : "自定义流水线模板"}</small></span><i>{template === "新空白模板" ? "gitcheckout" : "自定义模板"}</i></div><h3>流水线描述</h3><div className="create-description"><textarea placeholder="请输入流水线描述" maxLength={300} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/><small>{form.description.length}/300</small></div></aside>
          <button className="create-submit" onClick={create}>▣ 确认提交</button>
        </main>
      )}
    </div>
  );
}

export function RepositoryExplorer({ repo, onClose }) {
  const [branch, setBranch] = useState(repo.branch),
    [file, setFile] = useState("README.md"),
    [mode, setMode] = useState("文件"),
    [query, setQuery] = useState("");
  const files = ["src", "docs", "Jenkinsfile", "README.md", "package.json"];
  const visibleFiles = files.filter((item) =>
    item.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="full-panel">
      <header>
        <button onClick={onClose}>← 返回仓库列表</button>
        <strong>{repo.name}</strong>
        <span className="status s-成功">{repo.status}</span>
      </header>
      <div className="repo-tools">
        <select value={branch} onChange={(e) => setBranch(e.target.value)}>
          <option>main</option>
          <option>develop</option>
          <option>release/1.0</option>
        </select>
        <button
          className={mode === "文件" ? "active" : ""}
          onClick={() => setMode("文件")}
        >
          文件
        </button>
        <button
          className={mode === "历史版本" ? "active" : ""}
          onClick={() => setMode("历史版本")}
        >
          历史版本
        </button>
        <button
          className={mode === "分支" ? "active" : ""}
          onClick={() => setMode("分支")}
        >
          分支
        </button>
        <button
          className={mode === "Tag" ? "active" : ""}
          onClick={() => setMode("Tag")}
        >
          Tag
        </button>
        <label>
          <Search size={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索文件、分支、Tag 或提交"
          />
        </label>
      </div>
      {mode === "历史版本" ? (
        <div className="commits">
          {[
            ["8f10ae2", "feat: add pipeline trigger", "demo-admin", "今天 18:20"],
            ["65da831", "fix: artifact upload retry", "zhangsan", "昨天 16:42"],
            ["214e97c", "docs: update build guide", "demo-admin", "3 天前"],
          ].map((x) => (
            <div key={x[0]}>
              <code>{x[0]}</code>
              <b>{x[1]}</b>
              <span>{x[2]}</span>
              <small>{x[3]}</small>
            </div>
          ))}
        </div>
      ) : mode === "分支" ? (
        <div className="commits">
          {["main", "develop", "release/1.0"]
            .filter((item) => item.includes(query))
            .map((item, index) => (
              <div key={item}>
                <GitBranch />
                <b>{item}</b>
                <span>{index ? "zhangsan" : "demo-admin"}</span>
                <small>{index ? "昨天" : "刚刚"}</small>
              </div>
            ))}
        </div>
      ) : mode === "Tag" ? (
        <div className="commits">
          {["v2.3.0", "v2.2.1", "v2.2.0"]
            .filter((item) => item.includes(query))
            .map((item, index) => (
              <div key={item}>
                <code>{item}</code>
                <b>Release {item}</b>
                <span>demo-admin</span>
                <small>{index + 1} 周前</small>
              </div>
            ))}
        </div>
      ) : (
        <div className="repo-browser">
          <aside>
            <b>{repo.name}</b>
            {visibleFiles.map((x) => (
              <button
                className={file === x ? "active" : ""}
                onClick={() => setFile(x)}
                key={x}
              >
                ▸ {x}
              </button>
            ))}
          </aside>
          <main>
            <div className="file-head">
              <b>{file}</b>
              <span>最近提交：完善流水线演示</span>
            </div>
            <pre>
              {file === "README.md"
                ? `# PET Demo\n\n该仓库用于验证 PET 持续集成流水线。\n\n## Build\n\nnpm install\nnpm run build`
                : file === "Jenkinsfile"
                  ? `pipeline {\n  agent { label 'linux' }\n  stages {\n    stage('Build') { steps { sh 'npm run build' } }\n    stage('Test') { steps { sh 'npm test' } }\n  }\n}`
                  : `${file}/\n  components/\n  services/\n  index.js`}
            </pre>
          </main>
        </div>
      )}
    </div>
  );
}

export function PluginStudio({ item, composite, onClose, refresh }) {
  const entity = composite ? "composites" : "plugins",
    [tab, setTab] = useState("基础信息"),
    [status, setStatus] = useState(item.status),
    [nodes, setNodes] = useState(
      composite ? ["执行单元测试", "解析测试报告", "覆盖率分析"] : [],
    );
  const tabs = composite
    ? ["基础信息", "图形化编排", "参数绑定", "详细说明"]
    : [
        "基础信息",
        "扩展数据源",
        "插件编排",
        "插件执行",
        "绑定参数",
        "输出信息",
      ];
  const change = async (next) => {
    setStatus(next);
    await petApi.update(entity, item.id, { status: next, steps: nodes.length });
    await refresh();
  };
  return (
    <div className="full-panel">
      <header>
        <button onClick={onClose}>← 返回列表</button>
        <strong>{item.name}</strong>
        <span className="status s-成功">{status}</span>
        <button onClick={() => change("暂存")}>暂存</button>
        <button className="primary" onClick={() => change("已发布")}>
          发布
        </button>
      </header>
      <div className="studio-tabs">
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
      {tab.includes("编排") ? (
        <div className="studio-canvas">
          <aside>
            <h3>插件步骤</h3>
            {[
              "代码检出",
              "通用脚本",
              "执行测试",
              "报告解析",
              "上传制品",
              "消息通知",
            ].map((x) => (
              <button onClick={() => setNodes([...nodes, x])} key={x}>
                <Plus size={14} />
                {x}
              </button>
            ))}
          </aside>
          <main>
            <span className="start">开始</span>
            {nodes.map((x, i) => (
              <React.Fragment key={`${x}-${i}`}>
                <i>↓</i>
                <div>
                  <b>{i + 1}</b>
                  <span>{x}</span>
                  <button
                    onClick={() => setNodes(nodes.filter((_, j) => j !== i))}
                  >
                    <X size={14} />
                  </button>
                </div>
              </React.Fragment>
            ))}
            <i>↓</i>
            <span className="end">结束</span>
          </main>
          <section>
            <h3>属性配置</h3>
            <label>
              步骤名称
              <input value={nodes.at(-1) || ""} readOnly />
            </label>
            <label>
              <input type="checkbox" /> 流水线配置时只读
            </label>
            <label>
              失败策略
              <select>
                <option>终止流水线</option>
                <option>继续执行</option>
              </select>
            </label>
          </section>
        </div>
      ) : (
        <div className="studio-form">
          <h2>{tab}</h2>
          <p>字段修改保存在当前调试版本中，发布后形成新的插件版本。</p>
          <label>
            名称
            <input defaultValue={item.name} />
          </label>
          <label>
            版本
            <input defaultValue={item.version} />
          </label>
          <label>
            描述
            <textarea defaultValue={item.description || "流水线可复用能力"} />
          </label>
          <label>
            执行命令
            <textarea defaultValue={item.command || "pet run ${PARAMETERS}"} />
          </label>
        </div>
      )}
    </div>
  );
}
