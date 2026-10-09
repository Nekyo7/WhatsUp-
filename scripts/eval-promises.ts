import fs from "fs";
import path from "path";
import { extractPromises } from "../lib/analytics/promises";
import type { Message } from "../types";

interface BenchmarkItem {
  id: number;
  text: string;
  isPromise: boolean;
  hasDueDate: boolean;
}

const fixturePath = path.join(__dirname, "../tests/fixtures/hinglish-promises.json");
const rawData = fs.readFileSync(fixturePath, "utf-8");
const dataset: BenchmarkItem[] = JSON.parse(rawData);

let truePositives = 0;
let falsePositives = 0;
let trueNegatives = 0;
let falseNegatives = 0;
let dueDateMatches = 0;

const baseDate = new Date("2024-03-20T12:00:00Z");

console.log("=================================================================");
console.log("🚀 WhatsUP? Hinglish & Multilingual Promise Extraction Evaluation");
console.log("=================================================================\n");

dataset.forEach((item) => {
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
  const detectedHasDueDate = extracted.length > 0 && extracted[0].dueAt !== null;

  if (item.isPromise && detectedAsPromise) {
    truePositives++;
    if (item.hasDueDate === detectedHasDueDate) {
      dueDateMatches++;
    }
  } else if (!item.isPromise && detectedAsPromise) {
    falsePositives++;
    console.log(`❌ False Positive: "${item.text}" (Expected: NOT promise)`);
  } else if (!item.isPromise && !detectedAsPromise) {
    trueNegatives++;
  } else if (item.isPromise && !detectedAsPromise) {
    falseNegatives++;
    console.log(`❌ False Negative: "${item.text}" (Expected: PROMISE)`);
  }
});

const total = dataset.length;
const precision = truePositives + falsePositives > 0 ? (truePositives / (truePositives + falsePositives)) * 100 : 0;
const recall = truePositives + falseNegatives > 0 ? (truePositives / (truePositives + falseNegatives)) * 100 : 0;
const accuracy = ((truePositives + trueNegatives) / total) * 100;
const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

console.log("\n-----------------------------------------------------------------");
console.log(`📊 EVALUATION RESULTS ACROSS ${total} HAND-LABELED SAMPLES:`);
console.log("-----------------------------------------------------------------");
console.log(`✅ True Positives:  ${truePositives}`);
console.log(`✅ True Negatives:  ${trueNegatives}`);
console.log(`⚠️  False Positives: ${falsePositives}`);
console.log(`⚠️  False Negatives: ${falseNegatives}`);
console.log("-----------------------------------------------------------------");
console.log(`🎯 Precision:       ${precision.toFixed(1)}%`);
console.log(`🎯 Recall:          ${recall.toFixed(1)}%`);
console.log(`🎯 Accuracy:        ${accuracy.toFixed(1)}%`);
console.log(`🎯 F1-Score:        ${f1.toFixed(1)}%`);
console.log("=================================================================\n");
