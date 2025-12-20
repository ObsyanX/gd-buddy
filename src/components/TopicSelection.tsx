import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sparkles, Loader2, FileText, Lightbulb, Scale, Briefcase, Newspaper, MessageSquare, Heart, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { invokeWithAuth } from "@/lib/supabase-auth";

interface TopicSelectionProps {
  onTopicSelected: (topic: any) => void;
  onBack: () => void;
}

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  examples: string[];
  tip: string;
}

const TOPIC_CATEGORIES: Category[] = [
  {
    id: "factual",
    name: "Factual Topics",
    icon: <FileText className="w-5 h-5" />,
    description: "Based on facts, data, or real events. Tests awareness and knowledge.",
    examples: ["Impact of AI on jobs", "Climate change and global warming", "Digital India initiative"],
    tip: "Requires current affairs and basic statistics"
  },
  {
    id: "conceptual",
    name: "Conceptual / Abstract",
    icon: <Lightbulb className="w-5 h-5" />,
    description: "Based on ideas or concepts. Tests thinking and interpretation.",
    examples: ["Success comes before happiness", "Hard work vs smart work", "Freedom comes with responsibility"],
    tip: "No right or wrong answer; focus on logic and clarity"
  },
  {
    id: "controversial",
    name: "Controversial Topics",
    icon: <Scale className="w-5 h-5" />,
    description: "Strong arguments on both sides. Tests emotional control and reasoning.",
    examples: ["Reservation system in India", "Social media: boon or bane", "Should capital punishment be abolished?"],
    tip: "Important to stay calm and respectful"
  },
  {
    id: "case-study",
    name: "Case Study-Based",
    icon: <Briefcase className="w-5 h-5" />,
    description: "Real-life situations requiring solutions. Tests problem-solving and leadership.",
    examples: ["Company facing losses due to poor management", "Ethical dilemma in workplace", "Handling a data privacy breach"],
    tip: "Tests problem-solving, teamwork, and leadership"
  },
  {
    id: "current-affairs",
    name: "Current Affairs",
    icon: <Newspaper className="w-5 h-5" />,
    description: "Related to recent national or international events.",
    examples: ["India's role in global politics", "Cryptocurrency regulations", "Start-up culture in India"],
    tip: "Requires regular news reading"
  },
  {
    id: "opinion",
    name: "Opinion-Based",
    icon: <MessageSquare className="w-5 h-5" />,
    description: "Participants must express personal viewpoints.",
    examples: ["Is engineering still a good career?", "Should exams be removed?", "Is technology making humans lazy?"],
    tip: "Tests confidence and communication"
  },
  {
    id: "ethical",
    name: "Ethical Topics",
    icon: <Heart className="w-5 h-5" />,
    description: "Focus on moral values and ethics.",
    examples: ["Ethics in artificial intelligence", "Corporate social responsibility", "Is whistleblowing justified?"],
    tip: "Evaluates integrity and judgment"
  }
];

const TopicSelection = ({ onTopicSelected, onBack }: TopicSelectionProps) => {
  const { toast } = useToast();
  const [customTopic, setCustomTopic] = useState("");
  const [generatedTopics, setGeneratedTopics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const handleGenerateTopics = async () => {
    if (!selectedCategory) {
      toast({
        title: "Select a category",
        description: "Please select a topic category first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await invokeWithAuth('gd-topics', {
        body: { 
          count: 6,
          category: selectedCategory.id
        }
      });

      if (response.error) throw new Error(typeof response.error === 'string' ? response.error : 'Unknown error');
      
      setGeneratedTopics(response.data?.topics || []);
      toast({
        title: "Topics Generated",
        description: `Generated ${response.data?.topics?.length || 0} ${selectedCategory.name.toLowerCase()}`,
      });
    } catch (error) {
      console.error('Failed to generate topics:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate topics. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomTopicSubmit = () => {
    if (!customTopic.trim()) {
      toast({
        title: "Empty Topic",
        description: "Please enter a topic to discuss",
        variant: "destructive",
      });
      return;
    }

    onTopicSelected({
      title: customTopic,
      category: "Custom",
      difficulty: "medium",
      prompts: [],
      tags: ["custom"]
    });
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setGeneratedTopics([]);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setGeneratedTopics([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack} className="border-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-2xl font-black">SELECT TOPIC</h2>
      </div>

      <Tabs defaultValue="ai" className="w-full">
        <TabsList className="grid w-full grid-cols-2 border-2 border-border">
          <TabsTrigger value="ai" className="font-bold">AI GENERATED</TabsTrigger>
          <TabsTrigger value="custom" className="font-bold">CUSTOM TOPIC</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-4 mt-4">
          {!selectedCategory ? (
            // Category Selection View
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground font-medium">
                Choose a category to generate discussion topics:
              </p>
              <div className="grid gap-3">
                {TOPIC_CATEGORIES.map((category) => (
                  <Card
                    key={category.id}
                    className="p-4 border-2 cursor-pointer hover:border-primary hover:bg-accent/50 transition-all"
                    onClick={() => handleCategorySelect(category)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {category.icon}
                      </div>
                      <div className="flex-1 space-y-1">
                        <h3 className="font-bold">{category.name}</h3>
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {category.examples.slice(0, 2).map((example, idx) => (
                            <span key={idx} className="text-xs bg-secondary px-2 py-0.5 rounded">
                              {example}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-primary/80 mt-1">✓ {category.tip}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            // Topics Generation View
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToCategories}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Change
                </Button>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                  {selectedCategory.icon}
                  <span className="font-bold text-sm">{selectedCategory.name}</span>
                </div>
              </div>

              {generatedTopics.length === 0 ? (
                <Button
                  onClick={handleGenerateTopics}
                  disabled={isLoading}
                  className="w-full border-2 font-bold gap-2"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      GENERATING...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      GENERATE {selectedCategory.name.toUpperCase()}
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">
                      Select a topic to begin:
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateTopics}
                      disabled={isLoading}
                      className="gap-1"
                    >
                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Regenerate
                    </Button>
                  </div>
                  {generatedTopics.map((topic, index) => (
                    <Card
                      key={index}
                      className="p-4 border-2 cursor-pointer hover:border-primary hover:bg-accent/50 transition-all"
                      onClick={() => onTopicSelected(topic)}
                    >
                      <h3 className="font-bold mb-2">{topic.title}</h3>
                      <div className="flex flex-wrap gap-1">
                        {topic.tags?.map((tag: string, idx: number) => (
                          <span key={idx} className="text-xs bg-secondary px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="custom" className="space-y-4 mt-4">
          <div className="space-y-3">
            <Input
              placeholder="Enter your discussion topic..."
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              className="border-2"
            />
            <Button
              onClick={handleCustomTopicSubmit}
              className="w-full border-2 font-bold"
              disabled={!customTopic.trim()}
            >
              START WITH THIS TOPIC
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TopicSelection;