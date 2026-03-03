-- Fix: "Database error saving new user" on signup
-- 
-- This error occurs when a trigger on auth.users runs without SECURITY DEFINER.
-- The supabase_auth_admin role lacks permission to insert into public.profiles.
-- SECURITY DEFINER makes the function run with postgres privileges.
--
-- Run this in Supabase Dashboard: SQL Editor

-- 1. Drop existing trigger and function (if any)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Create function with SECURITY DEFINER (critical for auth triggers)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    subscription_tier,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    'free',
    false
  );
  RETURN NEW;
END;
$$;

-- 3. Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
