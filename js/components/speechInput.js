// Speech-to-text mic button — progressive enhancement over the note input.
// Returns null when the Web Speech API is unavailable (the chips + keyboard
// remain the baseline). Recognition is server-backed on iOS: needs network.
import { el } from '../utils/dom.js';
import { STRINGS } from '../constants.js';
import { showToast } from './toast.js';

export function speechButton(onResult) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  let listening = false;
  let recognition = null;

  const btn = el('button', {
    type: 'button',
    class: 'btn mic-btn',
    'aria-label': STRINGS.micLabel,
  }, '🎤');

  function stopUi() {
    listening = false;
    btn.classList.remove('is-listening');
  }

  btn.addEventListener('click', () => {
    if (listening) {
      recognition.stop();
      return;
    }
    recognition = new SpeechRecognition();
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      if (text) onResult(text);
    };
    recognition.onerror = (event) => {
      stopUi();
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        showToast(STRINGS.micError);
      }
    };
    recognition.onend = stopUi;
    try {
      recognition.start();
      listening = true;
      btn.classList.add('is-listening');
    } catch (err) {
      stopUi();
      showToast(STRINGS.micError);
    }
  });

  return btn;
}
