'use strict';

const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const junk = require('junk');
const findLodash = require('lodash/find');
const mtpHelper = require('./mtp-helper');
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
  constructor() {
    this.mtpHelper = mtpHelper;
    this.device = null;
    this.storageId = null;

    this.ERR = {
      NO_MTP: `No MTP device found`,
      NO_STORAGE: `MTP storage not accessible`,
      LOCAL_FOLDER_NOT_FOUND: `Folder not found`
    };
  }

  init() {
    try {
      this.mtpHelper.Init();
    } catch (e) {
      console.error(`MTP -> init`, e);
    }
  }

  detectMtp() {
    let error = null;

    return new Promise(resolve => {
      return this.mtpHelper.Detect_Raw_Devices((err, rawDevices) => {
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
              error: error
            });
          }

          this.device = this.mtpHelper.Open_Raw_Device_Uncached(rawDevices[0]);

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
              modelName: this.mtpHelper.Get_Modelname(this.device),
              serialNumber: this.mtpHelper.Get_Serialnumber(this.device),
              deviceVersion: this.mtpHelper.Get_Deviceversion(this.device)
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

  throwMtpError() {
    return Promise.resolve({
      data: null,
      error: this.ERR.NO_MTP
    });
  }

  getDevice() {
    return this.device;
  }

  getStorageId() {
    return this.storageId;
  }

  listStorageDevices() {
    if (this.device === null) return this.throwMtpError();

    const storageData = {};

    try {
      this.mtpHelper.Get_Storage(
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

  async setStorageDevices({ deviceIndex = 0 }) {
    if (this.device === null) return this.throwMtpError();

    const listStorageDevices = await this.listStorageDevices();

    try {
      if (undefinedOrNull(listStorageDevices)) {
        return Promise.resolve({
          data: null,
          error: this.ERR.NO_STORAGE
        });
      }

      const _listStorageDevices = Object.keys(listStorageDevices)[deviceIndex];

      this.storageId = !undefinedOrNull(_listStorageDevices)
        ? _listStorageDevices
        : Object.keys(listStorageDevices)[0];

      return Promise.resolve({
        data: this.storageId,
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

  releaseDevice() {
    if (this.device === null) return this.throwMtpError();

    try {
      this.mtpHelper.Release_Device(this.device);
      return Promise.resolve({
        data: null,
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

  async fileExists({ fileName, parentId }) {
    if (this.device === null) return this.throwMtpError();

    if (undefinedOrNull(fileName)) {
      return null;
    }

    const listMtpFileTree = await this.listMtpFileTree({
      folderId: parentId,
      recursive: false
    });

    const foundItem = findLodash(listMtpFileTree, { name: fileName });
    if (foundItem) {
      return Promise.resolve(foundItem);
    }

    return Promise.resolve(null);
  }

  deleteFile({ fileId }) {
    if (this.device === null) return this.throwMtpError();

    return Promise.resolve(this.mtpHelper.Destroy_file(this.device, fileId));
  }

  renameFile({ fileId, currentFileName, newfileName, parentId }) {
    if (this.device === null) return this.throwMtpError();

    const file = new this.mtpHelper.file_t();
    file.id = fileId;
    file.parentId = parentId;
    file.storageId = this.storageId;

    return Promise.resolve(
      this.mtpHelper.Set_File_Name(this.device, file, newfileName)
    );
  }

  createFolder({ folderPath, parentId }) {
    if (this.device === null) return this.throwMtpError();

    return Promise.resolve(
      this.mtpHelper.Create_Folder(
        this.device,
        folderPath,
        parentId,
        this.storageId
      )
    );
  }

  async listMtpFileTree({
    folderId,
    recursive = false,
    fileTreeStructure = [],
    parentPath = ''
  }) {
    if (this.device === null) return this.throwMtpError();

    try {
      const files = this.mtpHelper.Get_Files_And_Folders(
        this.device,
        this.storageId,
        folderId
      );

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const fullPath = path.join(parentPath, file.name);
        const fileInfo = {
          id: file.id,
          name: file.name,
          size: file.size,
          isFolder: MTP_FLAGS.FILETYPE_FOLDER === file.type,
          parentId: file.parentId,
          type: file.type,
          storageId: file.storageId,
          path: fullPath,
          children: []
        };

        const lastIndex = fileTreeStructure.push(fileInfo) - 1;

        if (MTP_FLAGS.FILETYPE_FOLDER === file.type && recursive) {
          await this.listMtpFileTree({
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

  async listLocalFileTree({
    folderPath,
    recursive = false,
    fileTreeStructure = []
  }) {
    try {
      if (!fs.existsSync(path)) {
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
          const size = stats.size;
          const isFolder = stats.isDirectory();
          const fileInfo = {
            id: quickHash(fullPath),
            name: file,
            size,
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

  downloadFile({ destinationFilePath, fileId }) {
    if (this.device === null) return this.throwMtpError();

    return Promise.resolve(
      this.mtpHelper.Get_File_To_File(
        this.device,
        fileId,
        destinationFilePath,
        (sent, total) => {
          process.stdout.write(`Downloaded file: ${sent} of ${total}`);
        }
      )
    );
  }

  async downloadFileTree({ nodes, destinationFilePath }) {
    if (this.device === null) return this.throwMtpError();

    for (let i = 0; i < nodes.length; i += 1) {
      const item = nodes[i];

      if (item.isFolder) {
        const newFolderPath = `${destinationFilePath}/${item.name}`;

        const { error } = await promisifiedMkdir({
          newFolderPath
        });

        if (error) {
          console.error(`${error}`, `downloadFileTree -> mkdir error`);
          return { error, stderr: null, data: false };
        }

        await this.downloadFileTree({
          nodes: item.children,
          destinationFilePath: newFolderPath
        });

        continue;
      }

      return await this.downloadFile({
        destinationFilePath: `${destinationFilePath}/${item.name}`,
        fileId: item.id
      });
    }
  }

  uploadFile({ filePath, parentId, size }) {
    if (this.device === null) return this.throwMtpError();

    const file = new this.mtpHelper.file_t();
    file.size = size;
    file.name = path.basename(filePath);
    file.type = MTP_FLAGS.FILETYPE_UNKNOWN;
    file.parentId = parentId;
    file.storageId = this.storageId;

    return Promise.resolve(
      this.mtpHelper.Send_File_From_File(
        this.device,
        filePath,
        file,
        (sent, total) => {
          process.stdout.write(`Uploaded file: ${sent} of ${total}`);
        }
      )
    );
  }

  async uploadFileTree({ nodes, parentId }) {
    if (this.device === null) return this.throwMtpError();

    for (let i = 0; i < nodes.length; i += 1) {
      const item = nodes[i];
      let newId = 0;

      if (item.isFolder) {
        newId = await this.createFolder({
          folderPath: item.name,
          parentId
        });

        if (newId === 0) {
          const _folderExists = await this.fileExists({
            fileName: path.basename(item.name),
            parentId
          });

          if (
            undefinedOrNull(_folderExists) ||
            undefinedOrNull(_folderExists.id)
          ) {
            return Promise.resolve(null); // todo: error
          }

          newId = _folderExists.id;
        }

        await this.uploadFileTree({
          nodes: item.children,
          parentId: newId
        });

        continue;
      }

      const _fileExists = await this.fileExists({
        fileName: path.basename(item.name),
        parentId
      });

      if (_fileExists) {
        this.deleteFile({ fileId: _fileExists.id });
      }

      await this.uploadFile({
        filePath: item.path,
        parentId,
        size: item.size
      });
    }

    return Promise.resolve(true);
  }
}

module.exports.MTP = MTP;
