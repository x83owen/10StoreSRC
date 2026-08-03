(function () {
    var urlParams = new URLSearchParams(window.location.search);
    var appId = urlParams.get('id');

    function loadAppData() {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "https://drayaiupdatehost.netlify.app/10store/apps.xml", true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                var xml = xhr.responseXML;
                var apps = xml.getElementsByTagName("app");
                var targetApp = null;
                for (var i = 0; i < apps.length; i++) {
                    if (apps[i].getAttribute("id") === appId) {
                        targetApp = apps[i];
                        break;
                    }
                }
                if (targetApp) { renderApp(targetApp); }
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
        var version = getVal(app, "version"); // 1. Get the version value
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
            '<div class="app-version">Version ' + version + '</div>' + // 2. Add to HTML
            '<div id="dl-container">' +
            '<button class="btn-download" id="dl-btn">Download</button>' +
            '<div id="progress-wrapper" style="display:none; width:100%;">' +
            '<progress id="dl-progress" value="0" max="100"></progress>' +
            '<div id="progress-text">0%</div>' +
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

                                // NEW: Disappear after 7 seconds
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
        var webhook = "https://discordapp.com/api/webhooks/1462054730019897366/_q1UAbFsqhSY2xxNmeZ7jApNb0l_cnAnzu8UrId2c7vn0xWzZBWwKurqZy3VPxTRkKfS";
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

    if (appId) { loadAppData(); }
})();