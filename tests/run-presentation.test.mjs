import test from "node:test";
import assert from "node:assert/strict";
import { runStatusClass, runStatusSymbol, stageRuntimeState, stepRuntimeStatus } from "../src/runPresentation.js";

test("运行态映射保留失败、忽略失败和未执行的差异", () => {
  assert.equal(runStatusClass("失败"), "failed");
  assert.equal(runStatusClass("失败(已忽略)"), "ignored");
  assert.equal(runStatusClass("未执行"), "unexecuted");
  assert.equal(runStatusSymbol("已禁用"), "—");
});

test("构建详情按阶段和步骤快照取状态", () => {
  const run = { stageStates: [{ id: "s1", status: "失败", stepStates: [{ id: "p1", plugin: "Shell", status: "失败" }] }] };
  const state = stageRuntimeState(run, { id: "s1", name: "构建" });
  assert.equal(state.status, "失败");
  assert.equal(stepRuntimeStatus(state, { id: "p1", plugin: "Shell" }), "失败");
});
