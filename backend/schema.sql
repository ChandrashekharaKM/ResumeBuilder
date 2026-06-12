-- Table 1: Profiles synced from your Auth provider or created via email/password
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,            -- UUID for local users; matches Auth provider ID for OAuth users
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,             -- NULL for OAuth-only users; PBKDF2 hash for email/password users
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: Version records for generated resumes
CREATE TABLE IF NOT EXISTS resume_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    save_name TEXT NOT NULL,         -- e.g., "SwipeGen_Python_Intern_V2"
    target_jd TEXT,                  -- Stores the job context
    tailored_resume_json TEXT,       -- Stored as a JSON string containing the final CV data
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
