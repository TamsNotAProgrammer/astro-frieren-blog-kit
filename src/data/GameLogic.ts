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

export const getDailyGameSet = (
  topics: GameTopic[],
  date = new Date(),
  epoch = new Date("2026-04-13")
): GameTopic[] => {
  const utcDate = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const utcEpoch = Date.UTC(epoch.getUTCFullYear(), epoch.getUTCMonth(), epoch.getUTCDate());
  const dayIndex = Math.floor((utcDate - utcEpoch) / (24 * 60 * 60 * 1000));
  
  const shuffled = seededShuffle(topics, dayIndex);
  const dailySet: GameTopic[] = [];
  const usedCategories = new Set<string>();

  for (const topic of shuffled) {
    if (!usedCategories.has(topic.category)) {
      dailySet.push(topic);
      usedCategories.add(topic.category);
    }
    if (dailySet.length === 5) break;
  }

  if (dailySet.length < 5) {
    for (const topic of shuffled) {
      if (!dailySet.find(t => t.id === topic.id)) {
        dailySet.push(topic);
      }
      if (dailySet.length === 5) break;
    }
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
    
    // Shorten the long name as requested
    let displayCat = round.topic.category;
    if (displayCat === "Environmental Sciences") displayCat = "Env. Science";
    
    // Format: Category on one line, squares and time on the next
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