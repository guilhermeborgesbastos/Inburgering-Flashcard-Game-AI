# Inburgering Flashcard Game (AI Content Generated)

> **Inburgering Flashcard Game** is a browser-based memory game designed to help learners master key Dutch vocabulary and phrases for the inburgering exam (A1/A2 levels). Built with plain HTML, CSS, and JavaScript, it presents flashcards pairing Dutch words with English translations and example sentences. The game supports card flipping, shuffling, navigation controls, and external JSON card data for easier updates.

**Live Demo:** [https://inburgering.guilhermeborgesbastos.com/](https://inburgering.guilhermeborgesbastos.com/)

**P.S:** The goal here is not to be the "state of art" on technical side but to address the problem in a pragmatic way ;)

## 🎬 Demo

https://github.com/user-attachments/assets/3f56d830-4575-4166-aa8c-6bd50c473e5c

## 🎯 Purpose

This project was created quickly using LLMs to address my personal need: **Learning Dutch vocabulary efficiently for the inburgering exam.**

## 🚀 Features

- Essential A1/A2 Dutch vocabulary
- Example sentences for real usage
- Simple flashcard interface (flip, next, previous, shuffle)
- 🔊 **Dutch pronunciation playback** - Listen to Dutch pronunciation with adjustable speed (Normal, Slower -25%, Slow -50%)
- Category filtering for targeted learning, with the number of cards per category
- Swipe gestures on touch screens and keyboard shortcuts on desktop
- **Saved progress** - Your place in each deck is kept in the browser (localStorage), and cards never repeat until you finish the deck or choose **Start over**
- Loads flashcard data from `assets/data/cards.json`
- Works on desktop, tablet and phone browsers
- **Modular structure** - Clean separation of concerns for easy maintenance and deployment

## ▶️ How to Use

1. Open the `index.html` file in any modern browser
2. Tap the card or **Reveal meaning** to see the translation and an example sentence
3. Select your preferred **pronunciation speed** (1×, 0.75× or 0.5×)
4. Use the **🔊 Word** and **🔊 Phrase** buttons to listen to Dutch pronunciation
5. Pick a **category** to study only one type of vocabulary, or **All** for the full deck
6. Use **Previous**, **Next** and **Shuffle** to browse cards within the current selection; **Shuffle** only mixes the cards you haven't studied yet
7. On touch screens, swipe the card left or right; on desktop, press <kbd>Space</kbd> to flip and <kbd>←</kbd> <kbd>→</kbd> to move
8. Close the page whenever you like: each deck reopens where you left off. After the last card you'll see **Deck complete**; use **Start over** there, or next to the cards-left count at any time, to restart the current deck

## ⚠️ Notes

- On iPad/iOS, open via a browser (e.g., Chrome/Edge) or host it online  
- Directly opening `index.html` from the filesystem may not load `assets/data/cards.json`; use S3/CloudFront or a local static server. Or place the JSON content within the app.js file, directly.
- On Safari Files preview will not execute JavaScript
- **Audio pronunciation** uses the browser's built-in text-to-speech engine (Web Speech API). Quality depends on your system's speech synthesis capabilities. Most modern browsers on desktop and mobile support this feature. For best results, use Chrome, Edge, or Firefox.

## 📦 Tech Stack

- HTML5
- CSS3 (modular stylesheet)
- Vanilla JavaScript (modular script with external JSON data)

## 💡 Future Improvements

- Add more vocabulary levels (A2 → B1)
- Add spaced repetition
- Add sentence rhythm and pronunciation tips
