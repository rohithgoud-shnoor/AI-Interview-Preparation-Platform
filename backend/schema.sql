-- PostgreSQL Database Schema for AI Interview Preparation Platform
-- Use these commands to manually set up the database and tables in PostgreSQL.

-- 1. Create the Database (Run this if the database does not exist)
-- CREATE DATABASE ai_interview;

-- Connect to the database (if using psql CLI)
-- \c ai_interview;

-- 2. Create the Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- 3. Create Indexes for Optimized Query Performance
CREATE INDEX IF NOT EXISTS ix_users_id ON users (id);
CREATE INDEX IF NOT EXISTS ix_users_name ON users (name);
CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);

-- 4. Create Resumes Table
CREATE TABLE IF NOT EXISTS resumes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(255) NOT NULL,
    extracted_text TEXT
);

CREATE INDEX IF NOT EXISTS ix_resumes_user_id ON resumes (user_id);

-- 5. Create Recordings Table
CREATE TABLE IF NOT EXISTS recordings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question VARCHAR(255) NOT NULL,
    video_url VARCHAR(255) NOT NULL,
    created_at VARCHAR(255) NOT NULL,
    transcript TEXT
);

CREATE INDEX IF NOT EXISTS ix_recordings_user_id ON recordings (user_id);

