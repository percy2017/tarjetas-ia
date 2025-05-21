import nodemailer from 'nodemailer';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const db = require('../db.cjs'); // Ajusta la ruta si es necesario

// Función para obtener la configuración SMTP de la base de datos
async function getSmtpConfig() {
    const configSectionKey = 'smtp_settings'; // Clave de la sección SMTP
    const sectionConfig = await db('configs').where({ section_key: configSectionKey }).first();

    if (!sectionConfig || !sectionConfig.fields_config_json) {
        console.error('Configuración SMTP no encontrada o fields_config_json está vacío/nulo en la BD.');
        throw new Error('Configuración SMTP no encontrada o fields_config_json está vacío/nulo en la BD.');
    }

    console.log('Tipo de fields_config_json recuperado de BD:', typeof sectionConfig.fields_config_json);
    console.log('Valor de fields_config_json recuperado de BD:', sectionConfig.fields_config_json);

    // Verificar si es un string y necesita parseo (aunque jsonb debería devolver objeto/array)
    let fieldsArray = sectionConfig.fields_config_json;
    if (typeof fieldsArray === 'string') {
        try {
            fieldsArray = JSON.parse(fieldsArray);
            console.log('fields_config_json parseado a array/objeto.');
        } catch (parseError) {
            console.error('Error al parsear fields_config_json (string):', parseError);
            throw new Error('Formato incorrecto de fields_config_json en la configuración SMTP (string).');
        }
    }

    if (!Array.isArray(fieldsArray)) {
        console.error('fields_config_json no es un array después de la recuperación/parseo:', fieldsArray);
        throw new Error('La configuración de campos SMTP (fields_config_json) no es un array válido.');
    }

    const config = {};
    fieldsArray.forEach(field => {
        // Usamos field.key que definimos en el modal, o field.name si es lo que se guarda finalmente.
        // Asumiendo que guardamos la 'key' del campo como identificador.
        config[field.key] = field.value; 
    });

    // Asegurarse de que los valores numéricos y booleanos se traten correctamente
    if (config.smtp_port) {
        config.smtp_port = parseInt(config.smtp_port, 10);
    }
    // El valor de un checkbox en Alpaca, si no se marca, puede no enviarse o ser 'false' como string.
    // Si se marca, usualmente es 'on' o el valor que se le asigne, o true si el schema es boolean.
    // Asumimos que si existe y es 'true' (string) o true (boolean), es true.
    config.smtp_secure_connection = (config.smtp_secure_connection === 'true' || config.smtp_secure_connection === true);


    // Validar que los campos esenciales estén presentes
    const requiredKeys = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from_email'];
    for (const key of requiredKeys) {
        if (!config[key]) {
            console.error(`Falta la configuración SMTP esencial: ${key}`);
            throw new Error(`Configuración SMTP incompleta: falta ${key}.`);
        }
    }
    return config;
}

export async function sendWelcomeEmail(userData, generatedPassword) {
    try {
        const smtpConfig = await getSmtpConfig();

        let secureOption = smtpConfig.smtp_secure_connection;
        let port = smtpConfig.smtp_port;

        // Nodemailer espera 'secure: true' para SSL directo (puerto 465)
        // y 'secure: false' para STARTTLS (puerto 587).
        // Si el puerto es 587, 'secure' debe ser false para que Nodemailer intente STARTTLS.
        // Si el puerto es 465, 'secure' debe ser true.
        if (port === 587) {
            secureOption = false; 
        } else if (port === 465) {
            secureOption = true;
        }
        // Si es otro puerto y smtp_secure_connection está marcado, se usa true.

        const transporter = nodemailer.createTransport({
            host: smtpConfig.smtp_host,
            port: port,
            secure: secureOption, 
            auth: {
                user: smtpConfig.smtp_user,
                pass: smtpConfig.smtp_pass,
            },
            tls: {
                // No rechazar certificados autofirmados (usar con precaución en producción)
                // Esto es necesario si el nombre de host del certificado no coincide con el host al que te conectas.
                rejectUnauthorized: false 
            }
        });

        const mailOptions = {
            from: smtpConfig.smtp_from_email,
            to: userData.email,
            subject: '¡Bienvenido/a a TarjetasIA! Tus Credenciales de Acceso',
            html: `
                <h1>¡Hola ${userData.first_name || userData.username}!</h1>
                <p>Gracias por registrarte en TarjetasIA.</p>
                <p>Aquí están tus credenciales para acceder a la plataforma:</p>
                <ul>
                    <li><strong>Nombre de Usuario:</strong> ${userData.username}</li>
                    <li><strong>Contraseña:</strong> ${generatedPassword}</li>
                </ul>
                <p>Puedes iniciar sesión en: <a href="${process.env.APP_URL || 'http://localhost:3000'}/login">Iniciar Sesión</a></p>
                <p>¡Esperamos que disfrutes de la aplicación!</p>
                <br>
                <p>Saludos,</p>
                <p>El equipo de TarjetasIA</p>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Correo de bienvenida enviado: %s', info.messageId);
        return info;

    } catch (error) {
        console.error('Error al enviar el correo de bienvenida:', error);
        // No relanzar el error para no detener el flujo de registro si el correo falla,
        // pero sí registrarlo. Considerar un sistema de reintentos o notificación de fallo.
        // throw error; 
    }
}
