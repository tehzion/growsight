-- Fix assessment responses table constraints
ALTER TABLE assessment_responses
DROP CONSTRAINT IF EXISTS valid_response;

ALTER TABLE assessment_responses
ADD CONSTRAINT valid_response CHECK (
  (rating IS NOT NULL AND text_response IS NULL AND selected_option_id IS NULL) OR
  (rating IS NULL AND text_response IS NOT NULL AND selected_option_id IS NULL) OR
  (rating IS NULL AND text_response IS NULL AND selected_option_id IS NOT NULL)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_assessment_responses_assignment_id ON assessment_responses(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_question_id ON assessment_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_respondent_id ON assessment_responses(respondent_id);

-- Add cascade delete for responses when assignment is deleted
ALTER TABLE assessment_responses
DROP CONSTRAINT IF EXISTS assessment_responses_assignment_id_fkey,
ADD CONSTRAINT assessment_responses_assignment_id_fkey
  FOREIGN KEY (assignment_id)
  REFERENCES assessment_assignments(id)
  ON DELETE CASCADE;