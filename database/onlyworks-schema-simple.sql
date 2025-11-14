-- =============================================================================
-- ONLYWORKS SIMPLIFIED DATABASE SCHEMA
-- Minimal viable schema for core functionality
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USERS & AUTHENTICATION
-- =============================================================================

CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

    -- Basic identity
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,

    -- OAuth authentication
    oauth_provider VARCHAR(50) NOT NULL, -- google, github, microsoft
    oauth_id VARCHAR(255) NOT NULL,
    oauth_refresh_token TEXT,

    -- Account status
    status VARCHAR(50) DEFAULT 'active', -- active, suspended, deactivated
    email_verified BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(oauth_provider, oauth_id),
    CONSTRAINT valid_status CHECK (status IN ('active', 'suspended', 'deactivated'))
);

-- =============================================================================
-- WORK SESSIONS
-- =============================================================================

CREATE TABLE sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Session info
    name VARCHAR(255),
    description TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, paused, completed, cancelled

    -- Time tracking
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,

    -- Basic metrics
    total_screenshots INTEGER DEFAULT 0,
    productivity_score DECIMAL(3,1), -- 1-10 scale

    -- Settings
    screenshot_interval INTEGER DEFAULT 5, -- seconds

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_status CHECK (status IN ('active', 'paused', 'completed', 'cancelled'))
);

-- =============================================================================
-- SCREENSHOTS
-- =============================================================================

CREATE TABLE screenshots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- File storage
    local_file_path TEXT,
    cloud_url TEXT, -- Supabase storage URL
    file_size_bytes INTEGER,

    -- Capture details
    capture_trigger VARCHAR(50) DEFAULT 'interval', -- interval, click, manual
    capture_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Application context
    active_window_title TEXT,
    active_application VARCHAR(255),
    browser_url TEXT,

    -- Analysis status
    analyzed BOOLEAN DEFAULT FALSE,

    -- Upload status
    upload_status VARCHAR(50) DEFAULT 'pending', -- pending, uploaded, failed

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_trigger CHECK (capture_trigger IN ('interval', 'click', 'manual')),
    CONSTRAINT valid_upload_status CHECK (upload_status IN ('pending', 'uploaded', 'failed'))
);

-- =============================================================================
-- AI ANALYSIS RESULTS
-- =============================================================================

CREATE TABLE analyses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Analysis metadata
    analysis_type VARCHAR(50) DEFAULT 'batch', -- batch, final
    screenshot_count INTEGER NOT NULL,

    -- Time period analyzed
    time_range_start TIMESTAMP WITH TIME ZONE NOT NULL,
    time_range_end TIMESTAMP WITH TIME ZONE NOT NULL,

    -- AI processing
    ai_provider VARCHAR(50) DEFAULT 'gemini',
    processing_time_ms INTEGER,
    tokens_used INTEGER,

    -- Results (full JSON from AI)
    analysis_results JSONB NOT NULL,

    -- Key metrics extracted from results
    productivity_score DECIMAL(3,1),
    focus_score DECIMAL(3,1),
    tasks_completed JSONB DEFAULT '[]',
    key_insights JSONB DEFAULT '[]',

    -- Session summary (for final analysis)
    session_summary TEXT,
    main_achievements TEXT,
    improvement_suggestions JSONB DEFAULT '[]',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_analysis_type CHECK (analysis_type IN ('batch', 'final'))
);

-- =============================================================================
-- USER SETTINGS & PREFERENCES
-- =============================================================================

CREATE TABLE user_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- App preferences
    theme VARCHAR(20) DEFAULT 'system', -- light, dark, system
    screenshot_interval INTEGER DEFAULT 5,
    auto_analysis BOOLEAN DEFAULT TRUE,
    notifications_enabled BOOLEAN DEFAULT TRUE,

    -- Privacy settings
    privacy_mode BOOLEAN DEFAULT FALSE,
    data_retention_days INTEGER DEFAULT 90,

    -- AI preferences
    ai_provider VARCHAR(50) DEFAULT 'gemini',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id)
);

-- =============================================================================
-- BASIC GOALS TRACKING
-- =============================================================================

CREATE TABLE goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Goal details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, completed, paused
    priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high

    -- Progress
    progress_percentage INTEGER DEFAULT 0, -- 0-100
    target_date DATE,

    -- Tracking
    sessions_count INTEGER DEFAULT 0,
    total_time_minutes INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_status CHECK (status IN ('active', 'completed', 'paused')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high')),
    CONSTRAINT valid_progress CHECK (progress_percentage BETWEEN 0 AND 100)
);

-- =============================================================================
-- SIMPLE ANALYTICS
-- =============================================================================

CREATE TABLE daily_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Session metrics
    total_sessions INTEGER DEFAULT 0,
    total_minutes INTEGER DEFAULT 0,

    -- Screenshot metrics
    total_screenshots INTEGER DEFAULT 0,

    -- Productivity metrics
    avg_productivity_score DECIMAL(3,1),
    avg_focus_score DECIMAL(3,1),

    -- Goals
    goals_worked_on INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, date)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE INDEX idx_users_status ON users(status) WHERE status != 'active';

-- Session indexes
CREATE INDEX idx_sessions_user_time ON sessions(user_id, start_time DESC);
CREATE INDEX idx_sessions_status ON sessions(status, user_id);

-- Screenshot indexes
CREATE INDEX idx_screenshots_session ON screenshots(session_id, capture_time);
CREATE INDEX idx_screenshots_user ON screenshots(user_id, capture_time DESC);
CREATE INDEX idx_screenshots_upload ON screenshots(upload_status) WHERE upload_status != 'uploaded';

-- Analysis indexes
CREATE INDEX idx_analyses_session ON analyses(session_id, analysis_type);
CREATE INDEX idx_analyses_user_time ON analyses(user_id, created_at DESC);

-- Goal indexes
CREATE INDEX idx_goals_user_status ON goals(user_id, status);

-- Stats indexes
CREATE INDEX idx_daily_stats_user_date ON daily_stats(user_id, date DESC);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables that need updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INITIAL SETUP DATA
-- =============================================================================

-- Insert system information
CREATE TABLE system_info (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO system_info (key, value) VALUES
    ('schema_version', '"1.0.0"'),
    ('created_at', to_jsonb(NOW()::text)),
    ('features', '{"screenshots": true, "analysis": true, "goals": true}');

-- =============================================================================
-- BASIC VIEWS FOR COMMON QUERIES
-- =============================================================================

-- User dashboard view
CREATE VIEW user_dashboard AS
SELECT
    u.id,
    u.name,
    u.email,
    u.avatar_url,
    COUNT(DISTINCT s.id) as total_sessions,
    COUNT(DISTINCT s.id) FILTER (WHERE s.start_time >= CURRENT_DATE) as sessions_today,
    COALESCE(AVG(s.productivity_score), 0) as avg_productivity,
    COUNT(DISTINCT g.id) as active_goals,
    MAX(s.start_time) as last_session
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id AND s.status != 'cancelled'
LEFT JOIN goals g ON u.id = g.user_id AND g.status = 'active'
GROUP BY u.id, u.name, u.email, u.avatar_url;

-- Recent sessions view
CREATE VIEW recent_sessions AS
SELECT
    s.id,
    s.user_id,
    s.name,
    s.status,
    s.start_time,
    s.end_time,
    s.total_screenshots,
    s.productivity_score,
    u.name as user_name,
    EXTRACT(EPOCH FROM (COALESCE(s.end_time, NOW()) - s.start_time)) / 60 as duration_minutes,
    COUNT(a.id) as analysis_count
FROM sessions s
JOIN users u ON s.user_id = u.id
LEFT JOIN analyses a ON s.id = a.session_id
GROUP BY s.id, s.user_id, s.name, s.status, s.start_time, s.end_time,
         s.total_screenshots, s.productivity_score, u.name
ORDER BY s.start_time DESC;

-- =============================================================================
-- SCHEMA COMPLETE
-- =============================================================================

SELECT 'OnlyWorks Simplified Schema v1.0 created successfully! 🚀' as message;