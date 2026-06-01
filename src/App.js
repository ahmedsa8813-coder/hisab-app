import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, setDoc } from "firebase/firestore";

const USERS = [
  { id: "manager",  name: "المدير المالي", role: "manager",  pin: "0000" },
  { id: "noor",     name: "نور",           role: "partner",  pin: "0000", share: 35 },
  { id: "mohammed", name: "محمد",          role: "partner",  pin: "0000", share: 15 },
  { id: "hussein",  name: "حسين",          role: "employee", pin: "0000" },
  { id: "ahmed",    name: "أحمد",          role: "partner",  pin: "0000", share: 15 },
  { id: "ihab",     name: "إيهاب",         role: "partner",  pin: "0000", share: 35 },
];

const PARTNERS  = USERS.filter(u => u.role === "partner");
const WORKERS   = USERS.filter(u => u.role !== "manager");
const SPECS     = ["مقاولات","ديكور","واجهات"];
const PROVINCES = ["بغداد","البصرة","نينوى","أربيل","النجف","كربلاء","الأنبار","ديالى","صلاح الدين","بابل","واسط","ذي قار","المثنى","القادسية","ميسان","كركوك","السليمانية","دهوك","حلبجة"];

const toAr = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
const fmtD = n => toAr(Number(n||0).toLocaleString("ar-IQ")) + " د.ع";
const fmt  = (n,c) => toAr(Number(n||0).toLocaleString("ar-IQ")) + (c==="دولار"?" $":" د.ع");

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
const today = () => new Date().toISOString().split("T")[0];

export default function App() {
  const urlUser   = getURLUser();
  const autoL     = useLayout();
  const [manL,    setManL]    = useState(null);
  const D = (manL || autoL) === "desktop";

  const [user,    setUser]    = useState(null);
  const [screen,  setScreen]  = useState("login");
  const [loginId, setLoginId] = useState(urlUser?.id || null);
  const [pin,     setPin]     = useState("");
  const [pinErr,  setPinErr]  = useState(false);
  const [view,    setView]    = useState("home");
  const [txs,     setTxs]     = useState([]);
  const [projs,   setProjs]   = useState([]);
  const [OBs,     setOBs]     = useState({});
  const [compSet, setCompSet] = useState({});
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({ type:"استلام", projectId:"", amount:"", currency:"دينار", note:"", date:today(), image:null, isPersonal:false });
  const [formOK,  setFormOK]  = useState(false);
  const [newProj, setNewProj] = useState({ name:"", spec:"مقاولات", province:"بغداد", value:"", currency:"دينار" });
  const [fuUser,  setFuUser]  = useState("all");
  const [fuProj,  setFuProj]  = useState("all");
  const [fuFrom,  setFuFrom]  = useState("");
  const [fuTo,    setFuTo]    = useState("");
  const [fuCur,   setFuCur]   = useState("دينار");
  const [stUser,  setStUser]  = useState(null);
  const [selProj, setSelProj] = useState(null);
  const [pfFrom,  setPfFrom]  = useState("");
  const [pfTo,    setPfTo]    = useState("");
  const [viewImg, setViewImg] = useState(null);
  const [OBform,  setOBform]  = useState({});
  const [OBok,    setOBok]    = useState(false);
  const [compForm,setCompForm]= useState({});
  const [compOk,  setCompOk]  = useState(false);
  const imgRef = useRef();

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
    if(!form.amount||!form.date)return;
    if(!form.isPersonal&&!form.projectId)return;
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
    await setDoc(doc(db,"settings","company"),{ capital:Number(compForm.capital||compSet.capital||0), note:compForm.note||compSet.note||"" });
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

  const workerBals = WORKERS.map(u=>{ const list=txs.filter(t=>t.userId===u.id); const ob=OBs[u.id]||{}; return{...u,din:bal(list,ob,"دينار"),dol:bal(list,ob,"دولار"),cnt:list.length}; });

  const compRep = () => {
    const cap=compSet.capital||0;
    const pReps=PARTNERS.map(p=>{
      const list=txs.filter(t=>t.userId===p.id);
      const pw=list.filter(t=>t.type==="صرف"&&t.isPersonal).reduce((s,t)=>s+t.amount,0)+(OBs[p.id]?.personalWithdraw||0);
      const shareAmt=cap*p.share/100;
      return{...p,shareAmt,withdrawn:pw,remaining:shareAmt-pw};
    });
    const totalW=pReps.reduce((s,p)=>s+p.withdrawn,0);
    return{cap,pReps,totalW,net:cap-totalW};
  };

  const stTxs = stUser ? txs.filter(t=>{ if(t.userId!==stUser)return false; if(t.currency!==fuCur&&!(fuCur==="دينار"&&!t.currency))return false; if(fuProj!=="all"&&t.projectId!==fuProj)return false; if(fuFrom&&t.date<fuFrom)return false; if(fuTo&&t.date>fuTo)return false; return true; }) : [];
  const stOB  = OBs[stUser]||{};
  const obR   = (!fuFrom&&fuProj==="all")?(fuCur==="دينار"?(stOB.dinarReceived||0):(stOB.dollarReceived||0)):0;
  const obS   = (!fuFrom&&fuProj==="all")?(fuCur==="دينار"?(stOB.dinarSpent||0):(stOB.dollarSpent||0)):0;
  const stR   = stTxs.filter(t=>t.type==="استلام").reduce((s,t)=>s+t.amount,0)+obR;
  const stS   = stTxs.filter(t=>t.type==="صرف").reduce((s,t)=>s+t.amount,0)+obS;
  const stB   = stR-stS;

  const allTxs = txs.filter(t=>{ if(fuUser!=="all"&&t.userId!==fuUser)return false; if(fuProj!=="all"&&t.projectId!==fuProj)return false; if(fuFrom&&t.date<fuFrom)return false; if(fuTo&&t.date>fuTo)return false; return true; });

  const projRep = (p,from,to) => {
    if(!p)return null;
    const pt=txs.filter(t=>t.projectId===p.id&&t.type==="صرف"&&(!from||t.date>=from)&&(!to||t.date<=to));
    const total=pt.reduce((s,t)=>s+t.amount,0);
    const byEmp=WORKERS.map(u=>{const ut=pt.filter(t=>t.userId===u.id);return{...u,spent:ut.reduce((s,t)=>s+t.amount,0),cnt:ut.length};}).filter(u=>u.spent>0);
    return{p,pt,total,rem:(p.value||0)-total,byEmp};
  };
  const pr = selProj ? projRep(selProj,pfFrom,pfTo) : null;

  const navMgr    = [{icon:"📊",label:"الملخص",v:"home"},{icon:"📋",label:"المعاملات",v:"allTx"},{icon:"🏗️",label:"المشاريع",v:"projects"},{icon:"💰",label:"المالية",v:"projReport"},{icon:"🏢",label:"الشركة",v:"company"},{icon:"⚖️",label:"افتتاحي",v:"opening"}];
  const navWorker = [{icon:"🏠",label:"الرئيسية",v:"home"},{icon:"➕",label:"تسجيل",v:"add"}];
  const navItems  = user?.role==="manager" ? navMgr : navWorker;

  const avatarBg = r => r==="manager"?"linear-gradient(135deg,#1d4ed8,#2563eb)":r==="partner"?"linear-gradient(135deg,#7c3aed,#6d28d9)":"linear-gradient(135deg,#f59e0b,#d97706)";

  // PDF helpers
  const pdfPerson = () => {
    const su=USERS.find(u=>u.id===stUser);
    const pn=fuProj!=="all"?((p=projs.find(p=>p.id===fuProj))=>p?`${p.name} - ${p.specialization||p.spec} - ${p.province}`:"")():"كل المشاريع";
    const obRow=(obR||obS)?`<tr style="background:#fff8e1"><td>قبل النظام</td><td>-</td><td>رصيد افتتاحي</td><td>${toAr(obR.toLocaleString("ar-IQ"))}</td><td>${toAr(obS.toLocaleString("ar-IQ"))}</td><td>-</td></tr>`:"";
    const rows=stTxs.map(t=>`<tr><td>${t.date}</td><td>${t.projectName||"-"}</td><td style="color:${t.type==='استلام'?'green':'red'}">${t.type}${t.isPersonal?" (شخصي)":""}</td><td>${t.type==='استلام'?toAr(Number(t.amount).toLocaleString("ar-IQ")):'-'}</td><td>${t.type==='صرف'?toAr(Number(t.amount).toLocaleString("ar-IQ")):'-'}</td><td>${t.note||"-"}</td></tr>`).join("");
    const html=`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/><title>كشف - ${su?.name}</title><style>body{font-family:Tahoma,sans-serif;padding:30px;direction:rtl}h1{color:#1d4ed8;font-size:20px}.i{font-size:13px;color:#555;margin:8px 0 20px}.s{display:flex;gap:12px;margin-bottom:24px}.b{border:1px solid #ddd;border-radius:8px;padding:12px;flex:1;text-align:center}.l{font-size:11px;color:#888}.v{font-size:16px;font-weight:bold;margin-top:4px}.g{color:green}.r{color:red}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#1d4ed8;color:#fff;padding:8px}td{padding:7px 8px;border-bottom:1px solid #eee;text-align:center}tr:nth-child(even){background:#f9f9f9}.f{margin-top:24px;font-size:11px;color:#aaa;text-align:center}</style></head><body><h1>كشف حساب - ${su?.name}</h1><div class="i">العملة: ${fuCur} | المشروع: ${pn} | من: ${fuFrom||"البداية"} | إلى: ${fuTo||"الآن"}</div><div class="s"><div class="b"><div class="l">إجمالي الاستلام</div><div class="v g">${fmt(stR,fuCur)}</div></div><div class="b"><div class="l">إجمالي الصرف</div><div class="v r">${fmt(stS,fuCur)}</div></div><div class="b"><div class="l">الرصيد</div><div class="v ${stB>=0?'g':'r'}">${fmt(Math.abs(stB),fuCur)} ${stB>=0?'متبقي':'عليه'}</div></div></div><table><thead><tr><th>التاريخ</th><th>المشروع</th><th>النوع</th><th>استلام</th><th>صرف</th><th>ملاحظات</th></tr></thead><tbody>${obRow}${rows}</tbody></table><div class="f">نظام حساب - ${new Date().toLocaleDateString("ar-IQ")}</div></body></html>`;
    const w=window.open("","_blank");w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
  };

  const pdfComp = () => {
    const rep=compRep();
    const rows=rep.pReps.map(p=>`<tr><td>${p.name}</td><td>${toAr(p.share)}%</td><td>${fmtD(p.shareAmt)}</td><td style="color:red">${fmtD(p.withdrawn)}</td><td style="color:${p.remaining>=0?'green':'red'}">${fmtD(Math.abs(p.remaining))} ${p.remaining>=0?'متبقي':'تجاوز'}</td></tr>`).join("");
    const html=`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/><title>كشف الشركة</title><style>body{font-family:Tahoma,sans-serif;padding:30px;direction:rtl}h1{color:#1d4ed8;font-size:22px}h2{font-size:16px;margin-top:24px}.s{display:flex;gap:12px;margin-bottom:20px}.b{border:1px solid #ddd;border-radius:8px;padding:12px;flex:1;text-align:center}.l{font-size:11px;color:#888}.v{font-size:16px;font-weight:bold;margin-top:4px}.g{color:green}.r{color:red}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#1d4ed8;color:#fff;padding:10px}td{padding:9px;border-bottom:1px solid #eee;text-align:center}tr:nth-child(even){background:#f9f9f9}.f{margin-top:24px;font-size:11px;color:#aaa;text-align:center}</style></head><body><h1>الكشف المالي للشركة</h1><div class="s"><div class="b"><div class="l">رأس المال</div><div class="v">${fmtD(rep.cap)}</div></div><div class="b"><div class="l">السحوبات</div><div class="v r">${fmtD(rep.totalW)}</div></div><div class="b"><div class="l">صافي رأس المال</div><div class="v g">${fmtD(rep.net)}</div></div></div><h2>حصص الشركاء</h2><table><thead><tr><th>الشريك</th><th>الحصة</th><th>المبلغ</th><th>السحوبات</th><th>المتبقي</th></tr></thead><tbody>${rows}</tbody></table><div class="f">نظام حساب - ${new Date().toLocaleDateString("ar-IQ")}</div></body></html>`;
    const w=window.open("","_blank");w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
  };

  const pdfProj = () => {
    if(!pr)return;
    const pct=pr.p.value?Math.min(100,Math.round(pr.total/pr.p.value*100)):0;
    const eRows=pr.byEmp.map(e=>`<tr><td>${e.name}</td><td>${fmtD(e.spent)}</td><td>${toAr(e.cnt)} معاملة</td><td>${pr.p.value?toAr(Math.round(e.spent/pr.p.value*100))+"%":"-"}</td></tr>`).join("");
    const tRows=pr.pt.map(t=>`<tr><td>${t.date}</td><td>${t.userName}</td><td>${fmtD(t.amount)}</td><td>${t.note||"-"}</td></tr>`).join("");
    const html=`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/><title>كشف ${pr.p.name}</title><style>body{font-family:Tahoma,sans-serif;padding:30px;direction:rtl}h1{color:#1d4ed8;font-size:20px}h2{font-size:15px;margin-top:20px}.s{display:flex;gap:12px;margin-bottom:20px}.b{border:1px solid #ddd;border-radius:8px;padding:12px;flex:1;text-align:center}.l{font-size:11px;color:#888}.v{font-size:15px;font-weight:bold;margin-top:4px}.g{color:green}.r{color:red}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#1d4ed8;color:#fff;padding:8px}td{padding:7px;border-bottom:1px solid #eee;text-align:center}tr:nth-child(even){background:#f9f9f9}.f{margin-top:24px;font-size:11px;color:#aaa;text-align:center}</style></head><body><h1>الكشف المالي - ${pr.p.name}</h1><p>${pr.p.specialization||pr.p.spec} · ${pr.p.province}${pfFrom?` | من: ${pfFrom}`:""}${pfTo?` | إلى: ${pfTo}`:""}</p><div class="s"><div class="b"><div class="l">قيمة المشروع</div><div class="v">${fmtD(pr.p.value)}</div></div><div class="b"><div class="l">المصروف</div><div class="v r">${fmtD(pr.total)}</div></div><div class="b"><div class="l">المتبقي</div><div class="v ${pr.rem>=0?'g':'r'}">${fmtD(Math.abs(pr.rem))}</div></div><div class="b"><div class="l">نسبة الصرف</div><div class="v">${toAr(pct)}%</div></div></div><h2>تفصيل الموظفين</h2><table><thead><tr><th>الموظف</th><th>المصروف</th><th>المعاملات</th><th>النسبة</th></tr></thead><tbody>${eRows}</tbody></table><h2>تفاصيل المعاملات</h2><table><thead><tr><th>التاريخ</th><th>الموظف</th><th>المبلغ</th><th>ملاحظات</th></tr></thead><tbody>${tRows}</tbody></table><div class="f">نظام حساب - ${new Date().toLocaleDateString("ar-IQ")}</div></body></html>`;
    const w=window.open("","_blank");w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
  };

  // ─── LOGIN ───
  if(screen==="login") return (
    <div style={S.page}>
      <div style={D?S.loginWrapD:S.loginWrap}>
        <div style={S.logo}><div style={S.logoText}>حساب</div><div style={S.logoSub}>نظام المصروفيات والشركاء</div></div>
        {!loginId ? (
          <>
            <div style={S.lbl}>اختر حسابك</div>
            <div style={D?S.gridD:S.grid}>
              {USERS.map(u=>(
                <button key={u.id} style={{...S.userBtn,...(u.role==="manager"?S.mgrBtn:{}), ...(u.role==="partner"?S.partnerBtnStyle:{})}} onClick={()=>{setLoginId(u.id);setPin("");setPinErr(false);}}>
                  <div style={{...S.av,background:avatarBg(u.role),margin:"0 auto 10px",width:50,height:50,fontSize:22,borderRadius:16}}>{u.name[0]}</div>
                  <div style={S.uName}>{u.name}</div>
                  <div style={S.uRole}>{u.role==="manager"?"مدير مالي":"موظف"}</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={S.selCard}>
              <div style={{...S.av,background:avatarBg(USERS.find(u=>u.id===loginId)?.role)}}>{USERS.find(u=>u.id===loginId)?.name[0]}</div>
              <div>
                <div style={{fontSize:18,fontWeight:800,letterSpacing:-0.5}}>{USERS.find(u=>u.id===loginId)?.name}</div>
                <div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>{USERS.find(u=>u.id===loginId)?.role==="manager"?"مدير مالي":"موظف"}</div>
              </div>
            </div>
            <div style={S.lbl}>أدخل الرمز السري</div>
            <div style={S.dots}>{[0,1,2,3].map(i=><div key={i} style={{...S.dot,background:pin.length>i?"#f59e0b":"rgba(255,255,255,0.15)"}}/>)}</div>
            {pinErr&&<div style={S.pinErr}>رمز خاطئ، حاول مرة ثانية</div>}
            <div style={D?S.numpadD:S.numpad}>
              {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k,i)=>(
                <button key={i} style={k===""?S.numEmpty:S.numBtn} onClick={()=>{if(!k)return;if(k==="⌫"){setPin(p=>p.slice(0,-1));setPinErr(false);}else if(pin.length<4)setPin(p=>p+k);}}>{k}</button>
              ))}
            </div>
            <button style={S.loginBtn} onClick={doLogin}>دخول</button>
            {!urlUser&&<button style={S.backBtn} onClick={()=>{setLoginId(null);setPin("");}}>← رجوع</button>}
          </>
        )}
      </div>
    </div>
  );

  // ─── APP ───
  const CR = compRep();
  const myShare = CR.pReps.find(p=>p.id===user?.id);

  return (
    <div style={D?S.appWrapD:S.appWrap}>
      {viewImg&&<div style={S.overlay} onClick={()=>setViewImg(null)}><img src={viewImg} style={S.fullImg} alt="وصل"/></div>}

      {/* HEADER */}
      <div style={D?S.headerD:S.header}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{...S.av,width:38,height:38,fontSize:16,borderRadius:12,background:avatarBg(user.role)}}>{user.name[0]}</div>
          <div>
            <div style={S.hName}>{user.name}</div>
            <div style={S.hRole}>{user.role==="manager"?"مدير مالي":"موظف"}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={S.iconBtn} onClick={()=>setManL(D?"mobile":"desktop")}>{D?"📱":"🖥️"}</button>
          <button style={S.outBtn} onClick={()=>{setUser(null);setScreen("login");setPin("");setView("home");}}>خروج</button>
        </div>
      </div>

      {D ? (
        <div style={{display:"flex",flex:1,overflow:"hidden"}}>
          <div style={S.sidebar}>
            {navItems.map(n=>(
              <button key={n.v} style={{...S.sideBtn,...(view===n.v?S.sideBtnA:{})}} onClick={()=>setView(n.v)}>
                <div style={{...S.sideIcon,...(view===n.v?{background:"rgba(245,158,11,0.15)"}:{})}}>{n.icon}</div>
                <span>{n.label}</span>
              </button>
            ))}
          </div>
          <div style={S.mainContent}>{renderView()}</div>
        </div>
      ) : (
        <>
          <div style={S.mobileContent}>{renderView()}</div>
          <div style={S.botNav}>
            {navItems.map(n=>(
              <button key={n.v} style={{...S.navBtn,...(view===n.v?S.navBtnA:{})}} onClick={()=>setView(n.v)}>
                <div style={{...S.navIcon,...(view===n.v?{background:"rgba(245,158,11,0.1)"}:{})}}>{n.icon}</div>
                <div style={S.navLbl}>{n.label}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  function renderView() {
    if(loading) return <div style={{textAlign:"center",color:"#6b7280",padding:60,fontSize:16}}>⏳ جاري التحميل...</div>;

    // WORKER HOME
    if(user.role!=="manager"&&view==="home") return (
      <div>

        <div style={D?{display:"flex",gap:12,marginBottom:4}:{}}>
          <div style={{...S.balCard,background:"linear-gradient(135deg,#065f46,#047857)",flex:D?1:undefined,marginBottom:D?0:12}}>
            <div style={S.balLbl}>🇮🇶 دينار عراقي</div>
            <div style={S.balAmt}>{fmt(Math.abs(dinSt.b),"دينار")}</div>
            <div style={S.balSub}>{dinSt.b>=0?"متبقي معك":"عليك"}</div>
            <div style={S.balRow}><span style={S.balSt}>↓ {fmt(dinSt.r,"دينار")}</span><span style={S.balSt}>↑ {fmt(dinSt.s,"دينار")}</span></div>
          </div>
          <div style={{...S.balCard,background:"linear-gradient(135deg,#1e40af,#2563eb)",flex:D?1:undefined,marginBottom:16}}>
            <div style={S.balLbl}>🇺🇸 دولار أمريكي</div>
            <div style={S.balAmt}>{fmt(Math.abs(dolSt.b),"دولار")}</div>
            <div style={S.balSub}>{dolSt.b>=0?"متبقي معك":"عليك"}</div>
            <div style={S.balRow}><span style={S.balSt}>↓ {fmt(dolSt.r,"دولار")}</span><span style={S.balSt}>↑ {fmt(dolSt.s,"دولار")}</span></div>
          </div>
        </div>
        {!D&&<button style={S.goldBtn} onClick={()=>{setView("add");setForm({type:"استلام",projectId:"",amount:"",currency:"دينار",note:"",date:today(),image:null,isPersonal:false});}}>➕ تسجيل معاملة جديدة</button>}
        <div style={S.secTitle}>سجل المعاملات</div>
        {myTxs.length===0?<div style={S.empty}>ما عندك معاملات بعد</div>:(
          <div style={D?S.txGrid:{}}>{myTxs.map(t=><TxCard key={t.id} t={t} onImg={setViewImg}/>)}</div>
        )}
      </div>
    );

    // ADD TX
    if(user.role!=="manager"&&view==="add") return (
      <div style={D?{maxWidth:600}:{}}>
        <div style={S.secTitle}>تسجيل معاملة جديدة</div>
        {formOK?(
          <div style={{textAlign:"center",padding:60,color:"#34d399"}}><div style={{fontSize:60,marginBottom:12}}>✅</div><div style={{fontSize:20,fontWeight:800}}>تم التسجيل بنجاح!</div></div>
        ):(
          <div style={S.formCard}>
            <div style={S.fLbl}>نوع المعاملة</div>
            <div style={S.tRow}>
              <button style={{...S.tBtn,...(form.type==="استلام"?{background:"rgba(6,95,70,0.3)",border:"1px solid #047857",color:"#34d399"}:{})}} onClick={()=>setForm(f=>({...f,type:"استلام",isPersonal:false}))}>↓ استلام</button>
              <button style={{...S.tBtn,...(form.type==="صرف"?{background:"rgba(127,29,29,0.3)",border:"1px solid #991b1b",color:"#f87171"}:{})}} onClick={()=>setForm(f=>({...f,type:"صرف"}))}>↑ صرف</button>
            </div>

            <div style={S.fLbl}>العملة</div>
            <div style={S.tRow}>
              <button style={{...S.tBtn,...(form.currency==="دينار"?{background:"rgba(29,78,216,0.3)",border:"1px solid #2563eb",color:"#60a5fa"}:{})}} onClick={()=>setForm(f=>({...f,currency:"دينار"}))}>🇮🇶 دينار</button>
              <button style={{...S.tBtn,...(form.currency==="دولار"?{background:"rgba(29,78,216,0.3)",border:"1px solid #2563eb",color:"#60a5fa"}:{})}} onClick={()=>setForm(f=>({...f,currency:"دولار"}))}>🇺🇸 دولار</button>
            </div>
            {!form.isPersonal&&(<><div style={S.fLbl}>المشروع</div>
            <select style={S.sel} value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))}>
              <option value="">اختر المشروع</option>
              {projs.map(p=><option key={p.id} value={p.id}>{p.name} - {p.spec||p.specialization} - {p.province}</option>)}
            </select></>)}
            <div style={D?{display:"flex",gap:12}:{}}>
              <div style={D?{flex:1}:{}}><div style={S.fLbl}>المبلغ</div><input style={S.inp} type="number" placeholder="٠" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/></div>
              <div style={D?{flex:1}:{}}><div style={S.fLbl}>التاريخ</div><input style={S.inp} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
            </div>
            <div style={S.fLbl}>ملاحظات</div>
            <textarea style={S.ta} placeholder="اكتب تفاصيل..." value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={2}/>
            {!form.isPersonal&&(<><div style={S.fLbl}>صورة الوصل (اختياري)</div>
            <input ref={imgRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={pickImg}/>
            <button style={S.imgBtn} onClick={()=>imgRef.current.click()}>{form.image?"✅ تم اختيار الصورة":"📷 التقط أو اختر صورة"}</button>
            {form.image&&<img src={form.image} style={S.imgPrev} alt="preview" onClick={()=>setViewImg(form.image)}/>}</>)}
            <button style={{...S.subBtn,...(form.isPersonal?{background:"linear-gradient(135deg,#7c3aed,#5b21b6)",color:"#fff"}:{})}} onClick={addTx}>💾 حفظ المعاملة</button>
            <button style={S.canBtn} onClick={()=>setView("home")}>إلغاء</button>
          </div>
        )}
      </div>
    );

    // MANAGER HOME
    if(user.role==="manager"&&view==="home") return (
      <div>
        <div style={{...S.balCard,background:"linear-gradient(135deg,#1e3a5f,#1e6fff)",marginBottom:20}}>
          <div style={S.balLbl}>🏢 رأس المال الكلي للشركة</div>
          <div style={S.balAmt}>{fmtD(CR.cap)}</div>
          <div style={S.balRow}>
            <span style={S.balSt}>↑ السحوبات: {fmtD(CR.totalW)}</span>
            <span style={S.balSt}>الصافي: {fmtD(CR.net)}</span>
          </div>
        </div>
        <div style={S.secTitle}>حسابات الأشخاص</div>
        <div style={D?S.empGrid:{}}>
          {workerBals.map(e=>(
            <button key={e.id} style={{...S.empCard,...(e.role==="partner"?{border:"1px solid rgba(124,58,237,0.3)",background:"rgba(124,58,237,0.05)"}:{})}} onClick={()=>{setStUser(e.id);setFuFrom("");setFuTo("");setFuProj("all");setFuCur("دينار");setView("statement");}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{...S.av,width:42,height:42,fontSize:18,borderRadius:14,background:avatarBg(e.role)}}>{e.name[0]}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:16,letterSpacing:-0.5}}>{e.name}</div>
                  <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>موظف · {toAr(e.cnt)} معاملة</div>
                </div>
                <div style={{textAlign:"center",marginLeft:8}}>
                  <div style={{fontSize:12,color:"#34d399",fontWeight:600}}>{fmt(Math.abs(e.din.b),"دينار")}</div>
                  <div style={{fontSize:12,color:"#60a5fa",fontWeight:600,marginTop:3}}>{fmt(Math.abs(e.dol.b),"دولار")}</div>
                </div>
                <div style={{color:"#6b7280",marginRight:4,fontSize:14}}>←</div>
              </div>
            </button>
          ))}
        </div>
        {!D&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
            {[["📋 المعاملات","allTx","linear-gradient(135deg,#1d4ed8,#1455cc)"],["🏗️ المشاريع","projects","linear-gradient(135deg,#065f46,#047857)"],["💰 كشف المشاريع","projReport","linear-gradient(135deg,#b45309,#92400e)"],["🏢 كشف الشركة","company","linear-gradient(135deg,#7c3aed,#5b21b6)"]].map(([l,v,bg])=>(
              <button key={v} style={{...S.goldBtn,background:bg,color:"#fff",marginBottom:0}} onClick={()=>setView(v)}>{l}</button>
            ))}
            <button style={{...S.goldBtn,background:"linear-gradient(135deg,#374151,#1f2937)",color:"#fff",gridColumn:"1/-1",marginBottom:0}} onClick={()=>setView("opening")}>⚖️ الأرصدة الافتتاحية</button>
          </div>
        )}
      </div>
    );

    // STATEMENT
    if(user.role==="manager"&&view==="statement") return (
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          {!D&&<button style={S.backBtn2} onClick={()=>setView("home")}>←</button>}
          <div style={{...S.secTitle,margin:0}}>كشف حساب — {USERS.find(u=>u.id===stUser)?.name}</div>
        </div>
        <div style={D?{display:"flex",gap:20}:{}}>
          <div style={D?{width:280,flexShrink:0}:{}}>
            <div style={S.filterCard}>
              <div style={S.fLbl}>العملة</div>
              <div style={S.tRow}>
                <button style={{...S.tBtn,...(fuCur==="دينار"?{background:"rgba(29,78,216,0.3)",border:"1px solid #2563eb",color:"#60a5fa"}:{})}} onClick={()=>setFuCur("دينار")}>🇮🇶 دينار</button>
                <button style={{...S.tBtn,...(fuCur==="دولار"?{background:"rgba(29,78,216,0.3)",border:"1px solid #2563eb",color:"#60a5fa"}:{})}} onClick={()=>setFuCur("دولار")}>🇺🇸 دولار</button>
              </div>
              <div style={S.fLbl}>المشروع</div>
              <select style={S.sel} value={fuProj} onChange={e=>setFuProj(e.target.value)}><option value="all">كل المشاريع</option>{projs.map(p=><option key={p.id} value={p.id}>{p.name} - {p.specialization||p.spec} - {p.province}</option>)}</select>
              <div style={S.fLbl}>من تاريخ</div><input style={S.inp} type="date" value={fuFrom} onChange={e=>setFuFrom(e.target.value)}/>
              <div style={S.fLbl}>إلى تاريخ</div><input style={S.inp} type="date" value={fuTo} onChange={e=>setFuTo(e.target.value)}/>
              <button style={{...S.subBtn,background:"linear-gradient(135deg,#1d4ed8,#1455cc)",color:"#fff"}} onClick={pdfPerson}>📄 تصدير PDF</button>
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{...S.balCard,background:stB>=0?"linear-gradient(135deg,#065f46,#047857)":"linear-gradient(135deg,#7f1d1d,#991b1b)",marginBottom:16}}>
              <div style={S.balLbl}>الرصيد — {fuCur}</div>
              <div style={S.balAmt}>{fmt(Math.abs(stB),fuCur)}</div>
              <div style={S.balSub}>{stB>=0?"متبقي معه":"عليه"}</div>
              <div style={S.balRow}><span style={S.balSt}>↓ استلم {fmt(stR,fuCur)}</span><span style={S.balSt}>↑ صرف {fmt(stS,fuCur)}</span></div>
            </div>
            {stTxs.length===0?<div style={S.empty}>ما في معاملات</div>:<div style={D?S.txGrid:{}}>{stTxs.map(t=><TxCard key={t.id} t={t} onDelete={()=>delTx(t.id)} onImg={setViewImg}/>)}</div>}
            {!D&&<button style={S.canBtn} onClick={()=>setView("home")}>← رجوع</button>}
          </div>
        </div>
      </div>
    );

    // ALL TX
    if(user.role==="manager"&&view==="allTx") return (
      <div>
        <div style={S.secTitle}>كل المعاملات</div>
        <div style={D?{display:"flex",gap:20}:{}}>
          <div style={D?{width:260,flexShrink:0}:{}}>
            <div style={S.filterCard}>
              <div style={S.fLbl}>الشخص</div>
              <select style={S.sel} value={fuUser} onChange={e=>setFuUser(e.target.value)}><option value="all">الكل</option>{WORKERS.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select>
              <div style={S.fLbl}>المشروع</div>
              <select style={S.sel} value={fuProj} onChange={e=>setFuProj(e.target.value)}><option value="all">الكل</option>{projs.map(p=><option key={p.id} value={p.id}>{p.name} - {p.specialization||p.spec} - {p.province}</option>)}</select>
              <div style={S.fLbl}>من تاريخ</div><input style={S.inp} type="date" value={fuFrom} onChange={e=>setFuFrom(e.target.value)}/>
              <div style={S.fLbl}>إلى تاريخ</div><input style={S.inp} type="date" value={fuTo} onChange={e=>setFuTo(e.target.value)}/>
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,color:"#6b7280",marginBottom:12}}>{toAr(allTxs.length)} معاملة</div>
            {allTxs.length===0?<div style={S.empty}>ما في نتائج</div>:<div style={D?S.txGrid:{}}>{allTxs.map(t=><TxCard key={t.id} t={t} showUser onDelete={()=>delTx(t.id)} onImg={setViewImg}/>)}</div>}
            {!D&&<button style={S.canBtn} onClick={()=>setView("home")}>← رجوع</button>}
          </div>
        </div>
      </div>
    );

    // PROJECTS
    if(user.role==="manager"&&view==="projects") return (
      <div style={D?{maxWidth:720}:{}}>
        <div style={S.secTitle}>إدارة المشاريع</div>
        <div style={S.formCard}>
          <div style={S.fLbl}>اسم المشروع</div>
          <input style={S.inp} placeholder="مثال: برج الأمل" value={newProj.name} onChange={e=>setNewProj(p=>({...p,name:e.target.value}))}/>
          <div style={S.fLbl}>التخصص</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{SPECS.map(s=><button key={s} style={{...S.specBtn,...(newProj.spec===s?S.specBtnA:{})}} onClick={()=>setNewProj(p=>({...p,spec:s}))}>{s}</button>)}</div>
          <div style={S.fLbl}>المحافظة</div>
          <select style={S.sel} value={newProj.province} onChange={e=>setNewProj(p=>({...p,province:e.target.value}))}>{PROVINCES.map(pr=><option key={pr} value={pr}>{pr}</option>)}</select>
          <div style={D?{display:"flex",gap:12}:{}}>
            <div style={D?{flex:2}:{}}><div style={S.fLbl}>قيمة المشروع</div><input style={S.inp} type="number" placeholder="٠" value={newProj.value} onChange={e=>setNewProj(p=>({...p,value:e.target.value}))}/></div>
            <div style={D?{flex:1}:{}}><div style={S.fLbl}>عملة المشروع</div>
              <div style={S.tRow}>
                <button style={{...S.tBtn,...(newProj.currency==="دينار"?{background:"rgba(29,78,216,0.3)",border:"1px solid #2563eb",color:"#60a5fa"}:{})}} onClick={()=>setNewProj(p=>({...p,currency:"دينار"}))}>🇮🇶</button>
                <button style={{...S.tBtn,...(newProj.currency==="دولار"?{background:"rgba(29,78,216,0.3)",border:"1px solid #2563eb",color:"#60a5fa"}:{})}} onClick={()=>setNewProj(p=>({...p,currency:"دولار"}))}>🇺🇸</button>
              </div>
            </div>
          </div>
          <button style={S.subBtn} onClick={addProj}>+ إضافة المشروع</button>
        </div>
        <div style={{height:16}}/>
        <div style={D?S.txGrid:{}}>{projs.map(p=>(
          <div key={p.id} style={S.projCard}>
            <div>
              <div style={{fontWeight:800,fontSize:15,letterSpacing:-0.3}}>🏗️ {p.name}</div>
              <div style={{fontSize:12,color:"#6b7280",marginTop:4}}>{p.specialization||p.spec} · {p.province}</div>
              {p.value>0&&<div style={{fontSize:12,color:"#f59e0b",marginTop:3,fontWeight:600}}>قيمة المشروع: {fmtD(p.value)}</div>}
            </div>
            <button style={S.delBtn} onClick={()=>delProj(p.id)}>🗑️ حذف</button>
          </div>
        ))}</div>
        {!D&&<button style={S.canBtn} onClick={()=>setView("home")}>← رجوع</button>}
      </div>
    );

    // PROJECT REPORT
    if(user.role==="manager"&&view==="projReport") return (
      <div>
        <div style={S.secTitle}>💰 الكشف المالي للمشاريع</div>
        {!selProj ? (
          <div style={D?S.txGrid:{}}>{projs.map(p=>{
            const r=projRep(p,"",""); const pct=p.value?Math.min(100,Math.round(r.total/p.value*100)):0;
            return(
              <button key={p.id} style={S.projRepCard} onClick={()=>{setSelProj(p);setPfFrom("");setPfTo("");}}>
                <div style={{fontWeight:800,fontSize:15,marginBottom:4,letterSpacing:-0.3}}>{p.name}</div>
                <div style={{fontSize:12,color:"#9ca3af",marginBottom:10}}>{p.specialization||p.spec} · {p.province}</div>
                {p.value>0&&<>
                  <div style={S.progBar}><div style={{...S.progFill,width:`${pct}%`}}/></div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginTop:8}}>
                    <span style={{color:"#f87171"}}>صُرف: {fmtD(r.total)}</span>
                    <span style={{color:"#34d399"}}>باقي: {fmtD(p.value-r.total)}</span>
                  </div>
                </>}
              </button>
            );
          })}</div>
        ) : (
          <div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <button style={S.backBtn2} onClick={()=>setSelProj(null)}>←</button>
              <div style={{fontWeight:800,fontSize:16,letterSpacing:-0.5}}>{selProj.name} · {selProj.specialization||selProj.spec} · {selProj.province}</div>
            </div>
            <div style={D?{display:"flex",gap:20}:{}}>
              <div style={D?{width:260,flexShrink:0}:{}}>
                <div style={S.filterCard}>
                  <div style={S.fLbl}>من تاريخ</div><input style={S.inp} type="date" value={pfFrom} onChange={e=>setPfFrom(e.target.value)}/>
                  <div style={S.fLbl}>إلى تاريخ</div><input style={S.inp} type="date" value={pfTo} onChange={e=>setPfTo(e.target.value)}/>
                  <button style={{...S.subBtn,background:"linear-gradient(135deg,#b45309,#92400e)",color:"#fff"}} onClick={pdfProj}>📄 تصدير PDF</button>
                </div>
              </div>
              <div style={{flex:1}}>
                {pr&&<>
                  <div style={{display:"grid",gridTemplateColumns:D?"repeat(4,1fr)":"1fr 1fr",gap:10,marginBottom:16}}>
                    {[["قيمة المشروع",selProj.value,"linear-gradient(135deg,#1d4ed8,#2563eb)"],["إجمالي المصروف",pr.total,"linear-gradient(135deg,#7f1d1d,#991b1b)"],[ pr.rem>=0?"المتبقي":"تجاوز",Math.abs(pr.rem),pr.rem>=0?"linear-gradient(135deg,#065f46,#047857)":"linear-gradient(135deg,#7f1d1d,#991b1b)"],["نسبة الصرف",null,"linear-gradient(135deg,#b45309,#92400e)"]].map(([l,v,bg],i)=>(
                      <div key={i} style={{background:bg,borderRadius:16,padding:16}}>
                        <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginBottom:6,fontWeight:600}}>{l}</div>
                        <div style={{fontSize:18,fontWeight:900,letterSpacing:-0.5}}>{i===3?(selProj.value?toAr(Math.min(100,Math.round(pr.total/selProj.value*100)))+"%":"—"):fmtD(v)}</div>
                      </div>
                    ))}
                  </div>
                  {selProj.value>0&&<div style={{...S.progBar,marginBottom:20}}><div style={{...S.progFill,width:`${Math.min(100,Math.round(pr.total/selProj.value*100))}%`}}/></div>}
                  <div style={{...S.secTitle,fontSize:16}}>تفصيل مصروفات الموظفين</div>
                  {pr.byEmp.length===0?<div style={S.empty}>ما في مصروفات</div>:pr.byEmp.map(e=>(
                    <div key={e.id} style={{...S.txCard,marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{...S.av,width:38,height:38,fontSize:16,borderRadius:12,background:avatarBg(e.role)}}>{e.name[0]}</div>
                        <div style={{flex:1}}><div style={{fontWeight:700,fontSize:15}}>{e.name}</div><div style={{fontSize:11,color:"#6b7280"}}>{toAr(e.cnt)} معاملة</div></div>
                        <div style={{textAlign:"left"}}><div style={{fontSize:16,fontWeight:900,color:"#f87171",letterSpacing:-0.5}}>{fmtD(e.spent)}</div>{selProj.value>0&&<div style={{fontSize:11,color:"#9ca3af"}}>{toAr(Math.round(e.spent/selProj.value*100))}%</div>}</div>
                      </div>
                      <div style={{...S.progBar,marginTop:10,height:6}}><div style={{...S.progFill,width:`${selProj.value?Math.min(100,Math.round(e.spent/selProj.value*100)):0}%`,background:"#f87171"}}/></div>
                    </div>
                  ))}
                  <div style={{...S.secTitle,fontSize:16,marginTop:24}}>تفاصيل المعاملات</div>
                  <div style={D?S.txGrid:{}}>{pr.pt.map(t=><TxCard key={t.id} t={t} showUser onDelete={()=>delTx(t.id)} onImg={setViewImg}/>)}</div>
                </>}
              </div>
            </div>
          </div>
        )}
      </div>
    );

    // COMPANY
    if(user.role==="manager"&&view==="company") return (
      <div>
        <div style={S.secTitle}>🏢 الكشف المالي للشركة</div>
        <div style={S.filterCard}>
          <div style={S.fLbl}>رأس المال الكلي (دينار)</div>
          <input style={S.inp} type="number" placeholder={fmtD(compSet.capital||0)} value={compForm.capital??""} onChange={e=>setCompForm(f=>({...f,capital:e.target.value}))}/>
          <div style={S.fLbl}>ملاحظة</div>
          <input style={S.inp} placeholder="مثال: رأس المال حتى يناير 2026" value={compForm.note??compSet.note??""} onChange={e=>setCompForm(f=>({...f,note:e.target.value}))}/>
          {compOk&&<div style={{color:"#34d399",fontSize:13,marginTop:8,fontWeight:700}}>✅ تم الحفظ</div>}
          <button style={{...S.subBtn,background:"linear-gradient(135deg,#1d4ed8,#1455cc)",color:"#fff"}} onClick={saveComp}>💾 حفظ رأس المال</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:D?"repeat(3,1fr)":"1fr 1fr",gap:10,marginBottom:20}}>
          {[["💼 رأس المال الكلي",CR.cap,"linear-gradient(135deg,#1e3a5f,#1d4ed8)"],["↑ إجمالي السحوبات",CR.totalW,"linear-gradient(135deg,#7f1d1d,#991b1b)"],["💰 صافي رأس المال",CR.net,"linear-gradient(135deg,#065f46,#047857)"]].map(([l,v,bg],i)=>(
            <div key={i} style={{background:bg,borderRadius:16,padding:16,gridColumn:D?"auto":i===2?"1/-1":"auto"}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginBottom:6,fontWeight:600}}>{l}</div>
              <div style={{fontSize:18,fontWeight:900,letterSpacing:-0.5}}>{fmtD(v)}</div>
            </div>
          ))}
        </div>
        <div style={{...S.secTitle,fontSize:17}}>حصص الشركاء</div>
        <div style={D?S.empGrid:{}}>
          {CR.pReps.map(p=>(
            <div key={p.id} style={{background:"rgba(124,58,237,0.08)",border:"1px solid rgba(124,58,237,0.25)",borderRadius:20,padding:20,marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                <div style={{...S.av,width:48,height:48,fontSize:20,borderRadius:15,background:"linear-gradient(135deg,#7c3aed,#5b21b6)"}}>{p.name[0]}</div>
                <div>
                  <div style={{fontWeight:800,fontSize:18,letterSpacing:-0.5}}>{p.name}</div>
                  <div style={{fontSize:12,color:"#a78bfa",marginTop:2,fontWeight:600}}>شريك بنسبة {toAr(p.share)}%</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div style={{background:"rgba(255,255,255,0.05)",borderRadius:12,padding:12}}>
                  <div style={{fontSize:11,color:"#9ca3af",fontWeight:600}}>حصة رأس المال</div>
                  <div style={{fontSize:15,fontWeight:800,color:"#60a5fa",marginTop:4,letterSpacing:-0.5}}>{fmtD(p.shareAmt)}</div>
                </div>
                <div style={{background:"rgba(255,255,255,0.05)",borderRadius:12,padding:12}}>
                  <div style={{fontSize:11,color:"#9ca3af",fontWeight:600}}>إجمالي السحوبات</div>
                  <div style={{fontSize:15,fontWeight:800,color:"#f87171",marginTop:4,letterSpacing:-0.5}}>{fmtD(p.withdrawn)}</div>
                </div>
              </div>
              <div style={{background:p.remaining>=0?"rgba(6,95,70,0.3)":"rgba(127,29,29,0.3)",border:`1px solid ${p.remaining>=0?"#047857":"#991b1b"}`,borderRadius:14,padding:"14px",textAlign:"center"}}>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.7)",fontWeight:600}}>{p.remaining>=0?"المتبقي من حصتك":"تجاوزت حصتك"}</div>
                <div style={{fontSize:24,fontWeight:900,color:p.remaining>=0?"#34d399":"#f87171",marginTop:4,letterSpacing:-1}}>{fmtD(Math.abs(p.remaining))}</div>
              </div>
              <div style={{...S.progBar,marginTop:12}}><div style={{...S.progFill,width:`${p.shareAmt?Math.min(100,Math.round(p.withdrawn/p.shareAmt*100)):0}%`,background:"linear-gradient(90deg,#7c3aed,#a78bfa)"}}/></div>
              <div style={{fontSize:11,color:"#6b7280",marginTop:6,textAlign:"center"}}>{p.shareAmt?toAr(Math.min(100,Math.round(p.withdrawn/p.shareAmt*100))):0}% مسحوب</div>
            </div>
          ))}
        </div>
        <button style={{...S.subBtn,background:"linear-gradient(135deg,#7c3aed,#5b21b6)",color:"#fff"}} onClick={pdfComp}>📄 تصدير PDF للشركة</button>
        {!D&&<button style={S.canBtn} onClick={()=>setView("home")}>← رجوع</button>}
      </div>
    );

    // OPENING BALANCES
    if(user.role==="manager"&&view==="opening") return (
      <div style={D?{maxWidth:900}:{}}>
        <div style={S.secTitle}>⚖️ الأرصدة الافتتاحية</div>
        <div style={{fontSize:13,color:"#6b7280",marginBottom:20,fontWeight:500}}>أدخل الأرصدة السابقة لكل شخص قبل بداية استخدام النظام</div>
        {OBok&&<div style={{color:"#34d399",fontSize:14,marginBottom:16,fontWeight:700}}>✅ تم الحفظ!</div>}
        <div style={D?S.empGrid:{}}>
          {WORKERS.map(u=>{ const ob=OBs[u.id]||{}; const of=OBform[u.id]||{}; const isP=u.role==="partner";
            return(
              <div key={u.id} style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${isP?"rgba(124,58,237,0.25)":"rgba(255,255,255,0.08)"}`,borderRadius:18,padding:18,marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                  <div style={{...S.av,width:36,height:36,fontSize:16,borderRadius:11,background:avatarBg(u.role)}}>{u.name[0]}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:15}}>{u.name}</div>
                    <div style={{fontSize:11,color:"#9ca3af"}}>"موظف"</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
                  {[["dinarReceived","🇮🇶 دينار استلم"],["dinarSpent","🇮🇶 دينار صرف"],["dollarReceived","🇺🇸 دولار استلم"],["dollarSpent","🇺🇸 دولار صرف"]].map(([k,l])=>(
                    <div key={k}>
                      <div style={{fontSize:11,color:"#9ca3af",marginBottom:4,fontWeight:600}}>{l}</div>
                      <input style={{...S.inp,padding:"9px 12px",fontSize:13}} type="number" placeholder={toAr(ob[k]||0)} value={of[k]??""} onChange={e=>setOBform(f=>({...f,[u.id]:{...(f[u.id]||{}),[k]:e.target.value}}))}/>
                    </div>
                  ))}
                  {isP&&(<div style={{gridColumn:"1/-1"}}>
                    <div style={{fontSize:11,color:"#a78bfa",marginBottom:4,fontWeight:600}}>👤 سحب شخصي سابق</div>
                    <input style={{...S.inp,padding:"9px 12px",fontSize:13,borderColor:"rgba(124,58,237,0.3)"}} type="number" placeholder={toAr(ob.personalWithdraw||0)} value={of.personalWithdraw??""} onChange={e=>setOBform(f=>({...f,[u.id]:{...(f[u.id]||{}),personalWithdraw:e.target.value}}))}/>
                  </div>)}
                </div>
              </div>
            );
          })}
        </div>
        <button style={{...S.subBtn,background:"linear-gradient(135deg,#7c3aed,#5b21b6)",color:"#fff"}} onClick={saveOBs}>💾 حفظ الأرصدة الافتتاحية</button>
        {!D&&<button style={S.canBtn} onClick={()=>setView("home")}>← رجوع</button>}
      </div>
    );
    return null;
  }
}

function TxCard({t,showUser,onDelete,onImg}){
  return(
    <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"14px 16px",marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{borderRadius:8,padding:"4px 12px",fontSize:12,fontWeight:700,background:t.type==="صرف"?"rgba(127,29,29,0.4)":"rgba(6,95,70,0.4)",color:t.type==="صرف"?"#f87171":"#34d399",border:`1px solid ${t.type==="صرف"?"rgba(127,29,29,0.6)":"rgba(6,95,70,0.6)"}`}}>{t.type}</span>
          {t.isPersonal&&<span style={{borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,background:"rgba(124,58,237,0.2)",color:"#c4b5fd",border:"1px solid rgba(124,58,237,0.3)"}}>👤 شخصي</span>}
          <span style={{borderRadius:8,padding:"4px 10px",fontSize:11,background:"rgba(255,255,255,0.05)",color:"#6b7280",border:"1px solid rgba(255,255,255,0.08)"}}>{t.currency||"دينار"}</span>
        </div>
        <div style={{fontSize:17,fontWeight:900,color:t.type==="صرف"?"#f87171":"#34d399",letterSpacing:-0.5}}>
          {t.type==="صرف"?"-":"+"}{String(Number(t.amount).toLocaleString("ar-IQ")).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[d])} {t.currency==="دولار"?"$":"د.ع"}
        </div>
      </div>
      {showUser&&<div style={{fontSize:12,color:"#f59e0b",fontWeight:600,marginBottom:3}}>{t.userName}</div>}
      {t.projectName&&<div style={{fontSize:13,color:"#9ca3af"}}>{t.projectName}</div>}
      <div style={{fontSize:12,color:"#6b7280",marginTop:4}}>📅 {t.date}</div>
      {t.note&&<div style={{fontSize:13,color:"#d1d5db",marginTop:8,background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"8px 12px",border:"1px solid rgba(255,255,255,0.05)"}}>{t.note}</div>}
      {t.image&&<img src={t.image} style={{width:"100%",maxHeight:180,objectFit:"cover",borderRadius:12,marginTop:10,cursor:"pointer"}} alt="وصل" onClick={()=>onImg&&onImg(t.image)}/>}
      {onDelete&&<button style={{marginTop:10,background:"rgba(127,29,29,0.2)",border:"1px solid rgba(232,69,69,0.2)",borderRadius:8,padding:"7px 14px",color:"#f87171",fontSize:12,cursor:"pointer"}} onClick={onDelete}>🗑️ حذف</button>}
    </div>
  );
}

const S = {
  page:{minHeight:"100vh",background:"#080c14",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"Tahoma,'Segoe UI',sans-serif",direction:"rtl"},
  loginWrap:{width:"100%",maxWidth:440,color:"#fff"},
  loginWrapD:{width:"100%",maxWidth:560,color:"#fff"},
  logo:{textAlign:"center",marginBottom:48},
  logoText:{fontSize:52,fontWeight:900,background:"linear-gradient(135deg,#f59e0b,#ffd27a,#f59e0b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:-2,lineHeight:1},
  logoSub:{fontSize:14,color:"#6b7280",marginTop:6,letterSpacing:1},
  lbl:{textAlign:"center",fontSize:13,color:"#6b7280",marginBottom:16,fontWeight:600,letterSpacing:0.5},
  grid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12},
  gridD:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12},
  userBtn:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:18,padding:"20px 12px 16px",color:"#fff",cursor:"pointer",textAlign:"center",transition:"all 0.2s"},
  mgrBtn:{gridColumn:"1/-1",border:"1px solid rgba(30,111,255,0.3)",background:"rgba(30,111,255,0.06)"},
  partnerBtnStyle:{border:"1px solid rgba(124,58,237,0.3)",background:"rgba(124,58,237,0.06)"},
  uName:{fontSize:17,fontWeight:800,letterSpacing:-0.5,marginBottom:4},
  uRole:{fontSize:11,color:"#6b7280",fontWeight:500},
  av:{width:46,height:46,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,flexShrink:0},
  selCard:{display:"flex",alignItems:"center",gap:14,background:"rgba(245,166,35,0.08)",border:"1px solid rgba(245,166,35,0.2)",borderRadius:16,padding:"16px 20px",marginBottom:28},
  dots:{display:"flex",justifyContent:"center",gap:18,marginBottom:6},
  dot:{width:16,height:16,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.2)",transition:"all 0.15s"},
  pinErr:{textAlign:"center",color:"#f87171",fontSize:13,margin:"8px 0",fontWeight:600},
  numpad:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,margin:"20px auto",maxWidth:320},
  numpadD:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,margin:"20px auto",maxWidth:300},
  numBtn:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:20,color:"#fff",fontSize:24,fontWeight:700,cursor:"pointer",transition:"all 0.15s"},
  numEmpty:{background:"transparent",border:"none",cursor:"default"},
  loginBtn:{width:"100%",background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",borderRadius:16,padding:17,color:"#000",fontSize:17,fontWeight:800,cursor:"pointer",marginBottom:10,boxShadow:"0 8px 24px rgba(245,166,35,0.25)"},
  backBtn:{width:"100%",background:"transparent",border:"1px solid rgba(255,255,255,0.1)",borderRadius:16,padding:15,color:"#6b7280",fontSize:15,cursor:"pointer"},
  appWrap:{width:"100%",maxWidth:430,margin:"0 auto",minHeight:"100vh",display:"flex",flexDirection:"column",color:"#fff",fontFamily:"Tahoma,'Segoe UI',sans-serif",direction:"rtl",background:"#080c14",position:"relative"},
  appWrapD:{width:"100%",display:"flex",flexDirection:"column",minHeight:"100vh",color:"#fff",fontFamily:"Tahoma,'Segoe UI',sans-serif",direction:"rtl",background:"#080c14"},
  header:{background:"rgba(8,12,20,0.95)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100},
  headerD:{background:"rgba(8,12,20,0.95)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"14px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100},
  hName:{fontSize:16,fontWeight:800,letterSpacing:-0.5},
  hRole:{fontSize:11,color:"#f59e0b",fontWeight:600,marginTop:1},
  iconBtn:{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"8px 12px",color:"#6b7280",fontSize:16,cursor:"pointer"},
  outBtn:{background:"rgba(232,69,69,0.08)",border:"1px solid rgba(232,69,69,0.2)",borderRadius:10,padding:"8px 16px",color:"#f87171",fontSize:13,fontWeight:600,cursor:"pointer"},
  sidebar:{width:230,background:"rgba(13,21,37,0.8)",borderLeft:"1px solid rgba(255,255,255,0.06)",padding:"24px 14px",display:"flex",flexDirection:"column",gap:4,flexShrink:0},
  sideBtn:{display:"flex",alignItems:"center",gap:12,background:"transparent",border:"none",color:"#6b7280",cursor:"pointer",padding:"12px 14px",borderRadius:12,fontSize:14,fontWeight:500,width:"100%",textAlign:"right",transition:"all 0.2s"},
  sideBtnA:{color:"#f59e0b",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.15)",fontWeight:700},
  sideIcon:{width:34,height:34,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,background:"rgba(255,255,255,0.05)",flexShrink:0},
  mainContent:{flex:1,padding:"28px 36px",overflowY:"auto"},
  mobileContent:{flex:1,padding:"20px 16px 110px",overflowY:"auto"},
  botNav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(8,12,20,0.97)",backdropFilter:"blur(24px)",borderTop:"1px solid rgba(255,255,255,0.06)",padding:"8px 8px 20px",display:"flex",zIndex:100},
  navBtn:{flex:1,background:"transparent",border:"none",color:"rgba(255,255,255,0.3)",cursor:"pointer",padding:"6px 2px",borderRadius:10,display:"flex",flexDirection:"column",alignItems:"center",gap:4,transition:"all 0.2s"},
  navBtnA:{color:"#f59e0b"},
  navIcon:{width:38,height:30,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,transition:"all 0.2s"},
  navLbl:{fontSize:10,fontWeight:600},
  secTitle:{fontSize:20,fontWeight:800,color:"#f0f4ff",marginBottom:20,letterSpacing:-0.5},
  balCard:{borderRadius:22,padding:"22px 20px",marginBottom:12},
  balLbl:{fontSize:13,color:"rgba(255,255,255,0.7)",fontWeight:600,marginBottom:8},
  balAmt:{fontSize:30,fontWeight:900,letterSpacing:-1,lineHeight:1.1},
  balSub:{fontSize:12,color:"rgba(255,255,255,0.6)",margin:"6px 0 14px"},
  balRow:{display:"flex",gap:20},
  balSt:{fontSize:12,color:"rgba(255,255,255,0.75)",fontWeight:500},
  goldBtn:{width:"100%",background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",borderRadius:14,padding:16,color:"#000",fontSize:16,fontWeight:800,cursor:"pointer",marginBottom:10,letterSpacing:-0.3},
  formCard:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:22},
  filterCard:{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:16,padding:18,marginBottom:16},
  fLbl:{fontSize:12,color:"#6b7280",fontWeight:700,marginBottom:8,marginTop:16,letterSpacing:0.5},
  tRow:{display:"flex",gap:10},
  tBtn:{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:13,color:"#6b7280",fontSize:14,fontWeight:700,cursor:"pointer",transition:"all 0.2s"},
  sel:{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"13px 16px",color:"#fff",fontSize:15,outline:"none"},
  inp:{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"13px 16px",color:"#fff",fontSize:15,outline:"none",boxSizing:"border-box"},
  ta:{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"13px 16px",color:"#fff",fontSize:14,outline:"none",resize:"none",boxSizing:"border-box"},
  imgBtn:{width:"100%",background:"rgba(255,255,255,0.03)",border:"2px dashed rgba(255,255,255,0.12)",borderRadius:14,padding:16,color:"#6b7280",fontSize:14,cursor:"pointer",marginTop:4},
  imgPrev:{width:"100%",maxHeight:200,objectFit:"cover",borderRadius:14,marginTop:12,cursor:"pointer"},
  subBtn:{width:"100%",background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",borderRadius:14,padding:16,color:"#000",fontSize:16,fontWeight:800,cursor:"pointer",marginTop:20,letterSpacing:-0.3},
  canBtn:{width:"100%",background:"transparent",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:15,color:"#6b7280",fontSize:15,cursor:"pointer",marginTop:10},
  backBtn2:{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"8px 14px",color:"#6b7280",fontSize:16,cursor:"pointer",flexShrink:0},
  empty:{textAlign:"center",color:"#374151",padding:48,fontSize:15},
  empCard:{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:"16px",marginBottom:10,cursor:"pointer",textAlign:"right",transition:"all 0.2s"},
  empGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:12,marginBottom:20},
  txCard:{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"14px 16px"},
  txGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:12,marginBottom:16},
  projCard:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"14px 18px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"},
  projRepCard:{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:18,padding:18,marginBottom:12,cursor:"pointer",textAlign:"right",color:"#fff",transition:"all 0.2s"},
  specBtn:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"10px 18px",color:"#6b7280",fontSize:14,fontWeight:600,cursor:"pointer"},
  specBtnA:{background:"rgba(245,158,11,0.15)",border:"1px solid #f59e0b",color:"#f59e0b"},
  delBtn:{background:"rgba(232,69,69,0.08)",border:"1px solid rgba(232,69,69,0.15)",borderRadius:10,padding:"8px 16px",color:"#f87171",fontSize:13,cursor:"pointer",whiteSpace:"nowrap"},
  progBar:{background:"rgba(255,255,255,0.08)",borderRadius:999,height:8,overflow:"hidden",marginTop:12},
  progFill:{background:"linear-gradient(90deg,#1d4ed8,#3b82f6)",height:"100%",borderRadius:999,transition:"width 0.6s ease"},
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",backdropFilter:"blur(10px)"},
  fullImg:{maxWidth:"95%",maxHeight:"90vh",borderRadius:16,objectFit:"contain"},
};
