import { MessageCircle } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useLanguage } from "@/i18n/LanguageContext";

const WhatsAppFloat = () => {
  const { data: content } = useSiteContent("whatsapp");
  const { language } = useLanguage();
  const lc = content?.[language];

  const phone = content?.phone || "8801601505050";
  const defaultMsg = language === "bn"
    ? "আসসালামু আলাইকুম! RAHE KABA তে স্বাগতম। কিভাবে সাহায্য করতে পারি?"
    : "Assalamu Alaikum! Welcome to RAHE KABA. How can we help?";
  const message = encodeURIComponent(lc?.message || defaultMsg);
  const buttonText = lc?.button_text || "আপনাকে কিভাবে সহযোগিতা করতে পারি";

  return (
    <a
      href={`https://wa.me/${phone}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 flex items-center gap-2.5 bg-[#25D366] hover:bg-[#1ebe57] text-white pl-4 pr-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-6 w-6 fill-white stroke-white flex-shrink-0" />
      <span className="text-sm font-medium hidden sm:inline whitespace-nowrap">
        {buttonText}
      </span>
    </a>
  );
};

export default WhatsAppFloat;
