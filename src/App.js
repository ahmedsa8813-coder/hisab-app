import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, setDoc } from "firebase/firestore";

const USERS = [
  { id: "manager",  name: "المدير المالي", role: "manager",   pin: "000000" },
  { id: "noor",     name: "نور",           role: "partner",   pin: "", share: 35, canReceive: false },
  { id: "mohammed", name: "محمد",          role: "partner",   pin: "", share: 15, canReceive: false },
  { id: "hussein",  name: "حسين",          role: "employee",  pin: "",            canReceive: false },
  { id: "ahmed",    name: "أحمد",          role: "accountant",pin: "", share: 15, canReceive: true  },
  { id: "ihab",     name: "إيهاب",         role: "partner",   pin: "", share: 35, canReceive: false },
  { id: "foreman",  name: "Foreman",       role: "foreman",   pin: "" },
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
  const [module,  setModule]  = useState("finance"); // finance | admin
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
  const [personalDebts,setPersonalDebts]=useState([]);
  const [salaryEmployees,setSalaryEmployees]=useState([]);
  const [salaryPayments,setSalaryPayments]=useState([]);
  const [overtimePayments,setOvertimePayments]=useState([]);
  const [salEmpForm,setSalEmpForm]=useState({name:"",baseSalary:"",currency:"دينار",note:""});
  const [showSalEmpForm,setShowSalEmpForm]=useState(false);
  const [salPayForm,setSalPayForm]=useState({employeeId:"",amount:"",month:"",date:today(),note:""});
  const [showSalPayForm,setShowSalPayForm]=useState(false);
  const [otForm,setOtForm]=useState({employeeId:"",hours:"",ratePerHour:"",amount:"",month:"",date:today(),note:""});
  const [showOtForm,setShowOtForm]=useState(false);
  const [salFilterMonth,setSalFilterMonth]=useState("");
  const [salTab,setSalTab]=useState("summary");
  const [salaryAdvances,setSalaryAdvances]=useState([]);
  const [salAdvForm,setSalAdvForm]=useState({employeeId:"",amount:"",date:today(),note:""});
  const [showSalAdvForm,setShowSalAdvForm]=useState(false);
  const [exchangeRate,setExchangeRate]=useState(1500);
  const [exchInput,setExchInput]=useState("");
  const imgRef = useRef();

  useEffect(() => {
    const u = [];
    u.push(onSnapshot(query(collection(db,"transactions"),orderBy("date","desc")), s => { setTxs(s.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); }));
    u.push(onSnapshot(collection(db,"projects"), s => setProjs(s.docs.map(d=>({id:d.id,...d.data()})))));
    u.push(onSnapshot(collection(db,"openingBalances"), s => { const o={}; s.docs.forEach(d=>{o[d.id]=d.data();}); setOBs(o); }));
    u.push(onSnapshot(doc(db,"settings","company"), s => { if(s.exists()) setCompSet(s.data()); }));
    u.push(onSnapshot(query(collection(db,"debts"),orderBy("createdAt","desc")), s => setDebts(s.docs.map(d=>({id:d.id,...d.data()})))));
    u.push(onSnapshot(query(collection(db,"personalDebts"),orderBy("createdAt","desc")), s => setPersonalDebts(s.docs.map(d=>({id:d.id,...d.data()})))));
    u.push(onSnapshot(collection(db,"salaryEmployees"), s => setSalaryEmployees(s.docs.map(d=>({id:d.id,...d.data()})))));
    u.push(onSnapshot(query(collection(db,"salaryPayments"),orderBy("date","desc")), s => setSalaryPayments(s.docs.map(d=>({id:d.id,...d.data()})))));
    u.push(onSnapshot(query(collection(db,"overtimePayments"),orderBy("date","desc")), s => setOvertimePayments(s.docs.map(d=>({id:d.id,...d.data()})))));
    u.push(onSnapshot(query(collection(db,"salaryAdvances"),orderBy("date","desc")), s => setSalaryAdvances(s.docs.map(d=>({id:d.id,...d.data()})))));
    // تحميل سعر الصرف المحفوظ
    onSnapshot(doc(db,"settings","exchangeRate"), s => { if(s.exists()&&s.data().rate) setExchangeRate(s.data().rate); });
    return () => u.forEach(f=>f());
  }, []);

  const pickImg = e => {
    const f=e.target.files[0]; if(!f)return;
    const r=new FileReader(); r.onload=ev=>setForm(x=>({...x,image:ev.target.result})); r.readAsDataURL(f);
  };

  const doLogin = () => {
    const u=USERS.find(u=>u.id===loginId);
    if(!u) return;
    // غير المدير: يدخل مباشرة بدون رمز
    if(u.role!=="manager"){setUser(u);setScreen("app");setView("home");setPinErr(false);return;}
    // المدير: يحتاج 6 أرقام
    if(pin===u.pin){setUser(u);setScreen("app");setView("home");setPinErr(false);}
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

      // صرف من أحمد دائماً
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

      if(isPersonalAdv){
        // السلفة الشخصية = دين على الشخص، تتسجل بجدول الديون الداخلية
        // ما تضاف لصندوق الشخص
        await addDoc(collection(db,"personalDebts"),{
          debtorId:form.advanceTo, debtorName:receiver?.name||"",
          creditorId:user.id, creditorName:user.name,
          amount:amt, currency:form.currency,
          remaining:amt, // المبلغ المتبقي
          note:form.note||"",
          date:form.date,
          status:"غير مسدد",
          payments:[], // سجل المدفوعات
          createdAt:new Date().toISOString(),
        });
      } else {
        // دفعة مشروع: تضاف للشخص كاستلام مشروع
        await addDoc(collection(db,"transactions"),{
          userId:form.advanceTo, userName:receiver?.name||"",
          projectId:form.projectId, projectName:projName,
          type:"استلام", amount:amt,
          currency:form.currency,
          note:`استلام دفعة مشروع من أحمد${form.note?" — "+form.note:""}`,
          date:form.date, image:null,
          isPersonal:false, isAdvance:true,
          advanceFrom:user.id, advanceFromName:user.name,
          createdAt:new Date().toISOString(),
        });
      }

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

  // دفع سلفة شخصية
  const payPersonalDebt = async (debt, payAmount) => {
    const amt = Number(payAmount);
    if(!amt||amt<=0) return;
    const newRemaining = Math.max(0, (debt.remaining||debt.amount) - amt);
    const newStatus = newRemaining<=0?"مسدد كامل":"مسدد جزئي";
    // تحديث الدين
    await setDoc(doc(db,"personalDebts",debt.id),{
      remaining: newRemaining,
      status: newStatus,
      lastPayment: today(),
    },{merge:true});
    // استلام لأحمد
    await addDoc(collection(db,"transactions"),{
      userId: debt.creditorId, userName: debt.creditorName,
      projectId:"", projectName:"",
      type:"استلام", amount:amt,
      currency:debt.currency,
      note:`سداد سلفة من ${debt.debtorName}`,
      date:today(), image:null, isPersonal:false, isAdvance:false,
      isDebtPayment:true, debtId:debt.id,
      createdAt:new Date().toISOString(),
    });
  };
  const delPersonalDebt = async id=>{ if(window.confirm("تحذف هذه السلفة؟")) await deleteDoc(doc(db,"personalDebts",id)); };

  // رواتب
  const addSalaryEmployee = async () => {
    if(!salEmpForm.name.trim()||!salEmpForm.baseSalary) return;
    await addDoc(collection(db,"salaryEmployees"),{
      name:salEmpForm.name.trim(),
      baseSalary:Number(salEmpForm.baseSalary),
      currency:salEmpForm.currency,
      note:salEmpForm.note||"",
      createdAt:new Date().toISOString(),
    });
    setSalEmpForm({name:"",baseSalary:"",currency:"دينار",note:""});
    setShowSalEmpForm(false);
  };

  const delSalaryEmployee = async id=>{
    if(window.confirm("تحذف هذا الموظف من قائمة الرواتب؟")) await deleteDoc(doc(db,"salaryEmployees",id));
  };

  const paySalary = async () => {
    if(!salPayForm.employeeId||!salPayForm.amount||!salPayForm.month||!salPayForm.date) return;
    const emp = salaryEmployees.find(e=>e.id===salPayForm.employeeId);
    // تسجيل دفعة الراتب
    await addDoc(collection(db,"salaryPayments"),{
      employeeId:salPayForm.employeeId,
      employeeName:emp?.name||"",
      amount:Number(salPayForm.amount),
      currency:emp?.currency||"دينار",
      month:salPayForm.month,
      date:salPayForm.date,
      note:salPayForm.note||"",
      createdAt:new Date().toISOString(),
    });
    // تسجيل صرف على أحمد
    const accountant = USERS.find(u=>u.role==="accountant");
    if(accountant){
      await addDoc(collection(db,"transactions"),{
        userId:accountant.id, userName:accountant.name,
        projectId:"", projectName:"",
        type:"صرف", amount:Number(salPayForm.amount),
        currency:emp?.currency||"دينار",
        note:`راتب ${emp?.name||""} — ${salPayForm.month}`,
        date:salPayForm.date, image:null, isPersonal:false, isAdvance:false,
        isSalary:true,
        createdAt:new Date().toISOString(),
      });
    }
    setSalPayForm({employeeId:"",amount:"",month:"",date:today(),note:""});
    setShowSalPayForm(false);
  };

  const delSalaryPayment = async id=>{
    if(window.confirm("تحذف هذه الدفعة؟")) await deleteDoc(doc(db,"salaryPayments",id));
  };

  const payOvertime = async () => {
    if(!otForm.employeeId||!otForm.month||!otForm.date) return;
    const emp = salaryEmployees.find(e=>e.id===otForm.employeeId);
    const amt = otForm.amount ? Number(otForm.amount) : (Number(otForm.hours)||0)*(Number(otForm.ratePerHour)||0);
    if(!amt) return;
    await addDoc(collection(db,"overtimePayments"),{
      employeeId:otForm.employeeId,
      employeeName:emp?.name||"",
      hours:Number(otForm.hours)||0,
      ratePerHour:Number(otForm.ratePerHour)||0,
      amount:amt,
      currency:emp?.currency||"دينار",
      month:otForm.month,
      date:otForm.date,
      note:otForm.note||"",
      createdAt:new Date().toISOString(),
    });
    // صرف على أحمد
    const accountant = USERS.find(u=>u.role==="accountant");
    if(accountant){
      await addDoc(collection(db,"transactions"),{
        userId:accountant.id, userName:accountant.name,
        projectId:"", projectName:"",
        type:"صرف", amount:amt,
        currency:emp?.currency||"دينار",
        note:`أوفر تايم ${emp?.name||""} — ${otForm.month}${otForm.hours?" ("+otForm.hours+" ساعة)":""}`,
        date:otForm.date, image:null, isPersonal:false, isAdvance:false,
        isOvertime:true,
        createdAt:new Date().toISOString(),
      });
    }
    setOtForm({employeeId:"",hours:"",ratePerHour:"",amount:"",month:"",date:today(),note:""});
    setShowOtForm(false);
  };

  const delOvertimePayment = async id=>{
    if(window.confirm("تحذف هذا الأوفر تايم؟")) await deleteDoc(doc(db,"overtimePayments",id));
  };

  // سلف الرواتب
  const addSalaryAdvance = async () => {
    if(!salAdvForm.employeeId||!salAdvForm.amount||!salAdvForm.date) return;
    const emp = salaryEmployees.find(e=>e.id===salAdvForm.employeeId);
    await addDoc(collection(db,"salaryAdvances"),{
      employeeId:salAdvForm.employeeId,
      employeeName:emp?.name||"",
      amount:Number(salAdvForm.amount),
      currency:emp?.currency||"دينار",
      date:salAdvForm.date,
      note:salAdvForm.note||"",
      settled:false,
      createdAt:new Date().toISOString(),
    });
    // صرف على أحمد
    const accountant = USERS.find(u=>u.role==="accountant");
    if(accountant){
      await addDoc(collection(db,"transactions"),{
        userId:accountant.id, userName:accountant.name,
        projectId:"", projectName:"",
        type:"صرف", amount:Number(salAdvForm.amount),
        currency:emp?.currency||"دينار",
        note:`سلفة راتب — ${emp?.name||""}${salAdvForm.note?" — "+salAdvForm.note:""}`,
        date:salAdvForm.date, image:null, isPersonal:false, isAdvance:false,
        isSalaryAdvance:true,
        createdAt:new Date().toISOString(),
      });
    }
    setSalAdvForm({employeeId:"",amount:"",date:today(),note:""});
    setShowSalAdvForm(false);
  };

  const delSalaryAdvance = async id=>{
    if(window.confirm("تحذف هذه السلفة؟")) await deleteDoc(doc(db,"salaryAdvances",id));
  };

  const saveExchangeRate = async () => {
    const rate = Number(exchInput);
    if(!rate||rate<=0) return;
    await setDoc(doc(db,"settings","exchangeRate"),{rate});
    setExchangeRate(rate);
    setExchInput("");
  };

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

    // الكاش الحقيقي: معاملات العمل فقط (بدون السلف الشخصية)
    const dinR = txs.filter(t=>t.type==="استلام"&&(t.currency==="دينار"||!t.currency)&&!t.isPersonal).reduce((s,t)=>s+t.amount,0)+allOBdinR;
    const dinS = txs.filter(t=>t.type==="صرف"&&(t.currency==="دينار"||!t.currency)&&!t.isPersonal).reduce((s,t)=>s+t.amount,0)+allOBdinS;
    const dolR = txs.filter(t=>t.type==="استلام"&&t.currency==="دولار"&&!t.isPersonal).reduce((s,t)=>s+t.amount,0)+allOBdolR;
    const dolS = txs.filter(t=>t.type==="صرف"&&t.currency==="دولار"&&!t.isPersonal).reduce((s,t)=>s+t.amount,0)+allOBdolS;

    // الديون الخارجية غير المسددة (شركة + شخصية)
    const externalDebts = debts.filter(d=>d.status!=="مسدد كامل").reduce((s,d)=>s+(d.amount||0),0);
    const personalDebtsTotal = personalDebts.filter(d=>d.status!=="مسدد كامل").reduce((s,d)=>s+(d.remaining||d.amount||0),0);
    const totalDebts = externalDebts + personalDebtsTotal;

    // الكاش الكلي = الكاش الحقيقي + الديون المستحقة
    const realDinB = dinR-dinS;
    const realDolB = dolR-dolS;
    const totalDinB = realDinB + totalDebts; // الديون بالدينار فقط للتبسيط

    return{
      dinR, dinS, dinB:realDinB,
      dolR, dolS, dolB:realDolB,
      totalDinB, totalDebts, externalDebts, personalDebtsTotal,
    };
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

  const navMgr = module==="admin"
    ? [{icon:"🏠",label:"الرئيسية",v:"adminHome"},{icon:"🏗️",label:"المشاريع",v:"adminProjects"},{icon:"👷",label:"الموظفون",v:"adminEmployees"},{icon:"📋",label:"المهام",v:"adminTasks"},{icon:"📊",label:"التقارير",v:"adminReports"}]
    : [{icon:"📊",label:"الملخص",v:"home"},{icon:"📄",label:"الكشوفات",v:"statements"},{icon:"📋",label:"المعاملات",v:"allTx"},{icon:"🏗️",label:"المشاريع",v:"projects"},{icon:"💰",label:"المالية",v:"projReport"},{icon:"🏢",label:"الشركة",v:"company"},{icon:"💳",label:"الديون",v:"debts"},{icon:"💵",label:"الرواتب",v:"salaries"},{icon:"⚖️",label:"افتتاحي",v:"opening"}];
  const navWorker = user?.role==="accountant"
    ? [{icon:"🏠",label:"الرئيسية",v:"home"},{icon:"➕",label:"استلام/سلفة",v:"add"},{icon:"💵",label:"الرواتب",v:"salaries"}]
    : user?.role==="foreman"
    ? [{icon:"🏠",label:"Home",v:"home"},{icon:"⏰",label:"Overtime",v:"overtime"}]
    : [{icon:"🏠",label:"الرئيسية",v:"home"},{icon:"➕",label:"تسجيل صرف",v:"add"}];
  const navItems  = user?.role==="manager" ? navMgr : navWorker;

  const avatarBg = r => r==="manager"?"linear-gradient(135deg,#1d4ed8,#2563eb)":r==="partner"?"linear-gradient(135deg,#7c3aed,#6d28d9)":r==="accountant"?"linear-gradient(135deg,#1A7A4A,#147A40)":r==="foreman"?"linear-gradient(135deg,#0f766e,#0d9488)":"linear-gradient(135deg,#f59e0b,#d97706)";

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
                  <div style={S.uRole}>{u.role==="manager"?"مدير مالي":u.role==="accountant"?"محاسب 🏦":u.role==="foreman"?"Foreman 🔧":"موظف"}</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* بطاقة الشخص المختار */}
            <div style={S.selCard}>
              <div style={{...S.av,background:avatarBg(USERS.find(u=>u.id===loginId)?.role)}}>{USERS.find(u=>u.id===loginId)?.name[0]}</div>
              <div>
                <div style={{fontSize:18,fontWeight:800,letterSpacing:-0.5}}>{USERS.find(u=>u.id===loginId)?.name}</div>
                <div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>{USERS.find(u=>u.id===loginId)?.role==="manager"?"مدير مالي":USERS.find(u=>u.id===loginId)?.role==="foreman"?"Foreman":"موظف"}</div>
              </div>
            </div>

            {/* المدير فقط يحتاج رمز سري */}
            {USERS.find(u=>u.id===loginId)?.role==="manager" ? (
              <>
                <div style={S.lbl}>أدخل الرمز السري (6 أرقام)</div>
                {/* 6 نقاط */}
                <div style={{...S.dots,gap:12}}>
                  {[0,1,2,3,4,5].map(i=>(
                    <div key={i} style={{
                      ...S.dot,
                      width:14,height:14,
                      background:pin.length>i?C.gold:C.bg3,
                      boxShadow:pin.length>i?`0 0 8px rgba(193,123,47,0.4)`:"none",
                      transition:"all 0.15s",
                    }}/>
                  ))}
                </div>
                {pinErr&&<div style={S.pinErr}>رمز خاطئ، حاول مرة ثانية</div>}
                <div style={D?S.numpadD:S.numpad}>
                  {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k,i)=>(
                    <button key={i} style={k===""?S.numEmpty:S.numBtn}
                      onClick={()=>{if(!k)return;if(k==="⌫"){setPin(p=>p.slice(0,-1));setPinErr(false);}else if(pin.length<6)setPin(p=>p+k);}}>
                      {k}
                    </button>
                  ))}
                </div>
                <button style={{...S.loginBtn,opacity:pin.length===6?1:0.5}} onClick={doLogin} disabled={pin.length<6}>
                  دخول
                </button>
              </>
            ) : (
              /* غير المدير: يدخل مباشرة */
              <>
                <div style={{textAlign:"center",marginBottom:20}}>
                  <div style={{fontSize:48,marginBottom:8}}>👋</div>
                  <div style={{fontSize:16,fontWeight:700,color:C.text}}>
                    أهلاً {USERS.find(u=>u.id===loginId)?.name}!
                  </div>
                  <div style={{fontSize:13,color:C.textSm,marginTop:4}}>اضغط دخول للمتابعة</div>
                </div>
                <button style={S.loginBtn} onClick={doLogin}>دخول →</button>
              </>
            )}
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
          <button style={S.outBtn} onClick={()=>{setUser(null);setScreen("login");setPin("");setView("home");setModule("finance");}}>خروج</button>
        </div>
      </div>

      {/* شريط تبديل القسم محذوف - انتقل للصفحة الرئيسية */}

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

    // زر الرجوع المشترك
    const BackBtn = ({to,label}) => (
      <button style={{
        display:"inline-flex",alignItems:"center",gap:6,
        background:C.card,border:`1px solid ${C.cardBorder}`,
        borderRadius:10,padding:"8px 16px",color:C.textMd,
        fontSize:13,fontWeight:700,cursor:"pointer",
        boxShadow:C.shadow,marginBottom:20,
      }} onClick={()=>setView(to||"home")}>
        ← {label||"رجوع للرئيسية"}
      </button>
    );

    // FOREMAN HOME
    if(user.role==="foreman"&&view==="home") {
      const myOTs = overtimePayments.filter(t=>t.submittedBy===user.id);
      const totalHours = myOTs.reduce((s,t)=>s+(t.hours||0),0);
      const thisMonth = new Date().toISOString().slice(0,7);
      const thisMonthOTs = myOTs.filter(t=>t.month===thisMonth);
      return (
        <div style={{fontFamily:"'Segoe UI',Arial,sans-serif",direction:"ltr",color:C.text}}>
          {/* Welcome */}
          <div style={{background:"linear-gradient(135deg,#0f766e,#0d9488)",borderRadius:20,padding:"22px 20px",marginBottom:16,color:"#fff",boxShadow:C.shadowMd}}>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.8)",marginBottom:4}}>Welcome back 👋</div>
            <div style={{fontSize:26,fontWeight:900,letterSpacing:-0.5}}>Foreman Dashboard</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.8)",marginTop:4}}>Log overtime for your workers below</div>
          </div>

          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <div style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:16,padding:16,boxShadow:C.shadow}}>
              <div style={{fontSize:11,color:C.textSm,fontWeight:700,marginBottom:6}}>THIS MONTH</div>
              <div style={{fontSize:22,fontWeight:900,color:"#0f766e"}}>{thisMonthOTs.length}</div>
              <div style={{fontSize:12,color:C.textMd}}>OT Records</div>
            </div>
            <div style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:16,padding:16,boxShadow:C.shadow}}>
              <div style={{fontSize:11,color:C.textSm,fontWeight:700,marginBottom:6}}>TOTAL HOURS</div>
              <div style={{fontSize:22,fontWeight:900,color:"#0f766e"}}>{totalHours}</div>
              <div style={{fontSize:12,color:C.textMd}}>Hours logged</div>
            </div>
          </div>

          {/* Log OT button */}
          {!D&&<button style={{...S.goldBtn,background:"linear-gradient(135deg,#0f766e,#0d9488)",color:"#fff",marginBottom:20}}
            onClick={()=>setView("overtime")}>⏰ Log Overtime</button>}

          {/* Recent */}
          <div style={{fontWeight:800,fontSize:16,color:C.text,marginBottom:12}}>Recent Overtime</div>
          {myOTs.length===0?(
            <div style={{...S.empty,background:C.card,borderRadius:16,border:`1px solid ${C.cardBorder}`}}>
              <div style={{fontSize:36,marginBottom:8}}>⏰</div>
              <div style={{fontWeight:700,color:C.textMd}}>No overtime logged yet</div>
              <div style={{fontSize:13,color:C.textSm,marginTop:4}}>Tap "Log Overtime" to get started</div>
            </div>
          ):(
            myOTs.slice(0,10).map(t=>(
              <div key={t.id} style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:14,padding:"14px 16px",marginBottom:8,boxShadow:C.shadow}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{fontWeight:800,fontSize:15,color:C.text}}>{t.employeeName}</div>
                  <div style={{fontWeight:900,fontSize:15,color:"#0f766e"}}>{t.hours} hrs × {t.ratePerHour} = {t.amount}</div>
                </div>
                <div style={{display:"flex",gap:12,fontSize:12,color:C.textSm}}>
                  <span>📅 {t.date}</span>
                  <span>📆 {t.month}</span>
                  {t.note&&<span>💬 {t.note}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      );
    }

    // FOREMAN OVERTIME
    if(user.role==="foreman"&&view==="overtime") {
      const [submitted,setSubmitted] = [false,()=>{}]; // placeholder
      return (
        <div style={{fontFamily:"'Segoe UI',Arial,sans-serif",direction:"ltr",color:C.text}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
            {!D&&<button style={S.backBtn2} onClick={()=>setView("home")}>←</button>}
            <div style={{fontSize:20,fontWeight:900,color:C.text}}>⏰ Log Overtime</div>
          </div>
          <ForemanOTForm
            employees={salaryEmployees}
            onSubmit={async(data)=>{
              const emp=salaryEmployees.find(e=>e.id===data.employeeId);
              const amt=data.hours&&data.ratePerHour?Number(data.hours)*Number(data.ratePerHour):Number(data.amount);
              if(!amt||!data.employeeId)return false;
              await addDoc(collection(db,"overtimePayments"),{
                employeeId:data.employeeId,
                employeeName:emp?.name||"",
                hours:Number(data.hours)||0,
                ratePerHour:Number(data.ratePerHour)||0,
                amount:amt,
                currency:emp?.currency||"دينار",
                month:data.month,
                date:data.date,
                note:data.note||"",
                submittedBy:user.id,
                submittedByName:user.name,
                createdAt:new Date().toISOString(),
              });
              const accountant=USERS.find(u=>u.role==="accountant");
              if(accountant){
                await addDoc(collection(db,"transactions"),{
                  userId:accountant.id,userName:accountant.name,
                  projectId:"",projectName:"",
                  type:"صرف",amount:amt,
                  currency:emp?.currency||"دينار",
                  note:`Overtime — ${emp?.name||""} — ${data.month}${data.hours?" ("+data.hours+" hrs)":""}`,
                  date:data.date,image:null,isPersonal:false,isAdvance:false,
                  isOvertime:true,
                  createdAt:new Date().toISOString(),
                });
              }
              return true;
            }}
          />
        </div>
      );
    }

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
          const myPersonalDebts = personalDebts.filter(d=>d.creditorId===user.id&&d.status!=="مسدد كامل");
          const totalOwed = myPersonalDebts.reduce((s,d)=>s+(d.remaining||d.amount),0);
          if(myPersonalDebts.length===0&&!txs.filter(t=>t.isAdvance&&t.userId===user.id&&t.type==="صرف").length) return null;
          return(
            <div style={{background:`rgba(192,57,43,0.06)`,border:`1px solid rgba(192,57,43,0.2)`,borderRadius:14,padding:"14px 16px",marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:13,fontWeight:700,color:C.red}}>💳 السلف الشخصية (ديون عليهم)</div>
                <div style={{fontSize:14,fontWeight:800,color:C.red}}>{fmtD(totalOwed)}</div>
              </div>
              {myPersonalDebts.map(d=>(
                <div key={d.id} style={{background:C.card,borderRadius:10,padding:"10px 12px",marginBottom:8,border:`1px solid ${C.cardBorder}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontWeight:700,fontSize:14}}>{d.debtorName}</div>
                    <div style={{fontWeight:800,color:C.red,fontSize:14}}>{fmtD(d.remaining||d.amount)}</div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:11,color:C.textSm}}>📅 {d.date} {d.note&&`· ${d.note}`}</div>
                    <span style={{fontSize:11,fontWeight:700,color:d.status==="مسدد جزئي"?"#b45309":C.red,background:d.status==="مسدد جزئي"?"rgba(180,83,9,0.1)":"rgba(192,57,43,0.1)",padding:"3px 8px",borderRadius:6}}>{d.status}</span>
                  </div>
                  {/* زر سداد سريع */}
                  <PayDebtRow debt={d} onPay={payPersonalDebt}/>
                </div>
              ))}
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
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}><BackBtn to="home" label="رجوع"/><div style={S.secTitle}>تسجيل معاملة جديدة</div></div>
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
          {/* مبدّل القسم */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:24}}>
            <button onClick={()=>{setModule("finance");}} style={{
              background:module==="finance"?`linear-gradient(135deg,${C.gold},${C.goldD})`:`${C.card}`,
              border:module==="finance"?`2px solid ${C.gold}`:`2px solid ${C.cardBorder}`,
              borderRadius:20,padding:"22px 20px",cursor:"pointer",textAlign:"right",
              boxShadow:module==="finance"?`0 8px 24px rgba(193,123,47,0.25)`:C.shadow,
              transition:"all 0.25s",
            }}>
              <div style={{fontSize:36,marginBottom:8}}>💰</div>
              <div style={{fontWeight:900,fontSize:18,color:module==="finance"?"#fff":C.text,letterSpacing:-0.5}}>المالية</div>
              <div style={{fontSize:12,color:module==="finance"?"rgba(255,255,255,0.85)":C.textSm,marginTop:4,fontWeight:600}}>الحسابات والأرصدة والمعاملات</div>
              {module==="finance"&&<div style={{marginTop:10,background:"rgba(255,255,255,0.2)",borderRadius:8,padding:"4px 10px",fontSize:11,color:"#fff",fontWeight:700,display:"inline-block"}}>✓ نشط</div>}
            </button>
            <button onClick={()=>{setModule("admin");setView("adminHome");}} style={{
              background:module==="admin"?"linear-gradient(135deg,#2557A7,#1d4ed8)":C.card,
              border:module==="admin"?"2px solid #2557A7":`2px solid ${C.cardBorder}`,
              borderRadius:20,padding:"22px 20px",cursor:"pointer",textAlign:"right",
              boxShadow:module==="admin"?"0 8px 24px rgba(37,87,167,0.25)":C.shadow,
              transition:"all 0.25s",
            }}>
              <div style={{fontSize:36,marginBottom:8}}>💼</div>
              <div style={{fontWeight:900,fontSize:18,color:module==="admin"?"#fff":C.text,letterSpacing:-0.5}}>الإدارة</div>
              <div style={{fontSize:12,color:module==="admin"?"rgba(255,255,255,0.85)":C.textSm,marginTop:4,fontWeight:600}}>متابعة المشاريع والموظفين</div>
              {module==="admin"&&<div style={{marginTop:10,background:"rgba(255,255,255,0.2)",borderRadius:8,padding:"4px 10px",fontSize:11,color:"#fff",fontWeight:700,display:"inline-block"}}>✓ نشط</div>}
            </button>
          </div>
          <div style={S.secTitle}>الصناديق العامة للشركة</div>

          {/* الصندوقان الرئيسيان */}
          <div style={D?{display:"flex",gap:14,marginBottom:14}:{marginBottom:14}}>
            {/* الكاش الحقيقي */}
            <div style={{...S.balCard,background:"linear-gradient(135deg,#065f46,#047857)",flex:D?1:undefined,marginBottom:D?0:12}}>
              <div style={S.balLbl}>💵 الكاش الحقيقي — دينار</div>
              <div style={S.balAmt}>{fmt(Math.abs(GF.dinB),"دينار")}</div>
              <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",margin:"4px 0 10px"}}>
                {GF.dinB>0?"✅ موجب":GF.dinB<0?"⚠️ سالب":"◼️ متوازن"}
              </div>
              <div style={S.balRow}>
                <span style={S.balSt}>↓ {fmt(GF.dinR,"دينار")}</span>
                <span style={S.balSt}>↑ {fmt(GF.dinS,"دينار")}</span>
              </div>
              <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid rgba(255,255,255,0.2)",fontSize:12,color:"rgba(255,255,255,0.7)"}}>
                معاملات العمل فقط، بدون السلف الشخصية
              </div>
            </div>
            {/* دولار */}
            <div style={{...S.balCard,background:"linear-gradient(135deg,#1e40af,#2563eb)",flex:D?1:undefined,marginBottom:D?0:12}}>
              <div style={S.balLbl}>💵 الكاش الحقيقي — دولار</div>
              <div style={S.balAmt}>{fmt(Math.abs(GF.dolB),"دولار")}</div>
              <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",margin:"4px 0 10px"}}>
                {GF.dolB>0?"✅ موجب":GF.dolB<0?"⚠️ سالب":"◼️ متوازن"}
              </div>
              <div style={S.balRow}>
                <span style={S.balSt}>↓ {fmt(GF.dolR,"دولار")}</span>
                <span style={S.balSt}>↑ {fmt(GF.dolS,"دولار")}</span>
              </div>
              <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid rgba(255,255,255,0.2)",fontSize:12,color:"rgba(255,255,255,0.7)"}}>
                معاملات العمل فقط، بدون السلف الشخصية
              </div>
            </div>
          </div>

          {/* الكاش الكلي */}
          <div style={{...S.balCard,background:"linear-gradient(135deg,#1e3a5f,#1d4ed8)",marginBottom:20}}>
            <div style={S.balLbl}>📊 الكاش الكلي (الكاش الحقيقي + الديون المستحقة)</div>
            <div style={S.balAmt}>{fmtD(GF.totalDinB)}</div>
            <div style={{marginTop:12,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <div style={{background:"rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginBottom:4}}>💵 الكاش الحقيقي</div>
                <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>{fmtD(GF.dinB)}</div>
              </div>
              <div style={{background:"rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginBottom:4}}>🏢 ديون خارجية</div>
                <div style={{fontSize:15,fontWeight:800,color:"#fde68a"}}>{fmtD(GF.externalDebts)}</div>
              </div>
              <div style={{background:"rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginBottom:4}}>💳 سلف شخصية</div>
                <div style={{fontSize:15,fontWeight:800,color:"#fde68a"}}>{fmtD(GF.personalDebtsTotal)}</div>
              </div>
            </div>
            <div style={{marginTop:10,fontSize:12,color:"rgba(255,255,255,0.65)",textAlign:"center"}}>
              {fmtD(GF.dinB)} + {fmtD(GF.totalDebts)} ديون = {fmtD(GF.totalDinB)}
            </div>
          </div>

          {/* حسابات الأشخاص */}
          <div style={S.secTitle}>صناديق الأشخاص</div>
          <div style={D?S.empGrid:{}}>
            {workerBals.map(e=>{
              const empPersonalDebt = personalDebts.filter(d=>d.debtorId===e.id&&d.status!=="مسدد كامل");
              const empDebtTotal = empPersonalDebt.reduce((s,d)=>s+(d.remaining||d.amount||0),0);
              return(
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
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>🇮🇶 صندوق العمل — دينار</div>
                    <div style={{fontSize:12,fontWeight:700,color:e.din.b>=0?"#34d399":"#f87171"}}>{e.din.b>0?"مطلوب منه":e.din.b<0?"طالب":"متوازن"}</div>
                  </div>
                  <div style={{fontSize:17,fontWeight:900,color:e.din.b>=0?"#34d399":"#f87171",letterSpacing:-0.5,marginBottom:6}}>{fmt(Math.abs(e.din.b),"دينار")}</div>
                  <div style={{display:"flex",gap:12,fontSize:11,color:"rgba(255,255,255,0.5)"}}>
                    <span>↓ استلم {fmt(e.din.r,"دينار")}</span>
                    <span>↑ صرف {fmt(e.din.s,"دينار")}</span>
                  </div>
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

                {/* السلفة الشخصية — منفصلة عن صندوق العمل */}
                {empDebtTotal>0&&(
                  <div style={{background:"rgba(192,57,43,0.12)",border:"1px solid rgba(192,57,43,0.3)",borderRadius:10,padding:"10px 12px",marginTop:6}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontSize:11,color:"#f87171",fontWeight:700}}>💳 سلفة شخصية مستحقة</div>
                      <div style={{fontSize:14,fontWeight:900,color:"#f87171"}}>{fmtD(empDebtTotal)}</div>
                    </div>
                    {empPersonalDebt.length>1&&<div style={{fontSize:10,color:"rgba(248,113,113,0.7)",marginTop:3}}>{toAr(empPersonalDebt.length)} سلف</div>}
                  </div>
                )}
              </button>
              );
            })}
          </div>

          {!D&&module==="finance"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
              {[["📄 الكشوفات","statements","linear-gradient(135deg,#1A7A4A,#147A40)"],["📋 المعاملات","allTx","linear-gradient(135deg,#1d4ed8,#1455cc)"],["🏗️ المشاريع","projects","linear-gradient(135deg,#065f46,#047857)"],["💰 كشف المشاريع","projReport","linear-gradient(135deg,#b45309,#92400e)"],["🏢 كشف الشركة","company","linear-gradient(135deg,#7c3aed,#5b21b6)"],["💳 الديون","debts","linear-gradient(135deg,#C0392B,#A93226)"],["💵 الرواتب","salaries","linear-gradient(135deg,#1A7A4A,#0f5c36)"]].map(([l,v,bg])=>(
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
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>{!D&&<BackBtn/>}<div style={S.secTitle}>كل المعاملات</div></div>
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
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>{!D&&<BackBtn/>}<div style={S.secTitle}>إدارة المشاريع</div></div>
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
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>{!D&&<BackBtn/>}<div style={S.secTitle}>💰 الكشف المالي للمشاريع</div></div>
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
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>{!D&&<BackBtn/>}<div style={S.secTitle}>🏢 الكشف المالي للشركة</div></div>
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
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>{!D&&<BackBtn/>}<div style={S.secTitle}>⚖️ الأرصدة الافتتاحية</div></div>
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
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>{!D&&<BackBtn/>}<div style={S.secTitle}>📄 كشف الحسابات</div></div>
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

    // SALARIES
    if((user.role==="manager"||user.role==="accountant")&&view==="salaries") {
      const months = [...new Set([...salaryPayments,...overtimePayments].map(p=>p.month))].sort().reverse();
      const currentMonth = new Date().toISOString().slice(0,7);
      const dinarEmps   = salaryEmployees.filter(e=>e.currency==="دينار"||!e.currency);
      const dollarEmps  = salaryEmployees.filter(e=>e.currency==="دولار");
      const totalDinarBase  = dinarEmps.reduce((s,e)=>s+e.baseSalary,0);
      const totalDollarBase = dollarEmps.reduce((s,e)=>s+e.baseSalary,0);

      // حسابات الشهر المختار
      const filtPay = salaryPayments.filter(p=>!salFilterMonth||p.month===salFilterMonth);
      const filtOt  = overtimePayments.filter(p=>!salFilterMonth||p.month===salFilterMonth);
      const filtAdv = salaryAdvances.filter(p=>!salFilterMonth||p.date?.slice(0,7)===salFilterMonth);

      const dinarPaid   = filtPay.filter(p=>p.currency==="دينار"||!p.currency).reduce((s,p)=>s+p.amount,0);
      const dollarPaid  = filtPay.filter(p=>p.currency==="دولار").reduce((s,p)=>s+p.amount,0);
      const dinarOT     = filtOt.filter(p=>p.currency==="دينار"||!p.currency).reduce((s,p)=>s+p.amount,0);
      const dollarOT    = filtOt.filter(p=>p.currency==="دولار").reduce((s,p)=>s+p.amount,0);
      const dinarAdv    = filtAdv.filter(p=>p.currency==="دينار"||!p.currency).reduce((s,p)=>s+p.amount,0);
      const dollarAdv   = filtAdv.filter(p=>p.currency==="دولار").reduce((s,p)=>s+p.amount,0);

      // مجمل الرواتب بعملة موحدة
      const totalDinarAll  = dinarPaid + dinarOT + dinarAdv + (dollarPaid+dollarOT+dollarAdv)*exchangeRate;
      const totalDollarAll = dollarPaid + dollarOT + dollarAdv + (dinarPaid+dinarOT+dinarAdv)/exchangeRate;

      // حساب الراتب الصافي لكل موظف (الراتب - سلف الشهر)
      const empNetSalary = (empId, cur) => {
        const base = salaryEmployees.find(e=>e.id===empId)?.baseSalary||0;
        const paid = filtPay.filter(p=>p.employeeId===empId).reduce((s,p)=>s+p.amount,0);
        const ot   = filtOt.filter(p=>p.employeeId===empId).reduce((s,p)=>s+p.amount,0);
        const adv  = filtAdv.filter(p=>p.employeeId===empId).reduce((s,p)=>s+p.amount,0);
        return {base, paid, ot, adv, net: base - adv};
      };

      const Tab = ({id,label,icon}) => (
        <button onClick={()=>setSalTab(id)} style={{
          flex:1, padding:"10px 6px", borderRadius:10, border:"none", cursor:"pointer",
          fontWeight:700, fontSize:D?13:11, transition:"all 0.2s",
          background:salTab===id?C.gold:"transparent",
          color:salTab===id?"#000":C.textMd,
          boxShadow:salTab===id?C.shadow:"none",
        }}>{icon} {label}</button>
      );

      return (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>{!D&&<BackBtn/>}<div style={S.secTitle}>💵 الرواتب والأوفر تايم</div></div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <select style={{...S.sel,width:"auto",padding:"8px 12px",fontSize:13}} value={salFilterMonth} onChange={e=>setSalFilterMonth(e.target.value)}>
                <option value="">كل الأشهر</option>
                {months.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
              {[["showSalEmpForm","👤 موظف جديد",C.gold,"#000"],["showSalPayForm","💵 صرف راتب",C.blue,"#fff"],["showSalAdvForm","💳 سلفة راتب","#b45309","#fff"],["showOtForm","⏰ أوفر تايم","#6B3FA0","#fff"]].map(([key,lbl,bg,col])=>(
                <button key={key} style={{...S.goldBtn,width:"auto",padding:"8px 14px",marginBottom:0,fontSize:12,background:bg,color:col}}
                  onClick={()=>{
                    setShowSalEmpForm(key==="showSalEmpForm"?v=>!v:false);
                    setShowSalPayForm(key==="showSalPayForm"?v=>!v:false);
                    setShowSalAdvForm(key==="showSalAdvForm"?v=>!v:false);
                    setShowOtForm(key==="showOtForm"?v=>!v:false);
                  }}>{lbl}</button>
              ))}
            </div>
          </div>

          {/* نموذج إضافة موظف */}
          {showSalEmpForm&&(
            <div style={{...S.formCard,marginBottom:16}}>
              <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>👤 إضافة موظف للرواتب</div>
              <div style={D?{display:"flex",gap:12}:{}}>
                <div style={D?{flex:2}:{}}><div style={S.fLbl}>الاسم</div><input style={S.inp} placeholder="مثال: علي حسن" value={salEmpForm.name} onChange={e=>setSalEmpForm(f=>({...f,name:e.target.value}))}/></div>
                <div style={D?{flex:1}:{}}><div style={S.fLbl}>الراتب الأساسي</div><input style={S.inp} type="number" placeholder="٠" value={salEmpForm.baseSalary} onChange={e=>setSalEmpForm(f=>({...f,baseSalary:e.target.value}))}/></div>
                <div style={D?{flex:1}:{}}>
                  <div style={S.fLbl}>العملة</div>
                  <div style={S.tRow}>
                    <button style={{...S.tBtn,...(salEmpForm.currency==="دينار"?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}} onClick={()=>setSalEmpForm(f=>({...f,currency:"دينار"}))}>🇮🇶</button>
                    <button style={{...S.tBtn,...(salEmpForm.currency==="دولار"?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}} onClick={()=>setSalEmpForm(f=>({...f,currency:"دولار"}))}>🇺🇸</button>
                  </div>
                </div>
              </div>
              <div style={S.fLbl}>ملاحظة</div>
              <input style={S.inp} placeholder="مثال: دوام كامل..." value={salEmpForm.note} onChange={e=>setSalEmpForm(f=>({...f,note:e.target.value}))}/>
              <button style={S.subBtn} onClick={addSalaryEmployee}>+ إضافة</button>
              {salaryEmployees.length>0&&(<>
                <div style={{fontWeight:700,fontSize:12,color:C.textMd,margin:"14px 0 8px"}}>الموظفون الحاليون</div>
                {salaryEmployees.map(e=>(
                  <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:C.bg2,borderRadius:10,marginBottom:6,border:`1px solid ${C.cardBorder}`}}>
                    <div><span style={{fontWeight:700,color:C.text}}>{e.name}</span><span style={{fontSize:12,color:C.textMd,marginRight:8}}>— {fmt(e.baseSalary,e.currency)}</span>{e.note&&<span style={{fontSize:11,color:C.textSm}}>{e.note}</span>}</div>
                    <button style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:16}} onClick={()=>delSalaryEmployee(e.id)}>🗑️</button>
                  </div>
                ))}
              </>)}
            </div>
          )}

          {/* نموذج صرف راتب */}
          {showSalPayForm&&(
            <div style={{...S.formCard,marginBottom:16}}>
              <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>💵 صرف راتب</div>
              <div style={D?{display:"flex",gap:12}:{}}>
                <div style={D?{flex:2}:{}}>
                  <div style={S.fLbl}>الموظف</div>
                  <select style={S.sel} value={salPayForm.employeeId} onChange={e=>{const emp=salaryEmployees.find(x=>x.id===e.target.value);setSalPayForm(f=>({...f,employeeId:e.target.value,amount:emp?.baseSalary||""}));}}>
                    <option value="">اختر الموظف</option>
                    {salaryEmployees.map(e=><option key={e.id} value={e.id}>{e.name} — {fmt(e.baseSalary,e.currency)}</option>)}
                  </select>
                </div>
                <div style={D?{flex:1}:{}}><div style={S.fLbl}>الشهر</div><input style={S.inp} type="month" value={salPayForm.month} onChange={e=>setSalPayForm(f=>({...f,month:e.target.value}))}/></div>
                <div style={D?{flex:1}:{}}><div style={S.fLbl}>المبلغ</div><input style={S.inp} type="number" placeholder="٠" value={salPayForm.amount} onChange={e=>setSalPayForm(f=>({...f,amount:e.target.value}))}/></div>
                <div style={D?{flex:1}:{}}><div style={S.fLbl}>تاريخ الدفع</div><input style={S.inp} type="date" value={salPayForm.date} onChange={e=>setSalPayForm(f=>({...f,date:e.target.value}))}/></div>
              </div>
              <div style={S.fLbl}>ملاحظة</div>
              <input style={S.inp} placeholder="مثال: راتب كامل..." value={salPayForm.note} onChange={e=>setSalPayForm(f=>({...f,note:e.target.value}))}/>
              <button style={S.subBtn} onClick={paySalary}>💾 تسجيل</button>
            </div>
          )}

          {/* نموذج سلفة راتب */}
          {showSalAdvForm&&(
            <div style={{...S.formCard,marginBottom:16,border:`1px solid rgba(180,83,9,0.2)`}}>
              <div style={{fontWeight:700,fontSize:14,color:"#b45309",marginBottom:12}}>💳 سلفة من الراتب</div>
              <div style={D?{display:"flex",gap:12}:{}}>
                <div style={D?{flex:2}:{}}>
                  <div style={S.fLbl}>الموظف</div>
                  <select style={S.sel} value={salAdvForm.employeeId} onChange={e=>setSalAdvForm(f=>({...f,employeeId:e.target.value}))}>
                    <option value="">اختر الموظف</option>
                    {salaryEmployees.map(e=><option key={e.id} value={e.id}>{e.name} — راتب {fmt(e.baseSalary,e.currency)}</option>)}
                  </select>
                </div>
                <div style={D?{flex:1}:{}}><div style={S.fLbl}>مبلغ السلفة</div><input style={S.inp} type="number" placeholder="٠" value={salAdvForm.amount} onChange={e=>setSalAdvForm(f=>({...f,amount:e.target.value}))}/></div>
                <div style={D?{flex:1}:{}}><div style={S.fLbl}>التاريخ</div><input style={S.inp} type="date" value={salAdvForm.date} onChange={e=>setSalAdvForm(f=>({...f,date:e.target.value}))}/></div>
              </div>
              <div style={S.fLbl}>ملاحظة</div>
              <input style={S.inp} placeholder="سبب السلفة..." value={salAdvForm.note} onChange={e=>setSalAdvForm(f=>({...f,note:e.target.value}))}/>
              {salAdvForm.employeeId&&salAdvForm.amount&&(()=>{
                const emp=salaryEmployees.find(e=>e.id===salAdvForm.employeeId);
                const advThisMonth=salaryAdvances.filter(a=>a.employeeId===salAdvForm.employeeId&&a.date?.slice(0,7)===today().slice(0,7)).reduce((s,a)=>s+a.amount,0);
                const netAfter=(emp?.baseSalary||0)-(advThisMonth+Number(salAdvForm.amount));
                return <div style={{background:`rgba(180,83,9,0.06)`,border:`1px solid rgba(180,83,9,0.2)`,borderRadius:10,padding:"10px 14px",marginTop:8,fontSize:13,color:"#b45309",fontWeight:600}}>
                  سلف هذا الشهر: {fmt(advThisMonth,emp?.currency)} · الصافي بعد السلفة: {fmt(Math.max(0,netAfter),emp?.currency)}
                </div>;
              })()}
              <button style={{...S.subBtn,background:"linear-gradient(135deg,#b45309,#92400e)",color:"#fff"}} onClick={addSalaryAdvance}>💾 تسجيل السلفة</button>
            </div>
          )}

          {/* نموذج أوفر تايم */}
          {showOtForm&&(
            <div style={{...S.formCard,marginBottom:16,border:`1px solid rgba(107,63,160,0.2)`}}>
              <div style={{fontWeight:700,fontSize:14,color:"#6B3FA0",marginBottom:16}}>⏰ تسجيل أوفر تايم</div>

              {/* الصف الأول: الموظف والشهر والتاريخ */}
              <div style={D?{display:"flex",gap:12}:{}}>
                <div style={D?{flex:2}:{}}>
                  <div style={S.fLbl}>الموظف</div>
                  <select style={S.sel} value={otForm.employeeId} onChange={e=>setOtForm(f=>({...f,employeeId:e.target.value,hours:"",ratePerHour:"",amount:""}))}>
                    <option value="">اختر الموظف</option>
                    {salaryEmployees.map(e=><option key={e.id} value={e.id}>{e.name} ({e.currency==="دولار"?"🇺🇸":"🇮🇶"})</option>)}
                  </select>
                </div>
                <div style={D?{flex:1}:{}}>
                  <div style={S.fLbl}>الشهر</div>
                  <input style={S.inp} type="month" value={otForm.month} onChange={e=>setOtForm(f=>({...f,month:e.target.value}))}/>
                </div>
                <div style={D?{flex:1}:{}}>
                  <div style={S.fLbl}>التاريخ</div>
                  <input style={S.inp} type="date" value={otForm.date} onChange={e=>setOtForm(f=>({...f,date:e.target.value}))}/>
                </div>
              </div>

              {/* الصف الثاني: الساعات والسعر والمجموع */}
              <div style={{...D?{display:"flex",gap:12}:{},marginTop:4}}>
                <div style={D?{flex:1}:{}}>
                  <div style={S.fLbl}>عدد الساعات ⏱️</div>
                  <input style={{...S.inp,fontWeight:700,fontSize:16,textAlign:"center"}}
                    type="number" placeholder="٠" value={otForm.hours}
                    onChange={e=>{
                      const h=e.target.value;
                      setOtForm(f=>({...f,hours:h,amount:h&&f.ratePerHour?String(Number(h)*Number(f.ratePerHour)):f.amount}));
                    }}/>
                </div>
                <div style={D?{flex:1}:{}}>
                  <div style={S.fLbl}>سعر الساعة 💰</div>
                  <input style={{...S.inp,fontWeight:700,fontSize:16,textAlign:"center"}}
                    type="number" placeholder="٠" value={otForm.ratePerHour}
                    onChange={e=>{
                      const r=e.target.value;
                      setOtForm(f=>({...f,ratePerHour:r,amount:f.hours&&r?String(Number(f.hours)*Number(r)):f.amount}));
                    }}/>
                </div>
                <div style={D?{flex:1}:{}}>
                  <div style={S.fLbl}>المبلغ الكلي 🧾</div>
                  <input style={{...S.inp,fontWeight:900,fontSize:18,textAlign:"center",
                    background:otForm.hours&&otForm.ratePerHour?"rgba(107,63,160,0.08)":C.bg2,
                    border:otForm.hours&&otForm.ratePerHour?`2px solid #6B3FA0`:`1px solid ${C.cardBorder}`,
                    color:"#6B3FA0"}}
                    type="number" placeholder="أو أدخل مباشرة"
                    value={otForm.amount}
                    onChange={e=>setOtForm(f=>({...f,amount:e.target.value}))}/>
                </div>
              </div>

              {/* معاينة الحساب */}
              {otForm.hours&&otForm.ratePerHour&&(
                <div style={{background:"rgba(107,63,160,0.08)",border:"1px solid rgba(107,63,160,0.2)",borderRadius:12,padding:"12px 16px",marginTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:13,color:"#6B3FA0",fontWeight:600}}>
                    {toAr(otForm.hours)} ساعة × {toAr(otForm.ratePerHour)} = 
                  </div>
                  <div style={{fontSize:18,fontWeight:900,color:"#6B3FA0"}}>
                    {fmtD(Number(otForm.hours)*Number(otForm.ratePerHour))}
                  </div>
                </div>
              )}

              <div style={S.fLbl}>ملاحظة</div>
              <input style={S.inp} placeholder="مثال: عمل ليلي، إجازة رسمية..." value={otForm.note} onChange={e=>setOtForm(f=>({...f,note:e.target.value}))}/>

              {/* تحذير الصرف */}
              {otForm.amount&&otForm.employeeId&&(()=>{
                const emp=salaryEmployees.find(e=>e.id===otForm.employeeId);
                return <div style={{background:`rgba(107,63,160,0.06)`,border:`1px solid rgba(107,63,160,0.2)`,borderRadius:10,padding:"10px 14px",marginTop:8,fontSize:13,color:"#6B3FA0",fontWeight:600}}>
                  ⚠️ سيُصرف {fmt(Number(otForm.amount),emp?.currency||"دينار")} من رصيد أحمد
                </div>;
              })()}

              <button style={{...S.subBtn,background:"linear-gradient(135deg,#6B3FA0,#5B21B6)",color:"#fff"}} onClick={payOvertime}>💾 تسجيل الأوفر تايم</button>
            </div>
          )}

          {/* تبويبات */}
          <div style={{display:"flex",background:C.bg2,borderRadius:12,padding:4,marginBottom:20,gap:3,flexWrap:"wrap"}}>
            <Tab id="summary" label="المجمل" icon="📊"/>
            <Tab id="dinar" label="دينار 🇮🇶" icon=""/>
            <Tab id="dollar" label="دولار 🇺🇸" icon=""/>
            <Tab id="advances" label="السلف" icon="💳"/>
            <Tab id="overtime" label="الأوفر تايم" icon="⏰"/>
          </div>

          {/* تبويبة المجمل */}
          {salTab==="summary"&&(
            <div>
              {/* سعر الصرف + زر الطباعة */}
              <div style={{...S.formCard,marginBottom:20,padding:16}}>
                <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.text}}>💱 سعر الصرف</div>
                    <div style={{fontSize:13,color:C.textMd}}>1 دولار =</div>
                    <input style={{...S.inp,width:140,padding:"8px 12px",fontSize:14,fontWeight:700}} type="number" placeholder={toAr(exchangeRate)} value={exchInput} onChange={e=>setExchInput(e.target.value)}/>
                    <div style={{fontSize:13,color:C.textMd}}>دينار</div>
                    <button style={{...S.goldBtn,width:"auto",padding:"8px 16px",marginBottom:0,fontSize:13}} onClick={saveExchangeRate}>💾 حفظ</button>
                    <div style={{fontSize:12,color:C.textSm}}>الحالي: 1$ = {toAr(exchangeRate)} د.ع</div>
                  </div>
                  <button style={{...S.goldBtn,width:"auto",padding:"10px 20px",marginBottom:0,fontSize:13,background:"linear-gradient(135deg,#1d4ed8,#1455cc)",color:"#fff"}}
                    onClick={()=>{
                      // PDF كشف الرواتب
                      const period = salFilterMonth||"كل الأشهر";
                      const totalDinarBase2=salaryEmployees.filter(e=>e.currency==="دينار"||!e.currency).reduce((s,e)=>s+e.baseSalary,0);
                      const printDate = new Date().toLocaleDateString("ar-IQ");
                      const printTime = new Date().toLocaleTimeString("ar-IQ",{hour:"2-digit",minute:"2-digit"});
                      const fmtCell=(v,cur)=>toAr(v.toLocaleString("ar-IQ"))+" "+(cur==="دولار"?"$":"د.ع");
                      const rows = salaryEmployees.map((e,idx)=>{
                        const base=e.baseSalary||0;
                        const ot=filtOt.filter(p=>p.employeeId===e.id).reduce((s,p)=>s+p.amount,0);
                        const adv=filtAdv.filter(p=>p.employeeId===e.id).reduce((s,p)=>s+p.amount,0);
                        const paid=filtPay.filter(p=>p.employeeId===e.id).reduce((s,p)=>s+p.amount,0);
                        const total=base+ot;
                        const totalRec=adv+paid;
                        const rem=total-totalRec;
                        const cur=e.currency||"دينار";
                        const rowBg=idx%2===0?"#ffffff":"#f8fafc";
                        return `<tr style="background:${rowBg}">
                          <td style="text-align:right;font-weight:800;color:#1a1a2e;padding-right:14px">${e.name}</td>
                          <td><span class="currency-badge">${cur==="دولار"?"🇺🇸 دولار":"🇮🇶 دينار"}</span></td>
                          <td style="color:#374151;font-weight:600">${fmtCell(base,cur)}</td>
                          <td style="color:#6B3FA0;font-weight:700">${ot>0?fmtCell(ot,cur):'<span style="color:#cbd5e1">—</span>'}</td>
                          <td style="color:#1d4ed8;font-weight:900;background:#eff6ff">${fmtCell(total,cur)}</td>
                          <td style="color:#b45309;font-weight:700">${adv>0?fmtCell(adv,cur):'<span style="color:#cbd5e1">—</span>'}</td>
                          <td style="color:#1A7A4A;font-weight:700">${paid>0?fmtCell(paid,cur):'<span style="color:#cbd5e1">—</span>'}</td>
                          <td style="color:#C17B2F;font-weight:900">${fmtCell(totalRec,cur)}</td>
                          <td style="background:${rem>=0?"#f0fdf4":"#fef2f2"}"><span class="${rem>=0?"badge-g":"badge-r"}">${fmtCell(Math.abs(rem),cur)} ${rem<0?"⚠️":""}</span></td>
                        </tr>`;
                      }).join("");
                      const html=`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<title>كشف رواتب — ${period}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800;900&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Tajawal',Tahoma,sans-serif;background:#fff;color:#1a1a2e;direction:rtl;font-size:13px}
  .page{max-width:900px;margin:0 auto;padding:32px 36px}

  /* الترويسة */
  .header{border-bottom:3px solid #1d4ed8;padding-bottom:18px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start}
  .company-block{display:flex;align-items:center;gap:14px}
  .logo-circle{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#1d4ed8,#3b82f6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:900;flex-shrink:0}
  .company-name{font-size:22px;font-weight:900;color:#1d4ed8;letter-spacing:-0.5px}
  .company-sub{font-size:12px;color:#6b7280;margin-top:2px}
  .doc-info{text-align:left;font-size:12px;color:#6b7280;line-height:1.8}
  .doc-number{font-size:16px;font-weight:900;color:#1d4ed8;margin-bottom:4px}

  /* عنوان الكشف */
  .doc-title{background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;border-radius:12px;padding:16px 22px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center}
  .doc-title h1{font-size:20px;font-weight:900;letter-spacing:-0.5px}
  .doc-title .period{font-size:13px;opacity:0.85;margin-top:3px}
  .doc-title .rate{font-size:12px;background:rgba(255,255,255,0.2);padding:4px 12px;border-radius:20px}

  /* بطاقات الملخص */
  .summary{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:24px}
  .box{border:1px solid #e2e8f0;border-radius:10px;padding:12px 10px;text-align:center;background:#f8fafc}
  .box-icon{font-size:20px;margin-bottom:4px}
  .box-label{font-size:10px;color:#64748b;font-weight:700;margin-bottom:4px;line-height:1.3}
  .box-val{font-size:14px;font-weight:900}
  .box-cur{font-size:10px;color:#94a3b8}
  .blue{color:#1d4ed8}.green{color:#1A7A4A}.red{color:#C0392B}.gold{color:#C17B2F}.purple{color:#6B3FA0}

  /* الجدول */
  .table-wrap{border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:20px}
  .table-title{background:#f1f5f9;padding:10px 16px;font-size:12px;font-weight:800;color:#1d4ed8;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between}
  table{width:100%;border-collapse:collapse;font-size:11.5px}
  thead tr{background:#1d4ed8}
  thead th{padding:10px 10px;color:#fff;font-weight:700;text-align:center;font-size:11px;white-space:nowrap}
  thead th:first-child{text-align:right;padding-right:14px}
  tbody tr:nth-child(even){background:#f8fafc}
  tbody tr:hover{background:#eff6ff}
  tbody td{padding:10px 10px;border-bottom:1px solid #f1f5f9;text-align:center;vertical-align:middle}
  tbody td:first-child{text-align:right;font-weight:800;color:#1a1a2e;padding-right:14px}
  tfoot tr{background:#dbeafe}
  tfoot td{padding:11px 10px;font-weight:900;text-align:center;border-top:2px solid #1d4ed8;color:#1d4ed8;font-size:12px}
  tfoot td:first-child{text-align:right;padding-right:14px;color:#1a1a2e}

  /* باقي له */
  .badge-g{background:#dcfce7;color:#166534;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:800;white-space:nowrap}
  .badge-r{background:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:800;white-space:nowrap}
  .currency-badge{font-size:10px;background:#eff6ff;color:#1d4ed8;padding:2px 7px;border-radius:5px;font-weight:700}

  /* التوقيعات */
  .signatures{display:flex;justify-content:space-between;margin-top:30px;padding-top:20px;border-top:1px solid #e2e8f0}
  .sig-box{text-align:center;width:160px}
  .sig-line{border-top:1px solid #94a3b8;margin-bottom:8px;margin-top:40px}
  .sig-label{font-size:11px;color:#64748b;font-weight:700}

  /* التذييل */
  .footer{margin-top:20px;padding-top:14px;border-top:2px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center}
  .footer-left{font-size:10px;color:#94a3b8}
  .footer-right{font-size:10px;color:#94a3b8;text-align:left}
  .footer-brand{font-size:12px;font-weight:900;color:#1d4ed8}

  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{padding:20px 24px}
    thead tr{-webkit-print-color-adjust:exact}
  }
</style>
</head>
<body>
<div class="page">

  <!-- الترويسة -->
  <div class="header">
    <div class="company-block">
      <div class="logo-circle">⚡</div>
      <div>
        <div class="company-name">نظام حساب</div>
        <div class="company-sub">إدارة الرواتب والموارد البشرية</div>
      </div>
    </div>
    <div class="doc-info">
      <div class="doc-number">كشف رواتب رقم #${toAr(new Date().getTime().toString().slice(-4))}</div>
      <div>تاريخ الإصدار: ${printDate}</div>
      <div>وقت الطباعة: ${printTime}</div>
      <div>الفترة: ${period}</div>
    </div>
  </div>

  <!-- عنوان الكشف -->
  <div class="doc-title">
    <div>
      <h1>كشف رواتب الموظفين</h1>
      <div class="period">الفترة المالية: ${period}</div>
    </div>
    <div class="rate">💱 1$ = ${toAr(exchangeRate)} د.ع</div>
  </div>

  <!-- بطاقات الملخص -->
  <div class="summary">
    <div class="box">
      <div class="box-icon">🇮🇶</div>
      <div class="box-label">رواتب الدينار الأساسية</div>
      <div class="box-val blue">${toAr(totalDinarBase2.toLocaleString("ar-IQ"))}</div>
      <div class="box-cur">دينار عراقي</div>
    </div>
    <div class="box">
      <div class="box-icon">🇺🇸</div>
      <div class="box-label">رواتب الدولار الأساسية</div>
      <div class="box-val green">${toAr(totalDollarBase.toLocaleString("ar-IQ"))}</div>
      <div class="box-cur">دولار أمريكي</div>
    </div>
    <div class="box">
      <div class="box-icon">📊</div>
      <div class="box-label">المجمل الكلي بالدينار</div>
      <div class="box-val gold">${toAr(Math.round(totalDinarAll).toLocaleString("ar-IQ"))}</div>
      <div class="box-cur">دينار عراقي</div>
    </div>
    <div class="box">
      <div class="box-icon">✅</div>
      <div class="box-label">إجمالي المدفوع دينار</div>
      <div class="box-val red">${toAr((dinarPaid+dinarAdv+dinarOT).toLocaleString("ar-IQ"))}</div>
      <div class="box-cur">دينار عراقي</div>
    </div>
    <div class="box">
      <div class="box-icon">✅</div>
      <div class="box-label">إجمالي المدفوع دولار</div>
      <div class="box-val red">${toAr((dollarPaid+dollarAdv+dollarOT).toLocaleString("ar-IQ"))}</div>
      <div class="box-cur">دولار أمريكي</div>
    </div>
  </div>

  <!-- جدول الرواتب -->
  <div class="table-wrap">
    <div class="table-title">
      <span>📋 تفصيل رواتب الموظفين — ${period}</span>
      <span style="color:#64748b;font-weight:400">جميع المبالغ بالعملة المحددة لكل موظف</span>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:14%">الموظف</th>
          <th style="width:7%">العملة</th>
          <th>الراتب الأساسي</th>
          <th>الأوفر تايم</th>
          <th>الإجمالي المستحق</th>
          <th>السلف المستلمة</th>
          <th>الرواتب المدفوعة</th>
          <th>إجمالي المستلم</th>
          <th>الباقي له</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="2">الإجمالي الكلي (دينار)</td>
          <td>${toAr(totalDinarBase2.toLocaleString("ar-IQ"))} د.ع</td>
          <td style="color:#6B3FA0">${toAr(dinarOT.toLocaleString("ar-IQ"))} د.ع</td>
          <td>${toAr((totalDinarBase2+dinarOT).toLocaleString("ar-IQ"))} د.ع</td>
          <td style="color:#b45309">${toAr(dinarAdv.toLocaleString("ar-IQ"))} د.ع</td>
          <td style="color:#1A7A4A">${toAr(dinarPaid.toLocaleString("ar-IQ"))} د.ع</td>
          <td style="color:#C17B2F">${toAr((dinarPaid+dinarAdv).toLocaleString("ar-IQ"))} د.ع</td>
          <td>${toAr(Math.abs(totalDinarBase2+dinarOT-(dinarPaid+dinarAdv)).toLocaleString("ar-IQ"))} د.ع</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- خانات التوقيع -->
  <div class="signatures">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">المدير المالي</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">المحاسب المسؤول</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">مدير الشركة</div>
    </div>
  </div>

  <!-- التذييل -->
  <div class="footer">
    <div class="footer-left">
      <div class="footer-brand">⚡ نظام حساب</div>
      <div>نظام إدارة الرواتب والحسابات</div>
    </div>
    <div class="footer-right">
      <div>تم الإصدار بتاريخ: ${printDate} الساعة ${printTime}</div>
      <div>هذه الوثيقة صادرة إلكترونياً وتعتبر رسمية</div>
    </div>
  </div>

</div>
</body>
</html>`;
                      const w=window.open("","_blank");w.document.write(html);w.document.close();setTimeout(()=>w.print(),600);
                    }}>
                    🖨️ طباعة كشف الرواتب
                  </button>
                </div>
              </div>

              {/* بطاقات الملخص */}
              <div style={{display:"grid",gridTemplateColumns:D?"repeat(3,1fr)":"1fr",gap:14,marginBottom:20}}>
                {/* دينار */}
                <div style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:18,padding:18,boxShadow:C.shadow}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#2557A7",marginBottom:12}}>🇮🇶 الرواتب بالدينار</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {[["رواتب أساسية",totalDinarBase],["مدفوع رواتب",dinarPaid],["سلف الشهر",dinarAdv],["أوفر تايم",dinarOT],].map(([l,v])=>(
                      <div key={l} style={{background:C.bg2,borderRadius:10,padding:"10px 12px"}}>
                        <div style={{fontSize:10,color:C.textSm,fontWeight:600}}>{l}</div>
                        <div style={{fontSize:14,fontWeight:800,color:C.text,marginTop:3}}>{fmtD(v)}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.cardBorder}`,display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:12,fontWeight:700,color:C.textMd}}>الإجمالي المدفوع</span>
                    <span style={{fontSize:15,fontWeight:900,color:C.red}}>{fmtD(dinarPaid+dinarAdv+dinarOT)}</span>
                  </div>
                </div>

                {/* دولار */}
                <div style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:18,padding:18,boxShadow:C.shadow}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#1A7A4A",marginBottom:12}}>🇺🇸 الرواتب بالدولار</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {[["رواتب أساسية",totalDollarBase],["مدفوع رواتب",dollarPaid],["سلف الشهر",dollarAdv],["أوفر تايم",dollarOT],].map(([l,v])=>(
                      <div key={l} style={{background:C.bg2,borderRadius:10,padding:"10px 12px"}}>
                        <div style={{fontSize:10,color:C.textSm,fontWeight:600}}>{l}</div>
                        <div style={{fontSize:14,fontWeight:800,color:C.text,marginTop:3}}>{fmt(v,"دولار")}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.cardBorder}`,display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:12,fontWeight:700,color:C.textMd}}>الإجمالي المدفوع</span>
                    <span style={{fontSize:15,fontWeight:900,color:C.red}}>{fmt(dollarPaid+dollarAdv+dollarOT,"دولار")}</span>
                  </div>
                </div>

                {/* المجمل */}
                <div style={{background:"linear-gradient(135deg,#1e3a5f,#1d4ed8)",borderRadius:18,padding:18,boxShadow:C.shadowMd}}>
                  <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.9)",marginBottom:12}}>📊 المجمل الكلي</div>
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginBottom:4}}>بالدينار (بعد تحويل الدولار)</div>
                    <div style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:-1}}>{fmtD(Math.round(totalDinarAll))}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:2}}>منها دينار: {fmtD(dinarPaid+dinarAdv+dinarOT)} + دولار محوّل: {fmtD(Math.round((dollarPaid+dollarAdv+dollarOT)*exchangeRate))}</div>
                  </div>
                  <div style={{paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.15)"}}>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginBottom:4}}>بالدولار (بعد تحويل الدينار)</div>
                    <div style={{fontSize:18,fontWeight:900,color:"#93c5fd",letterSpacing:-0.5}}>{fmt(Math.round(totalDollarAll*100)/100,"دولار")}</div>
                  </div>
                  <div style={{paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.15)",marginTop:8,fontSize:11,color:"rgba(255,255,255,0.6)"}}>
                    سعر الصرف المستخدم: 1$ = {toAr(exchangeRate)} د.ع
                  </div>
                </div>
              </div>

              {/* جدول كل موظف */}
              <div style={{...S.formCard,padding:0,overflow:"hidden"}}>
                <div style={{padding:"12px 16px",background:C.bg2,borderBottom:`1px solid ${C.cardBorder}`,fontWeight:700,fontSize:13,color:C.text}}>
                  📋 كشف راتب كل موظف {salFilterMonth?`— ${salFilterMonth}`:"(كل الأشهر)"}
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:700}}>
                    <thead>
                      <tr style={{background:"#1d4ed8"}}>
                        {[
                          {l:"الموظف",c:"#fff"},
                          {l:"العملة",c:"#fff"},
                          {l:"الراتب الأساسي",c:"#bfdbfe"},
                          {l:"⏰ الأوفر تايم",c:"#c4b5fd"},
                          {l:"📊 الإجمالي المستحق",c:"#fff"},
                          {l:"💳 السلف المستلمة",c:"#fde68a"},
                          {l:"💵 الرواتب المستلمة",c:"#bbf7d0"},
                          {l:"✅ إجمالي المستلم",c:"#fde68a"},
                          {l:"🔴 الباقي له",c:"#fff"},
                        ].map(({l,c})=>(
                          <th key={l} style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:c,fontSize:11,borderBottom:"2px solid rgba(255,255,255,0.2)"}}>{l}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {salaryEmployees.map((e,i)=>{
                        const base = e.baseSalary||0;
                        const ot   = filtOt.filter(p=>p.employeeId===e.id).reduce((s,p)=>s+p.amount,0);
                        const adv  = filtAdv.filter(p=>p.employeeId===e.id).reduce((s,p)=>s+p.amount,0);
                        const paid = filtPay.filter(p=>p.employeeId===e.id).reduce((s,p)=>s+p.amount,0);
                        const total = base + ot;
                        const totalReceived = adv + paid;
                        const remaining = total - totalReceived;
                        const isOver = remaining < 0;
                        return(
                          <tr key={e.id} style={{borderTop:`1px solid ${C.cardBorder}`,background:i%2===0?"#fff":C.bg}}>
                            <td style={{padding:"10px 12px",fontWeight:800,color:C.text,textAlign:"right",minWidth:90}}>{e.name}</td>
                            <td style={{padding:"10px 12px",textAlign:"center"}}>
                              <span style={{fontSize:11,fontWeight:700,color:e.currency==="دولار"?"#1A7A4A":"#2557A7",background:e.currency==="دولار"?"rgba(26,122,74,0.1)":"rgba(37,87,167,0.1)",padding:"3px 8px",borderRadius:6}}>
                                {e.currency==="دولار"?"🇺🇸":"🇮🇶"}
                              </span>
                            </td>
                            <td style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:C.textMd}}>{fmt(base,e.currency)}</td>
                            <td style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:"#6B3FA0"}}>{ot>0?fmt(ot,e.currency):<span style={{color:C.textSm}}>—</span>}</td>
                            <td style={{padding:"10px 12px",textAlign:"center",fontWeight:800,color:"#1d4ed8",background:"rgba(29,78,216,0.04)"}}>{fmt(total,e.currency)}</td>
                            <td style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:"#b45309"}}>{adv>0?fmt(adv,e.currency):<span style={{color:C.textSm}}>—</span>}</td>
                            <td style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:"#1A7A4A"}}>{paid>0?fmt(paid,e.currency):<span style={{color:C.textSm}}>—</span>}</td>
                            <td style={{padding:"10px 12px",textAlign:"center",fontWeight:800,color:C.gold,background:"rgba(193,123,47,0.05)"}}>{fmt(totalReceived,e.currency)}</td>
                            <td style={{padding:"10px 12px",textAlign:"center",fontWeight:900,minWidth:110,background:isOver?"rgba(192,57,43,0.06)":"rgba(26,122,74,0.06)"}}>
                              <div style={{color:isOver?C.red:C.green,fontSize:13}}>{fmt(Math.abs(remaining),e.currency)}</div>
                              <div style={{fontSize:10,color:isOver?C.red:C.green,marginTop:2}}>{isOver?"⚠️ تجاوز":"✅ مستحق"}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{background:C.bg2,borderTop:`2px solid #1d4ed8`}}>
                        <td colSpan={2} style={{padding:"10px 12px",fontWeight:800,color:C.text,fontSize:13}}>الإجمالي</td>
                        <td style={{padding:"10px 12px",textAlign:"center",fontWeight:800,color:C.textMd}}>
                          {fmtD(salaryEmployees.filter(e=>e.currency==="دينار"||!e.currency).reduce((s,e)=>s+e.baseSalary,0))}
                        </td>
                        <td style={{padding:"10px 12px",textAlign:"center",fontWeight:800,color:"#6B3FA0"}}>{fmtD(dinarOT)}</td>
                        <td style={{padding:"10px 12px",textAlign:"center",fontWeight:800,color:"#1d4ed8"}}>{fmtD(salaryEmployees.filter(e=>e.currency==="دينار"||!e.currency).reduce((s,e)=>s+e.baseSalary,0)+dinarOT)}</td>
                        <td style={{padding:"10px 12px",textAlign:"center",fontWeight:800,color:"#b45309"}}>{fmtD(dinarAdv)}</td>
                        <td style={{padding:"10px 12px",textAlign:"center",fontWeight:800,color:"#1A7A4A"}}>{fmtD(dinarPaid)}</td>
                        <td style={{padding:"10px 12px",textAlign:"center",fontWeight:800,color:C.gold}}>{fmtD(dinarPaid+dinarAdv)}</td>
                        <td style={{padding:"10px 12px",textAlign:"center",fontWeight:900,color:C.red}}>{fmtD(salaryEmployees.filter(e=>e.currency==="دينار"||!e.currency).reduce((s,e)=>s+e.baseSalary,0)+dinarOT-(dinarPaid+dinarAdv))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* رواتب الدينار */}
          {salTab==="dinar"&&(
            <div style={{...S.formCard,padding:0,overflow:"hidden"}}>
              <div style={{padding:"12px 16px",background:C.bg2,borderBottom:`1px solid ${C.cardBorder}`,fontWeight:700,fontSize:13}}>🇮🇶 سجل دفعات الدينار</div>
              {filtPay.filter(p=>p.currency==="دينار"||!p.currency).length===0?<div style={{...S.empty,padding:20}}>ما في دفعات</div>:(
                <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:C.bg2}}>{["الموظف","الشهر","المبلغ","التاريخ","ملاحظة",""].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"center",fontWeight:700,color:C.textMd,fontSize:11}}>{h}</th>)}</tr></thead>
                  <tbody>{filtPay.filter(p=>p.currency==="دينار"||!p.currency).map((p,i)=>(
                    <tr key={p.id} style={{borderTop:`1px solid ${C.cardBorder}`,background:i%2===0?"#fff":C.bg}}>
                      <td style={{padding:"8px 10px",fontWeight:700,textAlign:"right"}}>{p.employeeName}</td>
                      <td style={{padding:"8px 10px",textAlign:"center"}}><span style={{background:`rgba(193,123,47,0.1)`,color:C.gold,fontWeight:700,padding:"2px 8px",borderRadius:6,fontSize:11}}>{p.month}</span></td>
                      <td style={{padding:"8px 10px",textAlign:"center",fontWeight:800,color:"#2557A7"}}>{fmtD(p.amount)}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",color:C.textSm,fontSize:11}}>📅 {p.date}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",color:C.textSm}}>{p.note||"-"}</td>
                      <td style={{padding:"8px 10px",textAlign:"center"}}><button style={{background:"transparent",border:"none",color:C.red,cursor:"pointer"}} onClick={()=>delSalaryPayment(p.id)}>🗑️</button></td>
                    </tr>
                  ))}</tbody>
                  <tfoot><tr style={{background:C.bg2,borderTop:`2px solid ${C.cardBorder}`}}>
                    <td colSpan={2} style={{padding:"10px 12px",fontWeight:800,color:C.text}}>الإجمالي</td>
                    <td style={{padding:"10px 12px",textAlign:"center",fontWeight:900,color:C.red}}>{fmtD(filtPay.filter(p=>p.currency==="دينار"||!p.currency).reduce((s,p)=>s+p.amount,0))}</td>
                    <td colSpan={3}/>
                  </tr></tfoot>
                </table></div>
              )}
            </div>
          )}

          {/* رواتب الدولار */}
          {salTab==="dollar"&&(
            <div style={{...S.formCard,padding:0,overflow:"hidden"}}>
              <div style={{padding:"12px 16px",background:C.bg2,borderBottom:`1px solid ${C.cardBorder}`,fontWeight:700,fontSize:13}}>🇺🇸 سجل دفعات الدولار</div>
              {filtPay.filter(p=>p.currency==="دولار").length===0?<div style={{...S.empty,padding:20}}>ما في دفعات</div>:(
                <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:C.bg2}}>{["الموظف","الشهر","المبلغ","التاريخ","ملاحظة",""].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"center",fontWeight:700,color:C.textMd,fontSize:11}}>{h}</th>)}</tr></thead>
                  <tbody>{filtPay.filter(p=>p.currency==="دولار").map((p,i)=>(
                    <tr key={p.id} style={{borderTop:`1px solid ${C.cardBorder}`,background:i%2===0?"#fff":C.bg}}>
                      <td style={{padding:"8px 10px",fontWeight:700,textAlign:"right"}}>{p.employeeName}</td>
                      <td style={{padding:"8px 10px",textAlign:"center"}}><span style={{background:`rgba(193,123,47,0.1)`,color:C.gold,fontWeight:700,padding:"2px 8px",borderRadius:6,fontSize:11}}>{p.month}</span></td>
                      <td style={{padding:"8px 10px",textAlign:"center",fontWeight:800,color:"#1A7A4A"}}>{fmt(p.amount,"دولار")}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",color:C.textSm,fontSize:11}}>📅 {p.date}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",color:C.textSm}}>{p.note||"-"}</td>
                      <td style={{padding:"8px 10px",textAlign:"center"}}><button style={{background:"transparent",border:"none",color:C.red,cursor:"pointer"}} onClick={()=>delSalaryPayment(p.id)}>🗑️</button></td>
                    </tr>
                  ))}</tbody>
                  <tfoot><tr style={{background:C.bg2,borderTop:`2px solid ${C.cardBorder}`}}>
                    <td colSpan={2} style={{padding:"10px 12px",fontWeight:800,color:C.text}}>الإجمالي</td>
                    <td style={{padding:"10px 12px",textAlign:"center",fontWeight:900,color:C.red}}>{fmt(filtPay.filter(p=>p.currency==="دولار").reduce((s,p)=>s+p.amount,0),"دولار")}</td>
                    <td colSpan={3}/>
                  </tr></tfoot>
                </table></div>
              )}
            </div>
          )}

          {/* السلف */}
          {salTab==="advances"&&(
            <div style={{...S.formCard,padding:0,overflow:"hidden"}}>
              <div style={{padding:"12px 16px",background:C.bg2,borderBottom:`1px solid ${C.cardBorder}`,fontWeight:700,fontSize:13}}>💳 سجل سلف الرواتب</div>
              {filtAdv.length===0?<div style={{...S.empty,padding:20}}>ما في سلف</div>:(
                <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:C.bg2}}>{["الموظف","المبلغ","التاريخ","ملاحظة",""].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"center",fontWeight:700,color:C.textMd,fontSize:11}}>{h}</th>)}</tr></thead>
                  <tbody>{filtAdv.map((p,i)=>(
                    <tr key={p.id} style={{borderTop:`1px solid ${C.cardBorder}`,background:i%2===0?"#fff":C.bg}}>
                      <td style={{padding:"8px 10px",fontWeight:700,textAlign:"right"}}>{p.employeeName}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",fontWeight:800,color:"#b45309"}}>{fmt(p.amount,p.currency)}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",color:C.textSm,fontSize:11}}>📅 {p.date}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",color:C.textSm}}>{p.note||"-"}</td>
                      <td style={{padding:"8px 10px",textAlign:"center"}}><button style={{background:"transparent",border:"none",color:C.red,cursor:"pointer"}} onClick={()=>delSalaryAdvance(p.id)}>🗑️</button></td>
                    </tr>
                  ))}</tbody>
                  <tfoot><tr style={{background:C.bg2,borderTop:`2px solid ${C.cardBorder}`}}>
                    <td style={{padding:"10px 12px",fontWeight:800,color:C.text}}>الإجمالي</td>
                    <td style={{padding:"10px 12px",textAlign:"center",fontWeight:900,color:"#b45309"}}>{fmtD(filtAdv.filter(p=>p.currency==="دينار"||!p.currency).reduce((s,p)=>s+p.amount,0))} + {fmt(filtAdv.filter(p=>p.currency==="دولار").reduce((s,p)=>s+p.amount,0),"دولار")}</td>
                    <td colSpan={3}/>
                  </tr></tfoot>
                </table></div>
              )}
            </div>
          )}

          {/* الأوفر تايم */}
          {salTab==="overtime"&&(
            <div style={{...S.formCard,padding:0,overflow:"hidden"}}>
              <div style={{padding:"12px 16px",background:C.bg2,borderBottom:`1px solid ${C.cardBorder}`,fontWeight:700,fontSize:13}}>⏰ سجل الأوفر تايم</div>
              {filtOt.length===0?<div style={{...S.empty,padding:20}}>ما في أوفر تايم</div>:(
                <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:C.bg2}}>{["الموظف","الشهر","الساعات","سعر الساعة","المبلغ","التاريخ","ملاحظة",""].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"center",fontWeight:700,color:C.textMd,fontSize:11}}>{h}</th>)}</tr></thead>
                  <tbody>{filtOt.map((p,i)=>(
                    <tr key={p.id} style={{borderTop:`1px solid ${C.cardBorder}`,background:i%2===0?"#fff":C.bg}}>
                      <td style={{padding:"8px 10px",fontWeight:700,textAlign:"right"}}>{p.employeeName}</td>
                      <td style={{padding:"8px 10px",textAlign:"center"}}><span style={{background:`rgba(193,123,47,0.1)`,color:C.gold,fontWeight:700,padding:"2px 8px",borderRadius:6,fontSize:11}}>{p.month}</span></td>
                      <td style={{padding:"8px 10px",textAlign:"center",color:C.textMd}}>{p.hours?toAr(p.hours)+" س":"-"}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",color:C.textMd}}>{p.ratePerHour?fmt(p.ratePerHour,p.currency):"-"}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",fontWeight:800,color:"#6B3FA0"}}>{fmt(p.amount,p.currency)}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",color:C.textSm,fontSize:11}}>📅 {p.date}</td>
                      <td style={{padding:"8px 10px",textAlign:"center",color:C.textSm}}>{p.note||"-"}</td>
                      <td style={{padding:"8px 10px",textAlign:"center"}}><button style={{background:"transparent",border:"none",color:C.red,cursor:"pointer"}} onClick={()=>delOvertimePayment(p.id)}>🗑️</button></td>
                    </tr>
                  ))}</tbody>
                </table></div>
              )}
            </div>
          )}

          {!D&&<button style={S.canBtn} onClick={()=>setView("home")}>← رجوع</button>}
        </div>
      );
    }
    // DEBTS
    if(user.role==="manager"&&view==="debts") return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>{!D&&<BackBtn/>}<div style={S.secTitle}>💳 قائمة الديون</div></div>
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

    // ════════════════════════════════
    // قسم الإدارة — ADMIN MODULE
    // ════════════════════════════════

    // ADMIN HOME
    if(user.role==="manager"&&view==="adminHome") return (
      <div>
        <div style={S.secTitle}>💼 لوحة الإدارة</div>

        {/* بطاقات القسم */}
        <div style={{display:"grid",gridTemplateColumns:D?"repeat(4,1fr)":"1fr 1fr",gap:14,marginBottom:28}}>
          {[
            {icon:"🏗️",label:"المشاريع",sub:`${projs.length} مشروع نشط`,v:"adminProjects",bg:"linear-gradient(135deg,#1d4ed8,#2563eb)"},
            {icon:"👷",label:"الموظفون",sub:`${salaryEmployees.length} موظف`,v:"adminEmployees",bg:"linear-gradient(135deg,#0f766e,#0d9488)"},
            {icon:"📋",label:"المهام",sub:"قريباً",v:"adminTasks",bg:"linear-gradient(135deg,#7c3aed,#6d28d9)"},
            {icon:"📊",label:"التقارير",sub:"قريباً",v:"adminReports",bg:"linear-gradient(135deg,#b45309,#92400e)"},
          ].map(c=>(
            <button key={c.v} style={{background:c.bg,borderRadius:18,padding:"20px 16px",border:"none",cursor:"pointer",textAlign:"right",color:"#fff",boxShadow:C.shadowMd,transition:"all 0.2s"}}
              onClick={()=>setView(c.v)}>
              <div style={{fontSize:32,marginBottom:8}}>{c.icon}</div>
              <div style={{fontSize:16,fontWeight:900,letterSpacing:-0.3}}>{c.label}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.75)",marginTop:3}}>{c.sub}</div>
            </button>
          ))}
        </div>

        {/* ملخص المشاريع */}
        <div style={S.secTitle}>🏗️ ملخص المشاريع</div>
        <div style={{...S.formCard,padding:0,overflow:"hidden",marginBottom:20}}>
          {projs.length===0?<div style={{...S.empty,padding:20}}>ما في مشاريع</div>:(
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:C.bg2}}>
                  {["المشروع","التخصص","المحافظة","القيمة","المصروف","الباقي"].map(h=>(
                    <th key={h} style={{padding:"10px 14px",textAlign:"center",fontWeight:700,color:C.textMd,fontSize:12,borderBottom:`1px solid ${C.cardBorder}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projs.map((p,i)=>{
                  const spent=txs.filter(t=>t.projectId===p.id&&t.type==="صرف").reduce((s,t)=>s+t.amount,0);
                  const rem=(p.value||0)-spent;
                  const pct=p.value?Math.min(100,Math.round(spent/p.value*100)):0;
                  return(
                    <tr key={p.id} style={{borderTop:`1px solid ${C.cardBorder}`,background:i%2===0?"#fff":C.bg}}>
                      <td style={{padding:"10px 14px",fontWeight:800,color:C.text,textAlign:"right"}}>{p.name}</td>
                      <td style={{padding:"10px 14px",textAlign:"center"}}><span style={{background:`rgba(37,87,167,0.1)`,color:"#2557A7",padding:"3px 10px",borderRadius:8,fontSize:11,fontWeight:700}}>{p.specialization||p.spec}</span></td>
                      <td style={{padding:"10px 14px",textAlign:"center",color:C.textMd,fontSize:12}}>{p.province}</td>
                      <td style={{padding:"10px 14px",textAlign:"center",fontWeight:700,color:C.textMd}}>{p.value?fmtD(p.value):"—"}</td>
                      <td style={{padding:"10px 14px",textAlign:"center",fontWeight:700,color:C.red}}>{fmtD(spent)}</td>
                      <td style={{padding:"10px 14px",textAlign:"center"}}>
                        <span style={{fontWeight:800,color:rem>=0?C.green:C.red}}>{fmtD(Math.abs(rem))}</span>
                        {p.value>0&&<div style={{background:C.bg3,borderRadius:999,height:4,marginTop:5,overflow:"hidden"}}><div style={{background:rem>=0?"#1A7A4A":"#C0392B",height:"100%",width:`${pct}%`,borderRadius:999}}/></div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ملخص سريع للموظفين */}
        <div style={S.secTitle}>👷 ملخص الموظفين</div>
        <div style={{display:"grid",gridTemplateColumns:D?"repeat(auto-fill,minmax(200px,1fr)":"1fr 1fr",gap:12}}>
          {salaryEmployees.map(e=>(
            <div key={e.id} style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:14,padding:14,boxShadow:C.shadow}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#0f766e,#0d9488)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:15,fontWeight:800}}>{e.name[0]}</div>
                <div>
                  <div style={{fontWeight:800,fontSize:14,color:C.text}}>{e.name}</div>
                  <div style={{fontSize:11,color:C.textSm}}>{e.note||"موظف"}</div>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
                <span style={{color:C.textMd}}>الراتب الأساسي</span>
                <span style={{fontWeight:700,color:C.gold}}>{fmt(e.baseSalary,e.currency)}</span>
              </div>
            </div>
          ))}
          {salaryEmployees.length===0&&<div style={{...S.empty,gridColumn:"1/-1"}}>ما في موظفين مسجلين</div>}
        </div>
      </div>
    );

    // ADMIN PROJECTS
    if(user.role==="manager"&&view==="adminProjects") return (
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          {!D&&<button style={S.backBtn2} onClick={()=>setView("adminHome")}>←</button>}
          <div style={S.secTitle}>🏗️ إدارة المشاريع</div>
        </div>
        <div style={{background:`rgba(37,87,167,0.06)`,border:`1px solid rgba(37,87,167,0.15)`,borderRadius:14,padding:"14px 18px",marginBottom:20,fontSize:13,color:"#2557A7",fontWeight:600}}>
          💡 لإضافة أو حذف مشاريع، اذهب لقسم المالية ← المشاريع
        </div>
        {projs.map((p,i)=>{
          const spent=txs.filter(t=>t.projectId===p.id&&t.type==="صرف").reduce((s,t)=>s+t.amount,0);
          const workers=WORKERS.filter(u=>txs.some(t=>t.projectId===p.id&&t.userId===u.id));
          const pct=p.value?Math.min(100,Math.round(spent/p.value*100)):0;
          return(
            <div key={p.id} style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:18,padding:18,marginBottom:14,boxShadow:C.shadow}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div>
                  <div style={{fontWeight:900,fontSize:17,color:C.text,letterSpacing:-0.3}}>{p.name}</div>
                  <div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
                    <span style={{background:`rgba(37,87,167,0.1)`,color:"#2557A7",padding:"3px 10px",borderRadius:8,fontSize:12,fontWeight:700}}>{p.specialization||p.spec}</span>
                    <span style={{background:`rgba(193,123,47,0.1)`,color:C.gold,padding:"3px 10px",borderRadius:8,fontSize:12,fontWeight:700}}>📍 {p.province}</span>
                  </div>
                </div>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:11,color:C.textSm,marginBottom:2}}>نسبة الإنجاز</div>
                  <div style={{fontSize:22,fontWeight:900,color:pct>=80?C.red:pct>=50?C.gold:C.green}}>{toAr(pct)}%</div>
                </div>
              </div>
              {p.value>0&&(
                <>
                  <div style={{...S.progBar,marginBottom:8}}>
                    <div style={{...S.progFill,width:`${pct}%`,background:pct>=80?"linear-gradient(90deg,#C0392B,#e74c3c)":pct>=50?"linear-gradient(90deg,#C17B2F,#f39c12)":"linear-gradient(90deg,#1A7A4A,#27ae60)"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:12}}>
                    <span style={{color:C.red,fontWeight:600}}>↑ صُرف: {fmtD(spent)}</span>
                    <span style={{color:C.green,fontWeight:600}}>باقي: {fmtD((p.value||0)-spent)}</span>
                    <span style={{color:C.textMd}}>القيمة: {fmtD(p.value)}</span>
                  </div>
                </>
              )}
              {workers.length>0&&(
                <div>
                  <div style={{fontSize:11,color:C.textSm,fontWeight:700,marginBottom:6}}>العاملون على المشروع</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {workers.map(u=>(
                      <span key={u.id} style={{background:C.bg2,border:`1px solid ${C.cardBorder}`,borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:600,color:C.textMd}}>
                        {u.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {projs.length===0&&<div style={S.empty}>ما في مشاريع</div>}
      </div>
    );

    // ADMIN EMPLOYEES
    if(user.role==="manager"&&view==="adminEmployees") return (
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          {!D&&<button style={S.backBtn2} onClick={()=>setView("adminHome")}>←</button>}
          <div style={S.secTitle}>👷 الموظفون</div>
        </div>
        <div style={{background:`rgba(15,118,110,0.06)`,border:`1px solid rgba(15,118,110,0.2)`,borderRadius:14,padding:"14px 18px",marginBottom:20,fontSize:13,color:"#0f766e",fontWeight:600}}>
          💡 لإضافة أو حذف موظفين، اذهب لقسم المالية ← الرواتب
        </div>
        <div style={D?S.empGrid:{}}>
          {[...WORKERS,...salaryEmployees.filter(se=>!WORKERS.some(w=>w.name===se.name))].map((e,i)=>(
            <div key={e.id||i} style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:16,padding:18,boxShadow:C.shadow}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                <div style={{...S.av,width:44,height:44,fontSize:19,borderRadius:14,background:e.role?avatarBg(e.role):"linear-gradient(135deg,#0f766e,#0d9488)"}}>{e.name[0]}</div>
                <div>
                  <div style={{fontWeight:800,fontSize:16,color:C.text}}>{e.name}</div>
                  <div style={{fontSize:12,color:C.textSm,marginTop:2}}>
                    {e.role==="partner"?"شريك":e.role==="accountant"?"محاسب":e.role?"موظف":"موظف رواتب"}
                  </div>
                </div>
              </div>
              {e.baseSalary&&(
                <div style={{background:C.bg2,borderRadius:10,padding:"8px 12px",display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:12,color:C.textMd,fontWeight:600}}>الراتب الأساسي</span>
                  <span style={{fontSize:13,fontWeight:800,color:C.gold}}>{fmt(e.baseSalary,e.currency)}</span>
                </div>
              )}
              {e.share&&(
                <div style={{background:`rgba(124,58,237,0.06)`,borderRadius:10,padding:"8px 12px",marginTop:6,display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:12,color:"#7c3aed",fontWeight:600}}>حصة بالشركة</span>
                  <span style={{fontSize:13,fontWeight:800,color:"#7c3aed"}}>{toAr(e.share)}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );

    // ADMIN TASKS (قريباً)
    if(user.role==="manager"&&view==="adminTasks") return (
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          {!D&&<button style={S.backBtn2} onClick={()=>setView("adminHome")}>←</button>}
          <div style={S.secTitle}>📋 المهام والمتابعة</div>
        </div>
        <div style={{textAlign:"center",padding:"60px 20px",background:C.card,borderRadius:24,border:`2px dashed ${C.cardBorder}`}}>
          <div style={{fontSize:64,marginBottom:16}}>🚧</div>
          <div style={{fontWeight:900,fontSize:22,color:C.text,marginBottom:8}}>قريباً</div>
          <div style={{fontSize:14,color:C.textMd,maxWidth:300,margin:"0 auto",lineHeight:1.6}}>
            نظام متابعة المهام والمشاريع قيد التطوير.<br/>سيتضمن تعيين مهام، متابعة الإنجاز، والتقارير.
          </div>
        </div>
      </div>
    );

    // ADMIN REPORTS (قريباً)
    if(user.role==="manager"&&view==="adminReports") return (
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          {!D&&<button style={S.backBtn2} onClick={()=>setView("adminHome")}>←</button>}
          <div style={S.secTitle}>📊 التقارير الإدارية</div>
        </div>
        <div style={{textAlign:"center",padding:"60px 20px",background:C.card,borderRadius:24,border:`2px dashed ${C.cardBorder}`}}>
          <div style={{fontSize:64,marginBottom:16}}>📊</div>
          <div style={{fontWeight:900,fontSize:22,color:C.text,marginBottom:8}}>قريباً</div>
          <div style={{fontSize:14,color:C.textMd,maxWidth:300,margin:"0 auto",lineHeight:1.6}}>
            التقارير الإدارية الشاملة قيد التطوير.<br/>ستتضمن تقارير المشاريع، الحضور، والأداء.
          </div>
        </div>
      </div>
    );

    return null;
  }
}

function ForemanOTForm({employees, onSubmit}) {
  const today2 = () => new Date().toISOString().split("T")[0];
  const thisMonth = () => new Date().toISOString().slice(0,7);
  const [f, setF] = useState({employeeId:"",hours:"",ratePerHour:"",amount:"",month:thisMonth(),date:today2(),note:""});
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const toAr2 = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);

  const amt = f.hours&&f.ratePerHour ? Number(f.hours)*Number(f.ratePerHour) : Number(f.amount)||0;
  const emp = employees.find(e=>e.id===f.employeeId);

  const submit = async () => {
    if(!f.employeeId||!f.month||!f.date||!amt) return;
    setLoading(true);
    const res = await onSubmit({...f, amount:amt});
    setLoading(false);
    if(res){ setOk(true); setTimeout(()=>{setOk(false);setF({employeeId:"",hours:"",ratePerHour:"",amount:"",month:thisMonth(),date:today2(),note:""});},2000); }
  };

  const inp = {width:"100%",background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:12,padding:"13px 16px",color:"#1a1a2e",fontSize:15,outline:"none",boxSizing:"border-box",fontFamily:"'Segoe UI',Arial,sans-serif",direction:"ltr"};
  const lbl = {fontSize:11,color:"#64748b",fontWeight:800,letterSpacing:1,textTransform:"uppercase",marginBottom:6,marginTop:16,display:"block"};

  if(ok) return (
    <div style={{textAlign:"center",padding:"60px 20px",background:"#fff",borderRadius:20,border:"1px solid #E2E8F0"}}>
      <div style={{fontSize:64,marginBottom:12}}>✅</div>
      <div style={{fontSize:22,fontWeight:900,color:"#0f766e"}}>Overtime Logged!</div>
      <div style={{fontSize:14,color:"#64748b",marginTop:4}}>Record saved successfully</div>
    </div>
  );

  return (
    <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:20,padding:24,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",direction:"ltr",fontFamily:"'Segoe UI',Arial,sans-serif"}}>

      {/* Worker */}
      <label style={lbl}>👷 Select Worker</label>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:4}}>
        {employees.map(e=>(
          <button key={e.id} style={{
            display:"flex",alignItems:"center",gap:10,padding:"12px 14px",
            borderRadius:12,border:`2px solid ${f.employeeId===e.id?"#0f766e":"#E2E8F0"}`,
            background:f.employeeId===e.id?"rgba(15,118,110,0.06)":"#F8FAFC",
            cursor:"pointer",textAlign:"left",transition:"all 0.2s",
          }} onClick={()=>setF(x=>({...x,employeeId:e.id}))}>
            <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#0f766e,#0d9488)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:16,fontWeight:800,flexShrink:0}}>{e.name[0]}</div>
            <div>
              <div style={{fontWeight:800,fontSize:14,color:f.employeeId===e.id?"#0f766e":"#1a1a2e"}}>{e.name}</div>
              <div style={{fontSize:11,color:"#64748b",marginTop:1}}>{e.currency==="دولار"?"$ Dollar":"د.ع Dinar"}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Month & Date */}
      <div style={{display:"flex",gap:12}}>
        <div style={{flex:1}}><label style={lbl}>📆 Month</label><input style={inp} type="month" value={f.month} onChange={e=>setF(x=>({...x,month:e.target.value}))}/></div>
        <div style={{flex:1}}><label style={lbl}>📅 Date</label><input style={inp} type="date" value={f.date} onChange={e=>setF(x=>({...x,date:e.target.value}))}/></div>
      </div>

      {/* Hours & Rate */}
      <div style={{display:"flex",gap:12}}>
        <div style={{flex:1}}>
          <label style={lbl}>⏱️ Hours</label>
          <input style={{...inp,textAlign:"center",fontSize:20,fontWeight:800}} type="number" placeholder="0" value={f.hours}
            onChange={e=>setF(x=>({...x,hours:e.target.value,amount:e.target.value&&x.ratePerHour?String(Number(e.target.value)*Number(x.ratePerHour)):""}))  }/>
        </div>
        <div style={{flex:1}}>
          <label style={lbl}>💰 Rate / Hour</label>
          <input style={{...inp,textAlign:"center",fontSize:18,fontWeight:700}} type="number" placeholder="0" value={f.ratePerHour}
            onChange={e=>setF(x=>({...x,ratePerHour:e.target.value,amount:x.hours&&e.target.value?String(Number(x.hours)*Number(e.target.value)):""}))  }/>
        </div>
      </div>

      {/* Auto calc preview */}
      {f.hours&&f.ratePerHour&&(
        <div style={{background:"rgba(15,118,110,0.08)",border:"1px solid rgba(15,118,110,0.25)",borderRadius:12,padding:"14px 18px",marginTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:14,color:"#0f766e",fontWeight:700}}>
            {f.hours} hrs × {Number(f.ratePerHour).toLocaleString()} = 
          </div>
          <div style={{fontSize:22,fontWeight:900,color:"#0f766e"}}>
            {Number(amt).toLocaleString()} {emp?.currency==="دولار"?"$":"IQD"}
          </div>
        </div>
      )}

      {/* Manual amount */}
      {!f.hours&&<>
        <label style={lbl}>💵 Or Enter Amount Directly</label>
        <input style={{...inp,textAlign:"center",fontSize:18,fontWeight:700}} type="number" placeholder="0" value={f.amount} onChange={e=>setF(x=>({...x,amount:e.target.value}))}/>
      </>}

      {/* Note */}
      <label style={lbl}>📝 Note (optional)</label>
      <input style={inp} placeholder="e.g. Night shift, holiday work..." value={f.note} onChange={e=>setF(x=>({...x,note:e.target.value}))}/>

      {/* Submit */}
      <button style={{
        width:"100%",background:(!f.employeeId||!amt)?"#e2e8f0":"linear-gradient(135deg,#0f766e,#0d9488)",
        border:"none",borderRadius:14,padding:17,
        color:(!f.employeeId||!amt)?"#94a3b8":"#fff",
        fontSize:17,fontWeight:800,cursor:(!f.employeeId||!amt)?"not-allowed":"pointer",
        marginTop:20,letterSpacing:0.3,
        boxShadow:(!f.employeeId||!amt)?"none":"0 6px 20px rgba(15,118,110,0.3)",
      }} onClick={submit} disabled={!f.employeeId||!amt||loading}>
        {loading?"Saving...":"⏰ Submit Overtime"}
      </button>
    </div>
  );
}

function PayDebtRow({debt, onPay}){
  const [amt,setAmt]=useState("");
  const [paying,setPaying]=useState(false);
  if(!paying) return(
    <button style={{marginTop:8,fontSize:12,fontWeight:700,color:"#1A7A4A",background:"rgba(26,122,74,0.08)",border:"1px solid rgba(26,122,74,0.2)",borderRadius:8,padding:"6px 14px",cursor:"pointer",width:"100%"}}
      onClick={()=>setPaying(true)}>✓ تسجيل سداد</button>
  );
  return(
    <div style={{marginTop:8,display:"flex",gap:8}}>
      <input style={{flex:1,background:"#F5F0E8",border:"1px solid #E2D9CC",borderRadius:8,padding:"6px 10px",fontSize:13,outline:"none"}}
        type="number" placeholder="المبلغ المسدد" value={amt} onChange={e=>setAmt(e.target.value)}/>
      <button style={{background:"linear-gradient(135deg,#1A7A4A,#147A40)",border:"none",borderRadius:8,padding:"6px 14px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}
        onClick={async()=>{await onPay(debt,amt);setAmt("");setPaying(false);}}>حفظ</button>
      <button style={{background:"transparent",border:"1px solid #E2D9CC",borderRadius:8,padding:"6px 10px",color:"#9B846D",fontSize:12,cursor:"pointer"}}
        onClick={()=>setPaying(false)}>✕</button>
    </div>
  );
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
