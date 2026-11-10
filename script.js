(() => {
"use strict";
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const store = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, String(value)); } catch {} },
  remove(key) { try { localStorage.removeItem(key); } catch {} }
};
let expression = "", result = "0";
let memory = Number(store.get("catMemory", "0")) || 0;
let history = []; try { history = JSON.parse(store.get("catHistory", "[]")) || []; } catch {}
let xp = Number(store.get("catXP", "0")) || 0, count = Number(store.get("catCount", "0")) || 0;
let sound = store.get("catSound", "0") === "1", theme = store.get("catTheme", "dark");
const levels = ["Kitten Rookie","Cube Cat","Crystal Cat","Shadow Cat","Royal Cat","Legendary Cat","Master Meow"];
const $expr = $("#expression"), $result = $("#result");
function format(value) {
  const n = Number(value); if (!Number.isFinite(n)) return "Error";
  const d = store.get("catDecimals", "auto");
  const rounded = d === "auto" ? Number(n.toPrecision(11)) : Number(n.toFixed(Number(d)));
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: d === "auto" ? 10 : Number(d) }).format(rounded);
}
function render() {
  $expr.textContent = expression || "0"; $result.textContent = format(result);
  $("#memoryIndicator").textContent = `MEMORY: ${format(memory)}`;
  const level = Math.min(levels.length - 1, Math.floor(xp / 100));
  $("#levelName").textContent = levels[level]; $("#levelNum").textContent = `LEVEL ${String(level + 1).padStart(2, "0")}`;
  $("#xpFill").style.width = `${xp % 100}%`; $("#xpText").textContent = `${xp % 100} / 100 XP`;
  $("#achievementCount").textContent = `${achievements()} unlocked`; updateProgrammer();
}
function tokenize(input) {
  const s = input.replace(/×/g, "*").replace(/÷/g, "/").replace(/\s/g, "");
  if (!s || !/^[0-9.+\-*/()]+$/.test(s)) throw Error("Invalid");
  const tokens = s.match(/(?:\d+(?:\.\d*)?|\.\d+|[()+\-*/])/g) || [];
  if (tokens.join("") !== s) throw Error("Invalid");
  return tokens;
}
function safeEval(input) {
  const tokens = tokenize(input); let pos = 0;
  function primary() {
    const t = tokens[pos++];
    if (t === "+" || t === "-") { const v = primary(); return t === "-" ? -v : v; }
    if (t === "(") { const v = addSub(); if (tokens[pos++] !== ")") throw Error("Invalid"); return v; }
    if (t === undefined || !Number.isFinite(Number(t))) throw Error("Invalid");
    return Number(t);
  }
  function mulDiv() {
    let v = primary();
    while (tokens[pos] === "*" || tokens[pos] === "/") {
      const op = tokens[pos++], b = primary();
      if (op === "/" && b === 0) throw Error("Zero");
      v = op === "*" ? v * b : v / b;
    }
    return v;
  }
  function addSub() {
    let v = mulDiv();
    while (tokens[pos] === "+" || tokens[pos] === "-") {
      const op = tokens[pos++], b = mulDiv(); v = op === "+" ? v + b : v - b;
    }
    return v;
  }
  const value = addSub();
  if (pos !== tokens.length || !Number.isFinite(value)) throw Error("Invalid");
  return value;
}
function click(ok = false) {
  if (!sound) return;
  try { const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return; const c = new Ctx(), o = c.createOscillator(), g = c.createGain(); o.frequency.value = ok ? 740 : 420; g.gain.value = .025; o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + .06); o.onended = () => c.close(); } catch {}
}
let toastTimer;
function toast(message) { const el = $("#toast"); el.textContent = message; el.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 1800); }
function add(value) {
  if (result !== "0" && expression === "" && /[0-9.]/.test(value)) result = "0";
  if (expression.length > 80) return;
  expression += value; result = expression; render(); click();
}
function calculate() {
  if (!expression) return;
  try {
    const old = expression.replace(/\*/g, "×").replace(/\//g, "÷"), val = safeEval(expression);
    result = val; expression = "";
    history.unshift({ e: old, r: val, t: new Date().toLocaleString("id-ID") }); history = history.slice(0, 50);
    store.set("catHistory", JSON.stringify(history)); count++; xp += 10;
    store.set("catCount", count); store.set("catXP", xp);
    $("#catMessage").textContent = "🐾 Calculation complete! +10 XP";
    toast(xp % 100 < 10 ? "🐱 LEVEL UP!" : "🐾 Calculation Complete! +10 XP"); click(true); render();
  } catch (e) { result = "Error"; $("#catMessage").textContent = "😿 Oops! Check your equation."; toast(e.message === "Zero" ? "Tidak bisa membagi dengan nol" : "Perhitungan tidak valid"); click(false); render(); }
}
function clearCalc() { expression = ""; result = "0"; render(); click(); }
function back() { expression = expression.slice(0, -1); result = expression || "0"; render(); }
function sign() { if (expression) { expression = expression.startsWith("-(") && expression.endsWith(")") ? expression.slice(2, -1) : `-(${expression})`; result = expression; render(); } else { result = -Number(result); render(); } }
function percent() { try { if (expression) { result = safeEval(expression) / 100; expression = ""; render(); } else { result = Number(result) / 100; render(); } } catch { toast("Perhitungan tidak valid"); } }
function current() { const n = Number(result); return Number.isFinite(n) ? n : 0; }
function scientific(fn) {
  const x = current(); let v;
  try {
    switch (fn) {
      case "sqrt": v = Math.sqrt(x); break; case "square": v = x*x; break; case "inverse": v = 1/x; break;
      case "sin": v = Math.sin(x*Math.PI/180); break; case "cos": v = Math.cos(x*Math.PI/180); break; case "tan": v = Math.tan(x*Math.PI/180); break;
      case "asin": v = Math.asin(x)*180/Math.PI; break; case "acos": v = Math.acos(x)*180/Math.PI; break; case "atan": v = Math.atan(x)*180/Math.PI; break;
      case "log": v = Math.log10(x); break; case "ln": v = Math.log(x); break; case "exp": v = Math.exp(x); break; case "pow10": v = 10**x; break;
      case "factorial": if (x < 0 || x > 170 || !Number.isInteger(x)) throw Error(); v = 1; for (let i=2;i<=x;i++) v*=i; break;
      case "abs": v = Math.abs(x); break; case "random": v = Math.random(); break;
      case "power": { const exponent = prompt("Masukkan pangkat:"); if (exponent === null || exponent.trim() === "") return; const p = Number(exponent); if (!Number.isFinite(p)) throw Error(); v = x ** p; break; }
      default: throw Error();
    }
    if (!Number.isFinite(v)) throw Error();
    result = v; expression = ""; xp += 10; store.set("catXP", xp); $("#catMessage").textContent = "🐱 Scientific operation +10 XP"; toast("🐱 Scientific +10 XP"); render();
  } catch { result = "Error"; toast("Operasi ilmiah tidak valid"); render(); }
}
function constants(c) { result = c === "pi" ? Math.PI : c === "e" ? Math.E : (1 + Math.sqrt(5))/2; expression = ""; render(); }
function memoryAction(action) {
  if (action === "mc") memory = 0;
  if (action === "mr") { result = memory; expression = ""; }
  if (action === "mplus") memory += current();
  if (action === "mminus") memory -= current();
  if (action === "ms") memory = current();
  store.set("catMemory", memory); render();
}
function updateProgrammer() {
  const n = Math.trunc(current()), unsigned = n >>> 0;
  $("#binOut").textContent = unsigned.toString(2); $("#hexOut").textContent = unsigned.toString(16).toUpperCase(); $("#octOut").textContent = unsigned.toString(8);
}
function programmer(op) {
  const n = Math.trunc(current());
  const v = op === "and" ? n & 1 : op === "or" ? n | 1 : op === "xor" ? n ^ 1 : op === "not" ? ~n : op === "shl" ? n << 1 : n >> 1;
  result = v; expression = ""; render();
}
function achievements() { return Math.min(5, (count>=1?1:0)+(count>=10?1:0)+(count>=100?1:0)+(Math.floor(xp/100)>=9?1:0)); }
function renderHistory() {
  const list = $("#historyList"); list.replaceChildren();
  if (!history.length) { const p = document.createElement("p"); p.textContent = "Belum ada petualangan perhitungan."; list.append(p); return; }
  history.forEach((item, index) => {
    const el = document.createElement("button"); el.className = "history-item"; el.type = "button";
    const time = document.createElement("small"); time.textContent = item.t;
    const equation = document.createElement("span"); equation.textContent = `${item.e} = ${format(item.r)}`;
    el.append(time, equation); el.addEventListener("click", () => { result = item.r; expression = ""; $("#historyModal").classList.add("hidden"); render(); }); list.append(el);
  });
}
function setTheme(value) { theme = value; document.body.classList.toggle("light", theme === "light"); store.set("catTheme", theme); $("#themeSelect").value = theme; $("#themeBtn").textContent = theme === "dark" ? "🌙" : "☀️"; }
const unitSets = {
 length: {m:1,km:1000,cm:.01,mm:.001,mi:1609.344}, weight:{kg:1,g:.001,mg:.000001,lb:.45359237},
 area:{"m²":1,"km²":1e6,"cm²":1e-4}, volume:{L:1,"mL":.001,"m³":1000},
 time:{s:1,min:60,h:3600,day:86400}, speed:{"m/s":1,"km/h":1/3.6,mph:.44704},
 data:{B:1,KB:1024,MB:1048576,GB:1073741824}, energy:{J:1,kJ:1000,cal:4.184}
};
function setupConverters() {
  const type = $("#convertType").value;
  const units = type === "temperature" ? ["°C","°F","K"] : Object.keys(unitSets[type]);
  $("#convertFrom").innerHTML = ""; $("#convertTo").innerHTML = "";
  units.forEach(unit => { $("#convertFrom").add(new Option(unit, unit)); $("#convertTo").add(new Option(unit, unit)); });
  if (units.length > 1) $("#convertTo").selectedIndex = 1;
  convert();
}
function convert() {
  const type=$("#convertType").value, from=$("#convertFrom").value, to=$("#convertTo").value, x=Number($("#convertInput").value);
  if (!Number.isFinite(x) || !from || !to) { $("#convertResult").textContent = "—"; return; }
  let v=x;
  if (type === "temperature") {
    let c = from === "°C" ? x : from === "°F" ? (x-32)*5/9 : x-273.15;
    v = to === "°C" ? c : to === "°F" ? c*9/5+32 : c+273.15;
  } else v = x * unitSets[type][from] / unitSets[type][to];
  $("#convertResult").textContent = Number.isFinite(v) ? format(v) : "Error";
}
$$(".keypad button").forEach(button => button.addEventListener("click", () => {
  const action=button.dataset.action, value=button.dataset.value;
  if (value !== undefined) add(value);
  else if (action==="equals") calculate(); else if (action==="clear") clearCalc(); else if (action==="backspace") back(); else if (action==="sign") sign(); else if (action==="percent") percent();
}));
$$(".memory-row button").forEach(b => b.addEventListener("click", () => memoryAction(b.dataset.action)));
$$("[data-fn]").forEach(b => b.addEventListener("click", () => scientific(b.dataset.fn)));
$$("[data-const]").forEach(b => b.addEventListener("click", () => constants(b.dataset.const)));
$$("[data-prog]").forEach(b => b.addEventListener("click", () => programmer(b.dataset.prog)));
$("#modeSelect").addEventListener("change", e => {
  const mode=e.target.value;
  $("#scientific").classList.toggle("hidden",mode!=="scientific"); $("#programmer").classList.toggle("hidden",mode!=="programmer"); $("#converter").classList.toggle("hidden",mode!=="converter");
  if (mode==="converter") setupConverters();
});
$("#historyBtn").onclick=()=>{ $("#historyModal").classList.remove("hidden"); renderHistory(); };
$("#clearHistory").onclick=()=>{ history=[]; store.set("catHistory","[]"); renderHistory(); };
$("#settingsBtn").onclick=()=>$("#settingsModal").classList.remove("hidden");
$("#themeBtn").onclick=()=>setTheme(theme==="dark"?"light":"dark");
$("#soundBtn").onclick=()=>{ sound=!sound; store.set("catSound",sound?"1":"0"); $("#soundBtn").textContent=sound?"🔊":"🔇"; $("#soundToggle").checked=sound; };
$$("[data-close]").forEach(b=>b.onclick=()=>$("#"+b.dataset.close).classList.add("hidden"));
$("#themeSelect").onchange=e=>setTheme(e.target.value);
$("#soundToggle").onchange=e=>{ sound=e.target.checked; store.set("catSound",sound?"1":"0"); $("#soundBtn").textContent=sound?"🔊":"🔇"; };
$("#decimalSelect").onchange=e=>store.set("catDecimals",e.target.value);
$("#animationToggle").onchange=e=>document.body.classList.toggle("no-animation",!e.target.checked);
$("#resetData").onclick=()=>{ if(confirm("Reset semua data Cat Adventure?")) { ["catMemory","catHistory","catXP","catCount"].forEach(store.remove); location.reload(); } };
$("#convertType").addEventListener("change",setupConverters);
["convertFrom","convertTo","convertInput"].forEach(id=>$("#"+id).addEventListener("input",convert));
document.addEventListener("keydown",e=>{
  if (e.target.matches("input,select,textarea")) return;
  if (/^[0-9]$/.test(e.key)) add(e.key);
  else if (["+","+","-","*","/","(",")"].includes(e.key)) add(e.key);
  else if (e.key===".") add(".");
  else if (e.key==="%") percent();
  else if (e.key==="Enter" || e.key==="=") { e.preventDefault(); calculate(); }
  else if (e.key==="Escape") clearCalc();
  else if (e.key==="Backspace") back();
});
$("#soundToggle").checked=sound; $("#decimalSelect").value=store.get("catDecimals","auto");
setTheme(theme); render();
})();