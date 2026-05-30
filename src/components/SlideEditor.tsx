import React, { useState, useRef, useEffect } from 'react';
import { SlideData } from '../lib/gemini';
import { AlignLeft, AlignCenter, AlignRight, RefreshCw, Image as ImageIcon, ArrowUpToLine, ArrowDownToLine, AlignVerticalJustifyCenter, Upload, Plus, Trash2, Layers, Copy, ChevronDown, ChevronUp } from 'lucide-react';

function RichTextEditor({ value, onChange, fonts }: { value: string, onChange: (val: string) => void, fonts: any[] }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<number | null>(null);
  const internalValue = useRef<string>(value);
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      if (value !== internalValue.current && value !== undefined) {
        editorRef.current.innerHTML = value || '';
        internalValue.current = value || '';
      }
    }
  }, [value]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      if (document.activeElement === editorRef.current) {
        saveSelection();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      internalValue.current = html;
      
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
      debounceTimer.current = window.setTimeout(() => {
        onChange(html);
      }, 400);
    }
  };

  const applyCommand = (command: string, val?: string) => {
    if (savedRange.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange.current);
    }
    
    // Força uso de CSS em vez de tags HTML para melhor compatibilidade com as fontes do Tailwind
    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch (e) {
      // Ignora erro em navegadores antigos
    }
    
    if (command === 'fontName' && val) {
      document.execCommand('fontName', false, val.includes(' ') ? `"${val}"` : val);
    } else {
      document.execCommand(command, false, val);
    }

    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleInput();
  };

  return (
    <div className="border border-[rgba(255,255,255,0.1)] rounded-md overflow-hidden flex flex-col">
      <div className="flex flex-wrap gap-1 p-1 bg-[#0A0A0A] border-b border-[rgba(255,255,255,0.1)] items-center">
        <input 
          type="color" 
          onChange={(e) => applyCommand('foreColor', e.target.value)} 
          className="w-6 h-6 cursor-pointer bg-transparent border-none p-0" 
          title="Cor do texto selecionado" 
        />
        <select 
          onChange={(e) => {
            applyCommand('fontName', e.target.value);
            e.target.value = '';
          }} 
          className="text-xs border border-[rgba(255,255,255,0.1)] rounded p-1 bg-[#161616] text-white"
        >
          <option value="">Fonte...</option>
          {fonts.map(f => <option key={f.name} value={f.heading}>{f.name}</option>)}
        </select>
        <button onClick={() => applyCommand('bold')} onMouseDown={e => e.preventDefault()} className="px-2 py-1 text-xs font-bold hover:bg-[rgba(255,255,255,0.1)] text-white rounded">B</button>
        <button onClick={() => applyCommand('italic')} onMouseDown={e => e.preventDefault()} className="px-2 py-1 text-xs italic hover:bg-[rgba(255,255,255,0.1)] text-white rounded">I</button>
        <button onClick={() => applyCommand('underline')} onMouseDown={e => e.preventDefault()} className="px-2 py-1 text-xs underline hover:bg-[rgba(255,255,255,0.1)] text-white rounded">U</button>
        <button onClick={() => applyCommand('removeFormat')} onMouseDown={e => e.preventDefault()} className="px-2 py-1 text-xs hover:bg-[rgba(255,255,255,0.1)] text-white rounded" title="Limpar formatação">🧹</button>
      </div>
      <div 
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        className="p-2 text-sm min-h-[80px] focus:outline-none bg-[#161616] text-white"
      />
    </div>
  );
}

interface SlideEditorProps {
  slide: SlideData;
  prevSlide?: SlideData;
  onChange: (updatedSlide: SlideData) => void;
  onChangePrev?: (updates: Partial<SlideData>) => void;
  onRegenerateImage?: (slideId: string, prompt: string) => Promise<void>;
  fonts: { name: string, heading: string, body: string }[];
}

export function SlideEditor({ slide, prevSlide, onChange, onChangePrev, onRegenerateImage, fonts }: SlideEditorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTitleAdvanced, setShowTitleAdvanced] = useState(false);

  const handleChange = (field: keyof SlideData, value: any) => {
    onChange({ ...slide, [field]: value });
  };

  const isExtendedFromPrev = prevSlide?.extendBackgroundToNext === true;
  const activeBgSlide = isExtendedFromPrev ? prevSlide! : slide;
  const handleBgChange = (field: keyof SlideData, value: any) => {
    if (isExtendedFromPrev && onChangePrev) {
      onChangePrev({ [field]: value });
    } else {
      handleChange(field, value);
    }
  };

  const handleRegenerate = async () => {
    if (!onRegenerateImage || !slide.imageDescription) return;
    setIsGenerating(true);
    try {
      await onRegenerateImage(slide.id, slide.imageDescription);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'backgroundImage') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (field === 'backgroundImage') {
          handleBgChange(field, reader.result as string);
        } else {
          handleChange(field, reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#161616] border border-[rgba(255,255,255,0.06)] rounded-xl shadow-sm text-white">
      <h3 className="font-semibold text-lg border-b border-[rgba(255,255,255,0.1)] pb-3 shrink-0">Editar Slide</h3>
      
      <div className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 pb-4" style={{ maxHeight: 'calc(100vh - 240px)' }}>

        {/* --- FUNDO E ESTILO --- */}
        <div className="flex flex-col gap-4 p-4 bg-[#0A0A0A] rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm">
          <h4 className="text-xs font-bold text-[#6C63FF] flex items-center gap-2 uppercase tracking-wider mb-1">Fundo e Estilo</h4>
          
          <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Fundo</label>
        <select 
          value={slide.background} 
          onChange={(e) => handleChange('background', e.target.value)}
          className="p-2 border border-[rgba(255,255,255,0.1)] rounded-md text-sm bg-[#0A0A0A] text-white"
        >
          <option value="light">Claro</option>
          <option value="dark">Escuro</option>
          <option value="brand-gradient">Gradiente da Marca</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Estender Fundo para o Próximo Slide</label>
        {isExtendedFromPrev ? (
          <p className="text-[10px] text-[rgba(240,240,240,0.6)] italic">
            Este slide compartilha a imagem de fundo do slide anterior (Carrossel Infinito).
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={slide.extendBackgroundToNext || false}
              onChange={(e) => handleChange('extendBackgroundToNext', e.target.checked)}
              className="w-4 h-4 text-[#6C63FF] rounded border-[rgba(255,255,255,0.1)] bg-[#0A0A0A]"
            />
            <span className="text-sm text-[rgba(240,240,240,0.8)]">Sim (Carrossel Infinito)</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Imagem de Fundo (Opcional)</label>
        <div className="flex gap-2 items-center">
          <label className="flex items-center justify-center px-3 py-2 bg-[#161616] border border-[rgba(255,255,255,0.1)] rounded-md cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors text-sm text-white shrink-0">
            <Upload size={14} className="mr-2" />
            Upload
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'backgroundImage')} />
          </label>
          <input 
            type="text" 
            value={activeBgSlide.backgroundImage || ''} 
            onChange={(e) => handleBgChange('backgroundImage', e.target.value)}
            className="flex-1 p-2 border border-[rgba(255,255,255,0.1)] rounded-md text-sm bg-[#0A0A0A] text-white"
            placeholder="Ou cole a URL..."
          />
        </div>
      </div>

      {(activeBgSlide.backgroundImage || activeBgSlide.imagePosition === 'background') && (
        <div className={`flex flex-col gap-3 p-3 rounded-lg border ${isExtendedFromPrev ? 'bg-[rgba(108,99,255,0.05)] border-[rgba(108,99,255,0.2)]' : 'bg-[#0A0A0A] border-[rgba(255,255,255,0.06)]'}`}>
          <label className={`text-xs font-semibold uppercase flex items-center gap-2 ${isExtendedFromPrev ? 'text-[#6C63FF]' : 'text-[rgba(240,240,240,0.8)]'}`}>
            {isExtendedFromPrev ? <ImageIcon size={14} /> : null}
            Ajuste da Imagem de Fundo
          </label>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[rgba(240,240,240,0.5)]">Horizontal (Esquerda/Direita)</label>
            <input type="range" min="0" max="100" value={activeBgSlide.bgImageOffsetX ?? 50} onChange={(e) => handleBgChange('bgImageOffsetX', parseInt(e.target.value))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[rgba(240,240,240,0.5)]">Vertical (Cima/Baixo)</label>
            <input type="range" min="0" max="100" value={activeBgSlide.bgImageOffsetY ?? 50} onChange={(e) => handleBgChange('bgImageOffsetY', parseInt(e.target.value))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[rgba(240,240,240,0.5)]">Opacidade da Imagem ({(activeBgSlide.bgImageOpacity ?? 1).toFixed(2)})</label>
            <input type="range" min="0" max="1" step="0.05" value={activeBgSlide.bgImageOpacity ?? 1} onChange={(e) => handleBgChange('bgImageOpacity', parseFloat(e.target.value))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[rgba(240,240,240,0.5)]">Opacidade do Degradê ({(activeBgSlide.bgGradientOpacity ?? 0.8).toFixed(2)})</label>
            <input type="range" min="0" max="1" step="0.05" value={activeBgSlide.bgGradientOpacity ?? 0.8} onChange={(e) => handleBgChange('bgGradientOpacity', parseFloat(e.target.value))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[rgba(240,240,240,0.5)]">Posição do Degradê</label>
            <select 
              value={activeBgSlide.bgGradientPosition || 'bottom'} 
              onChange={(e) => handleBgChange('bgGradientPosition', e.target.value)}
              className="p-1 border border-[rgba(255,255,255,0.1)] rounded-md text-xs bg-[#161616] text-white"
            >
              <option value="bottom">Embaixo (Escurece a base)</option>
              <option value="top">Em Cima (Escurece o topo)</option>
            </select>
          </div>
        </div>
      )}
      </div>

      {/* --- TEXTOS E CONTEÚDO --- */}
      <div className="flex flex-col gap-4 p-4 bg-[#0A0A0A] rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm">
        <h4 className="text-xs font-bold text-[#6C63FF] flex items-center gap-2 uppercase tracking-wider mb-1">Textos e Conteúdo</h4>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Tag (Opcional)</label>
        <input 
          type="text" 
          value={slide.tag || ''} 
          onChange={(e) => handleChange('tag', e.target.value)}
          className="p-2 border border-[rgba(255,255,255,0.1)] rounded-md text-sm bg-[#0A0A0A] text-white"
          placeholder="ex: DICAS"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Título</label>
        <RichTextEditor 
          value={slide.title} 
          onChange={(val) => handleChange('title', val)} 
          fonts={fonts} 
        />
        <div className="flex gap-2 mt-1">
          <input type="color" value={slide.titleColor || '#000000'} onChange={(e) => handleChange('titleColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0" title="Cor Padrão do Título" />
          <select value={slide.titleFont || ''} onChange={(e) => handleChange('titleFont', e.target.value)} className="flex-1 p-1 border border-[rgba(255,255,255,0.1)] rounded text-xs bg-[#0A0A0A] text-white">
            <option value="">Fonte Padrão Global</option>
            {fonts.map(f => <option key={f.name} value={f.heading}>{f.name} (Heading)</option>)}
          </select>
        </div>

        <div className="flex flex-col mt-2 border border-[rgba(255,255,255,0.05)] rounded bg-[#111] overflow-hidden">
          <button 
            className="flex items-center justify-between p-2 text-[10px] font-bold text-[rgba(240,240,240,0.6)] uppercase hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            onClick={() => setShowTitleAdvanced(!showTitleAdvanced)}
          >
            <span>Efeitos e Tipografia Avançada</span>
            <ChevronDown size={14} className={`transform transition-transform ${showTitleAdvanced ? 'rotate-180' : ''}`} />
          </button>
          
          {showTitleAdvanced && (
            <div className="flex flex-col gap-3 p-3 border-t border-[rgba(255,255,255,0.05)]">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[rgba(240,240,240,0.6)]">Tamanho (Multiplicador)</label>
                  <input type="number" step="0.1" min="0.5" max="3" value={slide.titleFontSize || 1} onChange={(e) => handleChange('titleFontSize', parseFloat(e.target.value))} className="p-1 border border-[rgba(255,255,255,0.1)] rounded text-xs bg-[#0A0A0A] text-white" placeholder="Ex: 1.2" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[rgba(240,240,240,0.6)]">Espaçamento Horizontal</label>
                  <input type="number" step="1" min="-10" max="20" value={slide.titleLetterSpacing ?? 0} onChange={(e) => handleChange('titleLetterSpacing', parseInt(e.target.value))} className="p-1 border border-[rgba(255,255,255,0.1)] rounded text-xs bg-[#0A0A0A] text-white" placeholder="px" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[rgba(240,240,240,0.6)]">Espaçamento Vertical (Line Height)</label>
                <input type="number" step="0.1" min="0.8" max="2" value={slide.titleLineHeight || 1.1} onChange={(e) => handleChange('titleLineHeight', parseFloat(e.target.value))} className="p-1 border border-[rgba(255,255,255,0.1)] rounded text-xs bg-[#0A0A0A] text-white" placeholder="Ex: 1.1" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[rgba(240,240,240,0.6)]">Efeito Visual</label>
                <select value={slide.titleEffect || 'none'} onChange={(e) => handleChange('titleEffect', e.target.value)} className="p-1 border border-[rgba(255,255,255,0.1)] rounded text-xs bg-[#0A0A0A] text-white">
                  <option value="none">Nenhum</option>
                  <option value="text-gradient">Texto em Degradê</option>
                  <option value="bg-solid">Fundo Sólido (Marca texto)</option>
                  <option value="bg-gradient">Fundo Degradê</option>
                </select>
              </div>
              {slide.titleEffect && slide.titleEffect !== 'none' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[rgba(240,240,240,0.6)]">Cores do Efeito</label>
                  <div className="flex gap-2">
                    <input type="color" value={slide.titleEffectColors?.[0] || '#6C63FF'} onChange={(e) => handleChange('titleEffectColors', [e.target.value, slide.titleEffectColors?.[1] || '#FF63A5'])} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0" title="Cor 1" />
                    <input type="color" value={slide.titleEffectColors?.[1] || '#FF63A5'} onChange={(e) => handleChange('titleEffectColors', [slide.titleEffectColors?.[0] || '#6C63FF', e.target.value])} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0" title="Cor 2" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Conteúdo (Opcional)</label>
        <RichTextEditor 
          value={slide.content || ''} 
          onChange={(val) => handleChange('content', val)} 
          fonts={fonts} 
        />
        <div className="flex gap-2 mt-1">
          <input type="color" value={slide.contentColor || '#000000'} onChange={(e) => handleChange('contentColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0" title="Cor Padrão do Conteúdo" />
          <select value={slide.bodyFont || ''} onChange={(e) => handleChange('bodyFont', e.target.value)} className="flex-1 p-1 border border-[rgba(255,255,255,0.1)] rounded text-xs bg-[#0A0A0A] text-white">
            <option value="">Fonte Padrão Global</option>
            {fonts.map(f => <option key={f.name} value={f.body}>{f.name} (Body)</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Alinhamento do Conteúdo</label>
        <div className="flex gap-4">
          <div className="flex gap-1">
            <button 
              onClick={() => handleChange('alignment', 'left')}
              className={`p-2 border rounded-md ${slide.alignment === 'left' ? 'bg-[rgba(108,99,255,0.1)] border-[#6C63FF] text-[#6C63FF]' : 'bg-[#0A0A0A] border-[rgba(255,255,255,0.1)] text-[rgba(240,240,240,0.6)]'}`}
              title="Esquerda"
            >
              <AlignLeft size={16} />
            </button>
            <button 
              onClick={() => handleChange('alignment', 'center')}
              className={`p-2 border rounded-md ${slide.alignment === 'center' ? 'bg-[rgba(108,99,255,0.1)] border-[#6C63FF] text-[#6C63FF]' : 'bg-[#0A0A0A] border-[rgba(255,255,255,0.1)] text-[rgba(240,240,240,0.6)]'}`}
              title="Centro"
            >
              <AlignCenter size={16} />
            </button>
            <button 
              onClick={() => handleChange('alignment', 'right')}
              className={`p-2 border rounded-md ${slide.alignment === 'right' ? 'bg-[rgba(108,99,255,0.1)] border-[#6C63FF] text-[#6C63FF]' : 'bg-[#0A0A0A] border-[rgba(255,255,255,0.1)] text-[rgba(240,240,240,0.6)]'}`}
              title="Direita"
            >
              <AlignRight size={16} />
            </button>
          </div>
          <div className="flex gap-1">
            <button 
              onClick={() => handleChange('verticalAlignment', 'top')}
              className={`p-2 border rounded-md ${slide.verticalAlignment === 'top' ? 'bg-[rgba(108,99,255,0.1)] border-[#6C63FF] text-[#6C63FF]' : 'bg-[#0A0A0A] border-[rgba(255,255,255,0.1)] text-[rgba(240,240,240,0.6)]'}`}
              title="Topo"
            >
              <ArrowUpToLine size={16} />
            </button>
            <button 
              onClick={() => handleChange('verticalAlignment', 'center')}
              className={`p-2 border rounded-md ${slide.verticalAlignment === 'center' ? 'bg-[rgba(108,99,255,0.1)] border-[#6C63FF] text-[#6C63FF]' : 'bg-[#0A0A0A] border-[rgba(255,255,255,0.1)] text-[rgba(240,240,240,0.6)]'}`}
              title="Meio"
            >
              <AlignVerticalJustifyCenter size={16} />
            </button>
            <button 
              onClick={() => handleChange('verticalAlignment', 'bottom')}
              className={`p-2 border rounded-md ${slide.verticalAlignment === 'bottom' || !slide.verticalAlignment ? 'bg-[rgba(108,99,255,0.1)] border-[#6C63FF] text-[#6C63FF]' : 'bg-[#0A0A0A] border-[rgba(255,255,255,0.1)] text-[rgba(240,240,240,0.6)]'}`}
              title="Base"
            >
              <ArrowDownToLine size={16} />
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* --- IMAGEM DO SLIDE --- */}
      <div className="flex flex-col gap-4 p-4 bg-[#0A0A0A] rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm">
        <h4 className="text-xs font-bold text-[#6C63FF] flex items-center gap-2 uppercase tracking-wider mb-1">
          <ImageIcon size={14} />
          Imagem do Slide
        </h4>
        
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Posição da Imagem</label>
          <select 
            value={slide.imagePosition || 'center'} 
            onChange={(e) => handleChange('imagePosition', e.target.value)}
            className="p-2 border border-[rgba(255,255,255,0.1)] rounded-md text-sm bg-[#161616] text-white"
          >
            <option value="top">No Topo</option>
            <option value="center">No Centro</option>
            <option value="bottom">Na Base</option>
            <option value="background">Como Fundo</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Prompt da Imagem IA (Em Inglês)</label>
          <textarea 
            value={slide.imageDescription || ''} 
            onChange={(e) => handleChange('imageDescription', e.target.value)}
            className="p-2 border border-[rgba(255,255,255,0.1)] rounded-md text-sm min-h-[60px] bg-[#161616] text-white"
            placeholder="Descreva a imagem que deseja gerar..."
          />
        </div>

        {onRegenerateImage && (
          <button
            onClick={handleRegenerate}
            disabled={isGenerating || !slide.imageDescription}
            className="flex items-center justify-center gap-2 w-full py-2 bg-[rgba(108,99,255,0.1)] text-[#6C63FF] rounded-md text-sm font-medium hover:bg-[rgba(108,99,255,0.2)] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isGenerating ? "animate-spin" : ""} />
            {isGenerating ? "Gerando..." : "Gerar Nova Imagem"}
          </button>
        )}

        <div className="flex flex-col gap-1 mt-2">
          <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Imagem do Slide (Manual)</label>
          <div className="flex gap-2 items-center">
            <label className="flex items-center justify-center px-3 py-2 bg-[#161616] border border-[rgba(255,255,255,0.1)] rounded-md cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors text-sm text-white shrink-0">
              <Upload size={14} className="mr-2" />
              Upload
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'imageUrl')} />
            </label>
            <input 
              type="text" 
              value={slide.imageUrl || ''} 
              onChange={(e) => handleChange('imageUrl', e.target.value)}
              className="flex-1 p-2 border border-[rgba(255,255,255,0.1)] rounded-md text-sm bg-[#161616] text-white"
              placeholder="Ou cole a URL..."
            />
          </div>
        </div>

        {slide.imageUrl && slide.imagePosition !== 'background' && (
          <div className="flex flex-col gap-2 p-2 bg-[#161616] rounded border border-[rgba(255,255,255,0.1)] mt-2">
            <label className="text-[10px] font-semibold text-[rgba(240,240,240,0.8)] uppercase">Ajuste da Imagem (Corte/Posição/Zoom)</label>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-[rgba(240,240,240,0.5)]">Zoom ({(slide.imageScale ?? 1).toFixed(2)}x)</label>
              <input type="range" min="0.5" max="3" step="0.1" value={slide.imageScale ?? 1} onChange={(e) => handleChange('imageScale', parseFloat(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-[rgba(240,240,240,0.5)]">Horizontal (Esquerda/Direita)</label>
              <input type="range" min="0" max="100" value={slide.imageOffsetX ?? 50} onChange={(e) => handleChange('imageOffsetX', parseInt(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-[rgba(240,240,240,0.5)]">Vertical (Cima/Baixo)</label>
              <input type="range" min="0" max="100" value={slide.imageOffsetY ?? 50} onChange={(e) => handleChange('imageOffsetY', parseInt(e.target.value))} />
            </div>
          </div>
        )}
      </div>

      {/* --- ELEMENTOS EXTRAS (CTA) --- */}
      <div className="flex flex-col gap-4 p-4 bg-[#0A0A0A] rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm">
        <h4 className="text-xs font-bold text-[#6C63FF] flex items-center gap-2 uppercase tracking-wider mb-1">Elementos Extras (CTA)</h4>

      {slide.type === 'cta' && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Texto do Botão CTA</label>
          <input 
            type="text" 
            value={slide.ctaText || ''} 
            onChange={(e) => handleChange('ctaText', e.target.value)}
            className="p-2 border border-[rgba(255,255,255,0.1)] rounded-md text-sm bg-[#0A0A0A] text-white"
          />
        </div>
      )}
      </div>

      {/* --- CAMADAS LIVRES --- */}
      <div className="flex flex-col gap-4 p-4 bg-[#0A0A0A] rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-xs font-bold text-[#6C63FF] flex items-center gap-2 uppercase tracking-wider">
            <Layers size={14} />
            Camadas Livres
          </h4>
          <button 
            onClick={() => {
              const newLayers = [...(slide.customLayers || [])];
              newLayers.push({
                id: Math.random().toString(36).substr(2, 9),
                type: 'text',
                text: 'Novo Texto',
                x: 50,
                y: 50,
                fontSize: 24,
                fontFamily: fonts[0].heading,
                fontWeight: 600,
                color: '#ffffff',
                zIndex: 10
              });
              handleChange('customLayers', newLayers);
            }}
            className="flex items-center gap-1 text-[10px] bg-[rgba(108,99,255,0.1)] text-[#6C63FF] px-2 py-1 rounded hover:bg-[rgba(108,99,255,0.2)] transition-colors font-bold uppercase tracking-wider"
          >
            <Plus size={12} /> Add Camada
          </button>
        </div>

        {(!slide.customLayers || slide.customLayers.length === 0) && (
          <p className="text-[10px] text-[rgba(240,240,240,0.5)] italic text-center py-2">
            Adicione textos livres no slide que podem ser posicionados e estilizados livremente.
          </p>
        )}

        {[...(slide.customLayers || [])].sort((a, b) => b.zIndex - a.zIndex).map((layer, sortedIdx, sortedArr) => {
          const originalIdx = slide.customLayers!.findIndex(l => l.id === layer.id);
          const isHighest = sortedIdx === 0;
          const isLowest = sortedIdx === sortedArr.length - 1;
          
          return (
          <div 
            key={layer.id} 
            className="flex flex-col gap-3 p-3 bg-[#161616] rounded border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.1)] transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[rgba(240,240,240,0.4)] uppercase">Camada {originalIdx + 1} ({layer.zIndex})</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    if (isHighest) return;
                    const newLayers = [...slide.customLayers!];
                    const aboveLayer = sortedArr[sortedIdx - 1];
                    const aboveOriginalIdx = newLayers.findIndex(l => l.id === aboveLayer.id);
                    
                    const tempZ = newLayers[originalIdx].zIndex;
                    newLayers[originalIdx].zIndex = newLayers[aboveOriginalIdx].zIndex;
                    newLayers[aboveOriginalIdx].zIndex = tempZ;
                    
                    handleChange('customLayers', newLayers);
                  }}
                  className={`text-white hover:text-blue-400 ${isHighest ? 'opacity-30 cursor-not-allowed' : ''}`}
                  title="Trazer para Frente"
                  disabled={isHighest}
                >
                  <ChevronUp size={12} />
                </button>
                <button 
                  onClick={() => {
                    if (isLowest) return;
                    const newLayers = [...slide.customLayers!];
                    const belowLayer = sortedArr[sortedIdx + 1];
                    const belowOriginalIdx = newLayers.findIndex(l => l.id === belowLayer.id);
                    
                    const tempZ = newLayers[originalIdx].zIndex;
                    newLayers[originalIdx].zIndex = newLayers[belowOriginalIdx].zIndex;
                    newLayers[belowOriginalIdx].zIndex = tempZ;
                    
                    handleChange('customLayers', newLayers);
                  }}
                  className={`text-white hover:text-blue-400 ${isLowest ? 'opacity-30 cursor-not-allowed' : ''}`}
                  title="Enviar para Trás"
                  disabled={isLowest}
                >
                  <ChevronDown size={12} />
                </button>
                <button 
                  onClick={() => {
                    const newLayers = [...slide.customLayers!];
                    newLayers.push({
                      ...layer,
                      id: Math.random().toString(36).substr(2, 9),
                      y: layer.y + 5, // slightly offset
                      zIndex: layer.zIndex + 1
                    });
                    handleChange('customLayers', newLayers);
                  }}
                  className="text-white hover:text-blue-400"
                  title="Duplicar Camada"
                >
                  <Copy size={12} />
                </button>
                <button 
                  onClick={() => {
                    const newLayers = slide.customLayers!.filter(l => l.id !== layer.id);
                    handleChange('customLayers', newLayers);
                  }}
                  className="text-red-400 hover:text-red-300"
                  title="Excluir"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            
            <textarea 
              value={layer.text} 
              onChange={(e) => {
                const newLayers = [...slide.customLayers!];
                newLayers[originalIdx] = { ...newLayers[originalIdx], text: e.target.value };
                handleChange('customLayers', newLayers);
              }}
              rows={2}
              className="p-2 border border-[rgba(255,255,255,0.1)] rounded text-xs bg-[#222] text-white focus:outline-none focus:border-[#6C63FF] transition-colors resize-none"
              placeholder="Digite o texto..."
            />

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[rgba(240,240,240,0.6)] font-medium">Fonte</label>
                <select 
                  value={layer.fontFamily} 
                  onChange={(e) => {
                    const newLayers = [...slide.customLayers!];
                    newLayers[originalIdx] = { ...newLayers[originalIdx], fontFamily: e.target.value };
                    handleChange('customLayers', newLayers);
                  }}
                  className="p-1 border border-[rgba(255,255,255,0.1)] rounded text-[10px] bg-[#222] text-white focus:outline-none focus:border-[#6C63FF]"
                >
                  {fonts.flatMap(f => [f.heading, f.body]).filter((v, i, a) => a.indexOf(v) === i).map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[rgba(240,240,240,0.6)] font-medium">Tamanho (px)</label>
                <input 
                  type="number" 
                  value={layer.fontSize} 
                  onChange={(e) => {
                    const newLayers = [...slide.customLayers!];
                    newLayers[originalIdx] = { ...newLayers[originalIdx], fontSize: Number(e.target.value) };
                    handleChange('customLayers', newLayers);
                  }}
                  className="p-1 border border-[rgba(255,255,255,0.1)] rounded text-[10px] bg-[#222] text-white focus:outline-none focus:border-[#6C63FF]"
                />
              </div>
            </div>

            <div className="flex gap-3 items-center bg-[#222] p-2 rounded border border-[rgba(255,255,255,0.05)]">
              <div className="flex flex-col items-center gap-1">
                <label className="text-[9px] text-[rgba(240,240,240,0.5)]">Cor</label>
                <input type="color" value={layer.color} onChange={(e) => {
                    const newLayers = [...slide.customLayers!];
                    newLayers[originalIdx] = { ...newLayers[originalIdx], color: e.target.value };
                    handleChange('customLayers', newLayers);
                  }} className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0 shrink-0" />
              </div>
              
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between">
                  <label className="text-[9px] text-[rgba(240,240,240,0.5)]">Posição X</label>
                  <span className="text-[9px] text-white">{layer.x}%</span>
                </div>
                <input type="range" min="0" max="100" value={layer.x} onChange={(e) => {
                  const newLayers = [...slide.customLayers!];
                  newLayers[originalIdx] = { ...newLayers[originalIdx], x: Number(e.target.value) };
                  handleChange('customLayers', newLayers);
                }} className="accent-[#6C63FF]" />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between">
                  <label className="text-[9px] text-[rgba(240,240,240,0.5)]">Posição Y</label>
                  <span className="text-[9px] text-white">{layer.y}%</span>
                </div>
                <input type="range" min="0" max="100" value={layer.y} onChange={(e) => {
                  const newLayers = [...slide.customLayers!];
                  newLayers[originalIdx] = { ...newLayers[originalIdx], y: Number(e.target.value) };
                  handleChange('customLayers', newLayers);
                }} className="accent-[#6C63FF]" />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[rgba(240,240,240,0.6)] font-medium">Peso (Weight)</label>
                <select 
                  value={layer.fontWeight} 
                  onChange={(e) => {
                    const newLayers = [...slide.customLayers!];
                    newLayers[originalIdx] = { ...newLayers[originalIdx], fontWeight: Number(e.target.value) };
                    handleChange('customLayers', newLayers);
                  }}
                  className="p-1 border border-[rgba(255,255,255,0.1)] rounded text-[10px] bg-[#222] text-white focus:outline-none focus:border-[#6C63FF]"
                >
                  <option value="300">Light (300)</option>
                  <option value="400">Regular (400)</option>
                  <option value="500">Medium (500)</option>
                  <option value="600">SemiBold (600)</option>
                  <option value="700">Bold (700)</option>
                  <option value="800">ExtraBold (800)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[rgba(240,240,240,0.6)] font-medium">Estilo</label>
                <select 
                  value={layer.fontStyle || 'normal'} 
                  onChange={(e) => {
                    const newLayers = [...slide.customLayers!];
                    newLayers[originalIdx] = { ...newLayers[originalIdx], fontStyle: e.target.value };
                    handleChange('customLayers', newLayers);
                  }}
                  className="p-1 border border-[rgba(255,255,255,0.1)] rounded text-[10px] bg-[#222] text-white focus:outline-none focus:border-[#6C63FF]"
                >
                  <option value="normal">Normal</option>
                  <option value="italic">Itálico</option>
                </select>
              </div>
               <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[rgba(240,240,240,0.6)] font-medium">Z-Index</label>
                <input 
                  type="number" 
                  value={layer.zIndex} 
                  onChange={(e) => {
                    const newLayers = [...slide.customLayers!];
                    newLayers[originalIdx] = { ...newLayers[originalIdx], zIndex: Number(e.target.value) };
                    handleChange('customLayers', newLayers);
                  }}
                  className="p-1 border border-[rgba(255,255,255,0.1)] rounded text-[10px] bg-[#222] text-white focus:outline-none focus:border-[#6C63FF]"
                />
              </div>
            </div>

          </div>
          );
        })}
      </div>

      </div>
    </div>
  );
}
