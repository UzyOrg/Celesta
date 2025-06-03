import React from 'react';
import { motion } from 'framer-motion';
import { textStyles, opacityVariants } from '../styles/typography';
import { ShieldCheck } from 'lucide-react';
import Container from './Container';

const trustLogos = [
  { name: 'University Partner', delay: 0 },
  { name: 'Tech Company', delay: 0.1 },
  { name: 'Educational Institute', delay: 0.2 },
  { name: 'Research Center', delay: 0.3 },
  { name: 'Industry Leader', delay: 0.4 },
];

const TrustSection: React.FC = () => {
  return (
    <section className="pt-24 pb-24">
      <Container>
        <div className="border-t border-[#1A1E26]/80 pt-16">
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className={`${textStyles.small} ${opacityVariants.secondary} font-medium inline-flex items-center px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm`}
            >
              <ShieldCheck className="w-4 h-4 mr-2 text-turquoise" />
              <span className={`${textStyles.button} ${opacityVariants.primary}`}>Trusted by Leading Organizations</span>
            </motion.div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center justify-items-center">
            {trustLogos.map((logo, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: logo.delay }}
                viewport={{ once: true }}
                className="flex items-center justify-center h-16 w-full"
              >
                <div className="h-12 w-32 rounded-lg bg-white/5 backdrop-blur-sm flex items-center justify-center">
                  <span className={`${textStyles.small} ${opacityVariants.secondary} font-medium`}>{logo.name}</span>
                </div>
              </motion.div>
            ))}
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
          >
            <p className={`${textStyles.largeBody} ${opacityVariants.secondary} max-w-2xl mx-auto`}>
              Join the community of forward-thinking organizations leveraging responsible AI to transform educational outcomes.
            </p>
          </motion.div>
        </div>
      </Container>
    </section>
  );
};

export default TrustSection;