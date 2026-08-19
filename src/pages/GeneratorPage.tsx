import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { generatePalette, FONT_PAIRINGS, loadAllGoogleFonts } from '../lib/colors';
import { 
  generateCarouselContent, 
  generateImage, 
  buildCinematicImagePrompt, 
  analyzeCreativeReference, 
  analyzePhotoQuietZone, 
  SlideData,
  generatePostCaption,
  PostCaptionResult,
  generateHookVariations,
  HookVariation,
  analyzeAndCloneViralPost,
  generateFromLongContent
} from '../lib/gemini';
import { CarouselPreview } from '../components/CarouselPreview';
import { SlideEditor } from '../components/SlideEditor';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { 
  Loader2, 
  Download, 
  Wand2, 
  Image as ImageIcon, 
  Upload, 
  Key, 
  ArrowLeft, 
  Settings, 
  LayoutGrid, 
  Edit3, 
  ChevronDown, 
  ChevronRight, 
  X, 
  Bookmark, 
  Plus, 
  Trash2,
  Sparkles,
  MessageSquare,
  Copy,
  Check,
  FileText,
  Flame,
  Zap,
  Lightbulb,
  RefreshCw,
  User
} from 'lucide-react';
import { CarouselHistoryItem } from './Dashboard';
import { get, set } from 'idb-keyval';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

// Declare window.aistudio for TypeScript
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const urlToBase64 = async (url: string): Promise<string> => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  
  // Use wsrv.nl proxy to bypass CORS
  const proxiedUrl = url.includes('wsrv.nl') ? url : `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
  
  try {
    const res = await fetch(proxiedUrl);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error(`Erro ao converter imagem para base64: ${url}`, err);
    return url; // fallback to original URL
  }
};

export default function GeneratorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [topic, setTopic] = useState('');
  const [numSlides, setNumSlides] = useState(7);
  const [tone, setTone] = useState('Profissional');
  const [brandName, setBrandName] = useState('SuaMarca');
  const [handle, setHandle] = useState('@seu_usuario');
  const [primaryColor, setPrimaryColor] = useState('#6C63FF');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [darkBgColor, setDarkBgColor] = useState('');
  const [lightBgColor, setLightBgColor] = useState('');
  const [showAdvancedColors, setShowAdvancedColors] = useState(false);
  const [fontPairingIndex, setFontPairingIndex] = useState(0);
  const [includeImages, setIncludeImages] = useState(false);
  const [isSeamless, setIsSeamless] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [brandAvatar, setBrandAvatar] = useState<{data: string, mimeType: string, url: string} | null>(null);
  const [useBrandAvatar, setUseBrandAvatar] = useState<boolean>(true);

  // Modos de Criação Inovadores
  const [creationMode, setCreationMode] = useState<'topic' | 'clone_viral' | 'repurpose'>('topic');
  const [viralReferenceImage, setViralReferenceImage] = useState<{data: string, mimeType: string, url: string} | null>(null);
  const [longContentText, setLongContentText] = useState('');
  const viralReferenceInputRef = useRef<HTMLInputElement>(null);

  // Modal Otimizador de Ganchos (Hook Score)
  const [showHookOptimizer, setShowHookOptimizer] = useState(false);
  const [hookVariations, setHookVariations] = useState<HookVariation[]>([]);
  const [isLoadingHooks, setIsLoadingHooks] = useState(false);

  // Modal Gerador de Legenda e Hashtags
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [postCaptionData, setPostCaptionData] = useState<PostCaptionResult | null>(null);
  const [isLoadingCaption, setIsLoadingCaption] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);
  const [copiedComment, setCopiedComment] = useState(false);
  const [referenceImage, setReferenceImage] = useState<{data: string, mimeType: string, url: string} | null>(null);
  const [creativeReference, setCreativeReference] = useState<{data: string, mimeType: string, url: string} | null>(null);
  const [creativeStylePrompt, setCreativeStylePrompt] = useState<string>('');
  const [clientPhotos, setClientPhotos] = useState<{data: string, mimeType: string, url: string}[]>([]);
  
  const [savedPalettes, setSavedPalettes] = useState<{id: string, name: string, color: string, secondary?: string, accent?: string, darkBg?: string, lightBg?: string}[]>([]);
  const [isSavingPalette, setIsSavingPalette] = useState(false);
  const [newPaletteName, setNewPaletteName] = useState('');
  
  const [customTones, setCustomTones] = useState<{id: string, name: string, description: string}[]>([]);
  const [selectedToneOption, setSelectedToneOption] = useState('Profissional');
  const [newToneName, setNewToneName] = useState('');
  const [newToneDescription, setNewToneDescription] = useState('');
  
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [format, setFormat] = useState<'portrait' | 'square' | 'stories'>('portrait');
  const [generationLayout, setGenerationLayout] = useState<'default' | 'forbes' | 'twitter' | 'frases'>('default');
  const [phraseCategory, setPhraseCategory] = useState('Motivação');
  const [customPhrases, setCustomPhrases] = useState('');

  // Mobile Tabs
  const [activeTab, setActiveTab] = useState<'config' | 'preview' | 'edit'>('config');

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportedImages, setExportedImages] = useState<string[]>([]);

  // Debounce saving to history to prevent lag
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveToHistoryDebounced = useCallback((generatedSlides: SlideData[]) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveToHistory(generatedSlides);
    }, 1500);
  }, []);

  // Collapsible sections
  const [openSections, setOpenSections] = useState({
    content: true,
    brand: true,
    images: false
  });

  // Progress bar state
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');

  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const referenceImageInputRef = useRef<HTMLInputElement>(null);
  const creativeReferenceInputRef = useRef<HTMLInputElement>(null);
  const clientPhotosInputRef = useRef<HTMLInputElement>(null);
  const brandAvatarInputRef = useRef<HTMLInputElement>(null);

  const handleBrandAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setBrandAvatar({
          data: base64String,
          mimeType: file.type,
          url: reader.result as string
        });
        setUseBrandAvatar(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const palette = useMemo(() => generatePalette(primaryColor, secondaryColor, accentColor, darkBgColor, lightBgColor), [primaryColor, secondaryColor, accentColor, darkBgColor, lightBgColor]);
  const selectedFonts = useMemo(() => FONT_PAIRINGS[fontPairingIndex] || FONT_PAIRINGS[0], [fontPairingIndex]);

  useEffect(() => {
    get('carousel_palettes').then((data) => {
      if (data && Array.isArray(data)) {
        setSavedPalettes(data);
      }
    });
    get('carousel_custom_tones').then((data) => {
      if (data && Array.isArray(data)) {
        setCustomTones(data);
      }
    });
  }, []);

  const handleSavePalette = () => {
    if (!newPaletteName.trim()) return;
    const newP = { 
      id: Date.now().toString(), 
      name: newPaletteName, 
      color: primaryColor,
      secondary: secondaryColor,
      accent: accentColor,
      darkBg: darkBgColor,
      lightBg: lightBgColor
    };
    const updated = [...savedPalettes, newP];
    setSavedPalettes(updated);
    set('carousel_palettes', updated);
    setNewPaletteName('');
    setIsSavingPalette(false);
  };

  const handleDeletePalette = (id: string) => {
    const updated = savedPalettes.filter(p => p.id !== id);
    setSavedPalettes(updated);
    set('carousel_palettes', updated);
  };

  const loadedCarouselIdRef = useRef<string | null>(null);
  const currentCarouselIdRef = useRef<string | null>(null);

  useEffect(() => {
    loadAllGoogleFonts();
    checkApiKey();
    
    // Sanitize any wrongly placed model values
    const savedModel = localStorage.getItem('custom_openrouter_model');
    const validModels = [
      'google/gemini-2.5-flash',
      'google/gemini-2.5-pro',
      'anthropic/claude-3.5-sonnet',
      'deepseek/deepseek-chat',
      'meta-llama/llama-3.1-405b-instruct'
    ];
    if (savedModel && !validModels.includes(savedModel)) {
      if (savedModel !== 'Chave teste') {
        localStorage.setItem('custom_openrouter_model_custom', savedModel);
      }
      localStorage.setItem('custom_openrouter_model', 'google/gemini-2.5-flash');
    }
    
    // Load from history if passed via state
    if (location.state?.carouselData) {
      const data = location.state.carouselData as CarouselHistoryItem;
      if (loadedCarouselIdRef.current !== data.id) {
        loadedCarouselIdRef.current = data.id;
        currentCarouselIdRef.current = data.id;
        setSlides(data.slides || []);
        setTopic(data.topic || '');
        setBrandName(data.brandName || 'SuaMarca');
        if (data.handle !== undefined) setHandle(data.handle);
        setPrimaryColor(data.primaryColor || '#6C63FF');
        setSecondaryColor(data.secondaryColor || '');
        setAccentColor(data.accentColor || '');
        setDarkBgColor(data.darkBgColor || '');
        setLightBgColor(data.lightBgColor || '');
        setTone(data.tone || 'Profissional');
        setFontPairingIndex(data.fontPairingIndex ?? 0);
        setNumSlides(data.numSlides || 7);
        if (data.isSeamless !== undefined) setIsSeamless(data.isSeamless);
        if (data.logoUrl !== undefined) setLogoUrl(data.logoUrl);
        if (data.format !== undefined) setFormat(data.format);
        if (data.generationLayout !== undefined) setGenerationLayout(data.generationLayout);
        if (data.phraseCategory !== undefined) setPhraseCategory(data.phraseCategory);
        if (data.customPhrases !== undefined) setCustomPhrases(data.customPhrases);
        if (data.brandAvatar !== undefined) setBrandAvatar(data.brandAvatar);
        if (data.useBrandAvatar !== undefined) setUseBrandAvatar(data.useBrandAvatar);
        setActiveTab('preview');

        const defaultTones = ['Profissional', 'Casual', 'Divertido', 'Ousado', 'Minimalista', 'Educativo'];
        if (defaultTones.includes(data.tone)) {
          setSelectedToneOption(data.tone);
        } else {
          get('carousel_custom_tones').then((savedTones) => {
            const matched = Array.isArray(savedTones) && savedTones.find(ct => ct.description === data.tone);
            if (matched) {
              setSelectedToneOption(matched.id);
            } else {
              setSelectedToneOption('custom_new');
              setNewToneDescription(data.tone);
            }
          });
        }
      }
    } else if (location.state?.mode === 'manual' && slides.length === 0) {
      const manualId = `manual-${Date.now()}`;
      loadedCarouselIdRef.current = manualId;
      currentCarouselIdRef.current = manualId;
      // Initialize empty slides for manual mode
      const emptySlides: SlideData[] = Array.from({ length: numSlides }).map((_, i) => ({
        id: `manual-${Date.now()}-${i}`,
        type: i === 0 ? 'hero' : (i === numSlides - 1 ? 'cta' : 'features'),
        background: 'light',
        title: i === 0 ? 'Título do Carrossel' : `Slide ${i + 1}`,
        content: 'Clique para editar o texto...',
        alignment: 'center',
        verticalAlignment: 'center',
        extendBackgroundToNext: isSeamless,
        layoutModel: 'default',
        textOffsetX: 0,
        textOffsetY: 0,
        twitterImages: [],
        twitterImageBorderRadius: 14,
        twitterImageHeight: 200,
        forbesQuoteColor: '#F9D30B'
      }));
      setSlides(emptySlides);
      setActiveTab('preview');
    }
  }, [location.state]);

  const checkApiKey = async () => {
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(hasKey);
    } else {
      // Fallback if running outside AI Studio
      setHasApiKey(true);
    }
  };

  const handleSelectApiKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Assume success to mitigate race conditions
      setHasApiKey(true);
    }
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (hasApiKey === false) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 font-['DM_Sans']">
        <div className="bg-[#161616] border border-[rgba(255,255,255,0.06)] p-8 rounded-2xl shadow-xl max-w-md w-full text-center flex flex-col items-center gap-6">
          <div className="w-16 h-16 bg-[rgba(108,99,255,0.1)] rounded-full flex items-center justify-center text-[#6C63FF]">
            <Key size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2 font-['Syne']">Chave de API Necessária</h1>
            <p className="text-[rgba(240,240,240,0.6)] text-sm leading-relaxed">
              Para utilizar o modelo de geração de imagens de alta qualidade, você precisa selecionar uma chave de API de um projeto Google Cloud pago.
            </p>
          </div>
          <div className="w-full">
            <button 
              onClick={handleSelectApiKey}
              className="w-full py-3 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              Selecionar Chave de API
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleViralReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      setViralReferenceImage({
        data: base64Data,
        mimeType: file.type,
        url: URL.createObjectURL(file)
      });
    };
    reader.readAsDataURL(file);
  };

  const handleOpenHookOptimizer = async () => {
    setShowHookOptimizer(true);
    if (hookVariations.length === 0) {
      setIsLoadingHooks(true);
      try {
        const activeTopic = topic.trim() || slides[0]?.title || 'Como alcançar resultados extraordinários';
        const currentTitle = slides[0]?.title || '';
        const variations = await generateHookVariations(activeTopic, tone, brandName, currentTitle);
        setHookVariations(variations);
      } catch (err) {
        console.error("Erro ao gerar variações de ganchos:", err);
      } finally {
        setIsLoadingHooks(false);
      }
    }
  };

  const handleApplyHook = (hookText: string) => {
    if (slides.length > 0) {
      const updated = [...slides];
      updated[0] = {
        ...updated[0],
        title: hookText
      };
      setSlides(updated);
      saveToHistory(updated);
      setShowHookOptimizer(false);
    }
  };

  const handleOpenCaptionModal = async () => {
    setShowCaptionModal(true);
    if (!postCaptionData && slides.length > 0) {
      setIsLoadingCaption(true);
      try {
        const activeTopic = topic.trim() || slides[0]?.title || 'Carrossel';
        const result = await generatePostCaption(activeTopic, slides, brandName, tone);
        setPostCaptionData(result);
      } catch (err) {
        console.error("Erro ao gerar legenda:", err);
      } finally {
        setIsLoadingCaption(false);
      }
    }
  };

  const handleRegenerateCaption = async () => {
    if (slides.length === 0) return;
    setIsLoadingCaption(true);
    try {
      const activeTopic = topic.trim() || slides[0]?.title || 'Carrossel';
      const result = await generatePostCaption(activeTopic, slides, brandName, tone);
      setPostCaptionData(result);
    } catch (err) {
      console.error("Erro ao regenerar legenda:", err);
    } finally {
      setIsLoadingCaption(false);
    }
  };

  const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setReferenceImage({
          data: base64String,
          mimeType: file.type,
          url: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreativeReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setCreativeReference({
          data: base64String,
          mimeType: file.type,
          url: reader.result as string
        });
        setIncludeImages(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClientPhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          setClientPhotos(prev => [
            ...prev,
            {
              data: base64String,
              mimeType: file.type,
              url: reader.result as string
            }
          ]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const saveToHistory = async (generatedSlides: SlideData[], currentTopic?: string) => {
    if (!generatedSlides || generatedSlides.length === 0) return;
    const activeTopic = currentTopic || topic;
    const itemId = currentCarouselIdRef.current || location.state?.carouselData?.id || Math.random().toString(36).substring(7);
    currentCarouselIdRef.current = itemId;
    loadedCarouselIdRef.current = itemId;

    const historyItem: CarouselHistoryItem = {
      id: itemId,
      title: generatedSlides[0]?.title || activeTopic || 'Carrossel',
      topic: activeTopic,
      numSlides: generatedSlides.length,
      slides: generatedSlides,
      brandName,
      handle,
      primaryColor,
      secondaryColor,
      accentColor,
      darkBgColor,
      lightBgColor,
      tone,
      fontPairingIndex,
      isSeamless,
      logoUrl,
      format,
      generationLayout,
      phraseCategory,
      customPhrases,
      brandAvatar,
      useBrandAvatar,
      createdAt: location.state?.carouselData?.createdAt || Date.now()
    };
    try {
      let existing = await get<CarouselHistoryItem[]>('carousel_history');
      if (!existing) {
        const localSaved = localStorage.getItem('carousel_history');
        existing = localSaved ? JSON.parse(localSaved) : [];
      }
      
      // Update existing or add new
      const filtered = (existing || []).filter(item => item.id !== historyItem.id);
      const updatedHistory = [historyItem, ...filtered].slice(0, 50);
      
      await set('carousel_history', updatedHistory);
      localStorage.removeItem('carousel_history');
    } catch (e) {
      console.error('Failed to save to history', e);
    }
  };

  // Auto-save visual options and brand settings when they change (if slides exist)
  useEffect(() => {
    if (slides.length > 0 && !isGenerating) {
      saveToHistoryDebounced(slides);
    }
  }, [
    primaryColor,
    secondaryColor,
    accentColor,
    darkBgColor,
    lightBgColor,
    fontPairingIndex,
    brandName,
    handle,
    format,
    generationLayout,
    isSeamless,
    logoUrl,
    brandAvatar,
    useBrandAvatar,
    tone,
    topic,
    saveToHistoryDebounced
  ]);

  const handleGenerate = async () => {
    let activeTopic = topic;
    if (generationLayout === 'frases' && !topic) {
      if (customPhrases && customPhrases.trim()) {
        const firstLine = customPhrases.split('\n')[0]?.trim();
        activeTopic = firstLine ? (firstLine.substring(0, 40) + "...") : "Frases Personalizadas";
      } else {
        activeTopic = `Frases de ${phraseCategory}`;
      }
      setTopic(activeTopic);
    }

    if (creationMode === 'clone_viral' && !viralReferenceImage) {
      setErrorMessage('Por favor, envie um print ou imagem do post viral para a IA clonar.');
      return;
    }

    if (creationMode === 'repurpose' && !longContentText.trim()) {
      setErrorMessage('Por favor, cole o texto longo, artigo ou transcrição de vídeo.');
      return;
    }

    if (creationMode === 'topic' && !activeTopic) {
      setErrorMessage('Por favor, insira um tópico ou ideia.');
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);
    setProgress(0);
    setProgressText('Analisando o tema...');
    setActiveTab('preview');
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(p => {
        if (p < 20) {
          setProgressText('Estruturando os slides...');
          return p + 2;
        } else if (p < 50) {
          setProgressText('Escrevendo o conteúdo em português...');
          return p + 1.5;
        } else if (p < 80) {
          setProgressText('Aplicando o design da marca...');
          return p + 1;
        } else if (p < 95 && !includeImages) {
          setProgressText('Finalizando detalhes...');
          return p + 0.5;
        }
        return p;
      });
    }, 500);

    try {
      let finalSlides: SlideData[];

      if (creationMode === 'clone_viral' && viralReferenceImage) {
        setProgressText('Analisando post viral e clonando estrutura...');
        finalSlides = await analyzeAndCloneViralPost(
          viralReferenceImage,
          activeTopic || 'Como dominar este tema',
          tone,
          brandName,
          numSlides,
          includeImages
        );
      } else if (creationMode === 'repurpose' && longContentText.trim()) {
        setProgressText('Destilando e sintetizando texto longo...');
        finalSlides = await generateFromLongContent(
          longContentText,
          numSlides,
          tone,
          brandName,
          includeImages
        );
      } else {
        finalSlides = await generateCarouselContent(
          activeTopic,
          numSlides,
          tone,
          brandName,
          includeImages,
          !!referenceImage,
          isSeamless,
          generationLayout,
          phraseCategory,
          customPhrases
        );
      }
      
      // Mostrar os slides imediatamente com o texto
      setSlides([...finalSlides]);
      setCurrentIndex(0);
      
      // Limpa dados de legenda anteriores para gerar novos quando solicitado
      setPostCaptionData(null);
      setHookVariations([]);
      
      let hasImageErrors = false;
      let lastImageError: string | null = null;

      // MÓDULO 2 & 3: Imagens Próprias do Cliente (Prioritárias)
      if (generationLayout === 'frases' && clientPhotos.length > 0) {
        clearInterval(progressInterval);
        setProgressText('Processando fotos do cliente...');

        // Analisar o estilo da primeira foto para servir de referência para quaisquer slides extras
        let activeStylePrompt = creativeStylePrompt;
        try {
          setProgressText('Analisando estilo das fotos do cliente...');
          activeStylePrompt = await analyzeCreativeReference(clientPhotos[0], generationLayout);
          setCreativeStylePrompt(activeStylePrompt);
        } catch (styleErr) {
          console.error("Falha ao analisar estilo da foto de referência:", styleErr);
        }

        // Processar cada slide
        for (let index = 0; index < finalSlides.length; index++) {
          const slide = finalSlides[index];

          if (index < clientPhotos.length) {
            // MÓDULO 2 & 3: Foto própria do cliente como fundo
            // Atribuir a foto exatamente como fornecida (sem filtros, crop ou reframe na IA)
            finalSlides[index] = {
              ...slide,
              backgroundImage: clientPhotos[index].url,
              isClientPhoto: true,
              imageUrl: undefined // Sem imagem gerada IA
            };
            
            // Analisar a imagem para identificar a "quiet zone"
            try {
              setProgressText(`Analisando zona de silêncio na foto ${index + 1}...`);
              const placement = await analyzePhotoQuietZone(clientPhotos[index]);
              finalSlides[index].alignment = placement.alignment;
              finalSlides[index].verticalAlignment = placement.verticalAlignment;
              finalSlides[index].textOffsetX = placement.textOffsetX;
              finalSlides[index].textOffsetY = placement.textOffsetY;
              finalSlides[index].bgGradientOpacity = placement.bgGradientOpacity;
              finalSlides[index].bgGradientPosition = placement.verticalAlignment === 'top' ? 'top' : 'bottom';
            } catch (placementErr) {
              console.error(`Erro ao analisar quiet zone do slide ${index + 1}:`, placementErr);
              // Fallbacks padrão seguros
              finalSlides[index].alignment = 'center';
              finalSlides[index].verticalAlignment = 'bottom';
              finalSlides[index].bgGradientOpacity = 0.4;
            }
          } else {
            // MÓDULO 3: Se houver mais slides do que fotos, gera novas imagens combinando o estilo das fotos enviadas
            try {
              setProgressText(`Gerando imagem complementar no estilo do cliente para slide ${index + 1}...`);
              const aspectRatio = "4:3";
              const cinematicPrompt = buildCinematicImagePrompt(
                slide.imageDescription || slide.title || '',
                slide.type,
                index,
                activeTopic,
                tone,
                false, // hasAvatar
                activeStylePrompt,
                generationLayout,
                slide.title,
                slide.content
              );
              // Envia clientPhotos[0] como referência de estilo (creativeReference)
              const imageUrl = await generateImage(cinematicPrompt, clientPhotos[0], aspectRatio, slide.type, index);
              finalSlides[index] = {
                ...slide,
                imageUrl,
                isClientPhoto: false
              };
            } catch (genErr: any) {
              console.error(`Erro ao gerar slide extra ${index + 1}:`, genErr);
              hasImageErrors = true;
              lastImageError = genErr.message || String(genErr);
            }
          }
          // Atualiza o preview em tempo real
          setSlides([...finalSlides]);
        }
      } else if (includeImages) {
        clearInterval(progressInterval);
 
        let activeStylePrompt = creativeStylePrompt;
        if (creativeReference) {
          setProgressText('Analisando referência criativa...');
          activeStylePrompt = await analyzeCreativeReference(creativeReference, generationLayout);
          setCreativeStylePrompt(activeStylePrompt);
        }
        
        const slidesWithImages = finalSlides.filter(s => s.imageDescription);
        const totalImages = slidesWithImages.length;
        
        if (totalImages > 0) {
          setProgressText(`Iniciando geração de ${totalImages} imagens...`);
          let completedCount = 0;
 
          // Gerar em lotes para agilizar o processo sem sobrecarregar a API
          const batchSize = 3;
          const imageTasks = finalSlides
             .map((slide, index) => ({ slide, index }))
             .filter(item => item.slide.imageDescription);
 
          for (let i = 0; i < imageTasks.length; i += batchSize) {
            const batch = imageTasks.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async ({ slide, index }) => {
              try {
                const aspectRatio = "4:3";
                const hasAvatar = (useBrandAvatar && !!brandAvatar) || !!referenceImage;
                const activeImageRef = (useBrandAvatar && brandAvatar) ? brandAvatar : (creativeReference || referenceImage || undefined);

                const cinematicPrompt = buildCinematicImagePrompt(
                  slide.imageDescription || '',
                  slide.type,
                  index,
                  activeTopic,
                  tone,
                  hasAvatar,
                  activeStylePrompt,
                  slide.layoutModel || generationLayout,
                  slide.title,
                  slide.content
                );
                const imageUrl = await generateImage(cinematicPrompt, activeImageRef, aspectRatio, slide.type, index);
                
                finalSlides[index] = { ...slide, imageUrl };
                setSlides([...finalSlides]);
              } catch (e: any) {
                console.error("Erro na imagem do slide", slide.id, e);
                hasImageErrors = true;
                lastImageError = e.message || String(e);
              } finally {
                completedCount++;
                setProgressText(`Gerando imagens... (${completedCount} de ${totalImages})`);
                setProgress(80 + (completedCount / totalImages) * 15);
              }
            }));
          }
        }
      }

      setProgress(100);
      setProgressText('Concluído!');
      saveToHistory(finalSlides, activeTopic);

      // Grava log de geração no Firestore para auditoria
      if (user && profile) {
        try {
          await addDoc(collection(db, 'activity_logs'), {
            userId: user.uid,
            userEmail: user.email || '',
            userName: profile.name || 'Usuário',
            action: 'generate',
            topic: activeTopic,
            numSlides: numSlides,
            timestamp: serverTimestamp()
          });
        } catch (logError) {
          console.error("Falha ao gravar log de geração no Firestore:", logError);
        }
      }
      
      if (hasImageErrors) {
        setErrorMessage(`O carrossel foi gerado, mas houve um erro ao gerar as imagens: ${lastImageError || 'Erro desconhecido'}. Você pode tentar gerar novamente ou adicionar suas próprias imagens.`);
      }
    } catch (error: any) {
      console.error(error);
      setErrorMessage(`Falha ao gerar o carrossel: ${error.message}`);
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsGenerating(false);
        setProgress(0);
      }, 1000);
    }
  };

  const handleExport = async () => {
    if (!slides.length || !previewRef.current) return;
    setIsExporting(true);
    
    // Salva o estado original antes da conversão temporária para base64
    const originalSlides = [...slides];
    const originalLogo = logoUrl;

    try {
      // 1. Converter todas as imagens remotas dos slides e logo para base64
      // Isso imuniza a renderização de canvas de restrições CORS no SVG.
      const slidesWithBase64 = await Promise.all(slides.map(async (slide) => {
        const updated = { ...slide };
        if (slide.backgroundImage && !slide.backgroundImage.startsWith('data:') && !slide.backgroundImage.startsWith('blob:')) {
          updated.backgroundImage = await urlToBase64(slide.backgroundImage);
        }
        if (slide.imageUrl && !slide.imageUrl.startsWith('data:') && !slide.imageUrl.startsWith('blob:')) {
          updated.imageUrl = await urlToBase64(slide.imageUrl);
        }
        if (slide.comparisonImageA && !slide.comparisonImageA.startsWith('data:') && !slide.comparisonImageA.startsWith('blob:')) {
          updated.comparisonImageA = await urlToBase64(slide.comparisonImageA);
        }
        if (slide.comparisonImageB && !slide.comparisonImageB.startsWith('data:') && !slide.comparisonImageB.startsWith('blob:')) {
          updated.comparisonImageB = await urlToBase64(slide.comparisonImageB);
        }
        return updated;
      }));

      let exportedLogoUrl = logoUrl;
      if (logoUrl && !logoUrl.startsWith('data:') && !logoUrl.startsWith('blob:')) {
        exportedLogoUrl = await urlToBase64(logoUrl);
      }

      setSlides(slidesWithBase64);
      setLogoUrl(exportedLogoUrl);

      // Pequena pausa para garantir que o React renderizou o DOM com as novas URLs base64
      await new Promise(r => setTimeout(r, 600));

      // 2. Espera as fontes do navegador estarem 100% carregadas e prontas
      try {
        await document.fonts.ready;
      } catch (fontReadyError) {
        console.warn("Aviso ao aguardar document.fonts.ready:", fontReadyError);
      }

      // 3. Coleta todas as fontes efetivamente usadas no carrossel atual
      const selectedFonts = FONT_PAIRINGS[fontPairingIndex];
      const usedFonts = new Set<string>();
      if (selectedFonts?.heading) usedFonts.add(selectedFonts.heading);
      if (selectedFonts?.body) usedFonts.add(selectedFonts.body);

      slides.forEach(slide => {
        if (slide.titleFont) usedFonts.add(slide.titleFont);
        if (slide.bodyFont) usedFonts.add(slide.bodyFont);
        if (slide.customLayers) {
          slide.customLayers.forEach(layer => {
            if (layer.fontFamily) usedFonts.add(layer.fontFamily);
          });
        }
      });

      // Adiciona fontes padrão por segurança
      usedFonts.add('Syne');
      usedFonts.add('DM Sans');

      // 4. Busca o CSS destas fontes no Google Fonts com fallbacks resilientes
      let base64FontCSS = '';
      const fontUrlToBase64 = new Map<string, string>();
      const cssTexts: string[] = [];

      const cleanFontNames = Array.from(usedFonts)
        .filter(f => f && f !== 'Monument Extended' && f !== 'Times New Roman');

      await Promise.all(cleanFontNames.map(async (fontName) => {
        const cleanName = fontName.replace(/ /g, '+');
        
        // Tenta buscar com variações de peso para garantir HTTP 200 em qualquer fonte
        const candidates = [
          `https://fonts.googleapis.com/css2?family=${cleanName}:wght@400;500;600;700;800&display=swap`,
          `https://fonts.googleapis.com/css2?family=${cleanName}:wght@400;600;700&display=swap`,
          `https://fonts.googleapis.com/css2?family=${cleanName}:wght@400;700&display=swap`,
          `https://fonts.googleapis.com/css2?family=${cleanName}:wght@400&display=swap`,
          `https://fonts.googleapis.com/css2?family=${cleanName}&display=swap`
        ];

        let cssText = '';
        for (const url of candidates) {
          try {
            const fontRes = await fetch(url);
            if (fontRes.ok) {
              const text = await fontRes.text();
              if (text && text.includes('@font-face')) {
                cssText = text;
                break;
              }
            }
          } catch (e) {
            // Tenta o próximo candidato
          }
        }

        if (cssText) {
          // Extrai todas as URLs de arquivos binários (.woff2 / .ttf / .woff)
          const urlRegex = /url\(['"]?(https:\/\/[^'"\)]+)['"]?\)/g;
          const matches = [...cssText.matchAll(urlRegex)];

          await Promise.all(matches.map(async (match) => {
            const fontFileUrl = match[1];
            if (fontUrlToBase64.has(fontFileUrl)) return;
            try {
              const fontFileRes = await fetch(fontFileUrl);
              if (fontFileRes.ok) {
                const blob = await fontFileRes.blob();
                const base64Data = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
                fontUrlToBase64.set(fontFileUrl, base64Data);
              }
            } catch (err) {
              console.error(`Erro ao inlinar arquivo de fonte ${fontFileUrl}:`, err);
            }
          }));

          cssTexts.push(cssText);
        }
      }));

      // Também inclui o CSS do link pré-carregado no head se existir
      const existingLink = document.getElementById('google-fonts-all') as HTMLLinkElement;
      if (existingLink && existingLink.href) {
        try {
          const res = await fetch(existingLink.href);
          if (res.ok) {
            const mainCss = await res.text();
            const urlRegex = /url\(['"]?(https:\/\/[^'"\)]+)['"]?\)/g;
            const matches = [...mainCss.matchAll(urlRegex)];
            await Promise.all(matches.map(async (match) => {
              const fontFileUrl = match[1];
              if (fontUrlToBase64.has(fontFileUrl)) return;
              try {
                const fontFileRes = await fetch(fontFileUrl);
                if (fontFileRes.ok) {
                  const blob = await fontFileRes.blob();
                  const base64Data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                  });
                  fontUrlToBase64.set(fontFileUrl, base64Data);
                }
              } catch (err) {}
            }));
            cssTexts.push(mainCss);
          }
        } catch (e) {}
      }

      let combinedCSS = cssTexts.join('\n');
      for (const [fontFileUrl, base64Data] of fontUrlToBase64.entries()) {
        combinedCSS = combinedCSS.replaceAll(fontFileUrl, base64Data);
      }
      base64FontCSS = combinedCSS;

      const slideElements = document.querySelectorAll('.slide-container');
      const newExportedImages: string[] = [];

      for (let i = 0; i < slideElements.length; i++) {
        const el = slideElements[i] as HTMLElement;
        el.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
        await new Promise(r => setTimeout(r, 450)); // Pequena pausa para garantir renderização perfeita no DOM

        try {
          const bgColor = window.getComputedStyle(el).backgroundColor;
          let exportWidth = 420;
          let exportHeight = 525;
          if (format === 'square') {
            exportHeight = 420;
          } else if (format === 'stories') {
            exportHeight = 746;
          }

          const dataUrl = await toPng(el, {
            pixelRatio: 3,
            width: exportWidth,
            height: exportHeight,
            cacheBust: true,
            skipFonts: true, // Ignora varredura padrão de CSS externos para evitar CORS, usando nosso fontEmbedCSS 100% inlinado
            fontEmbedCSS: base64FontCSS || undefined,
            backgroundColor: bgColor !== 'rgba(0, 0, 0, 0)' ? bgColor : '#000000'
          });

          newExportedImages.push(dataUrl);
        } catch (slideError: any) {
          console.error(`Erro no slide ${i + 1}:`, slideError);
          throw new Error(`Não foi possível renderizar o slide ${i + 1}. Se você usou uma URL de imagem externa, ela pode estar bloqueando a exportação (CORS). Tente fazer upload da imagem do seu computador usando o botão "Upload".`);
        }
      }

      setExportedImages(newExportedImages);
      setShowExportModal(true);

      // Grava log de exportação no Firestore para auditoria
      if (user && profile) {
        try {
          await addDoc(collection(db, 'activity_logs'), {
            userId: user.uid,
            userEmail: user.email || '',
            userName: profile.name || 'Usuário',
            action: 'export_image',
            topic: topic || slides[0]?.title || 'Exportação',
            numSlides: slides.length,
            timestamp: serverTimestamp()
          });
        } catch (logError) {
          console.error("Falha ao gravar log de exportação no Firestore:", logError);
        }
      }
 
      // Try ZIP download automatically
      try {
        const zip = new JSZip();
        newExportedImages.forEach((dataUrl, i) => {
          const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
          zip.file(`slide_${i + 1}.png`, base64Data, { base64: true });
        });
        const content = await zip.generateAsync({ type: 'blob' });
        
        try {
          saveAs(content, 'carrossel_instagram.zip');
        } catch (saveError) {
          // Fallback for saveAs
          const url = URL.createObjectURL(content);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'carrossel_instagram.zip';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch (zipError) {
        console.error("Erro ao criar ZIP:", zipError);
        // We don't throw here because the modal will still show the images
      }

    } catch (error: any) {
      console.error(error);
      alert(`Falha ao exportar os slides:\n\n${error.message || 'Erro desconhecido'}`);
    } finally {
      // Restaura o estado original dos slides e da logo
      setSlides(originalSlides);
      setLogoUrl(originalLogo);
      setIsExporting(false);
    }
  };

  const updateSlide = useCallback((updatedSlide: SlideData) => {
    setSlides(prevSlides => {
      const newSlides = prevSlides.map(s => s.id === updatedSlide.id ? updatedSlide : s);
      saveToHistoryDebounced(newSlides);
      return newSlides;
    });
  }, [saveToHistoryDebounced]);

  const handleRegenerateImage = async (slideId: string, prompt: string) => {
    try {
      const slideIndex = slides.findIndex(s => s.id === slideId);
      const slide = slides[slideIndex];
      if (!slide) return;
      
      const aspectRatio = "4:3"; // Updated to 4:3 as requested
      const hasAvatar = (useBrandAvatar && !!brandAvatar) || !!referenceImage;
      const activeImageRef = (useBrandAvatar && brandAvatar) ? brandAvatar : (creativeReference || referenceImage || undefined);

      const cinematicPrompt = buildCinematicImagePrompt(
        prompt,
        slide.type,
        slideIndex,
        topic,
        tone,
        hasAvatar,
        creativeStylePrompt,
        slide.layoutModel,
        slide.title,
        slide.content
      );
      
      const imageUrl = await generateImage(cinematicPrompt, activeImageRef, aspectRatio, slide.type, slideIndex);
      const newSlides = slides.map(s => s.id === slideId ? { ...s, imageUrl } : s);
      setSlides(newSlides);
      saveToHistory(newSlides);
    } catch (error: any) {
      console.error(error);
      alert(`Falha ao gerar imagem:\n\n${error.message}`);
    }
  };

  const renderConfigPanel = () => (
    <div className="p-6 flex flex-col gap-4 pb-24 lg:pb-6">
      {/* Seção 1 - Conteúdo */}
      <div className="bg-[#161616] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
        <button 
          onClick={() => toggleSection('content')}
          className="w-full flex items-center justify-between p-4 bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
        >
          <span className="font-['Syne'] font-semibold text-white">Conteúdo</span>
          {openSections.content ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        
        {openSections.content && (
          <div className="p-4 flex flex-col gap-4 border-t border-[rgba(255,255,255,0.06)]">
            {location.state?.mode !== 'manual' && (
              <div className="flex flex-col gap-3">
                {/* Seletor de Modo de Criação */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase tracking-wider flex items-center gap-1">
                    <Sparkles size={13} className="text-[#6C63FF]" /> Modo de Criação
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCreationMode('topic')}
                      className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                        creationMode === 'topic'
                          ? 'bg-[#6C63FF] text-white shadow-[0_0_10px_rgba(108,99,255,0.3)]'
                          : 'text-[rgba(240,240,240,0.6)] hover:text-white'
                      }`}
                    >
                      <Lightbulb size={14} />
                      <span>Tema</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreationMode('clone_viral')}
                      className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                        creationMode === 'clone_viral'
                          ? 'bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white shadow-[0_0_10px_rgba(255,101,132,0.3)]'
                          : 'text-[rgba(240,240,240,0.6)] hover:text-white'
                      }`}
                    >
                      <ImageIcon size={14} />
                      <span>Clonar Post</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreationMode('repurpose')}
                      className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                        creationMode === 'repurpose'
                          ? 'bg-[#6C63FF] text-white shadow-[0_0_10px_rgba(108,99,255,0.3)]'
                          : 'text-[rgba(240,240,240,0.6)] hover:text-white'
                      }`}
                    >
                      <FileText size={14} />
                      <span>Repurpose</span>
                    </button>
                  </div>
                </div>

                {/* Conteúdo específico por modo */}
                {creationMode === 'topic' && (
                  <div className="flex flex-col gap-2 animate-fade-in">
                    <label className="text-xs font-medium text-[rgba(240,240,240,0.6)]">Tópico / Ideia</label>
                    <textarea 
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Ex: 5 passos para criar uma marca inesquecível..."
                      className="w-full p-3 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm min-h-[90px] focus:border-[#6C63FF] outline-none text-white placeholder:text-[rgba(255,255,255,0.2)] transition-colors"
                    />
                  </div>
                )}

                {creationMode === 'clone_viral' && (
                  <div className="flex flex-col gap-3 p-3 bg-[#0A0A0A] border border-[#6C63FF]/30 rounded-xl animate-fade-in">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-white flex items-center justify-between">
                        <span>1. Print do Post Viral</span>
                        <span className="text-[10px] text-[#6C63FF] font-bold">Vision AI</span>
                      </label>
                      <p className="text-[10px] text-[rgba(240,240,240,0.5)]">
                        Envie o print de um carrossel que viralizou. A IA clonará a fórmula vencedora.
                      </p>
                      
                      <div className="mt-1 flex items-center gap-3">
                        {viralReferenceImage ? (
                          <div className="relative w-16 h-20 rounded-lg overflow-hidden border border-[#6C63FF] shrink-0">
                            <img src={viralReferenceImage.url} alt="Referência Viral" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setViralReferenceImage(null)}
                              className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-xs cursor-pointer font-bold"
                            >
                              X
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => viralReferenceInputRef.current?.click()}
                            className="flex-1 py-3 px-2 border-2 border-dashed border-[#6C63FF]/40 hover:border-[#6C63FF] bg-[#6C63FF]/5 hover:bg-[#6C63FF]/10 rounded-xl flex flex-col items-center justify-center text-xs text-white gap-1.5 transition-all cursor-pointer"
                          >
                            <Upload size={16} className="text-[#6C63FF]" />
                            <span className="font-semibold">Fazer Upload do Print</span>
                            <span className="text-[10px] text-[rgba(240,240,240,0.4)]">JPG, PNG ou WebP</span>
                          </button>
                        )}
                        <input 
                          type="file" 
                          ref={viralReferenceInputRef} 
                          onChange={handleViralReferenceUpload} 
                          accept="image/*" 
                          className="hidden" 
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 pt-2 border-t border-[rgba(255,255,255,0.06)]">
                      <label className="text-xs font-semibold text-white">2. Seu Novo Tema / Nicho</label>
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Ex: Produtividade para médicos, Finanças para iniciantes..."
                        className="w-full p-2.5 bg-[#111111] border border-[rgba(255,255,255,0.1)] rounded-lg text-xs text-white focus:border-[#6C63FF] outline-none"
                      />
                    </div>
                  </div>
                )}

                {creationMode === 'repurpose' && (
                  <div className="flex flex-col gap-2 p-3 bg-[#0A0A0A] border border-[#6C63FF]/30 rounded-xl animate-fade-in">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-white flex items-center gap-1">
                        <FileText size={13} className="text-[#6C63FF]" /> Texto Longo / Transcrição
                      </label>
                      <span className="text-[10px] text-[#6C63FF] font-bold">Destilação IA</span>
                    </div>
                    <p className="text-[10px] text-[rgba(240,240,240,0.5)]">
                      Cole um artigo, roteiro de vídeo do YouTube ou anotação para transformar em carrossel.
                    </p>
                    <textarea 
                      value={longContentText}
                      onChange={(e) => {
                        setLongContentText(e.target.value);
                        if (!topic.trim()) {
                          const firstLine = e.target.value.split('\n')[0].substring(0, 40);
                          setTopic(firstLine);
                        }
                      }}
                      placeholder="Cole aqui o artigo, transcrição de vídeo ou notas completas..."
                      className="w-full p-3 bg-[#111111] border border-[rgba(255,255,255,0.1)] rounded-lg text-xs min-h-[120px] focus:border-[#6C63FF] outline-none text-white placeholder:text-[rgba(255,255,255,0.2)]"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-[rgba(240,240,240,0.6)] flex justify-between">
                <span>Número de Slides</span>
                <span className="text-white">{numSlides}</span>
              </label>
              <input 
                type="range" 
                min="1" max="15" 
                value={numSlides} 
                onChange={(e) => {
                  const newNum = parseInt(e.target.value);
                  setNumSlides(newNum);
                  if (location.state?.mode === 'manual') {
                    // Update slides array length dynamically in manual mode
                    if (newNum > slides.length) {
                      const newSlides = [...slides];
                      for (let i = slides.length; i < newNum; i++) {
                        newSlides.push({
                          id: `manual-${Date.now()}-${i}`,
                          type: 'features',
                          background: 'light',
                          title: `Slide ${i + 1}`,
                          content: 'Clique para editar o texto...',
                          alignment: 'center',
                          verticalAlignment: 'center',
                          extendBackgroundToNext: isSeamless
                        });
                      }
                      setSlides(newSlides);
                    } else if (newNum < slides.length) {
                      setSlides(slides.slice(0, newNum));
                    }
                  }
                }}
                className="w-full accent-[#6C63FF]"
              />
            </div>

            {location.state?.mode !== 'manual' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[rgba(240,240,240,0.6)]">Tom de Voz</label>
                <div className="flex gap-2">
                  <select 
                    value={selectedToneOption}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedToneOption(val);
                      if (val === 'custom_new') {
                        setTone(newToneDescription);
                      } else {
                        const foundCustom = customTones.find(ct => ct.id === val);
                        if (foundCustom) {
                          setTone(foundCustom.description);
                        } else {
                          setTone(val);
                        }
                      }
                    }}
                    className="flex-1 p-3 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-white focus:border-[#6C63FF] outline-none transition-colors"
                  >
                    <optgroup label="Padrão" className="bg-[#0A0A0A]">
                      <option value="Profissional">Profissional</option>
                      <option value="Casual">Casual</option>
                      <option value="Divertido">Divertido</option>
                      <option value="Ousado">Ousado</option>
                      <option value="Minimalista">Minimalista</option>
                      <option value="Educativo">Educativo</option>
                    </optgroup>
                    {customTones.length > 0 && (
                      <optgroup label="Tons Salvos" className="bg-[#0A0A0A]">
                        {customTones.map((ct) => (
                          <option key={ct.id} value={ct.id}>{ct.name}</option>
                        ))}
                      </optgroup>
                    )}
                    <option value="custom_new" className="text-[#6C63FF] font-semibold">+ Personalizada</option>
                  </select>

                  {customTones.some(ct => ct.id === selectedToneOption) && (
                    <button
                      onClick={() => {
                        const updated = customTones.filter(ct => ct.id !== selectedToneOption);
                        setCustomTones(updated);
                        set('carousel_custom_tones', updated);
                        setSelectedToneOption('Profissional');
                        setTone('Profissional');
                      }}
                      className="p-3 border border-red-500/25 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 hover:text-red-300 transition-colors cursor-pointer shrink-0"
                      title="Excluir tom salvo"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {selectedToneOption === 'custom_new' && (
                  <div className="flex flex-col gap-3 p-3 bg-[#111] rounded-lg border border-[rgba(255,255,255,0.04)] animate-fade-in mt-1 text-left">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-[rgba(240,240,240,0.6)] uppercase">Descreva o estilo de tom de voz</label>
                      <textarea
                        value={newToneDescription}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewToneDescription(val);
                          setTone(val);
                        }}
                        placeholder="Ex: Irreverente, sarcástico, usa gírias de internet e foca em tecnologia..."
                        className="w-full p-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-lg text-xs min-h-[70px] text-white focus:border-[#6C63FF] outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-[rgba(240,240,240,0.6)] uppercase">Nome para salvar (opcional)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newToneName}
                          onChange={(e) => setNewToneName(e.target.value)}
                          placeholder="Ex: Meu Tom Sarcástico"
                          className="flex-grow p-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-lg text-xs text-white focus:border-[#6C63FF] outline-none"
                        />
                        <button
                          onClick={() => {
                            if (!newToneDescription.trim()) return;
                            const name = newToneName.trim() || `Personalizada ${customTones.length + 1}`;
                            const newToneObj = {
                              id: `custom-tone-${Date.now()}`,
                              name,
                              description: newToneDescription.trim()
                            };
                            const updated = [...customTones, newToneObj];
                            setCustomTones(updated);
                            set('carousel_custom_tones', updated);
                            setSelectedToneOption(newToneObj.id);
                            setTone(newToneObj.description);
                            setNewToneName('');
                            setNewToneDescription('');
                          }}
                          disabled={!newToneDescription.trim()}
                          className="px-3.5 py-2 bg-[#6C63FF] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg hover:bg-[#5b54d6] transition-colors text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Bookmark size={12} /> Salvar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Formato de Proporção (4:5, 1:1, 9:16) */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-[rgba(240,240,240,0.6)]">Formato do Carrossel</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setFormat('portrait')}
                  className={`py-2 px-1 text-xs border rounded-lg transition-colors font-medium flex flex-col items-center gap-1.5 ${format === 'portrait' ? 'border-[#6C63FF] bg-[rgba(108,99,255,0.1)] text-white' : 'border-[rgba(255,255,255,0.1)] bg-[#0A0A0A] text-[rgba(255,255,255,0.6)] hover:bg-white/5'}`}
                >
                  <span className="w-4.5 h-5.5 border border-current rounded-sm block shrink-0" />
                  Retrato (4:5)
                </button>
                <button
                  onClick={() => setFormat('square')}
                  className={`py-2 px-1 text-xs border rounded-lg transition-colors font-medium flex flex-col items-center gap-1.5 ${format === 'square' ? 'border-[#6C63FF] bg-[rgba(108,99,255,0.1)] text-white' : 'border-[rgba(255,255,255,0.1)] bg-[#0A0A0A] text-[rgba(255,255,255,0.6)] hover:bg-white/5'}`}
                >
                  <span className="w-4.5 h-4.5 border border-current rounded-sm block shrink-0" />
                  Quadrado (1:1)
                </button>
                <button
                  onClick={() => setFormat('stories')}
                  className={`py-2 px-1 text-xs border rounded-lg transition-colors font-medium flex flex-col items-center gap-1.5 ${format === 'stories' ? 'border-[#6C63FF] bg-[rgba(108,99,255,0.1)] text-white' : 'border-[rgba(255,255,255,0.1)] bg-[#0A0A0A] text-[rgba(255,255,255,0.6)] hover:bg-white/5'}`}
                >
                  <span className="w-3.5 h-6 border border-current rounded-sm block shrink-0" />
                  Stories (9:16)
                </button>
              </div>
            </div>

            {/* Seleção de Layout com Previews em CSS */}
            {location.state?.mode !== 'manual' && (
              <div className="flex flex-col gap-2 mt-1">
                <label className="text-xs font-medium text-[rgba(240,240,240,0.6)]">Modelo de Layout (Geração IA)</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  {/* Card Padrão */}
                  <div 
                    onClick={() => setGenerationLayout('default')}
                    className={`cursor-pointer border rounded-xl p-2.5 flex flex-col gap-2 transition-all ${generationLayout === 'default' ? 'border-[#6C63FF] bg-[rgba(108,99,255,0.08)] shadow-[0_0_12px_rgba(108,99,255,0.1)]' : 'border-[rgba(255,255,255,0.06)] bg-[#0A0A0A] hover:border-[rgba(255,255,255,0.15)]'}`}
                  >
                    <div className="h-16 w-full rounded bg-gradient-to-tr from-[#6C63FF]/20 to-[#FF6584]/20 border border-white/5 flex flex-col p-1.5 justify-center gap-1 relative overflow-hidden text-left">
                      <span className="text-[6px] text-white/40 font-bold uppercase tracking-wider block">DICAS</span>
                      <span className="text-[7px] text-white font-extrabold leading-tight block">Título Principal</span>
                      <span className="text-[5px] text-white/60 leading-none block">Conteúdo estruturado e pilares.</span>
                    </div>
                    <span className="text-[11px] font-semibold text-center block">Padrão</span>
                  </div>

                  {/* Card Forbes */}
                  <div 
                    onClick={() => setGenerationLayout('forbes')}
                    className={`cursor-pointer border rounded-xl p-2.5 flex flex-col gap-2 transition-all ${generationLayout === 'forbes' ? 'border-[#6C63FF] bg-[rgba(108,99,255,0.08)] shadow-[0_0_12px_rgba(108,99,255,0.1)]' : 'border-[rgba(255,255,255,0.06)] bg-[#0A0A0A] hover:border-[rgba(255,255,255,0.15)]'}`}
                  >
                    <div className="h-16 w-full rounded bg-[#090909] border border-white/5 flex flex-col p-1.5 justify-end gap-1 relative overflow-hidden text-left">
                      <span className="text-[12px] text-[#F9D30B] font-serif leading-none block">“</span>
                      <span className="text-[7px] text-white font-bold leading-tight block">Citação ou gancho limpo do post</span>
                      <span className="text-[5px] text-[#F9D30B] font-bold uppercase tracking-wider leading-none block">| CATEGORIA</span>
                    </div>
                    <span className="text-[11px] font-semibold text-center block">Forbes</span>
                  </div>

                  {/* Card Twitter */}
                  <div 
                    onClick={() => setGenerationLayout('twitter')}
                    className={`cursor-pointer border rounded-xl p-2.5 flex flex-col gap-2 transition-all ${generationLayout === 'twitter' ? 'border-[#6C63FF] bg-[rgba(108,99,255,0.08)] shadow-[0_0_12px_rgba(108,99,255,0.1)]' : 'border-[rgba(255,255,255,0.06)] bg-[#0A0A0A] hover:border-[rgba(255,255,255,0.15)]'}`}
                  >
                    <div className="h-16 w-full rounded bg-[#15202B] border border-white/5 flex flex-col p-1.5 justify-start gap-1 relative overflow-hidden text-left">
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-white/20 block shrink-0" />
                        <div className="flex flex-col leading-none">
                          <span className="text-[5px] text-white font-bold flex items-center gap-0.5">Nome <span className="text-[#1D9BF0] text-[4px]">✓</span></span>
                          <span className="text-[4px] text-white/50">@usuario</span>
                        </div>
                      </div>
                      <span className="text-[6px] text-white/90 leading-tight block font-sans">Opinião, checklist ou thread curta no feed.</span>
                    </div>
                    <span className="text-[11px] font-semibold text-center block">Twitter</span>
                  </div>

                  {/* Card Frases */}
                  <div 
                    onClick={() => setGenerationLayout('frases')}
                    className={`cursor-pointer border rounded-xl p-2.5 flex flex-col gap-2 transition-all ${generationLayout === 'frases' ? 'border-[#6C63FF] bg-[rgba(108,99,255,0.08)] shadow-[0_0_12px_rgba(108,99,255,0.1)]' : 'border-[rgba(255,255,255,0.06)] bg-[#0A0A0A] hover:border-[rgba(255,255,255,0.15)]'}`}
                  >
                    <div className="h-16 w-full rounded bg-[#161616] border border-white/5 flex flex-col p-1.5 justify-center items-center gap-1 relative overflow-hidden text-center">
                      <span className="text-[9px] text-[#6C63FF] font-serif leading-none block">“</span>
                      <span className="text-[6px] text-white/95 font-medium italic leading-tight block max-w-[85%]">Frase ou citação viral minimalista.</span>
                      <span className="text-[4px] text-white/40 font-bold uppercase tracking-wider leading-none block">@marca</span>
                    </div>
                    <span className="text-[11px] font-semibold text-center block">Frases</span>
                  </div>
                </div>
              </div>
            )}

            {/* Inputs específicos para o layout Frases */}
            {location.state?.mode !== 'manual' && generationLayout === 'frases' && (
              <div className="flex flex-col gap-3 p-3 bg-[#111] rounded-lg border border-[rgba(255,255,255,0.04)] animate-fade-in mt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-[rgba(240,240,240,0.6)] uppercase">Clonagem de Conteúdo (Cole suas Frases)</label>
                  <p className="text-[9px] text-[rgba(240,240,240,0.4)] leading-tight mb-1">Insira suas frases (uma por linha) para clonar o design. Deixe em branco se quiser que a IA crie. <strong>Dica:</strong> palavras curtas e frases de 6 a 8 palavras evitam que o texto seja cortado nas imagens.</p>
                  <textarea
                    value={customPhrases}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomPhrases(val);
                      if (val.trim()) {
                        const linesCount = val.split('\n').filter(line => line.trim()).length;
                        if (linesCount > 0 && linesCount <= 15) {
                          setNumSlides(linesCount);
                        }
                      }
                    }}
                    placeholder="Cole aqui suas frases (uma por linha)..."
                    className="w-full p-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-lg text-xs min-h-[80px] focus:border-[#6C63FF] outline-none text-white transition-colors"
                  />
                </div>

                {!customPhrases.trim() && (
                  <div className="flex flex-col gap-1 mt-1">
                    <label className="text-[11px] font-semibold text-[rgba(240,240,240,0.6)] uppercase">Categoria das Frases (IA)</label>
                    <select
                      value={phraseCategory}
                      onChange={(e) => setPhraseCategory(e.target.value)}
                      className="w-full p-2.5 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-lg text-xs text-white focus:border-[#6C63FF] outline-none transition-colors"
                    >
                      <option value="Motivação">Motivação</option>
                      <option value="Esperança">Esperança</option>
                      <option value="Bíblicos">Bíblicos / Religiosos</option>
                      <option value="Impactantes">Impactantes / Provocativos</option>
                      <option value="Sucesso">Sucesso & Negócios</option>
                      <option value="Filosóficos">Filosóficos & Profundos</option>
                    </select>
                  </div>
                )}

                {/* Quantidade de Slides para Frases */}
                <div className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-[rgba(255,255,255,0.05)]">
                  <label className="text-[11px] font-semibold text-[rgba(240,240,240,0.6)] uppercase flex justify-between">
                    <span>Quantidade de Slides (Imagens)</span>
                    <span className="text-[#6C63FF] font-bold">{numSlides}</span>
                  </label>
                  <input 
                    type="range" 
                    min="1" max="15" 
                    value={numSlides} 
                    onChange={(e) => setNumSlides(parseInt(e.target.value))}
                    className="w-full h-1 bg-[rgba(255,255,255,0.1)] rounded-lg appearance-none cursor-pointer accent-[#6C63FF]"
                  />
                </div>

                {/* Upload de Referência de Design para Clonagem de Estilo */}
                <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-[rgba(255,255,255,0.05)]">
                  <label className="text-[11px] font-semibold text-[rgba(240,240,240,0.6)] uppercase">Design de Referência (Clonagem de Estilo)</label>
                  <p className="text-[9px] text-[rgba(240,240,240,0.4)] leading-tight mb-1">
                    Envie um design para clonar a sensação visual, cores e estilo (sem copiar as palavras da imagem).
                  </p>
                  <div className="flex items-center gap-3">
                    {creativeReference ? (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-[rgba(255,255,255,0.1)] shrink-0">
                        <img src={creativeReference.url} alt="Estilo Criativo" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => {
                            setCreativeReference(null);
                            setCreativeStylePrompt('');
                          }}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-xs"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => creativeReferenceInputRef.current?.click()}
                        className="w-[120px] h-9 rounded-lg border border-dashed border-[rgba(255,255,255,0.2)] flex items-center justify-center text-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[#6C63FF] hover:text-[#6C63FF] transition-colors text-xs gap-1.5"
                        title="Enviar imagem de estilo criativo"
                      >
                        <Upload size={13} /> Ref. Visual
                      </button>
                    )}
                    <span className="text-[10px] text-[rgba(240,240,240,0.4)]">
                      {creativeReference ? 'Estilo Carregado' : 'Nenhuma imagem enviada'}
                    </span>
                  </div>
                </div>

                {/* Upload de Fotos do Cliente (Módulo 2 e 3) */}
                <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-[rgba(255,255,255,0.05)]">
                  <label className="text-[11px] font-semibold text-[rgba(240,240,240,0.6)] uppercase">Suas Fotos de Fundo (Opcional)</label>
                  <p className="text-[9px] text-[rgba(240,240,240,0.4)] leading-tight mb-1">
                    Envie fotos próprias para usar de fundo. Se enviar 2 ou mais, cada uma irá em um slide na mesma ordem.
                  </p>
                  <div className="flex flex-wrap gap-2 items-center">
                    {clientPhotos.map((photo, pIdx) => (
                      <div key={pIdx} className="relative w-12 h-12 rounded-lg overflow-hidden border border-[rgba(255,255,255,0.1)] shrink-0">
                        <img src={photo.url} alt={`Foto ${pIdx + 1}`} className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setClientPhotos(prev => prev.filter((_, idx) => idx !== pIdx))}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-xs"
                        >
                          X
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => clientPhotosInputRef.current?.click()}
                      className="w-12 h-12 rounded-lg border border-dashed border-[rgba(255,255,255,0.2)] flex items-center justify-center text-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[#6C63FF] hover:text-[#6C63FF] transition-colors"
                      title="Enviar suas fotos de fundo"
                    >
                      <Plus size={16} />
                    </button>
                    <input 
                      type="file" 
                      ref={clientPhotosInputRef}
                      onChange={handleClientPhotosUpload}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Botão Gerar Carrossel de Frases */}
                <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)]">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full py-2.5 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white rounded-lg font-semibold disabled:opacity-50 hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(108,99,255,0.15)] text-xs"
                  >
                    {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />}
                    {isGenerating ? `Gerando (${Math.round(progress)}%)...` : 'Gerar Carrossel'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Seção 2 - Marca */}
      <div className="bg-[#161616] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
        <button 
          onClick={() => toggleSection('brand')}
          className="w-full flex items-center justify-between p-4 bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
        >
          <span className="font-['Syne'] font-semibold text-white">Identidade da Marca</span>
          {openSections.brand ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        
        {openSections.brand && (
          <div className="p-4 flex flex-col gap-4 border-t border-[rgba(255,255,255,0.06)]">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[rgba(240,240,240,0.6)]">Nome da Marca</label>
                <input 
                  type="text" 
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full p-2.5 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-white focus:border-[#6C63FF] outline-none transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[rgba(240,240,240,0.6)]">Usuário (@)</label>
                <input 
                  type="text" 
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full p-2.5 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-white focus:border-[#6C63FF] outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[rgba(240,240,240,0.6)]">Cores da Marca</label>
                  <button
                    onClick={() => setIsSavingPalette(!isSavingPalette)}
                    className="p-1.5 border border-[rgba(255,255,255,0.1)] rounded text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors shrink-0 flex items-center gap-1 text-[10px]"
                    title="Salvar Paleta"
                  >
                    <Bookmark size={12} /> Salvar
                  </button>
                </div>

                <div className="text-[10px] text-amber-400/90 bg-amber-400/10 border border-amber-400/20 rounded p-2.5 leading-relaxed">
                  💡 <strong>Nota sobre travamento:</strong> Se o conta-gotas de cor travar o navegador, atualize seu Google Chrome/Edge (é um bug conhecido do Windows) ou digite a cor Hexadecimal manualmente.
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {/* Primária */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[rgba(255,255,255,0.4)]">Primária</span>
                    <div className="flex items-center gap-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded p-1">
                      <div className="relative w-5 h-5 rounded overflow-hidden shrink-0">
                        <input 
                          type="color" 
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer"
                        />
                      </div>
                      <input 
                        type="text" 
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-full bg-transparent text-[11px] text-white uppercase outline-none"
                      />
                    </div>
                  </div>

                  {/* Secundária */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[rgba(255,255,255,0.4)]">Secundária</span>
                    <div className="flex items-center gap-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded p-1">
                      <div className="relative w-5 h-5 rounded overflow-hidden shrink-0">
                        <input 
                          type="color" 
                          value={secondaryColor || palette.BRAND_SECONDARY}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer"
                        />
                      </div>
                      <input 
                        type="text" 
                        value={secondaryColor || palette.BRAND_SECONDARY}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-full bg-transparent text-[11px] text-white uppercase outline-none"
                      />
                    </div>
                  </div>

                  {/* Destaque */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[rgba(255,255,255,0.4)]">Destaque</span>
                    <div className="flex items-center gap-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded p-1">
                      <div className="relative w-5 h-5 rounded overflow-hidden shrink-0">
                        <input 
                          type="color" 
                          value={accentColor || palette.BRAND_ACCENT}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer"
                        />
                      </div>
                      <input 
                        type="text" 
                        value={accentColor || palette.BRAND_ACCENT}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-full bg-transparent text-[11px] text-white uppercase outline-none"
                      />
                    </div>
                  </div>

                  {/* Fundo Escuro */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[rgba(255,255,255,0.4)]">Fundo Escuro</span>
                    <div className="flex items-center gap-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded p-1">
                      <div className="relative w-5 h-5 rounded overflow-hidden shrink-0">
                        <input 
                          type="color" 
                          value={darkBgColor || palette.DARK_BG}
                          onChange={(e) => setDarkBgColor(e.target.value)}
                          className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer"
                        />
                      </div>
                      <input 
                        type="text" 
                        value={darkBgColor || palette.DARK_BG}
                        onChange={(e) => setDarkBgColor(e.target.value)}
                        className="w-full bg-transparent text-[11px] text-white uppercase outline-none"
                      />
                    </div>
                  </div>

                  {/* Fundo Claro */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[rgba(255,255,255,0.4)]">Fundo Claro</span>
                    <div className="flex items-center gap-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded p-1">
                      <div className="relative w-5 h-5 rounded overflow-hidden shrink-0">
                        <input 
                          type="color" 
                          value={lightBgColor || palette.LIGHT_BG}
                          onChange={(e) => setLightBgColor(e.target.value)}
                          className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer"
                        />
                      </div>
                      <input 
                        type="text" 
                        value={lightBgColor || palette.LIGHT_BG}
                        onChange={(e) => setLightBgColor(e.target.value)}
                        className="w-full bg-transparent text-[11px] text-white uppercase outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {isSavingPalette && (
                <div className="flex items-center gap-2 mt-1">
                  <input 
                    type="text"
                    value={newPaletteName}
                    onChange={e => setNewPaletteName(e.target.value)}
                    placeholder="Nome do cliente/projeto..."
                    className="flex-1 p-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-lg text-xs text-white focus:border-[#6C63FF] outline-none"
                    onKeyDown={e => e.key === 'Enter' && handleSavePalette()}
                    autoFocus
                  />
                  <button 
                    onClick={handleSavePalette}
                    className="p-2 bg-[#6C63FF] text-white rounded-lg hover:bg-[#5b54d6] transition-colors shrink-0"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              )}

              {savedPalettes.length > 0 && (
                <div className="mt-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.05)] rounded-lg p-2">
                  <div className="text-[10px] text-[rgba(240,240,240,0.4)] mb-2 uppercase font-bold tracking-wider">Paletas Salvas</div>
                  <div className="flex flex-wrap gap-2">
                    {savedPalettes.map(sp => (
                      <div 
                        key={sp.id} 
                        className="flex items-center bg-[#111] border border-[rgba(255,255,255,0.1)] rounded-full pl-1.5 pr-2 py-1 gap-1.5 cursor-pointer hover:border-[rgba(255,255,255,0.3)] transition-colors group" 
                        onClick={() => {
                          setPrimaryColor(sp.color);
                          setSecondaryColor(sp.secondary || '');
                          setAccentColor(sp.accent || '');
                          setDarkBgColor(sp.darkBg || '');
                          setLightBgColor(sp.lightBg || '');
                        }}
                        title={sp.name}
                      >
                        <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: sp.color }} />
                        <span className="text-[11px] text-[rgba(255,255,255,0.8)] truncate max-w-[80px] font-medium">{sp.name}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeletePalette(sp.id); }} 
                          className="ml-0.5 text-[rgba(255,255,255,0.2)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-[rgba(240,240,240,0.6)]">Tipografia</label>
              <select 
                value={fontPairingIndex}
                onChange={(e) => setFontPairingIndex(parseInt(e.target.value))}
                className="w-full p-2.5 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-white focus:border-[#6C63FF] outline-none transition-colors"
                style={{ fontFamily: selectedFonts.heading }}
              >
                {FONT_PAIRINGS.map((font, i) => (
                  <option key={i} value={i} style={{ fontFamily: font.heading }}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-[rgba(240,240,240,0.6)]">Logo (Opcional)</label>
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-[rgba(255,255,255,0.1)] bg-white/5">
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                    <button 
                      onClick={() => setLogoUrl(null)}
                      className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-xs"
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-12 h-12 rounded-lg border border-dashed border-[rgba(255,255,255,0.2)] flex items-center justify-center text-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[#6C63FF] hover:text-[#6C63FF] transition-colors"
                  >
                    <Upload size={18} />
                  </button>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <span className="text-xs text-[rgba(240,240,240,0.4)]">
                  {logoUrl ? 'Logo carregada' : 'Fazer upload'}
                </span>
              </div>
            </div>

            {/* Avatar da Marca / Criador (Consistência de Rosto) */}
            <div className="flex flex-col gap-2 p-3.5 bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-xl mt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <User size={14} className="text-[#6C63FF]" />
                  Avatar do Criador / Marca
                </label>
                {brandAvatar && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <Sparkles size={10} /> Consistência Ativa
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[rgba(240,240,240,0.5)] leading-relaxed">
                Envie a foto do rosto do especialista para que a IA gere ilustrações mantendo a mesma identidade física.
              </p>

              <div className="flex items-center gap-3 mt-1">
                {brandAvatar ? (
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-[#6C63FF] shadow-[0_0_12px_rgba(108,99,255,0.3)] shrink-0">
                    <img src={brandAvatar.url} alt="Avatar da Marca" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setBrandAvatar(null)}
                      className="absolute inset-0 bg-black/70 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-xs font-bold"
                      title="Remover Avatar"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => brandAvatarInputRef.current?.click()}
                    className="w-14 h-14 rounded-xl border border-dashed border-[rgba(108,99,255,0.4)] bg-[rgba(108,99,255,0.05)] flex flex-col items-center justify-center text-[#6C63FF] hover:bg-[rgba(108,99,255,0.12)] transition-all shrink-0"
                  >
                    <Upload size={18} />
                    <span className="text-[9px] font-bold mt-0.5">Avatar</span>
                  </button>
                )}

                <input 
                  type="file" 
                  ref={brandAvatarInputRef}
                  onChange={handleBrandAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />

                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={useBrandAvatar}
                      onChange={e => setUseBrandAvatar(e.target.checked)}
                      className="w-4 h-4 text-[#6C63FF] rounded border-[rgba(255,255,255,0.2)] bg-[#161616]"
                    />
                    <span className="text-xs text-[rgba(240,240,240,0.8)] font-medium">Usar avatar nas imagens IA</span>
                  </label>
                  <span className="text-[10px] text-[rgba(240,240,240,0.4)]">
                    {brandAvatar ? (useBrandAvatar ? 'Ativado nas gerações' : 'Desativado') : 'Nenhuma foto enviada'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Seção 3 - Imagens */}
      <div className="bg-[#161616] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
        <button 
          onClick={() => toggleSection('images')}
          className="w-full flex items-center justify-between p-4 bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
        >
          <span className="font-['Syne'] font-semibold text-white flex items-center gap-2">
            <ImageIcon size={16} className="text-[#6C63FF]" />
            Imagens com IA
          </span>
          {openSections.images ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        
        {openSections.images && (
          <div className="p-4 flex flex-col gap-4 border-t border-[rgba(255,255,255,0.06)]">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input 
                  type="checkbox" 
                  checked={includeImages}
                  onChange={(e) => setIncludeImages(e.target.checked)}
                  className="peer appearance-none w-5 h-5 border border-[rgba(255,255,255,0.2)] rounded bg-[#0A0A0A] checked:bg-[#6C63FF] checked:border-[#6C63FF] transition-colors cursor-pointer"
                />
                <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 10" fill="none">
                  <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-sm font-medium text-white group-hover:text-[#6C63FF] transition-colors">
                Gerar imagens para os slides
              </span>
            </label>

            {includeImages && (
              <div className="flex flex-col gap-4 mt-2 pl-8 border-l-2 border-[rgba(108,99,255,0.3)]">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      checked={isSeamless}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setIsSeamless(val);
                        if (location.state?.mode === 'manual') {
                          setSlides(prev => prev.map(s => ({ ...s, extendBackgroundToNext: val })));
                        }
                      }}
                      className="peer appearance-none w-4 h-4 border border-[rgba(255,255,255,0.2)] rounded bg-[#0A0A0A] checked:bg-[#6C63FF] checked:border-[#6C63FF] transition-colors cursor-pointer"
                    />
                    <svg className="absolute w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 10" fill="none">
                      <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-sm text-[rgba(240,240,240,0.8)] group-hover:text-white transition-colors">
                    Carrossel Infinito (Imagens contínuas)
                  </span>
                </label>
                
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-[rgba(240,240,240,0.6)]">Mascote / Avatar (Opcional)</label>
                  <div className="flex items-center gap-3">
                    {referenceImage ? (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-[rgba(255,255,255,0.1)]">
                        <img src={referenceImage.url} alt="Referência" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setReferenceImage(null)}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-xs"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => referenceImageInputRef.current?.click()}
                        className="w-12 h-12 rounded-lg border border-dashed border-[rgba(255,255,255,0.2)] flex items-center justify-center text-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[#6C63FF] hover:text-[#6C63FF] transition-colors"
                        title="Enviar imagem do seu personagem ou avatar"
                      >
                        <Upload size={18} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-[rgba(240,240,240,0.6)]">Referência Criativa (Opcional)</label>
                  <p className="text-[10px] text-[rgba(240,240,240,0.4)] leading-tight">Escolha uma imagem de estilo ou mood. A IA vai analisar os efeitos, luzes e sensação visual para replicar em todos os slides gerados.</p>
                  <div className="flex items-center gap-3">
                    {creativeReference ? (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-[rgba(255,255,255,0.1)]">
                        <img src={creativeReference.url} alt="Estilo Criativo" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => {
                            setCreativeReference(null);
                            setCreativeStylePrompt('');
                          }}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-xs"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => creativeReferenceInputRef.current?.click()}
                        className="w-[120px] h-10 rounded-lg border border-dashed border-[rgba(255,255,255,0.2)] flex items-center justify-center text-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[#6C63FF] hover:text-[#6C63FF] transition-colors text-xs gap-2"
                        title="Enviar imagem de estilo criativo"
                      >
                        <Upload size={14} /> Ref. Visual
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings / API Key */}
      <div className="bg-[#161616] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)]">Provedor de IA</label>
            <select
              value={localStorage.getItem('custom_ai_provider') || 'gemini'}
              onChange={(e) => {
                const val = e.target.value;
                localStorage.setItem('custom_ai_provider', val);
                // force re-render
                setErrorMessage(''); 
              }}
              className="w-full p-2.5 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-white focus:border-[#6C63FF] outline-none transition-colors"
            >
              <option value="gemini">Google Gemini (Oficial)</option>
              <option value="openrouter">OpenRouter API (Claude, GPT, Gemini...)</option>
            </select>
          </div>

          {(localStorage.getItem('custom_ai_provider') === 'openrouter') && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)]">Modelo OpenRouter</label>
              <select
                value={localStorage.getItem('custom_openrouter_model') || 'google/gemini-2.5-flash'}
                onChange={(e) => {
                  localStorage.setItem('custom_openrouter_model', e.target.value);
                  setErrorMessage(''); 
                }}
                className="w-full p-2.5 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-white focus:border-[#6C63FF] outline-none transition-colors"
              >
                <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (Rápido e Barato)</option>
                <option value="google/gemini-2.5-pro">Gemini 2.5 Pro (Extremamente Preciso)</option>
                <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Excelente Roteiro)</option>
                <option value="deepseek/deepseek-chat">DeepSeek V3 (Custo-Benefício)</option>
                <option value="meta-llama/llama-3.1-405b-instruct">Llama 3.1 405B</option>
              </select>
              
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="text-[10px] text-[rgba(255,255,255,0.4)]">Modelo Personalizado (Opcional)</span>
                <input 
                  type="text"
                  placeholder="Ex: google/gemini-2.5-flash"
                  value={localStorage.getItem('custom_openrouter_model_custom') || ''}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (val) {
                      localStorage.setItem('custom_openrouter_model_custom', val);
                    } else {
                      localStorage.removeItem('custom_openrouter_model_custom');
                    }
                    setErrorMessage('');
                  }}
                  className="w-full p-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-lg text-xs text-white focus:border-[#6C63FF] outline-none"
                />
              </div>

              <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-[rgba(255,255,255,0.04)]">
                <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)]">Modelo de Imagem (OpenRouter)</label>
                <select
                  defaultValue={localStorage.getItem('custom_openrouter_image_model') || 'google/gemini-2.5-flash-image'}
                  onChange={(e) => {
                    localStorage.setItem('custom_openrouter_image_model', e.target.value);
                  }}
                  className="w-full p-2.5 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-white focus:border-[#6C63FF] outline-none transition-colors"
                >
                  <option value="google/gemini-2.5-flash-image">Gemini 2.5 Flash Image (Mais Rápido/Barato)</option>
                  <option value="google/gemini-3.1-flash-image-preview">Gemini 3.1 Flash Image Preview</option>
                  <option value="openai/gpt-5-image-mini">GPT Image Mini (DALL-E Equivalent)</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[rgba(240,240,240,0.6)]">
              {localStorage.getItem('custom_ai_provider') === 'openrouter' ? 'Chave de API OpenRouter' : 'Gemini API Key (Opcional)'}
            </label>
            <input 
              key={localStorage.getItem('custom_ai_provider') || 'gemini'}
              type="password" 
              placeholder={localStorage.getItem('custom_ai_provider') === 'openrouter' ? 'sk-or-...' : 'Cole sua chave do Gemini aqui...'}
              defaultValue={
                localStorage.getItem('custom_ai_provider') === 'openrouter' 
                  ? (localStorage.getItem('custom_openrouter_key') || '') 
                  : (localStorage.getItem('custom_gemini_key') || '')
              }
              onChange={(e) => {
                const val = e.target.value.trim();
                const provider = localStorage.getItem('custom_ai_provider') || 'gemini';
                if (provider === 'openrouter') {
                  if (val) {
                    localStorage.setItem('custom_openrouter_key', val);
                  } else {
                    localStorage.removeItem('custom_openrouter_key');
                  }
                } else {
                  if (val) {
                    localStorage.setItem('custom_gemini_key', val);
                    if (val.startsWith('sk-or-')) {
                      localStorage.setItem('custom_ai_provider', 'openrouter');
                      localStorage.setItem('custom_openrouter_key', val);
                      localStorage.removeItem('custom_gemini_key');
                    }
                  } else {
                    localStorage.removeItem('custom_gemini_key');
                  }
                }
                // force update
                setErrorMessage('');
              }}
              className="w-full p-2.5 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-white focus:border-[#6C63FF] outline-none transition-colors"
            />
            <p className="text-[10px] text-[rgba(255,255,255,0.4)]">
              {localStorage.getItem('custom_ai_provider') === 'openrouter'
                ? 'Insira sua chave obtida no painel da OpenRouter para usar modelos como Claude, GPT ou Gemini.'
                : 'Se você ver um erro de "Permission denied" ou "suspended", insira sua própria chave do Google AI Studio aqui para contornar o problema.'}
            </p>
          </div>
        </div>
      </div>     {errorMessage && (
        <div className="p-3 bg-[rgba(255,69,58,0.1)] border border-[rgba(255,69,58,0.2)] text-[#FF453A] text-sm rounded-xl">
          {errorMessage}
        </div>
      )}

      {/* Desktop Generate Button */}
      <div className="hidden lg:block mt-4">
        {location.state?.mode === 'manual' ? (
          <button 
            onClick={() => {
              const newSlides = [...slides, {
                id: `manual-${Date.now()}`,
                type: 'features',
                background: 'light',
                title: `Slide ${slides.length + 1}`,
                content: 'Clique para editar o texto...',
                alignment: 'center',
                verticalAlignment: 'center',
                extendBackgroundToNext: isSeamless,
                layoutModel: 'default',
                textOffsetX: 0,
                textOffsetY: 0,
                twitterImages: [],
                twitterImageBorderRadius: 14,
                twitterImageHeight: 205
              }];
              setSlides(newSlides);
              setNumSlides(newSlides.length);
            }}
            className="w-full py-3.5 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 relative overflow-hidden shadow-[0_0_20px_rgba(108,99,255,0.2)]"
          >
            <div className="relative z-10 flex items-center gap-2">
              <Wand2 size={18} />
              Adicionar Slide
            </div>
          </button>
        ) : (
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !topic}
            className="w-full py-3.5 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white rounded-xl font-semibold disabled:opacity-50 hover:opacity-90 transition-all flex items-center justify-center gap-2 relative overflow-hidden shadow-[0_0_20px_rgba(108,99,255,0.2)]"
          >
            {isGenerating && (
              <div 
                className="absolute left-0 top-0 bottom-0 bg-[rgba(0,0,0,0.2)] transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            )}
            <div className="relative z-10 flex items-center gap-2">
              {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
              {isGenerating ? `${Math.round(progress)}%` : 'Gerar Carrossel'}
            </div>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-[#0A0A0A] text-[#F0F0F0] flex flex-col font-['DM_Sans'] overflow-hidden">
      {/* HEADER */}
      <header className="bg-[#111111] border-b border-[rgba(255,255,255,0.06)] px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-[rgba(240,240,240,0.6)] hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="hidden sm:inline font-medium">Dashboard</span>
        </button>
        
        <h1 className="text-lg md:text-xl font-bold font-['Syne'] absolute left-1/2 -translate-x-1/2">
          Gerador
        </h1>
        
        <div className="flex items-center gap-2">
          {slides.length > 0 && (
            <>
              <button 
                onClick={handleOpenHookOptimizer}
                className="flex items-center gap-1.5 px-3 py-1.5 md:px-3.5 md:py-2 bg-[rgba(108,99,255,0.12)] border border-[rgba(108,99,255,0.3)] text-[#6C63FF] hover:bg-[rgba(108,99,255,0.22)] rounded-lg font-medium transition-colors text-xs md:text-sm cursor-pointer shadow-[0_0_10px_rgba(108,99,255,0.15)]"
                title="Gerar 5 variações estratégicas de capa para o Slide 1"
              >
                <Sparkles size={15} />
                <span className="hidden sm:inline">Ganchos / Capa</span>
              </button>
              <button 
                onClick={handleOpenCaptionModal}
                className="flex items-center gap-1.5 px-3 py-1.5 md:px-3.5 md:py-2 bg-gradient-to-r from-[#6C63FF]/20 to-[#FF6584]/20 border border-[#6C63FF]/40 text-white hover:border-[#6C63FF] rounded-lg font-medium transition-colors text-xs md:text-sm cursor-pointer shadow-[0_0_10px_rgba(255,101,132,0.15)]"
                title="Gerar legenda formatada com hashtags para o Instagram"
              >
                <MessageSquare size={15} className="text-[#FF6584]" />
                <span className="hidden sm:inline">Legenda + Hashtags</span>
              </button>
            </>
          )}

          <button 
            onClick={handleExport}
            disabled={slides.length === 0 || isExporting}
            className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-[#161616] border border-[rgba(255,255,255,0.1)] text-white rounded-lg font-medium disabled:opacity-50 hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          >
            {isExporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
            <span className="hidden md:inline">Exportar ZIP</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Sidebar - Settings (Desktop) */}
        <aside className={`w-full lg:w-80 bg-[#0A0A0A] border-r border-[rgba(255,255,255,0.06)] overflow-y-auto ${activeTab === 'config' ? 'block' : 'hidden lg:block'}`}>
          {renderConfigPanel()}
        </aside>

        {/* Center - Preview */}
        <div className={`flex-1 bg-[#111111] overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-start relative ${activeTab === 'preview' ? 'block' : 'hidden lg:flex'}`}>
          {isGenerating && (
            <div className="absolute inset-0 bg-[#0A0A0A]/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center">
              <div className="w-64 max-w-[80vw]">
                <div className="h-2 bg-[#161616] rounded-full overflow-hidden mb-4">
                  <div 
                    className="h-full bg-gradient-to-r from-[#6C63FF] to-[#FF6584] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-center font-['Syne'] font-medium text-white animate-pulse">
                  {progressText}
                </p>
              </div>
            </div>
          )}

          {slides.length > 0 ? (
            <div className="w-full max-w-[85vw] lg:max-w-none pb-24 lg:pb-0">
              <CarouselPreview 
                slides={slides}
                palette={palette}
                brandName={brandName}
                handle={handle}
                logoUrl={logoUrl}
                headingFont={selectedFonts.heading}
                bodyFont={selectedFonts.body}
                currentIndex={currentIndex}
                setCurrentIndex={setCurrentIndex}
                previewRef={previewRef}
                format={format}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[rgba(240,240,240,0.4)] max-w-md text-center px-4">
              <div className="w-20 h-20 bg-[#161616] rounded-2xl mb-6 flex items-center justify-center border border-[rgba(255,255,255,0.06)]">
                <Wand2 size={32} className="text-[rgba(240,240,240,0.4)]" />
              </div>
              <h2 className="text-xl font-semibold font-['Syne'] text-white mb-2">Pronto para criar</h2>
              <p className="text-sm">
                {location.state?.mode === 'manual' 
                  ? 'Adicione slides no painel de configuração para começar a criar seu carrossel do zero.' 
                  : 'Configure sua marca e insira um tópico para a IA gerar seu carrossel.'}
              </p>
            </div>
          )}
        </div>

        {/* Right Sidebar - Slide Editor (Desktop) */}
        <aside className={`w-full lg:w-80 bg-[#0A0A0A] border-l border-[rgba(255,255,255,0.06)] overflow-y-auto ${activeTab === 'edit' ? 'block' : 'hidden lg:block'}`}>
          {slides.length > 0 ? (
            <div className="p-6 pb-24 lg:pb-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-['Syne'] font-bold text-lg">Slide {currentIndex + 1} de {slides.length}</h2>
                <span className="text-[10px] font-bold px-2 py-1 bg-[rgba(255,255,255,0.1)] rounded uppercase tracking-wider">
                  {slides[currentIndex].type}
                </span>
              </div>
              <SlideEditor 
                slide={slides[currentIndex]} 
                prevSlide={currentIndex > 0 ? slides[currentIndex - 1] : undefined}
                onChange={updateSlide} 
                onChangePrev={(updates) => {
                  if (currentIndex > 0) {
                    const newSlides = [...slides];
                    newSlides[currentIndex - 1] = { ...newSlides[currentIndex - 1], ...updates };
                    setSlides(newSlides);
                    saveToHistoryDebounced(newSlides);
                  }
                }}
                onRegenerateImage={handleRegenerateImage}
                fonts={FONT_PAIRINGS}
              />
            </div>
          ) : (
            <div className="p-6 flex items-center justify-center h-full text-[rgba(240,240,240,0.4)] text-sm text-center">
              Gere um carrossel para editar os slides individuais aqui.
            </div>
          )}
        </aside>

        {/* Mobile Floating Generate Button (only on config tab) */}
        {activeTab === 'config' && (
          <div className="lg:hidden fixed bottom-20 left-4 right-4 z-40">
            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !topic}
              className="w-full py-3.5 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] text-white rounded-xl font-semibold disabled:opacity-50 shadow-lg flex items-center justify-center gap-2 relative overflow-hidden"
            >
              {isGenerating && (
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-[rgba(0,0,0,0.2)] transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              )}
              <div className="relative z-10 flex items-center gap-2">
                {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
                {isGenerating ? `${Math.round(progress)}%` : 'Gerar Carrossel'}
              </div>
            </button>
          </div>
        )}

        {/* Mobile Tab Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#111111] border-t border-[rgba(255,255,255,0.06)] flex items-center justify-around p-2 z-50 pb-safe">
          <button 
            onClick={() => setActiveTab('config')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg min-w-[80px] transition-colors ${activeTab === 'config' ? 'text-[#6C63FF]' : 'text-[rgba(240,240,240,0.4)] hover:text-[rgba(240,240,240,0.8)]'}`}
          >
            <Settings size={20} />
            <span className="text-[10px] font-medium">Config</span>
          </button>
          <button 
            onClick={() => setActiveTab('preview')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg min-w-[80px] transition-colors ${activeTab === 'preview' ? 'text-[#6C63FF]' : 'text-[rgba(240,240,240,0.4)] hover:text-[rgba(240,240,240,0.8)]'}`}
          >
            <LayoutGrid size={20} />
            <span className="text-[10px] font-medium">Preview</span>
          </button>
          <button 
            onClick={() => setActiveTab('edit')}
            disabled={slides.length === 0}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg min-w-[80px] transition-colors ${slides.length === 0 ? 'opacity-30' : activeTab === 'edit' ? 'text-[#6C63FF]' : 'text-[rgba(240,240,240,0.4)] hover:text-[rgba(240,240,240,0.8)]'}`}
          >
            <Edit3 size={20} />
            <span className="text-[10px] font-medium">Editar</span>
          </button>
        </div>
      </main>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-start overflow-y-auto p-4 md:p-8">
          <div className="w-full max-w-5xl bg-[#111111] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold font-['Syne'] text-white">Exportação Concluída!</h2>
              <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-full text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <p className="text-[rgba(240,240,240,0.8)] mb-8">
              O download do arquivo ZIP com todos os slides deve ter iniciado automaticamente. 
              Se o seu navegador bloqueou o download ou você está no celular, você pode baixar as imagens individualmente abaixo clicando no botão "Baixar" ou segurando a imagem para salvar.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {exportedImages.map((imgUrl, idx) => (
                <div key={idx} className="flex flex-col gap-3 bg-[#161616] p-3 rounded-xl border border-[rgba(255,255,255,0.06)]">
                  <div className="aspect-[4/5] w-full overflow-hidden rounded-lg bg-black">
                    <img src={imgUrl} alt={`Slide ${idx + 1}`} className="w-full h-full object-contain" />
                  </div>
                  <a 
                    href={imgUrl} 
                    download={`slide_${idx + 1}.png`}
                    className="w-full py-2.5 bg-[rgba(108,99,255,0.1)] text-[#6C63FF] hover:bg-[rgba(108,99,255,0.2)] rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Download size={16} />
                    Baixar Slide {idx + 1}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Otimizador de Ganchos / Capas */}
      {showHookOptimizer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#111111] border border-[rgba(255,255,255,0.12)] rounded-2xl p-6 flex flex-col shadow-2xl animate-fade-in max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center pb-4 border-b border-[rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6C63FF] to-[#FF6584] flex items-center justify-center text-white shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-['Syne'] text-white">Otimizador de Ganchos (Capa)</h2>
                  <p className="text-xs text-[rgba(240,240,240,0.6)]">5 variações estratégicas com pontuação de retenção para o Slide 1</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHookOptimizer(false)} 
                className="p-1.5 hover:bg-[rgba(255,255,255,0.1)] rounded-lg text-[rgba(240,240,240,0.6)] hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-4 overflow-y-auto flex-1 flex flex-col gap-3 pr-1">
              {isLoadingHooks ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                  <Loader2 className="animate-spin text-[#6C63FF]" size={32} />
                  <p className="text-sm font-['Syne'] text-white">Criando ganchos de alta conversão...</p>
                  <p className="text-xs text-[rgba(240,240,240,0.5)]">Aplicando psicologia de retenção e frameworks virais</p>
                </div>
              ) : hookVariations.length === 0 ? (
                <div className="py-8 text-center text-sm text-[rgba(240,240,240,0.5)]">
                  Nenhum gancho gerado ainda.
                </div>
              ) : (
                hookVariations.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="p-4 bg-[#161616] border border-[rgba(255,255,255,0.06)] hover:border-[#6C63FF]/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all group"
                  >
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#6C63FF]/15 text-[#6C63FF] border border-[#6C63FF]/30">
                          {item.framework}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <Flame size={12} /> Score: {item.score}%
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white group-hover:text-[#6C63FF] transition-colors">
                        "{item.hook}"
                      </p>
                      <p className="text-[11px] text-[rgba(240,240,240,0.5)] leading-tight">
                        💡 {item.reason}
                      </p>
                    </div>

                    <button
                      onClick={() => handleApplyHook(item.hook)}
                      className="px-3.5 py-2 bg-[#6C63FF] hover:bg-[#5b54d6] text-white text-xs font-semibold rounded-lg transition-all shrink-0 flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(108,99,255,0.3)] cursor-pointer"
                    >
                      <Check size={14} /> Aplicar na Capa
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[rgba(255,255,255,0.08)] flex justify-between items-center">
              <span className="text-xs text-[rgba(240,240,240,0.5)] truncate max-w-[60%]">
                {slides.length > 0 ? `Slide 1: "${slides[0]?.title?.replace(/<[^>]*>/g, '')}"` : ''}
              </span>
              <button
                disabled={isLoadingHooks}
                onClick={async () => {
                  setIsLoadingHooks(true);
                  try {
                    const activeTopic = topic.trim() || slides[0]?.title || 'Como alcançar resultados extraordinários';
                    const currentTitle = slides[0]?.title || '';
                    const variations = await generateHookVariations(activeTopic, tone, brandName, currentTitle);
                    setHookVariations(variations);
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setIsLoadingHooks(false);
                  }
                }}
                className="px-3 py-1.5 bg-[#161616] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.05)] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={12} className={isLoadingHooks ? 'animate-spin' : ''} />
                Novas Sugestões
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Legenda do Post + Hashtags */}
      {showCaptionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#111111] border border-[rgba(255,255,255,0.12)] rounded-2xl p-6 flex flex-col shadow-2xl animate-fade-in max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center pb-4 border-b border-[rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF6584] to-[#6C63FF] flex items-center justify-center text-white shrink-0">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-['Syne'] text-white">Legenda & Hashtags para Instagram</h2>
                  <p className="text-xs text-[rgba(240,240,240,0.6)]">Pronta para copiar e colar com espaçamentos otimizados</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCaptionModal(false)} 
                className="p-1.5 hover:bg-[rgba(255,255,255,0.1)] rounded-lg text-[rgba(240,240,240,0.6)] hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-4 overflow-y-auto flex-1 flex flex-col gap-4 pr-1">
              {isLoadingCaption ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
                  <Loader2 className="animate-spin text-[#FF6584]" size={32} />
                  <p className="text-sm font-['Syne'] text-white">Escrevendo legenda persuasiva e selecionando hashtags...</p>
                  <p className="text-xs text-[rgba(240,240,240,0.5)]">Sintetizando os ganchos e CTAs do carrossel</p>
                </div>
              ) : postCaptionData ? (
                <>
                  {/* Bloco Legenda */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <FileText size={14} className="text-[#6C63FF]" /> Legenda do Post
                      </label>
                      <button
                        onClick={() => {
                          const fullText = `${postCaptionData.caption}\n\n.\n.\n${postCaptionData.hashtags.join(' ')}`;
                          navigator.clipboard.writeText(fullText);
                          setCopiedCaption(true);
                          setTimeout(() => setCopiedCaption(false), 2000);
                        }}
                        className="px-3 py-1 bg-[#6C63FF] hover:bg-[#5b54d6] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(108,99,255,0.3)] cursor-pointer"
                      >
                        {copiedCaption ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                        {copiedCaption ? 'Copiado!' : 'Copiar Tudo'}
                      </button>
                    </div>
                    <textarea 
                      readOnly
                      value={postCaptionData.caption}
                      className="w-full p-3.5 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-xl text-sm text-[rgba(240,240,240,0.9)] min-h-[160px] font-sans leading-relaxed focus:outline-none select-all"
                    />
                  </div>

                  {/* Bloco Hashtags */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={14} className="text-[#FF6584]" /> Hashtags Estratégicas ({postCaptionData.hashtags.length})
                      </label>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(postCaptionData.hashtags.join(' '));
                          setCopiedHashtags(true);
                          setTimeout(() => setCopiedHashtags(false), 2000);
                        }}
                        className="px-2.5 py-1 bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] border border-[rgba(255,255,255,0.1)] text-white text-xs rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                      >
                        {copiedHashtags ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        {copiedHashtags ? 'Copiadas!' : 'Copiar Hashtags'}
                      </button>
                    </div>
                    <div className="p-3 bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-xl flex flex-wrap gap-1.5">
                      {postCaptionData.hashtags.map((tag, tIdx) => (
                        <span key={tIdx} className="text-xs px-2 py-0.5 rounded-md bg-[rgba(108,99,255,0.1)] text-[#6C63FF] border border-[rgba(108,99,255,0.2)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bloco Primeiro Comentário */}
                  {postCaptionData.firstComment && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <MessageSquare size={14} className="text-amber-400" /> Primeiro Comentário (Engajamento)
                        </label>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(postCaptionData.firstComment);
                            setCopiedComment(true);
                            setTimeout(() => setCopiedComment(false), 2000);
                          }}
                          className="px-2.5 py-1 bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] border border-[rgba(255,255,255,0.1)] text-white text-xs rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                        >
                          {copiedComment ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          {copiedComment ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                      <div className="p-3 bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-xl text-xs text-[rgba(240,240,240,0.8)]">
                        {postCaptionData.firstComment}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div className="pt-3 border-t border-[rgba(255,255,255,0.08)] flex justify-end">
              <button
                disabled={isLoadingCaption}
                onClick={handleRegenerateCaption}
                className="px-3.5 py-2 bg-[#161616] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.05)] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} className={isLoadingCaption ? 'animate-spin' : ''} />
                Regenerar Legenda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs for references (always mounted to avoid unmounted ref errors) */}
      <input 
        type="file" 
        ref={referenceImageInputRef} 
        onChange={handleReferenceImageUpload} 
        accept="image/*" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={creativeReferenceInputRef} 
        onChange={handleCreativeReferenceUpload} 
        accept="image/*" 
        className="hidden" 
      />
    </div>
  );

}
