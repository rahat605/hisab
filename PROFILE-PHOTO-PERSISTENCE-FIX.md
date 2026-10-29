# Profile photo persistence fix

- Cloud profile loading now selects `profiles.photo_url`.
- The signed-in user's profile photo state is restored from the persisted profile row after cloud data loads.
- The mapped profile data retains `photo_url`.
- Upload flow still updates Storage and `profiles.photo_url`; this patch fixes the missing read/restore path.

Deploy the updated frontend after replacing the project files. This source-only fix does not change Supabase Storage policies or create a bucket.
