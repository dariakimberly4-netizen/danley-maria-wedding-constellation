const WEDDING_FOLDER_NAME = 'Danley & Maria Wedding Photos';
const STATUS_PREFIX = 'wedding_upload_';

function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = String(p.action || '');

  if (action === 'status') {
    const id = String(p.id || '');
    const callback = safeCallback_(String(p.callback || 'callback'));
    const key = STATUS_PREFIX + id;
    const props = PropertiesService.getScriptProperties();
    const ok = !!(id && props.getProperty(key));
    if (ok) props.deleteProperty(key);
    return javascript_(callback + '(' + JSON.stringify({ ok: ok }) + ');');
  }

  if (action === 'list') {
    const callback = safeCallback_(String(p.callback || 'callback'));
    const folder = getOrCreateWeddingFolder_();
    const files = folder.getFiles();
    const photos = [];
    while (files.hasNext()) {
      const file = files.next();
      const mime = String(file.getMimeType() || '');
      if (mime.indexOf('image/') !== 0) continue;
      photos.push({
        id: file.getId(),
        name: file.getName(),
        createdAt: file.getDateCreated().toISOString(),
        imageUrl: 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(file.getId()) + '&sz=w1200',
        viewUrl: 'https://drive.google.com/file/d/' + encodeURIComponent(file.getId()) + '/view'
      });
    }
    photos.sort(function(a,b){ return String(b.createdAt).localeCompare(String(a.createdAt)); });
    return javascript_(callback + '(' + JSON.stringify({ ok: true, photos: photos }) + ');');
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
    if (mimeType.indexOf('image/') !== 0) throw new Error('Images only.');
    const filename = safeName_(String(p.fileName || p.filename || ('wedding-photo-' + Date.now() + '.jpg')));
    const base64 = raw.indexOf(',') > -1 ? raw.split(',').pop() : raw;
    const bytes = Utilities.base64Decode(base64);
    if (!bytes.length) throw new Error('The uploaded photo was empty.');

    const folder = getOrCreateWeddingFolder_();
    const blob = Utilities.newBlob(bytes, mimeType, filename);
    const file = folder.createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (shareErr) {}

    PropertiesService.getScriptProperties().setProperty(STATUS_PREFIX + uploadId, file.getId());

    return json_({ ok: true, id: file.getId(), name: file.getName(), folder: folder.getName(), uploadId: uploadId });
  } catch (err) {
    return json_({ ok: false, error: err && err.message ? err.message : String(err) });
  }
}

function getOrCreateWeddingFolder_() {
  const folders = DriveApp.getFoldersByName(WEDDING_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  const folder = DriveApp.createFolder(WEDDING_FOLDER_NAME);
  try { folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (shareErr) {}
  return folder;
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
