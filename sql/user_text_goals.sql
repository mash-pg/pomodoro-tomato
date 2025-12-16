create table
  public.user_text_goals (
    user_id uuid not null,
    daily_goal text null,
    weekly_goal text null,
    constraint user_text_goals_pkey primary key (user_id),
    constraint user_text_goals_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
  );

-- Enable RLS and create policies for user_text_goals
ALTER TABLE user_text_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow individual access to text goals"
ON user_text_goals FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);