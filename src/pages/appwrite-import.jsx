import { useEffect, useState } from "react";
import {
  APPWRITE_AUTH_MODES,
  createAppwriteConnector,
  fetchProjectSchema,
  testConnection,
} from "../lib/appwrite-client";
import {
  mapAppwriteSchemaToFlowDocument,
  summarizeFlowDocument,
} from "../lib/appwrite-to-flow";
import "../App.css";

const APPWRITE_PROJECTS_STORAGE_KEY = "sufax-flow:appwrite-project-configs";

function defaultFormState() {
  return {
    endpoint: "https://zixdev.cloud/v1",
    projectId: "",
    authMode: APPWRITE_AUTH_MODES.JWT,
    jwt: "",
    email: "",
    password: "",
  };
}

function validateFlowDocumentShape(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate))
    return false;
  if (!Array.isArray(candidate.tables)) return false;
  if ("relations" in candidate && !Array.isArray(candidate.relations))
    return false;
  return true;
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createProjectId() {
  return createId("cfg");
}

function createDraftId() {
  return createId("draft");
}

function loadSavedProjects() {
  try {
    const raw = window.localStorage.getItem(APPWRITE_PROJECTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.projectId === "string",
    );
  } catch {
    return [];
  }
}

function createDefaultRuntime() {
  return {
    connectionInfo: null,
    rawSchema: null,
    flowDocument: null,
    isTesting: false,
    isFetching: false,
    error: "",
    success: "",
  };
}

export default function AppwriteImportPage({
  onBack,
  onOpenWorkflow,
  onDeleteImportedProjects,
}) {
  const [projects, setProjects] = useState(loadSavedProjects);
  const [draftSections, setDraftSections] = useState([]);
  const [runtimeByProjectId, setRuntimeByProjectId] = useState({});

  useEffect(() => {
    window.localStorage.setItem(
      APPWRITE_PROJECTS_STORAGE_KEY,
      JSON.stringify(projects),
    );
  }, [projects]);

  const getProjectRuntime = (projectId) =>
    runtimeByProjectId[projectId] ?? createDefaultRuntime();

  const updateProjectRuntime = (projectId, updater) => {
    setRuntimeByProjectId((snapshot) => {
      const current = snapshot[projectId] ?? createDefaultRuntime();
      const next = typeof updater === "function" ? updater(current) : updater;
      return {
        ...snapshot,
        [projectId]: next,
      };
    });
  };

  const onDraftChange = (draftId, key, value) => {
    setDraftSections((snapshot) =>
      snapshot.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              form: {
                ...draft.form,
                [key]: value,
              },
            }
          : draft,
      ),
    );
  };

  const onStartAddingProject = () => {
    setDraftSections((snapshot) => [
      {
        id: createDraftId(),
        form: defaultFormState(),
        error: "",
        isTesting: false,
      },
      ...snapshot,
    ]);
  };

  const onConnectDraft = async (draftId) => {
    const draft = draftSections.find((item) => item.id === draftId);
    if (!draft) return;

    setDraftSections((snapshot) =>
      snapshot.map((item) =>
        item.id === draftId
          ? {
              ...item,
              isTesting: true,
              error: "",
            }
          : item,
      ),
    );

    try {
      const connector = createAppwriteConnector(draft.form);
      const connectionResult = await testConnection(connector);

      const nextProject = {
        id: createProjectId(),
        endpoint: connector.endpoint,
        projectId: connector.projectId,
        authMode: connector.authMode,
        jwt: connector.jwt,
        email: connector.email,
        password: connector.password,
      };

      setProjects((snapshot) => [nextProject, ...snapshot]);
      setDraftSections((snapshot) =>
        snapshot.filter((item) => item.id !== draftId),
      );
      updateProjectRuntime(nextProject.id, {
        ...createDefaultRuntime(),
        connectionInfo: {
          ...connectionResult,
          projectId: nextProject.id,
        },
        success: `Project ${nextProject.projectId} connected successfully.`,
      });
    } catch (connectError) {
      setDraftSections((snapshot) =>
        snapshot.map((item) =>
          item.id === draftId
            ? {
                ...item,
                error:
                  connectError instanceof Error
                    ? connectError.message
                    : "Connection test failed.",
                isTesting: false,
              }
            : item,
        ),
      );
    }
  };

  const onTestConnection = async (project) => {
    updateProjectRuntime(project.id, (runtime) => ({
      ...runtime,
      isTesting: true,
      error: "",
      success: "",
      rawSchema: null,
      flowDocument: null,
    }));

    try {
      const connector = createAppwriteConnector(project);
      const result = await testConnection(connector);
      updateProjectRuntime(project.id, (runtime) => ({
        ...runtime,
        isTesting: false,
        connectionInfo: {
          ...result,
          projectId: project.id,
        },
        success:
          `Active session detected${result.accountName ? ` for ${result.accountName}` : ""}. ` +
          `${result.databaseCount} database(s) accessible. You can fetch JSON now.`,
      }));
    } catch (testError) {
      updateProjectRuntime(project.id, (runtime) => ({
        ...runtime,
        isTesting: false,
        connectionInfo: null,
        error:
          testError instanceof Error
            ? testError.message
            : "Connection test failed.",
      }));
    }
  };

  const onFetchJson = async (project) => {
    updateProjectRuntime(project.id, (runtime) => ({
      ...runtime,
      isFetching: true,
      error: "",
      success: "",
    }));

    try {
      const connector = createAppwriteConnector(project);
      const schema = await fetchProjectSchema(connector);
      const mappedFlowDocument = mapAppwriteSchemaToFlowDocument(schema);

      if (!validateFlowDocumentShape(mappedFlowDocument)) {
        throw new Error("Imported data could not be converted to flow JSON.");
      }

      updateProjectRuntime(project.id, (runtime) => ({
        ...runtime,
        isFetching: false,
        rawSchema: schema,
        flowDocument: mappedFlowDocument,
        success:
          "Schema fetched and converted successfully. You can now open it in Workflow.",
      }));
    } catch (fetchError) {
      updateProjectRuntime(project.id, (runtime) => ({
        ...runtime,
        isFetching: false,
        rawSchema: null,
        flowDocument: null,
        error:
          fetchError instanceof Error
            ? fetchError.message
            : "Schema fetch failed.",
      }));
    }
  };

  const onCleanProjectData = (projectId) => {
    updateProjectRuntime(projectId, {
      ...createDefaultRuntime(),
      success: "Project data cleared.",
    });
  };

  const onDeleteProject = (projectId) => {
    const projectToDelete = projects.find((project) => project.id === projectId);
    setProjects((snapshot) => snapshot.filter((project) => project.id !== projectId));
    setRuntimeByProjectId((snapshot) => {
      const next = { ...snapshot };
      delete next[projectId];
      return next;
    });
    if (projectToDelete && typeof onDeleteImportedProjects === "function") {
      onDeleteImportedProjects({
        projectId: projectToDelete.projectId,
        endpoint: projectToDelete.endpoint,
      });
    }
  };

  return (
    <main className="import-shell">
      <header className="import-header">
        <div>
          <p className="import-header__eyebrow">Appwrite Import</p>
          <h1>Connect and Import Project Schema</h1>
          <p>
            Authenticate, fetch JSON from Appwrite, then open it directly inside
            workflow.
          </p>
        </div>
        <button
          type="button"
          className="service-view__back-btn"
          onClick={onBack}
        >
          Back to Services
        </button>
      </header>

      <section className="import-sections">
        {draftSections.map((draftSection) => (
          <article
            className="import-card import-project-section"
            key={draftSection.id}
          >
            <h2>New Project</h2>
            <label className="import-field">
              <span>Endpoint</span>
              <input
                type="text"
                value={draftSection.form.endpoint}
                onChange={(event) =>
                  onDraftChange(draftSection.id, "endpoint", event.target.value)
                }
                placeholder="https://cloud.appwrite.io"
              />
            </label>
            <label className="import-field">
              <span>Project ID</span>
              <input
                type="text"
                value={draftSection.form.projectId}
                onChange={(event) =>
                  onDraftChange(
                    draftSection.id,
                    "projectId",
                    event.target.value,
                  )
                }
                placeholder="project_id"
              />
            </label>
            <label className="import-field">
              <span>Auth mode</span>
              <select
                value={draftSection.form.authMode}
                onChange={(event) =>
                  onDraftChange(draftSection.id, "authMode", event.target.value)
                }
              >
                <option value={APPWRITE_AUTH_MODES.JWT}>JWT</option>
                <option value={APPWRITE_AUTH_MODES.EMAIL_PASSWORD}>
                  Email + Password
                </option>
                <option value={APPWRITE_AUTH_MODES.ANONYMOUS}>
                  Anonymous Session
                </option>
              </select>
            </label>

            {draftSection.form.authMode === APPWRITE_AUTH_MODES.JWT ? (
              <label className="import-field">
                <span>JWT</span>
                <textarea
                  value={draftSection.form.jwt}
                  onChange={(event) =>
                    onDraftChange(draftSection.id, "jwt", event.target.value)
                  }
                  placeholder="Paste Appwrite JWT token"
                />
              </label>
            ) : null}

            {draftSection.form.authMode ===
            APPWRITE_AUTH_MODES.EMAIL_PASSWORD ? (
              <>
                <label className="import-field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={draftSection.form.email}
                    onChange={(event) =>
                      onDraftChange(
                        draftSection.id,
                        "email",
                        event.target.value,
                      )
                    }
                    placeholder="name@example.com"
                  />
                </label>
                <label className="import-field">
                  <span>Password</span>
                  <input
                    type="password"
                    value={draftSection.form.password}
                    onChange={(event) =>
                      onDraftChange(
                        draftSection.id,
                        "password",
                        event.target.value,
                      )
                    }
                    placeholder="********"
                  />
                </label>
              </>
            ) : null}

            <div className="import-actions">
              <button
                type="button"
                onClick={() => onConnectDraft(draftSection.id)}
                disabled={draftSection.isTesting}
              >
                {draftSection.isTesting ? "Connecting..." : "Connect project"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setDraftSections((snapshot) =>
                    snapshot.filter((item) => item.id !== draftSection.id),
                  )
                }
                disabled={draftSection.isTesting}
              >
                Cancel
              </button>
            </div>
            {draftSection.error ? (
              <div className="import-message import-message--error">
                {draftSection.error}
              </div>
            ) : null}
          </article>
        ))}

        {projects.map((project) => {
          const runtime = getProjectRuntime(project.id);
          const hasActiveSession = Boolean(
            runtime.connectionInfo?.hasActiveSession,
          );
          const canFetch =
            hasActiveSession && !runtime.isTesting && !runtime.isFetching;
          const canOpenWorkflow =
            Boolean(runtime.flowDocument) &&
            !runtime.isTesting &&
            !runtime.isFetching;
          const summary = runtime.flowDocument
            ? summarizeFlowDocument(runtime.flowDocument)
            : null;

          return (
            <article
              className="import-card import-project-section"
              key={project.id}
            >
              <h2>{project.projectId}</h2>
              <p className="import-placeholder">Endpoint: {project.endpoint}</p>

              <div className="import-actions">
                <button
                  type="button"
                  onClick={() => onTestConnection(project)}
                  disabled={runtime.isTesting || runtime.isFetching}
                >
                  {runtime.isTesting ? "Testing..." : "Test Connection"}
                </button>
                <button
                  type="button"
                  onClick={() => onFetchJson(project)}
                  disabled={!canFetch}
                >
                  {runtime.isFetching ? "Fetching..." : "Fetch JSON"}
                </button>
                <button
                  type="button"
                  onClick={() => onCleanProjectData(project.id)}
                  disabled={runtime.isTesting || runtime.isFetching}
                >
                  Clean data
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteProject(project.id)}
                  disabled={runtime.isTesting || runtime.isFetching}
                >
                  Delete project
                </button>
              </div>

              {runtime.error ? (
                <div className="import-message import-message--error">
                  {runtime.error}
                </div>
              ) : null}
              {!runtime.error && runtime.success ? (
                <div className="import-message import-message--success">
                  {runtime.success}
                </div>
              ) : null}

              <div className="import-card import-card--inner">
                <h2>Import Preview</h2>
                {summary ? (
                  <div className="import-summary">
                    <div>
                      <span>Databases</span>
                      <strong>{summary.databases}</strong>
                    </div>
                    <div>
                      <span>Tables</span>
                      <strong>{summary.tableCount}</strong>
                    </div>
                    <div>
                      <span>Relations</span>
                      <strong>{summary.relationCount}</strong>
                    </div>
                  </div>
                ) : (
                  <p className="import-placeholder">
                    No imported data yet. Start by testing and fetching this
                    project.
                  </p>
                )}

                <div className="import-json-preview">
                  <pre>
                    {runtime.rawSchema
                      ? JSON.stringify(
                          {
                            projectId: runtime.rawSchema.projectId,
                            fetchedAt: runtime.rawSchema.fetchedAt,
                            stats: runtime.rawSchema.stats,
                          },
                          null,
                          2,
                        )
                      : "{ }"}
                  </pre>
                </div>

                <button
                  type="button"
                  className="import-open-workflow-btn"
                  disabled={!canOpenWorkflow}
                  onClick={() =>
                    onOpenWorkflow({
                      flowDocument: runtime.flowDocument,
                      schema: runtime.rawSchema,
                    })
                  }
                >
                  Open in Workflow
                </button>
              </div>
            </article>
          );
        })}

        <button
          type="button"
          className="import-project-add-btn import-project-add-btn--footer"
          onClick={onStartAddingProject}
        >
          +
        </button>
      </section>
    </main>
  );
}
