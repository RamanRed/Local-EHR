
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Shield, Stethoscope, Activity } from "lucide-react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerText?: string;
  footerLinkText?: string;
  footerLinkTo?: string;
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerLinkTo,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col justify-between gradient-accent relative overflow-hidden">
        {/* Floating shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-white/5" />
          <div className="absolute top-1/3 -right-12 h-48 w-48 rounded-full bg-white/5" />
          <div className="absolute bottom-20 left-16 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute top-1/2 left-1/3 h-20 w-20 rounded-full bg-white/5" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-10 py-10">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              <img
                src="/logo.png"
                alt="SarvaVaidya"
                className="h-7 w-7 object-contain brightness-0 invert"
              />
            </div>
            <div>
              <span className="font-display text-lg font-bold text-white">
                SarvaVaidya
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
                Smart EMR
              </p>
            </div>
          </div>

          {/* Main messaging */}
          <div className="flex-1 flex flex-col justify-center -mt-12">
            <h2 className="font-display text-3xl font-bold text-white leading-tight mb-4">
              Healthcare,
              <br />
              <span className="text-white/80">Reimagined.</span>
            </h2>
            <p className="text-white/60 text-sm leading-relaxed max-w-[320px]">
              AI-powered diagnostic assistance, intelligent SOAP notes, and seamless clinical workflows — all in one platform.
            </p>

            {/* Feature pills */}
            <div className="mt-8 space-y-3">
              {[
                { icon: Stethoscope, text: "AI-Assisted Diagnostics" },
                { icon: Shield, text: "HIPAA Compliant & Secure" },
                { icon: Activity, text: "Real-Time Patient Monitoring" },
                { icon: Heart, text: "Evidence-Based Treatment Plans" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-2.5 text-sm text-white/90"
                >
                  <Icon className="h-4 w-4 text-white/70 flex-shrink-0" />
                  {text}
                </div>
              ))}
            </div>
          </div>


        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 gradient-surface">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Header (mobile logo) */}
          <div className="mb-8 text-center">
            <div className="lg:hidden mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-accent shadow-glow-primary">
              <img
                src="/logo.png"
                alt="SarvaVaidya Logo"
                className="h-8 w-8 object-contain brightness-0 invert"
              />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {title}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {/* Card */}
          <Card className="shadow-card-hover border-border/60">
            <CardContent className="pt-6">
              {children}

              {footerText && footerLinkTo && (
                <p className="mt-6 text-center text-sm text-muted-foreground">
                  {footerText}{" "}
                  <Link
                    to={footerLinkTo}
                    className="font-medium text-primary hover:underline"
                  >
                    {footerLinkText}
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
