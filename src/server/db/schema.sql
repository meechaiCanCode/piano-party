DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

CREATE TABLE Users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    ban_expires TIMESTAMPTZ
);

CREATE TABLE Sessions (
    token TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    time_created TIMESTAMPTZ NOT NULL DEFAULT now(),
    time_expires TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days'
);

CREATE TABLE Songs (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    composer TEXT,
    style TEXT,

    file_path TEXT NOT NULL UNIQUE,

    tempo REAL,
    key_tonic TEXT,
    key_mode TEXT,
    time_numerator REAL,
    time_denominator REAL,

    difficulty REAL -- For Elena
);

CREATE TABLE Attempts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    song_id INT NOT NULL REFERENCES Songs(id),

    song_completed BOOLEAN NOT NULL,    -- If song was played to completion
    time_played TIMESTAMPTZ NOT NULL,   -- Timestamp that the song ended

    score REAL NOT NULL,
    notes_hit INT NOT NULL,             -- Notes played correctly
    notes_missed INT NOT NULL,          -- Notes not hit in the correct time window
    notes_incorrect INT NOT NULL        -- Extraneous notes played
);