CREATE TABLE IF NOT EXISTS public.hashtags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tag text NOT NULL UNIQUE,
  usage_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT hashtags_tag_format CHECK (tag = lower(tag) AND tag ~ '^[a-z0-9_]{1,40}$')
);

CREATE TABLE IF NOT EXISTS public.post_hashtags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  hashtag_id uuid NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, hashtag_id)
);

ALTER TABLE public.post_mentions
  ADD COLUMN IF NOT EXISTS mentioned_by_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

UPDATE public.post_mentions pm
SET mentioned_by_user_id = p.user_id
FROM public.posts p
WHERE p.id = pm.post_id
AND pm.mentioned_by_user_id IS NULL;

CREATE TABLE IF NOT EXISTS public.comment_mentions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentioned_by_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, mentioned_user_id)
);

CREATE TABLE IF NOT EXISTS public.comment_hashtags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  hashtag_id uuid NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, hashtag_id)
);

INSERT INTO public.hashtags (tag, usage_count)
SELECT lower(tag), count(*)::integer
FROM public.post_tags
WHERE tag IS NOT NULL AND lower(tag) ~ '^[a-z0-9_]{1,40}$'
GROUP BY lower(tag)
ON CONFLICT (tag) DO UPDATE
SET usage_count = GREATEST(public.hashtags.usage_count, EXCLUDED.usage_count),
    updated_at = now();

INSERT INTO public.post_hashtags (post_id, hashtag_id)
SELECT DISTINCT pt.post_id, h.id
FROM public.post_tags pt
JOIN public.hashtags h ON h.tag = lower(pt.tag)
ON CONFLICT DO NOTHING;

DELETE FROM public.post_tags a
USING public.post_tags b
WHERE a.ctid < b.ctid
AND a.post_id = b.post_id
AND lower(a.tag) = lower(b.tag);

CREATE UNIQUE INDEX IF NOT EXISTS idx_post_tags_post_tag_unique
ON public.post_tags(post_id, tag);

CREATE INDEX IF NOT EXISTS idx_hashtags_tag_prefix ON public.hashtags(tag text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_hashtags_usage_count ON public.hashtags(usage_count DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_post_id ON public.post_hashtags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag_id ON public.post_hashtags(hashtag_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment_id ON public.comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_mentioned_user_id ON public.comment_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_comment_hashtags_comment_id ON public.comment_hashtags(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_hashtags_hashtag_id ON public.comment_hashtags(hashtag_id);

ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_hashtags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hashtags_select_authenticated ON public.hashtags;
CREATE POLICY hashtags_select_authenticated
ON public.hashtags FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS hashtags_insert_authenticated ON public.hashtags;
CREATE POLICY hashtags_insert_authenticated
ON public.hashtags FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS hashtags_update_authenticated ON public.hashtags;
CREATE POLICY hashtags_update_authenticated
ON public.hashtags FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS post_hashtags_select_visible ON public.post_hashtags;
CREATE POLICY post_hashtags_select_visible
ON public.post_hashtags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_hashtags.post_id
    AND p.deleted_at IS NULL
    AND (
      (p.visibility = 'public' AND COALESCE(p.archived, false) = false)
      OR p.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS post_hashtags_insert_own ON public.post_hashtags;
CREATE POLICY post_hashtags_insert_own
ON public.post_hashtags FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_hashtags.post_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS post_hashtags_delete_own ON public.post_hashtags;
CREATE POLICY post_hashtags_delete_own
ON public.post_hashtags FOR DELETE
USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_hashtags.post_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS post_mentions_insert_own ON public.post_mentions;
CREATE POLICY post_mentions_insert_own
ON public.post_mentions FOR INSERT
WITH CHECK (
  mentioned_by_user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_mentions.post_id AND p.user_id = auth.uid())
);

DROP POLICY IF EXISTS comment_mentions_select_visible ON public.comment_mentions;
CREATE POLICY comment_mentions_select_visible
ON public.comment_mentions FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.comments c
    JOIN public.posts p ON p.id = c.post_id
    WHERE c.id = comment_mentions.comment_id
    AND c.deleted_at IS NULL
    AND p.deleted_at IS NULL
    AND (
      (p.visibility = 'public' AND COALESCE(p.archived, false) = false)
      OR p.user_id = auth.uid()
      OR c.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS comment_mentions_insert_own ON public.comment_mentions;
CREATE POLICY comment_mentions_insert_own
ON public.comment_mentions FOR INSERT
WITH CHECK (
  mentioned_by_user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_mentions.comment_id AND c.user_id = auth.uid())
);

DROP POLICY IF EXISTS comment_hashtags_select_visible ON public.comment_hashtags;
CREATE POLICY comment_hashtags_select_visible
ON public.comment_hashtags FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.comments c
    JOIN public.posts p ON p.id = c.post_id
    WHERE c.id = comment_hashtags.comment_id
    AND c.deleted_at IS NULL
    AND p.deleted_at IS NULL
    AND (
      (p.visibility = 'public' AND COALESCE(p.archived, false) = false)
      OR p.user_id = auth.uid()
      OR c.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS comment_hashtags_insert_own ON public.comment_hashtags;
CREATE POLICY comment_hashtags_insert_own
ON public.comment_hashtags FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_hashtags.comment_id AND c.user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE ON public.hashtags TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.post_hashtags TO authenticated;
GRANT SELECT, INSERT ON public.comment_mentions TO authenticated;
GRANT SELECT, INSERT ON public.comment_hashtags TO authenticated;
