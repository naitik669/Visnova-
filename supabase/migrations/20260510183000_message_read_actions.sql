ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reply_to_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
ADD COLUMN IF NOT EXISTS failed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS resend_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_resend_at timestamptz;

ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS target_owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS details text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS reports_reporter_target_unique
ON public.reports(reporter_id, target_type, target_id);

CREATE OR REPLACE FUNCTION public.mark_conversation_read(target_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_conversation_participant(target_conversation_id) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  UPDATE public.messages
  SET read_at = now()
  WHERE conversation_id = target_conversation_id
    AND user_id <> auth.uid()
    AND read_at IS NULL
    AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_conversation_read(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;

DROP POLICY IF EXISTS messages_update_own ON public.messages;
CREATE POLICY messages_update_own
ON public.messages
FOR UPDATE
USING (
  user_id = auth.uid()
  AND public.is_conversation_participant(conversation_id)
)
WITH CHECK (
  user_id = auth.uid()
  AND public.is_conversation_participant(conversation_id)
);
