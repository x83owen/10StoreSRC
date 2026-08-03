(function () {
    "use strict";

    if (typeof Windows === 'undefined') {
        document.getElementById('file-list').innerHTML = "This page requires the 10Store app container.";
        return;
    }

    var localCache = Windows.Storage.ApplicationData.current.localCacheFolder;
    var listContainer = document.getElementById('file-list');
    var ui = new Windows.UI.ViewManagement.UISettings(); // FIXED: Added missing UI definition

    // Create a style element for the dynamic card theme
    var themeStyle = document.createElement('style');
    document.head.appendChild(themeStyle);

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
                listContainer.innerHTML = "<div style='opacity:0.5; padding:20px; text-align:center;'>No downloads found.</div>";
            }
            updateTheme(); // Run theme update after files load
        }, function (err) {
            listContainer.innerHTML = "Error accessing storage.";
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
                '<button class="btn-delete">Delete</button>';

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

    function updateTheme() {
        var bg = ui.getColorValue(Windows.UI.ViewManagement.UIColorType.background);
        var isLight = (bg.r + bg.g + bg.b) > 382;

        var textColor = isLight ? "#000000" : "#ffffff";
        var borderColor = isLight ? "#e0e0e0" : "#333333";
        var hoverColor = isLight ? "#f0f0f0" : "#3d3d3d";

        document.body.style.color = textColor;

        // FIXED: This now updates the file-card border and hover color dynamically
        themeStyle.innerHTML = `
            .file-list { border-top: 1px solid ${borderColor} !important; }
            .file-card { 
                border-bottom: 1px solid ${borderColor} !important; 
                color: ${textColor} !important;
            }
            .file-card:hover { 
                background-color: ${hoverColor} !important; 
            }
            .file-meta { color: ${textColor} !important; opacity: 0.6; }
        `;
    }

    // Start
    loadDownloads();
    ui.addEventListener("colorvalueschanged", updateTheme);

})();