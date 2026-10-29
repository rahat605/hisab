# White screen fix

The Contacts feature had a React temporal-dead-zone error: its `useEffect` dependency array read `session?.id` before the `session` state declaration executed. This causes a ReferenceError during render and can blank the app.

The effect is now declared after `session` state. It loads contacts only after a signed-in session exists.

Apply the Supabase `member_contacts` migration before using Contacts. This fix addresses the identified render-time error; run `npm install` and `npm run build` locally to confirm with your environment.
