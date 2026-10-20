import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CirclePause,
  CircleX,
  LoaderCircle,
  Pencil,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { PipelineWizard } from "./AdvancedViews.jsx";
import { petApi } from "./mockPetApi.js";
import { BuildConfirmModal, RunMonitor } from "./PipelineExperience.jsx";

const observed = [
  {
    id: "222666",
    name: "222666",
    tags: "",
    lastStatus: "未构建",
    lastBuild: "-",
    updated: "-",
    created: "2026-09-09",
    triggerText: "-",
    enabled: true,
  },
  {
    id: "hello1",
    name: "hello1",
    tags: "",
    lastStatus: "未构建",
    lastBuild: "-",
    updated: "-",
    created: "2026-09-09",
    triggerText: "-",
    enabled: true,
  },
  {
    id: "code_check",
    name: "code_check",
    tags: "",
    lastStatus: "未构建",
    lastBuild: "-",
    updated: "-",
    created: "2026-09-08",
    triggerText: "-",
    enabled: true,
  },
  {
    id: "11111",
    name: "11111",
    tags: "",
    lastStatus: "未构建",
    lastBuild: "-",
    updated: "-",
    created: "2026-09-08",
    triggerText: "-",
    enabled: true,
  },
  {
    id: "CICT_test",
    name: "CICT_test",
    tags: "",
    lastStatus: "未构建",
    lastBuild: "-",
    updated: "-",
    created: "2026-09-07",
    triggerText: "-",
    enabled: true,
  },
  {
    id: "tasking-cb",
    name: "tasking-cb",
    tags: "",
    lastStatus: "未构建",
    lastBuild: "-",
    updated: "-",
    created: "2026-09-06",
    triggerText: "-",
    enabled: true,
  },
  {
    id: "build-trigger",
    name: "build-trigger",
    tags: "",
    lastStatus: "失败",
    lastBuild: "#84",
    updated: "2026-09-09 17:01:53",
    created: "2026-09-05",
    triggerText: "#84 由demo-admin从平台触发",
    enabled: true,
  },
];
const OVERRIDE_KEY = "pet-pipeline-list-overrides";

export function PipelineManage({ openPipeline, db, refresh }) {
  const [sort, setSort] = useState(null),
    [wizard, setWizard] = useState(
      () => location.hash.slice(1) === "pipelines/create",
    ),
    [query, setQuery] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [advanced, setAdvanced] = useState(false);
  const [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(15),
    [toast, setToast] = useState("");
  const emptyAdvanced = {
    name: "",
    statuses: [],
    triggerPerson: "",
    dateStart: "",
    dateEnd: "",
    tag: "",
    triggerModes: [],
    filterDisabled: "",
    matchMode: "all",
  };
  const [advancedDraft, setAdvancedDraft] = useState(emptyAdvanced);
  const [advancedFilters, setAdvancedFilters] = useState(emptyAdvanced);
  const [selectedRun, setSelectedRun] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingBuild, setPendingBuild] = useState(null);
  const [building, setBuilding] = useState(false);
  const rowBuildTimersRef = useRef(new Map());
  useEffect(() => () => {
    rowBuildTimersRef.current.forEach((timers) => timers.forEach((timer) => window.clearInterval(timer)));
    rowBuildTimersRef.current.clear();
  }, []);
  const [overrides, setOverrides] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(OVERRIDE_KEY)) || {};
    } catch {
      return {};
    }
  });
  const notify = (text) => {
    setToast(text);
    setTimeout(() => setToast(""), 1800);
  };
  const openWizard = () => {
    location.hash = "pipelines/create";
    setWizard(true);
  };
  const closeWizard = () => {
    if (location.hash.slice(1) === "pipelines/create") location.hash = "pipelines";
    setWizard(false);
  };
  const patchRow = (id, patch) =>
    setOverrides((current) => {
      const next = { ...current, [id]: { ...(current[id] || {}), ...patch } };
      localStorage.setItem(OVERRIDE_KEY, JSON.stringify(next));
      return next;
    });
  const allRows = useMemo(() => {
    const extras = (db?.pipelines || []).filter(
      (item) =>
        !observed.some((row) => row.id === item.id || row.name === item.name),
    );
    return [...extras, ...observed]
      .map((row) => {
        const merged = { ...row, ...overrides[row.id] };
        const latest = (db?.runs || [])
          .filter((run) => (run.pipelineId === row.id || run.pipeline === row.name) && run.pipelineSnapshot)
          .sort((a, b) => Number(b.number) - Number(a.number))[0];
        return latest ? {
          ...merged,
          lastStatus: latest.status,
          lastBuild: `#${latest.number}`,
          updated: latest.started,
          triggerText: `#${latest.number} ${latest.trigger}`,
        } : merged;
      })
      .filter((row) => !row.deleted);
  }, [db, overrides]);
  const filtered = useMemo(
    () =>
      allRows.filter((row) => {
        const matchesQuery =
          !query ||
          [row.name, row.tags, row.triggerText]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase());
        const advancedChecks = [];
        if (advancedFilters.name)
          advancedChecks.push(row.name.toLowerCase().includes(advancedFilters.name.toLowerCase()));
        if (advancedFilters.statuses.length)
          advancedChecks.push(advancedFilters.statuses.includes(row.lastStatus));
        if (advancedFilters.triggerPerson)
          advancedChecks.push(String(row.triggerText || "").toLowerCase().includes(advancedFilters.triggerPerson.toLowerCase()));
        if (advancedFilters.dateStart)
          advancedChecks.push(row.updated !== "-" && String(row.updated) >= advancedFilters.dateStart);
        if (advancedFilters.dateEnd)
          advancedChecks.push(row.updated !== "-" && String(row.updated) <= `${advancedFilters.dateEnd} 23:59:59`);
        if (advancedFilters.tag)
          advancedChecks.push(String(row.tags || "").toLowerCase().includes(advancedFilters.tag.toLowerCase()));
        if (advancedFilters.triggerModes.length)
          advancedChecks.push(advancedFilters.triggerModes.some((mode) => String(row.triggerText || "").includes(mode)));
        if (advancedFilters.filterDisabled === "yes") advancedChecks.push(row.enabled !== false);
        if (advancedFilters.filterDisabled === "no") advancedChecks.push(true);
        const matchesAdvanced = !advancedChecks.length || (advancedFilters.matchMode === "any" ? advancedChecks.some(Boolean) : advancedChecks.every(Boolean));
        return matchesQuery && matchesAdvanced;
      }),
    [allRows, query, advancedFilters],
  );
  const sorted = useMemo(
    () =>
      sort
        ? [...filtered].sort((a, b) => {
            const result = String(a[sort.field] || "").localeCompare(
              String(b[sort.field] || ""),
            );
            return sort.direction === "asc" ? result : -result;
          })
        : filtered,
    [filtered, sort],
  );
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize)),
    safePage = Math.min(page, pageCount),
    rows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  useEffect(() => setPage(1), [query, advancedFilters, pageSize]);
  const open = (row) => {
    sessionStorage.setItem(
      "pet-selected-pipeline",
      JSON.stringify({ ...row, project: row.project || "演示项目" }),
    );
    openPipeline(row);
  };
  const openAtParameters = (row) => {
    sessionStorage.setItem("pet-pipeline-initial-tab", "params");
    open(row);
  };
  const toggleSort = (field) =>
    setSort((current) =>
      current?.field === field
        ? { field, direction: current.direction === "asc" ? "desc" : "asc" }
        : { field, direction: "asc" },
    );
  const monitorBuild = (pipelineId, runId) => {
    (rowBuildTimersRef.current.get(pipelineId) || []).forEach((timer) => window.clearInterval(timer));
    petApi.scheduleRun(runId);
    const timer = window.setInterval(async () => {
      const snapshot = await petApi.snapshot();
      const current = snapshot.runs.find((item) => item.id === runId);
      if (!current) return;
      patchRow(pipelineId, {
        lastStatus: current.status,
        lastBuild: `#${current.number}`,
        updated: current.started,
        triggerText: `#${current.number} ${current.trigger}`,
      });
      setSelectedRun((selected) => selected?.run?.id === runId ? { ...selected, run: current } : selected);
      if (!["队列中", "运行中"].includes(current.status)) {
        window.clearInterval(timer);
        rowBuildTimersRef.current.delete(pipelineId);
        await refresh?.();
      }
    }, 350);
    rowBuildTimersRef.current.set(pipelineId, [timer]);
  };
  const run = async (row, parameters = {}) => {
    if (row.enabled === false) {
      notify("流水线已停用，不能触发构建");
      return;
    }
    const snapshot = await petApi.snapshot();
    if (!snapshot.pipelines.some((item) => item.id === row.id))
      await petApi.create("pipelines", {
        ...row,
        project: "PET 演示项目",
        repository: "pet-demo",
        branch: "main",
        stages: 0,
      });
    (rowBuildTimersRef.current.get(row.id) || []).forEach((timer) => window.clearInterval(timer));
    setBuilding(true);
    const build = await petApi.runPipeline(row.id, parameters);
    patchRow(row.id, {
      lastStatus: "队列中",
      lastBuild: `#${build.number}`,
      updated: build.started,
      triggerText: `#${build.number} 由demo-admin从平台触发`,
    });
    await refresh?.();
    setPendingBuild(null);
    setBuilding(false);
    notify(`构建 #${build.number} 已进入队列`);
    monitorBuild(row.id, build.id);
  };
  const requestRun = async (row) => {
    if (row.enabled === false) {
      notify("流水线已停用，不能触发构建");
      return;
    }
    const snapshot = await petApi.snapshot();
    const stored = snapshot.pipelines.find(
      (item) => item.id === row.id || item.name === row.name,
    );
    const definitions = stored?.params || stored?.parameters || row.params || row.parameters || [];
    if (definitions.length) {
      setPendingBuild({ row, params: definitions });
      return;
    }
    await run(row, {});
  };
  const openRun = async (row) => {
    const snapshot = await petApi.snapshot();
    const storedPipeline = snapshot.pipelines.find(
      (item) => item.id === row.id || item.name === row.name,
    );
    const requestedNumber = Number(String(row.lastBuild || "").replace("#", ""));
    const candidates = snapshot.runs
      .filter(
        (item) =>
          item.pipelineId === row.id ||
          item.pipelineId === storedPipeline?.id ||
          item.pipeline === row.name,
      )
      .sort((a, b) => b.number - a.number);
    const found =
      candidates.find((item) => item.number === requestedNumber) || candidates[0];
    if (!found) {
      notify("当前流水线暂无构建详情");
      return;
    }
    setSelectedRun({ run: found, history: candidates, pipeline: { ...storedPipeline, ...row } });
  };
  const toggleEnabled = async (row) => {
    const next = row.enabled === false;
    patchRow(row.id, { enabled: next });
    const snapshot = await petApi.snapshot();
    if (snapshot.pipelines.some((item) => item.id === row.id))
      await petApi.update("pipelines", row.id, { enabled: next });
    await refresh?.();
    notify(next ? "流水线已启用" : "流水线已停用");
  };
  const remove = (row) => {
    patchRow(row.id, { deleted: true });
    petApi.remove("pipelines", row.id).then(() => refresh?.());
    notify("流水线已删除");
    setPendingDelete(null);
  };
  return (
    <div className="observed-pipelines">
      <div className="pipeline-list-head">
        <div className="pipeline-list-tab">全部流水线</div>
        <div className="pipeline-list-actions">
          {searchOpen ? (
            <label className="pipeline-search-expanded">
              <Search />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="请输入流水线名称"
              />
              <button
                aria-label="关闭流水线搜索"
                onClick={() => {
                  setQuery("");
                  setSearchOpen(false);
                }}
              >
                <X />
              </button>
            </label>
          ) : (
            <button className="pipeline-search-trigger" onClick={() => setSearchOpen(true)}>
              <Search /> 搜索流水线
            </button>
          )}
          <button className="pipeline-create" onClick={openWizard}>
            <Plus />
            新增流水线
          </button>
          <button
            className={`pipeline-filter-trigger ${advanced ? "active" : ""}`}
            onClick={() => setAdvanced(!advanced)}
          >
            <SlidersHorizontal />
            高级筛选
          </button>
        </div>
      </div>
      {advanced && (
        <div className="pipeline-filter-mask" onMouseDown={(event) => event.target === event.currentTarget && setAdvanced(false)}>
          <section className="pipeline-advanced" aria-label="高级筛选">
            <div className="pipeline-filter-grid">
              <label><span>流水线名称</span><input placeholder="请输入" value={advancedDraft.name} onChange={(event) => setAdvancedDraft({...advancedDraft, name:event.target.value})}/></label>
              <label><span>最近运行状态</span><select multiple value={advancedDraft.statuses} onChange={(event) => setAdvancedDraft({...advancedDraft,statuses:[...event.target.selectedOptions].map((option)=>option.value)})}>{["未构建","队列中","运行中","成功","失败","已终止"].map((item)=><option key={item}>{item}</option>)}</select></label>
              <label><span>触发人</span><input placeholder="请输入" value={advancedDraft.triggerPerson} onChange={(event) => setAdvancedDraft({...advancedDraft,triggerPerson:event.target.value})}/></label>
              <label><span>最近运行时间</span><div className="pipeline-date-range"><input aria-label="开始日期" type="date" value={advancedDraft.dateStart} onChange={(event)=>setAdvancedDraft({...advancedDraft,dateStart:event.target.value})}/><i>~</i><input aria-label="结束日期" type="date" value={advancedDraft.dateEnd} onChange={(event)=>setAdvancedDraft({...advancedDraft,dateEnd:event.target.value})}/></div></label>
              <label><span>标签</span><input placeholder="请选择" value={advancedDraft.tag} onChange={(event)=>setAdvancedDraft({...advancedDraft,tag:event.target.value})}/></label>
              <label><span>触发方式</span><select multiple value={advancedDraft.triggerModes} onChange={(event)=>setAdvancedDraft({...advancedDraft,triggerModes:[...event.target.selectedOptions].map((option)=>option.value)})}><option>手动触发</option><option>平台触发</option></select></label>
              <fieldset><legend>是否过滤禁用流水线</legend><label><input type="radio" name="filterDisabled" checked={advancedDraft.filterDisabled === "yes"} onChange={()=>setAdvancedDraft({...advancedDraft,filterDisabled:"yes"})}/>是</label><label><input type="radio" name="filterDisabled" checked={advancedDraft.filterDisabled === "no"} onChange={()=>setAdvancedDraft({...advancedDraft,filterDisabled:"no"})}/>否</label></fieldset>
            </div>
            <footer>
              <div><label><input type="radio" name="matchMode" checked={advancedDraft.matchMode === "all"} onChange={()=>setAdvancedDraft({...advancedDraft,matchMode:"all"})}/>满足全部条件</label><label><input type="radio" name="matchMode" checked={advancedDraft.matchMode === "any"} onChange={()=>setAdvancedDraft({...advancedDraft,matchMode:"any"})}/>满足任一条件</label></div>
              <div><button className="blue" onClick={()=>{setAdvancedFilters(advancedDraft);setAdvanced(false);setPage(1);}}>查 询</button><button onClick={()=>{setAdvancedDraft(emptyAdvanced);setAdvancedFilters(emptyAdvanced);}}>重 置</button></div>
            </footer>
          </section>
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th>标签</th>
            <th>
              <button onClick={() => toggleSort("name")}>
                流水线名称
                <span>
                  <ChevronUp />
                  <ChevronDown />
                </span>
              </button>
            </th>
            <th>最近运行状态</th>
            <th>最近触发方式</th>
            <th>
              <button onClick={() => toggleSort("updated")}>
                最近运行时间
                <span>
                  <ChevronUp />
                  <ChevronDown />
                </span>
              </button>
            </th>
            <th>
              <button onClick={() => toggleSort("created")}>
                创建时间
                <span>
                  <ChevronUp />
                  <ChevronDown />
                </span>
              </button>
            </th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                {Array.isArray(row.tags) ? row.tags.join("、") : row.tags}
              </td>
              <td>
                <button className="pipeline-link" onClick={() => open(row)}>
                  {row.name}
                </button>
              </td>
              <td>
                {row.lastStatus === "失败" ? (
                  <span className="run-status failed">
                    <CircleX />
                    失败
                  </span>
                ) : (
                  <span
                    className={`run-status ${["队列中", "运行中"].includes(row.lastStatus) ? "running" : "unbuilt"}`}
                  >
                    {["队列中", "运行中"].includes(row.lastStatus) ? <LoaderCircle className="spin" /> : <CirclePause />}
                    {row.lastStatus || "未构建"}
                  </span>
                )}
              </td>
              <td
                className={
                  row.triggerText && row.triggerText !== "-"
                    ? "trigger-link"
                    : ""
                }
              >
                {row.triggerText && row.triggerText !== "-" ? (
                  <button className="trigger-build-link" onClick={() => openRun(row)}>
                    {row.triggerText}
                  </button>
                ) : "-"}
              </td>
              <td>{row.updated || "-"}</td>
              <td>{row.created || "-"}</td>
              <td>
                <div className="pipeline-row-actions">
                  {!(["队列中", "运行中"].includes(row.lastStatus)) && (
                    <button
                      title="运行"
                      disabled={row.enabled === false}
                      onClick={() => requestRun(row)}
                    >
                      <Play />
                    </button>
                  )}
                  <button title="编辑" onClick={() => open(row)}>
                    <Pencil />
                  </button>
                  <button
                    title={row.starred ? "取消收藏" : "收藏"}
                    className={row.starred ? "starred" : ""}
                    onClick={() => patchRow(row.id, { starred: !row.starred })}
                  >
                    <Star />
                  </button>
                  <button title="删除" onClick={() => setPendingDelete(row)}>
                    <Trash2 />
                  </button>
                  <button
                    title={row.enabled === false ? "启用" : "停用"}
                    role="switch"
                    aria-checked={row.enabled !== false}
                    disabled={["队列中", "运行中"].includes(row.lastStatus)}
                    className={`pipeline-switch ${row.enabled !== false ? "on" : ""}`}
                    onClick={() => toggleEnabled(row)}
                  >
                    <i />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="pipeline-empty">暂无符合条件的流水线</div>
      )}
      <div className="pipeline-pagination">
        <span>共 {filtered.length} 条</span>
        <select
          value={pageSize}
          onChange={(event) => setPageSize(Number(event.target.value))}
        >
          <option value="15">15 条/页</option>
          <option value="10">10 条/页</option>
          <option value="20">20 条/页</option>
        </select>
        <button disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>
          上一页
        </button>
        <b title={`第 ${safePage} 页，共 ${pageCount} 页`}>{safePage}</b>
        <button
          disabled={safePage === pageCount}
          onClick={() => setPage(safePage + 1)}
        >
          下一页
        </button>
      </div>
      {selectedRun && (
        <RunMonitor
          run={selectedRun.run}
          name={selectedRun.pipeline.name}
          stages={selectedRun.run.stageSnapshot?.length ? selectedRun.run.stageSnapshot : selectedRun.pipeline.stageList || []}
          parameterDefinitions={selectedRun.pipeline.params || selectedRun.pipeline.parameters || []}
          history={selectedRun.history || [selectedRun.run]}
          notify={notify}
          onClose={() => setSelectedRun(null)}
          onStop={async () => {
            (rowBuildTimersRef.current.get(selectedRun.pipeline.id) || []).forEach((timer) => window.clearInterval(timer));
            rowBuildTimersRef.current.delete(selectedRun.pipeline.id);
            const stopped = await petApi.stopRun(selectedRun.run.id);
            setSelectedRun({ ...selectedRun, run: stopped });
            patchRow(selectedRun.pipeline.id, { lastStatus: "已终止" });
            await refresh?.();
          }}
          onRestart={async (values) => {
            const restarted = await petApi.retryRun(selectedRun.run.id, values);
            setSelectedRun({ ...selectedRun, run: restarted, history: [restarted, ...(selectedRun.history || [])] });
            monitorBuild(selectedRun.pipeline.id, restarted.id);
            await refresh?.();
          }}
          onSelectRun={(nextRun) => setSelectedRun({ ...selectedRun, run: nextRun })}
          onGoParams={() => {
            const row = selectedRun.pipeline;
            setSelectedRun(null);
            openAtParameters(row);
          }}
        />
      )}
      {wizard && (
        <PipelineWizard
          db={db}
          onClose={closeWizard}
          onDone={async (created) => {
            setWizard(false);
            await refresh?.();
            open(created);
          }}
        />
      )}
      {pendingDelete && (
        <div className="modal-overlay" role="presentation">
          <section className="confirm-dialog pipeline-delete-dialog" role="dialog" aria-label="删除流水线">
            <header>
              <strong>删除流水线</strong>
              <button aria-label="关闭删除确认" onClick={() => setPendingDelete(null)}><X /></button>
            </header>
            <p>确定删除流水线“<strong>{pendingDelete.name}</strong>”吗？删除后将不再出现在流水线列表中。</p>
            <footer>
              <button onClick={() => setPendingDelete(null)}>取消</button>
              <button className="danger-button" onClick={() => remove(pendingDelete)}>确认删除</button>
            </footer>
          </section>
        </div>
      )}
      {pendingBuild && (
        <BuildConfirmModal
          name={pendingBuild.row.name}
          params={pendingBuild.params}
          initialValues={{}}
          building={building}
          onClose={() => setPendingBuild(null)}
          onGoParams={() => {
            setPendingBuild(null);
            openAtParameters(pendingBuild.row);
          }}
          onRun={(values) => run(pendingBuild.row, values)}
        />
      )}
      {toast && <div className="pet-toast">✓ {toast}</div>}
    </div>
  );
}
