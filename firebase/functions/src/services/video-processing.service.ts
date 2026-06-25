import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as ffmpeg from 'fluent-ffmpeg';

export interface CompressionResult {
  outputPath: string;
  durationSeconds: number;
  fileSizeBytes: number;
}

export async function compressVideo(inputPath: string): Promise<CompressionResult> {
  const outputPath = path.join(os.tmpdir(), `compressed-${Date.now()}.mp4`);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-preset medium',
        '-crf 23',
        '-c:a aac',
        '-b:a 128k',
        '-movflags +faststart',
        '-vf scale=1280:-2',
      ])
      .output(outputPath)
      .on('end', () => {
        const stats = fs.statSync(outputPath);
        ffmpeg.ffprobe(outputPath, (err, metadata) => {
          if (err) {
            reject(err);
            return;
          }
          resolve({
            outputPath,
            durationSeconds: metadata.format.duration || 0,
            fileSizeBytes: stats.size,
          });
        });
      })
      .on('error', reject)
      .run();
  });
}

/** Gera arquivo VTT básico - placeholder para integração com serviço de transcrição (Whisper/Google STT) */
export async function generateSubtitles(
  videoPath: string,
  _language = 'pt-BR',
): Promise<{ vttContent: string; vttPath: string }> {
  const vttPath = path.join(os.tmpdir(), `subtitles-${Date.now()}.vtt`);

  // Placeholder VTT - em produção integrar com Google Speech-to-Text ou Whisper API
  const vttContent = `WEBVTT

00:00:00.000 --> 00:00:05.000
Heróis dos Prêmios

00:00:05.000 --> 00:00:10.000
Assista até o final para ganhar moedas!
`;

  fs.writeFileSync(vttPath, vttContent, 'utf-8');
  return { vttContent, vttPath };
}

export function cleanupTempFiles(...paths: string[]): void {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      // ignore cleanup errors
    }
  }
}
