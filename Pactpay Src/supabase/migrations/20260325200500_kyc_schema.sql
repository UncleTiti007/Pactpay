-- Add KYC-related columns to profiles table
alter table public.profiles 
add column if not exists phone text,
add column if not exists date_of_birth date,
add column if not exists country text,
add column if not exists avatar_url text,
add column if not exists account_type text default 'individual',
add column if not exists company_name text,
add column if not exists company_reg_number text,
add column if not exists bank_name text,
add column if not exists bank_account_name text,
add column if not exists bank_account_number text,
add column if not exists id_type text,
add column if not exists id_number text,
add column if not exists id_doc_front_url text,
add column if not exists id_doc_back_url text,
add column if not exists id_selfie_url text;

-- Ensure kyc_verified is false by default
alter table public.profiles 
alter column kyc_verified set default false;

-- Create storage buckets for KYC and Avatars
insert into storage.buckets (id, name, public) 
values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- RLS for kyc-documents (Private)
create policy "Users can upload their own KYC documents"
on storage.objects for insert
with check (
  bucket_id = 'kyc-documents' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can view their own KYC documents"
on storage.objects for select
using (
  bucket_id = 'kyc-documents' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS for avatars (Public)
create policy "Anyone can view avatars"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars' 
  and auth.uid()::text = name
);
