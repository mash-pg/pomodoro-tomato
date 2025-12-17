CREATE TABLE push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL UNIQUE,
    fcm_token TEXT UNIQUE, -- Add this line
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS and create policies for push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow individual access to push subscriptions"
ON push_subscriptions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);