import React, { useState, useEffect } from 'react';
import { MenuIcon, X, Lightbulb, Sparkles, Moon, Sun } from 'lucide-react';
import { textStyles, opacityVariants } from '@/styles/typography';
import Container from './Container';
import Button from './Button';
import { useTheme } from '../context/ThemeContext';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-[#0D1117]/90 backdrop-blur-sm border-b border-[#1A1E26]/80 py-3' 
          : 'bg-transparent py-5'
      }`}
    >
      <Container>
        <nav className="flex items-center justify-between">
          <div className="flex items-center">
            <Sparkles className="w-8 h-8 text-turquoise" />
            <span className="ml-2 text-2xl font-general-sans font-black bg-gradient-to-r from-turquoise to-lime bg-clip-text text-transparent">
              Celestea<span className="text-base">AI</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#product" className={`${textStyles.button} ${opacityVariants.primary} hover:text-turquoise transition-colors`}>Product</a>
            <a href="#solutions" className={`${textStyles.button} ${opacityVariants.primary} hover:text-turquoise transition-colors`}>Solutions</a>
            <a href="#pricing" className={`${textStyles.button} ${opacityVariants.primary} hover:text-turquoise transition-colors`}>Pricing</a>
            <a href="#resources" className={`${textStyles.button} ${opacityVariants.primary} hover:text-turquoise transition-colors`}>Resources</a>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-white/90" />
              ) : (
                <Moon className="w-5 h-5 text-white/90" />
              )}
            </button>
            <Button variant="secondary">
              <Sparkles className="w-4 h-4 mr-2" />
              Book Demo
            </Button>
          </div>
          
          <div className="md:hidden flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-white/90" />
              ) : (
                <Moon className="w-5 h-5 text-white/90" />
              )}
            </button>
            <button 
              className="text-white/90 focus:outline-none"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
            </button>
          </div>
        </nav>
      </Container>
      
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#0D1117]/95 backdrop-blur-sm border-b border-[#1A1E26]/80 py-4 px-6 flex flex-col space-y-4">
          <a href="#product" className={`${textStyles.button} ${opacityVariants.primary} py-2`} onClick={() => setIsMenuOpen(false)}>Product</a>
          <a href="#solutions" className={`${textStyles.button} ${opacityVariants.primary} py-2`} onClick={() => setIsMenuOpen(false)}>Solutions</a>
          <a href="#pricing" className={`${textStyles.button} ${opacityVariants.primary} py-2`} onClick={() => setIsMenuOpen(false)}>Pricing</a>
          <a href="#resources" className={`${textStyles.button} ${opacityVariants.primary} py-2`} onClick={() => setIsMenuOpen(false)}>Resources</a>
          <Button variant="secondary" className="w-full">
            <Sparkles className="w-4 h-4 mr-2" />
            Book Demo
          </Button>
        </div>
      )}
    </header>
  );
};

export default Navbar;