-- direct_messages: internal website chat between a company and a registered driver.
-- Separate from lead_messages (which is for email/SMS to scraped leads) and
-- from messages (which is tied to job applications).

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role TEXT        NOT NULL CHECK (sender_role IN ('company', 'driver')),
  body        TEXT        NOT NULL,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_thread
  ON public.direct_messages (company_id, driver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_direct_messages_driver
  ON public.direct_messages (driver_id, created_at DESC);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Company can read/write messages in their own threads
CREATE POLICY "dm_company_own" ON public.direct_messages
  FOR ALL USING (company_id = auth.uid());

-- Driver can read messages addressed to them and insert replies
CREATE POLICY "dm_driver_own" ON public.direct_messages
  FOR ALL USING (driver_id = auth.uid());
