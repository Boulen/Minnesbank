function renderKonversationTop(){
  var lc=document.getElementById("body");
  if(!lc)return;
  var subTabs="<div style='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:20px'>"
    +"<button class='mode-btn"+(konvSubview==="skamt"?" on":"")+"' data-konvsub='skamt' style='font-size:11px'>Skämt</button>"
    +"<button class='mode-btn"+(konvSubview==="samtalsamnen"?" on":"")+"' data-konvsub='samtalsamnen' style='font-size:11px'>Samtalsämnen</button>"
    +"</div>";
  lc.innerHTML=subTabs+"<div id='konv-content'></div>";
  lc.querySelectorAll("[data-konvsub]").forEach(function(btn){
    btn.onclick=function(){switchKonvSubview(btn.dataset.konvsub);};
  });
  renderKonvContent();
}

function switchKonvSubview(sub){
  konvSubview=sub;
  var tabMap={skamt:"skamt",samtalsamnen:"samtalsamnen"};
  var tab=tabMap[sub]||"tips";
  document.querySelectorAll("[data-konvsub]").forEach(function(btn){btn.classList.toggle("on",btn.dataset.konvsub===sub);});
  var kc=document.getElementById("konv-content");
  if(kc)kc.innerHTML="<div style='padding:30px;text-align:center;color:#5c5c5c;font-size:13px'>⏳ Laddar...</div>";
  loadTab(tab).then(function(){renderKonvContent();});
}

function renderKonvContent(){
  if(konvSubview==="samtalsamnen")renderSamtalsamnen();
  else renderSkamt();
}


var amneHist=[];
var amneDraft="";
var amneCatSelect="", amneReadCat="", amneReadActive=false, editingAmneKeyLog=null;
var konvSubview="skamt"; // skamt | samtalsamnen

// ---- SAMTAL (Text + Muntligt kommunikationshjälp) ----

function amneRow(f,prefix){
  return "<div class='entry'>"
    +"<span style='font-size:20px'>🗣️</span>"
    +"<div style='flex:1'>"
    +(f.category?"<div style='font-size:11px;color:#5c5c5c;margin-bottom:2px'>"+esc(f.category)+"</div>":"")
    +"<div class='etitle' style='white-space:pre-wrap;font-weight:400;line-height:1.5'>"+esc(f.text)+"</div>"
    +"<div class='etime'>"+fd(f.timestamp)+"</div>"
    +"</div>"
    +"<button class='delbtn' data-editamnelog='"+prefix+":"+f.id+"' style='color:#5c5c5c;font-size:14px;padding:2px 6px'>✏️</button>"
    +"<button class='delbtn' data-delamnelog='"+f.id+"'>x</button>"
    +"</div>";
}
function amneEditRow(f,prefix){
  var catOpts="<option value=''>Ingen kategori</option>"
    +AMNE_CAT_PRESETS.map(function(cat){return "<option value='"+esc(cat)+"'"+(cat===f.category?" selected":"")+">"+esc(cat)+"</option>";}).join("");
  return "<div class='entry' style='flex-direction:column;gap:10px'>"
    +"<select id='editamnecatlog-"+prefix+"-"+f.id+"' style='width:100%;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:9px 10px;cursor:pointer;font-family:inherit'>"+catOpts+"</select>"
    +"<textarea class='ta' id='editamnelog-"+prefix+"-"+f.id+"' style='min-height:90px'>"+esc(f.text)+"</textarea>"
    +"<div style='display:flex;gap:8px'>"
    +"<button class='sec' data-saveamnelog='"+prefix+":"+f.id+"' style='flex:1'>Spara</button>"
    +"<button class='sec ghost' data-cancelamnelog='"+prefix+":"+f.id+"' style='flex:1'>Avbryt</button>"
    +"</div></div>";
}

function renderSamtalsamnen(){
  var c=document.getElementById("konv-content");
  var todayStart=new Date();todayStart.setHours(0,0,0,0);
  var todayEnd=new Date();todayEnd.setHours(23,59,59,999);
  var todayAmne=amneHist.filter(function(f){var t=new Date(f.timestamp);return t>=todayStart&&t<=todayEnd;});

  var catOptions="<option value=''>Ingen kategori</option>"
    +AMNE_CAT_PRESETS.map(function(cat){return "<option value='"+esc(cat)+"'"+(cat===amneCatSelect?" selected":"")+">"+esc(cat)+"</option>";}).join("");
  var readCatOptions="<option value=''>Välj kategori</option>"
    +AMNE_CAT_PRESETS.map(function(cat){return "<option value='"+esc(cat)+"'"+(cat===amneReadCat?" selected":"")+">"+esc(cat)+"</option>";}).join("");

  var todayList=todayAmne.length?todayAmne.map(function(f){
    return editingAmneKeyLog==="today:"+f.id?amneEditRow(f,"today"):amneRow(f,"today");
  }).join(""):"<div style='font-size:13px;color:#5c5c5c;margin-top:10px;text-align:center'>Inga samtalsämnen idag annu.</div>";

  var readSection="";
  if(amneReadActive&&amneReadCat){
    var catAmne=amneHist.filter(function(f){return f.category===amneReadCat;});
    readSection="<div class='mt20'><div class='lbl'>"+esc(amneReadCat)+" ("+catAmne.length+")</div>"
      +(catAmne.length?catAmne.map(function(f){
        return editingAmneKeyLog==="read:"+f.id?amneEditRow(f,"read"):amneRow(f,"read");
      }).join(""):"<div style='font-size:13px;color:#5c5c5c;margin-top:10px;text-align:center'>Inga samtalsämnen i denna kategori annu.</div>")
      +"</div>";
  }

  var todayAmneIds={};todayAmne.forEach(function(f){todayAmneIds[f.id]=true;});
  var remainingAmne=Math.max(0,5-todayAmne.length);
  var recentAmne=remainingAmne>0
    ?amneHist.filter(function(f){return !todayAmneIds[f.id];}).sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);}).slice(0,remainingAmne)
    :[];
  var recentHtml=recentAmne.length
    ?"<div class='mt20'><div class='lbl'>Senaste 5</div>"
      +recentAmne.map(function(f){
        return editingAmneKeyLog==="recent:"+f.id?amneEditRow(f,"recent"):amneRow(f,"recent");
      }).join("")
      +"</div>"
    :"";

  c.innerHTML="<div style='font-size:13px;color:#5c5c5c;margin-bottom:16px;line-height:1.5'>Spara idéer på samtalsämnen inför nästa samtal med någon.</div>"
    +"<div class='lbl'>Kategori</div>"
    +"<select id='amnecat-select' style='width:100%;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:14px;padding:10px 12px;cursor:pointer;font-family:inherit;margin-bottom:10px'>"+catOptions+"</select>"
    +"<textarea class='ta' id='amnein' placeholder='Vilket samtalsämne?'>"+esc(amneDraft)+"</textarea>"
    +"<button class='sec' id='amneadd' style='width:100%'>Spara samtalsämne</button>"
    +"<div class='mt20'><div class='lbl'>Läs samtalsämnen per kategori</div>"
    +"<div style='display:flex;gap:8px'>"
    +"<select id='amneread-select' style='flex:1;background:#161616;border:1px solid #2a2a2a;border-radius:10px;color:#f2f2f2;font-size:13px;padding:0 10px;cursor:pointer;font-family:inherit'>"+readCatOptions+"</select>"
    +"<button id='amneread-btn' class='sec ghost' style='padding:0 18px'>Läs</button>"
    +"</div>"
    +readSection
    +recentHtml
    +"</div>"
    +"<div class='mt20'><div class='lbl'>Dagens samtalsämnen</div>"+todayList+"</div>";

  var catSel=c.querySelector("#amnecat-select");
  if(catSel)catSel.onchange=function(){amneCatSelect=catSel.value;};

  var ta=c.querySelector("#amnein");
  if(ta)ta.oninput=function(){amneDraft=ta.value;};
  c.querySelector("#amneadd").onclick=function(){
    var txt=c.querySelector("#amnein").value.trim();
    if(!txt)return;
    var entry={id:Date.now(),text:txt,timestamp:new Date().toISOString()};
    if(amneCatSelect)entry.category=amneCatSelect;
    amneHist.unshift(entry);
    amneDraft="";saveAndSync("samtalsamnen");renderSamtalsamnen();
  };

  var readSel=c.querySelector("#amneread-select");
  if(readSel)readSel.onchange=function(){amneReadCat=readSel.value;};
  c.querySelector("#amneread-btn").onclick=function(){
    if(!c.querySelector("#amneread-select").value){alert("Välj en kategori först.");return;}
    amneReadCat=c.querySelector("#amneread-select").value;
    amneReadActive=true;renderSamtalsamnen();
  };

  c.querySelectorAll("[data-delamnelog]").forEach(function(btn){
    btn.onclick=function(){
      amneHist=amneHist.filter(function(f){return f.id!==Number(btn.dataset.delamnelog);});
      editingAmneKeyLog=null;saveAndSync("samtalsamnen");renderSamtalsamnen();
    };
  });
  c.querySelectorAll("[data-editamnelog]").forEach(function(btn){
    btn.onclick=function(){editingAmneKeyLog=btn.dataset.editamnelog;renderSamtalsamnen();};
  });
  c.querySelectorAll("[data-saveamnelog]").forEach(function(btn){
    btn.onclick=function(){
      var parts=btn.dataset.saveamnelog.split(":");
      var prefix=parts[0],fid=Number(parts[1]);
      var f=amneHist.find(function(x){return x.id===fid;});
      var inp=c.querySelector("#editamnelog-"+prefix+"-"+fid);
      var catSel2=c.querySelector("#editamnecatlog-"+prefix+"-"+fid);
      if(f&&inp&&inp.value.trim())f.text=inp.value.trim();
      if(f&&catSel2)f.category=catSel2.value||undefined;
      editingAmneKeyLog=null;saveAndSync("samtalsamnen");renderSamtalsamnen();
    };
  });
  c.querySelectorAll("[data-cancelamnelog]").forEach(function(btn){
    btn.onclick=function(){editingAmneKeyLog=null;renderSamtalsamnen();};
  });
}


var newJokeDraft="";
function renderSkamt(){
  var b=document.getElementById("konv-content");
  b.innerHTML="<div class='eico' style='text-align:center;padding-top:20px'>😄</div>"
    +"<div style='display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px'>"
    +"<button class='sec ghost' id='skamtbtn'>Skämt</button>"
    +"<button class='sec ghost' id='savedskamtbtn'>Sparat Skämt</button>"
    +"</div>"
    +"<div id='joke-result'></div>"
    +"<div class='mt20'><div class='lbl'>Skriv ditt eget skämt</div>"
    +"<textarea class='ta' id='newjoke-in' placeholder='Skriv ett skämt...'>"+esc(newJokeDraft)+"</textarea>"
    +"<button class='sec' id='newjoke-save' style='width:100%'>Spara skämt</button>"
    +"<div id='newjoke-toast'></div>"
    +"</div>";
  b.querySelector("#skamtbtn").onclick=function(){fetchSkamt();};
  b.querySelector("#savedskamtbtn").onclick=function(){fetchSparatSkamt();};

  var ji=b.querySelector("#newjoke-in");
  if(ji)ji.oninput=function(){newJokeDraft=ji.value;};
  b.querySelector("#newjoke-save").onclick=function(){
    var inp=b.querySelector("#newjoke-in");
    var txt=inp.value.trim();
    if(!txt)return;
    savedJokes.push(txt);
    saveAndSync("skamt");
    newJokeDraft="";
    inp.value="";
    var toast=b.querySelector("#newjoke-toast");
    if(toast){toast.innerHTML="<div class='ok-toast'>Skämt sparat!</div>";setTimeout(function(){toast.innerHTML="";},2000);}
  };
}

var SKAMT=[
  "Varför kan man aldrig lita på en trappa? Den är alltid upp till något.",
  "Vad kallas en boomerang som inte kommer tillbaka? En pinne.",
  "Vad sa väggen till den andra väggen? Vi ses i hörnet.",
  "Jag åt en klocka igår. Det var tidskrävande.",
  "Har du hört skämtet om hopprepet? Nej, vi hoppar det.",
  "Vad är skillnaden mellan ignorans och apati? Jag vet inte och jag bryr mig inte.",
  "Jag tänkte dra ett skämt om en hammare men det slog inte rätt.",
  "Vilken fransk byggnad har alltid rätt? Ej-feltornet.",
  "Varför gick bajskorven till polisen? Han kände sig utpressad.",
  "Jag tänkte bjuda en zombie på middag. Jag lovar att han äter mer än hjärna.",
  "Vilken fest är mest allergiframkallande? Hö-balen.",
  "Bagaren får ju inte bli medlem, men han kan få delta i mötet som jäst.",
  "En groda hamnade på sjukhus för att han tappade benen. Vad kallade personalen honom? Ett hopplöst fall.",
  "Varför kliar du dig så mycket? Jag fick skin(n)klåda till middag.",
  "Jag tänkte dra ett skämt om Titanic men ville inte sjunka så lågt.",
  "Varför är det så många rullstolsbundna på golfbanan? De försöker minska sitt handicap.",
  "Vad händer om man sväljer linjaler? Man blir mätt i magen.",
  "I vilken stad sitter man längst i bilköer? Konstant-in-opel.",
  "Vad är skillnaden på ett lejon och en giraff? En giraff har en större hals.",
  "Har du hört skämtet om staketet? Annars hoppar vi över det.",
  "När jag tidigare arbetade på flyttfirma fick jag en möbel i huvudet. Det var en skänk från ovan.",
  "Vill du höra ett torrt skämt? Jaa. Afrika.",
  "Jag är dålig på att räkna bråk. Jag är konflikträdd.",
  "Varför kastade pojken ut klockan från fönstret? Han ville se tiden flyga iväg.",
  "Har du hört om läkaren som blev ryttare? Han sadlade om.",
  "Vad kallar man en hund utan ben? Spelar ingen roll, den kommer ändå inte.",
  "Jag berättade ett skämt om luft. Det gick över huvudet.",
  "Jag kan inte lita på kalendern. Den är full av datum.",
  "Vad gör en elektriker när han är arg? Får kortslutning.",
  "Varför gick boken till doktorn? Den hade för många problem.",
  "Två kor står på en betesmark. Plötsligt säger den ene: Muuuhh. Besviket säger den andra: Det skulle ju jag precis säga.",
  "Vet du hur långt Norges första elbil gick? Nej. 27 meter, sedan räckte inte sladden längre.",
  "Varför äter fransmän sniglar? De har inte råd med snabbmat.",
  "Vad är den ledande orsaken till torr hud? Handdukar.",
  "Vilken julsång borde vara olaglig att sjunga på ett ålderdomshem? Last Christmas."
];

async function fetchSkamt(){
  var jd=document.getElementById("joke-result");
  if(!jd)return;
  var joke=SKAMT[Math.floor(Math.random()*SKAMT.length)];
  jd.innerHTML="<div style='margin-top:16px;padding:16px;background:#131313;border-radius:12px;border:1px solid #2a2a2a;font-size:15px;color:#f2f2f2;line-height:1.6;text-align:center'>"+esc(joke)+"</div>"
    +"<div style='display:flex;gap:8px;margin-top:8px'>"
    +"<button class='sec ghost' id='savejokebtn' style='flex:1;font-size:12px;padding:8px'>Spara skämt</button>"
    +"<div id='savejoke-ok' style='display:none;font-size:12px;color:#7fae7f;align-self:center'>✓ Sparat!</div>"
    +"</div>";
  var saveBtn=jd.querySelector("#savejokebtn");
  if(saveBtn){
    saveBtn.onclick=function(){
      if(!savedJokes.includes(joke)){savedJokes.push(joke);saveAndSync("skamt");}
      saveBtn.textContent="Sparad!";saveBtn.disabled=true;
    };
  }
}
function fetchSparatSkamt(){
  var jd=document.getElementById("joke-result");
  if(!jd)return;
  if(!savedJokes.length){
    jd.innerHTML="<div style='margin-top:16px;padding:14px;background:#131313;border-radius:12px;border:1px solid #2a2a2a;font-size:13px;color:#5c5c5c;text-align:center'>Inga sparade skämt ännu. Klicka Skämt och spara ett!</div>";
    return;
  }
  var idx=Math.floor(Math.random()*savedJokes.length);
  var joke=savedJokes[idx];
  jd.innerHTML="<div style='margin-top:16px;padding:16px;background:#131313;border-radius:12px;border:1px solid #4fa8ff;font-size:15px;color:#f2f2f2;line-height:1.6;text-align:center'>"+joke.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>")+"</div>"
    +"<div style='display:flex;align-items:center;justify-content:center;gap:12px;margin-top:8px'>"
    +"<span style='font-size:11px;color:#5c5c5c'>"+savedJokes.length+" sparade skämt</span>"
    +"<button id='del-joke-btn' style='padding:4px 10px;border-radius:6px;background:#241315;border:1px solid #d97a83;color:#d97a83;font-size:12px;cursor:pointer;font-family:inherit'>x Ta bort</button>"
    +"</div>";
  jd.querySelector("#del-joke-btn").onclick=function(){
    confirmDelete('Vill du ta bort skämtet?',function(){savedJokes.splice(idx,1);saveAndSync("skamt");fetchSparatSkamt();});
  };
}
