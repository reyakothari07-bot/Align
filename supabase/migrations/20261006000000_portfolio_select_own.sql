-- Storage needs a SELECT policy for a user to delete (or overwrite) their own
-- portfolio files. Public URLs already work without it; this only lets the
-- owner see their own folder through the API.
create policy portfolio_select_own on storage.objects for select to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);
