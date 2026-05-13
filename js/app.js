(function () {
    var gridCanvas = document.getElementById('gridCanvas');
    var gridCtx = gridCanvas.getContext('2d');
    var signCanvas = document.getElementById('signatureCanvas');
    var signCtx = signCanvas.getContext('2d');
    var wrapper = document.getElementById('canvasWrapper');
    var placeholder = document.getElementById('placeholder');

    var penColorInput = document.getElementById('penColor');
    var penSizeInput = document.getElementById('penSize');
    var penSizeVal = document.getElementById('penSizeVal');
    var gridToggle = document.getElementById('showGrid');
    var gridSettings = document.getElementById('gridRowCol');
    var gridRowsInput = document.getElementById('gridRows');
    var gridColsInput = document.getElementById('gridCols');
    var bgColorInput = document.getElementById('exportBgColor');
    var transToggle = document.getElementById('exportTransparent');
    var btnUndo = document.getElementById('btnUndo');
    var btnClear = document.getElementById('btnClear');
    var btnExport = document.getElementById('btnExport');
    var toast = document.getElementById('toast');
    var landscapeToggle = document.getElementById('landscapeToggle');

    var penColor = penColorInput.value;
    var penSize = parseInt(penSizeInput.value, 10);
    var showGrid = false;
    var gridRows = 1;
    var gridCols = 2;
    var exportBgColor = bgColorInput.value;
    var exportTransparent = true;

    var history = [];
    var MAX_HISTORY = 60;
    var drawing = false;
    var stroke = [];

    // grid
    function drawGrid() {
        var w = gridCanvas.width;
        var h = gridCanvas.height;
        var dpr = window.devicePixelRatio || 1;
        var dw = w / dpr;
        var dh = h / dpr;

        gridCtx.clearRect(0, 0, w, h);
        if (!showGrid) {
            gridCtx.save();
            gridCtx.setTransform(1, 0, 0, 1, 0, 0);
            gridCtx.scale(dpr, dpr);
            gridCtx.fillStyle = '#ffffff';
            gridCtx.fillRect(0, 0, dw, dh);
            gridCtx.restore();
            return;
        }

        gridCtx.save();
        gridCtx.setTransform(1, 0, 0, 1, 0, 0);
        gridCtx.scale(dpr, dpr);

        gridCtx.fillStyle = '#ffffff';
        gridCtx.fillRect(0, 0, dw, dh);

        var rows = gridRows;
        var cols = gridCols;
        var cellW = dw / cols;
        var cellH = dh / rows;

        gridCtx.strokeStyle = '#d6ccbe';
        gridCtx.lineWidth = 1;
        for (var r = 1; r < rows; r++) {
            var y = r * cellH;
            gridCtx.beginPath();
            gridCtx.moveTo(0, y);
            gridCtx.lineTo(dw, y);
            gridCtx.stroke();
        }
        for (var c = 1; c < cols; c++) {
            var x = c * cellW;
            gridCtx.beginPath();
            gridCtx.moveTo(x, 0);
            gridCtx.lineTo(x, dh);
            gridCtx.stroke();
        }
        gridCtx.strokeStyle = '#e8dfd3';
        gridCtx.lineWidth = 0.7;
        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var left = c * cellW;
                var top = r * cellH;
                var right = left + cellW;
                var bottom = top + cellH;
                var midX = (left + right) / 2;
                var midY = (top + bottom) / 2;

                gridCtx.beginPath();
                gridCtx.moveTo(left, midY);
                gridCtx.lineTo(right, midY);
                gridCtx.stroke();
                gridCtx.beginPath();
                gridCtx.moveTo(midX, top);
                gridCtx.lineTo(midX, bottom);
                gridCtx.stroke();
                gridCtx.beginPath();
                gridCtx.moveTo(left, top);
                gridCtx.lineTo(right, bottom);
                gridCtx.stroke();
                gridCtx.beginPath();
                gridCtx.moveTo(right, top);
                gridCtx.lineTo(left, bottom);
                gridCtx.stroke();
            }
        }
        gridCtx.restore();
    }

    // resize
    function resize() {
        var dpr = window.devicePixelRatio || 1;
        var w = wrapper.clientWidth;
        var h = wrapper.clientHeight;

        var temp = document.createElement('canvas');
        temp.width = signCanvas.width;
        temp.height = signCanvas.height;
        temp.getContext('2d').drawImage(signCanvas, 0, 0);

        gridCanvas.style.width = w + 'px';
        gridCanvas.style.height = h + 'px';
        signCanvas.style.width = w + 'px';
        signCanvas.style.height = h + 'px';
        gridCanvas.width = w * dpr;
        gridCanvas.height = h * dpr;
        signCanvas.width = w * dpr;
        signCanvas.height = h * dpr;

        drawGrid();

        signCtx.setTransform(1, 0, 0, 1, 0, 0);
        signCtx.scale(dpr, dpr);
        signCtx.lineCap = 'round';
        signCtx.lineJoin = 'round';
        signCtx.strokeStyle = penColor;
        signCtx.lineWidth = penSize;
        signCtx.drawImage(temp, 0, 0, temp.width, temp.height, 0, 0, w, h);
        updatePlaceholder();
    }

    function updatePlaceholder() {
        var img = signCtx.getImageData(0, 0, signCanvas.width, signCanvas.height);
        var has = img.data.some(function (v, i) {
            return i % 4 === 3 && v > 0;
        });
        placeholder.classList.toggle('hidden', has);
        btnUndo.disabled = history.length === 0;
    }

    // undo
    function saveState() {
        history.push(signCtx.getImageData(0, 0, signCanvas.width, signCanvas.height));
        if (history.length > MAX_HISTORY) history.shift();
        btnUndo.disabled = false;
        updatePlaceholder();
    }

    function undo() {
        if (!history.length) return;
        var state = history.pop();
        signCtx.putImageData(state, 0, 0);
        updatePlaceholder();
        btnUndo.disabled = history.length === 0;
        showToast('已撤销');
    }

    function clear() {
        signCtx.clearRect(0, 0, signCanvas.width, signCanvas.height);
        history.length = 0;
        stroke = [];
        btnUndo.disabled = true;
        updatePlaceholder();
        showToast('画布已清除');
    }

    // coords
    function getPos(e) {
        var cx, cy;
        if (e.touches && e.touches.length) {
            cx = e.touches[0].clientX;
            cy = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length) {
            cx = e.changedTouches[0].clientX;
            cy = e.changedTouches[0].clientY;
        } else {
            cx = e.clientX;
            cy = e.clientY;
        }
        var rect = signCanvas.getBoundingClientRect();
        var landscape = document.querySelector('.container').classList.contains('landscape-mode')
            && window.matchMedia('(max-width: 500px)').matches;
        if (landscape) {
            return {
                x: (cy - rect.top) / rect.height * wrapper.clientWidth,
                y: (rect.right - cx) / rect.width * wrapper.clientHeight
            };
        }
        return {x: (cx - rect.left) / rect.width * wrapper.clientWidth,
                y: (cy - rect.top) / rect.height * wrapper.clientHeight};
    }

    function startDraw(e) {
        e.preventDefault();
        drawing = true;
        var p = getPos(e);
        stroke = [p];
        saveState();
        signCtx.beginPath();
        signCtx.moveTo(p.x, p.y);
        signCtx.fillStyle = penColor;
        signCtx.beginPath();
        signCtx.arc(p.x, p.y, penSize / 2, 0, Math.PI * 2);
        signCtx.fill();
        signCtx.beginPath();
        signCtx.moveTo(p.x, p.y);
        signCtx.strokeStyle = penColor;
        signCtx.lineWidth = penSize;
    }

    function moveDraw(e) {
        if (!drawing) return;
        e.preventDefault();
        var p = getPos(e);
        stroke.push(p);
        signCtx.lineTo(p.x, p.y);
        signCtx.stroke();
        signCtx.beginPath();
        signCtx.moveTo(p.x, p.y);
    }

    function endDraw() {
        if (!drawing) return;
        drawing = false;
        signCtx.beginPath();
        if (stroke.length <= 1) updatePlaceholder();
        stroke = [];
    }

    // export
    function exportImage() {
        var img = signCtx.getImageData(0, 0, signCanvas.width, signCanvas.height);
        var has = img.data.some(function (v, i) {
            return i % 4 === 3 && v > 0;
        });
        if (!has) {
            showToast('请先书写签名');
            return;
        }
        var expCanvas = document.createElement('canvas');
        expCanvas.width = signCanvas.width;
        expCanvas.height = signCanvas.height;
        var expCtx = expCanvas.getContext('2d');
        if (!exportTransparent) {
            expCtx.fillStyle = exportBgColor;
            expCtx.fillRect(0, 0, expCanvas.width, expCanvas.height);
        }
        expCtx.drawImage(signCanvas, 0, 0);
        var url = expCanvas.toDataURL('image/png');
        var ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        var a = document.createElement('a');
        a.href = url;
        a.download = '签名_' + ts + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        btnExport.classList.add('success-flash');
        setTimeout(function () {
            btnExport.classList.remove('success-flash');
        }, 600);
        showToast('签名已导出');
    }

    function showToast(msg) {
        clearTimeout(window._tt);
        toast.textContent = msg;
        toast.classList.add('show');
        window._tt = setTimeout(function () {
            toast.classList.remove('show');
        }, 1800);
    }

    // events
    function bind() {
        signCanvas.addEventListener('mousedown', startDraw);
        signCanvas.addEventListener('mousemove', moveDraw);
        signCanvas.addEventListener('mouseup', endDraw);
        signCanvas.addEventListener('mouseleave', endDraw);
        signCanvas.addEventListener('touchstart', startDraw, {passive: false});
        signCanvas.addEventListener('touchmove', moveDraw, {passive: false});
        signCanvas.addEventListener('touchend', endDraw);
        signCanvas.addEventListener('touchcancel', endDraw);

        penColorInput.oninput = function () {
            penColor = penColorInput.value;
        };
        penSizeInput.oninput = function () {
            penSize = parseInt(penSizeInput.value, 10);
            penSizeVal.textContent = penSize;
        };

        gridToggle.onchange = function () {
            showGrid = gridToggle.checked;
            gridSettings.classList.toggle('hidden-control', !showGrid);
            if (showGrid) {
                gridRows = parseInt(gridRowsInput.value, 10) || 1;
                gridCols = parseInt(gridColsInput.value, 10) || 2;
            }
            drawGrid();
        };

        gridRowsInput.onchange = function () {
            var v = parseInt(gridRowsInput.value, 10);
            if (isNaN(v) || v < 1) { v = 1; gridRowsInput.value = 1; }
            if (v > 10) { v = 10; gridRowsInput.value = 10; }
            gridRows = v;
            if (showGrid) drawGrid();
        };
        gridColsInput.onchange = function () {
            var v = parseInt(gridColsInput.value, 10);
            if (isNaN(v) || v < 1) { v = 1; gridColsInput.value = 1; }
            if (v > 10) { v = 10; gridColsInput.value = 10; }
            gridCols = v;
            if (showGrid) drawGrid();
        };

        bgColorInput.oninput = function () {
            exportBgColor = bgColorInput.value;
        };
        transToggle.onchange = function () {
            exportTransparent = transToggle.checked;
        };

        btnUndo.onclick = undo;
        btnClear.onclick = clear;
        btnExport.onclick = exportImage;

        landscapeToggle.onchange = function () {
            var container = document.querySelector('.container');
            if (landscapeToggle.checked) {
                container.classList.add('landscape-mode');
            } else {
                container.classList.remove('landscape-mode');
            }
            setTimeout(resize, 300);
        };

        window.addEventListener('resize', function () {
            clearTimeout(window._rt);
            window._rt = setTimeout(resize, 200);
        });

        document.addEventListener('keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                exportImage();
            }
        });
    }

    // init
    signCtx.lineCap = 'round';
    signCtx.lineJoin = 'round';
    bind();
    resize();
    updatePlaceholder();
})();
