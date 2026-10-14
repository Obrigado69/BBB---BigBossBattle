import {server,close,sessions} from './local-server.mjs';
import {db,rpc} from './check-sql.mjs';
import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs';
const browser=await chromium.launch({headless:true,...(process.env.BBB_CHROME_PATH?{executablePath:process.env.BBB_CHROME_PATH}:{})});
const c1=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
const c2=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
const p1=await c1.newPage(),p2=await c2.newPage();const errors=[];
for(const p of [p1,p2])p.on('pageerror',e=>errors.push(e.message));
fs.mkdirSync('test-results',{recursive:true});
const wait=async(p,fn)=>p.waitForFunction(fn,{},{timeout:12000});
const evalp=(p,fn)=>p.evaluate(fn);
async function setup(p,name){await p.goto('http://127.0.0.1:4173/BBB---BigBossBattle/');await p.evaluate(()=>{state.screen='multiplayerChoice';state.playMode='multiplayer';render();});await p.getByRole('button',{name:'NOVA SALA',exact:true}).click();await p.getByRole('textbox',{name:'Username',exact:true}).fill(name);await p.getByRole('button',{name:'CONTINUAR',exact:true}).click();await wait(p,()=>state.screen==='multiplayerCreate');}
try{
 await setup(p1,'Ricardo');await p1.getByRole('button',{name:'CRIAR',exact:true}).click();await wait(p1,()=>state.screen==='multiplayerLobby');
 const code=await evalp(p1,()=>multiplayerRoom.code);console.log('Browser A room:',code);
 await p2.goto('http://127.0.0.1:4173/BBB---BigBossBattle/');await p2.evaluate(()=>{state.screen='multiplayerEntry';state.playMode='multiplayer';render();});
 await p2.getByRole('textbox',{name:'Código da dungeon — 6 dígitos'}).fill(code);
 await p2.getByRole('button',{name:'ENTRAR',exact:true}).click();await p2.getByRole('textbox',{name:'Username',exact:true}).fill('Ana');await p2.getByRole('button',{name:'CONTINUAR',exact:true}).click();await wait(p2,()=>state.screen==='multiplayerLobby');
 assert.notEqual(await evalp(p1,()=>BBBOnline.user.id),await evalp(p2,()=>BBBOnline.user.id));
 await wait(p1,()=>multiplayerRoom.members.length===2);
 await p2.getByRole('button',{name:'READY',exact:true}).click();await wait(p1,()=>lobbyCanFight());
 await p1.getByRole('button',{name:'FIGHT',exact:true}).click();await wait(p1,()=>b()?.phase==='draw');await wait(p2,()=>state.screen==='battle');
 // Dano previsível para verificar igualdade sem depender do sorteio.
 const snap=await evalp(p1,()=>BBBOnline.snapshot);const uid1=await evalp(p1,()=>BBBOnline.user.id),uid2=await evalp(p2,()=>BBBOnline.user.id);
 await db.query("update private.bbb2_states set battle=jsonb_set(battle,$2,$3) where room_id=$1",[snap.room.id,['decks',uid1],JSON.stringify([{v:'3',s:'♠'}])]);
 await p1.evaluate(()=>drawCard());await wait(p1,()=>b()?.phase==='action');await wait(p2,()=>b()?.phase==='action');
 assert.equal(await evalp(p1,()=>canActInBattle()),true);assert.equal(await evalp(p2,()=>canActInBattle()),false);
 await p2.evaluate(()=>BBBOnline.command('attack'));assert.match(await p2.locator('#online-message').innerText(),/Não é o teu turno/);
 await p1.evaluate(()=>playerAction('attack'));await wait(p2,()=>b()?.turn===1);
 assert.deepEqual(await evalp(p1,()=>({hp:b().boss.hp,chain:b().chain,turn:b().turn})),await evalp(p2,()=>({hp:b().boss.hp,chain:b().chain,turn:b().turn})));
 await p1.screenshot({path:'test-results/combate-sessao-A.png'});await p2.screenshot({path:'test-results/combate-sessao-B.png'});
 // Falha de rede e reload mantém conta, lugar, personagem e estado.
 await c2.setOffline(true);await wait(p2,()=>b()?.disconnected);await c2.setOffline(false);await p2.reload();await wait(p2,()=>state.screen==='battle'&&!b().disconnected);
 assert.equal(await evalp(p2,()=>BBBOnline.user.id),uid2);assert.equal(await evalp(p2,()=>b().turn),1);assert.equal(await evalp(p2,()=>document.getElementById('online-username').textContent),'Ana');
 // Boss automático faz draw e ataque sem ação de HOST.
 await db.query("update private.bbb2_states set battle=jsonb_set(battle,$2,$3) where room_id=$1",[snap.room.id,['decks',uid2],JSON.stringify([{v:'2',s:'♥'}])]);
 await p2.evaluate(()=>drawCard());await wait(p2,()=>b().phase==='action');await p2.evaluate(()=>{b().target=b().players[0].id;return playerAction('heal');});
 await wait(p1,()=>b().round>=2);await wait(p2,()=>b().round>=2);
 assert.deepEqual(await evalp(p1,()=>({hp:b().players.map(x=>x.hp),boss:b().boss,round:b().round,phase:b().phase})),await evalp(p2,()=>({hp:b().players.map(x=>x.hp),boss:b().boss,round:b().round,phase:b().phase})));
 // Sair deixa sessão reconectável e a outra continua.
 await p2.evaluate(()=>BBBOnline.leave());await wait(p2,()=>state.screen==='home');await p2.evaluate(()=>reconnectPlayer());await wait(p2,()=>state.screen==='battle');
 // PWA em subdiretório, shell offline e Singleplayer original.
 const manifest=await p1.evaluate(async()=>fetch('manifest.webmanifest').then(r=>r.json()));assert.equal(manifest.display,'fullscreen');assert.equal(manifest.scope,'./');
 await p2.evaluate(()=>BBBOnline.leave());await p2.evaluate(()=>{state.playMode='local';state.chosen=[state.primary];state.selectedBossId='boss-04';state.screen='party';render();begin();});await wait(p2,()=>b()&&!b().multiplayer&&state.screen==='battle');assert.equal(await evalp(p2,()=>b().boss.id),'boss-04');
 await p2.evaluate(()=>navigator.serviceWorker.ready);await wait(p2,()=>!!navigator.serviceWorker.controller);
 await c2.setOffline(true);await p2.reload();await wait(p2,()=>typeof render==='function');assert.equal(await evalp(p2,()=>BOSS_CATALOG.length),4);
 await p2.evaluate(()=>{state.playMode='local';state.chosen=[state.primary];state.selectedBossId='boss-04';state.screen='party';render();begin();});await wait(p2,()=>b()&&!b().multiplayer&&state.screen==='battle');
 while(await evalp(p2,()=>b().phase==='draw')){await p2.evaluate(()=>drawCard());await p2.waitForTimeout(1150);}
 await p2.evaluate(()=>playerAction('attack'));assert(await evalp(p2,()=>b().boss.hp<300));
 await p2.screenshot({path:'test-results/singleplayer-offline.png'});
 // Segunda batalha: sessão B assume Boss humano; fallback automático quando sai.
 await c2.setOffline(false);await p1.evaluate(()=>BBBOnline.leave());
 await p1.evaluate(()=>{state.selectedBossId='boss-03';return BBBOnline.enter();});await wait(p1,()=>state.screen==='multiplayerLobby');
 const code2=await evalp(p1,()=>multiplayerRoom.code);await p2.evaluate(code=>BBBOnline.enter(code),code2);
 await p2.getByRole('button',{name:/Controlar o Boss/}).click();await wait(p2,()=>multiplayerRoom.bossControllerId===BBBOnline.user.id);
 await p2.getByRole('button',{name:'READY',exact:true}).click();await wait(p1,()=>lobbyCanFight());await p1.getByRole('button',{name:'FIGHT',exact:true}).click();await wait(p2,()=>state.screen==='battle');
 const snap2=await evalp(p1,()=>BBBOnline.snapshot);
 async function fixCard(key,value){await db.query('update private.bbb2_states set battle=jsonb_set(battle,$2,$3) where room_id=$1',[snap2.room.id,['decks',key],JSON.stringify([{v:value,s:'♠'}])]);}
 await fixCard(uid1,'2');await fixCard('boss','3');await p1.evaluate(()=>drawCard());await wait(p1,()=>b().phase==='action');await p1.evaluate(()=>playerAction('attack'));await wait(p2,()=>actor().id==='boss'&&b().phase==='draw');
 assert.equal(await evalp(p2,()=>canActInBattle()),true);assert.equal(await evalp(p1,()=>canActInBattle()),false);
 await p2.evaluate(()=>drawCard());await wait(p2,()=>b().phase==='bossAction');await p2.evaluate(()=>{b().target=b().players[0].id;return bossStrike();});await wait(p1,()=>b().round===2);assert.equal(await evalp(p1,()=>b().players[0].hp),22);
 await p2.screenshot({path:'test-results/boss-humano.png'});
 await p2.evaluate(()=>BBBOnline.leave());await fixCard(uid1,'2');await fixCard('boss','3');await p1.evaluate(()=>drawCard());await wait(p1,()=>b().phase==='action');await p1.evaluate(()=>playerAction('attack'));await wait(p1,()=>b().round>=3);
 assert.equal(await evalp(p1,()=>automaticBoss()),true);
 assert.deepEqual(errors,[]);console.log('Two isolated browser sessions: lobby, READY, battle, automatic + human Boss, fallback, reconnect, persisted username, PWA/offline, Singleplayer: OK');
 fs.writeFileSync('test-results/browser.json',JSON.stringify({result:'passed',independentAccounts:[uid1,uid2],roomCode:code,pageErrors:errors,transport:'Local Auth/PostgREST adapter + real PostgreSQL SQL, polling fallback; no hosted Supabase tested'},null,2));
}catch(e){console.error('Browser failure:',e.message);for(const [i,p]of [p1,p2].entries()){console.error('Session',i,await p.evaluate(()=>({screen:state.screen,battle:b(),room:multiplayerRoom,status:document.getElementById('online-message').textContent})));await p.screenshot({path:'test-results/failure-'+i+'.png'});}throw e;}finally{await browser.close();await close();}
