// AKTIVITET-fliken
//   Del av Minnesbanken. Beroenden: core.js, drive.js, historik.js (logEntry/bindLogEntryActions
//   ägs av Historik-fliken, delas härifrån).
//   Laddas via <script src="js/aktivitet.js"> i rätt ordning (core.js/drive.js/historik.js först).

var openStatCat=null;

function getTodayRange(){
  var now=new Date();
  var start=new Date(now);start.setHours(0,0,0,0);
  var end=new Date(now);end.setHours(23,59,59,999);
  return {start:start,end:end};
}

// Auto-växande textarea: startar på en rad och växer i höjd efter innehållet.
function autoResizeTextarea(el){
  if(!el)return;
  el.style.height="auto";
  el.style.height=el.scrollHeight+"px";
}

// Shift+Enter loggar/sparar inlägget oavsett vilket inmatningsfält man står i.
// Använder addEventListener så eventuella befintliga onkeydown/onblur-hanterare på
// samma fält inte skrivs över.
function bindShiftEnterSubmit(el,submitFn){
  if(!el)return;
  el.addEventListener("keydown",function(e){
    if(e.key==="Enter"&&e.shiftKey){
      e.preventDefault();
      submitFn();
    }
  });
}

function updateHandelser(c){
  var wrap=document.getElementById("handelser-wrap");
  if(!wrap)return;
  wrap.innerHTML="<div class='mt20'>"+buildHandelser()+"</div>";
  window._handelserHtml=wrap.innerHTML;
  bindLogEntryActions(wrap,function(){updateHandelser(null);});
}

function showHandelserLoading(){
  var wrap=document.getElementById("handelser-wrap");
  if(wrap)wrap.innerHTML="<div class='mt20'><div style='padding:20px;text-align:center;color:#5c5c5c;font-size:13px'>⏳ Laddar...</div></div>";
}

// Händelser visar bara Aktivitet (ingen typ-växlare). Om dagens lista har färre än 5
// poster fylls det ut med de senaste tidigare aktiviteterna under en "Senaste"-rubrik.
function buildHandelser(){
  var wr=getTodayRange();
  var nyastForst=AKTIVITET_BETEENDE.handelserSortering!=="aldst";
  var todayLogs=logs.filter(function(l){var t=new Date(l.timestamp);return t>=wr.start&&t<=wr.end;}).sort(function(a,b){var diff=new Date(b.timestamp)-new Date(a.timestamp);return nyastForst?diff:-diff;});
  var html="<div class='lbl'>Handelser</div>";
  if(!todayLogs.length){html+="<div class='empty' style='padding:20px 0'>Inga aktiviteter idag.</div>";}
  else{html+=todayLogs.map(function(l){return logEntry(l);}).join("");}
  var todayLogIds={};todayLogs.forEach(function(l){todayLogIds[l.id]=true;});
  var remainingLogs=Math.max(0,5-todayLogs.length);
  var recentLogs=remainingLogs>0
    ?logs.filter(function(l){return !todayLogIds[l.id];}).sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);}).slice(0,remainingLogs)
    :[];
  if(recentLogs.length){
    html+="<div class='mt20'><div class='lbl' style='font-size:12px'>Senaste</div>"
      +recentLogs.map(function(l){return logEntry(l);}).join("")
      +"</div>";
  }
  return html;
}

function showClockOverlayFor(initH,initM,onSet){
  var ov=document.createElement("div");
  ov.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px";
  ov.innerHTML=
    "<div style='background:#161616;border-radius:20px;width:100%;max-width:320px;overflow:hidden'>"
    +"<div id='cl-display' style='background:#0a4a4a;padding:20px 24px;font-size:52px;font-weight:300;color:#fff;letter-spacing:2px;text-align:center'>"+String(initH).padStart(2,"0")+":"+String(initM).padStart(2,"0")+"</div>"
    +"<div style='display:flex;gap:0;border-bottom:1px solid #2a2a2a'>"
    +"<button id='cl-mode-h' style='flex:1;padding:10px;background:#1c3c5a;border:none;color:#4fa8ff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit'>Timmar</button>"
    +"<button id='cl-mode-m' style='flex:1;padding:10px;background:none;border:none;color:#5c5c5c;font-size:13px;cursor:pointer;font-family:inherit'>Minuter</button>"
    +"</div>"
    +"<div style='padding:16px;display:flex;justify-content:center'>"
    +"<canvas id='cl-canvas' width='240' height='240' style='touch-action:none;cursor:pointer'></canvas>"
    +"</div>"
    +"<div style='display:flex;justify-content:space-between;padding:12px 20px;border-top:1px solid #2a2a2a'>"
    +"<button id='cl-clear' style='background:none;border:none;color:#4fa8ff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit'>RENSA</button>"
    +"<div style='display:flex;gap:16px'>"
    +"<button id='cl-cancel' style='background:none;border:none;color:#4fa8ff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit'>AVBRYT</button>"
    +"<button id='cl-set' style='background:none;border:none;color:#4fa8ff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit'>VÄLJ</button>"
    +"</div></div></div>";
  document.body.appendChild(ov);
  var lh=initH,lm=initM,lmode="h";
  var canvas=ov.querySelector("#cl-canvas");
  var ctx=canvas.getContext("2d");
  var sz=240,cx=sz/2,cy=sz/2,r=sz/2-10,ri=r*0.58;
  function drawClock(){
    ctx.clearRect(0,0,sz,sz);
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.fillStyle="#1a2233";ctx.fill();
    var nums=lmode==="h"?
      [{v:12,a:-90},{v:1,a:-60},{v:2,a:-30},{v:3,a:0},{v:4,a:30},{v:5,a:60},{v:6,a:90},{v:7,a:120},{v:8,a:150},{v:9,a:180},{v:10,a:210},{v:11,a:240},
       {v:0,a:-90,inner:true},{v:13,a:-60,inner:true},{v:14,a:-30,inner:true},{v:15,a:0,inner:true},{v:16,a:30,inner:true},{v:17,a:60,inner:true},{v:18,a:90,inner:true},{v:19,a:120,inner:true},{v:20,a:150,inner:true},{v:21,a:180,inner:true},{v:22,a:210,inner:true},{v:23,a:240,inner:true}]:
      [{v:0,a:-90},{v:5,a:-60},{v:10,a:-30},{v:15,a:0},{v:20,a:30},{v:25,a:60},{v:30,a:90},{v:35,a:120},{v:40,a:150},{v:45,a:180},{v:50,a:210},{v:55,a:240}];
    var selVal=lmode==="h"?lh:lm;
    var selAngle=null;
    nums.forEach(function(n){
      var rad=n.a*Math.PI/180;
      var rr=n.inner?ri:r*0.82;
      var x=cx+rr*Math.cos(rad),y=cy+rr*Math.sin(rad);
      var isSel=(n.v===selVal);
      if(isSel)selAngle={x:x,y:y};
      ctx.beginPath();ctx.arc(x,y,18,0,Math.PI*2);
      ctx.fillStyle=isSel?"#4fa8ff":"transparent";ctx.fill();
      ctx.font=(isSel?"600 ":"400 ")+"14px system-ui";
      ctx.fillStyle=isSel?"#000":"#cfcfcf";
      ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillText(String(n.v).padStart(2,"0"),x,y);
    });
    if(selAngle){
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(selAngle.x,selAngle.y);
      ctx.strokeStyle="#4fa8ff";ctx.lineWidth=2;ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cy,4,0,Math.PI*2);ctx.fillStyle="#4fa8ff";ctx.fill();
    }
    var disp=ov.querySelector("#cl-display");
    if(disp)disp.textContent=String(lh).padStart(2,"0")+":"+String(lm).padStart(2,"0");
  }
  drawClock();
  function setMode(m){
    lmode=m;
    ov.querySelector("#cl-mode-h").style.background=m==="h"?"#1c3c5a":"none";
    ov.querySelector("#cl-mode-h").style.color=m==="h"?"#4fa8ff":"#5c5c5c";
    ov.querySelector("#cl-mode-m").style.background=m==="m"?"#1c3c5a":"none";
    ov.querySelector("#cl-mode-m").style.color=m==="m"?"#4fa8ff":"#5c5c5c";
    drawClock();
  }
  ov.querySelector("#cl-mode-h").onclick=function(){setMode("h");};
  ov.querySelector("#cl-mode-m").onclick=function(){setMode("m");};
  function pickFromEvent(e){
    var rect=canvas.getBoundingClientRect();
    var cx2=(e.touches?e.touches[0].clientX:e.clientX)-rect.left;
    var cy2=(e.touches?e.touches[0].clientY:e.clientY)-rect.top;
    var scaleX=sz/rect.width,scaleY=sz/rect.height;
    var px=cx2*scaleX-cx,py=cy2*scaleY-cy;
    var dist=Math.sqrt(px*px+py*py);
    var angle=Math.atan2(py,px)*180/Math.PI+90;if(angle<0)angle+=360;
    if(lmode==="h"){
      var inner=dist<(ri+r*0.82)/2;
      var h=Math.round(angle/30)%12;
      lh=inner?(h===0?0:h+12):(h===0?12:h);
    }else{lm=Math.round(angle/6)%60;}
    drawClock();
  }
  canvas.addEventListener("click",pickFromEvent);
  canvas.addEventListener("touchend",function(e){e.preventDefault();pickFromEvent({clientX:e.changedTouches[0].clientX,clientY:e.changedTouches[0].clientY});},{passive:false});
  ov.querySelector("#cl-clear").onclick=function(){lh=0;lm=0;drawClock();};
  ov.querySelector("#cl-cancel").onclick=function(){ov.remove();};
  ov.querySelector("#cl-set").onclick=function(){ov.remove();if(onSet)onSet(lh,lm);};
}

function refreshCatDropdown(){
  var lc=document.getElementById("body");
  if(!lc)return;
  var sel=lc.querySelector("#cat-preset");
  if(!sel)return;
  sel.innerHTML="<option value=''>Välj kategori</option>"
    +CATS.map(function(ct){return "<option value='"+esc(ct.id)+"'"+(ct.id===cat?" selected":"")+">"+esc(ct.e)+" "+esc(ct.label)+"</option>";}).join("");
}
function formatTidpunkt(val){
  var digits=val.replace(/\D/g,"");
  if(!digits)return "";
  while(digits.length<4)digits=digits+"0";
  digits=digits.slice(0,4);
  return digits.slice(0,2)+":"+digits.slice(2,4);
}

function bindTidpunktInp(inp){
  if(!inp)return;
  inp.onblur=function(){
    if(inp.value.trim())inp.value=formatTidpunkt(inp.value);
  };
  inp.onkeydown=function(e){
    if(e.key==="Enter"&&inp.value.trim())inp.value=formatTidpunkt(inp.value);
  };
}

// ---- Aktivitet-flikens egna inställningar (Kategorier, senare Kategori-snabbval/Beteende/Fält) ----
// Sparas som ett helt eget data.json i Aktivitet/Installningar - fristående, ingen koppling
// till "shared"/Installningar-fliken. Byggd direkt på de generella Drive-hjälparna i drive.js
// (driveMkdir/DRIVE_API/DRIVE_UPLOAD/accessToken) utan att röra drive.js DRIVE_STRUCTURE-register.
var AKTIVITET_FALT={plats:true,anteckning:true,bild:true};
var AKTIVITET_BETEENDE={standardKategori:"",kameraRiktning:"environment",handelserSortering:"nyast"};
var aktivitetSettingsLoaded=false;

async function ensureAktivitetSettingsLoaded(){
  if(aktivitetSettingsLoaded||!accessToken)return;
  aktivitetSettingsLoaded=true;
  try{
    var aktId=await driveMkdir("Aktivitet",FOLDER_ID);
    var folderId=await driveMkdir("Installningar",aktId);
    var q="name='data.json' and '"+folderId+"' in parents and trashed=false";
    var r=await fetch(DRIVE_API+"?q="+encodeURIComponent(q)+"&fields=files(id)",{headers:{Authorization:"Bearer "+accessToken}});
    var d=await r.json();
    if(!(d.files&&d.files.length))return;
    var r2=await fetch(DRIVE_API+"/"+d.files[0].id+"?alt=media",{headers:{Authorization:"Bearer "+accessToken}});
    var text=await r2.text();
    if(!text||!text.trim())return;
    var parsed=JSON.parse(text);
    if(parsed.cats&&parsed.cats.length)CATS=parsed.cats;
    if(parsed.falt)AKTIVITET_FALT=Object.assign({plats:true,anteckning:true,bild:true},parsed.falt);
    if(parsed.beteende)AKTIVITET_BETEENDE=Object.assign({standardKategori:"",kameraRiktning:"environment",handelserSortering:"nyast"},parsed.beteende);
    if(document.getElementById("body")&&view==="aktivitet")renderLogAktivitet();
  }catch(e){console.error("Kunde inte läsa Aktivitet-inställningar:",e);}
}

async function saveAktivitetSettings(){
  if(!accessToken)return;
  try{
    var aktId=await driveMkdir("Aktivitet",FOLDER_ID);
    var folderId=await driveMkdir("Installningar",aktId);
    var q="name='data.json' and '"+folderId+"' in parents and trashed=false";
    var r=await fetch(DRIVE_API+"?q="+encodeURIComponent(q)+"&fields=files(id)",{headers:{Authorization:"Bearer "+accessToken}});
    var d=await r.json();
    var body=JSON.stringify({cats:CATS,falt:AKTIVITET_FALT,beteende:AKTIVITET_BETEENDE});
    if(d.files&&d.files.length){
      await fetch(DRIVE_UPLOAD+"/"+d.files[0].id+"?uploadType=media",{method:"PATCH",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},body:body});
    }else{
      var form=new FormData();
      form.append("metadata",new Blob([JSON.stringify({name:"data.json",parents:[folderId],mimeType:"application/json"})],{type:"application/json"}));
      form.append("file",new Blob([body],{type:"application/json"}));
      await fetch(DRIVE_UPLOAD+"?uploadType=multipart&fields=id",{method:"POST",headers:{Authorization:"Bearer "+accessToken},body:form});
    }
  }catch(e){console.error("Kunde inte spara Aktivitet-inställningar:",e);}
}

// ---- PNG-kopior av bilder i egen toppnivå-mapp "PNG" ----
// Additivt: bilder sparas fortsatt som vanligt i Bilder-domänen (imageHist/saveImageToDrive),
// men en konverterad PNG-kopia laddas ÄVEN upp till en separat mapp som heter "PNG".
async function ensurePngFolder(){
  return driveMkdir("PNG",FOLDER_ID);
}
function base64ToPngBase64(base64,mtype){
  return new Promise(function(resolve,reject){
    var img=new Image();
    img.onload=function(){
      var canvas=document.createElement("canvas");
      canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
      canvas.getContext("2d").drawImage(img,0,0);
      resolve(canvas.toDataURL("image/png").split(",")[1]);
    };
    img.onerror=function(){reject(new Error("Kunde inte avkoda bilden"));};
    img.src="data:"+(mtype||"image/jpeg")+";base64,"+base64;
  });
}
function buildPngFilename(imgMeta){
  var d=new Date(imgMeta.timestamp);
  var yy=String(d.getFullYear()).slice(-2);
  var mm=String(d.getMonth()+1).padStart(2,"0");
  var dd=String(d.getDate()).padStart(2,"0");
  var title=(imgMeta.activity||"bild").replace(/[^a-zA-Zåäö0-9_\- ]/g,"").trim().slice(0,40)||"bild";
  return yy+"-"+mm+"-"+dd+"_"+title+".png";
}
async function saveImagePngCopy(imgMeta,base64,mtype){
  if(!accessToken||!base64)return false;
  try{
    var pngFolderId=await ensurePngFolder();
    var pngBase64=await base64ToPngBase64(base64,mtype);
    var binary=atob(pngBase64);
    var bytes=new Uint8Array(binary.length);
    for(var i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    var blob=new Blob([bytes],{type:"image/png"});
    var form=new FormData();
    form.append("metadata",new Blob([JSON.stringify({name:buildPngFilename(imgMeta),parents:[pngFolderId],mimeType:"image/png"})],{type:"application/json"}));
    form.append("file",blob);
    var r=await fetch(DRIVE_UPLOAD+"?uploadType=multipart&fields=id",{method:"POST",headers:{Authorization:"Bearer "+accessToken},body:form});
    var d=await r.json();
    return !!d.id;
  }catch(e){
    console.error("PNG-kopia kunde inte sparas:",e);
    return false;
  }
}

// Lokal, kompakt emoji-lista för kategori-inställningarna (fristående kopia - rör inte
// core.js/downloadEmojiRef, som äger den fullständiga emoji-referensen).
var AKTIVITET_EMOJI_GROUPS=[
  ["Ansikten & känslor","😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😎 🥳 😏 😢 😭 😤 😠 🤔 😴 🤩 🥺"],
  ["Sport & aktivitet","⚽ 🏀 🏈 🎾 🏓 🏸 🎣 🥊 🏋️ 🧘 🏄 🚴 🏊 🏆 🎯 🎮 🎨 🎵 🎬 📚 ✍️"],
  ["Mat & dryck","🍎 🍊 🍇 🍓 🥑 🥗 🍔 🍕 🍣 🍜 🍰 ☕ 🍵 🍺 🍷 🥤"],
  ["Natur & djur","🌲 🌸 🌞 🌙 ⭐ 🌈 ❄️ 🔥 💧 🐶 🐱 🐦 🦋 🐟"],
  ["Vardag & objekt","🏠 🚗 💼 💻 📱 🛏 🧹 🧺 🛒 🔧 💡 📷 🎁 🕒 💰 📈 ✨"]
];
function openEmojiPicker(onSelect){
  var ov=document.createElement("div");
  ov.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:flex-end;justify-content:center";
  ov.innerHTML="<div style='background:#161616;border-radius:20px 20px 0 0;width:100%;max-width:460px;max-height:75vh;display:flex;flex-direction:column'>"
    +"<div style='padding:14px 18px;border-bottom:1px solid #2a2a2a;display:flex;align-items:center;justify-content:space-between;flex-shrink:0'>"
    +"<div style='font-size:15px;font-weight:600;color:#f2f2f2'>Välj emoji</div>"
    +"<button id='ep-close' style='background:none;border:none;color:#5c5c5c;font-size:20px;cursor:pointer;line-height:1'>✕</button>"
    +"</div>"
    +"<div style='padding:14px 18px;overflow-y:auto'>"
    +AKTIVITET_EMOJI_GROUPS.map(function(g){
      return "<div style='font-size:11px;color:#5c5c5c;font-weight:600;margin:10px 0 6px;text-transform:uppercase;letter-spacing:.5px'>"+g[0]+"</div>"
        +"<div style='display:flex;flex-wrap:wrap;gap:4px'>"
        +g[1].split(" ").map(function(e){
          return "<button data-emoji-pick='"+e+"' style='background:none;border:none;font-size:24px;padding:5px;border-radius:8px;cursor:pointer;line-height:1'>"+e+"</button>";
        }).join("")
        +"</div>";
    }).join("")
    +"</div>"
    +"</div>";
  document.body.appendChild(ov);
  ov.querySelector("#ep-close").onclick=function(){ov.remove();};
  ov.addEventListener("mousedown",function(e){if(e.target===ov)ov.remove();});
  ov.querySelectorAll("[data-emoji-pick]").forEach(function(btn){
    btn.onclick=function(){
      if(onSelect)onSelect(btn.dataset.emojiPick);
      ov.remove();
    };
  });
}

// ---- Subtab-navigering: Logga / Bilder / (inställningar-kugghjul) ----
var aktivitetSubtab="logga";

function aktivitetSubtabNavHtml(){
  return "<div style='display:flex;gap:6px;margin-bottom:14px;align-items:center'>"
    +"<button class='mode-btn"+(aktivitetSubtab==="logga"?" on":"")+"' data-subtab='logga' style='flex:1;padding:9px 4px;font-size:12px'>📝 Logga</button>"
    +"<button class='mode-btn"+(aktivitetSubtab==="bilder"?" on":"")+"' data-subtab='bilder' style='flex:1;padding:9px 4px;font-size:12px'>📷 Bilder</button>"
    +"<button id='aktivitet-settings-btn' type='button' title='Inställningar' style='background:none;border:none;color:#6b6880;font-size:20px;cursor:pointer;padding:4px 6px;line-height:1;flex-shrink:0'>⚙️</button>"
    +"</div>";
}
function bindAktivitetSubtabNav(c){
  c.querySelectorAll("[data-subtab]").forEach(function(btn){
    btn.onclick=function(){
      aktivitetSubtab=btn.dataset.subtab;
      renderLogAktivitet();
    };
  });
  var settingsBtn=c.querySelector("#aktivitet-settings-btn");
  if(settingsBtn)settingsBtn.onclick=function(){showAktivitetSettings();};
}

function renderLogAktivitet(){
  var c=document.getElementById("body");
  ensureAktivitetSettingsLoaded();
  if(aktivitetSubtab==="bilder"){renderAktivitetBilderTab(c);return;}
  renderAktivitetLoggaTab(c);
}

// ---- Bilder-flik: ta/ladda upp bilder fristående från loggningen ----
function renderAktivitetBilderTab(c){
  var sorted=imageHist.slice().sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);});
  var grid=!sorted.length
    ? "<div class='empty' style='padding:24px 0;text-align:center;color:#5c5c5c;font-size:13px'>Inga bilder ännu.</div>"
    : "<div style='display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px'>"
      +sorted.map(function(img){
        var inner=img.base64
          ?"<img src='data:"+(img.mtype||"image/jpeg")+";base64,"+img.base64+"' data-bimg-view='"+img.id+"' style='width:100%;height:120px;object-fit:cover;display:block;cursor:pointer'/>"
          :"<div data-bimg-fetch='"+img.id+"' style='width:100%;height:120px;display:flex;align-items:center;justify-content:center;color:#5c5c5c;font-size:12px'>⏳ Laddar bild...</div>";
        return "<div style='background:#131313;border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;position:relative'>"
          +inner
          +"<button data-bimg-delete='"+img.id+"' title='Ta bort' style='position:absolute;top:4px;right:4px;background:rgba(10,10,10,0.7);border:none;color:#d97a83;border-radius:6px;width:22px;height:22px;font-size:13px;cursor:pointer;line-height:1'>×</button>"
          +"<div style='padding:6px 8px;font-size:11px;color:#f2f2f2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>"+esc(img.activity||"")+"</div>"
          +"</div>";
      }).join("")
      +"</div>";

  c.innerHTML=aktivitetSubtabNavHtml()
    +"<div id='bt-initial-btns' style='display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px'>"
    +"<label style='display:block;padding:12px;background:#131313;border:1px solid #2a2a2a;border-radius:10px;text-align:center;cursor:pointer;font-size:13px;color:#f2f2f2'>"
    +"📁 Ladda upp<input type='file' id='bt-imgfile' accept='image/*' multiple style='display:none'/></label>"
    +"<button id='bt-open-camera-btn' type='button' style='padding:12px;background:#131313;border:1px solid #2a2a2a;border-radius:10px;text-align:center;cursor:pointer;font-size:13px;color:#f2f2f2;font-family:inherit'>📷 Ta bild</button>"
    +"</div>"
    +"<div id='bt-camera-container' style='display:none;margin-bottom:10px'>"
    +"<video id='bt-camera-video' autoplay playsinline style='width:100%;border-radius:10px;max-height:260px;object-fit:contain;background:#000'></video>"
    +"<div style='display:flex;gap:8px;margin-top:8px' id='bt-camera-live-controls'>"
    +"<button id='bt-snap-btn' type='button' style='flex:1;padding:10px;border-radius:10px;background:#4fa8ff;border:none;color:#0a0a0a;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit'>📸 Ta foto</button>"
    +"<button id='bt-switch-camera-btn' type='button' title='Byt kamera' style='padding:10px 14px;border-radius:10px;background:#131313;border:1px solid #2a2a2a;color:#f2f2f2;font-size:16px;cursor:pointer;font-family:inherit'>🔄</button>"
    +"<button id='bt-close-camera-btn' type='button' style='padding:10px 14px;border-radius:10px;background:#131313;border:1px solid #2a2a2a;color:#d97a83;font-size:13px;cursor:pointer;font-family:inherit'>✕</button>"
    +"</div>"
    +"<div id='bt-camera-confirm' style='display:none'>"
    +"<img id='bt-camera-confirm-img' style='width:100%;border-radius:10px;max-height:260px;object-fit:contain;background:#000'/>"
    +"<div style='display:flex;gap:8px;margin-top:8px'>"
    +"<button id='bt-confirm-keep-btn' type='button' style='flex:1;padding:10px;border-radius:10px;background:#4fa8ff;border:none;color:#0a0a0a;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit'>✓ Behåll</button>"
    +"<button id='bt-confirm-retake-btn' type='button' style='flex:1;padding:10px;border-radius:10px;background:#131313;border:1px solid #2a2a2a;color:#f2f2f2;font-size:14px;cursor:pointer;font-family:inherit'>↺ Ta om</button>"
    +"</div>"
    +"</div>"
    +"</div>"
    +"<canvas id='bt-snap-canvas' style='display:none'></canvas>"
    +"<div id='bt-imgpreview'></div>"
    +"<div id='bt-imgonly-form' style='display:none'>"
    +"<div class='lbl'>Titel</div>"
    +"<input class='inp w100' id='bt-title' placeholder='Skriv en titel...' style='margin-bottom:8px'/>"
    +"<button class='cta-log' id='bt-save' style='width:100%;margin-bottom:14px'>Spara bild</button>"
    +"</div>"
    +"<div id='bt-fz'></div>"
    +grid;

  bindAktivitetSubtabNav(c);

  var pendingBt=[]; // {base64,mtype}

  function refreshBtPreview(){
    var prev=c.querySelector("#bt-imgpreview");
    var form=c.querySelector("#bt-imgonly-form");
    if(!prev)return;
    prev.innerHTML="";
    pendingBt.forEach(function(img,i){
      var wrap=document.createElement("div");
      wrap.style.cssText="position:relative;display:inline-block;margin:0 6px 6px 0";
      var im=document.createElement("img");
      im.src="data:"+img.mtype+";base64,"+img.base64;
      im.style.cssText="width:80px;height:80px;object-fit:cover;border-radius:8px;display:block";
      var rb=document.createElement("button");
      rb.textContent="×";
      rb.style.cssText="position:absolute;top:-6px;right:-6px;background:#d97a83;border:none;color:#0a0a0a;border-radius:50%;width:20px;height:20px;font-size:12px;cursor:pointer;line-height:1";
      rb.onclick=function(){pendingBt.splice(i,1);refreshBtPreview();};
      wrap.appendChild(im);wrap.appendChild(rb);
      prev.appendChild(wrap);
    });
    if(form)form.style.display=pendingBt.length?"block":"none";
  }

  function handleBtFiles(files){
    if(!files||!files.length)return;
    Array.from(files).forEach(function(file){
      var reader=new FileReader();
      reader.onload=function(e){
        pendingBt.push({base64:e.target.result.split(",")[1],mtype:file.type||"image/jpeg"});
        refreshBtPreview();
      };
      reader.readAsDataURL(file);
    });
  }

  var imgfileEl=c.querySelector("#bt-imgfile");
  if(imgfileEl)imgfileEl.onchange=function(){if(imgfileEl.files&&imgfileEl.files.length)handleBtFiles(imgfileEl.files);};

  // Kamera via getUserMedia
  var btCameraStream=null;
  var btCameraFacingMode=AKTIVITET_BETEENDE.kameraRiktning==="user"?"user":"environment";
  var btSnapBase64=null;
  var camContainer=c.querySelector("#bt-camera-container");
  var camVideo=c.querySelector("#bt-camera-video");
  var snapCanvas=c.querySelector("#bt-snap-canvas");
  var liveControls=c.querySelector("#bt-camera-live-controls");
  var confirmView=c.querySelector("#bt-camera-confirm");
  var confirmImg=c.querySelector("#bt-camera-confirm-img");
  var initialBtns=c.querySelector("#bt-initial-btns");
  var snapBtn=c.querySelector("#bt-snap-btn");

  function stopBtCamera(){
    if(btCameraStream){btCameraStream.getTracks().forEach(function(t){t.stop();});btCameraStream=null;}
    if(camContainer)camContainer.style.display="none";
    if(confirmView)confirmView.style.display="none";
    if(liveControls)liveControls.style.display="flex";
    if(camVideo)camVideo.style.display="block";
    if(initialBtns)initialBtns.style.display="grid";
    btSnapBase64=null;
  }
  function updateSnapCount(){
    if(snapBtn)snapBtn.textContent=pendingBt.length?"📸 Ta foto ("+pendingBt.length+" tagna)":"📸 Ta foto";
  }
  function returnToLiveView(){
    btSnapBase64=null;
    if(camVideo)camVideo.style.display="block";
    if(liveControls)liveControls.style.display="flex";
    if(confirmView)confirmView.style.display="none";
    updateSnapCount();
  }
  function startBtCamera(facingMode){
    navigator.mediaDevices.getUserMedia({video:{facingMode:facingMode},audio:false})
      .then(function(stream){
        if(btCameraStream)btCameraStream.getTracks().forEach(function(t){t.stop();});
        btCameraStream=stream;btCameraFacingMode=facingMode;
        if(camVideo){camVideo.srcObject=stream;camVideo.style.display="block";}
        if(camContainer)camContainer.style.display="block";
        if(liveControls)liveControls.style.display="flex";
        if(confirmView)confirmView.style.display="none";
        if(initialBtns)initialBtns.style.display="none";
        updateSnapCount();
      })
      .catch(function(){alert("Kunde inte starta kameran.");});
  }
  var openCamBtn=c.querySelector("#bt-open-camera-btn");
  if(openCamBtn)openCamBtn.onclick=function(){
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){alert("Kameran stöds inte i denna webbläsare.");return;}
    startBtCamera(btCameraFacingMode);
  };
  var switchCamBtn=c.querySelector("#bt-switch-camera-btn");
  if(switchCamBtn)switchCamBtn.onclick=function(){startBtCamera(btCameraFacingMode==="environment"?"user":"environment");};
  var closeCamBtn=c.querySelector("#bt-close-camera-btn");
  if(closeCamBtn)closeCamBtn.onclick=stopBtCamera;
  if(snapBtn)snapBtn.onclick=function(){
    if(!camVideo||!snapCanvas)return;
    snapCanvas.width=camVideo.videoWidth;snapCanvas.height=camVideo.videoHeight;
    snapCanvas.getContext("2d").drawImage(camVideo,0,0);
    btSnapBase64=snapCanvas.toDataURL("image/jpeg",0.92).split(",")[1];
    if(confirmImg)confirmImg.src="data:image/jpeg;base64,"+btSnapBase64;
    if(camVideo)camVideo.style.display="none";
    if(liveControls)liveControls.style.display="none";
    if(confirmView)confirmView.style.display="block";
  };
  var retakeBtn=c.querySelector("#bt-confirm-retake-btn");
  if(retakeBtn)retakeBtn.onclick=returnToLiveView;
  var keepBtn=c.querySelector("#bt-confirm-keep-btn");
  if(keepBtn)keepBtn.onclick=function(){
    if(!btSnapBase64)return;
    pendingBt.push({base64:btSnapBase64,mtype:"image/jpeg"});
    refreshBtPreview();
    // Fortsätt kameran live så man kan ta fler bilder på raken - stäng med ✕ när man är klar.
    returnToLiveView();
  };

  var saveBtn=c.querySelector("#bt-save");
  async function saveBtImages(){
    if(!pendingBt.length)return;
    var titleInp=c.querySelector("#bt-title");
    var baseTitle=(titleInp&&titleInp.value.trim())||"Bild";
    var now=Date.now();
    var newImgs=pendingBt.map(function(img,i){
      var title=pendingBt.length===1?baseTitle:baseTitle+(i+1);
      return {meta:{id:now+i,logId:null,activity:title,category:"",mtype:img.mtype,timestamp:new Date(now+i).toISOString(),driveId:null},base64:img.base64,mtype:img.mtype};
    });
    newImgs.forEach(function(x){
      var newImg=Object.assign({base64:x.base64},x.meta);
      imageHist.unshift(newImg);
    });
    saveAndSync("bilder");
    pendingBt=[];
    if(titleInp)titleInp.value="";
    var fz=c.querySelector("#bt-fz");
    if(fz){fz.innerHTML="<div class='ok-toast'>Sparat!</div>";setTimeout(function(){if(fz)fz.innerHTML="";},2200);}
    renderAktivitetBilderTab(c);
    if(accessToken){
      for(var k=0;k<newImgs.length;k++){
        var target=imageHist.find(function(x){return x.id===newImgs[k].meta.id;});
        if(target)await saveImageToDrive(target);
        await saveImagePngCopy(newImgs[k].meta,newImgs[k].base64,newImgs[k].mtype);
      }
      await saveAndSync("bilder");
    }
  }
  if(saveBtn)saveBtn.onclick=saveBtImages;
  bindShiftEnterSubmit(c.querySelector("#bt-title"),saveBtImages);

  // Visa bild i fullskärm (hämtar från Drive om base64 inte finns lokalt)
  c.querySelectorAll("[data-bimg-view]").forEach(function(imgEl){
    imgEl.onclick=function(){
      var id=Number(imgEl.dataset.bimgView);
      var img=imageHist.find(function(x){return x.id===id;});
      if(!img)return;
      var ov=document.createElement("div");
      ov.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.92);z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px";
      ov.innerHTML="<img src='data:"+(img.mtype||"image/jpeg")+";base64,"+img.base64+"' style='max-width:100%;max-height:80vh;border-radius:10px;object-fit:contain'/>"
        +"<div style='color:#f2f2f2;font-size:13px;margin-top:12px'>"+esc(img.activity||"")+"</div>"
        +"<button id='biv-close' style='margin-top:16px;background:none;border:1px solid #2a2a2a;color:#f2f2f2;border-radius:10px;padding:8px 20px;font-size:13px;cursor:pointer'>Stäng</button>";
      document.body.appendChild(ov);
      ov.querySelector("#biv-close").onclick=function(){ov.remove();};
      ov.addEventListener("mousedown",function(e){if(e.target===ov)ov.remove();});
    };
  });
  c.querySelectorAll("[data-bimg-fetch]").forEach(function(placeholder){
    var imgId=Number(placeholder.dataset.bimgFetch);
    var img=imageHist.find(function(i){return i.id===imgId;});
    if(!img)return;
    loadImageBase64(img).then(function(b64){
      if(!b64||!placeholder.isConnected)return;
      var el=document.createElement("img");
      el.src="data:"+(img.mtype||"image/jpeg")+";base64,"+b64;
      el.style.cssText="width:100%;height:120px;object-fit:cover;display:block;cursor:pointer";
      el.dataset.bimgView=String(imgId);
      el.onclick=function(){
        var ov=document.createElement("div");
        ov.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.92);z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px";
        ov.innerHTML="<img src='data:"+(img.mtype||"image/jpeg")+";base64,"+b64+"' style='max-width:100%;max-height:80vh;border-radius:10px;object-fit:contain'/>"
          +"<div style='color:#f2f2f2;font-size:13px;margin-top:12px'>"+esc(img.activity||"")+"</div>"
          +"<button id='biv-close' style='margin-top:16px;background:none;border:1px solid #2a2a2a;color:#f2f2f2;border-radius:10px;padding:8px 20px;font-size:13px;cursor:pointer'>Stäng</button>";
        document.body.appendChild(ov);
        ov.querySelector("#biv-close").onclick=function(){ov.remove();};
        ov.addEventListener("mousedown",function(e){if(e.target===ov)ov.remove();});
      };
      placeholder.replaceWith(el);
    }).catch(function(){
      if(placeholder.isConnected)placeholder.textContent="⚠️ Kunde inte ladda bilden";
    });
  });

  // Ta bort bild
  c.querySelectorAll("[data-bimg-delete]").forEach(function(btn){
    btn.onclick=function(e){
      e.stopPropagation();
      var id=Number(btn.dataset.bimgDelete);
      confirmDelete("Ta bort den här bilden?",function(){
        imageHist=imageHist.filter(function(x){return x.id!==id;});
        saveAndSync("bilder");
        renderAktivitetBilderTab(c);
      });
    };
  });
}

// ---- Logga-flik: formuläret för att logga en aktivitet ----
function renderAktivitetLoggaTab(c){
  // Save current Händelser content before overwriting
  var savedHandelser=window._handelserHtml||"";
  var catChips=CATS.map(function(ct){return "<button class='chip"+(ct.id===cat?" on":"")+"' data-cat='"+ct.id+"'>"+ct.e+" "+ct.label+"</button>";}).join("");
  if(!cat&&AKTIVITET_BETEENDE.standardKategori)cat=AKTIVITET_BETEENDE.standardKategori;

  var platsHtml=!AKTIVITET_FALT.plats?"":(
    "<div class='lbl'>Plats (valfritt)</div>"
    +"<div style='display:flex;gap:6px;margin-bottom:10px'>"
    +"<div class='ac-wrap' style='flex-shrink:0'><button class='chip' id='pi-preset-toggle' type='button' style='background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 12px;cursor:pointer;font-family:inherit;white-space:nowrap;line-height:1'>Välj plats ▾</button><div class='ac-dropdown' id='pi-preset-dd' style='min-width:200px'></div></div>"
    +"<input class='inp w100' id='pi' placeholder='T.ex. Gymmet, Hemma...' style='flex:1'/>"
    +"<button class='chip' id='pi-preset-add' type='button' style='flex-shrink:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 14px;cursor:pointer;font-family:inherit;line-height:1'>+</button>"
    +"</div>"
  );
  var anteckningHtml=!AKTIVITET_FALT.anteckning?"":(
    "<div class='lbl'>Anteckning (valfritt)</div>"
    +"<div style='display:flex;gap:6px;margin-bottom:10px'>"
    +"<div class='ac-wrap' style='flex:1'><textarea class='inp w100' id='ni' placeholder='Egna tankar eller kommentarer...' rows='1' style='resize:none;overflow:hidden;min-height:44px;line-height:1.4;font-family:inherit'></textarea><div class='ac-dropdown' id='ni-ac'></div></div>"
    +"<button class='chip' id='ni-add-btn' type='button' style='flex-shrink:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 14px;cursor:pointer;font-family:inherit;line-height:1'>+</button>"
    +"</div>"
  );
  var bildHtml="";

  c.innerHTML=aktivitetSubtabNavHtml()
    +"<div class='lbl'>Kategori</div>"
    +"<select id='cat-preset' style='width:100%;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:14px;padding:10px 12px;cursor:pointer;font-family:inherit;margin-bottom:10px'>"
    +"<option value=''>"+(cat?"":"Välj Kategori")+"</option>"
    +CATS.map(function(ct){return "<option value='"+esc(ct.id)+"'"+(ct.id===cat?" selected":"")+">"+esc(ct.e)+" "+esc(ct.label)+"</option>";}).join("")
    +"</select>"
    +"<div class='lbl'>Aktivitet</div>"
    +"<div class='row'>"
    +"<div class='ac-wrap' style='flex-shrink:0'><button class='chip' id='ci-preset-toggle' type='button' style='background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 12px;cursor:pointer;font-family:inherit;max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1'>Snabbval ▾</button><div class='ac-dropdown' id='ci-preset-dd' style='min-width:200px'></div></div>"
    +"<input class='inp w100' id='ci' placeholder='Vad gjorde du?' style='flex:1'/>"
    +"<button class='chip' id='ci-preset-add' type='button' style='flex-shrink:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 14px;cursor:pointer;font-family:inherit;line-height:1'>+</button>"
    +"</div>"
    +"<div style='display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px'>"
    +"<div>"
    +"<div class='lbl'>Tidpunkt</div>"
    +"<button id='aktivtid-btn' style='width:100%;padding:9px;border-radius:10px;background:#131313;border:1px solid #2a2a2a;color:#f2f2f2;font-size:13px;cursor:pointer;font-family:inherit;margin-bottom:6px'>⏱ Aktiv Tid</button>"
    +"<input class='inp w100' id='tidpunkt-inp' placeholder='HH:MM' maxlength='5' style='text-align:center;font-size:16px;font-weight:600;letter-spacing:2px'/>"
    +"</div>"
    +"<div>"
    +"<div class='lbl'>Tidslängd</div>"
    +"<button id='open-clock-btn' style='width:100%;padding:9px;border-radius:10px;background:#131313;border:1px solid #2a2a2a;color:#f2f2f2;font-size:13px;cursor:pointer;font-family:inherit;margin-bottom:6px'>⏰ Välj tid</button>"
    +"<input class='inp w100' id='tidslangd-inp' placeholder='t.ex. 1h 30m' style='text-align:center;font-size:14px;font-weight:600'/>"
    +"</div>"
    +"</div>"
    +"<input type='hidden' id='ti' value=''>"
    +platsHtml
    +anteckningHtml
    +bildHtml
    +"<button id='addbtn' class='cta-log'><span class='cta-log-text'>Logga</span><span class='cta-log-plus'>+</span></button>"
    +"<div id='fz'></div>"
    +"<div id='handelser-wrap'></div>";
  // Restore or init Händelser
  var wrap=document.getElementById("handelser-wrap");
  if(wrap){
    if(savedHandelser){
      wrap.innerHTML=savedHandelser;
      bindLogEntryActions(wrap,function(){updateHandelser(null);});
    } else {
      showHandelserLoading();
    }
  }
  var catPresetSel=c.querySelector("#cat-preset");
  if(catPresetSel){catPresetSel.value=cat||"";catPresetSel.onchange=function(){
    if(!catPresetSel.value)return;
    cat=catPresetSel.value;
    renderLogAktivitet();
  };}
  var selectedTid='';
  c.querySelectorAll("[data-tid]").forEach(function(btn){
    btn.onclick=function(){
      selectedTid=selectedTid===btn.dataset.tid?'':btn.dataset.tid;
      c.querySelectorAll("[data-tid]").forEach(function(b){b.classList.toggle('on',b.dataset.tid===selectedTid);});
      var ti=document.getElementById('ti');if(ti)ti.value=selectedTid;
    };
  });

  var ni=c.querySelector("#ni");
  var ci=c.querySelector("#ci");

  function logOrSaveImageOnly(){
    if(ci.value.trim())addAct(ci.value.trim());
  }
  ci.onkeydown=function(e){if(e.key==="Enter")logOrSaveImageOnly();};
  c.querySelector("#addbtn").onclick=logOrSaveImageOnly;
  bindShiftEnterSubmit(ci,logOrSaveImageOnly);
  if(ni){
    ni.addEventListener("input",function(){autoResizeTextarea(ni);});
    autoResizeTextarea(ni);
    bindShiftEnterSubmit(ni,logOrSaveImageOnly);
  }
  if(ni)ni.onkeydown=function(e){if(e.key==="Enter"){e.preventDefault();logOrSaveImageOnly();}};
  // Kategori-specifika snabbval (varje kategori har sin egen lista, med X för att ta bort)
  bindCatPresetDropdown(c.querySelector("#ci"),c.querySelector("#ci-preset-toggle"),c.querySelector("#ci-preset-dd"),c.querySelector("#ci-preset-add"),function(){return ACT_PRESETS_BY_CAT;},function(){return cat;},"inmatningar");
  bindCatPresetDropdown(c.querySelector("#pi"),c.querySelector("#pi-preset-toggle"),c.querySelector("#pi-preset-dd"),c.querySelector("#pi-preset-add"),function(){return PLACE_PRESETS_BY_CAT;},function(){return cat;},"inmatningar");
  bindShiftEnterSubmit(c.querySelector("#pi"),logOrSaveImageOnly);
  // Kategori-specifika förslag för Anteckning
  bindAutocomplete(c.querySelector("#ni"),c.querySelector("#ni-ac"),function(){return ANTECKNING_BY_CAT[cat]||[];},function(v){if(ANTECKNING_BY_CAT[cat])ANTECKNING_BY_CAT[cat]=ANTECKNING_BY_CAT[cat].filter(function(x){return x!==v;});saveAndSync("inmatningar");},function(v){if(ci.value.trim())addAct(ci.value.trim());});
  var niAddBtn=c.querySelector("#ni-add-btn");
  if(niAddBtn)niAddBtn.onclick=function(){
    var niEl=c.querySelector("#ni");
    var v=niEl?niEl.value.trim():"";
    if(!v)return;
    if(!ANTECKNING_BY_CAT[cat])ANTECKNING_BY_CAT[cat]=[];
    ANTECKNING_BY_CAT[cat]=pushInmatningHistory(ANTECKNING_BY_CAT[cat],v);
    saveAndSync("inmatningar");
  };
  // Aktiv Tid button
  var aktivTidBtn=c.querySelector("#aktivtid-btn");
  var tidpunktInp=c.querySelector("#tidpunkt-inp");
  if(aktivTidBtn)aktivTidBtn.onclick=function(){
    var now=new Date();
    var hh=String(now.getHours()).padStart(2,"0");
    var mm=String(now.getMinutes()).padStart(2,"0");
    if(tidpunktInp)tidpunktInp.value=hh+":"+mm;
    updateTidFromInputs();
  };
  if(tidpunktInp)tidpunktInp.oninput=function(){updateTidFromInputs();};
  bindTidpunktInp(tidpunktInp);
  bindShiftEnterSubmit(tidpunktInp,logOrSaveImageOnly);

  // Clock overlay for Tidslängd
  var clockH=0,clockM=0,clockMode="h"; // h=hours, m=minutes
  function parseTidslangd(str){
    var h=0,m=0;
    var hm=str.match(/(\d+)\s*h/i);var mm=str.match(/(\d+)\s*m/i);
    if(hm)h=parseInt(hm[1]);
    if(mm)m=parseInt(mm[1]);
    if(!hm&&!mm){var col=str.match(/^(\d+):(\d+)$/);if(col){h=parseInt(col[1]);m=parseInt(col[2]);}}
    return {h:h,m:m};
  }

  function updateTidFromInputs(){
    var hi=c.querySelector("#ti");
    var tp=tidpunktInp?tidpunktInp.value.trim():"";
    var dur=(clockH>0||clockM>0)?(clockH+"h "+clockM+"m").trim():"";
    var parts=[];
    if(tp)parts.push(tp);
    if(dur)parts.push(dur);
    if(hi)hi.value=parts.join(" | ");
    var tinp=c.querySelector("#tidslangd-inp");
    if(tinp&&(clockH>0||clockM>0))tinp.value=clockH+"h "+clockM+"m";
    var btn=c.querySelector("#open-clock-btn");
    if(btn)btn.textContent=(clockH>0||clockM>0)?"⏰ "+String(clockH).padStart(2,"0")+":"+String(clockM).padStart(2,"0"):"⏰ Välj tid";
  }

  var tidslangdInp=c.querySelector("#tidslangd-inp");
  if(tidslangdInp){
    tidslangdInp.oninput=function(){
      var parsed=parseTidslangd(tidslangdInp.value);
      clockH=parsed.h;clockM=parsed.m;
      var hi=c.querySelector("#ti");
      var tp=tidpunktInp?tidpunktInp.value.trim():"";
      var dur=(clockH>0||clockM>0)?(clockH+"h "+clockM+"m"):"";
      var parts=[];if(tp)parts.push(tp);if(dur)parts.push(dur);
      if(hi)hi.value=parts.join(" | ");
      var btn=c.querySelector("#open-clock-btn");
      if(btn)btn.textContent=(clockH>0||clockM>0)?"⏰ "+String(clockH).padStart(2,"0")+":"+String(clockM).padStart(2,"0"):"⏰ Välj tid";
    };
    bindShiftEnterSubmit(tidslangdInp,logOrSaveImageOnly);
  }

  var openClockBtn=c.querySelector("#open-clock-btn");
  if(openClockBtn)openClockBtn.onclick=function(){
    showClockOverlayFor(clockH,clockM,function(h,m){
      clockH=h;clockM=m;updateTidFromInputs();
      var tinp=c.querySelector("#tidslangd-inp");
      if(tinp)tinp.value=clockH>0||clockM>0?clockH+"h "+clockM+"m":"";
    });
  };

  bindAktivitetSubtabNav(c);
}

// ---- Inställningspanel: Kategorier (lägg till/ta bort/ändra, chip-baserad) ----
function showAktivitetSettings(){
  var wCats=CATS.map(function(ct){return {id:ct.id,label:ct.label,e:ct.e};});
  var editIdx=null;

  var ov=document.createElement("div");
  ov.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:24px 16px;overflow-y:auto";

  function slugify(label){
    var base=label.toLowerCase().replace(/[åä]/g,"a").replace(/ö/g,"o").replace(/[^a-z0-9]+/g,"")||"kat";
    var id=base,n=2;
    while(wCats.some(function(c){return c.id===id;})){id=base+n;n++;}
    return id;
  }

  function catChipsHtml(){
    if(!wCats.length)return "<div class='empty' style='padding:8px 0;font-size:12px;color:#5c5c5c'>Inga kategorier kvar - lägg till minst en nedan.</div>";
    return "<div style='display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px'>"
      +wCats.map(function(ct,i){
        if(i===editIdx){
          return "<span style='display:inline-flex;align-items:center;gap:4px;background:#1c3c5a;border:1px solid #4fa8ff;border-radius:8px;padding:4px 4px 4px 6px'>"
            +"<input id='as-edit-emoji' readonly value='"+esc(ct.e)+"' style='width:28px;background:none;border:none;color:#f2f2f2;font-size:13px;text-align:center;padding:2px 0;cursor:pointer'/>"
            +"<input id='as-edit-label' value='"+esc(ct.label)+"' style='width:90px;background:none;border:none;color:#f2f2f2;font-size:13px;padding:2px 0'/>"
            +"<button id='as-edit-confirm' title='Klar' style='background:none;border:none;color:#4fa8ff;cursor:pointer;font-size:14px;padding:2px'>✓</button>"
            +"</span>";
        }
        return "<span data-cat-chip-idx='"+i+"' style='display:inline-flex;align-items:center;gap:6px;background:#131313;border:1px solid #2a2a2a;border-radius:8px;padding:6px 6px 6px 10px;cursor:pointer;font-size:13px;color:#f2f2f2'>"
          +esc(ct.e)+" "+esc(ct.label)
          +"<button data-cat-remove-idx='"+i+"' title='Ta bort' style='background:none;border:none;color:#d97a83;cursor:pointer;font-size:13px;padding:0 2px;line-height:1'>×</button>"
          +"</span>";
      }).join("")
      +"</div>";
  }

  function panelHtml(){
    return "<div style='background:#161616;border-radius:20px;width:100%;max-width:420px;overflow:hidden'>"
      +"<div style='padding:16px 20px;border-bottom:1px solid #2a2a2a;display:flex;align-items:center;justify-content:space-between'>"
      +"<div style='font-size:16px;font-weight:600;color:#f2f2f2'>⚙️ Inställningar — Aktivitet</div>"
      +"<button id='as-close' style='background:none;border:none;color:#5c5c5c;font-size:20px;cursor:pointer;line-height:1'>✕</button>"
      +"</div>"
      +"<div style='padding:20px;max-height:70vh;overflow-y:auto'>"

      +"<div class='lbl'>Kategorier</div>"
      +"<div style='font-size:12px;color:#5c5c5c;margin-bottom:8px'>Tryck på en kategori för att ändra emoji/namn, eller × för att ta bort.</div>"
      +catChipsHtml()
      +"<div style='display:flex;gap:6px;margin-bottom:4px'>"
      +"<input class='inp' id='as-newcat-emoji' readonly placeholder='🏷️' style='width:38px;text-align:center;padding:7px 2px;font-size:13px;flex-shrink:0;cursor:pointer'/>"
      +"<input class='inp' id='as-newcat-label' placeholder='Ny kategori...' style='flex:1;padding:7px 10px;font-size:13px'/>"
      +"<button class='chip' id='as-newcat-add' type='button' style='flex-shrink:0;padding:7px 12px;font-size:13px'>+</button>"
      +"</div>"

      +"</div>"
      +"<div style='padding:16px 20px;border-top:1px solid #2a2a2a;display:flex;gap:10px'>"
      +"<button id='as-cancel' class='sec ghost' style='flex:1'>Avbryt</button>"
      +"<button id='as-save' class='cta-log' style='flex:1'>Spara</button>"
      +"</div>"
      +"</div>";
  }

  function commitEdit(){
    if(editIdx===null)return;
    var lEl=ov.querySelector("#as-edit-label");
    if(lEl&&wCats[editIdx])wCats[editIdx].label=lEl.value.trim()||wCats[editIdx].label;
    editIdx=null;
  }

  function bindPanel(){
    ov.querySelector("#as-close").onclick=function(){ov.remove();};
    ov.querySelector("#as-cancel").onclick=function(){ov.remove();};

    ov.querySelectorAll("[data-cat-chip-idx]").forEach(function(chip){
      chip.onclick=function(e){
        if(e.target.closest("[data-cat-remove-idx]"))return;
        commitEdit();
        editIdx=Number(chip.dataset.catChipIdx);
        rerender();
        var lEl=ov.querySelector("#as-edit-label");
        if(lEl){lEl.focus();lEl.select();}
      };
    });
    ov.querySelectorAll("[data-cat-remove-idx]").forEach(function(btn){
      btn.onclick=function(e){
        e.stopPropagation();
        var i=Number(btn.dataset.catRemoveIdx);
        if(!wCats[i])return;
        wCats.splice(i,1);
        if(editIdx===i)editIdx=null;else if(editIdx!==null&&editIdx>i)editIdx--;
        rerender();
      };
    });
    var confirmBtn=ov.querySelector("#as-edit-confirm");
    if(confirmBtn)confirmBtn.onclick=function(){commitEdit();rerender();};
    var editLabelEl=ov.querySelector("#as-edit-label");
    if(editLabelEl)editLabelEl.onkeydown=function(e){if(e.key==="Enter"){commitEdit();rerender();}};
    var editEmojiEl=ov.querySelector("#as-edit-emoji");
    if(editEmojiEl)editEmojiEl.onclick=function(){
      openEmojiPicker(function(e){
        if(wCats[editIdx]){wCats[editIdx].e=e;rerender();}
      });
    };

    var newCatEmojiEl=ov.querySelector("#as-newcat-emoji");
    if(newCatEmojiEl)newCatEmojiEl.onclick=function(){
      openEmojiPicker(function(e){newCatEmojiEl.value=e;});
    };
    ov.querySelector("#as-newcat-add").onclick=function(){
      var labelInp=ov.querySelector("#as-newcat-label");
      var emojiInp=ov.querySelector("#as-newcat-emoji");
      var label=labelInp.value.trim();
      if(!label)return;
      var e=emojiInp.value.trim()||"✨";
      wCats.push({id:slugify(label),label:label,e:e});
      rerender();
    };
    var newLabelEl=ov.querySelector("#as-newcat-label");
    if(newLabelEl)newLabelEl.onkeydown=function(e){if(e.key==="Enter")ov.querySelector("#as-newcat-add").click();};

    ov.querySelector("#as-save").onclick=function(){
      commitEdit();
      if(!wCats.length){alert("Du måste ha minst en kategori kvar.");return;}
      CATS=wCats;
      if(!wCats.some(function(c){return c.id===cat;}))cat=wCats[0].id;
      saveAktivitetSettings();
      ov.remove();
      renderLogAktivitet();
    };
  }

  function rerender(){
    ov.innerHTML=panelHtml();
    bindPanel();
  }

  rerender();
  document.body.appendChild(ov);
}

function addAct(activity){
  var ni=document.querySelector("#ni");
  var ti=document.querySelector("#ti");
  var pi=document.querySelector("#pi");
  var tidpunktInp=document.querySelector("#tidpunkt-inp");
  var tp=buildLogTimestamp(tidpunktInp?tidpunktInp.value:"");
  if(!tp.ok){
    showInfoPopup("Ogiltig tidpunkt",tp.message);
    return;
  }
  var hh=String(tp.date.getHours()).padStart(2,"0");
  var mm=String(tp.date.getMinutes()).padStart(2,"0");
  if(tidpunktInp)tidpunktInp.value=hh+":"+mm;
  var durationPart="";
  if(ti&&ti.value.indexOf(" | ")>-1)durationPart=ti.value.split(" | ").slice(1).join(" | ");
  var timeStr=hh+":"+mm+(durationPart?(" | "+durationPart):"");
  if(ti)ti.value=timeStr;
  var logId=Date.now();
  logs.unshift({id:logId,category:cat,activity:activity,time:timeStr,place:pi?pi.value.trim():"",note:ni?ni.value.trim():"",timestamp:tp.date.toISOString()});
  var inmatningChanged=false;
  var newAktHist=pushInmatningHistory(aktivitetHistory,activity);
  if(newAktHist!==aktivitetHistory){aktivitetHistory=newAktHist;inmatningChanged=true;}
  if(pi&&pi.value.trim()){platsHistory=pushInmatningHistory(platsHistory,pi.value.trim());inmatningChanged=true;}
  if(inmatningChanged)saveAndSync("inmatningar");
  saveAndSync("aktiviteter");hdr();
  updateHandelser(null);
  var fz=document.getElementById("fz");
  if(fz){fz.innerHTML="<div class='ok-toast'>Loggad: "+esc(activity)+"</div>";setTimeout(function(){if(fz)fz.innerHTML="";},2200);}
  resetLogForm();
}

function resetLogForm(){
  var ci=document.getElementById("ci");if(ci)ci.value="";
  var ti=document.getElementById("ti");if(ti)ti.value="";
  var tidpunkt=document.getElementById("tidpunkt-inp");if(tidpunkt)tidpunkt.value="";
  var tidslangd=document.getElementById("tidslangd-inp");if(tidslangd)tidslangd.value="";
  var pi=document.getElementById("pi");if(pi)pi.value="";
  var ni=document.getElementById("ni");if(ni){ni.value="";autoResizeTextarea(ni);}
}
