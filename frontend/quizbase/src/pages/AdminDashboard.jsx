import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";

const QUESTIONS_SEED = [
  {
    id: "q-001",
    prompt: "Which planet in our solar system has the most moons?",
    category: "Science",
    difficulty: "Medium",
    correctAnswer: "Saturn",
    source: "Open Trivia Toolkit scrape",
    tags: ["astronomy", "space"],
    status: "ready",
    lastUsed: "2025-09-27T16:45:00Z",
    createdAt: "2025-09-08T09:15:00Z",
  },
  {
    id: "q-002",
    prompt: "Who composed the Four Seasons concerto?",
    category: "Entertainment",
    difficulty: "Easy",
    correctAnswer: "Antonio Vivaldi",
    source: "Classical archives scrape",
    tags: ["music", "baroque"],
    status: "ready",
    lastUsed: "2025-09-30T18:05:00Z",
    createdAt: "2025-09-10T10:00:00Z",
  },
  {
    id: "q-003",
    prompt: "The ancient city of Petra is located in which country?",
    category: "Geography",
    difficulty: "Medium",
    correctAnswer: "Jordan",
    source: "World heritage crawl",
    tags: ["landmarks", "travel"],
    status: "ready",
    lastUsed: "2025-09-26T12:30:00Z",
    createdAt: "2025-09-11T07:00:00Z",
  },
  {
    id: "q-004",
    prompt: "What is the record for the most Olympic gold medals won by a single athlete?",
    category: "Sports",
    difficulty: "Hard",
    correctAnswer: "23",
    source: "Olympic stats scraper",
    tags: ["records", "olympics"],
    status: "flagged",
    lastUsed: "2025-09-20T15:10:00Z",
    createdAt: "2025-09-05T14:20:00Z",
  },
  {
    id: "q-005",
    prompt: "In what year did the Berlin Wall fall?",
    category: "History",
    difficulty: "Easy",
    correctAnswer: "1989",
    source: "History vault scrape",
    tags: ["cold war"],
    status: "ready",
    lastUsed: "2025-09-25T19:40:00Z",
    createdAt: "2025-09-09T11:50:00Z",
  },
  {
    id: "q-006",
    prompt: "What is the capital city of New Zealand?",
    category: "Geography",
    difficulty: "Easy",
    correctAnswer: "Wellington",
    source: "OpenGeo dataset",
    tags: ["capitals"],
    status: "draft",
    lastUsed: "",
    createdAt: "2025-09-22T06:35:00Z",
  },
  {
    id: "q-007",
    prompt: "Which scientist proposed the three laws of motion?",
    category: "Science",
    difficulty: "Easy",
    correctAnswer: "Isaac Newton",
    source: "STEM weekly scrape",
    tags: ["physics"],
    status: "ready",
    lastUsed: "2025-09-29T09:10:00Z",
    createdAt: "2025-09-03T08:05:00Z",
  },
  {
    id: "q-008",
    prompt: "Which film won the Academy Award for Best Picture in 2024?",
    category: "Entertainment",
    difficulty: "Medium",
    correctAnswer: "Oppenheimer",
    source: "Awards aggregator",
    tags: ["oscars", "film"],
    status: "ready",
    lastUsed: "2025-09-24T22:00:00Z",
    createdAt: "2025-09-12T16:00:00Z",
  },
];

const CATEGORIES_SEED = [
  { id: "cat-general", name: "General Knowledge", description: "Cross-category mixed trivia", active: true },
  { id: "cat-science", name: "Science", description: "Physics, chemistry, and biology", active: true },
  { id: "cat-entertainment", name: "Entertainment", description: "Movies, music, and pop culture", active: true },
  { id: "cat-geography", name: "Geography", description: "Countries, capitals, and landmarks", active: true },
  { id: "cat-sports", name: "Sports", description: "Teams, records, and rules", active: true },
  { id: "cat-history", name: "History", description: "Events, leaders, and timelines", active: true },
  { id: "cat-night", name: "Late Night", description: "Experimental scrape awaiting QA", active: false },
];

const nowIso = () => new Date().toISOString();

const MATCHES_SEED = [
  {
    id: "match-emerald",
    title: "Campus Clash",
    status: "Live",
    host: "atlas",
    scheduledFor: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    round: 2,
    totalRounds: 4,
    categories: ["Science", "History", "Sports"],
    players: [
      {
        id: "u-001",
        username: "Atlas",
        score: 820,
        correct: 12,
        streak: 3,
        isReady: true,
        lastSeen: new Date(Date.now() - 5_000).toISOString(),
      },
      {
        id: "u-002",
        username: "Nova",
        score: 780,
        correct: 11,
        streak: 1,
        isReady: true,
        lastSeen: new Date(Date.now() - 16_000).toISOString(),
      },
      {
        id: "u-003",
        username: "Echo",
        score: 640,
        correct: 9,
        streak: 0,
        isReady: false,
        lastSeen: new Date(Date.now() - 68_000).toISOString(),
      },
    ],
  },
  {
    id: "match-apollo",
    title: "Faculty Face-off",
    status: "Scheduled",
    host: "luna",
    scheduledFor: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    startedAt: "",
    round: 0,
    totalRounds: 4,
    categories: ["General Knowledge", "Geography", "Entertainment"],
    players: [
      {
        id: "u-004",
        username: "Luna",
        score: 0,
        correct: 0,
        streak: 0,
        isReady: true,
        lastSeen: new Date(Date.now() - 12_000).toISOString(),
      },
      {
        id: "u-005",
        username: "Cipher",
        score: 0,
        correct: 0,
        streak: 0,
        isReady: false,
        lastSeen: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      },
    ],
  },
];
const PRESENCE_THRESHOLD_MS = 45_000;
const QUESTION_STATUSES = ["ready", "flagged", "draft"];

const classNames = (...values) => values.filter(Boolean).join(" ");

const formatDateTime = (isoString) => {
  if (!isoString) {
    return "Never";
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleString();
};

const formatRelativeTime = (isoString, nowMs) => {
  if (!isoString) {
    return "no signal";
  }
  const timestamp = new Date(isoString).getTime();
  if (Number.isNaN(timestamp)) {
    return "no signal";
  }
  const deltaSeconds = Math.max(0, Math.round((nowMs - timestamp) / 1000));
  if (deltaSeconds < 60) {
    return `${deltaSeconds}s ago`;
  }
  if (deltaSeconds < 60 * 60) {
    const minutes = Math.floor(deltaSeconds / 60);
    return `${minutes}m ago`;
  }
  const hours = Math.floor(deltaSeconds / 3600);
  return `${hours}h ago`;
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState(() => QUESTIONS_SEED);
  const [categories, setCategories] = useState(() => CATEGORIES_SEED);
  const [matches, setMatches] = useState(() => MATCHES_SEED);
  const [questionSearch, setQuestionSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [questionDraft, setQuestionDraft] = useState(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryDraftName, setCategoryDraftName] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const timer = window.setInterval(() => setNowMs(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  const categoryOptions = useMemo(
    () => ["all", ...categories.map((category) => category.name)],
    [categories]
  );

  const difficultyOptions = useMemo(
    () => ["all", ...Array.from(new Set(questions.map((question) => question.difficulty)))],
    [questions]
  );

  const filteredQuestions = useMemo(() => {
    const term = questionSearch.trim().toLowerCase();
    return questions
      .filter((question) => {
        const matchesTerm = term
          ? question.prompt.toLowerCase().includes(term) ||
            question.correctAnswer.toLowerCase().includes(term) ||
            question.tags.some((tag) => tag.toLowerCase().includes(term))
          : true;
        const matchesCategory =
          selectedCategory === "all" || question.category === selectedCategory;
        const matchesDifficulty =
          selectedDifficulty === "all" || question.difficulty === selectedDifficulty;
        return matchesTerm && matchesCategory && matchesDifficulty;
      })
      .sort((a, b) => {
        const aTime = new Date(a.lastUpdated ?? a.lastUsed ?? a.createdAt).getTime();
        const bTime = new Date(b.lastUpdated ?? b.lastUsed ?? b.createdAt).getTime();
        return bTime - aTime;
      });
  }, [questions, questionSearch, selectedCategory, selectedDifficulty]);

  const questionStats = useMemo(() => {
    const flagged = questions.filter((question) => question.status === "flagged").length;
    const drafts = questions.filter((question) => question.status === "draft").length;
    const byCategory = questions.reduce((accumulator, question) => {
      accumulator[question.category] = (accumulator[question.category] ?? 0) + 1;
      return accumulator;
    }, {});
    return { flagged, drafts, byCategory };
  }, [questions]);

  const categoryQuestionCounts = useMemo(() => {
    const mapping = new Map();
    questions.forEach((question) => {
      mapping.set(question.category, (mapping.get(question.category) ?? 0) + 1);
    });
    return mapping;
  }, [questions]);

  const filteredCategories = useMemo(() => {
    const term = categorySearch.trim().toLowerCase();
    if (!term) {
      return categories;
    }
    return categories.filter(
      (category) =>
        category.name.toLowerCase().includes(term) ||
        category.description.toLowerCase().includes(term)
    );
  }, [categories, categorySearch]);

  const liveMatchCount = useMemo(
    () => matches.filter((match) => match.status === "Live").length,
    [matches]
  );
  const scheduledMatchCount = useMemo(
    () => matches.filter((match) => match.status === "Scheduled").length,
    [matches]
  );
  const onlinePlayers = useMemo(
    () =>
      matches.reduce((accumulator, match) => {
        return (
          accumulator +
          match.players.filter((player) => {
            const lastSeen = new Date(player.lastSeen).getTime();
            return !Number.isNaN(lastSeen) && nowMs - lastSeen <= PRESENCE_THRESHOLD_MS;
          }).length
        );
      }, 0),
    [matches, nowMs]
  );

  const startEditingQuestion = (question) => {
    setEditingQuestionId(question.id);
    setQuestionDraft({
      id: question.id,
      prompt: question.prompt,
      correctAnswer: question.correctAnswer,
      category: question.category,
      difficulty: question.difficulty,
      status: question.status,
      tags: question.tags.join(", "),
      source: question.source,
    });
  };

  const resetQuestionEditor = () => {
    setEditingQuestionId(null);
    setQuestionDraft(null);
  };

  const handleQuestionDelete = (questionId) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Delete this question from the bank?");
      if (!confirmed) {
        return;
      }
    }
    setQuestions((previous) => previous.filter((question) => question.id !== questionId));
    if (editingQuestionId === questionId) {
      resetQuestionEditor();
    }
  };

  const handleQuestionSave = (event) => {
    event.preventDefault();
    if (!questionDraft) {
      return;
    }
    const trimmedPrompt = questionDraft.prompt.trim();
    const trimmedAnswer = questionDraft.correctAnswer.trim();
    const trimmedCategory = questionDraft.category.trim();
    if (!trimmedPrompt || !trimmedAnswer || !trimmedCategory) {
      return;
    }
    const normalizedTags = questionDraft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const timestamp = nowIso();
    setQuestions((previous) =>
      previous.map((question) => {
        if (question.id !== questionDraft.id) {
          return question;
        }
        return {
          ...question,
          prompt: trimmedPrompt,
          correctAnswer: trimmedAnswer,
          category: trimmedCategory,
          difficulty: questionDraft.difficulty,
          status: questionDraft.status,
          source: questionDraft.source.trim(),
          tags: normalizedTags,
          lastUpdated: timestamp,
        };
      })
    );
    const categoryExists = categories.some(
      (category) => category.name.toLowerCase() === trimmedCategory.toLowerCase()
    );
    if (!categoryExists) {
      setCategories((previous) => [
        ...previous,
        {
          id: `cat-${Date.now()}`,
          name: trimmedCategory,
          description: "Added from question editor",
          active: true,
        },
      ]);
    }
    resetQuestionEditor();
  };

  const handleQuestionDraftChange = (field, value) => {
    setQuestionDraft((previous) => {
      if (!previous) {
        return previous;
      }
      return { ...previous, [field]: value };
    });
  };

  const handleAddCategory = (event) => {
    event.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      return;
    }
    const exists = categories.some(
      (category) => category.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setNewCategoryName("");
      return;
    }
    setCategories((previous) => [
      ...previous,
      {
        id: `cat-${Date.now()}`,
        name: trimmed,
        description: "Custom category",
        active: true,
      },
    ]);
    setNewCategoryName("");
  };

  const toggleCategoryActive = (categoryId) => {
    setCategories((previous) =>
      previous.map((category) =>
        category.id === categoryId ? { ...category, active: !category.active } : category
      )
    );
  };

  const startEditingCategory = (category) => {
    setEditingCategoryId(category.id);
    setCategoryDraftName(category.name);
  };

  const saveCategoryRename = (categoryId) => {
    const trimmed = categoryDraftName.trim();
    if (!trimmed) {
      return;
    }
    setCategories((previous) => {
      const duplicate = previous.some(
        (category) => category.id !== categoryId && category.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (duplicate) {
        return previous;
      }
      const current = previous.find((category) => category.id === categoryId);
      if (!current || current.name === trimmed) {
        return previous;
      }
      setQuestions((questionState) =>
        questionState.map((question) =>
          question.category === current.name ? { ...question, category: trimmed } : question
        )
      );
      return previous.map((category) =>
        category.id === categoryId ? { ...category, name: trimmed } : category
      );
    });
    setEditingCategoryId(null);
    setCategoryDraftName("");
  };

  const cancelCategoryEdit = () => {
    setEditingCategoryId(null);
    setCategoryDraftName("");
  };

  const handleRemovePlayer = (matchId, playerId) => {
    setMatches((previous) =>
      previous.map((match) => {
        if (match.id !== matchId) {
          return match;
        }
        const remainingPlayers = match.players.filter((player) => player.id !== playerId);
        const updatedStatus =
          remainingPlayers.length === 0 && match.status === "Live" ? "Pending" : match.status;
        return { ...match, players: remainingPlayers, status: updatedStatus };
      })
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 text-content">
      <header className="space-y-2">
        <p className="text-sm text-content-muted">Signed in as @{user?.username ?? "admin"}</p>
        <h1 className="text-3xl font-bold">Admin control center</h1>
        <p className="max-w-3xl text-sm text-content-subtle">
          Monitor the live tournament state, curate the scraped trivia bank, and keep categories
          organised for upcoming matches.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-content-muted">Questions</p>
          <p className="mt-2 text-2xl font-semibold">{questions.length}</p>
          <p className="text-xs text-accent-warning">{questionStats.flagged} flagged for review</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-content-muted">Draft pool</p>
          <p className="mt-2 text-2xl font-semibold">{questionStats.drafts}</p>
          <p className="text-xs text-content-muted">Awaiting validation before going live</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-content-muted">Live matches</p>
          <p className="mt-2 text-2xl font-semibold">{liveMatchCount}</p>
          <p className="text-xs text-content-muted">{scheduledMatchCount} starting soon</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-content-muted">Players online</p>
          <p className="mt-2 text-2xl font-semibold">{onlinePlayers}</p>
          <p className="text-xs text-content-muted">Active within the last 45 seconds</p>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <header className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-xl font-semibold">Question bank</h2>
            <p className="text-sm text-content-muted">
              Search, filter, and moderate the scraped questions before they reach players.
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <input
              className="w-48 rounded border border-border px-3 py-2 text-sm"
              placeholder="Search question or answer"
              value={questionSearch}
              onChange={(event) => setQuestionSearch(event.target.value)}
            />
            <select
              className="rounded border border-border px-3 py-2 text-sm"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All categories" : option}
                </option>
              ))}
            </select>
            <select
              className="rounded border border-border px-3 py-2 text-sm"
              value={selectedDifficulty}
              onChange={(event) => setSelectedDifficulty(event.target.value)}
            >
              {difficultyOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All difficulties" : option}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-content-muted">
              <tr>
                <th className="py-2 pr-3 font-medium">Question</th>
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 font-medium">Difficulty</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Last used</th>
                <th className="py-2 pr-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.map((question) => (
                <tr key={question.id} className="border-b border-border/60">
                  <td className="py-3 pr-3 align-top">
                    <p className="font-medium">{question.prompt}</p>
                    <p className="text-xs text-content-muted">Answer: {question.correctAnswer}</p>
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px] uppercase tracking-wide text-content-subtle">
                      <span className="rounded border border-border px-1 py-0.5">{question.source}</span>
                      {question.tags.map((tag) => (
                        <span key={tag} className="rounded border border-border px-1 py-0.5">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pr-3 align-top">{question.category}</td>
                  <td className="py-3 pr-3 align-top">{question.difficulty}</td>
                  <td className="py-3 pr-3 align-top">
                    <span
                      className={classNames(
                        "rounded-full border px-2 py-0.5 text-xs font-medium",
                        question.status === "ready" && "border-accent-success text-accent-success",
                        question.status === "flagged" && "border-accent-warning text-accent-warning",
                        question.status === "draft" && "border-border text-content-muted"
                      )}
                    >
                      {question.status}
                    </span>
                  </td>
                  <td className="py-3 pr-3 align-top text-sm text-content-muted">
                    {question.lastUsed ? formatDateTime(question.lastUsed) : "Never"}
                  </td>
                  <td className="py-3 pr-0 align-top text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEditingQuestion(question)}
                        className="rounded border border-border px-2 py-1 text-xs text-content-muted transition hover:border-brand-500 hover:text-brand-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuestionDelete(question.id)}
                        className="rounded border border-border px-2 py-1 text-xs text-accent-danger transition hover:border-accent-danger"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredQuestions.length === 0 && (
          <div className="mt-4 rounded border border-border bg-surface-subdued p-4 text-sm text-content-muted">
            No questions match the current filters.
          </div>
        )}

        {questionDraft && (
          <div className="mt-6 rounded-md border border-brand-500 bg-surface-subdued p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Edit question</h3>
                <p className="text-sm text-content-muted">
                  Update the question copy, answers, metadata, and availability state.
                </p>
              </div>
              <button
                type="button"
                onClick={resetQuestionEditor}
                className="rounded border border-border px-2 py-1 text-xs text-content-muted hover:text-accent-danger"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleQuestionSave} className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="text-xs uppercase text-content-muted">Prompt</span>
                <textarea
                  className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
                  rows={3}
                  value={questionDraft.prompt}
                  onChange={(event) => handleQuestionDraftChange("prompt", event.target.value)}
                  required
                />
              </label>
              <label>
                <span className="text-xs uppercase text-content-muted">Correct answer</span>
                <input
                  className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
                  value={questionDraft.correctAnswer}
                  onChange={(event) => handleQuestionDraftChange("correctAnswer", event.target.value)}
                  required
                />
              </label>
              <label>
                <span className="text-xs uppercase text-content-muted">Category</span>
                <input
                  className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
                  value={questionDraft.category}
                  onChange={(event) => handleQuestionDraftChange("category", event.target.value)}
                  required
                />
              </label>
              <label>
                <span className="text-xs uppercase text-content-muted">Difficulty</span>
                <select
                  className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
                  value={questionDraft.difficulty}
                  onChange={(event) => handleQuestionDraftChange("difficulty", event.target.value)}
                  required
                >
                  {["Easy", "Medium", "Hard"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-xs uppercase text-content-muted">Status</span>
                <select
                  className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
                  value={questionDraft.status}
                  onChange={(event) => handleQuestionDraftChange("status", event.target.value)}
                >
                  {QUESTION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="md:col-span-2">
                <span className="text-xs uppercase text-content-muted">Tags (comma separated)</span>
                <input
                  className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
                  value={questionDraft.tags}
                  onChange={(event) => handleQuestionDraftChange("tags", event.target.value)}
                />
              </label>
              <label className="md:col-span-2">
                <span className="text-xs uppercase text-content-muted">Source reference</span>
                <input
                  className="mt-1 w-full rounded border border-border px-3 py-2 text-sm"
                  value={questionDraft.source}
                  onChange={(event) => handleQuestionDraftChange("source", event.target.value)}
                />
              </label>
              <div className="md:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetQuestionEditor}
                  className="rounded border border-border px-3 py-2 text-sm text-content-muted hover:text-accent-danger"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-brand-500 px-4 py-2 text-sm font-medium text-content-inverted transition hover:bg-brand-600"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <header className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-xl font-semibold">Categories</h2>
            <p className="text-sm text-content-muted">
              Keep the taxonomy clean so hosts can assemble balanced matches.
            </p>
          </div>
          <div className="ml-auto">
            <input
              className="w-48 rounded border border-border px-3 py-2 text-sm"
              placeholder="Search categories"
              value={categorySearch}
              onChange={(event) => setCategorySearch(event.target.value)}
            />
          </div>
        </header>

        <form onSubmit={handleAddCategory} className="mt-4 flex flex-wrap gap-2">
          <input
            className="w-full flex-1 rounded border border-border px-3 py-2 text-sm md:w-auto"
            placeholder="Add new category"
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
          />
          <button
            type="submit"
            className="rounded bg-brand-500 px-4 py-2 text-sm font-medium text-content-inverted transition hover:bg-brand-600"
          >
            Add category
          </button>
        </form>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {filteredCategories.map((category) => {
            const questionCount = categoryQuestionCounts.get(category.name) ?? 0;
            return (
              <div key={category.id} className="rounded-md border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{category.name}</h3>
                    <p className="text-sm text-content-muted">{category.description}</p>
                  </div>
                  <span
                    className={classNames(
                      "rounded-full border px-2 py-0.5 text-xs font-medium",
                      category.active ? "border-accent-success text-accent-success" : "border-border text-content-muted"
                    )}
                  >
                    {category.active ? "Active" : "Hidden"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-content-muted">
                  <span>{questionCount} questions mapped</span>
                  <span>{questionStats.byCategory[category.name] ? "In question bank" : "No linked questions"}</span>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  {editingCategoryId === category.id ? (
                    <form
                      className="flex flex-wrap gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        saveCategoryRename(category.id);
                      }}
                    >
                      <input
                        className="w-full flex-1 rounded border border-border px-3 py-2 text-sm"
                        value={categoryDraftName}
                        onChange={(event) => setCategoryDraftName(event.target.value)}
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="rounded bg-brand-500 px-4 py-2 text-sm font-medium text-content-inverted transition hover:bg-brand-600"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelCategoryEdit}
                        className="rounded border border-border px-3 py-2 text-sm text-content-muted hover:text-accent-danger"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCategoryActive(category.id)}
                        className="rounded border border-border px-3 py-2 text-sm text-content-muted transition hover:border-brand-500 hover:text-brand-600"
                      >
                        {category.active ? "Hide from hosts" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditingCategory(category)}
                        className="rounded border border-border px-3 py-2 text-sm text-content-muted transition hover:border-brand-500 hover:text-brand-600"
                      >
                        Rename
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredCategories.length === 0 && (
          <div className="mt-4 rounded border border-border bg-surface-subdued p-4 text-sm text-content-muted">
            No categories match the search term.
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <header className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-xl font-semibold">Match operations</h2>
            <p className="text-sm text-content-muted">
              Track real-time presence, clean up lobbies, and keep rounds flowing smoothly.
            </p>
          </div>
        </header>

        <div className="mt-4 space-y-4">
          {matches.map((match) => {
            const statusClass =
              match.status === "Live"
                ? "border-accent-success text-accent-success"
                : match.status === "Scheduled"
                ? "border-brand-500 text-brand-600"
                : "border-border text-content-muted";
            return (
              <div key={match.id} className="rounded-md border border-border p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{match.title}</h3>
                    <p className="text-sm text-content-muted">
                    <p className="text-sm text-content-muted">Host @{match.host} - {match.categories.join(", ")} - Round {match.round}/{match.totalRounds || 4}</p>
                    </p>
                    <p className="text-xs uppercase text-content-subtle">
                      {match.status === "Live"
                        ? `Started ${formatRelativeTime(match.startedAt || match.scheduledFor, nowMs)}`
                        : match.status === "Scheduled"
                        ? `Starts ${formatDateTime(match.scheduledFor)}`
                        : "Awaiting players"}
                    </p>
                  </div>
                  <span className={classNames("rounded-full border px-2 py-0.5 text-xs font-medium", statusClass)}>
                    {match.status}
                  </span>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-border text-xs uppercase text-content-muted">
                      <tr>
                        <th className="py-2 pr-3 font-medium">Player</th>
                        <th className="py-2 pr-3 font-medium">Score</th>
                        <th className="py-2 pr-3 font-medium">Correct</th>
                        <th className="py-2 pr-3 font-medium">Presence</th>
                        <th className="py-2 pr-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {match.players.map((player) => {
                        const lastSeen = new Date(player.lastSeen).getTime();
                        const isPresent =
                          !Number.isNaN(lastSeen) && nowMs - lastSeen <= PRESENCE_THRESHOLD_MS;
                        return (
                          <tr key={player.id} className="border-b border-border/60">
                            <td className="py-2 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{player.username}</span>
                                <span
                                  className={classNames(
                                    "rounded-full border px-2 py-0.5 text-xs",
                                    player.isReady
                                      ? "border-accent-success text-accent-success"
                                      : "border-border text-content-muted"
                                  )}
                                >
                                  {player.isReady ? "Ready" : "Waiting"}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 pr-3">{player.score}</td>
                            <td className="py-2 pr-3 text-content-muted">{player.correct}</td>
                            <td className="py-2 pr-3">
                              <div className="space-y-1">
                                <span
                                  className={classNames(
                                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                                    isPresent
                                      ? "border-accent-success text-accent-success"
                                      : "border-accent-warning text-accent-warning"
                                  )}
                                >
                                  <span
                                    className={classNames(
                                      "h-1.5 w-1.5 rounded-full",
                                      isPresent ? "bg-accent-success" : "bg-accent-warning"
                                    )}
                                  />
                                  {isPresent ? "Active" : "Idle"}
                                </span>
                                <p className="text-xs text-content-muted">
                                  {formatRelativeTime(player.lastSeen, nowMs)}
                                </p>
                              </div>
                            </td>
                            <td className="py-2 pr-0 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemovePlayer(match.id, player.id)}
                                className="rounded border border-border px-2 py-1 text-xs text-content-muted transition hover:border-accent-danger hover:text-accent-danger"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {match.players.length === 0 && (
                  <div className="mt-3 rounded border border-border bg-surface-subdued p-3 text-sm text-content-muted">
                    No players remain in this lobby.
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {matches.length === 0 && (
          <div className="rounded border border-border bg-surface-subdued p-4 text-sm text-content-muted">
            No matches are being tracked yet.
          </div>
        )}
      </section>
    </div>
  );
}
