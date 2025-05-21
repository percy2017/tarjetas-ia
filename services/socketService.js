// services/socketService.js
import { Server } from 'socket.io';

let ioInstance;

export function initializeSocket(httpServer) {
  ioInstance = new Server(httpServer, {
    // Opciones de configuración para Socket.IO, por ejemplo CORS:
    // cors: {
    //   origin: "http://localhost:3000", // Ajusta esto a la URL de tu cliente si es necesario
    //   methods: ["GET", "POST"]
    // }
  });

  ioInstance.on('connection', (socket) => {
    console.log(`Socket.IO: Cliente conectado - ID: ${socket.id}`);

    // Evento de bienvenida al cliente que se acaba de conectar
    socket.emit('saludoDesdeServidor', { mensaje: `¡Bienvenido! Estás conectado con el ID ${socket.id}` });

    // Escuchar eventos enviados desde este cliente particular
    socket.on('mensajeDesdeCliente', (data) => {
      console.log(`Socket.IO: Mensaje recibido de ${socket.id}:`, data);
      // Aquí podrías, por ejemplo, retransmitir el mensaje a otros clientes
      // socket.broadcast.emit('nuevoMensajeGlobal', { remitente: socket.id, contenido: data });
    });

    socket.on('disconnect', () => {
      console.log(`Socket.IO: Cliente desconectado - ID: ${socket.id}`);
    });
  });

  console.log('Servicio Socket.IO inicializado y escuchando conexiones.');
  return ioInstance;
}

// Función para obtener la instancia de io desde otros módulos
export function getIoInstance() {
  if (!ioInstance) {
    throw new Error('Socket.IO no ha sido inicializado todavía. Llama a initializeSocket primero.');
  }
  return ioInstance;
}
