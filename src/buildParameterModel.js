export function parameterChoices(parameter) {
  if (parameter.type === "凭证")
    return parameter.defaultValue ? [String(parameter.defaultValue)] : [];
  if (parameter.type === "脚本式参数") {
    const list = String(parameter.script || "").match(/return\s*\[([\s\S]*?)\]/)?.[1] || "";
    const literalValues = [...list.matchAll(/['\"]([^'\"]+)['\"]/g)].map((match) => match[1]);
    return [...new Set([...(parameter.defaultValue ? [String(parameter.defaultValue)] : []), ...literalValues])];
  }
  return String(parameter.options || "")
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function formatTimestamp(format = "yyyyMMdd", now = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  const tokens = {
    yyyy: String(now.getFullYear()),
    MM: pad(now.getMonth() + 1),
    dd: pad(now.getDate()),
    HH: pad(now.getHours()),
    mm: pad(now.getMinutes()),
    ss: pad(now.getSeconds()),
  };
  return Object.entries(tokens).reduce((value, [token, replacement]) => value.replaceAll(token, replacement), String(format || "yyyyMMdd"));
}

export function normalizeParameterValue(parameter, value) {
  if (parameter.type === "多选") {
    if (Array.isArray(value)) return value;
    return String(value ?? "")
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value ?? "";
}

export function initialBuildParameters(parameters, overrides = {}, now = new Date()) {
  return Object.fromEntries(parameters.map((parameter) => [
    parameter.name,
    normalizeParameterValue(
      parameter,
      Object.prototype.hasOwnProperty.call(overrides, parameter.name)
        ? overrides[parameter.name]
        : parameter.type === "时间戳"
          ? formatTimestamp(parameter.timestampFormat, now)
          : parameter.defaultValue,
    ),
  ]));
}

export function validateBuildParameters(parameters, values) {
  const missing = parameters.find((parameter) => {
    if (parameter.allowEmpty) return false;
    const value = values[parameter.name];
    return Array.isArray(value) ? value.length === 0 : !String(value ?? "").trim();
  });
  return missing ? `参数 ${missing.name} 不允许为空` : "";
}
