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
        var accountBtn = document.getElementById("btn-account");
        var accountMenuEl = document.getElementById("account-menu");
        var menuControl = accountMenuEl ? accountMenuEl.winControl : null;

        // --- 1. INITIALIZE LOGIN ---
        // We wrap this in a timeout or check to ensure config.js variables exist
        if (typeof GITHUB_TOKEN !== 'undefined') {
            checkPersistentLogin();
        } else {
            console.error("Config variables not found. Check if config.js is loaded.");
        }

        // --- 2. AUTH UI HANDLING ---
        if (accountBtn && menuControl) {
            accountBtn.onclick = function () {
                menuControl.show(accountBtn, "bottom");
            };
        }

        var signInCmd = document.getElementById("menu-signin");
        if (signInCmd) {
            signInCmd.onclick = function () {
                runBroker("https://10storedraydenyt.netlify.app/auth");
            };
        }

        // --- 3. LOGIN FUNCTIONS ---
        function runBroker(requestUrl) {
            var callbackUri = Windows.Security.Authentication.Web.WebAuthenticationBroker.getCurrentApplicationCallbackUri();

            // SMART FIX: Check if we need to use '?' or '&'
            var separator = (requestUrl.indexOf('?') === -1) ? "?" : "&";
            var authUrl = requestUrl + separator + "redirect_uri=" + encodeURIComponent(callbackUri.absoluteUri);

            console.log("Opening Broker with URL: " + authUrl);

            Windows.Security.Authentication.Web.WebAuthenticationBroker.authenticateAsync(
                Windows.Security.Authentication.Web.WebAuthenticationOptions.none,
                new Windows.Foundation.Uri(authUrl),
                callbackUri
            ).done(function (result) {
                if (result.responseStatus === Windows.Security.Authentication.Web.WebAuthenticationStatus.success) {
                    parseAuthResult(result.responseData);
                }
            }, function (err) {
                console.error("Broker Error: " + err);
            });
        }

        function parseAuthResult(responseData) {
            if (responseData.indexOf("status=deleted") > -1) {
                logOut();
                return;
            }
            var email = extractParam(responseData, "email");
            var name = extractParam(responseData, "name");
            var photo = extractParam(responseData, "photo");

            if (email) {
                localSettings.values["userEmail"] = email;
                localSettings.values["userName"] = name;
                localSettings.values["userPhoto"] = photo;
                updateUI(email, name, photo);
            }
        }

        function checkPersistentLogin() {
            var savedEmail = localSettings.values["userEmail"];
            if (!savedEmail) return;

            // 1. Instant UI Update: Show the cached user immediately so the app feels fast
            var savedName = localSettings.values["userName"];
            var savedPhoto = localSettings.values["userPhoto"];
            updateUI(savedEmail, savedName, savedPhoto);

            var timestamp = new Date().getTime();
            var githubUrl = "https://api.github.com/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/58674893678349767895673789567983689937846987569263578245288656278572785426886532786578237858235782365623658236562356672357623656325667236524354627887326527347562826356236562652465624645674567.XML?t=" + timestamp;

            WinJS.xhr({
                url: githubUrl,
                headers: {
                    "Authorization": "token " + GITHUB_TOKEN,
                    "If-Modified-Since": "Mon, 26 Jul 1997 05:00:00 GMT"
                }
            }).done(function (req) {
                try {
                    var data = JSON.parse(req.responseText);
                    var cleanBase64 = data.content.replace(/\s/g, '');
                    var xmlString = decodeURIComponent(escape(window.atob(cleanBase64)));
                    var parser = new DOMParser();
                    var xmlDoc = parser.parseFromString(xmlString, "text/xml");
                    var users = xmlDoc.getElementsByTagName("user");
                    var found = false;

                    for (var i = 0; i < users.length; i++) {
                        var emailNode = users[i].getElementsByTagName("email")[0];
                        // IE-Safe text retrieval
                        var emailText = emailNode ? (emailNode.textContent || emailNode.text) : "";

                        if (emailText === savedEmail) {
                            var nameNode = users[i].getElementsByTagName("name")[0];
                            var photoNode = users[i].getElementsByTagName("photo")[0];

                            var name = nameNode ? (nameNode.textContent || nameNode.text) : "";
                            var photo = photoNode ? (photoNode.textContent || photoNode.text) : "";

                            // Update local storage if the info changed on the server
                            localSettings.values["userName"] = name;
                            localSettings.values["userPhoto"] = photo;

                            updateUI(savedEmail, name, photo);
                            found = true;
                            break;
                        }
                    }

                    // If the account was deleted from GitHub, force a logout
                    if (!found) {
                        console.warn("User no longer in database. Logging out.");
                        logOut();
                    }
                } catch (e) {
                    console.error("Persistence check failed, staying with cached data: " + e);
                }
            }, function (err) {
                // If GitHub is down (status 404 or 500), we just keep using the cached data
                console.warn("GitHub unreachable. Working in offline/cached mode.");
            });
        }

        function useCachedData(email) {
            var name = localSettings.values["userName"];
            var photo = localSettings.values["userPhoto"];
            updateUI(email, name, photo);
        }

        function updateUI(email, name, photo) {
            var accIcon = document.getElementById("account-icon");
            var accLabel = document.getElementById("account-label");
            var colors = ["#0078D7", "#D13438", "#107C10", "#8764B8", "#008272", "#69797E"];

            var displayName = name || email;
            var colorIndex = displayName.length % colors.length;
            var pickedColor = colors[colorIndex];
            var initial = displayName.charAt(0).toUpperCase();

            if (accIcon) {
                // Check if photo exists and isn't just an empty string or "null"
                if (photo && photo.trim() !== "" && photo !== "null") {
                    accIcon.innerHTML = '<img src="' + photo + '" style="' +
                        'width: 28px; ' +
                        'height: 28px; ' +
                        'border-radius: 50%; ' +
                        'object-fit: cover; ' +
                        'display: inline-block; ' +
                        'vertical-align: middle; ' +
                        'border: 1px solid rgba(255,255,255,0.2);' +
                        '" onerror="this.style.display=\'none\';" />';
                    // The onerror part handles cases where the URL is broken
                } else {
                    // Fallback to the colored initial circle
                    accIcon.innerHTML = '<div style="background:' + pickedColor + '; color:white; border-radius:50%; width:28px; height:28px; line-height:28px; text-align:center; font-weight:bold; font-size:12px; display:inline-block; vertical-align:middle;">' + initial + '</div>';
                }
            }

            if (accLabel) {
                accLabel.innerText = name || email.split('@')[0];
            }
            updateMenuForLoggedInState();
        }

        function updateMenuForLoggedInState() {
            var btnSignIn = document.getElementById("menu-signin");
            var btnLogOut = document.getElementById("menu-logout");
            var btnDelete = document.getElementById("menu-delete");

            if (btnSignIn) btnSignIn.style.display = "none";
            if (btnLogOut) {
                btnLogOut.style.display = "block";
                btnLogOut.onclick = logOut;
            }
            if (btnDelete) {
                btnDelete.style.display = "block";
                btnDelete.onclick = function () {
                    var userEmail = localSettings.values["userEmail"];
                    var deleteUrl = "https://10storedraydenyt.netlify.app/delete?email=" + encodeURIComponent(userEmail);

                    runBroker(deleteUrl);
                };
            }
        }

        function logOut() {
            localSettings.values["userEmail"] = null;
            localSettings.values["userName"] = null;
            localSettings.values["userPhoto"] = null;
            location.reload();
        }

        function extractParam(str, key) {
            var parts = str.split(key + "=");
            if (parts.length > 1) return decodeURIComponent(parts[1].split("&")[0]);
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