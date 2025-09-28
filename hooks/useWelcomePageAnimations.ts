"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    gsap: any;
    ScrollTrigger: any;
  }
}

export const useWelcomePageAnimations = () => {
  useEffect(() => {
    // Check if GSAP is loaded
    if (typeof window === "undefined" || !window.gsap) {
      return;
    }

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;

    // Register ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);

    // Navbar scroll effect
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const navbar = document.querySelector(".welcome-navbar");
      const currentScrollY = window.scrollY;

      if (!navbar) return;

      if (currentScrollY > 100) {
        (navbar as HTMLElement).style.background = "rgba(255, 255, 255, 0.95)";
        (navbar as HTMLElement).style.boxShadow =
          "0 1px 3px 0 rgb(0 0 0 / 0.1)";
      } else {
        (navbar as HTMLElement).style.background = "rgba(255, 255, 255, 0.9)";
        (navbar as HTMLElement).style.boxShadow = "none";
      }

      // Hide/show navbar on scroll
      if (currentScrollY > lastScrollY && currentScrollY > 200) {
        (navbar as HTMLElement).style.transform = "translateY(-100%)";
      } else {
        (navbar as HTMLElement).style.transform = "translateY(0)";
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll);

    // Hero animations
    const tl = gsap.timeline({ delay: 0.3 });

    tl.to(".welcome-hero-content", {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power3.out",
    }).to(
      ".welcome-animation-container",
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power3.out",
      },
      "-=0.4"
    );

    // Dashboard animation sequence
    const startDashboardAnimation = () => {
      const dashboardTl = gsap.timeline({ repeat: -1, repeatDelay: 3 });

      // Reset states
      dashboardTl
        .set(".welcome-progress-fill", { width: "0%" })
        .set(".welcome-transaction-item", { opacity: 0, x: 20 })
        .set(".welcome-step-icon", { scale: 1, backgroundColor: "#e2e8f0" })

        // Income calculation
        .to(".welcome-step-1 .welcome-step-icon", {
          backgroundColor: "#2563eb",
          scale: 1.1,
          duration: 0.5,
        })
        .to(".welcome-step-1 .welcome-step-icon", {
          scale: 1,
          duration: 0.3,
        })

        // Calculation process
        .to(
          ".welcome-step-2 .welcome-step-icon",
          {
            backgroundColor: "#0891b2",
            scale: 1.1,
            duration: 0.5,
          },
          "+=0.2"
        )
        .to(".welcome-progress-fill", {
          width: "50%",
          duration: 1,
          ease: "power2.out",
        })
        .to(".welcome-step-2 .welcome-step-icon", {
          scale: 1,
          duration: 0.3,
        })

        // Donation completion
        .to(
          ".welcome-step-3 .welcome-step-icon",
          {
            backgroundColor: "#059669",
            scale: 1.1,
            duration: 0.5,
          },
          "+=0.2"
        )
        .to(".welcome-progress-fill", {
          width: "100%",
          duration: 1,
          ease: "power2.out",
        })
        .to(
          ".welcome-transaction-item",
          {
            opacity: 1,
            x: 0,
            duration: 0.5,
            stagger: 0.1,
            ease: "power2.out",
          },
          "-=0.4"
        )
        .to(".welcome-step-3 .welcome-step-icon", {
          scale: 1,
          duration: 0.3,
        });
    };

    // Features cards animation
    gsap.utils
      .toArray(".welcome-feature-card")
      .forEach((card: any, index: number) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            delay: index * 0.1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 85%",
              end: "bottom 20%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });

    // Start dashboard animation after load
    const timer = setTimeout(startDashboardAnimation, 1000);

    // Smooth scrolling
    const handleAnchorClick = (e: Event) => {
      const target = e.target as HTMLAnchorElement;
      if (target.getAttribute("href")?.startsWith("#")) {
        e.preventDefault();
        const targetElement = document.querySelector(
          target.getAttribute("href")!
        );
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
    };

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", handleAnchorClick);
    });

    // Interactive elements
    const feedbackBtn = document.querySelector(
      ".welcome-feedback-btn"
    ) as HTMLElement;
    if (feedbackBtn) {
      feedbackBtn.addEventListener("click", function (this: HTMLElement) {
        gsap.to(this, {
          scale: 0.9,
          duration: 0.1,
          yoyo: true,
          repeat: 1,
          ease: "power2.out",
        });
      });
    }

    // Language selector animation handled in component CSS

    // Button hover effects
    document.querySelectorAll(".welcome-btn").forEach((btn) => {
      btn.addEventListener("mouseenter", function (this: HTMLElement) {
        gsap.to(this, {
          y: -2,
          duration: 0.2,
          ease: "power2.out",
        });
      });

      btn.addEventListener("mouseleave", function (this: HTMLElement) {
        gsap.to(this, {
          y: 0,
          duration: 0.2,
          ease: "power2.out",
        });
      });
    });

    // Performance optimization
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) {
      gsap.set("*", { animation: "none", transition: "none" });
    }

    // Cleanup
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timer);
      document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.removeEventListener("click", handleAnchorClick);
      });
      ScrollTrigger.getAll().forEach((trigger: any) => trigger.kill());
    };
  }, []);
};
