import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "আব্দুল করিম",
    nameEn: "Abdul Karim",
    location: "চট্টগ্রাম",
    text: "রাহে কাবা'র সাথে আমার উমরাহ যাত্রা ছিল অসাধারণ। হোটেল, পরিবহন সবকিছু চমৎকার ছিল। ইনশাআল্লাহ আবার যাবো।",
    rating: 5,
    trip: "Umrah 2025",
  },
  {
    name: "ফাতেমা বেগম",
    nameEn: "Fatema Begum",
    location: "ঢাকা",
    text: "হজ্জের পুরো প্রক্রিয়ায় তারা আমাদের পাশে ছিলেন। ভিসা থেকে শুরু করে মক্কায় থাকা পর্যন্ত সবকিছু সুন্দরভাবে পরিচালিত হয়েছে।",
    rating: 5,
    trip: "Hajj 2024",
  },
  {
    name: "মোহাম্মদ হাসান",
    nameEn: "Mohammad Hasan",
    location: "সিলেট",
    text: "খুবই পেশাদার সেবা। কিস্তিতে পেমেন্টের সুবিধা থাকায় আমার পরিবারের জন্য উমরাহ করা সহজ হয়েছে। জাযাকাল্লাহু খাইরান।",
    rating: 5,
    trip: "Umrah 2025",
  },
];

const TestimonialsSection = forwardRef<HTMLElement>(function TestimonialsSection(_, ref) {
  return (
    <section ref={ref} className="py-20 bg-secondary/30 islamic-border-top">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-primary text-sm font-medium tracking-[0.3em] uppercase">
            Testimonials
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3 mb-3">
            What Our <span className="text-gradient-gold">Pilgrims</span> Say
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Hear from our satisfied customers who trusted us with their sacred journey
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-card border border-border rounded-xl p-6 relative shadow-soft"
            >
              <Quote className="h-8 w-8 text-primary/20 absolute top-4 right-4" />
              <div className="flex gap-1 mb-3">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed mb-4">
                "{t.text}"
              </p>
              <div className="border-t border-border/50 pt-3">
                <p className="font-heading font-bold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.location} • {t.trip}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});

export default TestimonialsSection;
