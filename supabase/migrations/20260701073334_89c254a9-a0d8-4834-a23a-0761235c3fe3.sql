-- Purge historical resolved error logs that clutter the admin dashboard.
-- These patterns correspond to previously fixed audio/hook/TDZ issues.
DELETE FROM public.error_logs
WHERE
     lower(error_message) LIKE '%cannot close a closed audiocontext%'
  OR lower(error_message) LIKE '%cannot access ''recalculatemetrics'' before initialization%'
  OR lower(error_message) LIKE '%should have a queue%'
  OR lower(error_message) LIKE '%temporal dead zone%'
  OR lower(error_message) LIKE '%<div> cannot appear as a descendant of <p>%'
  OR created_at < (now() - interval '7 days');