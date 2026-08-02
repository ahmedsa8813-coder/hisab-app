import React, { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot,
  deleteDoc, doc, updateDoc, setDoc, query, where, getDocs } from "firebase/firestore";

// ─── Firebase (نفس المشروع) ───────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCBGovCJ_Bx64dOjC0UWzJsBPgXEuJaizI",
  authDomain: "bab-projects-b7d04.firebaseapp.com",
  projectId: "bab-projects-b7d04",
  storageBucket: "bab-projects-b7d04.firebasestorage.app",
  messagingSenderId: "982434748534",
  appId: "1:982434748534:web:ca0e52ef0115ecfc346757"
};
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ─── ثوابت ────────────────────────────────────────────
const fNum = n => {
  if (!n && n !== 0) return "0";
  return Math.round(Number(n)).toLocaleString("en");
};

function w2(n) {
  const x = Math.floor(Math.abs(Number(n) || 0));
  if (!x) return "صفر";
  const o = ["","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة",
    "عشرة","أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر",
    "ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"];
  const t2 = ["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"];
  const h  = ["","مئة","مئتان","ثلاثمئة","أربعمئة","خمسمئة","ستمئة","سبعمئة","ثمانمئة","تسعمئة"];
  const g  = v => {
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

const PASS = "1234";

const MAIN_FUNDS = [
  { id:"رأس_المال", label:"رأس المال",     icon:"💼", color:"#059669", bg:"#ECFDF5" },
  { id:"عام",       label:"الصندوق العام", icon:"🏦", color:"#D97706", bg:"#FFFBEB" },
  { id:"شركاء",     label:"أرباح الشركاء",icon:"👥", color:"#9333EA", bg:"#FAF5FF" },
];

const DEPT_FUNDS = [
  { id:"إشراف",    label:"إشراف",    icon:"👷", color:"#0284C7", bg:"#F0F9FF" },
  { id:"ديكور",    label:"ديكور",    icon:"🎨", color:"#DB2777", bg:"#FDF2F8" },
  { id:"مقاولات",  label:"مقاولات",  icon:"🏗️", color:"#7C3AED", bg:"#F5F3FF" },
  { id:"واجهات",   label:"واجهات",   icon:"🏢", color:"#0891B2", bg:"#ECFEFF" },
];

const ALL_FUNDS = [...MAIN_FUNDS, ...DEPT_FUNDS];

// ─── التطبيق الرئيسي ─────────────────────────────────
export default function App2({ onBack }) {
  const [page, setPage] = useState("home"); // home | fund | employees
  const [selFund, setSelFund] = useState(null);
  const [funds, setFunds] = useState({});
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects]   = useState([]);
  const [assets,   setAssets]     = useState([]);

  useEffect(()=>{
    return onSnapshot(collection(db,"assets"), snap=>{
      setAssets(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
  },[]);

  useEffect(() => {
    return onSnapshot(collection(db, "projects"), snap => {
      setProjects(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "funds"), snap => {
      const f = {};
      snap.docs.forEach(d => { f[d.id] = { din: d.data().din||0, dol: d.data().dol||0 }; });
      setFunds(f);
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "employees"), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a,b) => (a.name||"").localeCompare(b.name||""));
      setEmployees(list);
    });
  }, []);

  if (page === "fund" && selFund)
    return <FundPage fund={selFund} funds={funds}
      onBack={() => { setPage("home"); setSelFund(null); }}/>;

  if (page === "employees")
    return <EmployeesPage employees={employees}
      onBack={() => setPage("home")}/>;

  if (page === "reports")
    return <ReportsPage funds={funds} projects={projects}
      onBack={() => setPage("home")}/>;

  if (page === "assets")
    return <AssetsPage funds={funds} onBack={() => setPage("home")}/>;

  // الصفحة الرئيسية
  const fundsDin    = ALL_FUNDS.reduce((s,f) => s + (funds[f.id]?.din||0), 0);
  const fundsDol    = ALL_FUNDS.reduce((s,f) => s + (funds[f.id]?.dol||0), 0);
  const activeDin   = projects.filter(p=>p.status==="active").reduce((s,p)=>s+(p.balDin||0),0);
  const activeDol   = projects.filter(p=>p.status==="active").reduce((s,p)=>s+(p.balDol||0),0);
  const totalDin    = fundsDin + activeDin;
  const totalDol    = fundsDol + activeDol;

  const NAV_ITEMS = [
    {id:"fund",    label:"الصناديق",   icon:"💎"},
    {id:"reports", label:"التقارير",   icon:"📊"},
    {id:"assets",  label:"الأصول",     icon:"📦"},
    {id:"employees",label:"الموظفون",  icon:"👷"},
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9",
      fontFamily:"Tahoma", direction:"rtl", display:"flex" }}>

      {/* ─── سايدبار ─── */}
      <div style={{ width:230, minHeight:"100vh", background:"#1E293B",
        display:"flex", flexDirection:"column", flexShrink:0,
        position:"sticky", top:0, height:"100vh" }}>
        <div style={{ padding:"24px 20px", borderBottom:"1px solid #334155" }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>🏢 باب المشاريع</div>
          <div style={{ fontSize:10, color:"#64748B", marginTop:2 }}>نظام الحسابات الداخلي</div>
        </div>
        <div style={{ padding:"16px 20px", borderBottom:"1px solid #334155" }}>
          <div style={{ fontSize:9, color:"#64748B", marginBottom:8 }}>الجرد الكلي</div>
          <div style={{ fontSize:18, fontWeight:700, color:"#F59E0B" }}>
            {fNum(totalDin)} <span style={{fontSize:11,fontWeight:400,color:"#94A3B8"}}>د.ع</span>
          </div>
          <div style={{ fontSize:18, fontWeight:700, color:"#60A5FA", marginTop:4 }}>
            {fNum(totalDol)} <span style={{fontSize:11,fontWeight:400,color:"#64748B"}}>$</span>
          </div>
          <div style={{ marginTop:10, borderTop:"1px solid #334155", paddingTop:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              fontSize:10, color:"#64748B", marginBottom:4 }}>
              <span>💎 الصناديق</span>
              <span style={{color:"#94A3B8"}}>{fNum(fundsDin)} د.ع</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between",
              fontSize:10, color:"#64748B" }}>
              <span>🏗️ مشاريع ({projects.filter(p=>p.status==="active").length})</span>
              <span style={{color:"#94A3B8"}}>{fNum(activeDin)} د.ع</span>
            </div>
          </div>
        </div>
        <div style={{ padding:"12px", flex:1 }}>
          {NAV_ITEMS.map(n=>(
            <button key={n.id}
              onClick={()=>n.id==="fund"?null:setPage(n.id)}
              style={{ width:"100%", background:"transparent", border:"none",
                borderRadius:10, padding:"11px 14px", cursor:"pointer",
                fontFamily:"Tahoma", textAlign:"right", display:"flex",
                alignItems:"center", gap:10, marginBottom:4, color:"#CBD5E1",
                fontSize:13, fontWeight:600 }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.08)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span>{n.icon}</span><span>{n.label}</span>
            </button>
          ))}
        </div>
        <div style={{ padding:"0 12px 20px" }}>
          <button onClick={onBack} style={{ width:"100%",
            background:"rgba(255,255,255,0.05)", border:"1px solid #334155",
            borderRadius:10, padding:"10px 14px", cursor:"pointer",
            fontFamily:"Tahoma", color:"#94A3B8", fontSize:12,
            display:"flex", alignItems:"center", gap:8 }}>
            <span>←</span><span>رجوع للرئيسية</span>
          </button>
        </div>
      </div>

      {/* ─── المحتوى ─── */}
      <div style={{ flex:1, padding:"28px 32px", overflow:"auto" }}>

        <div style={{ marginBottom:24 }}>
          <h1 style={{ margin:0, marginBottom:4, fontSize:22,
            fontWeight:700, color:"#1E293B" }}>لوحة الحسابات</h1>
          <div style={{ fontSize:12, color:"#64748B" }}>
            {new Date().toLocaleDateString("ar-IQ",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
          </div>
        </div>

        {/* كبطاقات الجرد */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
          gap:16, marginBottom:28 }}>
          {[
            {label:"🇮🇶 إجمالي الدينار", val:fNum(totalDin), unit:"د.ع",
              sub1:"صناديق: "+fNum(fundsDin), sub2:"مشاريع: "+fNum(activeDin),
              g:"linear-gradient(135deg,#D97706,#F59E0B)", sh:"rgba(217,119,6,0.25)"},
            {label:"🇺🇸 إجمالي الدولار", val:fNum(totalDol), unit:"$",
              sub1:"صناديق: "+fNum(fundsDol), sub2:"مشاريع: "+fNum(activeDol),
              g:"linear-gradient(135deg,#1D4ED8,#3B82F6)", sh:"rgba(29,78,216,0.25)"},
          ].map((card,i)=>(
            <div key={i} style={{ background:card.g, borderRadius:18,
              padding:"24px 28px", boxShadow:"0 8px 30px "+card.sh }}>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", marginBottom:8 }}>
                {card.label}
              </div>
              <div style={{ fontSize:34, fontWeight:700, color:"#fff", marginBottom:2 }}>
                {card.val}
              </div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", marginBottom:16 }}>
                {card.unit}
              </div>
              <div style={{ display:"flex", gap:20, fontSize:11,
                color:"rgba(255,255,255,0.6)", borderTop:"1px solid rgba(255,255,255,0.15)",
                paddingTop:12 }}>
                <span>{card.sub1}</span>
                <span>{card.sub2}</span>
              </div>
            </div>
          ))}
        </div>

        {/* الصناديق الرئيسية */}
        <div style={{ marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <div style={{ width:4, height:20, background:"#059669", borderRadius:99 }}/>
            <span style={{ fontSize:14, fontWeight:700, color:"#475569" }}>الصناديق الرئيسية</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
            {MAIN_FUNDS.map(f=>{
              const bal=funds[f.id]||{din:0,dol:0};
              return (
                <button key={f.id} onClick={()=>{setSelFund(f);setPage("fund");}}
                  style={{ background:"#fff", border:"1px solid #E2E8F0",
                    borderTop:"3px solid "+f.color, borderRadius:16,
                    padding:"20px", cursor:"pointer", fontFamily:"Tahoma", textAlign:"right",
                    gridColumn:f.id==="شركاء"?"span 3":"span 1",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
                    transition:"box-shadow 0.2s" }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow="0 6px 24px rgba(0,0,0,0.1)"}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.04)"}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginBottom:16 }}>
                    <span style={{ fontSize:11, color:f.color, background:f.bg,
                      borderRadius:20, padding:"3px 10px", fontWeight:600 }}>تفاصيل ←</span>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:15, fontWeight:700, color:"#1E293B" }}>{f.label}</span>
                      <span style={{ fontSize:24 }}>{f.icon}</span>
                    </div>
                  </div>
                  {f.id==="شركاء" ? (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr", gap:8 }}>
                      <div style={{ background:f.bg, borderRadius:10, padding:"12px", textAlign:"center" }}>
                        <div style={{ fontSize:9, color:"#64748B", marginBottom:3 }}>الإجمالي</div>
                        <div style={{ fontSize:16, fontWeight:700, color:f.color }}>{fNum(bal.din)}</div>
                        <div style={{ fontSize:9, color:"#94A3B8" }}>د.ع</div>
                      </div>
                      {[{n:"إيهاب",c:"#2563EB"},{n:"أحمد",c:"#D97706"},
                        {n:"نور",c:"#059669"},{n:"محمد",c:"#7C3AED"}].map(p=>{
                        const pf=funds["partner_"+p.n]||{din:0};
                        return (
                          <div key={p.n} style={{ background:"#F8FAFC", borderRadius:10,
                            padding:"12px", textAlign:"center" }}>
                            <div style={{ fontSize:9, color:p.c, fontWeight:700, marginBottom:3 }}>
                              م.{p.n}
                            </div>
                            <div style={{ fontSize:15, fontWeight:700, color:p.c }}>
                              {fNum(pf.din)}
                            </div>
                            <div style={{ fontSize:9, color:"#94A3B8" }}>د.ع</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      <div style={{ background:f.bg, borderRadius:10, padding:"14px", textAlign:"center" }}>
                        <div style={{ fontSize:9, color:"#64748B", marginBottom:4 }}>🇮🇶 دينار</div>
                        <div style={{ fontSize:18, fontWeight:700, color:f.color }}>{fNum(bal.din)}</div>
                        <div style={{ fontSize:10, color:"#94A3B8" }}>د.ع</div>
                      </div>
                      <div style={{ background:"#EFF6FF", borderRadius:10, padding:"14px", textAlign:"center" }}>
                        <div style={{ fontSize:9, color:"#64748B", marginBottom:4 }}>🇺🇸 دولار</div>
                        <div style={{ fontSize:18, fontWeight:700, color:"#2563EB" }}>{fNum(bal.dol)}</div>
                        <div style={{ fontSize:10, color:"#94A3B8" }}>$</div>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* صناديق الأقسام */}
        <div style={{ marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <div style={{ width:4, height:20, background:"#D97706", borderRadius:99 }}/>
            <span style={{ fontSize:14, fontWeight:700, color:"#475569" }}>صناديق الأقسام</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
            {DEPT_FUNDS.map(f=>{
              const bal=funds[f.id]||{din:0,dol:0};
              return (
                <button key={f.id} onClick={()=>{setSelFund(f);setPage("fund");}}
                  style={{ background:"#fff", border:"1px solid #E2E8F0",
                    borderTop:"3px solid "+f.color, borderRadius:16,
                    padding:"18px", cursor:"pointer", fontFamily:"Tahoma", textAlign:"right",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.04)", transition:"box-shadow 0.2s" }}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow="0 6px 24px rgba(0,0,0,0.1)"}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.04)"}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginBottom:14 }}>
                    <span style={{ fontSize:22 }}>{f.icon}</span>
                    <span style={{ fontSize:14, fontWeight:700, color:"#1E293B" }}>{f.label}</span>
                  </div>
                  <div style={{ background:f.bg, borderRadius:10, padding:"10px",
                    textAlign:"center", marginBottom:8 }}>
                    <div style={{ fontSize:9, color:"#64748B", marginBottom:2 }}>🇮🇶 دينار</div>
                    <div style={{ fontSize:16, fontWeight:700, color:f.color }}>{fNum(bal.din)}</div>
                    <div style={{ fontSize:9, color:"#94A3B8" }}>د.ع</div>
                  </div>
                  <div style={{ background:"#EFF6FF", borderRadius:10, padding:"10px", textAlign:"center" }}>
                    <div style={{ fontSize:9, color:"#64748B", marginBottom:2 }}>🇺🇸 دولار</div>
                    <div style={{ fontSize:16, fontWeight:700, color:"#2563EB" }}>{fNum(bal.dol)}</div>
                    <div style={{ fontSize:9, color:"#94A3B8" }}>$</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* روابط سريعة */}
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <div style={{ width:4, height:20, background:"#7C3AED", borderRadius:99 }}/>
            <span style={{ fontSize:14, fontWeight:700, color:"#475569" }}>أقسام أخرى</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
            {[
              {pg:"reports", icon:"📊", label:"التقارير",
                desc:"تقارير مالية شاملة", color:"#7C3AED"},
              {pg:"assets",  icon:"📦", label:"الأصول الثابتة",
                desc:assets.filter(a=>(a.qtyRemaining||0)>0).length+" صنف نشط", color:"#0891B2"},
              {pg:"employees",icon:"👷", label:"الموظفون",
                desc:employees.length+" موظف مسجل", color:"#0284C7"},
            ].map(n=>(
              <button key={n.pg} onClick={()=>setPage(n.pg)}
                style={{ background:"#fff", border:"1px solid #E2E8F0",
                  borderTop:"3px solid "+n.color, borderRadius:16,
                  padding:"20px", cursor:"pointer", fontFamily:"Tahoma", textAlign:"right",
                  boxShadow:"0 1px 4px rgba(0,0,0,0.04)", transition:"box-shadow 0.2s" }}
                onMouseEnter={e=>e.currentTarget.style.boxShadow="0 6px 24px rgba(0,0,0,0.1)"}
                onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.04)"}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"flex-start", marginBottom:10 }}>
                  <span style={{ fontSize:11, color:n.color, fontWeight:600 }}>فتح ←</span>
                  <span style={{ fontSize:28 }}>{n.icon}</span>
                </div>
                <div style={{ fontSize:15, fontWeight:700, color:"#1E293B", marginBottom:4 }}>
                  {n.label}
                </div>
                <div style={{ fontSize:11, color:"#94A3B8" }}>{n.desc}</div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── صفحة تفاصيل الصندوق ─────────────────────────────
function FundPage({ fund, funds, onBack }) {
  const bal = funds[fund.id] || { din:0, dol:0 };
  const [txs, setTxs] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type:"إيداع", din:"", dol:"", note:"",
    date: new Date().toISOString().split("T")[0] });
  const sf = k => v => setForm(f => ({...f, [k]:v}));
  const [showStmt, setShowStmt] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");

  useEffect(() => {
    return onSnapshot(
      query(collection(db,"fund_txs"), where("fundId","==",fund.id)),
      snap => {
        const list = snap.docs.map(d => ({id:d.id,...d.data()}));
        list.sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
        setTxs(list);
      }
    );
  }, [fund.id]);

  const addTx = async () => {
    const din = Number(form.din)||0;
    const dol = Number(form.dol)||0;
    if (!din && !dol) return;
    const isIn = form.type === "إيداع";
    if (!isIn) {
      if (din > bal.din) { alert("⛔ يتجاوز رصيد الدينار! المتاح: "+fNum(bal.din)+" د.ع"); return; }
      if (dol > bal.dol) { alert("⛔ يتجاوز رصيد الدولار! المتاح: "+fNum(bal.dol)+" $"); return; }
    }
    await addDoc(collection(db,"fund_txs"), {
      fundId: fund.id, fundLabel: fund.label,
      type: form.type, din, dol,
      note: form.note.trim(),
      date: form.date,
      createdAt: new Date().toISOString()
    });
    const newDin = isIn ? bal.din+din : bal.din-din;
    const newDol = isIn ? bal.dol+dol : bal.dol-dol;
    await setDoc(doc(db,"funds",fund.id), { din:Math.max(0,newDin), dol:Math.max(0,newDol) }, {merge:true});
    setForm({ type:form.type, din:"", dol:"", note:"", date:form.date });
    setShowAdd(false);
  };

  const printStatement = () => {
    const filtered = txs.filter(t => {
      if (fromDate && t.date < fromDate) return false;
      if (toDate   && t.date > toDate)   return false;
      return true;
    }).sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.createdAt||"").localeCompare(b.createdAt||""));

    if (!filtered.length) { alert("ما في حركات في هذه الفترة"); return; }

    let runDin=0, runDol=0, n=0;
    let totDepDin=0, totDepDol=0, totOutDin=0, totOutDol=0;
    const rows = filtered.map(t => {
      n++;
      const isIn = t.type==="إيداع";
      const d=t.din||0, l=t.dol||0;
      if(isIn){runDin+=d;runDol+=l;totDepDin+=d;totDepDol+=l;}
      else    {runDin-=d;runDol-=l;totOutDin+=d;totOutDol+=l;}
      return `<tr style="background:${n%2===0?"#F8FAFC":"#fff"}">
        <td>${n}</td><td>${t.date||""}</td>
        <td style="color:${isIn?"#16A34A":"#DC2626"};font-weight:700">${isIn?"↓ إيداع":"↑ صرف"}</td>
        <td style="text-align:right">${t.note||"—"}</td>
        <td style="color:${isIn?"#16A34A":"#DC2626"};font-weight:700">${isIn?"+":"-"}${fNum(d)} د.ع</td>
        <td style="color:${isIn?"#16A34A":"#2563EB"};font-weight:700">${isIn?"+":"-"}${fNum(l)} $</td>
        <td style="font-weight:700;color:${runDin>=0?"#D97706":"#DC2626"}">${fNum(runDin)} د.ع</td>
      </tr>`;
    }).join("");

    const today = new Date().toISOString().split("T")[0];
    const html=`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
<style>*{font-family:Tahoma}body{margin:22px;direction:rtl}
.hdr{text-align:center;border-bottom:3px solid ${fund.color};padding-bottom:12px;margin-bottom:14px}
.co{font-size:20px;font-weight:700}.ca{font-size:11px;color:#64748B}
.title{font-size:16px;font-weight:700;color:${fund.color};margin:10px 0 4px}
.sg{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}
.sb{border-radius:8px;padding:10px;text-align:center}
.sl{font-size:9px;color:#64748B;margin-bottom:3px}.sv{font-size:13px;font-weight:700}
table{width:100%;border-collapse:collapse}
thead tr{background:${fund.color}}th{color:#fff;padding:8px 6px;font-size:10px}
td{padding:7px 6px;font-size:10px;text-align:center;border-bottom:1px solid #F1F5F9}
.tot td{background:#F1F5F9;font-weight:700;border-top:2px solid ${fund.color}}
.ft{margin-top:12px;font-size:10px;color:#94A3B8;display:flex;justify-content:space-between}
</style></head><body>
<div class="hdr"><div class="co">شركة باب المشاريع</div><div class="ca">بغداد — العرصات</div></div>
<div class="title">${fund.icon} كشف حساب — ${fund.label}</div>
<p style="font-size:11px;color:#64748B">الفترة: ${fromDate||"البداية"} — ${toDate||"اليوم"} · ${filtered.length} حركة</p>
<div class="sg">
  <div class="sb" style="background:#F0FDF4"><div class="sl">↓ إيداعات دينار</div><div class="sv" style="color:#16A34A">+${fNum(totDepDin)} د.ع</div></div>
  <div class="sb" style="background:#FFF1F2"><div class="sl">↑ صرف دينار</div><div class="sv" style="color:#DC2626">-${fNum(totOutDin)} د.ع</div></div>
  <div class="sb" style="background:#EFF6FF"><div class="sl">↓ إيداعات دولار</div><div class="sv" style="color:#2563EB">+${fNum(totDepDol)} $</div></div>
  <div class="sb" style="background:${fund.bg};border:2px solid ${fund.color}40"><div class="sl">⚖️ الرصيد الحالي</div><div class="sv" style="color:${fund.color}">${fNum(bal.din)} د.ع</div></div>
</div>
<table><thead><tr><th>#</th><th>التاريخ</th><th>النوع</th><th style="text-align:right">البيان</th><th>دينار</th><th>دولار</th><th>الميزان</th></tr></thead>
<tbody>${rows}</tbody>
<tr class="tot"><td colspan="3">الإجمالي</td><td></td>
<td>+${fNum(totDepDin)}/-${fNum(totOutDin)}</td>
<td>+${fNum(totDepDol)}/-${fNum(totOutDol)}</td>
<td style="color:${fund.color}">${fNum(bal.din)} د.ع</td></tr>
</table>
<div class="ft"><span>${fund.label} — شركة باب المشاريع</span><span>طُبع: ${today}</span></div>
</body></html>`;
    const w=window.open("","_blank","width=980,height=720");
    if(!w){alert("السماح بالنوافذ المنبثقة");return;}
    w.document.write(html);w.document.close();w.focus();setTimeout(()=>w.print(),700);
  };

  const totIn  = { din:txs.filter(t=>t.type==="إيداع").reduce((s,t)=>s+(t.din||0),0),
                   dol:txs.filter(t=>t.type==="إيداع").reduce((s,t)=>s+(t.dol||0),0) };
  const totOut = { din:txs.filter(t=>t.type!=="إيداع").reduce((s,t)=>s+(t.din||0),0),
                   dol:txs.filter(t=>t.type!=="إيداع").reduce((s,t)=>s+(t.dol||0),0) };

  return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9",
      fontFamily:"Tahoma", direction:"rtl" }}>
      <div style={{ maxWidth:560, margin:"0 auto", padding:"22px 16px" }}>

        <button onClick={onBack} style={{ background:"#fff", border:"1px solid #E2E8F0",
          borderRadius:10, padding:"8px 16px", fontSize:13, color:"#475569",
          cursor:"pointer", marginBottom:16, fontFamily:"Tahoma",
          display:"flex", alignItems:"center", gap:6 }}>← رجوع</button>

        {/* هيدر الصندوق */}
        <div style={{ background:fund.bg, borderRadius:16, padding:"18px 20px",
          border:"2px solid "+fund.color+"40", marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <span style={{ fontSize:28 }}>{fund.icon}</span>
            <span style={{ fontSize:18, fontWeight:700, color:fund.color }}>{fund.label}</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            <div style={{ background:"#fff", borderRadius:10, padding:"10px", textAlign:"center" }}>
              <div style={{ fontSize:9, color:"#64748B", marginBottom:3 }}>↓ إيداعات دينار</div>
              <div style={{ fontSize:13, fontWeight:700, color:"#16A34A" }}>{fNum(totIn.din)} د.ع</div>
            </div>
            <div style={{ background:"#fff", borderRadius:10, padding:"10px", textAlign:"center" }}>
              <div style={{ fontSize:9, color:"#64748B", marginBottom:3 }}>↑ صرف دينار</div>
              <div style={{ fontSize:13, fontWeight:700, color:"#DC2626" }}>{fNum(totOut.din)} د.ع</div>
            </div>
            <div style={{ background:"#fff", borderRadius:10, padding:"10px", textAlign:"center",
              border:"2px solid "+fund.color }}>
              <div style={{ fontSize:9, color:"#64748B", marginBottom:3 }}>⚖️ الرصيد</div>
              <div style={{ fontSize:14, fontWeight:700, color:fund.color }}>{fNum(bal.din)} د.ع</div>
              {bal.dol>0&&<div style={{ fontSize:11, fontWeight:700, color:"#2563EB" }}>{fNum(bal.dol)} $</div>}
            </div>
          </div>
        </div>

        {/* أزرار */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          <button onClick={()=>setShowAdd(v=>!v)} style={{ border:"none", borderRadius:12,
            padding:"12px", fontSize:14, fontWeight:700, fontFamily:"Tahoma",
            background:showAdd?"#475569":fund.color, color:"#fff", cursor:"pointer" }}>
            {showAdd?"✕ إلغاء":"+ إضافة حركة"}
          </button>
          <button onClick={()=>setShowStmt(v=>!v)} style={{ border:"1px solid "+fund.color,
            borderRadius:12, padding:"12px", fontSize:14, fontWeight:700,
            fontFamily:"Tahoma", background:"#fff", color:fund.color, cursor:"pointer" }}>
            🖨️ كشف الحساب
          </button>
        </div>

        {/* فورم الإضافة */}
        {showAdd && (
          <div style={{ background:"#fff", borderRadius:14, padding:16,
            border:"1px solid #E2E8F0", marginBottom:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
              {["إيداع","صرف"].map(t=>(
                <button key={t} onClick={()=>sf("type")(t)} style={{
                  border:"2px solid "+(form.type===t?t==="إيداع"?"#16A34A":"#DC2626":"#E2E8F0"),
                  borderRadius:10, padding:"10px", cursor:"pointer",
                  fontFamily:"Tahoma", fontSize:13, fontWeight:700,
                  background:form.type===t?t==="إيداع"?"#F0FDF4":"#FFF1F2":"#fff",
                  color:form.type===t?t==="إيداع"?"#16A34A":"#DC2626":"#94A3B8"
                }}>{t==="إيداع"?"↓ إيداع":"↑ صرف"}</button>
              ))}
            </div>
            {[{l:"مبلغ الدينار",k:"din",c:"#16A34A"},{l:"مبلغ الدولار",k:"dol",c:"#2563EB"}].map(({l,k,c})=>(
              <div key={k} style={{ marginBottom:10 }}>
                <div style={{ fontSize:12, color:c, fontWeight:600, marginBottom:5 }}>{l}</div>
                <input type="text" inputMode="numeric" placeholder="٠" value={form[k]}
                  onChange={e=>sf(k)(e.target.value.replace(/[^0-9]/g,""))}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                    padding:"11px 13px", fontSize:14, outline:"none", fontFamily:"Tahoma",
                    direction:"rtl", boxSizing:"border-box", background:"#F8FAFC" }}/>
                {Number(form[k])>0 && (
                  <div style={{ fontSize:12, color:c, fontWeight:600, marginTop:4 }}>
                    ✍️ {w2(Number(form[k]))} {k==="din"?"دينار عراقي":"دولار أمريكي"}
                    {" — "}{fNum(Number(form[k]))} {k==="din"?"د.ع":"$"}
                  </div>
                )}
              </div>
            ))}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, color:"#64748B", fontWeight:600, marginBottom:5 }}>البيان</div>
              <input placeholder="وصف الحركة..." value={form.note} onChange={e=>sf("note")(e.target.value)}
                style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                  padding:"11px 13px", fontSize:14, outline:"none", fontFamily:"Tahoma",
                  direction:"rtl", boxSizing:"border-box", background:"#F8FAFC" }}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, color:"#64748B", fontWeight:600, marginBottom:5 }}>التاريخ</div>
              <input type="date" value={form.date} onChange={e=>sf("date")(e.target.value)}
                style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                  padding:"11px 13px", fontSize:14, outline:"none", fontFamily:"Tahoma",
                  boxSizing:"border-box", background:"#F8FAFC" }}/>
            </div>
            <button onClick={addTx} disabled={!Number(form.din)&&!Number(form.dol)}
              style={{ width:"100%", border:"none", borderRadius:10, padding:"13px",
                fontSize:14, fontWeight:700, fontFamily:"Tahoma", cursor:"pointer",
                background:Number(form.din)||Number(form.dol)?fund.color:"#E2E8F0",
                color:Number(form.din)||Number(form.dol)?"#fff":"#94A3B8" }}>
              ✅ تأكيد الحركة
            </button>
          </div>
        )}

        {/* كشف الحساب - فلترة */}
        {showStmt && (
          <div style={{ background:"#FFFBEB", borderRadius:14, padding:16,
            border:"1px solid #D97706", marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#D97706", marginBottom:12 }}>
              🖨️ كشف الحساب
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
              <div>
                <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:5 }}>من تاريخ</div>
                <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                    padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                    boxSizing:"border-box", background:"#F8FAFC" }}/>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:5 }}>إلى تاريخ</div>
                <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                    padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                    boxSizing:"border-box", background:"#F8FAFC" }}/>
              </div>
            </div>
            <div style={{ fontSize:12, color:"#64748B", marginBottom:12 }}>
              سيتم طباعة <strong>{txs.filter(t=>(!fromDate||t.date>=fromDate)&&(!toDate||t.date<=toDate)).length}</strong> حركة
            </div>
            <button onClick={printStatement} style={{ width:"100%", border:"none",
              borderRadius:10, padding:"12px", fontSize:14, fontWeight:700,
              fontFamily:"Tahoma", background:fund.color, color:"#fff", cursor:"pointer" }}>
              🖨️ طباعة الكشف
            </button>
          </div>
        )}

        {/* قائمة الحركات */}
        <div style={{ background:"#fff", borderRadius:14, padding:"16px 20px",
          border:"1px solid #E2E8F0" }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#1E293B", marginBottom:14 }}>
            📋 سجل الحركات ({txs.length})
          </div>
          {txs.length===0 ? (
            <div style={{ textAlign:"center", padding:20, color:"#94A3B8" }}>ما في حركات بعد</div>
          ) : txs.map(t=>{
            const isIn = t.type==="إيداع";
            return (
              <div key={t.id} style={{ borderRadius:10, padding:"12px 14px", marginBottom:8,
                border:"1px solid "+(isIn?"#DCFCE7":"#FEE2E2"),
                borderRight:"4px solid "+(isIn?"#16A34A":"#DC2626") }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700,
                      color:isIn?"#16A34A":"#DC2626", marginBottom:3 }}>
                      {isIn?"↓ إيداع":"↑ صرف"}
                    </div>
                    <div style={{ fontSize:11, color:"#64748B" }}>📅 {t.date}</div>
                    {t.note&&<div style={{ fontSize:11, color:"#475569", marginTop:2 }}>{t.note}</div>}
                  </div>
                  <div style={{ textAlign:"left" }}>
                    {(t.din||0)>0&&<div style={{ fontSize:14, fontWeight:700,
                      color:isIn?"#16A34A":"#DC2626" }}>
                      {isIn?"+":"-"}{fNum(t.din)} <span style={{fontSize:10}}>د.ع</span>
                    </div>}
                    {(t.dol||0)>0&&<div style={{ fontSize:12, fontWeight:700, color:"#2563EB" }}>
                      {isIn?"+":"-"}{fNum(t.dol)} <span style={{fontSize:10}}>$</span>
                    </div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── صفحة الموظفين ───────────────────────────────────
function EmployeesPage({ employees, onBack }) {
  return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9",
      fontFamily:"Tahoma", direction:"rtl" }}>
      <div style={{ maxWidth:540, margin:"0 auto", padding:"22px 16px" }}>
        <button onClick={onBack} style={{ background:"#fff", border:"1px solid #E2E8F0",
          borderRadius:10, padding:"8px 16px", fontSize:13, color:"#475569",
          cursor:"pointer", marginBottom:16, fontFamily:"Tahoma",
          display:"flex", alignItems:"center", gap:6 }}>← رجوع</button>
        <div style={{ background:"#fff", borderRadius:14, padding:"20px",
          border:"1px solid #E2E8F0", textAlign:"center", color:"#64748B" }}>
          <div style={{ fontSize:40, marginBottom:10 }}>👷</div>
          <div style={{ fontSize:16, fontWeight:700, color:"#1E293B", marginBottom:6 }}>
            قريباً — إدارة الموظفين
          </div>
          <div style={{ fontSize:13 }}>سيتم إضافة هذا القسم قريباً</div>
        </div>
      </div>
    </div>
  );
}

// ─── صفحة التقارير ───────────────────────────────────
function ReportsPage({ funds, projects, onBack }) {
  const [reportType, setReportType] = useState(""); 
  // projects | funds | partners | summary
  const [filters, setFilters] = useState({
    fromDate:"", toDate:"", status:"all",
    projType:"all", fundId:"all", partnerId:"all"
  });
  const sf = k => v => setFilters(f=>({...f,[k]:v}));

  const [projTxs,    setProjTxs]    = useState([]);
  const [fundTxs,    setFundTxs]    = useState([]);
  const [partnerTxs, setPartnerTxs] = useState([]);
  const [assets,     setAssets]     = useState([]);

  useEffect(()=>{
    const u1 = onSnapshot(collection(db,"project_txs"), s=>{
      setProjTxs(s.docs.map(d=>({id:d.id,...d.data()})));
    });
    const u2 = onSnapshot(collection(db,"fund_txs"), s=>{
      setFundTxs(s.docs.map(d=>({id:d.id,...d.data()})));
    });
    const u3 = onSnapshot(collection(db,"partner_txs"), s=>{
      setPartnerTxs(s.docs.map(d=>({id:d.id,...d.data()})));
    });
    const u4 = onSnapshot(collection(db,"assets"), s=>{
      setAssets(s.docs.map(d=>({id:d.id,...d.data()})));
    });
    return ()=>{u1();u2();u3();u4();};
  },[]);

  const REPORT_TYPES = [
    {id:"projects",  label:"تقرير المشاريع",    icon:"🏗️", color:"#D97706", bg:"#FFFBEB"},
    {id:"funds",     label:"تقرير الصناديق",    icon:"💎", color:"#059669", bg:"#ECFDF5"},
    {id:"partners",  label:"تقرير الشركاء",     icon:"👥", color:"#9333EA", bg:"#FAF5FF"},
    {id:"assets",    label:"تقرير الأصول",      icon:"📦", color:"#0891B2", bg:"#ECFEFF"},
    {id:"summary",   label:"التقرير الشامل",    icon:"📊", color:"#1D4ED8", bg:"#EFF6FF"},
  ];

  const PROJ_TYPES = ["إشراف","ديكور","مقاولات","واجهات"];
  const PARTNERS_LIST = [
    {id:"partner_إيهاب",name:"م. إيهاب"},
    {id:"partner_أحمد", name:"م. أحمد"},
    {id:"partner_نور",  name:"م. نور"},
    {id:"partner_محمد", name:"م. محمد"},
  ];

  const filterDate = t =>
    (!filters.fromDate || (t.date||"") >= filters.fromDate) &&
    (!filters.toDate   || (t.date||"") <= filters.toDate);

  // ── بناء التقرير ──────────────────────────────────
  const buildReport = () => {
    const today = new Date().toISOString().split("T")[0];
    const period = (filters.fromDate||"البداية") + " — " + (filters.toDate||"اليوم");
    let html = "";

    const STYLE = `<style>
      *{font-family:Tahoma,Arial}body{margin:22px;direction:rtl}
      .hdr{text-align:center;border-bottom:3px solid #1E3A5F;padding-bottom:12px;margin-bottom:14px}
      .co{font-size:20px;font-weight:700}.ca{font-size:11px;color:#64748B}
      .title{font-size:17px;font-weight:700;color:#1E3A5F;margin:12px 0 4px}
      .info{font-size:11px;color:#64748B;margin-bottom:14px}
      .sg{display:grid;gap:8px;margin-bottom:14px}
      .sb{border-radius:9px;padding:11px;text-align:center;background:#F8FAFC}
      .sl{font-size:9px;color:#64748B;margin-bottom:3px}.sv{font-size:14px;font-weight:700}
      table{width:100%;border-collapse:collapse;margin-bottom:18px}
      thead tr{background:#1E3A5F}th{color:#fff;padding:8px 7px;font-size:10px}
      td{padding:7px;font-size:10px;text-align:center;border-bottom:1px solid #F1F5F9}
      .tot td{background:#F1F5F9;font-weight:700;border-top:2px solid #1E3A5F}
      h3{font-size:13px;color:#1E3A5F;margin:16px 0 8px;border-bottom:1px solid #E2E8F0;padding-bottom:5px}
      .ft{margin-top:14px;font-size:10px;color:#94A3B8;display:flex;justify-content:space-between;border-top:1px dashed #E2E8F0;padding-top:8px}
    </style>`;

    const HDR = `<div class="hdr"><div class="co">شركة باب المشاريع</div><div class="ca">بغداد — العرصات</div></div>`;

    if (reportType === "projects") {
      let list = projects;
      if (filters.status !== "all") list = list.filter(p=>p.status===filters.status);
      if (filters.projType !== "all") list = list.filter(p=>p.type===filters.projType);
      list.sort((a,b)=>(a.name||"").localeCompare(b.name||""));

      const totRecDin = list.reduce((s,p)=>s+(p.recDin||0),0);
      const totSpdDin = list.reduce((s,p)=>s+(p.spdDin||0),0);
      const totBalDin = list.reduce((s,p)=>s+(p.balDin||0),0);
      const totRecDol = list.reduce((s,p)=>s+(p.recDol||0),0);
      const totBalDol = list.reduce((s,p)=>s+(p.balDol||0),0);

      const rows = list.map((p,i)=>`<tr style="background:${i%2===0?"#fff":"#F8FAFC"}">
        <td>${i+1}</td>
        <td style="text-align:right;font-weight:700">${p.name||""}</td>
        <td>${p.type||""}</td>
        <td>${p.province||""}</td>
        <td style="color:${p.status==="active"?"#16A34A":"#64748B"}">${p.status==="active"?"● نشط":"✓ منتهي"}</td>
        <td style="color:#16A34A">${fNum(p.recDin||0)} د.ع</td>
        <td style="color:#DC2626">${fNum(p.spdDin||0)} د.ع</td>
        <td style="color:#D97706;font-weight:700">${fNum(p.balDin||0)} د.ع</td>
        <td style="color:#2563EB;font-weight:700">${fNum(p.balDol||0)} $</td>
      </tr>`).join("");

      html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>${STYLE}</head><body>
${HDR}
<div class="title">🏗️ تقرير المشاريع</div>
<div class="info">
  ${filters.status==="all"?"كل المشاريع":filters.status==="active"?"قيد التنفيذ":"المنتهية"}
  ${filters.projType!=="all"?" · نوع: "+filters.projType:""}
  · إجمالي: ${list.length} مشروع
</div>
<div class="sg" style="grid-template-columns:repeat(4,1fr)">
  <div class="sb"><div class="sl">إجمالي المستلم</div><div class="sv" style="color:#16A34A">${fNum(totRecDin)} د.ع</div></div>
  <div class="sb"><div class="sl">إجمالي المصروف</div><div class="sv" style="color:#DC2626">${fNum(totSpdDin)} د.ع</div></div>
  <div class="sb" style="background:#FFFBEB"><div class="sl">ميزان الدينار</div><div class="sv" style="color:#D97706">${fNum(totBalDin)} د.ع</div></div>
  <div class="sb" style="background:#EFF6FF"><div class="sl">ميزان الدولار</div><div class="sv" style="color:#2563EB">${fNum(totBalDol)} $</div></div>
</div>
<table><thead><tr><th>#</th><th style="text-align:right">المشروع</th><th>النوع</th><th>المحافظة</th><th>الحالة</th><th>مستلم</th><th>مصروف</th><th>ميزان د.ع</th><th>ميزان $</th></tr></thead>
<tbody>${rows}</tbody>
<tr class="tot"><td colspan="4">الإجمالي</td><td></td><td style="color:#16A34A">${fNum(totRecDin)} د.ع</td><td style="color:#DC2626">${fNum(totSpdDin)} د.ع</td><td style="color:#D97706">${fNum(totBalDin)} د.ع</td><td style="color:#2563EB">${fNum(totBalDol)} $</td></tr>
</table>
<div class="ft"><span>شركة باب المشاريع</span><span>طُبع: ${today}</span></div>
</body></html>`;

    } else if (reportType === "funds") {
      const selF = filters.fundId === "all" ? null : ALL_FUNDS.find(f=>f.id===filters.fundId);
      const fList = selF ? [selF] : ALL_FUNDS;
      const filtered = fundTxs.filter(t => filterDate(t) &&
        (filters.fundId==="all" || t.fundId===filters.fundId));

      let secHtml = "";
      fList.forEach(f=>{
        const fTxs = filtered.filter(t=>t.fundId===f.id)
          .sort((a,b)=>(a.date||"").localeCompare(b.date||""));
        if(!fTxs.length) return;
        let n=0, runDin=0;
        const rows = fTxs.map(t=>{
          n++;const isIn=t.type==="إيداع";
          const d=t.din||0;runDin+=isIn?d:-d;
          return `<tr style="background:${n%2===0?"#F8FAFC":"#fff"}">
            <td>${n}</td><td>${t.date||""}</td>
            <td style="color:${isIn?"#16A34A":"#DC2626"}">${isIn?"↓ إيداع":"↑ صرف"}</td>
            <td style="text-align:right">${t.note||"—"}</td>
            <td style="color:${isIn?"#16A34A":"#DC2626"};font-weight:700">${isIn?"+":"-"}${fNum(d)} د.ع</td>
            <td style="font-weight:700;color:#D97706">${fNum(runDin)} د.ع</td>
          </tr>`;
        }).join("");
        const bal = funds[f.id]||{din:0,dol:0};
        secHtml += `<h3>${f.icon} ${f.label} — الرصيد: ${fNum(bal.din)} د.ع</h3>
<table><thead><tr><th>#</th><th>التاريخ</th><th>النوع</th><th style="text-align:right">البيان</th><th>المبلغ</th><th>الميزان</th></tr></thead>
<tbody>${rows}</tbody></table>`;
      });

      html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>${STYLE}</head><body>
${HDR}
<div class="title">💎 تقرير الصناديق</div>
<div class="info">الفترة: ${period} · ${filtered.length} حركة</div>
${secHtml}
<div class="ft"><span>شركة باب المشاريع</span><span>طُبع: ${today}</span></div>
</body></html>`;

    } else if (reportType === "partners") {
      const pList = filters.partnerId==="all" ? PARTNERS_LIST
        : PARTNERS_LIST.filter(p=>p.id===filters.partnerId);
      const filtered = partnerTxs.filter(filterDate);

      let secHtml = "";
      pList.forEach(p=>{
        const pTxs = filtered.filter(t=>t.partnerId===p.id)
          .sort((a,b)=>(a.date||"").localeCompare(b.date||""));
        const pf = funds[p.id]||{din:0,dol:0};
        let n=0, runDin=0;
        const rows = pTxs.map(t=>{
          n++;const isIn=t.type==="إيداع";
          const d=t.din||0;runDin+=isIn?d:-d;
          return `<tr style="background:${n%2===0?"#F8FAFC":"#fff"}">
            <td>${n}</td><td>${t.date||""}</td>
            <td style="color:${isIn?"#16A34A":"#DC2626"}">${isIn?"↓ إيداع":"↑ سحب"}</td>
            <td style="text-align:right">${t.note||"—"}</td>
            <td style="color:${isIn?"#16A34A":"#DC2626"};font-weight:700">${isIn?"+":"-"}${fNum(d)} د.ع</td>
            <td style="font-weight:700;color:#9333EA">${fNum(runDin)} د.ع</td>
          </tr>`;
        }).join("");
        secHtml += `<h3>👤 ${p.name} — الرصيد: ${fNum(pf.din)} د.ع${pf.dol>0?" | "+fNum(pf.dol)+" $":""}</h3>
${pTxs.length?`<table><thead><tr><th>#</th><th>التاريخ</th><th>النوع</th><th style="text-align:right">البيان</th><th>المبلغ</th><th>الميزان</th></tr></thead><tbody>${rows}</tbody></table>`:"<p style='color:#94A3B8;font-size:11px'>ما في حركات في هذه الفترة</p>"}`;
      });

      html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>${STYLE}</head><body>
${HDR}
<div class="title">👥 تقرير الشركاء</div>
<div class="info">الفترة: ${period}</div>
${secHtml}
<div class="ft"><span>شركة باب المشاريع</span><span>طُبع: ${today}</span></div>
</body></html>`;

    } else if (reportType === "assets") {
      let list = assets;
      if (filters.status !== "all") list = list.filter(a=>a.status===filters.status);
      list.sort((a,b)=>(a.date||"").localeCompare(b.date||""));

      const totBuyDin  = list.reduce((s,a)=>s+(a.valueDin||0),0);
      const totBuyDol  = list.reduce((s,a)=>s+(a.valueDol||0),0);
      const soldList   = list.filter(a=>a.status==="sold");
      const totSellDin = soldList.reduce((s,a)=>s+(a.sellPriceDin||0),0);
      const totProfDin = soldList.reduce((s,a)=>s+(a.profitDin||0),0);
      const totProfDol = soldList.reduce((s,a)=>s+(a.profitDol||0),0);

      const rows = list.map((a,i)=>`<tr style="background:${i%2===0?"#fff":"#F8FAFC"}">
        <td>${i+1}</td>
        <td style="text-align:right;font-weight:700">${a.name||""}</td>
        <td>${a.type||""}</td>
        <td>${a.fund||""}</td>
        <td>${a.date||""}</td>
        <td style="color:#D97706;font-weight:700">${fNum(a.valueDin||0)} د.ع${(a.valueDol||0)>0?" | "+fNum(a.valueDol||0)+" $":""}</td>
        <td style="color:${a.status==="active"?"#0891B2":"#64748B"}">
          ${a.status==="active"?"● نشط":"✓ مباع"}
        </td>
        ${a.status==="sold"?`
          <td style="color:#16A34A;font-weight:700">${fNum(a.sellPriceDin||0)} د.ع</td>
          <td style="color:${(a.profitDin||0)>=0?"#16A34A":"#DC2626"};font-weight:700">
            ${(a.profitDin||0)>=0?"📈":""+" "}${fNum(Math.abs(a.profitDin||0))} د.ع
          </td>
          <td style="color:#64748B;font-size:10px">${a.sellDate||""}</td>
        `:"<td>—</td><td>—</td><td>—</td>"}
      </tr>`).join("");

      html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>${STYLE}</head><body>
${HDR}
<div class="title">📦 تقرير الأصول الثابتة</div>
<div class="info">
  ${filters.status==="all"?"كل الأصول":filters.status==="active"?"النشطة":"المباعة"}
  · ${list.length} أصل
  ${filters.fromDate||filters.toDate?" · الفترة: "+period:""}
</div>
<div class="sg" style="grid-template-columns:repeat(4,1fr)">
  <div class="sb"><div class="sl">عدد الأصول</div><div class="sv" style="color:#0891B2">${assets.filter(a=>a.status==="active").length} نشط</div></div>
  <div class="sb"><div class="sl">إجمالي الشراء دينار</div><div class="sv" style="color:#D97706">${fNum(totBuyDin)} د.ع</div></div>
  <div class="sb" style="background:${totProfDin>=0?"#F0FDF4":"#FFF1F2"}">
    <div class="sl">${totProfDin>=0?"📈 ربح البيع":"📉 خسارة البيع"}</div>
    <div class="sv" style="color:${totProfDin>=0?"#16A34A":"#DC2626"}">${fNum(Math.abs(totProfDin))} د.ع</div>
  </div>
  <div class="sb"><div class="sl">إجمالي الشراء دولار</div><div class="sv" style="color:#2563EB">${fNum(totBuyDol)} $</div></div>
</div>
<table>
  <thead><tr>
    <th>#</th><th style="text-align:right">اسم الأصل</th><th>النوع</th><th>الصندوق</th>
    <th>تاريخ الشراء</th><th>قيمة الشراء</th><th>الحالة</th>
    <th>سعر البيع</th><th>الربح/الخسارة</th><th>تاريخ البيع</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tr class="tot">
    <td colspan="4">الإجمالي</td><td></td>
    <td style="color:#D97706">${fNum(totBuyDin)} د.ع</td><td></td>
    <td style="color:#16A34A">${fNum(totSellDin)} د.ع</td>
    <td style="color:${totProfDin>=0?"#16A34A":"#DC2626"}">${fNum(Math.abs(totProfDin))} د.ع</td>
    <td></td>
  </tr>
</table>
<div class="ft"><span>شركة باب المشاريع</span><span>طُبع: ${today}</span></div>
</body></html>`;

    } else if (reportType === "summary") {
      const fundsDin  = ALL_FUNDS.reduce((s,f)=>s+(funds[f.id]?.din||0),0);
      const fundsDol  = ALL_FUNDS.reduce((s,f)=>s+(funds[f.id]?.dol||0),0);
      const activeDin = projects.filter(p=>p.status==="active").reduce((s,p)=>s+(p.balDin||0),0);
      const activeDol = projects.filter(p=>p.status==="active").reduce((s,p)=>s+(p.balDol||0),0);
      const totalDin  = fundsDin + activeDin;
      const totalDol  = fundsDol + activeDol;

      const fundRows = ALL_FUNDS.map((f,i)=>{
        const b=funds[f.id]||{din:0,dol:0};
        return `<tr style="background:${i%2===0?"#fff":"#F8FAFC"}">
          <td>${f.icon} ${f.label}</td>
          <td style="color:#D97706;font-weight:700">${fNum(b.din)} د.ع</td>
          <td style="color:#2563EB;font-weight:700">${fNum(b.dol)} $</td>
        </tr>`;
      }).join("");

      const projRows = projects.filter(p=>p.status==="active").map((p,i)=>`
        <tr style="background:${i%2===0?"#fff":"#F8FAFC"}">
          <td style="text-align:right">${p.name}</td>
          <td>${p.type||""}</td>
          <td>${p.province||""}</td>
          <td style="color:#16A34A;font-weight:700">${fNum(p.balDin||0)} د.ع</td>
          <td style="color:#2563EB;font-weight:700">${fNum(p.balDol||0)} $</td>
        </tr>`).join("");

      html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>${STYLE}</head><body>
${HDR}
<div class="title">📊 التقرير الشامل</div>
<div class="info">تاريخ: ${today}</div>
<div class="sg" style="grid-template-columns:1fr 1fr">
  <div class="sb" style="background:linear-gradient(135deg,#D97706,#F59E0B);color:#fff">
    <div class="sl" style="color:#FEF3C7">🇮🇶 إجمالي الدينار الكلي</div>
    <div class="sv" style="color:#fff;font-size:18px">${fNum(totalDin)} د.ع</div>
  </div>
  <div class="sb" style="background:linear-gradient(135deg,#1D4ED8,#3B82F6)">
    <div class="sl" style="color:#DBEAFE">🇺🇸 إجمالي الدولار الكلي</div>
    <div class="sv" style="color:#fff;font-size:18px">${fNum(totalDol)} $</div>
  </div>
</div>
<h3>💎 الصناديق السبعة</h3>
<table><thead><tr><th style="text-align:right">الصندوق</th><th>رصيد الدينار</th><th>رصيد الدولار</th></tr></thead>
<tbody>${fundRows}</tbody>
<tr class="tot"><td>إجمالي الصناديق</td><td style="color:#D97706">${fNum(fundsDin)} د.ع</td><td style="color:#2563EB">${fNum(fundsDol)} $</td></tr>
</table>
<h3>🏗️ المشاريع قيد التنفيذ (${projects.filter(p=>p.status==="active").length})</h3>
<table><thead><tr><th style="text-align:right">المشروع</th><th>النوع</th><th>المحافظة</th><th>ميزان دينار</th><th>ميزان دولار</th></tr></thead>
<tbody>${projRows}</tbody>
<tr class="tot"><td colspan="2">إجمالي المشاريع النشطة</td><td></td><td style="color:#16A34A">${fNum(activeDin)} د.ع</td><td style="color:#2563EB">${fNum(activeDol)} $</td></tr>
</table>
<div class="ft"><span>شركة باب المشاريع</span><span>طُبع: ${today}</span></div>
</body></html>`;
    }

    if (!html) return;
    const w = window.open("","_blank","width=1000,height=750");
    if(!w){alert("السماح بالنوافذ المنبثقة");return;}
    w.document.write(html);w.document.close();w.focus();
    setTimeout(()=>w.print(),700);
  };

  const rt = REPORT_TYPES.find(r=>r.id===reportType);

  return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9",
      fontFamily:"Tahoma", direction:"rtl" }}>
      <div style={{ maxWidth:560, margin:"0 auto", padding:"22px 16px" }}>

        <button onClick={onBack} style={{ background:"#fff", border:"1px solid #E2E8F0",
          borderRadius:10, padding:"8px 16px", fontSize:13, color:"#475569",
          cursor:"pointer", marginBottom:16, fontFamily:"Tahoma",
          display:"flex", alignItems:"center", gap:6 }}>← رجوع</button>

        <div style={{ fontSize:18, fontWeight:700, color:"#1E293B", marginBottom:16 }}>
          📊 مركز التقارير
        </div>

        {/* اختيار نوع التقرير */}
        <div style={{ background:"#fff", borderRadius:14, padding:16,
          border:"1px solid #E2E8F0", marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#1E293B", marginBottom:12 }}>
            ١. اختر نوع التقرير
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {REPORT_TYPES.map(r=>(
              <button key={r.id} onClick={()=>setReportType(r.id)} style={{
                background: reportType===r.id ? r.bg : "#fff",
                border:"2px solid "+(reportType===r.id?r.color:"#E2E8F0"),
                borderRadius:12, padding:"12px", cursor:"pointer",
                fontFamily:"Tahoma", textAlign:"right" }}>
                <div style={{ fontSize:20, marginBottom:5 }}>{r.icon}</div>
                <div style={{ fontSize:12, fontWeight:700,
                  color:reportType===r.id?r.color:"#1E293B" }}>{r.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* الفلاتر */}
        {reportType && (
          <div style={{ background:"#fff", borderRadius:14, padding:16,
            border:"1px solid #E2E8F0", marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#1E293B", marginBottom:12 }}>
              ٢. الفلاتر
            </div>

            {/* فلتر التاريخ - لكل التقارير */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
              <div>
                <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:5 }}>من تاريخ</div>
                <input type="date" value={filters.fromDate} onChange={e=>sf("fromDate")(e.target.value)}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                    padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                    boxSizing:"border-box", background:"#F8FAFC" }}/>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:5 }}>إلى تاريخ</div>
                <input type="date" value={filters.toDate} onChange={e=>sf("toDate")(e.target.value)}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                    padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                    boxSizing:"border-box", background:"#F8FAFC" }}/>
              </div>
            </div>

            {/* فلاتر خاصة بالمشاريع */}
            {reportType === "projects" && (
              <>
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:5 }}>
                    الحالة
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                    {[{v:"all",l:"الكل"},{v:"active",l:"● نشطة"},{v:"done",l:"✓ منتهية"}].map(({v,l})=>(
                      <button key={v} onClick={()=>sf("status")(v)} style={{
                        border:"1.5px solid "+(filters.status===v?"#D97706":"#E2E8F0"),
                        borderRadius:8, padding:"8px 6px", cursor:"pointer",
                        fontFamily:"Tahoma", fontSize:11, fontWeight:600,
                        background:filters.status===v?"#FFFBEB":"#fff",
                        color:filters.status===v?"#D97706":"#64748B"
                      }}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:5 }}>النوع</div>
                  <select value={filters.projType} onChange={e=>sf("projType")(e.target.value)}
                    style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                      padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                      direction:"rtl", boxSizing:"border-box", background:"#F8FAFC",
                      appearance:"none" }}>
                    <option value="all">كل الأنواع</option>
                    {PROJ_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* فلاتر خاصة بالصناديق */}
            {reportType === "funds" && (
              <div>
                <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:5 }}>الصندوق</div>
                <select value={filters.fundId} onChange={e=>sf("fundId")(e.target.value)}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                    padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                    direction:"rtl", boxSizing:"border-box", background:"#F8FAFC",
                    appearance:"none" }}>
                  <option value="all">كل الصناديق</option>
                  {ALL_FUNDS.map(f=><option key={f.id} value={f.id}>{f.icon} {f.label}</option>)}
                </select>
              </div>
            )}

            {/* فلاتر خاصة بالأصول */}
            {reportType === "assets" && (
              <div>
                <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:5 }}>الحالة</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                  {[{v:"all",l:"الكل"},{v:"active",l:"● النشطة"},{v:"sold",l:"✓ المباعة"}].map(({v,l})=>(
                    <button key={v} onClick={()=>sf("status")(v)} style={{
                      border:"1.5px solid "+(filters.status===v?"#0891B2":"#E2E8F0"),
                      borderRadius:8, padding:"8px 6px", cursor:"pointer",
                      fontFamily:"Tahoma", fontSize:11, fontWeight:600,
                      background:filters.status===v?"#ECFEFF":"#fff",
                      color:filters.status===v?"#0891B2":"#64748B"
                    }}>{l}</button>
                  ))}
                </div>
              </div>
            )}

            {/* فلاتر خاصة بالشركاء */}
            {reportType === "partners" && (
              <div>
                <div style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:5 }}>الشريك</div>
                <select value={filters.partnerId} onChange={e=>sf("partnerId")(e.target.value)}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:9,
                    padding:"9px 12px", fontSize:13, outline:"none", fontFamily:"Tahoma",
                    direction:"rtl", boxSizing:"border-box", background:"#F8FAFC",
                    appearance:"none" }}>
                  <option value="all">كل الشركاء</option>
                  {PARTNERS_LIST.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {/* زر الطباعة */}
        {reportType && (
          <button onClick={buildReport} style={{
            width:"100%", border:"none", borderRadius:12, padding:"15px",
            fontSize:15, fontWeight:700, fontFamily:"Tahoma",
            background: rt?.color || "#1E293B", color:"#fff", cursor:"pointer" }}>
            🖨️ طباعة {rt?.label}
          </button>
        )}

      </div>
    </div>
  );
}

// ─── صفحة الأصول الثابتة ─────────────────────────────
const ASSET_TYPES = ["معدات","مركبات","عقارات","أثاث","أجهزة","أخرى"];
const ASSET_FUNDS = ["عام","إشراف","ديكور","مقاولات","واجهات"];

function AssetsPage({ funds, onBack }) {
  const [assets,      setAssets]    = useState([]);
  const [tab,         setTab]       = useState("active");
  const [showAdd,     setShowAdd]   = useState(false);
  const [sellTarget,  setSellTarget]= useState(null);
  const [sellQty,     setSellQty]   = useState("1");
  const [sellForm,    setSellForm]  = useState({
    priceDin:"", priceDol:"",
    date: new Date().toISOString().split("T")[0], note:""
  });
  const [form, setForm] = useState({
    name:"", type:"معدات", fund:"عام",
    qty:"1", unitPriceDin:"", unitPriceDol:"",
    date: new Date().toISOString().split("T")[0], note:""
  });
  const sf  = k => v => setForm(f=>({...f,[k]:v}));
  const ssf = k => v => setSellForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    return onSnapshot(collection(db,"assets"), snap=>{
      const list = snap.docs.map(d=>({id:d.id,...d.data()}));
      list.sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
      setAssets(list);
    });
  },[]);

  const addAsset = async () => {
    const qty  = Number(form.qty)||1;
    const uDin = Number(form.unitPriceDin)||0;
    const uDol = Number(form.unitPriceDol)||0;
    if (!form.name.trim()||qty<1||(!uDin&&!uDol)) return;
    const pw = window.prompt("🔒 أدخل الباسورد:");
    if (!pw) return;
    if (pw !== PASS) { alert("❌ باسورد غلط"); return; }
    const totalDin = uDin*qty, totalDol = uDol*qty;
    const bal = funds[form.fund]||{din:0,dol:0};
    if (totalDin > bal.din) { alert("⛔ رصيد الدينار غير كافٍ — المتاح: "+fNum(bal.din)+" د.ع"); return; }
    if (totalDol > bal.dol) { alert("⛔ رصيد الدولار غير كافٍ — المتاح: "+fNum(bal.dol)+" $"); return; }
    await addDoc(collection(db,"assets"),{
      name:form.name.trim(), type:form.type, fund:form.fund,
      qty, qtyRemaining:qty, soldQty:0,
      unitPriceDin:uDin, unitPriceDol:uDol,
      totalDin, totalDol,
      date:form.date, note:form.note.trim(),
      status:"active", createdAt:new Date().toISOString()
    });
    await setDoc(doc(db,"funds",form.fund),{din:bal.din-totalDin,dol:bal.dol-totalDol},{merge:true});
    await addDoc(collection(db,"fund_txs"),{
      fundId:form.fund, fundLabel:form.fund, type:"صرف",
      din:totalDin, dol:totalDol,
      note:"شراء "+qty+"× "+form.name.trim(),
      date:form.date, createdAt:new Date().toISOString()
    });
    setForm({name:"",type:"معدات",fund:"عام",qty:"1",unitPriceDin:"",unitPriceDol:"",
      date:new Date().toISOString().split("T")[0],note:""});
    setShowAdd(false);
  };

  const doSell = async () => {
    if (!sellTarget) return;
    const a   = sellTarget;
    const qty = Math.min(Number(sellQty)||1, a.qtyRemaining||0);
    if (qty<1) return;
    const pDin = Number(sellForm.priceDin)||0;
    const pDol = Number(sellForm.priceDol)||0;
    if (!pDin&&!pDol) return;
    const pw = window.prompt("🔒 أدخل الباسورد:");
    if (!pw) return;
    if (pw !== PASS) { alert("❌ باسورد غلط"); return; }
    const profitDin = pDin - (a.unitPriceDin||0)*qty;
    const profitDol = pDol - (a.unitPriceDol||0)*qty;
    const newQty    = (a.qtyRemaining||0) - qty;
    const bal = funds[a.fund]||{din:0,dol:0};
    await setDoc(doc(db,"funds",a.fund),{din:bal.din+pDin,dol:bal.dol+pDol},{merge:true});
    await addDoc(collection(db,"fund_txs"),{
      fundId:a.fund, fundLabel:a.fund, type:"إيداع",
      din:pDin, dol:pDol,
      note:"بيع "+qty+"× "+a.name,
      date:sellForm.date, createdAt:new Date().toISOString()
    });
    await addDoc(collection(db,"asset_sales"),{
      assetId:a.id, assetName:a.name, qty,
      sellPriceDin:pDin, sellPriceDol:pDol,
      unitBuyDin:a.unitPriceDin||0, unitBuyDol:a.unitPriceDol||0,
      profitDin, profitDol, fund:a.fund,
      date:sellForm.date, note:sellForm.note,
      createdAt:new Date().toISOString()
    });
    await updateDoc(doc(db,"assets",a.id),{
      qtyRemaining:newQty,
      soldQty:(a.soldQty||0)+qty,
      status:newQty===0?"sold":"active",
      lastSellDate:sellForm.date
    });
    setSellTarget(null);
    setSellQty("1");
    setSellForm({priceDin:"",priceDol:"",date:new Date().toISOString().split("T")[0],note:""});
  };

  const list = tab==="active"
    ? assets.filter(a=>(a.qtyRemaining||0)>0)
    : assets;
  const totalActive = assets.filter(a=>(a.qtyRemaining||0)>0).reduce((s,a)=>s+(a.qtyRemaining||0),0);
  const totalSold   = assets.reduce((s,a)=>s+(a.soldQty||0),0);

  return (
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{maxWidth:700,margin:"0 auto",padding:"22px 16px"}}>

        <button onClick={onBack} style={{background:"#fff",border:"1px solid #E2E8F0",
          borderRadius:10,padding:"8px 16px",fontSize:13,color:"#475569",cursor:"pointer",
          marginBottom:16,fontFamily:"Tahoma",display:"flex",alignItems:"center",gap:6}}>
          ← رجوع
        </button>

        {/* هيدر */}
        <div style={{background:"linear-gradient(135deg,#0891B2,#06B6D4)",
          borderRadius:16,padding:"20px 24px",marginBottom:16}}>
          <div style={{fontSize:18,fontWeight:700,color:"#fff",marginBottom:12}}>
            📦 الأصول الثابتة
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {[
              {l:"أنواع مختلفة",v:new Set(assets.map(a=>a.name)).size},
              {l:"وحدات نشطة", v:totalActive},
              {l:"وحدات مباعة",v:totalSold},
            ].map(({l,v},i)=>(
              <div key={i} style={{background:"rgba(255,255,255,0.15)",
                borderRadius:10,padding:"12px",textAlign:"center"}}>
                <div style={{fontSize:10,color:"#CFFAFE",marginBottom:4}}>{l}</div>
                <div style={{fontSize:24,fontWeight:700,color:"#fff"}}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* تبويبات + زر إضافة */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,marginBottom:14}}>
          {[{v:"active",l:"● النشطة"},{v:"all",l:"📋 الكل"}].map(({v,l})=>(
            <button key={v} onClick={()=>setTab(v)} style={{
              border:"none",borderRadius:10,padding:"11px",cursor:"pointer",
              fontFamily:"Tahoma",fontSize:13,fontWeight:700,
              background:tab===v?"#0891B2":"#fff",color:tab===v?"#fff":"#64748B"}}>
              {l}</button>
          ))}
          <button onClick={()=>setShowAdd(v=>!v)} style={{
            border:"none",borderRadius:10,padding:"11px 16px",cursor:"pointer",
            fontFamily:"Tahoma",fontSize:13,fontWeight:700,
            background:showAdd?"#475569":"#1E293B",color:"#fff",whiteSpace:"nowrap"}}>
            {showAdd?"✕ إلغاء":"+ أصل جديد"}
          </button>
        </div>

        {/* فورم الإضافة */}
        {showAdd && (
          <div style={{background:"#fff",borderRadius:14,padding:20,
            border:"1px solid #E2E8F0",marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:"#1E293B",marginBottom:16}}>
              + تسجيل أصل جديد
            </div>

            {/* الاسم */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>اسم الأصل *</div>
              <input placeholder="مثال: مكينة حفر، كرفان، سيارة..." value={form.name}
                onChange={e=>sf("name")(e.target.value)}
                style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                  padding:"11px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                  direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
            </div>

            {/* النوع */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>النوع</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6}}>
                {ASSET_TYPES.map(t=>(
                  <button key={t} onClick={()=>sf("type")(t)} style={{
                    border:"1.5px solid "+(form.type===t?"#0891B2":"#E2E8F0"),
                    borderRadius:8,padding:"7px 4px",cursor:"pointer",
                    fontFamily:"Tahoma",fontSize:11,fontWeight:600,
                    background:form.type===t?"#ECFEFF":"#fff",
                    color:form.type===t?"#0891B2":"#64748B"}}>{t}</button>
                ))}
              </div>
            </div>

            {/* الكمية وسعر الوحدة */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <div style={{fontSize:12,color:"#0891B2",fontWeight:700,marginBottom:5}}>
                  الكمية *
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <button onClick={()=>sf("qty")(q=>String(Math.max(1,Number(q)-1)))}
                    style={{width:36,height:36,borderRadius:8,border:"1px solid #E2E8F0",
                      background:"#fff",fontSize:18,cursor:"pointer",fontFamily:"Tahoma",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                  <input type="text" inputMode="numeric" value={form.qty}
                    onChange={e=>sf("qty")(e.target.value.replace(/[^0-9]/g,"")||"1")}
                    style={{flex:1,border:"2px solid #0891B2",borderRadius:9,
                      padding:"8px",fontSize:20,fontWeight:700,textAlign:"center",
                      outline:"none",fontFamily:"Tahoma",background:"#ECFEFF"}}/>
                  <button onClick={()=>sf("qty")(q=>String(Number(q)+1))}
                    style={{width:36,height:36,borderRadius:8,border:"1px solid #E2E8F0",
                      background:"#fff",fontSize:18,cursor:"pointer",fontFamily:"Tahoma",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                </div>
              </div>
              <div>
                <div style={{fontSize:12,color:"#D97706",fontWeight:600,marginBottom:5}}>
                  سعر الوحدة دينار
                </div>
                <input type="text" inputMode="numeric" placeholder="٠" value={form.unitPriceDin}
                  onChange={e=>sf("unitPriceDin")(e.target.value.replace(/[^0-9]/g,""))}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"11px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
                {Number(form.unitPriceDin)>0 && (
                  <div style={{fontSize:10,color:"#D97706",marginTop:3}}>
                    ✍️ {w2(Number(form.unitPriceDin))} دينار
                    {Number(form.qty)>1&&<span style={{color:"#64748B"}}> → إجمالي: {fNum(Number(form.unitPriceDin)*Number(form.qty))} د.ع</span>}
                  </div>
                )}
              </div>
              <div>
                <div style={{fontSize:12,color:"#2563EB",fontWeight:600,marginBottom:5}}>
                  سعر الوحدة دولار
                </div>
                <input type="text" inputMode="numeric" placeholder="٠" value={form.unitPriceDol}
                  onChange={e=>sf("unitPriceDol")(e.target.value.replace(/[^0-9]/g,""))}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"11px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
                {Number(form.unitPriceDol)>0 && (
                  <div style={{fontSize:10,color:"#2563EB",marginTop:3}}>
                    ✍️ {w2(Number(form.unitPriceDol))} دولار
                    {Number(form.qty)>1&&<span style={{color:"#64748B"}}> → إجمالي: {fNum(Number(form.unitPriceDol)*Number(form.qty))} $</span>}
                  </div>
                )}
              </div>
            </div>

            {/* ملخص الشراء */}
            {form.name.trim() && (Number(form.unitPriceDin)||Number(form.unitPriceDol)) && (
              <div style={{background:"#ECFEFF",borderRadius:10,padding:14,
                marginBottom:12,border:"2px solid #0891B2"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#0891B2",marginBottom:6}}>
                  📋 ملخص الشراء
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,fontSize:12}}>
                  <div style={{textAlign:"center"}}>
                    <div style={{color:"#64748B",marginBottom:2}}>الأصل</div>
                    <div style={{fontWeight:700,color:"#1E293B"}}>{form.name}</div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{color:"#64748B",marginBottom:2}}>الكمية</div>
                    <div style={{fontWeight:700,fontSize:20,color:"#0891B2"}}>{form.qty}</div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{color:"#64748B",marginBottom:2}}>الإجمالي</div>
                    {Number(form.unitPriceDin)>0&&<div style={{fontWeight:700,color:"#D97706"}}>{fNum(Number(form.unitPriceDin)*Number(form.qty))} د.ع</div>}
                    {Number(form.unitPriceDol)>0&&<div style={{fontWeight:700,color:"#2563EB"}}>{fNum(Number(form.unitPriceDol)*Number(form.qty))} $</div>}
                  </div>
                </div>
              </div>
            )}

            {/* الصندوق والتاريخ */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>الصندوق المصدر</div>
                <select value={form.fund} onChange={e=>sf("fund")(e.target.value)}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"10px 12px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                    direction:"rtl",boxSizing:"border-box",background:"#F8FAFC",appearance:"none"}}>
                  {ASSET_FUNDS.map(f=>{
                    const b=funds[f]||{din:0,dol:0};
                    return <option key={f} value={f}>{f} — {fNum(b.din)} د.ع{b.dol>0?" | "+fNum(b.dol)+" $":""}</option>;
                  })}
                </select>
              </div>
              <div>
                <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>تاريخ الشراء</div>
                <input type="date" value={form.date} onChange={e=>sf("date")(e.target.value)}
                  style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                    padding:"10px 12px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                    boxSizing:"border-box",background:"#F8FAFC"}}/>
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>ملاحظة</div>
              <input placeholder="مورد، موقع، أي تفصيل..." value={form.note}
                onChange={e=>sf("note")(e.target.value)}
                style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                  padding:"10px 12px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                  direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
            </div>

            <button onClick={addAsset}
              disabled={!form.name.trim()||!Number(form.qty)||(!Number(form.unitPriceDin)&&!Number(form.unitPriceDol))}
              style={{width:"100%",border:"none",borderRadius:10,padding:"13px",
                fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                background:form.name.trim()&&Number(form.qty)&&(Number(form.unitPriceDin)||Number(form.unitPriceDol))?"#0891B2":"#E2E8F0",
                color:form.name.trim()&&Number(form.qty)&&(Number(form.unitPriceDin)||Number(form.unitPriceDol))?"#fff":"#94A3B8"}}>
              ✅ تسجيل وخصم من الصندوق
            </button>
          </div>
        )}

        {/* قائمة الأصول */}
        {list.length===0 ? (
          <div style={{background:"#fff",borderRadius:14,padding:30,
            textAlign:"center",color:"#94A3B8",border:"1px solid #E2E8F0"}}>
            <div style={{fontSize:40,marginBottom:8}}>📦</div>
            <div>ما في أصول</div>
          </div>
        ) : list.map(a=>(
          <div key={a.id} style={{background:"#fff",borderRadius:14,padding:"16px 18px",
            marginBottom:10,border:"1px solid #E2E8F0",
            borderRight:"5px solid "+((a.qtyRemaining||0)>0?"#0891B2":"#94A3B8")}}>

            <div style={{display:"grid",gridTemplateColumns:"1fr auto",
              gap:12,alignItems:"start",marginBottom:12}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"#1E293B",marginBottom:4}}>
                  {a.name}
                </div>
                <div style={{fontSize:11,color:"#64748B"}}>
                  📂 {a.type} · 🏦 {a.fund} · 📅 {a.date}
                  {a.note&&" · "+a.note}
                </div>
              </div>
              {(a.qtyRemaining||0)>0 && (
                <button onClick={()=>{setSellTarget(a);setSellQty("1");}} style={{
                  background:"#FFF7ED",border:"1.5px solid #F97316",
                  borderRadius:9,padding:"8px 16px",cursor:"pointer",
                  fontSize:12,fontFamily:"Tahoma",fontWeight:700,color:"#F97316"}}>
                  💰 بيع
                </button>
              )}
            </div>

            {/* شريط الكميات */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
              {[
                {l:"الإجمالي",  v:a.qty||0,        c:"#1E293B", bg:"#F1F5F9"},
                {l:"مباع",      v:a.soldQty||0,    c:"#F97316", bg:"#FFF7ED"},
                {l:"⬛ متبقي",   v:a.qtyRemaining||0,c:(a.qtyRemaining||0)>0?"#0891B2":"#94A3B8",
                  bg:(a.qtyRemaining||0)>0?"#ECFEFF":"#F8FAFC",
                  border:(a.qtyRemaining||0)>0?"2px solid #0891B2":"1px solid #E2E8F0"},
              ].map(({l,v,c,bg,border},i)=>(
                <div key={i} style={{background:bg,borderRadius:10,padding:"10px",
                  textAlign:"center",border:border||"1px solid transparent"}}>
                  <div style={{fontSize:9,color:"#64748B",marginBottom:3}}>{l}</div>
                  <div style={{fontSize:22,fontWeight:700,color:c}}>{v}</div>
                  <div style={{fontSize:9,color:"#94A3B8"}}>وحدة</div>
                </div>
              ))}
            </div>

            {/* الأسعار */}
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {(a.unitPriceDin||0)>0&&(
                <span style={{background:"#FFFBEB",borderRadius:7,padding:"4px 10px",
                  fontSize:11,color:"#D97706",fontWeight:700}}>
                  {fNum(a.unitPriceDin)} د.ع / وحدة
                  {(a.qty||0)>1&&<span style={{color:"#94A3B8",fontWeight:400}}> | إجمالي: {fNum((a.totalDin||0))} د.ع</span>}
                </span>
              )}
              {(a.unitPriceDol||0)>0&&(
                <span style={{background:"#EFF6FF",borderRadius:7,padding:"4px 10px",
                  fontSize:11,color:"#2563EB",fontWeight:700}}>
                  {fNum(a.unitPriceDol)} $ / وحدة
                </span>
              )}
              {(a.qtyRemaining||0)===0&&(
                <span style={{background:"#F1F5F9",borderRadius:7,padding:"4px 10px",
                  fontSize:11,color:"#64748B"}}>✓ مباع بالكامل · {a.lastSellDate||""}</span>
              )}
            </div>
          </div>
        ))}

        {/* نافذة البيع */}
        {sellTarget && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",
            zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
            <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:460,
              maxHeight:"90vh",overflow:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.4)"}}>
              <div style={{padding:"18px 22px",borderBottom:"1px solid #E2E8F0",
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:16,fontWeight:700,color:"#F97316"}}>
                  💰 بيع — {sellTarget.name}
                </div>
                <button onClick={()=>setSellTarget(null)} style={{background:"none",
                  border:"none",fontSize:20,cursor:"pointer",color:"#64748B"}}>✕</button>
              </div>
              <div style={{padding:"20px 22px"}}>

                {/* الكميات الحالية */}
                <div style={{background:"#F8FAFC",borderRadius:12,padding:14,marginBottom:18}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,textAlign:"center"}}>
                    {[{l:"الإجمالي",v:sellTarget.qty||0,c:"#1E293B"},
                      {l:"مباع",   v:sellTarget.soldQty||0,c:"#F97316"},
                      {l:"متبقي",  v:sellTarget.qtyRemaining||0,c:"#16A34A"}].map(({l,v,c},i)=>(
                      <div key={i}>
                        <div style={{fontSize:10,color:"#64748B",marginBottom:3}}>{l}</div>
                        <div style={{fontSize:24,fontWeight:700,color:c}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:10,fontSize:11,color:"#64748B",textAlign:"center"}}>
                    سعر الشراء: {fNum(sellTarget.unitPriceDin||0)} د.ع / وحدة
                    {(sellTarget.unitPriceDol||0)>0&&" | "+fNum(sellTarget.unitPriceDol)+" $"}
                  </div>
                </div>

                {/* اختيار الكمية */}
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#1E293B",marginBottom:10}}>
                    كم وحدة تريد تبيع؟
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <button onClick={()=>setSellQty(q=>String(Math.max(1,Number(q)-1)))}
                      style={{width:48,height:48,borderRadius:12,border:"1px solid #E2E8F0",
                        background:"#fff",fontSize:24,cursor:"pointer",fontFamily:"Tahoma"}}>−</button>
                    <input type="text" inputMode="numeric" value={sellQty}
                      onChange={e=>{
                        const v=Number(e.target.value.replace(/[^0-9]/g,""))||1;
                        setSellQty(String(Math.min(sellTarget.qtyRemaining||0,Math.max(1,v))));
                      }}
                      style={{flex:1,border:"2px solid #F97316",borderRadius:12,
                        padding:"10px",fontSize:28,fontWeight:700,textAlign:"center",
                        outline:"none",fontFamily:"Tahoma"}}/>
                    <button onClick={()=>setSellQty(q=>String(Math.min(sellTarget.qtyRemaining||0,Number(q)+1)))}
                      style={{width:48,height:48,borderRadius:12,border:"1px solid #E2E8F0",
                        background:"#fff",fontSize:24,cursor:"pointer",fontFamily:"Tahoma"}}>+</button>
                  </div>
                  <div style={{textAlign:"center",fontSize:12,color:"#64748B",marginTop:8}}>
                    تكلفة الشراء: {fNum((sellTarget.unitPriceDin||0)*Number(sellQty))} د.ع
                  </div>
                </div>

                {/* سعر البيع */}
                {[{k:"priceDin",l:"سعر البيع دينار",c:"#16A34A",buy:(sellTarget.unitPriceDin||0)*Number(sellQty)},
                  {k:"priceDol",l:"سعر البيع دولار",c:"#2563EB",buy:(sellTarget.unitPriceDol||0)*Number(sellQty)}
                ].map(({k,l,c,buy})=>(
                  <div key={k} style={{marginBottom:12}}>
                    <div style={{fontSize:12,color:c,fontWeight:600,marginBottom:5}}>{l}</div>
                    <input type="text" inputMode="numeric" placeholder="٠" value={sellForm[k]}
                      onChange={e=>ssf(k)(e.target.value.replace(/[^0-9]/g,""))}
                      style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                        padding:"11px 13px",fontSize:14,outline:"none",fontFamily:"Tahoma",
                        direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
                    {Number(sellForm[k])>0 && (
                      <div style={{fontSize:11,fontWeight:600,marginTop:4,
                        display:"flex",justifyContent:"space-between"}}>
                        <span style={{color:c}}>✍️ {w2(Number(sellForm[k]))} {k==="priceDin"?"دينار":"دولار"}</span>
                        {buy>0&&(
                          <span style={{color:Number(sellForm[k])>=buy?"#16A34A":"#DC2626",fontWeight:700}}>
                            {Number(sellForm[k])>=buy?"📈 ربح":"📉 خسارة"}: {fNum(Math.abs(Number(sellForm[k])-buy))} {k==="priceDin"?"د.ع":"$"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                  <div>
                    <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>التاريخ</div>
                    <input type="date" value={sellForm.date} onChange={e=>ssf("date")(e.target.value)}
                      style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                        padding:"10px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                        boxSizing:"border-box",background:"#F8FAFC"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:12,color:"#64748B",fontWeight:600,marginBottom:5}}>ملاحظة</div>
                    <input placeholder="اسم المشتري..." value={sellForm.note}
                      onChange={e=>ssf("note")(e.target.value)}
                      style={{width:"100%",border:"1px solid #CBD5E1",borderRadius:9,
                        padding:"10px",fontSize:13,outline:"none",fontFamily:"Tahoma",
                        direction:"rtl",boxSizing:"border-box",background:"#F8FAFC"}}/>
                  </div>
                </div>

                <button onClick={doSell}
                  disabled={!Number(sellForm.priceDin)&&!Number(sellForm.priceDol)}
                  style={{width:"100%",border:"none",borderRadius:10,padding:"14px",
                    fontSize:14,fontWeight:700,fontFamily:"Tahoma",cursor:"pointer",
                    background:Number(sellForm.priceDin)||Number(sellForm.priceDol)?"#F97316":"#E2E8F0",
                    color:Number(sellForm.priceDin)||Number(sellForm.priceDol)?"#fff":"#94A3B8"}}>
                  ✅ تأكيد بيع {sellQty} وحدة وإضافة للصندوق
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
