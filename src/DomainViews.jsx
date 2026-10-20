import React, { useState } from "react";
import { Download, FileText, Folder, Plus, Trash2, X } from "lucide-react";
import { petApi } from "./mockPetApi.js";

export function ProjectWorkspace({ project, db, onClose }) {
  const [tab, setTab] = useState("成员管理"),
    [members, setMembers] = useState(
      project.membersDetail || [
        {
          name: "demo-admin",
          display: "高磊",
          role: "项目负责人",
          source: "项目",
        },
        { name: "zhangsan", display: "张三", role: "普通用户", source: "全局" },
      ],
    );
  const [roles, setRoles] = useState(
    project.projectRoles || [
      {
        name: "项目负责人",
        summary: "项目全部权限",
        permissions: ["代码仓库", "流水线配置", "执行流水线", "项目设置"],
      },
      {
        name: "普通用户",
        summary: "仓库读取、流水线配置与执行",
        permissions: ["代码仓库", "流水线配置", "执行流水线"],
      },
      { name: "访客", summary: "只读权限", permissions: ["代码仓库"] },
    ],
  );
  const [adding, setAdding] = useState(false),
    [editing, setEditing] = useState(null),
    [toast, setToast] = useState("");
  const [basic, setBasic] = useState({
    name: project.name,
    owner: project.owner,
    description: project.description || "",
  });
  const note = (value) => {
    setToast(value);
    setTimeout(() => setToast(""), 1600);
  };
  const persistProject = async (patch) => {
    await petApi.update("projects", project.id, patch);
    note("项目设置已保存");
  };
  const togglePermission = (roleIndex, permission) =>
    setRoles(
      roles.map((role, index) =>
        index === roleIndex
          ? {
              ...role,
              permissions: role.permissions.includes(permission)
                ? role.permissions.filter((item) => item !== permission)
                : [...role.permissions, permission],
            }
          : role,
      ),
    );
  const saveRole = async () => {
    await persistProject({ projectRoles: roles });
    note("角色权限已保存");
  };
  const saveMember = (value) => {
    if (editing == null && members.some((item) => item.name === value.name)) {
      note("该用户已经是项目成员");
      return;
    }
    const next =
      editing != null
        ? members.map((item, index) =>
            index === editing ? { ...item, ...value } : item,
          )
        : [
            ...members,
            { ...value, display: value.display || value.name, source: "项目" },
          ];
    setMembers(next);
    petApi.update("projects", project.id, {
      membersDetail: next,
      members: next.length,
    });
    setAdding(false);
    setEditing(null);
    note(editing != null ? "成员权限已更新" : "成员已添加");
  };
  return (
    <div className="full-panel">
      <header>
        <button onClick={onClose}>← 返回项目列表</button>
        <strong>{project.name} / 项目设置</strong>
      </header>
      <div className="studio-tabs">
        <button
          className={tab === "成员管理" ? "active" : ""}
          onClick={() => setTab("成员管理")}
        >
          成员管理
        </button>
        <button
          className={tab === "角色权限" ? "active" : ""}
          onClick={() => setTab("角色权限")}
        >
          角色权限
        </button>
        <button
          className={tab === "项目设置" ? "active" : ""}
          onClick={() => setTab("项目设置")}
        >
          基本设置
        </button>
      </div>
      <div className="domain-page">
        <div className="domain-head">
          <div>
            <h2>{tab}</h2>
            <p>
              {tab === "成员管理"
                ? "为项目成员分配仅在当前项目生效的角色权限"
                : tab === "角色权限"
                  ? "维护项目内自定义角色和页面操作权限"
                  : "修改项目名称、负责人和描述"}
            </p>
          </div>
          {tab !== "项目设置" && (
            <button
              className="primary"
              onClick={() => {
                setEditing(null);
                setAdding(true);
              }}
            >
              <Plus size={15} />
              新增{tab === "成员管理" ? "成员" : "角色"}
            </button>
          )}
        </div>
        {tab === "成员管理" ? (
          <table>
            <thead>
              <tr>
                <th>用户名</th>
                <th>姓名</th>
                <th>项目角色</th>
                <th>来源</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member, index) => (
                <tr key={`${member.name}-${index}`}>
                  <td>{member.name}</td>
                  <td>{member.display}</td>
                  <td>{member.role}</td>
                  <td>
                    <span className="status">{member.source}</span>
                  </td>
                  <td className="actions">
                    {member.source !== "全局" && (
                      <>
                        <button
                          onClick={() => {
                            setEditing(index);
                            setAdding(true);
                          }}
                        >
                          编辑权限
                        </button>
                        <button
                          className="danger"
                          onClick={() => {
                            const next = members.filter((_, i) => i !== index);
                            setMembers(next);
                            petApi.update("projects", project.id, {
                              membersDetail: next,
                              members: next.length,
                            });
                            note("成员已删除");
                          }}
                        >
                          删除
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === "角色权限" ? (
          <div className="role-cards">
            {roles.map((role, index) => (
              <section key={role.name}>
                <h3>{role.name}</h3>
                <p>{role.summary}</p>
                <div>
                  {["代码仓库", "流水线配置", "执行流水线", "项目设置"].map(
                    (permission) => (
                      <label key={permission}>
                        <input
                          type="checkbox"
                          checked={role.permissions.includes(permission)}
                          onChange={() => togglePermission(index, permission)}
                        />
                        {permission}
                      </label>
                    ),
                  )}
                </div>
                <button onClick={saveRole}>保存权限</button>
                <button
                  className="danger"
                  onClick={() => {
                    if (members.some((member) => member.role === role.name)) {
                      note(`角色正在被项目成员使用，无法删除`);
                      return;
                    }
                    const next = roles.filter(
                      (_, roleIndex) => roleIndex !== index,
                    );
                    setRoles(next);
                    petApi.update("projects", project.id, {
                      projectRoles: next,
                    });
                    note("项目角色已删除");
                  }}
                >
                  删除角色
                </button>
              </section>
            ))}
          </div>
        ) : (
          <div className="settings-form">
            <label>
              项目名称
              <input
                value={basic.name}
                onChange={(event) =>
                  setBasic({ ...basic, name: event.target.value })
                }
              />
            </label>
            <label>
              负责人
              <select
                value={basic.owner}
                onChange={(event) =>
                  setBasic({ ...basic, owner: event.target.value })
                }
              >
                {(db?.users || []).map((user) => (
                  <option key={user.id}>{user.name}</option>
                ))}
              </select>
            </label>
            <label>
              项目描述
              <textarea
                value={basic.description}
                onChange={(event) =>
                  setBasic({ ...basic, description: event.target.value })
                }
              />
            </label>
            <button
              className="primary"
              disabled={!basic.name.trim()}
              onClick={() => persistProject(basic)}
            >
              保存
            </button>
          </div>
        )}
      </div>
      {adding && (
        <MemberRoleModal
          tab={tab}
          initial={editing != null ? members[editing] : null}
          users={db?.users || []}
          roles={roles}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSave={(value) =>
            tab === "成员管理"
              ? saveMember(value)
              : (() => {
                  if (roles.some((role) => role.name === value.name)) {
                    note("项目角色名称已存在");
                    return;
                  }
                  const next = [
                    ...roles,
                    { name: value.name, summary: value.role, permissions: [] },
                  ];
                  setRoles(next);
                  petApi.update("projects", project.id, { projectRoles: next });
                  setAdding(false);
                  note("项目角色已添加");
                })()
          }
        />
      )}{" "}
      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}

function MemberRoleModal({ tab, initial, users, roles, onClose, onSave }) {
  const [form, setForm] = useState({
      name: initial?.name || "",
      role: initial?.role || "普通用户",
    }),
    [error, setError] = useState("");
  const submit = () => {
    if (!form.name.trim())
      return setError(tab === "成员管理" ? "请输入用户名" : "请输入角色名称");
    onSave(form);
  };
  return (
    <div className="modal-mask">
      <div className="pet-modal">
        <header>
          <strong>
            {initial ? "编辑" : "新增"}
            {tab === "成员管理" ? "成员" : "项目角色"}
          </strong>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <main>
          <label>
            <span>
              {tab === "成员管理" ? "选择用户" : "角色名称"}
              <em>*</em>
            </span>
            {tab === "成员管理" ? (
              <select
                value={form.name}
                disabled={!!initial}
                onChange={(event) => {
                  const user = users.find(
                    (item) => item.name === event.target.value,
                  );
                  setForm({
                    ...form,
                    name: event.target.value,
                    display: user?.displayName || event.target.value,
                  });
                }}
              >
                <option value="">请选择平台用户</option>
                {users.map((user) => (
                  <option key={user.id} value={user.name}>
                    {user.name}（{user.displayName || user.name}）
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={form.name}
                disabled={!!initial}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="请输入角色名称"
              />
            )}
          </label>
          <label>
            <span>{tab === "成员管理" ? "项目角色" : "权限摘要"}</span>
            {tab === "成员管理" ? (
              <select
                value={form.role}
                onChange={(event) =>
                  setForm({ ...form, role: event.target.value })
                }
              >
                {roles.map((role) => (
                  <option key={role.name}>{role.name}</option>
                ))}
              </select>
            ) : (
              <input
                value={form.role}
                onChange={(event) =>
                  setForm({ ...form, role: event.target.value })
                }
              />
            )}
          </label>
          {error && <p className="form-error">{error}</p>}
        </main>
        <footer>
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={submit}>
            确定
          </button>
        </footer>
      </div>
    </div>
  );
}

export function ArtifactBrowser({ artifact, onClose }) {
  const [path, setPath] = useState([
      "release-packages",
      artifact.name,
      artifact.version,
    ]),
    [files, setFiles] = useState(
      artifact.files || [
        {
          name: artifact.file,
          type: "ZIP",
          size: artifact.size,
          updated: artifact.created,
        },
        { name: "release", type: "目录", size: "-", updated: artifact.created },
        {
          name: "build-report.html",
          type: "HTML",
          size: "326 KB",
          updated: artifact.created,
        },
      ],
    );
  const [info, setInfo] = useState(false),
    [editingTest, setEditingTest] = useState(null),
    [compareOpen, setCompareOpen] = useState(false),
    [compareVersion, setCompareVersion] = useState("1.0.0"),
    [released, setReleased] = useState(!!artifact.released),
    [folder, setFolder] = useState(false),
    [folderName, setFolderName] = useState(""),
    [preview, setPreview] = useState(null),
    [testInfo, setTestInfo] = useState(
      artifact.testInfo || [
        {
          name: "单元测试",
          url: "mock://reports/unit-test",
          file: "junit.xml",
        },
      ],
    ),
    [form, setForm] = useState({ name: "", url: "", file: "" }),
    [toast, setToast] = useState("");
  const note = (value) => {
    setToast(value);
    setTimeout(() => setToast(""), 1600);
  };
  const persistFiles = (next) => {
    setFiles(next);
    petApi.update("artifacts", artifact.id, { files: next });
  };
  const persistTestInfo = (next) => {
    setTestInfo(next);
    petApi.update("artifacts", artifact.id, { testInfo: next });
  };
  const download = (item) => {
    const blob = new Blob(
        [
          `PET Mock artifact: ${item?.name || artifact.file}\nPipeline: ${artifact.pipeline}`,
        ],
        { type: "text/plain" },
      ),
      url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = item?.name || artifact.file;
    link.click();
    URL.revokeObjectURL(url);
    note("Mock 下载已生成");
  };
  const openFile = (item) =>
    item.type === "目录" ? setPath([...path, item.name]) : setPreview(item);
  return (
    <div className="full-panel">
      <header>
        <button onClick={onClose}>← 返回制品库</button>
        <strong>{path.join(" / ")}</strong>
        <button onClick={() => setInfo(true)}>添加测试信息</button>
        <button
          onClick={() => {
            const next = !released;
            setReleased(next);
            petApi.update("artifacts", artifact.id, { released: next });
            note(next ? "制品已标记准出" : "已取消准出");
          }}
        >
          {released ? "取消准出" : "准出"}
        </button>
        <button onClick={() => setCompareOpen(true)}>对比</button>
        <button onClick={() => download()}>
          <Download size={15} /> 下载制品
        </button>
      </header>
      <div className="artifact-layout">
        <aside>
          <h3>release-packages</h3>
          <button onClick={() => setPath(["release-packages", artifact.name])}>
            ▾ {artifact.name}
          </button>
          <button
            className="active"
            onClick={() =>
              setPath(["release-packages", artifact.name, artifact.version])
            }
          >
            　▾ {artifact.version}
          </button>
          <button
            onClick={() =>
              setPath([
                "release-packages",
                artifact.name,
                artifact.version,
                "release",
              ])
            }
          >
            　　 release
          </button>
        </aside>
        <main>
          <div className="domain-head">
            <div>
              <h2>{artifact.name}</h2>
              <p>来源：{artifact.pipeline}</p>
            </div>
            <button className="primary" onClick={() => setFolder(true)}>
              <Plus size={15} />
              新建目录
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>名称</th>
                <th>类型</th>
                <th>大小</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {files.map((item, index) => (
                <tr key={item.name}>
                  <td>
                    <button
                      className="file-link"
                      onClick={() => openFile(item)}
                    >
                      {item.type === "目录" ? (
                        <Folder size={14} />
                      ) : (
                        <FileText size={14} />
                      )}{" "}
                      {item.name}
                    </button>
                  </td>
                  <td>{item.type}</td>
                  <td>{item.size}</td>
                  <td>{item.updated}</td>
                  <td className="actions">
                    <button
                      aria-label={`下载${item.name}`}
                      onClick={() => download(item)}
                    >
                      <Download size={14} />
                    </button>
                    <button
                      className="danger"
                      aria-label={`删除${item.name}`}
                      onClick={() => {
                        persistFiles(files.filter((_, i) => i !== index));
                        note("文件条目已删除");
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <section className="artifact-meta">
            <h3>测试信息</h3>
            {testInfo.map((item, index) => (
              <p key={`${item.name}-${index}`}>
                <b>{item.name}</b>　
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer">
                    {item.url}
                  </a>
                ) : (
                  item.file
                )}
                <button
                  onClick={() => {
                    setEditingTest(index);
                    setForm(item);
                    setInfo(true);
                  }}
                >
                  编辑
                </button>
                <button
                  className="danger"
                  onClick={() => {
                    persistTestInfo(testInfo.filter((_, i) => i !== index));
                    note("测试信息已删除");
                  }}
                >
                  删除
                </button>
              </p>
            ))}
          </section>
          {preview && (
            <section className="artifact-meta">
              <h3>{preview.name}</h3>
              <pre>
                {preview.type === "HTML"
                  ? "Mock 构建报告\n128 tests passed\ncoverage: 86.4%"
                  : `Mock 文件预览：${preview.name}`}
              </pre>
              <button onClick={() => setPreview(null)}>关闭预览</button>
            </section>
          )}
        </main>
      </div>
      {folder && (
        <div className="modal-mask">
          <div className="pet-modal">
            <header>
              <strong>新建目录</strong>
              <button onClick={() => setFolder(false)}>
                <X />
              </button>
            </header>
            <main>
              <label>
                <span>
                  目录名称<em>*</em>
                </span>
                <input
                  value={folderName}
                  onChange={(event) => setFolderName(event.target.value)}
                />
              </label>
            </main>
            <footer>
              <button onClick={() => setFolder(false)}>取消</button>
              <button
                className="primary"
                disabled={!folderName.trim()}
                onClick={() => {
                  persistFiles([
                    ...files,
                    {
                      name: folderName.trim(),
                      type: "目录",
                      size: "-",
                      updated: "刚刚",
                    },
                  ]);
                  setFolderName("");
                  setFolder(false);
                  note("目录已创建");
                }}
              >
                确定
              </button>
            </footer>
          </div>
        </div>
      )}
      {info && (
        <div className="modal-mask">
          <div className="pet-modal">
            <header>
              <strong>{editingTest == null ? "添加" : "编辑"}测试信息</strong>
              <button onClick={() => setInfo(false)}>
                <X size={18} />
              </button>
            </header>
            <main>
              <label>
                <span>
                  信息名称<em>*</em>
                </span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="例如：覆盖率报告"
                />
              </label>
              <label>
                <span>报告地址</span>
                <input
                  value={form.url}
                  onChange={(event) =>
                    setForm({ ...form, url: event.target.value })
                  }
                  placeholder="https://..."
                />
              </label>
              <label>
                <span>报告文件</span>
                <input
                  type="file"
                  onChange={(event) =>
                    setForm({
                      ...form,
                      file: event.target.files?.[0]?.name || "",
                    })
                  }
                />
              </label>
            </main>
            <footer>
              <button onClick={() => setInfo(false)}>取消</button>
              <button
                className="primary"
                disabled={!form.name.trim() || (!form.url && !form.file)}
                onClick={() => {
                  persistTestInfo(
                    editingTest == null
                      ? [...testInfo, form]
                      : testInfo.map((item, index) =>
                          index === editingTest ? form : item,
                        ),
                  );
                  setInfo(false);
                  setEditingTest(null);
                  setForm({ name: "", url: "", file: "" });
                  note(
                    editingTest == null ? "测试信息已添加" : "测试信息已更新",
                  );
                }}
              >
                确定
              </button>
            </footer>
          </div>
        </div>
      )}
      {compareOpen && (
        <div className="modal-mask">
          <div className="pet-modal">
            <header>
              <strong>制品版本对比</strong>
              <button onClick={() => setCompareOpen(false)}>
                <X />
              </button>
            </header>
            <main>
              <label>
                <span>当前版本</span>
                <input value={artifact.version} readOnly />
              </label>
              <label>
                <span>对比版本</span>
                <select
                  value={compareVersion}
                  onChange={(event) => setCompareVersion(event.target.value)}
                >
                  <option>1.0.0</option>
                  <option>0.9.0</option>
                </select>
              </label>
              <pre>{`Changelog-diff.txt\n+ ${artifact.version}: pipeline ${artifact.pipeline}\n- ${compareVersion}: previous baseline\n+ build-report.html\n~ ${artifact.file}`}</pre>
            </main>
            <footer>
              <button onClick={() => setCompareOpen(false)}>关闭</button>
              <button
                className="primary"
                onClick={() => {
                  setCompareOpen(false);
                  setPreview({ name: "Changelog-diff.txt", type: "TXT" });
                  note("差异文件已生成");
                }}
              >
                生成差异文件
              </button>
            </footer>
          </div>
        </div>
      )}
      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}
