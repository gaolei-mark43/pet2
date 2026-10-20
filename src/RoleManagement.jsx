import React, { useEffect, useMemo, useState } from "react";
import { Plus, Settings, Trash2, UserRound, X } from "lucide-react";
import { petApi } from "./mockPetApi.js";
import {
  ALL_ROLE_PERMISSIONS,
  normalizeRole,
  permissionsFromReference,
  ROLE_PERMISSION_GROUPS,
  togglePermission,
  togglePermissionSet,
} from "./rolePermissionModel.js";

function RoleDialog({ role, roles, onClose, onDone }) {
  const editing = !!role;
  const [name, setName] = useState(role?.name || "");
  const [scope, setScope] = useState(role?.scope || "平台");
  const [referenceId, setReferenceId] = useState("");
  const [error, setError] = useState("");
  const submit = async () => {
    const cleanName = name.trim();
    if (!cleanName) return setError("请输入角色名称");
    if (roles.some((item) => item.id !== role?.id && item.name === cleanName)) return setError("角色名称已存在");
    const reference = roles.find((item) => item.id === referenceId);
    const patch = {
      name: cleanName,
      scope,
      referenceRole: reference?.name || role?.referenceRole || "无",
      permissionList: reference ? permissionsFromReference(reference) : role?.permissionList || [],
      permissions: reference ? `${permissionsFromReference(reference).length} 项权限` : role?.permissions || "无权限",
      system: false,
      locked: false,
      users: role?.users || 0,
    };
    if (editing) await petApi.update("roles", role.id, patch);
    else await petApi.create("roles", patch);
    onDone(editing ? "角色属性已保存" : "自定义角色已创建");
  };
  return <div className="role-mask"><section className="role-dialog" role="dialog" aria-label={editing ? "角色属性" : "新增自定义角色"}>
    <header><strong>{editing ? "角色属性" : "新增自定义角色"}</strong><button aria-label="关闭" onClick={onClose}><X /></button></header>
    <main>
      <label><span><em>*</em> 角色名称</span><input maxLength={30} value={name} disabled={role?.locked} onChange={(e)=>{setName(e.target.value);setError("");}} /><small>{name.length}/30</small></label>
      <label><span><em>*</em> 角色范围</span><select value={scope} disabled={role?.locked} onChange={(e)=>setScope(e.target.value)}><option>平台</option><option>组织</option><option>项目</option></select></label>
      <label><span>参考角色</span><select value={referenceId} disabled={role?.locked} onChange={(e)=>setReferenceId(e.target.value)}><option value="">不参考</option>{roles.filter((item)=>item.id!==role?.id).map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select><small>选择参考角色后，将以该角色当前权限覆盖本角色权限。</small></label>
      {error && <p className="role-error">{error}</p>}
    </main>
    <footer><button onClick={onClose}>取消</button><button className="role-primary" onClick={submit}>确定</button></footer>
  </section></div>;
}

export function RoleManagement({ db, refresh }) {
  const roles = useMemo(() => (db.roles || []).map(normalizeRole), [db.roles]);
  const [selectedId, setSelectedId] = useState(roles[0]?.id);
  const selected = roles.find((item) => item.id === selectedId) || roles[0];
  const [permissions, setPermissions] = useState(selected?.permissionList || []);
  const [dialog, setDialog] = useState(null);
  const [deleteRole, setDeleteRole] = useState(null);
  const [toast, setToast] = useState("");
  useEffect(() => setPermissions(selected?.permissionList || []), [selected?.id, selected?.permissionList]);
  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(""), 1800); };
  const done = async (message) => { setDialog(null); await refresh(); notify(message); };
  const save = async () => {
    if (!selected || selected.locked) return;
    await petApi.update("roles", selected.id, { permissionList: permissions, permissions: `${permissions.length} 项权限` });
    await refresh();
    notify("角色权限已保存，相关用户重新登录后生效");
  };
  return <div className="role-page">
    <header className="role-page-head"><nav><button className="active">角色权限</button></nav><div><button className="role-primary" onClick={()=>setDialog({ type:"create" })}><Plus />新增自定义角色</button><button disabled={selected?.locked} onClick={save}>保存</button></div></header>
    <div className="role-layout">
      <aside className="role-list"><h3>角色列表</h3>{roles.map((role)=><button key={role.id} className={role.id===selected?.id?"active":""} onClick={()=>setSelectedId(role.id)}><UserRound /><span><b>{role.name}</b><small>{role.scope} · {role.users || 0} 个用户</small></span>{!role.system && <i>自定义</i>}</button>)}</aside>
      <main className="role-permission-main">
        <div className="role-current"><strong>{selected?.name}</strong><span>{selected?.locked ? "系统最高权限，不可修改" : `已选择 ${permissions.length} / ${ALL_ROLE_PERMISSIONS.length} 项权限`}</span><div>{!selected?.locked && <><button onClick={()=>setDialog({ type:"edit", role:selected })}><Settings />属性</button>{!selected?.system && <button className="danger" onClick={()=>setDeleteRole(selected)}><Trash2 />删除</button>}</>}</div></div>
        <div className="role-table-head"><b>功能模块</b><b>功能页面</b><b>功能权限</b><label><input type="checkbox" disabled={selected?.locked} checked={permissions.length===ALL_ROLE_PERMISSIONS.length} onChange={(e)=>setPermissions(e.target.checked?[...ALL_ROLE_PERMISSIONS]:[])} />全选</label></div>
        <div className="role-permission-table">{ROLE_PERMISSION_GROUPS.map((group)=>{const groupPermissions=group.pages.flatMap((page)=>page.permissions);return <section className="role-module" key={group.module}><div className="role-module-name"><label><input type="checkbox" disabled={selected?.locked} checked={groupPermissions.every((item)=>permissions.includes(item))} onChange={(e)=>setPermissions(togglePermissionSet(permissions,groupPermissions,e.target.checked))}/>{group.module}</label></div><div className="role-module-pages">{group.pages.map((page)=><div className="role-page-row" key={page.page}><label className="role-page-name"><input type="checkbox" disabled={selected?.locked} checked={page.permissions.every((item)=>permissions.includes(item))} onChange={(e)=>setPermissions(togglePermissionSet(permissions,page.permissions,e.target.checked))}/>{page.page}</label><div className="role-permission-grid">{page.permissions.map((permission)=><label key={permission}><input type="checkbox" disabled={selected?.locked} checked={permissions.includes(permission)} onChange={(e)=>setPermissions(togglePermission(permissions,permission,e.target.checked))}/>{permission}</label>)}</div><label className="row-all"><input type="checkbox" disabled={selected?.locked} checked={page.permissions.every((item)=>permissions.includes(item))} onChange={(e)=>setPermissions(togglePermissionSet(permissions,page.permissions,e.target.checked))}/></label></div>)}</div></section>})}</div>
      </main>
    </div>
    {dialog && <RoleDialog role={dialog.role} roles={roles} onClose={()=>setDialog(null)} onDone={done}/>} 
    {deleteRole && <div className="role-mask"><section className="role-dialog compact" role="alertdialog" aria-label="删除角色"><header><strong>删除角色</strong><button onClick={()=>setDeleteRole(null)}><X /></button></header><main><p>确定删除自定义角色“{deleteRole.name}”吗？删除后，用户授权时将不再显示该角色。</p></main><footer><button onClick={()=>setDeleteRole(null)}>取消</button><button className="role-danger" onClick={async()=>{await petApi.remove("roles",deleteRole.id);setDeleteRole(null);setSelectedId(roles.find((item)=>item.id!==deleteRole.id)?.id);await refresh();notify("角色已删除");}}>确认删除</button></footer></section></div>}
    {toast && <div className="role-toast">✓ {toast}</div>}
  </div>;
}
