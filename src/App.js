import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot,
  deleteDoc, doc, updateDoc, orderBy, query } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyCN0XF9YDxLZIOMoVeZYMpXLl0rrS1HGrs",
  authDomain: "bab-fb825.firebaseapp.com",
  projectId: "bab-fb825"
});
const db = getFirestore(app);

export default function App() {
  const [projects, setProjects] = useState([]);
  const [tab, setTab] = useState("active");
  const [form, setForm] = useState({ name: "", client: "", province: "" });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const addProject = async () => {
    if (!form.name.trim()) return;
    await addDoc(collection(db, "projects"), {
      name: form.name.trim(),
      client: form.client.trim(),
      province: form.province.trim(),
      status: "active",
      createdAt: new Date().toISOString()
    });
    setForm({ name: "", client: "", province: "" });
    setShowForm(false);
  };

  const deleteProject = async id => {
    if (!window.confirm("حذف المشروع؟")) return;
    await deleteDoc(doc(db, "projects", id));
  };

  const toggleStatus = async (id, current) => {
    await updateDoc(doc(db, "projects", id), {
      status: current === "active" ? "done" : "active"
    });
  };

  const active = projects.filter(p => p.status === "active");
  const done   = projects.filter(p => p.status === "done");
  const list   = tab === "active" ? active : done;

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9",
      fontFamily: "Tahoma", direction: "rtl" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px" }}>

        {/* هيدر */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px",
          marginBottom: 16, border: "1px solid #E2E8F0", borderTop: "4px solid #D97706" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1E293B" }}>🏗️ صندوق المشاريع</div>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <span style={{ fontSize: 13, color: "#16A34A", fontWeight: 600 }}>
              ● {active.length} قيد العمل
            </span>
            <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>
              ✓ {done.length} منتهية
            </span>
          </div>
        </div>

        {/* تبويبات */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 8, marginBottom: 16 }}>
          <button onClick={() => setTab("active")} style={{
            border: "none", borderRadius: 10, padding: "12px",
            cursor: "pointer", fontFamily: "Tahoma", fontSize: 14, fontWeight: 700,
            background: tab === "active" ? "#16A34A" : "#fff",
            color: tab === "active" ? "#fff" : "#64748B",
            border: tab === "active" ? "none" : "1px solid #E2E8F0"
          }}>● قيد العمل ({active.length})</button>
          <button onClick={() => setTab("done")} style={{
            border: "none", borderRadius: 10, padding: "12px",
            cursor: "pointer", fontFamily: "Tahoma", fontSize: 14, fontWeight: 700,
            background: tab === "done" ? "#64748B" : "#fff",
            color: tab === "done" ? "#fff" : "#64748B",
            border: tab === "done" ? "none" : "1px solid #E2E8F0"
          }}>✓ منتهية ({done.length})</button>
        </div>

        {/* زر إضافة — فقط في تبويب قيد العمل */}
        {tab === "active" && (
          <button onClick={() => setShowForm(v => !v)} style={{
            width: "100%", background: showForm ? "#475569" : "#D97706",
            border: "none", borderRadius: 12, padding: "13px",
            color: "#fff", fontSize: 15, fontWeight: 700,
            cursor: "pointer", fontFamily: "Tahoma", marginBottom: 14
          }}>
            {showForm ? "✕ إلغاء" : "+ إضافة مشروع جديد"}
          </button>
        )}

        {/* فورم الإضافة */}
        {showForm && tab === "active" && (
          <div style={{ background: "#fff", borderRadius: 14, padding: 20,
            border: "1px solid #E2E8F0", marginBottom: 16 }}>

            {[
              { label: "اسم المشروع *", key: "name", placeholder: "أدخل اسم المشروع..." },
              { label: "اسم العميل",    key: "client",   placeholder: "صاحب المشروع..." },
              { label: "المحافظة",      key: "province", placeholder: "بغداد، البصرة..." }
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
                  {label}
                </div>
                <input
                  autoFocus={key === "name"}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                    padding: "12px 14px", fontSize: 15, outline: "none",
                    fontFamily: "Tahoma", direction: "rtl", marginBottom: 12,
                    boxSizing: "border-box", background: "#F8FAFC", color: "#1E293B" }}
                />
              </div>
            ))}

            <button onClick={addProject} disabled={!form.name.trim()} style={{
              width: "100%", border: "none", borderRadius: 10, padding: "13px",
              fontSize: 15, fontWeight: 700, fontFamily: "Tahoma",
              cursor: form.name.trim() ? "pointer" : "not-allowed",
              background: form.name.trim() ? "#D97706" : "#E2E8F0",
              color: form.name.trim() ? "#fff" : "#94A3B8"
            }}>
              ✅ حفظ المشروع
            </button>
          </div>
        )}

        {/* قائمة المشاريع */}
        {list.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#94A3B8",
            background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>
              {tab === "active" ? "🏗️" : "✅"}
            </div>
            <div style={{ fontSize: 15 }}>
              {tab === "active" ? "ما في مشاريع قيد العمل" : "ما في مشاريع منتهية"}
            </div>
          </div>
        ) : (
          list.map(p => (
            <div key={p.id} style={{ background: "#fff", borderRadius: 14,
              padding: "16px 18px", marginBottom: 12, border: "1px solid #E2E8F0",
              borderRight: "5px solid " + (p.status === "active" ? "#16A34A" : "#94A3B8") }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1E293B" }}>
                    {p.name}
                  </div>
                  {p.client && (
                    <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>👤 {p.client}</div>
                  )}
                  {p.province && (
                    <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>📍 {p.province}</div>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 600, marginTop: 8,
                    display: "inline-block", padding: "3px 10px", borderRadius: 20,
                    background: p.status === "active" ? "#DCFCE7" : "#F1F5F9",
                    color: p.status === "active" ? "#16A34A" : "#64748B" }}>
                    {p.status === "active" ? "● قيد العمل" : "✓ منتهي"}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                  <button onClick={() => toggleStatus(p.id, p.status)} style={{
                    background: p.status === "active" ? "#F0FDF4" : "#FFFBEB",
                    border: "1px solid " + (p.status === "active" ? "#16A34A" : "#D97706"),
                    borderRadius: 8, padding: "6px 12px", cursor: "pointer",
                    fontSize: 12, fontFamily: "Tahoma", fontWeight: 700,
                    color: p.status === "active" ? "#16A34A" : "#D97706"
                  }}>
                    {p.status === "active" ? "✓ إنهاء" : "↩ إعادة تفعيل"}
                  </button>
                  <button onClick={() => deleteProject(p.id)} style={{
                    background: "none", border: "none", color: "#DC2626",
                    cursor: "pointer", fontSize: 12, fontFamily: "Tahoma", fontWeight: 600
                  }}>
                    🗑️ حذف
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
