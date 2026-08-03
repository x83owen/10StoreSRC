(function () {
    "use strict";

    var uiSettings = new Windows.UI.ViewManagement.UISettings();
    var navManager = Windows.UI.Core.SystemNavigationManager.getForCurrentView();
    var localSettings = Windows.Storage.ApplicationData.current.localSettings;

    WinJS.UI.processAll().then(function () {
        var frame = document.getElementById('app-frame');
        var searchElement = document.getElementById('search');
        var hamburgerBtn = document.querySelector(".icon-btn");
        var navMenu = document.getElementById("nav-menu").winControl;

        function extractParam(str, key) {
            var parts = str.split(key + "=");
            if (parts.length > 1) {
                return decodeURIComponent(parts[1].split("&")[0]);
            }
            return null;
        }

        // --- 1. Navigation Setup ---
        hamburgerBtn.onclick = function () {
            navMenu.show(hamburgerBtn, "bottom");
        };

        [
            { id: 'home', url: "home.html" },
            { id: 'apps', url: "apps.html" },
            { id: 'cache', url: "cache.html" },
            { id: 'feedback', url: "https://10storedraydenyt.netlify.app/feedback" },
            { id: 'upload', url: "https://10storedraydenyt.netlify.app/upload" }
        ].forEach(function (item) {
            ['btn-' + item.id, 'menu-' + item.id].forEach(function (elId) {
                var el = document.getElementById(elId);
                if (el) {
                    el.onclick = function () {
                        frame.style.opacity = "0";
                        frame.src = item.url;
                    };
                }
            });
        });

        // --- 2. System Back Button (FIXED) ---
        navManager.onbackrequested = function (args) {
            try {
                // We check if we can access the frame's history safely
                if (frame.contentWindow && frame.contentWindow.history.length > 1) {
                    frame.style.opacity = "0";
                    frame.contentWindow.history.back();
                    args.handled = true;
                }
            } catch (e) {
                // If "Permission denied", we can't control the iframe history.
                // Optionally: navigate the frame back to a safe local page
                console.warn("External origin: Cannot access iframe history.");
            }
        };

        // --- 3. Iframe Load Logic (FIXED) ---
        frame.addEventListener("load", function () {
            updateAccentAndTheme();

            var canAccess = false;
            try {
                // Testing if we can read the location to determine origin
                var path = frame.contentWindow.location.pathname.toLowerCase();

                if (path.indexOf("home.html") !== -1 || frame.contentWindow.history.length <= 1) {
                    navManager.appViewBackButtonVisibility = Windows.UI.Core.AppViewBackButtonVisibility.collapsed;
                } else {
                    navManager.appViewBackButtonVisibility = Windows.UI.Core.AppViewBackButtonVisibility.visible;
                }
                canAccess = true;
            } catch (e) {
                // If we hit a cross-origin error, we default the back button to visible 
                // so the user isn't stuck on the external page.
                navManager.appViewBackButtonVisibility = Windows.UI.Core.AppViewBackButtonVisibility.visible;
            }

            frame.style.opacity = "1";
            WinJS.UI.Animation.enterContent(frame, { top: "0px", left: "40px" });
        });

        // --- 4. Search Logic ---
        if (searchElement && searchElement.winControl) {
            searchElement.winControl.addEventListener("querysubmitted", function (args) {
                if (args.detail && args.detail.queryText) {
                    frame.style.opacity = "0";
                    frame.src = 'apps.html?search=' + encodeURIComponent(args.detail.queryText.trim());
                }
            });
        }

        // --- 5. Theme Initialization ---
        uiSettings.oncolorvalueschanged = updateAccentAndTheme;
        updateAccentAndTheme();
    });

    function updateAccentAndTheme() {
        if (!uiSettings) return;

        var acc = uiSettings.getColorValue(Windows.UI.ViewManagement.UIColorType.accent);
        var accCol = "rgb(" + acc.r + "," + acc.g + "," + acc.b + ")";
        var bg = uiSettings.getColorValue(Windows.UI.ViewManagement.UIColorType.background);
        var isLight = (bg.r + bg.g + bg.b) > 382;

        // Update main window theme
        var themeLink = document.getElementById('winjs-theme');
        if (themeLink) {
            themeLink.href = isLight ? "winjs/ui-light.css" : "winjs/ui-dark.css";
        }
        if (document.documentElement) {
            document.documentElement.style.setProperty("--accent", accCol);
        }

        // Update iframe theme (THE TROUBLE SPOT)
        var frame = document.getElementById('app-frame');
        try {
            // This check will fail and jump to 'catch' if the iframe is on a different domain
            if (frame && frame.contentWindow && frame.contentWindow.location.href) {
                var innerDoc = frame.contentWindow.document;
                var innerTheme = innerDoc.getElementById('winjs-theme');

                if (innerTheme) {
                    innerTheme.href = isLight ? "winjs/ui-light.css" : "winjs/ui-dark.css";
                }
                if (innerDoc.documentElement) {
                    innerDoc.documentElement.style.setProperty("--accent", accCol);
                    innerDoc.documentElement.style.backgroundColor = "transparent";
                    if (innerDoc.body) {
                        innerDoc.body.style.backgroundColor = "transparent";
                        innerDoc.body.style.color = isLight ? "#000" : "#fff";
                    }
                }
            }
        } catch (e) {
            // Log the error silently; we simply can't style external pages
            console.warn("Cannot style external iframe due to security restrictions (Cross-Origin).");
        }
    }
})();