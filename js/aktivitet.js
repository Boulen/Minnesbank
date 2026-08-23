var openStatCat=null;
var handelserType="aktivitet";

function getTodayRange(){
  var now=new Date();
  var start=new Date(now);start.setHours(0,0,0,0);
  var end=new Date(now);end.setHours(23,59,59,999);
  return {start:start,end:end};
}

function updateHandelser(c){
  var wrap=document.getElementById("handelser-wrap");
  if(!wrap)return;
  wrap.innerHTML="<div class='mt20'>"+buildHandelser()+"</div>";
  window._handelserHtml=wrap.innerHTML;
  wrap.querySelectorAll("[data-handtype]").forEach(function(btn){
    btn.onclick=function(){handelserType=btn.dataset.handtype;updateHandelser(null);};
  });
  bindLogEntryActions(wrap,function(){updateHandelser(null);});
  wrap.querySelectorAll("[data-jumpsamtal]").forEach(function(el){
    el.onclick=function(){setView("samtal");Promise.all([loadTab("samtaltext"),loadTab("samtalmuntligt")]).then(function(){renderSamtalTop();});};
  });
  wrap.querySelectorAll("[data-jumpfund]").forEach(function(el){
    el.onclick=function(){jumpToFundInHistory(Number(el.dataset.jumpfund));};
  });
  wrap.querySelectorAll("[data-jumpimg]").forEach(function(el){
    el.onclick=function(){jumpToImgInHistory(Number(el.dataset.jumpimg));};
  });
  wrap.querySelectorAll("[data-imgfetch]").forEach(function(placeholder){
    var imgId=Number(placeholder.dataset.imgfetch);
    var img=imageHist.find(function(i){return i.id===imgId;});
    if(!img)return;
    loadImageBase64(img).then(function(b64){
      if(!b64||!placeholder.isConnected)return;
      var el=document.createElement("img");
      el.src="data:"+(img.mtype||"image/jpeg")+";base64,"+b64;
      el.style.cssText="width:100%;max-height:180px;object-fit:cover;display:block";
      placeholder.replaceWith(el);
    }).catch(function(){
      if(placeholder.isConnected)placeholder.textContent="⚠️ Kunde inte ladda bilden";
    });
  });
}

function showHandelserLoading(){
  var wrap=document.getElementById("handelser-wrap");
  if(wrap)wrap.innerHTML="<div class='mt20'><div style='padding:20px;text-align:center;color:#5c5c5c;font-size:13px'>⏳ Laddar...</div></div>";
}

function buildHandelser(){
  var wr=getTodayRange();
  var typeChips="<div style='display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:14px'>"
    +"<button class='mode-btn"+(handelserType==="aktivitet"?" on":"")+"' data-handtype='aktivitet' style='padding:8px 4px;font-size:11px'>Aktivitet</button>"
    +"<button class='mode-btn"+(handelserType==="samtal"?" on":"")+"' data-handtype='samtal' style='padding:8px 4px;font-size:11px'>Samtal</button>"
    +"<button class='mode-btn"+(handelserType==="funderingar"?" on":"")+"' data-handtype='funderingar' style='padding:8px 4px;font-size:11px'>Fundering</button>"
    +"<button class='mode-btn"+(handelserType==="bilder"?" on":"")+"' data-handtype='bilder' style='padding:8px 4px;font-size:11px'>Bilder</button>"
    +"</div>";

  var html="<div class='lbl'>Handelser</div>"+typeChips;

  if(handelserType==="aktivitet"){
    var todayLogs=logs.filter(function(l){var t=new Date(l.timestamp);return t>=wr.start&&t<=wr.end;}).sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);});
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
  } else if(handelserType==="samtal"){
    var allKonvs=konversationer.map(function(k){return {id:k.id,type:"text",name:k.name,timestamp:k.timestamp,count:k.messages.length};})
      .concat(muntKonversationer.map(function(k){return {id:k.id,type:"muntligt",name:k.name,timestamp:k.timestamp,count:(k.entries||[]).length};}));
    var todayConvs=allKonvs.filter(function(cv){var t=new Date(cv.timestamp);return t>=wr.start&&t<=wr.end;});
    var convRow=function(cv){
      return "<div data-jumpsamtal='"+cv.id+"' style='cursor:pointer;padding:10px 14px;background:#131313;border:1px solid #2a2a2a;border-radius:10px;margin-bottom:8px;display:flex;align-items:center;gap:10px'>"
        +"<span style='font-size:18px'>"+(cv.type==="muntligt"?"🗣️":"💬")+"</span><div style='flex:1;min-width:0'>"
        +"<div style='font-size:13px;color:#f2f2f2;font-weight:500'>"+esc(cv.name)+"</div>"
        +"<div style='font-size:10px;color:#5c5c5c;margin-top:2px'>"+fd(cv.timestamp)+" · "+cv.count+(cv.type==="muntligt"?" poster":" meddelanden")+"</div></div>"
        +"<span style='font-size:13px;color:#5c5c5c'>&#8594;</span></div>";
    };
    if(!todayConvs.length){html+="<div class='empty' style='padding:20px 0'>Inga samtal idag.</div>";}
    else{todayConvs.forEach(function(cv){html+=convRow(cv);});}
    var todayConvIds={};todayConvs.forEach(function(cv){todayConvIds[cv.id]=true;});
    var remainingConvs=Math.max(0,5-todayConvs.length);
    var recentConvs=remainingConvs>0
      ?allKonvs.filter(function(cv){return !todayConvIds[cv.id];}).sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);}).slice(0,remainingConvs)
      :[];
    if(recentConvs.length){
      html+="<div class='mt20'><div class='lbl' style='font-size:12px'>Senaste</div>";
      recentConvs.forEach(function(cv){html+=convRow(cv);});
      html+="</div>";
    }
  } else if(handelserType==="funderingar"){
    var todayFund=fundHist.filter(function(f){var t=new Date(f.timestamp);return t>=wr.start&&t<=wr.end;});
    var fundRow2=function(f){
      var preview=f.text.length>60?f.text.slice(0,60)+"...":f.text;
      return "<div data-jumpfund='"+f.id+"' style='cursor:pointer;padding:10px 14px;background:#131313;border:1px solid #2a2a2a;border-radius:10px;margin-bottom:8px;display:flex;align-items:center;gap:10px'>"
        +"<span style='font-size:18px'>💭</span><div style='flex:1;min-width:0'>"
        +"<div style='font-size:13px;color:#f2f2f2'>"+esc(preview)+"</div>"
        +"<div style='font-size:10px;color:#5c5c5c;margin-top:4px'>"+fd(f.timestamp)+"</div></div>"
        +"<span style='font-size:13px;color:#5c5c5c'>&#8594;</span></div>";
    };
    if(!todayFund.length){html+="<div class='empty' style='padding:20px 0'>Inga funderingar idag.</div>";}
    else{todayFund.forEach(function(f){html+=fundRow2(f);});}
    var todayFundIds={};todayFund.forEach(function(f){todayFundIds[f.id]=true;});
    var remainingFund=Math.max(0,5-todayFund.length);
    var recentFund=remainingFund>0
      ?fundHist.filter(function(f){return !todayFundIds[f.id];}).sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);}).slice(0,remainingFund)
      :[];
    if(recentFund.length){
      html+="<div class='mt20'><div class='lbl' style='font-size:12px'>Senaste</div>";
      recentFund.forEach(function(f){html+=fundRow2(f);});
      html+="</div>";
    }
  } else if(handelserType==="bilder"){
    var todayImgs=imageHist.filter(function(i){var t=new Date(i.timestamp);return t>=wr.start&&t<=wr.end;});
    var imgRow=function(img){
      var inner=img.base64
        ?"<img src='data:"+(img.mtype||"image/jpeg")+";base64,"+img.base64+"' style='width:100%;max-height:180px;object-fit:cover;display:block'/>"
        :"<div data-imgfetch='"+img.id+"' style='width:100%;height:120px;display:flex;align-items:center;justify-content:center;color:#5c5c5c;font-size:12px'>⏳ Laddar bild...</div>";
      return "<div data-jumpimg='"+img.id+"' style='background:#131313;border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;margin-bottom:10px;cursor:pointer'>"
        +inner
        +"<div style='padding:8px 12px;font-size:12px;color:#f2f2f2'>"+esc(img.activity||"")+"</div>"
        +"</div>";
    };
    if(!todayImgs.length){html+="<div class='empty' style='padding:20px 0'>Inga bilder idag.</div>";}
    else{todayImgs.forEach(function(img){html+=imgRow(img);});}
    var todayImgIds={};todayImgs.forEach(function(img){todayImgIds[img.id]=true;});
    var remainingImgs=Math.max(0,5-todayImgs.length);
    var recentImgs=remainingImgs>0
      ?imageHist.filter(function(img){return !todayImgIds[img.id];}).sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);}).slice(0,remainingImgs)
      :[];
    if(recentImgs.length){
      html+="<div class='mt20'><div class='lbl' style='font-size:12px'>Senaste</div>";
      recentImgs.forEach(function(img){html+=imgRow(img);});
      html+="</div>";
    }
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
    +CAT_PRESETS.map(function(p){var ct=CATS.find(function(x){return x.e+" "+x.label===p||x.id===p;});var id=ct?ct.id:p;return "<option value='"+esc(id)+"'"+(id===cat?" selected":"")+">"+esc(p)+"</option>";}).join("");
}
function formatTidpunkt(val){
  // Remove all non-digits
  var digits=val.replace(/\D/g,"");
  if(!digits)return "";
  // Pad to 4 digits with zeros
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

function renderLogAktivitet(){
  var c=document.getElementById("body");
  // Save current Händelser content before overwriting
  var savedHandelser=window._handelserHtml||"";
  var catChips=CATS.map(function(ct){return "<button class='chip"+(ct.id===cat?" on":"")+"' data-cat='"+ct.id+"'>"+ct.e+" "+ct.label+"</button>";}).join("");

  c.innerHTML="<div class='lbl'>Kategori</div>"
    +"<select id='cat-preset' style='width:100%;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:14px;padding:10px 12px;cursor:pointer;font-family:inherit;margin-bottom:10px'>"
    +"<option value=''>"+function(){if(!cat)return "Välj Kategori";var p=CAT_PRESETS.find(function(x){var ct=CATS.find(function(c){return c.id===cat;});return x===cat||(ct&&(x===ct.e+" "+ct.label||x.indexOf(" ")>-1&&x.split(" ").slice(1).join(" ")===ct.label));});return p||getCatDisplay(cat)||"Välj Kategori";}()+"</option>"
    +CAT_PRESETS.map(function(p){var ct=CATS.find(function(x){return x.e+" "+x.label===p||x.id===p;});var id=ct?ct.id:p;return "<option value='"+esc(id)+"'>"+esc(p)+"</option>";}).join("")
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
    +"<div class='lbl'>Plats (valfritt)</div>"
    +"<div style='display:flex;gap:6px;margin-bottom:10px'>"
    +"<div class='ac-wrap' style='flex-shrink:0'><button class='chip' id='pi-preset-toggle' type='button' style='background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 12px;cursor:pointer;font-family:inherit;white-space:nowrap;line-height:1'>Välj plats ▾</button><div class='ac-dropdown' id='pi-preset-dd' style='min-width:200px'></div></div>"
    +"<input class='inp w100' id='pi' placeholder='T.ex. Gymmet, Hemma...' style='flex:1'/>"
    +"<button class='chip' id='pi-preset-add' type='button' style='flex-shrink:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 14px;cursor:pointer;font-family:inherit;line-height:1'>+</button>"
    +"</div>"
    +"<div class='lbl'>Anteckning (valfritt)</div>"
    +"<div style='display:flex;gap:6px;margin-bottom:10px'>"
    +"<div class='ac-wrap' style='flex:1'><input class='inp w100' id='ni' placeholder='Egna tankar eller kommentarer...'/><div class='ac-dropdown' id='ni-ac'></div></div>"
    +"<button class='chip' id='ni-add-btn' type='button' style='flex-shrink:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 14px;cursor:pointer;font-family:inherit;line-height:1'>+</button>"
    +"</div>"
    +"<div class='lbl mt8'>Bild (valfritt)</div>"
    +"<div style='display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px'>"
    +"<label style='display:block;padding:10px;background:#131313;border:1px solid #2a2a2a;border-radius:10px;text-align:center;cursor:pointer;font-size:13px;color:#f2f2f2'>"
    +"📁 Ladda upp bild"
    +"<input type='file' id='imgfile' accept='image/*' multiple style='display:none'/></label>"
    +"<button id='open-camera-btn' type='button' style='padding:10px;background:#131313;border:1px solid #2a2a2a;border-radius:10px;text-align:center;cursor:pointer;font-size:13px;color:#f2f2f2;font-family:inherit;width:100%'>📷 Ta bild</button>"
    +"</div>"
    +"<div id='camera-container' style='display:none;margin-bottom:10px'>"
    +"<video id='camera-video' autoplay playsinline style='width:100%;border-radius:10px;max-height:240px;object-fit:contain;background:#000'></video>"
    +"<div style='display:flex;gap:8px;margin-top:8px' id='camera-live-controls'>"
    +"<button id='snap-btn' type='button' style='flex:1;padding:10px;border-radius:10px;background:#4fa8ff;border:none;color:#0a0a0a;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit'>📸 Ta foto</button>"
    +"<button id='switch-camera-btn' type='button' title='Byt kamera' style='padding:10px 14px;border-radius:10px;background:#131313;border:1px solid #2a2a2a;color:#f2f2f2;font-size:16px;cursor:pointer;font-family:inherit'>🔄</button>"
    +"<button id='close-camera-btn' type='button' style='padding:10px 14px;border-radius:10px;background:#131313;border:1px solid #2a2a2a;color:#d97a83;font-size:13px;cursor:pointer;font-family:inherit'>✕</button>"
    +"</div>"
    +"<div id='camera-confirm' style='display:none'>"
    +"<img id='camera-confirm-img' style='width:100%;border-radius:10px;max-height:240px;object-fit:contain;background:#000'/>"
    +"<div style='display:flex;gap:8px;margin-top:8px'>"
    +"<button id='confirm-keep-btn' type='button' style='flex:1;padding:10px;border-radius:10px;background:#4fa8ff;border:none;color:#0a0a0a;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit'>✓ Behåll</button>"
    +"<button id='confirm-retake-btn' type='button' style='flex:1;padding:10px;border-radius:10px;background:#131313;border:1px solid #2a2a2a;color:#f2f2f2;font-size:14px;cursor:pointer;font-family:inherit'>↺ Ta om</button>"
    +"</div>"
    +"</div>"
    +"</div>"
    +"<canvas id='snap-canvas' style='display:none'></canvas>"
    +"<div id='imgpreview'></div>"
    +"<div id='imgonly-form' style='display:none'>"
    +"<div class='lbl'>Titel på bilden</div>"
    +"<input class='inp w100' id='imgonly-title' placeholder='Skriv en titel...' style='margin-bottom:8px'/>"
    +"<button class='sec ghost' id='saveimgonly' style='width:100%;margin-bottom:10px'>Spara bara bilden</button>"
    +"</div>"
    +"<button id='addbtn' class='cta-log'><span class='cta-log-text'>Logga</span><span class='cta-log-plus'>+</span></button>"
    +"<div id='fz'></div>"
    +"<div id='handelser-wrap'></div>";
  // Restore or init Händelser
  var wrap=document.getElementById("handelser-wrap");
  if(wrap){
    if(savedHandelser){
      wrap.innerHTML=savedHandelser;
      // Re-bind buttons
      wrap.querySelectorAll("[data-handtype]").forEach(function(btn){
        btn.onclick=function(){handelserType=btn.dataset.handtype;updateHandelser(null);};
      });
      bindLogEntryActions(wrap,function(){updateHandelser(null);});
      wrap.querySelectorAll("[data-jumpsamtal]").forEach(function(el){el.onclick=function(){setView("samtal");Promise.all([loadTab("samtaltext"),loadTab("samtalmuntligt")]).then(function(){renderSamtalTop();});};});
      wrap.querySelectorAll("[data-jumpfund]").forEach(function(el){el.onclick=function(){jumpToFundInHistory(Number(el.dataset.jumpfund));};});
      wrap.querySelectorAll("[data-jumpimg]").forEach(function(el){el.onclick=function(){jumpToImgInHistory(Number(el.dataset.jumpimg));};});
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
  c.querySelectorAll("[data-handtype]").forEach(function(btn){
    btn.onclick=function(){handelserType=btn.dataset.handtype;openStatCat=null;updateHandelser(c);};
  });
  async function logOrSaveImageOnly(){
    if(typeof commitPendingSnap==="function")commitPendingSnap();
    if(ci.value.trim()){addAct(ci.value.trim());return;}
    var imgs=pendingImgs&&pendingImgs.length?pendingImgs:(pendingImgBase64?[{base64:pendingImgBase64,mtype:pendingImgType||"image/jpeg"}]:[]);
    if(!imgs.length)return;
    var titleVal=(ni&&ni.value.trim())||"Bild";
    var now=Date.now();
    var newImgs=imgs.map(function(img,i){
      var title=imgs.length===1?titleVal:titleVal+" ("+(i+1)+")";
      return {id:now+i,logId:null,activity:title,category:cat,base64:img.base64,mtype:img.mtype,timestamp:new Date(now+i).toISOString(),driveId:null};
    });
    newImgs.forEach(function(newImg){imageHist.unshift(newImg);});
    pendingImgBase64=null;pendingImgType=null;pendingImgs=[];
    saveAndSync("aktiviteter");
    var fz=c.querySelector("#fz");
    if(fz){fz.innerHTML="<div class='ok-toast'>"+(imgs.length>1?imgs.length+" bilder sparade!":"Bild sparad!")+"</div>";setTimeout(function(){if(fz)fz.innerHTML="";},2200);}
    renderLogAktivitet();
    if(accessToken){
      var failCount=0;
      for(var k=0;k<newImgs.length;k++){
        var ok=await saveImageToDrive(newImgs[k]);
        if(!ok)failCount++;
      }
      await saveAndSync("bilder");
      if(failCount>0){
        var fz2=document.getElementById("fz");
        if(fz2)fz2.innerHTML="<div class='ok-toast' style='background:#4a1a1a;border-color:#d97a83;color:#d97a83'>⚠️ "+failCount+" av "+newImgs.length+" bilder kunde inte laddas upp till Drive</div>";
      }
    }
  }
  ci.onkeydown=function(e){if(e.key==="Enter")logOrSaveImageOnly();};
  c.querySelector("#addbtn").onclick=logOrSaveImageOnly;
  ni.onkeydown=function(e){if(e.key==="Enter"){e.preventDefault();logOrSaveImageOnly();}};
  // Preset dropdowns
  // Kategori-specifika snabbval (varje kategori har sin egen lista, med X för att ta bort)
  bindCatPresetDropdown(c.querySelector("#ci"),c.querySelector("#ci-preset-toggle"),c.querySelector("#ci-preset-dd"),c.querySelector("#ci-preset-add"),function(){return ACT_PRESETS_BY_CAT;},function(){return cat;},"inmatningar");
  bindCatPresetDropdown(c.querySelector("#pi"),c.querySelector("#pi-preset-toggle"),c.querySelector("#pi-preset-dd"),c.querySelector("#pi-preset-add"),function(){return PLACE_PRESETS_BY_CAT;},function(){return cat;},"inmatningar");
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

  // Clock overlay for Tidslängd
  var clockH=0,clockM=0,clockMode="h"; // h=hours, m=minutes
  function parseTidslangd(str){
    var h=0,m=0;
    var hm=str.match(/(\d+)\s*h/i);var mm=str.match(/(\d+)\s*m/i);
    if(hm)h=parseInt(hm[1]);
    if(mm)m=parseInt(mm[1]);
    // Also handle HH:MM format
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
    // Sync tidslangd text input
    var tinp=c.querySelector("#tidslangd-inp");
    if(tinp&&(clockH>0||clockM>0))tinp.value=clockH+"h "+clockM+"m";
    var btn=c.querySelector("#open-clock-btn");
    if(btn)btn.textContent=(clockH>0||clockM>0)?"⏰ "+String(clockH).padStart(2,"0")+":"+String(clockM).padStart(2,"0"):"⏰ Välj tid";
  }

  // Bind tidslangd text input — parse manual entry
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
  }

  var openClockBtn=c.querySelector("#open-clock-btn");
  if(openClockBtn)openClockBtn.onclick=function(){
    showClockOverlayFor(clockH,clockM,function(h,m){
      clockH=h;clockM=m;updateTidFromInputs();
      var tinp=c.querySelector("#tidslangd-inp");
      if(tinp)tinp.value=clockH>0||clockM>0?clockH+"h "+clockM+"m":"";
    });
  };

  // Image handler (shared for both file and camera)
  function handleImageFiles(files){
    if(!files||!files.length)return;
    files=Array.from(files);
    pendingImgs=new Array(files.length);
    var prev=c.querySelector("#imgpreview");
    if(prev)prev.innerHTML="";
    var loaded=0;
    files.forEach(function(file,fi){
      var reader=new FileReader();
      reader.onload=function(e){
        var dataUrl=e.target.result;
        pendingImgs[fi]={base64:dataUrl.split(",")[1],mtype:file.type||"image/jpeg"};
        loaded++;
        if(prev){
          var img=document.createElement("img");
          img.src=dataUrl;
          img.style.cssText="width:100%;border-radius:10px;margin-bottom:6px;max-height:160px;object-fit:cover;display:block";
          prev.appendChild(img);
        }
        if(loaded===files.length){
          pendingImgBase64=pendingImgs[0].base64;
          pendingImgType=pendingImgs[0].mtype;
          var imgForm=c.querySelector("#imgonly-form");
          if(imgForm)imgForm.style.display="block";
          var rb=document.createElement("button");
          rb.style.cssText="font-size:11px;color:#d97a83;background:none;border:none;cursor:pointer;margin-bottom:8px;display:block";
          rb.textContent="✕ Ta bort "+(files.length>1?files.length+" bilder":"bild");
          rb.onclick=function(){
            pendingImgBase64=null;pendingImgType=null;pendingImgs=[];
            if(prev)prev.innerHTML="";
            var imgForm2=c.querySelector("#imgonly-form");
            if(imgForm2)imgForm2.style.display="none";
            var fi2=c.querySelector("#imgfile");if(fi2)fi2.value="";
            var fc=c.querySelector("#imgfile-cam");if(fc)fc.value="";
          };
          if(prev)prev.appendChild(rb);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // Image preview (multi)
  var imgfile=c.querySelector("#imgfile");
  if(imgfile)imgfile.onchange=function(){if(imgfile.files&&imgfile.files.length)handleImageFiles(imgfile.files);};
  var imgfileCam=c.querySelector("#imgfile-cam");
  if(imgfileCam)imgfileCam.onchange=function(){if(imgfileCam.files&&imgfileCam.files.length)handleImageFiles(imgfileCam.files);};

  // Camera via getUserMedia
  var cameraStream=null;
  var cameraFacingMode="environment";
  var pendingSnapBlob=null;
  var pendingSnapBase64=null;
  var openCamBtn=c.querySelector("#open-camera-btn");
  var closeCamBtn=c.querySelector("#close-camera-btn");
  var snapBtn=c.querySelector("#snap-btn");
  var switchCamBtn=c.querySelector("#switch-camera-btn");
  var camContainer=c.querySelector("#camera-container");
  var camVideo=c.querySelector("#camera-video");
  var snapCanvas=c.querySelector("#snap-canvas");
  var liveControls=c.querySelector("#camera-live-controls");
  var confirmView=c.querySelector("#camera-confirm");
  var confirmImg=c.querySelector("#camera-confirm-img");
  var confirmKeepBtn=c.querySelector("#confirm-keep-btn");
  var confirmRetakeBtn=c.querySelector("#confirm-retake-btn");

  function stopCamera(){
    if(cameraStream){cameraStream.getTracks().forEach(function(t){t.stop();});cameraStream=null;}
    if(camContainer)camContainer.style.display="none";
    if(confirmView)confirmView.style.display="none";
    if(liveControls)liveControls.style.display="flex";
    if(camVideo)camVideo.style.display="block";
    pendingSnapBlob=null;
    pendingSnapBase64=null;
  }

  function startCamera(facingMode){
    navigator.mediaDevices.getUserMedia({video:{facingMode:facingMode},audio:false})
      .then(function(stream){
        if(cameraStream)cameraStream.getTracks().forEach(function(t){t.stop();});
        cameraStream=stream;
        cameraFacingMode=facingMode;
        if(camVideo){camVideo.srcObject=stream;camVideo.style.display="block";}
        if(camContainer)camContainer.style.display="block";
        if(liveControls)liveControls.style.display="flex";
        if(confirmView)confirmView.style.display="none";
      })
      .catch(function(){
        navigator.mediaDevices.getUserMedia({video:true,audio:false})
          .then(function(stream){
            if(cameraStream)cameraStream.getTracks().forEach(function(t){t.stop();});
            cameraStream=stream;
            if(camVideo){camVideo.srcObject=stream;camVideo.style.display="block";}
            if(camContainer)camContainer.style.display="block";
            if(liveControls)liveControls.style.display="flex";
            if(confirmView)confirmView.style.display="none";
          })
          .catch(function(e){alert("Kunde inte starta kameran: "+e.message);});
      });
  }

  if(openCamBtn){
    openCamBtn.onclick=function(){
      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
        alert("Kameran stöds inte i denna webbläsare.");return;
      }
      startCamera(cameraFacingMode);
    };
  }

  if(switchCamBtn){
    switchCamBtn.onclick=function(){
      startCamera(cameraFacingMode==="environment"?"user":"environment");
    };
  }

  if(closeCamBtn)closeCamBtn.onclick=stopCamera;

  function commitPendingSnap(){
    if(!pendingSnapBase64)return;
    var img={base64:pendingSnapBase64,mtype:"image/jpeg"};
    if(pendingImgs&&pendingImgs.length)pendingImgs.push(img);
    else{pendingImgs=[img];}
    pendingImgBase64=pendingImgs[0].base64;pendingImgType=pendingImgs[0].mtype;
    var prev=c.querySelector("#imgpreview");
    if(prev){
      var imgEl=document.createElement("img");
      imgEl.src="data:image/jpeg;base64,"+pendingSnapBase64;
      imgEl.style.cssText="width:100%;border-radius:10px;margin-bottom:6px;max-height:160px;object-fit:cover;display:block";
      prev.appendChild(imgEl);
    }
    var imgForm=c.querySelector("#imgonly-form");
    if(imgForm)imgForm.style.display="block";
    stopCamera();
  }

  if(snapBtn){
    snapBtn.onclick=function(){
      if(!camVideo||!snapCanvas)return;
      snapCanvas.width=camVideo.videoWidth;
      snapCanvas.height=camVideo.videoHeight;
      snapCanvas.getContext("2d").drawImage(camVideo,0,0);
      pendingSnapBase64=snapCanvas.toDataURL("image/jpeg",0.92).split(",")[1];
      snapCanvas.toBlob(function(blob){
        pendingSnapBlob=blob;
        if(confirmImg)confirmImg.src=URL.createObjectURL(blob);
        if(camVideo)camVideo.style.display="none";
        if(liveControls)liveControls.style.display="none";
        if(confirmView)confirmView.style.display="block";
      },"image/jpeg",0.92);
    };
  }

  if(confirmRetakeBtn){
    confirmRetakeBtn.onclick=function(){
      pendingSnapBlob=null;pendingSnapBase64=null;
      if(camVideo)camVideo.style.display="block";
      if(liveControls)liveControls.style.display="flex";
      if(confirmView)confirmView.style.display="none";
    };
  }

  if(confirmKeepBtn){
    confirmKeepBtn.onclick=function(){
      commitPendingSnap();
    };
  }

  var saveImgOnly=c.querySelector("#saveimgonly");
  if(saveImgOnly){
    saveImgOnly.onclick=async function(){
      var imgs=pendingImgs&&pendingImgs.length?pendingImgs:(pendingImgBase64?[{base64:pendingImgBase64,mtype:pendingImgType||"image/jpeg"}]:[]);
      if(!imgs.length)return;
      var titleInput=c.querySelector("#imgonly-title");
      var titleVal=titleInput?titleInput.value.trim():"";
      var ciVal=c.querySelector("#ci")?c.querySelector("#ci").value.trim():"";
      var baseTitle=titleVal||ciVal||"Bild";
      var now=Date.now();
      var newImgs=imgs.map(function(img,i){
        var title=imgs.length===1?baseTitle:baseTitle+" ("+(i+1)+")";
        return {id:now+i,logId:null,activity:title,category:cat,base64:img.base64,mtype:img.mtype,timestamp:new Date(now+i).toISOString(),driveId:null};
      });
      newImgs.forEach(function(newImg){imageHist.unshift(newImg);});
      pendingImgBase64=null;pendingImgType=null;pendingImgs=[];
      saveAndSync("aktiviteter");
      var fz=c.querySelector("#fz");
      if(fz){fz.innerHTML="<div class='ok-toast'>"+(imgs.length>1?imgs.length+" bilder sparade!":"Bild sparad!")+"</div>";setTimeout(function(){if(fz)fz.innerHTML="";},2200);}
      renderLogAktivitet();
      if(accessToken){
        var failCount=0;
        for(var k=0;k<newImgs.length;k++){
          var ok=await saveImageToDrive(newImgs[k]);
          if(!ok)failCount++;
        }
        await saveAndSync("bilder");
        if(failCount>0){
          var fz2=document.getElementById("fz");
          if(fz2)fz2.innerHTML="<div class='ok-toast' style='background:#4a1a1a;border-color:#d97a83;color:#d97a83'>⚠️ "+failCount+" av "+newImgs.length+" bilder kunde inte laddas upp till Drive</div>";
        }
      }
    };
  }
}

var clockH=0,clockM=0,clockMode="h";
var pendingImgBase64=null,pendingImgType=null,pendingImgs=[];

async function addAct(activity){
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
  // Save all pending images (not just the first one)
  var imgs=pendingImgs&&pendingImgs.length?pendingImgs:(pendingImgBase64?[{base64:pendingImgBase64,mtype:pendingImgType||"image/jpeg"}]:[]);
  if(imgs.length){
    var now=Date.now();
    var newImgs=imgs.map(function(img,i){
      var imgTitle=imgs.length===1?activity:activity+" ("+(i+1)+")";
      return {id:now+i+1,logId:logId,activity:imgTitle,base64:img.base64,mtype:img.mtype||"image/jpeg",timestamp:new Date(now+i).toISOString(),driveId:null};
    });
    newImgs.forEach(function(newImg){imageHist.unshift(newImg);});
    pendingImgBase64=null;pendingImgType=null;pendingImgs=[];
    saveAndSync("aktiviteter");hdr();
    updateHandelser(null);
    var fz0=document.getElementById("fz");
    if(fz0){fz0.innerHTML="<div class='ok-toast'>Loggad: "+esc(activity)+"</div>";setTimeout(function(){if(fz0)fz0.innerHTML="";},2200);}
    resetLogForm();
    // Upload images one at a time (not in parallel) to avoid Drive folder-creation race conditions
    if(accessToken){
      var failCount=0;
      for(var k=0;k<newImgs.length;k++){
        var ok=await saveImageToDrive(newImgs[k]);
        if(!ok)failCount++;
      }
      await saveAndSync("bilder");
      if(failCount>0){
        var fz1=document.getElementById("fz");
        if(fz1)fz1.innerHTML="<div class='ok-toast' style='background:#4a1a1a;border-color:#d97a83;color:#d97a83'>⚠️ "+failCount+" av "+newImgs.length+" bilder kunde inte laddas upp till Drive</div>";
      }
    }
    return;
  }
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
  clockH=0;clockM=0;
  var pi=document.getElementById("pi");if(pi)pi.value="";
  var ni=document.getElementById("ni");if(ni)ni.value="";
  pendingImgBase64=null;pendingImgType=null;pendingImgs=[];
  var prev=document.getElementById("imgpreview");if(prev)prev.innerHTML="";
  var imgForm=document.getElementById("imgonly-form");if(imgForm)imgForm.style.display="none";
}
