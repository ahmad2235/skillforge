import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, CheckCircle2, Code2, LayoutDashboard, ShieldCheck, Users } from "lucide-react";

export function LandingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const role = isAuthenticated ? user?.role : "guest";

  // ─────────────────────────────────────────────────────────────
  // 1. ROLE-BASED CONTENT CONFIGURATION
  // ─────────────────────────────────────────────────────────────
  
  const content = {
    guest: {
      hero: {
        headline: (
          <>
            Stop proving you <span className="text-sky-400">learned</span>.<br />
            Start proving you can <span className="text-sky-400">do</span>.
          </>
        ),
        subheadline: "SkillForge validates your real programming skills through hands-on tasks—so employers see evidence, not just certificates.",
        primaryCta: { label: "Start Your Placement", action: () => navigate("/auth/register?intent=placement") },
        secondaryCta: { label: "How it works", action: () => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" }) }
      },
      steps: [
        { title: "Find your level", desc: "Take a 20-minute placement test to map your actual starting point.", icon: Code2 },
        { title: "Build evidence", desc: "Complete real-world coding tasks that prove your skills.", icon: LayoutDashboard },
        { title: "Get hired", desc: "Share a verified portfolio that employers can trust.", icon: CheckCircle2 }
      ],
      benefits: [
        { title: "Verified Skills", desc: "No more self-reported ratings. Prove what you know." },
        { title: "Real Projects", desc: "Build a portfolio of working code, not just tutorials." },
        { title: "Employer Trust", desc: "Stand out with evidence-backed skill validation." }
      ]
    },
    student: {
      hero: {
        headline: (
          <>
            Welcome back, <span className="text-sky-400">{user?.name?.split(' ')[0] || 'Student'}</span>.<br />
            Continue your journey.
          </>
        ),
        subheadline: "Your personalized roadmap is ready. Complete tasks, earn badges, and build your portfolio.",
        primaryCta: { label: "Go to Dashboard", action: () => navigate("/student") },
        secondaryCta: null
      },
      steps: [
        { title: "Follow Roadmap", desc: "Your path adapts as you grow. Next task is waiting.", icon: LayoutDashboard },
        { title: "Submit Work", desc: "Get instant AI feedback and improve your code.", icon: Code2 },
        { title: "Showcase", desc: "Add your best work to your public portfolio.", icon: Users }
      ],
      benefits: [
        { title: "Personalized Path", desc: "Learning that adapts to your pace and level." },
        { title: "Instant Feedback", desc: "AI-powered reviews help you improve faster." },
        { title: "Career Ready", desc: "Build the exact skills employers are looking for." }
      ]
    },
    business: {
      hero: {
        headline: (
          <>
            Hire with <span className="text-sky-400">confidence</span>.<br />
            Verify skills instantly.
          </>
        ),
        subheadline: "Create projects, review AI-ranked candidates, and hire developers who have proven they can ship code.",
        primaryCta: { label: "Create Project", action: () => navigate("/business/projects/new") },
        secondaryCta: { label: "View Active Projects", action: () => navigate("/business/projects") }
      },
      steps: [
        { title: "Create Project", desc: "Define the skills and tasks you need for the role.", icon: LayoutDashboard },
        { title: "Get Matches", desc: "Our AI ranks candidates based on verified code submissions.", icon: Users },
        { title: "Hire Talent", desc: "Interview candidates who have already proven they can do the job.", icon: CheckCircle2 }
      ],
      benefits: [
        { title: "Verified Candidates", desc: "See actual code performance, not just resumes." },
        { title: "Time Saving", desc: "Skip technical screening. We've already done it." },
        { title: "Data Driven", desc: "Make hiring decisions based on objective metrics." }
      ]
    },
    admin: {
      hero: {
        headline: "System Administration",
        subheadline: "Monitor platform usage, manage users, and review content submissions.",
        primaryCta: { label: "Go to Admin Dashboard", action: () => navigate("/admin") },
        secondaryCta: null
      },
      steps: [], // Admin doesn't need "How it works"
      benefits: []
    }
  };

  // Fallback to guest if role is unknown
  const currentRole = (role === 'student' || role === 'business' || role === 'admin') ? role : 'guest';
  const activeContent = content[currentRole];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-sky-500/30">
      
      {/* ─────────────────────────────────────────────────────────────
          2. HERO SECTION
         ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-sky-500 rounded-full blur-[128px]" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500 rounded-full blur-[128px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center space-y-8 animate-page-enter">
          <div className="space-y-6">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] text-slate-200">
              {activeContent.hero.headline}
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              {activeContent.hero.subheadline}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button
              size="lg"
              onClick={activeContent.hero.primaryCta.action}
              className="bg-sky-600 hover:bg-sky-500 text-white px-8 h-12 text-base font-medium shadow-lg shadow-sky-900/20 transition-all hover:scale-105"
            >
              {activeContent.hero.primaryCta.label}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            
            {activeContent.hero.secondaryCta && (
              <Button
                size="lg"
                variant="outline"
                onClick={activeContent.hero.secondaryCta.action}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white px-8 h-12 text-base"
              >
                {activeContent.hero.secondaryCta.label}
              </Button>
            )}
          </div>

          {currentRole === 'guest' && (
            <p className="text-sm text-slate-500 pt-4">
              Takes 20 minutes • No credit card required • Instant results
            </p>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. HOW IT WORKS (Role-Specific)
         ───────────────────────────────────────────────────────────── */}
      {activeContent.steps.length > 0 && (
        <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900/50 border-y border-slate-800/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-slate-200">How it works</h2>
              <p className="text-slate-400">Simple, transparent, and effective.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {activeContent.steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <Card 
                    key={index} 
                    className="bg-slate-900 border-slate-800 p-8 relative overflow-hidden group hover:border-slate-700 transition-colors animate-card-enter"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Icon size={120} />
                    </div>
                    <div className="relative z-10 space-y-4">
                      <div className="w-12 h-12 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 mb-6">
                        <Icon size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-100">{step.title}</h3>
                      <p className="text-slate-400 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. BENEFITS / TRUST
         ───────────────────────────────────────────────────────────── */}
      {activeContent.benefits.length > 0 && (
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-200">
                  Why choose SkillForge?
                </h2>
                <div className="space-y-6">
                  {activeContent.benefits.map((benefit, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="mt-1">
                        <ShieldCheck className="text-sky-00 h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-slate-200">{benefit.title}</h3>
                        <p className="text-slate-400">{benefit.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Visual decoration / Trust indicator */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-2xl blur-2xl opacity-20" />
                <Card className="relative bg-slate-900 border-slate-800 p-8 space-y-6">
                  <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
                    <div className="h-12 w-12 rounded-full bg-slate-800 animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-slate-800 rounded animate-pulse" />
                      <div className="h-3 w-24 bg-slate-800 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 w-full bg-slate-800 rounded animate-pulse" />
                    <div className="h-3 w-5/6 bg-slate-800 rounded animate-pulse" />
                    <div className="h-3 w-4/6 bg-slate-800 rounded animate-pulse" />
                  </div>
                  <div className="pt-4 flex gap-2">
                    <div className="h-8 w-20 bg-sky-900/30 rounded animate-pulse" />
                    <div className="h-8 w-20 bg-sky-900/30 rounded animate-pulse" />
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. FOOTER
         ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 py-12 px-4 sm:px-6 lg:px-8 bg-slate-950">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-sky-600 flex items-center justify-center font-bold text-white">S</div>
            <span className="font-bold text-xl tracking-tight">SkillForge</span>
          </div>
          <p className="text-slate-500 text-sm">
            © 2025 SkillForge. Built for the future of hiring.
          </p>
        </div>
      </footer>
    </div>
  );
}
