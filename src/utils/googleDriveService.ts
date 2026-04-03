import { GoogleSignin } from '@react-native-google-signin/google-signin';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

const GOOGLE_DRIVE_API_URL =
  'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

export const uploadToGoogleDrive = async (
  filePath: string,
  fileName: string,
) => {
  try {
    const { accessToken } = await GoogleSignin.getTokens();
    const fileExists = await RNFS.exists(filePath);
    if (!fileExists) {
      throw new Error('File does not exist');
    }

    const fileContent = await RNFS.readFile(filePath, 'base64');

    const boundary = 'foo_bar_baz';
    const metadata = {
      name: fileName,
      mimeType: 'application/octet-stream',
      // parents: ['root'] // optional
    };

    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/octet-stream\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      `${fileContent}\r\n` +
      `--${boundary}--`;

    const response = await fetch(GOOGLE_DRIVE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: body,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Google Drive API Error Response:', errorData);
      throw new Error(
        `Google Drive Upload Failed: ${response.status} - ${errorData}`,
      );
    }

    const result = await response.json();
    console.log('Upload successful:', result);
    return result;
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    throw error;
  }
};

export const listBackupsFromGoogleDrive = async () => {
  try {
    const { accessToken } = await GoogleSignin.getTokens();
    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?q=name contains "SimpleLedger_Backup"&orderBy=createdTime desc',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch file list from Drive');
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error listing backups:', error);
    return [];
  }
};

export const downloadFromGoogleDrive = async (
  fileId: string,
  destPath: string,
) => {
  try {
    const { accessToken } = await GoogleSignin.getTokens();
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to download file from Drive');
    }

    // Since we're dealing with binary data in RN fetch,
    // it's better to use a library or handle it as base64 if small.
    // For a DB file, let's try reading as blob then converting to base64 for RNFS.
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(',')[1];
        await RNFS.writeFile(destPath, base64data, 'base64');
        resolve(true);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error downloading from Drive:', error);
    throw error;
  }
};

export const getBackupFilePath = (userId?: string) => {
  const dbName = userId ? `SimpleLedger_${userId}.db` : 'SimpleLedger_guest.db';
  return Platform.OS === 'ios'
    ? `${RNFS.LibraryDirectoryPath}/LocalDatabase/${dbName}`
    : `/data/data/com.simpleledgerapp/databases/${dbName}`;
};

export const restoreLatestBackup = async (userId: string) => {
  try {
    const files = await listBackupsFromGoogleDrive();
    if (files.length === 0) {
      console.log('No backups found on Google Drive');
      return false;
    }

    const latestFile = files[0];
    const destPath = getBackupFilePath(userId);

    // Ensure directory exists
    const dbDir = destPath.substring(0, destPath.lastIndexOf('/'));
    const dirExists = await RNFS.exists(dbDir);
    if (!dirExists) {
      await RNFS.mkdir(dbDir);
    }

    console.log(`Restoring backup ${latestFile.name} to ${destPath}`);
    await downloadFromGoogleDrive(latestFile.id, destPath);
    return true;
  } catch (error) {
    console.error('Error in restoreLatestBackup:', error);
    return false;
  }
};
