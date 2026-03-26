import { motion } from "framer-motion";
import { Shield, Headphones, Hotel, Car, BookOpen, Users, Plane, CreditCard, Heart } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useSiteContent } from "@/hooks/useSiteContent";

const iconMap: Record<string, any> = { Shield, Headphones, Hotel, Car, BookOpen, Users, Plane, CreditCard, Heart };

const defaultFacilitiesBn = [
  { icon: "Shield", title: "ভিসা প্রসেসিং", desc: "সৌদি আরবের ভিসা প্রসেসিং সম্পূর্ণ সহায়তা" },
  { icon: "Plane", title: "ফ্লাইট বুকিং", desc: "সেরা এয়ারলাইন্সে ফ্লাইট বুকিং" },
  { icon: "Hotel", title: "হোটেল ব্যবস্থা", desc: "হারাম শরীফের কাছে মানসম্মত হোটেল" },
  { icon: "Car", title: "পরিবহন সেবা", desc: "এয়ারপোর্ট ট্রান্সফার ও স্থানীয় পরিবহন" },
  { icon: "BookOpen", title: "প্রশিক্ষণ", desc: "হজ্জ ও ওমরাহ প্রশিক্ষণ কার্যক্রম" },
  { icon: "Users", title: "গাইড সেবা", desc: "অভিজ্ঞ বাংলাভাষী গাইড" },
  { icon: "Headphones", title: "২৪/৭ সাপোর্ট", desc: "যেকোনো সময় সহায়তা পাবেন" },
  { icon: "CreditCard", title: "স্বচ্ছ মূল্য", desc: "কোন লুকানো চার্জ নেই" },
  { icon: "Heart", title: "কাস্টমাইজড প্যাকেজ", desc: "আপনার চাহিদা অনুযায়ী প্যাকেজ" },
];

const defaultFacilitiesEn = [
  { icon: "Shield", title: "Visa Processing", desc: "Complete Saudi Arabia visa processing support" },
  { icon: "Plane", title: "Flight Booking", desc: "Flight booking on best airlines" },
  { icon: "Hotel", title: "Hotel Arrangement", desc: "Quality hotels near Haram Sharif" },
  { icon: "Car", title: "Transport Service", desc: "Airport transfer & local transportation" },
  { icon: "BookOpen", title: "Training", desc: "Hajj & Umrah training programs" },
  { icon: "Users", title: "Guide Service", desc: "Experienced Bengali-speaking guides" },
  { icon: "Headphones", title: "24/7 Support", desc: "Assistance available anytime" },
  { icon: "CreditCard", title: "Transparent Pricing", desc: "No hidden charges" },
  { icon: "Heart", title: "Customized Packages", desc: "Packages tailored to your needs" },
];

const FacilitiesSection = () => {
  const { t, language } = useLanguage();
  const { data: content } = useSiteContent("facilities");
  const bn = language === "bn";
  const lc = content?.[language];

  const sectionLabel = lc?.section_label || t("facilities.label");
  const heading = lc?.heading || t("facilities.heading");
  const headingHighlight = lc?.heading_highlight || t("facilities.headingHighlight");
  const description = lc?.description || t("facilities.description");
  const items = lc?.items || (bn ? defaultFacilitiesBn : defaultFacilitiesEn);

  return (
    <section id="facilities" className="py-24 bg-background islamic-border-top">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary text-sm font-medium tracking-[0.3em] uppercase">
            {sectionLabel}
          </span>
          <h2 className="font-heading text-3xl md:text-5xl font-bold mt-3 mb-4">
            {heading} <span className="text-gradient-gold">{headingHighlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{description}</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {items.map((item: any, i: number) => {
            const IconComp = iconMap[item.icon] || Shield;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-soft transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <IconComp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FacilitiesSection;
