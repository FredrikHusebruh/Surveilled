-- Surveilled: every player's finished day, so a day can be compared with everyone else's.
--
-- Only the backend touches this, with the secret (service role) key, which bypasses row level
-- security. RLS is on with no policies and the anon and authenticated roles have no grants, so the
-- public API keys can neither read nor write it. Players are anonymous: `player_hash` is the
-- SHA-256 of the random id in their cookie, never the id itself.
--
-- `day` is the date of the day's records (the same four records for everyone), not the date the
-- result was recorded: players in every time zone play the same day, each from their own midnight.

create table public.day_results (
  day date not null,
  player_hash text not null check (player_hash ~ '^[0-9a-f]{64}$'),
  levels_filed smallint not null check (levels_filed between 0 and 4),
  score_seconds integer not null check (score_seconds >= 0),
  recorded_at timestamptz not null default now(),
  primary key (day, player_hash)
);

comment on table public.day_results is
  'One row per player per day once the day is over. Ranked by levels_filed (more is better), then score_seconds (adjusted time, less is better).';

create index day_results_by_rank on public.day_results (day, levels_filed, score_seconds);

alter table public.day_results enable row level security;
revoke all on table public.day_results from anon, authenticated;

-- Record a player's finished day (the first result stored for a day stands) and return where it
-- places them among everyone who has finished that day so far.
create or replace function public.record_day_result(
  p_day date,
  p_player_hash text,
  p_levels_filed integer,
  p_score_seconds integer,
  p_bins integer default 16
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  mine public.day_results;
  total integer;
  ahead integer;
  reached integer[];
  low_seconds integer;
  high_seconds integer;
  counts integer[];
begin
  if p_bins < 1 or p_bins > 64 then
    raise exception 'p_bins must be between 1 and 64, not %', p_bins;
  end if;

  insert into public.day_results (day, player_hash, levels_filed, score_seconds)
  values (p_day, p_player_hash, p_levels_filed, p_score_seconds)
  on conflict (day, player_hash) do nothing;

  select * into strict mine
  from public.day_results r
  where r.day = p_day and r.player_hash = p_player_hash;

  select count(*) into total from public.day_results r where r.day = p_day;

  select count(*) into ahead
  from public.day_results r
  where r.day = p_day
    and (r.levels_filed < mine.levels_filed
      or (r.levels_filed = mine.levels_filed and r.score_seconds > mine.score_seconds));

  select array_agg(coalesce(c.n, 0)::integer order by s.filed) into reached
  from generate_series(0, 4) as s(filed)
  left join (
    select r.levels_filed::integer as filed, count(*) as n
    from public.day_results r
    where r.day = p_day
    group by r.levels_filed
  ) c on c.filed = s.filed;

  -- The curve covers the players who got exactly as far as you, from their 2nd to 98th
  -- percentile; the few outside that are counted in the end bins.
  select percentile_disc(0.02) within group (order by r.score_seconds),
         percentile_disc(0.98) within group (order by r.score_seconds)
  into low_seconds, high_seconds
  from public.day_results r
  where r.day = p_day and r.levels_filed = mine.levels_filed;

  if high_seconds <= low_seconds then
    high_seconds := low_seconds + 1;
  end if;

  select array_agg(coalesce(c.n, 0)::integer order by b.bin) into counts
  from generate_series(1, p_bins) as b(bin)
  left join (
    select least(greatest(width_bucket(r.score_seconds::numeric, low_seconds::numeric,
                                       high_seconds::numeric, p_bins), 1), p_bins) as bin,
           count(*) as n
    from public.day_results r
    where r.day = p_day and r.levels_filed = mine.levels_filed
    group by 1
  ) c on c.bin = b.bin;

  return jsonb_build_object(
    'players', total,
    'ahead_of', ahead,
    'levels_filed', mine.levels_filed,
    'score_seconds', mine.score_seconds,
    'reached', to_jsonb(reached),
    'curve', jsonb_build_object(
      'low_seconds', low_seconds,
      'high_seconds', high_seconds,
      'counts', to_jsonb(counts)
    )
  );
end;
$$;

revoke execute on function public.record_day_result(date, text, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.record_day_result(date, text, integer, integer, integer)
  to service_role;
