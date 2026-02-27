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
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [0.55, 0.9]);

  const lc = content?.[language]; // language-specific CMS content
  const badge = lc?.badge || t("hero.badge");
  const headingLine1 = lc?.heading_line1 || t("hero.headingLine1");
  const headingLine2 = lc?.heading_line2 || t("hero.headingLine2");
  const headingHighlight = lc?.heading_highlight || t("hero.headingHighlight");
  const subheading = lc?.subheading || t("hero.subheading");
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
    <section ref={sectionRef} id="home" className="relative min-h-[100dvh] flex flex-col justify-end overflow-hidden">
      <motion.div className="absolute inset-0 will-change-transform" style={{ y: imgY }}>
        <img src={heroImage} alt="The Holy Kaaba at night, illuminated by golden lights" className="w-full h-[130%] object-cover object-center" />
      </motion.div>
      <motion.div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" style={{ opacity: overlayOpacity }} />
      <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-background/50" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-gold" />

      <div className="relative z-10 container mx-auto px-4 pb-8 sm:pb-14 pt-32">
        <div className="max-w-3xl">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="inline-flex items-center gap-2 bg-primary/15 backdrop-blur-md border border-primary/25 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-primary text-xs font-semibold tracking-widest uppercase">{badge}</span>
          </motion.div>


          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }} className="max-w-2xl mb-10">
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground leading-snug" dir="rtl" style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}>
              وَأَتِمُّوا الْحَجَّ وَالْعُمْرَةَ لِلَّهِ
            </p>
            <p className="text-lg sm:text-xl md:text-2xl text-foreground/80 mt-3 leading-relaxed font-medium">
              "আর তোমরা আল্লাহর সন্তুষ্টির জন্য হজ্জ ও ওমরাহ পূর্ণ কর।"
            </p>
            <p className="text-sm sm:text-base text-muted-foreground mt-1.5">
              — (সূরা আল-বাকারা: ১৯৬)
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.45 }} className="flex flex-wrap gap-3">
            <a href="#packages" className="group bg-gradient-gold text-primary-foreground font-semibold px-7 py-3.5 rounded-lg text-sm hover:shadow-gold transition-all duration-300 inline-flex items-center gap-2">
              {ctaPrimary}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a href="#contact" className="border border-foreground/20 text-foreground font-semibold px-7 py-3.5 rounded-lg text-sm hover:bg-foreground/5 backdrop-blur-sm transition-all duration-300 inline-flex items-center">
              {ctaSecondary}
            </a>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.65 }} className="mt-14 sm:mt-20">
          <div className="bg-card/60 backdrop-blur-xl border border-border/60 rounded-2xl p-4 sm:p-5 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-4xl">
            {stats.map((stat: any, i: number) => {
              const IconComp = defaultIcons[i % defaultIcons.length];
              return (
                <div key={stat.label} className={`flex items-center gap-3 ${i < stats.length - 1 ? "md:border-r md:border-border/40" : ""} md:pr-4`}>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <IconComp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-heading font-bold text-foreground leading-none">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
