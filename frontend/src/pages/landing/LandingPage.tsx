import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LandingPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("authToken");
  const isLoggedIn = !!token;

  const handlePrimaryCTA = () => {
    if (isLoggedIn) {
      navigate("/student/placement/intro");
    } else {
      navigate("/auth/register?intent=placement");
    }
  };

  const handleSecondaryScroll = () => {
    const element = document.getElementById("how-it-works");
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="text-xl font-bold text-sky-400">SkillForge</div>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Button
                variant="outline"
                onClick={() => navigate("/student")}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/auth/login")}
                  className="text-slate-300 hover:text-slate-100 hover:bg-slate-800"
                >
                  Sign in
                </Button>
                <Button
                  onClick={() => navigate("/auth/register")}
                  className="bg-sky-600 hover:bg-sky-500"
                >
                  Get started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
              Stop proving you <span className="text-sky-400">learned</span>.<br />
              Start proving you can <span className="text-sky-400">do</span>.
            </h1>
            <p className="text-xl text-slate-300">
              SkillForge validates your real programming skills through hands-on tasks—so employers see evidence, not just certificates.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={handlePrimaryCTA}
              className="bg-sky-600 hover:bg-sky-500 text-white px-8"
            >
              Start Your Placement
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleSecondaryScroll}
              className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8"
            >
              See how it works
            </Button>
          </div>

          <p className="text-sm text-slate-400">
            Takes 20 minutes. No prep needed. No tricks.
          </p>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">You've seen this before</h2>
          <div className="grid sm:grid-cols-3 gap-8 mb-12">
            <Card className="bg-slate-800/50 border-slate-700 p-6">
              <div className="flex items-start gap-4">
                <div className="text-2xl font-bold text-sky-400 flex-shrink-0">1</div>
                <p className="text-slate-300">
                  You finished courses, collected certificates, and still get ignored.
                </p>
              </div>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700 p-6">
              <div className="flex items-start gap-4">
                <div className="text-2xl font-bold text-sky-400 flex-shrink-0">2</div>
                <p className="text-slate-300">
                  Employers don't trust what they can't verify.
                </p>
              </div>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700 p-6">
              <div className="flex items-start gap-4">
                <div className="text-2xl font-bold text-sky-400 flex-shrink-0">3</div>
                <p className="text-slate-300">
                  Your portfolio sits there, but nobody knows if you actually built it.
                </p>
              </div>
            </Card>
          </div>

          <div className="text-center">
            <p className="text-lg text-slate-300">
              SkillForge changes the question from <span className="font-semibold text-sky-400">"What did you learn?"</span> to{" "}
              <span className="font-semibold text-sky-400">"What can you build?"</span>
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">How SkillForge works</h2>

          <div className="grid sm:grid-cols-3 gap-8">
            {/* Step 1 */}
            <Card className="bg-slate-800/50 border-slate-700 p-8 relative">
              <div className="absolute -top-6 left-8 bg-sky-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
                1
              </div>
              <div className="mt-4 space-y-4">
                <h3 className="text-xl font-bold">Find your level</h3>
                <p className="text-slate-300">
                  Answer a short set of real coding tasks so we understand where you actually are—not where a course says you should be.
                </p>
              </div>
              {/* Arrow */}
              <div className="hidden sm:block absolute -right-4 top-1/2 transform -translate-y-1/2 text-sky-600 text-2xl">
                →
              </div>
            </Card>

            {/* Step 2 */}
            <Card className="bg-slate-800/50 border-slate-700 p-8 relative">
              <div className="absolute -top-6 left-8 bg-sky-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
                2
              </div>
              <div className="mt-4 space-y-4">
                <h3 className="text-xl font-bold">Build real evidence</h3>
                <p className="text-slate-300">
                  Complete focused challenges that match your level, each one reviewed and scored based on working code.
                </p>
              </div>
              {/* Arrow */}
              <div className="hidden sm:block absolute -right-4 top-1/2 transform -translate-y-1/2 text-sky-600 text-2xl">
                →
              </div>
            </Card>

            {/* Step 3 */}
            <Card className="bg-slate-800/50 border-slate-700 p-8">
              <div className="absolute -top-6 left-8 bg-sky-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div className="mt-4 space-y-4">
                <h3 className="text-xl font-bold">Share what you proved</h3>
                <p className="text-slate-300">
                  Your profile shows verified skills with scores and project work—evidence employers can trust because they didn't take your word for it.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Who This Is For Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Who this is for</h2>

          <div className="grid sm:grid-cols-3 gap-8">
            {/* Students */}
            <Card className="bg-slate-800/50 border-slate-700 p-8">
              <h3 className="text-xl font-bold mb-4 text-sky-400">Students</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 font-semibold mb-1">The pain:</p>
                  <p className="text-slate-300">
                    You've learned a lot but have no credible way to prove it.
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-semibold mb-1">The benefit:</p>
                  <p className="text-slate-300">
                    Get a verified skill profile that speaks louder than a certificate wall.
                  </p>
                </div>
              </div>
            </Card>

            {/* Employers */}
            <Card className="bg-slate-800/50 border-slate-700 p-8">
              <h3 className="text-xl font-bold mb-4 text-sky-400">Employers</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 font-semibold mb-1">The pain:</p>
                  <p className="text-slate-300">
                    Resumes don't tell you who can actually ship code.
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-semibold mb-1">The benefit:</p>
                  <p className="text-slate-300">
                    See candidates ranked by demonstrated ability, not self-reported keywords.
                  </p>
                </div>
              </div>
            </Card>

            {/* Educators */}
            <Card className="bg-slate-800/50 border-slate-700 p-8">
              <h3 className="text-xl font-bold mb-4 text-sky-400">Educators & Admins</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 font-semibold mb-1">The pain:</p>
                  <p className="text-slate-300">
                    You can't track which students are truly job-ready.
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-semibold mb-1">The benefit:</p>
                  <p className="text-slate-300">
                    Monitor real progress and identify who needs support before it's too late.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold">Ready to know where you stand?</h2>
            <p className="text-lg text-slate-300">
              No more guessing. No more hoping your resume lands. Take the placement and see your real level in 20 minutes.
            </p>
          </div>

          <Button
            size="lg"
            onClick={handlePrimaryCTA}
            className="bg-sky-600 hover:bg-sky-500 text-white px-8"
          >
            Start Your Placement
          </Button>

          <p className="text-sm text-slate-400">
            Free to start. No credit card. No spam.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-slate-400 text-sm">
            © 2025 SkillForge. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
