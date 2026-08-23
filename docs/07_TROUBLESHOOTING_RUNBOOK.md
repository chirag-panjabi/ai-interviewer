# 07 — Troubleshooting, Debugging & Operational Runbook

## 1. Quick Diagnostic Checklist

When investigating an issue, check these four components first:
1. **Backend Health**: `curl http://localhost:3001/health` (Verifies DB connection, uptime, memory, and quota).
2. **Database Connection**: `cd apps/backend && bunx prisma db push` (Verifies PostgreSQL schema synchronization).
3. **TypeScript Compilation**:
   - Backend: `cd apps/backend && bun build --target node ./index.ts --outfile /dev/null`
   - Frontend: `cd apps/frontend && bunx tsc --noEmit`
4. **Active Server Ports**: `lsof -i :3001 -i :3000`

---

## 2. Common Failure Modes & Runbooks

### Issue 1: "Failed to initialize interview" on Setup Screen

#### Symptoms:
Candidate clicks "Begin Voice Screen" and receives an HTTP 500 error toast: `"Failed to initialize interview"`.

#### Root Causes & Diagnostics:
1. **Prisma Client Enum Mismatch**:
   - *Cause*: A new track (e.g. `FULL_MOCK_SCREEN`) was added to TypeScript types, but `apps/backend/prisma/schema.prisma` was not updated or `prisma generate` was not run.
   - *Fix*:
     ```bash
     cd apps/backend
     bunx prisma generate
     bunx prisma db push
     ```
2. **PostgreSQL Database Offline**:
   - *Cause*: PostgreSQL server is stopped or `DATABASE_URL` is incorrect.
   - *Fix*: Check database logs or restart local PostgreSQL:
     ```bash
     brew services restart postgresql@14 # (or systemctl restart postgresql)
     ```
3. **Empty or Malformed GitHub Input**:
   - *Cause*: `scrapeGithub` threw an unhandled parsing error on empty or malformed strings.
   - *Fix*: Ensure `parseGithubInput()` defaults to `"candidate"` for empty strings (already resolved in `github.ts`).

---

### Issue 2: "Failed to connect to the interview server" / WebSocket Drops

#### Symptoms:
The interview room displays `"Failed to connect to the interview server"` or repeatedly attempts reconnection.

#### Root Causes & Diagnostics:
1. **Port Mismatch between Frontend and Backend**:
   - *Check*: Is the backend running on port `3001` and frontend looking for `3001`?
   - Inspect network tab in DevTools: Look for WebSocket connection to `ws://localhost:3001/api/v1/live/:id`.
2. **Invalid or Expired Gemini API Key**:
   - *Symptom*: Backend logs show: `[GeminiLive] Gemini WS Closed: 4000 - Invalid API key`.
   - *Fix*: Verify `GEMINI_API_KEY` in `apps/backend/.env` or enter a valid Gemini API key via the **Gemini Key** modal.
3. **Corporate Proxy / VPN WebSocket Blocking**:
   - Some enterprise firewalls block outbound WebSocket (`ws://` / `wss://`) traffic on non-standard ports.
   - Ensure the server is hosted behind a standard HTTPS/WSS reverse proxy (Port 443).

---

### Issue 3: No Audio Playback or Microphone Muted

#### Symptoms:
Alex does not speak audibly, or the VoiceOrb visualizer does not react to candidate voice.

#### Diagnostics & Fixes:
1. **Browser Autoplay Restriction (Safari / Chrome)**:
   - Modern browsers block audio output until a user gesture occurs.
   - Click anywhere in the window or use the **"Test Microphone"** button to trigger `warmUp()`.
2. **Microphone Permissions Denied**:
   - In browser settings (Chrome: `chrome://settings/content/microphone`), verify that permission is granted for `localhost:3000`.
3. **Audio Hardware Sample Rate Mismatch**:
   - Some Bluetooth headsets (e.g. AirPods) switch to 8kHz / 16kHz SCO profile when input is active.
   - `audioProcessor.ts` automatically downsamples via linear interpolation (`resampleTo16k()`).

---

### Issue 4: "Daily demo limit reached" (HTTP 429)

#### Symptoms:
Candidate receives a toast notification prompting for a Gemini API key.

#### Cause & Resolution:
- The IP address has reached `DEMO_DAILY_INTERVIEW_LIMIT` (default: 15 per 24h).
- **Resolution**:
  1. Click **"Gemini Key"** in the top navigation bar.
  2. Paste your free Google Gemini API key from [Google AI Studio](https://aistudio.google.com/).
  3. The key automatically bypasses rate limiting.

---

### Issue 5: GitHub API Rate Limiting (HTTP 403)

#### Symptoms:
GitHub preview fails to load candidate repositories or logs: `API rate limit exceeded`.

#### Resolution:
- GitHub allows 60 unauthenticated requests/hour per IP.
- Add a free GitHub Personal Access Token to `apps/backend/.env`:
  ```bash
  GITHUB_TOKEN="ghp_yourPersonalAccessTokenHere"
  ```
- This raises the rate limit to **5,000 requests/hour**.

---

## 3. Essential Developer & Verification Commands

```bash
# 1. Start full monorepo in development mode
bun run dev

# 2. Run backend isolated
cd apps/backend && bun run index.ts

# 3. Run frontend isolated
cd apps/frontend && bun run dev

# 4. Generate Prisma client & update PostgreSQL schema
cd apps/backend && bunx prisma generate && bunx prisma db push

# 5. Check backend TypeScript build
cd apps/backend && bun build --target node ./index.ts --outfile /dev/null

# 6. Check frontend TypeScript compilation
cd apps/frontend && bunx tsc --noEmit

# 7. Build frontend production distribution
cd apps/frontend && bun run build
```
