import QRCode from 'qrcode';
import type {
  QRStateData,
  QROptions,
  ValidationResult,
  CenterContentConfig,
} from '../types/qr';

export const QR_FG_COLOR = '#000000';
export const QR_BG_COLOR = '#ffffff';

export function formatQRPayload(state: QRStateData): string {
  switch (state.type) {
    case 'url': {
      let url = state.url.url.trim();
      if (!url) return '';
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      return url;
    }
    case 'text':
      return state.text.text;
    case 'wifi': {
      const { ssid, password, encryption, hidden } = state.wifi;
      if (!ssid.trim()) return '';
      return `WIFI:T:${encryption};S:${ssid.trim()};P:${password};H:${hidden ? 'true' : 'false'};;`;
    }
    default:
      return '';
  }
}

export function validateQRInput(state: QRStateData): ValidationResult {
  switch (state.type) {
    case 'url': {
      const url = state.url.url.trim();
      if (!url) {
        return { isValid: false, message: 'URL cannot be empty' };
      }
      const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i;
      if (!urlPattern.test(url)) {
        return { isValid: false, message: 'Please enter a valid website URL (e.g. https://example.com)' };
      }
      return { isValid: true };
    }
    case 'text': {
      if (!state.text.text.trim()) {
        return { isValid: false, message: 'Text content cannot be empty' };
      }
      return { isValid: true };
    }
    case 'wifi': {
      const { ssid, password, encryption } = state.wifi;
      if (!ssid.trim()) {
        return { isValid: false, message: 'Network SSID (Name) is required' };
      }
      if (encryption !== 'nopass' && (!password || password.length < 4)) {
        return { isValid: false, message: 'Password must be at least 4 characters for encrypted networks' };
      }
      return { isValid: true };
    }
    default:
      return { isValid: true };
  }
}

/**
 * Generates binary 2D matrix for the given payload.
 * When center content is present, uses internal error correction 'H' (30%) to guarantee scannability.
 */
export function getQRMatrix(
  payload: string,
  centerContent?: CenterContentConfig
): { size: number; matrix: boolean[][] } {
  if (!payload) {
    return { size: 0, matrix: [] };
  }

  const hasCenter = centerContent && centerContent.type !== 'none';
  const errorCorrectionLevel = hasCenter ? 'H' : 'M';

  try {
    const qr = QRCode.create(payload, {
      errorCorrectionLevel: errorCorrectionLevel,
    });
    const size = qr.modules.size;
    const matrix: boolean[][] = [];

    // If center content is enabled, determine safe center clearance area
    const centerRadius = hasCenter ? Math.max(2, Math.floor(size * 0.11)) : 0;
    const mid = Math.floor(size / 2);

    for (let r = 0; r < size; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < size; c++) {
        // Clear center area so no QR modules overlap the center badge
        if (hasCenter && Math.abs(r - mid) <= centerRadius && Math.abs(c - mid) <= centerRadius) {
          row.push(false);
        } else {
          row.push(Boolean(qr.modules.get(r, c)));
        }
      }
      matrix.push(row);
    }

    return { size, matrix };
  } catch (err) {
    console.error('Failed to create QR matrix:', err);
    return { size: 0, matrix: [] };
  }
}

/**
 * Helper to draw center text or logo over a canvas
 */
async function drawCenterContent(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  centerContent: CenterContentConfig
): Promise<void> {
  if (centerContent.type === 'none') return;

  const cx = width / 2;
  const cy = height / 2;
  const badgeSize = Math.round(width * 0.22);
  const halfBadge = badgeSize / 2;
  const radius = Math.round(badgeSize * 0.18);

  // Draw clean white background badge with rounded corners
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(cx - halfBadge, cy - halfBadge, badgeSize, badgeSize, radius);
  ctx.fill();
  ctx.lineWidth = Math.max(2, Math.round(width * 0.005));
  ctx.strokeStyle = '#000000';
  ctx.stroke();

  if (centerContent.type === 'text' && centerContent.text.trim()) {
    // Draw bold clean text
    const text = centerContent.text.trim().substring(0, 10);
    const fontSize = Math.round(badgeSize * 0.32);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy);
  } else if (centerContent.type === 'logo' && centerContent.logoDataUrl) {
    // Draw logo image
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const padding = Math.round(badgeSize * 0.14);
        const innerSize = badgeSize - padding * 2;
        const aspect = img.width / img.height;
        let drawW = innerSize;
        let drawH = innerSize;

        if (aspect > 1) {
          drawH = innerSize / aspect;
        } else {
          drawW = innerSize * aspect;
        }

        ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = centerContent.logoDataUrl!;
    });
  }

  ctx.restore();
}

/**
 * Downloads the current QR code as a standard black-on-white PNG file with optional center content
 */
export async function downloadQRPNG(
  payload: string,
  options: QROptions,
  filename: string = 'cityqr-code.png'
): Promise<void> {
  if (!payload) return;

  const hasCenter = options.centerContent && options.centerContent.type !== 'none';
  const errorCorrectionLevel = hasCenter ? 'H' : 'M';

  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(canvas, payload, {
    width: options.size,
    margin: options.margin,
    color: {
      dark: QR_FG_COLOR,
      light: QR_BG_COLOR,
    },
    errorCorrectionLevel: errorCorrectionLevel,
  });

  const ctx = canvas.getContext('2d');
  if (ctx && hasCenter) {
    await drawCenterContent(ctx, canvas.width, canvas.height, options.centerContent);
  }

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
