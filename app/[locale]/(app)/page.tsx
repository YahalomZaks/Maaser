"use client";
import Lottie from "lottie-react";
import { Calculator, ListChecks, Scale, Bell, TrendingUp, Smartphone, Rocket, Shield, Sparkles, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
 
import welcomeAnimation from "@/animation/welcomeAnimation.json";
import Footer from "@/components/shared/Footer";

const HomePage = () => {
  const t = useTranslations('welcome');
  const locale = useLocale();

  return (
    <div className="welcome-page min-h-screen" style={{ backgroundColor: 'var(--neutral-50)' }}>
      {/* Background pattern */}
    <div className="welcome-bg-grid" />
    <div className="welcome-bg-gradient" />

      {/* Hero Section */}
      <section className="welcome-hero">
        <div className="welcome-hero-container">
          {/* Hero Content */}
          <div className="welcome-hero-content">
            <h1 className="welcome-hero-title">
              {t('title.main')} {" "}
              <span className="welcome-gradient-text">
                {t('title.highlight')}
              </span>{" "}
              {t('title.suffix')}
            </h1>
            
            <div className="welcome-hero-subtitle">
              <p>{t('subtitle.problem')}</p>
              <br />
              <p>
                <strong style={{ color: 'var(--neutral-900)' }}>{t('subtitle.solution')}</strong>{" "}
                {t('subtitle.description')}
              </p>
            </div>
            
            <div className="welcome-hero-buttons">
              <Link href={`/${locale}/signin`} className="welcome-btn welcome-btn-primary welcome-btn-large">
                {t('buttons.start')}
              </Link>
              <Link href={`/${locale}/signup`} className="welcome-btn welcome-btn-secondary welcome-btn-large">
                {t('buttons.howItWorks')}
              </Link>
            </div>
            
            <div className="welcome-hero-note">
              <p style={{ color: 'var(--neutral-600)', margin: 0, whiteSpace: 'pre-line' }}>
                <Shield className="h-5 w-5" style={{ color: '#059669', marginLeft: '0.5rem', display: 'inline' }} />
                {t('note')}
              </p>
            </div>
          </div>
          
          {/* Animation Container */}
          <div className="welcome-animation-container">
            <Lottie
              animationData={welcomeAnimation}
              loop
              autoplay
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="welcome-features">
        <div className="welcome-features-container">
          <div className="welcome-section-header">
            <div className="welcome-section-badge">
              <Sparkles className="h-4 w-4" style={{ color: 'var(--primary)' }} />
              <span>{t('features.badge')}</span>
            </div>
            <h2 className="welcome-section-title">
              {t('features.title')}
            </h2>
            <p className="welcome-section-subtitle">
              {t('features.subtitle')}
            </p>
          </div>
          
          <div className="welcome-features-grid">
            {[
              { icon: Calculator, title: t('features.items.calculator.title'), description: t('features.items.calculator.description') },
              { icon: ListChecks, title: t('features.items.management.title'), description: t('features.items.management.description') },
              { icon: Scale, title: t('features.items.balance.title'), description: t('features.items.balance.description') },
              { icon: Bell, title: t('features.items.notifications.title'), description: t('features.items.notifications.description') },
              { icon: TrendingUp, title: t('features.items.tracking.title'), description: t('features.items.tracking.description') },
              { icon: Smartphone, title: t('features.items.mobile.title'), description: t('features.items.mobile.description') }
            ].map((feature, index) => (
              <div key={index} className="welcome-feature-card">
                <div className="welcome-feature-icon">
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="welcome-feature-title">{feature.title}</h3>
                <p className="welcome-feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="welcome-cta">
        <div className="welcome-cta-container">
          <h2 className="welcome-cta-title">
            {t('cta.title')}
          </h2>
          <p className="welcome-cta-subtitle">
            {t('cta.subtitle')}
          </p>
          <div className="welcome-cta-buttons">
            <Link href={`/${locale}/signup`} className="welcome-btn welcome-btn-white welcome-btn-large">
              <Rocket className="h-5 w-5" style={{ marginRight: '0.5rem' }} />
              {t('cta.buttons.start')}
            </Link>
            <Link href={`/${locale}/faq`} className="welcome-btn welcome-btn-secondary welcome-btn-large" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}>
              <MessageCircle className="h-5 w-5" style={{ marginRight: '0.5rem' }} />
              {t('cta.buttons.questions')}
            </Link>
          </div>
        </div>
      </section>
      
      <Footer />
      
      {/* Feedback FAB removed per request; feedback now available from authenticated user menu */}
    </div>
  );
};

export default HomePage;
