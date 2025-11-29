-- Migration: User Goals System
-- Created: 2025-01-29
-- Description: Adds user_goals table for personal goal management

-- Create user_goals table
CREATE TABLE IF NOT EXISTS public.user_goals (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_date date,
    progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON public.user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_status ON public.user_goals(status);
CREATE INDEX IF NOT EXISTS idx_user_goals_due_date ON public.user_goals(due_date);

-- Enable RLS
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own goals
CREATE POLICY "Users can view their own goals"
    ON public.user_goals
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert their own goals
CREATE POLICY "Users can create their own goals"
    ON public.user_goals
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own goals
CREATE POLICY "Users can update their own goals"
    ON public.user_goals
    FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete their own goals
CREATE POLICY "Users can delete their own goals"
    ON public.user_goals
    FOR DELETE
    USING (user_id = auth.uid());

-- Org admins can view goals of users in their organization (optional, for oversight)
CREATE POLICY "Org admins can view goals in their org"
    ON public.user_goals
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'org_admin'
            AND u.organization_id = (
                SELECT organization_id FROM public.users WHERE id = user_goals.user_id
            )
        )
    );

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_user_goals_updated_at ON public.user_goals;
CREATE TRIGGER update_user_goals_updated_at
    BEFORE UPDATE ON public.user_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_goals TO authenticated;
GRANT ALL ON public.user_goals TO service_role;

COMMENT ON TABLE public.user_goals IS 'Stores personal development goals for users';
