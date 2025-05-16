// Electron est l'outil permettant de facilement créé des applications
const { app, BrowserWindow, ipcMain } = require('electron')
// On a besoin des ports de communication pour se connecter au RD6012
const { SerialPort } = require('serialport')
const path = require('path')

// Configuration du debug
const debug = require('debug')('serial')
debug.log = console.log.bind(console)

let mainWindow
let port = null
let dataInterval = null

/*

    Il manque plusieurs parties dans ce fichier et c'est à vous de les retrouver.
Evidemment, nous ne vous demandons pas de savoir coder dans ces langages mais simplement de retrouver
des informations importantes.

    Il est simple d'utiliser des IAs pour un sujet comme celui-ci, cependant, vous n'apprendrez pas grand chose
et le sujet est fait pour être simple et sans prise de tête. Essayez par vous-même d'abord !

*/

// --------------------------------------------------
// Définition complète des registres RD6012
// --------------------------------------------------

/*
-------------------------------------------- Exercice --------------------------------------------

    Comme vous pouvez le constater, quelques registres utiles à la communication avec
l'alimentation Riden sont manquants. L'alimentation fonctionne via une communication modbus, 
il vous faudra par exemple retrouver les registres et les adresses des éléments importants.

1° - Allez sur le site suivant : https://drive.google.com/drive/folders/1NdHp_BiQKGyVf5ahfyhNrGkTcO2AzWC0
Il contient les étapes pour l'installation de l'application de base de l'alimentation.

2° - Installez l'application et testez la sur votre RD6012.

3° - Installez l'application Serial Port Monitor : https://www.electronic.us/products/serial-port-monitor/post-download/

4° - Espionnez le port de communication et retrouvez les adresses des registres décrits plus bas : "![VALEUR]!".

*/

const Register = {
    ID: 0,
    V_OUT: 10,
    I_OUT: 11,
    OUTPUT: /*!VALEUR!*/,
    P_OUT: 13,
    V_SET: /*!VALEUR!*/,
    I_SET: /*!VALEUR!*/,
    CV_CC: 17,
}

// --------------------------------------------------
// Fonctions Modbus
// --------------------------------------------------

function calculateCRC(buffer) {
    let crc = 0xFFFF
    for (let pos = 0; pos < buffer.length; pos++) {
        crc ^= buffer[pos]
        for (let i = 8; i !== 0; i--) {
            if ((crc & 0x0001) !== 0) {
                crc >>= 1
                crc ^= 0xA001
            } else {
                crc >>= 1
            }
        }
    }
    return crc
}

function createModbusRTUFrame(deviceId, functionCode, registerAddress, value = null) {
    const buffer = Buffer.alloc(value === null ? 5 : 6)
    buffer.writeUInt8(deviceId, 0)
    buffer.writeUInt8(functionCode, 1)
    buffer.writeUInt16BE(registerAddress, 2)
    
    if (value !== null) {
        buffer.writeUInt16BE(value, 4)
    }
    
    const crc = calculateCRC(buffer.slice(0, value === null ? 4 : 6))
    return Buffer.concat([buffer, Buffer.from([crc & 0xFF, crc >> 8])])
}

async function readRegister(register, length = 1) {
    return new Promise((resolve, reject) => {
        if (!port || !port.isOpen) {
            reject(new Error('Port série non ouvert'))
            return
        }

        const deviceId = 1
        const frame = createModbusRTUFrame(deviceId, 0x03, register, length)

        let responseBuffer = Buffer.alloc(0)
        const timeout = setTimeout(() => {
            port.removeAllListeners('data')
            reject(new Error('Timeout de lecture Modbus'))
        }, 2000)

        const onData = (data) => {
            responseBuffer = Buffer.concat([responseBuffer, data])
            
            if (responseBuffer.length >= 5 + 2 * length) {
                clearTimeout(timeout)
                port.removeAllListeners('data')
                
                const receivedCRC = responseBuffer.readUInt16LE(responseBuffer.length - 2)
                const calculatedCRC = calculateCRC(responseBuffer.slice(0, -2))
                
                if (receivedCRC !== calculatedCRC) {
                    reject(new Error('CRC invalide'))
                    return
                }
                
                const data = []
                for (let i = 0; i < length; i++) {
                    data.push(responseBuffer.readUInt16BE(3 + i * 2))
                }
                
                resolve({ data })
            }
        }

        port.on('data', onData)
        port.write(frame, (err) => {
            if (err) {
                clearTimeout(timeout)
                port.removeAllListeners('data')
                reject(err)
            }
        })
    })
}

async function writeRegister(register, value) {
    return new Promise((resolve, reject) => {
        if (!port || !port.isOpen) {
            reject(new Error('Port série non ouvert'))
            return
        }

        const deviceId = 1
        const frame = createModbusRTUFrame(deviceId, 0x06, register, value)

        let responseBuffer = Buffer.alloc(0)
        const timeout = setTimeout(() => {
            port.removeAllListeners('data')
            reject(new Error('Timeout d\'écriture Modbus'))
        }, 2000)

        const onData = (data) => {
            responseBuffer = Buffer.concat([responseBuffer, data])
            
            if (responseBuffer.length >= 8) {
                clearTimeout(timeout)
                port.removeAllListeners('data')
                
                const receivedCRC = responseBuffer.readUInt16LE(responseBuffer.length - 2)
                const calculatedCRC = calculateCRC(responseBuffer.slice(0, -2))
                
                if (receivedCRC !== calculatedCRC) {
                    reject(new Error('CRC invalide'))
                    return
                }
                
                resolve(true)
            }
        }

        port.on('data', onData)
        port.write(frame, (err) => {
            if (err) {
                clearTimeout(timeout)
                port.removeAllListeners('data')
                reject(err)
            }
        })
    })
}

// --------------------------------------------------
// Fonctions de gestion des données
// --------------------------------------------------

async function readAllRegisters() {
    try {
        const results = await Promise.all([
            readRegister(Register.V_OUT),
            readRegister(Register.I_OUT),
            readRegister(Register.P_OUT),
            readRegister(Register.CV_CC)
        ])

        return {
            voltage: results[0].data[0] / 100,
            current: results[1].data[0] / 100,
            power: results[2].data[0] / 100,
            mode: results[3].data[0]
        }
    } catch (error) {
        console.error('Erreur lecture registres:', error)
        throw error
    }
}

// --------------------------------------------------
// Gestion de l'application
// --------------------------------------------------

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true
        }
    })

    mainWindow.loadFile('index.html')

    // Auto-réactualisation des ports
    setInterval(async () => {
        try {
            const ports = await SerialPort.list()
            mainWindow.webContents.send('ports-updated', ports)
        } catch (error) {
            console.error('Error listing ports:', error)
        }
    }, 5000)
}

app.whenReady().then(() => {
    createWindow()
    
    setTimeout(async () => {
        try {
            const ports = await SerialPort.list()
            mainWindow.webContents.send('ports-updated', ports)
        } catch (error) {
            console.error('Initial port scan failed:', error)
        }
    }, 1000)
})

// --------------------------------------------------
// Gestionnaires IPC
// --------------------------------------------------

ipcMain.handle('read-register', async (event, { register, length = 1 }) => {
    try {
        const result = await readRegister(Register[register] || register, length)
        return { success: true, data: result.data }
    } catch (error) {
        return { success: false, error: error.message }
    }
})

ipcMain.handle('write-register', async (event, { register, value }) => {
    try {
        await writeRegister(Register[register] || register, value)
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
})

ipcMain.handle('get-all-data', async () => {
    try {
        if (!port?.isOpen) {
            return { success: false, error: 'Port série non ouvert' }
        }
        
        const results = await Promise.all([
            readRegister(Register.V_SET),
            readRegister(Register.I_SET),
            readRegister(Register.OUTPUT),
        ]);

        return {
            success: true,
            data: {
                voltageSet: results[0].data[0] / 100,
                currentSet: results[1].data[0] / 100,
                output: results[2].data[0]
            }
        };
    } catch (error) {
        return { success: false, error: error.message }
    }
});

ipcMain.handle('listSerialPorts', async () => {
    const ports = await SerialPort.list()
    return ports
})

ipcMain.handle('connect-to-device', async (event, portName) => {
    try {
        // Fermer connexion existante
        if (port?.isOpen) {
            port.close()
        }
        if (dataInterval) {
            clearInterval(dataInterval)
        }

        // Ouvrir nouvelle connexion
        port = new SerialPort({
            path: portName,
            baudRate: 115200,
            dataBits: 8,
            parity: 'none',
            stopBits: 1
        })

        return new Promise((resolve, reject) => {
            port.once('open', () => {
                console.log(`Port ${portName} ouvert avec succès`)
                
                // Démarrer la lecture périodique
                dataInterval = setInterval(async () => {
                    try {
                        const result = await readAllRegisters()
                        mainWindow.webContents.send('data-update', result)
                    } catch (error) {
                        console.error('Erreur lecture périodique:', error)
                    }
                }, 1000) // Lecture toutes les secondes
                
                resolve({ success: true })
            })

            port.once('error', (err) => {
                console.error(`Erreur sur le port ${portName}:`, err)
                reject(new Error(`Erreur de connexion: ${err.message}`))
            })

            setTimeout(() => {
                if (!port?.isOpen) {
                    reject(new Error('Timeout de connexion'))
                }
            }, 2000)
        })
    } catch (error) {
        console.error('Erreur connexion:', error)
        return { success: false, error: error.message }
    }
})

// --------------------------------------------------
// Gestion de la fermeture
// --------------------------------------------------

app.on('window-all-closed', () => {
    if (port?.isOpen) {
        port.close()
    }
    if (dataInterval) {
        clearInterval(dataInterval)
    }
    if (process.platform !== 'darwin') {
        app.quit()
    }
})