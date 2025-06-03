import React from 'react';
import { motion } from 'framer-motion';
import { headingStyles, textStyles, opacityVariants } from '../styles/typography';
import { Bot, Award, Laptop as Laptop3, Brain } from 'lucide-react';
import Container from './Container';

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

const Feature: React.FC<FeatureProps> = ({ icon, title, description, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      className="bg-white/5 backdrop-blur-sm rounded-2xl p-8"
    >
      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-turquoise to-lime flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className={`${headingStyles.h4} mb-3 text-white`}>{title}</h3>
      <p className={`${textStyles.body} ${opacityVariants.secondary}`}>{description}</p>
    </motion.div>
  );
};

const ProductSection: React.FC = () => {
  const features: FeatureProps[] = [
    {
      icon: <Bot className="w-6 h-6 text-white" />,
      title: "AI Tutor Available 24/7",
      description: "Personalized learning assistance whenever students need it, providing immediate feedback and adaptive support.",
      delay: 0
    },
    {
      icon: <Award className="w-6 h-6 text-white" />,
      title: "OB3 Verified Skill Badges",
      description: "Blockchain-verified credentials that authenticate skills and achievements for real-world recognition.",
      delay: 0.1
    },
    {
      icon: <Laptop3 className="w-6 h-6 text-white" />,
      title: "Immersive VR Learning Labs",
      description: "Practical, hands-on experience in virtual environments that simulate real-world scenarios and challenges.",
      delay: 0.2
    },
    {
      icon: <Brain className="w-6 h-6 text-white" />,
      title: "Responsible AI Framework",
      description: "Built on ethical principles with transparent algorithms and data privacy protection at its core.",
      delay: 0.3
    }
  ];

  return (
    <section id="product" className="pt-24 pb-24">
      <Container>
        <div className="border-t border-[#1A1E26]/80 pt-16">
          <div className="text-center mb-16">
            <div className="relative">
              <span className="absolute -z-10 inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_rgba(5,247,255,0.35)_0%,_transparent_60%)] blur-[80px] opacity-0 motion-safe:animate-fadeGlow"></span>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className={`${headingStyles.h2} text-[clamp(2.8rem,6vw,5rem)] leading-[1.1] tracking-tight mb-6`}
              >
                Breakthrough Features for{" "}
                <span className="bg-gradient-to-r from-turquoise to-lime bg-clip-text text-transparent">
                  Modern Learning
                </span>
              </motion.h2>
            </div>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className={`${textStyles.largeBody} max-w-3xl mx-auto ${opacityVariants.secondary}`}
            >
              Our platform combines cutting-edge AI with practical educational tools to deliver measurable results for institutions and businesses.
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Feature key={index} {...feature} />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default ProductSection;