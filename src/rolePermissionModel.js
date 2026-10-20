export const ROLE_PERMISSION_GROUPS = [
  {
    module: "仓库管理",
    pages: [
      { page: "SourceRevision", permissions: ["查看SourceRevision", "新增SourceRevision", "编辑SourceRevision", "删除SourceRevision"] },
      { page: "仓库管理", permissions: ["查看代码仓库内容", "新增Gitlab", "新增Gerrit", "新增SVN", "新增Repo", "编辑代码仓库", "删除代码仓库"] },
    ],
  },
  {
    module: "持续集成",
    pages: [
      { page: "流水线管理", permissions: ["查看流水线", "新增流水线", "基础配置", "图形化编辑", "构建参数配置", "立即构建", "启用/禁用流水线", "删除流水线"] },
      { page: "构建记录", permissions: ["查看构建记录", "查看日志", "查看构建产物", "下载构建产物", "查看流水线工作空间"] },
    ],
  },
  {
    module: "项目管理",
    pages: [
      { page: "项目管理", permissions: ["查看项目", "编辑项目", "删除项目", "查看项目角色权限", "项目角色权限保存", "新增项目角色", "查看项目成员", "新增项目成员", "删除项目成员"] },
      { page: "项目内仪表盘", permissions: ["查看项目内仪表盘"] },
    ],
  },
  {
    module: "制品管理",
    pages: [
      { page: "制品管理", permissions: ["查看制品管理", "新建制品库", "编辑制品库", "删除制品库"] },
      { page: "制品库文件", permissions: ["新增制品库文件夹", "上传制品文件", "删除制品文件", "删除制品库文件夹"] },
    ],
  },
  {
    module: "插件管理",
    pages: [
      { page: "插件管理", permissions: ["查看插件", "新增插件", "编辑插件", "发布插件", "导入插件", "导出插件", "删除插件", "升级流水线插件版本"] },
    ],
  },
];

export const ALL_ROLE_PERMISSIONS = ROLE_PERMISSION_GROUPS.flatMap((group) =>
  group.pages.flatMap((page) => page.permissions),
);

export function normalizeRole(role) {
  const isAdmin = role.locked || role.name === "平台管理员";
  return {
    ...role,
    system: role.system ?? ["平台管理员", "开发人员"].includes(role.name),
    locked: isAdmin,
    permissionList: isAdmin
      ? [...ALL_ROLE_PERMISSIONS]
      : [...(role.permissionList || [])],
  };
}

export function permissionsFromReference(reference) {
  return [...normalizeRole(reference).permissionList];
}

export function togglePermission(list, permission, checked) {
  return checked
    ? [...new Set([...list, permission])]
    : list.filter((item) => item !== permission);
}

export function togglePermissionSet(list, values, checked) {
  return checked
    ? [...new Set([...list, ...values])]
    : list.filter((item) => !values.includes(item));
}

export function effectiveUserPermissions(db, username) {
  const user = (db.users || []).find((item) => item.name === username);
  const roleNames = String(user?.roles || "").split(",").map((item) => item.trim()).filter(Boolean);
  return [...new Set((db.roles || [])
    .filter((role) => roleNames.includes(role.name))
    .flatMap((role) => normalizeRole(role).permissionList))];
}

export function pluginCapabilities(permissionList = []) {
  const has = (name) => permissionList.includes(name);
  return {
    view: has("查看插件"), create: has("新增插件"), edit: has("编辑插件"), publish: has("发布插件"),
    import: has("导入插件"), export: has("导出插件"), remove: has("删除插件"), upgrade: has("升级流水线插件版本"),
  };
}
