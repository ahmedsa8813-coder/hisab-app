import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, setDoc } from "firebase/firestore";

const USERS = [
  { id: "manager", name: "المدير المالي", role: "manager", pin: "0000" },
  { id: "noor",     name: "نور",   role: "partner", pin: "1111", share: 35 },
  { id: "mohammed", name: "محمد",  role: "partner", pin: "2222", share: 15 },
  { id: "hussein",  name: "حسين",  role: "employee", pin: "3333" },
  { id: "ahmed",    name: "أحمد",  role: "partner", pin: "4444", share: 15 },
  { id: "ihab",     name: "إيهاب", role: "partner", pin: "5555", share: 35 },
];

const PARTNERS = USERS.filter(u => u.role === "partner");
const EMPLOYEES_ALL = USERS.filter(u => u.role !== "manager");

const SPECIALIZATIONS = ["مقاولات","ديكور","واجهات"];
const PROVINCES = ["بغداد","البصرة","نينوى","أربيل","النجف","كربلاء","الأنبار","ديالى","صلاح الدين","بابل","واسط","ذي قار","المثنى","القادسية","ميسان","كركوك","السليمانية","دهوك","حلبجة"];

const toAr = (n) => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
const fmt = (n, cur) => toAr(Number(n||0).toLocaleString("ar-IQ")) + (cur==="دولار"?" $":" د.ع");
const fmtD = (n) => toAr(Number(n||0).toLocaleString("ar-IQ")) + " د.ع";

function getUserFromURL() {
  const params = new URLSearchParams(window.location.search);
  return USERS.find(u => u.id === params.get("user")) || null;
}
function useLayout() {
  const [layout, setLayout] = useState(window.innerWidth >= 900 ? "desktop" : "mobile");
  useEffect(() => {
    const fn = () => setLayout(window.innerWidth >= 900 ? "desktop" : "mobile");
    window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn);
  }, []);
  return layout;
}

export default function App() {
  const urlUser = getUserFromURL();
  const layout = useLayout();
  const [manualLayout, setManualLayout] = useState(null);
  const D = (manualLayout || layout) === "desktop";

  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState("login");
  const [loginId, setLoginId] = useState(urlUser?.id || null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [view, setView] = useState("home");
  const [transactions, setTransactions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [openingBalances, setOpeningBalances] = useState({});
  const [companySettings, setCompanySettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type:"استلام", projectId:"", amount:"", currency:"دينار", note:"", date:new Date().toISOString().split("T")[0], image:null, isPersonal:false });
  const [formSuccess, setFormSuccess] = useState(false);
  const [newProject, setNewProject] = useState({ name:"", specialization:"مقاولات", province:"بغداد", value:"", currency:"دينار" });
  const [filterUser, setFilterUser] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterCurrency, setFilterCurrency] = useState("دينار");
  const [selectedUserStatement, setSelectedUserStatement] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projFilterFrom, setProjFilterFrom] = useState("");
  const [projFilterTo, setProjFilterTo] = useState("");
  const [viewImage, setViewImage] = useState(null);
  const [openingForm, setOpeningForm] = useState({});
  const [openingSuccess, setOpeningSuccess] = useState(false);
  const [companyForm, setCompanyForm] = useState({});
  const [companySuccess, setCompanySuccess] = useState(false);
  const imgRef = useRef();

  useEffect(() => {
    const unsubs = [];
    unsubs.push(onSnapshot(query(collection(db,"transactions"),orderBy("date","desc")), snap => {
      setTransactions(snap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    }));
    unsubs.push(onSnapshot(collection(db,"projects"), snap => setProjects(snap.docs.map(d=>({id:d.id,...d.data()})))));
    unsubs.push(onSnapshot(collection(db,"openingBalances"), snap => {
      const ob={}; snap.docs.forEach(d=>{ob[d.id]=d.data();}); setOpeningBalances(ob);
    }));
    unsubs.push(onSnapshot(doc(db,"settings","company"), snap => {
      if(snap.exists()) setCompanySettings(snap.data());
    }));
    return () => unsubs.forEach(u=>u());
  }, []);

  const handleImageChange = (e) => {
    const file=e.target.files[0]; if(!file)return;
    const r=new FileReader(); r.onload=ev=>setForm(f=>({...f,image:ev.target.result})); r.readAsDataURL(file);
  };

  const handleLogin = () => {
    const u=USERS.find(u=>u.id===loginId);
    if(u&&pin===u.pin){setUser(u);setScreen("app");setView("home");setPinError(false);}
    else{setPinError(true);setPin("");}
  };

  const submitTransaction = async () => {
    if(!form.projectId||!form.amount||!form.date)return;
    const proj=projects.find(p=>p.id===form.projectId);
    await addDoc(collection(db,"transactions"),{
      userId:user.id, userName:user.name,
      projectId:form.projectId,
      projectName:proj?`${proj.name} - ${proj.specialization} - ${proj.province}`:"",
      type:form.type, amount:Number(form.amount),
      currency:form.currency, note:form.note, date:form.date,
      image:form.image||null, isPersonal:form.isPersonal||false,
      createdAt:new Date().toISOString(),
    });
    setFormSuccess(true);
    setTimeout(()=>{
      setFormSuccess(false);
      setForm({type:"استلام",projectId:"",amount:"",currency:"دينار",note:"",date:new Date().toISOString().split("T")[0],image:null,isPersonal:false});
      setView("home");
    },1500);
  };

  const saveOpeningBalances = async () => {
    for(const uid of Object.keys(openingForm)){
      const d=openingForm[uid];
      await setDoc(doc(db,"openingBalances",uid),{
        dinarReceived:Number(d.dinarReceived||0), dinarSpent:Number(d.dinarSpent||0),
        dollarReceived:Number(d.dollarReceived||0), dollarSpent:Number(d.dollarSpent||0),
        personalWithdraw:Number(d.personalWithdraw||0),
      });
    }
    setOpeningSuccess(true); setTimeout(()=>setOpeningSuccess(false),2000);
  };

  const saveCompanySettings = async () => {
    await setDoc(doc(db,"settings","company"),{
      capital: Number(companyForm.capital||companySettings.capital||0),
      capitalCurrency: companyForm.capitalCurrency||companySettings.capitalCurrency||"دينار",
      note: companyForm.note||companySettings.note||"",
    });
    setCompanySuccess(true); setTimeout(()=>setCompanySuccess(false),2000);
  };

  const addProject = async () => {
    if(!newProject.name.trim())return;
    await addDoc(collection(db,"projects"),{ name:newProject.name.trim(), specialization:newProject.specialization, province:newProject.province, value:Number(newProject.value||0), currency:newProject.currency });
    setNewProject({name:"",specialization:"مقاولات",province:"بغداد",value:"",currency:"دينار"});
  };
  const deleteProject = async (id) => { if(window.confirm("تحذف المشروع؟")) await deleteDoc(doc(db,"projects",id)); };
  const deleteTransaction = async (id) => { if(window.confirm("تحذف المعاملة؟")) await deleteDoc(doc(db,"transactions",id)); };

  const calcBalance = (txList,ob,cur) => {
    const obRec=cur==="دينار"?(ob?.dinarReceived||0):(ob?.dollarReceived||0);
    const obSp=cur==="دينار"?(ob?.dinarSpent||0):(ob?.dollarSpent||0);
    const filtered=txList.filter(t=>t.currency===cur||(cur==="دينار"&&!t.currency));
    const rec=filtered.filter(t=>t.type==="استلام").reduce((s,t)=>s+t.amount,0)+obRec;
    const sp=filtered.filter(t=>t.type==="صرف").reduce((s,t)=>s+t.amount,0)+obSp;
    return{received:rec,spent:sp,balance:rec-sp};
  };

  // Company financial report
  const getCompanyReport = () => {
    const capital = companySettings.capital || 0;
    const partnerReports = PARTNERS.map(p => {
      const tx = transactions.filter(t => t.userId === p.id);
      const personalWithdraws = tx.filter(t => t.type==="صرف" && t.isPersonal).reduce((s,t)=>s+t.amount,0);
      const obPersonal = openingBalances[p.id]?.personalWithdraw || 0;
      const totalPersonalWithdraw = personalWithdraws + obPersonal;
      const shareAmount = capital * p.share / 100;
      const remaining = shareAmount - totalPersonalWithdraw;
      return { ...p, shareAmount, totalPersonalWithdraw, remaining };
    });
    const totalWithdrawn = partnerReports.reduce((s,p)=>s+p.totalPersonalWithdraw,0);
    const netCapital = capital - totalWithdrawn;
    return { capital, partnerReports, totalWithdrawn, netCapital };
  };

  const myTx = transactions.filter(t=>user&&t.userId===user.id);
  const myOB = openingBalances[user?.id]||{};
  const dinarStats = calcBalance(myTx,myOB,"دينار");
  const dollarStats = calcBalance(myTx,myOB,"دولار");
  const myPersonalWithdraw = myTx.filter(t=>t.type==="صرف"&&t.isPersonal).reduce((s,t)=>s+t.amount,0) + (myOB.personalWithdraw||0);

  const employeeBalances = EMPLOYEES_ALL.map(u=>{
    const tx=transactions.filter(t=>t.userId===u.id);
    const ob=openingBalances[u.id]||{};
    return{...u,dinar:calcBalance(tx,ob,"دينار"),dollar:calcBalance(tx,ob,"دولار"),txCount:tx.length};
  });

  const statementUser=USERS.find(u=>u.id===selectedUserStatement);
  const statementOB=openingBalances[selectedUserStatement]||{};
  const statementTxRaw=selectedUserStatement?transactions.filter(t=>{
    if(t.userId!==selectedUserStatement)return false;
    if(t.currency!==filterCurrency&&!(filterCurrency==="دينار"&&!t.currency))return false;
    if(filterProject!=="all"&&t.projectId!==filterProject)return false;
    if(filterFrom&&t.date<filterFrom)return false;
    if(filterTo&&t.date>filterTo)return false;
    return true;
  }):[];
  const obRec=!filterFrom&&filterProject==="all"?(filterCurrency==="دينار"?(statementOB.dinarReceived||0):(statementOB.dollarReceived||0)):0;
  const obSp=!filterFrom&&filterProject==="all"?(filterCurrency==="دينار"?(statementOB.dinarSpent||0):(statementOB.dollarSpent||0)):0;
  const stRec=statementTxRaw.filter(t=>t.type==="استلام").reduce((s,t)=>s+t.amount,0)+obRec;
  const stSp=statementTxRaw.filter(t=>t.type==="صرف").reduce((s,t)=>s+t.amount,0)+obSp;
  const stBal=stRec-stSp;

  const filteredTx=transactions.filter(t=>{
    if(filterUser!=="all"&&t.userId!==filterUser)return false;
    if(filterProject!=="all"&&t.projectId!==filterProject)return false;
    if(filterFrom&&t.date<filterFrom)return false;
    if(filterTo&&t.date>filterTo)return false;
    return true;
  });

  const getProjectReport=(proj,from,to)=>{
    if(!proj)return null;
    const projTx=transactions.filter(t=>t.projectId===proj.id&&t.type==="صرف"&&(!from||t.date>=from)&&(!to||t.date<=to));
    const totalSpent=projTx.reduce((s,t)=>s+t.amount,0);
    const remaining=(proj.value||0)-totalSpent;
    const byEmployee=EMPLOYEES_ALL.map(u=>{const uTx=projTx.filter(t=>t.userId===u.id);return{...u,spent:uTx.reduce((s,t)=>s+t.amount,0),txCount:uTx.length,transactions:uTx};}).filter(u=>u.spent>0);
    return{proj,projTx,totalSpent,remaining,byEmployee};
  };
  const projReport=selectedProject?getProjectReport(selectedProject,projFilterFrom,projFilterTo):null;

  const exportPersonPDF=()=>{
    const projLabel=filterProject!=="all"?((p=projects.find(p=>p.id===filterProject))=>p?`${p.name} - ${p.specialization} - ${p.province}`:"")():"كل المشاريع";
    const obRow=(obRec||obSp)?`<tr style="background:#fff8e1"><td>قبل النظام</td><td>-</td><td style="color:gray">رصيد افتتاحي</td><td>${toAr(obRec.toLocaleString("ar-IQ"))}</td><td>${toAr(obSp.toLocaleString("ar-IQ"))}</td><td>-</td></tr>`:"";
    const rows=statementTxRaw.map(t=>`<tr><td>${t.date}</td><td>${t.projectName}</td><td style="color:${t.type==='استلام'?'green':'red'}">${t.type}${t.isPersonal?" (شخصي)":""}</td><td>${t.type==='استلام'?toAr(Number(t.amount).toLocaleString("ar-IQ")):'-'}</td><td>${t.type==='صرف'?toAr(Number(t.amount).toLocaleString("ar-IQ")):'-'}</td><td>${t.note||"-"}</td></tr>`).join("");
    const html=`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/><title>كشف حساب - ${statementUser?.name}</title><style>body{font-family:Tahoma,sans-serif;padding:30px;color:#111;direction:rtl}h1{color:#1d4ed8;font-size:20px}.info{font-size:13px;color:#555;margin:8px 0 20px}.summary{display:flex;gap:12px;margin-bottom:24px}.box{border:1px solid #ddd;border-radius:8px;padding:12px;flex:1;text-align:center}.label{font-size:11px;color:#888}.val{font-size:16px;font-weight:bold;margin-top:4px}.green{color:#047857}.red{color:#991b1b}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#1d4ed8;color:white;padding:8px}td{padding:7px 8px;border-bottom:1px solid #eee;text-align:center}tr:nth-child(even){background:#f9f9f9}.footer{margin-top:24px;font-size:11px;color:#aaa;text-align:center}</style></head><body><h1>كشف حساب - ${statementUser?.name}</h1><div class="info">العملة: ${filterCurrency} | المشروع: ${projLabel} | من: ${filterFrom||"البداية"} | إلى: ${filterTo||"الآن"}</div><div class="summary"><div class="box"><div class="label">إجمالي الاستلام</div><div class="val green">${fmt(stRec,filterCurrency)}</div></div><div class="box"><div class="label">إجمالي الصرف</div><div class="val red">${fmt(stSp,filterCurrency)}</div></div><div class="box"><div class="label">الرصيد</div><div class="val ${stBal>=0?'green':'red'}">${fmt(Math.abs(stBal),filterCurrency)} ${stBal>=0?'متبقي':'عليه'}</div></div></div><table><thead><tr><th>التاريخ</th><th>المشروع</th><th>النوع</th><th>استلام</th><th>صرف</th><th>ملاحظات</th></tr></thead><tbody>${obRow}${rows}</tbody></table><div class="footer">نظام حساب - ${new Date().toLocaleDateString("ar-IQ")}</div></body></html>`;
    const w=window.open("","_blank");w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
  };

  const exportCompanyPDF=()=>{
    const rep=getCompanyReport();
    const partnerRows=rep.partnerReports.map(p=>`<tr><td>${p.name}</td><td>${toAr(p.share)}%</td><td>${fmtD(p.shareAmount)}</td><td style="color:red">${fmtD(p.totalPersonalWithdraw)}</td><td style="color:${p.remaining>=0?'green':'red'}">${fmtD(Math.abs(p.remaining))} ${p.remaining>=0?'متبقي':'تجاوز'}</td></tr>`).join("");
    const html=`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/><title>الكشف المالي للشركة</title><style>body{font-family:Tahoma,sans-serif;padding:30px;color:#111;direction:rtl}h1{color:#1d4ed8;font-size:22px}h2{color:#374151;font-size:16px;margin-top:24px}.summary{display:flex;gap:12px;margin-bottom:20px}.box{border:1px solid #ddd;border-radius:8px;padding:12px;flex:1;text-align:center}.label{font-size:11px;color:#888}.val{font-size:16px;font-weight:bold;margin-top:4px}.green{color:#047857}.red{color:#991b1b}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#1d4ed8;color:white;padding:10px}td{padding:9px 10px;border-bottom:1px solid #eee;text-align:center}tr:nth-child(even){background:#f9f9f9}.footer{margin-top:24px;font-size:11px;color:#aaa;text-align:center}</style></head><body><h1>الكشف المالي للشركة</h1><div class="summary"><div class="box"><div class="label">رأس المال الكلي</div><div class="val blue">${fmtD(rep.capital)}</div></div><div class="box"><div class="label">إجمالي السحوبات</div><div class="val red">${fmtD(rep.totalWithdrawn)}</div></div><div class="box"><div class="label">صافي رأس المال</div><div class="val green">${fmtD(rep.netCapital)}</div></div></div><h2>حصص الشركاء</h2><table><thead><tr><th>الشريك</th><th>الحصة</th><th>المبلغ</th><th>السحوبات</th><th>المتبقي</th></tr></thead><tbody>${partnerRows}</tbody></table><div class="footer">نظام حساب - ${new Date().toLocaleDateString("ar-IQ")}</div></body></html>`;
    const w=window.open("","_blank");w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
  };

  const exportProjectPDF=()=>{
    if(!projReport)return;
    const{proj,totalSpent,remaining,byEmployee}=projReport;
    const pct=proj.value?Math.min(100,Math.round(totalSpent/proj.value*100)):0;
    const empRows=byEmployee.map(e=>`<tr><td>${e.name}</td><td>${fmtD(e.spent)}</td><td>${toAr(e.txCount)} معاملة</td><td>${proj.value?toAr(Math.round(e.spent/proj.value*100))+"%":"-"}</td></tr>`).join("");
    const txRows=projReport.projTx.map(t=>`<tr><td>${t.date}</td><td>${t.userName}</td><td>${fmtD(t.amount)}</td><td>${t.note||"-"}</td></tr>`).join("");
    const html=`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/><title>الكشف المالي - ${proj.name}</title><style>body{font-family:Tahoma,sans-serif;padding:30px;color:#111;direction:rtl}h1{color:#1d4ed8;font-size:22px}h2{color:#374151;font-size:16px;margin-top:24px}.summary{display:flex;gap:12px;margin-bottom:20px}.box{border:1px solid #ddd;border-radius:8px;padding:12px;flex:1;text-align:center}.label{font-size:11px;color:#888}.val{font-size:15px;font-weight:bold;margin-top:4px}.green{color:#047857}.red{color:#991b1b}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#1d4ed8;color:white;padding:8px}td{padding:7px 8px;border-bottom:1px solid #eee;text-align:center}tr:nth-child(even){background:#f9f9f9}.footer{margin-top:24px;font-size:11px;color:#aaa;text-align:center}</style></head><body><h1>الكشف المالي للمشروع</h1><div>${proj.name} - ${proj.specialization} - ${proj.province}</div><br/><div class="summary"><div class="box"><div class="label">قيمة المشروع</div><div class="val">${fmtD(proj.value)}</div></div><div class="box"><div class="label">إجمالي المصروف</div><div class="val red">${fmtD(totalSpent)}</div></div><div class="box"><div class="label">المتبقي</div><div class="val ${remaining>=0?'green':'red'}">${fmtD(Math.abs(remaining))}</div></div><div class="box"><div class="label">نسبة الصرف</div><div class="val">${toAr(pct)}%</div></div></div><h2>تفصيل الموظفين</h2><table><thead><tr><th>الموظف</th><th>إجمالي الصرف</th><th>عدد المعاملات</th><th>النسبة</th></tr></thead><tbody>${empRows}</tbody></table><h2>تفاصيل المعاملات</h2><table><thead><tr><th>التاريخ</th><th>الموظف</th><th>المبلغ</th><th>ملاحظات</th></tr></thead><tbody>${txRows}</tbody></table><div class="footer">نظام حساب - ${new Date().toLocaleDateString("ar-IQ")}</div></body></html>`;
    const w=window.open("","_blank");w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
  };

  const isPartner = user?.role==="partner";
  const navItems = user?.role==="manager"
    ? [{icon:"📊",label:"الملخص",v:"home"},{icon:"📋",label:"المعاملات",v:"allTx"},{icon:"🏗️",label:"المشاريع",v:"projects"},{icon:"💰",label:"كشف المشاريع",v:"projReport"},{icon:"🏢",label:"كشف الشركة",v:"company"},{icon:"⚖️",label:"افتتاحي",v:"opening"}]
    : [{icon:"🏠",label:"الرئيسية",v:"home"},{icon:"➕",label:"تسجيل",v:"add"}];

  // LOGIN
  if(screen==="login") return (
    <div style={S.page}>
      <div style={D?S.loginWrapD:S.loginWrap}>
        <div style={S.logo}><div style={S.logoText}>حساب</div><div style={S.logoSub}>نظام المصروفيات</div></div>
        {!loginId?(
          <>
            <div style={S.label}>اختر حسابك</div>
            <div style={D?S.userGridD:S.userGrid}>
              {USERS.map(u=>(
                <button key={u.id} style={{...S.userBtn,...(u.role==="manager"?S.managerBtn:{}),...(u.role==="partner"?S.partnerBtn:{})}} onClick={()=>{setLoginId(u.id);setPin("");setPinError(false);}}>
                  <div style={{...S.avatar,background:u.role==="manager"?"linear-gradient(135deg,#1d4ed8,#2563eb)":u.role==="partner"?"linear-gradient(135deg,#7c3aed,#6d28d9)":"linear-gradient(135deg,#f59e0b,#d97706)"}}>{u.name[0]}</div>
                  <div style={S.userBtnName}>{u.name}</div>
                  <div style={S.userBtnRole}>{u.role==="manager"?"مدير مالي":u.role==="partner"?`شريك ${toAr(u.share)}%`:"موظف"}</div>
                </button>
              ))}
            </div>
          </>
        ):(
          <>
            <div style={S.selectedUser}>
              <div style={{...S.avatar,background:USERS.find(u=>u.id===loginId)?.role==="manager"?"linear-gradient(135deg,#1d4ed8,#2563eb)":USERS.find(u=>u.id===loginId)?.role==="partner"?"linear-gradient(135deg,#7c3aed,#6d28d9)":"linear-gradient(135deg,#f59e0b,#d97706)"}}>{USERS.find(u=>u.id===loginId)?.name[0]}</div>
              <div><div style={{fontSize:16,fontWeight:700}}>{USERS.find(u=>u.id===loginId)?.name}</div><div style={{fontSize:12,color:"#9ca3af"}}>{USERS.find(u=>u.id===loginId)?.role==="manager"?"مدير مالي":USERS.find(u=>u.id===loginId)?.role==="partner"?`شريك ${toAr(USERS.find(u=>u.id===loginId)?.share||0)}%`:"موظف"}</div></div>
            </div>
            <div style={S.label}>أدخل الرمز السري</div>
            <div style={S.pinDots}>{[0,1,2,3].map(i=><div key={i} style={{...S.dot,background:pin.length>i?"#f59e0b":"rgba(255,255,255,0.15)"}}/>)}</div>
            {pinError&&<div style={S.pinError}>رمز خاطئ</div>}
            <div style={D?S.numpadD:S.numpad}>
              {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k,i)=>(
                <button key={i} style={k===""?S.numEmpty:S.numBtn} onClick={()=>{if(!k)return;if(k==="⌫"){setPin(p=>p.slice(0,-1));setPinError(false);}else if(pin.length<4)setPin(p=>p+k);}}>{k}</button>
              ))}
            </div>
            <button style={S.loginBtn} onClick={handleLogin}>دخول</button>
            {!urlUser&&<button style={S.backBtn} onClick={()=>{setLoginId(null);setPin("");}}>← رجوع</button>}
          </>
        )}
      </div>
    </div>
  );

  const companyRep = getCompanyReport();

  return (
    <div style={S.page}>
      {viewImage&&<div style={S.imgOverlay} onClick={()=>setViewImage(null)}><img src={viewImage} style={S.imgFull} alt="وصل"/></div>}
      <div style={D?S.appWrapD:S.appWrap}>
        <div style={D?S.headerD:S.header}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{...S.avatar,width:36,height:36,fontSize:15,margin:0,background:user.role==="manager"?"linear-gradient(135deg,#1d4ed8,#2563eb)":user.role==="partner"?"linear-gradient(135deg,#7c3aed,#6d28d9)":"linear-gradient(135deg,#f59e0b,#d97706)"}}>{user.name[0]}</div>
            <div><div style={S.headerName}>{user.name}</div><div style={S.headerRole}>{user.role==="manager"?"مدير مالي":user.role==="partner"?`شريك ${toAr(user.share||0)}%`:"موظف"}</div></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button style={S.layoutBtn} onClick={()=>setManualLayout(D?"mobile":"desktop")}>{D?"📱":"🖥️"}</button>
            <button style={S.logoutBtn} onClick={()=>{setUser(null);setScreen("login");setPin("");setView("home");}}>خروج</button>
          </div>
        </div>

        <div style={D?S.appBodyD:{}}>
          {D&&<div style={S.sidebar}>{navItems.map(n=><button key={n.v} style={{...S.sideBtn,...(view===n.v?S.sideBtnActive:{})}} onClick={()=>setView(n.v)}><span>{n.icon}</span><span>{n.label}</span></button>)}</div>}

          <div style={D?S.mainContent:S.content}>
            {loading&&<div style={S.empty}>جاري التحميل...</div>}

            {/* EMPLOYEE/PARTNER HOME */}
            {!loading&&user.role!=="manager"&&view==="home"&&(
              <div>
                {isPartner&&(
                  <div style={{...S.balCard,background:"linear-gradient(135deg,#7c3aed,#6d28d9)",marginBottom:10}}>
                    <div style={S.balLabel}>🏢 حصتك في الشركة ({toAr(user.share)}%)</div>
                    <div style={S.balAmount}>{fmtD(companyRep.capital * user.share / 100)}</div>
                    <div style={S.balRow}>
                      <span style={S.balStat}>💰 رأس المال: {fmtD(companyRep.capital)}</span>
                      <span style={S.balStat}>↑ سحبت: {fmtD(companyRep.partnerReports.find(p=>p.id===user.id)?.totalPersonalWithdraw||0)}</span>
                    </div>
                    <div style={{marginTop:8,fontSize:14,fontWeight:700,color:"#c4b5fd"}}>
                      المتبقي لك: {fmtD(companyRep.partnerReports.find(p=>p.id===user.id)?.remaining||0)}
                    </div>
                  </div>
                )}
                <div style={D?S.cardsRowD:{}}>
                  <div style={{...S.balCard,background:"linear-gradient(135deg,#065f46,#047857)",flex:D?1:undefined,marginBottom:D?0:10,marginLeft:D?10:0}}>
                    <div style={S.balLabel}>🇮🇶 دينار عراقي</div>
                    <div style={S.balAmount}>{fmt(Math.abs(dinarStats.balance),"دينار")}</div>
                    <div style={S.balSub}>{dinarStats.balance>=0?"متبقي معك":"عليك"}</div>
                    <div style={S.balRow}><span style={S.balStat}>↓ {fmt(dinarStats.received,"دينار")}</span><span style={S.balStat}>↑ {fmt(dinarStats.spent,"دينار")}</span></div>
                  </div>
                  <div style={{...S.balCard,background:"linear-gradient(135deg,#1d4ed8,#2563eb)",flex:D?1:undefined,marginBottom:16}}>
                    <div style={S.balLabel}>🇺🇸 دولار أمريكي</div>
                    <div style={S.balAmount}>{fmt(Math.abs(dollarStats.balance),"دولار")}</div>
                    <div style={S.balSub}>{dollarStats.balance>=0?"متبقي معك":"عليك"}</div>
                    <div style={S.balRow}><span style={S.balStat}>↓ {fmt(dollarStats.received,"دولار")}</span><span style={S.balStat}>↑ {fmt(dollarStats.spent,"دولار")}</span></div>
                  </div>
                </div>
                {!D&&<button style={S.addBtn} onClick={()=>{setView("add");setForm({type:"استلام",projectId:"",amount:"",currency:"دينار",note:"",date:new Date().toISOString().split("T")[0],image:null,isPersonal:false});}}>+ تسجيل معاملة جديدة</button>}
                <div style={S.secTitle}>سجل المعاملات</div>
                {myTx.length===0&&<div style={S.empty}>ما عندك معاملات بعد</div>}
                <div style={D?S.txGridD:{}}>{myTx.map(t=><TxCard key={t.id} t={t} onViewImage={setViewImage} desktop={D}/>)}</div>
              </div>
            )}

            {/* ADD TRANSACTION */}
            {!loading&&user.role!=="manager"&&view==="add"&&(
              <div style={D?{maxWidth:600}:{}}>
                <div style={S.secTitle}>معاملة جديدة</div>
                {formSuccess?<div style={S.successBox}><div style={S.successIcon}>✓</div><div>تم التسجيل!</div></div>:(
                  <div style={S.formCard}>
                    <div style={S.fieldLabel}>نوع المعاملة</div>
                    <div style={S.typeRow}>{["استلام","صرف"].map(t=><button key={t} style={{...S.typeBtn,...(form.type===t?(t==="استلام"?S.typeBtnGreen:S.typeBtnRed):{})}} onClick={()=>setForm(f=>({...f,type:t,isPersonal:false}))}>{t==="استلام"?"↓ استلام":"↑ صرف"}</button>)}</div>

                    {/* Personal withdrawal option for partners */}
                    {isPartner&&form.type==="صرف"&&(
                      <div style={{marginTop:12}}>
                        <div style={S.fieldLabel}>نوع الصرف</div>
                        <div style={S.typeRow}>
                          <button style={{...S.typeBtn,...(!form.isPersonal?S.typeBtnRed:{})}} onClick={()=>setForm(f=>({...f,isPersonal:false}))}>🏗️ تشغيلي</button>
                          <button style={{...S.typeBtn,...(form.isPersonal?S.typeBtnPurple:{})}} onClick={()=>setForm(f=>({...f,isPersonal:true}))}>👤 شخصي</button>
                        </div>
                        {form.isPersonal&&<div style={S.personalNote}>⚠️ هذا المبلغ سينقص من حصتك في الشركة</div>}
                      </div>
                    )}

                    <div style={S.fieldLabel}>العملة</div>
                    <div style={S.typeRow}>{["دينار","دولار"].map(c=><button key={c} style={{...S.typeBtn,...(form.currency===c?S.typeBtnBlue:{})}} onClick={()=>setForm(f=>({...f,currency:c}))}>{c==="دينار"?"🇮🇶 دينار":"🇺🇸 دولار"}</button>)}</div>

                    {!form.isPersonal&&<><div style={S.fieldLabel}>المشروع</div>
                    <select style={S.select} value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))}>
                      <option value="">اختر المشروع</option>
                      {projects.map(p=><option key={p.id} value={p.id}>{p.name} - {p.specialization} - {p.province}</option>)}
                    </select></>}

                    <div style={D?S.rowD:{}}><div style={D?{flex:1}:{}}><div style={S.fieldLabel}>المبلغ</div><input style={S.input} type="number" placeholder="٠" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/></div><div style={D?{flex:1}:{}}><div style={S.fieldLabel}>التاريخ</div><input style={S.input} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div></div>

                    <div style={S.fieldLabel}>ملاحظات</div>
                    <textarea style={S.textarea} placeholder="اكتب تفاصيل..." value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={2}/>

                    {!form.isPersonal&&<><div style={S.fieldLabel}>صورة الوصل (اختياري)</div>
                    <input ref={imgRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handleImageChange}/>
                    <button style={S.imgBtn} onClick={()=>imgRef.current.click()}>{form.image?"✓ تم اختيار الصورة":"📷 التقط أو اختر صورة"}</button>
                    {form.image&&<img src={form.image} style={S.imgPreview} alt="preview" onClick={()=>setViewImage(form.image)}/>}</>}

                    <button style={{...S.submitBtn,...(form.isPersonal?{background:"linear-gradient(135deg,#7c3aed,#6d28d9)"}:{})}} onClick={submitTransaction}>حفظ</button>
                    <button style={S.cancelBtn} onClick={()=>setView("home")}>إلغاء</button>
                  </div>
                )}
              </div>
            )}

            {/* MANAGER HOME */}
            {!loading&&user.role==="manager"&&view==="home"&&(
              <div>
                {/* Company summary card */}
                <div style={{...S.balCard,background:"linear-gradient(135deg,#1e3a5f,#1d4ed8)",marginBottom:16}}>
                  <div style={S.balLabel}>🏢 رأس المال الكلي للشركة</div>
                  <div style={S.balAmount}>{fmtD(companyRep.capital)}</div>
                  <div style={S.balRow}>
                    <span style={S.balStat}>↑ إجمالي السحوبات: {fmtD(companyRep.totalWithdrawn)}</span>
                    <span style={S.balStat}>صافي: {fmtD(companyRep.netCapital)}</span>
                  </div>
                </div>
                <div style={S.secTitle}>ملخص الحسابات</div>
                <div style={D?S.empGridD:{}}>{employeeBalances.map(e=>(
                  <button key={e.id} style={{...S.empCard,...(e.role==="partner"?S.empCardPartner:{})}} onClick={()=>{setSelectedUserStatement(e.id);setFilterFrom("");setFilterTo("");setFilterProject("all");setFilterCurrency("دينار");setView("statement");}}>
                    <div style={S.empTop}>
                      <div style={{...S.avatar,width:40,height:40,fontSize:17,margin:0,background:e.role==="partner"?"linear-gradient(135deg,#7c3aed,#6d28d9)":"linear-gradient(135deg,#f59e0b,#d97706)"}}>{e.name[0]}</div>
                      <div style={{flex:1}}>
                        <div style={S.empName}>{e.name}</div>
                        <div style={S.empSub}>{e.role==="partner"?`شريك ${toAr(e.share)}%`:"موظف"} · {toAr(e.txCount)} معاملة</div>
                      </div>
                      <div style={{textAlign:"center",marginLeft:8}}>
                        <div style={{fontSize:11,color:"#34d399"}}>{fmt(Math.abs(e.dinar.balance),"دينار")}</div>
                        <div style={{fontSize:11,color:"#60a5fa",marginTop:2}}>{fmt(Math.abs(e.dollar.balance),"دولار")}</div>
                      </div>
                      <div style={{color:"#6b7280",marginRight:4}}>←</div>
                    </div>
                  </button>
                ))}</div>
                {!D&&<>
                  <button style={{...S.addBtn,background:"linear-gradient(135deg,#1d4ed8,#2563eb)",marginTop:8}} onClick={()=>setView("allTx")}>📋 كل المعاملات</button>
                  <button style={{...S.addBtn,background:"linear-gradient(135deg,#065f46,#047857)",marginTop:8}} onClick={()=>setView("projects")}>🏗️ إدارة المشاريع</button>
                  <button style={{...S.addBtn,background:"linear-gradient(135deg,#b45309,#92400e)",marginTop:8}} onClick={()=>setView("projReport")}>💰 كشف المشاريع</button>
                  <button style={{...S.addBtn,background:"linear-gradient(135deg,#7c3aed,#6d28d9)",marginTop:8}} onClick={()=>setView("company")}>🏢 كشف الشركة</button>
                  <button style={{...S.addBtn,background:"linear-gradient(135deg,#374151,#1f2937)",marginTop:8}} onClick={()=>setView("opening")}>⚖️ الأرصدة الافتتاحية</button>
                </>}
              </div>
            )}

            {/* COMPANY FINANCIAL REPORT */}
            {!loading&&user.role==="manager"&&view==="company"&&(
              <div>
                <div style={S.secTitle}>🏢 الكشف المالي للشركة</div>
                {/* Settings */}
                <div style={S.filterCard}>
                  <div style={S.fieldLabel}>رأس المال الكلي</div>
                  <input style={S.input} type="number" placeholder={fmtD(companySettings.capital||0)} value={companyForm.capital??""} onChange={e=>setCompanyForm(f=>({...f,capital:e.target.value}))}/>
                  <div style={S.fieldLabel}>ملاحظة</div>
                  <input style={S.input} placeholder="مثال: رأس المال بتاريخ يناير 2026" value={companyForm.note??companySettings.note??""} onChange={e=>setCompanyForm(f=>({...f,note:e.target.value}))}/>
                  {companySuccess&&<div style={{color:"#34d399",fontSize:13,marginTop:8}}>✓ تم الحفظ</div>}
                  <button style={{...S.submitBtn,marginTop:12,background:"linear-gradient(135deg,#1d4ed8,#2563eb)"}} onClick={saveCompanySettings}>💾 حفظ</button>
                </div>

                {/* Main cards */}
                <div style={D?S.cardsRowD:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                  <div style={{...S.miniCard,background:"linear-gradient(135deg,#1e3a5f,#1d4ed8)"}}>
                    <div style={S.miniLabel}>💼 رأس المال الكلي</div>
                    <div style={S.miniVal}>{fmtD(companyRep.capital)}</div>
                  </div>
                  <div style={{...S.miniCard,background:"linear-gradient(135deg,#7f1d1d,#991b1b)"}}>
                    <div style={S.miniLabel}>↑ إجمالي السحوبات</div>
                    <div style={S.miniVal}>{fmtD(companyRep.totalWithdrawn)}</div>
                  </div>
                  <div style={{...S.miniCard,background:"linear-gradient(135deg,#065f46,#047857)"}}>
                    <div style={S.miniLabel}>💰 صافي رأس المال</div>
                    <div style={S.miniVal}>{fmtD(companyRep.netCapital)}</div>
                  </div>
                </div>

                {/* Partners */}
                <div style={S.secTitle}>حصص الشركاء</div>
                <div style={D?S.empGridD:{}}>
                  {companyRep.partnerReports.map(p=>(
                    <div key={p.id} style={S.partnerCard}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                        <div style={{...S.avatar,width:44,height:44,fontSize:18,margin:0,background:"linear-gradient(135deg,#7c3aed,#6d28d9)"}}>{p.name[0]}</div>
                        <div>
                          <div style={{fontWeight:700,fontSize:16}}>{p.name}</div>
                          <div style={{fontSize:12,color:"#a78bfa"}}>شريك {toAr(p.share)}%</div>
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        <div style={S.partnerStat}>
                          <div style={{fontSize:11,color:"#9ca3af"}}>حصة رأس المال</div>
                          <div style={{fontSize:14,fontWeight:700,color:"#60a5fa"}}>{fmtD(p.shareAmount)}</div>
                        </div>
                        <div style={S.partnerStat}>
                          <div style={{fontSize:11,color:"#9ca3af"}}>إجمالي السحوبات</div>
                          <div style={{fontSize:14,fontWeight:700,color:"#f87171"}}>{fmtD(p.totalPersonalWithdraw)}</div>
                        </div>
                      </div>
                      <div style={{marginTop:10,background:p.remaining>=0?"rgba(6,95,70,0.3)":"rgba(127,29,29,0.3)",border:`1px solid ${p.remaining>=0?"#047857":"#991b1b"}`,borderRadius:12,padding:"10px 14px",textAlign:"center"}}>
                        <div style={{fontSize:12,color:"rgba(255,255,255,0.7)"}}>{p.remaining>=0?"المتبقي من حصتك":"تجاوزت حصتك"}</div>
                        <div style={{fontSize:20,fontWeight:900,color:p.remaining>=0?"#34d399":"#f87171"}}>{fmtD(Math.abs(p.remaining))}</div>
                      </div>
                      <div style={{...S.progressBar,marginTop:10}}>
                        <div style={{...S.progressFill,width:`${p.shareAmount?Math.min(100,Math.round(p.totalPersonalWithdraw/p.shareAmount*100)):0}%`,background:"linear-gradient(90deg,#7c3aed,#a78bfa)"}}/>
                      </div>
                      <div style={{fontSize:11,color:"#6b7280",marginTop:4,textAlign:"center"}}>{p.shareAmount?toAr(Math.min(100,Math.round(p.totalPersonalWithdraw/p.shareAmount*100))):0}% مسحوب من الحصة</div>
                    </div>
                  ))}
                </div>
                <button style={{...S.submitBtn,background:"linear-gradient(135deg,#7c3aed,#6d28d9)",marginTop:16}} onClick={exportCompanyPDF}>📄 تصدير PDF</button>
                {!D&&<button style={S.cancelBtn} onClick={()=>setView("home")}>← رجوع</button>}
              </div>
            )}

            {/* MANAGER STATEMENT */}
            {!loading&&user.role==="manager"&&view==="statement"&&(
              <div>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                  {!D&&<button style={S.backIconBtn} onClick={()=>setView("home")}>←</button>}
                  <div style={S.secTitle}>كشف حساب - {statementUser?.name}</div>
                </div>
                <div style={D?S.statementLayoutD:{}}>
                  <div style={D?{width:280}:{}}>
                    <div style={S.filterCard}>
                      <div style={S.fieldLabel}>العملة</div>
                      <div style={S.typeRow}>{["دينار","دولار"].map(c=><button key={c} style={{...S.typeBtn,...(filterCurrency===c?S.typeBtnBlue:{})}} onClick={()=>setFilterCurrency(c)}>{c==="دينار"?"🇮🇶 دينار":"🇺🇸 دولار"}</button>)}</div>
                      <div style={S.fieldLabel}>المشروع</div>
                      <select style={S.select} value={filterProject} onChange={e=>setFilterProject(e.target.value)}><option value="all">كل المشاريع</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name} - {p.specialization} - {p.province}</option>)}</select>
                      <div style={S.fieldLabel}>من تاريخ</div>
                      <input style={S.input} type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)}/>
                      <div style={S.fieldLabel}>إلى تاريخ</div>
                      <input style={S.input} type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)}/>
                      <button style={{...S.submitBtn,marginTop:16,background:"linear-gradient(135deg,#1d4ed8,#2563eb)"}} onClick={exportPersonPDF}>📄 تصدير PDF</button>
                    </div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{...S.balCard,background:stBal>=0?"linear-gradient(135deg,#065f46,#047857)":"linear-gradient(135deg,#7f1d1d,#991b1b)",marginBottom:16}}>
                      <div style={S.balLabel}>الرصيد - {filterCurrency}</div>
                      <div style={S.balAmount}>{fmt(Math.abs(stBal),filterCurrency)}</div>
                      <div style={S.balSub}>{stBal>=0?"متبقي معه":"عليه"}</div>
                      <div style={S.balRow}><span style={S.balStat}>↓ استلم {fmt(stRec,filterCurrency)}</span><span style={S.balStat}>↑ صرف {fmt(stSp,filterCurrency)}</span></div>
                    </div>
                    {statementTxRaw.length===0?<div style={S.empty}>ما في معاملات</div>:<div style={D?S.txGridD:{}}>{statementTxRaw.map(t=><TxCard key={t.id} t={t} onDelete={()=>deleteTransaction(t.id)} onViewImage={setViewImage} desktop={D}/>)}</div>}
                    {!D&&<button style={S.cancelBtn} onClick={()=>setView("home")}>← رجوع</button>}
                  </div>
                </div>
              </div>
            )}

            {/* ALL TX */}
            {!loading&&user.role==="manager"&&view==="allTx"&&(
              <div>
                <div style={S.secTitle}>كل المعاملات</div>
                <div style={D?S.filterRowD:{}}>
                  <div style={S.filterCard}>
                    <div style={S.fieldLabel}>الشخص</div>
                    <select style={S.select} value={filterUser} onChange={e=>setFilterUser(e.target.value)}><option value="all">الكل</option>{EMPLOYEES_ALL.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select>
                    <div style={S.fieldLabel}>المشروع</div>
                    <select style={S.select} value={filterProject} onChange={e=>setFilterProject(e.target.value)}><option value="all">الكل</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name} - {p.specialization} - {p.province}</option>)}</select>
                    <div style={S.fieldLabel}>من تاريخ</div>
                    <input style={S.input} type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)}/>
                    <div style={S.fieldLabel}>إلى تاريخ</div>
                    <input style={S.input} type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:"#9ca3af",marginBottom:12}}>{toAr(filteredTx.length)} معاملة</div>
                    <div style={D?S.txGridD:{}}>{filteredTx.length===0?<div style={S.empty}>ما في نتائج</div>:filteredTx.map(t=><TxCard key={t.id} t={t} showUser onDelete={()=>deleteTransaction(t.id)} onViewImage={setViewImage} desktop={D}/>)}</div>
                    {!D&&<button style={S.cancelBtn} onClick={()=>setView("home")}>← رجوع</button>}
                  </div>
                </div>
              </div>
            )}

            {/* PROJECTS */}
            {!loading&&user.role==="manager"&&view==="projects"&&(
              <div style={D?{maxWidth:700}:{}}>
                <div style={S.secTitle}>إدارة المشاريع</div>
                <div style={S.formCard}>
                  <div style={S.fieldLabel}>اسم المشروع</div>
                  <input style={S.input} placeholder="مثال: برج الأمل" value={newProject.name} onChange={e=>setNewProject(p=>({...p,name:e.target.value}))}/>
                  <div style={S.fieldLabel}>التخصص</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{SPECIALIZATIONS.map(s=><button key={s} style={{...S.specBtn,...(newProject.specialization===s?S.specBtnActive:{})}} onClick={()=>setNewProject(p=>({...p,specialization:s}))}>{s}</button>)}</div>
                  <div style={S.fieldLabel}>المحافظة</div>
                  <select style={S.select} value={newProject.province} onChange={e=>setNewProject(p=>({...p,province:e.target.value}))}>{PROVINCES.map(pr=><option key={pr} value={pr}>{pr}</option>)}</select>
                  <div style={D?S.rowD:{}}>
                    <div style={D?{flex:2}:{}}><div style={S.fieldLabel}>قيمة المشروع</div><input style={S.input} type="number" placeholder="٠" value={newProject.value} onChange={e=>setNewProject(p=>({...p,value:e.target.value}))}/></div>
                    <div style={D?{flex:1}:{}}><div style={S.fieldLabel}>العملة</div><div style={S.typeRow}>{["دينار","دولار"].map(c=><button key={c} style={{...S.typeBtn,...(newProject.currency===c?S.typeBtnBlue:{})}} onClick={()=>setNewProject(p=>({...p,currency:c}))}>{c==="دينار"?"🇮🇶":"🇺🇸"} {c}</button>)}</div></div>
                  </div>
                  <button style={{...S.submitBtn,marginTop:16}} onClick={addProject}>+ إضافة المشروع</button>
                </div>
                <div style={{height:16}}/>
                <div style={D?S.txGridD:{}}>{projects.map(p=>(
                  <div key={p.id} style={S.projCard}>
                    <div><div style={S.projName}>{p.name}</div><div style={S.projMeta}>{p.specialization} · {p.province}</div>{p.value>0&&<div style={{fontSize:12,color:"#f59e0b",marginTop:3}}>قيمة المشروع: {fmtD(p.value)}</div>}</div>
                    <button style={S.deleteBtn} onClick={()=>deleteProject(p.id)}>حذف</button>
                  </div>
                ))}</div>
                {!D&&<button style={S.cancelBtn} onClick={()=>setView("home")}>← رجوع</button>}
              </div>
            )}

            {/* PROJECT REPORT */}
            {!loading&&user.role==="manager"&&view==="projReport"&&(
              <div>
                <div style={S.secTitle}>💰 الكشف المالي للمشاريع</div>
                {!selectedProject?(
                  <div style={D?S.empGridD:{}}>{projects.map(p=>{
                    const rep=getProjectReport(p,"","");
                    const pct=p.value?Math.min(100,Math.round(rep.totalSpent/p.value*100)):0;
                    return(
                      <button key={p.id} style={S.projReportCard} onClick={()=>{setSelectedProject(p);setProjFilterFrom("");setProjFilterTo("");}}>
                        <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>{p.name}</div>
                        <div style={{fontSize:12,color:"#9ca3af",marginBottom:10}}>{p.specialization} · {p.province}</div>
                        {p.value>0&&<><div style={S.progressBar}><div style={{...S.progressFill,width:`${pct}%`}}/></div>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginTop:6}}>
                          <span style={{color:"#f87171"}}>صُرف: {fmtD(rep.totalSpent)}</span>
                          <span style={{color:"#34d399"}}>باقي: {fmtD(p.value-rep.totalSpent)}</span>
                        </div></>}
                      </button>
                    );
                  })}</div>
                ):(
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                      <button style={S.backIconBtn} onClick={()=>setSelectedProject(null)}>←</button>
                      <div style={{fontWeight:700,fontSize:15}}>{selectedProject.name} - {selectedProject.specialization} - {selectedProject.province}</div>
                    </div>
                    <div style={D?S.statementLayoutD:{}}>
                      <div style={D?{width:260}:{}}>
                        <div style={S.filterCard}>
                          <div style={S.fieldLabel}>من تاريخ</div>
                          <input style={S.input} type="date" value={projFilterFrom} onChange={e=>setProjFilterFrom(e.target.value)}/>
                          <div style={S.fieldLabel}>إلى تاريخ</div>
                          <input style={S.input} type="date" value={projFilterTo} onChange={e=>setProjFilterTo(e.target.value)}/>
                          <button style={{...S.submitBtn,marginTop:16,background:"linear-gradient(135deg,#b45309,#92400e)"}} onClick={exportProjectPDF}>📄 تصدير PDF</button>
                        </div>
                      </div>
                      <div style={{flex:1}}>
                        {projReport&&<>
                          <div style={D?S.cardsRowD:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                            <div style={{...S.miniCard,background:"linear-gradient(135deg,#1d4ed8,#2563eb)"}}><div style={S.miniLabel}>قيمة المشروع</div><div style={S.miniVal}>{fmtD(selectedProject.value)}</div></div>
                            <div style={{...S.miniCard,background:"linear-gradient(135deg,#7f1d1d,#991b1b)"}}><div style={S.miniLabel}>إجمالي المصروف</div><div style={S.miniVal}>{fmtD(projReport.totalSpent)}</div></div>
                            <div style={{...S.miniCard,background:projReport.remaining>=0?"linear-gradient(135deg,#065f46,#047857)":"linear-gradient(135deg,#7f1d1d,#991b1b)"}}><div style={S.miniLabel}>{projReport.remaining>=0?"المتبقي":"تجاوز"}</div><div style={S.miniVal}>{fmtD(Math.abs(projReport.remaining))}</div></div>
                            <div style={{...S.miniCard,background:"linear-gradient(135deg,#b45309,#92400e)"}}><div style={S.miniLabel}>نسبة الصرف</div><div style={S.miniVal}>{selectedProject.value?toAr(Math.min(100,Math.round(projReport.totalSpent/selectedProject.value*100)))+"%":"—"}</div></div>
                          </div>
                          {selectedProject.value>0&&<div style={{...S.progressBar,marginBottom:20}}><div style={{...S.progressFill,width:`${Math.min(100,Math.round(projReport.totalSpent/selectedProject.value*100))}%`}}/></div>}
                          <div style={S.secTitle}>تفصيل الموظفين</div>
                          {projReport.byEmployee.length===0?<div style={S.empty}>ما في مصروفات</div>:projReport.byEmployee.map(e=>(
                            <div key={e.id} style={S.empSpendCard}>
                              <div style={{display:"flex",alignItems:"center",gap:10}}>
                                <div style={{...S.avatar,width:36,height:36,fontSize:15,margin:0,background:e.role==="partner"?"linear-gradient(135deg,#7c3aed,#6d28d9)":"linear-gradient(135deg,#f59e0b,#d97706)"}}>{e.name[0]}</div>
                                <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{e.name}</div><div style={{fontSize:11,color:"#6b7280"}}>{toAr(e.txCount)} معاملة</div></div>
                                <div style={{textAlign:"left"}}><div style={{fontSize:15,fontWeight:700,color:"#f87171"}}>{fmtD(e.spent)}</div>{selectedProject.value>0&&<div style={{fontSize:11,color:"#9ca3af"}}>{toAr(Math.round(e.spent/selectedProject.value*100))}%</div>}</div>
                              </div>
                              <div style={{marginTop:8}}><div style={{...S.progressBar,height:6}}><div style={{...S.progressFill,width:`${selectedProject.value?Math.min(100,Math.round(e.spent/selectedProject.value*100)):0}%`,background:"#f87171"}}/></div></div>
                            </div>
                          ))}
                          <div style={{...S.secTitle,marginTop:20}}>كل مصروفات المشروع</div>
                          <div style={D?S.txGridD:{}}>{projReport.projTx.map(t=><TxCard key={t.id} t={t} showUser onDelete={()=>deleteTransaction(t.id)} onViewImage={setViewImage} desktop={D}/>)}</div>
                        </>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* OPENING BALANCES */}
            {!loading&&user.role==="manager"&&view==="opening"&&(
              <div style={D?{maxWidth:900}:{}}>
                <div style={S.secTitle}>⚖️ الأرصدة الافتتاحية</div>
                {openingSuccess&&<div style={{...S.successBox,padding:16,marginBottom:16}}>✓ تم الحفظ!</div>}
                <div style={D?S.empGridD:{}}>{EMPLOYEES_ALL.map(u=>{
                  const ob=openingBalances[u.id]||{};
                  const of=openingForm[u.id]||{};
                  const isP=u.role==="partner";
                  return(
                    <div key={u.id} style={{...S.obCard,...(isP?{border:"1px solid rgba(124,58,237,0.3)"}:{})}}>
                      <div style={S.obHeader}>
                        <div style={{...S.avatar,width:36,height:36,fontSize:16,margin:0,background:isP?"linear-gradient(135deg,#7c3aed,#6d28d9)":"linear-gradient(135deg,#f59e0b,#d97706)"}}>{u.name[0]}</div>
                        <div><div style={{fontWeight:700,fontSize:15}}>{u.name}</div><div style={{fontSize:11,color:isP?"#a78bfa":"#9ca3af"}}>{isP?`شريك ${toAr(u.share)}%`:"موظف"}</div></div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
                        {[["dinarReceived","🇮🇶 دينار استلم"],["dinarSpent","🇮🇶 دينار صرف"],["dollarReceived","🇺🇸 دولار استلم"],["dollarSpent","🇺🇸 دولار صرف"]].map(([k,l])=>(
                          <div key={k}><div style={{fontSize:11,color:"#9ca3af",marginBottom:4}}>{l}</div><input style={{...S.input,fontSize:13,padding:"8px 10px"}} type="number" placeholder={toAr(ob[k]||0)} value={of[k]??""} onChange={e=>setOpeningForm(f=>({...f,[u.id]:{...(f[u.id]||{}),[k]:e.target.value}}))}/></div>
                        ))}
                        {isP&&<div style={{gridColumn:"1/-1"}}><div style={{fontSize:11,color:"#a78bfa",marginBottom:4}}>👤 سحب شخصي سابق</div><input style={{...S.input,fontSize:13,padding:"8px 10px",border:"1px solid rgba(124,58,237,0.4)"}} type="number" placeholder={toAr(ob.personalWithdraw||0)} value={of.personalWithdraw??""} onChange={e=>setOpeningForm(f=>({...f,[u.id]:{...(f[u.id]||{}),personalWithdraw:e.target.value}}))}/></div>}
                      </div>
                    </div>
                  );
                })}</div>
                <button style={{...S.submitBtn,marginTop:20,background:"linear-gradient(135deg,#7c3aed,#6d28d9)"}} onClick={saveOpeningBalances}>💾 حفظ الأرصدة الافتتاحية</button>
                {!D&&<button style={S.cancelBtn} onClick={()=>setView("home")}>← رجوع</button>}
              </div>
            )}
          </div>
        </div>

        {!D&&(
          <div style={S.bottomNav}>
            {navItems.map(n=><button key={n.v} style={{...S.navBtn,...(view===n.v?S.navActive:{})}} onClick={()=>setView(n.v)}><span>{n.icon}</span><span style={{fontSize:9}}>{n.label}</span></button>)}
          </div>
        )}
      </div>
    </div>
  );
}

function TxCard({t,showUser,onDelete,onViewImage,desktop}){
  return(
    <div style={{...S.txCard,...(desktop?S.txCardD:{})}}>
      <div style={S.txTop}>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{...S.txBadge,background:t.type==="صرف"?"#7f1d1d":"#064e3b"}}>{t.type}</div>
          {t.isPersonal&&<div style={{...S.txBadge,background:"rgba(124,58,237,0.4)",fontSize:10}}>👤 شخصي</div>}
          <div style={{...S.txBadge,background:t.currency==="دولار"?"#1e3a5f":"#1a2e1a",fontSize:11}}>{t.currency||"دينار"}</div>
        </div>
        <div style={S.txAmount}>{t.type==="صرف"?"-":"+"}{toAr(Number(t.amount).toLocaleString("ar-IQ"))} {t.currency==="دولار"?"$":"د.ع"}</div>
      </div>
      {showUser&&<div style={S.txUser}>{t.userName}</div>}
      {t.projectName&&<div style={S.txMeta}>{t.projectName}</div>}
      <div style={S.txMeta2}>📅 {t.date}</div>
      {t.note&&<div style={S.txNote}>{t.note}</div>}
      {t.image&&<img src={t.image} style={S.txImg} alt="وصل" onClick={()=>onViewImage&&onViewImage(t.image)}/>}
      {onDelete&&<button style={S.deleteTxBtn} onClick={onDelete}>🗑️ حذف</button>}
    </div>
  );
}

const S={
  page:{minHeight:"100vh",background:"#0a0a0f",display:"flex",justifyContent:"center",fontFamily:"Tahoma,'Segoe UI',sans-serif",direction:"rtl"},
  loginWrap:{width:"100%",maxWidth:420,padding:"40px 24px 60px",color:"#fff"},
  loginWrapD:{width:"100%",maxWidth:560,padding:"60px 40px",color:"#fff"},
  logo:{textAlign:"center",marginBottom:40},
  logoText:{fontSize:40,fontWeight:900,color:"#f59e0b",letterSpacing:-1},
  logoSub:{fontSize:14,color:"#6b7280",marginTop:4},
  label:{fontSize:14,color:"#9ca3af",marginBottom:12,textAlign:"center"},
  userGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12},
  userGridD:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12},
  userBtn:{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:16,padding:"16px 12px",color:"#fff",cursor:"pointer",textAlign:"center"},
  managerBtn:{border:"1px solid rgba(59,130,246,0.4)",background:"rgba(59,130,246,0.08)",gridColumn:"1/-1"},
  partnerBtn:{border:"1px solid rgba(124,58,237,0.4)",background:"rgba(124,58,237,0.08)"},
  avatar:{width:46,height:46,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,margin:"0 auto 8px"},
  userBtnName:{fontSize:14,fontWeight:600},
  userBtnRole:{fontSize:12,color:"#9ca3af",marginTop:2},
  selectedUser:{display:"flex",alignItems:"center",gap:12,background:"rgba(245,158,11,0.1)",borderRadius:12,padding:"16px",marginBottom:24,color:"#fff"},
  pinDots:{display:"flex",justifyContent:"center",gap:16,marginBottom:8},
  dot:{width:18,height:18,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.3)"},
  pinError:{textAlign:"center",color:"#f87171",fontSize:13,marginBottom:8},
  numpad:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,margin:"16px 0"},
  numpadD:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,margin:"16px auto",maxWidth:300},
  numBtn:{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:14,padding:"18px",color:"#fff",fontSize:22,fontWeight:600,cursor:"pointer"},
  numEmpty:{background:"transparent",border:"none"},
  loginBtn:{width:"100%",background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",borderRadius:14,padding:"16px",color:"#000",fontSize:17,fontWeight:700,cursor:"pointer",marginBottom:10},
  backBtn:{width:"100%",background:"transparent",border:"1px solid rgba(255,255,255,0.15)",borderRadius:14,padding:"14px",color:"#9ca3af",fontSize:15,cursor:"pointer"},
  appWrap:{width:"100%",maxWidth:420,display:"flex",flexDirection:"column",minHeight:"100vh",color:"#fff"},
  appWrapD:{width:"100%",display:"flex",flexDirection:"column",minHeight:"100vh",color:"#fff"},
  header:{background:"rgba(255,255,255,0.04)",borderBottom:"1px solid rgba(255,255,255,0.08)",padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"},
  headerD:{background:"rgba(255,255,255,0.04)",borderBottom:"1px solid rgba(255,255,255,0.08)",padding:"14px 28px",display:"flex",justifyContent:"space-between",alignItems:"center"},
  appBodyD:{display:"flex",flex:1,overflow:"hidden"},
  sidebar:{width:220,background:"rgba(255,255,255,0.03)",borderLeft:"1px solid rgba(255,255,255,0.06)",padding:"20px 12px",display:"flex",flexDirection:"column",gap:4,flexShrink:0},
  sideBtn:{display:"flex",alignItems:"center",gap:10,background:"transparent",border:"none",color:"#6b7280",cursor:"pointer",padding:"12px 14px",borderRadius:12,fontSize:14,width:"100%",textAlign:"right"},
  sideBtnActive:{color:"#f59e0b",background:"rgba(245,158,11,0.1)"},
  mainContent:{flex:1,padding:"28px 32px",overflowY:"auto"},
  content:{flex:1,padding:"20px 16px 100px",overflowY:"auto"},
  headerName:{fontSize:16,fontWeight:700},
  headerRole:{fontSize:12,color:"#f59e0b",marginTop:2},
  logoutBtn:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"8px 14px",color:"#9ca3af",fontSize:13,cursor:"pointer"},
  layoutBtn:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"8px 12px",color:"#9ca3af",fontSize:16,cursor:"pointer"},
  balCard:{borderRadius:20,padding:"20px",marginBottom:10},
  cardsRowD:{display:"flex",gap:16,marginBottom:16},
  balLabel:{fontSize:13,color:"rgba(255,255,255,0.7)",marginBottom:8},
  balAmount:{fontSize:28,fontWeight:900},
  balSub:{fontSize:13,color:"rgba(255,255,255,0.6)",marginBottom:12},
  balRow:{display:"flex",gap:16},
  balStat:{fontSize:12,color:"rgba(255,255,255,0.7)"},
  addBtn:{width:"100%",background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",borderRadius:14,padding:"16px",color:"#000",fontSize:16,fontWeight:700,cursor:"pointer",marginBottom:0},
  secTitle:{fontSize:17,fontWeight:700,color:"#d1d5db",marginBottom:16},
  txCard:{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"14px 16px",marginBottom:10},
  txCardD:{marginBottom:0},
  txGridD:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12,marginBottom:16},
  txTop:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6},
  txBadge:{borderRadius:8,padding:"3px 10px",fontSize:12,fontWeight:600},
  txAmount:{fontSize:16,fontWeight:700},
  txUser:{fontSize:12,color:"#f59e0b",marginBottom:2},
  txMeta:{fontSize:13,color:"#9ca3af"},
  txMeta2:{fontSize:12,color:"#6b7280",marginTop:2},
  txNote:{fontSize:13,color:"#d1d5db",marginTop:6,background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"6px 10px"},
  txImg:{width:"100%",maxHeight:160,objectFit:"cover",borderRadius:10,marginTop:8,cursor:"pointer"},
  deleteTxBtn:{marginTop:8,background:"rgba(127,29,29,0.3)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,padding:"6px 12px",color:"#f87171",fontSize:12,cursor:"pointer"},
  empty:{textAlign:"center",color:"#6b7280",padding:40},
  formCard:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:18,padding:20},
  filterCard:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:16,marginBottom:16},
  filterRowD:{display:"flex",gap:20},
  statementLayoutD:{display:"flex",gap:20},
  rowD:{display:"flex",gap:12},
  fieldLabel:{fontSize:13,color:"#9ca3af",marginBottom:8,marginTop:12},
  typeRow:{display:"flex",gap:10},
  typeBtn:{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"12px",color:"#9ca3af",fontSize:14,fontWeight:600,cursor:"pointer"},
  typeBtnGreen:{background:"rgba(6,95,70,0.3)",border:"1px solid #047857",color:"#34d399"},
  typeBtnRed:{background:"rgba(127,29,29,0.3)",border:"1px solid #991b1b",color:"#f87171"},
  typeBtnBlue:{background:"rgba(29,78,216,0.3)",border:"1px solid #2563eb",color:"#60a5fa"},
  typeBtnPurple:{background:"rgba(124,58,237,0.3)",border:"1px solid #7c3aed",color:"#c4b5fd"},
  personalNote:{background:"rgba(124,58,237,0.15)",border:"1px solid rgba(124,58,237,0.3)",borderRadius:10,padding:"8px 12px",fontSize:12,color:"#c4b5fd",marginTop:8},
  specBtn:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 16px",color:"#9ca3af",fontSize:14,cursor:"pointer"},
  specBtnActive:{background:"rgba(245,158,11,0.2)",border:"1px solid #f59e0b",color:"#f59e0b"},
  select:{width:"100%",background:"#1a1a2e",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,padding:"12px 14px",color:"#fff",fontSize:15,outline:"none",boxSizing:"border-box"},
  input:{width:"100%",background:"#1a1a2e",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,padding:"12px 14px",color:"#fff",fontSize:15,outline:"none",boxSizing:"border-box"},
  textarea:{width:"100%",background:"#1a1a2e",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,padding:"12px 14px",color:"#fff",fontSize:14,outline:"none",resize:"none",boxSizing:"border-box"},
  imgBtn:{width:"100%",background:"rgba(255,255,255,0.06)",border:"2px dashed rgba(255,255,255,0.2)",borderRadius:12,padding:"14px",color:"#9ca3af",fontSize:14,cursor:"pointer",marginTop:4},
  imgPreview:{width:"100%",maxHeight:180,objectFit:"cover",borderRadius:10,marginTop:10,cursor:"pointer"},
  submitBtn:{width:"100%",background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",borderRadius:14,padding:"16px",color:"#000",fontSize:16,fontWeight:700,cursor:"pointer",marginTop:16},
  cancelBtn:{width:"100%",background:"transparent",border:"1px solid rgba(255,255,255,0.1)",borderRadius:14,padding:"14px",color:"#9ca3af",fontSize:15,cursor:"pointer",marginTop:10},
  backIconBtn:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"8px 14px",color:"#9ca3af",fontSize:16,cursor:"pointer"},
  successBox:{textAlign:"center",padding:60,color:"#34d399",fontSize:18,fontWeight:700},
  successIcon:{fontSize:56,marginBottom:12},
  empCard:{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"14px 16px",marginBottom:10,cursor:"pointer",textAlign:"right"},
  empCardPartner:{border:"1px solid rgba(124,58,237,0.3)",background:"rgba(124,58,237,0.06)"},
  empGridD:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12,marginBottom:20},
  empTop:{display:"flex",alignItems:"center",gap:12},
  empName:{fontSize:15,fontWeight:600,color:"#fff"},
  empSub:{fontSize:12,color:"#6b7280",marginTop:2},
  partnerCard:{background:"rgba(124,58,237,0.08)",border:"1px solid rgba(124,58,237,0.3)",borderRadius:18,padding:18,marginBottom:12},
  partnerStat:{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 12px"},
  projCard:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"12px 16px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"},
  projReportCard:{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:16,padding:16,marginBottom:12,cursor:"pointer",textAlign:"right",color:"#fff"},
  projName:{fontSize:14,fontWeight:600,color:"#fff"},
  projMeta:{fontSize:12,color:"#6b7280",marginTop:3},
  deleteBtn:{background:"rgba(127,29,29,0.3)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,padding:"6px 14px",color:"#f87171",fontSize:13,cursor:"pointer"},
  progressBar:{background:"rgba(255,255,255,0.1)",borderRadius:999,height:10,overflow:"hidden"},
  progressFill:{background:"linear-gradient(90deg,#1d4ed8,#3b82f6)",height:"100%",borderRadius:999,transition:"width 0.5s"},
  miniCard:{borderRadius:16,padding:"16px",flex:1,marginBottom:10},
  miniLabel:{fontSize:12,color:"rgba(255,255,255,0.7)",marginBottom:6},
  miniVal:{fontSize:18,fontWeight:900},
  empSpendCard:{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"14px 16px",marginBottom:10},
  obCard:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:16,marginBottom:12},
  obHeader:{display:"flex",alignItems:"center",gap:10},
  bottomNav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:420,background:"rgba(10,10,15,0.97)",borderTop:"1px solid rgba(255,255,255,0.08)",display:"flex",padding:"8px 4px 18px"},
  navBtn:{flex:1,background:"transparent",border:"none",color:"#6b7280",cursor:"pointer",padding:"6px 2px",borderRadius:10,display:"flex",flexDirection:"column",alignItems:"center",gap:3,fontSize:10},
  navActive:{color:"#f59e0b",background:"rgba(245,158,11,0.1)"},
  imgOverlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},
  imgFull:{maxWidth:"95%",maxHeight:"90vh",borderRadius:12,objectFit:"contain"},
};
