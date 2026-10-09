/**
 * LIBFLOW — Deterministic Vector Barcode & QR Code Engine
 * 
 * Implements pure TypeScript, zero-dependency SVG generators:
 * 1. Code 128 (Subtype B) Barcode Generator with Modulo 103 Checksum
 * 2. ISO/IEC 18004 QR Code Matrix Generator with Reed-Solomon Error Correction (Level M)
 */

// ============================================================================
// CODE 128 BARCODE GENERATOR
// ============================================================================

// Bar/space width patterns for Code 128 symbols 0..106
// Each entry consists of 6 bar/space widths (except stop which has 7).
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112', // 100-106 (106 is Stop)
];

const CODE128_B_START = 104;
const CODE128_STOP = 106;

/**
 * Encodes text into Code 128-B modules (binary string '101011...')
 */
export function encodeCode128B(text: string): string {
  const cleanText = text.trim() || 'LIBFLOW';
  const charCodes: number[] = [];

  for (let i = 0; i < cleanText.length; i++) {
    const code = cleanText.charCodeAt(i) - 32;
    if (code >= 0 && code <= 95) {
      charCodes.push(code);
    } else {
      // Fallback for non-ASCII
      charCodes.push(0);
    }
  }

  // Calculate checksum mod 103
  let checksum = CODE128_B_START;
  for (let i = 0; i < charCodes.length; i++) {
    checksum += charCodes[i] * (i + 1);
  }
  checksum %= 103;

  const sequence = [CODE128_B_START, ...charCodes, checksum, CODE128_STOP];

  // Convert width strings to binary 1s (bars) and 0s (spaces)
  let binaryModules = '0000000000'; // Quiet zone
  for (const symbolIdx of sequence) {
    const pattern = CODE128_PATTERNS[symbolIdx] || CODE128_PATTERNS[0];
    let isBar = true;
    for (let p = 0; p < pattern.length; p++) {
      const width = parseInt(pattern[p], 10);
      binaryModules += (isBar ? '1' : '0').repeat(width);
      isBar = !isBar;
    }
  }
  binaryModules += '0000000000'; // Quiet zone

  return binaryModules;
}

// ============================================================================
// QR CODE GENERATOR (Pure TypeScript Matrix Engine)
// ============================================================================

// Galois Field GF(256) logarithm and exponent tables for Reed-Solomon coding
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_EXP[i + 255] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x >= 256) {
      x ^= 0x11d; // Primitive polynomial x^8 + x^4 + x^3 + x^2 + 1
    }
  }
})();

function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMultiply(poly[j], root);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsCalculateEC(data: Uint8Array, ecCount: number): Uint8Array {
  const genPoly = rsGeneratorPoly(ecCount);
  const msg = new Uint8Array(data.length + ecCount);
  msg.set(data);

  for (let i = 0; i < data.length; i++) {
    const lead = msg[i];
    if (lead !== 0) {
      for (let j = 0; j < genPoly.length; j++) {
        msg[i + j] ^= gfMultiply(genPoly[j], lead);
      }
    }
  }
  return msg.subarray(data.length);
}

// QR Version table for Level M: capacity, total codewords, EC count
const QR_VERSIONS = [
  { version: 1, size: 21, dataCap: 14, totalBytes: 26, ecCount: 10, align: [] },
  { version: 2, size: 25, dataCap: 26, totalBytes: 44, ecCount: 16, align: [6, 18] },
  { version: 3, size: 29, dataCap: 42, totalBytes: 70, ecCount: 26, align: [6, 22] },
  { version: 4, size: 33, dataCap: 62, totalBytes: 100, ecCount: 36, align: [6, 26] },
  { version: 5, size: 37, dataCap: 84, totalBytes: 134, ecCount: 48, align: [6, 30] },
  { version: 6, size: 41, dataCap: 106, totalBytes: 172, ecCount: 64, align: [6, 34] },
];

/**
 * Generates an ISO-standard QR Code boolean matrix for given string
 */
export function generateQrMatrix(text: string): boolean[][] {
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(text);

  // Pick smallest version that fits
  let cfg = QR_VERSIONS[0];
  for (const v of QR_VERSIONS) {
    if (rawBytes.length + 3 <= v.dataCap) {
      cfg = v;
      break;
    }
    cfg = v;
  }

  const { size, dataCap, ecCount, align } = cfg;

  // Build data bitstream (8-bit Byte mode)
  const bitArray: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bitArray.push((val >> i) & 1);
    }
  };

  // Mode Indicator 0100 (Byte mode)
  pushBits(0b0100, 4);
  // Character count indicator (8 bits for versions 1..9)
  pushBits(rawBytes.length, 8);
  // Data bytes
  for (let i = 0; i < rawBytes.length; i++) {
    pushBits(rawBytes[i], 8);
  }
  // Terminator bits (up to 4 zeroes)
  pushBits(0, Math.min(4, dataCap * 8 - bitArray.length));
  // Pad to byte boundary
  while (bitArray.length % 8 !== 0) {
    bitArray.push(0);
  }
  // Pad bytes 0xEC and 0x11 until capacity
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bitArray.length < dataCap * 8) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Convert bits to data byte array
  const dataBytes = new Uint8Array(dataCap);
  for (let i = 0; i < dataCap; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bitArray[i * 8 + b];
    }
    dataBytes[i] = byteVal;
  }

  // Calculate Reed-Solomon Error Correction bytes
  const ecBytes = rsCalculateEC(dataBytes, ecCount);

  // Combine data + EC into full codeword sequence
  const fullCodewords = new Uint8Array(dataCap + ecCount);
  fullCodewords.set(dataBytes, 0);
  fullCodewords.set(ecBytes, dataCap);

  // Matrix creation (-1 = unassigned, 0 = white, 1 = black)
  const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(-1));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setModule = (r: number, c: number, val: number) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      isFunction[r][c] = true;
    }
  };

  // 1. Finder patterns (7x7) + Separators
  const placeFinder = (startRow: number, startCol: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = startRow + r;
        const col = startCol + c;
        if (row >= 0 && row < size && col >= 0 && col < size) {
          if (r === -1 || r === 7 || c === -1 || c === 7) {
            setModule(row, col, 0); // Separator
          } else if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            setModule(row, col, 1);
          } else {
            setModule(row, col, 0);
          }
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // 2. Alignment patterns (for v2+)
  if (align.length > 0) {
    for (const rCenter of align) {
      for (const cCenter of align) {
        // Skip corners that overlap finders
        if (
          (rCenter < 9 && cCenter < 9) ||
          (rCenter < 9 && cCenter > size - 9) ||
          (rCenter > size - 9 && cCenter < 9)
        ) {
          continue;
        }
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isCenter = dr === 0 && dc === 0;
            setModule(rCenter + dr, cCenter + dc, isBorder || isCenter ? 1 : 0);
          }
        }
      }
    }
  }

  // 3. Timing patterns (Row 6 and Col 6)
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setModule(6, i, i % 2 === 0 ? 1 : 0);
    if (!isFunction[i][6]) setModule(i, 6, i % 2 === 0 ? 1 : 0);
  }

  // 4. Dark Module
  setModule(size - 8, 8, 1);

  // 5. Reserve Format Info areas
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }
  for (let i = size - 8; i < size; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }

  // 6. Data Placement in Zigzag columns
  const allBits: number[] = [];
  for (let i = 0; i < fullCodewords.length; i++) {
    const byte = fullCodewords[i];
    for (let b = 7; b >= 0; b--) {
      allBits.push((byte >> b) & 1);
    }
  }

  let bitIdx = 0;
  let upward = true;
  for (let rightCol = size - 1; rightCol > 0; rightCol -= 2) {
    if (rightCol === 6) rightCol--; // Skip vertical timing line

    const rowSeq = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rowSeq) {
      for (const c of [rightCol, rightCol - 1]) {
        if (!isFunction[r][c]) {
          const bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
          // Apply Standard Mask Pattern 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = (bit ^ (mask ? 1 : 0)) === 1 ? 1 : 0;
        }
      }
    }
    upward = !upward;
  }

  // 7. Format Information (Level M, Mask 0: 0x5412)
  // Pre-calculated BCH(15,5) format sequence with mask 101010000010010 XOR 101010000010010 = 0x5412
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];

  // Top-left format info
  for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i];
  matrix[8][7] = formatBits[6];
  matrix[8][8] = formatBits[7];
  matrix[7][8] = formatBits[8];
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = formatBits[i];

  // Split format info around corners
  for (let i = 0; i < 7; i++) matrix[size - 1 - i][8] = formatBits[i];
  for (let i = 7; i < 15; i++) matrix[8][size - 15 + i] = formatBits[i];

  // Final Boolean Output
  return matrix.map((row) => row.map((cell) => cell === 1));
}

/**
 * Generates an SVG path string or rect markup for a QR matrix
 */
export function matrixToSvgPath(matrix: boolean[][]): string {
  let path = '';
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c]) {
        path += `M${c},${r}h1v1h-1z `;
      }
    }
  }
  return path;
}
