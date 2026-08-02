import React, { useState, useEffect } from "react";
import { db } from "../firebase.js";
import { collection, addDoc, onSnapshot, deleteDoc, doc,
  updateDoc, setDoc, query, where, getDocs, getDoc } from "firebase/firestore";
import { PASS, PROVINCES, PARTNERS, TYPES, fNum, w2 } from "../constants.js";
const typeStyle = t => TYPES.find(x => x.val === t) || {};

function ClosingModal({ proj, funds, onConfirm, onCancel }) {
  const balDin = proj.balDin || 0;
  const balDol = proj.balDol || 0;
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
  const valid = total === 100 && balDin + balDol > 0;

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

          {/* الأرباح */}
          <div style={{ background:"#F8FAFC", borderRadius:12, padding:14, marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#64748B", marginBottom:10 }}>
              💰 الأرباح المراد توزيعها
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <div style={{ background:"#FFFBEB", borderRadius:10, padding:"10px",
                textAlign:"center", border:"2px solid #D97706" }}>
                <div style={{ fontSize:10, color:"#64748B", marginBottom:3 }}>🇮🇶 دينار</div>
                <div style={{ fontSize:16, fontWeight:700, color:"#D97706" }}>
                  {fNum(balDin)} د.ع
                </div>
              </div>
              <div style={{ background:"#EFF6FF", borderRadius:10, padding:"10px",
                textAlign:"center", border:"2px solid #2563EB" }}>
                <div style={{ fontSize:10, color:"#64748B", marginBottom:3 }}>🇺🇸 دولار</div>
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
                  <div style={{ display:"flex", gap:12, fontSize:12 }}>
                    {balDin > 0 && (
                      <span style={{ fontWeight:700, color }}>
                        {fNum(shareDin)} د.ع
                      </span>
                    )}
                    {balDol > 0 && (
                      <span style={{ fontWeight:700, color:"#2563EB" }}>
                        {fNum(shareDol)} $
                      </span>
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

export default ClosingModal;
