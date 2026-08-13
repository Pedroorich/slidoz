import { GoogleGenAI, Type } from "@google/genai";

const safeGeminiKey = process.env.GEMINI_API_KEY || "DUMMY_KEY";
const ai = new GoogleGenAI({ apiKey: safeGeminiKey });

export interface CustomLayer {
  id: string;
  type: 'text';
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  fontStyle?: string;
  color: string;
  zIndex: number;
}

export interface SlideData {
  id: string;
  type: 'hero' | 'problem' | 'solution' | 'features' | 'details' | 'how-to' | 'cta' | 'quote' | 'testimonial';
  layoutModel?: 'default' | 'forbes' | 'twitter' | 'frases' | 'ranking' | 'antes_depois' | 'dado_contexto' | 'checklist' | 'depoimento' | 'passo_a_passo' | 'comparativo' | 'citacao_especialista' | 'problema' | 'solucao' | 'timeline';
  background: 'light' | 'dark' | 'brand-gradient';
  backgroundImage?: string;
  imageDescription?: string;
  imageUrl?: string;
  imagePosition?: 'top' | 'center' | 'bottom' | 'background';
  tag?: string;
  title: string;
  content?: string;
  items?: { icon?: string; label: string; description?: string; date?: string }[];
  quote?: { label: string; text: string };
  ctaText?: string;
  alignment: 'left' | 'center' | 'right';
  verticalAlignment?: 'top' | 'center' | 'bottom';
  titleColor?: string;
  contentColor?: string;
  titleFont?: string;
  titleFontSize?: number;
  titleLetterSpacing?: number;
  titleLineHeight?: number;
  titleEffect?: 'none' | 'text-gradient' | 'bg-solid' | 'bg-gradient';
  titleEffectColors?: [string, string];
  bodyFont?: string;
  imageOffsetX?: number;
  imageOffsetY?: number;
  imageScale?: number;
  bgImageOffsetX?: number;
  bgImageOffsetY?: number;
  bgImageOpacity?: number;
  bgGradientOpacity?: number;
  bgGradientPosition?: 'top' | 'bottom';
  extendBackgroundToNext?: boolean;
  customLayers?: CustomLayer[];
  antesTitle?: string;
  antesContent?: string;
  depoisTitle?: string;
  depoisContent?: string;
  bigNumber?: string;
  contextLine?: string;
  implicationLine?: string;
  sourceLine?: string;
  checklistType?: 'positive' | 'negative';
  testimonialName?: string;
  testimonialRole?: string;
  testimonialPhoto?: string;
  comparisonOptionA?: string;
  comparisonOptionB?: string;
  comparisonWinner?: 'none' | 'A' | 'B';
  comparisonVerdict?: string;
  comparisonRows?: { label: string; valueA: 'yes' | 'no' | 'maybe'; valueB: 'yes' | 'no' | 'maybe' }[];
  comparisonImageA?: string;
  comparisonImageB?: string;
  expertName?: string;
  expertRole?: string;
  expertPhoto?: string;
  textOffsetX?: number;
  textOffsetY?: number;
  isClientPhoto?: boolean;
  bgImageScale?: number;
  twitterImages?: string[];
  twitterImageBorderRadius?: number;
  twitterImageHeight?: number;
  forbesQuoteColor?: string;
}

/**
 * Limpa e escapa caracteres de controle não-escapados (como quebras de linha literais \n e \r) dentro de strings JSON.
 * Isso previne o erro clássico "Unterminated string in JSON at position X".
 */
export function cleanJsonControlChars(input: string): string {
  let result = '';
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inString) {
      if (isEscaped) {
        result += char;
        isEscaped = false;
      } else if (char === '\\') {
        result += char;
        isEscaped = true;
      } else if (char === '"') {
        result += char;
        inString = false;
      } else if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else if (char.charCodeAt(0) < 32) {
        result += ' ';
      } else {
        result += char;
      }
    } else {
      if (char === '"') {
        inString = true;
      }
      result += char;
    }
  }

  return result;
}

/**
 * Tenta reparar progressivamente JSONs truncados ou com fechamentos ausentes.
 */
export function repairTruncatedJson<T = any>(input: string): T | null {
  let t = input.trim();
  if (!t) return null;

  // Verifica se há aspas abertas não-fechadas
  let inString = false;
  let isEscaped = false;
  for (let i = 0; i < t.length; i++) {
    const char = t[i];
    if (isEscaped) {
      isEscaped = false;
    } else if (char === '\\') {
      isEscaped = true;
    } else if (char === '"') {
      inString = !inString;
    }
  }

  if (inString) {
    t += '"';
  }

  const isArray = t.startsWith('[');

  // Tentativas de fechamento rápido
  const quickClosures = isArray
    ? [']', '}', '}]', '"}', '"}]', '""}]']
    : ['}', '"}', '""}'];

  for (const c of quickClosures) {
    try {
      return JSON.parse(t + c);
    } catch (_) {}
  }

  // Tenta podar no último separador estrutural válido
  let work = t;
  while (work.length > 5) {
    const lastComma = work.lastIndexOf(',');
    const lastBrace = work.lastIndexOf('}');
    const cutIndex = Math.max(lastComma, lastBrace);
    if (cutIndex <= 0) break;

    work = work.substring(0, cutIndex).trim();
    if (work.endsWith(',')) work = work.substring(0, work.length - 1).trim();

    const closures = [isArray ? ']' : '}', isArray ? '}]' : '}'];
    for (const c of closures) {
      try {
        return JSON.parse(work + c);
      } catch (_) {}
    }
  }

  return null;
}

/**
 * Extração de slides via regex como fallback seguro para modelos que falham no JSON.
 */
export function regexExtractSlides(text: string): SlideData[] {
  const slides: SlideData[] = [];
  const objRegex = /\{[^{}]*?"title"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"[^{}]*?\}/gs;
  let match;
  while ((match = objRegex.exec(text)) !== null) {
    try {
      const fixedObj = cleanJsonControlChars(match[0]);
      const parsed = JSON.parse(fixedObj);
      if (parsed.title) {
        slides.push(parsed);
      }
    } catch (_) {
      const titleMatch = match[0].match(/"title"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
      const contentMatch = match[0].match(/"content"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
      const layoutMatch = match[0].match(/"layoutModel"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
      if (titleMatch) {
        slides.push({
          id: Math.random().toString(36).substring(7),
          type: 'features',
          background: 'light',
          title: titleMatch[1].replace(/\\n/g, '\n'),
          content: contentMatch ? contentMatch[1].replace(/\\n/g, '\n') : '',
          layoutModel: (layoutMatch ? layoutMatch[1] : 'default') as any,
          alignment: 'left'
        });
      }
    }
  }
  return slides;
}

/**
 * Parser resiliente para respostas de IA que lida com markdown, caracteres não-escapados,
 * wrappers de objeto dinâmicos e truncamento.
 */
export function robustJsonParse<T = any>(rawText: string, fallbackValue?: T): T {
  if (!rawText || typeof rawText !== 'string') {
    if (fallbackValue !== undefined) return fallbackValue;
    throw new Error("Texto JSON vazio ou inválido.");
  }

  let text = rawText.trim();

  // 1. Remove markdown fences (```json ... ``` ou ``` ... ```)
  text = text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // 2. Extrai o bloco estrutural inicial ([ ou {)
  const firstBracket = text.indexOf('[');
  const firstBrace = text.indexOf('{');

  let startIdx = -1;
  let endChar = '';

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    startIdx = firstBracket;
    endChar = ']';
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
    endChar = '}';
  }

  if (startIdx !== -1) {
    const lastEndIdx = text.lastIndexOf(endChar);
    if (lastEndIdx > startIdx) {
      text = text.substring(startIdx, lastEndIdx + 1);
    } else {
      text = text.substring(startIdx);
    }
  }

  // Tentativa 1: Parse direto
  try {
    return JSON.parse(text);
  } catch (_) {}

  // Tentativa 2: Sanitização de caracteres de controle em strings
  let sanitized = cleanJsonControlChars(text);
  try {
    return JSON.parse(sanitized);
  } catch (_) {}

  // Tentativa 3: Remover trailing commas
  sanitized = sanitized.replace(/,\s*([\]}])/g, '$1');
  try {
    return JSON.parse(sanitized);
  } catch (_) {}

  // Tentativa 4: Reparo de truncamento
  const repaired = repairTruncatedJson<T>(sanitized);
  if (repaired !== null) {
    return repaired;
  }

  // Tentativa 5: Extração via Regex de objetos individuais (para carrossel)
  const extracted = regexExtractSlides(text);
  if (extracted.length > 0) {
    return extracted as unknown as T;
  }

  if (fallbackValue !== undefined) {
    return fallbackValue;
  }

  throw new Error("Formato de resposta da IA inválido. Por favor, tente gerar novamente.");
}

export async function generateImage(
  prompt: string,
  referenceImage?: { data: string, mimeType: string },
  aspectRatio: string = "4:3",
  slideType?: string,
  slideIndex?: number
): Promise<string> {
  try {
    const customProvider = localStorage.getItem('custom_ai_provider') || 'gemini';
    const customKey = localStorage.getItem('custom_gemini_key');
    const customOpenRouterKey = localStorage.getItem('custom_openrouter_key');
    const openRouterModel = localStorage.getItem('custom_openrouter_image_model') || 'google/gemini-2.5-flash-image';

    const isOpenRouter = customProvider === 'openrouter' || (customKey && customKey.startsWith('sk-or-')) || (customOpenRouterKey && customOpenRouterKey.startsWith('sk-or-'));

    if (isOpenRouter) {
      const apiKey = customOpenRouterKey || customKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'DUMMY_KEY') {
        throw new Error("Chave de API do OpenRouter ausente ou inválida. Insira uma chave nas configurações.");
      }
      
      console.log(`Gerando imagem via OpenRouter usando o modelo: ${openRouterModel}`);
      
      const isGeminiImage = openRouterModel.includes('gemini');
      const messagesContent: any[] = [{ type: "text", text: prompt }];
      
      if (referenceImage && isGeminiImage) {
        messagesContent.push({
          type: "image_url",
          image_url: {
            url: `data:${referenceImage.mimeType};base64,${referenceImage.data}`
          }
        });
      }

      // Configurar modalidades com base no modelo. Modelos do Gemini e OpenAI exigem ["image", "text"]
      const isMultimodalImage = openRouterModel.includes('gemini') || openRouterModel.includes('openai') || openRouterModel === 'openrouter/auto';
      const modalities = isMultimodalImage ? ["image", "text"] : ["image"];

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: openRouterModel,
          messages: [
            {
              role: "user",
              content: messagesContent.length === 1 ? prompt : messagesContent
            }
          ],
          modalities,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API do OpenRouter ao gerar imagem: ${response.status} - ${errorText}`);
      }

      const resJson = await response.json();
      if (resJson.error) {
        throw new Error(`Erro retornado pela API do OpenRouter ao gerar imagem: ${resJson.error.message || JSON.stringify(resJson.error)}`);
      }

      const imgUrl = resJson.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imgUrl) {
        throw new Error(`A API da OpenRouter não retornou nenhuma imagem no campo esperado. Resposta: ${JSON.stringify(resJson)}`);
      }
      return imgUrl;
    }

    // Caso contrário, usa o fluxo padrão do Google Gemini oficial
    let geminiKey = customKey;
    if (geminiKey && geminiKey.startsWith('sk-or-')) {
      geminiKey = null;
    }
    
    const apiKey = geminiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'DUMMY_KEY' || apiKey.startsWith('sk-or-')) {
      throw new Error("Chave de API do Gemini inválida ou ausente. A geração de imagens requer uma chave oficial do Google Gemini (as chaves da OpenRouter são válidas apenas para texto). Por favor, configure sua chave do Gemini nas configurações.");
    }
    const currentAi = new GoogleGenAI({ apiKey });
    
    const parts: any[] = [];

    if (referenceImage) {
      parts.push({
        inlineData: {
          data: referenceImage.data,
          mimeType: referenceImage.mimeType
        }
      });
    }

    parts.push({ text: prompt });

    const fetchPromise = currentAi.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: '2K'
        }
      }
    });

    // Timeout de 120 segundos para evitar travamento infinito, mas dar tempo suficiente ao modelo Pro
    const timeoutPromise = new Promise<any>((_, reject) => {
      setTimeout(() => reject(new Error("Tempo limite de geração de imagem excedido (120s).")), 120000);
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Nenhuma imagem gerada.");
  } catch (error: any) {
    console.error("Erro na geração de imagem:", error);
    if (error.message?.toLowerCase().includes('safety') || error.message?.toLowerCase().includes('blocked')) {
      throw new Error("A imagem foi bloqueada pelos filtros de segurança da IA. Tente um tema diferente.");
    }
    throw new Error(`Falha ao gerar imagem: ${error.message}`);
  }
}

export async function analyzeCreativeReference(
  referenceImage: { data: string, mimeType: string },
  generationLayout?: string
): Promise<string> {
  try {
    const customKey = localStorage.getItem('custom_gemini_key');
    const customOpenRouterKey = localStorage.getItem('custom_openrouter_key');
    const customProvider = localStorage.getItem('custom_ai_provider') || 'gemini';
    const customModel = localStorage.getItem('custom_openrouter_model_custom')?.trim() || localStorage.getItem('custom_openrouter_model') || 'google/gemini-2.5-flash';
    
    const isOpenRouter = customProvider === 'openrouter' || (customKey && customKey.startsWith('sk-or-')) || (customOpenRouterKey && customOpenRouterKey.startsWith('sk-or-'));
    const apiKey = isOpenRouter 
      ? (customOpenRouterKey || customKey || process.env.API_KEY || process.env.GEMINI_API_KEY || "DUMMY_KEY")
      : (customKey || process.env.API_KEY || process.env.GEMINI_API_KEY || "DUMMY_KEY");

    const promptText = "Analyze this image and describe its core visual style. Focus exclusively on lighting, color palette, camera effects, artistic medium/texture, and mood. Provide a concise, highly descriptive 2-sentence prompt fragment that can be used to instruct an image generator to replicate this exact same visual styling and framing.";

    if (isOpenRouter) {
      console.log(`Analisando referência criativa com OpenRouter usando o modelo: ${customModel}`);
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: customModel,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: promptText },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${referenceImage.mimeType};base64,${referenceImage.data}`
                  }
                }
              ]
            }
          ],
          max_tokens: 250
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erro na API do OpenRouter ao analisar referência: ${response.status} - ${errText}`);
      }

      const resJson = await response.json();
      if (resJson.error) {
        throw new Error(`Erro retornado pela API do OpenRouter ao analisar referência: ${resJson.error.message || JSON.stringify(resJson.error)}`);
      }
      return resJson.choices?.[0]?.message?.content || "";
    }

    const currentAi = new GoogleGenAI({ apiKey });
    
    const parts = [
      {
        inlineData: {
          data: referenceImage.data,
          mimeType: referenceImage.mimeType
        }
      },
      { text: promptText }
    ];

    const response = await currentAi.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: { maxOutputTokens: 250 }
    });

    return response.text || "";
  } catch (error) {
    console.error("Erro ao analisar referência criativa:", error);
    return ""; // Fallback if analysis fails so it doesn't break everything
  }
}

export async function analyzePhotoQuietZone(
  photo: { data: string, mimeType: string }
): Promise<{
  alignment: 'left' | 'center' | 'right';
  verticalAlignment: 'top' | 'center' | 'bottom';
  textOffsetX: number;
  textOffsetY: number;
  bgGradientOpacity: number;
}> {
  try {
    const customKey = localStorage.getItem('custom_gemini_key');
    const customOpenRouterKey = localStorage.getItem('custom_openrouter_key');
    const customProvider = localStorage.getItem('custom_ai_provider') || 'gemini';
    const customModel = localStorage.getItem('custom_openrouter_model_custom')?.trim() || localStorage.getItem('custom_openrouter_model') || 'google/gemini-2.5-flash';
    
    const isOpenRouter = customProvider === 'openrouter' || (customKey && customKey.startsWith('sk-or-')) || (customOpenRouterKey && customOpenRouterKey.startsWith('sk-or-'));
    const apiKey = isOpenRouter 
      ? (customOpenRouterKey || customKey || process.env.API_KEY || process.env.GEMINI_API_KEY || "DUMMY_KEY")
      : (customKey || process.env.API_KEY || process.env.GEMINI_API_KEY || "DUMMY_KEY");

    const promptText = `Analyze this image and identify the best position to place overlay text so that it does not overlap with the main subject (e.g., a person, their face, or a main object). The text should be placed in a 'quiet zone' of the image (negative space or clean background).
Return a JSON object with:
- alignment: 'left' | 'center' | 'right'
- verticalAlignment: 'top' | 'center' | 'bottom'
- textOffsetX: number (default 0, range -50 to 50)
- textOffsetY: number (default 0, range -50 to 50)
- bgGradientOpacity: number (between 0.1 and 0.6; use higher values if the background in the text area is busy/bright to ensure readability)`;

    if (isOpenRouter) {
      console.log(`Analyzing photo quiet zone with OpenRouter using: ${customModel}`);
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: customModel,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: promptText },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${photo.mimeType};base64,${photo.data}`
                  }
                }
              ]
            }
          ],
          response_format: { type: "json_object" },
          max_tokens: 250
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter quiet zone status: ${response.status}`);
      }

      const resJson = await response.json();
      const content = resJson.choices?.[0]?.message?.content || "";
      const parsed = robustJsonParse<any>(content, {});
      return {
        alignment: parsed.alignment || 'center',
        verticalAlignment: parsed.verticalAlignment || 'bottom',
        textOffsetX: typeof parsed.textOffsetX === 'number' ? parsed.textOffsetX : 0,
        textOffsetY: typeof parsed.textOffsetY === 'number' ? parsed.textOffsetY : 0,
        bgGradientOpacity: typeof parsed.bgGradientOpacity === 'number' ? parsed.bgGradientOpacity : 0.4
      };
    }

    const currentAi = new GoogleGenAI({ apiKey });
    const parts = [
      {
        inlineData: {
          data: photo.data,
          mimeType: photo.mimeType
        }
      },
      { text: promptText }
    ];

    const response = await currentAi.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        maxOutputTokens: 250,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            alignment: { type: Type.STRING, enum: ['left', 'center', 'right'] },
            verticalAlignment: { type: Type.STRING, enum: ['top', 'center', 'bottom'] },
            textOffsetX: { type: Type.INTEGER },
            textOffsetY: { type: Type.INTEGER },
            bgGradientOpacity: { type: Type.NUMBER }
          },
          required: ['alignment', 'verticalAlignment', 'textOffsetX', 'textOffsetY', 'bgGradientOpacity']
        }
      }
    });

    const parsed = robustJsonParse<any>(response.text || "{}", {});
    return {
      alignment: parsed.alignment || 'center',
      verticalAlignment: parsed.verticalAlignment || 'bottom',
      textOffsetX: typeof parsed.textOffsetX === 'number' ? parsed.textOffsetX : 0,
      textOffsetY: typeof parsed.textOffsetY === 'number' ? parsed.textOffsetY : 0,
      bgGradientOpacity: typeof parsed.bgGradientOpacity === 'number' ? parsed.bgGradientOpacity : 0.4
    };
  } catch (error) {
    console.error("Erro ao analisar quiet zone da foto:", error);
    // Fallbacks padrão seguros
    return {
      alignment: 'center',
      verticalAlignment: 'bottom',
      textOffsetX: 0,
      textOffsetY: 0,
      bgGradientOpacity: 0.4
    };
  }
}

export function buildCinematicImagePrompt(
  baseDescription: string,
  slideType: string,
  slideIndex: number,
  topic: string,
  tone: string,
  hasAvatar: boolean,
  creativeStylePrompt?: string,
  layoutModel?: string,
  title?: string,
  content?: string
): string {

  // Variações de pose e expressão para o avatar — nunca repete a mesma
  const avatarVariations = [
    "with a confident, direct gaze at camera, slight forward lean, arms crossed",
    "looking slightly upward with an inspired expression, one hand gesturing open",
    "in a candid side profile, thoughtful expression, looking into the distance",
    "laughing naturally, head slightly tilted back, eyes crinkled",
    "with a serious focused expression, hand on chin, slightly turned",
    "pointing forward toward camera with an engaging expression",
    "looking down thoughtfully at something in their hands, soft half-smile",
    "with arms wide open, welcoming posture, bright confident smile"
  ];

  const avatarPose = avatarVariations[slideIndex % avatarVariations.length];

  // Configurações cinematográficas por tipo de slide
  const cinematicConfigs: Record<string, any> = {
    hero: {
      shot: "extreme close-up or dynamic low-angle wide shot",
      lighting: "high-contrast dramatic chiaroscuro, cinematic golden hour rim light, volumetric fog",
      mood: "bold, intense, awe-inspiring, attention-grabbing",
      camera: "shot on ARRI Alexa 65, 35mm f/1.4 lens, shallow depth of field, anamorphic lens flare",
      composition: "rule of thirds, subject fills 70% of frame, layered foreground elements"
    },
    problem: {
      shot: "tight claustrophobic close-up emphasizing tension",
      lighting: "harsh desaturated cool tones, single hard directional light creating deep shadows",
      mood: "tense, uncomfortable, urgent, dramatic",
      camera: "shot on RED Monstro 8K, 50mm f/1.2, slight underexposure, gritty texture",
      composition: "subject slightly off-center, heavy negative space, Dutch angle"
    },
    solution: {
      shot: "medium shot with clear open environment and leading lines",
      lighting: "warm golden tones, soft diffused key light, clean bright highlights, ethereal glow",
      mood: "hopeful, clear, energizing, triumphant",
      camera: "shot on Sony Venice 2, 85mm f/1.8, slightly elevated angle, crystal clear focus",
      composition: "subject centered with breathing room, clean background, symmetrical balance"
    },
    features: {
      shot: "editorial macro detail or clean product-style composition",
      lighting: "soft studio three-point lighting, perfectly balanced, no harsh shadows",
      mood: "professional, organized, trustworthy, premium",
      camera: "overhead or 45-degree shot, sharp focus throughout, Hasselblad H6D-100c",
      composition: "grid-based with clear visual hierarchy, minimalist"
    },
    "how-to": {
      shot: "over-the-shoulder POV or dynamic hands-in-action close-up",
      lighting: "clean neutral white studio light with soft shadows, practical lighting in background",
      mood: "instructional, clear, practical, focused",
      camera: "shot from slightly above, showing action clearly, 24mm lens",
      composition: "subject and action both visible, nothing obscured, leading lines to the action"
    },
    details: {
      shot: "extreme macro detail shot or intimate medium close-up",
      lighting: "moody side-lighting with subtle cinematic color grading (teal and orange)",
      mood: "deep, thoughtful, sophisticated, mysterious",
      camera: "shot on Nikon Z9, 100mm macro, extremely shallow depth of field, beautiful bokeh",
      composition: "texture and detail fill frame with one clear focal point"
    },
    cta: {
      shot: "powerful direct-to-camera medium shot or bold wide angle",
      lighting: "cinematic high-key lighting, vibrant brand color gels, dramatic rim light",
      mood: "energetic, urgent, inspiring action, confident",
      camera: "shot on RED Komodo 6K, anamorphic lens, slight lens flare, crisp details",
      composition: "subject centered, strong eye contact with viewer, dynamic perspective"
    }
  };

  const config = cinematicConfigs[slideType] || cinematicConfigs.hero;

  const avatarInstruction = hasAvatar
    ? `CRITICAL: The reference image is provided ONLY for character identity (face, hair, skin tone). DO NOT copy the pose, angle, or expression from the reference image. The character MUST be in this specific pose and expression: ${avatarPose}. They must be naturally integrated into the new environment.`
    : "";

  const customStyleInstruction = creativeStylePrompt 
    ? `\nCREATIVE DIRECTION (MANDATORY): ${creativeStylePrompt}`
    : `\nMOOD AND TONE: Emotionally resonant with the theme "${topic}" using tone "${tone}".`;

  const isFrasesLayout = layoutModel === 'frases';
  const phrasesAddon = isFrasesLayout
    ? `\n- Background usage: The image will serve as the backdrop for a clean text quote. Ensure there is a quiet zone, with a low level of detail and low brightness (or high contrast areas) in the lower half or center, to allow readable white overlay text.`
    : "";

  return `
[FINAL_MODE]
Masterpiece, award-winning 8K editorial photography.
SCENE CONCEPT & DETAILS: ${baseDescription}

TECHNICAL GUIDANCE (Use these to enhance the scene, but do not override the core concept above):
- Shot & Camera: ${config.shot}, ${config.camera}.
- Lighting & Mood: ${config.lighting}. ${config.mood}.
- Default Composition: ${config.composition}. ${customStyleInstruction}${phrasesAddon}
${avatarInstruction}

CRITICAL RULES: 
- Deixe sempre 30% de espaço livre (espaço negativo) para que o app sobreponha os textos do carrossel.
- Proibido gerar textos ou letras dentro da imagem. No text, no watermarks, no logos in the image.
- Ultra-sharp focus on subject. Photorealistic, highly detailed, cinematic color grading.
  `.trim();
}

export function extractSubject(topic: string): string {
  let cleaned = topic.trim();
  // Remove numbers from start (e.g., "5 dicas para..." -> "dicas para...")
  cleaned = cleaned.replace(/^\d+\s*/, '');
  // Remove common prefix words (case insensitive)
  cleaned = cleaned.replace(/^(dicas|passos|segredos|regras|maneiras|formas|erros|como|guia|manual|tudo sobre)\s+(para|de|sobre|ao|a)?\s*/i, '');
  cleaned = cleaned.trim();
  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned || topic;
}

export function generateLocalCarouselFallback(
  topic: string,
  numSlides: number,
  tone: string,
  brandName: string,
  includeImages: boolean = false,
  isSeamless: boolean = false
): SlideData[] {
  const subject = extractSubject(topic);
  
  const templates = [
    // 0: Hero
    (subj: string, brand: string) => ({
      type: 'hero' as const,
      layoutModel: 'default' as const,
      background: 'brand-gradient' as const,
      tag: 'GUIA PRÁTICO',
      title: `Como Dominar:<br><span class="text-white font-extrabold">${subj}</span>`,
      content: 'Descubra a metodologia simples e eficiente para alcançar seus objetivos sem perder tempo.',
      alignment: 'center' as const
    }),
    // 1: Módulo 12 - Problema
    (subj: string, brand: string) => ({
      type: 'problem' as const,
      layoutModel: 'problema' as const,
      background: 'dark' as const,
      tag: 'O PROBLEMA',
      title: `O grande erro ao tentar dominar ${subj}`,
      content: `A maioria das pessoas tenta aprender sem um método estruturado, levando a frustração extrema e desistência precoce.`,
      alignment: 'center' as const
    }),
    // 2: Módulo 12 - Solução
    (subj: string, brand: string) => ({
      type: 'solution' as const,
      layoutModel: 'solucao' as const,
      background: 'brand-gradient' as const,
      tag: 'A SOLUÇÃO',
      title: `A chave para a consistência real`,
      content: `Dividir o aprendizado de ${subj} em blocos práticos diários garante evolução constante e resultados sólidos.`,
      alignment: 'center' as const
    }),
    // 3: Módulo 4 - Ranking / Top N
    (subj: string, brand: string) => ({
      type: 'features' as const,
      layoutModel: 'ranking' as const,
      background: 'dark' as const,
      tag: 'RANKING',
      title: 'Top 3 Pilares do Sucesso',
      content: 'Estes são os aspectos mais determinantes para evoluir rápido:',
      items: [
        { label: 'Consistência Diária', description: 'Praticar 15 minutos por dia supera maratonas de fim de semana.' },
        { label: 'Feedback Ativo', description: 'Corrija seus erros rapidamente com revisões frequentes.' },
        { label: 'Aplicação Prática', description: 'Teoria sem prática não constrói habilidades duradouras.' }
      ],
      alignment: 'left' as const
    }),
    // 4: Módulo 5 - Antes vs Depois
    (subj: string, brand: string) => ({
      type: 'details' as const,
      layoutModel: 'antes_depois' as const,
      background: 'dark' as const,
      tag: 'TRANSFORMAÇÃO',
      title: 'Antes vs Depois do Método',
      content: 'A evolução nítida que você experimenta ao aplicar nosso processo:',
      antesTitle: 'Tentativa Caótica',
      antesContent: 'Sem rumo, perda de tempo e frustração constante por não saber o próximo passo.',
      depoisTitle: 'Execução Fluida',
      depoisContent: 'Direção clara, progresso diário previsível e domínio rápido do assunto.',
      alignment: 'left' as const
    }),
    // 5: Módulo 6 - Dado + Contexto
    (subj: string, brand: string) => ({
      type: 'details' as const,
      layoutModel: 'dado_contexto' as const,
      background: 'dark' as const,
      tag: 'DADO REAL',
      title: 'A Importância da Prática',
      content: 'A ciência comprova a eficácia da aplicação imediata.',
      bigNumber: '85%',
      contextLine: 'Aumento na taxa de retenção de conhecimento.',
      implicationLine: 'A prática ativa fixa o conhecimento profundamente e evita a curva do esquecimento acelerada.',
      sourceLine: 'Fonte: SlidOZ Labs Academic Research',
      alignment: 'left' as const
    }),
    // 6: Módulo 7 - Checklist (Positive)
    (subj: string, brand: string) => ({
      type: 'features' as const,
      layoutModel: 'checklist' as const,
      checklistType: 'positive' as const,
      background: 'light' as const,
      tag: 'FAÇA ISSO',
      title: 'Checklist para o Sucesso',
      content: 'Certifique-se de seguir estes passos indispensáveis:',
      items: [
        { icon: '✓', label: 'Reserve um horário fixo no seu dia' },
        { icon: '✓', label: 'Elimine notificações e distrações' },
        { icon: '✓', label: 'Registre seu progresso semanalmente' }
      ],
      alignment: 'left' as const
    }),
    // 7: Módulo 7 - Checklist (Negative)
    (subj: string, brand: string) => ({
      type: 'features' as const,
      layoutModel: 'checklist' as const,
      checklistType: 'negative' as const,
      background: 'light' as const,
      tag: 'EVITE ISSO',
      title: 'Erros Críticos que Bloqueiam Você',
      content: 'Pare imediatamente de sabotar seu aprendizado:',
      items: [
        { icon: '✕', label: 'Consumir conteúdo passivamente sem praticar' },
        { icon: '✕', label: 'Mudar de método toda semana sem consistência' },
        { icon: '✕', label: 'Esperar o momento perfeito para começar' }
      ],
      alignment: 'left' as const
    }),
    // 8: Módulo 8 - Depoimento
    (subj: string, brand: string) => ({
      type: 'testimonial' as const,
      layoutModel: 'depoimento' as const,
      background: 'light' as const,
      tag: 'FEEDBACK',
      title: 'Resultados Comprovados',
      content: `O método simplificou completamente a forma como eu encaro ${subj}. Em poucas semanas alcancei resultados que não via há meses.`,
      testimonialName: 'Mariana Costa',
      testimonialRole: 'Product Designer',
      testimonialPhoto: '',
      alignment: 'left' as const
    }),
    // 9: Módulo 9 - Passo a Passo (1)
    (subj: string, brand: string) => ({
      type: 'details' as const,
      layoutModel: 'passo_a_passo' as const,
      background: 'dark' as const,
      tag: 'TUTORIAL',
      title: 'Fase 1: Preparação Básica',
      content: 'Antes de qualquer execução, prepare suas ferramentas e defina seu objetivo central claro de estudo.',
      alignment: 'left' as const
    }),
    // 10: Módulo 9 - Passo a Passo (2)
    (subj: string, brand: string) => ({
      type: 'details' as const,
      layoutModel: 'passo_a_passo' as const,
      background: 'dark' as const,
      tag: 'TUTORIAL',
      title: 'Fase 2: Execução Guiada',
      content: 'Coloque a mão na massa com foco em pequenas tarefas completáveis de até 25 minutos diários.',
      alignment: 'left' as const
    }),
    // 11: Módulo 9 - Passo a Passo (3)
    (subj: string, brand: string) => ({
      type: 'details' as const,
      layoutModel: 'passo_a_passo' as const,
      background: 'dark' as const,
      tag: 'TUTORIAL',
      title: 'Fase 3: Análise e Ajuste',
      content: 'Compare seu progresso com referências e faça os ajustes necessários para o próximo ciclo.',
      alignment: 'left' as const
    }),
    // 12: Módulo 10 - Comparativo de Opções
    (subj: string, brand: string) => ({
      type: 'details' as const,
      layoutModel: 'comparativo' as const,
      background: 'dark' as const,
      tag: 'ESTRATÉGIA',
      title: 'Teoria vs Prática Ativa',
      content: 'Qual a melhor abordagem para o seu aprendizado?',
      comparisonOptionA: 'Consumo Passivo',
      comparisonOptionB: 'Prática Direta',
      comparisonWinner: 'B' as const,
      comparisonVerdict: 'A Prática Direta acelera o aprendizado em 5x',
      comparisonRows: [
        { label: 'Retenção', valueA: 'no' as const, valueB: 'yes' as const },
        { label: 'Frustração', valueA: 'yes' as const, valueB: 'maybe' as const },
        { label: 'Velocidade', valueA: 'no' as const, valueB: 'yes' as const }
      ],
      alignment: 'left' as const
    }),
    // 13: Módulo 11 - Citação de Especialista
    (subj: string, brand: string) => ({
      type: 'quote' as const,
      layoutModel: 'citacao_especialista' as const,
      background: 'dark' as const,
      tag: 'Especialista',
      title: 'A Ciência da Aprendizagem',
      content: `A excelência não é um ato isolado, mas sim o reflexo direto de micro-hábitos que executamos diariamente com consistência e foco deliberado.`,
      expertName: 'Dr. Thiago Medeiros',
      expertRole: 'Neurocientista e Autor',
      expertPhoto: '',
      alignment: 'left' as const
    }),
    // 14: Módulo 13 - Timeline
    (subj: string, brand: string) => ({
      type: 'details' as const,
      layoutModel: 'timeline' as const,
      background: 'dark' as const,
      tag: 'JORNADA',
      title: 'Cronograma da Evolução',
      content: 'O que esperar ao longo das primeiras semanas de aplicação:',
      items: [
        { date: 'Semana 1', label: 'Primeiros Passos', description: 'Entenda os fundamentos teóricos essenciais.' },
        { date: 'Semana 2', label: 'Fase de Prática', description: 'Comece a construir projetos simples.' },
        { date: 'Semana 4', label: 'Autonomia Real', description: 'Crie soluções complexas sem ajuda constante.' }
      ],
      alignment: 'left' as const
    }),
    // 15: CTA
    (subj: string, brand: string) => ({
      type: 'cta' as const,
      layoutModel: 'default' as const,
      background: 'brand-gradient' as const,
      tag: 'DICA DE OURO',
      title: 'Quer aprender mais sobre isso?',
      content: `Deixe um comentário com sua principal dúvida sobre <strong>${subj}</strong>!<br>Siga <strong>@${brand}</strong> para receber conteúdos diários de alto valor.`,
      ctaText: `Seguir @${brand}`,
      alignment: 'center' as const
    })
  ];

  const middleTemplates = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const slides: SlideData[] = [];

  // Add Hero
  slides.push({
    ...templates[0](subject, brandName),
    id: Math.random().toString(36).substring(7),
    extendBackgroundToNext: isSeamless
  });

  if (numSlides === 2) {
    slides.push({
      ...templates[15](subject, brandName),
      id: Math.random().toString(36).substring(7)
    });
  } else if (numSlides > 2) {
    const middleCount = numSlides - 2;
    const step = (middleTemplates.length - 1) / (middleCount - 1 || 1);
    const selectedIndices = Array.from({ length: middleCount }).map((_, i) => Math.round(i * step));

    selectedIndices.forEach((idx, i) => {
      const templateIndex = middleTemplates[idx];
      const slideIndex = i + 1;
      const isEven = slideIndex % 2 === 0;
      
      slides.push({
        ...templates[templateIndex](subject, brandName),
        id: Math.random().toString(36).substring(7),
        extendBackgroundToNext: isSeamless && !isEven
      });
    });

    // Add CTA
    slides.push({
      ...templates[15](subject, brandName),
      id: Math.random().toString(36).substring(7)
    });
  }

  return slides.map((s, index) => {
    // If seamless, even slides might not have an image description
    const isEvenSeamlessSlide = isSeamless && index % 2 !== 0;
    
    if (includeImages && !isEvenSeamlessSlide) {
      return {
        ...s,
        imageDescription: `Cena abstrata impactante representando "${topic}", estilo editorial, iluminação dramática lateral, cores coerentes com tom ${tone}, sem texto, composição cinematográfica, bokeh suave.`,
        imagePosition: s.imagePosition || 'center'
      };
    }
    return s;
  });
}

export async function generateCarouselContent(
  topic: string,
  numSlides: number,
  tone: string,
  brandName: string,
  includeImages: boolean,
  hasReferenceImage: boolean = false,
  isSeamless: boolean = false,
  generationLayout?: string,
  phraseCategory?: string,
  customPhrases?: string
): Promise<SlideData[]> {
  let prompt = `
    Crie um carrossel para o Instagram sobre: "${topic}".
    Tom de voz: ${tone}.
    Nome da Marca: ${brandName}.
    Número de slides: ${numSlides}.
    
    CRÍTICO: TODO O CONTEÚDO DEVE SER ESCRITO EM PORTUGUÊS DO BRASIL (pt-BR).
    CRÍTICO: Os campos de texto (title, content, tag, label, description) DEVEM conter APENAS o texto final a ser exibido para o leitor do post.
    CRÍTICO: É ESTRITAMENTE PROIBIDO incluir qualquer tipo de raciocínio, explicação do prompt, notas para o usuário, ou metadados em QUALQUER campo.
    CRÍTICO: A "tag" deve ter no máximo 2 palavras e não deve se repetir infinitamente. Exemplo: "DICAS", "ALERTA", "GUIA".
    
    CRÍTICO: VOCÊ DEVE ESCREVER O CONTEÚDO REAL DO CARROSSEL. O campo \`content\` é OBRIGATÓRIO e deve conter o texto principal (parágrafo) que o usuário vai ler no post. NUNCA deixe o \`content\` vazio. NUNCA coloque descrições de imagem ou raciocínio no campo \`content\`.
    
    Siga este arco narrativo (adapte ao número de slides):
    1. Hero (Gancho - afirmação ousada)
    2. Problem (Ponto de dor)
    3. Solution (A resposta)
    4. Features (O que você ganha)
    5. Details (Profundidade)
    6. How-to (Passo a passo)
    7. CTA (Chamada para ação)
    
    CRÍTICO - DIRETRIZ DE LAYOUT DE SLIDES (layoutModel):
    Escolha de forma inteligente o layout mais adequado para a mensagem de cada slide. Atribua o respectivo 'layoutModel' no JSON:
    
    - 'ranking': Ative quando o slide contiver uma lista numerada ou o "Top N" de itens/pilares. Preencha o array "items".
    - 'antes_depois': Ative quando for contrastar ou comparar um estado anterior (dor/problema) com o posterior (sucesso/solução). Preencha: "antesTitle" (ex: "Antes"), "antesContent", "depoisTitle" (ex: "Depois"), "depoisContent".
    - 'dado_contexto': Ative quando o slide destacar uma estatística importante, porcentagem ou grande número. Preencha: "bigNumber" (ex: "85%"), "contextLine" (o que significa), "implicationLine" (a consequência/porquê importa), e opcionalmente "sourceLine" (a fonte).
    - 'checklist': Ative para checklists de faça/não faça. Defina "checklistType" como "positive" (para dicas/recomendações ✓) ou "negative" (para erros/evitar ✕). Adicione os itens no array "items".
    - 'depoimento': Ative para depoimentos de clientes ou citações pessoais informais. Preencha: "testimonialName", "testimonialRole", e "testimonialPhoto" (opcional).
    - 'passo_a_passo': Ative para slides de tutoriais, guias passo a passo ou processos sequenciais.
    - 'comparativo': Ative para comparar lado a lado duas opções (Opção A vs Opção B). Preencha: "comparisonOptionA", "comparisonOptionB", "comparisonWinner" ('A' | 'B' | 'none'), "comparisonVerdict" (veredito rápido), e o array "comparisonRows" contendo objetos com { label: "Critério", valueA: "yes"|"no"|"maybe", valueB: "yes"|"no"|"maybe" }.
    - 'citacao_especialista': Ative para pensamentos de autoridade ou citações formais. Preencha: "expertName", "expertRole" (cargo/credencial), "expertPhoto" (opcional).
    - 'problema': Ative para o slide de dor/problema inicial do carrossel.
    - 'solucao': Ative para o slide de solução que resolve a dor do slide de 'problema'.
    - 'timeline': Ative para linhas do tempo ou etapas cronológicas. Preencha o array "items" onde cada item pode ter "date", "label", "description".
    - 'default': Use para slides simples que não se encaixam em nenhuma das categorias acima (ex: hero, cta ou slides de texto comuns).
    
    Retorne um array JSON de slides. Cada slide deve ter:
    - type: 'hero', 'problem', 'solution', 'features', 'details', 'how-to', ou 'cta'
    - layoutModel: o modelo de layout escolhido (conforme as regras acima)
    - background: 'light', 'dark', ou 'brand-gradient'
    - tag: Uma categoria curta em maiúsculas. MÁXIMO 2 PALAVRAS.
    - title: O título principal do slide.
    - content: Texto de corpo com o conteúdo real e educativo do post.
    - items: Array de { label, description, icon, date } para features, checklists, ranking ou passos (opcional)
    - quote: Objeto com { label, text } para slide de solução (opcional)
    - ctaText: Texto para o botão no slide de CTA (opcional)
    - alignment: 'left', 'center', ou 'right' (padrão 'left', 'center' para hero/cta)
    ${includeImages && !hasReferenceImage ? `- imageDescription: OBRIGATÓRIO (em inglês). Crie um prompt de IA DETALHADO, EXTREMAMENTE CRIATIVO E METAFÓRICO para este slide. Entenda profundamente o conteúdo do slide em relação ao tema todo e proponha uma imagem que prenda a atenção e expresse a mensagem principal. Use cenas cinematográficas, ângulos interessantes e descrições ricas.` : ''}
    ${includeImages && hasReferenceImage ? `- imageDescription: OBRIGATÓRIO (em inglês). Crie uma descrição CRIATIVA E IMPULSIONADORA para inserir o Avatar do cliente com perfeição neste slide. A cena deve traduzir o conteúdo do slide (MÁXIMO 250 CARACTERES).` : ''}
    ${includeImages ? `- imagePosition: 'top', 'center', 'bottom', ou 'background'.` : ''}
    ${isSeamless ? `- extendBackgroundToNext: BOOLEAN. Set to true for odd-numbered slides (1st, 3rd, 5th...) to create a seamless carousel.` : ''}
    
    CRÍTICO: Opcionais como antesTitle/antesContent, bigNumber/contextLine/implicationLine, testimonialName/testimonialRole, expertName/expertRole, comparisonOptionA/OptionB/Verdict e comparisonRows só devem ser preenchidos se o slide usar o respectivo 'layoutModel'. Caso contrário, não os inclua de forma alguma no JSON do slide. Mantenha os valores de todos esses campos curtos (máximo 40 caracteres) e sem qualquer tipo de repetição.
  `;

  if (generationLayout === 'frases') {
    if (customPhrases && customPhrases.trim()) {
      prompt = `
        Crie um carrossel do Instagram com exatamente ${numSlides} slides baseado EXCLUSIVAMENTE nas seguintes frases fornecidas pelo usuário (uma frase por slide):
        
        FRASES DO USUÁRIO:
        ${customPhrases}
        
        CRÍTICO:
        1. Crie exatamente ${numSlides} slides no array JSON.
        2. Para cada slide, use uma das frases acima (na mesma ordem) como o título do slide (campo \`title\`). Cada frase deve ser usada em exatamente um slide.
        3. O campo \`layoutModel\` de todos os slides DEVE ser 'frases'.
        4. O campo \`content\` (parágrafo educativo de apoio) DEVE conter uma reflexão curta e de alto impacto que complemente o significado daquela frase (máximo 120 caracteres). NUNCA deixe o campo \`content\` vazio.
        5. O campo \`tag\` deve ser uma categoria curta em maiúsculas (máximo 2 palavras).
        6. O campo \`type\` de cada slide deve seguir o arco narrativo correspondente (ex: 'hero', 'details', 'cta' etc.).
        7. Não adicione campos opcionais desnecessários no JSON que não correspondam ao modelo 'frases'.
        8. Todo o conteúdo deve ser em português (pt-BR).
        ${includeImages && !hasReferenceImage ? `- imageDescription: OBRIGATÓRIO (em inglês). Crie um prompt de IA detalhado e conceitual para gerar a imagem de fundo do slide.` : ''}
        ${includeImages && hasReferenceImage ? `- imageDescription: OBRIGATÓRIO (em inglês). Crie uma descrição conceitual para inserir o Avatar do cliente com perfeição neste slide.` : ''}
        ${includeImages ? `- imagePosition: 'background'.` : ''}
      `;
    } else {
      prompt = `
        Crie um carrossel do Instagram com exatamente ${numSlides} slides contendo frases marcantes e inspiradoras sobre o tema/categoria: "${phraseCategory || topic}".
        Tom de voz: ${tone}.
        Nome da Marca: ${brandName}.
        
        CRÍTICO:
        1. Gere exatamente ${numSlides} slides.
        2. O campo \`layoutModel\` de todos os slides DEVE ser 'frases'.
        3. O campo \`title\` de cada slide deve ser uma frase curta de alto impacto, idealmente de 6 a 8 palavras.
        4. O campo \`content\` deve ser uma reflexão ou conselho complementar curto (máximo 120 caracteres). NUNCA deixe o campo \`content\` vazio.
        5. Todo o conteúdo deve ser em português (pt-BR).
        ${includeImages && !hasReferenceImage ? `- imageDescription: OBRIGATÓRIO (em inglês). Crie um prompt de IA detalhado e conceitual para gerar a imagem de fundo do slide.` : ''}
        ${includeImages && hasReferenceImage ? `- imageDescription: OBRIGATÓRIO (em inglês). Crie uma descrição conceitual para inserir o Avatar do cliente com perfeição neste slide.` : ''}
        ${includeImages ? `- imagePosition: 'background'.` : ''}
      `;
    }
  } else if (generationLayout === 'forbes') {
    prompt += `\nCRÍTICO: Como você escolheu o layout corporativo/editorial, o \`layoutModel\` de todos ou da maioria dos slides deve ser 'forbes'.`;
  } else if (generationLayout === 'twitter') {
    prompt += `\nCRÍTICO: Como você escolheu o layout estilo rede social/tweets, o \`layoutModel\` de todos ou da maioria dos slides deve ser 'twitter'.`;
  }

  try {
    const customKey = localStorage.getItem('custom_gemini_key');
    const customOpenRouterKey = localStorage.getItem('custom_openrouter_key');
    const customProvider = localStorage.getItem('custom_ai_provider') || 'gemini';
    const customModel = localStorage.getItem('custom_openrouter_model_custom')?.trim() || localStorage.getItem('custom_openrouter_model') || 'google/gemini-2.5-flash';
    
    const isOpenRouter = customProvider === 'openrouter' || (customKey && customKey.startsWith('sk-or-')) || (customOpenRouterKey && customOpenRouterKey.startsWith('sk-or-'));
    const apiKey = isOpenRouter 
      ? (customOpenRouterKey || customKey || process.env.API_KEY || process.env.GEMINI_API_KEY)
      : (customKey || process.env.API_KEY || process.env.GEMINI_API_KEY);

    if (!apiKey || apiKey === 'DUMMY_KEY') {
      console.warn("Nenhuma chave configurada. Usando fallback local.");
      return generateLocalCarouselFallback(topic, numSlides, tone, brandName, includeImages, isSeamless);
    }

    if (isOpenRouter) {
      console.log(`Usando OpenRouter com o modelo: ${customModel}`);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      };
      
      const requestBody = {
        model: customModel,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
        max_tokens: 4000
      };

      let openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      if (!openRouterResponse.ok) {
        if (openRouterResponse.status === 400) {
          const retryBody = {
            model: customModel,
            messages: [
              { role: 'user', content: prompt + "\n\nCRÍTICO: Responda APENAS com a estrutura JSON válida, sem texto adicional." }
            ],
            temperature: 0.7,
            max_tokens: 4000
          };
          const retryResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: headers,
            body: JSON.stringify(retryBody)
          });
          if (retryResponse.ok) {
            openRouterResponse = retryResponse;
          }
        }
      }

      if (!openRouterResponse.ok) {
        const errorText = await openRouterResponse.text();
        throw new Error(`Erro na API do OpenRouter ao gerar roteiro: ${openRouterResponse.status} - ${errorText}`);
      }

      const resJson = await openRouterResponse.json();
      if (resJson.error) {
        throw new Error(`Erro retornado pela API do OpenRouter ao gerar roteiro: ${resJson.error.message || JSON.stringify(resJson.error)}`);
      }
      const contentText = resJson.choices?.[0]?.message?.content;
      if (!contentText) {
        throw new Error("A API do OpenRouter não retornou conteúdo na resposta.");
      }

      let slides: any[] = [];
      try {
        const rawParsed = robustJsonParse<any>(contentText);
        if (Array.isArray(rawParsed)) {
          slides = rawParsed;
        } else if (rawParsed && typeof rawParsed === 'object') {
          if (Array.isArray(rawParsed.slides)) {
            slides = rawParsed.slides;
          } else if (Array.isArray(rawParsed.carousel)) {
            slides = rawParsed.carousel;
          } else if (Array.isArray(rawParsed.data)) {
            slides = rawParsed.data;
          } else if (Array.isArray(rawParsed.items)) {
            slides = rawParsed.items;
          } else {
            slides = [rawParsed];
          }
        }
      } catch (parseErr) {
        console.error("Falha no parsing OpenRouter:", parseErr);
        const fallbackSlides = regexExtractSlides(contentText);
        if (fallbackSlides.length > 0) {
          slides = fallbackSlides;
        } else {
          throw new Error("A IA gerou um formato de texto que não pôde ser interpretado. Por favor, tente novamente.");
        }
      }

      return slides.map((s: any, index: number) => {
        const isEvenSeamlessSlide = isSeamless && index % 2 !== 0;
        if (includeImages && !isEvenSeamlessSlide && (!s.imageDescription || s.imageDescription.trim() === '')) {
          s.imageDescription = `Cena abstrata impactante representando "${topic}", estilo editorial, iluminação dramática lateral, cores coerentes com tom ${tone}, sem texto, composição cinematográfica, bokeh suave.`;
        }
        if (includeImages && !s.imagePosition) {
          s.imagePosition = 'center';
        }
        return { ...s, id: Math.random().toString(36).substring(7) };
      });
    }

    const currentAi = new GoogleGenAI({ apiKey });
    
    const response = await currentAi.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 8192,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ['hero', 'problem', 'solution', 'features', 'details', 'how-to', 'cta'] },
              background: { type: Type.STRING, enum: ['light', 'dark', 'brand-gradient'] },
              layoutModel: { type: Type.STRING, enum: ['default', 'forbes', 'twitter', 'frases', 'ranking', 'antes_depois', 'dado_contexto', 'checklist', 'depoimento', 'passo_a_passo', 'comparativo', 'citacao_especialista', 'problema', 'solucao', 'timeline'] },
              tag: { type: Type.STRING, enum: ['DICAS', 'ALERTA', 'GUIA', 'TUTORIAL', 'NOVIDADE', 'SEGREDO', 'PASSO A PASSO', 'IMPORTANTE', 'ATENÇÃO', 'MITO OU VERDADE', 'CHECKLIST', 'INSPIRAÇÃO', 'CONCEITO', 'ESTRATÉGIA', 'MINDSET', 'BASTIDORES', 'CASE DE SUCESSO', 'ERROS COMUNS', 'FERRAMENTAS', 'TENDÊNCIA'], description: "Escolha uma tag que melhor se adapta ao slide." },
              title: { type: Type.STRING, description: "O título principal do slide. Deve ser o conteúdo real para o usuário." },
              content: { type: Type.STRING, description: "O texto de corpo do slide. DEVE conter o conteúdo educativo ou informativo. NÃO coloque descrições de imagem aqui." },
              antesTitle: { type: Type.STRING, description: "Título do estado anterior. Preencha APENAS se layoutModel for 'antes_depois'. Máximo 30 caracteres." },
              antesContent: { type: Type.STRING, description: "Conteúdo do estado anterior. Preencha APENAS se layoutModel for 'antes_depois'. Máximo 100 caracteres." },
              depoisTitle: { type: Type.STRING, description: "Título do estado depois. Preencha APENAS se layoutModel for 'antes_depois'. Máximo 30 caracteres." },
              depoisContent: { type: Type.STRING, description: "Conteúdo do estado depois. Preencha APENAS se layoutModel for 'antes_depois'. Máximo 100 caracteres." },
              bigNumber: { type: Type.STRING, description: "Número/Dado em destaque. Preencha APENAS se layoutModel for 'dado_contexto'. Ex: '85%'." },
              contextLine: { type: Type.STRING, description: "Contexto do dado. Preencha APENAS se layoutModel for 'dado_contexto'. Máximo 40 caracteres." },
              implicationLine: { type: Type.STRING, description: "Implicação do dado. Preencha APENAS se layoutModel for 'dado_contexto'. Máximo 80 caracteres." },
              sourceLine: { type: Type.STRING, description: "Fonte do dado. Preencha APENAS se layoutModel for 'dado_contexto'. Máximo 30 caracteres." },
              checklistType: { type: Type.STRING, enum: ['positive', 'negative'], description: "Tipo de checklist (positive/negative). Preencha APENAS se layoutModel for 'checklist'." },
              testimonialName: { type: Type.STRING, description: "Nome do cliente. Preencha APENAS se layoutModel for 'depoimento'. Máximo 30 caracteres." },
              testimonialRole: { type: Type.STRING, description: "Cargo/Credencial do cliente. Preencha APENAS se layoutModel for 'depoimento'. Máximo 40 caracteres." },
              testimonialPhoto: { type: Type.STRING, description: "Preencha APENAS se layoutModel for 'depoimento'." },
              comparisonWinner: { type: Type.STRING, enum: ['none', 'A', 'B'], description: "Lado vencedor da comparação. Preencha APENAS se layoutModel for 'comparativo'." },
              comparisonOptionA: { type: Type.STRING, description: "Opção A. Preencha APENAS se layoutModel for 'comparativo'. Máximo 20 caracteres." },
              comparisonOptionB: { type: Type.STRING, description: "Opção B. Preencha APENAS se layoutModel for 'comparativo'. Máximo 20 caracteres." },
              comparisonVerdict: { type: Type.STRING, description: "Veredito da comparação. Preencha APENAS se layoutModel for 'comparativo'. Máximo 45 caracteres." },
              comparisonRows: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING, description: "Critério de comparação. Máximo 25 caracteres." },
                    valueA: { type: Type.STRING, enum: ['yes', 'no', 'maybe'] },
                    valueB: { type: Type.STRING, enum: ['yes', 'no', 'maybe'] }
                  },
                  required: ['label', 'valueA', 'valueB']
                },
                description: "Linhas de comparação. Preencha APENAS se layoutModel for 'comparativo'."
              },
              expertName: { type: Type.STRING, description: "Nome do especialista. Preencha APENAS se layoutModel for 'citacao_especialista'. Máximo 30 caracteres." },
              expertRole: { type: Type.STRING, description: "Cargo/Credencial do especialista. Preencha APENAS se layoutModel for 'citacao_especialista'. Máximo 40 caracteres." },
              expertPhoto: { type: Type.STRING, description: "Preencha APENAS se layoutModel for 'citacao_especialista'." },
              imageDescription: { type: Type.STRING, description: "Descrição visual para o gerador de imagens IA. Máximo 150 caracteres. Descreva apenas a cena visual." },
              imagePosition: { type: Type.STRING, enum: ['top', 'center', 'bottom', 'background'] },
              extendBackgroundToNext: { type: Type.BOOLEAN },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING, description: "Nome do item ou passo. Máximo 35 caracteres." },
                    description: { type: Type.STRING, description: "Breve detalhe do item. Máximo 70 caracteres." },
                    icon: { type: Type.STRING, description: "Emoji ou caractere simples." },
                    date: { type: Type.STRING, description: "Preencha apenas para timeline. Ex: 'Semana 1'." }
                  },
                  required: ['label']
                },
                description: "Lista de itens. Preencha APENAS se layoutModel for 'ranking', 'checklist', 'passo_a_passo' ou 'timeline'."
              },
              quote: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: "Rótulo superior. Máximo 25 caracteres." },
                  text: { type: Type.STRING, description: "Conteúdo da citação. Máximo 90 caracteres." }
                },
                description: "Citação para destaque (opcional)."
              },
              ctaText: { type: Type.STRING, description: "Texto do botão. Preencha apenas se type for 'cta'. Máximo 20 caracteres." },
              alignment: { type: Type.STRING, enum: ['left', 'center', 'right'] }
            },
            required: ['type', 'background', 'title', 'content', 'alignment']
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("A IA não retornou nenhum texto.");

    let slides: any[] = [];
    try {
      const rawParsed = robustJsonParse<any>(text);
      if (Array.isArray(rawParsed)) {
        slides = rawParsed;
      } else if (rawParsed && typeof rawParsed === 'object') {
        if (Array.isArray(rawParsed.slides)) {
          slides = rawParsed.slides;
        } else if (Array.isArray(rawParsed.carousel)) {
          slides = rawParsed.carousel;
        } else if (Array.isArray(rawParsed.data)) {
          slides = rawParsed.data;
        } else if (Array.isArray(rawParsed.items)) {
          slides = rawParsed.items;
        } else {
          slides = [rawParsed];
        }
      }
    } catch (parseErr) {
      console.error("Falha no robustJsonParse do Gemini:", parseErr);
      const fallbackSlides = regexExtractSlides(text);
      if (fallbackSlides.length > 0) {
        slides = fallbackSlides;
      } else {
        throw new Error("A IA gerou um formato inválido que não pôde ser recuperado. Por favor, tente gerar novamente.");
      }
    }

    if (!slides || slides.length === 0) {
      console.warn("Nenhum slide pôde ser extraído da resposta. Usando fallback local.");
      return generateLocalCarouselFallback(topic, numSlides, tone, brandName, includeImages, isSeamless);
    }

    if (slides.length < Math.min(3, numSlides)) {
      console.warn(`A geração gerou apenas ${slides.length} de ${numSlides} slides.`);
    }

    return slides.map((s: any, index: number) => {
      const isEvenSeamlessSlide = isSeamless && index % 2 !== 0;
      
      if (includeImages && !isEvenSeamlessSlide && (!s.imageDescription || s.imageDescription.trim() === '')) {
        s.imageDescription = `Cena abstrata impactante representando "${topic}", estilo editorial, iluminação dramática lateral, cores coerentes com tom ${tone}, sem texto, composição cinematográfica, bokeh suave.`;
      }
      if (includeImages && !s.imagePosition) {
        s.imagePosition = 'center';
      }
      return { ...s, id: Math.random().toString(36).substring(7) };
    });
  } catch (error: any) {
    console.error("Erro na geração do Gemini/OpenRouter:", error);
    
    const customKey = localStorage.getItem('custom_gemini_key');
    const customOpenRouterKey = localStorage.getItem('custom_openrouter_key');
    const customProvider = localStorage.getItem('custom_ai_provider');
    
    // Se o usuário configurou uma chave ou provedor customizado, lança o erro para que ele saiba por que falhou
    if (customKey || customOpenRouterKey || customProvider === 'openrouter') {
      throw error;
    }
    
    return generateLocalCarouselFallback(topic, numSlides, tone, brandName, includeImages, isSeamless);
  }
}

/**
 * Função utilitária para chamadas de texto para IA com suporte a OpenRouter e Gemini.
 */
async function callTextAi(prompt: string, maxTokens: number = 2000, jsonMode: boolean = false): Promise<string> {
  const customKey = localStorage.getItem('custom_gemini_key');
  const customOpenRouterKey = localStorage.getItem('custom_openrouter_key');
  const customProvider = localStorage.getItem('custom_ai_provider') || 'gemini';
  const customModel = localStorage.getItem('custom_openrouter_model_custom')?.trim() || localStorage.getItem('custom_openrouter_model') || 'google/gemini-2.5-flash';

  const isOpenRouter = customProvider === 'openrouter' || (customKey && customKey.startsWith('sk-or-')) || (customOpenRouterKey && customOpenRouterKey.startsWith('sk-or-'));
  const apiKey = isOpenRouter 
    ? (customOpenRouterKey || customKey || process.env.API_KEY || process.env.GEMINI_API_KEY || "DUMMY_KEY")
    : (customKey || process.env.API_KEY || process.env.GEMINI_API_KEY || "DUMMY_KEY");

  if (isOpenRouter) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    };
    const reqBody: any = {
      model: customModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens
    };
    if (jsonMode) {
      reqBody.response_format = { type: "json_object" };
    }

    let res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify(reqBody)
    });

    if (!res.ok && jsonMode && res.status === 400) {
      delete reqBody.response_format;
      res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify(reqBody)
      });
    }

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Erro OpenRouter: ${res.status} - ${err}`);
    }

    const resJson = await res.json();
    return resJson.choices?.[0]?.message?.content || "";
  }

  const currentAi = new GoogleGenAI({ apiKey });
  const response = await currentAi.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      maxOutputTokens: maxTokens,
      temperature: 0.7,
      ...(jsonMode ? { responseMimeType: "application/json" } : {})
    }
  });

  return response.text || "";
}

export interface PostCaptionResult {
  caption: string;
  hashtags: string[];
  firstComment: string;
}

/**
 * 7. Gerador Automático de Legenda + Hashtags + Primeiro Comentário
 */
export async function generatePostCaption(
  topic: string,
  slides: SlideData[],
  brandName: string,
  tone: string
): Promise<PostCaptionResult> {
  const slidesSummary = slides.map((s, i) => `Slide ${i + 1}: [${s.tag || s.type}] ${s.title || ''} - ${s.content || ''}`).join('\n');

  const prompt = `
Você é um estrategista de conteúdo e copywriter especialista em Instagram de alta conversão.
Crie a legenda perfeita para o seguinte post em formato de carrossel:

TEMA DO POST: "${topic}"
NOME DA MARCA: "${brandName}"
TOM DE VOZ: "${tone}"

CONTEÚDO DOS SLIDES:
${slidesSummary}

INSTRUÇÕES:
1. Comece com uma linha de gancho irresistível (que faça o usuário clicar em "...mais").
2. Adicione um breve desenvolvimento que contextualize a dor e o benefício do carrossel sem entregar tudo de bandeja, usando espaçamentos limpos e emojis adequados.
3. Crie uma Chamada para Ação (CTA) forte (ex: "Salve este post para consultar depois", "Comente [PALAVRA-CHAVE] que eu te envio o material", "Compartilhe com alguém que precisa ver isso").
4. Gere de 15 a 20 hashtags estratégicas em português (mistura de nicho, dor e alcance).
5. Sugira o texto do "Primeiro Comentário" para impulsionar a conversa e o algoritmo.

Retorne EXCLUSIVAMENTE um objeto JSON no formato:
{
  "caption": "Texto completo da legenda aqui com quebras de linha \\n\\n",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "firstComment": "Texto para você fixar no primeiro comentário..."
}
`;

  try {
    const raw = await callTextAi(prompt, 2500, true);
    const parsed = robustJsonParse<PostCaptionResult>(raw, {
      caption: `🔥 ${topic}\n\nArrasta para o lado e confira os segredos para dominar este tema passo a passo!\n\nSalva esse post para consultar depois! 📌\n\nQual desses pontos mais chamou sua atenção? Comenta aqui embaixo! 👇`,
      hashtags: ['#carrossel', '#conteudo', '#instagram', '#dicas', '#estrategia', '#negocios', '#marketing'],
      firstComment: `Qual desses passos você vai começar a aplicar hoje? Deixe nos comentários! 👇`
    });

    return parsed;
  } catch (error) {
    console.error("Erro ao gerar legenda:", error);
    return {
      caption: `🔥 ${topic}\n\nArrasta para o lado e confira todas as dicas que preparamos para você!\n\n💡 Salva esse post para não esquecer e compartilha com um amigo que precisa ver isso! 🚀`,
      hashtags: ['#carrossel', '#instagram', '#dicas', '#conteudo', '#estrategia'],
      firstComment: `Comente aqui o que você achou desse carrossel! 👇`
    };
  }
}

export interface HookVariation {
  hook: string;
  framework: string;
  score: number;
  reason: string;
}

/**
 * 2. Otimizador de Ganchos e Capas (Hook Score & A/B Hooks)
 */
export async function generateHookVariations(
  topic: string,
  tone: string,
  brandName: string,
  currentTitle?: string
): Promise<HookVariation[]> {
  const prompt = `
Você é um mestre em copywriting para redes sociais e psicologia de retenção.
Gere exatamente 5 variações de títulos/ganchos altamente virais para o SLIDE 1 (Capa de Carrossel do Instagram).

TEMA: "${topic}"
TOM DE VOZ: "${tone}"
MARCA: "${brandName}"
${currentTitle ? `TÍTULO ATUAL: "${currentTitle}"` : ''}

FRAMEWORKS OBRIGATÓRIOS:
1. "Contraintuitivo / Choque": Desafia o senso comum ou quebra uma crença popular.
2. "Alerta / Erro Fatal": Adverte sobre um erro que está custando dinheiro, tempo ou saúde.
3. "Como Fazer / Atalho": Promessa clara e irresistível de execução simplificada.
4. "Curiosidade / Segredo": Gera gap de curiosidade que força a pessoa a arrastar para o lado.
5. "Transformação / Prova": Foca no resultado final tangível antes vs depois.

REGRAS:
- Textos em português (pt-BR).
- Entre 6 e 12 palavras por gancho.
- Dê uma nota de Retenção Estimada (score de 80 a 99).
- Explique em 1 frase curta por que esse gancho funciona.

Retorne EXCLUSIVAMENTE um array JSON:
[
  {
    "hook": "Texto do gancho impactante",
    "framework": "Contraintuitivo / Choque",
    "score": 96,
    "reason": "Quebra uma crença comum e gera curiosidade imediata."
  }
]
`;

  try {
    const raw = await callTextAi(prompt, 1500, true);
    const parsed = robustJsonParse<HookVariation[]>(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (error) {
    console.error("Erro ao gerar variações de ganchos:", error);
  }

  // Fallback de alta qualidade
  return [
    {
      hook: `O que ninguém te conta sobre ${topic}`,
      framework: "Curiosidade / Segredo",
      score: 95,
      reason: "Desperta o medo de ficar de fora e curiosidade por segredos."
    },
    {
      hook: `O maior erro que você comete ao lidar com ${topic}`,
      framework: "Alerta / Erro Fatal",
      score: 93,
      reason: "Gatilho de aversão à perda e urgência em corrigir uma falha."
    },
    {
      hook: `Como dominar ${topic} sem perder tempo`,
      framework: "Como Fazer / Atalho",
      score: 90,
      reason: "Promessa direta de simplicidade e velocidade."
    },
    {
      hook: `Pare de tentar ${topic} do jeito tradicional`,
      framework: "Contraintuitivo / Choque",
      score: 96,
      reason: "Interrompe o padrão do feed e propõe uma nova visão."
    },
    {
      hook: `O passo a passo definitivo para transformar seu ${topic}`,
      framework: "Transformação / Prova",
      score: 89,
      reason: "Promessa de autoridade e valor duradouro."
    }
  ];
}

/**
 * 3. Micro-Ações de IA no Editor de Slide (Copilot de Texto)
 */
export async function refineSlideText(
  currentText: string,
  action: 'shorten' | 'provocative' | 'analogy' | 'simplify',
  field: 'title' | 'content' = 'content'
): Promise<string> {
  const actionInstructions: Record<string, string> = {
    shorten: "Encurte este texto para que fique mais direto e conciso, mantendo o impacto e eliminando palavras desnecessárias (máximo 15 palavras).",
    provocative: "Reescreva este texto para que soe muito mais provocativo, firme e instigante, usando palavras fortes que prendem a atenção do leitor.",
    analogy: "Adicione ou transforme este texto em uma analogia simples e visual da vida real que qualquer pessoa entenda instantaneamente.",
    simplify: "Simplifique a linguagem eliminando termos difíceis ou jargões complexos, tornando a leitura rápida e acessível."
  };

  const prompt = `
Você é um editor de texto e copywriter de carrosséis para Instagram.
Ajuste o seguinte texto do ${field === 'title' ? 'Título' : 'Conteúdo'} de um slide:

TEXTO ORIGINAL:
"${currentText}"

OBJETIVO DA AÇÃO:
${actionInstructions[action]}

REGRAS:
- Retorne APENAS o texto reescrito pronto em português (pt-BR).
- Não coloque aspas ao redor, nem explicações, nem notas adicionais.
`;

  try {
    const raw = await callTextAi(prompt, 350, false);
    return raw.replace(/^["']|["']$/g, '').trim();
  } catch (error) {
    console.error("Erro ao refinar texto:", error);
    return currentText;
  }
}

/**
 * 1. Engenharia Reversa de Carrosséis Virais (Vision-to-Design)
 */
export async function analyzeAndCloneViralPost(
  referenceImage: { data: string, mimeType: string },
  newTopic: string,
  tone: string,
  brandName: string,
  numSlides: number = 7,
  includeImages: boolean = false
): Promise<SlideData[]> {
  const promptText = `
Você é um diretor de arte e estrategista de conteúdo viral de elite no Instagram.
Analise a imagem deste post/carrossel viral e faça a ENGENHARIA REVERSA completa da sua fórmula:
1. Estrutura do Gancho (como a capa prende atenção, tamanho do título, tom e psicologia).
2. Ritmo Narrativo (distribuição entre problema, revelação, passos e CTA).
3. Densidade de texto e estilo de layout.

Agora, gere um NOVO carrossel de exatamente ${numSlides} slides sobre o NOVO TEMA: "${newTopic}".
- Tom de voz: "${tone}"
- Nome da Marca: "${brandName}"
- Aplique a mesma psicologia e ritmo vencedor do post de referência adaptado ao novo tema.

Retorne EXCLUSIVAMENTE um array JSON de slides. Cada slide deve conter:
- type: 'hero' | 'problem' | 'solution' | 'features' | 'details' | 'how-to' | 'cta'
- layoutModel: 'default' | 'forbes' | 'twitter' | 'frases' | 'ranking' | 'antes_depois' | 'dado_contexto' | 'checklist' | 'depoimento' | 'passo_a_passo' | 'comparativo' | 'citacao_especialista' | 'problema' | 'solucao' | 'timeline'
- background: 'light' | 'dark' | 'brand-gradient'
- tag: Categoria curta em maiúsculas (máximo 2 palavras)
- title: Título impactante do slide
- content: Texto de corpo educativo
${includeImages ? '- imageDescription: Descrição visual da imagem de apoio (em inglês)' : ''}
- alignment: 'left' | 'center' | 'right'
`;

  try {
    const customKey = localStorage.getItem('custom_gemini_key');
    const customOpenRouterKey = localStorage.getItem('custom_openrouter_key');
    const customProvider = localStorage.getItem('custom_ai_provider') || 'gemini';
    const customModel = localStorage.getItem('custom_openrouter_model_custom')?.trim() || localStorage.getItem('custom_openrouter_model') || 'google/gemini-2.5-flash';

    const isOpenRouter = customProvider === 'openrouter' || (customKey && customKey.startsWith('sk-or-')) || (customOpenRouterKey && customOpenRouterKey.startsWith('sk-or-'));
    const apiKey = isOpenRouter 
      ? (customOpenRouterKey || customKey || process.env.API_KEY || process.env.GEMINI_API_KEY || "DUMMY_KEY")
      : (customKey || process.env.API_KEY || process.env.GEMINI_API_KEY || "DUMMY_KEY");

    let rawText = '';

    if (isOpenRouter) {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: customModel,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: promptText },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${referenceImage.mimeType};base64,${referenceImage.data}`
                  }
                }
              ]
            }
          ],
          response_format: { type: "json_object" },
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenRouter clone viral error: ${response.status} - ${err}`);
      }
      const resJson = await response.json();
      rawText = resJson.choices?.[0]?.message?.content || "";
    } else {
      const currentAi = new GoogleGenAI({ apiKey });
      const parts = [
        {
          inlineData: {
            data: referenceImage.data,
            mimeType: referenceImage.mimeType
          }
        },
        { text: promptText }
      ];

      const response = await currentAi.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts },
        config: {
          maxOutputTokens: 8192,
          temperature: 0.7,
          responseMimeType: "application/json"
        }
      });
      rawText = response.text || "";
    }

    const rawParsed = robustJsonParse<any>(rawText);
    let slides: any[] = [];
    if (Array.isArray(rawParsed)) {
      slides = rawParsed;
    } else if (rawParsed && typeof rawParsed === 'object') {
      slides = rawParsed.slides || rawParsed.carousel || rawParsed.data || [rawParsed];
    }

    if (slides.length > 0) {
      return slides.map((s: any) => ({
        ...s,
        id: Math.random().toString(36).substring(7)
      }));
    }
  } catch (error) {
    console.error("Erro ao clonar post viral:", error);
  }

  // Fallback seguro gerando carrossel regular
  return generateCarouselContent(newTopic, numSlides, tone, brandName, includeImages);
}

/**
 * 6. Repurposing de Conteúdo (Artigos, Roteiros e Transcrições em Carrossel)
 */
export async function generateFromLongContent(
  longContent: string,
  numSlides: number = 7,
  tone: string = 'Profissional',
  brandName: string = 'SuaMarca',
  includeImages: boolean = false
): Promise<SlideData[]> {
  const prompt = `
Você é um estrategista especialista em "Content Repurposing" (transformação de conteúdos longos em carrosséis virais de alto engajamento no Instagram).

TEXTO ORIGINAL / TRANSCRIÇÃO / ARTIGO:
"""
${longContent}
"""

OBJETIVO:
Destile e transforme o texto acima em um carrossel de exatamente ${numSlides} slides com arco narrativo claro:
- Nome da Marca: "${brandName}"
- Tom de voz: "${tone}"
1. Slide 1 (Hero / Gancho): Frase de alto impacto que resume a grande promessa ou revelação do texto.
2. Slides Intermediários: Os conceitos-chave, passos práticos, dados ou lições mais valiosas (evite blocos gigantes de texto; sintetize em ideias fáceis de digerir).
3. Slide Final (CTA): Resumo e chamada para ação para seguir ou salvar.

ESPECIFICAÇÕES DOS SLIDES:
- Retorne EXCLUSIVAMENTE um array JSON com ${numSlides} slides.
- type: 'hero' | 'problem' | 'solution' | 'features' | 'details' | 'how-to' | 'cta'
- layoutModel: 'default' | 'forbes' | 'twitter' | 'ranking' | 'antes_depois' | 'dado_contexto' | 'checklist' | 'passo_a_passo' | 'timeline'
- background: 'light' | 'dark' | 'brand-gradient'
- tag: Categoria curta (máximo 2 palavras)
- title: Título conciso do slide
- content: Conteúdo essencial resumido (máximo 120 caracteres)
${includeImages ? '- imageDescription: Prompt de imagem conceitual em inglês' : ''}
- alignment: 'left' | 'center' | 'right'
`;

  const rawText = await callTextAi(prompt, 4000, true);
  const rawParsed = robustJsonParse<any>(rawText);
  let slides: any[] = [];
  if (Array.isArray(rawParsed)) {
    slides = rawParsed;
  } else if (rawParsed && typeof rawParsed === 'object') {
    slides = rawParsed.slides || rawParsed.carousel || rawParsed.data || [rawParsed];
  }

  if (slides.length > 0) {
    return slides.map((s: any) => ({
      ...s,
      id: Math.random().toString(36).substring(7)
    }));
  }

  throw new Error("Não foi possível sintetizar o texto longo em slides.");
}
