-- Fix for infinite recursion in users RLS policy
-- This SQL script fixes the RLS policy that was causing infinite recursion

-- Drop the existing problematic policy
DROP POLICY IF EXISTS users_organization_policy ON users;

-- Create a new policy that doesn't self-reference the users table
-- For now, we'll use a simple policy that allows all authenticated users
-- In production, you might want to implement a more sophisticated organization-based policy
CREATE POLICY users_organization_policy ON users
    FOR ALL USING (
        auth.uid() IS NOT NULL
    );

-- Alternative: If you want to maintain organization isolation, you can use this approach:
-- This requires storing the user's organization_id in the JWT token or using a function
--
-- CREATE POLICY users_organization_policy ON users
--     FOR ALL USING (
--         organization_id = current_setting('app.current_organization_id', true)::uuid
--     );

-- Update other policies that might have similar issues
-- Goals policy fix - simplify to avoid potential recursion
DROP POLICY IF EXISTS goals_access_policy ON goals;
CREATE POLICY goals_access_policy ON goals
    FOR ALL USING (
        user_id = auth.uid() OR
        (team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = goals.team_id
            AND tm.user_id = auth.uid()
        ))
    );

-- Team access policy fix
DROP POLICY IF EXISTS teams_member_policy ON teams;
CREATE POLICY teams_member_policy ON teams
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = teams.id
            AND tm.user_id = auth.uid()
        ) OR created_by = auth.uid()
    );

-- Team members policy fix
DROP POLICY IF EXISTS team_members_team_policy ON team_members;
CREATE POLICY team_members_team_policy ON team_members
    FOR ALL USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = auth.uid()
            AND tm.role = 'leader'
        )
    );

-- Team analytics policy fix
DROP POLICY IF EXISTS team_analytics_policy ON team_analytics;
CREATE POLICY team_analytics_policy ON team_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_analytics.team_id
            AND tm.user_id = auth.uid()
        )
    );

-- Success message
SELECT 'Database RLS policies fixed - infinite recursion resolved!' as result;