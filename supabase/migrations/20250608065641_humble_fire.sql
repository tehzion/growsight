-- Drop the existing view if it exists
DROP VIEW IF EXISTS dashboard_analytics;

-- Create a proper table-based analytics function instead of a view
CREATE OR REPLACE FUNCTION get_organization_analytics(org_id uuid DEFAULT NULL)
RETURNS TABLE (
  organization_id uuid,
  organization_name text,
  total_employees bigint,
  total_reviewers bigint,
  total_assessments bigint,
  completed_assessments bigint,
  pending_assessments bigint,
  in_progress_assessments bigint,
  average_rating numeric,
  total_responses bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF org_id IS NULL THEN
    -- Return aggregated data for all organizations
    RETURN QUERY
    SELECT 
      o.id as organization_id,
      o.name as organization_name,
      COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'employee') as total_employees,
      COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'reviewer') as total_reviewers,
      COUNT(DISTINCT a.id) as total_assessments,
      COUNT(DISTINCT aa.id) FILTER (WHERE aa.status = 'completed') as completed_assessments,
      COUNT(DISTINCT aa.id) FILTER (WHERE aa.status = 'pending') as pending_assessments,
      COUNT(DISTINCT aa.id) FILTER (WHERE aa.status = 'in_progress') as in_progress_assessments,
      COALESCE(ROUND(AVG(
        CASE 
          WHEN ar.rating IS NOT NULL THEN ar.rating::numeric
          ELSE NULL 
        END
      ), 2), 0) as average_rating,
      COUNT(DISTINCT ar.id) as total_responses
    FROM organizations o
    LEFT JOIN users u ON u.organization_id = o.id
    LEFT JOIN assessments a ON a.organization_id = o.id
    LEFT JOIN assessment_assignments aa ON aa.assessment_id = a.id
    LEFT JOIN assessment_responses ar ON ar.assignment_id = aa.id
    GROUP BY o.id, o.name;
  ELSE
    -- Return data for specific organization
    RETURN QUERY
    SELECT 
      o.id as organization_id,
      o.name as organization_name,
      COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'employee') as total_employees,
      COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'reviewer') as total_reviewers,
      COUNT(DISTINCT a.id) as total_assessments,
      COUNT(DISTINCT aa.id) FILTER (WHERE aa.status = 'completed') as completed_assessments,
      COUNT(DISTINCT aa.id) FILTER (WHERE aa.status = 'pending') as pending_assessments,
      COUNT(DISTINCT aa.id) FILTER (WHERE aa.status = 'in_progress') as in_progress_assessments,
      COALESCE(ROUND(AVG(
        CASE 
          WHEN ar.rating IS NOT NULL THEN ar.rating::numeric
          ELSE NULL 
        END
      ), 2), 0) as average_rating,
      COUNT(DISTINCT ar.id) as total_responses
    FROM organizations o
    LEFT JOIN users u ON u.organization_id = o.id
    LEFT JOIN assessments a ON a.organization_id = o.id
    LEFT JOIN assessment_assignments aa ON aa.assessment_id = a.id
    LEFT JOIN assessment_responses ar ON ar.assignment_id = aa.id
    WHERE o.id = org_id
    GROUP BY o.id, o.name;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_organization_analytics TO authenticated;

-- Update the existing dashboard analytics function to use proper access control
DROP FUNCTION IF EXISTS get_dashboard_analytics(uuid);

CREATE OR REPLACE FUNCTION get_dashboard_analytics(requesting_user_id uuid)
RETURNS TABLE (
  organization_id uuid,
  organization_name text,
  total_employees bigint,
  total_reviewers bigint,
  total_assessments bigint,
  completed_assessments bigint,
  pending_assessments bigint,
  in_progress_assessments bigint,
  average_rating numeric,
  total_responses bigint
) 
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
  user_org_id uuid;
BEGIN
  -- Get user role and organization
  SELECT role, organization_id INTO user_role, user_org_id
  FROM users WHERE id = requesting_user_id;
  
  -- Return data based on user permissions
  IF user_role = 'super_admin' THEN
    -- Super admin sees all organizations
    RETURN QUERY SELECT * FROM get_organization_analytics();
  ELSIF user_role = 'org_admin' THEN
    -- Org admin sees only their organization
    RETURN QUERY SELECT * FROM get_organization_analytics(user_org_id);
  ELSE
    -- Other users see no analytics
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_dashboard_analytics TO authenticated;