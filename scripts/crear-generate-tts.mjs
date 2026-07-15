#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const ROOT = process.cwd();
const WORKSHOPS_DIR = path.join(ROOT, 'public', 'workshops');
const FORCE = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');
const PROVIDER = process.env.CREAR_TTS_PROVIDER || (process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'say');

function wavHeader(dataLength, sampleRate) {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * 2;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

async function readCrearAudioLines() {
  const files = (await fs.readdir(WORKSHOPS_DIR))
    .filter((name) => name.startsWith('CREAR-') && name.endsWith('.json'))
    .sort();
  const lines = [];

  for (const file of files) {
    const fullPath = path.join(WORKSHOPS_DIR, file);
    const data = JSON.parse(await fs.readFile(fullPath, 'utf8'));
    for (const paso of data.pasos || []) {
      const audio = paso?.crear?.audio;
      if (audio?.src && audio?.text) {
        lines.push({
          src: audio.src,
          text: audio.text,
          refId: paso.ref_id,
          workshop: data.id_taller,
        });
      }
    }
  }

  return lines;
}

async function generateWithSay(text, outPath) {
  const tempDir = await fs.mkdtemp(path.join(tmpdir(), 'crear-tts-'));
  const aiffPath = path.join(tempDir, 'voice.aiff');
  const sayArgs = [];
  if (process.env.CREAR_TTS_VOICE) {
    sayArgs.push('-v', process.env.CREAR_TTS_VOICE);
  }
  if (process.env.CREAR_TTS_RATE) {
    sayArgs.push('-r', process.env.CREAR_TTS_RATE);
  }
  sayArgs.push('-o', aiffPath, text);

  const say = spawnSync('say', sayArgs, { stdio: 'pipe' });
  if (say.status !== 0) {
    throw new Error(`say failed: ${say.stderr.toString('utf8')}`);
  }

  const convert = spawnSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@16000', aiffPath, outPath], {
    stdio: 'pipe',
  });
  await fs.rm(tempDir, { recursive: true, force: true });
  if (convert.status !== 0) {
    throw new Error(`afconvert failed: ${convert.stderr.toString('utf8')}`);
  }
}

async function generateWithElevenLabs(text, outPath) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    throw new Error('ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID are required');
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=pcm_22050`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs failed: ${res.status} ${await res.text()}`);
  }

  const pcm = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outPath, Buffer.concat([wavHeader(pcm.length, 22050), pcm]));
}

async function main() {
  const lines = await readCrearAudioLines();
  console.log(`CREAR TTS: ${lines.length} line(s), provider=${PROVIDER}`);

  for (const line of lines) {
    const outPath = path.join(ROOT, 'public', line.src.replace(/^\//, ''));
    const exists = await fs
      .access(outPath)
      .then(() => true)
      .catch(() => false);
    if (exists && !FORCE) {
      console.log(`skip ${line.src}`);
      continue;
    }

    await fs.mkdir(path.dirname(outPath), { recursive: true });
    console.log(`${DRY_RUN ? 'would write' : 'write'} ${line.src} (${line.workshop}/${line.refId})`);
    if (DRY_RUN) continue;

    if (PROVIDER === 'elevenlabs') {
      await generateWithElevenLabs(line.text, outPath);
    } else if (PROVIDER === 'say') {
      await generateWithSay(line.text, outPath);
    } else {
      throw new Error(`Unsupported provider: ${PROVIDER}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
