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
          modalities: ["image"]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API do OpenRouter ao gerar imagem: ${response.status} - ${errorText}`);
      }

      const resJson = await response.json();
      const imgUrl = resJson.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imgUrl) {
        throw new Error("A API da OpenRouter não retornou nenhuma imagem no campo esperado.");
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
  referenceImage: { data: string, mimeType: string }
): Promise<string> {
  try {
    const customKey = localStorage.getItem('custom_gemini_key');
    const customOpenRouterKey = localStorage.getItem('custom_openrouter_key');
    const customProvider = localStorage.getItem('custom_ai_provider') || 'gemini';
    const customModel = localStorage.getItem('custom_openrouter_model') || 'google/gemini-2.5-flash';
    
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
      background: 'brand-gradient' as const,
      tag: 'GUIA PRÁTICO',
      title: `Como Dominar:<br><span class="text-white font-extrabold">${subj}</span>`,
      content: 'Descubra a metodologia simples e eficiente para alcançar seus objetivos sem perder tempo.',
      alignment: 'center' as const
    }),
    // 1: Problem
    (subj: string, brand: string) => ({
      type: 'problem' as const,
      background: 'dark' as const,
      tag: 'ERROS COMUNS',
      title: 'Por que a maioria falha no início?',
      content: `Tentar dominar <strong>${subj}</strong> sem um método estruturado é o caminho mais rápido para a frustração. A falta de foco e consistência faz 90% das pessoas desistirem.`,
      alignment: 'left' as const
    }),
    // 2: Alerta
    (subj: string, brand: string) => ({
      type: 'problem' as const,
      background: 'dark' as const,
      tag: 'ATENÇÃO',
      title: 'O perigo de procrastinar',
      content: `Adiar o início de <strong>${subj}</strong> é o maior sabotador do seu crescimento. Cada dia de espera é uma oportunidade perdida para evoluir e se destacar.`,
      alignment: 'left' as const
    }),
    // 3: Solution
    (subj: string, brand: string) => ({
      type: 'solution' as const,
      background: 'light' as const,
      tag: 'A SOLUÇÃO',
      title: 'O Segredo Está na Metodologia',
      content: `A solução ideal para <strong>${subj}</strong> exige consistência diária e processos claros. Dividir a jornada em pequenas etapas torna o progresso inevitável.`,
      quote: { label: 'Foco no Processo', text: 'A consistência supera a intensidade. Pequenos passos geram grandes resultados.' },
      alignment: 'left' as const
    }),
    // 4: 3 Pillars (Features)
    (subj: string, brand: string) => ({
      type: 'features' as const,
      background: 'light' as const,
      tag: 'PILARES',
      title: '3 Pilares Indispensáveis',
      content: 'Para ter sucesso, foque na execução destes três fundamentos essenciais:',
      items: [
        { icon: '🎯', label: 'Clareza', description: 'Tenha metas bem definidas e mensuráveis.' },
        { icon: '⚡', label: 'Ação', description: 'Pratique todos os dias, mesmo que por poucos minutos.' },
        { icon: '📈', label: 'Ajuste', description: 'Analise seus resultados e corrija a rota constantemente.' }
      ],
      alignment: 'left' as const
    }),
    // 5: Step 1 Details
    (subj: string, brand: string) => ({
      type: 'details' as const,
      background: 'dark' as const,
      tag: 'PASSO 1',
      title: 'Fase 1: Planejamento',
      content: 'Antes de começar a executar, defina seu objetivo. Um bom planejamento poupa 80% do esforço desnecessário na hora de colocar a mão na massa.',
      alignment: 'left' as const
    }),
    // 6: Step 2 Details
    (subj: string, brand: string) => ({
      type: 'details' as const,
      background: 'dark' as const,
      tag: 'PASSO 2',
      title: 'Fase 2: Execução',
      content: 'A perfeição é inimiga da ação. Foque em começar e manter a regularidade. É através da prática que a verdadeira habilidade se desenvolve.',
      alignment: 'left' as const
    }),
    // 7: Step 3 Details
    (subj: string, brand: string) => ({
      type: 'details' as const,
      background: 'dark' as const,
      tag: 'PASSO 3',
      title: 'Fase 3: Otimização',
      content: 'Aprenda com seus erros e acertos. Otimizar seu processo em 1% todos os dias gera um impacto gigantesco ao longo do ano.',
      alignment: 'left' as const
    }),
    // 8: Hack
    (subj: string, brand: string) => ({
      type: 'details' as const,
      background: 'light' as const,
      tag: 'SEGREDO',
      title: 'O hack da consistência',
      content: 'Não dependa de motivação. Crie um ambiente favorável que force você a agir. A disciplina vence a motivação em 100% das vezes.',
      alignment: 'left' as const
    }),
    // 9: Mito ou Verdade
    (subj: string, brand: string) => ({
      type: 'details' as const,
      background: 'light' as const,
      tag: 'MITO OU VERDADE',
      title: 'Precisa de talento natural?',
      content: `<strong>Mito!</strong> Ninguém nasce sabendo <strong>${subj}</strong>. O sucesso é fruto de técnica, repetição e persistência. A prática supera qualquer talento.`,
      alignment: 'left' as const
    }),
    // 10: How-to
    (subj: string, brand: string) => ({
      type: 'how-to' as const,
      background: 'light' as const,
      tag: 'PASSO A PASSO',
      title: 'Plano de Ação Prático',
      content: 'Comece a aplicar esse método hoje mesmo seguindo estas etapas simples:',
      items: [
        { label: '1. Organize', description: 'Dedique 15 minutos para planejar seu dia.' },
        { label: '2. Comece', description: 'Inicie pela tarefa mais importante.' },
        { label: '3. Revise', description: 'Veja o que funcionou e o que pode melhorar.' }
      ],
      alignment: 'left' as const
    }),
    // 11: Checklist
    (subj: string, brand: string) => ({
      type: 'features' as const,
      background: 'light' as const,
      tag: 'CHECKLIST',
      title: 'Checklist de Sucesso',
      content: `Garanta que você possui tudo o que precisa para progredir em <strong>${subj}</strong>:`,
      items: [
        { icon: '✓', label: 'Meta clara definida por escrito' },
        { icon: '✓', label: 'Agenda reservada para execução diária' },
        { icon: '✓', label: 'Ambiente livre de distrações' }
      ],
      alignment: 'left' as const
    }),
    // 12: Inspiração
    (subj: string, brand: string) => ({
      type: 'details' as const,
      background: 'dark' as const,
      tag: 'INSPIRAÇÃO',
      title: 'O impacto a longo prazo',
      content: 'Imagine onde você estará daqui a um ano se começar a praticar hoje. O tempo vai passar de qualquer forma; a escolha de como usá-lo é sua.',
      alignment: 'left' as const
    }),
    // 13: Mindset
    (subj: string, brand: string) => ({
      type: 'details' as const,
      background: 'dark' as const,
      tag: 'MINDSET',
      title: 'A Mentalidade Correta',
      content: 'O sucesso não acontece por acaso. Ele é o resultado direto de hábitos diários construídos com foco e propósito. Não pare até se orgulhar do seu progresso.',
      alignment: 'left' as const
    }),
    // 14: CTA
    (subj: string, brand: string) => ({
      type: 'cta' as const,
      background: 'brand-gradient' as const,
      tag: 'DICA DE OURO',
      title: 'Quer aprender mais sobre isso?',
      content: `Deixe um comentário com sua principal dúvida sobre <strong>${subj}</strong>!<br>Siga <strong>@${brand}</strong> para receber conteúdos diários de alto valor.`,
      ctaText: `Seguir @${brand}`,
      alignment: 'center' as const
    })
  ];

  const middleTemplates = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const slides: SlideData[] = [];

  // Add Hero
  slides.push({
    ...templates[0](subject, brandName),
    id: Math.random().toString(36).substring(7),
    extendBackgroundToNext: isSeamless
  });

  if (numSlides === 2) {
    slides.push({
      ...templates[14](subject, brandName),
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
      ...templates[14](subject, brandName),
      id: Math.random().toString(36).substring(7)
    });
  }

  return slides;
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
    - tag: Uma categoria corta em maiúsculas. MÁXIMO 2 PALAVRAS.
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
    const customOpenRouterKey = localStorage.getItem('custom_openrouter_key');
    const customProvider = localStorage.getItem('custom_ai_provider') || 'gemini';
    const customModel = localStorage.getItem('custom_openrouter_model') || 'google/gemini-2.5-flash';
    
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
        response_format: { type: "json_object" }
      };

      const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      if (!openRouterResponse.ok) {
        const errorText = await openRouterResponse.text();
        throw new Error(`Erro na API do OpenRouter: ${openRouterResponse.status} - ${errorText}`);
      }

      const resJson = await openRouterResponse.json();
      const contentText = resJson.choices?.[0]?.message?.content;
      if (!contentText) {
        throw new Error("A API do OpenRouter não retornou conteúdo na resposta.");
      }

      let slides = JSON.parse(contentText.trim());
      
      if (!Array.isArray(slides)) {
        if (slides && typeof slides === 'object' && Array.isArray(slides.slides)) {
          slides = slides.slides;
        } else {
          slides = [slides];
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
    console.error("Erro na geração do Gemini, usando fallback local:", error);
    return generateLocalCarouselFallback(topic, numSlides, tone, brandName, includeImages, isSeamless);
  }
}
