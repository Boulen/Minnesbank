function renderUtvarderingarTop(){
  var lc=document.getElementById("body");
  if(!lc)return;
  var subTabs="<div style='display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:20px'>"
    +"<button class='mode-btn"+(utvSubview==="media"?" on":"")+"' data-utvsub='media' style='font-size:11px'>Media</button>"
    +"<button class='mode-btn"+(utvSubview==="objekt"?" on":"")+"' data-utvsub='objekt' style='font-size:11px'>Föremål</button>"
    +"<button class='mode-btn"+(utvSubview==="plats"?" on":"")+"' data-utvsub='plats' style='font-size:11px'>Plats</button>"
    +"</div>";
  lc.innerHTML=subTabs+"<div id='utv-content'></div>";
  lc.querySelectorAll("[data-utvsub]").forEach(function(btn){
    btn.onclick=function(){switchUtvSubview(btn.dataset.utvsub);};
  });
  renderUtvContent();
}

function switchUtvSubview(sub){
  utvSubview=sub;
  var tabMap={media:"media",objekt:"objekt",plats:"plats"};
  var tab=tabMap[sub]||"media";
  document.querySelectorAll("[data-utvsub]").forEach(function(btn){btn.classList.toggle("on",btn.dataset.utvsub===sub);});
  var uc=document.getElementById("utv-content");
  if(uc)uc.innerHTML="<div style='padding:30px;text-align:center;color:#5c5c5c;font-size:13px'>⏳ Laddar...</div>";
  loadTab(tab).then(function(){renderUtvContent();});
}

function renderUtvContent(){
  if(utvSubview==="objekt")renderObj();
  else if(utvSubview==="plats")renderPlats();
  else renderLogMedia();
}


var mediaCat="", mediaSortMode="datum";
var mediaGenreSelected=[];

function mediaItemTitle(item){return typeof item==="string"?item:(item&&item.title)||"";}
function mediaItemCreator(item){return typeof item==="string"?"":(item&&item.creator)||"";}
function mediaItemGenre(item){
  if(typeof item==="string")return "";
  if(!item)return "";
  if(Array.isArray(item.genres))return item.genres.join(", ");
  return item.genre||"";
}
function mediaItemGenresArr(item){
  if(!item||typeof item==="string")return [];
  if(Array.isArray(item.genres))return item.genres.slice();
  return item.genre?[item.genre]:[];
}

// Delad "Genrer"-väljare: kryssbar snabbvalslista + chips + fält för att registrera en ny genre.
// Används av lägg-till-formuläret och båda redigeringsrutorna (väntande + färdig recension) sa
// att genre kan ändras pa exakt samma sätt överallt.
function mediaGenrePickerHtml(idPrefix){
  return "<div id='"+idPrefix+"-chips' style='display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px'></div>"
    +"<div class='ac-wrap' style='width:100%'><button class='chip' id='"+idPrefix+"-toggle' type='button' style='width:100%;text-align:left;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 12px;cursor:pointer;font-family:inherit;line-height:1'>Genrer ▾</button><div class='ac-dropdown' id='"+idPrefix+"-dd' style='min-width:200px'></div></div>"
    +"<div class='row' style='margin-top:6px'>"
    +"<input class='inp' id='"+idPrefix+"-new' placeholder='Ny genre...' style='flex:1'/>"
    +"<button class='chip' id='"+idPrefix+"-add' type='button' style='flex-shrink:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 14px;cursor:pointer;font-family:inherit;line-height:1'>+</button>"
    +"</div>";
}
// container: element som innehaller markupen ovan. getCat: fn som returnerar aktuell kategori.
// selected: array (muteras pa plats) med redan valda genrer. Returnerar {getSelected}.
function bindMediaGenrePicker(container,idPrefix,getCat,selected){
  function refreshChips(){
    var chipsEl=container.querySelector("#"+idPrefix+"-chips");
    if(!chipsEl)return;
    chipsEl.innerHTML=selected.length?selected.map(function(g){
      return "<span class='chip' style='display:inline-flex;align-items:center;gap:6px;background:#161616;border:1px solid #2a2a2a;border-radius:20px;padding:6px 8px 6px 12px;font-size:12px'>"+esc(g)+"<button data-genrechipremove='"+esc(g)+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:14px;line-height:1;padding:0'>×</button></span>";
    }).join(""):"<span style='font-size:12px;color:#5c5c5c'>Inga valda</span>";
    chipsEl.querySelectorAll("[data-genrechipremove]").forEach(function(btn){
      btn.onclick=function(){
        var v=btn.dataset.genrechipremove;
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
    var list=MEDIA_GENRE_BY_CAT[cat]||[];
    dd.innerHTML=list.length?list.map(function(g){
      var checked=selected.indexOf(g)>=0;
      return "<div class='ac-item'><span class='ac-item-text' data-genretoggle='"+esc(g)+"' style='flex:1;cursor:pointer'>"+(checked?"☑ ":"☐ ")+esc(g)+"</span><button class='ac-item-remove' data-genreremove='"+esc(g)+"' title='Ta bort'>×</button></div>";
    }).join(""):"<div class='empty' style='padding:10px;font-size:12px'>"+(cat?"Inga genrer för denna kategori än.":"Välj en kategori först.")+"</div>";
    dd.style.display="block";
    _openCatDropdown={dropdownEl:dd,toggleBtn:toggle};
    dd.querySelectorAll("[data-genretoggle]").forEach(function(item){
      item.onmousedown=function(e){
        e.preventDefault();
        var v=item.dataset.genretoggle;
        var idx=selected.indexOf(v);
        if(idx>=0)selected.splice(idx,1);else selected.push(v);
        renderDropdown();
        refreshChips();
      };
    });
    dd.querySelectorAll("[data-genreremove]").forEach(function(btn){
      btn.onmousedown=function(e){
        e.preventDefault();e.stopPropagation();
        var v=btn.dataset.genreremove;
        var cat2=getCat();
        if(MEDIA_GENRE_BY_CAT[cat2])MEDIA_GENRE_BY_CAT[cat2]=MEDIA_GENRE_BY_CAT[cat2].filter(function(x){return x!==v;});
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
    if(!MEDIA_GENRE_BY_CAT[cat])MEDIA_GENRE_BY_CAT[cat]=[];
    if(MEDIA_GENRE_BY_CAT[cat].indexOf(v)<0)MEDIA_GENRE_BY_CAT[cat].unshift(v);
    if(selected.indexOf(v)<0)selected.push(v);
    saveAndSync("inmatningar");
    newInp.value="";
    refreshChips();
    if(dd.style.display==="block")renderDropdown();
  };

  return {getSelected:function(){return selected.slice();}};
}
function mediaItemAnteckning(item){return typeof item==="string"?"":(item&&item.anteckning)||"";}

function objItemTitle(item){return (item&&item.title)||"";}
function objItemTillverkare(item){return (item&&item.tillverkare)||"";}
function objItemAnteckning(item){return (item&&item.anteckning)||"";}

var MEDIA_CAT_PRESETS=["📚 Bok","🎵 Musik","🎬 Film","📺 Serie","🎙️ Podcast","📹 Videodelning","🎮 Spel","✨ Övrigt"];
var OLD_MEDIA_CAT_MAP={bok:"📚 Bok",musik:"🎵 Musik",film:"🎬 Film",serie:"📺 Serie",podcast:"🎙️ Podcast",videodelning:"📹 Videodelning",spel:"🎮 Spel",ovrigt:"✨ Övrigt"};
function migrateMediaCategories(){
  var newList={};
  Object.keys(mediaList||{}).forEach(function(k){
    var newKey=OLD_MEDIA_CAT_MAP[k]||k;
    if(!newList[newKey])newList[newKey]=[];
    newList[newKey]=newList[newKey].concat(mediaList[k]||[]);
  });
  mediaList=newList;
  (mediaFardig||[]).forEach(function(e){
    if(OLD_MEDIA_CAT_MAP[e.cat])e.cat=OLD_MEDIA_CAT_MAP[e.cat];
  });
}

function mediaCatChipLabel(catName){
  var m=catName.match(/^([\p{Emoji}\u{1F3FB}-\u{1F3FF}\u{1F9B0}-\u{1F9B3}]+)/u);
  if(m)return m[1];
  var trimmed=catName.trim();
  return trimmed?trimmed[0].toUpperCase():"?";
}

function getRecentMediaItems(limit){
  var all=[];
  Object.keys(mediaList||{}).forEach(function(catName){
    (mediaList[catName]||[]).forEach(function(item,i){
      all.push({cat:catName,idx:i,item:item});
    });
  });
  all.sort(function(a,b){
    var ta=(a.item&&a.item.timestamp)?new Date(a.item.timestamp).getTime():0;
    var tb=(b.item&&b.item.timestamp)?new Date(b.item.timestamp).getTime():0;
    return tb-ta;
  });
  return all.slice(0,limit);
}

var objList={}, objFardig=[];
var objCat="", objSortMode="datum";
var OBJ_CAT_PRESETS=[];
// Nytt kategori-specifikt snabbval för Föremål (Tillverkare)
var OBJ_MAKER_BY_CAT={};
var objRecensionCat="", objRecensionTillverkare=null;
var OBJ_UNKNOWN_TILLVERKARE="__okand_tillverkare__";
var utvSubview="media"; // media | objekt | plats

function getRecentObjItems(limit){
  var all=[];
  Object.keys(objList||{}).forEach(function(catName){
    (objList[catName]||[]).forEach(function(item,i){
      all.push({cat:catName,idx:i,item:item});
    });
  });
  all.sort(function(a,b){
    var ta=(a.item&&a.item.timestamp)?new Date(a.item.timestamp).getTime():0;
    var tb=(b.item&&b.item.timestamp)?new Date(b.item.timestamp).getTime():0;
    return tb-ta;
  });
  return all.slice(0,limit);
}

// ---- PLATS (twin of Föremål, med "Kommun" istället för "Tillverkare") ----
function platsItemTitle(item){return (item&&item.title)||"";}
function platsItemKommun(item){return (item&&item.kommun)||"";}
function platsItemAnteckning(item){return (item&&item.anteckning)||"";}

var platsList={}, platsFardig=[];
var platsCat="", platsSortMode="datum";
var PLATS_CAT_PRESETS=[];
// Nytt kategori-specifikt snabbval för Plats (Kommun)
var PLATS_KOMMUN_BY_CAT={};
var platsRecensionCat="", platsRecensionKommun=null;
var PLATS_UNKNOWN_KOMMUN="__okand_kommun__";

function getRecentPlatsItems(limit){
  var all=[];
  Object.keys(platsList||{}).forEach(function(catName){
    (platsList[catName]||[]).forEach(function(item,i){
      all.push({cat:catName,idx:i,item:item});
    });
  });
  all.sort(function(a,b){
    var ta=(a.item&&a.item.timestamp)?new Date(a.item.timestamp).getTime():0;
    var tb=(b.item&&b.item.timestamp)?new Date(b.item.timestamp).getTime():0;
    return tb-ta;
  });
  return all.slice(0,limit);
}

function renderLogMedia(){
  var c=document.getElementById("utv-content");
  var catSelectHtml="<select id='mediacat-select' style='width:100%;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:14px;padding:10px 12px;cursor:pointer;font-family:inherit'>"
    +"<option value=''>Välj kategori</option>"
    +MEDIA_CAT_PRESETS.map(function(catName){return "<option value='"+esc(catName)+"'"+(catName===mediaCat?" selected":"")+">"+esc(catName)+"</option>";}).join("")
    +"</select>";
  var rawItems=mediaCat?(mediaList[mediaCat]||[]):[];
  var indexed=rawItems.map(function(item,i){return {item:item,i:i};});
  if(mediaSortMode==="datum"){
    indexed.sort(function(a,b){
      var ta=(a.item&&a.item.timestamp)?new Date(a.item.timestamp).getTime():0;
      var tb=(b.item&&b.item.timestamp)?new Date(b.item.timestamp).getTime():0;
      return tb-ta;
    });
  } else if(mediaSortMode==="kreator"){
    indexed.sort(function(a,b){
      var ca=mediaItemCreator(a.item).toLowerCase(),cb=mediaItemCreator(b.item).toLowerCase();
      if(!ca&&cb)return 1;
      if(ca&&!cb)return -1;
      return ca.localeCompare(cb,"sv");
    });
  } else if(mediaSortMode==="genre"){
    indexed.sort(function(a,b){
      var ga=mediaItemGenre(a.item).toLowerCase(),gb=mediaItemGenre(b.item).toLowerCase();
      if(!ga&&gb)return 1;
      if(ga&&!gb)return -1;
      return ga.localeCompare(gb,"sv");
    });
  }
  var listHtml=indexed.length
    ?"<div style='background:#131313;border:1px solid #2a2a2a;border-radius:10px;padding:8px 12px;margin-top:12px'>"
      +indexed.map(function(entry){
        var item=entry.item,i=entry.i;
        var title=mediaItemTitle(item),creator=mediaItemCreator(item),genre=mediaItemGenre(item),anteckning=mediaItemAnteckning(item);
        return "<div style='padding:8px 0;border-bottom:1px solid #2a2a2a;display:flex;align-items:center;gap:8px'>"
          +"<div data-jumpmed='"+i+"' style='flex:1;min-width:0;cursor:pointer'>"
          +"<div style='font-size:13px;color:#f2f2f2'>"+esc(title)+"</div>"
          +(creator?"<div style='font-size:11px;color:#5c5c5c'>"+esc(creator)+"</div>":"")
          +(genre?"<div style='font-size:11px;color:#5c5c5c'>"+esc(genre)+"</div>":"")
          +(anteckning?"<div style='font-size:11px;color:#5c5c5c'>"+esc(anteckning)+"</div>":"")
          +"</div>"
          +"<button data-editmed='"+i+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:13px;padding:0 4px;flex-shrink:0'>✏️</button>"
          +"<button data-delmed='"+i+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:16px;padding:0 4px;flex-shrink:0'>x</button>"
          +"</div>";
      }).join("")
      +"</div>"
    :(mediaCat?"<div style='font-size:13px;color:#5c5c5c;text-align:center;margin-top:16px;padding:16px'>Inga sparade i "+esc(mediaCat)+" ännu.</div>":"");

  var recentItems=getRecentMediaItems(5);
  var recentHtml=recentItems.length
    ?"<div class='mt20'><div class='lbl'>Senaste 5</div>"
      +"<div style='background:#131313;border:1px solid #2a2a2a;border-radius:10px;padding:8px 12px'>"
      +recentItems.map(function(entry){
        var title=mediaItemTitle(entry.item),creator=mediaItemCreator(entry.item),genre=mediaItemGenre(entry.item),anteckning=mediaItemAnteckning(entry.item);
        return "<div style='padding:8px 0;border-bottom:1px solid #2a2a2a;display:flex;align-items:center;gap:8px'>"
          +"<div data-jumpmedrecent='"+entry.idx+"' data-jumpmedrecentcat='"+esc(entry.cat)+"' style='flex:1;min-width:0;cursor:pointer'>"
          +"<div style='font-size:11px;color:#4fa8ff;margin-bottom:1px'>"+esc(entry.cat)+"</div>"
          +"<div style='font-size:13px;color:#f2f2f2'>"+esc(title)+"</div>"
          +(creator?"<div style='font-size:11px;color:#5c5c5c'>"+esc(creator)+"</div>":"")
          +(genre?"<div style='font-size:11px;color:#5c5c5c'>"+esc(genre)+"</div>":"")
          +(anteckning?"<div style='font-size:11px;color:#5c5c5c'>"+esc(anteckning)+"</div>":"")
          +"</div>"
          +"<button data-editmedrecent='"+entry.idx+"' data-editmedrecentcat='"+esc(entry.cat)+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:13px;padding:0 4px;flex-shrink:0'>✏️</button>"
          +"<button data-delmedrecent='"+entry.idx+"' data-delmedrecentcat='"+esc(entry.cat)+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:16px;padding:0 4px;flex-shrink:0'>x</button>"
          +"</div>";
      }).join("")
      +"</div></div>"
    :"";

  var bodySection=mediaCat
    ?("<div class='lbl'>Lägg till</div>"
      +"<input class='inp w100' id='media-inp' placeholder='Namn på media...' style='margin-bottom:8px'/>"
      +"<div class='row'>"
      +"<div class='ac-wrap' style='flex-shrink:0'><button class='chip' id='media-creator-toggle' type='button' style='background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 12px;cursor:pointer;font-family:inherit;white-space:nowrap;line-height:1'>Kreatör ▾</button><div class='ac-dropdown' id='media-creator-dd' style='min-width:200px'></div></div>"
      +"<input class='inp' id='media-creator-inp' placeholder='Kreatör (valfritt)...' style='flex:1'/>"
      +"<button class='chip' id='media-creator-add' type='button' style='flex-shrink:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 14px;cursor:pointer;font-family:inherit;line-height:1'>+</button>"
      +"</div>"
      +mediaGenrePickerHtml('media-genre')
      +"<textarea class='ta' id='media-anteckning-inp' placeholder='Anteckning (valfritt)...' style='min-height:70px;margin-top:6px'></textarea>"
      +"<button class='sec' id='media-add' style='margin-top:6px'>Lägg till</button>"
      +"<div id='media-status'></div>"
      +"<div style='display:flex;align-items:center;gap:8px;margin-top:16px'>"
      +"<span style='font-size:12px;color:#5c5c5c;flex-shrink:0'>Sortera efter</span>"
      +"<div style='display:flex;gap:6px;flex:1'>"
      +"<button data-sortmed='datum' style='flex:1;padding:7px 0;border-radius:8px;background:"+(mediaSortMode==="datum"?"#1c3c5a":"#131313")+";border:1px solid "+(mediaSortMode==="datum"?"#4fa8ff":"#2a2a2a")+";color:"+(mediaSortMode==="datum"?"#4fa8ff":"#5c5c5c")+";font-size:12px;cursor:pointer'>Datum</button>"
      +"<button data-sortmed='kreator' style='flex:1;padding:7px 0;border-radius:8px;background:"+(mediaSortMode==="kreator"?"#1c3c5a":"#131313")+";border:1px solid "+(mediaSortMode==="kreator"?"#4fa8ff":"#2a2a2a")+";color:"+(mediaSortMode==="kreator"?"#4fa8ff":"#5c5c5c")+";font-size:12px;cursor:pointer'>Kreatör</button>"
      +"<button data-sortmed='genre' style='flex:1;padding:7px 0;border-radius:8px;background:"+(mediaSortMode==="genre"?"#1c3c5a":"#131313")+";border:1px solid "+(mediaSortMode==="genre"?"#4fa8ff":"#2a2a2a")+";color:"+(mediaSortMode==="genre"?"#4fa8ff":"#5c5c5c")+";font-size:12px;cursor:pointer'>Genre</button>"
      +"</div></div>"
      +(indexed.length?"<div class='lbl' style='margin-top:16px'>Att konsumera</div>":"")
      +listHtml)
    :("<div class='lbl'>Lägg till</div>"
      +"<select id='media-target-cat' style='width:100%;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:14px;padding:10px 12px;cursor:pointer;font-family:inherit;margin-bottom:8px'>"
      +MEDIA_CAT_PRESETS.map(function(cn,i){return "<option value='"+esc(cn)+"'"+(i===0?" selected":"")+">"+esc(cn)+"</option>";}).join("")
      +"</select>"
      +"<input class='inp w100' id='media-inp' placeholder='Namn på media...' style='margin-bottom:8px'/>"
      +"<div class='row'>"
      +"<div class='ac-wrap' style='flex-shrink:0'><button class='chip' id='media-creator-toggle' type='button' style='background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 12px;cursor:pointer;font-family:inherit;white-space:nowrap;line-height:1'>Kreatör ▾</button><div class='ac-dropdown' id='media-creator-dd' style='min-width:200px'></div></div>"
      +"<input class='inp' id='media-creator-inp' placeholder='Kreatör (valfritt)...' style='flex:1'/>"
      +"<button class='chip' id='media-creator-add' type='button' style='flex-shrink:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 14px;cursor:pointer;font-family:inherit;line-height:1'>+</button>"
      +"</div>"
      +mediaGenrePickerHtml('media-genre')
      +"<textarea class='ta' id='media-anteckning-inp' placeholder='Anteckning (valfritt)...' style='min-height:70px;margin-top:6px'></textarea>"
      +"<button class='sec' id='media-add' style='margin-top:6px'>Lägg till</button>"
      +"<div id='media-status'></div>"
      +recentHtml);

  c.innerHTML="<div class='lbl'>Kategori</div>"
    +catSelectHtml
    +"<button class='sec ghost' id='media-recension-btn' style='width:100%;margin:12px 0'>📝 Recensioner</button>"
    +bodySection;

  c.querySelectorAll("[data-sortmed]").forEach(function(btn){
    btn.onclick=function(){mediaSortMode=btn.dataset.sortmed;renderLogMedia();};
  });

  var mediaCatSel=c.querySelector("#mediacat-select");
  if(mediaCatSel)mediaCatSel.onchange=function(){mediaCat=mediaCatSel.value;mediaGenreSelected=[];renderLogMedia();};
  var recBtn=c.querySelector("#media-recension-btn");
  if(recBtn)recBtn.onclick=function(){mediaRecensionCat=mediaCat;mediaRecensionCreator=null;mediaRecensionSearch="";mediaRecensionBookshelf=false;mediaRecensionLetter="";renderMediaRecension();};

  var inp=c.querySelector("#media-inp");
  var creatorInp=c.querySelector("#media-creator-inp");
  var anteckningInp=c.querySelector("#media-anteckning-inp");
  var targetCatSel=c.querySelector("#media-target-cat");
  var addBtn=c.querySelector("#media-add");
  var mediaGetCat=function(){return mediaCat||(targetCatSel?targetCatSel.value:"");};
  var mediaGenrePicker=bindMediaGenrePicker(c,"media-genre",mediaGetCat,mediaGenreSelected);

  if(addBtn)addBtn.onclick=function(){
    var v=inp?inp.value.trim():"";
    if(!v)return;
    var targetCat=mediaCat||(targetCatSel?targetCatSel.value:"");
    if(!targetCat)return;
    var cr=creatorInp?creatorInp.value.trim():"";
    var an=anteckningInp?anteckningInp.value.trim():"";
    if(!mediaList[targetCat])mediaList[targetCat]=[];
    var newItem={title:v,creator:cr,anteckning:an,timestamp:new Date().toISOString()};
    var chosenGenres=mediaGenrePicker.getSelected();
    if(chosenGenres.length)newItem.genres=chosenGenres;
    mediaList[targetCat].push(newItem);
    inp.value="";if(creatorInp)creatorInp.value="";if(anteckningInp)anteckningInp.value="";
    mediaGenreSelected.length=0;
    saveAndSync("media");
    var st=c.querySelector("#media-status");
    if(st){st.innerHTML="<div class='ok-toast'>Sparat!</div>";setTimeout(function(){if(st)st.innerHTML="";},2000);}
    renderLogMedia();
  };
  if(inp)inp.onkeydown=function(e){if(e.key==="Enter"&&inp.value.trim()&&addBtn)addBtn.onclick();};
  if(creatorInp)creatorInp.onkeydown=function(e){if(e.key==="Enter"&&inp.value.trim()&&addBtn)addBtn.onclick();};
  bindCatPresetDropdown(creatorInp,c.querySelector("#media-creator-toggle"),c.querySelector("#media-creator-dd"),c.querySelector("#media-creator-add"),function(){return MEDIA_CREATOR_BY_CAT;},mediaGetCat,"inmatningar");

  c.querySelectorAll("[data-editmed]").forEach(function(btn){
    btn.onclick=function(){
      editPendingMediaItem(mediaCat,parseInt(btn.dataset.editmed),renderLogMedia);
    };
  });
  c.querySelectorAll("[data-delmed]").forEach(function(btn){
    btn.onclick=function(){
      var idx=parseInt(btn.dataset.delmed);
      var item=mediaList[mediaCat]?mediaList[mediaCat][idx]:null;
      var title=item?mediaItemTitle(item):"";
      confirmDelete("Vill du ta bort \""+esc(title)+"\"?",function(){
        if(mediaList[mediaCat])mediaList[mediaCat].splice(idx,1);
        saveAndSync("media");renderLogMedia();
      });
    };
  });
  c.querySelectorAll("[data-jumpmed]").forEach(function(el){
    el.onclick=function(){
      var idx=parseInt(el.dataset.jumpmed);
      var item=mediaList[mediaCat][idx];
      historySubview="betyg";histBetygSubview="media";
      setView("history");
      renderHistory();
      // After render, show Klar modal for this item
      setTimeout(function(){showHistMediaModal(mediaItemTitle(item),idx,mediaCat,mediaItemCreator(item),mediaItemGenre(item),mediaItemAnteckning(item),mediaItemGenresArr(item));},50);
    };
  });

  // Senaste 5 (only shown when no category chip is selected)
  c.querySelectorAll("[data-editmedrecent]").forEach(function(btn){
    btn.onclick=function(){
      editPendingMediaItem(btn.dataset.editmedrecentcat,parseInt(btn.dataset.editmedrecent),renderLogMedia);
    };
  });
  c.querySelectorAll("[data-delmedrecent]").forEach(function(btn){
    btn.onclick=function(){
      var cat=btn.dataset.delmedrecentcat;
      var idx=parseInt(btn.dataset.delmedrecent);
      var item=mediaList[cat]?mediaList[cat][idx]:null;
      var title=item?mediaItemTitle(item):"";
      confirmDelete("Vill du ta bort \""+esc(title)+"\"?",function(){
        if(mediaList[cat])mediaList[cat].splice(idx,1);
        saveAndSync("media");renderLogMedia();
      });
    };
  });
  c.querySelectorAll("[data-jumpmedrecent]").forEach(function(el){
    el.onclick=function(){
      var cat=el.dataset.jumpmedrecentcat;
      var idx=parseInt(el.dataset.jumpmedrecent);
      var item=mediaList[cat][idx];
      historySubview="betyg";histBetygSubview="media";
      setView("history");
      renderHistory();
      setTimeout(function(){showHistMediaModal(mediaItemTitle(item),idx,cat,mediaItemCreator(item),mediaItemGenre(item),mediaItemAnteckning(item),mediaItemGenresArr(item));},50);
    };
  });
}

var mediaRecensionCat="", mediaRecensionCreator=null;
var mediaRecensionSearch="", mediaRecensionBookshelf=false, mediaRecensionLetter="";
var MEDIA_REC_ALPHABET=["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","Å","Ä","Ö"];
var MEDIA_UNKNOWN_CREATOR="__okand_kreator__";

function objCatChipLabel(catName){return mediaCatChipLabel(catName);}

function renderObj(){
  var c=document.getElementById("utv-content");
  var catSelectHtml="<select id='objcat-select' style='width:100%;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:14px;padding:10px 12px;cursor:pointer;font-family:inherit'>"
    +"<option value=''>Välj kategori</option>"
    +OBJ_CAT_PRESETS.map(function(catName){return "<option value='"+esc(catName)+"'"+(catName===objCat?" selected":"")+">"+esc(catName)+"</option>";}).join("")
    +"</select>";
  var rawItems=objCat?(objList[objCat]||[]):[];
  var indexed=rawItems.map(function(item,i){return {item:item,i:i};});
  if(objSortMode==="datum"){
    indexed.sort(function(a,b){
      var ta=(a.item&&a.item.timestamp)?new Date(a.item.timestamp).getTime():0;
      var tb=(b.item&&b.item.timestamp)?new Date(b.item.timestamp).getTime():0;
      return tb-ta;
    });
  } else if(objSortMode==="tillverkare"){
    indexed.sort(function(a,b){
      var ca=objItemTillverkare(a.item).toLowerCase(),cb=objItemTillverkare(b.item).toLowerCase();
      if(!ca&&cb)return 1;
      if(ca&&!cb)return -1;
      return ca.localeCompare(cb,"sv");
    });
  }
  var listHtml=indexed.length
    ?"<div style='background:#131313;border:1px solid #2a2a2a;border-radius:10px;padding:8px 12px;margin-top:12px'>"
      +indexed.map(function(entry){
        var item=entry.item,i=entry.i;
        var title=objItemTitle(item),tillverkare=objItemTillverkare(item),anteckning=objItemAnteckning(item);
        return "<div style='padding:8px 0;border-bottom:1px solid #2a2a2a;display:flex;align-items:center;gap:8px'>"
          +"<div data-jumpobj='"+i+"' style='flex:1;min-width:0;cursor:pointer'>"
          +"<div style='font-size:13px;color:#f2f2f2'>"+esc(title)+"</div>"
          +(tillverkare?"<div style='font-size:11px;color:#5c5c5c'>"+esc(tillverkare)+"</div>":"")
          +(anteckning?"<div style='font-size:11px;color:#5c5c5c'>"+esc(anteckning)+"</div>":"")
          +"</div>"
          +"<button data-editobj='"+i+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:13px;padding:0 4px;flex-shrink:0'>✏️</button>"
          +"<button data-delobj='"+i+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:16px;padding:0 4px;flex-shrink:0'>x</button>"
          +"</div>";
      }).join("")
      +"</div>"
    :(objCat?"<div style='font-size:13px;color:#5c5c5c;text-align:center;margin-top:16px;padding:16px'>Inga sparade i "+esc(objCat)+" ännu.</div>":"");

  var recentItems=getRecentObjItems(5);
  var recentHtml=recentItems.length
    ?"<div class='mt20'><div class='lbl'>Senaste 5</div>"
      +"<div style='background:#131313;border:1px solid #2a2a2a;border-radius:10px;padding:8px 12px'>"
      +recentItems.map(function(entry){
        var title=objItemTitle(entry.item),tillverkare=objItemTillverkare(entry.item),anteckning=objItemAnteckning(entry.item);
        return "<div style='padding:8px 0;border-bottom:1px solid #2a2a2a;display:flex;align-items:center;gap:8px'>"
          +"<div data-jumpobjrecent='"+entry.idx+"' data-jumpobjrecentcat='"+esc(entry.cat)+"' style='flex:1;min-width:0;cursor:pointer'>"
          +"<div style='font-size:11px;color:#4fa8ff;margin-bottom:1px'>"+esc(entry.cat)+"</div>"
          +"<div style='font-size:13px;color:#f2f2f2'>"+esc(title)+"</div>"
          +(tillverkare?"<div style='font-size:11px;color:#5c5c5c'>"+esc(tillverkare)+"</div>":"")
          +(anteckning?"<div style='font-size:11px;color:#5c5c5c'>"+esc(anteckning)+"</div>":"")
          +"</div>"
          +"<button data-editobjrecent='"+entry.idx+"' data-editobjrecentcat='"+esc(entry.cat)+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:13px;padding:0 4px;flex-shrink:0'>✏️</button>"
          +"<button data-delobjrecent='"+entry.idx+"' data-delobjrecentcat='"+esc(entry.cat)+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:16px;padding:0 4px;flex-shrink:0'>x</button>"
          +"</div>";
      }).join("")
      +"</div></div>"
    :"";

  var bodySection=objCat
    ?("<div class='lbl'>Lägg till</div>"
      +"<input class='inp w100' id='obj-inp' placeholder='Namn på föremål...' style='margin-bottom:8px'/>"
      +"<div class='row'>"
      +"<div class='ac-wrap' style='flex-shrink:0'><button class='chip' id='obj-tillverkare-toggle' type='button' style='background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 12px;cursor:pointer;font-family:inherit;white-space:nowrap;line-height:1'>Tillverkare ▾</button><div class='ac-dropdown' id='obj-tillverkare-dd' style='min-width:200px'></div></div>"
      +"<input class='inp' id='obj-tillverkare-inp' placeholder='Tillverkare (valfritt)...' style='flex:1'/>"
      +"<button class='chip' id='obj-tillverkare-add' type='button' style='flex-shrink:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 14px;cursor:pointer;font-family:inherit;line-height:1'>+</button>"
      +"</div>"
      +"<textarea class='ta' id='obj-anteckning-inp' placeholder='Anteckning (valfritt)...' style='min-height:70px;margin-top:6px'></textarea>"
      +"<button class='abtn' id='obj-add' style='width:100%'>+</button>"
      +"<div id='obj-status'></div>"
      +"<div style='display:flex;align-items:center;gap:8px;margin-top:16px'>"
      +"<span style='font-size:12px;color:#5c5c5c;flex-shrink:0'>Sortera efter</span>"
      +"<div style='display:flex;gap:6px;flex:1'>"
      +"<button data-sortobj='datum' style='flex:1;padding:7px 0;border-radius:8px;background:"+(objSortMode==="datum"?"#1c3c5a":"#131313")+";border:1px solid "+(objSortMode==="datum"?"#4fa8ff":"#2a2a2a")+";color:"+(objSortMode==="datum"?"#4fa8ff":"#5c5c5c")+";font-size:12px;cursor:pointer'>Datum</button>"
      +"<button data-sortobj='tillverkare' style='flex:1;padding:7px 0;border-radius:8px;background:"+(objSortMode==="tillverkare"?"#1c3c5a":"#131313")+";border:1px solid "+(objSortMode==="tillverkare"?"#4fa8ff":"#2a2a2a")+";color:"+(objSortMode==="tillverkare"?"#4fa8ff":"#5c5c5c")+";font-size:12px;cursor:pointer'>Tillverkare</button>"
      +"</div></div>"
      +(indexed.length?"<div class='lbl' style='margin-top:16px'>Att konsumera</div>":"")
      +listHtml)
    :("<div class='lbl'>Lägg till</div>"
      +"<select id='obj-target-cat' style='width:100%;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:14px;padding:10px 12px;cursor:pointer;font-family:inherit;margin-bottom:8px'>"
      +OBJ_CAT_PRESETS.map(function(cn,i){return "<option value='"+esc(cn)+"'"+(i===0?" selected":"")+">"+esc(cn)+"</option>";}).join("")
      +"</select>"
      +"<input class='inp w100' id='obj-inp' placeholder='Namn på föremål...' style='margin-bottom:8px'/>"
      +"<div class='row'>"
      +"<div class='ac-wrap' style='flex-shrink:0'><button class='chip' id='obj-tillverkare-toggle' type='button' style='background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 12px;cursor:pointer;font-family:inherit;white-space:nowrap;line-height:1'>Tillverkare ▾</button><div class='ac-dropdown' id='obj-tillverkare-dd' style='min-width:200px'></div></div>"
      +"<input class='inp' id='obj-tillverkare-inp' placeholder='Tillverkare (valfritt)...' style='flex:1'/>"
      +"<button class='chip' id='obj-tillverkare-add' type='button' style='flex-shrink:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 14px;cursor:pointer;font-family:inherit;line-height:1'>+</button>"
      +"</div>"
      +"<textarea class='ta' id='obj-anteckning-inp' placeholder='Anteckning (valfritt)...' style='min-height:70px;margin-top:6px'></textarea>"
      +"<button class='abtn' id='obj-add' style='width:100%'>+</button>"
      +"<div id='obj-status'></div>"
      +recentHtml);

  c.innerHTML="<div class='lbl'>Kategori</div>"
    +catSelectHtml
    +"<button class='sec ghost' id='obj-recension-btn' style='width:100%;margin:12px 0'>📝 Recensioner</button>"
    +bodySection;

  c.querySelectorAll("[data-sortobj]").forEach(function(btn){
    btn.onclick=function(){objSortMode=btn.dataset.sortobj;renderObj();};
  });

  var objCatSel=c.querySelector("#objcat-select");
  if(objCatSel)objCatSel.onchange=function(){objCat=objCatSel.value;renderObj();};
  var recBtn=c.querySelector("#obj-recension-btn");
  if(recBtn)recBtn.onclick=function(){objRecensionCat=objCat;objRecensionTillverkare=null;renderObjRecension();};

  var inp=c.querySelector("#obj-inp");
  var tillverkareInp=c.querySelector("#obj-tillverkare-inp");
  var anteckningInp=c.querySelector("#obj-anteckning-inp");
  var targetCatSel=c.querySelector("#obj-target-cat");
  var addBtn=c.querySelector("#obj-add");
  if(addBtn)addBtn.onclick=function(){
    var v=inp?inp.value.trim():"";
    if(!v)return;
    var targetCat=objCat||(targetCatSel?targetCatSel.value:"");
    if(!targetCat)return;
    var tv=tillverkareInp?tillverkareInp.value.trim():"";
    var an=anteckningInp?anteckningInp.value.trim():"";
    if(!objList[targetCat])objList[targetCat]=[];
    objList[targetCat].push({title:v,tillverkare:tv,anteckning:an,timestamp:new Date().toISOString()});
    inp.value="";if(tillverkareInp)tillverkareInp.value="";if(anteckningInp)anteckningInp.value="";
    saveAndSync("objekt");
    var st=c.querySelector("#obj-status");
    if(st){st.innerHTML="<div class='ok-toast'>Sparat!</div>";setTimeout(function(){if(st)st.innerHTML="";},2000);}
    renderObj();
  };
  if(inp)inp.onkeydown=function(e){if(e.key==="Enter"&&inp.value.trim()&&addBtn)addBtn.onclick();};
  if(tillverkareInp)tillverkareInp.onkeydown=function(e){if(e.key==="Enter"&&inp.value.trim()&&addBtn)addBtn.onclick();};
  bindCatPresetDropdown(tillverkareInp,c.querySelector("#obj-tillverkare-toggle"),c.querySelector("#obj-tillverkare-dd"),c.querySelector("#obj-tillverkare-add"),function(){return OBJ_MAKER_BY_CAT;},function(){return objCat||(targetCatSel?targetCatSel.value:"");},"inmatningar");

  c.querySelectorAll("[data-editobj]").forEach(function(btn){
    btn.onclick=function(){
      editPendingObjItem(objCat,parseInt(btn.dataset.editobj),renderObj);
    };
  });
  c.querySelectorAll("[data-delobj]").forEach(function(btn){
    btn.onclick=function(){
      var idx=parseInt(btn.dataset.delobj);
      var item=objList[objCat]?objList[objCat][idx]:null;
      var title=item?objItemTitle(item):"";
      confirmDelete("Vill du ta bort \""+esc(title)+"\"?",function(){
        if(objList[objCat])objList[objCat].splice(idx,1);
        saveAndSync("objekt");renderObj();
      });
    };
  });
  c.querySelectorAll("[data-jumpobj]").forEach(function(el){
    el.onclick=function(){
      var idx=parseInt(el.dataset.jumpobj);
      var item=objList[objCat][idx];
      historySubview="betyg";histBetygSubview="objekt";
      setView("history");
      renderHistory();
      setTimeout(function(){showHistObjModal(objItemTitle(item),idx,objCat,objItemTillverkare(item),objItemAnteckning(item));},50);
    };
  });

  // Senaste 5 (only shown when no category chip is selected)
  c.querySelectorAll("[data-editobjrecent]").forEach(function(btn){
    btn.onclick=function(){
      editPendingObjItem(btn.dataset.editobjrecentcat,parseInt(btn.dataset.editobjrecent),renderObj);
    };
  });
  c.querySelectorAll("[data-delobjrecent]").forEach(function(btn){
    btn.onclick=function(){
      var cat=btn.dataset.delobjrecentcat;
      var idx=parseInt(btn.dataset.delobjrecent);
      var item=objList[cat]?objList[cat][idx]:null;
      var title=item?objItemTitle(item):"";
      confirmDelete("Vill du ta bort \""+esc(title)+"\"?",function(){
        if(objList[cat])objList[cat].splice(idx,1);
        saveAndSync("objekt");renderObj();
      });
    };
  });
  c.querySelectorAll("[data-jumpobjrecent]").forEach(function(el){
    el.onclick=function(){
      var cat=el.dataset.jumpobjrecentcat;
      var idx=parseInt(el.dataset.jumpobjrecent);
      var item=objList[cat][idx];
      historySubview="betyg";histBetygSubview="objekt";
      setView("history");
      renderHistory();
      setTimeout(function(){showHistObjModal(objItemTitle(item),idx,cat,objItemTillverkare(item),objItemAnteckning(item));},50);
    };
  });
}

function renderObjRecension(){
  if(objRecensionTillverkare!==null)return renderObjRecensionByTillverkare();

  var c=document.getElementById("utv-content");
  if(!objRecensionCat||OBJ_CAT_PRESETS.indexOf(objRecensionCat)<0)objRecensionCat=OBJ_CAT_PRESETS[0]||"";
  var catOptions=OBJ_CAT_PRESETS.map(function(catName){return "<option value='"+esc(catName)+"'"+(catName===objRecensionCat?" selected":"")+">"+esc(catName)+"</option>";}).join("");

  var entries=objFardig.filter(function(e){return e.cat===objRecensionCat;});
  var counts={};
  entries.forEach(function(e){
    var key=e.tillverkare?e.tillverkare:OBJ_UNKNOWN_TILLVERKARE;
    counts[key]=(counts[key]||0)+1;
  });
  var tillverkares=Object.keys(counts).filter(function(k){return k!==OBJ_UNKNOWN_TILLVERKARE;}).sort(function(a,b){return a.toLowerCase().localeCompare(b.toLowerCase(),"sv");});
  if(counts[OBJ_UNKNOWN_TILLVERKARE])tillverkares.push(OBJ_UNKNOWN_TILLVERKARE);

  var list=tillverkares.length?tillverkares.map(function(tv){
    var label=tv===OBJ_UNKNOWN_TILLVERKARE?"Okänd tillverkare":tv;
    return "<div class='khist' style='display:flex;align-items:center;gap:8px' data-rectillverkare='"+esc(tv)+"'>"
      +"<div style='flex:1;min-width:0'><div class='kmsg' style='white-space:normal;font-weight:600'>"+esc(label)+"</div>"
      +"<div class='kmeta'><span class='kbadge'>"+counts[tv]+" recensioner</span></div></div>"
      +"</div>";
  }).join(""):"<div class='empty' style='padding:30px 0'><div class='eico'>📝</div>Inga recensioner i denna kategori annu.</div>";

  c.innerHTML="<button class='sec ghost' id='objrec-back' style='margin-bottom:16px'>&#8592; Tillbaka</button>"
    +"<div class='lbl'>Recensioner</div>"
    +"<select id='objrec-cat-select' style='width:100%;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:14px;padding:10px 12px;cursor:pointer;font-family:inherit;margin-bottom:14px'>"+catOptions+"</select>"
    +"<div class='lbl'>Tillverkare</div>"+list;

  c.querySelector("#objrec-back").onclick=function(){renderObj();};
  var sel=c.querySelector("#objrec-cat-select");
  if(sel)sel.onchange=function(){objRecensionCat=sel.value;renderObjRecension();};
  c.querySelectorAll("[data-rectillverkare]").forEach(function(el){
    el.onclick=function(){objRecensionTillverkare=el.dataset.rectillverkare;renderObjRecension();};
  });
}

function renderObjRecensionByTillverkare(){
  var c=document.getElementById("utv-content");
  var isUnknown=objRecensionTillverkare===OBJ_UNKNOWN_TILLVERKARE;
  var label=isUnknown?"Okänd tillverkare":objRecensionTillverkare;

  var entries=objFardig.filter(function(e){
    return e.cat===objRecensionCat&&(isUnknown?!e.tillverkare:e.tillverkare===objRecensionTillverkare);
  });
  entries.sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);});

  var list=entries.length?entries.map(function(e){
    var stars=[1,2,3,4,5,6,7,8,9,10].map(function(n){return n<=e.rating?"★":"☆";}).join("");
    var idx=objFardig.indexOf(e);
    return "<div style='padding:10px 14px;background:#131313;border:1px solid #2a2a2a;border-radius:10px;margin-bottom:8px'>"
      +"<div style='display:flex;align-items:center;gap:8px'>"
      +"<div style='flex:1;font-size:13px;color:#f2f2f2;font-weight:500'>"+esc(e.title)+"</div>"
      +"<span style='color:#c9a24a;font-size:14px;letter-spacing:1px'>"+stars+"</span>"
      +"<button data-editobjrec='"+idx+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:14px;padding:0 4px;flex-shrink:0'>✏️</button>"
      +"</div>"
      +(e.anteckning?"<div style='font-size:11px;color:#5c5c5c;margin-top:2px'>"+esc(e.anteckning)+"</div>":"")
      +(e.comment?"<div style='font-size:12px;color:#5c5c5c;margin-top:4px;line-height:1.5'>"+esc(e.comment)+"</div>":"")
      +"<div style='font-size:10px;color:#5c5c5c;margin-top:4px'>"+fd(e.timestamp)+"</div>"
      +"</div>";
  }).join(""):"<div class='empty' style='padding:30px 0'><div class='eico'>📝</div>Inga recensioner annu.</div>";

  c.innerHTML="<button class='sec ghost' id='objrec-back-tillverkare' style='margin-bottom:16px'>&#8592; Alla tillverkare</button>"
    +"<div class='lbl'>"+esc(label)+"</div>"+list;

  c.querySelector("#objrec-back-tillverkare").onclick=function(){objRecensionTillverkare=null;renderObjRecension();};
  c.querySelectorAll("[data-editobjrec]").forEach(function(btn){
    btn.onclick=function(){
      var e=objFardig[parseInt(btn.dataset.editobjrec)];
      if(e)editObjFardigEntry(e,renderObjRecensionByTillverkare);
    };
  });
}

function editPendingObjItem(cat,idx,onSaved){
  var item=(objList[cat]||[])[idx];
  if(!item)return;
  var title=objItemTitle(item),tillverkare=objItemTillverkare(item),anteckning=objItemAnteckning(item);
  var overlay=document.createElement("div");
  overlay.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px";
  overlay.innerHTML="<div style='background:#161616;border-radius:16px;border:1px solid #4fa8ff;padding:20px;width:100%;max-width:380px'>"
    +"<div class='lbl' style='margin-bottom:10px'>Kategori</div>"
    +"<select class='inp w100' id='edit-obj-cat-inp' style='margin-bottom:12px'>"
    +OBJ_CAT_PRESETS.map(function(cn){return "<option value='"+esc(cn)+"'"+(cn===cat?" selected":"")+">"+esc(cn)+"</option>";}).join("")
    +"</select>"
    +"<div class='lbl' style='margin-bottom:10px'>Ändra titel</div>"
    +"<input class='inp w100' id='edit-obj-inp' value='"+esc(title)+"' style='margin-bottom:10px'/>"
    +"<div class='lbl' style='margin-bottom:10px'>Tillverkare</div>"
    +"<input class='inp w100' id='edit-obj-tillverkare-inp' value='"+esc(tillverkare)+"' style='margin-bottom:10px'/>"
    +"<div class='lbl' style='margin-bottom:10px'>Anteckning</div>"
    +"<textarea class='ta w100' id='edit-obj-anteckning-inp' style='margin-bottom:12px;min-height:70px'>"+esc(anteckning)+"</textarea>"
    +"<div style='display:flex;gap:8px'>"
    +"<button id='edit-obj-save' style='flex:1;padding:10px;border-radius:8px;background:#1c3c5a;border:1px solid #4fa8ff;color:#4fa8ff;font-size:13px;cursor:pointer;font-family:inherit'>Spara</button>"
    +"<button id='edit-obj-cancel' style='flex:1;padding:10px;border-radius:8px;background:#131313;border:1px solid #2a2a2a;color:#5c5c5c;font-size:13px;cursor:pointer;font-family:inherit'>Avbryt</button>"
    +"</div></div>";
  document.body.appendChild(overlay);
  var tInp=overlay.querySelector("#edit-obj-inp");
  var vInp=overlay.querySelector("#edit-obj-tillverkare-inp");
  var oInp=overlay.querySelector("#edit-obj-anteckning-inp");
  tInp.focus();tInp.select();
  overlay.querySelector("#edit-obj-cancel").onclick=function(){overlay.remove();};
  overlay.querySelector("#edit-obj-save").onclick=function(){
    var val=tInp.value.trim();
    var tvVal=vInp.value.trim();
    var anVal=oInp.value.trim();
    var newCat=overlay.querySelector("#edit-obj-cat-inp").value||cat;
    if(val&&objList[cat]){
      var updated={title:val,tillverkare:tvVal,anteckning:anVal,timestamp:item.timestamp||new Date().toISOString()};
      if(newCat===cat){
        objList[cat][idx]=updated;
      } else {
        objList[cat].splice(idx,1);
        if(!objList[newCat])objList[newCat]=[];
        objList[newCat].push(updated);
      }
      saveAndSync("objekt");
      overlay.remove();
      if(onSaved)onSaved();
    }
  };
  tInp.onkeydown=function(e){if(e.key==="Enter")overlay.querySelector("#edit-obj-save").onclick();if(e.key==="Escape")overlay.remove();};
}

function editObjFardigEntry(entry,onSaved){
  var selectedRating=entry.rating||0;
  var overlay=document.createElement("div");
  overlay.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px";
  overlay.innerHTML="<div style='background:#161616;border-radius:16px;border:1px solid #4fa8ff;padding:20px;width:100%;max-width:400px'>"
    +"<div class='lbl' style='margin-bottom:8px'>Kategori</div>"
    +"<select class='inp w100' id='eof-cat' style='margin-bottom:12px'>"
    +OBJ_CAT_PRESETS.map(function(cn){return "<option value='"+esc(cn)+"'"+(cn===entry.cat?" selected":"")+">"+esc(cn)+"</option>";}).join("")
    +"</select>"
    +"<div class='lbl' style='margin-bottom:8px'>Namn</div>"
    +"<input class='inp w100' id='eof-title' value='"+esc(entry.title)+"' style='margin-bottom:12px'/>"
    +"<div class='lbl' style='margin-bottom:8px'>Tillverkare</div>"
    +"<input class='inp w100' id='eof-tillverkare' value='"+esc(entry.tillverkare||"")+"' style='margin-bottom:12px'/>"
    +"<div class='lbl' style='margin-bottom:8px'>Anteckning</div>"
    +"<textarea class='ta w100' id='eof-anteckning' style='margin-bottom:12px;min-height:70px'>"+esc(entry.anteckning||"")+"</textarea>"
    +"<div class='lbl' style='margin-bottom:8px'>Betyg</div>"
    +"<div id='eof-stars' style='display:flex;gap:8px;margin-bottom:4px'>"
    +[1,2,3,4,5,6,7,8,9,10].map(function(n){var on=n<=selectedRating;return "<button data-star='"+n+"' style='font-size:19px;padding:2px;background:none;border:none;cursor:pointer;color:"+(on?"#ffcc33":"#5c5c5c")+";opacity:"+(on?"1":"0.35")+"'>★</button>";}).join("")
    +"</div>"
    +"<div id='eof-rating-num' style='text-align:left;color:#8c8c8c;font-size:13px;margin-bottom:14px;font-weight:600'>"+selectedRating+" / 10</div>"
    +"<div class='lbl' style='margin-bottom:8px'>Kommentar</div>"
    +"<textarea class='ta' id='eof-comment' style='min-height:70px;margin-bottom:14px'>"+esc(entry.comment||"")+"</textarea>"
    +"<div style='display:flex;gap:8px'>"
    +"<button id='eof-save' style='flex:1;padding:10px;border-radius:8px;background:#1c3c5a;border:1px solid #4fa8ff;color:#4fa8ff;font-size:13px;cursor:pointer;font-family:inherit'>Spara</button>"
    +"<button id='eof-cancel' style='flex:1;padding:10px;border-radius:8px;background:#131313;border:1px solid #2a2a2a;color:#5c5c5c;font-size:13px;cursor:pointer;font-family:inherit'>Avbryt</button>"
    +"</div></div>";
  document.body.appendChild(overlay);
  overlay.querySelectorAll("[data-star]").forEach(function(star){
    star.onclick=function(){
      selectedRating=parseInt(star.dataset.star);
      overlay.querySelectorAll("[data-star]").forEach(function(s){
        var on=parseInt(s.dataset.star)<=selectedRating;
        s.style.opacity=on?"1":"0.35";
        s.style.color=on?"#ffcc33":"#5c5c5c";
      });
      var numEl=overlay.querySelector("#eof-rating-num");
      if(numEl)numEl.textContent=selectedRating+" / 10";
    };
  });
  overlay.querySelector("#eof-cancel").onclick=function(){overlay.remove();};
  overlay.querySelector("#eof-save").onclick=function(){
    var title=overlay.querySelector("#eof-title").value.trim();
    if(!title)return;
    entry.title=title;
    entry.tillverkare=overlay.querySelector("#eof-tillverkare").value.trim();
    entry.anteckning=overlay.querySelector("#eof-anteckning").value.trim();
    entry.cat=overlay.querySelector("#eof-cat").value||entry.cat;
    entry.rating=selectedRating;
    entry.comment=overlay.querySelector("#eof-comment").value.trim();
    saveAndSync("objekt");
    overlay.remove();
    if(onSaved)onSaved();
  };
}

function showHistObjModal(title,idx,cat,tillverkare,anteckning){
  var b=document.getElementById("body");
  var existing=b.querySelector("#hist-obj-modal");
  if(existing)existing.remove();
  var overlay=document.createElement("div");
  overlay.id="hist-obj-modal";
  overlay.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px";
  var selectedRating=0;
  overlay.innerHTML="<div style='background:#161616;border-radius:16px;border:1px solid #4fa8ff;padding:20px;width:100%;max-width:400px'>"
    +"<div class='lbl'>Klarmarkera</div>"
    +"<div style='font-size:15px;color:#f2f2f2;margin:8px 0 4px;font-weight:500'>"+esc(title)+"</div>"
    +(tillverkare?"<div style='font-size:12px;color:#5c5c5c'>"+esc(tillverkare)+"</div>":"")
    +(anteckning?"<div style='font-size:12px;color:#5c5c5c;margin-bottom:12px'>"+esc(anteckning)+"</div>":"<div style='margin-bottom:12px'></div>")
    +"<div class='lbl'>Betyg</div>"
    +"<div id='ho-stars' style='display:flex;gap:8px;margin-bottom:4px'>"
    +[1,2,3,4,5,6,7,8,9,10].map(function(n){return "<button data-star='"+n+"' style='font-size:19px;padding:2px;background:none;border:none;cursor:pointer;opacity:0.3'>★</button>";}).join("")
    +"</div>"
    +"<div id='ho-rating-num' style='text-align:left;color:#8c8c8c;font-size:13px;margin-bottom:14px;font-weight:600'>0 / 10</div>"
    +"<div class='lbl'>Kommentar (valfritt)</div>"
    +"<textarea class='ta' id='ho-comment' placeholder='Vad tyckte du?' style='min-height:70px;margin-bottom:12px'></textarea>"
    +"<div style='display:flex;gap:8px'>"
    +"<button class='sec' id='ho-save' style='flex:1'>Spara</button>"
    +"<button class='sec ghost' id='ho-cancel' style='flex:1'>Avbryt</button>"
    +"</div></div>";
  document.body.appendChild(overlay);
  overlay.querySelectorAll("[data-star]").forEach(function(star){
    star.onclick=function(){
      selectedRating=parseInt(star.dataset.star);
      overlay.querySelectorAll("[data-star]").forEach(function(s){
        var on=parseInt(s.dataset.star)<=selectedRating;
        s.style.opacity=on?"1":"0.35";
        s.style.color=on?"#ffcc33":"#5c5c5c";
      });
      var numEl=overlay.querySelector("#ho-rating-num");
      if(numEl)numEl.textContent=selectedRating+" / 10";
    };
  });
  overlay.querySelector("#ho-cancel").onclick=function(){overlay.remove();};
  overlay.querySelector("#ho-save").onclick=function(){
    var comment=overlay.querySelector("#ho-comment").value.trim();
    objFardig.push({title:title,cat:cat,tillverkare:tillverkare||"",anteckning:anteckning||"",rating:selectedRating,comment:comment,timestamp:new Date().toISOString()});
    if(objList[cat])objList[cat].splice(idx,1);
    saveAndSync("objekt");
    overlay.remove();
    renderHistory();
  };
}

function platsCatChipLabel(catName){return mediaCatChipLabel(catName);}

function renderPlats(){
  var c=document.getElementById("utv-content");
  var catSelectHtml="<select id='platscat-select' style='width:100%;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:14px;padding:10px 12px;cursor:pointer;font-family:inherit'>"
    +"<option value=''>Välj kategori</option>"
    +PLATS_CAT_PRESETS.map(function(catName){return "<option value='"+esc(catName)+"'"+(catName===platsCat?" selected":"")+">"+esc(catName)+"</option>";}).join("")
    +"</select>";
  var rawItems=platsCat?(platsList[platsCat]||[]):[];
  var indexed=rawItems.map(function(item,i){return {item:item,i:i};});
  if(platsSortMode==="datum"){
    indexed.sort(function(a,b){
      var ta=(a.item&&a.item.timestamp)?new Date(a.item.timestamp).getTime():0;
      var tb=(b.item&&b.item.timestamp)?new Date(b.item.timestamp).getTime():0;
      return tb-ta;
    });
  } else if(platsSortMode==="kommun"){
    indexed.sort(function(a,b){
      var ca=platsItemKommun(a.item).toLowerCase(),cb=platsItemKommun(b.item).toLowerCase();
      if(!ca&&cb)return 1;
      if(ca&&!cb)return -1;
      return ca.localeCompare(cb,"sv");
    });
  }
  var listHtml=indexed.length
    ?"<div style='background:#131313;border:1px solid #2a2a2a;border-radius:10px;padding:8px 12px;margin-top:12px'>"
      +indexed.map(function(entry){
        var item=entry.item,i=entry.i;
        var title=platsItemTitle(item),kommun=platsItemKommun(item),anteckning=platsItemAnteckning(item);
        return "<div style='padding:8px 0;border-bottom:1px solid #2a2a2a;display:flex;align-items:center;gap:8px'>"
          +"<div data-jumpplats='"+i+"' style='flex:1;min-width:0;cursor:pointer'>"
          +"<div style='font-size:13px;color:#f2f2f2'>"+esc(title)+"</div>"
          +(kommun?"<div style='font-size:11px;color:#5c5c5c'>"+esc(kommun)+"</div>":"")
          +(anteckning?"<div style='font-size:11px;color:#5c5c5c'>"+esc(anteckning)+"</div>":"")
          +"</div>"
          +"<button data-editplats='"+i+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:13px;padding:0 4px;flex-shrink:0'>✏️</button>"
          +"<button data-delplats='"+i+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:16px;padding:0 4px;flex-shrink:0'>x</button>"
          +"</div>";
      }).join("")
      +"</div>"
    :(platsCat?"<div style='font-size:13px;color:#5c5c5c;text-align:center;margin-top:16px;padding:16px'>Inga sparade i "+esc(platsCat)+" ännu.</div>":"");

  var recentItems=getRecentPlatsItems(5);
  var recentHtml=recentItems.length
    ?"<div class='mt20'><div class='lbl'>Senaste 5</div>"
      +"<div style='background:#131313;border:1px solid #2a2a2a;border-radius:10px;padding:8px 12px'>"
      +recentItems.map(function(entry){
        var title=platsItemTitle(entry.item),kommun=platsItemKommun(entry.item),anteckning=platsItemAnteckning(entry.item);
        return "<div style='padding:8px 0;border-bottom:1px solid #2a2a2a;display:flex;align-items:center;gap:8px'>"
          +"<div data-jumpplatsrecent='"+entry.idx+"' data-jumpplatsrecentcat='"+esc(entry.cat)+"' style='flex:1;min-width:0;cursor:pointer'>"
          +"<div style='font-size:11px;color:#4fa8ff;margin-bottom:1px'>"+esc(entry.cat)+"</div>"
          +"<div style='font-size:13px;color:#f2f2f2'>"+esc(title)+"</div>"
          +(kommun?"<div style='font-size:11px;color:#5c5c5c'>"+esc(kommun)+"</div>":"")
          +(anteckning?"<div style='font-size:11px;color:#5c5c5c'>"+esc(anteckning)+"</div>":"")
          +"</div>"
          +"<button data-editplatsrecent='"+entry.idx+"' data-editplatsrecentcat='"+esc(entry.cat)+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:13px;padding:0 4px;flex-shrink:0'>✏️</button>"
          +"<button data-delplatsrecent='"+entry.idx+"' data-delplatsrecentcat='"+esc(entry.cat)+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:16px;padding:0 4px;flex-shrink:0'>x</button>"
          +"</div>";
      }).join("")
      +"</div></div>"
    :"";

  var bodySection=platsCat
    ?("<div class='lbl'>Lägg till</div>"
      +"<input class='inp w100' id='plats-inp' placeholder='Namn på plats...' style='margin-bottom:8px'/>"
      +"<div class='row'>"
      +"<div class='ac-wrap' style='flex-shrink:0'><button class='chip' id='plats-kommun-toggle' type='button' style='background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 12px;cursor:pointer;font-family:inherit;white-space:nowrap;line-height:1'>Kommun ▾</button><div class='ac-dropdown' id='plats-kommun-dd' style='min-width:200px'></div></div>"
      +"<input class='inp' id='plats-kommun-inp' placeholder='Kommun (valfritt)...' style='flex:1'/>"
      +"<button class='chip' id='plats-kommun-add' type='button' style='flex-shrink:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 14px;cursor:pointer;font-family:inherit;line-height:1'>+</button>"
      +"</div>"
      +"<textarea class='ta' id='plats-anteckning-inp' placeholder='Anteckning (valfritt)...' style='min-height:70px;margin-top:6px'></textarea>"
      +"<button class='abtn' id='plats-add' style='width:100%'>+</button>"
      +"<div id='plats-status'></div>"
      +"<div style='display:flex;align-items:center;gap:8px;margin-top:16px'>"
      +"<span style='font-size:12px;color:#5c5c5c;flex-shrink:0'>Sortera efter</span>"
      +"<div style='display:flex;gap:6px;flex:1'>"
      +"<button data-sortplats='datum' style='flex:1;padding:7px 0;border-radius:8px;background:"+(platsSortMode==="datum"?"#1c3c5a":"#131313")+";border:1px solid "+(platsSortMode==="datum"?"#4fa8ff":"#2a2a2a")+";color:"+(platsSortMode==="datum"?"#4fa8ff":"#5c5c5c")+";font-size:12px;cursor:pointer'>Datum</button>"
      +"<button data-sortplats='kommun' style='flex:1;padding:7px 0;border-radius:8px;background:"+(platsSortMode==="kommun"?"#1c3c5a":"#131313")+";border:1px solid "+(platsSortMode==="kommun"?"#4fa8ff":"#2a2a2a")+";color:"+(platsSortMode==="kommun"?"#4fa8ff":"#5c5c5c")+";font-size:12px;cursor:pointer'>Kommun</button>"
      +"</div></div>"
      +(indexed.length?"<div class='lbl' style='margin-top:16px'>Att konsumera</div>":"")
      +listHtml)
    :("<div class='lbl'>Lägg till</div>"
      +"<select id='plats-target-cat' style='width:100%;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:14px;padding:10px 12px;cursor:pointer;font-family:inherit;margin-bottom:8px'>"
      +PLATS_CAT_PRESETS.map(function(cn,i){return "<option value='"+esc(cn)+"'"+(i===0?" selected":"")+">"+esc(cn)+"</option>";}).join("")
      +"</select>"
      +"<input class='inp w100' id='plats-inp' placeholder='Namn på plats...' style='margin-bottom:8px'/>"
      +"<div class='row'>"
      +"<div class='ac-wrap' style='flex-shrink:0'><button class='chip' id='plats-kommun-toggle' type='button' style='background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 12px;cursor:pointer;font-family:inherit;white-space:nowrap;line-height:1'>Kommun ▾</button><div class='ac-dropdown' id='plats-kommun-dd' style='min-width:200px'></div></div>"
      +"<input class='inp' id='plats-kommun-inp' placeholder='Kommun (valfritt)...' style='flex:1'/>"
      +"<button class='chip' id='plats-kommun-add' type='button' style='flex-shrink:0;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:11px 14px;cursor:pointer;font-family:inherit;line-height:1'>+</button>"
      +"</div>"
      +"<textarea class='ta' id='plats-anteckning-inp' placeholder='Anteckning (valfritt)...' style='min-height:70px;margin-top:6px'></textarea>"
      +"<button class='abtn' id='plats-add' style='width:100%'>+</button>"
      +"<div id='plats-status'></div>"
      +recentHtml);

  c.innerHTML="<div class='lbl'>Kategori</div>"
    +catSelectHtml
    +"<button class='sec ghost' id='plats-recension-btn' style='width:100%;margin:12px 0'>📝 Recensioner</button>"
    +bodySection;

  c.querySelectorAll("[data-sortplats]").forEach(function(btn){
    btn.onclick=function(){platsSortMode=btn.dataset.sortplats;renderPlats();};
  });

  var platsCatSel=c.querySelector("#platscat-select");
  if(platsCatSel)platsCatSel.onchange=function(){platsCat=platsCatSel.value;renderPlats();};
  var recBtn=c.querySelector("#plats-recension-btn");
  if(recBtn)recBtn.onclick=function(){platsRecensionCat=platsCat;platsRecensionKommun=null;renderPlatsRecension();};

  var inp=c.querySelector("#plats-inp");
  var kommunInp=c.querySelector("#plats-kommun-inp");
  var anteckningInp=c.querySelector("#plats-anteckning-inp");
  var targetCatSel=c.querySelector("#plats-target-cat");
  var addBtn=c.querySelector("#plats-add");
  if(addBtn)addBtn.onclick=function(){
    var v=inp?inp.value.trim():"";
    if(!v)return;
    var targetCat=platsCat||(targetCatSel?targetCatSel.value:"");
    if(!targetCat)return;
    var kv=kommunInp?kommunInp.value.trim():"";
    var an=anteckningInp?anteckningInp.value.trim():"";
    if(!platsList[targetCat])platsList[targetCat]=[];
    platsList[targetCat].push({title:v,kommun:kv,anteckning:an,timestamp:new Date().toISOString()});
    inp.value="";if(kommunInp)kommunInp.value="";if(anteckningInp)anteckningInp.value="";
    saveAndSync("plats");
    var st=c.querySelector("#plats-status");
    if(st){st.innerHTML="<div class='ok-toast'>Sparat!</div>";setTimeout(function(){if(st)st.innerHTML="";},2000);}
    renderPlats();
  };
  if(inp)inp.onkeydown=function(e){if(e.key==="Enter"&&inp.value.trim()&&addBtn)addBtn.onclick();};
  if(kommunInp)kommunInp.onkeydown=function(e){if(e.key==="Enter"&&inp.value.trim()&&addBtn)addBtn.onclick();};
  bindCatPresetDropdown(kommunInp,c.querySelector("#plats-kommun-toggle"),c.querySelector("#plats-kommun-dd"),c.querySelector("#plats-kommun-add"),function(){return PLATS_KOMMUN_BY_CAT;},function(){return platsCat||(targetCatSel?targetCatSel.value:"");},"inmatningar");

  c.querySelectorAll("[data-editplats]").forEach(function(btn){
    btn.onclick=function(){
      editPendingPlatsItem(platsCat,parseInt(btn.dataset.editplats),renderPlats);
    };
  });
  c.querySelectorAll("[data-delplats]").forEach(function(btn){
    btn.onclick=function(){
      var idx=parseInt(btn.dataset.delplats);
      var item=platsList[platsCat]?platsList[platsCat][idx]:null;
      var title=item?platsItemTitle(item):"";
      confirmDelete("Vill du ta bort \""+esc(title)+"\"?",function(){
        if(platsList[platsCat])platsList[platsCat].splice(idx,1);
        saveAndSync("plats");renderPlats();
      });
    };
  });
  c.querySelectorAll("[data-jumpplats]").forEach(function(el){
    el.onclick=function(){
      var idx=parseInt(el.dataset.jumpplats);
      var item=platsList[platsCat][idx];
      historySubview="betyg";histBetygSubview="plats";
      setView("history");
      renderHistory();
      setTimeout(function(){showHistPlatsModal(platsItemTitle(item),idx,platsCat,platsItemKommun(item),platsItemAnteckning(item));},50);
    };
  });

  // Senaste 5 (only shown when no category chip is selected)
  c.querySelectorAll("[data-editplatsrecent]").forEach(function(btn){
    btn.onclick=function(){
      editPendingPlatsItem(btn.dataset.editplatsrecentcat,parseInt(btn.dataset.editplatsrecent),renderPlats);
    };
  });
  c.querySelectorAll("[data-delplatsrecent]").forEach(function(btn){
    btn.onclick=function(){
      var cat=btn.dataset.delplatsrecentcat;
      var idx=parseInt(btn.dataset.delplatsrecent);
      var item=platsList[cat]?platsList[cat][idx]:null;
      var title=item?platsItemTitle(item):"";
      confirmDelete("Vill du ta bort \""+esc(title)+"\"?",function(){
        if(platsList[cat])platsList[cat].splice(idx,1);
        saveAndSync("plats");renderPlats();
      });
    };
  });
  c.querySelectorAll("[data-jumpplatsrecent]").forEach(function(el){
    el.onclick=function(){
      var cat=el.dataset.jumpplatsrecentcat;
      var idx=parseInt(el.dataset.jumpplatsrecent);
      var item=platsList[cat][idx];
      historySubview="betyg";histBetygSubview="plats";
      setView("history");
      renderHistory();
      setTimeout(function(){showHistPlatsModal(platsItemTitle(item),idx,cat,platsItemKommun(item),platsItemAnteckning(item));},50);
    };
  });
}

function renderPlatsRecension(){
  if(platsRecensionKommun!==null)return renderPlatsRecensionByKommun();

  var c=document.getElementById("utv-content");
  if(!platsRecensionCat||PLATS_CAT_PRESETS.indexOf(platsRecensionCat)<0)platsRecensionCat=PLATS_CAT_PRESETS[0]||"";
  var catOptions=PLATS_CAT_PRESETS.map(function(catName){return "<option value='"+esc(catName)+"'"+(catName===platsRecensionCat?" selected":"")+">"+esc(catName)+"</option>";}).join("");

  var entries=platsFardig.filter(function(e){return e.cat===platsRecensionCat;});
  var counts={};
  entries.forEach(function(e){
    var key=e.kommun?e.kommun:PLATS_UNKNOWN_KOMMUN;
    counts[key]=(counts[key]||0)+1;
  });
  var kommuner=Object.keys(counts).filter(function(k){return k!==PLATS_UNKNOWN_KOMMUN;}).sort(function(a,b){return a.toLowerCase().localeCompare(b.toLowerCase(),"sv");});
  if(counts[PLATS_UNKNOWN_KOMMUN])kommuner.push(PLATS_UNKNOWN_KOMMUN);

  var list=kommuner.length?kommuner.map(function(kv){
    var label=kv===PLATS_UNKNOWN_KOMMUN?"Okänd kommun":kv;
    return "<div class='khist' style='display:flex;align-items:center;gap:8px' data-reckommun='"+esc(kv)+"'>"
      +"<div style='flex:1;min-width:0'><div class='kmsg' style='white-space:normal;font-weight:600'>"+esc(label)+"</div>"
      +"<div class='kmeta'><span class='kbadge'>"+counts[kv]+" recensioner</span></div></div>"
      +"</div>";
  }).join(""):"<div class='empty' style='padding:30px 0'><div class='eico'>📝</div>Inga recensioner i denna kategori annu.</div>";

  c.innerHTML="<button class='sec ghost' id='platsrec-back' style='margin-bottom:16px'>&#8592; Tillbaka</button>"
    +"<div class='lbl'>Recensioner</div>"
    +"<select id='platsrec-cat-select' style='width:100%;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:14px;padding:10px 12px;cursor:pointer;font-family:inherit;margin-bottom:14px'>"+catOptions+"</select>"
    +"<div class='lbl'>Kommuner</div>"+list;

  c.querySelector("#platsrec-back").onclick=function(){renderPlats();};
  var sel=c.querySelector("#platsrec-cat-select");
  if(sel)sel.onchange=function(){platsRecensionCat=sel.value;renderPlatsRecension();};
  c.querySelectorAll("[data-reckommun]").forEach(function(el){
    el.onclick=function(){platsRecensionKommun=el.dataset.reckommun;renderPlatsRecension();};
  });
}

function renderPlatsRecensionByKommun(){
  var c=document.getElementById("utv-content");
  var isUnknown=platsRecensionKommun===PLATS_UNKNOWN_KOMMUN;
  var label=isUnknown?"Okänd kommun":platsRecensionKommun;

  var entries=platsFardig.filter(function(e){
    return e.cat===platsRecensionCat&&(isUnknown?!e.kommun:e.kommun===platsRecensionKommun);
  });
  entries.sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);});

  var list=entries.length?entries.map(function(e){
    var stars=[1,2,3,4,5,6,7,8,9,10].map(function(n){return n<=e.rating?"★":"☆";}).join("");
    var idx=platsFardig.indexOf(e);
    return "<div style='padding:10px 14px;background:#131313;border:1px solid #2a2a2a;border-radius:10px;margin-bottom:8px'>"
      +"<div style='display:flex;align-items:center;gap:8px'>"
      +"<div style='flex:1;font-size:13px;color:#f2f2f2;font-weight:500'>"+esc(e.title)+"</div>"
      +"<span style='color:#c9a24a;font-size:14px;letter-spacing:1px'>"+stars+"</span>"
      +"<button data-editplatsrec='"+idx+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:14px;padding:0 4px;flex-shrink:0'>✏️</button>"
      +"</div>"
      +(e.anteckning?"<div style='font-size:11px;color:#5c5c5c;margin-top:2px'>"+esc(e.anteckning)+"</div>":"")
      +(e.comment?"<div style='font-size:12px;color:#5c5c5c;margin-top:4px;line-height:1.5'>"+esc(e.comment)+"</div>":"")
      +"<div style='font-size:10px;color:#5c5c5c;margin-top:4px'>"+fd(e.timestamp)+"</div>"
      +"</div>";
  }).join(""):"<div class='empty' style='padding:30px 0'><div class='eico'>📝</div>Inga recensioner annu.</div>";

  c.innerHTML="<button class='sec ghost' id='platsrec-back-kommun' style='margin-bottom:16px'>&#8592; Alla kommuner</button>"
    +"<div class='lbl'>"+esc(label)+"</div>"+list;

  c.querySelector("#platsrec-back-kommun").onclick=function(){platsRecensionKommun=null;renderPlatsRecension();};
  c.querySelectorAll("[data-editplatsrec]").forEach(function(btn){
    btn.onclick=function(){
      var e=platsFardig[parseInt(btn.dataset.editplatsrec)];
      if(e)editPlatsFardigEntry(e,renderPlatsRecensionByKommun);
    };
  });
}

function editPendingPlatsItem(cat,idx,onSaved){
  var item=(platsList[cat]||[])[idx];
  if(!item)return;
  var title=platsItemTitle(item),kommun=platsItemKommun(item),anteckning=platsItemAnteckning(item);
  var overlay=document.createElement("div");
  overlay.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px";
  overlay.innerHTML="<div style='background:#161616;border-radius:16px;border:1px solid #4fa8ff;padding:20px;width:100%;max-width:380px'>"
    +"<div class='lbl' style='margin-bottom:10px'>Kategori</div>"
    +"<select class='inp w100' id='edit-plats-cat-inp' style='margin-bottom:12px'>"
    +PLATS_CAT_PRESETS.map(function(cn){return "<option value='"+esc(cn)+"'"+(cn===cat?" selected":"")+">"+esc(cn)+"</option>";}).join("")
    +"</select>"
    +"<div class='lbl' style='margin-bottom:10px'>Ändra titel</div>"
    +"<input class='inp w100' id='edit-plats-inp' value='"+esc(title)+"' style='margin-bottom:10px'/>"
    +"<div class='lbl' style='margin-bottom:10px'>Kommun</div>"
    +"<input class='inp w100' id='edit-plats-kommun-inp' value='"+esc(kommun)+"' style='margin-bottom:10px'/>"
    +"<div class='lbl' style='margin-bottom:10px'>Anteckning</div>"
    +"<textarea class='ta w100' id='edit-plats-anteckning-inp' style='margin-bottom:12px;min-height:70px'>"+esc(anteckning)+"</textarea>"
    +"<div style='display:flex;gap:8px'>"
    +"<button id='edit-plats-save' style='flex:1;padding:10px;border-radius:8px;background:#1c3c5a;border:1px solid #4fa8ff;color:#4fa8ff;font-size:13px;cursor:pointer;font-family:inherit'>Spara</button>"
    +"<button id='edit-plats-cancel' style='flex:1;padding:10px;border-radius:8px;background:#131313;border:1px solid #2a2a2a;color:#5c5c5c;font-size:13px;cursor:pointer;font-family:inherit'>Avbryt</button>"
    +"</div></div>";
  document.body.appendChild(overlay);
  var tInp=overlay.querySelector("#edit-plats-inp");
  var vInp=overlay.querySelector("#edit-plats-kommun-inp");
  var oInp=overlay.querySelector("#edit-plats-anteckning-inp");
  tInp.focus();tInp.select();
  overlay.querySelector("#edit-plats-cancel").onclick=function(){overlay.remove();};
  overlay.querySelector("#edit-plats-save").onclick=function(){
    var val=tInp.value.trim();
    var kvVal=vInp.value.trim();
    var anVal=oInp.value.trim();
    var newCat=overlay.querySelector("#edit-plats-cat-inp").value||cat;
    if(val&&platsList[cat]){
      var updated={title:val,kommun:kvVal,anteckning:anVal,timestamp:item.timestamp||new Date().toISOString()};
      if(newCat===cat){
        platsList[cat][idx]=updated;
      } else {
        platsList[cat].splice(idx,1);
        if(!platsList[newCat])platsList[newCat]=[];
        platsList[newCat].push(updated);
      }
      saveAndSync("plats");
      overlay.remove();
      if(onSaved)onSaved();
    }
  };
  tInp.onkeydown=function(e){if(e.key==="Enter")overlay.querySelector("#edit-plats-save").onclick();if(e.key==="Escape")overlay.remove();};
}

function editPlatsFardigEntry(entry,onSaved){
  var selectedRating=entry.rating||0;
  var overlay=document.createElement("div");
  overlay.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px";
  overlay.innerHTML="<div style='background:#161616;border-radius:16px;border:1px solid #4fa8ff;padding:20px;width:100%;max-width:400px'>"
    +"<div class='lbl' style='margin-bottom:8px'>Kategori</div>"
    +"<select class='inp w100' id='epf-cat' style='margin-bottom:12px'>"
    +PLATS_CAT_PRESETS.map(function(cn){return "<option value='"+esc(cn)+"'"+(cn===entry.cat?" selected":"")+">"+esc(cn)+"</option>";}).join("")
    +"</select>"
    +"<div class='lbl' style='margin-bottom:8px'>Namn</div>"
    +"<input class='inp w100' id='epf-title' value='"+esc(entry.title)+"' style='margin-bottom:12px'/>"
    +"<div class='lbl' style='margin-bottom:8px'>Kommun</div>"
    +"<input class='inp w100' id='epf-kommun' value='"+esc(entry.kommun||"")+"' style='margin-bottom:12px'/>"
    +"<div class='lbl' style='margin-bottom:8px'>Anteckning</div>"
    +"<textarea class='ta w100' id='epf-anteckning' style='margin-bottom:12px;min-height:70px'>"+esc(entry.anteckning||"")+"</textarea>"
    +"<div class='lbl' style='margin-bottom:8px'>Betyg</div>"
    +"<div id='epf-stars' style='display:flex;gap:8px;margin-bottom:4px'>"
    +[1,2,3,4,5,6,7,8,9,10].map(function(n){var on=n<=selectedRating;return "<button data-star='"+n+"' style='font-size:19px;padding:2px;background:none;border:none;cursor:pointer;color:"+(on?"#ffcc33":"#5c5c5c")+";opacity:"+(on?"1":"0.35")+"'>★</button>";}).join("")
    +"</div>"
    +"<div id='epf-rating-num' style='text-align:left;color:#8c8c8c;font-size:13px;margin-bottom:14px;font-weight:600'>"+selectedRating+" / 10</div>"
    +"<div class='lbl' style='margin-bottom:8px'>Kommentar</div>"
    +"<textarea class='ta' id='epf-comment' style='min-height:70px;margin-bottom:14px'>"+esc(entry.comment||"")+"</textarea>"
    +"<div style='display:flex;gap:8px'>"
    +"<button id='epf-save' style='flex:1;padding:10px;border-radius:8px;background:#1c3c5a;border:1px solid #4fa8ff;color:#4fa8ff;font-size:13px;cursor:pointer;font-family:inherit'>Spara</button>"
    +"<button id='epf-cancel' style='flex:1;padding:10px;border-radius:8px;background:#131313;border:1px solid #2a2a2a;color:#5c5c5c;font-size:13px;cursor:pointer;font-family:inherit'>Avbryt</button>"
    +"</div></div>";
  document.body.appendChild(overlay);
  overlay.querySelectorAll("[data-star]").forEach(function(star){
    star.onclick=function(){
      selectedRating=parseInt(star.dataset.star);
      overlay.querySelectorAll("[data-star]").forEach(function(s){
        var on=parseInt(s.dataset.star)<=selectedRating;
        s.style.opacity=on?"1":"0.35";
        s.style.color=on?"#ffcc33":"#5c5c5c";
      });
      var numEl=overlay.querySelector("#epf-rating-num");
      if(numEl)numEl.textContent=selectedRating+" / 10";
    };
  });
  overlay.querySelector("#epf-cancel").onclick=function(){overlay.remove();};
  overlay.querySelector("#epf-save").onclick=function(){
    var title=overlay.querySelector("#epf-title").value.trim();
    if(!title)return;
    entry.title=title;
    entry.kommun=overlay.querySelector("#epf-kommun").value.trim();
    entry.anteckning=overlay.querySelector("#epf-anteckning").value.trim();
    entry.cat=overlay.querySelector("#epf-cat").value||entry.cat;
    entry.rating=selectedRating;
    entry.comment=overlay.querySelector("#epf-comment").value.trim();
    saveAndSync("plats");
    overlay.remove();
    if(onSaved)onSaved();
  };
}

function showHistPlatsModal(title,idx,cat,kommun,anteckning){
  var b=document.getElementById("body");
  var existing=b.querySelector("#hist-plats-modal");
  if(existing)existing.remove();
  var overlay=document.createElement("div");
  overlay.id="hist-plats-modal";
  overlay.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px";
  var selectedRating=0;
  overlay.innerHTML="<div style='background:#161616;border-radius:16px;border:1px solid #4fa8ff;padding:20px;width:100%;max-width:400px'>"
    +"<div class='lbl'>Klarmarkera</div>"
    +"<div style='font-size:15px;color:#f2f2f2;margin:8px 0 4px;font-weight:500'>"+esc(title)+"</div>"
    +(kommun?"<div style='font-size:12px;color:#5c5c5c'>"+esc(kommun)+"</div>":"")
    +(anteckning?"<div style='font-size:12px;color:#5c5c5c;margin-bottom:12px'>"+esc(anteckning)+"</div>":"<div style='margin-bottom:12px'></div>")
    +"<div class='lbl'>Betyg</div>"
    +"<div id='hp-stars' style='display:flex;gap:8px;margin-bottom:4px'>"
    +[1,2,3,4,5,6,7,8,9,10].map(function(n){return "<button data-star='"+n+"' style='font-size:19px;padding:2px;background:none;border:none;cursor:pointer;opacity:0.3'>★</button>";}).join("")
    +"</div>"
    +"<div id='hp-rating-num' style='text-align:left;color:#8c8c8c;font-size:13px;margin-bottom:14px;font-weight:600'>0 / 10</div>"
    +"<div class='lbl'>Kommentar (valfritt)</div>"
    +"<textarea class='ta' id='hp-comment' placeholder='Vad tyckte du?' style='min-height:70px;margin-bottom:12px'></textarea>"
    +"<div style='display:flex;gap:8px'>"
    +"<button class='sec' id='hp-save' style='flex:1'>Spara</button>"
    +"<button class='sec ghost' id='hp-cancel' style='flex:1'>Avbryt</button>"
    +"</div></div>";
  document.body.appendChild(overlay);
  overlay.querySelectorAll("[data-star]").forEach(function(star){
    star.onclick=function(){
      selectedRating=parseInt(star.dataset.star);
      overlay.querySelectorAll("[data-star]").forEach(function(s){
        var on=parseInt(s.dataset.star)<=selectedRating;
        s.style.opacity=on?"1":"0.35";
        s.style.color=on?"#ffcc33":"#5c5c5c";
      });
      var numEl=overlay.querySelector("#hp-rating-num");
      if(numEl)numEl.textContent=selectedRating+" / 10";
    };
  });
  overlay.querySelector("#hp-cancel").onclick=function(){overlay.remove();};
  overlay.querySelector("#hp-save").onclick=function(){
    var comment=overlay.querySelector("#hp-comment").value.trim();
    platsFardig.push({title:title,cat:cat,kommun:kommun||"",anteckning:anteckning||"",rating:selectedRating,comment:comment,timestamp:new Date().toISOString()});
    if(platsList[cat])platsList[cat].splice(idx,1);
    saveAndSync("plats");
    overlay.remove();
    renderHistory();
  };
}

function renderMediaRecension(){
  if(mediaRecensionCreator!==null)return renderMediaRecensionByCreator();

  var c=document.getElementById("utv-content");
  if(!mediaRecensionCat||MEDIA_CAT_PRESETS.indexOf(mediaRecensionCat)<0)mediaRecensionCat=MEDIA_CAT_PRESETS[0]||"";
  var catOptions=MEDIA_CAT_PRESETS.map(function(catName){return "<option value='"+esc(catName)+"'"+(catName===mediaRecensionCat?" selected":"")+">"+esc(catName)+"</option>";}).join("");

  c.innerHTML="<button class='sec ghost' id='rec-back' style='margin-bottom:16px'>&#8592; Tillbaka</button>"
    +"<div class='lbl'>Recensioner</div>"
    +"<select id='rec-cat-select' style='width:100%;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:14px;padding:10px 12px;cursor:pointer;font-family:inherit;margin-bottom:10px'>"+catOptions+"</select>"
    +"<input class='inp w100' id='rec-search' placeholder='Sök kreatör, titel eller genre...' style='margin-bottom:14px' value='"+esc(mediaRecensionSearch)+"'/>"
    +"<div style='display:flex;align-items:center;gap:8px;margin-bottom:10px'>"
    +"<div class='lbl' style='margin:0;flex:1'>Kreatörer</div>"
    +"<button class='mode-btn"+(mediaRecensionBookshelf?" on":"")+"' id='rec-bookshelf-btn' style='font-size:11px'>📚 Bokhylla</button>"
    +"</div>"
    +"<div id='rec-bookshelf-bar'></div>"
    +"<div id='rec-creators-list'></div>";

  c.querySelector("#rec-back").onclick=function(){renderLogMedia();};
  var sel=c.querySelector("#rec-cat-select");
  if(sel)sel.onchange=function(){mediaRecensionCat=sel.value;mediaRecensionSearch="";mediaRecensionBookshelf=false;mediaRecensionLetter="";renderMediaRecension();};
  var searchInp=c.querySelector("#rec-search");
  if(searchInp)searchInp.oninput=function(){mediaRecensionSearch=searchInp.value;updateMediaRecCreatorsList();};
  c.querySelector("#rec-bookshelf-btn").onclick=function(){
    mediaRecensionBookshelf=!mediaRecensionBookshelf;
    mediaRecensionLetter="";
    renderMediaRecension();
  };
  updateMediaRecCreatorsList();
}

// Bygger om kreatörslistan (+ ev. bokhylle-bokstavsraden) utan att röra resten av vyn,
// sa att sökfältet inte tappar fokus medan man skriver.
// Vid sökning eller bokhylla visas posterna platt (som Historik -> Betyg), annars mappar per kreatör.
function updateMediaRecCreatorsList(){
  var listEl=document.getElementById("rec-creators-list");
  var barEl=document.getElementById("rec-bookshelf-bar");
  if(!listEl)return;

  var q=mediaRecensionSearch.trim().toLowerCase();
  var entries=mediaFardig.filter(function(e){
    if(e.cat!==mediaRecensionCat)return false;
    if(!q)return true;
    return (e.creator&&e.creator.toLowerCase().indexOf(q)>=0)
      ||(e.title&&e.title.toLowerCase().indexOf(q)>=0)
      ||(e.genre&&e.genre.toLowerCase().indexOf(q)>=0);
  });
  var counts={};
  entries.forEach(function(e){
    var key=e.creator?e.creator:MEDIA_UNKNOWN_CREATOR;
    counts[key]=(counts[key]||0)+1;
  });
  var allCreators=Object.keys(counts).filter(function(k){return k!==MEDIA_UNKNOWN_CREATOR;}).sort(function(a,b){return a.toLowerCase().localeCompare(b.toLowerCase(),"sv");});
  if(counts[MEDIA_UNKNOWN_CREATOR])allCreators.push(MEDIA_UNKNOWN_CREATOR);

  if(barEl){
    if(mediaRecensionBookshelf){
      var availLetters={};
      allCreators.forEach(function(cr){if(cr!==MEDIA_UNKNOWN_CREATOR)availLetters[cr.charAt(0).toUpperCase()]=true;});
      barEl.innerHTML="<div style='display:flex;flex-wrap:wrap;gap:4px;margin-bottom:14px'>"
        +MEDIA_REC_ALPHABET.map(function(l){
          var has=!!availLetters[l];
          var active=mediaRecensionLetter===l;
          return "<button data-recletter='"+l+"'"+(has?"":" disabled")+" style='min-width:26px;padding:6px 0;font-size:11px;border-radius:6px;border:1px solid "+(active?"#c9a24a":"#2a2a2a")+";background:"+(active?"#c9a24a":"#161616")+";color:"+(active?"#161616":(has?"#f2f2f2":"#3a3a3a"))+";cursor:"+(has?"pointer":"default")+"'>"+l+"</button>";
        }).join("")
        +"<button data-recletter='' style='padding:6px 10px;font-size:11px;border-radius:6px;border:1px solid #2a2a2a;background:"+(!mediaRecensionLetter?"#c9a24a":"#161616")+";color:"+(!mediaRecensionLetter?"#161616":"#f2f2f2")+";cursor:pointer'>Alla</button>"
        +"</div>";
      barEl.querySelectorAll("[data-recletter]").forEach(function(btn){
        if(btn.disabled)return;
        btn.onclick=function(){
          var l=btn.dataset.recletter;
          mediaRecensionLetter=mediaRecensionLetter===l?"":l;
          updateMediaRecCreatorsList();
        };
      });
    }else{
      barEl.innerHTML="";
    }
  }

  var flatMode=mediaRecensionBookshelf||!!q;

  if(flatMode){
    var flatEntries=entries.slice();
    if(mediaRecensionBookshelf&&mediaRecensionLetter){
      flatEntries=flatEntries.filter(function(e){
        var cr=e.creator?e.creator:"";
        return cr.charAt(0).toUpperCase()===mediaRecensionLetter;
      });
    }
    flatEntries.sort(function(a,b){
      var ca=(a.creator||"").toLowerCase(),cb=(b.creator||"").toLowerCase();
      if(ca!==cb)return ca.localeCompare(cb,"sv");
      return new Date(b.timestamp)-new Date(a.timestamp);
    });

    listEl.innerHTML=flatEntries.length?flatEntries.map(function(e){
      var stars=[1,2,3,4,5,6,7,8,9,10].map(function(n){return n<=e.rating?"★":"☆";}).join("");
      var idx=mediaFardig.indexOf(e);
      return "<div style='padding:10px 14px;background:#131313;border:1px solid #2a2a2a;border-radius:10px;margin-bottom:8px'>"
        +"<div style='display:flex;align-items:center;gap:8px'>"
        +"<div style='flex:1;font-size:13px;color:#f2f2f2;font-weight:500'>"+esc(e.title)+"</div>"
        +"<span style='color:#c9a24a;font-size:14px;letter-spacing:1px'>"+stars+"</span>"
        +"<button data-editflatrec='"+idx+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:14px;padding:0 4px;flex-shrink:0'>✏️</button>"
        +"</div>"
        +(e.creator?"<div style='font-size:11px;color:#5c5c5c;margin-top:2px'>"+esc(e.creator)+"</div>":"")
        +(e.genre?"<div style='font-size:11px;color:#5c5c5c;margin-top:2px'>"+esc(e.genre)+"</div>":"")
        +(e.anteckning?"<div style='font-size:11px;color:#5c5c5c;margin-top:2px'>"+esc(e.anteckning)+"</div>":"")
        +(e.comment?"<div style='font-size:12px;color:#5c5c5c;margin-top:4px;line-height:1.5'>"+esc(e.comment)+"</div>":"")
        +"<div style='font-size:10px;color:#5c5c5c;margin-top:4px'>"+fd(e.timestamp)+"</div>"
        +"</div>";
    }).join(""):"<div class='empty' style='padding:30px 0'><div class='eico'>📝</div>Inga träffar.</div>";

    listEl.querySelectorAll("[data-editflatrec]").forEach(function(btn){
      btn.onclick=function(){
        var e=mediaFardig[parseInt(btn.dataset.editflatrec)];
        if(e)editMediaFardigEntry(e,updateMediaRecCreatorsList);
      };
    });
    return;
  }

  var creators=allCreators;
  listEl.innerHTML=creators.length?creators.map(function(cr){
    var label=cr===MEDIA_UNKNOWN_CREATOR?"Okänd kreatör":cr;
    return "<div class='khist' style='display:flex;align-items:center;gap:8px' data-reccreator='"+esc(cr)+"'>"
      +"<div style='flex:1;min-width:0'><div class='kmsg' style='white-space:normal;font-weight:600'>"+esc(label)+"</div>"
      +"<div class='kmeta'><span class='kbadge'>"+counts[cr]+" recensioner</span></div></div>"
      +"</div>";
  }).join(""):"<div class='empty' style='padding:30px 0'><div class='eico'>📝</div>Inga recensioner i denna kategori annu.</div>";

  listEl.querySelectorAll("[data-reccreator]").forEach(function(el){
    el.onclick=function(){mediaRecensionCreator=el.dataset.reccreator;renderMediaRecension();};
  });
}

function renderMediaRecensionByCreator(){
  var c=document.getElementById("utv-content");
  var isUnknown=mediaRecensionCreator===MEDIA_UNKNOWN_CREATOR;
  var label=isUnknown?"Okänd kreatör":mediaRecensionCreator;

  var entries=mediaFardig.filter(function(e){
    return e.cat===mediaRecensionCat&&(isUnknown?!e.creator:e.creator===mediaRecensionCreator);
  });
  entries.sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);});

  var list=entries.length?entries.map(function(e){
    var stars=[1,2,3,4,5,6,7,8,9,10].map(function(n){return n<=e.rating?"★":"☆";}).join("");
    var idx=mediaFardig.indexOf(e);
    return "<div style='padding:10px 14px;background:#131313;border:1px solid #2a2a2a;border-radius:10px;margin-bottom:8px'>"
      +"<div style='display:flex;align-items:center;gap:8px'>"
      +"<div style='flex:1;font-size:13px;color:#f2f2f2;font-weight:500'>"+esc(e.title)+"</div>"
      +"<span style='color:#c9a24a;font-size:14px;letter-spacing:1px'>"+stars+"</span>"
      +"<button data-editrec='"+idx+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:14px;padding:0 4px;flex-shrink:0'>✏️</button>"
      +"</div>"
      +(e.genre?"<div style='font-size:11px;color:#5c5c5c;margin-top:2px'>"+esc(e.genre)+"</div>":"")
      +(e.anteckning?"<div style='font-size:11px;color:#5c5c5c;margin-top:2px'>"+esc(e.anteckning)+"</div>":"")
      +(e.comment?"<div style='font-size:12px;color:#5c5c5c;margin-top:4px;line-height:1.5'>"+esc(e.comment)+"</div>":"")
      +"<div style='font-size:10px;color:#5c5c5c;margin-top:4px'>"+fd(e.timestamp)+"</div>"
      +"</div>";
  }).join(""):"<div class='empty' style='padding:30px 0'><div class='eico'>📝</div>Inga recensioner annu.</div>";

  c.innerHTML="<button class='sec ghost' id='rec-back-creators' style='margin-bottom:16px'>&#8592; Alla kreatörer</button>"
    +"<div class='lbl'>"+esc(label)+"</div>"+list;

  c.querySelector("#rec-back-creators").onclick=function(){mediaRecensionCreator=null;renderMediaRecension();};
  c.querySelectorAll("[data-editrec]").forEach(function(btn){
    btn.onclick=function(){
      var e=mediaFardig[parseInt(btn.dataset.editrec)];
      if(e)editMediaFardigEntry(e,renderMediaRecensionByCreator);
    };
  });
}

function editPendingMediaItem(cat,idx,onSaved){
  var item=(mediaList[cat]||[])[idx];
  if(!item)return;
  var title=mediaItemTitle(item),creator=mediaItemCreator(item),anteckning=mediaItemAnteckning(item);
  var initialGenres=mediaItemGenresArr(item);
  var overlay=document.createElement("div");
  overlay.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px";
  overlay.innerHTML="<div style='background:#161616;border-radius:16px;border:1px solid #4fa8ff;padding:20px;width:100%;max-width:380px'>"
    +"<div class='lbl' style='margin-bottom:10px'>Kategori</div>"
    +"<select class='inp w100' id='edit-med-cat-inp' style='margin-bottom:12px'>"
    +MEDIA_CAT_PRESETS.map(function(cn){return "<option value='"+esc(cn)+"'"+(cn===cat?" selected":"")+">"+esc(cn)+"</option>";}).join("")
    +"</select>"
    +"<div class='lbl' style='margin-bottom:10px'>Ändra titel</div>"
    +"<input class='inp w100' id='edit-med-inp' value='"+esc(title)+"' style='margin-bottom:10px'/>"
    +"<div class='lbl' style='margin-bottom:10px'>Kreatör</div>"
    +"<input class='inp w100' id='edit-med-creator-inp' value='"+esc(creator)+"' style='margin-bottom:10px'/>"
    +"<div class='lbl' style='margin-bottom:10px'>Genrer</div>"
    +mediaGenrePickerHtml("edit-med-genre")
    +"<div class='lbl' style='margin:12px 0 10px'>Anteckning</div>"
    +"<textarea class='ta w100' id='edit-med-anteckning-inp' style='margin-bottom:12px;min-height:70px'>"+esc(anteckning)+"</textarea>"
    +"<div style='display:flex;gap:8px'>"
    +"<button id='edit-med-save' style='flex:1;padding:10px;border-radius:8px;background:#1c3c5a;border:1px solid #4fa8ff;color:#4fa8ff;font-size:13px;cursor:pointer;font-family:inherit'>Spara</button>"
    +"<button id='edit-med-cancel' style='flex:1;padding:10px;border-radius:8px;background:#131313;border:1px solid #2a2a2a;color:#5c5c5c;font-size:13px;cursor:pointer;font-family:inherit'>Avbryt</button>"
    +"</div></div>";
  document.body.appendChild(overlay);
  var tInp=overlay.querySelector("#edit-med-inp");
  var cInp=overlay.querySelector("#edit-med-creator-inp");
  var aInp=overlay.querySelector("#edit-med-anteckning-inp");
  var catSelEl=overlay.querySelector("#edit-med-cat-inp");
  tInp.focus();tInp.select();
  var genrePicker=bindMediaGenrePicker(overlay,"edit-med-genre",function(){return catSelEl.value||cat;},initialGenres);
  overlay.querySelector("#edit-med-cancel").onclick=function(){overlay.remove();};
  overlay.querySelector("#edit-med-save").onclick=function(){
    var val=tInp.value.trim();
    var crVal=cInp.value.trim();
    var anVal=aInp.value.trim();
    var newCat=catSelEl.value||cat;
    if(val&&mediaList[cat]){
      var updated={title:val,creator:crVal,anteckning:anVal,timestamp:item.timestamp||new Date().toISOString()};
      var chosenGenres=genrePicker.getSelected();
      if(chosenGenres.length)updated.genres=chosenGenres;
      if(newCat===cat){
        mediaList[cat][idx]=updated;
      } else {
        mediaList[cat].splice(idx,1);
        if(!mediaList[newCat])mediaList[newCat]=[];
        mediaList[newCat].push(updated);
      }
      saveAndSync("media");
      overlay.remove();
      if(onSaved)onSaved();
    }
  };
  tInp.onkeydown=function(e){if(e.key==="Enter")overlay.querySelector("#edit-med-save").onclick();if(e.key==="Escape")overlay.remove();};
}

function editMediaFardigEntry(entry,onSaved){
  var selectedRating=entry.rating||0;
  var initialGenres=mediaItemGenresArr(entry);
  var overlay=document.createElement("div");
  overlay.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px";
  overlay.innerHTML="<div style='background:#161616;border-radius:16px;border:1px solid #4fa8ff;padding:20px;width:100%;max-width:400px'>"
    +"<div class='lbl' style='margin-bottom:8px'>Kategori</div>"
    +"<select class='inp w100' id='emf-cat' style='margin-bottom:12px'>"
    +MEDIA_CAT_PRESETS.map(function(cn){return "<option value='"+esc(cn)+"'"+(cn===entry.cat?" selected":"")+">"+esc(cn)+"</option>";}).join("")
    +"</select>"
    +"<div class='lbl' style='margin-bottom:8px'>Namn</div>"
    +"<input class='inp w100' id='emf-title' value='"+esc(entry.title)+"' style='margin-bottom:12px'/>"
    +"<div class='lbl' style='margin-bottom:8px'>Kreatör</div>"
    +"<input class='inp w100' id='emf-creator' value='"+esc(entry.creator||"")+"' style='margin-bottom:12px'/>"
    +"<div class='lbl' style='margin-bottom:8px'>Genrer</div>"
    +mediaGenrePickerHtml("emf-genre")
    +"<div class='lbl' style='margin:12px 0 8px'>Anteckning</div>"
    +"<textarea class='ta w100' id='emf-anteckning' style='margin-bottom:12px;min-height:70px'>"+esc(entry.anteckning||"")+"</textarea>"
    +"<div class='lbl' style='margin-bottom:8px'>Betyg</div>"
    +"<div id='emf-stars' style='display:flex;gap:8px;margin-bottom:4px'>"
    +[1,2,3,4,5,6,7,8,9,10].map(function(n){var on=n<=selectedRating;return "<button data-star='"+n+"' style='font-size:19px;padding:2px;background:none;border:none;cursor:pointer;color:"+(on?"#ffcc33":"#5c5c5c")+";opacity:"+(on?"1":"0.35")+"'>★</button>";}).join("")
    +"</div>"
    +"<div id='emf-rating-num' style='text-align:left;color:#8c8c8c;font-size:13px;margin-bottom:14px;font-weight:600'>"+selectedRating+" / 10</div>"
    +"<div class='lbl' style='margin-bottom:8px'>Kommentar</div>"
    +"<textarea class='ta' id='emf-comment' style='min-height:70px;margin-bottom:14px'>"+esc(entry.comment||"")+"</textarea>"
    +"<div style='display:flex;gap:8px'>"
    +"<button id='emf-save' style='flex:1;padding:10px;border-radius:8px;background:#1c3c5a;border:1px solid #4fa8ff;color:#4fa8ff;font-size:13px;cursor:pointer;font-family:inherit'>Spara</button>"
    +"<button id='emf-cancel' style='flex:1;padding:10px;border-radius:8px;background:#131313;border:1px solid #2a2a2a;color:#5c5c5c;font-size:13px;cursor:pointer;font-family:inherit'>Avbryt</button>"
    +"</div></div>";
  document.body.appendChild(overlay);
  var catSelEl=overlay.querySelector("#emf-cat");
  var genrePicker=bindMediaGenrePicker(overlay,"emf-genre",function(){return catSelEl.value||entry.cat;},initialGenres);
  overlay.querySelectorAll("[data-star]").forEach(function(star){
    star.onclick=function(){
      selectedRating=parseInt(star.dataset.star);
      overlay.querySelectorAll("[data-star]").forEach(function(s){
        var on=parseInt(s.dataset.star)<=selectedRating;
        s.style.opacity=on?"1":"0.35";
        s.style.color=on?"#ffcc33":"#5c5c5c";
      });
      var numEl=overlay.querySelector("#emf-rating-num");
      if(numEl)numEl.textContent=selectedRating+" / 10";
    };
  });
  overlay.querySelector("#emf-cancel").onclick=function(){overlay.remove();};
  overlay.querySelector("#emf-save").onclick=function(){
    var title=overlay.querySelector("#emf-title").value.trim();
    if(!title)return;
    entry.title=title;
    entry.creator=overlay.querySelector("#emf-creator").value.trim();
    var chosenGenres=genrePicker.getSelected();
    if(chosenGenres.length){entry.genres=chosenGenres;entry.genre=chosenGenres.join(", ");}
    else{delete entry.genres;entry.genre="";}
    entry.anteckning=overlay.querySelector("#emf-anteckning").value.trim();
    entry.cat=overlay.querySelector("#emf-cat").value||entry.cat;
    entry.rating=selectedRating;
    entry.comment=overlay.querySelector("#emf-comment").value.trim();
    saveAndSync("media");
    overlay.remove();
    if(onSaved)onSaved();
  };
}

function showMediaModal(title,idx){
  var selectedRating=0;
  var overlay=document.createElement("div");
  overlay.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px";
  overlay.innerHTML="<div style='background:#161616;border-radius:16px;border:1px solid #4fa8ff;padding:20px;width:100%;max-width:400px'>"
    +"<div class='lbl'>Klarmarkera</div>"
    +"<div style='font-size:15px;color:#f2f2f2;margin:8px 0 16px;font-weight:500'>"+esc(title)+"</div>"
    +"<div class='lbl'>Betyg</div>"
    +"<div id='media-stars' style='display:flex;gap:8px;margin-bottom:4px'>"
    +[1,2,3,4,5,6,7,8,9,10].map(function(n){return "<button data-star='"+n+"' style='font-size:19px;padding:2px;background:none;border:none;cursor:pointer;opacity:0.3'>★</button>";}).join("")
    +"</div>"
    +"<div id='media-rating-num' style='text-align:left;color:#8c8c8c;font-size:13px;margin-bottom:14px;font-weight:600'>0 / 10</div>"
    +"<div class='lbl'>Kommentar (valfritt)</div>"
    +"<textarea class='ta' id='media-comment' placeholder='Vad tyckte du?' style='min-height:70px;margin-bottom:12px'></textarea>"
    +"<div style='display:flex;gap:8px'>"
    +"<button class='sec' id='modal-save' style='flex:1'>Spara</button>"
    +"<button class='sec ghost' id='modal-cancel' style='flex:1'>Avbryt</button>"
    +"</div></div>";
  document.body.appendChild(overlay);
  overlay.querySelectorAll("[data-star]").forEach(function(star){
    star.onclick=function(){
      selectedRating=parseInt(star.dataset.star);
      overlay.querySelectorAll("[data-star]").forEach(function(s){
        var on=parseInt(s.dataset.star)<=selectedRating;
        s.style.opacity=on?"1":"0.35";
        s.style.color=on?"#ffcc33":"#5c5c5c";
      });
      var numEl=overlay.querySelector("#media-rating-num");
      if(numEl)numEl.textContent=selectedRating+" / 10";
    };
  });
  overlay.querySelector("#modal-cancel").onclick=function(){overlay.remove();};
  overlay.querySelector("#modal-save").onclick=function(){
    var comment=overlay.querySelector("#media-comment").value.trim();
    mediaFardig.push({title:title,cat:mediaCat,rating:selectedRating,comment:comment,timestamp:new Date().toISOString()});
    if(mediaList[mediaCat])mediaList[mediaCat].splice(idx,1);
    saveAndSync("media");
    overlay.remove();
    renderLogMedia();
  };
}
