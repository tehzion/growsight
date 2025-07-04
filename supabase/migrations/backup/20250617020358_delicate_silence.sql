/*
  # Update assessments RLS policy for organization visibility

  1. Changes
     - Drop existing "Users can view assessments in their organization" policy
     - Create new policy that allows users to view assessments that are:
       a) Directly created in their organization, OR
       b) Assigned to their organization via assessment_organization_assignments table
  
  2. Security
     - Maintains data isolation between organizations
     - Allows proper visibility of assessments assigned by super admins
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view assessments in their organization" ON public.assessments;

-- Create the updated policy with enhanced visibility rules
CREATE POLICY "Users can view assessments in their organization" 
ON public.assessments
FOR SELECT
TO authenticated
USING (
  -- User can view if assessment belongs directly to their organization
  (organization_id = (
    SELECT users.organization_id
    FROM users
    WHERE users.id = auth.uid()
  ))
  OR
  -- User can view if assessment is assigned to their organization
  (EXISTS (
    SELECT 1
    FROM assessment_organization_assignments aoa
    JOIN users u ON u.organization_id = aoa.organization_id
    WHERE aoa.assessment_id = assessments.id
    AND u.id = auth.uid()
  ))
);