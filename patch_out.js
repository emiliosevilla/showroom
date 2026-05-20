const fs = require("fs");
const code = fs.readFileSync("src/App.tsx", "utf8");
const regex = /\{focusedContainer\.id === 'trash' && focusedContainer\.files\.length > 0 && \([\s\S]*?Vaciar Todo\s*<\/button>\s*\)\}/;
const replacement = `{focusedContainer.id === 'trash' && focusedContainer.files.length > 0 && (() => {
                                                   const selectedInTrash = focusedContainer.files.filter(f => selectedFiles.has(f));
                                                   if (selectedInTrash.length > 0) {
                                                      return (
                                                        <div className="flex items-center gap-2">
                                                          <button onClick={() => handleTrashAction('restore', selectedInTrash)} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500/20 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 shadow-sm" title="Restaurar seleccionados">
                                                            <RotateCcw className="w-4 h-4" />
                                                            Restaurar ({selectedInTrash.length})
                                                          </button>
                                                          <button onClick={() => {
                                                            requireConfirm(\`\xBFEliminar permanentemente \${selectedInTrash.length} archivo(s)?\`, () => handleTrashAction('delete', selectedInTrash));
                                                          }} className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-500/20 dark:bg-red-900/40 dark:hover:bg-red-900/60 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 shadow-sm" title="Eliminar seleccionados">
                                                            <Trash2 className="w-4 h-4" />
                                                            Eliminar ({selectedInTrash.length})
                                                          </button>
                                                        </div>
                                                      );
                                                   }
                                                   return (
                                                     <button onClick={() => {
                                                       requireConfirm('\xBFVaciar papelera permanentemente?', () => handleTrashAction('delete', focusedContainer.files));
                                                     }} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs font-bold flex items-center justify-center gap-1 shadow-sm" title="Vaciar papelera">
                                                       <Trash2 className="w-4 h-4 mr-1" />
                                                       Vaciar Todo
                                                     </button>
                                                   );
                                                })()}`;
if (regex.test(code)) {
  fs.writeFileSync("src/App.tsx", code.replace(regex, replacement), "utf8");
  console.log("Patched successfully!");
} else {
  console.log("Could not find the target string.");
}
