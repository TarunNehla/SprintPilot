import { Button } from "@/components/ui/button";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function HeroSection() {
  return (
    <section className="relative px-6 lg:px-8 py-24 sm:py-32 overflow-hidden">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          Project Management
          <span className="block text-muted-foreground mt-2">
            Reimagined with AI
          </span>
        </h1>

        <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
          Create projects, upload documentation, and let our AI agent help you manage issues and search your knowledge base. Simple, fast, and efficient.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/dashboard">
            <Button size="lg" className="group min-w-[160px]">
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          
          <a href="/api/auth/signin">
             <Button variant="outline" size="lg" className="min-w-[160px]">
              Sign In
            </Button>         
          </a>
        </div>
      </div>
    </section>
  );
}
