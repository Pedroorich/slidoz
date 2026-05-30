import { colord, extend } from 'colord';
import mixPlugin from 'colord/plugins/mix';

extend([mixPlugin]);

export type VisualStyle = 'Editorial Luxo' | 'Brutalismo Moderno' | 'Minimal Tech' | 'Corporate Clean';

export function generatePalette(
  primaryHex: string,
  secondaryHex?: string,
  accentHex?: string,
  darkBgHex?: string,
  lightBgHex?: string
) {
  const primary = colord(primaryHex);
  
  const brandSecondary = secondaryHex ? colord(secondaryHex).toHex() : primary.lighten(0.2).toHex();
  const brandAccent = accentHex ? colord(accentHex).toHex() : primary.darken(0.3).toHex();
  
  const lightBg = lightBgHex ? colord(lightBgHex).toHex() : colord('#ffffff').mix(primary, 0.05).toHex();
  const lightBorder = colord(lightBg).darken(0.05).toHex();
  const darkBg = darkBgHex ? colord(darkBgHex).toHex() : colord('#111111').mix(primary, 0.1).toHex();

  return {
    BRAND_PRIMARY: primary.toHex(),
    BRAND_SECONDARY: brandSecondary,
    BRAND_ACCENT: brandAccent,
    LIGHT_BG: lightBg,
    LIGHT_BORDER: lightBorder,
    DARK_BG: darkBg,
  };
}

export const FONT_PAIRINGS = [
  // SANS-SERIF MODERNAS
  { name: 'Moderna / Bricolage', heading: 'Bricolage Grotesque', body: 'Bricolage Grotesque' },
  { name: 'Editorial Limpa / Jakarta', heading: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans' },
  { name: 'Clean / Instrument', heading: 'Instrument Sans', body: 'Instrument Sans' },
  { name: 'Versátil / DM Sans', heading: 'DM Sans', body: 'DM Sans' },
  { name: 'Minimalista / Geist', heading: 'Geist', body: 'Geist' },

  // SERIF EDITORIAIS
  { name: 'Sérifa Dinâmica / Fraunces', heading: 'Fraunces', body: 'Plus Jakarta Sans' },
  { name: 'Luxo / Instrument Serif', heading: 'Instrument Serif', body: 'Instrument Sans' },
  { name: 'Elegante / Playfair', heading: 'Playfair Display', body: 'DM Sans' },
  { name: 'Clássico / Cormorant', heading: 'Cormorant Garamond', body: 'Plus Jakarta Sans' },
  { name: 'Literário / Lora', heading: 'Lora', body: 'Lora' },
  { name: 'Tradicional / Times New Roman', heading: 'Times New Roman', body: 'Times New Roman' },

  // DISPLAY / IMPACTO
  { name: 'Impacto / Bebas Neue', heading: 'Bebas Neue', body: 'Geist' },
  { name: 'Brutalista / Monument', heading: 'Monument Extended', body: 'DM Sans' },
  { name: 'Y2K / Bagel Fat One', heading: 'Bagel Fat One', body: 'Plus Jakarta Sans' }
];

export function loadAllGoogleFonts() {
  const linkId = 'google-fonts-all';
  if (document.getElementById(linkId)) return;
  
  const families = FONT_PAIRINGS.flatMap(f => [f.heading, f.body])
    .filter((v, i, a) => a.indexOf(v) === i) // unique
    .filter(f => f !== 'Monument Extended' && f !== 'Times New Roman') // not on google fonts
    .map(f => {
      // Algumas fontes só têm peso 400 (ex: Anton, Bebas Neue, Instrument Serif, Bagel Fat One)
      if (['Anton', 'Bebas Neue', 'Instrument Serif', 'Bagel Fat One'].includes(f)) {
        return `${f.replace(/ /g, '+')}:wght@400`;
      }
      return `${f.replace(/ /g, '+')}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800`;
    })
    .join('&family=');
    
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.crossOrigin = 'anonymous';
  link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
  document.head.appendChild(link);
}
