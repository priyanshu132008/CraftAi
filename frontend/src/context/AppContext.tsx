import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import { INITIAL_PROJECTS, ProjectItem } from './defaultData';
import {
  fetchProjects,
  generateProjectApi,
  GENERATION_EVENTS_URL,
  NotAuthenticatedError,
  PlanResponse,
  GeneratedFile,
  ProjectListItem,
  TraceStep,
  DesignDirection,
  GenerationMode,
  CustomConnectorPayload,
  McpServerPayload
} from '../services/api';
import { supabase } from '../lib/supabaseClient';

export type ScreenType =
  | 'landing'
  | 'features'
  | 'about'
  | 'login'
  | 'signup'
  | 'dashboard'
  | 'search'
  | 'connectors'
  | 'projects'
  | 'generate-plan'
  | 'workspace'
  | 'ai-assistant';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  /** Bullet changes applied (kept from the original MVP). */
  changes?: string[];
  /** Render the text as Markdown (chat/plan replies). */
  markdown?: boolean;
  /** Created files — rendered as clickable links that open Monaco. */
  files?: GeneratedFile[];
  /** Clickable follow-up edit prompts. */
  suggestions?: string[];
  /** Interactive design-direction decision cards (Plan mode). */
  decisions?: DesignDirection[];
}

export interface AttachedContext {
  name: string;
  content: string;
}

/** A user-defined REST API connector (form shape; converted to the payload
 * shape with a single headers entry when sent to /generate-project). */
export interface CustomConnector {
  name: string;
  baseUrl: string;
  headerKey: string;
  headerValue: string;
  openApiSchema?: string;
}

/** An MCP server the generated app can call via JSON-RPC. */
export interface McpServer {
  name: string;
  serverUrl: string;
  authToken: string;
}

/** Ask the workspace editor to open a generated file (Monaco). */
export interface OpenFileRequest {
  path: string;
  nonce: number;
}

interface UserInfo {
  name: string;
  email: string;
  avatar: string;
}

interface GenerateOptions {
  mode?: GenerationMode;
  designStyle?: string | null;
}

interface AppContextType {
  currentScreen: ScreenType;
  setCurrentScreen: (screen: ScreenType) => void;
  isDeployModalOpen: boolean;
  setIsDeployModalOpen: (open: boolean) => void;
  user: UserInfo | null;
  setUser: (user: UserInfo | null) => void;
  logout: () => void;

  prompt: string;
  setPrompt: (prompt: string) => void;
  /** Console mode: build (full pipeline) | chat | plan. */
  promptMode: GenerationMode;
  setPromptMode: (mode: GenerationMode) => void;
  /** Visual design direction picked in the console ("Select Design Style"). */
  designStyle: string | null;
  setDesignStyle: (style: string | null) => void;
  /** Context file attached via the "+" menu. */
  attachedContext: AttachedContext | null;
  setAttachedContext: (ctx: AttachedContext | null) => void;

  currentPlan: PlanResponse | null;
  isGenerating: boolean;
  isGenerated: boolean;
  generatedCode: string;
  generatedFiles: GeneratedFile[];
  selectedFile: GeneratedFile | null;
  setSelectedFile: React.Dispatch<React.SetStateAction<GeneratedFile | null>>;
  statusMessage: string | null;
  previewVersion: number;
  /** Live agent thought-stream steps for the execution trace card. */
  agentTrace: TraceStep[];

  /** Connector services selected for the next generation. */
  selectedConnectors: string[];
  toggleConnector: (id: string) => void;
  /** API key/token per standard connector id (persisted to localStorage). */
  connectorKeys: Record<string, string>;
  setConnectorKey: (id: string, key: string) => void;

  /** User-defined REST API connectors (persisted to localStorage). */
  customConnectors: CustomConnector[];
  addCustomConnector: (cc: CustomConnector) => void;
  removeCustomConnector: (name: string) => void;
  /** MCP servers connected for the agent (persisted to localStorage). */
  mcpServers: McpServer[];
  addMcpServer: (srv: McpServer) => void;
  removeMcpServer: (name: string) => void;

  /** Agent tool permission per connector + global default rule (vault). */
  connectorPermissions: Record<string, PermissionMode>;
  setConnectorPermission: (id: string, mode: PermissionMode) => void;
  defaultPermission: PermissionMode;
  setDefaultPermission: (mode: PermissionMode) => void;
  permissionFor: (id: string) => PermissionMode;

  /** Open a generated file in the workspace Monaco editor. */
  openFileRequest: OpenFileRequest | null;
  requestOpenFile: (path: string) => void;

  projects: ProjectItem[];
  currentProject: ProjectItem | null;
  setCurrentProject: (proj: ProjectItem) => void;

  /** Real, server-fetched recents (sorted newest-first). */
  recents: ProjectListItem[];
  refreshRecents: () => Promise<void>;

  chatMessages: ChatMessage[];
  sendChatMessage: (msg: string) => void;

  handleGeneratePlan: (promptText: string, options?: GenerateOptions) => Promise<void>;
  /** Build the last plan with the chosen design direction. */
  selectDesignDirection: (direction: DesignDirection) => Promise<void>;
}

const DEFAULT_PLAN: PlanResponse = {
  type: 'Portfolio Website',
  sections: ['Hero Section', 'About Section', 'Projects Section', 'Contact Section'],
  techStack: ['Next.js', 'TailwindCSS', 'React'],
  features: [
    'Responsive Design',
    'Smooth Animations',
    'Contact Form',
    'Dark/Light Mode',
    'Modern UI/UX'
  ]
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const timestamp = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** localStorage persistence for connector configs — one global vault so
 * settings persist across page reloads, project switches and sessions.
 * Falls back to the older keys from pre-vault sessions. */
const LS_GLOBAL = 'craftai_connector_vault';

/** Agent tool permission per connector (and the global default rule). */
export type PermissionMode = 'ask' | 'always' | 'never';

interface GlobalConnectorStore {
  enabledConnectors: string[];
  connectorApiKeys: Record<string, string>;
  customConnectors: CustomConnector[];
  mcpServers: McpServer[];
  permissions: Record<string, PermissionMode>;
  defaultPermission: PermissionMode;
}

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const EMPTY_STORE: GlobalConnectorStore = {
  enabledConnectors: [],
  connectorApiKeys: {},
  customConnectors: [],
  mcpServers: [],
  permissions: {},
  defaultPermission: 'ask'
};

function loadConnectorStore(): GlobalConnectorStore {
  const base: GlobalConnectorStore = { ...EMPTY_STORE };
  try {
    const raw =
      localStorage.getItem(LS_GLOBAL) ?? localStorage.getItem('craftai_global_connectors');
    if (raw) return { ...base, ...(JSON.parse(raw) as GlobalConnectorStore) };
  } catch {
    /* corrupted store — fall through to legacy keys */
  }
  return {
    ...base,
    connectorApiKeys: loadStored('craftai_connector_keys', base.connectorApiKeys),
    customConnectors: loadStored('craftai_custom_connectors', base.customConnectors),
    mcpServers: loadStored('craftai_mcp_servers', base.mcpServers)
  };
}

const INITIAL_STORE = loadConnectorStore();

function saveConnectorStore(store: GlobalConnectorStore) {
  try {
    localStorage.setItem(LS_GLOBAL, JSON.stringify(store));
  } catch {
    /* storage unavailable — session-only state */
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('landing');
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);

  const [prompt, setPrompt] = useState(
    'Build me a modern portfolio website for a frontend developer with smooth animations and a contact form'
  );
  const [promptMode, setPromptMode] = useState<GenerationMode>('build');
  const [designStyle, setDesignStyle] = useState<string | null>(null);
  const [attachedContext, setAttachedContext] = useState<AttachedContext | null>(null);

  const [currentPlan, setCurrentPlan] = useState<PlanResponse | null>(DEFAULT_PLAN);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [agentTrace, setAgentTrace] = useState<TraceStep[]>([]);
  const [selectedConnectors, setSelectedConnectors] = useState<string[]>(
    INITIAL_STORE.enabledConnectors
  );
  const [connectorKeys, setConnectorKeys] = useState<Record<string, string>>(
    INITIAL_STORE.connectorApiKeys
  );
  const [customConnectors, setCustomConnectors] = useState<CustomConnector[]>(
    INITIAL_STORE.customConnectors
  );
  const [mcpServers, setMcpServers] = useState<McpServer[]>(
    INITIAL_STORE.mcpServers
  );
  const [connectorPermissions, setConnectorPermissions] = useState<
    Record<string, PermissionMode>
  >(INITIAL_STORE.permissions);
  const [defaultPermission, setDefaultPermission] = useState<PermissionMode>(
    INITIAL_STORE.defaultPermission
  );
  const [openFileRequest, setOpenFileRequest] = useState<OpenFileRequest | null>(null);

  const [projects] = useState<ProjectItem[]>(INITIAL_PROJECTS);
  const [currentProject, setCurrentProject] = useState<ProjectItem | null>(null);
  const [recents, setRecents] = useState<ProjectListItem[]>([]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  /** Prompt that produced the last plan — reused when a design direction is picked. */
  const lastPlanPromptRef = useRef<string>('');
  const traceStreamRef = useRef<EventSource | null>(null);

  // ---- Supabase session bootstrap ----
  useEffect(() => {
    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      const su = data.session?.user;
      if (su) {
        const email = su.email ?? 'user@craftai.com';
        setUser({
          name: (su.user_metadata?.full_name as string) || email.split('@')[0],
          email,
          avatar: email.slice(0, 2).toUpperCase()
        });
      } else {
        setUser(null);
      }
    };
    syncSession();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      syncSession();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentScreen('landing');
  };

  const appendMessage = (msg: ChatMessage) => {
    setChatMessages(prev => [...prev, msg]);
  };

  const toggleConnector = (id: string) => {
    setSelectedConnectors(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const setConnectorKey = (id: string, key: string) => {
    setConnectorKeys(prev => {
      const next = key ? { ...prev, [id]: key } : { ...prev };
      if (!key) delete next[id];
      return next;
    });
  };

  const addCustomConnector = (cc: CustomConnector) => {
    setCustomConnectors(prev => [...prev.filter(c => c.name !== cc.name), cc]);
  };
  const removeCustomConnector = (name: string) => {
    setCustomConnectors(prev => prev.filter(c => c.name !== name));
  };
  const addMcpServer = (srv: McpServer) => {
    setMcpServers(prev => [...prev.filter(s => s.name !== srv.name), srv]);
  };
  const removeMcpServer = (name: string) => {
    setMcpServers(prev => prev.filter(s => s.name !== name));
  };
  const setConnectorPermission = (id: string, mode: PermissionMode) => {
    setConnectorPermissions(prev => ({ ...prev, [id]: mode }));
  };

  // Persist the whole connector vault globally (across sessions/projects).
  useEffect(() => {
    saveConnectorStore({
      enabledConnectors: selectedConnectors,
      connectorApiKeys: connectorKeys,
      customConnectors,
      mcpServers,
      permissions: connectorPermissions,
      defaultPermission
    });
  }, [selectedConnectors, connectorKeys, customConnectors, mcpServers, connectorPermissions, defaultPermission]);

  /** Effective permission for a connector: its own rule, else the global default. */
  const permissionFor = useCallback(
    (id: string): PermissionMode => connectorPermissions[id] ?? defaultPermission,
    [connectorPermissions, defaultPermission]
  );

  /** Credential flags for the payload — which connectors have keys configured.
   * Raw secret values deliberately never leave the browser; generated code
   * reads them from import.meta.env.VITE_* at runtime. */
  const credentialFlags = useCallback(
    (): Record<string, boolean> =>
      Object.fromEntries(selectedConnectors.map(id => [id, Boolean(connectorKeys[id])])),
    [selectedConnectors, connectorKeys]
  );

  /** Convert local config shapes into the /generate-project payload shapes. */
  const customConnectorPayload = useCallback(
    (): CustomConnectorPayload[] =>
      customConnectors.map(cc => ({
        name: cc.name,
        baseUrl: cc.baseUrl,
        headers: cc.headerKey ? { [cc.headerKey]: cc.headerValue } : {},
        openApiSchema: cc.openApiSchema || undefined
      })),
    [customConnectors]
  );
  const mcpServerPayload = useCallback(
    (): McpServerPayload[] =>
      mcpServers.map(s => ({
        name: s.name,
        serverUrl: s.serverUrl,
        authToken: s.authToken || undefined
      })),
    [mcpServers]
  );

  const requestOpenFile = useCallback((path: string) => {
    setOpenFileRequest({ path, nonce: Date.now() });
  }, []);

  // Refresh the recents list from the backend. Called on mount and after
  // a successful build so the sidebar reflects newly-generated projects.
  const refreshRecents = useCallback(async () => {
    const list = await fetchProjects();
    setRecents(list);
  }, []);

  useEffect(() => {
    refreshRecents();
  }, [refreshRecents]);

  // ---- Live agent thought stream (SSE) ----
  const startTraceStream = () => {
    try {
      const es = new EventSource(GENERATION_EVENTS_URL);
      es.onmessage = ev => {
        try {
          const step = JSON.parse(ev.data) as TraceStep;
          setAgentTrace(prev => [...prev, step]);
        } catch {
          /* malformed frame — ignore */
        }
      };
      traceStreamRef.current = es;
    } catch {
      /* SSE unavailable — the response's `trace` array is the fallback. */
    }
  };

  const stopTraceStream = () => {
    traceStreamRef.current?.close();
    traceStreamRef.current = null;
  };

  const handleAuthError = (screen: 'login' | 'chat', err: unknown) => {
    const text =
      err instanceof NotAuthenticatedError
        ? 'Please log in to generate projects.'
        : err instanceof Error
          ? err.message
          : String(err);
    if (screen === 'login') {
      setStatusMessage(text);
      setCurrentScreen('login');
    } else {
      appendMessage({
        id: Date.now().toString(),
        sender: 'ai',
        text,
        timestamp: timestamp()
      });
    }
  };

  // ---- Generation dispatch: build | chat | plan ----
  const handleGeneratePlan = async (
    promptText: string,
    options: GenerateOptions = {}
  ) => {
    if (!promptText.trim() || isGenerating) return;
    const mode = options.mode ?? promptMode;
    const style = options.designStyle !== undefined ? options.designStyle : designStyle;

    setIsGenerating(true);
    setAgentTrace([]);
    // Clear stale workspace state so the preview/code panel renders an
    // empty skeleton during the build instead of the previous project's
    // leftovers.
    setGeneratedFiles([]);
    setGeneratedCode('');
    setOpenFileRequest(null);
    setStatusMessage(
      mode === 'build'
        ? 'Running the 3-agent pipeline: Architect → Developer → Debugger…'
        : mode === 'chat'
          ? 'Thinking about your question…'
          : 'Drafting your technical specification…'
    );
    // Hand off to the split workspace immediately so the user sees the live
    // trace + preview pipeline instead of a static "Agents running…" message.
    if (mode === 'build') {
      setCurrentScreen('generate-plan');
    }
    startTraceStream();
    try {
      const data = await generateProjectApi(promptText, {
        mode,
        connectors: selectedConnectors,
        customConnectors: customConnectorPayload(),
        mcpServers: mcpServerPayload(),
        connectorPermissions,
        connectorCredentials: credentialFlags(),
        designStyle: style,
        context: attachedContext?.content ?? null
      });
      if (data.trace && data.trace.length > 0) {
        setAgentTrace(data.trace);
      }

      if (mode === 'build') {
        setCurrentPlan(data.plan ?? DEFAULT_PLAN);
        setGeneratedCode(data.generated_code);
        setGeneratedFiles(data.files ?? []);
        setIsGenerated(true);
        setPreviewVersion(v => v + 1);
        setStatusMessage('Generation complete — preview updated.');

        const connectorNote =
          data.connectors && data.connectors.length > 0
            ? ` Wired connectors: ${data.connectors.join(', ')}.`
            : '';
        const suggestions = [
          'Add search filter',
          ...(data.connectors?.includes('supabase')
            ? ['Wire Supabase auth modal']
            : []),
          'Make the hero more animated'
        ].slice(0, 3);

        appendMessage({
          id: Date.now().toString(),
          sender: 'ai',
          text:
            `Generated a **${(data.plan as PlanResponse | undefined)?.type ?? 'project'}** ` +
            `as a ${data.files?.length ?? 0}-file repository — the live preview is updated.` +
            connectorNote,
          timestamp: timestamp(),
          changes: data.plan?.sections as string[] | undefined,
          files: data.files ?? [],
          suggestions
        });
        setCurrentScreen('generate-plan');
        refreshRecents();
      } else if (mode === 'chat') {
        setStatusMessage(null);
        appendMessage({
          id: Date.now().toString(),
          sender: 'ai',
          text: data.message ?? '',
          timestamp: timestamp(),
          markdown: true
        });
      } else {
        // Plan mode: markdown spec + interactive design-direction cards.
        lastPlanPromptRef.current = promptText;
        setStatusMessage('Specification ready — pick a design direction to build.');
        appendMessage({
          id: Date.now().toString(),
          sender: 'ai',
          text: data.message ?? '',
          timestamp: timestamp(),
          markdown: true,
          decisions: data.design_directions
        });
        setCurrentScreen('generate-plan');
      }
    } catch (err) {
      handleAuthError(isGenerated ? 'chat' : 'login', err);
    } finally {
      stopTraceStream();
      setIsGenerating(false);
    }
  };

  /** Build the last plan with a design direction chosen from a decision card. */
  const selectDesignDirection = async (direction: DesignDirection) => {
    if (!lastPlanPromptRef.current) return;
    appendMessage({
      id: Date.now().toString(),
      sender: 'user',
      text: `Build it with the "${direction.title}" design direction.`,
      timestamp: timestamp()
    });
    await handleGeneratePlan(lastPlanPromptRef.current, {
      mode: 'build',
      designStyle: direction.title
    });
  };

  // ---- Iterative "Edit with AI": follow-up prompts re-run the pipeline ----
  const sendChatMessage = async (text: string) => {
    if (!text.trim() || isGenerating) return;
    appendMessage({
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: timestamp()
    });

    setIsGenerating(true);
    setAgentTrace([]);
    setGeneratedFiles([]);
    setGeneratedCode('');
    setOpenFileRequest(null);
    setStatusMessage('Applying your edit through the 3-agent pipeline…');
    startTraceStream();
    try {
      const data = await generateProjectApi(
        `Update the previously generated app with this change: ${text}`,
        {
          mode: 'build',
          connectors: selectedConnectors,
          customConnectors: customConnectorPayload(),
          mcpServers: mcpServerPayload(),
          connectorPermissions,
          connectorCredentials: credentialFlags(),
          designStyle,
          context: attachedContext?.content ?? null
        }
      );
      if (data.trace && data.trace.length > 0) {
        setAgentTrace(data.trace);
      }
      setCurrentPlan(data.plan ?? null);
      setGeneratedCode(data.generated_code);
      setGeneratedFiles(data.files ?? []);
      setIsGenerated(true);
      setPreviewVersion(v => v + 1);
      setStatusMessage('Edit applied — preview reloaded.');
      refreshRecents();
      appendMessage({
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `Done! Applied "${text}" — ${data.files?.length ?? 0} files regenerated, preview updated.`,
        timestamp: timestamp(),
        changes: data.plan?.sections as string[] | undefined,
        files: data.files ?? [],
        suggestions: ['Add search filter', 'Polish the animations']
      });
    } catch (err) {
      handleAuthError('chat', err);
    } finally {
      stopTraceStream();
      setIsGenerating(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        isDeployModalOpen,
        setIsDeployModalOpen,
        user,
        setUser,
        logout,
        prompt,
        setPrompt,
        promptMode,
        setPromptMode,
        designStyle,
        setDesignStyle,
        attachedContext,
        setAttachedContext,
        currentPlan,
        isGenerating,
        isGenerated,
        generatedCode,
        generatedFiles,
        selectedFile,
        setSelectedFile,
        statusMessage,
        previewVersion,
        agentTrace,
        selectedConnectors,
        toggleConnector,
        connectorKeys,
        setConnectorKey,
        customConnectors,
        addCustomConnector,
        removeCustomConnector,
        mcpServers,
        addMcpServer,
        removeMcpServer,
        connectorPermissions,
        setConnectorPermission,
        defaultPermission,
        setDefaultPermission,
        permissionFor,
        openFileRequest,
        requestOpenFile,
        projects,
        currentProject,
        setCurrentProject,
        recents,
        refreshRecents,
        chatMessages,
        sendChatMessage,
        handleGeneratePlan,
        selectDesignDirection
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};