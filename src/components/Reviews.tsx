import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const reviews = [
  {
    name: "David",
    text: "I am so happy I found CDL Jobs Center. I filled out the easy application and was immediately matched with a company that fit all of my requirements!",
    rating: 5,
  },
  {
    name: "Kimberly",
    text: "Thank you CDL Jobs Center! After 16 years in this business I finally work at a place that cares for me. I love my job!",
    rating: 5,
  },
  {
    name: "Jose",
    text: "If I could give this platform 10 stars I would. I have a 3 year old and 6 year old and wanted to spend more time at home. CDL Jobs Center matched me with a company that fit my needs perfectly.",
    rating: 5,
  },
];

const Reviews = () => {
  return (
    <section className="py-24 bg-secondary">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-medium text-sm uppercase tracking-widest">Testimonials</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 text-secondary-foreground">
            Driver <span className="text-gradient">Reviews</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {reviews.map((review, i) => (
            <motion.div
              key={review.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative bg-card/5 backdrop-blur-sm border border-border/10 rounded-2xl p-8 hover:border-primary/20 transition-all duration-300"
            >
              <Quote className="h-10 w-10 text-primary/20 mb-4" />
              <p className="text-muted-foreground leading-relaxed mb-6">{review.text}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-display font-bold text-primary">
                    {review.name.charAt(0)}
                  </div>
                  <span className="font-display font-semibold text-secondary-foreground">{review.name}</span>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-cdl-amber text-cdl-amber" />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Reviews;
