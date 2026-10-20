All these songs are sourced from https://github.com/MutopiaProject/MutopiaProject/

Maybe I need to attribute idk. They need to be parsed into sql objects, where schema is probably like:
```SQL
CREATE TABLE songs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  composer text,
  duration numeric CHECK (duration_seconds >= 0),
  source_path text NOT NULL UNIQUE,

  tempo_bpm numeric CHECK (tempo_bpm > 0),

  key_tonic text,
  key_mode text,

  time_numerator smallint CHECK (time_numerator > 0),
  time_denominator smallint CHECK (time_denominator > 0),

  -- Some way to store note data for the whole song?? Maybe just use the whole .ly file from source_path?

  -- Certainly needs more. Can't think of what. Check linear for more info.
);
```