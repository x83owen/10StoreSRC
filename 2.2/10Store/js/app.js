(function () {
    "use strict";

    // --- 1. CONFIGURATION ---
    // Changed 'const' to 'var' for IE11 compatibility
    var APPS_FILE_PATH = "apps.xml";
    var BASE_API = "https://api.github.com/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/";

    function getQueryParam(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
        var results = regex.exec(window.location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    var appId = getQueryParam('id');

    // --- 2. DATA LOADING (IE11 Compatible XMLHttpRequest) ---
    // Removed 'async' and replaced 'fetch' with 'XMLHttpRequest'
    function loadAppData() {
        console.log("Fetching App Data from GitHub...");
        var API_URL = BASE_API + APPS_FILE_PATH;

        var xhr = new XMLHttpRequest();
        xhr.open("GET", API_URL, true);
        xhr.setRequestHeader("Authorization", "token " + GITHUB_TOKEN.trim());

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        var data = JSON.parse(xhr.responseText);

                        // Decode Base64 content from GitHub (IE11 safe atob)
                        var xmlText = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));
                        var parser = new DOMParser();
                        var xml = parser.parseFromString(xmlText, "text/xml");

                        if (!xml) return;

                        var apps = xml.getElementsByTagName("app");
                        var targetApp = null;

                        for (var i = 0; i < apps.length; i++) {
                            if (apps[i].getAttribute("id") === appId) {
                                targetApp = apps[i];
                                break;
                            }
                        }

                        if (targetApp) {
                            renderApp(targetApp);
                        } else {
                            var contentEl = document.getElementById("app-content");
                            if (contentEl) contentEl.innerHTML = "App not found.";
                        }
                    } catch (err) {
                        console.error("GitHub App Load Error:", err);
                    }
                }
            }
        };
        xhr.send();
    }

    // --- 3. UI RENDERING ---
    function renderApp(app) {
        var name = getVal(app, "name");
        var version = getVal(app, "version");
        var icon = getVal(app, "icon");
        var pub = getVal(app, "publisher");
        var desc = getVal(app, "description");
        var packageUrl = getVal(app, "package");

        // Replaced template literals with standard string concatenation
        var html =
            '<div class="app-hero">' +
            '<img src="' + icon + '" class="app-logo-big">' +
            '<div class="app-info-right">' +
            '<div class="app-title">' + name + '</div>' +
            '<a class="app-publisher" href="apps.html?search=' + encodeURIComponent(pub) + '">' + pub + '</a>' +
            '<div class="app-version">Version ' + version + '</div>' +
            '<div id="dl-container">' +
            '<button class="win-button btn-download" id="dl-btn">Download</button>' +
            '<div id="progress-wrapper" style="display:none; width:100%;">' +
            '<progress id="dl-progress"></progress>' +
            '<div id="progress-text">Downloading...</div>' +
            '</div>' +
            '</div>' +
            '<div class="app-description">' + desc + '</div>' +
            '</div>' +
            '</div>';

        document.title = name;
        var contentEl = document.getElementById("app-content");
        if (contentEl) contentEl.innerHTML = html;

        var dlBtn = document.getElementById("dl-btn");
        if (dlBtn) {
            dlBtn.onclick = function () {
                var btn = this;
                var progressWrapper = document.getElementById("progress-wrapper");
                var progressBar = document.getElementById("dl-progress");
                var progressText = document.getElementById("progress-text");

                btn.disabled = true;
                progressWrapper.style.display = "block";

                showNotification(name, "Starting download...");

                sendDiscordNotification(name, function () {
                    try {
                        var uri = new Windows.Foundation.Uri(packageUrl);
                        var downloader = new Windows.Networking.BackgroundTransfer.BackgroundDownloader();

                        Windows.Storage.ApplicationData.current.localCacheFolder.createFileAsync(name + ".appx", Windows.Storage.CreationCollisionOption.replaceExisting)
                            .then(function (file) {
                                var download = downloader.createDownload(uri, file);

                                return download.startAsync().done(function () {
                                    progressBar.value = 100;
                                    progressText.innerText = "Opening installer...";
                                    showNotification(name, "Downloaded! Opening package...");
                                    Windows.System.Launcher.launchFileAsync(file);

                                    setTimeout(function () {
                                        progressWrapper.style.display = "none";
                                        btn.disabled = false;
                                        btn.innerText = "Download";
                                    }, 7000);

                                }, function (error) {
                                    progressWrapper.style.display = "none";
                                    btn.disabled = false;
                                }, function (progress) {
                                    var percent = (progress.bytesReceived / progress.totalBytesToReceive) * 100;
                                    if (!isNaN(percent)) {
                                        progressBar.value = percent;
                                        progressText.innerText = Math.floor(percent) + "%";
                                    }
                                });
                            });
                    } catch (e) {
                        window.open(packageUrl, '_blank');
                        setTimeout(function () {
                            if (progressWrapper) progressWrapper.style.display = "none";
                            btn.disabled = false;
                        }, 7000);
                    }
                });
            };
        }
    }

    // --- 4. HELPERS ---
    function showNotification(title, body) {
        try {
            var notifications = Windows.UI.Notifications;
            var template = notifications.ToastTemplateType.toastText02;
            var toastXml = notifications.ToastNotificationManager.getTemplateContent(template);
            var textNodes = toastXml.getElementsByTagName("text");
            textNodes[0].appendChild(toastXml.createTextNode(title));
            textNodes[1].appendChild(toastXml.createTextNode(body));
            var toast = new notifications.ToastNotification(toastXml);
            notifications.ToastNotificationManager.createToastNotifier().show(toast);
        } catch (e) {
            console.error("Notifications only work in UWP container", e);
        }
    }

    function sendDiscordNotification(appName, callback) {
        var webhook = "https://discord.com/api/webhooks/1472961404528099527/L9PAUtmL0kPoZsIePkLEUu4G-yVKbDsxlW15F98eTS2QW1DB58saGaIG2vreheFWyINA";
        var payload = JSON.stringify({ content: "**" + appName + "** was downloaded!" });
        var xhr = new XMLHttpRequest();
        xhr.open("POST", webhook, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) { callback(); }
        };
        xhr.onerror = function () { callback(); };
        xhr.send(payload);
    }

    function getVal(parent, tag) {
        var el = parent.getElementsByTagName(tag)[0];
        return el ? el.textContent : "";
    }

    // Start
    if (appId) { loadAppData(); }
})();