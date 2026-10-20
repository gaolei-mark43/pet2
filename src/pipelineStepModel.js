export const getStageSteps = (stage = {}) =>
  stage.steps?.length
    ? stage.steps
    : stage.plugin && stage.plugin !== "点击选择插件"
      ? [{ id: `legacy-${stage.id}`, plugin: stage.plugin, config: stage.pluginConfig || null }]
      : [];

export const withStageSteps = (stage, steps) => ({
  ...stage,
  steps,
  plugin: steps[0]?.plugin || "点击选择插件",
  pluginConfig: steps[0]?.config || null,
});

export function insertStageStep(stage, step, insertAfter) {
  const steps = [...getStageSteps(stage)];
  const found = insertAfter ? steps.findIndex((item) => item.id === insertAfter) : steps.length - 1;
  const at = insertAfter && found >= 0 ? found + 1 : steps.length;
  steps.splice(at, 0, step);
  return withStageSteps(stage, steps);
}

export function updateStageStep(stage, stepId, config) {
  return withStageSteps(stage, getStageSteps(stage).map((step) =>
    step.id === stepId ? { ...step, config } : step,
  ));
}

export function removeStageStep(stage, stepId) {
  return withStageSteps(stage, getStageSteps(stage).filter((step) => step.id !== stepId));
}
