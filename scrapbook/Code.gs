const WEDDING_FOLDER_NAME = 'Danley & Maria Wedding Photos - August 28 2026';

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'status') {
    const id = String(p.id || '');
    const ok = !!CacheService.getScriptCache().get('upload:' + id);
    const payload = JSON.stringify({ ok: ok });
    const callback = String(p.callback || '').replace(/[^a-zA-Z0-9_$\.]/g, '');
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + payload + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(payload)
      .setMimeType(ContentService.MimeType.JSON);
  }

  return HtmlService.createHtmlOutput(
    '<!doctype html><meta name="viewport" content="width=device-width"><div style="font-family:Arial;padding:24px">Danley & Maria wedding photo upload is active.</div>'
  );
}

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    if (String(p.action || '') !== 'upload') throw new Error('Invalid action');

    const uploadId = String(p.uploadId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
    const fileName = safeName_(p.fileName || ('wedding-photo-' + Date.now() + '.jpg'));
    const mimeType = /^image\//.test(String(p.mimeType || '')) ? String(p.mimeType) : 'image/jpeg';
    const base64 = String(p.base64 || '');
    if (!base64) throw new Error('Missing image data');

    const bytes = Utilities.base64Decode(base64);
    if (bytes.length > 15 * 1024 * 1024) throw new Error('Photo is too large');

    const folder = weddingFolder_();
    const blob = Utilities.newBlob(bytes, mimeType, fileName);
    const file = folder.createFile(blob);
    file.setDescription('Danley & Maria wedding guest upload');

    if (uploadId) CacheService.getScriptCache().put('upload:' + uploadId, file.getId(), 600);

    return HtmlService.createHtmlOutput('UPLOAD_OK');
  } catch (err) {
    return HtmlService.createHtmlOutput('UPLOAD_ERROR');
  }
}

function weddingFolder_() {
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty('WEDDING_FOLDER_ID');
  if (savedId) {
    try { return DriveApp.getFolderById(savedId); } catch (err) {}
  }

  const existing = DriveApp.getFoldersByName(WEDDING_FOLDER_NAME);
  const folder = existing.hasNext() ? existing.next() : DriveApp.createFolder(WEDDING_FOLDER_NAME);
  props.setProperty('WEDDING_FOLDER_ID', folder.getId());
  return folder;
}

function safeName_(name) {
  const cleaned = String(name || 'wedding-photo.jpg')
    .replace(/[\\/:*?"<>|#%{}]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned || 'wedding-photo.jpg').slice(0, 180);
}
