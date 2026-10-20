export function resolvePluginRuntimeValue(template, context = {}) {
  return String(template || "").replace(/\$\{(!?)([A-Za-z0-9_.-]+)\}/g, (source, optional, key) => {
    if (Object.prototype.hasOwnProperty.call(context, key)) return String(context[key] ?? "");
    return optional ? "" : source;
  });
}

export function materializePluginOutputs(plugin, definitions = [], context = {}) {
  return Object.fromEntries(definitions
    .map((item) => {
      const key = item.name || item.key;
      if (!key) return null;
      const raw = item.valueTemplate || item.defaultValue || `mock/${key.toLowerCase()}`;
      return [key, resolvePluginRuntimeValue(raw, context)];
    })
    .filter(Boolean)
    .flatMap(([key, value]) => [[key, value], [`${plugin}.${key}`, value]]));
}
