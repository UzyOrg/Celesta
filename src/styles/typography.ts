// src/styles/typography.ts

export const fontFamilies = {
  plusJakartaSans: "'Plus Jakarta Sans', sans-serif",
  generalSans: "'General Sans', sans-serif",
  interTight: "'Inter Tight', sans-serif", // Added for the logo in Footer
};

export const headingStyles = {
  h1: `font-plus-jakarta-sans text-5xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl`,
  h2: `font-plus-jakarta-sans text-[24px] sm:text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl`,
  h3: `font-plus-jakarta-sans text-3xl font-bold leading-snug tracking-tight md:text-4xl lg:text-5xl`,
  h4: `font-plus-jakarta-sans text-2xl font-semibold leading-snug tracking-tight md:text-3xl lg:text-4xl`,
  subsection: `font-plus-jakarta-sans text-xs sm:text-lg font-bold leading-normal`,
  cardTitle: `font-plus-jakarta-sans text-xl font-semibold leading-normal md:text-2xl`,
};

export const textStyles = {
  body: `font-plus-jakarta-sans text-base leading-relaxed`,
  largeBody: `font-plus-jakarta-sans text-xs leading-relaxed sm:text-lg md:text-xl`,
  small: `font-plus-jakarta-sans text-sm leading-normal`,
  caption: `font-plus-jakarta-sans text-xs leading-normal`,
  button: `font-plus-jakarta-sans font-medium text-base`,
};

export const opacityVariants = {
  primary: 'text-white',
  secondary: 'text-white/70',
  tertiary: 'text-white/60',
  disabled: 'text-white/40',
  linkHover: 'hover:text-turquoise',
};

// Example of a combined style for convenience, if needed
export const emphasizedBodyText = `${textStyles.largeBody} ${opacityVariants.primary}`;

// Responsive typography utility example (conceptual)
// export const responsiveHeading = (level: keyof typeof headingStyles) => {
//   const baseStyle = headingStyles[level];
//   // Add responsive modifiers here if needed, e.g., using clamp or media queries indirectly
//   return `${baseStyle}`;
// };
