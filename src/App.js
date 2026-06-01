import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, setDoc } from "firebase/firestore";

const USERS = [
  { id: "manager",  name: "المدير المالي", role: "manager",  pin: "0000" },
  { id: "noor",     name: "نور",           role: "partner",  pin: "1111", share: 35 },
  { id: "mohammed", name: "محمد",          role: "partner",  pin: "2222", share: 15 },
  { id: "hussein",  name: "حسين",          role: "employee", pin: "3333" },
  { id: "ahmed",    name: "أحمد",          role: "partner",  pin: "4444", share: 15 },
  { id: "ihab",     name: "إيهاب",         role: "partner",  pin: "5555", share: 35 },
];

const PARTNERS   = USERS.filter(u => u.role === "partner");
const WORKERS    = USERS.filter(u => u.role !== "manager");
const SPECS      = ["مقاولات","ديكور","واجهات"];
const PROVINCES  = ["بغداد","البصرة","نينوى","أربيل","النجف","كربلاء","الأنبار","ديالى","صلاح الدين","بابل","واسط","ذي قار","المثنى","القادسية","ميسان","كركوك","السليمانية","دهوك","حلبجة"];

const toAr  = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
const fmtD  = n => toAr(Number(n||0).toLocaleString("ar-IQ")) + " د.ع";
const fmt   = (n,c) => toAr(Number(n||0).toLocaleString("ar-IQ")) + (c==="دولار"?" $":" د.ع");

function getURLUser() {
  const p = new URLSearchParams(window.location.search);
  return USERS.find(u => u.id === p.get("user")) || null;
}

function useLayout() {
  const [L, setL] = useState(window.innerWidth >= 900 ? "desktop" : "mobile");
  useEffect(() => {
    const fn = () => setL(window.innerWidth >= 900 ? "desktop" : "mobile");
    window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn);
  }, []);
  return L;
}

export default function App() {
  const urlUser = getURLUser();
  const autoLayout = useLayout();
  const [manLayout, setManLayout] = useState(null);
  const D = (manLayout || autoLayout) === "desktop";

  const [user,       setUser]       = useState(null);
  const [screen,     setScreen]     = useState("login");
  const [loginId,    setLoginId]    = useState(urlUser?.id || null);
  const [pin,        setPin]        = useState("");
  const [pinErr,     setPinErr]     = useState(false);
  const [view,       setView]       = useState("home");
  const [txs,        setTxs]        = useState([]);
  const [projs,      setProjs]      = useState([]);
  const [OBs,        setOBs]        = useState({});
  const [compSet,    setCompSet]    = useState({});
  const [loading,    setLoading]    = useState(true);
  const [form,       setForm]       = useState({ type:"استلام", projectId:"", amount:"", currency:"دينار", note:"", date:today(), image:null, isPersonal:false });
  const [formOK,     setFormOK]     = useState(false);
  const [newProj,    setNewProj]    = useState({ name:"", spec:"مقاولات", province:"بغداد", value:"", currency:"دينار" });
  const [fuUser,     setFuUser]     = useState("all");
  const [fuProj,     setFuProj]     = useState("all");
  const [fuFrom,     setFuFrom]     = useState("");
  const [fuTo,       setFuTo]       = useState("");
  const [fuCur,      setFuCur]      = useState("دينار");
  const [stUser,     setStUser]     = useState(null);
  const [selProj,    setSelProj]    = useState(null);
  const [pfFrom,     setPfFrom]     = useState("");
  const [pfTo,       setPfTo]       = useState("");
  const [viewImg,    setViewImg]    = useState(null);
  const [OBform,     setOBform]     = useState({});
  const [OBok,       setOBok]       = useState(false);
  const [compForm,   setCompForm]   = useState({});
  const [compOk,     setCompOk]     = useState(false);
  const imgRef = useRef();

  function today() { return new Date().toISOString().split("T")[0]; }

  useEffect(() => {
    const u = [];
    u.push(onSnapshot(query(collection(db,"transactions"),orderBy("date","desc")), s => { setTxs(s.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); }));
    u.push(onSnapshot(collection(db,"projects"), s => setProjs(s.docs.map(d=>({id:d.id,...d.data()})))));
    u.push(onSnapshot(collection(db,"openingBalances"), s => { const o={}; s.docs.forEach(d=>{o[d.id]=d.data();}); setOBs(o); }));
    u.push(onSnapshot(doc(db,"settings","company"), s => { if(s.exists()) setCompSet(s.data()); }));
    return () => u.forEach(f=>f());
  }, []);

  const pickImg = e => {
    const f=e.target.files[0]; if(!f)return;
    const r=new FileReader(); r.onload=ev=>setForm(x=>({...x,image:ev.target.result})); r.readAsDataURL(f);
  };

  const doLogin = () => {
    const u=USERS.find(u=>u.id===loginId);
    if(u&&pin===u.pin){setUser(u);setScreen("app");setView("home");setPinErr(false);}
    else{setPinErr(true);setPin("");}
  };

  const addTx = async () => {
    if(!form.amount||!form.date) return;
    if(!form.isPersonal&&!form.projectId) return;
    const p=projs.find(p=>p.id===form.projectId);
    await addDoc(collection(db,"transactions"),{
      userId:user.id, userName:user.name,
      projectId:form.projectId||"",
      projectName:p?`${p.name} - ${p.spec||p.specialization} - ${p.province}`:"",
      type:form.type, amount:Number(form.amount),
      currency:form.currency, note:form.note, date:form.date,
      image:form.image||null, isPersonal:form.isPersonal||false,
      createdAt:new Date().toISOString(),
    });
    setFormOK(true);
    setTimeout(()=>{setFormOK(false);setForm({type:"استلام",projectId:"",amount:"",currency:"دينار",note:"",date:today(),image:null,isPersonal:false});setView("home");},1500);
  };

  const saveOBs = async () => {
    for(const uid of Object.keys(OBform)){
      const d=OBform[uid];
      await setDoc(doc(db,"openingBalances",uid),{
        dinarReceived:Number(d.dinarReceived||0), dinarSpent:Number(d.dinarSpent||0),
        dollarReceived:Number(d.dollarReceived||0), dollarSpent:Number(d.dollarSpent||0),
        personalWithdraw:Number(d.personalWithdraw||0),
      });
    }
    setOBok(true); setTimeout(()=>setOBok(false),2000);
  };

  const saveComp = async () => {
    await setDoc(doc(db,"settings","company"),{
      capital:Number(compForm.capital||compSet.capital||0),
      note:compForm.note||compSet.note||"",
    });
    setCompOk(true); setTimeout(()=>setCompOk(false),2000);
  };

  const addProj = async () => {
    if(!newProj.name.trim())return;
    await addDoc(collection(db,"projects"),{name:newProj.name.trim(),specialization:newProj.spec,province:newProj.province,value:Number(newProj.value||0),currency:newProj.currency});
    setNewProj({name:"",spec:"مقاولات",province:"بغداد",value:"",currency:"دينار"});
  };

  const delProj = async id=>{ if(window.confirm("تحذف المشروع؟")) await deleteDoc(doc(db,"projects",id)); };
  const delTx   = async id=>{ if(window.confirm("تحذف المعاملة؟")) await deleteDoc(doc(db,"transactions",id)); };

  const bal = (list,ob,cur) => {
    const obR=cur==="دينار"?(ob?.dinarReceived||0):(ob?.dollarReceived||0);
    const obS=cur==="دينار"?(ob?.dinarSpent||0):(ob?.dollarSpent||0);
    const fl=list.filter(t=>t.currency===cur||(cur==="دينار"&&!t.currency));
    const r=fl.filter(t=>t.type==="استلام").reduce((s,t)=>s+t.amount,0)+obR;
    const s=fl.filter(t=>t.type==="صرف").reduce((s,t)=>s+t.amount,0)+obS;
    return{r,s,b:r-s};
  };

  const myTxs = txs.filter(t=>user&&t.userId===user.id);
  const myOB  = OBs[user?.id]||{};
  const dinSt = bal(myTxs,myOB,"دينار");
  const dolSt = bal(myTxs,myOB,"دولار");

  const workerBals = WORKERS.map(u=>{
    const list=txs.filter(t=>t.userId===u.id);
    const ob=OBs[u.id]||{};
    return{...u,din:bal(list,ob,"دينار"),dol:bal(list,ob,"دولار"),cnt:list.length};
  });

  const compRep = () => {
    const cap=compSet.capital||0;
    const pReps=PARTNERS.map(p=>{
      const list=txs.filter(t=>t.userId===p.id);
      const pw=list.filter(t=>t.type==="صرف"&&t.isPersonal).reduce((s,t)=>s+t.amount,0)+(OBs[p.id]?.personalWithdraw||0);
      const share=cap*p.share/100;
      return{...p,share:p.share,shareAmt:share,withdrawn:pw,remaining:share-pw};
    });
    const totalW=pReps.reduce((s,p)=>s+p.withdrawn,0);
    return{cap,pReps,totalW,net:cap-totalW};
  };

  const stTxs = stUser ? txs.filter(t=>{
    if(t.userId!==stUser)return false;
    if(t.currency!==fuCur&&!(fuCur==="دينار"&&!t.currency))return false;
    if(fuProj!=="all"&&t.projectId!==fuProj)return false;
    if(fuFrom&&t.date<fuFrom)return false;
    if(fuTo&&t.date>fuTo)return false;
    return true;
  }) : [];
  const stOB  = OBs[stUser]||{};
  const obR   = (!fuFrom&&fuProj==="all")?(fuCur==="دينار"?(stOB.dinarReceived||0):(stOB.dollarReceived||0)):0;
  const obS   = (!fuFrom&&fuProj==="all")?(fuCur==="دينار"?(stOB.dinarSpent||0):(stOB.dollarSpent||0)):0;
  const stR   = stTxs.filter(t=>t.type==="استلام").reduce((s,t)=>s+t.amount,0)+obR;
  const stS   = stTxs.filter(t=>t.type==="صرف").reduce((s,t)=>s+t.amount,0)+obS;
  const stB   = stR-stS;

  const allTxs = txs.filter(t=>{
    if(fuUser!=="all"&&t.userId!==fuUser)return false;
    if(fuProj!=="all"&&t.projectId!==fuProj)return false;
    if(fuFrom&&t.date<fuFrom)return false;
    if(fuTo&&t.date>fuTo)return false;
    return true;
  });

  const projRep = (p,from,to) => {
    if(!p)return null;
    const pt=txs.filter(t=>t.projectId===p.id&&t.type==="صرف"&&(!from||t.date>=from)&&(!to||t.date<=to));
    const total=pt.reduce((s,t)=>s+t.amount,0);
    const byEmp=WORKERS.map(u=>{const ut=pt.filter(t=>t.userId===u.id);return{...u,spent:ut.reduce((s,t)=>s+t.amount,0),cnt:ut.length};}).filter(u=>u.spent>0);
    return{p,pt,total,rem:(p.value||0)-total,byEmp};
  };
  const pr = selProj?projRep(selProj,pfFrom,pfTo):null;

  const navMgr = [
    {icon:"📊",label:"الملخص",v:"home"},
    {icon:"📋",label:"المعاملات",v:"allTx"},
    {icon:"🏗️",label:"المشاريع",v:"projects"},
    {icon:"💰",label:"المشاريع",v:"projReport"},
    {icon:"🏢",label:"الشركة",v:"company"},
    {icon:"⚖️",label:"افتتاحي",v:"opening"},
  ];
  const navWorker = [{icon:"🏠",label:"الرئيسية",v:"home"},{icon:"➕",label:"تسجيل",v:"add"}];
  const navItems  = user?.role==="manager" ? navMgr : navWorker;

  const avatarClass = r => r==="manager"?"manager":r==="partner"?"partner":"employee";

  // PDF exports
  const pdfPerson = () => {
    const stUserObj=USERS.find(u=>u.id===stUser);
    const pName=fuProj!=="all"?((p=projs.find(p=>p.id===fuProj))=>p?`${p.name} - ${p.specialization} - ${p.province}`:"")():"كل المشاريع";
    const obRow=(obR||obS)?`<tr style="background:#fff8e1"><td>قبل النظام</td><td>-</td><td>رصيد افتتاحي</td><td>${toAr(obR.toLocaleString("ar-IQ"))}</td><td>${toAr(obS.toLocaleString("ar-IQ"))}</td><td>-</td></tr>`:"";
    const rows=stTxs.map(t=>`<tr><td>${t.date}</td><td>${t.projectName||"-"}</td><td style="color:${t.type==='استلام'?'green':'red'}">${t.type}${t.isPersonal?" (شخصي)":""}</td><td>${t.type==='استلام'?toAr(Number(t.amount).toLocaleString("ar-IQ")):'-'}</td><td>${t.type==='صرف'?toAr(Number(t.amount).toLocaleString("ar-IQ")):'-'}</td><td>${t.note||"-"}</td></tr>`).join("");
    const html=`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/><title>كشف حساب - ${stUserObj?.name}</title><style>body{font-family:Tahoma,sans-serif;padding:30px;direction:rtl}h1{color:#1d4ed8;font-size:20px}.info{font-size:13px;color:#555;margin:8px 0 20px}.sum{display:flex;gap:12px;margin-bottom:24px}.box{border:1px solid #ddd;border-radius:8px;padding:12px;flex:1;text-align:center}.lbl{font-size:11px;color:#888}.val{font-size:16px;font-weight:bold;margin-top:4px}.g{color:green}.r{color:red}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#1d4ed8;color:#fff;padding:8px}td{padding:7px 8px;border-bottom:1px solid #eee;text-align:center}tr:nth-child(even){background:#f9f9f9}.footer{margin-top:24px;font-size:11px;color:#aaa;text-align:center}</style></head><body><h1>كشف حساب - ${stUserObj?.name}</h1><div class="info">العملة: ${fuCur} | المشروع: ${pName} | من: ${fuFrom||"البداية"} | إلى: ${fuTo||"الآن"}</div><div class="sum"><div class="box"><div class="lbl">إجمالي الاستلام</div><div class="val g">${fmt(stR,fuCur)}</div></div><div class="box"><div class="lbl">إجمالي الصرف</div><div class="val r">${fmt(stS,fuCur)}</div></div><div class="box"><div class="lbl">الرصيد</div><div class="val ${stB>=0?'g':'r'}">${fmt(Math.abs(stB),fuCur)} ${stB>=0?'متبقي':'عليه'}</div></div></div><table><thead><tr><th>التاريخ</th><th>المشروع</th><th>النوع</th><th>استلام</th><th>صرف</th><th>ملاحظات</th></tr></thead><tbody>${obRow}${rows}</tbody></table><div class="footer">نظام حساب - ${new Date().toLocaleDateString("ar-IQ")}</div></body></html>`;
    const w=window.open("","_blank");w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
  };

  const pdfComp = () => {
    const rep=compRep();
    const rows=rep.pReps.map(p=>`<tr><td>${p.name}</td><td>${toAr(p.share)}%</td><td>${fmtD(p.shareAmt)}</td><td style="color:red">${fmtD(p.withdrawn)}</td><td style="color:${p.remaining>=0?'green':'red'}">${fmtD(Math.abs(p.remaining))} ${p.remaining>=0?'متبقي':'تجاوز'}</td></tr>`).join("");
    const html=`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/><title>الكشف المالي للشركة</title><style>body{font-family:Tahoma,sans-serif;padding:30px;direction:rtl}h1{color:#1d4ed8;font-size:22px}h2{font-size:16px;margin-top:24px}.sum{display:flex;gap:12px;margin-bottom:20px}.box{border:1px solid #ddd;border-radius:8px;padding:12px;flex:1;text-align:center}.lbl{font-size:11px;color:#888}.val{font-size:16px;font-weight:bold;margin-top:4px}.g{color:green}.r{color:red}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#1d4ed8;color:#fff;padding:10px}td{padding:9px;border-bottom:1px solid #eee;text-align:center}tr:nth-child(even){background:#f9f9f9}.footer{margin-top:24px;font-size:11px;color:#aaa;text-align:center}</style></head><body><h1>الكشف المالي للشركة</h1><div class="sum"><div class="box"><div class="lbl">رأس المال</div><div class="val">${fmtD(rep.cap)}</div></div><div class="box"><div class="lbl">السحوبات</div><div class="val r">${fmtD(rep.totalW)}</div></div><div class="box"><div class="lbl">صافي رأس المال</div><div class="val g">${fmtD(rep.net)}</div></div></div><h2>حصص الشركاء</h2><table><thead><tr><th>الشريك</th><th>الحصة</th><th>المبلغ</th><th>السحوبات</th><th>المتبقي</th></tr></thead><tbody>${rows}</tbody></table><div class="footer">نظام حساب - ${new Date().toLocaleDateString("ar-IQ")}</div></body></html>`;
    const w=window.open("","_blank");w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
  };

  const pdfProj = () => {
    if(!pr)return;
    const pct=pr.p.value?Math.min(100,Math.round(pr.total/pr.p.value*100)):0;
    const eRows=pr.byEmp.map(e=>`<tr><td>${e.name}</td><td>${fmtD(e.spent)}</td><td>${toAr(e.cnt)} معاملة</td><td>${pr.p.value?toAr(Math.round(e.spent/pr.p.value*100))+"%":"-"}</td></tr>`).join("");
    const tRows=pr.pt.map(t=>`<tr><td>${t.date}</td><td>${t.userName}</td><td>${fmtD(t.amount)}</td><td>${t.note||"-"}</td></tr>`).join("");
    const html=`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/><title>كشف ${pr.p.name}</title><style>body{font-family:Tahoma,sans-serif;padding:30px;direction:rtl}h1{color:#1d4ed8;font-size:20px}h2{font-size:15px;margin-top:20px}.sum{display:flex;gap:12px;margin-bottom:20px}.box{border:1px solid #ddd;border-radius:8px;padding:12px;flex:1;text-align:center}.lbl{font-size:11px;color:#888}.val{font-size:15px;font-weight:bold;margin-top:4px}.g{color:green}.r{color:red}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#1d4ed8;color:#fff;padding:8px}td{padding:7px;border-bottom:1px solid #eee;text-align:center}tr:nth-child(even){background:#f9f9f9}.footer{margin-top:24px;font-size:11px;color:#aaa;text-align:center}</style></head><body><h1>الكشف المالي - ${pr.p.name}</h1><p>${pr.p.specialization} · ${pr.p.province}${pfFrom?` | من: ${pfFrom}`:""}${pfTo?` | إلى: ${pfTo}`:""}</p><div class="sum"><div class="box"><div class="lbl">قيمة المشروع</div><div class="val">${fmtD(pr.p.value)}</div></div><div class="box"><div class="lbl">المصروف</div><div class="val r">${fmtD(pr.total)}</div></div><div class="box"><div class="lbl">المتبقي</div><div class="val ${pr.rem>=0?'g':'r'}">${fmtD(Math.abs(pr.rem))}</div></div><div class="box"><div class="lbl">نسبة الصرف</div><div class="val">${toAr(pct)}%</div></div></div><h2>تفصيل الموظفين</h2><table><thead><tr><th>الموظف</th><th>المصروف</th><th>المعاملات</th><th>النسبة</th></tr></thead><tbody>${eRows}</tbody></table><h2>تفاصيل المعاملات</h2><table><thead><tr><th>التاريخ</th><th>الموظف</th><th>المبلغ</th><th>ملاحظات</th></tr></thead><tbody>${tRows}</tbody></table><div class="footer">نظام حساب - ${new Date().toLocaleDateString("ar-IQ")}</div></body></html>`;
    const w=window.open("","_blank");w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
  };

  // ─── LOGIN ───────────────────────────────────────────────────────────────
  if(screen==="login") return (
    <div className="login-page">
      <div className="app-bg"/>
      <div className={`login-box ${D?"desktop":""}`}>
        <div className="login-logo">
          <div className="login-logo-text">حساب</div>
          <div className="login-logo-sub">نظام المصروفيات والشركاء</div>
        </div>

        {!loginId ? (
          <>
            <div className="login-section-label">اختر حسابك</div>
            <div className={`user-grid ${D?"desktop":""}`}>
              {USERS.map(u=>(
                <button key={u.id} className={`user-btn ${u.role}`} onClick={()=>{setLoginId(u.id);setPin("");setPinErr(false);}}>
                  <div className={`avatar lg ${avatarClass(u.role)}`} style={{margin:"0 auto 10px"}}>{u.name[0]}</div>
                  <div className="user-btn-name">{u.name}</div>
                  <div className="user-btn-role">{u.role==="manager"?"مدير مالي":u.role==="partner"?`شريك ${toAr(u.share)}%`:"موظف"}</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="selected-user-card">
              <div className={`avatar ${avatarClass(USERS.find(u=>u.id===loginId)?.role)}`}>{USERS.find(u=>u.id===loginId)?.name[0]}</div>
              <div>
                <div className="selected-user-name">{USERS.find(u=>u.id===loginId)?.name}</div>
                <div className="selected-user-role">{USERS.find(u=>u.id===loginId)?.role==="manager"?"مدير مالي":USERS.find(u=>u.id===loginId)?.role==="partner"?`شريك ${toAr(USERS.find(u=>u.id===loginId)?.share||0)}%`:"موظف"}</div>
              </div>
            </div>
            <div className="login-section-label">أدخل الرمز السري</div>
            <div className="pin-dots">
              {[0,1,2,3].map(i=><div key={i} className={`pin-dot ${pin.length>i?"filled":""}`}/>)}
            </div>
            {pinErr && <div className="pin-error">رمز خاطئ، حاول مرة ثانية</div>}
            <div className={`numpad ${D?"desktop":""}`}>
              {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k,i)=>(
                <button key={i} className={`numpad-btn ${k===""?"empty":""}`} onClick={()=>{if(!k)return;if(k==="⌫"){setPin(p=>p.slice(0,-1));setPinErr(false);}else if(pin.length<4)setPin(p=>p+k);}}>{k}</button>
              ))}
            </div>
            <button className="login-btn" onClick={doLogin}>دخول</button>
            {!urlUser&&<button className="back-btn" onClick={()=>{setLoginId(null);setPin("");}}>← رجوع</button>}
          </>
        )}
      </div>
    </div>
  );

  // ─── APP ─────────────────────────────────────────────────────────────────
  const CR = compRep();
  const myShare = CR.pReps.find(p=>p.id===user?.id);

  return (
    <div className={`app-wrapper ${D?"desktop":""}`}>
      <div className="app-bg"/>

      {viewImg && <div className="img-overlay" onClick={()=>setViewImg(null)}><img src={viewImg} className="img-full" alt="وصل"/></div>}

      {/* HEADER */}
      <div className={`app-header ${D?"desktop":""}`}>
        <div className="header-user">
          <div className={`avatar sm ${avatarClass(user.role)}`}>{user.name[0]}</div>
          <div>
            <div className="header-name">{user.name}</div>
            <div className="header-role">{user.role==="manager"?"مدير مالي":user.role==="partner"?`شريك ${toAr(user.share||0)}%`:"موظف"}</div>
          </div>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={()=>setManLayout(D?"mobile":"desktop")} title="تبديل العرض">{D?"📱":"🖥️"}</button>
          <button className="logout-btn" onClick={()=>{setUser(null);setScreen("login");setPin("");setView("home");}}>تسجيل خروج</button>
        </div>
      </div>

      {D ? (
        <div className="desktop-body">
          {/* SIDEBAR */}
          <div className="sidebar">
            <div className="sidebar-label">القائمة</div>
            {navItems.map(n=>(
              <button key={n.v} className={`sidebar-btn ${view===n.v?"active":""}`} onClick={()=>setView(n.v)}>
                <div className="sidebar-icon">{n.icon}</div>
                <span>{n.label}</span>
              </button>
            ))}
            {user.role==="manager"&&view==="statement"&&(
              <button className="sidebar-btn active">
                <div className="sidebar-icon">📄</div>
                <span>كشف: {USERS.find(u=>u.id===stUser)?.name}</span>
              </button>
            )}
          </div>
          <div className="main-content">{renderContent()}</div>
        </div>
      ) : (
        <>
          <div className="mobile-content">{renderContent()}</div>
          <div className="bottom-nav">
            {navItems.map(n=>(
              <button key={n.v} className={`nav-btn ${view===n.v?"active":""}`} onClick={()=>setView(n.v)}>
                <div className="nav-icon-wrap">{n.icon}</div>
                <div className="nav-label">{n.label}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  function renderContent() {
    if(loading) return <div className="loading-state">⏳ جاري التحميل...</div>;

    // ── WORKER HOME ──
    if(user.role!=="manager"&&view==="home") return (
      <div>
        {user.role==="partner"&&myShare&&(
          <div className="bal-card" style={{background:"linear-gradient(135deg,#4c1d95,#7c3aed)",marginBottom:12}}>
            <div className="bal-label">🏢 حصتك في الشركة ({toAr(user.share)}%)</div>
            <div className="bal-amount">{fmtD(myShare.shareAmt)}</div>
            <div className="bal-row" style={{marginBottom:8}}>
              <span className="bal-stat">رأس المال: {fmtD(CR.cap)}</span>
              <span className="bal-stat">سحبت: {fmtD(myShare.withdrawn)}</span>
            </div>
            <div style={{fontSize:15,fontWeight:800,color:"#c4b5fd"}}>المتبقي لك: {fmtD(Math.max(0,myShare.remaining))}</div>
          </div>
        )}
        <div className={D?"cards-row":""}>
          <BalCard label="🇮🇶 دينار عراقي" stats={dinSt} cur="دينار" color="#065f46,#047857"/>
          <BalCard label="🇺🇸 دولار أمريكي" stats={dolSt} cur="دولار" color="#1e40af,#2563eb"/>
        </div>
        {!D&&<button className="action-btn gold" onClick={()=>{setView("add");setForm({type:"استلام",projectId:"",amount:"",currency:"دينار",note:"",date:today(),image:null,isPersonal:false});}}>➕ تسجيل معاملة جديدة</button>}
        <div className="section-title">سجل المعاملات</div>
        {myTxs.length===0?<div className="empty-state">ما عندك معاملات بعد</div>:(
          <div className={D?"tx-grid":""}>{myTxs.map(t=><TxCard key={t.id} t={t} onImg={setViewImg}/>)}</div>
        )}
      </div>
    );

    // ── ADD TX ──
    if(user.role!=="manager"&&view==="add") return (
      <div style={D?{maxWidth:620}:{}}>
        <div className="section-title">تسجيل معاملة جديدة</div>
        {formOK?(
          <div className="success-box"><div className="success-icon">✅</div><div className="success-text">تم التسجيل بنجاح!</div></div>
        ):(
          <div className="form-card">
            <div className="field-label">نوع المعاملة</div>
            <div className="toggle-row">
              <button className={`toggle-btn ${form.type==="استلام"?"green":""}`} onClick={()=>setForm(f=>({...f,type:"استلام",isPersonal:false}))}>↓ استلام</button>
              <button className={`toggle-btn ${form.type==="صرف"?"red":""}`} onClick={()=>setForm(f=>({...f,type:"صرف"}))}>↑ صرف</button>
            </div>

            {user.role==="partner"&&form.type==="صرف"&&(
              <>
                <div className="field-label">نوع الصرف</div>
                <div className="toggle-row">
                  <button className={`toggle-btn ${!form.isPersonal?"red":""}`} onClick={()=>setForm(f=>({...f,isPersonal:false}))}>🏗️ تشغيلي</button>
                  <button className={`toggle-btn ${form.isPersonal?"purple":""}`} onClick={()=>setForm(f=>({...f,isPersonal:true}))}>👤 شخصي</button>
                </div>
                {form.isPersonal&&<div className="personal-note">⚠️ هذا المبلغ سينقص من حصتك في الشركة</div>}
              </>
            )}

            <div className="field-label">العملة</div>
            <div className="toggle-row">
              <button className={`toggle-btn ${form.currency==="دينار"?"blue":""}`} onClick={()=>setForm(f=>({...f,currency:"دينار"}))}>🇮🇶 دينار</button>
              <button className={`toggle-btn ${form.currency==="دولار"?"blue":""}`} onClick={()=>setForm(f=>({...f,currency:"دولار"}))}>🇺🇸 دولار</button>
            </div>

            {!form.isPersonal&&(
              <>
                <div className="field-label">المشروع</div>
                <select className="form-select" value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))}>
                  <option value="">اختر المشروع</option>
                  {projs.map(p=><option key={p.id} value={p.id}>{p.name} - {p.specialization||p.spec} - {p.province}</option>)}
                </select>
              </>
            )}

            <div className={D?"row-layout":""}>
              <div>
                <div className="field-label">المبلغ</div>
                <input className="form-input" type="number" placeholder="٠" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/>
              </div>
              <div>
                <div className="field-label">التاريخ</div>
                <input className="form-input" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
              </div>
            </div>

            <div className="field-label">ملاحظات</div>
            <textarea className="form-textarea" placeholder="اكتب تفاصيل..." value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={2}/>

            {!form.isPersonal&&(
              <>
                <div className="field-label">صورة الوصل (اختياري)</div>
                <input ref={imgRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={pickImg}/>
                <button className="img-upload-btn" onClick={()=>imgRef.current.click()}>{form.image?"✅ تم اختيار الصورة":"📷 التقط أو اختر صورة"}</button>
                {form.image&&<img src={form.image} className="img-preview" alt="preview" onClick={()=>setViewImg(form.image)}/>}
              </>
            )}

            <button className="submit-btn" style={form.isPersonal?{background:"linear-gradient(135deg,#7c3aed,#5b21b6)",color:"#fff"}:{}} onClick={addTx}>حفظ المعاملة</button>
            <button className="cancel-btn" onClick={()=>setView("home")}>إلغاء</button>
          </div>
        )}
      </div>
    );

    // ── MANAGER HOME ──
    if(user.role==="manager"&&view==="home") return (
      <div>
        <div className="bal-card" style={{background:"linear-gradient(135deg,#1e3a5f,#1e6fff)",marginBottom:20}}>
          <div className="bal-label">🏢 رأس المال الكلي للشركة</div>
          <div className="bal-amount">{fmtD(CR.cap)}</div>
          <div className="bal-row">
            <span className="bal-stat">↑ إجمالي السحوبات: {fmtD(CR.totalW)}</span>
            <span className="bal-stat">صافي: {fmtD(CR.net)}</span>
          </div>
        </div>

        <div className="section-title">حسابات الأشخاص</div>
        <div className={D?"emp-grid":""}>
          {workerBals.map(e=>(
            <button key={e.id} className={`emp-card ${e.role==="partner"?"partner":""}`}
              onClick={()=>{setStUser(e.id);setFuFrom("");setFuTo("");setFuProj("all");setFuCur("دينار");setView("statement");}}>
              <div className="emp-top">
                <div className={`avatar ${avatarClass(e.role)}`}>{e.name[0]}</div>
                <div style={{flex:1}}>
                  <div className="emp-name">{e.name}</div>
                  <div className="emp-sub">{e.role==="partner"?`شريك ${toAr(e.share||0)}%`:"موظف"} · {toAr(e.cnt)} معاملة</div>
                </div>
                <div style={{textAlign:"center",marginLeft:8}}>
                  <div className="emp-bal-dinar">{fmt(Math.abs(e.din.b),"دينار")}</div>
                  <div className="emp-bal-dollar">{fmt(Math.abs(e.dol.b),"دولار")}</div>
                </div>
                <div className="emp-arrow">←</div>
              </div>
            </button>
          ))}
        </div>

        {!D&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
            <button className="action-btn blue" onClick={()=>setView("allTx")}>📋 المعاملات</button>
            <button className="action-btn green" onClick={()=>setView("projects")}>🏗️ المشاريع</button>
            <button className="action-btn amber" onClick={()=>setView("projReport")}>💰 كشف المشاريع</button>
            <button className="action-btn purple" onClick={()=>setView("company")}>🏢 كشف الشركة</button>
            <button className="action-btn dark" style={{gridColumn:"1/-1"}} onClick={()=>setView("opening")}>⚖️ الأرصدة الافتتاحية</button>
          </div>
        )}
      </div>
    );

    // ── STATEMENT ──
    if(user.role==="manager"&&view==="statement") return (
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          {!D&&<button className="back-icon-btn" onClick={()=>setView("home")}>←</button>}
          <div className="section-title" style={{margin:0}}>كشف حساب — {USERS.find(u=>u.id===stUser)?.name}</div>
        </div>
        <div className={D?"statement-layout":""}>
          <div className={D?"statement-filters":""}>
            <div className="filter-card">
              <div className="field-label">العملة</div>
              <div className="toggle-row">
                <button className={`toggle-btn ${fuCur==="دينار"?"blue":""}`} onClick={()=>setFuCur("دينار")}>🇮🇶 دينار</button>
                <button className={`toggle-btn ${fuCur==="دولار"?"blue":""}`} onClick={()=>setFuCur("دولار")}>🇺🇸 دولار</button>
              </div>
              <div className="field-label">المشروع</div>
              <select className="form-select" value={fuProj} onChange={e=>setFuProj(e.target.value)}>
                <option value="all">كل المشاريع</option>
                {projs.map(p=><option key={p.id} value={p.id}>{p.name} - {p.specialization||p.spec} - {p.province}</option>)}
              </select>
              <div className="field-label">من تاريخ</div>
              <input className="form-input" type="date" value={fuFrom} onChange={e=>setFuFrom(e.target.value)}/>
              <div className="field-label">إلى تاريخ</div>
              <input className="form-input" type="date" value={fuTo} onChange={e=>setFuTo(e.target.value)}/>
              <button className="submit-btn" style={{background:"linear-gradient(135deg,#1e6fff,#1455cc)",color:"#fff"}} onClick={pdfPerson}>📄 تصدير PDF</button>
            </div>
          </div>
          <div className={D?"statement-content":""}>
            <div className="bal-card" style={{background:stB>=0?"linear-gradient(135deg,#065f46,#047857)":"linear-gradient(135deg,#7f1d1d,#991b1b)",marginBottom:16}}>
              <div className="bal-label">الرصيد — {fuCur}</div>
              <div className="bal-amount">{fmt(Math.abs(stB),fuCur)}</div>
              <div className="bal-sub">{stB>=0?"متبقي معه":"عليه"}</div>
              <div className="bal-row"><span className="bal-stat">↓ استلم {fmt(stR,fuCur)}</span><span className="bal-stat">↑ صرف {fmt(stS,fuCur)}</span></div>
            </div>
            {stTxs.length===0?<div className="empty-state">ما في معاملات</div>:(
              <div className={D?"tx-grid":""}>{stTxs.map(t=><TxCard key={t.id} t={t} onDelete={()=>delTx(t.id)} onImg={setViewImg}/>)}</div>
            )}
            {!D&&<button className="cancel-btn" onClick={()=>setView("home")}>← رجوع</button>}
          </div>
        </div>
      </div>
    );

    // ── ALL TX ──
    if(user.role==="manager"&&view==="allTx") return (
      <div>
        <div className="section-title">كل المعاملات</div>
        <div className={D?"filter-row":""}>
          <div className="filter-card">
            <div className="field-label">الشخص</div>
            <select className="form-select" value={fuUser} onChange={e=>setFuUser(e.target.value)}>
              <option value="all">الكل</option>
              {WORKERS.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <div className="field-label">المشروع</div>
            <select className="form-select" value={fuProj} onChange={e=>setFuProj(e.target.value)}>
              <option value="all">الكل</option>
              {projs.map(p=><option key={p.id} value={p.id}>{p.name} - {p.specialization||p.spec} - {p.province}</option>)}
            </select>
            <div className="field-label">من تاريخ</div>
            <input className="form-input" type="date" value={fuFrom} onChange={e=>setFuFrom(e.target.value)}/>
            <div className="field-label">إلى تاريخ</div>
            <input className="form-input" type="date" value={fuTo} onChange={e=>setFuTo(e.target.value)}/>
          </div>
          <div className={D?"filter-results":""}>
            <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:12}}>{toAr(allTxs.length)} معاملة</div>
            {allTxs.length===0?<div className="empty-state">ما في نتائج</div>:(
              <div className={D?"tx-grid":""}>{allTxs.map(t=><TxCard key={t.id} t={t} showUser onDelete={()=>delTx(t.id)} onImg={setViewImg}/>)}</div>
            )}
            {!D&&<button className="cancel-btn" onClick={()=>setView("home")}>← رجوع</button>}
          </div>
        </div>
      </div>
    );

    // ── PROJECTS ──
    if(user.role==="manager"&&view==="projects") return (
      <div style={D?{maxWidth:720}:{}}>
        <div className="section-title">إدارة المشاريع</div>
        <div className="form-card">
          <div className="field-label">اسم المشروع</div>
          <input className="form-input" placeholder="مثال: برج الأمل" value={newProj.name} onChange={e=>setNewProj(p=>({...p,name:e.target.value}))}/>
          <div className="field-label">التخصص</div>
          <div className="spec-btns">{SPECS.map(s=><button key={s} className={`spec-btn ${newProj.spec===s?"active":""}`} onClick={()=>setNewProj(p=>({...p,spec:s}))}>{s}</button>)}</div>
          <div className="field-label">المحافظة</div>
          <select className="form-select" value={newProj.province} onChange={e=>setNewProj(p=>({...p,province:e.target.value}))}>{PROVINCES.map(pr=><option key={pr} value={pr}>{pr}</option>)}</select>
          <div className={D?"row-layout":""}>
            <div>
              <div className="field-label">قيمة المشروع</div>
              <input className="form-input" type="number" placeholder="٠" value={newProj.value} onChange={e=>setNewProj(p=>({...p,value:e.target.value}))}/>
            </div>
            <div>
              <div className="field-label">عملة المشروع</div>
              <div className="toggle-row">
                <button className={`toggle-btn ${newProj.currency==="دينار"?"blue":""}`} onClick={()=>setNewProj(p=>({...p,currency:"دينار"}))}>🇮🇶 دينار</button>
                <button className={`toggle-btn ${newProj.currency==="دولار"?"blue":""}`} onClick={()=>setNewProj(p=>({...p,currency:"دولار"}))}>🇺🇸 دولار</button>
              </div>
            </div>
          </div>
          <button className="submit-btn" onClick={addProj}>+ إضافة المشروع</button>
        </div>
        <div style={{height:20}}/>
        <div className={D?"tx-grid":""}>
          {projs.map(p=>(
            <div key={p.id} className="proj-card">
              <div>
                <div className="proj-name">🏗️ {p.name}</div>
                <div className="proj-meta">{p.specialization||p.spec} · {p.province}</div>
                {p.value>0&&<div className="proj-value">قيمة المشروع: {fmtD(p.value)}</div>}
              </div>
              <button className="delete-btn" onClick={()=>delProj(p.id)}>🗑️ حذف</button>
            </div>
          ))}
        </div>
        {!D&&<button className="cancel-btn" onClick={()=>setView("home")}>← رجوع</button>}
      </div>
    );

    // ── PROJECT REPORT ──
    if(user.role==="manager"&&view==="projReport") return (
      <div>
        <div className="section-title">💰 الكشف المالي للمشاريع</div>
        {!selProj ? (
          <div className={D?"tx-grid":""}>
            {projs.map(p=>{
              const r=projRep(p,"","");
              const pct=p.value?Math.min(100,Math.round(r.total/p.value*100)):0;
              return(
                <button key={p.id} className="proj-report-card" onClick={()=>{setSelProj(p);setPfFrom("");setPfTo("");}}>
                  <div className="proj-name">{p.name}</div>
                  <div className="proj-meta" style={{marginBottom:10}}>{p.specialization||p.spec} · {p.province}</div>
                  {p.value>0&&<>
                    <div className="progress-bar"><div className="progress-fill" style={{width:`${pct}%`}}/></div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginTop:8}}>
                      <span style={{color:"#f87171"}}>صُرف: {fmtD(r.total)}</span>
                      <span style={{color:"#34d399"}}>باقي: {fmtD(p.value-r.total)}</span>
                    </div>
                  </>}
                </button>
              );
            })}
          </div>
        ) : (
          <div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <button className="back-icon-btn" onClick={()=>setSelProj(null)}>←</button>
              <div style={{fontWeight:800,fontSize:16,fontFamily:"'Cairo',sans-serif"}}>{selProj.name} · {selProj.specialization||selProj.spec} · {selProj.province}</div>
            </div>
            <div className={D?"statement-layout":""}>
              <div className={D?"statement-filters":""}>
                <div className="filter-card">
                  <div className="field-label">من تاريخ</div>
                  <input className="form-input" type="date" value={pfFrom} onChange={e=>setPfFrom(e.target.value)}/>
                  <div className="field-label">إلى تاريخ</div>
                  <input className="form-input" type="date" value={pfTo} onChange={e=>setPfTo(e.target.value)}/>
                  <button className="submit-btn" style={{background:"linear-gradient(135deg,#b45309,#92400e)",color:"#fff"}} onClick={pdfProj}>📄 تصدير PDF</button>
                </div>
              </div>
              <div className={D?"statement-content":""}>
                {pr&&<>
                  <div className={`mini-cards ${D?"desktop":""}`}>
                    <div className="mini-card" style={{background:"linear-gradient(135deg,#1d4ed8,#2563eb)"}}><div className="mini-label">قيمة المشروع</div><div className="mini-val">{fmtD(selProj.value)}</div></div>
                    <div className="mini-card" style={{background:"linear-gradient(135deg,#7f1d1d,#991b1b)"}}><div className="mini-label">إجمالي المصروف</div><div className="mini-val">{fmtD(pr.total)}</div></div>
                    <div className="mini-card" style={{background:pr.rem>=0?"linear-gradient(135deg,#065f46,#047857)":"linear-gradient(135deg,#7f1d1d,#991b1b)"}}><div className="mini-label">{pr.rem>=0?"المتبقي":"تجاوز"}</div><div className="mini-val">{fmtD(Math.abs(pr.rem))}</div></div>
                    <div className="mini-card" style={{background:"linear-gradient(135deg,#b45309,#92400e)"}}><div className="mini-label">نسبة الصرف</div><div className="mini-val">{selProj.value?toAr(Math.min(100,Math.round(pr.total/selProj.value*100)))+"%":"—"}</div></div>
                  </div>
                  {selProj.value>0&&<div className="progress-bar" style={{marginBottom:20}}><div className="progress-fill" style={{width:`${Math.min(100,Math.round(pr.total/selProj.value*100))}%`}}/></div>}
                  <div className="section-title" style={{fontSize:16}}>تفصيل المصروفات بالموظفين</div>
                  {pr.byEmp.length===0?<div className="empty-state">ما في مصروفات</div>:pr.byEmp.map(e=>(
                    <div key={e.id} className="tx-card" style={{marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div className={`avatar sm ${avatarClass(e.role)}`}>{e.name[0]}</div>
                        <div style={{flex:1}}>
                          <div style={{fontFamily:"'Cairo',sans-serif",fontWeight:700,fontSize:15}}>{e.name}</div>
                          <div style={{fontSize:11,color:"var(--text-dim)"}}>{toAr(e.cnt)} معاملة</div>
                        </div>
                        <div style={{textAlign:"left"}}>
                          <div style={{fontSize:16,fontWeight:900,color:"#f87171",fontFamily:"'Cairo',sans-serif"}}>{fmtD(e.spent)}</div>
                          {selProj.value>0&&<div style={{fontSize:11,color:"var(--text-muted)"}}>{toAr(Math.round(e.spent/selProj.value*100))}%</div>}
                        </div>
                      </div>
                      <div className="progress-bar" style={{marginTop:10,height:6}}><div className="progress-fill red" style={{width:`${selProj.value?Math.min(100,Math.round(e.spent/selProj.value*100)):0}%`}}/></div>
                    </div>
                  ))}
                  <div className="section-title" style={{fontSize:16,marginTop:24}}>تفاصيل المعاملات</div>
                  <div className={D?"tx-grid":""}>{pr.pt.map(t=><TxCard key={t.id} t={t} showUser onDelete={()=>delTx(t.id)} onImg={setViewImg}/>)}</div>
                </>}
              </div>
            </div>
          </div>
        )}
      </div>
    );

    // ── COMPANY ──
    if(user.role==="manager"&&view==="company") return (
      <div>
        <div className="section-title">🏢 الكشف المالي للشركة</div>
        <div className="filter-card">
          <div className="field-label">رأس المال الكلي (دينار)</div>
          <input className="form-input" type="number" placeholder={fmtD(compSet.capital||0)} value={compForm.capital??""} onChange={e=>setCompForm(f=>({...f,capital:e.target.value}))}/>
          <div className="field-label">ملاحظة</div>
          <input className="form-input" placeholder="مثال: رأس المال حتى يناير 2026" value={compForm.note??compSet.note??""} onChange={e=>setCompForm(f=>({...f,note:e.target.value}))}/>
          {compOk&&<div style={{color:"#34d399",fontSize:13,marginTop:8,fontWeight:600}}>✅ تم الحفظ</div>}
          <button className="submit-btn" style={{background:"linear-gradient(135deg,#1e6fff,#1455cc)",color:"#fff"}} onClick={saveComp}>💾 حفظ رأس المال</button>
        </div>

        <div className={`mini-cards ${D?"desktop":""}`} style={{marginBottom:20}}>
          <div className="mini-card" style={{background:"linear-gradient(135deg,#1e3a5f,#1d4ed8)"}}><div className="mini-label">💼 رأس المال الكلي</div><div className="mini-val">{fmtD(CR.cap)}</div></div>
          <div className="mini-card" style={{background:"linear-gradient(135deg,#7f1d1d,#991b1b)"}}><div className="mini-label">↑ إجمالي السحوبات</div><div className="mini-val">{fmtD(CR.totalW)}</div></div>
          <div className="mini-card" style={{background:"linear-gradient(135deg,#065f46,#047857)"}}><div className="mini-label">💰 صافي رأس المال</div><div className="mini-val">{fmtD(CR.net)}</div></div>
        </div>

        <div className="section-title" style={{fontSize:17}}>حصص الشركاء</div>
        <div className={D?"emp-grid":""}>
          {CR.pReps.map(p=>(
            <div key={p.id} className="partner-card">
              <div className="partner-header">
                <div className="avatar partner">{p.name[0]}</div>
                <div>
                  <div className="partner-name">{p.name}</div>
                  <div className="partner-share">شريك بنسبة {toAr(p.share)}%</div>
                </div>
              </div>
              <div className="partner-stats">
                <div className="partner-stat">
                  <div className="partner-stat-label">حصة رأس المال</div>
                  <div className="partner-stat-val" style={{color:"#60a5fa"}}>{fmtD(p.shareAmt)}</div>
                </div>
                <div className="partner-stat">
                  <div className="partner-stat-label">إجمالي السحوبات</div>
                  <div className="partner-stat-val" style={{color:"#f87171"}}>{fmtD(p.withdrawn)}</div>
                </div>
              </div>
              <div className="partner-balance" style={{background:p.remaining>=0?"rgba(6,95,70,0.3)":"rgba(127,29,29,0.3)",border:`1px solid ${p.remaining>=0?"#047857":"#991b1b"}`}}>
                <div className="partner-balance-label">{p.remaining>=0?"المتبقي من حصتك":"تجاوزت حصتك"}</div>
                <div className="partner-balance-val" style={{color:p.remaining>=0?"#34d399":"#f87171"}}>{fmtD(Math.abs(p.remaining))}</div>
              </div>
              <div className="progress-bar"><div className="progress-fill purple" style={{width:`${p.shareAmt?Math.min(100,Math.round(p.withdrawn/p.shareAmt*100)):0}%`}}/></div>
              <div style={{fontSize:11,color:"var(--text-dim)",marginTop:6,textAlign:"center"}}>{p.shareAmt?toAr(Math.min(100,Math.round(p.withdrawn/p.shareAmt*100))):0}% مسحوب من الحصة</div>
            </div>
          ))}
        </div>
        <button className="submit-btn" style={{background:"linear-gradient(135deg,#7c3aed,#5b21b6)",color:"#fff"}} onClick={pdfComp}>📄 تصدير PDF للشركة</button>
        {!D&&<button className="cancel-btn" onClick={()=>setView("home")}>← رجوع</button>}
      </div>
    );

    // ── OPENING BALANCES ──
    if(user.role==="manager"&&view==="opening") return (
      <div style={D?{maxWidth:900}:{}}>
        <div className="section-title">⚖️ الأرصدة الافتتاحية</div>
        <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:20,fontWeight:500}}>أدخل الأرصدة السابقة لكل شخص قبل بداية استخدام النظام</div>
        {OBok&&<div style={{color:"#34d399",fontSize:14,marginBottom:16,fontWeight:700}}>✅ تم الحفظ بنجاح!</div>}
        <div className={D?"emp-grid":""}>
          {WORKERS.map(u=>{
            const ob=OBs[u.id]||{};
            const of=OBform[u.id]||{};
            const isP=u.role==="partner";
            return(
              <div key={u.id} className={`ob-card ${isP?"partner":""}`}>
                <div className="ob-header">
                  <div className={`avatar sm ${avatarClass(u.role)}`}>{u.name[0]}</div>
                  <div>
                    <div className="ob-name">{u.name}</div>
                    <div className={`ob-role ${isP?"partner":""}`}>{isP?`شريك ${toAr(u.share)}%`:"موظف"}</div>
                  </div>
                </div>
                <div className="ob-grid">
                  {[["dinarReceived","🇮🇶 دينار استلم"],["dinarSpent","🇮🇶 دينار صرف"],["dollarReceived","🇺🇸 دولار استلم"],["dollarSpent","🇺🇸 دولار صرف"]].map(([k,l])=>(
                    <div key={k}>
                      <div className="ob-field-label">{l}</div>
                      <input className="form-input" style={{padding:"9px 12px",fontSize:13}} type="number" placeholder={toAr(ob[k]||0)} value={of[k]??""} onChange={e=>setOBform(f=>({...f,[u.id]:{...(f[u.id]||{}),[k]:e.target.value}}))}/>
                    </div>
                  ))}
                  {isP&&(
                    <div style={{gridColumn:"1/-1"}}>
                      <div className="ob-field-label" style={{color:"#a78bfa"}}>👤 سحب شخصي سابق</div>
                      <input className="form-input" style={{padding:"9px 12px",fontSize:13,borderColor:"rgba(124,58,237,0.3)"}} type="number" placeholder={toAr(ob.personalWithdraw||0)} value={of.personalWithdraw??""} onChange={e=>setOBform(f=>({...f,[u.id]:{...(f[u.id]||{}),personalWithdraw:e.target.value}}))}/>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <button className="submit-btn" style={{background:"linear-gradient(135deg,#7c3aed,#5b21b6)",color:"#fff"}} onClick={saveOBs}>💾 حفظ الأرصدة الافتتاحية</button>
        {!D&&<button className="cancel-btn" onClick={()=>setView("home")}>← رجوع</button>}
      </div>
    );

    return null;
  }
}

function BalCard({label,stats,cur,color}){
  return(
    <div className="bal-card" style={{background:`linear-gradient(135deg,${color})`}}>
      <div className="bal-label">{label}</div>
      <div className="bal-amount" style={{fontFamily:"'Cairo',sans-serif"}}>{`${Math.abs(stats.b).toLocaleString("ar-IQ")} ${cur==="دولار"?"$":"د.ع"}`.replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[d])}</div>
      <div className="bal-sub">{stats.b>=0?"متبقي معك":"عليك"}</div>
      <div className="bal-row">
        <span className="bal-stat">↓ استلمت {`${stats.r.toLocaleString("ar-IQ")} ${cur==="دولار"?"$":"د.ع"}`.replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[d])}</span>
        <span className="bal-stat">↑ صرفت {`${stats.s.toLocaleString("ar-IQ")} ${cur==="دولار"?"$":"د.ع"}`.replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[d])}</span>
      </div>
    </div>
  );
}

function TxCard({t,showUser,onDelete,onImg}){
  return(
    <div className="tx-card">
      <div className="tx-top">
        <div className="tx-badges">
          <span className={`badge ${t.type==="صرف"?"spend":"receive"}`}>{t.type}</span>
          {t.isPersonal&&<span className="badge personal">👤 شخصي</span>}
          <span className="badge currency">{t.currency||"دينار"}</span>
        </div>
        <div className="tx-amount" style={{color:t.type==="صرف"?"#f87171":"#34d399",fontFamily:"'Cairo',sans-serif"}}>
          {t.type==="صرف"?"-":"+"}{String(Number(t.amount).toLocaleString("ar-IQ")).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[d])} {t.currency==="دولار"?"$":"د.ع"}
        </div>
      </div>
      {showUser&&<div className="tx-user">{t.userName}</div>}
      {t.projectName&&<div className="tx-project">{t.projectName}</div>}
      <div className="tx-date">📅 {t.date}</div>
      {t.note&&<div className="tx-note">{t.note}</div>}
      {t.image&&<img src={t.image} className="tx-img" alt="وصل" onClick={()=>onImg&&onImg(t.image)}/>}
      {onDelete&&<button className="tx-delete-btn" onClick={onDelete}>🗑️ حذف</button>}
    </div>
  );
}
