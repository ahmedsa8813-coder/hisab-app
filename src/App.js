import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, setDoc, limit } from "firebase/firestore";

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

// تحويل الرقم لكلمات بالعربي
const numToWords = (n, currency="دينار") => {
  if(!n||isNaN(n)) return "";
  const num = Math.floor(Number(n));
  if(num===0) return "صفر";
  const ones = ["","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة","عشرة","أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر","ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"];
  const tens = ["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"];
  const h = ["","مئة","مئتان","ثلاثمئة","أربعمئة","خمسمئة","ستمئة","سبعمئة","ثمانمئة","تسعمئة"];
  const readGroup = g => {
    if(g===0) return "";
    if(g<20) return ones[g];
    if(g<100) return tens[Math.floor(g/10)]+(g%10?" و"+ones[g%10]:"");
    return h[Math.floor(g/100)]+(g%100?" و"+readGroup(g%100):"");
  };
  const parts = [];
  if(num>=1000000000){ parts.push(readGroup(Math.floor(num/1000000000))+" مليار"); }
  if(num%1000000000>=1000000){ parts.push(readGroup(Math.floor((num%1000000000)/1000000))+" مليون"); }
  if(num%1000000>=1000){ parts.push(readGroup(Math.floor((num%1000000)/1000))+" ألف"); }
  if(num%1000>0){ parts.push(readGroup(num%1000)); }
  return parts.join(" و") + " " + currency;
};

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
  }

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
  const [fuType,  setFuType]  = useState("all"); // all | استلام | صرف
  const [fuName,  setFuName]  = useState(""); // بحث بالاسم
  const [stUser,  setStUser]  = useState(null);
  const [selProj, setSelProj] = useState(null);
  const [pfFrom,  setPfFrom]  = useState("");
  const [pfTo,    setPfTo]    = useState("");
  const [pfType,  setPfType]  = useState("all"); // all | استلام | صرف
  const [viewImg, setViewImg] = useState(null);
  const [editTx,  setEditTx]  = useState(null);
  const [confirmTx, setConfirmTx] = useState(false); // popup تأكيد المعاملة
  const [foremen, setForemen] = useState([]);
  const [foremanTrust, setForemanTrust] = useState([]); // أمانات الفورمنية
  const [OBform,  setOBform]  = useState({});
  const [OBok,    setOBok]    = useState(false);
  const [compForm,setCompForm]= useState({});
  const [compOk,  setCompOk]  = useState(false);
  const [debts,   setDebts]   = useState([]);
  const [debtForm,setDebtForm]= useState({name:"",debtType:"person",creditorType:"person",projectId:"",amount:"",currency:"دينار",dueDate:"",note:"",address:"",installment:false,installmentAmount:"",installmentPeriod:"شهري"});
  const [showDebtForm,setShowDebtForm]=useState(false);
  const [debtTab,     setDebtTab]     = useState("persons"); // persons | locations
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
  const [workLogs,setWorkLogs]=useState([]); // سجل الساعات اليومي من الفورمن
  const [workLogForm,setWorkLogForm]=useState({employeeId:"",hours:"",date:today(),note:""});
  const [showWorkLogForm,setShowWorkLogForm]=useState(false);
  const [workLogMonth,setWorkLogMonth]=useState(new Date().toISOString().slice(0,7));
  const [salAdvForm,setSalAdvForm]=useState({employeeId:"",amount:"",date:today(),note:""});
  const [showSalAdvForm,setShowSalAdvForm]=useState(false);
  const [exchangeRate,setExchangeRate]=useState(1500);
  const [exchInput,setExchInput]=useState("");
  const imgRef = useRef();

  useEffect(() => {
    const u = [];
    u.push(onSnapshot(query(collection(db,"transactions"),orderBy("date","desc"),limit(500)), s => { setTxs(s.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); }));
    u.push(onSnapshot(collection(db,"projects"), s => setProjs(s.docs.map(d=>({id:d.id,...d.data()})))));
    u.push(onSnapshot(collection(db,"openingBalances"), s => { const o={}; s.docs.forEach(d=>{o[d.id]=d.data();}); setOBs(o); }));
    u.push(onSnapshot(doc(db,"settings","company"), s => { if(s.exists()) setCompSet(s.data()); }));
    u.push(onSnapshot(query(collection(db,"debts"),orderBy("createdAt","desc")), s => {
      const dList = s.docs.map(d=>({id:d.id,...d.data()}));
      // migration: الديون القديمة ما عندها remaining
      dList.forEach(d=>{ if(d.remaining===undefined){ setDoc(doc(db,"debts",d.id),{remaining:d.amount,paidAmount:0},{merge:true}); }});
      setDebts(dList);
    }));
    u.push(onSnapshot(query(collection(db,"personalDebts"),orderBy("createdAt","desc")), s => setPersonalDebts(s.docs.map(d=>({id:d.id,...d.data()})))));
    u.push(onSnapshot(collection(db,"salaryEmployees"), s => setSalaryEmployees(s.docs.map(d=>({id:d.id,...d.data()})))));
    u.push(onSnapshot(query(collection(db,"salaryPayments"),orderBy("date","desc")), s => setSalaryPayments(s.docs.map(d=>({id:d.id,...d.data()})))));
    u.push(onSnapshot(query(collection(db,"overtimePayments"),orderBy("date","desc")), s => setOvertimePayments(s.docs.map(d=>({id:d.id,...d.data()})))));
    u.push(onSnapshot(query(collection(db,"salaryAdvances"),orderBy("date","desc")), s => setSalaryAdvances(s.docs.map(d=>({id:d.id,...d.data()})))));
    u.push(onSnapshot(query(collection(db,"workLogs"),orderBy("date","desc")), s => setWorkLogs(s.docs.map(d=>({id:d.id,...d.data()})))));
    u.push(onSnapshot(collection(db,"foremen"), s => setForemen(s.docs.map(d=>({id:d.id,...d.data()})))));
    u.push(onSnapshot(query(collection(db,"foremanTrust"),orderBy("date","desc")), s => setForemanTrust(s.docs.map(d=>({id:d.id,...d.data()})))));
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

    // صرف على العمل
    if(form.isWorkExpense&&user.role==="accountant"){
      if(!form.amount||!form.date)return;
      const amt=Number(form.amount);
      const srcProjId   = form.projectId||"";
      const srcProjName = projs.find(p=>p.id===srcProjId)?.name||"";
      await addDoc(collection(db,"transactions"),{
        userId:user.id, userName:user.name,
        projectId:srcProjId, projectName:srcProjName,
        type:"صرف", amount:amt,
        currency:form.currency,
        note:`📤 ${form.workExpenseType||"صرف على العمل"}${form.note?" — "+form.note:""}`,
        date:form.date, image:null,
        isPersonal:false, isAdvance:false, isWorkExpense:true,
        createdAt:new Date().toISOString(),
      });
      setFormOK(true);
      setTimeout(()=>{setFormOK(false);setForm({type:"صرف",projectId:"",amount:"",currency:"دينار",note:"",date:today(),image:null,isPersonal:false,isAdvance:false,advanceTo:"",advanceIsPersonal:false,receiveType:"",generalLabel:"",isForeman:false,foremanId:"",foremanName:"",fundSource:"",isWorkExpense:false,workExpenseType:""});setView("home");},1500);
      return;
    }

    // سحب شخصي لأحمد
    if(form.isPersonal&&user.role==="accountant"){
      const amt=Number(form.amount);
      const srcProjId   = form.projectId||"";
      const srcProjName = projs.find(p=>p.id===srcProjId)?.name||"";
      const srcLabel    = srcProjId?srcProjName:"الصندوق العام";

      // يتسجل على المشروع (أو الصندوق العام) كصرف
      await addDoc(collection(db,"transactions"),{
        userId:user.id, userName:user.name,
        projectId:srcProjId,
        projectName:srcProjName,
        type:"صرف", amount:amt,
        currency:form.currency,
        note:`👤 سحب شخصي — من ${srcLabel}${form.note?" — "+form.note:""}`,
        date:form.date, image:null,
        isPersonal:true, isAdvance:false,
        createdAt:new Date().toISOString(),
      });
      // تسجيل في personalDebts على نفسه (للكشف بالشركة)
      await addDoc(collection(db,"personalDebts"),{
        debtorId:user.id, debtorName:user.name,
        creditorId:"company", creditorName:"الشركة",
        amount:amt, currency:form.currency,
        remaining:amt, status:"غير مسدد",
        projectId:srcProjId, projectName:srcProjName,
        note:form.note||"", date:form.date,
        createdAt:new Date().toISOString(),
      });
      setFormOK(true);
      setTimeout(()=>{setFormOK(false);setForm({type:"استلام",projectId:"",amount:"",currency:"دينار",note:"",date:today(),image:null,isPersonal:false,isAdvance:false,advanceTo:"",advanceIsPersonal:false,receiveType:"",generalLabel:"",isForeman:false,foremanId:"",foremanName:""});setView("home");},1500);
      return;
    }

    // فورمن
    if(form.isForeman){
      if(!form.foremanId)return;
      const amt=Number(form.amount);
      const foreman=foremen.find(f=>f.id===form.foremanId);
      // استخدم المشروع من النموذج أو من الفورمن
      const srcProjId   = form.projectId||foreman?.projectId||"";
      const srcProjName = projs.find(p=>p.id===srcProjId)?.name||"";

      // صرف على أحمد والمشروع فقط — الفورمن وسيط
      await addDoc(collection(db,"transactions"),{
        userId:user.id, userName:user.name,
        projectId:srcProjId, projectName:srcProjName,
        type:"صرف", amount:amt,
        currency:form.currency,
        note:`💰 دفع للفورمن ${foreman?.name||""}${srcProjName?" — "+srcProjName:""}${form.note?" — "+form.note:""}`,
        date:form.date, image:null,
        isPersonal:false, isAdvance:false, isForeman:true,
        foremanId:form.foremanId, foremanName:foreman?.name||"",
        createdAt:new Date().toISOString(),
      });

      // تسجيل أمانة عند الفورمن (ليست في الصندوق — مجرد تتبع)
      await addDoc(collection(db,"foremanTrust"),{
        foremanId:form.foremanId, foremanName:foreman?.name||"",
        projectId:srcProjId, projectName:srcProjName,
        amount:amt, currency:form.currency,
        date:form.date, note:form.note||"",
        settled:false, settledAmount:0,
        createdAt:new Date().toISOString(),
      });

      setFormOK(true);
      setTimeout(()=>{setFormOK(false);setForm({type:"استلام",projectId:"",amount:"",currency:"دينار",note:"",date:today(),image:null,isPersonal:false,isAdvance:false,advanceTo:"",advanceIsPersonal:false,receiveType:"",generalLabel:"",isForeman:false,foremanId:"",foremanName:""});setView("home");},1500);
      return;
    }

    // التحقق حسب النوع
    if(!form.isPersonal&&!form.isAdvance){
      if(user.role==="accountant"){
        if(form.receiveType==="project"&&!form.projectId)return;
        if(form.receiveType==="general"&&!form.generalLabel?.trim())return;
        if(!form.receiveType)return;
      } else {
        if(!form.projectId)return;
      }
    }
    if(form.isAdvance&&!form.advanceTo)return;
    // السلفة الشخصية لا تحتاج مشروع
    // السلفة للصندوق العام أيضاً لا تحتاج مشروع

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
      const srcProjId   = form.projectId||"";
      const srcProjName = projs.find(p=>p.id===srcProjId)?.name||"";
      const srcLabel    = srcProjId?`مشروع ${srcProjName}`:"الصندوق العام";

      // صرف على أحمد — يتسجل على المشروع أو الصندوق العام
      await addDoc(collection(db,"transactions"),{
        userId:user.id, userName:user.name,
        projectId:srcProjId, projectName:srcProjName,
        type:"صرف", amount:amt,
        currency:form.currency,
        note:`${isPersonalAdv?"قرض شخصي":"دفعة عمل"} لـ ${receiver?.name||""} من ${srcLabel}${form.note?" — "+form.note:""}`,
        date:form.date, image:null, isPersonal:false, isAdvance:true,
        advanceTo:form.advanceTo, advanceToName:receiver?.name||"",
        advanceIsPersonal:isPersonalAdv,
        fundSource:form.fundSource||"general",
        createdAt:new Date().toISOString(),
      });

      if(isPersonalAdv){
        // قرض شخصي: دين على الشخص
        await addDoc(collection(db,"personalDebts"),{
          debtorId:form.advanceTo, debtorName:receiver?.name||"",
          creditorId:user.id, creditorName:user.name,
          amount:amt, currency:form.currency,
          remaining:amt,
          note:form.note||"",
          date:form.date,
          status:"غير مسدد",
          projectId:srcProjId, projectName:srcProjName,
          payments:[],
          createdAt:new Date().toISOString(),
        });
        // ← المفتاح: تسجيل استلام عند نور بحسابه الشخصي
        await addDoc(collection(db,"transactions"),{
          userId:form.advanceTo, userName:receiver?.name||"",
          projectId:srcProjId, projectName:srcProjName,
          type:"استلام", amount:amt,
          currency:form.currency,
          note:`💳 سلفة شخصية من أحمد${form.note?" — "+form.note:""}`,
          date:form.date, image:null,
          isPersonal:true,   // ← يبين في الحساب الشخصي فقط
          isAdvance:true,
          advanceFrom:user.id, advanceFromName:user.name,
          createdAt:new Date().toISOString(),
        });
      } else {
        // دفعة عمل: تضاف للشخص كاستلام على نفس المشروع
        await addDoc(collection(db,"transactions"),{
          userId:form.advanceTo, userName:receiver?.name||"",
          projectId:srcProjId, projectName:srcProjName,
          type:"استلام", amount:amt,
          currency:form.currency,
          note:`استلام دفعة عمل من أحمد — ${srcLabel}${form.note?" — "+form.note:""}`,
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
      setForm({type:"استلام",projectId:"",amount:"",currency:"دينار",note:"",date:today(),image:null,isPersonal:false,isAdvance:false,advanceTo:"",advanceIsPersonal:false,receiveType:"",generalLabel:"",isForeman:false,foremanId:"",foremanName:""});
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

  const saveTxEdit = async (id, updates) => {
    await setDoc(doc(db,"transactions",id), updates, {merge:true});
    setEditTx(null);
  };

  // الفورمنية
  const addForeman = async (data) => {
    await addDoc(collection(db,"foremen"), {
      name: data.name.trim(),
      projectId: data.projectId||"",
      projectName: projs.find(p=>p.id===data.projectId)?.name||"",
      phone: data.phone||"",
      note: data.note||"",
      createdAt: new Date().toISOString(),
    });
  };
  const delForeman = async id => { if(window.confirm("تحذف هذا الفورمن؟")) await deleteDoc(doc(db,"foremen",id)); };

  // تسوية أمانة الفورمن
  const settleForeman = async (trust, settleAmt) => {
    const amt = Number(settleAmt);
    if(!amt||amt<=0) return;
    const newSettled = Math.min(trust.amount, (trust.settledAmount||0) + amt);
    const isDone = newSettled >= trust.amount;
    // تحديث الأمانة فقط — لا يتسجل في txs لأن الفلوس خرجت بالفعل
    await setDoc(doc(db,"foremanTrust",trust.id),{
      settledAmount: newSettled,
      settled: isDone,
      settledDate: today(),
    },{merge:true});
  };;

  const addDebt = async () => {
    if(!debtForm.name.trim()||!debtForm.amount) return;
    await addDoc(collection(db,"debts"),{
      name:debtForm.name.trim(),
      debtType:debtForm.debtType||"person",
      creditorType:debtForm.creditorType||"person",
      address:debtForm.address||"",
      projectId:debtForm.projectId||"",
      projectName:projs.find(p=>p.id===debtForm.projectId)?.name||"",
      amount:Number(debtForm.amount), currency:debtForm.currency,
      remaining:Number(debtForm.amount),
      paidAmount:0,
      dueDate:debtForm.dueDate||"",
      installment:debtForm.installment||false,
      installmentAmount:debtForm.installment?Number(debtForm.installmentAmount||0):0,
      installmentPeriod:debtForm.installmentPeriod||"شهري",
      status:"غير مسدد",
      note:debtForm.note, createdAt:new Date().toISOString(),
    });
    setDebtForm({name:"",debtType:"person",creditorType:"person",projectId:"",amount:"",currency:"دينار",dueDate:"",note:"",address:"",installment:false,installmentAmount:"",installmentPeriod:"شهري"});
    setShowDebtForm(false);
  };
  const updateDebtStatus = async (id,status) => await setDoc(doc(db,"debts",id),{status},{merge:true});
  const delDebt = async id=>{ if(window.confirm("تحذف هذا الدين؟")) await deleteDoc(doc(db,"debts",id)); };

  // سداد دين الشركة من أحمد
  const payCompanyDebt = async (debt, payAmt) => {
    const amt = Number(payAmt);
    if(!amt||amt<=0) return;
    const oldRemaining = debt.remaining||debt.amount;
    const newRemaining = Math.max(0, oldRemaining - amt);
    const newPaid = (debt.paidAmount||0) + amt;
    const isFull = newRemaining <= 0;
    // تحديث الدين
    await setDoc(doc(db,"debts",debt.id),{
      remaining: newRemaining,
      paidAmount: newPaid,
      status: isFull?"مسدد كامل":"مسدد جزئي",
      lastPayment: today(),
    },{merge:true});
    // صرف على أحمد
    const acc = USERS.find(u=>u.role==="accountant");
    if(acc){
      await addDoc(collection(db,"transactions"),{
        userId:acc.id, userName:acc.name,
        projectId:debt.projectId||"", projectName:debt.projectName||"",
        type:"صرف", amount:amt, currency:debt.currency,
        note:`💳 سداد دين — ${debt.name}${isFull?" (مكتمل)":""}`,
        date:today(), image:null,
        isPersonal:false, isAdvance:false, isDebtPayment:true,
        debtId:debt.id, debtName:debt.name,
        createdAt:new Date().toISOString(),
      });
    }
  };

  // دفع سلفة شخصية
  const payPersonalDebt = async (debt, payAmount) => {
    const amt = Number(payAmount);
    if(!amt||amt<=0) return;
    const remaining = debt.remaining||debt.amount;
    const newRemaining = Math.max(0, remaining - amt);
    const isFull = newRemaining <= 0;
    const newStatus = isFull?"مسدد كامل":"مسدد جزئي";
    // تحديث الدين
    await setDoc(doc(db,"personalDebts",debt.id),{
      remaining: newRemaining,
      status: newStatus,
      lastPayment: today(),
      lastPaymentAmount: amt,
    },{merge:true});
    // ١. استلام لأحمد
    await addDoc(collection(db,"transactions"),{
      userId: debt.creditorId||"ahmed",
      userName: debt.creditorName||"أحمد",
      projectId: debt.projectId||"", projectName: debt.projectName||"",
      type:"استلام", amount:amt, currency:debt.currency,
      note:`${isFull?"تسديد كامل":"تسديد جزئي"} — سلفة من ${debt.debtorName}${isFull?" ✅":""}`,
      date:today(), image:null, isPersonal:false, isAdvance:false,
      isDebtPayment:true, debtId:debt.id,
      createdAt:new Date().toISOString(),
    });
    // ٢. صرف على المدين (نور/محمد/...) — يبين في حسابه الشخصي
    await addDoc(collection(db,"transactions"),{
      userId: debt.debtorId,
      userName: debt.debtorName,
      projectId: debt.projectId||"", projectName: debt.projectName||"",
      type:"صرف", amount:amt, currency:debt.currency,
      note:`${isFull?"تسديد كامل":"تسديد جزئي"} سلفة لأحمد${isFull?" ✅":""}`,
      date:today(), image:null,
      isPersonal:true,   // يبين في الحساب الشخصي
      isAdvance:false, isDebtPayment:true, debtId:debt.id,
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

  // سجل الساعات اليومي
  const addWorkLog = async (data) => {
    if(!data.employeeId||!data.hours||!data.date) return false;
    const emp = salaryEmployees.find(e=>e.id===data.employeeId);
    const hoursAmt = Number(data.hours) * 1; // $1/hr
    const foodAmt  = data.hasFood?(emp?.foodAllowance||data.foodAmount||0):0;
    await addDoc(collection(db,"workLogs"),{
      employeeId: data.employeeId,
      employeeName: emp?.name||"",
      hours: Number(data.hours),
      date: data.date,
      month: data.date.slice(0,7),
      note: data.note||"",
      submittedBy: "foreman",
      ratePerHour: 1,
      amount: hoursAmt,
      hasFood: data.hasFood||false,
      foodAmount: foodAmt,
      totalDay: hoursAmt + foodAmt,
      currency: "دولار",
      createdAt: new Date().toISOString(),
    });
    return true;
  };

  const delWorkLog = async id=>{
    if(window.confirm("تحذف هذا السجل؟")) await deleteDoc(doc(db,"workLogs",id));
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

  const workerBals = WORKERS.map(u=>{
        // فقط المعاملات الحقيقية — بدون تسويات فورمن
        const list = txs.filter(t=>t.userId===u.id && !t.isForemanSettle);
        const ob   = OBs[u.id]||{};
        const personalW = list.filter(t=>t.type==="صرف"&&t.isPersonal).reduce((s,t)=>s+t.amount,0)+(ob.personalWithdraw||0);
        return{...u,din:bal(list,ob,"دينار"),dol:bal(list,ob,"دولار"),cnt:list.length,personalW};
      });

  // الصندوق العام = مجموع كل الاستلامات - مجموع كل المصروفات
  const generalFund = () => {
    const allOBdinR = WORKERS.reduce((s,u)=>s+(OBs[u.id]?.dinarReceived||0),0);
    const allOBdinS = WORKERS.reduce((s,u)=>s+(OBs[u.id]?.dinarSpent||0),0);
    const allOBdolR = WORKERS.reduce((s,u)=>s+(OBs[u.id]?.dollarReceived||0),0);
    const allOBdolS = WORKERS.reduce((s,u)=>s+(OBs[u.id]?.dollarSpent||0),0);

    // فلتر المعاملات الحقيقية فقط:
    // - بدون السلف الشخصية
    // - بدون تسويات الفورمن (isForemanSettle) لأنها لا تمثل تدفق مالي حقيقي
    const realTxs = txs.filter(t=>
      !t.isPersonal &&          // بدون سحوبات شخصية
      !t.isForemanSettle &&     // بدون تسويات فورمن
      !t.isDebtPayment          // الديون تُحسب منفصلة
    );

    const dinR = realTxs.filter(t=>t.type==="استلام"&&(t.currency==="دينار"||!t.currency)).reduce((s,t)=>s+t.amount,0)+allOBdinR;
    const dinS = realTxs.filter(t=>t.type==="صرف"&&(t.currency==="دينار"||!t.currency)).reduce((s,t)=>s+t.amount,0)+allOBdinS;
    const dolR = realTxs.filter(t=>t.type==="استلام"&&t.currency==="دولار").reduce((s,t)=>s+t.amount,0)+allOBdolR;
    const dolS = realTxs.filter(t=>t.type==="صرف"&&t.currency==="دولار").reduce((s,t)=>s+t.amount,0)+allOBdolS;

    // الديون الخارجية غير المسددة
    const externalDebts = debts.filter(d=>d.status!=="مسدد كامل").reduce((s,d)=>s+(d.remaining||d.amount||0),0);
    const personalDebtsTotal = personalDebts.filter(d=>d.status!=="مسدد كامل"&&d.creditorId!=="company").reduce((s,d)=>s+(d.remaining||d.amount||0),0);
    const totalDebts = externalDebts + personalDebtsTotal;

    const realDinB = dinR-dinS;
    const realDolB = dolR-dolS;
    const totalDinB = realDinB + totalDebts;

    return{
      dinR, dinS, dinB:realDinB,
      dolR, dolS, dolB:realDolB,
      totalDinB, totalDebts, externalDebts, personalDebtsTotal,
    };
  };;

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
    const allProjTx = txs.filter(t=>t.projectId===p.id&&(!from||t.date>=from)&&(!to||t.date<=to));
    const pt   = allProjTx.filter(t=>t.type==="صرف");
    const inc  = allProjTx.filter(t=>t.type==="استلام");
    const total= pt.reduce((s,t)=>s+t.amount,0);
    const totalInc = inc.reduce((s,t)=>s+t.amount,0);
    const balance  = totalInc - total; // الرصيد = استلام - صرف
    const byEmp=WORKERS.map(u=>{const ut=pt.filter(t=>t.userId===u.id);return{...u,spent:ut.reduce((s,t)=>s+t.amount,0),cnt:ut.length};}).filter(u=>u.spent>0);
    return{p,pt,inc,total,totalInc,balance,rem:(p.value||0)-total,byEmp,allProjTx};
  };
  const pr = selProj ? projRep(selProj,pfFrom,pfTo) : null;

  const navMgr = module==="admin"
    ? [{icon:"🏠",label:"الرئيسية",v:"adminHome"},{icon:"🏗️",label:"المشاريع",v:"adminProjects"},{icon:"👷",label:"الموظفون",v:"adminEmployees"},{icon:"📋",label:"المهام",v:"adminTasks"},{icon:"📊",label:"التقارير",v:"adminReports"}]
    : [{icon:"📊",label:"الملخص",v:"home"},{icon:"📄",label:"الكشوفات",v:"statements"},{icon:"📋",label:"المعاملات",v:"allTx"},{icon:"🏗️",label:"المشاريع",v:"projects"},{icon:"💰",label:"المالية",v:"projReport"},{icon:"🏢",label:"الشركة",v:"company"},{icon:"💳",label:"الديون",v:"debts"},{icon:"💵",label:"الرواتب",v:"salaries"},{icon:"👷",label:"الفورمنية",v:"foremen"},{icon:"⚖️",label:"افتتاحي",v:"opening"}];
  const navWorker = user?.role==="accountant"
    ? [{icon:"🏠",label:"الرئيسية",v:"home"},{icon:"↓",label:"استلام",v:"addReceive"},{icon:"↑",label:"صرف",v:"addSpend"},{icon:"💳",label:"سداد ديون",v:"payDebts"},{icon:"📄",label:"كشفي",v:"myStatement"},{icon:"💵",label:"الرواتب",v:"salaries"}]
    : user?.role==="foreman"
    ? [{icon:"🏠",label:"Home",v:"home"},{icon:"⏱️",label:"Log Hours",v:"logHours"},{icon:"📊",label:"Report",v:"hoursReport"}]
    : [{icon:"🏠",label:"الرئيسية",v:"home"},{icon:"➕",label:"تسجيل صرف",v:"add"},{icon:"📄",label:"كشف حسابي",v:"myStatement"}];
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
      {editTx&&<EditTxModal tx={editTx} projs={projs} onSave={saveTxEdit} onClose={()=>setEditTx(null)} S={S} C={C} today={today}/>}
      {confirmTx&&<ConfirmTxModal
        form={form} projs={projs} USERS={USERS} foremen={foremen}
        C={C} S={S} fmt={fmt} fmtD={fmtD}
        onConfirm={async()=>{setConfirmTx(false);await addTx();}}
        onClose={()=>setConfirmTx(false)}
      />}

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
      const thisMonth = new Date().toISOString().slice(0,7);
      const myLogs = workLogs.filter(t=>t.submittedBy==="foreman");
      const thisMonthLogs = myLogs.filter(t=>t.month===thisMonth);
      const totalHoursThisMonth = thisMonthLogs.reduce((s,t)=>s+(t.hours||0),0);
      const totalAmtThisMonth = totalHoursThisMonth * 1; // $1/hr

      // تجميع الساعات لكل عامل هذا الشهر
      const empSummary = salaryEmployees.map(e=>{
        const empLogs = thisMonthLogs.filter(l=>l.employeeId===e.id);
        const hrs = empLogs.reduce((s,l)=>s+(l.hours||0),0);
        return {...e, hrs, amt:hrs*1, days:empLogs.length};
      }).filter(e=>e.hrs>0);

      return (
        <div style={{fontFamily:"'Segoe UI',Arial,sans-serif",direction:"ltr",color:C.text}}>
          {/* Header */}
          <div style={{background:"linear-gradient(135deg,#0f766e,#0d9488)",borderRadius:20,padding:"20px",marginBottom:16,color:"#fff",boxShadow:C.shadowMd}}>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.8)",marginBottom:4}}>Welcome 👷</div>
            <div style={{fontSize:24,fontWeight:900}}>Foreman Dashboard</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.8)",marginTop:2}}>{thisMonth}</div>
          </div>

          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            <div style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:14,padding:14,boxShadow:C.shadow}}>
              <div style={{fontSize:10,color:C.textSm,fontWeight:700,marginBottom:4}}>THIS MONTH HOURS</div>
              <div style={{fontSize:26,fontWeight:900,color:"#0f766e"}}>{totalHoursThisMonth}</div>
              <div style={{fontSize:11,color:C.textMd}}>Total hours logged</div>
            </div>
            <div style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:14,padding:14,boxShadow:C.shadow}}>
              <div style={{fontSize:10,color:C.textSm,fontWeight:700,marginBottom:4}}>TOTAL AMOUNT</div>
              <div style={{fontSize:26,fontWeight:900,color:"#1A7A4A"}}>${totalAmtThisMonth}</div>
              <div style={{fontSize:11,color:C.textMd}}>@ $1/hour</div>
            </div>
          </div>

          {/* Monthly Worker Summary */}
          {empSummary.length>0&&(
            <div style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:16,padding:16,marginBottom:16,boxShadow:C.shadow}}>
              <div style={{fontWeight:800,fontSize:14,color:C.text,marginBottom:12}}>📊 This Month Summary</div>
              {empSummary.map(e=>(
                <div key={e.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.bg2}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#0f766e,#0d9488)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:800}}>{e.name[0]}</div>
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:C.text}}>{e.name}</div>
                      <div style={{fontSize:11,color:C.textSm}}>{e.days} days logged</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:900,fontSize:15,color:"#0f766e"}}>{e.hrs} hrs</div>
                    <div style={{fontSize:12,color:"#1A7A4A",fontWeight:700}}>${e.amt}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Buttons */}
          {!D&&(
            <div style={{display:"flex",gap:10,marginBottom:16}}>
              <button style={{flex:1,...S.goldBtn,background:"linear-gradient(135deg,#0f766e,#0d9488)",color:"#fff",marginBottom:0}}
                onClick={()=>setView("logHours")}>⏱️ Log Hours</button>
              <button style={{flex:1,...S.goldBtn,background:"linear-gradient(135deg,#1d4ed8,#2563eb)",color:"#fff",marginBottom:0}}
                onClick={()=>setView("hoursReport")}>📊 Report</button>
            </div>
          )}

          {/* Recent logs */}
          <div style={{fontWeight:800,fontSize:14,color:C.text,marginBottom:10}}>Recent Logs</div>
          {myLogs.slice(0,8).map(t=>(
            <div key={t.id} style={{background:C.card,border:`1px solid ${C.cardBorder}`,borderRadius:12,padding:"12px 14px",marginBottom:8,boxShadow:C.shadow}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:C.text}}>{t.employeeName}</div>
                  <div style={{fontSize:11,color:C.textSm,marginTop:2}}>📅 {t.date} {t.note&&`· ${t.note}`}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:900,fontSize:16,color:"#0f766e"}}>{t.hours} hrs</div>
                  <div style={{fontSize:12,color:"#1A7A4A",fontWeight:700}}>${t.amount}</div>
                </div>
              </div>
            </div>
          ))}
          {myLogs.length===0&&(
            <div style={{textAlign:"center",padding:30,color:C.textSm}}>
              <div style={{fontSize:36}}>📋</div>
              <div style={{fontWeight:700,marginTop:8}}>No logs yet</div>
            </div>
          )}
        </div>
      );
    }

    // FOREMAN LOG HOURS
    if(user.role==="foreman"&&view==="logHours") return (
      <div style={{fontFamily:"'Segoe UI',Arial,sans-serif",direction:"ltr",color:C.text}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          {!D&&<button style={S.backBtn2} onClick={()=>setView("home")}>←</button>}
          <div style={{fontSize:20,fontWeight:900,color:C.text}}>⏱️ Log Daily Hours</div>
        </div>
        <ForemanLogForm
          employees={salaryEmployees}
          onSubmit={addWorkLog}
        />
      </div>
    );

    // FOREMAN HOURS REPORT
    if(user.role==="foreman"&&view==="hoursReport") return (
      <div style={{fontFamily:"'Segoe UI',Arial,sans-serif",direction:"ltr",color:C.text}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          {!D&&<button style={S.backBtn2} onClick={()=>setView("home")}>←</button>}
          <div style={{fontSize:20,fontWeight:900,color:C.text}}>📊 Hours Report</div>
        </div>
        <ForemanReport
          workLogs={workLogs}
          employees={salaryEmployees}
          onDelete={delWorkLog}
        />
      </div>
    );

    // WORKER HOME
    if(user.role!=="manager"&&view==="home") return (
      <div>

        {/* بطاقتا الرصيد — عمل وشخصي */}
        {(()=>{
          const workTxs     = myTxs.filter(t=>!t.isPersonal);
          const personalTxs = myTxs.filter(t=>t.isPersonal);
          const myOB = OBs[user.id]||{};

          // حساب العمل — دينار
          const workDinR = workTxs.filter(t=>t.type==="استلام"&&(t.currency==="دينار"||!t.currency)).reduce((s,t)=>s+t.amount,0)+(myOB.dinarReceived||0);
          const workDinS = workTxs.filter(t=>t.type==="صرف"&&(t.currency==="دينار"||!t.currency)).reduce((s,t)=>s+t.amount,0)+(myOB.dinarSpent||0);
          const workDinB = workDinR - workDinS;

          // حساب العمل — دولار
          const workDolR = workTxs.filter(t=>t.type==="استلام"&&t.currency==="دولار").reduce((s,t)=>s+t.amount,0)+(myOB.dollarReceived||0);
          const workDolS = workTxs.filter(t=>t.type==="صرف"&&t.currency==="دولار").reduce((s,t)=>s+t.amount,0)+(myOB.dollarSpent||0);
          const workDolB = workDolR - workDolS;

          // الحساب الشخصي
          const persR = personalTxs.filter(t=>t.type==="استلام").reduce((s,t)=>s+t.amount,0);
          const persS = personalTxs.filter(t=>t.type==="صرف").reduce((s,t)=>s+t.amount,0)+(myOB.personalWithdraw||0);

          // السلف المستحقة على الشخص
          const myDebts = personalDebts.filter(d=>d.debtorId===user.id&&d.status!=="مسدد كامل");
          const totalOwedByMe = myDebts.reduce((s,d)=>s+(d.remaining||d.amount||0),0);

          return (<>
            {/* 💼 حساب العمل */}
            <div style={{background:workDinB>=0?"linear-gradient(135deg,#065f46,#047857)":"linear-gradient(135deg,#7f1d1d,#991b1b)",borderRadius:18,padding:18,marginBottom:10,boxShadow:C.shadowMd}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.85)",fontWeight:700}}>💼 حساب العمل</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>
                  {workDinB>0?"مطلوب منك":workDinB<0?"أنت طالب":"متوازن"}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {/* دينار */}
                <div style={{background:"rgba(255,255,255,0.12)",borderRadius:12,padding:"12px"}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",marginBottom:4}}>🇮🇶 دينار</div>
                  <div style={{fontSize:20,fontWeight:900,color:"#fff"}}>{fmtD(Math.abs(workDinB))}</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.6)",marginTop:4}}>
                    ↓{fmtD(workDinR)} ↑{fmtD(workDinS)}
                  </div>
                </div>
                {/* دولار */}
                <div style={{background:"rgba(255,255,255,0.12)",borderRadius:12,padding:"12px"}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",marginBottom:4}}>🇺🇸 دولار</div>
                  <div style={{fontSize:20,fontWeight:900,color:"#fff"}}>{fmt(Math.abs(workDolB),"دولار")}</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.6)",marginTop:4}}>
                    ↓{fmt(workDolR,"دولار")} ↑{fmt(workDolS,"دولار")}
                  </div>
                </div>
              </div>
            </div>

            {/* 👤 الحساب الشخصي */}
            <div style={{background:"linear-gradient(135deg,#4c1d95,#6B3FA0)",borderRadius:18,padding:18,marginBottom:10,boxShadow:C.shadowMd}}>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.85)",fontWeight:700,marginBottom:10}}>👤 الحساب الشخصي</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div style={{background:"rgba(255,255,255,0.12)",borderRadius:12,padding:"12px",textAlign:"center"}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",marginBottom:4}}>↓ استلمت سلف</div>
                  <div style={{fontSize:18,fontWeight:900,color:"#c4b5fd"}}>{fmtD(persR)}</div>
                </div>
                <div style={{background:"rgba(255,255,255,0.12)",borderRadius:12,padding:"12px",textAlign:"center"}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",marginBottom:4}}>↑ سددت</div>
                  <div style={{fontSize:18,fontWeight:900,color:"#c4b5fd"}}>{fmtD(persS)}</div>
                </div>
              </div>
              {/* السلف المستحقة عليه */}
              {totalOwedByMe>0&&(
                <div style={{marginTop:10,background:"rgba(255,255,255,0.08)",borderRadius:10,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:"rgba(255,255,255,0.8)"}}>⏳ سلف باقية بذمتك</span>
                  <span style={{fontSize:15,fontWeight:900,color:"#fca5a5"}}>{fmtD(totalOwedByMe)}</span>
                </div>
              )}
              {myDebts.length>0&&(
                <div style={{marginTop:8}}>
                  {myDebts.map(d=>(
                    <div key={d.id} style={{background:"rgba(255,255,255,0.06)",borderRadius:8,padding:"8px 10px",marginBottom:4,display:"flex",justifyContent:"space-between"}}>
                      <div>
                        <div style={{fontSize:12,color:"rgba(255,255,255,0.85)",fontWeight:600}}>من {d.creditorName}</div>
                        <div style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>{d.date}</div>
                      </div>
                      <div style={{fontSize:13,fontWeight:800,color:"#fca5a5"}}>{fmt(d.remaining||d.amount,d.currency)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* زر كشف الحساب */}
            {!D&&<button style={{...S.goldBtn,marginBottom:10}} onClick={()=>setView("myStatement")}>
              📄 كشف حسابي الكامل
            </button>}
          </>);
        })()}
        {!D&&user.role==="accountant"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:0}}>
            <button style={{...S.goldBtn,background:"linear-gradient(135deg,#1A7A4A,#147A40)",color:"#fff",marginBottom:0}}
              onClick={()=>{setForm({type:"استلام",projectId:"",amount:"",currency:"دينار",note:"",date:today(),image:null,isPersonal:false,isAdvance:false,advanceTo:"",advanceIsPersonal:false,receiveType:"",generalLabel:"",isForeman:false,foremanId:"",foremanName:""});setView("addReceive");}}>
              ↓ استلام
            </button>
            <button style={{...S.goldBtn,background:"linear-gradient(135deg,#C0392B,#A93226)",color:"#fff",marginBottom:0}}
              onClick={()=>{setForm({type:"صرف",projectId:"",amount:"",currency:"دينار",note:"",date:today(),image:null,isPersonal:false,isAdvance:false,advanceTo:"",advanceIsPersonal:false,receiveType:"",generalLabel:"",isForeman:false,foremanId:"",foremanName:"",fundSource:""});setView("addSpend");}}>
              ↑ صرف / سلفة
            </button>
            {debts.filter(d=>d.status!=="مسدد كامل").length>0&&(
              <button style={{...S.goldBtn,background:"linear-gradient(135deg,#374151,#1f2937)",color:"#fff",marginBottom:0,gridColumn:"1/-1",position:"relative"}}
                onClick={()=>setView("payDebts")}>
                💳 سداد ديون الشركة
                <span style={{position:"absolute",top:-6,left:-6,background:C.red,color:"#fff",borderRadius:999,width:20,height:20,fontSize:11,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {toAr(debts.filter(d=>d.status!=="مسدد كامل").length)}
                </span>
              </button>
            )}
          </div>
        )}
        {!D&&user.role!=="accountant"&&(
          <button style={S.goldBtn} onClick={()=>{setForm({type:"صرف",projectId:"",amount:"",currency:"دينار",note:"",date:today(),image:null,isPersonal:false,isAdvance:false,advanceTo:""});setView("add");}}>
            ➕ تسجيل مصروف
          </button>
        )}
        {/* السلف الشخصية لأحمد */}
        {user.role==="accountant"&&(()=>{
          const myPersonalDebts = personalDebts.filter(d=>d.creditorId===user.id);
          const totalOwed = myPersonalDebts.filter(d=>d.status!=="مسدد كامل").reduce((s,d)=>s+(d.remaining||d.amount),0);
          if(myPersonalDebts.length===0) return null;
          return(
            <div style={{background:`rgba(192,57,43,0.06)`,border:`1px solid rgba(192,57,43,0.2)`,borderRadius:14,padding:"14px 16px",marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:700,color:C.red}}>💳 السلف الشخصية</div>
                <div style={{fontSize:14,fontWeight:800,color:C.red}}>مستحق: {fmtD(totalOwed)}</div>
              </div>
              {myPersonalDebts.map(d=>(
                <DebtEditCard key={d.id} debt={d}
                  onPay={payPersonalDebt}
                  onDelete={delPersonalDebt}
                  onEdit={async(id,updates)=>{await setDoc(doc(db,"personalDebts",id),updates,{merge:true});}}
                  S={S} C={C} fmtD={fmtD}
                />
              ))}
            </div>
          );
        })()}

        {/* قائمة المعاملات مقسمة لأحمد */}
        {user.role==="accountant"?(()=>{
          const recTxs = myTxs.filter(t=>t.type==="استلام");
          const spdTxs = myTxs.filter(t=>t.type==="صرف");
          const totRec = recTxs.reduce((s,t)=>s+t.amount,0);
          const totSpd = spdTxs.reduce((s,t)=>s+t.amount,0);
          return(
            <div>
              {/* ملخص سريع */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                <div style={{background:"rgba(26,122,74,0.08)",border:"1px solid rgba(26,122,74,0.2)",borderRadius:12,padding:"10px 14px",textAlign:"center"}}>
                  <div style={{fontSize:11,color:C.textSm,fontWeight:700,marginBottom:3}}>↓ إجمالي الاستلام</div>
                  <div style={{fontSize:16,fontWeight:900,color:"#1A7A4A"}}>{fmtD(totRec)}</div>
                  <div style={{fontSize:11,color:C.textSm,marginTop:2}}>{toAr(recTxs.length)} معاملة</div>
                </div>
                <div style={{background:"rgba(192,57,43,0.06)",border:"1px solid rgba(192,57,43,0.15)",borderRadius:12,padding:"10px 14px",textAlign:"center"}}>
                  <div style={{fontSize:11,color:C.textSm,fontWeight:700,marginBottom:3}}>↑ إجمالي الصرف</div>
                  <div style={{fontSize:16,fontWeight:900,color:C.red}}>{fmtD(totSpd)}</div>
                  <div style={{fontSize:11,color:C.textSm,marginTop:2}}>{toAr(spdTxs.length)} معاملة</div>
                </div>
              </div>

              {/* قسم الاستلام */}
              <div style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,paddingBottom:8,borderBottom:`2px solid rgba(26,122,74,0.2)`}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:"#1A7A4A"}}/>
                  <div style={{fontWeight:800,fontSize:15,color:"#1A7A4A"}}>↓ الاستلام</div>
                  <span style={{fontSize:12,color:C.textSm,marginRight:"auto"}}>{toAr(recTxs.length)} معاملة</span>
                </div>
                {recTxs.length===0?(
                  <div style={{...S.empty,padding:16,fontSize:13}}>ما في استلامات</div>
                ):(
                  <div style={D?S.txGrid:{}}>{recTxs.map(t=>(
                    <TxCard key={t.id} t={t} onImg={setViewImg}
                      onDelete={()=>delTx(t.id)} onEdit={setEditTx}/>
                  ))}</div>
                )}
              </div>

              {/* قسم الصرف */}
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,paddingBottom:8,borderBottom:`2px solid rgba(192,57,43,0.2)`}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:C.red}}/>
                  <div style={{fontWeight:800,fontSize:15,color:C.red}}>↑ الصرف</div>
                  <span style={{fontSize:12,color:C.textSm,marginRight:"auto"}}>{toAr(spdTxs.length)} معاملة</span>
                </div>
                {spdTxs.length===0?(
                  <div style={{...S.empty,padding:16,fontSize:13}}>ما في مصروفات</div>
                ):(
                  <div style={D?S.txGrid:{}}>{spdTxs.map(t=>(
                    <TxCard key={t.id} t={t} onImg={setViewImg}
                      onDelete={()=>delTx(t.id)} onEdit={setEditTx}/>
                  ))}</div>
                )}
              </div>
            </div>
          );
        })():(()=>{
          // بقية الموظفين — قائمة عادية
          return myTxs.length===0?<div style={S.empty}>ما عندك معاملات بعد</div>:(
            <div style={D?S.txGrid:{}}>{myTxs.map(t=>(
              <TxCard key={t.id} t={t} onImg={setViewImg}/>
            ))}</div>
          );
        })()}
      </div>
    );

    // MY STATEMENT - كشف حسابي
    if(user.role!=="manager"&&user.role!=="foreman"&&view==="myStatement") {
      return <MyStatementPage
        user={user} myTxs={myTxs} OBs={OBs} projs={projs}
        D={D} S={S} C={C} fmt={fmt} fmtD={fmtD} toAr={toAr}
        BackBtn={BackBtn} onImg={setViewImg}
        onDelete={user.role==="accountant"?delTx:undefined}
        onEdit={user.role==="accountant"?setEditTx:undefined}
      />;
    }

    // AHMED - سداد ديون الشركة
    if(user.role==="accountant"&&view==="payDebts") {
      const pendingDebts = debts.filter(d=>d.status!=="مسدد كامل");
      return (
        <div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
            <BackBtn to="home"/>
            <div style={S.secTitle}>💳 سداد ديون الشركة</div>
          </div>

          {pendingDebts.length===0?(
            <div style={{...S.empty,padding:40}}>
              <div style={{fontSize:48,marginBottom:8}}>✅</div>
              <div style={{fontWeight:700}}>ما في ديون مستحقة</div>
            </div>
          ):(
            <>
              {/* ملخص */}
              <div style={{background:"linear-gradient(135deg,#C0392B,#A93226)",borderRadius:16,padding:"16px 18px",marginBottom:20,boxShadow:C.shadowMd}}>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.8)",marginBottom:4}}>💳 إجمالي ديون الشركة المستحقة</div>
                <div style={{fontSize:24,fontWeight:900,color:"#fff"}}>{fmtD(pendingDebts.reduce((s,d)=>s+(d.remaining||d.amount||0),0))}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:4}}>{toAr(pendingDebts.length)} دين غير مسدد كامل</div>
              </div>

              {/* قائمة الديون */}
              {pendingDebts.map(d=>{
                const remaining = d.remaining??d.amount??0;
                const paid      = d.paidAmount||0;
                const pct       = d.amount>0?Math.min(100,Math.round(paid/d.amount*100)):0;
                return(
                  <div key={d.id} style={{...S.txCard,marginBottom:12,border:`1px solid rgba(192,57,43,0.2)`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div>
                        <div style={{fontWeight:900,fontSize:16,color:C.text}}>{d.name}</div>
                        {d.projectName&&<div style={{fontSize:12,color:C.gold,marginTop:2}}>🏗️ {d.projectName}</div>}
                        {d.dueDate&&<div style={{fontSize:11,color:C.textSm,marginTop:2}}>📅 استحقاق: {d.dueDate}</div>}
                      </div>
                      <div style={{textAlign:"left"}}>
                        <div style={{fontSize:18,fontWeight:900,color:C.red}}>{fmt(remaining,d.currency)}</div>
                        <div style={{fontSize:11,color:C.textSm}}>متبقي من {fmt(d.amount||0,d.currency)}</div>
                      </div>
                    </div>
                    {paid>0&&d.amount>0&&(
                      <>
                        <div style={{background:C.bg3,borderRadius:999,height:5,marginBottom:4,overflow:"hidden"}}>
                          <div style={{background:"linear-gradient(90deg,#1A7A4A,#27ae60)",height:"100%",borderRadius:999,width:`${pct}%`}}/>
                        </div>
                        <div style={{fontSize:11,color:C.textSm,marginBottom:8}}>مسدد {toAr(pct)}% — {fmt(paid,d.currency)}</div>
                      </>
                    )}
                    {d.note&&<div style={{fontSize:12,color:C.textMd,marginBottom:8}}>{d.note}</div>}
                    <div style={{background:"rgba(192,57,43,0.06)",border:"1px solid rgba(192,57,43,0.15)",borderRadius:8,padding:"8px 12px",fontSize:12,color:C.red,fontWeight:600,marginBottom:8}}>
                      ⚠️ السداد سيُخصم من رصيدك تلقائياً
                    </div>
                    <CompanyDebtPayRow debt={d} onPay={payCompanyDebt} S={S} C={C} fmt={fmt}/>
                  </div>
                );
              })}
            </>
          )}
        </div>
      );
    }

    // AHMED - صفحة الاستلام
    if(user.role==="accountant"&&view==="addReceive") return (
      <div style={D?{maxWidth:600}:{}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <BackBtn to="home"/>
          <div style={{...S.secTitle,color:"#1A7A4A"}}>↓ تسجيل استلام</div>
        </div>
        {formOK?(
          <div style={{textAlign:"center",padding:60}}>
            <div style={{fontSize:60,marginBottom:12}}>✅</div>
            <div style={{fontSize:20,fontWeight:800,color:"#1A7A4A"}}>تم تسجيل الاستلام!</div>
          </div>
        ):(
          <div style={S.formCard}>
            {/* نوع الاستلام */}
            <div style={S.fLbl}>مصدر الاستلام</div>
            <div style={S.tRow}>
              <button style={{...S.tBtn,...(form.receiveType==="project"?{background:"rgba(26,122,74,0.15)",border:`1px solid #1A7A4A`,color:"#1A7A4A"}:{})}}
                onClick={()=>setForm(f=>({...f,receiveType:"project",generalLabel:"",type:"استلام"}))}>🏗️ من مشروع</button>
              <button style={{...S.tBtn,...(form.receiveType==="general"?{background:`rgba(193,123,47,0.15)`,border:`1px solid ${C.gold}`,color:C.gold}:{})}}
                onClick={()=>setForm(f=>({...f,receiveType:"general",projectId:"",type:"استلام"}))}>📝 بند عام</button>
            </div>

            {form.receiveType==="project"&&(<>
              <div style={S.fLbl}>المشروع</div>
              <select style={S.sel} value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))}>
                <option value="">اختر المشروع</option>
                {projs.map(p=><option key={p.id} value={p.id}>{p.name} — {p.specialization||p.spec}</option>)}
              </select>
            </>)}
            {form.receiveType==="general"&&(<>
              <div style={S.fLbl}>اسم البند</div>
              <input style={S.inp} placeholder="مثال: دفعة عميل، إيجار..." value={form.generalLabel||""} onChange={e=>setForm(f=>({...f,generalLabel:e.target.value}))}/>
            </>)}

            <div style={S.fLbl}>المبلغ</div>
            <input style={{...S.inp,fontSize:20,fontWeight:800,textAlign:"center"}} type="number" placeholder="٠" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/>
            {form.amount&&Number(form.amount)>0&&(
              <div style={{background:"rgba(26,122,74,0.06)",border:"1px solid rgba(26,122,74,0.2)",borderRadius:10,padding:"8px 14px",marginTop:4,fontSize:13,color:"#1A7A4A",fontWeight:600,textAlign:"center"}}>
                {numToWords(form.amount, form.currency)}
              </div>
            )}

            <div style={S.fLbl}>العملة</div>
            <div style={S.tRow}>
              <button style={{...S.tBtn,...(form.currency==="دينار"?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}} onClick={()=>setForm(f=>({...f,currency:"دينار"}))}>🇮🇶 دينار</button>
              <button style={{...S.tBtn,...(form.currency==="دولار"?{background:"rgba(26,122,74,0.15)",border:`1px solid #1A7A4A`,color:"#1A7A4A"}:{})}} onClick={()=>setForm(f=>({...f,currency:"دولار"}))}>🇺🇸 دولار</button>
            </div>
            <div style={S.fLbl}>التاريخ</div>
            <input style={S.inp} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
            <div style={S.fLbl}>ملاحظة (اختياري)</div>
            <input style={S.inp} placeholder="..." value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
            <button style={{...S.subBtn,background:"linear-gradient(135deg,#1A7A4A,#147A40)",color:"#fff"}} onClick={()=>setConfirmTx(true)}>👁️ مراجعة وتأكيد</button>
            <button style={S.canBtn} onClick={()=>setView("home")}>إلغاء</button>
          </div>
        )}
      </div>
    );

    // AHMED - صفحة الصرف والسلف
    if(user.role==="accountant"&&view==="addSpend") return (
      <div style={D?{maxWidth:600}:{}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <BackBtn to="home"/>
          <div style={{...S.secTitle,color:C.red}}>↑ تسجيل صرف / سلفة</div>
        </div>
        {formOK?(
          <div style={{textAlign:"center",padding:60}}>
            <div style={{fontSize:60,marginBottom:12}}>✅</div>
            <div style={{fontSize:20,fontWeight:800,color:C.red}}>تم التسجيل!</div>
          </div>
        ):(
          <div style={S.formCard}>

            {/* ١. المصدر */}
            <div style={{fontWeight:800,fontSize:14,color:C.text,marginBottom:10}}>
              <span style={{background:C.gold,color:"#000",borderRadius:999,width:22,height:22,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,marginLeft:6}}>١</span>
              من أين تدفع؟
            </div>
            <div style={S.tRow}>
              <button style={{...S.tBtn,...(form.fundSource==="general"?{background:`rgba(193,123,47,0.15)`,border:`1px solid ${C.gold}`,color:C.gold}:{})}}
                onClick={()=>setForm(f=>({...f,fundSource:"general",projectId:"",isForeman:false}))}>
                📦 صندوق عام
              </button>
              <button style={{...S.tBtn,...(form.fundSource==="project"?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}}
                onClick={()=>setForm(f=>({...f,fundSource:"project"}))}>
                🏗️ من مشروع
              </button>
            </div>

            {form.fundSource==="project"&&(
              <select style={S.sel} value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))}>
                <option value="">اختر المشروع</option>
                {projs.map(p=><option key={p.id} value={p.id}>{p.name} — {p.specialization||p.spec}</option>)}
              </select>
            )}

            {/* إشعار المصدر */}
            {(form.fundSource==="general"||(form.fundSource==="project"&&form.projectId))&&(
              <div style={{background:form.fundSource==="project"?"rgba(37,87,167,0.06)":"rgba(193,123,47,0.06)",border:`1px solid ${form.fundSource==="project"?"rgba(37,87,167,0.2)":"rgba(193,123,47,0.2)"}`,borderRadius:10,padding:"8px 12px",fontSize:12,fontWeight:600,color:form.fundSource==="project"?"#2557A7":C.gold,marginTop:6}}>
                {form.fundSource==="project"&&form.projectId
                  ?`✅ سيُسجَّل على مشروع: ${projs.find(p=>p.id===form.projectId)?.name}`
                  :"✅ سيُسجَّل على الصندوق العام"
                }
              </div>
            )}

            {/* فاصل */}
            {(form.fundSource==="general"||(form.fundSource==="project"&&form.projectId))&&(
              <div style={{height:1,background:C.cardBorder,margin:"16px 0"}}/>
            )}

            {/* ٢. لمن؟ */}
            {(form.fundSource==="general"||(form.fundSource==="project"&&form.projectId))&&(
              <>
                <div style={{fontWeight:800,fontSize:14,color:C.text,marginBottom:10}}>
                  <span style={{background:C.gold,color:"#000",borderRadius:999,width:22,height:22,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,marginLeft:6}}>٢</span>
                  لمن تدفع؟
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  {/* الأشخاص */}
                  {WORKERS.filter(u=>u.id!=="ahmed").map(u=>(
                    <button key={u.id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:12,
                      border:`2px solid ${form.advanceTo===u.id?C.gold:C.cardBorder}`,
                      background:form.advanceTo===u.id?`rgba(193,123,47,0.08)`:C.bg2,
                      cursor:"pointer",textAlign:"right"}}
                      onClick={()=>setForm(f=>({...f,advanceTo:u.id,isForeman:false,isPersonal:false,isAdvance:true}))}>
                      <div style={{...S.av,width:30,height:30,fontSize:13,borderRadius:9,background:avatarBg(u.role),flexShrink:0}}>{u.name[0]}</div>
                      <div style={{fontSize:13,fontWeight:700,color:form.advanceTo===u.id?C.gold:C.text}}>{u.name}</div>
                    </button>
                  ))}
                  {/* الفورمنية */}
                  {foremen.map(f=>(
                    <button key={f.id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:12,
                      border:`2px solid ${form.foremanId===f.id?"#b45309":C.cardBorder}`,
                      background:form.foremanId===f.id?"rgba(180,83,9,0.08)":C.bg2,
                      cursor:"pointer",textAlign:"right"}}
                      onClick={()=>setForm(x=>({...x,foremanId:f.id,foremanName:f.name,isForeman:true,isAdvance:false,isPersonal:false,advanceTo:"",
                        projectId:x.fundSource==="project"?x.projectId:(f.projectId||"")}))}>
                      <div style={{width:30,height:30,borderRadius:9,background:"linear-gradient(135deg,#b45309,#92400e)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:800,flexShrink:0}}>{f.name[0]}</div>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:form.foremanId===f.id?"#b45309":C.text}}>{f.name}</div>
                        <div style={{fontSize:10,color:C.textSm}}>فورمن</div>
                      </div>
                    </button>
                  ))}
                  {/* سحب شخصي لأحمد */}
                  <button style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:12,
                    border:`2px solid ${form.isPersonal?"#6B3FA0":C.cardBorder}`,
                    background:form.isPersonal?"rgba(107,63,160,0.08)":C.bg2,
                    cursor:"pointer",textAlign:"right"}}
                    onClick={()=>setForm(f=>({...f,isPersonal:true,isAdvance:false,isForeman:false,isWorkExpense:false,advanceTo:"",foremanId:""}))}>
                    <div style={{width:30,height:30,borderRadius:9,background:"linear-gradient(135deg,#6B3FA0,#5B21B6)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:800,flexShrink:0}}>أ</div>
                    <div style={{fontSize:13,fontWeight:700,color:form.isPersonal?"#6B3FA0":C.text}}>👤 سحب شخصي</div>
                  </button>
                  {/* صرف على العمل */}
                  <button style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:12,
                    border:`2px solid ${form.isWorkExpense?"#C0392B":C.cardBorder}`,
                    background:form.isWorkExpense?"rgba(192,57,43,0.08)":C.bg2,
                    cursor:"pointer",textAlign:"right",gridColumn:"1/-1"}}
                    onClick={()=>setForm(f=>({...f,isWorkExpense:true,isPersonal:false,isAdvance:false,isForeman:false,advanceTo:"",foremanId:"",type:"صرف"}))}>
                    <div style={{width:30,height:30,borderRadius:9,background:"linear-gradient(135deg,#C0392B,#A93226)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:16,fontWeight:800,flexShrink:0}}>📤</div>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:form.isWorkExpense?"#C0392B":C.text}}>صرف على العمل</div>
                      <div style={{fontSize:10,color:C.textSm}}>مواد، مستلزمات، مصاريف مشروع...</div>
                    </div>
                  </button>
                </div>
              </>
            )}

            {/* فاصل */}
            {(form.advanceTo||form.isForeman||form.isPersonal)&&(
              <div style={{height:1,background:C.cardBorder,margin:"16px 0"}}/>
            )}

            {/* ٣. نوع الدفعة — فقط للأشخاص */}
            {form.advanceTo&&form.isAdvance&&(
              <>
                <div style={{fontWeight:800,fontSize:14,color:C.text,marginBottom:10}}>
                  <span style={{background:C.gold,color:"#000",borderRadius:999,width:22,height:22,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,marginLeft:6}}>٣</span>
                  نوع الدفعة
                </div>
                <div style={S.tRow}>
                  <button style={{...S.tBtn,...(!form.advanceIsPersonal?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}}
                    onClick={()=>setForm(f=>({...f,advanceIsPersonal:false}))}>
                    💼 دفعة عمل
                  </button>
                  <button style={{...S.tBtn,...(form.advanceIsPersonal?{background:"rgba(192,57,43,0.1)",border:`1px solid #C0392B`,color:"#C0392B"}:{})}}
                    onClick={()=>setForm(f=>({...f,advanceIsPersonal:true}))}>
                    👤 قرض شخصي
                  </button>
                </div>
                {/* توضيح */}
                <div style={{
                  background:form.advanceIsPersonal?"rgba(192,57,43,0.06)":"rgba(37,87,167,0.06)",
                  border:`1px solid ${form.advanceIsPersonal?"rgba(192,57,43,0.2)":"rgba(37,87,167,0.2)"}`,
                  borderRadius:10,padding:"10px 14px",marginTop:8,fontSize:13,
                  color:form.advanceIsPersonal?"#C0392B":"#2557A7",fontWeight:600
                }}>
                  {form.advanceIsPersonal
                    ?`💡 قرض شخصي لـ ${USERS.find(u=>u.id===form.advanceTo)?.name} — يتسجل على ${form.projectId?projs.find(p=>p.id===form.projectId)?.name:"الصندوق العام"} ويبين كدين شخصي`
                    :`💡 دفعة عمل لـ ${USERS.find(u=>u.id===form.advanceTo)?.name} — تتسجل على ${form.projectId?projs.find(p=>p.id===form.projectId)?.name:"الصندوق العام"}`
                  }
                </div>
              </>
            )}

            {/* سحب شخصي - توضيح + اختيار المصدر */}
            {form.isPersonal&&(
              <>
                <div style={S.fLbl}>من أي صندوق؟</div>
                <select style={S.sel} value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))}>
                  <option value="">📦 الصندوق العام</option>
                  {projs.map(p=><option key={p.id} value={p.id}>{p.name} — {p.specialization||p.spec}</option>)}
                </select>
                <div style={{background:"rgba(107,63,160,0.08)",border:`1px solid rgba(107,63,160,0.2)`,borderRadius:10,padding:"10px 14px",marginTop:8,fontSize:13,color:"#6B3FA0",fontWeight:600}}>
                  ⚠️ ينقص من رصيدك وسيبين في كشف {form.projectId?`مشروع "${projs.find(p=>p.id===form.projectId)?.name}"`:'"الصندوق العام"'}
                </div>
              </>
            )}

            {/* صرف على العمل */}
            {form.isWorkExpense&&(
              <>
                <div style={{height:1,background:C.cardBorder,margin:"12px 0"}}/>
                <div style={{background:"rgba(192,57,43,0.06)",border:`1px solid rgba(192,57,43,0.2)`,borderRadius:10,padding:"10px 14px",fontSize:13,color:"#C0392B",fontWeight:600}}>
                  📤 صرف على العمل — سيُسجَّل على {form.projectId?`مشروع "${projs.find(p=>p.id===form.projectId)?.name}"`:'"الصندوق العام"'} باسم أحمد
                </div>
                <div style={S.fLbl}>نوع الصرف / الوصف</div>
                <input style={S.inp} placeholder="مثال: مواد بناء، أجور عمال، مستلزمات..." value={form.workExpenseType||""} onChange={e=>setForm(f=>({...f,workExpenseType:e.target.value}))}/>
              </>
            )}

            {/* المبلغ والعملة والتاريخ */}
            {(form.advanceTo||form.isForeman||form.isPersonal||form.isWorkExpense)&&(
              <>
                <div style={{height:1,background:C.cardBorder,margin:"16px 0"}}/>
                <div style={{fontWeight:800,fontSize:14,color:C.text,marginBottom:10}}>
                  <span style={{background:C.gold,color:"#000",borderRadius:999,width:22,height:22,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,marginLeft:6}}>{form.advanceTo&&form.isAdvance?"٤":"٣"}</span>
                  تفاصيل المبلغ
                </div>
                <div style={S.fLbl}>المبلغ</div>
                <input style={{...S.inp,fontSize:20,fontWeight:800,textAlign:"center"}} type="number" placeholder="٠" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/>
                {form.amount&&Number(form.amount)>0&&(
                  <div style={{background:"rgba(192,57,43,0.06)",border:"1px solid rgba(192,57,43,0.15)",borderRadius:10,padding:"8px 14px",marginTop:4,fontSize:13,color:C.red,fontWeight:600,textAlign:"center"}}>
                    {numToWords(form.amount, form.currency)}
                  </div>
                )}
                <div style={S.fLbl}>العملة</div>
                <div style={S.tRow}>
                  <button style={{...S.tBtn,...(form.currency==="دينار"?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}} onClick={()=>setForm(f=>({...f,currency:"دينار"}))}>🇮🇶 دينار</button>
                  <button style={{...S.tBtn,...(form.currency==="دولار"?{background:"rgba(26,122,74,0.15)",border:`1px solid #1A7A4A`,color:"#1A7A4A"}:{})}} onClick={()=>setForm(f=>({...f,currency:"دولار"}))}>🇺🇸 دولار</button>
                </div>
                <div style={S.fLbl}>التاريخ</div>
                <input style={S.inp} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
                <div style={S.fLbl}>ملاحظة (اختياري)</div>
                <input style={S.inp} placeholder="..." value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
                <button style={{...S.subBtn,background:"linear-gradient(135deg,#C0392B,#A93226)",color:"#fff"}} onClick={()=>setConfirmTx(true)}>👁️ مراجعة وتأكيد</button>
                <button style={S.canBtn} onClick={()=>setView("home")}>إلغاء</button>
              </>
            )}
          </div>
        )}
      </div>
    );

    // ADD TX
    if(user.role!=="manager"&&view==="add") return (
      <div style={D?{maxWidth:600}:{}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><BackBtn to="home" label="رجوع"/><div style={S.secTitle}>تسجيل معاملة جديدة</div></div>
        {formOK?(
          <div style={{textAlign:"center",padding:60,color:"#34d399"}}><div style={{fontSize:60,marginBottom:12}}>✅</div><div style={{fontSize:20,fontWeight:800}}>تم التسجيل بنجاح!</div></div>
        ):(
          <div style={S.formCard}>

            {/* أحمد المحاسب - يستلم فقط أو يعطي سلفة */}
            {user.role==="accountant"&&(
              <>
                <div style={S.fLbl}>نوع المعاملة</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <button style={{...S.tBtn,...(!form.isAdvance&&!form.isForeman&&!form.isPersonal?{background:"rgba(26,122,74,0.15)",border:`1px solid #1A7A4A`,color:"#1A7A4A"}:{})}}
                    onClick={()=>setForm(f=>({...f,isAdvance:false,isForeman:false,isPersonal:false,type:"استلام"}))}>
                    ↓ استلام
                  </button>
                  <button style={{...S.tBtn,...(form.isAdvance?{background:"rgba(193,123,47,0.15)",border:`1px solid ${C.gold}`,color:C.gold}:{})}}
                    onClick={()=>setForm(f=>({...f,isAdvance:true,isForeman:false,isPersonal:false,type:"صرف",projectId:""}))}>
                    💸 سلفة لشخص
                  </button>
                  <button style={{...S.tBtn,...(form.isForeman?{background:"rgba(180,83,9,0.15)",border:`1px solid #b45309`,color:"#b45309"}:{})}}
                    onClick={()=>setForm(f=>({...f,isForeman:true,isAdvance:false,isPersonal:false,type:"صرف",projectId:"",advanceTo:""}))}>
                    👷 دفع لفورمن
                  </button>
                  <button style={{...S.tBtn,...(form.isPersonal?{background:"rgba(107,63,160,0.15)",border:`1px solid #6B3FA0`,color:"#6B3FA0"}:{})}}
                    onClick={()=>setForm(f=>({...f,isPersonal:true,isAdvance:false,isForeman:false,type:"صرف",projectId:""}))}>
                    👤 سحب شخصي
                  </button>
                </div>

                {/* سحب شخصي لأحمد */}
                {form.isPersonal&&(
                  <div style={{background:"rgba(107,63,160,0.08)",border:`1px solid rgba(107,63,160,0.2)`,borderRadius:10,padding:"12px 14px",marginTop:8,fontSize:13,color:"#6B3FA0",fontWeight:600}}>
                    ⚠️ هذا المبلغ سينقص من رصيدك ويُحسب ضمن حصتك بالشركة (١٥%)
                  </div>
                )}

                {/* دفع لفورمن */}
                {form.isForeman&&(
                  <>
                    <div style={S.fLbl}>اختر الفورمن</div>
                    {foremen.length===0?(
                      <div style={{background:`rgba(180,83,9,0.08)`,border:`1px solid rgba(180,83,9,0.2)`,borderRadius:10,padding:"12px 14px",fontSize:13,color:"#b45309",fontWeight:600}}>
                        ما في فورمنية مسجلين — اذهب لصفحة الفورمنية وأضف أولاً
                      </div>
                    ):(
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        {foremen.map(f=>{
                          const proj=projs.find(p=>p.id===f.projectId);
                          return(
                            <button key={f.id} style={{
                              display:"flex",alignItems:"center",gap:8,padding:"10px 12px",
                              borderRadius:12,border:`2px solid ${form.foremanId===f.id?"#b45309":C.cardBorder}`,
                              background:form.foremanId===f.id?"rgba(180,83,9,0.08)":C.bg2,
                              cursor:"pointer",textAlign:"right",
                            }} onClick={()=>setForm(x=>({...x,foremanId:f.id,foremanName:f.name,projectId:f.projectId||""}))}>
                              <div style={{width:30,height:30,borderRadius:9,background:"linear-gradient(135deg,#b45309,#92400e)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:800,flexShrink:0}}>{f.name[0]}</div>
                              <div style={{textAlign:"right"}}>
                                <div style={{fontSize:13,fontWeight:700,color:form.foremanId===f.id?"#b45309":C.text}}>{f.name}</div>
                                {proj&&<div style={{fontSize:10,color:C.textSm}}>{proj.name}</div>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {form.foremanId&&(
                      <div style={{background:"rgba(180,83,9,0.08)",border:`1px solid rgba(180,83,9,0.2)`,borderRadius:10,padding:"10px 14px",marginTop:8,fontSize:13,color:"#b45309",fontWeight:600}}>
                        💡 ستتسجل كدفعة لـ {form.foremanName} وتنقص من رصيد أحمد
                      </div>
                    )}
                  </>
                )}

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
                        <div style={S.fLbl}>مصدر الدفعة</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                          <button style={{...S.tBtn,...(!form.advanceIsPersonal&&form.projectId?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}}
                            onClick={()=>setForm(f=>({...f,advanceIsPersonal:false}))}>
                            🏗️ من مشروع
                          </button>
                          <button style={{...S.tBtn,...(!form.advanceIsPersonal&&!form.projectId?{background:"rgba(193,123,47,0.15)",border:`1px solid ${C.gold}`,color:C.gold}:{})}}
                            onClick={()=>setForm(f=>({...f,advanceIsPersonal:false,projectId:""}))}>
                            📦 صندوق عام
                          </button>
                          <button style={{...S.tBtn,...(form.advanceIsPersonal?{background:"rgba(107,63,160,0.15)",border:`1px solid #6B3FA0`,color:"#6B3FA0"}:{})}}
                            onClick={()=>setForm(f=>({...f,advanceIsPersonal:true,projectId:""}))}>
                            👤 شخصي
                          </button>
                        </div>

                        {/* اختيار المشروع */}
                        {!form.advanceIsPersonal&&(
                          <>
                            {form.projectId||form.projectId===""?(
                              <>
                                <div style={S.fLbl}>المشروع</div>
                                <select style={S.sel} value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))}>
                                  <option value="">📦 صندوق عام (بدون مشروع)</option>
                                  {projs.map(p=><option key={p.id} value={p.id}>{p.name} — {p.specialization||p.spec}</option>)}
                                </select>
                                <div style={{
                                  background:form.projectId?"rgba(37,87,167,0.08)":"rgba(193,123,47,0.08)",
                                  border:`1px solid ${form.projectId?"rgba(37,87,167,0.2)":"rgba(193,123,47,0.2)"}`,
                                  borderRadius:10,padding:"10px 14px",marginTop:8,fontSize:13,
                                  color:form.projectId?"#2557A7":C.gold,fontWeight:600
                                }}>
                                  {form.projectId
                                    ?`💡 ستتسجل على مشروع "${projs.find(p=>p.id===form.projectId)?.name}" باسم ${USERS.find(u=>u.id===form.advanceTo)?.name}`
                                    :`💡 ستتسجل من الصندوق العام باسم ${USERS.find(u=>u.id===form.advanceTo)?.name}`
                                  }
                                </div>
                              </>
                            ):null}
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
            }} onClick={()=>setConfirmTx(true)}>👁️ مراجعة وتأكيد</button>
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
            {stTxs.length===0?<div style={S.empty}>ما في معاملات</div>:<div style={D?S.txGrid:{}}>{stTxs.map(t=><TxCard key={t.id} t={t} onDelete={()=>delTx(t.id)} onImg={setViewImg} onEdit={setEditTx}/>)}</div>}
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
            {allTxs.length===0?<div style={S.empty}>ما في نتائج</div>:<div style={D?S.txGrid:{}}>{allTxs.map(t=><TxCard key={t.id} t={t} showUser onDelete={()=>delTx(t.id)} onImg={setViewImg} onEdit={setEditTx}/>)}</div>}
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
            const r=projRep(p,"","");
            const pct=p.value?Math.min(100,Math.round(r.total/p.value*100)):0;
            const balColor = r.balance>=0?"#1A7A4A":"#C0392B";
            return(
              <button key={p.id} style={S.projRepCard} onClick={()=>{setSelProj(p);setPfFrom("");setPfTo("");setPfType("all");}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                  <div style={{fontWeight:800,fontSize:15,letterSpacing:-0.3,textAlign:"right"}}>{p.name}</div>
                  <div style={{fontSize:11,background:`rgba(193,123,47,0.1)`,color:C.gold,padding:"3px 8px",borderRadius:6,fontWeight:700,whiteSpace:"nowrap",marginRight:8}}>{p.specialization||p.spec}</div>
                </div>
                <div style={{fontSize:12,color:C.textSm,marginBottom:12}}>📍 {p.province}</div>

                {/* الصندوق */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                  <div style={{background:"rgba(26,122,74,0.08)",borderRadius:10,padding:"8px 6px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:C.textSm,fontWeight:700,marginBottom:3}}>↓ استلام</div>
                    <div style={{fontSize:13,fontWeight:800,color:"#1A7A4A"}}>{fmtD(r.totalInc)}</div>
                  </div>
                  <div style={{background:"rgba(192,57,43,0.08)",borderRadius:10,padding:"8px 6px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:C.textSm,fontWeight:700,marginBottom:3}}>↑ صرف</div>
                    <div style={{fontSize:13,fontWeight:800,color:"#C0392B"}}>{fmtD(r.total)}</div>
                  </div>
                  <div style={{background:r.balance>=0?"rgba(26,122,74,0.08)":"rgba(192,57,43,0.08)",borderRadius:10,padding:"8px 6px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:C.textSm,fontWeight:700,marginBottom:3}}>الرصيد</div>
                    <div style={{fontSize:13,fontWeight:800,color:balColor}}>{fmtD(Math.abs(r.balance))}</div>
                  </div>
                </div>

                {p.value>0&&<>
                  <div style={S.progBar}><div style={{...S.progFill,width:`${pct}%`,background:pct>=90?"linear-gradient(90deg,#C0392B,#e74c3c)":pct>=60?"linear-gradient(90deg,#b45309,#f39c12)":"linear-gradient(90deg,#1A7A4A,#27ae60)"}}/></div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginTop:6,color:C.textSm}}>
                    <span>قيمة المشروع: {fmtD(p.value)}</span>
                    <span style={{fontWeight:700,color:pct>=90?"#C0392B":"#1A7A4A"}}>{toAr(pct)}% مصروف</span>
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
                  {/* صندوق المشروع الكامل */}
                  <div style={{background:"linear-gradient(135deg,#1e3a5f,#1d4ed8)",borderRadius:18,padding:18,marginBottom:16,boxShadow:C.shadowMd}}>
                    <div style={{fontSize:13,color:"rgba(255,255,255,0.8)",fontWeight:700,marginBottom:12}}>🏦 صندوق المشروع</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
                      <div style={{background:"rgba(26,122,74,0.3)",borderRadius:12,padding:"12px 10px",textAlign:"center"}}>
                        <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",marginBottom:4,fontWeight:700}}>↓ إجمالي الاستلام</div>
                        <div style={{fontSize:18,fontWeight:900,color:"#34d399"}}>{fmtD(pr.totalInc)}</div>
                        <div style={{fontSize:10,color:"rgba(255,255,255,0.6)",marginTop:2}}>{toAr(pr.inc.length)} معاملة</div>
                      </div>
                      <div style={{background:"rgba(192,57,43,0.3)",borderRadius:12,padding:"12px 10px",textAlign:"center"}}>
                        <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",marginBottom:4,fontWeight:700}}>↑ إجمالي الصرف</div>
                        <div style={{fontSize:18,fontWeight:900,color:"#f87171"}}>{fmtD(pr.total)}</div>
                        <div style={{fontSize:10,color:"rgba(255,255,255,0.6)",marginTop:2}}>{toAr(pr.pt.length)} معاملة</div>
                      </div>
                      <div style={{background:pr.balance>=0?"rgba(26,122,74,0.3)":"rgba(192,57,43,0.3)",borderRadius:12,padding:"12px 10px",textAlign:"center"}}>
                        <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",marginBottom:4,fontWeight:700}}>الرصيد الحالي</div>
                        <div style={{fontSize:18,fontWeight:900,color:pr.balance>=0?"#34d399":"#f87171"}}>{fmtD(Math.abs(pr.balance))}</div>
                        <div style={{fontSize:10,color:"rgba(255,255,255,0.7)",marginTop:2}}>{pr.balance>=0?"✅ موجب":"⚠️ سالب"}</div>
                      </div>
                    </div>
                    {selProj.value>0&&(
                      <>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"rgba(255,255,255,0.7)",marginBottom:6}}>
                          <span>قيمة المشروع: {fmtD(selProj.value)}</span>
                          <span>نسبة الصرف: {toAr(Math.min(100,Math.round(pr.total/selProj.value*100)))}%</span>
                        </div>
                        <div style={{background:"rgba(255,255,255,0.15)",borderRadius:999,height:8,overflow:"hidden"}}>
                          <div style={{background:pr.total/selProj.value>=0.9?"#f87171":"#34d399",height:"100%",borderRadius:999,width:`${Math.min(100,Math.round(pr.total/selProj.value*100))}%`,transition:"width 0.5s"}}/>
                        </div>
                      </>
                    )}
                  </div>

                  {/* تفصيل الصرف بالموظفين */}
                  <div style={{...S.secTitle,fontSize:15,marginBottom:12}}>👥 الصرف بالأشخاص</div>
                  {pr.byEmp.length===0?<div style={{...S.empty,padding:20}}>ما في مصروفات</div>:pr.byEmp.map(e=>(
                    <div key={e.id} style={{...S.txCard,marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{...S.av,width:38,height:38,fontSize:16,borderRadius:12,background:avatarBg(e.role)}}>{e.name[0]}</div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:14,color:C.text}}>{e.name}</div>
                          <div style={{fontSize:11,color:C.textSm}}>{toAr(e.cnt)} معاملة</div>
                        </div>
                        <div style={{textAlign:"left"}}>
                          <div style={{fontSize:15,fontWeight:900,color:"#C0392B"}}>{fmtD(e.spent)}</div>
                          {pr.total>0&&<div style={{fontSize:11,color:C.textSm}}>{toAr(Math.round(e.spent/pr.total*100))}% من الصرف</div>}
                        </div>
                      </div>
                      {pr.total>0&&<div style={{...S.progBar,marginTop:8,height:5}}><div style={{...S.progFill,width:`${Math.min(100,Math.round(e.spent/pr.total*100))}%`,background:"#f87171",height:"100%"}}/></div>}
                    </div>
                  ))}

                  {/* كل المعاملات */}
                  <div style={{...S.secTitle,fontSize:15,marginTop:20,marginBottom:12}}>📋 كل معاملات المشروع</div>

                  {/* فلتر النوع */}
                  <div style={{display:"flex",gap:8,marginBottom:12}}>
                    {[["all","الكل",C.gold],["استلام","↓ استلام","#1A7A4A"],["صرف","↑ صرف","#C0392B"]].map(([v,l,col])=>(
                      <button key={v} style={{...S.tBtn,flex:1,
                        background:pfType===v?`rgba(${v==="استلام"?"26,122,74":v==="صرف"?"192,57,43":"193,123,47"},0.12)`:"transparent",
                        border:`1px solid ${pfType===v?col:C.cardBorder}`,
                        color:pfType===v?col:C.textMd,fontWeight:pfType===v?700:500,
                      }} onClick={()=>setPfType(v)}>{l}</button>
                    ))}
                  </div>

                  {pr.allProjTx.filter(t=>pfType==="all"||t.type===pfType).length===0?(
                    <div style={S.empty}>ما في معاملات</div>
                  ):(
                    <div style={D?S.txGrid:{}}>{pr.allProjTx.filter(t=>pfType==="all"||t.type===pfType).slice(0,100).map(t=>(
                      <TxCard key={t.id} t={t} showUser onDelete={()=>delTx(t.id)} onImg={setViewImg} onEdit={setEditTx}/>
                    ))}</div>
                  )}
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
        if(fuType!=="all"&&t.type!==fuType)return false;
        if(fuName.trim()&&!(t.projectName||"").includes(fuName.trim())&&!(t.note||"").includes(fuName.trim()))return false;
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

                <div style={S.fLbl}>نوع المعاملة</div>
                <div style={S.tRow}>
                  <button style={{...S.tBtn,...(fuType==="all"?{background:`rgba(193,123,47,0.15)`,border:`1px solid ${C.gold}`,color:C.gold}:{})}} onClick={()=>setFuType("all")}>الكل</button>
                  <button style={{...S.tBtn,...(fuType==="استلام"?{background:"rgba(26,122,74,0.15)",border:`1px solid #1A7A4A`,color:"#1A7A4A"}:{})}} onClick={()=>setFuType("استلام")}>↓ استلام</button>
                  <button style={{...S.tBtn,...(fuType==="صرف"?{background:"rgba(192,57,43,0.15)",border:`1px solid #C0392B`,color:"#C0392B"}:{})}} onClick={()=>setFuType("صرف")}>↑ صرف</button>
                </div>

                <div style={S.fLbl}>بحث (مشروع أو ملاحظة)</div>
                <input style={S.inp} placeholder="ابحث..." value={fuName} onChange={e=>setFuName(e.target.value)}/>

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
                <button style={{...S.canBtn,marginTop:8}} onClick={()=>{setFuFrom("");setFuTo("");setFuProj("all");setStUser(null);setFuType("all");setFuName("");}}>↺ إعادة تعيين</button>
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
                  {/* فصل العمل والشخصي */}
                  {(()=>{
                    const workTxs     = stTxsAll.filter(t=>!t.isPersonal);
                    const personalTxs = stTxsAll.filter(t=>t.isPersonal);
                    const workR = workTxs.filter(t=>t.type==="استلام").reduce((s,t)=>s+t.amount,0)+stObR2;
                    const workS = workTxs.filter(t=>t.type==="صرف").reduce((s,t)=>s+t.amount,0)+stObS2;
                    const workBal = workR-workS;
                    const persW = personalTxs.filter(t=>t.type==="صرف").reduce((s,t)=>s+t.amount,0);

                    return (<>
                      {/* بطاقتان منفصلتان */}
                      <div style={{display:"grid",gridTemplateColumns:D?"1fr 1fr":"1fr",gap:12,marginBottom:16}}>
                        {/* حساب العمل */}
                        <div style={{...S.balCard,background:workBal>=0?"linear-gradient(135deg,#1A7A4A,#147A40)":"linear-gradient(135deg,#C0392B,#A93226)"}}>
                          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                            <div style={{...S.av,width:36,height:36,fontSize:16,borderRadius:11,background:"rgba(255,255,255,0.2)"}}>{stUserObj?.name[0]}</div>
                            <div>
                              <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>{stUserObj?.name}</div>
                              <div style={{fontSize:11,color:"rgba(255,255,255,0.8)"}}>💼 حساب العمل</div>
                            </div>
                          </div>
                          <div style={S.balAmt}>{fmt(Math.abs(workBal),fuCur)}</div>
                          <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.85)",margin:"4px 0 8px"}}>
                            {workBal>0?"✅ مطلوب منه":workBal<0?"⚠️ طالب":"◼️ متوازن"}
                          </div>
                          <div style={S.balRow}>
                            <span style={S.balSt}>↓ {fmt(workR,fuCur)}</span>
                            <span style={S.balSt}>↑ {fmt(workS,fuCur)}</span>
                          </div>
                        </div>

                        {/* الحساب الشخصي */}
                        <div style={{...S.balCard,background:"linear-gradient(135deg,#4c1d95,#6B3FA0)"}}>
                          <div style={{fontSize:12,color:"rgba(255,255,255,0.8)",marginBottom:6}}>👤 الحساب الشخصي</div>
                          <div style={S.balAmt}>{fmt(persW,fuCur)}</div>
                          <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.85)",margin:"4px 0 8px"}}>
                            إجمالي السحوبات الشخصية
                          </div>
                          <div style={{fontSize:12,color:"rgba(255,255,255,0.7)"}}>
                            {toAr(personalTxs.length)} معاملة شخصية
                          </div>
                        </div>
                      </div>

                      {/* المعاملات */}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
                        <div style={{fontSize:13,color:C.textMd,fontWeight:600}}>{toAr(stTxsAll.length)} معاملة إجمالاً</div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {fuType!=="all"&&<span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:8,background:fuType==="استلام"?"rgba(26,122,74,0.1)":"rgba(192,57,43,0.1)",color:fuType==="استلام"?"#1A7A4A":"#C0392B"}}>نوع: {fuType}</span>}
                          {fuName&&<span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:8,background:`rgba(193,123,47,0.1)`,color:C.gold}}>بحث: {fuName}</span>}
                        </div>
                      </div>

                      {/* قسم العمل */}
                      {workTxs.length>0&&(<>
                        <div style={{fontSize:13,fontWeight:800,color:"#1A7A4A",marginBottom:8}}>💼 معاملات العمل ({toAr(workTxs.length)})</div>
                        <div style={D?S.txGrid:{}}>{workTxs.map(t=><TxCard key={t.id} t={t} onDelete={()=>delTx(t.id)} onImg={setViewImg} onEdit={setEditTx}/>)}</div>
                      </>)}

                      {/* قسم الشخصي */}
                      {personalTxs.length>0&&(<>
                        <div style={{fontSize:13,fontWeight:800,color:"#6B3FA0",margin:"16px 0 8px"}}>👤 المعاملات الشخصية ({toAr(personalTxs.length)})</div>
                        <div style={D?S.txGrid:{}}>{personalTxs.map(t=><TxCard key={t.id} t={t} onDelete={()=>delTx(t.id)} onImg={setViewImg} onEdit={setEditTx}/>)}</div>
                      </>)}

                      {stTxsAll.length===0&&<div style={S.empty}>ما في معاملات بهذه الفلاتر</div>}
                    </>);
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    // SALARIES
    if((user.role==="manager"||user.role==="accountant")&&view==="salaries") {
      return <SalariesPage
        D={D} user={user} isManager={user.role==="manager"}
        salaryEmployees={salaryEmployees}
        salaryPayments={salaryPayments}
        salaryAdvances={salaryAdvances}
        overtimePayments={overtimePayments}
        onBack={()=>setView("home")}
        onDelEmployee={delSalaryEmployee}
        onDelPayment={delSalaryPayment}
        S={S} C={C} fmt={fmt} fmtD={fmtD} toAr={toAr} today={today}
        BackBtn={BackBtn}
        USERS={USERS}
        db={db}
        collection={collection}
        addDoc={addDoc}
        setDoc={setDoc}
        doc={doc}
      />;
    }
    // DEBTS
    if(user.role==="manager"&&view==="debts") {
      const personDebts   = debts.filter(d=>d.debtType==="person"||!d.debtType);
      const locationDebts = debts.filter(d=>d.debtType==="location");

      const totalPerson   = personDebts.filter(d=>d.status!=="مسدد كامل").reduce((s,d)=>s+(d.remaining||d.amount||0),0);
      const totalLocation = locationDebts.filter(d=>d.status!=="مسدد كامل").reduce((s,d)=>s+(d.remaining||d.amount||0),0);
      const totalAll      = totalPerson + totalLocation;

      const DebtCard = ({d}) => {
        const remaining = d.remaining??d.amount??0;
        const paid      = d.paidAmount||0;
        const pct       = d.amount>0?Math.min(100,Math.round(paid/d.amount*100)):0;
        const sc = d.status==="مسدد كامل"?"#1A7A4A":d.status==="مسدد جزئي"?"#b45309":"#C0392B";
        const sb = d.status==="مسدد كامل"?"rgba(26,122,74,0.08)":d.status==="مسدد جزئي"?"rgba(180,83,9,0.08)":"rgba(192,57,43,0.05)";
        const isLoc = d.debtType==="location";
        return (
          <div style={{background:C.card,borderRadius:16,padding:18,marginBottom:12,border:`1px solid ${sc}33`,boxShadow:C.shadow}}>
            {/* الرأس */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:18}}>{isLoc?"📍":"👤"}</span>
                  <div style={{fontWeight:900,fontSize:16,color:C.text}}>{d.name}</div>
                </div>
                {d.address&&<div style={{fontSize:12,color:C.textMd,marginBottom:2}}>📍 {d.address}</div>}
                {!isLoc&&d.creditorType&&<div style={{fontSize:11,background:`rgba(107,63,160,0.1)`,color:C.purple,padding:"2px 8px",borderRadius:6,display:"inline-block",marginBottom:2}}>{d.creditorType==="company"?"🏢 شركة":"👤 شخص"}</div>}
                {d.projectName&&<div style={{fontSize:12,color:C.gold,marginTop:2}}>🏗️ {d.projectName}</div>}
                {d.dueDate&&<div style={{fontSize:11,color:C.textSm,marginTop:2}}>📅 استحقاق: {d.dueDate}</div>}
                {d.installment&&d.installmentAmount>0&&<div style={{fontSize:11,color:"#2557A7",marginTop:2}}>💳 قسط {d.installmentPeriod}: {fmt(d.installmentAmount,d.currency)}</div>}
              </div>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:20,fontWeight:900,color:C.red}}>{fmt(remaining,d.currency)}</div>
                {paid>0&&<div style={{fontSize:11,color:C.textSm,marginTop:2}}>من {fmt(d.amount||0,d.currency)}</div>}
              </div>
            </div>

            {/* شريط التقدم */}
            {paid>0&&d.amount>0&&(
              <>
                <div style={{background:C.bg3,borderRadius:999,height:5,marginBottom:4,overflow:"hidden"}}>
                  <div style={{background:"linear-gradient(90deg,#1A7A4A,#27ae60)",height:"100%",borderRadius:999,width:`${pct}%`,transition:"width 0.5s"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.textSm,marginBottom:8}}>
                  <span>✅ مسدد: {fmt(paid,d.currency)}</span>
                  <span style={{fontWeight:700,color:"#1A7A4A"}}>{toAr(pct)}%</span>
                </div>
              </>
            )}

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:12,fontWeight:700,color:sc,background:sb,padding:"4px 12px",borderRadius:8}}>{d.status}</span>
              {d.lastPayment&&<span style={{fontSize:11,color:C.textSm}}>آخر سداد: {d.lastPayment}</span>}
            </div>

            {d.note&&<div style={{fontSize:12,color:C.textMd,background:C.bg2,borderRadius:8,padding:"6px 10px",marginBottom:8}}>{d.note}</div>}

            {d.status!=="مسدد كامل"&&<CompanyDebtPayRow debt={d} onPay={payCompanyDebt} S={S} C={C} fmt={fmt}/>}
            <button style={{marginTop:8,width:"100%",background:"transparent",border:`1px solid rgba(192,57,43,0.15)`,borderRadius:8,padding:"5px",color:C.red,fontSize:11,cursor:"pointer"}} onClick={()=>delDebt(d.id)}>🗑️ حذف</button>
          </div>
        );
      };

      return (
        <div>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              {!D&&<BackBtn/>}
              <div style={S.secTitle}>💳 ديون الشركة</div>
            </div>
            <button style={{...S.goldBtn,width:"auto",padding:"9px 18px",marginBottom:0,background:"linear-gradient(135deg,#C0392B,#A93226)",color:"#fff",fontSize:13}}
              onClick={()=>setShowDebtForm(v=>!v)}>
              {showDebtForm?"✕ إغلاق":"+ إضافة دين"}
            </button>
          </div>

          {/* ملخص الإجمالي */}
          <div style={{background:"linear-gradient(135deg,#C0392B,#A93226)",borderRadius:18,padding:20,marginBottom:16,boxShadow:C.shadowMd}}>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.8)",fontWeight:700,marginBottom:6}}>💳 إجمالي ديون الشركة</div>
            <div style={{fontSize:28,fontWeight:900,color:"#fff",letterSpacing:-1}}>{fmtD(totalAll)}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
              <div style={{background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.8)",marginBottom:3}}>👤 أشخاص وشركات</div>
                <div style={{fontSize:16,fontWeight:800,color:"#fff"}}>{fmtD(totalPerson)}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>{toAr(personDebts.filter(d=>d.status!=="مسدد كامل").length)} دين</div>
              </div>
              <div style={{background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.8)",marginBottom:3}}>📍 مواقع وعقارات</div>
                <div style={{fontSize:16,fontWeight:800,color:"#fff"}}>{fmtD(totalLocation)}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>{toAr(locationDebts.filter(d=>d.status!=="مسدد كامل").length)} دين</div>
              </div>
            </div>
          </div>

          {/* نموذج إضافة */}
          {showDebtForm&&(
            <div style={{...S.formCard,marginBottom:16}}>
              <div style={{fontWeight:800,fontSize:15,color:C.red,marginBottom:12}}>إضافة دين جديد</div>

              {/* نوع الدين */}
              <div style={S.fLbl}>نوع الدين</div>
              <div style={S.tRow}>
                <button style={{...S.tBtn,...(debtForm.debtType==="person"?{background:"rgba(107,63,160,0.15)",border:`1px solid ${C.purple}`,color:C.purple}:{})}}
                  onClick={()=>setDebtForm(f=>({...f,debtType:"person"}))}>👤 شخص / شركة</button>
                <button style={{...S.tBtn,...(debtForm.debtType==="location"?{background:"rgba(193,123,47,0.15)",border:`1px solid ${C.gold}`,color:C.gold}:{})}}
                  onClick={()=>setDebtForm(f=>({...f,debtType:"location"}))}>📍 موقع / عقار</button>
              </div>

              {/* تفاصيل حسب النوع */}
              {debtForm.debtType==="person"&&(
                <>
                  <div style={S.fLbl}>نوع الدائن</div>
                  <div style={S.tRow}>
                    <button style={{...S.tBtn,...(debtForm.creditorType==="person"?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}}
                      onClick={()=>setDebtForm(f=>({...f,creditorType:"person"}))}>👤 شخص</button>
                    <button style={{...S.tBtn,...(debtForm.creditorType==="company"?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}}
                      onClick={()=>setDebtForm(f=>({...f,creditorType:"company"}))}>🏢 شركة</button>
                  </div>
                  <div style={S.fLbl}>اسم {debtForm.creditorType==="company"?"الشركة":"الشخص"}</div>
                  <input style={S.inp} placeholder="مثال: شركة المواد، علي حسن..." value={debtForm.name} onChange={e=>setDebtForm(f=>({...f,name:e.target.value}))} autoFocus/>
                </>
              )}

              {debtForm.debtType==="location"&&(
                <>
                  <div style={S.fLbl}>اسم الموقع / العقار</div>
                  <input style={S.inp} placeholder="مثال: موقع بغداد، مستودع الشعب..." value={debtForm.name} onChange={e=>setDebtForm(f=>({...f,name:e.target.value}))} autoFocus/>
                  <div style={S.fLbl}>العنوان</div>
                  <input style={S.inp} placeholder="العنوان التفصيلي..." value={debtForm.address||""} onChange={e=>setDebtForm(f=>({...f,address:e.target.value}))}/>
                  {/* خيار الأقساط للمواقع */}
                  <div style={S.fLbl}>نظام الدفع</div>
                  <div style={S.tRow}>
                    <button style={{...S.tBtn,...(!debtForm.installment?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}}
                      onClick={()=>setDebtForm(f=>({...f,installment:false}))}>دفعة واحدة</button>
                    <button style={{...S.tBtn,...(debtForm.installment?{background:"rgba(26,122,74,0.15)",border:`1px solid #1A7A4A`,color:"#1A7A4A"}:{})}}
                      onClick={()=>setDebtForm(f=>({...f,installment:true}))}>💳 أقساط</button>
                  </div>
                  {debtForm.installment&&(
                    <div style={D?{display:"flex",gap:12}:{}}>
                      <div style={D?{flex:1}:{}}><div style={S.fLbl}>قيمة القسط</div><input style={S.inp} type="number" placeholder="٠" value={debtForm.installmentAmount} onChange={e=>setDebtForm(f=>({...f,installmentAmount:e.target.value}))}/></div>
                      <div style={D?{flex:1}:{}}>
                        <div style={S.fLbl}>دورية القسط</div>
                        <select style={S.sel} value={debtForm.installmentPeriod} onChange={e=>setDebtForm(f=>({...f,installmentPeriod:e.target.value}))}>
                          <option value="شهري">شهري</option>
                          <option value="فصلي">فصلي</option>
                          <option value="سنوي">سنوي</option>
                        </select>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* حقول مشتركة */}
              <div style={D?{display:"flex",gap:12}:{}}>
                <div style={D?{flex:1}:{}}>
                  <div style={S.fLbl}>المشروع المرتبط</div>
                  <select style={S.sel} value={debtForm.projectId} onChange={e=>setDebtForm(f=>({...f,projectId:e.target.value}))}>
                    <option value="">عام</option>
                    {projs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div style={D?{flex:1}:{}}>
                  <div style={S.fLbl}>تاريخ الاستحقاق</div>
                  <input style={S.inp} type="date" value={debtForm.dueDate||""} onChange={e=>setDebtForm(f=>({...f,dueDate:e.target.value}))}/>
                </div>
              </div>
              <div style={D?{display:"flex",gap:12}:{}}>
                <div style={D?{flex:2}:{}}>
                  <div style={S.fLbl}>المبلغ الكلي</div>
                  <input style={{...S.inp,fontWeight:800,fontSize:16,textAlign:"center"}} type="number" placeholder="٠" value={debtForm.amount} onChange={e=>setDebtForm(f=>({...f,amount:e.target.value}))}/>
                </div>
                <div style={D?{flex:1}:{}}>
                  <div style={S.fLbl}>العملة</div>
                  <div style={S.tRow}>
                    <button style={{...S.tBtn,...(debtForm.currency==="دينار"?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}} onClick={()=>setDebtForm(f=>({...f,currency:"دينار"}))}>🇮🇶</button>
                    <button style={{...S.tBtn,...(debtForm.currency==="دولار"?{background:"rgba(26,122,74,0.15)",border:`1px solid #1A7A4A`,color:"#1A7A4A"}:{})}} onClick={()=>setDebtForm(f=>({...f,currency:"دولار"}))}>🇺🇸</button>
                  </div>
                </div>
              </div>
              <div style={S.fLbl}>ملاحظات</div>
              <textarea style={S.ta} placeholder="تفاصيل..." value={debtForm.note} onChange={e=>setDebtForm(f=>({...f,note:e.target.value}))} rows={2}/>
              <button style={{...S.subBtn,background:"linear-gradient(135deg,#C0392B,#A93226)",color:"#fff"}} onClick={addDebt}>💾 حفظ</button>
            </div>
          )}

          {/* تبويبتان */}
          <div style={{display:"flex",background:C.bg2,borderRadius:12,padding:4,gap:4,marginBottom:16}}>
            {[["persons","👤 أشخاص وشركات",personDebts.length],["locations","📍 مواقع وعقارات",locationDebts.length]].map(([id,label,count])=>(
              <button key={id} style={{flex:1,padding:"10px 8px",borderRadius:9,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,
                background:debtTab===id?C.red:"transparent",
                color:debtTab===id?"#fff":C.textMd,
                boxShadow:debtTab===id?C.shadow:"none",
              }} onClick={()=>setDebtTab(id)}>
                {label} ({toAr(count)})
              </button>
            ))}
          </div>

          {/* قائمة الديون */}
          {debtTab==="persons"&&(
            personDebts.length===0?<div style={S.empty}>ما في ديون أشخاص / شركات</div>:
            <div style={D?S.txGrid:{}}>{personDebts.map(d=><DebtCard key={d.id} d={d}/>)}</div>
          )}
          {debtTab==="locations"&&(
            locationDebts.length===0?<div style={S.empty}>ما في ديون مواقع / عقارات</div>:
            <div style={D?S.txGrid:{}}>{locationDebts.map(d=><DebtCard key={d.id} d={d}/>)}</div>
          )}

          {!D&&<button style={S.canBtn} onClick={()=>setView("home")}>← رجوع</button>}
        </div>
      );
    }

    // ════════════════════════════════
    // قسم الإدارة — ADMIN MODULE
    // ════════════════════════════════

    // ADMIN HOME
    if(user.role==="manager"&&view==="adminHome") return (
      <div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>{!D&&<button style={S.backBtn2} onClick={()=>{setModule("finance");setView("home");}}>← المالية</button>}<div style={S.secTitle}>💼 لوحة الإدارة</div></div>

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

    // FOREMEN
    if(user.role==="manager"&&view==="foremen") return (
      <ForemenPage
        D={D} foremen={foremen} projs={projs} txs={txs}
        foremanTrust={foremanTrust}
        onAdd={addForeman} onDel={delForeman} onSettle={settleForeman}
        S={S} C={C} fmt={fmt} fmtD={fmtD} toAr={toAr} today={today}
        BackBtn={BackBtn}
      />
    );

    return null;
  }
}


function ForemenPage({D,foremen,projs,txs,foremanTrust,onAdd,onDel,onSettle,S,C,fmt,fmtD,toAr,today,BackBtn}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({name:"",projectId:"",phone:"",note:""});
  const [selForeman, setSelForeman] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [settleId, setSettleId] = useState(null); // trust id قيد التسوية
  const [settleAmt, setSettleAmt] = useState("");

  const save = async () => {
    if(!form.name.trim()||saving) return;
    setSaving(true);
    await onAdd(form);
    setSaving(false);
    setForm({name:"",projectId:"",phone:"",note:""});
    setShowForm(false);
  };

  // حساب الأمانات لكل فورمن
  const getForemanStats = (f) => {
    const fTrust  = foremanTrust.filter(t=>t.foremanId===f.id);
    // ما استلم الفورمن من أحمد (أمانات)
    const totalReceived = fTrust.reduce((s,t)=>s+t.amount,0);
    // ما سوّاه (تسويات)
    const totalSettled  = fTrust.reduce((s,t)=>s+(t.settledAmount||0),0);
    // الباقي بذمته
    const pending = totalReceived - totalSettled;
    // تسويات من txs (اختياري للعرض)
    const fTxs = txs.filter(t=>(t.foremanId===f.id||t.userId===f.id)&&t.isForemanSettle);
    return {fTrust, fTxs, totalReceived, totalSettled, pending,
      received: totalReceived,   // ما استلم
      spent:    totalSettled,    // ما سوّى
      balance:  pending          // الباقي بذمته
    };
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <BackBtn/>
          <div style={S.secTitle}>👷 الفورمنية</div>
        </div>
        <button style={{...S.goldBtn,width:"auto",padding:"9px 18px",marginBottom:0,fontSize:13}}
          onClick={()=>setShowForm(v=>!v)}>
          {showForm?"✕ إغلاق":"+ إضافة فورمن"}
        </button>
      </div>

      {/* نموذج إضافة */}
      {showForm&&(
        <div style={{...S.formCard,marginBottom:20}}>
          <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:12}}>إضافة فورمن جديد</div>
          <div style={D?{display:"flex",gap:12}:{}}>
            <div style={D?{flex:2}:{}}>
              <div style={S.fLbl}>اسم الفورمن</div>
              <input style={S.inp} placeholder="مثال: علي محمد" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} autoFocus/>
            </div>
            <div style={D?{flex:2}:{}}>
              <div style={S.fLbl}>المشروع المرتبط</div>
              <select style={S.sel} value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))}>
                <option value="">اختر المشروع</option>
                {projs.map(p=><option key={p.id} value={p.id}>{p.name} — {p.specialization||p.spec}</option>)}
              </select>
            </div>
            <div style={D?{flex:1}:{}}>
              <div style={S.fLbl}>رقم الهاتف</div>
              <input style={S.inp} placeholder="07x..." value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/>
            </div>
          </div>
          <div style={S.fLbl}>ملاحظة</div>
          <input style={S.inp} placeholder="اختياري..." value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
          <button style={{...S.subBtn,opacity:saving?0.7:1}} onClick={save} disabled={saving}>
            {saving?"جاري الحفظ...":"+ إضافة الفورمن"}
          </button>
        </div>
      )}

      {/* قائمة الفورمنية */}
      {foremen.length===0&&!showForm?(
        <div style={{...S.empty,background:C.card,borderRadius:20,border:`1px solid ${C.cardBorder}`,padding:40}}>
          <div style={{fontSize:48,marginBottom:8}}>👷</div>
          <div style={{fontWeight:700,color:C.textMd}}>ما في فورمنية مسجلين</div>
        </div>
      ):(
        <div style={D?S.empGrid:{}}>
          {foremen.map(f=>{
            const stats = getForemanStats(f);
            const proj  = projs.find(p=>p.id===f.projectId);
            return (
              <div key={f.id} style={{...S.txCard,marginBottom:14,cursor:"pointer",transition:"all 0.2s"}}
                onClick={()=>setSelForeman(selForeman?.id===f.id?null:f)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{...S.av,width:44,height:44,fontSize:19,borderRadius:14,background:"linear-gradient(135deg,#b45309,#92400e)",flexShrink:0}}>{f.name[0]}</div>
                    <div>
                      <div style={{fontWeight:800,fontSize:16,color:C.text}}>{f.name}</div>
                      {proj&&<div style={{fontSize:12,color:C.gold,marginTop:2,fontWeight:600}}>🏗️ {proj.name}</div>}
                      {f.phone&&<div style={{fontSize:12,color:C.textSm,marginTop:1}}>📞 {f.phone}</div>}
                    </div>
                  </div>
                  <button style={{background:"transparent",border:`1px solid rgba(192,57,43,0.2)`,borderRadius:8,padding:"4px 8px",color:C.red,fontSize:13,cursor:"pointer"}}
                    onClick={e=>{e.stopPropagation();onDel(f.id);}}>🗑️</button>
                </div>

                {/* ملخص الحساب */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  <div style={{background:"rgba(26,122,74,0.08)",borderRadius:10,padding:"8px 10px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:C.textSm,fontWeight:700,marginBottom:3}}>💰 استلم</div>
                    <div style={{fontSize:14,fontWeight:800,color:"#1A7A4A"}}>{fmtD(stats.totalReceived)}</div>
                  </div>
                  <div style={{background:"rgba(37,87,167,0.08)",borderRadius:10,padding:"8px 10px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:C.textSm,fontWeight:700,marginBottom:3}}>✅ سوّى</div>
                    <div style={{fontSize:14,fontWeight:800,color:"#2557A7"}}>{fmtD(stats.totalSettled)}</div>
                  </div>
                  <div style={{background:stats.pending<=0?"rgba(26,122,74,0.08)":"rgba(192,57,43,0.1)",borderRadius:10,padding:"8px 10px",textAlign:"center",border:stats.pending>0?`1px solid rgba(192,57,43,0.2)`:"none"}}>
                    <div style={{fontSize:10,color:C.textSm,fontWeight:700,marginBottom:3}}>⏳ بذمته</div>
                    <div style={{fontSize:14,fontWeight:800,color:stats.pending>0?C.red:"#1A7A4A"}}>{fmtD(stats.pending)}</div>
                  </div>
                </div>

                {/* شريط تقدم التسوية */}
                {stats.totalReceived>0&&(
                  <div style={{marginTop:8}}>
                    <div style={{background:C.bg3,borderRadius:999,height:5,overflow:"hidden"}}>
                      <div style={{background:stats.pending<=0?"linear-gradient(90deg,#1A7A4A,#27ae60)":"linear-gradient(90deg,#2557A7,#1d4ed8)",height:"100%",borderRadius:999,
                        width:`${Math.min(100,Math.round(stats.totalSettled/stats.totalReceived*100))}%`,transition:"width 0.5s"}}/>
                    </div>
                    <div style={{fontSize:10,color:C.textSm,marginTop:3,textAlign:"left"}}>
                      سوّى {toAr(Math.min(100,Math.round(stats.totalSettled/stats.totalReceived*100)))}%
                    </div>
                  </div>
                )}

                {f.note&&<div style={{fontSize:12,color:C.textSm,marginTop:8}}>📝 {f.note}</div>}

                {/* أزرار الكشف والطباعة */}
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <button style={{
                    flex:1,background:selForeman?.id===f.id?"rgba(37,87,167,0.1)":"transparent",
                    border:`1px solid ${selForeman?.id===f.id?"#2557A7":C.cardBorder}`,
                    borderRadius:8,padding:"7px 0",color:selForeman?.id===f.id?"#2557A7":C.textMd,
                    fontSize:12,fontWeight:700,cursor:"pointer"
                  }} onClick={e=>{e.stopPropagation();setSelForeman(selForeman?.id===f.id?null:f);}}>
                    📋 {selForeman?.id===f.id?"إخفاء الكشف":"كشف الحساب"}
                  </button>
                  <button style={{
                    flex:1,background:"rgba(180,83,9,0.08)",border:`1px solid rgba(180,83,9,0.2)`,
                    borderRadius:8,padding:"7px 0",color:"#b45309",
                    fontSize:12,fontWeight:700,cursor:"pointer"
                  }} onClick={e=>{
                    e.stopPropagation();
                    // طباعة كشف الفورمن
                    const fTxs = stats.fTxs;
                    const totalR = fTxs.filter(t=>t.type==="استلام").reduce((s,t)=>s+t.amount,0);
                    const totalS = fTxs.filter(t=>t.type==="صرف").reduce((s,t)=>s+t.amount,0);
                    const bal    = stats.received - stats.spent;
                    const ar = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,",");
                    const printDate = new Date().toLocaleDateString("ar-IQ");
                    const rows = fTxs.map((t,i)=>`
                      <tr style="background:${i%2===0?"#fff":"#f9f9f9"}">
                        <td>${t.date}</td>
                        <td style="color:${t.type==="استلام"?"#1A7A4A":"#C0392B"};font-weight:700">${t.type}</td>
                        <td style="font-weight:800;color:${t.type==="استلام"?"#1A7A4A":"#C0392B"}">${ar(t.amount)} ${t.currency==="دولار"?"$":"د.ع"}</td>
                        <td style="color:#666;font-size:11px">${t.note||"—"}</td>
                      </tr>`).join("");
                    const html = `<!DOCTYPE html><html dir="rtl" lang="ar">
<head><meta charset="UTF-8"/><title>كشف فورمن — ${f.name}</title>
<style>
  body{font-family:Tahoma,sans-serif;padding:30px;direction:rtl;color:#111;margin:0}
  .header{border-bottom:3px solid #b45309;padding-bottom:16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center}
  .name{font-size:22px;font-weight:900;color:#b45309}
  .info{font-size:12px;color:#666;line-height:1.8}
  .summary{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
  .box{border:1px solid #ddd;border-radius:10px;padding:14px 18px;flex:1;min-width:120px;text-align:center}
  .lbl{font-size:11px;color:#888;margin-bottom:4px;font-weight:600}
  .val{font-size:18px;font-weight:900}
  .green{color:#1A7A4A}.red{color:#C0392B}.gold{color:#b45309}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#b45309;color:#fff;padding:10px 12px;text-align:center}
  td{padding:9px 12px;border-bottom:1px solid #eee;text-align:center}
  .footer{margin-top:24px;padding-top:14px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:11px;color:#aaa}
  .bal-box{background:${bal>=0?"#f0fdf4":"#fef2f2"};border:2px solid ${bal>=0?"#1A7A4A":"#C0392B"};border-radius:12px;padding:16px;text-align:center;margin-bottom:20px}
  @media print{body{padding:15px}}
</style></head>
<body>
  <div class="header">
    <div>
      <div class="name">👷 ${f.name}</div>
      ${proj?`<div style="color:#b45309;font-weight:600;margin-top:4px">🏗️ ${proj.name}</div>`:""}
      ${f.phone?`<div style="color:#666;font-size:12px;margin-top:2px">📞 ${f.phone}</div>`:""}
    </div>
    <div class="info">
      <div style="font-weight:700;color:#b45309">كشف حساب فورمن</div>
      <div>تاريخ الطباعة: ${printDate}</div>
    </div>
  </div>
  
  <div class="summary">
    <div class="box"><div class="lbl">إجمالي الاستلام</div><div class="val green">${ar(stats.received)} د.ع</div></div>
    <div class="box"><div class="lbl">إجمالي الصرف</div><div class="val red">${ar(stats.spent)} د.ع</div></div>
    <div class="box"><div class="lbl">الرصيد</div><div class="val ${bal>=0?"green":"red"}">${ar(Math.abs(bal))} د.ع</div></div>
  </div>
  
  <div class="bal-box">
    <div style="font-size:14px;font-weight:700;color:${bal>=0?"#1A7A4A":"#C0392B"}">
      ${bal>=0?"✅ الرصيد لصالح الفورمن":"⚠️ الرصيد على الفورمن"}
    </div>
    <div style="font-size:24px;font-weight:900;color:${bal>=0?"#1A7A4A":"#C0392B"};margin-top:6px">
      ${ar(Math.abs(bal))} دينار
    </div>
  </div>

  <table>
    <thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>ملاحظة</th></tr></thead>
    <tbody>${rows||"<tr><td colspan='4' style='text-align:center;color:#999;padding:20px'>ما في معاملات</td></tr>"}</tbody>
    <tfoot>
      <tr style="background:#fff8e1;border-top:2px solid #b45309">
        <td colspan="2" style="font-weight:800;text-align:right;padding:10px 12px">الإجمالي</td>
        <td colspan="2" style="font-weight:900;color:#b45309;font-size:15px">${ar(stats.received)} استلام | ${ar(stats.spent)} صرف</td>
      </tr>
    </tfoot>
  </table>

  <div style="margin-top:30px;display:flex;justify-content:space-between">
    <div style="text-align:center;width:160px">
      <div style="border-top:1px solid #999;margin-bottom:8px;margin-top:40px"></div>
      <div style="font-size:12px;color:#666;font-weight:700">توقيع الفورمن</div>
    </div>
    <div style="text-align:center;width:160px">
      <div style="border-top:1px solid #999;margin-bottom:8px;margin-top:40px"></div>
      <div style="font-size:12px;color:#666;font-weight:700">توقيع المحاسب</div>
    </div>
    <div style="text-align:center;width:160px">
      <div style="border-top:1px solid #999;margin-bottom:8px;margin-top:40px"></div>
      <div style="font-size:12px;color:#666;font-weight:700">توقيع المدير</div>
    </div>
  </div>

  <div class="footer">
    <div>نظام حساب</div>
    <div>${printDate}</div>
  </div>
</body></html>`;
                    const w=window.open("","_blank");
                    w.document.write(html);
                    w.document.close();
                    setTimeout(()=>w.print(),500);
                  }}>
                    🖨️ طباعة الكشف
                  </button>
                </div>

                {/* كشف الحساب التفصيلي */}
                {selForeman?.id===f.id&&(
                  <div style={{marginTop:14,borderTop:`1px solid ${C.cardBorder}`,paddingTop:14}}>
                    <div style={{fontWeight:800,fontSize:14,color:C.text,marginBottom:12}}>📋 الأمانات والتسويات</div>
                    {stats.fTrust.length===0?(
                      <div style={{textAlign:"center",color:C.textSm,padding:16,fontSize:13,background:C.bg2,borderRadius:10}}>
                        ما في دفعات لهذا الفورمن بعد
                      </div>
                    ):(
                      <>
                        {stats.fTrust.map((t,i)=>{
                          const tRemaining = t.amount-(t.settledAmount||0);
                          const isDone = t.settled||tRemaining<=0;
                          return(
                            <div key={t.id} style={{background:isDone?"rgba(26,122,74,0.04)":"rgba(180,83,9,0.04)",border:`1px solid ${isDone?"rgba(26,122,74,0.2)":"rgba(180,83,9,0.2)"}`,borderRadius:12,padding:"12px 14px",marginBottom:8}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                                <div>
                                  <div style={{fontWeight:700,fontSize:13,color:C.text}}>دفعة #{toAr(i+1)}</div>
                                  <div style={{fontSize:11,color:C.textSm}}>📅 {t.date} {t.projectName&&`· 🏗️ ${t.projectName}`}</div>
                                  {t.note&&<div style={{fontSize:11,color:C.textSm}}>📝 {t.note}</div>}
                                </div>
                                <div style={{textAlign:"left"}}>
                                  <div style={{fontWeight:800,color:"#b45309"}}>{fmtD(t.amount)} ← دُفع</div>
                                  {t.settledAmount>0&&<div style={{fontSize:11,color:"#1A7A4A",fontWeight:600}}>✅ سُوِّي: {fmtD(t.settledAmount)}</div>}
                                  {!isDone&&<div style={{fontSize:12,fontWeight:800,color:C.red}}>⏳ باقي: {fmtD(tRemaining)}</div>}
                                </div>
                              </div>
                              {isDone?(
                                <div style={{background:"rgba(26,122,74,0.1)",borderRadius:8,padding:"6px 12px",fontSize:12,color:"#1A7A4A",fontWeight:700,textAlign:"center"}}>✅ مسوّاة بالكامل</div>
                              ):(
                                <ForemanSettleRow trust={t} onSettle={onSettle} S={S} C={C} fmtD={fmtD}/>
                              )}
                            </div>
                          );
                        })}
                        <div style={{background:C.bg2,borderRadius:10,padding:"12px 14px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:8}}>
                          <div style={{textAlign:"center"}}>
                            <div style={{fontSize:10,color:C.textSm,fontWeight:700}}>إجمالي الدفع</div>
                            <div style={{fontWeight:800,color:"#b45309"}}>{fmtD(stats.totalReceived)}</div>
                          </div>
                          <div style={{textAlign:"center"}}>
                            <div style={{fontSize:10,color:C.textSm,fontWeight:700}}>إجمالي التسوية</div>
                            <div style={{fontWeight:800,color:"#1A7A4A"}}>{fmtD(stats.totalSettled)}</div>
                          </div>
                          <div style={{textAlign:"center"}}>
                            <div style={{fontSize:10,color:C.textSm,fontWeight:700}}>⏳ بذمته</div>
                            <div style={{fontWeight:900,color:stats.pending>0?C.red:"#1A7A4A"}}>{fmtD(stats.pending)}</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}


    </div>
  );
}

function SalariesPage({D,user,isManager,salaryEmployees,salaryPayments,salaryAdvances,overtimePayments,onBack,onDelEmployee,onDelPayment,S,C,fmt,fmtD,toAr,today,BackBtn,USERS,db,collection,addDoc,setDoc,doc}) {
  const curMonth = new Date().toISOString().slice(0,7);
  const [payModal,    setPayModal]    = useState(null);
  const [payAmt,      setPayAmt]      = useState("");
  const [payDate,     setPayDate]     = useState(today());
  const [payNote,     setPayNote]     = useState("");
  const [payMonth,    setPayMonth]    = useState(curMonth);
  const [addEmpModal, setAddEmpModal] = useState(false);
  const [newEmp,      setNewEmp]      = useState({name:"",baseSalary:"",currency:"دينار",note:"",hasFood:false,foodAllowance:""});
  const [saving,      setSaving]      = useState(false);
  const [exchRate,    setExchRate]    = useState(1520);
  const [exchInput,   setExchInput]   = useState("");

  // حسابات لكل موظف
  const empData = salaryEmployees.map(e=>{
    const advs    = salaryAdvances.filter(a=>a.employeeId===e.id);
    const pays    = salaryPayments.filter(p=>p.employeeId===e.id);
    const ots     = overtimePayments.filter(o=>o.employeeId===e.id);
    const totalAdv= advs.reduce((s,a)=>s+a.amount,0);
    const totalPay= pays.reduce((s,p)=>s+p.amount,0);
    const totalOT = ots.reduce((s,o)=>s+o.amount,0);
    const foodAllow= e.hasFood?(e.foodAllowance||0):0;
    const foodCur  = e.foodCurrency||e.currency;
    // تحويل الطعام لعملة الراتب للحساب الموحد
    const foodInSalaryCur = foodCur===e.currency ? foodAllow :
      (foodCur==="دولار"&&e.currency==="دينار") ? foodAllow*exchRate :
      (foodCur==="دينار"&&e.currency==="دولار") ? foodAllow/exchRate : foodAllow;
    const due     = e.baseSalary + totalOT + foodInSalaryCur;
    const received= totalAdv + totalPay;
    const remaining=due - received;
    const rate    = e.currency==="دولار"?exchRate:1;
    const dueD    = due*rate;
    const receivedD=received*rate;
    const remainingD=remaining*rate;
    return{...e,totalAdv,totalPay,totalOT,foodAllow,foodCurrency:e.foodCurrency||e.currency,due,received,remaining,dueD,receivedD,remainingD,rate};
  });

  // مجاميع موحدة بالدينار
  const grandDue  = empData.reduce((s,e)=>s+e.dueD,0);
  const grandPaid = empData.reduce((s,e)=>s+e.receivedD,0);
  const grandRem  = grandDue - grandPaid;

  // فصل دينار ودولار للعرض
  const totalDinDue  = empData.filter(e=>e.currency==="دينار"||!e.currency).reduce((s,e)=>s+e.due,0);
  const totalDolDue  = empData.filter(e=>e.currency==="دولار").reduce((s,e)=>s+e.due,0);
  const totalDinPaid = empData.filter(e=>e.currency==="دينار"||!e.currency).reduce((s,e)=>s+e.received,0);
  const totalDolPaid = empData.filter(e=>e.currency==="دولار").reduce((s,e)=>s+e.received,0);

  const doPaySalary = async () => {
    if(!payModal||!payAmt||!payDate||saving) return;
    setSaving(true);
    const emp = payModal.emp;
    const amt = Number(payAmt);
    const col = payModal.type==="salary" ? "salaryPayments" : "salaryAdvances";
    const data = payModal.type==="salary"
      ? {employeeId:emp.id,employeeName:emp.name,amount:amt,currency:emp.currency||"دينار",month:payMonth,date:payDate,note:payNote||"",createdAt:new Date().toISOString()}
      : {employeeId:emp.id,employeeName:emp.name,amount:amt,currency:emp.currency||"دينار",date:payDate,note:payNote||"",createdAt:new Date().toISOString()};
    await addDoc(collection(db,col),data);
    // قيد صرف من أحمد
    const acc = USERS.find(u=>u.role==="accountant");
    if(acc){
      await addDoc(collection(db,"transactions"),{
        userId:acc.id,userName:acc.name,
        projectId:"",projectName:"",
        type:"صرف",amount:amt,
        currency:emp.currency||"دينار",
        note:`${payModal.type==="salary"?"دفع راتب":"سلفة راتب"} — ${emp.name}${payMonth?" — "+payMonth:""}${payNote?" — "+payNote:""}`,
        date:payDate,image:null,isPersonal:false,isAdvance:false,
        isSalary:payModal.type==="salary",isSalaryAdvance:payModal.type==="advance",
        createdAt:new Date().toISOString(),
      });
    }
    setSaving(false);
    setPayModal(null);setPayAmt("");setPayNote("");setPayMonth(curMonth);
  };

  const addEmployee = async () => {
    if(!newEmp.name.trim()||!newEmp.baseSalary) return;
    await addDoc(collection(db,"salaryEmployees"),{
      name:newEmp.name.trim(),baseSalary:Number(newEmp.baseSalary),
      currency:newEmp.currency,note:newEmp.note||"",
      hasFood:newEmp.hasFood||false,
      foodAllowance:newEmp.hasFood?Number(newEmp.foodAllowance||0):0,
      foodCurrency:newEmp.hasFood?(newEmp.foodCurrency||"دينار"):"دينار",
      createdAt:new Date().toISOString(),
    });
    setNewEmp({name:"",baseSalary:"",currency:"دينار",note:"",hasFood:false,foodAllowance:"",foodCurrency:"دينار"});
    setAddEmpModal(false);
  };

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <BackBtn/>
          <div style={S.secTitle}>💵 الرواتب</div>
        </div>
        {isManager&&(
          <button style={{...S.goldBtn,width:"auto",padding:"9px 18px",marginBottom:0,fontSize:13}}
            onClick={()=>setAddEmpModal(true)}>+ إضافة موظف</button>
        )}
      </div>

      {/* سعر الصرف */}
      <div style={{...S.filterCard,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <span style={{fontSize:13,fontWeight:700,color:C.text}}>💱 سعر الصرف:</span>
        <span style={{fontSize:13,color:C.textMd}}>1$ =</span>
        <input style={{...S.inp,width:120,padding:"7px 12px",fontSize:14,fontWeight:700,textAlign:"center"}}
          type="number" value={exchInput} placeholder={toAr(exchRate)}
          onChange={e=>setExchInput(e.target.value)}/>
        <span style={{fontSize:13,color:C.textMd}}>دينار</span>
        <button style={{...S.goldBtn,width:"auto",padding:"8px 16px",marginBottom:0,fontSize:13}}
          onClick={()=>{if(exchInput&&Number(exchInput)>0){setExchRate(Number(exchInput));setExchInput("");}}}>
          حفظ
        </button>
        <span style={{fontSize:12,color:C.textSm,marginRight:"auto"}}>الحالي: 1$ = {toAr(exchRate)} د.ع</span>
      </div>

      {/* ملخص */}
      <div style={{display:"grid",gridTemplateColumns:D?"repeat(3,1fr)":"1fr",gap:12,marginBottom:24}}>
        {/* المجمل الكلي بالدينار */}
        <div style={{background:"linear-gradient(135deg,#1e3a5f,#1d4ed8)",borderRadius:16,padding:"16px 18px",boxShadow:C.shadowMd,gridColumn:D?"auto":"1/-1"}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontWeight:700,marginBottom:4}}>📊 إجمالي المستحق (موحد بالدينار)</div>
          <div style={{fontSize:26,fontWeight:900,color:"#fff",letterSpacing:-1,marginBottom:8}}>{fmtD(Math.round(grandDue))}</div>
          <div style={{display:"flex",gap:12,fontSize:11,color:"rgba(255,255,255,0.7)"}}>
            <span>🇮🇶 {fmtD(totalDinDue)}</span>
            <span>+ 🇺🇸 ${toAr(totalDolDue)} × {toAr(exchRate)}</span>
          </div>
        </div>
        <div style={{background:"linear-gradient(135deg,#C0392B,#A93226)",borderRadius:16,padding:"16px 18px",boxShadow:C.shadowMd}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontWeight:700,marginBottom:4}}>✅ إجمالي المدفوع</div>
          <div style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:-0.5}}>{fmtD(Math.round(grandPaid))}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:4}}>🇮🇶 {fmtD(totalDinPaid)} + 🇺🇸 ${toAr(totalDolPaid)}</div>
        </div>
        <div style={{background:grandRem>0?"linear-gradient(135deg,#065f46,#047857)":"linear-gradient(135deg,#374151,#1f2937)",borderRadius:16,padding:"16px 18px",boxShadow:C.shadowMd}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",fontWeight:700,marginBottom:4}}>🔴 الباقي المستحق</div>
          <div style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:-0.5}}>{fmtD(Math.round(Math.abs(grandRem)))}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:4}}>{grandRem>0?"يستحق الصرف":"مكتمل ✅"}</div>
        </div>
      </div>

      {/* جدول الموظفين */}
      <div style={{...S.formCard,padding:0,overflow:"hidden",marginBottom:20}}>
        <div style={{padding:"12px 18px",background:C.bg2,borderBottom:`1px solid ${C.cardBorder}`,fontWeight:800,fontSize:14,color:C.text}}>
          👥 قائمة الموظفين
        </div>
        {empData.length===0?(
          <div style={{...S.empty,padding:30}}>ما في موظفين — اضغط "+ إضافة موظف"</div>
        ):(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"#1d4ed8"}}>
                  {["الموظف","الراتب","🍽️ طعام","⏰ أوفر تايم","المستحق الكلي","السلف","المدفوع","الباقي",""].map(h=>(
                    <th key={h} style={{padding:"10px 12px",color:"#fff",fontWeight:700,fontSize:11,textAlign:"center",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {empData.map((e,i)=>(
                  <tr key={e.id} style={{borderTop:`1px solid ${C.cardBorder}`,background:i%2===0?"#fff":C.bg}}>
                    <td style={{padding:"10px 14px",fontWeight:800,color:C.text,textAlign:"right",whiteSpace:"nowrap"}}>
                      {e.name}
                      <div style={{fontSize:10,color:C.textSm,fontWeight:500}}>{e.currency==="دولار"?"🇺🇸 دولار":"🇮🇶 دينار"}</div>
                    </td>
                    <td style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:C.textMd}}>{fmt(e.baseSalary,e.currency)}</td>
                    <td style={{padding:"10px 12px",textAlign:"center"}}>{e.hasFood?<span style={{fontSize:12,fontWeight:700,color:"#1A7A4A"}}>🍽️ {fmt(e.foodAllow,e.foodCurrency||e.currency)}</span>:<span style={{color:C.textSm,fontSize:12}}>—</span>}</td>
                    <td style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:"#6B3FA0"}}>{e.totalOT>0?fmt(e.totalOT,e.currency):<span style={{color:C.bg3}}>—</span>}</td>
                    <td style={{padding:"10px 12px",textAlign:"center",fontWeight:900,color:"#1d4ed8",background:"rgba(29,78,216,0.04)"}}>{fmt(e.due,e.currency)}</td>
                    <td style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:"#b45309"}}>{e.totalAdv>0?fmt(e.totalAdv,e.currency):<span style={{color:C.bg3}}>—</span>}</td>
                    <td style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:"#1A7A4A"}}>{e.totalPay>0?fmt(e.totalPay,e.currency):<span style={{color:C.bg3}}>—</span>}</td>
                    <td style={{padding:"10px 12px",textAlign:"center",fontWeight:900}}>
                      {e.remaining>0?(
                        <span style={{color:C.red}}>{fmt(e.remaining,e.currency)}</span>
                      ):(
                        <span style={{color:"#1A7A4A",fontSize:18}}>✅</span>
                      )}
                    </td>
                    <td style={{padding:"10px 12px",textAlign:"center"}}>
                      <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                        {e.remaining>0&&(
                          <button style={{background:"linear-gradient(135deg,#1A7A4A,#147A40)",border:"none",borderRadius:8,padding:"6px 10px",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}
                            onClick={()=>{setPayModal({emp:e,type:"salary"});setPayAmt(String(e.remaining));setPayMonth(curMonth);}}>
                            💵 دفع
                          </button>
                        )}
                        <button style={{background:"linear-gradient(135deg,#b45309,#92400e)",border:"none",borderRadius:8,padding:"6px 10px",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}
                          onClick={()=>{setPayModal({emp:e,type:"advance"});setPayAmt("");}}>
                          💳 سلفة
                        </button>
                        {isManager&&(
                          <button style={{background:"transparent",border:`1px solid rgba(192,57,43,0.25)`,borderRadius:8,padding:"6px 8px",color:C.red,fontSize:13,cursor:"pointer"}}
                            onClick={()=>onDelEmployee(e.id)}>🗑️</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* سجل الدفعات */}
      {salaryPayments.length>0&&(
        <div style={{...S.formCard,padding:0,overflow:"hidden"}}>
          <div style={{padding:"12px 18px",background:C.bg2,borderBottom:`1px solid ${C.cardBorder}`,fontWeight:800,fontSize:14,color:C.text}}>
            📋 سجل الدفعات
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:C.bg2}}>
                  {["الموظف","الشهر","المبلغ","التاريخ","ملاحظة",""].map(h=>(
                    <th key={h} style={{padding:"8px 12px",textAlign:"center",fontWeight:700,color:C.textMd,fontSize:11,borderBottom:`1px solid ${C.cardBorder}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salaryPayments.map((p,i)=>(
                  <tr key={p.id} style={{borderTop:`1px solid ${C.cardBorder}`,background:i%2===0?"#fff":C.bg}}>
                    <td style={{padding:"8px 12px",fontWeight:700,textAlign:"right"}}>{p.employeeName}</td>
                    <td style={{padding:"8px 12px",textAlign:"center"}}>
                      <span style={{background:`rgba(193,123,47,0.1)`,color:C.gold,fontWeight:700,padding:"2px 8px",borderRadius:6,fontSize:11}}>{p.month||"—"}</span>
                    </td>
                    <td style={{padding:"8px 12px",textAlign:"center",fontWeight:800,color:"#1A7A4A"}}>{fmt(p.amount,p.currency)}</td>
                    <td style={{padding:"8px 12px",textAlign:"center",color:C.textSm,fontSize:11}}>📅 {p.date}</td>
                    <td style={{padding:"8px 12px",textAlign:"center",color:C.textSm}}>{p.note||"—"}</td>
                    <td style={{padding:"8px 12px",textAlign:"center"}}>
                      {isManager&&<button style={{background:"transparent",border:"none",color:C.red,cursor:"pointer"}} onClick={()=>onDelPayment(p.id)}>🗑️</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal الدفع */}
      {payModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(44,24,16,0.5)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setPayModal(null)}>
          <div style={{background:"#fff",borderRadius:20,padding:24,width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}} onClick={ev=>ev.stopPropagation()}>
            <div style={{fontWeight:900,fontSize:18,color:C.text,marginBottom:4}}>
              {payModal.type==="salary"?"💵 دفع راتب":"💳 سلفة راتب"}
            </div>
            <div style={{fontSize:13,color:C.textMd,marginBottom:16}}>
              الموظف: <strong>{payModal.emp.name}</strong>
              {payModal.type==="salary"&&payModal.emp.remaining>0&&<> — الباقي: <strong style={{color:C.red}}>{fmt(payModal.emp.remaining,payModal.emp.currency)}</strong></>}
            </div>
            {payModal.type==="salary"&&(<>
              <div style={S.fLbl}>الشهر</div>
              <input style={S.inp} type="month" value={payMonth} onChange={e=>setPayMonth(e.target.value)}/>
            </>)}
            <div style={S.fLbl}>المبلغ</div>
            <input style={{...S.inp,fontSize:18,fontWeight:800,textAlign:"center"}} type="number" placeholder="٠" value={payAmt} onChange={e=>setPayAmt(e.target.value)} autoFocus/>
            <div style={S.fLbl}>التاريخ</div>
            <input style={S.inp} type="date" value={payDate} onChange={e=>setPayDate(e.target.value)}/>
            <div style={S.fLbl}>ملاحظة (اختياري)</div>
            <input style={S.inp} placeholder="..." value={payNote} onChange={e=>setPayNote(e.target.value)}/>
            <div style={{background:`rgba(192,57,43,0.06)`,border:`1px solid rgba(192,57,43,0.15)`,borderRadius:10,padding:"10px 14px",marginTop:12,fontSize:12,color:C.red,fontWeight:600}}>
              ⚠️ سيُخصم المبلغ من رصيد أحمد تلقائياً
            </div>
            <div style={{display:"flex",gap:10,marginTop:16}}>
              <button style={{...S.subBtn,flex:2,margin:0,padding:14,opacity:saving?0.7:1}} onClick={doPaySalary} disabled={saving}>
                {saving?"جاري الحفظ...":"💾 تأكيد الدفع"}
              </button>
              <button style={{...S.canBtn,flex:1,margin:0,padding:14}} onClick={()=>setPayModal(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal إضافة موظف */}
      {addEmpModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(44,24,16,0.5)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setAddEmpModal(false)}>
          <div style={{background:"#fff",borderRadius:20,padding:24,width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}} onClick={ev=>ev.stopPropagation()}>
            <div style={{fontWeight:900,fontSize:18,color:C.text,marginBottom:16}}>👤 إضافة موظف جديد</div>
            <div style={S.fLbl}>الاسم</div>
            <input style={S.inp} placeholder="اسم الموظف" value={newEmp.name} onChange={e=>setNewEmp(f=>({...f,name:e.target.value}))} autoFocus/>
            <div style={S.fLbl}>الراتب الأساسي</div>
            <input style={S.inp} type="number" placeholder="٠" value={newEmp.baseSalary} onChange={e=>setNewEmp(f=>({...f,baseSalary:e.target.value}))}/>
            <div style={S.fLbl}>العملة</div>
            <div style={S.tRow}>
              <button style={{...S.tBtn,...(newEmp.currency==="دينار"?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}} onClick={()=>setNewEmp(f=>({...f,currency:"دينار"}))}>🇮🇶 دينار</button>
              <button style={{...S.tBtn,...(newEmp.currency==="دولار"?{background:"rgba(26,122,74,0.15)",border:`1px solid #1A7A4A`,color:"#1A7A4A"}:{})}} onClick={()=>setNewEmp(f=>({...f,currency:"دولار"}))}>🇺🇸 دولار</button>
            </div>
            <div style={S.fLbl}>الطعام</div>
            <div style={S.tRow}>
              <button style={{...S.tBtn,...(newEmp.hasFood?{background:"rgba(26,122,74,0.15)",border:"1px solid #1A7A4A",color:"#1A7A4A"}:{})}} onClick={()=>setNewEmp(f=>({...f,hasFood:true,foodCurrency:f.foodCurrency||"دينار"}))}>🍽️ عنده طعام</button>
              <button style={{...S.tBtn,...(!newEmp.hasFood?{background:"rgba(192,57,43,0.1)",border:"1px solid #C0392B",color:"#C0392B"}:{})}} onClick={()=>setNewEmp(f=>({...f,hasFood:false}))}>❌ بدون طعام</button>
            </div>
            {newEmp.hasFood&&(<>
              <div style={S.fLbl}>قيمة وجبة الطعام</div>
              <input style={S.inp} type="number" placeholder="مثال: 5000" value={newEmp.foodAllowance||""} onChange={e=>setNewEmp(f=>({...f,foodAllowance:e.target.value}))}/>
              <div style={S.fLbl}>عملة الطعام</div>
              <div style={S.tRow}>
                <button style={{...S.tBtn,...((newEmp.foodCurrency||"دينار")==="دينار"?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}}
                  onClick={()=>setNewEmp(f=>({...f,foodCurrency:"دينار"}))}>🇮🇶 دينار</button>
                <button style={{...S.tBtn,...((newEmp.foodCurrency)==="دولار"?{background:"rgba(26,122,74,0.15)",border:`1px solid #1A7A4A`,color:"#1A7A4A"}:{})}}
                  onClick={()=>setNewEmp(f=>({...f,foodCurrency:"دولار"}))}>🇺🇸 دولار</button>
              </div>
            </>)}
            <div style={S.fLbl}>ملاحظة (اختياري)</div>
            <input style={S.inp} placeholder="..." value={newEmp.note} onChange={e=>setNewEmp(f=>({...f,note:e.target.value}))}/>
            <div style={{display:"flex",gap:10,marginTop:16}}>
              <button style={{...S.subBtn,flex:2,margin:0,padding:14}} onClick={addEmployee}>+ إضافة</button>
              <button style={{...S.canBtn,flex:1,margin:0,padding:14}} onClick={()=>setAddEmpModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ForemanLogForm({employees, onSubmit}) {
  const today2 = () => new Date().toISOString().split("T")[0];
  const [entries, setEntries] = useState([{employeeId:"",hours:"",hasFood:false}]);
  const [date, setDate] = useState(today2());
  const [note, setNote] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const inp = {width:"100%",background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:10,padding:"11px 14px",color:"#1a1a2e",fontSize:15,outline:"none",fontFamily:"'Segoe UI',Arial,sans-serif"};
  const lbl = {fontSize:11,color:"#64748b",fontWeight:800,letterSpacing:1,textTransform:"uppercase",marginBottom:6,marginTop:14,display:"block"};

  const addEntry = () => setEntries(e=>[...e,{employeeId:"",hours:"",hasFood:false}]);
  const removeEntry = i => setEntries(e=>e.filter((_,idx)=>idx!==i));
  const updateEntry = (i,k,v) => setEntries(e=>e.map((en,idx)=>idx===i?{...en,[k]:v}:en));

  const submit = async () => {
    const valid = entries.filter(e=>e.employeeId&&e.hours&&Number(e.hours)>0);
    if(!valid.length||!date) return;
    setLoading(true);
    for(const entry of valid){
      const emp = employees.find(e=>e.id===entry.employeeId);
      const foodAmt = entry.hasFood?(emp?.foodAllowance||0):0;
      await onSubmit({employeeId:entry.employeeId, hours:entry.hours, date, note, hasFood:entry.hasFood, foodAmount:foodAmt});
    }
    setLoading(false);
    setOk(true);
    setTimeout(()=>{setOk(false);setEntries([{employeeId:"",hours:"",hasFood:false}]);setNote("");setDate(today2());},2500);
  };

  if(ok) return (
    <div style={{textAlign:"center",padding:"60px 20px",background:"#fff",borderRadius:20,border:"1px solid #E2E8F0"}}>
      <div style={{fontSize:64,marginBottom:12}}>✅</div>
      <div style={{fontSize:22,fontWeight:900,color:"#0f766e"}}>Hours Logged!</div>
      <div style={{fontSize:14,color:"#64748b",marginTop:4}}>{entries.filter(e=>e.employeeId&&e.hours).length} workers recorded</div>
    </div>
  );

  return (
    <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:20,padding:20,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",direction:"ltr",fontFamily:"'Segoe UI',Arial,sans-serif"}}>

      {/* Date */}
      <label style={lbl}>📅 Date</label>
      <input style={inp} type="date" value={date} onChange={e=>setDate(e.target.value)}/>

      {/* Workers */}
      <label style={{...lbl,marginTop:20}}>👷 Workers & Hours</label>
      {entries.map((entry,i)=>(
        <div key={i} style={{background:"#F8FAFC",borderRadius:12,padding:"10px 12px",marginBottom:8,border:"1px solid #E2E8F0"}}>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
            <select style={{...inp,flex:2}} value={entry.employeeId} onChange={e=>updateEntry(i,"employeeId",e.target.value)}>
              <option value="">Select worker...</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.name}{e.hasFood?" 🍽️":""}</option>)}
            </select>
            <div style={{position:"relative",flex:1}}>
              <input style={{...inp,textAlign:"center",fontWeight:800,fontSize:17,paddingLeft:30}} type="number" min="0" max="24" placeholder="0" value={entry.hours} onChange={e=>updateEntry(i,"hours",e.target.value)}/>
              <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"#94a3b8",pointerEvents:"none"}}>hrs</span>
            </div>
            {entries.length>1&&(
              <button onClick={()=>removeEntry(i)} style={{width:36,height:36,borderRadius:8,border:"1px solid #fee2e2",background:"#fef2f2",color:"#ef4444",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>×</button>
            )}
          </div>
          {/* Food toggle */}
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button style={{
              flex:1,padding:"7px",borderRadius:8,border:"1px solid",fontSize:12,fontWeight:700,cursor:"pointer",
              background:entry.hasFood?"rgba(26,122,74,0.1)":"#fff",
              color:entry.hasFood?"#1A7A4A":"#94a3b8",
              borderColor:entry.hasFood?"#1A7A4A":"#e2e8f0",
            }} onClick={()=>updateEntry(i,"hasFood",!entry.hasFood)}>
              {entry.hasFood?"🍽️ Food included":"🍽️ Add food?"}
            </button>
            {entry.hasFood&&(()=>{
              const emp=employees.find(e=>e.id===entry.employeeId);
              return emp?.hasFood?<span style={{fontSize:11,color:"#1A7A4A",fontWeight:700}}>${emp.foodAllowance}/day included</span>:<span style={{fontSize:11,color:"#94a3b8"}}>No food rate set</span>;
            })()}
          </div>
        </div>
      ))}

      <button onClick={addEntry} style={{width:"100%",background:"transparent",border:"2px dashed #e2e8f0",borderRadius:10,padding:"10px",color:"#94a3b8",fontSize:13,cursor:"pointer",marginBottom:4,fontWeight:600}}>
        + Add Worker
      </button>

      {/* Preview */}
      {entries.some(e=>e.employeeId&&e.hours)&&(
        <div style={{background:"rgba(15,118,110,0.06)",border:"1px solid rgba(15,118,110,0.2)",borderRadius:12,padding:"12px 14px",marginTop:12}}>
          <div style={{fontWeight:700,fontSize:12,color:"#0f766e",marginBottom:8}}>📋 Summary for {date}</div>
          {entries.filter(e=>e.employeeId&&Number(e.hours)>0).map((e,i)=>{
            const emp=employees.find(x=>x.id===e.employeeId);
            return <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
              <span style={{color:"#374151",fontWeight:600}}>{emp?.name}</span>
              <span style={{color:"#0f766e",fontWeight:800}}>{e.hours} hrs = ${Number(e.hours).toFixed(2)}</span>
            </div>;
          })}
          <div style={{borderTop:"1px solid rgba(15,118,110,0.2)",marginTop:8,paddingTop:8,display:"flex",justifyContent:"space-between",fontWeight:900,fontSize:14}}>
            <span>Total</span>
            <span style={{color:"#0f766e"}}>{entries.filter(e=>e.employeeId&&e.hours).reduce((s,e)=>s+Number(e.hours),0)} hrs = ${entries.filter(e=>e.employeeId&&e.hours).reduce((s,e)=>s+Number(e.hours),0).toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Note */}
      <label style={lbl}>📝 Note (optional)</label>
      <input style={inp} placeholder="e.g. Extra shift, finishing work..." value={note} onChange={e=>setNote(e.target.value)}/>

      <button style={{
        width:"100%",marginTop:16,padding:16,borderRadius:14,border:"none",
        background:loading?"#e2e8f0":"linear-gradient(135deg,#0f766e,#0d9488)",
        color:loading?"#94a3b8":"#fff",fontSize:17,fontWeight:800,cursor:loading?"not-allowed":"pointer",
        boxShadow:loading?"none":"0 6px 20px rgba(15,118,110,0.3)",
      }} onClick={submit} disabled={loading}>
        {loading?"Saving...":"✅ Submit Hours"}
      </button>
    </div>
  );
}

function ForemanReport({workLogs, employees, onDelete}) {
  const [selMonth, setSelMonth] = useState(new Date().toISOString().slice(0,7));
  const months = [...new Set(workLogs.map(l=>l.month))].sort().reverse();
  const filtered = workLogs.filter(l=>l.month===selMonth);

  // تجميع تراكمي لكل عامل
  const empSummary = employees.map(e=>{
    const logs = filtered.filter(l=>l.employeeId===e.id).sort((a,b)=>a.date.localeCompare(b.date));
    const totalHrs  = logs.reduce((s,l)=>s+(l.hours||0),0);
    const totalFood = logs.reduce((s,l)=>s+(l.foodAmount||0),0);
    const totalAmt  = logs.reduce((s,l)=>s+(l.totalDay||l.amount||0),0);
    return {...e, logs, totalHrs, totalFood, totalAmt};
  }).filter(e=>e.totalHrs>0);

  const totalAllHrs  = empSummary.reduce((s,e)=>s+e.totalHrs,0);
  const totalAllFood = empSummary.reduce((s,e)=>s+e.totalFood,0);
  const totalAllAmt  = empSummary.reduce((s,e)=>s+e.totalAmt,0);

  const inp = {background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:10,padding:"8px 14px",color:"#1a1a2e",fontSize:14,outline:"none",fontFamily:"'Segoe UI',Arial,sans-serif"};

  return (
    <div style={{direction:"ltr",fontFamily:"'Segoe UI',Arial,sans-serif"}}>
      {/* Month selector */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <label style={{fontSize:12,fontWeight:700,color:"#64748b"}}>MONTH:</label>
        <select style={inp} value={selMonth} onChange={e=>setSelMonth(e.target.value)}>
          {months.map(m=><option key={m} value={m}>{m}</option>)}
          {!months.includes(selMonth)&&<option value={selMonth}>{selMonth}</option>}
        </select>
        <div style={{display:"flex",gap:8,marginLeft:"auto"}}>
          <div style={{background:"linear-gradient(135deg,#0f766e,#0d9488)",borderRadius:10,padding:"8px 14px",color:"#fff",fontSize:12,fontWeight:700}}>
            ⏱️ {totalAllHrs} hrs = ${totalAllHrs}
          </div>
          {totalAllFood>0&&<div style={{background:"linear-gradient(135deg,#1A7A4A,#147A40)",borderRadius:10,padding:"8px 14px",color:"#fff",fontSize:12,fontWeight:700}}>
            🍽️ Food: ${totalAllFood}
          </div>}
          <div style={{background:"linear-gradient(135deg,#1d4ed8,#2563eb)",borderRadius:10,padding:"8px 14px",color:"#fff",fontSize:12,fontWeight:700}}>
            💰 Total: ${totalAllAmt}
          </div>
        </div>
      </div>

      {empSummary.length===0?(
        <div style={{textAlign:"center",padding:40,color:"#94a3b8"}}>
          <div style={{fontSize:40}}>📋</div>
          <div style={{fontWeight:700,marginTop:8}}>No records for {selMonth}</div>
        </div>
      ):empSummary.map(e=>(
        <div key={e.id} style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:16,marginBottom:14,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          {/* Worker header */}
          <div style={{background:"linear-gradient(135deg,#0f766e,#0d9488)",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:16,fontWeight:800}}>{e.name[0]}</div>
              <div>
                <div style={{fontWeight:800,fontSize:15,color:"#fff"}}>{e.name}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.8)"}}>{e.logs.length} days worked</div>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontWeight:900,fontSize:20,color:"#fff"}}>{e.totalHrs} hrs = ${e.totalHrs}</div>
              {e.totalFood>0&&<div style={{fontSize:12,color:"rgba(255,255,255,0.85)"}}>🍽️ Food: ${e.totalFood}</div>}
              <div style={{fontSize:15,fontWeight:900,color:"#fde68a"}}>💰 Total: ${e.totalAmt}</div>
            </div>
          </div>

          {/* Daily breakdown */}
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:"#f8fafc"}}>
                <th style={{padding:"8px 14px",textAlign:"left",fontWeight:700,color:"#64748b",fontSize:11,borderBottom:"1px solid #e2e8f0"}}>DATE</th>
                <th style={{padding:"8px 14px",textAlign:"center",fontWeight:700,color:"#64748b",fontSize:11,borderBottom:"1px solid #e2e8f0"}}>HOURS</th>
                <th style={{padding:"8px 14px",textAlign:"center",fontWeight:700,color:"#64748b",fontSize:11,borderBottom:"1px solid #e2e8f0"}}>🍽️ FOOD</th>
                <th style={{padding:"8px 14px",textAlign:"center",fontWeight:700,color:"#64748b",fontSize:11,borderBottom:"1px solid #e2e8f0"}}>DAILY TOTAL</th>
                <th style={{padding:"8px 14px",textAlign:"center",fontWeight:700,color:"#64748b",fontSize:11,borderBottom:"1px solid #e2e8f0"}}>CUMULATIVE</th>
                <th style={{padding:"8px 14px",textAlign:"center",fontWeight:700,color:"#64748b",fontSize:11,borderBottom:"1px solid #e2e8f0"}}>NOTE</th>
                <th style={{padding:"8px 14px",borderBottom:"1px solid #e2e8f0"}}></th>
              </tr>
            </thead>
            <tbody>
              {(()=>{
                let cumHrs=0; let cumTotal=0;
                return e.logs.map((l,i)=>{
                  cumHrs+=l.hours||0;
                  cumTotal+=(l.totalDay||l.amount||0);
                  return(
                    <tr key={l.id} style={{borderBottom:"1px solid #f1f5f9",background:i%2===0?"#fff":"#f8fafc"}}>
                      <td style={{padding:"8px 14px",fontWeight:700,color:"#1a1a2e"}}>📅 {l.date}</td>
                      <td style={{padding:"8px 14px",textAlign:"center",fontWeight:800,color:"#0f766e",fontSize:15}}>{l.hours} hrs</td>
                      <td style={{padding:"8px 14px",textAlign:"center"}}>
                        {l.hasFood?<span style={{fontWeight:700,color:"#1A7A4A",fontSize:12}}>🍽️ ${l.foodAmount||0}</span>:<span style={{color:"#cbd5e1",fontSize:12}}>—</span>}
                      </td>
                      <td style={{padding:"8px 14px",textAlign:"center",fontWeight:800,color:"#1d4ed8"}}>
                        ${l.totalDay||l.amount||0}
                      </td>
                      <td style={{padding:"8px 14px",textAlign:"center"}}>
                        <span style={{background:"rgba(15,118,110,0.1)",color:"#0f766e",padding:"3px 10px",borderRadius:8,fontWeight:800,fontSize:12}}>${cumTotal}</span>
                      </td>
                      <td style={{padding:"8px 14px",textAlign:"center",color:"#64748b",fontSize:12}}>{l.note||"—"}</td>
                      <td style={{padding:"8px 14px",textAlign:"center"}}>
                        <button onClick={()=>onDelete(l.id)} style={{background:"transparent",border:"none",color:"#ef4444",cursor:"pointer",fontSize:14}}>🗑️</button>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
            <tfoot>
              <tr style={{background:"#f0fdf4",borderTop:"2px solid #0f766e"}}>
                <td style={{padding:"10px 14px",fontWeight:800,color:"#0f766e"}}>Total</td>
                <td style={{padding:"10px 14px",textAlign:"center",fontWeight:900,color:"#0f766e"}}>{e.totalHrs} hrs</td>
                <td style={{padding:"10px 14px",textAlign:"center",fontWeight:800,color:"#1A7A4A"}}>{e.totalFood>0?`🍽️ $${e.totalFood}`:"—"}</td>
                <td style={{padding:"10px 14px",textAlign:"center",fontWeight:900,color:"#1d4ed8",fontSize:15}}>${e.totalAmt}</td>
                <td colSpan={3}/>
              </tr>
            </tfoot>
          </table>
        </div>
      ))}
    </div>
  );
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

function ConfirmTxModal({form, projs, USERS, foremen, C, S, fmt, fmtD, onConfirm, onClose}) {
  const [saving, setSaving] = useState(false);

  const proj    = projs.find(p=>p.id===form.projectId);
  const receiver= USERS.find(u=>u.id===form.advanceTo);
  const foreman = foremen.find(f=>f.id===form.foremanId);

  // تحديد نوع المعاملة بشكل واضح
  const getTxType = () => {
    if(form.isWorkExpense) return {label:`📤 صرف على العمل — ${form.workExpenseType||"مصروف"}`, color:"#C0392B", bg:"rgba(192,57,43,0.08)"};
    if(form.isForeman)   return {label:`👷 دفع لفورمن — ${foreman?.name||""}`, color:"#b45309", bg:"rgba(180,83,9,0.1)"};
    if(form.isAdvance&&form.advanceIsPersonal) return {label:`👤 قرض شخصي لـ ${receiver?.name||""} — ${form.projectId?`مشروع ${projs.find(p=>p.id===form.projectId)?.name}`:"صندوق عام"}`, color:"#C0392B", bg:"rgba(192,57,43,0.1)"};
    if(form.isAdvance&&form.projectId)   return {label:`💼 دفعة عمل لـ ${receiver?.name||""} — مشروع ${projs.find(p=>p.id===form.projectId)?.name||""}`, color:"#2557A7", bg:"rgba(37,87,167,0.1)"};
    if(form.isAdvance)   return {label:`💼 دفعة عمل لـ ${receiver?.name||""} — صندوق عام`, color:C.gold, bg:"rgba(193,123,47,0.1)"};
    if(form.type==="استلام"&&form.receiveType==="general") return {label:`📝 استلام عام — ${form.generalLabel||""}`, color:"#1A7A4A", bg:"rgba(26,122,74,0.1)"};
    if(form.type==="استلام") return {label:"↓ استلام", color:"#1A7A4A", bg:"rgba(26,122,74,0.1)"};
    return {label:"↑ صرف", color:"#C0392B", bg:"rgba(192,57,43,0.1)"};
  };

  const txType = getTxType();
  const ar = n => String(Number(n).toLocaleString("ar-IQ")).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]);

  const rows = [
    ["النوع",        <span style={{fontWeight:800,color:txType.color}}>{txType.label}</span>],
    ["المبلغ",       <div style={{textAlign:"left"}}>
      <div style={{fontWeight:900,fontSize:20,color:form.type==="صرف"||form.isPersonal||form.isAdvance||form.isForeman?"#C0392B":"#1A7A4A"}}>{ar(form.amount)} {form.currency==="دولار"?"$":"د.ع"}</div>
      <div style={{fontSize:11,color:C.textSm,marginTop:2,fontStyle:"italic"}}>{numToWords(form.amount,form.currency)}</div>
    </div>],
    ["العملة",       form.currency==="دولار"?"🇺🇸 دولار":"🇮🇶 دينار"],
    ["التاريخ",      `📅 ${form.date}`],
    proj&&["المشروع", `🏗️ ${proj.name} — ${proj.specialization||proj.spec}`],
    form.isAdvance&&!form.advanceIsPersonal&&!form.projectId&&["المصدر", "📦 الصندوق العام"],
    form.generalLabel&&["البند",    `📝 ${form.generalLabel}`],
    form.note&&["ملاحظة",  form.note],
    foreman&&["الفورمن",   `👷 ${foreman.name}`],
    receiver&&["المستلم",  `👤 ${receiver.name}`],
  ].filter(Boolean);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(44,24,16,0.6)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(4px)"}}
      onClick={onClose}>
      <div style={{background:"#fff",borderRadius:24,padding:24,width:"100%",maxWidth:440,boxShadow:"0 24px 80px rgba(0,0,0,0.25)"}}
        onClick={e=>e.stopPropagation()}>

        {/* العنوان */}
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:40,marginBottom:8}}>📋</div>
          <div style={{fontWeight:900,fontSize:20,color:C.text}}>مراجعة القيد</div>
          <div style={{fontSize:13,color:C.textSm,marginTop:4}}>تأكد من البيانات قبل الحفظ</div>
        </div>

        {/* بطاقة التفاصيل */}
        <div style={{background:C.bg2,borderRadius:16,padding:16,marginBottom:20,border:`1px solid ${C.cardBorder}`}}>
          {/* شريط النوع */}
          <div style={{background:txType.bg,border:`1px solid ${txType.color}22`,borderRadius:10,padding:"10px 14px",marginBottom:12,textAlign:"center",fontWeight:800,fontSize:15,color:txType.color}}>
            {txType.label}
          </div>
          {/* التفاصيل */}
          {rows.map(([label,val],i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 4px",borderBottom:i<rows.length-1?`1px solid ${C.cardBorder}`:"none"}}>
              <span style={{fontSize:12,color:C.textSm,fontWeight:600,minWidth:70}}>{label}</span>
              <span style={{fontSize:13,color:C.text,fontWeight:700,textAlign:"left"}}>{val}</span>
            </div>
          ))}
        </div>

        {/* صورة الوصل */}
        {form.image&&(
          <img src={form.image} style={{width:"100%",maxHeight:120,objectFit:"cover",borderRadius:12,marginBottom:16}} alt="وصل"/>
        )}

        {/* أزرار */}
        <div style={{display:"flex",gap:10}}>
          <button style={{
            flex:2,padding:16,borderRadius:14,border:"none",cursor:saving?"not-allowed":"pointer",
            background:saving?"#e2e8f0":"linear-gradient(135deg,#1A7A4A,#147A40)",
            color:saving?"#94a3b8":"#fff",fontSize:16,fontWeight:900,
            boxShadow:saving?"none":"0 6px 20px rgba(26,122,74,0.3)",
          }} disabled={saving} onClick={async()=>{setSaving(true);await onConfirm();}}>
            {saving?"⏳ جاري الحفظ...":"✅ تأكيد الحفظ"}
          </button>
          <button style={{
            flex:1,padding:16,borderRadius:14,border:`1px solid ${C.cardBorder}`,
            background:"transparent",color:C.textMd,fontSize:14,fontWeight:700,cursor:"pointer",
          }} onClick={onClose}>
            ← تعديل
          </button>
        </div>
      </div>
    </div>
  );
}

function EditTxModal({tx, projs, onSave, onClose, S, C, today}) {
  const [amount, setAmount] = useState(String(tx.amount));
  const [date,   setDate]   = useState(tx.date);
  const [note,   setNote]   = useState(tx.note||"");
  const [projId, setProjId] = useState(tx.projectId||"");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if(!amount||!date||saving) return;
    setSaving(true);
    const proj = projs.find(p=>p.id===projId);
    await onSave(tx.id, {
      amount: Number(amount),
      date,
      note,
      projectId: projId||"",
      projectName: proj?`${proj.name} - ${proj.specialization||proj.spec} - ${proj.province}`:tx.projectName||"",
    });
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(44,24,16,0.5)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:20,padding:22,width:"100%",maxWidth:420,boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontWeight:900,fontSize:17,color:C.text,marginBottom:4}}>✏️ تعديل المعاملة</div>
        <div style={{fontSize:12,color:C.textSm,marginBottom:16}}>
          {tx.type} — {tx.userName} — {tx.currency||"دينار"}
        </div>

        {!tx.isPersonal&&projs.length>0&&(<>
          <div style={S.fLbl}>المشروع</div>
          <select style={S.sel} value={projId} onChange={e=>setProjId(e.target.value)}>
            <option value="">بدون مشروع</option>
            {projs.map(p=><option key={p.id} value={p.id}>{p.name} - {p.specialization||p.spec}</option>)}
          </select>
        </>)}

        <div style={S.fLbl}>المبلغ</div>
        <input style={{...S.inp,fontSize:18,fontWeight:800,textAlign:"center"}} type="number" value={amount} onChange={e=>setAmount(e.target.value)} autoFocus/>

        <div style={S.fLbl}>التاريخ</div>
        <input style={S.inp} type="date" value={date} onChange={e=>setDate(e.target.value)}/>

        <div style={S.fLbl}>ملاحظة</div>
        <textarea style={{...S.ta,rows:2}} value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="ملاحظات..."/>

        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button style={{...S.subBtn,flex:2,margin:0,padding:14,opacity:saving?0.7:1}} onClick={save} disabled={saving}>
            {saving?"جاري الحفظ...":"💾 حفظ التعديل"}
          </button>
          <button style={{...S.canBtn,flex:1,margin:0,padding:14}} onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}

function MyStatementPage({user,myTxs,OBs,projs,D,S,C,fmt,fmtD,toAr,BackBtn,onImg,onDelete,onEdit}) {
  const [stFrom, setStFrom] = useState("");
  const [stTo,   setStTo]   = useState("");
  const [stCur,  setStCur]  = useState("دينار");
  const [tab,    setTab]    = useState("work"); // work | personal

  // فصل المعاملات
  const baseFilter = t => {
    if(t.currency!==stCur&&!(stCur==="دينار"&&!t.currency))return false;
    if(stFrom&&t.date<stFrom)return false;
    if(stTo&&t.date>stTo)return false;
    return true;
  };

  // حساب العمل: معاملات غير شخصية
  const workTxs = myTxs.filter(t=>!t.isPersonal&&baseFilter(t));
  // الحساب الشخصي: معاملات شخصية فقط
  const personalTxs = myTxs.filter(t=>t.isPersonal&&baseFilter(t));

  const ob   = OBs[user.id]||{};
  const obR  = (!stFrom)?(stCur==="دينار"?(ob.dinarReceived||0):(ob.dollarReceived||0)):0;
  const obS  = (!stFrom)?(stCur==="دينار"?(ob.dinarSpent||0):(ob.dollarSpent||0)):0;

  // إجماليات العمل
  const workR = workTxs.filter(t=>t.type==="استلام").reduce((s,t)=>s+t.amount,0)+obR;
  const workS = workTxs.filter(t=>t.type==="صرف").reduce((s,t)=>s+t.amount,0)+obS;
  const workBal = workR-workS;

  // إجماليات الشخصي
  const personalW = personalTxs.filter(t=>t.type==="صرف").reduce((s,t)=>s+t.amount,0);
  const personalR = personalTxs.filter(t=>t.type==="استلام").reduce((s,t)=>s+t.amount,0);

  const TabBtn = ({id,label,icon,count,color}) => (
    <button onClick={()=>setTab(id)} style={{
      flex:1,padding:"12px 8px",borderRadius:12,border:`2px solid`,cursor:"pointer",
      fontWeight:800,fontSize:13,transition:"all 0.2s",
      background:tab===id?`rgba(${color},0.1)`:"transparent",
      color:tab===id?`rgb(${color})`:C.textMd,
      borderColor:tab===id?`rgb(${color})`:C.cardBorder,
    }}>
      <div style={{fontSize:18,marginBottom:2}}>{icon}</div>
      <div>{label}</div>
      <div style={{fontSize:11,marginTop:2,opacity:0.8}}>{toAr(count)} معاملة</div>
    </button>
  );

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <BackBtn to="home"/>
        <div style={S.secTitle}>📄 كشف حسابي — {user.name}</div>
      </div>

      {/* فلاتر عامة */}
      <div style={{...S.filterCard,marginBottom:16}}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div>
            <div style={S.fLbl}>العملة</div>
            <div style={S.tRow}>
              <button style={{...S.tBtn,...(stCur==="دينار"?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}} onClick={()=>setStCur("دينار")}>🇮🇶 دينار</button>
              <button style={{...S.tBtn,...(stCur==="دولار"?{background:"rgba(37,87,167,0.15)",border:`1px solid #2557A7`,color:"#2557A7"}:{})}} onClick={()=>setStCur("دولار")}>🇺🇸 دولار</button>
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={S.fLbl}>من تاريخ</div>
            <input style={S.inp} type="date" value={stFrom} onChange={e=>setStFrom(e.target.value)}/>
          </div>
          <div style={{flex:1}}>
            <div style={S.fLbl}>إلى تاريخ</div>
            <input style={S.inp} type="date" value={stTo} onChange={e=>setStTo(e.target.value)}/>
          </div>
          <button style={{...S.canBtn,marginBottom:0}} onClick={()=>{setStFrom("");setStTo("");}}>↺</button>
        </div>
      </div>

      {/* تبويبتان */}
      <div style={{display:"flex",gap:10,marginBottom:20}}>
        <TabBtn id="work"     label="حساب العمل"    icon="💼" count={workTxs.length}     color="37,87,167"/>
        <TabBtn id="personal" label="الحساب الشخصي" icon="👤" count={personalTxs.length} color="107,63,160"/>
      </div>

      {/* حساب العمل */}
      {tab==="work"&&(
        <div>
          <div style={{...S.balCard,background:workBal>=0?"linear-gradient(135deg,#065f46,#047857)":"linear-gradient(135deg,#7f1d1d,#991b1b)",marginBottom:16}}>
            <div style={S.balLbl}>💼 رصيد العمل — {stCur}</div>
            <div style={S.balAmt}>{fmt(Math.abs(workBal),stCur)}</div>
            <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",margin:"4px 0 10px"}}>
              {workBal>0?"✅ مطلوب مني":workBal<0?"⚠️ أنا طالب":"◼️ متوازن"}
            </div>
            <div style={S.balRow}>
              <span style={S.balSt}>↓ استلمت {fmt(workR,stCur)}</span>
              <span style={S.balSt}>↑ صرفت {fmt(workS,stCur)}</span>
            </div>
          </div>
          {workTxs.length===0?(
            <div style={S.empty}>ما في معاملات عمل</div>
          ):(
            <div style={D?S.txGrid:{}}>{workTxs.map(t=>(
              <TxCard key={t.id} t={t} onImg={onImg}
                onDelete={onDelete?()=>onDelete(t.id):undefined}
                onEdit={onEdit}
              />
            ))}</div>
          )}
        </div>
      )}

      {/* الحساب الشخصي */}
      {tab==="personal"&&(
        <div>
          <div style={{...S.balCard,background:"linear-gradient(135deg,#4c1d95,#6B3FA0)",marginBottom:16}}>
            <div style={S.balLbl}>👤 الحساب الشخصي — {stCur}</div>
            <div style={S.balAmt}>{fmt(personalW,stCur)}</div>
            <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)",margin:"4px 0 10px"}}>
              إجمالي السحوبات الشخصية
            </div>
            {personalR>0&&<div style={S.balRow}>
              <span style={S.balSt}>↓ استلم شخصي {fmt(personalR,stCur)}</span>
              <span style={S.balSt}>↑ صرف شخصي {fmt(personalW,stCur)}</span>
            </div>}
          </div>
          {personalTxs.length===0?(
            <div style={S.empty}>ما في معاملات شخصية</div>
          ):(
            <div style={D?S.txGrid:{}}>{personalTxs.map(t=>(
              <TxCard key={t.id} t={t} onImg={onImg}
                onDelete={onDelete?()=>onDelete(t.id):undefined}
                onEdit={onEdit}
              />
            ))}</div>
          )}
        </div>
      )}
    </div>
  );
}

function ForemanSettleRow({trust, onSettle, S, C, fmtD}) {
  const [mode,   setMode]   = useState(null);
  const [amt,    setAmt]    = useState("");
  const [saving, setSaving] = useState(false);
  const remaining = trust.amount-(trust.settledAmount||0);

  if(!mode) return (
    <div style={{display:"flex",gap:6,marginTop:6}}>
      <button style={{flex:1,background:"linear-gradient(135deg,#1A7A4A,#147A40)",border:"none",borderRadius:8,padding:"7px 0",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}
        onClick={()=>{setMode("full");setAmt(String(remaining));}}>✅ تسوية كاملة</button>
      <button style={{flex:1,background:"rgba(37,87,167,0.08)",border:"1px solid rgba(37,87,167,0.3)",borderRadius:8,padding:"7px 0",color:"#2557A7",fontSize:12,fontWeight:700,cursor:"pointer"}}
        onClick={()=>setMode("partial")}>💳 تسوية جزئية</button>
    </div>
  );

  return (
    <div style={{marginTop:6,background:"rgba(26,122,74,0.04)",border:"1px solid rgba(26,122,74,0.2)",borderRadius:10,padding:"10px"}}>
      <div style={{fontSize:11,color:"#1A7A4A",fontWeight:700,marginBottom:6}}>
        {mode==="full"?"✅ تسوية كاملة":"💳 تسوية جزئية"} — الباقي: {fmtD(remaining)}
      </div>
      {mode==="partial"&&(
        <input style={{width:"100%",background:"#F5F0E8",border:"1px solid #E2D9CC",borderRadius:8,padding:"7px 10px",fontSize:13,fontWeight:700,outline:"none",marginBottom:6,boxSizing:"border-box"}}
          type="number" placeholder="أدخل المبلغ المسوّى" value={amt} onChange={e=>setAmt(e.target.value)} autoFocus/>
      )}
      {mode==="full"&&<div style={{background:"rgba(26,122,74,0.08)",borderRadius:8,padding:"6px",fontSize:13,fontWeight:700,color:"#1A7A4A",marginBottom:6,textAlign:"center"}}>{fmtD(remaining)}</div>}
      <div style={{display:"flex",gap:6}}>
        <button style={{flex:2,background:"linear-gradient(135deg,#1A7A4A,#147A40)",border:"none",borderRadius:8,padding:"7px 0",color:"#fff",fontSize:12,fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1}}
          disabled={saving} onClick={async()=>{
            const payAmt = mode==="full"?remaining:Number(amt);
            if(!payAmt||payAmt<=0) return;
            setSaving(true);
            await onSettle(trust, payAmt);
            setSaving(false);
            setMode(null);setAmt("");
          }}>{saving?"جاري...":"💾 تأكيد التسوية"}</button>
        <button style={{flex:1,background:"transparent",border:"1px solid #E2D9CC",borderRadius:8,padding:"7px 0",color:"#9B846D",fontSize:12,cursor:"pointer"}}
          onClick={()=>{setMode(null);setAmt("");}}>إلغاء</button>
      </div>
    </div>
  );
}

function CompanyDebtPayRow({debt, onPay, S, C, fmt}) {
  const [mode,   setMode]   = useState(null);
  const [amt,    setAmt]    = useState("");
  const [saving, setSaving] = useState(false);
  const remaining = debt.remaining??debt.amount??0;

  if(!mode) return (
    <div style={{display:"flex",gap:6,marginTop:6}}>
      <button style={{flex:1,background:"linear-gradient(135deg,#1A7A4A,#147A40)",border:"none",borderRadius:8,padding:"8px 0",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}
        onClick={()=>{setMode("full");setAmt(String(remaining));}}>✅ سداد كامل</button>
      <button style={{flex:1,background:"rgba(37,87,167,0.08)",border:"1px solid rgba(37,87,167,0.3)",borderRadius:8,padding:"8px 0",color:"#2557A7",fontSize:12,fontWeight:700,cursor:"pointer"}}
        onClick={()=>setMode("partial")}>💳 سداد جزئي</button>
    </div>
  );

  return (
    <div style={{marginTop:8,background:"rgba(26,122,74,0.04)",border:"1px solid rgba(26,122,74,0.2)",borderRadius:10,padding:"10px 12px"}}>
      <div style={{fontSize:11,color:"#1A7A4A",fontWeight:700,marginBottom:8}}>
        {mode==="full"?"✅ سداد كامل":"💳 سداد جزئي"}
        <span style={{color:"#9B846D",fontWeight:400,marginRight:6}}>— المتبقي: {fmt(remaining,debt.currency)}</span>
      </div>
      {mode==="full"?(
        <div style={{background:"rgba(26,122,74,0.08)",borderRadius:8,padding:"8px",fontSize:13,fontWeight:700,color:"#1A7A4A",marginBottom:8,textAlign:"center"}}>
          {fmt(remaining,debt.currency)}
        </div>
      ):(
        <input style={{width:"100%",background:"#F5F0E8",border:"1px solid #E2D9CC",borderRadius:8,padding:"8px 10px",fontSize:14,fontWeight:700,outline:"none",marginBottom:8,boxSizing:"border-box"}}
          type="number" placeholder="أدخل المبلغ" value={amt} onChange={e=>setAmt(e.target.value)} autoFocus/>
      )}
      <div style={{display:"flex",gap:6}}>
        <button style={{flex:2,background:"linear-gradient(135deg,#1A7A4A,#147A40)",border:"none",borderRadius:8,padding:"8px 0",color:"#fff",fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1}}
          disabled={saving} onClick={async()=>{
            const payAmt = mode==="full"?remaining:Number(amt);
            if(!payAmt||payAmt<=0) return;
            setSaving(true);
            await onPay(debt, payAmt);
            setSaving(false);
            setMode(null);setAmt("");
          }}>{saving?"جاري...":"💾 تأكيد"}</button>
        <button style={{flex:1,background:"transparent",border:"1px solid #E2D9CC",borderRadius:8,padding:"8px 0",color:"#9B846D",fontSize:12,cursor:"pointer"}}
          onClick={()=>{setMode(null);setAmt("");}}>إلغاء</button>
      </div>
    </div>
  );
}

function DebtEditCard({debt, onPay, onDelete, onEdit, S, C, fmtD}) {
  const [editing, setEditing] = useState(false);
  const [amount,  setAmount]  = useState(String(debt.amount));
  const [note,    setNote]    = useState(debt.note||"");
  const [date,    setDate]    = useState(debt.date||"");
  const [saving,  setSaving]  = useState(false);

  const save = async () => {
    if(!amount||saving) return;
    setSaving(true);
    const newAmt = Number(amount);
    const paid   = debt.amount - (debt.remaining||debt.amount); // ما تم دفعه
    const newRem = Math.max(0, newAmt - paid);
    await onEdit(debt.id, {
      amount: newAmt,
      remaining: newRem,
      note,
      date,
      status: newRem<=0?"مسدد كامل":paid>0?"مسدد جزئي":"غير مسدد",
    });
    setSaving(false);
    setEditing(false);
  };

  const statusColor = debt.status==="مسدد كامل"?"#1A7A4A":debt.status==="مسدد جزئي"?"#b45309":C.red;
  const statusBg    = debt.status==="مسدد كامل"?"rgba(26,122,74,0.1)":debt.status==="مسدد جزئي"?"rgba(180,83,9,0.1)":"rgba(192,57,43,0.1)";

  if(editing) return (
    <div style={{background:C.card,borderRadius:12,padding:"14px",marginBottom:8,border:`2px solid #2557A7`}}>
      <div style={{fontWeight:700,fontSize:13,color:"#2557A7",marginBottom:10}}>✏️ تعديل — {debt.debtorName}</div>
      <div style={S.fLbl}>المبلغ الأصلي</div>
      <input style={{...S.inp,fontWeight:800,textAlign:"center",fontSize:16}} type="number" value={amount} onChange={e=>setAmount(e.target.value)}/>
      <div style={S.fLbl}>التاريخ</div>
      <input style={S.inp} type="date" value={date} onChange={e=>setDate(e.target.value)}/>
      <div style={S.fLbl}>ملاحظة</div>
      <input style={S.inp} placeholder="..." value={note} onChange={e=>setNote(e.target.value)}/>
      <div style={{display:"flex",gap:8,marginTop:12}}>
        <button style={{flex:2,...S.subBtn,margin:0,padding:"10px",opacity:saving?0.7:1}} onClick={save} disabled={saving}>
          {saving?"جاري الحفظ...":"💾 حفظ"}
        </button>
        <button style={{flex:1,...S.canBtn,margin:0,padding:"10px"}} onClick={()=>setEditing(false)}>إلغاء</button>
      </div>
    </div>
  );

  return (
    <div style={{background:C.card,borderRadius:12,padding:"12px 14px",marginBottom:8,border:`1px solid ${C.cardBorder}`}}>
      {/* الرأس */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div>
          <div style={{fontWeight:800,fontSize:15,color:C.text}}>{debt.debtorName}</div>
          <div style={{fontSize:11,color:C.textSm,marginTop:2}}>📅 {debt.date} {debt.note&&`· ${debt.note}`}</div>
        </div>
        <div style={{textAlign:"left"}}>
          <div style={{fontWeight:900,color:C.red,fontSize:16}}>{fmtD(debt.remaining||debt.amount)}</div>
          {debt.remaining<debt.amount&&<div style={{fontSize:10,color:C.textSm}}>من {fmtD(debt.amount)}</div>}
        </div>
      </div>

      {/* الحالة */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:11,fontWeight:700,color:statusColor,background:statusBg,padding:"3px 10px",borderRadius:8}}>
          {debt.status}
        </span>
        {debt.status!=="مسدد كامل"&&(
          <span style={{fontSize:11,color:C.textSm}}>
            متبقي: {fmtD(debt.remaining||debt.amount)}
          </span>
        )}
      </div>

      {/* أزرار الإجراءات */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {debt.status!=="مسدد كامل"&&<div style={{flex:2}}><PayDebtRow debt={debt} onPay={onPay}/></div>}
        <button style={{
          flex:1,background:"rgba(37,87,167,0.06)",border:`1px solid rgba(37,87,167,0.2)`,
          borderRadius:8,padding:"7px 0",color:"#2557A7",fontSize:12,fontWeight:700,cursor:"pointer"
        }} onClick={()=>setEditing(true)}>✏️ تعديل</button>
        <button style={{
          flex:1,background:"rgba(192,57,43,0.06)",border:`1px solid rgba(192,57,43,0.15)`,
          borderRadius:8,padding:"7px 0",color:C.red,fontSize:12,fontWeight:700,cursor:"pointer"
        }} onClick={()=>onDelete(debt.id)}>🗑️ حذف</button>
      </div>
    </div>
  );
}

function PayDebtRow({debt, onPay}){
  const [mode,    setMode]    = useState(null); // null | full | partial
  const [amt,     setAmt]     = useState("");
  const [saving,  setSaving]  = useState(false);
  const remaining = debt.remaining||debt.amount;
  const fmtD2 = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,",");

  if(!mode) return(
    <div style={{marginTop:8,display:"flex",gap:6}}>
      <button style={{flex:1,background:"linear-gradient(135deg,#1A7A4A,#147A40)",border:"none",borderRadius:8,padding:"8px 0",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}
        onClick={()=>{setMode("full");setAmt(String(remaining));}}>
        ✅ تسديد كامل
      </button>
      <button style={{flex:1,background:"rgba(37,87,167,0.08)",border:"1px solid rgba(37,87,167,0.3)",borderRadius:8,padding:"8px 0",color:"#2557A7",fontSize:12,fontWeight:700,cursor:"pointer"}}
        onClick={()=>{setMode("partial");setAmt("");}}>
        💳 تسديد جزئي
      </button>
    </div>
  );

  return(
    <div style={{marginTop:8,background:"rgba(26,122,74,0.04)",border:"1px solid rgba(26,122,74,0.2)",borderRadius:10,padding:"10px 12px"}}>
      <div style={{fontSize:11,color:"#1A7A4A",fontWeight:700,marginBottom:8}}>
        {mode==="full"?"✅ تسديد كامل":"💳 تسديد جزئي"}
        <span style={{color:"#9B846D",fontWeight:400,marginRight:6}}>— المتبقي: {fmtD2(remaining)}</span>
      </div>
      {mode==="full"?(
        <div style={{background:"rgba(26,122,74,0.08)",borderRadius:8,padding:"8px 12px",fontSize:13,fontWeight:700,color:"#1A7A4A",marginBottom:8,textAlign:"center"}}>
          المبلغ الكامل: {fmtD2(remaining)} {debt.currency==="دولار"?"$":"د.ع"}
        </div>
      ):(
        <input style={{width:"100%",background:"#F5F0E8",border:"1px solid #E2D9CC",borderRadius:8,padding:"8px 10px",fontSize:14,fontWeight:700,outline:"none",marginBottom:8,boxSizing:"border-box"}}
          type="number" placeholder="أدخل المبلغ المسدد" value={amt}
          max={remaining} onChange={e=>setAmt(e.target.value)} autoFocus/>
      )}
      {mode==="partial"&&amt&&Number(amt)>0&&(
        <div style={{fontSize:11,color:"#6b7280",marginBottom:8}}>
          الباقي بعد السداد: {fmtD2(Math.max(0,remaining-Number(amt)))} {debt.currency==="دولار"?"$":"د.ع"}
        </div>
      )}
      <div style={{display:"flex",gap:6}}>
        <button style={{flex:2,background:"linear-gradient(135deg,#1A7A4A,#147A40)",border:"none",borderRadius:8,padding:"8px 0",color:"#fff",fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1}}
          disabled={saving||(!amt&&mode==="partial")}
          onClick={async()=>{
            if(saving)return;
            if(mode==="partial"&&(!amt||Number(amt)<=0))return;
            setSaving(true);
            await onPay(debt, mode==="full"?remaining:Number(amt));
            setSaving(false);
            setMode(null);setAmt("");
          }}>
          {saving?"جاري الحفظ...":"💾 تأكيد السداد"}
        </button>
        <button style={{flex:1,background:"transparent",border:"1px solid #E2D9CC",borderRadius:8,padding:"8px 0",color:"#9B846D",fontSize:12,cursor:"pointer"}}
          onClick={()=>{setMode(null);setAmt("");}}>إلغاء</button>
      </div>
    </div>
  );
}

function TxCard({t,showUser,onDelete,onImg,onEdit}){
  const sp=t.type==="صرف";
  const ar=n=>String(n).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]);
  return(
    <div style={{background:"#fff",border:"1px solid #E2D9CC",borderRadius:14,padding:"14px 16px",boxShadow:"0 2px 8px rgba(44,24,16,0.06)",marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap",flex:1}}>
          <span style={{borderRadius:8,padding:"4px 12px",fontSize:12,fontWeight:700,background:sp?"rgba(192,57,43,0.1)":"rgba(26,122,74,0.1)",color:sp?"#C0392B":"#1A7A4A",border:`1px solid ${sp?"rgba(192,57,43,0.2)":"rgba(26,122,74,0.2)"}`}}>{t.type}</span>
          {t.isPersonal&&<span style={{borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,background:"rgba(107,63,160,0.1)",color:"#6B3FA0",border:"1px solid rgba(107,63,160,0.2)"}}>👤 شخصي</span>}
          {t.isGeneral&&<span style={{borderRadius:8,padding:"4px 10px",fontSize:11,background:"rgba(193,123,47,0.1)",color:"#C17B2F",border:"1px solid rgba(193,123,47,0.2)"}}>📝 عام</span>}
          {t.isAdvance&&<span style={{borderRadius:8,padding:"4px 10px",fontSize:11,background:"rgba(26,122,74,0.1)",color:"#1A7A4A",border:"1px solid rgba(26,122,74,0.2)"}}>💸 سلفة</span>}
          <span style={{borderRadius:8,padding:"4px 10px",fontSize:11,background:"#F5F0E8",color:"#9B846D",border:"1px solid #E2D9CC"}}>{t.currency||"دينار"}</span>
        </div>
        <div style={{fontSize:17,fontWeight:900,color:sp?"#C0392B":"#1A7A4A",letterSpacing:-0.5,flexShrink:0,marginRight:8}}>
          {sp?"-":"+"}{ar(Number(t.amount).toLocaleString("ar-IQ"))} {t.currency==="دولار"?"$":"د.ع"}
        </div>
      </div>
      {showUser&&<div style={{fontSize:12,color:"#C17B2F",fontWeight:700,marginBottom:3}}>{t.userName}</div>}
      {t.projectName&&<div style={{fontSize:13,color:"#6B5744",marginBottom:2}}>{t.projectName}</div>}
      <div style={{fontSize:12,color:"#9B846D"}}>📅 {t.date}</div>
      {t.note&&<div style={{fontSize:13,color:"#2C1810",marginTop:8,background:"#F5F0E8",borderRadius:10,padding:"8px 12px",border:"1px solid #E2D9CC"}}>{t.note}</div>}
      {t.image&&<img src={t.image} style={{width:"100%",maxHeight:180,objectFit:"cover",borderRadius:12,marginTop:10,cursor:"pointer"}} alt="وصل" onClick={()=>onImg&&onImg(t.image)}/>}
      {(onDelete||onEdit)&&(
        <div style={{display:"flex",gap:6,marginTop:10}}>
          {onEdit&&<button style={{flex:1,background:"rgba(37,87,167,0.06)",border:"1px solid rgba(37,87,167,0.2)",borderRadius:8,padding:"7px 0",color:"#2557A7",fontSize:12,fontWeight:700,cursor:"pointer"}} onClick={()=>onEdit(t)}>✏️ تعديل</button>}
          {onDelete&&<button style={{flex:1,background:"rgba(192,57,43,0.06)",border:"1px solid rgba(192,57,43,0.15)",borderRadius:8,padding:"7px 0",color:"#C0392B",fontSize:12,fontWeight:700,cursor:"pointer"}} onClick={onDelete}>🗑️ حذف</button>}
        </div>
      )}
    </div>
  );
}

// C moved to top


// S defined inside App below
;
