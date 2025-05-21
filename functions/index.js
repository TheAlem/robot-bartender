// functions/index.js
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Mapa en memoria para estados de pago
// (persistirá mientras la función esté "caliente")
// const transactions = {}; // Eliminamos esto

// Inicializar Firebase Admin SDK
// Verifica si ya ha sido inicializado para evitar
// errores en entornos de desarrollo
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const ordersRef = db.collection("pedidos");
// Colección para guardar los pedidos

/**
 * PagoFácil hace POST aquí para notificarnos:
 *   tcNroPago -> PedidoID
 *   Estado     -> 2 = confirmado, otro = pendiente/fallido
 */
exports.paymentCallback = onRequest(async (req, res) => {
  logger.info("PagoFácil callback:", {
    method: req.method,
    url: req.url,
    query: req.query,
  });

  // CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Content-Type", "application/json");

  // PagoFácil usa GET por defecto para callbacks si no se especifica POST
  // Aunque indicaste POST, PagoFácil a veces usa GET. Verificamos ambos.
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({
      error: 1,
      status: 0,
      message: "Método no permitido",
    });
  }

  const {PedidoID, Estado} = req.query; // PagoFácil envía datos en query params

  if (!PedidoID || !Estado) {
    logger.error("Callback de PagoFácil con datos faltantes",
        {query: req.query});
    return res.status(400).json({
      error: 1,
      status: 0,
      message: "Faltan PedidoID o Estado en el callback",
      missing: {PedidoID: !PedidoID, Estado: !Estado},
    });
  }

  try {
    const pedidoDocRef =
    ordersRef.doc(PedidoID); // Referencia al documento del pedido
    const pedidoDoc = await pedidoDocRef.get();

    if (!pedidoDoc.exists) {
      logger.warn("Callback recibido para PedidoID no encontrado:", PedidoID);
      // Podríamos responder con éxito a PagoFácil para que no reintente
      // aunque el pedido no exista en nuestra base de datos
      return res.status(200).json({
        error: 1,
        status: 0,
        message: "Pedido no encontrado en el sistema",
      });
    }

    // Actualizar el estado del pago en Firestore
    const updateData = {
      estadoPago: Estado === "2" ? "confirmado" : "pendiente/fallido",
      // Puedes guardar otros datos del callback si son relevantes
      pagoFacilEstado: Estado,
      fechaCallback: admin.firestore.FieldValue.serverTimestamp(),
      // O usar Fecha/Hora de query
      callbackData: req.query,
      // Guardar todos los datos del callback para depurar
    };
    await pedidoDocRef.update(updateData);

    logger.info("Estado del Pedido actualizado en Firestore:",
        {PedidoID, Estado});

    // Respondemos a PagoFácil
    // PagoFácil espera una respuesta 200 OK, el cuerpo JSON es menos crítico
    res.status(200).json({
      error: 0,
      status: 1,
      message: "Callback procesado correctamente",
    });
  } catch (error) {
    logger.error("Error procesando el callback de PagoFácil:", error);
    return res.status(500).json({
      error: 1,
      status: 0,
      message: "Error interno del servidor al procesar callback",
    });
  }
});

