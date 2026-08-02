(function () {
    "use strict";

    var backgroundTaskInstance = Windows.UI.WebUI.WebUIBackgroundTaskInstance.current;
    var settings = Windows.Storage.ApplicationData.current.localSettings;
    var XML_URL = "https://raw.githubusercontent.com/draydenthemiiyt-maker/10-Store/refs/heads/main/apps.xml";

    function checkUpdates() {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", XML_URL, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                try {
                    var xml = xhr.responseXML;
                    var apps = xml.getElementsByTagName("app");
                    var updatesFound = false;

                    for (var i = 0; i < apps.length; i++) {
                        var appId = apps[i].getAttribute("id");
                        var remoteVersion = apps[i].getElementsByTagName("version")[0].textContent;
                        var localVersion = settings.values[appId + "_version"];

                        if (localVersion && remoteVersion !== localVersion) {
                            var appName = apps[i].getElementsByTagName("name")[0].textContent;
                            sendNotification(appName, remoteVersion);
                            updatesFound = true;
                        }

                        settings.values[appId + "_version"] = remoteVersion;
                    }
                } catch (e) {
                    console.error("Task Error:", e);
                } finally {
                    close();
                }
            } else if (xhr.readyState === 4) {
                close();
            }
        };
        xhr.send();
    }

    function sendNotification(name, version) {
        var notifications = Windows.UI.Notifications;
        var template = notifications.ToastTemplateType.toastText02;
        var toastXml = notifications.ToastNotificationManager.getTemplateContent(template);
        var textNodes = toastXml.getElementsByTagName("text");

        textNodes[0].appendChild(toastXml.createTextNode("Update Available!"));
        textNodes[1].appendChild(toastXml.createTextNode(name + " version " + version + " is now available."));

        var toast = new notifications.ToastNotification(toastXml);
        notifications.ToastNotificationManager.createToastNotifier().show(toast);
    }

    checkUpdates();
})();