

var PROXY = "https://ai-proxy.jenseskilsson95.workers.dev/";

var CLIENT_ID="167841441516-moo7oedk74f6oj3f79jdqhca3a12dgi5.apps.googleusercontent.com";
var SCOPE="https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile";
var FOLDER_ID="18DqgJT6lPDc8Sj7Nb5YLmcz8km_9zGZP";
// All bildhantering (uppladdning/hämtning) ska ske under en "Bilder"-undermapp i DENNA
// mapp - manuellt angiven av Blå, inte app-skapad. Se varning i core.js där den används.
var BILDER_PARENT_FOLDER_ID="1gljHM3P7BIrDQef2E5TCfVlVEMAiA2SI";
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
  localStorage.setItem("mb2_access_token",d.access_token);
  localStorage.setItem("mb2_token_expiry",String(Date.now()+((d.expires_in||3600)*1000)));
  if(d.refresh_token)localStorage.setItem("mb2_refresh_token",d.refresh_token);
}
function clearStoredAuth(){
  ["mb2_access_token","mb2_token_expiry","mb2_refresh_token","akt_token","token_time"].forEach(function(k){localStorage.removeItem(k);});
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
  var refreshToken=localStorage.getItem("mb2_refresh_token");
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
  var expiry=parseInt(localStorage.getItem("mb2_token_expiry")||"0");
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
  // Samtal-fliken äger numera sin egen Drive-struktur helt själv (driveWriteJson) -
  // denna migrering av den gamla odelade filen är inte längre core.js:s ansvar.
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
        loadTabsProgressively(["aktiviteter","samtaltext","samtalmuntligt","funderingar"],function(){openToday();renderHistory();});
      } else if(v==="installningar"){setView("installningar");loadTabsProgressively(["installningar"],render);}
      else if(v==="aktivitet"){
        setView("aktivitet");
        loadTabsProgressively(["aktiviteter","samtaltext","samtalmuntligt","funderingar","inmatningar"],function(){
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
  loadTabsProgressively(["aktiviteter","installningar","samtaltext","samtalmuntligt","funderingar","inmatningar"],function(){
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

  // Notering, Samtal, Konversation, Betyg äger numera sin egen JSON/mappstruktur helt
  // själva (driveReadJson/driveWriteJson) - ingen synk av dem sker längre härifrån.

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
    migrateCatPresetsOnce();
  }

  // Inställningar (kategorier + övriga presets)
  var din=await driveRead("Installningar");
  if(din&&din.placePresets)PLACE_PRESETS=din.placePresets;
  if(din&&din.actPresets)ACT_PRESETS=din.actPresets;
  if(din&&din.catPresets)CAT_PRESETS=din.catPresets;
  if(din&&din.fundCatPresets)FUND_CAT_PRESETS=din.fundCatPresets;
  // tipsTricksCatPresets/anteckningCatPresets borttaget härifrån - Notering-fliken äger
  // och sparar det numera själv (egen driveWriteJson-fil), se HANDOFF från Notering.
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

var DRIVE_SYNC_TABS=["aktiviteter","inmatningar","installningar"];
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
// OBS: bara Aktivitet och Installningar hanteras här längre. Övriga flikar (Notering,
// Samtal, Konversation, Betyg, AI) äger numera sin egen JSON/mappstruktur helt själva via
// driveReadJson/driveWriteJson - se HANDOFF_generic_drive_api.md. Be inte huvud-chatten
// lägga till nya rader här för dem.
var DRIVE_STRUCTURE={
  "Aktivitet":            ["Aktivitet"],
  "Installningar":        ["Installningar"],
  "Installningar/Inmatningar": ["Installningar","Inmatningar"]
};

// tabName (som används i saveTab/loadTab) -> DRIVE_STRUCTURE-nyckel
var DRIVE_STRUCTURE_BY_TAB={
  aktiviteter:   "Aktivitet",
  installningar: "Installningar",
  inmatningar:   "Installningar/Inmatningar"
};

// Läsbara etiketter för varje DRIVE_STRUCTURE-nyckel (delas av Inställningar-dropdownen och export av väntande inmatningar)
var PATH_LABELS={
  "Aktivitet":"Aktivitet",
  "Installningar":"Inställningar","Installningar/Inmatningar":"Inställningar (Inmatningar)"
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

// Appen kan bara skapa/hitta mappar den SJÄLV skapat (drive.file-behörighet tillåter
// inte åtkomst till mappar skapade manuellt i Drive-gränssnittet). Därför skapar/hittar
// appen sin egen rotmapp i Drive första gången, istället för att peka på ett
// hårdkodat FOLDER_ID som kanske inte är app-skapat.
// (Picker-baserat mappval borttaget — pekar nu direkt mot FOLDER_ID enligt beslut.)
async function getAppRootFolderId(){
  return FOLDER_ID;
}
async function driveResolveFolder(def){
  var parentId=await getAppRootFolderId();
  for(var i=0;i<def.length;i++){
    parentId=await driveMkdir(def[i],parentId);
  }
  return parentId;
}

// ============================================================================
// GENERISKA, FRITT ANVÄNDBARA DRIVE-FUNKTIONER
// Till skillnad från driveRead/driveWrite/driveGetFileId ovan (som kräver att
// sökvägen är förregistrerad i DRIVE_STRUCTURE här i core.js) tar dessa fyra
// emot mappstig, filnamn och ev. rotmapp-ID direkt som argument. Varje flikfil äger
// alltså helt sin egen mappstruktur/filnamn/JSON-form - core.js behöver aldrig veta
// om den i förväg. Använd dessa för ny kod istället för att be om en ny rad i
// DRIVE_STRUCTURE/saveTab/loadTab.
// ============================================================================

// folderNames: array av mappnamn, t.ex. ["Aktivitet","Bilder"]. rootId: valfri,
// annars den app-ägda rotmappen (getAppRootFolderId()).
async function driveResolveFolderPath(folderNames,rootId){
  var parentId=rootId||await getAppRootFolderId();
  for(var i=0;i<folderNames.length;i++){
    parentId=await driveMkdir(folderNames[i],parentId);
  }
  return parentId;
}

// Hittar (eller skapar, om skapaOmSaknas=true) en fil med angivet namn i mappen.
// Returnerar filens Drive-ID, eller null om den saknas och inte skulls skapas.
async function driveGetOrCreateFileId(folderNames,fileName,skapaOmSaknas,rootId){
  var parentId=await driveResolveFolderPath(folderNames,rootId);
  var q="name='"+fileName+"' and '"+parentId+"' in parents and trashed=false";
  var r=await fetch(DRIVE_API+"?q="+encodeURIComponent(q)+"&fields=files(id,name,createdTime)&orderBy=createdTime",{headers:{Authorization:"Bearer "+accessToken}});
  var d=await r.json();
  if(d.files&&d.files.length)return d.files[0].id;
  if(!skapaOmSaknas)return null;
  var form=new FormData();
  form.append("metadata",new Blob([JSON.stringify({name:fileName,parents:[parentId],mimeType:"application/json"})],{type:"application/json"}));
  form.append("file",new Blob(["{}"],{type:"application/json"}));
  var r2=await fetch(DRIVE_UPLOAD+"?uploadType=multipart&fields=id",{method:"POST",headers:{Authorization:"Bearer "+accessToken},body:form});
  var d2=await r2.json();
  return d2.id;
}

// Läser valfri JSON-fil på valfri mappstig. Returnerar det parsade objektet,
// eller null om filen saknas/är tom/inte går att läsa.
async function driveReadJson(folderNames,fileName,rootId){
  try{
    var id=await driveGetOrCreateFileId(folderNames,fileName,false,rootId);
    if(!id)return null;
    var r=await fetch(DRIVE_API+"/"+id+"?alt=media",{headers:{Authorization:"Bearer "+accessToken}});
    if(!r.ok)return null;
    var text=await r.text();
    if(!text||!text.trim()||text.trim()==="{}")return null;
    return JSON.parse(text);
  }catch(e){
    console.warn("driveReadJson("+folderNames.join("/")+"/"+fileName+") misslyckades:",e);
    return null;
  }
}

// Skriver valfri JSON-fil på valfri mappstig. Skapar filen om den inte finns.
async function driveWriteJson(folderNames,fileName,data,rootId){
  try{
    var id=await driveGetOrCreateFileId(folderNames,fileName,true,rootId);
    var r=await fetch(DRIVE_UPLOAD+"/"+id+"?uploadType=media",{method:"PATCH",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},body:JSON.stringify(data,null,2)});
    return r.ok;
  }catch(e){
    console.warn("driveWriteJson("+folderNames.join("/")+"/"+fileName+") misslyckades:",e);
    return false;
  }
}

// Filnamn per sökväg — Aktivitet har en egen namngiven fil istället för det
// generiska "data.json". Övriga sökvägar (ej aktiva flikar just nu) behåller "data.json"
// tills vidare.
var JSON_FILE_NAME_BY_PATH={
  "Aktivitet":"aktivitet.json"
};
function jsonFileNameFor(path){
  return JSON_FILE_NAME_BY_PATH[path]||"data.json";
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
      var fname=jsonFileNameFor(path);
      // Sök — explicit uteslut papperskorgen
      var q="name='"+fname+"' and '"+parentId+"' in parents and trashed=false";
      var r=await fetch(DRIVE_API+"?q="+encodeURIComponent(q)+"&fields=files(id,name,createdTime)&orderBy=createdTime",{headers:{Authorization:"Bearer "+accessToken}});
      var d=await r.json();
      if(d.files&&d.files.length>1){
        reportDriveError(path,"⚠️ Flera "+fname+"-filer hittades i mappen '"+def.join("/")+"'. Ta bort de extra filerna i Google Drive manuellt. Använder den äldsta.");
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
  var fname=jsonFileNameFor(path);
  var form=new FormData();
  form.append("metadata",new Blob([JSON.stringify({name:fname,parents:[parentId],mimeType:"application/json"})],{type:"application/json"}));
  form.append("file",new Blob(["{}"],{type:"application/json"}));
  var r2=await fetch(DRIVE_UPLOAD+"?uploadType=multipart&fields=id",{method:"POST",headers:{Authorization:"Bearer "+accessToken},body:form});
  var d2=await r2.json();
  driveIdCache[path]=d2.id;saveDriveCache();return driveIdCache[path];
}

var driveErrors=[];

function showDriveWriteError(path,msg,data){
  var def=DRIVE_STRUCTURE[path]||[path];
  var displayPath=def.join("/")+"/"+jsonFileNameFor(path);
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
    "Installningar/Inmatningar": function(d){if(!Array.isArray(d.aktivitetHistory)&&!Array.isArray(d.platsHistory)&&!Array.isArray(d.anteckningHistory))errors.push('inmatningshistorik saknas eller har fel format');}
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
  var fname=jsonFileNameFor(path);
  var displayPath=def.join("/")+"/"+fname;
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

  (async function(){
    try{
      var listDiv=overlay.querySelector("#fmr-list");
      var appRootId=await getAppRootFolderId();
      var q="name='"+fname+"' and '"+appRootId+"' in parents and trashed=false";
      var r=await fetch(DRIVE_API+"?q="+encodeURIComponent("name='"+fname+"' and trashed=false")+"&fields=files(id,name,parents)&pageSize=50",{headers:{Authorization:"Bearer "+accessToken}});
      var d=await r.json();
      var files=d.files||[];
      var r2=await fetch(DRIVE_API+"?q="+encodeURIComponent("name='"+fname+"' and trashed=false")+"&fields=files(id,name,parents,webViewLink)&pageSize=100",{headers:{Authorization:"Bearer "+accessToken}});
      var d2=await r2.json();
      files=d2.files||[];

      // Get folder names for display
      var folderIds=Object.values(driveDirCache);
      var relevantFiles=files.filter(function(f){
        return f.parents&&f.parents.some(function(p){return folderIds.indexOf(p)>=0||p===appRootId;});
      });

      if(!relevantFiles.length){
        listDiv.innerHTML="<div style='color:#5c5c5c;font-size:13px'>Inga "+fname+"-filer hittades i appens rotmapp.</div>";
        return;
      }

      // Build folder name lookup
      var folderNameMap={};
      Object.entries(driveDirCache).forEach(function(e){folderNameMap[e[1]]=e[0].split("/").pop();});
      folderNameMap[appRootId]="Rotmapp";

      listDiv.innerHTML="<div style='font-size:13px;color:#f2f2f2;margin-bottom:8px'>Välj fil att länka:</div>"
        +relevantFiles.map(function(f){
          var parentName=f.parents?folderNameMap[f.parents[0]]||f.parents[0]:"";
          return "<button data-fileid='"+f.id+"' style='display:block;width:100%;text-align:left;padding:8px 12px;margin-bottom:6px;border-radius:8px;background:#131313;border:1px solid #2a2a2a;color:#f2f2f2;font-size:13px;cursor:pointer;font-family:inherit'>"
            +"<span style='color:#4fa8ff'>📄</span> "+parentName+"/"+fname
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
  // OBS: BILDER_PARENT_FOLDER_ID är manuellt angiven av Blå (inte app-skapad) — samma
  // typ av mapp som tidigare orsakade 403-fel på ALLA Drive-anrop mot den, eftersom
  // drive.file-behörigheten bara garanterat ger åtkomst till mappar appen själv skapat.
  // Om detta 403:ar är det den kända, redan diagnostiserade begränsningen - inte en ny bugg.
  var bilderId=await driveMkdir("Bilder",BILDER_PARENT_FOLDER_ID);
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
  var displayPath=def.join("/")+"/"+jsonFileNameFor(path);
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
          // Första sparningen någonsin till den här sökvägen - filen finns
          // förstås inte än. Skapa den tyst istället för att fråga användaren.
          id=await driveEnsureFile(path);
        } else {
          throw e;
        }
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
      catch(e){
        if(e.message&&e.message.startsWith("FIL_SAKNAS:")){id=await driveEnsureFile(path);}
        else{showDriveWriteError(path,e.message,data);return;}
      }
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
  var displayPath=def.join("/")+"/"+jsonFileNameFor(path);
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
  } else if(tabName==="inmatningar"){
    if(da){
      if(da.aktivitetHistory)aktivitetHistory=da.aktivitetHistory;
      if(da.platsHistory)platsHistory=da.platsHistory;
      if(da.anteckningHistory)anteckningHistory=da.anteckningHistory;
      if(da.anteckningByCat)ANTECKNING_BY_CAT=da.anteckningByCat;
      migrateAnteckningByCatOnce();
      // actPresetsByCat/placePresetsByCat borttagna härifrån - Aktivitet-fliken äger
      // och sparar dem numera själv (egen driveWriteJson-fil), se HANDOFF från Aktivitet.
      if(da.mediaCreatorByCat)MEDIA_CREATOR_BY_CAT=da.mediaCreatorByCat;
      if(da.mediaGenreByCat)MEDIA_GENRE_BY_CAT=da.mediaGenreByCat;
      if(da.objMakerByCat)OBJ_MAKER_BY_CAT=da.objMakerByCat;
      if(da.platsKommunByCat)PLATS_KOMMUN_BY_CAT=da.platsKommunByCat;
      // tipsTricksSubcatByCat/anteckningSubcatByCat borttaget härifrån - Notering-fliken
      // äger och sparar det numera själv, se HANDOFF från Notering.
      migrateCatPresetsOnce();
    }
  } else if(tabName==="installningar"){
    if(da){
      if(da.placePresets)PLACE_PRESETS=da.placePresets;
      if(da.actPresets)ACT_PRESETS=da.actPresets;
      if(da.catPresets)CAT_PRESETS=da.catPresets;
      if(da.fundCatPresets)FUND_CAT_PRESETS=da.fundCatPresets;
      // tipsTricksCatPresets/anteckningCatPresets borttaget härifrån - se ovan.
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
    } else if(tabName==="inmatningar"){
      applyTabData(tabName,await driveRead("Installningar/Inmatningar"));
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
    }else if(tabName==="inmatningar"){
      var d=await driveRead("Installningar/Inmatningar");
      if(d){
        aktivitetHistory=mergeStringArraysDedup(aktivitetHistory,d.aktivitetHistory);
        platsHistory=mergeStringArraysDedup(platsHistory,d.platsHistory);
        anteckningHistory=mergeStringArraysDedup(anteckningHistory,d.anteckningHistory);
        ANTECKNING_BY_CAT=mergeCatStringDict(ANTECKNING_BY_CAT,d.anteckningByCat);
        // actPresetsByCat/placePresetsByCat borttagna härifrån - se ovan.
        // tipsTricksSubcatByCat/anteckningSubcatByCat borttaget härifrån - se ovan.
        MEDIA_CREATOR_BY_CAT=mergeCatStringDict(MEDIA_CREATOR_BY_CAT,d.mediaCreatorByCat);
        MEDIA_GENRE_BY_CAT=mergeCatStringDict(MEDIA_GENRE_BY_CAT,d.mediaGenreByCat);
        OBJ_MAKER_BY_CAT=mergeCatStringDict(OBJ_MAKER_BY_CAT,d.objMakerByCat);
        PLATS_KOMMUN_BY_CAT=mergeCatStringDict(PLATS_KOMMUN_BY_CAT,d.platsKommunByCat);
      }
    }else if(tabName==="installningar"){
      var d=await driveRead("Installningar");
      if(d){
        if(d.placePresets)PLACE_PRESETS=mergeStringArraysDedup(PLACE_PRESETS,d.placePresets);
        if(d.actPresets)ACT_PRESETS=mergeStringArraysDedup(ACT_PRESETS,d.actPresets);
        if(d.catPresets)CAT_PRESETS=mergeStringArraysDedup(CAT_PRESETS,d.catPresets);
        if(d.fundCatPresets)FUND_CAT_PRESETS=mergeStringArraysDedup(FUND_CAT_PRESETS,d.fundCatPresets);
        // tipsTricksCatPresets/anteckningCatPresets borttaget härifrån - se ovan.
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
  else if(tabName==="inmatningar"){await driveWrite("Installningar/Inmatningar",{aktivitetHistory:aktivitetHistory,platsHistory:platsHistory,anteckningHistory:anteckningHistory,anteckningByCat:ANTECKNING_BY_CAT,mediaCreatorByCat:MEDIA_CREATOR_BY_CAT,mediaGenreByCat:MEDIA_GENRE_BY_CAT,objMakerByCat:OBJ_MAKER_BY_CAT,platsKommunByCat:PLATS_KOMMUN_BY_CAT});}
  // "bilder" skriver ingen egen JSON-fil längre - bilderna sparas redan som riktiga
  // filer i Bilder-mappen under Aktivitet, ingen separat indexfil behövs.
  // "skamt" (Konversation) skriver inte längre via denna delade väg - se HANDOFF_generic_drive_api.md.
  else if(tabName==="installningar"){
    await driveWrite("Installningar",{
      placePresets:PLACE_PRESETS,
      actPresets:ACT_PRESETS,
      catPresets:CAT_PRESETS,
      fundCatPresets:FUND_CAT_PRESETS,
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
// Namnbytta enligt Notering-flikens uppdaterade namngivning (tidigare TIPSTRICKS_*,
// eftersom "Tips & Tricks" döptes om till "Anteckning" för länge sedan men variabel-
// namnen aldrig hann bytas). notering.js refererar nu ANTECKNING_CAT_PRESETS/
// ANTECKNING_SUBCAT_BY_CAT direkt - måste finnas deklarerade här under exakt dessa namn.
var ANTECKNING_CAT_PRESETS=[];
var ANTECKNING_SUBCAT_BY_CAT={};

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
// konversationer/muntKonversationer hör konceptuellt till Samtal-fliken (samtal.js, för
// närvarande vilande/inte laddad) men buildContext()/mergeData() i core.js läser dem ändå.
// Måste finnas deklarerade här oavsett om samtal.js är laddad, annars kraschar aiCall/
// aiChat (ReferenceError) för ALLA flikar som anropar dem - bekräftat av Sökbar-chatten.
var konversationer=[], muntKonversationer=[];
// kunskapHist hör till Notering-fliken (notering.js, för närvarande vilande) men den
// delade pinChatToKunskap()-funktionen (används av sokbar.js och andra flikars
// AI-resultat) skriver till den ändå. Måste finnas deklarerad oavsett om notering.js
// är laddad, annars kraschar "spara till Kunskap"-knappen (ReferenceError).
var kunskapHist=[];
// Fritt inmatade värden (för autoifyllnadsförslag i Plats/Aktivitet/Anteckning på Aktivitet-fliken)
var aktivitetHistory=[], platsHistory=[], anteckningHistory=[];
// Nytt kategori-specifikt förslag för Anteckning (Aktivitet)
var ANTECKNING_BY_CAT={};
// Dessa fem hör konceptuellt till Betyg-fliken (betyg.js, för närvarande vilande/inte
// laddad) men core.js läser/skriver dem ändå i sin delade "inmatningar"/"installningar"-
// hantering. Måste finnas deklarerade här oavsett om betyg.js är laddad, annars kraschar
// core.js (ReferenceError) första gången den koden körs. Samma standardvärden som i
// betyg.js, så det blir sömlöst den dagen betyg.js aktiveras igen.
var MEDIA_CAT_PRESETS=["📚 Bok","🎵 Musik","🎬 Film","📺 Serie","🎙️ Podcast","📹 Videodelning","🎮 Spel","✨ Övrigt"];
// mediaList/mediaFardig hör till Betyg-fliken (betyg.js, för närvarande vilande) men
// mergeData()/syncNow() i core.js läser/skriver dem ändå. Måste finnas deklarerade
// oavsett om betyg.js är laddad, annars kraschar synk-knappen i Installningar.
var mediaList={},mediaFardig=[];
var OBJ_CAT_PRESETS=[];
var OBJ_MAKER_BY_CAT={};
var PLATS_CAT_PRESETS=[];
var PLATS_KOMMUN_BY_CAT={};
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
  else if(view==="utvarderingar")renderUtvarderingarTop();
  else if(view==="history")renderHistory();
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
