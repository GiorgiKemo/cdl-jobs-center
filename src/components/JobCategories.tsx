import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Package, Truck, Droplets, Snowflake, Fuel, Users, UserCheck, GraduationCap } from "lucide-react";

const categories = [
  { name: "Dry Van", icon: Package, path: "/jobs?type=dry-van" },
  { name: "Flatbed", icon: Truck, path: "/jobs?type=flatbed" },
  { name: "Dry Bulk", icon: Droplets, path: "/jobs?type=dry-bulk" },
  { name: "Refrigerated", icon: Snowflake, path: "/jobs?type=refrigerated" },
  { name: "Tanker", icon: Fuel, path: "/jobs?type=tanker" },
  { name: "Teams", icon: Users, path: "/jobs?type=teams" },
  { name: "Owner Operator", icon: UserCheck, path: "/jobs?type=owner-operator" },
  { name: "Students", icon: GraduationCap, path: "/jobs?type=students" },
];

const JobCategories = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <span className="text-primary font-medium text-sm uppercase tracking-widest">Categories</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-3">
            Browse by <span className="text-gradient">Freight Type</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={cat.path}
                className="glass rounded-2xl p-6 flex flex-col items-center gap-4 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group h-full"
              >
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <cat.icon className="h-8 w-8" />
                </div>
                <span className="font-display font-semibold text-center">{cat.name}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default JobCategories;
