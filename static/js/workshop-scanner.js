(function () {
  'use strict';

  var stream = null;
  var frame = null;
  var busy = false;
  var lastScanAt = 0;
  var canvas = document.createElement('canvas');
  var context = canvas.getContext('2d', { willReadFrequently: true });

  function text(ar, en) {
    return I18n.getLang() === 'en' ? en : ar;
  }

  function e(value) {
    return UI.esc(value);
  }

  function menuItemHTML() {
    return '<button class="fab-item" type="button" data-workshop-scan-toggle>' +
      UI.icon('camera', 17) + e(text('مسح رمز حضور ورشة', 'Scan workshop attendance')) + '</button>';
  }

  function panelHTML() {
    return '<div class="workshop-scan-entry"><div class="workshop-scanner" id="workshopScanner" hidden>' +
      '<video id="workshopScannerVideo" playsinline muted aria-label="' +
      e(text('معاينة كاميرا مسح الرمز', 'QR scanner camera preview')) + '"></video>' +
      '<p class="workshop-scan-status" id="workshopScanStatus" role="status" aria-live="polite">' +
      e(text('وجّه الكاميرا نحو رمز الورشة.', 'Point the camera at the workshop QR code.')) + '</p>' +
      '<button class="btn btn-ghost btn-sm" type="button" data-workshop-scan-stop>' +
      e(text('إيقاف الكاميرا', 'Stop camera')) + '</button></div></div>';
  }

  function setStatus(message, isError) {
    var status = document.getElementById('workshopScanStatus');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-error', !!isError);
  }

  function stopCamera() {
    if (frame != null) {
      window.cancelAnimationFrame(frame);
      frame = null;
    }
    if (stream) {
      stream.getTracks().forEach(function (track) { track.stop(); });
      stream = null;
    }
    var video = document.getElementById('workshopScannerVideo');
    if (video) video.srcObject = null;
    busy = false;
  }

  function hideScanner() {
    stopCamera();
    var panel = document.getElementById('workshopScanner');
    if (panel) panel.hidden = true;
    document.body.classList.remove('workshop-scan-active');
  }

  function submitScan(token) {
    setStatus(text('جارٍ تسجيل الحضور...', 'Recording attendance...'));
    fetch(SITE.u('workshopAttendanceScan'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRF_TOKEN || ''
      },
      body: JSON.stringify({ token: token })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) {
          throw new Error(data.message || text('تعذر تسجيل الحضور.', 'Could not record attendance.'));
        }
        stopCamera();
        setStatus(data.message || text('تم تسجيل حضورك وإصدار شهادتك.', 'Attendance recorded and certificate issued.'));
        window.setTimeout(function () { window.location.reload(); }, 900);
      });
    }).catch(function (error) {
      stopCamera();
      setStatus(error.message || text('تعذر تسجيل الحضور.', 'Could not record attendance.'), true);
    });
  }

  function scanFrame() {
    if (!stream || busy) return;
    var video = document.getElementById('workshopScannerVideo');
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      frame = window.requestAnimationFrame(scanFrame);
      return;
    }
    if (Date.now() - lastScanAt < 180) {
      frame = window.requestAnimationFrame(scanFrame);
      return;
    }
    lastScanAt = Date.now();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (!context || !window.jsQR) {
      setStatus(text('تعذر تهيئة قارئ QR.', 'Could not initialize the QR reader.'), true);
      stopCamera();
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    var result = window.jsQR(
      context.getImageData(0, 0, canvas.width, canvas.height).data,
      canvas.width,
      canvas.height,
      { inversionAttempts: 'dontInvert' }
    );
    if (result && result.data) {
      busy = true;
      submitScan(result.data);
      return;
    }
    frame = window.requestAnimationFrame(scanFrame);
  }

  function startCamera() {
    var panel = document.getElementById('workshopScanner');
    var video = document.getElementById('workshopScannerVideo');
    if (!panel || !video) return;
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus(text(
        'يتطلب استخدام الكاميرا اتصالاً آمناً (HTTPS) ومتصفحاً يدعم الكاميرا.',
        'Camera scanning requires HTTPS and a browser with camera support.'
      ), true);
      return;
    }
    setStatus(text('يرجى السماح باستخدام الكاميرا.', 'Please allow camera access.'));
    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    }).then(function (cameraStream) {
      stream = cameraStream;
      video.srcObject = cameraStream;
      return video.play();
    }).then(scanFrame).catch(function () {
      stopCamera();
      setStatus(text(
        'تعذر تشغيل الكاميرا. تحقق من الإذن واتصال HTTPS.',
        'Could not start the camera. Check permission and HTTPS.'
      ), true);
    });
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var toggle = target.closest('[data-workshop-scan-toggle]');
    if (toggle) {
      event.preventDefault();
      event.stopImmediatePropagation();
      var panel = document.getElementById('workshopScanner');
      if (panel) {
        panel.hidden = !panel.hidden;
        if (panel.hidden) {
          hideScanner();
        } else {
          document.body.classList.add('workshop-scan-active');
          startCamera();
        }
      }
      return;
    }
    if (target.closest('[data-workshop-scan-stop]')) {
      event.stopImmediatePropagation();
      hideScanner();
      return;
    }
    var scannerPanel = document.getElementById('workshopScanner');
    if (scannerPanel && !scannerPanel.hidden) {
      if (target.closest('#workshopScanner')) {
        event.stopImmediatePropagation();
      } else {
        hideScanner();
      }
    }
  });

  var fab = document.getElementById('fab');
  if (fab) fab.addEventListener('click', hideScanner);

  window.addEventListener('pagehide', stopCamera);
  window.WorkshopScanner = {
    menuItemHTML: menuItemHTML,
    panelHTML: panelHTML
  };
})();
