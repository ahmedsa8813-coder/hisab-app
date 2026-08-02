import React, { useState, useEffect } from "react";
import { PASS, PROVINCES, PARTNERS, TYPES, fNum, w2 } from "../constants.js";
const typeStyle = t => TYPES.find(x => x.val === t) || {};

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

export default ProjectCard;
