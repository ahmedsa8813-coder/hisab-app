import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from "firebase/firestore";

const COMPANY = "باب المشاريع";

const USERS = [
  { id: "manager", name: "المدير المالي", role: "manager", pin: "0000" },
  { id: "noor", name: "نور", role: "employee", pin: "1111" },
  { id: "mohammed", name: "محمد", role: "employee", pin: "2222" },
  { id: "hussein", name: "حسين", role: "employee", pin: "3333" },
  { id: "ahmed", name: "أحمد", role: "employee", pin: "4444" },
  { id: "ihab", name: "إيهاب", role: "employee", pin: "5555" },
];

const fmt = (n) => Number(n || 0).toLocaleString("ar-IQ") + " د.ع";

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
  const [form, setForm] = useState({ type: "استلام", projectId: "", amount: "", note: "", date: new Date().toISOString().split("T")[0] });
  const [formSuccess, setFormSuccess] = useState(false);
  const [newProject, setNewProject] = useState("");
  const [filterUser, setFilterUser] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [selectedUserStatement, setSelectedUserStatement] = useState(null);

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
      note: form.note, date: form.date,
      createdAt: new Date().toISOString(),
    });
    setFormSuccess(true);
    setTimeout(() => {
      setFormSuccess(false);
      setForm({ type: "استلام", projectId: "", amount: "", note: "", date: new Date().toISOString().split("T")[0] });
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
  const myReceived = myTx.filter(t => t.type === "استلام").reduce((s, t) => s + t.amount, 0);
  const mySpent = myTx.filter(t => t.type === "صرف").reduce((s, t) => s + t.amount, 0);
  const myBalance = myReceived - mySpent;

  const filteredTx = transactions.filter(t => {
    if (filterUser !== "all" && t.userId !== filterUser) return false;
    if (filterProject !== "all" && t.projectId !== filterProject) return false;
    if (filterFrom && t.date < filterFrom) return false;
    if (filterTo && t.date > filterTo) return false;
    return true;
  });

  const employeeBalances = USERS.filter(u => u.role === "employee").map(u => {
    const tx = transactions.filter(t => t.userId === u.id);
    const rec = tx.filter(t => t.type === "استلام").reduce((s, t) => s + t.amount, 0);
    const sp = tx.filter(t => t.type === "صرف").reduce((s, t) => s + t.amount, 0);
    return { ...u, received: rec, spent: sp, balance: rec - sp, txCount: tx.length };
  });

  const statementUser = USERS.find(u => u.id === selectedUserStatement);
  const statementTx = selectedUserStatement ? transactions.filter(t => {
    if (t.userId !== selectedUserStatement) return false;
    if (filterProject !== "all" && t.projectId !== filterProject) return false;
    if (filterFrom && t.date < filterFrom) return false;
    if (filterTo && t.date > filterTo) return false;
    return true;
  }) : [];
  const statementReceived = statementTx.filter(t => t.type === "استلام").reduce((s, t) => s + t.amount, 0);
  const statementSpent = statementTx.filter(t => t.type === "صرف").reduce((s, t) => s + t.amount, 0);
  const statementBalance = statementReceived - statementSpent;

  const exportPDF = () => {
    const projName = filterProject !== "all" ? projects.find(p => p.id === filterProject)?.name : "كل المشاريع";
    const fromDate = filterFrom || "—";
    const toDate = filterTo || "—";
    let runningBalance = 0;
    const rows = [...statementTx].sort((a,b) => a.date.localeCompare(b.date)).map((t, i) => {
      if (t.type === "استلام") runningBalance += t.amount;
      else runningBalance -= t.amount;
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${t.date}</td>
          <td>${t.projectName}</td>
          <td style="color:#166534;font-weight:600">${t.type === "استلام" ? Number(t.amount).toLocaleString("ar-IQ") : "—"}</td>
          <td style="color:#991b1b;font-weight:600">${t.type === "صرف" ? Number(t.amount).toLocaleString("ar-IQ") : "—"}</td>
          <td style="font-weight:700;color:${runningBalance >= 0 ? "#1d4ed8" : "#991b1b"}">${Number(Math.abs(runningBalance)).toLocaleString("ar-IQ")} ${runningBalance >= 0 ? "↑" : "↓"}</td>
          <td style="color:#555">${t.note || "—"}</td>
        </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<title>كشف حساب - ${statementUser?.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', Tahoma, sans-serif; background: #f8fafc; color: #1e293b; direction: rtl; }
  .page { max-width: 900px; margin: 0 auto; padding: 40px 30px; }
  .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 24px; border-bottom: 3px solid #c8a876; margin-bottom: 28px; }
  .company { display: flex; align-items: center; gap: 14px; }
  .logo-box { width: 56px; height: 56px; background: linear-gradient(135deg, #b8860b, #c8a876); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 26px; }
  .company-name { font-size: 24px; font-weight: 900; color: #1e293b; }
  .company-sub { font-size: 13px; color: #64748b; margin-top: 2px; }
  .doc-info { text-align: left; }
  .doc-title { font-size: 20px; font-weight: 900; color: #b8860b; }
  .doc-meta { font-size: 12px; color: #64748b; margin-top: 6px; line-height: 1.8; }
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
  .sum-box { border-radius: 14px; padding: 18px 20px; text-align: center; }
  .sum-box.green { background: #f0fdf4; border: 2px solid #86efac; }
  .sum-box.red { background: #fef2f2; border: 2px solid #fca5a5; }
  .sum-box.blue { background: #eff6ff; border: 2px solid #93c5fd; }
  .sum-label { font-size: 12px; color: #64748b; margin-bottom: 6px; }
  .sum-val { font-size: 18px; font-weight: 900; }
  .sum-val.green { color: #166534; }
  .sum-val.red { color: #991b1b; }
  .sum-val.blue { color: #1d4ed8; }
  .filter-info { background: #f1f5f9; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #475569; display: flex; gap: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead tr { background: linear-gradient(135deg, #1e293b, #334155); color: white; }
  th { padding: 12px 10px; font-weight: 700; font-size: 13px; }
  td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  tr:hover td { background: #f1f5f9; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; }
  @media print {
    body { background: white; }
    .page { padding: 20px; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="company">
      <div class="logo-box">🏗️</div>
      <div>
        <div class="company-name">${COMPANY}</div>
        <div class="company-sub">نظام إدارة المصروفيات</div>
      </div>
    </div>
    <div class="doc-info">
      <div class="doc-title">كشف حساب</div>
      <div class="doc-meta">
        الموظف: <strong>${statementUser?.name}</strong><br/>
        المشروع: <strong>${projName}</strong><br/>
        الفترة: <strong>${fromDate}</strong> — <strong>${toDate}</strong>
      </div>
    </div>
  </div>

  <div class="summary">
    <div class="sum-box green">
      <div class="sum-label">إجمالي الاستلام</div>
      <div class="sum-val green">${fmt(statementReceived)}</div>
    </div>
    <div class="sum-box red">
      <div class="sum-label">إجمالي الصرف</div>
      <div class="sum-val red">${fmt(statementSpent)}</div>
    </div>
    <div class="sum-box blue">
      <div class="sum-label">${statementBalance >= 0 ? "الرصيد المتبقي" : "المبلغ المستحق"}</div>
      <div class="sum-val blue">${fmt(Math.abs(statementBalance))}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>التاريخ</th>
        <th>المشروع</th>
        <th>استلام</th>
        <th>صرف</th>
        <th>الرصيد</th>
        <th>ملاحظات</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    <span>تاريخ الإصدار: ${new Date().toLocaleDateString("ar-IQ")}</span>
    <span>${COMPANY} — نظام إدارة المصروفيات</span>
  </div>
</div>
</body>
</html>`;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 800);
  };

  // ===== LOGIN =====
  if (screen === "login") return (
    <div style={S.page}>
      <div style={S.loginWrap}>
        <div style={S.logo}>
          <div style={S.logoBox}>🏗️</div>
          <div style={S.logoText}>{COMPANY}</div>
          <div style={S.logoSub}>نظام إدارة المصروفيات</div>
        </div>
        {!loginId ? (
          <>
            <div style={S.label}>اختر حسابك</div>
            <div style={S.userGrid}>
              {USERS.map(u => (
                <button key={u.id} style={{ ...S.userBtn, ...(u.role === "manager" ? S.managerBtn : {}) }}
                  onClick={() => { setLoginId(u.id); setPin(""); setPinError(false); }}>
                  <div style={{ ...S.avatar, background: u.role === "manager" ? "linear-gradient(135deg,#92400e,#b8860b)" : "linear-gradient(135deg,#1e3a5f,#2563eb)" }}>{u.name[0]}</div>
                  <div style={S.userBtnName}>{u.name}</div>
                  <div style={S.userBtnRole}>{u.role === "manager" ? "مدير مالي" : "موظف"}</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={S.selectedUser}>
              <div style={{ ...S.avatar, width:52, height:52, fontSize:22, margin:0, background: USERS.find(u=>u.id===loginId)?.role==="manager"?"linear-gradient(135deg,#92400e,#b8860b)":"linear-gradient(135deg,#1e3a5f,#2563eb)" }}>
                {USERS.find(u => u.id === loginId)?.name[0]}
              </div>
              <div>
                <div style={{ fontSize:18, fontWeight:800 }}>{USERS.find(u => u.id === loginId)?.name}</div>
                <div style={{ fontSize:12, color:"#c8a876", marginTop:2 }}>{USERS.find(u=>u.id===loginId)?.role==="manager"?"مدير مالي":"موظف"}</div>
              </div>
            </div>
            <div style={S.label}>أدخل الرمز السري</div>
            <div style={S.pinDots}>
              {[0,1,2,3].map(i => <div key={i} style={{ ...S.dot, background: pin.length > i ? "#c8a876" : "rgba(255,255,255,0.15)" }} />)}
            </div>
            {pinError && <div style={S.pinError}>رمز خاطئ، حاول مرة ثانية</div>}
            <div style={S.numpad}>
              {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => (
                <button key={i} style={k === "" ? S.numEmpty : S.numBtn} onClick={() => {
                  if (!k) return;
                  if (k === "⌫") { setPin(p => p.slice(0,-1)); setPinError(false); }
                  else if (pin.length < 4) setPin(p => p + k);
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

  // ===== APP =====
  return (
    <div style={S.page}>
      <div style={S.appWrap}>
        <div style={S.header}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={S.headerLogoBox}>🏗️</div>
            <div>
              <div style={S.headerCompany}>{COMPANY}</div>
              <div style={S.headerRole}>{user.role === "manager" ? "مدير مالي" : user.name}</div>
            </div>
          </div>
          <button style={S.logoutBtn} onClick={() => { setUser(null); setScreen("login"); setPin(""); setView("home"); }}>خروج</button>
        </div>

        <div style={S.content}>
          {loading && <div style={S.empty}>⏳ جاري التحميل...</div>}

          {/* EMPLOYEE HOME */}
          {!loading && user.role === "employee" && view === "home" && (
            <div>
              <div style={S.balCard}>
                <div style={S.balTop}>
                  <div>
                    <div style={S.balLabel}>رصيدك الحالي</div>
                    <div style={{ ...S.balAmount, color: myBalance >= 0 ? "#86efac" : "#fca5a5" }}>{fmt(Math.abs(myBalance))}</div>
                    <div style={S.balSub}>{myBalance >= 0 ? "✅ متبقي معك" : "⚠️ عليك"}</div>
                  </div>
                  <div style={S.balAvatar}>{user.name[0]}</div>
                </div>
                <div style={S.balDivider} />
                <div style={S.balRow}>
                  <div style={S.balStat}>
                    <div style={S.balStatIcon}>↓</div>
                    <div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>استلمت</div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#86efac" }}>{fmt(myReceived)}</div>
                    </div>
                  </div>
                  <div style={S.balStat}>
                    <div style={{ ...S.balStatIcon, background:"rgba(252,165,165,0.15)", color:"#fca5a5" }}>↑</div>
                    <div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>صرفت</div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#fca5a5" }}>{fmt(mySpent)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <button style={S.addBtn} onClick={() => { setView("add"); setForm({ type:"استلام", projectId:"", amount:"", note:"", date:new Date().toISOString().split("T")[0] }); }}>
                + تسجيل معاملة جديدة
              </button>

              <div style={S.secTitle}>سجل المعاملات</div>
              {myTx.length === 0 && <div style={S.empty}>لا توجد معاملات بعد</div>}
              {myTx.map(t => <TxCard key={t.id} t={t} />)}
            </div>
          )}

          {/* EMPLOYEE ADD */}
          {!loading && user.role === "employee" && view === "add" && (
            <div>
              <div style={S.secTitle}>معاملة جديدة</div>
              {formSuccess ? (
                <div style={S.successBox}><div style={S.successIcon}>✓</div><div>تم التسجيل بنجاح!</div></div>
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
                  <div style={S.fieldLabel}>المشروع</div>
                  <select style={S.select} value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))}>
                    <option value="">اختر المشروع</option>
                    {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <div style={S.fieldLabel}>المبلغ (دينار عراقي)</div>
                  <input style={S.input} type="number" placeholder="0" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} />
                  <div style={S.fieldLabel}>التاريخ</div>
                  <input style={S.input} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
                  <div style={S.fieldLabel}>ملاحظات</div>
                  <textarea style={S.textarea} placeholder="اكتب تفاصيل..." value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={3} />
                  <button style={S.submitBtn} onClick={submitTransaction}>💾 حفظ المعاملة</button>
                  <button style={S.cancelBtn} onClick={() => setView("home")}>إلغاء</button>
                </div>
              )}
            </div>
          )}

          {/* MANAGER HOME */}
          {!loading && user.role === "manager" && view === "home" && (
            <div>
              <div style={S.mgGrid}>
                <button style={S.mgCard} onClick={() => setView("statements")}>
                  <div style={S.mgIcon}>📊</div>
                  <div style={S.mgLabel}>كشوفات الحسابات</div>
                  <div style={S.mgSub}>عرض وتصدير PDF</div>
                </button>
                <button style={S.mgCard} onClick={() => { setFilterUser("all"); setFilterProject("all"); setFilterFrom(""); setFilterTo(""); setView("allTx"); }}>
                  <div style={S.mgIcon}>📋</div>
                  <div style={S.mgLabel}>كل المعاملات</div>
                  <div style={S.mgSub}>عرض وفلترة</div>
                </button>
                <button style={S.mgCard} onClick={() => setView("projects")}>
                  <div style={S.mgIcon}>🏗️</div>
                  <div style={S.mgLabel}>إدارة المشاريع</div>
                  <div style={S.mgSub}>إضافة وحذف</div>
                </button>
              </div>

              <div style={S.secTitle}>ملخص سريع</div>
              {employeeBalances.map(e => (
                <div key={e.id} style={S.empRow}>
                  <div style={{ ...S.empAv, background:"linear-gradient(135deg,#1e3a5f,#2563eb)" }}>{e.name[0]}</div>
                  <div style={{ flex:1 }}>
                    <div style={S.empName}>{e.name}</div>
                    <div style={S.empSub}>{e.txCount} معاملة</div>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:10, color:"#64748b" }}>{e.balance>=0?"متبقي":"عليه"}</div>
                    <div style={{ fontSize:13, fontWeight:800, color:e.balance>=0?"#22c55e":"#ef4444" }}>{fmt(Math.abs(e.balance))}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MANAGER STATEMENTS LIST */}
          {!loading && user.role === "manager" && view === "statements" && (
            <div>
              <div style={S.secTitle}>كشوفات الحسابات</div>
              <div style={S.stmtGrid}>
                {USERS.filter(u => u.role === "employee").map(u => {
                  const tx = transactions.filter(t => t.userId === u.id);
                  const rec = tx.filter(t => t.type === "استلام").reduce((s,t) => s+t.amount, 0);
                  const sp = tx.filter(t => t.type === "صرف").reduce((s,t) => s+t.amount, 0);
                  const bal = rec - sp;
                  return (
                    <button key={u.id} style={S.stmtCard} onClick={() => { setSelectedUserStatement(u.id); setFilterFrom(""); setFilterTo(""); setFilterProject("all"); setView("statement"); }}>
                      <div style={{ ...S.stmtAv, background:"linear-gradient(135deg,#1e3a5f,#2563eb)" }}>{u.name[0]}</div>
                      <div style={S.stmtName}>{u.name}</div>
                      <div style={{ fontSize:11, color:"#94a3b8", marginBottom:8 }}>{tx.length} معاملة</div>
                      <div style={S.stmtBalBox}>
                        <div style={{ fontSize:10, color:"#94a3b8" }}>{bal>=0?"متبقي":"عليه"}</div>
                        <div style={{ fontSize:15, fontWeight:900, color:bal>=0?"#22c55e":"#ef4444" }}>{fmt(Math.abs(bal))}</div>
                      </div>
                      <div style={S.stmtBtn}>عرض الكشف →</div>
                    </button>
                  );
                })}
              </div>
              <button style={S.cancelBtn} onClick={() => setView("home")}>← رجوع</button>
            </div>
          )}

          {/* MANAGER STATEMENT DETAIL */}
          {!loading && user.role === "manager" && view === "statement" && (
            <div>
              <div style={S.secTitle}>كشف حساب — {statementUser?.name}</div>
              <div style={S.filterCard}>
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

              <div style={S.summaryRow}>
                <div style={{ ...S.sumBox, border:"1px solid rgba(34,197,94,0.3)", background:"rgba(34,197,94,0.08)" }}>
                  <div style={S.sumLabel}>استلم</div>
                  <div style={{ ...S.sumVal, color:"#22c55e" }}>{fmt(statementReceived)}</div>
                </div>
                <div style={{ ...S.sumBox, border:"1px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.08)" }}>
                  <div style={S.sumLabel}>صرف</div>
                  <div style={{ ...S.sumVal, color:"#ef4444" }}>{fmt(statementSpent)}</div>
                </div>
                <div style={{ ...S.sumBox, border:"1px solid rgba(200,168,118,0.3)", background:"rgba(200,168,118,0.08)" }}>
                  <div style={S.sumLabel}>{statementBalance>=0?"متبقي":"عليه"}</div>
                  <div style={{ ...S.sumVal, color:"#c8a876" }}>{fmt(Math.abs(statementBalance))}</div>
                </div>
              </div>

              <button style={{ ...S.addBtn, background:"linear-gradient(135deg,#1e3a5f,#2563eb)", marginBottom:16 }} onClick={exportPDF}>
                📄 تصدير كشف PDF
              </button>

              {statementTx.length === 0 && <div style={S.empty}>لا توجد معاملات</div>}
              {statementTx.map(t => <TxCard key={t.id} t={t} onDelete={() => deleteTransaction(t.id)} />)}
              <button style={S.cancelBtn} onClick={() => setView("statements")}>← رجوع</button>
            </div>
          )}

          {/* MANAGER ALL TX */}
          {!loading && user.role === "manager" && view === "allTx" && (
            <div>
              <div style={S.secTitle}>كل المعاملات</div>
              <div style={S.filterCard}>
                <div style={S.fieldLabel}>الموظف</div>
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
              <div style={{ fontSize:13, color:"#64748b", marginBottom:12 }}>{filteredTx.length} معاملة</div>
              {filteredTx.length === 0 && <div style={S.empty}>لا توجد نتائج</div>}
              {filteredTx.map(t => <TxCard key={t.id} t={t} showUser onDelete={() => deleteTransaction(t.id)} />)}
              <button style={S.cancelBtn} onClick={() => setView("home")}>← رجوع</button>
            </div>
          )}

          {/* MANAGER PROJECTS */}
          {!loading && user.role === "manager" && view === "projects" && (
            <div>
              <div style={S.secTitle}>إدارة المشاريع</div>
              <div style={S.formCard}>
                <div style={S.fieldLabel}>إضافة مشروع جديد</div>
                <input style={S.input} placeholder="اسم المشروع" value={newProject} onChange={e=>setNewProject(e.target.value)} />
                <button style={{ ...S.submitBtn, marginTop:12 }} onClick={addProject}>+ إضافة</button>
              </div>
              <div style={{ height:16 }} />
              {projects.length === 0 && <div style={S.empty}>لا توجد مشاريع بعد</div>}
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

        {/* BOTTOM NAV */}
        <div style={S.bottomNav}>
          {user.role === "employee" ? <>
            <button style={{ ...S.navBtn, ...(view==="home"?S.navActive:{}) }} onClick={() => setView("home")}><span style={S.navIcon}>🏠</span><span>الرئيسية</span></button>
            <button style={{ ...S.navBtn, ...(view==="add"?S.navActive:{}) }} onClick={() => setView("add")}><span style={S.navIcon}>➕</span><span>تسجيل</span></button>
          </> : <>
            <button style={{ ...S.navBtn, ...(view==="home"?S.navActive:{}) }} onClick={() => setView("home")}><span style={S.navIcon}>🏠</span><span>الرئيسية</span></button>
            <button style={{ ...S.navBtn, ...(view==="statements"||view==="statement"?S.navActive:{}) }} onClick={() => setView("statements")}><span style={S.navIcon}>📊</span><span>الكشوفات</span></button>
            <button style={{ ...S.navBtn, ...(view==="allTx"?S.navActive:{}) }} onClick={() => setView("allTx")}><span style={S.navIcon}>📋</span><span>المعاملات</span></button>
            <button style={{ ...S.navBtn, ...(view==="projects"?S.navActive:{}) }} onClick={() => setView("projects")}><span style={S.navIcon}>🏗️</span><span>المشاريع</span></button>
          </>}
        </div>
      </div>
    </div>
  );
}

function TxCard({ t, showUser, onDelete }) {
  return (
    <div style={S.txCard}>
      <div style={S.txTop}>
        <div style={{ ...S.txBadge, background:t.type==="صرف"?"rgba(239,68,68,0.15)":"rgba(34,197,94,0.15)", color:t.type==="صرف"?"#fca5a5":"#86efac", border:`1px solid ${t.type==="صرف"?"rgba(239,68,68,0.3)":"rgba(34,197,94,0.3)"}` }}>{t.type==="صرف"?"↑ صرف":"↓ استلام"}</div>
        <div style={{ ...S.txAmount, color:t.type==="صرف"?"#fca5a5":"#86efac" }}>{t.type==="صرف"?"-":"+"}{Number(t.amount).toLocaleString("ar-IQ")} د.ع</div>
      </div>
      {showUser && <div style={S.txUser}>👤 {t.userName}</div>}
      <div style={S.txMeta}>🏗️ {t.projectName}</div>
      <div style={S.txMeta2}>📅 {t.date}</div>
      {t.note && <div style={S.txNote}>💬 {t.note}</div>}
      {onDelete && <button style={S.deleteTxBtn} onClick={onDelete}>🗑️ حذف</button>}
    </div>
  );
}

const S = {
  page:{ minHeight:"100vh", background:"#0d1117", display:"flex", justifyContent:"center", fontFamily:"'Cairo','Segoe UI',Tahoma,sans-serif", direction:"rtl" },
  loginWrap:{ width:"100%", maxWidth:420, padding:"40px 24px 60px", color:"#fff" },
  logo:{ textAlign:"center", marginBottom:40 },
  logoBox:{ fontSize:52, marginBottom:12 },
  logoText:{ fontSize:28, fontWeight:900, color:"#c8a876", letterSpacing:-0.5 },
  logoSub:{ fontSize:13, color:"#64748b", marginTop:6 },
  label:{ fontSize:14, color:"#94a3b8", marginBottom:14, textAlign:"center" },
  userGrid:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
  userBtn:{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:18, padding:"18px 12px", color:"#fff", cursor:"pointer", textAlign:"center", transition:"all 0.2s" },
  managerBtn:{ border:"1px solid rgba(200,168,118,0.4)", background:"rgba(200,168,118,0.06)", gridColumn:"1/-1" },
  avatar:{ width:48, height:48, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:800, margin:"0 auto 10px" },
  userBtnName:{ fontSize:14, fontWeight:700 },
  userBtnRole:{ fontSize:11, color:"#94a3b8", marginTop:3 },
  selectedUser:{ display:"flex", alignItems:"center", gap:14, background:"rgba(200,168,118,0.08)", border:"1px solid rgba(200,168,118,0.2)", borderRadius:16, padding:"16px 20px", marginBottom:28, color:"#fff" },
  pinDots:{ display:"flex", justifyContent:"center", gap:18, marginBottom:10 },
  dot:{ width:16, height:16, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.2)", transition:"background 0.15s" },
  pinError:{ textAlign:"center", color:"#fca5a5", fontSize:13, marginBottom:10 },
  numpad:{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, margin:"16px 0" },
  numBtn:{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:"18px", color:"#fff", fontSize:22, fontWeight:700, cursor:"pointer" },
  numEmpty:{ background:"transparent", border:"none" },
  loginBtn:{ width:"100%", background:"linear-gradient(135deg,#b8860b,#c8a876)", border:"none", borderRadius:16, padding:"16px", color:"#1a0a00", fontSize:17, fontWeight:800, cursor:"pointer", marginBottom:10 },
  backBtn:{ width:"100%", background:"transparent", border:"1px solid rgba(255,255,255,0.1)", borderRadius:16, padding:"14px", color:"#94a3b8", fontSize:15, cursor:"pointer" },
  appWrap:{ width:"100%", maxWidth:420, display:"flex", flexDirection:"column", minHeight:"100vh", color:"#fff" },
  header:{ background:"rgba(255,255,255,0.03)", borderBottom:"1px solid rgba(255,255,255,0.06)", padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" },
  headerLogoBox:{ fontSize:28 },
  headerCompany:{ fontSize:15, fontWeight:800, color:"#c8a876" },
  headerRole:{ fontSize:11, color:"#64748b", marginTop:1 },
  logoutBtn:{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:"7px 14px", color:"#94a3b8", fontSize:13, cursor:"pointer" },
  content:{ flex:1, padding:"20px 16px 100px", overflowY:"auto" },
  balCard:{ background:"linear-gradient(135deg,#1a2744,#0d1b3e)", border:"1px solid rgba(200,168,118,0.2)", borderRadius:22, padding:"24px 20px", marginBottom:18 },
  balTop:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 },
  balLabel:{ fontSize:12, color:"rgba(255,255,255,0.5)", marginBottom:6 },
  balAmount:{ fontSize:30, fontWeight:900 },
  balSub:{ fontSize:12, marginTop:4, color:"rgba(255,255,255,0.6)" },
  balAvatar:{ width:48, height:48, borderRadius:"50%", background:"linear-gradient(135deg,#1e3a5f,#2563eb)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:800 },
  balDivider:{ height:1, background:"rgba(255,255,255,0.08)", marginBottom:16 },
  balRow:{ display:"flex", gap:20 },
  balStat:{ display:"flex", alignItems:"center", gap:10 },
  balStatIcon:{ width:32, height:32, borderRadius:10, background:"rgba(134,239,172,0.12)", color:"#86efac", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700 },
  addBtn:{ width:"100%", background:"linear-gradient(135deg,#b8860b,#c8a876)", border:"none", borderRadius:16, padding:"16px", color:"#1a0a00", fontSize:16, fontWeight:800, cursor:"pointer", marginBottom:10 },
  secTitle:{ fontSize:15, fontWeight:800, color:"#e2e8f0", marginBottom:14, marginTop:4 },
  txCard:{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:"14px 16px", marginBottom:10 },
  txTop:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 },
  txBadge:{ borderRadius:10, padding:"4px 12px", fontSize:12, fontWeight:700 },
  txAmount:{ fontSize:16, fontWeight:800 },
  txUser:{ fontSize:12, color:"#c8a876", marginBottom:4 },
  txMeta:{ fontSize:13, color:"#94a3b8", marginBottom:2 },
  txMeta2:{ fontSize:12, color:"#64748b" },
  txNote:{ fontSize:13, color:"#cbd5e1", marginTop:8, background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"8px 12px" },
  deleteTxBtn:{ marginTop:10, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, padding:"6px 14px", color:"#fca5a5", fontSize:12, cursor:"pointer" },
  empty:{ textAlign:"center", color:"#475569", padding:"48px 0", fontSize:14 },
  formCard:{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:20, padding:20 },
  filterCard:{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, padding:16, marginBottom:16 },
  fieldLabel:{ fontSize:12, color:"#94a3b8", marginBottom:8, marginTop:14, fontWeight:600 },
  typeRow:{ display:"flex", gap:10 },
  typeBtn:{ flex:1, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:"13px", color:"#94a3b8", fontSize:15, fontWeight:700, cursor:"pointer" },
  typeBtnGreen:{ background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.4)", color:"#86efac" },
  typeBtnRed:{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.4)", color:"#fca5a5" },
  select:{ width:"100%", background:"#161d2b", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"12px 14px", color:"#fff", fontSize:14, outline:"none", boxSizing:"border-box" },
  input:{ width:"100%", background:"#161d2b", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"12px 14px", color:"#fff", fontSize:14, outline:"none", boxSizing:"border-box" },
  textarea:{ width:"100%", background:"#161d2b", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"12px 14px", color:"#fff", fontSize:14, outline:"none", resize:"none", boxSizing:"border-box" },
  submitBtn:{ width:"100%", background:"linear-gradient(135deg,#b8860b,#c8a876)", border:"none", borderRadius:14, padding:"16px", color:"#1a0a00", fontSize:16, fontWeight:800, cursor:"pointer" },
  cancelBtn:{ width:"100%", background:"transparent", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:"14px", color:"#94a3b8", fontSize:14, cursor:"pointer", marginTop:10 },
  successBox:{ textAlign:"center", padding:"60px 0", color:"#86efac", fontSize:18, fontWeight:800 },
  successIcon:{ fontSize:60, marginBottom:14 },
  mgGrid:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 },
  mgCard:{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:18, padding:"20px 14px", color:"#fff", cursor:"pointer", textAlign:"center" },
  mgIcon:{ fontSize:32, marginBottom:8 },
  mgLabel:{ fontSize:14, fontWeight:800, color:"#e2e8f0" },
  mgSub:{ fontSize:11, color:"#64748b", marginTop:4 },
  empRow:{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:"12px 16px", marginBottom:8, display:"flex", alignItems:"center", gap:12 },
  empAv:{ width:38, height:38, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, flexShrink:0 },
  empName:{ fontSize:14, fontWeight:700 },
  empSub:{ fontSize:11, color:"#64748b", marginTop:2 },
  stmtGrid:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 },
  stmtCard:{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:18, padding:"20px 14px", color:"#fff", cursor:"pointer", textAlign:"center" },
  stmtAv:{ width:48, height:48, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:800, margin:"0 auto 10px" },
  stmtName:{ fontSize:15, fontWeight:800, marginBottom:4 },
  stmtBalBox:{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px", marginBottom:12 },
  stmtBtn:{ fontSize:12, color:"#c8a876", fontWeight:700 },
  summaryRow:{ display:"flex", gap:10, marginBottom:16 },
  sumBox:{ flex:1, borderRadius:14, padding:"14px 10px", textAlign:"center" },
  sumLabel:{ fontSize:11, color:"#94a3b8", marginBottom:6 },
  sumVal:{ fontSize:14, fontWeight:800 },
  projCard:{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"12px 16px", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" },
  projName:{ fontSize:14, fontWeight:700 },
  deleteBtn:{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, padding:"6px 14px", color:"#fca5a5", fontSize:13, cursor:"pointer" },
  bottomNav:{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:420, background:"rgba(13,17,23,0.97)", borderTop:"1px solid rgba(255,255,255,0.06)", display:"flex", padding:"10px 10px 20px" },
  navBtn:{ flex:1, background:"transparent", border:"none", color:"#64748b", cursor:"pointer", padding:"6px 4px", borderRadius:12, display:"flex", flexDirection:"column", alignItems:"center", gap:3, fontSize:10, fontWeight:600 },
  navActive:{ color:"#c8a876", background:"rgba(200,168,118,0.08)" },
  navIcon:{ fontSize:20 },
};
