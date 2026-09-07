// NOTERING-fliken (Fundering + Anteckningar). Lärdom är borttaget helt, ska
// aldrig användas igen.
//   Del av Minnesbanken (GitHub/produktion). Extraherad ur dev_index.html, sedan vidareutvecklad.
//   Beroenden: core.js (inkl. driveReadJson/driveWriteJson/driveMkdir, se HANDOFF_own_your_data.md)
//   Laddas via <script src="js/notering.js"> i rätt ordning (core.js alltid först).

function anteckningSubPickerHtml(idPrefix){
  return "<div id='"+idPrefix+"-chips' style='display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px'></div>"
    +"<div class='ac-wrap' style='width:100%'><button class='chip' id='"+idPrefix+"-toggle' type='button' style='width:100%;text-align:left;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 12px;cursor:pointer;font-family:inherit;line-height:1'>Subkategorier ▾</button><div class='ac-dropdown' id='"+idPrefix+"-dd' style='min-width:200px'></div></div>"
    +"<div class='row' style='margin-top:6px'>"
    +"<input class='inp' id='"+idPrefix+"-new' placeholder='Ny subkategori...' style='flex:1'/>"
    +"<button class='chip' id='"+idPrefix+"-add' type='button' style='flex-shrink:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 14px;cursor:pointer;font-family:inherit;line-height:1'>+</button>"
    +"</div>";
}
// container: element som innehaller markupen ovan. getCat: fn som returnerar aktuell kategori.
// selected: array (muteras pa plats) med redan valda subkategorier. Returnerar {getSelected}.
function bindAnteckningSubPicker(container,idPrefix,getCat,selected){
  function refreshChips(){
    var chipsEl=container.querySelector("#"+idPrefix+"-chips");
    if(!chipsEl)return;
    chipsEl.innerHTML=selected.length?selected.map(function(s){
      return "<span class='chip' style='display:inline-flex;align-items:center;gap:6px;background:#161616;border:1px solid #2a2a2a;border-radius:20px;padding:6px 8px 6px 12px;font-size:12px'>"+esc(s)+"<button data-anteckningsubchipremove='"+esc(s)+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:14px;line-height:1;padding:0'>×</button></span>";
    }).join(""):"<span style='font-size:12px;color:#5c5c5c'>Inga valda</span>";
    chipsEl.querySelectorAll("[data-anteckningsubchipremove]").forEach(function(btn){
      btn.onclick=function(){
        var v=btn.dataset.anteckningsubchipremove;
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
    var list=ANTECKNING_SUBCAT_BY_CAT[cat]||[];
    dd.innerHTML=list.length?list.map(function(s){
      var checked=selected.indexOf(s)>=0;
      return "<div class='ac-item'><span class='ac-item-text' data-anteckningsubtoggle='"+esc(s)+"' style='flex:1;cursor:pointer'>"+(checked?"☑ ":"☐ ")+esc(s)+"</span><button class='ac-item-remove' data-anteckningsubremove='"+esc(s)+"' title='Ta bort'>×</button></div>";
    }).join(""):"<div class='empty' style='padding:10px;font-size:12px'>"+(cat?"Inga subkategorier för denna kategori än.":"Välj en kategori först.")+"</div>";
    dd.style.display="block";
    _openCatDropdown={dropdownEl:dd,toggleBtn:toggle};
    dd.querySelectorAll("[data-anteckningsubtoggle]").forEach(function(item){
      item.onmousedown=function(e){
        e.preventDefault();
        var v=item.dataset.anteckningsubtoggle;
        var idx=selected.indexOf(v);
        if(idx>=0)selected.splice(idx,1);else selected.push(v);
        renderDropdown();
        refreshChips();
      };
    });
    dd.querySelectorAll("[data-anteckningsubremove]").forEach(function(btn){
      btn.onmousedown=function(e){
        e.preventDefault();e.stopPropagation();
        var v=btn.dataset.anteckningsubremove;
        var cat2=getCat();
        if(ANTECKNING_SUBCAT_BY_CAT[cat2])ANTECKNING_SUBCAT_BY_CAT[cat2]=ANTECKNING_SUBCAT_BY_CAT[cat2].filter(function(x){return x!==v;});
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
    if(!ANTECKNING_SUBCAT_BY_CAT[cat])ANTECKNING_SUBCAT_BY_CAT[cat]=[];
    if(ANTECKNING_SUBCAT_BY_CAT[cat].indexOf(v)<0)ANTECKNING_SUBCAT_BY_CAT[cat].unshift(v);
    if(selected.indexOf(v)<0)selected.push(v);
    saveAndSync("inmatningar");
    newInp.value="";
    refreshChips();
    if(dd.style.display==="block")renderDropdown();
  };

  return {getSelected:function(){return selected.slice();}};
}
// Nya kategori-specifika snabbval för Media (Kreatör/Genre)

// ---- ⚙️ Inställningar — Notering (en gemensam panel för hela fliken, mönster från Aktivitet) ----
// OBS: kategorierna här är enkla strängar (inte id/label/emoji-objekt som i Aktivitet) - det
// matchar hur FUND_CAT_PRESETS/ANTECKNING_CAT_PRESETS redan lagras. Emoji sätts in i textfältet via 😀-knappen (öppnar samma emoji-väljare som Aktivitet, se openNoteringEmojiPicker).
function showNoteringSettings(){
  var wFund=FUND_CAT_PRESETS.slice();
  var wTt=ANTECKNING_CAT_PRESETS.slice();
  var wSub={};
  Object.keys(ANTECKNING_SUBCAT_BY_CAT).forEach(function(k){wSub[k]=ANTECKNING_SUBCAT_BY_CAT[k].slice();});
  var editFundIdx=null;
  var editTtIdx=null;
  var anteckningSubCat=wTt.length?wTt[0]:null; // vilken TT-kategoris subkategorier som visas just nu
  var editSubIdx=null;

  var ov=document.createElement("div");
  ov.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:24px 16px;overflow-y:auto";

  function simpleChipsHtml(arr,editIdx,prefix,emptyMsg){
    if(!arr.length)return "<div class='empty' style='padding:8px 0;font-size:12px;color:#5c5c5c'>"+emptyMsg+"</div>";
    return "<div style='display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px'>"
      +arr.map(function(label,i){
        if(i===editIdx){
          return "<span style='display:inline-flex;align-items:center;gap:4px;background:#1c3c5a;border:1px solid #4fa8ff;border-radius:8px;padding:4px 4px 4px 6px'>"
            +"<input id='"+prefix+"-edit-label' value='"+esc(label)+"' style='width:110px;background:none;border:none;color:#f2f2f2;font-size:13px;padding:2px 0'/>"
            +"<button id='"+prefix+"-edit-emoji' type='button' title='Välj emoji' style='background:none;border:none;color:#f2f2f2;cursor:pointer;font-size:15px;padding:2px'>😀</button>"
            +"<button id='"+prefix+"-edit-confirm' title='Klar' style='background:none;border:none;color:#4fa8ff;cursor:pointer;font-size:14px;padding:2px'>✓</button>"
            +"</span>";
        }
        return "<span draggable='true' data-"+prefix+"-chip-idx='"+i+"' style='display:inline-flex;align-items:center;gap:6px;background:#131313;border:1px solid #2a2a2a;border-radius:8px;padding:6px 6px 6px 10px;cursor:grab;font-size:13px;color:#f2f2f2'>"
          +"<span style='color:#5c5c5c;font-size:11px'>⠿</span>"
          +esc(label)
          +"<button data-"+prefix+"-remove-idx='"+i+"' title='Ta bort' style='background:none;border:none;color:#d97a83;cursor:pointer;font-size:13px;padding:0 2px;line-height:1'>×</button>"
          +"</span>";
      }).join("")
      +"</div>";
  }

  function panelHtml(){
    return "<div style='background:#161616;border-radius:20px;width:100%;max-width:420px;overflow:hidden'>"
      +"<div style='padding:16px 20px;border-bottom:1px solid #2a2a2a;display:flex;align-items:center;justify-content:space-between'>"
      +"<div style='font-size:16px;font-weight:600;color:#f2f2f2'>⚙️ Inställningar — Notering</div>"
      +"<button id='ns-close' style='background:none;border:none;color:#5c5c5c;font-size:20px;cursor:pointer;line-height:1'>✕</button>"
      +"</div>"
      +"<div style='padding:20px;max-height:70vh;overflow-y:auto'>"

      +"<div style='display:flex;align-items:center;justify-content:space-between;margin-bottom:4px'>"
      +"<div class='lbl' style='margin-bottom:0'>Fundering-kategorier</div>"
      +"<button id='ns-fund-sort' class='sec ghost' style='width:auto;margin:0;padding:4px 10px;font-size:11px'>Sortera A-Ö</button>"
      +"</div>"
      +"<div style='font-size:12px;color:#5c5c5c;margin-bottom:8px'>Tryck för att ändra namn, × för att ta bort, dra ⠿ för att ändra ordning.</div>"
      +simpleChipsHtml(wFund,editFundIdx,"fund","Inga kategorier kvar - lägg till minst en nedan.")
      +"<div style='display:flex;gap:6px;margin-bottom:4px'>"
      +"<input class='inp' id='ns-newfund-label' placeholder='Ny kategori...' style='flex:1;padding:7px 10px;font-size:13px'/>"
      +"<button class='chip' id='ns-newfund-emoji' type='button' title='Välj emoji' style='flex-shrink:0;padding:7px 10px;font-size:15px'>😀</button>"
      +"<button class='chip' id='ns-newfund-add' type='button' style='flex-shrink:0;padding:7px 12px;font-size:13px'>+</button>"
      +"</div>"

      +"<div style='display:flex;align-items:center;justify-content:space-between;margin-top:18px;margin-bottom:4px'>"
      +"<div class='lbl' style='margin-bottom:0'>Anteckningar-kategorier</div>"
      +"<button id='ns-tt-sort' class='sec ghost' style='width:auto;margin:0;padding:4px 10px;font-size:11px'>Sortera A-Ö</button>"
      +"</div>"
      +"<div style='font-size:12px;color:#5c5c5c;margin-bottom:8px'>Tryck för att ändra namn, × för att ta bort, dra ⠿ för att ändra ordning.</div>"
      +simpleChipsHtml(wTt,editTtIdx,"tt","Inga kategorier kvar - lägg till minst en nedan.")
      +"<div style='display:flex;gap:6px;margin-bottom:4px'>"
      +"<input class='inp' id='ns-newtt-label' placeholder='Ny kategori...' style='flex:1;padding:7px 10px;font-size:13px'/>"
      +"<button class='chip' id='ns-newtt-emoji' type='button' title='Välj emoji' style='flex-shrink:0;padding:7px 10px;font-size:15px'>😀</button>"
      +"<button class='chip' id='ns-newtt-add' type='button' style='flex-shrink:0;padding:7px 12px;font-size:13px'>+</button>"
      +"</div>"

      +"<div class='lbl' style='margin-top:18px;margin-bottom:4px'>Anteckningar-subkategorier</div>"
      +(wTt.length
        ? "<select id='ns-sub-cat-select' style='width:100%;background:#131313;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:9px 10px;margin-bottom:8px'>"
          +wTt.map(function(c){return "<option value='"+esc(c)+"'"+(c===anteckningSubCat?" selected":"")+">"+esc(c)+"</option>";}).join("")
          +"</select>"
          +simpleChipsHtml(wSub[anteckningSubCat]||[],editSubIdx,"sub","Inga subkategorier ännu för denna kategori.")
          +"<div style='display:flex;gap:6px;margin-bottom:4px'>"
          +"<input class='inp' id='ns-newsub-label' placeholder='Ny subkategori...' style='flex:1;padding:7px 10px;font-size:13px'/>"
          +"<button class='chip' id='ns-newsub-emoji' type='button' title='Välj emoji' style='flex-shrink:0;padding:7px 10px;font-size:15px'>😀</button>"
          +"<button class='chip' id='ns-newsub-add' type='button' style='flex-shrink:0;padding:7px 12px;font-size:13px'>+</button>"
          +"</div>"
        : "<div class='empty' style='padding:8px 0;font-size:12px;color:#5c5c5c'>Lägg till minst en Anteckningar-kategori ovan först.</div>")

      +"<div class='lbl' style='margin-top:18px'>Data & backup</div>"
      // OBS: "Data & backup" ska alltid ligga SIST i panelen, precis som i Aktivitets mönster.
      +"<button id='ns-json-editor' class='sec ghost' style='width:100%'>📝 Öppna/redigera JSON-filer</button>"
      +"<button id='ns-obsidian-export' class='sec ghost' style='width:100%;margin-top:8px'>📤 Skapa Obsidian-filer</button>"

      +"</div>"
      +"<div style='padding:16px 20px;border-top:1px solid #2a2a2a;display:flex;gap:10px'>"
      +"<button id='ns-cancel' class='sec ghost' style='flex:1'>Avbryt</button>"
      +"<button id='ns-save' class='cta-log' style='flex:1'>Spara</button>"
      +"</div>"
      +"</div>";
  }

  function commit(getEditIdx,setEditIdx,arr,inputSel){
    var idx=getEditIdx();
    if(idx===null)return;
    var lEl=ov.querySelector(inputSel);
    if(lEl&&arr[idx]!==undefined)arr[idx]=lEl.value.trim()||arr[idx];
    setEditIdx(null);
  }

  function bindChipDragReorder(selector,arr,idxAttr){
    var dragIdx=null;
    ov.querySelectorAll(selector).forEach(function(chip){
      chip.addEventListener("dragstart",function(e){
        dragIdx=Number(chip.dataset[idxAttr]);
        e.dataTransfer.effectAllowed="move";
        chip.style.opacity="0.4";
      });
      chip.addEventListener("dragend",function(){chip.style.opacity="1";});
      chip.addEventListener("dragover",function(e){e.preventDefault();});
      chip.addEventListener("drop",function(e){
        e.preventDefault();
        var dropIdx=Number(chip.dataset[idxAttr]);
        if(dragIdx===null||dragIdx===dropIdx)return;
        var moved=arr.splice(dragIdx,1)[0];
        arr.splice(dropIdx,0,moved);
        dragIdx=null;
        rerender();
      });
    });
  }

  function bindSimpleChipGroup(prefix,arr,getEditIdx,setEditIdx,onRename){
    bindChipDragReorder("[data-"+prefix+"-chip-idx]",arr,prefix+"ChipIdx");
    ov.querySelectorAll("[data-"+prefix+"-chip-idx]").forEach(function(chip){
      chip.onclick=function(e){
        if(e.target.closest("[data-"+prefix+"-remove-idx]"))return;
        commit(getEditIdx,setEditIdx,arr,"#"+prefix+"-edit-label");
        setEditIdx(Number(chip.dataset[prefix+"ChipIdx"]));
        rerender();
        var lEl=ov.querySelector("#"+prefix+"-edit-label");
        if(lEl){lEl.focus();lEl.select();}
      };
    });
    ov.querySelectorAll("[data-"+prefix+"-remove-idx]").forEach(function(btn){
      btn.onclick=function(e){
        e.stopPropagation();
        var i=Number(btn.dataset[prefix+"RemoveIdx"]);
        if(arr[i]===undefined)return;
        var removedLabel=arr[i];
        arr.splice(i,1);
        var idx=getEditIdx();
        if(idx===i)setEditIdx(null);else if(idx!==null&&idx>i)setEditIdx(idx-1);
        if(onRename)onRename(removedLabel,null); // null = borttagen
        rerender();
      };
    });
    var confirmBtn=ov.querySelector("#"+prefix+"-edit-confirm");
    if(confirmBtn)confirmBtn.onclick=function(){
      var idx=getEditIdx();
      var before=idx!==null?arr[idx]:null;
      commit(getEditIdx,setEditIdx,arr,"#"+prefix+"-edit-label");
      if(onRename&&before!==null)onRename(before,arr[idx]);
      rerender();
    };
    var emojiBtn=ov.querySelector("#"+prefix+"-edit-emoji");
    if(emojiBtn)emojiBtn.onclick=function(){
      openNoteringEmojiPicker(function(emoji){
        var lEl=ov.querySelector("#"+prefix+"-edit-label");
        if(!lEl)return;
        var pos=lEl.selectionStart!=null?lEl.selectionStart:lEl.value.length;
        lEl.value=lEl.value.slice(0,pos)+emoji+" "+lEl.value.slice(pos);
        lEl.focus();
      });
    };
    var editLabelEl=ov.querySelector("#"+prefix+"-edit-label");
    if(editLabelEl)editLabelEl.onkeydown=function(e){
      if(e.key==="Enter"){
        var idx=getEditIdx();
        var before=idx!==null?arr[idx]:null;
        commit(getEditIdx,setEditIdx,arr,"#"+prefix+"-edit-label");
        if(onRename&&before!==null)onRename(before,arr[idx]);
        rerender();
      }
    };
  }

  function bindPanel(){
    ov.querySelector("#ns-close").onclick=function(){ov.remove();};
    ov.querySelector("#ns-cancel").onclick=function(){ov.remove();};

    ov.querySelector("#ns-fund-sort").onclick=function(){
      wFund.sort(function(a,b){return a.localeCompare(b,"sv");});
      rerender();
    };
    ov.querySelector("#ns-tt-sort").onclick=function(){
      wTt.sort(function(a,b){return a.localeCompare(b,"sv");});
      rerender();
    };

    bindSimpleChipGroup("fund",wFund,function(){return editFundIdx;},function(v){editFundIdx=v;});
    bindSimpleChipGroup("tt",wTt,function(){return editTtIdx;},function(v){editTtIdx=v;},function(oldLabel,newLabel){
      // Kategorin döptes om eller togs bort - flytta/ta bort motsvarande subkategori-lista.
      if(!(oldLabel in wSub))return;
      var subs=wSub[oldLabel];
      delete wSub[oldLabel];
      if(newLabel!==null)wSub[newLabel]=subs;
      if(anteckningSubCat===oldLabel)anteckningSubCat=newLabel;
    });

    ov.querySelector("#ns-newfund-label").onkeydown=function(e){if(e.key==="Enter")ov.querySelector("#ns-newfund-add").click();};
    ov.querySelector("#ns-newfund-emoji").onclick=function(){
      openNoteringEmojiPicker(function(emoji){
        var inp=ov.querySelector("#ns-newfund-label");
        if(inp){inp.value=emoji+" "+inp.value;inp.focus();}
      });
    };
    ov.querySelector("#ns-newfund-add").onclick=function(){
      var labelInp=ov.querySelector("#ns-newfund-label");
      var label=labelInp.value.trim();
      if(!label||wFund.indexOf(label)>-1)return;
      wFund.push(label);
      rerender();
    };
    ov.querySelector("#ns-newtt-label").onkeydown=function(e){if(e.key==="Enter")ov.querySelector("#ns-newtt-add").click();};
    ov.querySelector("#ns-newtt-emoji").onclick=function(){
      openNoteringEmojiPicker(function(emoji){
        var inp=ov.querySelector("#ns-newtt-label");
        if(inp){inp.value=emoji+" "+inp.value;inp.focus();}
      });
    };
    ov.querySelector("#ns-newtt-add").onclick=function(){
      var labelInp=ov.querySelector("#ns-newtt-label");
      var label=labelInp.value.trim();
      if(!label||wTt.indexOf(label)>-1)return;
      wTt.push(label);
      if(!anteckningSubCat)anteckningSubCat=label;
      rerender();
    };

    var subCatSelect=ov.querySelector("#ns-sub-cat-select");
    if(subCatSelect)subCatSelect.onchange=function(){anteckningSubCat=subCatSelect.value;editSubIdx=null;rerender();};

    if(wTt.length){
      if(!wSub[anteckningSubCat])wSub[anteckningSubCat]=[];
      bindSimpleChipGroup("sub",wSub[anteckningSubCat],function(){return editSubIdx;},function(v){editSubIdx=v;});
      var newSubLabelEl=ov.querySelector("#ns-newsub-label");
      if(newSubLabelEl)newSubLabelEl.onkeydown=function(e){if(e.key==="Enter")ov.querySelector("#ns-newsub-add").click();};
      var newSubEmojiEl=ov.querySelector("#ns-newsub-emoji");
      if(newSubEmojiEl)newSubEmojiEl.onclick=function(){
        openNoteringEmojiPicker(function(emoji){
          var inp=ov.querySelector("#ns-newsub-label");
          if(inp){inp.value=emoji+" "+inp.value;inp.focus();}
        });
      };
      var newSubAddEl=ov.querySelector("#ns-newsub-add");
      if(newSubAddEl)newSubAddEl.onclick=function(){
        var labelInp=ov.querySelector("#ns-newsub-label");
        var label=labelInp.value.trim();
        if(!label)return;
        if(!wSub[anteckningSubCat])wSub[anteckningSubCat]=[];
        if(wSub[anteckningSubCat].indexOf(label)>-1)return;
        wSub[anteckningSubCat].push(label);
        rerender();
      };
    }

    ov.querySelector("#ns-json-editor").onclick=function(){openNoteringJsonEditor();};
    var obsidianExportBtn=ov.querySelector("#ns-obsidian-export");
    if(obsidianExportBtn)obsidianExportBtn.onclick=async function(){
      obsidianExportBtn.disabled=true;
      var origText=obsidianExportBtn.textContent;
      obsidianExportBtn.textContent="Skapar filer...";
      await exportAllToObsidian();
      obsidianExportBtn.disabled=false;
      obsidianExportBtn.textContent=origText;
    };

    ov.querySelector("#ns-save").onclick=function(){
      if(!wFund.length){alert("Du måste ha minst en Fundering-kategori kvar.");return;}
      if(!wTt.length){alert("Du måste ha minst en Anteckningar-kategori kvar.");return;}
      FUND_CAT_PRESETS=wFund;
      ANTECKNING_CAT_PRESETS=wTt;
      ANTECKNING_SUBCAT_BY_CAT=wSub;
      saveNoteringSettings();
      ov.remove();
      renderLogFunderingar();
    };
  }

  function rerender(){
    ov.innerHTML=panelHtml();
    bindPanel();
  }

  rerender();
  document.body.appendChild(ov);
}

// ---- Data & backup: JSON-redigerare för Notering (samma säkerhetsmönster som Aktivitet) ----
function openNoteringJsonEditor(){
  var current="fundering";
  var ov2=document.createElement("div");
  ov2.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:10001;display:flex;align-items:center;justify-content:center;padding:16px";

  function dataFor(key){
    if(key==="fundering")return {fundHist:fundHist};
    if(key==="anteckning")return {anteckningHist:anteckningHist};
    return {fundCatPresets:FUND_CAT_PRESETS,anteckningCatPresets:ANTECKNING_CAT_PRESETS,anteckningSubcatByCat:ANTECKNING_SUBCAT_BY_CAT};
  }
  var NOTERING_JSON_TARGETS=[
    {key:"fundering",label:"Fundering (fundering.json)",folder:"Notering",filename:"fundering.json"},
    {key:"anteckning",label:"Anteckningar (anteckning.json)",folder:"Notering",filename:"anteckning.json"},
    {key:"kategorier",label:"Kategorier (settings.json)",folder:"Notering",filename:"settings.json"}
  ];
  function driveTargetFor(key){return NOTERING_JSON_TARGETS.find(function(t){return t.key===key;});}

  async function findDriveFileIdReadOnly(folderName,filename){
    var q="name='"+folderName+"' and '"+FOLDER_ID+"' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false";
    var r=await fetch(DRIVE_API+"?q="+encodeURIComponent(q)+"&fields=files(id)",{headers:{Authorization:"Bearer "+accessToken}});
    if(!r.ok)throw new Error("HTTP "+r.status);
    var d=await r.json();
    if(!(d.files&&d.files.length))return null;
    var folderId=d.files[0].id;
    var q2="name='"+filename+"' and '"+folderId+"' in parents and trashed=false";
    var r2=await fetch(DRIVE_API+"?q="+encodeURIComponent(q2)+"&fields=files(id)",{headers:{Authorization:"Bearer "+accessToken}});
    if(!r2.ok)throw new Error("HTTP "+r2.status);
    var d2=await r2.json();
    return (d2.files&&d2.files.length)?d2.files[0].id:null;
  }

  var missingChecked=false,missingList=null;
  function renderMissingList(statusEl,missing){
    statusEl.innerHTML="";
    if(!missing.length)return;
    statusEl.style.color="#d97a83";
    var msg=document.createElement("div");
    msg.textContent="⚠️ Dessa filer finns inte i Drive ännu:";
    statusEl.appendChild(msg);
    missing.forEach(function(target){
      var row=document.createElement("div");
      row.style.cssText="display:flex;align-items:center;gap:6px;margin-top:4px";
      var label=document.createElement("span");
      label.textContent=target.label;
      label.style.flex="1";
      var createBtn=document.createElement("button");
      createBtn.textContent="Skapa";
      createBtn.className="sec ghost";
      createBtn.style.cssText="padding:3px 10px;font-size:11px;flex-shrink:0";
      createBtn.onclick=function(){
        createMissingFile(target,row,createBtn).then(function(){
          missingList=missingList.filter(function(t){return t.key!==target.key;});
        });
      };
      row.appendChild(label);
      row.appendChild(createBtn);
      statusEl.appendChild(row);
    });
  }
  function checkFileExists(){
    var statusEl=ov2.querySelector("#nje-status");
    if(!statusEl)return;
    if(!accessToken){statusEl.innerHTML="";return;}
    if(missingChecked){renderMissingList(statusEl,missingList);return;}
    statusEl.style.color="#5c5c5c";
    statusEl.textContent="Kontrollerar vilka filer som finns i Drive...";
    Promise.all(NOTERING_JSON_TARGETS.map(function(t){
      return findDriveFileIdReadOnly(t.folder,t.filename).then(function(id){return {target:t,found:!!id};});
    })).then(function(results){
      if(!statusEl.isConnected)return;
      missingChecked=true;
      missingList=results.filter(function(r){return !r.found;}).map(function(r){return r.target;});
      renderMissingList(statusEl,missingList);
    }).catch(function(e){
      if(!statusEl.isConnected)return;
      statusEl.style.color="#d97a83";
      statusEl.textContent="Kunde inte kontrollera Drive: "+e.message;
    });
  }
  // Skapar ALDRIG en PATCH/overwrite - bara POST av en helt ny fil, och kollar en sista gång
  // precis innan att filen fortfarande saknas (skyddar mot dubbletter, se HANDOFF_own_your_data.md).
  async function createMissingFile(target,rowEl,createBtn){
    createBtn.disabled=true;createBtn.textContent="Skapar...";
    try{
      var stillMissing=!(await findDriveFileIdReadOnly(target.folder,target.filename));
      if(!stillMissing){
        rowEl.textContent=target.label+": fanns redan (skapades av något annat under tiden) - inget skrevs över.";
        rowEl.style.color="#5c5c5c";
        return;
      }
      var folderId=await driveMkdir(target.folder,FOLDER_ID);
      if(!folderId)throw new Error("Kunde inte skapa/hitta mappen "+target.folder);
      var form=new FormData();
      form.append("metadata",new Blob([JSON.stringify({name:target.filename,parents:[folderId],mimeType:"application/json"})],{type:"application/json"}));
      form.append("file",new Blob([JSON.stringify(dataFor(target.key),null,2)],{type:"application/json"}));
      var cr=await fetch(DRIVE_UPLOAD+"?uploadType=multipart&fields=id",{method:"POST",headers:{Authorization:"Bearer "+accessToken},body:form});
      if(!cr.ok)throw new Error("HTTP "+cr.status);
      var cd=await cr.json();
      if(!cd.id)throw new Error("Drive returnerade inget fil-id");
      rowEl.textContent="✓ "+target.label+" skapad.";
      rowEl.style.color="#4fa8ff";
    }catch(e){
      rowEl.style.color="#d97a83";
      rowEl.textContent=target.label+": kunde inte skapas - "+e.message;
      createBtn.disabled=false;createBtn.textContent="Skapa";
      rowEl.appendChild(createBtn);
    }
  }

  function render(){
    ov2.innerHTML="<div style='background:#161616;border-radius:16px;width:100%;max-width:520px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden'>"
      +"<div style='padding:14px 18px;border-bottom:1px solid #2a2a2a;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap'>"
      +"<select id='nje-select' style='background:#131313;border:1px solid #2a2a2a;border-radius:8px;color:#f2f2f2;font-size:13px;padding:6px 8px;flex:1;min-width:110px'>"
      +"<option value='fundering'"+(current==="fundering"?" selected":"")+">Fundering</option>"
      +"<option value='anteckning'"+(current==="anteckning"?" selected":"")+">Anteckningar</option>"
      +"<option value='kategorier'"+(current==="kategorier"?" selected":"")+">Kategorier</option>"
      +"</select>"
      +"<button id='nje-open-drive' title='Öppna filen i Google Drive' style='background:none;border:1px solid #2a2a2a;border-radius:8px;color:#4fa8ff;font-size:12px;padding:6px 10px;cursor:pointer;white-space:nowrap;flex-shrink:0'>🔗 Öppna i Drive</button>"
      +"<button id='nje-close' style='background:none;border:none;color:#5c5c5c;font-size:20px;cursor:pointer;line-height:1;flex-shrink:0'>✕</button>"
      +"</div>"
      +"<div id='nje-status' style='padding:8px 18px 0;font-size:11px'></div>"
      +"<textarea id='nje-text' spellcheck='false' style='flex:1;background:#0a0a0a;color:#f2f2f2;border:none;padding:14px;font-family:monospace;font-size:12px;min-height:300px;resize:vertical'>"+esc(JSON.stringify(dataFor(current),null,2))+"</textarea>"
      +"<div id='nje-warning' style='padding:0 18px 8px;font-size:11px;color:#d97a83'></div>"
      +"<div style='padding:14px 18px;border-top:1px solid #2a2a2a;display:flex;gap:10px'>"
      +"<button id='nje-cancel' class='sec ghost' style='flex:1'>Avbryt</button>"
      +"<button id='nje-save' class='cta-log' style='flex:1'>Spara ändringar</button>"
      +"</div>"
      +"</div>";
    ov2.querySelector("#nje-close").onclick=function(){ov2.remove();};
    ov2.querySelector("#nje-cancel").onclick=function(){ov2.remove();};
    ov2.querySelector("#nje-select").onchange=function(){current=ov2.querySelector("#nje-select").value;render();};
    checkFileExists();
    ov2.querySelector("#nje-open-drive").onclick=function(){
      var warn=ov2.querySelector("#nje-warning");
      if(!accessToken){warn.style.color="#d97a83";warn.textContent="Logga in för att öppna filen i Drive.";return;}
      warn.style.color="#5c5c5c";warn.textContent="Söker filen i Drive...";
      var target=driveTargetFor(current);
      findDriveFileIdReadOnly(target.folder,target.filename).then(function(fileId){
        if(!fileId){warn.style.color="#d97a83";warn.textContent="Filen finns inte i Drive ännu (har inte sparats dit).";return;}
        warn.textContent="";
        window.open("https://drive.google.com/file/d/"+fileId+"/view","_blank");
      }).catch(function(e){
        warn.style.color="#d97a83";warn.textContent="Kunde inte hitta filen: "+e.message;
      });
    };
    ov2.querySelector("#nje-save").onclick=function(){
      var txt=ov2.querySelector("#nje-text").value;
      var warn=ov2.querySelector("#nje-warning");
      var parsed;
      try{parsed=JSON.parse(txt);}catch(e){warn.textContent="Ogiltig JSON: "+e.message;return;}
      if(current==="fundering"){
        if(!Array.isArray(parsed.fundHist)){warn.textContent="Förväntade ett 'fundHist'-fält med en lista.";return;}
        fundHist=parsed.fundHist;
        saveNoteringFundering();
      }else if(current==="anteckning"){
        if(!Array.isArray(parsed.anteckningHist)){warn.textContent="Förväntade ett 'anteckningHist'-fält med en lista.";return;}
        anteckningHist=parsed.anteckningHist;
        saveNoteringAnteckning();
      }else{
        if(!Array.isArray(parsed.fundCatPresets)||!parsed.fundCatPresets.length){warn.textContent="Förväntade ett 'fundCatPresets'-fält med minst en kategori.";return;}
        if(!Array.isArray(parsed.anteckningCatPresets)||!parsed.anteckningCatPresets.length){warn.textContent="Förväntade ett 'anteckningCatPresets'-fält med minst en kategori.";return;}
        FUND_CAT_PRESETS=parsed.fundCatPresets;
        ANTECKNING_CAT_PRESETS=parsed.anteckningCatPresets;
        ANTECKNING_SUBCAT_BY_CAT=parsed.anteckningSubcatByCat||{};
        saveNoteringSettings();
      }
      ov2.remove();
      renderLogFunderingar();
    };
  }
  render();
  document.body.appendChild(ov2);
}

var fundDraft="", editingFundId=null;
var fundCatSelect="", fundReadCat="", fundReadActive=false, editingFundKeyLog=null;
var funderingarSubview="anteckning";
var notisbokActive=false; // delad mellan Fundering/Anteckning - byte av underflik ska inte stänga Notisbok

// ---- "Senaste inlägg" med oändlig scroll (nyaste överst, äldre laddas in vid scrollning) ----
var NOTERING_PAGE_SIZE=5;
var fundVisibleCount=NOTERING_PAGE_SIZE;
var anteckningVisibleCount=NOTERING_PAGE_SIZE;
var noteringScrollHandler=null;
function bindNoteringInfiniteScroll(loadMoreFn){
  if(noteringScrollHandler)window.removeEventListener("scroll",noteringScrollHandler);
  var loading=false;
  noteringScrollHandler=function(){
    if(loading)return;
    var scrollBottom=window.innerHeight+window.scrollY;
    var docHeight=document.documentElement.scrollHeight;
    if(scrollBottom>=docHeight-300){
      loading=true;
      var hasMore=loadMoreFn();
      loading=false;
      if(!hasMore&&noteringScrollHandler){
        window.removeEventListener("scroll",noteringScrollHandler);
        noteringScrollHandler=null;
      }
    }
  };
  window.addEventListener("scroll",noteringScrollHandler);

  // Fyll skärmen direkt om första batchen är för liten för att göra sidan scrollbar - annars
  // triggas scroll-eventet aldrig och resten av datan laddas aldrig in (t.ex. på höga skärmar).
  // Anpassar sig efter verklig radhöjd (korta funderingar vs långa anteckningar) istället för
  // att bara gissa utifrån skärmupplösning.
  var fillGuard=0;
  while(document.documentElement.scrollHeight<=window.innerHeight&&fillGuard<50){
    fillGuard++;
    if(!loadMoreFn()){
      if(noteringScrollHandler){window.removeEventListener("scroll",noteringScrollHandler);noteringScrollHandler=null;}
      break;
    }
  }
}

// Lärdom (Vokabulär/Kunskap) är borttaget helt ur appen - ska aldrig användas igen.
var anteckningHist=[], anteckningDraft="", anteckningRubrikDraft="", anteckningReadRubrikSearch="";
var anteckningCatSelect="", anteckningReadCat="", anteckningReadSubcat="", anteckningReadExcludeSubcat="", anteckningReadActive=false, editingAnteckningKeyLog=null;

// ---- Notering äger sin egen Drive-JSON/inställningar (se HANDOFF_own_your_data.md) ----
// fundering.json = fundHist, anteckning.json = anteckningHist, settings.json = kategorierna.
// Alla tre ligger i Drive-mappen "Notering". Inga referenser till Installningar - core.js's
// gamla delade DRIVE_STRUCTURE/saveTab/loadTab-system hanterar inte denna flik längre.
var noteringDataLoadPromise=null;
var noteringSettingsLoadPromise=null;

function showNoteringDriveError(context,e){
  console.error(context,e);
  var el=document.createElement("div");
  el.style.cssText="position:fixed;bottom:16px;left:16px;right:16px;max-width:420px;margin:0 auto;background:#2e1518;border:1px solid #d97a83;color:#d97a83;padding:10px 14px;border-radius:10px;font-size:12px;z-index:10001";
  el.textContent="⚠️ "+context+": "+(e&&e.message?e.message:String(e));
  document.body.appendChild(el);
  setTimeout(function(){el.remove();},6000);
}

// Kort, positiv bekräftelse (t.ex. vid pinning) - separat från felrutan ovan eftersom den
// inte ska se ut som ett fel. Försvinner av sig själv.
function showNoteringToast(text){
  var el=document.createElement("div");
  el.style.cssText="position:fixed;bottom:16px;left:16px;right:16px;max-width:420px;margin:0 auto;background:#132e1c;border:1px solid #4fd97a;color:#4fd97a;padding:10px 14px;border-radius:10px;font-size:12px;z-index:10001;text-align:center";
  el.textContent=text;
  document.body.appendChild(el);
  setTimeout(function(){el.remove();},1500);
}

// Returnerar SAMMA pågående inläsning till alla som anropar samtidigt (inte bara en flagga) -
// annars kan t.ex. ⚙️-knappen "await":a ett anrop som redan flaggats som klart fast den
// riktiga Drive-läsningen inte hunnit bli klar, och panelen öppnas med tom data (den bugg som
// orsakade "Du måste ha minst en Fundering-kategori kvar" trots att settings.json hade data).
function ensureNoteringDataLoaded(){
  if(!accessToken)return Promise.resolve();
  if(noteringDataLoadPromise)return noteringDataLoadPromise;
  noteringDataLoadPromise=(async function(){
    try{
      var fundData=await driveReadJson(["Notering"],"fundering.json");
      if(fundData&&fundData.fundHist)fundHist=fundData.fundHist;
      var antData=await driveReadJson(["Notering"],"anteckning.json");
      if(antData&&antData.anteckningHist)anteckningHist=antData.anteckningHist;
      if(document.getElementById("body")&&view==="funderingar")renderLogFunderingar();
    }catch(e){
      noteringDataLoadPromise=null; // tillåt nytt försök nästa gång fliken öppnas
      showNoteringDriveError("Kunde inte läsa Notering-data",e);
    }
  })();
  return noteringDataLoadPromise;
}

async function saveNoteringFundering(){
  if(!accessToken)return;
  try{
    await driveWriteJson(["Notering"],"fundering.json",{fundHist:fundHist});
  }catch(e){
    showNoteringDriveError("Kunde inte spara Fundering",e);
  }
}

async function saveNoteringAnteckning(){
  if(!accessToken)return;
  try{
    await driveWriteJson(["Notering"],"anteckning.json",{anteckningHist:anteckningHist});
  }catch(e){
    showNoteringDriveError("Kunde inte spara Anteckningar",e);
  }
}

// ---- Obsidian-export (envägs, app -> Obsidian) — ENDAST filer + mappar, manuellt styrd ----
// Skriver Fundering/Anteckning som .md-filer i Minnesbank/<Typ>/<kategori>/. Ingen automatisk
// bakgrundskörning, ingen läsning tillbaka från Obsidian, ingen borttagningskontroll - bara
// skapa/uppdatera filer, triggat via knappen "📤 Skapa Obsidian-filer" i ⚙️-panelen.
// Poster utan kategori hamnar i "Övrigt". Subkategorier (bara Anteckning) blir Obsidians
// "aliases" i frontmatter, inte taggar.
var OBSIDIAN_VAULT_FOLDER_ID="1wTxwY_iqkDL3Mf4A_CiNzeJgfJVq2Zkb"; // "Minnesbank" (under OneNote)
var FUNDERING_OBSIDIAN_FOLDER_ID="16-rgEsM7XgxcVEB88Jt5ffDSCj8fqWes"; // Fundering skrivs numera direkt hit (samma mapp som "Anteckning" redan använder) - ingen egen mapp-struktur eller markdown-formatering längre för Fundering
var OBSIDIAN_VAULT_NAME="Minnesbank"; // Obsidian-valvets namn
var OBSIDIAN_ICON_DATA_URI="data:image/png;base64,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"; // Obsidian-app-ikonen, inbäddad (96x96, komprimerad)
var OBSIDIAN_VAULT_RELATIVE_PREFIX="OneNote/Minnesbank"; // sökväg till skriv-mappen, relativt valv-roten
var OBSIDIAN_ONENOTE_FOLDER_ID="1aCOTvfa4SHYBk9WreIKo6fubToRlFBqo"; // "OneNote"-mappen (en nivå ovanför Minnesbank) - just nu oanvänd, Obsibok skannar bara Minnesbank
var obsidianFilesViewActive=false;
var obsidianFolderStack=null; // {id,name}[] - byggs upp allteftersom man navigerar i Obsibok, nollställs när man lämnar
var OBSIDIAN_UNCATEGORIZED_FOLDER_NAME="Övrigt";
var obsidianTypeRootFolderIds={};
var obsidianTypeRootFolderPromises={};
var obsidianCategoryFolderIds={};
var obsidianCategoryFolderPromises={};

function obsidianTypeFolderName(type){return type==="fundering"?"Fundering":"Anteckning";}

function stripEmojiForFolderName(text){
  return (text||"")
    .replace(/\p{Extended_Pictographic}/gu,"")
    .replace(/[\uFE0F\u200D]/g,"")
    .replace(/\s+/g," ")
    .trim();
}

function obsidianFolderNameForCategory(category){
  var trimmed=category&&category.trim()?category.trim():"";
  var stripped=stripEmojiForFolderName(trimmed);
  return stripped||OBSIDIAN_UNCATEGORIZED_FOLDER_NAME;
}

function slugifyForObsidianFilename(text){
  return (text||"").replace(/[\\\/:*?"<>|#^\[\]]/g,"").trim().slice(0,60);
}

function obsidianFilenameFor(entry,type){
  var namePart=entry.rubrik?slugifyForObsidianFilename(entry.rubrik):"";
  if(!namePart){
    var snippet=(entry.text||"").split("\n")[0].trim();
    namePart=snippet?slugifyForObsidianFilename(snippet.slice(0,40)):"";
  }
  if(!namePart)namePart=type==="fundering"?"Fundering":"Anteckning";
  return namePart+".md";
}

function obsidianMarkdownFor(entry,type){
  var lines=["---"];
  lines.push("id: "+entry.id);
  lines.push("type: "+type);
  if(entry.category)lines.push("category: \""+entry.category+"\"");
  if(entry.subcategories&&entry.subcategories.length){
    var tags=entry.subcategories.map(function(s){return "\""+s.replace(/\s+/g,"-")+"\"";});
    lines.push("tags: ["+tags.join(", ")+"]");
  }
  lines.push("---");
  lines.push("");
  if(entry.rubrik)lines.push("# "+entry.rubrik);
  lines.push("");
  lines.push(entry.text);
  return lines.join("\n");
}

// Bygger en obsidian://-länk till en post. Kräver att posten redan synkats och har sitt
// riktiga filnamn sparat (entry.obsidianFilename) - annars finns ingen fil att länka till.
function obsidianUriFor(entry,type){
  if(!entry.obsidianFileId||!entry.obsidianFilename)return null;
  var filenameNoExt=entry.obsidianFilename.replace(/\.md$/i,"");
  var fullPath;
  if(type==="fundering"){
    // Fundering ligger inte längre i sin egen typ/kategori-mapp - skrivs numera direkt in
    // i samma "Anteckning"-mapp som Anteckning använder (se FUNDERING_OBSIDIAN_FOLDER_ID).
    fullPath=[OBSIDIAN_VAULT_RELATIVE_PREFIX,"Anteckning",filenameNoExt].join("/");
  }else{
    var typeName=obsidianTypeFolderName(type);
    var catName=obsidianFolderNameForCategory(entry.category);
    fullPath=[OBSIDIAN_VAULT_RELATIVE_PREFIX,typeName,catName,filenameNoExt].join("/");
  }
  // HELA sökvägen (inkl. "/") kodas som EN enhet - annars tolkar Obsidians URI-hanterare
  // ofta inte "file"-parametern korrekt (öppnar bara valvet, inte den specifika filen).
  return "obsidian://open?vault="+encodeURIComponent(OBSIDIAN_VAULT_NAME)+"&file="+encodeURIComponent(fullPath);
}

// Bygger en obsidian://-länk utifrån en sökväg RELATIV TILL "OneNote"-mappen - t.ex.
// "Volvo/Volvo/Motor.md" eller "Minnesbank/Anteckning/Arbete/Pall storlek.md".
function obsidianUriForOneNotePath(relativePath){
  var fullPath="OneNote/"+relativePath;
  var noExt=fullPath.replace(/\.md$/i,"");
  return "obsidian://open?vault="+encodeURIComponent(OBSIDIAN_VAULT_NAME)+"&file="+encodeURIComponent(noExt);
}

// Går igenom "OneNote"-mappen rekursivt och samlar in ALLA .md-filer, oavsett hur djupt
// nedgrävda eller vilken undermapp de ligger i (inte bara Minnesbank/Anteckning|Fundering -
// även andra mappar som redan låg i valvet sen tidigare, t.ex. från en OneNote-migrering).
async function listMarkdownFolderChildren(folderId,pathPrefix){
  var children=[];
  var pageToken=null;
  // OBS: filtrerar INTE längre på mimeType='text/markdown' i själva Drive-frågan - det
  // visade sig utesluta riktiga .md-filer (särskilt äldre, OneNote-migrerade sådana som
  // inte alltid fått exakt den mimetypen satt av Drive). Avgör nu istället ENDAST på
  // filnamnets ändelse (.md) längre ner, klient-sidan - garanterat korrekt oavsett vad
  // Drive råkar ha satt som mimeType. Det kostar lite extra data (bilder hämtas också),
  // men är den enda tillförlitliga metoden.
  var q="'"+folderId+"' in parents and trashed=false";
  do{
    var url=DRIVE_API+"?q="+encodeURIComponent(q)+"&fields=nextPageToken,files(id,name,mimeType,modifiedTime)&pageSize=100"+(pageToken?"&pageToken="+encodeURIComponent(pageToken):"");
    var r=await fetch(url,{headers:{Authorization:"Bearer "+accessToken}});
    if(!r.ok)throw new Error("HTTP "+r.status+" vid listning av \""+pathPrefix+"\"");
    var d=await r.json();
    children=children.concat(d.files||[]);
    pageToken=d.nextPageToken||null;
  }while(pageToken);
  return children;
}

// isRoot=true (bara den allra första, yttersta anropet) LÅTER fel bubbla upp - roten MÅSTE
// lyckas, annars vore ett systemfel (t.ex. utgången inloggning) osynligt tystat till "inga
// filer hittades" istället för ett riktigt felmeddelande. Alla INRE (rekursiva) anrop
// hoppar däremot bara över en enskild mapp som strular, utan att döda hela skanningen.


// Egen find-or-create för mappar, oberoende av core.js's driveMkdir - den fungerar inte
// tillförlitligt mot en mapp UTANFÖR appens egen rot-mapp (bekräftat: Minnesbank-mappen fick
// aldrig något skrivet till sig trots upprepade driveMkdir-anrop). Rena fetch-anrop istället.
async function obsidianFindOrCreateFolder(name,parentId){
  var q="name='"+name.replace(/'/g,"\\'")+"' and '"+parentId+"' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false";
  var r=await fetch(DRIVE_API+"?q="+encodeURIComponent(q)+"&fields=files(id)",{headers:{Authorization:"Bearer "+accessToken}});
  if(!r.ok)throw new Error("HTTP "+r.status+" vid sökning efter mappen \""+name+"\"");
  var d=await r.json();
  if(d.files&&d.files.length)return d.files[0].id;
  var cr=await fetch(DRIVE_API,{
    method:"POST",
    headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},
    body:JSON.stringify({name:name,parents:[parentId],mimeType:"application/vnd.google-apps.folder"})
  });
  if(!cr.ok)throw new Error("HTTP "+cr.status+" vid skapande av mappen \""+name+"\"");
  var cd=await cr.json();
  if(!cd.id)throw new Error("Drive returnerade inget id för mappen \""+name+"\"");
  return cd.id;
}

function ensureObsidianTypeRootFolder(type){
  var name=obsidianTypeFolderName(type);
  if(obsidianTypeRootFolderIds[name])return Promise.resolve(obsidianTypeRootFolderIds[name]);
  if(obsidianTypeRootFolderPromises[name])return obsidianTypeRootFolderPromises[name];
  obsidianTypeRootFolderPromises[name]=(async function(){
    try{
      var folderId=await obsidianFindOrCreateFolder(name,OBSIDIAN_VAULT_FOLDER_ID);
      obsidianTypeRootFolderIds[name]=folderId;
      obsidianTypeRootFolderPromises[name]=null;
      return folderId;
    }catch(e){
      obsidianTypeRootFolderPromises[name]=null;
      showNoteringDriveError("Kunde inte skapa/hitta Obsidian-mappen \""+name+"\"",e);
      return null;
    }
  })();
  return obsidianTypeRootFolderPromises[name];
}

function ensureObsidianCategoryFolder(type,category){
  var typeName=obsidianTypeFolderName(type);
  var catName=obsidianFolderNameForCategory(category);
  var key=typeName+"|"+catName;
  if(obsidianCategoryFolderIds[key])return Promise.resolve(obsidianCategoryFolderIds[key]);
  if(obsidianCategoryFolderPromises[key])return obsidianCategoryFolderPromises[key];
  obsidianCategoryFolderPromises[key]=(async function(){
    var rootId=await ensureObsidianTypeRootFolder(type);
    if(!rootId){obsidianCategoryFolderPromises[key]=null;return null;}
    try{
      var folderId=await obsidianFindOrCreateFolder(catName,rootId);
      obsidianCategoryFolderIds[key]=folderId;
      obsidianCategoryFolderPromises[key]=null;
      return folderId;
    }catch(e){
      obsidianCategoryFolderPromises[key]=null;
      showNoteringDriveError("Kunde inte skapa/hitta Obsidian-mappen \""+catName+"\"",e);
      return null;
    }
  })();
  return obsidianCategoryFolderPromises[key];
}

// saveFn = saveNoteringFundering/saveNoteringAnteckning - anropas igen efter en NY fil
// skapats så att det nya obsidianFileId:t (och filnamnet) sparas ner permanent.
async function syncEntryToObsidian(entry,type,saveFn){
  if(!accessToken||!entry)return;
  try{
    var folderId,content;
    if(type==="fundering"){
      // Fundering: ingen egen mapp-struktur (Fundering-mappen/kategori-mappar) skapas
      // längre - skriver istället rå text (ingen frontmatter/markdown-formatering) direkt
      // in i samma mapp som Anteckning redan använder.
      folderId=FUNDERING_OBSIDIAN_FOLDER_ID;
      content=entry.text;
    }else{
      folderId=await ensureObsidianCategoryFolder(type,entry.category);
      if(!folderId)throw new Error("Kunde inte hitta/skapa kategori-mappen i Obsidian-valvet");
      content=obsidianMarkdownFor(entry,type);
    }
    var filename=obsidianFilenameFor(entry,type);

    if(entry.obsidianFileId){
      try{
        var metaR=await fetch(DRIVE_API+"/"+entry.obsidianFileId+"?fields=trashed",{headers:{Authorization:"Bearer "+accessToken}});
        if(metaR.ok){
          var metaD=await metaR.json();
          if(!metaD.trashed){
            var pr=await fetch(DRIVE_UPLOAD+"/"+entry.obsidianFileId+"?uploadType=media",{
              method:"PATCH",
              headers:{Authorization:"Bearer "+accessToken,"Content-Type":"text/markdown"},
              body:content
            });
            if(pr.ok){
              if(!entry.obsidianFilename){entry.obsidianFilename=filename;if(saveFn)saveFn();}
              return;
            }
          }
          // Filen ligger i papperskorgen (borttagen för hand) - Drive tillåter ändå att
          // skriva innehåll till den utan fel, vilket tidigare fick koden att tro att allt
          // gick bra fast filen var osynlig/borta. Faller nu igenom till sök-eller-skapa.
        }
      }catch(patchErr){
        // Nätverksfel vid uppdatering av befintlig fil - faller igenom till sök-eller-skapa
        // nedan istället för att avbryta hela synken (tidigare bugg: detta kraschade tyst
        // om obsidianFileId var ogiltigt/borttaget sen tidigare felsökning).
      }
      // Filen kan ha tagits bort/flyttats manuellt i Obsidian, eller obsidianFileId är
      // ogiltigt sen tidigare - faller igenom till sök-eller-skapa nedan.
    }

    var q="name='"+filename.replace(/'/g,"\\'")+"' and '"+folderId+"' in parents and trashed=false";
    var r=await fetch(DRIVE_API+"?q="+encodeURIComponent(q)+"&fields=files(id)",{headers:{Authorization:"Bearer "+accessToken}});
    if(!r.ok)throw new Error("HTTP "+r.status+" vid sökning efter befintlig fil");
    var d=await r.json();
    if(d.files&&d.files.length){
      entry.obsidianFileId=d.files[0].id;
      entry.obsidianFilename=filename;
      var pr2=await fetch(DRIVE_UPLOAD+"/"+entry.obsidianFileId+"?uploadType=media",{
        method:"PATCH",
        headers:{Authorization:"Bearer "+accessToken,"Content-Type":"text/markdown"},
        body:content
      });
      if(!pr2.ok)throw new Error("HTTP "+pr2.status+" vid uppdatering av hittad fil");
      if(saveFn)saveFn();
      return;
    }

    var form=new FormData();
    form.append("metadata",new Blob([JSON.stringify({name:filename,parents:[folderId],mimeType:"text/markdown"})],{type:"application/json"}));
    form.append("file",new Blob([content],{type:"text/markdown"}));
    var cr=await fetch(DRIVE_UPLOAD+"?uploadType=multipart&fields=id",{method:"POST",headers:{Authorization:"Bearer "+accessToken},body:form});
    if(!cr.ok)throw new Error("HTTP "+cr.status+" vid skapande av ny fil");
    var cd=await cr.json();
    if(!cd.id)throw new Error("Drive returnerade inget fil-id vid skapande");
    entry.obsidianFileId=cd.id;
    entry.obsidianFilename=filename;
    if(saveFn)saveFn();
  }catch(e){
    showNoteringDriveError("Kunde inte synka \""+(entry.rubrik||(entry.text||"").slice(0,20))+"\" till Obsidian",e);
  }
}

function showNoteringToastLong(text){
  var el=document.createElement("div");
  el.style.cssText="position:fixed;bottom:16px;left:16px;right:16px;max-width:420px;margin:0 auto;background:#2e2515;border:1px solid #d9b34a;color:#d9b34a;padding:10px 14px;border-radius:10px;font-size:12px;z-index:10001;text-align:center";
  el.textContent=text;
  document.body.appendChild(el);
  setTimeout(function(){el.remove();},6000);
}

// Manuellt triggad export (knapp i ⚙️-panelen) - går igenom ALLA poster, en i taget, och
// rapporterar tydligt hur många som faktiskt fick en fil i Obsidian efteråt. Ingen tyst
// bakgrundskörning - du ser direkt om det fungerade eller inte.
async function exportAllToObsidian(){
  if(!accessToken){showNoteringDriveError("Kunde inte exportera","Inte inloggad mot Drive");return;}
  var total=anteckningHist.length+fundHist.length;
  if(!total){showNoteringToastLong("Inga poster att exportera än.");return;}
  for(var i=0;i<anteckningHist.length;i++)await syncEntryToObsidian(anteckningHist[i],"anteckning",null);
  for(var j=0;j<fundHist.length;j++)await syncEntryToObsidian(fundHist[j],"fundering",null);
  saveNoteringAnteckning();
  saveNoteringFundering();
  var done=anteckningHist.filter(function(e){return e.obsidianFileId;}).length
    +fundHist.filter(function(e){return e.obsidianFileId;}).length;
  showNoteringToastLong(done===total?("✅ Klart: "+done+"/"+total+" poster skrivna till Obsidian."):("⚠️ "+done+"/"+total+" poster skrivna - se felruta för resten."));
  renderLogFunderingar();
}

function ensureNoteringSettingsLoaded(){
  if(!accessToken)return Promise.resolve();
  if(noteringSettingsLoadPromise)return noteringSettingsLoadPromise;
  noteringSettingsLoadPromise=(async function(){
    try{
      var data=await driveReadJson(["Notering"],"settings.json");
      if(data){
        if(data.fundCatPresets&&data.fundCatPresets.length)FUND_CAT_PRESETS=data.fundCatPresets;
        if(data.anteckningCatPresets&&data.anteckningCatPresets.length)ANTECKNING_CAT_PRESETS=data.anteckningCatPresets;
        if(data.anteckningSubcatByCat)ANTECKNING_SUBCAT_BY_CAT=data.anteckningSubcatByCat;
      }
      if(document.getElementById("body")&&view==="funderingar")renderLogFunderingar();
    }catch(e){
      noteringSettingsLoadPromise=null; // tillåt nytt försök nästa gång fliken öppnas
      showNoteringDriveError("Kunde inte läsa Notering-inställningar",e);
    }
  })();
  return noteringSettingsLoadPromise;
}

async function saveNoteringSettings(){
  if(!accessToken){showNoteringDriveError("Kunde inte spara","Inte inloggad");return;}
  try{
    await driveWriteJson(["Notering"],"settings.json",{
      fundCatPresets:FUND_CAT_PRESETS,
      anteckningCatPresets:ANTECKNING_CAT_PRESETS,
      anteckningSubcatByCat:ANTECKNING_SUBCAT_BY_CAT
    });
  }catch(e){
    showNoteringDriveError("Kunde inte spara Notering-inställningar",e);
  }
}

// ---- Emoji-väljare för Notering (samma mönster som Aktivitets openEmojiPicker, men en egen,
// fristående kopia - rör inte core.js's downloadEmojiRef eller Aktivitets AKTIVITET_EMOJI_GROUPS) ----
var NOTERING_EMOJI_GROUPS=[
  ["Ansikten & känslor","😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫡 🫢 🫣 🤭 🫠 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 💫 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 😈 👿"],
  ["Händer & kropp","👋 🤚 🖐 ✋ 🖖 🫱 🫲 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 💪 🦾 🫀 🧠 👀 👁 👄 👅 🦷"],
  ["Sport & aktivitet","⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🥏 🎱 🏓 🏸 🏒 🏑 🥍 🏏 🥅 ⛳ 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🎿 ⛷ 🏂 🪂 🏋️ 🤸 ⛹️ 🤺 🤾 🏌️ 🏇 🧘 🏄 🚣 🧗 🚴 🚵 🏊 🤽 🤹 🏆 🥇 🥈 🥉 🎯 🎮 🕹 🎨 🎵 🎬 📚 ✍️ 🎧 🎤"],
  ["Mat & dryck","🍎 🍊 🍋 🍇 🍓 🫐 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶 🧄 🧅 🥔 🌽 🥕 🥗 🍔 🍟 🌭 🍕 🥪 🥙 🌮 🌯 🫔 🍱 🍣 🍜 🍝 🍛 🍚 🥟 🍦 🍧 🍨 🍩 🍪 🎂 🍰 🧁 🥧 🍫 🍬 🍭 🍯 ☕ 🍵 🧋 🥤 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧃"],
  ["Resor & platser","🚗 🚕 🚙 🚌 🏎 🚓 🚑 🚒 🛻 🚚 🚛 🚜 🛵 🏍 🚲 🛴 🚁 🛸 🚀 ✈️ 🚂 ⛵ 🛶 🚤 🛳 🚢 ⚓ 🏠 🏡 🏢 🏥 🏦 🏨 🏪 🏫 🏬 🏭 🏯 🏰 ⛪ 🕌 🗼 🗽 🌁 🌃 🌄 🌅 🌆 🌇 🌉 🎪 ⛺ 🏕"],
  ["Natur","🌲 🌳 🌴 🪵 🌱 🌿 ☘️ 🍀 🍃 🍂 🍁 🍄 🌾 💐 🌷 🌹 🥀 🌺 🌸 🌼 🌻 🌞 🌝 🌛 🌜 🌚 🌕 🌙 🌟 ⭐ 🌠 ☁️ ⛅ ⛈ 🌤 🌧 🌨 🌩 🌪 🌫 🌬 🌀 🌈 ❄️ ⛄ ☃️ 💧 💦 🌊 🔥 🌋"],
  ["Djur","🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐴 🦄 🐝 🦋 🐌 🐞 🐢 🐍 🦎 🐙 🦑 🦐 🦀 🐡 🐠 🐟 🐬 🐳 🦈 🐊 🐘 🦛 🦒 🦘 🐕 🐈 🦜 🦢 🕊 🦔 🐇 🦝 🦦 🦥"],
  ["Vardag & objekt","🏠 💼 💻 📱 🛏 🧹 🧺 🧴 🛒 🔧 🔨 ⚙️ 💡 🔦 📷 🎁 🕒 ⏰ 💰 💳 📈 📉 📊 📌 📎 ✂️ 🔒 🔑 📚 📖 📝 ✏️ 🖊 📐 🧮 🔬 🔭 💉 💊 🩹 🚪 🛋 🚿 🛁 🧼 🧻 🏺 ✨ 🎉 🎊"]
];
function openNoteringEmojiPicker(onSelect){
  var ov=document.createElement("div");
  ov.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:10002;display:flex;align-items:center;justify-content:center;padding:24px 16px";
  ov.innerHTML="<div style='background:#161616;border-radius:20px;width:100%;max-width:460px;max-height:75vh;display:flex;flex-direction:column'>"
    +"<div style='padding:14px 18px;border-bottom:1px solid #2a2a2a;display:flex;align-items:center;justify-content:space-between;flex-shrink:0'>"
    +"<div style='font-size:15px;font-weight:600;color:#f2f2f2'>Välj emoji</div>"
    +"<button id='nep-close' style='background:none;border:none;color:#5c5c5c;font-size:20px;cursor:pointer;line-height:1'>✕</button>"
    +"</div>"
    +"<div style='padding:14px 18px;overflow-y:auto'>"
    +NOTERING_EMOJI_GROUPS.map(function(g){
      return "<div style='font-size:11px;color:#5c5c5c;font-weight:600;margin:10px 0 6px;text-transform:uppercase;letter-spacing:.5px'>"+g[0]+"</div>"
        +"<div style='display:flex;flex-wrap:wrap;gap:4px'>"
        +g[1].split(" ").map(function(e){
          return "<button data-notering-emoji-pick='"+e+"' style='background:none;border:none;font-size:24px;padding:5px;border-radius:8px;cursor:pointer;line-height:1'>"+e+"</button>";
        }).join("")
        +"</div>";
    }).join("")
    +"</div>"
    +"</div>";
  document.body.appendChild(ov);
  ov.querySelector("#nep-close").onclick=function(){ov.remove();};
  ov.addEventListener("mousedown",function(e){if(e.target===ov)ov.remove();});
  ov.querySelectorAll("[data-notering-emoji-pick]").forEach(function(btn){
    btn.onclick=function(){
      if(onSelect)onSelect(btn.dataset.noteringEmojiPick);
      ov.remove();
    };
  });
}

function fundRow(f,prefix){
  return "<div class='entry'>"
    +"<div style='flex:1'>"
    +(f.category?"<div style='font-size:11px;color:#5c5c5c;margin-bottom:4px;padding-bottom:4px;border-bottom:1px solid #2a2a2a'>"+esc(f.category)+"</div>":"")
    +"<div style='white-space:pre-wrap;font-weight:400;line-height:1.45;font-size:13px;color:#cfcfcf'>"+esc(f.text)+"</div>"
    +"<div class='etime'>"+fd(f.timestamp)+"</div>"
    +"</div>"
    +(f.obsidianFileId&&f.obsidianFilename?"<button class='delbtn' data-openobsidianfundlog='"+f.id+"' title='Öppna i Obsidian' style='color:#5c5c5c;font-size:14px;padding:2px 6px'>🔗</button>":"")
    +"<button class='delbtn' data-pinfundlog='"+f.id+"' title='"+(f.pinned?"Ta bort pin":"Pinna")+"' style='color:"+(f.pinned?"#4fa8ff":"#5c5c5c")+";font-size:14px;padding:2px 6px'>📌</button>"
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

function anteckningRow(f,prefix){
  var subs=f.subcategories||(f.subcategory?[f.subcategory]:[]);
  var catText=[f.category,subs.join(", ")].filter(Boolean).join(" \u00b7 ");
  var hasRubrik=!!f.rubrik;
  var catStyle="font-size:11px;color:#5c5c5c;margin-bottom:"+(hasRubrik?"2px":"4px")+(hasRubrik?"":";padding-bottom:4px;border-bottom:1px solid #2a2a2a");
  return "<div class='entry'>"
    +"<div style='flex:1'>"
    +(catText?"<div style='"+catStyle+"'>"+esc(catText)+"</div>":"")
    +(hasRubrik?"<div style='font-size:14px;color:#4fa8ff;font-weight:700;margin-bottom:4px;padding-bottom:4px;border-bottom:1px solid #2a2a2a;letter-spacing:.2px'>"+esc(f.rubrik)+"</div>":"")
    +"<div style='white-space:pre-wrap;font-weight:400;line-height:1.45;font-size:13px;color:#cfcfcf'>"+esc(f.text)+"</div>"
    +"<div class='etime'>"+fd(f.timestamp)+"</div>"
    +"</div>"
    +(f.obsidianFileId&&f.obsidianFilename?"<button class='delbtn' data-openobsidiananteckninglog='"+f.id+"' title='Öppna i Obsidian' style='color:#5c5c5c;font-size:14px;padding:2px 6px'>🔗</button>":"")
    +"<button class='delbtn' data-pinanteckninglog='"+f.id+"' title='"+(f.pinned?"Ta bort pin":"Pinna")+"' style='color:"+(f.pinned?"#4fa8ff":"#5c5c5c")+";font-size:14px;padding:2px 6px'>📌</button>"
    +"<button class='delbtn' data-editanteckninglog='"+prefix+":"+f.id+"' style='color:#5c5c5c;font-size:14px;padding:2px 6px'>✏️</button>"
    +"<button class='delbtn' data-delanteckninglog='"+f.id+"'>x</button>"
    +"</div>";
}
function anteckningEditRow(f,prefix){
  var catOpts="<option value=''>Ingen kategori</option>"
    +ANTECKNING_CAT_PRESETS.map(function(cat){return "<option value='"+esc(cat)+"'"+(cat===f.category?" selected":"")+">"+esc(cat)+"</option>";}).join("");
  return "<div class='entry' style='flex-direction:column;gap:10px'>"
    +"<select id='editanteckningcatlog-"+prefix+"-"+f.id+"' style='width:100%;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:9px 10px;cursor:pointer;font-family:inherit'>"+catOpts+"</select>"
    +"<div class='lbl' style='margin:0'>Subkategorier</div>"
    +anteckningSubPickerHtml("editanteckningsub-"+prefix+"-"+f.id)
    +"<input class='inp w100' id='editanteckningrubrik-"+prefix+"-"+f.id+"' placeholder='Rubrik (valfritt)' value='"+esc(f.rubrik||"")+"'/>"
    +"<textarea class='ta' id='editanteckninglog-"+prefix+"-"+f.id+"' style='min-height:90px'>"+esc(f.text)+"</textarea>"
    +"<div style='display:flex;gap:8px'>"
    +"<button class='sec' data-saveanteckninglog='"+prefix+":"+f.id+"' style='flex:1'>Spara</button>"
    +"<button class='sec ghost' data-cancelanteckninglog='"+prefix+":"+f.id+"' style='flex:1'>Avbryt</button>"
    +"</div></div>";
}


function renderLogFunderingar(){
  var c=document.getElementById("body");
  // Körs i tur och ordning (inte parallellt) - båda måste hitta/skapa samma "Notering"-mapp i
  // Drive, och två samtidiga mapp-uppslag riskerar att skapa mappen dubbelt (se felrapport om
  // "settings.json" + "settings (1).json"). Grundfixen ligger i core.js, detta minskar risken
  // från Noterings sida i väntan på den.
  ensureNoteringSettingsLoaded().then(function(){return ensureNoteringDataLoaded();});
  var hideTopButtons=notisbokActive||obsidianFilesViewActive;
  var subTabs="<div style='display:flex;gap:6px;align-items:stretch;margin-bottom:6px'>"
    +"<div style='flex:1;display:grid;grid-template-columns:1fr 1fr;gap:6px'>"
    +"<button class='mode-btn"+(funderingarSubview==="anteckning"?" on":"")+"' data-fundsub='anteckning' style='font-size:12px'>Anteckning</button>"
    +"<button class='mode-btn"+(funderingarSubview==="fundering"?" on":"")+"' data-fundsub='fundering' style='font-size:12px'>Fundering</button>"
    +"</div>"
    +"<button id='notering-open-obsidian-btn' type='button' title='Öppna Obsidian' style='background:none;border:none;cursor:pointer;padding:4px 6px;line-height:1;flex-shrink:0;display:flex;align-items:center'><img src='"+OBSIDIAN_ICON_DATA_URI+"' style='width:20px;height:20px;display:block' alt='Obsidian'/></button>"
    +"<button id='notering-settings-btn' type='button' title='Inställningar' style='background:none;border:none;color:#6b6880;font-size:20px;cursor:pointer;padding:4px 6px;line-height:1;flex-shrink:0'>⚙️</button>"
    +"</div>"
    +(hideTopButtons?"":"<button class='sec ghost' id='notering-notisbok-btn' type='button' style='width:100%;margin-bottom:14px'>📓 Notisbok</button>");
  c.innerHTML=subTabs+"<div id='fundering-content'></div>";
  c.querySelectorAll("[data-fundsub]").forEach(function(btn){
    btn.onclick=function(){funderingarSubview=btn.dataset.fundsub;fundVisibleCount=NOTERING_PAGE_SIZE;anteckningVisibleCount=NOTERING_PAGE_SIZE;renderLogFunderingar();};
  });
  var settingsBtn=c.querySelector("#notering-settings-btn");
  if(settingsBtn)settingsBtn.onclick=async function(){
    settingsBtn.disabled=true;settingsBtn.style.opacity="0.5";
    await ensureNoteringSettingsLoaded(); // säkerställ att kategorierna hunnit laddas innan panelen öppnas
    settingsBtn.disabled=false;settingsBtn.style.opacity="1";
    showNoteringSettings();
  };
  var notisbokBtn=c.querySelector("#notering-notisbok-btn");
  if(notisbokBtn)notisbokBtn.onclick=function(){
    notisbokActive=true;
    renderLogFunderingar();
  };
  var openObsidianBtn=c.querySelector("#notering-open-obsidian-btn");
  if(openObsidianBtn)openObsidianBtn.onclick=function(){
    window.open("obsidian://open?vault="+encodeURIComponent(OBSIDIAN_VAULT_NAME));
  };
  if(obsidianFilesViewActive){
    renderObsidianFilesPage();
  }else if(funderingarSubview==="anteckning"){
    if(notisbokActive)renderAnteckningNotisbok();
    else renderAnteckning();
  }else{
    if(notisbokActive)renderFunderingNotisbok();
    else renderFunderingHome();
  }
}

function renderFunderingHome(){
  var c=document.getElementById("fundering-content");
  if(!c)return;

  var catOptions="<option value=''>Ingen kategori</option>"
    +FUND_CAT_PRESETS.map(function(cat){return "<option value='"+esc(cat)+"'"+(cat===fundCatSelect?" selected":"")+">"+esc(cat)+"</option>";}).join("");

  var sortedFund=fundHist.slice().sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);});
  function fundRowsHtml(items){
    return items.length?items.map(function(f){
      return editingFundKeyLog==="latest:"+f.id?fundEditRow(f,"latest"):fundRow(f,"latest");
    }).join(""):"<div style='font-size:13px;color:#5c5c5c;margin-top:10px;text-align:center'>Inga funderingar annu.</div>";
  }

  c.innerHTML="<div style='font-size:13px;color:#5c5c5c;margin-bottom:16px;line-height:1.5'>Skriv ner tankar, ideer eller funderingar - en enkel dagbok bara for dig.</div>"
    +"<div class='lbl'>Kategori</div>"
    +"<select id='fundcat-select' style='width:100%;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:14px;padding:10px 12px;cursor:pointer;font-family:inherit;margin-bottom:10px'>"+catOptions+"</select>"
    +"<textarea class='ta' id='fundin' placeholder='Vad funderar du pa?'>"+esc(fundDraft)+"</textarea>"
    +"<button class='sec' id='fundadd' style='width:100%'>Spara fundering</button>"
    +"<div class='mt20'><div class='lbl'>Senaste inlägg</div><div id='fund-latest-list'>"+fundRowsHtml(sortedFund.slice(0,fundVisibleCount))+"</div></div>";

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
    fundDraft="";saveNoteringFundering();syncEntryToObsidian(entry,"fundering",saveNoteringFundering);renderLogFunderingar();
  };

  function bindFundRowActions(){
    c.querySelectorAll("[data-openobsidianfundlog]").forEach(function(btn){
      btn.onclick=function(){
        var f=fundHist.find(function(x){return x.id===Number(btn.dataset.openobsidianfundlog);});
        var uri=f?obsidianUriFor(f,"fundering"):null;
        if(uri)window.open(uri);
      };
    });
    c.querySelectorAll("[data-pinfundlog]").forEach(function(btn){
      btn.onclick=function(){
        var f=fundHist.find(function(x){return x.id===Number(btn.dataset.pinfundlog);});
        if(f){
          f.pinned=!f.pinned;
          saveNoteringFundering();
          showNoteringToast(f.pinned?"📌 Pinnad":"Pin borttagen");
        }
        renderLogFunderingar();
      };
    });
    c.querySelectorAll("[data-delfundlog]").forEach(function(btn){
      btn.onclick=function(){
        fundHist=fundHist.filter(function(f){return f.id!==Number(btn.dataset.delfundlog);});
        editingFundKeyLog=null;saveNoteringFundering();renderLogFunderingar();
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
        var catSel2=c.querySelector("#editfundcatlog-"+prefix+"-"+fid);
        if(f&&inp&&inp.value.trim())f.text=inp.value.trim();
        if(f&&catSel2)f.category=catSel2.value||undefined;
        editingFundKeyLog=null;saveNoteringFundering();if(f)syncEntryToObsidian(f,"fundering",saveNoteringFundering);renderLogFunderingar();
      };
    });
    c.querySelectorAll("[data-cancelfundlog]").forEach(function(btn){
      btn.onclick=function(){editingFundKeyLog=null;renderLogFunderingar();};
    });
  }
  bindFundRowActions();

  bindNoteringInfiniteScroll(function(){
    var listEl=document.getElementById("fund-latest-list");
    if(!listEl||fundVisibleCount>=sortedFund.length)return false;
    var nextItems=sortedFund.slice(fundVisibleCount,fundVisibleCount+NOTERING_PAGE_SIZE);
    fundVisibleCount+=NOTERING_PAGE_SIZE;
    listEl.insertAdjacentHTML("beforeend",fundRowsHtml(nextItems));
    bindFundRowActions();
    return fundVisibleCount<sortedFund.length;
  });
}

// ---- Notisbok (Fundering): "Läs funderingar per kategori", flyttad hit bakom Notisbok-knappen ----
// ---- "Alla filer": lista alla .md-filer i hela OneNote-mappen (inte bara appens egna) ----
// ---- "Obsibok": lista alla .md-filer i hela OneNote-mappen, med samma
// kategori/subkategori/sök-navigering som Notisbok. Här räknas den FÖRSTA mappnivån under
// OneNote (t.ex. "Minnesbank", "Volvo") som kategori, och alla mappnivåer DÄREFTER (t.ex.
// "Anteckning"/"Arbete") som subkategorier - filtrerbara precis som i Notisbok.
// ---- "Obsibok": lista Fundering/Anteckning-anteckningarna som redan skapats i Obsidian-
// valvet (Minnesbank), med samma sök/mapp-navigering som Notisbok. Bara mappar och filnamn
// visas/filtreras - ingen filläsning behövs, klick öppnar posten direkt i Obsidian.
// ---- "Obsibok": lista alla .md-filer i hela OneNote-mappen, med samma
// kategori/mapp/sök-navigering som Notisbok. Första mappnivån under OneNote (t.ex.
// "Minnesbank", "Volvo") räknas som kategori, alla mappnivåer DÄREFTER (t.ex.
// "Anteckning"/"Arbete") räknas som mappar att filtrera/exkludera på.
// ---- "Obsibok": bläddra i OneNote-mappen precis som i en filhanterare - mapp för mapp,
// ren läsning av Drive. Ingen förhandsskanning, inga kategorier/filter - bara navigera in i
// mappar och öppna .md-filer där de faktiskt ligger.
// Söker igenom HELA OneNote-mappen (inte bara den man står i) efter .md-filer - körs bara
// när man faktiskt skrivit något i sökrutan, aldrig automatiskt. Matchar BÅDE filnamn och
// mappnamn: matchar en mapps eget namn (t.ex. "Volvo GAVS" vid sökning på "gavs") räknas
// ALLA filer i den mappen och dess undermappar som träffar, oavsett deras egna filnamn -
// "inheritedMatch" ärvs nedåt i rekursionen så hela den mappen visas.
// allSettled - en mapp som strular under sökningen hoppas bara över, dödar inte hela den.
async function searchMarkdownFilesRecursive(folderId,pathPrefix,query,inheritedMatch){
  var children;
  try{
    children=await listMarkdownFolderChildren(folderId,pathPrefix);
  }catch(e){
    console.error("Kunde inte söka i mappen",pathPrefix,e);
    return [];
  }
  var folders=children.filter(function(f){return f.mimeType==="application/vnd.google-apps.folder";});
  var files=children.filter(function(f){return f.mimeType!=="application/vnd.google-apps.folder"&&/\.md$/i.test(f.name);});
  var matches=files.filter(function(f){return inheritedMatch||f.name.toLowerCase().indexOf(query)>=0;})
    .map(function(f){return {id:f.id,name:f.name,path:pathPrefix+f.name,modifiedTime:f.modifiedTime};});

  var subResultsSettled=await Promise.allSettled(folders.map(function(f){
    var subMatch=inheritedMatch||f.name.toLowerCase().indexOf(query)>=0;
    return searchMarkdownFilesRecursive(f.id,pathPrefix+f.name+"/",query,subMatch);
  }));
  subResultsSettled.forEach(function(res){
    if(res.status==="fulfilled")matches=matches.concat(res.value);
  });
  return matches;
}

async function renderObsidianFilesPage(){
  var c=document.getElementById("fundering-content");
  if(!c)return;
  if(!obsidianFolderStack||!obsidianFolderStack.length){
    obsidianFolderStack=[{id:OBSIDIAN_ONENOTE_FOLDER_ID,name:"OneNote"}];
  }
  var current=obsidianFolderStack[obsidianFolderStack.length-1];

  c.innerHTML="<button class='sec ghost' id='obsidianfiles-back' type='button' style='margin-bottom:14px'>← Tillbaka</button>"
    +"<div class='lbl'>Obsibok</div>"
    +"<div id='obsidianfiles-breadcrumb' style='font-size:12px;margin-bottom:10px;display:flex;flex-wrap:wrap;gap:2px'></div>"
    +"<input class='inp w100' id='obsidianfiles-search' placeholder='Sök bland alla filer...' style='margin-bottom:10px'/>"
    +"<div id='obsidianfiles-list' style='font-size:13px;color:#5c5c5c;text-align:center;margin-top:14px'>Laddar...</div>";

  c.querySelector("#obsidianfiles-back").onclick=function(){
    obsidianFilesViewActive=false;
    obsidianFolderStack=null; // nollställ - nästa öppning börjar om från OneNote-roten
    renderLogFunderingar();
  };

  var crumbEl=c.querySelector("#obsidianfiles-breadcrumb");
  crumbEl.innerHTML=obsidianFolderStack.map(function(f,i){
    var isLast=i===obsidianFolderStack.length-1;
    return "<span data-obsidiancrumb='"+i+"' style='cursor:"+(isLast?"default":"pointer")+";color:"+(isLast?"#f2f2f2":"#4fa8ff")+"'>"+esc(f.name)+"</span>"
      +(isLast?"":"<span style='color:#5c5c5c'>&nbsp;/&nbsp;</span>");
  }).join("");
  crumbEl.querySelectorAll("[data-obsidiancrumb]").forEach(function(el){
    el.onclick=function(){
      var idx=Number(el.dataset.obsidiancrumb);
      if(idx===obsidianFolderStack.length-1)return;
      obsidianFolderStack=obsidianFolderStack.slice(0,idx+1);
      renderObsidianFilesPage();
    };
  });

  var listEl=c.querySelector("#obsidianfiles-list");
  var searchInp=c.querySelector("#obsidianfiles-search");
  if(!accessToken){
    if(listEl)listEl.textContent="Logga in för att se filerna.";
    return;
  }

  var children;
  try{
    children=await listMarkdownFolderChildren(current.id,"");
  }catch(e){
    showNoteringDriveError("Kunde inte lista mappen \""+current.name+"\"",e);
    listEl=document.getElementById("obsidianfiles-list");
    if(listEl)listEl.textContent="Kunde inte hämta mappens innehåll.";
    return;
  }

  listEl=document.getElementById("obsidianfiles-list");
  searchInp=document.getElementById("obsidianfiles-search");
  if(!listEl||!searchInp)return; // användaren har navigerat bort under tiden

  var allFolders=children.filter(function(f){return f.mimeType==="application/vnd.google-apps.folder";})
    .sort(function(a,b){return a.name.localeCompare(b.name,"sv");});
  var allFiles=children.filter(function(f){return f.mimeType!=="application/vnd.google-apps.folder"&&/\.md$/i.test(f.name);})
    .sort(function(a,b){return a.name.localeCompare(b.name,"sv");});

  function bindOpenFolder(el){
    el.onclick=function(){
      obsidianFolderStack.push({id:el.dataset.obsidianopenfolder,name:el.dataset.obsidianfoldername});
      renderObsidianFilesPage();
    };
  }
  function bindOpenFile(el){
    el.onclick=function(){
      window.open(obsidianUriForOneNotePath(el.dataset.obsidianopenpath));
    };
  }

  // Visar innehållet i DEN MAPP man står i just nu (normalläge, tom sökruta).
  function renderCurrentFolder(){
    if(!allFolders.length&&!allFiles.length){
      listEl.style.textAlign="center";
      listEl.style.color="#5c5c5c";
      listEl.textContent="Mappen är tom.";
      return;
    }
    listEl.style.textAlign="left";
    listEl.style.color="";
    listEl.innerHTML=allFolders.map(function(f){
      return "<div class='entry' data-obsidianopenfolder='"+esc(f.id)+"' data-obsidianfoldername='"+esc(f.name)+"' style='cursor:pointer'>"
        +"<div style='flex:1;display:flex;align-items:center;gap:8px'>"
        +"<span style='font-size:15px'>📁</span>"
        +"<span style='font-size:13px;color:#cfcfcf'>"+esc(f.name)+"</span>"
        +"</div>"
        +"<span style='color:#5c5c5c;font-size:14px'>\u203a</span>"
        +"</div>";
    }).join("")
    +allFiles.map(function(f){
      var relPath=obsidianFolderStack.slice(1).map(function(x){return x.name;}).concat([f.name]).join("/");
      return "<div class='entry' data-obsidianopenfile data-obsidianopenpath='"+esc(relPath)+"' style='cursor:pointer'>"
        +"<div style='flex:1;display:flex;align-items:center;gap:8px'>"
        +"<span style='font-size:15px'>📝</span>"
        +"<span style='font-size:13px;color:#cfcfcf'>"+esc(f.name.replace(/\.md$/i,""))+"</span>"
        +"</div>"
        +"<span style='color:#5c5c5c;font-size:14px'>🔗</span>"
        +"</div>";
    }).join("");
    listEl.querySelectorAll("[data-obsidianopenfolder]").forEach(bindOpenFolder);
    listEl.querySelectorAll("[data-obsidianopenfile]").forEach(bindOpenFile);
  }

  // Söker i HELA OneNote-mappen (alla mappar, inte bara den nuvarande) - visar resultat
  // med full sökväg eftersom träffarna kan komma från vilken mapp som helst.
  var searchDebounceTimer=null;
  function runGlobalSearch(query){
    listEl.style.textAlign="center";
    listEl.style.color="#5c5c5c";
    listEl.textContent="Söker...";
    searchMarkdownFilesRecursive(OBSIDIAN_ONENOTE_FOLDER_ID,"",query,false).then(function(results){
      var freshListEl=document.getElementById("obsidianfiles-list");
      if(!freshListEl||searchInp.value.trim().toLowerCase()!==query)return; // ny sökning/navigation hann ske under tiden
      if(!results.length){
        freshListEl.style.textAlign="center";
        freshListEl.style.color="#5c5c5c";
        freshListEl.textContent="Inga träffar.";
        return;
      }
      results.sort(function(a,b){return a.name.localeCompare(b.name,"sv");});
      freshListEl.style.textAlign="left";
      freshListEl.style.color="";
      freshListEl.innerHTML=results.map(function(f){
        var folderPath=f.path.slice(0,f.path.length-f.name.length-1);
        return "<div class='entry' data-obsidianopenfile data-obsidianopenpath='"+esc(f.path)+"' style='cursor:pointer'>"
          +"<div style='flex:1'>"
          +(folderPath?"<div style='font-size:11px;color:#5c5c5c;margin-bottom:2px'>"+esc(folderPath)+"</div>":"")
          +"<div style='font-size:13px;color:#cfcfcf'>"+esc(f.name.replace(/\.md$/i,""))+"</div>"
          +"</div>"
          +"<span style='color:#5c5c5c;font-size:14px'>🔗</span>"
          +"</div>";
      }).join("");
      freshListEl.querySelectorAll("[data-obsidianopenfile]").forEach(bindOpenFile);
    }).catch(function(e){
      showNoteringDriveError("Kunde inte söka bland Obsidian-filerna",e);
    });
  }

  searchInp.oninput=function(){
    clearTimeout(searchDebounceTimer);
    var q=searchInp.value.trim().toLowerCase();
    if(!q){renderCurrentFolder();return;}
    searchDebounceTimer=setTimeout(function(){runGlobalSearch(q);},400);
  };

  renderCurrentFolder();
}

function renderFunderingNotisbok(){
  var c=document.getElementById("fundering-content");
  if(!c)return;

  var readCatOptions="<option value=''>Välj kategori</option>"
    +"<option value='__all__'"+(fundReadCat==="__all__"?" selected":"")+">Visa Alla</option>"
    +FUND_CAT_PRESETS.map(function(cat){return "<option value='"+esc(cat)+"'"+(cat===fundReadCat?" selected":"")+">"+esc(cat)+"</option>";}).join("");

  var readSection="";
  if(fundReadActive&&fundReadCat){
    var catFund=fundReadCat==="__all__"?fundHist.slice():fundHist.filter(function(f){return f.category===fundReadCat;});
    var readHeaderLabel=fundReadCat==="__all__"?"Alla funderingar":fundReadCat;
    readSection="<div class='mt20'><div class='lbl'>"+esc(readHeaderLabel)+" ("+catFund.length+")</div>"
      +(catFund.length?catFund.map(function(f){
        return editingFundKeyLog==="read:"+f.id?fundEditRow(f,"read"):fundRow(f,"read");
      }).join(""):"<div style='font-size:13px;color:#5c5c5c;margin-top:10px;text-align:center'>Inga funderingar i denna kategori annu.</div>")
      +"</div>";
  }

  // Pinnade funderingar visas bara i utgångsläget - försvinner så fort en kategori läses (fundReadActive).
  var pinnedSection="";
  if(!fundReadActive){
    var pinnedFund=fundHist.filter(function(f){return f.pinned;});
    pinnedFund.sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);});
    if(pinnedFund.length){
      pinnedSection="<div class='mt20'><div class='lbl'>📌 Pinnade</div>"
        +pinnedFund.map(function(f){
          return editingFundKeyLog==="pinned:"+f.id?fundEditRow(f,"pinned"):fundRow(f,"pinned");
        }).join("")
        +"</div>";
    }
  }

  c.innerHTML="<button class='sec ghost' id='fundnotisbok-back' type='button' style='margin-bottom:14px'>← Tillbaka</button>"
    +"<div class='lbl'>Läs funderingar per kategori</div>"
    +"<div style='display:flex;gap:8px'>"
    +"<select id='fundread-select' style='flex:1;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:0 10px;cursor:pointer;font-family:inherit'>"+readCatOptions+"</select>"
    +"<button id='fundread-btn' class='sec ghost' style='padding:0 18px'>Läs</button>"
    +"</div>"
    +pinnedSection
    +readSection;

  c.querySelector("#fundnotisbok-back").onclick=function(){notisbokActive=false;renderLogFunderingar();};

  var readSel=c.querySelector("#fundread-select");
  if(readSel)readSel.onchange=function(){fundReadCat=readSel.value;};
  c.querySelector("#fundread-btn").onclick=function(){
    if(!c.querySelector("#fundread-select").value){alert("Välj en kategori först.");return;}
    fundReadCat=c.querySelector("#fundread-select").value;
    fundReadActive=true;renderLogFunderingar();
  };

  c.querySelectorAll("[data-openobsidianfundlog]").forEach(function(btn){
    btn.onclick=function(){
      var f=fundHist.find(function(x){return x.id===Number(btn.dataset.openobsidianfundlog);});
      var uri=f?obsidianUriFor(f,"fundering"):null;
      if(uri)window.open(uri);
    };
  });
  c.querySelectorAll("[data-pinfundlog]").forEach(function(btn){
    btn.onclick=function(){
      var f=fundHist.find(function(x){return x.id===Number(btn.dataset.pinfundlog);});
      if(f){
        f.pinned=!f.pinned;
        saveNoteringFundering();
        showNoteringToast(f.pinned?"📌 Pinnad":"Pin borttagen");
      }
      renderLogFunderingar();
    };
  });
  c.querySelectorAll("[data-delfundlog]").forEach(function(btn){
    btn.onclick=function(){
      fundHist=fundHist.filter(function(f){return f.id!==Number(btn.dataset.delfundlog);});
      editingFundKeyLog=null;saveNoteringFundering();renderLogFunderingar();
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
      editingFundKeyLog=null;saveNoteringFundering();if(f)syncEntryToObsidian(f,"fundering",saveNoteringFundering);renderLogFunderingar();
    };
  });
  c.querySelectorAll("[data-cancelfundlog]").forEach(function(btn){
    btn.onclick=function(){editingFundKeyLog=null;renderLogFunderingar();};
  });
}

function renderAnteckning(){
  var c=document.getElementById("fundering-content");
  if(!c)return;

  var catOptions="<option value=''>Ingen kategori</option>"
    +ANTECKNING_CAT_PRESETS.map(function(cat){return "<option value='"+esc(cat)+"'"+(cat===anteckningCatSelect?" selected":"")+">"+esc(cat)+"</option>";}).join("");

  var sortedTt=anteckningHist.slice().sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);});
  function anteckningRowsHtml(items){
    return items.length?items.map(function(f){
      return editingAnteckningKeyLog==="latest:"+f.id?anteckningEditRow(f,"latest"):anteckningRow(f,"latest");
    }).join(""):"<div style='font-size:13px;color:#5c5c5c;margin-top:10px;text-align:center'>Inga anteckningar annu.</div>";
  }

  c.innerHTML="<div style='font-size:13px;color:#5c5c5c;margin-bottom:16px;line-height:1.5'>Samla anteckningar - sorterat efter kategori.</div>"
    +"<div class='lbl'>Kategori</div>"
    +"<select id='anteckningcat-select' style='width:100%;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:14px;padding:10px 12px;cursor:pointer;font-family:inherit;margin-bottom:10px'>"+catOptions+"</select>"
    +"<div class='lbl'>Subkategorier (valfritt)</div>"
    +anteckningSubPickerHtml("anteckningsub")
    +"<div class='lbl'>Rubrik (valfritt)</div>"
    +"<input class='inp w100' id='anteckningrubrik' placeholder='Rubrik...' style='margin-bottom:10px' value='"+esc(anteckningRubrikDraft)+"'/>"
    +"<textarea class='ta' id='anteckningin' placeholder='En anteckning...'>"+esc(anteckningDraft)+"</textarea>"
    +"<button class='sec' id='anteckningadd' style='width:100%'>Spara anteckning</button>"
    +"<div class='mt20'><div class='lbl'>Senaste inlägg</div><div id='anteckning-latest-list'>"+anteckningRowsHtml(sortedTt.slice(0,anteckningVisibleCount))+"</div></div>";

  var anteckningEditSubPicker=null;

  var catSel=c.querySelector("#anteckningcat-select");
  var anteckningSubSelected=[];
  var anteckningSubPicker=bindAnteckningSubPicker(c,"anteckningsub",function(){return anteckningCatSelect;},anteckningSubSelected);
  if(catSel)catSel.onchange=function(){
    anteckningCatSelect=catSel.value;
    anteckningSubSelected.length=0;
    var chipsEl=c.querySelector("#anteckningsub-chips");
    if(chipsEl)chipsEl.innerHTML="<span style='font-size:12px;color:#5c5c5c'>Inga valda</span>";
    var dd0=c.querySelector("#anteckningsub-dd");
    if(dd0)dd0.style.display="none";
  };

  var ta=c.querySelector("#anteckningin");
  if(ta){
    ta.oninput=function(){anteckningDraft=ta.value;};
    ta.onkeydown=function(e){
      if(e.key==="Enter"&&e.shiftKey){
        e.preventDefault(); // vanlig Enter ska fortfarande bara ge radbrytning i texten
        c.querySelector("#anteckningadd").click();
      }
    };
  }
  var rubrikInp=c.querySelector("#anteckningrubrik");
  if(rubrikInp)rubrikInp.oninput=function(){anteckningRubrikDraft=rubrikInp.value;};

  c.querySelector("#anteckningadd").onclick=function(){
    var txt=c.querySelector("#anteckningin").value.trim();
    if(!txt)return;
    var entry={id:Date.now(),text:txt,timestamp:new Date().toISOString()};
    if(anteckningCatSelect)entry.category=anteckningCatSelect;
    var chosenSubs=anteckningSubPicker.getSelected();
    if(chosenSubs.length)entry.subcategories=chosenSubs;
    var rubrikVal=c.querySelector("#anteckningrubrik").value.trim();
    if(rubrikVal)entry.rubrik=rubrikVal;
    anteckningHist.push(entry);
    anteckningDraft="";anteckningRubrikDraft="";anteckningSubSelected.length=0;saveNoteringAnteckning();syncEntryToObsidian(entry,"anteckning",saveNoteringAnteckning);renderLogFunderingar();
  };

  if(editingAnteckningKeyLog){
    var editParts=editingAnteckningKeyLog.split(":");
    var editPrefix=editParts[0],editFid=Number(editParts[1]);
    var editEntry=anteckningHist.find(function(x){return x.id===editFid;});
    if(editEntry&&editPrefix==="latest"){
      var editIdPrefix="editanteckningsub-"+editPrefix+"-"+editFid;
      var editSelected=(editEntry.subcategories||(editEntry.subcategory?[editEntry.subcategory]:[])).slice();
      var editCatSelEl=c.querySelector("#editanteckningcatlog-"+editPrefix+"-"+editFid);
      anteckningEditSubPicker=bindAnteckningSubPicker(c,editIdPrefix,function(){return editCatSelEl?editCatSelEl.value:editEntry.category;},editSelected);
    }
  }

  function bindAnteckningRowActions(){
    c.querySelectorAll("[data-openobsidiananteckninglog]").forEach(function(btn){
      btn.onclick=function(){
        var f=anteckningHist.find(function(x){return x.id===Number(btn.dataset.openobsidiananteckninglog);});
        var uri=f?obsidianUriFor(f,"anteckning"):null;
        if(uri)window.open(uri);
      };
    });
    c.querySelectorAll("[data-pinanteckninglog]").forEach(function(btn){
      btn.onclick=function(){
        var f=anteckningHist.find(function(x){return x.id===Number(btn.dataset.pinanteckninglog);});
        if(f){
          f.pinned=!f.pinned;
          saveNoteringAnteckning();
          showNoteringToast(f.pinned?"📌 Pinnad":"Pin borttagen");
        }
        renderLogFunderingar();
      };
    });
    c.querySelectorAll("[data-delanteckninglog]").forEach(function(btn){
      btn.onclick=function(){
        confirmDelete("Vill du ta bort anteckningen?",function(){
          anteckningHist=anteckningHist.filter(function(f){return f.id!==Number(btn.dataset.delanteckninglog);});
          editingAnteckningKeyLog=null;saveNoteringAnteckning();renderLogFunderingar();
        });
      };
    });
    c.querySelectorAll("[data-editanteckninglog]").forEach(function(btn){
      btn.onclick=function(){editingAnteckningKeyLog=btn.dataset.editanteckninglog;renderLogFunderingar();};
    });
    c.querySelectorAll("[data-saveanteckninglog]").forEach(function(btn){
      btn.onclick=function(){
        var parts=btn.dataset.saveanteckninglog.split(":");
        var prefix=parts[0],fid=Number(parts[1]);
        var f=anteckningHist.find(function(x){return x.id===fid;});
        var inp=c.querySelector("#editanteckninglog-"+prefix+"-"+fid);
        var catSel2=c.querySelector("#editanteckningcatlog-"+prefix+"-"+fid);
        var rubrikInp2=c.querySelector("#editanteckningrubrik-"+prefix+"-"+fid);
        if(f&&inp&&inp.value.trim())f.text=inp.value.trim();
        if(f&&catSel2)f.category=catSel2.value||undefined;
        if(f&&rubrikInp2)f.rubrik=rubrikInp2.value.trim()||undefined;
        if(f&&anteckningEditSubPicker){
          var subVals2=anteckningEditSubPicker.getSelected();
          f.subcategories=subVals2.length?subVals2:undefined;
          delete f.subcategory;
        }
        editingAnteckningKeyLog=null;saveNoteringAnteckning();if(f)syncEntryToObsidian(f,"anteckning",saveNoteringAnteckning);renderLogFunderingar();
      };
    });
    c.querySelectorAll("[data-cancelanteckninglog]").forEach(function(btn){
      btn.onclick=function(){editingAnteckningKeyLog=null;renderLogFunderingar();};
    });
  }
  bindAnteckningRowActions();

  bindNoteringInfiniteScroll(function(){
    var listEl=document.getElementById("anteckning-latest-list");
    if(!listEl||anteckningVisibleCount>=sortedTt.length)return false;
    var nextItems=sortedTt.slice(anteckningVisibleCount,anteckningVisibleCount+NOTERING_PAGE_SIZE);
    anteckningVisibleCount+=NOTERING_PAGE_SIZE;
    listEl.insertAdjacentHTML("beforeend",anteckningRowsHtml(nextItems));
    bindAnteckningRowActions();
    return anteckningVisibleCount<sortedTt.length;
  });
}

// ---- Notisbok (Anteckning): "Läs anteckningar per kategori", flyttad hit bakom Notisbok-knappen ----
function renderAnteckningNotisbok(){
  var c=document.getElementById("fundering-content");
  if(!c)return;

  var readCatOptions="<option value=''>Välj kategori</option>"
    +ANTECKNING_CAT_PRESETS.map(function(cat){return "<option value='"+esc(cat)+"'"+(cat===anteckningReadCat?" selected":"")+">"+esc(cat)+"</option>";}).join("");
  var readSubOptions="<option value=''>Alla subkategorier</option>"
    +(ANTECKNING_SUBCAT_BY_CAT[anteckningReadCat]||[]).map(function(s){return "<option value='"+esc(s)+"'"+(s===anteckningReadSubcat?" selected":"")+">"+esc(s)+"</option>";}).join("");
  var readExcludeSubOptions="<option value=''>Ingen exkludering</option>"
    +(ANTECKNING_SUBCAT_BY_CAT[anteckningReadCat]||[]).map(function(s){return "<option value='"+esc(s)+"'"+(s===anteckningReadExcludeSubcat?" selected":"")+">"+esc(s)+"</option>";}).join("");

  var readSection="";
  if(anteckningReadActive&&anteckningReadCat){
    var readTitle=anteckningReadCat+(anteckningReadSubcat?" · "+anteckningReadSubcat:"")+(anteckningReadExcludeSubcat?" · exkl. "+anteckningReadExcludeSubcat:"");
    readSection="<div class='mt20'><div class='lbl'>"+esc(readTitle)+"</div>"
      +"<div id='anteckningread-results'></div>"
      +"</div>";
  }

  c.innerHTML="<button class='sec ghost' id='anteckningnotisbok-back' type='button' style='margin-bottom:14px'>← Tillbaka</button>"
    +"<div class='lbl'>Läs anteckningar per kategori</div>"
    +"<div style='display:flex;gap:6px;margin-bottom:10px'>"
    +"<input class='inp w100' id='anteckningread-rubriksearch' placeholder='Sök i rubrik, kategori eller subkategori...' style='flex:1' value='"+esc(anteckningReadRubrikSearch)+"'/>"
    +"<button id='notering-obsibok-btn' type='button' title='Obsibok' style='background:none;border:none;cursor:pointer;padding:4px 6px;line-height:1;flex-shrink:0;display:flex;align-items:center'><img src='"+OBSIDIAN_ICON_DATA_URI+"' style='width:20px;height:20px;display:block' alt='Obsibok'/></button>"
    +"</div>"
    +"<div id='anteckningrubriksearch-results'></div>"
    +"<div id='anteckningpinned-results'></div>"
    +"<div style='display:flex;gap:6px;flex-wrap:wrap;margin-top:10px'>"
    +"<select id='anteckningread-select' style='flex:1 1 90px;min-width:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:12px;padding:0 6px;cursor:pointer;font-family:inherit'>"+readCatOptions+"</select>"
    +"<select id='anteckningread-subselect' style='flex:1 1 90px;min-width:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:12px;padding:0 6px;cursor:pointer;font-family:inherit'>"+readSubOptions+"</select>"
    +"<select id='anteckningread-exclude-subselect' style='flex:1 1 90px;min-width:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:12px;padding:0 6px;cursor:pointer;font-family:inherit'>"+readExcludeSubOptions+"</select>"
    +"</div>"
    +readSection;

  c.querySelector("#anteckningnotisbok-back").onclick=function(){notisbokActive=false;renderLogFunderingar();};
  var obsibokBtn=c.querySelector("#notering-obsibok-btn");
  if(obsibokBtn)obsibokBtn.onclick=function(){obsidianFilesViewActive=true;renderLogFunderingar();};

  var anteckningEditSubPicker=null;

  var readSel=c.querySelector("#anteckningread-select");
  var readSubSel=c.querySelector("#anteckningread-subselect");
  var readExcludeSubSel=c.querySelector("#anteckningread-exclude-subselect");
  if(readSel)readSel.onchange=function(){
    anteckningReadCat=readSel.value;
    anteckningReadSubcat="";
    anteckningReadExcludeSubcat="";
    anteckningReadActive=!!anteckningReadCat;
    renderLogFunderingar();
  };
  if(readSubSel)readSubSel.onchange=function(){anteckningReadSubcat=readSubSel.value;renderTtRubrikSearchResults();renderTtReadResults();};
  if(readExcludeSubSel)readExcludeSubSel.onchange=function(){anteckningReadExcludeSubcat=readExcludeSubSel.value;renderTtRubrikSearchResults();renderTtReadResults();};

  function renderTtReadResults(){
    var resultsEl=document.getElementById("anteckningread-results");
    if(!resultsEl)return;
    var catTt=anteckningHist.filter(function(f){return f.category===anteckningReadCat;});
    if(anteckningReadSubcat)catTt=catTt.filter(function(f){return (f.subcategories||[]).indexOf(anteckningReadSubcat)>=0;});
    if(anteckningReadExcludeSubcat)catTt=catTt.filter(function(f){return (f.subcategories||[]).indexOf(anteckningReadExcludeSubcat)<0;});
    resultsEl.innerHTML=(catTt.length?catTt.map(function(f){
      return editingAnteckningKeyLog==="read:"+f.id?anteckningEditRow(f,"read"):anteckningRow(f,"read");
    }).join(""):"<div style='font-size:13px;color:#5c5c5c;margin-top:10px;text-align:center'>Inga anteckningar i denna kategori annu.</div>");
    bindTtReadResultActions(resultsEl,"read");
  }
  function renderTtRubrikSearchResults(){
    var resultsEl=document.getElementById("anteckningrubriksearch-results");
    if(!resultsEl)return;
    var q=anteckningReadRubrikSearch.trim().toLowerCase();
    if(!q){resultsEl.innerHTML="";return;}
    var matches=anteckningHist.filter(function(f){
      if(anteckningReadCat&&f.category!==anteckningReadCat)return false;
      if(anteckningReadSubcat&&(f.subcategories||[]).indexOf(anteckningReadSubcat)<0)return false;
      if(anteckningReadExcludeSubcat&&(f.subcategories||[]).indexOf(anteckningReadExcludeSubcat)>=0)return false;
      if(f.rubrik&&f.rubrik.toLowerCase().indexOf(q)>=0)return true;
      if(f.category&&f.category.toLowerCase().indexOf(q)>=0)return true;
      if((f.subcategories||[]).some(function(s){return s.toLowerCase().indexOf(q)>=0;}))return true;
      return false;
    });
    matches.sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);});
    resultsEl.innerHTML=matches.length?matches.map(function(f){
      return editingAnteckningKeyLog==="rubriksearch:"+f.id?anteckningEditRow(f,"rubriksearch"):anteckningRow(f,"rubriksearch");
    }).join(""):"<div style='font-size:13px;color:#5c5c5c;margin:6px 0 4px;text-align:center'>Inga träffar.</div>";
    bindTtReadResultActions(resultsEl,"rubriksearch");
  }
  function bindTtReadResultActions(resultsEl,prefix){
    resultsEl.querySelectorAll("[data-openobsidiananteckninglog]").forEach(function(btn){
      btn.onclick=function(){
        var f=anteckningHist.find(function(x){return x.id===Number(btn.dataset.openobsidiananteckninglog);});
        var uri=f?obsidianUriFor(f,"anteckning"):null;
        if(uri)window.open(uri);
      };
    });
    resultsEl.querySelectorAll("[data-pinanteckninglog]").forEach(function(btn){
      btn.onclick=function(){
        var f=anteckningHist.find(function(x){return x.id===Number(btn.dataset.pinanteckninglog);});
        if(f){
          f.pinned=!f.pinned;
          saveNoteringAnteckning();
          showNoteringToast(f.pinned?"📌 Pinnad":"Pin borttagen");
        }
        renderLogFunderingar();
      };
    });
    resultsEl.querySelectorAll("[data-delanteckninglog]").forEach(function(btn){
      btn.onclick=function(){
        confirmDelete("Vill du ta bort anteckningen?",function(){
          anteckningHist=anteckningHist.filter(function(f){return f.id!==Number(btn.dataset.delanteckninglog);});
          editingAnteckningKeyLog=null;saveNoteringAnteckning();renderLogFunderingar();
        });
      };
    });
    resultsEl.querySelectorAll("[data-editanteckninglog]").forEach(function(btn){
      btn.onclick=function(){editingAnteckningKeyLog=btn.dataset.editanteckninglog;renderLogFunderingar();};
    });
    resultsEl.querySelectorAll("[data-cancelanteckninglog]").forEach(function(btn){
      btn.onclick=function(){editingAnteckningKeyLog=null;renderLogFunderingar();};
    });
    resultsEl.querySelectorAll("[data-saveanteckninglog]").forEach(function(btn){
      btn.onclick=function(){
        var parts=btn.dataset.saveanteckninglog.split(":");
        var editPrefix2=parts[0],fid=Number(parts[1]);
        var f=anteckningHist.find(function(x){return x.id===fid;});
        var inp=resultsEl.querySelector("#editanteckninglog-"+editPrefix2+"-"+fid);
        var catSel2=resultsEl.querySelector("#editanteckningcatlog-"+editPrefix2+"-"+fid);
        var rubrikInp2=resultsEl.querySelector("#editanteckningrubrik-"+editPrefix2+"-"+fid);
        if(f&&inp&&inp.value.trim())f.text=inp.value.trim();
        if(f&&catSel2)f.category=catSel2.value||undefined;
        if(f&&rubrikInp2)f.rubrik=rubrikInp2.value.trim()||undefined;
        if(f&&anteckningEditSubPicker){
          var subVals2=anteckningEditSubPicker.getSelected();
          f.subcategories=subVals2.length?subVals2:undefined;
          delete f.subcategory;
        }
        editingAnteckningKeyLog=null;saveNoteringAnteckning();if(f)syncEntryToObsidian(f,"anteckning",saveNoteringAnteckning);renderLogFunderingar();
      };
    });
    if(editingAnteckningKeyLog&&editingAnteckningKeyLog.indexOf(prefix+":")===0){
      var editFid2=Number(editingAnteckningKeyLog.split(":")[1]);
      var editEntry2=anteckningHist.find(function(x){return x.id===editFid2;});
      var editCatSelEl2=resultsEl.querySelector("#editanteckningcatlog-"+prefix+"-"+editFid2);
      if(editEntry2&&editCatSelEl2){
        var editSelected2=(editEntry2.subcategories||(editEntry2.subcategory?[editEntry2.subcategory]:[])).slice();
        anteckningEditSubPicker=bindAnteckningSubPicker(resultsEl,"editanteckningsub-"+prefix+"-"+editFid2,function(){return editCatSelEl2.value;},editSelected2);
      }
    }
  }
  // Pinnade anteckningar visas bara i utgångsläget (ingen sökning, ingen kategori vald) -
  // försvinner så fort man söker eller väljer kategori, per Blås önskemål.
  function renderTtPinnedResults(){
    var resultsEl=document.getElementById("anteckningpinned-results");
    if(!resultsEl)return;
    if(anteckningReadRubrikSearch.trim()||anteckningReadCat){resultsEl.innerHTML="";return;}
    var pinned=anteckningHist.filter(function(f){return f.pinned;});
    pinned.sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);});
    if(!pinned.length){resultsEl.innerHTML="";return;}
    resultsEl.innerHTML="<div class='lbl' style='margin-top:0'>📌 Pinnade</div>"
      +pinned.map(function(f){
        return editingAnteckningKeyLog==="pinned:"+f.id?anteckningEditRow(f,"pinned"):anteckningRow(f,"pinned");
      }).join("");
    bindTtReadResultActions(resultsEl,"pinned");
  }
  var rubrikSearchInp=c.querySelector("#anteckningread-rubriksearch");
  if(rubrikSearchInp)rubrikSearchInp.oninput=function(){
    anteckningReadRubrikSearch=rubrikSearchInp.value;
    renderTtRubrikSearchResults();
    renderTtPinnedResults();
  };
  renderTtRubrikSearchResults();
  renderTtPinnedResults();
  if(anteckningReadActive&&anteckningReadCat)renderTtReadResults();
}
