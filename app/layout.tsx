import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Apuração 2026 · Segundo turno", description: "Resultados oficiais do segundo turno de 2026 por estado, atualizados automaticamente com dados do TSE.", icons: { icon: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }
