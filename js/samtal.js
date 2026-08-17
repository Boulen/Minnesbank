function migrateNotes(k){
  if(!k.notes){
    k.notes=k.privateNote?[{id:"n0",text:k.privateNote,timestamp:k.timestamp||new Date().toISOString()}]:[];
    delete k.privateNote;
  }
}
function notesContextText(k){
  migrateNotes(k);
  return k.notes.length?k.notes.map(function(n){return n.text;}).join("\n"):"";
}
function notesBoxHtml(k,idPrefix,draftValue,dropdownOpen){
  migrateNotes(k);
  var count=k.notes.length;
  var listHtml=k.notes.slice().reverse().map(function(n){
    if(n.editing){
      return "<div class='khist'>"
        +"<textarea class='ta' data-noteeditinp='"+n.id+"' style='min-height:60px;margin-bottom:6px'>"+esc(n.text)+"</textarea>"
        +"<div style='display:flex;gap:8px'>"
        +"<button class='sec' data-notesave='"+n.id+"' style='flex:1'>Spara</button>"
        +"<button class='sec ghost' data-notecancel='"+n.id+"' style='flex:1'>Avbryt</button>"
        +"</div></div>";
    }
    return "<div class='khist' style='display:flex;align-items:flex-start;gap:8px'>"
      +"<div style='flex:1;min-width:0'><div class='kmsg' style='white-space:normal'>"+esc(n.text)+"</div>"
      +"<div class='kmeta'>"+fd(n.timestamp)+"</div></div>"
      +"<button class='delbtn' data-noteeditbtn='"+n.id+"' style='font-size:15px'>✏️</button>"
      +"<button class='delbtn' data-notedel='"+n.id+"' style='font-size:18px'>x</button>"
      +"</div>";
  }).join("");
  return "<div class='lbl'>Anteckningar</div>"
    +"<textarea class='ta' id='"+idPrefix+"-note-inp' placeholder='Information till AI' style='min-height:0;height:auto;overflow:hidden;resize:none'>"+esc(draftValue||"")+"</textarea>"
    +"<div style='display:flex;gap:8px;margin-bottom:6px'>"
    +"<button class='sec ghost' id='"+idPrefix+"-note-add-btn' style='flex:1'>Lägg till</button>"
    +"<button class='sec ghost' id='"+idPrefix+"-note-toggle-btn' style='flex:1'>📋 Anteckningar ("+count+")</button>"
    +"</div>"
    +"<div id='"+idPrefix+"-note-list' style='display:"+(dropdownOpen?"block":"none")+";margin-bottom:10px'>"
    +(listHtml||"<div class='empty' style='padding:10px 0;font-size:12px'>Inga anteckningar än.</div>")
    +"</div>";
}
function bindNotesBox(b,k,idPrefix,dropdownState,onChange,saveTabName){
  var addBtn=b.querySelector("#"+idPrefix+"-note-add-btn");
  if(addBtn)addBtn.onclick=function(){
    var inp=b.querySelector("#"+idPrefix+"-note-inp");
    var txt=inp.value.trim();
    if(!txt)return;
    migrateNotes(k);
    k.notes.push({id:String(Date.now()),text:txt,timestamp:new Date().toISOString()});
    saveAndSync(saveTabName);
    onChange();
  };
  var toggleBtn=b.querySelector("#"+idPrefix+"-note-toggle-btn");
  if(toggleBtn)toggleBtn.onclick=function(){
    dropdownState.open=!dropdownState.open;
    onChange();
  };
  b.querySelectorAll("[data-notedel]").forEach(function(btn){
    btn.onclick=function(){
      var nid=btn.dataset.notedel;
      confirmDelete("Vill du ta bort anteckningen?",function(){
        k.notes=k.notes.filter(function(n){return n.id!==nid;});
        saveAndSync(saveTabName);
        onChange();
      });
    };
  });
  b.querySelectorAll("[data-noteeditbtn]").forEach(function(btn){
    btn.onclick=function(){
      var nid=btn.dataset.noteeditbtn;
      k.notes.forEach(function(n){n.editing=(n.id===nid);});
      onChange();
    };
  });
  b.querySelectorAll("[data-notecancel]").forEach(function(btn){
    btn.onclick=function(){
      var n=k.notes.find(function(x){return x.id===btn.dataset.notecancel;});
      if(n)n.editing=false;
      onChange();
    };
  });
  b.querySelectorAll("[data-notesave]").forEach(function(btn){
    btn.onclick=function(){
      var nid=btn.dataset.notesave;
      var n=k.notes.find(function(x){return x.id===nid;});
      var ta=b.querySelector("[data-noteeditinp='"+nid+"']");
      if(n&&ta){n.text=ta.value.trim();n.editing=false;saveAndSync(saveTabName);}
      onChange();
    };
  });
}

// Huvudrutan: förklara en fras, fråga, bild eller fil (text-baserad).

var samtalSubview="text"; // text | muntligt

// -- Konversationer (namngivna trådar med meddelanden + AI-hjälp) --
var konversationer=[]; // [{id,name,messages:[{sender:"dem"|"mig",text,timestamp}],timestamp}]
var activeKonvId=null;
var konvSender="dem"; // dem | mig
var konvMsgDraft="", konvNewName="", konvNameEditing=false, konvListRenamingId=null;
var konvAiCtx="Kompis", konvAiDraft="", konvAiResult=null, konvAiLoading=false;
var editingKonvMsgIdx=null;
var konvNoteDraft="", konvNoteDropdown={open:false};

function renderSamtalTop(){
  var b=document.getElementById("body");
  var subTabs="<div style='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:20px'>"
    +"<button class='mode-btn"+(samtalSubview==="text"?" on":"")+"' data-samtalsub='text'>Text</button>"
    +"<button class='mode-btn"+(samtalSubview==="muntligt"?" on":"")+"' data-samtalsub='muntligt'>Muntligt</button>"
    +"</div>";
  b.innerHTML=subTabs+"<div id='samtal-content'></div>";
  b.querySelectorAll("[data-samtalsub]").forEach(function(btn){
    btn.onclick=function(){switchSamtalSubview(btn.dataset.samtalsub);};
  });
  renderSamtalContent();
}
function switchSamtalSubview(sub){
  samtalSubview=sub;
  document.querySelectorAll("[data-samtalsub]").forEach(function(btn){btn.classList.toggle("on",btn.dataset.samtalsub===sub);});
  var samtalTabMap={text:"samtaltext",muntligt:"samtalmuntligt"};
  var st=samtalTabMap[sub]||"samtaltext";
  var sc=document.getElementById("samtal-content");
  if(sc)sc.innerHTML="<div style='padding:30px;text-align:center;color:#5c5c5c;font-size:13px'>⏳ Laddar...</div>";
  loadTab(st).then(function(){renderSamtalContent();});
}
function renderSamtalContent(){
  if(samtalSubview==="muntligt")renderMuntligt();
  else renderSamtalText();
}

function renderSamtalText(){
  var b=document.getElementById("samtal-content");
  if(activeKonvId)renderKonvChat(b);
  else renderKonvList(b);
}

function renderKonvList(b){
  var sorted=konversationer.slice().sort(function(a,b2){return new Date(b2.timestamp)-new Date(a.timestamp);});
  var list=sorted.length?sorted.map(function(k){
    var lastMsg=k.messages.length?k.messages[k.messages.length-1]:null;
    var nameHtml=konvListRenamingId===k.id
      ?"<div style='display:flex;gap:6px'><input class='inp' id='konv-list-rename-inp' value='"+esc(k.name)+"' style='flex:1'/><button class='sec ghost' data-renamesave='"+k.id+"' style='padding:6px 10px'>Spara</button></div>"
      :"<div class='kmsg' style='font-weight:600;display:flex;align-items:center;gap:6px'>"+esc(k.name)+"<button class='delbtn' data-renamekonv='"+k.id+"' style='font-size:12px;padding:2px 5px;color:#5c5c5c'>✏️</button></div>";
    return "<div class=\'khist\' data-konv=\'"+k.id+"\' style=\'display:flex;align-items:center;gap:8px\'>"
      +"<div style=\'flex:1;min-width:0\'>"
      +nameHtml
      +"<div class=\'kmeta\'>"
      +(lastMsg?("<span>"+esc(lastMsg.text.slice(0,40))+(lastMsg.text.length>40?"…":"")+"</span>"):"<span>Inga meddelanden än</span>")
      +"</div></div>"
      +"<span class=\'kbadge\'>"+k.messages.length+"</span>"
      +"<button class=\'delbtn\' data-delkonv=\'"+k.id+"\' style=\'font-size:16px\'>x</button>"
      +"</div>";
  }).join(""):"<div class=\'empty\' style=\'padding:30px 0\'><div class=\'eico\'>💬</div>Inga konversationer ännu.</div>";

  b.innerHTML="<div class=\'lbl\'>Ny konversation</div>"
    +"<div class=\'row\'><input class=\'inp\' id=\'konv-name-inp\' placeholder=\'Namn på konversationen, t.ex. Mamma...\' value=\'"+esc(konvNewName)+"\'/>"
    +"<button class=\'abtn\' id=\'konv-create-btn\'>+</button></div>"
    +"<div class=\'mt20\'><div class=\'lbl\'>Konversationer</div>"+list+"</div>";

  var nameInp=b.querySelector("#konv-name-inp");
  if(nameInp)nameInp.oninput=function(){konvNewName=nameInp.value;};
  var createBtn=b.querySelector("#konv-create-btn");
  var createFn=function(){
    var name=b.querySelector("#konv-name-inp").value.trim();
    if(!name)return;
    var k={id:String(Date.now()),name:name,messages:[],timestamp:new Date().toISOString()};
    konversationer.unshift(k);
    konvNewName="";
    activeKonvId=k.id;
    saveAndSync("samtaltext");
    renderSamtalText();
  };
  if(createBtn)createBtn.onclick=createFn;
  if(nameInp)nameInp.onkeydown=function(e){if(e.key==="Enter")createFn();};

  b.querySelectorAll("[data-konv]").forEach(function(el){
    el.onclick=function(e){
      if(e.target.dataset.delkonv||e.target.dataset.renamekonv)return;
      activeKonvId=el.dataset.konv;konvSender="dem";konvMsgDraft="";konvAiResult=null;konvAiDraft="";konvNameEditing=false;
      renderSamtalText();
    };
  });
  b.querySelectorAll("[data-renamekonv]").forEach(function(btn){
    btn.onclick=function(e){
      e.stopPropagation();
      konvListRenamingId=btn.dataset.renamekonv;
      renderKonvList(b);
    };
  });
  var renameSaveFn=function(){
    var kid=konvListRenamingId;
    var inp=b.querySelector("#konv-list-rename-inp");
    var v=(inp?inp.value:"").trim();
    var k=konversationer.find(function(x){return x.id===kid;});
    if(k&&v)k.name=v;
    konvListRenamingId=null;
    saveAndSync("samtaltext");
    renderKonvList(b);
  };
  b.querySelectorAll("[data-renamesave]").forEach(function(btn){
    btn.onclick=function(e){e.stopPropagation();renameSaveFn();};
  });
  var renameInp=b.querySelector("#konv-list-rename-inp");
  if(renameInp){
    renameInp.onclick=function(e){e.stopPropagation();};
    renameInp.onkeydown=function(e){if(e.key==="Enter"){e.preventDefault();renameSaveFn();}};
    setTimeout(function(){renameInp.focus();renameInp.select();},50);
  }
  b.querySelectorAll("[data-delkonv]").forEach(function(btn){
    btn.onclick=function(e){
      e.stopPropagation();
      var kid=btn.dataset.delkonv;
      var k=konversationer.find(function(x){return x.id===kid;});
      confirmDelete("Vill du ta bort konversationen \'"+esc(k?k.name:"")+"\'?",function(){
        konversationer=konversationer.filter(function(x){return x.id!==kid;});
        saveAndSync("samtaltext");renderSamtalText();
      });
    };
  });
}

function renderKonvChat(b){
  var k=konversationer.find(function(x){return x.id===activeKonvId;});
  if(!k){activeKonvId=null;renderSamtalText();return;}

  var thread=k.messages.length?("<div class=\'chat-area\'>"+k.messages.map(function(m,idx){
    if(editingKonvMsgIdx===idx){
      return "<div style=\'margin-bottom:6px\'>"
        +"<textarea class=\'ta\' id=\'konv-msg-edit-inp\' style=\'min-height:0;height:auto;overflow:hidden;resize:none;margin-bottom:6px\'>"+esc(m.text)+"</textarea>"
        +"<div style=\'display:flex;gap:8px\'>"
        +"<button class=\'sec\' id=\'konv-msg-edit-save\' style=\'flex:1\'>Spara</button>"
        +"<button class=\'sec ghost\' id=\'konv-msg-edit-cancel\' style=\'flex:1\'>Avbryt</button>"
        +"</div></div>";
    }
    var icons="<div style=\'display:flex;gap:2px;flex-shrink:0\'>"
      +"<button class=\'delbtn\' data-msgedit=\'"+idx+"\' style=\'font-size:13px\'>✏️</button>"
      +"<button class=\'delbtn\' data-msgdel=\'"+idx+"\' style=\'font-size:16px\'>x</button>"
      +"</div>";
    return "<div style=\'display:flex;justify-content:"+(m.sender==="mig"?"flex-end":"flex-start")+";align-items:center;gap:4px\'>"
      +(m.sender==="mig"?"":icons)
      +"<div class=\'bubble-"+(m.sender==="mig"?"me":"them")+"\'>"+esc(m.text)+"</div>"
      +(m.sender==="mig"?icons:"")
      +"</div>";
  }).join("")+"</div>"):"<div class=\'empty\' style=\'padding:20px 0\'><div class=\'eico\'>💬</div>Inga meddelanden än.</div>";

  var aiBox="";
  if(konvSender==="mig"){
    var resultHtml="";
    if(konvAiLoading){
      resultHtml=spin();
    } else if(konvAiResult){
      if(konvAiResult.type==="evaluation"){
        resultHtml="<div class=\'mt12\'>"
          +"<div class=\'tbox\'>"+esc(konvAiResult.evaluation||"")+"</div>"
          +(konvAiResult.tips&&konvAiResult.tips.length?("<div class=\'lbl\'>Tips</div>"+konvAiResult.tips.map(function(t){return "<div class=\'enote\' style=\'margin-bottom:6px\'>• "+esc(t)+"</div>";}).join("")):"")
          +chatContinuationHtml(konvAiResult.chat,"konvai")
          +"</div>";
      } else {
        resultHtml="<div class=\'mt12\'>"
          +"<div class=\'tbox\' id=\'konv-ai-result-msg\' style=\'cursor:pointer\' title=\'Klicka för att använda som mitt meddelande\'>"+esc(konvAiResult.message||"")+"</div>"
          +(konvAiResult.explanation?("<div class=\'swhy\' style=\'margin-bottom:8px\'>"+esc(konvAiResult.explanation)+"</div>"):"")
          +"<div class=\'copy-ok vis\' style=\'margin-bottom:0\'>Klicka på meddelandet för att lägga in det i din ruta</div>"
          +chatContinuationHtml(konvAiResult.chat,"konvai")
          +"</div>";
      }
    }
    aiBox="<div class=\'mt20\' style=\'padding:14px;background:var(--bg-alt);border:1px solid var(--border);border-radius:10px\'>"
      +"<div class=\'ctx-chips\'>"+ctxChips(CTXS,konvAiCtx,"konvaictx")+"</div>"
      +"<textarea class=\'ta\' id=\'konv-ai-inp\' style=\'min-height:0;height:auto;overflow:hidden;resize:none\'>"+esc(konvAiDraft)+"</textarea>"
      +"<div style=\'display:flex;gap:8px\'>"
      +"<button class=\'sec ghost\' id=\'konv-utv-btn\' style=\'flex:1\'>Utvärdering</button>"
      +"<button class=\'sec ghost\' id=\'konv-klar-btn\' style=\'flex:1\'>Klarhet</button>"
      +"<button class=\'sec ghost\' id=\'konv-forslag-btn\' style=\'flex:1\'>Förslag</button>"
      +"</div>"
      +resultHtml
      +"</div>";
  } else if(konvSender==="dem"){
    aiBox="<div class=\'mt20\' style=\'padding:14px;background:var(--bg-alt);border:1px solid var(--border);border-radius:10px\'>"
      +notesBoxHtml(k,"konv",konvNoteDraft,konvNoteDropdown.open)
      +"</div>";
  }

  var nameHtml=konvNameEditing
    ?"<div style='display:flex;gap:6px;margin-bottom:8px'><input class='inp' id='konv-name-inp' value='"+esc(k.name)+"' style='flex:1'/><button class='sec ghost' id='konv-name-save-btn' style='padding:8px 12px'>Spara</button></div>"
    :"<div class='lbl' style='display:flex;align-items:center;gap:8px'>"+esc(k.name)+"<button class='delbtn' id='konv-name-edit-btn' style='font-size:13px;padding:2px 6px;color:#5c5c5c'>✏️</button></div>";
  b.innerHTML="<button class=\'sec ghost\' id=\'konv-back-btn\' style=\'margin-bottom:12px\'>&#8592; Alla konversationer</button>"
    +nameHtml
    +thread
    +"<div class=\'mt12\'><div class=\'ctx-chips\'>"
    +"<span class=\'ctx-chip"+(konvSender==="dem"?" on":"")+"\' data-sender=\'dem\'>Dem</span>"
    +"<span class=\'ctx-chip"+(konvSender==="mig"?" on":"")+"\' data-sender=\'mig\'>Mig</span>"
    +"</div>"
    +"<textarea class=\'ta\' id=\'konv-msg-inp\' placeholder=\'Skriv meddelandet...\' style=\'min-height:0;height:auto;overflow:hidden;resize:none\'>"+esc(konvMsgDraft)+"</textarea>"
    +"<button class=\'sec\' id=\'konv-add-btn\'>Lägg till</button></div>"
    +aiBox;

  b.querySelector("#konv-back-btn").onclick=function(){activeKonvId=null;editingKonvMsgIdx=null;konvNameEditing=false;renderSamtalText();};
  var saveKonvName=function(){
    var nameInp=b.querySelector("#konv-name-inp");
    var v=(nameInp?nameInp.value:"").trim();
    if(v)k.name=v;
    konvNameEditing=false;
    saveAndSync("samtaltext");
    renderKonvChat(b);
  };
  var nameEditBtn=b.querySelector("#konv-name-edit-btn");
  if(nameEditBtn)nameEditBtn.onclick=function(){konvNameEditing=true;renderKonvChat(b);};
  var nameSaveBtn=b.querySelector("#konv-name-save-btn");
  if(nameSaveBtn)nameSaveBtn.onclick=saveKonvName;
  var nameInpEl=b.querySelector("#konv-name-inp");
  if(nameInpEl){
    nameInpEl.onkeydown=function(e){if(e.key==="Enter"){e.preventDefault();saveKonvName();}};
    setTimeout(function(){nameInpEl.focus();nameInpEl.select();},50);
  }
  b.querySelectorAll("[data-sender]").forEach(function(el){
    el.onclick=function(){konvSender=el.dataset.sender;renderKonvChat(b);};
  });
  var msgInp=b.querySelector("#konv-msg-inp");
  if(msgInp)msgInp.oninput=function(){konvMsgDraft=msgInp.value;};
  autoGrowTextarea(msgInp);
  var submitMsg=function(){
    var txt=b.querySelector("#konv-msg-inp").value.trim();
    if(!txt)return;
    k.messages.push({sender:konvSender,text:txt,timestamp:new Date().toISOString()});
    k.timestamp=new Date().toISOString();
    konvMsgDraft="";konvAiResult=null;konvAiDraft="";
    saveAndSync("samtaltext");
    renderKonvChat(b);
  };
  if(msgInp)msgInp.onkeydown=function(e){
    if(e.key==="Enter"&&e.shiftKey){e.preventDefault();submitMsg();}
  };
  var addBtn=b.querySelector("#konv-add-btn");
  if(addBtn)addBtn.onclick=submitMsg;

  b.querySelectorAll("[data-msgedit]").forEach(function(btn){
    btn.onclick=function(){editingKonvMsgIdx=Number(btn.dataset.msgedit);renderKonvChat(b);};
  });
  b.querySelectorAll("[data-msgdel]").forEach(function(btn){
    btn.onclick=function(){
      var idx=Number(btn.dataset.msgdel);
      confirmDelete("Vill du ta bort meddelandet?",function(){
        k.messages.splice(idx,1);
        saveAndSync("samtaltext");
        renderKonvChat(b);
      });
    };
  });
  if(editingKonvMsgIdx!==null){
    var msgEditInp=b.querySelector("#konv-msg-edit-inp");
    autoGrowTextarea(msgEditInp);
    var msgEditSave=b.querySelector("#konv-msg-edit-save");
    var msgEditCancel=b.querySelector("#konv-msg-edit-cancel");
    if(msgEditSave)msgEditSave.onclick=function(){
      var txt=msgEditInp.value.trim();
      if(txt)k.messages[editingKonvMsgIdx].text=txt;
      editingKonvMsgIdx=null;
      saveAndSync("samtaltext");
      renderKonvChat(b);
    };
    if(msgEditCancel)msgEditCancel.onclick=function(){editingKonvMsgIdx=null;renderKonvChat(b);};
  }

  if(konvSender==="dem"){
    var noteInp=b.querySelector("#konv-note-inp");
    if(noteInp)noteInp.oninput=function(){konvNoteDraft=noteInp.value;};
    autoGrowTextarea(noteInp);
    bindNotesBox(b,k,"konv",konvNoteDropdown,function(){
      konvNoteDraft="";
      renderKonvChat(b);
    },"samtaltext");
  }

  if(konvSender==="mig"){
    bindChips(b,"konvaictx",function(){return konvAiCtx;},function(v){konvAiCtx=v;});
    var aiInp=b.querySelector("#konv-ai-inp");
    if(aiInp)aiInp.oninput=function(){konvAiDraft=aiInp.value;};
    autoGrowTextarea(aiInp);
    var utvBtn=b.querySelector("#konv-utv-btn");
    if(utvBtn)utvBtn.onclick=function(){
      var txt=b.querySelector("#konv-ai-inp").value.trim();
      if(!txt)return;
      konvAiDraft=txt;
      doKonvUtvardering(k,txt);
    };
    var klarBtn=b.querySelector("#konv-klar-btn");
    if(klarBtn)klarBtn.onclick=function(){
      var txt=b.querySelector("#konv-ai-inp").value.trim();
      if(!txt)return;
      konvAiDraft=txt;
      doKonvKlarhet(k,txt);
    };
    var forslagBtn=b.querySelector("#konv-forslag-btn");
    if(forslagBtn)forslagBtn.onclick=function(){
      var txt=b.querySelector("#konv-ai-inp").value.trim();
      konvAiDraft=txt;
      doKonvForslag(k,txt);
    };
    var resultMsgEl=b.querySelector("#konv-ai-result-msg");
    if(resultMsgEl)resultMsgEl.onclick=function(){
      if(konvAiResult&&konvAiResult.message){
        konvMsgDraft=konvAiResult.message;
        renderKonvChat(b);
      }
    };
    if(konvAiResult&&konvAiResult.chat){
      bindChatContinuation(b,"konvai","Du ar en kommunikationscoach. Fortsätt hjälpa personen bygga vidare på det ni just pratat om, svara med vanlig text.",function(){return konvAiResult.chat;},function(){renderKonvChat(b);});
    }
  }
}

async function doKonvUtvardering(k,text){
  konvAiLoading=true;renderKonvChat(document.getElementById("samtal-content"));
  var threadText=k.messages.slice(-12).map(function(m){return (m.sender==="mig"?"Jag":"De")+": "+m.text;}).join("\n");
  var notesTxt=notesContextText(k);
  var notePart=notesTxt?("\n\nYtterligare information om samtalet: "+notesTxt):"";
  var sys="Du ar en kommunikationscoach. Har ar samtalshistoriken hittills:\n\n"+(threadText||"(inga tidigare meddelanden)")+notePart+"\n\nPersonen funderar pa att skicka foljande meddelande till "+konvAiCtx.toLowerCase()+". Ge en konstruktiv utvardering av meddelandet - vad fungerar bra, vad kan bli battre, och nagra konkreta tips. Svara BARA med giltig JSON: {\"evaluation\":\"...\",\"tips\":[\"...\",\"...\",\"...\"]}";
  try{
    var res=await aiCall(sys,"Meddelandet jag funderar pa att skicka: "+text,1000);
    var data=await res.json();
    var parsed=JSON.parse(aiText(data).replace(/```json|```/g,"").trim());
    var evalText=(parsed.evaluation||"")+((parsed.tips||[]).length?"\n\nTips:\n"+parsed.tips.join("\n"):"");
    konvAiResult={type:"evaluation",evaluation:parsed.evaluation||"",tips:parsed.tips||[],chat:[{role:"user",content:"Meddelandet jag funderar pa att skicka: "+text},{role:"assistant",content:evalText}]};
  }catch(e){
    konvAiResult={type:"evaluation",evaluation:"Kunde inte utvardera. Forsok igen.",tips:[],chat:[{role:"user",content:text},{role:"assistant",content:"Kunde inte utvardera. Forsok igen."}]};
  }
  konvAiLoading=false;renderKonvChat(document.getElementById("samtal-content"));
}

async function doKonvKlarhet(k,text){
  konvAiLoading=true;renderKonvChat(document.getElementById("samtal-content"));
  var threadText=k.messages.slice(-12).map(function(m){return (m.sender==="mig"?"Jag":"De")+": "+m.text;}).join("\n");
  var notesTxt=notesContextText(k);
  var notePart=notesTxt?("\n\nYtterligare information om samtalet: "+notesTxt):"";
  var sys="Du ar en kommunikationscoach. Har ar samtalshistoriken hittills:\n\n"+(threadText||"(inga tidigare meddelanden)")+notePart+"\n\nOmformulera foljande meddelande sa det blir tydligare till "+konvAiCtx.toLowerCase()+", och forklara kort varfor du valde just den formuleringen. Svara BARA med giltig JSON: {\"message\":\"...\",\"explanation\":\"...\"}";
  try{
    var res=await aiCall(sys,"Mitt meddelande: "+text,1000);
    var data=await res.json();
    var parsed=JSON.parse(aiText(data).replace(/```json|```/g,"").trim());
    var msgText=(parsed.message||"")+(parsed.explanation?"\n\n"+parsed.explanation:"");
    konvAiResult={type:"message",message:parsed.message||"",explanation:parsed.explanation||"",chat:[{role:"user",content:"Mitt meddelande: "+text},{role:"assistant",content:msgText}]};
  }catch(e){
    konvAiResult={type:"message",message:"",explanation:"Kunde inte generera. Forsok igen.",chat:[{role:"user",content:text},{role:"assistant",content:"Kunde inte generera. Forsok igen."}]};
  }
  konvAiLoading=false;renderKonvChat(document.getElementById("samtal-content"));
}

async function doKonvForslag(k,goal){
  konvAiLoading=true;renderKonvChat(document.getElementById("samtal-content"));
  var threadText=k.messages.slice(-12).map(function(m){return (m.sender==="mig"?"Jag":"De")+": "+m.text;}).join("\n");
  var notesTxt=notesContextText(k);
  var notePart=notesTxt?("\n\nYtterligare information om samtalet: "+notesTxt):"";
  var goalPart=goal?("Vad jag vill fa ut av meddelandet: "+goal):"Inget speciellt mal angivet - utga fran sammanhanget i samtalet ovan.";
  var sys="Du ar en kommunikationscoach. Har ar samtalshistoriken hittills:\n\n"+(threadText||"(inga tidigare meddelanden)")+notePart+"\n\nSkriv ett forslag till nasta meddelande till "+konvAiCtx.toLowerCase()+", och forklara kort varfor du formulerade och skrev det just sa. Svara BARA med giltig JSON: {\"message\":\"...\",\"explanation\":\"...\"}";
  try{
    var res=await aiCall(sys,goalPart,1000);
    var data=await res.json();
    var parsed=JSON.parse(aiText(data).replace(/```json|```/g,"").trim());
    var msgText2=(parsed.message||"")+(parsed.explanation?"\n\n"+parsed.explanation:"");
    konvAiResult={type:"message",message:parsed.message||"",explanation:parsed.explanation||"",chat:[{role:"user",content:goalPart},{role:"assistant",content:msgText2}]};
  }catch(e){
    konvAiResult={type:"message",message:"",explanation:"Kunde inte generera. Forsok igen.",chat:[{role:"user",content:goalPart},{role:"assistant",content:"Kunde inte generera. Forsok igen."}]};
  }
  konvAiLoading=false;renderKonvChat(document.getElementById("samtal-content"));
}

// ---- MUNTLIGT (som Text, men med en egenskriven sammanfattning istallet for chattbubblor) ----
var muntKonversationer=[]; // [{id,name,entries:[{id,summary,feeling,timestamp}],notes:[{id,text,timestamp}],timestamp}]
var activeMuntKonvId=null;
var muntNewName="";
var muntAiCtx="Kompis", muntAiDraft="", muntAiResult=null, muntAiLoading=false;
var muntSummaryDraft="", muntFeelingDraft="", editingMuntEntryId=null, muntNameEditing=false, muntKonvListRenamingId=null;
var muntNoteDraft="", muntNoteDropdown={open:false};

function renderMuntligt(){
  var b=document.getElementById("samtal-content");
  if(activeMuntKonvId)renderMuntKonvOpen(b);
  else renderMuntKonvList(b);
}

function migrateMuntEntries(k){
  if(!k.entries){
    k.entries=(k.summary||k.feeling)?[{id:"e0",summary:k.summary||"",feeling:k.feeling||"",timestamp:k.timestamp||new Date().toISOString()}]:[];
    delete k.summary;delete k.feeling;
  }
}

function renderMuntKonvList(b){
  var sorted=muntKonversationer.slice().sort(function(a,b2){return new Date(b2.timestamp)-new Date(a.timestamp);});
  var list=sorted.length?sorted.map(function(k){
    migrateMuntEntries(k);
    var last=k.entries.length?k.entries[k.entries.length-1]:null;
    var nameHtml=muntKonvListRenamingId===k.id
      ?"<div style='display:flex;gap:6px'><input class='inp' id='muntkonv-list-rename-inp' value='"+esc(k.name)+"' style='flex:1'/><button class='sec ghost' data-renamemuntsave='"+k.id+"' style='padding:6px 10px'>Spara</button></div>"
      :"<div class='kmsg' style='font-weight:600;display:flex;align-items:center;gap:6px'>"+esc(k.name)+"<button class='delbtn' data-renamemuntkonv='"+k.id+"' style='font-size:12px;padding:2px 5px;color:#5c5c5c'>✏️</button></div>";
    return "<div class=\'khist\' data-muntkonv=\'"+k.id+"\' style=\'display:flex;align-items:center;gap:8px\'>"
      +"<div style=\'flex:1;min-width:0\'>"
      +nameHtml
      +"<div class=\'kmeta\'>"+(last&&last.summary?esc(last.summary.slice(0,40))+(last.summary.length>40?"…":""):"Ingen sammanfattning än")+"</div>"
      +"</div>"
      +(last&&last.feeling?"<span class=\'kbadge\'>"+esc(last.feeling.slice(0,12))+"</span>":"")
      +"<span class=\'kbadge\'>"+k.entries.length+"</span>"
      +"<button class=\'delbtn\' data-delmuntkonv=\'"+k.id+"\' style=\'font-size:16px\'>x</button>"
      +"</div>";
  }).join(""):"<div class=\'empty\' style=\'padding:30px 0\'><div class=\'eico\'>🗣️</div>Inga konversationer ännu.</div>";

  b.innerHTML="<div class=\'lbl\'>Ny konversation</div>"
    +"<div class=\'row\'><input class=\'inp\' id=\'muntkonv-name-inp\' placeholder=\'Namn på konversationen...\' value=\'"+esc(muntNewName)+"\'/>"
    +"<button class=\'abtn\' id=\'muntkonv-create-btn\'>+</button></div>"
    +"<div class=\'mt20\'><div class=\'lbl\'>Konversationer</div>"+list+"</div>";

  var nameInp=b.querySelector("#muntkonv-name-inp");
  if(nameInp)nameInp.oninput=function(){muntNewName=nameInp.value;};
  var createBtn=b.querySelector("#muntkonv-create-btn");
  var createFn=function(){
    var name=b.querySelector("#muntkonv-name-inp").value.trim();
    if(!name)return;
    var k={id:String(Date.now()),name:name,entries:[],notes:[],timestamp:new Date().toISOString()};
    muntKonversationer.unshift(k);
    muntNewName="";
    activeMuntKonvId=k.id;
    saveAndSync("samtalmuntligt");
    renderMuntligt();
  };
  if(createBtn)createBtn.onclick=createFn;
  if(nameInp)nameInp.onkeydown=function(e){if(e.key==="Enter")createFn();};

  b.querySelectorAll("[data-muntkonv]").forEach(function(el){
    el.onclick=function(e){
      if(e.target.dataset.delmuntkonv||e.target.dataset.renamemuntkonv)return;
      activeMuntKonvId=el.dataset.muntkonv;muntAiResult=null;muntAiDraft="";muntSummaryDraft="";muntFeelingDraft="";muntNameEditing=false;
      renderMuntligt();
    };
  });
  b.querySelectorAll("[data-renamemuntkonv]").forEach(function(btn){
    btn.onclick=function(e){
      e.stopPropagation();
      muntKonvListRenamingId=btn.dataset.renamemuntkonv;
      renderMuntKonvList(b);
    };
  });
  var renameMuntSaveFn=function(){
    var kid=muntKonvListRenamingId;
    var inp=b.querySelector("#muntkonv-list-rename-inp");
    var v=(inp?inp.value:"").trim();
    var k=muntKonversationer.find(function(x){return x.id===kid;});
    if(k&&v)k.name=v;
    muntKonvListRenamingId=null;
    saveAndSync("samtalmuntligt");
    renderMuntKonvList(b);
  };
  b.querySelectorAll("[data-renamemuntsave]").forEach(function(btn){
    btn.onclick=function(e){e.stopPropagation();renameMuntSaveFn();};
  });
  var renameMuntInp=b.querySelector("#muntkonv-list-rename-inp");
  if(renameMuntInp){
    renameMuntInp.onclick=function(e){e.stopPropagation();};
    renameMuntInp.onkeydown=function(e){if(e.key==="Enter"){e.preventDefault();renameMuntSaveFn();}};
    setTimeout(function(){renameMuntInp.focus();renameMuntInp.select();},50);
  }
  b.querySelectorAll("[data-delmuntkonv]").forEach(function(btn){
    btn.onclick=function(e){
      e.stopPropagation();
      var kid=btn.dataset.delmuntkonv;
      var k=muntKonversationer.find(function(x){return x.id===kid;});
      confirmDelete("Vill du ta bort konversationen \'"+esc(k?k.name:"")+"\'?",function(){
        muntKonversationer=muntKonversationer.filter(function(x){return x.id!==kid;});
        saveAndSync("samtalmuntligt");renderMuntligt();
      });
    };
  });
}

function muntContextParts(k){
  migrateMuntEntries(k);
  var parts=k.entries.map(function(e){
    var p="Sammanfattning: "+e.summary;
    if(e.feeling)p+=" (Känsla: "+e.feeling+")";
    return p;
  });
  var notesTxt=notesContextText(k);
  if(notesTxt)parts.push("Ytterligare information: "+notesTxt);
  return parts.length?parts.join("\n\n"):"(ingen sammanfattning skriven an)";
}

function renderMuntKonvOpen(b){
  var k=muntKonversationer.find(function(x){return x.id===activeMuntKonvId;});
  if(!k){activeMuntKonvId=null;renderMuntligt();return;}

  var resultHtml="";
  if(muntAiLoading){
    resultHtml=spin();
  } else if(muntAiResult){
    if(muntAiResult.type==="tips"||muntAiResult.type==="tankepa"){
      var items=muntAiResult.type==="tips"?muntAiResult.tips:muntAiResult.points;
      resultHtml="<div class=\'mt12\'>"
        +(items&&items.length?items.map(function(t){return "<div class=\'enote\' style=\'margin-bottom:6px\'>• "+esc(t)+"</div>";}).join(""):"")
        +chatContinuationHtml(muntAiResult.chat,"muntai")
        +"</div>";
    } else if(muntAiResult.type==="vill"){
      resultHtml="<div class=\'mt12\'>"
        +(muntAiResult.advice?"<div class=\'tbox\'>"+esc(muntAiResult.advice)+"</div>":"")
        +(muntAiResult.steps&&muntAiResult.steps.length?("<div class=\'lbl\'>Steg</div>"+muntAiResult.steps.map(function(s,i){return "<div class=\'enote\' style=\'margin-bottom:6px\'>"+(i+1)+". "+esc(s)+"</div>";}).join("")):"")
        +chatContinuationHtml(muntAiResult.chat,"muntai")
        +"</div>";
    }
  }

  migrateMuntEntries(k);
  var entriesHtml=k.entries.length?k.entries.slice().map(function(e){
    if(editingMuntEntryId===e.id){
      return "<div class=\'khist\'>"
        +"<div class=\'lbl\' style=\'margin-bottom:4px\'>Sammanfattning</div>"
        +"<textarea class=\'ta\' data-entryeditsummary=\'"+e.id+"\' style=\'min-height:70px;margin-bottom:6px\'>"+esc(e.summary)+"</textarea>"
        +"<div class=\'lbl\' style=\'margin-bottom:4px\'>Känsla</div>"
        +"<textarea class=\'ta\' data-entryeditfeeling=\'"+e.id+"\' style=\'min-height:50px;margin-bottom:6px\'>"+esc(e.feeling)+"</textarea>"
        +"<div style=\'display:flex;gap:8px\'>"
        +"<button class=\'sec\' data-entrysave=\'"+e.id+"\' style=\'flex:1\'>Spara</button>"
        +"<button class=\'sec ghost\' data-entrycancel=\'"+e.id+"\' style=\'flex:1\'>Avbryt</button>"
        +"</div></div>";
    }
    var mainText=e.summary||e.feeling||"";
    var showBadge=!!(e.summary&&e.feeling);
    return "<div class=\'khist\' style=\'display:flex;align-items:flex-start;gap:8px\'>"
      +"<div style=\'flex:1;min-width:0\'>"
      +"<div class=\'kmsg\' style=\'white-space:normal\'>"+esc(mainText||"(Tom post)")+"</div>"
      +(showBadge?"<div class=\'kmeta\' style=\'margin-top:2px\'><span class=\'kbadge\'>"+esc(e.feeling)+"</span></div>":"")
      +"<div class=\'kmeta\' style=\'margin-top:2px\'>"+fd(e.timestamp)+"</div>"
      +"</div>"
      +"<button class=\'delbtn\' data-entryeditbtn=\'"+e.id+"\' style=\'font-size:15px\'>✏️</button>"
      +"<button class=\'delbtn\' data-entrydel=\'"+e.id+"\' style=\'font-size:18px\'>x</button>"
      +"</div>";
  }).join(""):"<div class=\'empty\' style=\'padding:16px 0;font-size:12px\'>Inga poster än.</div>";

  var muntNameHtml=muntNameEditing
    ?"<div style='display:flex;gap:6px;margin-bottom:8px'><input class='inp' id='muntkonv-name-inp' value='"+esc(k.name)+"' style='flex:1'/><button class='sec ghost' id='muntkonv-name-save-btn' style='padding:8px 12px'>Spara</button></div>"
    :"<div class='lbl' style='display:flex;align-items:center;gap:8px'>"+esc(k.name)+"<button class='delbtn' id='muntkonv-name-edit-btn' style='font-size:13px;padding:2px 6px;color:#5c5c5c'>✏️</button></div>";
  b.innerHTML="<button class=\'sec ghost\' id=\'muntkonv-back-btn\' style=\'margin-bottom:12px\'>&#8592; Alla konversationer</button>"
    +muntNameHtml
    +entriesHtml
    +"<div class=\'mt12\' style=\'display:flex;gap:10px;margin-bottom:10px\'>"
    +"<div style=\'flex:3\'><div class=\'lbl\'>Sammanfattning</div><textarea class=\'ta\' id=\'muntkonv-summary-inp\' placeholder=\'Skriv din egen sammanfattning av konversationen...\' style=\'min-height:90px\'>"+esc(muntSummaryDraft)+"</textarea></div>"
    +"<div style=\'flex:1\'><div class=\'lbl\'>Känsla</div><textarea class=\'ta\' id=\'muntkonv-feeling-inp\' placeholder=\'Hur kändes samtalet?\' style=\'min-height:90px\'>"+esc(muntFeelingDraft)+"</textarea></div>"
    +"</div>"
    +"<button class=\'sec ghost\' id=\'muntkonv-add-entry-btn\' style=\'width:100%;margin-bottom:6px\'>Lägg till</button>"
    +"<div class=\'mt12\'>"+notesBoxHtml(k,"muntkonv",muntNoteDraft,muntNoteDropdown.open)+"</div>"
    +"<div class=\'mt20\' style=\'padding:14px;background:var(--bg-alt);border:1px solid var(--border);border-radius:10px\'>"
    +"<div class=\'ctx-chips\'>"+ctxChips(CTXS,muntAiCtx,"muntaictx")+"</div>"
    +"<textarea class=\'ta\' id=\'muntkonv-ai-inp\' placeholder=\'Information till förslag...\' style=\'min-height:70px\'>"+esc(muntAiDraft)+"</textarea>"
    +"<div style=\'display:flex;gap:8px\'>"
    +"<button class=\'sec ghost\' id=\'muntkonv-tips-btn\' style=\'flex:1\'>Tips</button>"
    +"<button class=\'sec ghost\' id=\'muntkonv-tankepa-btn\' style=\'flex:1\'>Tänka på</button>"
    +"<button class=\'sec ghost\' id=\'muntkonv-vill-btn\' style=\'flex:1\'>Vill</button>"
    +"</div>"
    +resultHtml
    +"</div>";

  b.querySelector("#muntkonv-back-btn").onclick=function(){activeMuntKonvId=null;editingMuntEntryId=null;muntNameEditing=false;renderMuntligt();};
  var saveMuntKonvName=function(){
    var nameInp=b.querySelector("#muntkonv-name-inp");
    var v=(nameInp?nameInp.value:"").trim();
    if(v)k.name=v;
    muntNameEditing=false;
    saveAndSync("samtalmuntligt");
    renderMuntKonvOpen(b);
  };
  var muntNameEditBtn=b.querySelector("#muntkonv-name-edit-btn");
  if(muntNameEditBtn)muntNameEditBtn.onclick=function(){muntNameEditing=true;renderMuntKonvOpen(b);};
  var muntNameSaveBtn=b.querySelector("#muntkonv-name-save-btn");
  if(muntNameSaveBtn)muntNameSaveBtn.onclick=saveMuntKonvName;
  var muntNameInpEl=b.querySelector("#muntkonv-name-inp");
  if(muntNameInpEl){
    muntNameInpEl.onkeydown=function(e){if(e.key==="Enter"){e.preventDefault();saveMuntKonvName();}};
    setTimeout(function(){muntNameInpEl.focus();muntNameInpEl.select();},50);
  }
  var summaryInp=b.querySelector("#muntkonv-summary-inp");
  if(summaryInp)summaryInp.oninput=function(){muntSummaryDraft=summaryInp.value;};
  var feelingInp=b.querySelector("#muntkonv-feeling-inp");
  if(feelingInp)feelingInp.oninput=function(){muntFeelingDraft=feelingInp.value;};
  var submitEntry=function(){
    var summary=b.querySelector("#muntkonv-summary-inp").value.trim();
    var feeling=b.querySelector("#muntkonv-feeling-inp").value.trim();
    if(!summary&&!feeling)return;
    k.entries.push({id:String(Date.now()),summary:summary,feeling:feeling,timestamp:new Date().toISOString()});
    k.timestamp=new Date().toISOString();
    muntSummaryDraft="";muntFeelingDraft="";
    saveAndSync("samtalmuntligt");
    renderMuntKonvOpen(b);
  };
  var entryShiftEnter=function(e){if(e.key==="Enter"&&e.shiftKey){e.preventDefault();submitEntry();}};
  if(summaryInp)summaryInp.onkeydown=entryShiftEnter;
  if(feelingInp)feelingInp.onkeydown=entryShiftEnter;
  var addEntryBtn=b.querySelector("#muntkonv-add-entry-btn");
  if(addEntryBtn)addEntryBtn.onclick=submitEntry;
  b.querySelectorAll("[data-entryeditbtn]").forEach(function(btn){
    btn.onclick=function(){editingMuntEntryId=btn.dataset.entryeditbtn;renderMuntKonvOpen(b);};
  });
  b.querySelectorAll("[data-entrycancel]").forEach(function(btn){
    btn.onclick=function(){editingMuntEntryId=null;renderMuntKonvOpen(b);};
  });
  b.querySelectorAll("[data-entrysave]").forEach(function(btn){
    btn.onclick=function(){
      var eid=btn.dataset.entrysave;
      var e=k.entries.find(function(x){return x.id===eid;});
      var sTa=b.querySelector("[data-entryeditsummary=\'"+eid+"\']");
      var fTa=b.querySelector("[data-entryeditfeeling=\'"+eid+"\']");
      if(e){e.summary=sTa?sTa.value.trim():e.summary;e.feeling=fTa?fTa.value.trim():e.feeling;}
      editingMuntEntryId=null;
      saveAndSync("samtalmuntligt");
      renderMuntKonvOpen(b);
    };
  });
  b.querySelectorAll("[data-entrydel]").forEach(function(btn){
    btn.onclick=function(){
      var eid=btn.dataset.entrydel;
      confirmDelete("Vill du ta bort posten?",function(){
        k.entries=k.entries.filter(function(x){return x.id!==eid;});
        saveAndSync("samtalmuntligt");
        renderMuntKonvOpen(b);
      });
    };
  });

  var noteInp=b.querySelector("#muntkonv-note-inp");
  if(noteInp)noteInp.oninput=function(){muntNoteDraft=noteInp.value;};
  bindNotesBox(b,k,"muntkonv",muntNoteDropdown,function(){
    muntNoteDraft="";
    renderMuntKonvOpen(b);
  },"samtalmuntligt");

  bindChips(b,"muntaictx",function(){return muntAiCtx;},function(v){muntAiCtx=v;});
  var aiInp=b.querySelector("#muntkonv-ai-inp");
  if(aiInp)aiInp.oninput=function(){muntAiDraft=aiInp.value;};
  var tipsBtn=b.querySelector("#muntkonv-tips-btn");
  if(tipsBtn)tipsBtn.onclick=function(){
    var txt=b.querySelector("#muntkonv-ai-inp").value.trim();
    muntAiDraft=txt;
    doMuntTips(k,txt);
  };
  var tankepaBtn=b.querySelector("#muntkonv-tankepa-btn");
  if(tankepaBtn)tankepaBtn.onclick=function(){
    var txt=b.querySelector("#muntkonv-ai-inp").value.trim();
    muntAiDraft=txt;
    doMuntTankePa(k,txt);
  };
  var villBtn=b.querySelector("#muntkonv-vill-btn");
  if(villBtn)villBtn.onclick=function(){
    var txt=b.querySelector("#muntkonv-ai-inp").value.trim();
    if(!txt)return;
    muntAiDraft=txt;
    doMuntVill(k,txt);
  };
  if(muntAiResult&&muntAiResult.chat){
    bindChatContinuation(b,"muntai","Du ar en kommunikationscoach for muntliga samtal. Fortsätt hjälpa personen bygga vidare på det ni just pratat om, svara med vanlig text.",function(){return muntAiResult.chat;},function(){renderMuntKonvOpen(b);});
  }
}

async function doMuntTips(k,text){
  muntAiLoading=true;renderMuntKonvOpen(document.getElementById("samtal-content"));
  var ctxText=muntContextParts(k);
  var sys="Du ar en kommunikationscoach for MUNTLIGA samtal. Har ar bakgrund om samtalet:\n\n"+ctxText+"\n\nGe konkreta tips pa hur personen kan ga till vaga med det de skriver, med tanke pa "+muntAiCtx.toLowerCase()+". Svara BARA med giltig JSON: {\"tips\":[\"...\",\"...\",\"...\"]}";
  try{
    var res=await aiCall(sys,text||"(inget sarskilt skrivet - ge allmanna tips utifran bakgrunden ovan)",1000);
    var data=await res.json();
    var parsed=JSON.parse(aiText(data).replace(/```json|```/g,"").trim());
    var tipsText="Tips:\n"+(parsed.tips||[]).join("\n");
    muntAiResult={type:"tips",tips:parsed.tips||[],chat:[{role:"user",content:text||"Ge mig tips"},{role:"assistant",content:tipsText}]};
  }catch(e){
    muntAiResult={type:"tips",tips:["Kunde inte hamta tips. Forsok igen."],chat:[{role:"user",content:text||"Ge mig tips"},{role:"assistant",content:"Kunde inte hamta tips. Forsok igen."}]};
  }
  muntAiLoading=false;renderMuntKonvOpen(document.getElementById("samtal-content"));
}

async function doMuntTankePa(k,text){
  muntAiLoading=true;renderMuntKonvOpen(document.getElementById("samtal-content"));
  var ctxText=muntContextParts(k);
  var extraPart=text?("\n\nJag funderar ocksa pa: "+text):"";
  var sys="Du ar en kommunikationscoach for MUNTLIGA samtal. Har ar bakgrund om tidigare/planerade samtal:\n\n"+ctxText+extraPart+"\n\nGe saker personen bor tanka pa infor ett samtal med "+muntAiCtx.toLowerCase()+", baserat bade pa bakgrunden och det de skrivit nu. Svara BARA med giltig JSON: {\"points\":[\"...\",\"...\",\"...\"]}";
  try{
    var res=await aiCall(sys,text||"Vad bor jag tanka pa infor samtalet?",1000);
    var data=await res.json();
    var parsed=JSON.parse(aiText(data).replace(/```json|```/g,"").trim());
    var pointsText="Att tanka pa:\n"+(parsed.points||[]).join("\n");
    muntAiResult={type:"tankepa",points:parsed.points||[],chat:[{role:"user",content:text||"Vad bor jag tanka pa?"},{role:"assistant",content:pointsText}]};
  }catch(e){
    muntAiResult={type:"tankepa",points:["Kunde inte generera. Forsok igen."],chat:[{role:"user",content:text||"Vad bor jag tanka pa?"},{role:"assistant",content:"Kunde inte generera. Forsok igen."}]};
  }
  muntAiLoading=false;renderMuntKonvOpen(document.getElementById("samtal-content"));
}

async function doMuntVill(k,goal){
  muntAiLoading=true;renderMuntKonvOpen(document.getElementById("samtal-content"));
  var ctxText=muntContextParts(k);
  var sys="Du ar en kommunikationscoach for MUNTLIGA samtal. Har ar bakgrund om samtalet:\n\n"+ctxText+"\n\nPersonen skriver vad de vill uppna. Ge radgivning om ett konkret tillvagagangssatt for att na dit, med tanke pa "+muntAiCtx.toLowerCase()+". Svara BARA med giltig JSON: {\"advice\":\"...\",\"steps\":[\"...\",\"...\",\"...\"]}";
  try{
    var res=await aiCall(sys,"Vad jag vill: "+goal,1200);
    var data=await res.json();
    var parsed=JSON.parse(aiText(data).replace(/```json|```/g,"").trim());
    var adviceText=(parsed.advice||"")+((parsed.steps||[]).length?"\n\nSteg:\n"+parsed.steps.join("\n"):"");
    muntAiResult={type:"vill",advice:parsed.advice||"",steps:parsed.steps||[],chat:[{role:"user",content:"Vad jag vill: "+goal},{role:"assistant",content:adviceText}]};
  }catch(e){
    muntAiResult={type:"vill",advice:"Kunde inte generera. Forsok igen.",steps:[],chat:[{role:"user",content:"Vad jag vill: "+goal},{role:"assistant",content:"Kunde inte generera. Forsok igen."}]};
  }
  muntAiLoading=false;renderMuntKonvOpen(document.getElementById("samtal-content"));
}

// ---- FUNDERINGAR ----
