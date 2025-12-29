import React, { useState, useEffect } from 'react';
import { useCookies } from '../../contexts/CookieContext';
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
  Star,
  ChevronDown,
  ChevronUp,
  Play,
  Layers,
  GitBranch,
  Network,
  PenTool,
  Share2,
  Download,
  Menu,
  X,
  MousePointer,
  Palette,
  FolderTree,
  Eye,
  Loader2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// URL del logo MindoraMap
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_mindviz-app/artifacts/k1kioask_image.png';

// Imágenes de ejemplo de mapas mentales
const MINDMAP_IMAGES = {
  hero: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&q=80',
  platform1: 'https://images.unsplash.com/photo-1512758017271-d7b84c2113f1?w=600&q=80',
  platform2: 'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=600&q=80',
  howItWorks: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80'
};

const LandingPage = ({ onLogin, onRegister, onDemo, onTerms, onPrivacy, onCookies }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [content, setContent] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar contenido y planes desde la BD
  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar contenido de landing y planes en paralelo
        const [contentRes, plansRes] = await Promise.all([
          fetch(`${API_URL}/api/landing-content`),
          fetch(`${API_URL}/api/plans`)
        ]);
        
        if (contentRes.ok) {
          const data = await contentRes.json();
          setContent(data);
        }
        
        if (plansRes.ok) {
          const plansData = await plansRes.json();
          setPlans(plansData.plans || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback plans in case API fails
        setPlans([
          {
            id: 'free',
            name: 'Free',
            display_name: 'Gratis',
            price_display: 'Gratis',
            period: 'para siempre',
            description: 'Perfecto para probar',
            features: ['Hasta 3 mapas activos', 'Máximo 5 mapas en total', '40-50 nodos por mapa', 'Exportación PNG'],
            cta: 'Comenzar gratis',
            popular: false,
            gradient: 'from-gray-600 to-gray-700'
          },
          {
            id: 'personal',
            name: 'Personal',
            display_name: 'Personal',
            price_display: '$3',
            period: '/mes',
            description: 'Para creadores',
            badge: '🚀 Early Access',
            features: ['Mapas ilimitados', 'Nodos ilimitados', 'Exportación PDF + PNG', 'Uso comercial'],
            cta: 'Actualizar ahora',
            popular: true,
            gradient: 'from-blue-600 to-indigo-600'
          },
          {
            id: 'team',
            name: 'Team',
            display_name: 'Team',
            price_display: '$8',
            period: '/usuario/mes',
            description: 'Para equipos',
            badge: '🚀 Early Access',
            features: ['Todo lo del Personal', '2-10 usuarios', 'Colaboración', 'Mapas compartidos'],
            cta: 'Probar Team',
            popular: false,
            gradient: 'from-purple-600 to-indigo-600'
          }
        ]);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  // Navegación - usa datos de BD si existen
  const navItems = [
    { label: 'Inicio', href: '#inicio' },
    { label: 'Plataforma', href: '#plataforma' },
    { label: 'Beneficios', href: '#beneficios' },
    { label: 'Cómo funciona', href: '#como-funciona' },
    { label: 'Planes', href: '#planes' },
    { label: 'FAQ', href: '#faq' }
  ];

  // Características de la plataforma
  const platformFeatures = [
    {
      icon: GitBranch,
      title: 'Múltiples Layouts',
      description: 'MindFlow, MindTree y MindHybrid para adaptarse a tu forma de pensar.'
    },
    {
      icon: Palette,
      title: 'Personalización Total',
      description: 'Colores, iconos y estilos para que cada mapa sea único.'
    },
    {
      icon: Share2,
      title: 'Colaboración',
      description: 'Trabaja en equipo en tiempo real sin complicaciones.'
    },
    {
      icon: Download,
      title: 'Exportación Pro',
      description: 'Descarga en PNG, PDF o comparte con un enlace.'
    },
    {
      icon: FolderTree,
      title: 'Organización',
      description: 'Carpetas, etiquetas y búsqueda para encontrar todo rápido.'
    },
    {
      icon: Shield,
      title: 'Seguridad',
      description: 'Tus datos protegidos con encriptación de nivel empresarial.'
    }
  ];

  // Beneficios
  const benefits = [
    {
      icon: Lightbulb,
      title: 'Claridad Mental',
      description: 'Transforma el caos de ideas en estructuras visuales claras que impulsan la toma de decisiones.',
      color: 'from-amber-400 to-orange-500'
    },
    {
      icon: Target,
      title: 'Enfoque Estratégico',
      description: 'Visualiza objetivos, identifica prioridades y mantén a tu equipo alineado.',
      color: 'from-blue-400 to-indigo-500'
    },
    {
      icon: Clock,
      title: 'Ahorro de Tiempo',
      description: 'Reduce un 40% el tiempo de planificación con herramientas intuitivas.',
      color: 'from-emerald-400 to-teal-500'
    },
    {
      icon: TrendingUp,
      title: 'Productividad x3',
      description: 'Empresarios reportan triplicar su productividad en las primeras semanas.',
      color: 'from-purple-400 to-pink-500'
    },
    {
      icon: Network,
      title: 'Conexiones Claras',
      description: 'Descubre relaciones ocultas entre ideas que impulsan la innovación.',
      color: 'from-cyan-400 to-blue-500'
    },
    {
      icon: Users,
      title: 'Alineación de Equipo',
      description: 'Todos en la misma página con mapas compartidos y actualizados.',
      color: 'from-rose-400 to-red-500'
    }
  ];

  // Pasos de cómo funciona
  const howItWorksSteps = [
    {
      number: '01',
      title: 'Crea tu cuenta gratis',
      description: 'Regístrate en segundos y accede a todas las herramientas básicas sin costo.',
      icon: MousePointer
    },
    {
      number: '02',
      title: 'Elige tu layout',
      description: 'Selecciona MindFlow, MindTree o MindHybrid según tu estilo de pensamiento.',
      icon: Layers
    },
    {
      number: '03',
      title: 'Construye tu mapa',
      description: 'Agrega nodos, conecta ideas y personaliza con colores e iconos.',
      icon: PenTool
    },
    {
      number: '04',
      title: 'Comparte y colabora',
      description: 'Invita a tu equipo, exporta o presenta directamente desde la plataforma.',
      icon: Share2
    }
  ];

  // FAQs
  const faqs = [
    {
      question: '¿Puedo probar MindoraMap antes de pagar?',
      answer: 'Absolutamente. Ofrecemos un plan gratuito para siempre con funcionalidades completas para que pruebes la plataforma. Además, los planes de pago incluyen 14 días de prueba sin compromiso.'
    },
    {
      question: '¿Mis datos están seguros?',
      answer: 'La seguridad es nuestra prioridad. Utilizamos encriptación AES-256, servidores certificados SOC 2, y cumplimos con GDPR. Tus mapas mentales y datos nunca se comparten con terceros.'
    },
    {
      question: '¿Puedo colaborar con mi equipo en tiempo real?',
      answer: 'Sí, con los planes Professional y Enterprise puedes invitar a colaboradores para editar mapas en tiempo real. Verás los cambios instantáneamente y podrás dejar comentarios.'
    },
    {
      question: '¿Qué diferencia hay entre MindFlow, MindTree y MindHybrid?',
      answer: 'MindFlow es ideal para brainstorming libre, MindTree para jerarquías estructuradas, y MindHybrid combina lo mejor de ambos mundos con ramas horizontales y verticales.'
    },
    {
      question: '¿Puedo exportar mis mapas mentales?',
      answer: 'Sí, puedes exportar en PNG de alta resolución (todos los planes) y PDF profesional (planes de pago). También puedes compartir con enlaces públicos o privados.'
    },
    {
      question: '¿Ofrecen descuentos para startups o educación?',
      answer: 'Sí, ofrecemos 50% de descuento para startups en etapa temprana y 75% para instituciones educativas. Contáctanos con tu caso para aplicar.'
    }
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* ==================== HEADER ==================== */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-lg z-50 border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 lg:h-28">
            {/* Logo */}
            <a href="#inicio" className="flex items-center group">
              <img src={LOGO_URL} alt="MindoraMap" className="h-20 lg:h-24 w-auto" />
            </a>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <a 
                  key={item.href}
                  href={item.href} 
                  className="px-4 py-2 text-gray-600 hover:text-blue-600 font-medium text-sm rounded-lg hover:bg-blue-50 transition-all"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            {/* Desktop Auth buttons */}
            <div className="hidden lg:flex items-center gap-3">
              <button
                onClick={onLogin}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors"
              >
                {content?.nav?.btn_login || 'Iniciar sesión'}
              </button>
              <button
                onClick={onRegister}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:scale-105"
              >
                {content?.nav?.btn_registro || 'Empezar gratis'}
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 py-4 px-4 shadow-lg">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <a 
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 text-gray-700 hover:text-blue-600 font-medium rounded-lg hover:bg-blue-50"
                >
                  {item.label}
                </a>
              ))}
              <hr className="my-2" />
              <button
                onClick={() => { onLogin(); setMobileMenuOpen(false); }}
                className="px-4 py-3 text-gray-700 font-medium text-left"
              >
                {content?.nav?.btn_login || 'Iniciar sesión'}
              </button>
              <button
                onClick={() => { onRegister(); setMobileMenuOpen(false); }}
                className="px-4 py-3 text-white font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-center"
              >
                {content?.nav?.btn_registro || 'Empezar gratis'}
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* ==================== HERO SECTION ==================== */}
      <section id="inicio" className="relative pt-24 lg:pt-32 pb-20 lg:pb-32 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-purple-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-200/30 to-purple-200/30 rounded-full blur-3xl" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2MzY2ZjEiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full text-sm font-semibold mb-6 border border-blue-200/50">
                <Sparkles size={16} className="text-blue-500" />
                {content?.hero?.badge || '+2,500 empresarios ya confían en nosotros'}
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-gray-900 leading-[1.1] mb-6">
                {(content?.hero?.title || 'Convierte el caos en claridad').split(' ').map((word, i, arr) => {
                  // La palabra "caos" tiene estilo especial
                  if (word.toLowerCase() === 'caos') {
                    return (
                      <span key={i} className="relative inline-block mx-2">
                        <span className="relative z-10 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                          {word}
                        </span>
                        <svg className="absolute -bottom-2 left-0 w-full" height="12" viewBox="0 0 100 12" preserveAspectRatio="none">
                          <path d="M0 8 Q 25 0, 50 8 T 100 8" stroke="url(#gradient)" strokeWidth="4" fill="none" strokeLinecap="round"/>
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#3b82f6"/>
                              <stop offset="100%" stopColor="#8b5cf6"/>
                            </linearGradient>
                          </defs>
                        </svg>
                      </span>
                    );
                  }
                  return <span key={i}>{word}{i < arr.length - 1 ? ' ' : ''}</span>;
                })}
              </h1>
              
              <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                {content?.hero?.subtitle || 'La plataforma de mapas mentales más potente para empresarios. Organiza ideas, planifica estrategias y toma mejores decisiones en minutos, no en horas.'}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mb-8">
                <button
                  onClick={onRegister}
                  className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 flex items-center justify-center gap-2 transition-all hover:scale-105"
                >
                  {content?.hero?.btn_primary || 'Empieza gratis ahora'}
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={onDemo}
                  className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-lg rounded-2xl border-2 border-gray-200 hover:border-blue-300 flex items-center justify-center gap-2 transition-all hover:scale-105"
                >
                  <Play size={18} className="text-blue-600" />
                  {content?.hero?.btn_secondary || 'Ver demo'}
                </button>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                        {['JM', 'AP', 'CL', 'RD'][i-1]}
                      </div>
                    ))}
                  </div>
                  <span className="font-medium">{content?.hero?.trust_users || '+2,500 usuarios'}</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />
                  ))}
                  <span className="font-medium ml-1">{content?.hero?.trust_rating || '4.9/5'}</span>
                </div>
              </div>
            </div>

            {/* Right - Hero image */}
            <div className="relative">
              <div className="relative bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl shadow-gray-300/50 p-2 border border-gray-200/50">
                <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 p-6">
                  {/* Mock mindmap visualization */}
                  <div className="relative aspect-[4/3] flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center justify-center">
                      {/* Central node */}
                      <div className="absolute w-32 h-16 bg-white rounded-xl shadow-lg flex items-center justify-center z-20">
                        <Brain className="text-blue-600 mr-2" size={20} />
                        <span className="font-bold text-gray-800 text-sm">Tu Negocio</span>
                      </div>
                      
                      {/* Branch nodes */}
                      {[
                        { x: -140, y: -80, label: 'Marketing', color: 'bg-emerald-500' },
                        { x: 140, y: -80, label: 'Ventas', color: 'bg-amber-500' },
                        { x: -140, y: 80, label: 'Producto', color: 'bg-purple-500' },
                        { x: 140, y: 80, label: 'Finanzas', color: 'bg-rose-500' }
                      ].map((node, i) => (
                        <div 
                          key={i}
                          className="absolute w-24 h-12 bg-white/90 backdrop-blur rounded-lg shadow-md flex items-center justify-center z-10"
                          style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
                        >
                          <div className={`w-3 h-3 ${node.color} rounded-full mr-2`} />
                          <span className="font-medium text-gray-700 text-xs">{node.label}</span>
                        </div>
                      ))}
                      
                      {/* Connection lines */}
                      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 5 }}>
                        <line x1="50%" y1="50%" x2="25%" y2="25%" stroke="white" strokeWidth="2" opacity="0.5" />
                        <line x1="50%" y1="50%" x2="75%" y2="25%" stroke="white" strokeWidth="2" opacity="0.5" />
                        <line x1="50%" y1="50%" x2="25%" y2="75%" stroke="white" strokeWidth="2" opacity="0.5" />
                        <line x1="50%" y1="50%" x2="75%" y2="75%" stroke="white" strokeWidth="2" opacity="0.5" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Floating badges */}
                <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg px-3 py-2 flex items-center gap-2 border border-gray-100">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="text-green-600" size={18} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Auto-guardado</span>
                </div>
                
                <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg px-3 py-2 flex items-center gap-2 border border-gray-100">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="text-blue-600" size={18} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">3 colaborando</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== LOGOS / SOCIAL PROOF ==================== */}
      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-gray-500 mb-8">
            EMPRESAS QUE CONFÍAN EN MINDORAMAP
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
            {['TechCorp', 'InnovateLab', 'StartupX', 'GrowthCo', 'FutureBiz'].map((company, i) => (
              <div key={i} className="text-xl lg:text-2xl font-bold text-gray-400">
                {company}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PLATFORM SECTION ==================== */}
      <section id="plataforma" className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold mb-4">
              <Layers size={16} />
              Plataforma completa
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              {content?.platform?.title || 'Todo lo que necesitas para organizar tu negocio'}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {content?.platform?.subtitle || 'Una suite completa de herramientas diseñadas específicamente para empresarios que buscan claridad y resultados.'}
            </p>
          </div>

          {/* Platform showcase */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-16">
            <div className="order-2 lg:order-1">
              <div className="space-y-6">
                {platformFeatures.slice(0, 3).map((feature, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-blue-50 transition-colors group">
                    <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                      <feature.icon className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{feature.title}</h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-3xl blur-2xl opacity-20" />
                <img 
                  src={MINDMAP_IMAGES.platform1}
                  alt="MindoraMap en acción"
                  className="relative rounded-2xl shadow-2xl w-full"
                />
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl blur-2xl opacity-20" />
                <img 
                  src={MINDMAP_IMAGES.platform2}
                  alt="Colaboración en tiempo real"
                  className="relative rounded-2xl shadow-2xl w-full"
                />
              </div>
            </div>
            <div>
              <div className="space-y-6">
                {platformFeatures.slice(3).map((feature, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-purple-50 transition-colors group">
                    <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                      <feature.icon className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{feature.title}</h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== BENEFITS SECTION ==================== */}
      <section id="beneficios" className="py-20 lg:py-32 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-blue-300 rounded-full text-sm font-semibold mb-4 border border-white/10">
              <Zap size={16} />
              Beneficios comprobados
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              {content?.benefits?.title || 'Resultados que puedes medir desde el día 1'}
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              {content?.benefits?.subtitle || 'Miles de empresarios ya transformaron su forma de trabajar. Estos son los beneficios que más valoran.'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {benefits.map((benefit, i) => (
              <div 
                key={i}
                className="group relative p-6 lg:p-8 rounded-3xl bg-white/5 backdrop-blur border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${benefit.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                  <benefit.icon className="text-white" size={26} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{benefit.title}</h3>
                <p className="text-gray-400 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS SECTION ==================== */}
      <section id="como-funciona" className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-4">
              <Rocket size={16} />
              Empieza en minutos
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Tan simple como
              <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent"> 1, 2, 3, 4</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              No necesitas tutoriales de horas. En menos de 5 minutos estarás creando tu primer mapa mental.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorksSteps.map((step, i) => (
              <div key={i} className="relative group">
                {/* Connector line */}
                {i < howItWorksSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-emerald-300 to-transparent" />
                )}
                
                <div className="relative bg-white rounded-3xl p-6 lg:p-8 border-2 border-gray-100 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-100 transition-all">
                  <div className="text-5xl lg:text-6xl font-black text-emerald-100 mb-4">
                    {step.number}
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                    <step.icon className="text-white" size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <button
              onClick={onRegister}
              className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-lg rounded-2xl shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all hover:scale-105"
            >
              Comenzar ahora - Es gratis
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ==================== PRICING SECTION ==================== */}
      <section id="planes" className="py-20 lg:py-32 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
              <BarChart3 size={16} />
              Precios transparentes
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Un plan para cada
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> etapa de tu negocio</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Empieza gratis y escala cuando lo necesites. Sin sorpresas, sin cargos ocultos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {plans.map((plan, i) => (
              <div 
                key={plan.id || i}
                className={`relative rounded-3xl p-6 lg:p-8 transition-all ${
                  plan.popular 
                    ? 'bg-white shadow-2xl shadow-blue-500/20 scale-105 border-2 border-blue-500 z-10' 
                    : plan.coming_soon
                    ? 'bg-gray-50 shadow-lg border border-gray-200 opacity-80'
                    : 'bg-white shadow-xl border border-gray-200 hover:shadow-2xl hover:border-gray-300'
                }`}
              >
                {/* Badge Popular */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-full shadow-lg whitespace-nowrap">
                      <Star size={14} fill="currentColor" />
                      RECOMENDADO
                    </div>
                  </div>
                )}

                {/* Badge Coming Soon */}
                {plan.coming_soon && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-600 text-white text-sm font-bold rounded-full shadow-lg whitespace-nowrap">
                      Próximamente
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  {/* Early Access Badge */}
                  {plan.badge && !plan.coming_soon && (
                    <div className="inline-block mb-3">
                      <span className="text-xs font-semibold px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {plan.badge}
                      </span>
                    </div>
                  )}
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.display_name || plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-4xl lg:text-5xl font-black text-gray-900">{plan.price_display || plan.price}</span>
                    <span className="text-gray-500 font-medium text-sm">{plan.period}</span>
                  </div>
                  <p className="text-gray-500 text-sm">{plan.description}</p>
                  
                  {/* Usuarios */}
                  {plan.users_max && plan.users_max > 1 && (
                    <p className="text-xs text-blue-600 mt-2 font-medium">
                      {plan.users_min === plan.users_max 
                        ? `${plan.users_max} usuarios`
                        : plan.users_max === -1 
                        ? `${plan.users_min}+ usuarios`
                        : `${plan.users_min}-${plan.users_max} usuarios`
                      }
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-6">
                  {(plan.features || []).map((feature, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <CheckCircle2 size={18} className={`flex-shrink-0 mt-0.5 ${plan.popular ? 'text-blue-600' : 'text-emerald-500'}`} />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={plan.coming_soon ? undefined : onRegister}
                  disabled={plan.coming_soon}
                  className={`w-full py-3.5 px-6 rounded-xl font-bold transition-all text-sm ${
                    plan.coming_soon
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Nota de Early Access */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500">
              🚀 <strong>Precios Early Access</strong> - Aprovecha ahora y mantén tu precio para siempre
            </p>
          </div>
        </div>
      </section>

      {/* ==================== FAQ SECTION ==================== */}
      <section id="faq" className="py-20 lg:py-32 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold mb-4">
              <Lightbulb size={16} />
              Resolvemos tus dudas
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Preguntas
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"> frecuentes</span>
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div 
                key={i}
                className="border border-gray-200 rounded-2xl overflow-hidden hover:border-purple-300 transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center transition-transform ${openFaq === i ? 'rotate-180' : ''}`}>
                    <ChevronDown size={18} className="text-purple-600" />
                  </div>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 pt-0">
                    <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur text-white rounded-full text-sm font-semibold mb-6 border border-white/20">
            <Sparkles size={16} />
            Únete a +2,500 empresarios
          </div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6 leading-tight">
            ¿Listo para transformar
            <span className="block">tu forma de pensar?</span>
          </h2>
          
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Empieza gratis hoy y descubre por qué miles de empresarios 
            eligen MindoraMap para organizar sus ideas y negocios.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onRegister}
              className="group w-full sm:w-auto px-10 py-5 bg-white hover:bg-gray-100 text-blue-600 font-bold text-lg rounded-2xl shadow-2xl flex items-center justify-center gap-2 transition-all hover:scale-105"
            >
              Crear cuenta gratis
              <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={onLogin}
              className="w-full sm:w-auto px-10 py-5 bg-white/10 hover:bg-white/20 backdrop-blur text-white font-bold text-lg rounded-2xl border-2 border-white/30 transition-all"
            >
              Ya tengo cuenta
            </button>
          </div>

          <p className="mt-8 text-blue-200 text-sm">
            ✓ Sin tarjeta de crédito &nbsp;&nbsp; ✓ Configuración en 2 minutos &nbsp;&nbsp; ✓ Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center mb-4">
                <img src={LOGO_URL} alt="MindoraMap" className="h-12 w-auto" />
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                La plataforma de mapas mentales diseñada para empresarios que buscan claridad, organización y resultados.
              </p>
              <div className="flex gap-4">
                {['Twitter', 'LinkedIn', 'YouTube'].map((social, i) => (
                  <a key={i} href="#" className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                    <span className="text-xs font-bold">{social[0]}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Producto</h4>
              <ul className="space-y-3">
                {['Características', 'Precios', 'Integraciones', 'Actualizaciones'].map((link, i) => (
                  <li key={i}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Empresa</h4>
              <ul className="space-y-3">
                {['Sobre nosotros', 'Blog', 'Contacto', 'Empleo'].map((link, i) => (
                  <li key={i}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} MindoraMap. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <button onClick={onTerms} className="text-gray-500 hover:text-white transition-colors">Términos</button>
              <button onClick={onPrivacy} className="text-gray-500 hover:text-white transition-colors">Privacidad</button>
              <button onClick={onCookies} className="text-gray-500 hover:text-white transition-colors">Cookies</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
