import { Card, CardHeader, CardTitle } from "@/components/ui/card";


interface ProjectCardProps {
  name: string;
  onClick?: () => void;
}

export function ProjectCard({ name, onClick }: ProjectCardProps) {
  return (
    <div 
      onClick={onClick}
      className="group relative cursor-pointer transition-all duration-300 hover:-translate-y-1"
    >
      <div className="absolute -top-3 left-0 h-6 w-24 rounded-t-lg bg-border group-hover:bg-primary/20 transition-colors" />
      
      <Card className="relative overflow-hidden border-t-0 rounded-tl-none transition-all duration-300 group-hover:shadow-lg group-hover:border-primary/50 h-32 flex flex-col justify-center">
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">

            <CardTitle className="font-semibold text-lg tracking-tight group-hover:text-primary transition-colors">
              {name}
            </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
