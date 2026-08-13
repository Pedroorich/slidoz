import React, { useState, useRef, useEffect, memo } from 'react';
import { SlideData, refineSlideText } from '../lib/gemini';
import { AlignLeft, AlignCenter, AlignRight, RefreshCw, Image as ImageIcon, ArrowUpToLine, ArrowDownToLine, AlignVerticalJustifyCenter, Upload, Plus, Trash2, Layers, Copy, ChevronDown, ChevronUp, LayoutGrid, Palette, Type, Highlighter, Sparkles, Wand2, Zap, Flame, Lightbulb } from 'lucide-react';

function AiTextRefiner({
  text,
  field,
  onApply
}: {
  text: string;
  field: 'title' | 'content';
  onApply: (newText: string) => void;
}) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleRefine = async (action: 'shorten' | 'provocative' | 'analogy' | 'simplify') => {
    if (!text || !text.trim()) return;
    setLoadingAction(action);
    try {
      const cleanText = text.replace(/<[^>]*>/g, '');
      const refined = await refineSlideText(cleanText, action, field);
      if (refined) {
        onApply(refined);
      }
    } catch (e) {
      console.error("Falha ao refinar com IA:", e);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap pt-0.5 pb-1">
      <span className="text-[9px] font-bold text-[#6C63FF] uppercase tracking-wider flex items-center gap-1 shrink-0">
        <Sparkles size={10} /> Copilot IA:
      </span>
      <button
        type="button"
        disabled={!!loadingAction || !text.trim()}
        onClick={() => handleRefine('shorten')}
        className="px-2 py-0.5 rounded bg-[rgba(108,99,255,0.08)] hover:bg-[rgba(108,99,255,0.18)] border border-[rgba(108,99,255,0.2)] text-[10px] text-white flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
        title="Encurtar mantendo o impacto"
      >
        {loadingAction === 'shorten' ? <RefreshCw size={10} className="animate-spin text-[#6C63FF]" /> : <Zap size={10} className="text-amber-400" />}
        <span>Encurtar</span>
      </button>
      <button
        type="button"
        disabled={!!loadingAction || !text.trim()}
        onClick={() => handleRefine('provocative')}
        className="px-2 py-0.5 rounded bg-[rgba(255,99,132,0.08)] hover:bg-[rgba(255,99,132,0.18)] border border-[rgba(255,99,132,0.2)] text-[10px] text-white flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
        title="Tornar mais provocativo e forte"
      >
        {loadingAction === 'provocative' ? <RefreshCw size={10} className="animate-spin text-pink-400" /> : <Flame size={10} className="text-pink-400" />}
        <span>Provocativo</span>
      </button>
      <button
        type="button"
        disabled={!!loadingAction || !text.trim()}
        onClick={() => handleRefine('analogy')}
        className="px-2 py-0.5 rounded bg-[rgba(56,189,248,0.08)] hover:bg-[rgba(56,189,248,0.18)] border border-[rgba(56,189,248,0.2)] text-[10px] text-white flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
        title="Criar analogia simples da vida real"
      >
        {loadingAction === 'analogy' ? <RefreshCw size={10} className="animate-spin text-cyan-400" /> : <Lightbulb size={10} className="text-cyan-400" />}
        <span>Analogia</span>
      </button>
      <button
        type="button"
        disabled={!!loadingAction || !text.trim()}
        onClick={() => handleRefine('simplify')}
        className="px-2 py-0.5 rounded bg-[rgba(52,211,153,0.08)] hover:bg-[rgba(52,211,153,0.18)] border border-[rgba(52,211,153,0.2)] text-[10px] text-white flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
        title="Simplificar vocabulário"
      >
        {loadingAction === 'simplify' ? <RefreshCw size={10} className="animate-spin text-emerald-400" /> : <Wand2 size={10} className="text-emerald-400" />}
        <span>Simplificar</span>
      </button>
    </div>
  );
}

function RichTextEditor({ value, onChange, fonts }: { value: string, onChange: (val: string) => void, fonts: any[] }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<number | null>(null);
  const internalValue = useRef<string>(value);
  const lastSentValue = useRef<string>(value);
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value || '';
    }
  }, []);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      if (value !== lastSentValue.current && value !== undefined) {
        editorRef.current.innerHTML = value || '';
        internalValue.current = value || '';
        lastSentValue.current = value || '';
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
        lastSentValue.current = html;
        onChange(html);
      }, 400);
    }
  };

  const applyHighlight = () => {
    if (savedRange.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange.current);
    }
    
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    
    let parent = range.commonAncestorContainer;
    if (parent.nodeType === 3) {
      parent = parent.parentNode!;
    }
    
    const parentElement = parent as HTMLElement;
    if (parentElement && parentElement.tagName === 'SPAN' && parentElement.style.background && parentElement.style.background.includes('linear-gradient')) {
      const textNode = document.createTextNode(parentElement.textContent || '');
      parentElement.parentNode?.replaceChild(textNode, parentElement);
    } else {
      const span = document.createElement('span');
      span.style.background = 'linear-gradient(90deg, #FF7A00 0%, #FF00A8 100%)';
      span.style.color = '#FFFFFF';
      span.style.padding = '2px 8px';
      span.style.borderRadius = '4px';
      span.style.display = 'inline-block';
      span.style.margin = '2px';
      span.style.boxDecorationBreak = 'clone';
      span.style.setProperty('-webkit-box-decoration-break', 'clone');
      
      try {
        const content = range.extractContents();
        span.appendChild(content);
        range.insertNode(span);
      } catch (e) {
        console.error(e);
      }
    }
    
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleInput();
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

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
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
        <button onClick={applyHighlight} onMouseDown={e => e.preventDefault()} className="px-2 py-1 text-xs hover:bg-[rgba(255,255,255,0.1)] text-white rounded flex items-center justify-center" title="Destacar com caixa degradê">
          <Highlighter size={12} className="text-orange-400" />
        </button>
      </div>
      <div 
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        onPaste={handlePaste}
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

export const SlideEditor = memo(function SlideEditor({ slide, prevSlide, onChange, onChangePrev, onRegenerateImage, fonts }: SlideEditorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTitleAdvanced, setShowTitleAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'style' | 'text' | 'image' | 'extras'>('style');

  const isFrasesLayout = slide.layoutModel === 'frases';

  useEffect(() => {
    if (isFrasesLayout && (activeTab as string === 'text' || activeTab as string === 'image')) {
      setActiveTab('style');
    }
  }, [isFrasesLayout, activeTab]);

  const handleChange = (field: keyof SlideData, value: any) => {
    onChange({ ...slide, [field]: value });
  };

  const handleLayoutModelChange = (newLayout: string) => {
    const updated = { ...slide, layoutModel: newLayout as any };
    
    if (newLayout === 'antes_depois') {
      if (!updated.antesTitle) updated.antesTitle = slide.title ? slide.title.replace(/<[^>]*>/g, '') : 'Estado de Dor';
      if (!updated.antesContent) updated.antesContent = slide.content ? slide.content.replace(/<[^>]*>/g, '') : 'Descrição do estado anterior.';
      if (!updated.depoisTitle) updated.depoisTitle = 'Estado de Alívio';
      if (!updated.depoisContent) updated.depoisContent = 'Descrição do estado transformado.';
    }
    else if (newLayout === 'dado_contexto') {
      if (!updated.bigNumber) updated.bigNumber = '85%';
      if (!updated.contextLine) updated.contextLine = slide.title ? slide.title.replace(/<[^>]*>/g, '') : 'Contexto do Dado';
      if (!updated.implicationLine) updated.implicationLine = slide.content ? slide.content.replace(/<[^>]*>/g, '') : 'Por que esse número é importante...';
      if (!updated.sourceLine) updated.sourceLine = 'Fonte: SlidOZ';
    }
    else if (newLayout === 'checklist') {
      if (!updated.checklistType) updated.checklistType = 'positive';
      if (!updated.items || updated.items.length === 0) {
        updated.items = [
          { icon: '✓', label: 'Item de Checklist 1', description: 'Explicação detalhada...' },
          { icon: '✓', label: 'Item de Checklist 2', description: 'Explicação detalhada...' },
          { icon: '✓', label: 'Item de Checklist 3', description: 'Explicação detalhada...' }
        ];
      }
    }
    else if (newLayout === 'ranking') {
      if (!updated.items || updated.items.length === 0) {
        updated.items = [
          { label: 'Pilar Principal', description: 'Este é o pilar ou prioridade mais importante.' },
          { label: 'Pilar Secundário', description: 'Fator complementar relevante.' },
          { label: 'Pilar de Apoio', description: 'Outro detalhe necessário.' }
        ];
      }
    }
    else if (newLayout === 'passo_a_passo') {
      if (!updated.items || updated.items.length === 0) {
        updated.items = [
          { label: 'Passo Inicial', description: 'Preparação do ambiente e ferramentas.' },
          { label: 'Execução Prática', description: 'Desenvolvimento das micro-tarefas.' },
          { label: 'Análise e Ajuste', description: 'Revisão do progresso final.' }
        ];
      }
    }
    else if (newLayout === 'timeline') {
      if (!updated.items || updated.items.length === 0) {
        updated.items = [
          { date: 'Semana 1', label: 'Fundamentos', description: 'Estudo teórico inicial.' },
          { date: 'Semana 2', label: 'Construção', description: 'Projetos práticos simples.' },
          { date: 'Semana 4', label: 'Autonomia', description: 'Execução sem assistência.' }
        ];
      }
    }
    else if (newLayout === 'depoimento') {
      if (!updated.testimonialName) updated.testimonialName = 'Mariana Costa';
      if (!updated.testimonialRole) updated.testimonialRole = 'Product Designer';
    }
    else if (newLayout === 'citacao_especialista') {
      if (!updated.expertName) updated.expertName = 'Dr. Thiago Medeiros';
      if (!updated.expertRole) updated.expertRole = 'Neurocientista';
    }
    else if (newLayout === 'comparativo') {
      if (!updated.comparisonOptionA) updated.comparisonOptionA = 'Opção A';
      if (!updated.comparisonOptionB) updated.comparisonOptionB = 'Opção B';
      if (!updated.comparisonWinner) updated.comparisonWinner = 'B';
      if (!updated.comparisonVerdict) updated.comparisonVerdict = 'Opção B é 3x mais barata';
      if (!updated.comparisonRows || updated.comparisonRows.length === 0) {
        updated.comparisonRows = [
          { label: 'Rapidez', valueA: 'no', valueB: 'yes' },
          { label: 'Facilidade', valueA: 'yes', valueB: 'yes' },
          { label: 'Custo-benefício', valueA: 'no', valueB: 'yes' }
        ];
      }
    }

    onChange(updated);
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
    <div className="flex flex-col gap-4 p-4 bg-[#161616] border border-[rgba(255,255,255,0.06)] rounded-xl shadow-sm text-white select-none">
      <h3 className="font-semibold text-base border-b border-[rgba(255,255,255,0.1)] pb-2.5 shrink-0 flex items-center justify-between">
        <span>Editar Slide</span>
        <span className="text-[10px] font-bold px-2 py-0.5 bg-[rgba(255,255,255,0.08)] rounded text-gray-400 capitalize">
          {activeTab === 'style' ? (isFrasesLayout ? 'Imagem' : 'Fundo') : activeTab}
        </span>
      </h3>

      {/* Seletor de Modelo de Layout no topo */}
      <div className="flex flex-col gap-1.5 shrink-0">
        <label className="text-[10px] font-semibold text-[rgba(240,240,240,0.5)] uppercase">Modelo do Slide</label>
        <select 
          value={slide.layoutModel || 'default'} 
          onChange={(e) => handleLayoutModelChange(e.target.value)}
          className="p-2 border border-[rgba(255,255,255,0.1)] rounded-md text-xs bg-[#0A0A0A] text-white focus:border-[#6C63FF] outline-none"
        >
          <option value="default">Padrão SlidOZ</option>
          <option value="forbes">Estilo Forbes (Aspas Elegantes)</option>
          <option value="twitter">Estilo Twitter (Tweet Card)</option>
          <option value="frases">Estilo Frases (Minimalista)</option>
          <option value="ranking">Módulo 4: Ranking / Top N</option>
          <option value="antes_depois">Módulo 5: Antes vs Depois</option>
          <option value="dado_contexto">Módulo 6: Dado + Contexto</option>
          <option value="checklist">Módulo 7: Checklist</option>
          <option value="depoimento">Módulo 8: Depoimento</option>
          <option value="passo_a_passo">Módulo 9: Tutorial Passo a Passo</option>
          <option value="comparativo">Módulo 10: Comparativo de Opções</option>
          <option value="citacao_especialista">Módulo 11: Citação de Especialista</option>
          <option value="problema">Módulo 12 (Tela 1): Problema</option>
          <option value="solucao">Módulo 12 (Tela 2): Solução</option>
          <option value="timeline">Módulo 13: Linha do Tempo</option>
        </select>
      </div>

      {/* Abas de Ícones de Personalização */}
      <div className="flex justify-between border-b border-[rgba(255,255,255,0.05)] pb-3 mb-1 shrink-0 gap-1">
        <button 
          onClick={() => setActiveTab('style')} 
          className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all ${activeTab === 'style' ? 'text-[#6C63FF] bg-[rgba(108,99,255,0.08)] font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          title={isFrasesLayout ? "Ajustes de Imagem" : "Fundo e Cores"}
        >
          <Palette size={18} />
          <span className="text-[9px] tracking-wide">{isFrasesLayout ? "Imagem" : "Fundo"}</span>
        </button>
        {!isFrasesLayout && (
          <>
            <button 
              onClick={() => setActiveTab('text')} 
              className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all ${activeTab === 'text' ? 'text-[#6C63FF] bg-[rgba(108,99,255,0.08)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              title="Textos e Alinhamento"
            >
              <Type size={18} />
              <span className="text-[9px] tracking-wide">Textos</span>
            </button>
            <button 
              onClick={() => setActiveTab('image')} 
              className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all ${activeTab === 'image' ? 'text-[#6C63FF] bg-[rgba(108,99,255,0.08)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              title="Imagens do Slide"
            >
              <ImageIcon size={18} />
              <span className="text-[9px] tracking-wide">Imagens</span>
            </button>
          </>
        )}
        <button 
          onClick={() => setActiveTab('extras')} 
          className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all ${activeTab === 'extras' ? 'text-[#6C63FF] bg-[rgba(108,99,255,0.08)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          title={isFrasesLayout ? "Camadas de Texto" : "Extras e Camadas"}
        >
          <Layers size={18} />
          <span className="text-[9px] tracking-wide">{isFrasesLayout ? "Camadas" : "Extras"}</span>
        </button>
      </div>
      
      <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1 pb-4" style={{ maxHeight: 'calc(100vh - 310px)' }}>

        {/* --- TAB 2: FUNDO E CORES (IMAGEM) --- */}
        {activeTab === 'style' && (
          <div className="flex flex-col gap-4 p-3.5 bg-[#0A0A0A] rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm animate-fade-in">
            <h4 className="text-xs font-bold text-[#6C63FF] uppercase tracking-wider mb-1">
              {isFrasesLayout ? "Imagem de Fundo" : "Fundo e Cores"}
            </h4>
            
            {isFrasesLayout ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Prompt da Imagem IA (Em Inglês)</label>
                  <textarea 
                    value={slide.imageDescription || ''} 
                    onChange={(e) => handleChange('imageDescription', e.target.value)}
                    className="p-2 border border-[rgba(255,255,255,0.1)] rounded-md text-sm min-h-[60px] bg-[#161616] text-white focus:border-[#6C63FF] outline-none"
                    placeholder="Descreva o cenário da imagem que deseja gerar..."
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

                <div className="flex flex-col gap-1">
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
              </div>
            ) : (
              <>
                {slide.layoutModel === 'twitter' ? (
                  <div className="flex flex-col gap-1.5 p-2 bg-[#161616]/40 rounded-lg border border-[rgba(255,255,255,0.05)]">
                    <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Opção de Cor do Twitter</label>
                    <select 
                      value={slide.background === 'light' ? 'light' : 'dark'} 
                      onChange={(e) => handleChange('background', e.target.value)}
                      className="p-2 border border-[rgba(255,255,255,0.1)] rounded-md text-sm bg-[#0A0A0A] text-white"
                    >
                      <option value="light">Claro (Tema Branco)</option>
                      <option value="dark">Escuro (Tema Azul Noturno)</option>
                    </select>
                    <p className="text-[10px] text-gray-500 mt-1">Este modelo altera as cores do texto e bordas automaticamente para simular a rede social.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Fundo</label>
                    <select 
                      value={slide.background} 
                      onChange={(e) => handleChange('background', e.target.value)}
                      className="p-2 border border-[rgba(255,255,255,0.1)] rounded-md text-sm bg-[#161616] text-white"
                    >
                      <option value="light">Claro</option>
                      <option value="dark">Escuro</option>
                      <option value="brand-gradient">Gradiente da Marca</option>
                    </select>
                  </div>
                )}

                {slide.layoutModel === 'forbes' && (
                  <div className="flex flex-col gap-1.5 mt-2">
                    <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Cor das Aspas</label>
                    <div className="flex items-center gap-2 bg-[#161616] border border-[rgba(255,255,255,0.1)] rounded p-1">
                      <div className="relative w-5 h-5 rounded overflow-hidden shrink-0">
                        <input 
                          type="color" 
                          value={slide.forbesQuoteColor || '#F9D30B'} 
                          onChange={(e) => handleChange('forbesQuoteColor', e.target.value)}
                          className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer"
                        />
                      </div>
                      <input 
                        type="text" 
                        value={slide.forbesQuoteColor || '#F9D30B'} 
                        onChange={(e) => handleChange('forbesQuoteColor', e.target.value)}
                        className="w-full bg-transparent text-[11px] text-white uppercase outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1 mt-2">
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
                        className="w-4 h-4 text-[#6C63FF] rounded border-[rgba(255,255,255,0.1)] bg-[#161616]"
                      />
                      <span className="text-sm text-[rgba(240,240,240,0.8)]">Sim (Carrossel Infinito)</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 mt-2">
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
                      className="flex-1 p-2 border border-[rgba(255,255,255,0.1)] rounded-md text-sm bg-[#161616] text-white"
                      placeholder="Ou cole a URL..."
                    />
                  </div>
                </div>
              </>
            )}

            {!isFrasesLayout && (activeBgSlide.backgroundImage || activeBgSlide.imageUrl) && (
              <div className={`flex flex-col gap-3 p-3 rounded-lg border ${isExtendedFromPrev ? 'bg-[rgba(108,99,255,0.05)] border-[rgba(108,99,255,0.2)]' : 'bg-[#161616]/50 border-[rgba(255,255,255,0.06)]'}`}>
                <label className={`text-xs font-semibold uppercase flex items-center gap-2 ${isExtendedFromPrev ? 'text-[#6C63FF]' : 'text-[rgba(240,240,240,0.8)]'}`}>
                  {isExtendedFromPrev ? <ImageIcon size={14} /> : null}
                  Ajuste da Imagem
                </label>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[rgba(240,240,240,0.5)]">Horizontal (Esquerda/Direita)</label>
                  <input type="range" min="0" max="100" value={activeBgSlide.bgImageOffsetX ?? 50} onChange={(e) => handleBgChange('bgImageOffsetX', parseInt(e.target.value))} className="accent-[#6C63FF]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[rgba(240,240,240,0.5)]">Vertical (Cima/Baixo)</label>
                  <input type="range" min="0" max="100" value={activeBgSlide.bgImageOffsetY ?? 50} onChange={(e) => handleBgChange('bgImageOffsetY', parseInt(e.target.value))} className="accent-[#6C63FF]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[rgba(240,240,240,0.5)]">Opacidade da Imagem ({(activeBgSlide.bgImageOpacity ?? 1).toFixed(2)})</label>
                  <input type="range" min="0" max="1" step="0.05" value={activeBgSlide.bgImageOpacity ?? 1} onChange={(e) => handleBgChange('bgImageOpacity', parseFloat(e.target.value))} className="accent-[#6C63FF]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[rgba(240,240,240,0.5)]">Zoom / Escala da Imagem ({(activeBgSlide.bgImageScale ?? 1).toFixed(2)}x)</label>
                  <input type="range" min="0.5" max="3" step="0.05" value={activeBgSlide.bgImageScale ?? 1} onChange={(e) => handleBgChange('bgImageScale', parseFloat(e.target.value))} className="accent-[#6C63FF]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[rgba(240,240,240,0.5)]">Opacidade do Degradê ({(slide.bgGradientOpacity ?? 0.8).toFixed(2)})</label>
                  <input type="range" min="0" max="1" step="0.05" value={slide.bgGradientOpacity ?? 0.8} onChange={(e) => handleChange('bgGradientOpacity', parseFloat(e.target.value))} className="accent-[#6C63FF]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[rgba(240,240,240,0.5)]">Posição do Degradê</label>
                  <select 
                    value={slide.bgGradientPosition || 'bottom'} 
                    onChange={(e) => handleChange('bgGradientPosition', e.target.value)}
                    className="p-1 border border-[rgba(255,255,255,0.1)] rounded-md text-xs bg-[#0A0A0A] text-white"
                  >
                    <option value="bottom">Embaixo (Escurece a base)</option>
                    <option value="top">Em Cima (Escurece o topo)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: TEXTOS E ALINHAMENTO --- */}
        {activeTab === 'text' && (
          <div className="flex flex-col gap-4 p-3.5 bg-[#0A0A0A] rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm animate-fade-in">
            <h4 className="text-xs font-bold text-[#6C63FF] uppercase tracking-wider mb-1">Textos e Alinhamento</h4>

            {/* Campos Dinâmicos do Layout */}
            {slide.layoutModel === 'antes_depois' && (
              <div className="flex flex-col gap-3 p-3 bg-[#161616]/40 rounded-lg border border-white/5">
                <span className="text-xs font-bold text-gray-400 uppercase">Antes vs Depois</span>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 uppercase">Título Antes</label>
                  <input type="text" value={slide.antesTitle || ''} onChange={(e) => handleChange('antesTitle', e.target.value)} className="p-2 border border-white/10 rounded bg-[#0A0A0A] text-sm text-white" placeholder="ex: Estado de Dor" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 uppercase">Conteúdo Antes</label>
                  <textarea value={slide.antesContent || ''} onChange={(e) => handleChange('antesContent', e.target.value)} className="p-2 border border-white/10 rounded bg-[#0A0A0A] text-sm text-white min-h-[50px]" placeholder="Descrição..." />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 uppercase">Título Depois</label>
                  <input type="text" value={slide.depoisTitle || ''} onChange={(e) => handleChange('depoisTitle', e.target.value)} className="p-2 border border-white/10 rounded bg-[#0A0A0A] text-sm text-white" placeholder="ex: Estado de Alívio" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 uppercase">Conteúdo Depois</label>
                  <textarea value={slide.depoisContent || ''} onChange={(e) => handleChange('depoisContent', e.target.value)} className="p-2 border border-white/10 rounded bg-[#0A0A0A] text-sm text-white min-h-[50px]" placeholder="Descrição..." />
                </div>
              </div>
            )}

            {slide.layoutModel === 'dado_contexto' && (
              <div className="flex flex-col gap-3 p-3 bg-[#161616]/40 rounded-lg border border-white/5">
                <span className="text-xs font-bold text-gray-400 uppercase">Dado + Contexto</span>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 uppercase">Número / Dado Gigante</label>
                  <input type="text" value={slide.bigNumber || ''} onChange={(e) => handleChange('bigNumber', e.target.value)} className="p-2 border border-white/10 rounded bg-[#0A0A0A] text-sm text-white" placeholder="ex: 85% ou $10k" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 uppercase">Linha de Contexto</label>
                  <input type="text" value={slide.contextLine || ''} onChange={(e) => handleChange('contextLine', e.target.value)} className="p-2 border border-white/10 rounded bg-[#0A0A0A] text-sm text-white" placeholder="O que o número significa..." />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 uppercase">Linha de Implicação</label>
                  <textarea value={slide.implicationLine || ''} onChange={(e) => handleChange('implicationLine', e.target.value)} className="p-2 border border-white/10 rounded bg-[#0A0A0A] text-sm text-white min-h-[50px]" placeholder="Por que isso importa..." />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 uppercase">Fonte</label>
                  <input type="text" value={slide.sourceLine || ''} onChange={(e) => handleChange('sourceLine', e.target.value)} className="p-2 border border-white/10 rounded bg-[#0A0A0A] text-sm text-white" placeholder="ex: Fonte: IBGE" />
                </div>
              </div>
            )}

            {slide.layoutModel === 'checklist' && (
              <div className="flex flex-col gap-3 p-3 bg-[#161616]/40 rounded-lg border border-white/5">
                <span className="text-xs font-bold text-gray-400 uppercase">Configurações do Checklist</span>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 uppercase">Tipo do Checklist</label>
                  <select value={slide.checklistType || 'positive'} onChange={(e) => handleChange('checklistType', e.target.value)} className="p-2 border border-white/10 rounded bg-[#0A0A0A] text-sm text-white">
                    <option value="positive">Recomendado / Certo (✓ Verde)</option>
                    <option value="negative">Não Recomendado / Errado (✕ Vermelho)</option>
                  </select>
                </div>
              </div>
            )}

            {['default', 'ranking', 'checklist', 'passo_a_passo', 'timeline'].includes(slide.layoutModel || 'default') && (
              <div className="flex flex-col gap-3 p-3 bg-[#161616]/40 rounded-lg border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase">Lista de Itens ({slide.items?.length || 0})</span>
                  <button 
                    onClick={() => {
                      const newItems = [...(slide.items || [])];
                      newItems.push({
                        icon: slide.layoutModel === 'checklist' ? (slide.checklistType === 'negative' ? '✕' : '✓') : '✨',
                        label: 'Novo Item',
                        description: 'Descrição do item...',
                        date: slide.layoutModel === 'timeline' ? 'Fase 1' : undefined
                      });
                      handleChange('items', newItems);
                    }}
                    className="flex items-center gap-1 text-[10px] bg-[rgba(108,99,255,0.1)] text-[#6C63FF] px-2 py-1 rounded hover:bg-[rgba(108,99,255,0.2)] transition-colors font-bold uppercase tracking-wider"
                  >
                    <Plus size={10} /> Adicionar
                  </button>
                </div>
                <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {(slide.items || []).map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-2 p-2 bg-[#0A0A0A]/60 rounded border border-white/5 relative">
                      <div className="flex justify-between items-center pr-6">
                        <span className="text-[9px] font-bold text-gray-500 uppercase">Item #{idx + 1}</span>
                        <div className="flex gap-1">
                          <button 
                            disabled={idx === 0}
                            onClick={() => {
                              const newItems = [...(slide.items || [])];
                              const temp = newItems[idx];
                              newItems[idx] = newItems[idx - 1];
                              newItems[idx - 1] = temp;
                              handleChange('items', newItems);
                            }}
                            className="text-gray-400 hover:text-white disabled:opacity-30"
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button 
                            disabled={idx === (slide.items || []).length - 1}
                            onClick={() => {
                              const newItems = [...(slide.items || [])];
                              const temp = newItems[idx];
                              newItems[idx] = newItems[idx + 1];
                              newItems[idx + 1] = temp;
                              handleChange('items', newItems);
                            }}
                            className="text-gray-400 hover:text-white disabled:opacity-30"
                          >
                            <ChevronDown size={12} />
                          </button>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const newItems = (slide.items || []).filter((_, i) => i !== idx);
                          handleChange('items', newItems);
                        }}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-400"
                        title="Excluir Item"
                      >
                        <Trash2 size={12} />
                      </button>
                      
                      {slide.layoutModel === 'timeline' && (
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] text-gray-500 uppercase">Data/Legenda</label>
                          <input 
                            type="text" 
                            value={item.date || ''} 
                            onChange={(e) => {
                              const newItems = [...(slide.items || [])];
                              newItems[idx] = { ...newItems[idx], date: e.target.value };
                              handleChange('items', newItems);
                            }}
                            className="p-1 border border-white/10 rounded bg-[#161616] text-xs text-white" 
                            placeholder="ex: Semana 1 ou Ano 2026"
                          />
                        </div>
                      )}

                      {slide.layoutModel !== 'checklist' && (
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] text-gray-500 uppercase">Ícone / Emoji</label>
                          <input 
                            type="text" 
                            value={item.icon || ''} 
                            onChange={(e) => {
                              const newItems = [...(slide.items || [])];
                              newItems[idx] = { ...newItems[idx], icon: e.target.value };
                              handleChange('items', newItems);
                            }}
                            className="p-1 border border-white/10 rounded bg-[#161616] text-xs text-white" 
                            placeholder="ex: ✨ ou 🚀"
                          />
                        </div>
                      )}
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-gray-500 uppercase">Título do Item</label>
                        <input 
                          type="text" 
                          value={item.label || ''} 
                          onChange={(e) => {
                            const newItems = [...(slide.items || [])];
                            newItems[idx] = { ...newItems[idx], label: e.target.value };
                            handleChange('items', newItems);
                          }}
                          className="p-1 border border-white/10 rounded bg-[#161616] text-xs text-white" 
                          placeholder="Título do item..."
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-gray-500 uppercase">Descrição (Opcional)</label>
                        <textarea 
                          value={item.description || ''} 
                          onChange={(e) => {
                            const newItems = [...(slide.items || [])];
                            newItems[idx] = { ...newItems[idx], description: e.target.value };
                            handleChange('items', newItems);
                          }}
                          className="p-1 border border-white/10 rounded bg-[#161616] text-xs text-white min-h-[40px]" 
                          placeholder="Descrição do item..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {slide.layoutModel === 'depoimento' && (
              <div className="flex flex-col gap-3 p-3 bg-[#161616]/40 rounded-lg border border-white/5">
                <span className="text-xs font-bold text-gray-400 uppercase">Dados do Depoimento</span>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 uppercase">Nome da Pessoa</label>
                  <input type="text" value={slide.testimonialName || ''} onChange={(e) => handleChange('testimonialName', e.target.value)} className="p-2 border border-white/10 rounded bg-[#0A0A0A] text-sm text-white" placeholder="Nome Completo" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 uppercase">Cargo / Credencial</label>
                  <input type="text" value={slide.testimonialRole || ''} onChange={(e) => handleChange('testimonialRole', e.target.value)} className="p-2 border border-white/10 rounded bg-[#0A0A0A] text-sm text-white" placeholder="ex: CEO da TechCorp" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 uppercase">URL da Foto</label>
                  <input type="text" value={slide.testimonialPhoto || ''} onChange={(e) => handleChange('testimonialPhoto', e.target.value)} className="p-2 border border-white/10 rounded bg-[#0A0A0A] text-sm text-white" placeholder="URL da imagem..." />
                </div>
              </div>
            )}

            {slide.layoutModel === 'comparativo' && (
              <div className="flex flex-col gap-3 p-3 bg-[#161616]/40 rounded-lg border border-white/5">
                <span className="text-xs font-bold text-gray-400 uppercase">Configurações de Comparativo</span>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 uppercase">Nome da Opção A</label>
                  <input type="text" value={slide.comparisonOptionA || ''} onChange={(e) => handleChange('comparisonOptionA', e.target.value)} className="p-2 border border-white/10 rounded bg-[#0A0A0A] text-sm text-white" placeholder="Opção A" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 uppercase">Nome da Opção B</label>
                  <input type="text" value={slide.comparisonOptionB || ''} onChange={(e) => handleChange('comparisonOptionB', e.target.value)} className="p-2 border border-white/10 rounded bg-[#0A0A0A] text-sm text-white" placeholder="Opção B" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 uppercase">Vencedor</label>
                  <select value={slide.comparisonWinner || 'none'} onChange={(e) => handleChange('comparisonWinner', e.target.value)} className="p-2 border border-white/10 rounded bg-[#0A0A0A] text-sm text-white">
                    <option value="none">Empate / Nenhum</option>
                    <option value="A">Opção A Vence</option>
                    <option value="B">Opção B Vence</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 uppercase">Veredito final</label>
                  <input type="text" value={slide.comparisonVerdict || ''} onChange={(e) => handleChange('comparisonVerdict', e.target.value)} className="p-2 border border-white/10 rounded bg-[#0A0A0A] text-sm text-white" placeholder="ex: Opção A é 3x mais barata" />
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Linhas de Comparação ({slide.comparisonRows?.length || 0})</span>
                  <button 
                    onClick={() => {
                      const newRows = [...(slide.comparisonRows || [])];
                      newRows.push({
                        label: 'Critério',
                        valueA: 'yes',
                        valueB: 'no'
                      });
                      handleChange('comparisonRows', newRows);
                    }}
                    className="flex items-center gap-1 text-[9px] bg-[rgba(108,99,255,0.1)] text-[#6C63FF] px-2 py-1 rounded hover:bg-[rgba(108,99,255,0.2)] transition-colors font-bold uppercase tracking-wider"
                  >
                    <Plus size={10} /> Adicionar
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {(slide.comparisonRows || []).map((row, idx) => (
                    <div key={idx} className="flex flex-col gap-1.5 p-2 bg-[#0A0A0A]/60 rounded border border-white/5 relative">
                      <button 
                        onClick={() => {
                          const newRows = (slide.comparisonRows || []).filter((_, i) => i !== idx);
                          handleChange('comparisonRows', newRows);
                        }}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-400"
                        title="Excluir Linha"
                      >
                        <Trash2 size={12} />
                      </button>
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-gray-500 uppercase">Critério</label>
                        <input 
                          type="text" 
                          value={row.label || ''} 
                          onChange={(e) => {
                            const newRows = [...(slide.comparisonRows || [])];
                            newRows[idx] = { ...newRows[idx], label: e.target.value };
                            handleChange('comparisonRows', newRows);
                          }}
                          className="p-1 border border-white/10 rounded bg-[#161616] text-xs text-white" 
                          placeholder="ex: Preço"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] text-gray-500 uppercase">Opção A</label>
                          <select 
                            value={row.valueA} 
                            onChange={(e) => {
                              const newRows = [...(slide.comparisonRows || [])];
                              newRows[idx] = { ...newRows[idx], valueA: e.target.value as any };
                              handleChange('comparisonRows', newRows);
                            }}
                            className="p-1 border border-white/10 rounded bg-[#161616] text-[10px] text-white"
                          >
                            <option value="yes">✓ Sim</option>
                            <option value="no">✕ Não</option>
                            <option value="maybe">~ Talvez</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] text-gray-500 uppercase">Opção B</label>
                          <select 
                            value={row.valueB} 
                            onChange={(e) => {
                              const newRows = [...(slide.comparisonRows || [])];
                              newRows[idx] = { ...newRows[idx], valueB: e.target.value as any };
                              handleChange('comparisonRows', newRows);
                            }}
                            className="p-1 border border-white/10 rounded bg-[#161616] text-[10px] text-white"
                          >
                            <option value="yes">✓ Sim</option>
                            <option value="no">✕ Não</option>
                            <option value="maybe">~ Talvez</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {slide.layoutModel === 'citacao_especialista' && (
              <div className="flex flex-col gap-3 p-3 bg-[#161616]/40 rounded-lg border border-white/5">
                <span className="text-xs font-bold text-gray-400 uppercase">Dados do Especialista</span>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 uppercase">Nome do Especialista</label>
                  <input type="text" value={slide.expertName || ''} onChange={(e) => handleChange('expertName', e.target.value)} className="p-2 border border-white/10 rounded bg-[#0A0A0A] text-sm text-white" placeholder="Nome do Especialista" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 uppercase">Cargo / Credencial</label>
                  <input type="text" value={slide.expertRole || ''} onChange={(e) => handleChange('expertRole', e.target.value)} className="p-2 border border-white/10 rounded bg-[#0A0A0A] text-sm text-white" placeholder="ex: PhD em Neurociência" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 uppercase">Foto do Especialista</label>
                  <input type="text" value={slide.expertPhoto || ''} onChange={(e) => handleChange('expertPhoto', e.target.value)} className="p-2 border border-white/10 rounded bg-[#0A0A0A] text-sm text-white" placeholder="URL da foto..." />
                </div>
              </div>
            )}

            {slide.layoutModel !== 'twitter' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Tag (Opcional)</label>
                <input 
                  type="text" 
                  value={slide.tag || ''} 
                  onChange={(e) => handleChange('tag', e.target.value)}
                  className="p-2 border border-[rgba(255,255,255,0.1)] rounded-md text-sm bg-[#161616] text-white"
                  placeholder="ex: DICAS"
                />
              </div>
            )}

            <div className="flex flex-col gap-1" key={`${slide.id}-title-container`}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Título</label>
              </div>
              <AiTextRefiner 
                text={slide.title || ''} 
                field="title" 
                onApply={(newText) => handleChange('title', newText)} 
              />
              <RichTextEditor 
                value={slide.title} 
                onChange={(val) => handleChange('title', val)} 
                fonts={fonts} 
              />
              <div className="flex gap-2 mt-1">
                <input type="color" value={slide.titleColor || '#ffffff'} onChange={(e) => handleChange('titleColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0 shrink-0" title="Cor Padrão do Título" />
                <select value={slide.titleFont || ''} onChange={(e) => handleChange('titleFont', e.target.value)} className="flex-1 p-1 border border-[rgba(255,255,255,0.1)] rounded text-xs bg-[#161616] text-white">
                  <option value="">Fonte Padrão Global</option>
                  {fonts.map(f => <option key={f.name} value={f.heading}>{f.name} (Heading)</option>)}
                </select>
              </div>

              {slide.layoutModel !== 'forbes' && slide.layoutModel !== 'twitter' && (
                <div className="flex flex-col mt-2 border border-[rgba(255,255,255,0.05)] rounded bg-[#161616]/40 overflow-hidden">
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
              )}
            </div>

            <div className="flex flex-col gap-1" key={`${slide.id}-content-container`}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Conteúdo</label>
              </div>
              <AiTextRefiner 
                text={slide.content || ''} 
                field="content" 
                onApply={(newText) => handleChange('content', newText)} 
              />
              <RichTextEditor 
                value={slide.content || ''} 
                onChange={(val) => handleChange('content', val)} 
                fonts={fonts} 
              />
              <div className="flex gap-2 mt-1">
                <input type="color" value={slide.contentColor || '#cccccc'} onChange={(e) => handleChange('contentColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0 shrink-0" title="Cor Padrão do Conteúdo" />
                <select value={slide.bodyFont || ''} onChange={(e) => handleChange('bodyFont', e.target.value)} className="flex-1 p-1 border border-[rgba(255,255,255,0.1)] rounded text-xs bg-[#161616] text-white">
                  <option value="">Fonte Padrão Global</option>
                  {fonts.map(f => <option key={f.name} value={f.body}>{f.name} (Body)</option>)}
                </select>
              </div>
            </div>

            {slide.layoutModel !== 'twitter' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Alinhamento do Conteúdo</label>
                <div className="flex gap-4">
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleChange('alignment', 'left')}
                      className={`p-2 border rounded-md ${slide.alignment === 'left' || !slide.alignment ? 'bg-[rgba(108,99,255,0.1)] border-[#6C63FF] text-[#6C63FF]' : 'bg-[#161616] border-[rgba(255,255,255,0.1)] text-[rgba(240,240,240,0.6)]'}`}
                      title="Esquerda"
                    >
                      <AlignLeft size={16} />
                    </button>
                    <button 
                      onClick={() => handleChange('alignment', 'center')}
                      className={`p-2 border rounded-md ${slide.alignment === 'center' ? 'bg-[rgba(108,99,255,0.1)] border-[#6C63FF] text-[#6C63FF]' : 'bg-[#161616] border-[rgba(255,255,255,0.1)] text-[rgba(240,240,240,0.6)]'}`}
                      title="Centro"
                    >
                      <AlignCenter size={16} />
                    </button>
                    <button 
                      onClick={() => handleChange('alignment', 'right')}
                      className={`p-2 border rounded-md ${slide.alignment === 'right' ? 'bg-[rgba(108,99,255,0.1)] border-[#6C63FF] text-[#6C63FF]' : 'bg-[#161616] border-[rgba(255,255,255,0.1)] text-[rgba(240,240,240,0.6)]'}`}
                      title="Direita"
                    >
                      <AlignRight size={16} />
                    </button>
                  </div>

                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleChange('verticalAlignment', 'top')}
                      className={`p-2 border rounded-md ${slide.verticalAlignment === 'top' ? 'bg-[rgba(108,99,255,0.1)] border-[#6C63FF] text-[#6C63FF]' : 'bg-[#161616] border-[rgba(255,255,255,0.1)] text-[rgba(240,240,240,0.6)]'}`}
                      title="Topo"
                    >
                      <ArrowUpToLine size={16} />
                    </button>
                    <button 
                      onClick={() => handleChange('verticalAlignment', 'center')}
                      className={`p-2 border rounded-md ${slide.verticalAlignment === 'center' ? 'bg-[rgba(108,99,255,0.1)] border-[#6C63FF] text-[#6C63FF]' : 'bg-[#161616] border-[rgba(255,255,255,0.1)] text-[rgba(240,240,240,0.6)]'}`}
                      title="Meio"
                    >
                      <AlignVerticalJustifyCenter size={16} />
                    </button>
                    <button 
                      onClick={() => handleChange('verticalAlignment', 'bottom')}
                      className={`p-2 border rounded-md ${slide.verticalAlignment === 'bottom' || !slide.verticalAlignment ? 'bg-[rgba(108,99,255,0.1)] border-[#6C63FF] text-[#6C63FF]' : 'bg-[#161616] border-[rgba(255,255,255,0.1)] text-[rgba(240,240,240,0.6)]'}`}
                      title="Base"
                    >
                      <ArrowDownToLine size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Ajuste de Posição Livre (Deslocamento X/Y) */}
            <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-[rgba(255,255,255,0.05)]">
              <label className="text-xs font-semibold text-[rgba(240,240,240,0.8)] uppercase">Posicionamento Livre (X/Y Offset)</label>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-[rgba(240,240,240,0.5)]">
                  <span>Horizontal (X: {slide.textOffsetX ?? 0}px)</span>
                  <button onClick={() => handleChange('textOffsetX', 0)} className="text-blue-400 hover:underline">Reset</button>
                </div>
                <input 
                  type="range" min="-150" max="150" 
                  value={slide.textOffsetX ?? 0} 
                  onChange={(e) => handleChange('textOffsetX', parseInt(e.target.value))}
                  className="accent-[#6C63FF]" 
                />
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex justify-between text-[10px] text-[rgba(240,240,240,0.5)]">
                  <span>Vertical (Y: {slide.textOffsetY ?? 0}px)</span>
                  <button onClick={() => handleChange('textOffsetY', 0)} className="text-blue-400 hover:underline">Reset</button>
                </div>
                <input 
                  type="range" min="-200" max="200" 
                  value={slide.textOffsetY ?? 0} 
                  onChange={(e) => handleChange('textOffsetY', parseInt(e.target.value))}
                  className="accent-[#6C63FF]" 
                />
              </div>
            </div>

          </div>
        )}

        {/* --- TAB 4: IMAGENS DO SLIDE --- */}
        {activeTab === 'image' && (
          <div className="flex flex-col gap-4 p-3.5 bg-[#0A0A0A] rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm animate-fade-in">
            <h4 className="text-xs font-bold text-[#6C63FF] uppercase tracking-wider mb-1">
              Imagens do Slide
            </h4>
            
            {/* Se o Layout for Twitter, mostra a seção de Grid de Imagens */}
            {slide.layoutModel === 'twitter' ? (
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Ajustes das Imagens do Tweet</label>
                <div className="grid grid-cols-2 gap-3 bg-[#161616]/40 p-2.5 rounded-lg border border-[rgba(255,255,255,0.05)]">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[rgba(240,240,240,0.5)] uppercase">Bordas ({slide.twitterImageBorderRadius ?? 14}px)</span>
                    <input 
                      type="range" min="0" max="40" 
                      value={slide.twitterImageBorderRadius ?? 14} 
                      onChange={(e) => handleChange('twitterImageBorderRadius', parseInt(e.target.value))} 
                      className="accent-[#6C63FF]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[rgba(240,240,240,0.5)] uppercase">Altura ({slide.twitterImageHeight ?? 200}px)</span>
                    <input 
                      type="range" min="100" max="300" 
                      value={slide.twitterImageHeight ?? 200} 
                      onChange={(e) => handleChange('twitterImageHeight', parseInt(e.target.value))} 
                      className="accent-[#6C63FF]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-[rgba(255,255,255,0.05)]">
                  <span className="text-[11px] font-bold text-gray-400 uppercase">Lista de Imagens (Até 4)</span>
                  {[0, 1, 2, 3].map((idx) => {
                    const currentImages = slide.twitterImages || [];
                    const valueUrl = idx === 0 
                      ? (currentImages[0] || slide.imageUrl || '')
                      : (currentImages[idx] || '');

                    const handleTwitterImageChange = (val: string) => {
                      const newList = [...currentImages];
                      newList[idx] = val;
                      for (let i = 0; i < idx; i++) {
                        if (newList[i] === undefined) newList[i] = '';
                      }
                      
                      if (idx === 0) {
                        onChange({
                          ...slide,
                          imageUrl: val,
                          twitterImages: newList
                        });
                      } else {
                        handleChange('twitterImages', newList);
                      }
                    };

                    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          handleTwitterImageChange(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    };

                    return (
                      <div key={idx} className="flex flex-col gap-1 p-2 bg-[#161616]/40 rounded-lg border border-[rgba(255,255,255,0.05)]">
                        <span className="text-[9px] text-gray-400 uppercase font-semibold">Imagem {idx + 1}</span>
                        <div className="flex gap-2 items-center">
                          <label className="flex items-center justify-center p-1.5 bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors text-[10px] text-white shrink-0">
                            <Upload size={10} className="mr-1" />
                            Upload
                            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                          </label>
                          <input 
                            type="text" 
                            value={valueUrl} 
                            onChange={(e) => handleTwitterImageChange(e.target.value)}
                            className="flex-1 p-1 border border-[rgba(255,255,255,0.1)] rounded text-[11px] bg-[#0A0A0A] text-white focus:outline-none"
                            placeholder={`URL da imagem ${idx + 1}...`}
                          />
                          {valueUrl && (
                            <button 
                              onClick={() => handleTwitterImageChange('')}
                              className="text-red-400 text-[10px] px-1 hover:text-red-300"
                            >
                              X
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : slide.layoutModel === 'comparativo' ? (
              // Imagens para Layout Comparativo
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Imagem da Opção A ({slide.comparisonOptionA || 'Opção A'})</label>
                  <div className="flex gap-2 items-center">
                    <label className="flex items-center justify-center px-3 py-2 bg-[#161616] border border-[rgba(255,255,255,0.1)] rounded-md cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors text-sm text-white shrink-0">
                      <Upload size={14} className="mr-2" />
                      Upload
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            handleChange('comparisonImageA', reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                    <input 
                      type="text" 
                      value={slide.comparisonImageA || ''} 
                      onChange={(e) => handleChange('comparisonImageA', e.target.value)}
                      className="flex-grow p-2 border border-[rgba(255,255,255,0.1)] rounded-md text-sm bg-[#161616] text-white"
                      placeholder="Ou cole a URL da imagem A..."
                    />
                    {slide.comparisonImageA && (
                      <button onClick={() => handleChange('comparisonImageA', '')} className="text-red-400 text-xs px-1 hover:text-red-300">X</button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1 mt-2">
                  <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Imagem da Opção B ({slide.comparisonOptionB || 'Opção B'})</label>
                  <div className="flex gap-2 items-center">
                    <label className="flex items-center justify-center px-3 py-2 bg-[#161616] border border-[rgba(255,255,255,0.1)] rounded-md cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors text-sm text-white shrink-0">
                      <Upload size={14} className="mr-2" />
                      Upload
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            handleChange('comparisonImageB', reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                    <input 
                      type="text" 
                      value={slide.comparisonImageB || ''} 
                      onChange={(e) => handleChange('comparisonImageB', e.target.value)}
                      className="flex-grow p-2 border border-[rgba(255,255,255,0.1)] rounded-md text-sm bg-[#161616] text-white"
                      placeholder="Ou cole a URL da imagem B..."
                    />
                    {slide.comparisonImageB && (
                      <button onClick={() => handleChange('comparisonImageB', '')} className="text-red-400 text-xs px-1 hover:text-red-300">X</button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Imagem Padrão para outros Layouts
              <>
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
              </>
            )}
          </div>
        )}

        {/* --- TAB 5: ELEMENTOS EXTRAS E CAMADAS --- */}
        {activeTab === 'extras' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {/* CTA Button Section */}
            {slide.type === 'cta' && !isFrasesLayout && (
              <div className="flex flex-col gap-4 p-3.5 bg-[#0A0A0A] rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm">
                <h4 className="text-xs font-bold text-[#6C63FF] uppercase tracking-wider mb-1">Elementos Extras (CTA)</h4>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[rgba(240,240,240,0.6)] uppercase">Texto do Botão CTA</label>
                  <input 
                    type="text" 
                    value={slide.ctaText || ''} 
                    onChange={(e) => handleChange('ctaText', e.target.value)}
                    className="p-2 border border-[rgba(255,255,255,0.1)] rounded-md text-sm bg-[#161616] text-white"
                  />
                </div>
              </div>
            )}

            {/* Custom Layers Section */}
            <div className="flex flex-col gap-4 p-3.5 bg-[#0A0A0A] rounded-xl border border-[rgba(255,255,255,0.04)] shadow-sm">
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
                  <Plus size={12} /> Add
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
                              y: layer.y + 5,
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
                      className="p-2 border border-[rgba(255,255,255,0.1)] rounded text-xs bg-[#222] text-white focus:outline-none focus:border-[#6C63FF] transition-colors resize-none font-sans"
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
                          className="p-1 border border-[rgba(255,255,255,0.1)] rounded text-[10px] bg-[#222] text-white focus:outline-none"
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
                          className="p-1 border border-[rgba(255,255,255,0.1)] rounded text-[10px] bg-[#222] text-white focus:outline-none"
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
                          className="p-1 border border-[rgba(255,255,255,0.1)] rounded text-[10px] bg-[#222] text-white focus:outline-none"
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
                          className="p-1 border border-[rgba(255,255,255,0.1)] rounded text-[10px] bg-[#222] text-white focus:outline-none"
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
                          className="p-1 border border-[rgba(255,255,255,0.1)] rounded text-[10px] bg-[#222] text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
});
