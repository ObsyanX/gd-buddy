/**
 * Track 9.1 — Benchmarking metrics (pure functions, no I/O).
 *
 * Given labelled predictions [{predicted, expected, confidence}], compute the
 * evaluation surface we persist to `benchmark_reports`:
 *  - precision / recall / F1 per class + macro
 *  - false-positive / false-negative counts
 *  - Cohen's κ (AI ↔ human agreement)
 *  - Expected Calibration Error (ECE) over 10 confidence bins
 */

export interface LabelledPrediction {
  predicted: string;
  expected: string;
  confidence?: number; // [0,1], optional
}

export interface PerClassMetrics {
  label: string;
  tp: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface BenchmarkMetrics {
  n: number;
  perClass: PerClassMetrics[];
  precision: number; // macro
  recall: number;    // macro
  f1: number;        // macro
  falsePositives: number;
  falseNegatives: number;
  aiHumanAgreement: number; // Cohen's kappa
  calibrationEce: number;   // 0 = perfect
}

const safeDiv = (a: number, b: number): number => (b === 0 ? 0 : a / b);

export function computeBenchmark(rows: LabelledPrediction[]): BenchmarkMetrics {
  const labels = Array.from(new Set(rows.flatMap((r) => [r.predicted, r.expected])));
  const perClass: PerClassMetrics[] = labels.map((label) => {
    let tp = 0, fp = 0, fn = 0;
    for (const r of rows) {
      if (r.predicted === label && r.expected === label) tp++;
      else if (r.predicted === label && r.expected !== label) fp++;
      else if (r.predicted !== label && r.expected === label) fn++;
    }
    const precision = safeDiv(tp, tp + fp);
    const recall = safeDiv(tp, tp + fn);
    const f1 = safeDiv(2 * precision * recall, precision + recall);
    return { label, tp, fp, fn, precision, recall, f1 };
  });

  const macro = (k: "precision" | "recall" | "f1") =>
    perClass.length ? perClass.reduce((s, c) => s + c[k], 0) / perClass.length : 0;

  const falsePositives = perClass.reduce((s, c) => s + c.fp, 0);
  const falseNegatives = perClass.reduce((s, c) => s + c.fn, 0);

  // Cohen's kappa on the (predicted, expected) confusion matrix.
  const n = rows.length;
  const po = safeDiv(rows.filter((r) => r.predicted === r.expected).length, n);
  const marginals = new Map<string, { p: number; e: number }>();
  for (const label of labels) marginals.set(label, { p: 0, e: 0 });
  for (const r of rows) {
    marginals.get(r.predicted)!.p += 1;
    marginals.get(r.expected)!.e += 1;
  }
  let pe = 0;
  for (const { p, e } of marginals.values()) pe += (p / (n || 1)) * (e / (n || 1));
  const kappa = safeDiv(po - pe, 1 - pe);

  // Expected Calibration Error over 10 bins.
  const withConf = rows.filter((r) => typeof r.confidence === "number");
  let ece = 0;
  if (withConf.length) {
    const bins = Array.from({ length: 10 }, () => ({ n: 0, correct: 0, conf: 0 }));
    for (const r of withConf) {
      const c = Math.min(1, Math.max(0, r.confidence!));
      const idx = c >= 1 ? 9 : Math.floor(c * 10);
      const bin = bins[idx];
      bin.n += 1;
      bin.conf += c;
      if (r.predicted === r.expected) bin.correct += 1;
    }
    for (const b of bins) {
      if (b.n === 0) continue;
      const acc = b.correct / b.n;
      const avgConf = b.conf / b.n;
      ece += (b.n / withConf.length) * Math.abs(acc - avgConf);
    }
  }

  return {
    n,
    perClass,
    precision: macro("precision"),
    recall: macro("recall"),
    f1: macro("f1"),
    falsePositives,
    falseNegatives,
    aiHumanAgreement: kappa,
    calibrationEce: ece,
  };
}
