import Link from 'next/link';
import { headingStyles, textStyles, opacityVariants } from '@/styles/typography';
import Container from '@/components/Container'; // Assuming you have a Container component

const AITransparenciaPage = () => {
  return (
    <Container className="py-16 md:py-24 text-white">
      <header className="mb-12 md:mb-16 text-center">
        <h1 className={`${headingStyles.h1} ${opacityVariants.primary} mb-4`}>Transparencia en el Uso de IA</h1>
      </header>

      <article className="max-w-3xl mx-auto space-y-10 md:space-y-12">
        <section>
          <h2 className={`${headingStyles.h2} ${opacityVariants.primary} mb-4`}>¿Qué es IA generativa?</h2>
          <p className={`${textStyles.body} ${opacityVariants.secondary} mb-4`}>
            La Inteligencia Artificial generativa es un tipo de IA capaz de crear contenido nuevo y original, como texto, imágenes, audio o video, a partir de los datos con los que ha sido entrenada. En Celesta, la utilizamos para potenciar la experiencia educativa de las siguientes maneras:
          </p>
          <ul className={`${textStyles.body} ${opacityVariants.secondary} list-disc list-inside space-y-2 pl-4`}>
            <li>Personalización de rutas de aprendizaje.</li>
            <li>Generación de material de estudio complementario.</li>
            <li>Asistencia inteligente para la resolución de dudas.</li>
          </ul>
        </section>

        <section>
          <h2 className={`${headingStyles.h2} ${opacityVariants.primary} mb-4`}>Datos que Recolectamos</h2>
          <p className={`${textStyles.body} ${opacityVariants.secondary} mb-4`}>
            Para ofrecer una experiencia personalizada y mejorar continuamente nuestra plataforma, recolectamos ciertos datos. Siempre lo hacemos con tu consentimiento y siguiendo estrictas políticas de privacidad. Los datos que podemos recolectar incluyen:
          </p>
          <ul className={`${textStyles.body} ${opacityVariants.secondary} list-disc list-inside space-y-2 pl-4`}>
            <li><strong>Información de contacto:</strong> Nombre, correo electrónico.</li>
            <li><strong>Información institucional:</strong> Nombre de la empresa o institución educativa (si aplica).</li>
            <li><strong>Métricas de uso:</strong> Interacción con la plataforma, progreso en los cursos, funcionalidades más utilizadas. Estos datos son anonimizados y agregados siempre que sea posible.</li>
          </ul>
          <p className={`${textStyles.body} ${opacityVariants.secondary} mt-4`}>
            No recolectamos información sensible sin tu consentimiento explícito.
          </p>
        </section>

        <section>
          <h2 className={`${headingStyles.h2} ${opacityVariants.primary} mb-4`}>Supervisión Docente</h2>
          <p className={`${textStyles.body} ${opacityVariants.secondary} mb-4`}>
            Entendemos la importancia del rol docente en el proceso de aprendizaje. Aunque nuestra IA ofrece herramientas avanzadas, promovemos y facilitamos la supervisión activa por parte de los educadores. Las herramientas de IA están diseñadas para ser un apoyo, permitiendo a los docentes enfocarse en la interacción de calidad, la guía personalizada y la evaluación formativa. Celesta proporciona informes y dashboards para que los docentes puedan seguir el progreso de los estudiantes y la efectividad de las herramientas de IA.
          </p>
        </section>

        <div className="mt-12 md:mt-16 text-center">
          <Link href="/" legacyBehavior>
            <a className={`${textStyles.button} text-turquoise hover:text-lime transition-colors`}>
              &larr; Volver a la página principal
            </a>
          </Link>
        </div>
      </article>
    </Container>
  );
};

export default AITransparenciaPage;
