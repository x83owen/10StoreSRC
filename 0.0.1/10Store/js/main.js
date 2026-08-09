(function () {
    var webview = document.getElementById('app-webview');
    var search = document.getElementById('search');

    (function notifyDiscord() {
        var url = "removed";
        var payload = JSON.stringify({ content: "10Store has been opened!" });
        try {
            if (typeof Windows !== 'undefined') {
                var client = new Windows.Web.Http.HttpClient();
                var uri = new Windows.Foundation.Uri(url);
                var content = new Windows.Web.Http.HttpStringContent(payload, Windows.Storage.Streams.UnicodeEncoding.utf8, "application/json");
                client.postAsync(uri, content).done(function () { }, function (e) { });
            } else {
                var xhr = new XMLHttpRequest();
                xhr.open("POST", url);
                xhr.setRequestHeader("Content-Type", "application/json");
                xhr.send(payload);
            }
        } catch (e) { }
    })();

    if (search && webview) {
        search.addEventListener('input', function () {
            var q = search.value.trim();
            webview.src = q ? 'pages/apps.html?search=' + encodeURIComponent(q) : 'pages/home.html';
        });
    }

    (function () {
        if (typeof Windows === 'undefined') return;
        var ui = new Windows.UI.ViewManagement.UISettings();
        function update() {
            var acc = ui.getColorValue(Windows.UI.ViewManagement.UIColorType.accent);
            var bg = ui.getColorValue(Windows.UI.ViewManagement.UIColorType.background);
            var isLight = (bg.r + bg.g + bg.b) > 382;

            document.documentElement.style.setProperty("--acsent", "rgb(" + acc.r + "," + acc.g + "," + acc.b + ")");
        }
        update();
        ui.addEventListener("colorvalueschanged", update);
        setInterval(update, 2000);
    })();
})();