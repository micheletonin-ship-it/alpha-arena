// Clear Frontend Scanner Cache
// Paste this in browser console (F12 → Console) and press Enter

console.log('🧹 Clearing frontend scanner cache...');

// Clear all localStorage keys related to scanner
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key) {
    // Clear scanner cache and database
    if (key.includes('scanner') || key.includes('scan') || key === 'db_state') {
      keysToRemove.push(key);
    }
  }
}

console.log('📋 Keys to remove:', keysToRemove);

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  console.log('✅ Removed:', key);
});

console.log('🎉 Frontend cache cleared! Now reload the page (F5)');
