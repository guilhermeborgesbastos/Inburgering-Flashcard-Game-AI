# Browser regression checks

Serve the repository root over HTTP and open `/scripts/tests/regression.html`.
The page runs 43 checks against the current app HTML, JavaScript, CSS and vocabulary.
Results appear at the top. Reload or choose **Run again** after changes.

Coverage includes deck navigation and wraparound, revealing, all category counts,
filtered shuffling, keyboard and synthetic swipe events, speech rate/language,
duplicate playback and cancellation races, unavailable speech, loading failures,
empty data, and all card fronts/back widths at 320, 390, 768 and 1280 pixels.

Speech is mocked and analytics scripts are removed from fixtures. This does not
verify audible pronunciation, physical touch gestures, Safari/iOS behavior or
screen-reader output. Supplement it with real-device checks before release.

When updating app.js or style.css, update the corresponding `?v=` value to the first
12 hex characters of the file's SHA-256 (`sha256sum assets/js/app.js | cut -c1-12`)
in index.html so returning browsers cannot mix old assets with new markup.

The existing deployment script excludes scripts/, including this test page.
