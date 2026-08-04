import React, { useState, useEffect } from "react";
import App2 from "./App2";
import { ForemanSystem } from "./App6";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot,
  deleteDoc, doc, updateDoc, setDoc, query, where, getDocs, getDoc } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyCBGovCJ_Bx64dOjC0UWzJsBPgXEuJaizI",
  authDomain: "bab-projects-b7d04.firebaseapp.com",
  projectId: "bab-projects-b7d04",
  storageBucket: "bab-projects-b7d04.firebasestorage.app",
  messagingSenderId: "982434748534",
  appId: "1:982434748534:web:ca0e52ef0115ecfc346757"
});
const db = getFirestore(app);

function w2(n) {
  const x = Math.floor(Math.abs(Number(n) || 0));
  if (!x) return "صفر";
  const o = ["","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة",
    "عشرة","أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر",
    "ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"];
  const t2 = ["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"];
  const h = ["","مئة","مئتان","ثلاثمئة","أربعمئة","خمسمئة","ستمئة","سبعمئة","ثمانمئة","تسعمئة"];
  const g = v => {
    if (!v) return "";
    if (v < 20) return o[v];
    if (v < 100) return t2[Math.floor(v/10)] + (v%10 ? " و" + o[v%10] : "");
    return h[Math.floor(v/100)] + (v%100 ? " و" + g(v%100) : "");
  };
  const p = [];
  if (x >= 1e9) p.push(g(Math.floor(x/1e9)) + " مليار");
  if (x%1e9 >= 1e6) p.push(g(Math.floor(x%1e9/1e6)) + " مليون");
  if (x%1e6 >= 1e3) p.push(g(Math.floor(x%1e6/1e3)) + " ألف");
  if (x%1e3) p.push(g(x%1e3));
  return p.join(" و");
}

const fNum = n => {
  const s = String(Math.round(Math.abs(Number(n) || 0)));
  let r = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) r += ",";
    r += s[i];
  }
  return r;
};

const PASS = "1234";

const PROVINCES = [
  "بغداد","البصرة","نينوى","أربيل","السليمانية","دهوك","كركوك",
  "الأنبار","صلاح الدين","ديالى","واسط","ميسان","ذي قار",
  "المثنى","القادسية","بابل","كربلاء","النجف"
];

const PARTNERS = [
  { id: "إيهاب",  name: "م. إيهاب",  pct: 30, color: "#2563EB", bg: "#EFF6FF" },
  { id: "أحمد",   name: "م. أحمد",   pct: 10, color: "#D97706", bg: "#FFFBEB" },
  { id: "نور",    name: "م. نور",    pct: 30, color: "#059669", bg: "#ECFDF5" },
  { id: "محمد",   name: "م. محمد",   pct: 30, color: "#7C3AED", bg: "#F5F3FF" },
];

const TYPES = [
  { val: "إشراف",   icon: "👷", color: "#059669", bg: "#ECFDF5" },
  { val: "ديكور",   icon: "🎨", color: "#7C3AED", bg: "#F5F3FF" },
  { val: "مقاولات", icon: "🏗️", color: "#D97706", bg: "#FFFBEB" },
  { val: "واجهات",  icon: "🏢", color: "#2563EB", bg: "#EFF6FF" },
];

const typeStyle = t => TYPES.find(x => x.val === t) || {};

const emptyForm = {
  type: "", name: "", province: "", city: "",
  days: "",
  valueDin: "", valueDol: "",
  startDate: new Date().toISOString().split("T")[0]
};

export default function App() {
  const [page, setPage]       = useState("home");
  const [selProj, setSelProj] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tab, setTab]     = useState("active");
  const [form, setForm]   = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const sf = k => v => setForm(f => ({ ...f, [k]: v }));

  const [funds, setFunds] = useState({});
  const [closingProj, setClosingProj] = useState(null);
  const [partnerPage, setPartnerPage] = useState(null); // {partner, mode:"view"|"withdraw"}

  useEffect(() => {
    return onSnapshot(collection(db, "funds"), snap => {
      const f = {};
      snap.docs.forEach(d => { f[d.id] = { din: d.data().din||0, dol: d.data().dol||0 }; });
      setFunds(f);
    });
  }, []);

  // حساب رصيد الشركاء = مجموع أرصدة الشركاء الأربعة (تلقائي)
  // لا حاجة لـ useEffect — الرصيد يُحدّث مباشرة عند كل توزيع أو سحب

  useEffect(() => {
    return onSnapshot(collection(db, "projects"),
      snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a,b) => b.createdAt?.localeCompare(a.createdAt || "") || 0);
        setProjects(list);
      },
      err => alert("خطأ في قاعدة البيانات: " + err.message)
    );
  }, []);

  const valid = form.type && form.name.trim() && form.province && form.days
             && (Number(form.valueDin) > 0 || Number(form.valueDol) > 0)
             && form.startDate;

  const [saving, setSaving] = useState(false);

  const addProject = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const data = {
        type:      form.type,
        name:      form.name.trim(),
        province:  form.province,
        city:      form.city.trim(),
        days:      Number(form.days),
        valueDin:  Number(form.valueDin) || 0,
        valueDol:  Number(form.valueDol) || 0,
        startDate: form.startDate,
        received:  0,
        spent:     0,
        status:    "active",
        createdAt: new Date().toISOString()
      };
      const ref = await addDoc(collection(db, "projects"), data);
      // تحقق فعلي إن البيانات وصلت Firebase
      const saved = await getDoc(ref);
      if (saved.exists()) {
        setForm(emptyForm);
        setShowForm(false);
      } else {
        alert("⚠️ لم يتم الحفظ في Firebase، تحقق من الاتصال");
      }
    } catch(e) {
      alert("خطأ في الحفظ: " + e.code + " — " + e.message);
    }
    setSaving(false);
  };

  const deleteProject = async id => {
    const pw = window.prompt("🔒 حذف المشروع\nأدخل الباسورد:");
    if (pw === null) return;
    if (pw !== PASS) { alert("❌ باسورد غلط"); return; }
    await deleteDoc(doc(db, "projects", id));
    const s = await getDocs(query(collection(db, "project_txs"), where("projectId","==",id)));
    for (const d of s.docs) await deleteDoc(doc(db, "project_txs", d.id));
  };

  const editProject = async (id, data) => {
    const pw = window.prompt("🔒 تعديل المشروع\nأدخل الباسورد:");
    if (pw === null) return false;
    if (pw !== PASS) { alert("❌ باسورد غلط"); return false; }
    await updateDoc(doc(db, "projects", id), data);
    return true;
  };

  const resetAllProjects = async () => {
    const pw = window.prompt("🔒 تصفير كل المشاريع\nأدخل الباسورد:");
    if (pw === null) return;
    if (pw !== PASS) { alert("❌ باسورد غلط"); return; }
    if (!window.confirm("تأكيد: حذف كل المشاريع وبياناتها؟")) return;
    const ps = await getDocs(collection(db, "projects"));
    for (const d of ps.docs) await deleteDoc(doc(db, "projects", d.id));
    const ts = await getDocs(collection(db, "project_txs"));
    for (const d of ts.docs) await deleteDoc(doc(db, "project_txs", d.id));
  };

  const toggleStatus = async (id, current) => {
    const label = current === "active" ? "إنهاء المشروع" : "إعادة تفعيل المشروع";
    const pw = window.prompt("🔒 " + label + "\nأدخل الباسورد:");
    if (pw === null) return;
    if (pw !== PASS) { alert("❌ باسورد غلط"); return; }

    if (current === "active") {
      // فتح شاشة توزيع الأرباح
      const proj = projects.find(p => p.id === id);
      if (proj) setClosingProj(proj);
    } else {
      // إعادة تفعيل — اسحب من الصناديق
      const proj = projects.find(p => p.id === id);
      if (!proj) return;
      const dists = proj.distributions || [];
      for (const d of dists) {
        const cur = funds[d.fund] || { din: 0, dol: 0 };
        await setDoc(doc(db, "funds", d.fund),
          { din: Math.max(0, cur.din - (d.din||0)),
            dol: Math.max(0, cur.dol - (d.dol||0)) },
          { merge: true });
        if (d.fund === "شركاء") {
          for (const p of PARTNERS) {
            const pDin = Math.round((d.din||0) * p.pct / 100);
            const pDol = Math.round((d.dol||0) * p.pct / 100);
            const pId  = "partner_" + p.id;
            const pCur = funds[pId] || { din: 0, dol: 0 };
            await setDoc(doc(db, "funds", pId),
              { din: Math.max(0, pCur.din - pDin), dol: Math.max(0, pCur.dol - pDol) },
              { merge: true });
          }
        }
      }
      await updateDoc(doc(db, "projects", id),
        { status: "active", distributions: [], closedAt: null });
    }
  };

  const confirmClose = async (proj, distPcts) => {
    const today = new Date().toISOString().split("T")[0];

    // ── خطوة ١: سداد السلف التشغيلية أولاً ──────────────
    const loansSnap = await getDocs(
      query(collection(db,"project_loans"),
        where("projectId","==",proj.id),where("status","==","open"))
    );
    const openLoans = loansSnap.docs.map(d=>({id:d.id,...d.data()}));

    let usedDin = 0, usedDol = 0;
    for (const loan of openLoans) {
      const lDin = loan.din||0, lDol = loan.dol||0;
      const fundBal = funds[loan.fund]||{din:0,dol:0};

      // إرجاع المبلغ للصندوق
      await setDoc(doc(db,"funds",loan.fund),
        {din:fundBal.din+lDin, dol:fundBal.dol+lDol},{merge:true});

      // تسجيل حركة الإيداع في الصندوق
      await addDoc(collection(db,"fund_txs"),{
        fundId:loan.fund, fundLabel:loan.fund, type:"إيداع",
        din:lDin, dol:lDol,
        note:"سداد سلفة تشغيلية ← "+proj.name+" (إنهاء المشروع)",
        date:today, createdAt:new Date().toISOString()
      });

      // إغلاق الدَّيْن
      await updateDoc(doc(db,"project_loans",loan.id),{
        status:"paid", paidDate:today, paidBy:"project_close"
      });

      usedDin += lDin;
      usedDol += lDol;
    }

    // ── خطوة ٢: توزيع المتبقي بعد خصم السلف ────────────
    const rawDin = proj.balDin || 0;
    const rawDol = proj.balDol || 0;
    const balDin = Math.max(0, rawDin - usedDin);
    const balDol = Math.max(0, rawDol - usedDol);

    const distributions = [];
    for (const d of distPcts) {
      if (!d.pct) continue;
      const din = Math.round(balDin * d.pct / 100);
      const dol = Math.round(balDol * d.pct / 100);
      const cur = funds[d.fund] || { din: 0, dol: 0 };
      await setDoc(doc(db, "funds", d.fund),
        { din: cur.din + din, dol: cur.dol + dol }, { merge: true });
      distributions.push({ fund: d.fund, label: d.label, pct: d.pct, din, dol });

      // توزيع حصص الشركاء
      if (d.fund === "شركاء") {
        for (const p of PARTNERS) {
          const pDin = Math.round(din * p.pct / 100);
          const pDol = Math.round(dol * p.pct / 100);
          const pId  = "partner_" + p.id;
          const pCur = funds[pId] || { din: 0, dol: 0 };
          await setDoc(doc(db, "funds", pId),
            { din: pCur.din + pDin, dol: pCur.dol + pDol }, { merge: true });
          if (pDin > 0 || pDol > 0) {
            await addDoc(collection(db, "partner_txs"), {
              partnerId: pId, partnerName: p.name,
              type: "إيداع", din: pDin, dol: pDol,
              note: "أرباح مشروع: " + proj.name,
              date: today, createdAt: new Date().toISOString()
            });
          }
        }
      }
    }

    await updateDoc(doc(db, "projects", proj.id), {
      status: "done", distributions,
      loansRepaid: openLoans.length,
      loansTotalDin: usedDin,
      closedAt: today
    });
    setClosingProj(null);
  };

  const active = projects.filter(p => p.status === "active");
  const done   = projects.filter(p => p.status === "done");
  const list   = tab === "active" ? active : done;

  const testFirebase = async () => {
    try {
      const ref = await addDoc(collection(db, "test_ping"), { t: Date.now() });
      const snap = await getDoc(ref);
      if (snap.exists()) alert("Firebase OK - ID: " + ref.id);
      else alert("فشل - البيانات ما وصلت للسيرفر");
    } catch(e) { alert("خطأ: " + e.code + " - " + e.message); }
  };

  // تحديث المشروع المفتوح تلقائياً عند تغير البيانات
  useEffect(() => {
    if (!selProj) return;
    const updated = projects.find(p => p.id === selProj.id);
    if (updated) setSelProj(updated);
  }, [projects]);

  if (closingProj) return <ClosingModal
    proj={closingProj} funds={funds}
    onConfirm={confirmClose}
    onCancel={() => setClosingProj(null)}/>;

  if (partnerPage) return <PartnerPage
    partner={partnerPage} funds={funds}
    onBack={() => setPartnerPage(null)}
    onWithdraw={async (pid, din, dol, note) => {
      const pId = "partner_" + pid;
      const pf = funds[pId] || { din:0, dol:0 };
      const sf = funds["شركاء"] || { din:0, dol:0 };
      const partner = PARTNERS.find(p=>p.id===pid);
      await setDoc(doc(db,"funds",pId),
        { din: Math.max(0,pf.din-din), dol: Math.max(0,pf.dol-dol) }, {merge:true});
      await setDoc(doc(db,"funds","شركاء"),
        { din: Math.max(0,sf.din-din), dol: Math.max(0,sf.dol-dol) }, {merge:true});
      await addDoc(collection(db,"partner_txs"), {
        partnerId: pId, partnerName: partner?.name||"",
        type: "سحب", din, dol, note: note||"سحب",
        date: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString()
      });
    }}/>;

  if (page === "home")    return <HomePage onSelect={setPage} />;
  if (page === "admin")   return <AdminPage onBack={() => setPage("home")} />;
  if (page === "proj" && selProj)
    return <ProjectDetail proj={selProj} onBack={() => { setPage("projects"); setSelProj(null); }}/>;

  // الصفحة المالية الرئيسية — تُعرض عند page==="financial"
  if (page === "financial2") return <App2 onBack={() => setPage("financial")} />;
  if (page === "foreman_login") return <ForemanSystem onBack={() => setPage("home")} />;

  if (page === "financial") return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9",
      fontFamily:"Tahoma", direction:"rtl" }}>
      <div style={{ maxWidth:520, margin:"0 auto", padding:"24px 16px" }}>
        <button onClick={() => setPage("home")} style={{ background:"#fff",
          border:"1px solid #E2E8F0", borderRadius:10, padding:"8px 16px",
          fontSize:13, color:"#475569", cursor:"pointer", marginBottom:20,
          fontFamily:"Tahoma", display:"flex", alignItems:"center", gap:6 }}>
          ← رجوع للرئيسية
        </button>
        <div style={{ fontSize:20, fontWeight:700, color:"#1E293B", marginBottom:16 }}>
          💰 القسم المالي
        </div>

        {/* إجمالي كل الصناديق */}
        {(() => {
          const allFunds = [
            "رأس_المال","عام","شركاء",
            ...TYPES.map(t=>t.val)
          ]; // 7 صناديق فقط — شركاء تشمل حصص الشركاء
          const totalDin = allFunds.reduce((s,f)=>(funds[f]?.din||0)+s, 0);
          const totalDol = allFunds.reduce((s,f)=>(funds[f]?.dol||0)+s, 0);
          return (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
              <div style={{ background:"linear-gradient(135deg,#D97706,#F59E0B)",
                borderRadius:14, padding:"16px", textAlign:"center",
                boxShadow:"0 4px 20px rgba(217,119,6,0.3)" }}>
                <div style={{ fontSize:12, color:"#FEF3C7", marginBottom:6 }}>
                  🇮🇶 جرد إجمالي الدينار
                </div>
                <div style={{ fontSize:11, color:"#FEF3C7", marginBottom:4 }}>
                  كل الصناديق مجتمعة
                </div>
                <div style={{ fontSize:20, fontWeight:700, color:"#fff" }}>
                  {fNum(totalDin)}
                </div>
                <div style={{ fontSize:12, color:"#FEF3C7" }}>د.ع</div>
              </div>
              <div style={{ background:"linear-gradient(135deg,#1D4ED8,#3B82F6)",
                borderRadius:14, padding:"16px", textAlign:"center",
                boxShadow:"0 4px 20px rgba(29,78,216,0.3)" }}>
                <div style={{ fontSize:12, color:"#DBEAFE", marginBottom:6 }}>
                  🇺🇸 جرد إجمالي الدولار
                </div>
                <div style={{ fontSize:11, color:"#DBEAFE", marginBottom:4 }}>
                  كل الصناديق مجتمعة
                </div>
                <div style={{ fontSize:20, fontWeight:700, color:"#fff" }}>
                  {fNum(totalDol)}
                </div>
                <div style={{ fontSize:12, color:"#DBEAFE" }}>$</div>
              </div>
            </div>
          );
        })()}
        {/* أزرار التنقل */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          <button onClick={() => setPage("projects")} style={{
            background:"#fff", border:"1px solid #E2E8F0", borderTop:"4px solid #D97706",
            borderRadius:16, padding:"14px 16px", cursor:"pointer", textAlign:"right",
            fontFamily:"Tahoma" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:22 }}>🏗️</span>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#1E293B" }}>المشاريع</div>
                <div style={{ fontSize:11, color:"#64748B" }}>
                  {projects.filter(p=>p.status==="active").length} نشط
                </div>
              </div>
            </div>
          </button>
          <button onClick={() => setPage("financial2")} style={{
            background:"#fff", border:"1px solid #E2E8F0", borderTop:"4px solid #059669",
            borderRadius:16, padding:"14px 16px", cursor:"pointer", textAlign:"right",
            fontFamily:"Tahoma" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:22 }}>📊</span>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#1E293B" }}>الحسابات</div>
                <div style={{ fontSize:11, color:"#64748B" }}>الصناديق والموظفين</div>
              </div>
            </div>
          </button>
        </div>

        {/* زر المشاريع القديم - محذوف */}
        <button onClick={() => setPage("projects")} style={{ width:"100%", display:"none",
          background:"#fff", border:"1px solid #E2E8F0", borderTop:"4px solid #D97706",
          borderRadius:16, padding:"18px 20px", cursor:"pointer", textAlign:"right",
          fontFamily:"Tahoma", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:"#FFFBEB",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🏗️</div>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:"#1E293B" }}>المشاريع</div>
              <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>
                {projects.filter(p=>p.status==="active").length} نشط ·{" "}
                {projects.filter(p=>p.status==="done").length} منتهي
              </div>
            </div>
          </div>
        </button>
        {/* الصناديق الأربعة */}
        <div style={{ fontSize:14, fontWeight:700, color:"#1E293B", marginBottom:14 }}>
          💎 الصناديق
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          {/* صندوق رأس المال */}
          {[
            { fund:"رأس_المال", label:"رأس المال",   icon:"💼", color:"#059669", bg:"#ECFDF5" },
            { fund:"عام",       label:"الصندوق العام", icon:"🏦", color:"#D97706", bg:"#FFFBEB" },
          ].map(({ fund, label, icon, color, bg }) => {
            const f = funds[fund] || { din:0, dol:0 };
            return (
              <div key={fund} style={{ background:bg, borderRadius:14, padding:"14px 16px",
                border:"1.5px solid "+color+"40" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <span style={{ fontSize:20 }}>{icon}</span>
                  <span style={{ fontSize:13, fontWeight:700, color }}>{label}</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  <div style={{ background:"#fff", borderRadius:8, padding:"8px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:"#64748B", marginBottom:2 }}>🇮🇶 دينار</div>
                    <div style={{ fontSize:14, fontWeight:700, color }}>{fNum(f.din)} د.ع</div>
                  </div>
                  <div style={{ background:"#fff", borderRadius:8, padding:"8px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:"#64748B", marginBottom:2 }}>🇺🇸 دولار</div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#2563EB" }}>{fNum(f.dol)} $</div>
                  </div>
                </div>
              </div>
            );
          })}
          {/* صندوق أرباح الشركاء — بطاقة كاملة */}
          {(() => {
            const sf = funds["شركاء"] || { din:0, dol:0 };
            return (
              <div style={{ background:"#FAF5FF", borderRadius:14, padding:"14px 16px",
                border:"1.5px solid #9333EA40", gridColumn:"span 2" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                  marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:20 }}>👥</span>
                    <span style={{ fontSize:13, fontWeight:700, color:"#9333EA" }}>أرباح الشركاء</span>
                  </div>
                  <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                    <span style={{ fontSize:13, fontWeight:700, color:"#9333EA" }}>
                      {fNum(sf.din)} <span style={{fontSize:10}}>د.ع</span>
                    </span>
                    {sf.dol > 0 && (
                      <span style={{ fontSize:13, fontWeight:700, color:"#2563EB" }}>
                        {fNum(sf.dol)} <span style={{fontSize:10}}>$</span>
                      </span>
                    )}
                    {/* زر توزيع الرصيد الحالي لأول مرة */}
                    {sf.din + sf.dol > 0 && (() => {
                      const sumDin = PARTNERS.reduce((s,p)=>s+(funds["partner_"+p.id]?.din||0),0);
                      const sumDol = PARTNERS.reduce((s,p)=>s+(funds["partner_"+p.id]?.dol||0),0);
                      if (Math.abs(sumDin - sf.din) < 2 && Math.abs(sumDol - sf.dol) < 2) return null;
                      return (
                        <button onClick={async () => {
                          for (const p of PARTNERS) {
                            const pDin = Math.round(sf.din * p.pct / 100);
                            const pDol = Math.round(sf.dol * p.pct / 100);
                            await setDoc(doc(db,"funds","partner_"+p.id),
                              { din: pDin, dol: pDol }, { merge: true });
                          }
                        }} style={{ fontSize:10, color:"#9333EA", background:"#fff",
                          border:"1px solid #9333EA", borderRadius:6, padding:"3px 8px",
                          cursor:"pointer", fontFamily:"Tahoma", fontWeight:700 }}>
                          🔄 توزيع
                        </button>
                      );
                    })()}
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {PARTNERS.map(p => {
                    const pf = funds["partner_"+p.id] || { din:0, dol:0 };
                    return (
                      <button key={p.id} onClick={() => setPartnerPage(p)}
                        style={{ background:p.bg, border:"1.5px solid "+p.color+"50",
                          borderRadius:12, padding:"12px", textAlign:"right",
                          cursor:"pointer", fontFamily:"Tahoma" }}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                          alignItems:"center", marginBottom:6 }}>
                          <span style={{ fontSize:12, fontWeight:700, color:p.color,
                            background:"#fff", borderRadius:20, padding:"2px 8px" }}>
                            {p.pct}%
                          </span>
                          <span style={{ fontSize:13, fontWeight:700, color:"#1E293B" }}>
                            {p.name}
                          </span>
                        </div>
                        <div style={{ fontSize:14, fontWeight:700, color:p.color }}>
                          {fNum(pf.din)} <span style={{fontSize:10, color:"#64748B"}}>د.ع</span>
                        </div>
                        {pf.dol > 0 && (
                          <div style={{ fontSize:12, fontWeight:700, color:"#2563EB" }}>
                            {fNum(pf.dol)} <span style={{fontSize:10, color:"#64748B"}}>$</span>
                          </div>
                        )}
                        <div style={{ fontSize:10, color:"#9333EA", marginTop:5, fontWeight:600 }}>
                          اضغط للسحب ←
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
        {/* صناديق الأقسام */}
        <div style={{ fontSize:13, fontWeight:700, color:"#64748B", marginBottom:10 }}>
          صناديق الأقسام
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {TYPES.map(({ val, icon, color, bg }) => {
            const f = funds[val] || { din:0, dol:0 };
            return (
              <div key={val} style={{ background:bg, borderRadius:14, padding:"14px 16px",
                border:"1.5px solid "+color+"40" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <span style={{ fontSize:18 }}>{icon}</span>
                  <span style={{ fontSize:13, fontWeight:700, color }}>{val}</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  <div style={{ background:"#fff", borderRadius:8, padding:"8px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:"#64748B", marginBottom:2 }}>🇮🇶</div>
                    <div style={{ fontSize:13, fontWeight:700, color }}>{fNum(f.din)} د.ع</div>
                  </div>
                  <div style={{ background:"#fff", borderRadius:8, padding:"8px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:"#64748B", marginBottom:2 }}>🇺🇸</div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#2563EB" }}>{fNum(f.dol)} $</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9",
      fontFamily: "Tahoma", direction: "rtl" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "22px 16px" }}>
        {/* رجوع للرئيسية */}
        <button onClick={() => setPage("financial")} style={{
          background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10,
          padding: "8px 16px", fontSize: 13, color: "#475569", cursor: "pointer",
          marginBottom: 16, fontFamily: "Tahoma", display: "flex",
          alignItems: "center", gap: 6
        }}>← رجوع للقسم المالي</button>

        {/* هيدر */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px",
          marginBottom: 16, border: "1px solid #E2E8F0", borderTop: "4px solid #D97706" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1E293B" }}>🏗️ صندوق المشاريع</div>
          <div style={{ display: "flex", gap: 16, marginTop: 6, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#16A34A", fontWeight: 600 }}>● {active.length} قيد العمل</span>
            <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>✓ {done.length} منتهية</span>
            <button onClick={testFirebase} style={{ fontSize: 11, background: "#F0FDF4", border: "1px solid #16A34A", borderRadius: 7, padding: "4px 10px", cursor: "pointer", color: "#16A34A", fontFamily: "Tahoma", fontWeight: 700 }}>🔌 اختبار</button>
          </div>
        </div>

        {/* تبويبات */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[["active","● قيد العمل","#16A34A"],["done","✓ منتهية","#64748B"]].map(([v,l,c]) => (
            <button key={v} onClick={() => setTab(v)} style={{
              border: tab === v ? "none" : "1px solid #E2E8F0",
              borderRadius: 10, padding: "12px", cursor: "pointer",
              fontFamily: "Tahoma", fontSize: 14, fontWeight: 700,
              background: tab === v ? c : "#fff",
              color: tab === v ? "#fff" : "#64748B"
            }}>{l} ({v === "active" ? active.length : done.length})</button>
          ))}
        </div>

        {/* أزرار */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {tab === "active" && (
            <button onClick={() => { setShowForm(v => !v); setForm(emptyForm); }} style={{
              flex: 1,
            width: "100%", background: showForm ? "#475569" : "#D97706",
            border: "none", borderRadius: 12, padding: "13px",
              color: "#fff", fontSize: 15, fontWeight: 700,
              cursor: "pointer", fontFamily: "Tahoma"
            }}>
              {showForm ? "✕ إلغاء" : "+ إضافة مشروع جديد"}
            </button>
          )}
          <button onClick={resetAllProjects} style={{
            background: "#FFF1F2", border: "1px solid #FEE2E2",
            borderRadius: 12, padding: "13px 16px", cursor: "pointer",
            color: "#DC2626", fontFamily: "Tahoma", fontSize: 13, fontWeight: 700,
            whiteSpace: "nowrap"
          }}>
            🗑️ تصفير
          </button>
        </div>

        {/* فورم */}
        {showForm && tab === "active" && (
          <div style={{ background: "#fff", borderRadius: 14, padding: 20,
            border: "1px solid #E2E8F0", marginBottom: 16 }}>

            {/* نوع المشروع */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 8 }}>
              نوع المشروع *
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
              {TYPES.map(({ val, icon, color, bg }) => (
                <button key={val} onClick={() => sf("type")(val)} style={{
                  border: "2px solid " + (form.type === val ? color : "#E2E8F0"),
                  borderRadius: 12, padding: "14px 10px", cursor: "pointer",
                  fontFamily: "Tahoma", fontSize: 14, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  background: form.type === val ? bg : "#fff",
                  color: form.type === val ? color : "#94A3B8"
                }}>
                  <span style={{ fontSize: 22 }}>{icon}</span> {val}
                </button>
              ))}
            </div>

            {/* اسم المشروع */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              اسم المشروع *
            </div>
            <input autoFocus placeholder="أدخل اسم المشروع..." value={form.name}
              onChange={e => sf("name")(e.target.value)}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 14, boxSizing: "border-box",
                background: "#F8FAFC", color: "#1E293B" }}/>

            {/* المحافظة */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              المحافظة *
            </div>
            <select value={form.province} onChange={e => sf("province")(e.target.value)}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 14, boxSizing: "border-box",
                background: "#F8FAFC", color: form.province ? "#1E293B" : "#94A3B8",
                appearance: "none" }}>
              <option value="">اختر المحافظة...</option>
              {PROVINCES.map(pr => <option key={pr} value={pr}>{pr}</option>)}
            </select>

            {/* المدينة */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              المدينة
            </div>
            <input placeholder="اسم المنطقة أو المدينة..." value={form.city}
              onChange={e => sf("city")(e.target.value)}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 14, boxSizing: "border-box",
                background: "#F8FAFC", color: "#1E293B" }}/>

            {/* مدة المشروع بالأيام */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              مدة المشروع بالأيام *
            </div>
            <input placeholder="مثال: 90" value={form.days} inputMode="numeric"
              onChange={e => sf("days")(e.target.value.replace(/[^0-9]/g, ""))}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 4, boxSizing: "border-box",
                background: "#F8FAFC", color: "#1E293B",
                MozAppearance: "textfield", WebkitAppearance: "none" }}/>
            {Number(form.days) > 0 && (
              <div style={{ fontSize: 12, color: "#059669", fontWeight: 600, marginBottom: 14 }}>
                ✍️ {w2(Number(form.days))} يوم
              </div>
            )}
            {!Number(form.days) && <div style={{ marginBottom: 10 }}/>}

            {/* قيمة المشروع */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 8 }}>
              قيمة المشروع * (دينار و/أو دولار)
            </div>
            <div style={{ background: "#F8FAFC", borderRadius: 12, padding: 14,
              border: "1px solid #E2E8F0", marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#16A34A", fontWeight: 600, marginBottom: 6 }}>
                🇮🇶 الدينار العراقي
              </div>
              <input placeholder="٠" value={form.valueDin} inputMode="numeric"
                onChange={e => sf("valueDin")(e.target.value.replace(/[^0-9]/g, ""))}
                style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                  padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                  direction: "rtl", marginBottom: 4, boxSizing: "border-box",
                  background: "#fff", color: "#1E293B",
                  MozAppearance: "textfield", WebkitAppearance: "none" }}/>
              {Number(form.valueDin) > 0 && (
                <div style={{ fontSize: 12, color: "#16A34A", fontWeight: 600, marginBottom: 12 }}>
                  ✍️ {w2(Number(form.valueDin))} دينار — {fNum(form.valueDin)} د.ع
                </div>
              )}
              {!Number(form.valueDin) && <div style={{ marginBottom: 12 }}/>}
              <div style={{ fontSize: 12, color: "#2563EB", fontWeight: 600, marginBottom: 6 }}>
                🇺🇸 الدولار الأمريكي
              </div>
              <input placeholder="٠" value={form.valueDol} inputMode="numeric"
                onChange={e => sf("valueDol")(e.target.value.replace(/[^0-9]/g, ""))}
                style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                  padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                  direction: "rtl", marginBottom: 4, boxSizing: "border-box",
                  background: "#fff", color: "#1E293B",
                  MozAppearance: "textfield", WebkitAppearance: "none" }}/>
              {Number(form.valueDol) > 0 && (
                <div style={{ fontSize: 12, color: "#2563EB", fontWeight: 600 }}>
                  ✍️ {w2(Number(form.valueDol))} دولار — {fNum(form.valueDol)} $
                </div>
              )}
            </div>

            {/* تاريخ بداية العمل */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              تاريخ بداية العمل *
            </div>
            <input type="date" value={form.startDate}
              onChange={e => sf("startDate")(e.target.value)}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 16, boxSizing: "border-box",
                background: "#F8FAFC", color: "#1E293B" }}/>

            <button onClick={addProject} disabled={!valid} style={{
              width: "100%", border: "none", borderRadius: 10, padding: "13px",
              fontSize: 15, fontWeight: 700, fontFamily: "Tahoma",
              cursor: valid && !saving ? "pointer" : "not-allowed",
              background: valid && !saving ? "#D97706" : "#E2E8F0",
              color: valid && !saving ? "#fff" : "#94A3B8"
            }}>
              {saving ? "⏳ جاري الحفظ..." : "✅ حفظ المشروع"}
            </button>
          </div>
        )}

        {/* قائمة المشاريع */}
        {list.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#94A3B8",
            background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{tab === "active" ? "🏗️" : "✅"}</div>
            <div style={{ fontSize: 15 }}>
              {tab === "active" ? "ما في مشاريع قيد العمل" : "ما في مشاريع منتهية"}
            </div>
          </div>
        ) : list.map(p => <ProjectCard key={p.id} p={p}
            onOpen={() => { setSelProj(p); setPage("proj"); }}
            onToggle={() => toggleStatus(p.id, p.status)}
            onDelete={() => deleteProject(p.id)}
            onEdit={editProject} />
        )}
      </div>
    </div>
  );
}

function HomePage({ onSelect }) {
  return (
    <div style={{ minHeight: "100vh", background: "#1E293B",
      fontFamily: "Tahoma", direction: "rtl",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 20 }}>

      {/* الشعار */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏗️</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>
          شركة باب المشاريع
        </div>
        <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 6 }}>
          اختر القسم للمتابعة
        </div>
      </div>

      {/* القسمان */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 16, width: "100%", maxWidth: 500 }}>

        {/* القسم المالي */}
        <button onClick={() => onSelect("financial")} style={{
          background: "linear-gradient(135deg, #D97706, #F59E0B)",
          border: "none", borderRadius: 20, padding: "32px 16px",
          cursor: "pointer", textAlign: "center", fontFamily: "Tahoma",
          boxShadow: "0 8px 32px rgba(217,119,6,0.4)",
          transition: "transform 0.15s"
        }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>💰</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
            القسم المالي
          </div>
          <div style={{ fontSize: 12, color: "#FEF3C7" }}>
            المشاريع · الصرف · الإيرادات
          </div>
        </button>

        {/* القسم الإداري */}
        <button onClick={() => onSelect("admin")} style={{
          background: "linear-gradient(135deg, #1D4ED8, #3B82F6)",
          border: "none", borderRadius: 20, padding: "32px 16px",
          cursor: "pointer", textAlign: "center", fontFamily: "Tahoma",
          boxShadow: "0 8px 32px rgba(29,78,216,0.4)",
          transition: "transform 0.15s"
        }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
            القسم الإداري
          </div>
          <div style={{ fontSize: 12, color: "#DBEAFE" }}>
            إدارة العمل · الموظفون · المهام
          </div>
        </button>
      </div>
    </div>
  );
}

function AdminPage({ onBack }) {
  const [tasks, setTasks]       = useState([]);
  const [activeProjs, setActiveProjs] = useState([]);
  const [text, setText]         = useState("");
  const [selProj, setSelProj]   = useState("");  // ربط بمشروع
  const [filter, setFilter]     = useState("all");
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    return onSnapshot(collection(db, "daily_tasks"), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a,b) => (b.createdAt||"").localeCompare(a.createdAt||""));
      setTasks(list);
    });
  }, []);

  // جلب المشاريع المفتوحة من القسم المالي
  useEffect(() => {
    return onSnapshot(collection(db, "projects"), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.status === "active")
        .sort((a,b) => (a.name||"").localeCompare(b.name||""));
      setActiveProjs(list);
    });
  }, []);

  const addTask = () => {
    if (!text.trim()) return;
    const proj = activeProjs.find(p => p.id === selProj);
    addDoc(collection(db, "daily_tasks"), {
      text: text.trim(),
      date: today,
      done: false,
      projectId:   proj?.id   || "",
      projectName: proj?.name || "",
      createdAt: new Date().toISOString()
    });
    setText("");
    setSelProj("");
  };

  const toggleDone = (id, done) => {
    updateDoc(doc(db, "daily_tasks", id), { done: !done });
  };

  const deleteTask = id => {
    deleteDoc(doc(db, "daily_tasks", id));
  };

  const todayTasks = tasks.filter(t => t.date === today);
  const oldTasks   = tasks.filter(t => t.date !== today);
  const pending    = todayTasks.filter(t => !t.done).length;
  const done_count = todayTasks.filter(t => t.done).length;

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9",
      fontFamily: "Tahoma", direction: "rtl" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "22px 16px" }}>

        <button onClick={onBack} style={{ background: "#fff", border: "1px solid #E2E8F0",
          borderRadius: 10, padding: "8px 16px", fontSize: 13, color: "#475569",
          cursor: "pointer", marginBottom: 16, fontFamily: "Tahoma",
          display: "flex", alignItems: "center", gap: 6 }}>
          ← رجوع للرئيسية
        </button>

        {/* هيدر */}
        <div style={{ background: "linear-gradient(135deg,#1D4ED8,#3B82F6)",
          borderRadius: 16, padding: "18px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
            📋 القسم الإداري
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <span style={{ fontSize: 13, color: "#DBEAFE" }}>
              ⏳ {pending} معلقة اليوم
            </span>
            <span style={{ fontSize: 13, color: "#BBF7D0" }}>
              ✅ {done_count} منجزة اليوم
            </span>
          </div>
        </div>

        {/* إضافة مهمة */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 16,
          border: "1px solid #E2E8F0", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B", marginBottom: 12 }}>
            ➕ إضافة عمل جديد
          </div>
          {/* ربط بمشروع */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              🏗️ ربط بمشروع (اختياري)
            </div>
            <select value={selProj} onChange={e => setSelProj(e.target.value)}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "10px 14px", fontSize: 14, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", background: selProj ? "#EFF6FF" : "#F8FAFC",
                color: selProj ? "#2563EB" : "#94A3B8",
                fontWeight: selProj ? 700 : 400, appearance: "none",
                boxSizing: "border-box" }}>
              <option value="">— بدون ربط —</option>
              {activeProjs.map(p => {
                const ts = typeStyle(p.type);
                return <option key={p.id} value={p.id}>{ts.icon} {p.name}{p.province?" — "+p.province:""}</option>;
              })}
            </select>
            {activeProjs.length === 0 && (
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>
                ما في مشاريع مفتوحة حالياً
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="اكتب المهمة أو العمل المطلوب..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTask()}
              style={{ flex: 1, border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "11px 14px", fontSize: 14, outline: "none",
                fontFamily: "Tahoma", direction: "rtl", background: "#F8FAFC",
                color: "#1E293B" }}
            />
            <button onClick={addTask} disabled={!text.trim()} style={{
              background: text.trim() ? "#2563EB" : "#E2E8F0",
              border: "none", borderRadius: 10, padding: "11px 18px",
              color: text.trim() ? "#fff" : "#94A3B8",
              cursor: text.trim() ? "pointer" : "not-allowed",
              fontSize: 14, fontWeight: 700, fontFamily: "Tahoma", whiteSpace: "nowrap"
            }}>
              إضافة
            </button>
          </div>
        </div>

        {/* فلتر */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 6, marginBottom: 14 }}>
          {[["all","الكل"],["pending","⏳ معلقة"],["done","✅ منجزة"]].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{
              border: filter === v ? "none" : "1px solid #E2E8F0",
              borderRadius: 10, padding: "10px", cursor: "pointer",
              fontFamily: "Tahoma", fontSize: 13, fontWeight: 700,
              background: filter === v ? "#2563EB" : "#fff",
              color: filter === v ? "#fff" : "#64748B"
            }}>{l}</button>
          ))}
        </div>

        {/* مهام اليوم */}
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1D4ED8",
          marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 3, height: 16, background: "#2563EB", borderRadius: 2 }}/>
          أعمال اليوم — {today}
        </div>

        {todayTasks.filter(t =>
          filter === "all" ? true :
          filter === "pending" ? !t.done : t.done
        ).length === 0 ? (
          <div style={{ textAlign: "center", padding: 28, color: "#94A3B8",
            background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0",
            marginBottom: 14 }}>
            {filter === "done" ? "ما في أعمال منجزة اليوم" : "ما في أعمال بعد، أضف عملك الأول ↑"}
          </div>
        ) : (
          todayTasks.filter(t =>
            filter === "all" ? true :
            filter === "pending" ? !t.done : t.done
          ).map(t => (
            <div key={t.id} style={{ background: "#fff", borderRadius: 12,
              padding: "13px 16px", marginBottom: 10, border: "1px solid #E2E8F0",
              borderRight: "4px solid " + (t.done ? "#16A34A" : "#2563EB"),
              opacity: t.done ? 0.75 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* تشيك بوكس */}
                <button onClick={() => toggleDone(t.id, t.done)} style={{
                  width: 26, height: 26, borderRadius: 7, cursor: "pointer",
                  border: "2px solid " + (t.done ? "#16A34A" : "#CBD5E1"),
                  background: t.done ? "#16A34A" : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: 14
                }}>
                  {t.done ? "✓" : ""}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600,
                    textDecoration: t.done ? "line-through" : "none",
                    color: t.done ? "#94A3B8" : "#1E293B" }}>
                    {t.text}
                  </div>
                  {t.projectName && (
                    <div style={{ fontSize: 11, color: "#2563EB", marginTop: 3,
                      fontWeight: 600 }}>
                      🏗️ {t.projectName}
                    </div>
                  )}
                </div>
                <button onClick={() => deleteTask(t.id)} style={{
                  background: "none", border: "none", color: "#DC2626",
                  cursor: "pointer", fontSize: 13, fontFamily: "Tahoma"
                }}>🗑️</button>
              </div>
            </div>
          ))
        )}

        {/* أعمال سابقة */}
        {oldTasks.length > 0 && filter === "all" && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#94A3B8",
              marginTop: 20, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 3, height: 14, background: "#CBD5E1", borderRadius: 2 }}/>
              أعمال سابقة ({oldTasks.length})
            </div>
            {oldTasks.map(t => (
              <div key={t.id} style={{ background: "#FAFAFA", borderRadius: 12,
                padding: "11px 16px", marginBottom: 8, border: "1px solid #E2E8F0",
                borderRight: "4px solid #CBD5E1", opacity: 0.8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                    background: t.done ? "#16A34A" : "#94A3B8" }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#64748B",
                      textDecoration: t.done ? "line-through" : "none" }}>
                      {t.text}
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                      📅 {t.date}
                    </div>
                    {t.projectName && (
                      <div style={{ fontSize: 11, color: "#2563EB", fontWeight: 600 }}>
                        🏗️ {t.projectName}
                      </div>
                    )}
                  </div>
                  <button onClick={() => deleteTask(t.id)} style={{
                    background: "none", border: "none", color: "#DC2626",
                    cursor: "pointer", fontSize: 12
                  }}>🗑️</button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ p, onOpen, onToggle, onDelete, onEdit }) {
  const ts = typeStyle(p.type);
  const [showEdit, setShowEdit] = React.useState(false);
  const [ef, setEf] = React.useState({
    name: p.name||"", province: p.province||"", city: p.city||"",
    days: String(p.days||""), valueDin: String(p.valueDin||""), valueDol: String(p.valueDol||""),
    startDate: p.startDate||""
  });
  const se = k => v => setEf(x=>({...x,[k]:v}));

  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px",
      marginBottom: 14, border: "1px solid #E2E8F0",
      borderRight: "5px solid " + (ts.color || "#D97706") }}>

      {/* السطر الأول */}
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            {p.type && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px",
                borderRadius: 20, background: ts.bg, color: ts.color }}>
                {ts.icon} {p.type}
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px",
              borderRadius: 20,
              background: p.status === "active" ? "#DCFCE7" : "#F1F5F9",
              color: p.status === "active" ? "#16A34A" : "#64748B" }}>
              {p.status === "active" ? "● قيد العمل" : "✓ منتهي"}
            </span>
          </div>
          <div onClick={onOpen} style={{ fontSize: 16, fontWeight: 700,
            color: "#1E293B", cursor: "pointer", textDecoration: "underline dotted" }}>
            {p.name}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 5, flexWrap: "wrap" }}>
            {p.startDate && <span style={{ fontSize: 12, color: "#64748B" }}>📅 {p.startDate}</span>}
            {p.days > 0  && <span style={{ fontSize: 12, color: "#64748B" }}>⏱️ {p.days} يوم</span>}
            {p.province && <span style={{ fontSize: 12, color: "#64748B" }}>📍 {p.province}{p.city?" — "+p.city:""}</span>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginRight: 8 }}>
          <button onClick={onToggle} style={{
            background: p.status === "active" ? "#F0FDF4" : "#FFFBEB",
            border: "1px solid " + (p.status === "active" ? "#16A34A" : "#D97706"),
            borderRadius: 8, padding: "5px 10px", cursor: "pointer",
            fontSize: 11, fontFamily: "Tahoma", fontWeight: 700,
            color: p.status === "active" ? "#16A34A" : "#D97706"
          }}>
            {p.status === "active" ? "✓ إنهاء" : "↩ تفعيل"}
          </button>
          <button onClick={e => { e.stopPropagation(); onEdit && setShowEdit(true); }} style={{
            background: "#EFF6FF", border: "1px solid #BFDBFE",
            borderRadius: 7, padding: "5px 10px",
            color: "#2563EB", cursor: "pointer", fontSize: 11,
            fontFamily: "Tahoma", fontWeight: 700, marginBottom: 4
          }}>
            ✏️ تعديل
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{
            background: "#FFF1F2", border: "1px solid #FEE2E2",
            borderRadius: 7, padding: "5px 10px",
            color: "#DC2626", cursor: "pointer", fontSize: 11,
            fontFamily: "Tahoma", fontWeight: 700
          }}>
            🗑️ حذف
          </button>
        </div>
      </div>

      {/* نافذة التعديل */}
      {showEdit && (
        <div onClick={e=>e.stopPropagation()} style={{ position:"fixed",inset:0,
          background:"rgba(0,0,0,0.5)",zIndex:999,display:"flex",
          alignItems:"center",justifyContent:"center",padding:16 }}>
          <div style={{ background:"#fff",borderRadius:18,width:"100%",maxWidth:420,
            maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ padding:"16px 20px",borderBottom:"1px solid #E2E8F0",
              display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div style={{ fontSize:15,fontWeight:700,color:"#2563EB" }}>✏️ تعديل المشروع</div>
              <button onClick={()=>setShowEdit(false)} style={{ background:"none",border:"none",
                fontSize:20,cursor:"pointer",color:"#64748B" }}>✕</button>
            </div>
            <div style={{ padding:"18px 20px" }}>
              {/* نوع المشروع */}
              <div style={{ fontSize:12,color:"#64748B",fontWeight:600,marginBottom:8 }}>نوع المشروع</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14 }}>
                {TYPES.map(({val,icon,color,bg})=>(
                  <button key={val} onClick={()=>se("type")(val)} style={{
                    border:"2px solid "+(ef.type===val?color:"#E2E8F0"),
                    borderRadius:10,padding:"10px 8px",cursor:"pointer",
                    fontFamily:"Tahoma",fontSize:13,fontWeight:700,
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                    background:ef.type===val?bg:"#fff",color:ef.type===val?color:"#94A3B8"
                  }}><span style={{fontSize:18}}>{icon}</span>{val}</button>
                ))}
              </div>
              {[
                {l:"اسم المشروع",k:"name",ph:"..."},
                {l:"تاريخ البداية",k:"startDate",ph:"",t:"date"},
                {l:"المدة بالأيام",k:"days",ph:"90",t:"number"},
                {l:"قيمة الدينار",k:"valueDin",ph:"٠",t:"number"},
                {l:"قيمة الدولار",k:"valueDol",ph:"٠",t:"number"},
              ].map(({l,k,ph,t})=>(
                <div key={k} style={{marginBottom:12}}>
                  <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>{l}</div>
                  <input type={t||"text"} placeholder={ph} value={ef[k]||""}
                    onChange={e=>se(k)(e.target.value)}
                    style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                      padding:"10px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                      direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
                  {(k==="valueDin"||k==="valueDol") && Number(ef[k])>0 && (
                    <div style={{fontSize:11,color:"#059669",fontWeight:600,marginTop:3}}>
                      ✍️ {w2(Number(ef[k]))} {k==="valueDin"?"دينار عراقي":"دولار أمريكي"}
                    </div>
                  )}
                </div>
              ))}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>المحافظة</div>
                <select value={ef.province||""} onChange={e=>se("province")(e.target.value)}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"10px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",background:"#F8FAFC",appearance:"none"}}>
                  <option value="">اختر...</option>
                  {PROVINCES.map(pr=><option key={pr} value={pr}>{pr}</option>)}
                </select>
              </div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>المدينة</div>
                <input placeholder="..." value={ef.city||""} onChange={e=>se("city")(e.target.value)}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"10px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
              </div>
              <button onClick={async()=>{
                const ok = await onEdit(p.id,{
                  name:ef.name.trim()||p.name,
                  type:ef.type||p.type,
                  province:ef.province||p.province||"",
                  city:ef.city?.trim()||"",
                  days:Number(ef.days)||p.days||0,
                  valueDin:Number(ef.valueDin)||0,
                  valueDol:Number(ef.valueDol)||0,
                  startDate:ef.startDate||p.startDate||""
                });
                if(ok)setShowEdit(false);
              }} style={{width:"100%",border:"none",borderRadius:10,padding:"13px",
                fontSize:14,fontWeight:700,fontFamily:"Tahoma",
                background:"#2563EB",color:"#fff",cursor:"pointer"}}>
                ✅ حفظ التعديلات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* الميزان في القائمة */}
      <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 10,
        display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ background: (p.balDin||0) >= 0 ? "#FFFBEB" : "#FFF1F2",
          borderRadius: 9, padding: "7px 12px",
          border: "1.5px solid " + ((p.balDin||0) >= 0 ? "#D97706" : "#DC2626") }}>
          <span style={{ fontSize: 10, color: "#64748B" }}>⚖️ ميزان د.ع  </span>
          <span style={{ fontSize: 13, fontWeight: 700,
            color: (p.balDin||0) >= 0 ? "#D97706" : "#DC2626" }}>
            {(p.balDin||0) >= 0 ? "+" : ""}{fNum(p.balDin||0)} د.ع
          </span>
        </div>
        <div style={{ background: (p.balDol||0) >= 0 ? "#EFF6FF" : "#FFF1F2",
          borderRadius: 9, padding: "7px 12px",
          border: "1.5px solid " + ((p.balDol||0) >= 0 ? "#2563EB" : "#DC2626") }}>
          <span style={{ fontSize: 10, color: "#64748B" }}>⚖️ ميزان $  </span>
          <span style={{ fontSize: 13, fontWeight: 700,
            color: (p.balDol||0) >= 0 ? "#2563EB" : "#DC2626" }}>
            {(p.balDol||0) >= 0 ? "+" : ""}{fNum(p.balDol||0)} $
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── صفحة تفاصيل المشروع ───────────────────────────────
function ProjectDetail({ proj, onBack }) {
  const [txs, setTxs]     = useState([]);
  const [tab, setTab]     = useState("in");
  const [show, setShow]   = useState(false);
  const [printFilter, setPrintFilter] = useState("all");
  const [showPrint, setShowPrint] = useState(false);
  const [form, setForm]   = useState({
    amount: "", currency: "دينار", receiver: "", date: new Date().toISOString().split("T")[0], note: ""
  });
  const sf = k => v => setForm(f => ({ ...f, [k]: v }));
  const amt = Number(form.amount) || 0;

  const [showLoan,  setShowLoan]  = useState(false);
  const [projLoans, setProjLoans] = useState([]);
  const [loanForm,  setLoanForm]  = useState({
    fund:"إشراف", din:"", dol:"",
    date: new Date().toISOString().split("T")[0], note:""
  });
  const lf = k => v => setLoanForm(f=>({...f,[k]:v}));
  const [funds, setFunds] = useState({});

  useEffect(()=>{
    return onSnapshot(collection(db,"funds"), snap=>{
      const f={};snap.docs.forEach(d=>{f[d.id]={din:d.data().din||0,dol:d.data().dol||0};});setFunds(f);
    });
  },[]);

  useEffect(()=>{
    return onSnapshot(
      query(collection(db,"project_loans"),where("projectId","==",proj.id),where("status","==","open")),
      snap=>setProjLoans(snap.docs.map(d=>({id:d.id,...d.data()})))
    );
  },[proj.id]);

  const giveProjLoan = async () => {
    const din=Number(loanForm.din)||0, dol=Number(loanForm.dol)||0;
    if(!din&&!dol) return;
    const bal=funds[loanForm.fund]||{din:0,dol:0};
    if(din>bal.din){alert("⛔ رصيد صندوق "+loanForm.fund+" غير كافٍ — المتاح: "+fNum(bal.din)+" د.ع");return;}
    if(dol>bal.dol){alert("⛔ رصيد الدولار في صندوق "+loanForm.fund+" غير كافٍ");return;}
    const pw=window.prompt("🔒 أدخل الباسورد:");
    if(!pw)return; if(pw!==PASS){alert("❌ باسورد غلط");return;}

    // خصم من الصندوق
    await setDoc(doc(db,"funds",loanForm.fund),{din:bal.din-din,dol:bal.dol-dol},{merge:true});

    // تسجيل كحركة إيداع في المشروع
    await addDoc(collection(db,"project_txs"),{
      projectId:proj.id, projectName:proj.name,
      type:"in", amount:din||dol,
      currency:din>0?"دينار":"دولار",
      receiver:"سلفة تشغيلية",
      date:loanForm.date,
      note:"سلفة من صندوق "+loanForm.fund+(loanForm.note?" — "+loanForm.note:""),
      isLoan:true,
      createdAt:new Date().toISOString()
    });

    // حركة الصندوق
    await addDoc(collection(db,"fund_txs"),{
      fundId:loanForm.fund,fundLabel:loanForm.fund,type:"صرف",
      din,dol,note:"سلفة تشغيلية → "+proj.name,
      date:loanForm.date,createdAt:new Date().toISOString()
    });

    // تسجيل الدَّيْن
    await addDoc(collection(db,"project_loans"),{
      projectId:proj.id,projectName:proj.name,
      fund:loanForm.fund,din,dol,
      note:loanForm.note,date:loanForm.date,
      status:"open",createdAt:new Date().toISOString()
    });

    // تحديث ميزان المشروع
    const curRecDin=inTxs.filter(t=>t.currency!=="دولار").reduce((s,t)=>s+t.amount,0);
    const curSpdDin=outTxs.filter(t=>t.currency!=="دولار").reduce((s,t)=>s+t.amount,0);
    if(din>0){
      await updateDoc(doc(db,"projects",proj.id),{
        recDin:curRecDin+din, balDin:(curRecDin+din)-curSpdDin
      });
    }

    setLoanForm({fund:"إشراف",din:"",dol:"",date:new Date().toISOString().split("T")[0],note:""});
    setShowLoan(false);
    alert("✅ تم صرف السلفة التشغيلية");
  };

  const repayProjLoan = async (loan) => {
    const pw=window.prompt("🔒 تأكيد سداد السلفة — باسورد:");
    if(!pw)return; if(pw!==PASS){alert("❌ باسورد غلط");return;}
    // التحقق من ميزان المشروع
    const projBal = (proj.balDin||0);
    if((loan.din||0)>projBal){
      alert("⛔ ميزان المشروع غير كافٍ للسداد — المتاح: "+fNum(projBal)+" د.ع | المطلوب: "+fNum(loan.din)+" د.ع");
      return;
    }
    const fundBal=funds[loan.fund]||{din:0,dol:0};
    const today=new Date().toISOString().split("T")[0];

    // إعادة المبلغ للصندوق
    await setDoc(doc(db,"funds",loan.fund),{din:fundBal.din+(loan.din||0),dol:fundBal.dol+(loan.dol||0)},{merge:true});

    // تسجيل الصرف من المشروع
    await addDoc(collection(db,"project_txs"),{
      projectId:proj.id,projectName:proj.name,
      type:"out",amount:loan.din||loan.dol,
      currency:(loan.din||0)>0?"دينار":"دولار",
      receiver:"صندوق "+loan.fund,
      date:today,note:"سداد سلفة تشغيلية",
      isLoanRepay:true,
      createdAt:new Date().toISOString()
    });

    // حركة الصندوق
    await addDoc(collection(db,"fund_txs"),{
      fundId:loan.fund,fundLabel:loan.fund,type:"إيداع",
      din:loan.din||0,dol:loan.dol||0,
      note:"سداد سلفة ← "+proj.name,
      date:today,createdAt:new Date().toISOString()
    });

    // إغلاق الدَّيْن
    await updateDoc(doc(db,"project_loans",loan.id),{status:"paid",paidDate:today});
    alert("✅ تم سداد السلفة — صندوق "+loan.fund+" استرجع مبلغه");
  };

  // جلب الحركات
  useEffect(() => {
    return onSnapshot(
      query(collection(db, "project_txs"), where("projectId","==",proj.id)),
      snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a,b) => b.createdAt?.localeCompare(a.createdAt || "") || 0);
        setTxs(list);
      }
    );
  }, [proj.id]);

  const inTxs  = txs.filter(t => t.type === "in");
  const outTxs = txs.filter(t => t.type === "out");

  const totalIn  = (cur) => inTxs.filter(t=>t.currency===cur).reduce((s,t)=>s+t.amount,0);
  const totalOut = (cur) => outTxs.filter(t=>t.currency===cur).reduce((s,t)=>s+t.amount,0);

  const addTx = () => {
    if (!amt || !form.receiver.trim()) return;
    const isDol = form.currency === "دولار";
    // الاستلام: حر بدون حد أقصى
    // التحقق من عدم تجاوز المصروف للمستلم
    if (tab === "out") {
      const curIn  = totalIn(form.currency);
      const curOut = totalOut(form.currency);
      const avail  = curIn - curOut;
      if (amt > avail) {
        alert(
          "⛔ لا يمكن الصرف\n" +
          "المصروف سيتجاوز المستلم!\n\n" +
          "المتاح للصرف: " + fNum(Math.max(0, avail)) + (isDol ? " $" : " د.ع")
        );
        return;
      }
    }
    const isDolCur = form.currency === "دولار";
    const isIn = tab === "in";
    // حفظ الحركة
    addDoc(collection(db, "project_txs"), {
      projectId: proj.id,
      projectName: proj.name,
      type: tab,
      amount: amt,
      currency: form.currency,
      receiver: form.receiver.trim(),
      date: form.date,
      note: form.note.trim(),
      createdAt: new Date().toISOString()
    });
    // حساب المجاميع من txs الحالية (دائماً محدّثة) + الحركة الجديدة
    const curRecDin = inTxs.filter(t=>t.currency!=="دولار").reduce((s,t)=>s+t.amount,0);
    const curSpdDin = outTxs.filter(t=>t.currency!=="دولار").reduce((s,t)=>s+t.amount,0);
    const curRecDol = inTxs.filter(t=>t.currency==="دولار").reduce((s,t)=>s+t.amount,0);
    const curSpdDol = outTxs.filter(t=>t.currency==="دولار").reduce((s,t)=>s+t.amount,0);
    const newRecDin = !isDolCur && isIn  ? curRecDin + amt : curRecDin;
    const newSpdDin = !isDolCur && !isIn ? curSpdDin + amt : curSpdDin;
    const newRecDol = isDolCur  && isIn  ? curRecDol + amt : curRecDol;
    const newSpdDol = isDolCur  && !isIn ? curSpdDol + amt : curSpdDol;
    updateDoc(doc(db, "projects", proj.id), {
      recDin: newRecDin, spdDin: newSpdDin,
      recDol: newRecDol, spdDol: newSpdDol,
      balDin: newRecDin - newSpdDin,
      balDol: newRecDol - newSpdDol
    });
    setForm({ amount: "", currency: form.currency, receiver: "", date: form.date, note: "" });
    setShow(false);
  };

  // إعادة حساب الميزان تلقائياً كلما تغيرت الحركات
  useEffect(() => {
    if (!txs || txs.length === 0) return;
    const recDin = txs.filter(t=>t.type==="in"&&t.currency!=="دولار").reduce((s,t)=>s+t.amount,0);
    const spdDin = txs.filter(t=>t.type!=="in"&&t.currency!=="دولار").reduce((s,t)=>s+t.amount,0);
    const recDol = txs.filter(t=>t.type==="in"&&t.currency==="دولار").reduce((s,t)=>s+t.amount,0);
    const spdDol = txs.filter(t=>t.type!=="in"&&t.currency==="دولار").reduce((s,t)=>s+t.amount,0);
    updateDoc(doc(db,"projects",proj.id),{
      recDin, spdDin, recDol, spdDol,
      balDin: recDin - spdDin,
      balDol: recDol - spdDol
    });
  }, [txs]);

  const deleteTx = async (id) => {
    if (!window.confirm("حذف؟")) return;
    const t = txs.find(x=>x.id===id);
    if(!t)return;
    await deleteDoc(doc(db, "project_txs", id));
    // إعادة حساب الميزان بعد الحذف
    const isDolCur = t.currency==="دولار";
    const isIn = t.type==="in";
    const curRecDin = inTxs.filter(x=>x.currency!=="دولار").reduce((s,x)=>s+x.amount,0);
    const curSpdDin = outTxs.filter(x=>x.currency!=="دولار").reduce((s,x)=>s+x.amount,0);
    const curRecDol = inTxs.filter(x=>x.currency==="دولار").reduce((s,x)=>s+x.amount,0);
    const curSpdDol = outTxs.filter(x=>x.currency==="دولار").reduce((s,x)=>s+x.amount,0);
    const newRecDin = !isDolCur && isIn  ? curRecDin - t.amount : curRecDin;
    const newSpdDin = !isDolCur && !isIn ? curSpdDin - t.amount : curSpdDin;
    const newRecDol = isDolCur  && isIn  ? curRecDol - t.amount : curRecDol;
    const newSpdDol = isDolCur  && !isIn ? curSpdDol - t.amount : curSpdDol;
    updateDoc(doc(db,"projects",proj.id),{
      recDin:Math.max(0,newRecDin), spdDin:Math.max(0,newSpdDin),
      recDol:Math.max(0,newRecDol), spdDol:Math.max(0,newSpdDol),
      balDin:Math.max(0,newRecDin)-Math.max(0,newSpdDin),
      balDol:Math.max(0,newRecDol)-Math.max(0,newSpdDol)
    });
  };

  const ts = typeStyle(proj.type);

  const doPrint = (filter) => {
    const f = filter || printFilter;
    const list = (f==="in"?inTxs:f==="out"?outTxs:[...inTxs,...outTxs])
      .sort((a,b)=>{
        const d=(a.date||"").localeCompare(b.date||"");
        if(d!==0)return d;
        return (a.createdAt||"").localeCompare(b.createdAt||"");
      });

    // بناء الصفوف مع الميزان التراكمي لكل عملة
    const buildRows = (currency) => {
      const rows = list.filter(t => !currency || t.currency === currency);
      let bal = 0;
      let n = 0;
      return rows.map(t => {
        n++;
        const isIn = t.type === "in";
        const amt = t.amount || 0;
        bal = isIn ? bal + amt : bal - amt;
        const bg = n%2===0?"#F8FAFC":"#fff";
        const details = [t.receiver, t.note].filter(Boolean).join(" — ") || "—";
        return `<tr style="background:${bg}">
          <td style="color:#64748B;font-size:10px">${t.date||""}</td>
          <td style="text-align:right;padding:7px 10px">${details}</td>
          <td style="color:#DC2626;font-weight:700;text-align:center">${!isIn?fNum(amt):""}</td>
          <td style="color:#16A34A;font-weight:700;text-align:center">${isIn?fNum(amt):""}</td>
          <td style="font-weight:700;text-align:center;color:${bal>=0?"#D97706":"#DC2626"}">${fNum(Math.abs(bal))}</td>
        </tr>`;
      }).join("");
    };

    const rowsDin = buildRows("دينار");
    const rowsDol = buildRows("دولار");
    const balDin = totalIn("دينار")-totalOut("دينار");
    const balDol = totalIn("دولار")-totalOut("دولار");

    const tableStyle = `
      table{width:100%;border-collapse:collapse;margin-bottom:28px}
      thead tr{background:#1E3A5F}
      th{color:#fff;padding:9px 8px;font-size:11px;font-weight:700}
      td{padding:7px 8px;font-size:11px;border-bottom:1px solid #E2E8F0}
      .tot td{background:#F1F5F9;font-weight:700;border-top:2px solid #1E3A5F}
    `;

    const makeTable = (rows, cur, totalIn_, totalOut_, bal_) => {
      const sym = cur==="دولار"?"$":"د.ع";
      return `
      <div style="margin-bottom:6px;font-size:13px;font-weight:700;color:#1E3A5F">
        ${cur==="دولار"?"🇺🇸 الدولار الأمريكي":"🇮🇶 الدينار العراقي"}
      </div>
      <table>
        <thead><tr>
          <th style="width:90px">التاريخ</th>
          <th style="text-align:right">التفاصيل</th>
          <th style="width:110px">المصاريف</th>
          <th style="width:110px">المقبوضات</th>
          <th style="width:110px">الميزان</th>
        </tr></thead>
        <tbody>
          ${rows}
          <tr class="tot">
            <td colspan="2" style="text-align:center">الإجمالي</td>
            <td style="color:#DC2626;text-align:center">${fNum(totalOut_)} ${sym}</td>
            <td style="color:#16A34A;text-align:center">${fNum(totalIn_)} ${sym}</td>
            <td style="color:${bal_>=0?"#D97706":"#DC2626"};text-align:center">${fNum(Math.abs(bal_))} ${sym}</td>
          </tr>
        </tbody>
      </table>`;
    };

    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
<style>
  *{font-family:Tahoma,Arial,sans-serif;box-sizing:border-box}
  body{margin:0;padding:20px;direction:rtl;color:#1E293B}
  .header{text-align:center;border-bottom:3px solid #1E3A5F;padding-bottom:12px;margin-bottom:16px}
  .co{font-size:22px;font-weight:700;letter-spacing:1px}
  .sub{font-size:13px;color:#64748B;margin-top:4px}
  .proj-title{font-size:16px;font-weight:700;margin:12px 0 4px;color:#1E3A5F}
  .proj-info{font-size:11px;color:#64748B;margin-bottom:14px}
  ${tableStyle}
  .footer{margin-top:16px;font-size:10px;color:#94A3B8;
    display:flex;justify-content:space-between;border-top:1px solid #E2E8F0;padding-top:8px}
  @media print{body{padding:12px}}
</style></head><body>

<div class="header">
  <div class="co">شركة باب المشاريع</div>
  <div class="sub">بغداد — العرصات</div>
</div>

<div class="proj-title">
  ${f==="in"?"كشف المقبوضات":f==="out"?"كشف المصاريف":"الكشف الشامل"} — ${proj.name}
</div>
<div class="proj-info">
  ${proj.type?"النوع: "+proj.type+"   ·   ":""}
  ${proj.province?proj.province+(proj.city?" — "+proj.city:"")+"   ·   ":""}
  ${proj.startDate?"بداية: "+proj.startDate+"   ·   ":""}
  ${proj.days?"مدة: "+proj.days+" يوم":""}
</div>

${(f!=="out"&&totalIn("دينار")+totalOut("دينار")>0)||f==="all"?
  makeTable(rowsDin,"دينار",totalIn("دينار"),totalOut("دينار"),balDin):""}
${(f!=="in"&&totalIn("دولار")+totalOut("دولار")>0)||f==="all"?
  makeTable(rowsDol,"دولار",totalIn("دولار"),totalOut("دولار"),balDol):""}

<div class="footer">
  <span>شركة باب المشاريع</span>
  <span>تاريخ الطباعة: ${new Date().toISOString().split("T")[0]}</span>
</div>
</body></html>`;

    const w = window.open("","_blank","width=920,height=750");
    if(!w){alert("السماح بالنوافذ المنبثقة");return;}
    w.document.write(html);w.document.close();w.focus();
    setTimeout(()=>w.print(),700);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9",
      fontFamily: "Tahoma", direction: "rtl" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px" }}>

        {/* رجوع */}
        <button onClick={onBack} style={{ background: "#fff", border: "1px solid #E2E8F0",
          borderRadius: 10, padding: "8px 16px", fontSize: 13, color: "#475569",
          cursor: "pointer", marginBottom: 16, fontFamily: "Tahoma",
          display: "flex", alignItems: "center", gap: 6 }}>
          ← رجوع للمشاريع
        </button>

        {/* بطاقة المشروع */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px",
          marginBottom: 16, border: "1px solid #E2E8F0",
          borderTop: "4px solid " + (ts.color || "#D97706") }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            {proj.type && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px",
                borderRadius: 20, background: ts.bg, color: ts.color }}>
                {ts.icon} {proj.type}
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px",
              borderRadius: 20,
              background: proj.status === "active" ? "#DCFCE7" : "#F1F5F9",
              color: proj.status === "active" ? "#16A34A" : "#64748B" }}>
              {proj.status === "active" ? "● قيد العمل" : "✓ منتهي"}
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1E293B", marginBottom: 6 }}>
            {proj.name}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {proj.startDate && <span style={{ fontSize: 12, color: "#64748B" }}>📅 {proj.startDate}</span>}
            {proj.days > 0  && <span style={{ fontSize: 12, color: "#64748B" }}>⏱️ {proj.days} يوم</span>}
            {proj.valueDin > 0 && <span style={{ fontSize: 12, color: "#D97706", fontWeight: 600 }}>
              🇮🇶 {fNum(proj.valueDin)} د.ع</span>}
            {proj.valueDol > 0 && <span style={{ fontSize: 12, color: "#2563EB", fontWeight: 600 }}>
              🇺🇸 {fNum(proj.valueDol)} $</span>}
          </div>
        </div>

        {/* ملخص مالي */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 16,
          border: "1px solid #E2E8F0", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>
              📊 الملخص المالي
            </div>
            <button onClick={() => setShowPrint(v => !v)} style={{
              background: showPrint ? "#475569" : "#D97706", border: "none",
              borderRadius: 9, padding: "7px 14px", color: "#fff", cursor: "pointer",
              fontSize: 12, fontFamily: "Tahoma", fontWeight: 700 }}>
              {showPrint ? "✕ إغلاق" : "🖨️ طباعة الكشف"}
            </button>
          </div>
          {/* الدينار */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>🇮🇶 الدينار العراقي</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 3 }}>↓ مستلم</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}>{fNum(totalIn("دينار"))} د.ع</div>
              </div>
              <div style={{ background: "#FFF1F2", borderRadius: 10, padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 3 }}>↑ مصروف</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626" }}>{fNum(totalOut("دينار"))} د.ع</div>
              </div>
              <div style={{ background: totalIn("دينار")-totalOut("دينار") >= 0 ? "#FFFBEB" : "#FFF1F2",
                borderRadius: 10, padding: "10px", textAlign: "center",
                border: "2px solid " + (totalIn("دينار")-totalOut("دينار") >= 0 ? "#D97706" : "#DC2626") }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 3 }}>⚖️ الميزان</div>
                <div style={{ fontSize: 13, fontWeight: 700,
                  color: totalIn("دينار")-totalOut("دينار") >= 0 ? "#D97706" : "#DC2626" }}>
                  {totalIn("دينار")-totalOut("دينار") >= 0 ? "+" : ""}{fNum(totalIn("دينار")-totalOut("دينار"))} د.ع
                </div>
              </div>
            </div>
          </div>
          {/* الدولار */}
          <div>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>🇺🇸 الدولار الأمريكي</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 3 }}>↓ مستلم</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#2563EB" }}>{fNum(totalIn("دولار"))} $</div>
              </div>
              <div style={{ background: "#FEF2F2", borderRadius: 10, padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 3 }}>↑ مصروف</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626" }}>{fNum(totalOut("دولار"))} $</div>
              </div>
              <div style={{ background: totalIn("دولار")-totalOut("دولار") >= 0 ? "#EFF6FF" : "#FFF1F2",
                borderRadius: 10, padding: "10px", textAlign: "center",
                border: "2px solid " + (totalIn("دولار")-totalOut("دولار") >= 0 ? "#2563EB" : "#DC2626") }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 3 }}>⚖️ الميزان</div>
                <div style={{ fontSize: 13, fontWeight: 700,
                  color: totalIn("دولار")-totalOut("دولار") >= 0 ? "#2563EB" : "#DC2626" }}>
                  {totalIn("دولار")-totalOut("دولار") >= 0 ? "+" : ""}{fNum(totalIn("دولار")-totalOut("دولار"))} $
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* فلترة الطباعة */}
        {showPrint && (
          <div style={{ background: "#FFFBEB", borderRadius: 14, padding: 16,
            border: "1px solid #D97706", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#D97706", marginBottom: 12 }}>
              🖨️ اختر ما تريد طباعته
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              {[
                ["all","الكل معاً","#1E293B","#F1F5F9"],
                ["in","↓ المستلمات فقط","#16A34A","#F0FDF4"],
                ["out","↑ المصروفات فقط","#DC2626","#FFF1F2"],
              ].map(([v,l,color,bg]) => (
                <button key={v} onClick={() => setPrintFilter(v)} style={{
                  border: "2px solid "+(printFilter===v?color:"#E2E8F0"),
                  borderRadius: 10, padding: "12px 6px", cursor: "pointer",
                  fontFamily: "Tahoma", fontSize: 12, fontWeight: 700,
                  background: printFilter===v?bg:"#fff",
                  color: printFilter===v?color:"#94A3B8"
                }}>{l}</button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
              سيتم طباعة{" "}
              <strong style={{ color: "#1E293B" }}>
                {printFilter==="in"?inTxs.length:printFilter==="out"?outTxs.length:inTxs.length+outTxs.length}
              </strong>
              {printFilter==="in"?" مستلمات":printFilter==="out"?" مصروفات":" (الكل)"}
            </div>
            <button onClick={()=>{ doPrint(printFilter); setShowPrint(false); }}
              style={{ width:"100%", border:"none", borderRadius:10, padding:"12px",
                fontSize:14, fontWeight:700, fontFamily:"Tahoma",
                background:"#D97706", color:"#fff", cursor:"pointer" }}>
              🖨️ طباعة الآن
            </button>
          </div>
        )}

        {/* تبويبات */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          <button onClick={() => { setTab("in"); setShow(false); }} style={{
            border: tab === "in" ? "none" : "1px solid #E2E8F0",
            borderRadius: 10, padding: "12px", cursor: "pointer",
            fontFamily: "Tahoma", fontSize: 14, fontWeight: 700,
            background: tab === "in" ? "#16A34A" : "#fff",
            color: tab === "in" ? "#fff" : "#64748B"
          }}>↓ المبالغ المستلمة ({inTxs.length})</button>
          <button onClick={() => { setTab("out"); setShow(false); }} style={{
            border: tab === "out" ? "none" : "1px solid #E2E8F0",
            borderRadius: 10, padding: "12px", cursor: "pointer",
            fontFamily: "Tahoma", fontSize: 14, fontWeight: 700,
            background: tab === "out" ? "#DC2626" : "#fff",
            color: tab === "out" ? "#fff" : "#64748B"
          }}>↑ المبالغ المصروفة ({outTxs.length})</button>
        </div>

        {/* زر إضافة */}
        <button onClick={() => setShow(v => !v)} style={{
          width: "100%", border: "none", borderRadius: 12, padding: "13px",
          fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Tahoma",
          marginBottom: 14,
          background: show ? "#475569" : tab === "in" ? "#16A34A" : "#DC2626",
          color: "#fff"
        }}>
          {show ? "✕ إلغاء" : tab === "in" ? "+ إضافة مبلغ مستلم" : "+ إضافة مبلغ مصروف"}
        </button>

        {/* فورم السلفة التشغيلية */}
        {showLoan && (
          <div style={{ background:"#FFF7ED", borderRadius:14, padding:18,
            border:"2px solid #F97316", marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#F97316", marginBottom:14 }}>
              💸 سلفة تشغيلية للمشروع
            </div>

            {/* اختيار الصندوق */}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:12, color:"#64748B", fontWeight:600, marginBottom:6 }}>
                الصندوق المُقرض
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6 }}>
                {["إشراف","ديكور","مقاولات","واجهات","عام"].map(f=>{
                  const bal=funds[f]||{din:0,dol:0};
                  return (
                    <button key={f} onClick={()=>lf("fund")(f)} style={{
                      border:"1.5px solid "+(loanForm.fund===f?"#F97316":"#E2E8F0"),
                      borderRadius:9,padding:"8px 4px",cursor:"pointer",
                      fontFamily:"Tahoma",background:loanForm.fund===f?"#FFF7ED":"#fff",
                      textAlign:"center"}}>
                      <div style={{ fontSize:11, fontWeight:700,
                        color:loanForm.fund===f?"#F97316":"#64748B" }}>{f}</div>
                      <div style={{ fontSize:9, color:"#94A3B8", marginTop:1 }}>
                        {fNum(bal.din)} د.ع
                        {bal.dol>0&&" | "+fNum(bal.dol)+" $"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* المبالغ */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              {[{k:"din",l:"مبلغ الدينار",c:"#D97706"},{k:"dol",l:"مبلغ الدولار",c:"#2563EB"}].map(({k,l,cl})=>{
                const bal=funds[loanForm.fund]||{din:0,dol:0};
                const v=Number(loanForm[k])||0;
                const ok=v===0||bal[k]>=v;
                return (
                  <div key={k}>
                    <div style={{ fontSize:12, color:k==="din"?"#D97706":"#2563EB",
                      fontWeight:600, marginBottom:5 }}>{l}</div>
                    <input type="text" inputMode="numeric" placeholder="٠" value={loanForm[k]}
                      onChange={e=>lf(k)(e.target.value.replace(/[^0-9]/g,""))}
                      style={{ width:"100%", border:"1.5px solid "+(v>0&&!ok?"#DC2626":"#CBD5E1"),
                        borderRadius:9, padding:"10px 13px", fontSize:14, outline:"none",
                        fontFamily:"Tahoma", direction:"rtl",
                        boxSizing:"border-box", background:"#fff" }}/>
                    {v>0&&(
                      <div style={{ fontSize:11, marginTop:3, fontWeight:600,
                        color:ok?k==="din"?"#D97706":"#2563EB":"#DC2626" }}>
                        {ok?"✍️ "+w2(v)+" "+(k==="din"?"دينار":"دولار")+"  متبقي: "+fNum(bal[k]-v)+(k==="din"?" د.ع":" $")
                          :"⛔ يتجاوز الرصيد — المتاح: "+fNum(bal[k])+(k==="din"?" د.ع":" $")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              <div>
                <div style={{ fontSize:12, color:"#64748B", fontWeight:600, marginBottom:5 }}>التاريخ</div>
                <input type="date" value={loanForm.date} onChange={e=>lf("date")(e.target.value)}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                    padding:"10px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                    boxSizing:"border-box", background:"#fff" }}/>
              </div>
              <div>
                <div style={{ fontSize:12, color:"#64748B", fontWeight:600, marginBottom:5 }}>السبب</div>
                <input placeholder="عمال، مواد، معدات..." value={loanForm.note}
                  onChange={e=>lf("note")(e.target.value)}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                    padding:"10px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                    direction:"rtl", boxSizing:"border-box", background:"#fff" }}/>
              </div>
            </div>

            <button onClick={giveProjLoan}
              disabled={!Number(loanForm.din)&&!Number(loanForm.dol)}
              style={{ width:"100%", border:"none", borderRadius:10, padding:"13px",
                fontSize:14, fontWeight:700, fontFamily:"Tahoma", cursor:"pointer",
                background:Number(loanForm.din)||Number(loanForm.dol)?"#F97316":"#E2E8F0",
                color:Number(loanForm.din)||Number(loanForm.dol)?"#fff":"#94A3B8" }}>
              ✅ صرف السلفة وتسجيلها في المشروع
            </button>
          </div>
        )}

        {/* فورم الإضافة */}
        {show && (
          <div style={{ background: "#fff", borderRadius: 14, padding: 18,
            border: "1px solid #E2E8F0", marginBottom: 16 }}>

            {/* العملة */}
            {tab === "out" && (
              <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 14px",
                marginBottom: 12, border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}>
                  💰 المتاح للصرف
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#D97706" }}>
                    {fNum(Math.max(0, totalIn("دينار") - totalOut("دينار")))} د.ع
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#2563EB" }}>
                    {fNum(Math.max(0, totalIn("دولار") - totalOut("دولار")))} $
                  </span>
                </div>
              </div>
            )}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 8 }}>
              العملة
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {["دينار","دولار"].map(cur => (
                <button key={cur} onClick={() => sf("currency")(cur)} style={{
                  flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer",
                  fontFamily: "Tahoma", fontSize: 13, fontWeight: 700,
                  border: "2px solid " + (form.currency === cur ? (cur === "دينار" ? "#16A34A" : "#2563EB") : "#E2E8F0"),
                  background: form.currency === cur ? (cur === "دينار" ? "#F0FDF4" : "#EFF6FF") : "#fff",
                  color: form.currency === cur ? (cur === "دينار" ? "#16A34A" : "#2563EB") : "#94A3B8"
                }}>
                  {cur === "دينار" ? "🇮🇶 دينار" : "🇺🇸 دولار"}
                </button>
              ))}
            </div>

            {/* المبلغ */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              المبلغ *
            </div>
            <input placeholder="٠" value={form.amount} inputMode="numeric"
              onChange={e => sf("amount")(e.target.value.replace(/[^0-9]/g, ""))}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 4, boxSizing: "border-box",
                background: "#F8FAFC", color: "#1E293B",
                MozAppearance: "textfield", WebkitAppearance: "none" }}/>
            {amt > 0 && (
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12,
                color: form.currency === "دينار" ? "#16A34A" : "#2563EB" }}>
                ✍️ {w2(amt)} {form.currency === "دينار" ? "دينار عراقي" : "دولار أمريكي"}
                {" — "}{fNum(amt)} {form.currency === "دينار" ? "د.ع" : "$"}
              </div>
            )}
            {!amt && <div style={{ marginBottom: 12 }}/>}

            {/* المستلم */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              {tab === "in" ? "المستلم *" : "صُرف على *"}
            </div>
            <input placeholder={tab === "in" ? "اسم المستلم..." : "وجهة الصرف..."}
              value={form.receiver}
              onChange={e => sf("receiver")(e.target.value)}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 14, boxSizing: "border-box",
                background: "#F8FAFC", color: "#1E293B" }}/>

            {/* التاريخ */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              التاريخ *
            </div>
            <input type="date" value={form.date}
              onChange={e => sf("date")(e.target.value)}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 14, boxSizing: "border-box",
                background: "#F8FAFC", color: "#1E293B" }}/>

            {/* الملاحظات */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              ملاحظات
            </div>
            <textarea placeholder="أي تفاصيل إضافية..."
              value={form.note}
              onChange={e => sf("note")(e.target.value)}
              rows={3}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 14, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 16, boxSizing: "border-box",
                background: "#F8FAFC", color: "#1E293B", resize: "none" }}/>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <button onClick={addTx} disabled={!amt || !form.receiver.trim()} style={{
                border: "none", borderRadius: 10, padding: "13px",
                fontSize: 14, fontWeight: 700, fontFamily: "Tahoma",
                cursor: amt && form.receiver.trim() ? "pointer" : "not-allowed",
                background: amt && form.receiver.trim()
                  ? (tab === "in" ? "#16A34A" : "#DC2626") : "#E2E8F0",
                color: amt && form.receiver.trim() ? "#fff" : "#94A3B8"
              }}>
                {tab === "in" ? "✅ تسجيل المبلغ المستلم" : "✅ تسجيل المبلغ المصروف"}
              </button>
              {amt > 0 && form.receiver.trim() && (
                <button onClick={() => {
                  const isDol = form.currency === "دولار";
                  const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
<style>*{font-family:Tahoma}body{margin:30px;direction:rtl;max-width:400px}
.top{text-align:center;border-bottom:2px dashed #E2E8F0;padding-bottom:14px;margin-bottom:14px}
.co{font-size:18px;font-weight:700;color:#1E293B}.ca{font-size:11px;color:#64748B;margin-top:3px}
.title{font-size:14px;font-weight:700;color:${tab==="in"?"#16A34A":"#DC2626"};margin:14px 0 10px}
.row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #F1F5F9}
.lbl{font-size:12px;color:#64748B}.val{font-size:12px;font-weight:700;color:#1E293B}
.amount{font-size:22px;font-weight:700;text-align:center;margin:14px 0;
  color:${tab==="in"?"#16A34A":"#DC2626"}}
.footer{text-align:center;font-size:10px;color:#94A3B8;margin-top:16px;border-top:2px dashed #E2E8F0;padding-top:10px}
</style></head><body>
<div class="top">
  <div class="co">شركة باب المشاريع</div>
  <div class="ca">بغداد</div>
</div>
<div class="title">${tab==="in"?"🧾 إيصال استلام":"🧾 إيصال صرف"}</div>
<div class="amount">${tab==="in"?"+":"-"}${fNum(amt)} ${isDol?"$":"د.ع"}</div>
<div style="font-size:12px;color:#64748B;text-align:center;margin-bottom:12px">
  ${w2(amt)} ${isDol?"دولار أمريكي":"دينار عراقي"}
</div>
<div class="row"><span class="lbl">المشروع</span><span class="val">${proj.name}</span></div>
<div class="row"><span class="lbl">${tab==="in"?"المستلم":"صُرف على"}</span><span class="val">${form.receiver}</span></div>
<div class="row"><span class="lbl">التاريخ</span><span class="val">${form.date}</span></div>
${form.note?`<div class="row"><span class="lbl">ملاحظة</span><span class="val">${form.note}</span></div>`:""}
<div class="footer">طُبع: ${new Date().toISOString().split("T")[0]}</div>
</body></html>`;
                  const w = window.open("","_blank","width=500,height=600");
                  if(!w){alert("السماح بالنوافذ المنبثقة");return;}
                  w.document.write(html);w.document.close();w.focus();
                  setTimeout(()=>w.print(),600);
                }} style={{ border: "none", borderRadius: 10, padding: "13px 14px",
                  background: "#F0F9FF", border: "1px solid #0EA5E9",
                  color: "#0EA5E9", cursor: "pointer", fontSize: 13,
                  fontFamily: "Tahoma", fontWeight: 700, whiteSpace: "nowrap" }}>
                  🖨️ إيصال
                </button>
              )}
            </div>
          </div>
        )}

        {/* قائمة الحركات */}
        {(tab === "in" ? inTxs : outTxs).length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: "#94A3B8",
            background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0" }}>
            {tab === "in" ? "ما في مبالغ مستلمة بعد" : "ما في مبالغ مصروفة بعد"}
          </div>
        ) : (
          (tab === "in" ? inTxs : outTxs).map(t => (
            <div key={t.id} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px",
              marginBottom: 10, border: "1px solid #E2E8F0",
              borderRight: "5px solid " + (tab === "in" ? "#16A34A" : "#DC2626") }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  {/* المبلغ + العملة */}
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4,
                    color: tab === "in" ? "#16A34A" : "#DC2626" }}>
                    {tab === "in" ? "↓ " : "↑ "}
                    {fNum(t.amount)} {t.currency === "دينار" ? "د.ع" : "$"}
                  </div>
                  {/* كتابة */}
                  <div style={{ fontSize: 11, color: "#64748B", marginBottom: 6 }}>
                    ✍️ {w2(t.amount)} {t.currency === "دينار" ? "دينار" : "دولار"}
                  </div>
                  {/* العملة badge */}
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px",
                    borderRadius: 20, marginBottom: 6, display: "inline-block",
                    background: t.currency === "دينار" ? "#F0FDF4" : "#EFF6FF",
                    color: t.currency === "دينار" ? "#16A34A" : "#2563EB" }}>
                    {t.currency === "دينار" ? "🇮🇶 دينار" : "🇺🇸 دولار"}
                  </span>
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 12, color: "#1E293B", fontWeight: 600 }}>
                      👤 {t.receiver}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 3 }}>
                      📅 {t.date}
                    </div>
                    {t.note && (
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 4,
                        background: "#F8FAFC", borderRadius: 7, padding: "5px 8px" }}>
                        📝 {t.note}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => deleteTx(t.id)} style={{
                  background: "none", border: "none", color: "#DC2626",
                  cursor: "pointer", fontSize: 13, fontFamily: "Tahoma",
                  fontWeight: 600, marginRight: 8
                }}>🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── شاشة إنهاء وتوزيع الأرباح ───────────────────────────
function ClosingModal({ proj, funds, onConfirm, onCancel }) {
  const [loans, setLoans] = React.useState([]);

  React.useEffect(()=>{
    return onSnapshot(
      query(collection(db,"project_loans"),
        where("projectId","==",proj.id),where("status","==","open")),
      snap=>setLoans(snap.docs.map(d=>({id:d.id,...d.data()})))
    );
  },[proj.id]);

  const loanTotalDin = loans.reduce((s,l)=>s+(l.din||0),0);
  const loanTotalDol = loans.reduce((s,l)=>s+(l.dol||0),0);

  // الميزان بعد خصم السلف
  const rawDin = proj.balDin || 0;
  const rawDol = proj.balDol || 0;
  const balDin = Math.max(0, rawDin - loanTotalDin);
  const balDol = Math.max(0, rawDol - loanTotalDol);
  const ts = typeStyle(proj.type);

  const FUNDS = [
    { fund: "رأس_المال",  label: "💼 صندوق رأس المال",  color: "#059669", bg: "#ECFDF5" },
    { fund: "عام",        label: "🏦 الصندوق العام",    color: "#D97706", bg: "#FFFBEB" },
    { fund: proj.type,    label: (ts.icon||"")+" صندوق "+proj.type, color: ts.color||"#7C3AED", bg: ts.bg||"#F5F3FF" },
    { fund: "شركاء",      label: "👥 صندوق أرباح الشركاء", color: "#9333EA", bg: "#FAF5FF" },
  ];

  const [pcts, setPcts] = React.useState({ "رأس_المال": 0, "عام": 0, [proj.type]: 0, "شركاء": 0 });
  const [loading, setLoading] = React.useState(false);
  const total = Object.values(pcts).reduce((s, v) => s + (Number(v) || 0), 0);
  const valid = total === 100 && (balDin + balDol > 0);

  const set = (fund, val) => {
    const n = Math.min(100, Math.max(0, Number(val) || 0));
    setPcts(p => ({ ...p, [fund]: n }));
  };

  const handleConfirm = async () => {
    if (!valid || loading) return;
    setLoading(true);
    const dists = FUNDS.map(f => ({ fund: f.fund, label: f.label, pct: Number(pcts[f.fund]) || 0 }));
    await onConfirm(proj, dists);
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#1E293B", fontFamily:"Tahoma",
      direction:"rtl", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:480,
        maxHeight:"94vh", overflow:"auto", boxShadow:"0 24px 80px rgba(0,0,0,0.4)" }}>

        {/* هيدر */}
        <div style={{ background:"linear-gradient(135deg,#1E293B,#334155)",
          borderRadius:"20px 20px 0 0", padding:"20px 24px" }}>
          <div style={{ fontSize:22, marginBottom:6 }}>🏁</div>
          <div style={{ fontSize:18, fontWeight:700, color:"#fff", marginBottom:4 }}>
            إنهاء المشروع وتوزيع الأرباح
          </div>
          <div style={{ fontSize:13, color:"#94A3B8" }}>{proj.name}</div>
        </div>

        <div style={{ padding:"20px 24px" }}>

          {/* السلف التشغيلية المستحقة */}
          {loans.length > 0 && (
            <div style={{ background:"#FFF7ED", borderRadius:12, padding:14,
              border:"2px solid #F97316", marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#F97316", marginBottom:10 }}>
                ⚠️ سلف تشغيلية تُسدد أولاً ({loans.length})
              </div>
              {loans.map(l=>(
                <div key={l.id} style={{ display:"flex", justifyContent:"space-between",
                  padding:"8px 0", borderBottom:"1px solid #FED7AA", fontSize:12 }}>
                  <span style={{ color:"#92400E" }}>← صندوق {l.fund} · {l.date}</span>
                  <div>
                    {(l.din||0)>0&&<span style={{ fontWeight:700, color:"#DC2626" }}>{fNum(l.din)} د.ع</span>}
                    {(l.dol||0)>0&&<span style={{ fontWeight:700, color:"#2563EB", marginRight:8 }}> {fNum(l.dol)} $</span>}
                  </div>
                </div>
              ))}
              <div style={{ marginTop:8, display:"flex", justifyContent:"space-between",
                fontSize:12, fontWeight:700 }}>
                <span style={{ color:"#92400E" }}>إجمالي السلف المستحقة</span>
                <div>
                  {loanTotalDin>0&&<span style={{ color:"#DC2626" }}>{fNum(loanTotalDin)} د.ع</span>}
                  {loanTotalDol>0&&<span style={{ color:"#2563EB", marginRight:8 }}> {fNum(loanTotalDol)} $</span>}
                </div>
              </div>
            </div>
          )}

          {/* الأرباح بعد خصم السلف */}
          <div style={{ background:"#F8FAFC", borderRadius:12, padding:14, marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#64748B", marginBottom:10 }}>
              {loans.length>0?"💰 الصافي المتاح للتوزيع (بعد خصم السلف)":"💰 الأرباح المراد توزيعها"}
            </div>
            {loans.length>0&&(
              <div style={{ fontSize:11, color:"#94A3B8", marginBottom:8 }}>
                الميزان الكلي {fNum(rawDin)} د.ع − السلف {fNum(loanTotalDin)} د.ع = <strong style={{color:"#16A34A"}}>{fNum(balDin)} د.ع</strong>
              </div>
            )}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <div style={{ background:"#FFFBEB", borderRadius:10, padding:"10px",
                textAlign:"center", border:"2px solid #D97706" }}>
                <div style={{ fontSize:10, color:"#64748B", marginBottom:3 }}>🇮🇶 دينار للتوزيع</div>
                <div style={{ fontSize:16, fontWeight:700, color:"#D97706" }}>
                  {fNum(balDin)} د.ع
                </div>
              </div>
              <div style={{ background:"#EFF6FF", borderRadius:10, padding:"10px",
                textAlign:"center", border:"2px solid #2563EB" }}>
                <div style={{ fontSize:10, color:"#64748B", marginBottom:3 }}>🇺🇸 دولار للتوزيع</div>
                <div style={{ fontSize:16, fontWeight:700, color:"#2563EB" }}>
                  {fNum(balDol)} $
                </div>
              </div>
            </div>
          </div>

          {/* التوزيع */}
          <div style={{ fontSize:13, fontWeight:700, color:"#1E293B", marginBottom:14 }}>
            حدد النسبة لكل صندوق (المجموع = 100%)
          </div>
          {FUNDS.map(({ fund, label, color, bg }) => {
            const pct = Number(pcts[fund]) || 0;
            const shareDin = Math.round(balDin * pct / 100);
            const shareDol = Math.round(balDol * pct / 100);
            return (
              <div key={fund} style={{ background: bg, borderRadius: 14, padding: "14px 16px",
                marginBottom: 10, border: "1.5px solid " + color + "40" }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color }}>{label}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <input type="number" inputMode="numeric" min="0" max="100"
                      value={pcts[fund] === 0 ? "" : pcts[fund]}
                      onChange={e => set(fund, e.target.value)}
                      placeholder="0"
                      style={{ width:70, border:"2px solid "+color, borderRadius:9,
                        padding:"8px", fontSize:20, fontWeight:700, textAlign:"center",
                        outline:"none", fontFamily:"Tahoma", color,
                        background:"#fff", MozAppearance:"textfield" }}/>
                    <span style={{ fontSize:18, fontWeight:700, color }}>%</span>
                  </div>
                </div>
                {pct > 0 && (
                  <div style={{ fontSize:12 }}>
                    {balDin > 0 && (
                      <div style={{ fontWeight:700, color, marginBottom:2 }}>
                        {fNum(shareDin)} د.ع
                        <span style={{ fontWeight:400, color:"#64748B", marginRight:6 }}>
                          ✍️ {w2(shareDin)} دينار
                        </span>
                      </div>
                    )}
                    {balDol > 0 && (
                      <div style={{ fontWeight:700, color:"#2563EB" }}>
                        {fNum(shareDol)} $
                        <span style={{ fontWeight:400, color:"#64748B", marginRight:6 }}>
                          ✍️ {w2(shareDol)} دولار
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* مجموع النسب */}
          <div style={{ borderRadius:10, padding:"10px 14px", marginBottom:16, textAlign:"center",
            background: total === 100 ? "#F0FDF4" : total > 100 ? "#FFF1F2" : "#F8FAFC",
            border: "1.5px solid " + (total===100?"#16A34A":total>100?"#DC2626":"#E2E8F0") }}>
            <span style={{ fontSize:14, fontWeight:700,
              color: total===100?"#16A34A":total>100?"#DC2626":"#64748B" }}>
              المجموع: {total}%
              {total === 100 ? " ✅" : total > 100 ? " ⚠️ تجاوز 100%" : " (يجب أن يكون 100%)"}
            </span>
          </div>

          {/* أزرار */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <button onClick={onCancel} style={{ border:"1px solid #E2E8F0", borderRadius:10,
              padding:"13px", fontSize:14, fontWeight:700, fontFamily:"Tahoma",
              background:"#fff", color:"#64748B", cursor:"pointer" }}>
              إلغاء
            </button>
            <button onClick={handleConfirm} disabled={!valid || loading} style={{
              border:"none", borderRadius:10, padding:"13px", fontSize:14, fontWeight:700,
              fontFamily:"Tahoma", cursor: valid&&!loading?"pointer":"not-allowed",
              background: valid?"#16A34A":"#E2E8F0", color: valid?"#fff":"#94A3B8" }}>
              {loading ? "جاري التوزيع..." : "🏁 تأكيد الإنهاء والتوزيع"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── صفحة الشريك ───────────────────────────────────────
function PartnerPage({ partner, funds, onBack, onWithdraw }) {
  const pf = funds["partner_" + partner.id] || { din: 0, dol: 0 };
  const [txs, setTxs] = useState([]);
  const [wDin, setWDin] = useState("");
  const [wDol, setWDol] = useState("");
  const [wNote, setWNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [showStatement, setShowStatement] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const amtDin = Number(wDin) || 0;
  const amtDol = Number(wDol) || 0;
  const valid = (amtDin > 0 || amtDol > 0) && amtDin <= pf.din && amtDol <= pf.dol;

  // جلب سجل الحركات
  useEffect(() => {
    return onSnapshot(
      query(collection(db, "partner_txs"),
        where("partnerId","==","partner_"+partner.id)),
      snap => {
        const list = snap.docs.map(d=>({id:d.id,...d.data()}));
        list.sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
        setTxs(list);
      }
    );
  }, [partner.id]);

  const totalDep = { din: txs.filter(t=>t.type==="إيداع").reduce((s,t)=>s+(t.din||0),0),
                     dol: txs.filter(t=>t.type==="إيداع").reduce((s,t)=>s+(t.dol||0),0) };
  const totalWit = { din: txs.filter(t=>t.type==="سحب").reduce((s,t)=>s+(t.din||0),0),
                     dol: txs.filter(t=>t.type==="سحب").reduce((s,t)=>s+(t.dol||0),0) };

  const printReceipt = (din, dol, note) => {
    const today = new Date().toISOString().split("T")[0];
    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
<style>*{font-family:Tahoma}body{margin:30px;direction:rtl;max-width:420px}
.top{text-align:center;border-bottom:3px solid ${partner.color};padding-bottom:14px;margin-bottom:16px}
.co{font-size:18px;font-weight:700}.ca{font-size:11px;color:#64748B}
.title{font-size:15px;font-weight:700;color:${partner.color};margin:14px 0 10px}
.amount{font-size:26px;font-weight:700;text-align:center;margin:14px 0;color:#DC2626}
.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F1F5F9}
.lbl{font-size:12px;color:#64748B}.val{font-size:12px;font-weight:700;color:#1E293B}
.summary{background:#F8FAFC;border-radius:10px;padding:12px;margin:14px 0}
.srow{display:flex;justify-content:space-between;margin-bottom:6px}
.slbl{font-size:11px;color:#64748B}.sval{font-size:12px;font-weight:700}
.footer{text-align:center;font-size:10px;color:#94A3B8;margin-top:16px;
  border-top:2px dashed #E2E8F0;padding-top:10px}
</style></head><body>
<div class="top">
  <div class="co">شركة باب المشاريع</div>
  <div class="ca">بغداد — العرصات</div>
</div>
<div class="title">↑ إيصال سحب — ${partner.name}</div>
<div class="amount">${din > 0 ? fNum(din) + " د.ع" : ""}${din > 0 && dol > 0 ? " | " : ""}${dol > 0 ? fNum(dol) + " $" : ""}</div>
${din > 0 ? `<div style="text-align:center;font-size:12px;color:#64748B;margin-bottom:8px">✍️ ${w2(din)} دينار عراقي</div>` : ""}
${dol > 0 ? `<div style="text-align:center;font-size:12px;color:#64748B;margin-bottom:8px">✍️ ${w2(dol)} دولار أمريكي</div>` : ""}
<div class="row"><span class="lbl">الشريك</span><span class="val">${partner.name}</span></div>
<div class="row"><span class="lbl">الحصة</span><span class="val">${partner.pct}%</span></div>
<div class="row"><span class="lbl">التاريخ</span><span class="val">${today}</span></div>
${note ? `<div class="row"><span class="lbl">ملاحظة</span><span class="val">${note}</span></div>` : ""}
<div class="summary">
  <div style="font-size:11px;font-weight:700;color:#64748B;margin-bottom:8px">📊 الجرد المالي للشريك</div>
  <div class="srow"><span class="slbl">إجمالي الإيداعات (دينار)</span>
    <span class="sval" style="color:#16A34A">+${fNum(totalDep.din)} د.ع</span></div>
  <div class="srow"><span class="slbl">إجمالي السحوبات (دينار)</span>
    <span class="sval" style="color:#DC2626">-${fNum(totalWit.din + din)} د.ع</span></div>
  <div class="srow"><span class="slbl" style="font-weight:700">الرصيد المتبقي (دينار)</span>
    <span class="sval" style="color:${partner.color}">${fNum(Math.max(0,pf.din-din))} د.ع</span></div>
  ${totalDep.dol > 0 || dol > 0 ? `
  <div style="border-top:1px solid #E2E8F0;margin:8px 0"></div>
  <div class="srow"><span class="slbl">إجمالي الإيداعات (دولار)</span>
    <span class="sval" style="color:#16A34A">+${fNum(totalDep.dol)} $</span></div>
  <div class="srow"><span class="slbl">إجمالي السحوبات (دولار)</span>
    <span class="sval" style="color:#DC2626">-${fNum(totalWit.dol + dol)} $</span></div>
  <div class="srow"><span class="slbl" style="font-weight:700">الرصيد المتبقي (دولار)</span>
    <span class="sval" style="color:#2563EB">${fNum(Math.max(0,pf.dol-dol))} $</span></div>` : ""}
</div>
<div class="footer">شركة باب المشاريع — طُبع: ${today}</div>
</body></html>`;
    const w = window.open("","_blank","width=500,height=700");
    if(!w){alert("السماح بالنوافذ المنبثقة");return;}
    w.document.write(html);w.document.close();w.focus();
    setTimeout(()=>w.print(),600);
  };

  const printStatement = () => {
    // كل الحركات (إيداع + سحب) مفلترة بالتاريخ
    const filtered = txs.filter(t => {
      if (fromDate && t.date < fromDate) return false;
      if (toDate && t.date > toDate) return false;
      return true;
    }).sort((a,b) => (a.date||"").localeCompare(b.date||"")||(a.createdAt||"").localeCompare(b.createdAt||""));

    if (filtered.length === 0) { alert("ما في حركات في هذه الفترة"); return; }

    let balDin = 0, balDol = 0, n = 0;
    let totDepDin=0, totDepDol=0, totWitDin=0, totWitDol=0;

    const rows = filtered.map(t => {
      n++;
      const isIn = t.type === "إيداع";
      const din = t.din || 0;
      const dol = t.dol || 0;
      if (isIn) { balDin += din; balDol += dol; totDepDin += din; totDepDol += dol; }
      else       { balDin -= din; balDol -= dol; totWitDin += din; totWitDol += dol; }
      const bg = n%2===0?"#F8FAFC":"#fff";
      return `<tr style="background:${bg}">
        <td>${n}</td>
        <td>${t.date||""}</td>
        <td style="text-align:right;padding:7px 10px">${t.note||"—"}</td>
        <td style="color:#16A34A;font-weight:700">${isIn&&din>0?"+"+fNum(din)+" د.ع":""}</td>
        <td style="color:#DC2626;font-weight:700">${!isIn&&din>0?"-"+fNum(din)+" د.ع":""}</td>
        <td style="color:#16A34A;font-weight:700">${isIn&&dol>0?"+"+fNum(dol)+" $":""}</td>
        <td style="color:#DC2626;font-weight:700">${!isIn&&dol>0?"-"+fNum(dol)+" $":""}</td>
        <td style="font-weight:700;color:${balDin>=0?"#D97706":"#DC2626"}">${fNum(balDin)} د.ع</td>
      </tr>`;
    }).join("");

    const today = new Date().toISOString().split("T")[0];
    const period = (fromDate||"البداية") + " — " + (toDate||"اليوم");

    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
<style>
*{font-family:Tahoma,Arial}body{margin:20px;direction:rtl}
.hdr{border-bottom:3px solid ${partner.color};padding-bottom:12px;margin-bottom:14px;text-align:center}
.co{font-size:20px;font-weight:700}.ca{font-size:11px;color:#64748B}
.title{font-size:16px;font-weight:700;color:${partner.color};margin:12px 0 4px}
.info{font-size:11px;color:#64748B;margin-bottom:14px}
.sg{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}
.sb{border-radius:9px;padding:10px;text-align:center}
.sl{font-size:9px;color:#64748B;margin-bottom:3px}.sv{font-size:13px;font-weight:700}
table{width:100%;border-collapse:collapse}
thead tr{background:${partner.color}}th{color:#fff;padding:8px 6px;font-size:10px}
td{padding:7px 6px;font-size:10px;text-align:center;border-bottom:1px solid #F1F5F9}
.tot td{background:#F1F5F9;font-weight:700;border-top:2px solid ${partner.color}}
.ft{margin-top:14px;font-size:10px;color:#94A3B8;display:flex;justify-content:space-between;border-top:1px dashed #E2E8F0;padding-top:8px}
</style></head><body>
<div class="hdr">
  <div class="co">شركة باب المشاريع</div>
  <div class="ca">بغداد — العرصات</div>
</div>
<div class="title">📋 كشف الحساب الشامل — ${partner.name}</div>
<div class="info">الحصة: ${partner.pct}% &nbsp;·&nbsp; الفترة: ${period} &nbsp;·&nbsp; ${filtered.length} حركة</div>
<div class="sg">
  <div class="sb" style="background:#F0FDF4;border:1px solid #16A34A20">
    <div class="sl">↓ إجمالي الإيداعات دينار</div>
    <div class="sv" style="color:#16A34A">+${fNum(totDepDin)} د.ع</div>
  </div>
  <div class="sb" style="background:#FFF1F2;border:1px solid #DC262620">
    <div class="sl">↑ إجمالي السحوبات دينار</div>
    <div class="sv" style="color:#DC2626">-${fNum(totWitDin)} د.ع</div>
  </div>
  <div class="sb" style="background:#EFF6FF;border:1px solid #2563EB20">
    <div class="sl">↓ إجمالي الإيداعات دولار</div>
    <div class="sv" style="color:#2563EB">+${fNum(totDepDol)} $</div>
  </div>
  <div class="sb" style="background:${partner.bg};border:2px solid ${partner.color}">
    <div class="sl">⚖️ الرصيد الحالي</div>
    <div class="sv" style="color:${partner.color}">${fNum(pf.din)} د.ع</div>
    ${pf.dol>0?`<div style="font-size:11px;font-weight:700;color:#2563EB">${fNum(pf.dol)} $</div>`:""}
  </div>
</div>
<table>
  <thead><tr>
    <th>#</th><th>التاريخ</th><th style="text-align:right">البيان</th>
    <th>إيداع دينار</th><th>سحب دينار</th>
    <th>إيداع دولار</th><th>سحب دولار</th>
    <th>الميزان</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tr class="tot">
    <td colspan="2">الإجمالي</td><td></td>
    <td style="color:#16A34A">+${fNum(totDepDin)} د.ع</td>
    <td style="color:#DC2626">-${fNum(totWitDin)} د.ع</td>
    <td style="color:#16A34A">+${fNum(totDepDol)} $</td>
    <td style="color:#DC2626">-${fNum(totWitDol)} $</td>
    <td style="color:${partner.color}">${fNum(pf.din)} د.ع</td>
  </tr>
</table>
<div class="ft">
  <span>${partner.name} — شركة باب المشاريع</span>
  <span>طُبع: ${today}</span>
</div>
</body></html>`;

    const w = window.open("","_blank","width=1000,height=750");
    if(!w){alert("السماح بالنوافذ المنبثقة");return;}
    w.document.write(html);w.document.close();w.focus();
    setTimeout(()=>w.print(),700);
  };

  const doWithdraw = async () => {
    if (!valid || saving) return;
    setSaving(true);
    await onWithdraw(partner.id, amtDin, amtDol, wNote);
    setSaving(false);
    setOk(true);
    setTimeout(() => { setOk(false); setWDin(""); setWDol(""); setWNote(""); }, 1500);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9",
      fontFamily:"Tahoma", direction:"rtl" }}>
      <div style={{ maxWidth:560, margin:"0 auto", padding:"22px 16px" }}>

        <button onClick={onBack} style={{ background:"#fff", border:"1px solid #E2E8F0",
          borderRadius:10, padding:"8px 16px", fontSize:13, color:"#475569",
          cursor:"pointer", marginBottom:16, fontFamily:"Tahoma",
          display:"flex", alignItems:"center", gap:6 }}>← رجوع</button>

        {/* بطاقة الشريك */}
        <div style={{ background:partner.bg, borderRadius:16, padding:"20px",
          border:"2px solid "+partner.color+"40", marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:20, fontWeight:700, color:partner.color }}>{partner.name}</div>
              <div style={{ fontSize:13, color:"#64748B", marginTop:3 }}>حصة {partner.pct}%</div>
            </div>
            <div style={{ width:50, height:50, borderRadius:14, background:"#fff",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>👤</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div style={{ background:"#fff", borderRadius:12, padding:"14px",
              textAlign:"center", border:"1.5px solid "+partner.color+"30" }}>
              <div style={{ fontSize:10, color:"#64748B", marginBottom:4 }}>💰 رصيد الدينار</div>
              <div style={{ fontSize:20, fontWeight:700, color:partner.color }}>{fNum(pf.din)}</div>
              <div style={{ fontSize:12, color:"#64748B" }}>د.ع</div>
            </div>
            <div style={{ background:"#EFF6FF", borderRadius:12, padding:"14px",
              textAlign:"center", border:"2px solid #2563EB40" }}>
              <div style={{ fontSize:10, color:"#64748B", marginBottom:4 }}>🇺🇸 رصيد الدولار</div>
              <div style={{ fontSize:20, fontWeight:700, color:"#2563EB" }}>{fNum(pf.dol)}</div>
              <div style={{ fontSize:12, color:"#64748B" }}>$</div>
            </div>
          </div>
        </div>

        {/* سحب */}
        <div style={{ background:"#fff", borderRadius:14, padding:"18px 20px",
          border:"1px solid #E2E8F0", marginBottom:14 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#1E293B", marginBottom:14 }}>
            ↑ سحب من الرصيد
          </div>
          {ok ? (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ fontSize:40 }}>✅</div>
              <div style={{ fontSize:16, fontWeight:700, color:"#16A34A", marginTop:8 }}>
                تم السحب وطباعة الإيصال
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:12, color:"#16A34A", fontWeight:700, marginBottom:6 }}>
                  🇮🇶 مبلغ الدينار
                </div>
                <input type="text" inputMode="numeric" placeholder="٠" value={wDin}
                  onChange={e=>setWDin(e.target.value.replace(/[^0-9]/g,""))}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:10,
                    padding:"12px 14px", fontSize:15, outline:"none", fontFamily:"Tahoma",
                    direction:"rtl", boxSizing:"border-box", background:"#F8FAFC" }}/>
                {amtDin > 0 && <div style={{ fontSize:12, fontWeight:600, marginTop:4,
                  color: amtDin>pf.din?"#DC2626":"#16A34A" }}>
                  {amtDin>pf.din ? "⛔ يتجاوز الرصيد! المتاح: "+fNum(pf.din)+" د.ع"
                    : "✍️ "+w2(amtDin)+" دينار — المتبقي: "+fNum(pf.din-amtDin)+" د.ع"}
                </div>}
              </div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:12, color:"#2563EB", fontWeight:700, marginBottom:6 }}>
                  🇺🇸 مبلغ الدولار
                </div>
                <input type="text" inputMode="numeric" placeholder="٠" value={wDol}
                  onChange={e=>setWDol(e.target.value.replace(/[^0-9]/g,""))}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:10,
                    padding:"12px 14px", fontSize:15, outline:"none", fontFamily:"Tahoma",
                    direction:"rtl", boxSizing:"border-box", background:"#F8FAFC" }}/>
                {amtDol > 0 && <div style={{ fontSize:12, fontWeight:600, marginTop:4,
                  color: amtDol>pf.dol?"#DC2626":"#2563EB" }}>
                  {amtDol>pf.dol ? "⛔ يتجاوز الرصيد! المتاح: "+fNum(pf.dol)+" $"
                    : "✍️ "+w2(amtDol)+" دولار — المتبقي: "+fNum(pf.dol-amtDol)+" $"}
                </div>}
              </div>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, color:"#64748B", fontWeight:700, marginBottom:6 }}>
                  ملاحظة
                </div>
                <input placeholder="سبب السحب..." value={wNote}
                  onChange={e=>setWNote(e.target.value)}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:10,
                    padding:"12px 14px", fontSize:14, outline:"none", fontFamily:"Tahoma",
                    direction:"rtl", boxSizing:"border-box", background:"#F8FAFC" }}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8 }}>
                <button onClick={doWithdraw} disabled={!valid||saving} style={{
                  border:"none", borderRadius:12, padding:"14px",
                  fontSize:15, fontWeight:700, fontFamily:"Tahoma",
                  cursor:valid&&!saving?"pointer":"not-allowed",
                  background:valid?partner.color:"#E2E8F0",
                  color:valid?"#fff":"#94A3B8" }}>
                  {saving?"جاري...":"✅ تأكيد السحب"}
                </button>
                {valid && (
                  <button onClick={()=>printReceipt(amtDin,amtDol,wNote)}
                    style={{ border:"1px solid "+partner.color, borderRadius:12,
                      padding:"14px 16px", fontSize:14, fontWeight:700,
                      fontFamily:"Tahoma", background:"#fff",
                      color:partner.color, cursor:"pointer", whiteSpace:"nowrap" }}>
                    🖨️ إيصال
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* زر كشف حساب السحوبات */}
        <div style={{ background:"#fff", borderRadius:14, padding:"16px 20px",
          border:"1px solid #E2E8F0", marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom: showStatement?14:0 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#1E293B" }}>
              🖨️ كشف الحساب الشامل
            </div>
            <button onClick={()=>setShowStatement(v=>!v)} style={{
              background:showStatement?"#475569":partner.color, border:"none",
              borderRadius:9, padding:"8px 16px", color:"#fff", cursor:"pointer",
              fontSize:13, fontFamily:"Tahoma", fontWeight:700 }}>
              {showStatement?"✕ إغلاق":"📊 فتح الكشف"}
            </button>
          </div>
          {showStatement && (
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:5 }}>
                    من تاريخ
                  </div>
                  <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}
                    style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                      padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                      boxSizing:"border-box", background:"#F8FAFC" }}/>
                </div>
                <div>
                  <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:5 }}>
                    إلى تاريخ
                  </div>
                  <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)}
                    style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                      padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                      boxSizing:"border-box", background:"#F8FAFC" }}/>
                </div>
              </div>
              {(fromDate||toDate) && (
                <button onClick={()=>{setFromDate("");setToDate("");}}
                  style={{ fontSize:11, color:partner.color, background:partner.bg,
                    border:"none", borderRadius:6, padding:"5px 12px",
                    cursor:"pointer", fontFamily:"Tahoma", fontWeight:600, marginBottom:10 }}>
                  ✕ مسح التواريخ
                </button>
              )}
              <div style={{ fontSize:12, color:"#64748B", marginBottom:12 }}>
                سيتم طباعة{" "}
                <strong style={{ color:"#1E293B" }}>
                  {txs.filter(t=>(!fromDate||t.date>=fromDate)&&(!toDate||t.date<=toDate)).length}
                </strong>
                {" "}حركة
                {fromDate||toDate?" في الفترة المحددة":" (كل الحركات)"}
              </div>
              <button onClick={printStatement} style={{
                width:"100%", border:"none", borderRadius:10, padding:"12px",
                fontSize:14, fontWeight:700, fontFamily:"Tahoma",
                background:partner.color, color:"#fff", cursor:"pointer" }}>
                🖨️ طباعة كشف الحساب الشامل
              </button>
            </div>
          )}
        </div>

        {/* كشف الحساب */}
        <div style={{ background:"#fff", borderRadius:14, padding:"16px 20px",
          border:"1px solid #E2E8F0" }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#1E293B", marginBottom:14 }}>
            📋 كشف الحساب ({txs.length} حركة)
          </div>
          {txs.length === 0 ? (
            <div style={{ textAlign:"center", padding:20, color:"#94A3B8" }}>
              ما في حركات بعد
            </div>
          ) : txs.map(t => {
            const isIn = t.type === "إيداع";
            return (
              <div key={t.id} style={{ borderRadius:10, padding:"12px 14px",
                marginBottom:8, border:"1px solid "+(isIn?"#DCFCE7":"#FEE2E2"),
                borderRight:"4px solid "+(isIn?"#16A34A":"#DC2626") }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700,
                      color:isIn?"#16A34A":"#DC2626", marginBottom:3 }}>
                      {isIn?"↓ إيداع أرباح":"↑ سحب"}
                    </div>
                    <div style={{ fontSize:11, color:"#64748B" }}>📅 {t.date}</div>
                    {t.note && <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>{t.note}</div>}
                  </div>
                  <div style={{ textAlign:"left" }}>
                    {(t.din||0) > 0 && (
                      <div style={{ fontSize:14, fontWeight:700,
                        color:isIn?"#16A34A":"#DC2626" }}>
                        {isIn?"+":"-"}{fNum(t.din)} <span style={{fontSize:10}}>د.ع</span>
                      </div>
                    )}
                    <div style={{ fontSize:13, fontWeight:700,
                      color:(t.dol||0)>0?"#2563EB":"#CBD5E1" }}>
                      {isIn?"+":"-"}{fNum(t.dol||0)} <span style={{fontSize:10}}>$</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {txs.length > 0 && (
            <div style={{ marginTop:12, padding:"10px 14px", background:"#F8FAFC",
              borderRadius:10, display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, color:"#64748B" }}>الرصيد الحالي</span>
              <div>
                <span style={{ fontSize:13, fontWeight:700, color:partner.color }}>
                  {fNum(pf.din)} د.ع
                </span>
                <span style={{ fontSize:12, fontWeight:700, color:"#2563EB", marginRight:10 }}>
                  {" | "}{fNum(pf.dol)} $
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// v2.1
