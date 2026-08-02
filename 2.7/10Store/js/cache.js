(function () {
    "use strict";

    var localCache = Windows.Storage.ApplicationData.current.localCacheFolder;
    var listContainer = document.getElementById('file-list');

    function loadDownloads() {
        listContainer.innerHTML = "";
        localCache.getFilesAsync().done(function (files) {
            var found = 0;
            files.forEach(function (file) {
                if (file.fileType === ".appx" || file.fileType === ".appxbundle") {
                    found++;
                    renderFileRow(file);
                }
            });

            if (found === 0) {
                listContainer.innerHTML = "<div style='opacity:0.5; padding:20px; text-align:center;'>Download an app to see it here!</div>";
            }
        });
    }

    function renderFileRow(file) {
        var card = document.createElement('div');
        card.className = "file-card";

        file.getBasicPropertiesAsync().done(function (props) {
            var size = (props.size / (1024 * 1024)).toFixed(1) + " MB";
            var date = props.dateModified.toLocaleDateString();

            card.innerHTML =
                '<div class="file-info">' +
                '<div class="file-name">' + file.name + '</div>' +
                '<div class="file-meta">' + size + ' • ' + date + '</div>' +
                '</div>' +
                '<button class="win-button btn-delete">Delete</button>';

            card.onclick = function (e) {
                if (e.target.className !== 'btn-delete') {
                    Windows.System.Launcher.launchFileAsync(file);
                }
            };

            card.querySelector('.btn-delete').onclick = function (e) {
                e.stopPropagation();
                file.deleteAsync().done(function () {
                    card.style.opacity = "0";
                    setTimeout(function () {
                        card.remove();
                        if (listContainer.children.length === 0) loadDownloads();
                    }, 300);
                });
            };

            listContainer.appendChild(card);
        });
    }

    loadDownloads();

})();