'use client';

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/utils/i18n";

type Step = "email" | "code" | "password" | "done";

export default function ForgotPasswordPage() {
  const t = useT();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] = useState<"user" | "workshop">("user");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  /** French key from API / validators; translated at render so language switches apply */
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorKey(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorKey(data?.message || "Une erreur est survenue");
        return;
      }
      if (data.accountType === "workshop" || data.accountType === "user") {
        setAccountType(data.accountType);
      }
      setCode("");
      setStep("code");
    } catch {
      setErrorKey("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = code.replace(/\D/g, "");
    if (normalized.length !== 6) {
      setErrorKey("Le code doit contenir exactement 6 chiffres");
      return;
    }
    setErrorKey(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: normalized,
          type: accountType,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.resetToken) {
        setErrorKey(data?.message || "Code invalide ou expiré");
        return;
      }
      setResetToken(data.resetToken);
      setNewPassword("");
      setConfirmPassword("");
      setStep("password");
    } catch {
      setErrorKey("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorKey("Les mots de passe ne correspondent pas");
      return;
    }
    if (!resetToken) {
      setErrorKey("Session expirée. Recommencez.");
      return;
    }
    setErrorKey(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorKey(
          data?.message || "Impossible de réinitialiser le mot de passe"
        );
        return;
      }
      setStep("done");
    } catch {
      setErrorKey("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "done") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-blue-900 font-[var(--font-poppins)] mb-2">
              {t("Mot de passe mis à jour")}
            </h2>
            <p className="text-gray-600 mb-6">
              {t("Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.")}
            </p>
            <Link
              href="/login"
              className="block w-full py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-teal-500 hover:bg-teal-600 transition-colors shadow-lg"
            >
              {t("Retour à la connexion")}
            </Link>
          </div>
          <div className="text-center">
            <Link href="/" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">
              ← {t("Retour à l'accueil")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-blue-900 font-[var(--font-poppins)] mb-2">
            {t("Mot de passe oublié")}
          </h2>
          <p className="text-sm text-gray-600">
            {step === "email" &&
              t("Entrez votre email : nous enverrons un code de réinitialisation (valide 15 minutes).")}
            {step === "code" &&
              t("Saisissez le code à 6 chiffres reçu par email.")}
            {step === "password" &&
              t("Choisissez un nouveau mot de passe sécurisé.")}
          </p>
        </div>

        <div className="mt-8 space-y-6 bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
          {errorKey && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {t(errorKey)}
            </div>
          )}

          {step === "email" && (
            <form onSubmit={handleRequestCode} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  {t("Adresse email")}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                  placeholder="votre@email.com"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-teal-500 hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors shadow-lg disabled:opacity-50"
              >
                {isLoading ? t("Envoi...") : t("Envoyer le code")}
              </button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <p className="text-xs text-gray-500">
                {t("Email")}: <span className="font-medium text-gray-700">{email}</span>
              </p>
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  {t("Code (6 chiffres)")}
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setErrorKey(null);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-bold tracking-widest focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="000000"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || code.replace(/\D/g, "").length !== 6}
                className="w-full py-3 px-4 text-sm font-semibold rounded-lg text-white bg-teal-500 hover:bg-teal-600 shadow-lg disabled:opacity-50"
              >
                {isLoading ? t("Vérification...") : t("Continuer")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setErrorKey(null);
                }}
                className="w-full py-2 text-sm text-teal-600 hover:text-teal-800"
              >
                ← {t("Modifier l'email")}
              </button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <p className="text-xs text-gray-500">{t("FORGOT_PASSWORD_HINT")}</p>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  {t("Nouveau mot de passe")}
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setErrorKey(null);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 text-sm"
                  >
                    {showPassword ? t("Masquer") : t("Afficher")}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  {t("Confirmer le mot de passe")}
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrorKey(null);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 text-sm font-semibold rounded-lg text-white bg-teal-500 hover:bg-teal-600 shadow-lg disabled:opacity-50"
              >
                {isLoading ? t("Enregistrement...") : t("Réinitialiser le mot de passe")}
              </button>
            </form>
          )}
        </div>

        <div className="text-center">
          <Link href="/login" className="text-sm font-medium text-teal-600 hover:text-teal-500">
            ← {t("Retour à la connexion")}
          </Link>
        </div>
        <div className="text-center">
          <Link href="/" className="text-sm text-gray-600 hover:text-teal-600 transition-colors">
            ← {t("Retour à l'accueil")}
          </Link>
        </div>
      </div>
    </div>
  );
}
