DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

CREATE TABLE Users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE Sessions (
    token TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    time_created TIMESTAMPTZ NOT NULL DEFAULT now(),
    time_expires TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days'
);

CREATE TABLE Songs (
    id SERIAL PRIMARY KEY
    -- meechai's job :3
);