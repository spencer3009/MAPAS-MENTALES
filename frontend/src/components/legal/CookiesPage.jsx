import React from 'react';
import { 
  ArrowLeft, 
  Cookie, 
  Shield, 
  BarChart3, 
  Sliders, 
  Megaphone, 
  Settings,
  Mail,
  Calendar,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { useCookies } from '../../contexts/CookieContext';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_mindviz-app/artifacts/k1kioask_image.png';

const CookiesPage = ({ onBack }) => {
  const { openSettings } = useCookies();
  const lastUpdate = '29 de diciembre de 2025';

  const cookieTypes = [
    {
      icon: Shield,
      title: 'Cookies Necesarias',
      description: 'Esenciales para el funcionamiento del sitio',
      color: 'green',
      examples: [
        { name: 'session_id', purpose: 'Mantener tu sesión iniciada', duration: 'Sesión' },
        { name: 'csrf_token', purpose: 'Protección contra ataques CSRF', duration: 'Sesión' },
        { name: 'cookie_consent', purpose: 'Recordar tus preferencias de cookies', duration: '1 año' }
      ]
    },
    {
      icon: BarChart3,
      title: 'Cookies Analíticas',
      description: 'Nos ayudan a entender cómo usas el sitio',
      color: 'blue',
      examples: [
        { name: '_ga', purpose: 'Identificador de Google Analytics', duration: '2 años' },
        { name: '_gid', purpose: 'Distinguir usuarios en GA', duration: '24 horas' },
        { name: '_gat', purpose: 'Limitar la tasa de solicitudes', duration: '1 minuto' }
      ]
    },
    {
      icon: Sliders,
      title: 'Cookies Funcionales',
      description: 'Mejoran tu experiencia recordando preferencias',
      color: 'purple',
      examples: [
        { name: 'theme_preference', purpose: 'Recordar tu tema (claro/oscuro)', duration: '1 año' },
        { name: 'language', purpose: 'Recordar tu idioma preferido', duration: '1 año' },
        { name: 'sidebar_state', purpose: 'Recordar estado del panel lateral', duration: '30 días' }
      ]
    },
    {
      icon: Megaphone,
      title: 'Cookies de Marketing',
      description: 'Permiten mostrarte contenido relevante',
      color: 'orange',
      examples: [
        { name: '_fbp', purpose: 'Identificador de Facebook Pixel', duration: '3 meses' },
        { name: '_gcl_au', purpose: 'Conversión de Google Ads', duration: '3 meses' },
        { name: 'ads_session_id', purpose: 'Seguimiento de campañas', duration: 'Sesión' }
      ]
    }
  ];

  const colorClasses = {
    green: 'bg-green-100 text-green-600 border-green-200',
    blue: 'bg-blue-100 text-blue-600 border-blue-200',
    purple: 'bg-purple-100 text-purple-600 border-purple-200',
    orange: 'bg-orange-100 text-orange-600 border-orange-200'
  };

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
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <Cookie size={32} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Política de Cookies</h1>
          <p className="text-orange-100 max-w-2xl mx-auto">
            En MindoraMap utilizamos cookies para mejorar tu experiencia. 
            Aquí te explicamos qué son, para qué las usamos y cómo puedes gestionarlas.
          </p>
          <div className="flex items-center justify-center gap-2 mt-6 text-sm text-orange-200">
            <Calendar size={16} />
            <span>Última actualización: {lastUpdate}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
          
          {/* Acceso rápido */}
          <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl mb-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Settings size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Gestiona tus preferencias</h3>
                  <p className="text-sm text-gray-600">Puedes cambiar tu configuración en cualquier momento</p>
                </div>
              </div>
              <button
                onClick={openSettings}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors shadow-sm"
              >
                <Settings size={16} />
                Configurar cookies
              </button>
            </div>
          </div>

          {/* ¿Qué son las cookies? */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Cookie size={22} className="text-amber-500" />
              ¿Qué son las cookies?
            </h2>
            <div className="space-y-4 text-gray-600">
              <p>
                Las cookies son pequeños archivos de texto que los sitios web almacenan en tu 
                dispositivo (ordenador, móvil o tablet) cuando los visitas. Sirven para que el 
                sitio recuerde información sobre tu visita, como tu idioma preferido o los 
                datos de inicio de sesión.
              </p>
              <p>
                Las cookies pueden ser "propias" (establecidas por nosotros) o "de terceros" 
                (establecidas por otros servicios que utilizamos, como Google Analytics).
              </p>
            </div>
          </section>

          {/* ¿Para qué usamos cookies? */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 size={22} className="text-green-500" />
              ¿Para qué usamos cookies?
            </h2>
            <div className="space-y-4 text-gray-600">
              <p>En MindoraMap utilizamos cookies para:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Hacer que el sitio funcione:</strong> Mantener tu sesión iniciada, recordar tus preferencias y garantizar la seguridad</li>
                <li><strong>Entender cómo lo usas:</strong> Analizar qué páginas visitas y cómo navegas para mejorar el servicio</li>
                <li><strong>Personalizar tu experiencia:</strong> Recordar tu configuración, tema visual y preferencias</li>
                <li><strong>Mostrarte contenido relevante:</strong> Personalizar comunicaciones y ofertas basadas en tus intereses</li>
              </ul>
            </div>
          </section>

          {/* Tipos de cookies */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Tipos de cookies que utilizamos</h2>
            
            <div className="space-y-6">
              {cookieTypes.map((type, index) => (
                <div key={index} className={`border-2 rounded-xl overflow-hidden ${colorClasses[type.color].split(' ')[2]}`}>
                  {/* Header */}
                  <div className={`p-4 ${colorClasses[type.color].split(' ').slice(0, 2).join(' ')}`}>
                    <div className="flex items-center gap-3">
                      <type.icon size={22} />
                      <div>
                        <h3 className="font-bold text-gray-900">{type.title}</h3>
                        <p className="text-sm text-gray-600">{type.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Table */}
                  <div className="bg-white p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="pb-2 font-medium">Cookie</th>
                          <th className="pb-2 font-medium">Propósito</th>
                          <th className="pb-2 font-medium">Duración</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-600">
                        {type.examples.map((cookie, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-2 font-mono text-xs bg-gray-50 px-2 rounded">{cookie.name}</td>
                            <td className="py-2 px-2">{cookie.purpose}</td>
                            <td className="py-2 px-2 text-gray-500">{cookie.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Cookies de terceros */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Cookies de terceros</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                Algunos de nuestros socios pueden establecer cookies en tu dispositivo cuando 
                visitas MindoraMap. Estos servicios tienen sus propias políticas de privacidad:
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <a 
                  href="https://policies.google.com/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                >
                  <div>
                    <h4 className="font-semibold text-gray-800">Google Analytics</h4>
                    <p className="text-sm text-gray-500">Análisis de uso del sitio</p>
                  </div>
                  <ExternalLink size={16} className="text-gray-400 group-hover:text-blue-600" />
                </a>
                <a 
                  href="https://www.facebook.com/privacy/policy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                >
                  <div>
                    <h4 className="font-semibold text-gray-800">Meta (Facebook)</h4>
                    <p className="text-sm text-gray-500">Marketing y retargeting</p>
                  </div>
                  <ExternalLink size={16} className="text-gray-400 group-hover:text-blue-600" />
                </a>
              </div>
            </div>
          </section>

          {/* Cómo gestionar cookies */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Cómo gestionar tus cookies</h2>
            <div className="space-y-4 text-gray-600">
              <p>Tienes varias opciones para gestionar las cookies:</p>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Desde nuestra configuración</h4>
                    <p className="text-sm">Usa el botón "Configurar cookies" de arriba o el enlace "Gestionar cookies" en el pie de página.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-purple-600 font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Desde tu navegador</h4>
                    <p className="text-sm">La mayoría de navegadores permiten bloquear o eliminar cookies desde su configuración.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg">
                  <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-amber-600 font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Herramientas de terceros</h4>
                    <p className="text-sm">Puedes usar extensiones del navegador o sitios como youronlinechoices.eu para gestionar cookies de publicidad.</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-100 rounded-lg mt-4">
                <p className="text-sm text-gray-600">
                  <strong>Nota:</strong> Bloquear todas las cookies puede afectar el funcionamiento 
                  del sitio. Las cookies necesarias no se pueden desactivar ya que son esenciales 
                  para que MindoraMap funcione correctamente.
                </p>
              </div>
            </div>
          </section>

          {/* Actualizaciones */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Actualizaciones de esta política</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                Podemos actualizar esta Política de Cookies ocasionalmente para reflejar cambios 
                en las cookies que utilizamos o por otros motivos operativos, legales o regulatorios.
              </p>
              <p>
                Te recomendamos revisar esta página periódicamente para estar informado sobre 
                cómo utilizamos las cookies. La fecha de la última actualización aparece al 
                inicio de esta página.
              </p>
            </div>
          </section>

          {/* Contacto */}
          <section className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Mail size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">¿Tienes preguntas sobre cookies?</h3>
                <p className="text-sm text-gray-600">Estamos aquí para ayudarte</p>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              Si tienes alguna pregunta sobre cómo utilizamos las cookies o sobre esta política, 
              puedes contactarnos en:
            </p>
            <a 
              href="mailto:privacidad@mindoramap.com" 
              className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
            >
              <Mail size={16} />
              privacidad@mindoramap.com
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

export default CookiesPage;
