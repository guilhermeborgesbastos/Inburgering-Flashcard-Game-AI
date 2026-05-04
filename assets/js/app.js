// Inburgering Dutch Vocabulary Flashcard Game - Application Logic

const CARDS_DATA_URL = 'assets/data/cards.json';

// Initialize state
const DEFAULT_CATEGORY = 'general';
let allCards = [];
let filteredCards = [];
let currentIndex = 0;
let isFlipped = false;

// DOM elements
const card = document.getElementById('card');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const categoryFilter = document.getElementById('category-filter');
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const currentCategoryElement = document.getElementById('current-category');
const remainingCardsElement = document.getElementById('remaining-cards');
const progressPercentage = document.getElementById('progress-percentage');
const progressCounter = document.getElementById('progress-counter');
const progressBarFill = document.querySelector('.progress-bar-fill');
const playWordBtn = document.getElementById('play-word-btn');
const playExampleBtn = document.getElementById('play-example-btn');

// Speech synthesis setup
const synth = window.speechSynthesis;
let isSpeaking = false;
let speechRate = 1; // Default: normal speed

function titleCaseCategory(value) {
  return String(value || DEFAULT_CATEGORY)
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word ? word[0].toUpperCase() + word.slice(1) : '')
    .join(' ');
}

function resetCardFlip() {
  isFlipped = false;
  card.classList.remove('flip');
}

function updateButtons() {
  const hasCards = filteredCards.length > 0;
  nextBtn.disabled = !hasCards;
  prevBtn.disabled = !hasCards;
  shuffleBtn.disabled = filteredCards.length < 2;
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
  isFlipped = true;
  card.classList.add('flip');
  cardFront.textContent = 'Could not load cards';
  cardBack.innerHTML = `<strong>${error.message}</strong><br/><br/><small>Make sure assets/data/cards.json is available from the same site.</small>`;
  currentCategoryElement.textContent = '-';
  remainingCardsElement.textContent = '0 cards';
  progressPercentage.textContent = '0%';
  progressCounter.textContent = '0 / 0 cards';
  progressBarFill.style.width = '0%';
  updateButtons();
}

function updateCard() {
  if (!filteredCards.length) {
    cardFront.textContent = 'No cards found';
    cardBack.innerHTML = '<strong>No cards match this category.</strong><br/><br/><small>Choose another category or switch back to All categories.</small>';
    currentCategoryElement.textContent = '-';
    remainingCardsElement.textContent = '0 cards';
    updateButtons();
    return;
  }

  const item = filteredCards[currentIndex];
  cardFront.textContent = item.word;
  cardBack.innerHTML = `<strong>${item.translation}</strong><br/><br/>` +
    `<em>${item.example}</em><br/><small>${item.exampleTranslation}</small>`;
  
  // Update card info
  currentCategoryElement.textContent = titleCaseCategory(item.category);
  remainingCardsElement.textContent = `${filteredCards.length - currentIndex - 1} cards`;
  
  // Update progress
  const percentage = Math.round((currentIndex + 1) / filteredCards.length * 100);
  progressPercentage.textContent = percentage + '%';
  progressCounter.textContent = `${currentIndex + 1} / ${filteredCards.length} cards`;
  progressBarFill.style.width = percentage + '%';
  
  updateButtons();
}

function flipCard() {
  if (!filteredCards.length) {
    return;
  }

  isFlipped = !isFlipped;
  if (isFlipped) {
    card.classList.add('flip');
  } else {
    card.classList.remove('flip');
  }
}

function nextCard() {
  if (!filteredCards.length) {
    return;
  }

  currentIndex = (currentIndex + 1) % filteredCards.length;
  resetCardFlip();
  updateCard();
}

function prevCard() {
  if (!filteredCards.length) {
    return;
  }

  currentIndex = (currentIndex - 1 + filteredCards.length) % filteredCards.length;
  resetCardFlip();
  updateCard();
}

function shuffleCards() {
  if (filteredCards.length < 2) {
    return;
  }

  for (let i = filteredCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filteredCards[i], filteredCards[j]] = [filteredCards[j], filteredCards[i]];
  }
  currentIndex = 0;
  resetCardFlip();
  updateCard();
}

function applyCategoryFilter() {
  const selectedCategory = categoryFilter.value;
  filteredCards = selectedCategory === 'all'
    ? [...allCards]
    : allCards.filter((item) => item.category === selectedCategory);
  currentIndex = 0;
  resetCardFlip();
  updateCard();
}

function populateCategoryFilter() {
  const categories = [...new Set(allCards.map((item) => item.category))].sort();
  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = titleCaseCategory(category);
    categoryFilter.appendChild(option);
  });
}

function speak(text, isWord = false) {
  // Cancel any ongoing speech
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'nl-NL'; // Dutch language
  utterance.rate = speechRate;
  utterance.pitch = 1;
  utterance.volume = 1;

  const btn = isWord ? playWordBtn : playExampleBtn;

  utterance.onstart = function() {
    isSpeaking = true;
    btn.classList.add('playing');
    btn.disabled = true;
  };

  utterance.onend = function() {
    isSpeaking = false;
    btn.classList.remove('playing');
    btn.disabled = false;
  };

  utterance.onerror = function() {
    isSpeaking = false;
    btn.classList.remove('playing');
    btn.disabled = false;
  };

  synth.speak(utterance);
}

function playWordPronunciation() {
  if (!filteredCards.length || isSpeaking) return;
  if (isFlipped) {
    flipCard();
  }
  const currentCard = filteredCards[currentIndex];
  speak(currentCard.word, true);
}

function playExamplePronunciation() {
  if (!filteredCards.length || isSpeaking) return;
  if (!isFlipped) {
    flipCard();
  }
  const currentCard = filteredCards[currentIndex];
  speak(currentCard.example, false);
}

// Event listeners
card.addEventListener('click', flipCard);
nextBtn.addEventListener('click', nextCard);
prevBtn.addEventListener('click', prevCard);
shuffleBtn.addEventListener('click', shuffleCards);
categoryFilter.addEventListener('change', applyCategoryFilter);
playWordBtn.addEventListener('click', playWordPronunciation);
playExampleBtn.addEventListener('click', playExamplePronunciation);

// Speed control listeners
document.querySelectorAll('input[name="speech-speed"]').forEach(radio => {
  radio.addEventListener('change', function() {
    if (this.value === 'slow') {
      speechRate = 0.5;
    } else if (this.value === 'slower') {
      speechRate = 0.75;
    } else {
      speechRate = 1;
    }
  });
});

async function initializeApp() {
  try {
    await loadCards();
    populateCategoryFilter();
    updateCard();
  } catch (error) {
    showLoadError(error);
  }
}

// Initialize the interface
initializeApp();

