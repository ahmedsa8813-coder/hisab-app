import React, { useState, useEffect } from "react";
import { PASS, PROVINCES, PARTNERS, TYPES, fNum, w2 } from "../constants.js";

function PartnerPage({ partner, funds, onBack, onWithdraw }) {
  const pf = funds["partner_" + partner.id] || { din: 0, dol: 0 };
  const [wDin, setWDin] = useState("");
  const [wDol, setWDol] = useState("");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const amtDin = Number(wDin) || 0;
  const amtDol = Number(wDol) || 0;
  const valid = (amtDin > 0 || amtDol > 0)
    && amtDin <= pf.din
    && amtDol <= pf.dol;

  const doWithdraw = async () => {
    if (!valid || saving) return;
    if (amtDin > pf.din) { alert("⛔ رصيد الدينار غير كافٍ\nالمتاح: " + fNum(pf.din) + " د.ع"); return; }
    if (amtDol > pf.dol) { alert("⛔ رصيد الدولار غير كافٍ\nالمتاح: " + fNum(pf.dol) + "$"); return; }
    setSaving(true);
    await onWithdraw(partner.id, amtDin, amtDol);
    setSaving(false);
    setOk(true);
    setTimeout(() => { setOk(false); setWDin(""); setWDol(""); }, 1500);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9",
      fontFamily:"Tahoma", direction:"rtl" }}>
      <div style={{ maxWidth:480, margin:"0 auto", padding:"22px 16px" }}>

        <button onClick={onBack} style={{ background:"#fff", border:"1px solid #E2E8F0",
          borderRadius:10, padding:"8px 16px", fontSize:13, color:"#475569",
          cursor:"pointer", marginBottom:16, fontFamily:"Tahoma",
          display:"flex", alignItems:"center", gap:6 }}>
          ← رجوع
        </button>

        {/* بطاقة الشريك */}
        <div style={{ background:partner.bg, borderRadius:16, padding:"20px",
          border:"2px solid "+partner.color+"40", marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:20, fontWeight:700, color:partner.color }}>
                {partner.name}
              </div>
              <div style={{ fontSize:13, color:"#64748B", marginTop:3 }}>
                حصة {partner.pct}% من أرباح الشركاء
              </div>
            </div>
            <div style={{ width:50, height:50, borderRadius:14,
              background:"#fff", display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:26 }}>👤</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div style={{ background:"#fff", borderRadius:12, padding:"14px",
              textAlign:"center", border:"1.5px solid "+partner.color+"30" }}>
              <div style={{ fontSize:10, color:"#64748B", marginBottom:4 }}>💰 رصيد الدينار</div>
              <div style={{ fontSize:20, fontWeight:700, color:partner.color }}>
                {fNum(pf.din)}
              </div>
              <div style={{ fontSize:12, color:"#64748B" }}>د.ع</div>
            </div>
            <div style={{ background:"#fff", borderRadius:12, padding:"14px",
              textAlign:"center", border:"1.5px solid #2563EB30" }}>
              <div style={{ fontSize:10, color:"#64748B", marginBottom:4 }}>💰 رصيد الدولار</div>
              <div style={{ fontSize:20, fontWeight:700, color:"#2563EB" }}>
                {fNum(pf.dol)}
              </div>
              <div style={{ fontSize:12, color:"#64748B" }}>$</div>
            </div>
          </div>
        </div>

        {/* سحب */}
        <div style={{ background:"#fff", borderRadius:14, padding:"18px 20px",
          border:"1px solid #E2E8F0" }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#1E293B", marginBottom:14 }}>
            ↑ سحب من الرصيد
          </div>
          {ok ? (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ fontSize:40 }}>✅</div>
              <div style={{ fontSize:16, fontWeight:700, color:"#16A34A", marginTop:8 }}>
                تم السحب بنجاح
              </div>
            </div>
          ) : (
            <>
              {/* دينار */}
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:12, color:"#16A34A", fontWeight:700, marginBottom:6 }}>
                  🇮🇶 مبلغ الدينار
                </div>
                <input type="text" inputMode="numeric" placeholder="٠"
                  value={wDin}
                  onChange={e => setWDin(e.target.value.replace(/[^0-9]/g,""))}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:10,
                    padding:"12px 14px", fontSize:15, outline:"none", fontFamily:"Tahoma",
                    direction:"rtl", boxSizing:"border-box",
                    background:"#F8FAFC", color:"#1E293B",
                    MozAppearance:"textfield" }}/>
                {amtDin > 0 && (
                  <div style={{ fontSize:12, fontWeight:600, marginTop:4,
                    color: amtDin > pf.din ? "#DC2626" : "#16A34A" }}>
                    {amtDin > pf.din
                      ? "⛔ يتجاوز الرصيد! المتاح: " + fNum(pf.din) + " د.ع"
                      : "✍️ " + w2(amtDin) + " دينار — المتبقي: " + fNum(pf.din - amtDin) + " د.ع"}
                  </div>
                )}
              </div>
              {/* دولار */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, color:"#2563EB", fontWeight:700, marginBottom:6 }}>
                  🇺🇸 مبلغ الدولار
                </div>
                <input type="text" inputMode="numeric" placeholder="٠"
                  value={wDol}
                  onChange={e => setWDol(e.target.value.replace(/[^0-9]/g,""))}
                  style={{ width:"100%", border:"1px solid #CBD5E1", borderRadius:10,
                    padding:"12px 14px", fontSize:15, outline:"none", fontFamily:"Tahoma",
                    direction:"rtl", boxSizing:"border-box",
                    background:"#F8FAFC", color:"#1E293B",
                    MozAppearance:"textfield" }}/>
                {amtDol > 0 && (
                  <div style={{ fontSize:12, fontWeight:600, marginTop:4,
                    color: amtDol > pf.dol ? "#DC2626" : "#2563EB" }}>
                    {amtDol > pf.dol
                      ? "⛔ يتجاوز الرصيد! المتاح: " + fNum(pf.dol) + " $"
                      : "✍️ " + w2(amtDol) + " دولار — المتبقي: " + fNum(pf.dol - amtDol) + " $"}
                  </div>
                )}
              </div>
              <button onClick={doWithdraw} disabled={!valid || saving} style={{
                width:"100%", border:"none", borderRadius:12, padding:"14px",
                fontSize:15, fontWeight:700, fontFamily:"Tahoma",
                cursor: valid && !saving ? "pointer" : "not-allowed",
                background: valid ? partner.color : "#E2E8F0",
                color: valid ? "#fff" : "#94A3B8" }}>
                {saving ? "جاري السحب..." : "↑ تأكيد السحب"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PartnerPage;
