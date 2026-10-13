-- BBB multiplayer MVP: executar no SQL Editor de um projeto Supabase novo.
-- Ativar Authentication > Providers > Anonymous antes de usar.
create schema if not exists private;
create table if not exists public.bbb_rooms (
 id uuid primary key default gen_random_uuid(), code text unique not null check (code ~ '^[0-9]{6}$'),
 host_id uuid not null, status text not null default 'lobby' check(status in ('lobby','playing','finished')),
 battle jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.bbb_members (
 room_id uuid not null references public.bbb_rooms(id) on delete cascade,
 user_id uuid not null, name text not null check(length(name) between 1 and 25),
 joined_at timestamptz not null default now(), primary key(room_id,user_id)
);
create index if not exists bbb_members_user_idx on public.bbb_members(user_id);
create or replace function private.bbb_is_member(rid uuid) returns boolean language sql security definer set search_path = '' stable as $$
 select exists(select 1 from public.bbb_members m where m.room_id=rid and m.user_id=(select auth.uid()));
$$;
revoke all on function private.bbb_is_member(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.bbb_is_member(uuid) to authenticated;
alter table public.bbb_rooms enable row level security;
alter table public.bbb_members enable row level security;
revoke all on public.bbb_rooms from anon,authenticated;
revoke all on public.bbb_members from anon,authenticated;
grant select on public.bbb_rooms,public.bbb_members to authenticated;
drop policy if exists bbb_rooms_read on public.bbb_rooms;
create policy bbb_rooms_read on public.bbb_rooms for select to authenticated using (private.bbb_is_member(id));
drop policy if exists bbb_members_read on public.bbb_members;
create policy bbb_members_read on public.bbb_members for select to authenticated using (private.bbb_is_member(room_id));

create or replace function public.bbb_create_room(p_name text) returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); c text; rid uuid; i integer;
begin
 if uid is null then raise exception 'Sessão não autenticada'; end if;
 if length(trim(coalesce(p_name,''))) not between 1 and 25 then raise exception 'Nome inválido'; end if;
 for i in 1..30 loop
  c:=lpad((floor(random()*1000000))::int::text,6,'0');
  begin
   insert into public.bbb_rooms(code,host_id) values(c,uid) returning id into rid;
   exit;
  exception when unique_violation then null;
  end;
 end loop;
 if rid is null then raise exception 'Não foi possível gerar o código'; end if;
 insert into public.bbb_members(room_id,user_id,name) values(rid,uid,trim(p_name));
 return c;
end;$$;

create or replace function public.bbb_join_room(p_code text,p_name text) returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); r public.bbb_rooms%rowtype; n int;
begin
 if uid is null then raise exception 'Sessão não autenticada'; end if;
 if length(trim(coalesce(p_name,''))) not between 1 and 25 then raise exception 'Nome inválido'; end if;
 select * into r from public.bbb_rooms where code=p_code for update;
 if not found then raise exception 'Sala não encontrada'; end if;
 if exists(select 1 from public.bbb_members where room_id=r.id and user_id=uid) then return r.code; end if;
 if r.status <> 'lobby' then raise exception 'Esta batalha já começou'; end if;
 select count(*) into n from public.bbb_members where room_id=r.id;
 if n>=5 then raise exception 'Sala cheia (máximo 5 jogadores)'; end if;
 insert into public.bbb_members(room_id,user_id,name) values(r.id,uid,trim(p_name));
 return r.code;
end;$$;

create or replace function public.bbb_start_battle(p_code text) returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); r public.bbb_rooms%rowtype; p record; players jsonb:='{}'::jsonb; turnids jsonb:='[]'::jsonb; n int:=0; hp int;
begin
 if uid is null then raise exception 'Sessão inválida'; end if;
 select * into r from public.bbb_rooms where code=p_code for update;
 if not found or r.host_id<>uid then raise exception 'Só o Host pode iniciar'; end if;
 if r.status<>'lobby' then raise exception 'A sala já iniciou'; end if;
 for p in select * from public.bbb_members where room_id=r.id order by joined_at, user_id loop
  players:=players||jsonb_build_object(p.user_id::text,jsonb_build_object('name',p.name,'hp',25,'max_hp',25));
  turnids:=turnids||to_jsonb(p.user_id::text); n:=n+1;
 end loop;
 if n=0 then raise exception 'Party vazia'; end if;
 hp:=50+25*(n-1);
 update public.bbb_rooms set status='playing',battle=jsonb_build_object('players',players,'turn_order',turnids,'turn_index',0,'round',1,'boss_hp',hp,'boss_max_hp',hp,'last_event','A batalha começou!') where id=r.id;
end;$$;

create or replace function public.bbb_take_action(p_code text,p_action text) returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid(); r public.bbb_rooms%rowtype; b jsonb; ps jsonb; ids jsonb; idx int; n int; roll int; me jsonb; hp int; boss_hp int; target text; victim jsonb; count_alive int:=0; eid text; winner text:=null; actionlabel text;
begin
 if uid is null then raise exception 'Não autenticado'; end if;
 if p_action not in ('attack','heal') then raise exception 'Ação desconhecida'; end if;
 select * into r from public.bbb_rooms where code=p_code for update;
 if not found or r.status<>'playing' then raise exception 'Combate não disponível'; end if;
 if not exists(select 1 from public.bbb_members where room_id=r.id and user_id=uid) then raise exception 'Não pertences à sala'; end if;
 b:=r.battle; ps:=b->'players'; ids:=b->'turn_order'; idx:=(b->>'turn_index')::int; n:=jsonb_array_length(ids);
 if n=0 or ids->>idx <> uid::text then raise exception 'Não é o teu turno'; end if;
 me:=ps->uid::text; if coalesce((me->>'hp')::int,0)<=0 then raise exception 'A tua personagem morreu'; end if;
 roll:=2+floor(random()*9)::int; boss_hp:=(b->>'boss_hp')::int;
 if p_action='attack' then
  boss_hp:=greatest(0,boss_hp-roll);b:=jsonb_set(b,'{boss_hp}',to_jsonb(boss_hp));
  actionlabel:=(me->>'name')||' atacou o Boss com '||roll||' de dano.';
 else
  hp:=least((me->>'max_hp')::int,(me->>'hp')::int+roll);
  ps:=jsonb_set(ps,array[uid::text,'hp'],to_jsonb(hp));
  actionlabel:=(me->>'name')||' recuperou vida com uma carta '||roll||'.';
 end if;
 if boss_hp=0 then winner:='party';
 else
  -- O turno passa ao próximo jogador VIVO; Boss ataca UMA VEZ no fim da ronda.
  idx:=idx+1;
  while idx<n and coalesce((ps->(ids->>idx)->>'hp')::int,0)<=0 loop idx:=idx+1;end loop;
  if idx>=n then
   -- Ataque automático do Boss contra um jogador vivo aleatório.
   select count(*) into count_alive from jsonb_each(ps) x where (x.value->>'hp')::int>0;
   if count_alive>0 then
    select x.key into target from jsonb_each(ps) x where (x.value->>'hp')::int>0 order by random() limit 1;
    roll:=2+floor(random()*9)::int; victim:=ps->target;
    hp:=greatest(0,(victim->>'hp')::int-roll);
    ps:=jsonb_set(ps,array[target,'hp'],to_jsonb(hp));
    actionlabel:=actionlabel||' King Mantis atacou '||(victim->>'name')||' ('||roll||' dano).';
   end if;
   idx:=0; b:=jsonb_set(b,'{round}',to_jsonb((b->>'round')::int+1));
   while idx<n and coalesce((ps->(ids->>idx)->>'hp')::int,0)<=0 loop idx:=idx+1;end loop;
   if idx>=n then winner:='boss';idx:=0;end if;
  end if;
 end if;
 b:=jsonb_set(b,'{players}',ps);
 b:=jsonb_set(b,'{turn_index}',to_jsonb(idx));
 b:=jsonb_set(b,'{last_event}',to_jsonb(actionlabel));
 if winner is not null then b:=jsonb_set(b,'{winner}',to_jsonb(winner));end if;
 update public.bbb_rooms set battle=b,status=case when winner is null then 'playing' else 'finished' end where id=r.id;
end;$$;
revoke all on function public.bbb_create_room(text),public.bbb_join_room(text,text),public.bbb_start_battle(text),public.bbb_take_action(text,text) from public,anon;
grant execute on function public.bbb_create_room(text),public.bbb_join_room(text,text),public.bbb_start_battle(text),public.bbb_take_action(text,text) to authenticated;
-- Realtime Postgres Changes: ativar as tabelas (pode já estar ativado)
do $$ begin
 alter publication supabase_realtime add table public.bbb_rooms;
 exception when duplicate_object then null; end $$;
do $$ begin
 alter publication supabase_realtime add table public.bbb_members;
 exception when duplicate_object then null; end $$;
