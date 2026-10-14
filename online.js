/* Transporte Supabase integrado no motor e nos ecrãs originais. */
(() => {
 'use strict';
 const cfg=window.BBB_CONFIG||{}, remembered='bbb2.room', nameKey='bbb2.username';
 const sb=window.supabase?.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'bbb2.auth'}});
 let user=null,current=null,channel=null,poll=null,heartbeat=null,busy=false,connected=false,connecting=null,profileTimer=null,suppressSave=false,detached=false,refreshing=null;
 let profileDirty=false,profileSending=null;
 const originals={save,drawCard,playerAction,bossStrike,bossHeal,roll,closeRevive,exitBattle,scheduleBoss,scheduleBossHit,automaticBoss,canActInBattle,canResolveRevive};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const ownCharacter=()=>state.multiplayerCharacter||state.primary;
 const online=()=>!!b()?.multiplayer;
 function notice(message='') {document.getElementById('online-message').textContent=message;}
 function connection(ok){connected=ok;document.getElementById('online-connection').textContent=ok?'● ONLINE':'● SEM LIGAÇÃO';document.getElementById('online-connection').className=ok?'connected':'offline';}
 async function rpc(fn,args){const {data,error}=await sb.rpc(fn,args);if(error)throw error;return data;}
 function errorMessage(e){const m=e.message||String(e);return /Failed to fetch|fetch failed|NetworkError/.test(m)?'Sem ligação. Verifica a internet e tenta novamente.':m.includes('bbb2_')&&(/schema cache|does not exist/.test(m))?'Multiplayer ainda não ativado. Executa a migração SQL incluída no ZIP.':m.includes('duplicate key')?'Este lugar já está ocupado.':m;}
 function askName(){return new Promise(resolve=>{
  const root=document.getElementById('online-account');root.hidden=false;
  document.getElementById('online-name').focus();
  document.getElementById('online-name-form').onsubmit=e=>{e.preventDefault();const n=document.getElementById('online-name').value.trim();if(!n||n.length>25)return;localStorage.setItem(nameKey,n);root.hidden=true;resolve(n);};
 });}
 async function connect(){
  if(user)return user;if(connecting)return connecting;
  connecting=(async()=>{
   if(!sb)throw Error('Configuração Supabase indisponível.');
   const username=localStorage.getItem(nameKey)||await askName();
   const {data,error}=await sb.auth.getSession();if(error)throw error;
   let session=data.session;
   if(!session){const result=await sb.auth.signInAnonymously();if(result.error)throw result.error;session=result.data.session;}
   user=session.user;
   const result=await sb.from('bbb2_profiles').select('*').eq('user_id',user.id).maybeSingle();if(result.error)throw result.error;
   if(result.data?.characters?.length===3){suppressSave=true;state.characters=result.data.characters;originals.save();suppressSave=false;}
   await rpc('bbb2_profile',{p_username:username,p_characters:state.characters});
   document.getElementById('online-username').textContent=username;connection(true);return user;
  })();
  try{return await connecting;}catch(e){user=null;connection(false);throw e;}finally{connecting=null;}
 }
 function queueProfile(){
  if(!user||suppressSave||online())return;
  profileDirty=true;clearTimeout(profileTimer);profileTimer=setTimeout(()=>flushProfile().catch(e=>notice(errorMessage(e))),700);
 }
 async function flushProfile(){
  if(profileSending)await profileSending;
  if(!profileDirty||!user||online())return;
  profileDirty=false;
  profileSending=rpc('bbb2_profile',{p_username:localStorage.getItem(nameKey),p_characters:clone(state.characters)});
  try{await profileSending;}catch(e){profileDirty=true;throw e;}finally{profileSending=null;}
  if(profileDirty)return flushProfile();
 }
 async function loadProfile(){const {data,error}=await sb.from('bbb2_profiles').select('*').eq('user_id',user.id).single();if(error)throw error;suppressSave=true;state.characters=data.characters;originals.save();suppressSave=false;}
 function apply(data,force=false){
  if(!data?.room||detached)return;
  if(current&&data.room.id===current.room.id&&data.room.revision<current.room.revision)return;
  const presenceChanged=multiplayerRoom&&data.members.some(m=>multiplayerRoom.members.find(old=>old.id===m.user_id)?.disconnected!==(!m.connected||Date.now()-Date.parse(m.last_seen)>45000));
  const changed=force||!current||current.room.id!==data.room.id||current.room.revision!==data.room.revision||presenceChanged;
  const wasOffline=!connected;connection(true);current=data;
  const r=data.room;
  multiplayerRoom={code:r.code,bossId:r.boss_id,hostId:r.host_id,viewerId:user.id,bossControllerId:data.members.find(m=>m.seat===null)?.user_id||null,
   members:data.members.map(m=>({id:m.user_id,character:{...m.character,name:m.username+' · '+m.character.name},username:m.username,seat:m.seat,ready:m.ready,deckMode:m.deck_mode,disconnected:!m.connected||Date.now()-Date.parse(m.last_seen)>45000})),message:''};
  localStorage.setItem(remembered,r.code);state.multiplayerRoomCode=r.code;
  document.getElementById('online-resume').hidden=true;
  if(changed){
   clearTimeout(bossTimer);combatDialog=null;lobbyCharacterPicker=null;cardBusy=false;rolling=false;
   if(r.battle){state.battle=clone(r.battle);b().viewerId=user.id;b().disconnected=false;revivalRoll=b().revivalRoll??null;revealed=b().chain.length>0;timelineIndex=b().timelineIndex||0;state.screen='battle';}
   else {state.battle=null;state.screen='multiplayerLobby';}
   render();if(r.status==='finished')loadProfile().then(render).catch(e=>notice(errorMessage(e)));
  }else if(wasOffline&&online()){b().disconnected=false;render();}
  scheduleOnlineBoss();
 }
 async function refresh(){
  if(!current||detached)return;if(refreshing)return refreshing;
  const id=current.room.id;
  refreshing=(async()=>{
   const data=await rpc('bbb2_get',{p_code:current.room.code});
   if(current?.room.id===id)apply(data);
  })();
  try{await refreshing;}catch(e){connection(false);if(online()){b().disconnected=true;render();}notice(errorMessage(e));}finally{refreshing=null;}
 }
 function stop(){clearInterval(poll);clearInterval(heartbeat);clearTimeout(bossTimer);poll=heartbeat=null;if(channel){sb.removeChannel(channel);channel=null;}}
 function watch(){
  stop();const id=current.room.id;
  channel=sb.channel('bbb2:'+id+':'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'bbb2_rooms',filter:'id=eq.'+id},refresh).on('postgres_changes',{event:'*',schema:'public',table:'bbb2_members',filter:'room_id=eq.'+id},refresh).subscribe(status=>{if(status==='SUBSCRIBED')refresh();});
  poll=setInterval(refresh,2500);
  heartbeat=setInterval(async()=>{
   if(detached||!current)return;
   try{const data=await rpc('bbb2_command',{p_code:current.room.code,p_action:'heartbeat'});apply(data);await advanceAbsent();}catch(e){connection(false);notice(errorMessage(e));}
  },8000);
 }
 async function task(fn){
  if(busy)return;busy=true;notice('A ligar…');
  try{await fn();notice('');}catch(e){notice(errorMessage(e));if(/STALE/.test(e.message))await refresh();}finally{busy=false;if(multiplayerRoom)render();}
 }
 async function send(action,payload={}){
  const code=current.room.code,request=crypto.randomUUID();
  for(let attempt=0;attempt<3;attempt++){
   try{return await rpc('bbb2_command',{p_code:code,p_action:action,p_payload:payload,p_revision:current.room.revision,p_request:request});}
   catch(e){if(!/STALE/.test(e.message)||attempt===2)throw e;apply(await rpc('bbb2_get',{p_code:code}));}
  }
 }
 async function command(action,payload={}){
  if(!current||!connected||detached)return;
  await task(async()=>{
   const data=await send(action,payload);
   apply(data);
  });
 }
 async function enter(code=null){await connect();await flushProfile();detached=false;
  const data=await rpc('bbb2_open',{p_code:code,p_boss:code?null:state.selectedBossId,p_character:ownCharacter()});
  apply(data,true);watch();
 }
 function scheduleOnlineBoss(){
  if(!online()||b().outcome||detached||!connected)return;
  if(actor().id==='boss'&&automaticBoss()&&['draw','bossAction'].includes(b().phase)){
   clearTimeout(bossTimer);bossTimer=setTimeout(()=>command(b().phase==='draw'?'draw':'boss'),1400);
  }
 }
 async function advanceAbsent(){
  if(!online()||b().outcome)return;
  const uid=b().phase==='revive'?b().pending?.id:actor().id;
  if(uid==='boss'){scheduleOnlineBoss();return;}
  if(multiplayerRoom.members.find(m=>m.id===uid)?.disconnected)await command('timeout');
 }
 async function leaveView(){stop();detached=true;current=null;multiplayerRoom=null;state.battle=null;combatDialog=null;state.screen='home';document.getElementById('online-resume').hidden=!localStorage.getItem(remembered);render();}
 async function leaveRoom(){
  if(current&&connected){await send('leave');if(current.room.status!=='playing')localStorage.removeItem(remembered);}
  await leaveView();
 }
 // Os mesmos controlos do jogo passam a enviar intenções ao servidor.
 save=()=>{originals.save();queueProfile();};
 multiplayerPreviewTools=()=>'';
 saveReconnectSession=()=>{};restoreReconnectSession=()=>false;
 openNewRoom=()=>task(async()=>{await connect();state.newRoomCode='••••••';goto('multiplayerCreate');});
 createNewRoom=()=>task(()=>enter());
 submitDungeonCode=()=>task(async()=>{if(!/^[0-9]{6}$/.test(state.multiplayerRoomCode||''))throw Error('Introduz um código com 6 dígitos.');await enter(state.multiplayerRoomCode);});
 roomFromCode=()=>current&&current.room.code===state.multiplayerRoomCode?{bossId:current.room.boss_id}:null;
 lobbyOwnedCharacters=()=>state.characters;
 chooseLobbySeat=seat=>{if((seat==='boss'?multiplayerRoom?.bossControllerId:multiplayerRoom?.members.find(p=>p.seat===seat)?.id)===user?.id){openLobbyCharacterPicker();return;}return command('lobby',{seat});};
 confirmLobbyCharacter=()=>{if(!lobbyCharacterPicker)return;const character=lobbyCharacterPicker.selectedId;lobbyCharacterPicker=null;state.multiplayerCharacter=character;originals.save();command('lobby',{character});};
 setLobbyDeck=deckMode=>command('lobby',{deckMode});
 toggleLobbyReady=()=>command('lobby',{ready:!lobbyViewer()?.ready});
 lobbyCanFight=()=>!!multiplayerRoom&&multiplayerRoom.hostId===user?.id&&multiplayerRoom.members.some(m=>m.seat!==null)&&multiplayerRoom.members.every(m=>!m.disconnected&&(m.id===user.id||m.ready));
 startMultiplayerBattle=confirmLobbyPreparation=()=>command('start');
 drawCard=(value,automatic)=>online()?command('draw',{value}):originals.drawCard(value,automatic);
 playerAction=type=>online()?command(type,{target:b().target,bossKey:b().attackBossKey}):originals.playerAction(type);
 bossStrike=automatic=>online()?command('boss',{target:b().target}):originals.bossStrike(automatic);
 bossHeal=automatic=>online()?command('boss'):originals.bossHeal(automatic);
 roll=()=>online()?command('revive'):originals.roll();
 closeRevive=()=>online()?command('revive_continue'):originals.closeRevive();
 automaticBoss=()=>online()?(!b().bossControllerId||!!multiplayerRoom?.members.find(m=>m.id===b().bossControllerId)?.disconnected):originals.automaticBoss();
 canActInBattle=()=>online()?connected&&!busy&&!detached&&!b().disconnected&&!isDeadSpectator()&&(actor().id==='boss'?b().viewerId===b().bossControllerId&&!automaticBoss():actor().id===b().viewerId):originals.canActInBattle();
 canResolveRevive=()=>online()?connected&&!busy&&!detached&&b().pending?.id===user?.id:originals.canResolveRevive();
 scheduleBoss=ms=>online()?scheduleOnlineBoss():originals.scheduleBoss(ms);
 scheduleBossHit=ms=>online()?scheduleOnlineBoss():originals.scheduleBossHit(ms);
 simulateDisconnect=exitBattle=()=>online()?task(leaveRoom):originals.exitBattle();
 reconnectPlayer=async()=>{await task(()=>enter(localStorage.getItem(remembered)));const p=b()?.players.find(p=>p.id===user?.id);if(p?.pendingRevive&&b().phase!=='revive')await command('resume_revive');};
 leaveDisconnectedBattle=()=>leaveView();
 const back=goBack;
 goBack=()=>state.screen==='multiplayerLobby'?task(leaveRoom):back();
 // Controles de conta discretos, fora da arte original.
 document.body.insertAdjacentHTML('beforeend',`<div id="online-bar"><span id="online-username"></span><span id="online-connection"></span><button id="online-resume" hidden>REENTRAR</button></div><div id="online-message" role="status" aria-live="polite"></div><div id="online-account" hidden><form id="online-name-form"><h2>O TEU USERNAME</h2><p>Escolhe uma vez. A tua conta e personagens ficam guardadas neste dispositivo.</p><input id="online-name" maxlength="25" required autocomplete="nickname" aria-label="Username"><button type="submit">CONTINUAR</button></form></div>`);
 document.getElementById('online-resume').onclick=reconnectPlayer;
 document.getElementById('online-resume').hidden=!localStorage.getItem(remembered);
 window.addEventListener('offline',()=>{connection(false);if(online()){b().disconnected=true;render();}notice('Sem internet. A sala fica guardada para reconectar.');});
 window.addEventListener('online',()=>{if(current)rpc('bbb2_command',{p_code:current.room.code,p_action:'heartbeat'}).then(apply).catch(e=>notice(errorMessage(e)));else connection(false);});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&current)rpc('bbb2_command',{p_code:current.room.code,p_action:'heartbeat'}).then(apply).catch(e=>notice(errorMessage(e)));});
 window.BBBOnline={connect,enter,command,refresh,leave:leaveRoom,get snapshot(){return current;},get user(){return user;}};
 if(localStorage.getItem(nameKey)){connect().then(()=>{const code=localStorage.getItem(remembered);if(code)return enter(code);}).catch(e=>notice(errorMessage(e)));}
 if(new URLSearchParams(location.search).get('mode')==='multiplayer'){state.screen='multiplayerChoice';state.playMode='multiplayer';}
 render();
})();
