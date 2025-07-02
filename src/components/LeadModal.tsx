// TODO: Internacionalizar (i18n) todos los textos para soportar múltiples idiomas.
'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { fontFamilies } from '../styles/typography';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import { CheckCircle, PartyPopper } from 'lucide-react';
import { useModal } from '@/context/ModalContext';

const schema = z.object({
  name: z.string().min(2, 'Ingresa tu nombre'),
  email: z.string().email('Correo electrónico inválido'),
  phone: z.string()
    .transform((val) => (val?.trim() === '' ? undefined : val?.trim()))
    .optional()
    .refine((val) => val === undefined || /^[+]?[0-9]{10,15}$/.test(val ?? ''), {
      message: "Número de teléfono inválido",
    }),
  company: z.string()
    .transform((val) => val.trim() === '' ? undefined : val.trim())
    .optional()
    .refine((val) => val === undefined || val.length >= 2, {
      message: "El nombre de la empresa debe tener al menos 2 caracteres",
    }),
  size: z.string()
    .transform((val) => val === '' ? undefined : val)
    .optional()
    .refine((val) => val === undefined || ['1-10', '11-50', '51-200', '200+'].includes(val ?? ''), {
      message: "Selecciona un tamaño de empresa válido",
    }),
  pain: z.string()
    .transform((val) => val.trim() === '' ? undefined : val.trim())
    .optional()
    .refine((val) => val === undefined || val.length <= 200, {
      message: 'Máximo 200 caracteres',
    }),
});

type FormValues = z.infer<typeof schema>;

export default function LeadModal() {
  const { isLeadModalOpen: open, closeLeadModal: onClose } = useModal();
  const [isSubmissionSuccessful, setIsSubmissionSuccessful] = useState(false);
  const [showAlreadyRegisteredView, setShowAlreadyRegisteredView] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  const submit = async (data: FormValues) => {
    setIsSubmissionSuccessful(false);
    setShowAlreadyRegisteredView(false);

    try {
      await axios.post('/api/lead', data);
      toast.success('¡Gracias por tu interés!');
      reset();
      setIsSubmissionSuccessful(true);
    } catch (error: any) {
      let errorMessage = 'Ocurrió un error, por favor intenta de nuevo.';
      if (axios.isAxiosError(error) && error.response) {
        const { status, data: responseData } = error.response;
        if (status === 409 && responseData?.emailExists) {
          setShowAlreadyRegisteredView(true);
          return;
        }
        if (responseData?.error) {
          errorMessage = responseData.error;
        } else if (responseData?.message) {
          errorMessage = responseData.message;
        }
      }
      toast.error(errorMessage);
    }
  };

  const handleCloseModal = () => {
    onClose();
    setTimeout(() => {
      setIsSubmissionSuccessful(false);
      setShowAlreadyRegisteredView(false);
    }, 300);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          onClick={handleCloseModal}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            key="card"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#10161E]/90 backdrop-blur-lg border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6"
          >
            {isSubmissionSuccessful ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-lime mx-auto mb-6" />
                <h2 className={`text-3xl font-bold text-white/95 ${fontFamilies.plusJakartaSans} mb-3`}>¡Excelente! Tu Solicitud Está en Camino.</h2>
                <p className={`text-white/70 ${fontFamilies.plusJakartaSans} text-lg mb-8`}>
                  Hemos recibido tus datos para el Programa Piloto Celestea AI. <br />Muy pronto, nuestro equipo se comunicará contigo. ¡Prepárate para redifinir el futuro del aprendizaje!
                </p>
                <button
                  onClick={handleCloseModal}
                  className={`w-full sm:w-auto px-8 py-3 rounded-lg font-bold text-black bg-gradient-to-r from-turquoise to-lime hover:shadow-[0_0_20px_rgba(5,247,255,0.5)] hover:scale-[1.03] transition-all duration-150 ${fontFamilies.plusJakartaSans}`}
                >
                  ¡Entendido!
                </button>
              </div>
            ) : showAlreadyRegisteredView ? (
              <div className="text-center py-8">
                <PartyPopper className="w-16 h-16 text-green-500 mx-auto mb-6" />
                <h2 className={`text-3xl font-bold text-white/95 ${fontFamilies.plusJakartaSans} mb-3`}>Correo Ya Registrado</h2>
                <p className={`text-white/70 ${fontFamilies.plusJakartaSans} text-lg mb-8`}>
                  Tu dirección de correo electrónico ya se encuentra en nuestra lista. <br />Estamos igual de emocionados.
                </p>
                <button
                  onClick={handleCloseModal}
                  className={`w-full sm:w-auto px-8 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:scale-[1.03] transition-all duration-150 ${fontFamilies.plusJakartaSans}`}
                >
                  ¡Entendido!
                </button>
              </div>
            ) : (
              <>
                <h2 className={`text-3xl font-bold text-white/95 ${fontFamilies.plusJakartaSans} mb-1`}>Únete al Programa Piloto Celestea AI</h2>
                <p className={`text-white/60 ${fontFamilies.plusJakartaSans} text-sm mb-6`}>Sé de los primeros en transformar la educación. Déjanos tus datos y te contactaremos para explorar cómo nuestra IA puede potenciar tu labor docente.</p>
                <form onSubmit={handleSubmit(submit)} className="space-y-5">
                  {/* Form fields go here */}
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
      <Toaster position="top-center" />
    </AnimatePresence>
  );
}