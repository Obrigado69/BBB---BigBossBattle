/* Coordinates and typography measured from the 28 original BBB_V2.ai artboards.
   Presentation only: combat and Supabase rules stay in the existing engine. */
(() => {
 'use strict';
 const L=window.BBB_LAYOUTS,asset=n=>'assets/v2/'+n+'.webp',measuredTexts=Object.values(window.BBB_LAYOUTS).flatMap(p=>p.texts);
 let uid=0,localPicker=null;
 const originalModal=modal;
 const rect=o=>combatPos(o.x,o.y,o.w,o.h);
 const box=(x,y,w,h)=>({x,y,w,h});
 const images=(page,kind)=>L[page].images.filter(im=>im.asset===kind);
 const one=(page,kind,index=0)=>images(page,kind)[index];
 const backgroundChars=L[7].texts.reduce((sum,t)=>sum+t.text.length,0);
 function text(value,x,y,size=16,anchor='middle',maxWidth=360,weight=null){
  const s=String(value??''),font=Math.min(size,maxWidth/Math.max(1,s.length*.65));
  if(weight===null){const matches=measuredTexts.filter(t=>Math.abs(t.size-size)<.1),exact=matches.find(t=>t.text.toUpperCase()===s.toUpperCase());weight=exact?.weight||matches[0]?.weight||400;}
  return `<svg class="art-text-layer v2-svg" viewBox="0 0 390 844" preserveAspectRatio="none"><text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${font}" font-weight="${weight}">${esc(s)}</text></svg>`;
 }
 function staticText(t){return `<text y="${t.y}" font-size="${t.size}">${[...t.text].map((c,i)=>`<tspan x="${t.xs[i]}" font-weight="${t.weights?.[i]||t.weight||400}">${esc(c)}</tspan>`).join('')}</text>`;}
 function image(im,src=null,extra=''){
  if(!im)return '';
  const key='v2clip'+(++uid),clip=im.clip?`<defs><clipPath id="${key}"><path d="${im.clip}"/></clipPath></defs>`:'';
  const geometry=im.matrix?`width="1" height="1" transform="matrix(${im.matrix.join(' ')})"`:`x="${im.x}" y="${im.y}" width="${im.w}" height="${im.h}"`;
  return `<svg class="art-text-layer v2-svg" data-v2-art="${[im.x,im.y,im.w,im.h].join(',')}" style="transform-origin:${100*(im.x+im.w/2)/390}% ${100*(im.y+im.h/2)/844}%" viewBox="0 0 390 844" preserveAspectRatio="none">${clip}<g ${clip?`clip-path="url(#${key})"`:''}><image href="${esc(src||asset(im.asset))}" ${geometry} preserveAspectRatio="none" ${extra}/></g></svg>`;
 }
 function hit(r,label,action,{disabled=false,selected=false,cls=''}={}){
  const target=r.h<44?{...r,y:r.y-(44-r.h)/2,h:44}:r;
  const highlight=selected&&cls.includes('v2-option')?`<span class="v2-option-highlight" style="${rect(r)}" aria-hidden="true"></span>`:'';
  return highlight+`<button class="v2-hit art-control ${selected?'v2-selected':''} ${cls}" data-v2-art="${[r.x,r.y,r.w,r.h].join(',')}" style="${rect(target)}" aria-label="${esc(label)}" ${selected?'aria-pressed="true"':''} onclick="${action}" ${disabled?'disabled':''}></button>`;
 }
 function labelButton(label,action,r,disabled=false){const size=label==='RECONNECT'?16.4624:r.h*.49;return image({...r,asset:'box'})+text(label,r.x+r.w/2,r.y+r.h*.61,size,'middle',r.w*.82)+hit(r,label,action,{disabled});}
 function base(page,{skipImage=()=>false,skipText=()=>false,overlay=false}={}){
  let out='';
  for(const im of L[page].images){
   if(overlay&&im.i<19||skipImage(im))continue;
   out+=image(im,im.asset==='boss'?bossImage():null);
  }
  const ts=L[page].texts.filter(t=>(!overlay||t.ci>=backgroundChars)&&!skipText(t));
  out+=`<svg class="art-text-layer v2-svg" viewBox="0 0 390 844" preserveAspectRatio="none">${ts.map(staticText).join('')}</svg>`;
  return out;
 }
 function layer(content,label,cls=''){return `<div class="battle-art-overlay v2-overlay ${cls}" role="dialog" aria-modal="true" aria-label="${esc(label)}">${content}</div>`;}
 function nativePortrait(p,r,{plus=false,editable=false,selected=false}={}){
  if(!r)return '';const cx=r.x+r.w/2,cy=r.y+r.h*.526,rad=r.w*.322,key='v2portrait'+(++uid);
  let out=p?.photo?`<svg class="art-text-layer v2-svg" viewBox="0 0 390 844" preserveAspectRatio="none"><defs><clipPath id="${key}"><circle cx="${cx}" cy="${cy}" r="${rad}"/></clipPath></defs><image href="${esc(p.photo)}" x="${cx-rad}" y="${cy-rad}" width="${rad*2}" height="${rad*2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${key})"/></svg>`:'';
  out+=image({...r,asset:'portrait'});
  if(p?.alive===false)out+=text('DEAD',cx,cy+r.w*.05,r.w*.14,'middle',r.w*.6);
  else if(plus&&!p?.photo)out+=text('+',cx,cy+r.w*.06,r.w*.20,'middle',r.w*.6);
  if(selected)out+=`<span class="v2-selection-ring" style="${rect(r)}" aria-hidden="true"></span>`;
  if(editable)out+=`<label class="portrait-upload v2-photo-upload" style="${combatPos(cx-rad,cy-rad,rad*2,rad*2)}"><input type="file" accept="image/*" aria-label="Escolher fotografia de perfil" onchange="updateProfilePhoto(this)"></label>`;
  return out;
 }
 // Keep helper consumers (split Boss, etc.) on the same transparent artwork.
 portrait=(p,x,y,w,h,editable=false)=>nativePortrait(p,box(x,y,w,h),{plus:editable,editable});
 artBack=()=>image(one(4,'back'))+hit(box(7,55,46,36),'VOLTAR','goBack()');
 overlayFrame=()=>image({...one(8,'box',5),asset:'box'});
 // The ambient layers live outside #app, so navigation and battle updates never reset them.
 initialiseBackground=()=>{
  const bg=$('ambient-background');
  if(!bg.querySelector('.v2-background-top')){
   bg.style.backgroundImage='none';bg.insertAdjacentHTML('afterbegin',`<div class="v2-nebula"></div><img class="v2-background-top" src="${asset('top')}" alt=""><img class="v2-background-bottom" src="${asset('bottom')}" alt="">`);
   bg.style.setProperty('--fire-image',`url('${asset('nebula')}')`);
  }
  const embers=$('ambient-embers');if(!embers.children.length)embers.innerHTML=Array.from({length:28},(_,i)=>`<span class="ambient-ember" style="--x:${5+(i*37)%90}%;--size:${i%4===0?3:i%2===0?2:1}px;--duration:${10+i%7}s;--delay:-${i*1.7}s;--drift:${(i%2?1:-1)*(8+i*3)}px"></span>`).join('');
 };
 window.v2Login=async()=>{try{await BBBOnline.connect();render();}catch(e){$('online-message').textContent=e.message;}};
 function reconnectButton(){return labelButton('RECONNECT','reconnectPlayer()',one(28,'box',1));}
 welcome=()=>artScene(base(1,{skipText:()=>true})+text(localStorage.getItem('bbb2.username')?'BEM-VINDO':'LOGIN',195,127.01,12.3094)+hit(one(1,'box'),'LOGIN','v2Login()')+hit(one(1,'fight'),'FIGHT',"goto('home',this)")+(localStorage.getItem('bbb2.room')?reconnectButton():''));
 home=()=>artScene(base(3)+hit(one(3,'boss-fight'),'BOSS FIGHT',"goto('fightMode',this)")+hit(one(3,'character'),'CHARACTER',"goto('characters',this)")+(localStorage.getItem('bbb2.room')&&!BBBOnline.snapshot?labelButton('RECONNECT','reconnectPlayer()',box(116.5,710,157,48.8)):''));
 characterRows=(selecting=false)=>{
  let out=base(4,{skipImage:im=>im.asset==='portrait',skipText:()=>true});
  const portraits=images(4,'portrait').sort((a,b)=>a.y-b.y);
  state.characters.forEach((p,i)=>{const r=portraits[i],dy=[0,185.3067,372.4678][i];if(!r)return;
   out+=nativePortrait(p,r,{plus:true})+text(p.name,164.7256,195.6025+dy,23.8325,'start',193,700)+text('NÍVEL '+p.level,164.7256,217.8447+dy,15.6052,'start',193)+text(p.maxHp+' HP',163.9023,252.3389+dy,18.4664,'start',193,700);
   out+=hit(box(24,r.y,343,r.h+12),(selecting?'Escolher ':'')+p.name,selecting?`selectBattleCharacter('${p.id}')`:`choosePrimary('${p.id}')`);
  });return artScene(out+hit(box(7,55,46,36),'VOLTAR','goBack()'));
 };
 character=()=>{
  const p=state.characters.find(p=>p.id===state.primary)||state.characters[0];
  let out=base(5,{skipImage:im=>im.asset==='portrait',skipText:t=>['NOME','25 HP','NÍVEL 2','+','0','2','+1'].includes(t.text)});
  out+=nativePortrait(p,one(5,'portrait'),{plus:true,editable:true});
  out+=`<input class="profile-name-input v2-name-input" style="${combatPos(185.92,148,190,31)};--v2-name-size:${Math.min(23.8325,190/Math.max(1,p.name.length*.65))}" aria-label="Nome da personagem" value="${esc(p.name)}" maxlength="32" autocomplete="off" onfocus="this.select()" onblur="updateCharacterName(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">`;
  out+=text('NÍVEL '+p.level,185.9219,192.5747,15.6052,'start',190)+text(p.maxHp+' HP',97.5,274.7,22.0268)+text(p.points,195,431.1152,40.1703);
  for(const [skill,cx] of [['attack',86.219],['defense',195],['heal',306]])out+=text(p[skill],cx,618.9082,40.1703)+text('+1',cx,654.69,22.3393)+hit(box(cx-43,630,86,40),'Aumentar '+({attack:'Ataque',defense:'Defesa',heal:'Cura'}[skill]),`spend('${skill}')`,{disabled:p.points===0});
  return artScene(out+hit(box(7,55,46,36),'VOLTAR','goBack()'));
 };
 fightMode=()=>artScene(base(6)+hit(one(6,'singleplayer'),'SINGLEPLAYER',"selectFightMode('local',this)")+hit(one(6,'multiplayer'),'MULTIPLAYER',"selectFightMode('multiplayer',this)")+hit(box(7,55,46,36),'VOLTAR','goBack()'));
 function bossTitle(boss,page){const t=L[page].texts.find(t=>t.text.startsWith('BOSS 01'));return t?text('BOSS '+String(boss.number).padStart(2,'0')+' - '+boss.name.toUpperCase(),195,t.y,t.size,'middle',345):'';}
 function bossVideo(boss,im){
  if(!boss.battleVideo)return '';
  const coords=[...(im.clip||'').matchAll(/(-?[\d.]+)\s+(-?[\d.]+)/g)].map(m=>[+m[1],+m[2]]);
  const xs=coords.map(p=>p[0]),ys=coords.map(p=>p[1]),x=coords.length?Math.min(...xs):im.x,y=coords.length?Math.min(...ys):im.y,w=coords.length?Math.max(...xs)-x:im.w,h=coords.length?Math.max(...ys)-y:im.h,clipId='v2video'+(++uid);
  return `<svg class="art-text-layer v2-svg" viewBox="0 0 390 844" preserveAspectRatio="none"><defs><clipPath id="${clipId}"><path d="${im.clip||`M${x} ${y}h${w}v${h}h${-w}Z`}"/></clipPath></defs><foreignObject x="${x}" y="${y}" width="${w}" height="${h}" clip-path="url(#${clipId})"><video xmlns="http://www.w3.org/1999/xhtml" class="battle-boss-video" data-boss-video="${esc(boss.id)}" src="${boss.battleVideo}" poster="${boss.art?bbbAsset(boss.art+'.webp'):bossPlaceholder}" autoplay muted loop playsinline preload="metadata" aria-label="${esc(boss.name)} animado" onerror="this.style.display='none'"></video></foreignObject></svg>`;
 }
 function bossPanel(page,boss,swipe=false){
  const frame=images(page,'box').find(im=>im.w>350),im=one(page,'boss');if(!frame||!im)return '';
  let out=`<div class="boss-position"><div class="boss-slide">${image(frame)}${image(im,boss.art?bbbAsset(boss.art+'.webp'):bossPlaceholder)}${bossVideo(boss,im)}${bossTitle(boss,page)}</div>`;
  if(swipe){const index=BOSS_CATALOG.indexOf(boss);out+=`<div class="boss-swipe-zone v2-boss-swipe" style="${rect(frame)}" role="group" aria-label="Selecionar Boss: ${esc(boss.name)}" onpointerdown="bossSwipeDown(event)" onpointerup="bossSwipeUp(event)" onpointercancel="bossSwipeStart=null"><button class="boss-arrow previous" aria-label="Boss anterior" onclick="changeBoss(-1)" ${index===0?'disabled':''}>‹</button><button class="boss-arrow next" aria-label="Próximo Boss" onclick="changeBoss(1)" ${index===BOSS_CATALOG.length-1?'disabled':''}>›</button></div>`;}
  return out+'</div>';
 }
 function option(r,label,action,selected){return hit(r,label,action,{selected,cls:'v2-option'});}
 setController=x=>{state.controller=x;if(x==='human')localPicker={kind:'boss',selectedId:state.localBossCharacter||state.primary};save();render();};
 window.v2SelectLocal=id=>{
  if(!localPicker)return;localPicker.selectedId=id;
  const dialog=document.querySelector('#modalroot [role="dialog"]');if(!dialog)return;
  dialog.querySelectorAll('.v2-selection-ring').forEach(el=>el.remove());
  dialog.querySelectorAll('button[data-v2-choice]').forEach(el=>{const picked=el.dataset.v2Choice===id;el.classList.toggle('v2-selected',picked);el.setAttribute('aria-pressed',String(picked));});
  const slots=images(localPicker.kind==='boss'?8:9,'portrait').filter(im=>im.i>=19).sort((a,b)=>a.y-b.y),r=slots[state.characters.findIndex(p=>p.id===id)];
  if(r)dialog.insertAdjacentHTML('beforeend',`<span class="v2-selection-ring" style="${rect(r)}" aria-hidden="true"></span>`);
 };
 window.v2ConfirmLocal=()=>{if(!localPicker)return;if(localPicker.kind==='boss')state.localBossCharacter=localPicker.selectedId;else state.multiplayerCharacter=localPicker.selectedId;localPicker=null;save();render();};
 window.v2ClosePicker=()=>{localPicker=null;lobbyCharacterPicker=null;render();};
 party=()=>{
  const boss=selectedBoss(),slots=images(7,'portrait').sort((a,b)=>a.x-b.x);
  let out=base(7,{skipImage:im=>['portrait','boss','fight'].includes(im.asset)||im.asset==='box'&&im.w>350,skipText:t=>t.text==='NOME'||t.text.startsWith('NVL')||t.text.startsWith('BOSS 01')});
  out+=bossPanel(7,boss,true);
  state.characters.forEach((p,i)=>{const r=slots[i],picked=state.chosen.includes(p.id);out+=nativePortrait(p,r,{selected:picked})+text(p.name,r.x+r.w/2,470.8262,12.6672,'middle',105)+text('NVL '+p.level,r.x+r.w/2,480.7403,7.5497)+hit({...r,h:r.h+34},p.name,`pick('${p.id}')`,{selected:picked});});
  const opts=images(7,'box').filter(im=>im.w<150);
  out+=option(opts[0],'FÍSICO',"setMode('physical')",state.mode==='physical')+option(opts[1],'DIGITAL',"setMode('digital')",state.mode==='digital')+option(opts[2],'SIM',"setController('human')",state.controller==='human')+option(opts[3],'NÃO',"setController('game')",state.controller==='game');
  out+=image(one(7,'fight'))+hit(one(7,'fight'),'FIGHT','begin()',{disabled:!boss.available})+hit(box(7,55,46,36),'VOLTAR','goBack()');return artScene(out);
 };
 multiplayerChoice=()=>artScene(base(16)+hit(one(16,'box',0),'NOVA SALA','openNewRoom()')+hit(one(16,'box',1),'ENTRAR',"goto('multiplayerEntry',this)")+hit(box(7,55,46,36),'VOLTAR','goBack()'));
 multiplayerCreate=()=>{
  const boss=selectedBoss();let out=base(17,{skipImage:im=>im.asset==='boss'||im.asset==='box'&&im.w>350,skipText:t=>t.text==='123456'||t.text.startsWith('BOSS 01')});
  out+=bossPanel(17,boss,true)+text(state.newRoomCode||'••••••',189,540.3,34.7063)+hit(images(17,'box').at(-1),'CRIAR','createNewRoom()',{disabled:!boss.available})+hit(box(7,55,46,36),'VOLTAR','goBack()');return artScene(out);
 };
 multiplayerEntry=()=>{
  const code=String(state.multiplayerRoomCode||'').replace(/\D/g,'').slice(0,6),known=roomFromCode(),boss=BOSS_CATALOG.find(b=>b.id===known?.bossId);
  let out=base(22,{skipImage:im=>['boss','portrait'].includes(im.asset),skipText:t=>t.text==='123456'||t.text.startsWith('BOSS 01')});
  const pr=one(22,'portrait');out+=nativePortrait(boss?{photo:boss.art?bbbAsset(boss.art+'.webp'):null}:null,pr)+text(boss?'BOSS '+String(boss.number).padStart(2,'0')+' - '+boss.name.toUpperCase():'?',195,boss?443.306:335,boss?16.5772:38,'middle',340);
  out+=`<input id="v2-room-code" class="v2-room-input" style="${combatPos(66,550,247,52)}" aria-label="Código da dungeon — 6 dígitos" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" autocomplete="off" placeholder="000000" value="${code}" oninput="updateDungeonCode(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();submitDungeonCode()}">`;
  out+=hit(images(22,'box').at(-1),'ENTRAR','submitDungeonCode()',{disabled:code.length!==6,cls:'v2-enter-room'})+hit(box(7,55,46,36),'VOLTAR','goBack()');return artScene(out);
 };
 updateDungeonCode=input=>{const code=input.value.replace(/\D/g,'').slice(0,6);input.value=code;state.multiplayerRoomCode=code;state.dungeonCodeError=false;save();const button=document.querySelector('.v2-enter-room');if(button)button.disabled=code.length!==6;};
 multiplayerLobby=()=>{
  const room=multiplayerRoom;if(!room)return multiplayerEntry();const me=lobbyViewer();if(!me)return multiplayerEntry();
  const host=me.id===room.hostId,page=host?18:23,boss=BOSS_CATALOG.find(b=>b.id===room.bossId)||BOSS_CATALOG[0];
  let out=base(page,{skipImage:im=>['portrait','boss','fight','ready'].includes(im.asset)||im.asset==='box'&&im.w>350,skipText:t=>t.text==='NOME'||t.text.startsWith('NVL')||t.text==='HOST'||t.text==='BOSS'||t.text.startsWith('BOSS 01')});
  out+=bossPanel(page,boss,false);
  const slots=images(page,'portrait').sort((a,b)=>Math.abs(a.y-b.y)>1?a.y-b.y:a.x-b.x);
  slots.forEach((r,i)=>{const member=i===0?room.members.find(m=>m.id===room.bossControllerId):room.members.find(m=>m.seat===i),cx=r.x+r.w/2;
   out+=nativePortrait(member?.character,r,{selected:member?.id===me.id});
   out+=text(i===0?'BOSS':member?.id===room.hostId?'HOST':'',cx,r.y-5.99,8.0283)+text(member?.character.name||(i===0?'AUTO':'LIVRE'),cx,r.y+r.h+12.46,10.8044,'middle',86)+text(member?'NVL '+member.character.level:'',cx,r.y+r.h+20.92,6.4395);
   if(member?.ready)out+=text('✓',r.x+r.w-7,r.y+13,14);
   out+=hit({...r,h:r.h+27},(i===0?'Controlar o Boss':'Lugar de jogador '+i)+(member?' — '+member.character.name:' — livre'),`chooseLobbySeat(${i===0?"'boss'":i})`);
  });
  const opts=images(page,'box').filter(im=>im.w<150);
  out+=option(opts[0],'FÍSICO',"setLobbyDeck('physical')",me.deckMode==='physical')+option(opts[1],'DIGITAL',"setLobbyDeck('digital')",me.deckMode==='digital');
  const button=one(page,host?'fight':'ready');out+=image(button)+hit(button,host?'FIGHT':'READY',host?'confirmLobbyPreparation()':'toggleLobbyReady()',{disabled:host&&!lobbyCanFight(),selected:!host&&me.ready});
  out+=text('CÓDIGO: '+room.code,195,91,10)+`<div class="v2-lobby-note" role="status">${esc(room.message||(!host&&me.ready?'Estás pronto. Aguarda o HOST.':host&&!lobbyCanFight()?'A aguardar READY dos jogadores.':''))}</div>`+hit(box(7,55,46,36),'VOLTAR','goBack()');return artScene(out);
 };
 function characterPicker(kind,players,selected){
  const page=kind==='boss'?8:9;let out=base(page,{overlay:true,skipImage:im=>im.asset==='portrait',skipText:t=>t.text==='NOME'||t.text.startsWith('NVL')||t.text==='pick'});
  images(page,'portrait').filter(im=>im.i>=19).sort((a,b)=>a.y-b.y).forEach((r,i)=>{const p=players[i];if(!p)return;out+=nativePortrait(p,r,{selected:p.id===selected})+text(p.name,195,r.y+r.h+14.31,12.6672,'middle',210)+text('NVL '+p.level,195,r.y+r.h+24.23,7.5497)+hit({...r,h:r.h+30},'Escolher '+p.name,kind==='online'?`selectLobbyCharacter('${p.id}')`:`v2SelectLocal('${p.id}')`,{selected:p.id===selected}).replace('<button ',`<button data-v2-choice="${esc(p.id)}" `);});
  const button=images(page,'box').at(-1);out+=text('PICK',195,682.22,14.3031)+hit(button,'PICK',kind==='online'?'confirmLobbyCharacter()':'v2ConfirmLocal()', {disabled:!players.some(p=>p.id===selected)})+`<button class="v2-cancel-small" onclick="v2ClosePicker()">CANCELAR</button>`;return layer(out,kind==='boss'?'Quem controla o Boss':'Escolher personagem');
 }
 lobbyCharacterOverlay=()=>state.screen==='multiplayerLobby'&&lobbyCharacterPicker?characterPicker('online',lobbyOwnedCharacters(),lobbyCharacterPicker.selectedId):'';
 combatTimeline=()=>{
  const t=b(),seq=t.split?t.split.order.filter(splitEntryActive).map(entry=>entry.child!==undefined?{id:t.split.children[entry.child].key,name:t.split.children[entry.child].name}:t.players.find(p=>p.id===entry.id)):[...live(),{id:'boss',name:bossName(),photo:battleBoss().art?bossImage():null}];
  const current=seq.findIndex(p=>p.id===(actor().splitKey||actor().id)),past=t.completedTurns||[],xs=[22.654,69.961,117.264,164.78,229.904,277.21,324.514];
  return `<div id="turn-strip" class="turn-strip" data-index="${timelineIndex}">`+[-3,-2,-1,0,1,2,3].map((offset,i)=>{
   const id=offset<0?past[past.length+offset]:seq[(Math.max(0,current)+offset)%seq.length]?.id,p=seq.find(p=>p.id===id)||t.players.find(p=>p.id===id)||t.split?.children.find(c=>c.key===id),w=offset===0?60.44:42.12,h=offset===0?65.9:45.93,r=box(xs[i],offset===0?45.13:55.12,w,h);
   return `<div data-turn-key="${id||'empty'}:${timelineIndex+offset}" data-centre="${r.x+w/2}" data-width="${w}" class="combat-turn ${offset<0&&p?'past':''}" aria-label="${offset===0?'Turno atual':'Turno'}: ${esc(p?.name||'')}">${nativePortrait(p,r)}${text(p?.name||'',r.x+w/2,offset===0?119.28:108.37,offset===0?9.83:6.84,'middle',w+4)}</div>`;
  }).join('')+'</div>';
 };
 combatHp=(id,p,x,y,w,h,enemy=false)=>{
  const percent=Math.max(0,Math.min(100,100*p.hp/p.maxHp)),hidden=enemy&&!showBossHp();
  return `<div class="combat-hp v2-hp ${enemy?'enemy':''}" style="${combatPos(x,y,w,h)}" role="progressbar" aria-label="Vida de ${esc(enemy?(p.name||bossName()):p.name)}" aria-valuemin="0" aria-valuemax="${hidden?100:p.maxHp}" aria-valuenow="${hidden?Math.round(percent):p.hp}"><div class="combat-hp-track"><div class="combat-hp-fill" data-hp-id="${id}" data-percent="${percent}" style="width:${percent}%"></div></div><img src="${asset('hp')}" alt="">${enemy?'':`<span class="combat-hp-value">${p.hp} / ${p.maxHp} HP</span>`}</div>`;
 };
 battleScreen=()=>{
  const t=b(),a=actor(),page=t.multiplayer?19:10,isBoss=a.id==='boss',auto=isBoss&&automaticBoss(),boss=battleBoss();
  let out=base(page,{skipImage:im=>['portrait','hp','card','boss','attack','heal'].includes(im.asset)||im.asset==='box'&&im.w>350,skipText:()=>true});
  out+=combatTimeline();
  const frame=images(page,'box').find(im=>im.w>350),im=one(page,'boss');out+=image(frame)+image(im,bossImage());
  out+=bossVideo(boss,im);
  out+=text(bossName().toUpperCase(),195,150.19,20.2524,'middle',350);
  if(t.split){t.split.children.forEach((c,i)=>{out+=combatHp(c.key,c,14.31,312+i*23,361.37,23,true)+text(c.name+(showBossHp()?' '+c.hp+'/'+c.maxHp:''),195,327+i*23,9);});}
  else out+=combatHp('boss',t.boss,14.31,316.12,361.37,29.7,true)+(showBossHp()?text(t.boss.hp+' / '+t.boss.maxHp+' HP',195,355.714,14.13):'');
  if(t.multiplayer){
   const me=t.players.find(p=>p.id===t.viewerId),bossView=t.viewerId===t.bossControllerId;
   if(me)out+=text(me.name,35.8,388.37,12.75,'start',268)+text('NVL '+me.level,320.494,386.92,10.9,'start',52)+combatHp(me.id,me,14.31,387.64,361.37,29.7);
   else out+=text(bossView?'CONTROLO DO BOSS':'A OBSERVAR',195,400,12);
   const others=bossView?t.players:t.players.filter(p=>p.id!==t.viewerId),count=others.length,slots=images(19,'portrait').filter(im=>im.y>400).sort((a,b)=>a.x-b.x);
   others.forEach((p,i)=>{const r=count===7?slots[i]:box(18+354/count*(i+.5)-22.46,422,44.92,48.98);out+=nativePortrait(p,r)+text(p.name,r.x+r.w/2,478.68,6.6749,'middle',50)+text(p.hp+'/'+p.maxHp+' HP',r.x+r.w/2,485.63,6.0127,'middle',50);});
  }else t.players.forEach((p,i)=>{const y=[394.41,438.12,481.82][i];out+=text(p.name,35.8,y+.73,12.75,'start',268)+text('NVL '+p.level,320.494,y-.72,10.9,'start',52)+combatHp(p.id,p,14.31,y,361.37,29.7);});
  const canDraw=t.phase==='draw'&&!auto&&!cardBusy&&canActInBattle(),chain=cardBusy?t.chain.slice(0,-1):t.chain,e=calc();
  out+=`<button class="combat-position combat-deck deck-source" aria-label="${t.mode==='physical'?'Introduzir carta física':'Comprar carta'}" onclick="combatDraw()" ${canDraw?'':'disabled'}>${cardHTML(null,true)}</button><div class="combat-position combat-reveal" id="reveal-slot">${!cardBusy&&chain.length?cardHTML(chain.at(-1)):''}</div><div class="combat-position combat-chain">${chain.length?esc(chain.map(c=>c.v).join(' + ')):''}</div>`;
  const canAttack=canActInBattle()&&(t.phase==='action'||t.phase==='bossAction'&&!auto),bossControls=t.multiplayer?t.viewerId===t.bossControllerId:isBoss;
  if(bossControls&&isBoss){const healing=bossHealingTurn(),r=box(151.74,654.29,86.51,28.43);out+=image({...r,asset:healing?'heal':'attack'})+hit(r,healing?'HEAL':'ATTACK',healing?'combatHeal()':'combatAttack()',{disabled:!canAttack});}
  else{out+=image(one(page,'attack'))+image(one(page,'heal'))+hit(one(page,'attack'),'ATTACK','combatAttack()',{disabled:!canAttack})+hit(one(page,'heal'),'HEAL','combatHeal()',{disabled:t.phase!=='action'||!canActInBattle()});}
  const status=t.outcome?'Batalha terminada':t.phase==='revive'?'Última chance · D20':isDeadSpectator()?'DEAD · A assistir':auto?'O Boss prepara o turno…':t.multiplayer&&!canActInBattle()?'Turno de '+a.name:t.phase==='draw'?(chain.length?'Retira outra carta.':'Toca no baralho para retirar uma carta.'):'Ataque '+(e.base+e.k*2+(a.attack||0))+' · Cura '+(e.base+e.q*2+(a.heal||0));
  out+=`<div class="combat-position combat-status" role="status">${esc(status)}</div><div class="combat-position combat-history" aria-label="Histórico de batalha" aria-live="polite">${t.history.slice(0,3).map(s=>`<div>${historyMarkup(s)}</div>`).join('')}</div>`;
  out+=hit(images(page,'box').at(-1),'FORFEIT','exitBattle()')+text('FORFEIT',195,795.59,14.3031);return artScene(out);
 };
 partyTargetOverlay=kind=>{
  const attacking=kind==='attack',players=b().players,page=players.length<=3?11:attacking?21:20;
  let out=base(page,{overlay:true,skipImage:im=>im.asset==='portrait',skipText:t=>t.text==='NOME'||t.text.includes('/25hp')||t.text==='pick'||attacking&&t.text==='VAIS CURAR?'});
  if(attacking&&page===11)out+=text('VAIS ATACAR?',195,213.67,19.662);
  const slots=images(page,'portrait').filter(im=>im.i>=19).sort((a,b)=>Math.abs(a.y-b.y)>1?a.y-b.y:a.x-b.x);
  players.forEach((p,i)=>{let r=slots[i];if(!r)return;if(players.length===1)r={...r,x:195-r.w/2};
   out+=nativePortrait(p,r,{selected:b().target===p.id})+text(p.name,r.x+r.w/2,r.y+r.h+(page===11?14.31:10.45),page===11?12.6672:9.0717,'middle',r.w+18)+text(p.hp+'/'+p.maxHp+' HP',r.x+r.w/2,r.y+r.h+(page===11?27.6:21.07),page===11?12.6672:9.0717,'middle',r.w+22)+hit({...r,h:r.h+32},p.name+' — '+p.hp+'/'+p.maxHp+' HP',`${attacking?'selectAttackTarget':'selectHealingTarget'}('${p.id}')`,{disabled:!p.alive,selected:b().target===p.id});
  });
  out+=text('PICK',195,682.22,14.3031)+hit(images(page,'box').at(-1),'PICK',attacking?'confirmBossAttack()':'confirmHealing()',{disabled:!players.some(p=>p.id===b().target&&p.alive)})+`<button class="v2-cancel-small" onclick="closeCombatDialog()">CANCELAR</button>`;return layer(out,attacking?'Escolher quem atacar':'Escolher quem curar');
 };
 physicalCardOverlay=()=>{
  const page=12,boss=actor().id==='boss';let out=base(page,{overlay:true,skipText:t=>t.y>350&&t.y<500});
  const values=['2','3','4','5','6','7','8','9','10','J','Q','K','A','JOKER'];values.forEach((v,i)=>{const row=Math.floor(i/5),col=i%5,r=box(96.1+col*42.8,372.5+row*41.49,v==='JOKER'?81:38.4,38.4),disabled=boss&&!activeBossCards().includes(v);out+=`<button class="physical-card-value" style="${rect(r)}" aria-label="Carta ${v==='Q'?'Dama':v}" onclick="chooseCombatCard('${v}')" ${disabled?'disabled':''}>${v==='Q'?'D':v}</button>`;});
  out+=hit(images(page,'box').at(-1),'CANCEL','closeCombatDialog()');return layer(out,'Baralho físico');
 };
 battleResultOverlay=()=>{
  const t=b(),won=t.outcome==='victory',first=t.multiplayer?(t.firstVictoryIds||[]).includes(t.viewerId):(t.firstVictoryIds||[]).length>0,page=won?(first?25:26):24;
  const bossViewer=t.multiplayer&&t.viewerId===t.bossControllerId;
  let out=base(page,{overlay:true,skipImage:im=>['portrait','boss'].includes(im.asset),skipText:tx=>tx.text==='KING MANTIS'||bossViewer&&tx.y>550&&tx.y<610});
  const r=images(page,'portrait').find(im=>im.i>=19),art=images(page,'boss').find(im=>im.i>=19);
  out+=`<div class="result-boss-media" data-result-boss="${esc(battleBoss().id)}:${won?'victory':'defeat'}"><div class="result-boss-photo v2-result-art ${won?'victory':''}">${image(art,bossImage())}</div>${won&&battleBoss().deadArt?`<div class="result-boss-photo v2-result-art victory-dead">${image(art,battleBoss().deadArt)}</div>`:''}</div>`+image(r);
  if(won)out+=text(bossName().toUpperCase(),195,503.53,17.462,'middle',240);
  if(bossViewer&&won)out+=text('A party venceu a dungeon.',195,575.08,17.462,'middle',260);
  if(won&&!t.multiplayer&&first&&(t.firstVictoryIds||[]).length<t.players.length)out+=text('Primeira vitória: recompensa para '+t.firstVictoryIds.length+' personagens.',195,622,7,'middle',260);
  out+=hit(images(page,'box').filter(im=>im.i>=19).find(im=>im.w<150),'MENU','exitBattle()');return layer(out,won?'Vitória':'Derrota');
 };
 disconnectedOverlay=()=>layer(base(27,{overlay:true})+hit(images(27,'box').at(-1),'MENU','leaveDisconnectedBattle()'),'Desconectado');
 reconnectOverlay=()=>layer(reconnectButton(),'Reconectar à dungeon');
 modal=()=>{
  if(localPicker)return characterPicker(localPicker.kind,state.characters,localPicker.selectedId);
  const picker=lobbyCharacterOverlay();if(picker)return picker;
  const overlay=combatOverlay();if(overlay)return overlay;
  const t=b();if(!t||t.phase!=='revive'||!t.pending||!canResolveRevive())return '';
  const result=revivalRoll!==null,ok=result&&revivalRoll>t.pending.damage,page=result&&!ok?14:13;
  let out=base(page,{overlay:true,skipImage:im=>im.asset==='d20',skipText:tx=>tx.text==='18'||tx.text==='8'||tx.text.includes('acima de')||!result&&(tx.y>580&&tx.y<630)||tx.text==='fight'||tx.text==='watch'});
  out+=text('Tens de rolar acima de '+t.pending.damage,195,326.39,14.4343);
  const die=one(page,'d20');out+=`<button class="revive-die v2-die ${rolling?'rolling':''}" style="${rect(die)}" aria-label="${result?'Resultado do D20: '+revivalRoll:'Lançar D20'}" onclick="roll()" ${rolling||result?'disabled':''}><img src="${asset('d20')}" alt=""><span class="d20-face-value">${rolling?'1':''}</span></button>`;
  out+=text(result?revivalRoll:'',195,575.57,56.3456)+text(result?(ok?'FIGHT':'WATCH'):'ROLAR D20',195,667.03,14.3031)+hit(images(page,'box').at(-1),result?(ok?'FIGHT':'WATCH'):'ROLAR D20',result?'closeRevive()':'roll()',{disabled:rolling});return layer(out,'Última chance — D20','revive-art-shade');
 };
 // A small inspection API for local visual regression, never changes room state.
 window.BBBVisual={version:2,artboards:L,template:base,asset,selectBoss:id=>{state.selectedBossId=id;render();}};
 const oldFit=fitScreen,oldName=updateCharacterName;
 const measureScale=()=>document.querySelector('.device').style.setProperty('--v2-scale-x',document.querySelector('.device').clientWidth/390);
 fitScreen=()=>{oldFit();measureScale();};
 updateCharacterName=input=>{oldName(input);input.style.setProperty('--v2-name-size',parseFloat(input.style.fontSize)||23.8325);};
 window.addEventListener('resize',measureScale);
 document.addEventListener('pointerdown',event=>{
  const button=event.target.closest('.v2-hit');if(!button||button.disabled||window.matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const key=button.dataset.v2Art,art=[...document.querySelectorAll('svg[data-v2-art]')].find(el=>el.dataset.v2Art===key);
  art?.animate([{transform:'scale(1)'},{transform:'scale(1.025)'},{transform:'scale(1)'}],{duration:520,easing:'cubic-bezier(.45,0,.55,1)'});
 },true);
 render();
})();
