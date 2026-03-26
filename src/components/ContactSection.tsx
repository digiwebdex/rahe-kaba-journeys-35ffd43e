import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useLanguage } from "@/i18n/LanguageContext";

const ContactSection = forwardRef<HTMLElement>(function ContactSection(_, ref) {
  const { data: content } = useSiteContent("contact");
  const { t, language } = useLanguage();

  const lc = content?.[language];
  const phone = content?.phone || "+880 1601-505050";
  const email = lc?.email || content?.email || "rahekaba.info@gmail.com";
  const location = lc?.location || (language === "bn" ? "দৈলরবাগ পল্লী বিদ্যুৎ সংলগ্ন\nসোনারগাঁও থানা রোড, নারায়ণগঞ্জ-ঢাকা" : content?.location || "Dailorbagh Palli Bidyut Adjacent\nSonargaon Thana Road, Narayanganj-Dhaka");
  const hours = lc?.hours || (language === "bn" ? "শনি - বৃহঃ: সকাল ৯টা - রাত ৯টা" : content?.hours || "Sat - Thu: 9AM - 9PM");

  const contactItems = [
    { icon: Phone, label: t("contact.phone"), value: phone, href: `tel:${phone.replace(/[\s-]/g, "")}` },
    { icon: Mail, label: t("contact.email"), value: email, href: `mailto:${email}` },
    { icon: MapPin, label: t("contact.location"), value: location, href: "#" },
    { icon: Clock, label: t("contact.hours"), value: hours, href: "#" },
  ];

  return (
    <section ref={ref} id="contact" className="py-24 bg-secondary/50">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <span className="text-primary text-sm font-medium tracking-[0.3em] uppercase">{lc?.section_label || t("contact.label")}</span>
          <h2 className="font-heading text-3xl md:text-5xl font-bold mt-3 mb-4">
            {lc?.heading || t("contact.heading")} <span className="text-gradient-gold">{lc?.heading_highlight || t("contact.headingHighlight")}</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-6">
            {contactItems.map((item) => (
              <a key={item.label} href={item.href} className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-primary/40 transition-colors group">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="font-medium">{item.value}</p>
                </div>
              </a>
            ))}
          </motion.div>

          <motion.form initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder={t("contact.yourName")} className="bg-secondary border border-border rounded-md px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
              <input type="tel" placeholder={t("contact.phoneNumber")} className="bg-secondary border border-border rounded-md px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <input type="email" placeholder={t("contact.emailAddress")} className="w-full bg-secondary border border-border rounded-md px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <select className="w-full bg-secondary border border-border rounded-md px-4 py-3 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40">
              <option>{t("contact.selectService")}</option>
              <option>{t("contact.hajjPackage")}</option>
              <option>{t("contact.umrahPackage")}</option>
              <option>{t("contact.visaProcessing")}</option>
              <option>{t("contact.airTicketService")}</option>
              <option>{t("contact.hotelBooking")}</option>
              <option>{t("contact.other")}</option>
            </select>
            <textarea rows={4} placeholder={t("contact.yourMessage")} className="w-full bg-secondary border border-border rounded-md px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
            <button type="submit" className="w-full bg-gradient-gold text-primary-foreground font-semibold py-3 rounded-md text-sm hover:opacity-90 transition-opacity shadow-gold">
              {t("contact.sendMessage")}
            </button>
          </motion.form>
        </div>
      </div>
    </section>
  );
});

export default ContactSection;
