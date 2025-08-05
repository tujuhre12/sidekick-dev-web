import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Github, Sparkles, Loader2, CheckCircle, Code, Search, Zap, Brain, Package, FileText, FolderOpen } from "lucide-react";
import { API_ENDPOINTS, AGENTS, type AgentId } from "@/config";

interface ProgressStep {
  id: string;
  label: string;
  icon: React.ElementType;
  minDelay: number;
  maxDelay: number;
  status: 'pending' | 'active' | 'completed';
}

const Index = () => {
  const [githubUrl, setGithubUrl] = useState("https://github.com/saharmor/simulatedev");
  const [selectedAgents, setSelectedAgents] = useState<AgentId[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isBackendComplete, setIsBackendComplete] = useState(false);
  const [isGenerationComplete, setIsGenerationComplete] = useState(false);
  const { toast } = useToast();

  const progressSteps: ProgressStep[] = [
    { id: 'initialize', label: 'Initializing DeepWiki connection', icon: Zap, minDelay: 3000, maxDelay: 5000, status: 'pending' },
    { id: 'prompt', label: 'Sending prompt to DeepWiki', icon: Search, minDelay: 4000, maxDelay: 7000, status: 'pending' },
    { id: 'process', label: 'Processing DeepWiki response', icon: Brain, minDelay: 10000, maxDelay: 16000, status: 'pending' },
    { id: 'generate', label: 'Generating markdown context', icon: Code, minDelay: 6000, maxDelay: 10000, status: 'pending' },
    { id: 'prepare', label: 'Preparing download', icon: Package, minDelay: 4000, maxDelay: 7000, status: 'pending' },
    { id: 'download', label: 'Downloading files', icon: Download, minDelay: 1000, maxDelay: 2000, status: 'pending' },
  ];

  // Progress simulation effect
  useEffect(() => {
    if (isGenerating && !isBackendComplete && currentStep < progressSteps.length - 1) {
      // Stop before the last step (downloading) until backend is complete
      const step = progressSteps[currentStep];
      const randomDelay = Math.random() * (step.maxDelay - step.minDelay) + step.minDelay;
      
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, randomDelay);

      return () => clearTimeout(timer);
    }
  }, [isGenerating, currentStep, isBackendComplete, progressSteps.length]);

  // Handle final step when backend completes
  useEffect(() => {
    if (isBackendComplete && currentStep < progressSteps.length) {
      const timer = setTimeout(() => {
        setCurrentStep(progressSteps.length);
      }, 500); // Short delay to show the downloading step

      return () => clearTimeout(timer);
    }
  }, [isBackendComplete, currentStep, progressSteps.length]);

  // Reset progress when starting new generation - only reset on initial start
  useEffect(() => {
    if (isGenerating && !isBackendComplete && !isGenerationComplete) {
      setCurrentStep(0);
      setIsBackendComplete(false);
      setIsGenerationComplete(false);
    }
  }, [isGenerating]); // Removed dependencies to prevent unnecessary resets

  const handleAgentToggle = (agentId: AgentId) => {
    setSelectedAgents(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleGenerateAnother = () => {
    setGithubUrl("https://github.com/saharmor/simulatedev");
    setSelectedAgents([]);
    setIsGenerating(false);
    setCurrentStep(0);
    setIsBackendComplete(false);
    setIsGenerationComplete(false);
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
    
    // Create an AbortController for request timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 320000); // 5 minutes and 20 seconds (slightly longer than backend timeout)
    
    try {
      // Call the backend API with timeout handling
      const response = await fetch(API_ENDPOINTS.generate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          github_url: githubUrl.trim(),
          selected_agents: selectedAgents,
        }),
        signal: abortController.signal,
      });
      
      // Clear the timeout if request completes successfully
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate files');
      }

      // Mark backend as complete - this will trigger the final step
      setIsBackendComplete(true);

      // Get the content disposition header to determine filename
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'context-file.md';

      if (contentDisposition) {
        // Extract filename from Content-Disposition header
        const filenameMatch = contentDisposition.match(/filename[*]?=['"]?([^'";\r\n]+)['"]?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].trim();
        }
      }

      // Download the file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Wait a moment to show completion before resetting
      setTimeout(() => {
        toast({
          title: "Files Generated! 🎉",
          description: `Generated context files for ${selectedAgents.length} agent(s) and started download.`,
        });
        setIsGenerating(false);
        setIsGenerationComplete(true);
      }, 1500);

    } catch (error) {
      // Clear the timeout if request fails
      clearTimeout(timeoutId);
      
      console.error('Error generating files:', error);
      
      // Handle different types of errors
      let errorMessage = "An unexpected error occurred.";
      let errorTitle = "Generation Failed";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorTitle = "Request Timeout";
          errorMessage = "The request took too long to complete. This usually happens with very large repositories. Please try again or contact support.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      
      // Preserve progress for a moment to show error state, then reset after a delay
      setTimeout(() => {
        setIsGenerating(false);
        setCurrentStep(0);
        setIsBackendComplete(false);
        setIsGenerationComplete(false);
      }, 3000); // Show error for 3 seconds before resetting
    }
  };

  const showPlacementGuide = (isGenerating || isGenerationComplete) && selectedAgents.length > 0;

  return (
    <div className="min-h-screen bg-gradient-dreamy p-4">
      {/* Hero Section - Full Width */}
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

      {/* Powered by DeepWiki - Full Width */}
      <div className="text-center mb-8">
        <a 
          href="https://deepwiki.com?utm_source=sidekickcode.dev" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1 transition-transform duration-300 hover:translate-x-0.5"
        >
          <svg 
            className="size-4 transform transition-transform duration-700 group-hover:rotate-180 [&_path]:stroke-0" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="110 110 460 500"
          >
            <path 
              className="" 
              d="M418.73,332.37c9.84-5.68,22.07-5.68,31.91,0l25.49,14.71c.82.48,1.69.8,2.58,1.06.19.06.37.11.55.16.87.21,1.76.34,2.65.35.04,0,.08.02.13.02.1,0,.19-.03.29-.04.83-.02,1.64-.13,2.45-.32.14-.03.28-.05.42-.09.87-.24,1.7-.59,2.5-1.03.08-.04.17-.06.25-.1l50.97-29.43c3.65-2.11,5.9-6.01,5.9-10.22v-58.86c0-4.22-2.25-8.11-5.9-10.22l-50.97-29.43c-3.65-2.11-8.15-2.11-11.81,0l-50.97,29.43c-.08.04-.13.11-.2.16-.78.48-1.51,1.02-2.15,1.66-.1.1-.18.21-.28.31-.57.6-1.08,1.26-1.51,1.97-.07.12-.15.22-.22.34-.44.77-.77,1.6-1.03,2.47-.05.19-.1.37-.14.56-.22.89-.37,1.81-.37,2.76v29.43c0,11.36-6.11,21.95-15.95,27.63-9.84,5.68-22.06,5.68-31.91,0l-25.49-14.71c-.82-.48-1.69-.8-2.57-1.06-.19-.06-.37-.11-.56-.16-.88-.21-1.76-.34-2.65-.34-.13,0-.26.02-.4.02-.84.02-1.66.13-2.47.32-.13.03-.27.05-.4.09-.87.24-1.71.6-2.51,1.04-.08.04-.16.06-.24.1l-50.97,29.43c-3.65,2.11-5.9,6.01-5.9,10.22v58.86c0,4.22,2.25,8.11,5.9,10.22l50.97,29.43c.08.04.17.06.24.1.8.44,1.64.79,2.5,1.03.14.04.28.06.42.09.81.19,1.62.3,2.45.32.1,0,.19.04.29.04.04,0,.08-.02.13-.02.89,0,1.77-.13,2.65-.35.19-.04.37-.1.56-.16.88-.26,1.75-.59,2.58-1.06l25.49-14.71c9.84-5.68,22.06-5.68,31.91,0,9.84,5.68,15.95,16.27,15.95,27.63v29.43c0,.95.15,1.87.37,2.76.05.19.09.37.14.56.25.86.59,1.69,1.03,2.47.07.12.15.22.22.34.43.71.94,1.37,1.51,1.97.1.1.18.21.28.31.65.63,1.37,1.18,2.15,1.66.07.04.13.11.2.16l50.97,29.43c1.83,1.05,3.86,1.58,5.9,1.58s4.08-.53,5.9-1.58l50.97-29.43c3.65-2.11,5.9-6.01,5.9-10.22v-58.86c0-4.22-2.25-8.11-5.9-10.22l-50.97-29.43c-.08-.04-.16-.06-.24-.1-.8-.44-1.64-.8-2.51-1.04-.13-.04-.26-.05-.39-.09-.82-.2-1.65-.31-2.49-.33-.13,0-.25-.02-.38-.02-.89,0-1.78.13-2.66.35-.18.04-.36.1-.54.15-.88.26-1.75.59-2.58,1.07l-25.49,14.72c-9.84,5.68-22.07,5.68-31.9,0-9.84-5.68-15.95-16.27-15.95-27.63s6.11-21.95,15.95-27.63Z" 
              style={{ fill: 'rgb(33, 193, 154)' }}
            />
            <path 
              d="M141.09,317.65l50.97,29.43c1.83,1.05,3.86,1.58,5.9,1.58s4.08-.53,5.9-1.58l50.97-29.43c.08-.04.13-.11.2-.16.78-.48,1.51-1.02,2.15-1.66.1-.1.18-.21.28-.31.57-.6,1.08-1.26,1.51-1.97.07-.12.15-.22.22-.34.44-.77.77-1.6,1.03-2.47.05-.19.1-.37.14-.56.22-.89.37-1.81.37-2.76v-29.43c0-11.36,6.11-21.95,15.96-27.63s22.06-5.68,31.91,0l25.49,14.71c.82.48,1.69.8,2.57,1.06.19.06.37.11.56.16.87.21,1.76.34,2.64.35.04,0,.09.02.13.02.1,0,.19-.04.29-.04.83-.02,1.65-.13,2.45-.32.14-.03.28-.05.41-.09.87-.24,1.71-.6,2.51-1.04.08-.04.16-.06.24-.1l50.97-29.43c3.65-2.11,5.9-6.01,5.9-10.22v-58.86c0-4.22-2.25-8.11-5.9-10.22l-50.97-29.43c-3.65-2.11-8.15-2.11-11.81,0l-50.97,29.43c-.08.04-.13.11-.2.16-.78.48-1.51,1.02-2.15,1.66-.1.1-.18.21-.28.31-.57.6-1.08,1.26-1.51,1.97-.07.12-.15.22-.22.34-.44.77-.77,1.6-1.03,2.47-.05.19-.1.37-.14.56-.22.89-.37,1.81-.37,2.76v29.43c0,11.36-6.11,21.95-15.95,27.63-9.84,5.68-22.07,5.68-31.91,0l-25.49-14.71c-.82-.48-1.69-.8-2.58-1.06-.19-.06-.37-.11-.55-.16-.88-.21-1.76-.34-2.65-.35-.13,0-.26.02-.4.02-.83.02-1.66.13-2.47.32-.13.03-.27.05-.4.09-.87.24-1.71.6-2.51,1.04-.08.04-.16.06-.24.1l-50.97,29.43c-3.65,2.11-5.9,6.01-5.9,10.22v58.86c0,4.22,2.25,8.11,5.9,10.22Z" 
              style={{ fill: 'rgb(57, 105, 202)' }}
            />
            <path 
              className="" 
              d="M396.88,484.35l-50.97-29.43c-.08-.04-.17-.06-.24-.1-.8-.44-1.64-.79-2.51-1.03-.14-.04-.27-.06-.41-.09-.81-.19-1.64-.3-2.47-.32-.13,0-.26-.02-.39-.02-.89,0-1.78.13-2.66.35-.18.04-.36.1-.54.15-.88.26-1.76.59-2.58,1.07l-25.49,14.72c-9.84,5.68-22.06,5.68-31.9,0-9.84-5.68-15.96-16.27-15.96-27.63v-29.43c0-.95-.15-1.87-.37-2.76-.05-.19-.09-.37-.14-.56-.25-.86-.59-1.69-1.03-2.47-.07-.12-.15-.22-.22-.34-.43-.71-.94-1.37-1.51-1.97-.1-.1-.18-.21-.28-.31-.65-.63-1.37-1.18-2.15-1.66-.07-.04-.13-.11-.2-.16l-50.97-29.43c-3.65-2.11-8.15-2.11-11.81,0l-50.97,29.43c-3.65,2.11-5.9,6.01-5.9,10.22v58.86c0,4.22,2.25,8.11,5.9,10.22l50.97,29.43c.08.04.17.06.25.1.8.44,1.63.79,2.5,1.03.14.04.29.06.43.09.8.19,1.61.3,2.43.32.1,0,.2.04.3.04.04,0,.09-.02.13-.02.88,0,1.77-.13,2.64-.34.19-.04.37-.1.56-.16.88-.26,1.75-.59,2.57-1.06l25.49-14.71c9.84-5.68,22.06-5.68,31.91,0,9.84,5.68,15.95,16.27,15.95,27.63v29.43c0,.95.15,1.87.37,2.76.05.19.09.37.14.56.25.86.59,1.69,1.03,2.47.07.12.15.22.22.34.43.71.94,1.37,1.51,1.97.1.1.18.21.28.31.65.63,1.37,1.18,2.15,1.66.07.04.13.11.2.16l50.97,29.43c1.83,1.05,3.86,1.58,5.9,1.58s4.08-.53,5.9-1.58l50.97-29.43c3.65-2.11,5.9-6.01,5.9-10.22v-58.86c0-4.22-2.25-8.11-5.9-10.22Z" 
              style={{ fill: 'rgb(2, 148, 222)' }}
            />
          </svg>
          <span className="text-sm font-medium text-muted-foreground">Powered by DeepWiki</span>
        </a>
      </div>

      {/* Two-Pane Layout Container */}
      <div className="flex items-center justify-center">
        <div className={`w-full transition-all duration-500 ${showPlacementGuide ? 'max-w-7xl' : 'max-w-2xl'}`}>
          <div className={`flex gap-6 ${showPlacementGuide ? 'items-start lg:flex-row flex-col' : 'justify-center'}`}>
            {/* Main Card Pane */}
            <div className={`${showPlacementGuide ? 'lg:w-1/2 w-full' : 'w-full'} transition-all duration-500`}>

        {/* Main Card */}
        <Card className="bg-gradient-card backdrop-blur-sm border-0 shadow-dreamy p-8 animate-glow">
          <div className="space-y-6">
            {/* Context File Benefits */}
            <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Brain className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  <strong>Why context files help:</strong> They provide your coding agents with essential project knowledge: architecture, patterns, and dependencies, leading to more accurate, contextual code suggestions and faster problem-solving.
                </p>
              </div>
            </div>

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
                  disabled={isGenerating}
                  className="pl-10 h-12 bg-white border-gray-200 focus:border-primary focus:ring-primary/20 text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Agent Selection */}
            <div className="space-y-4">
              <label className="text-sm font-medium text-foreground">
                Select Target Agents
              </label>
              <div className="grid grid-cols-2 gap-3">
                {AGENTS.filter(agent => agent.active).map((agent) => (
                  <div
                    key={agent.id}
                    className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all duration-200 ${
                      isGenerating 
                        ? 'cursor-not-allowed opacity-50' 
                        : 'cursor-pointer hover:scale-105'
                    } ${
                      selectedAgents.includes(agent.id)
                        ? 'border-primary bg-primary/10 shadow-glow'
                        : 'border-gray-200 bg-white hover:border-primary/50'
                    }`}
                    onClick={() => !isGenerating && handleAgentToggle(agent.id)}
                  >
                    <Checkbox
                      checked={selectedAgents.includes(agent.id)}
                      onChange={() => !isGenerating && handleAgentToggle(agent.id)}
                      disabled={isGenerating}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="w-8 h-8 flex items-center justify-center">
                      <img 
                        src={agent.icon} 
                        alt={agent.name}
                        className="w-6 h-6 object-contain"
                      />
                    </div>
                    <span className="font-medium text-foreground">
                      {agent.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>



            {/* Generate Button */}
            <Button
              onClick={isGenerationComplete ? handleGenerateAnother : handleGenerate}
              disabled={isGenerating}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg shadow-dreamy hover:shadow-glow transition-all duration-300"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Context Files
                </>
              ) : isGenerationComplete ? (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Another One
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Generate & Download
                </>
              )}
            </Button>

            {/* Interactive Progress Display */}
            {isGenerating && (
              <div className="space-y-4">
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>Progress</span>
                    <span>{Math.min(currentStep, progressSteps.length)}/{progressSteps.length}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ 
                        width: `${(Math.min(currentStep, progressSteps.length) / progressSteps.length) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {progressSteps.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isActive = index === currentStep && !isBackendComplete;
                    const IconComponent = step.icon;
                    
                    return (
                      <div 
                        key={step.id} 
                        className={`flex items-center space-x-3 text-sm transition-all duration-300 ${
                          isCompleted 
                            ? 'text-primary' 
                            : isActive 
                              ? 'text-foreground' 
                              : 'text-muted-foreground opacity-50'
                        }`}
                      >
                        <div className={`flex-shrink-0 ${
                          isCompleted ? 'text-primary' : isActive ? 'text-accent' : 'text-muted-foreground'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : isActive ? (
                            <IconComponent className="w-4 h-4 animate-pulse" />
                          ) : (
                            <IconComponent className="w-4 h-4" />
                          )}
                        </div>
                        <span className={`${isActive ? 'font-medium' : ''}`}>
                          {step.label}
                        </span>
                        {isActive && (
                          <div className="flex space-x-1">
                            <div className="w-1 h-1 bg-accent rounded-full animate-bounce"></div>
                            <div className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {isBackendComplete && (
                    <div className="flex items-center space-x-3 text-sm text-green-600 font-medium">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>✨ All done! Preparing download...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
            </div>

          {/* Side Pane - Placement Guide */}
          {showPlacementGuide && (
            <div className="lg:w-1/2 w-full lg:animate-slide-in-right">
              <Card className={`h-full lg:max-h-[calc(100vh-8rem)] max-h-[500px] overflow-y-auto bg-gradient-card backdrop-blur-sm border-0 shadow-dreamy p-6 ${isGenerationComplete 
                ? 'bg-gradient-to-br from-green-50 to-blue-50 border-green-200' 
                : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'}`}>
                <div className="flex items-center space-x-2 mb-4">
                  {isGenerationComplete ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <FileText className="w-5 h-5 text-blue-600" />
                  )}
                  <h3 className={`text-lg font-semibold ${isGenerationComplete ? 'text-green-900' : 'text-blue-900'}`}>
                    What's next?
                  </h3>
                </div>
                <p className={`text-sm mb-4 ${isGenerationComplete ? 'text-green-700' : 'text-blue-700'}`}>
                  {isGenerationComplete 
                    ? "Your context files are ready! Place them in the correct locations for your selected agents:" 
                    : "Once your context files are ready, place them in the correct locations for your selected agents:"}
                </p>
                
                <div className="space-y-4">
                  {selectedAgents.map((agentId) => {
                    const agent = AGENTS.find(a => a.id === agentId);
                    if (!agent) return null;
                    
                    return (
                      <div key={agentId} className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-blue-200/50">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-8 h-8 flex items-center justify-center">
                            <img 
                              src={agent.icon} 
                              alt={agent.name}
                              className="w-6 h-6 object-contain"
                            />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{agent.placement.title}</h4>
                            <p className="text-sm text-blue-600 font-medium">{agent.fileName}</p>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-2">{agent.placement.description}</p>
                        
                        <ul className="space-y-1 mb-3">
                          {agent.placement.locations.map((location, index) => (
                            <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                              <FolderOpen className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                              <span>{location}</span>
                            </li>
                          ))}
                        </ul>
                        
                        {agent.placement.note && (
                          <div className="bg-blue-50/70 rounded p-3 border border-blue-100">
                            <p className="text-xs text-blue-800">
                              <strong>Note:</strong> {agent.placement.note}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Footer - Full Width */}
      <div className="text-center mt-8 text-sm text-muted-foreground">
        <p>
          Built by <a href="https://github.com/saharmor" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Sahar Mor</a>  
        </p>
      </div>
    </div>
  );
};

export default Index;