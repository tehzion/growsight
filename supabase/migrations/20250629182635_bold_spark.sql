-- This migration was a duplicate of 20250629181355_fierce_poetry.sql
-- Converting to no-op to avoid conflicts

-- Check if competencies table exists, if so this migration is redundant
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'competencies') THEN
    RAISE NOTICE 'competencies table already exists, skipping duplicate creation';
  ELSE
    RAISE EXCEPTION 'competencies table should have been created by previous migration';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'question_competencies') THEN
    RAISE NOTICE 'question_competencies table already exists, skipping duplicate creation';
  ELSE
    RAISE EXCEPTION 'question_competencies table should have been created by previous migration';
  END IF;
END $$;