const {close}=await import('./local-server.mjs');
import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs';
const browser=await chromium.launch({headless:true,...(process.env.BBB_CHROME_PATH?{executablePath:process.env.BBB_CHROME_PATH}:{})}),context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));let checks=0;
const ready=fn=>page.waitForFunction(fn,{},{timeout:12000});
try{
 await page.goto('http://127.0.0.1:4173/BBB---BigBossBattle/');await ready(()=>!!window.BBBVisual);
 // Navegação real por cliques nos recortes transparentes.
 await page.getByRole('button',{name:'FIGHT',exact:true}).click();await ready(()=>state.screen==='home');
 await page.getByRole('button',{name:'CHARACTER',exact:true}).click();await ready(()=>state.screen==='characters');
 const charName=await page.evaluate(()=>state.characters[0].name);
 await page.getByRole('button',{name:charName,exact:true}).click();await ready(()=>state.screen==='character');
 await page.getByRole('textbox',{name:'Nome da personagem'}).fill('Herói visual');await page.getByRole('textbox',{name:'Nome da personagem'}).press('Enter');assert.equal(await page.evaluate(()=>state.characters[0].name),'Herói visual');checks++;
 const before=await page.evaluate(()=>state.characters[0].attack);await page.getByRole('button',{name:'Aumentar Ataque',exact:true}).click();assert.equal(await page.evaluate(()=>state.characters[0].attack),before+1);checks++;
 await page.getByRole('button',{name:'VOLTAR',exact:true}).click();await ready(()=>state.screen==='characters');await page.getByRole('button',{name:'VOLTAR',exact:true}).click();await ready(()=>state.screen==='home');
 await page.getByRole('button',{name:'BOSS FIGHT',exact:true}).click();await ready(()=>state.screen==='fightMode');await page.getByRole('button',{name:'SINGLEPLAYER',exact:true}).click();await ready(()=>state.screen==='party');
 await page.getByRole('button',{name:'Próximo Boss',exact:true}).click();await ready(()=>selectedBoss().id==='boss-02');assert(await page.locator('image').evaluateAll(xs=>xs.some(x=>(x.getAttribute('href')||'').includes('stone-golem'))));checks++;
 await page.getByRole('button',{name:'Boss anterior',exact:true}).click();await ready(()=>selectedBoss().id==='mantis');
 // Seleção do controlador humano, baralho físico e popup de carta.
 await page.getByRole('button',{name:'SIM',exact:true}).click();await page.getByRole('dialog',{name:'Quem controla o Boss'}).waitFor();
 await page.getByRole('button',{name:'PICK',exact:true}).click();assert.equal(await page.evaluate(()=>state.localBossCharacter),await page.evaluate(()=>state.primary));checks++;
 await page.getByRole('button',{name:'NÃO',exact:true}).click();await page.getByRole('button',{name:'FÍSICO',exact:true}).click();await page.getByRole('button',{name:'FIGHT',exact:true}).click();await ready(()=>state.screen==='battle');
 await page.getByRole('button',{name:'Introduzir carta física',exact:true}).click();await page.getByRole('dialog',{name:'Baralho físico'}).waitFor();await page.getByRole('button',{name:'Carta 4',exact:true}).click();await ready(()=>b().phase==='action'&&!cardBusy);
 assert.equal(await page.evaluate(()=>b().chain[0].v),'4');checks++;
 await page.getByRole('button',{name:'HEAL',exact:true}).click();await page.getByRole('dialog',{name:'Escolher quem curar'}).waitFor();
 const healName=await page.evaluate(()=>b().players[0].name+' — '+b().players[0].hp+'/'+b().players[0].maxHp+' HP');await page.getByRole('button',{name:healName,exact:true}).click();await page.getByRole('button',{name:'PICK',exact:true}).click();await ready(()=>!combatDialog);checks++;
 // Metadados e continuidade do vídeo através de renders sucessivos.
 await ready(()=>document.querySelector('.battle-boss-video')?.readyState>=2);await ready(()=>document.querySelector('.battle-boss-video').currentTime>.3);
 const media=await page.evaluate(()=>{const v=document.querySelector('video');window.keptVideo=v;window.keptTime=v.currentTime;render();return {same:v===document.querySelector('video'),muted:v.muted,loop:v.loop,inline:v.playsInline,duration:v.duration};});assert(media.same&&media.muted&&media.loop&&media.inline);assert.equal(media.duration,40);checks+=2;
 await ready(()=>document.querySelector('video')===keptVideo&&!keptVideo.paused&&keptVideo.currentTime>keptTime+.2);checks++;
 // D20 mantém ação/resultado reais; não se reduz a uma imagem do ecrã.
 await page.evaluate(()=>{clearTimeout(bossTimer);b().phase='revive';b().pending={id:b().players[0].id,damage:14};revivalRoll=null;rolling=false;render();});
 await page.getByRole('button',{name:'Lançar D20',exact:true}).click();await ready(()=>revivalRoll!==null&&!rolling);const die=await page.evaluate(()=>revivalRoll);assert(die>=1&&die<=20);checks++;
 await page.getByRole('button',{name:die>14?'FIGHT':'WATCH',exact:true}).click();await ready(()=>b().phase!=='revive');checks++;
 // A barra, os nomes e os recortes usam a viewport real, sem a margem herdada.
 for(const viewport of [{width:360,height:740},{width:390,height:844},{width:430,height:932}]){
  await page.setViewportSize(viewport);await page.evaluate(()=>{clearTimeout(bossTimer);state.screen='home';state.battle=null;render();});
  const bounds=await page.evaluate(()=>{const a=$('app').getBoundingClientRect(),s=document.querySelector('.art-screen').getBoundingClientRect(),b=document.querySelector('.v2-background-top');return {app:[a.width,a.height],art:[s.width,s.height],top:!!b,embers:$('ambient-embers').children.length};});
  assert.deepEqual(bounds.app,[viewport.width,viewport.height]);assert.deepEqual(bounds.art,bounds.app);assert(bounds.top&&bounds.embers===28);checks+=3;
 }
 assert.deepEqual(errors,[]);checks++;
 fs.writeFileSync('test-results/layout-v2.json',JSON.stringify({result:'passed',checks,viewports:['360x740','390x844','430x932'],pageErrors:errors,video:media},null,2));console.log('Visual layout + actual controls:',checks,'checks OK');
}finally{await browser.close();await close();}
