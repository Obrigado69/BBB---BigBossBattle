-- BBB v2. Migração aditiva: não apaga as tabelas do protótipo.
-- Executar integralmente no SQL Editor. Authentication: ativar Anonymous Sign-ins.
begin;
create schema if not exists private;
create table if not exists public.bbb2_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text not null check(length(username) between 1 and 25),
 characters jsonb not null default '[]', updated_at timestamptz not null default now()
);
create table if not exists public.bbb2_rooms (
 id uuid primary key default gen_random_uuid(), code text unique not null check(code ~ '^[0-9]{6}$'),
 host_id uuid not null references auth.users(id), boss_id text not null,
 status text not null default 'lobby', revision bigint not null default 0,
 battle jsonb, created_at timestamptz not null default now()
);
create table if not exists public.bbb2_members (
 room_id uuid not null references public.bbb2_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id), username text not null,
 character jsonb not null, seat int check(seat between 1 and 7),
 ready boolean not null default false, deck_mode text not null default 'digital' check(deck_mode in ('digital','physical')),
 connected boolean not null default true, last_seen timestamptz not null default now(),
 joined_at timestamptz not null default now(), primary key(room_id,user_id), unique(room_id,seat)
);
create unique index if not exists bbb2_one_boss on public.bbb2_members(room_id) where seat is null;
create table if not exists private.bbb2_states (room_id uuid primary key references public.bbb2_rooms(id) on delete cascade, battle jsonb not null);
create table if not exists private.bbb2_requests (
 room_id uuid references public.bbb2_rooms(id) on delete cascade, user_id uuid not null, request_id uuid not null,
 primary key(room_id,user_id,request_id)
);

create table if not exists private.bbb2_migrations (id text primary key,applied_at timestamptz not null default now());
revoke all on private.bbb2_migrations from public,anon,authenticated;
create or replace function private.bbb2_legacy_boss_ids(v jsonb) returns jsonb language plpgsql set search_path='' as $$
declare result jsonb;key text;item jsonb;
begin
 if v is null then return null;end if;
 if jsonb_typeof(v)='array' then select coalesce(jsonb_agg(private.bbb2_legacy_boss_ids(value)),'[]') into result from jsonb_array_elements(v);return result;end if;
 if jsonb_typeof(v)<>'object' then return v;end if;
 result:='{}';for key,item in select * from jsonb_each(v) loop
  if key='defeated' and jsonb_typeof(item)='array' then
   select coalesce(jsonb_agg(case when value='"boss-04"'::jsonb then '"boss-05"'::jsonb else value end),'[]') into item from jsonb_array_elements(item);
  elsif key in ('boss_id','bossId','selectedBossId') and item='"boss-04"'::jsonb then item:='"boss-05"';
  elsif key='boss' and jsonb_typeof(item)='object' then item:=private.bbb2_legacy_boss_ids(item);if item->>'id'='boss-04' then item:=jsonb_set(item,'{id}','"boss-05"');end if;
  else item:=private.bbb2_legacy_boss_ids(item);end if;
  result:=result||jsonb_build_object(key,item);
 end loop;return result;
end;$$;
do $$begin
 if not exists(select 1 from private.bbb2_migrations where id='boss-catalog-v3') then
  update public.bbb2_profiles set characters=private.bbb2_legacy_boss_ids(characters);
  update public.bbb2_members set character=private.bbb2_legacy_boss_ids(character);
  update public.bbb2_rooms set boss_id=case when boss_id='boss-04' then 'boss-05' else boss_id end,battle=private.bbb2_legacy_boss_ids(battle),revision=revision+1;
  update private.bbb2_states set battle=private.bbb2_legacy_boss_ids(battle);
  insert into private.bbb2_migrations(id) values('boss-catalog-v3');
 end if;
end;$$;
revoke all on function private.bbb2_legacy_boss_ids(jsonb) from public,anon,authenticated;

create or replace function private.bbb2_member(rid uuid) returns boolean language sql security definer stable set search_path='' as $$
 select exists(select 1 from public.bbb2_members where room_id=rid and user_id=auth.uid());
$$;
alter table public.bbb2_profiles enable row level security;
alter table public.bbb2_rooms enable row level security;
alter table public.bbb2_members enable row level security;
alter table private.bbb2_states enable row level security;
alter table private.bbb2_requests enable row level security;
revoke all on public.bbb2_profiles,public.bbb2_rooms,public.bbb2_members from anon,authenticated;
revoke all on private.bbb2_states,private.bbb2_requests from public,anon,authenticated;
grant select on public.bbb2_profiles,public.bbb2_rooms,public.bbb2_members to authenticated;
grant usage on schema private to authenticated;
grant execute on function private.bbb2_member(uuid) to authenticated;
drop policy if exists bbb2_own_profile on public.bbb2_profiles;
create policy bbb2_own_profile on public.bbb2_profiles for select to authenticated using(user_id=auth.uid());
drop policy if exists bbb2_room_read on public.bbb2_rooms;
create policy bbb2_room_read on public.bbb2_rooms for select to authenticated using(private.bbb2_member(id));
drop policy if exists bbb2_member_read on public.bbb2_members;
create policy bbb2_member_read on public.bbb2_members for select to authenticated using(private.bbb2_member(room_id));

create or replace function public.bbb2_profile(p_username text,p_characters jsonb default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c jsonb; n text:=trim(p_username); uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Sessão inválida'; end if;
 if length(coalesce(n,'')) not between 1 and 25 then raise exception 'Username: 1 a 25 caracteres'; end if;
 if p_characters is not null then
  if jsonb_typeof(p_characters)<>'array' or jsonb_array_length(p_characters)<>3 or octet_length(p_characters::text)>1500000 then raise exception 'Personagens inválidas'; end if;
  for c in select value from jsonb_array_elements(p_characters) loop
   if coalesce(c->>'id','')!~'^[a-zA-Z0-9_-]{1,64}$' or length(coalesce(c->>'name','')) not between 1 and 40
    or coalesce((c->>'maxHp')::int,0) not between 1 and 1000
    or coalesce((c->>'attack')::int,-1) not between 0 and 1000
    or coalesce((c->>'defense')::int,-1) not between 0 and 1000
    or coalesce((c->>'heal')::int,-1) not between 0 and 1000 then raise exception 'Ficha de personagem inválida'; end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(p_characters) pic where pic.value ? 'photo' and coalesce(pic.value->>'photo','')!~'^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$') then raise exception 'Fotografia inválida';end if;
  if (select count(distinct value->>'id') from jsonb_array_elements(p_characters))<>3 then raise exception 'IDs de personagem repetidos'; end if;
 end if;
 insert into public.bbb2_profiles(user_id,username,characters) values(uid,n,coalesce(p_characters,'[]'))
 on conflict(user_id) do update set username=excluded.username,characters=coalesce(p_characters,bbb2_profiles.characters),updated_at=now();
 return (select to_jsonb(p) from public.bbb2_profiles p where user_id=uid);
end;$$;

create or replace function private.bbb2_view(rid uuid) returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('room',to_jsonb(r),'members',coalesce((select jsonb_agg(to_jsonb(m) order by m.joined_at,m.user_id) from public.bbb2_members m where m.room_id=rid),'[]'::jsonb)) from public.bbb2_rooms r where r.id=rid;
$$;
create or replace function public.bbb2_get(p_code text) returns jsonb language plpgsql security definer set search_path='' as $$
declare rid uuid;
begin
 select id into rid from public.bbb2_rooms where code=p_code;
 if rid is null or not private.bbb2_member(rid) then raise exception 'Não tens acesso a esta sala';end if;
 return private.bbb2_view(rid);
end;$$;
create or replace function public.bbb2_open(p_code text,p_boss text,p_character text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); p public.bbb2_profiles%rowtype; r public.bbb2_rooms%rowtype; c jsonb; s int; i int; code text;
begin
 if uid is null then raise exception 'Sessão inválida'; end if;
 select * into p from public.bbb2_profiles where user_id=uid;
 if not found then raise exception 'Escolhe o teu username primeiro'; end if;
 select value into c from jsonb_array_elements(p.characters) where value->>'id'=p_character;
 if c is null then raise exception 'Personagem não pertence à conta'; end if;
 if p_code is null then
  if p_boss not in ('mantis','boss-02','boss-03','boss-04','boss-05','boss-06','boss-07','boss-08','boss-09') or p_boss is null then raise exception 'Boss inválido'; end if;
  if (select count(*) from public.bbb2_rooms where host_id=uid and created_at>now()-interval '1 hour')>=20 then raise exception 'Limite de salas por hora'; end if;
  for i in 1..30 loop
   code:=lpad(floor(random()*1000000)::int::text,6,'0');
   begin insert into public.bbb2_rooms(code,host_id,boss_id) values(code,uid,p_boss) returning * into r;exit;
   exception when unique_violation then null;end;
  end loop;
  if r.id is null then raise exception 'Não foi possível criar sala'; end if;
 else
  select * into r from public.bbb2_rooms where bbb2_rooms.code=p_code for update;
  if not found then raise exception 'Código incorreto'; end if;
 end if;
 if exists(select 1 from public.bbb2_members where room_id=r.id and user_id=uid) then
  update public.bbb2_members set connected=true,last_seen=now() where room_id=r.id and user_id=uid;
 else
  if r.status<>'lobby' then raise exception 'Esta dungeon já começou'; end if;
  select x into s from generate_series(1,7) x where not exists(select 1 from public.bbb2_members where room_id=r.id and seat=x) order by x limit 1;
  if s is null then raise exception 'Lugares de jogador cheios'; end if;
  insert into public.bbb2_members(room_id,user_id,username,character,seat) values(r.id,uid,p.username,c,s);
 end if;
 update public.bbb2_rooms set revision=revision+1 where id=r.id;
 return private.bbb2_view(r.id);
end;$$;

-- Baralhos e aleatoriedade ficam exclusivamente no servidor.
create or replace function private.bbb2_deck(kind text) returns jsonb language sql volatile set search_path='' as $$
 select jsonb_agg(c order by random()) from (
 select jsonb_build_object('v',v,'s',s) c from unnest(array['♠','♥','♦','♣']) s cross join unnest(
 case kind when 'split-aoe' then array['2','3','4','5','6'] when 'boss' then array['2','3','4','5','6','7','8','9','10','A'] else array['2','3','4','5','6','7','8','9','10','A','J','Q','K'] end) v
 union all select jsonb_build_object('v','JOKER','s',s) from unnest(array['★','☆']) s where kind<>'split-aoe'
 ) x;
$$;
create or replace function private.bbb2_log(t jsonb,msg text) returns jsonb language sql set search_path='' as $$
 select jsonb_set(t,'{history}',(select coalesce(jsonb_agg(value order by ord),'[]') from jsonb_array_elements(jsonb_build_array(msg)||coalesce(t->'history','[]')) with ordinality a(value,ord) where ord<=120));
$$;
create or replace function private.bbb2_actor(t jsonb) returns text language sql set search_path='' as $$
 select case when t ? 'split' then coalesce(t->'split'->'order'->((t->>'turn')::int)->>'id','boss')
 else coalesce(t->'players'->((t->>'turn')::int)->>'id','boss') end;
$$;
create or replace function private.bbb2_finish(t jsonb,won boolean) returns jsonb language plpgsql set search_path='' as $$
declare ids jsonb:='[]';p jsonb;
begin
 if won then for p in select value from jsonb_array_elements(t->'players') loop
  if not coalesce(p->'defeated','[]') ? (t->'boss'->>'id') then ids:=ids||jsonb_build_array(p->>'id'); end if;
 end loop;end if;
 return t||jsonb_build_object('phase','finished','outcome',case when won then 'victory' else 'defeat' end,'firstVictoryIds',ids,'pending',null,'reviveQueue','[]'::jsonb);
end;$$;
create or replace function private.bbb2_advance_cursor(t jsonb) returns jsonb language plpgsql set search_path='' as $$
declare n int; steps int; i int; a text; e jsonb; p jsonb; past jsonb; active boolean; roundno int:=(t->>'round')::int; old text:=case when coalesce((t->'split'->>'justCreated')::boolean,false) then t->'split'->>'triggeredBy' else private.bbb2_actor(t) end;
begin
 if not exists(select 1 from jsonb_array_elements(t->'players') where (value->>'hp')::int>0) then return private.bbb2_finish(t,false);end if;
 if (t->'boss'->>'hp')::int<=0 then return private.bbb2_finish(t,true);end if;
 steps:=case when t ? 'split' then jsonb_array_length(t->'split'->'order') else jsonb_array_length(t->'players')+1 end;
 n:=case when coalesce((t->'split'->>'justCreated')::boolean,false) then 0 else ((t->>'turn')::int+1)%steps end;
 if n=0 and not coalesce((t->'split'->>'justCreated')::boolean,false) then roundno:=roundno+1;end if;
 for i in 1..steps loop
  active:=false;
  if t ? 'split' then
   e:=t->'split'->'order'->n;
   if e ? 'child' then active:=(t->'split'->'children'->((e->>'child')::int)->>'hp')::int>0;
   else select value into p from jsonb_array_elements(t->'players') where value->>'id'=e->>'id';active:=(p->>'hp')::int>0;end if;
  elsif n=jsonb_array_length(t->'players') then active:=true;
  else p:=t->'players'->n;active:=(p->>'hp')::int>0;end if;
  if active then exit;end if;n:=(n+1)%steps;if n=0 then roundno:=roundno+1;end if;
 end loop;
 t:=t||jsonb_build_object('turn',n,'round',roundno,'chain','[]'::jsonb,'target',null,'pending',null,'phase','draw','revivalRoll',null);
 if t ? 'split' then t:=jsonb_set(t,'{split,justCreated}','false');end if;
 a:=private.bbb2_actor(t);
 if a<>'boss' then
  for i in 0..jsonb_array_length(t->'players')-1 loop
   if t->'players'->i->>'id'=a then
    t:=jsonb_set(t,array['players',i::text,'guard'],'0');t:=jsonb_set(t,'{mode}',t->'players'->i->'deckMode');exit;
   end if;
  end loop;
 else t:=jsonb_set(t,'{mode}',t->'bossDeckMode');end if;
 past:=coalesce(t->'completedTurns','[]')||jsonb_build_array(old);
 select jsonb_agg(value order by ord) into past from jsonb_array_elements(past) with ordinality items(value,ord) where ord>greatest(0,jsonb_array_length(past)-3);
 return t||jsonb_build_object('completedTurns',past,'timelineIndex',coalesce((t->>'timelineIndex')::int,0)+1);
end;$$;
create or replace function private.bbb2_next_revive(t jsonb) returns jsonb language plpgsql set search_path='' as $$
declare q jsonb:=coalesce(t->'reviveQueue','[]');pending jsonb;
begin
 if jsonb_array_length(q)>0 then
  pending:=q->0;t:=jsonb_set(t,'{reviveQueue}',q-0);
  return t||jsonb_build_object('pending',pending,'phase','revive','revivalRoll',null);
 end if;
 return private.bbb2_advance(t);
end;$$;


-- One turn completion, including skipped frozen turns. Persist the marker while D20 is pending.
create or replace function private.bbb2_advance(t jsonb) returns jsonb language plpgsql set search_path='' as $$
declare ps jsonb:=t->'players';p jsonb;oldround int:=(t->>'round')::int;i int;j int;offsetno int;eligible int[]:='{}';health int[]:='{}';n int;completed int;actorid text;
begin
 if t->>'outcome' is not null then return t;end if;
 if not coalesce((t->>'turnEffectsProcessed')::boolean,false) then
  t:=t||jsonb_build_object('turnEffectsProcessed',true,'reviveQueue',coalesce(t->'reviveQueue','[]'));
  for i in 0..jsonb_array_length(ps)-1 loop
   p:=ps->i;
   if (p->>'hp')::int>0 and coalesce((p->>'bleedTurns')::int,0)>0 then
    p:=p||jsonb_build_object('hp',(p->>'hp')::int-1,'bleedTurns',(p->>'bleedTurns')::int-1);
    t:=private.bbb2_log(t,(p->>'name')||': BLEED −1 HP ('||(p->>'bleedTurns')||' turnos restantes).');
    if (p->>'hp')::int=0 then
     if coalesce((p->>'reviveUsed')::boolean,false) then p:=jsonb_set(p,'{alive}','false');
     else t:=jsonb_set(t,'{reviveQueue}',t->'reviveQueue'||jsonb_build_array(jsonb_build_object('id',p->>'id','damage',1)));end if;
    end if;
    ps:=jsonb_set(ps,array[i::text],p);
   end if;
  end loop;
  t:=jsonb_set(t,'{players}',ps);
  if jsonb_array_length(t->'reviveQueue')>0 then return private.bbb2_next_revive(t);end if;
 end if;
 t:=private.bbb2_advance_cursor(t-'turnEffectsProcessed');
 if t->>'outcome' is not null then return t;end if;
 ps:=t->'players';n:=jsonb_array_length(ps);
 if (t->>'round')::int>oldround then
  completed:=oldround;
  if t->'boss'->>'id'='boss-06' and completed%3=0 then
   for i in 0..n-1 loop if (ps->i->>'hp')::int>0 then eligible:=array_append(eligible,i);end if;end loop;
   if cardinality(eligible)>0 then
    j:=eligible[1+floor(random()*cardinality(eligible))::int];ps:=jsonb_set(ps,array[j::text,'frozen'],'true');
    t:=private.bbb2_log(t,'Ice Lord congelou '||(ps->j->>'name')||': não pode agir nem receber cura até perder o próximo turno.');
   end if;
  elsif t->'boss'->>'id'='boss-08' and completed%n=0 then
   for i in 0..n-1 loop if (ps->i->>'hp')::int>0 then eligible:=array_append(eligible,i);health:=array_append(health,(ps->i->>'hp')::int);end if;end loop;
   if cardinality(eligible)>1 then
    offsetno:=1+floor(random()*(cardinality(eligible)-1))::int;
    for i in 1..cardinality(eligible) loop
     j:=eligible[i];ps:=jsonb_set(ps,array[j::text,'hp'],to_jsonb(least((ps->j->>'maxHp')::int,health[1+(i-1+offsetno)%cardinality(eligible)])));
    end loop;
    t:=private.bbb2_log(t,'Trikster trocou a vida dos jogadores vivos!');
   end if;
  end if;
  t:=jsonb_set(t,'{players}',ps);
 end if;
 actorid:=private.bbb2_actor(t);
 for i in 0..n-1 loop
  if ps->i->>'id'=actorid and coalesce((ps->i->>'frozen')::boolean,false) then
   ps:=jsonb_set(ps,array[i::text],(ps->i)-'frozen');t:=jsonb_set(t,'{players}',ps);
   t:=private.bbb2_log(t,(ps->i->>'name')||' perdeu este turno por estar congelado.');
   return private.bbb2_advance(t);
  end if;
 end loop;
 return t;
end;$$;
revoke all on function private.bbb2_advance_cursor(jsonb) from public,anon,authenticated;

create or replace function public.bbb2_command(p_code text,p_action text,p_payload jsonb default '{}',p_revision bigint default -1,p_request uuid default gen_random_uuid()) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();r public.bbb2_rooms%rowtype;m public.bbb2_members%rowtype;controller public.bbb2_members%rowtype;
 t jsonb;ps jsonb:='[]';ds jsonb:='{}';c jsonb;p jsonb;e jsonb;entry jsonb;child int:=0;dk text;a text;target text;idx int:=0;i int;j int;n int;hp int;maxhp int;dmg int;base int:=0;k int:=0;q int:=0;guards int:=0;jokers int:=0;v text;rollval int;amount int;boss text;aoe boolean;healing boolean;auto boolean;timeout boolean:=false;splitorder jsonb:='[]';chars jsonb;prof public.bbb2_profiles%rowtype;
begin
 if uid is null then raise exception 'Sessão inválida';end if;
 select * into r from public.bbb2_rooms where code=p_code for update;
 if not found then raise exception 'Sala não encontrada';end if;
 select * into m from public.bbb2_members where room_id=r.id and user_id=uid;
 if not found then raise exception 'Não pertences à sala';end if;
 if p_action='heartbeat' then
  update public.bbb2_members set last_seen=now(),connected=true where room_id=r.id and user_id=uid;
  return private.bbb2_view(r.id);
 end if;
 if exists(select 1 from private.bbb2_requests where room_id=r.id and user_id=uid and request_id=p_request) then return private.bbb2_view(r.id);end if;
 if p_revision<>r.revision then raise exception 'STALE: estado atualizado; tenta novamente';end if;
 if p_action='leave' then
  if r.status='lobby' then
   delete from public.bbb2_members where room_id=r.id and user_id=uid;
   if uid=r.host_id then
    select user_id into r.host_id from public.bbb2_members where room_id=r.id order by joined_at,user_id limit 1;
    if r.host_id is null then delete from public.bbb2_rooms where id=r.id;return jsonb_build_object('left',true);end if;
    update public.bbb2_rooms set host_id=r.host_id where id=r.id;
   end if;
  else update public.bbb2_members set connected=false,last_seen=now()-interval '1 minute' where room_id=r.id and user_id=uid;end if;
 elsif p_action='lobby' then
  if r.status<>'lobby' then raise exception 'Preparação terminada';end if;
  if p_payload ? 'seat' then
   update public.bbb2_members set seat=case when p_payload->>'seat'='boss' then null else (p_payload->>'seat')::int end,ready=false where room_id=r.id and user_id=uid;
  end if;
  if p_payload ? 'character' then
   select value into c from public.bbb2_profiles pr cross join lateral jsonb_array_elements(pr.characters) where pr.user_id=uid and value->>'id'=p_payload->>'character';
   if c is null then raise exception 'Personagem não pertence à conta';end if;
   update public.bbb2_members set character=c,ready=false where room_id=r.id and user_id=uid;
  end if;
  if p_payload ? 'deckMode' then update public.bbb2_members set deck_mode=p_payload->>'deckMode',ready=false where room_id=r.id and user_id=uid;end if;
  if p_payload ? 'ready' then update public.bbb2_members set ready=(p_payload->>'ready')::boolean where room_id=r.id and user_id=uid;end if;
 elsif p_action='start' then
  if r.host_id<>uid or r.status<>'lobby' then raise exception 'Só o HOST inicia a sala';end if;
  if exists(select 1 from public.bbb2_members where room_id=r.id and (not connected or last_seen<now()-interval '45 seconds' or (user_id<>uid and not ready))) then raise exception 'A aguardar jogadores ligados e READY';end if;
  for m in select * from public.bbb2_members where room_id=r.id and seat is not null order by seat loop
   c:=m.character||jsonb_build_object('id',m.user_id::text,'sourceCharacterId',m.character->>'id','characterName',m.character->>'name','name',m.username||' · '||(m.character->>'name'),'accountName',m.username,'hp',(m.character->>'maxHp')::int,'alive',true,'reviveUsed',false,'guard',0,'deckMode',m.deck_mode);
   ps:=ps||jsonb_build_array(c);ds:=ds||jsonb_build_object(m.user_id::text,private.bbb2_deck('player'));
  end loop;
  n:=jsonb_array_length(ps);if n=0 then raise exception 'Escolhe pelo menos um jogador';end if;
  select * into controller from public.bbb2_members where room_id=r.id and seat is null;
  maxhp:=ceil((case r.boss_id when 'mantis' then 50 when 'boss-02' then 150 when 'boss-03' then 200 else 300 end)*(1+.5*(n-1)));
  t:=jsonb_build_object('multiplayer',true,'bossControllerId',controller.user_id,'bossDeckMode',coalesce(controller.deck_mode,'digital'),'controller',case when controller.user_id is null then 'game' else 'human' end,
   'players',ps,'boss',jsonb_build_object('id',r.boss_id,'hp',maxhp,'maxHp',maxhp),'decks',ds||jsonb_build_object('boss',private.bbb2_deck('boss')),
   'turn',0,'round',1,'phase','draw','chain','[]'::jsonb,'target',null,'pending',null,'outcome',null,'rewarded',false,'history',jsonb_build_array('A dungeon começou.'),'mode',ps->0->>'deckMode','revivalRoll',null,'timelineIndex',0);
  insert into private.bbb2_states values(r.id,t);
  update public.bbb2_rooms set status='playing' where id=r.id;
 else
  if r.status<>'playing' then raise exception 'Combate terminado ou indisponível';end if;
  select battle into t from private.bbb2_states where room_id=r.id;
  a:=private.bbb2_actor(t);boss:=t->'boss'->>'id';
  select * into controller from public.bbb2_members where room_id=r.id and user_id=(t->>'bossControllerId')::uuid;
  auto:=controller.user_id is null or not controller.connected or controller.last_seen<now()-interval '45 seconds';
  if p_action='timeout' then
   target:=case when t->>'phase'='revive' then t->'pending'->>'id' else a end;
   if target='boss' then raise exception 'Boss automático disponível';end if;
   if exists(select 1 from public.bbb2_members where room_id=r.id and user_id::text=target and connected and last_seen>now()-interval '45 seconds') then raise exception 'Jogador ainda ligado';end if;
   timeout:=true;
  elsif p_action='resume_revive' then
   if not exists(select 1 from jsonb_array_elements(t->'players') where value->>'id'=uid::text and value ? 'pendingRevive') then raise exception 'Sem última chance pendente';end if;
  elsif t->>'phase'='revive' then
   if t->'pending'->>'id'<>uid::text then raise exception 'D20 pertence a outro jogador';end if;
  elsif a='boss' then
   if not auto and controller.user_id<>uid then raise exception 'Só o controlador do Boss pode agir';end if;
  elsif a<>uid::text then raise exception 'Não é o teu turno';end if;
  ps:=t->'players';n:=jsonb_array_length(ps);
  for i in 0..n-1 loop if ps->i->>'id'=a then idx:=i;end if;end loop;
  if t ? 'split' and a='boss' then child:=(t->'split'->'order'->((t->>'turn')::int)->>'child')::int;end if;
  dk:=case when a<>'boss' then a when t ? 'split' then t->'split'->'children'->child->>'key' else 'boss' end;
  if a<>'boss' and coalesce((ps->idx->>'frozen')::boolean,false) and p_action in ('draw','attack','heal') then raise exception 'Jogador congelado';end if;
  if timeout then
   t:=private.bbb2_log(t,'Jogador ausente: turno ultrapassado.');
   if t->>'phase'='revive' then
    for i in 0..n-1 loop if ps->i->>'id'=target then
     if t->>'revivalRoll' is null then ps:=jsonb_set(ps,array[i::text],(ps->i)||jsonb_build_object('pendingRevive',t->'pending','alive',false));
     else ps:=jsonb_set(ps,array[i::text],(ps->i)-'pendingRevive');end if;
    end if;end loop;
    t:=jsonb_set(t,'{players}',ps);
    if t->'pending' ? 'resume' then t:=t||(t->'pending'->'resume')||jsonb_build_object('pending',null,'revivalRoll',null);
    else t:=private.bbb2_next_revive(t);end if;
   else t:=private.bbb2_advance(t);end if;
  elsif p_action='draw' then
   if t->>'phase'<>'draw' then raise exception 'Não podes retirar carta agora';end if;
   ds:=t->'decks'->dk;
   if t->>'mode'='physical' and not(a='boss' and auto) then
    v:=p_payload->>'value';
    if v is null or not(v=any(case when dk='split-aoe' then array['2','3','4','5','6'] when a='boss' then array['2','3','4','5','6','7','8','9','10','A','JOKER'] else array['2','3','4','5','6','7','8','9','10','A','J','Q','K','JOKER'] end)) then raise exception 'Carta física inválida';end if;
    c:=jsonb_build_object('v',v,'s','');
   else
    if ds is null or jsonb_array_length(ds)=0 then ds:=private.bbb2_deck(case when dk='split-aoe' then dk when a='boss' then 'boss' else 'player' end);end if;
    c:=ds->0;t:=jsonb_set(t,array['decks',dk],ds-0);v:=c->>'v';
   end if;
   t:=jsonb_set(t,'{chain}',t->'chain'||jsonb_build_array(c));t:=private.bbb2_log(t,case when a='boss' then 'Boss' else ps->idx->>'name' end||': '||v||coalesce(c->>'s',''));
   if not(v='JOKER' or (a<>'boss' and v in ('J','Q','K'))) then t:=jsonb_set(t,'{phase}',to_jsonb(case when a='boss' then 'bossAction' else 'action' end));end if;
  elsif p_action in ('revive','revive_continue','resume_revive') then
   if p_action='resume_revive' then
    for i in 0..n-1 loop if ps->i->>'id'=uid::text then idx:=i;end if;end loop;
    if not(ps->idx ? 'pendingRevive') or t->>'phase'='revive' then raise exception 'Sem última chance pendente';end if;
    t:=t||jsonb_build_object('pending',(ps->idx->'pendingRevive')||jsonb_build_object('resume',jsonb_build_object('turn',t->'turn','phase',t->'phase','chain',t->'chain','target',t->'target','mode',t->'mode')),'phase','revive','revivalRoll',null);
   else
    if t->>'phase'<>'revive' then raise exception 'Sem D20 pendente';end if;
    for i in 0..n-1 loop if ps->i->>'id'=t->'pending'->>'id' then idx:=i;end if;end loop;
    if p_action='revive' then
     if t->>'revivalRoll' is not null then raise exception 'D20 já lançado';end if;
     rollval:=1+floor(random()*20)::int;hp:=case when rollval>(t->'pending'->>'damage')::int then 1 else 0 end;
     ps:=jsonb_set(ps,array[idx::text],(ps->idx)||jsonb_build_object('hp',hp,'alive',hp>0,'reviveUsed',true));
     t:=t||jsonb_build_object('players',ps,'revivalRoll',rollval);t:=private.bbb2_log(t,(ps->idx->>'name')||' lançou '||rollval||' no D20: '||case when hp=1 then 'ressuscitou com 1 HP.' else 'morreu definitivamente.' end);
    else
     if t->>'revivalRoll' is null then raise exception 'Lança o D20 primeiro';end if;
     ps:=jsonb_set(ps,array[idx::text],(ps->idx)-'pendingRevive');t:=jsonb_set(t,'{players}',ps);
     if t->'pending' ? 'resume' then t:=t||(t->'pending'->'resume')||jsonb_build_object('pending',null,'revivalRoll',null);
     else t:=private.bbb2_next_revive(t);end if;
    end if;
   end if;
  elsif p_action in ('attack','heal','boss') then
   if (a='boss' and (p_action<>'boss' or t->>'phase'<>'bossAction')) or (a<>'boss' and (p_action='boss' or t->>'phase'<>'action')) then raise exception 'Ação inválida nesta fase';end if;
   for c in select value from jsonb_array_elements(t->'chain') loop
    v:=c->>'v';if v='K' then k:=k+1;elsif v='Q' then q:=q+1;elsif v='J' then guards:=guards+2;elsif v='JOKER' then jokers:=jokers+1;else base:=case when v='A' then 12 else v::int end;end if;
   end loop;base:=base*power(2,jokers)::int;
   if a<>'boss' then
    p:=ps->idx;ps:=jsonb_set(ps,array[idx::text,'guard'],to_jsonb((p->>'guard')::int+guards));
    if p_action='heal' then
     target:=p_payload->>'target';j:=-1;for i in 0..n-1 loop if ps->i->>'id'=target and (ps->i->>'hp')::int>0 then j:=i;end if;end loop;
     if j<0 then raise exception 'Alvo de cura inválido';end if;
     if coalesce((ps->j->>'frozen')::boolean,false) then raise exception 'Não podes curar um jogador congelado';end if;
     amount:=least((ps->j->>'maxHp')::int-(ps->j->>'hp')::int,base+q*2+(p->>'heal')::int);
     ps:=jsonb_set(ps,array[j::text,'hp'],to_jsonb((ps->j->>'hp')::int+amount));t:=private.bbb2_log(t,(p->>'name')||' curou '||(ps->j->>'name')||': +'||amount||' HP.');
    else
     dmg:=base+k*2+(p->>'attack')::int;
     if t ? 'split' then
      j:=-1;for i in 0..1 loop if t->'split'->'children'->i->>'key'=p_payload->>'bossKey' and (t->'split'->'children'->i->>'hp')::int>0 then j:=i;end if;end loop;
      if j<0 then raise exception 'Escolhe uma metade viva do Boss';end if;
      t:=jsonb_set(t,array['split','children',j::text,'hp'],to_jsonb(greatest(0,(t->'split'->'children'->j->>'hp')::int-dmg)));
      hp:=(t->'split'->'children'->0->>'hp')::int+(t->'split'->'children'->1->>'hp')::int;
     elsif boss='boss-04' and t->'boss' ? 'firstAbsorbRound' and (t->>'round')::int>=(t->'boss'->>'firstAbsorbRound')::int and ((t->>'round')::int-(t->'boss'->>'firstAbsorbRound')::int)%2=0 then
      hp:=least((t->'boss'->>'maxHp')::int,(t->'boss'->>'hp')::int+dmg);
      t:=private.bbb2_log(t,'Xiongmao absorveu o ataque de '||(p->>'name')||': +'||(hp-(t->'boss'->>'hp')::int)||' HP.');dmg:=0;
     else hp:=greatest(0,(t->'boss'->>'hp')::int-dmg);end if;
     t:=jsonb_set(t,'{boss,hp}',to_jsonb(hp));t:=private.bbb2_log(t,(p->>'name')||' causou '||dmg||' de dano.');
     if boss='boss-04' and hp>0 and hp<=(t->'boss'->>'maxHp')::int/5.0 and not(t->'boss' ? 'firstAbsorbRound') then
      t:=jsonb_set(t,'{boss,firstAbsorbRound}',to_jsonb((t->>'round')::int+1));t:=private.bbb2_log(t,'Xiongmao despertou: absorção a partir da próxima ronda, ronda sim, ronda não.');
     end if;
     if boss='boss-07' and hp>0 and hp<=(t->'boss'->>'maxHp')::int*.3 and not coalesce((t->'boss'->>'doubleDamage')::boolean,false) then
      t:=jsonb_set(t,'{boss,doubleDamage}','true');t:=private.bbb2_log(t,'Dot transformou-se em Black Hole! Os ataques causam dano ×2.');
     end if;
     if boss='boss-03' and hp<=(t->'boss'->>'maxHp')::int/5.0 then t:=jsonb_set(t,'{boss,doubleDamage}','true');end if;
     if boss='boss-05' and not(t ? 'split') and hp<=(t->'boss'->>'maxHp')::int/2.0 then
      splitorder:=jsonb_build_array(jsonb_build_object('child',0));
      for i in 0..n-1 loop
       if i=ceil(n/2.0)::int then splitorder:=splitorder||jsonb_build_array(jsonb_build_object('child',1));end if;
       splitorder:=splitorder||jsonb_build_array(jsonb_build_object('id',ps->i->>'id'));
      end loop;
      if n=1 then splitorder:=splitorder||jsonb_build_array(jsonb_build_object('child',1));end if;
      t:=t||jsonb_build_object('split',jsonb_build_object('justCreated',true,'triggeredBy',a,'children',jsonb_build_array(jsonb_build_object('key','split-aoe','name','Puppet Master · AOE','hp',100,'maxHp',100),jsonb_build_object('key','split-normal','name','Dummy · Normal','hp',100,'maxHp',100)),'order',splitorder));
      t:=jsonb_set(t,'{boss,hp}','200');t:=jsonb_set(t,'{boss,maxHp}','200');
      t:=jsonb_set(t,'{decks}',t->'decks'||jsonb_build_object('split-aoe',private.bbb2_deck('split-aoe'),'split-normal',private.bbb2_deck('boss')));
      t:=private.bbb2_log(t,'O Boss 5 dividiu-se: duas metades com 100 HP.');
     end if;
    end if;
    t:=jsonb_set(t,'{players}',ps);t:=private.bbb2_advance(t);
   else
    healing:=boss='boss-03' and (t->>'round')::int%3=0 and coalesce((t->'boss'->>'healingCompleteRound')::int,0)<>(t->>'round')::int;
    if healing then
     amount:=least(base,(t->'boss'->>'maxHp')::int-(t->'boss'->>'hp')::int);t:=jsonb_set(t,'{boss,hp}',to_jsonb((t->'boss'->>'hp')::int+amount));t:=private.bbb2_log(t,'O Boss curou-se: +'||amount||' HP.');
     if not(t->'boss' ? 'healsRemaining') or (t->'boss'->>'healsRemaining')::int=0 then
      t:=jsonb_set(t,'{boss,healsRemaining}','1');t:=t||jsonb_build_object('phase','draw','chain','[]'::jsonb);
     else t:=jsonb_set(t,'{boss,healsRemaining}','0');t:=jsonb_set(t,'{boss,healingCompleteRound}',t->'round');t:=private.bbb2_advance(t);end if;
    else
     aoe:=case when t ? 'split' then dk='split-aoe' when boss='boss-02' and (coalesce((t->'boss'->>'enraged')::boolean,false) or (t->'boss'->>'hp')::int<=(t->'boss'->>'maxHp')::int/2.0) then coalesce((t->'boss'->>'nextAoe')::boolean,true) else false end;
     if boss='boss-02' and (aoe or coalesce((t->'boss'->>'enraged')::boolean,false)) then t:=jsonb_set(t,'{boss,enraged}','true');t:=jsonb_set(t,'{boss,nextAoe}',to_jsonb(not aoe));end if;
     target:=p_payload->>'target';
     if not aoe and (auto or target is null) then select value->>'id' into target from jsonb_array_elements(ps) where (value->>'hp')::int>0 order by random() limit 1;end if;
     if not aoe and not exists(select 1 from jsonb_array_elements(ps) where value->>'id'=target and (value->>'hp')::int>0) then raise exception 'Alvo inválido';end if;
     if coalesce((t->'boss'->>'doubleDamage')::boolean,false) then base:=base*2;end if;
     t:=jsonb_set(t,'{reviveQueue}','[]');
     for i in 0..n-1 loop
      p:=ps->i;if (p->>'hp')::int>0 and (aoe or p->>'id'=target) then
       dmg:=greatest(0,base-(p->>'defense')::int-(p->>'guard')::int);hp:=greatest(0,(p->>'hp')::int-dmg);
       p:=p||jsonb_build_object('hp',hp,'guard',0);
       if boss='boss-09' and (t->>'round')::int%2=1 then p:=jsonb_set(p,'{bleedTurns}','5');t:=private.bbb2_log(t,(p->>'name')||' ficou com BLEED durante 5 turnos.');end if;
       t:=private.bbb2_log(t,'O Boss atacou '||(p->>'name')||': '||dmg||' de dano.'||case when aoe then ' (AOE)' else '' end);
       if hp=0 then
        if not(p->>'reviveUsed')::boolean then t:=jsonb_set(t,'{reviveQueue}',t->'reviveQueue'||jsonb_build_array(jsonb_build_object('id',p->>'id','damage',dmg)));
        else p:=jsonb_set(p,'{alive}','false');end if;
       end if;ps:=jsonb_set(ps,array[i::text],p);
      end if;
     end loop;
     t:=jsonb_set(t,'{players}',ps);t:=private.bbb2_next_revive(t);
    end if;
   end if;
  else raise exception 'Ação desconhecida';end if;
 end if;
 if t is not null then
  update private.bbb2_states set battle=t where room_id=r.id;
  if t->>'outcome' is not null and not coalesce((t->>'rewarded')::boolean,false) then
   for p in select value from jsonb_array_elements(t->'players') loop
    select * into prof from public.bbb2_profiles where user_id=(p->>'id')::uuid for update;
    chars:='[]';
    for c in select value from jsonb_array_elements(prof.characters) loop
     if c->>'id'=p->>'sourceCharacterId' then
      if t->>'outcome'='victory' and not coalesce(c->'defeated','[]') ? (t->'boss'->>'id') then
       c:=c||jsonb_build_object('level',coalesce((c->>'level')::int,1)+1,'maxHp',(c->>'maxHp')::int+1,'points',coalesce((c->>'points')::int,0)+1,'defeated',coalesce(c->'defeated','[]')||jsonb_build_array(t->'boss'->>'id'));
      end if;
      c:=jsonb_set(c,'{lastBattles}',(select jsonb_agg(value order by ord) from jsonb_array_elements(jsonb_build_array(jsonb_build_object('result',case when t->>'outcome'='victory' then 'Vitória' else 'Derrota' end,'boss',case t->'boss'->>'id' when 'mantis' then 'King Mantis' else 'Boss '||right(t->'boss'->>'id',1) end,'date',to_char(now(),'DD/MM/YYYY')))||coalesce(c->'lastBattles','[]')) with ordinality a(value,ord) where ord<=8));
     end if;chars:=chars||jsonb_build_array(c);
    end loop;
    update public.bbb2_profiles set characters=chars,updated_at=now() where user_id=prof.user_id;
   end loop;
   t:=jsonb_set(t,'{rewarded}','true');update private.bbb2_states set battle=t where room_id=r.id;
  end if;
  update public.bbb2_rooms set battle=t-'decks',status=case when t->>'outcome' is null then 'playing' else 'finished' end where id=r.id;
 end if;
 update public.bbb2_rooms set revision=revision+1 where id=r.id;
 if p_action<>'leave' then insert into private.bbb2_requests values(r.id,uid,p_request);end if;
 return private.bbb2_view(r.id);
end;$$;

-- Todas as funções internas ficam inacessíveis por RPC. Só as quatro APIs autenticadas são públicas.
revoke all on function private.bbb2_member(uuid),private.bbb2_view(uuid),private.bbb2_deck(text),private.bbb2_log(jsonb,text),private.bbb2_actor(jsonb),private.bbb2_finish(jsonb,boolean),private.bbb2_advance(jsonb),private.bbb2_next_revive(jsonb) from public,anon,authenticated;
grant execute on function private.bbb2_member(uuid) to authenticated;
revoke all on function public.bbb2_profile(text,jsonb),public.bbb2_open(text,text,text),public.bbb2_command(text,text,jsonb,bigint,uuid),public.bbb2_get(text) from public,anon;
grant execute on function public.bbb2_profile(text,jsonb),public.bbb2_open(text,text,text),public.bbb2_command(text,text,jsonb,bigint,uuid),public.bbb2_get(text) to authenticated;
do $$ begin alter publication supabase_realtime add table public.bbb2_rooms;exception when duplicate_object then null;end $$;
do $$ begin alter publication supabase_realtime add table public.bbb2_members;exception when duplicate_object then null;end $$;
commit;
