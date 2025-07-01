-- This migration was a duplicate of 20250629153806_sparkling_canyon.sql
-- Converting to no-op to avoid conflicts

-- Check if pdf_branding_settings table exists, if so this migration is redundant
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_branding_settings') THEN
    RAISE NOTICE 'pdf_branding_settings table already exists, skipping duplicate creation';
  ELSE
    RAISE EXCEPTION 'pdf_branding_settings table should have been created by previous migration';
  END IF;
END $$;