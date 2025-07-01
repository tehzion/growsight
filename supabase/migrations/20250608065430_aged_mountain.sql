/*
  # Add INSERT policy for organizations table

  1. Security Changes
    - Add RLS policy to allow authenticated users to insert organizations
    - This enables the organization creation functionality in the frontend
  
  2. Policy Details
    - Allows any authenticated user to create organizations
    - The created organization will be associated with the user through the application logic
*/

-- Add policy to allow authenticated users to create organizations
CREATE POLICY "Authenticated users can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);