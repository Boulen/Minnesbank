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

  var accountName=userInfo?(userInfo.name||userInfo.email||"Inloggad"):"";
  var accountInitials=accountName?accountName.split(" ").map(function(w){return w[0];}).join("").slice(0,2).toUpperCase():"";

  b.innerHTML="<div class='overlay-card' style='max-width:520px;margin:0 auto 20px'>"
    +"<div class='overlay-title'>inställningar</div>"
    +"<div class='overlay-sub'>ai-modell</div>"
    +(userInfo?(
      "<div class='settings-row' style='display:flex;align-items:center;gap:10px;margin-bottom:20px'>"
      +"<div class='avatar'>"+accountInitials+"</div>"
      +"<span style='color:#cfcfcf;font-size:13px;flex:1'>"+esc(accountName)+"</span>"
      +"<span class='signout' id='settings-signout-btn'>Logga ut</span>"
      +"</div>"
    ):"")
    +"<div class='lbl'>AI-modell</div>"
    +"<select id='model-select' style='width:100%;padding:11px 13px;border-radius:5px;background:#161616;border:1px solid #2a2a2a;color:#f2f2f2;font-size:14px;margin-bottom:8px;font-family:\"JetBrains Mono\",monospace'>"
    +MODELS.map(function(m){return "<option value='"+esc(m.id)+"'"+(m.id===selectedModel?" selected":"")+">"+esc(m.name)+"</option>";}).join("")
    +"</select>"
    +"<div style='margin-bottom:20px;font-size:12px;color:#5c5c5c;line-height:1.5' id='model-desc'>"+esc(currentModel.desc)+"</div>"
    +"<div style='margin-top:24px;padding:14px;background:#161616;border-radius:12px;border:1px solid #2a2a2a;font-size:12px;color:#5c5c5c;line-height:1.6'>"
    +"Modellen galler for alla AI-funktioner i appen.</div>"
    +"</div>"
    +"<button class='overlay-close' id='settings-close-btn' style='max-width:520px;margin:0 auto;display:block'>stäng</button>";

  var settingsSignoutBtn=b.querySelector("#settings-signout-btn");
  if(settingsSignoutBtn)settingsSignoutBtn.onclick=function(){signOut();};
  var modelSelect=b.querySelector("#model-select");
  if(modelSelect)modelSelect.onchange=function(){
    selectedModel=modelSelect.value;
    try{sessionStorage.setItem("selected_model_session",selectedModel);}catch(e){}
    var m=MODELS.find(function(x){return x.id===selectedModel;});
    var desc=b.querySelector("#model-desc");
    if(desc&&m)desc.textContent=m.desc;
  };
  var settingsCloseBtn=b.querySelector("#settings-close-btn");
  if(settingsCloseBtn)settingsCloseBtn.onclick=function(){closeInstallningarOverlay();};
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
