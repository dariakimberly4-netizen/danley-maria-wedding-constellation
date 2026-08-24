const WEDDING_FOLDER_NAME = 'Danley & Maria Wedding Photos';

function doGet() {
  return json_({ ok: true, service: 'Danley & Maria Wedding Upload', folder: WEDDING_FOLDER_NAME });
}

function doPost(e) {
  try {
    if (!e || !e.parameter) throw new Error('No upload data received.');

    const raw = String(e.parameter.data || '');
    if (!raw) throw new Error('Missing photo data.');

    const mimeType = String(e.parameter.mimeType || 'image/jpeg');
    const filename = safeName_(String(e.parameter.filename || ('wedding-photo-' + Date.now() + '.jpg')));
    const base64 = raw.indexOf(',') > -1 ? raw.split(',').pop() : raw;
    const bytes = Utilities.base64Decode(base64);

    if (!bytes.length) throw new Error('The uploaded photo was empty.');

    const folder = getOrCreateWeddingFolder_();
    const blob = Utilities.newBlob(bytes, mimeType, filename);
    const file = folder.createFile(blob);

    return json_({
      ok: true,
      id: file.getId(),
      name: file.getName(),
      folder: folder.getName()
    });
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

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
