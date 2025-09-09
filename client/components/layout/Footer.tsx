export default function Footer() {
  return (
    <footer className="mt-16 border-t bg-white">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 py-8">
        <p className="text-sm text-slate-600">© 2025 Smart Cardiac Care System</p>
        <nav aria-label="Footer" className="flex items-center gap-6 text-sm">
          <a href="#terms" className="text-slate-600 hover:text-slate-900">Terms & Conditions</a>
          <a href="#privacy" className="text-slate-600 hover:text-slate-900">Privacy Policy</a>
          <a href="#contact" className="text-slate-600 hover:text-slate-900">Contact Us</a>
        </nav>
      </div>
    </footer>
  );
}
