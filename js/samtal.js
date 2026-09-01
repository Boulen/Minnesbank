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
    (saveTabName==="samtalmuntligt"?saveSamtalMuntligt():saveSamtalText());
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
        (saveTabName==="samtalmuntligt"?saveSamtalMuntligt():saveSamtalText());
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
      if(n&&ta){n.text=ta.value.trim();n.editing=false;(saveTabName==="samtalmuntligt"?saveSamtalMuntligt():saveSamtalText());}
      onChange();
    };
  });
}

// Huvudrutan: förklara en fras, fråga, bild eller fil (text-baserad).

// ---- Egen Drive-lagring, enligt HANDOFF_own_your_data.md ----
// Två separata filer i Samtal/-mappen (under appens rotmapp, FOLDER_ID i core.js):
// Samtal/text.json      -> {konversationer}
// Samtal/muntlig.json   -> {muntKonversationer}
// Ersätter de gamla saveAndSync("samtaltext")/("samtalmuntligt")/loadTab(...)-anropen,
// som numera är tysta no-ops i core.js och inte sparar/läser något.
var samtalDataLoaded=false;
var samtalDataLoadPromise=null;
async function ensureSamtalDataLoaded(){
  if(samtalDataLoaded)return;
  if(samtalDataLoadPromise)return samtalDataLoadPromise;
  samtalDataLoadPromise=(async function(){
    try{
      var textData=await driveReadJson(["Samtal"],"text.json");
      if(textData&&textData.konversationer)konversationer=textData.konversationer;
      var muntligData=await driveReadJson(["Samtal"],"muntlig.json");
      if(muntligData&&muntligData.muntKonversationer)muntKonversationer=muntligData.muntKonversationer;
    }catch(e){
      console.warn("Kunde inte läsa Samtal-filerna:",e);
    }
    samtalDataLoaded=true;
  })();
  return samtalDataLoadPromise;
}
async function saveSamtalText(){
  return driveWriteJson(["Samtal"],"text.json",{konversationer:konversationer});
}
async function saveSamtalMuntligt(){
  return driveWriteJson(["Samtal"],"muntlig.json",{muntKonversationer:muntKonversationer});
}

// ---- AI-sammanfattad bakgrundskontext (Samtal) ----
// Mönster från js/sokbar.js AI-chatt-ruta, se HANDOFF_samtal_bakgrundskontext_2026-09-01.md.
// Egen cache (Samtal/ai.json), plus en READ-ONLY källa: sökrutans egen ai.json
// (Sokruta/ai.json, känt fil-ID nedan) - ALDRIG skriven till härifrån.
var SAMTAL_AI_SUMMARY_MAX_CHARS=400;
var SAMTAL_EXTERN_CONTEXT_FILE_ID="1Z7EBVkQ31hdbOv9W6DoJBElUzgwsWeu3"; // Sökrutans ai.json
var samtalBackgroundContextPromise=null;
var samtalBackgroundContextText="";

// Läser Sökrutans ai.json direkt via dess fil-ID (annan Drive-mapp än Samtal/). Read-only.
async function samtalReadExternContext(){
  if(!accessToken)return null;
  try{
    var r=await fetch(DRIVE_API+"/"+SAMTAL_EXTERN_CONTEXT_FILE_ID+"?alt=media",{headers:{Authorization:"Bearer "+accessToken}});
    if(!r.ok)return null;
    var text=await r.text();
    if(!text||!text.trim())return null;
    return JSON.parse(text);
  }catch(e){
    console.warn("Kunde inte läsa extern kontextfil (Sökrutans ai.json):",e);
    return null;
  }
}

async function samtalReadAiCache(){
  try{return await driveReadJson(["Samtal"],"ai.json");}catch(e){console.warn("Kunde inte läsa Samtal/ai.json:",e);return null;}
}
async function samtalWriteAiCachePatch(patch){
  // Läser färskt och slår bara ihop de nycklar som patchas in - rör ALDRIG hela objektet,
  // så att kommentarer (skrivna via samtalSettingsAddAiComment) alltid överlever.
  var current=(await samtalReadAiCache())||{};
  var merged=Object.assign({},current,patch);
  return driveWriteJson(["Samtal"],"ai.json",merged);
}
// Skriver ett HELT objekt (t.ex. från rå JSON-redigering eller ett nytt kommentar-tillägg) -
// bygger om det så "kommentarer" alltid hamnar som första nyckel (ren objektnyckel-ordning).
async function samtalWriteAiCacheFull(obj){
  var ordered={};
  if(obj.kommentarer)ordered.kommentarer=obj.kommentarer;
  Object.keys(obj).forEach(function(k){if(k!=="kommentarer")ordered[k]=obj[k];});
  return driveWriteJson(["Samtal"],"ai.json",ordered);
}
// AI-orört kommentarfält - unshift:ar en ny kommentar, koden rör aldrig dessa automatiskt
// (bakgrundskontext-patchningen ovan rör bara sina egna nycklar, aldrig "kommentarer").
async function samtalSettingsAddAiComment(text){
  var t=(text||"").trim();
  if(!t)return;
  var current=(await samtalReadAiCache())||{};
  var kommentarer=(current.kommentarer||[]).slice();
  kommentarer.unshift({text:t,timestamp:new Date().toISOString()});
  current.kommentarer=kommentarer;
  await samtalWriteAiCacheFull(current);
}

// Kort AI-sammanfattning av en lista konversationer/entries, cachad tills itemCount ändras.
async function samtalSummarizeIfChanged(cache,key,items,sampleTextFn,promptLabel){
  if(cache[key]&&cache[key].itemCount===items.length)return null; // oförändrat, återanvänd cache
  var sample=items.slice(0,20).map(sampleTextFn).join("\n");
  var sys="Sammanfatta i 2-3 meningar vilka teman/mönster som syns i "+promptLabel+". Svara med bara sammanfattningen, ingen inledning, ingen JSON.";
  try{
    var res=await aiCall(sys,sample||"(inget sparat än)",300);
    var data=await res.json();
    var summary=aiText(data).trim().slice(0,SAMTAL_AI_SUMMARY_MAX_CHARS);
    return {summary:summary,itemCount:items.length,updatedAt:new Date().toISOString()};
  }catch(e){
    console.warn("Kunde inte sammanfatta "+key+":",e);
    return null;
  }
}

// Fire-and-forget: anropas så fort ett samtalsfönster öppnas. Sparas i modul-variabeln
// samtalBackgroundContextPromise som awaitas precis innan systemprompten byggs i varje
// do*-funktion (doKonvUtvardering/doKonvKlarhet/doKonvForslag/doMuntTips/doMuntTankePa/doMuntVill).
function samtalRefreshBackgroundContext(){
  samtalBackgroundContextPromise=(async function(){
    try{
      var cache=(await samtalReadAiCache())||{};
      var patch={};

      var konvPatch=await samtalSummarizeIfChanged(cache,"konversationer",konversationer,function(k){
        return k.name+": "+k.messages.slice(-6).map(function(m){return (m.sender==="mig"?"Jag":"De")+": "+m.text;}).join(" / ");
      },"personens sparade SKRIFTLIGA samtalsträning");
      if(konvPatch)patch.konversationer=konvPatch;

      var muntPatch=await samtalSummarizeIfChanged(cache,"muntligt",muntKonversationer,function(k){
        return k.name+": "+(k.entries||[]).slice(-4).map(function(e){return (e.summary||"")+(e.feeling?" ("+e.feeling+")":"");}).join(" / ");
      },"personens sparade MUNTLIGA samtalsträning");
      if(muntPatch)patch.muntligt=muntPatch;

      if(Object.keys(patch).length)await samtalWriteAiCachePatch(patch);

      var extern=null;
      try{extern=await samtalReadExternContext();}catch(e){}

      var merged=Object.assign({},cache,patch);
      var parts=[];
      if(merged.konversationer&&merged.konversationer.summary)parts.push("Skriftlig samtalsträning: "+merged.konversationer.summary);
      if(merged.muntligt&&merged.muntligt.summary)parts.push("Muntlig samtalsträning: "+merged.muntligt.summary);
      if(merged.kommentarer&&merged.kommentarer.length)parts.push("Kommentarer från personen:\n"+merged.kommentarer.slice(0,15).map(function(c){return "- "+String(c.text||"").slice(0,300);}).join("\n"));
      if(extern){
        var externParts=[];
        if(extern.ord&&extern.ord.summary)externParts.push("Ordintressen: "+extern.ord.summary);
        if(extern.oversattning&&extern.oversattning.summary)externParts.push("Översättningar: "+extern.oversattning.summary);
        if(extern.kommentarer&&extern.kommentarer.length)externParts.push("Kommentarer från sökrutan:\n"+extern.kommentarer.slice(0,15).map(function(c){return "- "+String(c.text||"").slice(0,300);}).join("\n"));
        if(externParts.length)parts.push("Övrig bakgrund (från sökrutan):\n"+externParts.join("\n"));
      }
      samtalBackgroundContextText=parts.join("\n\n");
    }catch(e){
      console.warn("Kunde inte uppdatera Samtals AI-bakgrundskontext:",e);
    }
  })();
  return samtalBackgroundContextPromise;
}
// Hjälpare som do*-funktionerna anropar direkt: garanterar att en uppdatering är på gång
// (startar en om ingen redan pågår) och väntar in den, returnerar en färdig prompt-bit.
async function samtalGetBackgroundContextPart(){
  if(!samtalBackgroundContextPromise)samtalRefreshBackgroundContext();
  await samtalBackgroundContextPromise;
  return samtalBackgroundContextText?("\n\nBakgrund om personen (från tidigare sparad data):\n"+samtalBackgroundContextText):"";
}

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
  var subTabs="<div style='display:flex;gap:6px;margin-bottom:20px;align-items:center'>"
    +"<button class='mode-btn"+(samtalSubview==="text"?" on":"")+"' style='flex:1' data-samtalsub='text'>Text</button>"
    +"<button class='mode-btn"+(samtalSubview==="muntligt"?" on":"")+"' style='flex:1' data-samtalsub='muntligt'>Muntligt</button>"
    +"<button id='samtal-settings-btn' type='button' title='Inställningar' style='background:none;border:none;color:#6b6880;font-size:20px;cursor:pointer;padding:4px 6px;line-height:1;flex-shrink:0'>⚙️</button>"
    +"</div>";
  b.innerHTML=subTabs+"<div id='samtal-content'><div style='padding:30px;text-align:center;color:#5c5c5c;font-size:13px'>⏳ Laddar...</div></div>";
  b.querySelectorAll("[data-samtalsub]").forEach(function(btn){
    btn.onclick=function(){switchSamtalSubview(btn.dataset.samtalsub);};
  });
  var settingsBtn=b.querySelector("#samtal-settings-btn");
  if(settingsBtn)settingsBtn.onclick=function(){showSamtalSettings();};
  ensureSamtalDataLoaded().then(function(){renderSamtalContent();samtalRefreshBackgroundContext();});
}
function switchSamtalSubview(sub){
  samtalSubview=sub;
  document.querySelectorAll("[data-samtalsub]").forEach(function(btn){btn.classList.toggle("on",btn.dataset.samtalsub===sub);});
  var samtalTabMap={text:"samtaltext",muntligt:"samtalmuntligt"};
  var st=samtalTabMap[sub]||"samtaltext";
  var sc=document.getElementById("samtal-content");
  if(sc)sc.innerHTML="<div style='padding:30px;text-align:center;color:#5c5c5c;font-size:13px'>⏳ Laddar...</div>";
  ensureSamtalDataLoaded().then(function(){renderSamtalContent();});
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
    saveSamtalText();
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
    saveSamtalText();
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
        saveSamtalText();renderSamtalText();
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
    saveSamtalText();
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
    saveSamtalText();
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
        saveSamtalText();
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
      saveSamtalText();
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
  var bgPart=await samtalGetBackgroundContextPart();
  var sys="Du ar en kommunikationscoach. Har ar samtalshistoriken hittills:\n\n"+(threadText||"(inga tidigare meddelanden)")+notePart+bgPart+"\n\nPersonen funderar pa att skicka foljande meddelande till "+konvAiCtx.toLowerCase()+". Ge en konstruktiv utvardering av meddelandet - vad fungerar bra, vad kan bli battre, och nagra konkreta tips. Svara BARA med giltig JSON: {\"evaluation\":\"...\",\"tips\":[\"...\",\"...\",\"...\"]}";
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
  var bgPart=await samtalGetBackgroundContextPart();
  var sys="Du ar en kommunikationscoach. Har ar samtalshistoriken hittills:\n\n"+(threadText||"(inga tidigare meddelanden)")+notePart+bgPart+"\n\nOmformulera foljande meddelande sa det blir tydligare till "+konvAiCtx.toLowerCase()+", och forklara kort varfor du valde just den formuleringen. Svara BARA med giltig JSON: {\"message\":\"...\",\"explanation\":\"...\"}";
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
  var bgPart=await samtalGetBackgroundContextPart();
  var sys="Du ar en kommunikationscoach. Har ar samtalshistoriken hittills:\n\n"+(threadText||"(inga tidigare meddelanden)")+notePart+bgPart+"\n\nSkriv ett forslag till nasta meddelande till "+konvAiCtx.toLowerCase()+", och forklara kort varfor du formulerade och skrev det just sa. Svara BARA med giltig JSON: {\"message\":\"...\",\"explanation\":\"...\"}";
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
    saveSamtalMuntligt();
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
    saveSamtalMuntligt();
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
        saveSamtalMuntligt();renderMuntligt();
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
    saveSamtalMuntligt();
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
    saveSamtalMuntligt();
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
      saveSamtalMuntligt();
      renderMuntKonvOpen(b);
    };
  });
  b.querySelectorAll("[data-entrydel]").forEach(function(btn){
    btn.onclick=function(){
      var eid=btn.dataset.entrydel;
      confirmDelete("Vill du ta bort posten?",function(){
        k.entries=k.entries.filter(function(x){return x.id!==eid;});
        saveSamtalMuntligt();
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
  var bgPart=await samtalGetBackgroundContextPart();
  var sys="Du ar en kommunikationscoach for MUNTLIGA samtal. Har ar bakgrund om samtalet:\n\n"+ctxText+bgPart+"\n\nGe konkreta tips pa hur personen kan ga till vaga med det de skriver, med tanke pa "+muntAiCtx.toLowerCase()+". Svara BARA med giltig JSON: {\"tips\":[\"...\",\"...\",\"...\"]}";
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
  var bgPart=await samtalGetBackgroundContextPart();
  var sys="Du ar en kommunikationscoach for MUNTLIGA samtal. Har ar bakgrund om tidigare/planerade samtal:\n\n"+ctxText+extraPart+bgPart+"\n\nGe saker personen bor tanka pa infor ett samtal med "+muntAiCtx.toLowerCase()+", baserat bade pa bakgrunden och det de skrivit nu. Svara BARA med giltig JSON: {\"points\":[\"...\",\"...\",\"...\"]}";
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
  var bgPart=await samtalGetBackgroundContextPart();
  var sys="Du ar en kommunikationscoach for MUNTLIGA samtal. Har ar bakgrund om samtalet:\n\n"+ctxText+bgPart+"\n\nPersonen skriver vad de vill uppna. Ge radgivning om ett konkret tillvagagangssatt for att na dit, med tanke pa "+muntAiCtx.toLowerCase()+". Svara BARA med giltig JSON: {\"advice\":\"...\",\"steps\":[\"...\",\"...\",\"...\"]}";
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

// ---- Inställningar (Samtal) ----
function showSamtalSettings(){
  var ov=document.createElement("div");
  ov.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:24px 16px;overflow-y:auto";

  ov.innerHTML="<div style='background:#161616;border-radius:20px;width:100%;max-width:420px;overflow:hidden'>"
    +"<div style='padding:16px 20px;border-bottom:1px solid #2a2a2a;display:flex;align-items:center;justify-content:space-between'>"
    +"<div style='font-size:16px;font-weight:600;color:#f2f2f2'>⚙️ Inställningar — Samtal</div>"
    +"<button id='ss-close' style='background:none;border:none;color:#5c5c5c;font-size:20px;cursor:pointer;line-height:1'>✕</button>"
    +"</div>"
    +"<div style='padding:20px;max-height:70vh;overflow-y:auto'>"
    +"<div class='lbl'>Data & backup</div>"
    +"<button id='ss-json-editor' class='sec ghost' style='width:100%'>📝 Öppna/redigera JSON-filer</button>"
    +"</div>"
    +"<div style='padding:16px 20px;border-top:1px solid #2a2a2a;display:flex;gap:10px'>"
    +"<button id='ss-close2' class='sec ghost' style='flex:1'>Stäng</button>"
    +"</div>"
    +"</div>";

  document.body.appendChild(ov);
  ov.onclick=function(e){if(e.target===ov)ov.remove();};
  var closeBtn=ov.querySelector("#ss-close");
  if(closeBtn)closeBtn.onclick=function(){ov.remove();};
  var closeBtn2=ov.querySelector("#ss-close2");
  if(closeBtn2)closeBtn2.onclick=function(){ov.remove();};
  var jsonBtn=ov.querySelector("#ss-json-editor");
  if(jsonBtn)jsonBtn.onclick=function(){openSamtalJsonEditor();};
}

// ---- JSON-redigerare (Samtal) — samma mönster som Aktivitets openJsonEditor(), men
// enklare: driveWriteJson skapar filen automatiskt om den saknas (se HANDOFF_own_your_data.md),
// så ingen separat "fil saknas"-koll/skapande-flöde behövs som hos Aktivitet.
async function findSamtalDriveFileId(filename){
  var folderId=await driveResolveFolderPath(["Samtal"]);
  var q="name='"+filename+"' and '"+folderId+"' in parents and trashed=false";
  var r=await fetch(DRIVE_API+"?q="+encodeURIComponent(q)+"&fields=files(id)",{headers:{Authorization:"Bearer "+accessToken}});
  if(!r.ok)throw new Error("HTTP "+r.status);
  var d=await r.json();
  return (d.files&&d.files.length)?d.files[0].id:null;
}
function openSamtalJsonEditor(){
  var current="text"; // text | muntligt | ai
  var ov2=document.createElement("div");
  ov2.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:10001;display:flex;align-items:center;justify-content:center;padding:16px";

  function fileFor(key){if(key==="text")return "text.json";if(key==="muntligt")return "muntlig.json";return "ai.json";}
  function dataFor(key){
    if(key==="text")return {konversationer:konversationer};
    if(key==="muntligt")return {muntKonversationer:muntKonversationer};
    return {kommentarer:[]};
  }

  function render(){
    ov2.innerHTML="<div style='background:#161616;border-radius:16px;width:100%;max-width:520px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden'>"
      +"<div style='padding:14px 18px;border-bottom:1px solid #2a2a2a;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap'>"
      +"<select id='sje-select' style='background:#131313;border:1px solid #2a2a2a;border-radius:8px;color:#f2f2f2;font-size:13px;padding:6px 8px;flex:1;min-width:110px'>"
      +"<option value='text'"+(current==="text"?" selected":"")+">Text (text.json)</option>"
      +"<option value='muntligt'"+(current==="muntligt"?" selected":"")+">Muntligt (muntlig.json)</option>"
      +"<option value='ai'"+(current==="ai"?" selected":"")+">AI-bakgrundskontext (ai.json)</option>"
      +"</select>"
      +"<button id='sje-open-drive' title='Öppna filen i Google Drive' style='background:none;border:1px solid #2a2a2a;border-radius:8px;color:#4fa8ff;font-size:12px;padding:6px 10px;cursor:pointer;white-space:nowrap;flex-shrink:0'>🔗 Öppna i Drive</button>"
      +"<button id='sje-close' style='background:none;border:none;color:#5c5c5c;font-size:20px;cursor:pointer;line-height:1;flex-shrink:0'>✕</button>"
      +"</div>"
      +(current==="ai"?(
        "<div style='padding:10px 18px 0'>"
        +"<div class='lbl' style='margin-bottom:4px'>Lägg till kommentar</div>"
        +"<div style='font-size:11px;color:#5c5c5c;margin-bottom:6px'>Sparas direkt, AI:n rör aldrig dessa automatiskt - redigera/ta bort görs i den råa JSON-textan nedan.</div>"
        +"<div style='display:flex;gap:6px;margin-bottom:8px'>"
        +"<input class='inp' id='sje-comment-inp' placeholder='Skriv en kommentar om dig själv...' style='flex:1'/>"
        +"<button id='sje-comment-add' class='chip' type='button' style='flex-shrink:0;padding:7px 12px'>+</button>"
        +"</div>"
        +"</div>"
      ):"")
      +"<div id='sje-status' style='padding:8px 18px 0;font-size:11px;color:#5c5c5c'>Hämtar aktuellt innehåll från Drive...</div>"
      +"<textarea id='sje-text' spellcheck='false' disabled style='flex:1;background:#0a0a0a;color:#f2f2f2;border:none;padding:14px;font-family:monospace;font-size:12px;min-height:300px;resize:vertical'></textarea>"
      +"<div id='sje-warning' style='padding:0 18px 8px;font-size:11px;color:#d97a83'></div>"
      +"<div style='padding:14px 18px;border-top:1px solid #2a2a2a;display:flex;gap:10px'>"
      +"<button id='sje-cancel' class='sec ghost' style='flex:1'>Avbryt</button>"
      +"<button id='sje-save' class='cta-log' style='flex:1' disabled>Spara ändringar</button>"
      +"</div>"
      +"</div>";
    ov2.querySelector("#sje-close").onclick=function(){ov2.remove();};
    ov2.querySelector("#sje-cancel").onclick=function(){ov2.remove();};
    ov2.querySelector("#sje-select").onchange=function(){current=ov2.querySelector("#sje-select").value;render();};

    var ta=ov2.querySelector("#sje-text");
    var saveBtn=ov2.querySelector("#sje-save");
    var statusEl=ov2.querySelector("#sje-status");
    (async function(){
      try{
        var fresh=await driveReadJson(["Samtal"],fileFor(current));
        ta.value=JSON.stringify(fresh||dataFor(current),null,2);
        ta.disabled=false;saveBtn.disabled=false;
        statusEl.textContent=fresh?"":"Filen finns inte i Drive ännu — skapas automatiskt första gången du sparar.";
      }catch(e){
        ta.value=JSON.stringify(dataFor(current),null,2);
        ta.disabled=false;saveBtn.disabled=false;
        statusEl.style.color="#d97a83";
        statusEl.textContent="Kunde inte hämta senaste från Drive, visar det som redan finns inläst: "+e.message;
      }
    })();

    var commentInp=ov2.querySelector("#sje-comment-inp");
    var commentAddBtn=ov2.querySelector("#sje-comment-add");
    if(commentAddBtn)commentAddBtn.onclick=async function(){
      var v=(commentInp?commentInp.value:"").trim();
      if(!v)return;
      commentAddBtn.disabled=true;
      try{
        await samtalSettingsAddAiComment(v);
        render();
      }catch(e){
        var warn=ov2.querySelector("#sje-warning");
        if(warn)warn.textContent="Kunde inte spara kommentaren: "+e.message;
        commentAddBtn.disabled=false;
      }
    };

    ov2.querySelector("#sje-open-drive").onclick=function(){
      var warn=ov2.querySelector("#sje-warning");
      if(!accessToken){warn.textContent="Logga in för att öppna filen i Drive.";return;}
      warn.style.color="#5c5c5c";warn.textContent="Söker filen i Drive...";
      findSamtalDriveFileId(fileFor(current)).then(function(fileId){
        if(!fileId){warn.style.color="#d97a83";warn.textContent="Filen finns inte i Drive ännu (har inte sparats dit).";return;}
        warn.textContent="";
        window.open("https://drive.google.com/file/d/"+fileId+"/view","_blank");
      }).catch(function(e){
        warn.style.color="#d97a83";warn.textContent="Kunde inte hitta filen: "+e.message;
      });
    };

    saveBtn.onclick=async function(){
      var txt=ta.value;
      var warn=ov2.querySelector("#sje-warning");
      var parsed;
      try{parsed=JSON.parse(txt);}catch(e){warn.textContent="Ogiltig JSON: "+e.message;return;}
      if(current==="text"){
        if(!Array.isArray(parsed.konversationer)){warn.textContent="Förväntade ett 'konversationer'-fält med en lista.";return;}
        konversationer=parsed.konversationer;
      }else if(current==="muntligt"){
        if(!Array.isArray(parsed.muntKonversationer)){warn.textContent="Förväntade ett 'muntKonversationer'-fält med en lista.";return;}
        muntKonversationer=parsed.muntKonversationer;
      }else{
        if(parsed.kommentarer&&!Array.isArray(parsed.kommentarer)){warn.textContent="'kommentarer' måste vara en lista om den finns.";return;}
      }
      saveBtn.disabled=true;saveBtn.textContent="Sparar...";
      try{
        if(current==="text")await saveSamtalText();
        else if(current==="muntligt")await saveSamtalMuntligt();
        else await samtalWriteAiCacheFull(parsed);
        ov2.remove();
        renderSamtalContent();
      }catch(e){
        warn.textContent="Kunde inte spara: "+e.message;
        saveBtn.disabled=false;saveBtn.textContent="Spara ändringar";
      }
    };
  }
  render();
  document.body.appendChild(ov2);
}

// ---- FUNDERINGAR ----
