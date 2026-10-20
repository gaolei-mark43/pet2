export function normalizeGraphStages(items = []) {
  const groups = [];
  items.forEach((stage, index) => {
    const referenced = stage.parallelOf && items.find((candidate) => candidate.id === stage.parallelOf);
    const key = stage.groupKey || referenced?.groupKey || `legacy-${String(stage.id || index).split("-")[0]}`;
    let group = groups.find((candidate) => candidate.key === key);
    if (!group) {
      group = { key, items: [] };
      groups.push(group);
    }
    group.items.push({ ...stage, groupKey: key });
  });
  return groups.flatMap((group, groupIndex) =>
    group.items.map((stage, laneIndex) => ({
      ...stage,
      id: `${groupIndex + 1}-${laneIndex + 1}`,
      groupKey: group.key,
      parallelOf: laneIndex ? `${groupIndex + 1}-1` : null,
    })),
  );
}

export function graphGroups(items = []) {
  return normalizeGraphStages(items).reduce((groups, stage) => {
    let group = groups.find((candidate) => candidate.key === stage.groupKey);
    if (!group) {
      group = { key: stage.groupKey, items: [] };
      groups.push(group);
    }
    group.items.push(stage);
    return groups;
  }, []);
}

export function insertSerialStage(items, groupIndex, stage) {
  const normalized = normalizeGraphStages(items);
  const groups = graphGroups(normalized);
  const target = groups[groupIndex];
  const insertIndex = target
    ? normalized.findIndex((candidate) => candidate.groupKey === target.key)
    : normalized.length;
  normalized.splice(insertIndex, 0, stage);
  return normalizeGraphStages(normalized);
}

export function insertParallelStage(items, groupKey, stage) {
  const normalized = normalizeGraphStages(items);
  const indices = normalized
    .map((candidate, index) => candidate.groupKey === groupKey ? index : -1)
    .filter((index) => index >= 0);
  if (!indices.length) return normalized;
  normalized.splice(indices.at(-1) + 1, 0, { ...stage, groupKey });
  return normalizeGraphStages(normalized);
}

export function removeGraphStage(items, id) {
  return normalizeGraphStages(items.filter((stage) => stage.id !== id));
}
