import React, { useState, useEffect } from "react";

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


export default HomePage;
