import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, addDoc, setDoc, deleteDoc,
         onSnapshot, query, orderBy } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyD_h8oJKVRpzfhi47q-EAsK1Ct_mRT5CIw",
  authDomain: "hisab-app-e4616.firebaseapp.com",
  projectId: "hisab-app-e4616",
});
const db = getFirestore(app);

// ══════════════════════════════════════════
// الصناديق الثمانية — ثابتة
// ══════════════════════════════════════════
const FUNDS = [
  { id:"capital",     name:"صندوق رأس المال",      icon:"ti-safe",          color:"#1C1410", bg:"#F4F2EE" },
  { id:"general",     name:"الصندوق العام",         icon:"ti-building-bank", color:"#1E40AF", bg:"#EFF6FF" },
  { id:"decor",       name:"صندوق الديكور",         icon:"ti-palette",       color:"#6B21A8", bg:"#F5F3FF" },
  { id:"contracting", name:"صندوق المقاولات",       icon:"ti-building",      color:"#92400E", bg:"#FFF7ED" },
  { id:"facades",     name:"صندوق الواجهات",        icon:"ti-layers",        color:"#0f766e", bg:"#F0FDF9" },
  { id:"engineering", name:"صندوق أعمال هندسية",   icon:"ti-ruler-2",       color:"#1E40AF", bg:"#EFF6FF" },
  { id:"trade",       name:"صندوق التجارة",          icon:"ti-briefcase",     color:"#166534", bg:"#F0FDF4" },
  { id:"partners",    name:"صندوق أرباح الشركاء",  icon:"ti-users",         color:"#991B1B", bg:"#FEF2F2" },
];

// ══════════════════════════════════════════
// مساعدات
// ══════════════════════════════════════════
const toAr  = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
const fmtD  = n => toAr(Math.abs(Math.round(n||0)).toLocaleString("ar-IQ")) + " د.ع";
const today = () => new Date().toISOString().split("T")[0];

// ══════════════════════════════════════════
// App
// ══════════════════════════════════════════
export default function App() {
  const [sel,      setSel]      = useState(null);   // الصندوق المفتوح
  const [loading,  setLoading]  = useState(true);
  const [balances, setBalances] = useState({});      // { fundId: number }
  const [txs,      setTxs]      = useState([]);      // كل المعاملات

  // تحميل Tabler Icons
  useEffect(() => {
    if(!document.querySelector("#tab-icons")) {
      const l = document.createElement("link");
      l.id   = "tab-icons";
      l.rel  = "stylesheet";
      l.href = "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css";
      document.head.appendChild(l);
    }
  }, []);

  // Firebase listeners
  useEffect(() => {
    const u = [];
    const to = setTimeout(() => setLoading(false), 6000);

    // أرصدة الصناديق
    u.push(onSnapshot(collection(db, "fund_balances"), s => {
      const b = {};
      s.docs.forEach(d => { b[d.id] = d.data().balance || 0; });
      setBalances(b);
      setLoading(false);
    }, () => setLoading(false)));

    // معاملات الصناديق
    u.push(onSnapshot(
      query(collection(db, "fund_transactions"), orderBy("date", "desc")),
      s => setTxs(s.docs.map(d => ({ id: d.id, ...d.data() })))
    ));

    return () => { u.forEach(f => f()); clearTimeout(to); };
  }, []);

  // إضافة معاملة لصندوق
  const addTx = async (fundId, type, amount, note, date) => {
    const amt = Number(amount);
    if(!amt || amt <= 0) return;
    const cur = balances[fundId] || 0;
    const newBal = type === "إيداع" ? cur + amt : cur - amt;
    // تحديث الرصيد
    await setDoc(doc(db, "fund_balances", fundId), { balance: newBal }, { merge: true });
    // تسجيل المعاملة
    await addDoc(collection(db, "fund_transactions"), {
      fundId, fundName: FUNDS.find(f => f.id === fundId)?.name || "",
      type, amount: amt,
      note: note || "",
      date: date || today(),
      balanceAfter: newBal,
      createdAt: new Date().toISOString(),
    });
  };

  const deleteTx = async tx => {
    if(!window.confirm("تحذف هذه المعاملة؟")) return;
    // عكس تأثير المعاملة على الرصيد
    const cur = balances[tx.fundId] || 0;
    const newBal = tx.type === "إيداع" ? cur - tx.amount : cur + tx.amount;
    await setDoc(doc(db, "fund_balances", tx.fundId), { balance: newBal }, { merge: true });
    await deleteDoc(doc(db, "fund_transactions", tx.id));
  };

  if(loading) return (
    <div style={{minHeight:"100vh",background:"#F4F2EE",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",gap:12,fontFamily:"Tahoma"}}>
      <div style={{fontSize:52}}>🏦</div>
      <div style={{fontSize:22,fontWeight:700,color:"#1C1410"}}>الصناديق</div>
      <div style={{fontSize:13,color:"#8A7060"}}>جاري التحميل...</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#F4F2EE",fontFamily:"Tahoma,Arial,sans-serif",direction:"rtl",color:"#1C1410"}}>

      {sel
        ? <FundDetail
            fund={FUNDS.find(f => f.id === sel)}
            balance={balances[sel] || 0}
            txs={txs.filter(t => t.fundId === sel)}
            onBack={() => setSel(null)}
            onAdd={(type, amt, note, date) => addTx(sel, type, amt, note, date)}
            onDelete={deleteTx}
          />
        : <FundsList
            funds={FUNDS}
            balances={balances}
            onSelect={setSel}
          />
      }
    </div>
  );
}

// ══════════════════════════════════════════
// قائمة الصناديق
// ══════════════════════════════════════════
function FundsList({ funds, balances, onSelect }) {
  const total = Object.values(balances).reduce((s, v) => s + v, 0);

  return (
    <div style={{maxWidth:680,margin:"0 auto",padding:24}}>

      {/* Header */}
      <div style={{marginBottom:28}}>
        <div style={{fontSize:26,fontWeight:700,color:"#1C1410",marginBottom:4}}>
          الصناديق المالية
        </div>
        <div style={{fontSize:13,color:"#8A7060"}}>
          إجمالي الأرصدة: <span style={{fontWeight:700,color:"#1C1410"}}>{fmtD(total)}</span>
        </div>
      </div>

      {/* الصناديق */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
        {funds.map(f => {
          const bal = balances[f.id] || 0;
          const isPos = bal >= 0;
          return (
            <button key={f.id} onClick={() => onSelect(f.id)} style={{
              background:"#fff",
              border:"1px solid #E5DDD4",
              borderRadius:16,
              padding:"20px 18px",
              cursor:"pointer",
              textAlign:"right",
              display:"flex",
              flexDirection:"column",
              gap:12,
              boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
              transition:"box-shadow 0.15s, transform 0.12s",
              borderTop:`3px solid ${f.color}`,
            }}
            onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.1)";e.currentTarget.style.transform="translateY(-2px)";}}
            onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.06)";e.currentTarget.style.transform="translateY(0)";}}>

              {/* أيقونة + الاسم */}
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{
                  width:40,height:40,borderRadius:11,
                  background:f.bg,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  flexShrink:0,
                }}>
                  <i className={`ti ${f.icon}`} style={{fontSize:20,color:f.color}} aria-hidden="true"/>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:"#1C1410",lineHeight:1.3}}>{f.name}</div>
              </div>

              {/* الرصيد */}
              <div>
                <div style={{fontSize:11,color:"#8A7060",marginBottom:3}}>الرصيد الحالي</div>
                <div style={{fontSize:22,fontWeight:700,color:isPos?"#166534":"#991B1B",letterSpacing:-0.5}}>
                  {isPos?"":"-"}{fmtD(bal)}
                </div>
              </div>

              {/* سهم الدخول */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{
                  fontSize:11,fontWeight:600,
                  color:isPos?"#166534":"#991B1B",
                  background:isPos?"rgba(22,101,52,0.08)":"rgba(153,27,27,0.08)",
                  padding:"3px 10px",borderRadius:20,
                }}>
                  {isPos?"موجب":"سالب"}
                </span>
                <i className="ti ti-arrow-left" style={{fontSize:16,color:"#8A7060"}} aria-hidden="true"/>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// تفاصيل صندوق
// ══════════════════════════════════════════
function FundDetail({ fund, balance, txs, onBack, onAdd, onDelete }) {
  const [form,   setForm]   = useState({ type:"إيداع", amount:"", note:"", date:today() });
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);

  const set   = k => v => setForm(f => ({ ...f, [k]: v }));
  const valid = Number(form.amount) > 0 && form.date;

  const save = async () => {
    if(!valid || saving) return;
    setSaving(true);
    await onAdd(form.type, form.amount, form.note, form.date);
    setSaving(false);
    setDone(true);
    setTimeout(() => {
      setDone(false);
      setForm({ type:"إيداع", amount:"", note:"", date:today() });
    }, 1400);
  };

  const totIn  = txs.filter(t => t.type === "إيداع").reduce((s, t) => s + t.amount, 0);
  const totOut = txs.filter(t => t.type === "سحب").reduce((s, t) => s + t.amount, 0);

  return (
    <div style={{maxWidth:620,margin:"0 auto",padding:24}}>

      {/* رجوع */}
      <button onClick={onBack} style={{
        background:"transparent",border:"1px solid #E5DDD4",borderRadius:10,
        padding:"8px 16px",fontSize:13,color:"#8A7060",cursor:"pointer",
        marginBottom:20,fontFamily:"Tahoma",display:"flex",alignItems:"center",gap:6,
      }}>
        <i className="ti ti-arrow-right" aria-hidden="true"/>
        رجوع للصناديق
      </button>

      {/* Header الصندوق */}
      <div style={{
        background:"#1C1410",borderRadius:20,padding:24,marginBottom:16,color:"#fff",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <div style={{
            width:48,height:48,borderRadius:14,
            background:fund.bg,
            display:"flex",alignItems:"center",justifyContent:"center",
          }}>
            <i className={`ti ${fund.icon}`} style={{fontSize:24,color:fund.color}} aria-hidden="true"/>
          </div>
          <div>
            <div style={{fontSize:18,fontWeight:700,color:"#fff"}}>{fund.name}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",marginTop:2}}>كشف الحساب</div>
          </div>
        </div>

        {/* الرصيد الكبير */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginBottom:4}}>الرصيد الحالي</div>
          <div style={{fontSize:34,fontWeight:700,letterSpacing:-1,
            color:balance>=0?"#4ade80":"#f87171"}}>
            {balance>=0?"":"-"}{fmtD(balance)}
          </div>
        </div>

        {/* إيداع / سحب */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{background:"rgba(255,255,255,0.07)",borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:4}}>↓ إجمالي الإيداع</div>
            <div style={{fontSize:16,fontWeight:700,color:"#4ade80"}}>{fmtD(totIn)}</div>
          </div>
          <div style={{background:"rgba(255,255,255,0.07)",borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:4}}>↑ إجمالي السحب</div>
            <div style={{fontSize:16,fontWeight:700,color:"#f87171"}}>{fmtD(totOut)}</div>
          </div>
        </div>
      </div>

      {/* نموذج معاملة جديدة */}
      <div style={{background:"#fff",border:"1px solid #E5DDD4",borderRadius:16,padding:18,marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:700,color:"#1C1410",marginBottom:14}}>معاملة جديدة</div>

        {done ? (
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:40,marginBottom:6}}>✅</div>
            <div style={{fontWeight:700,color:"#166534"}}>تم التسجيل</div>
          </div>
        ) : (
          <>
            {/* إيداع / سحب */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
              {["إيداع","سحب"].map(t => (
                <button key={t} onClick={() => set("type")(t)} style={{
                  padding:"12px",borderRadius:10,border:"1.5px solid",cursor:"pointer",
                  fontFamily:"Tahoma",fontSize:14,fontWeight:700,
                  background:form.type===t?(t==="إيداع"?"rgba(22,101,52,0.1)":"rgba(153,27,27,0.1)"):"transparent",
                  color:form.type===t?(t==="إيداع"?"#166534":"#991B1B"):"#8A7060",
                  borderColor:form.type===t?(t==="إيداع"?"#166534":"#991B1B"):"#E5DDD4",
                }}>
                  {t === "إيداع" ? "↓ إيداع" : "↑ سحب"}
                </button>
              ))}
            </div>

            {/* المبلغ */}
            <div style={{fontSize:11,color:"#8A7060",marginBottom:5}}>المبلغ</div>
            <input
              style={{width:"100%",border:"1px solid #E5DDD4",borderRadius:10,padding:"12px 14px",
                fontSize:22,fontWeight:700,textAlign:"center",background:"#F4F2EE",
                color:"#1C1410",outline:"none",boxSizing:"border-box",marginBottom:12,fontFamily:"Tahoma"}}
              type="number" placeholder="٠"
              value={form.amount} onChange={e => set("amount")(e.target.value)}
              autoFocus
            />

            {/* التاريخ */}
            <div style={{fontSize:11,color:"#8A7060",marginBottom:5}}>التاريخ</div>
            <input
              style={{width:"100%",border:"1px solid #E5DDD4",borderRadius:10,padding:"12px 14px",
                fontSize:14,background:"#F4F2EE",color:"#1C1410",outline:"none",
                boxSizing:"border-box",marginBottom:12,fontFamily:"Tahoma",direction:"rtl"}}
              type="date" value={form.date}
              onChange={e => set("date")(e.target.value)}
            />

            {/* ملاحظة */}
            <div style={{fontSize:11,color:"#8A7060",marginBottom:5}}>ملاحظة (اختياري)</div>
            <input
              style={{width:"100%",border:"1px solid #E5DDD4",borderRadius:10,padding:"12px 14px",
                fontSize:14,background:"#F4F2EE",color:"#1C1410",outline:"none",
                boxSizing:"border-box",marginBottom:16,fontFamily:"Tahoma",direction:"rtl"}}
              placeholder="..."
              value={form.note} onChange={e => set("note")(e.target.value)}
            />

            <button onClick={save} disabled={!valid||saving} style={{
              width:"100%",border:"none",borderRadius:12,padding:"14px",fontSize:15,
              fontWeight:700,cursor:valid?"pointer":"not-allowed",fontFamily:"Tahoma",
              background:valid?(form.type==="إيداع"?"#166534":"#991B1B"):"#E5DDD4",
              color:valid?"#fff":"#8A7060",
            }}>
              {saving ? "جاري الحفظ..." : (form.type==="إيداع"?"↓ تأكيد الإيداع":"↑ تأكيد السحب")}
            </button>
          </>
        )}
      </div>

      {/* سجل المعاملات */}
      <div style={{fontSize:14,fontWeight:700,color:"#1C1410",marginBottom:12}}>
        سجل المعاملات ({toAr(txs.length)})
      </div>

      {txs.length === 0 ? (
        <div style={{textAlign:"center",padding:"40px 20px",color:"#8A7060",background:"#fff",
          borderRadius:16,border:"1px solid #E5DDD4"}}>
          <div style={{fontSize:36,marginBottom:8}}>📋</div>
          <div>ما في معاملات بعد</div>
        </div>
      ) : txs.map(t => (
        <div key={t.id} style={{
          background:"#fff",border:"1px solid #E5DDD4",borderRadius:14,
          padding:"14px 16px",marginBottom:10,
        }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div>
              <div style={{
                display:"inline-flex",alignItems:"center",gap:5,
                fontSize:12,fontWeight:700,
                color:t.type==="إيداع"?"#166534":"#991B1B",
                background:t.type==="إيداع"?"rgba(22,101,52,0.08)":"rgba(153,27,27,0.08)",
                padding:"3px 10px",borderRadius:20,marginBottom:6,
              }}>
                {t.type==="إيداع"?"↓":"↑"} {t.type}
              </div>
              <div style={{fontSize:12,color:"#8A7060"}}>📅 {t.date}</div>
              {t.note&&<div style={{fontSize:13,color:"#1C1410",marginTop:4}}>{t.note}</div>}
            </div>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:18,fontWeight:700,
                color:t.type==="إيداع"?"#166534":"#991B1B"}}>
                {t.type==="إيداع"?"+":"-"}{fmtD(t.amount)}
              </div>
              {t.balanceAfter!==undefined&&(
                <div style={{fontSize:11,color:"#8A7060",marginTop:3}}>
                  رصيد: {fmtD(t.balanceAfter)}
                </div>
              )}
            </div>
          </div>
          <button onClick={() => onDelete(t)} style={{
            background:"transparent",border:"none",color:"#991B1B",
            fontSize:12,cursor:"pointer",padding:"4px 0",fontWeight:600,fontFamily:"Tahoma",
          }}>🗑️ حذف</button>
        </div>
      ))}
    </div>
  );
}
