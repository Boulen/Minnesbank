// SOKBAR.JS (fd dictbar.js, kortvarigt sökrad.js/sökbar.js) — sökrutorna längst ner ("dict-bar"), synliga på alla flikar samtidigt.
// Två sökfunktioner: Sök (förklara text/bild/fil) och Ord (synonymer/ordbok).
// Beroenden: core.js (esc, aiCall, aiChat, aiText, extractJsonObject, chatContinuationHtml,
// bindChatContinuation). Laddas EFTER core.js.
//
// NYTT (2026-08-30): pin-knapparna (📌K "Spara till Kunskap" och 📌V "Spara till
// Vokabulär") är borttagna på Blås begäran, tills vidare. Anledning: 📌V:s
// saveAndSync("vokabular")-anrop var redan trasigt (no-op) efter core.js:s nya
// Drive-arkitektur, och fokus just nu är att få sökbaren att fungera, inte sparande.
// dictChat/synChat lever kvar som vanligt (används av "fortsätt konversationen").
//
// NYTT (enligt HANDOFF_sokrutor från huvudet): sökradens HTML-markup ligger inte
// längre i index.html. Den byggs och läggs till i document.body av injectSokbarMarkup()
// nedan, som körs direkt när filen laddas. Ändras layouten på sökraden, gör det HÄR —
// index.html behöver bara en script-tagg som pekar på js/sokbar.js, inget annat.

(function injectSokbarMarkup(){
  // Skydd mot dubblett-injektion om index.html av misstag ändå har kvar markupen.
  if(document.getElementById("dictInput"))return;
  var html=''
    +'<div class="dict-bar">'
    +'<div class="dict-result" id="dictResult"></div>'
    +'<div class="dict-result" id="synResult"></div>'
    +'<div id="dictCameraContainer" style="display:none;max-width:940px;margin:0 auto 10px;">'
    +'<video id="dictCameraVideo" autoplay playsinline style="width:100%;border-radius:10px;max-height:220px;object-fit:cover;background:#000"></video>'
    +'<div style="display:flex;gap:8px;margin-top:8px">'
    +'<button id="dictSnapBtn" type="button" class="action-btn" style="flex:1">📸 Ta foto</button>'
    +'<button id="dictCloseCameraBtn" type="button" class="action-btn" style="color:var(--error)">✕</button>'
    +'</div>'
    +'</div>'
    +'<canvas id="dictSnapCanvas" style="display:none"></canvas>'
    +'<div class="dict-combined-row">'
    +'<div class="dict-input-row dict-row-uploads">'
    +'<label class="action-btn" style="cursor:pointer" title="Ladda upp bild eller fil">📁<input type="file" id="dictImgUpload" accept="image/*,.txt,.md,.csv,.json,text/plain" style="display:none"></label>'
    +'<button class="action-btn" id="dictCameraBtn" type="button" title="Ta bild">📷</button>'
    +'</div>'
    +'<div class="dict-input-row dict-row-main">'
    +'<input type="text" id="dictInput" placeholder="Sök">'
    +'<button class="action-btn" id="dictSpellBtn" type="button" title="Stavningskontroll">🔤</button>'
    +'</div>'
    +'<div class="dict-input-row dict-row-small">'
    +'<input type="text" id="synInput" placeholder="Ord">'
    +'</div>'
    +'</div>'
    +'</div>';
  document.body.insertAdjacentHTML("beforeend",html);
})();

async function searchDictionary(){
  var dictInput=document.getElementById("dictInput");
  var dictResult=document.getElementById("dictResult");
  if(!dictInput||!dictResult)return;
  var text=dictInput.value.trim();
  if(!text)return;
  dictResult.classList.add("visible");
  dictResult.innerHTML="<span class='spnr' style='width:14px;height:14px;border-width:2px;display:inline-block;margin:0 6px 0 0;vertical-align:middle'></span>söker …";
  var sys='Du ar en pedagog. Ge en kort, tydlig och lattforstaelig forklaring pa svenska av frasen eller fragan, max 3-4 meningar. Svara ENDAST med JSON, utan markdown-block: {"title":"kort rubrik for det som forklaras","explanation":"..."}';
  var userMsg="Forklara: \""+text+"\"";
  var parsed=null;
  for(var attempt=0;attempt<2&&!parsed;attempt++){
    try{
      var res=await aiCall(sys,userMsg,900);
      var data=await res.json();
      parsed=JSON.parse(extractJsonObject(aiText(data)));
    }catch(err){parsed=null;}
  }
  if(!parsed){
    dictResult.innerHTML="<button class='dict-close' id='dictCloseBtn'>×</button>Kunde inte tolka svaret, försök igen.";
    var closeErrBtn=document.getElementById("dictCloseBtn");
    if(closeErrBtn)closeErrBtn.onclick=function(){dictResult.classList.remove("visible");};
    return;
  }
  try{
    dictChat=[{role:"user",content:"Förklara: \""+text+"\""},{role:"assistant",content:parsed.explanation||""}];
    dictHeaderHtml="<span class='note-label'>"+esc(parsed.title||text)+"</span>"
      +"<div style='margin:6px 0 10px;color:var(--text);font-size:13.5px'>"+esc(parsed.explanation||"")+"</div>";
    dictAiSystemPrompt="Du ar en pedagog. Fortsätt hjälpa personen bygga vidare på det ni just pratat om, svara med vanlig text.";
    renderDictResultBox();
  }catch(err){
    dictResult.innerHTML="<button class='dict-close' id='dictCloseBtn'>×</button>kunde inte söka: "+esc(err.message);
    document.getElementById("dictCloseBtn").onclick=function(){dictResult.classList.remove("visible");};
  }
}

// Stavningskontroll av det som står i sökrutan - bara felstavningar, ingen förklaring/kontext.
async function checkSpelling(){
  var dictInput=document.getElementById("dictInput");
  var dictResult=document.getElementById("dictResult");
  if(!dictInput||!dictResult)return;
  var text=dictInput.value.trim();
  if(!text)return;
  dictResult.classList.add("visible");
  dictResult.innerHTML="<span class='spnr' style='width:14px;height:14px;border-width:2px;display:inline-block;margin:0 6px 0 0;vertical-align:middle'></span>kontrollerar stavning …";
  var sys='Du ar en svensk korrekturlasare. Leta ENDAST efter felstavade ord i texten som ges - inte grammatik eller stil. Svara ENDAST med JSON, utan markdown-block: {"misspellings":[{"word":"felstavat ord/fras exakt som i texten","correction":"rattstavad form"}]}. Om inga felstavningar hittas: {"misspellings":[]}.';
  var userMsg="Kontrollera stavningen i denna text:\n\n"+text;
  var parsed=null;
  for(var attempt=0;attempt<2&&!parsed;attempt++){
    try{
      var res=await aiCall(sys,userMsg,700);
      var data=await res.json();
      parsed=JSON.parse(extractJsonObject(aiText(data)));
    }catch(err){parsed=null;}
  }
  if(!parsed||!Array.isArray(parsed.misspellings)){
    dictResult.innerHTML="<button class='dict-close' id='dictCloseBtn'>×</button>Kunde inte tolka svaret, försök igen.";
    var closeErrBtn=document.getElementById("dictCloseBtn");
    if(closeErrBtn)closeErrBtn.onclick=function(){dictResult.classList.remove("visible");};
    return;
  }
  var list=parsed.misspellings;
  var body=list.length
    ?"<div style='display:flex;flex-direction:column;gap:6px;margin:6px 0 4px'>"+list.map(function(m){
      return "<div style='font-size:13.5px'><span style='color:var(--error)'>"+esc(m.word||"")+"</span> → <span style='color:var(--text)'>"+esc(m.correction||"")+"</span></div>";
    }).join("")+"</div>"
    :"<div style='margin:6px 0 4px;color:var(--text);font-size:13.5px'>Inga felstavningar hittades.</div>";
  dictResult.innerHTML="<button class='dict-close' id='dictCloseBtn'>×</button>"
    +"<span class='note-label'>Stavningskontroll</span>"
    +body;
  document.getElementById("dictCloseBtn").onclick=function(){dictResult.classList.remove("visible");};
}

// Bildbaserad sökning (ladda upp eller ta bild) - samma resultatruta som textsökningen.
async function searchDictionaryImage(file){
  var dictResult=document.getElementById("dictResult");
  if(!dictResult)return;
  dictResult.classList.add("visible");
  dictResult.innerHTML="<span class='spnr' style='width:14px;height:14px;border-width:2px;display:inline-block;margin:0 6px 0 0;vertical-align:middle'></span>analyserar bild …";
  try{
    var dataUrl=await new Promise(function(res,rej){
      var r=new FileReader();
      r.onload=function(){res(r.result);};
      r.onerror=function(){rej(new Error("Filfel"));};
      r.readAsDataURL(file);
    });
    var res=await fetch(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      model:"anthropic/claude-sonnet-4.6",max_tokens:400,
      messages:[
        {role:"user",content:[
          {type:"image_url",image_url:{url:dataUrl}},
          {type:"text",text:"Du ar en pedagog. Ge en kort, enkel och lattforstaelig forklaring pa svenska av vad du ser pa bilden. Max 3-4 meningar."}
        ]}
      ]
    })});
    var data=await res.json();
    var text=aiText(data)||"Kunde inte analysera bilden.";
    if(data.error)text="Fel: "+JSON.stringify(data.error);
    dictChat=[{role:"user",content:[{type:"image_url",image_url:{url:dataUrl}},{type:"text",text:"Vad ser du på bilden?"}]},{role:"assistant",content:text}];
    dictHeaderHtml="<span class='note-label'>Bild</span>"
      +"<div style='margin:6px 0 10px;color:var(--text);font-size:13.5px'>"+esc(text)+"</div>";
    dictAiSystemPrompt="Du ar en pedagog. Fortsätt svara på frågor om bilden och det ni pratat om, svara med vanlig text.";
    renderDictResultBox();
  }catch(err){
    dictResult.innerHTML="<button class='dict-close' id='dictCloseBtn'>×</button>kunde inte analysera bilden: "+esc(err.message);
    document.getElementById("dictCloseBtn").onclick=function(){dictResult.classList.remove("visible");};
  }
}

// Textbaserad fil (t.ex. .txt, .md, .csv, .json) - läser innehållet och förklarar det.
async function searchDictionaryTextFile(file){
  var dictResult=document.getElementById("dictResult");
  if(!dictResult)return;
  dictResult.classList.add("visible");
  dictResult.innerHTML="<span class='spnr' style='width:14px;height:14px;border-width:2px;display:inline-block;margin:0 6px 0 0;vertical-align:middle'></span>analyserar fil …";
  try{
    var text=await new Promise(function(res,rej){
      var r=new FileReader();
      r.onload=function(){res(r.result);};
      r.onerror=function(){rej(new Error("Filfel"));};
      r.readAsText(file);
    });
    var sys='Du ar en pedagog. Ge en kort, tydlig sammanfattning/forklaring pa svenska av innehallet i filen som skickas, max 4-5 meningar.';
    var res=await aiCall(sys,"Filens innehåll (\""+file.name+"\"):\n\n"+text.slice(0,6000),700);
    var data=await res.json();
    var answer=aiText(data)||"Kunde inte analysera filen.";
    dictChat=[{role:"user",content:"Filens innehåll (\""+file.name+"\"):\n\n"+text.slice(0,6000)},{role:"assistant",content:answer}];
    dictHeaderHtml="<span class='note-label'>"+esc(file.name)+"</span>"
      +"<div style='margin:6px 0 10px;color:var(--text);font-size:13.5px'>"+esc(answer)+"</div>";
    dictAiSystemPrompt="Du ar en pedagog. Fortsätt svara på frågor om filen och det ni pratat om, svara med vanlig text.";
    renderDictResultBox();
  }catch(err){
    dictResult.innerHTML="<button class='dict-close' id='dictCloseBtn'>×</button>kunde inte analysera filen: "+esc(err.message);
    document.getElementById("dictCloseBtn").onclick=function(){dictResult.classList.remove("visible");};
  }
}

// Delad rendering för sökresultat-rutan (text-, bild- eller filsökning) + "fortsätt konversationen".
var dictChat=null, dictHeaderHtml="", dictAiSystemPrompt="";
function renderDictResultBox(){
  var dictResult=document.getElementById("dictResult");
  if(!dictResult)return;
  dictResult.innerHTML="<button class='dict-close' id='dictCloseBtn'>×</button>"
    +dictHeaderHtml
    +chatContinuationHtml(dictChat,"dictai");
  document.getElementById("dictCloseBtn").onclick=function(){dictResult.classList.remove("visible");dictChat=null;};
  bindChatContinuation(dictResult,"dictai",dictAiSystemPrompt,function(){return dictChat;},renderDictResultBox);
}

// ---- Ordlista och Synonymer (mindre, egen ruta) - samma funktion som innan sammanslagningen ----
var synChat=null, synHeaderHtml="";
function renderSynResultBox(){
  var synResult=document.getElementById("synResult");
  if(!synResult)return;
  synResult.innerHTML="<button class='dict-close' id='synCloseBtn'>×</button>"
    +synHeaderHtml
    +chatContinuationHtml(synChat,"synai");
  document.getElementById("synCloseBtn").onclick=function(){synResult.classList.remove("visible");synChat=null;};
  synResult.querySelectorAll("[data-copyword]").forEach(function(chip){
    chip.onclick=function(){
      var word=chip.dataset.copyword;
      if(!navigator.clipboard||!navigator.clipboard.writeText)return;
      navigator.clipboard.writeText(word).then(function(){
        var orig=chip.textContent;
        chip.textContent="✓ Kopierat";
        setTimeout(function(){chip.textContent=orig;},1200);
      }).catch(function(){});
    };
  });
  bindChatContinuation(synResult,"synai","Du ar en svensk assistent for ordbok och synonymer. Fortsätt hjälpa personen bygga vidare på det ni just pratat om, svara med vanlig text.",function(){return synChat;},renderSynResultBox);
}
async function searchSynonym(){
  var synInput=document.getElementById("synInput");
  var synResult=document.getElementById("synResult");
  if(!synInput||!synResult)return;
  var word=synInput.value.trim();
  if(!word)return;
  synResult.classList.add("visible");
  synResult.innerHTML="<span class='spnr' style='width:14px;height:14px;border-width:2px;display:inline-block;margin:0 6px 0 0;vertical-align:middle'></span>söker …";
  var sys='Du ar en svensk assistent for ordbok och synonymer. Ge en kort definition och 4-6 bra synonymer for ordet eller frasen. Kolla ocksa om ordet/frasen troligen ar felstavat pa svenska - om du misstanker det, fyll i "misspelled":true och "correction" med den ratt stavade formen (annars "misspelled":false och "correction":null). Svara ENDAST med JSON, utan markdown-block: {"word":"ordet/frasen","definition":"kort definition, max 2 meningar","synonyms":["syn1","syn2","syn3","syn4"],"misspelled":false,"correction":null}';
  var userMsg="Slå upp: \""+word+"\"";
  var parsed=null,lastErr=null;
  for(var attempt=0;attempt<2&&!parsed;attempt++){
    try{
      var res=await aiCall(sys,userMsg,900);
      var data=await res.json();
      parsed=JSON.parse(extractJsonObject(aiText(data)));
    }catch(err){lastErr=err;parsed=null;}
  }
  if(!parsed){
    synResult.innerHTML="<button class='dict-close' id='synCloseBtn'>×</button>Kunde inte tolka svaret, försök igen.";
    var closeErrBtn=document.getElementById("synCloseBtn");
    if(closeErrBtn)closeErrBtn.onclick=function(){synResult.classList.remove("visible");};
    return;
  }
  try{
    var chips=(parsed.synonyms||[]).map(function(s){return "<span class='synonym-chip' data-copyword='"+esc(s)+"' style='cursor:pointer' title='Klicka för att kopiera'>"+esc(s)+"</span>";}).join("");
    var suggestionHtml="";
    if(parsed.misspelled&&parsed.correction&&parsed.correction.toLowerCase().trim()!==word.toLowerCase().trim()){
      suggestionHtml="<div style='margin-bottom:10px;font-size:13px;color:var(--sub)'>Menade du <span class='synonym-chip' id='synCorrectionBtn' style='cursor:pointer;color:var(--main-dim);background:var(--main);font-weight:600'>"+esc(parsed.correction)+"</span>?</div>";
    }
    var answerText=(parsed.definition||"")+((parsed.synonyms||[]).length?"\nSynonymer: "+parsed.synonyms.join(", "):"");
    synChat=[{role:"user",content:"Slå upp: \""+word+"\""},{role:"assistant",content:answerText}];
    synHeaderHtml="<span class='note-label'>"+esc(parsed.word||word)+"</span>"
      +suggestionHtml
      +"<div style='margin:6px 0 10px;color:var(--text);font-size:13.5px'>"+esc(parsed.definition||"")+"</div>"
      +"<div>"+chips+"</div>";
    renderSynResultBox();
    var correctionBtn=document.getElementById("synCorrectionBtn");
    if(correctionBtn)correctionBtn.onclick=function(){
      synInput.value=parsed.correction;
      searchSynonym();
    };
  }catch(err){
    synResult.innerHTML="<button class='dict-close' id='synCloseBtn'>×</button>kunde inte slå upp ordet: "+esc(err.message);
    document.getElementById("synCloseBtn").onclick=function(){synResult.classList.remove("visible");};
  }
}

function initDictBar(){
  var dictInput=document.getElementById("dictInput");
  if(dictInput)dictInput.onkeydown=function(e){if(e.key==="Enter")searchDictionary();};

  var dictSpellBtn=document.getElementById("dictSpellBtn");
  if(dictSpellBtn)dictSpellBtn.onclick=checkSpelling;

  var synInput=document.getElementById("synInput");
  if(synInput)synInput.onkeydown=function(e){if(e.key==="Enter")searchSynonym();};

  var synToTranslateBtn=document.getElementById("syn-to-translate-btn");
  if(synToTranslateBtn)synToTranslateBtn.onclick=function(){
    setView("ai");
    aiSubview="oversattning";
    renderAI();
  };

  // Klick utanför sökresultatet (Sök/Ordråd) stänger ner rutan, som ett alternativ till x-knappen.
  document.addEventListener("mousedown",function(e){
    var dr=document.getElementById("dictResult");
    var di=document.getElementById("dictInput");
    if(dr&&dr.classList.contains("visible")&&!dr.contains(e.target)&&e.target!==di){
      dr.classList.remove("visible");
    }
    var sr=document.getElementById("synResult");
    var si=document.getElementById("synInput");
    if(sr&&sr.classList.contains("visible")&&!sr.contains(e.target)&&e.target!==si){
      sr.classList.remove("visible");
    }
  });

  // Dict-baren (position:fixed;bottom:0) växer i höjd när ett sökresultat visas.
  // Håll sidans bottenutrymme i synk med bar:ens faktiska höjd så innehåll aldrig hamnar bakom den.
  var dictBarEl=document.querySelector(".dict-bar");
  if(dictBarEl){
    var applyDictBarPadding=function(){
      var h=Math.ceil(dictBarEl.getBoundingClientRect().height);
      var pad=(h+20)+"px";
      document.body.style.paddingBottom=pad;
      var wrapEl=document.querySelector(".wrap");
      if(wrapEl)wrapEl.style.paddingBottom=pad;
    };
    if(window.ResizeObserver){
      new ResizeObserver(applyDictBarPadding).observe(dictBarEl);
    } else {
      window.addEventListener("resize",applyDictBarPadding);
    }
    applyDictBarPadding();
  }

  // Snabbkommandon: "/" -> sökrutan, "ctrl+/" (eller cmd+/ på Mac) -> Ordråd.
  // Triggar bara nar man inte redan skriver i ett annat falt.
  document.addEventListener("keydown",function(e){
    if(e.key!=="/")return;
    var tag=(e.target&&e.target.tagName)||"";
    var isEditable=tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT"||(e.target&&e.target.isContentEditable);
    if(isEditable)return;
    e.preventDefault();
    if(e.ctrlKey||e.metaKey){
      var syn=document.getElementById("synInput");
      if(syn){syn.focus();syn.select();}
    } else {
      var di=document.getElementById("dictInput");
      if(di){di.focus();di.select();}
    }
  });

  var dictImgUpload=document.getElementById("dictImgUpload");
  if(dictImgUpload)dictImgUpload.onchange=function(){
    var file=dictImgUpload.files&&dictImgUpload.files[0];
    if(file){
      if(file.type.indexOf("image/")===0)searchDictionaryImage(file);
      else searchDictionaryTextFile(file);
    }
    dictImgUpload.value="";
  };

  // Kamera för bildsökning
  var dictCamStream=null;
  var dictCameraBtn=document.getElementById("dictCameraBtn");
  var dictCloseCameraBtn=document.getElementById("dictCloseCameraBtn");
  var dictSnapBtn=document.getElementById("dictSnapBtn");
  var dictCameraContainer=document.getElementById("dictCameraContainer");
  var dictCameraVideo=document.getElementById("dictCameraVideo");
  var dictSnapCanvas=document.getElementById("dictSnapCanvas");

  function dictStopCamera(){
    if(dictCamStream){dictCamStream.getTracks().forEach(function(t){t.stop();});dictCamStream=null;}
    if(dictCameraContainer)dictCameraContainer.style.display="none";
  }

  if(dictCameraBtn){
    dictCameraBtn.onclick=function(){
      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){alert("Kameran stöds inte.");return;}
      navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false})
        .then(function(s){dictCamStream=s;if(dictCameraVideo)dictCameraVideo.srcObject=s;if(dictCameraContainer)dictCameraContainer.style.display="block";})
        .catch(function(){
          navigator.mediaDevices.getUserMedia({video:true,audio:false})
            .then(function(s){dictCamStream=s;if(dictCameraVideo)dictCameraVideo.srcObject=s;if(dictCameraContainer)dictCameraContainer.style.display="block";})
            .catch(function(e){alert("Kunde inte starta kameran: "+e.message);});
        });
    };
  }
  if(dictCloseCameraBtn)dictCloseCameraBtn.onclick=dictStopCamera;
  if(dictSnapBtn){
    dictSnapBtn.onclick=function(){
      if(!dictCameraVideo||!dictSnapCanvas)return;
      dictSnapCanvas.width=dictCameraVideo.videoWidth;dictSnapCanvas.height=dictCameraVideo.videoHeight;
      dictSnapCanvas.getContext("2d").drawImage(dictCameraVideo,0,0);
      dictSnapCanvas.toBlob(function(blob){
        dictStopCamera();
        var file=new File([blob],"kamera-foto.jpg",{type:"image/jpeg"});
        searchDictionaryImage(file);
      },"image/jpeg",0.92);
    };
  }
}