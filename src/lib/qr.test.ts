import { describe, expect, it } from "vitest";

import {
  QR_MAX_BYTES,
  encodeQr,
  qrDisplayFor,
  qrSvgPath,
  rsEcCodewords,
} from "@/lib/qr";
import {
  LONG,
  RS_EC,
  RS_INPUT,
  SHORT,
  SHORT_MASKED,
  TINY,
  V7,
  V7_TEXT,
  V8,
  V8_TEXT,
  V9,
  V9_TEXT,
  V10,
  V10_TEXT,
  type QrVector,
} from "@/lib/qr.test-vectors";

// T15 / INS-20 — locally generated QR code for the /install page (FR-8.5,
// constitution C1: no network). GWT-40 itself is a manual device scenario;
// these unit tests pin the QR encoder to known-good vectors produced by an
// independent, spec-conformant implementation (see qr.test-vectors.ts).

const SHORT_TEXT = "https://rallytrack.example/install";
const LONG_TEXT =
  "https://rallytrack-git-milestone-m1-alapok-insiron.vercel.app/install";

function rowsOf(matrix: boolean[][]): string[] {
  return matrix.map((row) => row.map((dark) => (dark ? "1" : "0")).join(""));
}

function expectMatchesVector(text: string, vector: QrVector, mask?: number) {
  const qr = encodeQr(text, mask === undefined ? undefined : { mask });
  expect(qr.version).toBe(vector.version);
  expect(qr.mask).toBe(vector.mask);
  expect(qr.size).toBe(vector.size);
  expect(rowsOf(qr.modules)).toEqual(vector.rows);
}

describe("rsEcCodewords (Reed-Solomon over GF(256))", () => {
  it("matches the reference EC codewords for a v1-M block", () => {
    expect(rsEcCodewords(RS_INPUT, RS_EC.length)).toEqual(RS_EC);
  });
});

describe("encodeQr — version selection (byte mode, EC level M)", () => {
  const boundaries: Array<[chars: number, version: number]> = [
    [1, 1],
    [14, 1],
    [15, 2],
    [26, 2],
    [27, 3],
    [42, 3],
    [43, 4],
    [62, 4],
    [63, 5],
    [84, 5],
    [85, 6],
    [106, 6],
    [107, 7],
    [122, 7],
    [123, 8],
    [152, 8],
    [153, 9],
    [180, 9],
    [181, 10],
    [213, 10],
  ];

  for (const [chars, version] of boundaries) {
    it(`${chars} byte(s) -> version ${version}`, () => {
      expect(encodeQr("a".repeat(chars)).version).toBe(version);
    });
  }

  it("rejects input longer than the supported capacity", () => {
    expect(QR_MAX_BYTES).toBe(213);
    expect(() => encodeQr("a".repeat(QR_MAX_BYTES + 1))).toThrow();
  });

  it("rejects empty input", () => {
    expect(() => encodeQr("")).toThrow();
  });

  it("counts UTF-8 bytes, not characters", () => {
    // 6 chars but 12 UTF-8 bytes each pair: "árvíztűrő" is 9 chars, 13 bytes.
    const qr = encodeQr("á".repeat(13)); // 26 bytes -> still v2
    expect(qr.version).toBe(2);
    expect(encodeQr("á".repeat(14)).version).toBe(3); // 28 bytes -> v3
  });
});

describe("encodeQr — full matrices against reference vectors", () => {
  it("encodes 'hello' identically to the reference (v1-M, byte mode)", () => {
    expectMatchesVector("hello", TINY);
  });

  it("encodes a short install URL identically to the reference (v3-M)", () => {
    expectMatchesVector(SHORT_TEXT, SHORT);
  });

  it("encodes a long preview URL identically to the reference (v5-M, two interleaved RS blocks)", () => {
    expectMatchesVector(LONG_TEXT, LONG);
  });

  it("encodes a 113-byte URL identically to the reference (v7-M: version info + 3-position alignment grid)", () => {
    expectMatchesVector(V7_TEXT, V7);
  });

  it("encodes a 133-byte URL identically to the reference (v8-M: unequal RS blocks 2x38 + 2x39)", () => {
    expectMatchesVector(V8_TEXT, V8);
  });

  it("encodes a 166-byte URL identically to the reference (v9-M: unequal RS blocks 3x36 + 2x37)", () => {
    expectMatchesVector(V9_TEXT, V9);
  });

  it("encodes a 199-byte URL identically to the reference (v10-M: unequal RS blocks + 16-bit length field)", () => {
    expectMatchesVector(V10_TEXT, V10);
  });

  for (let mask = 0; mask < 8; mask++) {
    it(`applies forced mask ${mask} identically to the reference`, () => {
      expectMatchesVector(SHORT_TEXT, SHORT_MASKED[mask], mask);
    });
  }
});

describe("encodeQr — structural invariants", () => {
  it("size is 17 + 4 x version", () => {
    const qr = encodeQr(SHORT_TEXT);
    expect(qr.size).toBe(17 + 4 * qr.version);
    expect(qr.modules).toHaveLength(qr.size);
    for (const row of qr.modules) expect(row).toHaveLength(qr.size);
  });

  it("has the always-dark module at (size - 8, 8)", () => {
    const qr = encodeQr(SHORT_TEXT);
    expect(qr.modules[qr.size - 8][8]).toBe(true);
  });
});

describe("qrDisplayFor — honest QR display state (fix round 1, MAJOR-2)", () => {
  it("is pending while the URL is not yet known on the client", () => {
    expect(qrDisplayFor(null)).toEqual({ status: "pending" });
  });

  it("is ready with the encoded matrix for a normal install URL", () => {
    const display = qrDisplayFor("https://rallytrack.vercel.app/install");
    expect(display.status).toBe("ready");
    if (display.status === "ready") {
      expect(display.qr.size).toBe(17 + 4 * display.qr.version);
    }
  });

  it("degrades to an explicit unavailable state beyond capacity instead of an endless skeleton", () => {
    const oversized = `https://example.com/install?x=${"a".repeat(QR_MAX_BYTES)}`;
    expect(qrDisplayFor(oversized)).toEqual({ status: "unavailable" });
  });
});

describe("qrSvgPath", () => {
  it("emits one 1x1 square per dark module", () => {
    const qr = encodeQr("hello");
    const path = qrSvgPath(qr);
    const darkCount = TINY.rows.join("").split("1").length - 1;
    expect(path.match(/M/g)).toHaveLength(darkCount);
    expect(path).toMatch(/^M\d+ \d+h1v1h-1z/);
  });

  it("places the first dark module of 'hello' at the top-left finder", () => {
    const path = qrSvgPath(encodeQr("hello"));
    expect(path.startsWith("M0 0h1v1h-1z")).toBe(true);
  });
});
