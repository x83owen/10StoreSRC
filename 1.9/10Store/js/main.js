(function () {
    var webview = document.getElementById('app-webview');
    var search = document.getElementById('search');

    if (search && webview) {
        search.addEventListener('input', function () {
            var q = search.value.trim();
            webview.src = q ? 'pages/apps.html?search=' + encodeURIComponent(q) : 'pages/apps.html';
        });
    }

    (function () {
        if (typeof Windows === 'undefined') return;
        var ui = new Windows.UI.ViewManagement.UISettings();

        function update() {
            // Get the system colors
            var acc = ui.getColorValue(Windows.UI.ViewManagement.UIColorType.accent);
            var bg = ui.getColorValue(Windows.UI.ViewManagement.UIColorType.background);

            // Calculate if the system is in Light or Dark mode
            var isLight = (bg.r + bg.g + bg.b) > 382;

            // 1. Set the dynamic Accent color
            document.documentElement.style.setProperty("--acsent", "rgb(" + acc.r + "," + acc.g + "," + acc.b + ")");

            // 2. Set the specific Background colors you requested
            // Light mode = #ffffff, Dark mode = #202020
            var customBg = isLight ? "#ffffff" : "#000000";
            document.documentElement.style.setProperty("--bg", customBg);

            // 3. Set a Text color variable so labels remain visible
            document.documentElement.style.setProperty("--text", isLight ? "#000000" : "#ffffff");
        }

        update();
        ui.addEventListener("colorvalueschanged", update);
        setInterval(update, 2000); // Fail-safe for older environments
    })();

    function updateTheme() {
        var bg = ui.getColorValue(Windows.UI.ViewManagement.UIColorType.background);
        var isLight = (bg.r + bg.g + bg.b) > 382;

        // Define our colors based on your logic
        var textColor = isLight ? "#000000" : "#ffffff";
        var borderColor = isLight ? "#e5e5e5" : "#333333";
        var hoverColor = isLight ? "#f2f2f2" : "#3d3d3d";

        // Update the BODY text color immediately
        document.body.style.color = textColor;

        // Overwrite the STYLE block for instant CSS changes across all cards
        themeStyle.innerHTML = `
            .app-card { 
                border-color: ${borderColor} !important; 
                color: ${textColor} !important;
            }
            .app-card:hover { 
                background-color: ${hoverColor} !important; 
            }
        `;
    }

    // --- Updated Menu Toggle & Click Logic ---
    (function () {
        var menuToggle = document.getElementById('menu-toggle');
        var drawer = document.getElementById('side-drawer');
        var overlay = document.getElementById('drawer-overlay');
        var header = document.getElementById('app-header'); // Target the header

        function toggleMenu() {
            drawer.classList.toggle('open');
            overlay.classList.toggle('active');
        }

        // Opens/Closes via hamburger
        if (menuToggle) {
            menuToggle.onclick = function (e) {
                e.stopPropagation(); // Prevents the header click from firing immediately
                toggleMenu();
            };
        }

        // Close if user clicks the overlay
        if (overlay) overlay.onclick = toggleMenu;

        // NEW: Close if user taps the header (but not the hamburger itself)
        if (header) {
            header.onclick = function (e) {
                // Only close if the menu is actually open
                if (drawer.classList.contains('open') && e.target !== menuToggle) {
                    toggleMenu();
                }
            };
        }

        // Close drawer when a link inside it is clicked
        drawer.addEventListener('click', function (e) {
            if (e.target.classList.contains('nav-btn')) toggleMenu();
        });
    })();

})();