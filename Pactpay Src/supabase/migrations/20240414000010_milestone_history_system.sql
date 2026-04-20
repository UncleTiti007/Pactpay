-- ============================================================
-- Milestone History & Submissions System
-- Goal: Track entire lifecycle of a milestone including 
-- original submission, revision requests, and resubmissions.
-- ============================================================

-- 1. Create the milestone_submissions table
CREATE TABLE IF NOT EXISTS public.milestone_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    type TEXT NOT NULL CHECK (type IN ('submission', 'revision_request')),
    note TEXT,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add RLS Policies
ALTER TABLE public.milestone_submissions ENABLE ROW LEVEL SECURITY;

-- Select: Both parties to the contract can view history
CREATE POLICY "Parties can view milestone history"
ON public.milestone_submissions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.milestones m
        JOIN public.contracts c ON c.id = m.contract_id
        WHERE m.id = milestone_id
        AND (c.client_id = auth.uid() OR c.freelancer_id = auth.uid())
    )
);

-- Insert: Freelancers can insert 'submission', Clients can insert 'revision_request'
CREATE POLICY "Parties can insert milestone events"
ON public.milestone_submissions FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.milestones m
        JOIN public.contracts c ON c.id = m.contract_id
        WHERE m.id = milestone_id
        AND (
            (c.freelancer_id = auth.uid() AND type = 'submission') OR
            (c.client_id = auth.uid() AND type = 'revision_request')
        )
    )
);

-- 3. Trigger to keep last submission data on the main milestones table for quick access
-- (Optional but helpful for keeping existing queries working without complex joins everywhere)
CREATE OR REPLACE FUNCTION update_milestone_last_submission()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'submission' THEN
        UPDATE public.milestones
        SET submission_note = NEW.note,
            submission_url = NEW.attachment_url
        WHERE id = NEW.milestone_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_milestone_submission_added
AFTER INSERT ON public.milestone_submissions
FOR EACH ROW EXECUTE FUNCTION update_milestone_last_submission();
