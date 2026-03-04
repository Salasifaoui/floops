import { useMemo, useState, useEffect } from "react";
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

function defaultFormState() {
  return {
    endpoint: "https://zixdev.cloud/v1",
    projectId: "68baa694000afcc9f5bb",
    authMode: APPWRITE_AUTH_MODES.JWT,
    jwt: "standard_8ac63b5200db6db23fef3e6ee53d1a88ff15027a7cdce0f32c956877dd0d75d486439a77e569c0d9927fe50e7275b355faae244cd19b9b4506e79e9829d609687f189fbf85760355a83e1d8b49426bc1014020c3bf700919cc5c7bd175bd1eea054c56332ca621da1468c3719ed4f647fcac266995bf4a0841930f76c13a93b3",
    email: "salahifaoui2022@gmail.com",
    password: "Ss123456789",
  };
}

function validateFlowDocumentShape(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return false;
  if (!Array.isArray(candidate.tables)) return false;
  if ("relations" in candidate && !Array.isArray(candidate.relations)) return false;
  return true;
}

export default function AppwriteImportPage({ onBack, onOpenWorkflow }) {
  const [form, setForm] = useState(defaultFormState);
  const [isTesting, setIsTesting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [rawSchema, setRawSchema] = useState(null);
  const [flowDocument, setFlowDocument] = useState(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("appwrite-session");
    if (session) {
      const user = JSON.parse(session);
      setHasActiveSession(true);
      setConnectionInfo({
        accountName: user.name,
        accountId: user.$id,
        databaseCount: 0,
        hasActiveSession: true,
      });
    }
  }, []);
  useEffect(() => {
    setHasActiveSession(connectionInfo?.hasActiveSession);
  }, [connectionInfo]);

  const summary = useMemo(
    () => (flowDocument ? summarizeFlowDocument(flowDocument) : null),
    [flowDocument],
  );

  const canFetch = hasActiveSession && !isTesting && !isFetching;
  const canOpenWorkflow = Boolean(flowDocument) && !isTesting && !isFetching;

  const onFormChange = (key, value) => {
    setForm((snapshot) => ({ ...snapshot, [key]: value }));
  };

  const onTestConnection = async () => {
    setError("");
    setSuccess("");
    setIsTesting(true);
    setRawSchema(null);
    setFlowDocument(null);

    try {
      const connector = createAppwriteConnector(form);
      const result = await testConnection(connector);
      setConnectionInfo(result);
      setSuccess(
        `Active session detected${result.accountName ? ` for ${result.accountName}` : ""}. ` +
          `${result.databaseCount} database(s) accessible. You can fetch JSON now.`,
      );
    } catch (testError) {
      setConnectionInfo(null);
      setError(testError instanceof Error ? testError.message : "Connection test failed.");
    } finally {
      setIsTesting(false);
    }
  };

  const onFetchJson = async () => {
    setError("");
    setSuccess("");
    setIsFetching(true);

    try {
      const client = JSON.parse(localStorage.getItem("appwrite-client"));
      const schema = await fetchProjectSchema(client.config);
      const mappedFlowDocument = mapAppwriteSchemaToFlowDocument(schema);

      if (!validateFlowDocumentShape(mappedFlowDocument)) {
        throw new Error("Imported data could not be converted to flow JSON.");
      }

      setRawSchema(schema);
      setFlowDocument(mappedFlowDocument);
      setSuccess("Schema fetched and converted successfully. You can now open it in Workflow.");
    } catch (fetchError) {
      setRawSchema(null);
      setFlowDocument(null);
      setError(fetchError instanceof Error ? fetchError.message : "Schema fetch failed.");
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <main className="import-shell">
      <header className="import-header">
        <div>
          <p className="import-header__eyebrow">Appwrite Import</p>
          <h1>Connect and Import Project Schema</h1>
          <p>Authenticate, fetch JSON from Appwrite, then open it directly inside workflow.</p>
        </div>
        <button type="button" className="service-view__back-btn" onClick={onBack}>
          Back to Services
        </button>
      </header>

      <section className="import-grid">
        <article className="import-card">
          <h2>Connection</h2>
          {!hasActiveSession ? (
            <>
              <label className="import-field">
                <span>Endpoint</span>
                <input
                  type="text"
                  // value={form.endpoint}
                  defaultValue="https://zixdev.cloud/v1"
                  onChange={(event) => onFormChange("endpoint", event.target.value)}
                  placeholder="https://cloud.appwrite.io"
                />
              </label>
              <label className="import-field">
                <span>Project ID</span>
                <input
                  type="text"
                  // value={form.projectId}
                  defaultValue="68baa694000afcc9f5bb"
                  onChange={(event) => onFormChange("projectId", event.target.value)}
                  placeholder="project_id"
                />
              </label>
              <label className="import-field">
                <span>Auth mode</span>
                <select
                  value={form.authMode}
                  onChange={(event) => onFormChange("authMode", event.target.value)}
                >
                  <option value={APPWRITE_AUTH_MODES.JWT}>JWT</option>
                  <option value={APPWRITE_AUTH_MODES.EMAIL_PASSWORD}>Email + Password</option>
                  <option value={APPWRITE_AUTH_MODES.ANONYMOUS}>Anonymous Session</option>
                </select>
              </label>

              {form.authMode === APPWRITE_AUTH_MODES.JWT ? (
                <label className="import-field">
                  <span>JWT</span>
                  <textarea
                    value={form.jwt}
                    onChange={(event) => onFormChange("jwt", event.target.value)}
                    placeholder="Paste Appwrite JWT token"
                  />
                </label>
              ) : null}

              {form.authMode === APPWRITE_AUTH_MODES.EMAIL_PASSWORD ? (
                <>
                  <label className="import-field">
                    <span>Email</span>
                    <input
                      type="email"
                      // value={form.email}
                      defaultValue="salahifaoui2022@gmail.com"
                      onChange={(event) => onFormChange("email", event.target.value)}
                      placeholder="name@example.com"
                    />
                  </label>
                  <label className="import-field">
                    <span>Password</span>
                    <input
                      type="password"
                      // value={form.password}
                      defaultValue="Ss123456789"
                      onChange={(event) => onFormChange("password", event.target.value)}
                      placeholder="********"
                    />
                  </label>
                </>
              ) : null}

              <div className="import-actions">
                <button type="button" onClick={onTestConnection} disabled={isTesting || isFetching}>
                  {isTesting ? "Testing..." : "Test Connection"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="import-message import-message--success">
                Connected
                Session is active.
              </div>
              <div className="import-message import-message--success">
                Welcome to Appwrite Import {connectionInfo?.accountName}! You have {connectionInfo?.databaseCount} databases accessible.
                
              </div>
              <div className="import-actions">
                <button type="button" onClick={onFetchJson} disabled={!canFetch}>
                  {isFetching ? "Fetching..." : "Fetch JSON"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConnectionInfo(null);
                    setRawSchema(null);
                    setFlowDocument(null);
                    setSuccess("");
                    setError("");
                    setHasActiveSession(false);
                    localStorage.removeItem("appwrite-session");
                  }}
                  disabled={isTesting || isFetching}
                >
                  Change connection
                </button>
              </div>
            </>
          )}

          {error ? <div className="import-message import-message--error">{error}</div> : null}
          {!error && success ? (
            <div className="import-message import-message--success">{success}</div>
          ) : null}
        </article>

        <article className="import-card">
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
              No imported data yet. Start by validating an active account session, then fetch JSON.
            </p>
          )}

          <div className="import-json-preview">
            <pre>
              {rawSchema
                ? JSON.stringify(
                  {
                    projectId: rawSchema.projectId,
                    fetchedAt: rawSchema.fetchedAt,
                    stats: rawSchema.stats,
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
            onClick={() => onOpenWorkflow(flowDocument)}
          >
            Open in Workflow
          </button>
        </article>
      </section>
    </main>
  );
}
