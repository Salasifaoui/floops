import { Account, Avatars, Client, Functions, Locale, Storage, TablesDB, Teams } from 'appwrite';

type RuntimeEnv = {
  VITE_APPWRITE_PROJECT_ID?: string
  VITE_APPWRITE_ENDPOINT?: string
  VITE_APPWRITE_DEV_KEY?: string
  DEV?: boolean
}

const viteEnv = (typeof import.meta !== 'undefined' ? ((import.meta as any).env as RuntimeEnv) : undefined) ?? {};
const processEnv = (typeof process !== 'undefined' ? process.env : undefined) ?? {};

const projectId = viteEnv.VITE_APPWRITE_PROJECT_ID ?? processEnv.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? '';
const endpoint = viteEnv.VITE_APPWRITE_ENDPOINT ?? processEnv.EXPO_PUBLIC_APPWRITE_ENDPOINT ?? '';
const devKey = viteEnv.VITE_APPWRITE_DEV_KEY ?? processEnv.EXPO_PUBLIC_APPWRITE_DEV_KEY ?? '';
const isDev = Boolean(viteEnv.DEV ?? processEnv.NODE_ENV !== 'production');

export const appwriteEnv = {
  projectId,
  endpoint,
  devKey,
} as const;

export const isAppwriteConfigured = Boolean(projectId && endpoint);

if (isDev && !isAppwriteConfigured) {
  // In production builds, missing env vars should not crash the app at import-time.
  // AppwriteProvider will treat this as "disconnected".
  // eslint-disable-next-line no-console
  console.warn(
    [
      '[zixdev/appwrite-client] Missing Appwrite env vars.',
      'Expected VITE_APPWRITE_PROJECT_ID and VITE_APPWRITE_ENDPOINT.',
      `Received: projectId="${projectId}", endpoint="${endpoint}"`,
    ].join(' ')
  );
}

export const client = new Client();

// Configure only when values exist so we don't build obviously-invalid URLs.
if (projectId) client.setProject(projectId);
if (endpoint) client.setEndpoint(endpoint);
if (devKey) client.setDevKey(devKey);


const account = new Account(client);
const avatars = new Avatars(client);
const tablesDB = new TablesDB(client);
const functions = new Functions(client);
const locale = new Locale(client);
const storage = new Storage(client);
const teams = new Teams(client);


export type AppwriteContextType = {
    client: Client,
    account: Account,
    avatars: Avatars,
    tablesDB: TablesDB,
    functions: Functions,
    locale: Locale,
    storage: Storage,
    teams: Teams,
}

export const appwriteClient = {
    client,
    account,
    avatars,
    tablesDB,
    functions,
    locale,
    storage,
    teams,
}