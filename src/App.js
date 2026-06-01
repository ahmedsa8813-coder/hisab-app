import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import {
  collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, setDoc, getDoc
} from "firebase/firestore";

const USERS = [
  { id: "manager", name: "المدير المالي", role: "manager", pin: "0000" },
  { id: "noor", name: "نور", role: "employee", pin: "1111" },
  { id: "mohammed", name: "محمد", role: "employee", pin: "2222" },
  { id: "hussein", name: "حسين", role: "employee", pin: "3333" },
  { id: "ahmed", name: "أحمد", role: "employee", pin: "4444" },
  { id: "ihab", name: "إيهاب", role: "employee", pin: "5555" },
];

const SPECIALIZATIONS = ["مقاولات", "ديكور", "واجهات"];
const PROVINCES = ["بغداد","البصرة","نينوى","أربيل","النجف","كربلاء","الأنبار","ديالى","صلاح الدين","بابل","واسط","ذي قار","المثنى","القادسية","ميسان","كركوك","السليمانية","دهوك","حلبجة"];

const toAr = (n) => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
const fmt = (n, cur) => toAr(Number(n||0).toLocaleString("ar-IQ")) + (cur==="دولار"?" $":" د.ع");

function getUserFromURL() {
  const params = new URLSearchParams(window.location.search);
  return USERS.find(u => u.id === params.get("user")) || null;
}

function useLayout() {
  const [layout, setLayout] = useState(window.innerWidth >= 900 ? "desktop" : "mobile");
  useEffect(() => {
    const fn = () => setLayout(window.innerWidth >= 900 ? "desktop" : "mobile");
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return layout;
}

export default function App() {
  const urlUser = getUserFromURL();
  const layout = useLayout();
  const [manualLayout, setManualLayout] = useState(null);
  const activeLayout = manualLayout || layout;

  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState("login");
  const [loginId, setLoginId] = useState(urlUser?.id || null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [view, setView] = useState("home");
  const [transactions, setTransactions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [openingBalances, setOpeningBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type:"استلام", projectId:"", amount:"", currency:"دينار", note:"", date:new Date().toISOString().split("T")[0], image:null });
  const [formSuccess, setFormSuccess] = useState(false);
  const [newProject, setNewProject] = useState({ name:"", specialization:"مقاولات", province:"بغداد" });
  const [filterUser, setFilterUser] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterCurrency, setFilterCurrency] = useState("دينار");
  const [selectedUserStatement, setSelectedUserStatement] = useState(null);
  const [viewImage, setViewImage] = useState(null);
  const [openingForm, setOpeningForm] = useState({});
  const [openingSuccess, setOpeningSuccess] = useState(false);
  const imgRef = useRef();

  useEffect(() => {
    const unsubs = [];
    const q1 = query(collection(db, "transactions"), orderBy("date", "desc"));
    unsubs.push(onSnapshot(q1, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }));
    unsubs.push(onSnapshot(collection(db, "projects"), snap => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));
    unsubs.push(onSnapshot(collection(db, "openingBalances"), snap => {
      const ob = {};
      snap.docs.forEach(d => { ob[d.id] = d.data(); });
      setOpeningBalances(ob);
    }));
    return () => unsubs.forEach(u => u());
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, image: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleLogin = () => {
    const u = USERS.find(u => u.id === loginId);
    if (u && pin === u.pin) { setUser(u); setScreen("app"); setView("home"); setPinError(false); }
    else { setPinError(true); setPin(""); }
  };

  const submitTransaction = async () => {
    if (!form.projectId || !form.amount || !form.date) return;
    const proj = projects.find(p => p.id === form.projectId);
    await addDoc(collection(db, "transactions"), {
      userId: user.id, userName: user.name,
      projectId: form.projectId,
      projectName: proj ? `${proj.name} - ${proj.specialization} - ${proj.province}` : "",
      type: form.type, amount: Number(form.amount),
      currency: form.currency, note: form.note, date: form.date,
      image: form.image || null, createdAt: new Date().toISOString(),
    });
    setFormSuccess(true);
    setTimeout(() => {
      setFormSuccess(false);
      setForm({ type:"استلام", projectId:"", amount:"", currency:"دينار", note:"", date:new Date().toISOString().split("T")[0], image:null });
      setView("home");
    }, 1500);
  };

  const saveOpeningBalances = async () => {
    for (const uid of Object.keys(openingForm)) {
      const data = openingForm[uid];
      await setDoc(doc(db, "openingBalances", uid), {
        dinarReceived: Number(data.dinarReceived || 0),
        dinarSpent: Number(data.dinarSpent || 0),
        dollarReceived: Number(data.dollarReceived || 0),
        dollarSpent: Number(data.dollarSpent || 0),
      });
    }
    setOpeningSuccess(true);
    setTimeout(() => setOpeningSuccess(false), 2000);
  };

  const addProject = async () => {
    if (!newProject.name.trim()) return;
    await addDoc(collection(db, "projects"), { name:newProject.name.trim(), specialization:newProject.specialization, province:newProject.province });
    setNewProject({ name:"", specialization:"مقاولات", province:"بغداد" });
  };

  const deleteProject = async (id) => { if (window.confirm("تحذف المشروع؟")) await deleteDoc(doc(db, "projects", id)); };
  const deleteTransaction = async (id) => { if (window.confirm("تحذف المعاملة؟")) await deleteDoc(doc(db, "transactions", id)); };

  const calcBalance = (txList, ob, cur) => {
    const obRec = cur==="دينار" ? (ob?.dinarReceived||0) : (ob?.dollarReceived||0);
    const obSp = cur==="دينار" ? (ob?.dinarSpent||0) : (ob?.dollarSpent||0);
    const filtered = txList.filter(t => t.currency===cur || (cur==="دينار" && !t.currency));
    const rec = filtered.filter(t=>t.type==="استلام").reduce((s,t)=>s+t.amount,0) + obRec;
    const sp = filtered.filter(t=>t.type==="صرف").reduce((s,t)=>s+t.amount,0) + obSp;
    return { received:rec, spent:sp, balance:rec-sp };
  };

  const myTx = transactions.filter(t => user && t.userId===user.id);
  const myOB = openingBalances[user?.id] || {};
  const dinarStats = calcBalance(myTx, myOB, "دينار");
  const dollarStats = calcBalance(myTx, myOB, "دولار");

  const employeeBalances = USERS.filter(u=>u.role==="employee").map(u => {
    const tx = transactions.filter(t=>t.userId===u.id);
    const ob = openingBalances[u.id] || {};
    return { ...u, dinar:calcBalance(tx,ob,"دينار"), dollar:calcBalance(tx,ob,"دولار"), txCount:tx.length };
  });

  const statementUser = USERS.find(u=>u.id===selectedUserStatement);
  const statementOB = openingBalances[selectedUserStatement] || {};
  const statementTxRaw = selectedUserStatement ? transactions.filter(t => {
    if (t.userId!==selectedUserStatement) return false;
    if (t.currency!==filterCurrency && !(filterCurrency==="دينار"&&!t.currency)) return false;
    if (filterProject!=="all" && t.projectId!==filterProject) return false;
    if (filterFrom && t.date<filterFrom) return false;
    if (filterTo && t.date>filterTo) return false;
    return true;
  }) : [];

  const obRec = !filterFrom && !filterProject || filterProject==="all" && !filterFrom
    ? (filterCurrency==="دينار"?(statementOB.dinarReceived||0):(statementOB.dollarReceived||0)) : 0;
  const obSp = !filterFrom && !filterProject || filterProject==="all" && !filterFrom
    ? (filterCurrency==="دينار"?(statementOB.dinarSpent||0):(statementOB.dollarSpent||0)) : 0;
  const stRec = statementTxRaw.filter(t=>t.type==="استلام").reduce((s,t)=>s+t.amount,0) + obRec;
  const stSp = statementTxRaw.filter(t=>t.type==="صرف").reduce((s,t)=>s+t.amount,0) + obSp;
  const stBal = stRec - stSp;

  const filteredTx = transactions.filter(t => {
    if (filterUser!=="all" && t.userId!==filterUser) return false;
    if (filterProject!=="all" && t.projectId!==filterProject) return false;
    if (filterFrom && t.date<filterFrom) return false;
    if (filterTo && t.date>filterTo) return false;
    return true;
  });

  const exportPDF = () => {
    const projLabel = filterProject!=="all" ? (() => { const p=projects.find(p=>p.id===filterProject); return p?`${p.name} - ${p.specialization} - ${p.province}`:""; })() : "كل المشاريع";
    const obRow = (obRec||obSp) ? `<tr style="background:#fff8e1"><td>${filterFrom||"قبل النظام"}</td><td>-</td><td style="color:gray">رصيد افتتاحي</td><td>${toAr(obRec.toLocaleString("ar-IQ"))}</td><td>${toAr(obSp.toLocaleString("ar-IQ"))}</td><td>-</td></tr>` : "";
    const rows = statementTxRaw.map(t=>`
      <tr>
        <td>${t.date}</td><td>${t.projectName}</td>
        <td style="color:${t.type==='استلام'?'green':'red'}">${t.type}</td>
        <td>${t.type==='استلام'?toAr(Number(t.amount).toLocaleString("ar-IQ")):'-'}</td>
        <td>${t.type==='صرف'?toAr(Number(t.amount).toLocaleString("ar-IQ")):'-'}</td>
        <td>${t.note||"-"}</td>
      </tr>`).join("");
    const html=`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
    <title>كشف حساب - ${statementUser?.name}</title>
    <style>body{font-family:Tahoma,sans-serif;padding:30px;color:#111;direction:rtl}
    h1{color:#1d4ed8;font-size:20px}
    .info{font-size:13px;color:#555;margin:8px 0 20px}
    .summary{display:flex;gap:12px;margin-bottom:24px}
    .box{border:1px solid #ddd;border-radius:8px;padding:12px;flex:1;text-align:center}
    .label{font-size:11px;color:#888}.val{font-size:16px;font-weight:bold;margin-top:4px}
    .green{color:#047857}.red{color:#991b1b}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{background:#1d4ed8;color:white;padding:8px}
    td{padding:7px 8px;border-bottom:1px solid #eee;text-align:center}
    tr:nth-child(even){background:#f9f9f9}
    .footer{margin-top:24px;font-size:11px;color:#aaa;text-align:center}</style></head>
    <body>
    <h1>كشف حساب - ${statementUser?.name}</h1>
    <div class="info">العملة: ${filterCurrency} | المشروع: ${projLabel} | من: ${filterFrom||"البداية"} | إلى: ${filterTo||"الآن"}</div>
    <div class="summary">
      <div class="box"><div class="label">إجمالي الاستلام</div><div class="val green">${fmt(stRec,filterCurrency)}</div></div>
      <div class="box"><div class="label">إجمالي الصرف</div><div class="val red">${fmt(stSp,filterCurrency)}</div></div>
      <div class="box"><div class="label">الرصيد</div><div class="val ${stBal>=0?'green':'red'}">${fmt(Math.abs(stBal),filterCurrency)} ${stBal>=0?'متبقي':'عليه'}</div></div>
    </div>
    <table><thead><tr><th>التاريخ</th><th>المشروع</th><th>النوع</th><th>استلام</th><th>صرف</th><th>ملاحظات</th></tr></thead>
    <tbody>${obRow}${rows}</tbody></table>
    <div class="footer">نظام حساب - ${new Date().toLocaleDateString("ar-IQ")}</div>
    </body></html>`;
    const w=window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),500);
  };

  const D = activeLayout==="desktop"; // is desktop

  // ===== LOGIN =====
  if (screen==="login") return (
    <div style={S.page}>
      <div style={D ? S.loginWrapD : S.loginWrap}>
        <div style={S.logo}>
          <div style={S.logoText}>حساب</div>
          <div style={S.logoSub}>نظام المصروفيات</div>
        </div>
        {!loginId ? (
          <>
            <div style={S.label}>اختر حسابك</div>
            <div style={D ? S.userGridD : S.userGrid}>
              {USERS.map(u => (
                <button key={u.id} style={{ ...S.userBtn, ...(u.role==="manager"?{ ...S.managerBtn, ...(D?{gridColumn:"1/-1"}:{gridColumn:"1/-1"}) }:{}) }}
                  onClick={() => { setLoginId(u.id); setPin(""); setPinError(false); }}>
                  <div style={{ ...S.avatar, background:u.role==="manager"?"linear-gradient(135deg,#1d4ed8,#2563eb)":"linear-gradient(135deg,#f59e0b,#d97706)" }}>{u.name[0]}</div>
                  <div style={S.userBtnName}>{u.name}</div>
                  <div style={S.userBtnRole}>{u.role==="manager"?"مدير مالي":"حسابات"}</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={S.selectedUser}>
              <div style={{ ...S.avatar, background:USERS.find(u=>u.id===loginId)?.role==="manager"?"linear-gradient(135deg,#1d4ed8,#2563eb)":"linear-gradient(135deg,#f59e0b,#d97706)" }}>
                {USERS.find(u=>u.id===loginId)?.name[0]}
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:700 }}>{USERS.find(u=>u.id===loginId)?.name}</div>
                <div style={{ fontSize:12, color:"#9ca3af" }}>{USERS.find(u=>u.id===loginId)?.role==="manager"?"مدير مالي":"حسابات"}</div>
              </div>
            </div>
            <div style={S.label}>أدخل الرمز السري</div>
            <div style={S.pinDots}>
              {[0,1,2,3].map(i=><div key={i} style={{ ...S.dot, background:pin.length>i?"#f59e0b":"rgba(255,255,255,0.15)" }}/>)}
            </div>
            {pinError && <div style={S.pinError}>رمز خاطئ، حاول مرة ثانية</div>}
            <div style={D ? S.numpadD : S.numpad}>
              {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k,i)=>(
                <button key={i} style={k===""?S.numEmpty:S.numBtn} onClick={()=>{
                  if(!k)return;
                  if(k==="⌫"){setPin(p=>p.slice(0,-1));setPinError(false);}
                  else if(pin.length<4) setPin(p=>p+k);
                }}>{k}</button>
              ))}
            </div>
            <button style={S.loginBtn} onClick={handleLogin}>دخول</button>
            {!urlUser && <button style={S.backBtn} onClick={()=>{setLoginId(null);setPin("");}}>← رجوع</button>}
          </>
        )}
      </div>
    </div>
  );

  // ===== APP =====
  return (
    <div style={S.page}>
      {viewImage && <div style={S.imgOverlay} onClick={()=>setViewImage(null)}><img src={viewImage} style={S.imgFull} alt="وصل"/></div>}
      <div style={D ? S.appWrapD : S.appWrap}>

        {/* HEADER */}
        <div style={D ? S.headerD : S.header}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ ...S.avatar, width:36, height:36, fontSize:15, margin:0, background:user.role==="manager"?"linear-gradient(135deg,#1d4ed8,#2563eb)":"linear-gradient(135deg,#f59e0b,#d97706)" }}>{user.name[0]}</div>
            <div>
              <div style={S.headerName}>{user.name}</div>
              <div style={S.headerRole}>{user.role==="manager"?"مدير مالي":"حسابات - "+user.name}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <button style={S.layoutBtn} onClick={()=>setManualLayout(activeLayout==="desktop"?"mobile":"desktop")}>
              {activeLayout==="desktop"?"📱":"🖥️"}
            </button>
            <button style={S.logoutBtn} onClick={()=>{setUser(null);setScreen("login");setPin("");setView("home");}}>خروج</button>
          </div>
        </div>

        <div style={D ? S.appBodyD : {}}>
          {/* SIDEBAR for desktop */}
          {D && (
            <div style={S.sidebar}>
              {user.role==="employee" ? <>
                <SideBtn icon="🏠" label="الرئيسية" active={view==="home"} onClick={()=>setView("home")}/>
                <SideBtn icon="➕" label="تسجيل معاملة" active={view==="add"} onClick={()=>setView("add")}/>
              </> : <>
                <SideBtn icon="📊" label="ملخص الحسابات" active={view==="home"} onClick={()=>setView("home")}/>
                <SideBtn icon="📋" label="كل المعاملات" active={view==="allTx"} onClick={()=>setView("allTx")}/>
                <SideBtn icon="🏗️" label="إدارة المشاريع" active={view==="projects"} onClick={()=>setView("projects")}/>
                <SideBtn icon="⚖️" label="الأرصدة الافتتاحية" active={view==="opening"} onClick={()=>setView("opening")}/>
                {view==="statement" && <SideBtn icon="📄" label={"كشف: "+statementUser?.name} active={true} onClick={()=>{}}/>}
              </>}
            </div>
          )}

          <div style={D ? S.mainContent : S.content}>
            {loading && <div style={S.empty}>جاري التحميل...</div>}

            {/* EMPLOYEE HOME */}
            {!loading && user.role==="employee" && view==="home" && (
              <div>
                <div style={D ? S.cardsRowD : {}}>
                  <div style={{ ...S.balCard, background:"linear-gradient(135deg,#065f46,#047857)", flex:D?1:undefined, marginBottom:D?0:10, marginLeft:D?10:0 }}>
                    <div style={S.balLabel}>🇮🇶 دينار عراقي</div>
                    <div style={S.balAmount}>{fmt(Math.abs(dinarStats.balance),"دينار")}</div>
                    <div style={S.balSub}>{dinarStats.balance>=0?"متبقي معك":"عليك"}</div>
                    <div style={S.balRow}>
                      <span style={S.balStat}>↓ {fmt(dinarStats.received,"دينار")}</span>
                      <span style={S.balStat}>↑ {fmt(dinarStats.spent,"دينار")}</span>
                    </div>
                  </div>
                  <div style={{ ...S.balCard, background:"linear-gradient(135deg,#1d4ed8,#2563eb)", flex:D?1:undefined, marginBottom:16 }}>
                    <div style={S.balLabel}>🇺🇸 دولار أمريكي</div>
                    <div style={S.balAmount}>{fmt(Math.abs(dollarStats.balance),"دولار")}</div>
                    <div style={S.balSub}>{dollarStats.balance>=0?"متبقي معك":"عليك"}</div>
                    <div style={S.balRow}>
                      <span style={S.balStat}>↓ {fmt(dollarStats.received,"دولار")}</span>
                      <span style={S.balStat}>↑ {fmt(dollarStats.spent,"دولار")}</span>
                    </div>
                  </div>
                </div>
                {!D && <button style={S.addBtn} onClick={()=>{setView("add");setForm({type:"استلام",projectId:"",amount:"",currency:"دينار",note:"",date:new Date().toISOString().split("T")[0],image:null});}}>+ تسجيل معاملة جديدة</button>}
                <div style={S.secTitle}>سجل المعاملات</div>
                {myTx.length===0 && <div style={S.empty}>ما عندك معاملات بعد</div>}
                <div style={D ? S.txGridD : {}}>
                  {myTx.map(t=><TxCard key={t.id} t={t} onViewImage={setViewImage} desktop={D}/>)}
                </div>
              </div>
            )}

            {/* EMPLOYEE ADD */}
            {!loading && user.role==="employee" && view==="add" && (
              <div style={D?{maxWidth:600}:{}}>
                <div style={S.secTitle}>معاملة جديدة</div>
                {formSuccess ? <div style={S.successBox}><div style={S.successIcon}>✓</div><div>تم التسجيل!</div></div> : (
                  <div style={S.formCard}>
                    <div style={S.fieldLabel}>نوع المعاملة</div>
                    <div style={S.typeRow}>
                      {["استلام","صرف"].map(t=>(
                        <button key={t} style={{...S.typeBtn,...(form.type===t?(t==="استلام"?S.typeBtnGreen:S.typeBtnRed):{})}} onClick={()=>setForm(f=>({...f,type:t}))}>
                          {t==="استلام"?"↓ استلام":"↑ صرف"}
                        </button>
                      ))}
                    </div>
                    <div style={S.fieldLabel}>العملة</div>
                    <div style={S.typeRow}>
                      {["دينار","دولار"].map(c=>(
                        <button key={c} style={{...S.typeBtn,...(form.currency===c?S.typeBtnBlue:{})}} onClick={()=>setForm(f=>({...f,currency:c}))}>
                          {c==="دينار"?"🇮🇶 دينار":"🇺🇸 دولار"}
                        </button>
                      ))}
                    </div>
                    <div style={S.fieldLabel}>المشروع</div>
                    <select style={S.select} value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))}>
                      <option value="">اختر المشروع</option>
                      {projects.map(p=><option key={p.id} value={p.id}>{p.name} - {p.specialization} - {p.province}</option>)}
                    </select>
                    <div style={D?S.rowD:{}}>
                      <div style={D?{flex:1}:{}}>
                        <div style={S.fieldLabel}>المبلغ</div>
                        <input style={S.input} type="number" placeholder="٠" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/>
                      </div>
                      <div style={D?{flex:1}:{}}>
                        <div style={S.fieldLabel}>التاريخ</div>
                        <input style={S.input} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
                      </div>
                    </div>
                    <div style={S.fieldLabel}>ملاحظات</div>
                    <textarea style={S.textarea} placeholder="اكتب تفاصيل..." value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={2}/>
                    <div style={S.fieldLabel}>صورة الوصل (اختياري)</div>
                    <input ref={imgRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handleImageChange}/>
                    <button style={S.imgBtn} onClick={()=>imgRef.current.click()}>
                      {form.image?"✓ تم اختيار الصورة":"📷 التقط أو اختر صورة"}
                    </button>
                    {form.image && <img src={form.image} style={S.imgPreview} alt="preview" onClick={()=>setViewImage(form.image)}/>}
                    <button style={S.submitBtn} onClick={submitTransaction}>حفظ</button>
                    <button style={S.cancelBtn} onClick={()=>setView("home")}>إلغاء</button>
                  </div>
                )}
              </div>
            )}

            {/* MANAGER HOME */}
            {!loading && user.role==="manager" && view==="home" && (
              <div>
                <div style={S.secTitle}>ملخص الحسابات</div>
                <div style={D ? S.empGridD : {}}>
                  {employeeBalances.map(e=>(
                    <button key={e.id} style={S.empCard} onClick={()=>{setSelectedUserStatement(e.id);setFilterFrom("");setFilterTo("");setFilterProject("all");setFilterCurrency("دينار");setView("statement");}}>
                      <div style={S.empTop}>
                        <div style={{...S.avatar,width:40,height:40,fontSize:17,margin:0}}>{e.name[0]}</div>
                        <div style={{flex:1}}>
                          <div style={S.empName}>{e.name}</div>
                          <div style={S.empSub}>{toAr(e.txCount)} معاملة</div>
                        </div>
                        <div style={{textAlign:"center",marginLeft:8}}>
                          <div style={{fontSize:11,color:"#34d399"}}>{fmt(Math.abs(e.dinar.balance),"دينار")}</div>
                          <div style={{fontSize:11,color:"#60a5fa",marginTop:2}}>{fmt(Math.abs(e.dollar.balance),"دولار")}</div>
                        </div>
                        <div style={{color:"#6b7280",marginRight:4}}>←</div>
                      </div>
                    </button>
                  ))}
                </div>
                {!D && <>
                  <div style={{height:12}}/>
                  <button style={{...S.addBtn,background:"linear-gradient(135deg,#1d4ed8,#2563eb)"}} onClick={()=>setView("allTx")}>📋 كل المعاملات</button>
                  <button style={{...S.addBtn,background:"linear-gradient(135deg,#065f46,#047857)",marginTop:10}} onClick={()=>setView("projects")}>🏗️ إدارة المشاريع</button>
                  <button style={{...S.addBtn,background:"linear-gradient(135deg,#7c3aed,#6d28d9)",marginTop:10}} onClick={()=>setView("opening")}>⚖️ الأرصدة الافتتاحية</button>
                </>}
              </div>
            )}

            {/* MANAGER STATEMENT */}
            {!loading && user.role==="manager" && view==="statement" && (
              <div>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                  {!D && <button style={S.backIconBtn} onClick={()=>setView("home")}>←</button>}
                  <div style={S.secTitle}>كشف حساب - {statementUser?.name}</div>
                </div>
                <div style={D?S.statementLayoutD:{}}>
                  <div style={D?{width:280}:{}}>
                    <div style={S.filterCard}>
                      <div style={S.fieldLabel}>العملة</div>
                      <div style={S.typeRow}>
                        {["دينار","دولار"].map(c=>(
                          <button key={c} style={{...S.typeBtn,...(filterCurrency===c?S.typeBtnBlue:{})}} onClick={()=>setFilterCurrency(c)}>
                            {c==="دينار"?"🇮🇶 دينار":"🇺🇸 دولار"}
                          </button>
                        ))}
                      </div>
                      <div style={S.fieldLabel}>المشروع</div>
                      <select style={S.select} value={filterProject} onChange={e=>setFilterProject(e.target.value)}>
                        <option value="all">كل المشاريع</option>
                        {projects.map(p=><option key={p.id} value={p.id}>{p.name} - {p.specialization} - {p.province}</option>)}
                      </select>
                      <div style={S.fieldLabel}>من تاريخ</div>
                      <input style={S.input} type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)}/>
                      <div style={S.fieldLabel}>إلى تاريخ</div>
                      <input style={S.input} type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)}/>
                      <button style={{...S.submitBtn,marginTop:16,background:"linear-gradient(135deg,#1d4ed8,#2563eb)"}} onClick={exportPDF}>📄 تصدير PDF</button>
                    </div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{...S.balCard,background:stBal>=0?"linear-gradient(135deg,#065f46,#047857)":"linear-gradient(135deg,#7f1d1d,#991b1b)",marginBottom:16}}>
                      <div style={S.balLabel}>الرصيد - {filterCurrency}</div>
                      <div style={S.balAmount}>{fmt(Math.abs(stBal),filterCurrency)}</div>
                      <div style={S.balSub}>{stBal>=0?"متبقي معه":"عليه"}</div>
                      <div style={S.balRow}>
                        <span style={S.balStat}>↓ استلم {fmt(stRec,filterCurrency)}</span>
                        <span style={S.balStat}>↑ صرف {fmt(stSp,filterCurrency)}</span>
                      </div>
                    </div>
                    {(obRec||obSp)>0 && (
                      <div style={S.obBadge}>
                        ⚖️ رصيد افتتاحي: استلم {fmt(obRec,filterCurrency)} · صرف {fmt(obSp,filterCurrency)}
                      </div>
                    )}
                    {statementTxRaw.length===0 && <div style={S.empty}>ما في معاملات</div>}
                    <div style={D?S.txGridD:{}}>
                      {statementTxRaw.map(t=><TxCard key={t.id} t={t} onDelete={()=>deleteTransaction(t.id)} onViewImage={setViewImage} desktop={D}/>)}
                    </div>
                    {!D && <button style={S.cancelBtn} onClick={()=>setView("home")}>← رجوع</button>}
                  </div>
                </div>
              </div>
            )}

            {/* MANAGER ALL TX */}
            {!loading && user.role==="manager" && view==="allTx" && (
              <div>
                <div style={S.secTitle}>كل المعاملات</div>
                <div style={D?S.filterRowD:{}}>
                  <div style={S.filterCard}>
                    <div style={S.fieldLabel}>الشخص</div>
                    <select style={S.select} value={filterUser} onChange={e=>setFilterUser(e.target.value)}>
                      <option value="all">الكل</option>
                      {USERS.filter(u=>u.role==="employee").map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <div style={S.fieldLabel}>المشروع</div>
                    <select style={S.select} value={filterProject} onChange={e=>setFilterProject(e.target.value)}>
                      <option value="all">الكل</option>
                      {projects.map(p=><option key={p.id} value={p.id}>{p.name} - {p.specialization} - {p.province}</option>)}
                    </select>
                    <div style={S.fieldLabel}>من تاريخ</div>
                    <input style={S.input} type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)}/>
                    <div style={S.fieldLabel}>إلى تاريخ</div>
                    <input style={S.input} type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:"#9ca3af",marginBottom:12}}>{toAr(filteredTx.length)} معاملة</div>
                    <div style={D?S.txGridD:{}}>
                      {filteredTx.length===0?<div style={S.empty}>ما في نتائج</div>:filteredTx.map(t=><TxCard key={t.id} t={t} showUser onDelete={()=>deleteTransaction(t.id)} onViewImage={setViewImage} desktop={D}/>)}
                    </div>
                    {!D && <button style={S.cancelBtn} onClick={()=>setView("home")}>← رجوع</button>}
                  </div>
                </div>
              </div>
            )}

            {/* MANAGER PROJECTS */}
            {!loading && user.role==="manager" && view==="projects" && (
              <div style={D?{maxWidth:700}:{}}>
                <div style={S.secTitle}>إدارة المشاريع</div>
                <div style={S.formCard}>
                  <div style={S.fieldLabel}>اسم المشروع</div>
                  <input style={S.input} placeholder="مثال: برج الأمل" value={newProject.name} onChange={e=>setNewProject(p=>({...p,name:e.target.value}))}/>
                  <div style={S.fieldLabel}>التخصص</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {SPECIALIZATIONS.map(s=>(
                      <button key={s} style={{...S.specBtn,...(newProject.specialization===s?S.specBtnActive:{})}} onClick={()=>setNewProject(p=>({...p,specialization:s}))}>{s}</button>
                    ))}
                  </div>
                  <div style={S.fieldLabel}>المحافظة</div>
                  <select style={S.select} value={newProject.province} onChange={e=>setNewProject(p=>({...p,province:e.target.value}))}>
                    {PROVINCES.map(pr=><option key={pr} value={pr}>{pr}</option>)}
                  </select>
                  <button style={{...S.submitBtn,marginTop:16}} onClick={addProject}>+ إضافة المشروع</button>
                </div>
                <div style={{height:16}}/>
                {projects.length===0?<div style={S.empty}>ما في مشاريع</div>:null}
                <div style={D?S.txGridD:{}}>
                  {projects.map(p=>(
                    <div key={p.id} style={S.projCard}>
                      <div>
                        <div style={S.projName}>{p.name}</div>
                        <div style={S.projMeta}>{p.specialization} · {p.province}</div>
                      </div>
                      <button style={S.deleteBtn} onClick={()=>deleteProject(p.id)}>حذف</button>
                    </div>
                  ))}
                </div>
                {!D && <button style={S.cancelBtn} onClick={()=>setView("home")}>← رجوع</button>}
              </div>
            )}

            {/* MANAGER OPENING BALANCES */}
            {!loading && user.role==="manager" && view==="opening" && (
              <div style={D?{maxWidth:800}:{}}>
                <div style={S.secTitle}>⚖️ الأرصدة الافتتاحية</div>
                <div style={{fontSize:13,color:"#9ca3af",marginBottom:16}}>أدخل الأرصدة السابقة لكل شخص قبل بداية استخدام النظام</div>
                {openingSuccess && <div style={{...S.successBox,padding:16,marginBottom:16}}>✓ تم الحفظ!</div>}
                <div style={D?S.empGridD:{}}>
                  {USERS.filter(u=>u.role==="employee").map(u=>{
                    const ob = openingBalances[u.id]||{};
                    const of = openingForm[u.id]||{};
                    return (
                      <div key={u.id} style={S.obCard}>
                        <div style={S.obHeader}>
                          <div style={{...S.avatar,width:36,height:36,fontSize:16,margin:0}}>{u.name[0]}</div>
                          <div style={{fontWeight:700,fontSize:15}}>{u.name}</div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
                          <div>
                            <div style={{fontSize:11,color:"#9ca3af",marginBottom:4}}>🇮🇶 دينار استلم</div>
                            <input style={{...S.input,fontSize:13,padding:"8px 10px"}} type="number" placeholder={toAr(ob.dinarReceived||0)} value={of.dinarReceived??""} onChange={e=>setOpeningForm(f=>({...f,[u.id]:{...(f[u.id]||{}),dinarReceived:e.target.value}}))}/>
                          </div>
                          <div>
                            <div style={{fontSize:11,color:"#9ca3af",marginBottom:4}}>🇮🇶 دينار صرف</div>
                            <input style={{...S.input,fontSize:13,padding:"8px 10px"}} type="number" placeholder={toAr(ob.dinarSpent||0)} value={of.dinarSpent??""} onChange={e=>setOpeningForm(f=>({...f,[u.id]:{...(f[u.id]||{}),dinarSpent:e.target.value}}))}/>
                          </div>
                          <div>
                            <div style={{fontSize:11,color:"#9ca3af",marginBottom:4}}>🇺🇸 دولار استلم</div>
                            <input style={{...S.input,fontSize:13,padding:"8px 10px"}} type="number" placeholder={toAr(ob.dollarReceived||0)} value={of.dollarReceived??""} onChange={e=>setOpeningForm(f=>({...f,[u.id]:{...(f[u.id]||{}),dollarReceived:e.target.value}}))}/>
                          </div>
                          <div>
                            <div style={{fontSize:11,color:"#9ca3af",marginBottom:4}}>🇺🇸 دولار صرف</div>
                            <input style={{...S.input,fontSize:13,padding:"8px 10px"}} type="number" placeholder={toAr(ob.dollarSpent||0)} value={of.dollarSpent??""} onChange={e=>setOpeningForm(f=>({...f,[u.id]:{...(f[u.id]||{}),dollarSpent:e.target.value}}))}/>
                          </div>
                        </div>
                        {ob.dinarReceived||ob.dinarSpent||ob.dollarReceived||ob.dollarSpent ? (
                          <div style={{fontSize:11,color:"#6b7280",marginTop:8}}>
                            محفوظ: دينار {fmt(ob.dinarReceived||0,"دينار")} استلام · {fmt(ob.dinarSpent||0,"دينار")} صرف
                          </div>
                        ):null}
                      </div>
                    );
                  })}
                </div>
                <button style={{...S.submitBtn,marginTop:20,background:"linear-gradient(135deg,#7c3aed,#6d28d9)"}} onClick={saveOpeningBalances}>💾 حفظ الأرصدة الافتتاحية</button>
                {!D && <button style={S.cancelBtn} onClick={()=>setView("home")}>← رجوع</button>}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM NAV - mobile only */}
        {!D && (
          <div style={S.bottomNav}>
            {user.role==="employee" ? <>
              <NavBtn icon="🏠" label="الرئيسية" active={view==="home"} onClick={()=>setView("home")}/>
              <NavBtn icon="➕" label="تسجيل" active={view==="add"} onClick={()=>setView("add")}/>
            </> : <>
              <NavBtn icon="📊" label="الملخص" active={view==="home"} onClick={()=>setView("home")}/>
              <NavBtn icon="📋" label="المعاملات" active={view==="allTx"} onClick={()=>setView("allTx")}/>
              <NavBtn icon="🏗️" label="المشاريع" active={view==="projects"} onClick={()=>setView("projects")}/>
              <NavBtn icon="⚖️" label="افتتاحي" active={view==="opening"} onClick={()=>setView("opening")}/>
            </>}
          </div>
        )}
      </div>
    </div>
  );
}

function SideBtn({icon,label,active,onClick}){
  return <button style={{...S.sideBtn,...(active?S.sideBtnActive:{})}} onClick={onClick}><span>{icon}</span><span>{label}</span></button>;
}
function NavBtn({icon,label,active,onClick}){
  return <button style={{...S.navBtn,...(active?S.navActive:{})}} onClick={onClick}><span>{icon}</span><span>{label}</span></button>;
}

function TxCard({t,showUser,onDelete,onViewImage,desktop}){
  return (
    <div style={{...S.txCard,...(desktop?S.txCardD:{})}}>
      <div style={S.txTop}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{...S.txBadge,background:t.type==="صرف"?"#7f1d1d":"#064e3b"}}>{t.type}</div>
          <div style={{...S.txBadge,background:t.currency==="دولار"?"#1e3a5f":"#1a2e1a",fontSize:11}}>{t.currency||"دينار"}</div>
        </div>
        <div style={S.txAmount}>{t.type==="صرف"?"-":"+"}{toAr(Number(t.amount).toLocaleString("ar-IQ"))} {t.currency==="دولار"?"$":"د.ع"}</div>
      </div>
      {showUser && <div style={S.txUser}>{t.userName}</div>}
      <div style={S.txMeta}>{t.projectName}</div>
      <div style={S.txMeta2}>📅 {t.date}</div>
      {t.note && <div style={S.txNote}>{t.note}</div>}
      {t.image && <img src={t.image} style={S.txImg} alt="وصل" onClick={()=>onViewImage&&onViewImage(t.image)}/>}
      {onDelete && <button style={S.deleteTxBtn} onClick={onDelete}>🗑️ حذف</button>}
    </div>
  );
}

const S = {
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
  addBtn:{width:"100%",background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",borderRadius:14,padding:"16px",color:"#000",fontSize:16,fontWeight:700,cursor:"pointer",marginBottom:8},
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
  empGridD:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12,marginBottom:20},
  empTop:{display:"flex",alignItems:"center",gap:12},
  empName:{fontSize:15,fontWeight:600,color:"#fff"},
  empSub:{fontSize:12,color:"#6b7280",marginTop:2},
  projCard:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"12px 16px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"},
  projName:{fontSize:14,fontWeight:600,color:"#fff"},
  projMeta:{fontSize:12,color:"#6b7280",marginTop:3},
  deleteBtn:{background:"rgba(127,29,29,0.3)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,padding:"6px 14px",color:"#f87171",fontSize:13,cursor:"pointer"},
  obCard:{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:16,marginBottom:12},
  obHeader:{display:"flex",alignItems:"center",gap:10},
  obBadge:{background:"rgba(124,58,237,0.15)",border:"1px solid rgba(124,58,237,0.3)",borderRadius:10,padding:"8px 12px",fontSize:12,color:"#c4b5fd",marginBottom:12},
  bottomNav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:420,background:"rgba(10,10,15,0.97)",borderTop:"1px solid rgba(255,255,255,0.08)",display:"flex",padding:"10px 10px 20px"},
  navBtn:{flex:1,background:"transparent",border:"none",color:"#6b7280",cursor:"pointer",padding:"6px",borderRadius:12,display:"flex",flexDirection:"column",alignItems:"center",gap:3,fontSize:11},
  navActive:{color:"#f59e0b",background:"rgba(245,158,11,0.1)"},
  imgOverlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},
  imgFull:{maxWidth:"95%",maxHeight:"90vh",borderRadius:12,objectFit:"contain"},
};
