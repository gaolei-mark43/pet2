import test from "node:test";
import assert from "node:assert/strict";
import { appendVersionHistory, boundPipelineParameters, createPluginDraft, exportablePlugin, nextPatchVersion, normalizePublishedPlugin, pluginReferences, renderPluginCommand, upgradePluginInPipeline, validatePluginStep } from "../src/pluginLifecycleModel.js";

test("plugin draft follows documented defaults", () => {
  const draft = createPluginDraft();
  assert.equal(draft.version, "0.0.1");
  assert.equal(draft.source, "自定义");
  assert.equal(draft.status, "暂存");
});

test("base info and data source validation", () => {
  const draft = createPluginDraft({ name: "A" });
  assert.match(validatePluginStep(draft, 0), /2–30/);
  draft.name = "质量门禁";
  draft.dataSources = [{ url: "/api/projects", testStatus: "未测试" }];
  assert.match(validatePluginStep(draft, 1), /测试/);
});

test("command expressions preserve required and remove optional missing values", () => {
  assert.equal(renderPluginCommand("run ${project} ${!token} ${missing}", { project: "demo" }), "run demo  ${missing}");
  assert.equal(renderPluginCommand("use ${source.id}", { source: { id: 7 } }), "use 7");
});

test("version, export and pipeline reference rules", () => {
  assert.equal(nextPatchVersion("1.2.9"), "1.2.10");
  assert.equal(exportablePlugin({ name: "A", dataSources: [{ url: "secret" }] }).dataSources, undefined);
  assert.equal(pluginReferences("A", [{ name: "p", stages: [{ steps: [{ plugin: "A" }] }] }]).length, 1);
});

test("published plugin becomes a pipeline-compatible definition", () => {
  const plugin = normalizePublishedPlugin({
    name: "质量门禁",
    controls: [{ id: "projectPath", title: "工程路径", type: "单行文本", required: true }],
    parameters: [{ key: "BRANCH", label: "分支", defaultValue: "main" }],
    outputs: [{ key: "REPORT", label: "报告路径" }],
  });
  const expected = { key: "projectPath", label: "工程路径", type: "输入框", required: true };
  assert.deepEqual(expectFields(expected, plugin.controls[0]), expected);
  assert.equal(plugin.params[0].name, "BRANCH");
  assert.equal(plugin.outputs[0].name, "REPORT");
  assert.equal(boundPipelineParameters(plugin)[0].sourcePlugin, "质量门禁");
});

test("editing a published plugin retains an auditable version list", () => {
  const history = appendVersionHistory({ version: "1.0.0", status: "已发布" }, { version: "1.0.1", status: "已发布" });
  assert.deepEqual(history.map(item => item.version), ["1.0.0", "1.0.1"]);
});

test("selected pipeline references upgrade without mutating the old snapshot", () => {
  const previous = { name: "门禁", version: "1.0.0" };
  const pipeline = { id: "p", stageList: [{ id: "s", steps: [{ id: "x", plugin: "门禁", config: { definition: previous } }] }] };
  const upgraded = upgradePluginInPipeline(pipeline, "门禁", { name: "门禁", version: "1.0.1" });
  assert.equal(upgraded.stageList[0].steps[0].config.definition.version, "1.0.1");
  assert.equal(pipeline.stageList[0].steps[0].config.definition.version, "1.0.0");
});

function expectFields(expected, actual) {
  return Object.fromEntries(Object.keys(expected).map(key => [key, actual[key]]));
}
