-- =============================================================================
-- ONLYWORKS COMPLETE DATABASE SCHEMA V3
-- Full implementation with all features:
-- - Multi-trigger screenshot capture (5s intervals + events)
-- - Supabase cloud storage integration
-- - 30-screenshot batch analysis with Gemini 2.5 Flash
-- - Session-end analysis combination
-- - Goal tracking and team collaboration
-- - Analytics and reporting
-- - Cost tracking and performance metrics
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =============================================================================
-- CORE ORGANIZATION & USER MANAGEMENT
-- =============================================================================

CREATE TABLE organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,

    -- Subscription & limits
    subscription_tier VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
    max_users INTEGER DEFAULT 10,
    max_storage_gb INTEGER DEFAULT 50,
    max_ai_analyses_monthly INTEGER DEFAULT 100,

    -- Configuration
    settings JSONB DEFAULT '{}',
    ai_provider VARCHAR(50) DEFAULT 'gemini', -- gemini, openai, claude
    ai_model VARCHAR(100) DEFAULT 'gemini-2.5-flash',

    -- Billing
    stripe_customer_id VARCHAR(255),
    subscription_status VARCHAR(50) DEFAULT 'active',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Identity
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',

    -- Role & permissions
    role VARCHAR(50) DEFAULT 'member', -- owner, admin, manager, member, viewer
    permissions JSONB DEFAULT '[]',

    -- OAuth integration
    oauth_provider VARCHAR(50), -- google, github, microsoft, apple
    oauth_id VARCHAR(255),
    oauth_refresh_token TEXT,

    -- User preferences
    preferences JSONB DEFAULT '{
        "theme": "system",
        "notifications": true,
        "screenshot_interval": 5,
        "capture_triggers": ["interval", "click", "enter_key", "window_switch"],
        "privacy_mode": false,
        "auto_analysis": true
    }',

    -- Onboarding & activity
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_step INTEGER DEFAULT 0,
    last_active_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,

    -- Account status
    status VARCHAR(50) DEFAULT 'active', -- active, suspended, deactivated
    email_verified BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(oauth_provider, oauth_id),
    CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'suspended', 'deactivated'))
);

CREATE TABLE teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Team details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3b82f6', -- Hex color for UI

    -- Team settings
    visibility VARCHAR(50) DEFAULT 'private', -- public, private
    invite_code VARCHAR(32) UNIQUE,
    auto_join BOOLEAN DEFAULT FALSE,

    -- Analytics settings
    analytics_enabled BOOLEAN DEFAULT TRUE,
    goal_tracking_enabled BOOLEAN DEFAULT TRUE,

    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_visibility CHECK (visibility IN ('public', 'private'))
);

CREATE TABLE team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    role VARCHAR(50) DEFAULT 'member', -- leader, member
    permissions JSONB DEFAULT '[]',

    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    invited_by UUID REFERENCES users(id),

    UNIQUE(team_id, user_id),
    CONSTRAINT valid_team_role CHECK (role IN ('leader', 'member'))
);

-- =============================================================================
-- WORK SESSIONS & SCREENSHOT MANAGEMENT
-- =============================================================================

CREATE TABLE sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

    -- Session metadata
    name VARCHAR(255),
    description TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, paused, completed, cancelled
    session_type VARCHAR(50) DEFAULT 'work', -- work, meeting, focus, break

    -- Time tracking
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    pause_time TIMESTAMP WITH TIME ZONE,
    resume_time TIMESTAMP WITH TIME ZONE,
    total_pause_duration INTEGER DEFAULT 0, -- seconds

    -- Goals & planning
    planned_duration_minutes INTEGER,
    target_goals JSONB DEFAULT '[]', -- Array of goal IDs
    planned_tasks JSONB DEFAULT '[]', -- Array of planned tasks

    -- Progress tracking
    total_screenshots INTEGER DEFAULT 0,
    analyzed_screenshots INTEGER DEFAULT 0,
    total_analyses INTEGER DEFAULT 0, -- Number of batch analyses

    -- Productivity metrics
    productivity_score DECIMAL(3,1), -- Overall session score 1-10
    focus_score DECIMAL(3,1), -- Focus level 1-10
    alignment_score DECIMAL(3,1), -- Goal alignment 1-10
    energy_level DECIMAL(3,1), -- Self-reported energy 1-10

    -- Work completed
    tasks_completed JSONB DEFAULT '[]',
    accomplishments JSONB DEFAULT '[]',
    blockers JSONB DEFAULT '[]',

    -- Analysis flags
    has_final_analysis BOOLEAN DEFAULT FALSE,
    analysis_in_progress BOOLEAN DEFAULT FALSE,

    -- Settings for this session
    capture_settings JSONB DEFAULT '{
        "interval_seconds": 5,
        "triggers": ["interval", "click", "enter_key", "window_switch"],
        "privacy_mode": false,
        "auto_analysis": true
    }',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_session_status CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    CONSTRAINT valid_session_type CHECK (session_type IN ('work', 'meeting', 'focus', 'break', 'learning'))
);

CREATE TABLE screenshots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- File storage
    local_file_path TEXT,
    cloud_url TEXT, -- Supabase storage URL
    cloud_bucket VARCHAR(255) DEFAULT 'onlyworks-screenshots',
    file_size_bytes INTEGER,
    file_format VARCHAR(10) DEFAULT 'png',

    -- Capture metadata
    capture_trigger VARCHAR(50) DEFAULT 'interval',
    -- Possible values: interval, click, enter_key, window_switch, manual, app_switch, idle_return
    capture_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    screen_resolution VARCHAR(20), -- e.g., "1920x1080"
    display_info JSONB, -- Multi-monitor setup info

    -- Application context
    active_window_title TEXT,
    active_application VARCHAR(255),
    application_category VARCHAR(100), -- productivity, communication, entertainment, etc.
    browser_url TEXT, -- If browser is active

    -- Analysis status
    has_been_analyzed BOOLEAN DEFAULT FALSE,
    analysis_batch_id UUID, -- References which batch analysis this belongs to
    analysis_priority INTEGER DEFAULT 5, -- 1-10, higher = more important

    -- Processing metadata
    upload_status VARCHAR(50) DEFAULT 'pending', -- pending, uploading, uploaded, failed
    upload_attempts INTEGER DEFAULT 0,
    last_upload_error TEXT,

    -- Privacy & security
    contains_sensitive_data BOOLEAN DEFAULT FALSE,
    privacy_level VARCHAR(50) DEFAULT 'normal', -- normal, sensitive, confidential
    blur_applied BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_capture_trigger CHECK (capture_trigger IN (
        'interval', 'click', 'enter_key', 'window_switch', 'manual',
        'app_switch', 'idle_return', 'focus_change'
    )),
    CONSTRAINT valid_upload_status CHECK (upload_status IN (
        'pending', 'uploading', 'uploaded', 'failed', 'skipped'
    )),
    CONSTRAINT valid_privacy_level CHECK (privacy_level IN (
        'normal', 'sensitive', 'confidential'
    ))
);

-- =============================================================================
-- AI ANALYSIS SYSTEM
-- =============================================================================

CREATE TABLE analysis_batches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Batch metadata
    batch_number INTEGER NOT NULL,
    screenshot_ids UUID[] NOT NULL,
    screenshot_count INTEGER NOT NULL,
    analysis_type VARCHAR(50) DEFAULT 'batch', -- batch, realtime, manual

    -- Time range this batch covers
    time_range_start TIMESTAMP WITH TIME ZONE NOT NULL,
    time_range_end TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_seconds INTEGER,

    -- AI processing metadata
    ai_provider VARCHAR(50) DEFAULT 'gemini',
    ai_model VARCHAR(100) DEFAULT 'gemini-2.5-flash',
    processing_time_ms INTEGER,
    tokens_used INTEGER,
    cost_usd DECIMAL(10,6),
    processing_status VARCHAR(50) DEFAULT 'completed', -- pending, processing, completed, failed

    -- Full analysis results (structured JSON from AI)
    analysis_results JSONB NOT NULL,

    -- Extracted metrics for quick queries and aggregation
    work_completed JSONB DEFAULT '[]', -- Array of completed tasks with details
    blockers_count INTEGER DEFAULT 0,
    blockers JSONB DEFAULT '[]', -- Array of blocker objects
    accomplishments_count INTEGER DEFAULT 0,
    accomplishments JSONB DEFAULT '[]', -- Array of accomplishment objects

    -- OnlyWorks 7-category scoring system
    productivity_score DECIMAL(3,1), -- 1-10 scale
    focus_score DECIMAL(3,1), -- 1-10 scale
    alignment_score DECIMAL(3,1), -- 1-10 scale (goal alignment)
    energy_score DECIMAL(3,1), -- 1-10 scale
    collaboration_score DECIMAL(3,1), -- 1-10 scale
    learning_score DECIMAL(3,1), -- 1-10 scale
    wellbeing_score DECIMAL(3,1), -- 1-10 scale

    -- Activity breakdown
    activity_categories JSONB, -- Time spent in different activity types
    application_usage JSONB, -- Time per application
    trigger_breakdown JSONB, -- Stats on screenshot triggers
    distraction_events INTEGER DEFAULT 0,

    -- Context and insights
    session_context TEXT, -- What was happening during this batch
    key_insights JSONB DEFAULT '[]', -- Array of insight strings
    improvement_suggestions JSONB DEFAULT '[]', -- Array of suggestion strings

    -- Quality metrics
    analysis_confidence DECIMAL(3,2), -- 0-1 score for AI confidence
    data_quality_score DECIMAL(3,2), -- 0-1 score for screenshot quality

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(session_id, batch_number),
    CONSTRAINT valid_processing_status CHECK (processing_status IN (
        'pending', 'processing', 'completed', 'failed'
    )),
    CONSTRAINT valid_analysis_type CHECK (analysis_type IN (
        'batch', 'realtime', 'manual', 'triggered'
    ))
);

CREATE TABLE final_analyses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Source data
    batch_analysis_ids UUID[] NOT NULL,
    total_batches INTEGER NOT NULL,
    total_screenshots INTEGER NOT NULL,
    session_duration_minutes INTEGER,

    -- Combined analysis results (AI-generated session summary)
    combined_analysis JSONB NOT NULL,

    -- Session-level insights
    productivity_trend JSONB, -- How productivity changed over time
    focus_pattern JSONB, -- Focus levels throughout session
    workflow_patterns JSONB, -- Detected patterns in work approach
    efficiency_metrics JSONB, -- Task completion efficiency

    -- Narrative summaries
    session_story TEXT, -- AI-generated narrative summary
    key_achievements TEXT, -- Major accomplishments
    main_challenges TEXT, -- Primary obstacles faced

    -- Aggregated scores (averages from batches)
    overall_productivity_score DECIMAL(3,1),
    overall_focus_score DECIMAL(3,1),
    overall_alignment_score DECIMAL(3,1),
    overall_energy_score DECIMAL(3,1),
    overall_collaboration_score DECIMAL(3,1),
    overall_learning_score DECIMAL(3,1),
    overall_wellbeing_score DECIMAL(3,1),

    -- Goal progress
    goal_progress JSONB, -- Progress made on specific goals
    goal_alignment_assessment TEXT,

    -- Time analysis
    productive_time_minutes INTEGER,
    distracted_time_minutes INTEGER,
    break_time_minutes INTEGER,

    -- Application insights
    top_applications JSONB, -- Most used apps with time
    context_switches INTEGER, -- Number of app/window changes

    -- Recommendations
    next_session_suggestions JSONB DEFAULT '[]',
    improvement_areas JSONB DEFAULT '[]',
    strength_areas JSONB DEFAULT '[]',

    -- Processing metadata
    processing_time_ms INTEGER,
    ai_combination_successful BOOLEAN DEFAULT TRUE,
    analysis_quality_score DECIMAL(3,2), -- Overall quality of analysis

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(session_id)
);

-- =============================================================================
-- GOALS & OBJECTIVES
-- =============================================================================

CREATE TABLE goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    parent_goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,

    -- Goal details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(50) DEFAULT 'personal', -- personal, team, project
    category VARCHAR(100), -- productivity, learning, health, project, etc.

    -- Scope and timing
    scope VARCHAR(50) DEFAULT 'micro', -- micro (daily/weekly), macro (monthly/quarterly)
    priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, critical
    status VARCHAR(50) DEFAULT 'active', -- active, completed, paused, cancelled

    -- Time tracking
    target_date DATE,
    start_date DATE DEFAULT CURRENT_DATE,
    completed_date DATE,
    estimated_hours DECIMAL(5,1),
    actual_hours DECIMAL(5,1) DEFAULT 0,

    -- Progress tracking
    progress_percentage INTEGER DEFAULT 0, -- 0-100
    success_criteria JSONB DEFAULT '[]', -- Array of criteria objects
    milestones JSONB DEFAULT '[]', -- Array of milestone objects

    -- Metrics and measurement
    target_metrics JSONB DEFAULT '{}', -- Custom metrics for this goal
    current_metrics JSONB DEFAULT '{}',
    measurement_method VARCHAR(100), -- how progress is tracked

    -- Session linking
    linked_sessions UUID[] DEFAULT '{}', -- Sessions working on this goal
    session_count INTEGER DEFAULT 0,
    productive_sessions INTEGER DEFAULT 0,

    -- AI insights
    ai_suggestions JSONB DEFAULT '[]',
    difficulty_assessment VARCHAR(50), -- easy, moderate, challenging, difficult

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_goal_type CHECK (goal_type IN ('personal', 'team', 'project')),
    CONSTRAINT valid_scope CHECK (scope IN ('micro', 'macro')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    CONSTRAINT valid_progress CHECK (progress_percentage BETWEEN 0 AND 100)
);

-- =============================================================================
-- ANALYTICS & REPORTING
-- =============================================================================

CREATE TABLE user_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Time period
    date DATE NOT NULL,
    period_type VARCHAR(50) NOT NULL, -- daily, weekly, monthly

    -- Session metrics
    total_sessions INTEGER DEFAULT 0,
    total_session_time_minutes INTEGER DEFAULT 0,
    average_session_length_minutes DECIMAL(5,1) DEFAULT 0,

    -- Screenshot metrics
    total_screenshots INTEGER DEFAULT 0,
    screenshots_per_hour DECIMAL(5,1) DEFAULT 0,

    -- Productivity metrics
    average_productivity_score DECIMAL(3,1),
    average_focus_score DECIMAL(3,1),
    average_alignment_score DECIMAL(3,1),
    average_energy_score DECIMAL(3,1),

    -- Activity breakdown
    top_applications JSONB DEFAULT '[]',
    activity_distribution JSONB DEFAULT '{}',
    peak_productivity_hours JSONB DEFAULT '[]',

    -- Goal progress
    goals_worked_on INTEGER DEFAULT 0,
    goals_completed INTEGER DEFAULT 0,
    goal_progress_delta DECIMAL(5,1) DEFAULT 0,

    -- Analysis metrics
    total_analyses INTEGER DEFAULT 0,
    ai_cost_usd DECIMAL(8,4) DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, date, period_type),
    CONSTRAINT valid_period_type CHECK (period_type IN ('daily', 'weekly', 'monthly'))
);

CREATE TABLE team_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

    -- Time period
    date DATE NOT NULL,
    period_type VARCHAR(50) NOT NULL, -- daily, weekly, monthly

    -- Team metrics
    active_members INTEGER DEFAULT 0,
    total_team_session_time_minutes INTEGER DEFAULT 0,
    average_member_productivity DECIMAL(3,1),

    -- Collaboration metrics
    shared_goals INTEGER DEFAULT 0,
    goal_completion_rate DECIMAL(3,2),
    team_alignment_score DECIMAL(3,1),

    -- Performance insights
    top_performers JSONB DEFAULT '[]',
    improvement_areas JSONB DEFAULT '[]',
    team_strengths JSONB DEFAULT '[]',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(team_id, date, period_type)
);

-- =============================================================================
-- SYSTEM CONFIGURATION & MONITORING
-- =============================================================================

CREATE TABLE system_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(100), -- ai, storage, security, features
    is_public BOOLEAN DEFAULT FALSE, -- Can users see this setting?
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ai_usage_tracking (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Usage details
    ai_provider VARCHAR(50) NOT NULL,
    ai_model VARCHAR(100) NOT NULL,
    operation_type VARCHAR(50) NOT NULL, -- batch_analysis, final_analysis, insight_generation

    -- Metrics
    tokens_used INTEGER NOT NULL,
    cost_usd DECIMAL(10,6) NOT NULL,
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,

    -- Context
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    analysis_batch_id UUID REFERENCES analysis_batches(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE storage_usage_tracking (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Storage details
    storage_type VARCHAR(50) NOT NULL, -- supabase, local, s3
    file_type VARCHAR(50) NOT NULL, -- screenshot, analysis, export

    -- Size metrics
    file_size_bytes BIGINT NOT NULL,
    compressed_size_bytes BIGINT,

    -- Context
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    screenshot_id UUID REFERENCES screenshots(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- User and organization indexes
CREATE INDEX idx_users_org_email ON users(organization_id, email);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id) WHERE oauth_provider IS NOT NULL;
CREATE INDEX idx_users_last_active ON users(last_active_at) WHERE last_active_at IS NOT NULL;

-- Team membership indexes
CREATE INDEX idx_team_members_user ON team_members(user_id, team_id);
CREATE INDEX idx_team_members_team ON team_members(team_id, role);

-- Session indexes
CREATE INDEX idx_sessions_user_time ON sessions(user_id, start_time DESC);
CREATE INDEX idx_sessions_status_time ON sessions(status, start_time) WHERE status = 'active';
CREATE INDEX idx_sessions_team_time ON sessions(team_id, start_time) WHERE team_id IS NOT NULL;

-- Screenshot indexes
CREATE INDEX idx_screenshots_session_time ON screenshots(session_id, capture_time);
CREATE INDEX idx_screenshots_trigger ON screenshots(capture_trigger);
CREATE INDEX idx_screenshots_upload_status ON screenshots(upload_status) WHERE upload_status != 'uploaded';
CREATE INDEX idx_screenshots_analysis_status ON screenshots(has_been_analyzed, session_id);
CREATE INDEX idx_screenshots_cloud_url ON screenshots(cloud_url) WHERE cloud_url IS NOT NULL;

-- Analysis indexes
CREATE INDEX idx_analysis_batches_session ON analysis_batches(session_id, batch_number);
CREATE INDEX idx_analysis_batches_user_time ON analysis_batches(user_id, created_at DESC);
CREATE INDEX idx_analysis_batches_status ON analysis_batches(processing_status) WHERE processing_status != 'completed';
CREATE INDEX idx_final_analyses_user_time ON final_analyses(user_id, created_at DESC);

-- Goal indexes
CREATE INDEX idx_goals_user_status ON goals(user_id, status);
CREATE INDEX idx_goals_team_status ON goals(team_id, status) WHERE team_id IS NOT NULL;
CREATE INDEX idx_goals_type_priority ON goals(goal_type, priority);
CREATE INDEX idx_goals_target_date ON goals(target_date) WHERE target_date IS NOT NULL;

-- Analytics indexes
CREATE INDEX idx_user_analytics_user_date ON user_analytics(user_id, date, period_type);
CREATE INDEX idx_team_analytics_team_date ON team_analytics(team_id, date, period_type);

-- Usage tracking indexes
CREATE INDEX idx_ai_usage_org_date ON ai_usage_tracking(organization_id, created_at);
CREATE INDEX idx_ai_usage_user_date ON ai_usage_tracking(user_id, created_at) WHERE user_id IS NOT NULL;
CREATE INDEX idx_storage_usage_org_date ON storage_usage_tracking(organization_id, created_at);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to tables that need it
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on user-facing tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_analytics ENABLE ROW LEVEL SECURITY;

-- Users can only see their own organization's users
CREATE POLICY users_organization_policy ON users
    FOR ALL USING (
        organization_id = (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- Users can only access their own sessions and screenshots
CREATE POLICY sessions_user_policy ON sessions
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY screenshots_user_policy ON screenshots
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY analysis_batches_user_policy ON analysis_batches
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY final_analyses_user_policy ON final_analyses
    FOR ALL USING (user_id = auth.uid());

-- Goals: users can see their own goals + team goals they're a member of
CREATE POLICY goals_access_policy ON goals
    FOR ALL USING (
        user_id = auth.uid() OR
        (team_id IS NOT NULL AND team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
        ))
    );

-- Team access policies
CREATE POLICY teams_member_policy ON teams
    FOR ALL USING (
        id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY team_members_team_policy ON team_members
    FOR ALL USING (
        team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
    );

-- Analytics policies
CREATE POLICY user_analytics_policy ON user_analytics
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY team_analytics_policy ON team_analytics
    FOR ALL USING (
        team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
    );

-- =============================================================================
-- INITIAL DATA SETUP
-- =============================================================================

-- Insert default organization
INSERT INTO organizations (id, name, slug, subscription_tier) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default', 'free')
ON CONFLICT (id) DO NOTHING;

-- Insert system settings
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
    ('ai_default_provider', '"gemini"', 'Default AI provider for analysis', 'ai', true),
    ('ai_default_model', '"gemini-2.5-flash"', 'Default AI model for analysis', 'ai', true),
    ('screenshot_default_interval', '5', 'Default screenshot interval in seconds', 'capture', true),
    ('analysis_batch_size', '30', 'Number of screenshots per analysis batch', 'ai', true),
    ('max_storage_per_user_gb', '10', 'Maximum storage per user in GB', 'storage', false),
    ('features_enabled', '{"batch_analysis": true, "final_analysis": true, "goal_tracking": true, "team_collaboration": true}', 'Enabled features', 'features', true)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View for session summary with analysis
CREATE VIEW session_summary AS
SELECT
    s.id,
    s.user_id,
    s.name,
    s.status,
    s.start_time,
    s.end_time,
    s.total_screenshots,
    s.total_analyses,
    s.productivity_score,
    s.focus_score,
    s.alignment_score,
    fa.session_story,
    fa.key_achievements,
    u.name as user_name,
    u.email as user_email,
    EXTRACT(EPOCH FROM (COALESCE(s.end_time, NOW()) - s.start_time)) / 60 as duration_minutes
FROM sessions s
LEFT JOIN final_analyses fa ON s.id = fa.session_id
LEFT JOIN users u ON s.user_id = u.id;

-- View for user productivity dashboard
CREATE VIEW user_productivity_dashboard AS
SELECT
    u.id as user_id,
    u.name,
    u.email,
    COUNT(DISTINCT s.id) as total_sessions,
    COUNT(DISTINCT s.id) FILTER (WHERE s.start_time >= CURRENT_DATE) as sessions_today,
    COUNT(DISTINCT s.id) FILTER (WHERE s.start_time >= CURRENT_DATE - INTERVAL '7 days') as sessions_this_week,
    COALESCE(AVG(s.productivity_score), 0) as avg_productivity_score,
    COALESCE(AVG(s.focus_score), 0) as avg_focus_score,
    COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(s.end_time, NOW()) - s.start_time)) / 60), 0) as total_work_minutes,
    COUNT(DISTINCT g.id) as active_goals,
    COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'completed') as completed_goals
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id AND s.status != 'cancelled'
LEFT JOIN goals g ON u.id = g.user_id AND g.status = 'active'
GROUP BY u.id, u.name, u.email;

-- View for recent analysis insights
CREATE VIEW recent_insights AS
SELECT
    ab.id,
    ab.session_id,
    ab.user_id,
    ab.batch_number,
    ab.created_at,
    ab.productivity_score,
    ab.focus_score,
    ab.session_context,
    ab.key_insights,
    ab.improvement_suggestions,
    s.name as session_name,
    u.name as user_name
FROM analysis_batches ab
JOIN sessions s ON ab.session_id = s.id
JOIN users u ON ab.user_id = u.id
WHERE ab.created_at >= NOW() - INTERVAL '7 days'
ORDER BY ab.created_at DESC;

-- =============================================================================
-- COMPLETE SCHEMA APPLIED
-- =============================================================================

-- Log successful schema creation
INSERT INTO system_settings (key, value, description, category) VALUES
    ('schema_version', '"3.0.0"'::jsonb, 'Current database schema version', 'system'),
    ('schema_applied_at', to_jsonb(NOW()::text), 'When the current schema was applied', 'system')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- Success message
SELECT 'OnlyWorks Complete Database Schema V3 successfully applied! 🚀' as result;