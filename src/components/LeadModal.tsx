// TODO: Internacionalizar (i18n) todos los textos para soportar múltiples idiomas.
'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { fontFamilies, textStyles } from '../styles/typography';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import { CheckCircle, PartyPopper } from 'lucide-react'; // <--- Cambiar AlertTriangle por PartyPopper

const schema = z.object({
  name: z.string().min(2, 'Ingresa tu nombre'),
  email: z.string().email('Correo electrónico inválido'),
  phone: z.string()
    .transform((val: string | undefined) => val?.trim() === '' ? undefined : val?.trim())
    .optional()
    .refine((val: string | undefined) => val === undefined || /^[+]?[0-9]{10,15}$/.test(val ?? ''), {
      message: "Número de teléfono inválido",
    }),
  company: z.string()
    .transform((val: string) => val.trim() === '' ? undefined : val.trim())
    .optional()
    .refine((val: string | undefined) => val === undefined || val.length >= 2, {
      message: "El nombre de la empresa debe tener al menos 2 caracteres",
    }),
  size: z.string()
    .transform((val: string) => val === '' ? undefined : val)
    .optional()
    .refine((val: string | undefined) => val === undefined || ['1-10', '11-50', '51-200', '200+'].includes(val ?? ''), {
      message: "Selecciona un tamaño de empresa válido",
    }),
  pain: z.string()
    .transform((val: string) => val.trim() === '' ? undefined : val.trim())
    .optional()
    .refine((val: string | undefined) => val === undefined || val.length <= 200, {
      message: 'Máximo 200 caracteres',
    }),
});

type FormValues = z.infer<typeof schema>;

import { useModal } from '@/context/ModalContext';

export default function LeadModal() {
  const { isLeadModalOpen: open, closeLeadModal: onClose } = useModal();
  const [isSubmissionSuccessful, setIsSubmissionSuccessful] = useState(false);
  const [showAlreadyRegisteredView, setShowAlreadyRegisteredView] = useState(false); // <--- NUEVO ESTADO
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  const submit = async (data: FormValues) => {
    console.log('Submit function called with data:', data);
    // Resetear vistas previas al inicio de un nuevo envío
    setIsSubmissionSuccessful(false);
    setShowAlreadyRegisteredView(false);

    try {
      // La llamada a axios.post ya está aquí, no la duplicamos.
      // axios.post('/api/lead', data) devuelve una promesa que podemos usar.
      await axios.post('/api/lead', data); // Si esto es exitoso (status 2xx), va al .then() o finaliza el try

      // Si llegamos aquí, la API respondió con éxito (status 201)
      toast.success('¡Gracias por tu interés!');
      reset();
      setIsSubmissionSuccessful(true);

    } catch (error: any) {
      let errorMessage = 'Ocurrió un error, por favor intenta de nuevo.';
      // Verificar si es un error de Axios y si tiene una respuesta
      if (axios.isAxiosError(error) && error.response) {
        const { status, data: responseData } = error.response;
        
        if (status === 409 && responseData && responseData.emailExists) {
          // Email ya registrado
          setShowAlreadyRegisteredView(true);
          // No mostramos toast de error aquí, la vista lo indicará.
          // Podrías resetear el formulario si lo deseas, o dejar el email para que el usuario lo vea.
          // reset(); // Opcional: resetear el formulario
          return; // Salir de la función submit
        }
        
        // Usar el mensaje de error de la API si está disponible para otros errores
        if (responseData && responseData.error) {
          errorMessage = responseData.error;
        } else if (responseData && responseData.message) { // A veces el mensaje puede estar en 'message'
          errorMessage = responseData.message;
        }
      } else if (error instanceof Error) {
        console.error("Submit error details:", error.message);
      }
      toast.error(errorMessage);
    }
  };

  const handleCloseModal = () => {
    onClose();
    // Ensure the success view is reset if modal is closed while it's shown
    setTimeout(() => {
      setIsSubmissionSuccessful(false);
      setShowAlreadyRegisteredView(false); // <--- Resetear también esta vista
    }, 300); // Delay to allow exit animation
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
          onClick={(e) => e.stopPropagation()} // Prevent click from bubbling to overlay
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
              <PartyPopper className="w-16 h-16 text-green-500 mx-auto mb-6" /> {/* Icono y color cambiados */}
              <h2 className={`text-3xl font-bold text-white/95 ${fontFamilies.plusJakartaSans} mb-3`}>Correo Ya Registrado</h2> {/* Mensaje cambiado */}
              <p className={`text-white/70 ${fontFamilies.plusJakartaSans} text-lg mb-8`}>
                Tu dirección de correo electrónico ya se encuentra en nuestra lista. <br />Estamos igual de emocionados.
              </p> {/* Mensaje cambiado */}
              <button
                onClick={handleCloseModal}
                className={`w-full sm:w-auto px-8 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:scale-[1.03] transition-all duration-150 ${fontFamilies.plusJakartaSans}`} // Colores de botón y sombra cambiados
              >
                ¡Entendido!
              </button>
            </div>
          ) : (
            <>
              <h2 className={`text-3xl font-bold text-white/95 ${fontFamilies.plusJakartaSans} mb-1`}>Únete al Programa Piloto Celestea AI</h2>
              <p className={`text-white/60 ${fontFamilies.plusJakartaSans} text-sm mb-6`}>Sé de los primeros en transformar la educación. Déjanos tus datos y te contactaremos para explorar cómo nuestra IA puede potenciar tu labor docente.</p>

              <form onSubmit={handleSubmit(submit)} className="space-y-5">
            <div>
              <label htmlFor="name" className={`block text-sm font-medium text-white/70 mb-1.5 ${fontFamilies.plusJakartaSans}`}>Nombre completo</label>
              <input {...register('name')} id="name" placeholder="Ej: María López" className={`w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white/90 placeholder:text-white/50 focus:ring-2 focus:ring-turquoise focus:border-turquoise outline-none transition-colors duration-150 ${fontFamilies.plusJakartaSans} disabled:opacity-70 disabled:cursor-not-allowed`} disabled={isSubmitting} />
            </div>
            {errors.name && <p className={`text-red-400 text-sm mt-1 ${fontFamilies.plusJakartaSans}`}>{errors.name.message}</p>}

            <div>
              <label htmlFor="email" className={`block text-sm font-medium text-white/70 mb-1.5 ${fontFamilies.plusJakartaSans}`}>Correo electrónico</label>
              <input {...register('email')} id="email" placeholder="tu@ejemplo.com" className={`w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white/90 placeholder:text-white/50 focus:ring-2 focus:ring-turquoise focus:border-turquoise outline-none transition-colors duration-150 ${fontFamilies.plusJakartaSans} disabled:opacity-70 disabled:cursor-not-allowed`} disabled={isSubmitting} />
            </div>
            {errors.email && <p className={`text-red-400 text-sm mt-1 ${fontFamilies.plusJakartaSans}`}>{errors.email.message}</p>}

            <div>
              <label htmlFor="phone" className={`block text-sm font-medium text-white/70 mb-1.5 ${fontFamilies.plusJakartaSans}`}>Teléfono celular (Opcional)</label>
              <input {...register('phone')} id="phone" placeholder="Ej: 55 1234 5678" className={`w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white/90 placeholder:text-white/50 focus:ring-2 focus:ring-turquoise focus:border-turquoise outline-none transition-colors duration-150 ${fontFamilies.plusJakartaSans} disabled:opacity-70 disabled:cursor-not-allowed`} disabled={isSubmitting} />
            </div>
            {errors.phone && <p className={`text-red-400 text-sm mt-1 ${fontFamilies.plusJakartaSans}`}>{errors.phone.message}</p>}

            {/* B2B Fields - Hidden for now */}
            <div className="hidden space-y-5">
              <div>
                <label htmlFor="company" className={`block text-sm font-medium text-white/70 mb-1.5 ${fontFamilies.plusJakartaSans}`}>Nombre de la Institución / Empresa (Opcional)</label>
                <input {...register('company')} id="company" placeholder="Ej: Colegio Nacional, Innovaciones Educativas S.A." className={`w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white/90 placeholder:text-white/50 focus:ring-2 focus:ring-turquoise focus:border-turquoise outline-none transition-colors duration-150 ${fontFamilies.plusJakartaSans} disabled:opacity-70 disabled:cursor-not-allowed`} disabled={isSubmitting} />
                {errors.company && <p className={`text-red-400 text-sm mt-1 ${fontFamilies.plusJakartaSans}`}>{errors.company.message}</p>}
              </div>

              <div>
                <label htmlFor="size" className={`block text-sm font-medium text-white/70 mb-1.5 ${fontFamilies.plusJakartaSans}`}>Tamaño de la Institución / Empresa (Opcional)</label>
                <select {...register('size')} id="size" className={`w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white/90 focus:ring-2 focus:ring-turquoise focus:border-turquoise outline-none appearance-none transition-colors duration-150 ${fontFamilies.plusJakartaSans} h-[46px] disabled:opacity-70 disabled:cursor-not-allowed`} disabled={isSubmitting}>
                  <option value="" className="bg-[#10161E] text-white/70">Selecciona un rango</option>
                  <option value="1-10" className="bg-[#10161E] text-white/90">1-10 empleados/colaboradores</option>
                  <option value="11-50" className="bg-[#10161E] text-white/90">11-50 empleados/colaboradores</option>
                  <option value="51-200" className="bg-[#10161E] text-white/90">51-200 empleados/colaboradores</option>
                  <option value="200+" className="bg-[#10161E] text-white/90">Más de 200 empleados/colaboradores</option>
                </select>
                {errors.size && <p className={`text-red-400 text-sm mt-1 ${fontFamilies.plusJakartaSans}`}>{errors.size.message}</p>}
              </div>

              <div>
                <label htmlFor="pain" className={`block text-sm font-medium text-white/70 mb-1.5 ${fontFamilies.plusJakartaSans}`}>Principal desafío o necesidad (Opcional)</label>
                <textarea
                  {...register('pain')}
                  id="pain"
                  placeholder="Describe brevemente el principal desafío o necesidad que tiene tu institución..."
                  rows={3}
                  className={`w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg text-white/90 placeholder:text-white/50 focus:ring-2 focus:ring-turquoise focus:border-turquoise outline-none resize-none transition-colors duration-150 ${fontFamilies.plusJakartaSans} disabled:opacity-70 disabled:cursor-not-allowed`}
                  disabled={isSubmitting}
                />
                {errors.pain && <p className={`text-red-400 text-sm mt-1 ${fontFamilies.plusJakartaSans}`}>{errors.pain.message}</p>}
              </div>
            </div> {/* End of hidden B2B fields div */}

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleCloseModal}
                className={`px-6 py-2.5 rounded-lg text-white/70 hover:text-turquoise transition-colors duration-150 ${fontFamilies.plusJakartaSans} font-medium`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-bold text-black bg-gradient-to-r from-turquoise to-lime hover:shadow-[0_0_20px_rgba(5,247,255,0.5)] hover:scale-[1.03] transition-all duration-150 ${fontFamilies.plusJakartaSans} disabled:opacity-70 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? 'Enviando…' : 'Registrarme'}
              </button>
            </div>
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
