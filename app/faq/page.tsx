'use client';

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

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
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [visibleOptions, setVisibleOptions] = useState<boolean[]>([]);
  const optionsRef = useRef<HTMLDivElement>(null);

  const options: Option[] = [
    {
      title: "Créer un compte",
      description: "Commencez par créer un compte gratuit sur notre plateforme. C'est simple, rapide et sécurisé.",
      icon: (
        <svg className="w-12 h-12 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      title: "Contacter les vendeurs",
      description: "Une fois connecté, vous pouvez parcourir les véhicules disponibles et contacter directement les vendeurs certifiés via notre système de messagerie.",
      icon: (
        <svg className="w-12 h-12 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    {
      title: "Vendre votre véhicule",
      description: "Vous avez également accès pour vendre votre propre véhicule. Avant de mettre votre voiture en vente, vous devez prendre rendez-vous avec un atelier de vérification (mécanique et/ou peinture).",
      icon: (
        <svg className="w-12 h-12 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "Vérification par atelier",
      description: "L'atelier examinera votre véhicule en détail et générera un rapport PDF complet avec toutes les informations (état mécanique, peinture, défauts, etc.).",
      icon: (
        <svg className="w-12 h-12 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    },
    {
      title: "Transparence totale",
      description: "Lorsque vous achetez un véhicule, vous voyez la vérité sur la voiture grâce au rapport PDF détaillé. Contrairement aux autres sites web où vous ne découvrez souvent les problèmes qu'après l'achat, chez CarSure DZ, vous savez exactement ce que vous achetez avant de prendre votre décision.",
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
      question: "Comment utiliser cette plateforme ?",
      answer: "C'est très simple ! Commencez par créer un compte gratuit. Une fois connecté, vous pourrez contacter les vendeurs certifiés, consulter les véhicules vérifiés, et même vendre votre propre véhicule. Pour vendre, vous devrez d'abord prendre rendez-vous avec un atelier de vérification (mécanique et/ou peinture) qui examinera votre véhicule et générera un rapport PDF détaillé."
    },
    {
      question: "Quels sont les avantages de cette plateforme ?",
      answer: "Notre plateforme offre plusieurs avantages uniques : 1) Transparence totale : chaque véhicule est vérifié par des ateliers certifiés avant la vente, 2) Rapports détaillés : vous recevez un PDF complet avec toutes les informations sur l'état du véhicule, 3) Vendeurs certifiés : tous les vendeurs sont vérifiés et certifiés, 4) Sécurité : vous savez exactement ce que vous achetez, contrairement aux autres sites où les informations peuvent être trompeuses."
    },
    {
      question: "Pourquoi choisir CarSure DZ plutôt qu'un autre site ?",
      answer: "Contrairement aux autres sites de vente de véhicules, CarSure DZ garantit la transparence et la vérité sur chaque véhicule. Avant qu'une voiture soit mise en vente, elle doit être vérifiée par un atelier certifié qui génère un rapport PDF complet. Cela signifie que vous voyez la vérité sur la voiture - ses défauts, son état réel, et tout ce que vous devez savoir - avant d'acheter. Sur d'autres sites, vous ne découvrez souvent les problèmes qu'après l'achat."
    },
    {
      question: "Comment puis-je vendre mon véhicule ?",
      answer: "Pour vendre votre véhicule, suivez ces étapes : 1) Créez un compte et connectez-vous, 2) Accédez à votre tableau de bord vendeur, 3) Ajoutez votre véhicule avec toutes les informations, 4) Prenez rendez-vous avec un atelier de vérification (mécanique et/ou peinture selon vos besoins), 5) L'atelier examinera votre véhicule et créera un rapport PDF détaillé, 6) Une fois le rapport disponible, votre véhicule sera automatiquement mis en ligne et visible par les acheteurs."
    },
    {
      question: "Comment fonctionne le processus de vérification ?",
      answer: "Le processus de vérification est simple et transparent : 1) Vous prenez rendez-vous avec un atelier certifié (mécanique, peinture, ou les deux), 2) Vous amenez votre véhicule à l'atelier au jour et à l'heure convenus, 3) L'atelier effectue une inspection complète de votre véhicule, 4) L'atelier génère un rapport PDF détaillé avec toutes les informations (état mécanique, peinture, défauts, etc.), 5) Ce rapport est automatiquement associé à votre annonce, permettant aux acheteurs de voir l'état réel du véhicule."
    },
    {
      question: "Puis-je contacter les vendeurs directement ?",
      answer: "Oui ! Une fois que vous avez créé un compte, vous pouvez contacter directement les vendeurs certifiés via notre système de messagerie intégré. Vous pouvez poser des questions, demander des informations supplémentaires, et négocier en toute sécurité sur la plateforme."
    },
    {
      question: "Les vendeurs sont-ils vérifiés ?",
      answer: "Absolument ! Tous les vendeurs sur notre plateforme sont certifiés et vérifiés. Nous vérifions leur identité, leur statut, et nous nous assurons qu'ils respectent nos standards de qualité. Seuls les vendeurs avec le statut 'certifié' et 'actif' peuvent vendre sur la plateforme."
    },
    {
      question: "Combien coûte l'utilisation de la plateforme ?",
      answer: "La création d'un compte et la consultation des véhicules sont gratuites. Pour vendre un véhicule, vous devrez payer les frais de vérification à l'atelier que vous choisissez. Ces frais varient selon le type de vérification (mécanique, peinture, ou les deux) et l'atelier sélectionné. Les prix sont transparents et affichés sur chaque atelier."
    },
    {
      question: "Que contient le rapport PDF de vérification ?",
      answer: "Le rapport PDF généré par l'atelier contient toutes les informations importantes sur le véhicule : l'état mécanique complet, l'état de la peinture, les défauts détectés, les réparations effectuées, l'historique, et toutes les autres informations pertinentes. Ce rapport est votre garantie de transparence et permet aux acheteurs de prendre une décision éclairée."
    },
    {
      question: "Puis-je faire confiance aux rapports de vérification ?",
      answer: "Oui, vous pouvez avoir une confiance totale ! Tous les ateliers sur notre plateforme sont certifiés et vérifiés. Ils doivent respecter des standards stricts de qualité et de transparence. Les rapports sont générés de manière professionnelle et contiennent toutes les informations nécessaires pour que vous puissiez prendre une décision en toute connaissance de cause."
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
            Questions Fréquentes (FAQ)
          </h1>
          <p className="text-gray-600 text-center max-w-2xl mx-auto">
            Trouvez les réponses à toutes vos questions sur CarSure DZ, la plateforme de confiance pour l'achat et la vente de véhicules vérifiés en Algérie.
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
              Comment utiliser CarSure DZ ?
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
              Prêt à commencer ?
            </h2>
            <p className="text-teal-50 mb-8 max-w-2xl mx-auto text-lg">
              Rejoignez CarSure DZ dès aujourd'hui et découvrez une nouvelle façon transparente et sécurisée d'acheter et vendre des véhicules en Algérie.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="px-8 py-4 bg-white text-teal-600 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-110 transform"
              >
                Créer un compte
              </Link>
              <Link
                href="/"
                className="px-8 py-4 bg-teal-600/20 backdrop-blur-sm text-white border-2 border-white rounded-xl font-semibold transition-all duration-300 hover:bg-teal-600/30 hover:scale-110 transform"
              >
                Voir les véhicules
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
