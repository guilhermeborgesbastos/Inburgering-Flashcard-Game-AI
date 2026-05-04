# Inburgering Flashcard Game (AI Content Generated)

> **Inburgering Flashcard Game** is a browser-based memory game designed to help learners master key Dutch vocabulary and phrases for the inburgering exam (A1/A2 levels). Built with plain HTML, CSS, and JavaScript, it presents flashcards pairing Dutch words with English translations and example sentences. The game supports card flipping, shuffling, navigation controls, and external JSON card data for easier updates.

**P.S:** The goal here is not to be the "state of art" on technical side but to address the problem in a pragmatic way ;)

## 🎯 Purpose

This project was created quickly using LLMs to address my personal need: **Learning Dutch vocabulary efficiently for the inburgering exam.**

## 🚀 Features

- Essential A1/A2 Dutch vocabulary
- Example sentences for real usage
- Simple flashcard interface (flip, next, previous, shuffle)
- 🔊 **Dutch pronunciation playback** - Listen to Dutch pronunciation with adjustable speed (Normal, Slower -25%, Slow -50%)
- Category filtering for targeted learning
- Loads flashcard data from `assets/data/cards.json`
- Works on desktop and tablet browsers
- **Modular structure** - Clean separation of concerns for easy maintenance and deployment

## ▶️ How to Use

1. Open the `index.html` file in any modern browser
2. Click or tap the card to reveal the translation and phrase example
3. Select your preferred **pronunciation speed** (Normal, Slower -25%, or Slow -50%)
4. Use the **🔊 Pronounce Word** and **🔊 Pronounce Phrase** buttons to listen to Dutch pronunciation
5. Use the **Category** filter to study all cards or only a specific type of vocabulary
6. Use **Previous**, **Next**, and **Shuffle** to browse cards within the current selection
7. Leave the filter on **All categories** to use the original full-deck behavior

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
- Add progress tracking/persistence with localStorage
