'use client';

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useT } from "@/utils/i18n";

interface FAQItem {
  question: string;
  answer: string;
}

interface Option {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export default function FAQPage() {
  const t = useT();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [visibleOptions, setVisibleOptions] = useState<boolean[]>([]);
  const optionsRef = useRef<HTMLDivElement>(null);

  const options: Option[] = [
    {
      title: t("FAQ_OPT_CREATE_ACCOUNT_TITLE"),
      description: t("FAQ_OPT_CREATE_ACCOUNT_DESC"),
      icon: (
        <svg className="w-12 h-12 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      title: t("FAQ_OPT_CONTACT_SELLERS_TITLE"),
      description: t("FAQ_OPT_CONTACT_SELLERS_DESC"),
      icon: (
        <svg className="w-12 h-12 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    {
      title: t("FAQ_OPT_SELL_VEHICLE_TITLE"),
      description: t("FAQ_OPT_SELL_VEHICLE_DESC"),
      icon: (
        <svg className="w-12 h-12 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: t("FAQ_OPT_WORKSHOP_VERIF_TITLE"),
      description: t("FAQ_OPT_WORKSHOP_VERIF_DESC"),
      icon: (
        <svg className="w-12 h-12 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    },
    {
      title: t("FAQ_OPT_TOTAL_TRANSPARENCY_TITLE"),
      description: t("FAQ_OPT_TOTAL_TRANSPARENCY_DESC"),
      icon: (
        <svg className="w-12 h-12 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    }
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setVisibleOptions((prev) => {
                const newState = [...prev];
                newState[index] = true;
                return newState;
              });
            }, index * 150);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (optionsRef.current) {
      const optionElements = optionsRef.current.querySelectorAll('.option-card');
      optionElements.forEach((el) => observer.observe(el));
    }

    return () => observer.disconnect();
  }, []);

  const faqs: FAQItem[] = [
    {
      question: t("FAQ_Q1"),
      answer: t("FAQ_A1"),
    },
    {
      question: t("FAQ_Q2"),
      answer: t("FAQ_A2"),
    },
    {
      question: t("FAQ_Q3"),
      answer: t("FAQ_A3"),
    },
    {
      question: t("FAQ_Q4"),
      answer: t("FAQ_A4"),
    },
    {
      question: t("FAQ_Q5"),
      answer: t("FAQ_A5"),
    },
    {
      question: t("FAQ_Q6"),
      answer: t("FAQ_A6"),
    },
    {
      question: t("FAQ_Q7"),
      answer: t("FAQ_A7"),
    },
    {
      question: t("FAQ_Q8"),
      answer: t("FAQ_A8"),
    },
    {
      question: t("FAQ_Q9"),
      answer: t("FAQ_A9"),
    },
    {
      question: t("FAQ_Q10"),
      answer: t("FAQ_A10"),
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      {/* Header */}
      <header className="bg-white/98 backdrop-blur-lg border-b border-gray-200/60 shadow-md">
        <div className="container mx-auto px-4 lg:px-8 py-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent font-[var(--font-poppins)] text-center mb-4">
            {t("FAQ_TITLE")}
          </h1>
          <p className="text-gray-600 text-center max-w-2xl mx-auto">
            {t("FAQ_SUBTITLE")}
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 lg:px-8 py-12">
        {/* Options Section */}
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 mb-12 border border-gray-200 overflow-hidden relative">
          {/* Decorative Background */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative z-10 max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 text-center font-[var(--font-poppins)] animate-fade-in">
              {t("FAQ_HOW_TO_USE_TITLE")}
            </h2>
            <div ref={optionsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {options.map((option, index) => (
                <div
                  key={index}
                  className={`option-card bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border-2 border-gray-200 hover:border-teal-400 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 ${
                    visibleOptions[index] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="mb-4 flex items-center justify-center animate-bounce" style={{ animationDelay: `${index * 200}ms`, animationDuration: '2s' }}>
                    {option.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 font-[var(--font-poppins)]">
                    {option.title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {option.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-4xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:border-teal-400 transform hover:scale-[1.02] animate-fade-in`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 group"
              >
                <span className="text-lg font-semibold text-gray-900 pr-8 group-hover:text-teal-600 transition-colors">
                  {faq.question}
                </span>
                <svg
                  className={`w-6 h-6 text-teal-600 flex-shrink-0 transition-all duration-500 ${
                    openIndex === index ? 'rotate-180 scale-110' : 'scale-100'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                  openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-6 pb-5 text-gray-700 leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-12 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-500 rounded-3xl shadow-2xl p-8 md:p-12 text-center text-white overflow-hidden relative animate-fade-in">
          {/* Animated Background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
          
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-[var(--font-poppins)]">
              {t("FAQ_CTA_TITLE")}
            </h2>
            <p className="text-teal-50 mb-8 max-w-2xl mx-auto text-lg">
              {t("FAQ_CTA_DESC")}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="px-8 py-4 bg-white text-teal-600 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-110 transform"
              >
                {t("FAQ_CTA_CREATE_ACCOUNT")}
              </Link>
              <Link
                href="/"
                className="px-8 py-4 bg-teal-600/20 backdrop-blur-sm text-white border-2 border-white rounded-xl font-semibold transition-all duration-300 hover:bg-teal-600/30 hover:scale-110 transform"
              >
                {t("FAQ_CTA_VIEW_CARS")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
