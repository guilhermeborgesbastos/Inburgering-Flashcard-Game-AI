// Inburgering Dutch Vocabulary Flashcard Game - Application Logic

const CARDS_DATA_URL = 'assets/data/cards.json';
const GA_MEASUREMENT_ID = 'G-21RSDRNMG3';

function trackEvent(action, category, label, value) {
  if (typeof window.gtag !== 'function') return;
  const params = {
    event_category: category,
    event_label: label,
  };
  if (typeof value !== 'undefined') {
    params.value = value;
  }
  window.gtag('event', action, params);
}

function trackPageView(path = window.location.pathname) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', {
    page_path: path,
  });
}

// Initialize state
const DEFAULT_CATEGORY = 'general';
const LONG_WORD_LENGTH = 22;
const SWIPE_THRESHOLD = 50;
let allCards = [];
let filteredCards = [];
let currentIndex = 0;
let isFlipped = false;
let selectedCategory = 'all';

// Progress is kept per deck ('all' or a category): card keys in study order plus the index of the
// current card. index === order.length means the deck is finished. Saved in localStorage.
const STORAGE_KEY = 'inburgering-progress-v1';
const START_OVER_CONFIRM_MS = 4000;
let decks = {};
let startOverTimer = null;
let progressReady = false; // never save before the stored progress has been restored

// DOM elements
const card = document.getElementById('card');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const categoryFilter = document.getElementById('category-filter');
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const revealBtn = document.getElementById('reveal-btn');
const startOverBtn = document.getElementById('start-over-btn');
const remainingCardsElement = document.getElementById('remaining-cards');
const progressPercentage = document.getElementById('progress-percentage');
const progressCounter = document.getElementById('progress-counter');
const progressBar = document.getElementById('progress-bar');
const progressBarFill = document.querySelector('.progress-bar-fill');
const tipText = document.getElementById('tip-text');
const playWordBtn = document.getElementById('play-word-btn');
const playExampleBtn = document.getElementById('play-example-btn');

// Speech synthesis setup
const synth = window.speechSynthesis;
const speechSupported = Boolean(synth && typeof window.SpeechSynthesisUtterance === 'function');
const audioStatus = document.getElementById('audio-status');
let activeUtterance = null;
let isSpeaking = false;
let speechRate = 1; // Default: normal speed

function titleCaseCategory(value) {
  return String(value || DEFAULT_CATEGORY)
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word ? word[0].toUpperCase() + word.slice(1) : '')
    .join(' ');
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (typeof text !== 'undefined') element.textContent = text;
  return element;
}

function cardKey(item) {
  return `${item.category}|${item.word}`;
}

function isFinished() {
  return filteredCards.length > 0 && currentIndex >= filteredCards.length;
}

function cardsForCategory(category) {
  return category === 'all' ? allCards : allCards.filter((item) => item.category === category);
}

// Rebuilds a deck from its saved state against the current card data: cards that no longer
// exist are dropped (keeping how many seen cards remain), and new cards join the end unseen.
function syncDeck(category) {
  const cards = cardsForCategory(category);
  const byKey = new Map(cards.map((item) => [cardKey(item), item]));
  const saved = decks[category];
  let order = cards.map(cardKey);
  let index = 0;

  if (saved && Array.isArray(saved.order) && Number.isInteger(saved.index)) {
    const kept = saved.order.filter((key) => byKey.has(key));
    const known = new Set(kept);
    index = saved.order.slice(0, Math.max(saved.index, 0)).filter((key) => byKey.has(key)).length;
    order = [...kept, ...order.filter((key) => !known.has(key))];
  }

  decks[category] = { order, index: Math.min(index, order.length) };
  return order.map((key) => byKey.get(key));
}

function selectedSpeed() {
  return document.querySelector('input[name="speech-speed"]:checked')?.value || 'normal';
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || saved.version !== 1) return null;
    return saved;
  } catch (error) {
    return null;
  }
}

function saveProgress() {
  if (!progressReady) return;
  if (filteredCards.length && decks[selectedCategory]) {
    decks[selectedCategory].index = currentIndex;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      category: selectedCategory,
      speed: selectedSpeed(),
      decks
    }));
  } catch (error) {
    console.error(`[Flashcards] Could not save study progress to localStorage ("${STORAGE_KEY}"); progress will be lost when the page is closed.`, error);
  }
}

function updateFlipState() {
  card.classList.toggle('flip', isFlipped);
  cardFront.setAttribute('aria-hidden', String(isFlipped));
  cardBack.setAttribute('aria-hidden', String(!isFlipped));
  revealBtn.textContent = isFinished() ? 'Start over' : isFlipped ? 'Show word' : 'Reveal meaning';
  // Name the button from its visible content so screen readers announce the vocabulary.
  card.setAttribute('aria-labelledby', isFlipped ? 'card-back' : 'card-front');
  card.setAttribute('aria-pressed', String(isFlipped));
}

function resetCardFlip() {
  stopSpeech();
  // Jump back to the front without animating, so the next card's meaning is never shown mid-rotation
  card.classList.add('no-transition');
  isFlipped = false;
  updateFlipState();
  void card.offsetWidth;
  card.classList.remove('no-transition');
}

function playEntryAnimation(direction) {
  card.classList.remove('enter-next', 'enter-prev');
  void card.offsetWidth;
  card.classList.add(direction === 'prev' ? 'enter-prev' : 'enter-next');
}

function updateButtons() {
  const hasCards = filteredCards.length > 0;
  const finished = isFinished();
  nextBtn.disabled = !hasCards || finished;
  prevBtn.disabled = !hasCards || currentIndex === 0;
  revealBtn.disabled = !hasCards;
  // Shuffle only mixes the cards not studied yet (the current one included).
  shuffleBtn.disabled = finished || filteredCards.length - currentIndex < 2;
  playWordBtn.disabled = !hasCards || finished || !speechSupported || isSpeaking;
  playExampleBtn.disabled = !hasCards || finished || !speechSupported || isSpeaking;
  startOverBtn.hidden = !hasCards || currentIndex === 0;
}

function setProgress(position, total) {
  const percentage = total ? Math.round(position / total * 100) : 0;
  progressPercentage.textContent = percentage + '%';
  progressCounter.textContent = `${position} / ${total} cards`;
  progressBarFill.style.width = percentage + '%';
  progressBar.setAttribute('aria-valuenow', String(percentage));
  remainingCardsElement.textContent = `${Math.max(total - position, 0)} cards`;
}

function renderMessage(title, detail) {
  cardFront.replaceChildren(
    createElement('p', 'card-message', title),
    createElement('p', 'card-message-detail', detail)
  );
  cardBack.replaceChildren(
    createElement('p', 'card-message', title),
    createElement('p', 'card-message-detail', detail)
  );
}

function normalizeCards(cards) {
  if (!Array.isArray(cards)) {
    throw new Error('Cards data must be an array.');
  }

  return cards.map((item) => ({
    ...item,
    category: item.category || DEFAULT_CATEGORY
  }));
}

async function loadCards() {
  const response = await fetch(CARDS_DATA_URL);

  if (!response.ok) {
    throw new Error(`Could not load cards data: ${response.status}`);
  }

  allCards = normalizeCards(await response.json());
  filteredCards = [...allCards];
}

function showLoadError(error) {
  isFlipped = false;
  updateFlipState();
  renderMessage('Could not load cards', `${error.message}. Make sure assets/data/cards.json is available from the same site.`);
  setProgress(0, 0);
  updateButtons();
}

function updateCard() {
  cancelStartOverConfirm();
  if (!filteredCards.length) {
    renderMessage('No cards found', 'No cards match this category. Choose another category or switch back to All.');
    setProgress(0, 0);
    updateButtons();
    return;
  }

  if (isFinished()) {
    const deckName = selectedCategory === 'all' ? '' : ` ${titleCaseCategory(selectedCategory)}`;
    renderMessage('Deck complete', `You've gone through all ${filteredCards.length}${deckName} cards. Start over to study them again, or choose another category.`);
    setProgress(filteredCards.length, filteredCards.length);
    updateFlipState();
    updateButtons();
    return;
  }

  const item = filteredCards[currentIndex];
  const category = titleCaseCategory(item.category);

  const word = createElement('p', 'card-word', item.word);
  word.lang = 'nl';
  word.classList.toggle('is-long', item.word.length > LONG_WORD_LENGTH);
  cardFront.replaceChildren(
    createElement('span', 'card-tag', category),
    word,
    createElement('span', 'card-hint', 'Tap to reveal meaning')
  );

  const exampleNl = createElement('p', 'example-nl', item.example);
  exampleNl.lang = 'nl';
  const example = createElement('div', 'card-example');
  example.append(
    createElement('span', 'card-label', 'Example'),
    exampleNl,
    createElement('p', 'example-en', item.exampleTranslation)
  );
  const translation = createElement('p', 'card-translation', item.translation);
  translation.classList.toggle('is-long', item.translation.length > LONG_WORD_LENGTH);
  cardBack.replaceChildren(
    createElement('span', 'card-tag', category),
    createElement('span', 'card-label', 'Meaning'),
    translation,
    example
  );
  cardBack.scrollTop = 0;

  setProgress(currentIndex + 1, filteredCards.length);
  updateButtons();
}

function flipCard() {
  if (!filteredCards.length || isFinished()) {
    return;
  }

  isFlipped = !isFlipped;
  updateFlipState();
  if (isFlipped) {
    trackEvent('flip_card', 'Flashcard', filteredCards[currentIndex]?.word || 'unknown');
  }
}

function nextCard() {
  // No wrap-around: after the last card the deck is finished until the user starts over.
  if (!filteredCards.length || isFinished()) {
    return;
  }

  currentIndex += 1;
  resetCardFlip();
  updateCard();
  playEntryAnimation('next');
  saveProgress();
  if (isFinished()) {
    trackEvent('deck_complete', 'Flashcard', titleCaseCategory(selectedCategory), filteredCards.length);
  } else {
    trackEvent('next_card', 'Flashcard', filteredCards[currentIndex]?.word || 'unknown');
  }
}

function prevCard() {
  if (!filteredCards.length || currentIndex === 0) {
    return;
  }

  currentIndex -= 1;
  resetCardFlip();
  updateCard();
  playEntryAnimation('prev');
  saveProgress();
  trackEvent('previous_card', 'Flashcard', filteredCards[currentIndex]?.word || 'unknown');
}

function shuffleCards() {
  const remaining = filteredCards.length - currentIndex;
  if (isFinished() || remaining < 2) {
    return;
  }

  // Cards before the current one were already studied; only the rest is reshuffled.
  for (let i = filteredCards.length - 1; i > currentIndex; i--) {
    const j = currentIndex + Math.floor(Math.random() * (i - currentIndex + 1));
    [filteredCards[i], filteredCards[j]] = [filteredCards[j], filteredCards[i]];
  }
  decks[selectedCategory].order = filteredCards.map(cardKey);
  resetCardFlip();
  updateCard();
  playEntryAnimation('next');
  saveProgress();
  trackEvent('shuffle_deck', 'Flashcard', `shuffle_${remaining}`);
}

function showDeck(category) {
  filteredCards = syncDeck(category);
  currentIndex = decks[category].index;
}

function applyCategoryFilter() {
  // Each category keeps its own place, so switching never repeats cards.
  showDeck(selectedCategory);
  resetCardFlip();
  updateCard();
  playEntryAnimation('next');
  saveProgress();
  trackEvent('filter_category', 'Flashcard', titleCaseCategory(selectedCategory));
}

function cancelStartOverConfirm() {
  clearTimeout(startOverTimer);
  startOverTimer = null;
  startOverBtn.classList.remove('is-confirming');
  startOverBtn.firstElementChild.textContent = 'Start over';
}

function startOver() {
  if (!filteredCards.length) return;
  cancelStartOverConfirm();
  const studied = Math.min(currentIndex, filteredCards.length);
  delete decks[selectedCategory];
  showDeck(selectedCategory);
  resetCardFlip();
  updateCard();
  playEntryAnimation('next');
  saveProgress();
  trackEvent('start_over', 'Flashcard', titleCaseCategory(selectedCategory), studied);
}

// Resetting mid-deck throws away progress, so the small link asks for a second tap first.
function handleStartOverClick() {
  if (startOverBtn.classList.contains('is-confirming')) {
    startOver();
    return;
  }
  startOverBtn.classList.add('is-confirming');
  startOverBtn.firstElementChild.textContent = 'Confirm reset?';
  startOverTimer = setTimeout(cancelStartOverConfirm, START_OVER_CONFIRM_MS);
}

function handleRevealClick() {
  if (isFinished()) {
    startOver();
  } else {
    flipCard();
  }
}

function createCategoryChip(value, label, count) {
  const chip = createElement('button', 'chip');
  chip.type = 'button';
  chip.dataset.category = value;
  chip.setAttribute('aria-pressed', String(value === selectedCategory));
  chip.append(createElement('span', '', label), createElement('span', 'chip-count', String(count)));
  return chip;
}

function populateCategoryFilter() {
  const counts = allCards.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});
  const categories = Object.keys(counts).sort();
  categoryFilter.replaceChildren(
    createCategoryChip('all', 'All', allCards.length),
    ...categories.map((category) => createCategoryChip(category, titleCaseCategory(category), counts[category]))
  );
}

function selectCategory(event) {
  const chip = event.target.closest('.chip');
  if (!chip || chip.dataset.category === selectedCategory) return;

  selectedCategory = chip.dataset.category;
  categoryFilter.querySelectorAll('.chip').forEach((item) => {
    item.setAttribute('aria-pressed', String(item === chip));
  });
  chip.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  applyCategoryFilter();
}

function setAudioStatus(message) {
  audioStatus.textContent = message;
  audioStatus.hidden = !message;
}

function stopSpeech() {
  // Clear our state before cancellation: some browsers deliver a late error/end event.
  activeUtterance = null;
  isSpeaking = false;
  if (speechSupported) synth.cancel();
  playWordBtn.classList.remove('playing');
  playExampleBtn.classList.remove('playing');
  updateButtons();
}

function speak(text, isWord = false) {
  if (!speechSupported || isSpeaking) return;
  stopSpeech();
  setAudioStatus('');
  const btn = isWord ? playWordBtn : playExampleBtn;

  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'nl-NL';
    utterance.rate = speechRate;
    utterance.pitch = 1;
    utterance.volume = 1;
    activeUtterance = utterance;
    // Lock both controls immediately, before the asynchronous start event.
    isSpeaking = true;
    btn.classList.add('playing');
    updateButtons();

    const finish = (failed = false) => {
      if (activeUtterance !== utterance) return;
      activeUtterance = null;
      isSpeaking = false;
      btn.classList.remove('playing');
      updateButtons();
      if (failed) setAudioStatus('Pronunciation could not play. Please try again or use another browser.');
    };
    utterance.onend = () => finish();
    utterance.onerror = () => finish(true);
    synth.speak(utterance);
  } catch (error) {
    stopSpeech();
    setAudioStatus('Pronunciation could not play. Please try again or use another browser.');
  }
}

function playWordPronunciation() {
  if (!filteredCards.length || isFinished() || isSpeaking) return;
  if (isFlipped) {
    flipCard();
  }
  const currentCard = filteredCards[currentIndex];
  trackEvent('play_word_audio', 'Flashcard', currentCard.word);
  speak(currentCard.word, true);
}

function playExamplePronunciation() {
  if (!filteredCards.length || isFinished() || isSpeaking) return;
  if (!isFlipped) {
    flipCard();
  }
  const currentCard = filteredCards[currentIndex];
  trackEvent('play_example_audio', 'Flashcard', currentCard.word);
  speak(currentCard.example, false);
}

// Swipe left/right on the card to navigate; a tap still flips it
let touchStart = null;
let lastSwipeAt = 0;

function handleTouchStart(event) {
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}

function handleTouchEnd(event) {
  if (!touchStart) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  touchStart = null;

  if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
    lastSwipeAt = Date.now();
    if (dx < 0) {
      nextCard();
    } else {
      prevCard();
    }
  }
}

function handleCardClick() {
  if (Date.now() - lastSwipeAt < 400) return;
  flipCard();
}

function handleCardKeydown(event) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    flipCard();
  }
}

function handleGlobalKeydown(event) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, select, textarea')) return;

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    nextCard();
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    prevCard();
  } else if (event.key === ' ' && event.target === document.body) {
    event.preventDefault();
    flipCard();
  }
}

function showInteractionTip() {
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    tipText.innerHTML = 'Tip: <kbd>Space</kbd> flips the card, <kbd>←</kbd> <kbd>→</kbd> move between words.';
  } else {
    tipText.textContent = 'Tip: Swipe the card left or right to move between words.';
  }
}

// Event listeners
card.addEventListener('click', handleCardClick);
card.addEventListener('keydown', handleCardKeydown);
card.addEventListener('touchstart', handleTouchStart, { passive: true });
card.addEventListener('touchend', handleTouchEnd);
revealBtn.addEventListener('click', handleRevealClick);
startOverBtn.addEventListener('click', handleStartOverClick);
nextBtn.addEventListener('click', nextCard);
prevBtn.addEventListener('click', prevCard);
shuffleBtn.addEventListener('click', shuffleCards);
categoryFilter.addEventListener('click', selectCategory);
playWordBtn.addEventListener('click', playWordPronunciation);
playExampleBtn.addEventListener('click', playExamplePronunciation);
document.addEventListener('keydown', handleGlobalKeydown);

// Speed control listeners
document.querySelectorAll('input[name="speech-speed"]').forEach(radio => {
  radio.addEventListener('change', function() {
    speechRate = rateForSpeed(this.value);
    saveProgress();
  });
});

function rateForSpeed(value) {
  if (value === 'slow') {
    return 0.5;
  } else if (value === 'slower') {
    return 0.75;
  }
  return 1;
}

function restoreProgress(saved) {
  if (!saved) return;
  const categories = new Set(allCards.map((item) => item.category));
  if (saved.decks && typeof saved.decks === 'object') {
    decks = Object.fromEntries(Object.entries(saved.decks).filter(([category]) => category === 'all' || categories.has(category)));
  }
  if (saved.category === 'all' || categories.has(saved.category)) {
    selectedCategory = saved.category;
  }
  const speedInput = document.querySelector(`input[name="speech-speed"][value="${saved.speed}"]`);
  if (speedInput) {
    speedInput.checked = true;
    speechRate = rateForSpeed(saved.speed);
  }
}

async function initializeApp() {
  showInteractionTip();
  updateFlipState();
  updateButtons();
  if (!speechSupported) setAudioStatus('Pronunciation is not supported in this browser. You can still study the cards.');
  try {
    await loadCards();
    restoreProgress(loadProgress());
    populateCategoryFilter();
    categoryFilter.querySelector('.chip[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    showDeck(selectedCategory);
    // An empty deck (e.g. a broken data file) must not overwrite the saved progress.
    progressReady = allCards.length > 0;
    updateCard();
    saveProgress();
  } catch (error) {
    showLoadError(error);
  }
}

// Initialize the interface
initializeApp();
window.addEventListener('load', () => {
  trackPageView();
});
