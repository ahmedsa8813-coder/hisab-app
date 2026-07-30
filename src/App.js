import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, addDoc, deleteDoc,
         onSnapshot, query, orderBy, limit } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyD_h8oJKVRpzfhi47q-EAsK1Ct_mRT5CIw",
  authDomain: "hisab-app-e4616.firebaseapp.com",
  projectId: "hisab-app-e4616",
});
const db = getFirestore(app);

// ══════════ ثوابت ══════════
const C = {
  bg:     "#F7F4EF",
  card:   "#FFFFFF",
  border: "#E5DDD4",
  text:   "#1C1410",
  muted:  "#8A7060",
  gold:   "#B8860B",
  green:  "#166534",
  red:    "#991B1B",
  blue:   "#1E40AF",
  purple: "#6B21A8",
};

const toAr  = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
const today = () => new Date().toISOString().split("T")[0];
const fmtD  = n => toAr(Math.abs(Math.round(n||0)).toLocaleString("ar-IQ")) + " د.ع";
const fmt   = (n, c) => toAr(Math.abs(Math.round(n||0)).toLocaleString("ar-IQ")) + (c==="دولار"?" $":" د.ع");

// ══════════ مكونات مشتركة ══════════
const Lbl = ({children}) => (
  <div style={{fontSize:12,color:C.muted,fontWeight:700,marginBottom:6}}>{children}</div>
);

const BackBtn = ({onClick}) => (
  <button onClick={onClick} style={{
    background:"transparent",border:`1px solid ${C.border}`,
    borderRadius:10,padding:"8px 16px",fontSize:13,
    color:C.muted,cursor:"pointer",fontFamily:"Tahoma",
  }}>← رجوع</button>
);

const Empty = ({icon,text}) => (
  <div style={{textAlign:"center",padding:"60px 20px",color:C.muted}}>
    <div style={{fontSize:48,marginBottom:10}}>{icon}</div>
    <div style={{fontWeight:600,fontSize:15}}>{text}</div>
  </div>
);

const S = {
  inp: {width:"100%",border:`1px solid ${C.border}`,borderRadius:10,
        padding:"12px 14px",fontSize:15,background:C.bg,color:C.text,
        outline:"none",boxSizing:"border-box",fontFamily:"Tahoma",direction:"rtl"},
  sel: {width:"100%",border:`1px solid ${C.border}`,borderRadius:10,
        padding:"12px 14px",fontSize:14,background:C.bg,color:C.text,
        outline:"none",boxSizing:"border-box",direction:"rtl"},
  btn: {border:"none",borderRadius:12,padding:"14px 20px",fontSize:15,
        fontWeight:700,cursor:"pointer",fontFamily:"Tahoma",width:"100%"},
  card:{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,
        padding:16,marginBottom:12,boxShadow:"0 1px 6px rgba(0,0,0,0.05)"},
};

// ══════════ مساعد: تحويل رقم لكلمات ══════════
function numToWords(n) {
  if(!n||isNaN(n)) return "";
  const num = Math.floor(Math.abs(Number(n)));
  if(num===0) return "صفر";
  const ones = ["","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة",
    "عشرة","أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر",
    "ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"];
  const tens = ["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"];
  const hundreds = ["","مئة","مئتان","ثلاثمئة","أربعمئة","خمسمئة","ستمئة","سبعمئة","ثمانمئة","تسعمئة"];
  const readGroup = g => {
    if(g===0) return "";
    if(g<20) return ones[g];
    if(g<100) return tens[Math.floor(g/10)]+(g%10?" و"+ones[g%10]:"");
    return hundreds[Math.floor(g/100)]+(g%100?" و"+readGroup(g%100):"");
  };
  const parts = [];
  if(num>=1000000000) parts.push(readGroup(Math.floor(num/1000000000))+" مليار");
  if(num%1000000000>=1000000) parts.push(readGroup(Math.floor((num%1000000000)/1000000))+" مليون");
  if(num%1000000>=1000) parts.push(readGroup(Math.floor((num%1000000)/1000))+" ألف");
  if(num%1000>0) parts.push(readGroup(num%1000));
  return parts.join(" و");
}

// رقم المعاملة: YYYYMMDD-XXX
function genTxId() {
  const d = new Date();
  const ymd = d.getFullYear().toString() +
    String(d.getMonth()+1).padStart(2,"0") +
    String(d.getDate()).padStart(2,"0");
  const rand = String(Math.floor(Math.random()*900)+100);
  return `${ymd}-${rand}`;
}

// ══════════ صفحة الاستلام ══════════
function ReceivePage({receipts, projects, onAdd, onDelete}) {
  const [show,   setShow]   = useState(false);
  const [form,   setForm]   = useState({
    sourceType: "project",   // project | general
    projectId:  "",
    generalDesc:"",
    amount:     "",
    currency:   "دينار",
    exchRate:   "",
    note:       "",
    date:       today(),
  });
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);

  const set  = k => v => setForm(f=>({...f,[k]:v}));
  const proj = projects.find(p=>p.id===form.projectId);
  const amtNum = Number(form.amount)||0;
  const valid  = amtNum>0 && form.date &&
    (form.sourceType==="general"||form.projectId);

  const amtInDinar = form.currency==="دولار"
    ? amtNum * (Number(form.exchRate)||0)
    : amtNum;

  const save = async () => {
    if(!valid||saving) return;
    setSaving(true);
    await onAdd({
      txId:        genTxId(),
      type:        "استلام",
      sourceType:  form.sourceType,
      projectId:   form.sourceType==="project"?form.projectId:"",
      projectName: form.sourceType==="project"?(proj?.name||""):"",
      generalDesc: form.sourceType==="general"?form.generalDesc:"",
      amount:      amtNum,
      currency:    form.currency,
      exchRate:    form.currency==="دولار"?Number(form.exchRate)||0:0,
      amtInDinar:  amtInDinar,
      amtWords:    numToWords(amtNum)+" "+(form.currency==="دولار"?"دولار":"دينار"),
      note:        form.note,
      date:        form.date,
      createdAt:   new Date().toISOString(),
    });
    setSaving(false);
    setDone(true);
    setTimeout(()=>{
      setDone(false);
      setForm({sourceType:"project",projectId:"",generalDesc:"",amount:"",currency:"دينار",exchRate:"",note:"",date:today()});
      setShow(false);
    },1800);
  };

  const projName = id => projects.find(p=>p.id===id)?.name||"";
  const totalDin = receipts.filter(r=>r.currency==="دينار"||!r.currency).reduce((s,r)=>s+r.amount,0);
  const totalDol = receipts.filter(r=>r.currency==="دولار").reduce((s,r)=>s+r.amount,0);

  return (
    <div style={{padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:800,color:C.green}}>↓ الاستلامات</div>
        <button onClick={()=>setShow(v=>!v)} style={{
          ...S.btn,width:"auto",padding:"10px 20px",
          background:C.green,color:"#fff",fontSize:14,
        }}>{show?"✕ إغلاق":"+ إضافة"}</button>
      </div>

      {/* إجمالي */}
      <div style={{background:"linear-gradient(135deg,#14532d,#166534)",borderRadius:18,padding:20,marginBottom:16,color:"#fff",boxShadow:"0 4px 20px rgba(22,101,52,0.25)"}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginBottom:4}}>إجمالي الاستلام</div>
        <div style={{fontSize:30,fontWeight:900,letterSpacing:-1}}>{fmtD(totalDin)}</div>
        {totalDol>0&&<div style={{fontSize:15,color:"#86efac",fontWeight:700,marginTop:4}}>+ {toAr(totalDol)} $</div>}
        <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginTop:6}}>{toAr(receipts.length)} معاملة</div>
      </div>

      {/* نموذج الإضافة */}
      {show&&(
        <div style={{...S.card,marginBottom:16,border:`1.5px solid ${C.green}40`}}>
          {done?(
            <div style={{textAlign:"center",padding:"28px 0"}}>
              <div style={{fontSize:48,marginBottom:8}}>✅</div>
              <div style={{fontWeight:800,fontSize:17,color:C.green}}>تم التسجيل بنجاح</div>
            </div>
          ):(
            <>
              {/* نوع المصدر */}
              <Lbl>مصدر الاستلام</Lbl>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                {[["project","🏗️ من مشروع"],["general","📦 عام / متنوع"]].map(([v,l])=>(
                  <button key={v} onClick={()=>set("sourceType")(v)} style={{
                    ...S.btn,padding:"12px 8px",fontSize:13,
                    background:form.sourceType===v?C.green+"18":"transparent",
                    color:form.sourceType===v?C.green:C.muted,
                    border:`1.5px solid ${form.sourceType===v?C.green:C.border}`,
                  }}>{l}</button>
                ))}
              </div>

              {/* من مشروع */}
              {form.sourceType==="project"&&(
                <>
                  <Lbl>اختر المشروع</Lbl>
                  <select style={{...S.sel,marginBottom:14}}
                    value={form.projectId} onChange={e=>set("projectId")(e.target.value)}>
                    <option value="">— اختر مشروع —</option>
                    {projects.map(p=><option key={p.id} value={p.id}>🏗️ {p.name}</option>)}
                  </select>
                </>
              )}

              {/* مصدر عام */}
              {form.sourceType==="general"&&(
                <>
                  <Lbl>وصف المصدر</Lbl>
                  <input style={{...S.inp,marginBottom:14}}
                    placeholder="مثال: تحصيل دين، بيع مواد..."
                    value={form.generalDesc} onChange={e=>set("generalDesc")(e.target.value)} autoFocus/>
                </>
              )}

              {/* المبلغ والعملة */}
              <Lbl>المبلغ والعملة</Lbl>
              <div style={{display:"flex",gap:8,marginBottom:6}}>
                <input style={{...S.inp,flex:2,fontSize:22,fontWeight:800,textAlign:"center"}}
                  type="number" placeholder="٠"
                  value={form.amount} onChange={e=>set("amount")(e.target.value)}/>
                <select style={{...S.sel,flex:1}}
                  value={form.currency} onChange={e=>set("currency")(e.target.value)}>
                  <option value="دينار">🇮🇶 دينار</option>
                  <option value="دولار">🇺🇸 دولار</option>
                </select>
              </div>

              {/* المبلغ كتابةً */}
              {amtNum>0&&(
                <div style={{fontSize:12,color:C.green,fontWeight:600,
                  marginBottom:14,padding:"8px 12px",background:"rgba(22,101,52,0.06)",
                  borderRadius:8,border:`1px solid rgba(22,101,52,0.15)`}}>
                  ✍️ {numToWords(amtNum)} {form.currency==="دولار"?"دولار":"دينار"}
                </div>
              )}

              {/* سعر الصرف — فقط للدولار */}
              {form.currency==="دولار"&&(
                <>
                  <Lbl>سعر الصرف (دينار للدولار)</Lbl>
                  <input style={{...S.inp,marginBottom:6}}
                    type="number" placeholder="مثال: 1500"
                    value={form.exchRate} onChange={e=>set("exchRate")(e.target.value)}/>
                  {amtNum>0&&Number(form.exchRate)>0&&(
                    <div style={{fontSize:12,color:C.blue,fontWeight:600,
                      marginBottom:14,padding:"8px 12px",background:"rgba(30,64,175,0.06)",
                      borderRadius:8,border:`1px solid rgba(30,64,175,0.15)`}}>
                      💱 يعادل: {fmtD(amtInDinar)}
                    </div>
                  )}
                </>
              )}

              {/* التاريخ */}
              <Lbl>التاريخ</Lbl>
              <input style={{...S.inp,marginBottom:14}}
                type="date" value={form.date}
                onChange={e=>set("date")(e.target.value)}/>

              {/* ملاحظة */}
              <Lbl>ملاحظة (اختياري)</Lbl>
              <input style={{...S.inp,marginBottom:18}}
                placeholder="..." value={form.note}
                onChange={e=>set("note")(e.target.value)}/>

              <button onClick={save} disabled={!valid||saving} style={{
                ...S.btn,
                background:valid?C.green:C.border,
                color:valid?"#fff":C.muted,
                fontSize:16,
              }}>{saving?"جاري الحفظ...":"✅ تأكيد وحفظ"}</button>
            </>
          )}
        </div>
      )}

      {/* القائمة */}
      {receipts.length===0
        ?<Empty icon="📥" text="ما في استلامات بعد"/>
        :receipts.map(r=>(
          <div key={r.id} style={S.card}>
            {/* رقم المعاملة */}
            {r.txId&&(
              <div style={{fontSize:10,color:C.muted,fontWeight:600,marginBottom:6,
                fontFamily:"monospace",letterSpacing:1}}>#{r.txId}</div>
            )}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div style={{flex:1,marginLeft:10}}>
                {/* المصدر */}
                <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:2}}>
                  {r.sourceType==="project"&&r.projectId
                    ? `🏗️ ${projName(r.projectId)||r.projectName||"مشروع"}`
                    : `📦 ${r.generalDesc||r.source||"عام"}`}
                </div>
                {/* المبلغ كتابةً */}
                {r.amtWords&&(
                  <div style={{fontSize:11,color:C.muted,marginBottom:2}}>{r.amtWords}</div>
                )}
                <div style={{fontSize:11,color:C.muted}}>📅 {r.date}</div>
                {r.note&&<div style={{fontSize:12,color:C.text,marginTop:3}}>{r.note}</div>}
                {/* معادل الدينار */}
                {r.currency==="دولار"&&r.amtInDinar>0&&(
                  <div style={{fontSize:11,color:C.blue,marginTop:3}}>
                    💱 {fmtD(r.amtInDinar)} (بسعر {toAr(r.exchRate||0)})
                  </div>
                )}
              </div>
              <div style={{fontWeight:900,fontSize:17,color:C.green,
                background:"rgba(22,101,52,0.08)",padding:"5px 12px",
                borderRadius:14,flexShrink:0}}>
                +{fmt(r.amount,r.currency)}
              </div>
            </div>
            <button onClick={()=>{if(window.confirm("تحذف هذا الاستلام؟"))onDelete(r.id);}}
              style={{background:"transparent",border:"none",color:C.red,
                fontSize:12,cursor:"pointer",padding:"4px 0",fontWeight:600}}>
              🗑️ حذف
            </button>
          </div>
        ))
      }
    </div>
  );
}

// ══════════ صفحة المصروف ══════════
function SpendPage({spends, projects, onAdd, onDelete}) {
  const [show,   setShow]   = useState(false);
  const [form,   setForm]   = useState({projectId:"",dest:"",amount:"",currency:"دينار",note:"",date:today()});
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);

  const set = k => v => setForm(f=>({...f,[k]:v}));
  const valid = form.amount && Number(form.amount) > 0;

  const save = async () => {
    if(!valid||saving) return;
    setSaving(true);
    const proj = projects.find(p=>p.id===form.projectId);
    await onAdd({type:"صرف",amount:Number(form.amount),currency:form.currency,
      projectId:form.projectId||"",projectName:proj?.name||"",
      dest:form.dest||proj?.name||"عام",note:form.note,date:form.date,createdAt:new Date().toISOString()});
    setSaving(false);
    setDone(true);
    setTimeout(()=>{setDone(false);setForm({projectId:"",dest:"",amount:"",currency:"دينار",note:"",date:today()});setShow(false);},1500);
  };

  const projName = id => projects.find(p=>p.id===id)?.name;
  const total = spends.filter(s=>s.currency==="دينار"||!s.currency).reduce((s,r)=>s+r.amount,0);

  return (
    <div style={{padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:800,color:C.red}}>↑ المصروفات</div>
        <button onClick={()=>setShow(v=>!v)} style={{...S.btn,width:"auto",padding:"10px 20px",background:C.red,color:"#fff",fontSize:14}}>
          {show?"✕ إغلاق":"+ إضافة"}
        </button>
      </div>

      <div style={{background:"linear-gradient(135deg,#7f1d1d,#991b1b)",borderRadius:18,padding:20,marginBottom:16,color:"#fff",boxShadow:"0 4px 20px rgba(153,27,27,0.25)"}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginBottom:4}}>إجمالي الصرف</div>
        <div style={{fontSize:30,fontWeight:900,letterSpacing:-1}}>{fmtD(total)}</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginTop:6}}>{toAr(spends.length)} معاملة</div>
      </div>

      {show&&(
        <div style={{...S.card,marginBottom:16,border:`1.5px solid ${C.red}40`}}>
          {done?(
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:36,marginBottom:6}}>✅</div>
              <div style={{fontWeight:700,color:C.red}}>تم التسجيل</div>
            </div>
          ):(
            <>
              <Lbl>المشروع (اختياري)</Lbl>
              <select style={{...S.sel,marginBottom:12}} value={form.projectId} onChange={e=>set("projectId")(e.target.value)}>
                <option value="">📦 بدون مشروع</option>
                {projects.map(p=><option key={p.id} value={p.id}>🏗️ {p.name}</option>)}
              </select>
              <Lbl>الوجهة / الوصف</Lbl>
              <input style={{...S.inp,marginBottom:12}} placeholder="مثال: مواد بناء، رواتب..." value={form.dest} onChange={e=>set("dest")(e.target.value)} autoFocus/>
              <Lbl>المبلغ</Lbl>
              <div style={{display:"flex",gap:8,marginBottom:12}}>
                <input style={{...S.inp,flex:2,fontSize:20,fontWeight:800,textAlign:"center"}} type="number" placeholder="٠" value={form.amount} onChange={e=>set("amount")(e.target.value)}/>
                <select style={{...S.sel,flex:1}} value={form.currency} onChange={e=>set("currency")(e.target.value)}>
                  <option value="دينار">🇮🇶 دينار</option>
                  <option value="دولار">🇺🇸 دولار</option>
                </select>
              </div>
              <Lbl>ملاحظة</Lbl>
              <input style={{...S.inp,marginBottom:12}} placeholder="..." value={form.note} onChange={e=>set("note")(e.target.value)}/>
              <Lbl>التاريخ</Lbl>
              <input style={{...S.inp,marginBottom:16}} type="date" value={form.date} onChange={e=>set("date")(e.target.value)}/>
              <button onClick={save} disabled={!valid||saving} style={{...S.btn,background:valid?C.red:C.border,color:valid?"#fff":C.muted}}>
                {saving?"جاري الحفظ...":"✅ تأكيد وحفظ"}
              </button>
            </>
          )}
        </div>
      )}

      {spends.length===0?<Empty icon="📤" text="ما في مصروفات بعد"/>:
        spends.map(r=>(
          <div key={r.id} style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:13,color:C.muted,marginBottom:2}}>
                  {r.projectId&&projName(r.projectId)?`🏗️ ${projName(r.projectId)}`:""} {r.dest||"عام"}
                </div>
                <div style={{fontSize:12,color:C.muted}}>📅 {r.date}</div>
                {r.note&&<div style={{fontSize:13,color:C.text,marginTop:3}}>{r.note}</div>}
              </div>
              <div style={{fontWeight:900,fontSize:17,color:C.red,background:"rgba(153,27,27,0.08)",padding:"4px 12px",borderRadius:16}}>
                -{fmt(r.amount,r.currency)}
              </div>
            </div>
            <button onClick={()=>{if(window.confirm("تحذف؟"))onDelete(r.id);}} style={{background:"transparent",border:"none",color:C.red,fontSize:12,cursor:"pointer",padding:"6px 0",fontWeight:600}}>🗑️ حذف</button>
          </div>
        ))
      }
    </div>
  );
}

// ══════════ صفحة التقرير ══════════
function ReportPage({receipts, spends}) {
  const totR = receipts.filter(r=>r.currency==="دينار"||!r.currency).reduce((s,r)=>s+r.amount,0);
  const totS = spends.filter(s=>s.currency==="دينار"||!s.currency).reduce((s,r)=>s+r.amount,0);
  const net  = totR - totS;

  const print = () => {
    const ar = n => String(Math.round(n||0)).replace(/\B(?=(\d{3})+(?!\d))/g,",");
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
<title>تقرير مالي</title>
<style>body{font-family:Tahoma;padding:24px;direction:rtl;color:#1C1410}
h1{color:#B8860B;font-size:20px;border-bottom:2px solid #B8860B;padding-bottom:8px}
.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #E5DDD4}
.g{color:#166534;font-weight:800}.r{color:#991B1B;font-weight:800}
.big{font-size:24px;font-weight:900}</style></head>
<body>
<h1>📊 التقرير المالي</h1>
<div style="font-size:12px;color:#8A7060;margin-bottom:16px">تاريخ: ${new Date().toLocaleDateString("ar-IQ")}</div>
<div class="row"><span>↓ إجمالي الاستلام</span><span class="g">${ar(totR)} د.ع</span></div>
<div class="row"><span>↑ إجمالي الصرف</span><span class="r">${ar(totS)} د.ع</span></div>
<div class="row" style="margin-top:8px;border-bottom:none">
  <span style="font-weight:800;font-size:16px">💰 صافي الرصيد</span>
  <span class="big ${net>=0?"g":"r"}">${ar(Math.abs(net))} د.ع</span>
</div>
<h1 style="margin-top:24px">↓ الاستلامات (${receipts.length})</h1>
<table style="width:100%;border-collapse:collapse;font-size:13px">
<thead><tr style="background:#1C1410;color:#fff"><th style="padding:8px;text-align:right">التاريخ</th><th style="padding:8px">المصدر</th><th style="padding:8px">المبلغ</th><th style="padding:8px">ملاحظة</th></tr></thead>
<tbody>${receipts.map(r=>`<tr><td style="padding:7px;border-bottom:1px solid #E5DDD4">${r.date}</td><td style="padding:7px;border-bottom:1px solid #E5DDD4">${r.source||"عام"}</td><td style="padding:7px;border-bottom:1px solid #E5DDD4;color:#166534;font-weight:700">${ar(r.amount)} ${r.currency==="دولار"?"$":"د.ع"}</td><td style="padding:7px;border-bottom:1px solid #E5DDD4;font-size:11px">${r.note||"—"}</td></tr>`).join("")}</tbody></table>
<h1 style="margin-top:24px">↑ المصروفات (${spends.length})</h1>
<table style="width:100%;border-collapse:collapse;font-size:13px">
<thead><tr style="background:#1C1410;color:#fff"><th style="padding:8px;text-align:right">التاريخ</th><th style="padding:8px">الوجهة</th><th style="padding:8px">المبلغ</th><th style="padding:8px">ملاحظة</th></tr></thead>
<tbody>${spends.map(r=>`<tr><td style="padding:7px;border-bottom:1px solid #E5DDD4">${r.date}</td><td style="padding:7px;border-bottom:1px solid #E5DDD4">${r.dest||"عام"}</td><td style="padding:7px;border-bottom:1px solid #E5DDD4;color:#991B1B;font-weight:700">${ar(r.amount)} ${r.currency==="دولار"?"$":"د.ع"}</td><td style="padding:7px;border-bottom:1px solid #E5DDD4;font-size:11px">${r.note||"—"}</td></tr>`).join("")}</tbody></table>
</body></html>`;
    const w=window.open("","_blank");w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);
  };

  return (
    <div style={{padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:800}}>📊 التقرير</div>
        <button onClick={print} style={{...S.btn,width:"auto",padding:"10px 18px",background:C.blue,color:"#fff",fontSize:14}}>🖨️ طباعة</button>
      </div>

      {/* الملخص */}
      <div style={{background:"linear-gradient(135deg,#0f2027,#1e3a5f)",borderRadius:18,padding:22,marginBottom:16,color:"#fff",boxShadow:"0 4px 24px rgba(0,0,0,0.2)"}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginBottom:4}}>💰 صافي الرصيد</div>
        <div style={{fontSize:34,fontWeight:900,letterSpacing:-1,color:net>=0?"#86efac":"#fca5a5",marginBottom:16}}>
          {net>=0?"+":"-"}{fmtD(net)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={{background:"rgba(255,255,255,0.08)",borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginBottom:4}}>↓ استلام</div>
            <div style={{fontSize:17,fontWeight:800,color:"#86efac"}}>{fmtD(totR)}</div>
          </div>
          <div style={{background:"rgba(255,255,255,0.08)",borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginBottom:4}}>↑ صرف</div>
            <div style={{fontSize:17,fontWeight:800,color:"#fca5a5"}}>{fmtD(totS)}</div>
          </div>
        </div>
      </div>

      {/* آخر الاستلامات */}
      {receipts.length>0&&(
        <>
          <div style={{fontSize:14,fontWeight:800,color:C.green,marginBottom:10}}>↓ آخر الاستلامات</div>
          {receipts.slice(0,5).map(r=>(
            <div key={r.id} style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:13,fontWeight:700}}>{r.source||"عام"}</div><div style={{fontSize:11,color:C.muted}}>📅 {r.date} {r.note&&"· "+r.note}</div></div>
              <div style={{fontWeight:800,color:C.green}}>+{fmt(r.amount,r.currency)}</div>
            </div>
          ))}
        </>
      )}

      {/* آخر المصروفات */}
      {spends.length>0&&(
        <>
          <div style={{fontSize:14,fontWeight:800,color:C.red,margin:"16px 0 10px"}}>↑ آخر المصروفات</div>
          {spends.slice(0,5).map(r=>(
            <div key={r.id} style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:13,fontWeight:700}}>{r.dest||"عام"}</div><div style={{fontSize:11,color:C.muted}}>📅 {r.date} {r.note&&"· "+r.note}</div></div>
              <div style={{fontWeight:800,color:C.red}}>-{fmt(r.amount,r.currency)}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ══════════ صفحة الرواتب ══════════
function SalaryPage({salaries, onAdd, onDelete}) {
  const [show,   setShow]   = useState(false);
  const [form,   setForm]   = useState({name:"",amount:"",currency:"دينار",note:"",date:today()});
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);

  const set = k => v => setForm(f=>({...f,[k]:v}));
  const valid = form.name && form.amount && Number(form.amount)>0;

  const save = async () => {
    if(!valid||saving) return;
    setSaving(true);
    await onAdd({name:form.name,amount:Number(form.amount),currency:form.currency,
      note:form.note,date:form.date,createdAt:new Date().toISOString()});
    setSaving(false);
    setDone(true);
    setTimeout(()=>{setDone(false);setForm({name:"",amount:"",currency:"دينار",note:"",date:today()});setShow(false);},1500);
  };

  const total = salaries.filter(s=>s.currency==="دينار"||!s.currency).reduce((s,r)=>s+r.amount,0);

  return (
    <div style={{padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:800,color:C.purple}}>💵 الرواتب</div>
        <button onClick={()=>setShow(v=>!v)} style={{...S.btn,width:"auto",padding:"10px 20px",background:C.purple,color:"#fff",fontSize:14}}>
          {show?"✕ إغلاق":"+ إضافة"}
        </button>
      </div>

      <div style={{background:"linear-gradient(135deg,#4a1d96,#6B21A8)",borderRadius:18,padding:20,marginBottom:16,color:"#fff",boxShadow:"0 4px 20px rgba(107,33,168,0.25)"}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginBottom:4}}>إجمالي الرواتب</div>
        <div style={{fontSize:30,fontWeight:900,letterSpacing:-1}}>{fmtD(total)}</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginTop:6}}>{toAr(salaries.length)} دفعة</div>
      </div>

      {show&&(
        <div style={{...S.card,marginBottom:16,border:`1.5px solid ${C.purple}40`}}>
          {done?(
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:36,marginBottom:6}}>✅</div>
              <div style={{fontWeight:700,color:C.purple}}>تم التسجيل</div>
            </div>
          ):(
            <>
              <Lbl>اسم الموظف</Lbl>
              <input style={{...S.inp,marginBottom:12}} placeholder="الاسم الكامل" value={form.name} onChange={e=>set("name")(e.target.value)} autoFocus/>
              <Lbl>المبلغ</Lbl>
              <div style={{display:"flex",gap:8,marginBottom:12}}>
                <input style={{...S.inp,flex:2,fontSize:20,fontWeight:800,textAlign:"center"}} type="number" placeholder="٠" value={form.amount} onChange={e=>set("amount")(e.target.value)}/>
                <select style={{...S.sel,flex:1}} value={form.currency} onChange={e=>set("currency")(e.target.value)}>
                  <option value="دينار">🇮🇶 دينار</option>
                  <option value="دولار">🇺🇸 دولار</option>
                </select>
              </div>
              <Lbl>ملاحظة</Lbl>
              <input style={{...S.inp,marginBottom:12}} placeholder="مثال: راتب شهر يناير" value={form.note} onChange={e=>set("note")(e.target.value)}/>
              <Lbl>التاريخ</Lbl>
              <input style={{...S.inp,marginBottom:16}} type="date" value={form.date} onChange={e=>set("date")(e.target.value)}/>
              <button onClick={save} disabled={!valid||saving} style={{...S.btn,background:valid?C.purple:C.border,color:valid?"#fff":C.muted}}>
                {saving?"جاري الحفظ...":"✅ تأكيد وحفظ"}
              </button>
            </>
          )}
        </div>
      )}

      {salaries.length===0?<Empty icon="💵" text="ما في رواتب بعد"/>:
        salaries.map(r=>(
          <div key={r.id} style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:2}}>{r.name}</div>
                <div style={{fontSize:12,color:C.muted}}>📅 {r.date}</div>
                {r.note&&<div style={{fontSize:13,color:C.text,marginTop:3}}>{r.note}</div>}
              </div>
              <div style={{fontWeight:900,fontSize:17,color:C.purple,background:"rgba(107,33,168,0.08)",padding:"4px 12px",borderRadius:16}}>
                {fmt(r.amount,r.currency)}
              </div>
            </div>
            <button onClick={()=>{if(window.confirm("تحذف؟"))onDelete(r.id);}} style={{background:"transparent",border:"none",color:C.red,fontSize:12,cursor:"pointer",padding:"6px 0",fontWeight:600}}>🗑️ حذف</button>
          </div>
        ))
      }
    </div>
  );
}

// ══════════ الشاشة الرئيسية ══════════
function HomePage({receipts, spends, salaries, onNavigate}) {
  const totR   = receipts.filter(r=>r.currency==="دينار"||!r.currency).reduce((s,r)=>s+r.amount,0);
  const totS   = spends.filter(r=>r.currency==="دينار"||!r.currency).reduce((s,r)=>s+r.amount,0);
  const totSal = salaries.filter(r=>r.currency==="دينار"||!r.currency).reduce((s,r)=>s+r.amount,0);
  const net    = totR - totS - totSal;

  const ACTIONS = [
    {id:"receive",  label:"استلام",  sub:"تسجيل دخل",    icon:"⬇",  bg:"#166534", shadow:"rgba(22,101,52,0.35)"},
    {id:"spend",    label:"مصروف",   sub:"تسجيل صرف",    icon:"⬆",  bg:"#991B1B", shadow:"rgba(153,27,27,0.35)"},
    {id:"projects", label:"المشاريع",sub:"إدارة مشاريع", icon:"🏗",  bg:"#92400E", shadow:"rgba(146,64,14,0.35)"},
    {id:"report",   label:"التقرير", sub:"ملخص مالي",    icon:"📊",  bg:"#1E40AF", shadow:"rgba(30,64,175,0.35)"},
    {id:"salary",   label:"الرواتب", sub:"دفع الرواتب",  icon:"💵",  bg:"#6B21A8", shadow:"rgba(107,33,168,0.35)"},
  ];

  return (
    <div style={{padding:20,paddingBottom:0}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <div>
          <div style={{fontSize:26,fontWeight:900,color:C.text,letterSpacing:-0.5}}>حساب</div>
          <div style={{fontSize:12,color:C.muted,fontWeight:600}}>النظام المالي</div>
        </div>
        <div style={{background:C.gold,width:42,height:42,borderRadius:13,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:20,boxShadow:`0 4px 14px rgba(184,134,11,0.4)`}}>
          📊
        </div>
      </div>

      {/* بطاقة الرصيد */}
      <div style={{
        background:"linear-gradient(145deg,#1a1a2e,#16213e,#0f3460)",
        borderRadius:22,padding:24,marginBottom:22,color:"#fff",
        boxShadow:"0 8px 32px rgba(0,0,0,0.25)",
        border:"1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.45)",fontWeight:700,
          letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>
          صافي الرصيد
        </div>
        <div style={{fontSize:38,fontWeight:900,letterSpacing:-1.5,
          color:net>=0?"#4ade80":"#f87171",marginBottom:20}}>
          {net>=0?"+":"-"}{fmtD(net)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[
            {l:"↓ استلام", v:totR,   c:"#4ade80"},
            {l:"↑ صرف",    v:totS,   c:"#f87171"},
            {l:"💵 رواتب", v:totSal, c:"#c084fc"},
          ].map(({l,v,c})=>(
            <div key={l} style={{
              background:"rgba(255,255,255,0.06)",
              borderRadius:14,padding:"11px 10px",textAlign:"center",
              border:"1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.45)",
                fontWeight:700,marginBottom:4}}>{l}</div>
              <div style={{fontSize:13,fontWeight:800,color:c}}>{fmtD(v)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* الأيقونات الرئيسية */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        {ACTIONS.map(a=>(
          <button key={a.id} onClick={()=>onNavigate(a.id)} style={{
            background:"#fff",
            border:`1.5px solid ${C.border}`,
            borderRadius:20,padding:"22px 16px 20px",
            cursor:"pointer",textAlign:"center",
            boxShadow:`0 4px 16px rgba(0,0,0,0.06)`,
            transition:"transform 0.12s, box-shadow 0.12s",
            outline:"none",
            // آخر زر يمتد للعرض كله لو عدد فردي
            gridColumn: a.id==="salary" && ACTIONS.length%2!==0 ? "1/-1" : "auto",
          }}
          onMouseDown={e=>e.currentTarget.style.transform="scale(0.97)"}
          onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
          onTouchStart={e=>e.currentTarget.style.transform="scale(0.97)"}
          onTouchEnd={e=>e.currentTarget.style.transform="scale(1)"}
          >
            {/* الأيقونة */}
            <div style={{
              width:62,height:62,borderRadius:18,
              background:a.bg,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:28,margin:"0 auto 14px",
              boxShadow:`0 6px 20px ${a.shadow}`,
            }}>
              <span style={{color:"#fff",fontWeight:900,fontSize:28,lineHeight:1}}>
                {a.icon}
              </span>
            </div>
            {/* النص */}
            <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:3}}>
              {a.label}
            </div>
            <div style={{fontSize:11,color:C.muted,fontWeight:600}}>
              {a.sub}
            </div>
          </button>
        ))}
      </div>

      {/* آخر المعاملات */}
      {(receipts.length>0||spends.length>0)&&(
        <>
          <div style={{fontSize:13,fontWeight:800,color:C.text,
            marginBottom:10,paddingBottom:8,
            borderBottom:`1px solid ${C.border}`}}>
            آخر المعاملات
          </div>
          {[
            ...receipts.slice(0,2).map(r=>({...r,_t:"r"})),
            ...spends.slice(0,2).map(r=>({...r,_t:"s"})),
          ].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,4).map((r,i)=>(
            <div key={i} style={{
              display:"flex",justifyContent:"space-between",
              alignItems:"center",padding:"11px 0",
              borderBottom:`1px solid ${C.border}`,
            }}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{
                  width:34,height:34,borderRadius:10,flexShrink:0,
                  background:r._t==="r"?"rgba(22,101,52,0.1)":"rgba(153,27,27,0.1)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:16,fontWeight:900,
                  color:r._t==="r"?C.green:C.red,
                }}>{r._t==="r"?"↓":"↑"}</div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>
                    {r.generalDesc||r.source||r.dest||"—"}
                  </div>
                  <div style={{fontSize:11,color:C.muted}}>📅 {r.date}</div>
                </div>
              </div>
              <div style={{fontWeight:800,fontSize:14,
                color:r._t==="r"?C.green:C.red}}>
                {r._t==="r"?"+":"-"}{fmt(r.amount,r.currency)}
              </div>
            </div>
          ))}
        </>
      )}

    </div>
  );
}

// ══════════ صفحة المشاريع ══════════
const PROJ_TYPES = ["مقاولات","واجهات","ديكور","عام"];

function ProjectsPage({projects, receipts, spends, onAdd, onDelete}) {
  const [sel,    setSel]    = useState(null);
  const [show,   setShow]   = useState(false);
  const [form,   setForm]   = useState({name:"",type:"مقاولات",contract:"",currency:"دينار"});
  const [saving, setSaving] = useState(false);

  const projStats = id => {
    const rec = receipts.filter(r=>r.projectId===id&&(r.currency==="دينار"||!r.currency));
    const spe = spends.filter(s=>s.projectId===id&&(s.currency==="دينار"||!s.currency));
    const recDol = receipts.filter(r=>r.projectId===id&&r.currency==="دولار");
    const speDol = spends.filter(s=>s.projectId===id&&s.currency==="دولار");
    const totR   = rec.reduce((s,r)=>s+r.amount,0);
    const totS   = spe.reduce((s,r)=>s+r.amount,0);
    const totRDol= recDol.reduce((s,r)=>s+r.amount,0);
    const totSDol= speDol.reduce((s,r)=>s+r.amount,0);
    return {
      totR, totS, bal:totR-totS,
      totRDol, totSDol,
      recCount:receipts.filter(r=>r.projectId===id).length,
      speCount:spends.filter(s=>s.projectId===id).length,
    };
  };

  const save = async () => {
    if(!form.name.trim()||saving) return;
    setSaving(true);
    await onAdd({
      name:     form.name.trim(),
      type:     form.type,
      contract: Number(form.contract)||0,
      currency: form.currency,
      createdAt:new Date().toISOString(),
    });
    setSaving(false);
    setForm({name:"",type:"مقاولات",contract:"",currency:"دينار"});
    setShow(false);
  };

  // ── تفاصيل مشروع ──
  if(sel) {
    const p   = projects.find(x=>x.id===sel);
    const st  = projStats(sel);
    const contract = p?.contract||0;
    const collected = st.totR;
    const pct = contract>0?Math.min(100,Math.round(collected/contract*100)):0;
    const remaining = contract - collected;
    const isPos = st.bal>=0;
    const recs = receipts.filter(r=>r.projectId===sel).sort((a,b)=>b.date.localeCompare(a.date));
    const spns = spends.filter(s=>s.projectId===sel).sort((a,b)=>b.date.localeCompare(a.date));

    return (
      <div style={{padding:20}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <BackBtn onClick={()=>setSel(null)}/>
          <div>
            <div style={{fontSize:18,fontWeight:800}}>{p?.name}</div>
            <div style={{fontSize:12,color:C.muted}}>{p?.type}</div>
          </div>
        </div>

        {/* قيمة العقد */}
        {contract>0&&(
          <div style={{...S.card,marginBottom:12,border:`1px solid rgba(184,134,11,0.25)`,background:"rgba(184,134,11,0.04)"}}>
            <div style={{fontSize:11,color:C.gold,fontWeight:700,marginBottom:4}}>📋 قيمة العقد الكلية</div>
            <div style={{fontSize:22,fontWeight:900,color:C.gold}}>{fmtD(contract)}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:6,marginBottom:10}}>
              {numToWords(contract)} دينار
            </div>
            {/* شريط التحصيل */}
            <div style={{marginBottom:6}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginBottom:4}}>
                <span>نسبة التحصيل</span>
                <span style={{fontWeight:700,color:C.green}}>{toAr(pct)}%</span>
              </div>
              <div style={{background:C.border,borderRadius:999,height:8,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:999,
                  background:`linear-gradient(90deg,#14532d,#22c55e)`,
                  width:`${pct}%`,transition:"width 0.4s"}}/>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginTop:6}}>
              <span style={{color:C.green,fontWeight:700}}>✅ تم التحصيل: {fmtD(collected)}</span>
              <span style={{color:remaining>=0?C.muted:C.red,fontWeight:700}}>
                {remaining>=0?"⏳ المتبقي:":"⚠️ تجاوز:"} {fmtD(Math.abs(remaining))}
              </span>
            </div>
          </div>
        )}

        {/* رصيد المشروع */}
        <div style={{
          background:isPos?"linear-gradient(135deg,#14532d,#166534)":"linear-gradient(135deg,#7f1d1d,#991b1b)",
          borderRadius:18,padding:20,marginBottom:14,color:"#fff",
          boxShadow:`0 4px 20px ${isPos?"rgba(22,101,52,0.2)":"rgba(153,27,27,0.2)"}`,
        }}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginBottom:4}}>
            {isPos?"✅ رصيد موجب":"⚠️ رصيد سالب"}
          </div>
          <div style={{fontSize:30,fontWeight:900,letterSpacing:-1,marginBottom:14}}>
            {isPos?"+":"-"}{fmtD(st.bal)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div style={{background:"rgba(255,255,255,0.1)",borderRadius:12,padding:"12px"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.6)",marginBottom:3}}>↓ الاستلامات ({toAr(st.recCount)})</div>
              <div style={{fontSize:16,fontWeight:800,color:"#86efac"}}>{fmtD(st.totR)}</div>
              {st.totRDol>0&&<div style={{fontSize:11,color:"#86efac",marginTop:2}}>+ {toAr(st.totRDol)} $</div>}
            </div>
            <div style={{background:"rgba(255,255,255,0.1)",borderRadius:12,padding:"12px"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.6)",marginBottom:3}}>↑ المصروفات ({toAr(st.speCount)})</div>
              <div style={{fontSize:16,fontWeight:800,color:"#fca5a5"}}>{fmtD(st.totS)}</div>
              {st.totSDol>0&&<div style={{fontSize:11,color:"#fca5a5",marginTop:2}}>+ {toAr(st.totSDol)} $</div>}
            </div>
          </div>
        </div>

        {/* استلامات المشروع */}
        {recs.length>0&&(
          <>
            <div style={{fontSize:14,fontWeight:800,color:C.green,marginBottom:10}}>
              ↓ الاستلامات ({toAr(recs.length)})
            </div>
            {recs.map(r=>(
              <div key={r.id} style={{...S.card}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    {r.txId&&<div style={{fontSize:10,color:C.muted,fontFamily:"monospace",marginBottom:3}}>#{r.txId}</div>}
                    <div style={{fontSize:13,fontWeight:700}}>{r.generalDesc||r.source||"استلام"}</div>
                    {r.amtWords&&<div style={{fontSize:11,color:C.muted}}>{r.amtWords}</div>}
                    <div style={{fontSize:11,color:C.muted}}>📅 {r.date}</div>
                    {r.note&&<div style={{fontSize:12,color:C.text,marginTop:2}}>{r.note}</div>}
                  </div>
                  <div style={{fontWeight:800,color:C.green,background:"rgba(22,101,52,0.08)",padding:"4px 12px",borderRadius:12,flexShrink:0}}>
                    +{fmt(r.amount,r.currency)}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* مصروفات المشروع */}
        {spns.length>0&&(
          <>
            <div style={{fontSize:14,fontWeight:800,color:C.red,margin:"16px 0 10px"}}>
              ↑ المصروفات ({toAr(spns.length)})
            </div>
            {spns.map(r=>(
              <div key={r.id} style={{...S.card}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    {r.txId&&<div style={{fontSize:10,color:C.muted,fontFamily:"monospace",marginBottom:3}}>#{r.txId}</div>}
                    <div style={{fontSize:13,fontWeight:700}}>{r.note||r.dest||"صرف"}</div>
                    <div style={{fontSize:11,color:C.muted}}>📅 {r.date}</div>
                  </div>
                  <div style={{fontWeight:800,color:C.red,background:"rgba(153,27,27,0.08)",padding:"4px 12px",borderRadius:12,flexShrink:0}}>
                    -{fmt(r.amount,r.currency)}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {recs.length===0&&spns.length===0&&(
          <Empty icon="📄" text="ما في معاملات مرتبطة بهذا المشروع"/>
        )}
      </div>
    );
  }

  // ── قائمة المشاريع ──
  return (
    <div style={{padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:800}}>🏗️ المشاريع</div>
        <button onClick={()=>setShow(v=>!v)} style={{
          ...S.btn,width:"auto",padding:"10px 20px",
          background:C.gold,color:"#fff",fontSize:14,
        }}>{show?"✕ إغلاق":"+ مشروع"}</button>
      </div>

      {/* نموذج الإضافة */}
      {show&&(
        <div style={{...S.card,marginBottom:16,border:`1.5px solid ${C.gold}40`}}>
          <Lbl>اسم المشروع</Lbl>
          <input style={{...S.inp,marginBottom:12}}
            placeholder="مثال: فيلا الكرادة، برج المنصور..."
            value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
            autoFocus onKeyDown={e=>e.key==="Enter"&&save()}/>

          <Lbl>نوع المشروع</Lbl>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {PROJ_TYPES.map(t=>(
              <button key={t} onClick={()=>setForm(f=>({...f,type:t}))} style={{
                ...S.btn,padding:"10px 8px",fontSize:13,
                background:form.type===t?C.gold+"20":"transparent",
                color:form.type===t?C.gold:C.muted,
                border:`1.5px solid ${form.type===t?C.gold:C.border}`,
              }}>{t}</button>
            ))}
          </div>

          <Lbl>قيمة العقد الكلية (اختياري)</Lbl>
          <div style={{display:"flex",gap:8,marginBottom:6}}>
            <input style={{...S.inp,flex:2,fontSize:18,fontWeight:700,textAlign:"center"}}
              type="number" placeholder="٠"
              value={form.contract} onChange={e=>setForm(f=>({...f,contract:e.target.value}))}/>
            <select style={{...S.sel,flex:1}} value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}>
              <option value="دينار">🇮🇶 دينار</option>
              <option value="دولار">🇺🇸 دولار</option>
            </select>
          </div>
          {Number(form.contract)>0&&(
            <div style={{fontSize:12,color:C.gold,fontWeight:600,marginBottom:12,
              padding:"6px 10px",background:"rgba(184,134,11,0.06)",borderRadius:8}}>
              ✍️ {numToWords(Number(form.contract))} {form.currency}
            </div>
          )}

          <button onClick={save} disabled={!form.name.trim()||saving} style={{
            ...S.btn,
            background:form.name.trim()?C.gold:C.border,
            color:form.name.trim()?"#fff":C.muted,
          }}>{saving?"جاري الحفظ...":"✅ حفظ المشروع"}</button>
        </div>
      )}

      {/* قائمة المشاريع */}
      {projects.length===0
        ?<Empty icon="🏗️" text="ما في مشاريع — أضف مشروع جديد"/>
        :projects.map(p=>{
          const st      = projStats(p.id);
          const contract= p.contract||0;
          const pct     = contract>0?Math.min(100,Math.round(st.totR/contract*100)):0;
          const isPos   = st.bal>=0;
          const hasTx   = st.totR>0||st.totS>0;

          // لون النوع
          const typeCol = p.type==="واجهات"?C.blue:p.type==="ديكور"?C.purple:p.type==="مقاولات"?"#0f766e":C.muted;

          return (
            <div key={p.id} style={{
              ...S.card,cursor:"pointer",
              border:`1px solid ${hasTx?(isPos?"rgba(22,101,52,0.2)":"rgba(153,27,27,0.2)"):C.border}`,
            }} onClick={()=>setSel(p.id)}>
              {/* Header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontWeight:800,fontSize:16,marginBottom:4}}>{p.name}</div>
                  <span style={{fontSize:11,fontWeight:700,color:typeCol,
                    background:typeCol+"15",padding:"3px 10px",borderRadius:20}}>
                    {p.type||"عام"}
                  </span>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <div style={{
                    fontWeight:900,fontSize:16,
                    color:isPos?C.green:C.red,
                    background:isPos?"rgba(22,101,52,0.08)":"rgba(153,27,27,0.08)",
                    padding:"6px 14px",borderRadius:14,
                  }}>
                    {isPos?"+":"-"}{fmtD(st.bal)}
                  </div>
                  <button onClick={e=>{e.stopPropagation();if(window.confirm(`تحذف "${p.name}"؟`))onDelete(p.id);}} style={{
                    background:"transparent",border:"none",
                    color:C.red,fontSize:16,cursor:"pointer",padding:4,
                  }}>🗑️</button>
                </div>
              </div>

              {/* قيمة العقد + التفاصيل */}
              {contract>0&&(
                <div style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginBottom:4}}>
                    <span>📋 العقد: {fmtD(contract)}</span>
                    <span style={{color:C.green,fontWeight:700}}>تحصّل {toAr(pct)}%</span>
                  </div>
                  <div style={{background:C.border,borderRadius:999,height:5,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:999,
                      background:"linear-gradient(90deg,#14532d,#22c55e)",
                      width:`${pct}%`,transition:"width 0.4s"}}/>
                  </div>
                </div>
              )}

              {/* استلام ومصروف */}
              {hasTx&&(
                <div style={{display:"flex",gap:8}}>
                  <div style={{flex:1,background:"rgba(22,101,52,0.06)",borderRadius:10,padding:"7px 10px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:C.muted}}>↓ استلام</div>
                    <div style={{fontSize:13,fontWeight:800,color:C.green}}>{fmtD(st.totR)}</div>
                  </div>
                  <div style={{flex:1,background:"rgba(153,27,27,0.06)",borderRadius:10,padding:"7px 10px",textAlign:"center"}}>
                    <div style={{fontSize:10,color:C.muted}}>↑ صرف</div>
                    <div style={{fontSize:13,fontWeight:800,color:C.red}}>{fmtD(st.totS)}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })
      }
    </div>
  );
}

// ══════════ App ══════════
export default function App() {
  const [page,     setPage]    = useState("home");
  const [loading,  setLoading] = useState(true);
  const [receipts, setReceipts]= useState([]);
  const [spends,   setSpends]  = useState([]);
  const [salaries, setSalaries]= useState([]);
  const [projects, setProjects]= useState([]);

  useEffect(()=>{
    const u = [];
    const to = setTimeout(()=>setLoading(false), 8000);

    u.push(onSnapshot(query(collection(db,"receipts_v1"),orderBy("date","desc"),limit(300)),
      s=>{setReceipts(s.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false);},
      ()=>setLoading(false)));

    u.push(onSnapshot(query(collection(db,"spends_v1"),orderBy("date","desc"),limit(300)),
      s=>setSpends(s.docs.map(d=>({id:d.id,...d.data()})))));

    u.push(onSnapshot(query(collection(db,"salaries_v1"),orderBy("date","desc"),limit(200)),
      s=>setSalaries(s.docs.map(d=>({id:d.id,...d.data()})))));

    u.push(onSnapshot(collection(db,"projects_v2"),
      s=>setProjects(s.docs.map(d=>({id:d.id,...d.data()})))));

    return ()=>{u.forEach(fn=>fn()); clearTimeout(to);};
  },[]);

  const addDoc2 = (col,data) => addDoc(collection(db,col),data);
  const del     = (col,id)   => deleteDoc(doc(db,col,id));

  const addProject = async form => {
    if(typeof form === "string")
      await addDoc(collection(db,"projects_v2"),{name:form,type:"عام",contract:0,currency:"دينار",createdAt:new Date().toISOString()});
    else
      await addDoc(collection(db,"projects_v2"),{...form});
  };
  const delProject = async id => deleteDoc(doc(db,"projects_v2",id));

  if(loading) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",gap:14,
      fontFamily:"Tahoma",direction:"rtl"}}>
      <div style={{fontSize:56}}>📊</div>
      <div style={{fontSize:24,fontWeight:900,color:C.gold}}>حساب</div>
      <div style={{fontSize:13,color:C.muted}}>جاري التحميل...</div>
    </div>
  );

  const PAGES = {
    home:     <HomePage receipts={receipts} spends={spends} salaries={salaries} onNavigate={setPage}/>,
    receive:  <ReceivePage receipts={receipts} projects={projects} onAdd={d=>addDoc2("receipts_v1",d)} onDelete={id=>del("receipts_v1",id)}/>,
    spend:    <SpendPage spends={spends} projects={projects} onAdd={d=>addDoc2("spends_v1",d)} onDelete={id=>del("spends_v1",id)}/>,
    report:   <ReportPage receipts={receipts} spends={spends}/>,
    salary:   <SalaryPage salaries={salaries} onAdd={d=>addDoc2("salaries_v1",d)} onDelete={id=>del("salaries_v1",id)}/>,
    projects: <ProjectsPage projects={projects} receipts={receipts} spends={spends} onAdd={addProject} onDelete={delProject}/>,
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"Tahoma,Arial,sans-serif",direction:"rtl",color:C.text,paddingBottom:66}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        {PAGES[page]||PAGES.home}
      </div>

      {/* شريط التنقل */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",
        borderTop:`1px solid ${C.border}`,display:"flex",height:58,zIndex:100,
        boxShadow:"0 -2px 12px rgba(0,0,0,0.06)"}}>
        {[
          {id:"home",     icon:"🏠", label:"الرئيسية"},
          {id:"receive",  icon:"↓",  label:"استلام",  color:C.green},
          {id:"spend",    icon:"↑",  label:"مصروف",   color:C.red},
          {id:"projects", icon:"🏗️", label:"مشاريع",  color:C.gold},
          {id:"report",   icon:"📊", label:"تقرير",   color:C.blue},
          {id:"salary",   icon:"💵", label:"راتب",    color:C.purple},
        ].map(n=>{
          const active = page===n.id;
          const col    = n.color||(active?C.gold:C.muted);
          return (
            <button key={n.id} onClick={()=>setPage(n.id)} style={{
              flex:1,border:"none",background:"transparent",
              display:"flex",flexDirection:"column",alignItems:"center",
              justifyContent:"center",gap:2,cursor:"pointer",
              color:active?(n.color||C.gold):C.muted,
            }}>
              <div style={{fontSize:20,lineHeight:1,fontWeight:active?900:400}}>{n.icon}</div>
              <div style={{fontSize:9,fontWeight:active?800:500}}>{n.label}</div>
              {active&&<div style={{width:20,height:2.5,background:n.color||C.gold,borderRadius:999}}/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
