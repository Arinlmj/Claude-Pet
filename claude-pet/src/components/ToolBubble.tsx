import "./ToolBubble.css";

interface ToolBubbleProps {
  toolName: string | null;
  details?: string | null;
  visible: boolean;
}

const TOOL_ICON_MAP: Record<string, string> = {
  Bash: "⌨",
  Read: "📖",
  Write: "✏",
  Edit: "✏",
  Glob: "📁",
  Grep: "🔍",
  WebSearch: "🌐",
  WebFetch: "🌐",
  SearchCode: "🔍",
  GitCommit: "⬆",
  GitPush: "⬆",
  GitPull: "⬇",
  ReadMcpResource: "🔗",
  ListMcpResources: "🔗",
  AskUserQuestion: "💬",
};

export function getToolIcon(toolName: string): string {
  return TOOL_ICON_MAP[toolName] || "⚡";
}

export function getToolCategory(toolName: string): string {
  const terminalTools = ["Bash", "shell"];
  const fileTools = ["Read", "Write", "Edit", "Glob", "Grep"];
  const searchTools = ["WebSearch", "WebFetch", "SearchCode", "SearchIssues", "SearchRepos"];
  const gitTools = ["GitCommit", "GitPush", "GitPull", "GitClone", "GitFork"];
  const mcpTools = ["ReadMcpResource", "ListMcpResources", "GetMcpResource"];
  const conversationTools = ["AskUserQuestion", "GetPrompt"];

  if (terminalTools.includes(toolName)) return "terminal";
  if (fileTools.includes(toolName)) return "file";
  if (searchTools.includes(toolName)) return "search";
  if (gitTools.includes(toolName)) return "git";
  if (mcpTools.includes(toolName)) return "mcp";
  if (conversationTools.includes(toolName)) return "conversation";
  return "default";
}

function ToolBubble({ toolName, details, visible }: ToolBubbleProps) {
  if (!visible || !toolName) return null;

  const icon = getToolIcon(toolName);
  const category = getToolCategory(toolName);

  return (
    <div className={`tool-bubble ${category}`}>
      <div className="tool-icon-box">
        <span className="tool-icon">{icon}</span>
      </div>
      <div className="tool-content">
        <div className="tool-header">
          <span className="tool-name">{toolName}</span>
          {details && (
            <span className="tool-details">{details}</span>
          )}
        </div>
      </div>
      <div className="tool-status">
        <div className="tool-running-dots">
          <div className="tool-dot" />
          <div className="tool-dot" />
          <div className="tool-dot" />
        </div>
      </div>
    </div>
  );
}

export default ToolBubble;
