import React, { useState, useEffect } from "react";
import { db } from "../firebase.js";
import { collection, addDoc, onSnapshot, deleteDoc, doc,
  updateDoc, setDoc, query, where, getDocs, getDoc } from "firebase/firestore";
import { PASS, PROVINCES, PARTNERS, TYPES, fNum, w2 } from "../constants.js";
const typeStyle = t => TYPES.find(x => x.val === t) || {};

function ProjectDetail({ proj, onBack }) {
  const [txs, setTxs]     = useState([]);
  const [tab, setTab]     = useState("in");
  const [show, setShow]   = useState(false);
  const [printFilter, setPrintFilter] = useState("all");
  const [showPrint, setShowPrint] = useState(false);
  const [form, setForm]   = useState({
    amount: "", currency: "دينار", receiver: "", date: new Date().toISOString().split("T")[0], note: ""
  });
  const sf = k => v => setForm(f => ({ ...f, [k]: v }));
  const amt = Number(form.amount) || 0;

  // جلب الحركات
  useEffect(() => {
    return onSnapshot(
      query(collection(db, "project_txs"), where("projectId","==",proj.id)),
      snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a,b) => b.createdAt?.localeCompare(a.createdAt || "") || 0);
        setTxs(list);
      }
    );
  }, [proj.id]);

  const inTxs  = txs.filter(t => t.type === "in");
  const outTxs = txs.filter(t => t.type === "out");

  const totalIn  = (cur) => inTxs.filter(t=>t.currency===cur).reduce((s,t)=>s+t.amount,0);
  const totalOut = (cur) => outTxs.filter(t=>t.currency===cur).reduce((s,t)=>s+t.amount,0);

  const addTx = () => {
    if (!amt || !form.receiver.trim()) return;
    const isDol = form.currency === "دولار";
    // الاستلام: حر بدون حد أقصى
    // التحقق من عدم تجاوز المصروف للمستلم
    if (tab === "out") {
      const curIn  = totalIn(form.currency);
      const curOut = totalOut(form.currency);
      const avail  = curIn - curOut;
      if (amt > avail) {
        alert(
          "⛔ لا يمكن الصرف\n" +
          "المصروف سيتجاوز المستلم!\n\n" +
          "المتاح للصرف: " + fNum(Math.max(0, avail)) + (isDol ? " $" : " د.ع")
        );
        return;
      }
    }
    const isDolCur = form.currency === "دولار";
    const isIn = tab === "in";
    // حفظ الحركة
    addDoc(collection(db, "project_txs"), {
      projectId: proj.id,
      projectName: proj.name,
      type: tab,
      amount: amt,
      currency: form.currency,
      receiver: form.receiver.trim(),
      date: form.date,
      note: form.note.trim(),
      createdAt: new Date().toISOString()
    });
    // حساب المجاميع من txs الحالية (دائماً محدّثة) + الحركة الجديدة
    const curRecDin = inTxs.filter(t=>t.currency!=="دولار").reduce((s,t)=>s+t.amount,0);
    const curSpdDin = outTxs.filter(t=>t.currency!=="دولار").reduce((s,t)=>s+t.amount,0);
    const curRecDol = inTxs.filter(t=>t.currency==="دولار").reduce((s,t)=>s+t.amount,0);
    const curSpdDol = outTxs.filter(t=>t.currency==="دولار").reduce((s,t)=>s+t.amount,0);
    const newRecDin = !isDolCur && isIn  ? curRecDin + amt : curRecDin;
    const newSpdDin = !isDolCur && !isIn ? curSpdDin + amt : curSpdDin;
    const newRecDol = isDolCur  && isIn  ? curRecDol + amt : curRecDol;
    const newSpdDol = isDolCur  && !isIn ? curSpdDol + amt : curSpdDol;
    updateDoc(doc(db, "projects", proj.id), {
      recDin: newRecDin, spdDin: newSpdDin,
      recDol: newRecDol, spdDol: newSpdDol,
      balDin: newRecDin - newSpdDin,
      balDol: newRecDol - newSpdDol
    });
    setForm({ amount: "", currency: form.currency, receiver: "", date: form.date, note: "" });
    setShow(false);
  };

  // إعادة حساب الميزان تلقائياً كلما تغيرت الحركات
  useEffect(() => {
    if (!txs || txs.length === 0) return;
    const recDin = txs.filter(t=>t.type==="in"&&t.currency!=="دولار").reduce((s,t)=>s+t.amount,0);
    const spdDin = txs.filter(t=>t.type!=="in"&&t.currency!=="دولار").reduce((s,t)=>s+t.amount,0);
    const recDol = txs.filter(t=>t.type==="in"&&t.currency==="دولار").reduce((s,t)=>s+t.amount,0);
    const spdDol = txs.filter(t=>t.type!=="in"&&t.currency==="دولار").reduce((s,t)=>s+t.amount,0);
    updateDoc(doc(db,"projects",proj.id),{
      recDin, spdDin, recDol, spdDol,
      balDin: recDin - spdDin,
      balDol: recDol - spdDol
    });
  }, [txs]);

  const deleteTx = async (id) => {
    if (!window.confirm("حذف؟")) return;
    const t = txs.find(x=>x.id===id);
    if(!t)return;
    await deleteDoc(doc(db, "project_txs", id));
    // إعادة حساب الميزان بعد الحذف
    const isDolCur = t.currency==="دولار";
    const isIn = t.type==="in";
    const curRecDin = inTxs.filter(x=>x.currency!=="دولار").reduce((s,x)=>s+x.amount,0);
    const curSpdDin = outTxs.filter(x=>x.currency!=="دولار").reduce((s,x)=>s+x.amount,0);
    const curRecDol = inTxs.filter(x=>x.currency==="دولار").reduce((s,x)=>s+x.amount,0);
    const curSpdDol = outTxs.filter(x=>x.currency==="دولار").reduce((s,x)=>s+x.amount,0);
    const newRecDin = !isDolCur && isIn  ? curRecDin - t.amount : curRecDin;
    const newSpdDin = !isDolCur && !isIn ? curSpdDin - t.amount : curSpdDin;
    const newRecDol = isDolCur  && isIn  ? curRecDol - t.amount : curRecDol;
    const newSpdDol = isDolCur  && !isIn ? curSpdDol - t.amount : curSpdDol;
    updateDoc(doc(db,"projects",proj.id),{
      recDin:Math.max(0,newRecDin), spdDin:Math.max(0,newSpdDin),
      recDol:Math.max(0,newRecDol), spdDol:Math.max(0,newSpdDol),
      balDin:Math.max(0,newRecDin)-Math.max(0,newSpdDin),
      balDol:Math.max(0,newRecDol)-Math.max(0,newSpdDol)
    });
  };

  const ts = typeStyle(proj.type);

  const doPrint = (filter) => {
    const f = filter || printFilter;
    const list = (f==="in"?inTxs:f==="out"?outTxs:[...inTxs,...outTxs])
      .sort((a,b)=>{
        const d=(a.date||"").localeCompare(b.date||"");
        if(d!==0)return d;
        return (a.createdAt||"").localeCompare(b.createdAt||"");
      });

    // بناء الصفوف مع الميزان التراكمي لكل عملة
    const buildRows = (currency) => {
      const rows = list.filter(t => !currency || t.currency === currency);
      let bal = 0;
      let n = 0;
      return rows.map(t => {
        n++;
        const isIn = t.type === "in";
        const amt = t.amount || 0;
        bal = isIn ? bal + amt : bal - amt;
        const bg = n%2===0?"#F8FAFC":"#fff";
        const details = [t.receiver, t.note].filter(Boolean).join(" — ") || "—";
        return `<tr style="background:${bg}">
          <td style="color:#64748B;font-size:10px">${t.date||""}</td>
          <td style="text-align:right;padding:7px 10px">${details}</td>
          <td style="color:#DC2626;font-weight:700;text-align:center">${!isIn?fNum(amt):""}</td>
          <td style="color:#16A34A;font-weight:700;text-align:center">${isIn?fNum(amt):""}</td>
          <td style="font-weight:700;text-align:center;color:${bal>=0?"#D97706":"#DC2626"}">${fNum(Math.abs(bal))}</td>
        </tr>`;
      }).join("");
    };

    const rowsDin = buildRows("دينار");
    const rowsDol = buildRows("دولار");
    const balDin = totalIn("دينار")-totalOut("دينار");
    const balDol = totalIn("دولار")-totalOut("دولار");

    const tableStyle = `
      table{width:100%;border-collapse:collapse;margin-bottom:28px}
      thead tr{background:#1E3A5F}
      th{color:#fff;padding:9px 8px;font-size:11px;font-weight:700}
      td{padding:7px 8px;font-size:11px;border-bottom:1px solid #E2E8F0}
      .tot td{background:#F1F5F9;font-weight:700;border-top:2px solid #1E3A5F}
    `;

    const makeTable = (rows, cur, totalIn_, totalOut_, bal_) => {
      const sym = cur==="دولار"?"$":"د.ع";
      return `
      <div style="margin-bottom:6px;font-size:13px;font-weight:700;color:#1E3A5F">
        ${cur==="دولار"?"🇺🇸 الدولار الأمريكي":"🇮🇶 الدينار العراقي"}
      </div>
      <table>
        <thead><tr>
          <th style="width:90px">التاريخ</th>
          <th style="text-align:right">التفاصيل</th>
          <th style="width:110px">المصاريف</th>
          <th style="width:110px">المقبوضات</th>
          <th style="width:110px">الميزان</th>
        </tr></thead>
        <tbody>
          ${rows}
          <tr class="tot">
            <td colspan="2" style="text-align:center">الإجمالي</td>
            <td style="color:#DC2626;text-align:center">${fNum(totalOut_)} ${sym}</td>
            <td style="color:#16A34A;text-align:center">${fNum(totalIn_)} ${sym}</td>
            <td style="color:${bal_>=0?"#D97706":"#DC2626"};text-align:center">${fNum(Math.abs(bal_))} ${sym}</td>
          </tr>
        </tbody>
      </table>`;
    };

    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
<style>
  *{font-family:Tahoma,Arial,sans-serif;box-sizing:border-box}
  body{margin:0;padding:20px;direction:rtl;color:#1E293B}
  .header{text-align:center;border-bottom:3px solid #1E3A5F;padding-bottom:12px;margin-bottom:16px}
  .co{font-size:22px;font-weight:700;letter-spacing:1px}
  .sub{font-size:13px;color:#64748B;margin-top:4px}
  .proj-title{font-size:16px;font-weight:700;margin:12px 0 4px;color:#1E3A5F}
  .proj-info{font-size:11px;color:#64748B;margin-bottom:14px}
  ${tableStyle}
  .footer{margin-top:16px;font-size:10px;color:#94A3B8;
    display:flex;justify-content:space-between;border-top:1px solid #E2E8F0;padding-top:8px}
  @media print{body{padding:12px}}
</style></head><body>

<div class="header">
  <div class="co">شركة باب المشاريع</div>
  <div class="sub">بغداد — العرصات</div>
</div>

<div class="proj-title">
  ${f==="in"?"كشف المقبوضات":f==="out"?"كشف المصاريف":"الكشف الشامل"} — ${proj.name}
</div>
<div class="proj-info">
  ${proj.type?"النوع: "+proj.type+"   ·   ":""}
  ${proj.province?proj.province+(proj.city?" — "+proj.city:"")+"   ·   ":""}
  ${proj.startDate?"بداية: "+proj.startDate+"   ·   ":""}
  ${proj.days?"مدة: "+proj.days+" يوم":""}
</div>

${(f!=="out"&&totalIn("دينار")+totalOut("دينار")>0)||f==="all"?
  makeTable(rowsDin,"دينار",totalIn("دينار"),totalOut("دينار"),balDin):""}
${(f!=="in"&&totalIn("دولار")+totalOut("دولار")>0)||f==="all"?
  makeTable(rowsDol,"دولار",totalIn("دولار"),totalOut("دولار"),balDol):""}

<div class="footer">
  <span>شركة باب المشاريع</span>
  <span>تاريخ الطباعة: ${new Date().toISOString().split("T")[0]}</span>
</div>
</body></html>`;

    const w = window.open("","_blank","width=920,height=750");
    if(!w){alert("السماح بالنوافذ المنبثقة");return;}
    w.document.write(html);w.document.close();w.focus();
    setTimeout(()=>w.print(),700);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9",
      fontFamily: "Tahoma", direction: "rtl" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px" }}>

        {/* رجوع */}
        <button onClick={onBack} style={{ background: "#fff", border: "1px solid #E2E8F0",
          borderRadius: 10, padding: "8px 16px", fontSize: 13, color: "#475569",
          cursor: "pointer", marginBottom: 16, fontFamily: "Tahoma",
          display: "flex", alignItems: "center", gap: 6 }}>
          ← رجوع للمشاريع
        </button>

        {/* بطاقة المشروع */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px",
          marginBottom: 16, border: "1px solid #E2E8F0",
          borderTop: "4px solid " + (ts.color || "#D97706") }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            {proj.type && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px",
                borderRadius: 20, background: ts.bg, color: ts.color }}>
                {ts.icon} {proj.type}
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px",
              borderRadius: 20,
              background: proj.status === "active" ? "#DCFCE7" : "#F1F5F9",
              color: proj.status === "active" ? "#16A34A" : "#64748B" }}>
              {proj.status === "active" ? "● قيد العمل" : "✓ منتهي"}
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1E293B", marginBottom: 6 }}>
            {proj.name}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {proj.startDate && <span style={{ fontSize: 12, color: "#64748B" }}>📅 {proj.startDate}</span>}
            {proj.days > 0  && <span style={{ fontSize: 12, color: "#64748B" }}>⏱️ {proj.days} يوم</span>}
            {proj.valueDin > 0 && <span style={{ fontSize: 12, color: "#D97706", fontWeight: 600 }}>
              🇮🇶 {fNum(proj.valueDin)} د.ع</span>}
            {proj.valueDol > 0 && <span style={{ fontSize: 12, color: "#2563EB", fontWeight: 600 }}>
              🇺🇸 {fNum(proj.valueDol)} $</span>}
          </div>
        </div>

        {/* ملخص مالي */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 16,
          border: "1px solid #E2E8F0", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>
              📊 الملخص المالي
            </div>
            <button onClick={() => setShowPrint(v => !v)} style={{
              background: showPrint ? "#475569" : "#D97706", border: "none",
              borderRadius: 9, padding: "7px 14px", color: "#fff", cursor: "pointer",
              fontSize: 12, fontFamily: "Tahoma", fontWeight: 700 }}>
              {showPrint ? "✕ إغلاق" : "🖨️ طباعة الكشف"}
            </button>
          </div>
          {/* الدينار */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>🇮🇶 الدينار العراقي</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 3 }}>↓ مستلم</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}>{fNum(totalIn("دينار"))} د.ع</div>
              </div>
              <div style={{ background: "#FFF1F2", borderRadius: 10, padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 3 }}>↑ مصروف</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626" }}>{fNum(totalOut("دينار"))} د.ع</div>
              </div>
              <div style={{ background: totalIn("دينار")-totalOut("دينار") >= 0 ? "#FFFBEB" : "#FFF1F2",
                borderRadius: 10, padding: "10px", textAlign: "center",
                border: "2px solid " + (totalIn("دينار")-totalOut("دينار") >= 0 ? "#D97706" : "#DC2626") }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 3 }}>⚖️ الميزان</div>
                <div style={{ fontSize: 13, fontWeight: 700,
                  color: totalIn("دينار")-totalOut("دينار") >= 0 ? "#D97706" : "#DC2626" }}>
                  {totalIn("دينار")-totalOut("دينار") >= 0 ? "+" : ""}{fNum(totalIn("دينار")-totalOut("دينار"))} د.ع
                </div>
              </div>
            </div>
          </div>
          {/* الدولار */}
          <div>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>🇺🇸 الدولار الأمريكي</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 3 }}>↓ مستلم</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#2563EB" }}>{fNum(totalIn("دولار"))} $</div>
              </div>
              <div style={{ background: "#FEF2F2", borderRadius: 10, padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 3 }}>↑ مصروف</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626" }}>{fNum(totalOut("دولار"))} $</div>
              </div>
              <div style={{ background: totalIn("دولار")-totalOut("دولار") >= 0 ? "#EFF6FF" : "#FFF1F2",
                borderRadius: 10, padding: "10px", textAlign: "center",
                border: "2px solid " + (totalIn("دولار")-totalOut("دولار") >= 0 ? "#2563EB" : "#DC2626") }}>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 3 }}>⚖️ الميزان</div>
                <div style={{ fontSize: 13, fontWeight: 700,
                  color: totalIn("دولار")-totalOut("دولار") >= 0 ? "#2563EB" : "#DC2626" }}>
                  {totalIn("دولار")-totalOut("دولار") >= 0 ? "+" : ""}{fNum(totalIn("دولار")-totalOut("دولار"))} $
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* فلترة الطباعة */}
        {showPrint && (
          <div style={{ background: "#FFFBEB", borderRadius: 14, padding: 16,
            border: "1px solid #D97706", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#D97706", marginBottom: 12 }}>
              🖨️ اختر ما تريد طباعته
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              {[
                ["all","الكل معاً","#1E293B","#F1F5F9"],
                ["in","↓ المستلمات فقط","#16A34A","#F0FDF4"],
                ["out","↑ المصروفات فقط","#DC2626","#FFF1F2"],
              ].map(([v,l,color,bg]) => (
                <button key={v} onClick={() => setPrintFilter(v)} style={{
                  border: "2px solid "+(printFilter===v?color:"#E2E8F0"),
                  borderRadius: 10, padding: "12px 6px", cursor: "pointer",
                  fontFamily: "Tahoma", fontSize: 12, fontWeight: 700,
                  background: printFilter===v?bg:"#fff",
                  color: printFilter===v?color:"#94A3B8"
                }}>{l}</button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
              سيتم طباعة{" "}
              <strong style={{ color: "#1E293B" }}>
                {printFilter==="in"?inTxs.length:printFilter==="out"?outTxs.length:inTxs.length+outTxs.length}
              </strong>
              {printFilter==="in"?" مستلمات":printFilter==="out"?" مصروفات":" (الكل)"}
            </div>
            <button onClick={()=>{ doPrint(printFilter); setShowPrint(false); }}
              style={{ width:"100%", border:"none", borderRadius:10, padding:"12px",
                fontSize:14, fontWeight:700, fontFamily:"Tahoma",
                background:"#D97706", color:"#fff", cursor:"pointer" }}>
              🖨️ طباعة الآن
            </button>
          </div>
        )}

        {/* تبويبات */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          <button onClick={() => { setTab("in"); setShow(false); }} style={{
            border: tab === "in" ? "none" : "1px solid #E2E8F0",
            borderRadius: 10, padding: "12px", cursor: "pointer",
            fontFamily: "Tahoma", fontSize: 14, fontWeight: 700,
            background: tab === "in" ? "#16A34A" : "#fff",
            color: tab === "in" ? "#fff" : "#64748B"
          }}>↓ المبالغ المستلمة ({inTxs.length})</button>
          <button onClick={() => { setTab("out"); setShow(false); }} style={{
            border: tab === "out" ? "none" : "1px solid #E2E8F0",
            borderRadius: 10, padding: "12px", cursor: "pointer",
            fontFamily: "Tahoma", fontSize: 14, fontWeight: 700,
            background: tab === "out" ? "#DC2626" : "#fff",
            color: tab === "out" ? "#fff" : "#64748B"
          }}>↑ المبالغ المصروفة ({outTxs.length})</button>
        </div>

        {/* زر إضافة */}
        <button onClick={() => setShow(v => !v)} style={{
          width: "100%", border: "none", borderRadius: 12, padding: "13px",
          fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Tahoma",
          marginBottom: 14,
          background: show ? "#475569" : tab === "in" ? "#16A34A" : "#DC2626",
          color: "#fff"
        }}>
          {show ? "✕ إلغاء" : tab === "in" ? "+ إضافة مبلغ مستلم" : "+ إضافة مبلغ مصروف"}
        </button>

        {/* فورم الإضافة */}
        {show && (
          <div style={{ background: "#fff", borderRadius: 14, padding: 18,
            border: "1px solid #E2E8F0", marginBottom: 16 }}>

            {/* العملة */}
            {tab === "out" && (
              <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 14px",
                marginBottom: 12, border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}>
                  💰 المتاح للصرف
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#D97706" }}>
                    {fNum(Math.max(0, totalIn("دينار") - totalOut("دينار")))} د.ع
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#2563EB" }}>
                    {fNum(Math.max(0, totalIn("دولار") - totalOut("دولار")))} $
                  </span>
                </div>
              </div>
            )}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 8 }}>
              العملة
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {["دينار","دولار"].map(cur => (
                <button key={cur} onClick={() => sf("currency")(cur)} style={{
                  flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer",
                  fontFamily: "Tahoma", fontSize: 13, fontWeight: 700,
                  border: "2px solid " + (form.currency === cur ? (cur === "دينار" ? "#16A34A" : "#2563EB") : "#E2E8F0"),
                  background: form.currency === cur ? (cur === "دينار" ? "#F0FDF4" : "#EFF6FF") : "#fff",
                  color: form.currency === cur ? (cur === "دينار" ? "#16A34A" : "#2563EB") : "#94A3B8"
                }}>
                  {cur === "دينار" ? "🇮🇶 دينار" : "🇺🇸 دولار"}
                </button>
              ))}
            </div>

            {/* المبلغ */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              المبلغ *
            </div>
            <input placeholder="٠" value={form.amount} inputMode="numeric"
              onChange={e => sf("amount")(e.target.value.replace(/[^0-9]/g, ""))}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 4, boxSizing: "border-box",
                background: "#F8FAFC", color: "#1E293B",
                MozAppearance: "textfield", WebkitAppearance: "none" }}/>
            {amt > 0 && (
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12,
                color: form.currency === "دينار" ? "#16A34A" : "#2563EB" }}>
                ✍️ {w2(amt)} {form.currency === "دينار" ? "دينار عراقي" : "دولار أمريكي"}
                {" — "}{fNum(amt)} {form.currency === "دينار" ? "د.ع" : "$"}
              </div>
            )}
            {!amt && <div style={{ marginBottom: 12 }}/>}

            {/* المستلم */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              {tab === "in" ? "المستلم *" : "صُرف على *"}
            </div>
            <input placeholder={tab === "in" ? "اسم المستلم..." : "وجهة الصرف..."}
              value={form.receiver}
              onChange={e => sf("receiver")(e.target.value)}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 14, boxSizing: "border-box",
                background: "#F8FAFC", color: "#1E293B" }}/>

            {/* التاريخ */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              التاريخ *
            </div>
            <input type="date" value={form.date}
              onChange={e => sf("date")(e.target.value)}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 14, boxSizing: "border-box",
                background: "#F8FAFC", color: "#1E293B" }}/>

            {/* الملاحظات */}
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
              ملاحظات
            </div>
            <textarea placeholder="أي تفاصيل إضافية..."
              value={form.note}
              onChange={e => sf("note")(e.target.value)}
              rows={3}
              style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 10,
                padding: "12px 14px", fontSize: 14, outline: "none", fontFamily: "Tahoma",
                direction: "rtl", marginBottom: 16, boxSizing: "border-box",
                background: "#F8FAFC", color: "#1E293B", resize: "none" }}/>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <button onClick={addTx} disabled={!amt || !form.receiver.trim()} style={{
                border: "none", borderRadius: 10, padding: "13px",
                fontSize: 14, fontWeight: 700, fontFamily: "Tahoma",
                cursor: amt && form.receiver.trim() ? "pointer" : "not-allowed",
                background: amt && form.receiver.trim()
                  ? (tab === "in" ? "#16A34A" : "#DC2626") : "#E2E8F0",
                color: amt && form.receiver.trim() ? "#fff" : "#94A3B8"
              }}>
                {tab === "in" ? "✅ تسجيل المبلغ المستلم" : "✅ تسجيل المبلغ المصروف"}
              </button>
              {amt > 0 && form.receiver.trim() && (
                <button onClick={() => {
                  const isDol = form.currency === "دولار";
                  const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/>
<style>*{font-family:Tahoma}body{margin:30px;direction:rtl;max-width:400px}
.top{text-align:center;border-bottom:2px dashed #E2E8F0;padding-bottom:14px;margin-bottom:14px}
.co{font-size:18px;font-weight:700;color:#1E293B}.ca{font-size:11px;color:#64748B;margin-top:3px}
.title{font-size:14px;font-weight:700;color:${tab==="in"?"#16A34A":"#DC2626"};margin:14px 0 10px}
.row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #F1F5F9}
.lbl{font-size:12px;color:#64748B}.val{font-size:12px;font-weight:700;color:#1E293B}
.amount{font-size:22px;font-weight:700;text-align:center;margin:14px 0;
  color:${tab==="in"?"#16A34A":"#DC2626"}}
.footer{text-align:center;font-size:10px;color:#94A3B8;margin-top:16px;border-top:2px dashed #E2E8F0;padding-top:10px}
</style></head><body>
<div class="top">
  <div class="co">شركة باب المشاريع</div>
  <div class="ca">بغداد</div>
</div>
<div class="title">${tab==="in"?"🧾 إيصال استلام":"🧾 إيصال صرف"}</div>
<div class="amount">${tab==="in"?"+":"-"}${fNum(amt)} ${isDol?"$":"د.ع"}</div>
<div style="font-size:12px;color:#64748B;text-align:center;margin-bottom:12px">
  ${w2(amt)} ${isDol?"دولار أمريكي":"دينار عراقي"}
</div>
<div class="row"><span class="lbl">المشروع</span><span class="val">${proj.name}</span></div>
<div class="row"><span class="lbl">${tab==="in"?"المستلم":"صُرف على"}</span><span class="val">${form.receiver}</span></div>
<div class="row"><span class="lbl">التاريخ</span><span class="val">${form.date}</span></div>
${form.note?`<div class="row"><span class="lbl">ملاحظة</span><span class="val">${form.note}</span></div>`:""}
<div class="footer">طُبع: ${new Date().toISOString().split("T")[0]}</div>
</body></html>`;
                  const w = window.open("","_blank","width=500,height=600");
                  if(!w){alert("السماح بالنوافذ المنبثقة");return;}
                  w.document.write(html);w.document.close();w.focus();
                  setTimeout(()=>w.print(),600);
                }} style={{ border: "none", borderRadius: 10, padding: "13px 14px",
                  background: "#F0F9FF", border: "1px solid #0EA5E9",
                  color: "#0EA5E9", cursor: "pointer", fontSize: 13,
                  fontFamily: "Tahoma", fontWeight: 700, whiteSpace: "nowrap" }}>
                  🖨️ إيصال
                </button>
              )}
            </div>
          </div>
        )}

        {/* قائمة الحركات */}
        {(tab === "in" ? inTxs : outTxs).length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: "#94A3B8",
            background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0" }}>
            {tab === "in" ? "ما في مبالغ مستلمة بعد" : "ما في مبالغ مصروفة بعد"}
          </div>
        ) : (
          (tab === "in" ? inTxs : outTxs).map(t => (
            <div key={t.id} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px",
              marginBottom: 10, border: "1px solid #E2E8F0",
              borderRight: "5px solid " + (tab === "in" ? "#16A34A" : "#DC2626") }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  {/* المبلغ + العملة */}
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4,
                    color: tab === "in" ? "#16A34A" : "#DC2626" }}>
                    {tab === "in" ? "↓ " : "↑ "}
                    {fNum(t.amount)} {t.currency === "دينار" ? "د.ع" : "$"}
                  </div>
                  {/* كتابة */}
                  <div style={{ fontSize: 11, color: "#64748B", marginBottom: 6 }}>
                    ✍️ {w2(t.amount)} {t.currency === "دينار" ? "دينار" : "دولار"}
                  </div>
                  {/* العملة badge */}
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px",
                    borderRadius: 20, marginBottom: 6, display: "inline-block",
                    background: t.currency === "دينار" ? "#F0FDF4" : "#EFF6FF",
                    color: t.currency === "دينار" ? "#16A34A" : "#2563EB" }}>
                    {t.currency === "دينار" ? "🇮🇶 دينار" : "🇺🇸 دولار"}
                  </span>
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 12, color: "#1E293B", fontWeight: 600 }}>
                      👤 {t.receiver}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 3 }}>
                      📅 {t.date}
                    </div>
                    {t.note && (
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 4,
                        background: "#F8FAFC", borderRadius: 7, padding: "5px 8px" }}>
                        📝 {t.note}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => deleteTx(t.id)} style={{
                  background: "none", border: "none", color: "#DC2626",
                  cursor: "pointer", fontSize: 13, fontFamily: "Tahoma",
                  fontWeight: 600, marginRight: 8
                }}>🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── شاشة إنهاء وتوزيع الأرباح ───────────────────────────

export default ProjectDetail;
