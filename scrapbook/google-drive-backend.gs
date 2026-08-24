const WEDDING_FOLDER_NAME = 'Danley & Maria Wedding Photos';
const STATUS_PREFIX = 'wedding_upload_';

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (String(p.action || '') === 'status') {
    const id = String(p.id || '');
    const callback = safeCallback_(String(p.callback || 'callback'));
    const key = STATUS_PREFIX + id;
    const props = PropertiesService.getScriptProperties();
    const ok = !!(id && props.getProperty(key));
    if (ok) props.deleteProperty(key);
    return javascript_(callback + '(' + JSON.stringify({ ok: ok }) + ');');
  }
  return json_({ ok: true, service: 'Danley & Maria Wedding Upload', folder: WEDDING_FOLDER_NAME });
}

function doPost(e) {
  try {
    if (!e || !e.parameter) throw new Error('No upload data received.');
    const p = e.parameter;
    if (String(p.action || '') !== 'upload') throw new Error('Unknown action.');

    const uploadId = String(p.uploadId || '');
    const raw = String(p.base64 || p.data || '');
    if (!uploadId) throw new Error('Missing upload ID.');
    if (!raw) throw new Error('Missing photo data.');

    const mimeType = String(p.mimeType || 'image/jpeg');
    const filename = safeName_(String(p.fileName || p.filename || ('wedding-photo-' + Date.now() + '.jpg')));
    const base64 = raw.indexOf(',') > -1 ? raw.split(',').pop() : raw;
    const bytes = Utilities.base64Decode(base64);
    if (!bytes.length) throw new Error('The uploaded photo was empty.');

    const folder = getOrCreateWeddingFolder_();
    const blob = Utilities.newBlob(bytes, mimeType, filename);
    const file = folder.createFile(blob);

    PropertiesService.getScriptProperties().setProperty(STATUS_PREFIX + uploadId, file.getId());

    return json_({ ok: true, id: file.getId(), name: file.getName(), folder: folder.getName(), uploadId: uploadId });
  } catch (err) {
    return json_({ ok: false, error: err && err.message ? err.message : String(err) });
  }
}

function getOrCreateWeddingFolder_() {
  const folders = DriveApp.getFoldersByName(WEDDING_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(WEDDING_FOLDER_NAME);
}

function safeName_(name) {
  return name.replace(/[\\/:*?"<>|]+/g, '-').slice(0, 140) || ('wedding-photo-' + Date.now() + '.jpg');
}

function safeCallback_(name) {
  return /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(name) ? name : 'callback';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function javascript_(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JAVASCRIPT);
}
