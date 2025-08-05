CREATE TABLE push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL UNIQUE,
    fcm_token TEXT UNIQUE, -- Add this line
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);