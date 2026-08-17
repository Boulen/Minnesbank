var aiSubview="tips"; // tips | terapi





function renderAI(){
  var b=document.getElementById("body");
  var subTabs="<div style='display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:20px'>"
    +"<button class='mode-btn"+(aiSubview==="tips"?" on":"")+"' data-aisub='tips' style='font-size:11px'>Tips</button>"
    +"<button class='mode-btn"+(aiSubview==="terapi"?" on":"")+"' data-aisub='terapi' style='font-size:11px'>Terapi</button>"
    +"<button class='mode-btn"+(aiSubview==="oversattning"?" on":"")+"' data-aisub='oversattning' style='font-size:11px'>Översättning</button>"
    +"</div>";
  b.innerHTML=subTabs+"<div id='ai-content'></div>";
  b.querySelectorAll("[data-aisub]").forEach(function(btn){
    btn.onclick=function(){switchAISubview(btn.dataset.aisub);};
  });
  renderAIContent();
}

function switchAISubview(sub){
  aiSubview=sub;
  var tabMap={tips:"tips",terapi:"terapi"};
  var tab=tabMap[sub];
  document.querySelectorAll("[data-aisub]").forEach(function(btn){btn.classList.toggle("on",btn.dataset.aisub===sub);});
  var ac=document.getElementById("ai-content");
  if(!tab){renderAIContent();return;}
  if(ac)ac.innerHTML="<div style='padding:30px;text-align:center;color:#5c5c5c;font-size:13px'>⏳ Laddar...</div>";
  tabLoaded[tab]=false;
  loadTab(tab).then(function(){renderAIContent();});
}

function renderAIContent(){
  if(aiSubview==="terapi")renderTerapi();
  else if(aiSubview==="oversattning")renderOversattning();
  else renderTips();
}

// Delad AI-modell-dropdown (samma som i Inställningar), återanvändbar på andra flikar.
function modelSelectHtml(idPrefix){
  var currentModel=MODELS.find(function(m){return m.id===selectedModel;})||MODELS[0];
  return "<div class='lbl'>AI-modell</div>"
    +"<select id='"+idPrefix+"-model-select' style='width:100%;padding:11px 13px;border-radius:5px;background:#161616;border:1px solid #2a2a2a;color:#f2f2f2;font-size:14px;margin-bottom:8px;font-family:\"JetBrains Mono\",monospace'>"
    +MODELS.map(function(m){return "<option value='"+esc(m.id)+"'"+(m.id===selectedModel?" selected":"")+">"+esc(m.name)+"</option>";}).join("")
    +"</select>"
    +"<div style='margin-bottom:16px;font-size:12px;color:#5c5c5c;line-height:1.5' id='"+idPrefix+"-model-desc'>"+esc(currentModel.desc)+"</div>";
}
function bindModelSelect(container,idPrefix){
  var sel=container.querySelector("#"+idPrefix+"-model-select");
  if(sel)sel.onchange=function(){
    selectedModel=sel.value;
    try{sessionStorage.setItem("selected_model_session",selectedModel);}catch(e){}
    var m=MODELS.find(function(x){return x.id===selectedModel;});
    var desc=container.querySelector("#"+idPrefix+"-model-desc");
    if(desc&&m)desc.textContent=m.desc;
  };
}

// ---- ÖVERSÄTTNING ----
// Snabb, smidig ordbok/frasöversättning. Inget sparas till Drive/localStorage —
// helt session-tillstånd som nollställs vid nästa översättning eller när fliken lämnas.
function otHandleEnter(e){
  if(e.key!=="Enter")return;
  if(view!=="ai"||aiSubview!=="oversattning")return;
  var tag=(e.target&&e.target.tagName)||"";
  var isEditable=tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT"||(e.target&&e.target.isContentEditable);
  if(isEditable)return;
  e.preventDefault();
  otInput="";otContext="";otResult="";
  renderOversattning();
}
function renderOversattning(){
  var b=document.getElementById("ai-content");
  if(!b)return;
  document.removeEventListener("keydown",otHandleEnter);
  if(otLoading){b.innerHTML=spin();return;}
  if(otResult){
    b.innerHTML="<div class='lbl'>Original</div>"
      +"<div class='tbox'>"+esc(otInput)+"</div>"
      +(otContext.trim()?"<div class='lbl' style='margin-top:10px'>Kontext</div><div class='tbox' style='font-size:12px;color:#8c8c8c'>"+esc(otContext)+"</div>":"")
      +"<div class='lbl' style='margin-top:14px'>Översättning</div>"
      +"<div class='tbox'>"+esc(otResult)+"</div>"
      +"<div style='display:flex;gap:8px;margin-top:10px'>"
      +"<button class='sec ghost' id='ot-to-sok-btn' style='flex:1'>🔍 Sök</button>"
      +"<button class='sec ghost' id='ot-to-ordrad-btn' style='flex:1'>📖 Ordråd</button>"
      +"</div>"
      +"<div style='display:flex;gap:8px;margin-top:8px'>"
      +"<button class='sec ghost' id='ot-pin-vokabular-btn' style='flex:1'>📌 Vokabulär</button>"
      +"<button class='sec ghost' id='ot-pin-kunskap-btn' style='flex:1'>📌 Kunskap</button>"
      +"</div>"
      +"<div class='lbl' style='margin-top:16px'>Sök nytt ord/fras (samma kontext)</div>"
      +"<div class='row'><input class='inp' id='ot-next-inp' placeholder='Skriv nästa ord eller fras...' value='"+esc(otNextInput)+"'/><button class='abtn' id='ot-next-btn'>&#8594;</button></div>"
      +"<button class='sec ghost' id='ot-newsearch-btn' style='width:100%;margin-top:10px'>Ny sökning</button>"
      +"<div style='text-align:center;color:#5c5c5c;font-size:12px;margin-top:10px'>Eller tryck Enter för en helt ny sökning</div>";
    document.addEventListener("keydown",otHandleEnter);
    var toSokBtn=b.querySelector("#ot-to-sok-btn");
    if(toSokBtn)toSokBtn.onclick=function(){
      var di=document.getElementById("dictInput");
      if(di){di.value=otResult;di.focus();}
    };
    var toOrdradBtn=b.querySelector("#ot-to-ordrad-btn");
    if(toOrdradBtn)toOrdradBtn.onclick=function(){
      var si=document.getElementById("synInput");
      if(si){si.value=otResult;si.focus();}
    };
    var otPinVokabularBtn=b.querySelector("#ot-pin-vokabular-btn");
    if(otPinVokabularBtn)otPinVokabularBtn.onclick=function(){
      var entryText=otInput+" → "+otResult;
      vokabularHist.push({id:Date.now(),text:entryText,timestamp:new Date().toISOString()});
      saveAndSync("vokabular");
      var orig=otPinVokabularBtn.textContent;
      otPinVokabularBtn.textContent="✓ Sparat";
      setTimeout(function(){otPinVokabularBtn.textContent=orig;},1200);
    };
    var otPinKunskapBtn=b.querySelector("#ot-pin-kunskap-btn");
    if(otPinKunskapBtn)otPinKunskapBtn.onclick=function(){
      var chat=[{role:"user",content:otInput+(otContext.trim()?" ("+otContext.trim()+")":"")},{role:"assistant",content:otResult}];
      pinChatToKunskap(chat);
      var orig=otPinKunskapBtn.textContent;
      otPinKunskapBtn.textContent="✓ Sparat";
      setTimeout(function(){otPinKunskapBtn.textContent=orig;},1200);
    };
    var nextInp=b.querySelector("#ot-next-inp");
    var submitNext=function(){
      var v=(nextInp?nextInp.value:"").trim();
      if(!v)return;
      otInput=v;otNextInput="";otResult="";
      doTranslate();
    };
    if(nextInp){
      nextInp.oninput=function(){otNextInput=nextInp.value;};
      nextInp.onkeydown=function(e){if(e.key==="Enter"){e.preventDefault();e.stopPropagation();submitNext();}};
      setTimeout(function(){nextInp.focus();},50);
    }
    b.querySelector("#ot-next-btn").onclick=submitNext;
    b.querySelector("#ot-newsearch-btn").onclick=function(){
      otInput="";otContext="";otResult="";otNextInput="";
      renderOversattning();
    };
    return;
  }
  b.innerHTML="<div class='eico' style='text-align:center;padding-top:10px'>🌐</div>"
    +modelSelectHtml("ot")
    +"<div class='lbl'>Ord eller fras</div>"
    +"<textarea class='ta' id='ot-inp' placeholder='Skriv det du vill översätta...' style='min-height:80px'>"+esc(otInput)+"</textarea>"
    +"<div class='lbl' style='margin-top:10px'>Kontext (valfritt)</div>"
    +"<input class='inp w100' id='ot-ctx' placeholder='T.ex. till engelska, formellt, brittisk stavning...' value='"+esc(otContext)+"'/>"
    +"<button class='sec' id='ot-send' style='width:100%;margin-top:12px'>Översätt</button>";
  bindModelSelect(b,"ot");
  var inp=b.querySelector("#ot-inp");
  var ctxEl=b.querySelector("#ot-ctx");
  if(inp){
    inp.oninput=function(){otInput=inp.value;};
    inp.onkeydown=function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();doTranslate();}};
    setTimeout(function(){inp.focus();},50);
  }
  if(ctxEl){
    ctxEl.oninput=function(){otContext=ctxEl.value;};
    ctxEl.onkeydown=function(e){if(e.key==="Enter"){e.preventDefault();doTranslate();}};
  }
  b.querySelector("#ot-send").onclick=function(){doTranslate();};
}
async function doTranslate(){
  var text=(otInput||"").trim();
  if(!text)return;
  otLoading=true;renderOversattning();
  var sys="Du ar en oversattare. Oversatt ordet eller frasen som anvandaren ger. Ta hansyn till eventuell kontext (t.ex. malsprak, ton eller sammanhang) om sadan anges. Svara ENDAST med sjalva oversattningen, utan forklaringar, citattecken eller extra text.";
  var userMsg="Text: \""+text+"\""+(otContext.trim()?"\nKontext: "+otContext.trim():"");
  try{
    var res=await aiCall(sys,userMsg,300);
    var data=await res.json();
    otResult=(aiText(data)||"").trim()||"Kunde inte översätta. Försök igen.";
  }catch(e){
    otResult="Något gick fel. Försök igen.";
  }
  otLoading=false;renderOversattning();
}

// ---- TERAPI ----
function renderTerapi(){
  var b=document.getElementById("ai-content");
  var chatHtml="";
  if(tMessages.length){
    chatHtml="<div class='chat-area'>"
      +tMessages.map(function(m){
        if(m.role==="user"){
          return "<div style='display:flex;justify-content:flex-end'><div class='bubble-me'>"+esc(m.content)+"</div></div>";
        }
        return "<div style='display:flex;justify-content:flex-start'><div class='bubble-them'>"+esc(m.content)+"</div></div>";
      }).join("")
      +(tLoading?"<div style='display:flex;justify-content:flex-start'><div class='bubble-them' style='color:#5c5c5c;font-style:italic'>Skriver...</div></div>":"")
      +"</div>";
  } else {
    chatHtml="<div style='text-align:center;padding:32px 0 20px;color:#5c5c5c;font-size:14px;line-height:1.7'>"
      +"<div style='font-size:36px;margin-bottom:12px'>🧠</div>"
      +"Jag ar har for att lyssna och hjalpa dig reflektera.<br>Dela dina tankar, bekymmer eller ideer.</div>";
  }
  var savedHist="";
  if(tHist.length){
    savedHist="<div class='mt20'><div class='lbl'>Sparade samtal</div>"
      +tHist.slice(0,5).map(function(h,i){return histRow(h,i,"tidx","<span class='kbadge'>"+h.messages.length+" meddelanden</span>");}).join("")
      +"</div>";
  }
  var btns=tMessages.length
    ?"<div style='display:flex;gap:8px;margin-bottom:12px'><button class='sec ghost' id='tsave' style='flex:1'>Spara samtal</button><button class='sec ghost' id='tclear' style='flex:1'>Nytt samtal</button><button class='sec ghost' id='terapi-pin-btn' style='flex:1'>📌 Kunskap</button></div>"
    :"";
  b.innerHTML=chatHtml+btns
    +"<div class='row'><input class='inp' id='tinp' placeholder='Skriv dina tankar...' value='"+esc(tInput)+"'/><button class='abtn' id='tsend'>&#8594;</button></div>"
    +savedHist;
  var ti=b.querySelector("#tinp");
  if(ti){
    ti.oninput=function(){tInput=ti.value;};
    ti.onkeydown=function(e){if(e.key==="Enter"&&!e.shiftKey&&ti.value.trim()){e.preventDefault();doSendTerapi(ti.value.trim());}};
    if(!tLoading)setTimeout(function(){ti.focus();},50);
  }
  b.querySelector("#tsend").onclick=function(){var v=b.querySelector("#tinp").value.trim();if(v)doSendTerapi(v);};
  if(tMessages.length){
    b.querySelector("#tsave").onclick=function(){
      var summary=tMessages[0]?tMessages[0].content.slice(0,60)+"...":"Samtal";
      tHist=[{id:Date.now(),summary:summary,messages:tMessages.slice(),timestamp:new Date().toISOString()}].concat(tHist).slice(0,20);
      tMessages=[];tInput="";saveAndSync("terapi");renderTerapi();
    };
    b.querySelector("#tclear").onclick=function(){tMessages=[];tInput="";renderTerapi();};
    var terapiPinBtn=b.querySelector("#terapi-pin-btn");
    if(terapiPinBtn)terapiPinBtn.onclick=function(){
      pinChatToKunskap(tMessages);
      var orig=terapiPinBtn.textContent;
      terapiPinBtn.textContent="✓ Sparat";
      setTimeout(function(){terapiPinBtn.textContent=orig;},1200);
    };
  }
  bindHist(b,"tidx",
    function(i){tMessages=tHist[i].messages.slice();renderTerapi();},
    function(i){tHist.splice(i,1);saveAndSync("terapi");renderTerapi();}
  );
  // Scroll chat to bottom
  var ca=b.querySelector(".chat-area");if(ca)ca.scrollTop=ca.scrollHeight;
}
async function doSendTerapi(text){
  tMessages.push({role:"user",content:text});
  tInput="";tLoading=true;renderTerapi();
  var sys="Du ar en empatisk samtalsstod. Lyssna aktivt, stalla genomtankta foljdfragor och hjalp personen reflektera over sina tankar och ideer. Ge rad nar det frages men fokusera annars pa att hjalpa personen tanka igenom sina egna losningar. Svara pa svenska, var varm. Halla svaren kortfattade (max 3-4 meningar).";
  var history=tMessages.slice(-12).map(function(m){return {role:m.role,content:m.content};});
  try{
    var res=await aiChat(sys,history,600);
    var data=await res.json();
    var reply=data.choices&&data.choices[0]?data.choices[0].message.content||"":"Kunde inte svara. Forsok igen.";
    tMessages.push({role:"assistant",content:reply});
  }catch(e){tMessages.push({role:"assistant",content:"Nagot gick fel. Forsok igen."});}
  tLoading=false;renderTerapi();
}

// ---- AI-TIPS ----
function renderTips(){
  var b=document.getElementById("ai-content");
  if(tipsLoading){b.innerHTML=spin();return;}
  if(tipText){
    b.innerHTML="<div class='lbl'>Tips om: "+esc(tipTopic||"dina aktiviteter")+"</div>"
      +"<div class='tbox'>"+esc(tipText)+"</div>"
      +"<div style='display:flex;gap:8px'>"
      +"<button class='sec ghost' id='refbtn' style='flex:1'>Fraga om nagot annat</button>"
      +"<button class='sec ghost' id='tips-pin-btn' style='flex:1'>📌 Kunskap</button>"
      +"</div>"
      +chatContinuationHtml(tipsChat,"tipsai");
    b.querySelector("#refbtn").onclick=function(){tipText="";tipTopic="";tipsChat=null;renderTips();};
    var tipsPinBtn=b.querySelector("#tips-pin-btn");
    if(tipsPinBtn)tipsPinBtn.onclick=function(){
      var cleanChat=[{role:"user",content:"Tips om: "+(tipTopic||"dina aktiviteter")}].concat((tipsChat||[]).slice(1));
      pinChatToKunskap(cleanChat);
      var orig=tipsPinBtn.textContent;
      tipsPinBtn.textContent="✓ Sparat";
      setTimeout(function(){tipsPinBtn.textContent=orig;},1200);
    };
    bindChatContinuation(b,"tipsai","Du ar en coach som ger personliga, konkreta tips pa svenska anpassade till amnet anvandaren fragar om. Hall det kort och actionbart.",function(){return tipsChat;},function(){renderTips();});
    return;
  }
  b.innerHTML="<div class='eico' style='text-align:center;padding-top:20px'>🤖</div>"
    +"<div style='text-align:center;margin:12px 0 20px;font-size:14px;color:#5c5c5c;line-height:1.6'>Vad vill du ha tips om?<br><span style='font-size:12px'>Kan vara vad som helst - traning, vanor, produktivitet, somn...</span></div>"
    +"<div class='lbl'>Amne</div>"
    +"<textarea class='ta' id='topicin' placeholder='T.ex. hur sover jag battre, tips for att lasa mer...' style='min-height:90px'>"+esc(tipTopic)+"</textarea>"
    +"<button class='sec' id='getbtn'>Ge mig tips</button>";
  var ta=b.querySelector("#topicin");
  if(ta)ta.oninput=function(){tipTopic=ta.value;};
  b.querySelector("#getbtn").onclick=function(){
    var topic=b.querySelector("#topicin").value.trim();
    if(!topic)return;
    tipTopic=topic;fetchTips();
  };
}


async function fetchTips(){
  tipsLoading=true;tipText="";tipsChat=null;renderTips();
  var sum=logs.slice(0,20).map(function(l){return "["+l.category+"] "+l.activity+(l.note?": "+l.note:"");}).join("\n")||"Inga aktiviteter loggade.";
  var prompt="Tips om: "+tipTopic+"\n\nAktiviteter for kontext:\n"+sum+"\n\nGe 3-5 konkreta, personliga tips pa svenska.";
  try{
    var res=await aiCall("Du ar en coach som ger personliga, konkreta tips pa svenska anpassade till amnet anvandaren fragar om. Hall det kort och actionbart.",prompt,1000);
    var data=await res.json();tipText=aiText(data)||"Kunde inte hamta tips.";
    if(tipText&&tipText!=="Kunde inte hamta tips."){
      tipsChat=[{role:"user",content:prompt},{role:"assistant",content:tipText}];
    }
  }catch(e){tipText="Nagot gick fel. Forsok igen.";}
  tipsLoading=false;renderTips();
}

// ---- INSTALLNINGAR ----
