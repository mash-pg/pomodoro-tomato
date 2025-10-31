-- 1日1レコード：今日の達成数（完了トグルで+1）
create table if not exists daily_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default ((now() at time zone 'utc')::date),
  completed_count int not null default 0,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, day)
);

alter table daily_progress enable row level security;

create policy "allow user read own daily_progress"
on daily_progress for select
to authenticated
using (auth.uid() = user_id);

create policy "allow user upsert own daily_progress"
on daily_progress for insert
to authenticated
with check (auth.uid() = user_id);

create policy "allow user update own daily_progress"
on daily_progress for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
