import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import {
  collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc
} from "firebase/firestore";

const USERS = [
  { id: "manager", name: "المدير المالي", role: "manager", pin: "0000" },
  { id: "noor", name: "نور", role: "employee", pin: "1111" },
  { id: "mohammed", name: "محمد", role: "employee", pin: "2222" },
  { id: "hussein", name: "حسين", role: "employee", pin: "3333" },
  { id: "ahmed", name: "أحمد", role: "employee", pin: "4444" },
  { id: "ihab", name: "إيهاب", role: "employee", pin: "5555" },
];

const toArabicNums = (n) => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
const fmt = (n, currency) => toArabicNums(Number(n || 0).toLocaleString("ar-IQ")) + (currency === "دولار" ? " $" : " د.ع");

function getUserFromURL() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("user");
  return USERS.find(u => u.id === userId) || null;
}

export default function App() {
  const urlUser = getUserFromURL();
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState("login");
  const [loginId, setLoginId] = useState(urlUser ? urlUser.id : null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [view, setView] = useState("home");
  const [transactions, setTransactions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type: "استلام", projectId: "", amount: "", currency: "دينار", note: "", date: new Date().toISOString().split("T")[0], image: null });
  const [formSuccess, setFormSuccess] = useState(false);
  const [newProject, setNewProject] = useState("");
  const [filterUser, setFilterUser] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterCurrency, setFilterCurrency] = useState("دينار");
  const [selectedUserStatement, setSelectedUserStatement] = useState(null);
  const [viewImage, setViewImage] = useState(null);
  const imgRef = useRef();

  useEffect(() => {
    const q1 = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsub1 = onSnapshot(q1, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const unsub2 = onSnapshot(collection(db, "projects"), snap => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm(f => ({ ...f, image: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleLogin = () => {
    const u = USERS.find(u => u.id === loginId);
    if (u && pin === u.pin) {
      setUser(u); setScreen("app"); setView("home"); setPinError(false);
    } else { setPinError(true); setPin(""); }
  };

  const submitTransaction = async () => {
    if (!form.projectId || !form.amount || !form.date) return;
    const proj = projects.find(p => p.id === form.projectId);
    await addDoc(collection(db, "transactions"), {
      userId: user.id, userName: user.name,
      projectId: form.projectId, projectName: proj?.name || "",
      type: form.type, amount: Number(form.amount),
      currency: form.currency,
      note: form.note, date: form.date,
      image: form.image || null,
      createdAt: new Date().toISOString(),
    });
    setFormSuccess(true);
    setTimeout(() => {
      setFormSuccess(false);
      setForm({ type: "استلام", projectId: "", amount: "", currency: "دينار", note: "", date: new Date().toISOString().split("T")[0], image: null });
      setView("home");
    }, 1500);
  };

  const addProject = async () => {
    if (!newProject.trim()) return;
    await addDoc(collection(db, "projects"), { name: newProject.trim() });
    setNewProject("");
  };

  const deleteProject = async (id) => {
    if (window.confirm("تريد تحذف هذا المشروع؟")) await deleteDoc(doc(db, "projects", id));
  };

  const deleteTransaction = async (id) => {
    if (window.confirm("تريد تحذف هذه المعاملة؟")) await deleteDoc(doc(db, "transactions", id));
  };

  const myTx = transactions.filter(t => user && t.userId === user.id);
  const myTxDinar = myTx.filter(t => t.currency === "دينار" || !t.currency);
  const myTxDollar = myTx.filter(t => t.currency === "دولار");
  const calcBalance = (txList) => {
    const rec = txList.filter(t => t.type === "استلام").reduce((s, t) => s + t.amount, 0);
    const sp = txList.filter(t => t.type === "صرف").reduce((s, t) => s + t.amount, 0);
    return { received: rec, spent: sp, balance: rec - sp };
  };
  const dinarStats = calcBalance(myTxDinar);
  const dollarStats = calcBalance(myTxDollar);

  const employeeBalances = USERS.filter(u => u.role === "employee").map(u => {
    const tx = transactions.filter(t => t.userId === u.id);
    const dinar = calcBalance(tx.filter(t => t.currency === "دينار" || !t.currency));
    const dollar = calcBalance(tx.filter(t => t.currency === "دولار"));
    return { ...u, dinar, dollar, txCount: tx.length };
  });

  const statementUser = USERS.find(u => u.id === selectedUserStatement);
  const statementTx = selectedUserStatement ? transactions.filter(t => {
    if (t.userId !== selectedUserStatement) return false;
    if (t.currency !== filterCurrency && !(filterCurrency === "دينار" && !t.currency)) return false;
    if (filterProject !== "all" && t.projectId !== filterProject) return false;
    if (filterFrom && t.date < filterFrom) return false;
    if (filterTo && t.date > filterTo) return false;
    return true;
  }) : [];
  const stStats = calcBalance(statementTx);

  const filteredTx = transactions.filter(t => {
    if (filterUser !== "all" && t.userId !== filterUser) return false;
    if (filterProject !== "all" && t.projectId !== filterProject) return false;
    if (filterFrom && t.date < filterFrom) return false;
    if (filterTo && t.date > filterTo) return false;
    return true;
  });

  const exportPDF = () => {
    const projName = filterProject !== "all" ? projects.find(p => p.id === filterProject)?.name : "كل المشاريع";
    const rows = statementTx.map(t => `
      <tr>
        <td>${t.date}</td>
        <td>${t.projectName}</td>
        <td style="color:${t.type==='استلام'?'green':'red'}">${t.type}</td>
        <td>${toArabicNums(Number(t.amount).toLocaleString("ar-IQ"))}</td>
        <td>${t.note || "-"}</td>
        ${t.image ? `<td><img src="${t.image}" style="width:60px;height:60px;object-fit:cover;border-radius:6px"/></td>` : "<td>-</td>"}
      </tr>
    `).join("");

    const html = `<!DOCTYPE html><html dir="rtl" lang="ar">
    <head><meta charset="UTF-8"/><title>كشف حساب - ${statementUser?.name}</title>
    <style>
      body{font-family:Tahoma,sans-serif;padding:30px;color:#111;direction:rtl}
      h1{color:#1d4ed8;font-size:22px;margin-bottom:4px}
      .info{font-size:13px;color:#555;margin-bottom:20px}
      .summary{display:flex;gap:16px;margin-bottom:24px}
      .box{border:1px solid #ddd;border-radius:10px;padding:14px 20px;flex:1;text-align:center}
      .box .label{font-size:12px;color:#888}
      .box .val{font-size:18px;font-weight:bold;margin-top:4px}
      .green{color:#047857}.red{color:#991b1b}.blue{color:#1d4ed8}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:#1d4ed8;color:white;padding:10px}
      td{padding:9px 10px;border-bottom:1px solid #eee;text-align:center}
      tr:nth-child(even){background:#f9f9f9}
      .footer{margin-top:30px;font-size:12px;color:#aaa;text-align:center}
    </style></head>
    <body>
      <h1>كشف حساب - ${statementUser?.name}</h1>
      <div class="info">العملة: ${filterCurrency} | المشروع: ${projName} | من: ${filterFrom||"البداية"} | إلى: ${filterTo||"الآن"}</div>
      <div class="summary">
        <div class="box"><div class="label">إجمالي الاستلام</div><div class="val green">${fmt(stStats.received, filterCurrency)}</div></div>
        <div class="box"><div class="label">إجمالي الصرف</div><div class="val red">${fmt(stStats.spent, filterCurrency)}</div></div>
        <div class="box"><div class="label">الرصيد</div><div class="val ${stStats.balance>=0?'green':'red'}">${fmt(Math.abs(stStats.balance), filterCurrency)} ${stStats.balance>=0?'متبقي':'عليه'}</div></div>
      </div>
      <table>
        <thead><tr><th>التاريخ</th><th>المشروع</th><th>النوع</th><th>المبلغ</th><th>ملاحظات</th><th>صورة</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">نظام حساب - ${new Date().toLocaleDateString("ar-IQ")}</div>
    </body></html>`;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  // ===== LOGIN =====
  if (screen === "login") return (
    <div style={S.page}>
      <div style={S.loginWrap}>
        <div style={S.logo}>
          <div style={S.logoText}>حساب</div>
          <div style={S.logoSub}>نظام المصروفيات</div>
        </div>
        {!loginId ? (
          <>
            <div style={S.label}>اختر حسابك</div>
            <div style={S.userGrid}>
              {USERS.map(u => (
                <button key={u.id} style={{ ...S.userBtn, ...(u.role==="manager"?S.managerBtn:{}) }}
                  onClick={() => { setLoginId(u.id); setPin(""); setPinError(false); }}>
                  <div style={{ ...S.avatar, background: u.role==="manager"?"linear-gradient(135deg,#1d4ed8,#2563eb)":"linear-gradient(135deg,#f59e0b,#d97706)" }}>{u.name[0]}</div>
                  <div style={S.userBtnName}>{u.name}</div>
                  <div style={S.userBtnRole}>{u.role==="manager"?"مدير مالي":"حسابات"}</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={S.selectedUser}>
              <div style={{ ...S.avatar, background: USERS.find(u=>u.id===loginId)?.role==="manager"?"linear-gradient(135deg,#1d4ed8,#2563eb)":"linear-gradient(135deg,#f59e0b,#d97706)" }}>
                {USERS.find(u=>u.id===loginId)?.name[0]}
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:700 }}>{USERS.find(u=>u.id===loginId)?.name}</div>
                <div style={{ fontSize:12, color:"#9ca3af" }}>{USERS.find(u=>u.id===loginId)?.role==="manager"?"مدير مالي":"حسابات"}</div>
              </div>
            </div>
            <div style={S.label}>أدخل الرمز السري</div>
            <div style={S.pinDots}>
              {[0,1,2,3].map(i => <div key={i} style={{ ...S.dot, background: pin.length>i?"#f59e0b":"rgba(255,255,255,0.15)" }} />)}
            </div>
            {pinError && <div style={S.pinError}>رمز خاطئ، حاول مرة ثانية</div>}
            <div style={S.numpad}>
              {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k,i) => (
                <button key={i} style={k===""?S.numEmpty:S.numBtn} onClick={() => {
                  if (!k) return;
                  if (k==="⌫") { setPin(p=>p.slice(0,-1)); setPinError(false); }
                  else if (pin.length<4) setPin(p=>p+k);
                }}>{k}</button>
              ))}
            </div>
            <button style={S.loginBtn} onClick={handleLogin}>دخول</button>
            {!urlUser && <button style={S.backBtn} onClick={() => { setLoginId(null); setPin(""); }}>← رجوع</button>}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      {viewImage && (
        <div style={S.imgOverlay} onClick={() => setViewImage(null)}>
          <img src={viewImage} style={S.imgFull} alt="وصل" />
        </div>
      )}
      <div style={S.appWrap}>
        <div style={S.header}>
          <div>
            <div style={S.headerName}>{user.name}</div>
            <div style={S.headerRole}>{user.role==="manager"?"مدير مالي":"حسابات - "+user.name}</div>
          </div>
          <button style={S.logoutBtn} onClick={() => { setUser(null); setScreen("login"); setPin(""); setView("home"); }}>خروج</button>
        </div>

        <div style={S.content}>
          {loading && <div style={S.empty}>جاري التحميل...</div>}

          {/* EMPLOYEE HOME */}
          {!loading && user.role==="employee" && view==="home" && (
            <div>
              {/* دينار */}
              <div style={{ ...S.balCard, background:"linear-gradient(135deg,#065f46,#047857)", marginBottom:10 }}>
                <div style={S.balLabel}>دينار عراقي</div>
                <div style={S.balAmount}>{fmt(Math.abs(dinarStats.balance), "دينار")}</div>
                <div style={S.balSub}>{dinarStats.balance>=0?"متبقي معك":"عليك"}</div>
                <div style={S.balRow}>
                  <span style={S.balStat}>↓ {fmt(dinarStats.received,"دينار")}</span>
                  <span style={S.balStat}>↑ {fmt(dinarStats.spent,"دينار")}</span>
                </div>
              </div>
              {/* دولار */}
              <div style={{ ...S.balCard, background:"linear-gradient(135deg,#1d4ed8,#2563eb)", marginBottom:16 }}>
                <div style={S.balLabel}>دولار أمريكي</div>
                <div style={S.balAmount}>{fmt(Math.abs(dollarStats.balance), "دولار")}</div>
                <div style={S.balSub}>{dollarStats.balance>=0?"متبقي معك":"عليك"}</div>
                <div style={S.balRow}>
                  <span style={S.balStat}>↓ {fmt(dollarStats.received,"دولار")}</span>
                  <span style={S.balStat}>↑ {fmt(dollarStats.spent,"دولار")}</span>
                </div>
              </div>
              <button style={S.addBtn} onClick={() => { setView("add"); setForm({ type:"استلام", projectId:"", amount:"", currency:"دينار", note:"", date:new Date().toISOString().split("T")[0], image:null }); }}>+ تسجيل معاملة جديدة</button>
              <div style={S.secTitle}>سجل المعاملات</div>
              {myTx.length===0 && <div style={S.empty}>ما عندك معاملات بعد</div>}
              {myTx.map(t => <TxCard key={t.id} t={t} onViewImage={setViewImage} />)}
            </div>
          )}

          {/* EMPLOYEE ADD */}
          {!loading && user.role==="employee" && view==="add" && (
            <div>
              <div style={S.secTitle}>معاملة جديدة</div>
              {formSuccess ? (
                <div style={S.successBox}><div style={S.successIcon}>✓</div><div>تم التسجيل!</div></div>
              ) : (
                <div style={S.formCard}>
                  <div style={S.fieldLabel}>نوع المعاملة</div>
                  <div style={S.typeRow}>
                    {["استلام","صرف"].map(t => (
                      <button key={t} style={{ ...S.typeBtn, ...(form.type===t?(t==="استلام"?S.typeBtnGreen:S.typeBtnRed):{}) }}
                        onClick={() => setForm(f=>({...f,type:t}))}>
                        {t==="استلام"?"↓ استلام":"↑ صرف"}
                      </button>
                    ))}
                  </div>

                  <div style={S.fieldLabel}>العملة</div>
                  <div style={S.typeRow}>
                    {["دينار","دولار"].map(c => (
                      <button key={c} style={{ ...S.typeBtn, ...(form.currency===c?S.typeBtnBlue:{}) }}
                        onClick={() => setForm(f=>({...f,currency:c}))}>
                        {c==="دينار"?"🇮🇶 دينار":"🇺🇸 دولار"}
                      </button>
                    ))}
                  </div>

                  <div style={S.fieldLabel}>المشروع</div>
                  <select style={S.select} value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))}>
                    <option value="">اختر المشروع</option>
                    {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>

                  <div style={S.fieldLabel}>المبلغ</div>
                  <input style={S.input} type="number" placeholder="٠" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} />

                  <div style={S.fieldLabel}>التاريخ</div>
                  <input style={S.input} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />

                  <div style={S.fieldLabel}>ملاحظات</div>
                  <textarea style={S.textarea} placeholder="اكتب تفاصيل..." value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={2} />

                  <div style={S.fieldLabel}>صورة الوصل (اختياري)</div>
                  <input ref={imgRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={handleImageChange} />
                  <button style={S.imgBtn} onClick={() => imgRef.current.click()}>
                    {form.image ? "✓ تم اختيار الصورة" : "📷 التقط أو اختر صورة"}
                  </button>
                  {form.image && <img src={form.image} style={S.imgPreview} alt="preview" onClick={() => setViewImage(form.image)} />}

                  <button style={S.submitBtn} onClick={submitTransaction}>حفظ</button>
                  <button style={S.cancelBtn} onClick={() => setView("home")}>إلغاء</button>
                </div>
              )}
            </div>
          )}

          {/* MANAGER HOME */}
          {!loading && user.role==="manager" && view==="home" && (
            <div>
              <div style={S.secTitle}>ملخص الحسابات</div>
              {employeeBalances.map(e => (
                <button key={e.id} style={S.empCard} onClick={() => { setSelectedUserStatement(e.id); setFilterFrom(""); setFilterTo(""); setFilterProject("all"); setFilterCurrency("دينار"); setView("statement"); }}>
                  <div style={S.empTop}>
                    <div style={{ ...S.avatar, width:40, height:40, fontSize:17, margin:0 }}>{e.name[0]}</div>
                    <div style={{ flex:1 }}>
                      <div style={S.empName}>{e.name}</div>
                      <div style={S.empSub}>{toArabicNums(e.txCount)} معاملة</div>
                    </div>
                    <div style={{ textAlign:"center", marginLeft:8 }}>
                      <div style={{ fontSize:11, color:"#34d399" }}>{fmt(Math.abs(e.dinar.balance),"دينار")}</div>
                      <div style={{ fontSize:11, color:"#60a5fa", marginTop:2 }}>{fmt(Math.abs(e.dollar.balance),"دولار")}</div>
                    </div>
                    <div style={{ color:"#6b7280", marginRight:4 }}>←</div>
                  </div>
                </button>
              ))}
              <div style={{ height:12 }} />
              <button style={{ ...S.addBtn, background:"linear-gradient(135deg,#1d4ed8,#2563eb)" }} onClick={() => setView("allTx")}>📋 كل المعاملات</button>
              <button style={{ ...S.addBtn, background:"linear-gradient(135deg,#065f46,#047857)", marginTop:10 }} onClick={() => setView("projects")}>🏗️ إدارة المشاريع</button>
            </div>
          )}

          {/* MANAGER STATEMENT */}
          {!loading && user.role==="manager" && view==="statement" && (
            <div>
              <div style={S.secTitle}>كشف حساب - {statementUser?.name}</div>
              <div style={S.filterCard}>
                <div style={S.fieldLabel}>العملة</div>
                <div style={S.typeRow}>
                  {["دينار","دولار"].map(c => (
                    <button key={c} style={{ ...S.typeBtn, ...(filterCurrency===c?S.typeBtnBlue:{}) }}
                      onClick={() => setFilterCurrency(c)}>
                      {c==="دينار"?"🇮🇶 دينار":"🇺🇸 دولار"}
                    </button>
                  ))}
                </div>
                <div style={S.fieldLabel}>المشروع</div>
                <select style={S.select} value={filterProject} onChange={e=>setFilterProject(e.target.value)}>
                  <option value="all">كل المشاريع</option>
                  {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div style={S.fieldLabel}>من تاريخ</div>
                <input style={S.input} type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)} />
                <div style={S.fieldLabel}>إلى تاريخ</div>
                <input style={S.input} type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)} />
              </div>

              <div style={{ ...S.balCard, background:stStats.balance>=0?"linear-gradient(135deg,#065f46,#047857)":"linear-gradient(135deg,#7f1d1d,#991b1b)", marginBottom:16 }}>
                <div style={S.balLabel}>الرصيد - {filterCurrency}</div>
                <div style={S.balAmount}>{fmt(Math.abs(stStats.balance), filterCurrency)}</div>
                <div style={S.balSub}>{stStats.balance>=0?"متبقي معه":"عليه"}</div>
                <div style={S.balRow}>
                  <span style={S.balStat}>↓ استلم {fmt(stStats.received, filterCurrency)}</span>
                  <span style={S.balStat}>↑ صرف {fmt(stStats.spent, filterCurrency)}</span>
                </div>
              </div>

              <button style={{ ...S.addBtn, background:"linear-gradient(135deg,#1d4ed8,#2563eb)", marginBottom:16 }} onClick={exportPDF}>
                📄 تصدير PDF
              </button>

              {statementTx.length===0 && <div style={S.empty}>ما في معاملات</div>}
              {statementTx.map(t => <TxCard key={t.id} t={t} onDelete={() => deleteTransaction(t.id)} onViewImage={setViewImage} />)}
              <button style={S.cancelBtn} onClick={() => setView("home")}>← رجوع</button>
            </div>
          )}

          {/* MANAGER ALL TX */}
          {!loading && user.role==="manager" && view==="allTx" && (
            <div>
              <div style={S.secTitle}>كل المعاملات</div>
              <div style={S.filterCard}>
                <div style={S.fieldLabel}>الشخص</div>
                <select style={S.select} value={filterUser} onChange={e=>setFilterUser(e.target.value)}>
                  <option value="all">الكل</option>
                  {USERS.filter(u=>u.role==="employee").map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <div style={S.fieldLabel}>المشروع</div>
                <select style={S.select} value={filterProject} onChange={e=>setFilterProject(e.target.value)}>
                  <option value="all">الكل</option>
                  {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div style={S.fieldLabel}>من تاريخ</div>
                <input style={S.input} type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)} />
                <div style={S.fieldLabel}>إلى تاريخ</div>
                <input style={S.input} type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)} />
              </div>
              <div style={{ fontSize:13, color:"#9ca3af", marginBottom:12 }}>{toArabicNums(filteredTx.length)} معاملة</div>
              {filteredTx.length===0 && <div style={S.empty}>ما في نتائج</div>}
              {filteredTx.map(t => <TxCard key={t.id} t={t} showUser onDelete={() => deleteTransaction(t.id)} onViewImage={setViewImage} />)}
              <button style={S.cancelBtn} onClick={() => setView("home")}>← رجوع</button>
            </div>
          )}

          {/* MANAGER PROJECTS */}
          {!loading && user.role==="manager" && view==="projects" && (
            <div>
              <div style={S.secTitle}>إدارة المشاريع</div>
              <div style={S.formCard}>
                <div style={S.fieldLabel}>إضافة مشروع جديد</div>
                <input style={S.input} placeholder="اسم المشروع" value={newProject} onChange={e=>setNewProject(e.target.value)} />
                <button style={{ ...S.submitBtn, marginTop:12 }} onClick={addProject}>+ إضافة</button>
              </div>
              <div style={{ height:16 }} />
              {projects.length===0 && <div style={S.empty}>ما في مشاريع بعد</div>}
              {projects.map(p => (
                <div key={p.id} style={S.projCard}>
                  <div style={S.projName}>🏗️ {p.name}</div>
                  <button style={S.deleteBtn} onClick={() => deleteProject(p.id)}>حذف</button>
                </div>
              ))}
              <button style={S.cancelBtn} onClick={() => setView("home")}>← رجوع</button>
            </div>
          )}
        </div>

        <div style={S.bottomNav}>
          {user.role==="employee" ? <>
            <button style={{ ...S.navBtn, ...(view==="home"?S.navActive:{}) }} onClick={() => setView("home")}><span>🏠</span><span>الرئيسية</span></button>
            <button style={{ ...S.navBtn, ...(view==="add"?S.navActive:{}) }} onClick={() => setView("add")}><span>➕</span><span>تسجيل</span></button>
          </> : <>
            <button style={{ ...S.navBtn, ...(view==="home"?S.navActive:{}) }} onClick={() => setView("home")}><span>📊</span><span>الملخص</span></button>
            <button style={{ ...S.navBtn, ...(view==="allTx"?S.navActive:{}) }} onClick={() => setView("allTx")}><span>📋</span><span>المعاملات</span></button>
            <button style={{ ...S.navBtn, ...(view==="projects"?S.navActive:{}) }} onClick={() => setView("projects")}><span>🏗️</span><span>المشاريع</span></button>
          </>}
        </div>
      </div>
    </div>
  );
}

function TxCard({ t, showUser, onDelete, onViewImage }) {
  return (
    <div style={S.txCard}>
      <div style={S.txTop}>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ ...S.txBadge, background:t.type==="صرف"?"#7f1d1d":"#064e3b" }}>{t.type}</div>
          <div style={{ ...S.txBadge, background:t.currency==="دولار"?"#1e3a5f":"#1a2e1a", fontSize:11 }}>{t.currency||"دينار"}</div>
        </div>
        <div style={S.txAmount}>{t.type==="صرف"?"-":"+"}{toArabicNums(Number(t.amount).toLocaleString("ar-IQ"))} {t.currency==="دولار"?"$":"د.ع"}</div>
      </div>
      {showUser && <div style={S.txUser}>{t.userName}</div>}
      <div style={S.txMeta}>{t.projectName}</div>
      <div style={S.txMeta2}>📅 {t.date}</div>
      {t.note && <div style={S.txNote}>{t.note}</div>}
      {t.image && <img src={t.image} style={S.txImg} alt="وصل" onClick={() => onViewImage && onViewImage(t.image)} />}
      {onDelete && <button style={S.deleteTxBtn} onClick={onDelete}>🗑️ حذف</button>}
    </div>
  );
}

const S = {
  page:{ minHeight:"100vh", background:"#0a0a0f", display:"flex", justifyContent:"center", fontFamily:"Tahoma,'Segoe UI',sans-serif", direction:"rtl" },
  loginWrap:{ width:"100%", maxWidth:420, padding:"40px 24px 60px", color:"#fff" },
  logo:{ textAlign:"center", marginBottom:40 },
  logoText:{ fontSize:40, fontWeight:900, color:"#f59e0b", letterSpacing:-1 },
  logoSub:{ fontSize:14, color:"#6b7280", marginTop:4 },
  label:{ fontSize:14, color:"#9ca3af", marginBottom:12, textAlign:"center" },
  userGrid:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
  userBtn:{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:16, padding:"16px 12px", color:"#fff", cursor:"pointer", textAlign:"center" },
  managerBtn:{ border:"1px solid rgba(59,130,246,0.4)", background:"rgba(59,130,246,0.08)", gridColumn:"1/-1" },
  avatar:{ width:46, height:46, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:700, margin:"0 auto 8px" },
  userBtnName:{ fontSize:14, fontWeight:600 },
  userBtnRole:{ fontSize:12, color:"#9ca3af", marginTop:2 },
  selectedUser:{ display:"flex", alignItems:"center", gap:12, background:"rgba(245,158,11,0.1)", borderRadius:12, padding:"16px", marginBottom:24, color:"#fff" },
  pinDots:{ display:"flex", justifyContent:"center", gap:16, marginBottom:8 },
  dot:{ width:18, height:18, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.3)" },
  pinError:{ textAlign:"center", color:"#f87171", fontSize:13, marginBottom:8 },
  numpad:{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, margin:"16px 0" },
  numBtn:{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:"18px", color:"#fff", fontSize:22, fontWeight:600, cursor:"pointer" },
  numEmpty:{ background:"transparent", border:"none" },
  loginBtn:{ width:"100%", background:"linear-gradient(135deg,#f59e0b,#d97706)", border:"none", borderRadius:14, padding:"16px", color:"#000", fontSize:17, fontWeight:700, cursor:"pointer", marginBottom:10 },
  backBtn:{ width:"100%", background:"transparent", border:"1px solid rgba(255,255,255,0.15)", borderRadius:14, padding:"14px", color:"#9ca3af", fontSize:15, cursor:"pointer" },
  appWrap:{ width:"100%", maxWidth:420, display:"flex", flexDirection:"column", minHeight:"100vh", color:"#fff" },
  header:{ background:"rgba(255,255,255,0.04)", borderBottom:"1px solid rgba(255,255,255,0.08)", padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" },
  headerName:{ fontSize:17, fontWeight:700 },
  headerRole:{ fontSize:12, color:"#f59e0b", marginTop:2 },
  logoutBtn:{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"8px 14px", color:"#9ca3af", fontSize:13, cursor:"pointer" },
  content:{ flex:1, padding:"20px 16px 100px", overflowY:"auto" },
  balCard:{ borderRadius:20, padding:"20px", marginBottom:16 },
  balLabel:{ fontSize:13, color:"rgba(255,255,255,0.7)", marginBottom:8 },
  balAmount:{ fontSize:28, fontWeight:900 },
  balSub:{ fontSize:13, color:"rgba(255,255,255,0.6)", marginBottom:12 },
  balRow:{ display:"flex", gap:16 },
  balStat:{ fontSize:12, color:"rgba(255,255,255,0.7)" },
  addBtn:{ width:"100%", background:"linear-gradient(135deg,#f59e0b,#d97706)", border:"none", borderRadius:14, padding:"16px", color:"#000", fontSize:16, fontWeight:700, cursor:"pointer", marginBottom:8 },
  secTitle:{ fontSize:15, fontWeight:700, color:"#d1d5db", marginBottom:12 },
  txCard:{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:"14px 16px", marginBottom:10 },
  txTop:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 },
  txBadge:{ borderRadius:8, padding:"3px 10px", fontSize:12, fontWeight:600 },
  txAmount:{ fontSize:16, fontWeight:700 },
  txUser:{ fontSize:12, color:"#f59e0b", marginBottom:2 },
  txMeta:{ fontSize:13, color:"#9ca3af" },
  txMeta2:{ fontSize:12, color:"#6b7280", marginTop:2 },
  txNote:{ fontSize:13, color:"#d1d5db", marginTop:6, background:"rgba(255,255,255,0.04)", borderRadius:8, padding:"6px 10px" },
  txImg:{ width:"100%", maxHeight:160, objectFit:"cover", borderRadius:10, marginTop:8, cursor:"pointer" },
  deleteTxBtn:{ marginTop:8, background:"rgba(127,29,29,0.3)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:8, padding:"6px 12px", color:"#f87171", fontSize:12, cursor:"pointer" },
  empty:{ textAlign:"center", color:"#6b7280", padding:40 },
  formCard:{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:18, padding:20 },
  filterCard:{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:16, marginBottom:16 },
  fieldLabel:{ fontSize:13, color:"#9ca3af", marginBottom:8, marginTop:12 },
  typeRow:{ display:"flex", gap:10 },
  typeBtn:{ flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"12px", color:"#9ca3af", fontSize:14, fontWeight:600, cursor:"pointer" },
  typeBtnGreen:{ background:"rgba(6,95,70,0.3)", border:"1px solid #047857", color:"#34d399" },
  typeBtnRed:{ background:"rgba(127,29,29,0.3)", border:"1px solid #991b1b", color:"#f87171" },
  typeBtnBlue:{ background:"rgba(29,78,216,0.3)", border:"1px solid #2563eb", color:"#60a5fa" },
  select:{ width:"100%", background:"#1a1a2e", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, padding:"12px 14px", color:"#fff", fontSize:15, outline:"none", boxSizing:"border-box" },
  input:{ width:"100%", background:"#1a1a2e", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, padding:"12px 14px", color:"#fff", fontSize:15, outline:"none", boxSizing:"border-box" },
  textarea:{ width:"100%", background:"#1a1a2e", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, padding:"12px 14px", color:"#fff", fontSize:14, outline:"none", resize:"none", boxSizing:"border-box" },
  imgBtn:{ width:"100%", background:"rgba(255,255,255,0.06)", border:"2px dashed rgba(255,255,255,0.2)", borderRadius:12, padding:"14px", color:"#9ca3af", fontSize:14, cursor:"pointer", marginTop:4 },
  imgPreview:{ width:"100%", maxHeight:180, objectFit:"cover", borderRadius:10, marginTop:10, cursor:"pointer" },
  submitBtn:{ width:"100%", background:"linear-gradient(135deg,#f59e0b,#d97706)", border:"none", borderRadius:14, padding:"16px", color:"#000", fontSize:16, fontWeight:700, cursor:"pointer", marginTop:16 },
  cancelBtn:{ width:"100%", background:"transparent", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:"14px", color:"#9ca3af", fontSize:15, cursor:"pointer", marginTop:10 },
  successBox:{ textAlign:"center", padding:60, color:"#34d399", fontSize:18, fontWeight:700 },
  successIcon:{ fontSize:56, marginBottom:12 },
  empCard:{ width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:"14px 16px", marginBottom:10, cursor:"pointer", textAlign:"right" },
  empTop:{ display:"flex", alignItems:"center", gap:12 },
  empName:{ fontSize:15, fontWeight:600, color:"#fff" },
  empSub:{ fontSize:12, color:"#6b7280", marginTop:2 },
  projCard:{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"12px 16px", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" },
  projName:{ fontSize:14, fontWeight:600, color:"#fff" },
  deleteBtn:{ background:"rgba(127,29,29,0.3)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:8, padding:"6px 14px", color:"#f87171", fontSize:13, cursor:"pointer" },
  bottomNav:{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:420, background:"rgba(10,10,15,0.97)", borderTop:"1px solid rgba(255,255,255,0.08)", display:"flex", padding:"10px 20px 20px" },
  navBtn:{ flex:1, background:"transparent", border:"none", color:"#6b7280", cursor:"pointer", padding:"8px", borderRadius:12, display:"flex", flexDirection:"column", alignItems:"center", gap:4, fontSize:12 },
  navActive:{ color:"#f59e0b", background:"rgba(245,158,11,0.1)" },
  imgOverlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" },
  imgFull:{ maxWidth:"95%", maxHeight:"90vh", borderRadius:12, objectFit:"contain" },
};
