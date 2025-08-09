-- 1. Create user_settings table
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  work_minutes INT NOT NULL DEFAULT 25,
  short_break_minutes INT NOT NULL DEFAULT 5,
  long_break_minutes INT NOT NULL DEFAULT 15,
  long_break_interval INT NOT NULL DEFAULT 4,
  auto_start_work BOOLEAN NOT NULL DEFAULT false,
  auto_start_break BOOLEAN NOT NULL DEFAULT false,
  mute_notifications BOOLEAN NOT NULL DEFAULT false, -- Added
  dark_mode BOOLEAN NOT NULL DEFAULT true -- Added
);

-- 2. Create pomodoro_sessions table
CREATE TABLE pomodoro_sessions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_minutes INT NOT NULL
);

-- 3. Create user_goals table
CREATE TABLE user_goals (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  daily_pomodoros INT NOT NULL DEFAULT 8,
  weekly_pomodoros INT NOT NULL DEFAULT 40,
  monthly_pomodoros INT NOT NULL DEFAULT 160
);

-- 4. Enable RLS and create policies for user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow individual access to settings"
ON user_settings FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Enable RLS and create policies for pomodoro_sessions
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow individual access to sessions"
ON pomodoro_sessions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Enable RLS and create policies for user_goals
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow individual access to goals"
ON user_goals FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- 7. Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (new.id);
  INSERT INTO public.user_goals (user_id) -- Also insert default goals for new user
  VALUES (new.id);
  RETURN new;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger to call the function on new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 9. Create tasks table
CREATE TABLE tasks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10. Enable RLS and create policies for tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow individual access to tasks"
ON tasks FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
