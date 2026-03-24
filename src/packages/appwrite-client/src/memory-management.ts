/**
 * Memory management utilities for Appwrite
 * These utilities help prevent memory leaks in production
 */

import { queryClient } from './query';

/**
 * Clear all cached data and subscriptions
 * Call this when the app goes to background or on memory pressure
 */
export const clearAppwriteCache = () => {
  try {
    queryClient.clear();
    console.log('Appwrite cache cleared successfully');
  } catch (error) {
    console.error('Failed to clear Appwrite cache:', error);
  }
};

/**
 * Remove stale queries from cache
 * Call this periodically to prevent cache bloat
 */
export const cleanupStaleQueries = () => {
  try {
    queryClient.removeQueries({
      predicate: (query) => {
        // Remove queries older than 30 minutes
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
        return query.state.dataUpdatedAt < thirtyMinutesAgo;
      },
    });
    console.log('Stale queries cleaned up');
  } catch (error) {
    console.error('Failed to cleanup stale queries:', error);
  }
};

/**
 * Get memory usage statistics
 */
export const getMemoryStats = () => {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();
  
  return {
    totalQueries: queries.length,
    activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
    staleQueries: queries.filter(q => q.isStale()).length,
    cacheSize: JSON.stringify(cache).length, // Rough estimate
  };
};

/**
 * Setup automatic memory management
 * Call this once during app initialization
 */
export const setupMemoryManagement = () => {
  const intervalIds: Array<ReturnType<typeof setInterval>> = [];

  // Clean up stale queries every 5 minutes
  intervalIds.push(setInterval(cleanupStaleQueries, 5 * 60 * 1000));
  
  // Listen for memory warnings (React Native specific)
  if (typeof global !== 'undefined' && (global.performance as any)?.memory) {
    // Monitor memory usage and clear cache if needed
    intervalIds.push(setInterval(() => {
      try {
        const memoryInfo = (global.performance as any).memory;
        if (memoryInfo && memoryInfo.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB threshold
          console.warn('High memory usage detected, clearing cache');
          cleanupStaleQueries();
        }
      } catch (error) {
        // Memory API not available, ignore
      }
    }, 60 * 1000)); // Check every minute
  }

  return () => {
    for (const id of intervalIds) clearInterval(id);
  };
};
