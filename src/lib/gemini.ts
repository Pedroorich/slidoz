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
  background: 'light' | 'dark' | 'brand-gradient';
  backgroundImage?: string;
  imageDescription?: string;
  imageUrl?: string;
  imagePosition?: 'top' | 'center' | 'bottom' | 'background';
  tag?: string;
  title: string;
  content?: string;
  items?: { icon?: string; label: string; description?: string }[];
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
}

export async function generateImage(
  prompt: string,
  referenceImage?: { data: string, mimeType: string },
  aspectRatio: string = "4:3",
  slideType?: string,
  slideIndex?: number
): Promise<string> {
  try {
    const customKey = localStorage.getItem('custom_gemini_key');
    const currentAi = new GoogleGenAI({ apiKey: customKey || process.env.API_KEY || process.env.GEMINI_API_KEY || "DUMMY_KEY" });
    
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
  referenceImage: { data: string, mimeType: string }
): Promise<string> {
  try {
    const customKey = localStorage.getItem('custom_gemini_key');
    const currentAi = new GoogleGenAI({ apiKey: customKey || process.env.API_KEY || process.env.GEMINI_API_KEY || "DUMMY_KEY" });
    
    const parts = [
      {
        inlineData: {
          data: referenceImage.data,
          mimeType: referenceImage.mimeType
        }
      },
      { text: "Analyze this image and describe its core visual style. Focus exclusively on lighting, color palette, camera effects, artistic medium/texture, and mood. Provide a concise, highly descriptive 2-sentence prompt fragment that can be used to instruct an image generator to replicate this exact same visual styling and framing." }
    ];

    const response = await currentAi.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: { parts },
      config: { maxOutputTokens: 250 }
    });

    return response.text || "";
  } catch (error) {
    console.error("Erro ao analisar referência criativa:", error);
    return ""; // Fallback if analysis fails so it doesn't break everything
  }
}

export function buildCinematicImagePrompt(
  baseDescription: string,
  slideType: string,
  slideIndex: number,
  topic: string,
  tone: string,
  hasAvatar: boolean,
  creativeStylePrompt?: string
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

  return `
[FINAL_MODE]
Masterpiece, award-winning 8K editorial photography.
SCENE CONCEPT & DETAILS: ${baseDescription}

TECHNICAL GUIDANCE (Use these to enhance the scene, but do not override the core concept above):
- Shot & Camera: ${config.shot}, ${config.camera}.
- Lighting & Mood: ${config.lighting}. ${config.mood}.
- Default Composition: ${config.composition}. ${customStyleInstruction}
${avatarInstruction}

CRITICAL RULES: 
- Deixe sempre 30% de espaço livre (espaço negativo) para que o app sobreponha os textos do carrossel.
- Proibido gerar textos ou letras dentro da imagem. No text, no watermarks, no logos in the image.
- Ultra-sharp focus on subject. Photorealistic, highly detailed, cinematic color grading.
  `.trim();
}

export async function generateCarouselContent(
  topic: string,
  numSlides: number,
  tone: string,
  brandName: string,
  includeImages: boolean,
  hasReferenceImage: boolean = false,
  isSeamless: boolean = false
): Promise<SlideData[]> {
  const prompt = `
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
    
    Retorne um array JSON de slides. Cada slide deve ter:
    - type: 'hero', 'problem', 'solution', 'features', 'details', 'how-to', ou 'cta'
    - background: 'light', 'dark', ou 'brand-gradient'
    - tag: Uma categoria curta em maiúsculas. MÁXIMO 2 PALAVRAS.
    - title: O título principal do slide.
    - content: Texto de corpo com o conteúdo real e educativo do post.
    - items: Array de { label, description } para features ou passos (opcional)
    - quote: Objeto com { label, text } para slide de solução (opcional)
    - ctaText: Texto para o botão no slide de CTA (opcional)
    - alignment: 'left', 'center', ou 'right' (padrão 'left', 'center' para hero/cta)
    ${includeImages && !hasReferenceImage ? `- imageDescription: OBRIGATÓRIO (em inglês). Crie um prompt de IA DETALHADO, EXTREMAMENTE CRIATIVO E METAFÓRICO para este slide. Entenda profundamente o conteúdo do slide em relação ao tema todo e proponha uma imagem que prenda a atenção e expresse a mensagem principal. Use cenas cinematográficas, ângulos interessantes e descrições ricas. (ex: "cinematic wide angle, a surreal floating clock wrapped in glowing neon threads representing time management, deep purple and cyan cyberpunk lighting, ultra detailed 8k photography, sharp focus").` : ''}
    ${includeImages && hasReferenceImage ? `- imageDescription: OBRIGATÓRIO (em inglês). Crie uma descrição CRIATIVA E IMPULSIONADORA para inserir o Avatar do cliente com perfeição neste slide. A cena deve traduzir o conteúdo do slide (MÁXIMO 250 CARACTERES).` : ''}
    ${includeImages ? `- imagePosition: 'top', 'center', 'bottom', ou 'background'.` : ''}
    ${isSeamless ? `- extendBackgroundToNext: BOOLEAN. Set to true for odd-numbered slides (1st, 3rd, 5th...) to create a seamless carousel.` : ''}
  `;

  try {
    const customKey = localStorage.getItem('custom_gemini_key');
    const currentAi = new GoogleGenAI({ apiKey: customKey || process.env.API_KEY || process.env.GEMINI_API_KEY || "DUMMY_KEY" });
    
    const response = await currentAi.models.generateContent({
      model: "gemini-3.5-flash",
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
              tag: { type: Type.STRING, enum: ['DICAS', 'ALERTA', 'GUIA', 'TUTORIAL', 'NOVIDADE', 'SEGREDO', 'PASSO A PASSO', 'IMPORTANTE', 'ATENÇÃO', 'MITO OU VERDADE', 'CHECKLIST', 'INSPIRAÇÃO', 'CONCEITO', 'ESTRATÉGIA', 'MINDSET', 'BASTIDORES', 'CASE DE SUCESSO', 'ERROS COMUNS', 'FERRAMENTAS', 'TENDÊNCIA'], description: "Escolha uma tag que melhor se adapta ao slide." },
              title: { type: Type.STRING, description: "O título principal do slide. Deve ser o conteúdo real para o usuário." },
              content: { type: Type.STRING, description: "O texto de corpo do slide. DEVE conter o conteúdo educativo ou informativo. NÃO coloque descrições de imagem aqui." },
              imageDescription: { type: Type.STRING, description: "Descrição visual para o gerador de imagens IA. Máximo 150 caracteres. Descreva apenas a cena visual." },
              imagePosition: { type: Type.STRING, enum: ['top', 'center', 'bottom', 'background'] },
              extendBackgroundToNext: { type: Type.BOOLEAN },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    description: { type: Type.STRING },
                    icon: { type: Type.STRING }
                  }
                }
              },
              quote: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  text: { type: Type.STRING }
                }
              },
              ctaText: { type: Type.STRING },
              alignment: { type: Type.STRING, enum: ['left', 'center', 'right'] }
            },
            required: ['type', 'background', 'title', 'content', 'alignment']
          }
        }
      }
    });

    let text = response.text;
    if (!text) throw new Error("A IA não retornou nenhum texto.");
    
    // Remove markdown formatting if present
    text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    
    let slides;
    try {
      slides = JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse JSON:", text);
      
      // Robust JSON repair for truncated arrays
      let t = text.trim();
      let repaired = false;
      
      if (t.startsWith('[')) {
        while (t.length > 1) {
          try {
            let attempt = t;
            if (!attempt.endsWith(']')) {
              if (!attempt.endsWith('}')) {
                 attempt += '"}'; // Try to close a potential open string and object
              }
              attempt += ']';
            }
            slides = JSON.parse(attempt);
            repaired = true;
            console.log("Successfully repaired truncated JSON.");
            break;
          } catch (e) {
            // Remove the last character and try again, or jump to the last structural character
            const lastComma = t.lastIndexOf(',');
            const lastBrace = t.lastIndexOf('}');
            const cutIndex = Math.max(lastComma, lastBrace);
            
            if (cutIndex <= 0) {
              break;
            }
            t = t.substring(0, cutIndex);
          }
        }
      }
      
      if (!repaired) {
        throw new Error("A IA gerou um formato inválido que não pôde ser recuperado. Por favor, tente gerar novamente.");
      }
    }
    
    if (!Array.isArray(slides)) {
      if (slides && typeof slides === 'object' && Array.isArray(slides.slides)) {
        slides = slides.slides;
      } else {
        slides = [slides];
      }
    }

    return slides.map((s: any, index: number) => {
      // If seamless, even slides might not have an image description
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
    console.error("Erro na geração do Gemini:", error);
    throw new Error(error.message || "Falha ao gerar o conteúdo do carrossel.");
  }
}
