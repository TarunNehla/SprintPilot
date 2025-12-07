import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Files, 
  Search, 
  ListTodo, 
  Bot,
  Layout
} from "lucide-react"

const features = [
  {
    icon: Layout,
    title: "Project Hub",
    description: "Centralized workspace for all your ongoing projects. Keep everything organized in one place.",
  },
  {
    icon: Files,
    title: "Document Management",
    description: "Upload and manage project documentation effortlessly. Support for multiple file formats.",
  },
  {
    icon: ListTodo,
    title: "Issue Tracking",
    description: "Create, assign, and track issues. Stay on top of tasks and deadlines without the clutter.",
  },
  {
    icon: Search,
    title: "Hybrid Search",
    description: "Powerful search capability combining vector similarity and keyword matching to find exactly what you need.",
  },
  {
    icon: Bot,
    title: "AI Agent",
    description: "Consult with your project agent to get answers, summaries, and recommendations based on your knowledge base.",
  }
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 sm:py-32 bg-secondary/20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Manage your projects with a suite of powerful, AI-enhanced tools.
          </p>
        </div>
        
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {features.map((feature) => {
            const IconComponent = feature.icon
            return (
              <Card key={feature.title} className="bg-background border-border hover:border-foreground/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <IconComponent className="h-5 w-5 text-foreground" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}