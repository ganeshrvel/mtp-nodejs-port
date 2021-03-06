'use strict';

const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const junk = require('junk');
const findLodash = require('lodash/find');
const mtpNativeModule = require('./mtp-helper');
const MTP_FLAGS = require('./mtp-device-flags').FLAGS;

function undefinedOrNull(_var) {
  return typeof _var === 'undefined' || _var === null;
}

function quickHash(str) {
  let hash = 0;
  let i;
  let chr;

  if (str.length === 0) {
    return hash;
  }
  for (i = 0; i < str.length; i += 1) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr; // eslint-disable-line no-bitwise
    hash |= 0; // eslint-disable-line no-bitwise
  }
  return hash;
}

function isWritable(folderPath) {
  try {
    fs.accessSync(folderPath, fs.R_OK | fs.W_OK);
    return true;
  } catch (e) {
    return false;
  }
}

function isArray(n) {
  return Array.isArray(n);
}

function getExtension(fileName, isFolder) {
  if (isFolder) {
    return null;
  }
  const parsedPath = pathInfo(fileName);

  return parsedPath !== null ? parsedPath.ext : null;
}

function pathInfo(filePath) {
  return path.parse(filePath);
}

async function promisifiedMkdir({ newFolderPath }) {
  try {
    return new Promise(resolve => {
      mkdirp(newFolderPath, error => {
        resolve({ data: null, stderr: error, error });
      });
    });
  } catch (e) {
    console.error(e);
  }
}

/**
 * MTP Class
 */

class MTP {
  /**
   * constructor
   */
  constructor() {
    this.mtpNativeModule = mtpNativeModule;
    this.device = null;
    this.storageId = null;

    this.ERR = {
      NO_MTP: `No MTP device found`,
      NO_STORAGE: `MTP storage not accessible`,
      LOCAL_FOLDER_NOT_FOUND: `Source folder not found`,
      ILLEGAL_FILE_NAME: `Illegal file name`,
      RENAME_FAILED: `Some error occured while renaming`,
      FILE_INFO_FAILED: `Some error occured while fetching the file information`,
      DOWNLOAD_FILE_FAILED: `Some error occured while transfering files from MTP device`,
      UPLOAD_FILE_FAILED: `Some error occured while transfering files to MTP device`,
      NO_FILES_COPIED: `No files were transfering. Refresh your MTP`,
      CREATE_FOLDER_FAILED: `Some error occured while creating a new folder`,
      CREATE_FOLDER_FILE_FAILED: `A file with a similar name exists`,
      INVALID_PATH_RESOLVE: `Illegal path, could not resolve the path`,
      INVALID_NOT_FOUND: `Path not found`
    };
  }

  /**
   * Init
   * return: {void}
   */
  init() {
    try {
      this.mtpNativeModule.Init();
    } catch (e) {
      console.error(`MTP -> init`, e);
    }
  }

  /**
   * Detect MTP
   * @returns {Promise<{data: *, error: *}>}
   */
  detectMtp() {
    let error = null;

    return new Promise(resolve => {
      return this.mtpNativeModule.Detect_Raw_Devices((err, rawDevices) => {
        try {
          if (err) {
            switch (err) {
              case 5:
              default:
                error = this.ERR.NO_MTP;
                break;
            }

            this.device = null;

            return resolve({
              data: null,
              error
            });
          }

          this.device = this.mtpNativeModule.Open_Raw_Device_Uncached(
            rawDevices[0]
          );

          if (undefinedOrNull(this.device)) {
            return resolve({
              data: null,
              error: this.ERR.NO_MTP
            });
          }

          return resolve({
            error: null,
            data: {
              device: this.device,
              modelName: this.mtpNativeModule.Get_Modelname(this.device),
              serialNumber: this.mtpNativeModule.Get_Serialnumber(this.device),
              deviceVersion: this.mtpNativeModule.Get_Deviceversion(this.device)
            }
          });
        } catch (e) {
          console.error(`MTP -> detectMtp`, e);

          return resolve({
            data: null,
            error: e
          });
        }
      });
    });
  }

  /**
   * Throw MTP Error
   * @returns {Promise<{data: null, error: string}>}
   */
  throwMtpError() {
    return Promise.resolve({
      data: null,
      error: this.ERR.NO_MTP
    });
  }

  /**
   * Detect MTP
   * @returns {string|null}
   */
  getDevice() {
    return this.device;
  }

  /**
   * Detect MTP
   * @returns {string|null}
   */
  getStorageId() {
    return this.storageId;
  }

  /**
   * List Storage Devices
   * @returns {Promise<{data: *, error: *}>}
   */
  listStorageDevices() {
    if (!this.device) return this.throwMtpError();

    const storageData = {};

    try {
      this.mtpNativeModule.Get_Storage(
        this.device,
        MTP_FLAGS.STORAGE_SORTBY_NOTSORTED
      );

      const storageList = this.device.getStorages();

      if (undefinedOrNull(storageList) || !isArray(storageList)) {
        return Promise.resolve({
          data: null,
          error: this.ERR.NO_STORAGE
        });
      }

      storageList.forEach(storage => {
        storageData[storage.id] = storage;
      });

      return Promise.resolve({
        data: storageData,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> detectMtp`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  /**
   * Set Storage Devices
   * @param storageIndex:{int}
   * @param storageId:{null|int}
   * @returns {Promise<{data: *, error: *}>}
   */
  async setStorageDevices({ storageId = null, storageIndex = 0 }) {
    if (!this.device) return this.throwMtpError();

    try {
      const {
        error: listStorageDevicesError,
        data: listStorageDevicesData
      } = await this.listStorageDevices();

      if (listStorageDevicesError) {
        return Promise.resolve({
          data: null,
          error: listStorageDevicesError
        });
      }

      if (undefinedOrNull(listStorageDevicesData)) {
        return Promise.resolve({
          data: null,
          error: this.ERR.NO_STORAGE
        });
      }

      if (
        !undefinedOrNull(storageId) &&
        !undefinedOrNull(listStorageDevicesData[storageId])
      ) {
        this.storageId = storageId;
      } else {
        const selectedStorageDeviceId = Object.keys(listStorageDevicesData)[
          storageIndex
        ];

        this.storageId = !undefinedOrNull(selectedStorageDeviceId)
          ? selectedStorageDeviceId
          : Object.keys(listStorageDevicesData)[0];
      }

      let storageList;

      Object.keys(listStorageDevicesData).map(a => {
        const item = listStorageDevicesData[a];

        storageList = {
          ...storageList,
          [a]: {
            name: item.description,
            selected: a === this.storageId
          }
        };

        return storageList;
      });

      return Promise.resolve({
        data: storageList,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> setStorageDevices`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  /**
   * Release Device
   * @returns {Promise<{data: *, error: *}>}
   */
  releaseDevice() {
    if (!this.device) return this.throwMtpError();

    try {
      this.mtpNativeModule.Release_Device(this.device);
      this.device = null;
      return Promise.resolve({
        data: true,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> releaseDevice`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  /**
   * Get File Info
   * @param filePath:{string}
   * @param fileId:{int} (alternative to filePath)
   * @returns {Promise<{data: *, error: *}>}
   */
  async getFileInfo({ filePath = null, fileId = null }) {
    if (!this.device) return this.throwMtpError();

    try {
      if (!undefinedOrNull(filePath)) {
        const {
          error: resolvePathError,
          data: resolvePathData
        } = await this.resolvePath({ filePath });

        if (resolvePathError) {
          return Promise.resolve({
            data: null,
            error: resolvePathError
          });
        }

        return Promise.resolve({
          data: resolvePathData,
          error: null
        });
      }

      const fileInfo = this.mtpNativeModule.Get_Filemetadata(
        this.device,
        fileId
      );

      if (undefinedOrNull(fileInfo) || undefinedOrNull(fileInfo.name)) {
        return Promise.resolve({
          data: null,
          error: this.ERR.FILE_INFO_FAILED
        });
      }

      return Promise.resolve({
        data: fileInfo,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> getFileInfo`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  /**
   * Resolve Path
   * @param filePath:{string}
   * @returns {Promise<{data: *, error: *}>}
   */
  async resolvePath({ filePath }) {
    if (!this.device) return this.throwMtpError();

    try {
      if (undefinedOrNull(filePath)) {
        return Promise.resolve({
          data: null,
          error: this.ERR.INVALID_PATH_RESOLVE
        });
      }

      const _filePath = path.resolve(filePath);
      const rootPathProps = { id: MTP_FLAGS.FILES_AND_FOLDERS_ROOT };

      if (_filePath === '/') {
        return Promise.resolve({
          data: rootPathProps,
          error: null
        });
      }

      const filePathChunks = _filePath.split('/');
      let foundItem = rootPathProps;

      for (let i = 1; i < filePathChunks.length; i += 1) {
        const item = filePathChunks[i];

        const {
          error: listMtpFileTreeError,
          data: listMtpFileTreeData
        } = await this.__listMtpFileTree({
          folderId: foundItem.id,
          recursive: false
        });

        if (listMtpFileTreeError) {
          return Promise.resolve({
            data: null,
            error: listMtpFileTreeError
          });
        }

        foundItem = findLodash(listMtpFileTreeData, { name: item });

        if (!foundItem) {
          return Promise.resolve({
            data: null,
            error: this.ERR.INVALID_NOT_FOUND
          });
        }
      }

      return Promise.resolve({
        data: foundItem,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> resolvePath`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  /**
   * File Exists
   * @param filePath:{string}
   * @param fileName:{string} (alternative to filePath; use along with parentId)
   * @param parentId:{int} (alternative to filePath; use along with parentId)
   * @returns {Promise<{data: *, error: *}>}
   */
  async fileExists({ filePath = null, fileName = null, parentId = null }) {
    if (!this.device) return this.throwMtpError();

    try {
      if (!undefinedOrNull(filePath)) {
        const {
          error: resolvePathError,
          data: resolvePathData
        } = await this.resolvePath({ filePath });

        if (resolvePathError) {
          return Promise.resolve({
            data: null,
            error: resolvePathError
          });
        }

        return Promise.resolve({
          data: resolvePathData,
          error: null
        });
      }

      const {
        error: listMtpFileTreeError,
        data: listMtpFileTreeData
      } = await this.__listMtpFileTree({
        folderId: parentId,
        recursive: false
      });

      if (listMtpFileTreeError) {
        return Promise.resolve({
          data: null,
          error: listMtpFileTreeError
        });
      }

      const foundItem = findLodash(listMtpFileTreeData, { name: fileName });
      if (!foundItem) {
        return Promise.resolve({
          data: false,
          error: null
        });
      }

      return Promise.resolve({
        data: foundItem,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> fileExists`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  /**
   * Delete File
   * @param filePath:{string}
   * @param fileId:{int} (alternative to filePath)
   * @returns {Promise<{data: *, error: *}>}
   */
  async deleteFile({ filePath = null, fileId = null }) {
    if (!this.device) return this.throwMtpError();

    try {
      let _fileId = fileId;

      if (!undefinedOrNull(filePath)) {
        const {
          error: resolvePathError,
          data: resolvePathData
        } = await this.resolvePath({ filePath });

        if (resolvePathError) {
          return Promise.resolve({
            data: null,
            error: resolvePathError
          });
        }
        _fileId = resolvePathData.id;
      }

      this.mtpNativeModule.Destroy_file(this.device, _fileId);

      return Promise.resolve({
        data: true,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> deleteFile`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  /**
   * Rename File
   * @param filePath:{string}
   * @param newfileName:{string}
   * @param fileId:{int} (alternative to filePath)
   * @returns {Promise<{data: *, error: *}>}
   */
  async renameFile({ filePath = null, newfileName, fileId = null }) {
    if (!this.device) return this.throwMtpError();

    try {
      if (
        undefinedOrNull(newfileName) ||
        newfileName.indexOf('/') !== -1 ||
        newfileName.trim() === ''
      ) {
        return Promise.resolve({
          data: null,
          error: this.ERR.ILLEGAL_FILE_NAME
        });
      }

      let _fileId = fileId;

      if (!undefinedOrNull(filePath)) {
        const {
          error: resolvePathError,
          data: resolvePathData
        } = await this.resolvePath({ filePath });

        if (resolvePathError) {
          return Promise.resolve({
            data: null,
            error: resolvePathError
          });
        }
        _fileId = resolvePathData.id;
      }

      // eslint-disable-next-line new-cap
      const file = new this.mtpNativeModule.file_t();
      file.id = _fileId;
      file.storageId = this.storageId;

      const renamed = this.mtpNativeModule.Set_File_Name(
        this.device,
        file,
        newfileName
      );

      if (renamed !== 0) {
        const {
          error: getFileInfoError,
          data: getFileInfoData
        } = await this.getFileInfo({ fileId: _fileId });

        if (!getFileInfoError && getFileInfoData.name !== newfileName) {
          return Promise.resolve({
            data: null,
            error: this.ERR.RENAME_FAILED
          });
        }
      }

      return Promise.resolve({
        data: true,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> renameFile`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  /**
   * Create Folder
   * @param newFolderPath: {string}
   * @param parentId: {int} (alternative to filePath; use along with newFolderName)
   * @param newFolderName: {string} (alternative to filePath; use along with parentId)
   * @returns {Promise<{data: *, error: *}>}
   */
  async createFolder({
    newFolderPath = null,
    parentId = null,
    newFolderName = null
  }) {
    if (!this.device) return this.throwMtpError();

    let _parentId = parentId;
    let _newFolderName = newFolderName;

    try {
      let createdFolder = null;

      if (!undefinedOrNull(newFolderPath)) {
        const _newFolderPath = path.resolve(newFolderPath);
        _newFolderName = path.basename(_newFolderPath);
        const parentPath = path.dirname(_newFolderPath);

        const {
          error: resolvePathError,
          data: resolvePathData
        } = await this.resolvePath({ filePath: parentPath });

        if (resolvePathError) {
          return Promise.resolve({
            data: null,
            error: resolvePathError
          });
        }

        createdFolder = this.mtpNativeModule.Create_Folder(
          this.device,
          _newFolderName,
          resolvePathData.id,
          this.storageId
        );

        _parentId = resolvePathData.id;
      } else {
        createdFolder = this.mtpNativeModule.Create_Folder(
          this.device,
          _newFolderName,
          parentId,
          this.storageId
        );
      }

      if (createdFolder === 0) {
        const {
          error: fileExistsError,
          data: fileExistsData
        } = await this.fileExists({
          fileName: _newFolderName,
          parentId: _parentId
        });

        if (fileExistsError) {
          return Promise.resolve({
            data: null,
            error: fileExistsError
          });
        }

        if (
          undefinedOrNull(fileExistsData) ||
          undefinedOrNull(fileExistsData.id)
        ) {
          return Promise.resolve({
            data: null,
            error: this.ERR.CREATE_FOLDER_FAILED
          });
        }

        if (!fileExistsData.isFolder) {
          return Promise.resolve({
            data: null,
            error: this.ERR.CREATE_FOLDER_FILE_FAILED
          });
        }

        return Promise.resolve({
          data: fileExistsData.id,
          error: null
        });
      }

      return Promise.resolve({
        data: createdFolder,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> createFolder`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  /**
   * List MTP File Tree using Folder Id
   * @param folderPath: {string}
   * @param ignoreHiddenFiles: {boolean}
   * @param recursive: {boolean}
   * @returns {Promise<{data: *, error: *}>}
   */

  async listMtpFileTree({
    folderPath = null,
    recursive = false,
    ignoreHiddenFiles = false
  }) {
    const filePath = path.resolve(folderPath);

    const {
      error: resolvePathError,
      data: resolvePathData
    } = await this.resolvePath({ filePath });

    if (resolvePathError) {
      return Promise.resolve({
        data: null,
        error: resolvePathError
      });
    }

    const {
      error: listMtpFileTreeError,
      data: listMtpFileTreeData
    } = await this.__listMtpFileTree({
      recursive,
      ignoreHiddenFiles,
      folderId: resolvePathData.id,
      parentPath: filePath
    });

    if (listMtpFileTreeError) {
      return Promise.resolve({
        data: null,
        error: listMtpFileTreeError
      });
    }

    return Promise.resolve({
      data: listMtpFileTreeData,
      error: null
    });
  }

  /**
   * List MTP File Tree using Folder Id
   * @param folderId: {int}
   * @param recursive: {boolean}
   * @param fileTreeStructure: {array}
   * @param parentPath: {string}
   * @param ignoreHiddenFiles: {boolean}
   * @param filePath: {string}
   * @returns {Promise<{data: *, error: *}>}
   */
  async __listMtpFileTree({
    folderId,
    recursive = false,
    fileTreeStructure = [],
    parentPath = '',
    ignoreHiddenFiles = false
  }) {
    if (!this.device) return this.throwMtpError();

    try {
      const files = this.mtpNativeModule.Get_Files_And_Folders(
        this.device,
        this.storageId,
        folderId
      );

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];

        // eslint-disable-next-line no-useless-escape
        if (ignoreHiddenFiles && /(^|\/)\.[^\/\.]/g.test(file.name)) {
          continue; // eslint-disable-line no-continue
        }

        const fullPath = path.join(parentPath, file.name);
        const isFolder = MTP_FLAGS.FILETYPE_FOLDER === file.type;

        const fileInfo = {
          id: file.id,
          name: file.name,
          size: file.size,
          isFolder,
          parentId: file.parentId,
          type: file.type,
          storageId: file.storageId,
          path: fullPath,
          extension: getExtension(fullPath, isFolder),
          dateAdded: moment
            .unix(file.modificationDate)
            .format('YYYY-MM-DD HH:mm:ss'),
          children: []
        };

        const lastIndex = fileTreeStructure.push(fileInfo) - 1;

        if (MTP_FLAGS.FILETYPE_FOLDER === file.type && recursive) {
          await this.__listMtpFileTree({
            folderId: file.id,
            recursive,
            parentPath: fullPath,
            fileTreeStructure: fileTreeStructure[lastIndex].children
          });
        }
      }

      return Promise.resolve({
        data: fileTreeStructure,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> listMtpFileTree`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  /**
   * List Local File Tree
   * @param folderPath: {string}
   * @param recursive: {boolean}
   * @param fileTreeStructure: {array}
   * @returns {Promise<{data: *, error: *}>}
   */
  async listLocalFileTree({
    folderPath,
    recursive = false,
    fileTreeStructure = []
  }) {
    if (!this.device) return this.throwMtpError();

    try {
      if (!fs.existsSync(folderPath)) {
        return Promise.resolve({
          data: null,
          error: this.ERR.LOCAL_FOLDER_NOT_FOUND
        });
      }

      const files = fs.readdirSync(folderPath);
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];

        if (!junk.is(file)) {
          const fullPath = path.join(folderPath, file);
          const stats = fs.lstatSync(fullPath);
          const isFolder = stats.isDirectory();
          const fileInfo = {
            id: quickHash(fullPath),
            name: file,
            size: stats.size,
            isFolder,
            path: fullPath,
            children: []
          };

          if (isWritable(fullPath)) {
            const lastIndex = fileTreeStructure.push(fileInfo) - 1;

            if (isFolder && recursive) {
              await this.listLocalFileTree({
                folderPath: fullPath,
                recursive,
                fileTreeStructure: fileTreeStructure[lastIndex].children
              });
            }
          }
        }
      }

      return Promise.resolve({
        data: fileTreeStructure,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> listLocalFileTree`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  /**
   * Download File
   * @param destinationFilePath: {string}
   * @param file: {object}
   * @param callback: {fn}
   * @returns {Promise<{data: *, error: *}>}
   */
  downloadFile({ destinationFilePath, file, callback }) {
    if (!this.device) return this.throwMtpError();

    try {
      const downloadedFile = this.mtpNativeModule.Get_File_To_File(
        this.device,
        file.id,
        destinationFilePath,
        (sent, total) => {
          if (typeof callback === 'function') {
            callback({ sent, total, file });
          }
        }
      );

      if (downloadedFile !== 0) {
        return Promise.resolve({
          data: null,
          error: this.ERR.DOWNLOAD_FILE_FAILED
        });
      }

      return Promise.resolve({
        data: downloadedFile,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> downloadFile`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  /**
   * Download File Tree
   * @param rootNode: {boolean}
   * @param nodes: {array}
   * @param destinationFilePath: {string}
   * @param callback: {fn}
   * @returns {Promise<{data: *, error: *}>}
   */
  async downloadFileTree({
    rootNode = false,
    nodes,
    destinationFilePath,
    callback
  }) {
    if (!this.device) return this.throwMtpError();

    try {
      if (rootNode && nodes.length < 1) {
        return Promise.resolve({
          data: null,
          error: this.ERR.NO_FILES_COPIED
        });
      }

      for (let i = 0; i < nodes.length; i += 1) {
        const item = nodes[i];
        const localFilePath = path.join(destinationFilePath, item.name);

        if (item.isFolder) {
          const { error: promisifiedMkdirError } = await promisifiedMkdir({
            newFolderPath: localFilePath
          });

          if (promisifiedMkdirError) {
            return Promise.resolve({
              data: null,
              error: promisifiedMkdirError
            });
          }

          const { error: downloadFileTreeError } = await this.downloadFileTree({
            nodes: item.children,
            destinationFilePath: localFilePath,
            callback
          });

          if (downloadFileTreeError) {
            return Promise.resolve({
              data: null,
              error: downloadFileTreeError
            });
          }

          continue;
        }

        const { error: downloadedFileError } = await this.downloadFile({
          destinationFilePath: localFilePath,
          file: item,
          callback
        });

        if (downloadedFileError) {
          return Promise.resolve({
            data: null,
            error: downloadedFileError
          });
        }
      }

      return Promise.resolve({
        data: true,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> downloadFileTree`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  /**
   * Upload File
   * @param filePath: {string}
   * @param parentId: {int}
   * @param size: {int}
   * @param callback: {fn}
   * @returns {Promise<{data: *, error: *}>}
   */
  uploadFile({ filePath, parentId, size, callback }) {
    if (!this.device) return this.throwMtpError();

    try {
      // eslint-disable-next-line new-cap
      const file = new this.mtpNativeModule.file_t();
      file.size = size;
      file.name = path.basename(filePath);
      file.type = MTP_FLAGS.FILETYPE_UNKNOWN;
      file.parentId = parentId;
      file.storageId = this.storageId;

      const uploadedFile = this.mtpNativeModule.Send_File_From_File(
        this.device,
        filePath,
        file,
        (sent, total) => {
          if (typeof callback === 'function') {
            callback({ sent, total, file });
          }
        }
      );

      if (uploadedFile !== 0) {
        return Promise.resolve({
          data: null,
          error: this.ERR.UPLOAD_FILE_FAILED
        });
      }

      return Promise.resolve({
        data: uploadedFile,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> uploadFile`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }

  /**
   * Upload File Tree
   * @param nodes: {array}
   * @param folderPath:{string}
   * @param parentId: {int} (alternative to folderPath)
   * @param callback: {fn}
   * @returns {Promise<{data: *, error: *}>}
   */
  async uploadFileTree({
    nodes,
    folderPath = null,
    callback,
    parentId = null
  }) {
    if (!this.device) return this.throwMtpError();

    let _parentId = parentId;

    try {
      if (!undefinedOrNull(folderPath)) {
        const filePath = path.resolve(folderPath);

        const {
          error: resolvePathError,
          data: resolvePathData
        } = await this.resolvePath({ filePath });

        if (resolvePathError) {
          return Promise.resolve({
            data: null,
            error: resolvePathError
          });
        }

        _parentId = resolvePathData.id;
      }

      for (let i = 0; i < nodes.length; i += 1) {
        const item = nodes[i];

        if (item.isFolder) {
          const {
            error: createFolderError,
            data: createFolderData
          } = await this.createFolder({
            newFolderName: item.name,
            parentId: _parentId
          });

          if (createFolderError) {
            return Promise.resolve({
              data: null,
              error: createFolderError
            });
          }

          const { error: uploadFileTreeError } = await this.uploadFileTree({
            nodes: item.children,
            parentId: createFolderData,
            callback
          });

          if (uploadFileTreeError) {
            return Promise.resolve({
              data: null,
              error: uploadFileTreeError
            });
          }

          continue;
        }

        const {
          error: fileExistsError,
          data: fileExistsData
        } = await this.fileExists({
          fileName: item.name,
          parentId: _parentId
        });

        if (fileExistsError) {
          return Promise.resolve({
            data: null,
            error: fileExistsError
          });
        }

        if (fileExistsData) {
          const { error: deleteFileError } = await this.deleteFile({
            fileId: fileExistsData.id
          });

          if (deleteFileError) {
            return Promise.resolve({
              data: null,
              error: deleteFileError
            });
          }
        }

        const { error: uploadFileError } = await this.uploadFile({
          filePath: item.path,
          parentId: _parentId,
          size: item.size,
          callback
        });

        if (uploadFileError) {
          return Promise.resolve({
            data: null,
            error: uploadFileError
          });
        }
      }

      return Promise.resolve({
        data: true,
        error: null
      });
    } catch (e) {
      console.error(`MTP -> uploadFileTree`, e);

      return Promise.resolve({
        data: null,
        error: e
      });
    }
  }
}

module.exports.MTP = MTP;
