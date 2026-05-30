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
  previewRef
}: CarouselPreviewProps) {
  
  if (!slides.length) return null;

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
              index={index}
              total={slides.length}
              palette={palette}
              brandName={brandName}
              logoUrl={logoUrl}
              headingFont={headingFont}
              bodyFont={bodyFont}
              prevSlide={index > 0 ? slides[index - 1] : null}
            />
          </div>
        ))}
      </div>
      
      <div className="text-sm text-gray-500 mt-2 flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        Deslize para ver todos os slides
      </div>
    </div>
  );
}

function Slide({ slide, index, total, palette, brandName, logoUrl, headingFont, bodyFont, prevSlide }: any) {
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

  let bgStyle: React.CSSProperties = {};
  let bgColorHex = palette.DARK_BG;
  
  if (isExtendedFromPrev || hasBgImage || isAiBackground) {
    bgStyle = { backgroundColor: '#000000' };
    bgColorHex = '#000000';
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

  const isBgLight = colord(bgColorHex).isLight();
  const textColor = slide.titleColor || (isBgLight ? palette.DARK_BG : '#ffffff');
  const mutedTextColor = slide.contentColor || (isBgLight ? colord(palette.DARK_BG).alpha(0.7).toRgbString() : 'rgba(255,255,255,0.8)');
  const tagColor = isBgLight ? palette.BRAND_PRIMARY : palette.BRAND_SECONDARY;
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
      const gradOpacity = slide.bgGradientOpacity ?? 0.8;
      const gradPos = slide.bgGradientPosition || 'bottom';

      let imgStyle: React.CSSProperties = {
        position: 'absolute', inset: 0, zIndex: 0,
        width: '100%', height: '100%',
        objectFit: 'cover',
        objectPosition: `${xOffset}% ${yOffset}%`,
        opacity: imgOpacity,
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
          backgroundColor: '#000'
        };
      }

      const gradient = gradPos === 'bottom' 
        ? `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,${gradOpacity}) 100%)`
        : `linear-gradient(to top, rgba(0,0,0,0) 0%, rgba(0,0,0,${gradOpacity}) 100%)`;

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

  const verticalAlign = slide.verticalAlignment === 'top' ? 'flex-start' : slide.verticalAlignment === 'center' ? 'center' : (slide.verticalAlignment === 'bottom' ? 'flex-end' : (slide.alignment === 'center' ? 'center' : 'flex-end'));

  return (
    <div 
      className="relative flex flex-col slide-container overflow-hidden"
      style={{ 
        width: 420, 
        height: 525, 
        ...bgStyle,
        padding: '0 36px 52px',
        justifyContent: verticalAlign,
        textAlign: slide.alignment,
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
      {(isFirst || isLast) && brandName && brandName.trim() !== '' && (
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

      {/* Content Area */}
      <div className="relative z-10 flex flex-col gap-3 w-full mt-16">
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
      {!isLast && (
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
    </div>
  );
}
