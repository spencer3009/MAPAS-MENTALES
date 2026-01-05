import React from 'react';
import { ArrowLeft, Shield, Eye, Lock, Database, UserCheck, Globe, Mail, Calendar } from 'lucide-react';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_c7c9b123-4484-446c-b0cd-4986b2bb2189/artifacts/hk2d8hgn_MINDORA%20TRANSPARENTE.png';

const PrivacyPage = ({ onBack }) => {
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
      <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <Shield size={32} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Política de Privacidad</h1>
          <p className="text-emerald-100 max-w-2xl mx-auto">
            Tu privacidad es importante para nosotros. Esta política explica cómo recopilamos, 
            usamos y protegemos tu información personal.
          </p>
          <div className="flex items-center justify-center gap-2 mt-6 text-sm text-emerald-200">
            <Calendar size={16} />
            <span>Última actualización: {lastUpdate}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
          
          {/* Resumen */}
          <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-xl mb-10">
            <h3 className="font-bold text-emerald-900 mb-3 flex items-center gap-2">
              <Eye size={18} />
              Resumen de Privacidad
            </h3>
            <ul className="space-y-2 text-sm text-emerald-800">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                Solo recopilamos los datos necesarios para brindarte el servicio
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                No vendemos tu información personal a terceros
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                Utilizamos encriptación para proteger tus datos
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                Tienes derecho a acceder, corregir y eliminar tus datos
              </li>
            </ul>
          </div>

          {/* 1. Información que recopilamos */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Database size={20} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Información que Recopilamos</h2>
            </div>
            <div className="pl-13 space-y-4 text-gray-600">
              <h4 className="font-semibold text-gray-800">Información que nos proporcionas:</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Datos de cuenta:</strong> Nombre, correo electrónico, nombre de usuario y contraseña al registrarte</li>
                <li><strong>Datos de perfil:</strong> Foto de perfil, país, zona horaria y preferencias que configures</li>
                <li><strong>Contenido:</strong> Los mapas mentales, textos y archivos que creas en la plataforma</li>
                <li><strong>Comunicaciones:</strong> Mensajes que nos envías a través de soporte o correo</li>
              </ul>
              
              <h4 className="font-semibold text-gray-800 mt-6">Información recopilada automáticamente:</h4>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Datos de uso:</strong> Cómo interactúas con el servicio, funciones que utilizas</li>
                <li><strong>Datos técnicos:</strong> Tipo de dispositivo, navegador, sistema operativo, dirección IP</li>
                <li><strong>Cookies:</strong> Información recopilada mediante cookies (ver Política de Cookies)</li>
              </ul>
            </div>
          </section>

          {/* 2. Cómo usamos tu información */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <UserCheck size={20} className="text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Cómo Usamos tu Información</h2>
            </div>
            <div className="pl-13 space-y-4 text-gray-600">
              <p>Utilizamos la información recopilada para:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Proporcionarte acceso y mantener tu cuenta</li>
                <li>Guardar y sincronizar tus mapas mentales</li>
                <li>Mejorar y personalizar tu experiencia</li>
                <li>Enviarte actualizaciones importantes sobre el servicio</li>
                <li>Responder a tus consultas de soporte</li>
                <li>Detectar y prevenir fraudes o abusos</li>
                <li>Cumplir con obligaciones legales</li>
              </ul>
            </div>
          </section>

          {/* 3. Compartición de datos */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Globe size={20} className="text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Compartición de Datos</h2>
            </div>
            <div className="pl-13 space-y-4 text-gray-600">
              <p><strong>No vendemos tu información personal.</strong> Solo compartimos datos en estos casos:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Proveedores de servicios:</strong> Empresas que nos ayudan a operar (hosting, pagos, análisis) bajo estrictos acuerdos de confidencialidad</li>
                <li><strong>Requerimientos legales:</strong> Cuando la ley lo exija o para proteger derechos y seguridad</li>
                <li><strong>Con tu consentimiento:</strong> Cuando nos autorices explícitamente a compartir información</li>
                <li><strong>Transferencia de negocio:</strong> En caso de fusión o adquisición, tus datos pueden ser transferidos</li>
              </ul>
            </div>
          </section>

          {/* 4. Seguridad */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Lock size={20} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Seguridad de tus Datos</h2>
            </div>
            <div className="pl-13 space-y-4 text-gray-600">
              <p>Implementamos medidas de seguridad para proteger tu información:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Encriptación SSL/TLS para todas las transmisiones de datos</li>
                <li>Contraseñas almacenadas con hash seguro (bcrypt)</li>
                <li>Acceso restringido a datos personales por parte del personal</li>
                <li>Monitoreo continuo de seguridad y auditorías regulares</li>
                <li>Copias de seguridad encriptadas</li>
              </ul>
              <p className="text-sm text-gray-500 italic">
                Aunque implementamos las mejores prácticas de seguridad, ningún sistema es 100% seguro. 
                Te recomendamos usar contraseñas fuertes y únicas.
              </p>
            </div>
          </section>

          {/* 5. Tus derechos */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Shield size={20} className="text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Tus Derechos</h2>
            </div>
            <div className="pl-13 space-y-4 text-gray-600">
              <p>Tienes los siguientes derechos sobre tus datos personales:</p>
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-1">Acceso</h4>
                  <p className="text-sm">Solicitar una copia de los datos que tenemos sobre ti</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-1">Rectificación</h4>
                  <p className="text-sm">Corregir datos inexactos o incompletos</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-1">Eliminación</h4>
                  <p className="text-sm">Solicitar que eliminemos tus datos personales</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-1">Portabilidad</h4>
                  <p className="text-sm">Recibir tus datos en formato estructurado</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-1">Oposición</h4>
                  <p className="text-sm">Oponerte a ciertos tipos de procesamiento</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-1">Retiro de consentimiento</h4>
                  <p className="text-sm">Retirar tu consentimiento en cualquier momento</p>
                </div>
              </div>
              <p>
                Para ejercer estos derechos, contáctanos en{' '}
                <a href="mailto:privacidad@mindoramap.com" className="text-blue-600 hover:underline">
                  privacidad@mindoramap.com
                </a>
              </p>
            </div>
          </section>

          {/* 6. Retención de datos */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                <Calendar size={20} className="text-rose-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Retención de Datos</h2>
            </div>
            <div className="pl-13 space-y-4 text-gray-600">
              <p>Conservamos tu información personal mientras:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Tu cuenta esté activa o sea necesaria para proporcionarte el servicio</li>
                <li>Sea requerido por obligaciones legales, fiscales o contables</li>
                <li>Sea necesario para resolver disputas o hacer cumplir acuerdos</li>
              </ul>
              <p>
                Cuando elimines tu cuenta, borraremos o anonimizaremos tu información personal 
                dentro de los 30 días siguientes, excepto cuando la ley requiera su conservación.
              </p>
            </div>
          </section>

          {/* 7. Menores */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                <UserCheck size={20} className="text-cyan-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Menores de Edad</h2>
            </div>
            <div className="pl-13 space-y-4 text-gray-600">
              <p>
                MindoraMap no está dirigido a menores de 16 años. No recopilamos intencionalmente 
                información de menores. Si descubrimos que hemos recopilado datos de un menor, 
                los eliminaremos inmediatamente.
              </p>
              <p>
                Si eres padre o tutor y crees que tu hijo nos ha proporcionado información, 
                contáctanos para que podamos tomar las medidas necesarias.
              </p>
            </div>
          </section>

          {/* Contacto */}
          <section className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Mail size={20} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Contacto de Privacidad</h3>
                <p className="text-sm text-gray-600">Para cualquier consulta sobre tus datos</p>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              Si tienes preguntas sobre esta Política de Privacidad o sobre cómo manejamos 
              tus datos, no dudes en contactarnos:
            </p>
            <a 
              href="mailto:privacidad@mindoramap.com" 
              className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium"
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

export default PrivacyPage;
