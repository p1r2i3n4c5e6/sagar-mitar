/**
 * Multilingual Web Speech API wrapper.
 * Falls back to English if dialect voices are unavailable.
 */
import type { Language } from '../types';

const LANG_BCP47: Record<Language, string> = {
  ta: 'ta-IN',
  te: 'te-IN',
  hi: 'hi-IN',
  ml: 'ml-IN',
  bn: 'bn-IN',
};

export function speakAdvisory(text: string, lang: Language): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG_BCP47[lang] || 'ta-IN';
  utterance.rate = 0.88;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Try to match available voices
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find((v) => v.lang.startsWith(utterance.lang.split('-')[0]));
  if (match) utterance.voice = match;

  window.speechSynthesis.speak(utterance);
}

export function stopSpeech(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

/** Build a spoken advisory string from recommendation data */
export function buildAdvisoryText(
  lang: Language,
  captainName: string,
  zoneName: string,
  bearingDeg: number,
  distNm: number,
  waveHeight: number
): string {
  const texts: Record<Language, string> = {
    ta: `வணக்கம் ${captainName}. ${zoneName} மீன்பிடி தொடங்கவும். திசை ${bearingDeg} டிகிரி. தூரம் ${distNm} கடல் மைல். அலை உயரம் ${waveHeight} மீட்டர்.`,
    te: `నమస్కారం ${captainName}. ${zoneName} వైపు వెళ్ళండి. దిశ ${bearingDeg} డిగ్రీలు. దూరం ${distNm} నాటికల్ మైళ్ళు. అలల ఎత్తు ${waveHeight} మీటర్.`,
    hi: `नमस्ते ${captainName}. ${zoneName} की ओर जाइए. कोण ${bearingDeg} डिग्री. दूरी ${distNm} नॉटिकल मील. लहर ऊंचाई ${waveHeight} मीटर.`,
    ml: `നമസ്കാരം ${captainName}. ${zoneName} ലക്ഷ്യമാക്കി പോകുക. ദിശ ${bearingDeg} ഡിഗ്രി. ദൂരം ${distNm} നോട്ടിക്കൽ മൈൽ. തിര ഉയരം ${waveHeight} മീറ്റർ.`,
    bn: `নমস্কার ${captainName}. ${zoneName} যান। দিক ${bearingDeg} ডিগ্রি। দূরত্ব ${distNm} নটিক্যাল মাইল। ঢেউ উচ্চতা ${waveHeight} মিটার।`,
  };
  return texts[lang] || texts.ta;
}
