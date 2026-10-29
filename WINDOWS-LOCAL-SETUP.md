# Monthly Hisab: Windows local setup and troubleshooting

## 1. Open the correct folder

Extract this ZIP. In VS Code, open the folder that contains `package.json`.
Do not open the parent folder or a nested duplicate project folder.

## 2. Set Supabase browser values

1. Copy `.env.example` to a new file named `.env` in the same folder as `package.json`.
2. In Supabase Dashboard, open Project Settings > API.
3. Copy the Project URL into `VITE_SUPABASE_URL`.
4. Copy the publishable key (or legacy anon public key) into `VITE_SUPABASE_ANON_KEY`.
5. Save `.env`.

These are browser-side public values. Never put `service_role`, database passwords, or secret keys in `.env`.

## 3. Install and start

Open one VS Code terminal in the project root and run:


```powershell
npm ci
npm run dev
```

Open the Local URL printed by Vite. After changing `.env`, stop Vite with Ctrl+C and start it again.

## 4. Fix Vite EBUSY / resource busy or locked

If the terminal says `EBUSY: resource busy or locked, watch`:

1. Stop every Vite terminal with Ctrl+C.
2. Close extra terminals that run `npm run dev`.
3. Close File Explorer windows showing the project or `node_modules` if they are busy.
4. In one terminal, from the folder containing `package.json`, run:

```powershell
npm run dev
```

If it still fails, restart VS Code or Windows. Do not delete project files or the lockfile to fix a watcher lock.

## 5. Supabase functions and database

The login screen invokes `username-login`; forgot-password invokes `username-password-reset`.
Both functions must be deployed and configured in the Supabase project. The server-side function secrets must include:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side function secret only)
- `PASSWORD_RESET_REDIRECT_URL` (optional)

Follow `SUPABASE-SETUP.md` and the relevant SQL migration files. The project currently has some dashboard data still managed by local React state, so do not treat it as a fully synchronized multi-user expense database until that layer and its row-level security are migrated and tested.

## Security

The screenshot previously shared showed a password in plain text. Change that password now, especially if it is reused. Never include your `.env` file in a ZIP shared with others.
