-- ============================================================
-- FIX: Backfill notification messages to use i18n keys
-- ============================================================
-- This fixes all existing notifications that were stored with
-- pre-translated strings before the i18n refactor.
-- It extracts the contract title from the old message text and
-- stores it properly in the metadata column.
-- ============================================================

-- Step 1: Add metadata column if it doesn't exist yet
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Step 2: Fix old "invite" notifications that stored the full sentence
-- Pattern: "You have been invited to work on "SomeTitle"."
UPDATE public.notifications
SET
  message = 'contract.notif.newInviteMsg',
  title   = 'contract.notif.newInviteTitle',
  metadata = jsonb_build_object(
    'title',
    COALESCE(
      -- Extract the title from the old quoted message format
      (regexp_match(message, 'work on "(.+?)"'))[1],
      -- Also try without quotes
      (regexp_match(message, 'work on (.+?)\.?$'))[1],
      'your project'
    )
  )
WHERE
  type = 'invite'
  AND (
    message LIKE 'You have been invited to work on%'
    OR message LIKE '%{{title}}%'
  );

-- Step 3: Fix notifications where metadata is null or empty {}
-- and the message still contains un-interpolated {{...}} placeholders
UPDATE public.notifications
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;
