document.addEventListener("DOMContentLoaded", function () {
    var refreshBtn = document.getElementById("refreshBtn");
    var checkBtn = document.getElementById("checkBtn");

    if (refreshBtn) {
        refreshBtn.onclick = function () {
            var failedUrl = document.referrer;

            if (failedUrl && failedUrl.indexOf("msapp-error.html") === -1) {
                window.location.href = failedUrl;
            } else {
                if (window.history && window.history.length > 1) {
                    window.history.back();
                } else {
                    window.location.href = "ms-appx-web:///home.html";
                }
            }
        };
    }

    if (checkBtn) {
        checkBtn.onclick = function () {
            window.open("ms-settings:network-status:", "_blank");
        };
    }
});