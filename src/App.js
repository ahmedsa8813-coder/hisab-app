import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, orderBy, query } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyCN0XF9YDxLZIOMoVeZYMpXLl0rrS1HGrs",
  authDomain: "bab-fb825.firebaseapp.com",
  projectId: "bab-fb825"
});
const db = getFirestore(app);

export default function App() {
  const [page, setPage] = useState("home");
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ name: "", client: "", province: "" });
  const [showForm, setShowForm] = useState(false);

  // جلب المشاريع من Firebase
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
      createdAt: new Date().toISOString()
    });
    setForm({ name: "", client: "", province: "" });
    setShowForm(false);
  };

  const deleteProject = async (id) => {
    if (!window.confirm("حذف المشروع؟")) return;
    await deleteDoc(doc(db, "projects", id));
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "Tahoma", direction: "rtl" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px" }}>

        {/* هيدر */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px",
          marginBottom: 20, border: "1px solid #E2E8F0", borderTop: "4px solid #D97706" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1E293B" }}>🏗️ صندوق المشاريع</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
            {projects.length} مشروع مضاف
          </div>
        </div>

        {/* زر إضافة */}
        <button onClick={() => setShowForm(v => !v)} style={{
          width: "100%", background: showForm ? "#475569" : "#D97706",
          border: "none", borderRadius: 12, padding: "14px",
          color: "#fff", fontSize: 15, fontWeight: 700,
          cursor: "pointer", fontFamily: "Tahoma", marginBottom: 16
        }}>
          {showForm ? "✕ إلغاء" : "+ إضافة مشروع جديد"}
        </button>

        {/* فورم الإضافة */}
        {showForm && (
          <div style={{ background: "#fff", borderRadius: 14, padding: 20,
            border: "1px solid #E2E8F0", marginBottom: 16 }}>

            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              اسم المشروع *
            </div>
            <input
              autoFocus
              placeholder="أدخل اسم المشروع..."
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none",
                fontFamily: "Tahoma", direction: "rtl", marginBottom: 12,
                boxSizing: "border-box", background: "#F8FAFC" }}
            />

            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              اسم العميل
            </div>
            <input
              placeholder="صاحب المشروع..."
              value={form.client}
              onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none",
                fontFamily: "Tahoma", direction: "rtl", marginBottom: 12,
                boxSizing: "border-box", background: "#F8FAFC" }}
            />

            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              المحافظة
            </div>
            <input
              placeholder="بغداد، البصرة..."
              value={form.province}
              onChange={e => setForm(f => ({ ...f, province: e.target.value }))}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none",
                fontFamily: "Tahoma", direction: "rtl", marginBottom: 16,
                boxSizing: "border-box", background: "#F8FAFC" }}
            />

            <button onClick={addProject} disabled={!form.name.trim()} style={{
              width: "100%", border: "none", borderRadius: 10, padding: "13px",
              fontSize: 15, fontWeight: 700, cursor: form.name.trim() ? "pointer" : "not-allowed",
              fontFamily: "Tahoma",
              background: form.name.trim() ? "#D97706" : "#E2E8F0",
              color: form.name.trim() ? "#fff" : "#94A3B8"
            }}>
              ✅ حفظ المشروع
            </button>
          </div>
        )}

        {/* قائمة المشاريع */}
        {projects.length === 0 && !showForm && (
          <div style={{ textAlign: "center", padding: 40, color: "#94A3B8",
            background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🏗️</div>
            <div style={{ fontSize: 15 }}>ما في مشاريع بعد</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>اضغط + لإضافة أول مشروع</div>
          </div>
        )}

        {projects.map(p => (
          <div key={p.id} style={{ background: "#fff", borderRadius: 14, padding: "16px 18px",
            marginBottom: 12, border: "1px solid #E2E8F0", borderRight: "5px solid #D97706" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1E293B" }}>{p.name}</div>
                {p.client && (
                  <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>👤 {p.client}</div>
                )}
                {p.province && (
                  <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>📍 {p.province}</div>
                )}
              </div>
              <button onClick={() => deleteProject(p.id)} style={{
                background: "none", border: "none", color: "#DC2626",
                cursor: "pointer", fontSize: 13, fontFamily: "Tahoma", fontWeight: 600
              }}>
                🗑️ حذف
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
