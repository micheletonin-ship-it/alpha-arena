/**
 * Utility functions shared across the application
 */

/**
 * Generate deterministic avatar colors based on user ID
 * This ensures each user has consistent, unique colors across all app components
 */
export const getUserColor = (userId: string): { from: string, to: string } => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colorPairs = [
    { from: 'from-purple-500', to: 'to-indigo-500' },
    { from: 'from-pink-500', to: 'to-rose-500' },
    { from: 'from-blue-500', to: 'to-cyan-500' },
    { from: 'from-green-500', to: 'to-emerald-500' },
    { from: 'from-orange-500', to: 'to-amber-500' },
    { from: 'from-red-500', to: 'to-pink-500' },
    { from: 'from-violet-500', to: 'to-purple-500' },
    { from: 'from-teal-500', to: 'to-cyan-500' },
    { from: 'from-fuchsia-500', to: 'to-pink-500' },
    { from: 'from-lime-500', to: 'to-green-500' },
  ];
  
  const index = Math.abs(hash) % colorPairs.length;
  return colorPairs[index];
};
