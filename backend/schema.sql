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
