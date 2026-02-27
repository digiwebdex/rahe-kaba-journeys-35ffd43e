import { MessageCircle } from "lucide-react";

const WhatsAppFloat = () => {
  const phone = "8801601505050";
  const message = encodeURIComponent("আসসালামু আলাইকুম! RAHE KABA তে স্বাগতম। কিভাবে সাহায্য করতে পারি?");

  return (
    <a
      href={`https://wa.me/${phone}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white px-5 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group animate-bounce-slow"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-6 w-6 fill-white stroke-white" />
      <span className="text-sm font-semibold hidden sm:inline">Chat Now</span>
    </a>
  );
};

export default WhatsAppFloat;
