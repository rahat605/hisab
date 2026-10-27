# Custom payment logos

The admin Payment Options page now supports either a logo URL or uploading a small image (PNG, JPEG, WebP, or SVG, max 500 KB) for each payment method. The uploaded image is stored as a data URL in `payment_options.logo_url`, so no Storage bucket is required.

Before using this feature on an existing Supabase project, run `PAYMENT-LOGO-COLUMN-MIGRATION.sql` in Supabase SQL Editor. For a new setup, `PAYMENT-OPTIONS-SETUP.sql` also creates the column.

Custom logos appear in the admin preview and the member Pay your rent page. If no custom logo is set, the built-in logo remains the fallback.
