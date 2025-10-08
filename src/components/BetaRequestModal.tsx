'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, User, Building2, CheckCircle2, Loader2 } from 'lucide-react';

interface BetaRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BetaRequestModal: React.FC<BetaRequestModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    schoolName: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/beta-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar la solicitud');
      }

      setIsSuccess(true);
      // Reset form after 3 seconds and close modal
      setTimeout(() => {
        setFormData({ fullName: '', email: '', schoolName: '' });
        setIsSuccess(false);
        onClose();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar la solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-neutral-900 rounded-2xl border border-neutral-800 shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Header */}
              <div className="relative bg-gradient-to-br from-crystal-blue/10 to-crystal-lavender/10 border-b border-neutral-800 p-6">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
                  aria-label="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Solicitar Acceso a la Beta
                </h2>
                <p className="text-sm text-neutral-400">
                  Únete a los pioneros transformando la educación
                </p>
              </div>

              {/* Content */}
              <div className="p-6">
                {isSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-8"
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      ¡Solicitud Enviada!
                    </h3>
                    <p className="text-neutral-400">
                      Gracias por tu interés. Nos pondremos en contacto contigo pronto.
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <p className="text-sm text-red-400">{error}</p>
                      </div>
                    )}

                    {/* Full Name */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-neutral-300 mb-2">
                        <User className="w-4 h-4 text-crystal-blue" />
                        Nombre Completo
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="w-full min-h-[48px] bg-neutral-700 border border-neutral-500 rounded-xl px-4 py-3 text-sm md:text-base !text-white focus:outline-none focus:ring-2 focus:ring-crystal-blue focus:border-transparent transition-all"
                        required
                        disabled={isLoading}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-neutral-300 mb-2">
                        <Mail className="w-4 h-4 text-crystal-lavender" />
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full min-h-[48px] bg-neutral-700 border border-neutral-500 rounded-xl px-4 py-3 text-sm md:text-base !text-white focus:outline-none focus:ring-2 focus:ring-crystal-lavender focus:border-transparent transition-all"
                        required
                        disabled={isLoading}
                      />
                    </div>

                    {/* School Name */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-neutral-300 mb-2">
                        <Building2 className="w-4 h-4 text-crystal-blue" />
                        Nombre de la Escuela/Institución
                      </label>
                      <input
                        type="text"
                        name="schoolName"
                        value={formData.schoolName}
                        onChange={handleChange}
                        className="w-full min-h-[48px] bg-neutral-700 border border-neutral-500 rounded-xl px-4 py-3 text-sm md:text-base !text-white focus:outline-none focus:ring-2 focus:ring-crystal-blue focus:border-transparent transition-all"
                        required
                        disabled={isLoading}
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full min-h-[48px] bg-gradient-to-r from-crystal-blue to-crystal-lavender text-black text-sm md:text-base font-bold py-3 px-6 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Mail className="w-5 h-5" />
                          Solicitar Acceso
                        </>
                      )}
                    </button>

                    <p className="text-xs text-neutral-500 text-center">
                      Al enviar, aceptas que procesemos tu información para contactarte sobre Celestea
                    </p>
                    {/* Email de notificación: uziel@celestea.ai */}
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BetaRequestModal;
