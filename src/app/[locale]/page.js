"use client";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/context/AuthContext";
import Navbar from "../components/Navbar";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

import {
  Briefcase,
  GraduationCap,
  Building2,
  ShieldCheck,
  ArrowRight,
  BarChart3,
  Star,
  CheckCircle,
} from "lucide-react";
import { Counter } from "../components/Counter";

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const t = useTranslations("Index");

  const features = [
    {
      icon: Briefcase,
      title: t("feature_internship_listings_title"),
      desc: t("feature_internship_listings_desc"),
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
    },
    {
      icon: GraduationCap,
      title: t("feature_student_portal_title"),
      desc: t("feature_student_portal_desc"),
      color: "text-sky-500",
      bg: "bg-sky-500/10",
    },
    {
      icon: Building2,
      title: t("feature_company_dashboard_title"),
      desc: t("feature_company_dashboard_desc"),
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      icon: ShieldCheck,
      title: t("feature_supervisor_tools_title"),
      desc: t("feature_supervisor_tools_desc"),
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      icon: BarChart3,
      title: t("feature_admin_analytics_title"),
      desc: t("feature_admin_analytics_desc"),
      color: "text-pink-500",
      bg: "bg-pink-500/10",
    },
    {
      icon: Star,
      title: t("feature_evaluation_system_title"),
      desc: t("feature_evaluation_system_desc"),
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  const stats = [
    { value: <Counter value={2500} />, label: t("stats_active_students") },
    { value: <Counter value={350} />, label: t("stats_partner_companies") },
    { value: <Counter value={1200} />, label: t("stats_internships_filled") },
    { value: <Counter value={98} />, label: t("stats_satisfaction_rate") },
  ];

  return (
    <div className="min-h-svh bg-slate-900 text-white selection:bg-indigo-500/30">
      <Navbar onMenuToggle={() => setMenuOpen(!menuOpen)} />
      {/* Hero Section */}
      <section className="relative min-h-svh pt-32 pb-20 px-6 overflow-hidden text-center">
        {/* Background Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-8 uppercase tracking-wider">
            <CheckCircle size={14} /> {t("badge")}
          </span>

          <motion.h1
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4 }}
            className="text-5xl md:text-7xl font-black leading-tight mb-6 tracking-tight"
          >
            {t("title_main")}{" "}
            <span className="bg-linear-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
              {t("title_highlight")}
            </span>
          </motion.h1>

          <motion.p
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.9 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            {t("description")}
          </motion.p>

          <motion.div
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1 }}
            className="flex flex-wrap justify-center gap-4"
          >
            {isAuthenticated ? (
              <Link
                href={`/dashboard/${user?.role}`}
                className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20"
              >
                {t("go_dashboard")}{" "}
                <ArrowRight
                  size={20}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20"
                >
                  {t("get_started_free")}{" "}
                  <ArrowRight
                    size={20}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </Link>
                <Link
                  href="/internships"
                  className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-xl font-bold transition-all border border-slate-700"
                >
                  {t("browse_internships")}
                </Link>
              </>
            )}
          </motion.div>
        </div>
      </section>
      {/* Stats Section */}
      <section className="py-12 px-6 border-y border-slate-500 bg-slate-900/30 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center group ">
              <p className="text-3xl md:text-4xl font-black bg-linear-to-br from-indigo-400 to-sky-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
                {s.value} {s.label === t("stats_satisfaction_rate") ? "%" : "+"}
              </p>
              <p className="text-slate-500 text-sm font-medium mt-2 uppercase tracking-wide">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>
      {/* Features Grid */}{" "}
      <motion.section
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.9, delay: 0.2 }}
        className="py-20 px-6"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4 text-white">
              {t("features_title")}
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto leading-relaxed text-lg">
              {t("features_desc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/50 hover:-translate-y-2 transition-all duration-300 group"
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                  >
                    <Icon size={24} className={f.color} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-100">
                    {f.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>
      {/* CTA Section */}
      <motion.section
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.5 }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="py-20 px-6"
      >
        <div className="max-w-4xl mx-auto bg-linear-to-br from-indigo-600/20 to-sky-600/10 border border-indigo-500/20 rounded-3xl p-12 text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full group-hover:bg-indigo-500/20 transition-all" />

          <h2 className="text-3xl font-black mb-4 relative z-10">
            {t("cta_title")}
          </h2>
          <p className="text-slate-400 mb-10 relative z-10 text-lg">
            {t("cta_desc")}
          </p>
          <Link
            href="/register"
            className="relative z-10 inline-flex items-center gap-2 bg-white text-slate-950 px-10 py-4 rounded-xl font-black hover:bg-indigo-50 transition-colors shadow-xl"
          >
            {t("create_account")} <ArrowRight size={20} />
          </Link>
        </div>
      </motion.section>
      {/* Footer */}
      <footer className="py-8 border-t border-slate-900 text-center text-slate-500 text-sm font-medium">
        {t("footer", { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
