import axios from "axios";
import fs from "fs";
import path from "path";
import { dedupe, normalize, OpenTDBResult } from "./lib";

async function fetchOpenTDB(amount = 25) {
  const url = `https://opentdb.com/api.php?type=multiple&amount=${amount}`;
  const { data } = await axios.get(url, { timeout: 15000 });
  if (!data || !Array.isArray(data.results)) return [] as OpenTDBResult[];
  return data.results as OpenTDBResult[];
}

async function main() {
  const outPath = path.join(__dirname, "..", "..", "questions.json");
  const existing = fs.existsSync(outPath)
    ? JSON.parse(fs.readFileSync(outPath, "utf-8"))
    : [];
  const raw = await fetchOpenTDB(50);
  const normalized = normalize(raw);
  const merged = dedupe(existing, normalized);
  fs.writeFileSync(outPath, JSON.stringify(merged, null, 2));
  console.log(`Wrote ${merged.length} total questions to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
