export function runStatusClass(status = "等待中") {
  if (status === "成功") return "done";
  if (status === "运行中") return "running";
  if (["失败", "已终止"].includes(status)) return "failed";
  if (status === "失败(已忽略)") return "ignored";
  if (status === "未执行") return "unexecuted";
  if (["已跳过", "已禁用"].includes(status)) return "skipped";
  return "waiting";
}

export function runStatusSymbol(status = "等待中") {
  if (status === "成功") return "✓";
  if (status === "运行中") return "▶";
  if (["失败", "已终止"].includes(status)) return "×";
  if (status === "失败(已忽略)") return "!";
  if (["未执行", "已跳过", "已禁用"].includes(status)) return "—";
  return "Ⅱ";
}

export function stageRuntimeState(run, stage) {
  return run?.stageStates?.find((item) => item.id === stage?.id || item.name === stage?.name);
}

export function stepRuntimeStatus(stageState, step) {
  return stageState?.stepStates?.find((item) => item.id === step?.id || item.plugin === step?.plugin)?.status || "等待中";
}
