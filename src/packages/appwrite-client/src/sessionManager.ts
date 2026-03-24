'use client'

import { Client } from 'appwrite'
import { QueryClient } from '@tanstack/react-query'
import { client as defaultClient } from './appwriteClient'
import { queryClient as defaultQueryClient } from './query'

export type SessionStorage = {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
  deleteItem: (key: string) => Promise<void>
}

export type SavedAccount = {
  accountId: string
  sessionId: string
  label?: string
  updatedAt: number
}

export type SessionManager = {
  listAccounts: () => Promise<SavedAccount[]>
  getActiveAccountId: () => Promise<string | null>
  setActiveAccount: (accountId: string) => Promise<void>
  restoreActiveSession: () => Promise<SavedAccount | null>
  saveAccount: (account: Omit<SavedAccount, 'updatedAt'>) => Promise<void>
  removeAccount: (accountId: string) => Promise<void>
  clearAll: () => Promise<void>
}

const DEFAULT_KEYS = {
  accounts: 'zix.sessionManager.accounts',
  activeAccountId: 'zix.sessionManager.activeAccountId',
} as const

function safeJsonParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function createSessionManager({
  storage,
  client = defaultClient,
  queryClient = defaultQueryClient,
  keys = DEFAULT_KEYS,
}: {
  storage: SessionStorage
  client?: Client
  queryClient?: QueryClient
  keys?: { accounts: string; activeAccountId: string }
}): SessionManager {
  async function readAccounts() {
    const raw = await storage.getItem(keys.accounts)
    const parsed = safeJsonParse<SavedAccount[]>(raw, [])
    return Array.isArray(parsed) ? parsed : []
  }

  async function writeAccounts(accounts: SavedAccount[]) {
    await storage.setItem(keys.accounts, JSON.stringify(accounts))
  }

  async function applySession(sessionId: string) {
    // Switching sessions changes auth context for every query.
    client.setSession(sessionId || '')
    queryClient.clear()
  }

  return {
    listAccounts: async () => {
      const accounts = await readAccounts()
      return accounts.sort((a, b) => b.updatedAt - a.updatedAt)
    },

    getActiveAccountId: async () => {
      return (await storage.getItem(keys.activeAccountId)) ?? null
    },

    restoreActiveSession: async () => {
      const activeAccountId = await storage.getItem(keys.activeAccountId)
      if (!activeAccountId) return null

      const accounts = await readAccounts()
      const active = accounts.find(a => a.accountId === activeAccountId) ?? null
      if (!active) return null

      await applySession(active.sessionId)
      return active
    },

    setActiveAccount: async (accountId: string) => {
      const accounts = await readAccounts()
      const target = accounts.find(a => a.accountId === accountId)
      if (!target) throw new Error(`[zixdev/sessionManager] Unknown accountId: ${accountId}`)

      await storage.setItem(keys.activeAccountId, accountId)
      await applySession(target.sessionId)
    },

    saveAccount: async (account) => {
      const accounts = await readAccounts()
      const updatedAt = Date.now()
      const next: SavedAccount = { ...account, updatedAt }

      const idx = accounts.findIndex(a => a.accountId === account.accountId)
      if (idx >= 0) {
        accounts[idx] = next
      } else {
        accounts.push(next)
      }

      await writeAccounts(accounts)
      await storage.setItem(keys.activeAccountId, account.accountId)
      await applySession(account.sessionId)
    },

    removeAccount: async (accountId: string) => {
      const accounts = await readAccounts()
      const nextAccounts = accounts.filter(a => a.accountId !== accountId)
      await writeAccounts(nextAccounts)

      const activeAccountId = await storage.getItem(keys.activeAccountId)
      if (activeAccountId === accountId) {
        const nextActive = nextAccounts[0] ?? null
        if (nextActive) {
          await storage.setItem(keys.activeAccountId, nextActive.accountId)
          await applySession(nextActive.sessionId)
        } else {
          await storage.deleteItem(keys.activeAccountId)
          await applySession('')
        }
      }
    },

    clearAll: async () => {
      await storage.deleteItem(keys.accounts)
      await storage.deleteItem(keys.activeAccountId)
      await applySession('')
    },
  }
}


