const STORAGE_KEYS = {
  history: "morse-trainer-history-v1",
  theme: "morse-trainer-theme-v1",
};

const MAX_HISTORY = 100;

const MORSE_MAP = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
  0: "-----",
  1: ".----",
  2: "..---",
  3: "...--",
  4: "....-",
  5: ".....",
  6: "-....",
  7: "--...",
  8: "---..",
  9: "----.",
  ".": ".-.-.-",
  ",": "--..--",
  "?": "..--..",
  "/": "-..-.",
  "=": "-...-",
};

const LESSONS = {
  basic: {
    label: "De baza",
    chars: "ARZSJYEQTPIB",
  },
  "koch-core": {
    label: "Koch Core",
    chars: "KMRSUAPTLNO",
  },
  numbers: {
    label: "Numbers",
    chars: "0123456789",
  },
  alphabet: {
    label: "Alphabet",
    chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  },
  alnum: {
    label: "Alpha + Numbers",
    chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  },
  custom: {
    label: "Custom",
    chars: "",
  },
};

const state = {
  audioContext: null,
  sessionAudio: null,
  playbackFrame: null,
  status: "idle",
  session: null,
  history: [],
  themePreference: "auto",
  lastEvaluation: null,
};

const elements = {
  settingsForm: document.getElementById("settingsForm"),
  speedInput: document.getElementById("speedInput"),
  frequencyInput: document.getElementById("frequencyInput"),
  volumeInput: document.getElementById("volumeInput"),
  characterSpacingInput: document.getElementById("characterSpacingInput"),
  wordSpacingInput: document.getElementById("wordSpacingInput"),
  groupSizeInput: document.getElementById("groupSizeInput"),
  characterCountInput: document.getElementById("characterCountInput"),
  seedInput: document.getElementById("seedInput"),
  lessonSelect: document.getElementById("lessonSelect"),
  customCharactersInput: document.getElementById("customCharactersInput"),
  usingCharacters: document.getElementById("usingCharacters"),
  preStartTextInput: document.getElementById("preStartTextInput"),
  showCurrentToggle: document.getElementById("showCurrentToggle"),
  transcriptionToggle: document.getElementById("transcriptionToggle"),
  validationNote: document.getElementById("validationNote"),
  startButton: document.getElementById("startButton"),
  pauseButton: document.getElementById("pauseButton"),
  stopButton: document.getElementById("stopButton"),
  sessionStatusText: document.getElementById("sessionStatusText"),
  seedUsedText: document.getElementById("seedUsedText"),
  playedCountText: document.getElementById("playedCountText"),
  modeText: document.getElementById("modeText"),
  currentCharacterPanel: document.getElementById("currentCharacterPanel"),
  currentCharacterBox: document.getElementById("currentCharacterBox"),
  sessionOutputText: document.getElementById("sessionOutputText"),
  transcriptionPanel: document.getElementById("transcriptionPanel"),
  transcriptionGrid: document.getElementById("transcriptionGrid"),
  keyboardPanel: document.getElementById("keyboardPanel"),
  evaluationPanel: document.getElementById("evaluationPanel"),
  evaluationSummary: document.getElementById("evaluationSummary"),
  scoreText: document.getElementById("scoreText"),
  accuracyText: document.getElementById("accuracyText"),
  errorCountText: document.getElementById("errorCountText"),
  wpmEstimateText: document.getElementById("wpmEstimateText"),
  actualEvaluationText: document.getElementById("actualEvaluationText"),
  typedEvaluationText: document.getElementById("typedEvaluationText"),
  extraCharactersText: document.getElementById("extraCharactersText"),
  repeatWrongButton: document.getElementById("repeatWrongButton"),
  historyHeading: document.getElementById("historyHeading"),
  historyList: document.getElementById("historyList"),
  exportJsonButton: document.getElementById("exportJsonButton"),
  exportCsvButton: document.getElementById("exportCsvButton"),
  clearHistoryButton: document.getElementById("clearHistoryButton"),
  themeSelect: document.getElementById("themeSelect"),
};

function init() {
  bindEvents();
  loadThemePreference();
  loadHistory();
  updateLessonUI();
  updateTranscriptionUI();
  renderSessionStatus();
  renderHistory();
}

function bindEvents() {
  elements.lessonSelect.addEventListener("change", () => {
    updateLessonUI();
  });

  elements.customCharactersInput.addEventListener("input", () => {
    updateLessonUI();
  });

  elements.preStartTextInput.addEventListener("input", () => {
    renderValidationNote();
  });

  elements.transcriptionToggle.addEventListener("change", () => {
    updateTranscriptionUI();
    renderSessionStatus();
  });

  elements.showCurrentToggle.addEventListener("change", () => {
    renderCurrentCharacter(state.session?.currentCharacter || "");
  });

  [
    elements.speedInput,
    elements.frequencyInput,
    elements.volumeInput,
    elements.characterSpacingInput,
    elements.wordSpacingInput,
    elements.groupSizeInput,
    elements.characterCountInput,
    elements.seedInput,
  ].forEach((input) => {
    input.addEventListener("input", () => {
      renderValidationNote();
      renderTranscriptionSlots();
    });
  });

  elements.startButton.addEventListener("click", startSession);
  elements.pauseButton.addEventListener("click", togglePause);
  elements.stopButton.addEventListener("click", stopSession);

  elements.keyboardPanel.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-key]");
    if (!button) {
      return;
    }

    const key = button.dataset.key;
    if (key === "SKIP") {
      skipTranscriptionSlot();
      return;
    }

    if (key === "BACKSPACE") {
      deleteTranscriptionCharacter();
      return;
    }

    if (key === "CLEAR") {
      clearTranscriptionSlots();
      return;
    }

    insertTranscriptionCharacter(key);
  });

  elements.transcriptionGrid.addEventListener("keydown", handleTranscriptionKeydown);
  elements.transcriptionGrid.addEventListener("click", (event) => {
    const slot = event.target.closest("[data-slot-index]");
    if (!slot) {
      elements.transcriptionGrid.focus();
      return;
    }

    moveTranscriptionCursor(Number(slot.dataset.slotIndex));
    elements.transcriptionGrid.focus();
  });

  elements.repeatWrongButton.addEventListener("click", () => {
    if (!state.lastEvaluation || !state.lastEvaluation.wrongCharacters.length) {
      return;
    }

    elements.lessonSelect.value = "custom";
    elements.customCharactersInput.value = uniqueCharacters(state.lastEvaluation.wrongCharacters.join(""));
    updateLessonUI();
    renderValidationNote();
    elements.customCharactersInput.focus();
  });

  elements.exportJsonButton.addEventListener("click", () => exportHistory("json"));
  elements.exportCsvButton.addEventListener("click", () => exportHistory("csv"));
  elements.clearHistoryButton.addEventListener("click", clearHistory);
  elements.themeSelect.addEventListener("change", () => {
    state.themePreference = elements.themeSelect.value;
    localStorage.setItem(STORAGE_KEYS.theme, state.themePreference);
    applyTheme();
  });
}

function loadThemePreference() {
  state.themePreference = localStorage.getItem(STORAGE_KEYS.theme) || "auto";
  elements.themeSelect.value = state.themePreference;
  applyTheme();
}

function applyTheme() {
  const root = document.documentElement;
  if (state.themePreference === "auto") {
    root.removeAttribute("data-theme");
    return;
  }

  root.setAttribute("data-theme", state.themePreference);
}

function updateLessonUI() {
  const lessonValue = elements.lessonSelect.value;
  const useCustom = lessonValue === "custom";
  elements.customCharactersInput.disabled = !useCustom;
  const activeCharacters = getActiveCharacters(lessonValue);
  elements.usingCharacters.textContent = activeCharacters || "No supported characters selected.";
  renderKeyboard(activeCharacters);
  renderTranscriptionSlots();
  renderValidationNote();
}

function updateTranscriptionUI() {
  const transcriptionMode = elements.transcriptionToggle.checked;
  elements.transcriptionPanel.classList.toggle("is-hidden", !transcriptionMode);
  renderEvaluation(transcriptionMode ? state.lastEvaluation : null);
  renderTranscriptionSlots();
  renderCurrentCharacter(state.session?.currentCharacter || "");
  elements.modeText.textContent = transcriptionMode ? "Transcription" : "Listening";
}

function renderValidationNote() {
  const validation = validateSettings(false);
  elements.validationNote.textContent = validation.message || "";
  elements.validationNote.classList.toggle("is-error", !validation.valid && Boolean(validation.message));
}

function getActiveCharacters(lessonValue = elements.lessonSelect.value) {
  if (lessonValue !== "custom") {
    return LESSONS[lessonValue].chars;
  }

  return sanitizeCharacters(elements.customCharactersInput.value, { dedupe: true, allowWhitespace: true });
}

function sanitizeCharacters(value, { dedupe = true, allowWhitespace = false } = {}) {
  const normalized = value.toUpperCase();
  const filtered = [];

  for (const char of normalized) {
    if (allowWhitespace && /\s/.test(char)) {
      continue;
    }

    if (!MORSE_MAP[char]) {
      continue;
    }

    if (dedupe && filtered.includes(char)) {
      continue;
    }

    filtered.push(char);
  }

  return filtered.join("");
}

function uniqueCharacters(value) {
  return sanitizeCharacters(value, { dedupe: true, allowWhitespace: true });
}

function validateSettings(reportToForm) {
  const numericFields = [
    { element: elements.speedInput, min: 5, max: 60, label: "Speed" },
    { element: elements.frequencyInput, min: 300, max: 1200, label: "Frequency" },
    { element: elements.volumeInput, min: 0, max: 1, label: "Volume" },
    { element: elements.characterSpacingInput, min: 1, max: 30, label: "Character spacing" },
    { element: elements.wordSpacingInput, min: 1, max: 30, label: "Word spacing" },
    { element: elements.groupSizeInput, min: 1, max: 10, label: "Group size" },
    { element: elements.characterCountInput, min: 1, max: 500, label: "Number of characters" },
  ];

  for (const field of numericFields) {
    const value = Number(field.element.value);
    if (Number.isNaN(value) || value < field.min || value > field.max) {
      const message = `${field.label} must be between ${field.min} and ${field.max}.`;
      if (reportToForm) {
        field.element.setCustomValidity(message);
        field.element.reportValidity();
      }
      return { valid: false, message };
    }

    field.element.setCustomValidity("");
  }

  const activeCharacters = getActiveCharacters();
  if (!activeCharacters) {
    const message = "Choose a lesson or provide at least one supported custom character.";
    if (reportToForm) {
      elements.customCharactersInput.setCustomValidity(message);
      elements.customCharactersInput.reportValidity();
    }
    return { valid: false, message };
  }

  elements.customCharactersInput.setCustomValidity("");

  const preStartText = sanitizeCharacters(elements.preStartTextInput.value, {
    dedupe: false,
    allowWhitespace: true,
  });

  if (!preStartText && elements.preStartTextInput.value.trim()) {
    const message = "Pre-start text contains no supported Morse characters.";
    if (reportToForm) {
      elements.preStartTextInput.setCustomValidity(message);
      elements.preStartTextInput.reportValidity();
    }
    return { valid: false, message };
  }

  elements.preStartTextInput.setCustomValidity("");

  return {
    valid: true,
    message: `${activeCharacters.length} active characters ready.`,
  };
}

function collectSettings() {
  const validation = validateSettings(true);
  if (!validation.valid) {
    renderValidationNote();
    return null;
  }

  const lessonKey = elements.lessonSelect.value;
  const activeCharacters = getActiveCharacters(lessonKey);
  const preStartText = sanitizeCharacters(elements.preStartTextInput.value, {
    dedupe: false,
    allowWhitespace: true,
  });

  return {
    speed: Number(elements.speedInput.value),
    frequency: Number(elements.frequencyInput.value),
    volume: Number(elements.volumeInput.value),
    characterSpacing: Number(elements.characterSpacingInput.value),
    wordSpacing: Number(elements.wordSpacingInput.value),
    groupSize: Number(elements.groupSizeInput.value),
    characterCount: Number(elements.characterCountInput.value),
    seed: elements.seedInput.value.trim(),
    lessonKey,
    lessonLabel: LESSONS[lessonKey].label,
    activeCharacters,
    preStartText,
    showCurrent: elements.showCurrentToggle.checked,
    transcriptionMode: elements.transcriptionToggle.checked,
  };
}

async function startSession() {
  if (state.status === "playing" || state.status === "paused") {
    return;
  }

  const settings = collectSettings();
  if (!settings) {
    return;
  }

  const seedUsed = settings.seed || generateSeed();
  const random = createSeededRandom(seedUsed);
  const plannedChars = generatePlannedCharacters(settings.activeCharacters, settings.characterCount, random);
  const audioContext = await ensureAudioContext();
  if (!audioContext) {
    return;
  }

  state.lastEvaluation = null;
  const playbackPlan = buildPlaybackPlan(settings, plannedChars);
  state.session = {
    settings,
    seedUsed,
    plannedChars,
    playbackPlan,
    playedChars: [],
    currentCharacter: "",
    phase: playbackPlan.mainStartMs > 0 ? "prestart" : "main",
    playbackOffsetMs: 0,
    playbackStartCtxTime: null,
    transcriptionSlots: settings.transcriptionMode ? Array(plannedChars.length).fill("") : [],
    transcriptionCursor: 0,
    startedAt: Date.now(),
    endedAt: null,
  };

  state.status = "playing";
  elements.seedUsedText.textContent = seedUsed;
  elements.sessionOutputText.textContent = "Playback in progress...";
  renderEvaluation(null);
  setControlsForSession(true);
  renderTranscriptionSlots();
  renderSessionStatus();

  if (settings.transcriptionMode) {
    elements.transcriptionGrid.focus();
  }

  startScheduledPlayback();
}

async function ensureAudioContext() {
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error("AudioContext unavailable");
    }

    if (!state.audioContext) {
      state.audioContext = new AudioContextCtor();
    }

    if (state.audioContext.state === "suspended") {
      await state.audioContext.resume();
    }

    return state.audioContext;
  } catch (error) {
    elements.sessionStatusText.textContent = "Audio could not start in this browser.";
    return null;
  }
}

function buildPlaybackPlan(settings, plannedChars) {
  const toneSegments = [];
  const characters = [];
  const dotMs = dotDurationMs(settings.speed);
  let cursorMs = 0;

  const appendCharacter = (character, phase, gapAfterDots) => {
    const pattern = MORSE_MAP[character];
    if (!pattern) {
      return;
    }

    const startMs = cursorMs;
    for (let symbolIndex = 0; symbolIndex < pattern.length; symbolIndex += 1) {
      const symbol = pattern[symbolIndex];
      const durationMs = symbol === "." ? dotMs : dotMs * 3;
      toneSegments.push({
        startMs: cursorMs,
        durationMs,
      });
      cursorMs += durationMs;

      if (symbolIndex < pattern.length - 1) {
        cursorMs += dotMs;
      }
    }

    characters.push({
      char: character,
      phase,
      startMs,
      audibleEndMs: cursorMs,
    });

    if (gapAfterDots > 0) {
      cursorMs += gapAfterDots * dotMs;
    }
  };

  const preStartChars = [...settings.preStartText];
  for (let index = 0; index < preStartChars.length; index += 1) {
    const isLastWarmupChar = index === preStartChars.length - 1;
    appendCharacter(
      preStartChars[index],
      "prestart",
      isLastWarmupChar ? 0 : settings.characterSpacing
    );
  }

  if (preStartChars.length && plannedChars.length) {
    cursorMs += settings.wordSpacing * dotMs;
  }

  const mainStartMs = cursorMs;

  for (let index = 0; index < plannedChars.length; index += 1) {
    const isLastCharacter = index === plannedChars.length - 1;
    const groupBoundary = (index + 1) % settings.groupSize === 0;
    appendCharacter(
      plannedChars[index],
      "main",
      isLastCharacter ? 0 : groupBoundary ? settings.wordSpacing : settings.characterSpacing
    );
  }

  return {
    toneSegments,
    characters,
    mainStartMs,
    totalDurationMs: cursorMs,
  };
}

function startScheduledPlayback() {
  if (!state.audioContext || !state.session) {
    return;
  }

  stopSessionAudio();
  cancelPlaybackFrame();

  const oscillator = state.audioContext.createOscillator();
  const gainNode = state.audioContext.createGain();
  const compressor = state.audioContext.createDynamicsCompressor();
  const safeVolume = Math.min(Math.max(state.session.settings.volume, 0), 1) * 0.82;
  const scheduleStartTime = state.audioContext.currentTime + 0.03;
  const scheduleEndTime = scheduleStartTime + state.session.playbackPlan.totalDurationMs / 1000;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(state.session.settings.frequency, scheduleStartTime);

  compressor.threshold.setValueAtTime(-18, scheduleStartTime);
  compressor.knee.setValueAtTime(12, scheduleStartTime);
  compressor.ratio.setValueAtTime(3, scheduleStartTime);
  compressor.attack.setValueAtTime(0.003, scheduleStartTime);
  compressor.release.setValueAtTime(0.08, scheduleStartTime);

  gainNode.gain.cancelScheduledValues(scheduleStartTime);
  gainNode.gain.setValueAtTime(0, scheduleStartTime);

  for (const segment of state.session.playbackPlan.toneSegments) {
    const toneStartTime = scheduleStartTime + segment.startMs / 1000;
    const toneDuration = segment.durationMs / 1000;
    const rampTime = Math.min(0.004, Math.max(0.0015, toneDuration / 3));
    const sustainStartTime = toneStartTime + rampTime;
    const sustainEndTime = Math.max(sustainStartTime, toneStartTime + toneDuration - rampTime);

    gainNode.gain.setValueAtTime(0, toneStartTime);
    gainNode.gain.linearRampToValueAtTime(safeVolume, sustainStartTime);
    gainNode.gain.setValueAtTime(safeVolume, sustainEndTime);
    gainNode.gain.linearRampToValueAtTime(0, toneStartTime + toneDuration);
  }

  gainNode.gain.setValueAtTime(0, scheduleEndTime + 0.01);

  oscillator.connect(gainNode);
  gainNode.connect(compressor);
  compressor.connect(state.audioContext.destination);

  oscillator.onended = () => {
    if (!state.session || !state.sessionAudio || state.sessionAudio.oscillator !== oscillator) {
      return;
    }

    stopSessionAudio();
    updateSessionProgress(state.session.playbackPlan.totalDurationMs);
    finalizeSession();
  };

  oscillator.start(scheduleStartTime);
  oscillator.stop(scheduleEndTime + 0.03);

  state.session.playbackStartCtxTime = scheduleStartTime;
  state.session.playbackOffsetMs = 0;
  state.sessionAudio = {
    oscillator,
    gainNode,
    compressor,
  };

  queuePlaybackFrame();
}

function stopSessionAudio() {
  if (!state.sessionAudio) {
    return;
  }

  const { oscillator, gainNode, compressor } = state.sessionAudio;
  state.sessionAudio = null;
  oscillator.onended = null;

  try {
    oscillator.stop();
  } catch (error) {
    // Ignore already stopped oscillators.
  }

  oscillator.disconnect();
  gainNode.disconnect();
  compressor.disconnect();
}

function queuePlaybackFrame() {
  if (state.playbackFrame !== null) {
    return;
  }

  state.playbackFrame = window.requestAnimationFrame(handlePlaybackFrame);
}

function cancelPlaybackFrame() {
  if (state.playbackFrame === null) {
    return;
  }

  window.cancelAnimationFrame(state.playbackFrame);
  state.playbackFrame = null;
}

function handlePlaybackFrame() {
  state.playbackFrame = null;
  if (!state.session || state.status !== "playing") {
    return;
  }

  updateSessionProgress(getSessionOffsetMs());
  queuePlaybackFrame();
}

function getSessionOffsetMs() {
  if (!state.session) {
    return 0;
  }

  if (!state.audioContext || state.session.playbackStartCtxTime === null) {
    return state.session.playbackOffsetMs;
  }

  const elapsedMs = Math.max(0, (state.audioContext.currentTime - state.session.playbackStartCtxTime) * 1000);
  return Math.min(
    state.session.playbackPlan.totalDurationMs,
    elapsedMs
  );
}

function updateSessionProgress(offsetMs) {
  if (!state.session) {
    return;
  }

  const clampedOffsetMs = Math.max(0, Math.min(offsetMs, state.session.playbackPlan.totalDurationMs));
  state.session.playbackOffsetMs = clampedOffsetMs;
  state.session.phase = clampedOffsetMs < state.session.playbackPlan.mainStartMs ? "prestart" : "main";
  state.session.playedChars = state.session.playbackPlan.characters
    .filter((entry) => entry.phase === "main" && entry.audibleEndMs <= clampedOffsetMs)
    .map((entry) => entry.char);

  const activeCharacter = state.session.playbackPlan.characters.find(
    (entry) =>
      entry.phase === "main" &&
      clampedOffsetMs >= entry.startMs &&
      clampedOffsetMs < entry.audibleEndMs
  );

  state.session.currentCharacter = activeCharacter ? activeCharacter.char : "";
  renderCurrentCharacter(state.session.currentCharacter);
  renderSessionStatus();
}

async function togglePause() {
  if (state.status !== "playing" && state.status !== "paused") {
    return;
  }

  if (state.status === "playing") {
    updateSessionProgress(getSessionOffsetMs());
    state.status = "paused";
    if (state.audioContext && state.audioContext.state === "running") {
      await state.audioContext.suspend();
    }
    cancelPlaybackFrame();
    renderCurrentCharacter("");
  } else {
    if (state.audioContext && state.audioContext.state === "suspended") {
      await state.audioContext.resume();
    }
    state.status = "playing";
    queuePlaybackFrame();
    renderCurrentCharacter(state.session?.currentCharacter || "");
  }

  renderSessionStatus();
  updatePauseButtonLabel();
}

function stopSession() {
  if (state.status !== "playing" && state.status !== "paused") {
    return;
  }

  updateSessionProgress(getSessionOffsetMs());
  stopSessionAudio();
  cancelPlaybackFrame();
  finalizeSession();
}

function finalizeSession() {
  const session = state.session;
  state.status = "idle";
  stopSessionAudio();
  cancelPlaybackFrame();

  if (!session) {
    setControlsForSession(false);
    updateLessonUI();
    updateTranscriptionUI();
    renderCurrentCharacter("");
    renderSessionStatus();
    return;
  }

  session.endedAt = Date.now();
  updateSessionProgress(session.playbackOffsetMs);
  const actualText = session.playedChars.join("");
  elements.sessionOutputText.textContent = actualText
    ? formatGrouped(actualText, session.settings.groupSize)
    : "No main-session characters were fully played.";

  let evaluation = null;
  if (session.settings.transcriptionMode && actualText) {
    evaluation = evaluateTranscription(
      session.transcriptionSlots,
      actualText,
      Math.max(0, session.playbackOffsetMs - session.playbackPlan.mainStartMs),
      session.settings.groupSize
    );
    renderEvaluation(evaluation);
    state.lastEvaluation = evaluation;
  } else {
    renderEvaluation(null);
    state.lastEvaluation = null;
  }

  if (actualText) {
    saveHistoryEntry(session, evaluation);
  }

  state.session = null;
  setControlsForSession(false);
  updateLessonUI();
  updateTranscriptionUI();
  renderCurrentCharacter("");
  renderSessionStatus();
}

function evaluateTranscription(typedSlots, actualText, elapsedMs, groupSize) {
  const actualChars = [...actualText];
  const normalizedSlots = typedSlots.map((value) => normalizeTypedInput(value).slice(0, 1));
  const total = actualChars.length;
  let correct = 0;
  const wrongCharacters = [];
  const comparisons = [];

  for (let index = 0; index < total; index += 1) {
    const expected = actualChars[index];
    const typed = normalizedSlots[index] || "";
    const isCorrect = expected === typed;
    if (isCorrect) {
      correct += 1;
    } else {
      wrongCharacters.push(expected);
    }

    comparisons.push({
      expected,
      typed,
      isCorrect,
    });
  }

  const extraCharacters = normalizedSlots.slice(total).filter(Boolean);
  const errors = total - correct + extraCharacters.length;
  const accuracy = total ? (correct / total) * 100 : 0;
  const minutes = elapsedMs > 0 ? elapsedMs / 60000 : 0;
  const wpmEstimate = minutes > 0 ? correct / 5 / minutes : 0;

  return {
    normalizedSlots,
    formattedTyped: formatTranscriptionSlotsDisplay(normalizedSlots.slice(0, total), groupSize, "_"),
    total,
    correct,
    errors,
    accuracy,
    wpmEstimate,
    comparisons,
    extraCharacters,
    wrongCharacters,
  };
}

function renderEvaluation(evaluation) {
  const hasEvaluation = Boolean(evaluation);
  elements.evaluationPanel.classList.toggle("is-hidden", !elements.transcriptionToggle.checked || !hasEvaluation);

  if (!hasEvaluation) {
    elements.evaluationSummary.textContent = "No transcription scored yet.";
    elements.scoreText.textContent = "-";
    elements.accuracyText.textContent = "-";
    elements.errorCountText.textContent = "-";
    elements.wpmEstimateText.textContent = "-";
    elements.actualEvaluationText.textContent = "";
    elements.typedEvaluationText.textContent = "-";
    elements.extraCharactersText.textContent = "-";
    elements.repeatWrongButton.disabled = true;
    return;
  }

  elements.evaluationSummary.textContent = `${evaluation.correct}/${evaluation.total} correct.`;
  elements.scoreText.textContent = `${evaluation.correct}/${evaluation.total}`;
  elements.accuracyText.textContent = `${evaluation.accuracy.toFixed(1)}%`;
  elements.errorCountText.textContent = String(evaluation.errors);
  elements.wpmEstimateText.textContent = evaluation.wpmEstimate.toFixed(1);
  elements.typedEvaluationText.textContent = evaluation.formattedTyped || "(empty)";
  elements.extraCharactersText.textContent = evaluation.extraCharacters.length
    ? evaluation.extraCharacters.join("")
    : "-";
  elements.repeatWrongButton.disabled = !evaluation.wrongCharacters.length;

  elements.actualEvaluationText.textContent = "";
  for (const item of evaluation.comparisons) {
    const span = document.createElement("span");
    span.className = `evaluation-char ${item.isCorrect ? "correct" : "incorrect"}`;
    span.textContent = item.expected;
    if (!item.isCorrect) {
      span.title = `Typed: ${item.typed || "missing"}`;
    }
    elements.actualEvaluationText.append(span);
  }
}

function normalizeTypedInput(value) {
  return value.toUpperCase().replace(/\s+/g, "");
}

function saveHistoryEntry(session, evaluation) {
  const entry = {
    id: `${session.startedAt}-${Math.random().toString(16).slice(2, 10)}`,
    timestamp: new Date(session.endedAt).toISOString(),
    lessonKey: session.settings.lessonKey,
    lessonLabel: session.settings.lessonLabel,
    activeCharacters: session.settings.activeCharacters,
    groupSize: session.settings.groupSize,
    playedText: session.playedChars.join(""),
    playedCount: session.playedChars.length,
    transcriptionMode: session.settings.transcriptionMode,
    seedUsed: session.seedUsed,
    score: evaluation
      ? {
          correct: evaluation.correct,
          total: evaluation.total,
          accuracy: Number(evaluation.accuracy.toFixed(1)),
          errors: evaluation.errors,
          wpmEstimate: Number(evaluation.wpmEstimate.toFixed(1)),
        }
      : null,
  };

  state.history.unshift(entry);
  state.history = state.history.slice(0, MAX_HISTORY);
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
  renderHistory();
}

function loadHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.history);
    state.history = stored ? JSON.parse(stored) : [];
  } catch (error) {
    state.history = [];
  }
}

function clearHistory() {
  state.history = [];
  localStorage.removeItem(STORAGE_KEYS.history);
  renderHistory();
}

function renderHistory() {
  elements.historyHeading.textContent = `History (${state.history.length})`;
  elements.exportJsonButton.disabled = state.history.length === 0;
  elements.exportCsvButton.disabled = state.history.length === 0;
  elements.clearHistoryButton.disabled = state.history.length === 0;

  elements.historyList.textContent = "";

  if (!state.history.length) {
    const empty = document.createElement("p");
    empty.className = "empty-history";
    empty.textContent = "No sessions saved yet.";
    elements.historyList.append(empty);
    return;
  }

  for (const entry of state.history) {
    const article = document.createElement("article");
    article.className = "history-item";

    const topline = document.createElement("div");
    topline.className = "history-topline";

    const timestamp = document.createElement("strong");
    timestamp.className = "history-time";
    timestamp.textContent = formatTimestamp(entry.timestamp);

    const chip = document.createElement("span");
    chip.className = "history-chip";
    chip.textContent = entry.transcriptionMode ? "Transcription" : "Listening";

    topline.append(timestamp, chip);

    const snippet = document.createElement("pre");
    snippet.className = "history-snippet";
    snippet.textContent = formatGrouped(entry.playedText, entry.groupSize);

    const meta = document.createElement("p");
    meta.className = "history-meta";
    meta.textContent = `${entry.lessonLabel} | ${entry.playedCount} played | Seed ${entry.seedUsed}`;

    article.append(topline, snippet, meta);

    if (entry.score) {
      const score = document.createElement("p");
      score.className = "history-score";
      score.textContent = `Score ${entry.score.correct}/${entry.score.total} | ${entry.score.accuracy}% accuracy | ${entry.score.errors} errors`;
      article.append(score);
    }

    elements.historyList.append(article);
  }
}

function exportHistory(format) {
  if (!state.history.length) {
    return;
  }

  const payload = format === "json" ? createJsonExport() : createCsvExport();
  const mimeType = format === "json" ? "application/json" : "text/csv;charset=utf-8";
  const blob = new Blob([payload], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `morse-history-${new Date().toISOString().slice(0, 10)}.${format}`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function createJsonExport() {
  return JSON.stringify(state.history, null, 2);
}

function createCsvExport() {
  const header = [
    "timestamp",
    "lesson",
    "seed",
    "playedCount",
    "playedText",
    "transcriptionMode",
    "scoreCorrect",
    "scoreTotal",
    "accuracy",
    "errors",
    "wpmEstimate",
  ];

  const rows = state.history.map((entry) => {
    const score = entry.score || {};
    return [
      entry.timestamp,
      entry.lessonLabel,
      entry.seedUsed,
      entry.playedCount,
      entry.playedText,
      entry.transcriptionMode,
      score.correct ?? "",
      score.total ?? "",
      score.accuracy ?? "",
      score.errors ?? "",
      score.wpmEstimate ?? "",
    ]
      .map(csvEscape)
      .join(",");
  });

  return [header.join(","), ...rows].join("\n");
}

function csvEscape(value) {
  const stringValue = String(value);
  return `"${stringValue.replace(/"/g, "\"\"")}"`;
}

function renderSessionStatus(overrideText = "") {
  if (overrideText) {
    elements.sessionStatusText.textContent = overrideText;
  } else if (state.status === "playing" && state.session) {
    elements.sessionStatusText.textContent = sessionStatusLabel();
  } else if (state.status === "paused" && state.session) {
    elements.sessionStatusText.textContent = `Paused | ${state.session.playedChars.length}/${state.session.plannedChars.length} completed`;
  } else {
    elements.sessionStatusText.textContent = "Ready to start.";
  }

  if (state.session) {
    elements.playedCountText.textContent = `${state.session.playedChars.length} / ${state.session.plannedChars.length}`;
    elements.seedUsedText.textContent = state.session.seedUsed;
  } else {
    elements.playedCountText.textContent = "0 / 0";
    elements.seedUsedText.textContent = "-";
  }

  elements.modeText.textContent = elements.transcriptionToggle.checked ? "Transcription" : "Listening";
  updateCurrentCharacterVisibility();
}

function sessionStatusLabel() {
  if (!state.session) {
    return "Ready to start.";
  }

  if (state.session.phase === "prestart") {
    return "Playing warm-up text...";
  }

  return `Playing ${state.session.playedChars.length}/${state.session.plannedChars.length} completed`;
}

function setControlsForSession(isRunning) {
  const inputs = elements.settingsForm.querySelectorAll("input, select");
  inputs.forEach((input) => {
    input.disabled = isRunning;
  });

  elements.startButton.disabled = isRunning;
  elements.pauseButton.disabled = !isRunning;
  elements.stopButton.disabled = !isRunning;
  updatePauseButtonLabel();
}

function updatePauseButtonLabel() {
  elements.pauseButton.textContent = state.status === "paused" ? "Resume" : "Pause";
}

function renderCurrentCharacter(character) {
  const hasLiveSession = state.session && (state.status === "playing" || state.status === "paused");
  if (!hasLiveSession) {
    elements.currentCharacterBox.textContent = "-";
    updateCurrentCharacterVisibility();
    return;
  }

  const playedText = state.session.playedChars.join("");
  const liveText = `${playedText}${character || ""}`;
  elements.currentCharacterBox.textContent = liveText
    ? formatGrouped(liveText, state.session.settings.groupSize)
    : "-";
  elements.currentCharacterBox.scrollTop = elements.currentCharacterBox.scrollHeight;
  updateCurrentCharacterVisibility();
}

function updateCurrentCharacterVisibility() {
  const shouldShow =
    elements.showCurrentToggle.checked &&
    !elements.transcriptionToggle.checked &&
    (state.status === "playing" || state.status === "paused");

  elements.currentCharacterPanel.classList.toggle("is-hidden", !shouldShow);
}

function renderKeyboard(activeCharacters) {
  elements.keyboardPanel.textContent = "";
  const fragment = document.createDocumentFragment();
  for (const char of activeCharacters) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "key-button";
    button.dataset.key = char;
    button.textContent = char;
    fragment.append(button);
  }

  ["SKIP", "BACKSPACE", "CLEAR"].forEach((control) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "key-button";
    button.dataset.key = control;
    button.textContent =
      control === "BACKSPACE"
        ? "Backspace"
        : control === "SKIP"
          ? "Skip"
          : "Clear";
    fragment.append(button);
  });

  elements.keyboardPanel.append(fragment);
}

function insertTranscriptionCharacter(character) {
  if (!state.session || !state.session.settings.transcriptionMode) {
    return;
  }

  const slotIndex = state.session.transcriptionCursor;
  state.session.transcriptionSlots[slotIndex] = normalizeTypedInput(character).slice(0, 1);
  moveTranscriptionCursor(
    Math.min(slotIndex + 1, state.session.transcriptionSlots.length - 1),
    false
  );
  renderTranscriptionSlots();
  elements.transcriptionGrid.focus();
}

function deleteTranscriptionCharacter() {
  if (!state.session || !state.session.settings.transcriptionMode) {
    return;
  }

  const slotIndex = state.session.transcriptionCursor;
  if (state.session.transcriptionSlots[slotIndex]) {
    state.session.transcriptionSlots[slotIndex] = "";
    renderTranscriptionSlots();
    elements.transcriptionGrid.focus();
    return;
  }

  if (slotIndex === 0) {
    return;
  }

  moveTranscriptionCursor(slotIndex - 1, false);
  state.session.transcriptionSlots[state.session.transcriptionCursor] = "";
  renderTranscriptionSlots();
  elements.transcriptionGrid.focus();
}

function skipTranscriptionSlot() {
  if (!state.session || !state.session.settings.transcriptionMode) {
    return;
  }

  moveTranscriptionCursor(
    Math.min(state.session.transcriptionCursor + 1, state.session.transcriptionSlots.length - 1),
    false
  );
  renderTranscriptionSlots();
  elements.transcriptionGrid.focus();
}

function clearTranscriptionSlots() {
  if (!state.session || !state.session.settings.transcriptionMode) {
    return;
  }

  state.session.transcriptionSlots = Array(state.session.transcriptionSlots.length).fill("");
  state.session.transcriptionCursor = 0;
  renderTranscriptionSlots();
  elements.transcriptionGrid.focus();
}

function moveTranscriptionCursor(nextIndex, shouldRender = true) {
  if (!state.session || !state.session.settings.transcriptionMode) {
    return;
  }

  const clampedIndex = Math.max(0, Math.min(nextIndex, state.session.transcriptionSlots.length - 1));
  state.session.transcriptionCursor = clampedIndex;
  if (shouldRender) {
    renderTranscriptionSlots();
  }
}

function handleTranscriptionKeydown(event) {
  if (!state.session || !state.session.settings.transcriptionMode) {
    return;
  }

  const allowedCharacters = new Set([...state.session.settings.activeCharacters]);
  const normalizedKey = normalizeTypedInput(event.key);

  if (event.key === "ArrowRight" || event.key === " ") {
    event.preventDefault();
    skipTranscriptionSlot();
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    moveTranscriptionCursor(state.session.transcriptionCursor - 1);
    return;
  }

  if (event.key === "Backspace") {
    event.preventDefault();
    deleteTranscriptionCharacter();
    return;
  }

  if (event.key === "Delete") {
    event.preventDefault();
    state.session.transcriptionSlots[state.session.transcriptionCursor] = "";
    renderTranscriptionSlots();
    return;
  }

  if (normalizedKey.length === 1 && allowedCharacters.has(normalizedKey)) {
    event.preventDefault();
    insertTranscriptionCharacter(normalizedKey);
  }
}

function renderTranscriptionSlots() {
  elements.transcriptionGrid.textContent = "";

  if (!elements.transcriptionToggle.checked) {
    return;
  }

  const session = state.session;
  const slotCount = session
    ? session.transcriptionSlots.length
    : Number(elements.characterCountInput.value) || 0;
  const groupSize = session ? session.settings.groupSize : Number(elements.groupSizeInput.value) || 1;
  const slots = session ? session.transcriptionSlots : Array(slotCount).fill("");
  const activeIndex = session ? session.transcriptionCursor : -1;
  const isPreview = !session || !session.settings.transcriptionMode;

  const fragment = document.createDocumentFragment();
  for (let groupStart = 0; groupStart < slotCount; groupStart += groupSize) {
    const groupElement = document.createElement("div");
    groupElement.className = "transcription-group";

    for (let slotIndex = groupStart; slotIndex < Math.min(groupStart + groupSize, slotCount); slotIndex += 1) {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "transcription-slot";
      if (slots[slotIndex]) {
        slot.classList.add("has-value");
      }
      if (slotIndex === activeIndex && (state.status === "playing" || state.status === "paused")) {
        slot.classList.add("is-active");
      }
      if (isPreview) {
        slot.classList.add("is-preview");
      }
      slot.dataset.slotIndex = String(slotIndex);
      slot.textContent = slots[slotIndex] || " ";
      groupElement.append(slot);
    }

    fragment.append(groupElement);
  }

  elements.transcriptionGrid.append(fragment);
}

function formatTranscriptionSlotsDisplay(slots, groupSize, emptyPlaceholder = "") {
  const groups = [];
  for (let index = 0; index < slots.length; index += groupSize) {
    const group = slots
      .slice(index, index + groupSize)
      .map((slot) => slot || emptyPlaceholder)
      .join("");
    groups.push(group);
  }

  return groups.join(" ").trim();
}

function generatePlannedCharacters(activeCharacters, count, random) {
  const pool = [...activeCharacters];
  const result = [];
  for (let index = 0; index < count; index += 1) {
    const pick = Math.floor(random() * pool.length);
    result.push(pool[pick]);
  }
  return result;
}

function formatGrouped(text, groupSize) {
  if (!text) {
    return "";
  }

  const groups = [];
  for (let index = 0; index < text.length; index += groupSize) {
    groups.push(text.slice(index, index + groupSize));
  }
  return groups.join(" ");
}

function formatTimestamp(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(timestamp));
}

function dotDurationMs(wpm) {
  return 1200 / wpm;
}

function generateSeed() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID().slice(0, 8);
  }

  return `seed-${Date.now().toString(36)}`;
}

function createSeededRandom(seed) {
  const seedHash = xmur3(seed);
  return mulberry32(seedHash());
}

function xmur3(str) {
  let hash = 1779033703 ^ str.length;
  for (let index = 0; index < str.length; index += 1) {
    hash = Math.imul(hash ^ str.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return function hashSeed() {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    hash ^= hash >>> 16;
    return hash >>> 0;
  };
}

function mulberry32(seed) {
  return function random() {
    let next = (seed += 0x6d2b79f5);
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

init();
