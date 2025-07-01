-- Migration Validation Script
-- This script validates the database schema and policies for any issues

-- 1. Check if all required tables exist
DO $$
DECLARE
    required_tables TEXT[] := ARRAY[
        'organizations', 'users', 'assessments', 'assessment_assignments', 
        'assessment_responses', 'user_relationships', 'competencies',
        'support_tickets', 'ticket_messages', 'departments',
        'profile_tags', 'user_behaviors', 'staff_assignments',
        'web_branding_settings', 'email_branding_settings', 'pdf_branding_settings',
        'import_logs', 'export_logs', 'assessment_organization_assignments'
    ];
    table_name TEXT;
    table_exists BOOLEAN;
BEGIN
    RAISE NOTICE '=== Checking Required Tables ===';
    
    FOREACH table_name IN ARRAY required_tables
    LOOP
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = table_name
        ) INTO table_exists;
        
        IF table_exists THEN
            RAISE NOTICE '✓ Table % exists', table_name;
        ELSE
            RAISE NOTICE '✗ Table % is missing', table_name;
        END IF;
    END LOOP;
END $$;

-- 2. Check if RLS is enabled on all tables
DO $$
DECLARE
    table_record RECORD;
BEGIN
    RAISE NOTICE '=== Checking RLS Status ===';
    
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('migrations', 'schema_migrations')
    LOOP
        IF EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = table_record.table_name 
            AND rowsecurity = true
        ) THEN
            RAISE NOTICE '✓ RLS enabled on %', table_record.table_name;
        ELSE
            RAISE NOTICE '✗ RLS not enabled on %', table_record.table_name;
        END IF;
    END LOOP;
END $$;

-- 3. Check if required functions exist
DO $$
DECLARE
    required_functions TEXT[] := ARRAY[
        'get_user_org_context', 'check_org_access', 'validate_organization_membership',
        'assign_staff_to_organization', 'add_profile_tag', 'track_user_behavior',
        'get_web_branding_settings', 'get_email_branding_settings', 'get_organization_branding'
    ];
    func_name TEXT;
    func_exists BOOLEAN;
BEGIN
    RAISE NOTICE '=== Checking Required Functions ===';
    
    FOREACH func_name IN ARRAY required_functions
    LOOP
        SELECT EXISTS (
            SELECT FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' 
            AND p.proname = func_name
        ) INTO func_exists;
        
        IF func_exists THEN
            RAISE NOTICE '✓ Function % exists', func_name;
        ELSE
            RAISE NOTICE '✗ Function % is missing', func_name;
        END IF;
    END LOOP;
END $$;

-- 4. Check if required indexes exist
DO $$
DECLARE
    required_indexes TEXT[] := ARRAY[
        'idx_users_organization_id', 'idx_assessments_organization_id',
        'idx_assessment_assignments_employee_id', 'idx_assessment_assignments_reviewer_id',
        'idx_assessment_responses_assignment_id', 'idx_assessment_responses_respondent_id',
        'idx_support_tickets_organization_id', 'idx_support_tickets_staff_member_id',
        'idx_ticket_messages_ticket_id', 'idx_competencies_organization_id',
        'idx_profile_tags_user_id', 'idx_profile_tags_category',
        'idx_user_behaviors_user_id', 'idx_user_behaviors_type', 'idx_user_behaviors_org_id',
        'idx_staff_assignments_staff_id', 'idx_staff_assignments_org_id', 'idx_staff_assignments_supervisor_id'
    ];
    index_name TEXT;
    index_exists BOOLEAN;
BEGIN
    RAISE NOTICE '=== Checking Required Indexes ===';
    
    FOREACH index_name IN ARRAY required_indexes
    LOOP
        SELECT EXISTS (
            SELECT FROM pg_indexes 
            WHERE indexname = index_name
        ) INTO index_exists;
        
        IF index_exists THEN
            RAISE NOTICE '✓ Index % exists', index_name;
        ELSE
            RAISE NOTICE '✗ Index % is missing', index_name;
        END IF;
    END LOOP;
END $$;

-- 5. Check foreign key constraints
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    RAISE NOTICE '=== Checking Foreign Key Constraints ===';
    
    FOR constraint_record IN 
        SELECT 
            tc.table_name,
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name
    LOOP
        RAISE NOTICE '✓ FK: %.% -> %.%', 
            constraint_record.table_name, 
            constraint_record.column_name,
            constraint_record.foreign_table_name, 
            constraint_record.foreign_column_name;
    END LOOP;
END $$;

-- 6. Check RLS policies
DO $$
DECLARE
    policy_record RECORD;
    policy_count INTEGER;
BEGIN
    RAISE NOTICE '=== Checking RLS Policies ===';
    
    FOR policy_record IN 
        SELECT 
            tablename,
            COUNT(*) as policy_count
        FROM pg_policies 
        WHERE schemaname = 'public'
        GROUP BY tablename
        ORDER BY tablename
    LOOP
        RAISE NOTICE '✓ Table % has % policies', policy_record.tablename, policy_record.policy_count;
    END LOOP;
END $$;

-- 7. Test critical functions
DO $$
DECLARE
    test_result BOOLEAN;
BEGIN
    RAISE NOTICE '=== Testing Critical Functions ===';
    
    -- Test get_user_org_context (should not fail)
    BEGIN
        SELECT COUNT(*) > 0 FROM get_user_org_context();
        RAISE NOTICE '✓ get_user_org_context() works';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ get_user_org_context() failed: %', SQLERRM;
    END;
    
    -- Test check_org_access (should not fail)
    BEGIN
        SELECT check_org_access('test-org');
        RAISE NOTICE '✓ check_org_access() works';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ check_org_access() failed: %', SQLERRM;
    END;
END $$;

-- 8. Check for potential issues
DO $$
DECLARE
    issue_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== Checking for Potential Issues ===';
    
    -- Check for tables without RLS
    IF EXISTS (
        SELECT 1 FROM information_schema.tables t
        WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND t.table_name NOT IN ('migrations', 'schema_migrations')
        AND NOT EXISTS (
            SELECT 1 FROM pg_tables pt
            WHERE pt.schemaname = 'public'
            AND pt.tablename = t.table_name
            AND pt.rowsecurity = true
        )
    ) THEN
        RAISE NOTICE '⚠ Some tables may not have RLS enabled';
        issue_count := issue_count + 1;
    END IF;
    
    -- Check for missing indexes on foreign keys
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND NOT EXISTS (
            SELECT 1 FROM pg_indexes pi
            WHERE pi.indexname LIKE '%' || kcu.column_name || '%'
            AND pi.tablename = kcu.table_name
        )
    ) THEN
        RAISE NOTICE '⚠ Some foreign keys may be missing indexes';
        issue_count := issue_count + 1;
    END IF;
    
    -- Check for circular references
    IF EXISTS (
        WITH RECURSIVE deps AS (
            SELECT 
                tc.table_name,
                ccu.table_name as referenced_table,
                1 as depth
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
            
            UNION ALL
            
            SELECT 
                d.table_name,
                ccu.table_name,
                d.depth + 1
            FROM deps d
            JOIN information_schema.table_constraints tc ON tc.table_name = d.referenced_table
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
            AND d.depth < 10
        )
        SELECT 1 FROM deps WHERE depth > 5
    ) THEN
        RAISE NOTICE '⚠ Potential circular references detected';
        issue_count := issue_count + 1;
    END IF;
    
    IF issue_count = 0 THEN
        RAISE NOTICE '✓ No critical issues found';
    ELSE
        RAISE NOTICE '⚠ Found % potential issues to review', issue_count;
    END IF;
END $$;

-- 9. Summary
DO $$
BEGIN
    RAISE NOTICE '=== Migration Validation Complete ===';
    RAISE NOTICE 'If all checks passed, your migration is ready for production.';
    RAISE NOTICE 'Review any warnings above and address them if necessary.';
END $$; 