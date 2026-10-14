import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
process.on('unhandledRejection',e=>{console.error(e.message,e.where||'',e.internalQuery||'');process.exit(1);});
export const db = new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create publication supabase_realtime;`);
await db.exec(fs.readFileSync('supabase/multiplayer-v2.sql','utf8'));
await db.exec(fs.readFileSync('supabase/multiplayer-v2.sql','utf8'));
console.log('Migration and repeat execution: OK');
export const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
for(const id of ids)await db.query('insert into auth.users values($1)',[id]);
export async function rpc(uid,fn,args){
 return db.transaction(async tx=>{
  await tx.query(`select set_config('request.jwt.claim.sub',$1,true)`,[uid]);
  await tx.exec('set local role authenticated');
  const {rows}=await tx.query(`select public.${fn}(${args.map((_,i)=>'$'+(i+1)).join(',')}) result`,args);
  return rows[0].result;
 });
}
export const characters=(attack=0)=>[1,2,3].map(i=>({id:'p'+i,name:'Herói '+i,level:1,maxHp:25,attack,defense:0,heal:0,points:4,defeated:[],lastBattles:[]}));
for(const [i,id]of ids.entries())await rpc(id,'bbb2_profile',['Conta '+(i+1),JSON.stringify(characters())]);
const room=await rpc(ids[0],'bbb2_open',[null,'mantis','p1']);
console.log('Room creation:',room.room.code);
const joined=await rpc(ids[1],'bbb2_open',[room.room.code,null,'p1']);
console.log('Independent account join:',joined.members.length);
if(process.argv[1]?.endsWith('check-sql.mjs'))await db.close();
