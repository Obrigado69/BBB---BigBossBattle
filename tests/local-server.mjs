// Banco PostgreSQL real (PGlite); apenas Auth e o transporte PostgREST são emulados.
import {db,rpc} from './check-sql.mjs';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';
const root=path.resolve(process.env.BBB_WEB_ROOT||'.');
const jwt=id=>Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600,is_anonymous:true})).toString('base64url')+'.local-test-only';
export const sessions=[];
export const server=http.createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 const url=new URL(req.url,'http://localhost:4173');
 const json=(data,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));};
 try{
  let body='';if(req.method==='POST')for await(const chunk of req)body+=chunk;
  const payload=body?JSON.parse(body):{};
  if(url.pathname==='/auth/v1/signup'){
   const id=randomUUID();await db.query('insert into auth.users values($1)',[id]);sessions.push(id);
   json({access_token:jwt(id),token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:randomUUID(),user:{id,aud:'authenticated',role:'authenticated',is_anonymous:true,created_at:new Date().toISOString(),app_metadata:{provider:'anonymous'},user_metadata:{}}});return;
  }
  if(url.pathname.startsWith('/rest/v1/')){
   const token=(req.headers.authorization||'').split(' ')[1];let uid;
   try{uid=JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub;}catch{json({message:'Unauthorized'},401);return;}
   const endpoint=url.pathname.slice('/rest/v1/'.length);
   if(endpoint.startsWith('rpc/')){
    const fn=endpoint.slice(4);let args;
    if(fn==='bbb2_get')args=[payload.p_code];
    else if(fn==='bbb2_profile')args=[payload.p_username,payload.p_characters==null?null:JSON.stringify(payload.p_characters)];
    else if(fn==='bbb2_open')args=[payload.p_code,payload.p_boss,payload.p_character];
    else if(fn==='bbb2_command')args=[payload.p_code,payload.p_action,JSON.stringify(payload.p_payload||{}),payload.p_revision??-1,payload.p_request||randomUUID()];
    else throw Error('Unknown RPC');json(await rpc(uid,fn,args));return;
   }
   if(!['bbb2_profiles','bbb2_rooms','bbb2_members'].includes(endpoint))throw Error('Unknown table');
   const rows=await db.transaction(async tx=>{
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);await tx.exec('set local role authenticated');
    const clauses=[],params=[];for(const [k,v]of url.searchParams){if(['user_id','id','room_id','code'].includes(k)&&v.startsWith('eq.')){params.push(v.slice(3));clauses.push(k+'=$'+params.length);}}
    return (await tx.query('select * from public.'+endpoint+(clauses.length?' where '+clauses.join(' and '):'')+(endpoint==='bbb2_members'?' order by joined_at,user_id':''),params)).rows;
   });
   if((req.headers.accept||'').includes('application/vnd.pgrst.object+json')){if(rows.length!==1){json({code:'PGRST116',message:'JSON object requested',details:rows.length+' rows'},406);return;}json(rows[0]);}else json(rows);return;
  }
  let pathname=decodeURIComponent(url.pathname).replace(/^\/BBB---BigBossBattle\//,'/');if(pathname==='/')pathname='/index.html';
  if(pathname==='/config.js'){res.setHeader('content-type','text/javascript');res.end("window.BBB_CONFIG={supabaseUrl:'http://127.0.0.1:4173',supabasePublishableKey:'local-test-publishable'}");return;}
  const filename=path.resolve(root,'.'+pathname);if(!filename.startsWith(root+path.sep)||!fs.existsSync(filename)){res.writeHead(404);res.end();return;}
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf'};
  res.setHeader('content-type',mime[path.extname(filename)]||'application/octet-stream');res.end(fs.readFileSync(filename));
 }catch(e){json({message:e.message,code:e.code||'LOCAL_ERROR'},400);}
});
await new Promise(resolve=>server.listen(4173,'127.0.0.1',resolve));
export async function close(){await new Promise(resolve=>server.close(resolve));await db.close();}
