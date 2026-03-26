import { useState, useEffect } from "react";
import { Menu, X, Phone, User, Globe } from "lucide-react";
import { supabase } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.jpg";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useLanguage } from "@/i18n/LanguageContext";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { data: content } = useSiteContent("navbar");
  const { language, setLanguage, t } = useLanguage();

  const phone = content?.phone || "+880 1601-505050";

  const navLinks = [
    { label: t("nav.home"), href: "/" },
    { label: t("nav.packages"), href: "/packages" },
    { label: t("nav.hotels"), href: "/hotels" },
    { label: t("nav.about"), href: "/about" },
    { label: t("nav.contact"), href: "/contact" },
    { label: t("nav.track"), href: "/track" },
  ];

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null));
    return () => subscription.unsubscribe();
  }, []);

  const toggleLang = () => setLanguage(language === "en" ? "bn" : "en");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-border shadow-soft">
      <div className="container mx-auto flex items-center justify-between h-20 px-4">
        <a href="/" className="flex items-center gap-3">
          <img src={logo} alt="RAHE KABA Logo" className="h-14 w-14 rounded-md object-cover" />
          <div className="hidden sm:block">
            <span className="font-heading text-xl font-bold text-primary">RAHE KABA</span>
            <span className="block text-xs tracking-[0.25em] text-muted-foreground uppercase">Tours & Travels</span>
          </div>
        </a>

        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors tracking-wide uppercase"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          {/* Language Toggle */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 text-sm font-medium border border-border px-3 py-2 rounded-md hover:bg-secondary transition-colors"
            title={language === "bn" ? "View in English" : "বাংলায় দেখুন"}
          >
            <Globe className="h-4 w-4" />
            {language === "bn" ? "English" : "বাংলা"}
          </button>

          <a href={`tel:${phone.replace(/[\s-]/g, "")}`} className="flex items-center gap-2 text-sm text-primary">
            <Phone className="h-4 w-4" />
            {phone}
          </a>
          {user ? (
            <a href="/dashboard" className="flex items-center gap-2 text-sm text-primary border border-primary/40 px-4 py-2.5 rounded-md hover:bg-primary/10 transition-colors">
              <User className="h-4 w-4" />
              {t("nav.dashboard")}
            </a>
          ) : (
            <a href="/auth" className="flex items-center gap-2 text-sm text-primary border border-primary/40 px-4 py-2.5 rounded-md hover:bg-primary/10 transition-colors">
              <User className="h-4 w-4" />
              {t("nav.signIn")}
            </a>
          )}
          <a
            href="/packages"
            className="bg-gradient-gold text-primary-foreground font-semibold px-6 py-2.5 rounded-md text-sm hover:opacity-90 transition-opacity"
          >
            {t("nav.bookNow")}
          </a>
        </div>

        {/* Mobile: lang toggle + hamburger */}
        <div className="lg:hidden flex items-center gap-2">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 text-xs font-medium border border-border px-2 py-1.5 rounded-md"
          >
            <Globe className="h-3.5 w-3.5" />
            {language === "en" ? "বাং" : "EN"}
          </button>
          <button onClick={() => setOpen(!open)} className="text-foreground p-2">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden bg-white border-b border-border overflow-hidden shadow-soft"
          >
            <div className="flex flex-col p-4 gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-foreground/80 hover:text-primary py-2 uppercase tracking-wide"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="/packages"
                onClick={() => setOpen(false)}
                className="bg-gradient-gold text-primary-foreground font-semibold px-6 py-3 rounded-md text-sm text-center"
              >
                {t("nav.bookNow")}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
