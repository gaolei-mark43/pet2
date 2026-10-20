import React, { useMemo, useState } from "react";
import { Activity, Copy, FileCode2, Plus, Save, Trash2, X } from "lucide-react";
import { petApi } from "./mockPetApi.js";

export function ScriptManager({ db, refresh }) {
  const [upload, setUpload] = useState(false),
    [editingMeta, setEditingMeta] = useState(null),
    [editor, setEditor] = useState(null),
    [form, setForm] = useState({
      file: null,
      description: "",
      organization: "",
    }),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const notify = (text) => {
    setToast(text);
    setTimeout(() => setToast(""), 1800);
  };
  const submit = async () => {
    if (!form.file && !editingMeta) return setError("请选择一个脚本文件");
    if (!form.organization) return setError("请选择所属部门");
    const name = form.file?.name || editingMeta.name,
      type = name.endsWith(".py")
        ? "Python"
        : name.endsWith(".bat")
          ? "Bat"
          : name.endsWith(".groovy")
            ? "Groovy"
            : "Shell";
    const patch = {
      name,
      type,
      organization: form.organization,
      description: form.description,
      ...(form.file
        ? { content: `# ${name}\n# 已重新上传到 PET Mock 脚本库` }
        : {}),
    };
    editingMeta
      ? await petApi.update("scripts", editingMeta.id, patch)
      : await petApi.create("scripts", {
          ...patch,
          content: `# ${name}\n# 已上传到 PET Mock 脚本库`,
        });
    setUpload(false);
    setEditingMeta(null);
    setForm({ file: null, description: "", organization: "" });
    await refresh();
    notify("脚本上传成功");
  };
  const saveContent = async () => {
    await petApi.update("scripts", editor.id, { content: editor.content });
    setEditor(null);
    await refresh();
    notify("脚本内容已保存");
  };
  const remove = async (item) => {
    if (!confirm(`确认删除脚本“${item.name}”吗？`)) return;
    await petApi.remove("scripts", item.id);
    await refresh();
    notify("脚本已删除");
  };
  return (
    <div className="page supplemental-page">
      <div className="page-title">
        <div>
          <h1>脚本管理</h1>
          <p>统一管理流水线步骤可调用的脚本文件</p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setEditingMeta(null);
            setForm({ file: null, description: "", organization: "" });
            setUpload(true);
          }}
        >
          <Plus />
          上传脚本
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>脚本文件</th>
              <th>类型</th>
              <th>所属部门</th>
              <th>描述</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {db.scripts.map((item) => (
              <tr key={item.id}>
                <td>
                  <button
                    className="resource-link"
                    onClick={() => setEditor({ ...item })}
                  >
                    <FileCode2 />
                    {item.name}
                  </button>
                </td>
                <td>{item.type}</td>
                <td>{item.organization}</td>
                <td>{item.description || "-"}</td>
                <td className="actions">
                  <button
                    onClick={() => {
                      setEditingMeta(item);
                      setForm({
                        file: null,
                        description: item.description || "",
                        organization: item.organization || "",
                      });
                      setError("");
                      setUpload(true);
                    }}
                  >
                    编辑属性
                  </button>
                  <button onClick={() => setEditor({ ...item })}>
                    编辑内容
                  </button>
                  <button className="danger" onClick={() => remove(item)}>
                    <Trash2 />
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {upload && (
        <div className="modal-mask">
          <section className="pet-modal">
            <header>
              <strong>{editingMeta ? "编辑脚本属性" : "上传脚本"}</strong>
              <button onClick={() => setUpload(false)}>
                <X />
              </button>
            </header>
            <main>
              <label>
                <span>
                  {editingMeta ? "替换脚本文件（可选）" : "上传脚本文件"}
                  {!editingMeta && <em>*</em>}
                </span>
                <input
                  type="file"
                  onChange={(event) =>
                    setForm({ ...form, file: event.target.files?.[0] || null })
                  }
                />
              </label>
              <label>
                <span>脚本描述</span>
                <textarea
                  maxLength={500}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
                <small>{form.description.length}/500</small>
              </label>
              <label>
                <span>
                  所属部门<em>*</em>
                </span>
                <select
                  value={form.organization}
                  onChange={(event) =>
                    setForm({ ...form, organization: event.target.value })
                  }
                >
                  <option value="">请选择</option>
                  <option>研发中心</option>
                  <option>软件部</option>
                </select>
              </label>
              {error && <div className="form-error">{error}</div>}
            </main>
            <footer>
              <button onClick={() => setUpload(false)}>取消</button>
              <button className="primary" onClick={submit}>
                确定
              </button>
            </footer>
          </section>
        </div>
      )}
      {editor && (
        <div className="code-workspace">
          <header>
            <button onClick={() => setEditor(null)}>← 返回脚本列表</button>
            <strong>{editor.name}</strong>
            <button className="primary" onClick={saveContent}>
              <Save />
              保存
            </button>
          </header>
          <textarea
            value={editor.content || ""}
            onChange={(event) =>
              setEditor({ ...editor, content: event.target.value })
            }
          />
        </div>
      )}
      {toast && <div className="pet-toast">✓ {toast}</div>}
    </div>
  );
}

const blankAlert = {
  server: "",
  metric: "CPU利用率",
  threshold: 85,
  channel: "企业微信",
  recipients: "",
  title: "${NODE_NAME} ${ALTER_TYPE} 告警",
  message: "${NODE_NAME} 的 ${ALTER_TYPE} 当前值 ${ALTER_VALUE} 已超过阈值",
  enabled: true,
};

export function MonitoringPage({ db, refresh }) {
  const [modal, setModal] = useState(false),
    [form, setForm] = useState(blankAlert),
    [error, setError] = useState("");
  const metrics = useMemo(
    () => [
      { name: "服务器使用情况", value: "在线 1 / 2", percent: 50 },
      { name: "CPU利用率", value: "46%", percent: 46 },
      { name: "内存使用量", value: "68%", percent: 68 },
      { name: "磁盘使用量", value: "73%", percent: 73 },
    ],
    [],
  );
  const submit = async () => {
    if (!form.server || !form.recipients)
      return setError("服务器和通知人不能为空");
    form.id
      ? await petApi.update("alerts", form.id, form)
      : await petApi.create("alerts", { ...form, id: `alert-${Date.now()}` });
    setModal(false);
    setForm(blankAlert);
    await refresh();
  };
  return (
    <div className="page supplemental-page">
      <div className="page-title">
        <div>
          <h1>监控告警</h1>
          <p>监控节点资源状态并配置阈值通知</p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setForm(blankAlert);
            setError("");
            setModal(true);
          }}
        >
          <Plus />
          添加监控配置
        </button>
      </div>
      <div className="metric-grid">
        {metrics.map((item) => (
          <section key={item.name}>
            <Activity />
            <div>
              <span>{item.name}</span>
              <b>{item.value}</b>
              <progress value={item.percent} max="100" />
            </div>
          </section>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>服务器</th>
              <th>监控指标</th>
              <th>阈值</th>
              <th>通知方式</th>
              <th>通知人</th>
              <th>消息标题</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {db.alerts.map((item) => (
              <tr key={item.id}>
                <td>{item.server}</td>
                <td>{item.metric}</td>
                <td>{item.threshold}%</td>
                <td>{item.channel}</td>
                <td>{item.recipients}</td>
                <td>{item.title}</td>
                <td>
                  <span
                    className={`status ${item.enabled ? "s-成功" : "s-已终止"}`}
                  >
                    {item.enabled ? "启用" : "停用"}
                  </span>
                </td>
                <td className="actions">
                  <button
                    onClick={async () => {
                      await petApi.update("alerts", item.id, {
                        enabled: !item.enabled,
                      });
                      await refresh();
                    }}
                  >
                    {item.enabled ? "停用" : "启用"}
                  </button>
                  <button
                    onClick={() => {
                      setForm({ ...item });
                      setError("");
                      setModal(true);
                    }}
                  >
                    编辑
                  </button>
                  <button
                    className="danger"
                    onClick={async () => {
                      await petApi.remove("alerts", item.id);
                      await refresh();
                    }}
                  >
                    <Trash2 />
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <div className="modal-mask">
          <section className="pet-modal alert-modal">
            <header>
              <strong>{form.id ? "编辑" : "添加"}监控配置</strong>
              <button onClick={() => setModal(false)}>
                <X />
              </button>
            </header>
            <main>
              <label>
                <span>
                  服务器<em>*</em>
                </span>
                <select
                  value={form.server}
                  onChange={(event) =>
                    setForm({ ...form, server: event.target.value })
                  }
                >
                  <option value="">请选择节点</option>
                  {db.nodes.map((node) => (
                    <option key={node.id}>{node.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>监控指标</span>
                <select
                  value={form.metric}
                  onChange={(event) =>
                    setForm({ ...form, metric: event.target.value })
                  }
                >
                  {[
                    "磁盘使用量",
                    "CPU利用率",
                    "内存使用量",
                    "服务器使用情况",
                  ].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>告警阈值</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={form.threshold}
                  onChange={(event) =>
                    setForm({ ...form, threshold: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                <span>通知方式</span>
                <select
                  value={form.channel}
                  onChange={(event) =>
                    setForm({ ...form, channel: event.target.value })
                  }
                >
                  <option>企业微信</option>
                  <option>邮箱</option>
                </select>
              </label>
              <label>
                <span>
                  通知人<em>*</em>
                </span>
                <input
                  value={form.recipients}
                  onChange={(event) =>
                    setForm({ ...form, recipients: event.target.value })
                  }
                />
              </label>
              <label>
                <span>消息标题</span>
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                />
              </label>
              <label>
                <span>消息内容</span>
                <textarea
                  value={form.message}
                  onChange={(event) =>
                    setForm({ ...form, message: event.target.value })
                  }
                />
              </label>
              {error && <div className="form-error">{error}</div>}
            </main>
            <footer>
              <button onClick={() => setModal(false)}>取消</button>
              <button className="primary" onClick={submit}>
                确定
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

export function AccountSettings({ onClose }) {
  const [tab, setTab] = useState("修改密码"),
    [form, setForm] = useState({ old: "", next: "", confirm: "" }),
    [error, setError] = useState(""),
    [done, setDone] = useState("");
  const [token, setToken] = useState(
    () => localStorage.getItem("pet-personal-token") || "",
  );
  const changePassword = () => {
    if (!form.old) return setError("请输入旧密码");
    if (!/^(?=.*[A-Za-z])(?=.*\d)\S{6,16}$/.test(form.next))
      return setError("新密码需包含字母和数字，长度6-16位且不能包含空格");
    if (form.old === form.next) return setError("新密码不能与旧密码相同");
    if (form.next !== form.confirm) return setError("两次输入的新密码不一致");
    setError("");
    setDone("密码修改成功（Mock）");
  };
  const generate = () => {
    const value = `pet_${crypto.randomUUID().replaceAll("-", "")}`;
    localStorage.setItem("pet-personal-token", value);
    setToken(value);
  };
  return (
    <div className="modal-mask">
      <section className="account-settings">
        <header>
          <strong>账号设置</strong>
          <button onClick={onClose}>
            <X />
          </button>
        </header>
        <nav>
          {["修改密码", "个人Token"].map((item) => (
            <button
              className={tab === item ? "active" : ""}
              onClick={() => {
                setTab(item);
                setError("");
                setDone("");
              }}
              key={item}
            >
              {item}
            </button>
          ))}
        </nav>
        {tab === "修改密码" ? (
          <main>
            <label>
              旧密码
              <input
                type="password"
                value={form.old}
                onChange={(event) =>
                  setForm({ ...form, old: event.target.value })
                }
              />
            </label>
            <label>
              新密码
              <input
                type="password"
                value={form.next}
                onChange={(event) =>
                  setForm({ ...form, next: event.target.value })
                }
              />
            </label>
            <label>
              确认新密码
              <input
                type="password"
                value={form.confirm}
                onChange={(event) =>
                  setForm({ ...form, confirm: event.target.value })
                }
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            {done && <p className="form-success">{done}</p>}
            <button className="primary" onClick={changePassword}>
              确认修改
            </button>
          </main>
        ) : (
          <main>
            <p>个人 Token 用于调用平台接口，请妥善保管。</p>
            {token ? (
              <div className="token-value">
                <code>{token}</code>
                <button onClick={() => navigator.clipboard?.writeText(token)}>
                  <Copy />
                  复制
                </button>
              </div>
            ) : (
              <div className="empty-token">尚未生成个人 Token</div>
            )}
            <button className="primary" onClick={generate}>
              {token ? "重新生成" : "生成 Token"}
            </button>
          </main>
        )}
      </section>
    </div>
  );
}
