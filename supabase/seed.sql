-- ForgeTrack Seed Data
-- Note: You must run this AFTER schema.sql. 
-- For authentication to work properly, you should manually create the Mentor and Test Student users in the Supabase Authentication dashboard, and then link their IDs to the public.users table. 
-- The script below inserts sample data into the main application tables.

-- Insert 25 Students
INSERT INTO public.students (name, usn, admission_number, email, branch_code, batch, is_active) VALUES
('Abhishek Sharma', '4SH24CS001', '24CS001', 'abhishek@forge.local', 'CS', '2024-2028', true),
('Divya Kulkarni', '4SH24CS002', '24CS002', 'divya@forge.local', 'AI', '2024-2028', true),
('Ravi Kumar', '4SH24CS003', '24CS003', 'ravi@forge.local', 'CS', '2024-2028', true),
('Sneha Rao', '4SH24CS004', '24CS004', 'sneha@forge.local', 'IS', '2024-2028', true),
('Arjun M', '4SH24CS005', '24CS005', 'arjun@forge.local', 'CS', '2024-2028', true),
('Kavya Shetty', '4SH24CS006', '24CS006', 'kavya@forge.local', 'AI', '2024-2028', true),
('Nitin Gowda', '4SH24CS007', '24CS007', 'nitin@forge.local', 'CS', '2024-2028', true),
('Pooja Hegde', '4SH24CS008', '24CS008', 'pooja@forge.local', 'IS', '2024-2028', true),
('Karthik N', '4SH24CS009', '24CS009', 'karthik@forge.local', 'CS', '2024-2028', true),
('Ananya Bhat', '4SH24CS010', '24CS010', 'ananya@forge.local', 'AI', '2024-2028', true),
('Manoj K', '4SH24CS011', '24CS011', 'manoj@forge.local', 'CS', '2024-2028', true),
('Varshini R', '4SH24CS012', '24CS012', 'varshini@forge.local', 'IS', '2024-2028', true),
('Sachin Tendulkar', '4SH24CS013', '24CS013', 'sachin@forge.local', 'CS', '2024-2028', true),
('Meghana G', '4SH24CS014', '24CS014', 'meghana@forge.local', 'AI', '2024-2028', true),
('Tarun S', '4SH24CS015', '24CS015', 'tarun@forge.local', 'CS', '2024-2028', true),
('Shruti L', '4SH24CS016', '24CS016', 'shruti@forge.local', 'IS', '2024-2028', true),
('Vikram P', '4SH24CS017', '24CS017', 'vikram@forge.local', 'CS', '2024-2028', true),
('Neha Singh', '4SH24CS018', '24CS018', 'neha@forge.local', 'AI', '2024-2028', true),
('Akash V', '4SH24CS019', '24CS019', 'akash@forge.local', 'CS', '2024-2028', true),
('Pallavi T', '4SH24CS020', '24CS020', 'pallavi@forge.local', 'IS', '2024-2028', true),
('Rohan Das', '4SH24CS021', '24CS021', 'rohan@forge.local', 'CS', '2024-2028', true),
('Kriti Sanon', '4SH24CS022', '24CS022', 'kriti@forge.local', 'AI', '2024-2028', true),
('Yash K', '4SH24CS023', '24CS023', 'yash@forge.local', 'CS', '2024-2028', true),
('Rashmika M', '4SH24CS024', '24CS024', 'rashmika@forge.local', 'IS', '2024-2028', true),
('Nikhil C', '4SH24CS025', '24CS025', 'nikhil@forge.local', 'CS', '2024-2028', true);

-- Insert 5 Sessions
INSERT INTO public.sessions (date, topic, month_number, duration_hours, session_type, notes) VALUES
('2025-08-05', '8-Layer AI Stack', 1, 2.0, 'offline', 'Introduction to the Forge AI-ML Bootcamp'),
('2025-08-12', 'ReAct Agent Pattern', 1, 2.5, 'offline', 'Deep dive into LLM Agents'),
('2025-08-19', 'pgvector RAG', 1, 2.0, 'online', 'Retrieval Augmented Generation with Postgres'),
('2025-08-26', 'Tiered Autonomy Multi-Agent', 2, 3.0, 'offline', 'Building complex agent swarms'),
('2025-09-02', 'Deploying with Antigravity', 2, 2.0, 'offline', 'Using AI to build fullstack apps');

-- Insert Attendance Records
-- Session 1 (All present except 1)
INSERT INTO public.attendance (student_id, session_id, present, marked_by)
SELECT id, 1, (CASE WHEN id = 5 THEN false ELSE true END), 'nischay' FROM public.students;

-- Session 2 (Some absent)
INSERT INTO public.attendance (student_id, session_id, present, marked_by)
SELECT id, 2, (CASE WHEN id IN (3, 7, 12, 18) THEN false ELSE true END), 'nischay' FROM public.students;

-- Session 3 (Online, higher absence)
INSERT INTO public.attendance (student_id, session_id, present, marked_by)
SELECT id, 3, (CASE WHEN id IN (2, 8, 14, 15, 22, 25) THEN false ELSE true END), 'varun' FROM public.students;

-- Session 4 (Offline)
INSERT INTO public.attendance (student_id, session_id, present, marked_by)
SELECT id, 4, (CASE WHEN id IN (1, 19) THEN false ELSE true END), 'nischay' FROM public.students;

-- Session 5 (Offline)
INSERT INTO public.attendance (student_id, session_id, present, marked_by)
SELECT id, 5, (CASE WHEN id IN (4, 10, 16) THEN false ELSE true END), 'nischay' FROM public.students;

-- Insert Materials
INSERT INTO public.materials (session_id, title, type, url, description) VALUES
(1, '8-Layer AI Stack Slides', 'slides', 'https://docs.google.com/presentation/d/12345', 'Deck used during the kickoff session'),
(1, 'Session 1 Recording', 'recording', 'https://youtube.com/watch?v=12345', 'Unedited video recording of the class'),
(2, 'ReAct Pattern Guide', 'document', 'https://docs.google.com/document/d/67890', 'Reading material for ReAct pattern'),
(3, 'pgvector Quickstart', 'link', 'https://github.com/pgvector/pgvector', 'Official pgvector documentation'),
(4, 'Multi-Agent Swarm Repo', 'link', 'https://github.com/theforge/swarm', 'Codebase for the swarm demo'),
(5, 'Antigravity Cheatsheet', 'document', 'https://docs.google.com/document/d/abcde', 'Cheat sheet for prompt engineering with Antigravity');

-- Insert Import Logs (History)
INSERT INTO public.import_log (filename, uploaded_by, uploaded_at, total_rows, imported_rows, skipped_rows, status) VALUES
('month1_attendance.csv', 'nischay', '2025-08-30 10:00:00+00', 50, 48, 2, 'completed'),
('month2_attendance.csv', 'varun', '2025-09-05 14:30:00+00', 60, 60, 0, 'completed');

-- Seed Auth Users
-- We insert a Mentor and a Student into auth.users. 
-- The trigger `handle_new_user` will automatically create rows in `public.users`.
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES 
(
  'd99908db-4cb8-4bfd-a36c-941bf7e82fc9',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'mentor@forge.local',
  crypt('mentor123', gen_salt('bf')),
  current_timestamp,
  current_timestamp,
  current_timestamp,
  '{"provider":"email","providers":["email"]}',
  '{"role":"mentor","display_name":"Mentor Nischay"}',
  current_timestamp,
  current_timestamp,
  '',
  '',
  '',
  ''
),
(
  'a38b25cb-8349-4107-b353-8d69fcb62ef0',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  '4SH24CS001@forge.local',
  crypt('password123', gen_salt('bf')),
  current_timestamp,
  current_timestamp,
  current_timestamp,
  '{"provider":"email","providers":["email"]}',
  '{"role":"student","display_name":"Abhishek Sharma","student_id":"1"}',
  current_timestamp,
  current_timestamp,
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;


