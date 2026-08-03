(function () {
    "use strict";

    var deviceFamily = "Windows.Desktop";
    var ui = null;
    var themeStyle = null;

    // --- INITIALIZE WINDOWS NAMESPACES ---
    try {
        if (typeof Windows !== 'undefined') {
            deviceFamily = Windows.System.Profile.AnalyticsInfo.versionInfo.deviceFamily;
            ui = new Windows.UI.ViewManagement.UISettings();

            // Create style injector
            themeStyle = document.createElement('style');
            document.head.appendChild(themeStyle);
        }
    } catch (e) {
        console.warn("WinRT namespaces not found.");
    }

    var isMobile = (deviceFamily === "Windows.Mobile");
    var isPC = (deviceFamily === "Windows.Desktop");

    function getQueryParam(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
        var results = regex.exec(window.location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    var searchQuery = getQueryParam('search');

    function init() {
        var titleEl = document.getElementById("display-title");
        if (searchQuery) {
            titleEl.innerText = searchQuery;
        } else {
            titleEl.innerText = "All apps";
        }

        var xhr = new XMLHttpRequest();
        xhr.open("GET", "https://drayaiupdatehost.netlify.app/10store/apps.xml?t=" + new Date().getTime(), true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                if (!xhr.responseXML) {
                    var grid = document.getElementById("apps-grid");
                    if (grid) grid.innerHTML = "<div style='padding:20px; color:red;'>Error: apps.xml is invalid.</div>";
                    return;
                }
                processApps(xhr.responseXML);

                // CALL THEME UPDATE AFTER APPS LOAD
                if (ui) {
                    updateTheme();
                    ui.addEventListener("colorvalueschanged", updateTheme);
                }
            }
        };
        xhr.send();
    }

    function processApps(xml) {
        var grid = document.getElementById("apps-grid");
        var apps = xml.getElementsByTagName("app");
        if (!grid) return;
        grid.innerHTML = "";

        var visibleIndex = 0;
        var query = searchQuery ? searchQuery.toLowerCase().trim() : null;

        for (var i = 0; i < apps.length; i++) {
            var appNode = apps[i];
            var appName = getVal(appNode, "name").toLowerCase().trim();
            var appPub = getVal(appNode, "publisher").toLowerCase().trim();

            if (isCompatible(appNode)) {
                if (!query || appName.indexOf(query) !== -1 || appPub.indexOf(query) !== -1) {
                    renderCard(grid, appNode, visibleIndex);
                    visibleIndex++;
                }
            }
        }

        if (visibleIndex === 0) {
            grid.innerHTML = "<div style='padding:20px; opacity:0.6;'>No apps found.</div>";
        }
    }

    function renderCard(container, node, index) {
        var id = node.getAttribute("id");
        var card = document.createElement("div");
        card.className = "app-card";
        card.style.transitionDelay = (index * 40) + "ms";

        card.innerHTML = '<img src="' + getVal(node, "icon") + '">' +
            '<div class="app-name">' + getVal(node, "name") + '</div>' +
            '<div class="app-pub">' + getVal(node, "publisher") + '</div>';

        card.onclick = function () { window.location.href = "app.html?id=" + id; };
        container.appendChild(card);

        setTimeout(function () {
            card.classList.add("visible");
        }, 50);
    }

    function isCompatible(appNode) {
        var canPC = getVal(appNode, "pcCapable").toLowerCase().trim() === "true";
        var canMobile = getVal(appNode, "mobileCapable").toLowerCase().trim() === "true";
        if (isMobile && !canMobile) return false;
        if (isPC && !canPC) return false;
        return true;
    }

    function getVal(parent, tag) {
        var el = parent.getElementsByTagName(tag)[0];
        return el ? el.textContent : "";
    }

    function updateTheme() {
        if (!ui || !themeStyle) return;

        var bg = ui.getColorValue(Windows.UI.ViewManagement.UIColorType.background);
        var isLight = (bg.r + bg.g + bg.b) > 382;

        var textColor = isLight ? "#000000" : "#ffffff";
        var borderColor = isLight ? "#e5e5e5" : "#333333";
        var hoverColor = isLight ? "#f2f2f2" : "#3d3d3d";

        document.body.style.color = textColor;

        themeStyle.innerHTML = `
            .app-card { 
                border-color: ${borderColor} !important; 
                color: ${textColor} !important;
            }
            .app-card:hover { 
                background-color: ${hoverColor} !important; 
            }
            .app-pub { color: ${textColor} !important; opacity: 0.6; }
        `;
    }

    document.addEventListener("DOMContentLoaded", init);
})();