var CLIENT_ID="167841441516-moo7oedk74f6oj3f79jdqhca3a12dgi5.apps.googleusercontent.com";
var SCOPE="https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile";
var FOLDER_ID="18DqgJT6lPDc8Sj7Nb5YLmcz8km_9zGZP";
var REDIRECT_URI=location.origin+location.pathname.replace(/\/+$/,"/");
var accessToken=null,userInfo=null;
// File IDs for each data file
var driveFiles={
  aktiviteter:null,samtal:null,funderingar:null,
  media:null,sok:null,tips:null,installningar:null
};
// Loaded data per tab (lazy)
var tabLoaded={
  aktiviteter:false,samtaltext:false,samtalmuntligt:false,funderingar:false,
  media:false,sok:false,tips:false,terapi:false,bilder:false,installningar:false,text:false,samtalsamnen:false,objekt:false,skamt:false,plats:false,inmatningar:false,vokabular:false,kunskap:false,tipstricks:false
};
function startLogin(){
  var p=new URLSearchParams({client_id:CLIENT_ID,redirect_uri:REDIRECT_URI,response_type:"code",scope:SCOPE,access_type:"offline",prompt:"consent",include_granted_scopes:"true"});
  location.href="https://accounts.google.com/o/oauth2/v2/auth?"+p.toString();
}
async function fetchUserInfo(){try{var r=await fetch("https://www.googleapis.com/oauth2/v3/userinfo",{headers:{Authorization:"Bearer "+accessToken}});userInfo=await r.json();}catch(e){}}
function showLogin(){document.getElementById("login-screen").style.display="block";document.getElementById("main-app").style.display="none";}

// ---- Riktigt refresh-token-flöde via proxyn (ingen inloggningsruta behövs efter första gången) ----
// Klienthemligheten ligger aldrig i denna fil — bytet av kod/refresh-token mot ett
// access-token sker på servern (Cloudflare Workern), se PROXY+"oauth/token".
function persistTokens(d){
  accessToken=d.access_token;
  localStorage.setItem("akt_access_token",d.access_token);
  localStorage.setItem("akt_token_expiry",String(Date.now()+((d.expires_in||3600)*1000)));
  if(d.refresh_token)localStorage.setItem("akt_refresh_token",d.refresh_token);
}
function clearStoredAuth(){
  ["akt_access_token","akt_token_expiry","akt_refresh_token","akt_token","token_time"].forEach(function(k){localStorage.removeItem(k);});
}
async function exchangeCodeForTokens(code){
  try{
    var r=await fetch(PROXY+"oauth/token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({app:"minnesbanken",grant_type:"authorization_code",code:code,redirect_uri:REDIRECT_URI})});
    var d=await r.json();
    if(!d.access_token)return false;
    persistTokens(d);
    return true;
  }catch(e){return false;}
}
// Byter ett sparat refresh-token mot ett nytt access-token. Ingen popup, ingen
// Google-inloggningsruta — bara ett vanligt bakgrundsanrop till proxyn.
async function refreshAccessToken(){
  var refreshToken=localStorage.getItem("akt_refresh_token");
  if(!refreshToken)return false;
  try{
    var r=await fetch(PROXY+"oauth/token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({app:"minnesbanken",grant_type:"refresh_token",refresh_token:refreshToken})});
    var d=await r.json();
    if(!d.access_token)return false;
    persistTokens(d);
    return true;
  }catch(e){return false;}
}
// Kollar med jämna mellanrum (och när fliken blir aktiv igen) om token snart går ut,
// och förnyar det i så fall via refresh-token. Om förnyelsen misslyckas är
// refresh-token:et återkallat eller ogiltigt — logga då ut ur appen automatiskt.
var tokenWatchInterval=null;
function startTokenWatch(){
  if(tokenWatchInterval)clearInterval(tokenWatchInterval);
  tokenWatchInterval=setInterval(checkAndRenewToken,5*60*1000);
  document.addEventListener("visibilitychange",function(){
    if(document.visibilityState==="visible")checkAndRenewToken();
  });
}
async function checkAndRenewToken(){
  if(!accessToken)return;
  var expiry=parseInt(localStorage.getItem("akt_token_expiry")||"0");
  if(Date.now()<expiry-10*60*1000)return; // gott om tid kvar än
  var renewed=await refreshAccessToken();
  if(!renewed)signOut();
}
// One-time migration to the app's current folder layout:
// - Bilder moves out of Historik to the top level; Historik is removed.
// - Aktivitet, Samtal, Fundering (renamed from Funderingar), Samtalsamnen move
//   out of Logga to the top level; Logga is removed once empty.
// - Media and Objekt (renamed Föremål) move into a new top-level Utvärdering folder.
// - Sök (renamed from Sok), Text, Terapi and Tips (with its Tips/Skamt subfolder
//   intact) move into a new top-level AI folder.
// Every step MOVES the existing Drive folder (same id, same contents) rather
// than copying, so nothing is duplicated, re-uploaded, or lost.
async function driveFindFolder(name,parentId){
  var q="name='"+name.replace(/'/g,"\\'")+"' and mimeType='application/vnd.google-apps.folder' and '"+parentId+"' in parents and trashed=false";
  var r=await fetch(DRIVE_API+"?q="+encodeURIComponent(q)+"&fields=files(id,name)",{headers:{Authorization:"Bearer "+accessToken}});
  var d=await r.json();
  return (d.files&&d.files.length)?d.files[0].id:null;
}
async function driveMoveFolder(id,oldParentId,newParentId,newName){
  var url=DRIVE_API+"/"+id+"?addParents="+newParentId+"&removeParents="+oldParentId;
  var body={};
  if(newName)body.name=newName;
  await fetch(url,{method:"PATCH",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},body:JSON.stringify(body)});
}
async function driveTrashFolderIfEmpty(id){
  var r=await fetch(DRIVE_API+"?q="+encodeURIComponent("'"+id+"' in parents and trashed=false")+"&fields=files(id)&pageSize=1",{headers:{Authorization:"Bearer "+accessToken}});
  var d=await r.json();
  if(d.files&&d.files.length)return; // not empty — leave it alone, safer than losing data
  await fetch(DRIVE_API+"/"+id,{method:"PATCH",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},body:JSON.stringify({trashed:true})});
}
async function driveRenameFolder(id,newName){
  await fetch(DRIVE_API+"/"+id,{method:"PATCH",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},body:JSON.stringify({name:newName})});
}

async function migrateBilderFolder(){
  try{
    // --- Bilder: Historik/Bilder -> Bilder (top level); remove Historik ---
    var topBilder=await driveFindFolder("Bilder",FOLDER_ID);
    var historikId=await driveFindFolder("Historik",FOLDER_ID);
    if(!topBilder&&historikId){
      var nestedBilder=await driveFindFolder("Bilder",historikId);
      if(nestedBilder){
        await driveMoveFolder(nestedBilder,historikId,FOLDER_ID);
        console.log("Bilder-mappen flyttad från Historik/Bilder till toppnivån.");
      }
    }
    if(historikId)await driveTrashFolderIfEmpty(historikId);

    // --- Logga's children -> top level ---
    var loggaId=await driveFindFolder("Logga",FOLDER_ID);
    if(loggaId){
      var moves=[
        {old:"Aktivitet",newName:null},
        {old:"Samtal",newName:null},
        {old:"Funderingar",newName:"Fundering"},
        {old:"Samtalsamnen",newName:null}
      ];
      for(var i=0;i<moves.length;i++){
        var m=moves[i];
        var targetName=m.newName||m.old;
        if(await driveFindFolder(targetName,FOLDER_ID))continue; // already migrated
        var childId=await driveFindFolder(m.old,loggaId);
        if(childId)await driveMoveFolder(childId,loggaId,FOLDER_ID,m.newName);
      }

      // Media + Objekt(->Föremål) move into a new Betyg folder
      var utvId=await driveFindFolder("Betyg",FOLDER_ID);
      if(!utvId){
        var mediaInLogga=await driveFindFolder("Media",loggaId);
        var objektInLogga=await driveFindFolder("Objekt",loggaId);
        if(mediaInLogga||objektInLogga){
          utvId=await driveMkdir("Betyg",FOLDER_ID);
        }
      }
      if(utvId){
        if(!(await driveFindFolder("Media",utvId))){
          var mediaInLogga2=await driveFindFolder("Media",loggaId);
          if(mediaInLogga2)await driveMoveFolder(mediaInLogga2,loggaId,utvId);
        }
        if(!(await driveFindFolder("Föremål",utvId))){
          var objektInLogga2=await driveFindFolder("Objekt",loggaId);
          if(objektInLogga2)await driveMoveFolder(objektInLogga2,loggaId,utvId,"Föremål");
        }
      }

      await driveTrashFolderIfEmpty(loggaId);
    }

    // --- Sök, Text, Terapi, Tips -> new AI folder ---
    var aiId=await driveFindFolder("AI",FOLDER_ID);
    var sokTop=await driveFindFolder("Sok",FOLDER_ID);
    var textTop=await driveFindFolder("Text",FOLDER_ID);
    var terapiTop=await driveFindFolder("Terapi",FOLDER_ID);
    var tipsTop=await driveFindFolder("Tips",FOLDER_ID);
    if(!aiId&&(sokTop||textTop||terapiTop||tipsTop)){
      aiId=await driveMkdir("AI",FOLDER_ID);
    }
    if(aiId){
      if(sokTop&&!(await driveFindFolder("Sök",aiId)))await driveMoveFolder(sokTop,FOLDER_ID,aiId,"Sök");
      if(textTop&&!(await driveFindFolder("Text",aiId)))await driveMoveFolder(textTop,FOLDER_ID,aiId);
      if(terapiTop&&!(await driveFindFolder("Terapi",aiId)))await driveMoveFolder(terapiTop,FOLDER_ID,aiId);
      if(tipsTop&&!(await driveFindFolder("Tips",aiId)))await driveMoveFolder(tipsTop,FOLDER_ID,aiId);
    }

    // --- Samtalsämne (renamed from Samtalsamnen) and Skämt -> new Konversation folder ---
    var konvId=await driveFindFolder("Konversation",FOLDER_ID);
    // Samtalsamnen may be at top level (from an earlier migration) or still nested under Logga
    var samtalsamnenTop=await driveFindFolder("Samtalsamnen",FOLDER_ID);
    var samtalsamnenParent=FOLDER_ID;
    if(!samtalsamnenTop&&loggaId){
      samtalsamnenTop=await driveFindFolder("Samtalsamnen",loggaId);
      samtalsamnenParent=loggaId;
    }
    // Skämt may be nested under AI/Tips (from an earlier migration) or under a top-level Tips folder
    var tipsFolderForSkamt=aiId?await driveFindFolder("Tips",aiId):null;
    var skamtNested=tipsFolderForSkamt?await driveFindFolder("Skamt",tipsFolderForSkamt):null;
    var skamtParent=tipsFolderForSkamt;
    if(!skamtNested){
      var oldTopTips=await driveFindFolder("Tips",FOLDER_ID);
      if(oldTopTips){skamtNested=await driveFindFolder("Skamt",oldTopTips);skamtParent=oldTopTips;}
    }
    if(!konvId&&(samtalsamnenTop||skamtNested)){
      konvId=await driveMkdir("Konversation",FOLDER_ID);
    }
    if(konvId){
      if(samtalsamnenTop&&!(await driveFindFolder("Samtalsämne",konvId))){
        await driveMoveFolder(samtalsamnenTop,samtalsamnenParent,konvId,"Samtalsämne");
      }
      if(skamtNested&&!(await driveFindFolder("Skämt",konvId))){
        await driveMoveFolder(skamtNested,skamtParent,konvId,"Skämt");
      }
    }
    if(loggaId)await driveTrashFolderIfEmpty(loggaId);

    // --- Utvärdering renamed to Betyg ---
    var betygId=await driveFindFolder("Betyg",FOLDER_ID);
    if(!betygId){
      var utvOldName=await driveFindFolder("Utvärdering",FOLDER_ID);
      if(utvOldName){
        await driveRenameFolder(utvOldName,"Betyg");
        console.log("Utvärdering-mappen döpt om till Betyg.");
      }
    }

    // --- AI-mappen tas bort helt: Sök/Text/Terapi/Tips sparas inte längre till Drive ---
    var aiId=await driveFindFolder("AI",FOLDER_ID);
    if(aiId){
      await fetch(DRIVE_API+"/"+aiId,{method:"PATCH",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},body:JSON.stringify({trashed:true})});
      console.log("AI-mappen borttagen från Drive (flyttad till papperskorgen).");
    }
  }catch(e){
    console.error("Migrering av mappstrukturen misslyckades:",e);
  }
}

async function migrateTipsTricksFolder(){
  try{
    // "Tips & Tricks"-underfliken döptes om till "Anteckning" — döp om motsvarande Drive-mapp en gång.
    var fundId=await driveFindFolder("Fundering",FOLDER_ID);
    if(!fundId)return;
    var lardomId=await driveFindFolder("Lärdom",fundId);
    if(!lardomId)return;
    var oldTt=await driveFindFolder("Tips & Tricks",lardomId);
    if(oldTt){
      var alreadyNew=await driveFindFolder("Anteckning",lardomId);
      if(!alreadyNew){
        await driveRenameFolder(oldTt,"Anteckning");
        console.log("Tips & Tricks-mappen omdöpt till Anteckning.");
      }
    }
  }catch(e){}
}
async function driveFindDataJsonInFolder(parentId){
  var q="name='data.json' and '"+parentId+"' in parents and trashed=false";
  var r=await fetch(DRIVE_API+"?q="+encodeURIComponent(q)+"&fields=files(id)",{headers:{Authorization:"Bearer "+accessToken}});
  var d=await r.json();
  return (d.files&&d.files.length)?d.files[0].id:null;
}
async function migrateFunderingRestructure(){
  try{
    // Ny struktur: rot-mappen "Fundering" byter namn till "Notering" och blir en
    // samlingsmapp för de tre jämbördiga underflikarna Fundering, Anteckning och Lärdom
    // (istället för att själv innehålla fundHist-datan direkt).
    var root=await driveFindFolder("Notering",FOLDER_ID);
    if(!root){
      var oldRoot=await driveFindFolder("Fundering",FOLDER_ID);
      if(!oldRoot)return; // inget att migrera än
      await driveRenameFolder(oldRoot,"Notering");
      root=oldRoot;
    }

    // Flytta rotens data.json (fundHist) in i en ny undermapp "Fundering"
    var rootData=await driveFindDataJsonInFolder(root);
    if(rootData){
      var fundSub=await driveFindFolder("Fundering",root);
      if(!fundSub)fundSub=await driveMkdir("Fundering",root);
      await driveMoveFolder(rootData,root,fundSub);
      console.log("Notering/data.json flyttad till Notering/Fundering/data.json.");
    }

    // Flytta Anteckning ut ur Lärdom så den blir syskon till Fundering/Lärdom
    var lardomId=await driveFindFolder("Lärdom",root);
    if(lardomId){
      var nestedAnteckning=await driveFindFolder("Anteckning",lardomId);
      if(nestedAnteckning){
        var topAnteckning=await driveFindFolder("Anteckning",root);
        if(!topAnteckning){
          await driveMoveFolder(nestedAnteckning,lardomId,root);
          console.log("Anteckning-mappen flyttad ut ur Lärdom till Notering/Anteckning.");
        }
      }
    }
  }catch(e){}
}
async function migrateSamtalSplit(){
  try{
    var samtalId=await driveFindFolder("Samtal",FOLDER_ID);
    if(!samtalId)return; // ingen Samtal-mapp än, inget att migrera
    // Om Text/Muntligt-undermapparna redan finns är migreringen redan gjord
    var textFolder=await driveFindFolder("Text",samtalId);
    var muntFolder=await driveFindFolder("Muntligt",samtalId);
    if(textFolder&&muntFolder)return;
    // Läs den gamla odelade filen (Samtal/data.json) om den finns
    var old=await driveRead("SamtalLegacy");
    if(old&&(old.konversationer||old.muntKonversationer)){
      if(old.konversationer&&old.konversationer.length){
        await driveWrite("Samtal/Text",{konversationer:old.konversationer});
      }
      if(old.muntKonversationer&&old.muntKonversationer.length){
        await driveWrite("Samtal/Muntligt",{muntKonversationer:old.muntKonversationer});
      }
      console.log("Samtal-data migrerad till separata Text/Muntligt-filer.");
    }
  }catch(e){
    console.error("Migrering av Samtal-uppdelningen misslyckades:",e);
  }
}

var activeTabLoads=0;
function bumpLoadIndicator(delta){
  activeTabLoads=Math.max(0,activeTabLoads+delta);
  var el=document.getElementById("global-load-spinner");
  if(el)el.style.display=activeTabLoads>0?"inline-block":"none";
}
function loadTabsProgressively(tabs,renderFn){
  renderFn(); // rita direkt med det som redan finns (kan vara tomt första gången)
  tabs.forEach(function(t){
    if(tabLoaded[t])return; // redan laddad — inget att göra, ingen indikator
    bumpLoadIndicator(1);
    loadTab(t).then(function(){bumpLoadIndicator(-1);renderFn();});
  });
}

var MIGRATIONS_VERSION=1; // höj denna om en ny migrering läggs till i framtiden
async function runMigrationsIfNeeded(){
  if(localStorage.getItem("mb_migrations_done")===String(MIGRATIONS_VERSION))return;
  await Promise.all([
    migrateBilderFolder(), migrateSamtalSplit(),
    migrateTipsTricksFolder(), migrateFunderingRestructure()
  ]);
  localStorage.setItem("mb_migrations_done",String(MIGRATIONS_VERSION));
}

async function showApp(){
  document.getElementById("login-screen").style.display="none";
  document.getElementById("main-app").style.display="block";
  hdr();
  renderUserRow();
  initDictBar();
  document.querySelectorAll(".tab").forEach(function(btn){
    btn.onclick=function(){
      var v=btn.dataset.v;
      if(v==="history"){
        setView("history");
        loadTabsProgressively(["aktiviteter","samtaltext","samtalmuntligt","funderingar","media"],function(){openToday();renderHistory();});
      } else if(v==="installningar"){setView("installningar");loadTabsProgressively(["installningar"],render);}
      else if(v==="ai"){
        setView("ai");
        var tabMap={forklara:"sok",komm:"text",tips:"tips",terapi:"terapi"};
        var tab=tabMap[aiSubview]||"sok";
        loadTabsProgressively([tab],renderAI);
      }
      else if(v==="aktivitet"){
        setView("aktivitet");
        loadTabsProgressively(["aktiviteter","samtaltext","samtalmuntligt","funderingar","media","inmatningar"],function(){
          renderLogAktivitet();updateHandelser(null);
        });
      }
      else if(v==="funderingar"){setView("funderingar");loadTabsProgressively(["funderingar"],renderLogFunderingar);}
      else if(v==="samtal"){
        setView("samtal");
        var samtalTabMap={text:"samtaltext",muntligt:"samtalmuntligt"};
        var st=samtalTabMap[samtalSubview]||"samtaltext";
        loadTabsProgressively([st],renderSamtalTop);
      }
      else if(v==="konversation"){
        setView("konversation");
        var konvTabMap={skamt:"skamt",samtalsamnen:"samtalsamnen"};
        var kt=konvTabMap[konvSubview]||"skamt";
        loadTabsProgressively([kt],renderKonversationTop);
      }
      else if(v==="utvarderingar"){
        setView("utvarderingar");
        var utvTabMap={media:"media",objekt:"objekt",plats:"plats"};
        var ut=utvTabMap[utvSubview]||"media";
        loadTabsProgressively([ut],renderUtvarderingarTop);
      }
    };
  });
  // Rensa Drive-cachen vid inloggning — börja tom, litar sedan på den inom sessionen
  driveIdCache={};driveDirCache={};driveIdCachePromise={};driveDirCachePromise={};
  saveDriveCache();
  Object.keys(tabLoaded).forEach(function(k){tabLoaded[k]=false;});
  await runMigrationsIfNeeded();
  loadTabsProgressively(["aktiviteter","installningar","samtaltext","samtalmuntligt","funderingar","media","inmatningar"],function(){
    render();updateHandelser(null);
  });
}
function renderUserRow(){var r=document.getElementById("user-row");if(!r||!userInfo)return;var name=userInfo.name||userInfo.email||"Inloggad";var initials=name.split(" ").map(function(w){return w[0];}).join("").slice(0,2).toUpperCase();r.innerHTML="<div class='avatar'>"+initials+"</div><span style='color:#cfcfcf;font-size:12px'>"+esc(name)+"</span><span class='signout' onclick='signOut()'>Logga ut</span>";}
function signOut(){if(tokenWatchInterval){clearInterval(tokenWatchInterval);tokenWatchInterval=null;}clearStoredAuth();accessToken=null;userInfo=null;driveIdCache={};driveDirCache={};driveIdCachePromise={};driveDirCachePromise={};tabLoaded={aktiviteter:false,samtaltext:false,samtalmuntligt:false,funderingar:false,media:false,sok:false,tips:false,terapi:false,bilder:false,installningar:false,text:false,vokabular:false,kunskap:false,tipstricks:false};var ov=document.getElementById("installningar-overlay");if(ov)ov.remove();showLogin();}
function setSyncBtn(cls,label){var b=document.getElementById("sync-btn");if(!b)return;b.className="sync-btn"+(cls?" "+cls:"");b.textContent=label;}
async function importFromDrive(){
  if(!accessToken){alert("Logga in först.");return;}
  var btn=document.getElementById("import-btn");
  if(btn){btn.textContent="Läser...";btn.disabled=true;}

  function mergeById(local,remote){
    if(!Array.isArray(remote))return local;
    var map=new Map();
    local.forEach(function(x){map.set(String(x.id||x.timestamp),x);});
    var added=0;
    remote.forEach(function(x){
      var key=String(x.id||x.timestamp);
      if(!map.has(key)){map.set(key,x);added++;}
    });
    if(added>0)console.log("Importerade "+added+" nya poster");
    return Array.from(map.values()).sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);});
  }
  // Slår ihop två listor av enkla strängar (autocomplete-historik), utan dubbletter (skiftlägesokänsligt).
  function mergeStringList(local,remote){
    if(!Array.isArray(remote))return{list:local||[],added:0};
    var seen={};var out=[];var added=0;
    (local||[]).forEach(function(v){var k=String(v).toLowerCase();if(!seen[k]){seen[k]=true;out.push(v);}});
    remote.forEach(function(v){var k=String(v).toLowerCase();if(!seen[k]){seen[k]=true;out.push(v);added++;}});
    return{list:out.slice(0,40),added:added};
  }
  // Slår ihop kategori-nycklade listor (t.ex. mediaList/objList/platsList) där posterna saknar id.
  function mergeCatItemList(localDict,remoteDict,keyFn){
    var result={};var cats={};var added=0;
    Object.keys(localDict||{}).forEach(function(c){cats[c]=true;});
    Object.keys(remoteDict||{}).forEach(function(c){cats[c]=true;});
    Object.keys(cats).forEach(function(cat){
      var existing=(localDict&&localDict[cat])||[];
      var seen={};
      existing.forEach(function(item){seen[keyFn(item)]=true;});
      var merged=existing.slice();
      ((remoteDict&&remoteDict[cat])||[]).forEach(function(item){
        var k=keyFn(item);
        if(!seen[k]){seen[k]=true;merged.push(item);added++;}
      });
      result[cat]=merged;
    });
    return{result:result,added:added};
  }

  // Reset cache so we re-read fresh from Drive
  Object.keys(tabLoaded).forEach(function(k){tabLoaded[k]=false;});

  var totalAdded=0;

  // Aktiviteter
  var da=await driveRead("Aktivitet");
  if(da&&da.logs){
    var before=logs.length;
    logs=mergeById(logs,da.logs.map(function(l){l.id=Number(l.id)||l.id;return l;}));
    totalAdded+=logs.length-before;
  }

  // Bilder
  var dbi=await driveRead("Bilder/Index");
  if(dbi&&dbi.images){
    var mapped=dbi.images.map(function(m){return {id:m.id,logId:m.logId,activity:m.activity,category:m.category,mtype:m.mtype||"image/jpeg",timestamp:m.timestamp,driveId:m.driveId,base64:null};});
    var before=imageHist.length;
    imageHist=mergeById(imageHist,mapped);
    totalAdded+=imageHist.length-before;
  }

  // Samtal
  var dst=await driveRead("Samtal/Text");
  if(dst&&dst.konversationer){var b1=konversationer.length;konversationer=mergeById(konversationer,dst.konversationer);totalAdded+=konversationer.length-b1;}
  var dsm=await driveRead("Samtal/Muntligt");
  if(dsm&&dsm.muntKonversationer){var b2=muntKonversationer.length;muntKonversationer=mergeById(muntKonversationer,dsm.muntKonversationer);totalAdded+=muntKonversationer.length-b2;}

  // Notering
  var df=await driveRead("Notering/Fundering");
  if(df&&df.fundHist){var b=fundHist.length;fundHist=mergeById(fundHist,df.fundHist);totalAdded+=fundHist.length-b;}

  // Notering → Lärdom
  var dvo=await driveRead("Notering/Lardom/Vokabular");
  if(dvo&&dvo.vokabularHist){var b=vokabularHist.length;vokabularHist=mergeById(vokabularHist,dvo.vokabularHist);totalAdded+=vokabularHist.length-b;}
  var dku=await driveRead("Notering/Lardom/Kunskap");
  if(dku&&dku.kunskapHist){var b=kunskapHist.length;kunskapHist=mergeById(kunskapHist,dku.kunskapHist);totalAdded+=kunskapHist.length-b;}
  var dtt=await driveRead("Notering/Anteckning");
  if(dtt&&dtt.tipsTricksHist){var b=tipsTricksHist.length;tipsTricksHist=mergeById(tipsTricksHist,dtt.tipsTricksHist);totalAdded+=tipsTricksHist.length-b;}

  // Konversation → Samtalsämnen
  var dam=await driveRead("Konversation/Samtalsamnen");
  if(dam&&dam.amneHist){var b=amneHist.length;amneHist=mergeById(amneHist,dam.amneHist);totalAdded+=amneHist.length-b;}

  // Media
  var dm=await driveRead("Utvardering/Media");
  if(dm){
    if(dm.mediaList){
      var rm=mergeCatItemList(mediaList,dm.mediaList,function(item){return mediaItemTitle(item)+"|"+mediaItemCreator(item)+"|"+mediaItemGenre(item);});
      mediaList=rm.result;totalAdded+=rm.added;
    }
    if(dm.mediaFardig){var b=mediaFardig.length;mediaFardig=mergeById(mediaFardig,dm.mediaFardig);totalAdded+=mediaFardig.length-b;}
    migrateMediaCategories();
  }

  // Föremål
  var dob=await driveRead("Utvardering/Foremal");
  if(dob){
    if(dob.objList){
      var ro=mergeCatItemList(objList,dob.objList,function(item){return objItemTitle(item)+"|"+((item&&item.tillverkare)||"");});
      objList=ro.result;totalAdded+=ro.added;
    }
    if(dob.objFardig){var b=objFardig.length;objFardig=mergeById(objFardig,dob.objFardig);totalAdded+=objFardig.length-b;}
  }

  // Plats
  var dpl=await driveRead("Utvardering/Plats");
  if(dpl){
    if(dpl.platsList){
      var rp=mergeCatItemList(platsList,dpl.platsList,function(item){return platsItemTitle(item)+"|"+((item&&item.kommun)||"");});
      platsList=rp.result;totalAdded+=rp.added;
    }
    if(dpl.platsFardig){var b=platsFardig.length;platsFardig=mergeById(platsFardig,dpl.platsFardig);totalAdded+=platsFardig.length-b;}
  }

  // Skämt
  var dsk=await driveRead("Konversation/Skamt");
  if(dsk&&dsk.savedJokes){
    var s=new Set(savedJokes);var b2=s.size;
    dsk.savedJokes.forEach(function(j){s.add(j);});
    totalAdded+=s.size-b2;savedJokes=Array.from(s);
  }

  // Inställningar → Inmatningar (autocomplete-historik)
  var dinm=await driveRead("Installningar/Inmatningar");
  if(dinm){
    if(dinm.aktivitetHistory){var r1=mergeStringList(aktivitetHistory,dinm.aktivitetHistory);aktivitetHistory=r1.list;totalAdded+=r1.added;}
    if(dinm.platsHistory){var r2=mergeStringList(platsHistory,dinm.platsHistory);platsHistory=r2.list;totalAdded+=r2.added;}
    if(dinm.anteckningHistory){var r3=mergeStringList(anteckningHistory,dinm.anteckningHistory);anteckningHistory=r3.list;totalAdded+=r3.added;}
    if(dinm.anteckningByCat){
      var acCats={};
      Object.keys(ANTECKNING_BY_CAT||{}).forEach(function(c){acCats[c]=true;});
      Object.keys(dinm.anteckningByCat).forEach(function(c){acCats[c]=true;});
      Object.keys(acCats).forEach(function(cat){
        var r4=mergeStringList(ANTECKNING_BY_CAT[cat]||[],dinm.anteckningByCat[cat]||[]);
        ANTECKNING_BY_CAT[cat]=r4.list;totalAdded+=r4.added;
      });
    }
    migrateAnteckningByCatOnce();
    // De 6 "kategori+dropdown+textinmatning"-snabbvalslistorna (avsnitt 6 i handoff), per kategori.
    function mergeByCatDict(dict,remoteDict){
      if(!remoteDict)return;
      var cats={};
      Object.keys(dict||{}).forEach(function(c){cats[c]=true;});
      Object.keys(remoteDict).forEach(function(c){cats[c]=true;});
      Object.keys(cats).forEach(function(cat){
        var r=mergeStringList(dict[cat]||[],remoteDict[cat]||[]);
        dict[cat]=r.list;totalAdded+=r.added;
      });
    }
    mergeByCatDict(ACT_PRESETS_BY_CAT,dinm.actPresetsByCat);
    mergeByCatDict(PLACE_PRESETS_BY_CAT,dinm.placePresetsByCat);
    mergeByCatDict(MEDIA_CREATOR_BY_CAT,dinm.mediaCreatorByCat);
    mergeByCatDict(MEDIA_GENRE_BY_CAT,dinm.mediaGenreByCat);
    mergeByCatDict(OBJ_MAKER_BY_CAT,dinm.objMakerByCat);
    mergeByCatDict(PLATS_KOMMUN_BY_CAT,dinm.platsKommunByCat);
    mergeByCatDict(TIPSTRICKS_SUBCAT_BY_CAT,dinm.tipsTricksSubcatByCat);
    migrateCatPresetsOnce();
  }

  // Inställningar (kategorier + övriga presets)
  var din=await driveRead("Installningar");
  if(din&&din.placePresets)PLACE_PRESETS=din.placePresets;
  if(din&&din.actPresets)ACT_PRESETS=din.actPresets;
  if(din&&din.catPresets)CAT_PRESETS=din.catPresets;
  if(din&&din.fundCatPresets)FUND_CAT_PRESETS=din.fundCatPresets;
  if(din&&din.tipsTricksCatPresets)TIPSTRICKS_CAT_PRESETS=din.tipsTricksCatPresets;
  if(din&&din.mediaCatPresets)MEDIA_CAT_PRESETS=din.mediaCatPresets;
  if(din&&din.amneCatPresets)AMNE_CAT_PRESETS=din.amneCatPresets;
  if(din&&din.objCatPresets)OBJ_CAT_PRESETS=din.objCatPresets;
  if(din&&din.platsCatPresets)PLATS_CAT_PRESETS=din.platsCatPresets;

  saveLocal();
  Object.keys(tabLoaded).forEach(function(k){tabLoaded[k]=true;});

  if(btn){
    btn.textContent=totalAdded>0?"✓ "+totalAdded+" nya":"✓ Klart";
    btn.disabled=false;
    setTimeout(function(){btn.textContent="↓ Fil import";},3000);
  }

  hdr();
  if(view==="history")renderHistory();
  else render();
  setTimeout(function(){updateHandelser(null);},100);
}

var DRIVE_SYNC_TABS=["aktiviteter","samtaltext","samtalmuntligt","funderingar","vokabular","kunskap","tipstricks","samtalsamnen","media","objekt","plats","inmatningar","skamt","bilder","installningar"];
async function syncNow(){
  if(!accessToken){setSyncBtn("err","Ej inloggad");return;}
  setSyncBtn("","Synkar...");
  try{
    var pushed=0,skipped=0;
    for(var i=0;i<DRIVE_SYNC_TABS.length;i++){
      var tab=DRIVE_SYNC_TABS[i];
      // Skyddar mot att skriva över en Drive-fil med tomt minnesinnehåll för en flik som
      // aldrig lästs in under sessionen (annars förlorar man data i den filen).
      if(!tabLoaded[tab]){skipped++;continue;}
      await saveTab(tab);
      pushed++;
    }
    saveLocal();
    setSyncBtn("ok",skipped>0?"Synkad ("+pushed+"/"+(pushed+skipped)+")":"Synkad");
    setTimeout(function(){setSyncBtn("","Synka");},3000);
  }catch(e){
    setSyncBtn("err","Synk misslyckades");
    setTimeout(function(){setSyncBtn("","Synka");},3000);
  }
}
function mergeData(r){
  function ma(a,b){var m=new Map();(a||[]).concat(b||[]).forEach(function(x){m.set(String(x.id||x.timestamp),x);});return Array.from(m.values()).sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);});}
  // For history lists where deletions matter, prefer local (newer) over remote merge
  // Only merge logs/sentMsgs/sentConvs/fundHist where multi-device adds are common
  return{
    logs:ma(logs,r.logs),
    tHist:tHist.length>=((r.tHist||[]).length)?tHist:r.tHist||tHist,
    konversationer:ma(konversationer,r.konversationer||[]),
    muntKonversationer:ma(muntKonversationer,r.muntKonversationer||[]),
    fundHist:ma(fundHist,r.fundHist||[]),
    savedJokes:r.savedJokes||savedJokes,
    imageHist:r.imageHist||imageHist,
    mediaList:r.mediaList||mediaList,
    mediaFardig:r.mediaFardig||mediaFardig
  };
}
// ---- DRIVE FILE SYSTEM ----
var DRIVE_API="https://www.googleapis.com/drive/v3/files";
var DRIVE_UPLOAD="https://www.googleapis.com/upload/drive/v3/files";

// Structure: path -> [folder, subfolder (or null)]
// All files named data.json inside their folder
var DRIVE_STRUCTURE={
  "Aktivitet":            ["Aktivitet"],
  "Notering/Fundering":   ["Notering","Fundering"],
  "Samtal/Text":          ["Samtal","Text"],
  "Samtal/Muntligt":      ["Samtal","Muntligt"],
  "SamtalLegacy":         ["Samtal"], // gammal, odelad fil - bara för engångsmigrering, används inte av UI
  "Konversation/Skamt":   ["Konversation","Skämt"],
  "Konversation/Samtalsamnen": ["Konversation","Samtalsämne"],
  "Utvardering/Media":    ["Betyg","Media"],
  "Utvardering/Foremal":  ["Betyg","Föremål"],
  "Utvardering/Plats":    ["Betyg","Plats"],
  "Bilder/Index":         ["Bilder"],
  "Installningar":        ["Installningar"],
  "Installningar/Inmatningar": ["Installningar","Inmatningar"],
  "Notering/Lardom/Vokabular": ["Notering","Lärdom","Vokabulär"],
  "Notering/Lardom/Kunskap": ["Notering","Lärdom","Kunskap"],
  "Notering/Anteckning": ["Notering","Anteckning"]
};

// tabName (som används i saveTab/loadTab) -> DRIVE_STRUCTURE-nyckel
var DRIVE_STRUCTURE_BY_TAB={
  aktiviteter:   "Aktivitet",
  samtaltext:    "Samtal/Text",
  samtalmuntligt:"Samtal/Muntligt",
  funderingar:   "Notering/Fundering",
  samtalsamnen:  "Konversation/Samtalsamnen",
  media:         "Utvardering/Media",
  objekt:        "Utvardering/Foremal",
  plats:         "Utvardering/Plats",
  skamt:         "Konversation/Skamt",
  installningar: "Installningar",
  inmatningar:   "Installningar/Inmatningar",
  vokabular:     "Notering/Lardom/Vokabular",
  kunskap:       "Notering/Lardom/Kunskap",
  tipstricks:    "Notering/Anteckning"
};

// Läsbara etiketter för varje DRIVE_STRUCTURE-nyckel (delas av Inställningar-dropdownen och export av väntande inmatningar)
var PATH_LABELS={
  "Aktivitet":"Aktivitet","Samtal/Text":"Samtal (Text)","Samtal/Muntligt":"Samtal (Muntligt)","Notering/Fundering":"Notering (Fundering)",
  "Konversation/Skamt":"Konversation (Skämt)","Konversation/Samtalsamnen":"Konversation (Samtalsämne)",
  "Utvardering/Media":"Betyg (Media)","Utvardering/Foremal":"Betyg (Föremål)","Utvardering/Plats":"Betyg (Plats)",
  "Bilder/Index":"Bilder","Installningar":"Inställningar","Installningar/Inmatningar":"Inställningar (Inmatningar)",
  "Notering/Lardom/Vokabular":"Lärdom (Vokabulär)","Notering/Lardom/Kunskap":"Lärdom (Kunskap)","Notering/Anteckning":"Notering (Anteckning)"
};

var driveIdCache={};         // path -> file id
var driveDirCache={};        // "foralderId/mappnamn" -> mapp-id, en post per mappNIVÅ
var driveDirCachePromise={}; // samma nyckel som driveDirCache, men pågående Promise
var driveIdCachePromise={};  // samma nyckel som driveIdCache, men pågående Promise

function saveDriveCache(){
  /* no-op: cachen är bara i minnet, gäller en session */
}
function loadDriveCache(){
  /* no-op: inget att läsa in — cachen börjar tom varje sidladdning */
}

async function driveMkdir(name,parentId){
  var ckey=parentId+"/"+name;
  if(driveDirCache[ckey])return driveDirCache[ckey];
  if(driveDirCachePromise[ckey])return driveDirCachePromise[ckey];
  driveDirCachePromise[ckey]=(async function(){
    try{
      var q="name='"+name+"' and '"+parentId+"' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false";
      var r=await fetch(DRIVE_API+"?q="+encodeURIComponent(q)+"&fields=files(id)",{headers:{Authorization:"Bearer "+accessToken}});
      var d=await r.json();
      if(d.files&&d.files.length>0){
        driveDirCache[ckey]=d.files[0].id;saveDriveCache();return driveDirCache[ckey];
      }
      var r2=await fetch(DRIVE_API,{method:"POST",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},body:JSON.stringify({name:name,parents:[parentId],mimeType:"application/vnd.google-apps.folder"})});
      var d2=await r2.json();
      driveDirCache[ckey]=d2.id;saveDriveCache();return driveDirCache[ckey];
    }finally{
      delete driveDirCachePromise[ckey];
    }
  })();
  return driveDirCachePromise[ckey];
}

async function driveResolveFolder(def){
  var parentId=FOLDER_ID;
  for(var i=0;i<def.length;i++){
    parentId=await driveMkdir(def[i],parentId);
  }
  return parentId;
}

async function driveGetFileId(path){
  // Cachen är trygg att lita på inom en session — ingen annan enhet kan ändra
  // filerna mitt i din session utan att sidan laddas om ändå.
  if(driveIdCache[path])return driveIdCache[path];
  if(driveIdCachePromise[path])return driveIdCachePromise[path];
  driveIdCachePromise[path]=(async function(){
    try{
      var def=DRIVE_STRUCTURE[path];
      if(!def)throw new Error("Okänd sökväg: "+path);
      var parentId=await driveResolveFolder(def);
      // Sök — explicit uteslut papperskorgen
      var q="name='data.json' and '"+parentId+"' in parents and trashed=false";
      var r=await fetch(DRIVE_API+"?q="+encodeURIComponent(q)+"&fields=files(id,name,createdTime)&orderBy=createdTime",{headers:{Authorization:"Bearer "+accessToken}});
      var d=await r.json();
      if(d.files&&d.files.length>1){
        reportDriveError(path,"⚠️ Flera data.json-filer hittades i mappen '"+def.join("/")+"'. Ta bort de extra filerna i Google Drive manuellt. Använder den äldsta.");
        driveIdCache[path]=d.files[0].id;
        saveDriveCache();
        return driveIdCache[path];
      }
      if(d.files&&d.files.length===1){
        driveIdCache[path]=d.files[0].id;
        saveDriveCache();
        return driveIdCache[path];
      }
      delete driveIdCache[path];
      saveDriveCache();
      throw new Error("FIL_SAKNAS:"+path);
    }finally{
      delete driveIdCachePromise[path];
    }
  })();
  return driveIdCachePromise[path];
}

async function driveEnsureFile(path){
  // Explicitly creates a new file — only call when user has confirmed creation
  var def=DRIVE_STRUCTURE[path];
  if(!def)throw new Error("Okänd sökväg: "+path);
  var parentId=await driveResolveFolder(def);
  var form=new FormData();
  form.append("metadata",new Blob([JSON.stringify({name:"data.json",parents:[parentId],mimeType:"application/json"})],{type:"application/json"}));
  form.append("file",new Blob(["{}"],{type:"application/json"}));
  var r2=await fetch(DRIVE_UPLOAD+"?uploadType=multipart&fields=id",{method:"POST",headers:{Authorization:"Bearer "+accessToken},body:form});
  var d2=await r2.json();
  driveIdCache[path]=d2.id;saveDriveCache();return driveIdCache[path];
}

var driveErrors=[];

function showDriveWriteError(path,msg,data){
  var def=DRIVE_STRUCTURE[path]||[path];
  var displayPath=def.join("/")+"/data.json";
  var overlay=document.createElement("div");
  overlay.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px";
  overlay.innerHTML="<div style='background:#161616;border-radius:16px;border:1px solid #d97a83;padding:20px;width:100%;max-width:420px'>"
    +"<div style='font-size:15px;font-weight:600;color:#d97a83;margin-bottom:10px'>⚠️ Kunde inte spara</div>"
    +"<div style='font-size:12px;color:#4fa8ff;font-family:monospace;background:#131313;padding:8px 12px;border-radius:8px;margin-bottom:10px'>"+displayPath+"</div>"
    +"<div style='font-size:13px;color:#f2f2f2;margin-bottom:14px;line-height:1.5'>"+esc(msg)+"</div>"
    +"<div style='display:flex;flex-direction:column;gap:8px'>"
    +"<button id='dwe-retry' style='padding:11px;border-radius:8px;background:#131313;border:1px solid #2a2a2a;color:#f2f2f2;font-size:13px;cursor:pointer;font-family:inherit'>🔄 Försök igen</button>"
    +"<button id='dwe-close' style='padding:11px;border-radius:8px;background:#131313;border:1px solid #2a2a2a;color:#5c5c5c;font-size:13px;cursor:pointer;font-family:inherit'>Stäng</button>"
    +"</div></div>";
  document.body.appendChild(overlay);
  overlay.querySelector("#dwe-close").onclick=function(){overlay.remove();};
  var retryBtn=overlay.querySelector("#dwe-retry");
  retryBtn.onclick=function(){
    retryBtn.textContent="Försöker igen...";retryBtn.disabled=true;
    driveWrite(path,data).then(function(){overlay.remove();});
  };
}

function reportDriveError(path,msg,data){
  driveErrors.push({path:path,msg:msg,data:data});
  console.error("Drive fel ["+path+"]: "+msg);
  var banner=document.getElementById("drive-error-banner");
  if(!banner){
    banner=document.createElement("div");
    banner.id="drive-error-banner";
    banner.style.cssText="position:fixed;top:0;left:0;right:0;background:#2e1518;border-bottom:2px solid #d97a83;padding:10px 16px;z-index:9999;font-size:12px;color:#d97a83;max-height:200px;overflow-y:auto;";
    document.body.appendChild(banner);
  }
  banner.innerHTML="<strong>⚠️ Fel vid läsning från Drive:</strong><br>"
    +driveErrors.map(function(e,i){
      return "<div style='margin-top:4px'><b>"+e.path+"</b>: "+e.msg+"</div>";
    }).join("")
    +"<br><button id=\'close-drive-err\' style=\'margin-top:6px;padding:3px 10px;border-radius:6px;background:#4a1a1a;border:1px solid #d97a83;color:#d97a83;cursor:pointer;font-size:11px\'>Stäng</button>";
  var cb=document.getElementById("close-drive-err");
  if(cb)cb.onclick=function(){document.getElementById("drive-error-banner").remove();driveErrors=[];};
}

function validateDriveData(path,data){
  var errors=[];
  var checks={
    "Aktivitet":  function(d){
      if(!Array.isArray(d.logs)){errors.push('"logs" saknas eller är inte en lista');}
      else{d.logs.forEach(function(l,i){
        if(typeof l.id!=="number")errors.push("logs["+i+']: "id" är '+typeof l.id+' — bör vara nummer');
        if(!l.activity)errors.push("logs["+i+']: "activity" saknas');
        if(!l.timestamp)errors.push("logs["+i+']: "timestamp" saknas');
      });}
    },
    "Samtal/Text":     function(d){if(!Array.isArray(d.konversationer))errors.push('"konversationer" saknas');},
    "Samtal/Muntligt": function(d){if(!Array.isArray(d.muntKonversationer))errors.push('"muntKonversationer" saknas');},
    "Notering/Fundering":function(d){if(!Array.isArray(d.fundHist))errors.push('"fundHist" saknas');},
    "Konversation/Samtalsamnen":function(d){if(!Array.isArray(d.amneHist))errors.push('"amneHist" saknas');},
    "Utvardering/Media":      function(d){if(!d.mediaList||typeof d.mediaList!=="object"||Array.isArray(d.mediaList))errors.push('"mediaList" saknas eller är inte ett objekt');},
    "Utvardering/Foremal":     function(d){if(!d.objList||typeof d.objList!=="object"||Array.isArray(d.objList))errors.push('"objList" saknas eller är inte ett objekt');},
    "Utvardering/Plats":     function(d){if(!d.platsList||typeof d.platsList!=="object"||Array.isArray(d.platsList))errors.push('"platsList" saknas eller är inte ett objekt');},
    "Installningar/Inmatningar": function(d){if(!Array.isArray(d.aktivitetHistory)&&!Array.isArray(d.platsHistory)&&!Array.isArray(d.anteckningHistory))errors.push('inmatningshistorik saknas eller har fel format');},
    "Konversation/Skamt":       function(d){if(!Array.isArray(d.savedJokes))errors.push('"savedJokes" saknas');},
    "Bilder/Index":   function(d){if(!Array.isArray(d.images))errors.push('"images" saknas');},
    "Notering/Lardom/Vokabular": function(d){if(!Array.isArray(d.vokabularHist))errors.push('"vokabularHist" saknas');},
    "Notering/Lardom/Kunskap":   function(d){if(!Array.isArray(d.kunskapHist))errors.push('"kunskapHist" saknas');},
    "Notering/Anteckning":function(d){if(!Array.isArray(d.tipsTricksHist))errors.push('"tipsTricksHist" saknas');}
  };
  if(checks[path])checks[path](data);
  // Report warnings but always return true — don't block data
  if(errors.length){errors.forEach(function(e){reportDriveError(path,"⚠️ Varning: "+e);});}
  return true;
}

async function driveRead(path){
  try{
    var id=await driveGetFileId(path);
    var r=await fetch(DRIVE_API+"/"+id+"?alt=media",{headers:{Authorization:"Bearer "+accessToken}});
    if(r.status===404){
      // Stale file ID — clear cache and search again
      delete driveIdCache[path];
      saveDriveCache();
      try{
        id=await driveGetFileId(path);
        r=await fetch(DRIVE_API+"/"+id+"?alt=media",{headers:{Authorization:"Bearer "+accessToken}});
      }catch(e2){
        if(e2.message&&e2.message.startsWith("FIL_SAKNAS:")){
          showFileMissingError(path);
          return null;
        }
        throw e2;
      }
    }
    if(!r.ok){reportDriveError(path,"HTTP "+r.status+" vid läsning");return null;}
    var text=await r.text();
    if(!text||!text.trim()||text.trim()==="{}"){return null;}
    var parsed;
    try{parsed=JSON.parse(text);}catch(pe){reportDriveError(path,"Ogiltig JSON — "+pe.message);return null;}
    validateDriveData(path,parsed);
    return parsed;
  }catch(e){
    if(e.message&&e.message.startsWith("FIL_SAKNAS:")){
      // Silent — file simply not created yet, no error needed
      return null;
    }
    reportDriveError(path,"Nätverksfel: "+e.message);
    return null;
  }
}

function showFileMissingError(path,data){
  var def=DRIVE_STRUCTURE[path]||[path];
  var displayPath=def.join("/")+"/data.json";
  var overlay=document.createElement("div");
  overlay.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px";
  overlay.innerHTML="<div style='background:#161616;border-radius:16px;border:1px solid #d97a83;padding:20px;width:100%;max-width:420px'>"
    +"<div style='font-size:15px;font-weight:600;color:#d97a83;margin-bottom:10px'>⚠️ Fil hittades inte</div>"
    +"<div style='font-size:12px;color:#4fa8ff;font-family:monospace;background:#131313;padding:8px 12px;border-radius:8px;margin-bottom:14px'>"+displayPath+"</div>"
    +"<div id='fmr-list' style='margin-bottom:12px'><div style='color:#5c5c5c;font-size:13px'>Söker i Drive...</div></div>"
    +"<div style='display:flex;flex-direction:column;gap:8px'>"
    +"<button id='fmr-create' style='padding:11px;border-radius:8px;background:#131313;border:1px solid #2a2a2a;color:#f2f2f2;font-size:13px;cursor:pointer;font-family:inherit'>✚ Skapa ny tom fil</button>"
    +"<button id='fmr-cancel' style='padding:11px;border-radius:8px;background:#131313;border:1px solid #2a2a2a;color:#5c5c5c;font-size:13px;cursor:pointer;font-family:inherit'>Avbryt</button>"
    +"</div></div>";
  document.body.appendChild(overlay);
  overlay.querySelector("#fmr-cancel").onclick=function(){overlay.remove();};
  overlay.querySelector("#fmr-create").onclick=async function(){
    this.textContent="Skapar...";this.disabled=true;
    try{await driveEnsureFile(path);overlay.remove();}
    catch(err){this.textContent="Fel: "+err.message;this.disabled=false;}
  };

  // Search for all data.json files in AI-Assistent folder
  var listDiv=overlay.querySelector("#fmr-list");
  (async function(){
    try{
      var q="name='data.json' and '"+FOLDER_ID+"' in parents and trashed=false";
      // Also search recursively by listing all files in folder tree
      var r=await fetch(DRIVE_API+"?q="+encodeURIComponent("name='data.json' and trashed=false")+"&fields=files(id,name,parents)&pageSize=50",{headers:{Authorization:"Bearer "+accessToken}});
      var d=await r.json();
      // Filter to only files inside our AI-Assistent folder tree
      // We'll get parent folder names by looking at known driveDirCache
      var files=d.files||[];
      // Also do a direct search inside FOLDER_ID tree
      var r2=await fetch(DRIVE_API+"?q="+encodeURIComponent("name='data.json' and trashed=false")+"&fields=files(id,name,parents,webViewLink)&pageSize=100",{headers:{Authorization:"Bearer "+accessToken}});
      var d2=await r2.json();
      files=d2.files||[];

      // Get folder names for display
      var folderIds=Object.values(driveDirCache);
      var relevantFiles=files.filter(function(f){
        return f.parents&&f.parents.some(function(p){return folderIds.indexOf(p)>=0||p===FOLDER_ID;});
      });

      if(!relevantFiles.length){
        listDiv.innerHTML="<div style='color:#5c5c5c;font-size:13px'>Inga data.json-filer hittades i AI-Assistent-mappen.</div>";
        return;
      }

      // Build folder name lookup
      var folderNameMap={};
      Object.entries(driveDirCache).forEach(function(e){folderNameMap[e[1]]=e[0].split("/").pop();});
      folderNameMap[FOLDER_ID]="AI-Assistent";

      listDiv.innerHTML="<div style='font-size:13px;color:#f2f2f2;margin-bottom:8px'>Välj fil att länka:</div>"
        +relevantFiles.map(function(f){
          var parentName=f.parents?folderNameMap[f.parents[0]]||f.parents[0]:"";
          return "<button data-fileid='"+f.id+"' style='display:block;width:100%;text-align:left;padding:8px 12px;margin-bottom:6px;border-radius:8px;background:#131313;border:1px solid #2a2a2a;color:#f2f2f2;font-size:13px;cursor:pointer;font-family:inherit'>"
            +"<span style='color:#4fa8ff'>📄</span> "+parentName+"/data.json"
            +"</button>";
        }).join("");

      listDiv.querySelectorAll("[data-fileid]").forEach(function(btn){
        btn.onclick=function(){
          var fileId=btn.dataset.fileid;
          // Just cache this file ID — no new file created
          driveIdCache[path]=fileId;
          saveDriveCache();
          overlay.remove();
          // Reload tab data
          var tabKey=Object.keys(tabLoaded).find(function(k){
            var p=path.toLowerCase();
            return (k==="aktiviteter"&&p.includes("aktivitet"))||(k==="samtaltext"&&p.includes("samtal")&&p.includes("text"))||(k==="samtalmuntligt"&&p.includes("samtal")&&p.includes("muntligt"))||(k==="funderingar"&&p.includes("fundering"))||(k==="media"&&p.includes("media"))||(k==="sok"&&p.includes("sok"))||(k==="text"&&p.includes("text"))||(k==="terapi"&&p.includes("terapi"))||(k==="tips"&&p.includes("tips"))||(k==="installningar"&&p.includes("installning"));
          })||"aktiviteter";
          tabLoaded[tabKey]=false;
          loadTab(tabKey).then(function(){
            if(view==="history")renderHistory();
            else render();
            setTimeout(function(){updateHandelser(null);},100);
          });
        };
      });
    }catch(e){
      listDiv.innerHTML="<div style='color:#d97a83;font-size:13px'>Fel vid sökning: "+e.message+"</div>";
    }
  })();
}


async function driveWriteJpeg(filename,base64,mtype){
  // Get or create top-level Bilder folder
  var bilderId=await driveMkdir("Bilder",FOLDER_ID);
  // Convert base64 to binary
  var binary=atob(base64);
  var bytes=new Uint8Array(binary.length);
  for(var i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  var blob=new Blob([bytes],{type:mtype||"image/jpeg"});
  var form=new FormData();
  form.append("metadata",new Blob([JSON.stringify({name:filename,parents:[bilderId],mimeType:mtype||"image/jpeg"})],{type:"application/json"}));
  form.append("file",blob);
  var r=await fetch(DRIVE_UPLOAD+"?uploadType=multipart&fields=id",{method:"POST",headers:{Authorization:"Bearer "+accessToken},body:form});
  var d=await r.json();
  return d.id;
}

async function loadImageBase64(img){
  if(img.base64)return img.base64;
  if(!img.driveId||!accessToken)return null;
  try{
    var r=await fetch(DRIVE_API+"/"+img.driveId+"?alt=media",{headers:{Authorization:"Bearer "+accessToken}});
    if(!r.ok)return null;
    var blob=await r.blob();
    return await new Promise(function(res){
      var reader=new FileReader();
      reader.onload=function(e){res(e.target.result.split(",")[1]);};
      reader.readAsDataURL(blob);
    });
  }catch(e){return null;}
}

async function saveImageToDrive(img){
  if(!accessToken||!img.base64)return false;
  try{
    var filename=buildImageFilename(img);
    var id=await driveWriteJpeg(filename,img.base64,img.mtype||"image/jpeg");
    if(!id)return false;
    img.driveId=id;
    img.base64=null; // free memory after upload
    return true;
  }catch(e){
    console.error("saveImageToDrive fel:",e);
    return false;
  }
}

async function driveDeleteFile(fileId){
  try{await fetch(DRIVE_API+"/"+fileId,{method:"DELETE",headers:{Authorization:"Bearer "+accessToken}});}catch(e){}
}

// Sant om alla fält i data-objektet är tomma listor/objekt/strängar - dvs "inget att spara".
function isDataEmptyForWrite(data){
  if(!data||typeof data!=="object")return true;
  var keys=Object.keys(data);
  if(!keys.length)return true;
  return keys.every(function(k){
    var v=data[k];
    if(Array.isArray(v))return v.length===0;
    if(v&&typeof v==="object")return Object.keys(v).length===0;
    return v===null||v===undefined||v==="";
  });
}

function showEmptyWriteBlocked(path,data){
  var def=DRIVE_STRUCTURE[path]||[path];
  var displayPath=def.join("/")+"/data.json";
  var overlay=document.createElement("div");
  overlay.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px";
  overlay.innerHTML="<div style='background:#161616;border-radius:16px;border:1px solid #d97a83;padding:20px;width:100%;max-width:420px'>"
    +"<div style='font-size:15px;font-weight:600;color:#d97a83;margin-bottom:10px'>⚠️ Sparning blockerad</div>"
    +"<div style='font-size:12px;color:#4fa8ff;font-family:monospace;background:#131313;padding:8px 12px;border-radius:8px;margin-bottom:10px'>"+displayPath+"</div>"
    +"<div style='font-size:13px;color:#f2f2f2;margin-bottom:14px;line-height:1.5'>Den här filen innehåller redan data i Drive, men det som skulle sparas nu är tomt. För att skydda mot att data raderas av misstag har sparningen stoppats. Ladda om fliken (eller appen) innan du fortsätter, så du inte råkar spara över den här filen tom av misstag.</div>"
    +"<div style='display:flex;flex-direction:column;gap:8px'>"
    +"<button id='ewb-force' style='padding:11px;border-radius:8px;background:#2e1518;border:1px solid #d97a83;color:#d97a83;font-size:13px;cursor:pointer;font-family:inherit'>Skriv ändå (rensar filen)</button>"
    +"<button id='ewb-close' style='padding:11px;border-radius:8px;background:#131313;border:1px solid #2a2a2a;color:#5c5c5c;font-size:13px;cursor:pointer;font-family:inherit'>Avbryt</button>"
    +"</div></div>";
  document.body.appendChild(overlay);
  overlay.querySelector("#ewb-close").onclick=function(){overlay.remove();};
  overlay.querySelector("#ewb-force").onclick=function(){
    overlay.remove();
    driveWrite(path,data,true);
  };
}

async function driveWrite(path,data,force){
  try{
    var id=driveIdCache[path];
    if(!id){
      try{id=await driveGetFileId(path);}
      catch(e){
        if(e.message&&e.message.startsWith("FIL_SAKNAS:")){
          showFileMissingError(path,data);return;
        }
        throw e;
      }
    }
    if(!force&&isDataEmptyForWrite(data)){
      try{
        var checkRes=await fetch(DRIVE_API+"/"+id+"?alt=media",{headers:{Authorization:"Bearer "+accessToken}});
        if(checkRes.ok){
          var existingText=await checkRes.text();
          var existingParsed=null;
          try{existingParsed=JSON.parse(existingText);}catch(e2){existingParsed=null;}
          if(existingParsed&&!isDataEmptyForWrite(existingParsed)){
            showEmptyWriteBlocked(path,data);
            return;
          }
        }
      }catch(e3){/* kunde inte kontrollera nuvarande innehåll - fortsätt ändå med skrivningen */}
    }
    var r=await fetch(DRIVE_UPLOAD+"/"+id+"?uploadType=media",{method:"PATCH",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},body:JSON.stringify(data,null,2)});
    if(r.status===404){
      delete driveIdCache[path];saveDriveCache();
      try{id=await driveGetFileId(path);}
      catch(e){showFileMissingError(path,data);return;}
      await fetch(DRIVE_UPLOAD+"/"+id+"?uploadType=media",{method:"PATCH",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},body:JSON.stringify(data,null,2)});
    }
  }catch(e){showDriveWriteError(path,e.message,data);}
}

// ---- In-app JSON-redigerare ----
// Google Drives egen förhandsvisning av textfiler (JSON m.fl.) är alltid
// skrivskyddad — det finns ingen inbyggd redigerare för det i Drives webbgränssnitt.
// Dessa funktioner läser/skriver den råa filtexten direkt via Drive-API:et, så man
// kan redigera innehållet i appen istället för att behöva ladda ner/ladda upp filen manuellt.
async function driveReadRaw(path){
  delete driveIdCache[path]; // slå upp färskt varje gång redigeraren öppnas
  var id=await driveGetFileId(path);
  var r=await fetch(DRIVE_API+"/"+id+"?alt=media",{headers:{Authorization:"Bearer "+accessToken}});
  if(!r.ok)throw new Error("HTTP "+r.status);
  return await r.text();
}
async function driveWriteRaw(path,rawText){
  var id=driveIdCache[path]||await driveGetFileId(path);
  var r=await fetch(DRIVE_UPLOAD+"/"+id+"?uploadType=media",{method:"PATCH",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},body:rawText});
  if(!r.ok)throw new Error("HTTP "+r.status);
}

function openJsonEditor(path){
  var def=DRIVE_STRUCTURE[path]||[path];
  var displayPath=def.join("/")+"/data.json";
  var overlay=document.createElement("div");
  overlay.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px";
  overlay.innerHTML="<div style='background:#161616;border-radius:16px;border:1px solid #4fa8ff;padding:20px;width:100%;max-width:640px;max-height:85vh;display:flex;flex-direction:column'>"
    +"<div style='font-size:15px;font-weight:600;color:#f2f2f2;margin-bottom:6px'>Redigera JSON</div>"
    +"<div style='font-size:12px;color:#4fa8ff;font-family:monospace;background:#131313;padding:8px 12px;border-radius:8px;margin-bottom:10px'>"+esc(displayPath)+"</div>"
    +"<div id='json-editor-status' style='font-size:12px;color:#5c5c5c;margin-bottom:8px'>Laddar...</div>"
    +"<textarea id='json-editor-ta' style='flex:1;min-height:320px;background:#131313;border:1px solid #2a2a2a;border-radius:8px;color:#f2f2f2;font-family:monospace;font-size:12px;padding:10px;resize:vertical' spellcheck='false' disabled></textarea>"
    +"<div style='display:flex;gap:8px;margin-top:12px'>"
    +"<button id='json-editor-save' style='flex:1;padding:11px;border-radius:8px;background:#1c3c5a;border:1px solid #4fa8ff;color:#4fa8ff;font-size:13px;cursor:pointer;font-family:inherit' disabled>💾 Spara</button>"
    +"<button id='json-editor-close' style='flex:1;padding:11px;border-radius:8px;background:#131313;border:1px solid #2a2a2a;color:#5c5c5c;font-size:13px;cursor:pointer;font-family:inherit'>Stäng</button>"
    +"</div></div>";
  document.body.appendChild(overlay);
  var ta=overlay.querySelector("#json-editor-ta");
  var statusEl=overlay.querySelector("#json-editor-status");
  var saveBtn=overlay.querySelector("#json-editor-save");
  overlay.querySelector("#json-editor-close").onclick=function(){overlay.remove();};

  (async function(){
    try{
      var raw=await driveReadRaw(path);
      var pretty=raw;
      try{pretty=JSON.stringify(JSON.parse(raw||"{}"),null,2);}catch(e){}
      ta.value=pretty;
      ta.disabled=false;
      saveBtn.disabled=false;
      statusEl.style.color="#5c5c5c";
      statusEl.textContent="Redigera nedan och klicka Spara. Innehållet valideras som JSON innan det skickas.";
    }catch(e){
      statusEl.style.color="#d97a83";
      if(e.message&&e.message.startsWith("FIL_SAKNAS:")){
        statusEl.textContent="Filen finns inte än i Drive. Skapa den först via \"Öppna i Google Drive\" eller \"Skriv om alla Drive-filer\" i Inställningar.";
      } else {
        statusEl.textContent="Kunde inte hämta filen: "+e.message;
      }
    }
  })();

  saveBtn.onclick=async function(){
    var val=ta.value;
    var parsed;
    try{parsed=JSON.parse(val);}
    catch(e){statusEl.style.color="#d97a83";statusEl.textContent="⚠️ Ogiltig JSON: "+e.message;return;}
    saveBtn.textContent="Sparar...";saveBtn.disabled=true;
    try{
      await driveWriteRaw(path,JSON.stringify(parsed));
      var tabName=Object.keys(DRIVE_STRUCTURE_BY_TAB).find(function(k){return DRIVE_STRUCTURE_BY_TAB[k]===path;});
      if(tabName){
        applyTabData(tabName,parsed);
        tabLoaded[tabName]=true;
        saveLocal();
        if(view==="funderingar")renderLogFunderingar();
        else if(view==="log")render();
      }
      statusEl.style.color="#4fa8ff";
      statusEl.textContent="✓ Sparat! Ändringen syns direkt i appen.";
    }catch(e){
      statusEl.style.color="#d97a83";
      statusEl.textContent="Kunde inte spara: "+e.message;
    }
    saveBtn.textContent="💾 Spara";saveBtn.disabled=false;
  };
}

// Applicerar inläst Drive-data på rätt globala variabler för en given tabb.
// Delas mellan loadTab() (vid normal navigering) och JSON-editorn (vid manuell redigering),
// så att en manuell ändring via "Redigera i appen" syns direkt i appen, inte bara nästa gång fliken öppnas.
function applyTabData(tabName,da){
  if(tabName==="aktiviteter"){
    if(da&&da.logs)logs=da.logs.map(function(l){l.id=Number(l.id)||l.id;return l;});
  } else if(tabName==="samtaltext"){
    if(da&&da.konversationer)konversationer=da.konversationer;
  } else if(tabName==="samtalmuntligt"){
    if(da&&da.muntKonversationer)muntKonversationer=da.muntKonversationer;
  } else if(tabName==="funderingar"){
    if(da&&da.fundHist)fundHist=da.fundHist;
  } else if(tabName==="vokabular"){
    if(da&&da.vokabularHist)vokabularHist=da.vokabularHist;
  } else if(tabName==="kunskap"){
    if(da&&da.kunskapHist)kunskapHist=da.kunskapHist;
  } else if(tabName==="tipstricks"){
    if(da&&da.tipsTricksHist)tipsTricksHist=da.tipsTricksHist;
  } else if(tabName==="samtalsamnen"){
    if(da&&da.amneHist)amneHist=da.amneHist;
  } else if(tabName==="media"){
    if(da){if(da.mediaList)mediaList=da.mediaList;if(da.mediaFardig)mediaFardig=da.mediaFardig;}
    migrateMediaCategories();
  } else if(tabName==="objekt"){
    if(da){if(da.objList)objList=da.objList;if(da.objFardig)objFardig=da.objFardig;}
  } else if(tabName==="plats"){
    if(da){if(da.platsList)platsList=da.platsList;if(da.platsFardig)platsFardig=da.platsFardig;}
  } else if(tabName==="inmatningar"){
    if(da){
      if(da.aktivitetHistory)aktivitetHistory=da.aktivitetHistory;
      if(da.platsHistory)platsHistory=da.platsHistory;
      if(da.anteckningHistory)anteckningHistory=da.anteckningHistory;
      if(da.anteckningByCat)ANTECKNING_BY_CAT=da.anteckningByCat;
      migrateAnteckningByCatOnce();
      if(da.actPresetsByCat)ACT_PRESETS_BY_CAT=da.actPresetsByCat;
      if(da.placePresetsByCat)PLACE_PRESETS_BY_CAT=da.placePresetsByCat;
      if(da.mediaCreatorByCat)MEDIA_CREATOR_BY_CAT=da.mediaCreatorByCat;
      if(da.mediaGenreByCat)MEDIA_GENRE_BY_CAT=da.mediaGenreByCat;
      if(da.objMakerByCat)OBJ_MAKER_BY_CAT=da.objMakerByCat;
      if(da.platsKommunByCat)PLATS_KOMMUN_BY_CAT=da.platsKommunByCat;
      if(da.tipsTricksSubcatByCat)TIPSTRICKS_SUBCAT_BY_CAT=da.tipsTricksSubcatByCat;
      migrateCatPresetsOnce();
    }
  } else if(tabName==="skamt"){
    if(da)savedJokes=da.savedJokes||[];
  } else if(tabName==="installningar"){
    if(da){
      if(da.placePresets)PLACE_PRESETS=da.placePresets;
      if(da.actPresets)ACT_PRESETS=da.actPresets;
      if(da.catPresets)CAT_PRESETS=da.catPresets;
      if(da.fundCatPresets)FUND_CAT_PRESETS=da.fundCatPresets;
      if(da.tipsTricksCatPresets)TIPSTRICKS_CAT_PRESETS=da.tipsTricksCatPresets;
      if(da.amneCatPresets)AMNE_CAT_PRESETS=da.amneCatPresets;
      migrateCatPresetsOnce();
      if(da.mediaCatPresets)MEDIA_CAT_PRESETS=da.mediaCatPresets;
      if(da.objCatPresets)OBJ_CAT_PRESETS=da.objCatPresets;
      if(da.platsCatPresets)PLATS_CAT_PRESETS=da.platsCatPresets;
    }
  }
}

async function loadTab(tabName){
  if(!accessToken||tabLoaded[tabName])return;
  try{
    if(tabName==="aktiviteter"){
      var da=await driveRead("Aktivitet");
      applyTabData(tabName,da);
      var di=await driveRead("Bilder/Index");
      if(di&&di.images){imageHist=di.images.map(function(m){return {id:m.id,logId:m.logId,activity:m.activity,category:m.category,mtype:m.mtype||"image/jpeg",timestamp:m.timestamp,driveId:m.driveId,base64:null};});}
    } else if(tabName==="samtaltext"){
      applyTabData(tabName,await driveRead("Samtal/Text"));
    } else if(tabName==="samtalmuntligt"){
      applyTabData(tabName,await driveRead("Samtal/Muntligt"));
    } else if(tabName==="funderingar"){
      applyTabData(tabName,await driveRead("Notering/Fundering"));
    } else if(tabName==="vokabular"){
      applyTabData(tabName,await driveRead("Notering/Lardom/Vokabular"));
    } else if(tabName==="kunskap"){
      applyTabData(tabName,await driveRead("Notering/Lardom/Kunskap"));
    } else if(tabName==="tipstricks"){
      applyTabData(tabName,await driveRead("Notering/Anteckning"));
    } else if(tabName==="samtalsamnen"){
      applyTabData(tabName,await driveRead("Konversation/Samtalsamnen"));
    } else if(tabName==="media"){
      applyTabData(tabName,await driveRead("Utvardering/Media"));
    } else if(tabName==="objekt"){
      applyTabData(tabName,await driveRead("Utvardering/Foremal"));
    } else if(tabName==="plats"){
      applyTabData(tabName,await driveRead("Utvardering/Plats"));
    } else if(tabName==="inmatningar"){
      applyTabData(tabName,await driveRead("Installningar/Inmatningar"));
    } else if(tabName==="skamt"){
      applyTabData(tabName,await driveRead("Konversation/Skamt"));
    } else if(tabName==="installningar"){
      applyTabData(tabName,await driveRead("Installningar"));
    }
  }catch(e){reportDriveError(tabName,"Oväntat fel: "+e.message);}
  tabLoaded[tabName]=true;
  saveLocal();
}

// ---- Skydd mot att en sparning skriver over en Drive-fil med tom/ofullstandig lokal data ----
// (t.ex. om man pinnar nagot till Kunskap utan att forst ha oppnat Lardom-fliken den har
// sessionen). Om fliken inte last in an, laser vi Drive och slar ihop innan vi sparar.
function mergeArraysById(local,remote){
  if(!Array.isArray(remote))return local||[];
  var map=new Map();
  (local||[]).forEach(function(x){map.set(String(x.id||x.timestamp),x);});
  remote.forEach(function(x){
    var key=String(x.id||x.timestamp);
    if(!map.has(key))map.set(key,x);
  });
  return Array.from(map.values());
}
function mergeStringArraysDedup(local,remote){
  if(!Array.isArray(remote))return local||[];
  var seen={};var out=[];
  (local||[]).forEach(function(v){var k=String(v).toLowerCase();if(!seen[k]){seen[k]=true;out.push(v);}});
  remote.forEach(function(v){var k=String(v).toLowerCase();if(!seen[k]){seen[k]=true;out.push(v);}});
  return out;
}
function mergeCatItemDict(localDict,remoteDict,keyFn){
  var result={};var cats={};
  Object.keys(localDict||{}).forEach(function(c){cats[c]=true;});
  Object.keys(remoteDict||{}).forEach(function(c){cats[c]=true;});
  Object.keys(cats).forEach(function(cat){
    var existing=(localDict&&localDict[cat])||[];
    var seen={};
    existing.forEach(function(item){seen[keyFn(item)]=true;});
    var merged=existing.slice();
    ((remoteDict&&remoteDict[cat])||[]).forEach(function(item){
      var k=keyFn(item);
      if(!seen[k]){seen[k]=true;merged.push(item);}
    });
    result[cat]=merged;
  });
  return result;
}
function mergeCatStringDict(localDict,remoteDict){
  var result={};var cats={};
  Object.keys(localDict||{}).forEach(function(c){cats[c]=true;});
  Object.keys(remoteDict||{}).forEach(function(c){cats[c]=true;});
  Object.keys(cats).forEach(function(cat){
    result[cat]=mergeStringArraysDedup((localDict&&localDict[cat])||[],(remoteDict&&remoteDict[cat])||[]);
  });
  return result;
}
async function ensureTabMergedBeforeSave(tabName){
  if(tabLoaded[tabName])return;
  try{
    if(tabName==="aktiviteter"){
      var d=await driveRead("Aktivitet");
      if(d&&d.logs)logs=mergeArraysById(logs,d.logs);
    }else if(tabName==="samtaltext"){
      var d=await driveRead("Samtal/Text");
      if(d&&d.konversationer)konversationer=mergeArraysById(konversationer,d.konversationer);
    }else if(tabName==="samtalmuntligt"){
      var d=await driveRead("Samtal/Muntligt");
      if(d&&d.muntKonversationer)muntKonversationer=mergeArraysById(muntKonversationer,d.muntKonversationer);
    }else if(tabName==="funderingar"){
      var d=await driveRead("Notering/Fundering");
      if(d&&d.fundHist)fundHist=mergeArraysById(fundHist,d.fundHist);
    }else if(tabName==="vokabular"){
      var d=await driveRead("Notering/Lardom/Vokabular");
      if(d&&d.vokabularHist)vokabularHist=mergeArraysById(vokabularHist,d.vokabularHist);
    }else if(tabName==="kunskap"){
      var d=await driveRead("Notering/Lardom/Kunskap");
      if(d&&d.kunskapHist)kunskapHist=mergeArraysById(kunskapHist,d.kunskapHist);
    }else if(tabName==="tipstricks"){
      var d=await driveRead("Notering/Anteckning");
      if(d&&d.tipsTricksHist)tipsTricksHist=mergeArraysById(tipsTricksHist,d.tipsTricksHist);
    }else if(tabName==="samtalsamnen"){
      var d=await driveRead("Konversation/Samtalsamnen");
      if(d&&d.amneHist)amneHist=mergeArraysById(amneHist,d.amneHist);
    }else if(tabName==="media"){
      var d=await driveRead("Utvardering/Media");
      if(d){
        if(d.mediaFardig)mediaFardig=mergeArraysById(mediaFardig,d.mediaFardig);
        if(d.mediaList)mediaList=mergeCatItemDict(mediaList,d.mediaList,function(item){return mediaItemTitle(item)+"|"+mediaItemCreator(item)+"|"+mediaItemGenre(item);});
      }
    }else if(tabName==="objekt"){
      var d=await driveRead("Utvardering/Foremal");
      if(d){
        if(d.objFardig)objFardig=mergeArraysById(objFardig,d.objFardig);
        if(d.objList)objList=mergeCatItemDict(objList,d.objList,function(item){return objItemTitle(item)+"|"+((item&&item.tillverkare)||"");});
      }
    }else if(tabName==="plats"){
      var d=await driveRead("Utvardering/Plats");
      if(d){
        if(d.platsFardig)platsFardig=mergeArraysById(platsFardig,d.platsFardig);
        if(d.platsList)platsList=mergeCatItemDict(platsList,d.platsList,function(item){return platsItemTitle(item)+"|"+((item&&item.kommun)||"");});
      }
    }else if(tabName==="inmatningar"){
      var d=await driveRead("Installningar/Inmatningar");
      if(d){
        aktivitetHistory=mergeStringArraysDedup(aktivitetHistory,d.aktivitetHistory);
        platsHistory=mergeStringArraysDedup(platsHistory,d.platsHistory);
        anteckningHistory=mergeStringArraysDedup(anteckningHistory,d.anteckningHistory);
        ANTECKNING_BY_CAT=mergeCatStringDict(ANTECKNING_BY_CAT,d.anteckningByCat);
        ACT_PRESETS_BY_CAT=mergeCatStringDict(ACT_PRESETS_BY_CAT,d.actPresetsByCat);
        PLACE_PRESETS_BY_CAT=mergeCatStringDict(PLACE_PRESETS_BY_CAT,d.placePresetsByCat);
        MEDIA_CREATOR_BY_CAT=mergeCatStringDict(MEDIA_CREATOR_BY_CAT,d.mediaCreatorByCat);
        MEDIA_GENRE_BY_CAT=mergeCatStringDict(MEDIA_GENRE_BY_CAT,d.mediaGenreByCat);
        OBJ_MAKER_BY_CAT=mergeCatStringDict(OBJ_MAKER_BY_CAT,d.objMakerByCat);
        PLATS_KOMMUN_BY_CAT=mergeCatStringDict(PLATS_KOMMUN_BY_CAT,d.platsKommunByCat);
        TIPSTRICKS_SUBCAT_BY_CAT=mergeCatStringDict(TIPSTRICKS_SUBCAT_BY_CAT,d.tipsTricksSubcatByCat);
      }
    }else if(tabName==="skamt"){
      var d=await driveRead("Konversation/Skamt");
      if(d&&d.savedJokes)savedJokes=mergeStringArraysDedup(savedJokes,d.savedJokes);
    }else if(tabName==="bilder"){
      var d=await driveRead("Bilder/Index");
      if(d&&d.images)imageHist=mergeArraysById(imageHist,d.images);
    }else if(tabName==="installningar"){
      var d=await driveRead("Installningar");
      if(d){
        if(d.placePresets)PLACE_PRESETS=mergeStringArraysDedup(PLACE_PRESETS,d.placePresets);
        if(d.actPresets)ACT_PRESETS=mergeStringArraysDedup(ACT_PRESETS,d.actPresets);
        if(d.catPresets)CAT_PRESETS=mergeStringArraysDedup(CAT_PRESETS,d.catPresets);
        if(d.fundCatPresets)FUND_CAT_PRESETS=mergeStringArraysDedup(FUND_CAT_PRESETS,d.fundCatPresets);
        if(d.tipsTricksCatPresets)TIPSTRICKS_CAT_PRESETS=mergeStringArraysDedup(TIPSTRICKS_CAT_PRESETS,d.tipsTricksCatPresets);
        if(d.mediaCatPresets)MEDIA_CAT_PRESETS=mergeStringArraysDedup(MEDIA_CAT_PRESETS,d.mediaCatPresets);
        if(d.amneCatPresets)AMNE_CAT_PRESETS=mergeStringArraysDedup(AMNE_CAT_PRESETS,d.amneCatPresets);
        if(d.objCatPresets)OBJ_CAT_PRESETS=mergeStringArraysDedup(OBJ_CAT_PRESETS,d.objCatPresets);
        if(d.platsCatPresets)PLATS_CAT_PRESETS=mergeStringArraysDedup(PLATS_CAT_PRESETS,d.platsCatPresets);
      }
    }
  }catch(e){
    // Filen finns troligen inte an (ny flik) - fortsätt med lokal data istället for att krascha sparningen.
  }
  tabLoaded[tabName]=true;
}
async function saveTab(tabName){
  if(!accessToken)return;
  await ensureTabMergedBeforeSave(tabName);
  if(tabName==="aktiviteter"){await driveWrite("Aktivitet",{logs:logs});}
  else if(tabName==="samtaltext"){await driveWrite("Samtal/Text",{konversationer:konversationer});}
  else if(tabName==="samtalmuntligt"){await driveWrite("Samtal/Muntligt",{muntKonversationer:muntKonversationer});}
  else if(tabName==="funderingar"){await driveWrite("Notering/Fundering",{fundHist:fundHist});}
  else if(tabName==="vokabular"){await driveWrite("Notering/Lardom/Vokabular",{vokabularHist:vokabularHist});}
  else if(tabName==="kunskap"){await driveWrite("Notering/Lardom/Kunskap",{kunskapHist:kunskapHist});}
  else if(tabName==="tipstricks"){await driveWrite("Notering/Anteckning",{tipsTricksHist:tipsTricksHist});}
  else if(tabName==="samtalsamnen"){await driveWrite("Konversation/Samtalsamnen",{amneHist:amneHist});}
  else if(tabName==="media"){await driveWrite("Utvardering/Media",{mediaList:mediaList,mediaFardig:mediaFardig});}
  else if(tabName==="objekt"){await driveWrite("Utvardering/Foremal",{objList:objList,objFardig:objFardig});}
  else if(tabName==="plats"){await driveWrite("Utvardering/Plats",{platsList:platsList,platsFardig:platsFardig});}
  else if(tabName==="inmatningar"){await driveWrite("Installningar/Inmatningar",{aktivitetHistory:aktivitetHistory,platsHistory:platsHistory,anteckningHistory:anteckningHistory,anteckningByCat:ANTECKNING_BY_CAT,actPresetsByCat:ACT_PRESETS_BY_CAT,placePresetsByCat:PLACE_PRESETS_BY_CAT,mediaCreatorByCat:MEDIA_CREATOR_BY_CAT,mediaGenreByCat:MEDIA_GENRE_BY_CAT,objMakerByCat:OBJ_MAKER_BY_CAT,platsKommunByCat:PLATS_KOMMUN_BY_CAT,tipsTricksSubcatByCat:TIPSTRICKS_SUBCAT_BY_CAT});}
  else if(tabName==="skamt"){await driveWrite("Konversation/Skamt",{savedJokes:savedJokes});}
  else if(tabName==="bilder"){
    // Save index only (base64 not stored in index)
    var idx=imageHist.map(function(i){return {id:i.id,logId:i.logId,activity:i.activity,category:i.category,mtype:i.mtype,timestamp:i.timestamp,driveId:i.driveId||null};});
    await driveWrite("Bilder/Index",{images:idx});
  }
  else if(tabName==="installningar"){
    await driveWrite("Installningar",{
      placePresets:PLACE_PRESETS,
      actPresets:ACT_PRESETS,
      catPresets:CAT_PRESETS,
      fundCatPresets:FUND_CAT_PRESETS,
      tipsTricksCatPresets:TIPSTRICKS_CAT_PRESETS,
      mediaCatPresets:MEDIA_CAT_PRESETS,
      amneCatPresets:AMNE_CAT_PRESETS,
      objCatPresets:OBJ_CAT_PRESETS,
      platsCatPresets:PLATS_CAT_PRESETS,
    });
  }
}

async function saveAndSync(tabName){
  saveLocal();
  if(!accessToken||!tabName)return;
  setSyncBtn("","Sparar...");
  try{
    await saveTab(tabName);
    setSyncBtn("ok","Sparad");
    setTimeout(function(){setSyncBtn("","Synka");},2000);
  }catch(e){
    // Only show error if it's not a missing file (those show their own dialog)
    if(!e.message||e.message.indexOf("FIL_SAKNAS")===-1){
      setSyncBtn("err","Fel vid sparning");
      setTimeout(function(){setSyncBtn("","Synka");},3000);
    } else {
      setSyncBtn("","Synka");
    }
  }
}
