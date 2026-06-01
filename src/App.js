
import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, setDoc } from "firebase/firestore";

const USERS = [
  { id: "manager",  name: "المدير المالي", role: "manager",   pin: "0000" },
  { id: "noor",     name: "نور",           role: "partner",   pin: "0000", share: 35, canReceive: false },
  { id: "mohammed", name: "محمد",          role: "partner",   pin: "0000", share: 15, canReceive: false },
  { id: "hussein",  name: "حسين",          role: "employee",  pin: "0000",            canReceive: false },
  { id: "ahmed",    name: "أحمد",          role: "accountant",pin: "0000", share: 15, canReceive: true  },
  { id: "ihab",     name: "إيهاب",         role: "partner",   pin: "0000", share: 35, canReceive: false },
];

const PARTNERS    = USERS.filter(u => u.share && u.role !== "manager");
const WORKERS     = USERS.filter(u => u.role !== "manager");
const ACCOUNTANT  = USERS.find(u => u.role === "accountant"); // أحمد
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
  const [debts,   setDebts]   = useState([]);
  const [debtForm,setDebtForm]= useState({name:"",projectId:"",amount:"",currency:"دينار",lastPayment:"",status:"غير مسدد",note:""});
  const [showDebtForm,setShowDebtForm]=useState(false);
  const imgRef = useRef();

  useEffect(() => {
    const u = [];
    u.push(onSnapshot(query(collection(db,"transactions"),orderBy("date","desc")), s => { setTxs(s.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); }));
    u.push(onSnapshot(collection(db,"projects"), s => setProjs(s.docs.map(d=>({id:d.id,...d.data()})))));
    u.push(onSnapshot(collection(db,"openingBalances"), s => { const o={}; s.docs.forEach(d=>{o[d.id]=d.data();}); setOBs(o); }));
    u.push(onSnapshot(doc(db,"settings","company"), s => { if(s.exists()) setCompSet(s.data()); }));
    u.push(onSnapshot(query(collection(db,"debts"),orderBy("createdAt","desc")), s => setDebts(s.docs.map(d=>({id:d.id,...d.data()})))));
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
    // التحقق حسب النوع
    if(!form.isPersonal&&!form.isAdvance){
      if(user.role==="accountant"){
        // أحمد يستلم: مشروع يحتاج projectId، عام يحتاج generalLabel
        if(form.receiveType==="project"&&!form.projectId)return;
        if(form.receiveType==="general"&&!form.generalLabel?.trim())return;
        if(!form.receiveType)return;
      } else {
        if(!form.projectId)return;
      }
    }
    if(form.isAdvance&&!form.advanceIsPersonal&&!form.projectId)return;
    if(form.isAdvance&&!form.advanceTo)return;

    const p=projs.find(p=>p.id===form.projectId);
    const projName=p?`${p.name} - ${p.spec||p.specialization} - ${p.province}`:"";
    const amt=Number(form.amount);

    // تحديد اسم المشروع أو البند
    const displayName = form.receiveType==="general"
      ? form.generalLabel?.trim()||""
      : projName;

    if(form.isAdvance&&form.advanceTo){
      const receiver=USERS.find(u=>u.id===form.advanceTo);
      const isPersonalAdv = form.advanceIsPersonal;

      // صرف من أحمد (دائماً بدون مشروع من جهته)
      await addDoc(collection(db,"transactions"),{
        userId:user.id, userName:user.name,
        projectId:"", projectName:"",
        type:"صرف", amount:amt,
        currency:form.currency,
        note:`${isPersonalAdv?"سلفة شخصية":"دفعة مشروع"} إلى ${receiver?.name||""}${p?" — "+p.name:""}${form.note?" — "+form.note:""}`,
        date:form.date, image:null, isPersonal:false, isAdvance:true,
        advanceTo:form.advanceTo, advanceToName:receiver?.name||"",
        advanceIsPersonal:isPersonalAdv,
        createdAt:new Date().toISOString(),
      });

      // على الشخص الآخر: إما استلام مشروع أو استلام شخصي
      await addDoc(collection(db,"transactions"),{
        userId:form.advanceTo, userName:receiver?.name||"",
        projectId:isPersonalAdv?"":form.projectId,
        projectName:isPersonalAdv?"":projName,
        type:"استلام", amount:amt,
        currency:form.currency,
        note:`${isPersonalAdv?"سلفة شخصية من أحمد":"استلام دفعة مشروع من أحمد"}${form.note?" — "+form.note:""}`,
        date:form.date, image:null,
        isPersonal:isPersonalAdv,
        isAdvance:true,
        advanceFrom:user.id, advanceFromName:user.name,
        createdAt:new Date().toISOString(),
      });

    } else {
      await addDoc(collection(db,"transactions"),{
        userId:user.id, userName:user.name,
        projectId:form.receiveType==="general"?"":form.projectId||"",
        projectName:displayName,
        type:form.type, amount:amt,
        currency:form.currency, note:form.note, date:form.date,
        image:form.image||null, isPersonal:form.isPersonal||false, isAdvance:false,
        isGeneral:form.receiveType==="general",
        generalLabel:form.generalLabel||"",
        createdAt:new Date().toISOString(),
      });
    }

    setFormOK(true);
    setTimeout(()=>{
      setFormOK(false);
      setForm({type:"استلام",projectId:"",amount:"",currency:"دينار",note:"",date:today(),image:null,isPersonal:false,isAdvance:false,advanceTo:"",advanceIsPersonal:false,receiveType:"",generalLabel:""});
      setView("home");
    },1500);
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

  const addDebt = async () => {
    if(!debtForm.name.trim()||!debtForm.amount) return;
    await addDoc(collection(db,"debts"),{
      name:debtForm.name.trim(), projectId:debtForm.projectId||"",
      projectName:projs.find(p=>p.id===debtForm.projectId)?.name||"",
      amount:Number(debtForm.amount), currency:debtForm.currency,
      lastPayment:debtForm.lastPayment||"", status:debtForm.status,
      note:debtForm.note, createdAt:new Date().toISOString(),
    });
    setDebtForm({name:"",projectId:"",amount:"",currency:"دينار",lastPayment:"",status:"غير مسدد",note:""});
    setShowDebtForm(false);
  };
  const updateDebtStatus = async (id,status) => await setDoc(doc(db,"debts",id),{status},{merge:true});
  const delDebt = async id=>{ if(window.confirm("تحذف هذا الدين؟")) await deleteDoc(doc(db,"debts",id)); };

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

  const workerBals = WORKERS.map(u=>{ const list=txs.filter(t=>t.userId===u.id); const ob=OBs[u.id]||{}; const personalW=list.filter(t=>t.type==="صرف"&&t.isPersonal).reduce((s,t)=>s+t.amount,0)+(ob.personalWithdraw||0); return{...u,din:bal(list,ob,"دينار"),dol:bal(list,ob,"دولار"),cnt:list.length,personalW}; });

  // الصندوق العام = مجموع كل الاستلامات - مجموع كل المصروفات
  const generalFund = () => {
    const allOBdinR = WORKERS.reduce((s,u)=>s+(OBs[u.id]?.dinarReceived||0),0);
    const allOBdinS = WORKERS.reduce((s,u)=>s+(OBs[u.id]?.dinarSpent||0),0);
    const allOBdolR = WORKERS.reduce((s,u)=>s+(OBs[u.id]?.dollarReceived||0),0);
    const allOBdolS = WORKERS.reduce((s,u)=>s+(OBs[u.id]?.dollarSpent||0),0);
    const dinR = txs.filter(t=>t.type==="استلام"&&(t.currency==="دينار"||!t.currency)).reduce((s,t)=>s+t.amount,0)+allOBdinR;
    const dinS = txs.filter(t=>t.type==="صرف"&&(t.currency==="دينار"||!t.currency)).reduce((s,t)=>s+t.amount,0)+allOBdinS;
    const dolR = txs.filter(t=>t.type==="استلام"&&t.currency==="دولار").reduce((s,t)=>s+t.amount,0)+allOBdolR;
    const dolS = txs.filter(t=>t.type==="صرف"&&t.currency==="دولار").reduce((s,t)=>s+t.amount,0)+allOBdolS;
    return{dinR,dinS,dinB:dinR-dinS,dolR,dolS,dolB:dolR-dolS};
  };

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

  const navMgr    = [{icon:"📊",label:"الملخص",v:"home"},{icon:"📄",label:"الكشوفات",v:"statements"},{icon:"📋",label:"المعاملات",v:"allTx"},{icon:"🏗️",label:"المشاريع",v:"projects"},{icon:"💰",label:"المالية",v:"projReport"},{icon:"🏢",label:"الشركة",v:"company"},{icon:"💳",label:"الديون",v:"debts"},{icon:"⚖️",label:"افتتاحي",v:"opening"}];
  const navWorker = user?.role==="accountant"
    ? [{icon:"🏠",label:"الرئيسية",v:"home"},{icon:"➕",label:"استلام/سلفة",v:"add"}]
    : [{icon:"🏠",label:"الرئيسية",v:"home"},{icon:"➕",label:"تسجيل صرف",v:"add"}];
  const navItems  = user?.role==="manager" ? navMgr : navWorker;

  const avatarBg = r => r==="manager"?"linear-gradient(135deg,#1d4ed8,#2563eb)":r==="partner"?"linear-gradient(135deg,#7c3aed,#6d28d9)":r==="accountant"?"linear-gradient(135deg,#1A7A4A,#147A40)":"linear-gradient(135deg,#f59e0b,#d97706)";

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
                  <div style={S.uRole}>{u.role==="manager"?"مدير مالي":u.role==="accountant"?"محاسب 🏦":"موظف"}</div>
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
            <div style={S.dots}>{[0,1,2,3].map(i=><div key={i} style={{...S.dot,background:pin.length>i?C.gold:C.bg3}}/>)}</div>
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
            <div style={S.hRole}>{user.role==="manager"?"مدير مالي":user.role==="accountant"?"محاسب":"موظف"}</div>
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
          <div style={{...S.balCard,background:dinSt.b>=0?"linear-gradient(135deg,#065f46,#047857)":"linear-gradient(135deg,#7f1d1d,#991b1b)",flex:D?1:undefined,marginBottom:D?0:12}}>
            <div style={S.balLbl}>{user.role==="accountant"?"🏦 صندوق أحمد — دينار":"🇮🇶 صندوقك — دينار عراقي"}</div>
            <div style={S.balAmt}>{fmt(Math.abs(dinSt.b),"دينار")}</div>
            <div style={{fontSize:14,fontWeight:800,color:"rgba(255,255,255,0.9)",margin:"4px 0 10px"}}>
              {dinSt.b>0?"✅ مطلوب منك":dinSt.b<0?"⚠️ أنت طالب":"◼️ متوازن"}
            </div>
            <div style={S.balRow}>
              <span style={S.balSt}>↓ استلمت {fmt(dinSt.r,"دينار")}</span>
              <span style={S.balSt}>↑ صرفت {fmt(dinSt.s,"دينار")}</span>
            </div>
            {user.role==="partner"&&(myOB.personalWithdraw>0||myTxs.filter(t=>t.isPersonal&&t.type==="صرف").length>0)&&(
              <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.15)",display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:12,color:"rgba(255,255,255,0.7)"}}>👤 منها سحب شخصي</span>
                <span style={{fontSize:13,fontWeight:800,color:"#c4b5fd"}}>
                  {fmtD(myTxs.filter(t=>t.isPersonal&&t.type==="صرف").reduce((s,t)=>s+t.amount,0)+(myOB.personalWithdraw||0))}
                </span>
              </div>
            )}
          </div>
          <div style={{...S.balCard,background:dolSt.b>=0?"linear-gradient(135deg,#1e40af,#2563eb)":"linear-gradient(135deg,#7f1d1d,#991b1b)",flex:D?1:undefined,marginBottom:16}}>
            <div style={S.balLbl}>{user.role==="accountant"?"🏦 صندوق أحمد — دولار":"🇺🇸 صندوقك — دولار أمريكي"}</div>
            <div style={S.balAmt}>{fmt(Math.abs(dolSt.b),"دولار")}</div>
            <div style={{fontSize:14,fontWeight:800,color:"rgba(255,255,255,0.9)",margin:"4px 0 10px"}}>
              {dolSt.b>0?"✅ مطلوب منك":dolSt.b<0?"⚠️ أنت طالب":"◼️ متوازن"}
            </div>
            <div style={S.balRow}>
              <span style={S.balSt}>↓ استلمت {fmt(dolSt.r,"دولار")}</span>
              <span style={S.balSt}>↑ صرفت {fmt(dolSt.s,"دولار")}</span>
            </div>
          </div>
        </div>
        {!D&&<button style={S.goldBtn} onClick={()=>{setView("add");setForm({type:user.role==="accountant"?"استلام":"صرف",projectId:"",amount:"",currency:"دينار",note:"",date:today(),image:null,isPersonal:false,isAdvance:false,advanceTo:""});}}>
          {user.role==="accountant"?"💰 استلام أو سلفة":"➕ تسجيل مصروف"}
        </button>}
        <div style={S.secTitle}>سجل المعاملات</div>
        {/* ملخص السلف لأحمد */}
        {user.role==="accountant"&&(()=>{
          const advances = myTxs.filter(t=>t.isAdvance&&t.type==="صرف");
          if(advances.length===0)return null;
          const totalAdv = advances.reduce((s,t)=>s+t.amount,0);
          return(
            <div style={{background:`rgba(193,123,47,0.08)`,border:`1px solid rgba(193,123,47,0.25)`,borderRadius:14,padding:"14px 16px",marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:C.gold,marginBottom:10}}>💸 السلف الممنوحة</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:8}}>
                {WORKERS.filter(u=>u.id!=="ahmed").map(u=>{
                  const uAdv=advances.filter(t=>t.advanceTo===u.id).reduce((s,t)=>s+t.amount,0);
                  if(!uAdv)return null;
                  return(
                    <div key={u.id} style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:10,padding:"6px 12px",fontSize:12,fontWeight:700}}>
                      {u.name}: {fmtD(uAdv)}
                    </div>
                  );
                })}
              </div>
              <div style={{fontSize:12,color:C.textMd,fontWeight:600}}>إجمالي السلف: {fmtD(totalAdv)}</div>
            </div>
          );
        })()}
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

            {/* أحمد المحاسب - يستلم فقط أو يعطي سلفة */}
            {user.role==="accountant"&&(
              <>
                <div style={S.fLbl}>نوع المعاملة</div>
                <div style={S.tRow}>
                  <button style={{...S.tBtn,...(!form.isAdvance?{background:"rgba(26,122,74,0.15)",border:`1px solid #1A7A4A`,color:"#1A7A4A"}:{})}} onClick={()=>setForm(f=>({...f,isAdvance:false,type:"استلام",isPersonal:false}))}>
                    ↓ استلام
                  </button>
                  <button style={{...S.tBtn,...(form.isAdvance?{background:"rgba(193,123,47,0.15)",border:`1px solid ${C.gold}`,color:C.gold}:{})}} onClick={()=>setForm(f=>({...f,isAdvance:true,type:"صرف",isPersonal:false,projectId:""}))}>
                    💸 سلفة لشخص
                  </button>
                </div>

                {form.isAdvance&&(
                  <>
                    <div style={S.fLbl}>اختر الشخص</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {WORKERS.filter(u=>u.id!=="ahmed").map(u=>(
                        <button key={u.id} style={{
                          display:"flex",alignItems:"center",gap:8,padding:"10px 12px",
                          borderRadius:12,border:`2px solid ${form.advanceTo===u.id?C.gold:C.cardBorder}`,
                          background:form.advanceTo===u.id?`rgba(193,123,47,0.08)`:C.bg2,
                          cursor:"pointer",textAlign:"right",
                        }} onClick={()=>setForm(f=>({...f,advanceTo:u.id}))}>
                          <div style={{...S.av,width:30,height:30,fontSize:13,borderRadius:9,background:avatarBg(u.role),flexShrink:0}}>{u.name[0]}</div>
                          <div style={{fontSize:13,fontWeight:700,color:form.advanceTo===u.id?C.gold:C.text}}>{u.name}</div>
                        </button>
                      ))}
                    </div>

                    {form.advanceTo&&(
                      <>
                        <div style={S.fLbl}>نوع الدفعة</div>
                        <div style={S.tRow}>
                          <button style={{...S.tBtn,...(!form.advanceIsPersonal?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}}
                            onClick={()=>setForm(f=>({...f,advanceIsPersonal:false}))}>
                            🏗️ للمشروع
                          </button>
                          <button style={{...S.tBtn,...(form.advanceIsPersonal?{background:"rgba(107,63,160,0.15)",border:`1px solid #6B3FA0`,color:"#6B3FA0"}:{})}}
                            onClick={()=>setForm(f=>({...f,advanceIsPersonal:true,projectId:""}))}>
                            👤 شخصي
                          </button>
                        </div>

                        {!form.advanceIsPersonal&&(
                          <>
                            <div style={S.fLbl}>المشروع</div>
                            <select style={S.sel} value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))}>
                              <option value="">اختر المشروع</option>
                              {projs.map(p=><option key={p.id} value={p.id}>{p.name} - {p.spec||p.specialization} - {p.province}</option>)}
                            </select>
                            <div style={{background:"rgba(37,87,167,0.08)",border:`1px solid rgba(37,87,167,0.2)`,borderRadius:10,padding:"10px 14px",marginTop:8,fontSize:13,color:"#2557A7",fontWeight:600}}>
                              💡 ستتسجل كمصروف مشروع باسم {USERS.find(u=>u.id===form.advanceTo)?.name}
                            </div>
                          </>
                        )}

                        {form.advanceIsPersonal&&(
                          <div style={{background:"rgba(107,63,160,0.08)",border:`1px solid rgba(107,63,160,0.2)`,borderRadius:10,padding:"10px 14px",marginTop:8,fontSize:13,color:"#6B3FA0",fontWeight:600}}>
                            💡 ستتسجل كسلفة شخصية على {USERS.find(u=>u.id===form.advanceTo)?.name}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {!form.isAdvance&&(
                  <>
                    <div style={S.fLbl}>نوع الاستلام</div>
                    <div style={S.tRow}>
                      <button style={{...S.tBtn,...(form.receiveType==="project"?{background:"rgba(26,122,74,0.15)",border:`1px solid #1A7A4A`,color:"#1A7A4A"}:{})}}
                        onClick={()=>setForm(f=>({...f,receiveType:"project",generalLabel:""}))}>
                        🏗️ من مشروع
                      </button>
                      <button style={{...S.tBtn,...(form.receiveType==="general"?{background:"rgba(193,123,47,0.15)",border:`1px solid ${C.gold}`,color:C.gold}:{})}}
                        onClick={()=>setForm(f=>({...f,receiveType:"general",projectId:""}))}>
                        📝 عام (بند حر)
                      </button>
                    </div>

                    {form.receiveType==="project"&&(
                      <>
                        <div style={S.fLbl}>المشروع</div>
                        <select style={S.sel} value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))}>
                          <option value="">اختر المشروع</option>
                          {projs.map(p=><option key={p.id} value={p.id}>{p.name} - {p.spec||p.specialization} - {p.province}</option>)}
                        </select>
                      </>
                    )}

                    {form.receiveType==="general"&&(
                      <>
                        <div style={S.fLbl}>اسم البند</div>
                        <input style={S.inp} placeholder="مثال: دفعة عميل، إيجار، تحصيل..." value={form.generalLabel||""} onChange={e=>setForm(f=>({...f,generalLabel:e.target.value}))}/>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* باقي الأشخاص - يصرفون فقط */}
            {user.role!=="accountant"&&(
              <>
                <div style={S.fLbl}>وجهة الصرف</div>
                <div style={S.tRow}>
                  <button style={{...S.tBtn,...(!form.isPersonal?{background:"rgba(192,57,43,0.15)",border:`1px solid #C0392B`,color:"#C0392B"}:{})}} onClick={()=>setForm(f=>({...f,isPersonal:false,isAdvance:false,projectId:""}))}>
                    🏗️ مصروف مشروع
                  </button>
                  {user.role==="partner"&&(
                    <button style={{...S.tBtn,...(form.isPersonal?{background:"rgba(107,63,160,0.15)",border:`1px solid #6B3FA0`,color:"#6B3FA0"}:{})}} onClick={()=>setForm(f=>({...f,isPersonal:true,isAdvance:false,projectId:""}))}>
                      👤 شخصي
                    </button>
                  )}
                </div>

                {!form.isPersonal&&(
                  <>
                    <div style={S.fLbl}>المشروع</div>
                    <select style={S.sel} value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))}>
                      <option value="">اختر المشروع</option>
                      {projs.map(p=><option key={p.id} value={p.id}>{p.name} - {p.spec||p.specialization} - {p.province}</option>)}
                    </select>
                  </>
                )}

                {form.isPersonal&&(
                  <div style={{background:"rgba(107,63,160,0.08)",border:"1px solid rgba(107,63,160,0.2)",borderRadius:10,padding:"10px 14px",marginTop:8,fontSize:13,color:"#6B3FA0",fontWeight:600}}>
                    ⚠️ هذا المبلغ سينقص من رصيدك الشخصي
                  </div>
                )}
              </>
            )}

            <div style={S.fLbl}>العملة</div>
            <div style={S.tRow}>
              <button style={{...S.tBtn,...(form.currency==="دينار"?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}} onClick={()=>setForm(f=>({...f,currency:"دينار"}))}>🇮🇶 دينار</button>
              <button style={{...S.tBtn,...(form.currency==="دولار"?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}} onClick={()=>setForm(f=>({...f,currency:"دولار"}))}>🇺🇸 دولار</button>
            </div>

            <div style={D?{display:"flex",gap:12}:{}}>
              <div style={D?{flex:1}:{}}><div style={S.fLbl}>المبلغ</div><input style={S.inp} type="number" placeholder="٠" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/></div>
              <div style={D?{flex:1}:{}}><div style={S.fLbl}>التاريخ</div><input style={S.inp} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
            </div>

            <div style={S.fLbl}>ملاحظات</div>
            <textarea style={S.ta} placeholder="اكتب تفاصيل..." value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={2}/>

            {!form.isPersonal&&!form.isAdvance&&(
              <>
                <div style={S.fLbl}>صورة الوصل (اختياري)</div>
                <input ref={imgRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={pickImg}/>
                <button style={S.imgBtn} onClick={()=>imgRef.current.click()}>{form.image?"✅ تم اختيار الصورة":"📷 التقط أو اختر صورة"}</button>
                {form.image&&<img src={form.image} style={S.imgPrev} alt="preview" onClick={()=>setViewImg(form.image)}/>}
              </>
            )}

            <button style={{
              ...S.subBtn,
              ...(form.isPersonal?{background:`linear-gradient(135deg,#6B3FA0,#5B21B6)`,color:"#fff"}:{}),
              ...(form.isAdvance?{background:`linear-gradient(135deg,${C.gold},${C.goldD})`,color:"#000"}:{}),
            }} onClick={addTx}>💾 حفظ</button>
            <button style={S.canBtn} onClick={()=>setView("home")}>إلغاء</button>
          </div>
        )}
      </div>
    );

    // MANAGER HOME
    if(user.role==="manager"&&view==="home") {
      const GF = generalFund();
      return (
        <div>
          {/* الصندوق العام */}
          <div style={S.secTitle}>الصندوق العام للشركة</div>
          <div style={D?{display:"flex",gap:12,marginBottom:20}:{marginBottom:20}}>
            {/* دينار */}
            <div style={{...S.balCard,background:GF.dinB>=0?"linear-gradient(135deg,#065f46,#047857)":"linear-gradient(135deg,#7f1d1d,#991b1b)",flex:D?1:undefined,marginBottom:D?0:12}}>
              <div style={S.balLbl}>🇮🇶 الصندوق — دينار عراقي</div>
              <div style={S.balAmt}>{fmt(Math.abs(GF.dinB),"دينار")}</div>
              <div style={{fontSize:14,fontWeight:800,color:"rgba(255,255,255,0.9)",margin:"6px 0 12px"}}>
                {GF.dinB>0?"✅ رصيد موجب":GF.dinB<0?"⚠️ رصيد سالب":"◼️ متوازن"}
              </div>
              <div style={S.balRow}>
                <span style={S.balSt}>↓ إجمالي الاستلام: {fmt(GF.dinR,"دينار")}</span>
                <span style={S.balSt}>↑ إجمالي الصرف: {fmt(GF.dinS,"دينار")}</span>
              </div>
            </div>
            {/* دولار */}
            <div style={{...S.balCard,background:GF.dolB>=0?"linear-gradient(135deg,#1e40af,#2563eb)":"linear-gradient(135deg,#7f1d1d,#991b1b)",flex:D?1:undefined,marginBottom:16}}>
              <div style={S.balLbl}>🇺🇸 الصندوق — دولار أمريكي</div>
              <div style={S.balAmt}>{fmt(Math.abs(GF.dolB),"دولار")}</div>
              <div style={{fontSize:14,fontWeight:800,color:"rgba(255,255,255,0.9)",margin:"6px 0 12px"}}>
                {GF.dolB>0?"✅ رصيد موجب":GF.dolB<0?"⚠️ رصيد سالب":"◼️ متوازن"}
              </div>
              <div style={S.balRow}>
                <span style={S.balSt}>↓ إجمالي الاستلام: {fmt(GF.dolR,"دولار")}</span>
                <span style={S.balSt}>↑ إجمالي الصرف: {fmt(GF.dolS,"دولار")}</span>
              </div>
            </div>
          </div>

          {/* حسابات الأشخاص */}
          <div style={S.secTitle}>صناديق الأشخاص</div>
          <div style={D?S.empGrid:{}}>
            {workerBals.map(e=>(
              <button key={e.id} style={{...S.empCard,...(e.role==="partner"?{border:"1px solid rgba(124,58,237,0.3)",background:"rgba(124,58,237,0.05)"}:{})}} onClick={()=>{setStUser(e.id);setFuFrom("");setFuTo("");setFuProj("all");setFuCur("دينار");setView("statement");}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                  <div style={{...S.av,width:42,height:42,fontSize:18,borderRadius:14,background:avatarBg(e.role)}}>{e.name[0]}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:16,letterSpacing:-0.5}}>{e.name}</div>
                    <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{toAr(e.cnt)} معاملة</div>
                  </div>
                  <div style={{color:"#6b7280",fontSize:14}}>←</div>
                </div>

                {/* الرصيد الكلي - دينار */}
                <div style={{background:e.din.b>=0?"rgba(6,95,70,0.2)":"rgba(127,29,29,0.2)",border:`1px solid ${e.din.b>=0?"rgba(6,95,70,0.4)":"rgba(127,29,29,0.4)"}`,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>🇮🇶 الرصيد الكلي — دينار</div>
                    <div style={{fontSize:12,fontWeight:700,color:e.din.b>=0?"#34d399":"#f87171"}}>{e.din.b>0?"مطلوب منه":e.din.b<0?"طالب":"متوازن"}</div>
                  </div>
                  <div style={{fontSize:17,fontWeight:900,color:e.din.b>=0?"#34d399":"#f87171",letterSpacing:-0.5,marginBottom:6}}>{fmt(Math.abs(e.din.b),"دينار")}</div>
                  <div style={{display:"flex",gap:12,fontSize:11,color:"rgba(255,255,255,0.5)"}}>
                    <span>↓ استلم {fmt(e.din.r,"دينار")}</span>
                    <span>↑ صرف {fmt(e.din.s,"دينار")}</span>
                  </div>
                  {/* السحب الشخصي للشركاء */}
                  {e.role==="partner"&&e.personalW>0&&(
                    <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid rgba(255,255,255,0.08)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:11,color:"#c4b5fd"}}>👤 منها سحب شخصي</span>
                      <span style={{fontSize:12,fontWeight:700,color:"#c4b5fd"}}>{fmtD(e.personalW)}</span>
                    </div>
                  )}
                </div>

                {/* دولار */}
                {(e.dol.r>0||e.dol.s>0)&&(
                  <div style={{background:e.dol.b>=0?"rgba(29,64,175,0.2)":"rgba(127,29,29,0.2)",border:`1px solid ${e.dol.b>=0?"rgba(29,64,175,0.4)":"rgba(127,29,29,0.4)"}`,borderRadius:10,padding:"10px 12px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>🇺🇸 الرصيد الكلي — دولار</div>
                      <div style={{fontSize:12,fontWeight:700,color:e.dol.b>=0?"#60a5fa":"#f87171"}}>{e.dol.b>0?"مطلوب منه":e.dol.b<0?"طالب":"متوازن"}</div>
                    </div>
                    <div style={{fontSize:17,fontWeight:900,color:e.dol.b>=0?"#60a5fa":"#f87171",letterSpacing:-0.5,marginBottom:6}}>{fmt(Math.abs(e.dol.b),"دولار")}</div>
                    <div style={{display:"flex",gap:12,fontSize:11,color:"rgba(255,255,255,0.5)"}}>
                      <span>↓ استلم {fmt(e.dol.r,"دولار")}</span>
                      <span>↑ صرف {fmt(e.dol.s,"دولار")}</span>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {!D&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
              {[["📄 الكشوفات","statements","linear-gradient(135deg,#1A7A4A,#147A40)"],["📋 المعاملات","allTx","linear-gradient(135deg,#1d4ed8,#1455cc)"],["🏗️ المشاريع","projects","linear-gradient(135deg,#065f46,#047857)"],["💰 كشف المشاريع","projReport","linear-gradient(135deg,#b45309,#92400e)"],["🏢 كشف الشركة","company","linear-gradient(135deg,#7c3aed,#5b21b6)"],["💳 الديون","debts","linear-gradient(135deg,#C0392B,#A93226)"]].map(([l,v,bg])=>(
                <button key={v} style={{...S.goldBtn,background:bg,color:"#fff",marginBottom:0}} onClick={()=>setView(v)}>{l}</button>
              ))}
              <button style={{...S.goldBtn,background:"linear-gradient(135deg,#374151,#1f2937)",color:"#fff",gridColumn:"1/-1",marginBottom:0}} onClick={()=>setView("opening")}>⚖️ الأرصدة الافتتاحية</button>
            </div>
          )}
        </div>
      );
    }

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
                  <div style={{fontSize:12,color:"#6B3FA0",marginTop:2,fontWeight:600}}>شريك بنسبة {toAr(p.share)}%</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div style={{background:"rgba(255,255,255,0.05)",borderRadius:12,padding:12}}>
                  <div style={{fontSize:11,color:"#9ca3af",fontWeight:600}}>حصة رأس المال</div>
                  <div style={{fontSize:15,fontWeight:800,color:"#2557A7",marginTop:4,letterSpacing:-0.5}}>{fmtD(p.shareAmt)}</div>
                </div>
                <div style={{background:"rgba(255,255,255,0.05)",borderRadius:12,padding:12}}>
                  <div style={{fontSize:11,color:"#9ca3af",fontWeight:600}}>إجمالي السحوبات</div>
                  <div style={{fontSize:15,fontWeight:800,color:"#f87171",marginTop:4,letterSpacing:-0.5}}>{fmtD(p.withdrawn)}</div>
                </div>
              </div>
              <div style={{background:p.remaining>=0?"rgba(6,95,70,0.3)":"rgba(127,29,29,0.3)",border:`1px solid ${p.remaining>=0?"#047857":"#991b1b"}`,borderRadius:14,padding:"14px",textAlign:"center"}}>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.9)",fontWeight:600}}>{p.remaining>=0?"المتبقي من حصتك":"تجاوزت حصتك"}</div>
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
              <div key={u.id} style={{background:"#fff",border:`1px solid ${isP?"rgba(107,63,160,0.2)":"#E2D9CC"}`,borderRadius:18,padding:18,marginBottom:12,boxShadow:"0 2px 8px rgba(44,24,16,0.06)"}}>
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
    // STATEMENTS - كشف الحسابات
    if(user.role==="manager"&&view==="statements") {
      const stUserObj = USERS.find(u=>u.id===stUser);
      const stOBobj   = OBs[stUser]||{};
      const stTxsAll  = stUser ? txs.filter(t=>{
        if(t.userId!==stUser)return false;
        if(t.currency!==fuCur&&!(fuCur==="دينار"&&!t.currency))return false;
        if(fuProj!=="all"&&t.projectId!==fuProj)return false;
        if(fuFrom&&t.date<fuFrom)return false;
        if(fuTo&&t.date>fuTo)return false;
        return true;
      }) : [];
      const stObR2 = (!fuFrom&&fuProj==="all")?(fuCur==="دينار"?(stOBobj.dinarReceived||0):(stOBobj.dollarReceived||0)):0;
      const stObS2 = (!fuFrom&&fuProj==="all")?(fuCur==="دينار"?(stOBobj.dinarSpent||0):(stOBobj.dollarSpent||0)):0;
      const stR2   = stTxsAll.filter(t=>t.type==="استلام").reduce((s,t)=>s+t.amount,0)+stObR2;
      const stS2   = stTxsAll.filter(t=>t.type==="صرف").reduce((s,t)=>s+t.amount,0)+stObS2;
      const stB2   = stR2-stS2;

      const pdfSt = () => {
        if(!stUserObj) return;
        const pn=fuProj!=="all"?((p=projs.find(p=>p.id===fuProj))=>p?`${p.name}`:"")():"كل المشاريع";
        const obRow=(stObR2||stObS2)?`<tr style="background:#fff8e1"><td>قبل النظام</td><td>-</td><td>رصيد افتتاحي</td><td>${toAr(stObR2.toLocaleString("ar-IQ"))}</td><td>${toAr(stObS2.toLocaleString("ar-IQ"))}</td><td>-</td></tr>`:"";
        const rows=stTxsAll.map(t=>`<tr><td>${t.date}</td><td>${t.projectName||"-"}</td><td style="color:${t.type==='استلام'?'green':'red'}">${t.type}${t.isPersonal?" (شخصي)":""}</td><td>${t.type==='استلام'?toAr(Number(t.amount).toLocaleString("ar-IQ")):'-'}</td><td>${t.type==='صرف'?toAr(Number(t.amount).toLocaleString("ar-IQ")):'-'}</td><td>${t.note||"-"}</td></tr>`).join("");
        const html=`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/><title>كشف - ${stUserObj.name}</title><style>body{font-family:Tahoma,sans-serif;padding:30px;direction:rtl}h1{color:#1d4ed8;font-size:20px}.i{font-size:13px;color:#555;margin:8px 0 20px}.s{display:flex;gap:12px;margin-bottom:24px}.b{border:1px solid #ddd;border-radius:8px;padding:12px;flex:1;text-align:center}.l{font-size:11px;color:#888}.v{font-size:16px;font-weight:bold;margin-top:4px}.g{color:green}.r{color:red}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#1d4ed8;color:#fff;padding:8px}td{padding:7px 8px;border-bottom:1px solid #eee;text-align:center}tr:nth-child(even){background:#f9f9f9}.f{margin-top:24px;font-size:11px;color:#aaa;text-align:center}</style></head><body><h1>كشف حساب — ${stUserObj.name}</h1><div class="i">العملة: ${fuCur} | المشروع: ${pn} | من: ${fuFrom||"البداية"} | إلى: ${fuTo||"الآن"}</div><div class="s"><div class="b"><div class="l">إجمالي الاستلام</div><div class="v g">${fmt(stR2,fuCur)}</div></div><div class="b"><div class="l">إجمالي الصرف</div><div class="v r">${fmt(stS2,fuCur)}</div></div><div class="b"><div class="l">الرصيد</div><div class="v ${stB2>=0?'g':'r'}">${fmt(Math.abs(stB2),fuCur)} ${stB2>=0?'متبقي':'عليه'}</div></div></div><table><thead><tr><th>التاريخ</th><th>المشروع</th><th>النوع</th><th>استلام</th><th>صرف</th><th>ملاحظات</th></tr></thead><tbody>${obRow}${rows}</tbody></table><div class="f">نظام حساب — ${new Date().toLocaleDateString("ar-IQ")}</div></body></html>`;
        const w=window.open("","_blank");w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
      };

      return (
        <div>
          <div style={S.secTitle}>📄 كشف الحسابات</div>
          <div style={D?{display:"flex",gap:20}:{}}>
            {/* فلاتر */}
            <div style={D?{width:300,flexShrink:0}:{}}>
              <div style={S.formCard}>
                <div style={S.fLbl}>اختر الشخص</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {WORKERS.map(u=>(
                    <button key={u.id} style={{
                      display:"flex",alignItems:"center",gap:8,padding:"10px 12px",
                      borderRadius:12,border:`2px solid ${stUser===u.id?C.gold:C.cardBorder}`,
                      background:stUser===u.id?`rgba(193,123,47,0.08)`:C.bg2,
                      cursor:"pointer",transition:"all 0.2s",textAlign:"right",
                    }} onClick={()=>setStUser(u.id)}>
                      <div style={{...S.av,width:32,height:32,fontSize:14,borderRadius:10,background:avatarBg(u.role),flexShrink:0}}>{u.name[0]}</div>
                      <div style={{fontSize:13,fontWeight:700,color:stUser===u.id?C.gold:C.text}}>{u.name}</div>
                    </button>
                  ))}
                </div>

                <div style={S.fLbl}>العملة</div>
                <div style={S.tRow}>
                  <button style={{...S.tBtn,...(fuCur==="دينار"?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}} onClick={()=>setFuCur("دينار")}>🇮🇶 دينار</button>
                  <button style={{...S.tBtn,...(fuCur==="دولار"?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}} onClick={()=>setFuCur("دولار")}>🇺🇸 دولار</button>
                </div>

                <div style={S.fLbl}>المشروع</div>
                <select style={S.sel} value={fuProj} onChange={e=>setFuProj(e.target.value)}>
                  <option value="all">كل المشاريع</option>
                  {projs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>

                <div style={S.fLbl}>من تاريخ</div>
                <input style={S.inp} type="date" value={fuFrom} onChange={e=>setFuFrom(e.target.value)}/>

                <div style={S.fLbl}>إلى تاريخ</div>
                <input style={S.inp} type="date" value={fuTo} onChange={e=>setFuTo(e.target.value)}/>

                {stUser&&<button style={{...S.subBtn,background:`linear-gradient(135deg,${C.blue},${C.blueL})`,color:"#fff"}} onClick={pdfSt}>📄 تصدير PDF</button>}
                <button style={{...S.canBtn,marginTop:8}} onClick={()=>{setFuFrom("");setFuTo("");setFuProj("all");setStUser(null);}}>↺ إعادة تعيين</button>
              </div>
            </div>

            {/* النتائج */}
            <div style={{flex:1}}>
              {!stUser?(
                <div style={{...S.empty,background:C.card,borderRadius:20,border:`1px solid ${C.cardBorder}`,display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
                  <div style={{fontSize:48}}>👆</div>
                  <div style={{fontWeight:700,color:C.textMd}}>اختر شخصاً من القائمة</div>
                  <div style={{fontSize:13,color:C.textSm}}>لعرض كشف حسابه</div>
                </div>
              ):(
                <>
                  {/* بطاقة الرصيد */}
                  <div style={{...S.balCard,background:stB2>=0?"linear-gradient(135deg,#1A7A4A,#147A40)":"linear-gradient(135deg,#C0392B,#A93226)",marginBottom:16}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                      <div style={{...S.av,width:44,height:44,fontSize:19,borderRadius:14,background:"rgba(255,255,255,0.2)"}}>{stUserObj?.name[0]}</div>
                      <div>
                        <div style={{fontSize:18,fontWeight:800,color:"#fff"}}>{stUserObj?.name}</div>
                        <div style={{fontSize:12,color:"rgba(255,255,255,0.8)"}}>كشف حساب — {fuCur}</div>
                      </div>
                    </div>
                    <div style={S.balAmt}>{fmt(Math.abs(stB2),fuCur)}</div>
                    <div style={{fontSize:14,fontWeight:800,color:"rgba(255,255,255,0.9)",margin:"6px 0 12px"}}>
                      {stB2>0?"✅ مطلوب منه":stB2<0?"⚠️ طالب":"◼️ متوازن"}
                    </div>
                    <div style={S.balRow}>
                      <span style={S.balSt}>↓ استلم {fmt(stR2,fuCur)}</span>
                      <span style={S.balSt}>↑ صرف {fmt(stS2,fuCur)}</span>
                    </div>
                  </div>

                  {/* المعاملات */}
                  <div style={{fontSize:13,color:C.textMd,marginBottom:12,fontWeight:600}}>{toAr(stTxsAll.length)} معاملة</div>
                  {stTxsAll.length===0?(
                    <div style={S.empty}>ما في معاملات بهذه الفلاتر</div>
                  ):(
                    <div style={D?S.txGrid:{}}>{stTxsAll.map(t=><TxCard key={t.id} t={t} onDelete={()=>delTx(t.id)} onImg={setViewImg}/>)}</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    // DEBTS
    if(user.role==="manager"&&view==="debts") return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={S.secTitle}>💳 قائمة الديون</div>
          <button style={{...S.goldBtn,width:"auto",padding:"10px 20px",marginBottom:0,background:"linear-gradient(135deg,#C0392B,#A93226)",color:"#fff",fontSize:14}} onClick={()=>setShowDebtForm(v=>!v)}>
            {showDebtForm?"✕ إغلاق":"+ إضافة دين"}
          </button>
        </div>

        {/* نموذج إضافة دين */}
        {showDebtForm&&(
          <div style={{...S.formCard,marginBottom:20}}>
            <div style={D?{display:"flex",gap:12}:{}}>
              <div style={D?{flex:1}:{}}>
                <div style={S.fLbl}>اسم المدين (شخص أو شركة)</div>
                <input style={S.inp} placeholder="مثال: شركة الإنشاء" value={debtForm.name} onChange={e=>setDebtForm(f=>({...f,name:e.target.value}))}/>
              </div>
              <div style={D?{flex:1}:{}}>
                <div style={S.fLbl}>المشروع المرتبط</div>
                <select style={S.sel} value={debtForm.projectId} onChange={e=>setDebtForm(f=>({...f,projectId:e.target.value}))}>
                  <option value="">بدون مشروع</option>
                  {projs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div style={D?{display:"flex",gap:12}:{}}>
              <div style={D?{flex:2}:{}}>
                <div style={S.fLbl}>المبلغ المطلوب</div>
                <input style={S.inp} type="number" placeholder="٠" value={debtForm.amount} onChange={e=>setDebtForm(f=>({...f,amount:e.target.value}))}/>
              </div>
              <div style={D?{flex:1}:{}}>
                <div style={S.fLbl}>العملة</div>
                <div style={S.tRow}>
                  <button style={{...S.tBtn,...(debtForm.currency==="دينار"?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}} onClick={()=>setDebtForm(f=>({...f,currency:"دينار"}))}>🇮🇶</button>
                  <button style={{...S.tBtn,...(debtForm.currency==="دولار"?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}} onClick={()=>setDebtForm(f=>({...f,currency:"دولار"}))}>🇺🇸</button>
                </div>
              </div>
            </div>
            <div style={D?{display:"flex",gap:12}:{}}>
              <div style={D?{flex:1}:{}}>
                <div style={S.fLbl}>تاريخ آخر دفعة</div>
                <input style={S.inp} type="date" value={debtForm.lastPayment} onChange={e=>setDebtForm(f=>({...f,lastPayment:e.target.value}))}/>
              </div>
              <div style={D?{flex:1}:{}}>
                <div style={S.fLbl}>الحالة</div>
                <select style={S.sel} value={debtForm.status} onChange={e=>setDebtForm(f=>({...f,status:e.target.value}))}>
                  <option value="غير مسدد">غير مسدد</option>
                  <option value="مسدد جزئي">مسدد جزئي</option>
                  <option value="مسدد كامل">مسدد كامل</option>
                </select>
              </div>
            </div>
            <div style={S.fLbl}>ملاحظات</div>
            <textarea style={S.ta} placeholder="أي تفاصيل إضافية..." value={debtForm.note} onChange={e=>setDebtForm(f=>({...f,note:e.target.value}))} rows={2}/>
            <button style={{...S.subBtn,background:"linear-gradient(135deg,#C0392B,#A93226)",color:"#fff"}} onClick={addDebt}>💾 حفظ الدين</button>
          </div>
        )}

        {/* ملخص */}
        {debts.length>0&&(
          <div style={{display:"grid",gridTemplateColumns:D?"repeat(3,1fr)":"1fr 1fr",gap:10,marginBottom:20}}>
            {[
              ["❌ غير مسدد",debts.filter(d=>d.status==="غير مسدد").length,"linear-gradient(135deg,#C0392B,#A93226)"],
              ["⚡ مسدد جزئي",debts.filter(d=>d.status==="مسدد جزئي").length,"linear-gradient(135deg,#b45309,#92400e)"],
              ["✅ مسدد كامل",debts.filter(d=>d.status==="مسدد كامل").length,"linear-gradient(135deg,#1A7A4A,#147A40)"],
            ].map(([l,v,bg])=>(
              <div key={l} style={{background:bg,borderRadius:14,padding:"14px 16px",boxShadow:C.shadowMd}}>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.8)",marginBottom:4}}>{l}</div>
                <div style={{fontSize:28,fontWeight:900,color:"#fff"}}>{toAr(v)}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:2}}>دين</div>
              </div>
            ))}
          </div>
        )}

        {/* قائمة الديون */}
        {debts.length===0?<div style={S.empty}>ما في ديون مسجلة</div>:(
          <div style={D?S.txGrid:{}}>
            {debts.map(d=>{
              const statusColor = d.status==="مسدد كامل"?"#1A7A4A":d.status==="مسدد جزئي"?"#b45309":"#C0392B";
              const statusBg = d.status==="مسدد كامل"?"rgba(26,122,74,0.1)":d.status==="مسدد جزئي"?"rgba(180,83,9,0.1)":"rgba(192,57,43,0.1)";
              return(
                <div key={d.id} style={{...S.txCard,marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <div>
                      <div style={{fontWeight:800,fontSize:16,color:C.text,letterSpacing:-0.3}}>{d.name}</div>
                      {d.projectName&&<div style={{fontSize:12,color:C.textMd,marginTop:3}}>🏗️ {d.projectName}</div>}
                    </div>
                    <div style={{textAlign:"left"}}>
                      <div style={{fontSize:18,fontWeight:900,color:"#C0392B",letterSpacing:-0.5}}>
                        {toAr(Number(d.amount).toLocaleString("ar-IQ"))} {d.currency==="دولار"?"$":"د.ع"}
                      </div>
                    </div>
                  </div>

                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <span style={{fontSize:12,fontWeight:700,color:statusColor,background:statusBg,padding:"4px 12px",borderRadius:8,border:`1px solid ${statusColor}33`}}>
                      {d.status}
                    </span>
                    {d.lastPayment&&<span style={{fontSize:12,color:C.textSm}}>📅 آخر دفعة: {d.lastPayment}</span>}
                  </div>

                  {d.note&&<div style={{fontSize:13,color:C.textMd,background:C.bg2,borderRadius:8,padding:"6px 10px",marginBottom:10}}>{d.note}</div>}

                  {/* تغيير الحالة */}
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {["غير مسدد","مسدد جزئي","مسدد كامل"].map(s=>(
                      <button key={s} style={{fontSize:11,fontWeight:700,padding:"5px 10px",borderRadius:8,cursor:"pointer",border:"1px solid",
                        background:d.status===s?(s==="مسدد كامل"?"rgba(26,122,74,0.15)":s==="مسدد جزئي"?"rgba(180,83,9,0.15)":"rgba(192,57,43,0.15)"):"transparent",
                        color:s==="مسدد كامل"?"#1A7A4A":s==="مسدد جزئي"?"#b45309":"#C0392B",
                        borderColor:s==="مسدد كامل"?"rgba(26,122,74,0.3)":s==="مسدد جزئي"?"rgba(180,83,9,0.3)":"rgba(192,57,43,0.3)",
                      }} onClick={()=>updateDebtStatus(d.id,s)}>{s}</button>
                    ))}
                    <button style={{fontSize:11,padding:"5px 10px",borderRadius:8,cursor:"pointer",background:"transparent",color:C.red,border:`1px solid rgba(192,57,43,0.3)`,marginRight:"auto"}} onClick={()=>delDebt(d.id)}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!D&&<button style={S.canBtn} onClick={()=>setView("home")}>← رجوع</button>}
      </div>
    );

    return null;
  }
}

function TxCard({t,showUser,onDelete,onImg}){
  const sp=t.type==="صرف";
  return(
    <div style={{background:"#fff",border:"1px solid #E2D9CC",borderRadius:14,padding:"14px 16px",boxShadow:"0 2px 8px rgba(44,24,16,0.06)",marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{borderRadius:8,padding:"4px 12px",fontSize:12,fontWeight:700,background:sp?"rgba(192,57,43,0.1)":"rgba(26,122,74,0.1)",color:sp?"#C0392B":"#1A7A4A",border:`1px solid ${sp?"rgba(192,57,43,0.2)":"rgba(26,122,74,0.2)"}`}}>{t.type}</span>
          {t.isPersonal&&<span style={{borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,background:"rgba(107,63,160,0.1)",color:"#6B3FA0",border:"1px solid rgba(107,63,160,0.2)"}}>👤 شخصي</span>}
          <span style={{borderRadius:8,padding:"4px 10px",fontSize:11,background:"#F5F0E8",color:"#9B846D",border:"1px solid #E2D9CC"}}>{t.currency||"دينار"}</span>
          {t.isGeneral&&<span style={{borderRadius:8,padding:"4px 10px",fontSize:11,background:"rgba(193,123,47,0.1)",color:C.gold,border:`1px solid rgba(193,123,47,0.2)`}}>📝 عام</span>}
          {t.isAdvance&&<span style={{borderRadius:8,padding:"4px 10px",fontSize:11,background:"rgba(26,122,74,0.1)",color:"#1A7A4A",border:"1px solid rgba(26,122,74,0.2)"}}>💸 سلفة</span>}
        </div>
        <div style={{fontSize:17,fontWeight:900,color:sp?"#C0392B":"#1A7A4A",letterSpacing:-0.5}}>
          {sp?"-":"+"}{String(Number(t.amount).toLocaleString("ar-IQ")).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[d])} {t.currency==="دولار"?"$":"د.ع"}
        </div>
      </div>
      {showUser&&<div style={{fontSize:12,color:"#C17B2F",fontWeight:700,marginBottom:3}}>{t.userName}</div>}
      {t.projectName&&<div style={{fontSize:13,color:"#6B5744"}}>{t.projectName}</div>}
      <div style={{fontSize:12,color:"#9B846D",marginTop:4}}>📅 {t.date}</div>
      {t.note&&<div style={{fontSize:13,color:"#2C1810",marginTop:8,background:"#F5F0E8",borderRadius:10,padding:"8px 12px",border:"1px solid #E2D9CC"}}>{t.note}</div>}
      {t.image&&<img src={t.image} style={{width:"100%",maxHeight:180,objectFit:"cover",borderRadius:12,marginTop:10,cursor:"pointer"}} alt="وصل" onClick={()=>onImg&&onImg(t.image)}/>}
      {onDelete&&<button style={{marginTop:10,background:"rgba(192,57,43,0.06)",border:"1px solid rgba(192,57,43,0.15)",borderRadius:8,padding:"7px 14px",color:"#C0392B",fontSize:12,cursor:"pointer"}} onClick={onDelete}>🗑️ حذف</button>}
    </div>
  );
}

const C = {
  bg:"#F5F0E8",bg2:"#EDE8DD",bg3:"#E4DDD1",
  card:"#FFFFFF",cardBorder:"#E2D9CC",
  text:"#2C1810",textMd:"#6B5744",textSm:"#9B846D",
  gold:"#C17B2F",goldL:"#D4922B",goldD:"#A8641A",
  blue:"#2557A7",blueL:"#3B6EC4",
  green:"#1A7A4A",greenL:"#2A9960",
  red:"#C0392B",redL:"#D44435",
  purple:"#6B3FA0",purpleL:"#8354BC",
  shadow:"0 2px 12px rgba(44,24,16,0.08)",
  shadowMd:"0 4px 24px rgba(44,24,16,0.12)",
};

const S = {
  // ── LOGIN ──
  page:{minHeight:"100vh",background:`linear-gradient(160deg,${C.bg} 0%,${C.bg2} 50%,${C.bg3} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Segoe UI',Tahoma,sans-serif",direction:"rtl"},
  loginWrap:{width:"100%",maxWidth:440,color:C.text},
  loginWrapD:{width:"100%",maxWidth:560,color:C.text},
  logo:{textAlign:"center",marginBottom:48},
  logoText:{fontSize:56,fontWeight:900,background:`linear-gradient(135deg,${C.gold},${C.goldL},${C.goldD})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:-2,lineHeight:1,fontFamily:"Georgia,serif"},
  logoSub:{fontSize:14,color:C.textSm,marginTop:8,letterSpacing:2,textTransform:"uppercase"},
  lbl:{textAlign:"center",fontSize:13,color:C.textMd,marginBottom:16,fontWeight:600},
  grid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12},
  gridD:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12},
  userBtn:{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:18,padding:"20px 12px 16px",color:C.text,cursor:"pointer",textAlign:"center",transition:"all 0.2s",boxShadow:C.shadow},
  mgrBtn:{gridColumn:"1/-1",border:`2px solid ${C.blue}`,background:`rgba(37,87,167,0.06)`},
  partnerBtnStyle:{border:`1px solid ${C.purple}`,background:`rgba(107,63,160,0.06)`},
  uName:{fontSize:16,fontWeight:800,letterSpacing:-0.3,marginBottom:4,color:C.text},
  uRole:{fontSize:11,color:C.textSm,fontWeight:500},
  av:{width:46,height:46,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,flexShrink:0},
  selCard:{display:"flex",alignItems:"center",gap:14,background:`rgba(193,123,47,0.08)`,border:`1px solid rgba(193,123,47,0.25)`,borderRadius:16,padding:"16px 20px",marginBottom:28},
  dots:{display:"flex",justifyContent:"center",gap:18,marginBottom:6},
  dot:{width:16,height:16,borderRadius:"50%",border:`2px solid ${C.cardBorder}`,transition:"all 0.15s"},
  pinErr:{textAlign:"center",color:C.red,fontSize:13,margin:"8px 0",fontWeight:600},
  numpad:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,margin:"20px auto",maxWidth:320},
  numpadD:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,margin:"20px auto",maxWidth:300},
  numBtn:{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:14,padding:20,color:C.text,fontSize:24,fontWeight:700,cursor:"pointer",transition:"all 0.15s",boxShadow:C.shadow},
  numEmpty:{background:"transparent",border:"none",cursor:"default"},
  loginBtn:{width:"100%",background:`linear-gradient(135deg,${C.gold},${C.goldD})`,border:"none",borderRadius:16,padding:17,color:"#fff",fontSize:17,fontWeight:800,cursor:"pointer",marginBottom:10,boxShadow:`0 8px 24px rgba(193,123,47,0.3)`,letterSpacing:0.5},
  backBtn:{width:"100%",background:"transparent",border:`1px solid ${C.cardBorder}`,borderRadius:16,padding:15,color:C.textMd,fontSize:15,cursor:"pointer"},

  // ── APP ──
  appWrap:{width:"100%",maxWidth:430,margin:"0 auto",minHeight:"100vh",display:"flex",flexDirection:"column",color:C.text,fontFamily:"'Segoe UI',Tahoma,sans-serif",direction:"rtl",background:C.bg,position:"relative"},
  appWrapD:{width:"100%",display:"flex",flexDirection:"column",minHeight:"100vh",color:C.text,fontFamily:"'Segoe UI',Tahoma,sans-serif",direction:"rtl",background:C.bg},
  header:{background:"rgba(245,240,232,0.95)",backdropFilter:"blur(20px)",borderBottom:`1px solid ${C.cardBorder}`,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 8px rgba(44,24,16,0.06)"},
  headerD:{background:"rgba(245,240,232,0.95)",backdropFilter:"blur(20px)",borderBottom:`1px solid ${C.cardBorder}`,padding:"14px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 8px rgba(44,24,16,0.06)"},
  hName:{fontSize:16,fontWeight:800,letterSpacing:-0.3,color:C.text},
  hRole:{fontSize:11,color:C.gold,fontWeight:700,marginTop:2},
  iconBtn:{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:10,padding:"8px 12px",color:C.textMd,fontSize:16,cursor:"pointer",boxShadow:C.shadow},
  outBtn:{background:`rgba(192,57,43,0.08)`,border:`1px solid rgba(192,57,43,0.2)`,borderRadius:10,padding:"8px 16px",color:C.red,fontSize:13,fontWeight:600,cursor:"pointer"},

  // ── SIDEBAR ──
  sidebar:{width:230,background:C.bg2,borderLeft:`1px solid ${C.cardBorder}`,padding:"24px 14px",display:"flex",flexDirection:"column",gap:4,flexShrink:0},
  sideBtn:{display:"flex",alignItems:"center",gap:12,background:"transparent",border:"none",color:C.textMd,cursor:"pointer",padding:"12px 14px",borderRadius:12,fontSize:14,fontWeight:500,width:"100%",textAlign:"right",transition:"all 0.2s"},
  sideBtnA:{color:C.gold,background:`rgba(193,123,47,0.1)`,border:`1px solid rgba(193,123,47,0.2)`,fontWeight:700},
  sideIcon:{width:34,height:34,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,background:C.card,boxShadow:C.shadow,flexShrink:0},
  mainContent:{flex:1,padding:"28px 36px",overflowY:"auto",background:C.bg},
  mobileContent:{flex:1,padding:"20px 16px 110px",overflowY:"auto",background:C.bg},

  // ── BOTTOM NAV ──
  botNav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(245,240,232,0.97)",backdropFilter:"blur(24px)",borderTop:`1px solid ${C.cardBorder}`,padding:"8px 8px 20px",display:"flex",zIndex:100,boxShadow:"0 -2px 12px rgba(44,24,16,0.06)"},
  navBtn:{flex:1,background:"transparent",border:"none",color:C.textSm,cursor:"pointer",padding:"6px 2px",borderRadius:10,display:"flex",flexDirection:"column",alignItems:"center",gap:4,transition:"all 0.2s"},
  navBtnA:{color:C.gold},
  navIcon:{width:38,height:30,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,transition:"all 0.2s"},
  navLbl:{fontSize:10,fontWeight:600},

  // ── CONTENT ──
  secTitle:{fontSize:19,fontWeight:800,color:C.text,marginBottom:20,letterSpacing:-0.5},
  balCard:{borderRadius:22,padding:"22px 20px",marginBottom:12,boxShadow:C.shadowMd},
  balLbl:{fontSize:13,color:"rgba(255,255,255,0.85)",fontWeight:600,marginBottom:8},
  balAmt:{fontSize:30,fontWeight:900,letterSpacing:-1,lineHeight:1.1,color:"#fff"},
  balSub:{fontSize:12,color:"rgba(255,255,255,0.7)",margin:"6px 0 14px"},
  balRow:{display:"flex",gap:20},
  balSt:{fontSize:12,color:"rgba(255,255,255,0.8)",fontWeight:500},
  goldBtn:{width:"100%",background:`linear-gradient(135deg,${C.gold},${C.goldD})`,border:"none",borderRadius:14,padding:16,color:"#fff",fontSize:16,fontWeight:800,cursor:"pointer",marginBottom:10,letterSpacing:0.3,boxShadow:`0 4px 16px rgba(193,123,47,0.25)`},

  // ── FORMS ──
  formCard:{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:20,padding:22,boxShadow:C.shadow},
  filterCard:{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:16,padding:18,marginBottom:16,boxShadow:C.shadow},
  fLbl:{fontSize:12,color:C.textMd,fontWeight:700,marginBottom:8,marginTop:16,letterSpacing:0.3},
  tRow:{display:"flex",gap:10},
  tBtn:{flex:1,background:C.bg2,border:`1px solid ${C.cardBorder}`,borderRadius:12,padding:13,color:C.textMd,fontSize:14,fontWeight:700,cursor:"pointer",transition:"all 0.2s"},
  sel:{width:"100%",background:C.bg2,border:`1px solid ${C.cardBorder}`,borderRadius:12,padding:"13px 16px",color:C.text,fontSize:15,outline:"none"},
  inp:{width:"100%",background:C.bg2,border:`1px solid ${C.cardBorder}`,borderRadius:12,padding:"13px 16px",color:C.text,fontSize:15,outline:"none",boxSizing:"border-box"},
  ta:{width:"100%",background:C.bg2,border:`1px solid ${C.cardBorder}`,borderRadius:12,padding:"13px 16px",color:C.text,fontSize:14,outline:"none",resize:"none",boxSizing:"border-box"},
  imgBtn:{width:"100%",background:C.bg2,border:`2px dashed ${C.cardBorder}`,borderRadius:14,padding:16,color:C.textMd,fontSize:14,cursor:"pointer",marginTop:4},
  imgPrev:{width:"100%",maxHeight:200,objectFit:"cover",borderRadius:14,marginTop:12,cursor:"pointer"},
  subBtn:{width:"100%",background:`linear-gradient(135deg,${C.gold},${C.goldD})`,border:"none",borderRadius:14,padding:16,color:"#fff",fontSize:16,fontWeight:800,cursor:"pointer",marginTop:20,letterSpacing:0.3,boxShadow:`0 4px 16px rgba(193,123,47,0.25)`},
  canBtn:{width:"100%",background:"transparent",border:`1px solid ${C.cardBorder}`,borderRadius:14,padding:15,color:C.textMd,fontSize:15,cursor:"pointer",marginTop:10},
  backBtn2:{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:10,padding:"8px 14px",color:C.textMd,fontSize:16,cursor:"pointer",flexShrink:0,boxShadow:C.shadow},
  empty:{textAlign:"center",color:C.textSm,padding:48,fontSize:15},

  // ── CARDS ──
  empCard:{width:"100%",background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:16,padding:"16px",marginBottom:10,cursor:"pointer",textAlign:"right",transition:"all 0.2s",boxShadow:C.shadow},
  empGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:14,marginBottom:20},
  txCard:{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:14,padding:"14px 16px",boxShadow:C.shadow},
  txGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:12,marginBottom:16},
  projCard:{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:14,padding:"14px 18px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:C.shadow},
  projRepCard:{width:"100%",background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:18,padding:18,marginBottom:12,cursor:"pointer",textAlign:"right",color:C.text,transition:"all 0.2s",boxShadow:C.shadow},
  specBtn:{background:C.bg2,border:`1px solid ${C.cardBorder}`,borderRadius:10,padding:"10px 18px",color:C.textMd,fontSize:14,fontWeight:600,cursor:"pointer"},
  specBtnA:{background:`rgba(193,123,47,0.12)`,border:`1px solid ${C.gold}`,color:C.gold},
  delBtn:{background:`rgba(192,57,43,0.06)`,border:`1px solid rgba(192,57,43,0.2)`,borderRadius:10,padding:"8px 16px",color:C.red,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"},
  progBar:{background:C.bg3,borderRadius:999,height:8,overflow:"hidden",marginTop:12},
  progFill:{background:`linear-gradient(90deg,${C.blue},${C.blueL})`,height:"100%",borderRadius:999,transition:"width 0.6s ease"},
  overlay:{position:"fixed",inset:0,background:"rgba(44,24,16,0.7)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",backdropFilter:"blur(10px)"},
  fullImg:{maxWidth:"95%",maxHeight:"90vh",borderRadius:16,objectFit:"contain"},
};
