/*
  # Enhanced Assessment Features Migration
  
  1. New Features
    - Multiple choice questions support via question_options table
    - Question type handling (rating, multiple choice, yes/no, text)
    - Progress tracking system
    - Response validation for different question types
  
  2. Security
    - RLS policies for new tables
    - Proper access control for different user roles
  
  3. Data Integrity
    - Constraints for valid responses
    - Automatic progress tracking via triggers
*/

-- Add options for multiple choice questions
CREATE TABLE IF NOT EXISTS question_options (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id uuid REFERENCES assessment_questions(id) ON DELETE CASCADE,
  text text NOT NULL,
  value integer,
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Update assessment_questions table
ALTER TABLE assessment_questions
ADD COLUMN IF NOT EXISTS question_type question_type NOT NULL DEFAULT 'rating',
ADD COLUMN IF NOT EXISTS scale_max integer CHECK (scale_max >= 2 AND scale_max <= 10),
ADD COLUMN IF NOT EXISTS is_required boolean NOT NULL DEFAULT true;

-- Add constraint to ensure scale_max is set for rating questions
DO $$ 
BEGIN
  ALTER TABLE assessment_questions
  ADD CONSTRAINT valid_scale_max CHECK (
    (question_type = 'rating' AND scale_max IS NOT NULL) OR
    (question_type != 'rating' AND scale_max IS NULL)
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create progress tracking table
CREATE TABLE IF NOT EXISTS assessment_progress (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id uuid REFERENCES assessment_assignments(id) ON DELETE CASCADE,
  section_id uuid REFERENCES assessment_sections(id) ON DELETE CASCADE,
  completed_questions integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  last_updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(assignment_id, section_id)
);

-- Update assessment_responses table to handle different question types
ALTER TABLE assessment_responses
ALTER COLUMN rating DROP NOT NULL,
ADD COLUMN IF NOT EXISTS text_response text,
ADD COLUMN IF NOT EXISTS selected_option_id uuid REFERENCES question_options(id) ON DELETE SET NULL;

-- Add response validation constraint
DO $$ 
BEGIN
  ALTER TABLE assessment_responses
  ADD CONSTRAINT valid_response CHECK (
    (rating IS NOT NULL AND text_response IS NULL AND selected_option_id IS NULL) OR
    (rating IS NULL AND text_response IS NOT NULL AND selected_option_id IS NULL) OR
    (rating IS NULL AND text_response IS NULL AND selected_option_id IS NOT NULL)
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enable RLS for new tables
ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for question options
DO $$ 
BEGIN
  CREATE POLICY "Super admins can manage question options"
    ON question_options
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'super_admin'
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Users can view question options in their organization"
    ON question_options
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM users u
        JOIN assessments a ON a.organization_id = u.organization_id
        JOIN assessment_sections s ON s.assessment_id = a.id
        JOIN assessment_questions q ON q.section_id = s.id
        WHERE u.id = auth.uid()
        AND q.id = question_options.question_id
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create policies for progress tracking
DO $$ 
BEGIN
  CREATE POLICY "Super admins can view all progress"
    ON assessment_progress
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'super_admin'
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE POLICY "Users can manage their own progress"
    ON assessment_progress
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM assessment_assignments aa
        WHERE aa.id = assessment_progress.assignment_id
        AND (aa.employee_id = auth.uid() OR aa.reviewer_id = auth.uid())
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create trigger for progress tracking
CREATE OR REPLACE FUNCTION update_assessment_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update progress when a response is added/updated/deleted
  WITH section_stats AS (
    SELECT 
      aa.id as assignment_id,
      aq.section_id,
      COUNT(DISTINCT ar.question_id) as completed_questions,
      COUNT(DISTINCT aq.id) as total_questions
    FROM assessment_assignments aa
    JOIN assessment_questions aq ON aq.section_id IN (
      SELECT id FROM assessment_sections WHERE assessment_id = aa.assessment_id
    )
    LEFT JOIN assessment_responses ar ON ar.assignment_id = aa.id AND ar.question_id = aq.id
    WHERE aa.id = NEW.assignment_id OR aa.id = OLD.assignment_id
    GROUP BY aa.id, aq.section_id
  )
  INSERT INTO assessment_progress (
    assignment_id,
    section_id,
    completed_questions,
    total_questions,
    is_completed
  )
  SELECT
    assignment_id,
    section_id,
    completed_questions,
    total_questions,
    completed_questions = total_questions
  FROM section_stats
  ON CONFLICT (assignment_id, section_id) DO UPDATE
  SET
    completed_questions = EXCLUDED.completed_questions,
    total_questions = EXCLUDED.total_questions,
    is_completed = EXCLUDED.completed_questions = EXCLUDED.total_questions,
    last_updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
  CREATE TRIGGER track_assessment_progress
    AFTER INSERT OR UPDATE OR DELETE ON assessment_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_assessment_progress();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add trigger for updated_at columns
DO $$ 
BEGIN
  CREATE TRIGGER update_question_options_updated_at
    BEFORE UPDATE ON question_options
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
  CREATE TRIGGER update_assessment_progress_updated_at
    BEFORE UPDATE ON assessment_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;