import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, Sparkles, FileText, Lightbulb, Scale, Briefcase, Newspaper, MessageSquare, Heart, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { invokeWithAuth } from "@/lib/supabase-auth";

interface Category {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  examples: string[];
  tip: string;
}

const TOPIC_CATEGORIES: Category[] = [
  {
    id: 'factual',
    name: 'Factual Topics',
    icon: FileText,
    description: 'Data-driven, verifiable statements',
    examples: ['Remote work increases productivity by 13%', 'India has the largest youth population'],
    tip: 'Use statistics and research to support your points'
  },
  {
    id: 'conceptual',
    name: 'Conceptual/Abstract Topics',
    icon: Lightbulb,
    description: 'Ideas, theories, and philosophical concepts',
    examples: ['Success means different things to different people', 'Is democracy the best form of governance?'],
    tip: 'Define key terms and explore multiple perspectives'
  },
  {
    id: 'controversial',
    name: 'Controversial Topics',
    icon: Scale,
    description: 'Debatable issues with strong opinions on both sides',
    examples: ['Should social media be regulated?', 'Is capitalism sustainable?'],
    tip: 'Acknowledge opposing views before presenting your stance'
  },
  {
    id: 'case-study',
    name: 'Case Study-Based',
    icon: Briefcase,
    description: 'Real-world scenarios and problem-solving',
    examples: ['How should a startup prioritize growth vs profitability?', 'Crisis management in organizations'],
    tip: 'Apply frameworks and real examples to analyze situations'
  },
  {
    id: 'current-affairs',
    name: 'Current Affairs',
    icon: Newspaper,
    description: 'Recent news and trending topics',
    examples: ['Impact of AI on job markets', 'Climate change policies'],
    tip: 'Stay updated and connect events to broader themes'
  },
  {
    id: 'opinion',
    name: 'Opinion-Based',
    icon: MessageSquare,
    description: 'Personal views and preferences',
    examples: ['What makes a great leader?', 'Work-life balance priorities'],
    tip: 'Support opinions with reasoning and examples'
  },
  {
    id: 'ethical',
    name: 'Ethical Topics',
    icon: Heart,
    description: 'Moral dilemmas and value-based discussions',
    examples: ['Is it ethical to use AI in hiring?', 'Privacy vs security trade-offs'],
    tip: 'Consider stakeholder impacts and ethical frameworks'
  }
];

const MultiplayerTopic = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [topicMode, setTopicMode] = useState<'generate' | 'custom'>('generate');
  const [customTopic, setCustomTopic] = useState("");
  const [generatedTopics, setGeneratedTopics] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const handleGenerateTopics = async () => {
    if (!selectedCategory) {
      toast({
        title: "Select a category",
        description: "Please select a topic category first",
        variant: "destructive"
      });
      return;
    }
    setIsGenerating(true);
    try {
      const { data, error } = await invokeWithAuth('gd-topics', {
        body: {
          audience: 'engineering students',
          tone: 'formal',
          difficulty: 'medium',
          count: 6,
          category: selectedCategory.id
        }
      });
      if (error) throw error;
      setGeneratedTopics(data.topics || []);
      toast({
        title: "Topics generated",
        description: "Choose one to start your multiplayer session"
      });
    } catch (error: any) {
      console.error('Error generating topics:', error);
      toast({
        title: "Failed to generate topics",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTopicSelected = (topic: any) => {
    navigate('/multiplayer/setup', { state: { topic } });
  };

  const handleCustomTopicSubmit = () => {
    if (!customTopic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter a discussion topic",
        variant: "destructive"
      });
      return;
    }
    handleTopicSelected({
      title: customTopic,
      category: 'Custom',
      difficulty: 'medium',
      tags: []
    });
  };

  const handleBack = () => {
    navigate('/multiplayer');
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleBack} className="border-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold">SELECT TOPIC</h1>
            <p className="text-muted-foreground font-mono">Choose a topic for your multiplayer session</p>
          </div>
        </div>

        <Tabs value={topicMode} onValueChange={v => setTopicMode(v as 'generate' | 'custom')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 border-2 border-border">
            <TabsTrigger value="generate" className="font-bold">AI GENERATED</TabsTrigger>
            <TabsTrigger value="custom" className="font-bold">CUSTOM TOPIC</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6 mt-4">
            {!selectedCategory ? (
              <div className="space-y-4">
                <p className="text-sm font-mono text-muted-foreground">
                  Select a category to generate relevant topics
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {TOPIC_CATEGORIES.map((category) => {
                    const IconComponent = category.icon;
                    return (
                      <Card 
                        key={category.id}
                        className="p-4 border-4 border-border hover:border-primary hover:shadow-md transition-all cursor-pointer"
                        onClick={() => setSelectedCategory(category)}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-secondary">
                              <IconComponent className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-sm">{category.name}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {category.description}
                          </p>
                          <div className="space-y-1">
                            <Badge variant="secondary" className="text-xs">
                              {category.examples[0]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground italic">
                            💡 {category.tip}
                          </p>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : generatedTopics.length === 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setSelectedCategory(null);
                      setGeneratedTopics([]);
                    }}
                    className="gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Change Category
                  </Button>
                  <Badge variant="secondary" className="gap-2">
                    {(() => {
                      const IconComponent = selectedCategory.icon;
                      return <IconComponent className="w-3 h-3" />;
                    })()}
                    {selectedCategory.name}
                  </Badge>
                </div>
                <Card className="p-12 border-4 border-border text-center space-y-4">
                  <Sparkles className="w-16 h-16 mx-auto text-muted-foreground" />
                  <h3 className="text-2xl font-bold">GENERATE {selectedCategory.name.toUpperCase()}</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {selectedCategory.description}
                  </p>
                  <Button size="lg" onClick={handleGenerateTopics} disabled={isGenerating} className="border-4 border-border shadow-md text-center">
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
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setSelectedCategory(null);
                        setGeneratedTopics([]);
                      }}
                      className="gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Change
                    </Button>
                    <Badge variant="secondary" className="gap-2">
                      {(() => {
                        const IconComponent = selectedCategory.icon;
                        return <IconComponent className="w-3 h-3" />;
                      })()}
                      {selectedCategory.name}
                    </Badge>
                    <span className="text-sm font-mono text-muted-foreground">
                      {generatedTopics.length} topics
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleGenerateTopics} disabled={isGenerating} className="border-2">
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : "REGENERATE"}
                  </Button>
                </div>

                <div className="grid gap-4">
                  {generatedTopics.map((topic, index) => (
                    <Card 
                      key={index} 
                      className="p-6 border-4 border-border hover:shadow-md transition-shadow cursor-pointer" 
                      onClick={() => handleTopicSelected(topic)}
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
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 mt-4">
            <Card className="p-8 border-4 border-border space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-bold">ENTER YOUR TOPIC</Label>
                <Input 
                  placeholder="e.g., Impact of AI on employment in the next decade" 
                  value={customTopic} 
                  onChange={e => setCustomTopic(e.target.value)} 
                  className="border-2 text-lg" 
                  onKeyDown={e => e.key === 'Enter' && handleCustomTopicSubmit()} 
                />
                <p className="text-xs text-muted-foreground font-mono">
                  Enter a clear, debate-worthy topic for group discussion
                </p>
              </div>
              <Button 
                size="lg" 
                onClick={handleCustomTopicSubmit} 
                disabled={!customTopic.trim()} 
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

export default MultiplayerTopic;
