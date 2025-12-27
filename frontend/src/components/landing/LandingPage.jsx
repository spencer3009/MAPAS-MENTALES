import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, Zap, Target, Users, CheckCircle2, ArrowRight, Sparkles, TrendingUp, Clock, Lightbulb,
  BarChart3, Briefcase, Rocket, Shield, Star, ChevronDown, ChevronUp, Play, Layers, GitBranch,
  Network, PenTool, Share2, Download, Menu, X, MousePointer, Palette, FolderTree, Eye, Edit3,
  Save, Loader2, Check
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_mindviz-app/artifacts/k1kioask_image.png';

// Componente de texto editable inline
const EditableText = ({ value, onChange, onSave, isAdmin, className, as: Tag = 'span', multiline = false }) => {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(tempValue);
    setSaving(false);
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) {
      handleSave();
    }
    if (e.key === 'Escape') {
      setTempValue(value);
      setEditing(false);
    }
  };

  if (!isAdmin) {
    return <Tag className={className}>{value}</Tag>;
  }

  if (editing) {
    return (
      <div className="inline-flex items-center gap-2 relative">
        {multiline ? (
          <textarea
            ref={inputRef}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`${className} bg-white/90 border-2 border-blue-500 rounded px-2 py-1 outline-none min-w-[200px]`}
            rows={3}
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`${className} bg-white/90 border-2 border-blue-500 rounded px-2 py-1 outline-none min-w-[100px]`}
          />
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="p-1.5 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors shadow-lg"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        </button>
        <button
          onClick={() => { setTempValue(value); setEditing(false); }}
          className="p-1.5 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors shadow-lg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <span className="group inline relative">
      <Tag className={className}>{value}</Tag>
      <button
        onClick={() => setEditing(true)}
        className="absolute -right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all shadow-lg"
        title="Editar texto"
      >
        <Edit3 className="w-3 h-3" />
      </button>
    </span>
  );
};

// Iconos para las características
const featureIcons = [Brain, Zap, Layers, Download, GitBranch, MousePointer];
const benefitIcons = [Lightbulb, Clock, Palette, Users, Target, Brain];

const LandingPage = ({ onLogin, onRegister, onBackToApp, isEditMode = false }) => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [isAdmin, setIsAdmin] = useState(isEditMode);
  const [token, setToken] = useState(null);

  // Cargar contenido desde la BD
  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await fetch(`${API_URL}/api/landing-content`);
        if (response.ok) {
          const data = await response.json();
          setContent(data);
        }
      } catch (error) {
        console.error('Error loading landing content:', error);
      }
      setLoading(false);
    };

    // Check if user is admin
    const storedToken = localStorage.getItem('mm_auth_token');
    const storedUser = localStorage.getItem('mm_auth_user');
    if (storedToken && storedUser) {
      const user = JSON.parse(storedUser);
      setIsAdmin(user.role === 'admin');
      setToken(storedToken);
    }

    loadContent();
  }, []);

  // Guardar cambios en una sección
  const saveSection = async (section, data) => {
    if (!isAdmin || !token) return;
    
    try {
      await fetch(`${API_URL}/api/admin/landing-content/${section}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      
      // Actualizar estado local
      setContent(prev => ({
        ...prev,
        [section]: data
      }));
    } catch (error) {
      console.error('Error saving content:', error);
    }
  };

  // Helper para actualizar un campo específico
  const updateField = (section, field, value) => {
    const sectionData = { ...content[section], [field]: value };
    saveSection(section, sectionData);
  };

  // Helper para actualizar items de un array
  const updateArrayItem = (section, arrayField, index, field, value) => {
    const items = [...content[section][arrayField]];
    items[index] = { ...items[index], [field]: value };
    const sectionData = { ...content[section], [arrayField]: items };
    saveSection(section, sectionData);
  };

  if (loading || !content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  const { nav = {}, hero = {}, platform = {}, benefits = {}, how_it_works = {}, pricing = {}, faq = {}, final_cta = {}, footer = {} } = content;

  return (
    <div className="min-h-screen bg-white">
      {/* Admin indicator */}
      {isAdmin && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3">
          <div className="bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm">
            <Edit3 className="w-4 h-4" />
            Modo edición activo
          </div>
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="bg-gray-900 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm hover:bg-gray-800 transition-colors"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              Volver a la app
            </button>
          )}
        </div>
      )}

      {/* ==================== HEADER ==================== */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-lg z-50 border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-24 lg:h-28">
            <a href="#inicio" className="flex items-center group">
              <img src={LOGO_URL} alt="MindoraMap" className="h-20 lg:h-24 w-auto" />
            </a>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {['inicio', 'plataforma', 'beneficios', 'como_funciona', 'planes', 'faq'].map((key) => (
                <a
                  key={key}
                  href={`#${key.replace('_', '-')}`}
                  className="px-4 py-2 text-gray-600 hover:text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors text-sm"
                >
                  <EditableText
                    value={nav[`menu_${key}`] || key}
                    isAdmin={isAdmin}
                    onSave={(val) => updateField('nav', `menu_${key}`, val)}
                  />
                </a>
              ))}
            </nav>

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center gap-3">
              <button onClick={onLogin} className="px-4 py-2 text-gray-600 hover:text-blue-600 font-medium transition-colors">
                <EditableText
                  value={nav.btn_login || 'Iniciar sesión'}
                  isAdmin={isAdmin}
                  onSave={(val) => updateField('nav', 'btn_login', val)}
                />
              </button>
              <button onClick={onRegister} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-600/30">
                <EditableText
                  value={nav.btn_registro || 'Empezar gratis'}
                  isAdmin={isAdmin}
                  onSave={(val) => updateField('nav', 'btn_registro', val)}
                />
              </button>
            </div>

            {/* Mobile menu button */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 text-gray-600 hover:text-blue-600 transition-colors">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 py-4 px-4 space-y-2">
            {['inicio', 'plataforma', 'beneficios', 'como_funciona', 'planes', 'faq'].map((key) => (
              <a key={key} href={`#${key.replace('_', '-')}`} onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 text-gray-600 hover:text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors">
                {nav[`menu_${key}`] || key}
              </a>
            ))}
            <div className="pt-4 border-t border-gray-100 space-y-2">
              <button onClick={onLogin} className="w-full px-4 py-2 text-gray-600 hover:text-blue-600 font-medium transition-colors">
                {nav.btn_login || 'Iniciar sesión'}
              </button>
              <button onClick={onRegister} className="w-full px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl">
                {nav.btn_registro || 'Empezar gratis'}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ==================== HERO SECTION ==================== */}
      <section id="inicio" className="relative pt-32 lg:pt-40 pb-20 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <EditableText
                value={hero.badge || '+2,500 empresarios ya confían en nosotros'}
                isAdmin={isAdmin}
                onSave={(val) => updateField('hero', 'badge', val)}
                className="text-sm font-medium text-blue-700"
              />
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              <EditableText
                value={hero.title || 'Convierte el caos en claridad'}
                isAdmin={isAdmin}
                onSave={(val) => updateField('hero', 'title', val)}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900"
              />
            </h1>

            {/* Subtitle */}
            <p className="text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto mb-10">
              <EditableText
                value={hero.subtitle || 'Organiza tus ideas, proyectos y metas con mapas mentales intuitivos.'}
                isAdmin={isAdmin}
                onSave={(val) => updateField('hero', 'subtitle', val)}
                multiline
                className="text-lg lg:text-xl text-gray-600"
              />
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <button onClick={onRegister} className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2">
                <EditableText
                  value={hero.btn_primary || 'Empieza gratis ahora'}
                  isAdmin={isAdmin}
                  onSave={(val) => updateField('hero', 'btn_primary', val)}
                />
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="group w-full sm:w-auto px-8 py-4 bg-white text-gray-700 font-semibold rounded-2xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
                <Play className="w-5 h-5 text-blue-600" />
                <EditableText
                  value={hero.btn_secondary || 'Ver demo'}
                  isAdmin={isAdmin}
                  onSave={(val) => updateField('hero', 'btn_secondary', val)}
                />
              </button>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <EditableText
                  value={hero.trust_users || '+2,500 usuarios'}
                  isAdmin={isAdmin}
                  onSave={(val) => updateField('hero', 'trust_users', val)}
                />
              </div>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                <span className="ml-1">
                  <EditableText
                    value={hero.trust_rating || '4.9/5'}
                    isAdmin={isAdmin}
                    onSave={(val) => updateField('hero', 'trust_rating', val)}
                  />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== PLATFORM SECTION ==================== */}
      <section id="plataforma" className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              <EditableText
                value={platform.title || 'Una plataforma diseñada para potenciar tu productividad'}
                isAdmin={isAdmin}
                onSave={(val) => updateField('platform', 'title', val)}
                className="text-3xl lg:text-4xl font-bold text-gray-900"
              />
            </h2>
            <p className="text-lg text-gray-600">
              <EditableText
                value={platform.subtitle || 'Descubre todas las herramientas que MindoraMap pone a tu disposición'}
                isAdmin={isAdmin}
                onSave={(val) => updateField('platform', 'subtitle', val)}
                multiline
              />
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(platform.features || []).map((feature, index) => {
              const Icon = featureIcons[index % featureIcons.length];
              return (
                <div key={index} className="group p-6 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-blue-100">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Icon className="w-6 h-6 text-blue-600 group-hover:text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    <EditableText
                      value={feature.title}
                      isAdmin={isAdmin}
                      onSave={(val) => updateArrayItem('platform', 'features', index, 'title', val)}
                    />
                  </h3>
                  <p className="text-gray-600">
                    <EditableText
                      value={feature.description}
                      isAdmin={isAdmin}
                      onSave={(val) => updateArrayItem('platform', 'features', index, 'description', val)}
                    />
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== BENEFITS SECTION ==================== */}
      <section id="beneficios" className="py-20 lg:py-32 bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              <EditableText
                value={benefits.title || 'Beneficios que transformarán tu forma de trabajar'}
                isAdmin={isAdmin}
                onSave={(val) => updateField('benefits', 'title', val)}
                className="text-3xl lg:text-4xl font-bold text-white"
              />
            </h2>
            <p className="text-lg text-blue-200">
              <EditableText
                value={benefits.subtitle || 'Descubre por qué miles de profesionales eligen MindoraMap'}
                isAdmin={isAdmin}
                onSave={(val) => updateField('benefits', 'subtitle', val)}
              />
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(benefits.items || []).map((benefit, index) => {
              const Icon = benefitIcons[index % benefitIcons.length];
              return (
                <div key={index} className="p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/20 transition-all">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    <EditableText
                      value={benefit.title}
                      isAdmin={isAdmin}
                      onSave={(val) => updateArrayItem('benefits', 'items', index, 'title', val)}
                    />
                  </h3>
                  <p className="text-blue-200">
                    <EditableText
                      value={benefit.description}
                      isAdmin={isAdmin}
                      onSave={(val) => updateArrayItem('benefits', 'items', index, 'description', val)}
                    />
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section id="como-funciona" className="py-20 lg:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              <EditableText
                value={how_it_works.title || '¿Cómo funciona?'}
                isAdmin={isAdmin}
                onSave={(val) => updateField('how_it_works', 'title', val)}
                className="text-3xl lg:text-4xl font-bold text-gray-900"
              />
            </h2>
            <p className="text-lg text-gray-600">
              <EditableText
                value={how_it_works.subtitle || 'Comienza a organizar tus ideas en 4 simples pasos'}
                isAdmin={isAdmin}
                onSave={(val) => updateField('how_it_works', 'subtitle', val)}
              />
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {(how_it_works.steps || []).map((step, index) => (
              <div key={index} className="relative text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
                  <span className="text-xl font-bold text-white">
                    <EditableText
                      value={step.number}
                      isAdmin={isAdmin}
                      onSave={(val) => updateArrayItem('how_it_works', 'steps', index, 'number', val)}
                    />
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  <EditableText
                    value={step.title}
                    isAdmin={isAdmin}
                    onSave={(val) => updateArrayItem('how_it_works', 'steps', index, 'title', val)}
                  />
                </h3>
                <p className="text-gray-600">
                  <EditableText
                    value={step.description}
                    isAdmin={isAdmin}
                    onSave={(val) => updateArrayItem('how_it_works', 'steps', index, 'description', val)}
                  />
                </p>
                {index < (how_it_works.steps?.length || 0) - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-blue-300 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PRICING SECTION ==================== */}
      <section id="planes" className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              <EditableText
                value={pricing.title || 'Planes y Precios'}
                isAdmin={isAdmin}
                onSave={(val) => updateField('pricing', 'title', val)}
                className="text-3xl lg:text-4xl font-bold text-gray-900"
              />
            </h2>
            <p className="text-lg text-gray-600">
              <EditableText
                value={pricing.subtitle || 'Elige el plan que mejor se adapte a tus necesidades'}
                isAdmin={isAdmin}
                onSave={(val) => updateField('pricing', 'subtitle', val)}
              />
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {(pricing.plans || []).map((plan, index) => (
              <div key={index} className={`relative p-8 rounded-3xl border-2 ${plan.popular ? 'border-blue-600 bg-blue-50 shadow-xl' : 'border-gray-200 bg-white'}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-sm font-semibold rounded-full">
                    Más popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  <EditableText
                    value={plan.name}
                    isAdmin={isAdmin}
                    onSave={(val) => updateArrayItem('pricing', 'plans', index, 'name', val)}
                  />
                </h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold text-gray-900">
                    <EditableText
                      value={plan.price}
                      isAdmin={isAdmin}
                      onSave={(val) => updateArrayItem('pricing', 'plans', index, 'price', val)}
                    />
                  </span>
                  <span className="text-gray-500">
                    <EditableText
                      value={plan.period}
                      isAdmin={isAdmin}
                      onSave={(val) => updateArrayItem('pricing', 'plans', index, 'period', val)}
                    />
                  </span>
                </div>
                <p className="text-gray-600 mb-6">
                  <EditableText
                    value={plan.description}
                    isAdmin={isAdmin}
                    onSave={(val) => updateArrayItem('pricing', 'plans', index, 'description', val)}
                  />
                </p>
                <ul className="space-y-3 mb-8">
                  {(plan.features || []).map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center gap-2 text-gray-600">
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button onClick={onRegister} className={`w-full py-3 rounded-xl font-semibold transition-all ${plan.popular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  <EditableText
                    value={plan.btn_text}
                    isAdmin={isAdmin}
                    onSave={(val) => updateArrayItem('pricing', 'plans', index, 'btn_text', val)}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FAQ SECTION ==================== */}
      <section id="faq" className="py-20 lg:py-32 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              <EditableText
                value={faq.title || 'Preguntas Frecuentes'}
                isAdmin={isAdmin}
                onSave={(val) => updateField('faq', 'title', val)}
                className="text-3xl lg:text-4xl font-bold text-gray-900"
              />
            </h2>
            <p className="text-lg text-gray-600">
              <EditableText
                value={faq.subtitle || 'Resolvemos tus dudas'}
                isAdmin={isAdmin}
                onSave={(val) => updateField('faq', 'subtitle', val)}
              />
            </p>
          </div>

          <div className="space-y-4">
            {(faq.questions || []).map((item, index) => (
              <div key={index} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-semibold text-gray-900">
                    <EditableText
                      value={item.question}
                      isAdmin={isAdmin}
                      onSave={(val) => updateArrayItem('faq', 'questions', index, 'question', val)}
                    />
                  </span>
                  {openFaq === index ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6 text-gray-600">
                    <EditableText
                      value={item.answer}
                      isAdmin={isAdmin}
                      onSave={(val) => updateArrayItem('faq', 'questions', index, 'answer', val)}
                      multiline
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="py-20 lg:py-32 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            <EditableText
              value={final_cta.title || '¿Listo para transformar tu manera de pensar?'}
              isAdmin={isAdmin}
              onSave={(val) => updateField('final_cta', 'title', val)}
              className="text-3xl lg:text-4xl font-bold text-white"
            />
          </h2>
          <p className="text-lg text-blue-100 mb-8">
            <EditableText
              value={final_cta.subtitle || 'Únete a miles de profesionales que ya organizan sus ideas con MindoraMap'}
              isAdmin={isAdmin}
              onSave={(val) => updateField('final_cta', 'subtitle', val)}
            />
          </p>
          <button onClick={onRegister} className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-2xl hover:bg-blue-50 transition-all shadow-xl flex items-center gap-2 mx-auto">
            <EditableText
              value={final_cta.btn_text || 'Comenzar gratis ahora'}
              isAdmin={isAdmin}
              onSave={(val) => updateField('final_cta', 'btn_text', val)}
            />
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-1">
              <img src={LOGO_URL} alt="MindoraMap" className="h-16 w-auto mb-4" />
              <p className="text-sm">
                <EditableText
                  value={footer.description || 'La herramienta de mapas mentales más potente.'}
                  isAdmin={isAdmin}
                  onSave={(val) => updateField('footer', 'description', val)}
                />
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">
                <EditableText
                  value={footer.col1_title || 'Producto'}
                  isAdmin={isAdmin}
                  onSave={(val) => updateField('footer', 'col1_title', val)}
                />
              </h4>
              <ul className="space-y-2 text-sm">
                {(footer.col1_links || []).map((link, i) => (
                  <li key={i}><a href="#" className="hover:text-white transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">
                <EditableText
                  value={footer.col2_title || 'Recursos'}
                  isAdmin={isAdmin}
                  onSave={(val) => updateField('footer', 'col2_title', val)}
                />
              </h4>
              <ul className="space-y-2 text-sm">
                {(footer.col2_links || []).map((link, i) => (
                  <li key={i}><a href="#" className="hover:text-white transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">
                <EditableText
                  value={footer.col3_title || 'Empresa'}
                  isAdmin={isAdmin}
                  onSave={(val) => updateField('footer', 'col3_title', val)}
                />
              </h4>
              <ul className="space-y-2 text-sm">
                {(footer.col3_links || []).map((link, i) => (
                  <li key={i}><a href="#" className="hover:text-white transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">
              <EditableText
                value={footer.copyright || '© 2024 MindoraMap. Todos los derechos reservados.'}
                isAdmin={isAdmin}
                onSave={(val) => updateField('footer', 'copyright', val)}
              />
            </p>
            <div className="flex items-center gap-4 text-sm">
              {(footer.legal_links || []).map((link, i) => (
                <a key={i} href="#" className="hover:text-white transition-colors">{link}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
