'use strict';


const MTP = require('./lib').MTP;
const findLodash = require('lodash/find');
const MTP_FLAGS = require('./lib/mtp-device-flags').FLAGS;

const mtpObj = new MTP();


async function run(resetmtp = false, searchDir = null) {
  await mtpObj.init();

  /**
   * =====================================================================
   * Detect MTP
   */
  const {
    error: detectMtpError,
    data: detectMtpData
  } = await mtpObj.detectMtp();

  if (detectMtpError) {
    console.log(`========================`);
    console.log(`detectMtpError`);
    console.error(detectMtpError);
    console.log(`========================`);
    return;
  }

  if (detectMtpData) {
    console.log(`========================`);
    console.log(`detectMtpData`);
    console.log(detectMtpData);
    console.log(`========================`);
  }


  /**
   * =====================================================================
   * Set Storage Devices
   */
  const {
    error: setStorageDevicesError,
    data: setStorageDevicesData
  } = await mtpObj.setStorageDevices({ storageIndex: 0 });

  if (setStorageDevicesError) {
    console.log(`========================`);
    console.log(`setStorageDevicesError`);
    console.error(setStorageDevicesError);
    console.log(`========================`);
    return;
  }

  if (setStorageDevicesData) {
    console.log(`========================`);
    console.log(`setStorageDevicesData`);
    console.error(setStorageDevicesData);
    console.log(`========================`);
  }

  /*  if (resetmtp) {
      const {
        error: listMtpFileTreeError,
        data: listMtpFileTreeData
      } = await mtpObj.listMtpFileTree({
        folderId: MTP_FLAGS.FILES_AND_FOLDERS_ROOT,
        recursive: false
      });

      if (listMtpFileTreeError) {
        console.error(listMtpFileTreeError);
        return;
      }

      if (searchDir) {
        console.error(findLodash(listMtpFileTreeData, { name: searchDir }));
        return;
      }

      console.error(listMtpFileTreeData);
      return;
    }*/

  /**
   * =====================================================================
   * Resolve Path
   */

  /*
    const {
      error: resolvePathError,
      data: resolvePathData
    } = await mtpObj.resolvePath({
      filePath: '/ABCD/'
    });

    if (resolvePathError) {
      console.error(resolvePathError);
      return;
    }
    console.log(resolvePathData);
  */


  /**
   * =====================================================================
   * List MTP File Tree (__listMtpFileTree)
   */

  /*const {
    error: listMtpFileTreeError,
    data: listMtpFileTreeData
  } = await mtpObj.__listMtpFileTree({
    folderId: 36,
    recursive: true,
    parentPath: '/'
  });

  if (listMtpFileTreeError) {
    console.log(`========================`);
    console.log(`listMtpFileTreeError`);
    console.error(listMtpFileTreeError);
    console.log(`========================`);
    return;
  }

  if (listMtpFileTreeData) {
    console.log(`========================`);
    console.log(`listMtpFileTreeData`);
    console.log(listMtpFileTreeData);
    console.log(`========================`);
  }*/

  /**
   * =====================================================================
   * List MTP File Tree
   */

  /*  const {
      error: listMtpFileTreeError,
      data: listMtpFileTreeData
    } = await mtpObj.listMtpFileTree({
      recursive: false,
      folderPath: '/DCIM'
    });

    if (listMtpFileTreeError) {
      console.log(`========================`);
      console.log(`listMtpFileTreeError`);
      console.error(listMtpFileTreeError);
      console.log(`========================`);
      return;
    }

    if (listMtpFileTreeData) {
      console.log(`========================`);
      console.log(`listMtpFileTreeData`);
      console.log(listMtpFileTreeData);
      console.log(`========================`);
    }*/

  /**
   * =====================================================================
   * List Local File Tree
   */

  /*  const {
    error: listLocalFileTreeError,
    data: listLocalFileTreeData
  } = await mtpObj.listLocalFileTree({
    folderPath: '/Users/ganeshr/Desktop/3',
    recursive: true
  });

  if (listLocalFileTreeError) {
    console.error(listLocalFileTreeError);
    return;
  }
  console.log(listLocalFileTreeData);*/

  /**
   * =====================================================================
   * List Delete file
   */
  /*
      const {
      error: deleteFileError,
        data: deleteFileData
      } = await mtpObj.deleteFile({ filePath: '/aaa' });

      if (deleteFileError) {
        console.log(`========================`);
        console.log(`deleteFileError`);
        console.error(deleteFileError);
        console.log(`========================`);
        return;
      }

      if (deleteFileData) {
        console.log(`========================`);
        console.log(`deleteFileData`);
        console.log(deleteFileData);
        console.log(`========================`);
      }*/

  /**
   * =====================================================================
   * Rename File
   */
  /*  const {
      error: renameFileError,
      data: renameFileData
    } = await mtpObj.renameFile({
      filePath: '/ABDC',
      newfileName: 'ABCD'
    });

    if (renameFileError) {
      console.error(renameFileError);
    }

    if (renameFileError) {
      console.log(`========================`);
      console.log(`renameFileError`);
      console.error(renameFileError);
      console.log(`========================`);
      return;
    }

    if (renameFileData) {
      console.log(`========================`);
      console.log(`renameFileData`);
      console.log(renameFileData);
      console.log(`========================`);
    }*/

  /**
   * =====================================================================
   * Get file info
   */

  /*  const {
      error: getFileInfoError,
      data: getFileInfoData
    } = await mtpObj.getFileInfo({ filePath: '/WhatsApp' });

    if (getFileInfoError) {
      console.log(`========================`);
      console.log(`getFileInfoError`);
      console.error(getFileInfoError);
      console.log(`========================`);
      return;
    }

    if (getFileInfoData) {
      console.log(`========================`);
      console.log(`getFileInfoData`);
      console.log(getFileInfoData);
      console.log(`========================`);
    }*/

  /**
   * =====================================================================
   * File Exists
   */
  /*  const {
      error: fileExistsError,
      data: fileExistsData
    } = await mtpObj.fileExists({
      filePath: '/WhatsApp'
    });

    if (fileExistsError) {
      console.log(`========================`);
      console.log(`getFileInfoError`);
      console.error(fileExistsError);
      console.log(`========================`);
      return;
    }

    if (fileExistsData) {
      console.log(`========================`);
      console.log(`fileExistsData`);
      console.log(fileExistsData);
      console.log(`========================`);
    }*/


  /**
   * =====================================================================
   * Create Folder
   */
  /*
    const {
      error: createFolderError,
      data: createFolderData
    } = await mtpObj.createFolder({
      newFolderPath: '/ABCD/get/abc'
      // parentId: 36,
      //  newFolderName: 'get'
    });

    if (createFolderError) {
      console.log(`========================`);
      console.log(`createFolderError`);
      console.error(createFolderError);
      console.log(`========================`);
      return;
    }

    if (createFolderData) {
      console.log(`========================`);
      console.log(`createFolderData`);
      console.log(createFolderData);
      console.log(`========================`);
    }
  */

  /**
   * =====================================================================
   * Download file tree
   */


  const {
    error: listMtpFileTreeError,
    data: listMtpFileTreeData
  } = await mtpObj.listMtpFileTree({
    folderPath: '/ABCD',
    recursive: true
  });

  if (listMtpFileTreeError) {
    console.error(listMtpFileTreeError);
    return;
  }

  const {
    error: downloadFileTreeError,
    data: downloadFileTreeData
  } = await mtpObj.downloadFileTree({
    rootNode: true,
    nodes: listMtpFileTreeData,
    destinationFilePath: `/Users/ganeshr/Desktop/3`,
    callback: ({ sent, total, file }) => {
      process.stdout.write(
        `Downloaded file: ${sent} / ${total} of ${file.name}\n`
      );
    }
  });

  if (downloadFileTreeError) {
    console.log(`========================`);
    console.log(`downloadFileTreeError`);
    console.error(downloadFileTreeError);
    console.log(`========================`);
    return;
  }

  if (downloadFileTreeData) {
    console.log(`========================`);
    console.log(`downloadFileTreeData`);
    console.log(downloadFileTreeData);
    console.log(`========================`);
  }

  /**
   * =====================================================================
   * Upload file tree
   */

  /*  const {
    error: listLocalFileTreeError,
    data: listLocalFileTreeData
  } = await mtpObj.listLocalFileTree({
    filePath: '/Users/ganeshr/Desktop/3',
    recursive: true
  });

  if (listLocalFileTreeError) {
    console.error(listLocalFileTreeError);
    return;
  }

  const {
    error: uploadFileTreeError,
    data: uploadFileTreeData
  } = await mtpObj.uploadFileTree({
    rootNode: true,
    nodes: listLocalFileTreeData,
    destinationFilePath: '/ABCD',
    callback: ({ sent, total, file }) => {
      process.stdout.write(
        `Uploaded file: ${sent} / ${total} of ${file.name}\n`
      );
    }
  });

  if (uploadFileTreeError) {
    console.error(uploadFileTreeError);
    return;
  }

  console.log(uploadFileTreeData);*/

  /**
   * =====================================================================
   * Release Device
   */
  const {
    error: releaseDeviceError,
    data: releaseDeviceData
  } = await mtpObj.releaseDevice();

  if (releaseDeviceError) {
    console.log(`========================`);
    console.log(`releaseDeviceError`);
    console.error(releaseDeviceError);
    console.log(`========================`);
  }
  if (releaseDeviceData) {
    console.log(`========================`);
    console.log(`releaseDeviceData`);
    console.error(releaseDeviceData);
    console.log(`========================`);
  }
}

let resetmtp = false;
let searchDir = null;

process.argv.forEach((val, index, array) => {
  switch (index) {
    case 2:
      resetmtp = true;
      break;

    case 3:
      searchDir = val;
      break;

    default:
      break;
  }
});

run(resetmtp, searchDir).catch(e => {
  console.error(e);
});
