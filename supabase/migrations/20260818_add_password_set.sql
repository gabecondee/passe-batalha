-- Add password_set column to profiles to track if a user has set their password after an invite
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password_set boolean not null default false;
