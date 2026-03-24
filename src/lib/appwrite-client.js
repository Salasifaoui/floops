import { Account, Client, TablesDB, Databases } from "appwrite";
// import cors from "cors";


export const APPWRITE_AUTH_MODES = {
  JWT: "jwt",
  EMAIL_PASSWORD: "emailPassword",
  ANONYMOUS: "anonymous",
};

function normalizeEndpoint(endpoint) {
  return String(endpoint ?? "")
    .trim()
    .replace(/\/+$/, "");
}

function toErrorMessage(error, fallback = "Unexpected Appwrite error.") {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim().length > 0) return error;
  return fallback;
}

function encode(value) {
  return encodeURIComponent(String(value));
}

function createProjectHeaders(connector) {
  const projectHeaderValue = connector.projectId ?? connector.project;
  if (!projectHeaderValue) {
    throw new Error("Project ID is required for Appwrite headers.");
  }

  const headers = {
    "X-Appwrite-Project": projectHeaderValue,
  };

  if (connector.jwt) {
    headers["X-Appwrite-Key"] = `${connector.jwt}`;
  }
  headers["Content-Type"] = "application/json";
  headers["X-Appwrite-Response-Format"] = '1.0.0';
  

  return headers;
}

async function parseErrorResponse(response) {
  try {
    const payload = await response.json();
    if (payload?.message) return String(payload.message);
  } catch {
    // Ignore JSON parse issues and fallback to status text.
  }

  return `${response.status} ${response.statusText}`.trim();
}

function extractList(payload, keys) {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function toApiPath(path) {
  return path.startsWith("/") ? path : `/${path}`;
}

async function appwriteRequest(connector, method, path, body = null) {
  const headers = createProjectHeaders(connector);
  const init = {
    method,
    headers,
    mode: "cors",
  };

  if (body !== null) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const response = await fetch(`${connector.endpoint}${toApiPath(path)}`, init);

  if (!response.ok) {
    const message = await parseErrorResponse(response);
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function firstSuccessfulList(connector, endpoints, keys) {
  for (const endpoint of endpoints) {
    try {
      const payload = await appwriteRequest(connector, "GET", endpoint);
      return extractList(payload, keys);
    } catch {
      // Try next endpoint variant.
    }
  }

  return [];
}

async function listDatabases(connector) {
  const payload = await appwriteRequest(connector, "GET", "/databases");
  return extractList(payload, ["databases"]);
}

async function listTables(connector, databaseId) {
  return firstSuccessfulList(
    connector,
    [
      `/databases/${encode(databaseId)}/tables`,
      `/databases/${encode(databaseId)}/collections`,
    ],
    ["tables", "collections"],
  );
}

async function listColumns(connector, databaseId, tableId) {
  return firstSuccessfulList(
    connector,
    [
      `/databases/${encode(databaseId)}/tables/${encode(tableId)}/columns`,
      `/databases/${encode(databaseId)}/collections/${encode(tableId)}/attributes`,
    ],
    ["columns", "attributes"],
  );
}

async function listRelationships(connector, databaseId, tableId) {
  return firstSuccessfulList(
    connector,
    [
      `/databases/${encode(databaseId)}/tables/${encode(tableId)}/relationships`,
      `/databases/${encode(databaseId)}/collections/${encode(tableId)}/attributes`,
    ],
    ["relationships"],
  );
}

export function createAppwriteConnector(config) {
  const endpoint = normalizeEndpoint(config?.endpoint);
  const projectId = String(config?.projectId ?? "").trim();
  const authMode = String(config?.authMode ?? APPWRITE_AUTH_MODES.JWT);
  const jwt = String(config?.jwt ?? "").trim();
  const email = String(config?.email ?? "").trim();
  const password = String(config?.password ?? "");

  if (!endpoint) throw new Error("Endpoint is required.");
  if (!projectId) throw new Error("Project ID is required.");

  if (authMode === APPWRITE_AUTH_MODES.JWT && !jwt) {
    throw new Error("JWT is required for JWT mode.");
  }
  if (
    authMode === APPWRITE_AUTH_MODES.EMAIL_PASSWORD &&
    (!email || !password)
  ) {
    throw new Error("Email and password are required for email/password mode.");
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId);

  if (authMode === APPWRITE_AUTH_MODES.JWT && jwt) {
    client.setJWT(jwt);
  }

  return {
    client,
    endpoint,
    projectId,
    authMode,
    jwt,
    email,
    password,
  };
}

export async function getActiveAccount(connector) {
  const account = new Account(connector.client);
  const user = await account.get();
  localStorage.setItem("appwrite-session", JSON.stringify(user));
  return user;
}

export async function authenticateConnection(connector) {
  try {
    if (connector.authMode === APPWRITE_AUTH_MODES.EMAIL_PASSWORD) {
      const account = new Account(connector.client);
      await account.createEmailPasswordSession(
        connector.email,
        connector.password,
      );
      return { ok: true, mode: connector.authMode };
    }

    if (connector.authMode === APPWRITE_AUTH_MODES.ANONYMOUS) {
      const account = new Account(connector.client);
      await account.createAnonymousSession();
      return { ok: true, mode: connector.authMode };
    }

    return { ok: true, mode: connector.authMode };
  } catch (error) {
    throw new Error(toErrorMessage(error, "Authentication failed."));
  }
}

export async function testConnection(connector) {
  try {
    await authenticateConnection(connector);
    if (connector.authMode === APPWRITE_AUTH_MODES.JWT && connector.jwt) {
      connector.client.setJWT(connector.jwt);
      localStorage.setItem("appwrite-client", JSON.stringify(connector.client));
      localStorage.setItem("appwrite-session", JSON.stringify(connector.jwt));
      return {
        ok: true,
        mode: connector.authMode,
        jwt: connector.jwt,
        accountName: null,
        accountId: null,
        databaseCount: 0,
        hasActiveSession: true,
      };
    }
    const account = new Account(connector.client);
    const user = await account.get();
    localStorage.setItem("appwrite-client", JSON.stringify(connector.client));
    localStorage.setItem("appwrite-session", JSON.stringify(user));

    const databases = new TablesDB(connector.client);
    const list = await databases.listTransactions();

    return {
      ok: true,
      accountName: user?.name ? String(user.name) : null,
      accountId: user?.$id ? String(user.$id) : null,
      databaseCount: list.total,
      hasActiveSession: true,
    };
  } catch (error) {
    throw new Error(toErrorMessage(error, "Connection test failed."));
  }
}

export async function fetchProjectSchema(connector) {
  try {
    const databases = await listDatabases(connector);

    const detailedDatabases = await Promise.all(
      databases.map(async (database) => {
        const databaseId = String(database?.$id ?? database?.id ?? "unknown");
        const databaseName = String(database?.name ?? databaseId);
        const tables = await listTables(connector, databaseId);

        const detailedTables = await Promise.all(
          tables.map(async (table) => {
            const tableId = String(
              table?.$id ?? table?.id ?? table?.name ?? "unknown_table",
            );
            const tableName = String(table?.name ?? tableId);
            const columns = await listColumns(connector, databaseId, tableId);
            const relationships = await listRelationships(
              connector,
              databaseId,
              tableId,
            );

            return {
              ...table,
              $id: tableId,
              name: tableName,
              databaseId,
              columns,
              relationships,
            };
          }),
        );

        return {
          ...database,
          $id: databaseId,
          name: databaseName,
          tables: detailedTables,
        };
      }),
    );

    const tableCount = detailedDatabases.reduce(
      (total, database) => total + database.tables.length,
      0,
    );

    return {
      endpoint: connector.endpoint,
      projectId: connector.projectId,
      fetchedAt: new Date().toISOString(),
      databases: detailedDatabases,
      stats: {
        databaseCount: detailedDatabases.length,
        tableCount,
      },
    };
  } catch (error) {
    throw new Error(toErrorMessage(error, "Failed to fetch Appwrite schema."));
  }
}
