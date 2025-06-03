import React from 'react';
import { Lightbulb, Twitter, Linkedin, Youtube, Instagram } from 'lucide-react';
import Container from './Container';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#090B10] pt-16 pb-8 border-t border-[#1A1E26]">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 pb-12 border-b border-[#1A1E26]">
          <div className="lg:col-span-4">
            <div className="flex items-center mb-4">
              <Lightbulb className="w-6 h-6 text-turquoise" />
              <span className="ml-2 text-xl font-inter-tight font-black bg-gradient-to-r from-turquoise to-lime bg-clip-text text-transparent">
                EduTech<span className="text-sm">AI</span>
              </span>
            </div>
            <p className="text-white/70 mb-6">
              Transforming education through responsible AI, empowering organizations to deliver exceptional learning experiences.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-white/60 hover:text-turquoise transition-colors" aria-label="Twitter">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-white/60 hover:text-turquoise transition-colors" aria-label="LinkedIn">
                <Linkedin size={20} />
              </a>
              <a href="#" className="text-white/60 hover:text-turquoise transition-colors" aria-label="YouTube">
                <Youtube size={20} />
              </a>
              <a href="#" className="text-white/60 hover:text-turquoise transition-colors" aria-label="Instagram">
                <Instagram size={20} />
              </a>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <h3 className="font-inter-tight font-bold text-lg mb-4 text-white">Product</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-white/70 hover:text-turquoise transition-colors">AI Tutor</a></li>
              <li><a href="#" className="text-white/70 hover:text-turquoise transition-colors">OB3 Badges</a></li>
              <li><a href="#" className="text-white/70 hover:text-turquoise transition-colors">VR Labs</a></li>
              <li><a href="#" className="text-white/70 hover:text-turquoise transition-colors">Analytics</a></li>
              <li><a href="#" className="text-white/70 hover:text-turquoise transition-colors">Integration</a></li>
            </ul>
          </div>
          
          <div className="lg:col-span-2">
            <h3 className="font-inter-tight font-bold text-lg mb-4 text-white">Resources</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-white/70 hover:text-turquoise transition-colors">Documentation</a></li>
              <li><a href="#" className="text-white/70 hover:text-turquoise transition-colors">Case Studies</a></li>
              <li><a href="#" className="text-white/70 hover:text-turquoise transition-colors">Blog</a></li>
              <li><a href="#" className="text-white/70 hover:text-turquoise transition-colors">Webinars</a></li>
              <li><a href="#" className="text-white/70 hover:text-turquoise transition-colors">API</a></li>
            </ul>
          </div>
          
          <div className="lg:col-span-2">
            <h3 className="font-inter-tight font-bold text-lg mb-4 text-white">Company</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-white/70 hover:text-turquoise transition-colors">About</a></li>
              <li><a href="#" className="text-white/70 hover:text-turquoise transition-colors">Team</a></li>
              <li><a href="#" className="text-white/70 hover:text-turquoise transition-colors">Careers</a></li>
              <li><a href="#" className="text-white/70 hover:text-turquoise transition-colors">Press</a></li>
              <li><a href="#" className="text-white/70 hover:text-turquoise transition-colors">Contact</a></li>
            </ul>
          </div>
          
          <div className="lg:col-span-2">
            <h3 className="font-inter-tight font-bold text-lg mb-4 text-white">Legal</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-white/70 hover:text-turquoise transition-colors">Terms</a></li>
              <li><a href="#" className="text-white/70 hover:text-turquoise transition-colors">Privacy</a></li>
              <li><a href="#" className="text-white/70 hover:text-turquoise transition-colors">Cookies</a></li>
              <li><a href="#" className="text-white/70 hover:text-turquoise transition-colors">Licenses</a></li>
              <li><a href="#" className="text-white/70 hover:text-turquoise transition-colors">Settings</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between">
          <p className="text-sm text-white/60 mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} EduTechAI. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <a href="#" className="text-sm text-white/60 hover:text-turquoise transition-colors">Terms</a>
            <a href="#" className="text-sm text-white/60 hover:text-turquoise transition-colors">Privacy</a>
            <a href="#" className="text-sm text-white/60 hover:text-turquoise transition-colors">Cookies</a>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;