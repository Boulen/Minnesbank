function ttSubPickerHtml(idPrefix){
  return "<div id='"+idPrefix+"-chips' style='display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px'></div>"
    +"<div class='ac-wrap' style='width:100%'><button class='chip' id='"+idPrefix+"-toggle' type='button' style='width:100%;text-align:left;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 12px;cursor:pointer;font-family:inherit;line-height:1'>Subkategorier ▾</button><div class='ac-dropdown' id='"+idPrefix+"-dd' style='min-width:200px'></div></div>"
    +"<div class='row' style='margin-top:6px'>"
    +"<input class='inp' id='"+idPrefix+"-new' placeholder='Ny subkategori...' style='flex:1'/>"
    +"<button class='chip' id='"+idPrefix+"-add' type='button' style='flex-shrink:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 14px;cursor:pointer;font-family:inherit;line-height:1'>+</button>"
    +"</div>";
}
// container: element som innehaller markupen ovan. getCat: fn som returnerar aktuell kategori.
// selected: array (muteras pa plats) med redan valda subkategorier. Returnerar {getSelected}.
function bindTtSubPicker(container,idPrefix,getCat,selected){
  function refreshChips(){
    var chipsEl=container.querySelector("#"+idPrefix+"-chips");
    if(!chipsEl)return;
    chipsEl.innerHTML=selected.length?selected.map(function(s){
      return "<span class='chip' style='display:inline-flex;align-items:center;gap:6px;background:#161616;border:1px solid #2a2a2a;border-radius:20px;padding:6px 8px 6px 12px;font-size:12px'>"+esc(s)+"<button data-ttsubchipremove='"+esc(s)+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:14px;line-height:1;padding:0'>×</button></span>";
    }).join(""):"<span style='font-size:12px;color:#5c5c5c'>Inga valda</span>";
    chipsEl.querySelectorAll("[data-ttsubchipremove]").forEach(function(btn){
      btn.onclick=function(){
        var v=btn.dataset.ttsubchipremove;
        var si=selected.indexOf(v);
        if(si>=0)selected.splice(si,1);
        refreshChips();
      };
    });
  }
  refreshChips();

  var dd=container.querySelector("#"+idPrefix+"-dd");
  var toggle=container.querySelector("#"+idPrefix+"-toggle");
  function renderDropdown(){
    if(!dd)return;
    var cat=getCat();
    var list=TIPSTRICKS_SUBCAT_BY_CAT[cat]||[];
    dd.innerHTML=list.length?list.map(function(s){
      var checked=selected.indexOf(s)>=0;
      return "<div class='ac-item'><span class='ac-item-text' data-ttsubtoggle='"+esc(s)+"' style='flex:1;cursor:pointer'>"+(checked?"☑ ":"☐ ")+esc(s)+"</span><button class='ac-item-remove' data-ttsubremove='"+esc(s)+"' title='Ta bort'>×</button></div>";
    }).join(""):"<div class='empty' style='padding:10px;font-size:12px'>"+(cat?"Inga subkategorier för denna kategori än.":"Välj en kategori först.")+"</div>";
    dd.style.display="block";
    _openCatDropdown={dropdownEl:dd,toggleBtn:toggle};
    dd.querySelectorAll("[data-ttsubtoggle]").forEach(function(item){
      item.onmousedown=function(e){
        e.preventDefault();
        var v=item.dataset.ttsubtoggle;
        var idx=selected.indexOf(v);
        if(idx>=0)selected.splice(idx,1);else selected.push(v);
        renderDropdown();
        refreshChips();
      };
    });
    dd.querySelectorAll("[data-ttsubremove]").forEach(function(btn){
      btn.onmousedown=function(e){
        e.preventDefault();e.stopPropagation();
        var v=btn.dataset.ttsubremove;
        var cat2=getCat();
        if(TIPSTRICKS_SUBCAT_BY_CAT[cat2])TIPSTRICKS_SUBCAT_BY_CAT[cat2]=TIPSTRICKS_SUBCAT_BY_CAT[cat2].filter(function(x){return x!==v;});
        var si=selected.indexOf(v);
        if(si>=0)selected.splice(si,1);
        saveAndSync("inmatningar");
        renderDropdown();
        refreshChips();
      };
    });
  }
  if(toggle)toggle.onclick=function(){
    if(dd.style.display==="block"){dd.style.display="none";_openCatDropdown=null;}
    else renderDropdown();
  };

  var newInp=container.querySelector("#"+idPrefix+"-new");
  var addBtn=container.querySelector("#"+idPrefix+"-add");
  if(addBtn)addBtn.onclick=function(){
    var v=newInp.value.trim();
    if(!v)return;
    var cat=getCat();
    if(!cat){alert("Välj en kategori först.");return;}
    if(!TIPSTRICKS_SUBCAT_BY_CAT[cat])TIPSTRICKS_SUBCAT_BY_CAT[cat]=[];
    if(TIPSTRICKS_SUBCAT_BY_CAT[cat].indexOf(v)<0)TIPSTRICKS_SUBCAT_BY_CAT[cat].unshift(v);
    if(selected.indexOf(v)<0)selected.push(v);
    saveAndSync("inmatningar");
    newInp.value="";
    refreshChips();
    if(dd.style.display==="block")renderDropdown();
  };

  return {getSelected:function(){return selected.slice();}};
}
// Nya kategori-specifika snabbval för Media (Kreatör/Genre)

var fundDraft="", editingFundId=null;
var fundCatSelect="", fundReadCat="", fundReadActive=false, editingFundKeyLog=null;
var funderingarSubview="tipstricks";
var lardomSubview="vokabular";
// Enkla text+tidsstämpel-listor för Lärdom-flikens tre underflikar. Ingen kategori/dropdown ännu
// (byggs ut senare, olika för var och en, enligt Blås plan).
var vokabularHist=[], vokabularDraft="", editingVokabularId=null;
var kunskapHist=[], kunskapDraft="", editingKunskapId=null, activeKunskapId=null;
var tipsTricksHist=[], tipsTricksDraft="", tipsTricksRubrikDraft="", tipsTricksReadRubrikSearch="";
var tipsTricksCatSelect="", tipsTricksReadCat="", tipsTricksReadSubcat="", tipsTricksReadExcludeSubcat="", tipsTricksReadActive=false, editingTipsTricksKeyLog=null;

function fundRow(f,prefix){
  return "<div class='entry'>"
    +"<div style='flex:1'>"
    +(f.category?"<div style='font-size:11px;color:#5c5c5c;margin-bottom:2px'>"+esc(f.category)+"</div>":"")
    +"<div class='etitle' style='white-space:pre-wrap;font-weight:400;line-height:1.5'>"+esc(f.text)+"</div>"
    +"<div class='etime'>"+fd(f.timestamp)+"</div>"
    +"</div>"
    +"<button class='delbtn' data-editfundlog='"+prefix+":"+f.id+"' style='color:#5c5c5c;font-size:14px;padding:2px 6px'>✏️</button>"
    +"<button class='delbtn' data-delfundlog='"+f.id+"'>x</button>"
    +"</div>";
}
function fundEditRow(f,prefix){
  var catOpts="<option value=''>Ingen kategori</option>"
    +FUND_CAT_PRESETS.map(function(cat){return "<option value='"+esc(cat)+"'"+(cat===f.category?" selected":"")+">"+esc(cat)+"</option>";}).join("");
  return "<div class='entry' style='flex-direction:column;gap:10px'>"
    +"<select id='editfundcatlog-"+prefix+"-"+f.id+"' style='width:100%;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:9px 10px;cursor:pointer;font-family:inherit'>"+catOpts+"</select>"
    +"<textarea class='ta' id='editfundlog-"+prefix+"-"+f.id+"' style='min-height:90px'>"+esc(f.text)+"</textarea>"
    +"<div style='display:flex;gap:8px'>"
    +"<button class='sec' data-savefundlog='"+prefix+":"+f.id+"' style='flex:1'>Spara</button>"
    +"<button class='sec ghost' data-cancelfundlog='"+prefix+":"+f.id+"' style='flex:1'>Avbryt</button>"
    +"</div></div>";
}

function ttRow(f,prefix){
  var subs=f.subcategories||(f.subcategory?[f.subcategory]:[]);
  return "<div class='entry'>"
    +"<div style='flex:1'>"
    +((f.category||subs.length)?"<div style='font-size:11px;color:#5c5c5c;margin-bottom:2px'>"+esc([f.category,subs.join(", ")].filter(Boolean).join(" \u00b7 "))+"</div>":"")
    +(f.rubrik?"<div style='font-size:14px;color:#f2f2f2;font-weight:600;margin-bottom:2px'>"+esc(f.rubrik)+"</div>":"")
    +"<div class='etitle' style='white-space:pre-wrap;font-weight:400;line-height:1.5'>"+esc(f.text)+"</div>"
    +"<div class='etime'>"+fd(f.timestamp)+"</div>"
    +"</div>"
    +"<button class='delbtn' data-edittslog='"+prefix+":"+f.id+"' style='color:#5c5c5c;font-size:14px;padding:2px 6px'>✏️</button>"
    +"<button class='delbtn' data-deltslog='"+f.id+"'>x</button>"
    +"</div>";
}
function ttEditRow(f,prefix){
  var catOpts="<option value=''>Ingen kategori</option>"
    +TIPSTRICKS_CAT_PRESETS.map(function(cat){return "<option value='"+esc(cat)+"'"+(cat===f.category?" selected":"")+">"+esc(cat)+"</option>";}).join("");
  return "<div class='entry' style='flex-direction:column;gap:10px'>"
    +"<select id='edittscatlog-"+prefix+"-"+f.id+"' style='width:100%;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:9px 10px;cursor:pointer;font-family:inherit'>"+catOpts+"</select>"
    +"<div class='lbl' style='margin:0'>Subkategorier</div>"
    +ttSubPickerHtml("edittssub-"+prefix+"-"+f.id)
    +"<input class='inp w100' id='edittsrubrik-"+prefix+"-"+f.id+"' placeholder='Rubrik (valfritt)' value='"+esc(f.rubrik||"")+"'/>"
    +"<textarea class='ta' id='edittslog-"+prefix+"-"+f.id+"' style='min-height:90px'>"+esc(f.text)+"</textarea>"
    +"<div style='display:flex;gap:8px'>"
    +"<button class='sec' data-savetslog='"+prefix+":"+f.id+"' style='flex:1'>Spara</button>"
    +"<button class='sec ghost' data-canceltslog='"+prefix+":"+f.id+"' style='flex:1'>Avbryt</button>"
    +"</div></div>";
}


function renderLogFunderingar(){
  var c=document.getElementById("body");
  var subTabs="<div style='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px'>"
    +"<button class='mode-btn"+(funderingarSubview==="tipstricks"?" on":"")+"' data-fundsub='tipstricks' style='font-size:12px'>Anteckning</button>"
    +"<button class='mode-btn"+(funderingarSubview==="fundering"?" on":"")+"' data-fundsub='fundering' style='font-size:12px'>Fundering</button>"
    +"</div>"
    +"<div style='margin-bottom:18px'>"
    +"<button class='mode-btn"+(funderingarSubview==="lardom"?" on":"")+"' data-fundsub='lardom' style='font-size:12px;width:100%'>Lärdom</button>"
    +"</div>";
  c.innerHTML=subTabs+"<div id='fundering-content'></div>";
  c.querySelectorAll("[data-fundsub]").forEach(function(btn){
    btn.onclick=function(){funderingarSubview=btn.dataset.fundsub;renderLogFunderingar();};
  });
  if(funderingarSubview==="lardom")renderLardom();
  else if(funderingarSubview==="tipstricks"){
    var fc=document.getElementById("fundering-content");
    if(!tabLoaded.tipstricks){
      if(fc)fc.innerHTML="<div style='padding:30px;text-align:center;color:#5c5c5c;font-size:13px'>⏳ Laddar...</div>";
      loadTab("tipstricks").then(function(){renderTipsTricks();});
    } else {
      renderTipsTricks();
    }
  }
  else renderFunderingHome();
}

function renderFunderingHome(){
  var c=document.getElementById("fundering-content");
  if(!c)return;
  var todayStart=new Date();todayStart.setHours(0,0,0,0);
  var todayEnd=new Date();todayEnd.setHours(23,59,59,999);
  var todayFund=fundHist.filter(function(f){var t=new Date(f.timestamp);return t>=todayStart&&t<=todayEnd;});

  var catOptions="<option value=''>Ingen kategori</option>"
    +FUND_CAT_PRESETS.map(function(cat){return "<option value='"+esc(cat)+"'"+(cat===fundCatSelect?" selected":"")+">"+esc(cat)+"</option>";}).join("");
  var readCatOptions="<option value=''>Välj kategori</option>"
    +FUND_CAT_PRESETS.map(function(cat){return "<option value='"+esc(cat)+"'"+(cat===fundReadCat?" selected":"")+">"+esc(cat)+"</option>";}).join("");

  var todayList=todayFund.length?todayFund.map(function(f){
    return editingFundKeyLog==="today:"+f.id?fundEditRow(f,"today"):fundRow(f,"today");
  }).join(""):"<div style='font-size:13px;color:#5c5c5c;margin-top:10px;text-align:center'>Inga funderingar idag annu.</div>";

  var readSection="";
  if(fundReadActive&&fundReadCat){
    var catFund=fundHist.filter(function(f){return f.category===fundReadCat;});
    readSection="<div class='mt20'><div class='lbl'>"+esc(fundReadCat)+" ("+catFund.length+")</div>"
      +(catFund.length?catFund.map(function(f){
        return editingFundKeyLog==="read:"+f.id?fundEditRow(f,"read"):fundRow(f,"read");
      }).join(""):"<div style='font-size:13px;color:#5c5c5c;margin-top:10px;text-align:center'>Inga funderingar i denna kategori annu.</div>")
      +"</div>";
  }

  c.innerHTML="<div style='font-size:13px;color:#5c5c5c;margin-bottom:16px;line-height:1.5'>Skriv ner tankar, ideer eller funderingar - en enkel dagbok bara for dig.</div>"
    +"<div class='lbl'>Kategori</div>"
    +"<select id='fundcat-select' style='width:100%;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:14px;padding:10px 12px;cursor:pointer;font-family:inherit;margin-bottom:10px'>"+catOptions+"</select>"
    +"<textarea class='ta' id='fundin' placeholder='Vad funderar du pa?'>"+esc(fundDraft)+"</textarea>"
    +"<button class='sec' id='fundadd' style='width:100%'>Spara fundering</button>"
    +"<div class='mt20'><div class='lbl'>Läs funderingar per kategori</div>"
    +"<div style='display:flex;gap:8px'>"
    +"<select id='fundread-select' style='flex:1;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:0 10px;cursor:pointer;font-family:inherit'>"+readCatOptions+"</select>"
    +"<button id='fundread-btn' class='sec ghost' style='padding:0 18px'>Läs</button>"
    +"</div>"
    +readSection
    +"</div>"
    +"<div class='mt20'><div class='lbl'>Dagens funderingar</div>"+todayList+"</div>";

  var catSel=c.querySelector("#fundcat-select");
  if(catSel)catSel.onchange=function(){fundCatSelect=catSel.value;};

  var ta=c.querySelector("#fundin");
  if(ta)ta.oninput=function(){fundDraft=ta.value;};
  c.querySelector("#fundadd").onclick=function(){
    var txt=c.querySelector("#fundin").value.trim();
    if(!txt)return;
    var entry={id:Date.now(),text:txt,timestamp:new Date().toISOString()};
    if(fundCatSelect)entry.category=fundCatSelect;
    fundHist.unshift(entry);
    fundDraft="";saveAndSync("funderingar");renderLogFunderingar();
  };

  var readSel=c.querySelector("#fundread-select");
  if(readSel)readSel.onchange=function(){fundReadCat=readSel.value;};
  c.querySelector("#fundread-btn").onclick=function(){
    if(!c.querySelector("#fundread-select").value){alert("Välj en kategori först.");return;}
    fundReadCat=c.querySelector("#fundread-select").value;
    fundReadActive=true;renderLogFunderingar();
  };

  c.querySelectorAll("[data-delfundlog]").forEach(function(btn){
    btn.onclick=function(){
      fundHist=fundHist.filter(function(f){return f.id!==Number(btn.dataset.delfundlog);});
      editingFundKeyLog=null;saveAndSync("funderingar");renderLogFunderingar();
    };
  });
  c.querySelectorAll("[data-editfundlog]").forEach(function(btn){
    btn.onclick=function(){editingFundKeyLog=btn.dataset.editfundlog;renderLogFunderingar();};
  });
  c.querySelectorAll("[data-savefundlog]").forEach(function(btn){
    btn.onclick=function(){
      var parts=btn.dataset.savefundlog.split(":");
      var prefix=parts[0],fid=Number(parts[1]);
      var f=fundHist.find(function(x){return x.id===fid;});
      var inp=c.querySelector("#editfundlog-"+prefix+"-"+fid);
      var catSel=c.querySelector("#editfundcatlog-"+prefix+"-"+fid);
      if(f&&inp&&inp.value.trim())f.text=inp.value.trim();
      if(f&&catSel)f.category=catSel.value||undefined;
      editingFundKeyLog=null;saveAndSync("funderingar");renderLogFunderingar();
    };
  });
  c.querySelectorAll("[data-cancelfundlog]").forEach(function(btn){
    btn.onclick=function(){editingFundKeyLog=null;renderLogFunderingar();};
  });
}

// ---- LÄRDOM (underflikar: Vokabulär, Kunskap, Tips & Tricks) ----
function renderLardom(){
  var c=document.getElementById("fundering-content");
  if(!c)return;
  var subTabs="<div style='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:16px'>"
    +"<button class='mode-btn"+(lardomSubview==="vokabular"?" on":"")+"' data-lardomsub='vokabular' style='font-size:11px'>Vokabulär</button>"
    +"<button class='mode-btn"+(lardomSubview==="kunskap"?" on":"")+"' data-lardomsub='kunskap' style='font-size:11px'>Kunskap</button>"
    +"</div>";
  c.innerHTML=subTabs+"<div id='lardom-content'></div>";
  c.querySelectorAll("[data-lardomsub]").forEach(function(btn){
    btn.onclick=function(){lardomSubview=btn.dataset.lardomsub;renderLardom();};
  });
  var tab=lardomSubview;
  var lc=document.getElementById("lardom-content");
  if(!tabLoaded[tab]){
    if(lc)lc.innerHTML="<div style='padding:30px;text-align:center;color:#5c5c5c;font-size:13px'>⏳ Laddar...</div>";
    loadTab(tab).then(function(){renderLardomContent();});
  } else {
    renderLardomContent();
  }
}
function renderLardomContent(){
  if(lardomSubview==="vokabular")renderVokabular();
  else renderKunskap();
}

// Delad enkel lista (text + tidsstämpel) som Vokabulär/Kunskap/Tips & Tricks alla använder
// tills vidare - byggs ut olika för var och en senare.
function lardomEntryRow(entry,delAttr,editAttr,editingId){
  if(editAttr&&editingId===entry.id){
    return "<div class='khist'>"
      +"<textarea class='ta' data-"+editAttr+"inp='"+entry.id+"' style='min-height:60px;margin-bottom:6px'>"+esc(entry.text)+"</textarea>"
      +"<div style='display:flex;gap:8px'>"
      +"<button class='sec' data-"+editAttr+"save='"+entry.id+"' style='flex:1'>Spara</button>"
      +"<button class='sec ghost' data-"+editAttr+"cancel='"+entry.id+"' style='flex:1'>Avbryt</button>"
      +"</div></div>";
  }
  return "<div class='khist' style='display:flex;align-items:flex-start;gap:8px'>"
    +"<div style='flex:1;min-width:0'><div class='kmsg' style='white-space:normal'>"+esc(entry.text)+"</div>"
    +"<div class='kmeta'>"+fd(entry.timestamp)+"</div></div>"
    +(editAttr?"<button class='delbtn' data-"+editAttr+"edit='"+entry.id+"' style='font-size:15px'>✏️</button>":"")
    +"<button class='delbtn' data-"+delAttr+"='"+entry.id+"' style='font-size:18px'>x</button>"
    +"</div>";
}

function renderVokabular(){
  var c=document.getElementById("lardom-content");
  if(!c)return;
  var list=vokabularHist.length?vokabularHist.map(function(e){return lardomEntryRow(e,"delvokabular","vokabular",editingVokabularId);}).join(""):"<div class='empty' style='padding:20px 0'><div class='eico'>🔤</div>Inget sparat än. Använd 📌-knappen i AI → Översättning eller Ordråd för att spara hit.</div>";
  c.innerHTML="<div class='lbl'>Sparat</div>"+list;
  c.querySelectorAll("[data-delvokabular]").forEach(function(btn){
    btn.onclick=function(){
      confirmDelete("Vill du ta bort det här?",function(){
        vokabularHist=vokabularHist.filter(function(x){return x.id!==Number(btn.dataset.delvokabular);});
        saveAndSync("vokabular");renderVokabular();
      });
    };
  });
  c.querySelectorAll("[data-vokabularedit]").forEach(function(btn){
    btn.onclick=function(){editingVokabularId=Number(btn.dataset.vokabularedit);renderVokabular();};
  });
  c.querySelectorAll("[data-vokabularcancel]").forEach(function(btn){
    btn.onclick=function(){editingVokabularId=null;renderVokabular();};
  });
  c.querySelectorAll("[data-vokabularsave]").forEach(function(btn){
    btn.onclick=function(){
      var eid=Number(btn.dataset.vokabularsave);
      var entry=vokabularHist.find(function(x){return x.id===eid;});
      var inp=c.querySelector("[data-vokabularinp='"+eid+"']");
      if(entry&&inp&&inp.value.trim())entry.text=inp.value.trim();
      editingVokabularId=null;
      saveAndSync("vokabular");renderVokabular();
    };
  });
}

function renderKunskap(){
  var c=document.getElementById("lardom-content");
  if(!c)return;
  if(activeKunskapId)renderKunskapOpen(c);
  else renderKunskapList(c);
}

function kunskapPreviewText(chat){
  chat=chat||[];
  var q=chat[0]?chatContentToText(chat[0].content):"";
  var a=chat[1]?chatContentToText(chat[1].content):"";
  return q+(a?" — "+a:"");
}
function renderKunskapList(c){
  var sorted=kunskapHist.slice().sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);});
  var list=sorted.length?sorted.map(function(e){
    if(editingKunskapId===e.id){
      var q=e.chat&&e.chat[0]?chatContentToText(e.chat[0].content):"";
      var a=e.chat&&e.chat[1]?chatContentToText(e.chat[1].content):"";
      return "<div class='khist'>"
        +"<div class='lbl' style='margin-bottom:4px'>Fråga</div>"
        +"<textarea class='ta' data-kunskapqinp='"+e.id+"' style='min-height:50px;margin-bottom:6px'>"+esc(q)+"</textarea>"
        +"<div class='lbl' style='margin-bottom:4px'>Svar</div>"
        +"<textarea class='ta' data-kunskapainp='"+e.id+"' style='min-height:80px;margin-bottom:6px'>"+esc(a)+"</textarea>"
        +"<div style='display:flex;gap:8px'>"
        +"<button class='sec' data-kunskapsave='"+e.id+"' style='flex:1'>Spara</button>"
        +"<button class='sec ghost' data-kunskapcancel='"+e.id+"' style='flex:1'>Avbryt</button>"
        +"</div></div>";
    }
    var previewFull=kunskapPreviewText(e.chat);
    var preview=previewFull.length>120?previewFull.slice(0,120)+"…":previewFull;
    return "<div class='khist' data-openkunskap='"+e.id+"' style='display:flex;align-items:flex-start;gap:8px;cursor:pointer'>"
      +"<div style='flex:1;min-width:0'><div class='kmsg' style='white-space:normal'>"+esc(preview)+"</div>"
      +"<div class='kmeta'>"+fd(e.timestamp)+(e.chat&&e.chat.length>2?" · "+e.chat.length+" meddelanden":"")+"</div></div>"
      +"<button class='delbtn' data-kunskapedit='"+e.id+"' style='font-size:15px'>✏️</button>"
      +"<button class='delbtn' data-delkunskap='"+e.id+"' style='font-size:18px'>x</button>"
      +"</div>";
  }).join(""):"<div class='empty' style='padding:20px 0'><div class='eico'>📚</div>Inget sparat än. Använd 📌-knappen i AI → Tips/Terapi/Översättning eller sökrutorna längst ner för att spara hit.</div>";

  c.innerHTML="<div class='lbl'>Sparat</div>"+list;

  c.querySelectorAll("[data-openkunskap]").forEach(function(el){
    el.onclick=function(e){
      if(e.target.closest("[data-kunskapedit]")||e.target.closest("[data-delkunskap]"))return;
      activeKunskapId=el.dataset.openkunskap;
      renderKunskap();
    };
  });
  c.querySelectorAll("[data-kunskapedit]").forEach(function(btn){
    btn.onclick=function(e){e.stopPropagation();editingKunskapId=Number(btn.dataset.kunskapedit);renderKunskapList(c);};
  });
  c.querySelectorAll("[data-kunskapcancel]").forEach(function(btn){
    btn.onclick=function(e){e.stopPropagation();editingKunskapId=null;renderKunskapList(c);};
  });
  c.querySelectorAll("[data-kunskapsave]").forEach(function(btn){
    btn.onclick=function(e){
      e.stopPropagation();
      var eid=Number(btn.dataset.kunskapsave);
      var entry=kunskapHist.find(function(x){return x.id===eid;});
      var qInp=c.querySelector("[data-kunskapqinp='"+eid+"']");
      var aInp=c.querySelector("[data-kunskapainp='"+eid+"']");
      if(entry){
        if(!entry.chat)entry.chat=[];
        if(!entry.chat[0])entry.chat[0]={role:"user",content:""};
        if(!entry.chat[1])entry.chat[1]={role:"assistant",content:""};
        if(qInp)entry.chat[0].content=qInp.value.trim();
        if(aInp)entry.chat[1].content=aInp.value.trim();
      }
      editingKunskapId=null;
      saveAndSync("kunskap");renderKunskapList(c);
    };
  });
  c.querySelectorAll("[data-delkunskap]").forEach(function(btn){
    btn.onclick=function(e){
      e.stopPropagation();
      confirmDelete("Vill du ta bort det här?",function(){
        kunskapHist=kunskapHist.filter(function(x){return x.id!==Number(btn.dataset.delkunskap);});
        saveAndSync("kunskap");renderKunskapList(c);
      });
    };
  });
}

function renderKunskapOpen(c){
  var entry=kunskapHist.find(function(x){return x.id===Number(activeKunskapId)||x.id===activeKunskapId;});
  if(!entry){activeKunskapId=null;renderKunskapList(c);return;}
  var thread=(entry.chat||[]).map(function(m){
    if(m.role==="user"){
      return "<div style='display:flex;justify-content:flex-end;margin-bottom:8px'><div class='bubble-me'>"+esc(m.content)+"</div></div>";
    }
    return "<div style='display:flex;justify-content:flex-start;margin-bottom:8px'><div class='bubble-them'>"+esc(m.content)+"</div></div>";
  }).join("");
  c.innerHTML="<button class='sec ghost' id='kunskap-back-btn' style='margin-bottom:12px'>&#8592; Alla sparade</button>"
    +"<div class='chat-area'>"+thread+"</div>"
    +"<div class='row'><input class='inp' id='kunskapai-followup-inp' placeholder='Ställ en följdfråga...'/><button class='abtn' id='kunskapai-followup-btn'>&#8594;</button></div>"
    +"<div id='kunskapai-followup-loading' style='display:none;text-align:center;color:var(--sub);font-size:12px;margin-top:6px'>Skriver...</div>";
  c.querySelector("#kunskap-back-btn").onclick=function(){activeKunskapId=null;renderKunskap();};
  bindChatContinuation(c,"kunskapai","Du ar en pedagog. Fortsätt hjälpa personen bygga vidare på det ni sparat här, svara med vanlig text.",function(){return entry.chat;},function(){
    saveAndSync("kunskap");
    renderKunskapOpen(c);
  });
}

function renderTipsTricks(){
  var c=document.getElementById("fundering-content");
  if(!c)return;
  var todayStart=new Date();todayStart.setHours(0,0,0,0);
  var todayEnd=new Date();todayEnd.setHours(23,59,59,999);
  var todayTt=tipsTricksHist.filter(function(f){var t=new Date(f.timestamp);return t>=todayStart&&t<=todayEnd;});

  var catOptions="<option value=''>Ingen kategori</option>"
    +TIPSTRICKS_CAT_PRESETS.map(function(cat){return "<option value='"+esc(cat)+"'"+(cat===tipsTricksCatSelect?" selected":"")+">"+esc(cat)+"</option>";}).join("");
  var readCatOptions="<option value=''>Välj kategori</option>"
    +TIPSTRICKS_CAT_PRESETS.map(function(cat){return "<option value='"+esc(cat)+"'"+(cat===tipsTricksReadCat?" selected":"")+">"+esc(cat)+"</option>";}).join("");
  var readSubOptions="<option value=''>Alla subkategorier</option>"
    +(TIPSTRICKS_SUBCAT_BY_CAT[tipsTricksReadCat]||[]).map(function(s){return "<option value='"+esc(s)+"'"+(s===tipsTricksReadSubcat?" selected":"")+">"+esc(s)+"</option>";}).join("");
  var readExcludeSubOptions="<option value=''>Ingen exkludering</option>"
    +(TIPSTRICKS_SUBCAT_BY_CAT[tipsTricksReadCat]||[]).map(function(s){return "<option value='"+esc(s)+"'"+(s===tipsTricksReadExcludeSubcat?" selected":"")+">"+esc(s)+"</option>";}).join("");

  var todayList=todayTt.length?todayTt.map(function(f){
    return editingTipsTricksKeyLog==="today:"+f.id?ttEditRow(f,"today"):ttRow(f,"today");
  }).join(""):"<div style='font-size:13px;color:#5c5c5c;margin-top:10px;text-align:center'>Inga anteckningar idag annu.</div>";

  var readSection="";
  if(tipsTricksReadActive&&tipsTricksReadCat){
    var readTitle=tipsTricksReadCat+(tipsTricksReadSubcat?" · "+tipsTricksReadSubcat:"")+(tipsTricksReadExcludeSubcat?" · exkl. "+tipsTricksReadExcludeSubcat:"");
    readSection="<div class='mt20'><div class='lbl'>"+esc(readTitle)+"</div>"
      +"<div id='ttread-results'></div>"
      +"</div>";
  }

  c.innerHTML="<div style='font-size:13px;color:#5c5c5c;margin-bottom:16px;line-height:1.5'>Samla anteckningar - sorterat efter kategori.</div>"
    +"<div class='lbl'>Kategori</div>"
    +"<select id='ttcat-select' style='width:100%;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:14px;padding:10px 12px;cursor:pointer;font-family:inherit;margin-bottom:10px'>"+catOptions+"</select>"
    +"<div class='lbl'>Subkategorier (valfritt)</div>"
    +ttSubPickerHtml("ttsub")
    +"<div class='lbl'>Rubrik (valfritt)</div>"
    +"<input class='inp w100' id='ttrubrik' placeholder='Rubrik...' style='margin-bottom:10px' value='"+esc(tipsTricksRubrikDraft)+"'/>"
    +"<textarea class='ta' id='ttin' placeholder='En anteckning...'>"+esc(tipsTricksDraft)+"</textarea>"
    +"<button class='sec' id='ttadd' style='width:100%'>Spara anteckning</button>"
    +"<div class='mt20'><div class='lbl'>Läs anteckningar per kategori</div>"
    +"<input class='inp w100' id='ttread-rubriksearch' placeholder='Sök i rubrik, kategori eller subkategori...' style='margin-bottom:10px' value='"+esc(tipsTricksReadRubrikSearch)+"'/>"
    +"<div id='ttrubriksearch-results'></div>"
    +"<div style='display:flex;gap:6px;flex-wrap:wrap;margin-top:10px'>"
    +"<select id='ttread-select' style='flex:1 1 90px;min-width:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:12px;padding:0 6px;cursor:pointer;font-family:inherit'>"+readCatOptions+"</select>"
    +"<select id='ttread-subselect' style='flex:1 1 90px;min-width:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:12px;padding:0 6px;cursor:pointer;font-family:inherit'>"+readSubOptions+"</select>"
    +"<select id='ttread-exclude-subselect' style='flex:1 1 90px;min-width:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:12px;padding:0 6px;cursor:pointer;font-family:inherit'>"+readExcludeSubOptions+"</select>"
    +"</div>"
    +readSection
    +"</div>"
    +"<div class='mt20'><div class='lbl'>Dagens anteckningar</div>"+todayList+"</div>";

  var ttEditSubPicker=null;

  var catSel=c.querySelector("#ttcat-select");
  var ttsubSelected=[];
  var ttsubPicker=bindTtSubPicker(c,"ttsub",function(){return tipsTricksCatSelect;},ttsubSelected);
  if(catSel)catSel.onchange=function(){
    tipsTricksCatSelect=catSel.value;
    ttsubSelected.length=0;
    var chipsEl=c.querySelector("#ttsub-chips");
    if(chipsEl)chipsEl.innerHTML="<span style='font-size:12px;color:#5c5c5c'>Inga valda</span>";
    var dd0=c.querySelector("#ttsub-dd");
    if(dd0)dd0.style.display="none";
  };

  var ta=c.querySelector("#ttin");
  if(ta)ta.oninput=function(){tipsTricksDraft=ta.value;};
  var rubrikInp=c.querySelector("#ttrubrik");
  if(rubrikInp)rubrikInp.oninput=function(){tipsTricksRubrikDraft=rubrikInp.value;};

  c.querySelector("#ttadd").onclick=function(){
    var txt=c.querySelector("#ttin").value.trim();
    if(!txt)return;
    var entry={id:Date.now(),text:txt,timestamp:new Date().toISOString()};
    if(tipsTricksCatSelect)entry.category=tipsTricksCatSelect;
    var chosenSubs=ttsubPicker.getSelected();
    if(chosenSubs.length)entry.subcategories=chosenSubs;
    var rubrikVal=c.querySelector("#ttrubrik").value.trim();
    if(rubrikVal)entry.rubrik=rubrikVal;
    tipsTricksHist.push(entry);
    tipsTricksDraft="";tipsTricksRubrikDraft="";ttsubSelected.length=0;saveAndSync("tipstricks");renderLogFunderingar();
  };

  var readSel=c.querySelector("#ttread-select");
  var readSubSel=c.querySelector("#ttread-subselect");
  var readExcludeSubSel=c.querySelector("#ttread-exclude-subselect");
  if(readSel)readSel.onchange=function(){
    tipsTricksReadCat=readSel.value;
    tipsTricksReadSubcat="";
    tipsTricksReadExcludeSubcat="";
    tipsTricksReadActive=!!tipsTricksReadCat;
    renderLogFunderingar();
  };
  if(readSubSel)readSubSel.onchange=function(){tipsTricksReadSubcat=readSubSel.value;renderTtRubrikSearchResults();renderTtReadResults();};
  if(readExcludeSubSel)readExcludeSubSel.onchange=function(){tipsTricksReadExcludeSubcat=readExcludeSubSel.value;renderTtRubrikSearchResults();renderTtReadResults();};

  function renderTtReadResults(){
    var resultsEl=document.getElementById("ttread-results");
    if(!resultsEl)return;
    var catTt=tipsTricksHist.filter(function(f){return f.category===tipsTricksReadCat;});
    if(tipsTricksReadSubcat)catTt=catTt.filter(function(f){return (f.subcategories||[]).indexOf(tipsTricksReadSubcat)>=0;});
    if(tipsTricksReadExcludeSubcat)catTt=catTt.filter(function(f){return (f.subcategories||[]).indexOf(tipsTricksReadExcludeSubcat)<0;});
    resultsEl.innerHTML=(catTt.length?catTt.map(function(f){
      return editingTipsTricksKeyLog==="read:"+f.id?ttEditRow(f,"read"):ttRow(f,"read");
    }).join(""):"<div style='font-size:13px;color:#5c5c5c;margin-top:10px;text-align:center'>Inga anteckningar i denna kategori annu.</div>");
    bindTtReadResultActions(resultsEl,"read");
  }
  function renderTtRubrikSearchResults(){
    var resultsEl=document.getElementById("ttrubriksearch-results");
    if(!resultsEl)return;
    var q=tipsTricksReadRubrikSearch.trim().toLowerCase();
    if(!q){resultsEl.innerHTML="";return;}
    var matches=tipsTricksHist.filter(function(f){
      if(tipsTricksReadCat&&f.category!==tipsTricksReadCat)return false;
      if(tipsTricksReadSubcat&&(f.subcategories||[]).indexOf(tipsTricksReadSubcat)<0)return false;
      if(tipsTricksReadExcludeSubcat&&(f.subcategories||[]).indexOf(tipsTricksReadExcludeSubcat)>=0)return false;
      if(f.rubrik&&f.rubrik.toLowerCase().indexOf(q)>=0)return true;
      if(f.category&&f.category.toLowerCase().indexOf(q)>=0)return true;
      if((f.subcategories||[]).some(function(s){return s.toLowerCase().indexOf(q)>=0;}))return true;
      return false;
    });
    matches.sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);});
    resultsEl.innerHTML=matches.length?matches.map(function(f){
      return editingTipsTricksKeyLog==="rubriksearch:"+f.id?ttEditRow(f,"rubriksearch"):ttRow(f,"rubriksearch");
    }).join(""):"<div style='font-size:13px;color:#5c5c5c;margin:6px 0 4px;text-align:center'>Inga träffar.</div>";
    bindTtReadResultActions(resultsEl,"rubriksearch");
  }
  function bindTtReadResultActions(resultsEl,prefix){
    resultsEl.querySelectorAll("[data-deltslog]").forEach(function(btn){
      btn.onclick=function(){
        confirmDelete("Vill du ta bort anteckningen?",function(){
          tipsTricksHist=tipsTricksHist.filter(function(f){return f.id!==Number(btn.dataset.deltslog);});
          editingTipsTricksKeyLog=null;saveAndSync("tipstricks");renderLogFunderingar();
        });
      };
    });
    resultsEl.querySelectorAll("[data-edittslog]").forEach(function(btn){
      btn.onclick=function(){editingTipsTricksKeyLog=btn.dataset.edittslog;renderLogFunderingar();};
    });
    resultsEl.querySelectorAll("[data-canceltslog]").forEach(function(btn){
      btn.onclick=function(){editingTipsTricksKeyLog=null;renderLogFunderingar();};
    });
    resultsEl.querySelectorAll("[data-savetslog]").forEach(function(btn){
      btn.onclick=function(){
        var parts=btn.dataset.savetslog.split(":");
        var editPrefix2=parts[0],fid=Number(parts[1]);
        var f=tipsTricksHist.find(function(x){return x.id===fid;});
        var inp=resultsEl.querySelector("#edittslog-"+editPrefix2+"-"+fid);
        var catSel2=resultsEl.querySelector("#edittscatlog-"+editPrefix2+"-"+fid);
        var rubrikInp2=resultsEl.querySelector("#edittsrubrik-"+editPrefix2+"-"+fid);
        if(f&&inp&&inp.value.trim())f.text=inp.value.trim();
        if(f&&catSel2)f.category=catSel2.value||undefined;
        if(f&&rubrikInp2)f.rubrik=rubrikInp2.value.trim()||undefined;
        if(f&&ttEditSubPicker){
          var subVals2=ttEditSubPicker.getSelected();
          f.subcategories=subVals2.length?subVals2:undefined;
          delete f.subcategory;
        }
        editingTipsTricksKeyLog=null;saveAndSync("tipstricks");renderLogFunderingar();
      };
    });
    if(editingTipsTricksKeyLog&&editingTipsTricksKeyLog.indexOf(prefix+":")===0){
      var editFid2=Number(editingTipsTricksKeyLog.split(":")[1]);
      var editEntry2=tipsTricksHist.find(function(x){return x.id===editFid2;});
      var editCatSelEl2=resultsEl.querySelector("#edittscatlog-"+prefix+"-"+editFid2);
      if(editEntry2&&editCatSelEl2){
        var editSelected2=(editEntry2.subcategories||(editEntry2.subcategory?[editEntry2.subcategory]:[])).slice();
        ttEditSubPicker=bindTtSubPicker(resultsEl,"edittssub-"+prefix+"-"+editFid2,function(){return editCatSelEl2.value;},editSelected2);
      }
    }
  }
  var rubrikSearchInp=c.querySelector("#ttread-rubriksearch");
  if(rubrikSearchInp)rubrikSearchInp.oninput=function(){
    tipsTricksReadRubrikSearch=rubrikSearchInp.value;
    renderTtRubrikSearchResults();
  };
  renderTtRubrikSearchResults();
  if(tipsTricksReadActive&&tipsTricksReadCat)renderTtReadResults();

  if(editingTipsTricksKeyLog){
    var editParts=editingTipsTricksKeyLog.split(":");
    var editPrefix=editParts[0],editFid=Number(editParts[1]);
    var editEntry=tipsTricksHist.find(function(x){return x.id===editFid;});
    if(editEntry&&editPrefix==="today"){
      var editIdPrefix="edittssub-"+editPrefix+"-"+editFid;
      var editSelected=(editEntry.subcategories||(editEntry.subcategory?[editEntry.subcategory]:[])).slice();
      var editCatSelEl=c.querySelector("#edittscatlog-"+editPrefix+"-"+editFid);
      ttEditSubPicker=bindTtSubPicker(c,editIdPrefix,function(){return editCatSelEl?editCatSelEl.value:editEntry.category;},editSelected);
    }
  }

  c.querySelectorAll("[data-deltslog]").forEach(function(btn){
    btn.onclick=function(){
      confirmDelete("Vill du ta bort anteckningen?",function(){
        tipsTricksHist=tipsTricksHist.filter(function(f){return f.id!==Number(btn.dataset.deltslog);});
        editingTipsTricksKeyLog=null;saveAndSync("tipstricks");renderLogFunderingar();
      });
    };
  });
  c.querySelectorAll("[data-edittslog]").forEach(function(btn){
    btn.onclick=function(){editingTipsTricksKeyLog=btn.dataset.edittslog;renderLogFunderingar();};
  });
  c.querySelectorAll("[data-savetslog]").forEach(function(btn){
    btn.onclick=function(){
      var parts=btn.dataset.savetslog.split(":");
      var prefix=parts[0],fid=Number(parts[1]);
      var f=tipsTricksHist.find(function(x){return x.id===fid;});
      var inp=c.querySelector("#edittslog-"+prefix+"-"+fid);
      var catSel2=c.querySelector("#edittscatlog-"+prefix+"-"+fid);
      var rubrikInp2=c.querySelector("#edittsrubrik-"+prefix+"-"+fid);
      if(f&&inp&&inp.value.trim())f.text=inp.value.trim();
      if(f&&catSel2)f.category=catSel2.value||undefined;
      if(f&&rubrikInp2)f.rubrik=rubrikInp2.value.trim()||undefined;
      if(f&&ttEditSubPicker){
        var subVals2=ttEditSubPicker.getSelected();
        f.subcategories=subVals2.length?subVals2:undefined;
        delete f.subcategory;
      }
      editingTipsTricksKeyLog=null;saveAndSync("tipstricks");renderLogFunderingar();
    };
  });
  c.querySelectorAll("[data-canceltslog]").forEach(function(btn){
    btn.onclick=function(){editingTipsTricksKeyLog=null;renderLogFunderingar();};
  });
}
