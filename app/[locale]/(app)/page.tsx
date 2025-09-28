"use client";

import {
  Calculator,
  ListChecks,
  Scale,
  Bell,
  TrendingUp,
  Smartphone,
  Heart,
  Rocket,
  InfoIcon,
  Shield,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import FeedbackButton from "@/components/shared/FeedbackButton";
import Footer from "@/components/shared/Footer";
import { useWelcomePageAnimations } from '@/hooks/useWelcomePageAnimations';

const HomePage = () => {
  const t = useTranslations('welcome');
  const locale = useLocale();
  
  // Initialize animations
  useWelcomePageAnimations();
  
  const heroContentRef = useRef<HTMLDivElement>(null);
  const animationContainerRef = useRef<HTMLDivElement>(null);
  const featureCardsRef = useRef<HTMLDivElement[]>([]);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const transactionItemsRef = useRef<HTMLDivElement[]>([]);
  const stepIconsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    // Simple fade-in animations without GSAP
    const animateOnLoad = () => {
      // Hero content animation
      if (heroContentRef.current) {
        heroContentRef.current.style.opacity = '1';
        heroContentRef.current.style.transform = 'translateY(0)';
      }

      // Animation container
      setTimeout(() => {
        if (animationContainerRef.current) {
          animationContainerRef.current.style.opacity = '1';
          animationContainerRef.current.style.transform = 'translateY(0)';
        }
      }, 400);

      // Feature cards animation
      featureCardsRef.current.forEach((card, index) => {
        if (card) {
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 600 + index * 100);
        }
      });

      // Dashboard animation
      setTimeout(startDashboardAnimation, 1000);
    };

    const startDashboardAnimation = () => {
      const animateStep = () => {
        // Reset states
        if (progressFillRef.current) {
          progressFillRef.current.style.width = '0%';
        }
        transactionItemsRef.current.forEach(item => {
          if (item) {
            item.style.opacity = '0';
            item.style.transform = 'translateX(20px)';
          }
        });

        // Step 1
        setTimeout(() => {
          if (stepIconsRef.current[0]) {
            stepIconsRef.current[0].style.backgroundColor = '#2563eb';
            stepIconsRef.current[0].style.transform = 'scale(1.1)';
          }
        }, 0);

        setTimeout(() => {
          if (stepIconsRef.current[0]) {
            stepIconsRef.current[0].style.transform = 'scale(1)';
          }
        }, 500);

        // Step 2
        setTimeout(() => {
          if (stepIconsRef.current[1]) {
            stepIconsRef.current[1].style.backgroundColor = '#0891b2';
            stepIconsRef.current[1].style.transform = 'scale(1.1)';
          }
          if (progressFillRef.current) {
            progressFillRef.current.style.width = '50%';
          }
        }, 700);

        setTimeout(() => {
          if (stepIconsRef.current[1]) {
            stepIconsRef.current[1].style.transform = 'scale(1)';
          }
        }, 1200);

        // Step 3
        setTimeout(() => {
          if (stepIconsRef.current[2]) {
            stepIconsRef.current[2].style.backgroundColor = '#059669';
            stepIconsRef.current[2].style.transform = 'scale(1.1)';
          }
          if (progressFillRef.current) {
            progressFillRef.current.style.width = '100%';
          }
          // Show transactions
          transactionItemsRef.current.forEach((item, index) => {
            if (item) {
              setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
              }, index * 100);
            }
          });
        }, 1400);

        setTimeout(() => {
          if (stepIconsRef.current[2]) {
            stepIconsRef.current[2].style.transform = 'scale(1)';
          }
        }, 1900);
      };

      // Run animation in loop
      animateStep();
      setInterval(animateStep, 6000);
    };

    animateOnLoad();
  }, []);

  return (
    <div className="welcome-page min-h-screen" style={{ backgroundColor: 'var(--neutral-50)' }}>
      {/* Background pattern */}
    <div className="welcome-bg-grid" />
    <div className="welcome-bg-gradient" />

      {/* Navigation */}
      <nav className="welcome-navbar">
        <div className="welcome-nav-container">
          <div className="welcome-logo">
            <div className="welcome-logo-icon">
              <i className="fas fa-chart-line" />
            </div>
            <span>מעשרות</span>
          </div>
          <div className="welcome-nav-links">
            <a href="#features" className="welcome-nav-link">איך זה עוזר</a>
            <a href="#about" className="welcome-nav-link">אודות</a>
            <a href="#contact" className="welcome-nav-link">יצירת קשר</a>
            <div className="welcome-language-selector">
              <span>🇮🇱</span>
              <span>עברית</span>
              <i className="fas fa-chevron-down" style={{ fontSize: '0.8rem' }} />
            </div>
            <Link href={`/${locale}/signin`} className="welcome-btn welcome-btn-secondary">התחבר</Link>
            <Link href={`/${locale}/signup`} className="welcome-btn welcome-btn-primary">הירשם בחינם</Link>
          </div>
        </div>
      </nav>
      
      {/* Hero Section */}
      <section className="welcome-hero">
        <div className="welcome-hero-container">
          {/* Hero Content */}
          <div 
            ref={heroContentRef}
            className="welcome-hero-content"
          >
            <div className="welcome-hero-badge">
              <Heart className="h-4 w-4" style={{ color: '#ef4444' }} />
              <span>{t('badge')}</span>
            </div>
            
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
                <Rocket className="h-5 w-5" style={{ marginRight: '0.5rem' }} />
                {t('buttons.start')}
              </Link>
              <a href="#features" className="welcome-btn welcome-btn-secondary welcome-btn-large">
                <InfoIcon className="h-5 w-5" style={{ marginRight: '0.5rem' }} />
                {t('buttons.howItWorks')}
              </a>
            </div>
            
            <div className="welcome-hero-note">
              <p style={{ color: 'var(--neutral-600)', margin: 0 }}>
                <Shield className="h-5 w-5" style={{ color: '#059669', marginLeft: '0.5rem', display: 'inline' }} />
                {t('note')}
              </p>
            </div>
          </div>
          
          {/* Animation Container */}
          <div 
            ref={animationContainerRef}
            className="welcome-animation-container"
          >
            <div className="welcome-financial-dashboard">
              {/* Dashboard Header */}
              <div className="welcome-dashboard-header">
                <h3 className="welcome-dashboard-title">{t('dashboard.title')}</h3>
                <span className="welcome-dashboard-status">
                  {t('dashboard.status')}
                </span>
              </div>
              
              {/* Income Display */}
              <div className="welcome-income-display">
                <div className="welcome-income-label">
                  {t('dashboard.income.label')}
                </div>
                <div className="welcome-income-amount">₪12,000</div>
                <div className="welcome-income-currency">
                  {t('dashboard.income.required')}: ₪1,200
                </div>
              </div>
              
              {/* Steps */}
              <div className="welcome-donation-flow">
                {[1, 2, 3].map((step, index) => (
                  <div key={step} className={`welcome-donation-step welcome-step-${step}`}>
                    <div 
                      ref={el => {
                        if (el) {
                          stepIconsRef.current[index] = el;
                        }
                      }}
                      className="welcome-step-icon"
                    >
                      {step}
                    </div>
                    <span className="welcome-step-label">
                      {t(`dashboard.steps.step${step}`)}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Progress Bar */}
              <div className="welcome-progress-bar">
                <div 
                  ref={progressFillRef}
                  className="welcome-progress-fill"
                />
              </div>
              
              {/* Transactions */}
              <div>
                {[
                  { icon: '🏥', name: t('dashboard.transactions.item1.name'), type: t('dashboard.transactions.item1.type'), amount: '₪500' },
                  { icon: '📚', name: t('dashboard.transactions.item2.name'), type: t('dashboard.transactions.item2.type'), amount: '₪400' },
                  { icon: '👥', name: t('dashboard.transactions.item3.name'), type: t('dashboard.transactions.item3.type'), amount: '₪300' }
                ].map((transaction, index) => (
                  <div 
                    key={index}
                    ref={el => {
                      if (el) {
                        transactionItemsRef.current[index] = el;
                      }
                    }}
                    className="welcome-transaction-item"
                  >
                    <div className="welcome-transaction-info">
                      <div className="welcome-transaction-icon">
                        {transaction.icon}
                      </div>
                      <div className="welcome-transaction-details">
                        <h4>{transaction.name}</h4>
                        <p>{transaction.type}</p>
                      </div>
                    </div>
                    <span className="welcome-transaction-amount">
                      {transaction.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
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
              <div 
                key={index}
                ref={el => {
                  if (el) {
                    featureCardsRef.current[index] = el;
                  }
                }}
                className="welcome-feature-card"
              >
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
            <a href="#contact" className="welcome-btn welcome-btn-secondary welcome-btn-large" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}>
              <MessageCircle className="h-5 w-5" style={{ marginRight: '0.5rem' }} />
              {t('cta.buttons.questions')}
            </a>
          </div>
        </div>
      </section>
      
      <Footer />
      
      {/* Feedback Button */}
      <FeedbackButton />
    </div>
  );
};

export default HomePage;
