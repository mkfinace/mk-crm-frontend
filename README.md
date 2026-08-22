# MK Finance — Car CRM Frontend

Next.js frontend for the New Car Website. Talks to the NestJS backend at
`mk-crm-backend.onrender.com`.

## Local development
```
npm install
npm run dev
```
Runs on http://localhost:3000

## Deploy (Vercel)
1. Import this repo on vercel.com → New Project.
2. Framework preset: Next.js (auto-detected).
3. Environment Variable: `NEXT_PUBLIC_API_URL` = https://mk-crm-backend.onrender.com
4. Deploy.
