(function () {
    "use strict";

    var uiSettings = null;
    var navManager = null;
    var isNavigating = false;

    try {
        if (typeof Windows !== "undefined") {
            uiSettings = new Windows.UI.ViewManagement.UISettings();
            navManager = Windows.UI.Core.SystemNavigationManager.getForCurrentView();
        }
    } catch (e) {
        console.warn("Windows APIs not available or initialized.", e);
    }

    WinJS.UI.processAll().then(function () {
        var frame = document.getElementById("app-frame");
        var wrapper = document.getElementById("webview-wrapper");
        var searchElement = document.getElementById("search");
        var hamburgerBtn = document.querySelector(".icon-btn");
        var navMenuElement = document.getElementById("nav-menu");
        var navMenu = navMenuElement ? navMenuElement.winControl : null;

        frame.addEventListener("MSWebViewPermissionRequested", function (e) {
            if (e.permissionRequest.type === "webviewLocalFolder") {
                e.permissionRequest.allow();
            }
        });

        function navigateWithAnimation(url) {
            if (isNavigating) return;

            if (wrapper && frame) {
                wrapper.style.opacity = "0";
                frame.navigate(url);
            }
        }

        function showNotification(title, body) {
            try {
                if (typeof Windows !== "undefined" && Windows.UI.Notifications) {
                    var notifications = Windows.UI.Notifications;
                    var template = notifications.ToastTemplateType.toastText02;
                    var toastXml = notifications.ToastNotificationManager.getTemplateContent(template);
                    var textNodes = toastXml.getElementsByTagName("text");
                    textNodes[0].appendChild(toastXml.createTextNode(title));
                    textNodes[1].appendChild(toastXml.createTextNode(body));
                    var toast = new notifications.ToastNotification(toastXml);
                    notifications.ToastNotificationManager.createToastNotifier().show(toast);
                }
            } catch (e) {
                console.warn("Notifications not available:", title, body);
            }
        }

        function updateWebViewUI(percent, text) {
            if (!frame || !frame.invokeScriptAsync) return;
            var script = "var pb = document.getElementById('dl-progress'); " +
                "var pt = document.getElementById('progress-text'); " +
                "if(pb) pb.value = " + percent + "; " +
                "if(pt) pt.innerText = '" + text + "';";
            try {
                frame.invokeScriptAsync("eval", [script]).start();
            } catch (e) { }
        }

        function resetWebViewUI() {
            if (!frame || !frame.invokeScriptAsync) return;
            var script = "var wrap = document.getElementById('progress-wrapper'); " +
                "var btn = document.getElementById('dl-btn'); " +
                "if(wrap) wrap.style.display = 'none'; " +
                "if(btn) { btn.disabled = false; btn.innerText = 'Download'; }";
            try {
                frame.invokeScriptAsync("eval", [script]).start();
            } catch (e) { }
        }

        if (frame) {
            frame.addEventListener("MSWebViewScriptNotify", function (e) {
                try {
                    var data = JSON.parse(e.value);

                    if (data.action === "downloadApp") {
                        var appName = data.appName;
                        var packageUrl = data.packageUrl;

                        showNotification(appName, "Starting download...");

                        var uri = new Windows.Foundation.Uri(packageUrl);
                        var downloader = new Windows.Networking.BackgroundTransfer.BackgroundDownloader();
                        var safeFileName = appName.replace(/[^a-z0-9]/gi, '_') + ".appx";

                        Windows.Storage.ApplicationData.current.localCacheFolder
                            .createFileAsync(safeFileName, Windows.Storage.CreationCollisionOption.replaceExisting)
                            .then(function (file) {
                                var download = downloader.createDownload(uri, file);

                                return download.startAsync().done(function () {
                                    updateWebViewUI(100, "Opening installer...");
                                    showNotification(appName, "Downloaded! Opening package...");
                                    Windows.System.Launcher.launchFileAsync(file);
                                    setTimeout(resetWebViewUI, 5000);

                                }, function (error) {
                                    console.error("Download Error", error);
                                    resetWebViewUI();
                                }, function (progress) {
                                    var percent = (progress.bytesReceived / progress.totalBytesToReceive) * 100;
                                    if (!isNaN(percent)) {
                                        updateWebViewUI(Math.floor(percent), Math.floor(percent) + "%");
                                    }
                                });
                            });
                    }
                } catch (err) {
                    console.error("Failed to handle script notify data:", err);
                }
            });
        }

        if (hamburgerBtn && navMenu) {
            hamburgerBtn.onclick = function () {
                navMenu.show(hamburgerBtn, "bottom");
            };
        }

        var navItems = [
            { id: 'home', url: `${pagehosturi}/home.html` },
            { id: 'apps', url: `${pagehosturi}/apps.html` },
            { id: 'cache', url: "ms-appx-web:///cache.html" },
            { id: 'upload', url: "https://drayai81isbacknotfor8storescripts.42web.io" }
        ];

        navItems.forEach(function (item) {
            ['btn-' + item.id, 'menu-' + item.id].forEach(function (elId) {
                var el = document.getElementById(elId);
                if (el) {
                    el.onclick = function () {
                        navigateWithAnimation(item.url);
                    };
                }
            });
        });

        if (navManager && frame) {
            navManager.onbackrequested = function (args) {
                if (isNavigating) {
                    args.handled = true;
                    return;
                }

                try {
                    if (frame.canGoBack) {
                        wrapper.style.opacity = "0";
                        frame.goBack();
                        args.handled = true;
                    }
                } catch (e) {
                    console.warn("Cannot access webview history.", e);
                }
            };

            frame.addEventListener("MSWebViewNavigationStarting", function () {
                isNavigating = true;

                if (wrapper) {
                    wrapper.style.opacity = "0";
                }
            });

            frame.addEventListener("MSWebViewNavigationCompleted", function (e) {
                isNavigating = false;

                if (!e.isSuccess) {
                    console.error("Navigation failed! Error code:", e.webErrorStatus);

                    if (wrapper) wrapper.style.opacity = "1";

                    var errorPage = "ms-appx-web:///msapp-error.html";
                    if (frame.src !== errorPage) {
                        frame.navigate(errorPage);
                    }
                    return;
                }

                updateAccentAndTheme();

                try {
                    if (!frame.canGoBack || frame.src.toLowerCase().indexOf("home.html") !== -1) {
                        navManager.appViewBackButtonVisibility = Windows.UI.Core.AppViewBackButtonVisibility.collapsed;
                    } else {
                        navManager.appViewBackButtonVisibility = Windows.UI.Core.AppViewBackButtonVisibility.visible;
                    }
                } catch (err) {
                    navManager.appViewBackButtonVisibility = Windows.UI.Core.AppViewBackButtonVisibility.visible;
                }

                setTimeout(function () {
                    if (wrapper) {
                        wrapper.style.opacity = "1";
                        WinJS.UI.Animation.enterContent(wrapper, { top: "0px", left: "40px" });
                    }
                }, 100);
            });
        }

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
                if (isNavigating) return;
                if (args.detail && args.detail.queryText && frame) {
                    wrapper.style.opacity = "0";
                    frame.navigate(`${pagehosturi}/apps.html?search=` + encodeURIComponent(args.detail.queryText.trim()));
                }

                if (isMobile.matches) {
                    searchBox.classList.remove("show");
                    searchToggle.classList.remove("hide");
                    document.getElementById("app-header").classList.remove("search-open");
                }
            });
        }

        var searchBox = document.getElementById("search");
        var searchToggle = document.getElementById("searchToggle");
        var isMobile = window.matchMedia("(max-width: 800px)");

        if (searchToggle && searchBox) {
            if (!isMobile.matches) {
                searchBox.classList.add("show");
                searchToggle.classList.add("hide");
            }

            searchToggle.addEventListener("click", function () {
                if (!isMobile.matches) return;

                searchToggle.classList.add("hide");
                searchBox.classList.add("show");
                document.getElementById("app-header").classList.add("search-open");

                setTimeout(function () {
                    var input = searchBox.querySelector("input");
                    if (input) {
                        if (input.setActive) input.setActive();
                        else input.focus();
                    }
                }, 50);
            });

            searchBox.addEventListener("focusout", function (e) {
                if (!searchBox.contains(e.relatedTarget)) {
                    searchBox.classList.remove("show");
                    searchToggle.classList.remove("hide");
                    document.getElementById("app-header").classList.remove("search-open");
                }
            });

            isMobile.addListener(function () {
                if (!isMobile.matches) {
                    searchBox.classList.add("show");
                    searchToggle.classList.add("hide");
                } else {
                    searchBox.classList.remove("show");
                    searchToggle.classList.remove("hide");
                }
            });
        }

        function getVal(parent, tag) {
            var el = parent.getElementsByTagName(tag)[0];
            return el ? el.textContent : "";
        }

        function updateLiveTiles(apps) {
            if (typeof Windows === 'undefined' || !Windows.UI.Notifications) return;

            var notifications = Windows.UI.Notifications;
            var tileUpdater = notifications.TileUpdateManager.createTileUpdaterForApplication();
            tileUpdater.enableNotificationQueue(true);
            tileUpdater.clear();
            var limit = Math.min(apps.length, 5);

            for (var i = 0; i < limit; i++) {
                var appNode = apps[i];
                var name = getVal(appNode, "name");
                var publisher = getVal(appNode, "publisher");
                var icon = getVal(appNode, "icon");
                var desc = getVal(appNode, "description");

                var escapeXml = function (str) {
                    return (str || "").replace(/[<>&'"]/g, function (c) {
                        return { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c];
                    });
                };

                var tileXml =
                    "<tile>" +
                    "  <visual version='2'>" +
                    "    <binding template='TileMedium'>" +
                    "      <image src='" + escapeXml(icon) + "' placement='peek'/>" +
                    "      <text hint-style='subtitle'>" + escapeXml(name) + "</text>" +
                    "      <text hint-style='captionSubtle' hint-wrap='true' hint-maxLines='2'>" + escapeXml(desc) + "</text>" +
                    "    </binding>" +
                    "    <binding template='TileWide'>" +
                    "      <image src='" + escapeXml(icon) + "' placement='peek'/>" +
                    "      <text hint-style='subtitle'>" + escapeXml(name) + "</text>" +
                    "      <text hint-style='captionSubtle' hint-wrap='true' hint-maxLines='2'>" + escapeXml(desc) + "</text>" +
                    "    </binding>" +
                    "    <binding template='TileLarge'>" +
                    "      <image src='" + escapeXml(icon) + "' placement='peek'/>" +
                    "      <text hint-style='title'>" + escapeXml(name) + "</text>" +
                    "      <text hint-style='subtitleSubtle'>" + escapeXml(publisher) + "</text>" +
                    "      <text hint-style='captionSubtle' hint-wrap='true' hint-maxLines='4'>" + escapeXml(desc) + "</text>" +
                    "    </binding>" +
                    "  </visual>" +
                    "</tile>";

                try {
                    var xmlDoc = new Windows.Data.Xml.Dom.XmlDocument();
                    xmlDoc.loadXml(tileXml);
                    var notification = new notifications.TileNotification(xmlDoc);
                    notification.tag = "featured_app_" + i;
                    tileUpdater.update(notification);
                } catch (err) {
                    console.warn("Tile Update Error for " + name + ":", err);
                }
            }
        }

        function loadAppsForLiveTile() {
            WinJS.xhr({
                url: `${server}`,
                headers: { "Cache-Control": "no-cache" }
            }).done(
                function (res) {
                    try {
                        var xml = res.responseXML || new DOMParser().parseFromString(res.responseText, "text/xml");

                        var allApps = xml.getElementsByTagName("app");
                        var featured = [];

                        var deviceFamily = "Windows.Desktop";
                        try { deviceFamily = Windows.System.Profile.AnalyticsInfo.versionInfo.deviceFamily; } catch (e) { }
                        var isPC = (deviceFamily === "Windows.Desktop");
                        var isMobile = (deviceFamily === "Windows.Mobile");

                        for (var j = 0; j < allApps.length; j++) {
                            var isFeat = getVal(allApps[j], "featured").toLowerCase().trim() === "true";
                            var canPC = getVal(allApps[j], "pcCapable").toLowerCase().trim() === "true";
                            var canMob = getVal(allApps[j], "mobileCapable").toLowerCase().trim() === "true";

                            if (isFeat && ((isPC && canPC) || (isMobile && canMob))) {
                                featured.push(allApps[j]);
                            }
                        }

                        for (var i = featured.length - 1; i > 0; i--) {
                            var k = Math.floor(Math.random() * (i + 1));
                            var temp = featured[i];
                            featured[i] = featured[k];
                            featured[k] = temp;
                        }

                        updateLiveTiles(featured);

                    } catch (err) {
                        console.error("Live Tiles: XML Processing failed.", err);
                    }
                },

                function (err) {
                    console.warn("Live Tiles: Server unreachable (Offline). Skipping update.");
                }
            );
        }

        if (uiSettings) {
            uiSettings.oncolorvalueschanged = updateAccentAndTheme;
        }

        var localSettings = Windows.Storage.ApplicationData.current.localSettings;
        var hasLaunched = localSettings.values["hasLaunched"];
        var startPage;

        if (!hasLaunched) {
            startPage = `${pagehosturi}/welcome.html`;
            localSettings.values["hasLaunched"] = true;
        } else {
            startPage = `${pagehosturi}/home.html`;
        }

        updateAccentAndTheme();
        loadAppsForLiveTile();
        navigateWithAnimation(startPage);
    });

    function updateAccentAndTheme() {
        if (!uiSettings) return;

        var acc = uiSettings.getColorValue(Windows.UI.ViewManagement.UIColorType.accent);
        var accCol = "rgb(" + acc.r + "," + acc.g + "," + acc.b + ")";
        var bg = uiSettings.getColorValue(Windows.UI.ViewManagement.UIColorType.background);
        var isLight = (bg.r + bg.g + bg.b) > 382;
        var themeLink = document.getElementById('winjs-theme');
        if (themeLink) {
            themeLink.href = isLight ? "lib/winjs-4.0.1/css/ui-light.css" : "lib/winjs-4.0.1/css/ui-dark.css";
        }

        try {
            if (document.documentElement && document.documentElement.style.setProperty) {
                document.documentElement.style.setProperty("--accent", accCol);
            }
        } catch (e) { }

        var frame = document.getElementById('app-frame');
        if (frame && frame.invokeScriptAsync) {
            var scriptString = `
                (function() {
                    try {
                        var isLight = ${isLight};
                        var innerTheme = document.getElementById('winjs-theme');
                        
                        if (innerTheme) {
                            innerTheme.href = isLight ? "ms-appx-web:///lib/winjs-4.0.1/css/ui-light.css" : "ms-appx-web:///lib/winjs-4.0.1/css/ui-dark.css";
                        }
                        
                        if (document.documentElement) {
                            if (document.documentElement.style.setProperty) {
                                document.documentElement.style.setProperty("--accent", "${accCol}");
                            }
                            document.documentElement.style.backgroundColor = "transparent";
                            
                            if (document.body) {
                                document.body.style.backgroundColor = "transparent";
                                document.body.style.color = isLight ? "#000" : "#fff";
                                
                                // Optional: Prevents text highlighting to feel like a native app
                                document.body.style.msUserSelect = "none";
                                document.body.style.userSelect = "none";
                            }
                        }
                        
                        window.addEventListener('dragstart', function(e) {
                            if (e.target && e.target.tagName === 'IMG') {
                                e.preventDefault();
                            }
                        }, false);

                        window.addEventListener('contextmenu', function(e) {
                            e.preventDefault();
                        }, false);

                    } catch (err) {
                        console.error("Error applying theme or scripts inside webview", err);
                    }
                })();
            `;

            try {
                var asyncOp = frame.invokeScriptAsync("eval", [scriptString]);
                asyncOp.start();
            } catch (err) {
                console.warn("Could not inject theme into webview.", err);
            }
        }
    }

})();