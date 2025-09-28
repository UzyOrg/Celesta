# Evidence Collection Guide (local/dev)

This folder will contain all E2E proof artifacts. Follow these Windows PowerShell steps.

Important:
- Do NOT expose SUPABASE_SERVICE_ROLE_KEY to the client. It is only read on server routes/pages with `export const runtime = 'nodejs'`.
- Keep logs local; commit only sanitized text outputs into this folder.

## 1) Apply migrations (in order)
Run each SQL in Supabase SQL Editor:
- `Celesta/lib/supabase/migrations/2025-08-20-pr1-student-session-id.sql`
- `Celesta/lib/supabase/migrations/2025-08-20-pr1_5-alias.sql`
- `Celesta/lib/supabase/migrations/prb-alias-rls.sql`
- `Celesta/lib/supabase/migrations/prc-events-composite-indexes.sql`
- `Celesta/lib/supabase/migrations/2025-08-21-pr1_6-transparency.sql`

## 2) Start dev server with SSR logging
In a terminal at `Celesta/`:

```powershell
# Ensure env vars are set for server-side usage only
echo "NEXT_PUBLIC_SUPABASE_URL=YOUR_URL" | Out-File -FilePath .env.local -Encoding utf8 -Append
# Do NOT commit service key and do not print it; present only in server env
# You may set SUPABASE_SERVICE_ROLE_KEY in your shell environment securely

# Run and capture logs to ssr.log in project root
npm run dev *>&1 | Tee-Object -FilePath ssr.log
```

When finished exercising pages, copy sanitized log for analysis:

```powershell
Copy-Item ssr.log "docs/evidence/ssr.log"
node scripts/analyze-ssr-logs.mjs ssr.log | Tee-Object -FilePath "docs/evidence/ssr_analyze.txt"
```

## 3) Seed demo data
```powershell
$iwr = { Invoke-WebRequest @args -UseBasicParsing }
& $iwr -Method POST -Uri "http://localhost:3000/api/demo/seed?token=DEMO-101&n=12&talleres=BIO-001" | Select-Object -ExpandProperty Content | Out-File "docs/evidence/seed_response.json" -Encoding utf8
```

## 4) Validate UI and capture screenshots
- Open: `http://localhost:3000/teacher/DEMO-101` and take a screenshot showing the Alias column → save as `docs/evidence/teacher_panel_alias.png`.
- Click a student alias to open: `http://localhost:3000/teacher/DEMO-101/student/{sessionId}` → save as `docs/evidence/student_timeline.png`.

## 5) CSV export sample
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/teacher/export?token=DEMO-101" -OutFile "docs/evidence/export.csv"
```

## 6) CSV export rate limit (60/min per class_token)
Run ~65 requests under 60 seconds; collect 429s:
```powershell
$uri = "http://localhost:3000/api/teacher/export?token=DEMO-101"
$log = "docs/evidence/rate_limit_csv_429.txt"
Remove-Item $log -ErrorAction SilentlyContinue
for ($i=0; $i -lt 65; $i++) {
  try {
    $resp = Invoke-WebRequest -Uri $uri -UseBasicParsing -ErrorAction Stop
  } catch {
    $ex = $_.Exception
    $code = $ex.Response.StatusCode.value__
    if ($code -eq 429) { Add-Content -Path $log -Value "429 at $(Get-Date -Format o)" }
  }
  Start-Sleep -Milliseconds 200
}
```

## 7) Ingest rate limits (240/min per IP, 120/min per (IP,class_token))
Send many POSTs to `/api/events/ingest`:
```powershell
$uri = "http://localhost:3000/api/events/ingest"
$token = "DEMO-101"
$taller = "BIO-001"
$log = "docs/evidence/rate_limit_ingest_429.txt"
Remove-Item $log -ErrorAction SilentlyContinue
for ($i=0; $i -lt 130; $i++) {
  $guid = [guid]::NewGuid().ToString()
  $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  $body = (@{
    events = @(@{
      actor_sid = "rl-actor"
      student_session_id = "rl-actor"
      class_token = $token
      taller_id = $taller
      paso_id = "ratelimit"
      verbo = "envio_respuesta"
      result = @{ alias = "rl-demo" }
      ts = $now
      client_event_id = $guid
      client_ts = $now
    })
  } | ConvertTo-Json -Depth 4)
  try {
    Invoke-WebRequest -Method POST -Uri $uri -ContentType "application/json" -Body $body -UseBasicParsing -ErrorAction Stop | Out-Null
  } catch {
    $ex = $_.Exception
    $code = $ex.Response.StatusCode.value__
    if ($code -eq 429) { Add-Content -Path $log -Value "429 at $(Get-Date -Format o)" }
  }
}
```

## 8) Transparency API
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/transparency?token=DEMO-101" -OutFile "docs/evidence/transparency.json"
```

## 9) EXPLAIN ANALYZE (run in Supabase SQL editor)
Teacher panel query shape:
```sql
EXPLAIN ANALYZE
SELECT student_session_id, actor_sid, class_token, taller_id, paso_id, verbo, result, ts, client_ts, alias
FROM learning_events_with_alias
WHERE class_token = 'DEMO-101'
  AND ts BETWEEN 'YYYY-MM-DDT00:00:00.000Z' AND 'YYYY-MM-DDT23:59:59.999Z'
  -- AND taller_id = 'BIO-001'
ORDER BY ts DESC
LIMIT 5000;
```
Save output to `docs/evidence/explain_analyze_teacher.txt`.

Student timeline query shape:
```sql
EXPLAIN ANALYZE
SELECT student_session_id, actor_sid, class_token, taller_id, paso_id, verbo, result, ts, client_ts, alias
FROM learning_events_with_alias
WHERE class_token = 'DEMO-101'
  AND student_session_id = '<PASTE_SESSION_ID>'
  AND ts BETWEEN 'YYYY-MM-DDT00:00:00.000Z' AND 'YYYY-MM-DDT23:59:59.999Z'
ORDER BY ts ASC
LIMIT 5000;
```
Save output to `docs/evidence/explain_analyze_student.txt`.

## 10) Finalize
- Ensure every required artifact exists (see list below). Where missing, keep the file with the FALTA note.

Helper commands:

```powershell
npm run evidence:analyze   # generates docs/evidence/ssr_analyze.txt from docs/evidence/ssr.log
npm run evidence:check     # prints missing evidence files
```

Expected files:
- teacher_panel_alias.png (image)
- student_timeline.png (image)
- export.csv
- rate_limit_csv_429.txt
- rate_limit_ingest_429.txt
- transparency.json
- ssr.log
- ssr_analyze.txt
- explain_analyze_teacher.txt
- explain_analyze_student.txt
- seed_response.json
