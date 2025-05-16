const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  serial: {
    listPorts: () => ipcRenderer.invoke('listSerialPorts'),
    connect: (portName) => ipcRenderer.invoke('connect-to-device', portName),
    readRegister: (register, length) => ipcRenderer.invoke('read-register', { register, length }),
    writeRegister: (register, value) => ipcRenderer.invoke('write-register', { register, value }),
    getAllData: () => ipcRenderer.invoke('get-all-data')
  },
  onUpdate: (callback) => {
    ipcRenderer.on('data-update', (event, data) => callback(data))
  },
  onPortsUpdate: (callback) => {
    ipcRenderer.on('ports-updated', (event, ports) => callback(ports))
  }
})