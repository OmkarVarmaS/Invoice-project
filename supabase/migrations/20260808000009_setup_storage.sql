-- =============================================================================
-- Migration: 20260808000009_setup_storage.sql
-- Description: Sets up the business-logos storage bucket and RLS security policies.
-- =============================================================================

-- Register public storage bucket for business logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-logos',
  'business-logos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];

-- RLS policy: Public read access to business logos
CREATE POLICY "Public Read Access for Business Logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-logos');

-- RLS policy: Authenticated users can upload logos into their user folder (user_id/*)
CREATE POLICY "Authenticated User Upload Business Logo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS policy: Authenticated users can update their uploaded logos
CREATE POLICY "Authenticated User Update Business Logo"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'business-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'business-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS policy: Authenticated users can delete their uploaded logos
CREATE POLICY "Authenticated User Delete Business Logo"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'business-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
