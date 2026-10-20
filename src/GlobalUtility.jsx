import React,{useEffect,useMemo,useState}from"react";
import{Bell,ChevronDown,FolderKanban,Search,ShieldCheck,X}from"lucide-react";
import{petApi}from"./mockPetApi.js";

const targets=[
  ["项目","projects","projects"],["流水线","pipelines","pipelines"],["仓库","repositories","repositories"],
  ["插件","plugins","plugins"],["复合插件","composites","composites"],["脚本","scripts","scripts"],
];

export function GlobalUtility(){
  const[panel,setPanel]=useState(null),[db,setDb]=useState(null),[query,setQuery]=useState("");
  const[project,setProject]=useState(localStorage.getItem("pet-current-project")||"PET 演示项目");
  const[role,setRole]=useState(localStorage.getItem("pet-current-role")||"平台管理员");
  const refresh=()=>petApi.snapshot().then(setDb);
  useEffect(()=>{refresh();document.body.dataset.role=role},[]);
  const chooseRole=value=>{setRole(value);localStorage.setItem("pet-current-role",value);document.body.dataset.role=value;setPanel(null)};
  const results=useMemo(()=>{if(!db)return[];const needle=query.trim().toLowerCase();return targets.flatMap(([kind,entity,route])=>(db[entity]||[]).filter(item=>!needle||Object.values(item).join(" ").toLowerCase().includes(needle)).slice(0,4).map(item=>({kind,route,item}))).slice(0,12)},[db,query]);
  const openResult=result=>{if(result.route==="pipelines")sessionStorage.setItem("pet-selected-pipeline",JSON.stringify(result.item));location.hash=result.route;window.dispatchEvent(new HashChangeEvent("hashchange"));setPanel(null)};
  const markRead=async notice=>{await petApi.update("notifications",notice.id,{read:true});await refresh()};
  if(!db)return null;
  const unread=db.notifications.filter(item=>!item.read).length;
  return <div className="global-utility">
    <button aria-label="全局搜索" onClick={()=>setPanel(panel==="search"?null:"search")}><Search size={18}/></button>
    <button aria-label="切换项目" onClick={()=>setPanel(panel==="project"?null:"project")}><FolderKanban size={18}/><span>{project}</span><ChevronDown size={13}/></button>
    <button aria-label="通知中心" onClick={()=>setPanel(panel==="notice"?null:"notice")}><Bell size={18}/>{unread>0&&<i>{unread}</i>}</button>
    <button aria-label="切换角色" onClick={()=>setPanel(panel==="role"?null:"role")}><ShieldCheck size={18}/><span>{role}</span></button>
    {panel&&<div className="utility-panel"><header><strong>{panel==="search"?"全局搜索":panel==="project"?"快速切换项目":panel==="notice"?"通知中心":"角色权限预览"}</strong><button aria-label="关闭快捷面板" onClick={()=>setPanel(null)}><X size={17}/></button></header>
      {panel==="search"?<div className="global-search"><label><Search size={16}/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder="搜索项目、流水线、仓库、插件"/></label>{results.map(result=><button onClick={()=>openResult(result)} key={`${result.kind}-${result.item.id}`}><b>{result.kind}</b> {result.item.name}<span>{result.item.description||result.item.status||result.item.project||""}</span></button>)}{!results.length&&<p>没有匹配结果</p>}</div>
      :panel==="project"?<div className="utility-list">{db.projects.map(item=><button className={project===item.name?"active":""} onClick={()=>{setProject(item.name);localStorage.setItem("pet-current-project",item.name);location.hash="overview";setPanel(null)}} key={item.id}><b>{item.name}</b><span>{item.projectSet} · {item.owner}</span></button>)}</div>
      :panel==="notice"?<div className="utility-list">{db.notifications.map(item=><button className={item.read?"read":""} onClick={()=>markRead(item)} key={item.id}><b>{item.title}</b><span>{item.time}{item.read?" · 已读":" · 点击标记已读"}</span></button>)}</div>
      :<div className="utility-list">{[["平台管理员","全部平台与项目操作"],["开发人员","仓库、流水线和制品操作"],["访客","只读，隐藏新建、编辑、删除与执行"]].map(([value,description])=><button className={role===value?"active":""} onClick={()=>chooseRole(value)} key={value}><b>{value}</b><span>{description}</span></button>)}</div>}
    </div>}
  </div>;
}
