import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Github, Sparkles, Loader2, CheckCircle, Code, Search, Zap, Brain, Package, FileText, FolderOpen, AlertTriangle, Play, ArrowRight } from "lucide-react";
import { API_ENDPOINTS, AGENTS, REPO_URL, type AgentId } from "@/config";
import { trackClick, trackEvent } from "@/hooks/use-analytics";
import { getGAIdentifiers } from "@/hooks/use-analytics";
import CookieBanner from "@/components/CookieBanner";

interface ProgressStep {
  id: string;
  label: string;
  icon: React.ElementType;
  minDelay: number;
  maxDelay: number;
  status: 'pending' | 'active' | 'completed';
}

interface RepositoryError {
  type: string;
  message: string;
  deepwikiUrl?: string;
  repoType?: 'private' | 'not_indexed';
}

const Index = () => {
  const [githubUrl, setGithubUrl] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<AgentId[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isBackendComplete, setIsBackendComplete] = useState(false);
  const [isGenerationComplete, setIsGenerationComplete] = useState(false);
  const [viewSearchUrl, setViewSearchUrl] = useState<string | null>(null);
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);
  const [repositoryError, setRepositoryError] = useState<RepositoryError | null>(null);
  const { toast } = useToast();

  const XIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2H21l-7.854 9.057L22 22h-6.172l-5.289-6.38L4.463 22H2l8.315-9.468L2 2h6.172l4.853 6.16L18.244 2z" />
    </svg>
  );

  // Helper function to extract username and repo from GitHub URL
  const extractGithubInfo = (url: string) => {
    try {
      const match = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
      if (match) {
        return { username: match[1], repo: match[2] };
      }
    } catch (error) {
      console.error('Error parsing GitHub URL:', error);
    }
  };

  const progressSteps: ProgressStep[] = [
    { id: 'initialize', label: 'Initializing DeepWiki connection', icon: Zap, minDelay: 6000, maxDelay: 10000, status: 'pending' },
    { id: 'prompt', label: 'Investigating repositroy', icon: Search, minDelay: 14000, maxDelay: 18000, status: 'pending' },
    { id: 'generate', label: 'Generating markdown context', icon: Code, minDelay: 7000, maxDelay: 10000, status: 'pending' },
    { id: 'prepare', label: 'Downloading context files', icon: Package, minDelay: 3000, maxDelay: 5000, status: 'pending' },
  ];

  // Function to check if backend is available
  const checkBackendHealth = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health check
      
      const response = await fetch(API_ENDPOINTS.health, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  };

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

  // Check backend health on component mount
  useEffect(() => {
    const performHealthCheck = async () => {
      const isHealthy = await checkBackendHealth();
      setIsBackendHealthy(isHealthy);
      
      if (!isHealthy) {
        toast({
          title: "Backend Service Unavailable",
          description: "The backend service is currently not responding. Please try again in a few moments.",
          variant: "destructive",
        });
      }
    };
    
    performHealthCheck();
  }, []);

  // Comprehensive state reset function
  const resetComponentState = () => {
    setIsGenerating(false);
    setCurrentStep(0);
    setIsBackendComplete(false);
    setIsGenerationComplete(false);
    setViewSearchUrl(null);
    setRepositoryError(null);
    // Note: We intentionally preserve githubUrl and selectedAgents so users don't lose their form data
  };

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

  const handleTryDemo = async () => {
    trackClick('try_demo');
    // Reset any previous state
    resetComponentState();
    
    // Demo repositories to choose from
    const demoRepos = [
      {
        url: "https://github.com/browser-use/browser-use",
        name: "browser-use"
      },
      {
        url: "https://github.com/browserbase/stagehand", 
        name: "stagehand"
      },
      {
        url: "https://github.com/openai/openai-agents-python",
        name: "openai-agents-python"
      }
    ];
    
    // Randomly select a demo repository
    const selectedRepo = demoRepos[Math.floor(Math.random() * demoRepos.length)];
    
    // Set demo repository and agents
    setGithubUrl(selectedRepo.url);
    setSelectedAgents(["claude", "cursor"]);
    
    // Show demo started message
    toast({
      title: "Demo started! 🚀",
      description: `Generating context files for ${selectedRepo.name} with Claude + Cursor`,
    });
    
    // Automatically trigger generation
    setIsGenerating(true);
    setRepositoryError(null);
    
    // Create an AbortController for request timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 320000); // 5 minutes and 20 seconds (slightly longer than backend timeout)
    
    try {
      // Call the backend API with timeout handling
      const { clientId, sessionId } = await getGAIdentifiers();
      const response = await fetch(API_ENDPOINTS.generate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
          ...(clientId ? { 'X-Client-Id': clientId } : {}),
        },
        body: JSON.stringify({
          github_url: selectedRepo.url,
          selected_agents: ["claude", "cursor"],
        }),
        signal: abortController.signal,
      });
      
      // Clear the timeout if request completes successfully
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        
        // Check if this is a structured repository error
        if (errorData.error_type === 'repository_not_found') {
          // Handle repository-specific errors - show persistent error
          setRepositoryError({
            type: errorData.error_type,
            message: errorData.error,
            deepwikiUrl: errorData.deepwiki_url,
            repoType: errorData.repo_type
          });

          // Track repository error type
          if (errorData.repo_type === 'private' || errorData.repo_type === 'not_indexed') {
            trackEvent('repository_error', { repo_type: errorData.repo_type, source: 'try_demo' });
          }
          
          // Reset generation state but keep the error visible
          setIsGenerating(false);
          setCurrentStep(0);
          setIsBackendComplete(false);
          setIsGenerationComplete(false);
          setViewSearchUrl(null);
          
          return; // Don't continue processing or throw generic error
        }
        
        throw new Error(errorData.error || 'Failed to generate files');
      }

      // Mark backend as complete - this will trigger the final step
      setIsBackendComplete(true);

      // Parse the JSON response
      const data = await response.json();
      
      // Store the view search URL for follow-up questions
      setViewSearchUrl(data.view_search_url);

      // Handle file download based on response type
      if (data.is_zip) {
        // Handle ZIP file
        const zipBytes = Uint8Array.from(atob(data.file_content), c => c.charCodeAt(0));
        const blob = new Blob([zipBytes], { type: 'application/zip' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        // Handle single markdown file
        const blob = new Blob([data.file_content], { type: 'text/markdown' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }

      // Wait a moment to show completion before resetting
      setTimeout(() => {
        toast({
          title: "Demo Complete! 🎉",
          description: `Generated context files for ${selectedRepo.name} and started download.`,
        });
        setIsGenerating(false);
        setIsGenerationComplete(true);
      }, 1500);

    } catch (error) {
      // Clear the timeout if request fails
      clearTimeout(timeoutId);
      
      console.error('Error generating files:', error);
      
      // Handle backend/connection errors with toast notifications
      let errorMessage = "An unexpected error occurred.";
      let errorTitle = "Demo Failed";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorTitle = "Request Timeout";
          errorMessage = "The demo request took too long to complete. Please try again or contact support.";
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('ERR_CONNECTION_REFUSED')) {
          // Backend is likely down or unreachable
          errorTitle = "Backend Service Unavailable";
          errorMessage = "Unable to connect to the backend service for the demo. The server may be down or experiencing issues.";
          
          // Check backend health to provide more specific guidance
          const isHealthy = await checkBackendHealth();
          if (!isHealthy) {
            errorMessage = "The backend service is currently unavailable for the demo. Please check if the server is running or contact support if the issue persists.";
          }
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      
      // Reset component state immediately on backend error so users can start fresh
      resetComponentState();
    }
  };

  const handleGenerateAnother = () => {
    // Reset all component state
    resetComponentState();
    // Also reset form fields since this is an intentional "start over" action
    setGithubUrl("");
    setSelectedAgents([]);
  };

  const handleShareOnX = () => {
    try {
      const agentNames = selectedAgents
        .map(id => AGENTS.find(a => a.id === id)?.name ?? "")
        .filter((name) => name.length > 0);
      if (agentNames.length === 0) return;

      const text = `Just onboarded my coding agents (${agentNames.join(", ")}) by generating their markdown files sidekickdev.com`;
      const intentUrl = `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
      trackClick('share_on_x', { agents_count: agentNames.length });
      window.open(intentUrl, '_blank', 'noopener');
    } catch (e) {
      console.error('Failed to open X share intent', e);
    }
  };

  const handleGenerate = async () => {
    trackClick('generate_and_download', {
      selected_agents_count: selectedAgents.length,
      has_github_url: Boolean(githubUrl.trim())
    });
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
    setRepositoryError(null); // Clear any previous repository errors
    
    // Create an AbortController for request timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 320000); // 5 minutes and 20 seconds (slightly longer than backend timeout)
    
    try {
      // Call the backend API with timeout handling
      const { clientId, sessionId } = await getGAIdentifiers();
      const response = await fetch(API_ENDPOINTS.generate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
          ...(clientId ? { 'X-Client-Id': clientId } : {}),
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
        
        // Check if this is a structured repository error
        if (errorData.error_type === 'repository_not_found') {
          // Handle repository-specific errors - show persistent error
          setRepositoryError({
            type: errorData.error_type,
            message: errorData.error,
            deepwikiUrl: errorData.deepwiki_url,
            repoType: errorData.repo_type
          });

          // Track repository error type
          if (errorData.repo_type === 'private' || errorData.repo_type === 'not_indexed') {
            trackEvent('repository_error', { repo_type: errorData.repo_type, source: 'generate' });
          }
          
          // Reset generation state but keep the error visible
          setIsGenerating(false);
          setCurrentStep(0);
          setIsBackendComplete(false);
          setIsGenerationComplete(false);
          setViewSearchUrl(null);
          
          return; // Don't continue processing or throw generic error
        }
        
        throw new Error(errorData.error || 'Failed to generate files');
      }

      // Mark backend as complete - this will trigger the final step
      setIsBackendComplete(true);

      // Parse the JSON response
      const data = await response.json();
      
      // Store the view search URL for follow-up questions
      setViewSearchUrl(data.view_search_url);

      // Handle file download based on response type
      if (data.is_zip) {
        // Handle ZIP file
        const zipBytes = Uint8Array.from(atob(data.file_content), c => c.charCodeAt(0));
        const blob = new Blob([zipBytes], { type: 'application/zip' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        // Handle single markdown file
        const blob = new Blob([data.file_content], { type: 'text/markdown' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }

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
      
      // Handle backend/connection errors with toast notifications
      let errorMessage = "An unexpected error occurred.";
      let errorTitle = "Generation Failed";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorTitle = "Request Timeout";
          errorMessage = "The request took too long to complete. This usually happens with very large repositories. Please try again or contact support.";
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('ERR_CONNECTION_REFUSED')) {
          // Backend is likely down or unreachable
          errorTitle = "Backend Service Unavailable";
          errorMessage = "Unable to connect to the backend service. The server may be down or experiencing issues. Please try again in a few moments.";
          
          // Check backend health to provide more specific guidance
          const isHealthy = await checkBackendHealth();
          if (!isHealthy) {
            errorMessage = "The backend service is currently unavailable. Please check if the server is running or contact support if the issue persists.";
          }
        } else {
          errorMessage = error.message;
        }
      }
      
      // Handle fetch errors that might indicate backend is down
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorTitle = "Connection Error";
        errorMessage = "Could not connect to the backend service. Please ensure the server is running and try again.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      
      // Reset component state immediately on backend error so users can start fresh
      resetComponentState();
    }
  };

  const showPlacementGuide = (isGenerating || isGenerationComplete) && selectedAgents.length > 0;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-dreamy flex flex-col items-center justify-center px-5 py-8 md:px-6 lg:px-8">
      <CookieBanner />
      {/* Main Content Container - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-6xl">
        {/* Hero Section */}
          <div className="text-center mb-4 mt-4 animate-float">
            <div className="flex justify-center mb-3">
              <div className="relative inline-block pl-10 sm:pl-12 md:pl-16">
                <h1 className="hero-title whitespace-nowrap font-bold font-press-start bg-clip-text text-transparent pixel-glow-compact word-tight gradient-hero-warmer hero-text-shadow">
                  Sidekick Dev
                </h1>
                <Sparkles aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 text-primary" />
              </div>
            </div>
            <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Automatically generate high-quality markdown context files for your coding agents to enhance their performance.
            </p>
          </div>

        {/* Powered by DeepWiki */}
        <div className="text-center mb-10">
          <a 
                          href="https://deepwiki.com?utm_source=sidekickdev.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1 transition-transform duration-300 hover:translate-x-0.5"
            onClick={() => trackClick('powered_by_deepwiki')}
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
        <div className={`w-full transition-all duration-500 ${showPlacementGuide ? 'max-w-6xl' : 'max-w-xl'}`}>
          <div className={`flex gap-4 ${showPlacementGuide ? 'items-start lg:flex-row flex-col' : 'justify-center'}`}>
            {/* Main Card Pane */}
            <div className={`${showPlacementGuide ? 'lg:w-1/2 w-full' : 'w-full'} transition-all duration-500`}>
              {/* Main Card */}
              <Card className="flex flex-col bg-gradient-card backdrop-blur-sm border-0 shadow-dreamy p-6 animate-glow">
                <div className="space-y-5">
                  {/* Context File Benefits */}
                  <div className="bg-gray-50/50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <Brain className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700">
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
                      <Github className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="url"
                        placeholder="https://github.com/username/repository"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        disabled={isGenerating}
                        className="pl-9 h-10 bg-white border-gray-200 focus:border-primary focus:ring-primary/20 text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Agent Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">
                      Select Target Agents
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {AGENTS.filter(agent => agent.active).map((agent) => (
                        <div
                          key={agent.id}
                          className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-all duration-200 ${
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
                          <div className="w-6 h-6 flex items-center justify-center">
                            <img 
                              src={agent.icon} 
                              alt={agent.name}
                              className="w-5 h-5 object-contain"
                            />
                          </div>
                          <span className="font-medium text-foreground text-sm">
                            {agent.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Generate Button */}
                  <div className="flex gap-3 flex-wrap justify-center sm:justify-start">
                    <Button
                      onClick={isGenerationComplete ? handleGenerateAnother : handleGenerate}
                      disabled={isGenerating}
                      className="flex-1 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-dreamy hover:shadow-glow transition-all duration-300"
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
                    <Button
                      onClick={handleTryDemo}
                      disabled={isGenerating}
                      variant="outline"
                      className="h-10 px-4 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Try Demo
                    </Button>
                  </div>

                  {/* Repository Error Display - Persistent and prominent */}
                  {repositoryError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <h3 className="text-sm font-semibold text-red-800">
                            {repositoryError.repoType === 'private' ? 'Private Repository Access Required' : 
                             repositoryError.repoType === 'not_indexed' ? 'Repository Not Indexed' : 
                             'Repository Error'}
                          </h3>
                          <p className="text-sm text-red-700">
                            {repositoryError.message !== "This repository requires a DeepWiki account to access." && repositoryError.message}
                          </p>
                          {repositoryError.deepwikiUrl && (
                            <div className="mt-3 space-y-2">
                              {repositoryError.repoType === 'private' && (
                                <div className="text-sm text-red-700">
                                  <p className="font-medium mb-2">Private repositories are not supported yet. Want this feature? Ping me on <a href="https://x.com/theaievangelist" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-red-800">X (@theaievangelist)</a> and I'll prioritize it!</p>
                                </div>
                              )}
                              {repositoryError.repoType === 'not_indexed' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                  className="mt-2 text-red-700 border-red-300 hover:bg-red-100"
                                >
                                  <a href={repositoryError.deepwikiUrl} target="_blank" rel="noopener noreferrer">
                                    Open DeepWiki Page
                                  </a>
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

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
                                  <div className="w-1.5 h-1.5 bg-accent rounded-full animate-fade-in-gentle"></div>
                                  <div className="w-1.5 h-1.5 bg-accent rounded-full animate-fade-in-gentle" style={{ animationDelay: '0.3s' }}></div>
                                  <div className="w-1.5 h-1.5 bg-accent rounded-full animate-fade-in-gentle" style={{ animationDelay: '0.6s' }}></div>
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
                  ? 'bg-gradient-to-br from-green-50 to-gray-50 border-green-200'
                : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {isGenerationComplete ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <FileText className="w-5 h-5 text-gray-600" />
                      )}
                      <h3 className={`text-lg font-semibold ${isGenerationComplete ? 'text-green-900' : 'text-gray-900'}`}>
                        What's Next?
                      </h3>
                    </div>
                    {isGenerationComplete && (
                      <Button
                        onClick={handleShareOnX}
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                        title="Share on X"
                      >
                        <XIcon className="w-3.5 h-3.5 mr-1" />
                        Share on X
                      </Button>
                    )}
                  </div>

                  <p className={`text-sm mb-4 ${isGenerationComplete ? 'text-green-700' : 'text-gray-700'}`}>
                    {isGenerationComplete 
                      ? "Context files downloaded! Place them in the correct locations (see below):" 
                      : "Once your context files are ready, place them in the correct locations for your selected agents:"}
                  </p>

                  {/* Warning about context file review */}
                  {isGenerationComplete && (
                    <div className="bg-yellow-50/80 backdrop-blur-sm rounded-lg p-4 border border-yellow-200/50 mb-4">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-medium text-yellow-900 mb-1">Important</h4>
                          <p className="text-sm text-yellow-800">
                            Review this context file to ensure it matches your preferences. Five minutes now saves hours later!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DeepWiki Follow-up Questions Link */}
                  {isGenerationComplete && (() => {
                    const { username, repo } = extractGithubInfo(githubUrl);
                    return (
                      <div className="bg-blue-50/80 backdrop-blur-sm rounded-lg p-4 border border-blue-200/50 mb-4">
                        <div className="flex items-start space-x-3">
                          <Search className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-medium text-blue-900 mb-1">Have Follow-up Questions?</h4>
                            <p className="text-sm text-blue-700 mb-3">
                              Ask specific questions about the codebase, architecture, or implementation details on{' '}
                              <a
                                href={`https://deepwiki.com/${username}/${repo}?utm_source=sidekickdev.com`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors"
                                onClick={() => trackClick('deepwiki_follow_up', { username, repo })}
                              >
                                DeepWiki{' '}
                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  <div className="space-y-4">
                    {selectedAgents.map((agentId) => {
                      const agent = AGENTS.find(a => a.id === agentId);
                      if (!agent) return null;
                      
                      return (
                        <div key={agentId} className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-200/50">
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
                              <p className="text-sm text-gray-600 font-medium">{agent.fileName}</p>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-700 mb-2">{agent.placement.description}</p>
                          
                          <ul className="space-y-1 mb-3">
                            {agent.placement.locations.map((location, index) => (
                              <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                                <FolderOpen className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                <span>{location}</span>
                              </li>
                            ))}
                          </ul>
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

      {/* Footer - Always at bottom */}
      <div className="w-full mt-10">
        <div className="max-w-xl mx-auto">
          <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-3 sm:space-y-0">
              <p className="text-sm text-foreground whitespace-nowrap">
                <strong>Sign up for updates</strong> to be a productive dev with AI
              </p>
              <form
                className="flex-1 flex items-center space-x-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget as HTMLFormElement;
                  const input = form.elements.namedItem('email') as HTMLInputElement | null;
                  const email = input?.value.trim() || '';
                  if (!email) {
                    toast({ title: 'Email required', description: 'Please enter a valid email.', variant: 'destructive' });
                    return;
                  }
                  try {
                    const res = await fetch(API_ENDPOINTS.emailSignup, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email }),
                    });
                    if (!res.ok) {
                      throw new Error('Failed to sign up');
                    }
                    toast({ title: "You're in!", description: 'We will keep you posted.' });
                    if (input) input.value = '';
                  } catch (err) {
                    toast({ title: 'Something went wrong', description: 'Please try again later.', variant: 'destructive' });
                  }
                }}
              >
                <Input
                  type="email"
                  name="email"
                  placeholder="you@company.com"
                  className="bg-white border-gray-200 focus:border-primary focus:ring-primary/20"
                />
                <Button type="submit" className="h-9">Sign up</Button>
              </form>
            </div>
          </div>
          <div className="text-center mt-4 text-sm text-muted-foreground">
            <div className="flex items-center justify-center space-x-4">
              <div>
                Ideas? <a href="https://x.com/theaievangelist" className="text-primary" target="_blank" rel="noopener noreferrer">Reach out!</a>
              </div>
              <span className="text-muted-foreground">|</span>
              <a href={REPO_URL} className="flex items-center space-x-2 text-primary" target="_blank" rel="noopener noreferrer">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>Clone me</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;