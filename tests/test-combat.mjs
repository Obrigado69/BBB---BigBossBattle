import {db,rpc,ids,characters} from './check-sql.mjs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
let count=0;
const command=(u,r,a,p={},request=randomUUID())=>rpc(u,'bbb2_command',[r.room.code,a,JSON.stringify(p),r.room.revision,request]);
async function fail(fn,pattern){await assert.rejects(fn,pattern);count++;}
async function room(boss='mantis',human=false){
 let r=await rpc(ids[0],'bbb2_open',[null,boss,'p1']);r=await rpc(ids[1],'bbb2_open',[r.room.code,null,'p1']);
 if(human)r=await command(ids[1],r,'lobby',{seat:'boss'});
 r=await command(ids[1],r,'lobby',{ready:true});
 return command(ids[0],r,'start');
}
async function edit(r,fn){const {rows}=await db.query('select battle from private.bbb2_states where room_id=$1',[r.room.id]);const t=rows[0].battle;fn(t);await db.query('update private.bbb2_states set battle=$2 where room_id=$1',[r.room.id,JSON.stringify(t)]);await db.query("update public.bbb2_rooms set battle=$2::jsonb-'decks' where id=$1",[r.room.id,JSON.stringify(t)]);r.room.battle=JSON.parse(JSON.stringify(t));delete r.room.battle.decks;return r;}
function nextCard(t,id,value){t.decks[id]=[{v:value,s:'♠'}];}
let r=await room();assert.equal(r.room.battle.players.length,2);assert.equal(r.room.battle.boss.maxHp,75);assert(!r.room.battle.decks);count+=3;
await fail(()=>command(ids[1],r,'draw'),/Não é o teu turno/);
await fail(()=>command(ids[2],r,'draw'),/Não pertences/);
await fail(()=>command(ids[0],r,'attack'),/Ação inválida/);
r=await edit(r,t=>{t.decks[ids[0]]=[{v:'JOKER'},{v:'K'},{v:'J'},{v:'Q'},{v:'A'}];});
for(let i=0;i<5;i++)r=await command(ids[0],r,'draw');assert.equal(r.room.battle.phase,'action');count++;
const rev=r.room.revision,req=randomUUID();r=await command(ids[0],r,'attack',{},req);
assert.equal(r.room.battle.boss.hp,49);assert.equal(r.room.battle.players[0].guard,2);count+=2;
const retried=await rpc(ids[0],'bbb2_command',[r.room.code,'attack','{}',rev,req]);assert.equal(retried.room.revision,r.room.revision);count++;
await fail(()=>rpc(ids[1],'bbb2_command',[r.room.code,'draw','{}',rev,randomUUID()]),/STALE/);
r=await edit(r,t=>{t.players[0].hp=10;nextCard(t,ids[1],'10');});r=await command(ids[1],r,'draw');r=await command(ids[1],r,'heal',{target:ids[0]});assert.equal(r.room.battle.players[0].hp,20);assert.equal(r.room.battle.turn,2);count+=2;
r=await edit(r,t=>nextCard(t,'boss','A'));r=await command(ids[0],r,'draw');r=await command(ids[1],r,'boss');assert.equal(r.room.battle.round,2);count++;
// Human Boss: adversário não pode controlar nem escolher carta digital.
r=await room('boss-02',true);r=await edit(r,t=>{t.turn=1;nextCard(t,'boss','4');});
await fail(()=>command(ids[0],r,'draw'),/controlador/);
r=await command(ids[1],r,'draw',{value:'A'});assert.equal(r.room.battle.chain[0].v,'4');count++;
r=await command(ids[1],r,'boss',{target:ids[0]});assert.equal(r.room.battle.players[0].hp,21);count++;
// AOE abaixo de metade e alternância normal/AOE.
r=await edit(r,t=>{t.turn=1;t.phase='bossAction';t.chain=[{v:'3'}];t.boss.hp=60;});r=await command(ids[1],r,'boss');assert.equal(r.room.battle.boss.nextAoe,false);count++;
// Boss 3: duas curas na ronda 3 e fúria fica latched.
r=await room('boss-03',true);r=await edit(r,t=>{t.turn=1;t.round=3;t.boss.hp=20;t.boss.doubleDamage=true;t.phase='bossAction';t.chain=[{v:'A'}];});
r=await command(ids[1],r,'boss');assert.equal(r.room.battle.boss.hp,32);assert.equal(r.room.battle.phase,'draw');count+=2;
r=await edit(r,t=>nextCard(t,'boss','A'));r=await command(ids[1],r,'draw');r=await command(ids[1],r,'boss');assert.equal(r.room.battle.boss.hp,44);assert.equal(r.room.battle.boss.healingCompleteRound,3);assert.equal(r.room.battle.boss.doubleDamage,true);count+=3;
// Boss 4: split e cartas AOE limitadas; partida com um jogador.
r=await room('boss-04',true);r=await edit(r,t=>{t.boss.hp=151;t.phase='action';t.chain=[{v:'2'}];});r=await command(ids[0],r,'attack');assert.equal(r.room.battle.split.children.length,2);assert.equal(r.room.battle.boss.hp,200);assert.equal(r.room.battle.split.order.length,3);count+=3;
r=await command(ids[1],r,'draw');assert(['2','3','4','5','6'].includes(r.room.battle.chain[0].v));count++;
r=await command(ids[1],r,'boss');assert.equal(r.room.battle.turn,1);count++;
// D20: pertence à vítima, valor no servidor, repetição rejeitada.
r=await room('mantis',true);r=await edit(r,t=>{t.turn=1;t.phase='bossAction';t.chain=[{v:'A'}];t.players[0].hp=1;});r=await command(ids[1],r,'boss',{target:ids[0]});assert.equal(r.room.battle.phase,'revive');count++;
await fail(()=>command(ids[1],r,'revive'),/outro jogador/);
r=await command(ids[0],r,'revive');assert(r.room.battle.revivalRoll>=1&&r.room.battle.revivalRoll<=20);count++;
await fail(()=>command(ids[0],r,'revive'),/já lançado/);
r=await command(ids[0],r,'revive_continue');assert.notEqual(r.room.battle.phase,'revive');count++;
// Reentrar em combate preserva HP e ficha original. Nova conta não entra depois do start.
r=await room();const originalHp=r.room.battle.players[1].hp;
await fail(()=>rpc(ids[2],'bbb2_open',[r.room.code,null,'p1']),/já começou/);
r=await rpc(ids[1],'bbb2_open',[r.room.code,null,'p3']);assert.equal(r.room.battle.players[1].hp,originalHp);assert.equal(r.room.battle.players[1].sourceCharacterId,'p1');count+=2;
// Timeout apenas após desconexão, fallback do humano e takeover do host do lobby.
await fail(()=>command(ids[1],r,'timeout'),/ainda ligado/);
await db.query("update public.bbb2_members set last_seen=now()-interval '46 seconds' where room_id=$1 and user_id=$2",[r.room.id,ids[0]]);
r=await command(ids[1],r,'timeout');assert.equal(r.room.battle.turn,1);count++;
r=await room('mantis',true);r=await command(ids[1],r,'leave');r=await edit(r,t=>{t.turn=1;nextCard(t,'boss','3');});r=await command(ids[0],r,'draw');r=await command(ids[0],r,'boss');assert.equal(r.room.battle.players[0].hp,22);count++;
// Vitória: recompensa uma vez, persistida na personagem da conta.
r=await room('mantis',true);r=await edit(r,t=>{t.phase='action';t.chain=[{v:'A'}];t.boss.hp=1;});r=await command(ids[0],r,'attack');assert.equal(r.room.status,'finished');const profile=await rpc(ids[0],'bbb2_profile',['Conta 1',null]);assert.equal(profile.characters[0].level,2);assert.equal(profile.characters[0].defeated[0],'mantis');count+=3;
await fail(()=>command(ids[0],r,'attack'),/terminado/);
// Baralho físico validado; lugar único, READY invalidado por alterações e troca de HOST.
let lobby=await rpc(ids[0],'bbb2_open',[null,'mantis','p1']);lobby=await rpc(ids[1],'bbb2_open',[lobby.room.code,null,'p1']);
await fail(()=>command(ids[1],lobby,'lobby',{seat:1}),/unique constraint/);
lobby=await command(ids[1],lobby,'lobby',{ready:true});lobby=await command(ids[1],lobby,'lobby',{deckMode:'physical'});assert.equal(lobby.members.find(m=>m.user_id===ids[1]).ready,false);count++;
await fail(()=>command(ids[0],lobby,'start'),/READY/);
lobby=await command(ids[0],lobby,'leave');assert.equal(lobby.room.host_id,ids[1]);count++;
lobby=await command(ids[1],lobby,'start');await fail(()=>command(ids[1],lobby,'draw',{value:'99'}),/física inválida/);
lobby=await command(ids[1],lobby,'draw',{value:'A'});assert.equal(lobby.room.battle.chain[0].v,'A');count++;
// Capacidade: 7 jogadores + 1 Boss humano; lotação/colisões são serializadas.
let full=await rpc(ids[0],'bbb2_open',[null,'mantis','p1']);
const extra=[];for(let i=0;i<8;i++){const id=randomUUID();extra.push(id);await db.query('insert into auth.users values($1)',[id]);await rpc(id,'bbb2_profile',['Extra '+i,JSON.stringify(characters())]);}
for(let i=0;i<6;i++)full=await rpc(extra[i],'bbb2_open',[full.room.code,null,'p1']);
await fail(()=>rpc(extra[6],'bbb2_open',[full.room.code,null,'p1']),/cheios/);
full=await command(ids[0],full,'lobby',{seat:'boss'});full=await rpc(extra[6],'bbb2_open',[full.room.code,null,'p1']);assert.equal(full.members.length,8);count++;
await fail(()=>rpc(extra[7],'bbb2_open',[full.room.code,null,'p1']),/cheios/);
// Desconexão na última chance: D20 pendente recuperado pelo dono fora do seu turno.
r=await rpc(ids[0],'bbb2_open',[null,'mantis','p1']);r=await rpc(ids[1],'bbb2_open',[r.room.code,null,'p1']);r=await rpc(ids[2],'bbb2_open',[r.room.code,null,'p1']);
r=await command(ids[2],r,'lobby',{seat:'boss'});r=await command(ids[2],r,'lobby',{ready:true});r=await command(ids[1],r,'lobby',{ready:true});r=await command(ids[0],r,'start');
r=await edit(r,t=>{t.turn=2;t.phase='bossAction';t.chain=[{v:'A'}];t.players[0].hp=1;});r=await command(ids[2],r,'boss',{target:ids[0]});
await db.query("update public.bbb2_members set connected=false where room_id=$1 and user_id=$2",[r.room.id,ids[0]]);
r=await command(ids[1],r,'timeout');assert(r.room.battle.players[0].pendingRevive);assert.equal(r.room.battle.turn,1);count+=2;
r=await rpc(ids[0],'bbb2_open',[r.room.code,null,'p1']);r=await command(ids[0],r,'resume_revive');assert.equal(r.room.battle.phase,'revive');count++;
r=await command(ids[0],r,'revive');r=await command(ids[0],r,'revive_continue');assert.equal(r.room.battle.turn,1);assert(!r.room.battle.players[0].pendingRevive);count+=2;
// AOE de Boss 2 atinge ambas as vítimas e usa defesa/guard individual.
r=await room('boss-02');r=await edit(r,t=>{t.turn=2;t.boss.hp=70;t.phase='bossAction';t.chain=[{v:'5'}];t.players[0].defense=1;t.players[0].guard=2;});r=await command(ids[0],r,'boss');assert.equal(r.room.battle.players[0].hp,r.room.battle.players[0].maxHp-2);assert.equal(r.room.battle.players[1].hp,20);assert.equal(r.room.battle.players[0].guard,0);count+=3;
// Não aceita personagens de outra conta nem HTML em fotografias.
await fail(()=>rpc(ids[1],'bbb2_open',[null,'mantis','not-owned']),/pertence/);
await fail(()=>rpc(ids[1],'bbb2_profile',['Conta 2',JSON.stringify(characters().map((c,i)=>i===0?{...c,photo:'javascript:alert(1)'}:c))]),/Fotografia/);
// RLS: terceiro utilizador não lê salas/membros nem personagens de outras contas.
await db.transaction(async tx=>{await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[extra[7]]);await tx.exec('set local role authenticated');const rr=await tx.query('select * from public.bbb2_rooms');assert.equal(rr.rows.length,0);const pp=await tx.query('select * from public.bbb2_profiles');assert.equal(pp.rows.length,1);count+=2;await assert.rejects(()=>tx.exec('select * from private.bbb2_states'),/permission denied/);count++;});
console.log('Combat/authorization/persistence checks:',count,'OK');await db.close();
