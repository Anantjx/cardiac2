import { motion } from "framer-motion";
import {
  HelpCircle,
  HeartPulse,
  FileText,
  Calendar,
  Upload,
  MessageCircle,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    question: "How do I start a patient assessment?",
    answer:
      "Navigate to the Check-In section on the home page. Enter the patient's name and answer the health assessment questions. You can use voice input or manual buttons to respond. Once completed, click 'Complete Assessment' to get your risk evaluation.",
  },
  {
    question: "How does the automatic doctor assignment work?",
    answer:
      "After completing the assessment, our AI system automatically evaluates the risk level (High, Medium, or Low) and assigns the most appropriate doctor based on the patient's condition. High-risk cases are assigned to specialists immediately, while lower-risk cases are matched with available general practitioners.",
  },
  {
    question: "Can I upload lab reports?",
    answer:
      "Yes! In the Lab Reports section, you can drag and drop or browse to upload PDF or image files of lab reports. Our AI will analyze the report and provide detailed insights including cholesterol levels, ECG findings, and recommendations.",
  },
  {
    question: "How do I schedule an appointment?",
    answer:
      "After assessment, if a doctor is automatically assigned, you can confirm the appointment directly. Alternatively, you can browse available doctors in the Appointments section and manually select a doctor and time slot.",
  },
  {
    question: "What file formats are supported for lab reports?",
    answer:
      "We support PDF files and common image formats (JPG, PNG) for lab reports. The file size limit is 50MB. Make sure the report is clear and readable for best analysis results.",
  },
  {
    question: "How do I share appointments with others?",
    answer:
      "In the Appointments section, click the 'Share' button on any appointment to generate a QR code. You can copy the QR data or share it with friends who can scan it to view and manage the same appointment.",
  },
  {
    question: "Is my patient data secure?",
    answer:
      "Yes, we use Firebase Authentication and Firestore for secure data storage. All data is encrypted and linked to your authenticated account. We follow HIPAA-compliant practices for medical data handling.",
  },
  {
    question: "What should I do in an emergency?",
    answer:
      "If you're experiencing a medical emergency, call your local emergency services (911 in the US) immediately. CardiaX is designed for assessment and scheduling, not emergency response. Always seek immediate medical attention for life-threatening conditions.",
  },
];

const features = [
  {
    icon: HeartPulse,
    title: "AI-Powered Triage",
    description: "Get instant risk assessment using advanced AI algorithms",
  },
  {
    icon: FileText,
    title: "Lab Report Analysis",
    description: "Upload and analyze lab reports with detailed insights",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "Automatic doctor assignment based on risk level",
  },
  {
    icon: Upload,
    title: "Easy File Upload",
    description: "Drag and drop or browse to upload medical documents",
  },
  {
    icon: MessageCircle,
    title: "Voice Assessment",
    description: "Use voice commands for hands-free assessment",
  },
  {
    icon: CheckCircle2,
    title: "24/7 Availability",
    description: "Access the system anytime, anywhere",
  },
];

export default function Help() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-50">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="container py-12 md:py-20"
      >
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6"
          >
            <HelpCircle className="h-10 w-10 text-red-600" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
            Help & Support
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
            Find answers to common questions and learn how to use CardiaX effectively
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <feature.icon className="h-8 w-8 text-red-600 mb-2" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`}>
                <AccordionTrigger className="text-left font-semibold">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact Support Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 max-w-2xl mx-auto"
        >
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardHeader>
              <CardTitle className="text-2xl">Still Need Help?</CardTitle>
              <CardDescription className="text-base">
                Our support team is here to assist you 24/7
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-red-600 mt-1" />
                  <div>
                    <p className="font-semibold text-slate-900">Phone</p>
                    <p className="text-sm text-slate-600">+1 (555) 123-4567</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-red-600 mt-1" />
                  <div>
                    <p className="font-semibold text-slate-900">Email</p>
                    <p className="text-sm text-slate-600">support@cardiax.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-red-600 mt-1" />
                  <div>
                    <p className="font-semibold text-slate-900">Hours</p>
                    <p className="text-sm text-slate-600">24/7 Support</p>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 px-6 py-3 text-white font-semibold transition-colors"
                >
                  Contact Support
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.section>
    </div>
  );
}

