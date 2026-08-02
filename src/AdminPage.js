import React, { useState, useEffect } from "react";
import { db } from "../firebase.js";
import { collection, addDoc, onSnapshot, deleteDoc, doc,
  updateDoc, setDoc, query, where, getDocs, getDoc } from "firebase/firestore";
import { PASS, PROVINCES, PARTNERS, TYPES, fNum, w2 } from "../constants.js";
const typeStyle = t => TYPES.find(x => x.val === t) || {};

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


export default AdminPage;
