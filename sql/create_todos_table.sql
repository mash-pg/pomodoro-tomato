CREATE TABLE todos (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to access their own todos" 
ON todos
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);