import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { generatePalette, FONT_PAIRINGS, loadAllGoogleFonts } from '../lib/colors';
import { generateCarouselContent, generateImage, buildCinematicImagePrompt, analyzeCreativeReference, SlideData } from '../lib/gemini';
import { CarouselPreview } from '../components/CarouselPreview';
import { SlideEditor } from '../components/SlideEditor';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Loader2, Download, Wand2, Image as ImageIcon, Upload, Key, ArrowLeft, Settings, LayoutGrid, Edit3, ChevronDown, ChevronRight, X, Bookmark, Plus } from 'lucide-react';
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
  const [referenceImage, setReferenceImage] = useState<{data: string, mimeType: string, url: string} | null>(null);
  const [creativeReference, setCreativeReference] = useState<{data: string, mimeType: string, url: string} | null>(null);
  const [creativeStylePrompt, setCreativeStylePrompt] = useState<string>('');
  
  const [savedPalettes, setSavedPalettes] = useState<{id: string, name: string, color: string, secondary?: string, accent?: string, darkBg?: string, lightBg?: string}[]>([]);
  const [isSavingPalette, setIsSavingPalette] = useState(false);
  const [newPaletteName, setNewPaletteName] = useState('');
  
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Mobile Tabs
  const [activeTab, setActiveTab] = useState<'config' | 'preview' | 'edit'>('config');

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportedImages, setExportedImages] = useState<string[]>([]);

  // Debounce saving to history to prevent lag
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveToHistoryDebounced = (generatedSlides: SlideData[]) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveToHistory(generatedSlides);
    }, 1000);
  };

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

  const palette = generatePalette(primaryColor, secondaryColor, accentColor, darkBgColor, lightBgColor);
  const selectedFonts = FONT_PAIRINGS[fontPairingIndex];

  useEffect(() => {
    get('carousel_palettes').then((data) => {
      if (data && Array.isArray(data)) {
        setSavedPalettes(data);
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

  useEffect(() => {
    loadAllGoogleFonts();
    checkApiKey();
    
    // Load from history if passed via state
    if (location.state?.carouselData) {
      const data = location.state.carouselData as CarouselHistoryItem;
      setSlides(data.slides);
      setTopic(data.topic);
      setBrandName(data.brandName);
      setPrimaryColor(data.primaryColor);
      setTone(data.tone);
      setFontPairingIndex(data.fontPairingIndex);
      setNumSlides(data.numSlides);
      setActiveTab('preview');
    } else if (location.state?.mode === 'manual') {
      // Initialize empty slides for manual mode
      const emptySlides: SlideData[] = Array.from({ length: numSlides }).map((_, i) => ({
        id: `manual-${Date.now()}-${i}`,
        type: i === 0 ? 'hero' : (i === numSlides - 1 ? 'cta' : 'features'),
        background: 'light',
        title: i === 0 ? 'Título do Carrossel' : `Slide ${i + 1}`,
        content: 'Clique para editar o texto...',
        alignment: 'center',
        verticalAlignment: 'center',
        extendBackgroundToNext: isSeamless
      }));
      setSlides(emptySlides);
      setActiveTab('preview');
    }
  }, [location.state, numSlides, isSeamless]);

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
      };
      reader.readAsDataURL(file);
    }
  };

  const saveToHistory = async (generatedSlides: SlideData[]) => {
    const historyItem: CarouselHistoryItem = {
      id: location.state?.carouselData?.id || Math.random().toString(36).substring(7),
      title: generatedSlides[0]?.title || topic,
      topic,
      numSlides,
      slides: generatedSlides,
      brandName,
      primaryColor,
      tone,
      fontPairingIndex,
      createdAt: location.state?.carouselData?.createdAt || Date.now()
    };
    try {
      let existing = await get<CarouselHistoryItem[]>('carousel_history');
      if (!existing) {
        const localSaved = localStorage.getItem('carousel_history');
        existing = localSaved ? JSON.parse(localSaved) : [];
      }
      
      // Update existing or add new
      const filtered = existing!.filter(item => item.id !== historyItem.id);
      const updatedHistory = [historyItem, ...filtered].slice(0, 50);
      
      await set('carousel_history', updatedHistory);
      localStorage.removeItem('carousel_history');
      
      // Update location state so subsequent edits update the same item
      navigate('.', { replace: true, state: { carouselData: historyItem } });
    } catch (e) {
      console.error('Failed to save to history', e);
    }
  };

  const handleGenerate = async () => {
    if (!topic) {
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
      let finalSlides = await generateCarouselContent(
        topic,
        numSlides,
        tone,
        brandName,
        includeImages,
        !!referenceImage,
        isSeamless
      );
      
      // Mostrar os slides imediatamente com o texto
      setSlides([...finalSlides]);
      setCurrentIndex(0);
      
      let hasImageErrors = false;
      if (includeImages) {
        clearInterval(progressInterval);

        let activeStylePrompt = creativeStylePrompt;
        if (creativeReference) {
          setProgressText('Analisando referência criativa...');
          activeStylePrompt = await analyzeCreativeReference(creativeReference);
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
                const cinematicPrompt = buildCinematicImagePrompt(
                  slide.imageDescription || '',
                  slide.type,
                  index,
                  topic,
                  tone,
                  !!referenceImage,
                  activeStylePrompt
                );
                const imageUrl = await generateImage(cinematicPrompt, referenceImage || undefined, aspectRatio, slide.type, index);
                
                finalSlides[index] = { ...slide, imageUrl };
                setSlides([...finalSlides]);
              } catch (e) {
                console.error("Erro na imagem do slide", slide.id, e);
                hasImageErrors = true;
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
      saveToHistory(finalSlides);

      // Grava log de geração no Firestore para auditoria
      if (user && profile) {
        try {
          await addDoc(collection(db, 'activity_logs'), {
            userId: user.uid,
            userEmail: user.email || '',
            userName: profile.name || 'Usuário',
            action: 'generate',
            topic: topic,
            numSlides: numSlides,
            timestamp: serverTimestamp()
          });
        } catch (logError) {
          console.error("Falha ao gravar log de geração no Firestore:", logError);
        }
      }
      
      if (hasImageErrors) {
        setErrorMessage('O carrossel foi gerado, mas houve um erro ao gerar algumas imagens com a IA. Você pode tentar gerar novamente ou adicionar suas próprias imagens.');
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
    try {
      // 1. Espera as fontes do navegador estarem 100% carregadas e prontas
      try {
        await document.fonts.ready;
      } catch (fontReadyError) {
        console.warn("Aviso ao aguardar document.fonts.ready:", fontReadyError);
      }

      // 2. Coleta apenas as fontes que estão sendo realmente utilizadas no carrossel atual
      const selectedFonts = FONT_PAIRINGS[fontPairingIndex];
      const usedFonts = new Set<string>();
      if (selectedFonts.heading) usedFonts.add(selectedFonts.heading);
      if (selectedFonts.body) usedFonts.add(selectedFonts.body);

      slides.forEach(slide => {
        if (slide.titleFont) usedFonts.add(slide.titleFont);
        if (slide.bodyFont) usedFonts.add(slide.bodyFont);
        if (slide.customLayers) {
          slide.customLayers.forEach(layer => {
            if (layer.fontFamily) usedFonts.add(layer.fontFamily);
          });
        }
      });

      // Formata a lista de fontes para o Google Fonts
      const fontList = Array.from(usedFonts)
        .filter(f => f !== 'Monument Extended' && f !== 'Times New Roman')
        .map(f => {
          if (['Anton', 'Bebas Neue', 'Instrument Serif', 'Bagel Fat One'].includes(f)) {
            return `${f.replace(/ /g, '+')}:wght@400`;
          }
          return `${f.replace(/ /g, '+')}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800`;
        });

      // Adiciona Syne e DM Sans que são as fontes padrão do app por garantia
      if (!usedFonts.has('Syne')) {
        fontList.push('Syne:wght@400;600;700;800');
      }
      if (!usedFonts.has('DM Sans')) {
        fontList.push('DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600');
      }

      // 3. Busca o CSS destas fontes diretamente do Google Fonts e converte os arquivos woff2 para base64.
      // Isso torna o SVG 100% autossuficiente e imune a bloqueios de CORS e políticas do navegador no canvas.
      let base64FontCSS = '';
      if (fontList.length > 0) {
        const fontCSSUrl = `https://fonts.googleapis.com/css2?family=${fontList.join('&family=')}&display=swap`;
        try {
          const fontRes = await fetch(fontCSSUrl);
          if (fontRes.ok) {
            let cssText = await fontRes.text();
            
            // Regex robusta para encontrar as URLs binárias (.woff2)
            const urlRegex = /url\(['"]?(https:\/\/fonts\.gstatic\.com\/[^'"\)]+)['"]?\)/g;
            const matches = [...cssText.matchAll(urlRegex)];
            const fontUrlToBase64 = new Map<string, string>();

            // Busca e converte cada arquivo woff2 para base64 em paralelo
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

            // Substitui todas as URLs pelos dados base64 correspondentes no CSS
            for (const [fontFileUrl, base64Data] of fontUrlToBase64.entries()) {
              cssText = cssText.replaceAll(fontFileUrl, base64Data);
            }
            base64FontCSS = cssText;
          }
        } catch (fontFetchError) {
          console.error("Erro ao obter e processar fontes em base64:", fontFetchError);
        }
      }

      const slideElements = document.querySelectorAll('.slide-container');
      const newExportedImages: string[] = [];

      for (let i = 0; i < slideElements.length; i++) {
        const el = slideElements[i] as HTMLElement;
        el.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
        await new Promise(r => setTimeout(r, 450)); // Pequena pausa para garantir renderização perfeita no DOM

        try {
          const bgColor = window.getComputedStyle(el).backgroundColor;
          const dataUrl = await toPng(el, {
            pixelRatio: 3,
            width: 420,
            height: 525,
            cacheBust: true,
            skipFonts: true, // Ignora varredura padrão para evitar falhas de CORS, pois as fontes que importam já estão no fontEmbedCSS
            fontEmbedCSS: base64FontCSS || undefined, // Injeta o CSS com as fontes embutidas em base64 diretamente no SVG
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
      setIsExporting(false);
    }
  };

  const updateSlide = (updatedSlide: SlideData) => {
    const newSlides = slides.map(s => s.id === updatedSlide.id ? updatedSlide : s);
    setSlides(newSlides);
    saveToHistoryDebounced(newSlides);
  };

  const handleRegenerateImage = async (slideId: string, prompt: string) => {
    try {
      const slideIndex = slides.findIndex(s => s.id === slideId);
      const slide = slides[slideIndex];
      if (!slide) return;
      
      const aspectRatio = "4:3"; // Updated to 4:3 as requested
      const cinematicPrompt = buildCinematicImagePrompt(
        prompt,
        slide.type,
        slideIndex,
        topic,
        tone,
        !!referenceImage,
        creativeStylePrompt
      );
      
      const imageUrl = await generateImage(cinematicPrompt, referenceImage || undefined, aspectRatio, slide.type, slideIndex);
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
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[rgba(240,240,240,0.6)]">Tópico / Ideia</label>
                <textarea 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ex: 5 passos para criar uma marca inesquecível..."
                  className="w-full p-3 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm min-h-[100px] focus:border-[#6C63FF] outline-none text-white placeholder:text-[rgba(255,255,255,0.2)] transition-colors"
                />
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
                <select 
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full p-3 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-white focus:border-[#6C63FF] outline-none transition-colors"
                >
                  <option>Profissional</option>
                  <option>Casual</option>
                  <option>Divertido</option>
                  <option>Ousado</option>
                  <option>Minimalista</option>
                  <option>Educativo</option>
                </select>
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[rgba(240,240,240,0.6)]">Cores da Marca</label>
              </div>
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
                      onChange={(e) => setIsSeamless(e.target.checked)}
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
                    <input 
                      type="file" 
                      ref={referenceImageInputRef}
                      onChange={handleReferenceImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
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
                    <input 
                      type="file" 
                      ref={creativeReferenceInputRef}
                      onChange={handleCreativeReferenceUpload}
                      accept="image/*"
                      className="hidden"
                    />
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
                defaultValue={localStorage.getItem('custom_openrouter_model') || 'google/gemini-2.5-flash'}
                onChange={(e) => {
                  localStorage.setItem('custom_openrouter_model', e.target.value);
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
                  defaultValue={localStorage.getItem('custom_openrouter_model') || ''}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (val) {
                      localStorage.setItem('custom_openrouter_model', val);
                    }
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
                extendBackgroundToNext: isSeamless
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
        
        <button 
          onClick={handleExport}
          disabled={slides.length === 0 || isExporting}
          className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-[#161616] border border-[rgba(255,255,255,0.1)] text-white rounded-lg font-medium disabled:opacity-50 hover:bg-[rgba(255,255,255,0.05)] transition-colors"
        >
          {isExporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
          <span className="hidden md:inline">Exportar ZIP</span>
        </button>
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
    </div>
  );
}
