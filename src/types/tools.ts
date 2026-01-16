// Tool definitions for FunctionGemma
// These represent 3 distinctive UI actions

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

export interface ToolCall {
  name: string;
  parameters: Record<string, string>;
}

// Tool 1: Change Theme (toggle light/dark mode)
export const changeThemeTool: Tool = {
  name: "change_theme",
  description: "Changes the app theme to light or dark mode",
  parameters: {
    type: "object",
    properties: {
      theme: {
        type: "string",
        description: "The theme to switch to",
        enum: ["light", "dark", "toggle"],
      },
    },
    required: ["theme"],
  },
};

// Tool 2: Show Notification (display an alert/toast)
export const showNotificationTool: Tool = {
  name: "show_notification",
  description: "Shows a notification or alert message to the user",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "The notification title",
      },
      message: {
        type: "string",
        description: "The notification message body",
      },
      type: {
        type: "string",
        description: "The type of notification",
        enum: ["info", "success", "warning", "error"],
      },
    },
    required: ["message"],
  },
};

// Tool 3: Navigate to Screen
export const navigateToScreenTool: Tool = {
  name: "navigate_to_screen",
  description: "Navigates to a different screen or section of the app",
  parameters: {
    type: "object",
    properties: {
      screen: {
        type: "string",
        description: "The screen to navigate to",
        enum: ["home", "settings", "profile", "about"],
      },
    },
    required: ["screen"],
  },
};

// All available tools
export const availableTools: Tool[] = [
  changeThemeTool,
  showNotificationTool,
  navigateToScreenTool,
];

// Format tools for the LLM system prompt
export function formatToolsForPrompt(tools: Tool[]): string {
  return tools
    .map((tool) => {
      const params = Object.entries(tool.parameters.properties)
        .map(([name, prop]) => {
          let paramStr = `    - ${name} (${prop.type}): ${prop.description}`;
          if (prop.enum) {
            paramStr += ` [options: ${prop.enum.join(", ")}]`;
          }
          return paramStr;
        })
        .join("\n");
      
      return `- ${tool.name}: ${tool.description}\n  Parameters:\n${params}`;
    })
    .join("\n\n");
}
