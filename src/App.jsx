import { useEffect, useMemo, useState } from "react";
import AppwriteImportPage from "./pages/appwrite-import";
import WorkflowPage from "./pages/workflow";
import flowJson from "./json/flow.json";
import "./App.css";

const WORKSPACE_STORAGE_KEY = "sufax-flow:workspace:v1";
const LEGACY_FLOW_STORAGE_KEY = "sufax-flow:flow-document";

const SERVICES = [
  {
    id: "workflow",
    title: "Workflow Builder",
    description: "Design data tables, relations, and flow graph from one visual canvas.",
    status: "available",
  },
  {
    id: "appwrite-import",
    title: "Appwrite Import",
    description: "Connect to Appwrite and import schema directly into the workflow editor.",
    status: "available",
  },
  {
    id: "team-collab",
    title: "Team Collaboration",
    description: "Share, comment, and co-edit project flows with your team.",
    status: "planned",
  },
];

export default function App() {
  function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function createBlankFlowDocument() {
    return {
      source: "manual",
      importedAt: new Date().toISOString(),
      tables: [],
      relations: [],
    };
  }

  function createTab({ id = createId("tab"), title, sourceMode, flowDocument, sourceProjectId = null }) {
    return {
      id,
      title,
      sourceMode,
      sourceProjectId,
      flowDocument,
      jsonEditorVisible: false,
    };
  }

  function createDefaultWorkspace() {
    const defaultTab = createTab({
      title: "Default",
      sourceMode: "file",
      flowDocument: flowJson,
    });

    return {
      tabs: [defaultTab],
      activeTabId: defaultTab.id,
      importedProjects: [],
    };
  }

  function normalizeWorkspace(candidate) {
    if (!candidate || typeof candidate !== "object") return null;
    const tabs = Array.isArray(candidate.tabs) ? candidate.tabs : [];
    const importedProjects = Array.isArray(candidate.importedProjects) ? candidate.importedProjects : [];
    if (tabs.length === 0) return null;

    const normalizedTabs = tabs
      .filter((tab) => tab && typeof tab === "object" && Array.isArray(tab.flowDocument?.tables))
      .map((tab) => ({
        id: String(tab.id ?? createId("tab")),
        title: String(tab.title ?? "Untitled"),
        sourceMode: String(tab.sourceMode ?? "manual"),
        sourceProjectId: tab.sourceProjectId ? String(tab.sourceProjectId) : null,
        flowDocument: tab.flowDocument,
        jsonEditorVisible: Boolean(tab.jsonEditorVisible),
      }));

    if (normalizedTabs.length === 0) return null;

    const activeTabId = normalizedTabs.some((tab) => tab.id === candidate.activeTabId)
      ? String(candidate.activeTabId)
      : normalizedTabs[0].id;

    const normalizedProjects = importedProjects
      .filter((project) => project && typeof project === "object" && Array.isArray(project.flowDocument?.tables))
      .map((project) => ({
        id: String(project.id ?? createId("project")),
        title: String(project.title ?? project.projectId ?? "Imported Project"),
        projectId: String(project.projectId ?? "unknown"),
        endpoint: project.endpoint ? String(project.endpoint) : null,
        flowDocument: project.flowDocument,
        importedAt: String(project.importedAt ?? new Date().toISOString()),
      }));

    return {
      tabs: normalizedTabs,
      activeTabId,
      importedProjects: normalizedProjects,
    };
  }

  const [activeView, setActiveView] = useState("home");
  const [workspace, setWorkspace] = useState(() => {
    try {
      const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (raw) {
        const parsed = normalizeWorkspace(JSON.parse(raw));
        if (parsed) return parsed;
      }
    } catch {
      // Fallback to default workspace.
    }

    try {
      const legacyRaw = window.localStorage.getItem(LEGACY_FLOW_STORAGE_KEY);
      if (legacyRaw) {
        const legacyDocument = JSON.parse(legacyRaw);
        if (legacyDocument && typeof legacyDocument === "object" && Array.isArray(legacyDocument.tables)) {
          const migratedTab = createTab({
            title: "Migrated",
            sourceMode: "saved",
            flowDocument: legacyDocument,
          });
          return {
            tabs: [migratedTab],
            activeTabId: migratedTab.id,
            importedProjects: [],
          };
        }
      }
    } catch {
      // Ignore migration errors and continue with default workspace.
    }

    return createDefaultWorkspace();
  });

  const availableServices = useMemo(
    () => SERVICES.filter((service) => service.status === "available").length,
    [],
  );

  useEffect(() => {
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
  }, [workspace]);

  const addTab = (flowDocument, options = {}) => {
    const tabId = createId("tab");
    const nextTab = createTab({
      id: tabId,
      title: options.title ?? "Untitled",
      sourceMode: options.sourceMode ?? "manual",
      sourceProjectId: options.sourceProjectId ?? null,
      flowDocument,
    });

    setWorkspace((snapshot) => ({
      ...snapshot,
      tabs: [...snapshot.tabs, nextTab],
      activeTabId: tabId,
    }));
  };

  const addImportedProject = ({ projectId, endpoint, flowDocument }) => {
    const title = projectId ? `Project ${projectId}` : "Imported Project";
    const importedProject = {
      id: createId("project"),
      title,
      projectId: String(projectId ?? "unknown"),
      endpoint: endpoint ? String(endpoint) : null,
      flowDocument,
      importedAt: new Date().toISOString(),
    };

    setWorkspace((snapshot) => ({
      ...snapshot,
      importedProjects: [importedProject, ...snapshot.importedProjects],
    }));

    return importedProject;
  };

  const removeImportedProjectsByConfig = ({ projectId, endpoint }) => {
    setWorkspace((snapshot) => {
      const removedImportedIds = new Set(
        snapshot.importedProjects
          .filter((project) => {
            if (project.projectId !== String(projectId ?? "")) return false;
            if (endpoint) {
              return String(project.endpoint ?? "") === String(endpoint);
            }
            return true;
          })
          .map((project) => project.id),
      );

      if (removedImportedIds.size === 0) return snapshot;

      const nextImportedProjects = snapshot.importedProjects.filter(
        (project) => !removedImportedIds.has(project.id),
      );

      const nextTabs = snapshot.tabs.filter(
        (tab) => !tab.sourceProjectId || !removedImportedIds.has(tab.sourceProjectId),
      );

      if (nextTabs.length === 0) {
        const fallbackTab = createTab({
          title: "Untitled",
          sourceMode: "manual",
          flowDocument: createBlankFlowDocument(),
        });
        return {
          ...snapshot,
          importedProjects: nextImportedProjects,
          tabs: [fallbackTab],
          activeTabId: fallbackTab.id,
        };
      }

      const activeTabExists = nextTabs.some((tab) => tab.id === snapshot.activeTabId);
      return {
        ...snapshot,
        importedProjects: nextImportedProjects,
        tabs: nextTabs,
        activeTabId: activeTabExists ? snapshot.activeTabId : nextTabs[0].id,
      };
    });
  };

  const updateTab = (tabId, updater) => {
    setWorkspace((snapshot) => ({
      ...snapshot,
      tabs: snapshot.tabs.map((tab) => {
        if (tab.id !== tabId) return tab;
        if (typeof updater === "function") return updater(tab);
        return { ...tab, ...updater };
      }),
    }));
  };

  const closeTab = (tabId) => {
    setWorkspace((snapshot) => {
      const existingIndex = snapshot.tabs.findIndex((tab) => tab.id === tabId);
      if (existingIndex === -1) return snapshot;

      const remainingTabs = snapshot.tabs.filter((tab) => tab.id !== tabId);
      if (remainingTabs.length === 0) {
        const fallbackTab = createTab({
          title: "Untitled",
          sourceMode: "manual",
          flowDocument: createBlankFlowDocument(),
        });
        return {
          ...snapshot,
          tabs: [fallbackTab],
          activeTabId: fallbackTab.id,
        };
      }

      const nextActive = snapshot.activeTabId === tabId
        ? remainingTabs[Math.max(existingIndex - 1, 0)].id
        : snapshot.activeTabId;

      return {
        ...snapshot,
        tabs: remainingTabs,
        activeTabId: nextActive,
      };
    });
  };

  if (activeView === "workflow") {
    return (
      <div className="service-view">
        <div className="service-view__topbar">
          <button
            type="button"
            className="service-view__back-btn"
            onClick={() => setActiveView("home")}
          >
            Back to Services
          </button>
        </div>
        <WorkflowPage
          key={workspace.activeTabId}
          tabs={workspace.tabs}
          activeTabId={workspace.activeTabId}
          importedProjects={workspace.importedProjects}
          onSetActiveTab={(tabId) =>
            setWorkspace((snapshot) => ({
              ...snapshot,
              activeTabId: tabId,
            }))
          }
          onCreateBlankTab={() => {
            addTab(createBlankFlowDocument(), {
              title: "Untitled",
              sourceMode: "manual",
            });
          }}
          onCreateTabFromImportedProject={(projectId) => {
            const project = workspace.importedProjects.find((item) => item.id === projectId);
            if (!project) return;
            addTab(project.flowDocument, {
              title: project.title,
              sourceMode: "imported",
              sourceProjectId: project.id,
            });
          }}
          onCloseTab={closeTab}
          onUpdateTab={updateTab}
        />
      </div>
    );
  }

  if (activeView === "appwriteImport") {
    return (
      <AppwriteImportPage
        onBack={() => setActiveView("home")}
        onDeleteImportedProjects={removeImportedProjectsByConfig}
        onOpenWorkflow={({ flowDocument, schema }) => {
          const importedProject = addImportedProject({
            projectId: schema?.projectId,
            endpoint: schema?.endpoint,
            flowDocument,
          });
          addTab(flowDocument, {
            title: importedProject.title,
            sourceMode: "imported",
            sourceProjectId: importedProject.id,
          });
          setActiveView("workflow");
        }}
      />
    );
  }

  function openService(serviceId) {
    if (serviceId === "workflow") {
      setActiveView("workflow");
      return;
    }
    if (serviceId === "appwrite-import") {
      setActiveView("appwriteImport");
    }
  }

  return (
    <main className="service-hub">
      <header className="service-hub__header">
        <p className="service-hub__eyebrow">Sufax Flow</p>
        <h1>Project Services</h1>
        <p>
          Choose a service to continue. {availableServices} service is ready now and more modules
          are planned.
        </p>
      </header>

      <section className="service-hub__grid" aria-label="Services list">
        {SERVICES.map((service) => {
          const isAvailable = service.status === "available";
          return (
            <article className="service-card" key={service.id}>
              <div className="service-card__meta">
                <span className={`service-card__badge ${isAvailable ? "is-available" : "is-planned"}`}>
                  {isAvailable ? "Available" : "Planned"}
                </span>
              </div>
              <h2>{service.title}</h2>
              <p>{service.description}</p>
              <button
                type="button"
                className="service-card__action"
                disabled={!isAvailable}
                onClick={() => isAvailable && openService(service.id)}
              >
                {isAvailable ? "Open service" : "Coming soon"}
              </button>
            </article>
          );
        })}
      </section>

      <section className="service-hub__guide" aria-label="Appwrite platform setup guide">
        <p className="service-hub__guide-eyebrow">Before import</p>
        <h2>Appwrite platform setup guide</h2>
        <p className="service-hub__guide-text">
          To use <strong>Import Data from Appwrite</strong> without connection issues, add a Web platform in
          your Appwrite project first:
        </p>
        <ol className="service-hub__guide-steps">
          <li>
            <span>Add platform</span>
          </li>
          <li>
            <span>Choose Web</span>
          </li>
          <li>
            <span>Choose JavaScript</span>
          </li>
          <li>
            <span>
              Add Hostname: <code>floop.netlify.app</code>
            </span>
          </li>
          <li>
            <span>Click &quot;Create platform&quot;</span>
          </li>
        </ol>
        <p className="service-hub__guide-note">
          After creating the platform, return and open <strong>Appwrite Import</strong>.
        </p>
      </section>
    </main>
  );
}
