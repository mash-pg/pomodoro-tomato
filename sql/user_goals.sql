-- This script creates the user_goals table, enables RLS, and updates the new user trigger.
-- Execute this in your Supabase SQL Editor to set up the goals feature.

-- 1. Create user_goals table
CREATE TABLE public.user_goals (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  daily_pomodoros INT NOT NULL DEFAULT 8,
  weekly_pomodoros INT NOT NULL DEFAULT 40,
  monthly_pomodoros INT NOT NULL DEFAULT 160
);

-- 2. Enable RLS and create policies for user_goals
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow individual access to goals"
ON public.user_goals FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Update the function to handle new user creation
-- This ensures new users get default goals.
-- Note: This will overwrite the existing function.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default settings for a new user
  INSERT INTO public.user_settings (user_id)
  VALUES (new.id);
  
  -- Insert default goals for a new user
  INSERT INTO public.user_goals (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger itself does not need to be recreated if it already exists.
-- It will automatically use the updated function.
