import { motion } from "framer-motion";
import { Play, ExternalLink } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const videos = [
  {
    titleBn: "ওমরাহ কীভাবে করবেন - সম্পূর্ণ গাইড",
    titleEn: "How to Perform Umrah - Complete Guide",
    embedId: "s-6cA0NeZbE",
  },
  {
    titleBn: "হজ্জ ধাপে ধাপে - পূর্ণ টিউটোরিয়াল",
    titleEn: "Hajj Step by Step - Full Tutorial",
    embedId: "vy6PYbBKiC0",
  },
  {
    titleBn: "তাওয়াফের সময় দোয়া - আমাদের সাথে শিখুন",
    titleEn: "Duas During Tawaf - Learn With Us",
    embedId: "ak3Y4pS5ILo",
  },
  {
    titleBn: "ইহরামের নিয়ম ও নির্দেশিকা",
    titleEn: "Ihram Rules & Guidelines",
    embedId: "jLGdKFyV3TU",
  },
  {
    titleBn: "মদীনা জিয়ারত - সম্পূর্ণ ট্যুর",
    titleEn: "Madinah Ziyarat - Complete Tour",
    embedId: "LG21hddMPSE",
  },
  {
    titleBn: "মক্কা হোটেল - কী আশা করবেন",
    titleEn: "Makkah Hotels - What to Expect",
    embedId: "T4auGhmeBlw",
  },
];

export default function VideoGuideSection() {
  const { language } = useLanguage();
  const bn = language === "bn";

  return (
    <section id="videos" className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-primary text-sm font-medium tracking-[0.3em] uppercase">
            {bn ? "শিখুন" : "Learn"}
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3 mb-4">
            {bn ? "ভিডিও টিউটোরিয়াল ও " : "Video Tutorials & "}
            <span className="text-gradient-gold">{bn ? "গাইড" : "Guides"}</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {bn
              ? "আমাদের শিক্ষামূলক ভিডিও কন্টেন্ট দিয়ে আপনার যাত্রার জন্য প্রস্তুত হোন।"
              : "Prepare for your journey with our educational video content."}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {videos.map((video, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-gold transition-all cursor-pointer"
              onClick={() => window.open(`https://www.youtube.com/watch?v=${video.embedId}`, '_blank')}
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={`https://img.youtube.com/vi/${video.embedId}/hqdefault.jpg`}
                  alt={bn ? video.titleBn : video.titleEn}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-gold group-hover:scale-110 transition-transform">
                    <Play className="h-6 w-6 text-primary-foreground ml-1" />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-heading text-sm font-semibold leading-snug">
                  {bn ? video.titleBn : video.titleEn}
                </h3>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
