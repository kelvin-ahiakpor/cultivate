import { NextRequest, NextResponse } from "next/server";

const KHAYA_API_KEY = process.env.KHAYA_API_KEY; // Ghana NLP translation API

export async function POST(req: NextRequest) {
  try {
    const { text, from, to } = await req.json();

    if (!text || !to) {
      return NextResponse.json(
        { error: "Missing required fields: text, to" },
        { status: 400 }
      );
    }

    // Check if Khaya API key is available
    if (!KHAYA_API_KEY) {
      return NextResponse.json(
        { error: 'Translation service not configured. Add KHAYA_API_KEY to environment variables.' },
        { status: 503 }
      );
    }

    console.log('Using Khaya API for translation...');

    // Khaya uses language pair format: "en-tw" for English to Twi
    const langPair = from === 'auto' ? `auto-${to}` : `${from}-${to}`;

    const khayaUrl = 'https://translation-api.ghananlp.org/v1/translate';
    const khayaResponse = await fetch(khayaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': KHAYA_API_KEY,
      },
      body: JSON.stringify({
        in: text,
        lang: langPair,
      }),
    });

    const khayaData = await khayaResponse.json();
    console.log('Khaya API response:', JSON.stringify(khayaData, null, 2));

    // Khaya returns the translated text directly as a string
    if (typeof khayaData === 'string' && khayaData.length > 0) {
      return NextResponse.json({
        translatedText: khayaData,
        detectedLanguage: from,
      });
    }

    // If it's an object with translatedText field (alternative format)
    if (khayaData && khayaData.translatedText) {
      return NextResponse.json({
        translatedText: khayaData.translatedText,
        detectedLanguage: from,
      });
    }

    // Log error if Khaya failed
    console.error('Khaya API error:', khayaData);
    throw new Error('Khaya translation failed: ' + (khayaData.message || 'no translation in response'));
  } catch (error) {
    console.error('Translation API error:', error);
    return NextResponse.json(
      { error: 'Translation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
