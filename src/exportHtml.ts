import { ClassificationResult } from "./services/classifier";

export function getImagePreview(file: File | undefined): string {
    if (!file) return '';
    try {
        return URL.createObjectURL(file);
    } catch {
        return '';
    }
}

export function generateEnhancedHtmlString(folderName: string, classification: ClassificationResult, t: (k: any) => string): string {
    const safeBase = folderName;

    // Translate container names before serializing
    const translatedContainers = classification.containers.map(c => ({
      ...c,
      name: c.name.startsWith('cat_') ? t(c.name) : c.name
    }));

    // Prepare JSON for vanilla JS injection
    const containersJson = JSON.stringify(translatedContainers);

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vista Mejorada - \${safeBase}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        :root {
            --bg-base: #f8fafc;
            --bg-card: #ffffff;
            --bg-pill: #f1f5f9;
            --border-lite: #e2e8f0;
            --text-main: #1e293b;
            --text-muted: #64748b;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --bg-base: #0f172a;
                --bg-card: #1e293b;
                --bg-pill: #334155;
                --border-lite: #334155;
                --text-main: #f8fafc;
                --text-muted: #94a3b8;
            }
        }

        body {
            background-color: var(--bg-base);
            color: var(--text-main);
            font-family: "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            transition: background-color 0.3s, color 0.3s;
        }
        
        /* Grid transitions for elegance */
        .container-btn {
            background-color: var(--bg-card);
            border-color: var(--border-lite);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .container-btn:hover {
            transform: scale(1.02);
            box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1);
            border-color: #6366f1;
        }

        .item-card {
            background-color: var(--bg-card);
            border-color: var(--border-lite);
        }
        
        .item-card:hover {
            background-color: var(--bg-pill);
        }

        .view-transition-active {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
        }
        
        .text-c-main { color: var(--text-main); }
        .text-c-muted { color: var(--text-muted); }
        .border-c-lite { border-color: var(--border-lite); }
        .bg-c-card { background-color: var(--bg-card); }
        .bg-c-base { background-color: var(--bg-base); }
    </style>
</head>
<body class="min-h-screen flex flex-col antialiased selection:bg-indigo-100 selection:text-indigo-900">

    <!-- Header -->
    <header class="p-8 border-b border-c-lite flex justify-between items-center backdrop-blur-lg sticky top-0 z-50 bg-c-card shadow-sm transition-colors">
        <div class="flex items-center space-x-4">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center p-2">
                <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
            </div>
            <div>
                <h1 class="text-xl font-bold tracking-tight text-c-main">SmartFolder Local</h1>
                <p class="text-c-muted mt-1 font-mono text-sm">\${safeBase}</p>
            </div>
        </div>
        <button id="backBtn" class="hidden px-5 py-2.5 rounded-lg bg-c-pill hover:opacity-80 text-sm font-semibold transition-colors border border-c-lite text-c-main shadow-sm">
            ← ${t('html_back')}
        </button>
    </header>

    <!-- Main Content -->
    <main id="mainContainer" class="flex-1 p-8 md:p-12 transition-all duration-500 ease-out bg-c-base">
        <!-- Dashboard View (Grid of containers) -->
        <div id="dashboardView" class="max-w-7xl mx-auto grids-wrapper">
            <h2 class="text-xs font-bold uppercase tracking-wider mb-8 text-c-muted">${t('containers')}</h2>
            <div id="containersGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <!-- Javascript will populate this -->
            </div>
        </div>

        <!-- Detail View -->
        <div id="detailView" class="hidden max-w-7xl mx-auto h-full flex flex-col">
            <div class="mb-10 text-center">
                <h2 id="detailTitle" class="text-4xl md:text-5xl font-bold tracking-tight text-c-main">${t('container_name')}</h2>
                <div class="h-1 w-20 bg-indigo-500 mx-auto mt-6 rounded-full"></div>
            </div>
            
            <div id="filesGrid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                <!-- Javascript will populate files here -->
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="p-6 text-center text-c-muted text-sm mt-auto border-t border-c-lite bg-c-card shadow-2xl transition-colors">
        Generado automáticamente por SmartFolder Local &middot; 100% Privado
    </footer>

    <!-- Logic -->
    <script>
        const containersData = \${containersJson};
        const safeBase = "\${safeBase}";

        const getIconForFile = (filename, isContainer = false) => {
            if (isContainer) {
                return '<svg class="w-12 h-12 text-indigo-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>';
            }
            if (!filename) return '';
            const parts = filename.split('.');
            if (parts.length === 1) {
                return '<svg class="w-12 h-12 text-amber-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>';
            }
            const ext = parts.pop().toLowerCase();
            if (['exe', 'app', 'bat', 'sh', 'msi'].includes(ext)) {
                return '<svg class="w-12 h-12 text-blue-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>';
            }
            if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
                return '<svg class="w-12 h-12 text-emerald-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>';
            }
            if (['pdf', 'doc', 'docx', 'txt', 'md', 'csv', 'xlsx'].includes(ext)) {
                return '<svg class="w-12 h-12 text-blue-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>';
            }
            if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
                return '<svg class="w-12 h-12 text-purple-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>';
            }
            if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) {
                return '<svg class="w-12 h-12 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>';
            }
            // default file
            return '<svg class="w-12 h-12 text-slate-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>';
        };

        const renderDashboard = () => {
            const grid = document.getElementById('containersGrid');
            grid.innerHTML = '';
            
            containersData.forEach(container => {
                const btn = document.createElement('div');
                btn.className = 'container-btn bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[200px] shadow-sm hover:shadow-md group';
                btn.onclick = () => openContainer(container.id);
                
                // Add icon visual representation based on container
                let innerVisuals = getIconForFile(container.name, true);

                btn.innerHTML = \`
                    <div class="mb-6 w-full flex justify-center opacity-80 group-hover:opacity-100 transition-opacity transform group-hover:scale-110 duration-500">\${innerVisuals}</div>
                    <h3 class="text-2xl font-bold text-c-main">\${container.name}</h3>
                    <p class="text-c-muted font-mono text-xs mt-3">[\${container.files.length}] ${t('html_elements')}</p>
                \`;
                grid.appendChild(btn);
            });
        };

        const renderDetail = (containerId) => {
            const container = containersData.find(c => c.id === containerId);
            document.getElementById('detailTitle').innerText = container.name;
            const grid = document.getElementById('filesGrid');
            grid.innerHTML = '';

            container.files.forEach(fileRelPath => {
                // fileRelPath might have multiple slashes
                const parts = fileRelPath.split('/');
                const filename = parts[parts.length - 1]; // last part is the name
                
                const item = document.createElement('a');
                item.href = './' + fileRelPath;
                // To open in a generic way, it depends on browser settings. A normal link works.
                // target blank can be used
                // item.target = '_blank';
                item.className = 'item-card flex flex-col items-center justify-center p-6 border rounded-xl shadow-sm transition-all hover:shadow-md hover:scale-105';
                
                item.innerHTML = \`
                    <div class="mb-4">\${getIconForFile(filename)}</div>
                    <p class="text-sm text-center font-bold text-c-main break-words w-full line-clamp-2">\${filename}</p>
                    <p class="text-xs text-c-muted mt-2 truncate w-full text-center" title="\${fileRelPath}">\${fileRelPath}</p>
                \`;

                grid.appendChild(item);
            });
        };

        const mainContainer = document.getElementById('mainContainer');
        const dashboardView = document.getElementById('dashboardView');
        const detailView = document.getElementById('detailView');
        const backBtn = document.getElementById('backBtn');

        const openContainer = (containerId) => {
            // Animate out dashboard
            mainContainer.classList.add('view-transition-active');
            
            setTimeout(() => {
                dashboardView.classList.add('hidden');
                detailView.classList.remove('hidden');
                backBtn.classList.remove('hidden');
                
                renderDetail(containerId);
                
                mainContainer.classList.remove('view-transition-active');
            }, 300);
        };

        const showDashboard = () => {
            // Animate out detail
            mainContainer.classList.add('view-transition-active');
            
            setTimeout(() => {
                detailView.classList.add('hidden');
                dashboardView.classList.remove('hidden');
                backBtn.classList.add('hidden');
                
                mainContainer.classList.remove('view-transition-active');
            }, 300);
        };

        backBtn.onclick = showDashboard;

        // Init
        renderDashboard();
    </script>
</body>
</html>`;
}
