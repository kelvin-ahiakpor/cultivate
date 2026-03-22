/**
 * Translation Utility for Cultivate
 *
 * Uses DeepL API via backend proxy (free tier: 500k chars/month)
 * Supports Ghanaian languages: Twi, Ewe
 *
 * Set DEEPL_API_KEY in .env (server-side, no NEXT_PUBLIC prefix)
 * API calls go through /api/translate to avoid CORS issues
 */

export type SupportedLanguage = 'en' | 'tw' | 'ee'; // en=English, tw=Twi, ee=Ewe

export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'tw', name: 'Twi', flag: '🇬🇭' },
  { code: 'ee', name: 'Ewe', flag: '🇬🇭' },
] as const;

/**
 * Detect the language of input text
 * Uses a simple heuristic + fallback to English
 */
export async function detectLanguage(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return 'en';

  try {
    // Use MyMemory's detect endpoint (not officially documented, but works)
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|en`
    );

    const data = await response.json();

    // MyMemory returns source language in responseData
    if (data.responseData && data.responseData.match) {
      // Extract source language from match info
      const match = data.matches?.[0];
      if (match?.source) {
        return match.source.substring(0, 2); // Return language code
      }
    }

    // Fallback: simple heuristic
    // Check for common Twi words
    const twiWords = ['mepɛ', 'medua', 'me', 'wo', 'ɔ', 'ɛ', 'nsuo', 'afum'];
    const lowerText = text.toLowerCase();
    const hasTwiCharacters = twiWords.some(word => lowerText.includes(word));

    if (hasTwiCharacters) return 'tw';

    // Default to English
    return 'en';
  } catch (error) {
    console.error('Language detection failed:', error);
    return 'en'; // Default to English on error
  }
}

/**
 * Translate text via backend API (proxies to DeepL/MyMemory)
 * @param text - Text to translate
 * @param from - Source language code (or 'auto' for auto-detect)
 * @param to - Target language code
 */
export async function translate(
  text: string,
  from: string = 'auto',
  to: string = 'en'
): Promise<string> {
  if (!text || text.trim().length === 0) return text;

  // Skip translation if source and target are the same
  if (from === to) return text;

  try {
    // Call our backend API (which proxies to DeepL/MyMemory)
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, from, to }),
    });

    const data = await response.json();

    if (response.ok && data.translatedText) {
      return data.translatedText;
    }

    console.warn('Translation API failed:', data.error);
    return text; // Return original text on error
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Return original text on error
  }
}

/**
 * Translate user message before sending to backend
 * Detects language and translates to English if needed
 */
export async function translateToEnglish(
  text: string,
  userLanguage: string
): Promise<{ translatedText: string; detectedLanguage: string }> {
  // If user language is already English, no translation needed
  if (userLanguage === 'en') {
    return { translatedText: text, detectedLanguage: 'en' };
  }

  // Detect the actual language of the text
  const detectedLang = await detectLanguage(text);

  // If detected language is English, skip translation
  if (detectedLang === 'en') {
    return { translatedText: text, detectedLanguage: 'en' };
  }

  // Translate from detected language to English
  const translated = await translate(text, detectedLang, 'en');
  return { translatedText: translated, detectedLanguage: detectedLang };
}

/**
 * Translate assistant response from English to user's language
 */
export async function translateFromEnglish(
  text: string,
  targetLanguage: string
): Promise<string> {
  // If target language is English, no translation needed
  if (targetLanguage === 'en') return text;

  // Translate from English to target language
  return await translate(text, 'en', targetLanguage);
}
