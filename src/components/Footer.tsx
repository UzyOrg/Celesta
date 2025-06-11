import React from 'react';
import Link from 'next/link';
import { Twitter, Linkedin, Youtube, Instagram, Lightbulb } from 'lucide-react';
import Container from './Container';
import { headingStyles, textStyles, opacityVariants } from '@/styles/typography';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#090B10] pt-12 sm:pt-16 pb-6 sm:pb-8 border-t border-[#1A1E26]">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-y-8 gap-x-6 md:gap-8 pb-8 sm:pb-12 border-b border-[#1A1E26]">
          <div className="lg:col-span-4">
            <div className="flex items-center mb-4">
              <Lightbulb className="w-6 h-6 text-turquoise" />
              <span className="ml-2 text-xl font-inter-tight font-black bg-gradient-to-r from-turquoise to-lime bg-clip-text text-transparent">
                Celestea<span className="text-sm">AI</span>
              </span>
            </div>
            <p className={`${textStyles.body} text-sm sm:text-base ${opacityVariants.secondary} mb-4 sm:mb-6`}>
              Potenciamos la educación con IA que enseña, mide y fortalece el rol fundamental del educador.
            </p>
            <div className="flex space-x-3 sm:space-x-4">
              <a href="#" className={`${opacityVariants.tertiary} hover:text-turquoise transition-colors`} aria-label="Twitter">
                <Twitter size={20} />
              </a>
              <a href="#" className={`${opacityVariants.tertiary} hover:text-turquoise transition-colors`} aria-label="LinkedIn">
                <Linkedin size={20} />
              </a>
              <a href="#" className={`${opacityVariants.tertiary} hover:text-turquoise transition-colors`} aria-label="YouTube">
                <Youtube size={20} />
              </a>
              <a href="#" className={`${opacityVariants.tertiary} hover:text-turquoise transition-colors`} aria-label="Instagram">
                <Instagram size={20} />
              </a>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <h3 className={`${headingStyles.subsection} text-base sm:text-lg text-white mb-3 sm:mb-4`}>Product</h3>
            <ul className="space-y-1.5 sm:space-y-2">
              <li><a href="#" className={`${textStyles.body} text-sm sm:text-base ${opacityVariants.secondary} hover:text-turquoise transition-colors`}>Tutor Socrático IA</a></li>
              <li><a href="#" className={`${textStyles.body} text-sm sm:text-base ${opacityVariants.secondary} hover:text-turquoise transition-colors`}>Métricas de Aprendizaje</a></li>
              <li><a href="#" className={`${textStyles.body} text-sm sm:text-base ${opacityVariants.secondary} hover:text-turquoise transition-colors`}>Copiloto IA Docente</a></li>
              <li><a href="#" className={`${textStyles.body} text-sm sm:text-base ${opacityVariants.secondary} hover:text-turquoise transition-colors`}>Integraciones Flexibles</a></li>
              
            </ul>
          </div>
          
          <div className="lg:col-span-2">
            <h3 className={`${headingStyles.subsection} text-base sm:text-lg text-white mb-3 sm:mb-4`}>Resources</h3>
            <ul className="space-y-1.5 sm:space-y-2">
              <li><a href="#" className={`${textStyles.body} text-sm sm:text-base ${opacityVariants.secondary} hover:text-turquoise transition-colors`}>Documentation</a></li>
              <li><a href="#" className={`${textStyles.body} text-sm sm:text-base ${opacityVariants.secondary} hover:text-turquoise transition-colors`}>Case Studies</a></li>
              <li><a href="#" className={`${textStyles.body} text-sm sm:text-base ${opacityVariants.secondary} hover:text-turquoise transition-colors`}>Blog</a></li>
              <li><a href="#" className={`${textStyles.body} text-sm sm:text-base ${opacityVariants.secondary} hover:text-turquoise transition-colors`}>Webinars</a></li>
              <li><a href="#" className={`${textStyles.body} text-sm sm:text-base ${opacityVariants.secondary} hover:text-turquoise transition-colors`}>API</a></li>
            </ul>
          </div>
          
          <div className="lg:col-span-2">
            <h3 className={`${headingStyles.subsection} text-base sm:text-lg text-white mb-3 sm:mb-4`}>Company</h3>
            <ul className="space-y-1.5 sm:space-y-2">
              <li><a href="#" className={`${textStyles.body} text-sm sm:text-base ${opacityVariants.secondary} hover:text-turquoise transition-colors`}>About</a></li>
              <li><a href="#" className={`${textStyles.body} text-sm sm:text-base ${opacityVariants.secondary} hover:text-turquoise transition-colors`}>Team</a></li>
              <li><a href="#" className={`${textStyles.body} text-sm sm:text-base ${opacityVariants.secondary} hover:text-turquoise transition-colors`}>Careers</a></li>
              <li><a href="#" className={`${textStyles.body} text-sm sm:text-base ${opacityVariants.secondary} hover:text-turquoise transition-colors`}>Press</a></li>
              <li><a href="#" className={`${textStyles.body} text-sm sm:text-base ${opacityVariants.secondary} hover:text-turquoise transition-colors`}>Contact</a></li>
            </ul>
          </div>
          
          <div className="lg:col-span-2">
            <h3 className={`${headingStyles.subsection} text-base sm:text-lg text-white mb-3 sm:mb-4`}>Legal</h3>
            <ul className="space-y-1.5 sm:space-y-2">
              <li><a href="#" className={`${textStyles.body} text-sm sm:text-base ${opacityVariants.secondary} hover:text-turquoise transition-colors`}>Terms</a></li>
              <li><Link href="/privacy-policy" className={`${textStyles.body} text-sm sm:text-base ${opacityVariants.secondary} hover:text-turquoise transition-colors`}>Privacy Policy</Link></li>
              <li><a href="#" className={`${textStyles.body} text-sm sm:text-base ${opacityVariants.secondary} hover:text-turquoise transition-colors`}>Cookies</a></li>
              <li><a href="#" className={`${textStyles.body} text-sm sm:text-base ${opacityVariants.secondary} hover:text-turquoise transition-colors`}>Licenses</a></li>
              <li><a href="#" className={`${textStyles.body} text-sm sm:text-base ${opacityVariants.secondary} hover:text-turquoise transition-colors`}>Settings</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-6 sm:pt-8 flex flex-col md:flex-row items-center justify-between">
          <p className={`${textStyles.small} text-xs sm:text-sm ${opacityVariants.tertiary} mb-4 md:mb-0`}>
            &copy; {new Date().getFullYear()} Celestea AI. Todos los derechos reservados.
          </p>
          <div className="flex space-x-4 sm:space-x-6">
            <a href="#" className={`${textStyles.small} text-xs sm:text-sm ${opacityVariants.tertiary} hover:text-turquoise transition-colors`}>Terms</a>
            <a href="#" className={`${textStyles.small} text-xs sm:text-sm ${opacityVariants.tertiary} hover:text-turquoise transition-colors`}>Privacy</a>
            <a href="#" className={`${textStyles.small} text-xs sm:text-sm ${opacityVariants.tertiary} hover:text-turquoise transition-colors`}>Cookies</a>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;