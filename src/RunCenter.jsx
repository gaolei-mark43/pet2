import React, { useMemo, useState } from "react";
import { Copy, RotateCcw, Square, X } from "lucide-react";
import { petApi } from "./mockPetApi.js";

const Badge = ({ children }) => (
  <span className={`status s-${children}`}>{children}</span>
);

export function RunCenter({ db, refresh }) {
  const [selectedId, setSelectedId] = useState(null),
    [runTab, setRunTab] = useState("控制台日志"),
    [toast, setToast] = useState("");
  const selected = useMemo(
    () => db.runs.find((run) => run.id === selectedId) || null,
    [db, selectedId],
  );
  const notify = (text) => {
    setToast(text);
    setTimeout(() => setToast(""), 1800);
  };
  const retry = async (run) => {
    try {
    const next = await petApi.retryRun(run.id);
    if (!next) throw new Error("原构建记录不存在");
    await refresh();
    setSelectedId(next.id);
    setRunTab("控制台日志");
    notify(`已基于 #${run.number} 创建构建 #${next.number}`);
    setTimeout(async () => {
      await petApi.startRun(next.id);
      await refresh();
    }, 800);
    setTimeout(async () => {
      const latest = await petApi.snapshot();
      const current = latest.runs.find((item) => item.id === next.id);
      if (current?.status === "运行中") {
        await petApi.finishRun(next.id, true);
        await refresh();
      }
    }, 60000);
    } catch (error) {
      notify(error.message || "重新构建失败");
    }
  };
  const stop = async (run) => {
    await petApi.stopRun(run.id);
    await refresh();
    notify(`构建 #${run.number} 已终止`);
  };
  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>构建记录</h1>
          <p>查看触发来源、阶段状态、测试报告、构建产物与控制台日志</p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>流水线</th>
              <th>构建号</th>
              <th>触发方式</th>
              <th>执行人</th>
              <th>开始时间</th>
              <th>耗时</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {db.runs.map((run) => (
              <tr key={run.id}>
                <td>{run.pipeline}</td>
                <td>#{run.number}</td>
                <td>{run.trigger}</td>
                <td>{run.user}</td>
                <td>{run.started}</td>
                <td>{run.duration}</td>
                <td>
                  <Badge>{run.status}</Badge>
                </td>
                <td className="actions">
                  <button
                    onClick={() => {
                      setSelectedId(run.id);
                      setRunTab("控制台日志");
                    }}
                  >
                    构建详情
                  </button>
                  {["队列中", "运行中"].includes(run.status) ? (
                    <button className="danger" onClick={() => stop(run)}>
                      <Square size={13} />
                      终止
                    </button>
                  ) : (
                    <button onClick={() => retry(run)}>
                      <RotateCcw size={13} />
                      重新构建
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <RunDetail
          run={selected}
          artifacts={db.artifacts.filter((item) =>
            item.pipeline === `${selected.pipeline} #${selected.number}`,
          )}
          tab={runTab}
          setTab={setRunTab}
          onClose={() => setSelectedId(null)}
          onRetry={() => retry(selected)}
          onStop={() => stop(selected)}
          notify={notify}
        />
      )}{" "}
      {toast && <div className="pet-toast">✓ {toast}</div>}
    </div>
  );
}

function RunDetail({
  run,
  artifacts,
  tab,
  setTab,
  onClose,
  onRetry,
  onStop,
  notify,
}) {
  const terminal = !["队列中", "运行中"].includes(run.status),
    failed = run.status === "失败",
    stopped = run.status === "已终止";
  const stageSnapshot = Array.isArray(run.stageSnapshot)
    ? run.stageSnapshot
    : [];
  const stages = stageSnapshot.length
    ? stageSnapshot.map((stage) => stage.name || "未命名阶段")
    : [];
  const failureStage = Math.min(3, Math.max(0, stages.length - 1));
  const consoleLines = run.logs?.length ? [...run.logs] : [
    `[Pipeline] ${run.pipeline} #${run.number}`,
    run.status === "队列中" ? "等待分配构建节点" : `构建状态：${run.status}`,
  ];
  if (!run.logs?.length && stageSnapshot.length) {
    stageSnapshot.forEach((stage) => {
      consoleLines.push(`[配置阶段] ${stage.name || "未命名阶段"}`);
      const steps = stage.steps?.length
        ? stage.steps
        : stage.plugin
          ? [{ plugin: stage.plugin }]
          : [];
      if (!steps.length) consoleLines.push("[Step] 暂无步骤");
      steps.forEach((step) => {
        consoleLines.push(`[Step] ${step.plugin || "未命名插件"}`);
        if (step.config?.form) {
          const configured = Object.entries(step.config.form)
            .filter(([, value]) => value !== "" && value != null)
            .map(
              ([key, value]) =>
                `${key}=${Array.isArray(value) ? value.join(",") : value}`,
            )
            .join(" ");
          if (configured) consoleLines.push(`[Config] ${configured}`);
        }
      });
    });
  }
  if (stopped) consoleLines.push("构建已终止");
  const tabs = ["控制台日志", "构建参数", "测试报告", "覆盖率报告", "构建产物"];
  const copyParameters = () => {
    navigator.clipboard?.writeText(
      JSON.stringify(run.parameters || {}, null, 2),
    );
    notify("构建参数已复制");
  };
  const openArtifact = (item) => {
    sessionStorage.setItem("pet-selected-artifact", item.id);
    location.hash = "artifacts";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    window.setTimeout(
      () =>
        window.dispatchEvent(
          new CustomEvent("pet-open-artifact", { detail: item.id }),
        ),
      80,
    );
    notify(`已定位制品 ${item.file}`);
  };
  return (
    <div className="log-drawer run-detail">
      <header>
        <strong>
          {run.pipeline} #{run.number}
        </strong>
        {terminal ? (
          <button className="detail-restart" onClick={onRetry}>
            <RotateCcw />
            重新构建
          </button>
        ) : (
          <button className="detail-stop" onClick={onStop}>
            <Square />
            终止构建
          </button>
        )}
        <button aria-label="关闭构建详情" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      <div className="run-meta">
        <Badge>{run.status}</Badge>
        <span>{run.trigger}</span>
        <span>{run.user}</span>
        <span>{run.duration}</span>
      </div>
      <div className="stage-strip">
        {stages.map((name, index) => (
          <div
            className={
              run.status === "队列中"
                ? "pending"
                : stopped
                ? "skipped"
                : failed && index === failureStage
                  ? "failed"
                  : failed && index > failureStage
                    ? "skipped"
                    : run.status === "运行中" && index > 1
                      ? "pending"
                      : "done"
            }
            key={name}
          >
            <span>{index + 1}</span>
            {name}
          </div>
        ))}
      </div>
      <div className="run-tabs">
        {tabs.map((name) => (
          <button
            className={tab === name ? "active" : ""}
            onClick={() => setTab(name)}
            key={name}
          >
            {name}
          </button>
        ))}
      </div>
      {tab === "控制台日志" && <pre>{consoleLines.join("\n")}</pre>}
      {tab === "构建参数" && (
        <div className="run-parameter-detail">
          <header>
            <b>本次构建参数</b>
            <button onClick={copyParameters}>
              <Copy />
              复制
            </button>
          </header>
          {Object.entries(run.parameters || {}).length ? (
            Object.entries(run.parameters).map(([key, value]) => (
              <div key={key}>
                <strong>{key}</strong>
                <code>
                  {Array.isArray(value) ? value.join(", ") : String(value)}
                </code>
              </div>
            ))
          ) : (
            <p>本次构建没有自定义参数</p>
          )}
          <small>构建记录中的参数为只读快照，不支持修改。</small>
        </div>
      )}
      {tab === "测试报告" &&
        (run.testReport ? (
          <div className="report-grid">
            <b>{run.testReport.passed}</b>
            <span>通过</span>
            <b>{run.testReport.failed}</b>
            <span>失败</span>
            <b>{run.testReport.passRate}</b>
            <span>通过率</span>
          </div>
        ) : (
          <div className="run-empty">本次构建暂无测试报告</div>
        ))}
      {tab === "覆盖率报告" &&
        (run.coverageReport ? (
          <div className="coverage">
            <h2>{run.coverageReport.lineCoverage}%</h2>
            <p>行覆盖率</p>
            <progress value={run.coverageReport.lineCoverage} max="100" />
          </div>
        ) : (
          <div className="run-empty">暂无覆盖率报告</div>
        ))}
      {tab === "构建产物" &&
        (artifacts.length ? (
          <div className="run-artifacts">
            {artifacts.map((item) => (
              <button key={item.id} onClick={() => openArtifact(item)}>
                {item.file}
                <span>{item.size}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="run-empty">暂无构建产物</div>
        ))}
    </div>
  );
}
