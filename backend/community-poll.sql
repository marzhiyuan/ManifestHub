-- ============================================================
-- 8. Community Poll Tables
-- ============================================================

CREATE TABLE public.polls (
  id          BIGSERIAL PRIMARY KEY,
  question    TEXT NOT NULL,
  options     TEXT[] NOT NULL, -- e.g., ARRAY['Yes', 'No']
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE public.poll_votes (
  id          BIGSERIAL PRIMARY KEY,
  poll_id     BIGINT REFERENCES public.polls(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vote_option TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  
  -- Enforce one vote per user per poll
  UNIQUE(poll_id, user_id)
);

-- Create index for fast lookups on active poll votes
CREATE INDEX idx_poll_votes_lookup ON public.poll_votes(poll_id, user_id);

-- Enable RLS
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Polls
CREATE POLICY "Anyone can read polls" 
  ON public.polls FOR SELECT USING (true);

CREATE POLICY "Only Admins can modify polls" 
  ON public.polls FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.admins WHERE email = auth.jwt() ->> 'email'));

-- RLS Policies for Votes
CREATE POLICY "Anyone can read votes" 
  ON public.poll_votes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote once on active polls" 
  ON public.poll_votes FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM public.polls WHERE id = poll_id AND is_active = true)
  );

