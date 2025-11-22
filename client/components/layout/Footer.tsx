import { motion } from "framer-motion";
import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="mt-20 border-t border-slate-200 bg-gradient-to-b from-white to-slate-50"
    >
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Heart className="h-5 w-5 text-red-500" />
              <span className="font-bold text-lg bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                CardiaX
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Advanced cardiac intelligence for emergency care.
            </p>
          </motion.div>

          <motion.nav
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
            aria-label="Footer Quick Links"
            className="space-y-2"
          >
            <p className="font-semibold text-slate-900 text-sm">Quick Links</p>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#home" className="text-slate-600 hover:text-red-600 transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="#check-in" className="text-slate-600 hover:text-red-600 transition-colors">
                  Assessment
                </a>
              </li>
              <li>
                <a href="#reports" className="text-slate-600 hover:text-red-600 transition-colors">
                  Lab Reports
                </a>
              </li>
              <li>
                <a href="#appointments" className="text-slate-600 hover:text-red-600 transition-colors">
                  Appointments
                </a>
              </li>
            </ul>
          </motion.nav>

          <motion.nav
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            viewport={{ once: true }}
            aria-label="Footer Legal"
            className="space-y-2"
          >
            <p className="font-semibold text-slate-900 text-sm">Legal</p>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#privacy" className="text-slate-600 hover:text-red-600 transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" className="text-slate-600 hover:text-red-600 transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#contact" className="text-slate-600 hover:text-red-600 transition-colors">
                  Contact Support
                </a>
              </li>
            </ul>
          </motion.nav>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          viewport={{ once: true }}
          className="border-t border-slate-200 pt-8"
        >
          <p className="text-sm text-slate-600 text-center">
            © 2025 CardiaX. All rights reserved. Providing intelligent cardiac care solutions.
          </p>
        </motion.div>
      </div>
    </motion.footer>
  );
}
