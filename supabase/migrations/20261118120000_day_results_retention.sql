-- Surveilled: keep finished days for one year, as the privacy notice promises.
--
-- Standings only ever compare players on the same day, so old rows serve no purpose. Instead of a
-- scheduler, every insert also removes the rows whose day is more than 365 days old. The primary
-- key leads with `day`, so the delete is an index range scan and stays cheap. It fires once per
-- insert statement, whether the row came from record_day_result or a bulk insert such as the
-- development seed script.

create or replace function public.forget_old_day_results()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.day_results r where r.day < current_date - 365;
  return null;
end;
$$;

comment on function public.forget_old_day_results() is
  'Deletes finished days older than 365 days. Runs after every insert into day_results.';

revoke execute on function public.forget_old_day_results() from public, anon, authenticated;

create trigger day_results_retention
  after insert on public.day_results
  for each statement
  execute function public.forget_old_day_results();
