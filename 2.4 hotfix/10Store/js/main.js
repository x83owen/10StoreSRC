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
            return WinJS.xhr({
                url: "https://10storedraydenyt.netlify.app/playlist.xml",
                responseType: "document"
            }).then(function (res) {
                var doc = res.responseXML;
                var tracks = doc.getElementsByTagName("track");
                playlist = [];

                for (var i = 0; i < tracks.length; i++) {
                    var t = tracks[i];
                    var titleNode = t.getElementsByTagName("title")[0];
                    var urlNode = t.getElementsByTagName("url")[0];

                    if (titleNode && urlNode) {
                        playlist.push({
                            title: titleNode.textContent,
                            url: urlNode.textContent
                        });
                    }
                }

                if (playlist.length > 0 && currentIndex === -1) {
                    currentIndex = 0;
                    loadCurrentTrack();
                }
            }, function (err) {
                console.warn("Failed to load remote playlist.xml", err);
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

        updateAccentAndTheme();
        loadPlaylist();
    });

})();