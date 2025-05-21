const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Crear carpeta para imágenes QR si no existe
const QR_DIR = path.join(__dirname, 'public', 'qr');
if (!fs.existsSync(QR_DIR)) {
    fs.mkdirSync(QR_DIR, { recursive: true });
}

// Base de datos simulada para transacciones
let transactions = {};

// Base de datos de bebidas
const drinks = {
    '1': { name: 'Margarita Clásica', price: 8.00 },
    '2': { name: 'Mojito Cubano', price: 9.00 },
    '3': { name: 'Piña Colada Tropical', price: 10.00 },
    '4': { name: 'Cosmopolitan', price: 11.00 },
    '5': { name: 'Daiquiri de Fresa', price: 11.50 },
    '6': { name: 'Long Island Iced Tea', price: 12.00 }
};

// Función para enviar comando al Arduino (simulada)
function enviarComandoAMaquina(drinkId) {
    return new Promise((resolve, reject) => {
        // En un entorno real, aquí te conectarías con tu Arduino
        // Para fines de demostración, simplemente simulamos una respuesta exitosa
        console.log(`Sirviendo bebida ${drinkId}...`);
        
        // Simulamos un retraso de 3 segundos (como si la máquina estuviera trabajando)
        setTimeout(() => {
            console.log('Bebida servida correctamente');
            resolve(true);
        }, 3000);
    });
}

// Rutas de la API

// 1. Crear una nueva transacción y generar QR
app.post('/create-transaction', async (req, res) => {
    try {
        const { drinkId, amount } = req.body;
        
        if (!drinkId || !amount) {
            return res.status(400).json({ error: 'Faltan datos requeridos' });
        }
        
        // Validar que existe la bebida
        if (!drinks[drinkId]) {
            return res.status(404).json({ error: 'Bebida no encontrada' });
        }
        
        const transactionId = uuidv4();
        const timestamp = Date.now();
        
        // En un entorno real, aquí conectarías con una pasarela de pago
        // Para la demostración, generamos un QR con datos simulados
        
        // URL para usar con una billetera móvil (simulada)
        const paymentUrl = `robotbartender://pay?id=${transactionId}&amount=${amount}&currency=USD`;
        
        // Generar imagen QR
        const qrImageFilename = `${transactionId}.png`;
        const qrImagePath = path.join(QR_DIR, qrImageFilename);
        
        // Generar QR como imagen
        await qrcode.toFile(qrImagePath, paymentUrl);
        
        // Guardar transacción
        transactions[transactionId] = {
            id: transactionId,
            drinkId,
            amount,
            status: 'pending',
            created: timestamp
        };
        
        res.status(201).json({ 
            transactionId, 
            qrImageUrl: `/qr/${qrImageFilename}`,
            status: 'pending'
        });
        
    } catch (error) {
        console.error('Error al crear transacción:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// 2. Verificar estado de pago
app.get('/check-payment/:transactionId', (req, res) => {
    const { transactionId } = req.params;
    
    if (!transactions[transactionId]) {
        return res.status(404).json({ error: 'Transacción no encontrada' });
    }
    
    // Para demostración, simulamos que el pago se completa después de 15 segundos
    const elapsedTime = Date.now() - transactions[transactionId].created;
    if (elapsedTime > 15000 && transactions[transactionId].status === 'pending') {
        transactions[transactionId].status = 'completed';
        
        // Si el pago fue exitoso, servir la bebida
        const drinkId = transactions[transactionId].drinkId;
        enviarComandoAMaquina(drinkId).catch(err => {
            console.error('Error al servir bebida:', err);
        });
    }
    
    res.json({ 
        transactionId,
        status: transactions[transactionId].status 
    });
});

// 3. Simulación para completar pago (solo para pruebas)
app.post('/simulate-payment/:transactionId', async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        if (!transactions[transactionId]) {
            return res.status(404).json({ error: 'Transacción no encontrada' });
        }
        
        // Actualizar estado
        transactions[transactionId].status = 'completed';
        
        // Servir bebida
        const drinkId = transactions[transactionId].drinkId;
        
        try {
            await enviarComandoAMaquina(drinkId);
        } catch (error) {
            console.error('Error al servir bebida:', error);
            return res.status(500).json({ 
                error: 'Error al servir bebida',
                message: error.message
            });
        }
        
        res.json({ 
            success: true, 
            status: 'completed' 
        });
        
    } catch (error) {
        console.error('Error al simular pago:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});