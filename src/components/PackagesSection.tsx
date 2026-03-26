import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/api";
import { useLanguage } from "@/i18n/LanguageContext";
import heroImage from "@/assets/hero-kaaba.jpg";
import medinaImage from "@/assets/medina-mosque.jpg";

const fallbackImages = [heroImage, medinaImage];

const PackagesSection = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("packages")
        .select("*")
        .eq("is_active", true)
        .eq("show_on_website", true)
        .order("price", { ascending: true })
        .limit(6);
      setPackages(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading || packages.length === 0) return null;

  return (
    <section id="packages" className="py-24 bg-secondary/50 islamic-border-top">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <span className="text-primary text-sm font-medium tracking-[0.3em] uppercase">{t("packages.label")}</span>
          <h2 className="font-heading text-3xl md:text-5xl font-bold mt-3 mb-4">
            {t("packages.heading")} <span className="text-gradient-gold">{t("packages.headingHighlight")}</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{t("packages.description")}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {packages.map((pkg, i) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative rounded-xl overflow-hidden border border-border bg-card flex flex-col hover:border-primary/40 hover:shadow-luxury transition-all group"
            >
              <div className="h-48 overflow-hidden">
                <img
                  src={pkg.image_url || fallbackImages[i % fallbackImages.length]}
                  alt={pkg.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-background/80" />
              </div>
              <div className="absolute top-4 left-4 z-10">
                <span className="bg-primary/90 text-primary-foreground text-xs font-bold px-3 py-1 rounded-full capitalize">
                  {pkg.type}
                </span>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="font-heading text-xl font-bold">{pkg.name}</h3>
                {pkg.duration_days && (
                  <p className="text-sm text-muted-foreground mb-2">{pkg.duration_days} {t("common.days") || "days"}</p>
                )}
                {pkg.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{pkg.description}</p>
                )}
                <p className="text-2xl font-heading font-bold text-primary mb-4 mt-auto">
                  ৳{Number(pkg.price).toLocaleString()}
                  <span className="text-sm font-body text-muted-foreground font-normal"> {t("packages.perPerson") || "/person"}</span>
                </p>
                {pkg.features && Array.isArray(pkg.features) && pkg.features.length > 0 && (
                  <ul className="space-y-1.5 mb-5">
                    {(pkg.features as string[]).slice(0, 5).map((f: string) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-foreground/80">
                        <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  onClick={() => navigate(`/booking?package=${pkg.id}`)}
                  className="w-full py-3 rounded-md text-sm font-semibold text-center inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {t("packages.bookNow")} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {packages.length >= 6 && (
          <div className="text-center mt-10">
            <button
              onClick={() => navigate("/packages")}
              className="text-primary hover:underline text-sm font-medium inline-flex items-center gap-1"
            >
              {t("packages.viewAll") || "View All Packages"} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default PackagesSection;
