const clone = (value) => JSON.parse(JSON.stringify(value ?? null));

export function pipelineEditorInitialState(saved = {}, selected = {}) {
  return {
    name: saved.name ?? selected.name ?? "222666",
    description: saved.description ?? selected.description ?? "",
    priority: saved.priority ?? selected.priority ?? "5",
    cleanup: saved.cleanup ?? selected.cleanup ?? false,
    label: saved.label ?? selected.label ?? "",
    repoTrigger: saved.repoTrigger ?? selected.repoTrigger ?? false,
    repoTypes: clone(saved.repoTypes ?? selected.repoTypes ?? []),
    days: clone(saved.days ?? selected.days ?? []),
    scheduleTime: saved.scheduleTime ?? selected.scheduleTime ?? "",
    upstream: saved.upstream ?? selected.upstream ?? false,
  };
}

export function pipelineFromTemplate(form, templateName, templateDefinition) {
  const stageList = templateName === "新空白模板"
    ? []
    : clone(templateDefinition?.stageList || templateDefinition?.stages || []);
  const params = templateName === "新空白模板"
    ? []
    : clone(templateDefinition?.params || templateDefinition?.parameters || []);
  const retained = templateName === "新空白模板" ? {} : {
    ...(templateDefinition?.keepBasic ? clone(templateDefinition.basic || {}) : {}),
    ...(templateDefinition?.keepLabel ? { label: templateDefinition.label || "" } : {}),
  };
  return {
    ...retained,
    ...form,
    template: templateName,
    tags: [],
    stages: stageList.length,
    stageList,
    params,
    parameters: clone(params),
    pipelineScript: templateName === "新空白模板" ? "" : templateDefinition?.pipelineScript || "",
    enabled: true,
    lastStatus: "未构建",
    lastBuild: "-",
    updated: "-",
    triggerText: "-",
  };
}

export function copyPipelineData(pipeline, name, options = {}) {
  const keepLabel = options.keepLabel !== false;
  const keepBasic = options.keepBasic !== false;
  const copied = {
    ...clone(pipeline),
    name,
    enabled: true,
    lastStatus: "未构建",
    lastBuild: "-",
    updated: new Date().toLocaleString("zh-CN", { hour12: false }),
    triggerText: "-",
    label: keepLabel ? pipeline.label || "" : "",
    stageList: clone(pipeline.stageList || []),
    params: clone(pipeline.params || pipeline.parameters || []),
    pipelineScript: pipeline.pipelineScript || "",
  };
  delete copied.id;
  delete copied.created;
  if (!keepBasic) {
    Object.assign(copied, {
      description: "",
      priority: "5",
      cleanup: false,
      repoTrigger: false,
      repoTypes: [],
      days: [],
      scheduleTime: "",
      upstream: false,
    });
  }
  copied.stages = copied.stageList.length;
  copied.parameters = clone(copied.params);
  return copied;
}

export function templateFromPipeline(pipeline, metadata) {
  return {
    name: metadata.name,
    scope: metadata.scopes.join("、"),
    description: metadata.description || "",
    stageList: clone(pipeline.stageList || []),
    params: clone(pipeline.params || pipeline.parameters || []),
    pipelineScript: pipeline.pipelineScript || "",
    keepLabel: metadata.keepLabel !== false,
    keepBasic: metadata.keepBasic !== false,
    label: metadata.keepLabel !== false ? pipeline.label || "" : "",
    basic: metadata.keepBasic !== false ? {
      priority: pipeline.priority,
      cleanup: pipeline.cleanup,
      repoTrigger: pipeline.repoTrigger,
      repoTypes: clone(pipeline.repoTypes || []),
      days: clone(pipeline.days || []),
      scheduleTime: pipeline.scheduleTime || "",
      upstream: pipeline.upstream,
    } : null,
    created: new Date().toLocaleString("zh-CN", { hour12: false }),
  };
}
