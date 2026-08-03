(function () {
    function getQueryParam(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
        var results = regex.exec(window.location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    var appId = getQueryParam('id');

    function loadAppData() {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "https://10storedraydenyt.netlify.app/apps.xml?t=" + new Date().getTime(), true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                var xml = xhr.responseXML;
                if (!xml) {
                    document.getElementById("app-content").innerHTML = "<div style='padding:40px; color:red'>Error loading app data. XML is invalid.</div>";
                    return;
                }
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
                    document.getElementById("app-content").innerHTML = "<div style='padding:40px;'>App not found.</div>";
                }
            }
        };
        xhr.send();
    }

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
        } catch (e) { console.error("Notifications only work in UWP container", e); }
    }

    function renderApp(app) {
        var name = getVal(app, "name");
        var version = getVal(app, "version");
        var icon = getVal(app, "icon");
        var pub = getVal(app, "publisher");
        var desc = getVal(app, "description");
        var packageUrl = getVal(app, "package");

        var html =
            '<div class="app-hero">' +
            '<img src="' + icon + '" class="app-logo-big">' +
            '<div class="app-info-right">' +
            '<div class="app-title">' + name + '</div>' +
            '<a class="app-publisher" href="apps.html?search=' + encodeURIComponent(pub) + '">' + pub + '</a>' +
            '<div class="app-version">Version ' + version + '</div>' +
            '<div id="dl-container">' +
            '<button class="btn-download" id="dl-btn">Download</button>' +
            '<div id="progress-wrapper" style="display:none; width:100%;">' +
            '<progress id="dl-progress"></progress>' +
            '<div id="progress-text">Downloading...</div>' +
            '</div>' +
            '</div>' +
            '<div class="app-description">' + desc + '</div>' +
            '</div>' +
            '</div>';

        document.getElementById("app-content").innerHTML = html;

        document.getElementById("dl-btn").onclick = function () {
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
                                // COMPLETE
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
                                // PROGRESS
                                var percent = (progress.bytesReceived / progress.totalBytesToReceive) * 100;
                                if (!isNaN(percent)) {
                                    progressBar.value = percent;
                                    progressText.innerText = Math.floor(percent) + "%";
                                }
                            });
                        });
                } catch (e) {
                    window.open(packageUrl, '_blank');
                    setTimeout(function () { progressWrapper.style.display = "none"; btn.disabled = false; }, 7000);
                }
            });
        };
    }

    function sendDiscordNotification(appName, callback) {
        var webhook = "removed";
        var payload = JSON.stringify({ content: "**" + appName + "** was downloaded!" });
        var xhr = new XMLHttpRequest();
        xhr.open("POST", webhook, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onreadystatechange = function () { if (xhr.readyState === 4) { callback(); } };
        xhr.onerror = function () { callback(); };
        xhr.send(payload);
    }

    function getVal(parent, tag) {
        var el = parent.getElementsByTagName(tag)[0];
        return el ? el.textContent : "";
    }

    (function () {
        // 1. Check if we are running inside the UWP environment
        if (typeof Windows !== 'undefined') {
            var ui = new Windows.UI.ViewManagement.UISettings();

            function updateTextColor() {
                // Get the system background color
                var bg = ui.getColorValue(Windows.UI.ViewManagement.UIColorType.background);

                // Calculate brightness: (R+G+B)
                // If sum > 382, it's Light Mode. Otherwise, it's Dark Mode.
                var isLight = (bg.r + bg.g + bg.b) > 382;

                // Set text color: Black (#000000) for Light, White (#ffffff) for Dark
                document.body.style.color = isLight ? "#000000" : "#ffffff";
            }

            // Run immediately
            updateTextColor();

            // Listen for system theme changes while the page is open
            ui.addEventListener("colorvalueschanged", updateTextColor);
        }
    })();

    if (appId) { loadAppData(); }
})();