// Configuración de PagoFácil
const PAGOFACIL_CONFIG = {
    tcCommerceID: "d029fa3a95e174a19934857f535eb9427d967218a36ea014b70ad704bc6c8d1c",
    TokenSecret: "9E7BC239DDC04F83B49FFDA5",
    TokenService: "51247fae280c20410824977b0781453df59fad5b23bf2a0d14e884482f91e09078dbe5966e0b970ba696ec4caf9aa5661802935f86717c481f1670e63f35d5041c31d7cc6124be82afedc4fe926b806755efe678917468e31593a5f427c79cdf016b686fca0cb58eb145cf524f62088b57c6987b3bb3f30c2082b640d7c52907"
};

// Contador de pagos (simulado con localStorage)
function getNextPaymentNumber() {
    let lastNumber = parseInt(localStorage.getItem('lastPaymentNumber')) || 10;
    const newNumber = lastNumber + 1;
    localStorage.setItem('lastPaymentNumber', newNumber);
    return `Grupo1-${newNumber}`;
}

// Función para generar el código QR y crear la orden
async function generateQRCodeAndOrder(paymentNumber, userData, cartItems) {
    try {
        // Validaciones básicas
        if (!userData.email || !cartItems || cartItems.length === 0) {
            throw new Error("Datos inválidos: Falta el correo del usuario o los artículos del carrito.");
        }

        console.log('Generando PedidoID (tcNroPago):', paymentNumber);

        // Preparar datos para la solicitud de generación de QR
        const postData = {
            tcCommerceID: PAGOFACIL_CONFIG.tcCommerceID,
            tnMoneda: "1",
            tnTelefono: userData.numero || "777777",
            tcCorreo: userData.email,
            tcNombreUsuario: userData.names || userData.displayName,
            tnCiNit: userData.ci || "123465",
            tcNroPago: paymentNumber,
            tnMontoClienteEmpresa: 0.01,
            tcUrlCallBack: "https://paymentcallback-my2ukxwbga-uc.a.run.app",
            tcUrlReturn: "",
            taPedidoDetalle: cartItems.map((item, index) => ({
                Serial: index + 1,
                Producto: item.product_name,
                Cantidad: item.qty,
                Precio: 0.01,
                Descuento: 0,
                Total: 0.01
            }))
        };

        // Headers para la solicitud
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'TokenSecret': PAGOFACIL_CONFIG.TokenSecret,
            'TokenService': PAGOFACIL_CONFIG.TokenService,
            'CommerceId': PAGOFACIL_CONFIG.tcCommerceID
        };

        // Convertir datos a formato URL-encoded
        const formData = new URLSearchParams();
        for (const key in postData) {
            if (key === 'taPedidoDetalle') {
                formData.append(key, JSON.stringify(postData[key]));
            } else {
                formData.append(key, postData[key]);
            }
        }

        // Realizar la solicitud a PagoFácil
        const response = await fetch('https://serviciostigomoney.pagofacil.com.bo/api/servicio/generarqrv2', {
            method: 'POST',
            headers: headers,
            body: formData
        });

        const data = await response.json();

        if (data && data.values) {
            const parts = data.values.split(';');
            if (parts.length > 1) {
                const qrBase64 = JSON.parse(parts[1]).qrImage;
                return {
                    success: true,
                    qrImage: `data:image/png;base64,${qrBase64}`,
                    orderId: paymentNumber
                };
            }
        }
        
        throw new Error('Error en la respuesta del servidor de PagoFácil');

    } catch (error) {
        console.error('Error al generar QR:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Función auxiliar para calcular el total
function calculateTotal(cartItems) {
    return cartItems.reduce((total, item) => total + (item.price * item.qty), 0);
}

// Exportar las funciones necesarias
window.paymentService = {
    generateQRCodeAndOrder,
    getNextPaymentNumber
}; 