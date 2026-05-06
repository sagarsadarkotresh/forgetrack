-- ForgeTrack Database Schema and RLS Policies

-- Create tables

CREATE TABLE public.students (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    usn TEXT UNIQUE NOT NULL,
    admission_number TEXT,
    email TEXT,
    branch_code TEXT NOT NULL,
    batch TEXT DEFAULT '2024-2028',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.sessions (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    topic TEXT NOT NULL,
    month_number INTEGER NOT NULL,
    duration_hours DECIMAL(3,1) DEFAULT 2.0,
    session_type TEXT DEFAULT 'offline',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.import_log (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_rows INTEGER NOT NULL,
    imported_rows INTEGER NOT NULL,
    skipped_rows INTEGER NOT NULL,
    warnings TEXT,
    column_mapping TEXT,
    status TEXT NOT NULL
);

CREATE TABLE public.attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    present BOOLEAN NOT NULL,
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    marked_by TEXT DEFAULT 'system',
    import_id INTEGER REFERENCES public.import_log(id) ON DELETE SET NULL,
    UNIQUE(student_id, session_id)
);

CREATE TABLE public.materials (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('mentor', 'student')),
    student_id INTEGER REFERENCES public.students(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constraints
-- Attendance date not in future and not before 2025-08-04
CREATE OR REPLACE FUNCTION check_attendance_date()
RETURNS TRIGGER AS $$
DECLARE
    session_date DATE;
BEGIN
    SELECT date INTO session_date FROM public.sessions WHERE id = NEW.session_id;
    IF session_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'Attendance cannot be marked for a future date.';
    END IF;
    IF session_date < '2025-08-04' THEN
        RAISE EXCEPTION 'Attendance date cannot be before program start date (2025-08-04).';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_attendance_date
BEFORE INSERT OR UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION check_attendance_date();

-- Auth trigger to auto-create auth users for new students
-- For Supabase, creating an auth user from a database trigger requires calling the auth functions or using pg_net. 
-- In practice, since we cannot easily create an auth.users record purely via trigger in Supabase without elevated privileges, 
-- we will use a workaround, but as specified, the auth trigger auto-creates a public.users row with role='student' 
-- when a new row is inserted into students. Wait, the spec says: "When a student is added to the Students table, 
-- a corresponding user account is auto-created with role='student' and a default password (their USN)."
-- This implies the app logic should handle creating the auth.user, and then we have a trigger on auth.users to create public.users.
-- Let's create a trigger on auth.users instead, which is the standard Supabase pattern.

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, role, student_id, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        (NEW.raw_user_meta_data->>'student_id')::INTEGER,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Role helper function to prevent infinite recursion in RLS
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Row Level Security (RLS) Policies

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Students RLS
CREATE POLICY "mentors_all_students" ON public.students
    FOR ALL USING (public.get_user_role() = 'mentor');

CREATE POLICY "students_read_own_student_record" ON public.students
    FOR SELECT USING (id = (SELECT student_id FROM public.users WHERE id = auth.uid()));

-- Sessions RLS
CREATE POLICY "mentors_all_sessions" ON public.sessions
    FOR ALL USING (public.get_user_role() = 'mentor');

CREATE POLICY "students_read_all_sessions" ON public.sessions
    FOR SELECT USING (true);

-- Attendance RLS
CREATE POLICY "mentors_all_attendance" ON public.attendance
    FOR ALL USING (public.get_user_role() = 'mentor');

CREATE POLICY "students_read_own_attendance" ON public.attendance
    FOR SELECT USING (student_id = (SELECT student_id FROM public.users WHERE id = auth.uid()));

-- Materials RLS
CREATE POLICY "mentors_all_materials" ON public.materials
    FOR ALL USING (public.get_user_role() = 'mentor');

CREATE POLICY "students_read_all_materials" ON public.materials
    FOR SELECT USING (true);

-- Import Log RLS
CREATE POLICY "mentors_all_import_log" ON public.import_log
    FOR ALL USING (public.get_user_role() = 'mentor');

-- Users RLS
CREATE POLICY "mentors_all_users" ON public.users
    FOR ALL USING (public.get_user_role() = 'mentor');

CREATE POLICY "users_read_own" ON public.users
    FOR SELECT USING (id = auth.uid());
