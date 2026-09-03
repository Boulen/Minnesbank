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
  ensureNoteringSettingsLoaded();
  ensureNoteringDataLoaded();
  var subTabs="<div style='display:flex;gap:6px;align-items:stretch;margin-bottom:6px'>"
    +"<div style='flex:1;display:grid;grid-template-columns:1fr 1fr;gap:6px'>"
    +"<button class='mode-btn"+(funderingarSubview==="anteckning"?" on":"")+"' data-fundsub='anteckning' style='font-size:12px'>Anteckning</button>"
    +"<button class='mode-btn"+(funderingarSubview==="fundering"?" on":"")+"' data-fundsub='fundering' style='font-size:12px'>Fundering</button>"
    +"</div>"
    +"<button id='notering-settings-btn' type='button' title='Inställningar' style='background:none;border:none;color:#6b6880;font-size:20px;cursor:pointer;padding:4px 6px;line-height:1;flex-shrink:0'>⚙️</button>"
    +"</div>"
    +(notisbokActive?"":"<button class='sec ghost' id='notering-notisbok-btn' type='button' style='width:100%;margin-bottom:14px'>📓 Notisbok</button>");
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
  if(funderingarSubview==="anteckning"){
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
    fundDraft="";saveNoteringFundering();renderLogFunderingar();
  };

  function bindFundRowActions(){
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
        editingFundKeyLog=null;saveNoteringFundering();renderLogFunderingar();
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
function renderFunderingNotisbok(){
  var c=document.getElementById("fundering-content");
  if(!c)return;

  var readCatOptions="<option value=''>Välj kategori</option>"
    +FUND_CAT_PRESETS.map(function(cat){return "<option value='"+esc(cat)+"'"+(cat===fundReadCat?" selected":"")+">"+esc(cat)+"</option>";}).join("");

  var readSection="";
  if(fundReadActive&&fundReadCat){
    var catFund=fundHist.filter(function(f){return f.category===fundReadCat;});
    readSection="<div class='mt20'><div class='lbl'>"+esc(fundReadCat)+" ("+catFund.length+")</div>"
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
      editingFundKeyLog=null;saveNoteringFundering();renderLogFunderingar();
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
    anteckningDraft="";anteckningRubrikDraft="";anteckningSubSelected.length=0;saveNoteringAnteckning();renderLogFunderingar();
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
        editingAnteckningKeyLog=null;saveNoteringAnteckning();renderLogFunderingar();
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
    +"<input class='inp w100' id='anteckningread-rubriksearch' placeholder='Sök i rubrik, kategori eller subkategori...' style='margin-bottom:10px' value='"+esc(anteckningReadRubrikSearch)+"'/>"
    +"<div id='anteckningrubriksearch-results'></div>"
    +"<div id='anteckningpinned-results'></div>"
    +"<div style='display:flex;gap:6px;flex-wrap:wrap;margin-top:10px'>"
    +"<select id='anteckningread-select' style='flex:1 1 90px;min-width:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:12px;padding:0 6px;cursor:pointer;font-family:inherit'>"+readCatOptions+"</select>"
    +"<select id='anteckningread-subselect' style='flex:1 1 90px;min-width:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:12px;padding:0 6px;cursor:pointer;font-family:inherit'>"+readSubOptions+"</select>"
    +"<select id='anteckningread-exclude-subselect' style='flex:1 1 90px;min-width:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:12px;padding:0 6px;cursor:pointer;font-family:inherit'>"+readExcludeSubOptions+"</select>"
    +"</div>"
    +readSection;

  c.querySelector("#anteckningnotisbok-back").onclick=function(){notisbokActive=false;renderLogFunderingar();};

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
        editingAnteckningKeyLog=null;saveNoteringAnteckning();renderLogFunderingar();
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
