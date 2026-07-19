import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function AdminPlaceholder({ title, note }: { title: string; note?: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <Card>
        <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
          <Construction className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">{note ?? "This section is coming soon."}</p>
        </CardContent>
      </Card>
    </div>
  );
}
