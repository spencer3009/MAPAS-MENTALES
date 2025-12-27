import React from 'react';
import { 
  Brain, 
  Zap, 
  Target, 
  Users, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  TrendingUp,
  Clock,
  Lightbulb,
  BarChart3,
  Briefcase,
  Rocket,
  Shield,
  Star
} from 'lucide-react';

// URL del logo MindoraMap
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_mindviz-app/artifacts/k1kioask_image.png';

const LandingPage = ({ onLogin, onRegister }) => {
  
  // Beneficios principales
  const benefits = [
    {
      icon: Lightbulb,
      title: 'Claridad en tus decisiones',
      description: 'Visualiza todas las opciones y toma decisiones más informadas para tu negocio.'
    },
    {
      icon: Target,
      title: 'Organización visual',
      description: 'Estructura tus proyectos de manera clara y mantén todo bajo control.'
    },
    {
      icon: Clock,
      title: 'Ahorro de tiempo',
      description: 'Planifica más rápido con herramientas diseñadas para la productividad.'
    },
    {
      icon: TrendingUp,
      title: 'Mayor productividad',
      description: 'Optimiza tu flujo de trabajo y logra más en menos tiempo.'
    },
    {
      icon: Brain,
      title: 'Ideas conectadas',
      description: 'Relaciona conceptos complejos de forma simple y comprensible.'
    },
    {
      icon: Users,
      title: 'Colaboración efectiva',
      description: 'Comparte y trabaja en equipo en tus mapas mentales.'
    }
  ];

  // Casos de uso
  const useCases = [
    {
      icon: Briefcase,
      title: 'Planeamiento de negocios',
      description: 'Diseña tu modelo de negocio, analiza competidores y define tu propuesta de valor.'
    },
    {
      icon: Users,
      title: 'Organización de equipos',
      description: 'Estructura roles, responsabilidades y flujos de comunicación.'
    },
    {
      icon: BarChart3,
      title: 'Estrategias de marketing',
      description: 'Planifica campañas, define canales y organiza tu contenido.'
    },
    {
      icon: Rocket,
      title: 'Gestión de proyectos',
      description: 'Visualiza tareas, dependencias y cronogramas de manera clara.'
    },
    {
      icon: Target,
      title: 'Definición de objetivos',
      description: 'Establece metas SMART y traza el camino para alcanzarlas.'
    },
    {
      icon: Lightbulb,
      title: 'Brainstorming',
      description: 'Genera y organiza ideas creativas para innovar en tu negocio.'
    }
  ];

  // Planes y precios
  const plans = [
    {
      name: 'Básico',
      price: 'Gratis',
      period: '',
      description: 'Perfecto para comenzar',
      features: [
        'Hasta 3 mapas mentales',
        'Exportación en PNG',
        'Plantillas básicas',
        'Guardado automático'
      ],
      cta: 'Comenzar gratis',
      popular: false
    },
    {
      name: 'Pro',
      price: '$12',
      period: '/mes',
      description: 'Para empresarios exigentes',
      features: [
        'Mapas ilimitados',
        'Exportación en PDF y PNG',
        'Todas las plantillas',
        'Colaboración en tiempo real',
        'Historial de versiones',
        'Soporte prioritario'
      ],
      cta: 'Prueba 14 días gratis',
      popular: true
    },
    {
      name: 'Team',
      price: '$29',
      period: '/mes',
      description: 'Para equipos de trabajo',
      features: [
        'Todo lo de Pro',
        'Hasta 10 usuarios',
        'Espacios de trabajo compartidos',
        'Permisos avanzados',
        'Analíticas de uso',
        'Onboarding personalizado',
        'API access'
      ],
      cta: 'Contactar ventas',
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header / Navbar */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <img src={LOGO_URL} alt="MindoraMap" className="h-8 w-auto" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                MindoraMap
              </span>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#beneficios" className="text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium">
                Beneficios
              </a>
              <a href="#casos-uso" className="text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium">
                Casos de uso
              </a>
              <a href="#precios" className="text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium">
                Precios
              </a>
            </nav>

            {/* Auth buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={onLogin}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                Iniciar sesión
              </button>
              <button
                onClick={onRegister}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Crear cuenta
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
              <Sparkles size={16} />
              La herramienta #1 para empresarios
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Organiza tus ideas,{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                potencia tu negocio
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              MindoraMap es la plataforma de mapas mentales diseñada para empresarios 
              que buscan claridad, organización y resultados en sus proyectos.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onRegister}
                className="
                  w-full sm:w-auto px-8 py-4 
                  bg-blue-600 hover:bg-blue-700 
                  text-white font-semibold text-lg 
                  rounded-xl shadow-lg shadow-blue-600/30
                  flex items-center justify-center gap-2
                  transition-all hover:scale-105
                "
              >
                Crear cuenta gratis
                <ArrowRight size={20} />
              </button>
              <button
                onClick={onLogin}
                className="
                  w-full sm:w-auto px-8 py-4 
                  bg-white hover:bg-gray-50 
                  text-gray-700 font-semibold text-lg 
                  rounded-xl border-2 border-gray-200
                  transition-all hover:border-blue-300
                "
              >
                Ya tengo cuenta
              </button>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-green-500" />
                <span>Datos 100% seguros</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-yellow-500" />
                <span>Sin necesidad de tarjeta</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={18} className="text-blue-500" />
                <span>+1,000 empresarios activos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is it Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                ¿Qué es MindoraMap?
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                MindoraMap es una herramienta de mapas mentales profesional diseñada 
                específicamente para empresarios y equipos de trabajo que necesitan 
                <strong> organizar ideas, planificar estrategias y tomar decisiones</strong> de 
                manera visual y efectiva.
              </p>
              <p className="text-lg text-gray-600 mb-8">
                Con una interfaz intuitiva y funciones potentes, transforma la 
                complejidad de tus proyectos en claridad visual, permitiéndote 
                ver el panorama completo de tu negocio.
              </p>
              <ul className="space-y-4">
                {['Creación intuitiva de mapas', 'Múltiples tipos de layout', 'Exportación profesional', 'Guardado automático'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="text-green-500 flex-shrink-0" size={20} />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl p-8 aspect-video flex items-center justify-center">
                <div className="text-center">
                  <Brain size={80} className="text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Vista previa del sistema</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="beneficios" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Beneficios para tu negocio
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Descubre cómo MindoraMap puede transformar la forma en que planificas y ejecutas tus proyectos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <benefit.icon className="text-blue-600" size={24} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {benefit.title}
                </h3>
                <p className="text-gray-600">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="casos-uso" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Casos de uso para empresarios
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              MindoraMap se adapta a diferentes necesidades de tu negocio.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((useCase, index) => (
              <div 
                key={index}
                className="group p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <useCase.icon className="text-white" size={20} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {useCase.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {useCase.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="precios" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Planes y precios
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Elige el plan que mejor se adapte a las necesidades de tu negocio.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <div 
                key={index}
                className={`
                  relative rounded-2xl p-8
                  ${plan.popular 
                    ? 'bg-white shadow-2xl scale-105' 
                    : 'bg-gray-800 border border-gray-700'
                  }
                `}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-full">
                      <Star size={14} fill="currentColor" />
                      Más popular
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className={`text-xl font-bold mb-2 ${plan.popular ? 'text-gray-900' : 'text-white'}`}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className={`text-4xl font-bold ${plan.popular ? 'text-gray-900' : 'text-white'}`}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className={plan.popular ? 'text-gray-500' : 'text-gray-400'}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className={`mt-2 text-sm ${plan.popular ? 'text-gray-600' : 'text-gray-400'}`}>
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle2 
                        size={18} 
                        className={plan.popular ? 'text-green-500' : 'text-blue-400'} 
                      />
                      <span className={`text-sm ${plan.popular ? 'text-gray-700' : 'text-gray-300'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onRegister}
                  className={`
                    w-full py-3 px-4 rounded-xl font-medium transition-all
                    ${plan.popular 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
                    }
                  `}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            ¿Listo para organizar tus ideas y potenciar tu negocio?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Únete a más de 1,000 empresarios que ya usan MindoraMap para 
            planificar, organizar y hacer crecer sus negocios.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onRegister}
              className="
                w-full sm:w-auto px-8 py-4 
                bg-white hover:bg-gray-100 
                text-blue-600 font-semibold text-lg 
                rounded-xl shadow-lg
                flex items-center justify-center gap-2
                transition-all hover:scale-105
              "
            >
              Crear cuenta gratis
              <ArrowRight size={20} />
            </button>
            <button
              onClick={onLogin}
              className="
                w-full sm:w-auto px-8 py-4 
                bg-transparent hover:bg-white/10 
                text-white font-semibold text-lg 
                rounded-xl border-2 border-white/50
                transition-all
              "
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img src={LOGO_URL} alt="MindoraMap" className="h-8 w-auto" />
              <span className="text-xl font-bold text-white">
                MindoraMap
              </span>
            </div>
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} MindoraMap. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                Términos
              </a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                Privacidad
              </a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                Contacto
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
