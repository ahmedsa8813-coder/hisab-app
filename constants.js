export function w2(n) {
  const x = Math.floor(Math.abs(Number(n) || 0));
  if (!x) return "صفر";
  const o = ["","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة",
    "عشرة","أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر",
    "ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"];
  const t2 = ["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"];
  const h = ["","مئة","مئتان","ثلاثمئة","أربعمئة","خمسمئة","ستمئة","سبعمئة","ثمانمئة","تسعمئة"];
  const g = v => {
    if (!v) return "";
    if (v < 20) return o[v];
    if (v < 100) return t2[Math.floor(v/10)] + (v%10 ? " و" + o[v%10] : "");
    return h[Math.floor(v/100)] + (v%100 ? " و" + g(v%100) : "");
  };
  const p = [];
  if (x >= 1e9) p.push(g(Math.floor(x/1e9)) + " مليار");
  if (x%1e9 >= 1e6) p.push(g(Math.floor(x%1e9/1e6)) + " مليون");
  if (x%1e6 >= 1e3) p.push(g(Math.floor(x%1e6/1e3)) + " ألف");
  if (x%1e3) p.push(g(x%1e3));
  return p.join(" و");
}

export const fNum = n => {
  const s = String(Math.round(Math.abs(Number(n) || 0)));
  let r = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) r += ",";
    r += s[i];
  }
  return r;
};

export const PASS = "1234";

export const PROVINCES = [
  "بغداد","البصرة","نينوى","أربيل","السليمانية","دهوك","كركوك",
  "الأنبار","صلاح الدين","ديالى","واسط","ميسان","ذي قار",
  "المثنى","القادسية","بابل","كربلاء","النجف"
];

export const PARTNERS = [
  { id: "إيهاب",  name: "م. إيهاب",  pct: 30, color: "#2563EB", bg: "#EFF6FF" },
  { id: "أحمد",   name: "م. أحمد",   pct: 10, color: "#D97706", bg: "#FFFBEB" },
  { id: "نور",    name: "م. نور",    pct: 30, color: "#059669", bg: "#ECFDF5" },
  { id: "محمد",   name: "م. محمد",   pct: 30, color: "#7C3AED", bg: "#F5F3FF" },
];

export const TYPES = [
  { val: "إشراف",   icon: "👷", color: "#059669", bg: "#ECFDF5" },
  { val: "ديكور",   icon: "🎨", color: "#7C3AED", bg: "#F5F3FF" },
  { val: "مقاولات", icon: "🏗️", color: "#D97706", bg: "#FFFBEB" },
  { val: "واجهات",  icon: "🏢", color: "#2563EB", bg: "#EFF6FF" },
];

const typeStyle = t => TYPES.find(x => x.val === t) || {};

const emptyForm = {
  type: "", name: "", province: "", city: "",
  days: "",
  valueDin: "", valueDol: "",
  startDate: new Date().toISOString().split("T")[0]
};

