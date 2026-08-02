(function () {
    "use strict";

    var uiSettings = null;
    var navManager = null;
    var systemControls = null;

    try {
        if (typeof Windows !== "undefined") {
            uiSettings = new Windows.UI.ViewManagement.UISettings();
            navManager = Windows.UI.Core.SystemNavigationManager.getForCurrentView();
            systemControls = Windows.Media.SystemMediaTransportControls.getForCurrentView();
        }
    } catch (e) {
        console.warn("Windows APIs not available or initialized.", e);
    }

    WinJS.UI.processAll().then(function () {
        var frame = document.getElementById("app-frame");
        var searchElement = document.getElementById("search");
        var hamburgerBtn = document.querySelector(".icon-btn");
        var audio = document.getElementById("audioPlayer");
        var npTitle = document.getElementById("np-title");
        var navMenuElement = document.getElementById("nav-menu");
        var navMenu = navMenuElement ? navMenuElement.winControl : null;
        var mediaBarElement = document.getElementById("mediaBar");
        var mediaBar = mediaBarElement ? mediaBarElement.winControl : null;
        var playPauseBtnElement = document.getElementById("cmdPlayPause");
        var playPauseBtn = playPauseBtnElement ? playPauseBtnElement.winControl : null;
        var nextBtn = document.getElementById("cmdNext");
        var prevBtn = document.getElementById("cmdPrev");
        var playlist = [];
        var currentIndex = -1;

        if (systemControls) {
            systemControls.isEnabled = true;
            systemControls.isPlayEnabled = true;
            systemControls.isPauseEnabled = true;
            systemControls.isNextEnabled = true;
            systemControls.isPreviousEnabled = true;

            systemControls.addEventListener("buttonpressed", function (args) {
                switch (args.button) {
                    case Windows.Media.SystemMediaTransportControlsButton.play:
                        playCurrent();
                        break;
                    case Windows.Media.SystemMediaTransportControlsButton.pause:
                        if (audio) audio.pause();
                        break;
                    case Windows.Media.SystemMediaTransportControlsButton.next:
                        nextTrack();
                        break;
                    case Windows.Media.SystemMediaTransportControlsButton.previous:
                        prevTrack();
                        break;
                }
            });

            if (audio) {
                audio.addEventListener("playing", function () {
                    systemControls.playbackStatus = Windows.Media.MediaPlaybackStatus.playing;
                });
                audio.addEventListener("pause", function () {
                    systemControls.playbackStatus = Windows.Media.MediaPlaybackStatus.paused;
                });
            }
        }

        function loadPlaylist() {
            if (typeof GITHUB_OWNER === 'undefined' || typeof GITHUB_TOKEN === 'undefined') {
                console.error("Music: GitHub configuration missing.");
                return;
            }

            var PLAYLIST_PATH = "playlist.xml";
            var API_URL = "https://api.github.com/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/" + PLAYLIST_PATH;

            return WinJS.xhr({
                url: API_URL,
                headers: { "Authorization": "token " + GITHUB_TOKEN.trim() }
            }).then(function (res) {
                try {
                    // 1. Parse GitHub JSON and decode Base64 XML
                    var data = JSON.parse(res.responseText);
                    var xmlText = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));

                    // 2. Parse the XML string
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(xmlText, "text/xml");
                    var tracks = doc.getElementsByTagName("track");

                    var tempPlaylist = [];

                    // 3. Extract track data
                    for (var i = 0; i < tracks.length; i++) {
                        var t = tracks[i];
                        var titleNode = t.getElementsByTagName("title")[0];
                        var urlNode = t.getElementsByTagName("url")[0];

                        if (titleNode && urlNode) {
                            tempPlaylist.push({
                                title: titleNode.textContent,
                                url: urlNode.textContent
                            });
                        }
                    }

                    // 4. SHUFFLE LOGIC: Randomize the playlist order
                    for (var j = tempPlaylist.length - 1; j > 0; j--) {
                        var k = Math.floor(Math.random() * (j + 1));
                        var temp = tempPlaylist[j];
                        tempPlaylist[j] = tempPlaylist[k];
                        tempPlaylist[k] = temp;
                    }

                    // 5. Update the global playlist variable
                    playlist = tempPlaylist;

                    if (playlist.length > 0 && currentIndex === -1) {
                        currentIndex = 0;
                        loadCurrentTrack();
                    }

                    console.log("Music: Loaded and randomized " + playlist.length + " tracks from GitHub.");
                } catch (err) {
                    console.error("Music: Failed to process playlist XML.", err);
                }
            }, function (err) {
                console.warn("Music: Failed to load playlist from GitHub.", err);
            });
        }

        function loadCurrentTrack() {
            if (currentIndex < 0 || currentIndex >= playlist.length || !audio) return;

            var item = playlist[currentIndex];
            if (npTitle) npTitle.textContent = item.title || "Unknown track";
            audio.src = item.url;

            if (systemControls) {
                var updater = systemControls.displayUpdater;
                updater.type = Windows.Media.MediaPlaybackType.music;
                updater.musicProperties.title = item.title || "Unknown track";
                updater.update();
            }
        }

        function playCurrent() {
            if (!audio) return;
            if (!audio.src && playlist.length > 0 && currentIndex >= 0) {
                loadCurrentTrack();
            }
            audio.play();
        }

        function nextTrack() {
            if (playlist.length === 0) return;
            currentIndex = (currentIndex + 1) % playlist.length;
            loadCurrentTrack();
            if (audio) audio.play();
        }

        function prevTrack() {
            if (playlist.length === 0) return;
            currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
            loadCurrentTrack();
            if (audio) audio.play();
        }

        if (playPauseBtn && audio) {
            playPauseBtn.onclick = function () {
                audio.paused ? playCurrent() : audio.pause();
            };

            audio.addEventListener("playing", function () { playPauseBtn.icon = "pause"; });
            audio.addEventListener("pause", function () { playPauseBtn.icon = "play"; });
            audio.addEventListener("ended", function () {
                playPauseBtn.icon = "play";
                nextTrack();
            });
        }

        if (nextBtn) nextBtn.addEventListener("click", nextTrack);
        if (prevBtn) prevBtn.addEventListener("click", prevTrack);
        if (mediaBar) mediaBar.closedDisplayMode = "compact";

        if (hamburgerBtn && navMenu) {
            hamburgerBtn.onclick = function () {
                navMenu.show(hamburgerBtn, "bottom");
            };
        }

        var navItems = [
            { id: 'home', url: "home.html" },
            { id: 'apps', url: "apps.html" },
            { id: 'cache', url: "cache.html" },
            { id: 'upload', url: "https://10storedraydenyt.netlify.app/upload" }
        ];

        navItems.forEach(function (item) {
            ['btn-' + item.id, 'menu-' + item.id].forEach(function (elId) {
                var el = document.getElementById(elId);
                if (el && frame) {
                    el.onclick = function () {
                        frame.style.opacity = "0";
                        frame.src = item.url;
                    };
                }
            });
        });

        if (navManager && frame) {
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
                try {
                    var path = frame.contentWindow.location.pathname.toLowerCase();
                    if (path.indexOf("home.html") !== -1 || frame.contentWindow.history.length <= 1) {
                        navManager.appViewBackButtonVisibility = Windows.UI.Core.AppViewBackButtonVisibility.collapsed;
                    } else {
                        navManager.appViewBackButtonVisibility = Windows.UI.Core.AppViewBackButtonVisibility.visible;
                    }
                } catch (e) {
                    navManager.appViewBackButtonVisibility = Windows.UI.Core.AppViewBackButtonVisibility.visible;
                }
                frame.style.opacity = "1";
                WinJS.UI.Animation.enterContent(frame, { top: "0px", left: "40px" });
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
                if (args.detail && args.detail.queryText && frame) {
                    frame.style.opacity = "0";
                    frame.src = 'apps.html?search=' + encodeURIComponent(args.detail.queryText.trim());
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

                // Apply header padding change
                document.getElementById("app-header").classList.add("search-open");

                // Focus input (your working version)
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

        // --- LIVE TILE LOGIC ---
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

            // Limit to 5 notifications (Windows Max)
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

                // Adaptive XML with Peek (flip animation) and Descriptions
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

                    // Unique tags help Windows animate the "flip" between apps in the queue
                    notification.tag = "featured_app_" + i;
                    tileUpdater.update(notification);
                } catch (err) {
                    console.warn("Tile Update Error for " + name + ":", err);
                }
            }
        }

        function loadAppsForLiveTile() {
            if (typeof GITHUB_OWNER === 'undefined' || typeof GITHUB_TOKEN === 'undefined') return;

            var API_URL = "https://api.github.com/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/apps.xml";

            WinJS.xhr({
                url: API_URL,
                headers: { "Authorization": "token " + GITHUB_TOKEN.trim() }
            }).done(function (res) {
                try {
                    var data = JSON.parse(res.responseText);
                    var xmlText = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));
                    var parser = new DOMParser();
                    var xml = parser.parseFromString(xmlText, "text/xml");

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

                    // --- SHUFFLE LOGIC START ---
                    // Randomize the order of the featured apps array
                    for (var i = featured.length - 1; i > 0; i--) {
                        var k = Math.floor(Math.random() * (i + 1));
                        var temp = featured[i];
                        featured[i] = featured[k];
                        featured[k] = temp;
                    }
                    // --- SHUFFLE LOGIC END ---

                    updateLiveTiles(featured);
                } catch (err) {
                    console.error("Live Tiles: XML Processing failed.", err);
                }
            });
        }

        if (uiSettings) {
            uiSettings.oncolorvalueschanged = updateAccentAndTheme;
        }
        updateAccentAndTheme();
        loadPlaylist();
        loadAppsForLiveTile();
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
        try {
            if (frame && frame.contentWindow && frame.contentWindow.location.href) {
                var innerDoc = frame.contentWindow.document;
                var innerTheme = innerDoc.getElementById('winjs-theme');

                if (innerTheme) {
                    innerTheme.href = isLight ? "lib/winjs-4.0.1/css/ui-light.css" : "lib/winjs-4.0.1/css/ui-dark.css";
                }
                if (innerDoc.documentElement) {
                    try {
                        if (innerDoc.documentElement.style.setProperty) {
                            innerDoc.documentElement.style.setProperty("--accent", accCol);
                        }
                    } catch (e) { }

                    innerDoc.documentElement.style.backgroundColor = "transparent";
                    if (innerDoc.body) {
                        innerDoc.body.style.backgroundColor = "transparent";
                        innerDoc.body.style.color = isLight ? "#000" : "#fff";
                    }
                }
            }
        } catch (e) {
        }
    }

})();