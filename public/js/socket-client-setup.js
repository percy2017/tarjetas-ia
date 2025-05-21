// public/js/socket-client-setup.js
console.log('socket-client-setup.js: Script INICIADO.');

if (typeof io === 'undefined') {
  console.error('socket-client-setup.js: La variable global "io" (de socket.io.js) NO está definida. Asegúrate de que socket.io.js se carga ANTES que este script.');
} else {
  console.log('socket-client-setup.js: La variable global "io" SÍ está definida.');

  console.log('socket-client-setup.js: Intentando conectar con io()...');
  try {
    const socket = io(); 
    console.log('socket-client-setup.js: io() llamado exitosamente.');

    socket.on('connect_error', (error) => {
      console.error('socket-client-setup.js: Error de conexión de Socket.IO:', error);
    });

    socket.on('connect_timeout', (timeout) => {
      console.error('socket-client-setup.js: Timeout de conexión de Socket.IO:', timeout);
    });

    socket.on('error', (error) => {
      console.error('socket-client-setup.js: Error general de Socket.IO:', error);
    });

    socket.on('connect', () => {
      console.log('socket-client-setup.js: Evento "connect" recibido. Cliente conectado al servidor Socket.IO con ID:', socket.id);
    });

    socket.on('saludoDesdeServidor', (data) => {
      console.log('socket-client-setup.js: Evento "saludoDesdeServidor" recibido:', data.mensaje);
    });

    socket.on('disconnect', (reason) => {
      console.log('socket-client-setup.js: Evento "disconnect" recibido. Razón:', reason);
    });

    // window.appSocket = socket;
    console.log('socket-client-setup.js: Listeners de Socket.IO configurados.');

  } catch (e) {
    console.error('socket-client-setup.js: Error al llamar a io() o configurar listeners:', e);
  }
}

console.log('socket-client-setup.js: Script FINALIZADO.');
