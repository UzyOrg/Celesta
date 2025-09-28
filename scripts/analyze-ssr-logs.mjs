#!/usr/bin/env node
import fs from 'node:fs'

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/analyze-ssr-logs.mjs <log-file>')
  process.exit(1)
}
// Read as raw buffer first to handle different encodings robustly.
// On Windows PowerShell, Tee-Object/Out-File often produce UTF-16 LE by default.
const buf = fs.readFileSync(file)
let text = ''
if (buf.length >= 2) {
  const b0 = buf[0]
  const b1 = buf[1]
  // UTF-8 BOM
  if (buf.length >= 3 && b0 === 0xEF && b1 === 0xBB && buf[2] === 0xBF) {
    text = buf.toString('utf8')
  }
  // UTF-16 LE BOM
  else if (b0 === 0xFF && b1 === 0xFE) {
    text = buf.toString('utf16le')
  }
  // UTF-16 BE BOM
  else if (b0 === 0xFE && b1 === 0xFF) {
    // Node supports 'utf16be' via swap if necessary; simple fallback:
    // swap bytes to LE for decoding
    const swapped = Buffer.allocUnsafe(buf.length)
    for (let i = 0; i + 1 < buf.length; i += 2) {
      swapped[i] = buf[i + 1]
      swapped[i + 1] = buf[i]
    }
    text = swapped.toString('utf16le')
  }
  else {
    // Heuristic: if many NUL bytes at odd positions, likely UTF-16 LE without BOM
    const sampleLen = Math.min(buf.length, 4096)
    let nulAtOdd = 0
    for (let i = 1; i < sampleLen; i += 2) if (buf[i] === 0x00) nulAtOdd++
    if (nulAtOdd > sampleLen / 4) {
      text = buf.toString('utf16le')
    } else {
      text = buf.toString('utf8')
    }
  }
} else {
  text = buf.toString('utf8')
}

function collect(regex) {
  const out = []
  const re = new RegExp(regex, 'g')
  for (const m of text.matchAll(re)) {
    out.push(Number(m[1]))
  }
  return out
}

function pct(arr, p) {
  if (arr.length === 0) return 0
  const a = [...arr].sort((x, y) => x - y)
  const rank = Math.ceil((p / 100) * a.length) - 1
  return a[Math.max(0, Math.min(rank, a.length - 1))]
}

function summarize(name, arr) {
  const p50 = pct(arr, 50)
  const p95 = pct(arr, 95)
  const p99 = pct(arr, 99)
  console.log(`${name}: n=${arr.length} p50=${p50}ms p95=${p95}ms p99=${p99}ms`)
}

const teacherQuery = collect(String.raw`\[SSR\]\[teacher\] query (\d+)ms`)
const teacherTotal = collect(String.raw`\[SSR\]\[teacher\] total (\d+)ms`)
const studentQuery = collect(String.raw`\[SSR\]\[student\] query (\d+)ms`)
const studentTotal = collect(String.raw`\[SSR\]\[student\] total (\d+)ms`)

summarize('teacher.query', teacherQuery)
summarize('teacher.total', teacherTotal)
summarize('student.query', studentQuery)
summarize('student.total', studentTotal)
