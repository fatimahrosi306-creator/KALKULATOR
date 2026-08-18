(() => {
"use strict";
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
let expression="", result="0", memory=Number(localStorage.getItem("catMemory")||0);
let history=JSON.parse(localStorage.getItem("catHistory")||"[]");
let xp=Number(localStorage.getItem("catXP")||0), count=Number(localStorage.getItem("catCount")||0);
let sound=localStorage.getItem("catSound")==="1", theme=localStorage.getItem("catTheme")||"dark";
const levels=["Kitten Rookie","Cube Cat","Crystal Cat","Shadow Cat","Royal Cat","Legendary Cat","Master Meow"];
const $expr=$("#expression"),$result=$("#result");

function render(){
  $expr.textContent=expression||"0"; $result.textContent=format(result);
  $("#memoryIndicator").textContent=`MEMORY: ${format(memory)}`;
  const level=Math.min(levels.length-1,Math.floor(xp/100));
  $("#levelName").textContent=levels[level]; $("#levelNum").textContent=`LEVEL ${String(level+1).padStart(2,"0")}`;
  $("#xpFill").style.width=(xp%100)+"%"; $("#xpText").textContent=`${xp%100} / 100 XP`;
  $("#achievementCount").textContent=`${achievements()} unlocked`;
  updateProgrammer();
}
function format(v){
  if(v===undefined||v===null||v==="") return "0";
  let n=Number(v); if(!Number.isFinite(n)) return "Error";
  const d=localStorage.getItem("catDecimals")||"auto";
  if(d!=="auto") n=Number(n.toFixed(Number(d)));
  return new Intl.NumberFormat("en-US",{maximumFractionDigits:d==="auto"?10:Number(d)}).format(n);
}
function safeEval(s){
  if(!/^[0-9+\-*/().%\s]+$/.test(s)) throw Error("Invalid");
  s=s.replace(/%/g,"/100");
  const parts=s.match(/[+\-*/]?\.?\d+(?:\.\d+)?/g);
  if(!parts) throw Error("Invalid");
  // Expression parser without eval: shunting-yard
  const tokens=s.match(/\d*\.?\d+|[()+\-*/]/g)||[];
  const out=[],ops=[],prec={"+":1,"-":1,"*":2,"/":2};
  for(const t of tokens){
    if(!isNaN(t)) out.push(Number(t));
    else if(t==="(") ops.push(t);
    else if(t===")"){while(ops.length&&ops.at(-1)!=="(")out.push(ops.pop());ops.pop()}
    else{while(ops.length&&ops.at(-1)!=="("&&prec[ops.at(-1)]>=prec[t])out.push(ops.pop());ops.push(t)}
  }
  while(ops.length)out.push(ops.pop());
  const st=[];
  for(const t of out){if(typeof t==="number")st.push(t);else{const b=st.pop(),a=st.pop();if(t==="/"&&b===0)throw Error("Zero");st.push({"+":a+b,"-":a-b,"*":a*b,"/":a/b}[t])}}
  if(st.length!==1||!Number.isFinite(st[0]))throw Error("Invalid"); return st[0];
}
function add(v){
  if(result!=="0"&&expression==="") result="";
  expression+=v; result=expression; render(); click();
}
function calculate(){
  try{
    if(!expression)return;
    const old=expression.replace(/\*/g,"×").replace(/\//g,"÷");
    const val=safeEval(expression);
    result=val; expression="";
    history.unshift({e:old,r:val,t:new Date().toLocaleString("id-ID")}); history=history.slice(0,50);
    localStorage.setItem("catHistory",JSON.stringify(history)); count++; xp+=10;
    localStorage.setItem("catCount",count); localStorage.setItem("catXP",xp);
    $("#catMessage").textContent=xp%100<10?"🐱 LEVEL UP!":"🐾 Calculation complete! +10 XP";
    if(xp%100<10) toast("🐱 LEVEL UP!"); else toast("🐾 Calculation Complete! +10 XP");
    click(true); render();
  }catch(e){result="Error";$("#catMessage").textContent="😿 Oops! Check your equation.";toast(e.message==="Zero"?"🚫 Impossible move!":"⚠ Invalid calculation");click(false);render()}
}
function clear(){expression="";result="0";render();click()}
function back(){expression=expression.slice(0,-1);result=expression||"0";render()}
function sign(){if(expression){expression=expression.startsWith("-")?expression.slice(1):"-("+expression+")";result=expression;render()}}
function percent(){try{result=safeEval(expression)/100;expression="";render()}catch{}}
function current(){return Number(result)||0}
function scientific(fn){
  let x=current(),v;
  try{
    if(fn==="sqrt")v=Math.sqrt(x); if(fn==="square")v=x*x; if(fn==="inverse")v=1/x;
    if(fn==="sin")v=Math.sin(x*Math.PI/180); if(fn==="cos")v=Math.cos(x*Math.PI/180); if(fn==="tan")v=Math.tan(x*Math.PI/180);
    if(fn==="asin")v=Math.asin(x)*180/Math.PI; if(fn==="acos")v=Math.acos(x)*180/Math.PI; if(fn==="atan")v=Math.atan(x)*180/Math.PI;
    if(fn==="log")v=Math.log10(x); if(fn==="ln")v=Math.log(x); if(fn==="exp")v=Math.exp(x); if(fn==="pow10")v=10**x;
    if(fn==="factorial"){if(x<0||x>170||x%1)throw Error();v=1;for(let i=2;i<=x;i++)v*=i}
    if(fn==="abs")v=Math.abs(x); if(fn==="random")v=Math.random();
    if(!Number.isFinite(v))throw Error();
    result=v;expression="";xp+=10;localStorage.setItem("catXP",xp);toast("🐱 Scientific +10 XP");render()
  }catch{result="Error";toast("⚠ Invalid scientific operation");render()}
}
function constants(c){result=c==="pi"?Math.PI:c==="e"?Math.E:(1+Math.sqrt(5))/2;expression="";render()}
function memoryAction(a){
  if(a==="mc")memory=0;if(a==="mr"){result=memory;expression=""}if(a==="mplus")memory+=current();
  if(a==="mminus")memory-=current();if(a==="ms")memory=current();
  localStorage.setItem("catMemory",memory);render()
}
function updateProgrammer(){let n=Math.trunc(current());$("#binOut").textContent=(n>>>0).toString(2);$("#hexOut").textContent=(n>>>0).toString(16).toUpperCase();$("#octOut").textContent=(n>>>0).toString(8)}
function programmer(op){let n=Math.trunc(current()),v=op==="and"?n&1:op==="or"?n|1:op==="xor"?n^1:op==="not"?~n:op==="shl"?n<<1:n>>1;result=v;expression="";render()}
function achievements(){return Math.min(5,(count>=1?1:0)+(count>=10?1:0)+(count>=100?1:0)+0+(Math.floor(xp/100)>=9?1:0))}
function renderHistory(){
  $("#historyList").innerHTML=history.length?history.map((h,i)=>`<div class="history-item" data-hi="${i}"><small>${h.t}</small>${h.e}<br><b>= ${format(h.r)}</b></div>`).join(""):"<p>Belum ada petualangan perhitungan.</p>";
}
function toast(t){const el=$("#toast");el.textContent=t;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1800)}
function click(ok=false){if(!sound)return;try{const c=new AudioContext(),o=c.createOscillator(),g=c.createGain();o.frequency.value=ok?740:420;g.gain.value=.035;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.07)}catch{}}
function setTheme(t){theme=t;document.body.classList.toggle("light",t==="light");localStorage.setItem("catTheme",t);$("#themeSelect").value=t}
function setupConverters(){
 const units={length:["m","km","cm","mm","mi"],weight:["kg","g","mg","lb"],temperature:["°C","°F","K"],area:["m²","km²","cm²"],volume:["L","mL","m³"],time:["s","min","h","day"],speed:["m/s","km/h","mph"],data:["B","KB","MB","GB"],energy:["J","kJ","cal"]};
 const type=$("#convertType").value,u=units[type];$("#convertFrom").innerHTML=u.map(x=>`<option>${x}</option>`).join("");$("#convertTo").innerHTML=u.map(x=>`<option>${x}</option>`).join("");convert()
}
function convert(){
 const type=$("#convertType").value,from=$("#convertFrom").value,to=$("#convertTo").value,x=Number($("#convertInput").value)||0;
 if(from===to){$("#convertResult").textContent=format(x);return}
 let v=x;
 if(type==="temperature"){if(from==="°C")v=x*9/5+32;if(from==="°F")v=(x-32)*5/9;if(from==="K")v=x-273.15;if(to==="°F"&&from==="K")v=(x-273.15)*9/5+32;if(to==="K"&&from==="°C")v=x+273.15;if(to==="K"&&from==="°F")v=(x-32)*5/9+273.15}
 else{
  const maps={length:{m:1,km:1000,cm:.01,mm:.001,mi:1609.344},weight:{kg:1,g:.001,mg:.000001,lb:.453592},area:{"m²":1,"km²":1e6,"cm²":1e-4},volume:{L:1,"mL":.001,"m³":1000},time:{s:1,min:60,h:3600,day:86400},speed:{"m/s":1,"km/h":.2777778,mph:.44704},data:{B:1,KB:1024,MB:1048576,GB:1073741824},energy:{J:1,kJ:1000,cal:4.184}};v=x*maps[type][from]/maps[type][to]
 }
 $("#convertResult").textContent=format(v)
}
$$(".keypad button").forEach(b=>b.addEventListener("click",()=>{let a=b.dataset.action,v=b.dataset.value;if(v!==undefined)add(v);else if(a==="equals")calculate();else if(a==="clear")clear();else if(a==="backspace")back();else if(a==="sign")sign();else if(a==="percent")percent()}));
$$(".memory-row button").forEach(b=>b.addEventListener("click",()=>memoryAction(b.dataset.action)));
$$("[data-fn]").forEach(b=>b.addEventListener("click",()=>scientific(b.dataset.fn)));
$$("[data-const]").forEach(b=>b.addEventListener("click",()=>constants(b.dataset.const)));
$$("[data-prog]").forEach(b=>b.addEventListener("click",()=>programmer(b.dataset.prog)));
$("#modeSelect").addEventListener("change",e=>{$("#scientific").classList.toggle("hidden",e.target.value!=="scientific");$("#programmer").classList.toggle("hidden",e.target.value!=="programmer");$("#converter").classList.toggle("hidden",e.target.value!=="converter");if(e.target.value==="converter")setupConverters()});
$("#historyBtn").onclick=()=>{$("#historyModal").classList.remove("hidden");renderHistory()};
$("#clearHistory").onclick=()=>{history=[];localStorage.setItem("catHistory","[]");renderHistory()};
$("#historyList").onclick=e=>{let el=e.target.closest("[data-hi]");if(el){result=history[el.dataset.hi].r;expression="";$("#historyModal").classList.add("hidden");render()}};
$("#settingsBtn").onclick=()=>$("#settingsModal").classList.remove("hidden");
$("#themeBtn").onclick=()=>setTheme(theme==="dark"?"light":"dark");
$("#soundBtn").onclick=()=>{sound=!sound;localStorage.setItem("catSound",sound?"1":"0");$("#soundBtn").textContent=sound?"🔊":"🔇"};
$$("[data-close]").forEach(b=>b.onclick=()=>$("#"+b.dataset.close).classList.add("hidden"));
$("#themeSelect").onchange=e=>setTheme(e.target.value);
$("#soundToggle").onchange=e=>{sound=e.target.checked;localStorage.setItem("catSound",sound?"1":"0");$("#soundBtn").textContent=sound?"🔊":"🔇"};
$("#decimalSelect").onchange=e=>localStorage.setItem("catDecimals",e.target.value);
$("#resetData").onclick=()=>{if(confirm("Reset semua data Cat Adventure?")){["catMemory","catHistory","catXP","catCount"].forEach(k=>localStorage.removeItem(k));location.reload()}};
["convertType","convertFrom","convertTo","convertInput"].forEach(id=>$("#"+id).addEventListener("change",convert));
document.addEventListener("keydown",e=>{if(e.key>="0"&&e.key<="9")add(e.key);else if("+-*/".includes(e.key))add(e.key);else if(e.key===".")add(".");else if(e.key==="%")percent();else if(e.key==="Enter")calculate();else if(e.key==="Escape")clear();else if(e.key==="Backspace")back()});
setTheme(theme);$("#soundToggle").checked=sound;$("#decimalSelect").value=localStorage.getItem("catDecimals")||"auto";render();
})();