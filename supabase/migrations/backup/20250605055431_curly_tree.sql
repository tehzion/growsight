-- Fix assessment progress tracking
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
    WHERE aa.id = COALESCE(NEW.assignment_id, OLD.assignment_id)
    GROUP BY aa.id, aq.section_id
  )
  INSERT INTO assessment_progress (
    assignment_id,
    section_id,
    completed_questions,
    total_questions,
    is_completed,
    last_updated_at
  )
  SELECT
    assignment_id,
    section_id,
    completed_questions,
    total_questions,
    completed_questions = total_questions,
    now()
  FROM section_stats
  ON CONFLICT (assignment_id, section_id) DO UPDATE
  SET
    completed_questions = EXCLUDED.completed_questions,
    total_questions = EXCLUDED.total_questions,
    is_completed = EXCLUDED.completed_questions = EXCLUDED.total_questions,
    last_updated_at = now();

  -- Update assignment status
  UPDATE assessment_assignments aa
  SET status = CASE
    WHEN EXISTS (
      SELECT 1 FROM assessment_progress ap
      WHERE ap.assignment_id = aa.id
      AND ap.is_completed = false
    ) THEN 'in_progress'
    WHEN NOT EXISTS (
      SELECT 1 FROM assessment_progress ap
      WHERE ap.assignment_id = aa.id
      AND ap.is_completed = false
    ) THEN 'completed'
    ELSE aa.status
  END
  WHERE aa.id = COALESCE(NEW.assignment_id, OLD.assignment_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;