import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, HeartPulse, CheckCircle2, Clock, Shield, Zap } from "lucide-react";
import { playSound } from "@/lib/sound-effects";

// Floating elements component
const FloatingElements = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(8)].map((_, i) => (
      <motion.div
        key={`float-${i}`}
        className="absolute rounded-full bg-red-200/20"
        style={{
          left: `${(i % 4) * 25}%`,
          top: `${Math.floor(i / 4) * 50}%`,
          width: `${20 + Math.random() * 40}px`,
          height: `${20 + Math.random() * 40}px`,
        }}
        animate={{
          y: [0, -30, 0],
          x: [0, 15, -15, 0],
          opacity: [0.2, 0.5, 0.2],
          scale: [0.8, 1.2, 0.8],
        }}
        transition={{
          duration: 5 + Math.random() * 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: i * 0.3,
        }}
      />
    ))}
  </div>
);

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (isSignup) {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
    }

    try {
      setLoading(true);
      if (isSignup) {
        const displayName = email.split("@")[0];
        await signup(email, password, displayName);
      } else {
        await login(email, password);
      }
      playSound("success");
      navigate("/");
    } catch (err: any) {
      playSound("error");
      let errorMessage = `Failed to ${isSignup ? "sign up" : "log in"}`;
      
      // Firebase error codes to user-friendly messages
      if (err.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Please login instead.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address. Please check and try again.";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else if (err.code === "auth/user-not-found") {
        errorMessage = "No account found with this email. Please sign up first.";
      } else if (err.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later.";
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    try {
      setLoading(true);
      await loginWithGoogle();
      playSound("success");
      navigate("/");
    } catch (err: any) {
      playSound("error");
      let errorMessage = "Failed to log in with Google";
      
      if (err.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-in popup was closed. Please try again.";
      } else if (err.code === "auth/popup-blocked") {
        errorMessage = "Popup was blocked. Please allow popups and try again.";
      } else if (err.code === "auth/cancelled-popup-request") {
        errorMessage = "Sign-in was cancelled. Please try again.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const features = [
    { icon: Zap, text: "AI-Powered Triage" },
    { icon: Clock, text: "24/7 Availability" },
    { icon: Shield, text: "Secure & Private" },
    { icon: CheckCircle2, text: "Instant Results" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-slate-50 relative overflow-hidden">
      <FloatingElements />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-7xl mx-auto">
          {/* Left Side - About App */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden lg:block"
          >
            <div className="space-y-8">
              <div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-3 mb-6"
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <HeartPulse className="h-10 w-10 text-red-600" />
                  </motion.div>
                  <span className="text-3xl font-black bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                    CardiaX
                  </span>
                </motion.div>
                <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-red-600 via-red-500 to-red-700 bg-clip-text text-transparent">
                  Smart Cardiac Intelligence
                </h1>
                <p className="text-xl text-slate-600 leading-relaxed">
                  Advanced AI-powered triage, lab analysis, and appointment scheduling for emergency cardiac care. Get instant assessment and expert recommendations in minutes.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {features.map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + idx * 0.1 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-white/80 backdrop-blur border border-red-100 shadow-sm"
                  >
                    <div className="rounded-full bg-red-100 p-2">
                      <feature.icon className="h-5 w-5 text-red-600" />
                    </div>
                    <span className="font-semibold text-slate-900">{feature.text}</span>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="p-6 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 border border-red-200"
              >
                <h3 className="font-bold text-lg text-red-900 mb-2">
                  Automatic Doctor Assignment
                </h3>
                <p className="text-slate-700">
                  Our intelligent system automatically assigns the most appropriate doctor based on your risk assessment. High-risk cases get immediate specialist attention, while lower-risk cases are matched with available general practitioners.
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Side - Login/Signup Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md mx-auto lg:max-w-lg"
          >
            <Card className="shadow-2xl border-red-100">
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-center mb-4">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <HeartPulse className="h-8 w-8 text-red-600" />
                  </motion.div>
                </div>
                <CardTitle className="text-3xl font-black text-center bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                  {isSignup ? "Create Account" : "Welcome Back"}
                </CardTitle>
                <CardDescription className="text-center text-base">
                  {isSignup
                    ? "Sign up to access CardiaX features"
                    : "Sign in to continue to CardiaX"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="your@email.com"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="h-11"
                      minLength={6}
                    />
                  </div>

                  {isSignup && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="h-11"
                        minLength={6}
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 bg-red-600 hover:bg-red-700"
                    disabled={loading}
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isSignup ? "Creating account..." : "Logging in..."}
                      </>
                    ) : (
                      isSignup ? "Sign Up" : "Login"
                    )}
                  </Button>
                </form>

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-slate-500">Or continue with</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-4 h-11"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </Button>
                </div>

                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignup(!isSignup);
                      setError("");
                    }}
                    className="text-sm text-slate-600 hover:text-red-600 transition-colors"
                  >
                    {isSignup ? (
                      <>
                        Already have an account?{" "}
                        <span className="font-semibold text-red-600">Login</span>
                      </>
                    ) : (
                      <>
                        Don't have an account?{" "}
                        <span className="font-semibold text-red-600">Sign up</span>
                      </>
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Mobile: Show app info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:hidden mt-8 text-center"
            >
              <div className="inline-flex items-center gap-2 mb-4">
                <HeartPulse className="h-6 w-6 text-red-600" />
                <span className="text-2xl font-black bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                  CardiaX
                </span>
              </div>
              <p className="text-slate-600 mb-4">
                Smart Cardiac Intelligence for Emergency Care
              </p>
              <div className="grid grid-cols-2 gap-2">
                {features.map((feature, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white/80 border border-red-100 text-xs"
                  >
                    <feature.icon className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-slate-700">{feature.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

