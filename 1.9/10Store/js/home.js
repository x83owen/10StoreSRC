(function () {
    "use strict";

    var deviceFamily = "Windows.Desktop";

    try {
        deviceFamily = Windows.System.Profile.AnalyticsInfo.versionInfo.deviceFamily;
    } catch (e) {
        console.warn("WinRT namespaces not found.");
    }

    var isMobile = (deviceFamily === "Windows.Mobile");
    var isPC = (deviceFamily === "Windows.Desktop");

    function loadHomeContent() {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "https://10storedraydenyt.netlify.app/apps.xml?t=" + new Date().getTime(), true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var xml = xhr.responseXML;

                    if (!xml) {
                        console.error("XML Parse Error: responseXML is null. Check apps.xml for syntax errors.");
                        var errDiv = document.createElement("div");
                        errDiv.style.color = "red";
                        errDiv.style.padding = "20px";
                        errDiv.innerText = "Error: apps.xml contains a syntax error (e.g. unclosed tag or invalid character). App cannot load.";
                        document.getElementById("scroll-container").appendChild(errDiv);
                        return;
                    }

                    var scrollContainer = document.getElementById("scroll-container");
                    if (!scrollContainer) return;

                    scrollContainer.innerHTML = "";

                    var categories = xml.getElementsByTagName("category");
                    var allApps = xml.getElementsByTagName("app");

                    for (var i = 0; i < categories.length; i++) {
                        var catTitle = categories[i].getAttribute("title");
                        var catType = categories[i].getAttribute("type");

                        var grid = document.createElement("div");
                        grid.className = "app-grid";

                        if (catType === "featured") {
                            fillGrid(grid, allApps, function (app) {
                                return getVal(app, "featured").toLowerCase().trim() === "true";
                            });
                        } else if (catType === "picks") {
                            var ids = getVal(categories[i], "appIds").replace(/\s/g, "").split(",");
                            fillGrid(grid, allApps, function (app) {
                                return ids.indexOf(app.getAttribute("id")) !== -1;
                            });
                        }

                        if (grid.hasChildNodes()) {
                            var h2 = document.createElement("h2");
                            h2.className = "section-title";
                            h2.textContent = catTitle;
                            scrollContainer.appendChild(h2);
                            scrollContainer.appendChild(grid);
                        }
                    }
                    appendNavigation(scrollContainer);
                } else {
                    console.error("Failed to load apps.xml: " + xhr.status);
                }
            }
        };
        xhr.send();
    }

    function isCompatible(appNode) {
        var canPC = getVal(appNode, "pcCapable").toLowerCase().trim() === "true";
        var canMobile = getVal(appNode, "mobileCapable").toLowerCase().trim() === "true";

        if (isMobile && !canMobile) return false;
        if (isPC && !canPC) return false;

        return true;
    }

    function fillGrid(grid, apps, categoryFilter) {
        var visibleIndex = 0;

        for (var j = 0; j < apps.length; j++) {
            var appNode = apps[j];

            if (categoryFilter(appNode) && isCompatible(appNode)) {
                var appId = appNode.getAttribute("id");
                var card = document.createElement("div");
                card.className = "app-card";
                card.style.transitionDelay = (visibleIndex * 40) + "ms";

                card.innerHTML = '<img src="' + getVal(appNode, "icon") + '">' +
                    '<div class="app-name">' + getVal(appNode, "name") + '</div>' +
                    '<div class="app-pub">' + getVal(appNode, "publisher") + '</div>';

                (function (id, currentCard) {
                    var navigate = function () { window.location.href = 'app.html?id=' + id; };
                    currentCard.addEventListener("click", navigate, false);
                    setTimeout(function () { currentCard.classList.add("visible"); }, 50);
                })(appId, card);

                grid.appendChild(card);
                visibleIndex++;
            }
        }
    }

    function appendNavigation(container) {
        var title = document.createElement("h2");
        title.className = "section-title";
        title.textContent = "Navigation";
        container.appendChild(title);

        var grid = document.createElement("div");
        grid.className = "app-grid";

        var links = [
            { name: "All apps", url: "apps.html", icon: "https://cdn-icons-png.flaticon.com/512/2387/2387661.png" },
            { name: "Upload", url: "https://drayaiupdatehost.netlify.app/10store/upload.html", icon: "https://cdn-icons-png.flaticon.com/512/9326/9326001.png" }
        ];

        for (var i = 0; i < links.length; i++) {
            var navCard = document.createElement("div");
            navCard.className = "app-card";
            navCard.style.transitionDelay = (i * 40) + "ms";
            navCard.innerHTML = '<img src="' + links[i].icon + '"><div class="app-name">' + links[i].name + '</div><div class="app-pub">System</div>';

            (function (dest, currentNav) {
                currentNav.onclick = function () { window.location.href = dest; };
                setTimeout(function () { currentNav.classList.add("visible"); }, 100);
            })(links[i].url, navCard);

            grid.appendChild(navCard);
        }
        container.appendChild(grid);
    }

    function getVal(parent, tag) {
        var el = parent.getElementsByTagName(tag)[0];
        return el ? el.textContent : "";
    }

    (function () {
        if (typeof Windows === 'undefined') return;
        var ui = new Windows.UI.ViewManagement.UISettings();

        // Create a style element once and add it to the head
        var themeStyle = document.createElement('style');
        document.head.appendChild(themeStyle);

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

        // Run immediately
        updateTheme();

        // The system event is instant (no delay)
        ui.addEventListener("colorvalueschanged", updateTheme);
    })();

    document.addEventListener("DOMContentLoaded", loadHomeContent);
})();