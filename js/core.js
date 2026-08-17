

var PROXY = "https://ai-proxy.jenseskilsson95.workers.dev/";
var selectedModel = "anthropic/claude-sonnet-5";
try{var _sm=sessionStorage.getItem("selected_model_session");if(_sm)selectedModel=_sm;}catch(e){}
var MODELS = [
  {id:"anthropic/claude-sonnet-5",name:"Claude Sonnet 5",desc:"Balanserad och kraftfull — bra för det mesta"},
  {id:"anthropic/claude-opus-4.8",name:"Claude Opus 4.8",desc:"Anthropics kraftfullaste — komplex analys, kodning och agentarbete"},
  {id:"anthropic/claude-fable-5",name:"Claude Fable 5",desc:"Mythos-klass — toppresultat på kodning och avancerat kunskapsarbete"},
  {id:"anthropic/claude-haiku-4.5",name:"Claude Haiku 4.5",desc:"Snabbast och billigast — enkla frågor och snabba svar"},
  {id:"google/gemini-3.1-pro-preview",name:"Gemini 3.1 Pro",desc:"Googles kraftfullaste — komplex resonemang och kodning"},
  {id:"google/gemini-3.5-flash",name:"Gemini 3.5 Flash",desc:"Googles snabba modell — research, fakta och långa texter"},
  {id:"openai/gpt-5.5",name:"GPT-5.5",desc:"OpenAIs produktionsmodell — bra på instruktioner och struktur"},
  {id:"openai/gpt-mini-latest",name:"GPT Mini (senaste)",desc:"OpenAIs effektiva modell — snabb och kostnadseffektiv"},
  {id:"deepseek/deepseek-v4-pro",name:"DeepSeek V4 Pro",desc:"Stark open source-modell — utmärkt på kodning och analys"},
  {id:"x-ai/grok-4.5",name:"Grok 4.5",desc:"xAIs kraftfullaste modell — aktuell info och kreativt skrivande"}
];
var FILE_NAME = "aktivitetslogg_data.json";

var CATS = [
  {id:"traning",label:"Traning",e:"🏃"},
  {id:"gym",label:"Styrka",e:"🏋️"},
  {id:"kardio",label:"Kardio",e:"❤️"},
  {id:"media",label:"Media",e:"🎬"},
  {id:"bok",label:"Lasning",e:"📖"},
  {id:"studerat",label:"Studier",e:"🎓"},
  {id:"arbete",label:"Arbete",e:"💼"},
  {id:"somn",label:"Somn",e:"😴"},
  {id:"avslappning",label:"Avkoppling",e:"🛋️"},
  {id:"kodande",label:"Kodande",e:"💻"},
  {id:"stadning",label:"Stadning",e:"🧹"},
  {id:"fiske",label:"Fiske",e:"🎣"},
  {id:"tvatt",label:"Tvatt",e:"🧺"},
  {id:"ovrigt",label:"Ovrigt",e:"✨"}
];
var PLACE_PRESETS=["Hemma","Volvo Powertrain- Skövde","STC Elins","STC Ryd","Billingen","Willys"];
var ACT_PRESETS=["Arbete","AI-Hantering","Gym","Städa hem"];
// Nya kategori-specifika snabbval (ersätter de globala listorna ovan i gränssnittet)
var ACT_PRESETS_BY_CAT={};
var PLACE_PRESETS_BY_CAT={};
function migrateCatPresetsOnce(){
  if(!Object.keys(ACT_PRESETS_BY_CAT).length&&ACT_PRESETS.length){ACT_PRESETS_BY_CAT.ovrigt=ACT_PRESETS.slice();}
  if(!Object.keys(PLACE_PRESETS_BY_CAT).length&&PLACE_PRESETS.length){PLACE_PRESETS_BY_CAT.ovrigt=PLACE_PRESETS.slice();}
}
var CAT_PRESETS=[];
var FUND_CAT_PRESETS=[];
var AMNE_CAT_PRESETS=[];
var TIPSTRICKS_CAT_PRESETS=[];
var TIPSTRICKS_SUBCAT_BY_CAT={};

// Delad "Subkategorier"-väljare (samma mönster som Media-genrerna): kryssbar snabbvalslista +
// chips + fält för att registrera en ny subkategori. Används av bade lägg-till-formuläret och
// redigeringsraden sa att subkategorier hanteras pa exakt samma sätt överallt.

var MEDIA_CREATOR_BY_CAT={};
var MEDIA_GENRE_BY_CAT={};

var QUICK = {
  traning:["Lopning","Gympass","Cykling","Simning","Promenad","Stretching"],
  film:["Action","Komedi","Drama","Thriller","Skrack","Dokumentar"],
  serie:["Action","Komedi","Drama","Thriller","Anime","Dokusapa"],
  spel:["PC","Playstation","Xbox","Nintendo","Mobilspel","Brdsspel"],
  bok:["Skoenlitteratur","Facklitteratur","Thriller","Fantasy","Biografi","Sjalvhjalp"],
  studerat:["Matematik","Sprak","Programmering","Historia","Naturvetenskap","Annat"],
  musik:["Lyssnade pa musik","Spelade instrument","Konsert","Ovade sang","Ny playlist"],
  arbete:["Mote","Djupfokus","Epost","Planering","Projekttid"],
  somn:["Sov 8h","Sov 7h","Sov 6h","Tupplur","Dalig natt"],
  avslappning:["Meditation","Promenad","Bad","Yoga","Naturvistelse","Nolltid"],
  ovrigt:["Kreativt projekt","Social aktivitet","Naturvistelse","Annat"]
};
var CTXS = ["Kompis","Partner","Familj","Kollega","Rekryterare","Företag","Chef","Försäljare"];
var OTONES = ["Vanlig","Professionell","Direkt","Empatisk","Lekfull"];

var logs=[], tHist=[], sentMsgs=[], sentPeople=[], sentConvs=[], fundHist=[], imageHist=[], savedJokes=[];
// Fritt inmatade värden (för autoifyllnadsförslag i Plats/Aktivitet/Anteckning på Aktivitet-fliken)
var aktivitetHistory=[], platsHistory=[], anteckningHistory=[];
// Nytt kategori-specifikt förslag för Anteckning (Aktivitet)
var ANTECKNING_BY_CAT={};
function migrateAnteckningByCatOnce(){
  if(!Object.keys(ANTECKNING_BY_CAT).length&&anteckningHistory.length){ANTECKNING_BY_CAT.ovrigt=anteckningHistory.slice();}
}
var view="aktivitet", cat="", tipText="", tipsLoading=false, tipTopic="";
var tipsChat=null;
// Översättning — inget av detta sparas till Drive/localStorage, bara session-tillstånd.
var otInput="", otContext="", otResult="", otLoading=false, otNextInput="";
var kommMode="klarhet";
var kCtx="Van", kResult=null, kLoading=false, kDraft="";
var sCtx="Van", sResult=null, sLoading=false, sDraft="", sMyCtx="";
var oCtx="Van", oTone="Vanlig", oResult=null, oLoading=false, oDraft="";
var fResult=null, fLoading=false, fDraft="";
var synResult=null, synLoading=false, synDraft="";
var tMessages=[], tLoading=false, tInput="";

function fd(iso){return new Date(iso).toLocaleDateString("sv-SE",{weekday:"short",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});}
function esc(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
// Om texten börjar med en emoji (t.ex. "🏃 Sport" eller "🏃Sport" utan mellanslag) sorteras på texten
// efter emoji-tecknen. Om texten redan börjar med en bokstav lämnas den orörd.
function sortLabelKey(s){
  s=String(s||"");
  var stripped=s.replace(/^[^\p{L}]+/u,"");
  return stripped||s;
}
// CAT_PRESETS kan innehålla antingen ett riktigt CATS-id (löses upp via CATS.find) eller,
// för äldre/manuellt inskrivna poster, redan hela "emoji label"-strängen direkt.
// Plockar ut {...}-delen ur AI-svaret innan JSON.parse, så det tål extra text/kodblock runt om.
function extractJsonObject(text){
  text=String(text||"").replace(/```json|```/g,"").trim();
  var start=text.indexOf("{");
  var end=text.lastIndexOf("}");
  if(start===-1||end===-1||end<start)return text;
  return text.slice(start,end+1);
}
function catPresetSortKey(id){
  var ct=CATS.find(function(c){return c.id===id;});
  var display=ct?(ct.e+" "+ct.label):id;
  return sortLabelKey(display);
}
function copyText(txt){
  if(navigator.clipboard){navigator.clipboard.writeText(txt).catch(function(){});}
  else{var t=document.createElement("textarea");t.value=txt;document.body.appendChild(t);t.select();document.execCommand("copy");document.body.removeChild(t);}
}
function showCopyOk(id){var ok=document.getElementById(id);if(ok){ok.classList.add("vis");setTimeout(function(){ok.classList.remove("vis");},2000);}}
function spin(){return "<div style='text-align:center;padding:60px 0'><div class='spnr'></div><div style='color:#5c5c5c;font-size:13px;margin-top:14px'>Arbetar...</div></div>";}

// Lägger till/flyttar fram ett värde i en inmatningshistorik-array (senast använd först, dedupe, max 40).
function pushInmatningHistory(arr,value){
  var v=(value||"").trim();
  if(!v)return arr;
  var lower=v.toLowerCase();
  var next=arr.filter(function(x){return x.toLowerCase()!==lower;});
  next.unshift(v);
  return next.slice(0,40);
}

// Kopplar in ett textfält med en dropdown av tidigare inmatade värden som matchar det som skrivs.
function bindAutocomplete(inputEl,dropdownEl,getSuggestions,removeValue,onSelect){
  if(!inputEl||!dropdownEl)return;
  function update(){
    var val=inputEl.value.trim().toLowerCase();
    if(!val){dropdownEl.style.display="none";dropdownEl.innerHTML="";return;}
    var matches=getSuggestions().filter(function(s){return s.toLowerCase().indexOf(val)>-1&&s.toLowerCase()!==val;}).slice(0,6);
    if(!matches.length){dropdownEl.style.display="none";dropdownEl.innerHTML="";return;}
    dropdownEl.innerHTML=matches.map(function(s){
      return "<div class='ac-item'>"
        +"<span class='ac-item-text' data-acval='"+esc(s)+"'>"+esc(s)+"</span>"
        +"<button class='ac-item-remove' data-acremove='"+esc(s)+"' title='Ta bort förslag'>×</button>"
        +"</div>";
    }).join("");
    dropdownEl.style.display="block";
    dropdownEl.querySelectorAll("[data-acval]").forEach(function(item){
      item.onmousedown=function(e){
        e.preventDefault();
        inputEl.value=item.dataset.acval;
        dropdownEl.style.display="none";dropdownEl.innerHTML="";
        if(onSelect)onSelect(item.dataset.acval);
      };
    });
    dropdownEl.querySelectorAll("[data-acremove]").forEach(function(btn){
      btn.onmousedown=function(e){
        e.preventDefault();
        e.stopPropagation();
        if(removeValue)removeValue(btn.dataset.acremove);
        update();
      };
    });
  }
  inputEl.oninput=update;
  inputEl.onfocus=update;
  inputEl.addEventListener("blur",function(){setTimeout(function(){dropdownEl.style.display="none";},150);});
}

// Delad "kategori-specifika snabbval"-dropdown (varje kategori har sin egen lista, med X för att ta bort).
// Används av Aktivitet/Plats, Media (Kreatör/Genre), Föremål (Tillverkare) och Plats-betyg (Kommun).
var _openCatDropdown=null;
if(!window._catDropdownOutsideClickBound){
  window._catDropdownOutsideClickBound=true;
  document.addEventListener("mousedown",function(e){
    if(!_openCatDropdown)return;
    var d=_openCatDropdown.dropdownEl,t=_openCatDropdown.toggleBtn;
    if(d&&t&&!d.contains(e.target)&&e.target!==t){
      d.style.display="none";
      _openCatDropdown=null;
    }
  });
}
function bindCatPresetDropdown(inputEl,toggleBtn,dropdownEl,addBtn,getDict,getCat,saveTag){
  if(!inputEl||!toggleBtn||!dropdownEl||!addBtn)return;
  function renderList(){
    var list=(getDict()[getCat()]||[]);
    dropdownEl.innerHTML=list.length?list.map(function(s){
      return "<div class='ac-item'><span class='ac-item-text' data-catval='"+esc(s)+"'>"+esc(s)+"</span><button class='ac-item-remove' data-catremove='"+esc(s)+"' title='Ta bort'>×</button></div>";
    }).join(""):"<div class='empty' style='padding:10px;font-size:12px'>Inga snabbval för denna kategori än.</div>";
    dropdownEl.style.display="block";
    _openCatDropdown={dropdownEl:dropdownEl,toggleBtn:toggleBtn};
    dropdownEl.querySelectorAll("[data-catval]").forEach(function(item){
      item.onmousedown=function(e){
        e.preventDefault();
        var current=inputEl.value.trim();
        inputEl.value=current?(current+", "+item.dataset.catval):item.dataset.catval;
        dropdownEl.style.display="none";
        _openCatDropdown=null;
      };
    });
    dropdownEl.querySelectorAll("[data-catremove]").forEach(function(btn){
      btn.onmousedown=function(e){
        e.preventDefault();e.stopPropagation();
        var dict=getDict();
        var c=getCat();
        if(dict[c])dict[c]=dict[c].filter(function(x){return x!==btn.dataset.catremove;});
        saveAndSync(saveTag);
        renderList();
      };
    });
  }
  toggleBtn.onclick=function(){
    if(dropdownEl.style.display==="block"){dropdownEl.style.display="none";_openCatDropdown=null;}
    else renderList();
  };
  addBtn.onclick=function(){
    var v=inputEl.value.trim();
    if(!v)return;
    var dict=getDict();
    var c=getCat();
    if(!dict[c])dict[c]=[];
    if(dict[c].indexOf(v)<0)dict[c].unshift(v);
    saveAndSync(saveTag);
    if(dropdownEl.style.display==="block")renderList();
  };
}

// NOTE: App data, history and settings are never cached in localStorage.
// They are always read directly from the Drive JSON files (via loadTab)
// and written directly back to Drive (via saveTab). These two functions
// are kept as harmless no-ops so existing call sites don't need to change.
async function loadLocal(){}
function saveLocal(){}

function downloadEmojiRef(){
  var groups=[
    ["Ansikten & känslor","😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕"],
    ["Händer & kropp","👋 🤚 🖐 ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 💪 🦾 👂 🦻 👃 🧠 🦷 🦴 👁 👀 👅 👄"],
    ["Sport & aktivitet","⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 ⛳ 🎣 🤿 🥊 🥋 🎽 🛹 ⛸ 🎿 ⛷ 🏂 🪂 🏋️ 🤸 ⛹️ 🧘 🏄 🚣 🧗 🚴 🏊 🤽 🤾 🤹 🏌️ 🏇 🏆 🥇 🥈 🥉"],
    ["Mat & dryck","🍎 🍊 🍋 🍇 🍓 🫐 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶 🧄 🧅 🥔 🌽 🥕 🥗 🍔 🍟 🌭 🍕 🥪 🍱 🍣 🍜 🍝 🍛 🍚 🥟 🍦 🍧 🍩 🍪 🎂 🍰 🧁 🍫 🍬 🍭 ☕ 🍵 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧃 🥤 🧋"],
    ["Resor & platser","🚗 🚕 🚙 🚌 🏎 🚓 🚑 🚒 🛻 🚚 🚛 🚜 🛵 🏍 🚲 🛴 🚁 🛸 🚀 ✈️ 🚂 ⛵ 🛶 🚤 🛳 🚢 ⚓ 🏠 🏡 🏢 🏥 🏦 🏨 🏪 🏫 🏬 🏭 🏯 🏰 ⛪ 🕌 🗼 🗽 🌁 🌃 🌄 🌅 🌆 🌇 🌉 🎪"],
    ["Natur","🌲 🌳 🌴 🪵 🌱 🌿 ☘️ 🍀 🍃 🍂 🍁 🍄 🌾 💐 🌷 🌹 🥀 🌺 🌸 🌼 🌻 🌞 🌝 🌛 🌜 🌚 🌕 🌙 🌟 ⭐ 🌠 ☁️ ⛅ ⛈ 🌤 🌧 🌨 🌩 🌪 🌫 🌬 🌀 🌈 🌂 ❄️ ⛄ ☃️ 💧 💦 🌊"],
    ["Djur","🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐴 🦄 🐝 🦋 🐌 🐞 🐢 🐍 🦎 🐙 🦑 🦐 🦀 🐡 🐠 🐟 🐬 🐳 🦈 🐊 🐘 🦛 🦒 🦘 🐕 🐈 🦜 🦢 🕊 🦔 🐇 🦝 🦦 🦥"],
    ["Objekt & symboler","📱 💻 🖥 ⌨️ 💡 🔦 🕯 💰 💳 📈 📉 📊 📋 📌 📍 📎 ✂️ 🔒 🔓 🔑 🗝 🔨 ⛏ 🛠 ⚔️ 🛡 🔧 🔩 ⚙️ ⚖️ 🧲 🧪 🧬 🔭 🔬 💉 💊 🩹 🚪 🛏 🛋 🚿 🛁 🧴 🧹 🧺 🧻 🧼 🛒 🏺"],
    ["Aktiviteter & hobbys","🎮 🕹 🎲 🧩 🪀 🎯 🎱 🎳 🎭 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🎻 📻 🎵 🎶 🎉 🎊 🎁 🎗 🏆 📣 📢 🧵 🧶 🔮 🧸 🎃 🎆 🎇 🧨"],
  ];

  var emojis=groups.map(function(g){
    return "<section><h2>"+g[0]+"</h2><div class='grid'>"+g[1].split(" ").map(function(e){
      return "<span class='em' onclick='copyEmoji(this)' title='Klicka för att kopiera'>"+e+"</span>";
    }).join("")+"</div></section>";
  }).join("");

  var catList=CAT_PRESETS.map(function(p){
    return "<li>"+p+"</li>";
  }).join("");

  var html='<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><title>Emoji-referens</title>'
    +'<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#111;color:#f2f2f2;padding:20px;max-width:900px;margin:0 auto}'
    +'h1{font-size:22px;margin-bottom:6px;color:#4fa8ff}p.sub{font-size:13px;color:#5c5c5c;margin-bottom:24px}'
    +'h2{font-size:14px;font-weight:600;color:#5c5c5c;margin:20px 0 10px;border-bottom:1px solid #2a2a2a;padding-bottom:6px}'
    +'.grid{display:flex;flex-wrap:wrap;gap:6px}.em{font-size:28px;cursor:pointer;padding:4px;border-radius:8px;transition:background .15s;user-select:none}'
    +'.em:hover{background:#2a2a2a}.cats{background:#131313;border-radius:12px;padding:16px;margin-top:24px}'
    +'.cats h2{color:#4fa8ff;border-color:#4fa8ff33}.cats ul{list-style:none;padding:0}'
    +'.cats li{font-size:20px;padding:6px 0;border-bottom:1px solid #2a2a2a}'
    +'#toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#4fa8ff;color:#0a0a0a;padding:8px 20px;border-radius:20px;font-weight:600;font-size:14px;opacity:0;transition:opacity .3s}'
    +'</style></head><body>'
    +'<h1>🎨 Emoji-referens</h1>'
    +'<p class="sub">Klicka på en emoji för att kopiera den. Skriv kategori som: <b>🎣 Fiske</b></p>'
    +emojis
    +'<div class="cats"><h2>Dina nuvarande kategorier</h2><ul>'+catList+'</ul></div>'
    +'<div id="toast">Kopierad!</div>'
    +'<script>function copyEmoji(el){'
    +'navigator.clipboard.writeText(el.textContent).then(function(){'
    +'var t=document.getElementById("toast");t.style.opacity=1;'
    +'setTimeout(function(){t.style.opacity=0;},1500);});}'
    +'<\/script></body></html>';

  var blob=new Blob([html],{type:"text/html;charset=utf-8"});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");
  a.href=url;a.download="emoji-referens.html";
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getCatDisplay(categoryId){
  // First try to find in CAT_PRESETS (user's custom labels with emojis)
  var preset=CAT_PRESETS.find(function(p){
    var ct=CATS.find(function(x){return x.id===categoryId;});
    return ct&&(p===ct.e+" "+ct.label||p.indexOf(" ")>0&&p.split(" ").slice(1).join(" ")===ct.label)||p===categoryId;
  });
  if(preset)return preset;
  // Fall back to CATS
  var ct=CATS.find(function(x){return x.id===categoryId;});
  return ct?ct.e+" "+ct.label:categoryId||"";
}

function getCatEmoji(categoryId){
  var display=getCatDisplay(categoryId);
  // Extract emoji (first char(s) before space)
  var m=display.match(/^([\p{Emoji}\u{1F3FB}-\u{1F3FF}\u{1F9B0}-\u{1F9B3}]+)/u);
  return m?m[1]:"✨";
}

function getCatLabel(categoryId){
  var display=getCatDisplay(categoryId);
  // Remove leading emoji
  return display.replace(/^[\p{Emoji}\s]+/u,"").trim()||display;
}

function buildImageFilename(img){
  var d=new Date(img.timestamp);
  var yy=String(d.getFullYear()).slice(-2);
  var mm=String(d.getMonth()+1).padStart(2,"0");
  var dd=String(d.getDate()).padStart(2,"0");
  var title=(img.activity||"bild").replace(/[^a-zA-ZåäöÅÄÖ0-9_\- ]/g,"").trim().slice(0,40);
  var ext=img.mtype&&img.mtype.includes("png")?"png":"jpg";
  return yy+"-"+mm+"-"+dd+"_"+title+"."+ext;
}


async function init(){
  // Just kommit tillbaka från Googles inloggningsruta med en engångskod?
  if(window.__pendingAuthCode){
    var code=window.__pendingAuthCode;
    window.__pendingAuthCode=null;
    var exchanged=await exchangeCodeForTokens(code);
    if(exchanged){
      await fetchUserInfo();
      showApp();
      startTokenWatch();
      return;
    }
  }
  // Redan ett giltigt sparat access-token?
  var savedToken=localStorage.getItem("mb2_access_token");
  var expiry=parseInt(localStorage.getItem("mb2_token_expiry")||"0");
  if(savedToken&&Date.now()<expiry-2*60*1000){
    accessToken=savedToken;
    if(!userInfo)await fetchUserInfo();
    showApp();
    startTokenWatch();
    return;
  }
  // Inget giltigt access-token — försök byta ett sparat refresh-token mot ett nytt,
  // helt utan att visa någon inloggningsruta.
  var refreshed=await refreshAccessToken();
  if(refreshed){
    if(!userInfo)await fetchUserInfo();
    showApp();
    startTokenWatch();
    return;
  }
  clearStoredAuth();
  var dbg=document.getElementById("debug-msg");
  if(dbg)dbg.textContent="Redirect URI: "+REDIRECT_URI;
  showLogin();
}
async function aiCall(system,userMsg,maxTokens){
  var ctx=buildContext();
  return fetch(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:selectedModel,max_tokens:maxTokens,messages:[{role:"system",content:system+ctx},{role:"user",content:userMsg}]})});
}
async function aiChat(system,messages,maxTokens){
  var ctx=buildContext();
  return fetch(PROXY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:selectedModel,max_tokens:maxTokens,messages:[{role:"system",content:system+ctx}].concat(messages)})});
}
function aiText(data){
  // Standard OpenAI/Anthropic format
  if(data.choices&&data.choices[0]){
    var msg=data.choices[0].message;
    if(msg){
      // Some models return content as string
      if(typeof msg.content==="string"&&msg.content)return msg.content;
      // Some models (Gemini) return content as array of parts
      if(Array.isArray(msg.content)){
        return msg.content.map(function(p){return p.text||p.content||"";}).join("");
      }
    }
    // Fallback: text field directly on choice
    if(data.choices[0].text)return data.choices[0].text;
  }
  // Gemini native format fallback
  if(data.candidates&&data.candidates[0]){
    var c=data.candidates[0];
    if(c.content&&c.content.parts)return c.content.parts.map(function(p){return p.text||"";}).join("");
  }
  return "";
}
function hdr(){
  var htitleEl=document.getElementById("htitle");
  htitleEl.innerHTML="<span class='brain-ico'><svg width='24' height='22' viewBox='0 0 100 90' xmlns='http://www.w3.org/2000/svg'><g fill='#4fa8ff'><polygon points='50,3 95,34 5,34'/><rect x='9' y='34' width='82' height='7'/><rect x='16' y='45' width='8' height='29'/><rect x='31' y='45' width='8' height='29'/><rect x='46' y='45' width='8' height='29'/><rect x='61' y='45' width='8' height='29'/><rect x='76' y='45' width='8' height='29'/><rect x='5' y='74' width='90' height='8'/></g></svg></span>Minnesbank<span class='caret'>_</span>";
  htitleEl.style.cursor="pointer";
  htitleEl.title="Gå till Aktivitet och ladda om appen";
  htitleEl.onclick=function(){location.reload();};
}

// ---- Global ordboks-/synonymsökning (samma ruta och funktion som i Skriftstudio) ----
function chatContentToText(content){
  if(typeof content==="string")return content;
  if(Array.isArray(content))return content.filter(function(p){return p.type==="text";}).map(function(p){return p.text;}).join(" ");
  return "";
}
// Sparar en hel konversation (fråga + svar + ev. fortsättning) till Kunskap.
// summaryText = läsbar platt text (redigerbar i listan), chat = hela meddelandekedjan (för att fortsätta konversationen).
function pinChatToKunskap(chat){
  if(!chat||!chat.length)return;
  kunskapHist.push({id:Date.now(),chat:chat.map(function(m){return {role:m.role,content:chatContentToText(m.content)};}),timestamp:new Date().toISOString()});
  saveAndSync("kunskap");
}
function chatContinuationHtml(chat,idPrefix){
  var thread=(chat||[]).slice(2).map(function(m){
    var txt=chatContentToText(m.content);
    if(m.role==="user"){
      return "<div style='display:flex;justify-content:flex-end;margin-bottom:8px'><div class='bubble-me'>"+esc(txt)+"</div></div>";
    }
    return "<div style='display:flex;justify-content:flex-start;margin-bottom:8px'><div class='bubble-them'>"+esc(txt)+"</div></div>";
  }).join("");
  return (thread?"<div class='mt12' style='margin-bottom:8px'>"+thread+"</div>":"")
    +"<div class='lbl' style='margin-top:12px'>Fortsätt konversationen</div>"
    +"<div class='row'><input class='inp' id='"+idPrefix+"-followup-inp' placeholder='Ställ en följdfråga...'/><button class='abtn' id='"+idPrefix+"-followup-btn'>&#8594;</button></div>"
    +"<div id='"+idPrefix+"-followup-loading' style='display:none;text-align:center;color:var(--sub);font-size:12px;margin-top:6px'>Skriver...</div>";
}
function bindChatContinuation(b,idPrefix,systemPrompt,getChat,onDone){
  var inp=b.querySelector("#"+idPrefix+"-followup-inp");
  var btn=b.querySelector("#"+idPrefix+"-followup-btn");
  var loadingEl=b.querySelector("#"+idPrefix+"-followup-loading");
  if(!btn||!inp)return;
  var send=async function(){
    var txt=inp.value.trim();
    if(!txt)return;
    inp.value="";
    var chat=getChat();
    chat.push({role:"user",content:txt});
    btn.disabled=true;if(loadingEl)loadingEl.style.display="block";
    try{
      var res=await aiChat(systemPrompt,chat,900);
      var data=await res.json();
      var text=aiText(data)||"Kunde inte svara.";
      chat.push({role:"assistant",content:text});
    }catch(e){
      chat.push({role:"assistant",content:"Kunde inte svara. Försök igen."});
    }
    btn.disabled=false;if(loadingEl)loadingEl.style.display="none";
    onDone();
  };
  btn.onclick=send;
  inp.onkeydown=function(e){if(e.key==="Enter")send();};
}

// ---- Delad "Anteckningar"-lista (flera separata poster, dropdown med redigera/ta bort) ----

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
    +"<button id='dict-pin-btn' title='Spara till Kunskap' style='position:absolute;top:10px;right:50px;background:none;border:none;color:var(--sub);cursor:pointer;font-family:inherit;font-size:13px;padding:2px 4px'>📌K</button>"
    +dictHeaderHtml
    +chatContinuationHtml(dictChat,"dictai");
  document.getElementById("dictCloseBtn").onclick=function(){dictResult.classList.remove("visible");dictChat=null;};
  var dictPinBtn=dictResult.querySelector("#dict-pin-btn");
  if(dictPinBtn)dictPinBtn.onclick=function(){
    pinChatToKunskap(dictChat);
    var orig=dictPinBtn.textContent;
    dictPinBtn.textContent="✓";
    setTimeout(function(){dictPinBtn.textContent=orig;},1200);
  };
  bindChatContinuation(dictResult,"dictai",dictAiSystemPrompt,function(){return dictChat;},renderDictResultBox);
}

// ---- Ordlista och Synonymer (mindre, egen ruta) - samma funktion som innan sammanslagningen ----
var synChat=null, synHeaderHtml="", synLastWord="", synLastSynonyms=[];
function renderSynResultBox(){
  var synResult=document.getElementById("synResult");
  if(!synResult)return;
  synResult.innerHTML="<button class='dict-close' id='synCloseBtn'>×</button>"
    +"<button id='syn-pin-kunskap-btn' title='Spara till Kunskap' style='position:absolute;top:10px;right:50px;background:none;border:none;color:var(--sub);cursor:pointer;font-family:inherit;font-size:13px;padding:2px 4px'>📌K</button>"
    +"<button id='syn-pin-vokabular-btn' title='Spara till Vokabulär' style='position:absolute;top:10px;right:76px;background:none;border:none;color:var(--sub);cursor:pointer;font-family:inherit;font-size:13px;padding:2px 4px'>📌V</button>"
    +synHeaderHtml
    +chatContinuationHtml(synChat,"synai");
  document.getElementById("synCloseBtn").onclick=function(){synResult.classList.remove("visible");synChat=null;};
  var synPinVokabularBtn=synResult.querySelector("#syn-pin-vokabular-btn");
  if(synPinVokabularBtn)synPinVokabularBtn.onclick=function(){
    var entryText=synLastWord+" → "+synLastSynonyms.join(", ");
    vokabularHist.push({id:Date.now(),text:entryText,timestamp:new Date().toISOString()});
    saveAndSync("vokabular");
    var orig=synPinVokabularBtn.textContent;
    synPinVokabularBtn.textContent="✓";
    setTimeout(function(){synPinVokabularBtn.textContent=orig;},1200);
  };
  var synPinKunskapBtn=synResult.querySelector("#syn-pin-kunskap-btn");
  if(synPinKunskapBtn)synPinKunskapBtn.onclick=function(){
    pinChatToKunskap(synChat);
    var orig=synPinKunskapBtn.textContent;
    synPinKunskapBtn.textContent="✓";
    setTimeout(function(){synPinKunskapBtn.textContent=orig;},1200);
  };
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
    synLastWord=parsed.word||word;
    synLastSynonyms=parsed.synonyms||[];
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

function buildContext(){
  var parts=[];

  // Aktiviteter (senaste 30)
  if(logs.length){
    parts.push("=== AKTIVITETER (senaste) ===");
    logs.slice(0,30).forEach(function(l){
      var ct=CATS.find(function(c){return c.id===l.category;});
      var line="["+fd(l.timestamp)+"] "+(ct?ct.label:l.category)+": "+l.activity;
      if(l.time)line+=" ("+l.time+")";
      if(l.note)line+=" - "+l.note;
      parts.push(line);
    });
  }

  // Funderingar (senaste 20)
  if(fundHist.length){
    parts.push("\n=== FUNDERINGAR (senaste) ===");
    fundHist.slice(0,20).forEach(function(f){
      parts.push("["+fd(f.timestamp)+"] "+f.text);
    });
  }

  // Samtal - konversationer (Text) och muntliga samtal (senaste inläggen)
  if(konversationer.length){
    parts.push("\n=== SAMTAL (TEXT) ===");
    konversationer.slice(0,5).forEach(function(k){
      var msgs=k.messages.slice(-6);
      if(!msgs.length)return;
      parts.push("Konversation: "+k.name);
      msgs.forEach(function(m){parts.push("  "+(m.sender==="mig"?"Jag":"De")+": "+m.text);});
    });
  }
  if(muntKonversationer.length){
    parts.push("\n=== SAMTAL (MUNTLIGT) ===");
    muntKonversationer.slice(0,5).forEach(function(k){
      if(!k.entries||!k.entries.length)return;
      parts.push("Konversation: "+k.name);
      k.entries.slice(-3).forEach(function(e){parts.push("  Sammanfattning: "+e.summary+(e.feeling?" (Känsla: "+e.feeling+")":""));});
    });
  }

  if(!parts.length)return "";
  return "\n\nAnvandarens kontext fran AI-Assistent-appen:\n"+parts.join("\n")+"\n\nAnvand denna kontext for att ge mer personliga och relevanta svar. Referera till den nar det ar lampligt men tvinga inte in den i varje svar.";
}
function setView(v){view=v;document.querySelectorAll(".tab").forEach(function(t){t.classList.toggle("on",t.dataset.v===v);});}
function render(){
  hdr();
  if(view==="aktivitet")renderLogAktivitet();
  else if(view==="funderingar")renderLogFunderingar();
  else if(view==="samtal")renderSamtalTop();
  else if(view==="konversation")renderKonversationTop();
  else if(view==="utvarderingar")renderUtvarderingarTop();
  else if(view==="history")renderHistory();
  else if(view==="ai")renderAI();
  else if(view==="installningar")renderInstallningar();
}
// Auto-växande textarea: startar på en rad och växer i höjd efter innehållet.
function autoGrowTextarea(ta){
  if(!ta)return;
  function resize(){ta.style.height="auto";ta.style.height=ta.scrollHeight+"px";}
  ta.addEventListener("input",resize);
  resize();
}
function ctxChips(list,current,attr){
  return list.map(function(c){return "<button class='ctx-chip"+(c===current?" on":"")+"' data-"+attr+"='"+esc(c)+"'>"+esc(c)+"</button>";}).join("");
}
function bindChips(b,attr,getCurrent,setCurrent){
  b.querySelectorAll("[data-"+attr+"]").forEach(function(btn){btn.onclick=function(){setCurrent(btn.dataset[attr]);b.querySelectorAll("[data-"+attr+"]").forEach(function(x){x.classList.toggle("on",x.dataset[attr]===getCurrent());});};});
}

function confirmDelete(message, onConfirm){
  var overlay=document.createElement("div");
  overlay.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px";
  overlay.innerHTML="<div style='background:#161616;border-radius:16px;border:1px solid #d97a83;padding:20px;width:100%;max-width:360px'>"
    +"<div style='font-size:15px;font-weight:600;color:#d97a83;margin-bottom:10px'>Ta bort?</div>"
    +"<div style='font-size:13px;color:#f2f2f2;margin-bottom:18px;line-height:1.5'>"+message+"</div>"
    +"<div style='display:flex;gap:8px'>"
    +"<button id='cd-confirm' style='flex:1;padding:11px;border-radius:8px;background:#241315;border:1px solid #d97a83;color:#d97a83;font-size:13px;cursor:pointer;font-family:inherit;font-weight:600'>Ta bort</button>"
    +"<button id='cd-cancel' style='flex:1;padding:11px;border-radius:8px;background:#131313;border:1px solid #2a2a2a;color:#5c5c5c;font-size:13px;cursor:pointer;font-family:inherit'>Avbryt</button>"
    +"</div></div>";
  document.body.appendChild(overlay);
  overlay.querySelector("#cd-cancel").onclick=function(){overlay.remove();};
  overlay.querySelector("#cd-confirm").onclick=function(){overlay.remove();onConfirm();};
}

// Enkel informations-/felruta med bara en "OK"-knapp, t.ex. för valideringsfel.
function showInfoPopup(title,message){
  var overlay=document.createElement("div");
  overlay.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px";
  overlay.innerHTML="<div style='background:#161616;border-radius:16px;border:1px solid #c9a24a;padding:20px;width:100%;max-width:360px'>"
    +"<div style='font-size:15px;font-weight:600;color:#c9a24a;margin-bottom:10px'>"+esc(title)+"</div>"
    +"<div style='font-size:13px;color:#f2f2f2;margin-bottom:18px;line-height:1.5'>"+esc(message)+"</div>"
    +"<button id='ip-ok' style='width:100%;padding:11px;border-radius:8px;background:#131313;border:1px solid #2a2a2a;color:#f2f2f2;font-size:13px;cursor:pointer;font-family:inherit;font-weight:600'>OK</button>"
    +"</div>";
  document.body.appendChild(overlay);
  overlay.querySelector("#ip-ok").onclick=function(){overlay.remove();};
}

// Validerar/bygger loggens faktiska tidpunkt utifrån "Tidpunkt"-inmatningen.
// Tomt fält -> nu. Ogiltigt format -> ok:false med en förklarande text.
function buildLogTimestamp(tidpunktRaw){
  var tp=(tidpunktRaw||"").trim();
  if(!tp)return {ok:true,date:new Date()};
  var m=tp.match(/^(\d{2}):(\d{2})$/);
  if(!m)return {ok:false,message:"Tidpunkten måste skrivas i formatet HH:MM, t.ex. 14:30."};
  var hh=parseInt(m[1],10),mm=parseInt(m[2],10);
  if(hh<0||hh>23||mm<0||mm>59)return {ok:false,message:"Tidpunkten måste vara ett giltigt klockslag mellan 00:00 och 23:59."};
  var d=new Date();
  d.setHours(hh,mm,0,0);
  return {ok:true,date:d};
}
