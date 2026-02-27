import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useLanguage } from "@/i18n/LanguageContext";

const Contact = () => {
  const { data: content } = useSiteContent("contact");
  const { t, language } = useLanguage();
  const bn = language === "bn";
  const [form, setForm] = useState({ name: "", phone: "", email: "", service: "", message: "" });
  const [loading, setLoading] = useState(false);

  const phone = content?.phone || "+880 1601-505050";
  const email = content?.email || "raheka@gmail.com";
  const location = content?.location || (bn ? "দৈলরবাগ পল্লী বিদ্যুৎ সংলগ্ন, সোনারগাঁও থানা রোড, নারায়ণগঞ্জ-ঢাকা" : "Doilorbag Palli Bidyut, Sonargaon Thana Road, Narayanganj-Dhaka");
  const hours = content?.hours || (bn ? "শনি - বৃহঃ: সকাল ৯টা - রাত ৯টা" : "Sat - Thu: 9AM - 9PM");

  const contactItems = [
    { icon: Phone, label: t("contact.phone"), value: phone, href: `tel:${phone.replace(/[\s-]/g, "")}` },
    { icon: Mail, label: t("contact.email"), value: email, href: `mailto:${email}` },
    { icon: MapPin, label: t("contact.location"), value: location, href: "#" },
    { icon: Clock, label: t("contact.hours"), value: hours, href: "#" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error(bn ? "প্রয়োজনীয় তথ্য পূরণ করুন" : "Please fill in required fields");
      return;
    }
    setLoading(true);
    const msg = `Hello RAHE KABA!%0A%0AName: ${encodeURIComponent(form.name)}%0APhone: ${encodeURIComponent(form.phone)}%0AEmail: ${encodeURIComponent(form.email)}%0AService: ${encodeURIComponent(form.service)}%0AMessage: ${encodeURIComponent(form.message)}`;
    const waUrl = `https://wa.me/8801601505050?text=${msg}`;
    window.open(waUrl, "_blank");
    toast.success(bn ? "হোয়াটসঅ্যাপে রিডাইরেক্ট হচ্ছে..." : "Redirecting to WhatsApp...");
    setLoading(false);
  };

  const inputClass = "w-full bg-secondary border border-border rounded-md px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <span className="text-primary text-sm font-medium tracking-[0.3em] uppercase">
              {t("contact.label")}
            </span>
            <h1 className="font-heading text-3xl md:text-5xl font-bold mt-3 mb-4">
              {t("contact.heading")} <span className="text-gradient-gold">{t("contact.headingHighlight")}</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {bn ? "কোনো প্রশ্ন আছে? আমরা আপনার কথা শুনতে চাই। যেকোনো সময় যোগাযোগ করুন।" : "Have questions? We'd love to hear from you. Reach out to us anytime."}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Contact Info */}
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              {contactItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-start gap-4 p-5 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="font-medium">{item.value}</p>
                  </div>
                </a>
              ))}

              {/* WhatsApp CTA */}
              <a
                href="https://wa.me/8801601505050"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold py-3.5 rounded-xl text-sm hover:bg-emerald-700 transition-colors w-full mt-4"
              >
                <Phone className="h-4 w-4" /> {bn ? "হোয়াটসঅ্যাপে চ্যাট করুন" : "Chat on WhatsApp"}
              </a>
            </motion.div>

            {/* Contact Form */}
            <motion.form
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleSubmit}
              className="bg-card border border-border rounded-xl p-6 space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder={`${t("contact.yourName")} *`}
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                />
                <input
                  type="tel"
                  placeholder={`${t("contact.phoneNumber")} *`}
                  required
                  maxLength={15}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputClass}
                />
              </div>
              <input
                type="email"
                placeholder={t("contact.emailAddress")}
                maxLength={255}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
              />
              <select
                value={form.service}
                onChange={(e) => setForm({ ...form, service: e.target.value })}
                className={inputClass}
              >
                <option value="">{t("contact.selectService")}</option>
                <option>{t("contact.hajjPackage")}</option>
                <option>{t("contact.umrahPackage")}</option>
                <option>{t("contact.visaProcessing")}</option>
                <option>{t("contact.airTicketService")}</option>
                <option>{t("contact.hotelBooking")}</option>
                <option>{t("contact.other")}</option>
              </select>
              <textarea
                rows={4}
                placeholder={t("contact.yourMessage")}
                maxLength={1000}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className={`${inputClass} resize-none`}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-gold text-primary-foreground font-semibold py-3 rounded-md text-sm hover:opacity-90 transition-opacity shadow-gold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> {t("contact.sendMessage")}
              </button>
            </motion.form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Contact;
