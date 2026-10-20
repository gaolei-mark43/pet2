import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Archive,
  Boxes,
  ChevronDown,
  CircleUserRound,
  Code2,
  Database,
  FolderGit2,
  Gauge,
  GitBranch,
  KeyRound,
  LayoutDashboard,
  Network,
  Package,
  Play,
  Plug,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
  Wrench,
  X,
} from "lucide-react";
import PipelineExperience from "./PipelineExperience.jsx";
import { petApi } from "./mockPetApi.js";
import { PipelineWizard, RepositoryExplorer } from "./AdvancedViews.jsx";
import { PluginStudio } from "./PluginWorkbench.jsx";
import { ArtifactBrowser, ProjectWorkspace } from "./DomainViews.jsx";
import { RunCenter as Runs } from "./RunCenter.jsx";
import { PipelineManage } from "./PipelineManage.jsx";
import { RoleManagement } from "./RoleManagement.jsx";
import { PluginManagement } from "./PluginManagement.jsx";
import {
  MonitoringPage,
  ScriptManager,
} from "./SupplementalViews.jsx";

const modules = [
  {
    group: "",
    items: [
      { key: "projects", label: "项目管理", icon: Boxes },
      { key: "resources", label: "资源管理", icon: Boxes },
      { key: "plugins", label: "插件管理", icon: Plug },
      { key: "users", label: "用户管理", icon: Users },
    ],
  },
];

const configs = {
  projects: {
    title: "项目管理",
    desc: "管理项目集、项目成员及项目级资源",
    columns: [
      ["name", "项目名称"],
      ["projectSet", "项目集"],
      ["owner", "负责人"],
      ["members", "成员数"],
      ["status", "状态"],
    ],
    fields: [
      ["name", "项目名称"],
      ["projectSet", "项目集"],
      ["owner", "负责人"],
      ["description", "描述"],
    ],
  },
  repositories: {
    title: "代码仓库",
    desc: "关联 GitLab、Gerrit、SVN 或 Repo 仓库",
    columns: [
      ["name", "仓库名称"],
      ["type", "类型"],
      ["integration", "系统集成"],
      ["branch", "默认分支"],
      ["status", "状态"],
    ],
    fields: [
      ["name", "仓库名称"],
      ["type", "仓库类型"],
      ["integration", "系统集成"],
      ["url", "仓库地址"],
      ["branch", "默认分支"],
      ["manifest", "Manifest 文件"],
      ["referenceRepository", "参考 Repo 仓库"],
      ["credential", "用户凭证"],
      ["description", "仓库描述"],
    ],
  },
  sourceRevisions: {
    title: "SourceRevision",
    desc: "维护 Repo 工程可复用的源码版本基线",
    columns: [
      ["name", "配置名称"],
      ["repository", "Repo 仓库"],
      ["revision", "Revision"],
      ["description", "描述"],
      ["updated", "更新时间"],
    ],
    fields: [
      ["name", "配置名称"],
      ["repository", "Repo 仓库"],
      ["revision", "Revision"],
      ["description", "描述"],
    ],
  },
  pipelines: {
    title: "流水线",
    desc: "创建、配置、触发并观察持续集成流水线",
    columns: [
      ["name", "流水线名称"],
      ["project", "所属项目"],
      ["repository", "代码仓库"],
      ["trigger", "触发方式"],
      ["lastBuild", "最近构建"],
      ["lastStatus", "状态"],
    ],
    fields: [
      ["name", "流水线名称"],
      ["project", "所属项目"],
      ["repository", "代码仓库"],
      ["branch", "默认分支"],
      ["trigger", "触发方式"],
    ],
  },
  plugins: {
    title: "插件管理",
    desc: "管理普通插件、复合插件、脚本及版本发布",
    columns: [
      ["name", "插件名称"],
      ["category", "分类"],
      ["version", "版本"],
      ["source", "来源"],
      ["status", "状态"],
    ],
    fields: [
      ["name", "插件名称"],
      ["category", "分类"],
      ["version", "版本"],
      ["source", "来源"],
      ["command", "执行命令"],
    ],
  },
  composites: {
    title: "复合插件",
    desc: "图形化组合插件步骤，沉淀可复用标准流程",
    columns: [
      ["name", "复合插件名称"],
      ["category", "分类"],
      ["organization", "可用组织"],
      ["version", "版本"],
      ["steps", "步骤数"],
      ["status", "状态"],
    ],
    fields: [
      ["name", "复合插件名称"],
      ["category", "分类"],
      ["organization", "可用组织"],
      ["editors", "可编辑用户"],
      ["description", "描述"],
    ],
  },
  tools: {
    title: "工具管理",
    desc: "上传并发布流水线节点可用的工具",
    columns: [
      ["name", "工具名称"],
      ["version", "版本"],
      ["platform", "平台"],
      ["path", "安装路径"],
      ["status", "状态"],
    ],
    fields: [
      ["name", "工具名称"],
      ["type", "工具类型"],
      ["version", "版本"],
      ["platform", "操作系统"],
      ["package", "安装包"],
      ["path", "安装路径"],
      ["requirements", "系统要求"],
    ],
  },
  nodes: {
    title: "节点管理",
    desc: "管理执行节点、标签、工作空间与维护状态",
    columns: [
      ["name", "节点名称"],
      ["labels", "标签"],
      ["executor", "执行器"],
      ["workspace", "工作空间"],
      ["status", "状态"],
    ],
    fields: [
      ["name", "服务器名称"],
      ["organization", "可编辑组织"],
      ["visibleOrganization", "仅可见组织"],
      ["engine", "构建引擎"],
      ["executor", "最大并行数"],
      ["labels", "服务器标签"],
      ["container", "支持容器运行"],
      ["workspace", "节点根路径"],
      ["startArgs", "节点启动参数"],
      ["connection", "连接方式"],
      ["environment", "环境变量（KEY=VALUE）"],
      ["description", "服务器描述"],
    ],
  },
  integrations: {
    title: "系统集成",
    desc: "配置并测试 GitLab、Jenkins、Jira 等外部系统",
    columns: [
      ["name", "名称"],
      ["type", "类型"],
      ["url", "服务地址"],
      ["credential", "凭证"],
      ["organization", "所属组织"],
      ["status", "状态"],
    ],
    fields: [
      ["name", "名称"],
      ["type", "类型"],
      ["url", "服务地址"],
      ["credential", "凭证"],
      ["organization", "所属组织"],
      ["remoteRoot", "远程根目录"],
      ["permissionScope", "权限范围"],
    ],
  },
  credentials: {
    title: "凭证管理",
    desc: "统一管理用户名密码、Token 与 SSH 私钥",
    columns: [
      ["name", "凭证名称"],
      ["type", "类型"],
      ["username", "用户名"],
      ["scope", "作用域"],
      ["status", "状态"],
    ],
    fields: [
      ["name", "凭证名称"],
      ["type", "凭证类型"],
      ["username", "用户名"],
      ["scope", "作用域"],
      ["secret", "密码 / 私钥"],
    ],
  },
  users: {
    title: "用户管理",
    desc: "创建用户并关联组织与平台角色",
    columns: [
      ["name", "用户名"],
      ["displayName", "姓名"],
      ["email", "邮箱"],
      ["organization", "组织"],
      ["roles", "角色"],
      ["status", "状态"],
    ],
    fields: [
      ["displayName", "姓名"],
      ["name", "账号"],
      ["secret", "密码"],
      ["confirmSecret", "确认密码"],
      ["email", "邮箱"],
      ["roles", "角色"],
      ["organization", "组织"],
    ],
  },
  organizations: {
    title: "组织管理",
    desc: "维护组织树及组织成员",
    columns: [
      ["name", "组织名称"],
      ["parent", "上级组织"],
      ["owner", "负责人"],
      ["members", "成员数"],
      ["description", "描述"],
    ],
    fields: [
      ["name", "组织名称"],
      ["parent", "上级组织"],
      ["owner", "负责人"],
      ["description", "描述"],
    ],
  },
  roles: {
    title: "角色权限",
    desc: "配置平台和项目范围的页面与操作权限",
    columns: [
      ["name", "角色名称"],
      ["scope", "权限范围"],
      ["users", "用户数"],
      ["permissions", "权限摘要"],
    ],
    fields: [
      ["name", "角色名称"],
      ["scope", "权限范围"],
      ["permissions", "权限摘要"],
    ],
  },
  artifacts: {
    title: "制品管理",
    desc: "浏览由流水线生成的仓库、版本与文件",
    columns: [
      ["name", "制品名称"],
      ["repository", "制品库"],
      ["version", "版本"],
      ["file", "文件"],
      ["size", "大小"],
      ["pipeline", "来源流水线"],
      ["created", "创建时间"],
    ],
    fields: [
      ["name", "制品名称"],
      ["repository", "制品库"],
      ["version", "版本"],
      ["file", "文件"],
    ],
  },
};

function Badge({ children }) {
  return <span className={`status s-${children}`}>{children}</span>;
}

function Modal({
  title,
  fields,
  initial,
  onClose,
  onSave,
  options = {},
  entity,
  requireTest = false,
}) {
  const [form, setForm] = useState(initial || {});
  const [error, setError] = useState("");
  const [tested, setTested] = useState(!requireTest);
  const updateField = (key, value) => {
    setForm({ ...form, [key]: value });
    setError("");
    if (requireTest) setTested(false);
  };
  const submit = () => {
    if (!form[fields[0][0]]?.toString().trim())
      return setError(`${fields[0][1]}不能为空`);
    const requiredByEntity =
      {
        projects: ["projectSet", "owner"],
        repositories: ["type", "integration"],
        sourceRevisions: ["repository", "revision"],
        plugins: ["category", "version"],
        composites: ["category", "organization", "editors"],
        tools: ["type", "version", "platform"],
        nodes: [
          "organization",
          "engine",
          "executor",
          "labels",
          "container",
          "connection",
        ],
        integrations: ["type", "url", "credential", "organization"],
        credentials: ["type", "scope"],
        organizations: ["parent", "owner"],
        roles: ["scope"],
      }[entity] || [];
    const missingRequired = requiredByEntity.find(
      (key) => !String(form[key] ?? "").trim(),
    );
    if (missingRequired) {
      const label =
        fields.find(([key]) => key === missingRequired)?.[1] || missingRequired;
      return setError(`${label}不能为空`);
    }
    if (entity === "credentials" && !initial?.id && !form.secret)
      return setError("密码 / 私钥不能为空");
    if (entity === "tools" && !initial?.id && !form.package)
      return setError("请上传工具安装包");
    if (entity === "users" && !initial?.id) {
      if (!/^[\u4e00-\u9fa5A-Za-z]{2,14}$/.test(form.displayName || ""))
        return setError("姓名需为2-14位汉字或字母");
      if (!/^[A-Za-z0-9.]{3,20}$/.test(form.name || ""))
        return setError("账号需为3-20位字母、数字或点");
      if (!/^(?=.*[A-Za-z])(?=.*\d)\S{6,16}$/.test(form.secret || ""))
        return setError("密码需包含字母和数字，长度6-16位");
      if (form.secret !== form.confirmSecret)
        return setError("两次输入的密码不一致");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email || ""))
        return setError("请输入正确的邮箱地址");
      if (!form.roles || !form.organization)
        return setError("角色和组织不能为空");
    }
    if (entity === "repositories") {
      if (!["GitLab", "Gerrit", "仓库组"].includes(form.type) && !form.url)
        return setError("仓库地址不能为空");
      if (form.type === "Repo" && (!form.branch || !form.manifest))
        return setError("Repo 仓库必须选择分支和 Manifest 文件");
      if (form.type === "SVN" && (!form.credential || /[%\\]/.test(form.name)))
        return setError("SVN 仓库需要凭证，名称不能包含 % 或反斜杠");
    }
    if (
      entity === "integrations" &&
      form.type === "SSH制品服务器" &&
      (!form.remoteRoot || !form.permissionScope)
    )
      return setError("制品服务器必须配置远程根目录和权限范围");
    if (requireTest && !tested) return setError("请先完成连接测试");
    onSave(
      requireTest
        ? {
            ...form,
            status: "连接正常",
            lastTest: new Date().toLocaleString("zh-CN", { hour12: false }),
          }
        : form,
    );
  };
  return (
    <div className="modal-mask">
      <div className="pet-modal">
        <header>
          <strong>{title}</strong>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <main>
          {fields
            .filter(([key]) => {
              if (entity === "repositories") {
                if (["manifest", "referenceRepository"].includes(key))
                  return form.type === "Repo";
                if (key === "credential") return form.type === "SVN";
                if (key === "branch") return form.type !== "仓库组";
                if (key === "url")
                  return !["GitLab", "Gerrit", "仓库组"].includes(form.type);
              }
              if (
                entity === "integrations" &&
                ["remoteRoot", "permissionScope"].includes(key)
              )
                return form.type === "SSH制品服务器";
              return true;
            })
            .map(([key, label]) => (
              <label key={key}>
                <span>
                  {label}
                  {key === fields[0][0] && <em>*</em>}
                </span>
                {options[key] ? (
                  <select
                    value={form[key] ?? ""}
                    onChange={(e) => updateField(key, e.target.value)}
                  >
                    <option value="">请选择{label}</option>
                    {options[key].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                ) : key === "package" ? (
                  <input
                    type="file"
                    onChange={(e) =>
                      updateField(key, e.target.files?.[0]?.name || "")
                    }
                  />
                ) : key === "secret" || key === "confirmSecret" ? (
                  <input
                    type="password"
                    value={form[key] || ""}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                ) : (
                  <input
                    value={form[key] ?? ""}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                )}
              </label>
            ))}
          {error && <div className="form-error">{error}</div>}
        </main>
        <footer>
          <button onClick={onClose}>取消</button>
          {requireTest && (
            <button
              onClick={() => {
                if (!form.url || !form.credential) {
                  setError("服务地址和凭证不能为空");
                  return;
                }
                setTested(true);
                setError("");
              }}
            >
              测试连接{tested ? " ✓" : ""}
            </button>
          )}
          <button
            className="primary"
            disabled={requireTest && !tested}
            onClick={submit}
          >
            确定
          </button>
        </footer>
      </div>
    </div>
  );
}

function ProjectSetManager({ db, refresh, onClose, notify }) {
  const [editing, setEditing] = useState(null);
  const removeSet = async (item) => {
    const references = db.projects.filter(
      (project) => project.projectSet === item.name,
    );
    if (references.length) {
      notify(
        `无法删除，项目集内仍有 ${references.map((project) => project.name).join("、")}`,
      );
      return;
    }
    if (!confirm(`确认删除项目集“${item.name}”吗？`)) return;
    await petApi.remove("projectSets", item.id);
    await refresh();
    notify("项目集已删除");
  };
  return (
    <div className="modal-mask">
      <section className="pet-modal project-set-manager">
        <header>
          <strong>项目集管理</strong>
          <button aria-label="关闭项目集管理" onClick={onClose}>
            <X />
          </button>
        </header>
        <main>
          <button className="primary" onClick={() => setEditing({})}>
            <Plus /> 新建项目集
          </button>
          <table>
            <thead>
              <tr>
                <th>项目集名称</th>
                <th>负责人</th>
                <th>项目数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {db.projectSets.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.owner}</td>
                  <td>
                    {
                      db.projects.filter(
                        (project) => project.projectSet === item.name,
                      ).length
                    }
                  </td>
                  <td className="actions">
                    <button onClick={() => setEditing(item)}>编辑</button>
                    <button className="danger" onClick={() => removeSet(item)}>
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>
        <footer>
          <button onClick={onClose}>关闭</button>
        </footer>
      </section>
      {editing && (
        <Modal
          title={`${editing.id ? "编辑" : "新建"}项目集`}
          fields={[
            ["name", "项目集名称"],
            ["owner", "负责人"],
            ["description", "描述"],
          ]}
          initial={editing}
          options={{ owner: db.users.map((item) => item.name) }}
          onClose={() => setEditing(null)}
          onSave={async (form) => {
            if (editing.id) {
              const oldName = editing.name;
              await petApi.update("projectSets", editing.id, form);
              if (oldName !== form.name) {
                for (const project of db.projects.filter(
                  (item) => item.projectSet === oldName,
                ))
                  await petApi.update("projects", project.id, {
                    projectSet: form.name,
                  });
              }
            } else await petApi.create("projectSets", form);
            setEditing(null);
            await refresh();
            notify("项目集已保存");
          }}
        />
      )}
    </div>
  );
}

function ImportPluginModal({ onClose, onDone }) {
  const [file, setFile] = useState(null),
    [error, setError] = useState("");
  const submit = async () => {
    if (!file) {
      setError("请选择 PET 插件导出文件");
      return;
    }
    let value = {};
    try {
      value = JSON.parse(await file.text());
    } catch {
      value = {};
    }
    const base = file.name.replace(/\.(pet-plugin\.)?(json|zip)$/i, "");
    await petApi.create("plugins", {
      name: value.name || base || "导入插件",
      category: value.category || "通用",
      version: value.version || "0.0.1",
      source: "导入",
      status: "暂存",
      command: value.command || "",
      controls: value.controls || [],
      sources: [],
      description:
        value.description || "由本地文件导入；按手册要求，数据源需重新配置。",
    });
    onDone();
  };
  return (
    <div className="modal-mask">
      <section className="pet-modal">
        <header>
          <strong>导入插件</strong>
          <button onClick={onClose}>
            <X />
          </button>
        </header>
        <main>
          <label>
            <span>
              插件文件<em>*</em>
            </span>
            <input
              type="file"
              accept=".json,.zip,.pet-plugin.json"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <p>
            导入保留基础信息、控件和执行命令；数据源不会随包导入，需要重新配置并测试。
          </p>
          {file && (
            <div>
              {file.name} · {(file.size / 1024).toFixed(1)} KB
            </div>
          )}
          {error && <div className="form-error">{error}</div>}
        </main>
        <footer>
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={submit}>
            开始导入
          </button>
        </footer>
      </section>
    </div>
  );
}

function ResetPasswordModal({ user, onClose, onDone }) {
  const [next, setNext] = useState(""),
    [confirmPassword, setConfirmPassword] = useState(""),
    [error, setError] = useState("");
  const submit = async () => {
    if (!/^(?=.*[A-Za-z])(?=.*\d)\S{6,16}$/.test(next)) {
      setError("密码需包含字母和数字，长度6-16位且不能包含空格");
      return;
    }
    if (next !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    await petApi.update("users", user.id, { passwordUpdated: "刚刚" });
    onDone();
  };
  return (
    <div className="modal-mask">
      <section className="pet-modal">
        <header>
          <strong>重置 {user.name} 的密码</strong>
          <button onClick={onClose}>
            <X />
          </button>
        </header>
        <main>
          <label>
            <span>
              新密码<em>*</em>
            </span>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </label>
          <label>
            <span>
              确认密码<em>*</em>
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
          {error && <div className="form-error">{error}</div>}
        </main>
        <footer>
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={submit}>
            确认重置
          </button>
        </footer>
      </section>
    </div>
  );
}

function RolePermissionModal({ role, onClose, onDone }) {
  const groups = {
      平台设置: ["用户查看", "用户编辑", "组织管理", "凭证管理"],
      资源管理: ["资源查看", "资源管理", "节点连接", "工具发布"],
      项目与代码: ["项目管理", "仓库读取", "仓库编辑", "SourceRevision管理"],
      持续集成: ["流水线查看", "流水线配置", "执行流水线", "删除流水线"],
      交付能力: ["制品管理", "制品准出", "插件查看", "插件管理"],
    },
    all = Object.values(groups).flat(),
    [permissions, setPermissions] = useState(role.permissionList || []);
  const toggle = (value) =>
    setPermissions(
      permissions.includes(value)
        ? permissions.filter((item) => item !== value)
        : [...permissions, value],
    );
  return (
    <div className="modal-mask">
      <section className="pet-modal permission-modal">
        <header>
          <strong>{role.name} · 权限配置</strong>
          <button onClick={onClose}>
            <X />
          </button>
        </header>
        <main>
          <label className="check-line">
            <input
              type="checkbox"
              checked={all.every((value) => permissions.includes(value))}
              onChange={(event) =>
                setPermissions(event.target.checked ? all : [])
              }
            />
            全选权限
          </label>
          <div className="permission-tree">
            {Object.entries(groups).map(([group, values]) => (
              <section key={group}>
                <label>
                  <input
                    type="checkbox"
                    checked={values.every((value) =>
                      permissions.includes(value),
                    )}
                    onChange={(event) =>
                      setPermissions(
                        event.target.checked
                          ? [...new Set([...permissions, ...values])]
                          : permissions.filter(
                              (value) => !values.includes(value),
                            ),
                      )
                    }
                  />
                  <b>{group}</b>
                </label>
                <div className="permission-grid">
                  {values.map((value) => (
                    <label key={value}>
                      <input
                        type="checkbox"
                        checked={permissions.includes(value)}
                        onChange={() => toggle(value)}
                      />
                      {value}
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </main>
        <footer>
          <button onClick={onClose}>取消</button>
          <button
            className="primary"
            onClick={async () => {
              await petApi.update("roles", role.id, {
                permissionList: permissions,
                permissions: permissions.join("、") || "无权限",
              });
              onDone();
            }}
          >
            保存权限
          </button>
        </footer>
      </section>
    </div>
  );
}

function NodeConnectionModal({ node, credentials, onClose, onDone }) {
  const [method, setMethod] = useState(node.connection || "手动连接"),
    [root, setRoot] = useState(node.workspace || "/data/PETNode"),
    [user, setUser] = useState("builder"),
    [credential, setCredential] = useState(credentials[0]?.name || ""),
    [log, setLog] = useState("等待连接…"),
    [connecting, setConnecting] = useState(false);
  const command = `pnode -httpUrl http://mock.pet.local:8181 -wsUrl mock.pet.local:8187 -name ${node.name} -root ${root}`;
  const download = () => {
    const url = URL.createObjectURL(
        new Blob(["PET Node Mock package"], {
          type: "application/octet-stream",
        }),
      ),
      link = document.createElement("a");
    link.href = url;
    link.download = "PETNode-mock.tar";
    link.click();
    URL.revokeObjectURL(url);
  };
  const connect = () => {
    if (method === "SSH连接" && (!root || !user || !credential)) {
      setLog("ERROR 请填写根路径、执行用户和凭证");
      return;
    }
    setConnecting(true);
    setLog(`Connecting ${node.name}...\nUsing ${method}\nRoot: ${root}`);
    setTimeout(async () => {
      await petApi.update("nodes", node.id, {
        status: "在线",
        connection: method,
        workspace: root,
        lastConnected: "刚刚",
      });
      setLog(
        "Connected\nNode agent is ready\nExecutors registered successfully",
      );
      setConnecting(false);
      onDone(false);
    }, 850);
  };
  return (
    <div className="modal-mask">
      <section className="pet-modal node-connect-modal">
        <header>
          <strong>{node.name} · 节点连接</strong>
          <button onClick={onClose}>
            <X />
          </button>
        </header>
        <main>
          <div className="studio-tabs">
            {["手动连接", "SSH连接"].map((value) => (
              <button
                key={value}
                className={method === value ? "active" : ""}
                onClick={() => setMethod(value)}
              >
                {value}
              </button>
            ))}
          </div>
          {method === "手动连接" ? (
            <>
              <p>下载节点包并在目标服务器执行以下命令：</p>
              <div className="token-value">
                <code>{command}</code>
                <button onClick={() => navigator.clipboard?.writeText(command)}>
                  复制
                </button>
              </div>
              <button onClick={download}>下载 PETNode 节点包</button>
            </>
          ) : (
            <>
              <label>
                <span>
                  根路径<em>*</em>
                </span>
                <input value={root} onChange={(e) => setRoot(e.target.value)} />
              </label>
              <label>
                <span>
                  执行用户<em>*</em>
                </span>
                <input value={user} onChange={(e) => setUser(e.target.value)} />
              </label>
              <label>
                <span>
                  SSH 凭证<em>*</em>
                </span>
                <select
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                >
                  {credentials.map((item) => (
                    <option key={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          <pre className="connection-log">{log}</pre>
        </main>
        <footer>
          <button onClick={onClose}>关闭</button>
          <button className="primary" disabled={connecting} onClick={connect}>
            {connecting ? "连接中…" : "连接"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function ResourcePage({
  entity,
  data,
  refresh,
  openPipeline,
  db = {
    projects: [{ id: "p1", name: "PET 演示项目" }],
    repositories: [{ id: "repo1", name: "pet-demo" }],
  },
}) {
  const cfg = configs[entity],
    [search, setSearch] = useState(""),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(""),
    [explorer, setExplorer] = useState(null),
    [studio, setStudio] = useState(null),
    [domain, setDomain] = useState(null),
    [importOpen, setImportOpen] = useState(false),
    [projectSetManagerOpen, setProjectSetManagerOpen] = useState(false),
    [projectSetFilter, setProjectSetFilter] = useState("全部"),
    [actionDialog, setActionDialog] = useState(null);
  const fieldOptions =
    {
      projects: {
        projectSet: db.projectSets.map((item) => item.name),
        owner: db.users.map((item) => item.name),
      },
      repositories: {
        type: ["GitLab", "Gerrit", "SVN", "Repo", "仓库组"],
        integration: db.integrations.map((item) => item.name),
        credential: db.credentials.map((item) => item.name),
        referenceRepository: db.repositories
          .filter((item) => item.type === "Repo")
          .map((item) => item.name),
      },
      sourceRevisions: {
        repository: db.repositories
          .filter((item) => item.type === "Repo")
          .map((item) => item.name),
      },
      plugins: {
        category: ["代码管理", "构建", "测试", "发布", "通用", "Yocto"],
        source: ["自定义"],
      },
      composites: {
        category: ["构建", "测试", "质量", "发布"],
        organization: db.organizations.map((item) => item.name),
      },
      tools: {
        type: ["Maven", "Gradle", "CMake", "自定义"],
        platform: ["Linux", "Windows", "通用"],
      },
      nodes: {
        organization: db.organizations.map((item) => item.name),
        visibleOrganization: [
          "全部",
          ...db.organizations.map((item) => item.name),
        ],
        engine: db.integrations
          .filter((item) => item.type === "Jenkins")
          .map((item) => item.name),
        container: ["支持", "不支持"],
        connection: ["手动连接", "SSH连接"],
      },
      integrations: {
        type: [
          "GitLab",
          "Gerrit",
          "Jenkins",
          "Jira",
          "SonarQube",
          "CodeBeamer",
          "SSH制品服务器",
        ],
        credential: db.credentials.map((item) => item.name),
        organization: db.organizations.map((item) => item.name),
        permissionScope: ["全局", ...db.organizations.map((item) => item.name)],
      },
      credentials: {
        type: ["用户名密码", "Token", "SSH 私钥"],
        scope: ["全局", ...db.organizations.map((item) => item.name)],
      },
      users: {
        organization: db.organizations.map((item) => item.name),
        roles: db.roles.map((item) => item.name),
      },
      organizations: {
        parent: ["无", ...db.organizations.map((item) => item.name)],
        owner: db.users.map((item) => item.name),
      },
      roles: { scope: ["平台", "项目"] },
      artifacts: { repository: ["release-packages", "snapshot-packages"] },
    }[entity] || {};
  useEffect(() => {
    setModal(null);
    setExplorer(null);
    setStudio(null);
    setDomain(null);
    setSearch("");
  }, [entity]);
  useEffect(() => {
    if (entity !== "artifacts") return;
    const selectedId = sessionStorage.getItem("pet-selected-artifact");
    const selected = data.find((item) => item.id === selectedId);
    if (selected) setDomain(selected);
  }, [entity, data]);
  useEffect(() => {
    if (entity !== "artifacts") return;
    const openSelected = (event) => {
      const selected = data.find((item) => item.id === event.detail);
      if (selected) setDomain(selected);
    };
    addEventListener("pet-open-artifact", openSelected);
    return () => removeEventListener("pet-open-artifact", openSelected);
  }, [entity, data]);
  const rows = useMemo(
    () =>
      data.filter(
        (row) =>
          (entity !== "projects" ||
            projectSetFilter === "全部" ||
            row.projectSet === projectSetFilter) &&
          Object.values(row)
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [data, search, entity, projectSetFilter],
  );
  const notify = (text) => {
    setToast(text);
    setTimeout(() => setToast(""), 1800);
  };
  const save = async (form) => {
    const sameName = db[entity]?.find(
      (item) =>
        item.id !== modal?.id &&
        String(item.name || "")
          .trim()
          .toLowerCase() ===
          String(form.name || "")
            .trim()
            .toLowerCase(),
    );
    if (sameName) {
      notify(`名称“${form.name}”已存在`);
      return;
    }
    const defaultStatus =
      {
        repositories: "已同步",
        plugins: "暂存",
        composites: "暂存",
        tools: "暂存",
        nodes: "维护中",
        integrations: "未测试",
        credentials: "可用",
        users: "正常",
        projects: "进行中",
      }[entity] || "正常";
    const cleanForm = { ...form };
    if (entity === "users") {
      delete cleanForm.secret;
      delete cleanForm.confirmSecret;
      cleanForm.passwordUpdated = "创建时已设置";
    }
    if (entity === "credentials") {
      cleanForm.secretConfigured =
        !!cleanForm.secret || !!modal?.secretConfigured;
      delete cleanForm.secret;
    }
    modal?.id
      ? await petApi.update(entity, modal.id, cleanForm)
      : await petApi.create(entity, {
          ...cleanForm,
          status: cleanForm.status || defaultStatus,
        });
    setModal(null);
    await refresh();
    notify("保存成功");
  };
  const remove = async (row) => {
    const references =
      {
        organizations: db.users
          .filter((item) => item.organization?.split(",").includes(row.name))
          .map((item) => item.name),
        roles: db.users
          .filter((item) => item.roles?.split(",").includes(row.name))
          .map((item) => item.name),
        credentials: db.integrations
          .filter((item) => item.credential === row.name)
          .map((item) => item.name),
        integrations: db.repositories
          .filter((item) => item.integration === row.name)
          .map((item) => item.name),
        repositories: db.pipelines
          .filter((item) => item.repository === row.name)
          .map((item) => item.name),
        plugins: db.pipelines
          .filter((item) =>
            JSON.stringify(item.stageList || []).includes(row.name),
          )
          .map((item) => item.name),
        composites: db.pipelines
          .filter((item) =>
            JSON.stringify(item.stageList || []).includes(row.name),
          )
          .map((item) => item.name),
      }[entity] || [];
    if (references.length) {
      notify(`无法删除，正在被 ${references.join("、")} 使用`);
      return;
    }
    if (!confirm(`确认删除“${row.name}”吗？`)) return;
    await petApi.remove(entity, row.id);
    await refresh();
    notify("删除成功");
  };
  const exportPlugin = (row) => {
    const payload = JSON.stringify(
        { ...row, sources: undefined, exportedAt: new Date().toISOString() },
        null,
        2,
      ),
      url = URL.createObjectURL(
        new Blob([payload], { type: "application/json" }),
      ),
      anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${row.name}-${row.version || "0.0.1"}.pet-plugin.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify("插件导出包已生成");
  };
  const special = async (row) => {
    if (entity === "integrations") {
      const result = await petApi.testIntegration(row.id);
      notify(
        result.status === "连接正常"
          ? "连接测试成功"
          : `连接测试失败：${result.testMessage}`,
      );
    }
    if (entity === "nodes") {
      await petApi.toggleNode(row.id);
      notify("节点状态已更新");
    }
    if (entity === "tools") {
      await petApi.update("tools", row.id, {
        status: row.status === "已发布" ? "暂存" : "已发布",
      });
      notify(row.status === "已发布" ? "工具已下架" : "工具已发布");
    }
    if (entity === "pipelines") {
      const run = await petApi.runPipeline(row.id);
      notify(`构建 #${run.number} 已进入队列`);
      setTimeout(async () => {
        await petApi.finishRun(run.id, true);
        refresh();
      }, 2200);
    }
    await refresh();
  };
  if (entity === "scripts") return <ScriptManager db={db} refresh={refresh} />;
  if (entity === "monitoring")
    return <MonitoringPage db={db} refresh={refresh} />;
  if (entity === "pipelines")
    return (
      <PipelineManage openPipeline={openPipeline} db={db} refresh={refresh} />
    );
  if (explorer)
    return (
      <RepositoryExplorer repo={explorer} onClose={() => setExplorer(null)} />
    );
  if (studio)
    return (
      <PluginStudio
        item={studio}
        composite={entity === "composites"}
        onClose={() => setStudio(null)}
        refresh={refresh}
      />
    );
  if (domain && entity === "projects")
    return (
      <ProjectWorkspace
        project={domain}
        db={db}
        onClose={() => setDomain(null)}
      />
    );
  if (domain && entity === "artifacts")
    return (
      <ArtifactBrowser artifact={domain} onClose={() => setDomain(null)} />
    );
  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>{cfg.title}</h1>
          <p>{cfg.desc}</p>
        </div>
        {entity === "plugins" && (
          <button onClick={() => setImportOpen(true)}>导入</button>
        )}
        {entity === "projects" && (
          <button onClick={() => setProjectSetManagerOpen(true)}>
            项目集管理
          </button>
        )}
        <button
          className="primary"
          onClick={() =>
            setModal(entity === "pipelines" ? { wizard: true } : {})
          }
        >
          <Plus size={16} /> 新建
        </button>
      </div>
      <div className="toolbar">
        {entity === "projects" && (
          <select
            value={projectSetFilter}
            onChange={(e) => setProjectSetFilter(e.target.value)}
          >
            <option>全部</option>
            {db.projectSets.map((item) => (
              <option key={item.id}>{item.name}</option>
            ))}
          </select>
        )}
        <label>
          <Search size={16} />
          <input
            placeholder="请输入关键字搜索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button onClick={refresh}>
          <RefreshCw size={15} /> 刷新
        </button>
        <span>共 {rows.length} 条</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {cfg.columns.map(([, label]) => (
                <th key={label}>{label}</th>
              ))}
              <th className="actions">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {cfg.columns.map(([key]) => (
                  <td key={key}>
                    {key === "status" || key === "lastStatus" ? (
                      <Badge>{String(row[key])}</Badge>
                    ) : entity === "organizations" && key === "name" ? (
                      <span
                        className={
                          row.parent && row.parent !== "无"
                            ? "org-child"
                            : "org-root"
                        }
                      >
                        {row.parent && row.parent !== "无" ? "└ " : "▾ "}
                        {row.name}
                      </span>
                    ) : (
                      String(row[key] ?? "-")
                    )}
                  </td>
                ))}
                <td className="actions">
                  <button onClick={() => setModal(row)}>编辑</button>
                  {entity === "repositories" && (
                    <button onClick={() => setExplorer(row)}>浏览</button>
                  )}
                  {entity === "projects" && (
                    <button onClick={() => setDomain(row)}>项目设置</button>
                  )}
                  {entity === "artifacts" && (
                    <button onClick={() => setDomain(row)}>浏览制品</button>
                  )}
                  {(entity === "plugins" || entity === "composites") && (
                    <>
                      <button onClick={() => setStudio(row)}>设计</button>
                      <button
                        onClick={async () => {
                          await petApi.update(entity, row.id, {
                            favorite: !row.favorite,
                          });
                          await refresh();
                          notify(row.favorite ? "已取消收藏" : "已收藏");
                        }}
                      >
                        {row.favorite ? "取消收藏" : "收藏"}
                      </button>
                    </>
                  )}
                  {entity === "plugins" && (
                    <button onClick={() => exportPlugin(row)}>导出</button>
                  )}
                  {entity === "users" && (
                    <button
                      onClick={() => setActionDialog({ type: "password", row })}
                    >
                      重置密码
                    </button>
                  )}
                  {entity === "roles" && (
                    <button
                      onClick={() => setActionDialog({ type: "role", row })}
                    >
                      配置权限
                    </button>
                  )}
                  {entity === "tools" && (
                    <button onClick={() => special(row)}>
                      {row.status === "已发布" ? "下架" : "发布"}
                    </button>
                  )}
                  {entity === "pipelines" && (
                    <>
                      <button
                        onClick={() => {
                          sessionStorage.setItem(
                            "pet-selected-pipeline",
                            JSON.stringify(row),
                          );
                          openPipeline(row);
                        }}
                      >
                        配置
                      </button>
                      <button onClick={() => special(row)}>立即构建</button>
                    </>
                  )}
                  {entity === "integrations" && (
                    <button onClick={() => special(row)}>测试连接</button>
                  )}
                  {entity === "nodes" && (
                    <>
                      <button
                        onClick={() =>
                          setActionDialog({ type: "connect", row })
                        }
                      >
                        连接
                      </button>
                      <button onClick={() => special(row)}>
                        {row.status === "维护中" ? "上线" : "维护"}
                      </button>
                    </>
                  )}
                  <button
                    className="danger"
                    title={
                      entity === "plugins" && row.source === "系统"
                        ? "系统插件不支持删除"
                        : "删除"
                    }
                    disabled={entity === "plugins" && row.source === "系统"}
                    onClick={() => remove(row)}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="empty">暂无数据</div>}
      </div>
      {modal?.wizard ? (
        <PipelineWizard
          db={db}
          onClose={() => setModal(null)}
          onDone={async () => {
            setModal(null);
            await refresh();
            notify("流水线创建成功");
          }}
        />
      ) : (
        modal && (
          <Modal
            title={`${modal.id ? "编辑" : "新建"}${cfg.title.replace("管理", "")}`}
            fields={
              entity === "users" && modal.id
                ? cfg.fields.filter(
                    ([key]) => !["secret", "confirmSecret"].includes(key),
                  )
                : cfg.fields
            }
            initial={modal}
            onClose={() => setModal(null)}
            onSave={save}
            options={fieldOptions}
            entity={entity}
            requireTest={entity === "integrations"}
          />
        )
      )}{" "}
      {importOpen && (
        <ImportPluginModal
          onClose={() => setImportOpen(false)}
          onDone={async () => {
            setImportOpen(false);
            await refresh();
            notify("插件导入成功，请重新配置数据源");
          }}
        />
      )}
      {projectSetManagerOpen && (
        <ProjectSetManager
          db={db}
          refresh={refresh}
          notify={notify}
          onClose={() => setProjectSetManagerOpen(false)}
        />
      )}
      {actionDialog?.type === "password" && (
        <ResetPasswordModal
          user={actionDialog.row}
          onClose={() => setActionDialog(null)}
          onDone={async () => {
            setActionDialog(null);
            await refresh();
            notify("密码已重置");
          }}
        />
      )}
      {actionDialog?.type === "role" && (
        <RolePermissionModal
          role={actionDialog.row}
          onClose={() => setActionDialog(null)}
          onDone={async () => {
            setActionDialog(null);
            await refresh();
            notify("角色权限已保存");
          }}
        />
      )}
      {actionDialog?.type === "connect" && (
        <NodeConnectionModal
          node={actionDialog.row}
          credentials={db.credentials}
          onClose={() => setActionDialog(null)}
          onDone={async () => {
            setActionDialog(null);
            await refresh();
            notify("节点连接成功");
          }}
        />
      )}
      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}

function LegacyRuns({ db, refresh }) {
  const [selected, setSelected] = useState(null);
  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>构建记录</h1>
          <p>查看触发来源、阶段状态、控制台日志与构建产物</p>
        </div>
      </div>
      <div className="run-layout">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>流水线</th>
                <th>构建号</th>
                <th>触发方式</th>
                <th>执行人</th>
                <th>开始时间</th>
                <th>耗时</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {db.runs.map((r) => (
                <tr key={r.id}>
                  <td>{r.pipeline}</td>
                  <td>#{r.number}</td>
                  <td>{r.trigger}</td>
                  <td>{r.user}</td>
                  <td>{r.started}</td>
                  <td>{r.duration}</td>
                  <td>
                    <Badge>{r.status}</Badge>
                  </td>
                  <td className="actions">
                    <button onClick={() => setSelected(r)}>详情 / 日志</button>
                    {r.status === "运行中" && (
                      <button
                        onClick={async () => {
                          await petApi.finishRun(r.id, true);
                          refresh();
                        }}
                      >
                        模拟完成
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selected && (
          <div className="log-drawer">
            <header>
              <strong>
                {selected.pipeline} #{selected.number}
              </strong>
              <button onClick={() => setSelected(null)}>
                <X size={18} />
              </button>
            </header>
            <div className="stage-strip">
              {["准备工作空间", "代码检出", "编译", "测试", "上传制品"].map(
                (x, i) => (
                  <div
                    className={
                      selected.status === "失败" && i === 3 ? "failed" : "done"
                    }
                    key={x}
                  >
                    <span>{i + 1}</span>
                    {x}
                  </div>
                ),
              )}
            </div>
            <pre>{`[Pipeline] Start of Pipeline\n[PET] 分配节点 linux-build-01\n[Stage] 代码检出\nCloning repository ${selected.pipeline}...\n[Stage] 编译\nTasking compiler finished with exit code 0\n[Stage] 测试\n${selected.status === "失败" ? "ERROR: Test suite failed" : "Tests passed: 128, failed: 0"}\n[Stage] 上传制品\n${selected.status === "成功" ? "Uploaded release package successfully" : "Skipped due to earlier failure"}\n[Pipeline] ${selected.status}`}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

function Overview({ db, navigate }) {
  const stats = [
    ["项目", db.projects.length, Boxes],
    ["流水线", db.pipelines.length, GitBranch],
    ["在线节点", db.nodes.filter((x) => x.status === "在线").length, Network],
    ["今日构建", db.runs.length, Activity],
  ];
  return (
    <div className="page overview">
      <div className="welcome">
        <div>
          <h1>欢迎使用 PET</h1>
          <p>工程效率平台 · 从代码到制品的持续交付工作台</p>
        </div>
        <button className="primary" onClick={() => navigate("pipelines")}>
          <Play size={16} /> 创建流水线
        </button>
      </div>
      <div className="stat-grid">
        {stats.map(([n, v, I]) => (
          <div className="stat" key={n}>
            <I />
            <div>
              <b>{v}</b>
              <span>{n}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section>
          <h2>最近流水线</h2>
          {db.pipelines.map((p) => (
            <button
              className="pipeline-card"
              onClick={() => navigate("pipelines")}
              key={p.id}
            >
              <GitBranch />
              <span>
                <b>{p.name}</b>
                <small>
                  {p.project} · {p.trigger}
                </small>
              </span>
              <Badge>{p.lastStatus}</Badge>
            </button>
          ))}
        </section>
        <section>
          <h2>动态与通知</h2>
          {db.notifications.map((n) => (
            <div className="notification" key={n.id}>
              <span className={`dot ${n.level}`} />
              <div>
                <b>{n.title}</b>
                <small>{n.time}</small>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function MyProjectPage({ navigate }) {
  const [query, setQuery] = useState("");
  const visible = "buildTrigger".toLowerCase().includes(query.trim().toLowerCase());
  return (
    <div className="observed-my-project">
      <aside className="project-tree-panel">
        <div className="project-tree-title"><Search size={17} /> 搜索项目 <span>＋　⇅　≪</span></div>
        <label className="project-tree-search"><Search size={15} /><input aria-label="搜索项目" placeholder="项目集/项目/成员/描述" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <div className="project-tree-divider" />
        {visible && <button className="project-tree-row active"><span>▤</span> 演示项目 <span>☆　···</span></button>}
      </aside>
      <section className="project-list-panel">
        <nav className="project-tabs"><button className="active">项目列表</button><button>项目集成员管理</button><button>项目集角色权限</button></nav>
        <button className="observed-add-project" disabled>＋ 新增项目</button>
        <div className="observed-project-table">
          <table><thead><tr>{["项目名称", "项目负责人", "所属组织", "创建时间", "项目状态", "项目描述", "操作"].map((label) => <th key={label}>{label}</th>)}</tr></thead>
          <tbody>{visible && <tr><td><button className="project-name-link" onClick={() => navigate("pipelines")}>buildTrigger</button></td><td><span className="admin-tag">管理员</span></td><td>试用组织</td><td>2025-12-01 23:06:21</td><td>进行中</td><td></td><td><button disabled>编辑</button><button disabled>删除</button></td></tr>}</tbody></table>
          {!visible && <div className="project-empty">暂无数据</div>}
        </div>
        <footer className="project-pagination"><span>共{visible ? 1 : 0}条</span><button disabled>‹</button><button className="active">1</button><button disabled>›</button><button>15 条/页⌄</button></footer>
      </section>
    </div>
  );
}

function EvidencePending({ title }) {
  return <div className="evidence-pending"><h2>{title}</h2><p>该入口已在官方页面观察到；页面内容尚未完成实时取证，因此不展示推测的表格、按钮或操作流。</p></div>;
}

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("demo-admin"),
    [password, setPassword] = useState(""),
    [error, setError] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("请输入用户名和密码");
      return;
    }
    localStorage.setItem("pet-demo-auth", "1");
    localStorage.setItem("pet-demo-user", username.trim());
    onLogin();
  };
  return (
    <div className="login-page">
      <section className="login-brand">
        <div>
          <b>PET</b>
          <span>Product Engineering Tool</span>
        </div>
        <h1>汽车软件持续集成平台</h1>
        <p>统一管理项目、代码、流水线、插件、构建节点与交付制品。</p>
      </section>
      <form className="login-card" onSubmit={submit}>
        <header>
          <b>PET</b>
          <h2>账号登录</h2>
          <p>此页面使用本地 Mock 鉴权，不会向原系统提交凭证。</p>
        </header>
        <label>
          用户名
          <input
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="请输入用户名"
          />
        </label>
        <label>
          密码
          <input
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button className="primary" type="submit">
          登录
        </button>
        <small>演示环境：输入任意非空账号和密码即可进入</small>
      </form>
    </div>
  );
}

export default function PetApp() {
  const initialLocation = location.hash.slice(1);
  const initialRoute = initialLocation.split("/")[0];
  const [route, setRoute] = useState(initialRoute === "overview" || !initialRoute ? "projects" : initialRoute);
  const [db, setDb] = useState(null);
  const [detail, setDetail] = useState(initialLocation === "pipelines/editor");
  const [collapsed, setCollapsed] = useState(false);
  const [accountMenu, setAccountMenu] = useState(false);
  const [authenticated, setAuthenticated] = useState(
    () => localStorage.getItem("pet-demo-auth") !== "0",
  );
  const refresh = async () => setDb(await petApi.snapshot());
  const hasActiveRuns = !!db?.runs?.some((run) => ["队列中", "运行中"].includes(run.status));
  useEffect(() => {
    refresh();
    const handler = () => {
      const next = location.hash.slice(1);
      const nextRoute = next.split("/")[0];
      setRoute(nextRoute === "overview" || !nextRoute ? "projects" : nextRoute);
      setDetail(next === "pipelines/editor");
    };
    addEventListener("hashchange", handler);
    return () => removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    document.body.dataset.auth = authenticated ? "1" : "0";
  }, [authenticated]);
  useEffect(() => {
    if (!hasActiveRuns) return undefined;
    petApi.resumeActiveRuns();
    const timer = window.setInterval(refresh, 500);
    return () => window.clearInterval(timer);
  }, [hasActiveRuns]);
  const navigate = (key) => {
    location.hash = key;
    setRoute(key);
    setDetail(false);
  };
  const openPipeline = () => {
    location.hash = "pipelines/editor";
    setRoute("pipelines");
    setDetail(true);
  };
  const closePipeline = () => {
    location.hash = "pipelines";
    setDetail(false);
  };
  if (!authenticated)
    return <LoginPage onLogin={() => setAuthenticated(true)} />;
  if (!db)
    return (
      <div className="loading">
        <RefreshCw className="spin" /> 正在加载 PET...
      </div>
    );
  if (detail)
    return (
      <div className="detail-host">
        <PipelineExperience
          onDataChange={refresh}
          onClose={closePipeline}
        />
      </div>
    );
  return (
    <div className={`pet-shell ${collapsed ? "collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="logo">
          <b>PET</b>
          <span>☰</span>
        </div>
        <nav>
          {modules.map((g) => (
            <div className="nav-group" key={g.group}>
              {g.group && <small>{g.group}</small>}
              {g.items.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  className={route === key ? "active" : ""}
                  onClick={() => navigate(key)}
                  title={label}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="crumb"><b>{{ projects: "项目管理", resources: "资源管理", plugins: "插件管理", users: "用户管理", pipelines: "流水线" }[route] || "项目管理"}</b></div>
          <div className="top-actions">
            <button
              aria-label="打开全局搜索"
              onClick={() =>
                document.querySelector('[aria-label="全局搜索"]')?.click()
              }
            >
              <Search size={18} />
            </button>
            <button aria-label="切换语言">文/A</button>
            <button aria-label="帮助">?</button>
            <button
              className="account-trigger"
              onClick={() => setAccountMenu(!accountMenu)}
            >
              <span className="avatar">高</span>
              <span>{localStorage.getItem("pet-demo-user") || "demo-admin"}</span>
            </button>
            {accountMenu && (
              <div className="account-menu">
                <button
                  onClick={() => {
                    setAccountMenu(false);
                    sessionStorage.removeItem("pet-selected-pipeline");
                    localStorage.setItem("pet-demo-auth", "0");
                    setAuthenticated(false);
                  }}
                >
                  退出登录
                </button>
              </div>
            )}
          </div>
        </header>
        {route === "projects" ? <MyProjectPage navigate={navigate} />
        : route === "pipelines" ? (
          <ResourcePage
            entity={route}
            data={db[route] || []}
            db={db}
            refresh={refresh}
            openPipeline={openPipeline}
          />
        ) : route === "users" ? <RoleManagement db={db} refresh={refresh} />
        : route === "plugins" ? <PluginManagement db={db} refresh={refresh} />
        : <EvidencePending title={{ resources: "资源管理" }[route] || "未取证页面"} />}
      </main>
    </div>
  );
}
