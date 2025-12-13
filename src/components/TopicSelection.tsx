import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { invokeWithAuth } from "@/lib/supabase-auth";

interface TopicSelectionProps {
  onTopicSelected: (topic: any) => void;
  onBack: () => void;
}

const TopicSelection = ({ onTopicSelected, onBack }: TopicSelectionProps) => {
  const [customTopic, setCustomTopic] = useState("");
  const [generatedTopics, setGeneratedTopics] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateTopics = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await invokeWithAuth('gd-topics', {
        body: {
          audience: 'engineering students',
          tone: 'formal',
          difficulty: 'medium',
          count: 6
        }
      });

      if (error) throw error;

      setGeneratedTopics(data.topics || []);
      toast({
        title: "Topics generated",
        description: "Choose one to start your practice session",
      });
    } catch (error: any) {
      console.error('Error generating topics:', error);
      toast({
        title: "Failed to generate topics",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCustomTopicSubmit = () => {
    if (!customTopic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter a discussion topic",
        variant: "destructive",
      });
      return;
    }

    onTopicSelected({
      title: customTopic,
      category: 'Custom',
      difficulty: 'medium',
      prompts: [],
      tags: []
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack} className="border-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold">SELECT TOPIC</h1>
            <p className="text-muted-foreground font-mono">Choose or create your discussion topic</p>
          </div>
        </div>

        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-2 border-2">
            <TabsTrigger value="generate">AI GENERATED</TabsTrigger>
            <TabsTrigger value="custom">CUSTOM TOPIC</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            {generatedTopics.length === 0 ? (
              <Card className="p-12 border-4 border-border text-center space-y-4">
                <Sparkles className="w-16 h-16 mx-auto text-muted-foreground" />
                <h3 className="text-2xl font-bold">GENERATE TOPICS</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Let AI create engaging, interview-ready discussion topics tailored for you
                </p>
                <Button 
                  size="lg" 
                  onClick={handleGenerateTopics}
                  disabled={isGenerating}
                  className="border-4 border-border shadow-md"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      GENERATING...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      GENERATE TOPICS
                    </>
                  )}
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-mono text-muted-foreground">
                    {generatedTopics.length} topics generated
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleGenerateTopics}
                    disabled={isGenerating}
                    className="border-2"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : "REGENERATE"}
                  </Button>
                </div>

                <div className="grid gap-4">
                  {generatedTopics.map((topic, index) => (
                    <Card 
                      key={index} 
                      className="p-6 border-4 border-border hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onTopicSelected(topic)}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-xl font-bold flex-1">{topic.title}</h3>
                          <Badge variant="outline" className="border-2">
                            {topic.difficulty}
                          </Badge>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="secondary">{topic.category}</Badge>
                          {topic.tags?.slice(0, 3).map((tag: string, i: number) => (
                            <Badge key={i} variant="outline">{tag}</Badge>
                          ))}
                        </div>
                        {topic.prompts && topic.prompts.length > 0 && (
                          <div className="text-sm text-muted-foreground font-mono">
                            <p className="font-bold mb-1">Discussion points:</p>
                            <ul className="list-disc list-inside space-y-1">
                              {topic.prompts.slice(0, 2).map((prompt: string, i: number) => (
                                <li key={i}>{prompt}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <Card className="p-8 border-4 border-border space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold">ENTER YOUR TOPIC</label>
                <Input
                  placeholder="e.g., Impact of AI on employment in the next decade"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  className="border-2 text-lg"
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomTopicSubmit()}
                />
                <p className="text-xs text-muted-foreground font-mono">
                  Enter a clear, debate-worthy topic for group discussion
                </p>
              </div>
              <Button 
                size="lg" 
                onClick={handleCustomTopicSubmit}
                className="w-full border-4 border-border shadow-md"
              >
                CONTINUE WITH THIS TOPIC
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TopicSelection;