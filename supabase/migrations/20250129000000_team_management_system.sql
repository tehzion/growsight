-- Migration: Team Management System
-- Created: 2025-01-29
-- Description: Adds tables for team management including teams, team members, and team goals

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TEAMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.teams (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    team_lead_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT teams_name_check CHECK (char_length(name) >= 2 AND char_length(name) <= 100)
);

-- Create indexes for teams
CREATE INDEX IF NOT EXISTS idx_teams_organization_id ON public.teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_team_lead_id ON public.teams(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_teams_is_active ON public.teams(is_active);
CREATE INDEX IF NOT EXISTS idx_teams_created_at ON public.teams(created_at DESC);

-- Add comments
COMMENT ON TABLE public.teams IS 'Stores team information for organizing users within organizations';
COMMENT ON COLUMN public.teams.name IS 'Team name (2-100 characters)';
COMMENT ON COLUMN public.teams.team_lead_id IS 'User ID of the team lead (optional)';
COMMENT ON COLUMN public.teams.is_active IS 'Soft delete flag - inactive teams are archived';

-- =====================================================
-- TEAM MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.team_members (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member',
    joined_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT team_members_unique_user_per_team UNIQUE(team_id, user_id),
    CONSTRAINT team_members_role_check CHECK (role IN ('member', 'lead'))
);

-- Create indexes for team_members
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON public.team_members(role);

-- Add comments
COMMENT ON TABLE public.team_members IS 'Junction table linking users to teams with their roles';
COMMENT ON COLUMN public.team_members.role IS 'Role of the user in the team: member or lead';
COMMENT ON CONSTRAINT team_members_unique_user_per_team ON public.team_members IS 'Prevents duplicate user assignments to the same team';

-- =====================================================
-- TEAM GOALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.team_goals (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    target_value numeric(10, 2),
    current_value numeric(10, 2) NOT NULL DEFAULT 0,
    metric text,
    deadline timestamp with time zone,
    status text NOT NULL DEFAULT 'active',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT team_goals_title_check CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
    CONSTRAINT team_goals_status_check CHECK (status IN ('active', 'completed', 'cancelled')),
    CONSTRAINT team_goals_values_check CHECK (target_value IS NULL OR target_value >= 0),
    CONSTRAINT team_goals_current_value_check CHECK (current_value >= 0)
);

-- Create indexes for team_goals
CREATE INDEX IF NOT EXISTS idx_team_goals_team_id ON public.team_goals(team_id);
CREATE INDEX IF NOT EXISTS idx_team_goals_status ON public.team_goals(status);
CREATE INDEX IF NOT EXISTS idx_team_goals_deadline ON public.team_goals(deadline);
CREATE INDEX IF NOT EXISTS idx_team_goals_created_at ON public.team_goals(created_at DESC);

-- Add comments
COMMENT ON TABLE public.team_goals IS 'Stores team performance goals and tracks progress';
COMMENT ON COLUMN public.team_goals.target_value IS 'Target value for the goal (nullable for qualitative goals)';
COMMENT ON COLUMN public.team_goals.current_value IS 'Current progress towards the goal';
COMMENT ON COLUMN public.team_goals.metric IS 'Unit of measurement (e.g., "Score/7", "Leads", "Revenue")';
COMMENT ON COLUMN public.team_goals.status IS 'Goal status: active, completed, or cancelled';

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all team tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_goals ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TEAMS RLS POLICIES
-- =====================================================

-- Super admins can do everything
CREATE POLICY "Super admins have full access to teams"
    ON public.teams
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

-- Org admins can manage teams in their organization
CREATE POLICY "Org admins can view teams in their organization"
    ON public.teams
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'org_admin'
            AND users.organization_id = teams.organization_id
        )
    );

CREATE POLICY "Org admins can create teams in their organization"
    ON public.teams
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'org_admin'
            AND users.organization_id = teams.organization_id
        )
    );

CREATE POLICY "Org admins can update teams in their organization"
    ON public.teams
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'org_admin'
            AND users.organization_id = teams.organization_id
        )
    );

CREATE POLICY "Org admins can delete teams in their organization"
    ON public.teams
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'org_admin'
            AND users.organization_id = teams.organization_id
        )
    );

-- Users can view teams they are members of
CREATE POLICY "Users can view teams they belong to"
    ON public.teams
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = teams.id
            AND team_members.user_id = auth.uid()
        )
    );

-- =====================================================
-- TEAM MEMBERS RLS POLICIES
-- =====================================================

-- Super admins can do everything
CREATE POLICY "Super admins have full access to team members"
    ON public.team_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

-- Org admins can manage team members in their organization
CREATE POLICY "Org admins can manage team members in their organization"
    ON public.team_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.teams
            JOIN public.users ON users.id = auth.uid()
            WHERE teams.id = team_members.team_id
            AND users.role = 'org_admin'
            AND users.organization_id = teams.organization_id
        )
    );

-- Users can view team members of teams they belong to
CREATE POLICY "Users can view members of their teams"
    ON public.team_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members AS my_membership
            WHERE my_membership.team_id = team_members.team_id
            AND my_membership.user_id = auth.uid()
        )
    );

-- =====================================================
-- TEAM GOALS RLS POLICIES
-- =====================================================

-- Super admins can do everything
CREATE POLICY "Super admins have full access to team goals"
    ON public.team_goals
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

-- Org admins can manage team goals in their organization
CREATE POLICY "Org admins can manage team goals in their organization"
    ON public.team_goals
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.teams
            JOIN public.users ON users.id = auth.uid()
            WHERE teams.id = team_goals.team_id
            AND users.role = 'org_admin'
            AND users.organization_id = teams.organization_id
        )
    );

-- Users can view goals of teams they belong to
CREATE POLICY "Users can view goals of their teams"
    ON public.team_goals
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = team_goals.team_id
            AND team_members.user_id = auth.uid()
        )
    );

-- Team leads can update goals for their teams
CREATE POLICY "Team leads can update goals for their teams"
    ON public.team_goals
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = team_goals.team_id
            AND team_members.user_id = auth.uid()
            AND team_members.role = 'lead'
        )
    );

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for teams
DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add triggers for team_goals
DROP TRIGGER IF EXISTS update_team_goals_updated_at ON public.team_goals;
CREATE TRIGGER update_team_goals_updated_at
    BEFORE UPDATE ON public.team_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get team member count
CREATE OR REPLACE FUNCTION public.get_team_member_count(team_uuid uuid)
RETURNS integer AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::integer
        FROM public.team_members
        WHERE team_id = team_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is team lead
CREATE OR REPLACE FUNCTION public.is_team_lead(team_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.team_members
        WHERE team_id = team_uuid
        AND user_id = user_uuid
        AND role = 'lead'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT ON public.teams TO authenticated;
GRANT SELECT ON public.team_members TO authenticated;
GRANT SELECT ON public.team_goals TO authenticated;

-- Grant all permissions to service role (for backend operations)
GRANT ALL ON public.teams TO service_role;
GRANT ALL ON public.team_members TO service_role;
GRANT ALL ON public.team_goals TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.get_team_member_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_lead TO authenticated;

-- =====================================================
-- SAMPLE DATA (Optional - for development)
-- =====================================================
-- Uncomment to add sample data

/*
-- Insert sample teams (requires existing organization and user IDs)
INSERT INTO public.teams (name, description, organization_id, created_by)
VALUES 
    ('Engineering Team', 'Software development and technical operations', 
     (SELECT id FROM public.organizations LIMIT 1), 
     (SELECT id FROM public.users WHERE role = 'org_admin' LIMIT 1)),
    ('Sales Team', 'Revenue generation and customer acquisition', 
     (SELECT id FROM public.organizations LIMIT 1), 
     (SELECT id FROM public.users WHERE role = 'org_admin' LIMIT 1));
*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Team Management migration completed successfully';
    RAISE NOTICE 'Created tables: teams, team_members, team_goals';
    RAISE NOTICE 'Applied RLS policies for all team tables';
    RAISE NOTICE 'Created indexes for performance optimization';
END $$;
