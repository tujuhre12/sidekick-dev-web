/**
 * Configuration constants for the Sidekick Dev frontend
 */

// API base URL - defaults to local development, can be overridden with environment variable
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Repository URL - centralized location for all references
export const REPO_URL = "https://github.com/saharmor/sidekick-dev-web";

// Google Analytics configuration
export const GOOGLE_ANALYTICS_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';

// API endpoints
export const API_ENDPOINTS = {
  generate: `${API_BASE_URL}/api/generate`,
  health: `${API_BASE_URL}/health`,
} as const;

// Agent configuration
export const AGENTS = [
  { 
    id: "claude", 
    name: "Claude Code", 
    icon: "/product-logos/claude.png", 
    color: "text-purple-600",
    fileName: "claude.md",
    active: true,
    placement: {
      title: "Claude Code",
      description: "Place claude.md in one of the following locations:",
      locations: [
        "The root of your repository (recommended)",
        "Any parent or child directory of where you invoke Claude",
        "Your home directory at ~/.claude/claude.md for global use"
      ],
    }
  },
  { 
    id: "cursor", 
    name: "Cursor", 
    icon: "/product-logos/cursor.png", 
    color: "text-blue-600",
    fileName: "cursor.md or .cursorrules.md",
    active: true,
    placement: {
      title: "Cursor",
      description: "Place cursor.md or .cursorrules.md in:",
      locations: [
        "The root of your repository"
      ],
    }
  },
  { 
    id: "windsurf", 
    name: "Windsurf", 
    icon: "/product-logos/windsurf.png", 
    color: "text-teal-600",
    fileName: "windsurf.md",
    active: true,
    placement: {
      title: "Windsurf",
      description: "Place this file in:",
      locations: [
        "The root of your project"
      ],
    }
  },
  { 
    id: "gemini", 
    name: "Gemini", 
    icon: "/product-logos/gemini.png", 
    color: "text-orange-600",
    fileName: "gemini.md",
    active: true,
    placement: {
      title: "Gemini CLI",
      description: "Place gemini.md in:",
      locations: [
        "The root of your repository",
        "Any parent directory (up to your home directory or git root)",
        "Any subdirectory where the file is relevant"
      ],
    }
  },
  { 
    id: "cline", 
    name: "Cline", 
    icon: "/product-logos/cline.png", 
    color: "text-green-600",
    fileName: "cline.md",
    active: true,
    placement: {
      title: "Cline",
      description: "Place cline.md in:",
      locations: [
        "The root of your repository",
        "Any directory accessible by Cline"
      ],
    }
  },
  { 
    id: "bolt", 
    name: "Bolt", 
    icon: "/product-logos/bolt.png", 
    color: "text-orange-600",
    fileName: "bolt.md",
    active: false,
    placement: {
      title: "Bolt",
      description: "Place bolt.md in:",
      locations: [
        "The root of your repository",
        "Pin the file manually in Bolt's interface for immediate context loading"
      ],
    }
  },
  { 
    id: "vscode", 
    name: "VS Code Copilot", 
    icon: "/product-logos/vscode.png", 
    color: "text-blue-500",
    fileName: "vscode.md",
    active: false,
    placement: {
      title: "VS Code with Copilot",
      description: "Place vscode.md in:",
      locations: [
        "The root of your workspace",
        "Reference the file in VS Code settings or workspace configuration"
      ],
    }
  },
  { 
    id: "intellij", 
    name: "IntelliJ IDEA", 
    icon: "/product-logos/intellij.png", 
    color: "text-red-600",
    fileName: "intellij.md",
    active: false,
    placement: {
      title: "IntelliJ IDEA",
      description: "Place intellij.md in:",
      locations: [
        "The root of your project",
        "In your project's documentation folder",
        "Reference in IntelliJ's AI assistant settings"
      ],
    }
  },
  { 
    id: "lovable", 
    name: "Lovable", 
    icon: "/product-logos/lovable.png", 
    color: "text-pink-600",
    fileName: "lovable.md",
    active: false,
    placement: {
      title: "Lovable",
      description: "Place lovable.md in:",
      locations: [
        "The root of your project",
        "Pin directly in the Lovable interface for immediate context"
      ],
    }
  },
] as const;

export type AgentId = typeof AGENTS[number]['id'];