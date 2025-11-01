import { registerPayload } from './confirmStore.js';

export interface PreviewCounts {
  totalLength?: number;
  shownLength?: number;
  totalMatched?: number;
  shownCount?: number;
  truncated?: boolean;
}

export function makeConfirmPreview(
  payload: string,
  options: {
    headerLine?: string;
    previewLines: string[]; // include your own 'Preview ...' label line(s)
    counts?: PreviewCounts;
    extraTips?: string[];
  }
): { token: string; lines: string[] } {
  const token = registerPayload(payload);
  const lines: string[] = [];

  if (options.headerLine) {
    lines.push(options.headerLine);
  }

  const parts: string[] = [];
  const c = options.counts || {};
  if (typeof c.totalLength === 'number') parts.push(`totalLength=${c.totalLength}`);
  if (typeof c.shownLength === 'number') parts.push(`shownLength=${c.shownLength}`);
  if (typeof c.totalMatched === 'number') parts.push(`totalMatched=${c.totalMatched}`);
  if (typeof c.shownCount === 'number') parts.push(`shownCount=${c.shownCount}`);
  if (typeof c.truncated === 'boolean') parts.push(`truncated=${c.truncated}`);
  if (parts.length) {
    lines.push(`counts: ${parts.join(', ')}`);
  }

  if (lines.length) lines.push('');

  // Caller provides preview content lines (e.g., label + excerpt or list)
  for (const l of options.previewLines) lines.push(l);

  if (options.previewLines.length) lines.push('');

  const estTokens = Math.round((typeof c.totalLength === 'number' ? c.totalLength : payload.length) / 3);
  lines.push(
    `Output is large (~${estTokens} tokens). To fetch full content without resending parameters, call confirm_output({ token: "${token}" }).`
  );

  if (options.extraTips && options.extraTips.length) {
    for (const tip of options.extraTips) lines.push(tip);
  }

  return { token, lines };
}

