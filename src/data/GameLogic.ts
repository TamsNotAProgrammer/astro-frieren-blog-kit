// 1. TYPE DEFINITIONS
export type GameTopic = {
  id: string;
  category: string;
  label: string;
  timeLimitSeconds: number;
  answers: string[];
};

export type GameGameState = {
  topic: GameTopic;
  remainingAnswers: string[];
  correctAnswers: string[];
  timeLeftSeconds: number;
  isGameOver: boolean;
  isStarted: boolean;
  startTime: number | null; 
  endTime: number | null;   
  guessHistory: { word: string; correct: boolean }[];
};

// 2. SELECTION LOGIC

// Add yesterday's questions here each day to retire them from future daily games.
// Format is "category:id" to avoid clashes across data files.
// Retired questions still appear in practice modes.
// Clear this list whenever you want to reset the cycle.
export const retiredDailyIds = new Set<string>([
  "Geography:question-13",
  "Natural Sciences:question-33",
  "Environmental Sciences:question-2",
  "Sports and Games:question-38",
  "Music:question-41",

// Day 1 - 24/04/2026:
  "Geography:question-12",
  "Natural Sciences:question-5",
  "Environmental Sciences:question-8",
  "Gastronomy:question-31",
  "Sports and Games:question-20",

// Day 2 - 25/04/2026:
  "Geography:question-35",
  "Natural Sciences:question-18",
  "Music:question-1",
  "Environmental Sciences:question-10",
  "History:question-34",

// Day 3 - 26/04/2026:
  "Geography:question-40",
  "Natural Sciences:question-24",
  "Music:question-17",
  "Language:question-53",
  "Maths:question-60",

// Day 4 - 27/04/2026:
  "Geography:question-23",
  "Maths:question-59",
  "Natural Sciences:question-9",
  "History:question-54",
  "Sports and Games:question-36",

// Day 5 - 28/04/2026:
  "Geography:question-3",
  "Natural Sciences:question-29",
  "Sports and Games:question-44",
  "Environmental Sciences:question-7",
  "Music:question-19",

// Day 6 - 29/04/2026:
  "Geography:question-4",
  "Natural Sciences:question-26",
  "Language:question-42",
  "Oddball:question-27",
  "Environmental Sciences:question-11",

// Day 7 - 30/04/2026:
  "Geography:question-15",
  "Natural Sciences:question-6",
  "Music:question-16",
  "Maths:question-57",
  "Environmental Sciences:question-15",

// Day 8 - 01/05/2026:
  "Geography:question-49",
  "Natural Sciences:question-21",
  "Environmental Sciences:question-14",
  "Language and Linguistics:question-14",
  "Language:question-56",

// Day 9 - 02/05/2026:
  "Geography:question-45",
  "Natural Sciences:question-22",
  "History:question-55",
  "Gastronomy:question-32",
  "Art and Literature:question-39",

// Day 10 - 03/05/2026:
  "Geography:question-48",
  "TV And Film:question-47",
  "History:question-52",
  "Natural Sciences:question-25",
  "Gastronomy:question-30",

// Day 11 - 05/05/2026:
  "Environmental Sciences:question-5",
  "Natural Sciences:question-23",
  "Geography:question-7",
  "Words:question-16",
  "Language:question-56",

  "Music:question-10",
  "Oddball:question-11",
  "Words:question-19",
  "Natural Sciences:question-11",
  "Environmental Sciences:question-18",
]);

export const getDailyGameSet = (
  topics: GameTopic[],
  date = new Date(),
  epoch = new Date("2026-05-05")
): GameTopic[] => {
  const utcDate = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const utcEpoch = Date.UTC(epoch.getUTCFullYear(), epoch.getUTCMonth(), epoch.getUTCDate());
  const dayIndex = Math.floor((utcDate - utcEpoch) / (24 * 60 * 60 * 1000));

  // Filter out retired questions
  const eligible = topics.filter(t => !retiredDailyIds.has(`${t.category}:${t.id}`));

  // Shuffle eligible pool using today's day index as seed
  const shuffled = seededShuffle(eligible, dayIndex);

  // Pick 5 with no repeat categories
  const dailySet: GameTopic[] = [];
  const usedCategories = new Set<string>();

  for (const topic of shuffled) {
    if (!usedCategories.has(topic.category)) {
      dailySet.push(topic);
      usedCategories.add(topic.category);
    }
    if (dailySet.length === 5) break;
  }

  return dailySet;
};

export const getRandomGameSet = (
  topics: GameTopic[], 
  count: number = 5
): GameTopic[] => {
  return [...topics]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
};

export const seededShuffle = <T>(array: T[], seed: number): T[] => {
  const shuffled = [...array];
  let m = shuffled.length, t, i, s = seed;
  while (m) {
    i = Math.floor(Math.abs(Math.sin(s++)) * m--);
    t = shuffled[m];
    shuffled[m] = shuffled[i];
    shuffled[i] = t;
  }
  return shuffled;
};

// 3. CORE GAME FUNCTIONS
export const createGameGame = (topic: GameTopic): GameGameState => ({
  topic,
  remainingAnswers: [...topic.answers],
  correctAnswers: [],
  timeLeftSeconds: 5, 
  isGameOver: false,
  isStarted: false,
  startTime: null,
  endTime: null,
  guessHistory: [],
});

export const checkAnswer = (state: GameGameState, answer: string): GameGameState => {
  if (state.isGameOver) return state;
  const normalized = answer.trim().toLowerCase();
  
  if (state.correctAnswers.some(c => c.toLowerCase() === normalized)) return state;

  const matched = state.remainingAnswers.find(item => item.toLowerCase() === normalized);
  const isCorrect = !!matched;
  
  const newHistory = [...state.guessHistory, { word: answer.trim(), correct: isCorrect }];
  const newCorrectAnswers = isCorrect ? [...state.correctAnswers, matched] : state.correctAnswers;
  
  return {
    ...state,
    remainingAnswers: isCorrect 
      ? state.remainingAnswers.filter(item => item.toLowerCase() !== normalized)
      : state.remainingAnswers,
    correctAnswers: newCorrectAnswers,
    timeLeftSeconds: 5, 
    guessHistory: newHistory,
    isGameOver: newHistory.length >= 5 || newCorrectAnswers.length >= 5, 
  };
};

// 4. RESULTS GENERATION

export const generateShareText = (results: GameGameState[]): string => {
  const today = new Date().toLocaleDateString('en-GB'); 
  const totalScore = results.reduce((acc, curr) => acc + curr.correctAnswers.length, 0);
  const totalTime = results.reduce((acc, curr) => acc + ((curr.endTime! - curr.startTime!) / 1000), 0);

  const roundDetails = results.map(round => {
    const duration = ((round.endTime! - round.startTime!) / 1000).toFixed(2);
    const grid = round.guessHistory.map(g => g.correct ? '🟩' : '🟥').join('');
    const paddingEmoji = '🟥'.repeat(Math.max(0, 5 - round.guessHistory.length));
    
    let displayCat = round.topic.category;
    if (displayCat === "Environmental Sciences") displayCat = "Env. Science";
    
    return `${displayCat}:\n${grid}${paddingEmoji} (${duration}s)`;
  });

  return [
    `5-5-5 Game... ${today}`, 
    `Total Score: ${totalScore}/${results.length * 5}`,
    `Total Time: ${totalTime.toFixed(2)}s`,
    ``, 
    ...roundDetails, 
    ``, 
    `Play at: ${window.location.origin}`
  ].join('\n');
};

export const generateSummaryText = (results: GameGameState[]): string => {
  const totalScore = results.reduce((acc, curr) => acc + curr.correctAnswers.length, 0);
  const totalTime = results.reduce((acc, curr) => acc + ((curr.endTime! - curr.startTime!) / 1000), 0);
  return `Game Complete!\nScore: ${totalScore}/${results.length * 5}\nTotal Time: ${totalTime.toFixed(2)}s`;
};

// 5. UI HELPER
export const renderAnswerBox = (answer: string, isCorrect: boolean, inputElement: HTMLInputElement, containerElement: HTMLElement) => {
  const rect = inputElement.getBoundingClientRect();
  const box = document.createElement("div");
  box.className = "w-full rounded-3xl border-4 px-6 py-5 text-2xl font-semibold shadow-lg flex items-center justify-center text-[#032922] dark:text-[#f5e5d5] animate-in fade-in slide-in-from-top-2 duration-300";
  box.style.backgroundColor = isCorrect ? "rgba(46, 204, 113, 0.2)" : "rgba(231, 76, 60, 0.2)";
  box.style.borderColor = isCorrect ? "rgba(46, 204, 113, 0.8)" : "rgba(231, 76, 60, 0.8)";
  box.style.height = `${rect.height}px`;
  box.style.marginBottom = "1rem";
  box.textContent = answer;
  containerElement.prepend(box);
};