import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/contexts/UserContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CarSure DZ - Achetez et vendez des véhicules certifiés en Algérie",
  description: "Plateforme de confiance pour acheter et vendre des véhicules d'occasion certifiés en Algérie. Véhicules vérifiés par des ateliers agréés.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${poppins.variable} antialiased`}
      >
        <UserProvider>
        {children}
        </UserProvider>
      </body>
    </html>
  );
}
