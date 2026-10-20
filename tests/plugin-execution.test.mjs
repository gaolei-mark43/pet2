import test from "node:test";
import assert from "node:assert/strict";
import { materializePluginOutputs, resolvePluginRuntimeValue } from "../src/pluginExecutionModel.js";

test("plugin outputs become both short and plugin-qualified runtime variables", () => {
  const result = materializePluginOutputs("质量扫描", [{ name: "REPORT", valueTemplate: "reports/${BRANCH}.xml" }], { BRANCH: "main" });
  assert.equal(result.REPORT, "reports/main.xml");
  assert.equal(result["质量扫描.REPORT"], "reports/main.xml");
});

test("downstream command resolves prior output and drops optional missing values", () => {
  assert.equal(resolvePluginRuntimeValue("upload ${REPORT} ${!TOKEN}", { REPORT: "reports/main.xml" }), "upload reports/main.xml ");
});
