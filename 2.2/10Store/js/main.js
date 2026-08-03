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

        hamburgerBtn.onclick = function () {
            navMenu.show(hamburgerBtn, "bottom");
        };

        [
            { id: 'home', url: "home.html" },
            { id: 'apps', url: "apps.html" },
            { id: 'cache', url: "cache.html" },
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

        navManager.onbackrequested = function (args) {
            try {
                if (frame.contentWindow && frame.contentWindow.history.length > 1) {
                    frame.style.opacity = "0";
                    frame.contentWindow.history.back();
                    args.handled = true;
                }
            } catch (e) {
                console.warn("External origin: Cannot access iframe history.");
            }
        };

        frame.addEventListener("load", function () {
            updateAccentAndTheme();

            var canAccess = false;
            try {
                var path = frame.contentWindow.location.pathname.toLowerCase();

                if (path.indexOf("home.html") !== -1 || frame.contentWindow.history.length <= 1) {
                    navManager.appViewBackButtonVisibility = Windows.UI.Core.AppViewBackButtonVisibility.collapsed;
                } else {
                    navManager.appViewBackButtonVisibility = Windows.UI.Core.AppViewBackButtonVisibility.visible;
                }
                canAccess = true;
            } catch (e) {
                navManager.appViewBackButtonVisibility = Windows.UI.Core.AppViewBackButtonVisibility.visible;
            }

            frame.style.opacity = "1";
            WinJS.UI.Animation.enterContent(frame, { top: "0px", left: "40px" });
        });

        if (searchElement && searchElement.winControl) {
            var autoSuggestBox = searchElement.winControl;

            autoSuggestBox.addEventListener("suggestionsrequested", function (args) {
                var query = args.detail.queryText;
                var suggestionCollection = args.detail.searchSuggestionCollection;

                if (query.length > 0) {
                    var url = "https://api.bing.com/osjson.aspx?query=" + encodeURIComponent(query);

                    var promise = WinJS.xhr({ url: url }).then(function (res) {
                        var response = JSON.parse(res.responseText);
                        var suggestions = response[1];

                        for (var i = 0; i < suggestions.length; i++) {
                            suggestionCollection.appendQuerySuggestion(suggestions[i]);
                        }
                    }, function (err) {
                        console.error("Bing Suggest Error:", err);
                    });

                    args.detail.setPromise(promise);
                }
            });

            autoSuggestBox.addEventListener("querysubmitted", function (args) {
                if (args.detail && args.detail.queryText) {
                    frame.style.opacity = "0";
                    frame.src = 'apps.html?search=' + encodeURIComponent(args.detail.queryText.trim());
                }
            });
        }

        uiSettings.oncolorvalueschanged = updateAccentAndTheme;
        updateAccentAndTheme();
    });

    function updateAccentAndTheme() {
        if (!uiSettings) return;

        var acc = uiSettings.getColorValue(Windows.UI.ViewManagement.UIColorType.accent);
        var accCol = "rgb(" + acc.r + "," + acc.g + "," + acc.b + ")";
        var bg = uiSettings.getColorValue(Windows.UI.ViewManagement.UIColorType.background);
        var isLight = (bg.r + bg.g + bg.b) > 382;

        var themeLink = document.getElementById('winjs-theme');
        if (themeLink) {
            themeLink.href = isLight ? "winjs/ui-light.css" : "winjs/ui-dark.css";
        }
        if (document.documentElement) {
            document.documentElement.style.setProperty("--accent", accCol);
        }

        var frame = document.getElementById('app-frame');
        try {
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
            console.warn("Cannot style external iframe due to security restrictions (Cross-Origin).");
        }
    }
})();