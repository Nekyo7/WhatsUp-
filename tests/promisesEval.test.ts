import { describe, it, expect } from "vitest";
import benchmarkDataset from "./fixtures/hinglish-promises.json";
import { extractPromises } from "../lib/analytics/promises";
import type { Message } from "../types";

describe("Hinglish Promise Benchmark Suite (50 Hand-Labeled Samples)", () => {
  it("evaluates precision, recall and accuracy on 50 Hinglish/English messages", () => {
    const baseDate = new Date("2024-03-20T12:00:00Z");
    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;

    benchmarkDataset.forEach((item) => {
      const dummyMsg: Message = {
        id: `eval_${item.id}`,
        chatId: "eval_chat",
        sender: "You",
        timestamp: baseDate.toISOString(),
        text: item.text,
        isSystem: false,
        isMedia: false,
        lang: "hinglish",
      };

      const extracted = extractPromises([dummyMsg], "You", baseDate);
      const detectedAsPromise = extracted.length > 0;

      if (item.isPromise && detectedAsPromise) {
        truePositives++;
      } else if (!item.isPromise && detectedAsPromise) {
        falsePositives++;
      } else if (!item.isPromise && !detectedAsPromise) {
        trueNegatives++;
      } else if (item.isPromise && !detectedAsPromise) {
        falseNegatives++;
      }
    });

    const precision = (truePositives / (truePositives + falsePositives)) * 100;
    const recall = (truePositives / (truePositives + falseNegatives)) * 100;
    const accuracy = ((truePositives + trueNegatives) / benchmarkDataset.length) * 100;
    const f1 = (2 * precision * recall) / (precision + recall);

    // Expect world-class benchmark metrics
    expect(accuracy).toBeGreaterThanOrEqual(92);
    expect(precision).toBeGreaterThanOrEqual(90);
    expect(recall).toBeGreaterThanOrEqual(90);
    expect(f1).toBeGreaterThanOrEqual(90);
  });
});
