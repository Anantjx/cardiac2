import { useState } from "react";
import { HeartPulse, Menu, X } from "lucide-react";
import { motion } from "framer-motion";
import { playSound } from "@/lib/sound-effects";

const nav = [
  { href: "#home", label: "Home" },
  { href: "#check-in", label: "Check-In" },
  { href: "#reports", label: "Reports" },
  { href: "#appointments", label: "Appointments" },
  { href: "#help", label: "Help" },
  { href: "#contact", label: "Contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/50"
    >
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <motion.a
          href="#home"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => playSound("click")}
          className="inline-flex items-center gap-2 font-bold text-xl tracking-tight"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <HeartPulse className="h-6 w-6 text-red-500" aria-hidden />
          </motion.div>
          <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent font-bold text-lg">
            CardiaX
          </span>
        </motion.a>

        <nav aria-label="Main" className="hidden md:flex items-center gap-1">
          {nav.map((item, idx) => (
            <motion.a
              key={item.href}
              href={item.href}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              onClick={() => playSound("click")}
              whileHover={{ backgroundColor: "rgb(241, 245, 249)" }}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg px-3 py-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              {item.label}
            </motion.a>
          ))}
        </nav>

        <div className="md:hidden">
          <motion.button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => {
              setOpen((v) => !v);
              playClickSound();
            }}
            whileHover={{ backgroundColor: "rgb(241, 245, 249)" }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-700 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            {open ? (
              <X className="h-6 w-6" aria-hidden />
            ) : (
              <Menu className="h-6 w-6" aria-hidden />
            )}
            <span className="sr-only">Toggle navigation</span>
          </motion.button>
        </div>
      </div>

      {/* Mobile menu */}
      <motion.div
        id="mobile-nav"
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="md:hidden overflow-hidden border-t border-slate-200/50 bg-white/95 backdrop-blur-xl"
        onClick={() => setOpen(false)}
      >
        <nav className="container py-4" aria-label="Mobile">
          <ul className="flex flex-col gap-1">
            {nav.map((item, idx) => (
              <motion.li 
                key={item.href}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
              >
                <a
                  href={item.href}
                  onClick={() => playSound("click")}
                  className="block py-3 px-3 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors duration-200"
                >
                  {item.label}
                </a>
              </motion.li>
            ))}
          </ul>
        </nav>
      </motion.div>
    </motion.header>
  );
}
