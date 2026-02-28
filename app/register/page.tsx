'use client';

import Link from "next/link";
import { useState, useEffect } from "react";

export default function RegisterPage() {
  const [registerAs, setRegisterAs] = useState<null | "client" | "workshop">(null);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const [codeError, setCodeError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [workshopData, setWorkshopData] = useState({
    name: "",
    email: "",
    adr: "",
    phone: "",
    type: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setUserData({
      ...userData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (formError) setFormError("");
    if (formErrors.length > 0) setFormErrors([]);
  };

  const handleWorkshopChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setWorkshopData({
      ...workshopData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (formError) setFormError("");
    if (formErrors.length > 0) setFormErrors([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(""); // Clear previous errors
    setFormErrors([]); // Clear previous validation errors

    if (registerAs === "client") {
      if (userData.password !== userData.confirmPassword) {
        setFormError("Les mots de passe ne correspondent pas");
        setIsSubmitting(false);
        return;
      }
      try {
        const res = await fetch("/api/auth/register/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email.trim(),
            phone: userData.phone.trim(),
            password: userData.password,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          // Show detailed validation errors if available
          if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
            setFormErrors(data.errors);
            setFormError(data?.message || "Erreur de validation");
          } else {
          setFormError(data?.message || "Erreur lors de l'inscription");
            setFormErrors([]);
          }
          setIsSubmitting(false);
          return;
        }
        // Save email for verification
        const emailToVerify = userData.email;
        // Clear all form fields
        setUserData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
        });
        setShowPassword(false);
        setShowConfirmPassword(false);
        // Show verification screen
        setVerificationEmail(emailToVerify);
        setTimeLeft(15 * 60); // Reset timer to 15 minutes
        setVerificationCode(""); // Clear any previous code
        setCodeError(""); // Clear any previous errors
        setShowVerification(true);
      } catch (error) {
        alert("Erreur de connexion");
      } finally {
        setIsSubmitting(false);
      }
    }

    if (registerAs === "workshop") {
      if (workshopData.password !== workshopData.confirmPassword) {
        setFormError("Les mots de passe ne correspondent pas");
        setIsSubmitting(false);
        return;
      }
      try {
        const res = await fetch("/api/auth/register/workshop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: workshopData.name,
            email: workshopData.email.trim(),
            adr: workshopData.adr,
            phone: workshopData.phone.trim(),
            type: workshopData.type,
            password: workshopData.password,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          // Show detailed validation errors if available
          if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
            setFormErrors(data.errors);
            setFormError(data?.message || "Erreur de validation");
          } else {
          setFormError(data?.message || "Erreur lors de l'inscription");
            setFormErrors([]);
          }
          setIsSubmitting(false);
          return;
        }
        // Save email for verification
        const emailToVerify = workshopData.email;
        // Clear all form fields
        setWorkshopData({
          name: "",
          email: "",
          adr: "",
          phone: "",
          type: "",
          password: "",
          confirmPassword: "",
        });
        setShowPassword(false);
        setShowConfirmPassword(false);
        // Show verification screen
        setVerificationEmail(emailToVerify);
        setTimeLeft(15 * 60); // Reset timer to 15 minutes
        setVerificationCode(""); // Clear any previous code
        setCodeError(""); // Clear any previous errors
        setShowVerification(true);
      } catch (error) {
        alert("Erreur de connexion");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Normalize code: remove all non-digits
    const normalizedCode = verificationCode.replace(/\D/g, '');
    
    // Validate code format
    if (normalizedCode.length !== 6) {
      setCodeError("Le code doit contenir exactement 6 chiffres");
      return;
    }

    if (timeLeft <= 0) {
      setCodeError("Le code a expiré. Veuillez vous réinscrire.");
      return;
    }

    setIsVerifying(true);
    setCodeError("");
    
    try {
      // Map frontend type to backend type
      const backendType = registerAs === "client" ? "user" : registerAs;
      
      console.log('Sending verification request:', {
        email: verificationEmail.trim(),
        code: normalizedCode,
        type: backendType
      });
      
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: verificationEmail.trim(),
          code: normalizedCode,
          type: backendType,
        }),
      });
      
      const data = await res.json();
      
      console.log('Verification response:', data);
      
      if (!res.ok) {
        setCodeError(data?.message || "Code invalide ou expiré");
        setIsVerifying(false);
        return;
      }
      
      // Check if verification was successful
      if (data.ok === true) {
        console.log('✅ Verification successful, showing success modal');
        // Clear verification code
        setVerificationCode("");
        // Hide verification screen
        setShowVerification(false);
        // Show success modal
        setShowSuccessModal(true);
        // Stop verifying state
        setIsVerifying(false);
      } else {
        setCodeError(data?.message || "Erreur lors de la vérification");
        setIsVerifying(false);
      }
    } catch (error) {
      console.error('Verification error:', error);
      setCodeError("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Timer countdown effect
  useEffect(() => {
    if (!showVerification || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showVerification, timeLeft]);

  if (showVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-blue-900 font-[var(--font-poppins)] mb-2">
              Vérifiez votre email
            </h2>
            <p className="text-sm text-gray-600 mb-1">
              Nous avons envoyé un code de vérification à
            </p>
            <p className="text-sm font-semibold text-teal-600 mb-2">{verificationEmail}</p>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 ${
              timeLeft > 0 
                ? 'bg-blue-50 text-blue-700' 
                : 'bg-red-50 text-red-700'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {timeLeft > 0 ? (
                <span>Code valide pendant {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
              ) : (
                <span>Code expiré</span>
              )}
            </div>
          </div>

          <form onSubmit={handleVerifyEmail} className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl border-2 border-gray-200/50">
            <div className="mb-6">
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Code de vérification (6 chiffres)
              </label>
              <input
                id="code"
                type="text"
                required
                maxLength={6}
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setVerificationCode(value);
                  setCodeError(""); // Clear error when user types
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-center text-2xl font-bold tracking-widest ${
                  codeError ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="000000"
                disabled={timeLeft <= 0}
              />
              {codeError && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {codeError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isVerifying || verificationCode.length !== 6 || timeLeft <= 0}
              className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl font-bold transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Vérification...</span>
                </>
              ) : timeLeft <= 0 ? (
                "Code expiré"
              ) : (
                "Vérifier"
              )}
            </button>

            {timeLeft <= 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 text-center mb-3">
                  Le code a expiré. Veuillez vous réinscrire pour recevoir un nouveau code.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowVerification(false);
                    setVerificationCode("");
                    setTimeLeft(15 * 60);
                    setCodeError("");
                    setRegisterAs(null);
                  }}
                  className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors text-sm"
                >
                  Retour à l'inscription
                </button>
              </div>
            )}
            
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setShowVerification(false);
                  setVerificationCode("");
                  setCodeError("");
                }}
                className="text-sm text-gray-600 hover:text-teal-600 transition-colors"
              >
                ← Retour au formulaire
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl mb-4 shadow-xl">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-900 via-teal-700 to-cyan-600 bg-clip-text text-transparent font-[var(--font-poppins)] mb-2">
            Créer un compte
          </h2>
          <p className="text-base text-gray-600">
            Rejoignez CarSure DZ et commencez à acheter/vendre des véhicules certifiés
          </p>
        </div>

        {/* Choose type */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setRegisterAs("client")}
            className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 hover:scale-105 ${
              registerAs === "client"
                ? "border-teal-500 bg-white shadow-xl scale-105"
                : "border-gray-200 bg-white/80 hover:bg-white hover:shadow-lg"
            }`}
          >
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all ${
              registerAs === "client"
                ? "bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg"
                : "bg-gradient-to-br from-gray-200 to-gray-300"
            }`}>
              <svg className={`w-7 h-7 ${registerAs === "client" ? "text-white" : "text-gray-500"}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="font-bold text-gray-900 text-lg">Client</p>
            <p className="text-xs text-gray-600 mt-1">Acheteur / vendeur</p>
          </button>

          <button
            type="button"
            onClick={() => setRegisterAs("workshop")}
            className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 hover:scale-105 ${
              registerAs === "workshop"
                ? "border-teal-500 bg-white shadow-xl scale-105"
                : "border-gray-200 bg-white/80 hover:bg-white hover:shadow-lg"
            }`}
          >
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all ${
              registerAs === "workshop"
                ? "bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg"
                : "bg-gradient-to-br from-gray-200 to-gray-300"
            }`}>
              <svg className={`w-7 h-7 ${registerAs === "workshop" ? "text-white" : "text-gray-500"}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="font-bold text-gray-900 text-lg">Atelier</p>
            <p className="text-xs text-gray-600 mt-1">Partenaire / inspection</p>
          </button>
        </div>

        {/* Register Form */}
        <form className="mt-2 space-y-6 bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-2xl border-2 border-gray-200/50" onSubmit={handleSubmit}>
          {formError && (
            <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-700 mb-2">{formError}</p>
                  {formErrors.length > 0 && (
                    <ul className="list-disc list-inside space-y-1">
                      {formErrors.map((error, index) => (
                        <li key={index} className="text-sm text-red-600">{error}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormError("");
                    setFormErrors([]);
                  }}
                  className="text-red-600 hover:text-red-800 flex-shrink-0 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {!registerAs && (
            <div className="text-center py-6">
              <p className="text-sm text-gray-600">
                Choisissez d&apos;abord le type de compte (Client ou Atelier).
              </p>
            </div>
          )}

          {registerAs === "client" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  Prénom
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={userData.firstName}
                  onChange={handleUserChange}
                  className="appearance-none relative block w-full px-4 py-3.5 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm hover:shadow-md"
                  placeholder="Prénom"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nom
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={userData.lastName}
                  onChange={handleUserChange}
                  className="appearance-none relative block w-full px-4 py-3.5 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm hover:shadow-md"
                  placeholder="Nom"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={userData.email}
                onChange={handleUserChange}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                placeholder="votre@email.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={userData.phone}
                onChange={handleUserChange}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                placeholder="+213 XXX XX XX XX"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={userData.password}
                  onChange={handleUserChange}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.736m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={userData.confirmPassword}
                  onChange={handleUserChange}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.736m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
          )}

          {registerAs === "workshop" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de l&apos;atelier
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={workshopData.name}
                  onChange={handleWorkshopChange}
                  className="appearance-none relative block w-full px-4 py-3.5 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm hover:shadow-md"
                  placeholder="Nom de l'atelier"
                />
              </div>

              <div>
                <label htmlFor="w_type" className="block text-sm font-medium text-gray-700 mb-2">
                  Type d&apos;atelier *
                </label>
                <select
                  id="w_type"
                  name="type"
                  required
                  value={workshopData.type}
                  onChange={handleWorkshopChange}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors bg-white"
                >
                  <option value="">Sélectionner un type</option>
                  <option value="mechanic">Mécanique</option>
                  <option value="paint_vehicle">Peinture véhicule</option>
                  <option value="mechanic_paint_inspector">Mécanique & Peinture Inspecteur</option>
                </select>
              </div>

              <div>
                <label htmlFor="w_email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  id="w_email"
                  name="email"
                  type="email"
                  required
                  value={workshopData.email}
                  onChange={handleWorkshopChange}
                  className="appearance-none relative block w-full px-4 py-3.5 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm hover:shadow-md"
                  placeholder="atelier@email.com"
                />
              </div>

              <div>
                <label htmlFor="adr" className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse
                </label>
                <input
                  id="adr"
                  name="adr"
                  type="text"
                  required
                  value={workshopData.adr}
                  onChange={handleWorkshopChange}
                  className="appearance-none relative block w-full px-4 py-3.5 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm hover:shadow-md"
                  placeholder="Adresse"
                />
              </div>

              <div>
                <label htmlFor="w_phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone
                </label>
                <input
                  id="w_phone"
                  name="phone"
                  type="tel"
                  required
                  value={workshopData.phone}
                  onChange={handleWorkshopChange}
                  className="appearance-none relative block w-full px-4 py-3.5 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm hover:shadow-md"
                  placeholder="+213 XXX XX XX XX"
                />
              </div>

              <div>
                <label htmlFor="w_password" className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="w_password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={workshopData.password}
                    onChange={handleWorkshopChange}
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.736m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="w_confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <input
                    id="w_confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={workshopData.confirmPassword}
                    onChange={handleWorkshopChange}
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.736m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              required
              className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
              J&apos;accepte les{" "}
              <Link href="/terms" className="text-teal-600 hover:text-teal-500">
                conditions d&apos;utilisation
              </Link>{" "}
              et la{" "}
              <Link href="/privacy" className="text-teal-600 hover:text-teal-500">
                politique de confidentialité
              </Link>
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={!registerAs || isSubmitting}
              className="group relative w-full flex justify-center items-center gap-2 py-4 px-6 border border-transparent text-base font-bold rounded-xl text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Création en cours...</span>
                </>
              ) : (
                "Créer un compte"
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Vous avez déjà un compte?{" "}
              <Link href="/login" className="font-medium text-teal-600 hover:text-teal-500">
                Se connecter
              </Link>
            </p>
          </div>
        </form>

        {/* Back to Home */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-teal-600 transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>

      {/* Success Modal - Email Verified */}
      {showSuccessModal && (
        <div 
          className="fixed inset-0 bg-gray-500/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={(e) => {
            // Close modal if clicking outside
            if (e.target === e.currentTarget) {
              setShowSuccessModal(false);
              window.location.href = "/login";
            }
          }}
        >
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl max-w-md w-full p-8 transform transition-all border-2 border-gray-200/50">
            <div className="text-center">
              {/* Success Icon */}
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-900 mb-4 font-[var(--font-poppins)]">
                Compte créé avec succès !
              </h2>

              {/* Message */}
              <div className="text-gray-600 mb-6 space-y-3">
                <p className="text-base leading-relaxed">
                  Votre compte a été créé et votre email est vérifié.
                </p>
                <p className="text-base leading-relaxed">
                  Vous devez attendre que l&apos;admin active votre compte.
                </p>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-700 mb-2 font-medium">
                    Besoin d&apos;aide ?
                  </p>
                  <a 
                    href="tel:0562232628" 
                    className="text-teal-600 hover:text-teal-700 font-semibold text-lg flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    0562232628
                  </a>
                </div>
              </div>

              {/* Button */}
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  window.location.href = "/login";
                }}
                className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl font-bold transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105"
              >
                Aller à la page de connexion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
