(function () {
    "use strict";

    var APPS_FILE_PATH = "apps.xml";
    var API_URL = "https://api.github.com/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/" + APPS_FILE_PATH;

    var deviceFamily = "Windows.Desktop";

    try {
        if (typeof Windows !== 'undefined') {
            deviceFamily = Windows.System.Profile.AnalyticsInfo.versionInfo.deviceFamily;
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
        if (titleEl) {
            titleEl.innerText = searchQuery ? searchQuery : "All apps";
        }

        console.log("Fetching apps from GitHub...");

        var grid = document.getElementById("apps-grid");

        var xhr = new XMLHttpRequest();
        xhr.open("GET", API_URL, true);
        xhr.setRequestHeader("Authorization", "token " + GITHUB_TOKEN.trim());

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        var data = JSON.parse(xhr.responseText);

                        var xmlText = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));
                        var parser = new DOMParser();
                        var xmlDoc = parser.parseFromString(xmlText, "text/xml");

                        if (!xmlDoc || xmlDoc.getElementsByTagName("parsererror").length > 0) {
                            throw new Error("Invalid XML received from GitHub.");
                        }

                        var allApps = xmlDoc.getElementsByTagName("app");
                        var query = searchQuery ? searchQuery.toLowerCase().trim() : null;

                        fillGrid(grid, allApps, function (app) {
                            if (!query) return true;
                            var appName = getVal(app, "name").toLowerCase();
                            var appPub = getVal(app, "publisher").toLowerCase();
                            return (appName.indexOf(query) !== -1 || appPub.indexOf(query) !== -1);
                        });

                    } catch (err) {
                        console.error("Init Error:", err);
                        if (grid) grid.innerHTML = "<div style='padding:20px; color:red;'>Error: " + err.message + "</div>";
                    }
                } else {
                    if (grid) grid.innerHTML = "<div style='padding:20px; color:red;'>Error: GitHub API access denied.</div>";
                }
            }
        };
        xhr.send();
    }

    function fillGrid(grid, apps, filter) {
        var idx = 0;
        if (!grid) return;
        grid.innerHTML = "";

        for (var j = 0; j < apps.length; j++) {
            if (filter(apps[j]) && isCompatible(apps[j])) {
                var wrapper = document.createElement("div");
                wrapper.className = "win-container win-focusable";

                var card = document.createElement("div");
                card.className = "app-card win-item";
                card.style.transitionDelay = (idx * 50) + "ms";

                var id = apps[j].getAttribute("id");

                card.innerHTML =
                    '<img class="win-item-image" src="' + getVal(apps[j], "icon") + '">' +
                    '<div class="app-card-info">' +
                    '<div class="app-name win-type-base win-type-ellipsis">' + getVal(apps[j], "name") + '</div>' +
                    '<div class="win-type-caption win-type-ellipsis" style="opacity:0.6;">' + getVal(apps[j], "publisher") + '</div>' +
                    '</div>';

                wrapper.onclick = (function (appId) {
                    return function () { window.location.href = 'app.html?id=' + appId; };
                })(id);

                wrapper.appendChild(card);
                grid.appendChild(wrapper);

                (function (c) {
                    setTimeout(function () { c.classList.add("visible"); }, 50);
                })(card);

                idx++;
            }
        }

        if (idx === 0) {
            grid.innerHTML = "<div style='padding:20px; opacity:0.6;'>No apps found.</div>";
        }
    }

    function isCompatible(appNode) {
        var canPC = getVal(appNode, "pcCapable").toLowerCase().trim() === "true";
        var canMobile = getVal(appNode, "mobileCapable").toLowerCase().trim() === "true";
        return (isMobile && canMobile) || (isPC && canPC);
    }

    function getVal(parent, tag) {
        var el = parent.getElementsByTagName(tag)[0];
        return el ? el.textContent : "";
    }

    if (document.readyState === "complete" || document.readyState === "interactive") {
        init();
    } else {
        document.addEventListener("DOMContentLoaded", init);
    }
})();