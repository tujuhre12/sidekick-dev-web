import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Github, Sparkles, FileCode, Loader2 } from "lucide-react";

const Index = () => {
  const [githubUrl, setGithubUrl] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const agents = [
    { id: "claude", name: "Claude Code", icon: "CC", color: "text-purple-600" },
    { id: "cursor", name: "Cursor", icon: "CR", color: "text-blue-600" },
    { id: "windsurf", name: "Windsurf", icon: "WS", color: "text-teal-600" },
    { id: "gemini", name: "Gemini", icon: "GM", color: "text-orange-600" },
  ];

  const handleAgentToggle = (agentId: string) => {
    setSelectedAgents(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleGenerate = async () => {
    if (!githubUrl.trim()) {
      toast({
        title: "GitHub URL Required",
        description: "Please enter a valid GitHub repository URL.",
        variant: "destructive",
      });
      return;
    }

    if (selectedAgents.length === 0) {
      toast({
        title: "Select Agents",
        description: "Please select at least one coding agent.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    // Simulate generation process
    setTimeout(() => {
      setIsGenerating(false);
      toast({
        title: "Files Generated! 🎉",
        description: `Generated context files for ${selectedAgents.length} agent(s). Download will start shortly.`,
      });
      
      // Simulate file download
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = '#';
        link.download = 'sidekick-context-files.zip';
        link.click();
      }, 1000);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-dreamy flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-float">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-primary animate-pulse-slow" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Sidekick Code
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Automatically generate high-quality markdown context files for your coding agents to enhance their performance.
          </p>
        </div>

        {/* Main Card */}
        <Card className="bg-gradient-card backdrop-blur-sm border-0 shadow-dreamy p-8 animate-glow">
          <div className="space-y-6">
            {/* GitHub URL Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                GitHub Repository URL
              </label>
              <div className="relative">
                <Github className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder="https://github.com/username/repository"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="pl-10 h-12 bg-white/50 border-white/20 focus:border-primary/50 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Agent Selection */}
            <div className="space-y-4">
              <label className="text-sm font-medium text-foreground">
                Select Target Agents
              </label>
              <div className="grid grid-cols-2 gap-3">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:scale-105 ${
                      selectedAgents.includes(agent.id)
                        ? 'border-primary bg-primary/10 shadow-glow'
                        : 'border-white/20 bg-white/30 hover:border-primary/30'
                    }`}
                    onClick={() => handleAgentToggle(agent.id)}
                  >
                    <Checkbox
                      checked={selectedAgents.includes(agent.id)}
                      onChange={() => handleAgentToggle(agent.id)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <span className="text-sm font-bold bg-primary/20 px-2 py-1 rounded">{agent.icon}</span>
                    <span className={`font-medium ${agent.color}`}>
                      {agent.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg shadow-dreamy hover:shadow-glow transition-all duration-300"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Context Files...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Generate & Download
                </>
              )}
            </Button>

            {/* Loading Animation */}
            {isGenerating && (
              <div className="space-y-3 animate-pulse">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                  <span>Analyzing repository structure...</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <span>Extracting code patterns...</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <span>Generating markdown context...</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>
            ✨ Made by <a href="https://github.com/saharmor" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Sahar Mor</a>  
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;