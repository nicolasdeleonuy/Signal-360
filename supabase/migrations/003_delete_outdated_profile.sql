-- Deletes the specific outdated profile to allow the trigger to work correctly on next login
DELETE FROM public.profiles WHERE id = 'b4ecda03-b335-4254-856c-7f7752b596dd';