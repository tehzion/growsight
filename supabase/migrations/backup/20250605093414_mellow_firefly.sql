-- Verify and fix any missing constraints or indexes
DO $$ BEGIN
  -- Ensure organizations table has all required indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_organizations_name') THEN
    CREATE INDEX idx_organizations_name ON organizations(name);
  END IF;

  -- Ensure users table has required indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_organization_id') THEN
    CREATE INDEX idx_users_organization_id ON users(organization_id);
  END IF;

  -- Ensure assessments table has required indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_assessments_organization_id') THEN
    CREATE INDEX idx_assessments_organization_id ON assessments(organization_id);
  END IF;

  -- Verify RLS is enabled on all tables
  ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE assessment_sections ENABLE ROW LEVEL SECURITY;
  ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE assessment_assignments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
  ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;
  ALTER TABLE assessment_progress ENABLE ROW LEVEL SECURITY;
  ALTER TABLE assessment_organization_assignments ENABLE ROW LEVEL SECURITY;

  -- Ensure all updated_at triggers are present
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_organizations_updated_at') THEN
    CREATE TRIGGER update_organizations_updated_at
      BEFORE UPDATE ON organizations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;