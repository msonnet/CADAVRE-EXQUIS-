-- Fix: "vers libre" structures have a variable number of cases (min..max),
-- chosen with Math.random(). That value was recomputed on every render and on
-- every client independently, so clients disagreed on how many cases the game
-- had — non-host players could think the game was over (or never-ending) and
-- get stuck. Persist the chosen total once, at game start, on the room row so
-- every client reads the same number.

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS nb_cases integer;
