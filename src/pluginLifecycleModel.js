export const PLUGIN_STEPS = ["基础信息", "扩展数据源", "插件编排", "插件执行", "绑定参数", "输出信息"];

export function createPluginDraft(plugin = {}) {
  return {
    id: plugin.id || "",
    name: plugin.name || "",
    pluginKey: plugin.pluginKey || `plugin_${Math.random().toString(36).slice(2, 10)}`,
    category: plugin.category || "通用",
    version: plugin.version || "0.0.1",
    description: plugin.description || "",
    source: "自定义",
    status: plugin.status || "暂存",
    dataSources: plugin.dataSources || [],
    controls: plugin.controls || [],
    command: plugin.command || "",
    parameters: plugin.parameters || [],
    outputs: plugin.outputs || [],
  };
}

export function validatePluginStep(draft, step) {
  if (step === 0) {
    if (!/^[\w\-\u4e00-\u9fa5]{2,30}$/.test(draft.name.trim())) return "插件名称需为 2–30 个中文、字母、数字、下划线或连字符";
    if (!/^\d+\.\d+\.\d+$/.test(draft.version)) return "版本号格式应为 x.x.x";
    if (draft.description.length > 200) return "插件描述不能超过 200 字";
  }
  if (step === 1 && draft.dataSources.some((item) => item.url && item.testStatus !== "成功")) return "请先测试已配置的数据源";
  if (step === 2 && draft.controls.some((item) => !item.id || !item.title)) return "控件 ID 和标题不能为空";
  if (step === 3 && !draft.command.trim()) return "请配置插件执行命令";
  if (step === 4 && draft.parameters.some((item) => !item.key || !item.label)) return "绑定参数的标识和名称不能为空";
  if (step === 5 && draft.outputs.some((item) => !item.key || !item.label)) return "输出变量的标识和名称不能为空";
  return "";
}

export function nextPatchVersion(version = "0.0.0") {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return "0.0.1";
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

export function renderPluginCommand(template, values = {}) {
  return String(template || "").replace(/\$\{(!?)([\w.-]+)\}/g, (whole, optional, path) => {
    const value = path.split(".").reduce((current, key) => current?.[key], values);
    if (value === undefined || value === null || value === "") return optional ? "" : whole;
    return String(value);
  });
}

export function pluginReferences(pluginName, pipelines = []) {
  return pipelines.filter((pipeline) => JSON.stringify(pipeline).includes(`\"plugin\":\"${pluginName}\"`) || JSON.stringify(pipeline).includes(`\"plugin\": \"${pluginName}\"`));
}

export function exportablePlugin(plugin) {
  const { dataSources, ...safe } = plugin;
  return { ...safe, dataSourcesExcluded: true };
}

const controlTypeMap = {
  "单行文本": "输入框",
  "多行文本": "多行文本",
  "数字": "输入框",
  "下拉选择": "下拉框",
  "开关": "开关",
};

export function normalizePublishedPlugin(plugin) {
  const sourceOptions = Object.fromEntries((plugin.dataSources || []).map((source) => [source.id, source.mockOptions || []]));
  const controls = (plugin.controls || []).map((item) => ({
    ...item,
    key: item.key || item.id,
    label: item.label || item.title,
    type: controlTypeMap[item.type] || item.type || "输入框",
    maxLength: item.maxLength || 500,
    options: item.options?.length ? item.options : sourceOptions[item.dataSourceId] || [],
  }));
  const parameters = (plugin.parameters || plugin.params || []).map((item) => ({
    ...item,
    id: item.id || `param-${item.key || item.name}`,
    name: item.name || item.key,
    type: item.type || "字符串",
    description: item.description || item.label || "由插件自动绑定",
    allowEmpty: item.allowEmpty ?? true,
  }));
  const outputs = (plugin.outputs || []).map((item) => ({
    ...item,
    name: item.name || item.key,
    description: item.description || item.label || "插件输出变量",
  }));
  return { ...plugin, controls, parameters, params: parameters, outputs };
}

export function appendVersionHistory(existing, next) {
  const history = [...(existing?.versionHistory || [])];
  if (existing?.version && !history.some((item) => item.version === existing.version)) history.push({ version: existing.version, status: existing.status, publishedAt: existing.updated || "历史版本" });
  if (!history.some((item) => item.version === next.version)) history.push({ version: next.version, status: next.status, publishedAt: next.updated || "刚刚" });
  return history;
}

export function boundPipelineParameters(definition) {
  return (definition.parameters || definition.params || []).map((item) => ({
    id: item.id || `plugin-param-${item.name || item.key}`,
    name: item.name || item.key,
    type: item.type || "字符串",
    defaultValue: item.defaultValue || "",
    description: item.description || item.label || `由插件 ${definition.name || ""} 自动绑定`,
    allowEmpty: item.allowEmpty ?? true,
    sourcePlugin: definition.name,
  })).filter((item) => item.name);
}

export function upgradePluginInPipeline(pipeline, pluginName, definition) {
  let changed = false;
  const stageList = (pipeline.stageList || []).map((stage) => {
    const upgradedStage = stage.plugin === pluginName
      ? (changed = true, { ...stage, config: { ...(stage.config || {}), definition: JSON.parse(JSON.stringify(definition)) } })
      : { ...stage };
    return {
    ...upgradedStage,
    steps: (upgradedStage.steps || []).map((step) => {
      if (step.plugin !== pluginName) return step;
      changed = true;
      return { ...step, config: { ...(step.config || {}), definition: JSON.parse(JSON.stringify(definition)) } };
    }),
  };});
  return changed ? { ...pipeline, stageList, updated: new Date().toLocaleString("zh-CN") } : pipeline;
}
