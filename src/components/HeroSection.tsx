import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Star, MapPin, Shield, Plane } from "lucide-react";
import { useRef } from "react";
import heroImage from "@/assets/hero-kaaba.jpg";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useLanguage } from "@/i18n/LanguageContext";

const HeroSection = () => {
  const { data: content } = useSiteContent("hero");
  const { t, language } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [0.5, 0.85]);

  const lc = content?.[language];
  const badge = lc?.badge || t("hero.badge");
  const ctaPrimary = lc?.cta_primary || t("hero.ctaPrimary");
  const ctaSecondary = lc?.cta_secondary || t("hero.ctaSecondary");
  const stats = lc?.stats || [
    { value: "15+", label: t("hero.stat.years") },
    { value: "10K+", label: t("hero.stat.pilgrims") },
    { value: "50+", label: t("hero.stat.packages") },
    { value: "4.9★", label: t("hero.stat.rating") },
  ];

  const defaultIcons = [Shield, Star, Plane, MapPin];

  return (
    <section ref={sectionRef} id="home" className="relative min-h-[100dvh] flex flex-col justify-center overflow-hidden">
      {/* Parallax Background */}
      <motion.div className="absolute inset-0 will-change-transform" style={{ y: imgY }}>
        <img src={heroImage} alt="The Holy Kaaba at night, illuminated by golden lights" className="w-full h-[130%] object-cover object-center brightness-[0.7] saturate-[1.1]" loading="eager" fetchPriority="high" decoding="async" />
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e]/50 via-transparent to-[#1a1a2e]/70" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e]/85 via-[#1a1a2e]/40 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(26,26,46,0.3)_100%)]" />

      {/* Top gold accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-gold" />

      {/* Decorative Islamic geometric pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C6A55C' fill-opacity='1'%3E%3Cpath d='M30 0l30 30-30 30L0 30z M30 4.24L4.24 30 30 55.76 55.76 30z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="relative z-10 container mx-auto px-4 py-16 sm:py-20 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-5 py-2 mb-10"
        >
          <span className="w-2 h-2 rounded-full bg-gold-light animate-pulse" />
          <span className="text-gold-light text-xs font-semibold tracking-[0.2em] uppercase">{badge}</span>
        </motion.div>

        {/* Quranic Verse Block */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="max-w-3xl mx-auto mb-12"
        >
          {/* Decorative divider top */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-primary/50" />
            <Star className="h-4 w-4 text-primary fill-primary/30" />
            <div className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-primary/50" />
          </div>

          {/* Arabic text */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-relaxed mb-6"
            dir="rtl"
            style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}
          >
            وَأَتِمُّوا الْحَجَّ وَالْعُمْرَةَ لِلَّهِ
          </motion.p>

          {/* Bengali translation with gold gradient */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-xl sm:text-2xl md:text-3xl font-semibold italic text-gradient-gold leading-relaxed"
          >
            "আর তোমরা আল্লাহর সন্তুষ্টির জন্য হজ্জ ও ওমরাহ পূর্ণ কর"
          </motion.p>

          {/* Surah reference */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="text-sm sm:text-base text-white/70 mt-3 tracking-wide"
          >
            — (সূরা আল-বাকারা: ১৯৬)
          </motion.p>

          {/* Decorative divider bottom */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <div className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-primary/50" />
            <Star className="h-4 w-4 text-primary fill-primary/30" />
            <div className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-primary/50" />
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="flex flex-wrap gap-4 justify-center mb-16 sm:mb-20"
        >
          <a
            href="#packages"
            className="group bg-gradient-gold text-white font-semibold px-8 py-4 rounded-xl text-sm hover:shadow-gold hover:scale-[1.02] transition-all duration-300 inline-flex items-center gap-2"
          >
            {ctaPrimary}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#contact"
            className="border border-white/30 text-white font-semibold px-8 py-4 rounded-xl text-sm hover:bg-white/10 hover:border-white/50 backdrop-blur-sm transition-all duration-300 inline-flex items-center"
          >
            {ctaSecondary}
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1 }}
        >
          <div className="bg-white/10 backdrop-blur-2xl border border-white/15 rounded-2xl p-5 sm:p-6 grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-8 max-w-4xl mx-auto">
            {stats.map((stat: any, i: number) => {
              const IconComp = defaultIcons[i % defaultIcons.length];
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.1 + i * 0.1 }}
                  className={`flex items-center gap-3 ${i < stats.length - 1 ? "md:border-r md:border-primary/10" : ""} md:pr-4`}
                >
                  <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
                    <IconComp className="h-4.5 w-4.5 text-gold-light" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-heading font-bold text-white leading-none">{stat.value}</p>
                    <p className="text-[11px] text-white/60 mt-1">{stat.label}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
