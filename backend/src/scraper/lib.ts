import crypto from "crypto";

export type OpenTDBResult = {
  category: string;
  type: "multiple" | "boolean";
  difficulty: "easy" | "medium" | "hard";
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
};

export function normalize(results: OpenTDBResult[]) {
  return results.map((r) => {
    const choices = [...r.incorrect_answers, r.correct_answer];
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    const correctAnswerIndex = choices.indexOf(r.correct_answer);
    const contentKey = JSON.stringify({
      q: r.question,
      a: r.correct_answer,
      i: r.incorrect_answers,
      c: r.category,
      d: r.difficulty,
    });
    const contentHash = crypto.createHash("sha1").update(contentKey).digest("hex");
    return {
      id: `opentdb:${contentHash}`,
      text: r.question,
      choices,
      correctAnswer: r.correct_answer,
      correctAnswerIndex,
      category: r.category,
      difficulty: r.difficulty,
      source: "opentdb",
      contentHash,
    };
  });
}

export function dedupe<T extends { id: string }>(existing: T[], incoming: T[]) {
  const seen = new Set(existing.map((q) => q.id));
  const out = existing.slice();
  for (const q of incoming) {
    if (!seen.has(q.id)) {
      out.push(q);
      seen.add(q.id);
    }
  }
  return out;
}

