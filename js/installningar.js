var settingsGroupOpen={aktivitet:false,funderingar:false,konversation:false,utvarderingar:false};

// Visar Inställningar som en overlay ovanpå appen (som i Skriftstudio) istället
// för att navigera bort till en egen sida.
function openInstallningarOverlay(){
  if(document.getElementById("installningar-overlay"))return;
  var overlay=document.createElement("div");
  overlay.className="overlay";
  overlay.id="installningar-overlay";
  overlay.innerHTML="<div id='installningar-content' style='max-width:560px;width:100%;max-height:85vh;overflow-y:auto'></div>";
  overlay.onclick=function(e){if(e.target===overlay)closeInstallningarOverlay();};
  document.body.appendChild(overlay);
  tabLoaded.installningar=false;
  loadTab("installningar").then(function(){renderInstallningar();});
}
function closeInstallningarOverlay(){
  var overlay=document.getElementById("installningar-overlay");
  if(overlay)overlay.remove();
  render();
}

function renderInstallningar(){
  var b=document.getElementById("installningar-content")||document.getElementById("body");
  var currentModel=MODELS.find(function(m){return m.id===selectedModel;})||MODELS[0];

  // Build month options from available data
  var months={};
  var addToMonths=function(ts){var d=new Date(ts);var key=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");months[key]=true;};
  logs.forEach(function(l){addToMonths(l.timestamp);});
  fundHist.forEach(function(f){addToMonths(f.timestamp);});
  konversationer.forEach(function(k){addToMonths(k.timestamp);});
  muntKonversationer.forEach(function(k){addToMonths(k.timestamp);});
  var monthKeys=Object.keys(months).sort(function(a,b){return b.localeCompare(a);});
  var MONTHS=["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"];
  var monthOptions=monthKeys.map(function(k){var parts=k.split("-");return "<option value='"+k+"'>"+MONTHS[parseInt(parts[1])-1]+" "+parts[0]+"</option>";}).join("");

  var accountName=userInfo?(userInfo.name||userInfo.email||"Inloggad"):"";
  var accountInitials=accountName?accountName.split(" ").map(function(w){return w[0];}).join("").slice(0,2).toUpperCase():"";

  b.innerHTML="<div class='overlay-card' style='max-width:520px;margin:0 auto 20px'>"
    +"<div class='overlay-title'>inställningar</div>"
    +"<div class='overlay-sub'>ai-modell, kategorier, export och data</div>"
    +(userInfo?(
      "<div class='settings-row' style='display:flex;align-items:center;gap:10px'>"
      +"<div class='avatar'>"+accountInitials+"</div>"
      +"<span style='color:#cfcfcf;font-size:13px;flex:1'>"+esc(accountName)+"</span>"
      +"<span class='signout' id='settings-signout-btn'>Logga ut</span>"
      +"</div>"
    ):"")
    +"<div class='settings-row' style='display:flex;gap:8px'>"
    +"<button class='sync-btn' id='sync-btn' style='flex:1'>Synka</button>"
    +"<button class='sync-btn' id='import-btn' style='flex:1'>↓ Fil import</button>"
    +"</div>"
    +"<div class='lbl'>AI-modell</div>"
    +"<select id='model-select' style='width:100%;padding:11px 13px;border-radius:5px;background:#161616;border:1px solid #2a2a2a;color:#f2f2f2;font-size:14px;margin-bottom:8px;font-family:\"JetBrains Mono\",monospace'>"
    +MODELS.map(function(m){return "<option value='"+esc(m.id)+"'"+(m.id===selectedModel?" selected":"")+">"+esc(m.name)+"</option>";}).join("")
    +"</select>"
    +"<div style='margin-bottom:20px;font-size:12px;color:#5c5c5c;line-height:1.5' id='model-desc'>"+esc(currentModel.desc)+"</div>"
    +"<div style='margin-top:24px;padding:14px;background:#161616;border-radius:12px;border:1px solid #2a2a2a;font-size:12px;color:#5c5c5c;line-height:1.6'>"
    +"Modellen galler for alla AI-funktioner i appen.</div>"
    +"<div class='mt20'><div class='lbl'>Exportera Manad</div>"
    +"<div style='font-size:13px;color:#5c5c5c;margin-bottom:12px;line-height:1.5'>Valj en manad och format for att ladda ner alla inlagg.</div>"
    +(monthKeys.length
      ?"<select id='pdfmonth' style='width:100%;padding:11px 13px;border-radius:10px;background:#161616;border:1px solid #2a2a2a;color:#f2f2f2;font-size:14px;margin-bottom:10px;font-family:inherit'>"
        +monthOptions+"</select>"
        +"<select id='exportformat' style='width:100%;padding:11px 13px;border-radius:10px;background:#161616;border:1px solid #2a2a2a;color:#f2f2f2;font-size:14px;margin-bottom:10px;font-family:inherit'><option value='pdf'>PDF</option><option value='json'>JSON</option></select>"
        +"<button class='sec' id='pdfbtn'>Ladda ner</button>"
      :"<div style='padding:12px;background:#131313;border-radius:10px;font-size:13px;color:#5c5c5c'>Inga inlagg att exportera annu.</div>")
    +"</div>"
    +"<div class='mt20'><div class='lbl'>Exportera Notering</div>"
    +"<div style='font-size:13px;color:#5c5c5c;margin-bottom:12px;line-height:1.5'>Ladda ner allt fran Fundering, Anteckning och Lärdom som en Markdown-fil.</div>"
    +"<button class='sec' id='noteringmdbtn'>Ladda ner Notering (.md)</button>"
    +"</div>"
    +"<div class='mt20'><div class='lbl'>Redigera snabbval</div>"
    +"<div style='font-size:13px;color:#5c5c5c;margin-bottom:12px'>Lägg till eller ta bort alternativ i dropdownmenyerna på Logga, grupperat efter flik.</div>"

    +"<button data-presetgroup='aktivitet' class='sec ghost' style='width:100%;margin-bottom:8px;text-align:left'>"+(settingsGroupOpen.aktivitet?"▲":"▼")+" Aktivitet</button>"
    +"<div id='presetgroup-aktivitet' style='display:"+(settingsGroupOpen.aktivitet?"block":"none")+"'>"
    +"<div class='lbl' style='font-size:11px;margin-bottom:6px'>🏷️ Kategorier</div>"
    +"<div id='cat-preset-editor' style='margin-bottom:10px'></div>"
    +"<div style='display:flex;gap:6px;margin-bottom:16px'>"
    +"<input class='inp' id='new-cat-inp' placeholder='Ny kategori...' style='flex:1'/>"
    +"<button id='add-cat-btn' class='abtn'>+</button>"
    +"</div>"
    +"</div>"

    +"<button data-presetgroup='funderingar' class='sec ghost' style='width:100%;margin-bottom:8px;text-align:left'>"+(settingsGroupOpen.funderingar?"▲":"▼")+" Notering</button>"
    +"<div id='presetgroup-funderingar' style='display:"+(settingsGroupOpen.funderingar?"block":"none")+"'>"
    +"<div class='lbl' style='font-size:11px;margin-bottom:6px'>💭 Fundering-kategorier</div>"
    +"<div id='fundcat-preset-editor' style='margin-bottom:10px'></div>"
    +"<div style='display:flex;gap:6px;margin-bottom:16px'>"
    +"<input class='inp' id='new-fundcat-inp' placeholder='Ny funderingskategori...' style='flex:1'/>"
    +"<button id='add-fundcat-btn' class='abtn'>+</button>"
    +"</div>"
    +"<div class='lbl' style='font-size:11px;margin-bottom:6px'>💡 Anteckning-kategorier</div>"
    +"<div id='ttcat-preset-editor' style='margin-bottom:10px'></div>"
    +"<div style='display:flex;gap:6px;margin-bottom:16px'>"
    +"<input class='inp' id='new-ttcat-inp' placeholder='Ny anteckningskategori...' style='flex:1'/>"
    +"<button id='add-ttcat-btn' class='abtn'>+</button>"
    +"</div>"
    +"</div>"

    +"<button data-presetgroup='konversation' class='sec ghost' style='width:100%;margin-bottom:8px;text-align:left'>"+(settingsGroupOpen.konversation?"▲":"▼")+" Konversation (Samtalsämnen)</button>"
    +"<div id='presetgroup-konversation' style='display:"+(settingsGroupOpen.konversation?"block":"none")+"'>"
    +"<div class='lbl' style='font-size:11px;margin-bottom:6px'>🗣️ Samtalsämnen-kategorier</div>"
    +"<div id='amnecat-preset-editor' style='margin-bottom:10px'></div>"
    +"<div style='display:flex;gap:6px;margin-bottom:16px'>"
    +"<input class='inp' id='new-amnecat-inp' placeholder='Ny kategori...' style='flex:1'/>"
    +"<button id='add-amnecat-btn' class='abtn'>+</button>"
    +"</div>"
    +"</div>"

    +"<button data-presetgroup='utvarderingar' class='sec ghost' style='width:100%;margin-bottom:8px;text-align:left'>"+(settingsGroupOpen.utvarderingar?"▲":"▼")+" Betyg (Media, Föremål, Plats)</button>"
    +"<div id='presetgroup-utvarderingar' style='display:"+(settingsGroupOpen.utvarderingar?"block":"none")+"'>"
    +"<div class='lbl' style='font-size:11px;margin-bottom:6px'>🎬 Kategorier (Media)</div>"
    +"<div id='mediacat-preset-editor' style='margin-bottom:10px'></div>"
    +"<div style='display:flex;gap:6px;margin-bottom:16px'>"
    +"<input class='inp' id='new-mediacat-inp' placeholder='Ny kategori...' style='flex:1'/>"
    +"<button id='add-mediacat-btn' class='abtn'>+</button>"
    +"</div>"
    +"<div class='lbl' style='font-size:11px;margin-bottom:6px'>🔧 Kategorier (Föremål)</div>"
    +"<div id='objcat-preset-editor' style='margin-bottom:10px'></div>"
    +"<div style='display:flex;gap:6px;margin-bottom:16px'>"
    +"<input class='inp' id='new-objcat-inp' placeholder='Ny kategori...' style='flex:1'/>"
    +"<button id='add-objcat-btn' class='abtn'>+</button>"
    +"</div>"
    +"<div class='lbl' style='font-size:11px;margin-bottom:6px'>📍 Kategorier (Plats)</div>"
    +"<div id='platscat-preset-editor' style='margin-bottom:10px'></div>"
    +"<div style='display:flex;gap:6px;margin-bottom:16px'>"
    +"<input class='inp' id='new-platscat-inp' placeholder='Ny kategori...' style='flex:1'/>"
    +"<button id='add-platscat-btn' class='abtn'>+</button>"
    +"</div>"
    +"</div>"


    +"<div style='margin-top:14px;padding-top:14px;border-top:1px solid #2a2a2a'>"
    +"<div style='font-size:12px;color:#5c5c5c;margin-bottom:8px'>Kategorier skrivs med emoji + mellanslag + namn, t.ex. <b style='color:#f2f2f2'>🎣 Fiske</b>. Ladda ner referenslistan för att kopiera emojis:</div>"
    +"<button id='emoji-ref-btn' class='sec ghost' style='width:100%'>📋 Ladda ner Emoji-referens</button>"
    +"</div>"
    +"</div>"
    +"<div class='mt20'><div class='lbl'>Drive-filer</div>"
    +"<div style='font-size:13px;color:#5c5c5c;margin-bottom:10px;line-height:1.5'>Google Drives egen förhandsvisning av JSON-filer är skrivskyddad. Använd \"Redigera i appen\" för att faktiskt kunna ändra innehållet.</div>"
    +"<select id='drive-file-select' style='width:100%;padding:11px 13px;border-radius:10px;background:#161616;border:1px solid #2a2a2a;color:#f2f2f2;font-size:14px;margin-bottom:8px;font-family:inherit'>"
    +"<option value=''>-- Välj fil --</option>"
    +Object.keys(DRIVE_STRUCTURE).filter(function(p){return p!=="SamtalLegacy";}).sort(function(a,b){return (PATH_LABELS[a]||a).localeCompare(PATH_LABELS[b]||b,"sv");}).map(function(p){return "<option value='"+p+"'>"+(PATH_LABELS[p]||p)+"</option>";}).join("")
    +"</select>"
    +"<div style='display:flex;gap:8px'>"
    +"<button id='edit-drive-file-btn' class='sec' style='flex:1'>✏️ Redigera i appen</button>"
    +"<button id='open-drive-file-btn' class='sec ghost' style='flex:1'>Öppna i Google Drive</button>"
    +"</div>"
    +"</div>"
    +"<div class='mt20'><div class='lbl'>Ladda ner allt (ZIP)</div>"
    +"<div style='font-size:13px;color:#5c5c5c;margin-bottom:12px;line-height:1.5'>Ladda ner alla JSON-filer och bilder i ett ZIP-arkiv.</div>"
    +"<button class='sec ghost' id='zipdownloadbtn'>📦 Ladda ner ZIP</button>"
    +"<div id='zipstatus'></div>"
    +"</div>"
    +"<div class='mt20' style='border-top:1px solid #2a2a2a;padding-top:20px'>"
    +"<div class='lbl' style='color:#d97a83'>Rensa data</div>"
    +"<div style='font-size:13px;color:#5c5c5c;margin-bottom:12px;line-height:1.5'>Tar bort all inmatad data permanent. Det går inte att angra.</div>"
    +"<button id='rewritebtn' style='width:100%;padding:13px;border-radius:12px;background:#0a1a2a;border:1px solid #4fa8ff;color:#4fa8ff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;margin-bottom:10px'>↺ Skriv om alla Drive-filer</button>"
    +"<button id='clearbtn' style='width:100%;padding:13px;border-radius:12px;background:#241315;border:1px solid #4a1a1a;color:#d97a83;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit'>Rensa all data</button>"
    +"</div>"
    +"</div>"
    +"<button class='overlay-close' id='settings-close-btn' style='max-width:520px;margin:0 auto;display:block'>stäng</button>";

  var settingsSignoutBtn=b.querySelector("#settings-signout-btn");
  if(settingsSignoutBtn)settingsSignoutBtn.onclick=function(){signOut();};
  var settingsSyncBtn=b.querySelector("#sync-btn");
  if(settingsSyncBtn)settingsSyncBtn.onclick=function(){syncNow();};
  var settingsImportBtn=b.querySelector("#import-btn");
  if(settingsImportBtn)settingsImportBtn.onclick=function(){importFromDrive();};
  var modelSelect=b.querySelector("#model-select");
  if(modelSelect)modelSelect.onchange=function(){
    selectedModel=modelSelect.value;
    try{sessionStorage.setItem("selected_model_session",selectedModel);}catch(e){}
    var m=MODELS.find(function(x){return x.id===selectedModel;});
    var desc=b.querySelector("#model-desc");
    if(desc&&m)desc.textContent=m.desc;
  };
  var pdfBtn=b.querySelector("#pdfbtn");
  if(pdfBtn){
    pdfBtn.onclick=function(){
      var sel=b.querySelector("#pdfmonth");
      var fmt=b.querySelector("#exportformat");
      if(!sel)return;
      if(fmt&&fmt.value==="json")exportJsonMonth(sel.value);
      else exportPdf(sel.value);
    };
  }
  var noteringMdBtn=b.querySelector("#noteringmdbtn");
  if(noteringMdBtn)noteringMdBtn.onclick=function(){exportNoteringMd();};
  // Preset editors
  function renderPresetEditor(containerId, arr, onRemove, onMove, onSort, onSortRev){
    var el=b.querySelector("#"+containerId);
    if(!el)return;
    var sortBtnHtml=(onSort&&arr.length>1)?"<button data-sortbtn='1' style='margin-bottom:8px;margin-right:6px;padding:6px 12px;border-radius:8px;background:#131313;border:1px solid #2a2a2a;color:#5c5c5c;font-size:11px;cursor:pointer'>🔤 Sortera A-Ö</button>":"";
    var sortRevBtnHtml=(onSortRev&&arr.length>1)?"<button data-sortrevbtn='1' style='margin-bottom:8px;padding:6px 12px;border-radius:8px;background:#131313;border:1px solid #2a2a2a;color:#5c5c5c;font-size:11px;cursor:pointer'>🔤 Sortera Ö-A</button>":"";
    el.innerHTML=sortBtnHtml+sortRevBtnHtml+(arr.length?arr.map(function(p,i){
      return "<div style='display:flex;align-items:center;gap:6px;margin-bottom:6px'>"
        +"<div style='display:flex;flex-direction:column;gap:2px'>"
        +"<button data-up='"+i+"' style='padding:1px 6px;border-radius:4px;background:#131313;border:1px solid #2a2a2a;color:#5c5c5c;font-size:10px;cursor:pointer;line-height:1.4'"+">"+(i===0?"&nbsp;":"▲")+"</button>"
        +"<button data-dn='"+i+"' style='padding:1px 6px;border-radius:4px;background:#131313;border:1px solid #2a2a2a;color:#5c5c5c;font-size:10px;cursor:pointer;line-height:1.4'"+">"+(i===arr.length-1?"&nbsp;":"▼")+"</button>"
        +"</div>"
        +"<span style='flex:1;font-size:13px;color:#f2f2f2;padding:7px 10px;background:#131313;border-radius:8px;border:1px solid #2a2a2a'>"+esc(p)+"</span>"
        +"<button data-rmidx='"+i+"' style='padding:4px 10px;border-radius:8px;background:#241315;border:1px solid #d97a83;color:#d97a83;font-size:12px;cursor:pointer'>x</button>"
        +"</div>";
    }).join(""):"<div style='font-size:12px;color:#5c5c5c;margin-bottom:6px'>Inga alternativ.</div>");
    el.querySelectorAll("[data-rmidx]").forEach(function(btn){
      btn.onclick=function(){onRemove(parseInt(btn.dataset.rmidx));};
    });
    el.querySelectorAll("[data-up]").forEach(function(btn){
      btn.onclick=function(){
        var i=parseInt(btn.dataset.up);
        if(i>0)onMove(i,i-1);
      };
    });
    el.querySelectorAll("[data-dn]").forEach(function(btn){
      btn.onclick=function(){
        var i=parseInt(btn.dataset.dn);
        if(i<arr.length-1)onMove(i,i+1);
      };
    });
    if(onSort){
      var sortBtn=el.querySelector("[data-sortbtn]");
      if(sortBtn)sortBtn.onclick=function(){onSort();};
    }
    if(onSortRev){
      var sortRevBtn=el.querySelector("[data-sortrevbtn]");
      if(sortRevBtn)sortRevBtn.onclick=function(){onSortRev();};
    }
  }
  // Emoji reference download
  var emojiRefBtn=b.querySelector("#emoji-ref-btn");
  if(emojiRefBtn)emojiRefBtn.onclick=function(){downloadEmojiRef();};

  b.querySelectorAll("[data-presetgroup]").forEach(function(btn){
    btn.onclick=function(){
      var key=btn.dataset.presetgroup;
      settingsGroupOpen[key]=!settingsGroupOpen[key];
      renderInstallningar();
    };
  });

  renderPresetEditor("cat-preset-editor",CAT_PRESETS.map(function(id){
    var ct=CATS.find(function(c){return c.id===id;});
    return ct?ct.e+" "+ct.label:id;
  }),function(i){
    CAT_PRESETS.splice(i,1);saveAndSync("installningar");renderInstallningar();refreshCatDropdown();
  },function(i,j){var tmp=CAT_PRESETS[i];CAT_PRESETS[i]=CAT_PRESETS[j];CAT_PRESETS[j]=tmp;saveAndSync("installningar");renderInstallningar();refreshCatDropdown();},function(){
    CAT_PRESETS.sort(function(a,b){
      return catPresetSortKey(a).toLowerCase().localeCompare(catPresetSortKey(b).toLowerCase(),"sv");
    });
    saveAndSync("installningar");renderInstallningar();refreshCatDropdown();
  },function(){
    CAT_PRESETS.sort(function(a,b){
      return catPresetSortKey(b).toLowerCase().localeCompare(catPresetSortKey(a).toLowerCase(),"sv");
    });
    saveAndSync("installningar");renderInstallningar();refreshCatDropdown();
  });
  var newCatInp=b.querySelector("#new-cat-inp");
  var addCatBtn=b.querySelector("#add-cat-btn");
  if(addCatBtn)addCatBtn.onclick=function(){
    var v=newCatInp?newCatInp.value.trim():"";
    if(v&&CAT_PRESETS.indexOf(v)<0){CAT_PRESETS.push(v);saveAndSync("installningar");if(newCatInp)newCatInp.value="";renderInstallningar();refreshCatDropdown();}
  };
  if(newCatInp)newCatInp.onkeydown=function(e){if(e.key==="Enter")addCatBtn.onclick();};

  renderPresetEditor("fundcat-preset-editor",FUND_CAT_PRESETS,function(i){
    FUND_CAT_PRESETS.splice(i,1);saveAndSync("installningar");renderInstallningar();if(view==="log")render();
  },function(i,j){var tmp=FUND_CAT_PRESETS[i];FUND_CAT_PRESETS[i]=FUND_CAT_PRESETS[j];FUND_CAT_PRESETS[j]=tmp;saveAndSync("installningar");renderInstallningar();if(view==="log")render();},function(){FUND_CAT_PRESETS.sort(function(a,b){return sortLabelKey(a).toLowerCase().localeCompare(sortLabelKey(b).toLowerCase(),"sv");});saveAndSync("installningar");renderInstallningar();if(view==="log")render();},function(){FUND_CAT_PRESETS.sort(function(a,b){return sortLabelKey(b).toLowerCase().localeCompare(sortLabelKey(a).toLowerCase(),"sv");});saveAndSync("installningar");renderInstallningar();if(view==="log")render();});
  var newFundCatInp=b.querySelector("#new-fundcat-inp");
  var addFundCatBtn=b.querySelector("#add-fundcat-btn");
  if(addFundCatBtn)addFundCatBtn.onclick=function(){
    var v=newFundCatInp?newFundCatInp.value.trim():"";
    if(v&&FUND_CAT_PRESETS.indexOf(v)<0){FUND_CAT_PRESETS.push(v);saveAndSync("installningar");if(newFundCatInp)newFundCatInp.value="";renderInstallningar();if(view==="log")render();}
  };
  if(newFundCatInp)newFundCatInp.onkeydown=function(e){if(e.key==="Enter")addFundCatBtn.onclick();};

  renderPresetEditor("ttcat-preset-editor",TIPSTRICKS_CAT_PRESETS,function(i){
    TIPSTRICKS_CAT_PRESETS.splice(i,1);saveAndSync("installningar");renderInstallningar();if(view==="log")render();
  },function(i,j){var tmp=TIPSTRICKS_CAT_PRESETS[i];TIPSTRICKS_CAT_PRESETS[i]=TIPSTRICKS_CAT_PRESETS[j];TIPSTRICKS_CAT_PRESETS[j]=tmp;saveAndSync("installningar");renderInstallningar();if(view==="log")render();},function(){TIPSTRICKS_CAT_PRESETS.sort(function(a,b){return sortLabelKey(a).toLowerCase().localeCompare(sortLabelKey(b).toLowerCase(),"sv");});saveAndSync("installningar");renderInstallningar();if(view==="log")render();},function(){TIPSTRICKS_CAT_PRESETS.sort(function(a,b){return sortLabelKey(b).toLowerCase().localeCompare(sortLabelKey(a).toLowerCase(),"sv");});saveAndSync("installningar");renderInstallningar();if(view==="log")render();});
  var newTtCatInp=b.querySelector("#new-ttcat-inp");
  var addTtCatBtn=b.querySelector("#add-ttcat-btn");
  if(addTtCatBtn)addTtCatBtn.onclick=function(){
    var v=newTtCatInp?newTtCatInp.value.trim():"";
    if(v&&TIPSTRICKS_CAT_PRESETS.indexOf(v)<0){TIPSTRICKS_CAT_PRESETS.push(v);saveAndSync("installningar");if(newTtCatInp)newTtCatInp.value="";renderInstallningar();if(view==="log")render();}
  };
  if(newTtCatInp)newTtCatInp.onkeydown=function(e){if(e.key==="Enter")addTtCatBtn.onclick();};

  renderPresetEditor("mediacat-preset-editor",MEDIA_CAT_PRESETS,function(i){
    MEDIA_CAT_PRESETS.splice(i,1);saveAndSync("installningar");renderInstallningar();if(view==="log")render();
  },function(i,j){var tmp=MEDIA_CAT_PRESETS[i];MEDIA_CAT_PRESETS[i]=MEDIA_CAT_PRESETS[j];MEDIA_CAT_PRESETS[j]=tmp;saveAndSync("installningar");renderInstallningar();if(view==="log")render();},function(){MEDIA_CAT_PRESETS.sort(function(a,b){return sortLabelKey(a).toLowerCase().localeCompare(sortLabelKey(b).toLowerCase(),"sv");});saveAndSync("installningar");renderInstallningar();if(view==="log")render();},function(){MEDIA_CAT_PRESETS.sort(function(a,b){return sortLabelKey(b).toLowerCase().localeCompare(sortLabelKey(a).toLowerCase(),"sv");});saveAndSync("installningar");renderInstallningar();if(view==="log")render();});
  var newMediaCatInp=b.querySelector("#new-mediacat-inp");
  var addMediaCatBtn=b.querySelector("#add-mediacat-btn");
  if(addMediaCatBtn)addMediaCatBtn.onclick=function(){
    var v=newMediaCatInp?newMediaCatInp.value.trim():"";
    if(v&&MEDIA_CAT_PRESETS.indexOf(v)<0){MEDIA_CAT_PRESETS.push(v);saveAndSync("installningar");if(newMediaCatInp)newMediaCatInp.value="";renderInstallningar();if(view==="log")render();}
  };
  if(newMediaCatInp)newMediaCatInp.onkeydown=function(e){if(e.key==="Enter")addMediaCatBtn.onclick();};

  renderPresetEditor("amnecat-preset-editor",AMNE_CAT_PRESETS,function(i){
    AMNE_CAT_PRESETS.splice(i,1);saveAndSync("installningar");renderInstallningar();if(view==="log")render();
  },function(i,j){var tmp=AMNE_CAT_PRESETS[i];AMNE_CAT_PRESETS[i]=AMNE_CAT_PRESETS[j];AMNE_CAT_PRESETS[j]=tmp;saveAndSync("installningar");renderInstallningar();if(view==="log")render();},function(){AMNE_CAT_PRESETS.sort(function(a,b){return sortLabelKey(a).toLowerCase().localeCompare(sortLabelKey(b).toLowerCase(),"sv");});saveAndSync("installningar");renderInstallningar();if(view==="log")render();},function(){AMNE_CAT_PRESETS.sort(function(a,b){return sortLabelKey(b).toLowerCase().localeCompare(sortLabelKey(a).toLowerCase(),"sv");});saveAndSync("installningar");renderInstallningar();if(view==="log")render();});
  var newAmneCatInp=b.querySelector("#new-amnecat-inp");
  var addAmneCatBtn=b.querySelector("#add-amnecat-btn");
  if(addAmneCatBtn)addAmneCatBtn.onclick=function(){
    var v=newAmneCatInp?newAmneCatInp.value.trim():"";
    if(v&&AMNE_CAT_PRESETS.indexOf(v)<0){AMNE_CAT_PRESETS.push(v);saveAndSync("installningar");if(newAmneCatInp)newAmneCatInp.value="";renderInstallningar();if(view==="log")render();}
  };
  if(newAmneCatInp)newAmneCatInp.onkeydown=function(e){if(e.key==="Enter")addAmneCatBtn.onclick();};

  renderPresetEditor("objcat-preset-editor",OBJ_CAT_PRESETS,function(i){
    OBJ_CAT_PRESETS.splice(i,1);saveAndSync("installningar");renderInstallningar();if(view==="log")render();
  },function(i,j){var tmp=OBJ_CAT_PRESETS[i];OBJ_CAT_PRESETS[i]=OBJ_CAT_PRESETS[j];OBJ_CAT_PRESETS[j]=tmp;saveAndSync("installningar");renderInstallningar();if(view==="log")render();},function(){OBJ_CAT_PRESETS.sort(function(a,b){return sortLabelKey(a).toLowerCase().localeCompare(sortLabelKey(b).toLowerCase(),"sv");});saveAndSync("installningar");renderInstallningar();if(view==="log")render();},function(){OBJ_CAT_PRESETS.sort(function(a,b){return sortLabelKey(b).toLowerCase().localeCompare(sortLabelKey(a).toLowerCase(),"sv");});saveAndSync("installningar");renderInstallningar();if(view==="log")render();});
  var newObjCatInp=b.querySelector("#new-objcat-inp");
  var addObjCatBtn=b.querySelector("#add-objcat-btn");
  if(addObjCatBtn)addObjCatBtn.onclick=function(){
    var v=newObjCatInp?newObjCatInp.value.trim():"";
    if(v&&OBJ_CAT_PRESETS.indexOf(v)<0){OBJ_CAT_PRESETS.push(v);saveAndSync("installningar");if(newObjCatInp)newObjCatInp.value="";renderInstallningar();if(view==="log")render();}
  };
  if(newObjCatInp)newObjCatInp.onkeydown=function(e){if(e.key==="Enter")addObjCatBtn.onclick();};

  renderPresetEditor("platscat-preset-editor",PLATS_CAT_PRESETS,function(i){
    PLATS_CAT_PRESETS.splice(i,1);saveAndSync("installningar");renderInstallningar();if(view==="log")render();
  },function(i,j){var tmp=PLATS_CAT_PRESETS[i];PLATS_CAT_PRESETS[i]=PLATS_CAT_PRESETS[j];PLATS_CAT_PRESETS[j]=tmp;saveAndSync("installningar");renderInstallningar();if(view==="log")render();},function(){PLATS_CAT_PRESETS.sort(function(a,b){return sortLabelKey(a).toLowerCase().localeCompare(sortLabelKey(b).toLowerCase(),"sv");});saveAndSync("installningar");renderInstallningar();if(view==="log")render();},function(){PLATS_CAT_PRESETS.sort(function(a,b){return sortLabelKey(b).toLowerCase().localeCompare(sortLabelKey(a).toLowerCase(),"sv");});saveAndSync("installningar");renderInstallningar();if(view==="log")render();});
  var newPlatsCatInp=b.querySelector("#new-platscat-inp");
  var addPlatsCatBtn=b.querySelector("#add-platscat-btn");
  if(addPlatsCatBtn)addPlatsCatBtn.onclick=function(){
    var v=newPlatsCatInp?newPlatsCatInp.value.trim():"";
    if(v&&PLATS_CAT_PRESETS.indexOf(v)<0){PLATS_CAT_PRESETS.push(v);saveAndSync("installningar");if(newPlatsCatInp)newPlatsCatInp.value="";renderInstallningar();if(view==="log")render();}
  };
  if(newPlatsCatInp)newPlatsCatInp.onkeydown=function(e){if(e.key==="Enter")addPlatsCatBtn.onclick();};

  var editDriveFileBtn=b.querySelector("#edit-drive-file-btn");
  if(editDriveFileBtn)editDriveFileBtn.onclick=function(){
    var sel=b.querySelector("#drive-file-select");
    if(!sel||!sel.value){alert("Välj en fil i listan.");return;}
    openJsonEditor(sel.value);
  };

  var openDriveBtn=b.querySelector("#open-drive-file-btn");
  if(openDriveBtn)openDriveBtn.onclick=async function(){
    var sel=b.querySelector("#drive-file-select");
    if(!sel||!sel.value){alert("Välj en fil i listan.");return;}
    var path=sel.value;
    openDriveBtn.textContent="Söker...";openDriveBtn.disabled=true;
    try{
      // Always search Drive fresh — ignore cache
      delete driveIdCache[path];
      var id=await driveGetFileId(path).catch(function(e){
        if(e.message&&e.message.startsWith("FIL_SAKNAS:"))return null;
        throw e;
      });
      if(id){
        window.open("https://drive.google.com/file/d/"+id+"/view","_blank");
      } else {
        // File not found — show options
        var def=DRIVE_STRUCTURE[path];
        var displayPath=def[0]+(def[1]?"/"+def[1]:"")+"/data.json";
        var overlay=document.createElement("div");
        overlay.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px";
        overlay.innerHTML="<div style='background:#161616;border-radius:16px;border:1px solid #4fa8ff;padding:20px;width:100%;max-width:400px'>"
          +"<div style='font-size:15px;font-weight:600;color:#f2f2f2;margin-bottom:10px'>Fil hittades inte</div>"
          +"<div style='font-size:13px;color:#5c5c5c;margin-bottom:6px'>Ingen data.json hittades i:</div>"
          +"<div style='font-size:12px;color:#4fa8ff;font-family:monospace;background:#131313;padding:8px 12px;border-radius:8px;margin-bottom:16px'>"+displayPath+"</div>"
          +"<div style='display:flex;flex-direction:column;gap:8px'>"
          +"<button id='dfo-create' style='padding:11px;border-radius:8px;background:#1c3c5a;border:1px solid #4fa8ff;color:#4fa8ff;font-size:13px;cursor:pointer;font-family:inherit'>✚ Skapa ny data.json här</button>"
          +"<label style='display:block;padding:11px;border-radius:8px;background:#131313;border:1px solid #2a2a2a;color:#f2f2f2;font-size:13px;cursor:pointer;text-align:center'>"
          +"📂 Peka på befintlig fil (välj från Drive-mapp)"
          +"<input type='file' id='dfo-pick' accept='.json,application/json' style='display:none'/></label>"
          +"<button id='dfo-cancel' style='padding:11px;border-radius:8px;background:#131313;border:1px solid #2a2a2a;color:#5c5c5c;font-size:13px;cursor:pointer;font-family:inherit'>Avbryt</button>"
          +"</div></div>";
        document.body.appendChild(overlay);
        overlay.querySelector("#dfo-cancel").onclick=function(){overlay.remove();};
        overlay.querySelector("#dfo-create").onclick=async function(){
          this.textContent="Skapar...";this.disabled=true;
          try{
            var newId=await driveEnsureFile(path);
            overlay.remove();
            window.open("https://drive.google.com/file/d/"+newId+"/view","_blank");
          }catch(err){this.textContent="Fel: "+err.message;this.disabled=false;}
        };
        overlay.querySelector("#dfo-pick").onchange=function(){
          // User picked a local JSON file — read and write its contents to Drive
          var file=this.files[0];
          if(!file)return;
          var lbl=overlay.querySelector("label");
          lbl.textContent="Läser fil...";
          var reader=new FileReader();
          reader.onload=async function(e){
            try{
              var data=JSON.parse(e.target.result);
              var wid=await driveEnsureFile(path);
              await driveWrite(path,data);
              driveIdCache[path]=wid;saveDriveCache();
              overlay.remove();
              window.open("https://drive.google.com/file/d/"+wid+"/view","_blank");
            }catch(err){lbl.textContent="Fel: "+err.message;}
          };
          reader.readAsText(file);
        };
      }
    }catch(e){
      reportDriveError(path,"Fel vid filsökning: "+e.message);
    }
    openDriveBtn.textContent="Öppna i Google Drive";openDriveBtn.disabled=false;
  };
  var zipBtn=b.querySelector("#zipdownloadbtn");
  if(zipBtn)zipBtn.onclick=function(){downloadZip(b.querySelector("#zipstatus"));};
  var dlAllImgs=b.querySelector("#downloadallimgsbtn");
  if(dlAllImgs&&imageHist.length){
    dlAllImgs.onclick=function(){downloadAllImages();};
  }
  var rewriteBtn=b.querySelector("#rewritebtn");
  if(rewriteBtn)rewriteBtn.onclick=async function(){
    rewriteBtn.disabled=true;rewriteBtn.textContent="Skriver om...";
    // Alla tabbar som har en egen data.json i Drive-strukturen.
    var ALL_TABS=["aktiviteter","samtaltext","samtalmuntligt","funderingar","samtalsamnen","media","objekt","plats","inmatningar","skamt","bilder","installningar"];
    for(var i=0;i<ALL_TABS.length;i++){
      var tabName=ALL_TABS[i];
      var path=tabName==="bilder"?"Bilder/Index":(DRIVE_STRUCTURE_BY_TAB[tabName]||null);
      // Se till att filen finns innan vi skriver, så vi slipper "Fil hittades inte"-dialogen per fil.
      if(path){
        try{await driveGetFileId(path);}
        catch(e){if(e.message&&e.message.startsWith("FIL_SAKNAS:")){try{await driveEnsureFile(path);}catch(e2){}}}
      }
      await saveTab(tabName);
    }
    rewriteBtn.textContent="✓ Klart!";
    setTimeout(function(){rewriteBtn.disabled=false;rewriteBtn.textContent="↺ Skriv om alla Drive-filer";},2500);
  };
  var clearBtn=b.querySelector("#clearbtn");
  if(clearBtn){
    clearBtn.onclick=function(){
      if(confirm("Ar du säker? All data raderas permanent och kan inte aterstallas.")){
        logs=[];tHist=[];
        konversationer=[];muntKonversationer=[];fundHist=[];
        saveAndSync("installningar");
        renderInstallningar();
        var st=document.getElementById("importstatus");
        if(st){st.innerHTML="<div style='color:#7fae7f;font-size:13px;margin-top:8px;text-align:center'>All data har rensats.</div>";}
      }
    };
  }
  var settingsCloseBtn=b.querySelector("#settings-close-btn");
  if(settingsCloseBtn)settingsCloseBtn.onclick=function(){closeInstallningarOverlay();};
}

async function downloadZip(statusEl){
  try{
    if(!window.JSZip){if(statusEl)statusEl.innerHTML="<div style='color:#d97a83;font-size:13px;margin-top:8px'>JSZip inte laddad.</div>";return;}
    if(statusEl)statusEl.innerHTML="<div style='color:#5c5c5c;font-size:13px;margin-top:8px'>Skapar ZIP...</div>";
    var zip=new JSZip();
    var date=new Date().toISOString().slice(0,10);

    // JSON files per tab
    var jsonFiles=[
      {path:"Aktivitet/data.json",data:{logs:logs}},
      {path:"Samtal/Text/data.json",data:{konversationer:konversationer}},
      {path:"Samtal/Muntligt/data.json",data:{muntKonversationer:muntKonversationer}},
      {path:"Notering/Fundering/data.json",data:{fundHist:fundHist}},
      {path:"Notering/Lardom/Vokabular/data.json",data:{vokabularHist:vokabularHist}},
      {path:"Notering/Lardom/Kunskap/data.json",data:{kunskapHist:kunskapHist}},
      {path:"Notering/Anteckning/data.json",data:{tipsTricksHist:tipsTricksHist}},
      {path:"Konversation/Samtalsämne/data.json",data:{amneHist:amneHist}},
      {path:"Betyg/Media/data.json",data:{mediaList:mediaList,mediaFardig:mediaFardig}},
      {path:"Betyg/Föremål/data.json",data:{objList:objList,objFardig:objFardig}},
      {path:"Betyg/Plats/data.json",data:{platsList:platsList,platsFardig:platsFardig}},
      {path:"Installningar/Inmatningar/data.json",data:{aktivitetHistory:aktivitetHistory,platsHistory:platsHistory,anteckningHistory:anteckningHistory,anteckningByCat:ANTECKNING_BY_CAT,actPresetsByCat:ACT_PRESETS_BY_CAT,placePresetsByCat:PLACE_PRESETS_BY_CAT,mediaCreatorByCat:MEDIA_CREATOR_BY_CAT,mediaGenreByCat:MEDIA_GENRE_BY_CAT,objMakerByCat:OBJ_MAKER_BY_CAT,platsKommunByCat:PLATS_KOMMUN_BY_CAT,tipsTricksSubcatByCat:TIPSTRICKS_SUBCAT_BY_CAT}},
      {path:"Konversation/Skämt/data.json",data:{savedJokes:savedJokes}},
      {path:"Bilder/index.json",data:{images:imageHist.map(function(i){return {id:i.id,logId:i.logId,activity:i.activity,category:i.category,mtype:i.mtype,timestamp:i.timestamp,driveId:i.driveId||null};})}},
      {path:"Installningar/data.json",data:{placePresets:PLACE_PRESETS,actPresets:ACT_PRESETS,catPresets:CAT_PRESETS,fundCatPresets:FUND_CAT_PRESETS,tipsTricksCatPresets:TIPSTRICKS_CAT_PRESETS,mediaCatPresets:MEDIA_CAT_PRESETS,amneCatPresets:AMNE_CAT_PRESETS,objCatPresets:OBJ_CAT_PRESETS,platsCatPresets:PLATS_CAT_PRESETS}}
    ];
    jsonFiles.forEach(function(f){
      zip.file(f.path,JSON.stringify(f.data,null,2));
    });

    // Images — load from Drive if needed
    var imgCount=0,imgFailCount=0;
    for(var i=0;i<imageHist.length;i++){
      var img=imageHist[i];
      var b64=img.base64;
      if(!b64&&img.driveId){
        if(statusEl)statusEl.innerHTML="<div style='color:#5c5c5c;font-size:13px;margin-top:8px'>Hämtar bild "+(i+1)+"/"+imageHist.length+"...</div>";
        try{b64=await loadImageBase64(img);}catch(e){b64=null;}
      }
      if(b64){
        try{
          var fname=buildImageFilename(img);
          var binary=atob(b64);
          var bytes=new Uint8Array(binary.length);
          for(var j=0;j<binary.length;j++)bytes[j]=binary.charCodeAt(j);
          zip.file("Bilder/"+fname,bytes,{binary:true});
          imgCount++;
        }catch(e){imgFailCount++;}
      } else {
        imgFailCount++;
      }
    }

    if(statusEl)statusEl.innerHTML="<div style='color:#5c5c5c;font-size:13px;margin-top:8px'>Packar ZIP...</div>";
    var blob=await zip.generateAsync({type:"blob",compression:"DEFLATE"});
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");
    a.href=url;a.download="AI-Assistent-"+date+".zip";
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    URL.revokeObjectURL(url);
    var msg="✓ ZIP nedladdad med "+jsonFiles.length+" JSON-filer och "+imgCount+" bilder.";
    if(imgFailCount>0)msg+=" ("+imgFailCount+" bilder kunde inte hämtas — kontrollera att du är inloggad.)";
    if(statusEl)statusEl.innerHTML="<div style='color:"+(imgFailCount>0?"#c9a24a":"#7fae7f")+";font-size:13px;margin-top:8px'>"+msg+"</div>";
  }catch(e){
    if(statusEl)statusEl.innerHTML="<div style='color:#d97a83;font-size:13px;margin-top:8px'>Fel: "+e.message+"</div>";
  }
}


function exportJson(){
  var data={
    version:1,
    exportedAt:new Date().toISOString(),
    logs:logs,
    tHist:tHist,
    konversationer:konversationer,muntKonversationer:muntKonversationer,fundHist:fundHist
  };
  var json=JSON.stringify(data,null,2);
  var blob=new Blob([json],{type:"application/json"});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");
  a.href=url;
  a.download="ai-assistent-backup-"+new Date().toISOString().slice(0,10)+".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importJson(file){
  var st=document.getElementById("importstatus");
  if(st)st.innerHTML="<div style='color:#5c5c5c;font-size:13px;margin-top:8px;text-align:center'>Importerar...</div>";
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var data=JSON.parse(e.target.result);
      if(!data||typeof data!=="object"){throw new Error("Ogiltig fil");}
      function mergeArr(a,b){
        var map=new Map();
        (a||[]).concat(b||[]).forEach(function(x){map.set(String(x.id||x.timestamp),x);});
        return Array.from(map.values()).sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);});
      }
      logs=mergeArr(logs,data.logs);
      tHist=mergeArr(tHist,data.tHist);
      konversationer=mergeArr(konversationer,data.konversationer);
      muntKonversationer=mergeArr(muntKonversationer,data.muntKonversationer);
      fundHist=mergeArr(fundHist,data.fundHist);
      var count=logs.length+fundHist.length+konversationer.length+muntKonversationer.length;
      if(st)st.innerHTML="<div style='color:#7fae7f;font-size:13px;margin-top:8px;text-align:center'>✓ Import klar — "+count+" poster inladdade.</div>";
    }catch(err){
      if(st)st.innerHTML="<div style='color:#d97a83;font-size:13px;margin-top:8px;text-align:center'>Fel: "+esc(err.message)+". Kontrollera att filen ar en giltig JSON-backup.</div>";
    }
  };
  reader.onerror=function(){if(st)st.innerHTML="<div style='color:#d97a83;font-size:13px;margin-top:8px'>Kunde inte lasa filen.</div>";};
  reader.readAsText(file);
}

function exportMediaCsv(){
  var allCats=MEDIA_CAT_PRESETS.slice();
  Object.keys(mediaList||{}).forEach(function(k){if(allCats.indexOf(k)<0)allCats.push(k);});
  (mediaFardig||[]).forEach(function(e){if(allCats.indexOf(e.cat)<0)allCats.push(e.cat);});
  var sections=allCats.map(function(k){
    var items=(mediaList[k]||[]).map(function(j){
      var title=mediaItemTitle(j),creator=mediaItemCreator(j),genre=mediaItemGenre(j);
      return '"'+title.replace(/"/g,'""')+'","'+creator.replace(/"/g,'""')+'","'+genre.replace(/"/g,'""')+'"';
    }).join(",\n");
    return "-> \""+k.replace(/"/g,'""')+"\":\n"+(items||"");
  });
  var csv=sections.join("\n\n");
  // Always add FÄRDIGA section with all categories
  var fardigSections={};
  (mediaFardig||[]).forEach(function(e){
    if(!fardigSections[e.cat])fardigSections[e.cat]=[];
    fardigSections[e.cat].push(e);
  });
  csv+="\n\n->FÄRDIGA<-";
  allCats.forEach(function(k){
    var entries=fardigSections[k]||[];
    csv+="\n\n-> \""+k.replace(/"/g,'""')+"\":\n";
    if(entries.length){
      csv+=entries.map(function(e){
        return '"'+e.title.replace(/"/g,'""')+'","'+(e.creator||"").replace(/"/g,'""')+'","'+(e.genre||"").replace(/"/g,'""')+'", betyg:'+e.rating+(e.comment?', kommentar:"'+e.comment.replace(/"/g,'""')+'"':"");
      }).join(",\n");
    }
  });
  var blob=new Blob(["\uFEFF"+csv.trim()],{type:"text/csv;charset=utf-8"});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");
  a.href=url;a.download="media-"+new Date().toISOString().slice(0,10)+".csv";
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
}

function importMediaCsv(file,cat){
  var st=document.getElementById("mediastatus");
  if(st)st.innerHTML="<div style='color:#5c5c5c;font-size:13px;margin-top:8px'>Importerar...</div>";
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var text=e.target.result.replace(/^\uFEFF/,"").replace(/\r\n/g,"\n").replace(/\r/g,"\n");

      // Split into pending and fardig sections at ->FÄRDIGA<-
      var fardigSplit=text.split("->FÄRDIGA<-");
      var pendingText=fardigSplit[0];
      var fardigText=fardigSplit.length>1?fardigSplit[1]:"";

      function parseSections(txt){
        // Find all -> "Kategori": blocks — category name is used directly as the key
        var result={};
        var regex=/-> "([^"]+)":\n([\s\S]*?)(?=\n-> "|$)/g;
        var m;
        while((m=regex.exec(txt))!==null){
          var catKey=m[1].trim();
          if(!catKey)continue;
          var raw=m[2].trim();
          var items=[];
          if(raw){
            // Each line: "Title","Creator","Genre" (optional trailing fields may be missing for old exports)
            raw.split(/\n/).forEach(function(line){
              line=line.trim().replace(/,$/,"");
              if(!line)return;
              var titleM=line.match(/^"((?:[^"\\]|\\.)*)"/);
              if(!titleM){
                // Fallback: plain unquoted line (old format)
                items.push({title:line.replace(/^,|,$/g,"").trim(),creator:"",genre:""});
                return;
              }
              var title=titleM[1].replace(/""/g,'"');
              var rest=line.slice(titleM[0].length).replace(/^,/,"");
              var creatorM=rest.match(/^"((?:[^"\\]|\\.)*)"/);
              var creator=creatorM?creatorM[1].replace(/""/g,'"'):"";
              var rest2=creatorM?rest.slice(creatorM[0].length).replace(/^,/,""):"";
              var genreM=rest2.match(/^"((?:[^"\\]|\\.)*)"/);
              var genre=genreM?genreM[1].replace(/""/g,'"'):"";
              items.push({title:title,creator:creator,genre:genre});
            });
          }
          result[catKey]=items;
        }
        return result;
      }

      // Parse pending
      var newMedia={};
      var parsed=parseSections(pendingText);
      Object.keys(parsed).forEach(function(k){newMedia[k]=parsed[k];});
      mediaList=newMedia;

      // Parse FÄRDIGA if present
      if(fardigText){
        var newFardig=[];
        var fregex=/-> "([^"]+)":\n([\s\S]*?)(?=\n-> "|$)/g;
        var fm;
        while((fm=fregex.exec(fardigText))!==null){
          var catKey=fm[1].trim();
          if(!catKey)continue;
          fm[2].trim().split(/,?\n/).forEach(function(line){
            line=line.trim();
            if(!line)return;
            // Format: "Titel","Kreatör","Genre", betyg:N, kommentar:"..."
            var titleM=line.match(/^"((?:[^"\\]|\\.)*)"/);
            if(!titleM)return;
            var title=titleM[1].replace(/""/g,'"');
            var rest=line.slice(titleM[0].length).replace(/^,/,"");
            var creatorM=rest.match(/^"((?:[^"\\]|\\.)*)"/);
            var creator=creatorM?creatorM[1].replace(/""/g,'"'):"";
            var rest2=creatorM?rest.slice(creatorM[0].length).replace(/^,/,""):"";
            var genreM=rest2.match(/^"((?:[^"\\]|\\.)*)"/);
            var genre=genreM?genreM[1].replace(/""/g,'"'):"";
            var ratingM=line.match(/betyg:(\d)/);
            var commentM=line.match(/kommentar:"((?:[^"\\]|\\.)*)"/);
            newFardig.push({
              title:title,cat:catKey,creator:creator,genre:genre,
              rating:ratingM?parseInt(ratingM[1]):0,
              comment:commentM?commentM[1]:"",
              timestamp:new Date().toISOString()
            });
          });
        }
        mediaFardig=newFardig;
      }

      saveAndSync("media");
      var totalPending=Object.values(newMedia).reduce(function(s,a){return s+a.length;},0);
      if(st)st.innerHTML="<div style='color:#7fae7f;font-size:13px;margin-top:8px'>✓ "+totalPending+" att konsumera, "+(fardigText?mediaFardig.length:0)+" färdiga inladdade.</div>";
    }catch(err){
      if(st)st.innerHTML="<div style='color:#d97a83;font-size:13px;margin-top:8px'>Fel: "+esc(err.message)+"</div>";
    }
  };
  reader.readAsText(file,"UTF-8");
}

function downloadAllImages(){
  if(!imageHist.length){alert("Inga bilder att ladda ner.");return;}
  imageHist.forEach(function(img,idx){
    var d=new Date(img.timestamp);
    var yy=String(d.getFullYear()).slice(-2);
    var mm=String(d.getMonth()+1).padStart(2,"0");
    var dd=String(d.getDate()).padStart(2,"0");
    var title=img.activity||"bild";
    var fname=yy+"-"+mm+"-"+dd+(title?", "+title:"");
    // Convert to JPEG via canvas if needed
    var dataUrl="data:"+(img.mtype||"image/jpeg")+";base64,"+img.base64;
    var canvas=document.createElement("canvas");
    var image=new Image();
    image.onload=function(){
      canvas.width=image.width;canvas.height=image.height;
      var ctx=canvas.getContext("2d");
      ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(image,0,0);
      var jpegUrl=canvas.toDataURL("image/jpeg",0.92);
      var a=document.createElement("a");
      a.href=jpegUrl;a.download=fname+".jpg";
      document.body.appendChild(a);a.click();document.body.removeChild(a);
    };
    image.src=dataUrl;
  });
}

function exportCsv(){
  if(!savedJokes.length){alert("Inga sparade skämt att exportera.");return;}
  var csv=savedJokes.map(function(j){return '"'+j.replace(/"/g,'""')+'"';}).join(",\n");
  var blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");
  a.href=url;a.download="skamt-"+new Date().toISOString().slice(0,10)+".csv";
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
}

function importCsv(file){
  var st=document.getElementById("csvstatus");
  if(st)st.innerHTML="<div style='color:#5c5c5c;font-size:13px;margin-top:8px'>Importerar...</div>";
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var text=e.target.result.replace(/^\uFEFF/,"");
      // Split on ",\n" separator
      var jokes=text.split(",\n").map(function(l){return l.trim().replace(/^"|"$/g,"").replace(/""/g,'"');}).filter(function(l){return l.length>0;});
      if(!jokes.length)throw new Error("Inga skämt hittades i filen.");
      savedJokes=jokes;saveAndSync("skamt");
      if(st)st.innerHTML="<div style='color:#7fae7f;font-size:13px;margin-top:8px'>✓ "+jokes.length+" skämt inladdade.</div>";
    }catch(err){
      if(st)st.innerHTML="<div style='color:#d97a83;font-size:13px;margin-top:8px'>Fel: "+esc(err.message)+"</div>";
    }
  };
  reader.readAsText(file,"UTF-8");
}

function exportJsonMonth(monthKey){
  var parts=monthKey.split("-");
  var year=parseInt(parts[0]),month=parseInt(parts[1])-1;
  var start=new Date(year,month,1);
  var end=new Date(year,month+1,0,23,59,59,999);
  var inMonth=function(ts){var d=new Date(ts);return d>=start&&d<=end;};
  var MONTHS=["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"];

  var data={
    version:1,
    period:MONTHS[month]+" "+year,
    exportedAt:new Date().toISOString(),
    logs:logs.filter(function(l){return inMonth(l.timestamp);}),
    fundHist:fundHist.filter(function(f){return inMonth(f.timestamp);}),
    konversationer:konversationer.filter(function(k){return inMonth(k.timestamp);}),
    muntKonversationer:muntKonversationer.filter(function(k){return inMonth(k.timestamp);})
  };

  var json=JSON.stringify(data,null,2);
  var blob=new Blob([json],{type:"application/json"});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");
  a.href=url;
  a.download="ai-assistent-"+monthKey+".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportNoteringMd(){
  var MONTHS=["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"];
  function fmtDate(ts){
    var d=new Date(ts);
    return String(d.getDate()).padStart(2,"0")+" "+MONTHS[d.getMonth()]+" "+d.getFullYear()+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
  }
  var md="# Notering - export\n\nSkapad: "+fmtDate(new Date().toISOString())+"\n\n";

  md+="## Fundering ("+fundHist.length+")\n\n";
  if(fundHist.length){
    fundHist.slice().sort(function(a,b){return new Date(a.timestamp)-new Date(b.timestamp);}).forEach(function(f){
      md+="- **"+fmtDate(f.timestamp)+"**"+(f.category?" · "+f.category:"")+"\n\n  "+f.text.replace(/\n/g,"\n  ")+"\n\n";
    });
  } else {
    md+="_Inga anteckningar annu._\n\n";
  }

  md+="## Anteckning ("+tipsTricksHist.length+")\n\n";
  if(tipsTricksHist.length){
    tipsTricksHist.slice().sort(function(a,b){return new Date(a.timestamp)-new Date(b.timestamp);}).forEach(function(f){
      var subs=f.subcategories||(f.subcategory?[f.subcategory]:[]);
      var metaParts=[];
      if(f.category)metaParts.push(f.category);
      if(subs.length)metaParts.push(subs.join(", "));
      md+="- **"+fmtDate(f.timestamp)+"**"+(metaParts.length?" · "+metaParts.join(" · "):"")+"\n\n";
      if(f.rubrik)md+="  ### "+f.rubrik+"\n\n";
      md+="  "+f.text.replace(/\n/g,"\n  ")+"\n\n";
    });
  } else {
    md+="_Inga anteckningar annu._\n\n";
  }

  md+="## Lärdom\n\n### Vokabulär ("+vokabularHist.length+")\n\n";
  if(vokabularHist.length){
    vokabularHist.slice().sort(function(a,b){return new Date(a.timestamp)-new Date(b.timestamp);}).forEach(function(v){
      md+="- **"+fmtDate(v.timestamp)+"**\n\n  "+v.text.replace(/\n/g,"\n  ")+"\n\n";
    });
  } else {
    md+="_Inget sparat annu._\n\n";
  }

  md+="### Kunskap ("+kunskapHist.length+")\n\n";
  if(kunskapHist.length){
    kunskapHist.slice().sort(function(a,b){return new Date(a.timestamp)-new Date(b.timestamp);}).forEach(function(k){
      md+="- **"+fmtDate(k.timestamp)+"**\n\n";
      (k.chat||[]).forEach(function(m){
        var who=m.role==="user"?"Jag":"AI";
        md+="  **"+who+":** "+String(m.content||"").replace(/\n/g,"\n  ")+"\n\n";
      });
    });
  } else {
    md+="_Inget sparat annu._\n\n";
  }

  var blob=new Blob([md],{type:"text/markdown;charset=utf-8"});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");
  a.href=url;
  a.download="Notering_"+new Date().toISOString().slice(0,10)+".md";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},1000);
}

function exportPdf(monthKey){
  var parts=monthKey.split("-");
  var year=parseInt(parts[0]),month=parseInt(parts[1])-1;
  var MONTHS=["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"];
  var DAYS=["Sondag","Mandag","Tisdag","Onsdag","Torsdag","Fredag","Lordag"];
  var monthName=MONTHS[month]+" "+year;

  var start=new Date(year,month,1);
  var end=new Date(year,month+1,0,23,59,59,999);

  var inMonth=function(ts){var d=new Date(ts);return d>=start&&d<=end;};

  var monthLogs=logs.filter(function(l){return inMonth(l.timestamp);})
    .sort(function(a,b){return new Date(a.timestamp)-new Date(b.timestamp);});
  var monthFund=fundHist.filter(function(f){return inMonth(f.timestamp);})
    .sort(function(a,b){return new Date(a.timestamp)-new Date(b.timestamp);});
  var monthConvs=sentConvs.filter(function(cv){return inMonth(cv.timestamp);})
    .sort(function(a,b){return new Date(a.timestamp)-new Date(b.timestamp);});

  if(!window.jspdf||!window.jspdf.jsPDF){
    alert("PDF-biblioteket kunde inte laddas. Kontrollera internetanslutningen och försök igen.");
    return;
  }
  var doc=new window.jspdf.jsPDF({unit:"pt",format:"a4"});
  var margin=48, y=margin, pageW=doc.internal.pageSize.getWidth(), pageH=doc.internal.pageSize.getHeight(), maxW=pageW-margin*2;

  function ensureSpace(h){if(y+h>pageH-margin){doc.addPage();y=margin;}}
  function h1(t){
    doc.setFont("helvetica","bold");doc.setFontSize(20);doc.setTextColor(20,20,20);
    doc.text(t,margin,y);y+=8;
    doc.setDrawColor(20,20,20);doc.setLineWidth(1.4);doc.line(margin,y,pageW-margin,y);y+=20;
  }
  function metaLine(t){
    doc.setFont("helvetica","normal");doc.setFontSize(9.5);doc.setTextColor(110,110,110);
    doc.text(t,margin,y);y+=30;doc.setTextColor(20,20,20);
  }
  function h2(t){
    ensureSpace(34);
    doc.setFillColor(242,242,242);doc.rect(margin-6,y-13,maxW+12,20,"F");
    doc.setFont("helvetica","bold");doc.setFontSize(13);doc.setTextColor(20,20,20);
    doc.text(t,margin,y);y+=30;
  }
  function h3(t){
    ensureSpace(20);
    doc.setFont("helvetica","bold");doc.setFontSize(10.5);doc.setTextColor(51,51,51);
    doc.text(t,margin,y);y+=16;doc.setTextColor(20,20,20);
  }
  function small(t,color){
    ensureSpace(12);
    doc.setFont("helvetica","normal");doc.setFontSize(8.5);
    doc.setTextColor(color?color[0]:140,color?color[1]:140,color?color[2]:140);
    doc.text(t,margin,y);y+=12;doc.setTextColor(20,20,20);
  }
  function body(t,opts){
    opts=opts||{};
    doc.setFont("helvetica",opts.bold?"bold":"normal");doc.setFontSize(opts.size||10.5);
    var lines=doc.splitTextToSize(String(t||""),maxW-(opts.indent||0));
    lines.forEach(function(line){
      ensureSpace(14);
      doc.text(line,margin+(opts.indent||0),y);y+=14;
    });
  }
  function rule(){ensureSpace(10);doc.setDrawColor(224,224,224);doc.setLineWidth(0.6);doc.line(margin,y,pageW-margin,y);y+=12;}
  function spacer(h){y+=h;}

  h1("Minnesbanken");
  metaLine("Export för "+monthName+"  |  Skapad "+new Date().toLocaleDateString("sv-SE"));

  // AKTIVITETER
  if(monthLogs.length){
    h2("Aktiviteter ("+monthLogs.length+")");
    var byDay={};
    monthLogs.forEach(function(l){
      var d=new Date(l.timestamp);
      var dk=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
      if(!byDay[dk])byDay[dk]={date:d,items:[]};
      byDay[dk].items.push(l);
    });
    Object.keys(byDay).sort().forEach(function(dk){
      var dd=byDay[dk];
      h3(DAYS[dd.date.getDay()]+" "+dd.date.getDate()+" "+MONTHS[dd.date.getMonth()]);
      dd.items.forEach(function(l){
        small(new Date(l.timestamp).toLocaleTimeString("sv-SE",{hour:"2-digit",minute:"2-digit"})+(l.time?" · "+l.time:""));
        body(l.activity,{bold:true});
        if(l.note)body(l.note,{indent:8});
        spacer(8);
      });
      spacer(4);
    });
  }

  // NOTERING (Fundering)
  if(monthFund.length){
    h2("Fundering ("+monthFund.length+")");
    var byDayF={};
    monthFund.forEach(function(f){
      var d=new Date(f.timestamp);
      var dk=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
      if(!byDayF[dk])byDayF[dk]={date:d,items:[]};
      byDayF[dk].items.push(f);
    });
    Object.keys(byDayF).sort().forEach(function(dk){
      var dd=byDayF[dk];
      h3(DAYS[dd.date.getDay()]+" "+dd.date.getDate()+" "+MONTHS[dd.date.getMonth()]);
      dd.items.forEach(function(f){
        small(new Date(f.timestamp).toLocaleTimeString("sv-SE",{hour:"2-digit",minute:"2-digit"}));
        body(f.text);
        spacer(8);
      });
      spacer(4);
    });
  }

  // SAMTAL
  if(monthConvs.length){
    h2("Samtal ("+monthConvs.length+")");
    monthConvs.forEach(function(cv){
      var person=sentPeople.find(function(p){return p.id===cv.personId;});
      var msgs=sentMsgs.filter(function(m){return m.convId===cv.id;})
        .sort(function(a,b){return new Date(a.timestamp)-new Date(b.timestamp);});
      h3(cv.title+(person?" — "+person.name:"")+"  ["+(cv.type||"skrivande")+"]");
      msgs.forEach(function(m){
        var who=m.sender==="me"?"Jag":(person?person.name:"De");
        body(who+":",{bold:true,size:9.5});
        body(m.text,{indent:8});
        spacer(4);
      });
      rule();
      spacer(4);
    });
  }

  if(!monthLogs.length&&!monthFund.length&&!monthConvs.length){
    doc.setFont("helvetica","normal");doc.setFontSize(11);doc.setTextColor(140,140,140);
    doc.text("Inga inlägg för "+monthName+".",margin,y+10);
  }

  // Sidnumrering i sidfoten
  var totalPages=doc.internal.getNumberOfPages();
  for(var p=1;p<=totalPages;p++){
    doc.setPage(p);
    doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.setTextColor(150,150,150);
    doc.text("Sida "+p+" av "+totalPages,pageW/2,pageH-24,{align:"center"});
  }

  doc.save("Minnesbanken_"+monthKey+".pdf");
}







// ---- NYHETER ----;

function renderNyheter(){
  var b=document.getElementById("body");
  var html="<div style='display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px'>"
    +Object.keys(NYHETER_SITES).map(function(k){
      var site=NYHETER_SITES[k];
      return "<a href='"+esc(site.url)+"' target='_blank' rel='noopener' style='text-decoration:none'>"
        +"<div style='padding:20px 16px;background:#161616;border-radius:14px;border:1px solid #2a2a2a;"
        +"text-align:center;cursor:pointer'>"
        +"<div style='font-size:28px;margin-bottom:10px'>"+site.label.split(" ")[0]+"</div>"
        +"<div style='font-size:14px;font-weight:600;color:#f2f2f2'>"+site.label.split(" ").slice(1).join(" ")+"</div>"
        +"<div style='font-size:11px;color:#5c5c5c;margin-top:6px'>"+esc(site.url.replace(/https?:\/\//,"").replace(/\/$/,""))+"</div>"
        +"</div></a>";
    }).join("")
    +"</div>";
  b.innerHTML=html;
}
