/**
 * Trivia Question Fetcher & Upserter
 * -----------------------------------
 * This script retrieves multiple-choice trivia questions from the Open Trivia DB (OpenTDB),
 * merges them with any existing questions, and synchronizes everything with the local
 * PostgreSQL database via Prisma.
 *
 * Core steps:
 * 1. Fetch new questions from OpenTDB using Axios.
 * 2. Normalize and deduplicate results against questions.json.
 * 3. Write the merged dataset back to questions.json.
 * 4. Upsert questions and related answers into the database for runtime use.
 *
 * This script is typically run as a one-off population tool, allowing the app to have
 * a ready-to-use local set of trivia questions and categories.
 *
 * Dependencies:
 * - axios: for API requests to OpenTDB
 * - fs & path: for local file operations
 * - prisma: for database persistence
 * - normalize & dedupe: helper functions that clean and combine question data
 */

import axios from "axios";
import fs from "fs";
import path from "path";
import { dedupe, normalize, OpenTDBResult } from "./lib";
import { prisma } from "../config/database";

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

  // Minimal DB upsert so runtime can read from DB
  let created = 0;
  let updated = 0;
  for (const q of merged) {
    try {
      const catName = (q.category || "General").trim() || "General";
      const category = await prisma.category.upsert({
        where: { name: catName },
        update: {},
        create: { name: catName },
      });

      const difficulty = (q.difficulty || "medium").toString().toUpperCase() as any;
      const source = q.source || null;

      const existingQ = await prisma.question.findFirst({
        where: {
          text: q.text,
          categoryId: category.id,
          source,
          difficulty,
        },
      });

      let questionId: string;
      if (existingQ) {
        questionId = existingQ.id;
        updated += 1;
        await prisma.answer.deleteMany({ where: { questionId } });
      } else {
        const createdQ = await prisma.question.create({
          data: {
            text: q.text,
            categoryId: category.id,
            difficulty,
            source,
          },
        });
        questionId = createdQ.id;
        created += 1;
      }

      const answers = q.choices.map((text, idx) => ({
        questionId,
        text,
        isCorrect: idx === q.correctAnswerIndex,
      }));
      if (answers.length) {
        await prisma.answer.createMany({ data: answers });
      }
    } catch (e) {
      console.error("Failed to upsert question:", q.text.slice(0, 60), e);
    }
  }
  console.log(`DB upsert complete: ${created} created, ${updated} updated.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
