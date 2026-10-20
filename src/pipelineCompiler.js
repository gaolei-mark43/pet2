import { graphGroups, normalizeGraphStages } from "./pipelineGraphModel.js";
import { getStageSteps } from "./pipelineStepModel.js";

const groovyQuote = (value) => String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");

const groovyScriptLiteral = (value) => {
  const source = String(value ?? "").replace(/\\/g, "\\\\");
  if (/\r|\n/.test(source)) return `'''${source.replace(/'''/g, "\\'\\'\\'")}'''`;
  return `'${source.replace(/'/g, "\\'")}'`;
};

const directPipelineSteps = new Set(["测试报告解析", "收集构建产物"]);

export function stepToPipeline(step) {
  const form = step.config?.form || {};
  const definition = step.config?.definition || {};
  let command = definition.command || "";
  Object.entries(form).forEach(([key, value]) => {
    command = command.replaceAll(`\${${key}}`, String(value ?? ""));
  });
  command = command.replace(/\$\{!([A-Za-z0-9_.-]+)\}/g, "");
  if (step.plugin === "清理工作空间") return "cleanWs()";
  if (step.plugin === "Shell命令行") return `sh ${groovyScriptLiteral(form.PARAMETERS || "")}`;
  if (step.plugin === "Bat命令行") return `bat ${groovyScriptLiteral(form.PARAMETERS || "")}`;
  if (directPipelineSteps.has(step.plugin)) return command || `echo '${groovyQuote(step.plugin)}'`;
  if (["Gitlab代码检出", "GitLab 代码检出", "Tasking编译", "Tasking 编译"].includes(step.plugin))
    return command ? `sh '${groovyQuote(command)}'` : `echo '${groovyQuote(step.plugin.replace(" ", ""))}'`;
  if (step.plugin === "Groovy命令行") return form.PARAMETERS ? String(form.PARAMETERS) : "echo 'Groovy命令行'";
  return command ? `sh '${groovyQuote(command)}'` : `echo '${groovyQuote(step.plugin)}'`;
}

export function generatePipelineScript(name, stages) {
  const groups = graphGroups(stages);
  const postSteps = stages.flatMap(getStageSteps).filter((step) => step.config?.form?.POST_STEP);
  const renderStage = (stage, indent = "        ") => {
    const options = [];
    if (stage.retryEnabled) options.push(`retry(${Number(stage.retries) || 1})`);
    if (stage.timeoutEnabled) options.push(`timeout(time: ${Number(stage.timeout) || 60}, unit: 'MINUTES')`);
    const steps = getStageSteps(stage).filter((step) => !step.config?.form?.POST_STEP);
    return `${indent}stage('${groovyQuote(stage.name)}') {\n${stage.conditionEnabled && stage.condition ? `${indent}    when { expression { ${stage.condition} } }\n` : ""}${options.length ? `${indent}    options { ${options.join("; ")} }\n` : ""}${indent}    steps {\n${steps.length ? steps.map((step) => `${indent}        ${stepToPipeline(step)}`).join("\n") : `${indent}        echo '暂无步骤'`}\n${indent}    }\n${indent}}`;
  };
  const body = groups.map((group) => group.items.length === 1
    ? renderStage(group.items[0])
    : `        stage('并行阶段 ${group.items[0].id.split("-")[0]}') {\n            parallel {\n${group.items.map((stage) => renderStage(stage, "                ")).join("\n")}\n            }\n        }`,
  ).join("\n");
  return `pipeline {
    agent any
    environment {
        PET_URL = 'http://mock.pet.local/'
        JOB_NAME = '${groovyQuote(name)}'
    }
    stages {
${body || "        stage('空流水线') { steps { echo '请在图形化编辑中添加阶段' } }"}
    }${postSteps.length ? `
    post {
        always {
${postSteps.map((step) => `            ${stepToPipeline(step)}`).join("\n")}
        }
    }` : ""}
}`;
}

export function validatePipelineScript(script) {
  const errors = [];
  if (!/\bpipeline\s*\{/.test(script)) errors.push("缺少 pipeline { } 根节点");
  if (!/\bstages\s*\{/.test(script)) errors.push("缺少 stages { } 配置");
  let depth = 0;
  for (const char of script) {
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth < 0) break;
  }
  if (depth !== 0) errors.push("花括号不匹配");
  return errors;
}

export function parsePipelineStages(script, previousStages = []) {
  const matches = [...script.matchAll(/stage\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\{/g)];
  const ignored = new Set(["并行阶段", "空流水线"]);
  const names = matches.map((match) => match[1]).filter((name) => !ignored.has(name));
  if (!names.length) return [];
  return normalizeGraphStages(names.map((stageName, index) => previousStages.find((stage) => stage.name === stageName) || {
    id: `${index + 1}-1`, name: stageName, groupKey: `script-${index + 1}`, plugin: "点击选择插件", steps: [],
  }));
}

export function resolvePipelineVariables(script, values) {
  return script.replace(/\$\{([A-Za-z0-9_]+)\}/g, (source, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key] ?? "") : source,
  );
}
