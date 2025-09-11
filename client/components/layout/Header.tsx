import { useState } from "react";
import { HeartPulse, Menu, X } from "lucide-react";

const nav = [
  { href: "#home", label: "Home" },
  { href: "#check-in", label: "Patient Check-In" },
  { href: "#reports", label: "Lab Reports" },
  { href: "#appointments", label: "Appointments" },
  { href: "#help", label: "Help" },
  { href: "#contact", label: "Contact" },
  { href: "#privacy", label: "Privacy" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between">
        <a
          href="#home"
          className="inline-flex items-center gap-2 font-extrabold text-xl tracking-tight text-primary"
        >
          <HeartPulse className="h-6 w-6 text-primary" aria-hidden />
          <span className="text-slate-900">Smart Cardiac Care</span>
        </a>

        <nav aria-label="Main" className="hidden md:flex items-center gap-8">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-700 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md px-1 py-1"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="md:hidden">
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded-md p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {open ? (
              <X className="h-6 w-6" aria-hidden />
            ) : (
              <Menu className="h-6 w-6" aria-hidden />
            )}
            <span className="sr-only">Toggle navigation</span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-nav"
        className={`md:hidden border-t bg-white ${open ? "block" : "hidden"}`}
        onClick={() => setOpen(false)}
      >
        <nav className="container py-2" aria-label="Mobile">
          <ul className="flex flex-col divide-y">
            {nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="block py-3 text-base font-medium text-slate-800 hover:bg-slate-50 rounded-md"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
