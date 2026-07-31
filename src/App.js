import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, addDoc, setDoc,
         deleteDoc, onSnapshot, query, orderBy } from "firebase/firestore";

// ─── Firebase ───────────────────────────────────────────────
const app = initializeApp({
  apiKey:     "AIzaSyD_h8oJKVRpzfhi47q-EAsK1Ct_mRT5CIw",
  authDomain: "hisab-app-e4616.firebaseapp.com",
  projectId:  "hisab-app-e4616",
});
const db = getFirestore(app);

// ─── معلومات الشركة ─────────────────────────────────────────
const COMPANY = {
  name:    "شركة باب المشاريع",
  nameEn:  "Project Gate Company",
  address: "بغداد — العرصات، مقابل شركة زين",
};

const LOGO_B64 = "";

// ─── الصناديق الثمانية ──────────────────────────────────────
const FUNDS = [
  { id:"capital",     name:"صندوق رأس المال",     icon:"ti-safe",          color:"#2563EB", light:"#EFF6FF" },
  { id:"general",     name:"الصندوق العام",        icon:"ti-building-bank", color:"#0891B2", light:"#ECFEFF" },
  { id:"decor",       name:"صندوق الديكور",        icon:"ti-palette",       color:"#7C3AED", light:"#F5F3FF" },
  { id:"contracting", name:"صندوق المقاولات",      icon:"ti-building",      color:"#D97706", light:"#FFFBEB" },
  { id:"facades",     name:"صندوق الواجهات",       icon:"ti-layers",        color:"#059669", light:"#ECFDF5" },
  { id:"engineering", name:"صندوق أعمال هندسية",  icon:"ti-ruler-2",       color:"#DC2626", light:"#FEF2F2" },
  { id:"trade",       name:"صندوق التجارة",         icon:"ti-briefcase",     color:"#16A34A", light:"#F0FDF4" },
  { id:"partners",    name:"صندوق أرباح الشركاء", icon:"ti-users",         color:"#9333EA", light:"#FAF5FF" },
];

// ─── الشركاء ────────────────────────────────────────────────
const PARTNERS = [
  { id:"ihab",     name:"إيهاب زيتوني", share:30, color:"#2563EB", light:"#EFF6FF" },
  { id:"nour",     name:"نور إدوارد",   share:30, color:"#059669", light:"#ECFDF5" },
  { id:"mohammed", name:"محمد سالم",    share:30, color:"#7C3AED", light:"#F5F3FF" },
  { id:"ahmed",    name:"أحمد سالم",    share:10, color:"#D97706", light:"#FFFBEB" },
];

// ─── مساعدات ────────────────────────────────────────────────
const toAr = n => {
  const s = String(Math.round(Math.abs(Number(n)||0)));
  let r = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) r += ",";
    r += s[i];
  }
  return r;
};
const today = () => new Date().toISOString().split("T")[0];
const fmtD  = n => toAr(n) + " د.ع";
const fmt   = (n, cur) => cur === "دولار" ? toAr(n) + " $" : fmtD(n);
const arNum = n => toAr(n);

function numToWords(n) {
  if (!n || isNaN(n)) return "";
  const num = Math.floor(Math.abs(Number(n)));
  if (num === 0) return "صفر";
  const ones = ["","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة",
    "عشرة","أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر",
    "ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"];
  const tens     = ["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"];
  const hundreds = ["","مئة","مئتان","ثلاثمئة","أربعمئة","خمسمئة","ستمئة","سبعمئة","ثمانمئة","تسعمئة"];
  const grp = g => {
    if (g === 0) return "";
    if (g < 20)  return ones[g];
    if (g < 100) return tens[Math.floor(g/10)] + (g%10 ? " و" + ones[g%10] : "");
    return hundreds[Math.floor(g/100)] + (g%100 ? " و" + grp(g%100) : "");
  };
  const p = [];
  if (num >= 1000000000) p.push(grp(Math.floor(num/1000000000)) + " مليار");
  if (num % 1000000000 >= 1000000) p.push(grp(Math.floor((num%1000000000)/1000000)) + " مليون");
  if (num % 1000000 >= 1000) p.push(grp(Math.floor((num%1000000)/1000)) + " ألف");
  if (num % 1000 > 0) p.push(grp(num % 1000));
  return p.join(" و");
}

// ─── مكونات مشتركة ──────────────────────────────────────────
const Lbl = ({ children }) => (
  <div style={{ fontSize:12, color:"#64748B", fontWeight:600, marginBottom:6 }}>{children}</div>
);

const Inp = ({ style, ...props }) => (
  <input style={{
    width:"100%", border:"1px solid #E2E8F0", borderRadius:10,
    padding:"11px 14px", fontSize:15, background:"#F8FAFC",
    color:"#1E293B", outline:"none", boxSizing:"border-box",
    fontFamily:"Tahoma", direction:"rtl", ...style,
  }} {...props} />
);

const BackBtn = ({ onClick, label="رجوع" }) => (
  <button onClick={onClick} style={{
    background:"#fff", border:"1px solid #E2E8F0", borderRadius:10,
    padding:"8px 16px", fontSize:13, color:"#64748B", cursor:"pointer",
    marginBottom:20, fontFamily:"Tahoma",
    display:"flex", alignItems:"center", gap:6,
    boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
  }}>
    <i className="ti ti-arrow-right" aria-hidden="true"/> {label}
  </button>
);

const CurrencySelect = ({ value, onChange }) => (
  <select value={value} onChange={onChange} style={{
    border:"1px solid #E2E8F0", borderRadius:10, padding:"11px 10px",
    fontSize:13, background:"#F8FAFC", color:"#1E293B",
    outline:"none", fontFamily:"Tahoma", cursor:"pointer",
  }}>
    <option value="دينار">🇮🇶 دينار</option>
    <option value="دولار">🇺🇸 دولار</option>
  </select>
);

// رأس الطباعة المشترك (لوغو + معلومات الشركة)
const printHeader = () =>
  "<div style='text-align:center;padding-bottom:14px;margin-bottom:18px;" +
  "border-bottom:3px solid #1E293B'>" +
  "<img src='data:image/png;base64," + LOGO_B64 + "' " +
  "style='height:72px;display:block;margin:0 auto 6px'/>" +
  "<div style='font-size:12px;color:#64748B'>" + COMPANY.address + "</div></div>";

// ─── App ────────────────────────────────────────────────────
export default function App() {
  const [page,     setPage]    = useState("home");
  const [selFund,   setSelFund]  = useState(null);
  const [selProject,setSelProject]= useState(null); // المشروع المفتوح
  const [loading,   setLoading]  = useState(true);
  const [balances,  setBalances] = useState({});
  const [txs,       setTxs]     = useState([]);
  const [projects,  setProjects] = useState([]); // كل المشاريع

  // تحميل Tabler Icons
  useEffect(() => {
    if (!document.querySelector("#ti-css")) {
      const l  = document.createElement("link");
      l.id     = "ti-css";
      l.rel    = "stylesheet";
      l.href   = "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css";
      document.head.appendChild(l);
    }
  }, []);

  // Firebase listeners
  useEffect(() => {
    const unsubs = [];
    const timer  = setTimeout(() => setLoading(false), 6000);

    unsubs.push(onSnapshot(collection(db, "fund_balances"), snap => {
      const b = {};
      snap.docs.forEach(d => {
        const data = d.data();
        b[d.id] = { din: data.din ?? data.balance ?? 0, dol: data.dol ?? 0 };
      });
      setBalances(b);
      setLoading(false);
    }, () => setLoading(false)));

    unsubs.push(onSnapshot(
      query(collection(db, "fund_transactions"), orderBy("date", "desc")),
      snap => setTxs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    ));

    // مشاريع الصناديق
    unsubs.push(onSnapshot(
      query(collection(db, "fund_projects"), orderBy("createdAt", "desc")),
      snap => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    ));

    return () => { unsubs.forEach(u => u()); clearTimeout(timer); };
  }, []);

  // مساعد: رصيد صندوق
  const getBal = (fundId) => balances[fundId] || { din: 0, dol: 0 };

  // ── إضافة معاملة لصندوق ──────────────────────────────────
  const addTx = async (fundId, type, amount, note, date, currency = "دينار", exchRate = 0) => {
    const amt    = Math.round(Number(amount));
    if (!amt || amt <= 0) return;
    const cur    = getBal(fundId);
    const isDol  = currency === "دولار";
    const amtInDinar = isDol ? amt * (Number(exchRate) || 0) : amt;
    const newDin = type === "إيداع"
      ? cur.din + (isDol ? amtInDinar : amt)
      : cur.din - (isDol ? amtInDinar : amt);
    const newDol = isDol
      ? (type === "إيداع" ? cur.dol + amt : cur.dol - amt)
      : cur.dol;

    await setDoc(doc(db, "fund_balances", fundId),
      { din: newDin, dol: newDol }, { merge: true });

    await addDoc(collection(db, "fund_transactions"), {
      fundId,
      fundName:    FUNDS.find(f => f.id === fundId)?.name || "",
      type, amount: amt, currency,
      exchRate:    Number(exchRate) || 0,
      amtInDinar,
      note:        note || "",
      date:        date || today(),
      balAfterDin: newDin,
      balAfterDol: newDol,
      createdAt:   new Date().toISOString(),
    });
  };

  // ── تحويل أرباح من صندوق → صندوق الشركاء ─────────────────
  const transferProfit = async (fromFundId, amount, currency, exchRate, note, date) => {
    const amt      = Math.round(Number(amount));
    if (!amt || amt <= 0) return;
    const isDol    = currency === "دولار";
    const amtInDin = isDol ? amt * (Number(exchRate) || 0) : amt;
    const fromFund = FUNDS.find(f => f.id === fromFundId);

    // ١. اسحب من الصندوق المصدر
    const fromBal  = getBal(fromFundId);
    const fromDin  = isDol ? fromBal.din - amtInDin : fromBal.din - amt;
    const fromDol  = isDol ? fromBal.dol - amt : fromBal.dol;
    await setDoc(doc(db, "fund_balances", fromFundId),
      { din: fromDin, dol: fromDol }, { merge: true });
    await addDoc(collection(db, "fund_transactions"), {
      fundId: fromFundId,
      fundName: fromFund?.name || "",
      type: "تحويل أرباح",
      amount: amt, currency, exchRate: Number(exchRate) || 0, amtInDinar: amtInDin,
      note: "تحويل أرباح → صندوق الشركاء" + (note ? " — " + note : ""),
      date: date || today(),
      balAfterDin: fromDin, balAfterDol: fromDol,
      isTransfer: true,
      createdAt: new Date().toISOString(),
    });

    // ٢. أضف لصندوق الشركاء الرئيسي
    const mainBal  = getBal("partners");
    const mainDin  = mainBal.din + amtInDin;
    const mainDol  = isDol ? mainBal.dol + amt : mainBal.dol;
    await setDoc(doc(db, "fund_balances", "partners"),
      { din: mainDin, dol: mainDol }, { merge: true });
    await addDoc(collection(db, "fund_transactions"), {
      fundId: "partners", fundName: "صندوق أرباح الشركاء",
      type: "إيداع أرباح",
      amount: amt, currency, exchRate: Number(exchRate) || 0, amtInDinar: amtInDin,
      note: "أرباح من " + (fromFund?.name || fromFundId) + (note ? " — " + note : ""),
      date: date || today(),
      balAfterDin: mainDin, balAfterDol: mainDol,
      isTransfer: true,
      createdAt: new Date().toISOString(),
    });

    // ٣. وزّع على الشركاء الأربعة (دينار + دولار)
    for (const p of PARTNERS) {
      const shareDin = Math.round(amtInDin * p.share / 100);
      const shareDol = isDol ? Math.round(amt * p.share / 100) : 0;
      const pId      = "partner_" + p.id;
      const pBal     = getBal(pId);
      const pNewDin  = pBal.din + shareDin;
      const pNewDol  = pBal.dol + shareDol;
      await setDoc(doc(db, "fund_balances", pId),
        { din: pNewDin, dol: pNewDol }, { merge: true });
      await addDoc(collection(db, "fund_transactions"), {
        fundId: pId, fundName: p.name,
        type: "إيداع",
        amount: isDol ? shareDol : shareDin,
        currency, exchRate: Number(exchRate)||0,
        amtInDinar: shareDin,
        note: "حصة " + p.share + "% من أرباح " + (fromFund?.name || "") + (note ? " — " + note : ""),
        date: date || today(),
        balAfterDin: pNewDin, balAfterDol: pNewDol,
        isDistribution: true,
        createdAt: new Date().toISOString(),
      });
    }
  };

  // ── إيداع لصندوق الشركاء مباشرة ─────────────────────────
  const depositToPartners = async (totalAmt, note, date) => {
    const amt    = Math.round(Number(totalAmt));
    if (!amt || amt <= 0) return;
    const mainBal = getBal("partners");
    const mainNew = mainBal.din + amt;
    await setDoc(doc(db, "fund_balances", "partners"),
      { din: mainNew, dol: mainBal.dol }, { merge: true });
    await addDoc(collection(db, "fund_transactions"), {
      fundId: "partners", fundName: "صندوق أرباح الشركاء",
      type: "إيداع", amount: amt, currency: "دينار", exchRate: 0, amtInDinar: amt,
      note: note || "", date: date || today(),
      balAfterDin: mainNew, balAfterDol: mainBal.dol,
      createdAt: new Date().toISOString(),
    });
    for (const p of PARTNERS) {
      const share  = Math.round(amt * p.share / 100);
      const pId    = "partner_" + p.id;
      const pBal   = getBal(pId);
      const pNew   = pBal.din + share;
      await setDoc(doc(db, "fund_balances", pId),
        { din: pNew, dol: pBal.dol }, { merge: true });
      await addDoc(collection(db, "fund_transactions"), {
        fundId: pId, fundName: p.name,
        type: "إيداع", amount: share, currency: "دينار", exchRate: 0, amtInDinar: share,
        note: "توزيع " + p.share + "% — " + (note || ""),
        date: date || today(),
        balAfterDin: pNew, balAfterDol: pBal.dol,
        isDistribution: true,
        createdAt: new Date().toISOString(),
      });
    }
  };


  // ── سحب شريك ────────────────────────────────────────────
  const withdrawPartner = async (partnerId, amount, currency, exchRate, note, date) => {
    const amt    = Math.round(Number(amount));
    const isDol  = currency === "دولار";
    const pId    = "partner_" + partnerId;
    const pBal   = getBal(pId);
    const amtDin = isDol ? amt * (Number(exchRate) || 0) : amt;

    // تحقق من الرصيد الكافي
    if (isDol && amt > pBal.dol) {
      alert("لا يمكن السحب — رصيد الدولار غير كافٍ\nالمتاح: " + toAr(Math.round(pBal.dol)) + " $");
      return false;
    }
    if (!isDol && amt > pBal.din) {
      alert("لا يمكن السحب — رصيد الدينار غير كافٍ\nالمتاح: " + fmtD(pBal.din));
      return false;
    }

    const pNewDin  = pBal.din - amtDin;
    const pNewDol  = isDol ? pBal.dol - amt : pBal.dol;
    const mainBal  = getBal("partners");
    const mNewDin  = mainBal.din - amtDin;
    const mNewDol  = isDol ? mainBal.dol - amt : mainBal.dol;

    await setDoc(doc(db,"fund_balances",pId),
      { din: pNewDin, dol: pNewDol }, { merge:true });
    await setDoc(doc(db,"fund_balances","partners"),
      { din: mNewDin, dol: mNewDol }, { merge:true });
    await addDoc(collection(db,"fund_transactions"), {
      fundId: pId,
      fundName: PARTNERS.find(p=>p.id===partnerId)?.name || "",
      type: "سحب", amount: amt, currency,
      exchRate: Number(exchRate)||0, amtInDinar: amtDin,
      note: note||"", date: date||today(),
      balAfterDin: pNewDin, balAfterDol: pNewDol,
      createdAt: new Date().toISOString(),
    });
    return true;
  };

  // ── حذف معاملة ──────────────────────────────────────────
  const deleteTx = async tx => {
    if (!window.confirm("تحذف هذه المعاملة؟")) return;
    const cur   = getBal(tx.fundId);
    const isDol = tx.currency === "دولار";
    const amtD  = tx.amtInDinar || tx.amount;
    const isIn  = tx.type === "إيداع" || tx.type === "إيداع أرباح";
    const newDin = isIn ? cur.din - amtD : cur.din + amtD;
    const newDol = isDol ? (isIn ? cur.dol - tx.amount : cur.dol + tx.amount) : cur.dol;
    await setDoc(doc(db,"fund_balances",tx.fundId), { din:newDin, dol:newDol }, { merge:true });
    await deleteDoc(doc(db,"fund_transactions",tx.id));
  };

  // ── إنشاء مشروع جديد ────────────────────────────────────
  const addProject = async (fundId, name, note) => {
    await addDoc(collection(db, "fund_projects"), {
      fundId, name: name.trim(),
      note: note||"",
      status: "نشط",          // نشط | منتهي
      recDin:0, recDol:0,    // إجمالي المستلم
      spdDin:0, spdDol:0,    // إجمالي المصروف
      createdAt: new Date().toISOString(),
    });
  };

  // ── إضافة حركة مالية لمشروع ─────────────────────────────
  const addProjectTx = async (proj, type, amount, currency, exchRate, note, date) => {
    const amt    = Math.round(Number(amount));
    if (!amt || amt<=0) return;
    const isDol  = currency==="دولار";
    const amtDin = isDol ? amt*(Number(exchRate)||0) : amt;
    // حدّث إجماليات المشروع
    const field  = type==="استلام"
      ? (isDol?"recDol":"recDin")
      : (isDol?"spdDol":"spdDin");
    const cur    = proj[field]||0;
    await setDoc(doc(db,"fund_projects",proj.id),
      { [field]: cur+amt }, { merge:true });
    // سجّل الحركة
    await addDoc(collection(db,"fund_projects_txs"), {
      projectId: proj.id, projectName: proj.name,
      fundId: proj.fundId,
      type, amount:amt, currency,
      exchRate: Number(exchRate)||0, amtInDinar: amtDin,
      note: note||"", date: date||today(),
      createdAt: new Date().toISOString(),
    });
  };

  // ── إنهاء المشروع وتوزيع الأرباح ────────────────────────
  const closeProject = async (proj, distributions) => {
    // distributions = [{ fundId, pct }] مجموعها 100
    const profitDin = (proj.recDin||0) - (proj.spdDin||0);
    const profitDol = (proj.recDol||0) - (proj.spdDol||0);
    for (const d of distributions) {
      const shareDin = Math.round(profitDin * d.pct / 100);
      const shareDol = Math.round(profitDol * d.pct / 100);
      // أضف للصندوق المعني
      const fb = getBal(d.fundId);
      const newDin = fb.din + shareDin;
      const newDol = fb.dol + shareDol;
      await setDoc(doc(db,"fund_balances",d.fundId),
        { din:newDin, dol:newDol }, { merge:true });
      await addDoc(collection(db,"fund_transactions"), {
        fundId:d.fundId,
        fundName: FUNDS.find(f=>f.id===d.fundId)?.name||"",
        type:"إيداع", currency:"دينار", exchRate:0,
        amount: shareDin, amtInDinar: shareDin,
        note: d.pct+"% أرباح مشروع: "+proj.name,
        date: today(), balAfterDin:newDin, balAfterDol:newDol,
        isProjectProfit:true,
        createdAt: new Date().toISOString(),
      });
      // لو الصندوق شركاء → وزّع تلقائياً
      if (d.fundId==="partners" && shareDin>0) {
        for (const p of PARTNERS) {
          const ps   = Math.round(shareDin*p.share/100);
          const pId  = "partner_"+p.id;
          const pb   = getBal(pId);
          await setDoc(doc(db,"fund_balances",pId),
            { din:pb.din+ps, dol:pb.dol }, { merge:true });
          await addDoc(collection(db,"fund_transactions"), {
            fundId:pId, fundName:p.name,
            type:"إيداع", currency:"دينار", exchRate:0,
            amount:ps, amtInDinar:ps,
            note:"حصة "+p.share+"% من أرباح "+proj.name,
            date:today(), isDistribution:true,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
    // أغلق المشروع
    await setDoc(doc(db,"fund_projects",proj.id),
      { status:"منتهي", closedAt:today() }, { merge:true });
  };

  // ── حذف مشروع ───────────────────────────────────────────
  const deleteProject = async id => {
    if (!window.confirm("تحذف هذا المشروع؟")) return;
    await deleteDoc(doc(db,"fund_projects",id));
  };

  // ── شاشة التحميل ────────────────────────────────────────
  if (loading) return (
    <div style={{minHeight:"100vh",background:"#F1F5F9",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",gap:12,fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{fontSize:22,fontWeight:700,color:"#1E293B"}}>{COMPANY.name}</div>
      <div style={{fontSize:13,color:"#64748B"}}>جاري التحميل...</div>
    </div>
  );

  // ── التوجيه ──────────────────────────────────────────────
  if (page === "partners")
    return <PartnersPage
      partners={PARTNERS} balances={balances} txs={txs}
      onBack={()=>setPage("home")}
      onDeposit={depositToPartners}
      onWithdraw={withdrawPartner}
      onDelete={deleteTx}
    />;

  if (page==="project" && selProject)
    return <ProjectDetail
      project={selProject}
      fund={FUNDS.find(f=>f.id===selProject.fundId)}
      allFunds={FUNDS}
      onBack={()=>{ setPage("fund"); setSelProject(null); }}
      onAddTx={addProjectTx}
      onClose={closeProject}
      onDelete={deleteProject}
    />;

  if (page === "fund" && selFund) {
    const bal  = getBal(selFund);
    const fund = FUNDS.find(f=>f.id===selFund);
    return <FundDetail
      fund={fund}
      balDin={bal.din} balDol={bal.dol}
      txs={txs.filter(t=>t.fundId===selFund)}
      projects={projects.filter(p=>p.fundId===selFund)}
      onBack={()=>{ setPage("home"); setSelFund(null); }}
      onAdd={(type,amt,note,date,cur,exch)=>addTx(selFund,type,amt,note,date,cur,exch)}
      onTransfer={(amt,cur,exch,note,date)=>transferProfit(selFund,amt,cur,exch,note,date)}
      onDelete={deleteTx}
      onAddProject={(name,note)=>addProject(selFund,name,note)}
      onOpenProject={proj=>{ setSelProject(proj); setPage("project"); }}
    />;
  }

  return <FundsList
    funds={FUNDS} balances={balances}
    onSelect={id=>{
      if (id==="partners") setPage("partners");
      else { setSelFund(id); setPage("fund"); }
    }}
  />;
}


// ─── قائمة الصناديق ─────────────────────────────────────────
function FundsList({ funds, balances, onSelect }) {
  const total = funds.reduce((s, f) => s + ((balances[f.id]||{}).din||0), 0);

  return (
    <div style={{
      minHeight:"100vh", background:"#F1F5F9",
      fontFamily:"Tahoma", direction:"rtl",
    }}>
      <div style={{ maxWidth:760, margin:"0 auto", padding:"24px 16px" }}>

        {/* Header */}
        <div style={{
          background:"#fff", borderRadius:16, padding:"18px 22px",
          marginBottom:22, border:"1px solid #E2E8F0",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{fontSize:18,fontWeight:700,color:"#1E293B"}}>{COMPANY.name}</div>
            <div>
              <div style={{ fontSize:18, fontWeight:700, color:"#1E293B" }}>الصناديق المالية</div>
              <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>{COMPANY.address}</div>
            </div>
          </div>
          <div style={{ textAlign:"left" }}>
            <div style={{ fontSize:11, color:"#64748B", marginBottom:2 }}>إجمالي الأرصدة</div>
            <div style={{ fontSize:22, fontWeight:700, color:"#2563EB" }}>{fmtD(total)}</div>
          </div>
        </div>

        {/* شبكة الصناديق */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:14 }}>
          {funds.map(f => {
          const bal = balances[f.id] || {din:0, dol:0};
          const isPos = bal.din >= 0;
            return (
              <button key={f.id} onClick={() => onSelect(f.id)} style={{
                background:"#fff", border:"1px solid #E2E8F0",
                borderRight:"5px solid " + f.color,
                borderRadius:14, padding:"18px 16px",
                cursor:"pointer", textAlign:"right",
                display:"flex", flexDirection:"column", gap:14,
                fontFamily:"Tahoma",
                boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
                transition:"box-shadow 0.15s, transform 0.12s",
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.09)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = "none"; }}>

                {/* أيقونة + اسم */}
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{
                    width:42, height:42, borderRadius:12,
                    background: f.light,
                    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                  }}>
                    <i className={`ti ${f.icon}`} style={{ fontSize:22, color:f.color }} aria-hidden="true"/>
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#1E293B", lineHeight:1.4 }}>{f.name}</div>
                </div>

                {/* الرصيد */}
                <div style={{
                  background: isPos ? "#F0FDF4" : "#FFF1F2",
                  borderRadius:10, padding:"12px 14px",
                }}>
                  <div style={{ fontSize:10, color:"#64748B", marginBottom:4 }}>الرصيد الحالي</div>
                  <div style={{ fontSize:21, fontWeight:700, letterSpacing:-0.5, color: isPos ? "#16A34A" : "#DC2626" }}>
                    {isPos ? "" : "-"}{fmtD(bal)}
                  </div>
                </div>

                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{
                    fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20,
                    color: isPos ? "#16A34A" : "#DC2626",
                    background: isPos ? "#DCFCE7" : "#FEE2E2",
                  }}>
                    {isPos ? "● موجب" : "● سالب"}
                  </span>
                  {f.id === "partners" && (
                    <span style={{
                      fontSize:10, color:f.color, fontWeight:600,
                      background:f.light, padding:"3px 8px", borderRadius:20,
                    }}>4 شركاء</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── تفاصيل صندوق ───────────────────────────────────────────
function FundDetail({ fund, balDin=0, balDol=0, txs, projects=[], onBack, onAdd, onTransfer, onDelete, onAddProject, onOpenProject }) {
  const [form,     setForm]    = useState({ type:"إيداع", amount:"", currency:"دينار", exchRate:"", note:"", date:today() });
  const [trForm,   setTrForm]  = useState({ amount:"", currency:"دينار", exchRate:"", note:"", date:today() });
  const [tab,      setTab]     = useState("tx");    // tx | transfer
  const [saving,   setSaving]  = useState(false);
  const [done,     setDone]    = useState(false);
  const [trDone,   setTrDone]  = useState(false);

  const set   = k => v => setForm(f => ({ ...f, [k]: v }));
  const setTr = k => v => setTrForm(f => ({ ...f, [k]: v }));
  const amtN       = Number(form.amount) || 0;
  const amtInDinar = form.currency === "دولار" ? amtN * (Number(form.exchRate) || 0) : amtN;
  const valid      = amtN > 0 && form.date;
  const trAmtN     = Number(trForm.amount) || 0;
  const trAmtDin   = trForm.currency === "دولار" ? trAmtN * (Number(trForm.exchRate) || 0) : trAmtN;
  const trValid    = trAmtN > 0 && trForm.date;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    await onAdd(form.type, form.amount, form.note, form.date, form.currency, form.exchRate);
    setSaving(false); setDone(true);
    setTimeout(() => { setDone(false); setForm({ type:"إيداع", amount:"", currency:"دينار", exchRate:"", note:"", date:today() }); }, 1400);
  };

  const saveTransfer = async () => {
    if (!trValid || saving) return;
    setSaving(true);
    await onTransfer(trForm.amount, trForm.currency, trForm.exchRate, trForm.note, trForm.date);
    setSaving(false); setTrDone(true);
    setTimeout(() => { setTrDone(false); setTrForm({ amount:"", currency:"دينار", exchRate:"", note:"", date:today() }); }, 1600);
  };

  const totIn  = txs.filter(t => t.type === "إيداع" || t.type === "إيداع أرباح").reduce((s, t) => s + (t.amtInDinar || t.amount), 0);
  const totOut = txs.filter(t => t.type === "سحب" || t.type === "تحويل أرباح").reduce((s, t) => s + (t.amtInDinar || t.amount), 0);

  return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9", fontFamily:"Tahoma", direction:"rtl" }}>
      <div style={{ maxWidth:620, margin:"0 auto", padding:"24px 16px" }}>

        <BackBtn onClick={onBack} label="رجوع للصناديق"/>

        {/* بطاقة الصندوق */}
        <div style={{
          background:"#fff", borderRadius:18, padding:22, marginBottom:16,
          border:"1px solid #E2E8F0", borderTop:"5px solid " + fund.color,
          boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
            <div style={{ width:50, height:50, borderRadius:14, background:fund.light,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <i className={`ti ${fund.icon}`} style={{ fontSize:26, color:fund.color }} aria-hidden="true"/>
            </div>
            <div>
              <div style={{ fontSize:18, fontWeight:700, color:"#1E293B" }}>{fund.name}</div>
              <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>كشف الحساب</div>
            </div>
          </div>

          {/* الرصيدان */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
            <div style={{ background: balDin >= 0 ? "#F0FDF4" : "#FFF1F2", borderRadius:12, padding:"14px" }}>
              <div style={{ fontSize:10, color:"#64748B", marginBottom:4 }}>🇮🇶 رصيد الدينار</div>
              <div style={{ fontSize:22, fontWeight:700, color: balDin >= 0 ? "#16A34A" : "#DC2626" }}>
                {balDin >= 0 ? "" : "-"}{fmtD(balDin)}
              </div>
            </div>
            <div style={{ background: balDol >= 0 ? "#EFF6FF" : "#FFF1F2", borderRadius:12, padding:"14px" }}>
              <div style={{ fontSize:10, color:"#64748B", marginBottom:4 }}>🇺🇸 رصيد الدولار</div>
              <div style={{ fontSize:22, fontWeight:700, color: balDol >= 0 ? "#2563EB" : "#DC2626" }}>
                {balDol >= 0 ? "" : "-"}{toAr(Math.abs(Math.round(balDol)))} $
              </div>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div style={{ background:"#F0FDF4", borderRadius:12, padding:"12px 14px" }}>
              <div style={{ fontSize:10, color:"#64748B", marginBottom:4 }}>↓ إجمالي الإيداع</div>
              <div style={{ fontSize:14, fontWeight:700, color:"#16A34A" }}>{fmtD(totIn)}</div>
            </div>
            <div style={{ background:"#FFF1F2", borderRadius:12, padding:"12px 14px" }}>
              <div style={{ fontSize:10, color:"#64748B", marginBottom:4 }}>↑ إجمالي الصرف</div>
              <div style={{ fontSize:14, fontWeight:700, color:"#DC2626" }}>{fmtD(totOut)}</div>
            </div>
          </div>
        </div>

        {/* تبويبات */}
        <div style={{ display:"flex", background:"#fff", borderRadius:12, padding:4, gap:4,
          marginBottom:14, border:"1px solid #E2E8F0" }}>
          {[["tx","💰 معاملة"],["transfer","🔄 أرباح"],["projects","🏗️ مشاريع"]].map(([v,l]) => (
            <button key={v} onClick={() => setTab(v)} style={{
              flex:1, border:"none", borderRadius:9, padding:"10px 8px",
              cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"Tahoma",
              background: tab === v ? "#1E293B" : "transparent",
              color: tab === v ? "#fff" : "#64748B",
            }}>{l}</button>
          ))}
        </div>

        {/* نموذج المعاملة */}
        {tab === "tx" && (
        <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:16, padding:18, marginBottom:16 }}>
          {done ? (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ fontSize:40, marginBottom:6 }}>✅</div>
              <div style={{ fontWeight:700, color:"#16A34A" }}>تم التسجيل</div>
            </div>
          ) : (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
                {["إيداع", "سحب"].map(t => (
                  <button key={t} onClick={() => set("type")(t)} style={{
                    padding:"12px", borderRadius:10, cursor:"pointer",
                    fontFamily:"Tahoma", fontSize:14, fontWeight:700,
                    border:"1.5px solid " + (form.type === t ? (t === "إيداع" ? "#16A34A" : "#DC2626") : "#E2E8F0"),
                    background: form.type === t ? (t === "إيداع" ? "#F0FDF4" : "#FFF1F2") : "transparent",
                    color: form.type === t ? (t === "إيداع" ? "#16A34A" : "#DC2626") : "#64748B",
                  }}>{t === "إيداع" ? "↓ إيداع" : "↑ سحب"}</button>
                ))}
              </div>
              <Lbl>المبلغ والعملة</Lbl>
              <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                <Inp style={{ flex:2, fontSize:20, fontWeight:700, textAlign:"center" }}
                  type="number" placeholder="٠"
                  value={form.amount} onChange={e => set("amount")(e.target.value)} autoFocus/>
                <CurrencySelect value={form.currency} onChange={e => set("currency")(e.target.value)}/>
              </div>
              {form.currency === "دولار" && (
                <>
                  <Lbl>سعر الصرف (دينار للدولار)</Lbl>
                  <Inp style={{ marginBottom:6 }} type="number" placeholder="مثال: 1480"
                    value={form.exchRate} onChange={e => set("exchRate")(e.target.value)}/>
                  {amtN > 0 && Number(form.exchRate) > 0 && (
                    <div style={{ fontSize:12, color:"#2563EB", fontWeight:600, marginBottom:8,
                      padding:"7px 12px", background:"#EFF6FF", borderRadius:8 }}>
                      💱 يعادل: {fmtD(amtInDinar)}
                    </div>
                  )}
                </>
              )}
              <Lbl>التاريخ</Lbl>
              <Inp style={{ marginBottom:12 }} type="date" value={form.date} onChange={e => set("date")(e.target.value)}/>
              <Lbl>ملاحظة</Lbl>
              <Inp style={{ marginBottom:16 }} placeholder="..." value={form.note} onChange={e => set("note")(e.target.value)}/>
              <button onClick={save} disabled={!valid || saving} style={{
                width:"100%", border:"none", borderRadius:12, padding:"14px",
                fontSize:15, fontWeight:700, cursor: valid ? "pointer" : "not-allowed", fontFamily:"Tahoma",
                background: valid ? (form.type === "إيداع" ? "#16A34A" : "#DC2626") : "#E2E8F0",
                color: valid ? "#fff" : "#94A3B8",
              }}>{saving ? "جاري الحفظ..." : (form.type === "إيداع" ? "↓ تأكيد الإيداع" : "↑ تأكيد السحب")}</button>
            </>
          )}
        </div>
        )}

        {/* نموذج تحويل الأرباح */}
        {tab === "transfer" && (
        <div style={{ background:"#fff", border:"1.5px solid #9333EA30", borderRadius:16, padding:18, marginBottom:16 }}>
          <div style={{ fontSize:13, color:"#64748B", marginBottom:14, background:"#FAF5FF",
            borderRadius:8, padding:"10px 14px", border:"1px solid #9333EA20" }}>
            🔄 يتم تحويل المبلغ من هذا الصندوق مباشرةً إلى صندوق الشركاء ويتوزع تلقائياً
          </div>
          {trDone ? (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ fontSize:40, marginBottom:6 }}>✅</div>
              <div style={{ fontWeight:700, color:"#9333EA" }}>تم التحويل والتوزيع</div>
            </div>
          ) : (
            <>
              <Lbl>مبلغ التحويل (الأرباح)</Lbl>
              <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                <Inp style={{ flex:2, fontSize:20, fontWeight:700, textAlign:"center" }}
                  type="number" placeholder="٠"
                  value={trForm.amount} onChange={e => setTr("amount")(e.target.value)} autoFocus/>
                <CurrencySelect value={trForm.currency} onChange={e => setTr("currency")(e.target.value)}/>
              </div>
              {trForm.currency === "دولار" && (
                <>
                  <Lbl>سعر الصرف</Lbl>
                  <Inp style={{ marginBottom:6 }} type="number" placeholder="مثال: 1480"
                    value={trForm.exchRate} onChange={e => setTr("exchRate")(e.target.value)}/>
                  {trAmtN > 0 && Number(trForm.exchRate) > 0 && (
                    <div style={{ fontSize:12, color:"#2563EB", fontWeight:600, marginBottom:8,
                      padding:"7px 12px", background:"#EFF6FF", borderRadius:8 }}>
                      💱 يعادل: {fmtD(trAmtDin)}
                    </div>
                  )}
                </>
              )}
              {/* معاينة التوزيع */}
              {trAmtDin > 0 && (
                <div style={{ background:"#FAF5FF", borderRadius:10, padding:"10px 14px", marginBottom:12,
                  border:"1px solid #9333EA20" }}>
                  <div style={{ fontSize:11, color:"#9333EA", fontWeight:600, marginBottom:8 }}>
                    📊 توزيع الأرباح على الشركاء
                  </div>
                  {[
                    {name:"إيهاب زيتوني", share:30, color:"#2563EB"},
                    {name:"نور إدوارد",   share:30, color:"#059669"},
                    {name:"محمد سالم",    share:30, color:"#7C3AED"},
                    {name:"أحمد سالم",    share:10, color:"#D97706"},
                  ].map(p => (
                    <div key={p.name} style={{ display:"flex", justifyContent:"space-between",
                      padding:"5px 0", borderBottom:"1px solid #E2E8F0" }}>
                      <span style={{ fontSize:13, color:"#1E293B", fontWeight:600 }}>{p.name}</span>
                      <span style={{ fontSize:13, color:p.color, fontWeight:700 }}>
                        {fmtD(Math.round(trAmtDin * p.share / 100))}
                        <span style={{ fontSize:10, color:"#64748B", marginRight:4 }}>({toAr(p.share)}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Lbl>التاريخ</Lbl>
              <Inp style={{ marginBottom:12 }} type="date" value={trForm.date} onChange={e => setTr("date")(e.target.value)}/>
              <Lbl>ملاحظة</Lbl>
              <Inp style={{ marginBottom:16 }} placeholder="مثال: أرباح مشروع بغداد..." value={trForm.note} onChange={e => setTr("note")(e.target.value)}/>
              <button onClick={saveTransfer} disabled={!trValid || saving} style={{
                width:"100%", border:"none", borderRadius:12, padding:"14px",
                fontSize:15, fontWeight:700, cursor: trValid ? "pointer" : "not-allowed", fontFamily:"Tahoma",
                background: trValid ? "#9333EA" : "#E2E8F0",
                color: trValid ? "#fff" : "#94A3B8",
              }}>{saving ? "جاري التحويل..." : "🔄 تأكيد التحويل والتوزيع"}</button>
            </>
          )}
        </div>
        )}

        {/* مشاريع الصندوق */}
        {tab === "projects" && (
          <ProjectsTab
            fund={fund}
            projects={projects}
            onAddProject={onAddProject}
            onOpenProject={onOpenProject}
          />
        )}

        {/* سجل المعاملات */}
        {tab === "tx" && (<>
          <div style={{ fontSize:14, fontWeight:700, color:"#1E293B", marginBottom:12 }}>
            سجل المعاملات ({toAr(txs.length)})
          </div>
          {txs.length === 0 ? (
            <div style={{ textAlign:"center", padding:30, color:"#94A3B8",
              background:"#fff", borderRadius:14, border:"1px solid #E2E8F0",
            }}>ما في معاملات بعد</div>
          ) : txs.map(t => (
            <div key={t.id} style={{ background:"#fff", border:"1px solid #E2E8F0",
              borderRadius:14, padding:"14px 16px", marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                <div>
                  <span style={{ fontSize:12, fontWeight:700, padding:"3px 10px",
                    borderRadius:20, marginBottom:6, display:"inline-block",
                    color: t.type==="إيداع"||t.type==="إيداع أرباح" ? "#16A34A" : "#DC2626",
                    background: t.type==="إيداع"||t.type==="إيداع أرباح" ? "#DCFCE7" : "#FEE2E2",
                  }}>
                    {t.type==="إيداع"||t.type==="إيداع أرباح" ? "↓" : "↑"} {t.type}
                  </span>
                  <div style={{ fontSize:12, color:"#64748B" }}>📅 {t.date}</div>
                  {t.note&&<div style={{ fontSize:12, color:"#1E293B", marginTop:4 }}>{t.note}</div>}
                </div>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontSize:17, fontWeight:700,
                    color: t.type==="إيداع"||t.type==="إيداع أرباح" ? "#16A34A" : "#DC2626" }}>
                    {t.type==="إيداع"||t.type==="إيداع أرباح" ? "+" : "-"}{fmt(t.amount, t.currency)}
                  </div>
                  {t.currency==="دولار"&&t.amtInDinar>0&&(
                    <div style={{ fontSize:11, color:"#2563EB", marginTop:2 }}>💱 {fmtD(t.amtInDinar)}</div>
                  )}
                  {t.balAfterDin!==undefined&&(
                    <div style={{ fontSize:11, color:"#64748B", marginTop:2 }}>رصيد: {fmtD(t.balAfterDin)}</div>
                  )}
                </div>
              </div>
              <button onClick={()=>onDelete(t)} style={{ background:"transparent", border:"none",
                color:"#DC2626", fontSize:12, cursor:"pointer", padding:"4px 0",
                fontWeight:600, fontFamily:"Tahoma" }}>🗑️ حذف</button>
            </div>
          ))}
        </>)}
      </div>
    </div>
  );
}

// ─── تبويب المشاريع داخل الصندوق ────────────────────────────
function ProjectsTab({ fund, projects, onAddProject, onOpenProject }) {
  const [showForm, setShowForm] = useState(false);
  const [name,     setName]     = useState("");
  const [note,     setNote]     = useState("");
  const [saving,   setSaving]   = useState(false);

  const save = async () => {
    if (!name.trim()||saving) return;
    setSaving(true);
    await onAddProject(name, note);
    setSaving(false);
    setName(""); setNote(""); setShowForm(false);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#1E293B" }}>
          مشاريع {fund?.name} ({projects.length})
        </div>
        <button onClick={()=>setShowForm(v=>!v)} style={{
          background:fund?.color||"#2563EB", border:"none", borderRadius:9,
          padding:"8px 14px", color:"#fff", cursor:"pointer",
          fontSize:13, fontFamily:"Tahoma", fontWeight:600 }}>
          {showForm?"✕ إلغاء":"+ مشروع جديد"}
        </button>
      </div>

      {showForm&&(
        <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:14,
          padding:16, marginBottom:14 }}>
          <Lbl>اسم المشروع</Lbl>
          <Inp style={{ marginBottom:10 }} placeholder="مثال: مشروع فيلا العميل..." value={name} onChange={e=>setName(e.target.value)} autoFocus/>
          <Lbl>ملاحظة</Lbl>
          <Inp style={{ marginBottom:14 }} placeholder="..." value={note} onChange={e=>setNote(e.target.value)}/>
          <button onClick={save} disabled={!name.trim()||saving} style={{
            width:"100%", border:"none", borderRadius:10, padding:"12px",
            fontSize:14, fontWeight:700, fontFamily:"Tahoma",
            background:name.trim()?(fund?.color||"#2563EB"):"#E2E8F0",
            color:name.trim()?"#fff":"#94A3B8", cursor:"pointer" }}>
            {saving?"جاري الحفظ...":"✅ إنشاء المشروع"}
          </button>
        </div>
      )}

      {projects.length===0
        ?<div style={{ textAlign:"center", padding:28, color:"#94A3B8",
          background:"#fff", borderRadius:14, border:"1px solid #E2E8F0" }}>
          ما في مشاريع بعد — اضغط "+ مشروع جديد"
        </div>
        :projects.map(p=>{
          const profDin = (p.recDin||0)-(p.spdDin||0);
          const profDol = (p.recDol||0)-(p.spdDol||0);
          const isActive = p.status==="نشط";
          return (
            <button key={p.id} onClick={()=>onOpenProject(p)} style={{
              width:"100%", background:"#fff", border:"1px solid #E2E8F0",
              borderRight:"4px solid "+(isActive?(fund?.color||"#2563EB"):"#94A3B8"),
              borderRadius:14, padding:"14px 16px", marginBottom:10,
              cursor:"pointer", textAlign:"right", fontFamily:"Tahoma" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#1E293B", marginBottom:4 }}>{p.name}</div>
                  <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20,
                    background:isActive?"#DCFCE7":"#F1F5F9",
                    color:isActive?"#16A34A":"#64748B" }}>
                    {isActive?"● نشط":"✓ منتهي"}
                  </span>
                  {p.note&&<div style={{ fontSize:11, color:"#64748B", marginTop:4 }}>{p.note}</div>}
                </div>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontSize:11, color:"#64748B", marginBottom:2 }}>الربح</div>
                  <div style={{ fontSize:16, fontWeight:700, color:profDin>=0?"#16A34A":"#DC2626" }}>
                    {profDin>=0?"+":"-"}{fmtD(Math.abs(profDin))}
                  </div>
                  {profDol!==0&&<div style={{ fontSize:12, color:"#2563EB", fontWeight:600 }}>
                    {profDol>=0?"+":"-"}{toAr(Math.abs(Math.round(profDol)))} $
                  </div>}
                </div>
              </div>
            </button>
          );
        })
      }
    </div>
  );
}

// ─── صفحة تفاصيل المشروع ─────────────────────────────────────
function ProjectDetail({ project, fund, allFunds, onBack, onAddTx, onClose, onDelete }) {
  const [proj,      setProj]     = useState(project);
  const [form,      setForm]     = useState({ type:"استلام", amount:"", currency:"دينار", exchRate:"", note:"", date:today() });
  const [saving,    setSaving]   = useState(false);
  const [done,      setDone]     = useState(false);
  const [showClose, setShowClose]= useState(false);
  const [dists,     setDists]    = useState([
    { fundId:"capital",  pct:0,  name:"صندوق رأس المال" },
    { fundId:"general",  pct:0,  name:"الصندوق العام" },
    { fundId:"partners", pct:100,name:"صندوق أرباح الشركاء" },
  ]);
  const [closing,   setClosing]  = useState(false);
  const [projTxs,   setProjTxs] = useState([]);

  const set = k => v => setForm(f=>({...f,[k]:v}));
  const amtN = Number(form.amount)||0;
  const isDol = form.currency==="دولار";
  const amtDin = isDol ? amtN*(Number(form.exchRate)||0) : amtN;

  // تحديث البيانات من Firebase عند التغيير
  useEffect(()=>{ setProj(project); },[project]);

  // تحميل حركات المشروع
  useEffect(()=>{
    const unsub = onSnapshot(
      query(collection(db,"fund_projects_txs"),orderBy("createdAt","desc")),
      snap=>{
        setProjTxs(snap.docs.map(d=>({id:d.id,...d.data()}))
          .filter(t=>t.projectId===project.id));
      }
    );
    return ()=>unsub();
  },[project.id]);

  const save = async () => {
    if(!amtN||saving) return;
    setSaving(true);
    await onAddTx(proj, form.type, form.amount, form.currency, form.exchRate, form.note, form.date);
    setSaving(false); setDone(true);
    setTimeout(()=>{setDone(false);setForm({type:"استلام",amount:"",currency:"دينار",exchRate:"",note:"",date:today()});},1400);
  };

  const totalPct = dists.reduce((s,d)=>s+Number(d.pct),0);
  const profitDin = (proj.recDin||0)-(proj.spdDin||0);
  const profitDol = (proj.recDol||0)-(proj.spdDol||0);

  const doClose = async () => {
    if(Math.round(totalPct)!==100){ alert("مجموع النسب يجب أن يكون 100%"); return; }
    setClosing(true);
    await onClose(proj, dists.map(d=>({fundId:d.fundId, pct:Number(d.pct)})));
    setClosing(false); setShowClose(false);
  };

  const isActive = proj.status==="نشط";

  return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9", fontFamily:"Tahoma", direction:"rtl" }}>
      <div style={{ maxWidth:640, margin:"0 auto", padding:"24px 16px" }}>

        <BackBtn onClick={onBack} label={"رجوع لـ "+fund?.name}/>

        {/* بطاقة المشروع */}
        <div style={{ background:"#fff", borderRadius:18, padding:20, marginBottom:14,
          border:"1px solid #E2E8F0", borderTop:"5px solid "+(fund?.color||"#2563EB"),
          boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:19, fontWeight:700, color:"#1E293B" }}>{proj.name}</div>
              <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, marginTop:4, display:"inline-block",
                background:isActive?"#DCFCE7":"#F1F5F9", color:isActive?"#16A34A":"#64748B" }}>
                {isActive?"● نشط":"✓ منتهي"}
              </span>
              {proj.note&&<div style={{ fontSize:12, color:"#64748B", marginTop:4 }}>{proj.note}</div>}
            </div>
            {isActive&&(
              <button onClick={()=>setShowClose(true)} style={{
                background:"#DC2626", border:"none", borderRadius:10, padding:"8px 14px",
                color:"#fff", cursor:"pointer", fontSize:13, fontFamily:"Tahoma", fontWeight:700 }}>
                🏁 إنهاء المشروع
              </button>
            )}
          </div>

          {/* إجماليات */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            <div style={{ background:"#F0FDF4", borderRadius:12, padding:"12px" }}>
              <div style={{ fontSize:10, color:"#64748B", marginBottom:4 }}>↓ إجمالي الاستلام</div>
              <div style={{ fontSize:15, fontWeight:700, color:"#16A34A" }}>{fmtD(proj.recDin||0)}</div>
              {(proj.recDol||0)>0&&<div style={{ fontSize:12, color:"#2563EB" }}>{toAr(Math.round(proj.recDol))} $</div>}
            </div>
            <div style={{ background:"#FFF1F2", borderRadius:12, padding:"12px" }}>
              <div style={{ fontSize:10, color:"#64748B", marginBottom:4 }}>↑ إجمالي المصروف</div>
              <div style={{ fontSize:15, fontWeight:700, color:"#DC2626" }}>{fmtD(proj.spdDin||0)}</div>
              {(proj.spdDol||0)>0&&<div style={{ fontSize:12, color:"#DC2626" }}>{toAr(Math.round(proj.spdDol))} $</div>}
            </div>
          </div>

          {/* الربح */}
          <div style={{ background:profitDin>=0?"#EFF6FF":"#FFF1F2", borderRadius:12, padding:"12px",
            border:"1.5px solid "+(profitDin>=0?"#2563EB40":"#DC262640") }}>
            <div style={{ fontSize:10, color:"#64748B", marginBottom:4 }}>💰 صافي الربح</div>
            <div style={{ fontSize:20, fontWeight:700, color:profitDin>=0?"#2563EB":"#DC2626" }}>
              {profitDin>=0?"+":"-"}{fmtD(Math.abs(profitDin))}
            </div>
            {profitDol!==0&&<div style={{ fontSize:14, color:"#2563EB", fontWeight:600 }}>
              {profitDol>=0?"+":"-"}{toAr(Math.abs(Math.round(profitDol)))} $
            </div>}
          </div>
        </div>

        {/* نموذج الحركة */}
        {isActive&&(
        <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:16, padding:18, marginBottom:14 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#1E293B", marginBottom:14 }}>إضافة حركة مالية</div>
          {done?(
            <div style={{ textAlign:"center", padding:"14px 0" }}>
              <div style={{ fontSize:36 }}>✅</div>
              <div style={{ fontWeight:700, color:"#16A34A", marginTop:6 }}>تم التسجيل</div>
            </div>
          ):(
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                {["استلام","صرف"].map(t=>(
                  <button key={t} onClick={()=>set("type")(t)} style={{
                    padding:"11px", borderRadius:10, cursor:"pointer",
                    fontFamily:"Tahoma", fontSize:14, fontWeight:700,
                    border:"1.5px solid "+(form.type===t?(t==="استلام"?"#16A34A":"#DC2626"):"#E2E8F0"),
                    background:form.type===t?(t==="استلام"?"#F0FDF4":"#FFF1F2"):"transparent",
                    color:form.type===t?(t==="استلام"?"#16A34A":"#DC2626"):"#64748B" }}>
                    {t==="استلام"?"↓ استلام":"↑ صرف"}
                  </button>
                ))}
              </div>
              <Lbl>المبلغ والعملة</Lbl>
              <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                <Inp style={{ flex:2, fontSize:20, fontWeight:700, textAlign:"center" }}
                  type="number" placeholder="٠" value={form.amount}
                  onChange={e=>set("amount")(e.target.value)} autoFocus/>
                <CurrencySelect value={form.currency} onChange={e=>set("currency")(e.target.value)}/>
              </div>
              {isDol&&(
                <>
                  <Lbl>سعر الصرف</Lbl>
                  <Inp style={{ marginBottom:6 }} type="number" placeholder="مثال: 1480"
                    value={form.exchRate} onChange={e=>set("exchRate")(e.target.value)}/>
                  {amtN>0&&Number(form.exchRate)>0&&(
                    <div style={{ fontSize:12, color:"#2563EB", fontWeight:600, marginBottom:8,
                      padding:"7px 12px", background:"#EFF6FF", borderRadius:8 }}>
                      💱 يعادل: {fmtD(amtDin)}
                    </div>
                  )}
                </>
              )}
              <Lbl>التاريخ</Lbl>
              <Inp style={{ marginBottom:10 }} type="date" value={form.date} onChange={e=>set("date")(e.target.value)}/>
              <Lbl>ملاحظة</Lbl>
              <Inp style={{ marginBottom:14 }} placeholder="..." value={form.note} onChange={e=>set("note")(e.target.value)}/>
              <button onClick={save} disabled={!amtN||saving} style={{
                width:"100%", border:"none", borderRadius:12, padding:"13px",
                fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Tahoma",
                background:amtN?(form.type==="استلام"?"#16A34A":"#DC2626"):"#E2E8F0",
                color:amtN?"#fff":"#94A3B8" }}>
                {saving?"جاري الحفظ...":(form.type==="استلام"?"↓ تأكيد الاستلام":"↑ تأكيد الصرف")}
              </button>
            </>
          )}
        </div>
        )}

        {/* سجل الحركات */}
        <div style={{ fontSize:14, fontWeight:700, color:"#1E293B", marginBottom:10 }}>
          سجل الحركات ({projTxs.length})
        </div>
        {projTxs.length===0
          ?<div style={{ textAlign:"center", padding:24, color:"#94A3B8", background:"#fff",
            borderRadius:12, border:"1px solid #E2E8F0" }}>ما في حركات بعد</div>
          :projTxs.map(t=>{
            const isIn=t.type==="استلام";
            return (
              <div key={t.id} style={{ background:"#fff", borderRadius:12, padding:"12px 14px",
                marginBottom:8, border:"1px solid "+(isIn?"#DCFCE7":"#FEE2E2"),
                borderRight:"4px solid "+(isIn?"#16A34A":"#DC2626") }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <span style={{ fontSize:11, fontWeight:700,
                      color:isIn?"#16A34A":"#DC2626" }}>{isIn?"↓ استلام":"↑ صرف"}</span>
                    <div style={{ fontSize:11, color:"#64748B", marginTop:2 }}>📅 {t.date}</div>
                    {t.note&&<div style={{ fontSize:12, color:"#1E293B", marginTop:2 }}>{t.note}</div>}
                  </div>
                  <div style={{ textAlign:"left" }}>
                    <div style={{ fontSize:16, fontWeight:700, color:isIn?"#16A34A":"#DC2626" }}>
                      {isIn?"+":"-"}{fmt(t.amount,t.currency)}
                    </div>
                    {t.currency==="دولار"&&t.amtInDinar>0&&(
                      <div style={{ fontSize:11, color:"#2563EB" }}>💱 {fmtD(t.amtInDinar)}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        }

        {/* نافذة إنهاء المشروع */}
        {showClose&&(
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:999,
            display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
            <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:520,
              maxHeight:"90vh", overflow:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
              <div style={{ padding:"18px 20px", borderBottom:"1px solid #E2E8F0",
                display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:16, fontWeight:700, color:"#DC2626" }}>🏁 إنهاء المشروع وتوزيع الأرباح</div>
                <button onClick={()=>setShowClose(false)} style={{ background:"none", border:"none",
                  fontSize:18, cursor:"pointer", color:"#64748B" }}>✕</button>
              </div>
              <div style={{ padding:"16px 20px" }}>
                {/* عرض الربح */}
                <div style={{ background:"#F0FDF4", borderRadius:12, padding:"14px", marginBottom:16 }}>
                  <div style={{ fontSize:12, color:"#64748B", marginBottom:4 }}>الربح الكلي للتوزيع</div>
                  <div style={{ fontSize:22, fontWeight:700, color:"#16A34A" }}>{fmtD(profitDin)}</div>
                  {profitDol!==0&&<div style={{ fontSize:14, color:"#2563EB", fontWeight:600 }}>{toAr(Math.round(Math.abs(profitDol)))} $</div>}
                </div>

                <div style={{ fontSize:13, color:"#64748B", marginBottom:12 }}>
                  حدد نسبة كل صندوق من الربح (المجموع = 100%)
                </div>

                {dists.map((d,i)=>(
                  <div key={d.fundId} style={{ display:"flex", alignItems:"center", gap:10,
                    marginBottom:10, background:"#F8FAFC", borderRadius:10, padding:"10px 12px" }}>
                    <div style={{ flex:1, fontSize:13, fontWeight:600, color:"#1E293B" }}>{d.name}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <input type="number" min="0" max="100" value={d.pct}
                        onChange={e=>{
                          const v=[...dists];
                          v[i]={...v[i],pct:Number(e.target.value)};
                          setDists(v);
                        }}
                        style={{ width:60, border:"1px solid #E2E8F0", borderRadius:8,
                          padding:"6px 8px", fontSize:15, fontWeight:700, textAlign:"center",
                          outline:"none", fontFamily:"Tahoma" }}/>
                      <span style={{ fontSize:13, color:"#64748B" }}>%</span>
                    </div>
                    <div style={{ fontSize:12, color:"#16A34A", fontWeight:600, minWidth:80, textAlign:"left" }}>
                      {fmtD(Math.round(profitDin*d.pct/100))}
                    </div>
                  </div>
                ))}

                {/* إضافة صندوق */}
                <div style={{ marginBottom:14 }}>
                  <select onChange={e=>{
                    if(!e.target.value) return;
                    const f=allFunds.find(x=>x.id===e.target.value);
                    if(f&&!dists.find(d=>d.fundId===f.id)){
                      setDists(prev=>[...prev,{fundId:f.id,pct:0,name:f.name}]);
                    }
                    e.target.value="";
                  }} style={{ width:"100%", border:"1px solid #E2E8F0", borderRadius:9,
                    padding:"9px 12px", fontSize:13, fontFamily:"Tahoma", color:"#64748B",
                    background:"#F8FAFC", outline:"none" }}>
                    <option value="">+ أضف صندوقاً للتوزيع</option>
                    {allFunds.filter(f=>!dists.find(d=>d.fundId===f.id)).map(f=>(
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                {/* مجموع النسب */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"10px 14px", borderRadius:10, marginBottom:16,
                  background:Math.round(totalPct)===100?"#F0FDF4":"#FFF1F2" }}>
                  <span style={{ fontSize:13, fontWeight:600, color:"#1E293B" }}>المجموع</span>
                  <span style={{ fontSize:18, fontWeight:700,
                    color:Math.round(totalPct)===100?"#16A34A":"#DC2626" }}>
                    {totalPct}%
                  </span>
                </div>

                <button onClick={doClose} disabled={Math.round(totalPct)!==100||closing} style={{
                  width:"100%", border:"none", borderRadius:12, padding:"14px",
                  fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"Tahoma",
                  background:Math.round(totalPct)===100?"#DC2626":"#E2E8F0",
                  color:Math.round(totalPct)===100?"#fff":"#94A3B8" }}>
                  {closing?"جاري التوزيع...":"🏁 تأكيد إنهاء المشروع وتوزيع الأرباح"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── صفحة أرباح الشركاء ─────────────────────────────────────
function PartnersPage({ partners, balances, txs, onBack, onDeposit, onWithdraw, onDelete }) {
  const [selP,    setSelP]   = useState(null);
  const [form,    setForm]   = useState({ amount:"", note:"", date:today() });
  const [saving,  setSaving] = useState(false);
  const [done,    setDone]   = useState(false);
  const [preview, setPreview]= useState(false);

  const set       = k => v => setForm(f => ({ ...f, [k]: v }));
  const totalMain = balances["partners"] || 0;

  const resetForm = () => {
    setForm({ amount:"", note:"", date:today() });
    setDone(false);
  };

  const handleDeposit = async () => {
    if (!form.amount || Number(form.amount) <= 0) return;
    setSaving(true);
    await onDeposit(form.amount, form.note, form.date);
    setSaving(false);
    setDone(true);
    setTimeout(resetForm, 1600);
  };

  const [wCurrency, setWCurrency] = useState("دينار");
  const [wExchRate, setWExchRate] = useState("");

  const handleWithdraw = async () => {
    if (!form.amount || Number(form.amount) <= 0) return;
    setSaving(true);
    const ok = await onWithdraw(selP.id, form.amount, wCurrency, wExchRate, form.note, form.date);
    setSaving(false);
    if (ok) { setDone(true); setTimeout(resetForm, 1600); }
  };

  // ── صفحة شريك ──────────────────────────────────────────
  if (selP) {
    const p        = selP;
    const pId      = "partner_" + p.id;
    const pBal     = balances[pId] || { din:0, dol:0 };
    const availDin = pBal.din || 0;
    const availDol = pBal.dol || 0;
    const wAmtN    = Number(form.amount) || 0;
    const isDolW   = wCurrency === "دولار";
    const avail    = isDolW ? availDol : availDin;
    const allTxs   = txs.filter(t => t.fundId === pId).sort((a, b) => b.date.localeCompare(a.date));
    const deposits  = allTxs.filter(t => t.type === "إيداع");
    const withdraws = allTxs.filter(t => t.type === "سحب");
    const totInDin  = deposits.reduce((s, t) => s + (t.amtInDinar || t.amount), 0);
    const totOutDin = withdraws.reduce((s, t) => s + (t.amtInDinar || t.amount), 0);

    const buildHtml = () => {
      let rows = "";
      allTxs.forEach(t => {
        const isIn = t.type === "إيداع";
        rows += "<tr>"
          + "<td style='padding:8px 12px;border-bottom:1px solid #E2E8F0'>" + t.date + "</td>"
          + "<td style='padding:8px 12px;border-bottom:1px solid #E2E8F0'>" + (t.isDistribution ? "توزيع أرباح" : t.type) + "</td>"
          + "<td style='padding:8px 12px;border-bottom:1px solid #E2E8F0;color:" + (isIn ? "#16A34A" : "#DC2626") + ";font-weight:700'>"
          + (isIn ? "+" : "-") + arNum(t.amount) + " د.ع</td>"
          + "<td style='padding:8px 12px;border-bottom:1px solid #E2E8F0;font-size:12px'>" + (t.note || "—") + "</td>"
          + "</tr>";
      });
      return "<!DOCTYPE html><html dir='rtl' lang='ar'><head><meta charset='UTF-8'/>"
        + "<title>كشف حساب — " + p.name + "</title>"
        + "<style>"
        + "body{font-family:Tahoma,Arial;padding:28px;direction:rtl;color:#1E293B;background:#fff;margin:0}"
        + ".co{text-align:center;padding-bottom:14px;margin-bottom:18px;border-bottom:3px solid " + p.color + "}"
        + ".co-name{font-size:22px;font-weight:700;color:#1E293B;margin-bottom:4px}"
        + ".co-addr{font-size:12px;color:#64748B}"
        + ".hdr{display:flex;justify-content:space-between;align-items:center;"
        + "background:#F8FAFC;border-radius:10px;padding:14px 16px;"
        + "margin-bottom:18px;border:1px solid #E2E8F0}"
        + ".pname{font-size:18px;font-weight:700;color:" + p.color + "}"
        + ".cards{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px}"
        + ".card{border:1px solid #E2E8F0;border-radius:10px;padding:12px;text-align:center}"
        + ".card-l{font-size:11px;color:#64748B;margin-bottom:4px}"
        + ".card-v{font-size:18px;font-weight:700}"
        + "table{width:100%;border-collapse:collapse;font-size:13px}"
        + "th{background:" + p.color + ";color:#fff;padding:10px 12px;text-align:right;font-weight:700}"
        + "tr:nth-child(even){background:#F8FAFC}"
        + "tfoot td{font-weight:700;background:#F1F5F9;padding:10px 12px}"
        + ".ftr{margin-top:20px;padding-top:12px;border-top:1px solid #E2E8F0;"
        + "display:flex;justify-content:space-between;font-size:11px;color:#94A3B8}"
        + "@media print{body{padding:16px}}</style></head><body>"
        + "<div class='co'>"
        + "<div style='font-size:22px;font-weight:700;color:#1E293B'>" + COMPANY.name + "</div>"
        + "<div class='co-addr'>" + COMPANY.address + "</div></div>"
        + "<div class='hdr'>"
        + "<div><div class='pname'>" + p.name + "</div>"
        + "<div style='font-size:12px;color:#64748B'>حصة " + p.share + "% من الأرباح</div></div>"
        + "<div style='font-size:12px;color:#64748B'>تاريخ الكشف: " + new Date().toLocaleDateString("ar-IQ") + "</div></div>"
        + "<div class='cards'>"
        + "<div class='card'><div class='card-l'>↓ إجمالي الإيداع</div>"
        + "<div class='card-v' style='color:#16A34A'>" + arNum(totIn) + " د.ع</div></div>"
        + "<div class='card'><div class='card-l'>↑ إجمالي السحب</div>"
        + "<div class='card-v' style='color:#DC2626'>" + arNum(totOut) + " د.ع</div></div>"
        + "<div class='card' style='border-color:" + p.color + ";border-width:2px'>"
        + "<div class='card-l'>الرصيد المتاح</div>"
        + "<div class='card-v' style='color:" + p.color + "'>" + arNum(pBal) + " د.ع</div></div></div>"
        + "<table><thead><tr>"
        + "<th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>ملاحظة</th>"
        + "</tr></thead><tbody>" + rows + "</tbody>"
        + "<tfoot><tr><td colspan='2'>إجمالي السحوبات</td>"
        + "<td style='color:#DC2626'>" + arNum(totOut) + " د.ع</td><td></td></tr></tfoot>"
        + "</table>"
        + "<div class='ftr'>"
        + "<span>" + COMPANY.name + "</span>"
        + "<span>" + COMPANY.address + "</span></div>"
        + "</body></html>";
    };

    const printStatement = () => {
      const w = window.open("", "_blank");
      w.document.write(buildHtml());
      w.document.close();
      setTimeout(() => w.print(), 500);
    };

    return (
      <div style={{ minHeight:"100vh", background:"#F1F5F9", fontFamily:"Tahoma", direction:"rtl" }}>
        <div style={{ maxWidth:640, margin:"0 auto", padding:"24px 16px" }}>

          <BackBtn onClick={() => { setSelP(null); resetForm(); }} label="رجوع للشركاء"/>

          {/* بطاقة الشريك */}
          <div style={{
            background:"#fff", borderRadius:18, padding:20, marginBottom:14,
            border:"1px solid #E2E8F0", borderTop:"5px solid " + p.color,
            boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{
                  width:50, height:50, borderRadius:14, background:p.light,
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  <i className="ti ti-user" style={{ fontSize:26, color:p.color }} aria-hidden="true"/>
                </div>
                <div>
                  <div style={{ fontSize:19, fontWeight:700, color:"#1E293B" }}>{p.name}</div>
                  <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>حصة {toAr(p.share)}%</div>
                </div>
              </div>
              <button onClick={() => setPreview(true)} style={{
                background:p.color, border:"none", borderRadius:10,
                padding:"9px 16px", color:"#fff", cursor:"pointer",
                fontSize:13, fontFamily:"Tahoma",
                display:"flex", alignItems:"center", gap:6, fontWeight:600,
              }}>
                <i className="ti ti-eye" style={{ fontSize:16 }} aria-hidden="true"/>
                معاينة وطباعة
              </button>
            </div>

            {/* الأرقام — دينار + دولار */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              <div style={{ background:"#F0FDF4", borderRadius:12, padding:"12px", textAlign:"center" }}>
                <div style={{ fontSize:10, color:"#64748B", marginBottom:4 }}>↓ إيداع (دينار)</div>
                <div style={{ fontSize:14, fontWeight:700, color:"#16A34A" }}>{fmtD(totInDin)}</div>
              </div>
              <div style={{ background:"#FFF1F2", borderRadius:12, padding:"12px", textAlign:"center" }}>
                <div style={{ fontSize:10, color:"#64748B", marginBottom:4 }}>↑ سحب (دينار)</div>
                <div style={{ fontSize:14, fontWeight:700, color:"#DC2626" }}>{fmtD(totOutDin)}</div>
              </div>
              <div style={{ background:p.light, borderRadius:12, padding:"12px", textAlign:"center",
                border:"1.5px solid " + p.color + "40" }}>
                <div style={{ fontSize:10, color:"#64748B", marginBottom:4 }}>الرصيد المتاح</div>
                <div style={{ fontSize:14, fontWeight:700, color:availDin>=0?p.color:"#DC2626" }}>{fmtD(availDin)}</div>
              </div>
            </div>
            {/* رصيد الدولار */}
            {availDol !== 0 && (
              <div style={{ marginTop:10, background:"#EFF6FF", borderRadius:12,
                padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:12, color:"#2563EB", fontWeight:600 }}>🇺🇸 رصيد الدولار</div>
                <div style={{ fontSize:18, fontWeight:700, color:"#2563EB" }}>
                  {toAr(Math.round(Math.abs(availDol)))} $
                </div>
              </div>
            )}
          </div>

          {/* نموذج السحب */}
          <div style={{
            background:"#fff", borderRadius:16, padding:18, marginBottom:14,
            border:"1px solid #E2E8F0",
          }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#1E293B", marginBottom:14 }}>↑ سحب من الصندوق</div>
            {done ? (
              <div style={{ textAlign:"center", padding:"16px 0" }}>
                <div style={{ fontSize:36 }}>✅</div>
                <div style={{ fontWeight:700, color:"#16A34A", marginTop:6 }}>تم السحب بنجاح</div>
              </div>
            ) : (
              <>
                {/* العملة */}
                <Lbl>العملة</Lbl>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                  {["دينار","دولار"].map(c => (
                    <button key={c} onClick={() => setWCurrency(c)} style={{
                      padding:"10px", borderRadius:10, cursor:"pointer",
                      fontFamily:"Tahoma", fontSize:13, fontWeight:700,
                      border:"1.5px solid " + (wCurrency===c ? p.color : "#E2E8F0"),
                      background: wCurrency===c ? p.light : "transparent",
                      color: wCurrency===c ? p.color : "#64748B",
                    }}>
                      {c === "دينار" ? "🇮🇶 دينار" : "🇺🇸 دولار"}
                      <div style={{ fontSize:10, marginTop:2, color:"#64748B" }}>
                        متاح: {c==="دينار" ? fmtD(availDin) : toAr(Math.round(availDol))+" $"}
                      </div>
                    </button>
                  ))}
                </div>

                <Lbl>المبلغ</Lbl>
                <Inp style={{ fontSize:22, fontWeight:700, textAlign:"center", marginBottom:8 }}
                  type="number" placeholder="٠"
                  value={form.amount} onChange={e => set("amount")(e.target.value)} autoFocus/>

                {isDolW && (
                  <>
                    <Lbl>سعر الصرف (للاحتساب)</Lbl>
                    <Inp style={{ marginBottom:8 }} type="number" placeholder="مثال: 1480"
                      value={wExchRate} onChange={e => setWExchRate(e.target.value)}/>
                  </>
                )}

                {wAmtN > 0 && (
                  <>
                    <div style={{ fontSize:13, color:p.color, fontWeight:600,
                      marginBottom:8, padding:"8px 12px", background:p.light,
                      borderRadius:8, border:"1px solid " + p.color + "30" }}>
                      ✍️ {numToWords(wAmtN)} {isDolW ? "دولار" : "دينار"}
                    </div>
                    <div style={{ fontSize:12, marginBottom:10, padding:"7px 12px",
                      borderRadius:8, fontWeight:600,
                      color: wAmtN <= avail ? "#16A34A" : "#DC2626",
                      background: wAmtN <= avail ? "#F0FDF4" : "#FFF1F2" }}>
                      {wAmtN <= avail
                        ? "✅ الرصيد كافٍ"
                        : "⚠️ تجاوز الرصيد — المتاح: " + (isDolW ? toAr(Math.round(availDol))+" $" : fmtD(availDin))}
                    </div>
                  </>
                )}

                <Lbl>التاريخ</Lbl>
                <Inp style={{ marginBottom:10 }} type="date" value={form.date} onChange={e => set("date")(e.target.value)}/>
                <Lbl>ملاحظة</Lbl>
                <Inp style={{ marginBottom:14 }} placeholder="سبب السحب..." value={form.note} onChange={e => set("note")(e.target.value)}/>
                <button onClick={handleWithdraw}
                  disabled={!form.amount || saving || wAmtN > avail} style={{
                  width:"100%", border:"none", borderRadius:12, padding:"13px",
                  fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"Tahoma",
                  background: wAmtN > 0 && wAmtN <= avail ? p.color : "#E2E8F0",
                  color: wAmtN > 0 && wAmtN <= avail ? "#fff" : "#94A3B8",
                }}>{saving ? "جاري السحب..." : "↑ تأكيد السحب"}</button>
              </>
            )}
          </div>

          {/* سجل السحوبات */}
          <div style={{ fontSize:14, fontWeight:700, color:"#DC2626", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:3, height:16, background:"#DC2626", borderRadius:2 }}/>
            السحوبات ({toAr(withdraws.length)})
          </div>
          {withdraws.length === 0
            ? <div style={{ background:"#fff", borderRadius:12, padding:18, textAlign:"center", color:"#94A3B8", border:"1px solid #E2E8F0", marginBottom:14 }}>ما في سحوبات بعد</div>
            : withdraws.map(t => (
              <div key={t.id} style={{ background:"#fff", borderRadius:12, padding:"13px 16px", marginBottom:8, border:"1px solid #FEE2E2", borderRight:"4px solid #DC2626" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#1E293B", marginBottom:3 }}>{t.note || "سحب"}</div>
                    <div style={{ fontSize:11, color:"#64748B" }}>📅 {t.date}</div>
                  </div>
                  <div style={{ fontSize:18, fontWeight:700, color:"#DC2626" }}>-{fmtD(t.amount)}</div>
                </div>
              </div>
            ))
          }

          {/* سجل الإيداعات */}
          <div style={{ fontSize:14, fontWeight:700, color:"#16A34A", marginBottom:10, marginTop:16, display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:3, height:16, background:"#16A34A", borderRadius:2 }}/>
            الإيداعات ({toAr(deposits.length)})
          </div>
          {deposits.length === 0
            ? <div style={{ background:"#fff", borderRadius:12, padding:18, textAlign:"center", color:"#94A3B8", border:"1px solid #E2E8F0" }}>ما في إيداعات بعد</div>
            : deposits.map(t => (
              <div key={t.id} style={{ background:"#fff", borderRadius:12, padding:"13px 16px", marginBottom:8, border:"1px solid #DCFCE7", borderRight:"4px solid #16A34A" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#1E293B", marginBottom:3 }}>
                      {t.isDistribution ? "توزيع أرباح تلقائي" : t.note || "إيداع"}
                    </div>
                    <div style={{ fontSize:11, color:"#64748B" }}>📅 {t.date}</div>
                    {t.note && t.isDistribution && <div style={{ fontSize:11, color:"#64748B", marginTop:2 }}>{t.note}</div>}
                  </div>
                  <div style={{ fontSize:18, fontWeight:700, color:"#16A34A" }}>+{fmtD(t.amount)}</div>
                </div>
              </div>
            ))
          }

          {/* نافذة المعاينة */}
          {preview && (
            <div style={{
              position:"fixed", inset:0, background:"rgba(0,0,0,0.55)",
              zIndex:999, display:"flex", alignItems:"center",
              justifyContent:"center", padding:16,
            }}>
              <div style={{
                background:"#fff", borderRadius:20, width:"100%",
                maxWidth:700, maxHeight:"92vh",
                display:"flex", flexDirection:"column", overflow:"hidden",
                boxShadow:"0 20px 60px rgba(0,0,0,0.3)",
              }}>
                <div style={{
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"14px 18px", borderBottom:"1px solid #E2E8F0",
                }}>
                  <div style={{ fontSize:15, fontWeight:700, color:"#1E293B" }}>معاينة كشف الحساب</div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={printStatement} style={{
                      background:p.color, border:"none", borderRadius:9,
                      padding:"8px 16px", color:"#fff", cursor:"pointer",
                      fontSize:13, fontFamily:"Tahoma",
                      display:"flex", alignItems:"center", gap:6, fontWeight:600,
                    }}>
                      <i className="ti ti-printer" style={{ fontSize:15 }} aria-hidden="true"/>
                      طباعة
                    </button>
                    <button onClick={() => setPreview(false)} style={{
                      background:"#F1F5F9", border:"none", borderRadius:9,
                      padding:"8px 14px", color:"#64748B", cursor:"pointer",
                      fontSize:13, fontFamily:"Tahoma",
                    }}>✕ إغلاق</button>
                  </div>
                </div>
                <div style={{ flex:1, overflow:"auto" }}>
                  <iframe srcDoc={buildHtml()} style={{ width:"100%", height:"580px", border:"none" }} title="معاينة"/>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ── قائمة الشركاء الرئيسية ────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9", fontFamily:"Tahoma", direction:"rtl" }}>
      <div style={{ maxWidth:640, margin:"0 auto", padding:"24px 16px" }}>

        <BackBtn onClick={onBack} label="رجوع للصناديق"/>

        {/* إجمالي */}
        <div style={{
          background:"#fff", borderRadius:16, padding:"18px 20px", marginBottom:20,
          border:"1px solid #E2E8F0",
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#1E293B" }}>صندوق أرباح الشركاء</div>
          <div style={{ fontSize:22, fontWeight:700, color:"#9333EA" }}>{fmtD(totalMain)}</div>
        </div>

        {/* نموذج الإيداع والتوزيع */}
        <div style={{ background:"#fff", borderRadius:16, padding:18, marginBottom:20, border:"1px solid #E2E8F0" }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#1E293B", marginBottom:8 }}>↓ إيداع وتوزيع على الشركاء</div>
          <div style={{
            fontSize:12, color:"#64748B", marginBottom:14,
            background:"#F0FDF4", borderRadius:8, padding:"8px 12px",
          }}>
            💡 يتوزع تلقائياً حسب حصة كل شريك
          </div>
          {done ? (
            <div style={{ textAlign:"center", padding:"14px 0" }}>
              <div style={{ fontSize:36 }}>✅</div>
              <div style={{ fontWeight:700, color:"#16A34A", marginTop:6 }}>تم الإيداع والتوزيع</div>
            </div>
          ) : (
            <>
              <Lbl>المبلغ الكلي</Lbl>
              <Inp
                style={{ fontSize:20, fontWeight:700, textAlign:"center", marginBottom:10 }}
                type="number" placeholder="٠"
                value={form.amount} onChange={e => set("amount")(e.target.value)}
              />
              {Number(form.amount) > 0 && (
                <div style={{ background:"#F8FAFC", borderRadius:10, padding:"10px 14px", marginBottom:10 }}>
                  {partners.map(p => (
                    <div key={p.id} style={{
                      display:"flex", justifyContent:"space-between", alignItems:"center",
                      padding:"6px 0", borderBottom:"1px solid #E2E8F0",
                    }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:p.color }}/>
                        <span style={{ fontSize:13, color:"#1E293B", fontWeight:600 }}>{p.name}</span>
                        <span style={{ fontSize:11, color:"#64748B" }}>({toAr(p.share)}%)</span>
                      </div>
                      <span style={{ fontSize:14, color:p.color, fontWeight:700 }}>
                        {fmtD(Math.round(Number(form.amount) * p.share / 100))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Lbl>التاريخ</Lbl>
              <Inp style={{ marginBottom:10 }} type="date" value={form.date} onChange={e => set("date")(e.target.value)}/>
              <Lbl>ملاحظة</Lbl>
              <Inp style={{ marginBottom:14 }} placeholder="مثال: أرباح مشروع X..." value={form.note} onChange={e => set("note")(e.target.value)}/>
              <button onClick={handleDeposit} disabled={!form.amount || saving} style={{
                width:"100%", border:"none", borderRadius:12, padding:"13px",
                fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"Tahoma",
                background: Number(form.amount) > 0 ? "#9333EA" : "#E2E8F0",
                color:      Number(form.amount) > 0 ? "#fff"    : "#94A3B8",
              }}>
                {saving ? "جاري التوزيع..." : "↓ تأكيد الإيداع والتوزيع"}
              </button>
            </>
          )}
        </div>

        {/* بطاقات الشركاء */}
        <div style={{ fontSize:15, fontWeight:700, color:"#1E293B", marginBottom:12 }}>
          اضغط على شريك لعرض صندوقه
        </div>
        {partners.map(p => {
          const pId    = "partner_" + p.id;
          const pBal   = balances[pId] || { din:0, dol:0 };
          const pDin   = pBal.din || 0;
          const pDol   = pBal.dol || 0;
          const totOut = txs.filter(t => t.fundId===pId && t.type==="سحب").reduce((s,t)=>s+(t.amtInDinar||t.amount),0);
          const totIn  = txs.filter(t => t.fundId===pId && t.type==="إيداع").reduce((s,t)=>s+(t.amtInDinar||t.amount),0);
          const wCount = txs.filter(t => t.fundId===pId && t.type==="سحب").length;
          return (
            <button key={p.id}
              onClick={() => { setSelP(p); resetForm(); }}
              style={{
                width:"100%", background:"#fff", border:"1px solid #E2E8F0",
                borderRight:"5px solid " + p.color,
                borderRadius:16, padding:18, marginBottom:12,
                cursor:"pointer", textAlign:"right", fontFamily:"Tahoma",
                boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
                transition:"box-shadow 0.15s, transform 0.12s",
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,0.08)"; e.currentTarget.style.transform="translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.04)"; e.currentTarget.style.transform="none"; }}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:13, background:p.light,
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <i className="ti ti-user" style={{ fontSize:22, color:p.color }} aria-hidden="true"/>
                  </div>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700, color:"#1E293B" }}>{p.name}</div>
                    <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>
                      حصة {p.share}% · {wCount} سحبة
                    </div>
                  </div>
                </div>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontSize:18, fontWeight:700, color:pDin>=0?p.color:"#DC2626" }}>{fmtD(pDin)}</div>
                  {pDol!==0&&<div style={{ fontSize:13, fontWeight:700, color:"#2563EB" }}>{toAr(Math.round(Math.abs(pDol)))} $</div>}
                  <div style={{ fontSize:11, color:"#64748B", marginTop:2 }}>{pDin>=0?"متاح للسحب":"سالب"}</div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div style={{ background:"#F0FDF4", borderRadius:10, padding:"8px 12px" }}>
                  <div style={{ fontSize:10, color:"#64748B", marginBottom:2 }}>↓ إجمالي الإيداع</div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#16A34A" }}>{fmtD(totIn)}</div>
                </div>
                <div style={{ background:"#FFF1F2", borderRadius:10, padding:"8px 12px" }}>
                  <div style={{ fontSize:10, color:"#64748B", marginBottom:2 }}>↑ إجمالي السحب</div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#DC2626" }}>{fmtD(totOut)}</div>
                </div>
              </div>
            </button>
          );
          );
        })}
      </div>
    </div>
  );
}
