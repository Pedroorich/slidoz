import React, { useRef, useEffect } from 'react';
import { SlideData } from '../lib/gemini';
import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import { colord } from 'colord';

interface CarouselPreviewProps {
  slides: SlideData[];
  palette: any;
  brandName: string;
  handle: string;
  logoUrl: string | null;
  headingFont: string;
  bodyFont: string;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  previewRef: React.RefObject<HTMLDivElement>;
  format?: 'portrait' | 'square' | 'stories';
}

export function CarouselPreview({
  slides,
  palette,
  brandName,
  handle,
  logoUrl,
  headingFont,
  bodyFont,
  currentIndex,
  setCurrentIndex,
  previewRef,
  format = 'portrait'
}: CarouselPreviewProps) {
  
  if (!slides.length) return null;

  const hasFrases = slides.some(s => s.layoutModel === 'frases');

  return (
    <div className="w-full flex flex-col items-center">
      <div 
        className="flex overflow-x-auto snap-x snap-mandatory w-full max-w-[100vw] gap-6 pb-8 px-8"
        style={{ scrollbarWidth: 'thin' }}
        ref={previewRef}
      >
        {slides.map((slide, index) => (
          <div 
            key={slide.id} 
            onClick={() => setCurrentIndex(index)}
            className={`snap-center shrink-0 rounded-xl overflow-hidden shadow-2xl cursor-pointer transition-all duration-200 ${index === currentIndex ? 'ring-4 ring-blue-500 scale-[1.02]' : 'border border-gray-100 opacity-90 hover:opacity-100'}`}
          >
            <Slide 
              slide={slide}
              slides={slides}
              index={index}
              total={slides.length}
              palette={palette}
              brandName={brandName}
              handle={handle}
              logoUrl={logoUrl}
              headingFont={headingFont}
              bodyFont={bodyFont}
              prevSlide={index > 0 ? slides[index - 1] : null}
              format={format}
            />
          </div>
        ))}
      </div>
      
      {!hasFrases && (
        <div className="text-sm text-gray-500 mt-2 flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          Deslize para ver todos os slides
        </div>
      )}
    </div>
  );
}

function Slide({ slide, slides = [], index, total, palette, brandName, handle, logoUrl, headingFont, bodyFont, prevSlide, format = 'portrait' }: any) {
  const isLight = slide.background === 'light';
  const isGradient = slide.background === 'brand-gradient';
  const hasBgImage = !!slide.backgroundImage;
  const isAiBackground = slide.imageUrl && slide.imagePosition === 'background';
  
  const isExtendedFromPrev = prevSlide?.extendBackgroundToNext && (prevSlide.backgroundImage || (prevSlide.imageUrl && prevSlide.imagePosition === 'background'));
  const isExtendingToNext = slide.extendBackgroundToNext && (slide.backgroundImage || (slide.imageUrl && slide.imagePosition === 'background'));

  // Security Helper: Proxy external URLs to allow html2canvas to export them safely without CORS restrictions
  const proxify = (url: string) => {
    if (!url) return url;
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    // Evita duplicar o proxy
    if (url.includes('corsproxy.io') || url.includes('wsrv.nl')) return url;
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&we`;
  };

  const isForbes = slide.layoutModel === 'forbes';
  const isTwitter = slide.layoutModel === 'twitter';
  const isFrases = slide.layoutModel === 'frases';
  const isRanking = slide.layoutModel === 'ranking';
  const isAntesDepois = slide.layoutModel === 'antes_depois';
  const isDadoContexto = slide.layoutModel === 'dado_contexto';
  const isChecklist = slide.layoutModel === 'checklist';
  const isDepoimento = slide.layoutModel === 'depoimento';
  const isPassoAPasso = slide.layoutModel === 'passo_a_passo';
  const isComparativo = slide.layoutModel === 'comparativo';
  const isCitacaoEspecialista = slide.layoutModel === 'citacao_especialista';
  const isProblema = slide.layoutModel === 'problema';
  const isSolucao = slide.layoutModel === 'solucao';
  const isTimeline = slide.layoutModel === 'timeline';
  const hasCustomLayout = isRanking || isAntesDepois || isDadoContexto || isChecklist || isDepoimento || isPassoAPasso || isComparativo || isCitacaoEspecialista || isProblema || isSolucao || isTimeline;

  const passoSlides = slides.filter((s: any) => s.layoutModel === 'passo_a_passo');
  const passoIndex = passoSlides.findIndex((s: any) => s.id === slide.id);
  const passoNumber = passoIndex !== -1 ? passoIndex + 1 : index + 1;
  const totalPasso = passoSlides.length > 0 ? passoSlides.length : total;

  let slideWidth = 420;
  let slideHeight = 525;
  if (format === 'square') {
    slideHeight = 420;
  } else if (format === 'stories') {
    slideHeight = 746;
  }

  let bgStyle: React.CSSProperties = {};
  let bgColorHex = palette.DARK_BG;
  
  if (isExtendedFromPrev || hasBgImage || isAiBackground) {
    bgStyle = { backgroundColor: '#000000' };
    bgColorHex = '#000000';
  } else if (isForbes) {
    bgStyle = { backgroundColor: '#090909' };
    bgColorHex = '#090909';
  } else if (isTwitter) {
    const twitterBg = slide.background === 'light' ? '#ffffff' : '#15202B';
    bgStyle = { backgroundColor: twitterBg };
    bgColorHex = twitterBg;
  } else if (isRanking || isAntesDepois || isProblema) {
    bgStyle = { backgroundColor: '#0D0D0D' };
    bgColorHex = '#0D0D0D';
  } else if (isSolucao) {
    bgStyle = { backgroundColor: palette.BRAND_PRIMARY || '#1A112C' };
    bgColorHex = palette.BRAND_PRIMARY || '#1A112C';
  } else if (isLight) {
    bgStyle = { backgroundColor: palette.LIGHT_BG };
    bgColorHex = palette.LIGHT_BG;
  } else if (isGradient) {
    bgStyle = { background: `linear-gradient(165deg, ${palette.BRAND_ACCENT} 0%, ${palette.BRAND_PRIMARY} 50%, ${palette.BRAND_SECONDARY} 100%)` };
    bgColorHex = palette.BRAND_PRIMARY;
  } else {
    bgStyle = { backgroundColor: palette.DARK_BG };
    bgColorHex = palette.DARK_BG;
  }

  let isBgLight = colord(bgColorHex).isLight();
  if (isTwitter) {
    isBgLight = slide.background === 'light';
  }

  let textColor = slide.titleColor || (isBgLight ? palette.DARK_BG : '#ffffff');
  if (isTwitter) {
    textColor = isBgLight ? '#0F1419' : '#F7F9F9';
  } else if (isForbes) {
    textColor = '#ffffff';
  }

  let mutedTextColor = slide.contentColor || (isBgLight ? colord(palette.DARK_BG).alpha(0.7).toRgbString() : 'rgba(255,255,255,0.8)');
  if (isTwitter) {
    mutedTextColor = isBgLight ? '#536471' : '#8899A6';
  } else if (isForbes) {
    mutedTextColor = 'rgba(255, 255, 255, 0.65)';
  }

  const twitterBorderColor = isBgLight ? '#EFF3F4' : '#38444D';
  const tagColor = isForbes ? (slide.forbesQuoteColor || '#F9D30B') : (isBgLight ? palette.BRAND_PRIMARY : palette.BRAND_SECONDARY);
  const borderColor = isBgLight ? palette.LIGHT_BORDER : 'rgba(255,255,255,0.1)';

  const finalTitleFont = slide.titleFont || headingFont;
  const finalBodyFont = slide.bodyFont || bodyFont;

  const isFirst = index === 0;
  const isLast = index === total - 1;

  const renderBackground = () => {
    if (isExtendedFromPrev || hasBgImage || isAiBackground) {
      const originalBgUrl = isExtendedFromPrev ? (prevSlide.backgroundImage || prevSlide.imageUrl) : (hasBgImage ? slide.backgroundImage : slide.imageUrl);
      const bgUrl = proxify(originalBgUrl);
      
      let xOffset = isExtendedFromPrev ? (prevSlide.bgImageOffsetX ?? 50) : (slide.bgImageOffsetX ?? 50);
      const yOffset = isExtendedFromPrev ? (prevSlide.bgImageOffsetY ?? 50) : (slide.bgImageOffsetY ?? 50);
      const imgOpacity = isExtendedFromPrev ? (prevSlide.bgImageOpacity ?? 1) : (slide.bgImageOpacity ?? 1);
      const scale = isExtendedFromPrev ? (prevSlide.bgImageScale ?? 1) : (slide.bgImageScale ?? 1);
      const gradOpacity = slide.bgGradientOpacity ?? 0.8;
      const gradPos = slide.bgGradientPosition || 'bottom';

      let imgStyle: React.CSSProperties = {
        position: 'absolute', inset: 0, zIndex: 0,
        width: '100%', height: '100%',
        objectFit: 'cover',
        objectPosition: `${xOffset}% ${yOffset}%`,
        opacity: imgOpacity,
        transform: `scale(${scale})`,
        backgroundColor: '#000'
      };

      if (isExtendingToNext || isExtendedFromPrev) {
        // Se a imagem é contínua, ela deve ser 200% da largura (2 slides)
        // Isso garante um corte perfeito independentemente da proporção original.
        imgStyle = {
          position: 'absolute', zIndex: 0,
          top: 0, bottom: 0,
          width: '200%', maxWidth: 'none', height: '100%',
          objectFit: 'cover',
          objectPosition: `${xOffset}% ${yOffset}%`,
          left: isExtendedFromPrev ? '-100%' : '0',
          opacity: imgOpacity,
          transform: `scale(${scale})`,
          backgroundColor: '#000'
        };
      }

      let gradient = "";
      if (slide.layoutModel === 'frases' && slide.isClientPhoto) {
        const vAlign = slide.verticalAlignment || 'bottom';
        if (vAlign === 'top') {
          gradient = `linear-gradient(to top, rgba(0,0,0,0) 40%, rgba(0,0,0,${gradOpacity}) 100%)`;
        } else if (vAlign === 'bottom') {
          gradient = `linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,${gradOpacity}) 100%)`;
        } else {
          gradient = `radial-gradient(circle, rgba(0,0,0,0) 30%, rgba(0,0,0,${gradOpacity * 0.8}) 100%)`;
        }
      } else {
        gradient = gradPos === 'bottom' 
          ? `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,${gradOpacity}) 100%)`
          : `linear-gradient(to top, rgba(0,0,0,0) 0%, rgba(0,0,0,${gradOpacity}) 100%)`;
      }

      return (
        <>
          <img 
            src={bgUrl}
            alt="Fundo"
            crossOrigin="anonymous"
            style={imgStyle}
          />
          <div 
            style={{
              position: 'absolute', inset: 0, zIndex: 1,
              background: gradient
            }}
          />
        </>
      );
    }
    return null;
  };

  const renderImage = () => {
    if (!slide.imageUrl || slide.imagePosition === 'background') return null;
    return (
      <div 
        className="w-full rounded-xl overflow-hidden my-1 shadow-md shrink-0" 
        style={{ 
          aspectRatio: '4/5',
          maxHeight: slide.imagePosition === 'top' || slide.imagePosition === 'bottom' ? '180px' : '240px'
        }}
      >
        <img 
          src={proxify(slide.imageUrl)} 
          alt={slide.title} 
          crossOrigin="anonymous"
          className="w-full h-full object-cover" 
          style={{ 
            objectPosition: `${slide.imageOffsetX ?? 50}% ${slide.imageOffsetY ?? 50}%`,
            transform: `scale(${slide.imageScale ?? 1})`
          }}
        />
      </div>
    );
  };

  const verticalAlign = hasCustomLayout
    ? 'flex-start'
    : (isForbes 
        ? (slide.verticalAlignment === 'top' ? 'flex-start' : slide.verticalAlignment === 'center' ? 'center' : (slide.verticalAlignment === 'bottom' ? 'flex-end' : 'flex-end'))
        : (isTwitter 
          ? 'flex-start'
          : (isFrases
            ? (slide.verticalAlignment === 'top' ? 'flex-start' : slide.verticalAlignment === 'center' ? 'center' : (slide.verticalAlignment === 'bottom' ? 'flex-end' : 'center'))
            : (slide.verticalAlignment === 'top' ? 'flex-start' : slide.verticalAlignment === 'center' ? 'center' : (slide.verticalAlignment === 'bottom' ? 'flex-end' : (slide.alignment === 'center' ? 'center' : 'flex-end'))))
        )
      );

  return (
    <div 
      className="relative flex flex-col slide-container overflow-hidden"
      style={{ 
        width: slideWidth, 
        height: slideHeight, 
        ...bgStyle,
        padding: isTwitter 
          ? '24px 30px 48px' 
          : (isAntesDepois || isCitacaoEspecialista 
              ? '0px' 
              : (isRanking || isChecklist 
                  ? '32px 32px 52px' 
                  : '24px 36px 52px'
                )
            ),
        justifyContent: verticalAlign,
        textAlign: isForbes 
          ? (slide.alignment || 'left') 
          : (isTwitter 
              ? (slide.alignment || 'left') 
              : (isFrases 
                  ? (slide.alignment || 'center') 
                  : (hasCustomLayout 
                      ? (slide.alignment || 'left') 
                      : slide.alignment
                    )
                )
            ),
        flexShrink: 0
      }}
    >
      {renderBackground()}

      {/* Visual Accents for Text-Only Slides */}
      {(!isExtendedFromPrev && !hasBgImage && !isAiBackground && !slide.imageUrl) && (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          {slide.type === 'how-to' && (
            <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 280, fontWeight: 900, color: tagColor, opacity: 0.05, pointerEvents: 'none', lineHeight: 1, fontFamily: finalTitleFont }}>
              {(index + 1).toString().padStart(2, '0')}
            </div>
          )}
          {(slide.type === 'quote' || slide.quote) && (
            <div style={{ position: 'absolute', top: 20, right: 20, fontSize: 240, fontWeight: 900, color: tagColor, opacity: 0.06, pointerEvents: 'none', lineHeight: 1, fontFamily: 'Georgia, serif' }}>
              "
            </div>
          )}
          {slide.type !== 'how-to' && !slide.quote && slide.type !== 'quote' && (
            <>
              <div style={{ position: 'absolute', top: '-15%', right: '-25%', width: '70%', height: '70%', borderRadius: '50%', background: `radial-gradient(circle, ${tagColor} 0%, transparent 70%)`, opacity: 0.08 }} />
              <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '50%', height: '50%', borderRadius: '50%', background: `radial-gradient(circle, ${tagColor} 0%, transparent 70%)`, opacity: 0.06 }} />
            </>
          )}
        </div>
      )}

      {/* Logo Lockup (First & Last) */}
      {(isFirst || isLast) && brandName && brandName.trim() !== '' && !isTwitter && !isForbes && (
        <div className="absolute top-8 left-9 flex items-center gap-3 z-20">
          {logoUrl ? (
            <img src={proxify(logoUrl)} alt={brandName} crossOrigin="anonymous" className="w-10 h-10 rounded-full object-cover shadow-sm" />
          ) : (
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
              style={{ backgroundColor: palette.BRAND_PRIMARY, fontFamily: bodyFont }}
            >
              {brandName.charAt(0).toUpperCase()}
            </div>
          )}
          <span style={{ color: textColor, fontSize: 13, fontWeight: 600, letterSpacing: 0.5, fontFamily: bodyFont }}>
            {brandName}
          </span>
        </div>
      )}

      {/* Forbes Layout */}
      {isForbes && (
        <div 
          className="relative z-10 flex flex-col gap-3.5 w-full select-none"
          style={{ 
            transform: `translate(${slide.textOffsetX || 0}px, ${slide.textOffsetY || 0}px)`,
            alignItems: slide.alignment === 'center' ? 'center' : (slide.alignment === 'right' ? 'flex-end' : 'flex-start')
          }}
        >
          {/* Stylized Forbes Quotes */}
          <div style={{ color: slide.forbesQuoteColor || '#F9D30B', fontSize: 68, fontWeight: 900, fontFamily: 'Georgia, serif', lineHeight: 0.5, marginTop: 10, marginBottom: -10 }}>
            “
          </div>

          {/* Title */}
          <h2 
            style={{ 
              color: '#ffffff', 
              fontSize: (slide.title?.length || 0) > 40 ? 24 : 31, 
              fontWeight: 800, 
              letterSpacing: '-0.8px', 
              lineHeight: 1.15,
              fontFamily: finalTitleFont,
              textAlign: slide.alignment || 'left'
            }}
            dangerouslySetInnerHTML={{ __html: slide.title || '' }}
          />

          {/* Author/Description */}
          {slide.content && (
            <p 
              style={{ 
                color: 'rgba(255, 255, 255, 0.65)', 
                fontSize: 10.5, 
                fontWeight: 600,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                fontFamily: finalBodyFont,
                marginTop: 4,
                lineHeight: 1.35,
                textAlign: slide.alignment || 'left'
              }}
              dangerouslySetInnerHTML={{ __html: slide.content || '' }}
            />
          )}

          {/* Category Label */}
          {slide.tag && (
            <div 
              style={{ 
                color: slide.forbesQuoteColor || '#F9D30B', 
                fontSize: 12, 
                fontWeight: 700, 
                letterSpacing: '2px', 
                textTransform: 'uppercase', 
                fontFamily: finalBodyFont, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 7, 
                marginTop: 10 
              }}
            >
              <span style={{ borderLeft: `3.5px solid ${slide.forbesQuoteColor || '#F9D30B'}`, height: 12, display: 'inline-block' }} />
              {slide.tag}
            </div>
          )}
        </div>
      )}

      {/* Frases Layout */}
      {isFrases && (!slide.imageUrl || slide.isClientPhoto) && (
        <div 
          className="relative z-10 flex flex-col gap-4 w-full select-none"
          style={{ 
            transform: `translate(${slide.textOffsetX || 0}px, ${slide.textOffsetY || 0}px)`,
            alignItems: slide.alignment === 'left' ? 'flex-start' : (slide.alignment === 'right' ? 'flex-end' : 'center'),
            maxWidth: '85%',
            margin: '0 auto'
          }}
        >
          {/* Categoria/Tag do Slide */}
          {slide.tag && (
            <span 
              style={{ 
                color: 'rgba(255, 255, 255, 0.6)', 
                fontSize: 10, 
                fontWeight: 700, 
                letterSpacing: 2, 
                textTransform: 'uppercase',
                fontFamily: finalBodyFont,
                marginBottom: 2
              }}
            >
              {slide.tag}
            </span>
          )}

          {/* Icon/Aspas de Citação Elegante */}
          <div 
            style={{ 
              color: slide.forbesQuoteColor || '#ffffff', 
              fontSize: 60, 
              fontFamily: 'Georgia, serif', 
              lineHeight: 0.2, 
              marginBottom: -8, 
              opacity: 0.9 
            }}
          >
            “
          </div>

          {/* Frase / Título Principal com Parceria de Fontes (Módulos 1, 2, 3) */}
          {(() => {
            const cleanTitle = (slide.title || '').replace(/<[^>]*>/g, '').trim();
            const words = cleanTitle.split(/\s+/).filter(Boolean);
            
            let line1 = "";
            let line2 = "";
            let keyword = "";

            if (words.length > 0) {
              if (words.length === 1) {
                keyword = words[0];
              } else if (words.length === 2) {
                line1 = words[0];
                keyword = words[1];
              } else {
                keyword = words[words.length - 1];
                const remaining = words.slice(0, words.length - 1);
                const mid = Math.ceil(remaining.length / 2);
                line1 = remaining.slice(0, mid).join(" ");
                line2 = remaining.slice(mid).join(" ");
              }
            }

            return (
              <div 
                className="flex flex-col gap-1.5 w-full select-none"
                style={{
                  alignItems: slide.alignment === 'left' ? 'flex-start' : (slide.alignment === 'right' ? 'flex-end' : 'center'),
                  textAlign: slide.alignment || 'center'
                }}
              >
                {line1 && (
                  <div 
                    style={{ 
                      color: '#ffffff', 
                      fontSize: 16, 
                      fontWeight: 700, 
                      fontFamily: finalBodyFont,
                      textTransform: 'none',
                      lineHeight: 1.35
                    }}
                  >
                    {line1}
                  </div>
                )}
                {line2 && (
                  <div 
                    style={{ 
                      color: '#ffffff', 
                      fontSize: 16, 
                      fontWeight: 700, 
                      fontFamily: finalBodyFont,
                      textTransform: 'none',
                      lineHeight: 1.35
                    }}
                  >
                    {line2}
                  </div>
                )}
                {keyword && (
                  <div 
                    style={{ 
                      color: '#ffffff', 
                      fontSize: 28, 
                      fontWeight: 500, 
                      fontStyle: 'italic',
                      fontFamily: finalTitleFont,
                      marginTop: 4,
                      lineHeight: 1.2
                    }}
                  >
                    {keyword.toUpperCase()}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Descrição / Conteúdo de apoio (ex: Autor ou reflexão) */}
          {slide.content && (
            <p 
              style={{ 
                color: 'rgba(255, 255, 255, 0.7)', 
                fontSize: 12.5, 
                lineHeight: 1.45,
                fontFamily: finalBodyFont,
                textAlign: slide.alignment || 'center',
                maxWidth: '90%'
              }}
              dangerouslySetInnerHTML={{ __html: slide.content || '' }}
            />
          )}

          {/* Rodapé da Assinatura do Criador / Marca d'água */}
          {brandName && (
            <div 
              className="flex items-center gap-2 mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)]"
              style={{ 
                borderColor: 'rgba(255,255,255,0.06)',
                width: '60%',
                justifyContent: slide.alignment === 'left' ? 'flex-start' : (slide.alignment === 'right' ? 'flex-end' : 'center')
              }}
            >
              {logoUrl ? (
                <img 
                  src={proxify(logoUrl)} 
                  alt="Logo" 
                  crossOrigin="anonymous" 
                  className="w-5 h-5 rounded-full object-cover" 
                />
              ) : (
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                  style={{ backgroundColor: palette.BRAND_PRIMARY }}
                >
                  {brandName.charAt(0).toUpperCase()}
                </div>
              )}
              <span 
                style={{ 
                  color: 'rgba(255, 255, 255, 0.4)', 
                  fontSize: 10, 
                  fontWeight: 300, 
                  fontFamily: finalBodyFont,
                  letterSpacing: '1px' 
                }}
              >
                {handle || `@${brandName.toLowerCase()}`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Twitter Layout */}
      {isTwitter && (
        <div 
          className="relative z-10 flex flex-col w-full text-left"
          style={{ 
            transform: `translate(${slide.textOffsetX || 0}px, ${slide.textOffsetY || 0}px)`
          }}
        >
          {/* Profile Header */}
          <div className="flex items-center gap-3 w-full mb-3 text-left">
            {logoUrl ? (
              <img 
                src={proxify(logoUrl)} 
                alt="Avatar" 
                crossOrigin="anonymous" 
                className="w-10 h-10 rounded-full object-cover border"
                style={{ borderColor: twitterBorderColor }}
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
                style={{ backgroundColor: palette.BRAND_PRIMARY, fontFamily: bodyFont }}
              >
                {brandName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col select-none">
              <div className="flex items-center gap-1 leading-tight">
                <span style={{ color: textColor, fontSize: 14, fontWeight: 750, fontFamily: bodyFont }}>
                  {brandName}
                </span>
                {/* Verified Badge */}
                <svg className="w-4 h-4 text-[#1D9BF0] fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.941.1-1.358.275C14.77 2.515 13.512 1.5 12 1.5s-2.77 1.015-3.412 2.285C8.17 3.61 7.71 3.51 7.23 3.51c-2.11 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .941-.1 1.358-.275C9.23 21.485 10.488 22.5 12 22.5s2.77-1.015 3.412-2.285c.418.175.878.275 1.358.275 2.11 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.72 3.23l-3.32-3.32L7.9 11l2.1 2.1 5.3-5.3 1.42 1.42-6.72 6.72z" />
                </svg>
              </div>
              <span style={{ color: mutedTextColor, fontSize: 12.5, fontFamily: bodyFont }}>
                {handle || `@${brandName.toLowerCase()}`}
              </span>
            </div>
          </div>

          {/* Tweet Text */}
          <div className="flex flex-col gap-2 w-full text-left">
            <h2 
              style={{ 
                color: textColor, 
                fontSize: 18.5 * (slide.titleFontSize ?? 1), 
                fontWeight: 700, 
                letterSpacing: '-0.3px', 
                lineHeight: 1.3,
                fontFamily: finalTitleFont,
                textAlign: slide.alignment || 'left'
              }}
              dangerouslySetInnerHTML={{ __html: slide.title || '' }}
            />
            {slide.content && (
              <p 
                style={{ 
                  color: mutedTextColor, 
                  fontSize: 13.5, 
                  lineHeight: 1.45,
                  fontFamily: finalBodyFont,
                  textAlign: slide.alignment || 'left'
                }}
                dangerouslySetInnerHTML={{ __html: slide.content || '' }}
              />
            )}
          </div>

          {/* Grid de Imagens do Twitter */}
          {(() => {
            const imagesList = slide.twitterImages && slide.twitterImages.length > 0 
              ? slide.twitterImages.filter(Boolean) 
              : (slide.imageUrl ? [slide.imageUrl] : []);

            if (imagesList.length === 0) return null;

            const bRadius = `${slide.twitterImageBorderRadius ?? 14}px`;
            const cHeight = `${slide.twitterImageHeight ?? 200}px`;

            const gridStyle: React.CSSProperties = {
              display: 'grid',
              width: '100%',
              height: cHeight,
              borderRadius: bRadius,
              overflow: 'hidden',
              border: `1px solid ${twitterBorderColor}`,
              marginTop: '12px',
              gap: '2px',
              flexShrink: 0
            };

            if (imagesList.length === 1) {
              return (
                <div style={gridStyle}>
                  <img 
                    src={proxify(imagesList[0])} 
                    alt="Twitter 1" 
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover" 
                  />
                </div>
              );
            }

            if (imagesList.length === 2) {
              return (
                <div style={{ ...gridStyle, gridTemplateColumns: '1fr 1fr' }}>
                  {imagesList.map((img, i) => (
                    <img 
                      key={i} 
                      src={proxify(img)} 
                      alt={`Twitter ${i + 1}`} 
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover" 
                    />
                  ))}
                </div>
              );
            }

            if (imagesList.length === 3) {
              return (
                <div style={{ ...gridStyle, gridTemplateColumns: '1.2fr 1fr' }}>
                  <img 
                    src={proxify(imagesList[0])} 
                    alt="Twitter 1" 
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover" 
                  />
                  <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '2px', height: '100%' }}>
                    <img 
                      src={proxify(imagesList[1])} 
                      alt="Twitter 2" 
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover" 
                    />
                    <img 
                      src={proxify(imagesList[2])} 
                      alt="Twitter 3" 
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover" 
                    />
                  </div>
                </div>
              );
            }

            // 4 imagens
            return (
              <div style={{ ...gridStyle, gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
                {imagesList.slice(0, 4).map((img, i) => (
                  <img 
                    key={i} 
                    src={proxify(img)} 
                    alt={`Twitter ${i + 1}`} 
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover" 
                  />
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Módulo 4: Ranking */}
      {isRanking && (
        <div className="w-full flex flex-col gap-4 z-10 text-left pt-6" style={{ transform: `translate(${slide.textOffsetX || 0}px, ${slide.textOffsetY || 0}px)` }}>
          {slide.title && (
            <h2 
              style={{ color: '#ffffff', fontSize: 22, fontWeight: 800, fontFamily: finalTitleFont, textAlign: slide.alignment || 'left', marginBottom: 16 }}
              dangerouslySetInnerHTML={{ __html: slide.title }}
            />
          )}
          {slide.content && (
            <p style={{ color: mutedTextColor, fontSize: 13, fontWeight: 300, fontFamily: finalBodyFont, lineHeight: 1.4, marginBottom: 8 }} dangerouslySetInnerHTML={{ __html: slide.content }} />
          )}
          <div className="flex flex-col gap-3">
            {slide.items?.slice(0, 5).map((item: any, i: number) => {
              const isFirstItem = i === 0;
              const scaleFactor = Math.max(0.7, 1.2 - i * 0.12);
              const numFontSize = 42 * scaleFactor;
              const titleFontSize = 14 * scaleFactor;
              const descFontSize = 11 * scaleFactor;
              
              return (
                <div 
                  key={i} 
                  className="flex items-center gap-4 py-2"
                  style={{ 
                    paddingBottom: isFirstItem ? '14px' : '8px',
                    paddingTop: isFirstItem ? '10px' : '6px',
                    borderBottom: i === (slide.items.length - 1) || i === 4 ? 'none' : `1px solid ${borderColor}`,
                  }}
                >
                  <span 
                    style={{ 
                      color: isFirstItem ? (slide.titleColor || palette.BRAND_ACCENT) : 'rgba(255,255,255,0.7)', 
                      fontSize: numFontSize, 
                      fontWeight: 900, 
                      fontFamily: finalTitleFont,
                      lineHeight: 1,
                      minWidth: 45,
                      textAlign: 'center'
                    }}
                  >
                    #{i + 1}
                  </span>
                  <div className="flex flex-col text-left">
                    <span 
                      style={{ color: '#ffffff', fontSize: titleFontSize, fontWeight: 700, fontFamily: finalBodyFont }}
                      dangerouslySetInnerHTML={{ __html: item.label }}
                    />
                    {item.description && (
                      <span 
                        style={{ color: 'rgba(255,255,255,0.6)', fontSize: descFontSize, fontWeight: 300, fontFamily: finalBodyFont, marginTop: 2 }}
                        dangerouslySetInnerHTML={{ __html: item.description }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Módulo 5: Antes vs Depois */}
      {isAntesDepois && (
        <div className="absolute inset-0 flex z-10">
          {/* LADO ANTES */}
          <div 
            className="flex-1 flex flex-col justify-center p-6 relative animate-fade-in"
            style={{ 
              background: 'linear-gradient(135deg, #090B0E 0%, #121820 100%)',
              borderRight: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            <span className="absolute top-6 left-6 text-[10px] font-bold tracking-widest text-white/30 uppercase font-sans">
              Antes
            </span>
            <div className="text-left flex flex-col gap-2">
              <h3 
                style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18, fontWeight: 700, fontFamily: finalTitleFont, lineHeight: 1.2 }}
                dangerouslySetInnerHTML={{ __html: slide.antesTitle || slide.title || 'Estado de Dor' }}
              />
              <p 
                style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 300, fontFamily: finalBodyFont, lineHeight: 1.45 }}
                dangerouslySetInnerHTML={{ __html: slide.antesContent || slide.content || 'Descrição do estado anterior.' }}
              />
            </div>
          </div>

          {/* DIVISOR CENTRAL */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/40 flex items-center justify-center z-20">
            <div 
              className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center shadow-md font-bold text-xs select-none"
              style={{ transform: 'translateX(-50%)' }}
            >
              →
            </div>
          </div>

          {/* LADO DEPOIS */}
          <div 
            className="flex-1 flex flex-col justify-center p-6 relative animate-fade-in"
            style={{ 
              background: `linear-gradient(135deg, ${colord(palette.BRAND_PRIMARY).darken(0.35).toHex()} 0%, ${colord(palette.BRAND_SECONDARY).darken(0.45).toHex()} 100%)`,
            }}
          >
            <span className="absolute top-6 right-6 text-[10px] font-bold tracking-widest text-white/90 uppercase font-sans">
              Depois
            </span>
            <div className="text-left flex flex-col gap-2">
              <h3 
                style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, fontFamily: finalTitleFont, lineHeight: 1.2 }}
                dangerouslySetInnerHTML={{ __html: slide.depoisTitle || 'Estado de Alívio' }}
              />
              <p 
                style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 300, fontFamily: finalBodyFont, lineHeight: 1.45 }}
                dangerouslySetInnerHTML={{ __html: slide.depoisContent || 'Descrição do estado transformado.' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Módulo 6: Dado + Contexto */}
      {isDadoContexto && (
        <div className="w-full flex flex-col items-center justify-center text-center z-10 py-12" style={{ transform: `translate(${slide.textOffsetX || 0}px, ${slide.textOffsetY || 0}px)`, minHeight: '80%' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', marginBottom: 12 }}>
            <h1 
              style={{ 
                color: slide.titleColor || palette.BRAND_ACCENT, 
                fontSize: 76, 
                fontWeight: 900, 
                fontFamily: finalTitleFont, 
                lineHeight: 1 
              }}
              dangerouslySetInnerHTML={{ __html: slide.bigNumber || '85%' }}
            />
          </div>
          {(slide.contextLine || slide.title) && (
            <h2 
              style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, fontFamily: finalBodyFont, lineHeight: 1.2, maxWidth: '90%', marginBottom: 12 }}
              dangerouslySetInnerHTML={{ __html: slide.contextLine || slide.title }}
            />
          )}
          {(slide.implicationLine || slide.content) && (
            <p 
              style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 300, fontFamily: finalBodyFont, lineHeight: 1.5, maxWidth: '85%' }}
              dangerouslySetInnerHTML={{ __html: slide.implicationLine || slide.content || '' }}
            />
          )}
          {slide.sourceLine && (
            <div className="absolute bottom-14 left-0 right-0 text-center">
              <span 
                style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: 300, fontFamily: finalBodyFont, letterSpacing: '0.5px' }}
                dangerouslySetInnerHTML={{ __html: slide.sourceLine }}
              />
            </div>
          )}
        </div>
      )}

      {/* Módulo 7: Checklist */}
      {isChecklist && (
        <div className="w-full flex flex-col gap-6 z-10 pt-4" style={{ transform: `translate(${slide.textOffsetX || 0}px, ${slide.textOffsetY || 0}px)` }}>
          {slide.title && (
            <h2 
              style={{ color: textColor, fontSize: 20, fontWeight: 800, fontFamily: finalTitleFont, textAlign: 'center', marginBottom: 8 }}
              dangerouslySetInnerHTML={{ __html: slide.title }}
            />
          )}
          {slide.content && (
            <p style={{ color: mutedTextColor, fontSize: 12.5, fontWeight: 300, fontFamily: finalBodyFont, lineHeight: 1.4, marginTop: -8, textAlign: 'center' }} dangerouslySetInnerHTML={{ __html: slide.content }} />
          )}
          <div className="flex flex-col gap-4">
            {slide.items?.slice(0, 6).map((item: any, i: number) => {
              const isLastItem = i === (slide.items.length - 1) || i === 5;
              const isNegative = slide.checklistType === 'negative';
              const iconColor = isNegative ? '#EF4444' : '#10B981';
              const iconChar = isNegative ? '✕' : '✓';
              
              return (
                <div 
                  key={i} 
                  className="flex items-start gap-4 text-left"
                  style={{
                    padding: '8px 0',
                    borderBottom: isLastItem ? 'none' : `1px solid ${borderColor}`,
                    transform: isLastItem ? 'scale(1.04)' : 'none',
                    transformOrigin: 'left center'
                  }}
                >
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold text-xs"
                    style={{ 
                      backgroundColor: isLastItem ? (isNegative ? '#7F1D1D' : '#064E3B') : (isNegative ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'),
                      color: iconColor,
                      border: `1px solid ${iconColor}`
                    }}
                  >
                    {iconChar}
                  </div>
                  <div className="flex flex-col">
                    <span 
                      style={{ 
                        color: isLastItem ? (slide.titleColor || palette.BRAND_ACCENT) : textColor, 
                        fontSize: isLastItem ? 15 : 13.5, 
                        fontWeight: 700, 
                        fontFamily: finalBodyFont 
                      }}
                      dangerouslySetInnerHTML={{ __html: item.label }}
                    />
                    {item.description && (
                      <span 
                        style={{ color: mutedTextColor, fontSize: 11, fontWeight: 300, fontFamily: finalBodyFont, marginTop: 1 }}
                        dangerouslySetInnerHTML={{ __html: item.description }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Módulo 8: Depoimento */}
      {isDepoimento && (
        <div className="w-full flex flex-col z-10 relative pt-8 pb-12 text-left" style={{ transform: `translate(${slide.textOffsetX || 0}px, ${slide.textOffsetY || 0}px)`, minHeight: '80%', justifyContent: 'space-between' }}>
          <div style={{ color: palette.BRAND_ACCENT, fontSize: 72, fontFamily: 'Georgia, serif', lineHeight: 0.1, marginBottom: 12 }}>
            “
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <p 
              style={{ 
                color: textColor, 
                fontSize: 18, 
                fontWeight: 700, 
                fontStyle: 'italic', 
                fontFamily: finalTitleFont, 
                lineHeight: 1.45,
                margin: '12px 0'
              }}
              dangerouslySetInnerHTML={{ __html: `"${slide.content || slide.title || 'Depoimento incrível do cliente.'}"` }}
            />
          </div>

          <div style={{ height: '1px', background: `linear-gradient(to right, ${palette.BRAND_ACCENT}, transparent)`, margin: '16px 0', opacity: 0.5 }} />

          <div className="flex items-center gap-3">
            {slide.testimonialPhoto ? (
              <img 
                src={proxify(slide.testimonialPhoto)} 
                alt={slide.testimonialName} 
                crossOrigin="anonymous" 
                className="w-11 h-11 rounded-full object-cover shadow animate-fade-in"
                style={{ border: `2px solid ${palette.BRAND_ACCENT}` }}
              />
            ) : (
              <div 
                className="w-11 h-11 rounded-full flex items-center justify-center text-white text-base font-bold shadow"
                style={{ backgroundColor: palette.BRAND_PRIMARY, border: `2px solid ${palette.BRAND_ACCENT}` }}
              >
                {(slide.testimonialName || 'C').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col">
              <span style={{ color: textColor, fontSize: 13.5, fontWeight: 700, fontFamily: finalBodyFont }}>
                {slide.testimonialName || 'Nome do Cliente'}
              </span>
              {slide.testimonialRole && (
                <span style={{ color: palette.BRAND_ACCENT, fontSize: 11, fontWeight: 400, fontFamily: finalBodyFont }}>
                  {slide.testimonialRole}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Módulo 9: Tutorial Passo a Passo */}
      {isPassoAPasso && (
        <div className="w-full flex flex-col text-left z-10 pt-4" style={{ transform: `translate(${slide.textOffsetX || 0}px, ${slide.textOffsetY || 0}px)` }}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-20">
            <div style={{ width: `${(passoNumber / totalPasso) * 100}%`, height: '100%', backgroundColor: palette.BRAND_ACCENT }} />
          </div>

          <div 
            style={{ 
              color: palette.BRAND_ACCENT, 
              fontSize: 44, 
              fontWeight: 900, 
              fontFamily: finalTitleFont, 
              lineHeight: 1,
              marginBottom: 16
            }}
          >
            {String(passoNumber).padStart(2, '0')}
          </div>

          <h2 
            style={{ color: textColor, fontSize: 22, fontWeight: 800, fontFamily: finalTitleFont, lineHeight: 1.2, marginBottom: 8 }}
            dangerouslySetInnerHTML={{ __html: slide.title }}
          />

          {slide.content && (
            <p 
              style={{ color: mutedTextColor, fontSize: 13, fontWeight: 300, fontFamily: finalBodyFont, lineHeight: 1.5 }}
              dangerouslySetInnerHTML={{ __html: slide.content }}
            />
          )}

          {slide.imageUrl && (
            <div className="w-full rounded-xl overflow-hidden mt-6 shadow animate-fade-in" style={{ maxHeight: '180px' }}>
              <img src={proxify(slide.imageUrl)} alt={slide.title} crossOrigin="anonymous" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      )}

      {/* Módulo 10: Comparativo de Opções */}
      {isComparativo && (
        <div className="w-full flex flex-col text-left z-10 h-full pt-4 font-sans" style={{ transform: `translate(${slide.textOffsetX || 0}px, ${slide.textOffsetY || 0}px)` }}>
          {slide.title && (
            <h2 
              style={{ color: textColor, fontSize: 16, fontWeight: 800, fontFamily: finalTitleFont, textAlign: 'center', marginBottom: 12 }}
              dangerouslySetInnerHTML={{ __html: slide.title }}
            />
          )}
          {slide.content && (
            <p 
              style={{ color: mutedTextColor, fontSize: 12, fontWeight: 300, fontFamily: finalBodyFont, lineHeight: 1.4, marginTop: -8, marginBottom: 8, textAlign: 'center' }}
              dangerouslySetInnerHTML={{ __html: slide.content }}
            />
          )}

          <div className="flex-1 flex flex-col relative bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-12">
            <div className="flex border-b border-white/10 bg-white/5 py-2 items-center">
              <div className="w-1/3 p-2 text-[10px] font-semibold text-white/50 uppercase font-sans">
                Critério
              </div>
              <div 
                className="w-1/3 p-2 text-center text-xs font-bold font-sans flex flex-col items-center gap-1.5"
                style={{ 
                  color: slide.comparisonWinner === 'A' ? palette.BRAND_ACCENT : 'rgba(255,255,255,0.7)',
                  transform: slide.comparisonWinner === 'A' ? 'scale(1.05)' : 'none'
                }}
              >
                {slide.comparisonImageA && (
                  <div className="w-11 h-11 rounded-lg overflow-hidden border border-white/10 bg-black/20 shrink-0">
                    <img 
                      src={proxify(slide.comparisonImageA)} 
                      alt={slide.comparisonOptionA || 'Opção A'} 
                      crossOrigin="anonymous" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                )}
                <span>{slide.comparisonOptionA || 'Opção A'}</span>
              </div>
              <div 
                className="w-1/3 p-2 text-center text-xs font-bold font-sans flex flex-col items-center gap-1.5"
                style={{ 
                  color: slide.comparisonWinner === 'B' ? palette.BRAND_ACCENT : 'rgba(255,255,255,0.7)',
                  transform: slide.comparisonWinner === 'B' ? 'scale(1.05)' : 'none'
                }}
              >
                {slide.comparisonImageB && (
                  <div className="w-11 h-11 rounded-lg overflow-hidden border border-white/10 bg-black/20 shrink-0">
                    <img 
                      src={proxify(slide.comparisonImageB)} 
                      alt={slide.comparisonOptionB || 'Opção B'} 
                      crossOrigin="anonymous" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                )}
                <span>{slide.comparisonOptionB || 'Opção B'}</span>
              </div>
            </div>

            {slide.comparisonWinner === 'A' && (
              <div className="absolute left-[33.33%] right-[33.33%] top-0 bottom-0 bg-white/5 z-0 pointer-events-none" />
            )}
            {slide.comparisonWinner === 'B' && (
              <div className="absolute left-[66.66%] right-0 top-0 bottom-0 bg-white/5 z-0 pointer-events-none" />
            )}

            <div className="flex-1 flex flex-col justify-center">
              {slide.comparisonRows?.slice(0, 5).map((row: any, i: number) => {
                const renderVal = (v: string) => {
                  if (v === 'yes') return <span style={{ color: palette.BRAND_ACCENT, fontWeight: 900 }}>✓</span>;
                  if (v === 'no') return <span style={{ color: '#EF4444', fontWeight: 900 }}>✗</span>;
                  return <span style={{ color: 'rgba(255,255,255,0.5)' }}>~</span>;
                };

                return (
                  <div key={i} className="flex border-b border-white/5 py-1.5 z-10 items-center">
                    <div 
                      className="w-1/3 pl-3 text-[11px] text-white/70 font-sans truncate"
                      dangerouslySetInnerHTML={{ __html: row.label }}
                    />
                    <div className="w-1/3 text-center text-sm">
                      {renderVal(row.valueA)}
                    </div>
                    <div className="w-1/3 text-center text-sm">
                      {renderVal(row.valueB)}
                    </div>
                  </div>
                );
              })}
            </div>

            {slide.comparisonVerdict && (
              <div className="border-t border-white/10 bg-white/5 p-2 text-center z-10">
                <span className="text-[10px] font-bold text-white uppercase font-sans">
                  Veredito:
                </span>
                <span style={{ color: palette.BRAND_ACCENT, fontSize: 11, fontWeight: 700, marginLeft: 6 }}>
                  {slide.comparisonVerdict}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Módulo 11: Citação de Especialista */}
      {isCitacaoEspecialista && (
        <div className="absolute inset-0 flex z-10 text-left">
          <div className="w-2/5 h-full bg-[#111] relative overflow-hidden">
            {slide.expertPhoto ? (
              <img 
                src={proxify(slide.expertPhoto)} 
                alt={slide.expertName} 
                crossOrigin="anonymous" 
                className="w-full h-full object-cover filter grayscale opacity-85 animate-fade-in" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/20 text-4xl font-bold font-serif">
                {(slide.expertName || 'E').charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="w-3/5 h-full flex flex-col justify-center p-6 bg-black relative">
            <span style={{ color: palette.BRAND_ACCENT, fontSize: 50, fontFamily: 'Georgia, serif', lineHeight: 0.1, marginBottom: 8 }}>
              “
            </span>
            <p 
              style={{ color: '#ffffff', fontSize: 13.5, fontStyle: 'italic', fontWeight: 600, fontFamily: 'Georgia, serif', lineHeight: 1.4, marginBottom: 12 }}
              dangerouslySetInnerHTML={{ __html: `"${slide.content || slide.title || 'Citação do especialista.'}"` }}
            />
            
            <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />

            <h3 style={{ color: '#ffffff', fontSize: 13, fontWeight: 700, fontFamily: finalBodyFont, lineHeight: 1.2 }}>
              {slide.expertName || 'Nome do Especialista'}
            </h3>
            {slide.expertRole && (
              <p style={{ color: palette.BRAND_ACCENT, fontSize: 10, fontWeight: 400, fontFamily: finalBodyFont, marginTop: 1 }}>
                {slide.expertRole}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Módulo 12: Problema */}
      {isProblema && (
        <div className="w-full flex flex-col items-center justify-center text-center z-10 py-12 gap-3" style={{ transform: `translate(${slide.textOffsetX || 0}px, ${slide.textOffsetY || 0}px)`, minHeight: '80%' }}>
          <span className="absolute top-10 text-[10px] font-bold tracking-widest text-white/40 uppercase font-sans">
            O PROBLEMA.
          </span>
          {slide.title && (
            <h2 
              style={{ color: '#ffffff', fontSize: 24, fontWeight: 800, fontFamily: finalTitleFont, lineHeight: 1.3, maxWidth: '85%' }}
              dangerouslySetInnerHTML={{ __html: slide.title }}
            />
          )}
          {slide.content && (
            <p 
              style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 300, fontFamily: finalBodyFont, lineHeight: 1.5, maxWidth: '80%' }}
              dangerouslySetInnerHTML={{ __html: slide.content }}
            />
          )}
          
          <div className="absolute bottom-12 text-center text-xl text-white/50 animate-bounce">
            →
          </div>
        </div>
      )}

      {/* Módulo 12: Solução */}
      {isSolucao && (
        <div className="w-full flex flex-col items-center justify-center text-center z-10 py-12 gap-3" style={{ transform: `translate(${slide.textOffsetX || 0}px, ${slide.textOffsetY || 0}px)`, minHeight: '80%' }}>
          <span className="absolute top-10 text-[10px] font-bold tracking-widest text-white/80 uppercase font-sans" style={{ color: palette.BRAND_ACCENT }}>
            A SOLUÇÃO.
          </span>
          {(() => {
            const cleanTitle = (slide.title || 'Solução definitiva').replace(/<[^>]*>/g, '');
            const words = cleanTitle.split(/\s+/);
            const lastWord = words.pop() || '';
            const baseText = words.join(' ');
            
            return (
              <div className="flex flex-col items-center justify-center text-center gap-3">
                <h2 style={{ color: '#ffffff', fontSize: 24, fontWeight: 800, fontFamily: finalTitleFont, lineHeight: 1.3, maxWidth: '85%' }}>
                  {baseText}{' '}
                  <span style={{ color: palette.BRAND_ACCENT, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 500 }}>
                    {lastWord}
                  </span>
                </h2>
                {slide.content && (
                  <p 
                    style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 300, fontFamily: finalBodyFont, lineHeight: 1.5, maxWidth: '80%' }}
                    dangerouslySetInnerHTML={{ __html: slide.content }}
                  />
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Módulo 13: Timeline */}
      {isTimeline && (
        <div className="w-full flex flex-col z-10 text-left h-full pt-4" style={{ transform: `translate(${slide.textOffsetX || 0}px, ${slide.textOffsetY || 0}px)` }}>
          {slide.title && (
            <h2 
              style={{ color: textColor, fontSize: 16, fontWeight: 800, fontFamily: finalTitleFont, textAlign: 'center', marginBottom: 16 }}
              dangerouslySetInnerHTML={{ __html: slide.title }}
            />
          )}
          {slide.content && (
            <p 
              style={{ color: mutedTextColor, fontSize: 12, fontWeight: 300, fontFamily: finalBodyFont, lineHeight: 1.4, marginTop: -12, marginBottom: 12, textAlign: 'center' }}
              dangerouslySetInnerHTML={{ __html: slide.content }}
            />
          )}

          <div className="flex-1 flex flex-col relative pl-6 ml-6 border-l border-white/20 py-4 justify-between mb-12">
            {slide.items?.slice(0, 5).map((item: any, i: number) => {
              const isLastMilestone = i === (slide.items.length - 1) || i === 4;
              
              return (
                <div key={i} className="relative flex flex-col mb-4 last:mb-0">
                  <div 
                    className="absolute -left-[30px] top-1 rounded-full flex items-center justify-center transition-all"
                    style={{
                      width: isLastMilestone ? 14 : 10,
                      height: isLastMilestone ? 14 : 10,
                      backgroundColor: palette.BRAND_ACCENT,
                      boxShadow: isLastMilestone ? `0 0 0 3px rgba(255,255,255,0.2)` : 'none',
                      left: isLastMilestone ? '-32px' : '-29px'
                    }}
                  />
                  
                  <div className="flex items-baseline gap-2">
                    {item.date && (
                      <span style={{ color: palette.BRAND_ACCENT, fontSize: 12, fontWeight: 700, fontFamily: finalTitleFont }}>
                        {item.date}
                      </span>
                    )}
                    <span 
                      style={{ color: textColor, fontSize: isLastMilestone ? 14 : 12.5, fontWeight: 700, fontFamily: finalBodyFont }}
                      dangerouslySetInnerHTML={{ __html: item.label }}
                    />
                  </div>

                  {item.description && (
                    <p 
                      style={{ color: mutedTextColor, fontSize: 10.5, fontWeight: 300, fontFamily: finalBodyFont, marginTop: 2 }}
                      dangerouslySetInnerHTML={{ __html: item.description }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Default Layout */}
      {!isForbes && !isTwitter && !isFrases && !hasCustomLayout && (
        <div 
          className="relative z-10 flex flex-col gap-3 w-full mt-16"
          style={{
            transform: `translate(${slide.textOffsetX || 0}px, ${slide.textOffsetY || 0}px)`
          }}
        >
          {slide.tag && typeof slide.tag === 'string' && (
            <span 
              style={{ 
                color: tagColor, 
                fontSize: 10, 
                fontWeight: 600, 
                letterSpacing: 2, 
                textTransform: 'uppercase',
                fontFamily: finalBodyFont,
                marginBottom: -4,
                wordBreak: 'break-word',
                overflowWrap: 'break-word'
              }}
            >
              {slide.tag}
            </span>
          )}

          {slide.imagePosition === 'top' && renderImage()}

          {(() => {
            const baseFontSize = (slide.title?.length || 0) > 40 ? 24 : (slide.imageUrl && slide.imagePosition !== 'background' ? 28 : 32);
            const finalFontSize = baseFontSize * (slide.titleFontSize ?? 1);
            
            let finalTextColor = textColor;

            let titleExtraStyles: React.CSSProperties = {};
            if (slide.titleEffect === 'text-gradient') {
              titleExtraStyles = {
                background: `linear-gradient(90deg, ${slide.titleEffectColors?.[0] || palette.BRAND_PRIMARY}, ${slide.titleEffectColors?.[1] || palette.BRAND_SECONDARY})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
                display: 'inline-block'
              };
            } else if (slide.titleEffect === 'bg-solid') {
              titleExtraStyles = {
                backgroundColor: slide.titleEffectColors?.[0] || palette.BRAND_PRIMARY,
                color: slide.titleEffectColors?.[1] || (isBgLight ? '#FFFFFF' : palette.DARK_BG),
                padding: '4px 8px',
                borderRadius: '4px',
                display: 'inline-block'
              };
              finalTextColor = titleExtraStyles.color as string;
            } else if (slide.titleEffect === 'bg-gradient') {
              titleExtraStyles = {
                background: `linear-gradient(90deg, ${slide.titleEffectColors?.[0] || palette.BRAND_PRIMARY}, ${slide.titleEffectColors?.[1] || palette.BRAND_SECONDARY})`,
                color: '#FFFFFF',
                padding: '4px 8px',
                borderRadius: '4px',
                display: 'inline-block'
              };
              finalTextColor = '#FFFFFF';
            }

            return (
              <h2 
                style={{ 
                  color: finalTextColor, 
                  fontSize: finalFontSize, 
                  fontWeight: 600, 
                  letterSpacing: (slide.titleLetterSpacing !== undefined) ? `${slide.titleLetterSpacing}px` : '-0.5px', 
                  lineHeight: (slide.titleLineHeight !== undefined) ? slide.titleLineHeight : 1.15,
                  fontFamily: finalTitleFont,
                  ...titleExtraStyles
                }}
                dangerouslySetInnerHTML={{ __html: slide.title || '' }}
              />
            );
          })()}

          {(!isExtendedFromPrev && !hasBgImage && !isAiBackground && !slide.imageUrl && slide.title && slide.content) && (
            <div style={{ width: 48, height: 4, background: tagColor, borderRadius: 2, margin: '8px 0', opacity: 0.8 }} />
          )}

          {(!slide.imagePosition || slide.imagePosition === 'center') && renderImage()}

          {slide.content && (
            <p 
              style={{ 
                color: mutedTextColor, 
                fontSize: (!slide.imageUrl && !isExtendedFromPrev && !hasBgImage && !isAiBackground) ? 15 : 13, 
                lineHeight: (!slide.imageUrl && !isExtendedFromPrev && !hasBgImage && !isAiBackground) ? 1.55 : 1.45,
                fontFamily: finalBodyFont
              }}
              dangerouslySetInnerHTML={{ __html: slide.content || '' }}
            />
          )}

          {/* Items (Features/Steps) */}
          {slide.items && slide.items.length > 0 && (
            <div className="flex flex-col gap-2 mt-1">
              {slide.items.map((item: any, i: number) => (
                <div 
                  key={i} 
                  className="flex items-start gap-3 py-1.5"
                  style={{ borderBottom: `1px solid ${borderColor}` }}
                >
                  {slide.type === 'how-to' ? (
                    <span style={{ color: palette.BRAND_PRIMARY, fontSize: 22, fontWeight: 300, fontFamily: finalTitleFont, lineHeight: 1, minWidth: 28 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  ) : (
                    <span style={{ color: palette.BRAND_PRIMARY, fontSize: 14, width: 16, textAlign: 'center' }}>
                      {item.icon || '✨'}
                    </span>
                  )}
                  <div className="flex flex-col text-left">
                    <span style={{ color: textColor, fontSize: (!slide.imageUrl && !isExtendedFromPrev && !hasBgImage && !isAiBackground) ? 14 : 13, fontWeight: 600, fontFamily: finalBodyFont }}>{item.label}</span>
                    {item.description && (
                      <span style={{ color: mutedTextColor, fontSize: (!slide.imageUrl && !isExtendedFromPrev && !hasBgImage && !isAiBackground) ? 12 : 11, fontFamily: finalBodyFont, marginTop: 2 }}>{item.description}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quote Box */}
          {slide.quote && (
            <div 
              style={{ 
                padding: 14, 
                background: isBgLight ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.15)', 
                borderRadius: 12, 
                border: `1px solid ${isBgLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)'}`,
                marginTop: 4,
                textAlign: 'left'
              }}
            >
              <p style={{ fontSize: (!slide.imageUrl && !isExtendedFromPrev && !hasBgImage && !isAiBackground) ? 14 : 12, color: mutedTextColor, marginBottom: 4, fontFamily: finalBodyFont }}>
                {slide.quote.label}
              </p>
              <p style={{ fontSize: (!slide.imageUrl && !isExtendedFromPrev && !hasBgImage && !isAiBackground) ? 18 : 14, color: textColor, fontStyle: 'italic', lineHeight: 1.4, fontFamily: finalTitleFont }}>
                "{slide.quote.text}"
              </p>
            </div>
          )}

          {slide.imagePosition === 'bottom' && renderImage()}

          {/* CTA Button */}
          {slide.type === 'cta' && slide.ctaText && (
            <div className={`flex ${slide.alignment === 'center' ? 'justify-center' : slide.alignment === 'right' ? 'justify-end' : 'justify-start'} mt-2`}>
              <div 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  padding: (!slide.imageUrl && !isExtendedFromPrev && !hasBgImage && !isAiBackground) ? '12px 28px' : '10px 24px', 
                  background: palette.LIGHT_BG, 
                  color: palette.BRAND_ACCENT, 
                  fontFamily: finalBodyFont, 
                  fontWeight: 600, 
                  fontSize: (!slide.imageUrl && !isExtendedFromPrev && !hasBgImage && !isAiBackground) ? 14 : 13, 
                  borderRadius: 24,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                {slide.ctaText}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Forbes Extra Elements */}
      {isForbes && (
        <>
          {/* Right Middle Badge & Arrow */}
          {handle && (
            <div className="absolute right-9 top-[55%] -translate-y-1/2 flex items-center gap-2 z-20">
              <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-[10px] font-bold border border-white/10 select-none">
                {handle.replace('@', '').toLowerCase()}
              </div>
              <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-black shadow-md cursor-pointer hover:bg-white transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </div>
          )}
        </>
      )}

      {/* Brand Watermark Bottom Center */}
      {brandName && brandName.trim() !== '' && !isTwitter && !isFrases && !isProblema && (
        <div 
          style={{
            position: 'absolute',
            bottom: '38px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '9.5px',
            color: isBgLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.35)',
            fontFamily: finalBodyFont,
            fontWeight: 600,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          {logoUrl && <img src={proxify(logoUrl)} className="w-3.5 h-3.5 rounded-full object-cover" crossOrigin="anonymous" alt="Logo" />}
          <span>{handle || brandName}</span>
        </div>
      )}

      {/* Custom Layers */}
      {slide.customLayers?.map(layer => (
        <div 
          key={layer.id}
          style={{
            position: 'absolute',
            left: `${layer.x}%`,
            top: `${layer.y}%`,
            transform: 'translate(-50%, -50%)',
            color: layer.color,
            fontSize: `${layer.fontSize}px`,
            fontFamily: layer.fontFamily,
            fontWeight: layer.fontWeight,
            fontStyle: layer.fontStyle || 'normal',
            zIndex: layer.zIndex,
            whiteSpace: 'pre-wrap',
            textAlign: 'center',
            textShadow: isBgLight ? 'none' : '0px 2px 8px rgba(0,0,0,0.4)',
            pointerEvents: 'none' // Evita interferir com outras interações como setas de swipe (embora no export não importe)
          }}
        >
          {layer.text}
        </div>
      ))}

      {/* Swipe Arrow */}
      {!isLast && !isFrases && (
        <div 
          style={{ 
            position: 'absolute', 
            right: 0, 
            top: 0, 
            bottom: 0, 
            width: 48, 
            zIndex: 9, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: `linear-gradient(to right, transparent, ${isBgLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'})`
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke={isBgLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.35)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      {/* Progress Bar */}
      {!isFrases && (
        <div 
          style={{ 
            position: 'absolute', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            padding: '16px 28px 20px', 
            zIndex: 10, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10 
          }}
        >
          <div style={{ flex: 1, height: 3, background: isBgLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((index + 1) / total) * 100}%`, background: isBgLight ? palette.BRAND_PRIMARY : '#fff', borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 11, color: isBgLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)', fontWeight: 500, fontFamily: bodyFont }}>
            {index + 1}/{total}
          </span>
        </div>
      )}
    </div>
  );
}
