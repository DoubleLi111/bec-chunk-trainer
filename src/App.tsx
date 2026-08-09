"use client";

import { useEffect, useMemo, useState } from "react";

type Chunk = {
  id: number;
  english: string;
  chinese: string;
  note: string;
  example: string;
  audioText?: string;
};

type Unit = {
  id: string;
  category: string;
  name: string;
  section: string;
  chunks: Chunk[];
  sentences: Sentence[];
  sourceUrl?: string;
  dialogueSummary?: DialogueTurn[];
  scenario: Scenario;
};

type Book = {
  id: string;
  name: string;
  units: Unit[];
};

type Progress = Record<number, { correct: number; wrong: number }>;

type ActivityTab = "learn" | "quiz" | "build";

type ActivityPicker = {
  activity: ActivityTab;
  step: "book" | "category" | "unit";
  bookId: string;
  category: string;
};

type Sentence = {
  chinese: string;
  parts: string[];
};

type DialogueTurn = {
  speaker: string;
  text: string;
  highlights: string[];
};

type Scenario = {
  label: string;
  question: string;
  prompt: string;
  placeholder: string;
  reference: string;
};

type DailyModeProgress = {
  pending: number[];
  review: number[];
  done: number[];
};

type DailyPracticeEntry = {
  quiz?: DailyModeProgress;
  build?: DailyModeProgress;
};

type DailyPractice = Record<string, DailyPracticeEntry>;

const unit2Sentences: Sentence[] = [
  {
    chinese: "这是一份工作时间固定的朝九晚五的工作。",
    parts: ["It’s", "a nine-to-five job", "with", "regular working hours."],
  },
  {
    chinese: "我需要使用门禁卡进入办公室。",
    parts: ["I need", "my swipe card", "to", "get into the office."],
  },
  {
    chinese: "我喜欢能在不过晚的时间下班回家。",
    parts: ["I like", "to be able to", "go home", "at a reasonable time."],
  },
  {
    chinese: "我们公司实行弹性工作制。",
    parts: ["There’s", "a system of flexitime", "in", "my company."],
  },
  {
    chinese: "我们可以在一定限制范围内按自己的意愿安排工作时间。",
    parts: ["We can work", "when we want", "within", "certain limits."],
  },
  {
    chinese: "只要每月完成足够工时，我们最早可以三点下班。",
    parts: ["We can finish", "as early as three", "as long as", "we do enough hours each month."],
  },
];

const initialScramble = [2, 0, 3, 1];

const unit2Chunks: Chunk[] = [
  {
    id: 1,
    english: "an office worker",
    chinese: "一名办公室职员",
    note: "强调工作环境，不是具体职位。",
    example: "I’m an office worker in an insurance company.",
  },
  {
    id: 2,
    english: "work in an insurance company",
    chinese: "在一家保险公司工作",
    note: "也可以说 work for an insurance company。",
    example: "I work in an insurance company in the city centre.",
  },
  {
    id: 3,
    english: "a nine-to-five job",
    chinese: "一份朝九晚五的工作",
    note: "nine-to-five 作定语时用连字符连接。",
    example: "It’s a nine-to-five job with regular working hours.",
  },
  {
    id: 4,
    english: "regular working hours",
    chinese: "固定、规律的工作时间",
    note: "反义表达：irregular working hours。",
    example: "Regular working hours make it easier to plan my day.",
  },
  {
    id: 5,
    english: "get into the office",
    chinese: "进入办公室",
    note: "get into 强调成功进入某个空间。",
    example: "I need my swipe card to get into the office.",
  },
  {
    id: 6,
    english: "use a swipe card",
    chinese: "使用门禁卡",
    note: "swipe 作动词时表示刷卡。",
    example: "Employees use a swipe card at the entrance.",
  },
  {
    id: 7,
    english: "clock in / clock out",
    chinese: "打卡上班／打卡下班",
    note: "英美商务英语中都很常用。",
    example: "We clock in at nine and clock out at five.",
  },
  {
    id: 8,
    english: "go home at a reasonable time",
    chinese: "在不过晚的时间下班回家",
    note: "在工作语境中，reasonable 暗含“不至于太晚”。",
    example: "I like to be able to go home at a reasonable time.",
  },
  {
    id: 9,
    english: "have flexitime",
    chinese: "实行／享有弹性工作制",
    note: "英式 flexitime；美式 flextime。",
    example: "We have flexitime, so I can start work at eight or ten.",
  },
  {
    id: 10,
    english: "be in computer programming",
    chinese: "从事计算机编程",
    note: "be in + 行业或领域，表示从事该领域的工作。",
    example: "I’m in computer programming.",
  },
  {
    id: 11,
    english: "a system of flexitime",
    chinese: "一套弹性工作制度",
    note: "flexitime 是英式拼法；美式英语常写作 flextime。",
    example: "There’s a system of flexitime in my company.",
  },
  {
    id: 12,
    english: "within certain limits",
    chinese: "在一定限制范围内",
    note: "within 强调没有超出规定的范围。",
    example: "We can work when we want, within certain limits.",
  },
  {
    id: 13,
    english: "at any time",
    chinese: "在任何时候",
    note: "常和 start、call、contact 等动词搭配。",
    example: "We can start at any time till eleven.",
  },
  {
    id: 14,
    english: "as early as + time",
    chinese: "最早在……",
    note: "用来强调某个时间比通常预期的更早。",
    example: "We can finish as early as three.",
    audioText: "as early as three",
  },
  {
    id: 15,
    english: "as long as + clause",
    chinese: "只要……",
    note: "引出必须满足的条件，后面接完整句子。",
    example: "You can leave early as long as you do enough hours.",
    audioText: "as long as we do enough hours",
  },
  {
    id: 16,
    english: "do enough hours",
    chinese: "完成足够工时",
    note: "英式职场表达，指达到规定的工作时数。",
    example: "We need to do enough hours each month.",
  },
  {
    id: 17,
    english: "be ideal for somebody",
    chinese: "对某人来说很理想",
    note: "ideal for 后面可以接人、用途或具体情境。",
    example: "Flexitime is ideal for parents with young children.",
    audioText: "be ideal for somebody",
  },
  {
    id: 18,
    english: "young children",
    chinese: "年幼的孩子",
    note: "young children 指年龄较小、仍需要较多照顾的孩子。",
    example: "I have two young children.",
  },
];

const footballIdiomsChunks: Chunk[] = [
  {
    id: 101,
    english: "kick an idea around",
    chinese: "反复考虑、与人讨论一个想法",
    note: "表示暂时讨论和考虑，还没有正式作出决定。",
    example: "We’ve been kicking the expansion idea around for a few weeks.",
  },
  {
    id: 102,
    english: "come out of left field",
    chinese: "突然出现，出人意料",
    note: "源自棒球，常形容消息、决定或提议令人意外。",
    example: "The director’s resignation came out of left field.",
  },
  {
    id: 103,
    english: "play it safe",
    chinese: "采取保守做法，避免冒险",
    note: "强调选择风险较低、变化较小的方案。",
    example: "We decided to play it safe and keep the original launch date.",
  },
  {
    id: 104,
    english: "sit on the sidelines",
    chinese: "处于边缘位置，不积极参与",
    note: "也可以说 stay 或 stand on the sidelines。",
    example: "I don’t want to sit on the sidelines while others lead the project.",
  },
  {
    id: 105,
    english: "kick something into touch",
    chinese: "停止或取消某个方案",
    note: "偏英式表达；在美式英语环境中可能不够常见。",
    example: "The proposal was too costly, so management kicked it into touch.",
  },
  {
    id: 106,
    english: "be in the same league as somebody",
    chinese: "与某人处于同一水平",
    note: "常用于比较个人、团队或公司的能力与实力。",
    example: "Our small agency isn’t yet in the same league as the market leaders.",
    audioText: "be in the same league as someone",
  },
  {
    id: 107,
    english: "be second division",
    chinese: "属于二流水平，不是最优秀的",
    note: "带有负面评价，使用时要注意语气。",
    example: "The firm may be small, but it is certainly not second division.",
  },
  {
    id: 108,
    english: "move the goalposts",
    chinese: "随意改变要求或成功标准",
    note: "常用于批评对方在过程中不断改变规则或目标。",
    example: "The client keeps moving the goalposts by adding new requirements.",
  },
  {
    id: 109,
    english: "a level playing field",
    chinese: "公平竞争的环境",
    note: "表示所有参与者拥有相近的信息、机会和规则条件。",
    example: "Clear evaluation criteria will create a level playing field.",
  },
  {
    id: 110,
    english: "know the score",
    chinese: "了解真实情况，知道内情",
    note: "表示清楚实际规则、风险或事情的真相。",
    example: "Ask Maya about the negotiations—she knows the score.",
  },
  {
    id: 111,
    english: "carry the ball",
    chinese: "承担责任并把事情推进完成",
    note: "在商务语境中强调带头负责、确保任务落实。",
    example: "Daniel can carry the ball while the manager is away.",
  },
];

const footballIdiomsSentences: Sentence[] = [
  {
    chinese: "我们已经讨论这个扩张想法几个星期了。",
    parts: ["We’ve been", "kicking the expansion idea around", "for", "a few weeks."],
  },
  {
    chinese: "我不想采取保守做法，最后只能当旁观者。",
    parts: ["I don’t want to", "play it safe", "and end up", "sitting on the sidelines."],
  },
  {
    chinese: "我们还没有达到行业领先企业的水平。",
    parts: ["We aren’t yet", "in the same league as", "the leaders", "in our industry."],
  },
  {
    chinese: "客户不断改变要求，使竞争变得不公平。",
    parts: ["The client keeps", "moving the goalposts", "so it isn’t", "a level playing field."],
  },
  {
    chinese: "她了解实际情况，也能负责推进这个项目。",
    parts: ["She knows the score", "and", "can carry the ball", "on this project."],
  },
  {
    chinese: "这个决定完全出乎我们的意料。",
    parts: ["The decision", "came", "out of left field", "for all of us."],
  },
];

const footballDialogueSummary: DialogueTurn[] = [
  {
    speaker: "Karl",
    text: "I’ve been kicking an idea around: I may apply for a management role in the Sydney office.",
    highlights: ["kicking an idea around"],
  },
  {
    speaker: "Marilyn",
    text: "That comes out of left field. What made you consider such a big change?",
    highlights: ["comes out of left field"],
  },
  {
    speaker: "Karl",
    text: "I don’t want to play it safe and spend my career sitting on the sidelines.",
    highlights: ["play it safe", "sitting on the sidelines"],
  },
  {
    speaker: "Karl",
    text: "Still, I’m not sure I’m in the same league as the other candidates.",
    highlights: ["in the same league"],
  },
  {
    speaker: "Marilyn",
    text: "The Sydney team is strong, but managers there sometimes move the goalposts.",
    highlights: ["move the goalposts"],
  },
  {
    speaker: "Karl",
    text: "That makes it difficult to compete on a level playing field.",
    highlights: ["a level playing field"],
  },
  {
    speaker: "Marilyn",
    text: "You know the score, and you’ve shown that you can carry the ball. I think you should apply.",
    highlights: ["know the score", "carry the ball"],
  },
];

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function assertUniqueNames<T>(items: T[], getName: (item: T) => string, level: string) {
  const seen = new Set<string>();
  for (const item of items) {
    const name = normalizeName(getName(item));
    if (seen.has(name)) throw new Error(`${level}名称重复：${getName(item)}`);
    seen.add(name);
  }
}

function defineLibrary(books: Book[]) {
  assertUniqueNames(books, (book) => book.name, "书籍");
  for (const book of books) {
    const categories = [...new Set(book.units.map((unit) => unit.category))];
    assertUniqueNames(categories, (category) => category, `书籍“${book.name}”下的分类`);
    for (const category of categories) {
      const lessons = book.units.filter((unit) => normalizeName(unit.category) === normalizeName(category));
      assertUniqueNames(lessons, (unit) => unit.name, `分类“${category}”下的课程`);
    }
  }
  return books;
}

const contentLibrary = defineLibrary([
  {
    id: "business-vocabulary-in-use",
    name: "Business Vocabulary in Use",
    units: [
      {
        id: "unit-2-ways-of-working",
        category: "Unit 2",
        name: "Ways of Working",
        section: "Working hours",
        chunks: unit2Chunks,
        sentences: unit2Sentences,
        scenario: {
          label: "BEC SPEAKING · 情境输出",
          question: "What kind of working hours do you prefer?",
          prompt: "尝试使用 prefer flexitime、organize my schedule 和 work-life balance。",
          placeholder: "I prefer flexitime because...",
          reference: "I prefer flexitime because it allows me to organize my schedule more efficiently and achieve a better work-life balance.",
        },
      },
    ],
  },
  {
    id: "business-vocabulary-pod",
    name: "Business Vocabulary Pod",
    units: [
      {
        id: "vocabulary-football-idioms",
        category: "Vocabulary",
        name: "Football Idioms",
        section: "Business idioms",
        chunks: footballIdiomsChunks,
        sentences: footballIdiomsSentences,
        sourceUrl: "https://www.businessenglishpod.com/2026/06/07/bep-163c-football-idioms-1/",
        dialogueSummary: footballDialogueSummary,
        scenario: {
          label: "CAREER MOVE · 情境输出",
          question: "Would you apply for a management role in another office?",
          prompt: "说明你为什么想申请、担心什么，以及新的竞争环境是否公平。",
          placeholder: "I’ve been kicking the idea around...",
          reference: "I’ve been kicking the idea around because I don’t want to play it safe and stay on the sidelines. I may not be in the same league as every candidate, but I know the score and I’m ready to carry the ball.",
        },
      },
    ],
  },
]);

const defaultBook = contentLibrary[0];
const defaultUnit = defaultBook.units[0];
const starterChunks = defaultUnit.chunks;

const activityNames: Record<ActivityTab, string> = {
  learn: "意群卡片",
  quiz: "快速测验",
  build: "组装句子",
};

function chunkAudioText(chunk: Chunk) {
  return chunk.audioText ?? chunk.english;
}

function categoriesFor(book: Book) {
  return [...new Set(book.units.map((unit) => unit.category))];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[.,!?]/g, "")
    .replace(/\s+/g, " ");
}

function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function prepareDailyMode(saved: DailyModeProgress | undefined, itemIds: number[]): DailyModeProgress {
  if (!saved) return { pending: [...itemIds], review: [], done: [] };

  const validIds = new Set(itemIds);
  const done = [...new Set(saved.done.filter((id) => validIds.has(id)))];
  const review = [...new Set(saved.review.filter((id) => validIds.has(id) && !done.includes(id)))];
  const pending = [...new Set(saved.pending.filter((id) => validIds.has(id) && !done.includes(id) && !review.includes(id)))];
  const accountedFor = new Set([...pending, ...review, ...done]);
  itemIds.forEach((id) => {
    if (!accountedFor.has(id)) pending.push(id);
  });
  return { pending, review, done };
}

function recordDailyResult(mode: DailyModeProgress, itemId: number, isCorrect: boolean): DailyModeProgress {
  const pending = [...mode.pending];
  const review = [...mode.review];
  const done = [...mode.done];
  const isFirstPass = pending[0] === itemId;

  if (isFirstPass) pending.shift();
  else if (review[0] === itemId) review.shift();

  if (isCorrect) {
    if (!done.includes(itemId)) done.push(itemId);
  } else if (!review.includes(itemId)) {
    review.push(itemId);
  }

  return { pending, review, done };
}

export default function Home() {
  const [tab, setTab] = useState<"learn" | "quiz" | "build" | "manage">("learn");
  const [activeBookId, setActiveBookId] = useState(defaultBook.id);
  const [activeUnitId, setActiveUnitId] = useState(defaultUnit.id);
  const [libraryPicker, setLibraryPicker] = useState<"book" | "category" | "unit" | null>(null);
  const [libraryCategory, setLibraryCategory] = useState(defaultUnit.category);
  const [activityPicker, setActivityPicker] = useState<ActivityPicker | null>(null);
  const activeBook = contentLibrary.find((book) => book.id === activeBookId) ?? defaultBook;
  const activeUnit = activeBook.units.find((unit) => unit.id === activeUnitId) ?? activeBook.units[0];
  const [chunks, setChunks] = useState<Chunk[]>(starterChunks);
  const [progress, setProgress] = useState<Progress>({});
  const [dailyPractice, setDailyPractice] = useState<DailyPractice>({});
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [selectedParts, setSelectedParts] = useState<number[]>([]);
  const [sentenceFeedback, setSentenceFeedback] = useState<"correct" | "wrong" | null>(null);
  const [scenarioAnswer, setScenarioAnswer] = useState("");
  const [showReference, setShowReference] = useState(false);
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState(false);
  const [showDialogue, setShowDialogue] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedChunks = window.localStorage.getItem("bec-chunks");
    const savedProgress = window.localStorage.getItem("bec-progress");
    const savedDailyPractice = window.localStorage.getItem("bec-daily-practice");
    if (savedChunks) {
      try {
        const personalChunks = JSON.parse(savedChunks) as Chunk[];
        const officialIds = new Set(starterChunks.map((chunk) => chunk.id));
        const personalOnly = personalChunks.filter((chunk) => !officialIds.has(chunk.id));
        setChunks([...starterChunks, ...personalOnly]);
      } catch {
        setChunks(starterChunks);
      }
    }
    if (savedProgress) {
      try {
        setProgress(JSON.parse(savedProgress));
      } catch {
        setProgress({});
      }
    }
    if (savedDailyPractice) {
      try {
        setDailyPractice(JSON.parse(savedDailyPractice));
      } catch {
        setDailyPractice({});
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("bec-chunks", JSON.stringify(chunks));
    window.localStorage.setItem("bec-progress", JSON.stringify(progress));
    window.localStorage.setItem("bec-daily-practice", JSON.stringify(dailyPractice));
  }, [chunks, progress, dailyPractice, hydrated]);

  const stats = useMemo(() => {
    const attempts = Object.values(progress).reduce(
      (sum, item) => sum + item.correct + item.wrong,
      0,
    );
    const correct = Object.values(progress).reduce(
      (sum, item) => sum + item.correct,
      0,
    );
    const mastered = chunks.filter((chunk) => {
      const item = progress[chunk.id];
      return item && item.correct >= 2 && item.correct > item.wrong;
    }).length;
    return { attempts, correct, mastered };
  }, [chunks, progress]);

  const currentCard = chunks[cardIndex % chunks.length] ?? starterChunks[0];
  const dailyKey = `${localDateKey()}::${activeBook.id}::${activeUnit.id}`;
  const quizMode = prepareDailyMode(dailyPractice[dailyKey]?.quiz, chunks.map((chunk) => chunk.id));
  const buildMode = prepareDailyMode(dailyPractice[dailyKey]?.build, activeUnit.sentences.map((_, index) => index));
  const currentQuizId = quizMode.pending[0] ?? quizMode.review[0];
  const currentSentenceId = buildMode.pending[0] ?? buildMode.review[0];
  const currentQuiz = chunks.find((chunk) => chunk.id === currentQuizId);
  const currentSentence = activeUnit.sentences[currentSentenceId];
  const quizComplete = currentQuizId === undefined;
  const buildComplete = currentSentenceId === undefined;
  const quizPhase = quizMode.pending.length ? "first" : quizMode.review.length ? "review" : "done";
  const buildPhase = buildMode.pending.length ? "first" : buildMode.review.length ? "review" : "done";
  const accuracy = stats.attempts
    ? Math.round((stats.correct / stats.attempts) * 100)
    : 0;

  function nextCard() {
    window.speechSynthesis?.cancel();
    setSpeakingText(null);
    setCardIndex((value) => (value + 1) % chunks.length);
    setRevealed(false);
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) {
      setSpeechError(true);
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const britishVoice =
      voices.find((voice) => voice.lang.toLowerCase() === "en-gb" && /sonia|ryan|libby|daniel|google uk/i.test(voice.name)) ??
      voices.find((voice) => voice.lang.toLowerCase() === "en-gb") ??
      voices.find((voice) => voice.lang.toLowerCase().startsWith("en"));

    if (britishVoice) utterance.voice = britishVoice;
    utterance.lang = "en-GB";
    utterance.rate = 0.86;
    utterance.pitch = 1;
    utterance.onend = () => setSpeakingText(null);
    utterance.onerror = () => setSpeakingText(null);
    setSpeechError(false);
    setSpeakingText(text);
    synth.speak(utterance);
  }

  function checkAnswer(event: React.FormEvent) {
    event.preventDefault();
    if (!answer.trim() || feedback || !currentQuiz) return;
    const isCorrect = normalize(answer) === normalize(currentQuiz.english);
    setFeedback(isCorrect ? "correct" : "wrong");
    setProgress((current) => ({
      ...current,
      [currentQuiz.id]: {
        correct: (current[currentQuiz.id]?.correct ?? 0) + (isCorrect ? 1 : 0),
        wrong: (current[currentQuiz.id]?.wrong ?? 0) + (isCorrect ? 0 : 1),
      },
    }));
  }

  function nextQuestion() {
    if (!feedback || !currentQuiz) return;
    const isCorrect = feedback === "correct";
    setDailyPractice((current) => {
      const entry = current[dailyKey] ?? {};
      const mode = prepareDailyMode(entry.quiz, chunks.map((chunk) => chunk.id));
      return {
        ...current,
        [dailyKey]: { ...entry, quiz: recordDailyResult(mode, currentQuiz.id, isCorrect) },
      };
    });
    setAnswer("");
    setFeedback(null);
  }

  function choosePart(index: number) {
    if (selectedParts.includes(index) || sentenceFeedback) return;
    setSelectedParts((current) => [...current, index]);
  }

  function undoPart() {
    if (sentenceFeedback) return;
    setSelectedParts((current) => current.slice(0, -1));
  }

  function checkSentence() {
    if (!currentSentence) return;
    if (selectedParts.length !== currentSentence.parts.length) return;
    const isCorrect = selectedParts.every((part, index) => part === index);
    setSentenceFeedback(isCorrect ? "correct" : "wrong");
  }

  function nextSentence() {
    if (!sentenceFeedback || currentSentenceId === undefined) return;
    const isCorrect = sentenceFeedback === "correct";
    setDailyPractice((current) => {
      const entry = current[dailyKey] ?? {};
      const mode = prepareDailyMode(entry.build, activeUnit.sentences.map((_, index) => index));
      return {
        ...current,
        [dailyKey]: { ...entry, build: recordDailyResult(mode, currentSentenceId, isCorrect) },
      };
    });
    setSelectedParts([]);
    setSentenceFeedback(null);
  }

  function loadUnit(unit: Unit) {
    window.speechSynthesis?.cancel();
    setActiveUnitId(unit.id);
    setChunks(unit.chunks);
    setCardIndex(0);
    setRevealed(false);
    setAnswer("");
    setFeedback(null);
    setSelectedParts([]);
    setSentenceFeedback(null);
    setSpeakingText(null);
    setShowDialogue(false);
  }

  function chooseBook(book: Book) {
    setActiveBookId(book.id);
    loadUnit(book.units[0]);
    setLibraryCategory(book.units[0].category);
    setLibraryPicker("category");
  }

  function chooseCategory(category: string) {
    setLibraryCategory(category);
    setLibraryPicker("unit");
  }

  function chooseUnit(unit: Unit) {
    loadUnit(unit);
    setLibraryPicker(null);
  }

  function beginActivity(activity: ActivityTab) {
    setLibraryPicker(null);
    setActivityPicker({ activity, step: "book", bookId: activeBook.id, category: activeUnit.category });
  }

  function chooseActivityBook(book: Book) {
    setActivityPicker((current) => current ? { ...current, step: "category", bookId: book.id, category: categoriesFor(book)[0] } : current);
  }

  function chooseActivityCategory(category: string) {
    setActivityPicker((current) => current ? { ...current, step: "unit", category } : current);
  }

  function chooseActivityUnit(unit: Unit) {
    if (!activityPicker) return;
    const book = contentLibrary.find((item) => item.id === activityPicker.bookId) ?? defaultBook;
    setActiveBookId(book.id);
    loadUnit(unit);
    setTab(activityPicker.activity);
    setActivityPicker(null);
  }

  const pickerBook = contentLibrary.find((book) => book.id === activityPicker?.bookId) ?? activeBook;
  const pickerUnits = pickerBook.units.filter((unit) => normalizeName(unit.category) === normalizeName(activityPicker?.category ?? ""));
  const highlightedTab = activityPicker?.activity ?? tab;

  function renderDialogueText(turn: DialogueTurn) {
    const pattern = new RegExp(`(${turn.highlights.map(escapeRegExp).join("|")})`, "gi");
    const highlighted = new Set(turn.highlights.map((item) => item.toLowerCase()));
    return turn.text.split(pattern).map((part, index) => highlighted.has(part.toLowerCase()) ? <mark key={`${part}-${index}`}>{part}</mark> : part);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Doris Learning Dictionary 首页">
          <span className="brand-mark">D</span>
          <span>
            <strong>Doris Learning Dictionary</strong>
          </span>
        </a>
        <div className="streak" aria-label="今日学习状态">
          <span>◎</span> 今日已练 {stats.attempts} 题
        </div>
      </header>

      <div className="page-grid" id="top">
        <aside className="sidebar">
          <p className="eyebrow">{activeBook.name.toUpperCase()}</p>
          <nav aria-label="学习功能">
            <button className={highlightedTab === "learn" ? "active" : ""} onClick={() => beginActivity("learn")}>
              <span>01</span> 意群卡片
            </button>
            <button className={highlightedTab === "quiz" ? "active" : ""} onClick={() => beginActivity("quiz")}>
              <span>02</span> 快速测验
            </button>
            <button className={highlightedTab === "build" ? "active" : ""} onClick={() => beginActivity("build")}>
              <span>03</span> 组装句子
            </button>
            <button className={tab === "manage" && !activityPicker ? "active" : ""} onClick={() => { setActivityPicker(null); setTab("manage"); }}>
              <span>04</span> 内容清单
            </button>
          </nav>

          <div className="unit-card">
            <span>{activeUnit.category.toUpperCase()}</span>
            <strong>{activeUnit.name}</strong>
            <div className="unit-progress"><i style={{ width: `${Math.max(8, (stats.mastered / chunks.length) * 100)}%` }} /></div>
            <small>{stats.mastered} / {chunks.length} 已掌握</small>
          </div>
        </aside>

        <section className="content">
          <div className="hero-row">
            <div>
              <p className="section-kicker">{activeUnit.category.toUpperCase()} · {activeUnit.section.toUpperCase()}</p>
              {tab !== "learn" && (
                <h1>{tab === "quiz" ? "看中文，完整想起英文意群。" : tab === "build" ? "把意群放进真正的句子里。" : "每张截图，都会变成可练习的内容。"}</h1>
              )}
            </div>
            <div className="metric">
              <strong>{accuracy}%</strong>
              <span>当前正确率</span>
            </div>
          </div>

          {tab === "learn" && (
            <section className="study-stage" aria-live="polite">
              <div className="stage-meta">
                <span>CHUNK {String(cardIndex + 1).padStart(2, "0")} / {String(chunks.length).padStart(2, "0")}</span>
                <span className="level-pill">核心表达</span>
              </div>

              <button className={`flashcard ${revealed ? "revealed" : ""}`} onClick={() => setRevealed(true)}>
                <span className="card-label">中文提示</span>
                <h2>{currentCard.chinese}</h2>
                {!revealed ? (
                  <span className="reveal-hint">轻触查看英文意群 ＋</span>
                ) : (
                  <div className="answer-panel">
                    <p>{currentCard.english}</p>
                    <small>{currentCard.note}</small>
                  </div>
                )}
              </button>

              {revealed && (
                <>
                  <div className="example-line">
                    <span>EXAMPLE</span>
                    <p>{currentCard.example}</p>
                  </div>
                  <div className="audio-practice">
                    <button className={speakingText === chunkAudioText(currentCard) ? "speaking" : ""} onClick={() => speak(chunkAudioText(currentCard))} aria-label={`播放 ${currentCard.english} 的英式发音`}>
                      <span>▶</span> 意群发音
                    </button>
                    <button className={speakingText === currentCard.example ? "speaking" : ""} onClick={() => speak(currentCard.example)} aria-label="播放例句的英式发音">
                      <span>▶</span> 例句发音
                    </button>
                    <small>{speechError ? "当前浏览器暂不支持语音播放" : "自动生成 · 英式发音"}</small>
                  </div>
                </>
              )}

              <div className="card-actions">
                <button className="ghost-button" onClick={() => setRevealed(false)}>再想一次</button>
                <button className="primary-button" onClick={nextCard}>下一个意群 <span>→</span></button>
              </div>
            </section>
          )}

          {tab === "quiz" && quizComplete && (
            <section className="daily-complete" aria-live="polite">
              <span>✓ TODAY COMPLETE</span>
              <h2>今天的快速测验已经全部答对。</h2>
              <p>首轮做过的题不会再整轮重复；错题也已经全部清零，明天会自动开始新一轮。</p>
            </section>
          )}

          {tab === "quiz" && !quizComplete && currentQuiz && (
            <section className="quiz-stage" aria-live="polite">
              <div className="stage-meta">
                <span>{quizPhase === "first" ? `首轮剩余 ${quizMode.pending.length} 题` : `错题清零 · 剩余 ${quizMode.review.length} 题`}</span>
                <span className={`level-pill ${quizPhase === "review" ? "review" : ""}`}>{quizPhase === "first" ? "今日首轮" : "只练错题"}</span>
              </div>
              <div className="quiz-prompt">
                <span>请写出完整意群</span>
                <h2>{currentQuiz.chinese}</h2>
              </div>
              <form onSubmit={checkAnswer}>
                <label htmlFor="quiz-answer">你的答案</label>
                <input
                  id="quiz-answer"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Type the English chunk..."
                  autoComplete="off"
                  disabled={feedback !== null}
                />
                {!feedback ? (
                  <button className="primary-button" type="submit">检查答案 <span>↵</span></button>
                ) : (
                  <div className={`feedback ${feedback}`}>
                    <strong>{feedback === "correct" ? "答对了，很稳。" : "差一点，把这个意群整体记住。"}</strong>
                    {feedback === "wrong" && <p>正确答案：<b>{currentQuiz.english}</b></p>}
                    <button type="button" className="feedback-audio" onClick={() => speak(chunkAudioText(currentQuiz))}>▶ 听英式发音</button>
                    <button type="button" onClick={nextQuestion}>{quizMode.pending.length === 1 && feedback === "correct" && quizMode.review.length === 0 ? "完成今日测验 →" : "下一题 →"}</button>
                  </div>
                )}
              </form>
            </section>
          )}

          {tab === "build" && buildComplete && (
            <section className="daily-complete" aria-live="polite">
              <span>✓ TODAY COMPLETE</span>
              <h2>今天的组装句子已经全部完成。</h2>
              <p>系统只保留尚未答对的句子，不会重新开启整轮练习；明天会自动重置。</p>
            </section>
          )}

          {tab === "build" && !buildComplete && currentSentence && (
            <div className="build-stack">
              <section className="build-stage" aria-live="polite">
                <div className="stage-meta">
                  <span>{buildPhase === "first" ? `首轮剩余 ${buildMode.pending.length} 句` : `错题清零 · 剩余 ${buildMode.review.length} 句`}</span>
                  <span className={`level-pill ${buildPhase === "review" ? "review" : ""}`}>{buildPhase === "first" ? "今日首轮" : "只练错题"}</span>
                </div>
                <div className="sentence-prompt">
                  <span>请按正确顺序点击下方意群</span>
                  <h2>{currentSentence.chinese}</h2>
                </div>

                <div className={`sentence-line ${sentenceFeedback ?? ""}`}>
                  {selectedParts.length === 0 && <span className="empty-hint">句子会在这里逐步出现…</span>}
                  {selectedParts.map((part) => <button key={part} onClick={undoPart}>{currentSentence.parts[part]}</button>)}
                </div>

                <div className="part-bank">
                  {initialScramble.map((part) => (
                    <button key={part} disabled={selectedParts.includes(part)} onClick={() => choosePart(part)}>
                      {currentSentence.parts[part]}
                    </button>
                  ))}
                </div>

                {!sentenceFeedback ? (
                  <div className="build-actions">
                    <button className="ghost-button" onClick={undoPart} disabled={!selectedParts.length}>撤回一步</button>
                    <button className="primary-button" onClick={checkSentence} disabled={selectedParts.length !== currentSentence.parts.length}>检查句子</button>
                  </div>
                ) : (
                  <div className={`feedback ${sentenceFeedback}`}>
                    <strong>{sentenceFeedback === "correct" ? "顺序正确。你正在用意群说话。" : "顺序还不对，再观察一下句子的骨架。"}</strong>
                    <p>{sentenceFeedback === "wrong" && `参考：${currentSentence.parts.join(" ")}`}</p>
                    <button onClick={nextSentence}>{sentenceFeedback === "correct" ? "下一句 →" : "记入错题，下一句 →"}</button>
                  </div>
                )}
              </section>

              <section className="scenario-stage">
                <div>
                  <p className="section-kicker">{activeUnit.scenario.label}</p>
                  <h2>{activeUnit.scenario.question}</h2>
                  <p>{activeUnit.scenario.prompt}</p>
                </div>
                <textarea value={scenarioAnswer} onChange={(event) => setScenarioAnswer(event.target.value)} placeholder={activeUnit.scenario.placeholder} aria-label="情境输出答案" />
                <div className="scenario-footer">
                  <span>{scenarioAnswer.trim() ? scenarioAnswer.trim().split(/\s+/).length : 0} words</span>
                  <button className="ghost-button" onClick={() => setShowReference((value) => !value)}>{showReference ? "隐藏参考" : "查看参考"}</button>
                </div>
                {showReference && <p className="reference-answer">{activeUnit.scenario.reference}</p>}
              </section>
            </div>
          )}

          {tab === "manage" && (
            <section className="manage-stage">
              <div className="library-list">
                <div className="library-intro">
                  <span>SCREENSHOT TO PRACTICE</span>
                  <h2>截图交给我，整理和上传也交给我。</h2>
                  <p>内容按“书籍 → 分类 → 课程 → 意群”分层管理。发布时会检查各级名称；英文意群允许重复出现。</p>
                </div>
                <div className="library-path" aria-label="内容层级">
                  <button type="button" className="hierarchy-link" onClick={() => setLibraryPicker(libraryPicker === "book" ? null : "book")} aria-expanded={libraryPicker === "book"}>
                    {activeBook.name}<span aria-hidden="true">⌄</span>
                  </button>
                  <b aria-hidden="true">›</b>
                  <button type="button" className="hierarchy-link" onClick={() => setLibraryPicker(libraryPicker === "category" ? null : "category")} aria-expanded={libraryPicker === "category"}>
                    {activeUnit.category}<span aria-hidden="true">⌄</span>
                  </button>
                  <b aria-hidden="true">›</b>
                  <button type="button" className="hierarchy-link current" onClick={() => { setLibraryCategory(activeUnit.category); setLibraryPicker(libraryPicker === "unit" ? null : "unit"); }} aria-expanded={libraryPicker === "unit"}>
                    {activeUnit.name}<span aria-hidden="true">⌄</span>
                  </button>
                </div>
                {libraryPicker && (
                  <div className="hierarchy-picker" aria-live="polite">
                    <div className="picker-heading">
                      <span>{libraryPicker === "book" ? "选择书籍" : libraryPicker === "category" ? `选择 ${activeBook.name} 的分类` : `选择 ${libraryCategory} 下的课程`}</span>
                      <button type="button" onClick={() => setLibraryPicker(null)} aria-label="关闭选择器">×</button>
                    </div>
                    <div className="picker-options">
                      {libraryPicker === "book" ? contentLibrary.map((book) => (
                        <button type="button" key={book.id} className={book.id === activeBook.id ? "active" : ""} onClick={() => chooseBook(book)}>
                          <span>BOOK</span><strong>{book.name}</strong><small>{categoriesFor(book).length} 个分类</small>
                        </button>
                      )) : libraryPicker === "category" ? categoriesFor(activeBook).map((category) => (
                        <button type="button" key={category} className={category === activeUnit.category ? "active" : ""} onClick={() => chooseCategory(category)}>
                          <span>CATEGORY</span><strong>{category}</strong><small>{activeBook.units.filter((unit) => unit.category === category).length} 个课程</small>
                        </button>
                      )) : activeBook.units.filter((unit) => normalizeName(unit.category) === normalizeName(libraryCategory)).map((unit) => (
                        <button type="button" key={unit.id} className={unit.id === activeUnit.id ? "active" : ""} onClick={() => chooseUnit(unit)}>
                          <span>LESSON</span><strong>{unit.name}</strong><small>{unit.chunks.length} 个意群</small>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {activeUnit.sourceUrl && (
                  <div className="lesson-resources">
                    <a href={activeUnit.sourceUrl} target="_blank" rel="noreferrer">查看原始课程 <span>↗</span></a>
                    {activeUnit.dialogueSummary && <button type="button" onClick={() => setShowDialogue(true)}>打开对话版摘要 <span>→</span></button>}
                  </div>
                )}
                <div className="library-heading"><span>{activeUnit.section.toUpperCase()}</span><strong>{chunks.length} 个意群</strong></div>
                {chunks.map((chunk, index) => (
                  <article key={chunk.id}>
                    <span className="chunk-number">{String(index + 1).padStart(2, "0")}</span>
                    <div><strong>{chunk.english}</strong><p>{chunk.chinese}</p></div>
                    <button className={`list-audio ${speakingText === chunkAudioText(chunk) ? "speaking" : ""}`} onClick={() => speak(chunkAudioText(chunk))} aria-label={`播放 ${chunk.english} 的英式发音`}>
                      ▶ <span>播放</span>
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>

      {activityPicker && (
        <div className="activity-picker-overlay" role="presentation" onClick={() => setActivityPicker(null)}>
          <section
            className="activity-picker-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-picker-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="activity-picker-header">
              <div>
                <span>开始 · {activityNames[activityPicker.activity]}</span>
                <h2 id="activity-picker-title">{activityPicker.step === "book" ? "先选择一本书" : activityPicker.step === "category" ? "再选择一个分类" : "最后选择一门课程"}</h2>
              </div>
              <button type="button" onClick={() => setActivityPicker(null)} aria-label="关闭分级选择">×</button>
            </div>

            <ol className="activity-picker-steps" aria-label="训练选择步骤">
              <li className={activityPicker.step === "book" ? "active" : "done"}><b>1</b><span>选择书籍</span></li>
              <li className={activityPicker.step === "category" ? "active" : activityPicker.step === "unit" ? "done" : ""}><b>2</b><span>选择分类</span></li>
              <li className={activityPicker.step === "unit" ? "active" : ""}><b>3</b><span>选择课程</span></li>
              <li><b>4</b><span>开始训练</span></li>
            </ol>

            {activityPicker.step === "book" ? (
              <div className="activity-picker-options">
                {contentLibrary.map((book) => (
                  <button type="button" key={book.id} onClick={() => chooseActivityBook(book)}>
                    <span>BOOK</span>
                    <strong>{book.name}</strong>
                    <small>{categoriesFor(book).length} 个分类 <i>→</i></small>
                  </button>
                ))}
              </div>
            ) : activityPicker.step === "category" ? (
              <>
                <button
                  type="button"
                  className="activity-picker-back"
                  onClick={() => setActivityPicker((current) => current ? { ...current, step: "book" } : current)}
                >
                  ← 返回选择书籍
                </button>
                <p className="activity-picker-book">当前书籍：<strong>{pickerBook.name}</strong></p>
                <div className="activity-picker-options">
                  {categoriesFor(pickerBook).map((category) => (
                    <button type="button" key={category} onClick={() => chooseActivityCategory(category)}>
                      <span>CATEGORY</span>
                      <strong>{category}</strong>
                      <small>{pickerBook.units.filter((unit) => unit.category === category).length} 个课程 <i>→</i></small>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="activity-picker-back"
                  onClick={() => setActivityPicker((current) => current ? { ...current, step: "category" } : current)}
                >
                  ← 返回选择分类
                </button>
                <p className="activity-picker-book">当前路径：<strong>{pickerBook.name} › {activityPicker.category}</strong></p>
                <div className="activity-picker-options">
                  {pickerUnits.map((unit) => (
                    <button type="button" key={unit.id} onClick={() => chooseActivityUnit(unit)}>
                      <span>LESSON</span>
                      <strong>{unit.name}</strong>
                      <small>{unit.chunks.length} 个意群 <i>→</i></small>
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {showDialogue && activeUnit.dialogueSummary && (
        <div className="dialogue-overlay" role="presentation" onClick={() => setShowDialogue(false)}>
          <section
            className="dialogue-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialogue-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dialogue-header">
              <div>
                <span>DIALOGUE SUMMARY</span>
                <h2 id="dialogue-title">{activeUnit.name}</h2>
              </div>
              <button type="button" onClick={() => setShowDialogue(false)} aria-label="关闭对话摘要">×</button>
            </div>
            <p className="dialogue-note">根据课程情境重新编写，重点意群已标出；这不是课程原文的逐字转载。</p>
            <div className="dialogue-turns">
              {activeUnit.dialogueSummary.map((turn, index) => (
                <article className={`dialogue-turn ${turn.speaker.toLowerCase()}`} key={`${turn.speaker}-${index}`}>
                  <strong>{turn.speaker}</strong>
                  <p>{renderDialogueText(turn)}</p>
                </article>
              ))}
            </div>
            {activeUnit.sourceUrl && (
              <a className="dialogue-source" href={activeUnit.sourceUrl} target="_blank" rel="noreferrer">
                查看原始课程 <span>↗</span>
              </a>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
