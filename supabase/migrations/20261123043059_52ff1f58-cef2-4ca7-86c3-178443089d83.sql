CREATE POLICY "Administrators read vehicle photos" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='vehicle-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Administrators upload vehicle photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='vehicle-images' AND public.has_role(auth.uid(),'admin'));
