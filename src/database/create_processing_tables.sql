-- Create processing_sessions table
CREATE TABLE IF NOT EXISTS processing_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER,
    filter_id INTEGER REFERENCES user_filters(id) ON DELETE SET NULL,
    filter_criteria JSONB,
    source_zipcodes TEXT[],
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'processing',
    session_type VARCHAR(100) DEFAULT 'npa_nxx_processing',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create processing_files table
CREATE TABLE IF NOT EXISTS processing_files (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) REFERENCES processing_sessions(session_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT DEFAULT 0,
    record_count INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_processing_sessions_user_id ON processing_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_sessions_filter_id ON processing_sessions(filter_id);
CREATE INDEX IF NOT EXISTS idx_processing_sessions_status ON processing_sessions(status);
CREATE INDEX IF NOT EXISTS idx_processing_sessions_session_type ON processing_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_processing_sessions_created_at ON processing_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_processing_files_session_id ON processing_files(session_id);
CREATE INDEX IF NOT EXISTS idx_processing_files_file_type ON processing_files(file_type);

-- Add comments for documentation
COMMENT ON TABLE processing_sessions IS 'Tracks processing sessions for NPA NXX and other data processing operations';
COMMENT ON TABLE processing_files IS 'Tracks files generated during processing sessions';
COMMENT ON COLUMN processing_sessions.filter_criteria IS 'JSON object containing the filter criteria applied during processing';
COMMENT ON COLUMN processing_sessions.source_zipcodes IS 'Array of zipcodes that were processed in this session';
COMMENT ON COLUMN processing_files.file_type IS 'Type of file generated (csv, json, telecare_output, etc.)';
