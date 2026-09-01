// SOKBAR.JS (fd dictbar.js, kortvarigt sökrad.js/sökbar.js) — sökrutorna längst ner ("dict-bar"), synliga på alla flikar samtidigt.
// Två sökfunktioner: Sök (förklara text/bild/fil) och Ord (synonymer/ordbok).
// Beroenden: core.js (esc, aiCall, aiChat, aiText, extractJsonObject, chatContinuationHtml,
// bindChatContinuation, driveReadJson, driveWriteJson, driveGetOrCreateFileId, accessToken).
// Laddas EFTER core.js.
//
// NYTT (2026-08-30): pin-knapparna (📌K "Spara till Kunskap" och 📌V "Spara till
// Vokabulär") är borttagna på Blås begäran, tills vidare. Anledning: 📌V:s
// saveAndSync("vokabular")-anrop var redan trasigt (no-op) efter core.js:s nya
// Drive-arkitektur, och fokus just nu är att få sökbaren att fungera, inte sparande.
// dictChat/synChat lever kvar som vanligt (används av "fortsätt konversationen").
//
// NYTT (enligt HANDOFF_sokrutor från huvudet): sökradens HTML-markup ligger inte
// längre i index.html. Den byggs och läggs till i document.body av injectSokbarMarkup()
// nedan, som körs direkt när filen laddas. Ändras layouten på sökraden, gör det HÄR —
// index.html behöver bara en script-tagg som pekar på js/sokbar.js, inget annat.
//
// NYTT (2026-08-30): "Läshjälp" - en knapp till höger om Ord-fältet som öppnar ett eget
// overlay-fönster (översättning + ett eget ordboks-uppslag), byggt för att gå att
// använda helt via tangentbord (se initLashjalp() längre ner: fokus-fälla, Escape
// stänger, fokus återgår till knappen). All CSS för overlayet injiceras av samma IIFE
// nedan (rör inte styles.css, som ägs av huvudet) - se lashjalpCss.
//
// NYTT (2026-08-30, sent): på Blås begäran - (1) tydligare text-bekräftelse ("✓
// Sparat"/"⚠ Kunde inte spara") istället för bara en ikon vid alla 📌-sparningar,
// se flash() i lashjalpPinEntry(); (2) 👓-genvägsknapp till vänster om 📖 som går
// rakt till historikvyn (openLashjalpHistoryDirect()); (3) Läshjälps översättning har
// nu fria textfält för Från/Till istället för en fast dropdown (tomt Från = AI:n
// identifierar själv, tomt Till = svenska), och sparar/visar källspråket i
// oversattning.json (se lashjalpTranslate()/loadLashjalpHistory()).
//
// NYTT (2026-08-30, ännu senare): historikvyn (📋/👓) har nu ✏️ Redigera och ✕ Ta
// bort på varje sparad post. Redigering byter kortet till ett formulär inline (samma
// post, samma plats i listan) och skriver hela listan tillbaka med driveWriteJson.
// Borttagning kräver två klick (första klicket byter ✕ till "Ta bort?" i tre
// sekunder, andra klicket inom den tiden bekräftar) istället för webbläsarens
// window.confirm(), som skulle blockera sidan och inte passar en tangentbords-först-
// design. Se lashjalpHistoryItems/lashjalpHistoryKey + renderLashjalpHistoryList()
// och grannfunktionerna längre ner.
//
// NYTT (2026-08-31): (1) 📚-knapp bredvid 📌 på Läshjälps översättningsresultat -
// fyller i den översatta texten i Ordbok/synonymer-fältet och söker direkt, se
// lashjalpLookupTranslatedInOrdbok(). (2) Klick UTANFÖR historik-rutan (📋/👓) stänger
// nu ner hela Läshjälp istället för att landa på huvudpanelen (Escape/✕ Stäng gör
// fortfarande det senare, oförändrat) - se closeLashjalpHistoryToOutsideClick().
// (3) Ny 🤖-knapp längst till vänster i sökraden öppnar ett fristående AI-chat-fönster
// (samma tangentbords-mönster som Läshjälp, men INTE en syskon-panel till något -
// stängs helt via klick utanför/Escape/✕), med egen bild-/filbifogning och kamera.
// Se "---- AI-chat ----"-blocket och initAiChat() längre ner.
//
// NYTT (2026-08-31, sökraden på mobil gick ihop - se Blås skärmdump): (1) bild-/
// filuppladdning (📁/📷) borttaget från sökraden helt - finns redan i AI-chatten, och
// tog för mycket plats på smala skärmar. searchDictionaryImage/searchDictionaryTextFile
// och all kamera-kod för dict-baren är borttagna i samma veva (använd AI-chattens
// bifogning/kamera istället). (2) 👓 (genväg till sparade sökningar) och 📖 (Läshjälp)
// är slagna ihop till EN knapp med en "dropup"-meny (samma idé som en dropdown, fast
// öppnas uppåt eftersom knappen sitter längst ner på skärmen) - se
// "---- Läshjälp/historik: dropup-meny ----"-blocket och initLashjalpDropup() nedan.
// Själva knapparna (id lashjalpBtn/lashjalpHistoryShortcutBtn) och deras onclick-
// bindning i initLashjalp() är oförändrade, de ligger bara inuti menyn nu istället för
// direkt i raden.
//
// NYTT (2026-08-31, ännu mer): (1) Sparade sökningar-korten är kompaktare - redigera/
// ta bort ligger nu på SAMMA rad som titeln (istället för en egen rad ovanför), och
// titeln är ljusare/större (var(--text-bright), 14.5px) för att synas bättre - se
// lashjalpHistoryItemHtml(). (2) AI-chatten har fått: ett textfält för att välja vilken
// roll/personlighet AI:n ska anta (skickas med i systemprompten, se aiChatSend()); ✏️/✕
// på varje meddelande i konversationen (aiChatEnterEditMessage()/aiChatDeleteMessage()).
// (Den var 2026-08-31 kort tid utrustad med en 📌/📂-funktion för att pinna/bläddra bland
// HELA sparade AI-chatt-konversationer i ai.json - den är borttagen igen, se nästa post.)
//
// NYTT (2026-09-01): AI-chatten läser nu automatiskt bakgrundsinformation ur sok.json/
// ord.json/oversattning.json (AI-genererade korta sammanfattningar, cachas i ai.json)
// och skickar med det i systemprompten på varje meddelande - svaren kan då bli mer
// personligt anpassade utan att man behöver berätta allt själv. Se "AI-chat:
// bakgrundskontext"-blocket (aiChatRefreshBackgroundContext()/aiChatSummarizeFile())
// längre ner. Detta ersatte 📌/📂-funktionen ovan, som togs bort på Blås begäran eftersom
// ai.json-namnet behövdes till den här cachen istället.

var LASHJALP_CSS = ""
  +".lashjalp-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:300;display:none;align-items:flex-start;justify-content:center;padding:40px 16px;overflow-y:auto;}"
  +".lashjalp-panel{background:var(--bg-panel);border:1px solid var(--border);border-radius:10px;max-width:640px;width:100%;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,0.5);}"
  +".lashjalp-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}"
  +".lashjalp-header .note-label{margin:0;font-size:13px;}"
  +".lashjalp-hint{color:var(--sub);font-size:11px;font-family:'JetBrains Mono',monospace;margin:-10px 0 16px;}"
  +".lashjalp-section{margin-bottom:22px;}"
  +".lashjalp-section:last-child{margin-bottom:0;}"
  +".lashjalp-row{display:flex;gap:8px;margin-bottom:8px;align-items:stretch;}"
  +".lashjalp-row textarea{flex:1;min-height:70px;padding:10px 12px;border-radius:5px;background:var(--bg-alt);border:1px solid var(--border);color:var(--text-bright);font-family:'JetBrains Mono',monospace;font-size:13px;resize:vertical;outline:none;}"
  +".lashjalp-row input[type=text]{flex:1;min-width:0;padding:10px 12px;border-radius:5px;background:var(--bg-alt);border:1px solid var(--border);color:var(--text-bright);font-family:'JetBrains Mono',monospace;font-size:13px;outline:none;}"
  +".lashjalp-row select{padding:8px 10px;border-radius:5px;background:var(--bg-alt);border:1px solid var(--border);color:var(--text-bright);font-family:'JetBrains Mono',monospace;font-size:12.5px;outline:none;}"
  +".lashjalp-row textarea:focus,.lashjalp-row input:focus,.lashjalp-row select:focus{border-color:var(--main);}"
  +".lashjalp-result{background:var(--bg-alt);border:1px solid var(--border);border-radius:6px;padding:12px 14px;color:var(--text);font-size:13.5px;min-height:20px;}"
  +".lashjalp-result:empty{display:none;}"
  +"#lashjalpCloseBtn:focus,#lashjalpBtn:focus,#lashjalpTransBtn:focus,#lashjalpOrdBtn:focus,"
  +"#lashjalpSettingsBtn:focus,#lashjalpSettingsCloseBtn:focus,#lashjalpSettingsCancelBtn:focus,#lashjalpSettingsSaveBtn:focus,"
  +"#lashjalpHistoryBtn:focus,#lashjalpHistoryCloseBtn:focus,#lashjalpHistoryShortcutBtn:focus,#lashjalpDropupToggleBtn:focus,"
  +"#aiChatBtn:focus,#aiChatCloseBtn:focus,#aiChatSendBtn:focus,#aiChatCameraBtn:focus,#aiChatSnapBtn:focus,#aiChatCloseCameraBtn:focus,"
  +"#aiChatPersonaInput:focus,#aiChatSettingsBtn:focus,#lashjalpSettingsAiCommentAddBtn:focus"
  +"{outline:2px solid var(--main);outline-offset:2px;}"
  +".ai-chat-messages{max-height:340px;overflow-y:auto;margin-bottom:10px;}"
  +".ai-chat-attach-preview{display:flex;align-items:center;margin-bottom:8px;}"
  +".ai-chat-msg-row{display:flex;flex-direction:column;margin-bottom:8px;}"
  +".ai-chat-msg-actions{display:flex;gap:4px;margin-top:2px;}"
  +".ai-chat-msg-edit-btn,.ai-chat-msg-delete-btn{background:none;border:1px solid var(--border);border-radius:4px;color:var(--sub);cursor:pointer;font-family:inherit;font-size:10.5px;padding:1px 6px;line-height:1.6;}"
  +".ai-chat-msg-edit-btn:hover,.ai-chat-msg-delete-btn:hover{color:var(--text);border-color:var(--main);}"
  +".ai-chat-msg-edit-btn:focus,.ai-chat-msg-delete-btn:focus,.ai-chat-msg-save-btn:focus,.ai-chat-msg-cancel-btn:focus{outline:2px solid var(--main);outline-offset:2px;}"
  +".ai-chat-msg-edit-area{width:100%;max-width:320px;box-sizing:border-box;padding:8px 10px;border-radius:5px;background:var(--bg-alt);border:1px solid var(--border);color:var(--text-bright);font-family:'JetBrains Mono',monospace;font-size:12.5px;resize:vertical;outline:none;}"
  +".ai-chat-msg-edit-area:focus{border-color:var(--main);}"
  +".ai-chat-msg-edit-actions{display:flex;gap:8px;margin-top:4px;}"
  +".ai-chat-msg-edit-actions .action-btn,.ai-chat-msg-edit-actions .abtn{padding:6px 14px;font-size:12.5px;}"
  +".lashjalp-panel .abtn{padding:8px 18px;}"
  +".lashjalp-dropup{position:relative;}"
  +".lashjalp-dropup-menu{display:none;position:absolute;bottom:calc(100% + 6px);right:0;background:var(--bg-panel);border:1px solid var(--border);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.45);min-width:190px;flex-direction:column;padding:4px;z-index:60;}"
  +".lashjalp-dropup-item{background:none;border:none;color:var(--text);text-align:left;padding:8px 10px;border-radius:5px;font-family:inherit;font-size:12.5px;cursor:pointer;white-space:nowrap;}"
  +".lashjalp-dropup-item:hover,.lashjalp-dropup-item:focus{background:var(--bg-alt);outline:none;}"
  +".lashjalp-history-item{background:var(--bg-alt);border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:13px;color:var(--text);}"
  +".lashjalp-history-header-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;}"
  +".lashjalp-history-title{color:var(--text-bright);font-size:14.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;}"
  +".lashjalp-history-item .lashjalp-history-a{color:var(--text);}"
  +".lashjalp-history-item .lashjalp-history-lang{color:var(--sub);font-size:11px;margin-top:4px;font-style:italic;}"
  +".lashjalp-history-item .lashjalp-history-time{color:var(--sub);font-size:10.5px;margin-top:4px;font-family:'JetBrains Mono',monospace;}"
  +".lashjalp-history-actions{display:flex;gap:4px;flex:0 0 auto;}"
  +".lashjalp-history-edit-btn,.lashjalp-history-delete-btn{background:none;border:1px solid var(--border);border-radius:4px;color:var(--sub);cursor:pointer;font-family:inherit;font-size:11.5px;padding:2px 8px;line-height:1.6;}"
  +".lashjalp-history-edit-btn:hover,.lashjalp-history-delete-btn:hover{color:var(--text);border-color:var(--main);}"
  +".lashjalp-history-delete-btn[data-confirm=\"1\"]{color:var(--error);border-color:var(--error);}"
  +".lashjalp-history-edit-btn:focus,.lashjalp-history-delete-btn:focus,.lashjalp-history-save-btn:focus,.lashjalp-history-cancel-btn:focus{outline:2px solid var(--main);outline-offset:2px;}"
  +".lashjalp-history-edit-row{margin-bottom:6px;}"
  +".lashjalp-history-edit-row textarea{width:100%;box-sizing:border-box;padding:8px 10px;border-radius:5px;background:var(--bg-panel);border:1px solid var(--border);color:var(--text-bright);font-family:'JetBrains Mono',monospace;font-size:12.5px;resize:vertical;outline:none;}"
  +".lashjalp-history-edit-row-inline{display:flex;gap:8px;}"
  +".lashjalp-history-edit-row-inline input{flex:1;min-width:0;box-sizing:border-box;padding:8px 10px;border-radius:5px;background:var(--bg-panel);border:1px solid var(--border);color:var(--text-bright);font-family:'JetBrains Mono',monospace;font-size:12.5px;outline:none;}"
  +".lashjalp-history-edit-row textarea:focus,.lashjalp-history-edit-row-inline input:focus{border-color:var(--main);}"
  +".lashjalp-history-edit-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:4px;}"
  +".lashjalp-history-edit-actions .action-btn,.lashjalp-history-edit-actions .abtn{padding:6px 14px;font-size:12.5px;}";

(function injectSokbarMarkup(){
  // Skydd mot dubblett-injektion om index.html av misstag ändå har kvar markupen.
  if(document.getElementById("dictInput"))return;

  if(!document.getElementById("lashjalpStyle")){
    var styleEl=document.createElement("style");
    styleEl.id="lashjalpStyle";
    styleEl.textContent=LASHJALP_CSS;
    document.head.appendChild(styleEl);
  }

  var html=''
    +'<div class="dict-bar">'
    +'<div class="dict-result" id="dictResult"></div>'
    +'<div class="dict-result" id="synResult"></div>'
    +'<div class="dict-combined-row">'
    +'<div class="dict-input-row dict-row-ai" style="flex:0 0 auto;margin-right:10px">'
    +'<button class="action-btn" id="aiChatBtn" type="button" title="AI-chat: ha en konversation med AI, bifoga bild eller fil">🤖</button>'
    +'</div>'
    +'<div class="dict-input-row dict-row-main" style="flex:1 1 60px">'
    +'<input type="text" id="dictInput" placeholder="Sök">'
    +'<button class="action-btn" id="dictSpellBtn" type="button" title="Stavningskontroll">🔤</button>'
    +'</div>'
    +'<div class="dict-input-row dict-row-small" style="flex:0 1 170px;min-width:130px">'
    +'<input type="text" id="synInput" placeholder="Ord">'
    +'<div class="lashjalp-dropup" id="lashjalpDropupWrap">'
    +'<button class="action-btn" id="lashjalpDropupToggleBtn" type="button" title="Läshjälp / Sparade sökningar" aria-haspopup="true" aria-expanded="false" style="padding:6px 12px;font-size:11.5px;flex:0 0 auto">📖 ▾</button>'
    +'<div class="lashjalp-dropup-menu" id="lashjalpDropupMenu" role="menu">'
    +'<button type="button" class="lashjalp-dropup-item" id="lashjalpBtn" role="menuitem">📖 Läshjälp</button>'
    +'<button type="button" class="lashjalp-dropup-item" id="lashjalpHistoryShortcutBtn" role="menuitem">👓 Sparade sökningar</button>'
    +'</div>'
    +'</div>'
    +'</div>'
    +'</div>'
    +'</div>'
    +'<div class="lashjalp-overlay" id="lashjalpOverlay" role="dialog" aria-modal="true" aria-labelledby="lashjalpTitle">'
    +'<div class="lashjalp-panel">'
    +'<div class="lashjalp-header">'
    +'<span class="note-label" id="lashjalpTitle">📖 Läshjälp</span>'
    +'<div style="display:flex;gap:6px">'
    +'<button type="button" id="lashjalpHistoryBtn" class="action-btn" title="Visa sparade sökningar (📌-knapparna)">📋</button>'
    +'<button type="button" id="lashjalpSettingsBtn" class="action-btn" title="Inställningar: läs/redigera sparade sökningar (sok.json/ord.json/oversattning.json)">⚙️</button>'
    +'<button type="button" id="lashjalpCloseBtn" class="action-btn" title="Stäng (Esc)">✕ Stäng</button>'
    +'</div>'
    +'</div>'
    +'<div class="lashjalp-hint">Tab/Skift+Tab för att flytta dig, Esc för att stänga.</div>'
    +'<div class="lashjalp-section">'
    +'<div class="lbl">Översättning</div>'
    +'<div class="lashjalp-row">'
    +'<textarea id="lashjalpTransInput" placeholder="Text att översätta (Enter för att översätta, Skift+Enter för radbrytning)" rows="3"></textarea>'
    +'</div>'
    +'<div class="lashjalp-row">'
    +'<input type="text" id="lashjalpTransFromInput" placeholder="Från (t.ex. engelska) - tomt = identifieras automatiskt">'
    +'<input type="text" id="lashjalpTransToInput" placeholder="Till (tomt = svenska)">'
    +'</div>'
    +'<div class="lashjalp-row">'
    +'<button type="button" id="lashjalpTransBtn" class="action-btn">Översätt</button>'
    +'</div>'
    +'<div class="lashjalp-result" id="lashjalpTransResult"></div>'
    +'</div>'
    +'<div class="lashjalp-section">'
    +'<div class="lbl">Ordbok / synonymer</div>'
    +'<div class="lashjalp-row">'
    +'<input type="text" id="lashjalpOrdInput" placeholder="Ord (Enter för att söka)">'
    +'<button type="button" id="lashjalpOrdBtn" class="action-btn">Sök</button>'
    +'</div>'
    +'<div class="lashjalp-result" id="lashjalpOrdResult"></div>'
    +'</div>'
    +'</div>'
    +'</div>'
    +'<div class="lashjalp-overlay" id="lashjalpSettingsOverlay" role="dialog" aria-modal="true" aria-labelledby="lashjalpSettingsTitle">'
    +'<div class="lashjalp-panel">'
    +'<div class="lashjalp-header">'
    +'<span class="note-label" id="lashjalpSettingsTitle">⚙️ Läshjälp — sparad data</span>'
    +'<button type="button" id="lashjalpSettingsCloseBtn" class="action-btn" title="Stäng (Esc)">✕ Stäng</button>'
    +'</div>'
    +'<div class="lashjalp-hint">Tab/Skift+Tab för att flytta dig, Esc för att stänga.</div>'
    +'<div class="lashjalp-section">'
    +'<div class="lbl">Fil</div>'
    +'<div class="lashjalp-row">'
    +'<select id="lashjalpSettingsFileSelect">'
    +'<option value="sok">Sök (sok.json)</option>'
    +'<option value="ord">Ord (ord.json)</option>'
    +'<option value="oversattning">Översättning (oversattning.json)</option>'
    +'<option value="ai">AI-chattens bakgrundskontext (ai.json)</option>'
    +'</select>'
    +'</div>'
    +'<div class="lashjalp-hint" id="lashjalpSettingsStatus" style="margin:0 0 10px"></div>'
    +'<div class="lashjalp-row" id="lashjalpSettingsAiCommentRow" style="display:none">'
    +'<input type="text" id="lashjalpSettingsAiCommentInput" placeholder="Lägg till en kommentar (hamnar högst upp i ai.json - redigera/ta bort direkt i JSON-texten nedan)">'
    +'<button type="button" id="lashjalpSettingsAiCommentAddBtn" class="action-btn">Lägg till</button>'
    +'</div>'
    +'<div class="lashjalp-row">'
    +'<textarea id="lashjalpSettingsJsonArea" rows="12" style="min-height:260px" placeholder="Laddar …"></textarea>'
    +'</div>'
    +'<div id="lashjalpSettingsMsg" class="lashjalp-hint" style="margin:0"></div>'
    +'</div>'
    +'<div class="lashjalp-header" style="margin-top:4px;border-top:1px solid var(--border);padding-top:14px;margin-bottom:0">'
    +'<button type="button" id="lashjalpSettingsCancelBtn" class="action-btn">Avbryt</button>'
    +'<button type="button" id="lashjalpSettingsSaveBtn" class="abtn">Spara</button>'
    +'</div>'
    +'</div>'
    +'</div>'
    +'<div class="lashjalp-overlay" id="lashjalpHistoryOverlay" role="dialog" aria-modal="true" aria-labelledby="lashjalpHistoryTitle">'
    +'<div class="lashjalp-panel">'
    +'<div class="lashjalp-header">'
    +'<span class="note-label" id="lashjalpHistoryTitle">📋 Sparade sökningar</span>'
    +'<button type="button" id="lashjalpHistoryCloseBtn" class="action-btn" title="Stäng (Esc)">✕ Stäng</button>'
    +'</div>'
    +'<div class="lashjalp-hint">Tab/Skift+Tab för att flytta dig, Esc för att stänga.</div>'
    +'<div class="lashjalp-row">'
    +'<select id="lashjalpHistoryFileSelect">'
    +'<option value="sok">Sök (sok.json)</option>'
    +'<option value="ord">Ord (ord.json)</option>'
    +'<option value="oversattning">Översättning (oversattning.json)</option>'
    +'</select>'
    +'</div>'
    +'<div id="lashjalpHistoryList" style="max-height:50vh;overflow-y:auto;display:flex;flex-direction:column;gap:6px;margin-top:4px"></div>'
    +'</div>'
    +'</div>'
    +'<div class="lashjalp-overlay" id="aiChatOverlay" role="dialog" aria-modal="true" aria-labelledby="aiChatTitle">'
    +'<div class="lashjalp-panel">'
    +'<div class="lashjalp-header">'
    +'<span class="note-label" id="aiChatTitle">🤖 AI-chat</span>'
    +'<div style="display:flex;gap:6px">'
    +'<button type="button" id="aiChatSettingsBtn" class="action-btn" title="Inställningar: läs/redigera sparad data (sok.json/ord.json/oversattning.json/ai.json)">⚙️</button>'
    +'<button type="button" id="aiChatCloseBtn" class="action-btn" title="Stäng (Esc)">✕ Stäng</button>'
    +'</div>'
    +'</div>'
    +'<div class="lashjalp-hint">Tab/Skift+Tab för att flytta dig, Esc för att stänga. Använder automatiskt dina sparade sökningar/ord/översättningar som bakgrundsinformation.</div>'
    +'<div class="lashjalp-row" style="margin-bottom:10px">'
    +'<input type="text" id="aiChatPersonaInput" placeholder="Roll AI ska anta (t.ex. &quot;en historielärare&quot;) - valfritt">'
    +'</div>'
    +'<div id="aiChatMessages" class="ai-chat-messages"></div>'
    +'<div id="aiChatCameraContainer" style="display:none;margin:0 0 10px;">'
    +'<video id="aiChatCameraVideo" autoplay playsinline style="width:100%;border-radius:10px;max-height:220px;object-fit:cover;background:#000"></video>'
    +'<div style="display:flex;gap:8px;margin-top:8px">'
    +'<button id="aiChatSnapBtn" type="button" class="action-btn" style="flex:1">📸 Ta foto</button>'
    +'<button id="aiChatCloseCameraBtn" type="button" class="action-btn" style="color:var(--error)">✕</button>'
    +'</div>'
    +'</div>'
    +'<canvas id="aiChatSnapCanvas" style="display:none"></canvas>'
    +'<div id="aiChatAttachPreview" class="ai-chat-attach-preview" style="display:none"></div>'
    +'<div class="lashjalp-row">'
    +'<label class="action-btn" style="cursor:pointer" title="Bifoga bild eller fil">📁<input type="file" id="aiChatImgUpload" accept="image/*,.txt,.md,.csv,.json,text/plain" style="display:none"></label>'
    +'<button class="action-btn" id="aiChatCameraBtn" type="button" title="Ta bild">📷</button>'
    +'<input type="text" id="aiChatInput" placeholder="Skriv ett meddelande (Enter för att skicka)">'
    +'<button type="button" id="aiChatSendBtn" class="action-btn">Skicka</button>'
    +'</div>'
    +'</div>'
    +'</div>';
  document.body.insertAdjacentHTML("beforeend",html);
})();

// ---- Robust JSON-tolkning av AI-svar (lokalt i sokbar.js, rör inte core.js) ----
// Bakgrund (2026-08-30): Blå rapporterade att sökningen gav "Kunde inte tolka
// svaret, försök igen." Grundorsaken kunde jag inte se direkt (ingen tillgång till
// produktionens konsol/nätverkslogg), men core.js:s delade extractJsonObject()
// letar bara efter FÖRSTA "{" och SISTA "}" i hela svaret - det går sönder om
// förklaringstexten själv innehåller en klammer, eller (troligast) om svaret blir
// avklippt av max_tokens mitt i JSON-objektet, så sista tecknet aldrig blir "}".
// sokbarExtractBalancedJson räknar ihop matchande klamrar (hoppar över klamrar
// inuti citattecken) och ger null om den aldrig hittar ett komplett objekt, istället
// för att gissa fel. sokbarParseJsonReply används i alla tre AI-anropen nedan och
// faller tillbaka på core.js:s enklare extractJsonObject som sista utväg.
function sokbarExtractBalancedJson(text){
  text=String(text||"").replace(/```json|```/gi,"").trim();
  var start=text.indexOf("{");
  if(start===-1)return null;
  var depth=0,inStr=false,esc=false;
  for(var i=start;i<text.length;i++){
    var ch=text[i];
    if(inStr){
      if(esc){esc=false;continue;}
      if(ch==="\\"){esc=true;continue;}
      if(ch==='"')inStr=false;
      continue;
    }
    if(ch==='"'){inStr=true;continue;}
    if(ch==="{")depth++;
    else if(ch==="}"){
      depth--;
      if(depth===0)return text.slice(start,i+1);
    }
  }
  return null; // obalanserat - oftast ett svar avklippt av max_tokens
}
function sokbarParseJsonReply(rawText){
  var balanced=sokbarExtractBalancedJson(rawText);
  if(balanced){
    try{return JSON.parse(balanced);}catch(e){/* fortsätt till reservmetoden nedan */}
  }
  try{return JSON.parse(extractJsonObject(rawText));}catch(e){return null;}
}

// ---- Pinnat/sparat innehåll från Sök/Ord/Översättning, eget Drive-utrymme ----
// (2026-08-30, enligt Blås önskemål + HANDOFF_own_your_data.md/HANDOFF om
// inställningsmönstret från Aktivitet). Tre separata filer, en per källa, i en egen
// mapp "Sokruta" i den app-ägda rotmappen (samma mapp Blå länkade till - bekräftat
// tidigare att FOLDER_ID redan pekar dit). Byggt direkt på core.js:s generiska
// driveReadJson/driveWriteJson (INTE en egen hopskriven fetch-variant) - de skapar
// filen automatiskt om den saknas när man sparar, så ingen separat "Skapa fil"-knapp
// behövs för själva pin-flödet (däremot finns filstatus synlig i inställningspanelen,
// se lashjalpCheckFiles()).
var LASHJALP_FOLDER=["Sokruta"];
// ai.json bytte syfte 2026-09-01: låg tidigare kvar oanvänt i produktion (aldrig faktiskt
// skapat i Drive - filnamnet var ledigt) för en pinna-hela-AI-konversationen-funktion som
// togs bort igen på Blås begäran. Används nu istället som cache för AI-chattens
// bakgrundskontext - se "AI-chat: bakgrundskontext"-blocket längre ner.
var LASHJALP_FILES={sok:"sok.json",ord:"ord.json",oversattning:"oversattning.json",ai:"ai.json"};

// Delad pin-funktion: lägger till en post FÖRST i listan i angiven fil och sparar hela
// listan tillbaka. btnEl (valfri) får en tydlig text-bekräftelse ("✓ Sparat"/"⚠ Fel")
// istället för bara en ikon, enligt Blås önskemål om en synligare bekräftelse vid
// sparning av sökning/ord/översättning.
async function lashjalpPinEntry(fileName,entry,btnEl){
  function flash(ok){
    if(!btnEl)return;
    var orig=btnEl.textContent;
    btnEl.textContent=ok?"✓ Sparat":"⚠ Kunde inte spara";
    setTimeout(function(){btnEl.textContent=orig;},1800);
  }
  if(typeof accessToken==="undefined"||!accessToken){
    console.error("sokbar: kan inte spara pin till "+fileName+" - inte inloggad");
    flash(false);
    return;
  }
  try{
    var data=await driveReadJson(LASHJALP_FOLDER,fileName);
    var items=(data&&Array.isArray(data.items))?data.items:[];
    items.unshift(entry);
    var ok=await driveWriteJson(LASHJALP_FOLDER,fileName,{items:items});
    flash(ok);
    if(!ok)console.error("sokbar: driveWriteJson misslyckades för "+fileName);
  }catch(err){
    console.error("sokbar: pin till "+fileName+" misslyckades",err);
    flash(false);
  }
}
function pinSokResult(btnEl){
  if(!dictChat||!dictChat.length)return;
  lashjalpPinEntry(LASHJALP_FILES.sok,{
    id:Date.now(),fraga:dictChat[0].content,svar:dictChat[dictChat.length-1].content,
    timestamp:new Date().toISOString()
  },btnEl);
}
function pinOrdResult(chat,btnEl){
  if(!chat||!chat.length)return;
  lashjalpPinEntry(LASHJALP_FILES.ord,{
    id:Date.now(),fraga:chat[0].content,svar:chat[chat.length-1].content,
    timestamp:new Date().toISOString()
  },btnEl);
}
// kallaSprak/tillSprak (2026-08-30, nytt): källspråket AI:n identifierade (eller det
// Blå skrev in själv) resp. målspråket - sparas med i oversattning.json och visas i
// historikvyn, se lashjalpTranslate() och loadLashjalpHistory().
function pinOversattningResult(kalla,oversattning,kallaSprak,tillSprak,btnEl){
  lashjalpPinEntry(LASHJALP_FILES.oversattning,{
    id:Date.now(),kalla:kalla,oversattning:oversattning,
    kallaSprak:kallaSprak||"",tillSprak:tillSprak||"svenska",
    timestamp:new Date().toISOString()
  },btnEl);
}

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
  var parsed=null,lastRawText="",lastErr=null;
  for(var attempt=0;attempt<2&&!parsed;attempt++){
    try{
      var res=await aiCall(sys,userMsg,1200);
      var data=await res.json();
      lastRawText=aiText(data);
      if(data&&data.error)throw new Error(typeof data.error==="string"?data.error:JSON.stringify(data.error));
      parsed=sokbarParseJsonReply(lastRawText);
    }catch(err){lastErr=err;parsed=null;}
  }
  if(!parsed){
    if(lastRawText&&lastRawText.trim()){
      // AI svarade med text men inte med giltig/komplett JSON (troligen avklippt av
      // max_tokens) - visa svaret rakt av istället för att strandsätta med ett tomt fel.
      console.error("sokbar: kunde inte tolka JSON-svaret från Sök, visar råtext istället",lastErr,lastRawText);
      dictChat=[{role:"user",content:"Förklara: \""+text+"\""},{role:"assistant",content:lastRawText}];
      dictHeaderHtml="<span class='note-label'>"+esc(text)+"</span>"
        +"<div style='margin:6px 0 10px;color:var(--text);font-size:13.5px'>"+esc(lastRawText)+"</div>";
      dictAiSystemPrompt="Du ar en pedagog. Fortsätt hjälpa personen bygga vidare på det ni just pratat om, svara med vanlig text.";
      renderDictResultBox();
      return;
    }
    console.error("sokbar: Sök fick inget svar alls från AI",lastErr);
    dictResult.innerHTML="<button class='dict-close' id='dictCloseBtn'>×</button>Kunde inte hämta ett svar, försök igen.";
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
  var parsed=null,lastRawText="",lastErr=null;
  for(var attempt=0;attempt<2&&!parsed;attempt++){
    try{
      var res=await aiCall(sys,userMsg,900);
      var data=await res.json();
      lastRawText=aiText(data);
      if(data&&data.error)throw new Error(typeof data.error==="string"?data.error:JSON.stringify(data.error));
      var p=sokbarParseJsonReply(lastRawText);
      if(p&&Array.isArray(p.misspellings))parsed=p;
    }catch(err){lastErr=err;parsed=null;}
  }
  if(!parsed){
    console.error("sokbar: kunde inte tolka JSON-svaret från stavningskontrollen",lastErr,lastRawText);
    dictResult.innerHTML="<button class='dict-close' id='dictCloseBtn'>×</button>"
      +"<span class='note-label'>Stavningskontroll</span>"
      +(lastRawText&&lastRawText.trim()
        ?"<div style='margin:6px 0 4px;color:var(--text);font-size:13.5px'>"+esc(lastRawText)+"</div>"
        :"<div style='margin:6px 0 4px;color:var(--text);font-size:13.5px'>Kunde inte hämta ett svar, försök igen.</div>");
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

// Delad rendering för sökresultat-rutan (text- eller filsökning) + "fortsätt konversationen".
// (Bild-/filuppladdning togs bort från sökraden 2026-08-31 - se AI-chatten istället, som
// redan har sin egen bifogning/kamera. searchDictionaryImage/searchDictionaryTextFile
// som tidigare låg här är borttagna i samma veva.)
var dictChat=null, dictHeaderHtml="", dictAiSystemPrompt="";
function renderDictResultBox(){
  var dictResult=document.getElementById("dictResult");
  if(!dictResult)return;
  dictResult.innerHTML="<button class='dict-close' id='dictCloseBtn'>×</button>"
    +"<button id='dict-pin-btn' title='Spara sökningen (sok.json)' style='position:absolute;top:10px;right:50px;background:none;border:none;color:var(--sub);cursor:pointer;font-family:inherit;font-size:13px;padding:2px 4px'>📌</button>"
    +dictHeaderHtml
    +chatContinuationHtml(dictChat,"dictai");
  document.getElementById("dictCloseBtn").onclick=function(){dictResult.classList.remove("visible");dictChat=null;};
  var dictPinBtn=dictResult.querySelector("#dict-pin-btn");
  if(dictPinBtn)dictPinBtn.onclick=function(){pinSokResult(dictPinBtn);};
  bindChatContinuation(dictResult,"dictai",dictAiSystemPrompt,function(){return dictChat;},renderDictResultBox);
}

// ---- Ordlista och Synonymer (mindre, egen ruta) - samma funktion som innan sammanslagningen ----
var synChat=null, synHeaderHtml="";
function renderSynResultBox(){
  var synResult=document.getElementById("synResult");
  if(!synResult)return;
  synResult.innerHTML="<button class='dict-close' id='synCloseBtn'>×</button>"
    +"<button id='syn-pin-btn' title='Spara sökningen (ord.json)' style='position:absolute;top:10px;right:50px;background:none;border:none;color:var(--sub);cursor:pointer;font-family:inherit;font-size:13px;padding:2px 4px'>📌</button>"
    +synHeaderHtml
    +chatContinuationHtml(synChat,"synai");
  document.getElementById("synCloseBtn").onclick=function(){synResult.classList.remove("visible");synChat=null;};
  var synPinBtn=synResult.querySelector("#syn-pin-btn");
  if(synPinBtn)synPinBtn.onclick=function(){pinOrdResult(synChat,synPinBtn);};
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
  var parsed=null,lastRawText="",lastErr=null;
  for(var attempt=0;attempt<2&&!parsed;attempt++){
    try{
      var res=await aiCall(sys,userMsg,1100);
      var data=await res.json();
      lastRawText=aiText(data);
      if(data&&data.error)throw new Error(typeof data.error==="string"?data.error:JSON.stringify(data.error));
      parsed=sokbarParseJsonReply(lastRawText);
    }catch(err){lastErr=err;parsed=null;}
  }
  if(!parsed){
    if(lastRawText&&lastRawText.trim()){
      console.error("sokbar: kunde inte tolka JSON-svaret från Ord, visar råtext istället",lastErr,lastRawText);
      synChat=[{role:"user",content:"Slå upp: \""+word+"\""},{role:"assistant",content:lastRawText}];
      synHeaderHtml="<span class='note-label'>"+esc(word)+"</span>"
        +"<div style='margin:6px 0 10px;color:var(--text);font-size:13.5px'>"+esc(lastRawText)+"</div>";
      renderSynResultBox();
      return;
    }
    console.error("sokbar: Ord fick inget svar alls från AI",lastErr);
    synResult.innerHTML="<button class='dict-close' id='synCloseBtn'>×</button>Kunde inte hämta ett svar, försök igen.";
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

// ---- Läshjälp: fristående overlay med översättning + eget ordboks-uppslag ----
// Öppnas av knappen till höger om Ord-fältet. Byggd för att navigeras helt via
// tangentbord: fokus flyttas in vid öppning, Tab/Skift+Tab hålls kvar inom fönstret
// (fokus-fälla) så den aldrig läcker ut till resten av sidan, Escape stänger och
// lämnar tillbaka fokus dit den kom ifrån. Se initLashjalp() för bindningarna.
var lashjalpLastFocus=null;

// ---- Läshjälp/historik: dropup-meny (📖 ▾) ----
// (2026-08-31) 👓 och 📖 var tidigare två separata knappar i sökradens smala rad, vilket
// på smala skärmar fick dem att flyta ihop (se Blås skärmdump). Nu är de EN knapp som
// öppnar en liten meny UPPÅT ("dropup" - samma idé som en dropdown, fast öppnas uppåt
// eftersom knappen sitter längst ner på skärmen, i sökraden). Menyknapparna har kvar
// sina gamla id:n (lashjalpBtn/lashjalpHistoryShortcutBtn) och onclick-bindning
// (openLashjalp/openLashjalpHistoryDirect, se initLashjalp() längre ner) - bara
// omslutningen runt dem är ny, se initLashjalpDropup().
function closeLashjalpDropup(){
  var menu=document.getElementById("lashjalpDropupMenu");
  var toggleBtn=document.getElementById("lashjalpDropupToggleBtn");
  if(menu)menu.style.display="none";
  if(toggleBtn)toggleBtn.setAttribute("aria-expanded","false");
}
function openLashjalpDropup(){
  var menu=document.getElementById("lashjalpDropupMenu");
  var toggleBtn=document.getElementById("lashjalpDropupToggleBtn");
  if(!menu)return;
  menu.style.display="flex";
  if(toggleBtn)toggleBtn.setAttribute("aria-expanded","true");
  var firstItem=menu.querySelector(".lashjalp-dropup-item");
  if(firstItem)firstItem.focus();
}
// Klickar man på 📖/👓 inuti dropup-menyn döljs menyn (display:none) direkt efteråt -
// att då spara document.activeElement rakt av (den dolda menyknappen) skulle göra att
// fokus INTE kan återställas dit när Läshjälp/historiken stängs (att fokusera ett dolt
// element fungerar inte tillförlitligt). Denna hjälpfunktion pekar om till den synliga
// dropup-knappen i så fall, annars beter den sig som document.activeElement som förut
// (t.ex. vid Tab-navigering rakt till knappen, utan att öppna menyn).
function lashjalpCaptureReturnFocus(){
  var active=document.activeElement;
  var dropupMenu=document.getElementById("lashjalpDropupMenu");
  if(dropupMenu&&dropupMenu.contains(active)){
    var toggleBtn=document.getElementById("lashjalpDropupToggleBtn");
    if(toggleBtn)return toggleBtn;
  }
  return active;
}
function initLashjalpDropup(){
  var toggleBtn=document.getElementById("lashjalpDropupToggleBtn");
  var menu=document.getElementById("lashjalpDropupMenu");
  var wrap=document.getElementById("lashjalpDropupWrap");
  if(!toggleBtn||!menu||!wrap)return;
  toggleBtn.onclick=function(){
    if(menu.style.display==="flex")closeLashjalpDropup();
    else openLashjalpDropup();
  };
  document.addEventListener("mousedown",function(e){
    if(menu.style.display==="flex"&&!wrap.contains(e.target))closeLashjalpDropup();
  });
  menu.addEventListener("keydown",function(e){
    if(e.key==="Escape"){
      e.preventDefault();
      closeLashjalpDropup();
      toggleBtn.focus();
    }
  });
}

function openLashjalp(){
  var overlay=document.getElementById("lashjalpOverlay");
  if(!overlay)return;
  lashjalpLastFocus=lashjalpCaptureReturnFocus();
  closeLashjalpDropup();
  overlay.style.display="flex";
  document.body.style.overflow="hidden";
  var firstField=document.getElementById("lashjalpTransInput");
  if(firstField)firstField.focus();
}
function closeLashjalp(){
  var overlay=document.getElementById("lashjalpOverlay");
  if(!overlay)return;
  overlay.style.display="none";
  document.body.style.overflow="";
  if(lashjalpLastFocus&&typeof lashjalpLastFocus.focus==="function")lashjalpLastFocus.focus();
  lashjalpLastFocus=null;
}

// ---- Läshjälp-inställningar: läs/redigera sok.json/ord.json/oversattning.json direkt ----
// (enligt HANDOFF_installningsmonster_fran_aktivitet.md - samma idé som Aktivitets egen
// JSON-redigerare, men byggd på core.js:s generiska driveReadJson/driveWriteJson istället
// för att kopiera Aktivitets handskrivna fetch-kod rakt av. FÖRENKLING jämfört med
// Aktivitets mönster: ingen separat "Skapa fil"-knapp per saknad fil - status visas i
// klartext (lashjalpCheckFiles) och driveWriteJson skapar filen automatiskt första gången
// man trycker Spara, vilket är säkert eftersom det är samma vetterade, delade funktion
// alla andra flikar redan litar på. Säg till om du hellre vill ha exakt samma
// knapp-per-fil-flöde som Aktivitet har, går att bygga om.
// Egen overlay (döljer/visar den overlay som öppnade den istället för att ligga kapslad
// i den) så att fokus-fällorna aldrig krockar - se openLashjalpSettings/
// closeLashjalpSettings. NYTT (2026-09-01): ⚙️ finns nu på TVÅ ställen (Läshjälp OCH
// AI-chatten, se aiChatSettingsBtn), så inställningspanelen måste komma ihåg vilken av
// de två den ska visa igen när den stängs - lashjalpSettingsReturnOverlayId/
// lashjalpSettingsReturnFocusId håller reda på det (skickas in av respektive ⚙️-knapps
// onclick, se initLashjalp()/initAiChat()).
var lashjalpSettingsReturnOverlayId="lashjalpOverlay";
var lashjalpSettingsReturnFocusId="lashjalpSettingsBtn";
function openLashjalpSettings(returnOverlayId,returnFocusId){
  var settingsOv=document.getElementById("lashjalpSettingsOverlay");
  if(!settingsOv)return;
  lashjalpSettingsReturnOverlayId=returnOverlayId||"lashjalpOverlay";
  lashjalpSettingsReturnFocusId=returnFocusId||"lashjalpSettingsBtn";
  var returnOv=document.getElementById(lashjalpSettingsReturnOverlayId);
  if(returnOv)returnOv.style.display="none";
  settingsOv.style.display="flex";
  var sel=document.getElementById("lashjalpSettingsFileSelect");
  if(sel)sel.focus();
  lashjalpCheckFiles();
  loadLashjalpSettingsFile();
}
function closeLashjalpSettings(){
  var settingsOv=document.getElementById("lashjalpSettingsOverlay");
  if(settingsOv)settingsOv.style.display="none";
  var returnOv=document.getElementById(lashjalpSettingsReturnOverlayId||"lashjalpOverlay");
  if(returnOv)returnOv.style.display="flex";
  var returnBtn=document.getElementById(lashjalpSettingsReturnFocusId||"lashjalpSettingsBtn");
  if(returnBtn)returnBtn.focus();
}
// Visar/döljer kommentar-fältet (bara relevant för ai.json, se
// lashjalpSettingsAddAiComment() längre ner) beroende på vilken fil som är vald.
function updateLashjalpSettingsAiCommentRow(){
  var sel=document.getElementById("lashjalpSettingsFileSelect");
  var row=document.getElementById("lashjalpSettingsAiCommentRow");
  if(!sel||!row)return;
  row.style.display=sel.value==="ai"?"flex":"none";
}
async function loadLashjalpSettingsFile(){
  var sel=document.getElementById("lashjalpSettingsFileSelect");
  var area=document.getElementById("lashjalpSettingsJsonArea");
  var msg=document.getElementById("lashjalpSettingsMsg");
  if(!sel||!area)return;
  if(msg)msg.textContent="";
  updateLashjalpSettingsAiCommentRow();
  if(typeof accessToken==="undefined"||!accessToken){
    area.value="{}";
    if(msg)msg.textContent="Inte inloggad - kan varken läsa eller spara just nu.";
    return;
  }
  var fileName=LASHJALP_FILES[sel.value];
  area.disabled=true;
  area.value="Laddar …";
  var data=await driveReadJson(LASHJALP_FOLDER,fileName);
  // ai.json ar inte en items-lista som de tre andra filerna, utan ett objekt (se
  // "AI-chat: bakgrundskontext"-blocket langre ner) - tomt fallback ar darfor {} for den,
  // {items:[]} for ovriga.
  var fallback=sel.value==="ai"?{}:{items:[]};
  area.value=JSON.stringify(data||fallback,null,2);
  area.disabled=false;
}
// Lägger till en kommentar ÖVERST i ai.json (via ett litet eget textfält, inte den stora
// JSON-textan) - en enkel, ångerfri väg att lägga till en anteckning utan att behöva
// skriva korrekt JSON-syntax för hand. AI:n rör ALDRIG detta fält (se
// aiChatRefreshBackgroundContext(), som bara skriver till cache.sok/ord/oversattning) -
// för att ändra eller ta bort en kommentar redigerar Blå ai.json direkt i den stora
// JSON-textan ovan, precis som hon bad om.
async function lashjalpSettingsAddAiComment(){
  var input=document.getElementById("lashjalpSettingsAiCommentInput");
  var msg=document.getElementById("lashjalpSettingsMsg");
  if(!input)return;
  var text=input.value.trim();
  if(!text)return;
  if(typeof accessToken==="undefined"||!accessToken){
    if(msg)msg.textContent="Inte inloggad - kan inte spara.";
    return;
  }
  if(msg)msg.textContent="Sparar kommentar …";
  var data=(await driveReadJson(LASHJALP_FOLDER,LASHJALP_FILES.ai))||{};
  var kommentarer=Array.isArray(data.kommentarer)?data.kommentarer:[];
  kommentarer.unshift({text:text,timestamp:new Date().toISOString()});
  // Bygg om objektet med "kommentarer" satt FÖRST, sen resten av de befintliga
  // fälten oförändrade - så kommentarerna hamnar högst upp när JSON:en skrivs ut.
  var rebuilt={kommentarer:kommentarer};
  for(var k in data){if(k!=="kommentarer")rebuilt[k]=data[k];}
  var ok=await driveWriteJson(LASHJALP_FOLDER,LASHJALP_FILES.ai,rebuilt);
  if(ok){
    input.value="";
    // loadLashjalpSettingsFile() nollställer lashjalpSettingsMsg direkt när den körs
    // (för att visa "Laddar …" korrekt i vanliga fallet) - vänta därför in den FÖRST,
    // annars hinner bekräftelsetexten aldrig synas.
    if(document.getElementById("lashjalpSettingsFileSelect").value==="ai")await loadLashjalpSettingsFile();
    if(msg)msg.textContent="✓ Kommentar tillagd.";
  } else {
    console.error("sokbar: kunde inte spara kommentar till ai.json");
    if(msg)msg.textContent="Kunde inte spara kommentaren, försök igen.";
  }
}
async function saveLashjalpSettingsFile(){
  var sel=document.getElementById("lashjalpSettingsFileSelect");
  var area=document.getElementById("lashjalpSettingsJsonArea");
  var msg=document.getElementById("lashjalpSettingsMsg");
  if(!sel||!area||!msg)return;
  if(typeof accessToken==="undefined"||!accessToken){
    msg.textContent="Inte inloggad - kan inte spara.";
    return;
  }
  var parsed;
  try{
    parsed=JSON.parse(area.value);
  }catch(e){
    msg.textContent="Ogiltig JSON - rätta till innan du sparar (fel: "+e.message+").";
    return;
  }
  var fileName=LASHJALP_FILES[sel.value];
  msg.textContent="Sparar …";
  var ok=await driveWriteJson(LASHJALP_FOLDER,fileName,parsed);
  msg.textContent=ok?"✓ Sparat.":"Kunde inte spara just nu (nätverksfel?), försök igen.";
  if(!ok)console.error("sokbar: kunde inte spara "+fileName+" via inställningspanelen");
  if(ok)lashjalpCheckFiles();
}
// Kollar (utan att skapa) om alla tre filerna redan finns i Sokruta-mappen, och visar
// det som en kort statusrad - motsvarar "listar de som saknas" i Aktivitets mönster,
// fast utan egna Skapa-knappar (se kommentar ovanför openLashjalpSettings).
async function lashjalpCheckFiles(){
  var statusEl=document.getElementById("lashjalpSettingsStatus");
  if(!statusEl)return;
  if(typeof accessToken==="undefined"||!accessToken){statusEl.textContent="";return;}
  statusEl.textContent="Kollar filer …";
  var lines=[];
  for(var key in LASHJALP_FILES){
    var fileName=LASHJALP_FILES[key];
    var id=null;
    try{id=await driveGetOrCreateFileId(LASHJALP_FOLDER,fileName,false);}catch(e){/* visas som saknad nedan */}
    lines.push((id?"✓ ":"— ")+fileName+(id?"":" (skapas automatiskt vid Spara)"));
  }
  statusEl.textContent=lines.join("  ·  ");
}

// ---- Läshjälp-historik: visa de sparade (📌:ade) sökningarna, läsbart - inte som råa JSON ----
// Skiljer sig från inställningspanelen ovan (⚙️) genom att den bara VISAR posterna som
// snygga kort (fråga/svar resp. källtext/översättning + tidsstämpel), inte redigerbar
// råtext. Egen overlay, samma syskon-mönster som lashjalpSettingsOverlay (döljer/visar
// lashjalpOverlay istället för att ligga kapslad i den) så fokus-fällorna aldrig krockar.
function openLashjalpHistory(){
  var lashjalpOv=document.getElementById("lashjalpOverlay");
  var historyOv=document.getElementById("lashjalpHistoryOverlay");
  if(!historyOv)return;
  if(lashjalpOv)lashjalpOv.style.display="none";
  historyOv.style.display="flex";
  var sel=document.getElementById("lashjalpHistoryFileSelect");
  if(sel)sel.focus();
  loadLashjalpHistory();
}
function closeLashjalpHistory(){
  var lashjalpOv=document.getElementById("lashjalpOverlay");
  var historyOv=document.getElementById("lashjalpHistoryOverlay");
  if(historyOv)historyOv.style.display="none";
  if(lashjalpOv)lashjalpOv.style.display="flex";
  var historyBtn=document.getElementById("lashjalpHistoryBtn");
  if(historyBtn)historyBtn.focus();
}
// NYTT (2026-08-31): klick UTANFÖR historik-rutan (på den mörka bakgrunden) ska stänga
// ner alltihop istället för att landa på Läshjälps huvudpanel (som closeLashjalpHistory()
// ovan gör - det beteendet gäller fortfarande Escape och ✕ Stäng, oförändrat). Döljer
// historik-overlayet och återanvänder closeLashjalp() för resten (den är redan dold via
// openLashjalpHistory()/openLashjalpHistoryDirect(), så closeLashjalp() bara nollställer
// body.style.overflow och lämnar tillbaka fokus dit hela Läshjälp-resan startade).
function closeLashjalpHistoryToOutsideClick(){
  var historyOv=document.getElementById("lashjalpHistoryOverlay");
  if(historyOv)historyOv.style.display="none";
  closeLashjalp();
}
// lashjalpHistoryItems/lashjalpHistoryKey håller den just nu inlästa listan/filen så att
// redigera/ta bort kan jobba mot den (och skriva tillbaka HELA listan) utan att läsa om
// från Drive för varje knapptryckning. Index i arrayen (inte item.id) används för att
// koppla ihop varje kort med sin post - enklare än att hantera citattecken/specialtecken
// i CSS-selektorer, och ordningen ändras aldrig mellan en omritning och nästa klick.
var lashjalpHistoryItems=[], lashjalpHistoryKey="";

async function loadLashjalpHistory(){
  var sel=document.getElementById("lashjalpHistoryFileSelect");
  var list=document.getElementById("lashjalpHistoryList");
  if(!sel||!list)return;
  lashjalpHistoryKey=sel.value;
  if(typeof accessToken==="undefined"||!accessToken){
    lashjalpHistoryItems=[];
    list.innerHTML="<div class='lashjalp-hint' style='margin:0'>Inte inloggad - kan inte visa sparade sökningar just nu.</div>";
    return;
  }
  var fileName=LASHJALP_FILES[lashjalpHistoryKey];
  list.innerHTML="<div class='lashjalp-hint' style='margin:0'>Laddar …</div>";
  var data=await driveReadJson(LASHJALP_FOLDER,fileName);
  lashjalpHistoryItems=(data&&Array.isArray(data.items))?data.items:[];
  renderLashjalpHistoryList();
}

function renderLashjalpHistoryList(){
  var list=document.getElementById("lashjalpHistoryList");
  if(!list)return;
  var items=lashjalpHistoryItems, key=lashjalpHistoryKey;
  if(!items.length){
    list.innerHTML="<div class='lashjalp-hint' style='margin:0'>Inga sparade sökningar än - tryck på 📌 vid ett resultat för att spara det hit.</div>";
    return;
  }
  list.innerHTML=items.map(function(item,idx){return lashjalpHistoryItemHtml(item,key,idx);}).join("");
  list.querySelectorAll(".lashjalp-history-edit-btn").forEach(function(btn){
    btn.onclick=function(){lashjalpHistoryEnterEdit(parseInt(btn.dataset.idx,10));};
  });
  list.querySelectorAll(".lashjalp-history-delete-btn").forEach(function(btn){
    btn.onclick=function(){lashjalpHistoryDeleteClick(btn);};
  });
}

// NYTT (2026-08-31): redigera/ta bort ligger nu på SAMMA rad som titeln (istället för
// en egen rad ovanför) för att göra korten mer kompakta, och titeln (frågan/sökordet)
// är ljusare och lite större (.lashjalp-history-title, var(--text-bright)) för att synas
// tydligare - se lashjalp_v2 osv. i tidigare skärmdumpar där den annars var svår att se.
function lashjalpHistoryItemHtml(item,key,idx){
  var timeStr="";
  try{if(item.timestamp)timeStr=new Date(item.timestamp).toLocaleString("sv-SE");}catch(e){/* strunta i tidsstämpeln om den inte går att tolka */}
  var titleText=key==="oversattning"?(item.kalla||""):(item.fraga||"");
  var headerRow="<div class='lashjalp-history-header-row'>"
    +"<span class='lashjalp-history-title' title=\""+esc(titleText)+"\">"+esc(titleText)+"</span>"
    +"<div class='lashjalp-history-actions'>"
    +"<button type='button' class='lashjalp-history-edit-btn' data-idx='"+idx+"' title='Redigera'>✏️</button>"
    +"<button type='button' class='lashjalp-history-delete-btn' data-idx='"+idx+"' title='Ta bort'>✕</button>"
    +"</div>"
    +"</div>";
  if(key==="oversattning"){
    var langLine="";
    if(item.kallaSprak||item.tillSprak){
      langLine="<div class='lashjalp-history-lang'>"+esc(item.kallaSprak||"okänt språk")+" → "+esc(item.tillSprak||"svenska")+"</div>";
    }
    return "<div class='lashjalp-history-item' data-idx='"+idx+"'>"
      +headerRow
      +langLine
      +"<div class='lashjalp-history-a'>"+esc(item.oversattning||"")+"</div>"
      +(timeStr?"<div class='lashjalp-history-time'>"+esc(timeStr)+"</div>":"")
      +"</div>";
  }
  return "<div class='lashjalp-history-item' data-idx='"+idx+"'>"
    +headerRow
    +"<div class='lashjalp-history-a'>"+esc(item.svar||"")+"</div>"
    +(timeStr?"<div class='lashjalp-history-time'>"+esc(timeStr)+"</div>":"")
    +"</div>";
}

// ✏️ Redigera byter ETT korts innehåll mot ett formulär inline (posten flyttas inte,
// resten av listan ritas inte om) - fälten skiljer sig åt beroende på vilken fil det
// gäller, precis som visningsläget ovan.
function lashjalpHistoryEditFormHtml(item,key){
  var actionsRow="<div class='lashjalp-history-edit-actions'>"
    +"<button type='button' class='action-btn lashjalp-history-cancel-btn'>Avbryt</button>"
    +"<button type='button' class='abtn lashjalp-history-save-btn'>Spara</button>"
    +"</div>";
  if(key==="oversattning"){
    return "<div class='lashjalp-history-edit-row'><textarea class='lje-kalla' rows='2' placeholder='Källtext'>"+esc(item.kalla||"")+"</textarea></div>"
      +"<div class='lashjalp-history-edit-row lashjalp-history-edit-row-inline'>"
      +"<input type='text' class='lje-kallasprak' placeholder='Källspråk' value=\""+esc(item.kallaSprak||"")+"\">"
      +"<input type='text' class='lje-tillsprak' placeholder='Målspråk' value=\""+esc(item.tillSprak||"svenska")+"\">"
      +"</div>"
      +"<div class='lashjalp-history-edit-row'><textarea class='lje-svar' rows='2' placeholder='Översättning'>"+esc(item.oversattning||"")+"</textarea></div>"
      +actionsRow;
  }
  return "<div class='lashjalp-history-edit-row'><textarea class='lje-fraga' rows='2' placeholder='Fråga/ord'>"+esc(item.fraga||"")+"</textarea></div>"
    +"<div class='lashjalp-history-edit-row'><textarea class='lje-svar' rows='3' placeholder='Svar'>"+esc(item.svar||"")+"</textarea></div>"
    +actionsRow;
}
function lashjalpHistoryEnterEdit(idx){
  var item=lashjalpHistoryItems[idx];
  var card=document.querySelector('.lashjalp-history-item[data-idx="'+idx+'"]');
  if(!item||!card)return;
  card.innerHTML=lashjalpHistoryEditFormHtml(item,lashjalpHistoryKey);
  var firstField=card.querySelector("textarea, input");
  if(firstField)firstField.focus();
  var saveBtn=card.querySelector(".lashjalp-history-save-btn");
  if(saveBtn)saveBtn.onclick=function(){lashjalpHistorySaveEdit(idx,card,saveBtn);};
  var cancelBtn=card.querySelector(".lashjalp-history-cancel-btn");
  if(cancelBtn)cancelBtn.onclick=function(){
    renderLashjalpHistoryList();
    var sel=document.getElementById("lashjalpHistoryFileSelect");
    if(sel)sel.focus();
  };
}
async function lashjalpHistorySaveEdit(idx,card,saveBtn){
  var item=lashjalpHistoryItems[idx];
  if(!item)return;
  if(saveBtn){saveBtn.disabled=true;saveBtn.textContent="Sparar …";}
  if(lashjalpHistoryKey==="oversattning"){
    item.kalla=((card.querySelector(".lje-kalla")||{}).value||"").trim();
    item.kallaSprak=((card.querySelector(".lje-kallasprak")||{}).value||"").trim();
    item.tillSprak=((card.querySelector(".lje-tillsprak")||{}).value||"").trim()||"svenska";
    item.oversattning=((card.querySelector(".lje-svar")||{}).value||"").trim();
  } else {
    item.fraga=((card.querySelector(".lje-fraga")||{}).value||"").trim();
    item.svar=((card.querySelector(".lje-svar")||{}).value||"").trim();
  }
  var fileName=LASHJALP_FILES[lashjalpHistoryKey];
  var ok=await driveWriteJson(LASHJALP_FOLDER,fileName,{items:lashjalpHistoryItems});
  if(!ok){
    console.error("sokbar: kunde inte spara ändringen av historikposten i "+fileName);
    if(saveBtn){saveBtn.disabled=false;saveBtn.textContent="Kunde inte spara, försök igen";}
    return;
  }
  renderLashjalpHistoryList();
  var sel=document.getElementById("lashjalpHistoryFileSelect");
  if(sel)sel.focus();
}

// ✕ Ta bort kräver två klick istället för webbläsarens window.confirm() (som skulle
// blockera sidan och bryta tangentbords-navigeringen): första klicket byter texten
// till "Ta bort?" i tre sekunder, andra klicket inom den tiden bekräftar borttagningen.
function lashjalpHistoryDeleteClick(btn){
  if(btn.dataset.confirm==="1"){
    lashjalpHistoryDeleteConfirmed(parseInt(btn.dataset.idx,10));
    return;
  }
  btn.dataset.confirm="1";
  btn.dataset.origText=btn.textContent;
  btn.textContent="Ta bort?";
  btn.title="Klicka igen för att bekräfta borttagning";
  clearTimeout(btn._lashjalpConfirmTimer);
  btn._lashjalpConfirmTimer=setTimeout(function(){
    btn.dataset.confirm="0";
    btn.textContent=btn.dataset.origText||"✕";
    btn.title="Ta bort";
  },3000);
}
async function lashjalpHistoryDeleteConfirmed(idx){
  var item=lashjalpHistoryItems[idx];
  if(!item)return;
  var card=document.querySelector('.lashjalp-history-item[data-idx="'+idx+'"]');
  var deleteBtn=card?card.querySelector(".lashjalp-history-delete-btn"):null;
  if(deleteBtn){deleteBtn.disabled=true;deleteBtn.textContent="Tar bort …";}
  var backup=lashjalpHistoryItems;
  lashjalpHistoryItems=lashjalpHistoryItems.filter(function(it){return it!==item;});
  var fileName=LASHJALP_FILES[lashjalpHistoryKey];
  var ok=await driveWriteJson(LASHJALP_FOLDER,fileName,{items:lashjalpHistoryItems});
  if(!ok){
    console.error("sokbar: kunde inte ta bort historikposten i "+fileName+", försök igen");
    lashjalpHistoryItems=backup;
  }
  renderLashjalpHistoryList();
  var sel=document.getElementById("lashjalpHistoryFileSelect");
  if(sel)sel.focus();
}

// Genväg (👓-knappen till vänster om 📖-knappen i huvudraden): går rakt in i
// historikvyn utan att först visa Läshjälps huvudpanel. Sköter samma
// fokus-sparning/overflow-hidden som openLashjalp() gör normalt (annars blir
// body.style.overflow aldrig återställd när man stänger, eftersom den bara sätts av
// openLashjalp() annars) - closeLashjalpHistory() lämnar tillbaka en till Läshjälps
// huvudpanel (som vanligt), och closeLashjalp() därifrån återställer allt.
function openLashjalpHistoryDirect(){
  var overlay=document.getElementById("lashjalpOverlay");
  if(!overlay)return;
  lashjalpLastFocus=lashjalpCaptureReturnFocus();
  closeLashjalpDropup();
  document.body.style.overflow="hidden";
  overlay.style.display="none";
  openLashjalpHistory();
}

// Ren textöversättning - inget JSON-svar att tolka här förr, men sedan Blå bad om att
// FÅ VETA (och spara) vilket källspråk AI:n identifierade, ber vi nu om ett litet
// JSON-svar {oversattning, kallaSprak} istället för ren text - sokbarParseJsonReply
// (samma robusta klammer-räknare som Sök/Ord använder) sköter tolkningen, med samma
// råtext-fallback om AI:n mot förmodan inte skulle svara med giltig JSON.
// Både källspråk ("Från") och målspråk ("Till") är nu fria textfält istället för en
// fast dropdown: tomt "Från" = AI:n identifierar själv, tomt "Till" = svenska.
async function lashjalpTranslate(){
  var input=document.getElementById("lashjalpTransInput");
  var fromInput=document.getElementById("lashjalpTransFromInput");
  var toInput=document.getElementById("lashjalpTransToInput");
  var result=document.getElementById("lashjalpTransResult");
  if(!input||!result)return;
  var text=input.value.trim();
  if(!text)return;
  var sourceLang=(fromInput&&fromInput.value.trim())||"";
  var targetLang=(toInput&&toInput.value.trim())||"svenska";
  result.innerHTML="Översätter …";
  var sys=sourceLang
    ?"Du ar en oversattare. Texten som ges ar skriven pa "+sourceLang+". Oversatt den till "+targetLang+". Svara ENDAST med JSON, utan markdown-block: {\"oversattning\":\"den oversatta texten, inga citattecken runt om\",\"kallaSprak\":\""+sourceLang+"\"}"
    :"Du ar en oversattare. Identifiera sjalv vilket sprak texten som ges ar skriven pa, och oversatt den till "+targetLang+". Svara ENDAST med JSON, utan markdown-block: {\"oversattning\":\"den oversatta texten, inga citattecken runt om\",\"kallaSprak\":\"spraket du identifierade, kort, pa svenska (t.ex. engelska)\"}";
  var parsed=null,lastRawText="",lastErr=null;
  for(var attempt=0;attempt<2&&!parsed;attempt++){
    try{
      var res=await aiCall(sys,text,900);
      var data=await res.json();
      lastRawText=aiText(data);
      if(data&&data.error)throw new Error(typeof data.error==="string"?data.error:JSON.stringify(data.error));
      parsed=sokbarParseJsonReply(lastRawText);
    }catch(err){lastErr=err;parsed=null;}
  }
  if(!parsed||!parsed.oversattning){
    if(lastRawText&&lastRawText.trim()){
      // AI:n svarade men inte med giltig/komplett JSON - visa råtexten (troligen redan
      // den översatta texten rakt av) istället för att strandsätta med ett tomt fel.
      console.error("sokbar: läshjälp-översättning kunde inte tolka JSON-svaret, visar råtext istället",lastErr,lastRawText);
      var rawTranslated=lastRawText.trim();
      result.innerHTML="<button id='lashjalpTransPinBtn' title='Spara översättningen (oversattning.json)' style='float:right;background:none;border:none;color:var(--sub);cursor:pointer;font-family:inherit;font-size:13px;padding:0 0 6px 8px'>📌</button>"
        +"<button id='lashjalpTransOrdBtn' title='Slå upp den översatta texten i Ordbok/synonymer' style='float:right;background:none;border:none;color:var(--sub);cursor:pointer;font-family:inherit;font-size:13px;padding:0 0 6px 8px'>📚</button>"
        +"<div>"+esc(rawTranslated)+"</div>";
      var rawPinBtn=document.getElementById("lashjalpTransPinBtn");
      if(rawPinBtn)rawPinBtn.onclick=function(){pinOversattningResult(text,rawTranslated,sourceLang,targetLang,rawPinBtn);};
      var rawOrdBtn=document.getElementById("lashjalpTransOrdBtn");
      if(rawOrdBtn)rawOrdBtn.onclick=function(){lashjalpLookupTranslatedInOrdbok(rawTranslated);};
      return;
    }
    console.error("sokbar: läshjälp-översättning fick inget svar alls från AI",lastErr);
    result.textContent="Kunde inte hämta en översättning, försök igen.";
    return;
  }
  var translated=String(parsed.oversattning||"").trim();
  var detectedSprak=sourceLang||String(parsed.kallaSprak||"").trim();
  if(translated){
    result.innerHTML="<button id='lashjalpTransPinBtn' title='Spara översättningen (oversattning.json)' style='float:right;background:none;border:none;color:var(--sub);cursor:pointer;font-family:inherit;font-size:13px;padding:0 0 6px 8px'>📌</button>"
      +"<button id='lashjalpTransOrdBtn' title='Slå upp den översatta texten i Ordbok/synonymer' style='float:right;background:none;border:none;color:var(--sub);cursor:pointer;font-family:inherit;font-size:13px;padding:0 0 6px 8px'>📚</button>"
      +(detectedSprak?"<div style='color:var(--sub);font-size:11px;margin-bottom:4px'>"+esc(detectedSprak)+" → "+esc(targetLang)+"</div>":"")
      +"<div>"+esc(translated)+"</div>";
    var pinBtn=document.getElementById("lashjalpTransPinBtn");
    if(pinBtn)pinBtn.onclick=function(){pinOversattningResult(text,translated,detectedSprak,targetLang,pinBtn);};
    var ordBtn=document.getElementById("lashjalpTransOrdBtn");
    if(ordBtn)ordBtn.onclick=function(){lashjalpLookupTranslatedInOrdbok(translated);};
  } else {
    result.textContent="Kunde inte hämta en översättning, försök igen.";
  }
}

// 📚-knappen bredvid 📌 på ett översättningsresultat: tar den översatta texten,
// lägger in den i Läshjälps eget Ordbok/synonymer-fält och kör sökningen direkt -
// snabbväg för att t.ex. slå upp synonymer på ett ord man just fått översatt.
function lashjalpLookupTranslatedInOrdbok(translatedText){
  var ordInput=document.getElementById("lashjalpOrdInput");
  if(!ordInput||!translatedText)return;
  ordInput.value=translatedText;
  ordInput.focus();
  if(ordInput.scrollIntoView)ordInput.scrollIntoView({block:"nearest"});
  lashjalpSearchWord();
}

// Eget ordboks-uppslag för läshjälpen - egen chat-tråd (lashjalpOrdChat) så den inte
// blandas ihop med Ord-fältet i den vanliga sökraden. Samma robusta JSON-tolkning och
// råtext-fallback som Sök/Ord (se sokbarParseJsonReply högst upp i filen).
var lashjalpOrdChat=null, lashjalpOrdHeaderHtml="";
function renderLashjalpOrdResult(){
  var el=document.getElementById("lashjalpOrdResult");
  if(!el)return;
  el.innerHTML="<button id='lashjalpOrdPinBtn' title='Spara sökningen (ord.json)' style='float:right;background:none;border:none;color:var(--sub);cursor:pointer;font-family:inherit;font-size:13px;padding:0 0 6px 8px'>📌</button>"
    +lashjalpOrdHeaderHtml
    +chatContinuationHtml(lashjalpOrdChat,"lashjalpordai");
  var lashjalpOrdPinBtn=document.getElementById("lashjalpOrdPinBtn");
  if(lashjalpOrdPinBtn)lashjalpOrdPinBtn.onclick=function(){pinOrdResult(lashjalpOrdChat,lashjalpOrdPinBtn);};
  bindChatContinuation(el,"lashjalpordai","Du ar en svensk assistent for ordbok och synonymer. Fortsätt hjälpa personen bygga vidare på det ni just pratat om, svara med vanlig text.",function(){return lashjalpOrdChat;},renderLashjalpOrdResult);
  el.querySelectorAll("[data-copyword]").forEach(function(chip){
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
}
async function lashjalpSearchWord(){
  var input=document.getElementById("lashjalpOrdInput");
  var el=document.getElementById("lashjalpOrdResult");
  if(!input||!el)return;
  var word=input.value.trim();
  if(!word)return;
  el.innerHTML="<span class='spnr' style='width:14px;height:14px;border-width:2px;display:inline-block;margin:0 6px 0 0;vertical-align:middle'></span>söker …";
  var sys='Du ar en svensk assistent for ordbok och synonymer. Ge en kort definition och 4-6 bra synonymer for ordet eller frasen. Svara ENDAST med JSON, utan markdown-block: {"word":"ordet/frasen","definition":"kort definition, max 2 meningar","synonyms":["syn1","syn2","syn3","syn4"]}';
  var userMsg="Slå upp: \""+word+"\"";
  var parsed=null,lastRawText="",lastErr=null;
  for(var attempt=0;attempt<2&&!parsed;attempt++){
    try{
      var res=await aiCall(sys,userMsg,1100);
      var data=await res.json();
      lastRawText=aiText(data);
      if(data&&data.error)throw new Error(typeof data.error==="string"?data.error:JSON.stringify(data.error));
      parsed=sokbarParseJsonReply(lastRawText);
    }catch(err){lastErr=err;parsed=null;}
  }
  if(!parsed){
    if(lastRawText&&lastRawText.trim()){
      console.error("sokbar: läshjälp kunde inte tolka JSON-svaret, visar råtext istället",lastErr,lastRawText);
      lashjalpOrdChat=[{role:"user",content:"Slå upp: \""+word+"\""},{role:"assistant",content:lastRawText}];
      lashjalpOrdHeaderHtml="<span class='note-label'>"+esc(word)+"</span>"
        +"<div style='margin:6px 0 10px;color:var(--text);font-size:13.5px'>"+esc(lastRawText)+"</div>";
      renderLashjalpOrdResult();
      return;
    }
    console.error("sokbar: läshjälp fick inget svar alls från AI",lastErr);
    el.innerHTML="Kunde inte hämta ett svar, försök igen.";
    return;
  }
  var chips=(parsed.synonyms||[]).map(function(s){return "<span class='synonym-chip' data-copyword='"+esc(s)+"' style='cursor:pointer' title='Klicka för att kopiera'>"+esc(s)+"</span>";}).join("");
  var answerText=(parsed.definition||"")+((parsed.synonyms||[]).length?"\nSynonymer: "+parsed.synonyms.join(", "):"");
  lashjalpOrdChat=[{role:"user",content:"Slå upp: \""+word+"\""},{role:"assistant",content:answerText}];
  lashjalpOrdHeaderHtml="<span class='note-label'>"+esc(parsed.word||word)+"</span>"
    +"<div style='margin:6px 0 10px;color:var(--text);font-size:13.5px'>"+esc(parsed.definition||"")+"</div>"
    +"<div>"+chips+"</div>";
  renderLashjalpOrdResult();
}

// ---- AI-chat: fristående overlay (🤖-knappen längst till vänster i sökraden) för en
// fri, flerstegs konversation med AI - separat från Sök/Ord/Läshjälp, med egen
// bild-/filbifogning och egen kamera (egna element, delar inget med dict-bar:ens
// 📁/📷 för Sök). Byggd på core.js:s generiska aiChat()/aiText() (samma som
// "fortsätt konversationen" använder), inte aiCall() (som bara tar en enstaka fråga).
// Samma tangentbords-mönster som övriga overlay (fokus-fälla, Escape stänger). Till
// skillnad från Läshjälps under-paneler (⚙️/📋) är detta INTE en syskon-overlay till
// något annat - den öppnas direkt från sökraden och stängs helt (inte till någon
// "förälder"), så klick utanför/Escape/✕ gör alla samma sak här.
var aiChatMessages=[];
var aiChatPendingAttachment=null; // {type:"image",dataUrl} eller {type:"text",name,content}
var aiChatLastFocus=null;
var aiChatCamStream=null;

// NYTT (2026-08-31): varje meddelande i konversationen har nu ✏️ Redigera/✕ Ta bort
// (aiChatEnterEditMessage()/aiChatDeleteMessage() nedan) - till skillnad från Läshjälps
// historik (som skriver till Drive och därför har ett två-klicks-skydd) är detta bara
// den PÅGÅENDE, oslarade konversationen i minnet, så ett enda klick räcker för att ta
// bort ett meddelande.
function renderAiChatMessages(){
  var box=document.getElementById("aiChatMessages");
  if(!box)return;
  if(!aiChatMessages.length){
    box.innerHTML="<div class='lashjalp-hint' style='margin:0'>Ställ en fråga, eller bifoga en bild/fil nedan.</div>";
    return;
  }
  box.innerHTML=aiChatMessages.map(function(m,idx){
    var txt=chatContentToText(m.content);
    var align=m.role==="user"?"flex-end":"flex-start";
    var bubbleClass=m.role==="user"?"bubble-me":"bubble-them";
    return "<div class='ai-chat-msg-row' data-idx='"+idx+"' style='align-items:"+align+"'>"
      +"<div class='"+bubbleClass+"'>"+esc(txt)+"</div>"
      +"<div class='ai-chat-msg-actions'>"
      +"<button type='button' class='ai-chat-msg-edit-btn' data-idx='"+idx+"' title='Redigera'>✏️</button>"
      +"<button type='button' class='ai-chat-msg-delete-btn' data-idx='"+idx+"' title='Ta bort'>✕</button>"
      +"</div>"
      +"</div>";
  }).join("");
  box.scrollTop=box.scrollHeight;
  box.querySelectorAll(".ai-chat-msg-edit-btn").forEach(function(btn){
    btn.onclick=function(){aiChatEnterEditMessage(parseInt(btn.dataset.idx,10));};
  });
  box.querySelectorAll(".ai-chat-msg-delete-btn").forEach(function(btn){
    btn.onclick=function(){aiChatDeleteMessage(parseInt(btn.dataset.idx,10));};
  });
}
// Byter ut TEXTEN i ett meddelande utan att tappa en ev. bifogad bild (content kan
// antingen vara en ren sträng eller en array med {type:"image_url"/"text"}-delar, samma
// form som aiChatSend() bygger och som core.js:s chatContentToText() läser).
function aiChatSetMessageText(idx,newText){
  var m=aiChatMessages[idx];
  if(!m)return;
  if(Array.isArray(m.content)){
    var hasText=false;
    m.content=m.content.map(function(part){
      if(part&&part.type==="text"){hasText=true;return {type:"text",text:newText};}
      return part;
    });
    if(!hasText)m.content.push({type:"text",text:newText});
  } else {
    m.content=newText;
  }
}
function aiChatEnterEditMessage(idx){
  var box=document.getElementById("aiChatMessages");
  var row=box?box.querySelector('.ai-chat-msg-row[data-idx="'+idx+'"]'):null;
  var m=aiChatMessages[idx];
  if(!row||!m)return;
  var currentText=chatContentToText(m.content);
  row.innerHTML="<textarea class='ai-chat-msg-edit-area' rows='2'>"+esc(currentText)+"</textarea>"
    +"<div class='ai-chat-msg-edit-actions'>"
    +"<button type='button' class='action-btn ai-chat-msg-cancel-btn'>Avbryt</button>"
    +"<button type='button' class='abtn ai-chat-msg-save-btn'>Spara</button>"
    +"</div>";
  var ta=row.querySelector(".ai-chat-msg-edit-area");
  if(ta){ta.focus();ta.selectionStart=ta.selectionEnd=ta.value.length;}
  var cancelBtn=row.querySelector(".ai-chat-msg-cancel-btn");
  if(cancelBtn)cancelBtn.onclick=function(){renderAiChatMessages();};
  var saveBtn=row.querySelector(".ai-chat-msg-save-btn");
  if(saveBtn)saveBtn.onclick=function(){
    aiChatSetMessageText(idx,ta?ta.value.trim():currentText);
    renderAiChatMessages();
  };
}
function aiChatDeleteMessage(idx){
  aiChatMessages.splice(idx,1);
  renderAiChatMessages();
}
function aiChatRenderAttachmentPreview(){
  var el=document.getElementById("aiChatAttachPreview");
  if(!el)return;
  if(!aiChatPendingAttachment){el.style.display="none";el.innerHTML="";return;}
  el.style.display="flex";
  if(aiChatPendingAttachment.type==="image"){
    el.innerHTML="<img src='"+aiChatPendingAttachment.dataUrl+"' style='height:40px;border-radius:4px'>"
      +"<button type='button' id='aiChatRemoveAttachBtn' class='action-btn' title='Ta bort bifogning' style='margin-left:8px'>✕</button>";
  } else {
    el.innerHTML="<span style='font-size:12px;color:var(--sub)'>📎 "+esc(aiChatPendingAttachment.name)+"</span>"
      +"<button type='button' id='aiChatRemoveAttachBtn' class='action-btn' title='Ta bort bifogning' style='margin-left:8px'>✕</button>";
  }
  var removeBtn=document.getElementById("aiChatRemoveAttachBtn");
  if(removeBtn)removeBtn.onclick=function(){
    aiChatPendingAttachment=null;
    aiChatRenderAttachmentPreview();
    var inp=document.getElementById("aiChatInput");
    if(inp)inp.focus();
  };
}
async function aiChatSend(){
  var input=document.getElementById("aiChatInput");
  if(!input)return;
  var text=input.value.trim();
  if(!text&&!aiChatPendingAttachment)return;
  var userContent;
  if(aiChatPendingAttachment&&aiChatPendingAttachment.type==="image"){
    userContent=[{type:"image_url",image_url:{url:aiChatPendingAttachment.dataUrl}},{type:"text",text:text||"Vad ser du på bilden?"}];
  } else if(aiChatPendingAttachment&&aiChatPendingAttachment.type==="text"){
    userContent="Bifogad fil (\""+aiChatPendingAttachment.name+"\"):\n\n"+aiChatPendingAttachment.content.slice(0,6000)+(text?"\n\n"+text:"");
  } else {
    userContent=text;
  }
  aiChatMessages.push({role:"user",content:userContent});
  input.value="";
  aiChatPendingAttachment=null;
  aiChatRenderAttachmentPreview();
  renderAiChatMessages();
  var box=document.getElementById("aiChatMessages");
  var loadingLine=document.createElement("div");
  loadingLine.className="lashjalp-hint";
  loadingLine.style.margin="0 0 8px";
  loadingLine.textContent="Skriver …";
  if(box){box.appendChild(loadingLine);box.scrollTop=box.scrollHeight;}
  try{
    // Invänta ev. pågående hämtning av bakgrundskontexten (startad av openAiChat()) så
    // att den hinner vara med redan på FÖRSTA meddelandet i konversationen, utan att
    // fördröja själva öppnandet av AI-chatten.
    if(aiChatBackgroundContextPromise)await aiChatBackgroundContextPromise;
    var personaInput=document.getElementById("aiChatPersonaInput");
    var persona=(personaInput&&personaInput.value.trim())||"";
    var sys="Du ar en hjalpsam AI-assistent i en chatt. Svara pa svenska om inte annat begars, kortfattat och tydligt."
      +(persona?" Anta foljande roll/personlighet i din kommunikationsstil: "+persona+".":"")
      +(aiChatBackgroundContext?" Bakgrundsinformation om personen du pratar med, baserat pa hennes sparade sokningar/ord/oversattningar - anvand det for att gora svaren mer personligt anpassade nar det ar relevant, men lagg inte pa dig sjalv att namna att du har den har informationen om inte hon fragar:\n"+aiChatBackgroundContext:"");
    var res=await aiChat(sys,aiChatMessages,900);
    var data=await res.json();
    if(data&&data.error)throw new Error(typeof data.error==="string"?data.error:JSON.stringify(data.error));
    var answer=aiText(data)||"Kunde inte svara, försök igen.";
    aiChatMessages.push({role:"assistant",content:answer});
  }catch(err){
    console.error("sokbar: AI-chat misslyckades",err);
    aiChatMessages.push({role:"assistant",content:"Kunde inte hämta ett svar, försök igen."});
  }
  renderAiChatMessages();
}
function aiChatStopCamera(){
  if(aiChatCamStream){aiChatCamStream.getTracks().forEach(function(t){t.stop();});aiChatCamStream=null;}
  var cameraContainer=document.getElementById("aiChatCameraContainer");
  if(cameraContainer)cameraContainer.style.display="none";
}

// ---- AI-chat: bakgrundskontext från sparad data (ai.json) ----
// NYTT (2026-09-01, ersätter förra veckans pinna-hela-konversationen-funktion, som togs
// bort på Blås begäran - ai.json var upptaget och hon ville hellre ha det här). Varje
// gång AI-chatten öppnas hämtas en KORT AI-genererad sammanfattning av vad som finns i
// sok.json/ord.json/oversattning.json ("vilka ämnen personen brukar söka på", "vilka
// språk hon översätter mellan" osv) och skickas med som bakgrundsinformation i
// systemprompten på varje meddelande - så AI-chattens svar kan bli mer personligt
// anpassade, utan att man behöver berätta allt själv varje gång.
//
// Sammanfattningarna cachas i ai.json (en post per källfil: {summary, itemCount,
// updatedAt}) istället för att skickas till AI:n för sammanfattning på nytt vid VARJE
// meddelande - det vore både långsamt och kostsamt. En cachad sammanfattning återanvänds
// så länge källfilen har lika många poster som senast (itemCount) - så fort något nytt
// sparas (📌 på en sökning/ord/översättning) räknas den filen om nästa gång AI-chatten
// öppnas. Se aiChatRefreshBackgroundContext()/aiChatSummarizeFile() nedan.
//
// STORLEK (2026-09-01, på Blås begäran): ai.json ska hållas litet och lätt för AI:n att
// tolka. Den växer INTE med tiden som sok/ord/oversattning.json gör - den har alltid
// högst tre sammanfattnings-poster (en per källfil, skrivs över vid omsummering, läggs
// aldrig till i en lista) plus ev. kommentarer Blå själv lagt in (se
// lashjalpSettingsAddAiComment()). AI_CHAT_SUMMARY_MAX_CHARS är ett hårt tak på varje
// sammanfattning som skydd ifall AI:n mot förmodan skulle strunta i "max 2-3 meningar" i
// systemprompten - klipper texten snarare än att låta den växa okontrollerat.
var AI_CHAT_SUMMARY_MAX_CHARS=400;
var aiChatBackgroundContext="";
var aiChatBackgroundContextPromise=null;
var AI_CHAT_SUMMARY_LABELS={sok:"sökningar (frågor personen bett om en förklaring av)",ord:"ord/synonymer personen slagit upp",oversattning:"översättningar personen gjort"};
var AI_CHAT_SUMMARY_SYS='Du ar en assistent som skriver en KORT bakgrundsprofil av en anvandares sparade data, max 2-3 meningar, pa svenska. Fokusera pa monster/teman (t.ex. vilka amnen personen ofta soker pa, vilka sprak hon oversatter mellan, vilken typ av ord hon slar upp) - INTE en lista av varje enskild post. Svara ENDAST med sjalva sammanfattningen, ingen inledning som "Har ar en sammanfattning".';
async function aiChatSummarizeFile(key,items){
  if(!items.length)return "";
  var listText=items.slice(0,40).map(function(it){
    if(key==="oversattning")return "- "+(it.kalla||"")+" -> "+(it.oversattning||"");
    return "- "+(it.fraga||"")+(it.svar?": "+it.svar:"");
  }).join("\n");
  try{
    var res=await aiCall(AI_CHAT_SUMMARY_SYS,"Sammanfatta dessa sparade "+(AI_CHAT_SUMMARY_LABELS[key]||key)+":\n\n"+listText,300);
    var data=await res.json();
    if(data&&data.error)throw new Error(typeof data.error==="string"?data.error:JSON.stringify(data.error));
    var summary=(aiText(data)||"").trim();
    return summary.slice(0,AI_CHAT_SUMMARY_MAX_CHARS);
  }catch(err){
    console.error("sokbar: kunde inte sammanfatta "+key+" till AI-chattens bakgrundskontext",err);
    return "";
  }
}
// Hämtar/uppdaterar bakgrundskontexten. Sparar resultatet i modulvariabeln
// aiChatBackgroundContext (och löftet i aiChatBackgroundContextPromise så att
// aiChatSend() kan invänta det innan den bygger systemprompten) - körs i bakgrunden när
// AI-chatten öppnas, inte varje gång man trycker Enter.
//
// VIKTIGT: cache-objektet läses in HELT (driveReadJson) och bara cache.sok/cache.ord/
// cache.oversattning skrivs över nedan - cache.kommentarer (Blås egna anteckningar, se
// lashjalpSettingsAddAiComment()) rörs aldrig här, oavsett vad den innehåller, och skrivs
// tillbaka oförändrat tillsammans med resten av objektet om något annat behövde sparas.
function aiChatRefreshBackgroundContext(){
  aiChatBackgroundContextPromise=(async function(){
    if(typeof accessToken==="undefined"||!accessToken){aiChatBackgroundContext="";return;}
    try{
      var cache=(await driveReadJson(LASHJALP_FOLDER,LASHJALP_FILES.ai))||{};
      var cacheChanged=false;
      var parts=[];
      var keys=["sok","ord","oversattning"];
      for(var i=0;i<keys.length;i++){
        var key=keys[i];
        var data=await driveReadJson(LASHJALP_FOLDER,LASHJALP_FILES[key]);
        var items=(data&&Array.isArray(data.items))?data.items:[];
        if(!items.length)continue;
        var cached=cache[key];
        var summary;
        if(cached&&cached.itemCount===items.length&&cached.summary){
          summary=cached.summary;
        } else {
          summary=await aiChatSummarizeFile(key,items);
          if(summary){
            cache[key]={summary:summary,itemCount:items.length,updatedAt:new Date().toISOString()};
            cacheChanged=true;
          }
        }
        if(summary)parts.push("- "+(AI_CHAT_SUMMARY_LABELS[key]||key)+": "+summary);
      }
      // Blås egna kommentarer (aldrig ändrade av AI:n) räknas också med i det som
      // skickas till AI-chatten - det är hela poängen med att kunna lägga in dem. Tak på
      // antal/längd HÄR påverkar bara vad som SKICKAS till AI:n per meddelande, inte vad
      // som faktiskt sparas i ai.json (den listan rör vi aldrig).
      var kommentarer=Array.isArray(cache.kommentarer)?cache.kommentarer:[];
      if(kommentarer.length){
        var kommentarText=kommentarer.slice(0,15).map(function(k){
          return "- "+String((k&&k.text)||"").slice(0,300);
        }).join("\n");
        parts.push("- egna anteckningar personen lagt in:\n"+kommentarText);
      }
      if(cacheChanged)await driveWriteJson(LASHJALP_FOLDER,LASHJALP_FILES.ai,cache);
      aiChatBackgroundContext=parts.join("\n");
    }catch(err){
      console.error("sokbar: kunde inte hämta AI-chattens bakgrundskontext",err);
      aiChatBackgroundContext="";
    }
  })();
  return aiChatBackgroundContextPromise;
}

function openAiChat(){
  var overlay=document.getElementById("aiChatOverlay");
  if(!overlay)return;
  aiChatLastFocus=document.activeElement;
  overlay.style.display="flex";
  document.body.style.overflow="hidden";
  renderAiChatMessages();
  aiChatRefreshBackgroundContext();
  var input=document.getElementById("aiChatInput");
  if(input)input.focus();
}
function closeAiChat(){
  var overlay=document.getElementById("aiChatOverlay");
  if(!overlay)return;
  aiChatStopCamera();
  overlay.style.display="none";
  document.body.style.overflow="";
  if(aiChatLastFocus&&typeof aiChatLastFocus.focus==="function")aiChatLastFocus.focus();
  aiChatLastFocus=null;
}
function initAiChat(){
  var aiChatBtn=document.getElementById("aiChatBtn");
  if(aiChatBtn)aiChatBtn.onclick=openAiChat;

  var overlay=document.getElementById("aiChatOverlay");
  if(!overlay)return;

  var closeBtn=document.getElementById("aiChatCloseBtn");
  if(closeBtn)closeBtn.onclick=closeAiChat;

  // Samma ⚙️ Inställningar-panel som Läshjälp använder (openLashjalpSettings/
  // closeLashjalpSettings, se den funktionen för hur den kommer ihåg vilken av de två
  // som ska visas igen när panelen stängs).
  var settingsBtn=document.getElementById("aiChatSettingsBtn");
  if(settingsBtn)settingsBtn.onclick=function(){openLashjalpSettings("aiChatOverlay","aiChatSettingsBtn");};

  // Fristående overlay (inte en syskon-panel till något annat) - klick utanför,
  // Escape och ✕ stänger alla helt, till skillnad från Läshjälps under-paneler.
  overlay.addEventListener("mousedown",function(e){
    if(e.target===overlay)closeAiChat();
  });
  overlay.addEventListener("keydown",function(e){
    if(e.key==="Escape"){
      e.preventDefault();
      closeAiChat();
      return;
    }
    if(e.key!=="Tab")return;
    var focusables=Array.prototype.slice.call(
      overlay.querySelectorAll('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])')
    ).filter(function(el){return !el.disabled&&el.offsetParent!==null;});
    if(!focusables.length)return;
    var first=focusables[0], last=focusables[focusables.length-1];
    if(e.shiftKey&&document.activeElement===first){
      e.preventDefault();last.focus();
    } else if(!e.shiftKey&&document.activeElement===last){
      e.preventDefault();first.focus();
    }
  });

  var input=document.getElementById("aiChatInput");
  if(input)input.onkeydown=function(e){
    if(e.key==="Enter"){e.preventDefault();aiChatSend();}
  };
  var sendBtn=document.getElementById("aiChatSendBtn");
  if(sendBtn)sendBtn.onclick=aiChatSend;

  var imgUpload=document.getElementById("aiChatImgUpload");
  if(imgUpload)imgUpload.onchange=function(){
    var file=imgUpload.files&&imgUpload.files[0];
    if(file){
      if(file.type.indexOf("image/")===0){
        var r=new FileReader();
        r.onload=function(){
          aiChatPendingAttachment={type:"image",dataUrl:r.result};
          aiChatRenderAttachmentPreview();
          var inp=document.getElementById("aiChatInput");
          if(inp)inp.focus();
        };
        r.readAsDataURL(file);
      } else {
        var r2=new FileReader();
        r2.onload=function(){
          aiChatPendingAttachment={type:"text",name:file.name,content:String(r2.result||"")};
          aiChatRenderAttachmentPreview();
          var inp=document.getElementById("aiChatInput");
          if(inp)inp.focus();
        };
        r2.readAsText(file);
      }
    }
    imgUpload.value="";
  };

  var cameraBtn=document.getElementById("aiChatCameraBtn");
  if(cameraBtn){
    cameraBtn.onclick=function(){
      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){alert("Kameran stöds inte.");return;}
      var showStream=function(s){
        aiChatCamStream=s;
        var v=document.getElementById("aiChatCameraVideo");
        if(v)v.srcObject=s;
        var c=document.getElementById("aiChatCameraContainer");
        if(c)c.style.display="block";
      };
      navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false})
        .then(showStream)
        .catch(function(){
          navigator.mediaDevices.getUserMedia({video:true,audio:false})
            .then(showStream)
            .catch(function(e){alert("Kunde inte starta kameran: "+e.message);});
        });
    };
  }
  var closeCameraBtn=document.getElementById("aiChatCloseCameraBtn");
  if(closeCameraBtn)closeCameraBtn.onclick=aiChatStopCamera;
  var snapBtn=document.getElementById("aiChatSnapBtn");
  if(snapBtn){
    snapBtn.onclick=function(){
      var video=document.getElementById("aiChatCameraVideo");
      var canvas=document.getElementById("aiChatSnapCanvas");
      if(!video||!canvas)return;
      canvas.width=video.videoWidth;canvas.height=video.videoHeight;
      canvas.getContext("2d").drawImage(video,0,0);
      var dataUrl=canvas.toDataURL("image/jpeg",0.92);
      aiChatStopCamera();
      aiChatPendingAttachment={type:"image",dataUrl:dataUrl};
      aiChatRenderAttachmentPreview();
      var inp=document.getElementById("aiChatInput");
      if(inp)inp.focus();
    };
  }
}

function initLashjalp(){
  initLashjalpDropup();

  var lashjalpBtn=document.getElementById("lashjalpBtn");
  if(lashjalpBtn)lashjalpBtn.onclick=openLashjalp;

  // Genvägsknapp (👓) - nu inuti dropup-menyn tillsammans med 📖, se
  // openLashjalpHistoryDirect() ovan och initLashjalpDropup() för själva menyn.
  var historyShortcutBtn=document.getElementById("lashjalpHistoryShortcutBtn");
  if(historyShortcutBtn)historyShortcutBtn.onclick=openLashjalpHistoryDirect;

  var overlay=document.getElementById("lashjalpOverlay");
  if(!overlay)return;

  var closeBtn=document.getElementById("lashjalpCloseBtn");
  if(closeBtn)closeBtn.onclick=closeLashjalp;

  // Klick på den mörka bakgrunden (utanför panelen) stänger, som ett alternativ till Esc/X.
  overlay.addEventListener("mousedown",function(e){
    if(e.target===overlay)closeLashjalp();
  });

  // Fokus-fälla: håller Tab/Skift+Tab inom overlayet så länge det är öppet, och
  // Escape stänger det - detta är kärnan i "navigera bara via tangentbordet".
  overlay.addEventListener("keydown",function(e){
    if(e.key==="Escape"){
      e.preventDefault();
      closeLashjalp();
      return;
    }
    if(e.key!=="Tab")return;
    var focusables=Array.prototype.slice.call(
      overlay.querySelectorAll('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])')
    ).filter(function(el){return !el.disabled&&el.offsetParent!==null;});
    if(!focusables.length)return;
    var first=focusables[0], last=focusables[focusables.length-1];
    if(e.shiftKey&&document.activeElement===first){
      e.preventDefault();last.focus();
    } else if(!e.shiftKey&&document.activeElement===last){
      e.preventDefault();first.focus();
    }
  });

  var transInput=document.getElementById("lashjalpTransInput");
  if(transInput)transInput.onkeydown=function(e){
    if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();lashjalpTranslate();}
  };
  var transFromInput=document.getElementById("lashjalpTransFromInput");
  if(transFromInput)transFromInput.onkeydown=function(e){
    if(e.key==="Enter"){e.preventDefault();lashjalpTranslate();}
  };
  var transToInput=document.getElementById("lashjalpTransToInput");
  if(transToInput)transToInput.onkeydown=function(e){
    if(e.key==="Enter"){e.preventDefault();lashjalpTranslate();}
  };
  var transBtn=document.getElementById("lashjalpTransBtn");
  if(transBtn)transBtn.onclick=lashjalpTranslate;

  var ordInput=document.getElementById("lashjalpOrdInput");
  if(ordInput)ordInput.onkeydown=function(e){
    if(e.key==="Enter")lashjalpSearchWord();
  };
  var ordBtn=document.getElementById("lashjalpOrdBtn");
  if(ordBtn)ordBtn.onclick=lashjalpSearchWord;

  var settingsBtn=document.getElementById("lashjalpSettingsBtn");
  if(settingsBtn)settingsBtn.onclick=function(){openLashjalpSettings("lashjalpOverlay","lashjalpSettingsBtn");};

  var settingsOverlay=document.getElementById("lashjalpSettingsOverlay");
  if(settingsOverlay){
    var settingsCloseBtn=document.getElementById("lashjalpSettingsCloseBtn");
    if(settingsCloseBtn)settingsCloseBtn.onclick=closeLashjalpSettings;
    var settingsCancelBtn=document.getElementById("lashjalpSettingsCancelBtn");
    if(settingsCancelBtn)settingsCancelBtn.onclick=closeLashjalpSettings;
    var settingsSaveBtn=document.getElementById("lashjalpSettingsSaveBtn");
    if(settingsSaveBtn)settingsSaveBtn.onclick=saveLashjalpSettingsFile;
    var settingsFileSelect=document.getElementById("lashjalpSettingsFileSelect");
    if(settingsFileSelect)settingsFileSelect.onchange=loadLashjalpSettingsFile;
    var aiCommentAddBtn=document.getElementById("lashjalpSettingsAiCommentAddBtn");
    if(aiCommentAddBtn)aiCommentAddBtn.onclick=lashjalpSettingsAddAiComment;
    var aiCommentInput=document.getElementById("lashjalpSettingsAiCommentInput");
    if(aiCommentInput)aiCommentInput.onkeydown=function(e){
      if(e.key==="Enter"){e.preventDefault();lashjalpSettingsAddAiComment();}
    };

    // Klick på den mörka bakgrunden stänger, precis som huvud-overlayet.
    settingsOverlay.addEventListener("mousedown",function(e){
      if(e.target===settingsOverlay)closeLashjalpSettings();
    });

    // Egen fokus-fälla, exakt samma mönster som huvud-overlayet (se kommentaren där) -
    // de två overlayen ligger aldrig öppna/tab-bara samtidigt (öppning av det ena döljer
    // det andra), så fällorna krockar aldrig med varandra.
    settingsOverlay.addEventListener("keydown",function(e){
      if(e.key==="Escape"){
        e.preventDefault();
        closeLashjalpSettings();
        return;
      }
      if(e.key!=="Tab")return;
      var focusables=Array.prototype.slice.call(
        settingsOverlay.querySelectorAll('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])')
      ).filter(function(el){return !el.disabled&&el.offsetParent!==null;});
      if(!focusables.length)return;
      var first=focusables[0], last=focusables[focusables.length-1];
      if(e.shiftKey&&document.activeElement===first){
        e.preventDefault();last.focus();
      } else if(!e.shiftKey&&document.activeElement===last){
        e.preventDefault();first.focus();
      }
    });
  }

  var historyBtn=document.getElementById("lashjalpHistoryBtn");
  if(historyBtn)historyBtn.onclick=openLashjalpHistory;

  var historyOverlay=document.getElementById("lashjalpHistoryOverlay");
  if(historyOverlay){
    var historyCloseBtn=document.getElementById("lashjalpHistoryCloseBtn");
    if(historyCloseBtn)historyCloseBtn.onclick=closeLashjalpHistory;
    var historyFileSelect=document.getElementById("lashjalpHistoryFileSelect");
    if(historyFileSelect)historyFileSelect.onchange=loadLashjalpHistory;

    // Klick på den mörka bakgrunden stänger HELT (till skillnad från Escape/✕ Stäng,
    // som går tillbaka till Läshjälps huvudpanel) - se closeLashjalpHistoryToOutsideClick().
    historyOverlay.addEventListener("mousedown",function(e){
      if(e.target===historyOverlay)closeLashjalpHistoryToOutsideClick();
    });

    // Egen fokus-fälla, exakt samma mönster som huvud-/inställnings-overlayet - bara ett
    // av de tre overlayen är någonsin synligt/tab-bart åt gången, så fällorna krockar aldrig.
    historyOverlay.addEventListener("keydown",function(e){
      if(e.key==="Escape"){
        e.preventDefault();
        closeLashjalpHistory();
        return;
      }
      if(e.key!=="Tab")return;
      var focusables=Array.prototype.slice.call(
        historyOverlay.querySelectorAll('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])')
      ).filter(function(el){return !el.disabled&&el.offsetParent!==null;});
      if(!focusables.length)return;
      var first=focusables[0], last=focusables[focusables.length-1];
      if(e.shiftKey&&document.activeElement===first){
        e.preventDefault();last.focus();
      } else if(!e.shiftKey&&document.activeElement===last){
        e.preventDefault();first.focus();
      }
    });
  }
}

function initDictBar(){
  var dictInput=document.getElementById("dictInput");
  if(dictInput)dictInput.onkeydown=function(e){if(e.key==="Enter")searchDictionary();};

  var dictSpellBtn=document.getElementById("dictSpellBtn");
  if(dictSpellBtn)dictSpellBtn.onclick=checkSpelling;

  var synInput=document.getElementById("synInput");
  if(synInput)synInput.onkeydown=function(e){if(e.key==="Enter")searchSynonym();};

  initLashjalp();
  initAiChat();

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

  // (Bild-/filuppladdning + kamera för sökraden borttagna 2026-08-31 - se AI-chatten,
  // som redan har egen bifogning/kamera. Ingen egen wiring behövs här längre.)
}