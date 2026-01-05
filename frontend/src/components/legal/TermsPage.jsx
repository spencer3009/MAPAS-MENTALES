import React from 'react';
import { ArrowLeft, Shield, FileText, AlertTriangle, Scale, Mail, Calendar } from 'lucide-react';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_c7c9b123-4484-446c-b0cd-4986b2bb2189/artifacts/hk2d8hgn_MINDORA%20TRANSPARENTE.png';

const TermsPage = ({ onBack }) => {
  const lastUpdate = '29 de diciembre de 2025';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Volver</span>
            </button>
            <img src={LOGO_URL} alt="MindoraMap" className="h-8" />
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <Scale size={32} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Términos y Condiciones</h1>
          <p className="text-blue-100 max-w-2xl mx-auto">
            Estos términos regulan el uso de MindoraMap. Al utilizar nuestro servicio, 
            aceptas estas condiciones.
          </p>
          <div className="flex items-center justify-center gap-2 mt-6 text-sm text-blue-200">
            <Calendar size={16} />
            <span>Última actualización: {lastUpdate}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
          
          {/* 1. Aceptación */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">1</div>
              <h2 className="text-xl font-bold text-gray-900">Aceptación de los Términos</h2>
            </div>
            <div className="pl-11 space-y-4 text-gray-600">
              <p>
                Al acceder y utilizar MindoraMap ("el Servicio"), aceptas quedar vinculado por estos 
                Términos y Condiciones. Si no estás de acuerdo con alguna parte de estos términos, 
                no podrás acceder al Servicio.
              </p>
              <p>
                Estos términos se aplican a todos los visitantes, usuarios y otras personas que 
                accedan o utilicen el Servicio.
              </p>
            </div>
          </section>

          {/* 2. Descripción del Servicio */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">2</div>
              <h2 className="text-xl font-bold text-gray-900">Descripción del Servicio</h2>
            </div>
            <div className="pl-11 space-y-4 text-gray-600">
              <p>
                MindoraMap es una plataforma de creación y gestión de mapas mentales diseñada para 
                ayudar a empresarios, profesionales y equipos a organizar sus ideas, planificar 
                proyectos y visualizar información de manera efectiva.
              </p>
              <p>
                El Servicio incluye, pero no se limita a: creación de mapas mentales, 
                almacenamiento en la nube, exportación de documentos y colaboración en equipo 
                (según el plan contratado).
              </p>
            </div>
          </section>

          {/* 3. Cuentas de Usuario */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">3</div>
              <h2 className="text-xl font-bold text-gray-900">Cuentas de Usuario</h2>
            </div>
            <div className="pl-11 space-y-4 text-gray-600">
              <p>
                Para acceder a ciertas funciones del Servicio, deberás crear una cuenta. 
                Eres responsable de:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Mantener la confidencialidad de tu contraseña</li>
                <li>Todas las actividades que ocurran bajo tu cuenta</li>
                <li>Notificarnos inmediatamente de cualquier uso no autorizado</li>
                <li>Proporcionar información veraz y actualizada</li>
              </ul>
              <p>
                Nos reservamos el derecho de suspender o terminar cuentas que violen estos 
                términos o que muestren actividad sospechosa.
              </p>
            </div>
          </section>

          {/* 4. Uso Aceptable */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">4</div>
              <h2 className="text-xl font-bold text-gray-900">Uso Aceptable</h2>
            </div>
            <div className="pl-11 space-y-4 text-gray-600">
              <p>Al utilizar MindoraMap, te comprometes a NO:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Utilizar el Servicio para fines ilegales o no autorizados</li>
                <li>Transmitir virus, malware o código malicioso</li>
                <li>Intentar acceder sin autorización a sistemas o cuentas de otros usuarios</li>
                <li>Recopilar información de otros usuarios sin su consentimiento</li>
                <li>Publicar contenido que infrinja derechos de propiedad intelectual</li>
                <li>Realizar ingeniería inversa del software</li>
                <li>Sobrecargar nuestros servidores con solicitudes excesivas</li>
              </ul>
            </div>
          </section>

          {/* 5. Propiedad Intelectual */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">5</div>
              <h2 className="text-xl font-bold text-gray-900">Propiedad Intelectual</h2>
            </div>
            <div className="pl-11 space-y-4 text-gray-600">
              <p>
                <strong>Tu contenido:</strong> Conservas todos los derechos sobre los mapas mentales 
                y contenido que crees en MindoraMap. Nos otorgas una licencia limitada para 
                almacenar, mostrar y procesar tu contenido únicamente para proporcionarte el Servicio.
              </p>
              <p>
                <strong>Nuestro contenido:</strong> El Servicio y su contenido original, características 
                y funcionalidad son propiedad de MindoraMap y están protegidos por derechos de autor, 
                marcas registradas y otras leyes de propiedad intelectual.
              </p>
            </div>
          </section>

          {/* 6. Planes y Pagos */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">6</div>
              <h2 className="text-xl font-bold text-gray-900">Planes y Pagos</h2>
            </div>
            <div className="pl-11 space-y-4 text-gray-600">
              <p>
                MindoraMap ofrece diferentes planes de suscripción. Los precios y características 
                de cada plan están disponibles en nuestra página de precios.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Los pagos se procesan de forma segura a través de proveedores certificados</li>
                <li>Las suscripciones se renuevan automáticamente salvo cancelación previa</li>
                <li>Puedes cancelar tu suscripción en cualquier momento desde tu cuenta</li>
                <li>Los reembolsos se evalúan caso por caso según nuestra política</li>
              </ul>
            </div>
          </section>

          {/* 7. Limitación de Responsabilidad */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                <AlertTriangle size={18} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Limitación de Responsabilidad</h2>
            </div>
            <div className="pl-11 space-y-4 text-gray-600">
              <p>
                El Servicio se proporciona "tal cual" y "según disponibilidad". No garantizamos 
                que el Servicio sea ininterrumpido, seguro o libre de errores.
              </p>
              <p>
                En ningún caso MindoraMap, sus directores, empleados o agentes serán responsables 
                por daños indirectos, incidentales, especiales o consecuentes derivados del uso 
                del Servicio.
              </p>
              <p>
                Nuestra responsabilidad total no excederá el monto pagado por ti en los últimos 
                12 meses.
              </p>
            </div>
          </section>

          {/* 8. Modificaciones */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">8</div>
              <h2 className="text-xl font-bold text-gray-900">Modificaciones</h2>
            </div>
            <div className="pl-11 space-y-4 text-gray-600">
              <p>
                Nos reservamos el derecho de modificar estos términos en cualquier momento. 
                Te notificaremos de cambios significativos mediante:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Un aviso en nuestro sitio web</li>
                <li>Un correo electrónico a la dirección asociada a tu cuenta</li>
              </ul>
              <p>
                El uso continuado del Servicio después de los cambios constituye tu aceptación 
                de los nuevos términos.
              </p>
            </div>
          </section>

          {/* 9. Ley Aplicable */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">9</div>
              <h2 className="text-xl font-bold text-gray-900">Ley Aplicable</h2>
            </div>
            <div className="pl-11 space-y-4 text-gray-600">
              <p>
                Estos términos se regirán e interpretarán de acuerdo con las leyes aplicables, 
                sin tener en cuenta sus disposiciones sobre conflictos de leyes.
              </p>
              <p>
                Cualquier disputa relacionada con estos términos se resolverá mediante 
                negociación de buena fe. Si no se alcanza un acuerdo, las partes se someten 
                a la jurisdicción de los tribunales competentes.
              </p>
            </div>
          </section>

          {/* Contacto */}
          <section className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">¿Tienes preguntas?</h3>
                <p className="text-sm text-gray-600">Estamos aquí para ayudarte</p>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              Si tienes alguna pregunta sobre estos Términos y Condiciones, puedes contactarnos en:
            </p>
            <a 
              href="mailto:legal@mindoramap.com" 
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <Mail size={16} />
              legal@mindoramap.com
            </a>
          </section>

        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <img src={LOGO_URL} alt="MindoraMap" className="h-8 mx-auto mb-4 opacity-80" />
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} MindoraMap. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default TermsPage;
