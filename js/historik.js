// HISTORIK-fliken
//   Del av Minnesbanken (dev). Extraherad ur dev_index.html.
//   Beroenden: core.js, notering.js (fundEntryHist), samtal.js (convEntryHist)
//   Laddas via <script src="js/historik.js"> i rätt ordning (core.js alltid först).

function histRow(h,i,attr,labelHtml){
  return "<div class='khist' style='display:flex;align-items:flex-start;gap:8px' data-"+attr+"='"+i+"'>"
    +"<div style='flex:1;min-width:0'><div class='kmsg'>"+esc(h.original||h.idea||h.question||h.summary||"")+"</div>"
    +"<div class='kmeta'>"+labelHtml+"<span>"+fd(h.timestamp)+"</span></div></div>"
    +"<button class='delbtn' data-del"+attr+"='"+i+"' style='flex-shrink:0;font-size:18px;padding:0 2px'>x</button>"
    +"</div>";
}
function bindHist(b,attr,clickFn,delFn){
  b.querySelectorAll("[data-"+attr+"]").forEach(function(el){el.onclick=function(e){if(!e.target.dataset["del"+attr])clickFn(Number(el.dataset[attr]));};});
  b.querySelectorAll("[data-del"+attr+"]").forEach(function(btn){btn.onclick=function(e){e.stopPropagation();delFn(Number(btn.dataset["del"+attr]));};});
}

// ---- LOGGA ----

function jumpToLogInHistory(logId){
  var log=logs.find(function(l){return l.id===logId;});
  if(!log)return;
  var d=new Date(log.timestamp);
  openYear=String(d.getFullYear());
  openMonth=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
  openDay=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  editingId=logId;
  historySubview="aktiviteter";
  setView("history");
  renderHistory();
}

function jumpToImgInHistory(imgId){
  var img=imageHist.find(function(i){return i.id===imgId;});
  if(img){
    var d=new Date(img.timestamp);
    openYear=String(d.getFullYear());
    openMonth=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
    openDay=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
    weekViewDay=null;
  }
  historySubview="bilder";
  setView("history");
  renderHistory();
  // Scroll to image after render
  setTimeout(function(){
    var el=document.querySelector("[data-histimg='"+imgId+"']");
    if(el)el.scrollIntoView({behavior:'smooth',block:'center'});
  },100);
}

function jumpToConvInHistory(convId){
  var cv=sentConvs.find(function(c){return c.id===convId;});
  if(!cv)return;
  var d=new Date(cv.timestamp);
  openYear=String(d.getFullYear());
  openMonth=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
  openDay=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  historySubview="samtal";
  setView("history");
  renderHistory();
}

function jumpToFundInHistory(fundId){
  var f=fundHist.find(function(f){return f.id===fundId;});
  if(!f)return;
  var d=new Date(f.timestamp);
  openYear=String(d.getFullYear());
  openMonth=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
  openDay=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  editingFundId=f.id;
  historySubview="funderingar";
  setView("history");
  renderHistory();
}

// ---- HISTORIK ----
var editingId=null;
var openYear=null, openMonth=null, openDay=null, weekViewDay=null, weekSortDesc=false;

function getWeekRange(d){
  var dt=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  var dayNum=(dt.getDay()+6)%7; // Mandag=0 ... Sondag=6
  var monday=new Date(dt);monday.setDate(dt.getDate()-dayNum);monday.setHours(0,0,0,0);
  var sunday=new Date(monday);sunday.setDate(monday.getDate()+6);sunday.setHours(23,59,59,999);
  return {start:monday,end:sunday};
}

function openToday(){
  var now=new Date();
  openYear=String(now.getFullYear());
  openMonth=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  openDay=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0");
}

var historySubview="aktiviteter";

function isoWeek(d){
  var dt=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  var dayNum=(dt.getUTCDay()+6)%7;
  dt.setUTCDate(dt.getUTCDate()-dayNum+3);
  var firstThursday=new Date(Date.UTC(dt.getUTCFullYear(),0,4));
  var weekNum=1+Math.round(((dt-firstThursday)/86400000-3+((firstThursday.getUTCDay()+6)%7))/7);
  return weekNum;
}

function logDurationText(log){
  if(!log.time)return "";
  var parts=log.time.split(" | ");
  var durStr=parts.length>=2?parts[1]:(/^\d{2}:\d{2}$/.test(parts[0])?"":parts[0]);
  if(!durStr)return "";
  var hm=durStr.match(/(\d+)h/);var mm=durStr.match(/(\d+)m/);
  var h=hm?parseInt(hm[1],10):0,m=mm?parseInt(mm[1],10):0;
  if(h===0&&m===0)return "";
  return (h>0?h+"h ":"")+(m>0?m+"m":"");
}
function logEntry(log){
  var c=CATS.find(function(x){return x.id===log.category;});
  var img=imageHist.find(function(i){return i.logId===log.id;});
  if(editingId===log.id){
    var dateVal=log.timestamp?new Date(log.timestamp).toISOString().slice(0,10):"";
    var catOptions=["<option value=''>Välj kategori</option>"].concat(CAT_PRESETS.map(function(p){var ct=CATS.find(function(x){return (x.e+" "+x.label)===p||x.id===p;});var id=ct?ct.id:p;return "<option value='"+esc(id)+"'"+(id===log.category?" selected":"")+">"+esc(p)+"</option>";})).join("");
    // Parse existing time
    var existTidpunkt="",existDurH=0,existDurM=0;
    if(log.time){
      var tparts=log.time.split(" | ");
      if(tparts.length>=1&&tparts[0].match(/^\d{2}:\d{2}$/))existTidpunkt=tparts[0];
      var durStr=tparts.length>=2?tparts[1]:tparts[0];
      var hm=durStr.match(/(\d+)h/);var mm2=durStr.match(/(\d+)m/);
      if(hm)existDurH=parseInt(hm[1]);
      if(mm2)existDurM=parseInt(mm2[1]);
    }
    return "<div class='entry' style='flex-direction:column;gap:10px'>"
      +"<div class='lbl'>Namn</div>"
      +"<input class='inp w100' id='edit-name-"+log.id+"' value='"+esc(log.activity||"")+"'/>"
      +"<div class='lbl'>Kategori</div>"
      +"<select class='inp w100' id='edit-cat-"+log.id+"' style='padding:10px 12px;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:14px;font-family:inherit'>"+catOptions+"</select>"
      +"<div style='display:grid;grid-template-columns:1fr 1fr;gap:12px'>"
      +"<div>"
      +"<div class='lbl'>Tidpunkt</div>"
      +"<button id='edit-aktivtid-"+log.id+"' style='width:100%;padding:9px;border-radius:10px;background:#131313;border:1px solid #2a2a2a;color:#f2f2f2;font-size:13px;cursor:pointer;font-family:inherit;margin-bottom:6px'>⏱ Aktiv Tid</button>"
      +"<input class='inp w100' id='edit-tidpunkt-"+log.id+"' placeholder='HH:MM' maxlength='5' value='"+esc(existTidpunkt)+"' style='text-align:center;font-size:16px;font-weight:600;letter-spacing:2px'/>"
      +"</div>"
      +"<div>"
      +"<div class='lbl'>Tidslängd</div>"
      +"<button id='edit-clock-btn-"+log.id+"' style='width:100%;padding:9px;border-radius:10px;background:#131313;border:1px solid #2a2a2a;color:#f2f2f2;font-size:13px;cursor:pointer;font-family:inherit;margin-bottom:6px'>⏰ "+(existDurH||existDurM?String(existDurH).padStart(2,"0")+":"+String(existDurM).padStart(2,"0"):"Välj tid")+"</button>"
      +"<div id='edit-clock-disp-"+log.id+"' style='text-align:center;font-size:13px;color:#4fa8ff;font-weight:600'>"+(existDurH||existDurM?existDurH+"h "+existDurM+"m":"")+"</div>"
      +"</div>"
      +"</div>"
      +"<input type='hidden' id='edit-time-"+log.id+"' value='"+esc(log.time||"")+"'/>"
      +"<div class='lbl'>Datum</div>"
      +"<input type='date' class='inp w100' id='edit-date-"+log.id+"' value='"+esc(dateVal)+"'/>"
      +"<div class='lbl'>Plats (valfritt)</div>"
      +"<div style='display:flex;gap:6px'>"
      +"<select id='edit-place-preset-"+log.id+"' style='background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:0 8px;cursor:pointer;font-family:inherit'>"
      +"<option value=''>📍</option>"
      +(PLACE_PRESETS_BY_CAT[log.category]||[]).map(function(p){return "<option>"+esc(p)+"</option>";}).join("")
      +"</select>"
      +"<input class='inp' id='edit-place-"+log.id+"' placeholder='Plats...' value='"+esc(log.place||"")+"' style='flex:1'/>"
      +"</div>"
      +"<div class='lbl'>Anteckning (valfritt)</div>"
      +"<input class='inp w100' id='edit-note-"+log.id+"' placeholder='Anteckning...' value='"+esc(log.note||"")+"'/>"
      +"<div style='display:flex;gap:8px'>"
      +"<button class='sec' id='save-edit-"+log.id+"' style='flex:1'>Spara</button>"
      +"<button class='sec ghost' id='cancel-edit-"+log.id+"' style='flex:1'>Avbryt</button>"
      +"</div></div>";
  }
  var durTxt=logDurationText(log);
  return "<div class='entry'>"
    +"<span style='font-size:20px'>"+getCatEmoji(log.category)+"</span>"
    +"<div style='flex:1'>"
    +"<div class='etitle' data-jumpact='"+log.id+"' style='cursor:pointer'>"+esc(log.activity)+"</div>"
    +(log.place?"<div class='enote' style='color:#5c5c5c'>📍 "+esc(log.place)+"</div>":"")
    +(log.note?"<div class='enote'>"+esc(log.note)+"</div>":"")
    +(img?"<div class='enote' data-jumpimg='"+img.id+"' style='color:#4fa8ff;cursor:pointer;text-decoration:underline'>Bild bifogad</div>":"")
    +"<div class='etime'>"+fd(log.timestamp)+(durTxt?" · ⏱ "+durTxt:"")+"</div>"
    +"</div>"
    +"<button class='delbtn' data-edit='"+log.id+"' style='color:#5c5c5c;font-size:14px;padding:2px 6px'>✏️</button>"
    +"<button class='delbtn' data-id='"+log.id+"'>x</button>"
    +"</div>";
}

function fundEntryHist(f){
  if(editingFundId===f.id){
    var catOpts="<option value=''>Ingen kategori</option>"
      +FUND_CAT_PRESETS.map(function(cat){return "<option value='"+esc(cat)+"'"+(cat===f.category?" selected":"")+">"+esc(cat)+"</option>";}).join("");
    return "<div class='entry' style='flex-direction:column;gap:10px'>"
      +"<select id='hedit-fundcat-"+f.id+"' style='width:100%;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:9px 10px;cursor:pointer;font-family:inherit'>"+catOpts+"</select>"
      +"<textarea class='ta' id='hedit-fund-"+f.id+"' style='min-height:90px'>"+esc(f.text)+"</textarea>"
      +"<div style='display:flex;gap:8px'>"
      +"<button class='sec' id='hsave-fund-"+f.id+"' style='flex:1'>Spara</button>"
      +"<button class='sec ghost' id='hcancel-fund-"+f.id+"' style='flex:1'>Avbryt</button>"
      +"</div></div>";
  }
  return "<div class='entry'>"
    +"<span style='font-size:20px'>💭</span>"
    +"<div style='flex:1'>"
    +(f.category?"<div style='font-size:11px;color:#5c5c5c;margin-bottom:2px'>"+esc(f.category)+"</div>":"")
    +"<div class='etitle' style='white-space:pre-wrap;font-weight:400;line-height:1.5'>"+esc(f.text)+"</div>"
    +"<div class='etime'>"+fd(f.timestamp)+"</div>"
    +"</div>"
    +"<button class='delbtn' data-hedit-fund='"+f.id+"' style='color:#5c5c5c;font-size:14px;padding:2px 6px'>✏️</button>"
    +"<button class='delbtn' data-hdel-fund='"+f.id+"'>x</button>"
    +"</div>";
}

function convEntryHist(cv,person){
  var msgs=sentMsgs.filter(function(m){return m.convId===cv.id;});
  return "<div class='khist' data-hconv='"+cv.id+"'>"
    +"<div class='kmsg' style='white-space:normal;font-weight:600'>"+esc(person?person.name:"Okand")+" - "+esc(cv.title)+"</div>"
    +"<div class='kmeta'><span class='kbadge'>"+msgs.length+" meddelanden</span></div>"
    +"</div>";
}

function folderRow(label,key,level,openKey,count){
  var isOpen=openKey===key;
  var indent=level===0?0:level===1?12:24;
  var bg=level===0?"#161616":level===1?"#151520":"transparent";
  var border=level===0?"1px solid #2a2a2a":level===1?"1px solid #2a2a2a":"none";
  return "<div data-folder='"+esc(key)+"' data-level='"+level+"' style='"
    +"display:flex;align-items:center;gap:10px;padding:10px 14px;margin-bottom:6px;"
    +"border-radius:0;background:"+bg+";border:"+border+";cursor:pointer;"
    +"margin-left:"+indent+"px'>"
    +"<span style='font-size:14px;transition:transform .15s;display:inline-block;"+(isOpen?"transform:rotate(90deg)":"")+"'>▶</span>"
    +"<span style='flex:1;font-size:13px;color:#cfcfcf;font-weight:500'>"+label+"</span>"
    +"<span class='sbadge'>"+count+"</span>"
    +"</div>";
}

var histBetygSubview="media"; // media | objekt | plats

// Bild-fliken i Historik (Blås instruktion 2026-08-26): inte längre år/månad/dag-mappar,
// utan senaste 4 överst + kategori-dropdown + paginerad lista (10 i taget, "Visa fler").
var bildKategoriFilter=""; // "" = alla kategorier
var bildVisaAntal=10;

// Bildens egen kategori (rättat 2026-08-30 efter besked från Aktivitet-chatten, som äger
// bilddatamodellen): fältet heter "bildkategori", INTE "category" — "category" finns kvar
// på bildposter men är alltid tomt/oanvänt (det fältet är egentligen till för loggar).
// Kategorierna finns i globalen AKTIVITET_BILDKATEGORIER (samma {id,label,e}-form som
// CATS), satt av aktivitet.js — INTE samma lista som CATS (aktivitetskategorier).
function bildKatList(){
  return (typeof AKTIVITET_BILDKATEGORIER!=="undefined"&&AKTIVITET_BILDKATEGORIER)?AKTIVITET_BILDKATEGORIER:[];
}
function getBildKatLabel(id){
  if(!id)return "";
  var k=bildKatList().find(function(c){return c.id===id;});
  return k?k.label:"";
}
function imgKategoriId(img){
  return img.bildkategori||"";
}

function imgThumb(img){
  var imgSrc=img.base64?"data:"+(img.mtype||"image/jpeg")+";base64,"+img.base64:"";
  return "<div style='background:#161616;border-radius:10px;border:1px solid #2a2a2a;overflow:hidden'>"
    +"<div id='thumbwrap-"+img.id+"' style='width:100%;aspect-ratio:1;background:#131313;display:flex;align-items:center;justify-content:center'>"
    +(imgSrc?"<img src='"+imgSrc+"' style='width:100%;height:100%;object-fit:cover;display:block'/>"
            :"<span style='color:#5c5c5c;font-size:16px'>⏳</span>")
    +"</div>"
    +"<div style='padding:5px 7px;font-family:\"JetBrains Mono\",monospace;font-size:9.5px;color:#5c5c5c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>"+fd(img.timestamp)+"</div>"
    +"</div>";
}

// Dropdownens värden (Blås instruktion 2026-08-30): "" är inte längre "alla kategorier"
// utan en ren platshållare ("Välj kategori") - ingen filtrering är egentligen vald än,
// men listan visar ändå allt tills vidare (samma som innan). "Alla kategorier" flyttas
// ner som ett eget, explicit alternativ (samma funktionella resultat som "" - visa allt -
// men går att välja tillbaka till aktivt efter att man filtrerat på något annat).
// Nytt: "Ingen kategori" visar bilder som helt saknar bildkategori.
var BILD_KAT_ALLA="__alla__";
var BILD_KAT_INGEN="__ingen__";
function buildBildKategoriDropdown(){
  var opts="<option value=''"+(bildKategoriFilter===""?" selected":"")+">Välj kategori</option>"
    +"<option value='"+BILD_KAT_ALLA+"'"+(bildKategoriFilter===BILD_KAT_ALLA?" selected":"")+">Alla kategorier</option>"
    +"<option value='"+BILD_KAT_INGEN+"'"+(bildKategoriFilter===BILD_KAT_INGEN?" selected":"")+">Ingen kategori</option>"
    +bildKatList().map(function(c){return "<option value='"+esc(c.id)+"'"+(c.id===bildKategoriFilter?" selected":"")+">"+c.e+" "+esc(c.label)+"</option>";}).join("");
  return "<select id='bild-kat-filter' style='width:100%;padding:11px 13px;border-radius:5px;background:#161616;border:1px solid #2a2a2a;color:#f2f2f2;font-size:14px;margin-bottom:16px;font-family:inherit'>"+opts+"</select>";
}

// Vilka Historik-underflikar som ska visas just nu. Satt till true igen
// allteftersom respektive del av appen blir klar (Blås instruktion 2026-08-26:
// bara Aktivitet+Bild aktiva tills vidare, resten aktiveras manuellt senare).
var HISTORIK_AKTIVA_FLIKAR={
  aktiviteter:true,
  bilder:true,
  funderingar:false,
  samtal:false,
  betyg:false
};
var HISTORIK_FLIK_LABEL={aktiviteter:"Loggning",funderingar:"Fundering",bilder:"Bild",samtal:"Samtal",betyg:"Betyg"};
var HISTORIK_FLIK_ORDNING=["aktiviteter","funderingar","bilder","samtal","betyg"];

function renderHistory(){
  var b=document.getElementById("body");
  var aktivaFlikar=HISTORIK_FLIK_ORDNING.filter(function(id){return HISTORIK_AKTIVA_FLIKAR[id];});
  if(!aktivaFlikar.length)aktivaFlikar=["aktiviteter"]; // skyddsnät, ska aldrig hända
  if(aktivaFlikar.indexOf(historySubview)<0)historySubview=aktivaFlikar[0];

  var subTabs="<div style='display:grid;grid-template-columns:repeat("+aktivaFlikar.length+",1fr);gap:6px;margin-bottom:20px'>"
    +aktivaFlikar.map(function(id){
      return "<button class='mode-btn"+(historySubview===id?" on":"")+"' data-histsub='"+id+"' style='font-size:10px;padding:8px 2px'>"+HISTORIK_FLIK_LABEL[id]+"</button>";
    }).join("")
    +"</div>";
  b.innerHTML=subTabs+"<div id='hist-content'></div>";
  b.querySelectorAll("[data-histsub]").forEach(function(btn){
    btn.onclick=function(){historySubview=btn.dataset.histsub;openYear=null;openMonth=null;openDay=null;weekViewDay=null;renderHistory();};
  });
  if(historySubview==="aktiviteter")renderHistAktiviteter();
  else if(historySubview==="samtal"&&HISTORIK_AKTIVA_FLIKAR.samtal)renderHistSamtal();
  else if(historySubview==="bilder")loadHistBilderOchRendera();
  else if(historySubview==="betyg"&&HISTORIK_AKTIVA_FLIKAR.betyg)renderHistBetyg();
  else if(historySubview==="funderingar"&&HISTORIK_AKTIVA_FLIKAR.funderingar)renderHistFunderingar();
  else renderHistAktiviteter();
}

// Bild-datan (imageHist) förladdas INTE tillsammans med aktiviteter/samtal/funderingar/media
// när man klickar på Historik-huvudfliken - den laddas bara här, när man faktiskt besöker
// Bild-underfliken i Historik (Blås instruktion 2026-08-26). Skyddar mot dubbelrendering om
// man hinner klicka bort till en annan underflik innan hämtningen är klar.
//
// RÄTTAT 2026-08-30 (besked från Aktivitet-chatten): "bilder" har inget eget domän-baserat
// loadTab-stöd i core.js (ingen "bilder"-gren i loadTab/applyTabData - bekräftat genom att
// läsa core.js) - loadTab("bilder") var alltså en no-op hela tiden, därav att bilder bara
// dök upp i Historik efter ett besök i Aktivitet (vars egen kod var det enda som fyllde
// imageHist). Rätt funktion är ensureAktivitetBilderIndexLoaded() i aktivitet.js: läser
// Aktivitet/bilder.json och slår ihop posterna i imageHist (skriver aldrig över). Den beror
// bara på delade globaler (accessToken/imageHist m.fl.), har en egen en-gång-per-sidladdning-
// spärr, och är säker att anropa fristående från Historik (bekräftat av Aktivitet-chatten).
// Skyddad med en typeof-koll ifall en äldre aktivitet.js-version saknar funktionen.
function loadHistBilderOchRendera(){
  var hc=document.getElementById("hist-content");
  if(hc)hc.innerHTML=spin();
  var ladda=(typeof ensureAktivitetBilderIndexLoaded==="function")?ensureAktivitetBilderIndexLoaded():Promise.resolve();
  ladda.then(function(){
    if(historySubview==="bilder")renderHistBilder();
  });
}

function renderHistBetyg(){
  var hc=document.getElementById("hist-content");
  if(!hc)return;
  var subTabs="<div style='display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:20px'>"
    +"<button class='mode-btn"+(histBetygSubview==="media"?" on":"")+"' data-histbetygsub='media' style='font-size:11px'>Media</button>"
    +"<button class='mode-btn"+(histBetygSubview==="objekt"?" on":"")+"' data-histbetygsub='objekt' style='font-size:11px'>Föremål</button>"
    +"<button class='mode-btn"+(histBetygSubview==="plats"?" on":"")+"' data-histbetygsub='plats' style='font-size:11px'>Plats</button>"
    +"</div>";
  hc.innerHTML=subTabs+"<div id='hist-betyg-content'></div>";
  hc.querySelectorAll("[data-histbetygsub]").forEach(function(btn){
    btn.onclick=function(){switchHistBetygSubview(btn.dataset.histbetygsub);};
  });
  renderHistBetygContent();
}

function switchHistBetygSubview(sub){
  histBetygSubview=sub;
  var tabMap={media:"media",objekt:"objekt",plats:"plats"};
  var tab=tabMap[sub]||"media";
  document.querySelectorAll("[data-histbetygsub]").forEach(function(btn){btn.classList.toggle("on",btn.dataset.histbetygsub===sub);});
  var bc=document.getElementById("hist-betyg-content");
  if(bc)bc.innerHTML="<div style='padding:30px;text-align:center;color:#5c5c5c;font-size:13px'>⏳ Laddar...</div>";
  tabLoaded[tab]=false;
  loadTab(tab).then(function(){renderHistBetygContent();});
}

function renderHistBetygContent(){
  if(histBetygSubview==="objekt")renderHistObj();
  else if(histBetygSubview==="plats")renderHistPlats();
  else renderHistMedia();
}

function showHistMediaModal(title,idx,cat,creator,genre,anteckning,genresArr){
  var b=document.getElementById("body");
  var existing=b.querySelector("#hist-media-modal");
  if(existing)existing.remove();
  var overlay=document.createElement("div");
  overlay.id="hist-media-modal";
  overlay.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px";
  var selectedRating=0;
  overlay.innerHTML="<div style='background:#161616;border-radius:16px;border:1px solid #4fa8ff;padding:20px;width:100%;max-width:400px'>"
    +"<div class='lbl'>Klarmarkera</div>"
    +"<div style='font-size:15px;color:#f2f2f2;margin:8px 0 4px;font-weight:500'>"+esc(title)+"</div>"
    +(creator?"<div style='font-size:12px;color:#5c5c5c'>"+esc(creator)+"</div>":"")
    +(genre?"<div style='font-size:12px;color:#5c5c5c'>"+esc(genre)+"</div>":"")
    +(anteckning?"<div style='font-size:12px;color:#5c5c5c;margin-bottom:12px'>"+esc(anteckning)+"</div>":"<div style='margin-bottom:12px'></div>")
    +"<div class='lbl'>Betyg</div>"
    +"<div id='hm-stars' style='display:flex;gap:8px;margin-bottom:4px'>"
    +[1,2,3,4,5,6,7,8,9,10].map(function(n){return "<button data-star='"+n+"' style='font-size:19px;padding:2px;background:none;border:none;cursor:pointer;opacity:0.3'>★</button>";}).join("")
    +"</div>"
    +"<div id='hm-rating-num' style='text-align:left;color:#8c8c8c;font-size:13px;margin-bottom:14px;font-weight:600'>0 / 10</div>"
    +"<div class='lbl'>Kommentar (valfritt)</div>"
    +"<textarea class='ta' id='hm-comment' placeholder='Vad tyckte du?' style='min-height:70px;margin-bottom:12px'></textarea>"
    +"<div style='display:flex;gap:8px'>"
    +"<button class='sec' id='hm-save' style='flex:1'>Spara</button>"
    +"<button class='sec ghost' id='hm-cancel' style='flex:1'>Avbryt</button>"
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
      var numEl=overlay.querySelector("#hm-rating-num");
      if(numEl)numEl.textContent=selectedRating+" / 10";
    };
  });
  overlay.querySelector("#hm-cancel").onclick=function(){overlay.remove();};
  overlay.querySelector("#hm-save").onclick=function(){
    var comment=overlay.querySelector("#hm-comment").value.trim();
    var newEntry={title:title,cat:cat,creator:creator||"",genre:genre||"",anteckning:anteckning||"",rating:selectedRating,comment:comment,timestamp:new Date().toISOString()};
    if(genresArr&&genresArr.length)newEntry.genres=genresArr;
    mediaFardig.push(newEntry);
    if(mediaList[cat])mediaList[cat].splice(idx,1);
    saveAndSync("media");
    overlay.remove();
    renderHistory();
  };
}

function renderHistMedia(){
  var c=document.getElementById("hist-betyg-content");
  var allCats=MEDIA_CAT_PRESETS.slice();
  Object.keys(mediaList||{}).forEach(function(k){if(allCats.indexOf(k)<0)allCats.push(k);});
  (mediaFardig||[]).forEach(function(e){if(allCats.indexOf(e.cat)<0)allCats.push(e.cat);});

  // Group pending by category
  var html="<button class='sec ghost' id='hist-media-recension-btn' style='width:100%;margin-bottom:16px'>📝 Recensioner</button>";

  // Pending media
  var hasPending=allCats.some(function(k){return (mediaList[k]||[]).length;});
  if(hasPending){
    html+="<div class='lbl' style='margin-bottom:12px'>Att konsumera</div>";
    allCats.forEach(function(k){
      var items=mediaList[k]||[];
      if(!items.length)return;
      html+="<div style='margin-bottom:16px'>"
        +"<div style='font-size:12px;font-weight:600;color:#5c5c5c;margin-bottom:8px'>"+esc(k)+"</div>"
        +"<div style='background:#131313;border:1px solid #2a2a2a;border-radius:10px;padding:8px 12px'>"
        +items.map(function(item,i){
          var title=mediaItemTitle(item),creator=mediaItemCreator(item),genre=mediaItemGenre(item),anteckning=mediaItemAnteckning(item);
          return "<div style='padding:8px 0;border-bottom:1px solid #131313;display:flex;align-items:center;gap:8px'>"
            +"<div style='flex:1;min-width:0'>"
            +"<div style='font-size:13px;color:#f2f2f2'>"+esc(title)+"</div>"
            +(creator?"<div style='font-size:11px;color:#5c5c5c'>"+esc(creator)+"</div>":"")
            +(genre?"<div style='font-size:11px;color:#5c5c5c'>"+esc(genre)+"</div>":"")
            +(anteckning?"<div style='font-size:11px;color:#5c5c5c'>"+esc(anteckning)+"</div>":"")
            +"</div>"
            +"<button data-edithistmed='"+i+"' data-edithistmedcat='"+esc(k)+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:13px;padding:0 4px;flex-shrink:0'>✏️</button>"
            +"<button data-klarhistmed='"+i+"' data-klarhistcat='"+esc(k)+"' style='padding:4px 10px;border-radius:6px;background:#1c3c5a;border:1px solid #4fa8ff;color:#4fa8ff;font-size:11px;cursor:pointer;white-space:nowrap'>✓ Klar</button>"
            +"<button data-delhistmed='"+i+"' data-delhistmedcat='"+esc(k)+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:16px;padding:0 4px;flex-shrink:0'>x</button>"
            +"</div>";
        }).join("")
        +"</div></div>";
    });
  }

  // Senaste betyg (de 3 senaste, oavsett kategori)
  if(mediaFardig&&mediaFardig.length){
    var recentFardigMed=mediaFardig.map(function(e,i){return {e:e,idx:i};})
      .sort(function(a,b){return new Date(b.e.timestamp)-new Date(a.e.timestamp);})
      .slice(0,3);
    html+="<div class='lbl' style='margin-top:20px;margin-bottom:12px'>Senaste betyg</div>"
      +recentFardigMed.map(function(entry){
        var e=entry.e,idx=entry.idx;
        var stars=[1,2,3,4,5,6,7,8,9,10].map(function(n){return n<=e.rating?"★":"☆";}).join("");
        return "<div style='padding:10px 14px;background:#131313;border:1px solid #2a2a2a;border-radius:10px;margin-bottom:8px'>"
          +"<div style='font-size:11px;color:#4fa8ff;margin-bottom:2px'>"+esc(e.cat)+"</div>"
          +"<div style='display:flex;align-items:center;gap:8px'>"
          +"<div style='flex:1;font-size:13px;color:#f2f2f2;font-weight:500'>"+esc(e.title)+"</div>"
          +"<span style='color:#c9a24a;font-size:14px;letter-spacing:1px'>"+stars+"</span>"
          +"<button data-edithistfardig='"+idx+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:14px;padding:0 4px;flex-shrink:0'>✏️</button>"
          +"<button data-delhistfardig='"+idx+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:16px;padding:0 4px;flex-shrink:0'>x</button>"
          +"</div>"
          +(e.creator?"<div style='font-size:11px;color:#5c5c5c;margin-top:2px'>"+esc(e.creator)+"</div>":"")
          +(e.genre?"<div style='font-size:11px;color:#5c5c5c;margin-top:2px'>"+esc(e.genre)+"</div>":"")
          +(e.anteckning?"<div style='font-size:11px;color:#5c5c5c;margin-top:2px'>"+esc(e.anteckning)+"</div>":"")
          +(e.comment?"<div style='font-size:12px;color:#5c5c5c;margin-top:4px;line-height:1.5'>"+esc(e.comment)+"</div>":"")
          +"<div style='font-size:10px;color:#5c5c5c;margin-top:4px'>"+fd(e.timestamp)+"</div>"
          +"</div>";
      }).join("");
  }

  if(!hasPending&&(!mediaFardig||!mediaFardig.length)){
    html+="<div class='empty'><div class='eico'>🎬</div>Ingen media sparad ännu.</div>";
  }

  c.innerHTML=html;
  var histRecBtn=c.querySelector("#hist-media-recension-btn");
  if(histRecBtn)histRecBtn.onclick=function(){
    setView("utvarderingar");utvSubview="media";mediaRecensionCreator=null;
    tabLoaded.media=false;
    loadTab("media").then(function(){
      renderUtvarderingarTop();
      renderMediaRecension();
    });
  };
  c.querySelectorAll("[data-edithistmed]").forEach(function(btn){
    btn.onclick=function(){
      editPendingMediaItem(btn.dataset.edithistmedcat,parseInt(btn.dataset.edithistmed),renderHistMedia);
    };
  });
  c.querySelectorAll("[data-klarhistmed]").forEach(function(btn){
    btn.onclick=function(){
      var idx=parseInt(btn.dataset.klarhistmed);
      var cat=btn.dataset.klarhistcat;
      var item=(mediaList[cat]||[])[idx];
      if(item)showHistMediaModal(mediaItemTitle(item),idx,cat,mediaItemCreator(item),mediaItemGenre(item),mediaItemAnteckning(item),mediaItemGenresArr(item));
    };
  });
  c.querySelectorAll("[data-delhistmed]").forEach(function(btn){
    btn.onclick=function(){
      var idx=parseInt(btn.dataset.delhistmed);
      var cat=btn.dataset.delhistmedcat;
      var item=(mediaList[cat]||[])[idx];
      var title=item?mediaItemTitle(item):"";
      confirmDelete("Vill du ta bort \""+esc(title)+"\"?",function(){
        if(mediaList[cat])mediaList[cat].splice(idx,1);
        saveAndSync("media");renderHistMedia();
      });
    };
  });
  c.querySelectorAll("[data-edithistfardig]").forEach(function(btn){
    btn.onclick=function(){
      var e=mediaFardig[parseInt(btn.dataset.edithistfardig)];
      if(e)editMediaFardigEntry(e,renderHistMedia);
    };
  });
  c.querySelectorAll("[data-delhistfardig]").forEach(function(btn){
    btn.onclick=function(){
      var idx=parseInt(btn.dataset.delhistfardig);
      var e=mediaFardig[idx];
      if(!e)return;
      confirmDelete("Vill du ta bort betyget för \""+esc(e.title)+"\"?",function(){
        mediaFardig.splice(idx,1);
        saveAndSync("media");
        renderHistMedia();
      });
    };
  });
}

function renderHistObj(){
  var c=document.getElementById("hist-betyg-content");
  var allCats=OBJ_CAT_PRESETS.slice();
  Object.keys(objList||{}).forEach(function(k){if(allCats.indexOf(k)<0)allCats.push(k);});
  (objFardig||[]).forEach(function(e){if(allCats.indexOf(e.cat)<0)allCats.push(e.cat);});

  var html="<button class='sec ghost' id='hist-obj-recension-btn' style='width:100%;margin-bottom:16px'>📝 Recensioner</button>";

  var hasPending=allCats.some(function(k){return (objList[k]||[]).length;});
  if(hasPending){
    html+="<div class='lbl' style='margin-bottom:12px'>Att konsumera</div>";
    allCats.forEach(function(k){
      var items=objList[k]||[];
      if(!items.length)return;
      html+="<div style='margin-bottom:16px'>"
        +"<div style='font-size:12px;font-weight:600;color:#5c5c5c;margin-bottom:8px'>"+esc(k)+"</div>"
        +"<div style='background:#131313;border:1px solid #2a2a2a;border-radius:10px;padding:8px 12px'>"
        +items.map(function(item,i){
          var title=objItemTitle(item),tillverkare=objItemTillverkare(item),omrade=objItemAnteckning(item);
          return "<div style='padding:8px 0;border-bottom:1px solid #131313;display:flex;align-items:center;gap:8px'>"
            +"<div style='flex:1;min-width:0'>"
            +"<div style='font-size:13px;color:#f2f2f2'>"+esc(title)+"</div>"
            +(tillverkare?"<div style='font-size:11px;color:#5c5c5c'>"+esc(tillverkare)+"</div>":"")
            +(omrade?"<div style='font-size:11px;color:#5c5c5c'>"+esc(omrade)+"</div>":"")
            +"</div>"
            +"<button data-edithistobj='"+i+"' data-edithistobjcat='"+esc(k)+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:13px;padding:0 4px;flex-shrink:0'>✏️</button>"
            +"<button data-klarhistobj='"+i+"' data-klarhistobjcat='"+esc(k)+"' style='padding:4px 10px;border-radius:6px;background:#1c3c5a;border:1px solid #4fa8ff;color:#4fa8ff;font-size:11px;cursor:pointer;white-space:nowrap'>✓ Klar</button>"
            +"<button data-delhistobj='"+i+"' data-delhistobjcat='"+esc(k)+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:16px;padding:0 4px;flex-shrink:0'>x</button>"
            +"</div>";
        }).join("")
        +"</div></div>";
    });
  }

  if(objFardig&&objFardig.length){
    var recentFardigObj=objFardig.map(function(e,i){return {e:e,idx:i};})
      .sort(function(a,b){return new Date(b.e.timestamp)-new Date(a.e.timestamp);})
      .slice(0,3);
    html+="<div class='lbl' style='margin-top:20px;margin-bottom:12px'>Senaste betyg</div>"
      +recentFardigObj.map(function(entry){
        var e=entry.e,idx=entry.idx;
        var stars=[1,2,3,4,5,6,7,8,9,10].map(function(n){return n<=e.rating?"★":"☆";}).join("");
        return "<div style='padding:10px 14px;background:#131313;border:1px solid #2a2a2a;border-radius:10px;margin-bottom:8px'>"
          +"<div style='font-size:11px;color:#4fa8ff;margin-bottom:2px'>"+esc(e.cat)+"</div>"
          +"<div style='display:flex;align-items:center;gap:8px'>"
          +"<div style='flex:1;font-size:13px;color:#f2f2f2;font-weight:500'>"+esc(e.title)+"</div>"
          +"<span style='color:#c9a24a;font-size:14px;letter-spacing:1px'>"+stars+"</span>"
          +"<button data-edithistobjfardig='"+idx+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:14px;padding:0 4px;flex-shrink:0'>✏️</button>"
          +"<button data-delhistobjfardig='"+idx+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:16px;padding:0 4px;flex-shrink:0'>x</button>"
          +"</div>"
          +(e.tillverkare?"<div style='font-size:11px;color:#5c5c5c;margin-top:2px'>"+esc(e.tillverkare)+"</div>":"")
          +(e.anteckning?"<div style='font-size:11px;color:#5c5c5c;margin-top:2px'>"+esc(e.anteckning)+"</div>":"")
          +(e.comment?"<div style='font-size:12px;color:#5c5c5c;margin-top:4px;line-height:1.5'>"+esc(e.comment)+"</div>":"")
          +"<div style='font-size:10px;color:#5c5c5c;margin-top:4px'>"+fd(e.timestamp)+"</div>"
          +"</div>";
      }).join("");
  }

  if(!hasPending&&(!objFardig||!objFardig.length)){
    html+="<div class='empty'><div class='eico'>🔧</div>Inga föremål sparade ännu.</div>";
  }

  c.innerHTML=html;
  var histRecBtn=c.querySelector("#hist-obj-recension-btn");
  if(histRecBtn)histRecBtn.onclick=function(){
    setView("utvarderingar");utvSubview="objekt";objRecensionTillverkare=null;
    tabLoaded.objekt=false;
    loadTab("objekt").then(function(){
      renderUtvarderingarTop();
      renderObjRecension();
    });
  };
  c.querySelectorAll("[data-edithistobj]").forEach(function(btn){
    btn.onclick=function(){
      editPendingObjItem(btn.dataset.edithistobjcat,parseInt(btn.dataset.edithistobj),renderHistObj);
    };
  });
  c.querySelectorAll("[data-klarhistobj]").forEach(function(btn){
    btn.onclick=function(){
      var idx=parseInt(btn.dataset.klarhistobj);
      var cat=btn.dataset.klarhistobjcat;
      var item=(objList[cat]||[])[idx];
      if(item)showHistObjModal(objItemTitle(item),idx,cat,objItemTillverkare(item),objItemAnteckning(item));
    };
  });
  c.querySelectorAll("[data-delhistobj]").forEach(function(btn){
    btn.onclick=function(){
      var idx=parseInt(btn.dataset.delhistobj);
      var cat=btn.dataset.delhistobjcat;
      var item=(objList[cat]||[])[idx];
      var title=item?objItemTitle(item):"";
      confirmDelete("Vill du ta bort \""+esc(title)+"\"?",function(){
        if(objList[cat])objList[cat].splice(idx,1);
        saveAndSync("objekt");renderHistObj();
      });
    };
  });
  c.querySelectorAll("[data-edithistobjfardig]").forEach(function(btn){
    btn.onclick=function(){
      var e=objFardig[parseInt(btn.dataset.edithistobjfardig)];
      if(e)editObjFardigEntry(e,renderHistObj);
    };
  });
  c.querySelectorAll("[data-delhistobjfardig]").forEach(function(btn){
    btn.onclick=function(){
      var idx=parseInt(btn.dataset.delhistobjfardig);
      var e=objFardig[idx];
      if(!e)return;
      confirmDelete("Vill du ta bort betyget för \""+esc(e.title)+"\"?",function(){
        objFardig.splice(idx,1);
        saveAndSync("objekt");
        renderHistObj();
      });
    };
  });
}

function renderHistPlats(){
  var c=document.getElementById("hist-betyg-content");
  var allCats=PLATS_CAT_PRESETS.slice();
  Object.keys(platsList||{}).forEach(function(k){if(allCats.indexOf(k)<0)allCats.push(k);});
  (platsFardig||[]).forEach(function(e){if(allCats.indexOf(e.cat)<0)allCats.push(e.cat);});

  var html="<button class='sec ghost' id='hist-plats-recension-btn' style='width:100%;margin-bottom:16px'>📝 Recensioner</button>";

  var hasPending=allCats.some(function(k){return (platsList[k]||[]).length;});
  if(hasPending){
    html+="<div class='lbl' style='margin-bottom:12px'>Att konsumera</div>";
    allCats.forEach(function(k){
      var items=platsList[k]||[];
      if(!items.length)return;
      html+="<div style='margin-bottom:16px'>"
        +"<div style='font-size:12px;font-weight:600;color:#5c5c5c;margin-bottom:8px'>"+esc(k)+"</div>"
        +"<div style='background:#131313;border:1px solid #2a2a2a;border-radius:10px;padding:8px 12px'>"
        +items.map(function(item,i){
          var title=platsItemTitle(item),kommun=platsItemKommun(item),anteckning=platsItemAnteckning(item);
          return "<div style='padding:8px 0;border-bottom:1px solid #131313;display:flex;align-items:center;gap:8px'>"
            +"<div style='flex:1;min-width:0'>"
            +"<div style='font-size:13px;color:#f2f2f2'>"+esc(title)+"</div>"
            +(kommun?"<div style='font-size:11px;color:#5c5c5c'>"+esc(kommun)+"</div>":"")
            +(anteckning?"<div style='font-size:11px;color:#5c5c5c'>"+esc(anteckning)+"</div>":"")
            +"</div>"
            +"<button data-edithistplats='"+i+"' data-edithistplatscat='"+esc(k)+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:13px;padding:0 4px;flex-shrink:0'>✏️</button>"
            +"<button data-klarhistplats='"+i+"' data-klarhistplatscat='"+esc(k)+"' style='padding:4px 10px;border-radius:6px;background:#1c3c5a;border:1px solid #4fa8ff;color:#4fa8ff;font-size:11px;cursor:pointer;white-space:nowrap'>✓ Klar</button>"
            +"<button data-delhistplats='"+i+"' data-delhistplatscat='"+esc(k)+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:16px;padding:0 4px;flex-shrink:0'>x</button>"
            +"</div>";
        }).join("")
        +"</div></div>";
    });
  }

  if(platsFardig&&platsFardig.length){
    var recentFardigPlats=platsFardig.map(function(e,i){return {e:e,idx:i};})
      .sort(function(a,b){return new Date(b.e.timestamp)-new Date(a.e.timestamp);})
      .slice(0,3);
    html+="<div class='lbl' style='margin-top:20px;margin-bottom:12px'>Senaste betyg</div>"
      +recentFardigPlats.map(function(entry){
        var e=entry.e,idx=entry.idx;
        var stars=[1,2,3,4,5,6,7,8,9,10].map(function(n){return n<=e.rating?"★":"☆";}).join("");
        return "<div style='padding:10px 14px;background:#131313;border:1px solid #2a2a2a;border-radius:10px;margin-bottom:8px'>"
          +"<div style='font-size:11px;color:#4fa8ff;margin-bottom:2px'>"+esc(e.cat)+"</div>"
          +"<div style='display:flex;align-items:center;gap:8px'>"
          +"<div style='flex:1;font-size:13px;color:#f2f2f2;font-weight:500'>"+esc(e.title)+"</div>"
          +"<span style='color:#c9a24a;font-size:14px;letter-spacing:1px'>"+stars+"</span>"
          +"<button data-edithistplatsfardig='"+idx+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:14px;padding:0 4px;flex-shrink:0'>✏️</button>"
          +"<button data-delhistplatsfardig='"+idx+"' style='background:none;border:none;color:#5c5c5c;cursor:pointer;font-size:16px;padding:0 4px;flex-shrink:0'>x</button>"
          +"</div>"
          +(e.kommun?"<div style='font-size:11px;color:#5c5c5c;margin-top:2px'>"+esc(e.kommun)+"</div>":"")
          +(e.anteckning?"<div style='font-size:11px;color:#5c5c5c;margin-top:2px'>"+esc(e.anteckning)+"</div>":"")
          +(e.comment?"<div style='font-size:12px;color:#5c5c5c;margin-top:4px;line-height:1.5'>"+esc(e.comment)+"</div>":"")
          +"<div style='font-size:10px;color:#5c5c5c;margin-top:4px'>"+fd(e.timestamp)+"</div>"
          +"</div>";
      }).join("");
  }

  if(!hasPending&&(!platsFardig||!platsFardig.length)){
    html+="<div class='empty'><div class='eico'>📍</div>Inga platser sparade ännu.</div>";
  }

  c.innerHTML=html;
  var histRecBtn=c.querySelector("#hist-plats-recension-btn");
  if(histRecBtn)histRecBtn.onclick=function(){
    setView("utvarderingar");utvSubview="plats";platsRecensionKommun=null;
    tabLoaded.plats=false;
    loadTab("plats").then(function(){
      renderUtvarderingarTop();
      renderPlatsRecension();
    });
  };
  c.querySelectorAll("[data-edithistplats]").forEach(function(btn){
    btn.onclick=function(){
      editPendingPlatsItem(btn.dataset.edithistplatscat,parseInt(btn.dataset.edithistplats),renderHistPlats);
    };
  });
  c.querySelectorAll("[data-klarhistplats]").forEach(function(btn){
    btn.onclick=function(){
      var idx=parseInt(btn.dataset.klarhistplats);
      var cat=btn.dataset.klarhistplatscat;
      var item=(platsList[cat]||[])[idx];
      if(item)showHistPlatsModal(platsItemTitle(item),idx,cat,platsItemKommun(item),platsItemAnteckning(item));
    };
  });
  c.querySelectorAll("[data-delhistplats]").forEach(function(btn){
    btn.onclick=function(){
      var idx=parseInt(btn.dataset.delhistplats);
      var cat=btn.dataset.delhistplatscat;
      var item=(platsList[cat]||[])[idx];
      var title=item?platsItemTitle(item):"";
      confirmDelete("Vill du ta bort \""+esc(title)+"\"?",function(){
        if(platsList[cat])platsList[cat].splice(idx,1);
        saveAndSync("plats");renderHistPlats();
      });
    };
  });
  c.querySelectorAll("[data-edithistplatsfardig]").forEach(function(btn){
    btn.onclick=function(){
      var e=platsFardig[parseInt(btn.dataset.edithistplatsfardig)];
      if(e)editPlatsFardigEntry(e,renderHistPlats);
    };
  });
  c.querySelectorAll("[data-delhistplatsfardig]").forEach(function(btn){
    btn.onclick=function(){
      var idx=parseInt(btn.dataset.delhistplatsfardig);
      var e=platsFardig[idx];
      if(!e)return;
      confirmDelete("Vill du ta bort betyget för \""+esc(e.title)+"\"?",function(){
        platsFardig.splice(idx,1);
        saveAndSync("plats");
        renderHistPlats();
      });
    };
  });
}

function renderHistAktiviteter(){
  var c=document.getElementById("hist-content");
  if(!logs.length){c.innerHTML="<div class='empty'><div class='eico'>📋</div>Inga aktiviteter annu.</div>";return;}
  renderGroupedByDate(c,logs,function(log){return new Date(log.timestamp);},function(log){return logEntry(log);});
}

function imgEntry(img){
  var catName=getBildKatLabel(img.bildkategori);
  var title=img.activity||"bild";
  var fname=buildImageFilename(img);
  var ext=img.mtype&&img.mtype.includes("png")?"png":"jpg";
  var imgSrc=img.base64?"data:"+(img.mtype||"image/jpeg")+";base64,"+img.base64:"";
  return "<div data-histimg='"+img.id+"' style='background:#161616;border-radius:12px;border:1px solid #2a2a2a;overflow:hidden;margin-bottom:12px'>"
    +"<div id='imgwrap-"+img.id+"' style='width:100%;min-height:120px;background:#131313;display:flex;align-items:center;justify-content:center'>"
    +(imgSrc?"<img src='"+imgSrc+"' style='width:100%;max-height:240px;object-fit:cover;display:block'/>"
            :"<span style='color:#5c5c5c;font-size:13px'>⏳ Laddar bild...</span>")
    +"</div>"
    +"<div style='padding:10px 14px'>"
    +"<div style='display:flex;align-items:center;gap:8px;margin-bottom:8px'>"
    +"<input class='inp' id='img-title-"+img.id+"' value='"+esc(title)+"' style='flex:1;font-size:13px;padding:7px 10px'/>"
    +"<button data-savetitle='"+img.id+"' style='padding:7px 12px;border-radius:8px;background:#1c3c5a;border:1px solid #4fa8ff;color:#4fa8ff;font-size:12px;cursor:pointer;white-space:nowrap'>✓</button>"
    +"</div>"
    +(catName?"<div style='font-size:11px;color:#5c5c5c;margin-bottom:6px'>"+esc(catName)+"</div>":"")
    +"<div style='font-size:10px;color:#5c5c5c;margin-bottom:8px'>"+fd(img.timestamp)+"</div>"
    +"<div style='display:flex;gap:8px'>"
    +"<button data-dlimg='"+img.id+"' data-fname='"+esc(fname)+"' style='flex:1;padding:7px 0;border-radius:8px;background:#1c3c5a;border:1px solid #4fa8ff;color:#4fa8ff;font-size:12px;cursor:pointer'>↓ Ladda ner</button>"
    +"<button data-delimg='"+img.id+"' style='padding:7px 12px;background:none;border:1px solid #2a2a2a;border-radius:8px;color:#5c5c5c;cursor:pointer;font-size:12px'>Ta bort</button>"
    +"</div></div></div>";
}

function renderHistBilder(){
  var c=document.getElementById("hist-content");
  if(!imageHist.length){c.innerHTML="<div class='empty'><div class='eico'>🖼️</div>Inga bilder uppladdade annu.</div>";return;}

  var sorterade=imageHist.slice().sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);});
  var senaste4=sorterade.slice(0,4);
  // "" (Välj kategori, ej vald än) och BILD_KAT_ALLA (explicit "Alla kategorier") ger
  // samma resultat - visa allt. BILD_KAT_INGEN visar bara bilder utan bildkategori satt.
  // Allt annat är ett riktigt kategori-id från AKTIVITET_BILDKATEGORIER.
  var filtrerade;
  if(bildKategoriFilter===BILD_KAT_INGEN){
    filtrerade=sorterade.filter(function(img){return !imgKategoriId(img);});
  }else if(bildKategoriFilter&&bildKategoriFilter!==BILD_KAT_ALLA){
    filtrerade=sorterade.filter(function(img){return imgKategoriId(img)===bildKategoriFilter;});
  }else{
    filtrerade=sorterade;
  }
  var synliga=filtrerade.slice(0,bildVisaAntal);

  var html="<div style='margin-bottom:18px'>"
    +"<div style='font-size:11px;color:#5c5c5c;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em'>Senaste bilderna</div>"
    +"<div style='display:grid;grid-template-columns:repeat(4,1fr);gap:8px'>"
    +senaste4.map(function(img){return imgThumb(img);}).join("")
    +"</div></div>"
    +buildBildKategoriDropdown();
  if(!filtrerade.length){
    html+="<div class='empty'><div class='eico'>🖼️</div>Inga bilder i denna kategori.</div>";
  }else{
    html+="<div id='bild-lista'>"+synliga.map(function(img){return imgEntry(img);}).join("")+"</div>";
    if(filtrerade.length>synliga.length){
      html+="<button id='bild-visa-fler' style='width:100%;padding:12px;border-radius:8px;background:#161616;border:1px solid #2a2a2a;color:#c9c9c9;font-size:13px;cursor:pointer;margin-top:4px'>Visa fler ("+(filtrerade.length-synliga.length)+" till)</button>";
    }
  }
  c.innerHTML=html;

  var dd=c.querySelector("#bild-kat-filter");
  if(dd)dd.onchange=function(){bildKategoriFilter=dd.value;bildVisaAntal=10;renderHistBilder();};

  var merKnapp=c.querySelector("#bild-visa-fler");
  if(merKnapp)merKnapp.onclick=function(){bildVisaAntal+=10;renderHistBilder();};

  // Lazy-load images that don't have base64 (senaste-4 thumbnails + den paginerade listan, utan dubbelladdning).
  // Skyddad mot att loadImageBase64 saknas/har annat namn i core.js (då syns bara "Laddar bild..."
  // istället för att krascha resten av renderingen).
  var attLadda={};
  senaste4.concat(synliga).forEach(function(img){attLadda[img.id]=img;});
  if(typeof loadImageBase64!=="function")return;
  Object.keys(attLadda).forEach(function(key){
    var img=attLadda[key];
    if(img.base64||!img.driveId)return;
    loadImageBase64(img).then(function(b64){
      if(!b64)return;
      img.base64=b64;
      var thumbwrap=c.querySelector("#thumbwrap-"+img.id);
      if(thumbwrap)thumbwrap.innerHTML="<img src='data:"+(img.mtype||"image/jpeg")+";base64,"+b64+"' style='width:100%;height:100%;object-fit:cover;display:block'/>";
      var imgwrap=c.querySelector("#imgwrap-"+img.id);
      if(imgwrap)imgwrap.innerHTML="<img src='data:"+(img.mtype||"image/jpeg")+";base64,"+b64+"' style='width:100%;max-height:240px;object-fit:cover;display:block'/>";
    });
  });

  c.querySelectorAll("[data-savetitle]").forEach(function(btn){
    btn.onclick=function(){
      var id=Number(btn.dataset.savetitle);
      var inp=c.querySelector("#img-title-"+id);
      var img=imageHist.find(function(i){return i.id===id;});
      if(img&&inp){img.activity=inp.value.trim()||img.activity;saveAndSync("bilder");renderHistBilder();}
    };
  });
  c.querySelectorAll("[data-dlimg]").forEach(function(btn){
    btn.onclick=function(){
      var id=Number(btn.dataset.dlimg);
      var img=imageHist.find(function(i){return i.id===id;});
      if(!img)return;
      var doDownload=function(b64){
        var a=document.createElement("a");
        a.href="data:"+(img.mtype||"image/jpeg")+";base64,"+b64;
        a.download=btn.dataset.fname;
        document.body.appendChild(a);a.click();document.body.removeChild(a);
      };
      if(img.base64){doDownload(img.base64);}
      else{loadImageBase64(img).then(function(b64){if(b64){img.base64=b64;doDownload(b64);}});}
    };
  });
  c.querySelectorAll("[data-delimg]").forEach(function(btn){
    btn.onclick=function(){
      var id=Number(btn.dataset.delimg);
      var img=imageHist.find(function(i){return i.id===id;});
      if(img&&img.driveId)driveDeleteFile(img.driveId);
      confirmDelete('Vill du ta bort bilden?',function(){if(img&&img.driveId)driveDeleteFile(img.driveId);imageHist=imageHist.filter(function(i){return i.id!==id;});saveAndSync("bilder");renderHistBilder();});
    };
  });
}

function renderHistFunderingar(){
  var c=document.getElementById("hist-content");
  if(!fundHist.length){c.innerHTML="<div class='empty'><div class='eico'>💭</div>Inga funderingar annu.</div>";return;}
  renderGroupedByDate(c,fundHist,function(f){return new Date(f.timestamp);},function(f){return fundEntryHist(f);});
}

function renderHistSamtal(){
  var c=document.getElementById("hist-content");
  if(!sentConvs.length){c.innerHTML="<div class='empty'><div class='eico'>💬</div>Inga samtal annu.</div>";return;}
  renderGroupedByDate(c,sentConvs,function(cv){return new Date(cv.timestamp);},function(cv){
    var person=sentPeople.find(function(p){return p.id===cv.personId;});
    return convEntryHist(cv,person);
  });
}

// Delad bind-logik för logg-poster (aktiviteter): redigera/spara/avbryt/ta bort.
// Används av både Historik (renderGroupedByDate) och Aktivitet->Handelser, så de
// beter sig och ser exakt likadana ut.
function bindLogEntryActions(container,onChange){
  container.querySelectorAll(".delbtn[data-id]").forEach(function(btn){
    btn.onclick=function(e){e.stopPropagation();confirmDelete('Vill du ta bort aktiviteten?',function(){logs=logs.filter(function(l){return l.id!==Number(btn.dataset.id);});editingId=null;saveAndSync("aktiviteter");hdr();onChange();});};
  });
  container.querySelectorAll("[data-jumpimg]").forEach(function(el){
    el.onclick=function(e){e.stopPropagation();jumpToImgInHistory(Number(el.dataset.jumpimg));};
  });
  container.querySelectorAll("[data-jumpact]").forEach(function(el){
    el.onclick=function(e){e.stopPropagation();jumpToLogInHistory(Number(el.dataset.jumpact));};
  });
  container.querySelectorAll("[data-edit]").forEach(function(btn){
    btn.onclick=function(e){e.stopPropagation();editingId=Number(btn.dataset.edit);onChange();};
  });
  logs.forEach(function(log){
    if(editingId!==log.id)return;
    // Aktiv tid button
    var aktivBtn=container.querySelector("#edit-aktivtid-"+log.id);
    var editTpInp=container.querySelector("#edit-tidpunkt-"+log.id);
    bindTidpunktInp(editTpInp);
    if(aktivBtn)aktivBtn.onclick=function(){
      var now=new Date();
      var hh=String(now.getHours()).padStart(2,"0");
      var mm=String(now.getMinutes()).padStart(2,"0");
      if(editTpInp)editTpInp.value=hh+":"+mm;
    };
    // Place preset
    var placePresetEl=container.querySelector("#edit-place-preset-"+log.id);
    var placeInpEl=container.querySelector("#edit-place-"+log.id);
    if(placePresetEl&&placeInpEl)placePresetEl.onchange=function(){
      if(!placePresetEl.value)return;
      placeInpEl.value=placeInpEl.value.trim()?(placeInpEl.value.trim()+", "+placePresetEl.value):placePresetEl.value;
      placePresetEl.value="";
    };
    // Clock button
    var editClockH=0,editClockM=0;
    var existDispEl=container.querySelector("#edit-clock-disp-"+log.id);
    if(existDispEl&&existDispEl.textContent){
      var ehm=existDispEl.textContent.match(/(\d+)h/);var emm=existDispEl.textContent.match(/(\d+)m/);
      if(ehm)editClockH=parseInt(ehm[1]);if(emm)editClockM=parseInt(emm[1]);
    }
    var clockBtnEl=container.querySelector("#edit-clock-btn-"+log.id);
    if(clockBtnEl)clockBtnEl.onclick=function(){
      showClockOverlayFor(editClockH,editClockM,function(h,m){
        editClockH=h;editClockM=m;
        clockBtnEl.textContent="⏰ "+String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
        var disp=container.querySelector("#edit-clock-disp-"+log.id);
        if(disp)disp.textContent=h+"h "+m+"m";
      });
    };
    var saveBtn=container.querySelector("#save-edit-"+log.id);
    if(saveBtn){
      saveBtn.onclick=function(){
        var nameEl=container.querySelector("#edit-name-"+log.id);
        if(nameEl&&nameEl.value.trim())log.activity=nameEl.value.trim();
        var catEl=container.querySelector("#edit-cat-"+log.id);
        if(catEl)log.category=catEl.value;
        var tp=container.querySelector("#edit-tidpunkt-"+log.id);
        var tpResult=buildLogTimestamp(tp?tp.value:"");
        if(!tpResult.ok){
          showInfoPopup("Ogiltig tidpunkt",tpResult.message);
          return;
        }
        var hh=String(tpResult.date.getHours()).padStart(2,"0");
        var mm=String(tpResult.date.getMinutes()).padStart(2,"0");
        if(tp)tp.value=hh+":"+mm;
        var durVal=(editClockH>0||editClockM>0)?editClockH+"h "+editClockM+"m":"";
        var parts=[hh+":"+mm];if(durVal)parts.push(durVal);
        log.time=parts.join(" | ");
        var placeEl=container.querySelector("#edit-place-"+log.id);
        log.place=placeEl?placeEl.value.trim():"";
        var noteEl=container.querySelector("#edit-note-"+log.id);
        log.note=noteEl?noteEl.value.trim():"";
        var dateEl=container.querySelector("#edit-date-"+log.id);
        var newTimestamp=new Date(log.timestamp);
        if(dateEl&&dateEl.value){
          var dParts=dateEl.value.split("-");
          newTimestamp=new Date(parseInt(dParts[0],10),parseInt(dParts[1],10)-1,parseInt(dParts[2],10));
        }
        newTimestamp.setHours(parseInt(hh,10),parseInt(mm,10),0,0);
        log.timestamp=newTimestamp.toISOString();
        editingId=null;saveAndSync("aktiviteter");onChange();
      };
    }
    if(container.querySelector("#cancel-edit-"+log.id)){
      container.querySelector("#cancel-edit-"+log.id).onclick=function(){editingId=null;onChange();};
    }
  });
}

function renderGroupedByDate(container,items,getDate,renderItem){
  var byYear={};
  var MONTHS=["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"];
  var DAYS=["Sondag","Mandag","Tisdag","Onsdag","Torsdag","Fredag","Lordag"];

  items.forEach(function(item){
    var d=getDate(item);
    var y=d.getFullYear();
    var mo=d.getMonth();
    var day=d.getDate();
    var dayKey=y+"-"+String(mo+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
    var moKey=y+"-"+String(mo+1).padStart(2,"0");
    if(!byYear[y])byYear[y]={};
    if(!byYear[y][moKey])byYear[y][moKey]={month:mo,days:{}};
    if(!byYear[y][moKey].days[dayKey])byYear[y][moKey].days[dayKey]={day:day,weekday:DAYS[d.getDay()],week:isoWeek(d),items:[]};
    byYear[y][moKey].days[dayKey].items.push(item);
  });

  var html="";
  var years=Object.keys(byYear).sort(function(a,b){return b-a;});

  years.forEach(function(y){
    var yearCount=0;
    Object.keys(byYear[y]).forEach(function(mk){Object.keys(byYear[y][mk].days).forEach(function(dk){yearCount+=byYear[y][mk].days[dk].items.length;});});
    html+=folderRow(y,"y-"+y,0,"y-"+openYear,yearCount);

    if(openYear==y){
      var months=Object.keys(byYear[y]).sort(function(a,b){return b.localeCompare(a);});
      months.forEach(function(mk){
        var moData=byYear[y][mk];
        var moCount=0;Object.keys(moData.days).forEach(function(dk){moCount+=moData.days[dk].items.length;});
        var moLabel=MONTHS[moData.month];
        html+=folderRow(moLabel,"m-"+mk,1,"m-"+openMonth,moCount);

        if(openMonth==mk){
          var days=Object.keys(moData.days).sort(function(a,b){return b.localeCompare(a);});
          days.forEach(function(dk){
            var dayData=moData.days[dk];
            var dayLabel=dayData.weekday+" "+dayData.day+" <span style='color:#5c5c5c;font-weight:400'>(v."+dayData.week+")</span>";
            html+=folderRow(dayLabel,"d-"+dk,2,"d-"+openDay,dayData.items.length);

            if(openDay==dk){
              var weekActive=(weekViewDay===dk);
              html+="<div style='display:flex;gap:6px;padding:6px 0 10px 24px'>"
                +"<button data-daymode='"+dk+"' style='background:"+(weekActive?"#131313":"#1c3c5a")+";border:1px solid "+(weekActive?"#2a2a2a":"#4fa8ff")+";color:"+(weekActive?"#5c5c5c":"#4fa8ff")+";font-size:11px;padding:6px 12px;border-radius:8px;cursor:pointer;font-weight:600'>📆 Dagen</button>"
                +"<button data-weekmode='"+dk+"' style='background:"+(weekActive?"#1c3c5a":"#131313")+";border:1px solid "+(weekActive?"#4fa8ff":"#2a2a2a")+";color:"+(weekActive?"#4fa8ff":"#5c5c5c")+";font-size:11px;padding:6px 12px;border-radius:8px;cursor:pointer;font-weight:600'>📅 Hela veckan (v."+dayData.week+")</button>"
                +(weekActive?"<button data-weeksort style='background:#131313;border:1px solid #2a2a2a;color:#5c5c5c;font-size:11px;padding:6px 12px;border-radius:8px;cursor:pointer;font-weight:600'>"+(weekSortDesc?"↓ Nyast först":"↑ Äldst först")+"</button>":"")
                +"</div>";
              if(weekActive){
                var wr=getWeekRange(new Date(dk+"T00:00:00"));
                var weekItems=items.filter(function(it){var d2=getDate(it);return d2>=wr.start&&d2<=wr.end;})
                  .sort(function(a,b){return weekSortDesc?getDate(b)-getDate(a):getDate(a)-getDate(b);});
                var lastDayKey=null;
                weekItems.forEach(function(it){
                  var d2=getDate(it);
                  var dk2=d2.getFullYear()+"-"+String(d2.getMonth()+1).padStart(2,"0")+"-"+String(d2.getDate()).padStart(2,"0");
                  if(dk2!==lastDayKey){
                    lastDayKey=dk2;
                    html+="<div style='padding:8px 0 4px 24px;font-size:11px;font-weight:600;color:#5c5c5c'>"+DAYS[d2.getDay()]+" "+d2.getDate()+" "+MONTHS[d2.getMonth()]+"</div>";
                  }
                  html+=renderItem(it);
                });
              } else {
                dayData.items.forEach(function(item){html+=renderItem(item);});
              }
            }
          });
        }
      });
    }
  });

  container.innerHTML=html;

  container.querySelectorAll("[data-folder]").forEach(function(el){
    el.onclick=function(){
      var key=el.dataset.folder;
      var level=Number(el.dataset.level);
      if(level===0){var y=key.replace("y-","");openYear=(openYear==y?null:y);openMonth=null;openDay=null;weekViewDay=null;}
      else if(level===1){var mk=key.replace("m-","");openMonth=(openMonth==mk?null:mk);openDay=null;weekViewDay=null;}
      else if(level===2){var dk=key.replace("d-","");openDay=(openDay==dk?null:dk);weekViewDay=null;}
      editingId=null;editingFundId=null;renderHistory();
    };
  });
  container.querySelectorAll("[data-daymode]").forEach(function(btn){
    btn.onclick=function(e){
      e.stopPropagation();
      weekViewDay=null;
      renderHistory();
    };
  });
  container.querySelectorAll("[data-weekmode]").forEach(function(btn){
    btn.onclick=function(e){
      e.stopPropagation();
      weekViewDay=btn.dataset.weekmode;
      renderHistory();
    };
  });
  container.querySelectorAll("[data-weeksort]").forEach(function(btn){
    btn.onclick=function(e){
      e.stopPropagation();
      weekSortDesc=!weekSortDesc;
      renderHistory();
    };
  });

  // Activity entry actions
  bindLogEntryActions(container,function(){renderHistory();});

  // Funderingar entry actions
  container.querySelectorAll("[data-hdel-fund]").forEach(function(btn){
    btn.onclick=function(e){e.stopPropagation();confirmDelete('Vill du ta bort funderingen?',function(){fundHist=fundHist.filter(function(f){return f.id!==Number(btn.dataset.hdelFund);});editingFundId=null;saveAndSync("funderingar");renderHistory();});};
  });
  container.querySelectorAll("[data-hedit-fund]").forEach(function(btn){
    btn.onclick=function(e){e.stopPropagation();editingFundId=Number(btn.dataset.heditFund);render();};
  });
  fundHist.forEach(function(f){
    var saveBtn=container.querySelector("#hsave-fund-"+f.id);
    var cancelBtn=container.querySelector("#hcancel-fund-"+f.id);
    if(saveBtn){
      saveBtn.onclick=function(){
        var newText=container.querySelector("#hedit-fund-"+f.id).value.trim();
        if(newText)f.text=newText;
        var catSel=container.querySelector("#hedit-fundcat-"+f.id);
        if(catSel)f.category=catSel.value||undefined;
        editingFundId=null;saveAndSync("funderingar");renderHistory();
      };
    }
    if(cancelBtn){cancelBtn.onclick=function(){editingFundId=null;render();};}
  });

  // Samtal entry: click to open Samtal-fliken (den gamla person/chatt-vyn finns inte kvar)
  container.querySelectorAll("[data-hconv]").forEach(function(el){
    el.onclick=function(e){
      e.stopPropagation();
      setView("samtal");render();
    };
  });
}

// ---- KOMMUNIKATION ----

