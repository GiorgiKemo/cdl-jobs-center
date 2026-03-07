-- Lead outreach messages: emails and SMS sent to/from leads
CREATE TABLE IF NOT EXISTS public.lead_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id     UUID        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  direction   TEXT        NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  channel     TEXT        NOT NULL CHECK (channel IN ('email', 'sms')),
  subject     TEXT,
  body        TEXT        NOT NULL,
  from_addr   TEXT,
  to_addr     TEXT,
  mg_id       TEXT,
  status      TEXT        NOT NULL DEFAULT 'sent',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_messages ENABLE ROW LEVEL SECURITY;

-- Companies can only read/write their own messages
CREATE POLICY "company_owns_lead_messages"
  ON public.lead_messages
  FOR ALL
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());

-- Fast lookups per company+lead thread
CREATE INDEX idx_lead_messages_thread
  ON public.lead_messages (company_id, lead_id, created_at DESC);

-- Fast inbound matching by recipient address (email reply-to) or phone (SMS)
CREATE INDEX idx_lead_messages_to_addr
  ON public.lead_messages (to_addr);
